-- Migration for Perfect Pay Integration v4 (ATOMIC, SECURE & IDEMPOTENT + ENHANCED RPC VALIDATIONS)

-- 1. Processed Webhooks
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL, -- always 'status_<N>', never null — required for UNIQUE constraint reliability
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
    renewal_canceled BOOLEAN DEFAULT FALSE,
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

-- Unique constraint to prevent double-crediting the same cycle
ALTER TABLE public.credit_cycles DROP CONSTRAINT IF EXISTS unique_subscription_cycle;
ALTER TABLE public.credit_cycles ADD CONSTRAINT unique_subscription_cycle UNIQUE (subscription_id, cycle_number);


-- 4. RPC para Concessão Segura de Créditos com Auditoria Fina
CREATE OR REPLACE FUNCTION public.grant_subscription_credits(
    p_user_id UUID,
    p_subscription_id UUID,
    p_cycle_number INT,
    p_credits INT,
    p_scheduled_date TIMESTAMP WITH TIME ZONE,
    p_transaction_code TEXT
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
    v_sub RECORD;
    v_rows_updated INT;
BEGIN
    -- 1. Evitar valores inválidos ou absurdos
    IF p_cycle_number <= 0 THEN
        RAISE EXCEPTION 'Falha: O número do ciclo (cycle_number) deve ser maior que zero.';
    END IF;
    
    IF p_credits <= 0 THEN
        RAISE EXCEPTION 'Falha: A quantidade de créditos deve ser maior que zero.';
    END IF;
    
    IF p_credits > 100000 THEN
        RAISE EXCEPTION 'Falha: Tentativa de adicionar uma quantidade de créditos acima do limite seguro permitido (%).', p_credits;
    END IF;

    -- 2. Validar o usuário, a assinatura e suas regras de negócio
    -- Utilizamos FOR UPDATE para garantir row-level locking da assinatura até a transação acabar
    SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Falha: A assinatura informada não existe no banco de dados.';
    END IF;

    IF v_sub.user_id != p_user_id THEN
        RAISE EXCEPTION 'Falha: Inconsistência de segurança. A assinatura não pertence ao usuário informado.';
    END IF;

    IF v_sub.provider != 'perfectpay' THEN
        RAISE EXCEPTION 'Falha: A assinatura não é gerenciada pela Perfect Pay.';
    END IF;

    IF v_sub.status != 'active' THEN
        RAISE EXCEPTION 'Falha: A assinatura não está em estado ativo. Status atual: %', v_sub.status;
    END IF;

    IF p_credits != v_sub.credits_per_cycle THEN
        RAISE EXCEPTION 'Falha: O valor dos créditos (%) difere da configuração oficial desta assinatura (%).', p_credits, v_sub.credits_per_cycle;
    END IF;

    -- 3. Inserir o ciclo. 
    -- IMPORTANTE: Se o ciclo já existir, a constraint UNIQUE (subscription_id, cycle_number) irá acionar erro automático e dar ROLLBACK.
    INSERT INTO public.credit_cycles (
        subscription_id, 
        user_id, 
        cycle_number, 
        scheduled_date, 
        credits, 
        status, 
        provider, 
        transaction_code
    )
    VALUES (
        p_subscription_id, 
        p_user_id, 
        p_cycle_number, 
        p_scheduled_date, 
        p_credits, 
        'granted', 
        'perfectpay', 
        p_transaction_code
    );

    -- 4. Atualizar o saldo de crédito do perfil atomicamente.
    UPDATE public.profiles
    SET credit_limit = COALESCE(credit_limit, 0) + p_credits
    WHERE id = p_user_id;

    -- 5. Proteger o UPDATE
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated = 0 THEN
        RAISE EXCEPTION 'Falha crítica: Nenhuma linha atualizada no profiles. O perfil de usuário % não foi encontrado ou está inacessível. ROLLBACK total em andamento.', p_user_id;
    END IF;
END;
$$;

-- SEGURANÇA: Restringir acesso absoluto à execução da RPC
REVOKE ALL ON FUNCTION public.grant_subscription_credits FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_subscription_credits FROM anon;
REVOKE ALL ON FUNCTION public.grant_subscription_credits FROM authenticated;

-- Garantir acesso exclusivamente à role de serviço do sistema/backend
GRANT EXECUTE ON FUNCTION public.grant_subscription_credits TO service_role;
