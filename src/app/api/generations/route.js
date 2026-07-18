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
            // Live Image Status Check (KIE AI)
            const apiKey = process.env.KIE_API_KEY
            if (apiKey && gen.external_id) {
              const costMatch = gen.external_id.match(/cost:(\d+)/);
              const refundAmount = costMatch ? parseInt(costMatch[1]) : 20;
              const realExternalId = gen.external_id.includes('|id:') ? gen.external_id.split('|id:')[1] : gen.external_id;

              const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${realExternalId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` },
              })

              if (res.ok) {
                const apiRes = await res.json()
                const taskData = apiRes.data || apiRes
                
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
                  if (finalUrl) {
                    // Archive to Supabase
                    finalUrl = await uploadRemoteUrlToSupabase(finalUrl, 'image')
                    await supabaseAdmin
                      .from('generations')
                      .update({ status: 'completed', result_url: finalUrl })
                      .eq('id', gen.id)

                    gen.status = 'completed'
                    gen.result_url = finalUrl
                  }
                } else if (taskData.state === 'fail') {
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

