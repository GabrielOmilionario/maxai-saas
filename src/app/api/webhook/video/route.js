import { createAdminClient } from '@/lib/supabase/server'
import { uploadRemoteUrlToSupabase } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Received video webhook payload:', body)

    const payload = body.data || body
    const uuid = payload.uuid || payload.taskId || payload.task_id || body.uuid || body.taskId || body.task_id
    const status = payload.status !== undefined ? payload.status : body.status
    let videoUrl = payload.video_url || payload.url || payload.result_url || body.video_url || body.url || body.result_url
    if (!videoUrl && payload.generated_video && payload.generated_video.length > 0) {
      videoUrl = payload.generated_video[0].video_url || payload.generated_video[0].url
    }
    if (!videoUrl && body.generated_video && body.generated_video.length > 0) {
      videoUrl = body.generated_video[0].video_url || body.generated_video[0].url
    }

    if (!uuid) {
      return NextResponse.json({ error: 'Falta o identificador do job (uuid/taskId)' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. Find the corresponding generation record (if exists)
    const { data: generation, error: fetchError } = await supabaseAdmin
      .from('generations')
      .select('*')
      .like('external_id', '%' + uuid)
      .maybeSingle()

    // 2. Find the corresponding chat message record (if exists)
    const { data: chatMessage, error: fetchMsgError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .like('external_id', '%' + uuid)
      .maybeSingle()

    if (!generation && !chatMessage) {
      console.warn(`Webhook: No record found in generations or chat_messages for external ID: ${uuid}`)
      return NextResponse.json({ message: 'Nenhum registro correspondente encontrado.' }, { status: 200 })
    }

    // Determine status: status 2 means completed, status 3 means failed
    const isSuccess = status === 2 || status === '2' || status === 'completed' || status === 'success'
    const isFailure = status === 3 || status === '3' || status === 'failed' || status === 'fail'

    if (isSuccess && videoUrl) {
      // Archive to Supabase
      const supabaseUrl = await uploadRemoteUrlToSupabase(videoUrl, 'video')
      
      // Update generation record if exists
      if (generation && generation.status !== 'completed' && generation.status !== 'failed') {
        await supabaseAdmin
          .from('generations')
          .update({
            status: 'completed',
            result_url: supabaseUrl
          })
          .eq('id', generation.id)
        console.log(`Webhook: Successfully completed video generation record ${generation.id}`)
      }

      // Update chat message if exists
      if (chatMessage && chatMessage.status !== 'completed' && chatMessage.status !== 'failed') {
        await supabaseAdmin
          .from('chat_messages')
          .update({
            status: 'completed',
            media_url: supabaseUrl,
            media_type: 'video'
          })
          .eq('id', chatMessage.id)
        console.log(`Webhook: Successfully completed chat message ${chatMessage.id}`)

        // Create generation record in gallery if not already exists
        const { data: existingGen } = await supabaseAdmin
          .from('generations')
          .select('*')
          .like('external_id', '%' + uuid)
          .maybeSingle()

        if (!existingGen) {
          // Find the prompt from the user's message in the session
          const { data: userMessages } = await supabaseAdmin
            .from('chat_messages')
            .select('*')
            .eq('session_id', chatMessage.session_id)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(1)

          const promptText = userMessages?.[0]?.text || 'Geração de Vídeo'

          await supabaseAdmin.from('generations').insert({
            user_id: chatMessage.user_id,
            type: 'video',
            prompt: promptText,
            status: 'completed',
            result_url: supabaseUrl,
            external_id: uuid,
            model_name: chatMessage.model_name || 'grok-3'
          })
          console.log(`Webhook: Inserted completed generation record for chat message ${chatMessage.id}`)
        }
      }
    } else if (isFailure || (isSuccess && !videoUrl)) {
      // Handle Failure
      if (generation && generation.status !== 'completed' && generation.status !== 'failed') {
        await supabaseAdmin
          .from('generations')
          .update({
            status: 'failed'
          })
          .eq('id', generation.id)

        // Refund credits
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', generation.user_id)
          .single()

        if (profile) {
          const costMatch = (generation.external_id || '').match(/cost:(\d+)/);
          const refundAmount = costMatch ? parseInt(costMatch[1]) : 20;

          await supabaseAdmin
            .from('profiles')
            .update({
              credit_used: Math.max(0, profile.credit_used - refundAmount)
            })
            .eq('id', generation.user_id)
        }
        const logCostMatch = (generation.external_id || '').match(/cost:(\d+)/);
        const logRefundAmount = logCostMatch ? parseInt(logCostMatch[1]) : 20;
        console.log(`Webhook: Video generation ${generation.id} failed. Refunding ${logRefundAmount} credits.`)
      }

      if (chatMessage && chatMessage.status !== 'completed' && chatMessage.status !== 'failed') {
        await supabaseAdmin
          .from('chat_messages')
          .update({
            status: 'failed',
            error_msg: 'A geração do vídeo falhou.'
          })
          .eq('id', chatMessage.id)

        // Refund credits
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', chatMessage.user_id)
          .single()

        if (profile) {
          const costMatch = (chatMessage.external_id || '').match(/cost:(\d+)/);
          const refundAmount = costMatch ? parseInt(costMatch[1]) : 20;

          await supabaseAdmin
            .from('profiles')
            .update({
              credit_used: Math.max(0, profile.credit_used - refundAmount)
            })
            .eq('id', chatMessage.user_id)
        }
        const logCostMatchMsg = (chatMessage.external_id || '').match(/cost:(\d+)/);
        const logRefundAmountMsg = logCostMatchMsg ? parseInt(logCostMatchMsg[1]) : 20;
        console.log(`Webhook: Chat message ${chatMessage.id} video generation failed. Refunding ${logRefundAmountMsg} credits.`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Erro interno no processamento do webhook' }, { status: 500 })
  }
}
