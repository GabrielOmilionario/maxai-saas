import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadRemoteUrlToSupabase, uploadBase64ToSupabase } from '@/lib/supabase/storage'
import { validatePlanLimits } from '@/lib/plans'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const maxDuration = 60;

const MOCK_VIDEOS = [
  'https://cdn.pixabay.com/video/2021/04/17/71360-539606822_large.mp4',
  'https://cdn.pixabay.com/video/2020/09/24/51048-463870876_large.mp4',
  'https://cdn.pixabay.com/video/2021/10/11/91629-617865249_large.mp4'
]

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'
]

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Falta o sessionId' }, { status: 400 })
    }

    // Retrieve all messages for the session
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[MESSAGES-GET] Error fetching messages:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Identify active generation messages to sync on the fly
    const activeMessages = messages.filter(
      (msg) => msg.role === 'assistant' && (msg.status === 'pending' || msg.status === 'processing')
    )

    if (activeMessages.length > 0) {
      console.log(`[POLL] Found ${activeMessages.length} active messages to check`)
      const supabaseAdmin = createAdminClient()

      for (const msg of activeMessages) {
        try {
          console.log(`[POLL] Checking msg=${msg.id}, external_id=${msg.external_id}, model=${msg.model_name}, status=${msg.status}`)

          if (msg.external_id && (msg.external_id.startsWith('mock-') || msg.external_id.includes('|id:mock-'))) {
            // Check if 10 seconds have elapsed since creation to simulate completion
            const createdAtTime = new Date(msg.created_at).getTime()
            const nowTime = Date.now()
            if (nowTime - createdAtTime > 10000) {
              const isVideo = msg.model_name?.includes('grok') || msg.model_name?.includes('veo')
              const mockList = isVideo ? MOCK_VIDEOS : MOCK_IMAGES
              const mockUrl = mockList[Math.floor(Math.random() * mockList.length)]
              const mediaType = isVideo ? 'video' : 'image'

              console.log(`[POLL-MOCK] Completing mock msg=${msg.id} as ${mediaType} with url=${mockUrl.substring(0, 60)}...`)

              // Update message
              await supabaseAdmin
                .from('chat_messages')
                .update({
                  status: 'completed',
                  media_url: mockUrl,
                  media_type: mediaType
                })
                .eq('id', msg.id)

              // Update locally referenced item in returned array
              msg.status = 'completed'
              msg.media_url = mockUrl
              msg.media_type = mediaType

              // Insert also in gallery generations for compatibility
              const promptText = messages.find(m => m.role === 'user' && m.created_at < msg.created_at)?.text || 'Prompt'
              await supabaseAdmin.from('generations').insert({
                user_id: user.id,
                type: mediaType,
                prompt: promptText,
                status: 'completed',
                result_url: mockUrl,
                external_id: msg.external_id,
                model_name: msg.model_name
              })
            } else {
              console.log(`[POLL-MOCK] Waiting for mock timeout: ${Math.round((10000 - (nowTime - createdAtTime)) / 1000)}s remaining`)
            }
          } else {
            const isGeminiGenVideo = msg.model_name?.includes('grok') || msg.model_name?.includes('veo')
            if (isGeminiGenVideo) {
              // Video generation status check (GeminiGen.ai)
              const apiKey = process.env.GEMINIGEN_API_KEY
              if (apiKey && msg.external_id) {
                const costMatch = msg.external_id.match(/cost:(\d+)/);
                const refundAmount = costMatch ? parseInt(costMatch[1]) : 20;
                const realExternalId = msg.external_id.includes('|id:') ? msg.external_id.split('|id:')[1] : msg.external_id;

                const pollUrl = `https://api.snapgen.ai/uapi/v1/history/${realExternalId}`
                console.log(`[POLL-VIDEO] Checking status at: ${pollUrl}`)

                const res = await fetch(pollUrl, {
                  headers: { 'x-api-key': apiKey },
                })

                const resText = await res.text()
                console.log(`[POLL-VIDEO] Response status=${res.status}, body=${resText.substring(0, 500)}`)

                if (res.ok) {
                  let data
                  try {
                    data = JSON.parse(resText)
                  } catch (parseErr) {
                    console.error(`[POLL-VIDEO] Failed to parse response JSON:`, parseErr.message)
                    continue
                  }

                  const taskData = data.data || data
                  const statusVal = taskData.status
                  let videoUrlVal = taskData.video_url || taskData.url || taskData.result_url || taskData.result
                  if (!videoUrlVal && taskData.generated_video && taskData.generated_video.length > 0) {
                    videoUrlVal = taskData.generated_video[0].video_url || taskData.generated_video[0].url
                  }

                  console.log(`[POLL-VIDEO] Generation status=${statusVal} for external_id=${msg.external_id}`)

                  const isCompleted = statusVal === 2 || statusVal === '2' || statusVal === 'completed' || statusVal === 'success'
                  const isFailed = statusVal === 3 || statusVal === '3' || statusVal === 'failed' || statusVal === 'fail'

                  if (isCompleted) {
                    let finalUrl = videoUrlVal
                    console.log(`[POLL-VIDEO] Video ready! URL=${finalUrl?.substring(0, 80)}...`)

                    if (finalUrl) {
                      finalUrl = await uploadRemoteUrlToSupabase(finalUrl, 'video')
                      console.log(`[POLL-VIDEO] Uploaded to Supabase: ${finalUrl?.substring(0, 80)}...`)

                      await supabaseAdmin
                        .from('chat_messages')
                        .update({
                          status: 'completed',
                          media_url: finalUrl,
                          media_type: 'video'
                        })
                        .eq('id', msg.id)

                      msg.status = 'completed'
                      msg.media_url = finalUrl
                      msg.media_type = 'video'

                      // Add to gallery generations
                      const promptText = messages.find(m => m.role === 'user' && m.created_at < msg.created_at)?.text || 'Prompt'
                      await supabaseAdmin.from('generations').insert({
                        user_id: user.id,
                        type: 'video',
                        prompt: promptText,
                        status: 'completed',
                        result_url: finalUrl,
                        external_id: msg.external_id,
                        model_name: msg.model_name
                      })
                    }
                  } else if (isFailed) {
                    console.warn(`[POLL-VIDEO] Generation FAILED for external_id=${msg.external_id}`)
                    // Fail and refund 20 credits
                    await supabaseAdmin
                      .from('chat_messages')
                      .update({ status: 'failed', error_msg: taskData.message || 'A geração do vídeo falhou.' })
                      .eq('id', msg.id)

                    const { data: profile } = await supabaseAdmin
                      .from('profiles')
                      .select('*')
                      .eq('id', user.id)
                      .single()

                    if (profile && profile.email !== 'gabrieljesus2030@gmail.com') {
                      await supabaseAdmin
                        .from('profiles')
                        .update({ credit_used: Math.max(0, profile.credit_used - refundAmount) })
                        .eq('id', user.id)
                      console.log(`[POLL-VIDEO] Refunded ${refundAmount} credits to user ${user.id}`)
                    }

                    msg.status = 'failed'
                    msg.error_msg = taskData.message || 'A geração do vídeo falhou.'
                  } else {
                    console.log(`[POLL-VIDEO] Still processing: status=${statusVal}`)
                  }
                } else {
                  console.error(`[POLL-VIDEO] API returned error status=${res.status}`)
                }
              } else {
                console.warn(`[POLL-VIDEO] Skipping - apiKey=${!!apiKey}, external_id=${msg.external_id}`)
              }
            } else {
              // Image generation status check (KIE AI)
              const apiKey = process.env.KIE_API_KEY
              if (apiKey && msg.external_id) {
                const costMatch = msg.external_id.match(/cost:(\d+)/);
                const refundAmount = costMatch ? parseInt(costMatch[1]) : 20;
                const realExternalId = msg.external_id.includes('|id:') ? msg.external_id.split('|id:')[1] : msg.external_id;

                const pollUrl = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${realExternalId}`
                console.log(`[POLL-IMAGE] Checking status at: ${pollUrl}`)

                const res = await fetch(pollUrl, {
                  headers: { 'Authorization': `Bearer ${apiKey}` },
                })

                const resText = await res.text()
                console.log(`[POLL-IMAGE] Response status=${res.status}, body=${resText.substring(0, 500)}`)

                if (res.ok) {
                  let apiRes
                  try {
                    apiRes = JSON.parse(resText)
                  } catch (parseErr) {
                    console.error(`[POLL-IMAGE] Failed to parse response JSON:`, parseErr.message)
                    continue
                  }

                  const taskData = apiRes.data || apiRes
                  console.log(`[POLL-IMAGE] Task state=${taskData.state} for external_id=${msg.external_id}`)
                  
                  if (taskData.state === 'success') {
                    const getResultUrl = (td) => {
                      if (td.resultUrls && td.resultUrls.length > 0) return td.resultUrls[0]
                      if (td.result?.resultUrls && td.result.resultUrls.length > 0) return td.result.resultUrls[0]
                      if (td.resultJson) {
                        try {
                          const parsed = typeof td.resultJson === 'string' ? JSON.parse(td.resultJson) : td.resultJson
                          if (parsed?.resultUrls?.length > 0) return parsed.resultUrls[0]
                        } catch (e) {}
                      }
                      return null
                    }

                    let finalUrl = getResultUrl(taskData)
                    console.log(`[POLL-IMAGE] Image ready! URL=${finalUrl?.substring(0, 80)}...`)

                    if (finalUrl) {
                      const mediaType = msg.model_name?.includes('seedance') ? 'video' : 'image'
                      finalUrl = await uploadRemoteUrlToSupabase(finalUrl, mediaType)
                      console.log(`[POLL-IMAGE] Uploaded to Supabase: ${finalUrl?.substring(0, 80)}...`)

                      await supabaseAdmin
                        .from('chat_messages')
                        .update({
                          status: 'completed',
                          media_url: finalUrl,
                          media_type: mediaType
                        })
                        .eq('id', msg.id)

                      msg.status = 'completed'
                      msg.media_url = finalUrl
                      msg.media_type = mediaType

                      // Add to gallery generations
                      const promptText = messages.find(m => m.role === 'user' && m.created_at < msg.created_at)?.text || 'Prompt'
                      await supabaseAdmin.from('generations').insert({
                        user_id: user.id,
                        type: mediaType,
                        prompt: promptText,
                        status: 'completed',
                        result_url: finalUrl,
                        external_id: msg.external_id,
                        model_name: msg.model_name
                      })
                    } else {
                      console.warn(`[POLL-IMAGE] Task succeeded but no result URL found in response`)
                    }
                  } else if (taskData.state === 'fail') {
                    console.warn(`[POLL-IMAGE] Generation FAILED for external_id=${msg.external_id}`)
                    // Fail and refund 20 credits
                    await supabaseAdmin
                      .from('chat_messages')
                      .update({ status: 'failed', error_msg: taskData.message || 'A geração da imagem falhou.' })
                      .eq('id', msg.id)

                    const { data: profile } = await supabaseAdmin
                      .from('profiles')
                      .select('*')
                      .eq('id', user.id)
                      .single()

                    if (profile && profile.email !== 'gabrieljesus2030@gmail.com') {
                      await supabaseAdmin
                        .from('profiles')
                        .update({ credit_used: Math.max(0, profile.credit_used - refundAmount) })
                        .eq('id', user.id)
                      console.log(`[POLL-IMAGE] Refunded ${refundAmount} credits to user ${user.id}`)
                    }

                    msg.status = 'failed'
                    msg.error_msg = taskData.message || 'A geração da imagem falhou.'
                  } else {
                    console.log(`[POLL-IMAGE] Still processing: state=${taskData.state}`)
                  }
                } else {
                  console.error(`[POLL-IMAGE] API returned error status=${res.status}`)
                }
              } else {
                console.warn(`[POLL-IMAGE] Skipping - apiKey=${!!apiKey}, external_id=${msg.external_id}`)
              }
            }
          }
        } catch (syncErr) {
          console.error(`[POLL-ERROR] Sync error for chat message ${msg.id}:`, syncErr.message)
        }
      }
    }

    return NextResponse.json(messages || [])
  } catch (err) {
    console.error('[MESSAGES-GET] Fatal error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, text, model, attachments, aspectRatio, resolution, duration, mode, extendVideoId } = body

    console.log(`[MESSAGES-POST] New request: model=${model}, sessionId=${sessionId}, prompt="${text?.substring(0, 50)}..."`)

    if (!sessionId || !text) {
      return NextResponse.json({ error: 'sessionId e prompt são obrigatórios' }, { status: 400 })
    }

    const modelName = model || 'grok-3'
    const isVideo = modelName.includes('grok') || modelName.includes('veo') || modelName.includes('seedance')
    let cost = 25 // default for image (GPT Image-2)
    if (isVideo) {
      if (modelName.includes('seedance')) {
        const durationSeconds = Number(duration) || 5;
        const hasImage = attachments && attachments.length > 0;
        if (resolution === '720p') {
          cost = (hasImage ? 85 : 140) * durationSeconds;
        } else {
          cost = (hasImage ? 40 : 65) * durationSeconds;
        }
      } else if (modelName.includes('veo')) {
        cost = 18
      } else {
        // Grok
        const dur = String(duration)
        if (resolution === '720p') {
          if (dur === '6') cost = 80
          else if (dur === '10') cost = 105
          else if (dur === '15') cost = 130
          else cost = 80
        } else {
          // 480p
          if (dur === '6') cost = 55
          else if (dur === '10') cost = 80
          else if (dur === '15') cost = 105
          else cost = 55
        }
      }
    }

    console.log(`[MESSAGES-POST] Resolved: modelName=${modelName}, isVideo=${isVideo}, cost=${cost}`)

    // 1. Validate plan tools and limits
    const planValidation = await validatePlanLimits(user.id, modelName)
    if (!planValidation.allowed) {
      return NextResponse.json({ error: planValidation.error }, { status: 403 })
    }
    const profile = planValidation.profile
    const supabaseAdmin = createAdminClient()

    const isAdminUser = profile.email === 'gabrieljesus2030@gmail.com'
    const availableCredits = isAdminUser ? 999999 : (profile.credit_limit - profile.credit_used)
    console.log(`[MESSAGES-POST] Credits: available=${availableCredits}, needed=${cost}, isAdminUser=${isAdminUser}`)

    if (!isAdminUser && availableCredits < cost) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Créditos necessários: ${cost}, você possui: ${availableCredits}` },
        { status: 400 }
      )
    }

    // 2. Deduct credits
    if (!isAdminUser) {
      const { error: deductError } = await supabaseAdmin
        .from('profiles')
        .update({ credit_used: profile.credit_used + cost })
        .eq('id', user.id)

      if (deductError) {
        console.error('[MESSAGES-POST] Deduct error:', deductError)
        return NextResponse.json({ error: 'Erro ao processar créditos' }, { status: 500 })
      }
    }

    // Process attachments to upload base64 images to Supabase Storage
    const processedAttachments = []
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att && att.startsWith('data:')) {
          const uploadedUrl = await uploadBase64ToSupabase(att)
          processedAttachments.push(uploadedUrl)
        } else if (att) {
          processedAttachments.push(att)
        }
      }
    }

    // 3. Save User Message
    const userMsgId = 'msg-' + crypto.randomBytes(8).toString('hex')
    const { data: userMsg, error: uMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        id: userMsgId,
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        text: text,
        attachments: processedAttachments
      })
      .select()
      .single()

    if (uMsgError) {
      console.error('[MESSAGES-POST] User message insert error:', uMsgError)
      // Refund credits
      if (!isAdminUser) {
        await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
      }
      return NextResponse.json({ error: 'Erro ao salvar mensagem' }, { status: 500 })
    }

    // Update Session updated_at and potentially first title
    const { data: currentSession } = await supabaseAdmin.from('chat_sessions').select('*').eq('id', sessionId).single()
    const updatePayload = { updated_at: new Date().toISOString() }
    if (currentSession && currentSession.title === 'Nova Conversa') {
      updatePayload.title = text.substring(0, 30) + (text.length > 30 ? '...' : '')
    }
    await supabaseAdmin.from('chat_sessions').update(updatePayload).eq('id', sessionId)

    // 4. Invoke API based on model type
    let externalId = null
    let isMock = false
    let apiErrorMsg = null

    if (modelName.includes('grok') || modelName.includes('veo')) {
      // Call GeminiGen.ai Video API
      const apiKey = process.env.GEMINIGEN_API_KEY
      const isVeo = modelName.includes('veo')
      const isExtend = !!extendVideoId
      let endpoint
      if (isExtend) {
        endpoint = isVeo ? 'https://api.snapgen.ai/uapi/v1/video-extend/veo' : 'https://api.snapgen.ai/uapi/v1/video-extend/grok'
      } else {
        endpoint = isVeo ? 'https://api.snapgen.ai/uapi/v1/video-gen/veo' : 'https://api.snapgen.ai/uapi/v1/video-gen/grok'
      }

      console.log(`[VIDEO-GEN] Endpoint: ${endpoint}, isVeo=${isVeo}, isExtend=${isExtend}`)
      console.log(`[VIDEO-GEN] API Key present: ${!!apiKey}`)

      if (!apiKey) {
        if (!isAdminUser) {
          await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
        }
        return NextResponse.json({ error: 'Erro: A chave de API (GEMINIGEN_API_KEY) não está configurada no servidor.' }, { status: 500 })
      } else {
        try {
          const formData = new FormData()
          formData.append('prompt', text)
          
          if (isExtend) {
            const actualExtendId = extendVideoId.includes('|id:') ? extendVideoId.split('|id:')[1] : extendVideoId;
            formData.append('ref_history', actualExtendId)
            console.log(`[VIDEO-GEN] Payload (EXTEND): prompt="${text.substring(0, 50)}...", ref_history=${actualExtendId}`)
          } else {
            // Map aspect ratio for Veo (needs 16:9 / 9:16 format)
            let mappedAspectRatio = aspectRatio || 'landscape'
            if (isVeo) {
              if (mappedAspectRatio === 'landscape') mappedAspectRatio = '16:9'
              else if (mappedAspectRatio === 'portrait' || mappedAspectRatio === 'vertical') mappedAspectRatio = '9:16'
              else if (mappedAspectRatio === 'square') mappedAspectRatio = '1:1'
              else if (mappedAspectRatio !== '9:16' && mappedAspectRatio !== '16:9') mappedAspectRatio = '16:9'
            }

            formData.append('model', modelName)
            formData.append('resolution', resolution || (isVeo ? '720p' : '480p'))
            formData.append('aspect_ratio', mappedAspectRatio)
            formData.append('duration', duration ? String(duration) : (isVeo ? '6' : '10'))
            if (!isVeo) formData.append('mode', mode || 'custom')

            // Reference image
            if (processedAttachments && processedAttachments.length > 0) {
              if (isVeo) {
                formData.append('ref_images', processedAttachments[0])
                formData.append('mode_image', 'frame')
              } else {
                formData.append('file_urls', processedAttachments[0])
              }
            }
            console.log(`[VIDEO-GEN] Payload: prompt="${text.substring(0, 50)}...", model=${modelName}, resolution=${resolution || (isVeo ? '720p' : '480p')}, aspect_ratio=${mappedAspectRatio}, duration=${duration || (isVeo ? '6' : '10')}, hasRefImage=${processedAttachments.length > 0}`)
          }

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 45000)

          const apiRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'x-api-key': apiKey },
            body: formData,
            signal: controller.signal
          })
          clearTimeout(timeoutId)

          const responseText = await apiRes.text()
          console.log(`[VIDEO-GEN] Response: status=${apiRes.status}, body=${responseText.substring(0, 500)}`)

          if (apiRes.ok) {
            try {
              const data = JSON.parse(responseText)
              externalId = data.uuid
              console.log(`[VIDEO-GEN] Success! externalId=${externalId}`)
            } catch (parseErr) {
              console.error(`[VIDEO-GEN] Failed to parse success response:`, parseErr.message)
              if (!isAdminUser) {
                await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
              }
              return NextResponse.json({ error: 'Resposta inválida da API de vídeo (JSON inválido)' }, { status: 500 })
            }
          } else {
            console.error(`[VIDEO-GEN] API error: status=${apiRes.status}, body=${responseText.substring(0, 300)}`)
            if (!isAdminUser) {
              await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
            }
            return NextResponse.json({ error: `Erro na API de vídeo (${apiRes.status}): ${responseText.substring(0, 200)}` }, { status: apiRes.status })
          }
        } catch (err) {
          if (!isAdminUser) {
            await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
          }
          if (err.name === 'AbortError') {
            console.error(`[VIDEO-GEN] Request TIMEOUT after 45s`)
            return NextResponse.json({ error: 'Timeout: a API de vídeo não respondeu em 45 segundos' }, { status: 504 })
          } else {
            console.error(`[VIDEO-GEN] Connection error:`, err.message)
            return NextResponse.json({ error: `Erro de conexão com a API de vídeo: ${err.message}` }, { status: 500 })
          }
        }
      }
    } else {
      // Call KIE AI Image API
      const apiKey = process.env.KIE_API_KEY
      console.log(`[IMAGE-GEN] API Key present: ${!!apiKey}`)

      if (!apiKey) {
        externalId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        isMock = true
        console.log(`[IMAGE-GEN] No API key — using mock mode, externalId=${externalId}`)
      } else {
        try {
          const hasImage = processedAttachments && processedAttachments.length > 0
          
          let payload;
          if (modelName.includes('seedance')) {
            payload = {
              model: "bytedance/seedance-2-fast",
              input: {
                prompt: text,
                resolution: resolution || '720p',
                aspect_ratio: aspectRatio || '16:9',
                duration: parseInt(duration) || 5,
                ...(hasImage && { reference_image_urls: [processedAttachments[0]] })
              }
            }
          } else {
            payload = {
              model: hasImage ? 'gpt-image-2-image-to-image' : 'gpt-image-2-text-to-image',
              input: {
                prompt: text,
                aspect_ratio: 'auto',
                ...(hasImage && { input_urls: processedAttachments })
              }
            }
          }

          console.log(`[IMAGE-GEN] Endpoint: https://api.kie.ai/api/v1/jobs/createTask`)
          console.log(`[IMAGE-GEN] Payload:`, JSON.stringify(payload))

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 35000)

          const apiRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          })
          clearTimeout(timeoutId)

          const responseText = await apiRes.text()
          console.log(`[IMAGE-GEN] Response: status=${apiRes.status}, body=${responseText.substring(0, 500)}`)

          if (apiRes.ok) {
            try {
              const data = JSON.parse(responseText)
              const taskData = data.data || data
              externalId = taskData.taskId || taskData.task_id
              console.log(`[IMAGE-GEN] Success! externalId=${externalId}`)

              if (!externalId) {
                console.error('[IMAGE-GEN] No taskId found in response:', JSON.stringify(data))
                apiErrorMsg = 'API retornou sucesso mas sem taskId'
                externalId = `mock-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
                isMock = true
              }
            } catch (parseErr) {
              console.error(`[IMAGE-GEN] Failed to parse success response:`, parseErr.message)
              apiErrorMsg = 'Resposta inválida da API de imagem'
              externalId = `mock-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
              isMock = true
            }
          } else {
            console.error(`[IMAGE-GEN] API error: status=${apiRes.status}, body=${responseText.substring(0, 300)}`)
            apiErrorMsg = `API de imagem retornou erro ${apiRes.status}: ${responseText.substring(0, 200)}`
            externalId = `mock-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
            isMock = true
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.error(`[IMAGE-GEN] Request TIMEOUT after 35s`)
            apiErrorMsg = 'Timeout: a API de imagem não respondeu em 35 segundos'
          } else {
            console.error(`[IMAGE-GEN] Connection error:`, err.message)
            apiErrorMsg = `Erro de conexão com a API de imagem: ${err.message}`
          }
          externalId = `mock-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
          isMock = true
        }
      }
    }

    // 5. Save Assistant Message
    const assistantMsgId = 'msg-' + crypto.randomBytes(8).toString('hex')
    const { data: assistantMsg, error: aMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        id: assistantMsgId,
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        text: '',
        status: 'processing',
        model_name: modelName,
        external_id: externalId ? `cost:${cost}|id:${externalId}` : null
      })
      .select()
      .single()

    if (aMsgError) {
      console.error('[MESSAGES-POST] Assistant message insert error:', aMsgError)
      return NextResponse.json({ error: 'Erro ao criar mensagem do assistente' }, { status: 500 })
    }

    console.log(`[MESSAGES-POST] Complete! userMsg=${userMsgId}, assistantMsg=${assistantMsgId}, externalId=${externalId}, isMock=${isMock}`)

    return NextResponse.json({
      userMsg,
      assistantMsg,
      isMock,
      apiError: apiErrorMsg
    })
  } catch (error) {
    console.error('[MESSAGES-POST] Fatal error:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
