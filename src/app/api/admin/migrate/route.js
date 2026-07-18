import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── Auth guard ────────────────────────────────────────────────────────────
async function verifyAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user || user.email !== 'gabrieljesus2030@gmail.com') {
    return { error: 'Não autorizado', status: 403 }
  }
  return { user }
}

// ─── Date helper ───────────────────────────────────────────────────────────
/**
 * Converts "08/07" or "01/08" to an ISO timestamp string "2026-07-08T03:00:00.000Z"
 * Uses year 2026 always. Never calculates based on current date.
 */
function parseRenewalDate(dateStr) {
  // dateStr format: "DD/MM"
  const [day, month] = dateStr.trim().split('/')
  if (!day || !month) throw new Error(`Data inválida: "${dateStr}"`)
  const dd = day.padStart(2, '0')
  const mm = month.padStart(2, '0')
  // Build as "2026-MM-DD" midnight UTC-3 (BRT) → store as UTC
  // We store the date at noon UTC to avoid any timezone-day-shift issues
  return `2026-${mm}-${dd}T12:00:00.000Z`
}

// ─── Preview endpoint (GET with body payload via POST) ────────────────────
export async function POST(request) {
  try {
    const adminCheck = await verifyAdmin()
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const body = await request.json()
    const { action, users: userList } = body

    if (!Array.isArray(userList) || userList.length === 0) {
      return NextResponse.json({ error: 'Lista de usuários vazia ou inválida' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // ── PREVIEW action: check which users exist ──────────────────────────
    if (action === 'preview') {
      const emails = userList.map((u) => u.email.toLowerCase().trim())

      // Fetch existing profiles by email
      const { data: existingProfiles, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('email', emails)

      if (profErr) {
        return NextResponse.json({ error: 'Erro ao consultar perfis: ' + profErr.message }, { status: 500 })
      }

      const existingEmails = new Set((existingProfiles || []).map((p) => p.email.toLowerCase()))

      const toCreate = userList.filter((u) => !existingEmails.has(u.email.toLowerCase()))
      const toUpdate = userList.filter((u) => existingEmails.has(u.email.toLowerCase()))

      return NextResponse.json({
        total: userList.length,
        toCreate: toCreate.length,
        toUpdate: toUpdate.length,
        toCreateList: toCreate.map((u) => u.email),
        toUpdateList: toUpdate.map((u) => u.email),
      })
    }

    // ── MIGRATE action: upsert all users ─────────────────────────────────
    if (action === 'migrate') {
      const results = []
      let created = 0
      let updated = 0
      let errors = 0

      for (const userData of userList) {
        const email = userData.email.toLowerCase().trim()
        const plan = userData.plan.trim()
        const creditLimit = Number(userData.credits)
        let expiresAt = null

        // Validate plan
        const validPlans = ['Iniciante', 'Criador', 'Empresas']
        if (!validPlans.includes(plan)) {
          results.push({
            email,
            action: 'error',
            status: 'error',
            message: `Plano inválido: "${plan}"`,
          })
          errors++
          continue
        }

        // Parse date
        try {
          expiresAt = parseRenewalDate(userData.renewalDate)
        } catch (dateErr) {
          results.push({
            email,
            action: 'error',
            status: 'error',
            message: `Data inválida: ${dateErr.message}`,
          })
          errors++
          continue
        }

        try {
          // 1. Check if profile already exists
          const { data: existingProfile, error: profileCheckErr } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .maybeSingle()

          if (profileCheckErr) {
            throw new Error('Erro ao buscar perfil: ' + profileCheckErr.message)
          }

          if (existingProfile) {
            // ── UPDATE existing user ──────────────────────────────────────
            const { error: updateErr } = await supabaseAdmin
              .from('profiles')
              .update({
                plan,
                credit_limit: creditLimit,
                expires_at: expiresAt,
              })
              .eq('id', existingProfile.id)

            if (updateErr) {
              throw new Error('Erro ao atualizar perfil: ' + updateErr.message)
            }

            results.push({
              email,
              action: 'updated',
              status: 'success',
              message: `Atualizado: plano=${plan}, créditos=${creditLimit}, expira=${userData.renewalDate}`,
            })
            updated++
          } else {
            // ── CREATE new user ───────────────────────────────────────────

            // Generate a secure random password (user will use "forgot password" to log in)
            const tempPassword =
              Math.random().toString(36).slice(2, 10) +
              Math.random().toString(36).slice(2, 10).toUpperCase() +
              '!1'

            const { data: authData, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                name: email.split('@')[0],
                plan,
              },
            })

            if (authCreateErr) {
              // If user already exists in auth but not in profiles (edge case)
              if (authCreateErr.message.includes('already been registered') || authCreateErr.code === 'email_exists') {
                // Try to fetch from auth
                const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
                const existingAuthUser = authList?.users?.find(
                  (u) => u.email.toLowerCase() === email
                )

                if (existingAuthUser) {
                  const userId = existingAuthUser.id

                  // Upsert profile
                  const { error: upsertErr } = await supabaseAdmin
                    .from('profiles')
                    .upsert(
                      {
                        id: userId,
                        email,
                        name: email.split('@')[0],
                        plan,
                        credit_limit: creditLimit,
                        credit_used: 0,
                        expires_at: expiresAt,
                      },
                      { onConflict: 'id' }
                    )

                  if (upsertErr) {
                    throw new Error('Erro ao criar perfil para auth existente: ' + upsertErr.message)
                  }

                  results.push({
                    email,
                    action: 'created',
                    status: 'success',
                    message: `Perfil criado para auth existente: plano=${plan}, créditos=${creditLimit}, expira=${userData.renewalDate}`,
                  })
                  created++
                  continue
                }
              }
              throw new Error('Erro ao criar usuário no Auth: ' + authCreateErr.message)
            }

            const newUserId = authData.user.id

            // Wait briefly for any auth triggers
            await new Promise((r) => setTimeout(r, 500))

            // Upsert profile (in case trigger already created it)
            const { error: profileErr } = await supabaseAdmin
              .from('profiles')
              .upsert(
                {
                  id: newUserId,
                  email,
                  name: email.split('@')[0],
                  plan,
                  credit_limit: creditLimit,
                  credit_used: 0,
                  expires_at: expiresAt,
                },
                { onConflict: 'id' }
              )

            if (profileErr) {
              throw new Error('Erro ao criar perfil: ' + profileErr.message)
            }

            results.push({
              email,
              action: 'created',
              status: 'success',
              message: `Criado: plano=${plan}, créditos=${creditLimit}, expira=${userData.renewalDate}`,
            })
            created++
          }
        } catch (err) {
          results.push({
            email,
            action: 'error',
            status: 'error',
            message: err.message,
          })
          errors++
        }
      }

      return NextResponse.json({
        success: true,
        summary: { total: userList.length, created, updated, errors },
        results,
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    console.error('[MIGRATE] Fatal error:', err)
    return NextResponse.json({ error: 'Erro interno: ' + err.message }, { status: 500 })
  }
}
