import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== 'gabrieljesus2030@gmail.com') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. Limpar bucket 'media'
    const { data: files, error: listError } = await supabaseAdmin.storage.from('media').list('', { limit: 1000 })
    if (!listError && files && files.length > 0) {
      const fileNames = files.map(x => x.name).filter(name => name !== '.emptyFolderPlaceholder')
      for (let i = 0; i < fileNames.length; i += 100) {
        const batch = fileNames.slice(i, i + 100)
        await supabaseAdmin.storage.from('media').remove(batch)
      }
    }

    // 2. Limpar a tabela generations
    await supabaseAdmin.from('generations').delete().gt('created_at', '2000-01-01')

    // 3. Atualizar chat_messages
    await supabaseAdmin.from('chat_messages').update({
      media_url: null,
      status: 'failed',
      error_msg: 'A mídia expirou e foi removida do servidor para liberar espaço.'
    }).not('media_url', 'is', null)

    return NextResponse.json({ success: true, message: 'Armazenamento e cache limpos com sucesso!' })
  } catch (error) {
    console.error('[CLEAN-STORAGE] Error:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
