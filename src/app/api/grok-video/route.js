import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadRemoteUrlToSupabase, uploadBase64ToSupabase } from '@/lib/supabase/storage'
import { validatePlanLimits } from '@/lib/plans'
import {
  calculateGrokLiteCredits,
  GROK_LITE_CONFIG,
  formatGrokErrorMessage,
} from '@/lib/grok-lite-config'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const ADMIN_EMAILS = ['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com']

export async function POST(request) {
  try {
    const supabase = await createClient()

    // 1. Autenticação do Usuário
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Extração dos parâmetros (suporta multipart/form-data e application/json)
    const contentType = request.headers.get('content-type') || ''
    let prompt = ''
    let isExtend = false
    let refHistory = null
    let extendGenerationId = null
    let resolution = GROK_LITE_CONFIG.DEFAULT_RESOLUTION
    let duration = GROK_LITE_CONFIG.DEFAULT_DURATION
    let aspectRatio = GROK_LITE_CONFIG.DEFAULT_ASPECT_RATIO
    let mode = GROK_LITE_CONFIG.DEFAULT_MODE
    let skipAudio = 'false'
    let refFile = null
    let refImageUrl = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      prompt = (formData.get('prompt') || '').toString()
      isExtend = formData.get('is_extend') === 'true' || formData.get('isExtend') === 'true'
      refHistory = formData.get('ref_history') ? formData.get('ref_history').toString() : null
      extendGenerationId = formData.get('extend_id') ? formData.get('extend_id').toString() : null
      if (formData.has('resolution')) resolution = formData.get('resolution').toString()
      if (formData.has('duration')) duration = parseInt(formData.get('duration').toString(), 10)
      if (formData.has('aspect_ratio')) aspectRatio = formData.get('aspect_ratio').toString()
      if (formData.has('mode')) mode = formData.get('mode').toString()
      if (formData.has('skip_audio')) {
        const val = formData.get('skip_audio')
        skipAudio = (val === 'true' || val === true) ? 'true' : 'false'
      }
      const filesVal = formData.get('files')
      if (filesVal && typeof filesVal === 'object' && filesVal.size > 0) {
        refFile = filesVal
      }
      if (formData.has('ref_image_url')) {
        refImageUrl = formData.get('ref_image_url').toString()
      }
    } else {
      const body = await request.json().catch(() => ({}))
      prompt = body.prompt || ''
      isExtend = !!body.isExtend || !!body.is_extend
      refHistory = body.ref_history || body.refHistory || null
      extendGenerationId = body.extend_id || body.extendId || null
      if (body.resolution) resolution = body.resolution
      if (body.duration) duration = parseInt(body.duration, 10)
      if (body.aspect_ratio || body.aspectRatio) aspectRatio = body.aspect_ratio || body.aspectRatio
      if (body.mode) mode = body.mode
      if (typeof body.skip_audio !== 'undefined') {
        skipAudio = body.skip_audio ? 'true' : 'false'
      }
      refImageUrl = body.ref_image || body.ref_image_url || body.refImageUrl || null
    }

    // 3. Validação dos Parâmetros Obrigatórios
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: formatGrokErrorMessage('EMPTY_PROMPT') }, { status: 400 })
    }

    // Validar resolução
    if (!GROK_LITE_CONFIG.RESOLUTIONS.includes(resolution)) {
      return NextResponse.json({ error: formatGrokErrorMessage('INVALID_RESOLUTION') }, { status: 400 })
    }

    // Validar duração
    if (!GROK_LITE_CONFIG.DURATIONS.includes(duration)) {
      return NextResponse.json({ error: formatGrokErrorMessage('INVALID_VIDEO_LENGTH') }, { status: 400 })
    }

    // Validar modo
    const validModes = GROK_LITE_CONFIG.MODES.map((m) => m.value)
    if (!validModes.includes(mode)) {
      mode = GROK_LITE_CONFIG.DEFAULT_MODE
    }

    // Validar aspect ratio (somente para geração normal)
    const validAspects = GROK_LITE_CONFIG.ASPECT_RATIOS.map((a) => a.value)
    if (!validAspects.includes(aspectRatio)) {
      aspectRatio = GROK_LITE_CONFIG.DEFAULT_ASPECT_RATIO
    }

    const supabaseAdmin = createAdminClient()

    // 4. Validação Específica para Extensão de Vídeo
    let realRefHistoryUuid = refHistory
    if (isExtend) {
      if (!refHistory && !extendGenerationId) {
        return NextResponse.json(
          { error: 'Para estender um vídeo, o identificador de referência é obrigatório.' },
          { status: 400 }
        )
      }

      // Buscar o vídeo original no banco de dados para garantir propriedade e status
      let query = supabaseAdmin.from('generations').select('*').eq('user_id', user.id)
      if (extendGenerationId) {
        query = query.eq('id', extendGenerationId)
      } else if (refHistory) {
        // refHistory pode ser o uuid ou parte do external_id
        query = query.ilike('external_id', `%${refHistory}%`)
      }

      const { data: origGen, error: origGenErr } = await query.single()

      if (origGenErr || !origGen) {
        return NextResponse.json(
          { error: formatGrokErrorMessage('HISTORY_NOT_FOUND') },
          { status: 404 }
        )
      }

      if (origGen.status !== 'completed') {
        return NextResponse.json(
          { error: 'Apenas vídeos concluídos com sucesso podem ser estendidos.' },
          { status: 400 }
        )
      }

      // Extrair o UUID oficial da Snapgen armazenado no external_id
      if (origGen.external_id) {
        if (origGen.external_id.includes('|id:')) {
          realRefHistoryUuid = origGen.external_id.split('|id:')[1]
        } else {
          realRefHistoryUuid = origGen.external_id
        }
      }

      if (!realRefHistoryUuid) {
        return NextResponse.json(
          { error: formatGrokErrorMessage('NO_GENERATED_VIDEO') },
          { status: 400 }
        )
      }

      // Herdamos o aspect ratio do vídeo original (não enviamos à API de extensão)
      aspectRatio = origGen.aspect_ratio || 'landscape'
    }

    // 5. Processamento da Imagem de Referência (Opcional, máx 1)
    let uploadedImageUrl = null
    if (!isExtend) {
      if (refFile) {
        try {
          const ext = refFile.name ? refFile.name.split('.').pop() : 'png'
          const uniqueName = `ref-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`
          const arrayBuffer = await refFile.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const contentTypeHeader = refFile.type || 'image/png'

          const { error: uploadError } = await supabaseAdmin.storage
            .from('media')
            .upload(uniqueName, buffer, {
              contentType: contentTypeHeader,
              cacheControl: '31536000',
              upsert: true,
            })

          if (uploadError) {
            console.error('[GROK-LITE] Erro ao salvar imagem no storage:', uploadError)
            return NextResponse.json(
              { error: 'Falha ao processar o upload da imagem de referência.' },
              { status: 500 }
            )
          }

          const {
            data: { publicUrl },
          } = supabaseAdmin.storage.from('media').getPublicUrl(uniqueName)

          uploadedImageUrl = publicUrl
        } catch (fileErr) {
          console.error('[GROK-LITE] Erro no processamento do arquivo:', fileErr)
          return NextResponse.json(
            { error: 'Erro ao processar o arquivo de imagem.' },
            { status: 500 }
          )
        }
      } else if (refImageUrl) {
        if (refImageUrl.startsWith('data:')) {
          try {
            uploadedImageUrl = await uploadBase64ToSupabase(refImageUrl)
          } catch (b64Err) {
            console.error('[GROK-LITE] Erro no upload base64:', b64Err)
            return NextResponse.json(
              { error: 'Erro ao processar imagem base64.' },
              { status: 500 }
            )
          }
        } else {
          uploadedImageUrl = refImageUrl
        }
      }
    }

    // 6. Cálculo e Validação de Créditos
    const requiredCredits = calculateGrokLiteCredits(resolution, duration)

    // Validação de limites do plano
    const planValidation = await validatePlanLimits(user.id, 'grok-1.5-lite')
    if (!planValidation.allowed) {
      return NextResponse.json({ error: planValidation.error }, { status: 403 })
    }

    const profile = planValidation.profile
    const isAdmin = ADMIN_EMAILS.includes(profile.email)
    const availableCredits = isAdmin ? 999999 : profile.credit_limit - profile.credit_used

    if (!isAdmin && availableCredits < requiredCredits) {
      return NextResponse.json(
        {
          error: `Saldo de créditos insuficiente. Você tem ${availableCredits} créditos, mas são necessários ${requiredCredits}.`,
        },
        { status: 400 }
      )
    }

    // 7. Débito atômico de créditos (Optimistic Concurrency)
    if (!isAdmin) {
      const { data: updatedProfile, error: deductErr } = await supabaseAdmin
        .from('profiles')
        .update({ credit_used: profile.credit_used + requiredCredits })
        .eq('id', user.id)
        .eq('credit_used', profile.credit_used)
        .select('id, credit_used')

      if (deductErr || !updatedProfile || updatedProfile.length === 0) {
        console.error('[GROK-LITE] Falha no lock otimista de créditos:', deductErr)
        return NextResponse.json(
          { error: 'Falha ao debitar créditos. Tente novamente.' },
          { status: 409 }
        )
      }
    }

    // 8. Envio da solicitação à API oficial da Snapgen
    const apiKey = process.env.GEMINIGEN_API_KEY
    if (!apiKey) {
      // Reembolso imediato se a chave não estiver presente
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }
      return NextResponse.json(
        { error: 'Serviço de geração temporariamente indisponível (chave não configurada).' },
        { status: 500 }
      )
    }

    const endpoint = isExtend
      ? GROK_LITE_CONFIG.ENDPOINTS.EXTEND
      : GROK_LITE_CONFIG.ENDPOINTS.GENERATE

    const snapgenFormData = new FormData()
    snapgenFormData.append('prompt', prompt.trim())

    if (isExtend) {
      snapgenFormData.append('ref_history', realRefHistoryUuid)
      snapgenFormData.append('duration', String(duration))
      snapgenFormData.append('resolution', resolution)
      snapgenFormData.append('mode', mode)
      snapgenFormData.append('skip_audio', skipAudio)
      // A proporção NÃO é enviada na extensão (herdada do vídeo original)
      // O modelo NÃO é enviado
    } else {
      snapgenFormData.append('resolution', resolution)
      snapgenFormData.append('duration', String(duration))
      snapgenFormData.append('aspect_ratio', aspectRatio)
      snapgenFormData.append('mode', mode)
      snapgenFormData.append('skip_audio', skipAudio)
      // O modelo NÃO é enviado

      // Apenas um método de referência de imagem
      if (uploadedImageUrl) {
        snapgenFormData.append('file_urls', uploadedImageUrl)
      }
    }

    let snapgenResponse
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55000)

    try {
      snapgenResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
        },
        body: snapgenFormData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      // Reembolso de créditos em caso de erro de conexão ou timeout
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }

      if (fetchErr.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Tempo limite excedido: a API de geração não respondeu.' },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: 'Erro de conexão com o provedor de IA. Seus créditos não foram debitados.' },
        { status: 502 }
      )
    }

    const responseText = await snapgenResponse.text()

    if (!snapgenResponse.ok) {
      // Reembolso de créditos se a API externa rejeitar
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }

      console.error(`[GROK-LITE] API Snapgen retornou erro ${snapgenResponse.status}: ${responseText}`)
      let parsedError = responseText
      try {
        const errorJson = JSON.parse(responseText)
        parsedError = errorJson.message || errorJson.error || errorJson.code || responseText
      } catch {}

      return NextResponse.json(
        { error: formatGrokErrorMessage(parsedError) },
        { status: snapgenResponse.status || 500 }
      )
    }

    let apiData
    try {
      apiData = JSON.parse(responseText)
    } catch (parseErr) {
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }
      return NextResponse.json(
        { error: 'Resposta em formato inesperado da API externa.' },
        { status: 502 }
      )
    }

    const snapgenUuid = apiData.uuid || apiData.data?.uuid
    if (!snapgenUuid) {
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }
      return NextResponse.json(
        { error: 'Identificador de geração não retornado pela API externa.' },
        { status: 502 }
      )
    }

    // 9. Persistência da geração no banco de dados MAX AI
    const externalIdString = `grok-lite|cost:${requiredCredits}|id:${snapgenUuid}`
    const { data: newGeneration, error: insertErr } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'video',
        prompt: prompt.trim(),
        status: 'processing',
        external_id: externalIdString,
        model_name: 'grok-1.5-lite',
        aspect_ratio: aspectRatio,
      })
      .select()
      .single()

    if (insertErr || !newGeneration) {
      console.error('[GROK-LITE] Erro ao registrar geração no banco:', insertErr)
      // Nota: o processamento na Snapgen já foi aceito, mas devolvemos para manter consistência
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }
      return NextResponse.json(
        { error: 'Erro ao persistir o registro da geração.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      generation: newGeneration,
      uuid: snapgenUuid,
      cost: requiredCredits,
      isExtend,
    })
  } catch (err) {
    console.error('[GROK-LITE] Erro fatal:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
