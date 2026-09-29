import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadRemoteUrlToSupabase } from '@/lib/supabase/storage'
import { KLING_CONFIG, calculateKlingCredits, getKlingApiKey } from '@/lib/kling-config'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const maxDuration = 60

// ─────────────────────────────────────────────
// POST /api/kling-motion
// Inicia uma geração Kling 3.0 Motion Control
// ─────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createClient()

  // 1. Autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const {
    imageUrl,         // URL da imagem já enviada ao Supabase
    videoUrl,         // URL do vídeo já enviado ao Supabase
    orientation = 'image',
    mode = 'standard',
    resolution = '720p',
    audio = 'original',
    prompt = '',
    referenceDuration, // duração do vídeo de referência em segundos (enviada pelo frontend)
  } = body

  // ── 2. Validações Backend ──────────────────

  // Validar campos obrigatórios
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    return NextResponse.json({ error: 'URL da imagem é obrigatória e deve ser válida.' }, { status: 400 })
  }
  if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
    return NextResponse.json({ error: 'URL do vídeo de movimento é obrigatória e deve ser válida.' }, { status: 400 })
  }

  // Validar orientation
  if (!KLING_CONFIG.ORIENTATIONS.includes(orientation)) {
    return NextResponse.json({ error: 'Orientação inválida. Use "image" ou "video".' }, { status: 400 })
  }

  // Validar mode
  if (!KLING_CONFIG.MODES.includes(mode)) {
    return NextResponse.json({ error: 'Modo de qualidade inválido. Use "standard" ou "professional".' }, { status: 400 })
  }

  // Validar resolution
  if (!KLING_CONFIG.RESOLUTIONS.includes(resolution)) {
    return NextResponse.json({ error: 'Resolução inválida. Use "720p" ou "1080p".' }, { status: 400 })
  }

  // Validar audio
  if (!['original', 'off'].includes(audio)) {
    return NextResponse.json({ error: 'Valor de áudio inválido. Use "original" ou "off".' }, { status: 400 })
  }

  // Validar prompt (máximo 2500 caracteres)
  if (prompt && typeof prompt === 'string' && prompt.length > 2500) {
    return NextResponse.json({ error: 'O prompt não pode exceder 2500 caracteres.' }, { status: 400 })
  }

  // Validar duração de referência
  const durationLimits = KLING_CONFIG.DURATION_LIMITS[orientation]
  const refDuration = parseFloat(referenceDuration) || 0

  if (refDuration < durationLimits.min) {
    return NextResponse.json({
      error: `O vídeo de movimento precisa ter pelo menos ${durationLimits.min} segundos.`
    }, { status: 400 })
  }
  if (refDuration > durationLimits.max) {
    return NextResponse.json({
      error: `Para orientação "${orientation}", o vídeo de referência pode ter no máximo ${durationLimits.max} segundos.`
    }, { status: 400 })
  }

  // ── 3. Buscar perfil e validar créditos ───────────────

  const supabaseAdmin = createAdminClient()
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil do usuário não encontrado.' }, { status: 404 })
  }

  const isAdmin = ['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com'].includes(profile.email)
  const availableCredits = isAdmin ? 999999 : (profile.credit_limit - profile.credit_used)

  // Calcular custo baseado na duração de referência (estimativa conservadora)
  // O valor final será liquidado baseado na duração real após a conclusão
  const estimatedCost = calculateKlingCredits(mode, Math.ceil(refDuration))

  console.log(`[KLING-MOTION] user=${user.id}, mode=${mode}, orientation=${orientation}, resolution=${resolution}, refDuration=${refDuration}s, estimatedCost=${estimatedCost} credits, available=${availableCredits}`)

  if (!isAdmin && availableCredits < estimatedCost) {
    return NextResponse.json({
      error: `Saldo insuficiente. Você tem ${availableCredits} créditos, mas são necessários ${estimatedCost}.`
    }, { status: 400 })
  }

  // ── 4. Verificar API Key ──────────────────────────────
  const apiKey = getKlingApiKey()
  if (!apiKey) {
    return NextResponse.json({
      error: 'Serviço de geração temporariamente indisponível. Tente novamente mais tarde.'
    }, { status: 503 })
  }

  // ── 5. Reservar créditos ──────────────────────────────
  if (!isAdmin) {
    const { error: reserveError } = await supabaseAdmin
      .from('profiles')
      .update({ credit_used: profile.credit_used + estimatedCost })
      .eq('id', user.id)
      .eq('credit_used', profile.credit_used) // otimistic lock: verifica que não mudou

    if (reserveError) {
      console.error('[KLING-MOTION] Credit reservation error:', reserveError)
      return NextResponse.json({ error: 'Falha ao reservar créditos. Tente novamente.' }, { status: 500 })
    }
  }

  // ── 6. Gerar external_task_id único ──────────────────
  const externalTaskId = `maxai_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  // ── 7. Montar payload da API Kling ───────────────────
  const contents = []

  // Prompt (opcional — só incluir se preenchido)
  if (prompt && prompt.trim()) {
    contents.push({ type: 'prompt', text: prompt.trim() })
  }

  // Imagem do personagem
  contents.push({ type: 'image', url: imageUrl })

  // Vídeo de movimento
  contents.push({ type: 'video', url: videoUrl })

  const klingPayload = {
    contents,
    settings: {
      character_orientation: orientation,
      resolution,
      audio,
    },
    options: {
      external_task_id: externalTaskId,
      watermark_info: {
        enabled: KLING_CONFIG.WATERMARK_ENABLED,
      },
    },
  }

  console.log(`[KLING-MOTION] Sending task to Kling: externalTaskId=${externalTaskId}, orientation=${orientation}, resolution=${resolution}, audio=${audio}`)

  // ── 8. Chamar a API do Kling ──────────────────────────
  let klingTaskId = null
  let klingStatus = 'submitted'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), KLING_CONFIG.REQUEST_TIMEOUT_MS)

    const klingResponse = await fetch(
      `${KLING_CONFIG.API_BASE_URL}${KLING_CONFIG.ENDPOINTS.CREATE_TASK}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(klingPayload),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    const responseText = await klingResponse.text()
    console.log(`[KLING-MOTION] API response status: ${klingResponse.status}`)

    if (!klingResponse.ok) {
      // Reembolsar créditos em caso de erro da API
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }

      let errorDetail = responseText
      try {
        const errJson = JSON.parse(responseText)
        errorDetail = errJson.message || errJson.error || responseText
      } catch { /* mantém responseText */ }

      console.error(`[KLING-MOTION] API error ${klingResponse.status}: ${errorDetail}`)
      return NextResponse.json({
        error: 'Não foi possível iniciar a geração. Seus créditos não foram consumidos. Tente novamente.'
      }, { status: 502 })
    }

    let klingData
    try {
      klingData = JSON.parse(responseText)
    } catch {
      // Reembolsar créditos
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }
      console.error('[KLING-MOTION] Invalid JSON from Kling API')
      return NextResponse.json({ error: 'Resposta inválida da API de geração.' }, { status: 502 })
    }

    // Extrair task ID da resposta
    klingTaskId = klingData?.data?.task_id || klingData?.task_id || klingData?.id || null
    klingStatus = klingData?.data?.task_status || klingData?.status || 'submitted'

    if (!klingTaskId) {
      // Reembolsar créditos
      if (!isAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }
      console.error('[KLING-MOTION] No task ID in response:', responseText)
      return NextResponse.json({ error: 'Não foi possível obter ID da tarefa de geração.' }, { status: 502 })
    }

    console.log(`[KLING-MOTION] Task created! klingTaskId=${klingTaskId}, status=${klingStatus}`)

  } catch (apiErr) {
    // Reembolsar créditos em caso de erro de rede
    if (!isAdmin) {
      await supabaseAdmin
        .from('profiles')
        .update({ credit_used: profile.credit_used })
        .eq('id', user.id)
    }

    if (apiErr.name === 'AbortError') {
      console.error('[KLING-MOTION] Request TIMEOUT')
      return NextResponse.json({
        error: 'A API de geração não respondeu a tempo. Seus créditos não foram consumidos.'
      }, { status: 504 })
    }

    console.error('[KLING-MOTION] Network error:', apiErr.message)
    return NextResponse.json({
      error: 'Erro de conexão com o serviço de geração. Seus créditos não foram consumidos.'
    }, { status: 503 })
  }

  // ── 9. Salvar registro no banco ───────────────────────
  // Usamos external_id = klingTaskId para compatibilidade com o sistema de polling existente
  // Prefixamos com "kling|" para identificar no polling sem ambiguidade
  const externalIdForDb = `kling|cost:${estimatedCost}|id:${klingTaskId}`

  const { data: generation, error: dbError } = await supabaseAdmin
    .from('generations')
    .insert({
      user_id: user.id,
      type: 'video',
      prompt: prompt?.trim() || 'Kling 3.0 Motion Control',
      status: 'processing',
      external_id: externalIdForDb,
      model_name: 'kling-3.0-motion-control',
      aspect_ratio: null,
      // Colunas específicas do Kling (adicionadas pela migration)
      provider: 'kling',
      mode,
      resolution,
      orientation,
      duration_seconds: Math.ceil(refDuration),
      credits_reserved: estimatedCost,
      source_image_url: imageUrl,
      source_video_url: videoUrl,
      external_task_id: externalTaskId,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[KLING-MOTION] DB insert error:', dbError)
    // Reembolsar créditos
    if (!isAdmin) {
      await supabaseAdmin
        .from('profiles')
        .update({ credit_used: profile.credit_used })
        .eq('id', user.id)
    }
    return NextResponse.json({ error: 'Erro ao registrar geração. Seus créditos não foram consumidos.' }, { status: 500 })
  }

  console.log(`[KLING-MOTION] Complete! generation.id=${generation.id}, klingTaskId=${klingTaskId}, credits_reserved=${estimatedCost}`)

  return NextResponse.json({
    success: true,
    generation: {
      id: generation.id,
      status: 'processing',
      model_name: 'kling-3.0-motion-control',
      credits_reserved: estimatedCost,
    },
  })
}
