import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const type = searchParams.get('type') || 'all'
    const search = searchParams.get('search') || ''
    const favorite = searchParams.get('favorite') === 'true'

    let query = supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (type === 'image') query = query.eq('type', 'image')
    else if (type === 'video') query = query.eq('type', 'video')

    if (search.trim()) {
      query = query.ilike('prompt', `%${search.trim()}%`)
    }

    if (favorite) {
      query = query.eq('favorite', true)
    }

    if (cursor) {
      // Get the cursor item's created_at to paginate
      const { data: cursorItem } = await supabase
        .from('generations')
        .select('created_at')
        .eq('id', cursor)
        .single()

      if (cursorItem) {
        query = query.lt('created_at', cursorItem.created_at)
      }
    }

    const { data: items, error } = await query

    if (error) {
      console.error('[HISTORY-GET] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const hasMore = items.length > limit
    const results = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore ? results[results.length - 1].id : null

    return NextResponse.json({
      items: results,
      nextCursor,
      hasMore,
    })
  } catch (err) {
    console.error('[HISTORY-GET] Fatal:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, favorite } = body

    if (!id || typeof favorite !== 'boolean') {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('generations')
      .update({ favorite })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[HISTORY-PATCH] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[HISTORY-PATCH] Fatal:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('generations')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      console.error('[HISTORY-DELETE] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (err) {
    console.error('[HISTORY-DELETE] Fatal:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
