'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import PlansModal from '@/components/PlansModal'
import {
  Video, Sparkles, Coins, AlertTriangle, ArrowRight, Loader2,
  UploadCloud, X, Image as ImageIcon, CheckCircle2, Info,
  Play, Mic, MicOff, Film
} from 'lucide-react'

// ─── Kling pricing (mirrored from server config for UX estimation) ───────────
const CREDITS_PER_SECOND = { standard: 120, professional: 160 }

function calcEstimatedCredits(mode, durationSeconds) {
  const rate = CREDITS_PER_SECOND[mode] || 120
  return Math.ceil(durationSeconds * rate)
}

// ─── Upload helper ────────────────────────────────────────────────────────────
async function uploadFileToServer(file, type, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const res = await fetch('/api/kling-motion/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Falha ao enviar ${type === 'image' ? 'imagem' : 'vídeo'}.`)
  }

  const data = await res.json()
  return data.url
}

// ─── File validation (client-side, before upload) ─────────────────────────────
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  if (!allowedTypes.includes(file.type)) return 'Formato inválido. Use JPG, JPEG ou PNG.'
  if (file.size > 50 * 1024 * 1024) return 'A imagem não pode exceder 50MB.'
  return null
}

function validateVideoFile(file, orientation, maxDuration) {
  const allowedTypes = ['video/mp4', 'video/quicktime']
  if (!allowedTypes.includes(file.type)) return 'Formato inválido. Use MP4 ou MOV.'
  if (file.size > 100 * 1024 * 1024) return 'O vídeo não pode exceder 100MB.'
  return null
}

// ─── Image dimension check ────────────────────────────────────────────────────
function checkImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w < 300 || h < 300) {
        resolve('A imagem deve ter no mínimo 300px em cada dimensão.')
        return
      }
      const ratio = w / h
      if (ratio < 1 / 2.5 || ratio > 2.5) {
        resolve('O aspect ratio da imagem deve estar entre 1:2.5 e 2.5:1.')
        return
      }
      resolve(null)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ─── Video duration check ─────────────────────────────────────────────────────
function checkVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration || 0)
    }
    video.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
    video.src = url
  })
}

