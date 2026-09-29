import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadRemoteUrlToSupabase } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'

// Mock assets for simulation completion
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

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Fetch all user's generations
    const { data: generations, error } = await supabase
      .from('generations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching generations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 3. Check for any active generations and sync them
    const activeGenerations = generations.filter(
      (gen) => gen.status === 'pending' || gen.status === 'processing'
    )

    if (activeGenerations.length > 0) {
      const supabaseAdmin = createAdminClient()

      for (const gen of activeGenerations) {
        try {
          if (gen.external_id && (gen.external_id.startsWith('mock-') || gen.external_id.includes('|id:mock-'))) {
            // Check if 10 seconds have elapsed since creation to simulate completion
            const createdAtTime = new Date(gen.created_at).getTime()
            const nowTime = Date.now()
            if (nowTime - createdAtTime > 10000) {
              const mockList = gen.type === 'video' ? MOCK_VIDEOS : MOCK_IMAGES
              const mockUrl = mockList[Math.floor(Math.random() * mockList.length)]

              await supabaseAdmin
                .from('generations')
                .update({ status: 'completed', result_url: mockUrl })
                .eq('id', gen.id)

              // Update locally referenced item in returned response array
              gen.status = 'completed'
              gen.result_url = mockUrl
            }
          } else if (gen.type === 'video' && gen.external_id && gen.external_id.startsWith('kling|')) {
            // ─── Kling 3.0 Motion Control Status Check ───────────────────────────────
            const klingApiKey = process.env.KLING_API_KEY
            if (klingApiKey) {
              const costMatch = gen.external_id.match(/cost:(\d+)/)
              const reservedCredits = costMatch ? parseInt(costMatch[1]) : 0
              const klingTaskId = gen.external_id.split('|id:')[1] || null

              if (!klingTaskId) {
                console.error(`[KLING-POLL] No task ID found in external_id=${gen.external_id}`)
              } else {
                try {
                  const klingBaseUrl = process.env.KLING_MOTION_API_BASE_URL || 'https://api-singapore.klingai.com'
                  const statusRes = await fetch(`${klingBaseUrl}/tasks?task_ids=${klingTaskId}`, {
                    headers: {
                      'Authorization': `Bearer ${klingApiKey}`,
                      'Content-Type': 'application/json',
                    },
                  })

                  if (statusRes.ok) {
                    const statusData = await statusRes.json()
                    const tasks = statusData?.data?.tasks || statusData?.tasks || []
                    const task = Array.isArray(tasks) ? tasks[0] : tasks

                    const taskStatus = task?.task_status || task?.status || ''
                    console.log(`[KLING-POLL] gen.id=${gen.id}, klingTaskId=${klingTaskId}, status=${taskStatus}`)

                    // ── Helper atômico para créditos (Optimistic Concurrency Control) ──
                    const atomicAdjustCredits = async (userId, diff, isCharge) => {
                      if (diff <= 0) return true
                      let attempts = 0
                      while (attempts < 3) {
                        const { data: pData } = await supabaseAdmin
                          .from('profiles')
                          .select('credit_used, credit_limit, email')
                          .eq('id', userId)
                          .single()
                        
                        if (!pData) return false
                        if (['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com'].includes(pData.email)) return true

                        let newUsed = pData.credit_used
                        if (isCharge) {
                          newUsed += diff
                          // Evita saldo negativo: se a cobrança estourar o limite, capamos no limite
                          if (newUsed > pData.credit_limit) newUsed = pData.credit_limit
                        } else {
                          newUsed = Math.max(0, newUsed - diff)
                        }

                        const { data: upData } = await supabaseAdmin
                          .from('profiles')
                          .update({ credit_used: newUsed })
                          .eq('id', userId)
                          .eq('credit_used', pData.credit_used) // Optimistic lock
                          .select('id')
                        
                        if (upData && upData.length > 0) return true
                        attempts++
                      }
                      return false
                    }

                    if (taskStatus === 'succeeded') {
                      // Localizar URL do vídeo nos outputs
                      const outputs = task?.task_result?.outputs || task?.outputs || []
                      const videoOutput = outputs.find(o => o.type === 'video')
                      let videoUrl = videoOutput?.url || null

                      if (!videoUrl && Array.isArray(outputs) && outputs.length > 0) {
                        videoUrl = outputs[0]?.url || null
                      }

                      if (videoUrl) {
                        // Obter duração real do output
                        const outputDurationSeconds = task?.task_result?.duration || task?.duration || null
                        const actualDuration = outputDurationSeconds ? Math.ceil(parseFloat(outputDurationSeconds)) : null

                        let finalCredits = reservedCredits
                        if (actualDuration) {
                          const { calculateKlingCredits } = await import('@/lib/kling-config')
                          finalCredits = calculateKlingCredits(gen.mode || 'standard', actualDuration)
                        }

                        // 1. Lock Atômico no Banco ANTES de baixar o vídeo (Evita duplicidade)
                        const { data: lockedRows, error: lockErr } = await supabaseAdmin
                          .from('generations')
                          .update({ status: 'uploading_result' })
                          .eq('id', gen.id)
                          .eq('status', 'processing') // Garante que fomos o primeiro
                          .select('id')

                        if (lockErr) {
                          console.error(`[KLING-POLL] Lock error for gen=${gen.id}:`, lockErr.message)
                        } else if (!lockedRows || lockedRows.length === 0) {
                          console.log(`[KLING-POLL] gen=${gen.id} lock perdido (já processado/baixando). Ignorado.`)
                        } else {
                          // 2. Este processo venceu. Baixar e arquivar vídeo.
                          let finalUrl = videoUrl
                          let uploadSuccess = false
                          try {
                            finalUrl = await uploadRemoteUrlToSupabase(videoUrl, 'video')
                            uploadSuccess = true
                          } catch (archiveErr) {
                            console.error('[KLING-POLL] Failed to archive video:', archiveErr.message)
                          }

                          if (!uploadSuccess) {
                            // Cenário G: Upload falhou. Reverter para failed e reembolsar para não entregar fantasma.
                            await supabaseAdmin
                              .from('generations')
                              .update({ status: 'failed', completed_at: new Date().toISOString() })
                              .eq('id', gen.id)
                            
                            if (reservedCredits > 0) {
                              await atomicAdjustCredits(gen.user_id, reservedCredits, false)
                            }
                            gen.status = 'failed'
                            console.log(`[KLING-POLL] Upload falhou. gen=${gen.id} alterado para failed e estornado.`)
                          } else {
                            // 3. Sucesso! Atualizar para completed.
                            await supabaseAdmin
                              .from('generations')
                              .update({
                                status: 'completed',
                                result_url: finalUrl,
                                credits_final: finalCredits,
                                duration_seconds: actualDuration || gen.duration_seconds,
                                completed_at: new Date().toISOString(),
                              })
                              .eq('id', gen.id)

                            // 4. Cobrar ou Reembolsar a diferença atomicamente
                            if (finalCredits < reservedCredits) {
                              const diff = reservedCredits - finalCredits
                              await atomicAdjustCredits(gen.user_id, diff, false)
                              console.log(`[KLING-POLL] Refunded ${diff} excess credits for gen=${gen.id}`)
                            } else if (finalCredits > reservedCredits) {
                              const diff = finalCredits - reservedCredits
                              await atomicAdjustCredits(gen.user_id, diff, true)
                              console.log(`[KLING-POLL] Charged additional ${diff} credits for gen=${gen.id}`)
                            }

                            gen.status = 'completed'
                            gen.result_url = finalUrl
                            console.log(`[KLING-POLL] Succeeded! gen.id=${gen.id}, finalCredits=${finalCredits}`)
                          }
                        }
                      }

                    } else if (taskStatus === 'failed') {
                      // Status Failed - Usa a mesma proteção lock
                      const { data: failedRows, error: failErr } = await supabaseAdmin
                        .from('generations')
                        .update({ status: 'failed', completed_at: new Date().toISOString() })
                        .eq('id', gen.id)
                        .eq('status', 'processing') // guard: só quem faz a transição de processing para failed pode reembolsar
                        .select('id')

                      if (failErr) {
                        console.error(`[KLING-POLL] Fail update error for gen=${gen.id}:`, failErr.message)
                      } else if (!failedRows || failedRows.length === 0) {
                        console.log(`[KLING-POLL] gen=${gen.id} falha já processada por outro polling (0 rows).`)
                      } else {
                        if (reservedCredits > 0) {
                          await atomicAdjustCredits(gen.user_id, reservedCredits, false)
                          console.log(`[KLING-POLL] Refunded ${reservedCredits} credits for failed gen=${gen.id}`)
                        }
                        gen.status = 'failed'
                      }
                    }
                    // submitted / processing: aguardar próximo polling
                  }
                } catch (klingPollErr) {
                  console.error(`[KLING-POLL] Error polling gen=${gen.id}:`, klingPollErr.message)
                }
              }
            }
            // ─── Fim Kling Status Check ───────────────────────────────────────────────

          } else if (gen.type === 'video') {
            // Live Video Status Check (GeminiGen.ai)
            const apiKey = process.env.GEMINIGEN_API_KEY
            if (apiKey && gen.external_id) {
              const costMatch = gen.external_id.match(/cost:(\d+)/);
              const refundAmount = costMatch ? parseInt(costMatch[1]) : 20;
              const realExternalId = gen.external_id.includes('|id:') ? gen.external_id.split('|id:')[1] : gen.external_id;

              const res = await fetch(`https://api.snapgen.ai/uapi/v1/history/${realExternalId}`, {
                headers: { 'x-api-key': apiKey },
              })

              if (res.ok) {
                const data = await res.json()
                const taskData = data.data || data
                const statusVal = taskData.status
                let videoUrlVal = taskData.video_url || taskData.url || taskData.result_url || taskData.result
                if (!videoUrlVal && taskData.generated_video && taskData.generated_video.length > 0) {
                  videoUrlVal = taskData.generated_video[0].video_url || taskData.generated_video[0].url
                }

                console.log(`[SYNC-GENERATION-VIDEO] Status for external_id=${gen.external_id} is statusVal=${statusVal}`)

                const isCompleted = statusVal === 2 || statusVal === '2' || statusVal === 'completed' || statusVal === 'success'
                const isFailed = statusVal === 3 || statusVal === '3' || statusVal === 'failed' || statusVal === 'fail'

                if (isCompleted) {
                  let finalUrl = videoUrlVal
                  if (finalUrl) {
                    // Archive to Supabase Storage
                    finalUrl = await uploadRemoteUrlToSupabase(finalUrl, 'video')
                    await supabaseAdmin
                      .from('generations')
                      .update({ status: 'completed', result_url: finalUrl })
                      .eq('id', gen.id)

                    gen.status = 'completed'
                    gen.result_url = finalUrl
                  }
                } else if (isFailed) {
                  // Failed -> Update DB and refund 20 credits
                  await supabaseAdmin
                    .from('generations')
                    .update({ status: 'failed' })
                    .eq('id', gen.id)

                  // Refund user credits
                  const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                  if (profile) {
                    await supabaseAdmin
                      .from('profiles')
                      .update({ credit_used: Math.max(0, profile.credit_used - refundAmount) })
                      .eq('id', user.id)
                  }

                  gen.status = 'failed'
                }
              }
            }
          } else if (gen.type === 'image') {
            // Live Image Status Check
            const isReapiImage = gen.model_name?.includes('gpt-image-2')
            const apiKey = isReapiImage ? process.env.REAPI_API_KEY : process.env.KIE_API_KEY
            if (apiKey && gen.external_id) {
              const costMatch = gen.external_id.match(/cost:(\d+)/);
              const refundAmount = costMatch ? parseInt(costMatch[1]) : 20;
              const realExternalId = gen.external_id.includes('|id:') ? gen.external_id.split('|id:')[1] : gen.external_id;

              const pollUrl = isReapiImage ? `https://reapi.ai/api/v1/tasks/${realExternalId}` : `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${realExternalId}`
              const res = await fetch(pollUrl, {
                headers: { 'Authorization': `Bearer ${apiKey}` },
              })

              if (res.ok) {
                const apiRes = await res.json()
                const taskData = isReapiImage ? apiRes : (apiRes.data || apiRes)
                const taskState = isReapiImage ? taskData.status : taskData.state
                
                const isSuccess = isReapiImage ? taskState === 'completed' : taskState === 'success'
                const isFail = isReapiImage ? taskState === 'failed' : taskState === 'fail'

                if (isSuccess) {
                  const getResultUrl = (td) => {
                    if (isReapiImage) return td.output?.image_urls?.[0] || null;
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
                  if (finalUrl) {
                    // Archive to Supabase
                    finalUrl = await uploadRemoteUrlToSupabase(finalUrl, 'image')
                    // Update DB with the file URL
                    await supabaseAdmin
                      .from('generations')
                      .update({
                        status: 'completed',
                        result_url: finalUrl
                      })
                      .eq('id', gen.id)

                    gen.status = 'completed'
                    gen.result_url = finalUrl
                  }
                } else if (isFail) {
                  console.log(`[GENERATIONS] Image failed for gen ${gen.id}`)
                  // Failed -> Update DB and refund 20 credits
                  await supabaseAdmin
                    .from('generations')
                    .update({ status: 'failed' })
                    .eq('id', gen.id)

                  // Refund user credits
                  const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                  if (profile) {
                    await supabaseAdmin
                      .from('profiles')
                      .update({ credit_used: Math.max(0, profile.credit_used - refundAmount) })
                      .eq('id', user.id)
                  }

                  gen.status = 'failed'
                }
              }
            }
          }
        } catch (syncErr) {
          console.error(`Error syncing generation ${gen.id}:`, syncErr)
        }
      }
    }

    return NextResponse.json(generations)
  } catch (err) {
    console.error('Generations fetch failed:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request) {
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

    // 2. Parse request query
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID da geração é obrigatório' }, { status: 400 })
    }

    // 3. Delete from DB using service role to bypass policies if needed,
    // but here we can just use the user client as it enforces their own records.
    const { error } = await supabase
      .from('generations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting generation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Generations DELETE failed:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

