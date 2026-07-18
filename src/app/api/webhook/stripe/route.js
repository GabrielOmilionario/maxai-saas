import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req) {
  try {
    const payload = await req.json()
    console.log('[STRIPE WEBHOOK] Payload received:', JSON.stringify(payload).substring(0, 500))

    // Apenas processar eventos de checkout completo
    if (payload.type !== 'checkout.session.completed') {
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    const session = payload.data.object
    
    // Extrair email do cliente
    const email = session.customer_details?.email || session.customer_email || session.receipt_email

    if (!email) {
      console.warn('[STRIPE WEBHOOK] No email found in payload')
      return new Response(JSON.stringify({ error: 'Email not found in payload' }), { status: 400 })
    }

    const amountTotal = session.amount_total
    const currency = session.currency?.toLowerCase() || 'brl'

    const isCreditPurchase = session.metadata?.type === 'credits'
    const creditAmount = isCreditPurchase ? parseInt(session.metadata?.amount || '0', 10) : 0

    // Determinar o plano baseado no valor e moeda
    // Iniciante: R$ 39,90 -> 3990 ou $ 9,90 -> 990
    // Criador: R$ 67,90 -> 6790 ou $ 14,90 -> 1490
    // Empresas: R$ 119,90 -> 11990 ou $ 19,90 -> 1990
    let plan = 'Iniciante'
    let creditLimit = 3000

    if (isCreditPurchase) {
      plan = 'Free' // Fallback for new users
      creditLimit = creditAmount
    } else {
      if (amountTotal === 3990 || amountTotal === 990) {
        plan = 'Iniciante'
        creditLimit = 3000
      } else if (amountTotal === 6790 || amountTotal === 1490) {
        plan = 'Criador'
        creditLimit = 6000
      } else if (amountTotal === 11990 || amountTotal === 1990) {
        plan = 'Empresas'
        creditLimit = 20000
      } else {
        console.warn(`[STRIPE WEBHOOK] Unknown amount_total: ${amountTotal} (${currency}). Defaulting to Iniciante.`)
      }
    }

    const supabaseAdmin = createAdminClient()

    // 1. Verificar se o usuário já existe no banco de dados (perfis)
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, plan, credit_limit')
      .eq('email', email)
      .limit(1)

    if (existingProfiles && existingProfiles.length > 0) {
      const userId = existingProfiles[0].id
      
      let updatePayload = {}
      if (isCreditPurchase) {
        const currentLimit = existingProfiles[0].credit_limit || 0
        const newLimit = currentLimit + creditAmount
        updatePayload = { credit_limit: newLimit }
        console.log(`[STRIPE WEBHOOK] User ${email} bought credits. Adding ${creditAmount} credits. New limit: ${newLimit}.`)
      } else {
        updatePayload = { plan: plan, credit_limit: creditLimit }
        console.log(`[STRIPE WEBHOOK] User ${email} already exists. Updating plan to ${plan}.`)
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        
      if (updateError) {
        console.error('[STRIPE WEBHOOK] Error updating existing user plan:', updateError)
        return new Response(JSON.stringify({ error: 'Error updating user profile' }), { status: 500 })
      }
      return new Response(JSON.stringify({ success: true, message: `Existing user plan updated to ${plan}` }), { status: 200 })
    }

    // 2. Se não existe, criar o usuário no Supabase Auth com senha temporária
    console.log(`[STRIPE WEBHOOK] Creating new user ${email} with plan ${plan}...`)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'maxai2026',
      email_confirm: true,
      user_metadata: {
        plan: plan
      }
    })

    if (authError) {
      console.error('[STRIPE WEBHOOK] Error creating auth user:', authError)
      if (authError.message.includes('already registered')) {
        return new Response(JSON.stringify({ success: true, message: 'Auth user exists, missing profile handled.' }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: authError.message }), { status: 500 })
    }

    const userId = authData.user.id

    // 3. Atualizar/Inserir o Profile
    await new Promise(resolve => setTimeout(resolve, 500))

    const { data: checkNewProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (checkNewProfile) {
      await supabaseAdmin
        .from('profiles')
        .update({ plan: plan, credit_limit: creditLimit })
        .eq('id', userId)
    } else {
      await supabaseAdmin
        .from('profiles')
        .insert([{
          id: userId,
          email: email,
          plan: plan,
          credit_limit: creditLimit,
          credit_used: 0
        }])
    }

    console.log(`[STRIPE WEBHOOK] Successfully created and configured user ${email} for plan ${plan}`)
    return new Response(JSON.stringify({ success: true, message: 'User created successfully' }), { status: 200 })

  } catch (err) {
    console.error('[STRIPE WEBHOOK] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}
