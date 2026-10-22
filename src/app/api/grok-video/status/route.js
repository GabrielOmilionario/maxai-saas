import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadRemoteUrlToSupabase } from '@/lib/supabase/storage'
import { formatGrokErrorMessage } from '@/lib/grok-lite-config'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com']

export async function GET(request) {
  try {
    const supabase = await createClient()

    // 1. Autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const generationId = searchParams.get('id')
    const externalUuid = searchParams.get('uuid')

    if (!generationId && !externalUuid) {
      return NextResponse.json({ error: 'ID de geração ou UUID é obrigatório' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 2. Localizar a geração no banco e validar propriedade
    let query = supabaseAdmin.from('generations').select('*').eq('user_id', user.id)
    if (generationId) {
      query = query.eq('id', generationId)
    } else if (externalUuid) {
      query = query.ilike('external_id', `%${externalUuid}%`)
    }

    const { data: generation, error: dbError } = await query.single()

    if (dbError || !generation) {
      return NextResponse.json({ error: 'Registro de geração não encontrado' }, { status: 404 })
    }

    // 3. Se já estiver concluído no banco, retornar imediatamente (evita chamadas redundantes)
    if (generation.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        result_url: generation.result_url,
        progress: 100,
        generation,
      })
    }

    // 4. Se já tiver falhado no banco, retornar erro imediatamente
    if (generation.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: 'A geração do vídeo falhou.',
        generation,
      })
    }

    // 5. Consultar a API oficial da Snapgen
    const apiKey = process.env.GEMINIGEN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Chave de API não configurada' }, { status: 500 })
    }

    const realUuid =
      externalUuid ||
      (generation.external_id?.includes('|id:')
        ? generation.external_id.split('|id:')[1]
        : generation.external_id)

    if (!realUuid) {
      return NextResponse.json({ error: 'Identificador externo inválido' }, { status: 400 })
    }

    const pollUrl = `https://api.snapgen.ai/uapi/v1/history/${realUuid}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    let snapgenRes
    try {
      snapgenRes = await fetch(pollUrl, {
        headers: {
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (pollErr) {
      clearTimeout(timeoutId)
      console.warn(`[GROK-LITE-POLL] Falha na requisição para ${pollUrl}:`, pollErr.message)
      // Retorna em processamento para continuar tentando nos próximos polls
      return NextResponse.json({
        status: 'processing',
        progress: 0,
        message: 'Aguardando atualização do status...',
      })
    }

    if (!snapgenRes.ok) {
      console.warn(`[GROK-LITE-POLL] Snapgen retornou HTTP ${snapgenRes.status}`)
      return NextResponse.json({
        status: 'processing',
        progress: 0,
      })
    }

    let snapgenData
    try {
      snapgenData = await snapgenRes.json()
    } catch {
      return NextResponse.json({ status: 'processing', progress: 0 })
    }

    const taskData = snapgenData.data || snapgenData
    const statusVal = taskData.status

    // Extrair status_percentage de forma confiável
    let progress = 0
    if (typeof taskData.status_percentage === 'number') {
      progress = Math.min(100, Math.max(0, taskData.status_percentage))
    } else if (typeof taskData.percentage === 'number') {
      progress = Math.min(100, Math.max(0, taskData.percentage))
    } else if (typeof taskData.progress === 'number') {
      progress = Math.min(100, Math.max(0, taskData.progress))
    }

    // 6. Interpretação dos status: 1 = processando, 2 = concluído, 3 = falha, -2 = política de moderação
    const isCompleted =
      statusVal === 2 || statusVal === '2' || statusVal === 'completed' || statusVal === 'success'
    const isFailed =
      statusVal === 3 ||
      statusVal === '3' ||
      statusVal === -2 ||
      statusVal === '-2' ||
      statusVal === 'failed' ||
      statusVal === 'fail'

    // Status 2: Concluído
    if (isCompleted) {
      let rawVideoUrl =
        taskData.video_url || taskData.url || taskData.result_url || taskData.result

      if (!rawVideoUrl && taskData.generated_video && Array.isArray(taskData.generated_video) && taskData.generated_video.length > 0) {
        rawVideoUrl = taskData.generated_video[0].video_url || taskData.generated_video[0].url
      }

      if (rawVideoUrl) {
        // Arquivar no Supabase Storage para armazenamento definitivo
        let permanentUrl = rawVideoUrl
        try {
          permanentUrl = await uploadRemoteUrlToSupabase(rawVideoUrl, 'video')
        } catch (uploadErr) {
          console.error('[GROK-LITE-POLL] Erro ao arquivar vídeo no Supabase:', uploadErr)
        }

        // Atualizar banco de dados
        await supabaseAdmin
          .from('generations')
          .update({
            status: 'completed',
            result_url: permanentUrl,
          })
          .eq('id', generation.id)

        generation.status = 'completed'
        generation.result_url = permanentUrl

        return NextResponse.json({
          status: 'completed',
          result_url: permanentUrl,
          progress: 100,
          generation,
        })
      }
    }

    // Status 3 ou -2: Falha ou Violação de Política
    if (isFailed) {
      // Atualização atômica para garantir reembolso idempotente (apenas se ainda estava em processing)
      const { data: updatedGens } = await supabaseAdmin
        .from('generations')
        .update({ status: 'failed' })
        .eq('id', generation.id)
        .eq('status', 'processing')
        .select('id')

      if (updatedGens && updatedGens.length > 0) {
        // Extrair o custo a ser reembolsado do external_id
        const costMatch = generation.external_id?.match(/cost:(\d+)/)
        const refundCost = costMatch ? parseInt(costMatch[1], 10) : 29

        // Obter perfil do usuário
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, credit_used')
          .eq('id', user.id)
          .single()

        const isUserAdmin = userProfile && ADMIN_EMAILS.includes(userProfile.email)

        if (!isUserAdmin && userProfile) {
          const newCreditUsed = Math.max(0, userProfile.credit_used - refundCost)
          await supabaseAdmin
            .from('profiles')
            .update({ credit_used: newCreditUsed })
            .eq('id', user.id)

          console.log(`[GROK-LITE-POLL] Reembolso de ${refundCost} créditos aplicado ao usuário ${user.id}`)
        }
      }

      let errorMsg = 'A geração do vídeo falhou.'
      if (statusVal === -2 || statusVal === '-2') {
        errorMsg = 'O conteúdo do prompt ou da imagem violou as diretrizes de moderação e foi bloqueado.'
      } else if (taskData.message || taskData.error || taskData.fail_reason) {
        errorMsg = formatGrokErrorMessage(taskData.message || taskData.error || taskData.fail_reason)
      }

      return NextResponse.json({
        status: 'failed',
        error: errorMsg,
      })
    }

    // Status 1: Processando
    return NextResponse.json({
      status: 'processing',
      progress: progress || 10,
    })
  } catch (fatalErr) {
    console.error('[GROK-LITE-POLL] Erro fatal:', fatalErr)
    return NextResponse.json({ error: 'Erro interno ao consultar status' }, { status: 500 })
  }
}
