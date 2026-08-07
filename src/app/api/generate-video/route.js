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
    const { prompt, model, aspect_ratio, resolution, duration, ref_image, extendVideoId } = body

    console.log("Prompt recebido:", prompt)
    console.log(`[GENERATE-VIDEO] Request from user=${user.id}`)
    console.log(`[GENERATE-VIDEO] Params: model=${model}, aspect_ratio=${aspect_ratio}, resolution=${resolution}, duration=${duration}, extendVideoId=${extendVideoId}`)

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'O prompt é obrigatório' }, { status: 400 })
    }

    // Process reference image if present
    let uploadedRefImageUrl = null
    if (ref_image) {
      try {
        if (ref_image.startsWith('data:')) {
          uploadedRefImageUrl = await uploadBase64ToSupabase(ref_image)
          console.log(`[GENERATE-VIDEO] Uploaded reference image to Storage: ${uploadedRefImageUrl}`)
        } else {
          uploadedRefImageUrl = ref_image
        }
      } catch (uploadErr) {
        console.error('[GENERATE-VIDEO] Failed to upload reference image:', uploadErr.message)
        return NextResponse.json({ error: 'Falha ao processar imagem de referência.' }, { status: 500 })
      }
    }

    let videoCost = 20
    if (model && model.toLowerCase().includes('veo')) {
      videoCost = 18;
    } else {
      // Grok
      if (resolution === '720p') {
        if (String(duration) === '6') videoCost = 80;
        else if (String(duration) === '10') videoCost = 105;
        else videoCost = 80;
      } else {
        // 480p
        if (String(duration) === '6') videoCost = 55;
        else if (String(duration) === '10') videoCost = 80;
        else videoCost = 55;
      }
    }

    // 2. Validate plan tools and limits
    const planValidation = await validatePlanLimits(user.id, model || 'grok-3')
    if (!planValidation.allowed) {
      return NextResponse.json({ error: planValidation.error }, { status: 403 })
    }
    const profile = planValidation.profile
    const supabaseAdmin = createAdminClient()

    const isAdminUser = profile.email === 'gabrieljesus2030@gmail.com'
    const availableCredits = isAdminUser ? 999999 : (profile.credit_limit - profile.credit_used)
    console.log(`[GENERATE-VIDEO] Credits: available=${availableCredits}, cost=${videoCost}, isAdminUser=${isAdminUser}`)

    if (!isAdminUser && availableCredits < videoCost) {
      return NextResponse.json(
        { error: `Saldo de créditos insuficiente. Você tem ${availableCredits} créditos, mas são necessários ${videoCost}.` },
        { status: 400 }
      )
    }

    // 3. Deduct credits
    if (!isAdminUser) {
      const { error: deductError } = await supabaseAdmin
        .from('profiles')
        .update({ credit_used: profile.credit_used + videoCost })
        .eq('id', user.id)

      if (deductError) {
        console.error('[GENERATE-VIDEO] Credit deduction error:', deductError)
        return NextResponse.json({ error: 'Falha ao processar créditos' }, { status: 500 })
      }
    }

    // 4. Trigger external generation
    const apiKey = process.env.GEMINIGEN_API_KEY
    const reapiApiKey = process.env.REAPI_API_KEY
    const modelName = model || 'grok-3'
    const isGrok = modelName.toLowerCase().includes('grok')
    const isVeo = modelName.toLowerCase().includes('veo')
    const isExtend = !!extendVideoId
    let endpoint = 'https://api.snapgen.ai/uapi/v1/video-gen/grok';
    if (isExtend) {
      endpoint = isVeo ? 'https://api.snapgen.ai/uapi/v1/video-extend/veo' : 'https://api.snapgen.ai/uapi/v1/video-extend/grok';
    } else {
      endpoint = isVeo ? 'https://api.snapgen.ai/uapi/v1/video-gen/veo' : 'https://api.snapgen.ai/uapi/v1/video-gen/grok';
    }

    console.log(`[GENERATE-VIDEO] Endpoint: ${endpoint}, isGrok=${isGrok}, isVeo=${isVeo}, isExtend=${isExtend}`)

    let externalId = null
    let status = 'processing'
    let isMock = false
    let apiErrorMsg = null

    if (isGrok && !reapiApiKey) {
      if (!isAdminUser) {
        await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
      }
      return NextResponse.json({ error: 'Erro: A chave de API (REAPI_API_KEY) não está configurada no servidor.' }, { status: 500 })
    } else if (!isGrok && !apiKey) {
      if (!isAdminUser) {
        await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
      }
      return NextResponse.json({ error: 'Erro: A chave de API (GEMINIGEN_API_KEY) não está configurada no servidor.' }, { status: 500 })
    } else {
      try {
        let apiResponse;
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 55000)

        if (isGrok) {
          const callBackUrl = process.env.NEXT_PUBLIC_SITE_URL 
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/video`
            : `https://${request.headers.get('host')}/api/webhook/video`;

          let mappedAspectRatio = aspect_ratio || '16:9';
          if (mappedAspectRatio === 'landscape') mappedAspectRatio = '16:9';
          else if (mappedAspectRatio === 'portrait') mappedAspectRatio = '9:16';
          else if (mappedAspectRatio === 'square') mappedAspectRatio = '1:1';
          else if (mappedAspectRatio === 'vertical') mappedAspectRatio = '2:3';
          else if (mappedAspectRatio === 'horizontal') mappedAspectRatio = '3:2';

          let payload = {};

          if (isGrok) {
            if (isExtend) {
              return NextResponse.json({ error: 'Extensão de vídeo não é suportada para o modelo Grok atualmente.' }, { status: 400 });
            }
            
            let reapiSize = '16:9';
            if (mappedAspectRatio === '9:16' || mappedAspectRatio === 'vertical') reapiSize = '9:16';
            else if (mappedAspectRatio === '1:1' || mappedAspectRatio === 'square') reapiSize = '1:1';
            else if (mappedAspectRatio === '3:2' || mappedAspectRatio === 'horizontal') reapiSize = '3:2';
            else if (mappedAspectRatio === '2:3') reapiSize = '2:3';

            payload = {
              model: "grok-imagine-1.0-video",
              prompt: prompt,
              size: reapiSize,
              duration: parseInt(duration) || 6,
              quality: resolution === '720p' ? '720p' : '480p'
            };
            
            if (uploadedRefImageUrl) {
              payload.image_urls = [uploadedRefImageUrl];
            }

            console.log(`[GENERATE-VIDEO] Sending Request to reapi.ai (Grok)`);
            apiResponse = await fetch('https://reapi.ai/api/v1/videos/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${reapiApiKey}`
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          }
        } else {
          const formData = new FormData()
          formData.append('prompt', prompt)
          
          if (isExtend) {
            const actualExtendId = extendVideoId.includes('|id:') ? extendVideoId.split('|id:')[1] : extendVideoId;
            formData.append('ref_history', actualExtendId)
            console.log(`[GENERATE-VIDEO] Sending FormData (EXTEND): ref_history=${actualExtendId}`)
          } else {
            let mappedAspectRatio = aspect_ratio || 'landscape';
            if (isVeo) {
              if (mappedAspectRatio === 'landscape') mappedAspectRatio = '16:9';
              else if (mappedAspectRatio === 'portrait' || mappedAspectRatio === 'vertical') mappedAspectRatio = '9:16';
              else if (mappedAspectRatio === 'square') mappedAspectRatio = '1:1';
              else if (mappedAspectRatio !== '9:16' && mappedAspectRatio !== '16:9') mappedAspectRatio = '16:9';
            }

            formData.append('model', modelName)
            formData.append('resolution', resolution || '480p')
            formData.append('aspect_ratio', mappedAspectRatio)
            formData.append('duration', duration || '10')
            formData.append('mode', 'custom')

            if (uploadedRefImageUrl) {
              if (isVeo) {
                formData.append('ref_images', uploadedRefImageUrl)
                formData.append('mode_image', 'frame')
              } else {
                formData.append('file_urls', uploadedRefImageUrl)
              }
            }
            console.log(`[GENERATE-VIDEO] Sending FormData: model=${modelName}, resolution=${resolution || '480p'}, aspect=${mappedAspectRatio}, duration=${duration || '10'}, hasRefImage=${!!uploadedRefImageUrl}`)
          }

          console.log("API iniciando")

          apiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
            },
            body: formData,
            signal: controller.signal,
          })
        }
        
        clearTimeout(timeoutId)

        const responseText = await apiResponse.text()
        console.log("Resposta API:", responseText)

        if (apiResponse.ok) {
          try {
            const apiData = JSON.parse(responseText)
            if (isGrok) {
              externalId = apiData.id;
            } else {
              externalId = apiData.uuid
            }
            console.log(`[GENERATE-VIDEO] Success! externalId=${externalId}`)
          } catch (parseErr) {
            console.error(`[GENERATE-VIDEO] JSON parse error:`, parseErr.message)
            // Refund credits
            if (!isAdminUser) {
              await supabaseAdmin.from('profiles').update({ credit_used: profile.credit_used }).eq('id', user.id)
            }
            return NextResponse.json({ error: 'Resposta inválida da API externa (JSON inválido)' }, { status: 500 })
          }
        } else {
          console.error(`[GENERATE-VIDEO] API error: ${apiResponse.status}`)
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
          console.error('[GENERATE-VIDEO] Request TIMEOUT after 55s')
          return NextResponse.json({ error: 'Timeout: a API externa de vídeo não respondeu' }, { status: 504 })
        } else {
          console.error('[GENERATE-VIDEO] Connection error:', apiErr.message)
          return NextResponse.json({ error: `Erro de conexão com a API externa: ${apiErr.message}` }, { status: 500 })
        }
      }
    }

    // 5. Create generation record in database
    const { data: generation, error: dbError } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'video',
        prompt,
        status,
        external_id: externalId,
        model_name: modelName,
        aspect_ratio: aspect_ratio || '16:9',
      })
      .select()
      .single()

    if (dbError) {
      console.error('[GENERATE-VIDEO] DB insert error:', dbError)
      // Refund credits in case DB insert fails
      if (!isAdminUser) {
        await supabaseAdmin
          .from('profiles')
          .update({ credit_used: profile.credit_used })
          .eq('id', user.id)
      }

      return NextResponse.json({ error: 'Erro ao salvar registro de geração' }, { status: 500 })
    }

    console.log(`[GENERATE-VIDEO] Complete! generation.id=${generation.id}, externalId=${externalId}, isMock=${isMock}`)

    return NextResponse.json({
      success: true,
      generation,
      is_mock: isMock,
      apiError: apiErrorMsg,
    })
  } catch (error) {
    console.error('[GENERATE-VIDEO] Fatal error:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