// ─── Progress steps ───────────────────────────────────────────────────────────
const PROGRESS_STEPS = [
  'Preparando arquivos...',
  'Enviando para Kling...',
  'Processando vídeo...',
  'Finalizando...',
]

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function KlingMotionPage() {
  const { profile, refreshProfile } = useAuth()
  const router = useRouter()

  // ── Form state ────────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [orientation, setOrientation] = useState('image')
  const [mode, setMode] = useState('standard')
  const [resolution, setResolution] = useState('720p')
  const [audio, setAudio] = useState('original')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [plansModalOpen, setPlansModalOpen] = useState(false)
  const isGeneratingRef = useRef(false)

  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  // ── Computed values ───────────────────────────────────────────────────────
  const isAdmin = ['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com'].includes(profile?.email)
  const availableCredits = isAdmin ? 999999 : (profile ? (profile.credit_limit - profile.credit_used) : 0)
  const maxVideoDuration = orientation === 'image' ? 10 : 30
  const effectiveDuration = Math.min(videoDuration, maxVideoDuration)
  const estimatedCredits = effectiveDuration > 0 ? calcEstimatedCredits(mode, Math.ceil(effectiveDuration)) : 0
  const hasEnoughCredits = isAdmin || availableCredits >= estimatedCredits

  // ─────────────────────────────────────────────────────────────────────────
  // Image handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleImageSelect = useCallback(async (file) => {
    if (!file) return
    setError(null)

    const typeError = validateImageFile(file)
    if (typeError) { setError(typeError); return }

    const dimError = await checkImageDimensions(file)
    if (dimError) { setError(dimError); return }

    setImageFile(file)
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }, [])

  const handleImageInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
    e.target.value = ''
  }

  const handleImageDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageSelect(file)
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Video handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleVideoSelect = useCallback(async (file) => {
    if (!file) return
    setError(null)

    const typeError = validateVideoFile(file)
    if (typeError) { setError(typeError); return }

    const duration = await checkVideoDuration(file)

    if (duration < 3) {
      setError('O vídeo de movimento precisa ter pelo menos 3 segundos.')
      return
    }

    const maxDur = orientation === 'image' ? 10 : 30
    if (duration > maxDur) {
      setError(`Para orientação "${orientation === 'image' ? 'Seguir imagem' : 'Seguir vídeo'}", o vídeo de referência pode ter no máximo ${maxDur} segundos.`)
      return
    }

    setVideoDuration(duration)
    setVideoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setVideoPreview(previewUrl)
  }, [orientation])

  const handleVideoInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleVideoSelect(file)
    e.target.value = ''
  }

  const handleVideoDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleVideoSelect(file)
  }

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview(null)
    setVideoDuration(0)
  }

  // Re-validate when orientation changes
  const handleOrientationChange = (newOrientation) => {
    setOrientation(newOrientation)
    // If video already selected, re-check duration limits
    if (videoDuration > 0) {
      const maxDur = newOrientation === 'image' ? 10 : 30
      if (videoDuration > maxDur) {
        setError(`Para orientação "${newOrientation === 'image' ? 'Seguir imagem' : 'Seguir vídeo'}", o vídeo deve ter no máximo ${maxDur} segundos. Selecione um vídeo mais curto.`)
        clearVideo()
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate
  // ─────────────────────────────────────────────────────────────────────────
  const handleGenerate = async (e) => {
    e.preventDefault()
    if (loading || isGeneratingRef.current) return
    if (!imageFile || !videoFile) return

    setError(null)

    // Frontend credit check
    if (!isAdmin && availableCredits < estimatedCredits) {
      setPlansModalOpen(true)
      setError(`Créditos insuficientes. Você tem ${availableCredits} créditos, mas são necessários ${estimatedCredits}.`)
      return
    }

    // Final validation
    const maxDur = orientation === 'image' ? 10 : 30
    if (videoDuration < 3) {
      setError('O vídeo de movimento precisa ter pelo menos 3 segundos.')
      return
    }
    if (videoDuration > maxDur) {
      setError(`Para esta orientação, o vídeo pode ter no máximo ${maxDur} segundos.`)
      return
    }
    if (prompt.length > 2500) {
      setError('O prompt não pode exceder 2500 caracteres.')
      return
    }

    setLoading(true)
    isGeneratingRef.current = true
    setProgressStep(0)

    try {
      // Step 1: Upload imagem
      setProgressStep(0)
      const imageUrl = await uploadFileToServer(imageFile, 'image')

      // Step 2: Upload vídeo
      setProgressStep(1)
      const videoUrl = await uploadFileToServer(videoFile, 'video')

      // Step 3: Criar task Kling
      setProgressStep(2)
      const response = await fetch('/api/kling-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          videoUrl,
          orientation,
          mode,
          resolution,
          audio,
          prompt: prompt.trim(),
          referenceDuration: videoDuration,
        }),
      })

      setProgressStep(3)

      if (response.ok) {
        setSuccess(true)
        await refreshProfile()
        // Redirecionar para o histórico após 2s
        setTimeout(() => {
          router.push('/history')
        }, 2000)
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Ocorreu um erro ao iniciar a geração.')
      }
    } catch (err) {
      console.error('[KLING-MOTION-PAGE]', err)
      setError(err.message || 'Erro de conexão com o servidor. Tente novamente.')
    } finally {
      setLoading(false)
      isGeneratingRef.current = false
      setProgressStep(0)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: '44px', height: '44px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            <Film className="w-5 h-5" style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h1
              className="font-bold text-white"
              style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
            >
              Kling 3.0 Motion Control
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              Transfira os movimentos de um vídeo de referência para seu personagem ou imagem.
            </p>
          </div>
        </div>
      </div>

      {/* ── Success state ── */}
      {success && (
        <div
          className="flex items-center gap-3 p-4 rounded-2xl mb-6 animate-fade-in"
          style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#4ade80' }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#4ade80' }}>Geração iniciada com sucesso!</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
              Redirecionando para o histórico... A geração pode levar alguns minutos.
            </p>
          </div>
        </div>
      )}

      {/* ── Error message ── */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl mb-6 animate-fade-in"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <p style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.5', flex: 1 }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="shrink-0 cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Main form ── */}
        <form onSubmit={handleGenerate} className="lg:col-span-2 space-y-5">

          {/* ── Upload Imagem ── */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="w-4 h-4" style={{ color: '#A78BFA' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
                Imagem do Personagem
              </span>
              <span style={{ fontSize: '10px', color: '#f87171', fontWeight: '600' }}>Obrigatório</span>
            </div>

            {!imageFile ? (
              <div
                className="rounded-xl cursor-pointer transition-all"
                style={{
                  border: '2px dashed rgba(255,255,255,0.1)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                onDrop={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; handleImageDrop(e) }}
                onClick={() => imageInputRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageInputChange}
                  className="hidden"
                />
                <div
                  className="flex items-center justify-center mx-auto mb-3"
                  style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(124,58,237,0.2)',
                  }}
                >
                  <UploadCloud className="w-5 h-5" style={{ color: '#A78BFA' }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                  Clique ou arraste a imagem
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  JPG, JPEG ou PNG • Máx. 50MB • Mín. 300px • Ratio entre 1:2.5 e 2.5:1
                </p>
              </div>
            ) : (
              <div
                className="relative rounded-xl overflow-hidden flex items-center gap-3 p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {imageFile.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {(imageFile.size / (1024 * 1024)).toFixed(2)}MB • Imagem pronta
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />
                    <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '600' }}>Validada</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="p-1.5 rounded-lg cursor-pointer transition-all"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Upload Vídeo de Movimento ── */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Video className="w-4 h-4" style={{ color: '#06b6d4' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
                Vídeo de Movimento
              </span>
              <span style={{ fontSize: '10px', color: '#f87171', fontWeight: '600' }}>Obrigatório</span>
            </div>

            {!videoFile ? (
              <div
                className="rounded-xl cursor-pointer"
                style={{
                  border: '2px dashed rgba(255,255,255,0.1)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                onDrop={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; handleVideoDrop(e) }}
                onClick={() => videoInputRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  onChange={handleVideoInputChange}
                  className="hidden"
                />
                <div
                  className="flex items-center justify-center mx-auto mb-3"
                  style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'rgba(6,182,212,0.08)',
                    border: '1px solid rgba(6,182,212,0.2)',
                  }}
                >
                  <Play className="w-5 h-5" style={{ color: '#06b6d4' }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                  Clique ou arraste o vídeo
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  MP4 ou MOV • Máx. 100MB • 3s–{maxVideoDuration}s • Preferencialmente uma única pessoa
                </p>
              </div>
            ) : (
              <div
                className="relative rounded-xl overflow-hidden flex items-center gap-3 p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  style={{
                    width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
                  }}
                >
                  {videoPreview && (
                    <video
                      src={videoPreview}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                      muted
                      preload="metadata"
                    />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play className="w-4 h-4 text-white" style={{ fill: 'white' }} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {videoFile.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {(videoFile.size / (1024 * 1024)).toFixed(2)}MB • {videoDuration.toFixed(1)}s
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />
                    <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '600' }}>Validado</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearVideo}
                  className="p-1.5 rounded-lg cursor-pointer transition-all"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Prompt ── */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <label
              style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '10px' }}
            >
              Prompt <span style={{ fontSize: '10px', fontWeight: '400', color: 'rgba(255,255,255,0.25)' }}>(Opcional)</span>
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              maxLength={2500}
              rows={3}
              placeholder="Descreva roupas, aparência, ambiente ou detalhes que deseja manter no resultado..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: '#fff',
                resize: 'none', outline: 'none', lineHeight: '1.6', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '6px', textAlign: 'right' }}>
              {prompt.length}/2500
            </p>
          </div>

          {/* ── Configurações ── */}
          <div
            className="rounded-2xl p-5 space-y-5"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
              Configurações
            </p>

            {/* Orientação */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px' }}>
                Orientação do Personagem
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: 'image',
                    label: 'Seguir Imagem',
                    desc: 'Orientação da imagem enviada • Vídeo de 3–10s',
                    color: '#A78BFA',
                  },
                  {
                    value: 'video',
                    label: 'Seguir Vídeo',
                    desc: 'Orientação do vídeo de movimento • Vídeo de 3–30s',
                    color: '#06b6d4',
                  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleOrientationChange(opt.value)}
                    className="text-left cursor-pointer"
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      border: `1px solid ${orientation === opt.value ? opt.color + '50' : 'rgba(255,255,255,0.07)'}`,
                      background: orientation === opt.value ? opt.color + '12' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <p style={{ fontSize: '13px', fontWeight: '600', color: orientation === opt.value ? opt.color : 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.4' }}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Qualidade e Resolução */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px' }}>
                  Qualidade
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'standard', label: 'Standard', sub: '120 créditos/s' },
                    { value: 'professional', label: 'Professional', sub: '160 créditos/s' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className="w-full text-left cursor-pointer"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: `1px solid ${mode === opt.value ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        background: mode === opt.value ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <p style={{ fontSize: '12px', fontWeight: '600', color: mode === opt.value ? '#A78BFA' : 'rgba(255,255,255,0.7)' }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px' }}>
                  Resolução
                </label>
                <div className="space-y-2">
                  {[
                    { value: '720p', label: '720p HD', sub: 'Mais rápido' },
                    { value: '1080p', label: '1080p Full HD', sub: 'Maior qualidade' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResolution(opt.value)}
                      className="w-full text-left cursor-pointer"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: `1px solid ${resolution === opt.value ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        background: resolution === opt.value ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <p style={{ fontSize: '12px', fontWeight: '600', color: resolution === opt.value ? '#06b6d4' : 'rgba(255,255,255,0.7)' }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Áudio */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px' }}>
                Áudio Original
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'original', label: 'Ativado', icon: Mic, color: '#4ade80' },
                  { value: 'off', label: 'Desativado', icon: MicOff, color: '#f87171' },
                ].map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAudio(opt.value)}
                      className="flex items-center gap-2 cursor-pointer"
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        flex: 1,
                        border: `1px solid ${audio === opt.value ? opt.color + '40' : 'rgba(255,255,255,0.07)'}`,
                        background: audio === opt.value ? opt.color + '12' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: audio === opt.value ? opt.color : 'rgba(255,255,255,0.4)' }} />
                      <span style={{ fontSize: '12px', fontWeight: '600', color: audio === opt.value ? opt.color : 'rgba(255,255,255,0.5)' }}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
                Quando ativado, o vídeo gerado mantém o áudio original do vídeo de referência.
              </p>
            </div>
          </div>

          {/* ── Loading progress ── */}
          {loading && (
            <div
              className="rounded-2xl p-5 animate-fade-in"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#A78BFA' }} />
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#A78BFA' }}>
                  {PROGRESS_STEPS[progressStep] || 'Processando...'}
                </p>
              </div>
              <div className="flex gap-1.5">
                {PROGRESS_STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: '3px', borderRadius: '99px',
                      background: i <= progressStep ? '#7C3AED' : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.4s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Submit button ── */}
          <button
            type="submit"
            disabled={loading || !imageFile || !videoFile || !hasEnoughCredits}
            className="w-full font-bold text-white cursor-pointer transition-all"
            style={{
              height: '52px',
              borderRadius: '16px',
              background: loading || !imageFile || !videoFile || !hasEnoughCredits
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              border: '1px solid rgba(124,58,237,0.3)',
              fontSize: '14px',
              fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: loading || !imageFile || !videoFile || !hasEnoughCredits ? 0.5 : 1,
              boxShadow: !loading && imageFile && videoFile && hasEnoughCredits
                ? '0 0 24px rgba(124,58,237,0.25)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando vídeo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar Vídeo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* ── Info panel ── */}
        <div className="space-y-4">

          {/* Créditos */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" style={{ color: '#A78BFA' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
                Créditos
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Saldo atual:</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                  {isAdmin ? '∞' : availableCredits.toLocaleString('pt-BR')}
                </span>
              </div>

              {videoDuration > 0 && (
                <div className="flex justify-between items-center" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Duração ref.:
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                    {videoDuration.toFixed(1)}s
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Taxa:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#A78BFA' }}>
                  {CREDITS_PER_SECOND[mode]} créditos/s
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Custo estimado:</span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: estimatedCredits > 0 ? '#A78BFA' : 'rgba(255,255,255,0.3)' }}>
                  {estimatedCredits > 0 ? `-${estimatedCredits.toLocaleString('pt-BR')}` : '—'}
                </span>
              </div>
            </div>

            {!hasEnoughCredits && estimatedCredits > 0 && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                <p style={{ fontSize: '11px', color: '#fca5a5', lineHeight: '1.5' }}>
                  Créditos insuficientes para esta geração.
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" style={{ color: '#06b6d4' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
                Como funciona
              </span>
            </div>
            <ul className="space-y-2">
              {[
                'Envie uma imagem do personagem que deseja animar',
                'Envie um vídeo com os movimentos de referência',
                'A IA transfere os movimentos para o personagem',
                'O vídeo é salvo automaticamente no seu histórico',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    style={{
                      width: '18px', height: '18px', borderRadius: '999px', flexShrink: 0,
                      background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: '700', color: '#06b6d4', marginTop: '1px',
                    }}
                  >
                    {i + 1}
                  </span>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>{tip}</p>
                </li>
              ))}
            </ul>
            <div
              className="rounded-xl p-3"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <p style={{ fontSize: '10px', color: 'rgba(245,158,11,0.8)', lineHeight: '1.5' }}>
                💡 O vídeo deve conter preferencialmente uma única pessoa para melhores resultados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
    </div>
  )
}
