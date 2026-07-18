import { createAdminClient } from './server'

export async function uploadRemoteUrlToSupabase(remoteUrl, fileType) {
  if (!remoteUrl) return null
  // If already in Supabase, return directly
  if (remoteUrl.includes('supabase.co')) return remoteUrl

  try {
    const supabaseAdmin = createAdminClient()
    
    // Fetch file from remote url
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 seconds timeout
    
    const response = await fetch(remoteUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Failed to download remote file: ${response.statusText}`)
      return remoteUrl
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const ext = fileType === 'video' ? '.mp4' : '.png'
    const uniqueName = `generated-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    const contentType = fileType === 'video' ? 'video/mp4' : 'image/png'

    const { error } = await supabaseAdmin.storage
      .from('media')
      .upload(uniqueName, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.error('Supabase Storage upload error:', error.message)
      return remoteUrl
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(uniqueName)

    return publicUrl
  } catch (err) {
    console.error('Error uploading to Supabase storage:', err.message)
    return remoteUrl
  }
}

export async function uploadBase64ToSupabase(base64Data) {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data
  try {
    const supabaseAdmin = createAdminClient()
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches) return base64Data
    
    const contentType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')
    
    let ext = '.png'
    if (contentType === 'image/jpeg' || contentType === 'image/jpg') ext = '.jpg'
    else if (contentType === 'image/gif') ext = '.gif'
    else if (contentType === 'image/webp') ext = '.webp'
    
    const uniqueName = `attachment-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    
    const { error } = await supabaseAdmin.storage
      .from('media')
      .upload(uniqueName, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      })
      
    if (error) {
      console.error('Supabase base64 upload error:', error.message)
      return base64Data
    }
    
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(uniqueName)
      
    return publicUrl
  } catch (err) {
    console.error('Error uploading base64 to Supabase:', err.message)
    return base64Data
  }
}

