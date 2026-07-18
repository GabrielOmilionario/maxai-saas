import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Middleware helper to ensure the user is the admin
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user || user.email !== 'gabrieljesus2030@gmail.com') {
    return { error: 'Não autorizado', status: 403 }
  }
  return { user }
}

export async function GET(request) {
  try {
    const adminCheck = await verifyAdmin()
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const supabaseAdmin = createAdminClient()

    // 1. Fetch all user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('[ADMIN-USERS-GET] Profiles error:', profilesError.message)
      return NextResponse.json({ error: 'Erro ao buscar perfis' }, { status: 500 })
    }

    // 2. Fetch monthly generation counts per user
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: generations, error: genError } = await supabaseAdmin
      .from('generations')
      .select('user_id')
      .gte('created_at', startOfMonth.toISOString())

    if (genError) {
      console.error('[ADMIN-USERS-GET] Generations error:', genError.message)
    }

    const genCounts = {}
    if (generations) {
      generations.forEach(g => {
        genCounts[g.user_id] = (genCounts[g.user_id] || 0) + 1
      })
    }

    // 3. Map monthly count to each profile
    const users = (profiles || []).map(p => ({
      ...p,
      monthly_generations: genCounts[p.id] || 0
    }))

    return NextResponse.json(users)
  } catch (err) {
    console.error('[ADMIN-USERS-GET] Fatal error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const adminCheck = await verifyAdmin()
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const body = await request.json()
    const { action, userId, plan, creditLimit, newPassword, name, email, password, expiresAt } = body

    const supabaseAdmin = createAdminClient()

    if (action === 'createUser') {
      if (!email || !password || !plan) {
        return NextResponse.json({ error: 'Email, senha e plano são obrigatórios' }, { status: 400 })
      }

      // 1. Criar o usuário no Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name || 'Usuário',
          plan: plan
        }
      })

      if (authError) {
        console.error('[ADMIN-USERS-POST] Create auth user error:', authError.message)
        return NextResponse.json({ error: 'Falha ao criar autenticação do usuário: ' + authError.message }, { status: 500 })
      }

      const newUserId = authData.user.id

      // 2. Criar ou Atualizar o profile com a data de expiração
      // O trigger on_auth_user_created deve criar um perfil, mas podemos atualizá-lo ou inseri-lo
      await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar trigger

      const profileData = {
        name: name || 'Usuário',
        plan: plan,
        credit_limit: creditLimit ? Number(creditLimit) : 100,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
      }

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', newUserId)
        .single()

      if (existingProfile) {
        await supabaseAdmin
          .from('profiles')
          .update(profileData)
          .eq('id', newUserId)
      } else {
        await supabaseAdmin
          .from('profiles')
          .insert([{ id: newUserId, email: email, credit_used: 0, ...profileData }])
      }

      return NextResponse.json({ success: true, message: 'Usuário criado com sucesso!' })
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório para esta ação' }, { status: 400 })
    }

    if (action === 'updatePlan') {
      if (!plan || creditLimit === undefined) {
        return NextResponse.json({ error: 'Plan e creditLimit são obrigatórios' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          plan, 
          credit_limit: Number(creditLimit),
          ...(expiresAt !== undefined && { expires_at: expiresAt ? new Date(expiresAt).toISOString() : null })
        })
        .eq('id', userId)

      if (error) {
        console.error('[ADMIN-USERS-POST] Update plan error:', error.message)
        return NextResponse.json({ error: 'Falha ao atualizar plano' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Plano atualizado com sucesso!' })
    }

    if (action === 'resetPassword') {
      if (!newPassword || newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (error) {
        console.error('[ADMIN-USERS-POST] Reset password error:', error.message)
        return NextResponse.json({ error: 'Falha ao redefinir senha: ' + error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso!' })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    console.error('[ADMIN-USERS-POST] Fatal error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
