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

    const transactionCode = payload.code || 'unknown_transaction';
    const statusEnum = payload.sale_status_enum;
    const customerEmail = payload.customer?.email || payload.email;
    const productId = payload.product?.code || payload.product?.id || payload.product || 'unknown_product';
    const eventType = `status_${statusEnum}`;

    console.log(`[PerfectPay] Received webhook: Tx: ${transactionCode}, Status: ${statusEnum}, Product: ${productId}, Email: ${customerEmail}`);

    if (transactionCode === 'unknown_transaction') {
      return NextResponse.json({ message: 'Missing transaction code' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Idempotency Check
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

    const { data: newEvent, error: insertError } = await supabaseAdmin
      .from('processed_webhooks')
      .insert([{
        provider: 'perfectpay',
        event_type: eventType,
        transaction_code: transactionCode,
        status: 'processing',
        payload: payload
      }])
      .select('id')
      .single();

    if (insertError) {
      console.error('[PerfectPay] Idempotency constraint triggered:', insertError);
      return NextResponse.json({ message: 'Already processing' }, { status: 200 });
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
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'unknown_product');
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 }); 
    }

    if (!customerEmail) {
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'missing_email');
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
          await markWebhookProcessed(supabaseAdmin, eventRecordId, 'error_creating_user');
          return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
        } else {
          // Fallback: If auth user exists but profile does not, we need a way to get the user ID.
          // Due to supabase-js limitations, we cannot easily query auth.users without admin API.
          // The admin API listUsers is the only way in client without custom SQL.
          console.warn('[PerfectPay] Auth user exists but no profile. Fetching user ID manually...');
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const found = usersData?.users?.find(u => u.email === customerEmail);
          if (found) {
             userId = found.id;
             // insert profile
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
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'user_not_resolved');
      return NextResponse.json({ error: 'User resolution failed' }, { status: 500 });
    }
    
    await supabaseAdmin.from('processed_webhooks').update({ user_id: userId }).eq('id', eventRecordId);

    // 5. Handle Business Logic
    if (statusEnum === 2) {
      await handleApprovedPurchase(supabaseAdmin, userId, transactionCode, planConfig, productId);
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
    } else if (statusEnum === 6 || statusEnum === 7) {
      // Cancelled or Refunded
      await handleCancellation(supabaseAdmin, userId, transactionCode);
      await markWebhookProcessed(supabaseAdmin, eventRecordId, 'completed');
    }

    return NextResponse.json({ message: 'Processed successfully' }, { status: 200 });

  } catch (error) {
    console.error('[PerfectPay Webhook] Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function markWebhookProcessed(supabase, id, status) {
  await supabase.from('processed_webhooks').update({ status }).eq('id', id);
}

// --------------------------------------------------------------------------------------
// BUSINESS LOGIC
// --------------------------------------------------------------------------------------

async function handleApprovedPurchase(supabase, userId, transactionCode, planConfig, productId) {
  // Check if we already have an active subscription for this user + product
  // If so, it's a renewal. If not, it's a new subscription.
  // Actually, perfect pay sends a new transactionCode per renewal, but let's check.
  
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + planConfig.months);

  // 1. Create or Update Subscription
  const { data: newSub, error: subError } = await supabase.from('subscriptions').insert([{
    user_id: userId,
    provider: 'perfectpay',
    product_id: productId,
    plan_id: planConfig.id,
    transaction_code: transactionCode,
    status: 'active',
    start_date: now.toISOString(),
    end_date: endDate.toISOString(),
    billing_interval: planConfig.id,
    contract_months: planConfig.months,
    credits_per_cycle: planConfig.credits,
    current_cycle: 1,
    next_credit_date: now.toISOString(), // Cycle 1 is immediately due
  }]).select('id').single();

  if (subError) {
    console.error('[PerfectPay] Failed to create subscription:', subError);
    throw subError;
  }

  // 2. Process Cycle 1 immediately
  await processCreditCycle(supabase, newSub.id, userId, 1, planConfig.credits, transactionCode);
}

async function handleCancellation(supabase, userId, transactionCode) {
  // Mark subscription as canceled
  // We identify the subscription by transaction_code (or product if we had to)
  const { data: sub } = await supabase.from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('transaction_code', transactionCode)
    .single();

  if (sub) {
    await supabase.from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    console.log(`[PerfectPay] Subscription ${sub.id} canceled.`);
  } else {
    // If not found by this specific transaction_code, it might be an overarching sub
    // For safety, we cancel active perfectpay subs for this user
    await supabase.from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', 'perfectpay')
      .eq('status', 'active');
  }
}

// Internal function to process a specific cycle
export async function processCreditCycle(supabase, subscriptionId, userId, cycleNumber, creditsAmount, transactionCode = null) {
  // Check idempotency for this cycle
  const { data: existingCycle } = await supabase.from('credit_cycles')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', cycleNumber)
    .single();

  if (existingCycle) {
    console.log(`[PerfectPay] Cycle ${cycleNumber} already processed for sub ${subscriptionId}`);
    return;
  }

  // Insert cycle record
  const { error: cycleError } = await supabase.from('credit_cycles').insert([{
    subscription_id: subscriptionId,
    user_id: userId,
    cycle_number: cycleNumber,
    scheduled_date: new Date().toISOString(),
    credits: creditsAmount,
    status: 'granted',
    provider: 'perfectpay',
    transaction_code: transactionCode
  }]);

  if (cycleError) {
    console.error(`[PerfectPay] Failed to record credit cycle ${cycleNumber}:`, cycleError);
    return;
  }

  // Add credits to profile
  // Since we don't have atomic increment in simple JS supabase update, we read then update
  const { data: profile } = await supabase.from('profiles').select('credit_limit').eq('id', userId).single();
  const currentLimit = profile?.credit_limit || 0;
  
  await supabase.from('profiles').update({ credit_limit: currentLimit + creditsAmount }).eq('id', userId);
  
  console.log(`[PerfectPay] Granted ${creditsAmount} credits to user ${userId} for cycle ${cycleNumber}`);

  // Update subscription next_credit_date
  // Next credit date is current date + 1 month
  const { data: sub } = await supabase.from('subscriptions').select('next_credit_date, contract_months').eq('id', subscriptionId).single();
  
  if (sub && cycleNumber < sub.contract_months) {
    const nextDate = new Date();
    // Schedule next cycle strictly 1 month from now
    nextDate.setMonth(nextDate.getMonth() + 1);
    
    await supabase.from('subscriptions').update({
      current_cycle: cycleNumber,
      next_credit_date: nextDate.toISOString(),
      last_credit_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', subscriptionId);
  } else {
    // Contract is finished, no more cycles
    await supabase.from('subscriptions').update({
      current_cycle: cycleNumber,
      next_credit_date: null,
      last_credit_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', subscriptionId);
  }
}
