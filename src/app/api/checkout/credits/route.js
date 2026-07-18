import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';


const CREDIT_PACKAGES = {
  1000: 1790,
  2500: 3990,
  5000: 7490,
  10000: 13990,
  20000: 25990,
  50000: 59990,
  100000: 109990,
  1000000: 899000,
};

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, lang = 'pt' } = await req.json();

    if (!CREDIT_PACKAGES[amount]) {
      return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
    }

    // Get user profile to check for discount
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const isSubscriber = profile && profile.plan && profile.plan !== 'Free';
    
    let basePriceCents = CREDIT_PACKAGES[amount];
    let finalPriceCents = basePriceCents;

    if (isSubscriber) {
      finalPriceCents = Math.round(basePriceCents * 0.9);
    }

    const origin = req.headers.get('origin');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${amount.toLocaleString('pt-BR')} Créditos`,
              description: isSubscriber ? 'Com desconto de assinante aplicado!' : undefined,
            },
            unit_amount: finalPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/${lang}/buy-credits?success=true`,
      cancel_url: `${origin}/${lang}/buy-credits?canceled=true`,
      metadata: {
        type: 'credits',
        amount: amount.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[STRIPE CHECKOUT ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
