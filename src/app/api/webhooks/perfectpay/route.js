import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const payload = await request.json();

    // 1. Verify Perfect Pay Token
    const providedToken = payload.token;
    const expectedToken = process.env.PERFECTPAY_PUBLIC_TOKEN;

    if (!providedToken || providedToken !== expectedToken) {
      console.warn('[PerfectPay Webhook] Unauthorized request received. Token mismatch or missing.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Safe Logging of Event & Payload Parsing
    // Perfect Pay uses 'code' for the unique transaction ID
    // and 'sale_status_enum' for the status (e.g., 2 = Approved)
    const transactionId = payload.code || 'unknown_transaction';
    const statusEnum = payload.sale_status_enum;
    const customerEmail = payload.customer?.email || payload.email || 'unknown_email';
    
    console.log(`[PerfectPay Webhook] Valid event received! Transaction: ${transactionId}, StatusEnum: ${statusEnum}, Email: ${customerEmail}`);
    
    // Future Implementation: Idempotency check
    // 1. Check if transaction/event exists in database (e.g., Supabase)
    // 2. If exists, return 200 immediately to avoid duplicate processing
    // 3. Otherwise, store event in database and proceed with business logic
    // (create user, add credits, update plan, etc.)

    // Return OK to acknowledge receipt to Perfect Pay
    return NextResponse.json({ message: 'Webhook received successfully' }, { status: 200 });
  } catch (error) {
    console.error('[PerfectPay Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
