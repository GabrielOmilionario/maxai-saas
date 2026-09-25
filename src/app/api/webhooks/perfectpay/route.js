import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const PERFECTPAY_PLANS = {
  'PPLQQP6O0': { id: 'monthly', months: 1, credits: 4000 },
  'PPLQQPAN3': { id: 'semiannual', months: 6, credits: 5000 },
  'PPLQQQHME': { id: 'annual', months: 12, credits: 6000 }
};

// Statuses that are definitively terminal — retry is NOT allowed
const TERMINAL_STATUSES = ['completed', 'ignored', 'duplicate_subscription', 'unknown_product', 'missing_email'];

export async function POST(request) {
  try {
    const payload = await request.json();

    // 1. Verify Perfect Pay Token
    const providedToken = payload.token;
    const expectedToken = process.env.PERFECTPAY_PUBLIC_TOKEN;

    if (!providedToken || providedToken !== expectedToken) {
      console.warn('[PerfectPay Webhook] Unauthorized request received.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Payload Sanitization — never persist the token
    const safePayload = { ...payload };
    if (safePayload.token) safePayload.token = 'REDACTED';

    const transactionCode = payload.code || null;
    const statusEnum = payload.sale_status_enum;
    const customerEmail = payload.customer?.email || payload.email;
    const productId = payload.product?.code || payload.product?.id || payload.product || 'unknown_product';
    const eventId = payload.id || null;

    // event_type is always constructed from statusEnum — never null
    const eventType = `status_${statusEnum}`;

    console.log(`[PerfectPay] Received webhook: Tx: ${transactionCode}, Status: ${statusEnum}, Product: ${productId}, Email: ${customerEmail}`);

    if (!transactionCode) {
      return NextResponse.json({ message: 'Missing transaction code' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // ─────────────────────────────────────────────────────────────────
    // 2. IDEMPOTENCY CHECK — Estratégia B: estados com retry seguro
    //
    // TERMINAL: se já foi processado com sucesso, ignorar silenciosamente.
    // RETRYABLE: se falhou anteriormente (error, processing, user_not_resolved,
    //            error_creating_user), permitir nova tentativa de processamento.
    // ─────────────────────────────────────────────────────────────────
    const { data: existingEvent } = await supabaseAdmin
      .from('processed_webhooks')
      .select('id, status')
      .eq('provider', 'perfectpay')
      .eq('transaction_code', transactionCode)
      .eq('event_type', eventType)
      .single();

    if (existingEvent) {
      if (TERMINAL_STATUSES.includes(existingEvent.status)) {
        // Already successfully processed — safe to acknowledge and ignore
        console.log(`[PerfectPay] Event ${transactionCode}/${eventType} already terminal (${existingEvent.status}). Ignoring.`);
        return NextResponse.json({ message: 'Already processed' }, { status: 200 });
      }

      if (existingEvent.status === 'processing') {
        // Another request is actively processing this event RIGHT NOW.
        // Returning 409 forces Perfect Pay to retry later, after the active request finishes.
        // This prevents two requests from processing the same event in parallel.
        console.warn(`[PerfectPay] Event ${transactionCode}/${eventType} is currently being processed by another request. Returning 409 to trigger retry.`);
        return NextResponse.json({ message: 'Event currently being processed. Please retry.' }, { status: 409 });
      }

      // Non-terminal, non-processing status ('error', 'user_not_resolved', 'error_creating_user')
      // Previous attempt failed and is safe to retry — no parallel request is active.
      console.log(`[PerfectPay] Retrying failed event ${transactionCode}/${eventType} from status: ${existingEvent.status}`);
      await supabaseAdmin
        .from('processed_webhooks')
        .update({ status: 'processing', error_message: null, processed_at: new Date().toISOString() })
        .eq('id', existingEvent.id);

      return await processWebhookEvent(
        supabaseAdmin,
        existingEvent.id,
        statusEnum,
        transactionCode,
        customerEmail,
        productId,
        eventId,
        safePayload
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. FIRST ATTEMPT: Insert with 'processing' status
    //    If two simultaneous requests race here, the UNIQUE constraint
    //    blocks the second — it will hit the retry branch above.
    // ─────────────────────────────────────────────────────────────────
    const { data: newEvent, error: insertError } = await supabaseAdmin
      .from('processed_webhooks')
      .insert([{
        provider: 'perfectpay',
        event_type: eventType,
        event_id: eventId,
        transaction_code: transactionCode,
        status: 'processing',
        payload: safePayload,
        processed_at: new Date().toISOString()
      }])
      .select('id')
      .single();

    if (insertError) {
      // UNIQUE constraint blocked this insert — a concurrent request is actively processing.
      // Wait briefly: if the concurrent request finishes in time, we can safely return 200.
      // If it is still running (status = 'processing'), return 409 so Perfect Pay retries later.
      console.warn('[PerfectPay] Concurrent insert blocked by UNIQUE constraint:', insertError.message);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: raceEvent } = await supabaseAdmin
        .from('processed_webhooks')
        .select('id, status')
        .eq('provider', 'perfectpay')
        .eq('transaction_code', transactionCode)
        .eq('event_type', eventType)
        .single();

      if (raceEvent && TERMINAL_STATUSES.includes(raceEvent.status)) {
        // The concurrent request finished successfully — acknowledge without retry
        console.log(`[PerfectPay] Concurrent request completed (${raceEvent.status}). Returning 200.`);
        return NextResponse.json({ message: 'Already processed by concurrent request' }, { status: 200 });
      }

      // Concurrent request is still running or failed — return 409 so Perfect Pay retries.
      // If Request A succeeds later, the retry will find status='completed' and return 200.
      // If Request A fails, the retry will find status='error' and reprocess.
      console.warn('[PerfectPay] Concurrent request still running or failed. Returning 409 to trigger retry.');
      return NextResponse.json({ message: 'Conflict: event being processed concurrently. Please retry.' }, { status: 409 });
    }

    return await processWebhookEvent(
      supabaseAdmin,
      newEvent.id,
      statusEnum,
      transactionCode,
      customerEmail,
      productId,
      eventId,
      safePayload
    );

  } catch (error) {
    console.error('[PerfectPay Webhook] Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core processing function — separated so both first-attempt and retry paths
// share the exact same logic without code duplication
// ─────────────────────────────────────────────────────────────────────────────
async function processWebhookEvent(supabaseAdmin, eventRecordId, statusEnum, transactionCode, customerEmail, productId, eventId, safePayload) {
  // Handle irrelevant statuses
  if (statusEnum !== 2 && statusEnum !== 6 && statusEnum !== 7) {
    await markWebhookProcessed(supabaseAdmin, eventRecordId, 'ignored');
    return NextResponse.json({ message: 'Status ignored' }, { status: 200 });
  }

  // Validate Product Map for approved purchases
  const planConfig = PERFECTPAY_PLANS[productId];
  if (!planConfig && statusEnum === 2) {
    console.warn(`[PerfectPay] Unknown Product ID: ${productId}`);
    await markWebhookProcessed(supabaseAdmin, eventRecordId, 'unknown_product', 'Product ID not recognized');
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  }

  if (!customerEmail) {
    await markWebhookProcessed(supabaseAdmin, eventRecordId, 'missing_email', 'No customer email provided');
    return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
  }

  // Resolve User
  let userId = null;
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, plan, credit_limit')
    .eq('email', customerEmail)
    .single();

  if (existingProfile) {
    userId = existingProfile.id;
  } else if (statusEnum === 2) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: 'maxai2026',
      email_confirm: true,
      user_metadata: { plan: planConfig.id }
    });

    if (authError) {
      if (!authError.message.includes('already registered')) {
        console.error('[PerfectPay] Error creating user:', authError);
        await markWebhookProcessed(supabaseAdmin, eventRecordId, 'error_creating_user', authError.message);
        return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
      } else {
        // Auth user exists but profile doesn't — find and sync
        console.warn('[PerfectPay] Auth user exists but no profile. Fetching user ID...');
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const found = usersData?.users?.find(u => u.email === customerEmail);
        if (found) {
          userId = found.id;
          await supabaseAdmin.from('profiles').insert([{
            id: userId,
            email: customerEmail,
            plan: planConfig.id,
            credit_limit: 0,
            credit_used: 0
          }]);
        }
      }
    } else {
      userId = authData.user.id;
      await supabaseAdmin.from('profiles').insert([{
        id: userId,
        email: customerEmail,
        plan: planConfig.id,
        credit_limit: 0,
        credit_used: 0
      }]);
    }
  }

  if (!userId) {
    await markWebhookProcessed(supabaseAdmin, eventRecordId, 'user_not_resolved', 'User ID could not be found or created');
    return NextResponse.json({ error: 'User resolution failed' }, { status: 500 });
  }

  await supabaseAdmin.from('processed_webhooks').update({ user_id: userId }).eq('id', eventRecordId);

  // Handle Business Logic
  if (statusEnum === 2) {
    try {
      await handleApprovedPurchase(supabaseAdmin, userId, transactionCode, planConfig, productId);
      // Only mark completed AFTER all operations succeed
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
    } catch (err) {
      console.error('[PerfectPay] Error handling approved purchase:', err);
      if (err.code === '23505') {
        // DB-level unique constraint: duplicate subscription attempt
        await markWebhookProcessed(supabaseAdmin, eventRecordId, 'duplicate_subscription', err.message);
      } else {
        // Retryable error — mark as 'error' so next Perfect Pay retry can re-attempt
        await markWebhookProcessed(supabaseAdmin, eventRecordId, 'error', err.message);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
      }
    }
  } else if (statusEnum === 6) {
    await handleCancellationRenewal(supabaseAdmin, userId, transactionCode);
    await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
  } else if (statusEnum === 7) {
    await handleRefund(supabaseAdmin, userId, transactionCode);
    await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
  }

  return NextResponse.json({ message: 'Processed successfully' }, { status: 200 });
}

async function markWebhookProcessed(supabase, id, status, errorMessage = null) {
  await supabase.from('processed_webhooks').update({
    status,
    error_message: errorMessage,
    processed_at: new Date().toISOString()
  }).eq('id', id);
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS LOGIC
// ─────────────────────────────────────────────────────────────────────────────

async function handleApprovedPurchase(supabase, userId, transactionCode, planConfig, productId) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + planConfig.months);

  // UNIQUE(provider, transaction_code) prevents double subscription at DB level
  const { data: newSub, error: subError } = await supabase.from('subscriptions').insert([{
    user_id: userId,
    provider: 'perfectpay',
    product_id: productId,
    plan_id: planConfig.id,
    transaction_code: transactionCode,
    status: 'active',
    renewal_canceled: false,
    start_date: now.toISOString(),
    end_date: endDate.toISOString(),
    billing_interval: planConfig.id,
    contract_months: planConfig.months,
    credits_per_cycle: planConfig.credits,
    current_cycle: 1,
    next_credit_date: now.toISOString(),
  }]).select('id').single();

  if (subError) {
    throw subError;
  }

  // Cycle 1 is processed immediately via atomic RPC
  await processCreditCycleAtomic(supabase, newSub.id, userId, 1, planConfig.credits, transactionCode);
}

async function handleCancellationRenewal(supabase, userId, transactionCode) {
  // Status 6: cancel future renewal only — current period stays active
  await supabase.from('subscriptions')
    .update({ renewal_canceled: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('transaction_code', transactionCode);
}

async function handleRefund(supabase, userId, transactionCode) {
  // Status 7: immediate contract termination
  await supabase.from('subscriptions')
    .update({
      status: 'refunded',
      next_credit_date: null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('transaction_code', transactionCode);
}

// Exported so the cron can reuse this function
export async function processCreditCycleAtomic(supabase, subscriptionId, userId, cycleNumber, creditsAmount, transactionCode = null) {
  // Atomic RPC: INSERT credit_cycles + UPDATE profiles.credit_limit in one transaction
  const { error: rpcError } = await supabase.rpc('grant_subscription_credits', {
    p_user_id: userId,
    p_subscription_id: subscriptionId,
    p_cycle_number: cycleNumber,
    p_credits: creditsAmount,
    p_scheduled_date: new Date().toISOString(),
    p_transaction_code: transactionCode
  });

  if (rpcError) {
    console.error(`[PerfectPay] RPC Error on cycle ${cycleNumber}:`, rpcError);
    throw rpcError;
  }

  console.log(`[PerfectPay] Granted ${creditsAmount} credits atomically to user ${userId} for cycle ${cycleNumber}`);

  // Update next_credit_date strictly based on PREVIOUS scheduled date (not now())
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('next_credit_date, contract_months')
    .eq('id', subscriptionId)
    .single();

  if (sub && cycleNumber < sub.contract_months) {
    // Strictly: previous date + 1 month — safe against delayed crons
    const nextDate = new Date(sub.next_credit_date);
    nextDate.setMonth(nextDate.getMonth() + 1);

    await supabase.from('subscriptions').update({
      current_cycle: cycleNumber,
      next_credit_date: nextDate.toISOString(),
      last_credit_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', subscriptionId);
  } else {
    // Contract exhausted
    await supabase.from('subscriptions').update({
      current_cycle: cycleNumber,
      next_credit_date: null,
      last_credit_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', subscriptionId);
  }
}
