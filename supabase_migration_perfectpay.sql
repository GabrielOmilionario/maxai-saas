-- Migration for Perfect Pay Integration

-- 1. processed_webhooks
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- 'perfectpay'
    event_type TEXT,
    transaction_code TEXT NOT NULL,
    user_id UUID, -- Optional, can be linked to auth.users or profiles
    status TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotency constraint
-- A single transaction code should only be successfully processed once for a given event type
ALTER TABLE public.processed_webhooks
DROP CONSTRAINT IF EXISTS unique_transaction_event;

ALTER TABLE public.processed_webhooks
ADD CONSTRAINT unique_transaction_event UNIQUE (provider, transaction_code, event_type);


-- 2. subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'perfectpay'
    product_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    transaction_code TEXT NOT NULL,
    status TEXT NOT NULL, -- 'active', 'canceled', 'expired', 'past_due'
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_interval TEXT NOT NULL, -- 'monthly', 'semiannual', 'annual'
    contract_months INTEGER NOT NULL,
    credits_per_cycle INTEGER NOT NULL,
    current_cycle INTEGER DEFAULT 1,
    next_credit_date TIMESTAMP WITH TIME ZONE,
    last_credit_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 3. credit_cycles
CREATE TABLE IF NOT EXISTS public.credit_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    credits INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'granted', 'failed'
    provider TEXT NOT NULL,
    transaction_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint to prevent double-crediting the same cycle
ALTER TABLE public.credit_cycles
DROP CONSTRAINT IF EXISTS unique_subscription_cycle;

ALTER TABLE public.credit_cycles
ADD CONSTRAINT unique_subscription_cycle UNIQUE (subscription_id, cycle_number);

