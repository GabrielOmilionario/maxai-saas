import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const PERFECTPAY_PLANS = {
  'PPLQQP6O0': { id: 'monthly', months: 1, credits: 4000 },
  'PPLQQPAN3': { id: 'semiannual', months: 6, credits: 5000 },
  'PPLQQQHME': { id: 'annual', months: 12, credits: 6000 }
};

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

    // Payload Sanitization
    const safePayload = { ...payload };
    if (safePayload.token) safePayload.token = 'REDACTED';

    const transactionCode = payload.code || 'unknown_transaction';
    const statusEnum = payload.sale_status_enum;
    const customerEmail = payload.customer?.email || payload.email;
    const productId = payload.product?.code || payload.product?.id || payload.product || 'unknown_product';
    const eventId = payload.id || null;
    const eventType = `status_${statusEnum}`;

    console.log(`[PerfectPay] Received webhook: Tx: ${transactionCode}, Status: ${statusEnum}, Product: ${productId}, Email: ${customerEmail}`);

    if (transactionCode === 'unknown_transaction') {
      return NextResponse.json({ message: 'Missing transaction code' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Idempotency Check on Webhook processing
    const { data: existingEvent } = await supabaseAdmin
      .from('processed_webhooks')
      .select('id')
      .eq('provider', 'perfectpay')
      .eq('transaction_code', transactionCode)
      .eq('event_type', eventType)
      .single();

    if (existingEvent) {
      return NextResponse.json({ message: 'Already processed' }, { status: 200 });
    }

    // Insert atomic lock
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
      console.error('[PerfectPay] Idempotency constraint triggered:', insertError);
      return NextResponse.json({ message: 'Already processing or processed' }, { status: 200 });
    }
    
    const eventRecordId = newEvent.id;

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

    // 4. Resolve User
    let userId = null;
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, plan, credit_limit')
      .eq('email', customerEmail)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
    } else if (statusEnum === 2) {
      // Create user
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
          // Fallback if profile is missing but auth exists
          console.warn('[PerfectPay] Auth user exists but no profile. Fetching user ID manually...');
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

    // 5. Handle Business Logic
    if (statusEnum === 2) {
      try {
        await handleApprovedPurchase(supabaseAdmin, userId, transactionCode, planConfig, productId);
        await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
      } catch (err) {
        console.error('[PerfectPay] Error handling approved purchase:', err);
        // If it fails with unique_provider_transaction, it's a concurrent duplicate request passing previous checks
        if (err.code === '23505') {
            await markWebhookProcessed(supabaseAdmin, eventRecordId, 'duplicate_subscription');
        } else {
            await markWebhookProcessed(supabaseAdmin, eventRecordId, 'error', err.message);
            return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
        }
      }
    } else if (statusEnum === 6) {
      // 6 = Cancelled (User cancelled future renewals)
      // Do not delete current access, just mark renewal_canceled
      await handleCancellationRenewal(supabaseAdmin, userId, transactionCode);
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
    } else if (statusEnum === 7) {
      // 7 = Refunded (Reembolso)
      // Revoke future access completely and immediately
      await handleRefund(supabaseAdmin, userId, transactionCode);
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
    }

    return NextResponse.json({ message: 'Processed successfully' }, { status: 200 });

  } catch (error) {
    console.error('[PerfectPay Webhook] Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function markWebhookProcessed(supabase, id, status, errorMessage = null) {
  await supabase.from('processed_webhooks').update({ 
      status, 
      error_message: errorMessage,
      processed_at: new Date().toISOString()
  }).eq('id', id);
}

// --------------------------------------------------------------------------------------
// BUSINESS LOGIC
// --------------------------------------------------------------------------------------

async function handleApprovedPurchase(supabase, userId, transactionCode, planConfig, productId) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + planConfig.months);

  // 1. Create Subscription
  // Unique constraint handles duplicates automatically
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
    next_credit_date: now.toISOString(), // Cycle 1 is immediately due
  }]).select('id').single();

  if (subError) {
    throw subError;
  }

  // 2. Process Cycle 1 immediately
  await processCreditCycleAtomic(supabase, newSub.id, userId, 1, planConfig.credits, transactionCode);
}

async function handleCancellationRenewal(supabase, userId, transactionCode) {
  // Status 6: User cancelled renewal, but current period remains active.
  await supabase.from('subscriptions')
    .update({ renewal_canceled: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('transaction_code', transactionCode);
}

async function handleRefund(supabase, userId, transactionCode) {
  // Status 7: Refunded. Contract is terminated immediately.
  await supabase.from('subscriptions')
    .update({ 
        status: 'refunded', 
        next_credit_date: null, 
        updated_at: new Date().toISOString() 
    })
    .eq('user_id', userId)
    .eq('transaction_code', transactionCode);
}

// Internal function to process a specific cycle atomically
export async function processCreditCycleAtomic(supabase, subscriptionId, userId, cycleNumber, creditsAmount, transactionCode = null) {
  // Call the atomic RPC to grant credits and log the cycle
  const { error: rpcError } = await supabase.rpc('grant_subscription_credits', {
      p_user_id: userId,
      p_subscription_id: subscriptionId,
      p_cycle_number: cycleNumber,
      p_credits: creditsAmount,
      p_scheduled_date: new Date().toISOString(),
      p_transaction_code: transactionCode
  });

  if (rpcError) {
      console.error(`[PerfectPay] RPC Error recording credit cycle ${cycleNumber}:`, rpcError);
      throw rpcError;
  }

  console.log(`[PerfectPay] Granted ${creditsAmount} credits atomically to user ${userId} for cycle ${cycleNumber}`);

  // Update subscription next_credit_date
  const { data: sub } = await supabase.from('subscriptions').select('next_credit_date, contract_months').eq('id', subscriptionId).single();
  
  if (sub && cycleNumber < sub.contract_months) {
    // Next credit date is STRICTLY previous date + 1 month (to handle delayed crons correctly)
    const nextDate = new Date(sub.next_credit_date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    
    await supabase.from('subscriptions').update({
      current_cycle: cycleNumber,
      next_credit_date: nextDate.toISOString(),
      last_credit_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', subscriptionId);
  } else {
    // Contract finished
    await supabase.from('subscriptions').update({
      current_cycle: cycleNumber,
      next_credit_date: null,
      last_credit_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', subscriptionId);
  }
}
