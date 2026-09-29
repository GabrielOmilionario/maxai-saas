import { createClient, createAdminClient } from '@/lib/supabase/server'
import { KLING_CONFIG } from '@/lib/kling-config'
import { NextResponse } from 'next/server'

export const maxDuration = 60

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kling-motion/upload
// Faz upload seguro de imagem ou vídeo para o Supabase Storage
// e retorna a URL pública para ser usada no payload da API Kling.
//
// A Kling precisa acessar as URLs dos arquivos. Por isso usamos o bucket
// público "media" que já existe no projeto, sem necessidade de URLs assinadas.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createClient()

  // 1. Autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // 2. Ler o arquivo do form-data
  let formData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Falha ao processar o arquivo enviado.' }, { status: 400 })
  }

  const file = formData.get('file')
  const fileType = formData.get('type') // 'image' | 'video'

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
  }

  if (!['image', 'video'].includes(fileType)) {
    return NextResponse.json({ error: 'Tipo de arquivo inválido. Use "image" ou "video".' }, { status: 400 })
  }

  // 3. Validações do arquivo
  const limits = KLING_CONFIG.FILE_LIMITS[fileType]

  // Verificar tamanho
  if (file.size > limits.maxBytes) {
    const maxMB = Math.round(limits.maxBytes / (1024 * 1024))
    return NextResponse.json({
      error: `O arquivo excede o limite de ${maxMB}MB.`
    }, { status: 400 })
  }

  // Verificar MIME type
  if (!limits.allowedTypes.includes(file.type)) {
    return NextResponse.json({
      error: `Formato de arquivo inválido. Formatos aceitos: ${limits.allowedExtensions.join(', ').toUpperCase()}.`
    }, { status: 400 })
  }

  // Verificar extensão do nome
  const fileName = file.name || ''
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (!limits.allowedExtensions.includes(ext)) {
    return NextResponse.json({
      error: `Extensão de arquivo inválida. Use: ${limits.allowedExtensions.join(', ')}.`
    }, { status: 400 })
  }

  // 4. Converter para Buffer e fazer upload ao Supabase
  const supabaseAdmin = createAdminClient()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const contentTypeMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
  }
  const outputExt = contentTypeMap[file.type] || (fileType === 'video' ? '.mp4' : '.png')
  const uniqueName = `kling-${fileType}-${user.id.substring(0, 8)}-${Date.now()}-${Math.round(Math.random() * 1e6)}${outputExt}`

  console.log(`[KLING-UPLOAD] Uploading ${fileType}: ${uniqueName} (${Math.round(file.size / 1024)}KB)`)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('media')
    .upload(uniqueName, buffer, {
      contentType: file.type,
      cacheControl: '86400',
      upsert: false,
    })

  if (uploadError) {
    console.error('[KLING-UPLOAD] Storage upload error:', uploadError.message)
    return NextResponse.json({ error: 'Falha ao salvar arquivo. Tente novamente.' }, { status: 500 })
  }

  // 5. Obter URL pública
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('media')
    .getPublicUrl(uniqueName)

  console.log(`[KLING-UPLOAD] Uploaded ${fileType}: ${publicUrl}`)

  return NextResponse.json({ url: publicUrl, fileName: uniqueName })
}
