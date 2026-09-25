-- Migration for Perfect Pay Integration v3 (ATOMIC, SECURE & IDEMPOTENT)

-- 1. Processed Webhooks
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_type TEXT,
    event_id TEXT, 
    transaction_code TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    payload JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.processed_webhooks DROP CONSTRAINT IF EXISTS unique_transaction_event;
ALTER TABLE public.processed_webhooks ADD CONSTRAINT unique_transaction_event UNIQUE (provider, transaction_code, event_type);

-- 2. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    product_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    transaction_code TEXT NOT NULL,
    status TEXT NOT NULL, -- 'active', 'refunded', 'expired'
    renewal_canceled BOOLEAN DEFAULT FALSE, -- Identifies status 6 (cancellation) without stopping current cycles
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_interval TEXT NOT NULL,
    contract_months INTEGER NOT NULL,
    credits_per_cycle INTEGER NOT NULL,
    current_cycle INTEGER DEFAULT 1,
    next_credit_date TIMESTAMP WITH TIME ZONE,
    last_credit_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotency constraint to prevent double subscription for the same transaction
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS unique_provider_transaction;
ALTER TABLE public.subscriptions ADD CONSTRAINT unique_provider_transaction UNIQUE (provider, transaction_code);

-- 3. Credit Cycles
CREATE TABLE IF NOT EXISTS public.credit_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    credits INTEGER NOT NULL,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    transaction_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.credit_cycles DROP CONSTRAINT IF EXISTS unique_subscription_cycle;
ALTER TABLE public.credit_cycles ADD CONSTRAINT unique_subscription_cycle UNIQUE (subscription_id, cycle_number);

-- 4. RPC para Concessão Segura de Créditos
CREATE OR REPLACE FUNCTION grant_subscription_credits(
    p_user_id UUID,
    p_subscription_id UUID,
    p_cycle_number INT,
    p_credits INT,
    p_scheduled_date TIMESTAMP WITH TIME ZONE,
    p_transaction_code TEXT
) RETURNS VOID AS $$
BEGIN
    -- 1. Insert do ciclo. Se o ciclo já existir, a constraint UNIQUE vai lançar erro e abortar a transação.
    INSERT INTO public.credit_cycles (subscription_id, user_id, cycle_number, scheduled_date, credits, status, provider, transaction_code)
    VALUES (p_subscription_id, p_user_id, p_cycle_number, p_scheduled_date, p_credits, 'granted', 'perfectpay', p_transaction_code);

    -- 2. Atualizar o saldo de crédito do perfil atomicamente.
    UPDATE public.profiles
    SET credit_limit = COALESCE(credit_limit, 0) + p_credits
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SEGURANÇA: Restringir execução da RPC apenas ao backend
REVOKE ALL ON FUNCTION grant_subscription_credits FROM PUBLIC;
REVOKE ALL ON FUNCTION grant_subscription_credits FROM anon;
REVOKE ALL ON FUNCTION grant_subscription_credits FROM authenticated;
GRANT EXECUTE ON FUNCTION grant_subscription_credits TO service_role;
