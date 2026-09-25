import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // Simple auth for Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const now = new Date().toISOString();

    // 1. Fetch all active subscriptions due for a new cycle
    const { data: subsDue, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_credit_date', now);

    if (subsError) {
      throw subsError;
    }

    if (!subsDue || subsDue.length === 0) {
      return NextResponse.json({ message: 'No cycles to process' }, { status: 200 });
    }

    console.log(`[Cron] Found ${subsDue.length} subscriptions due for processing.`);

    let processedCount = 0;

    // 2. Process each due subscription
    for (const sub of subsDue) {
      try {
        const nextCycleNumber = sub.current_cycle + 1;

        // Check if we already exceeded contract months
        if (nextCycleNumber > sub.contract_months) {
          // Contract finished, stop granting credits
          await supabaseAdmin.from('subscriptions').update({
            next_credit_date: null,
            status: 'expired',
            updated_at: now
          }).eq('id', sub.id);
          continue;
        }

        // Idempotency check for the cycle
        const { data: existingCycle } = await supabaseAdmin.from('credit_cycles')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('cycle_number', nextCycleNumber)
          .single();

        if (existingCycle) {
          console.log(`[Cron] Cycle ${nextCycleNumber} already processed for sub ${sub.id}`);
          // Just fix the next_credit_date if it was stuck
          const nextDate = new Date(sub.next_credit_date);
          nextDate.setMonth(nextDate.getMonth() + 1);
          await supabaseAdmin.from('subscriptions').update({
            current_cycle: nextCycleNumber,
            next_credit_date: nextCycleNumber >= sub.contract_months ? null : nextDate.toISOString(),
            updated_at: now
          }).eq('id', sub.id);
          continue;
        }

        // Insert cycle record
        const { error: cycleError } = await supabaseAdmin.from('credit_cycles').insert([{
          subscription_id: sub.id,
          user_id: sub.user_id,
          cycle_number: nextCycleNumber,
          scheduled_date: now,
          credits: sub.credits_per_cycle,
          status: 'granted',
          provider: 'perfectpay'
        }]);

        if (cycleError) {
          console.error(`[Cron] Error creating cycle for sub ${sub.id}:`, cycleError);
          continue; // Skip to next
        }

        // Grant credits to profile
        const { data: profile } = await supabaseAdmin.from('profiles').select('credit_limit').eq('id', sub.user_id).single();
        const currentLimit = profile?.credit_limit || 0;
        await supabaseAdmin.from('profiles').update({ credit_limit: currentLimit + sub.credits_per_cycle }).eq('id', sub.user_id);

        // Update subscription
        const nextDate = new Date(sub.next_credit_date);
        nextDate.setMonth(nextDate.getMonth() + 1);

        await supabaseAdmin.from('subscriptions').update({
          current_cycle: nextCycleNumber,
          next_credit_date: nextCycleNumber >= sub.contract_months ? null : nextDate.toISOString(),
          last_credit_date: now,
          updated_at: now
        }).eq('id', sub.id);

        processedCount++;
        console.log(`[Cron] Successfully processed cycle ${nextCycleNumber} for user ${sub.user_id}`);

      } catch (err) {
        console.error(`[Cron] Error processing sub ${sub.id}:`, err);
      }
    }

    return NextResponse.json({ message: `Successfully processed ${processedCount} cycles.` }, { status: 200 });

  } catch (error) {
    console.error('[Cron] Critical error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
