import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadBase64ToSupabase } from '@/lib/supabase/storage'
import { validatePlanLimits } from '@/lib/plans'
import { NextResponse } from 'next/server'

export const maxDuration = 60;
export async function POST(request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    // Parse body parameters
    const body = await request.json()
    const { prompt, aspect_ratio, ref_image } = body

    console.log("Prompt recebido:", prompt)
    console.log(`[GENERATE-IMAGE] Request from user=${user.id}`)
    console.log(`[GENERATE-IMAGE] Params: prompt="${prompt?.substring(0, 60)}...", aspect_ratio=${aspect_ratio}, hasRefImage=${!!ref_image}`)

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'O prompt é obrigatório' }, { status: 400 })
    }

    // Process reference image if present
    let uploadedRefImageUrl = null
    if (ref_image) {
      try {
        if (ref_image.startsWith('data:')) {
          uploadedRefImageUrl = await uploadBase64ToSupabase(ref_image)
          console.log(`[GENERATE-IMAGE] Uploaded reference image to Storage: ${uploadedRefImageUrl}`)
        } else {
          uploadedRefImageUrl = ref_image
        }
      } catch (uploadErr) {
        console.error('[GENERATE-IMAGE] Failed to upload reference image:', uploadErr.message)
        return NextResponse.json({ error: 'Falha ao processar imagem de referência.' }, { status: 500 })
      }
    }

    const imageCost = 20

    // 2. Validate plan tools and limits
    const planValidation = await validatePlanLimits(user.id, 'gpt-image')
    if (!planValidation.allowed) {
      return NextResponse.json({ error: planValidation.error }, { status: 403 })
    }
    const profile = planValidation.profile
    const supabaseAdmin = createAdminClient()

    const isAdminUser = profile.email === 'gabrieljesus2030@gmail.com'
    const availableCredits = isAdminUser ? 999999 : (profile.credit_limit - profile.credit_used)
    console.log(`[GENERATE-IMAGE] Credits: available=${availableCredits}, cost=${imageCost}, isAdminUser=${isAdminUser}`)

    if (!isAdminUser && availableCredits < imageCost) {
      return NextResponse.json(
        { error: `Saldo de créditos insuficiente. Você tem ${availableCredits} créditos, mas são necessários ${imageCost}.` },
        { status: 400 }
      )
    }

    // 3. Deduct credits
    if (!isAdminUser) {
      const { error: deductError } = await supabaseAdmin
        .from('profiles')
        .update({ credit_used: profile.credit_used + imageCost })
        .eq('id', user.id)

      if (deductError) {
        console.error('[GENERATE-IMAGE] Credit deduction error:', deductError)
        return NextResponse.json({ error: 'Falha ao processar créditos' }, { status: 500 })
      }
    }

    // 4. Trigger external generation
    const apiKey = process.env.KIE_API_KEY
    const hasRef = !!uploadedRefImageUrl
    const modelName = hasRef ? 'gpt-image-2-image-to-image' : 'gpt-image-2-text-to-image'
    
    console.log(`[GENERATE-IMAGE] API Key present: ${!!apiKey}, modelName=${modelName}`)

    let externalId = null
    let status = 'processing'
    let isMock = false
    let apiErrorMsg = null

    if (!apiKey) {
      // Mock generation fallback
      externalId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      isMock = true
      console.log(`[GENERATE-IMAGE] No API key — mock mode, externalId=${externalId}`)
    } else {
      try {
        const payload = {
          model: modelName,
          input: {
            prompt,
            aspect_ratio: aspect_ratio || 'auto',
            ...(hasRef && { input_urls: [uploadedRefImageUrl] })
          }
        }

        console.log("API iniciando")
        console.log(`[GENERATE-IMAGE] Endpoint: https://api.kie.ai/api/v1/jobs/createTask`)
        console.log(`[GENERATE-IMAGE] Payload:`, JSON.stringify(payload))

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 35000)

        const apiResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const responseText = await apiResponse.text()
        console.log("Resposta API:", responseText)

        if (apiResponse.ok) {
          try {
            const apiData = JSON.parse(responseText)
            // KIE AI returns task details in data or at top level
            const taskData = apiData.data || apiData
            externalId = taskData.taskId || taskData.task_id
            
            if (!externalId) {
              console.error('[GENERATE-IMAGE] Task ID missing in API response:', JSON.stringify(apiData))
              // Refund credits
              if (!isAdminUser) {
                await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
              }
              return NextResponse.json({ error: 'API retornou sucesso mas sem taskId' }, { status: 500 })
            } else {
              console.log(`[GENERATE-IMAGE] Success! externalId=${externalId}`)
            }
          } catch (parseErr) {
            console.error(`[GENERATE-IMAGE] JSON parse error:`, parseErr.message)
            // Refund credits
            if (!isAdminUser) {
              await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
            }
            return NextResponse.json({ error: 'Resposta inválida da API de imagem (JSON inválido)' }, { status: 500 })
          }
        } else {
          console.error(`[GENERATE-IMAGE] API error: ${apiResponse.status}`)
          // Refund credits
          if (!isAdminUser) {
            await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
          }
          return NextResponse.json({ error: `A API externa retornou erro ${apiResponse.status}: ${responseText}` }, { status: 500 })
        }
      } catch (apiErr) {
        // Refund credits
        if (!isAdminUser) {
          await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
        }
        if (apiErr.name === 'AbortError') {
          console.error('[GENERATE-IMAGE] Request TIMEOUT after 35s')
          return NextResponse.json({ error: 'Timeout: a API externa de imagem não respondeu' }, { status: 504 })
        } else {
          console.error('[GENERATE-IMAGE] Connection error:', apiErr.message)
          return NextResponse.json({ error: `Erro de conexão com a API externa: ${apiErr.message}` }, { status: 500 })
        }
      }
    }

    // 5. Create generation record in database
    const { data: generation, error: dbError } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'image',
        prompt,
        status,
        external_id: externalId ? `cost:${imageCost}|id:${externalId}` : null,
        model_name: modelName,
        aspect_ratio: aspect_ratio || 'auto',
      })
      .select()
      .single()

    if (dbError) {
      console.error('[GENERATE-IMAGE] DB insert error:', dbError)
      // Refund credits in case DB insert fails
      if (!isAdminUser) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }

      return NextResponse.json({ error: 'Erro ao salvar registro de geração' }, { status: 500 })
    }

    console.log(`[GENERATE-IMAGE] Complete! generation.id=${generation.id}, externalId=${externalId}, isMock=${isMock}`)

    return NextResponse.json({
      success: true,
      generation,
      is_mock: isMock,
      apiError: apiErrorMsg,
    })
  } catch (error) {
    console.error('[GENERATE-IMAGE] Fatal error:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
