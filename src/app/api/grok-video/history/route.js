import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: videos, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .eq('model_name', 'grok-1.5-lite')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('[GROK-LITE-HISTORY] Erro ao buscar histórico:', error)
      return NextResponse.json({ error: 'Erro ao buscar histórico de vídeos' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      videos: videos || [],
    })
  } catch (err) {
    console.error('[GROK-LITE-HISTORY] Erro fatal:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
