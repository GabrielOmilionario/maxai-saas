import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { processCreditCycleAtomic } from '../../webhooks/perfectpay/route';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const now = new Date();

    // 1. Fetch active subscriptions where next_credit_date is in the past
    // Note: status 'active' includes those with renewal_canceled = true but still within contract validity
    const { data: subsDue, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, contract_months, current_cycle')
      .eq('status', 'active')
      .lte('next_credit_date', now.toISOString());

    if (subsError) {
      throw subsError;
    }

    if (!subsDue || subsDue.length === 0) {
      return NextResponse.json({ message: 'No cycles to process' }, { status: 200 });
    }

    console.log(`[Cron] Found ${subsDue.length} subscriptions due for processing.`);

    let processedCount = 0;

    // 2. Process each due subscription
    for (const rawSub of subsDue) {
      try {
        // While loop processes multiple missed cycles if cron was offline for months
        while (true) {
          // Re-fetch the sub to get the *latest* current_cycle and next_credit_date 
          // because processCreditCycleAtomic updates them.
          const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('id', rawSub.id)
            .single();

          if (!sub || sub.status !== 'active' || !sub.next_credit_date) {
            break; // Sub is no longer active or has no more cycles scheduled
          }

          const nextDate = new Date(sub.next_credit_date);
          if (nextDate > now || sub.current_cycle >= sub.contract_months) {
             // If contract is finished, just ensure it's marked expired
             if (sub.current_cycle >= sub.contract_months) {
                 await supabaseAdmin.from('subscriptions').update({
                   status: 'expired',
                   next_credit_date: null,
                   updated_at: new Date().toISOString()
                 }).eq('id', sub.id);
             }
             break; // Caught up to present date or contract finished
          }

          const nextCycleNumber = sub.current_cycle + 1;
          
          console.log(`[Cron] Processing delayed/due cycle ${nextCycleNumber} for sub ${sub.id}`);
          
          await processCreditCycleAtomic(
            supabaseAdmin, 
            sub.id, 
            sub.user_id, 
            nextCycleNumber, 
            sub.credits_per_cycle, 
            sub.transaction_code // Provider tracking
          );

          processedCount++;
        }

      } catch (err) {
        console.error(`[Cron] Error processing sub ${rawSub.id}:`, err);
      }
    }

    return NextResponse.json({ message: `Successfully processed ${processedCount} cycles.` }, { status: 200 });

  } catch (error) {
    console.error('[Cron] Critical error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
