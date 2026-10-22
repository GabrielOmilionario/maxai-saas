'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import PlansModal from '@/components/PlansModal'
import {
  calculateGrokLiteCredits,
  GROK_LITE_CONFIG,
} from '@/lib/grok-lite-config'
import {
  Video,
  Sparkles,
  Coins,
  AlertTriangle,
  ArrowRight,
  Loader2,
  UploadCloud,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Info,
  Play,
  Download,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Clock,
  Film,
  Layers,
  ChevronRight,
  Sliders,
} from 'lucide-react'

const ADMIN_EMAILS = ['gabrieljesus2030@gmail.com', 'Isah3469520@gmail.com']

export default function GrokVideoPage() {
  const { profile, refreshProfile } = useAuth()
  const router = useRouter()

  // ─── Estados do Formulário de Geração ───────────────────────────────────────
  const [prompt, setPrompt] = useState('')
  const [resolution, setResolution] = useState(GROK_LITE_CONFIG.DEFAULT_RESOLUTION)
  const [duration, setDuration] = useState(GROK_LITE_CONFIG.DEFAULT_DURATION)
  const [aspectRatio, setAspectRatio] = useState(GROK_LITE_CONFIG.DEFAULT_ASPECT_RATIO)
  const [mode, setMode] = useState(GROK_LITE_CONFIG.DEFAULT_MODE)
  const [hasAudio, setHasAudio] = useState(true) // skip_audio = !hasAudio

  // Imagem de referência (opcional, máx 1)
  const [refImageFile, setRefImageFile] = useState(null)
  const [refImagePreview, setRefImagePreview] = useState(null)

  // ─── Estados de Processamento e Polling ──────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeGeneration, setActiveGeneration] = useState(null)
  const [completedVideo, setCompletedVideo] = useState(null)
  const [error, setError] = useState(null)
  const [plansModalOpen, setPlansModalOpen] = useState(false)

  // ─── Estados de Extensão de Vídeo ──────────────────────────────────────────
  const [extendModalOpen, setExtendModalOpen] = useState(false)
  const [extendSourceVideo, setExtendSourceVideo] = useState(null)
  const [extendPrompt, setExtendPrompt] = useState('')
  const [extendDuration, setExtendDuration] = useState(6)
  const [extendResolution, setExtendResolution] = useState('480p')
  const [extendMode, setExtendMode] = useState('custom')
  const [extendAudio, setExtendAudio] = useState(true)
  const [extending, setExtending] = useState(false)

  // ─── Histórico Local da Ferramenta ──────────────────────────────────────────
  const [historyVideos, setHistoryVideos] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Refs para controle de polling
  const isGeneratingRef = useRef(false)
  const pollTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const isAdmin = profile && ADMIN_EMAILS.includes(profile.email)
  const availableCredits = isAdmin ? 999999 : profile ? profile.credit_limit - profile.credit_used : 100
  const currentCost = calculateGrokLiteCredits(resolution, duration)
  const extendCost = calculateGrokLiteCredits(extendResolution, extendDuration)
  const hasEnoughCredits = availableCredits >= currentCost

  // ─── Buscar Histórico de Vídeos do Grok 1.5 Lite ───────────────────────────
  const fetchGrokHistory = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const res = await fetch('/api/grok-video/history')
      if (res.ok) {
        const data = await res.json()
        setHistoryVideos(data.videos || [])
      }
    } catch (err) {
      console.error('[GROK-PAGE] Erro ao carregar histórico:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchGrokHistory()
  }, [fetchGrokHistory])

  // ─── Polling de Status da Geração Ativa ──────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const checkStatus = useCallback(
    async (genId, uuid) => {
      try {
        const res = await fetch(`/api/grok-video/status?id=${genId}&uuid=${uuid}`)
        if (!res.ok) return

        const data = await res.json()

        if (data.status === 'processing') {
          setProgress(data.progress || 15)
        } else if (data.status === 'completed') {
          stopPolling()
          setLoading(false)
          isGeneratingRef.current = false
          setProgress(100)
          setCompletedVideo({
            id: genId,
            uuid,
            result_url: data.result_url,
            prompt: activeGeneration?.prompt || prompt,
            resolution,
            duration,
            aspect_ratio: aspectRatio,
          })
          setActiveGeneration(null)
          localStorage.removeItem('grok_active_gen')
          refreshProfile()
          fetchGrokHistory()
        } else if (data.status === 'failed') {
          stopPolling()
          setLoading(false)
          isGeneratingRef.current = false
          setError(data.error || 'A geração do vídeo falhou.')
          setActiveGeneration(null)
          localStorage.removeItem('grok_active_gen')
          refreshProfile()
          fetchGrokHistory()
        }
      } catch (pollErr) {
        console.error('[GROK-PAGE] Erro no polling de status:', pollErr)
      }
    },
    [activeGeneration, prompt, resolution, duration, aspectRatio, refreshProfile, fetchGrokHistory, stopPolling]
  )

  const startPolling = useCallback(
    (genId, uuid) => {
      stopPolling()
      // Primeiro check imediato
      checkStatus(genId, uuid)
      // Polling a cada 3.5 segundos
      pollTimerRef.current = setInterval(() => {
        checkStatus(genId, uuid)
      }, 3500)
    },
    [checkStatus, stopPolling]
  )

  // Recuperação de geração ativa após reload da página
  useEffect(() => {
    try {
      const savedGen = localStorage.getItem('grok_active_gen')
      if (savedGen) {
        const parsed = JSON.parse(savedGen)
        if (parsed.id && parsed.uuid) {
          setActiveGeneration(parsed)
          setLoading(true)
          startPolling(parsed.id, parsed.uuid)
        }
      }
    } catch (e) {
      localStorage.removeItem('grok_active_gen')
    }

    return () => stopPolling()
  }, [startPolling, stopPolling])

  // ─── Manipuladores de Arquivo de Imagem de Referência ────────────────────────
  const handleImageSelect = (file) => {
    if (!file) return
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('Por favor, envie apenas arquivos de imagem (PNG, JPG ou WEBP).')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('A imagem de referência não pode exceder 20MB.')
      return
    }

    setRefImageFile(file)
    const previewUrl = URL.createObjectURL(file)
    setRefImagePreview(previewUrl)
  }

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

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) handleImageSelect(file)
        break
      }
    }
  }

  const clearImage = () => {
    if (refImagePreview && refImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(refImagePreview)
    }
    setRefImageFile(null)
    setRefImagePreview(null)
  }

  // ─── Disparo de Geração de Vídeo ────────────────────────────────────────────
  const handleGenerate = async (e) => {
    e.preventDefault()
    if (loading || isGeneratingRef.current) return

    if (!prompt.trim()) {
      setError('O prompt de descrição do vídeo é obrigatório.')
      return
    }

    if (!isAdmin && availableCredits < currentCost) {
      setPlansModalOpen(true)
      setError(`Créditos insuficientes. São necessários ${currentCost} créditos.`)
      return
    }

    setError(null)
    setLoading(true)
    setProgress(5)
    isGeneratingRef.current = true

    try {
      const formData = new FormData()
      formData.append('prompt', prompt.trim())
      formData.append('resolution', resolution)
      formData.append('duration', String(duration))
      formData.append('aspect_ratio', aspectRatio)
      formData.append('mode', mode)
      formData.append('skip_audio', hasAudio ? 'false' : 'true')

      if (refImageFile) {
        formData.append('files', refImageFile)
      }

      const res = await fetch('/api/grok-video', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setLoading(false)
        isGeneratingRef.current = false
        setError(data.error || 'Erro ao iniciar geração de vídeo.')
        refreshProfile()
        return
      }

      const activeGenObj = {
        id: data.generation.id,
        uuid: data.uuid,
        prompt: prompt.trim(),
        resolution,
        duration,
        aspect_ratio: aspectRatio,
      }

      setActiveGeneration(activeGenObj)
      localStorage.setItem('grok_active_gen', JSON.stringify(activeGenObj))
      refreshProfile()

      // Inicia polling com o identificador
      startPolling(data.generation.id, data.uuid)
    } catch (err) {
      console.error('[GROK-PAGE] Falha ao enviar requisição:', err)
      setLoading(false)
      isGeneratingRef.current = false
      setError('Erro de conexão ao iniciar a geração do vídeo.')
      refreshProfile()
    }
  }

  // ─── Abertura do Modal de Extensão ──────────────────────────────────────────
  const openExtendModal = (video) => {
    setExtendSourceVideo(video)
    setExtendPrompt('')
    setExtendDuration(6)
    setExtendResolution(video.resolution || '480p')
    setExtendMode('custom')
    setExtendAudio(true)
    setExtendModalOpen(true)
  }

  // ─── Disparo da Extensão de Vídeo ───────────────────────────────────────────
  const handleExtendSubmit = async (e) => {
    e.preventDefault()
    if (extending || !extendSourceVideo) return

    if (!extendPrompt.trim()) {
      setError('Descreva a continuação desejada para estender o vídeo.')
      return
    }

    if (!isAdmin && availableCredits < extendCost) {
      setPlansModalOpen(true)
      setError(`Créditos insuficientes para estender. São necessários ${extendCost} créditos.`)
      return
    }

    setExtending(true)
    setError(null)
    setExtendModalOpen(false)
    setLoading(true)
    setProgress(5)
    isGeneratingRef.current = true

    try {
      const body = {
        isExtend: true,
        extendId: extendSourceVideo.id,
        prompt: extendPrompt.trim(),
        duration: extendDuration,
        resolution: extendResolution,
        mode: extendMode,
        skip_audio: !extendAudio,
      }

      const res = await fetch('/api/grok-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setLoading(false)
        isGeneratingRef.current = false
        setError(data.error || 'Erro ao iniciar extensão de vídeo.')
        refreshProfile()
        return
      }

      const activeGenObj = {
        id: data.generation.id,
        uuid: data.uuid,
        prompt: extendPrompt.trim(),
        resolution: extendResolution,
        duration: extendDuration,
        aspect_ratio: extendSourceVideo.aspect_ratio || 'landscape',
        isExtend: true,
      }

      setActiveGeneration(activeGenObj)
      localStorage.setItem('grok_active_gen', JSON.stringify(activeGenObj))
      refreshProfile()

      startPolling(data.generation.id, data.uuid)
    } catch (err) {
      console.error('[GROK-PAGE] Erro ao estender vídeo:', err)
      setLoading(false)
      isGeneratingRef.current = false
      setError('Erro de conexão ao estender vídeo.')
      refreshProfile()
    } finally {
      setExtending(false)
    }
  }

  return (
    <div className="w-full min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto select-none">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'rgba(124,58,237,0.2)',
              color: '#A78BFA',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            NOVO MODELO
          </span>
          <span className="text-zinc-500 text-xs">•</span>
          <span className="text-zinc-400 text-xs">Snapgen Official API</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              boxShadow: '0 0 20px rgba(124,58,237,0.4)',
            }}
          >
            <Video className="w-5 h-5 text-white" />
          </div>
          <span>Grok 1.5 Lite Video</span>
        </h1>
        <p className="text-zinc-400 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
          Gere vídeos ultra-realistas com inteligência artificial de alta fidelidade e estenda produções concluídas mantendo a continuidade.
        </p>
      </div>

      {/* ── Alerta de Erro ── */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 animate-fade-in"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Layout Principal: Studio Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Painel de Configuração (Esquerda, 7 cols) ── */}
        <form onSubmit={handleGenerate} className="lg:col-span-7 space-y-5">
          {/* Box de Prompt */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                Descrição da Cena (Prompt) *
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {prompt.length} caracteres
              </span>
            </div>

            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePaste}
              placeholder="Descreva detalhadamente o movimento, iluminação, ambiente e ação da cena. Ex: Uma câmera cinematográfica sobrevoa montanhas congeladas com aurora boreal refletindo em um lago cristalino, ultra-detalhado, 4K..."
              className="w-full px-4 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none leading-relaxed"
            />

            {refImagePreview && (
              <p className="text-[11px] text-purple-300/80 flex items-center gap-1.5 pt-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Descreva detalhadamente a ação ou movimento que deseja animar a partir da imagem enviada.
              </p>
            )}
          </div>

          {/* Box de Imagem de Referência (Opcional) */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                Imagem de Referência (Opcional - Máx 1)
              </label>
              {refImagePreview && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Remover imagem
                </button>
              )}
            </div>

            {!refImagePreview ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-zinc-800 hover:border-purple-500/50 rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-zinc-900/40 relative group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageInputChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-purple-500/40 group-hover:bg-purple-500/10 transition-all">
                    <UploadCloud className="w-5 h-5 text-zinc-400 group-hover:text-purple-400 transition-all" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Clique para selecionar ou arraste uma imagem aqui
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Suporta PNG, JPG ou WEBP (até 20MB) • Também pode colar com Ctrl+V
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 shrink-0 bg-black">
                    <img
                      src={refImagePreview}
                      alt="Referência"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {refImageFile ? refImageFile.name : 'Imagem de referência anexada'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      O Grok 1.5 Lite usará esta imagem como quadro inicial/base.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Box de Controles e Parâmetros */}
          <div
            className="rounded-2xl p-5 space-y-5"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Resolução e Duração */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Resolução */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                  Resolução
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GROK_LITE_CONFIG.RESOLUTIONS.map((resOpt) => {
                    const isSelected = resolution === resOpt
                    return (
                      <button
                        key={resOpt}
                        type="button"
                        onClick={() => setResolution(resOpt)}
                        className="py-2.5 px-2 rounded-xl text-center cursor-pointer transition-all border"
                        style={{
                          background: isSelected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                          borderColor: isSelected ? '#7C3AED' : 'rgba(255,255,255,0.07)',
                          color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        <span className="text-xs font-bold block">{resOpt}</span>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">
                          {resOpt === '480p' ? 'Padrão' : resOpt === '720p' ? 'HD' : 'Full HD'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Duração */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                  Duração
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GROK_LITE_CONFIG.DURATIONS.map((durOpt) => {
                    const isSelected = duration === durOpt
                    return (
                      <button
                        key={durOpt}
                        type="button"
                        onClick={() => setDuration(durOpt)}
                        className="py-2.5 px-2 rounded-xl text-center cursor-pointer transition-all border"
                        style={{
                          background: isSelected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                          borderColor: isSelected ? '#7C3AED' : 'rgba(255,255,255,0.07)',
                          color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        <span className="text-xs font-bold block">{durOpt}s</span>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">
                          {durOpt === 6 ? 'Padrão' : `${durOpt} seg`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Proporção de Tela (Aspect Ratio) */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                Proporção de Tela
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {GROK_LITE_CONFIG.ASPECT_RATIOS.map((item) => {
                  const isSelected = aspectRatio === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setAspectRatio(item.value)}
                      className="py-2 px-2 rounded-xl text-center cursor-pointer transition-all border flex flex-col items-center justify-center gap-1"
                      style={{
                        background: isSelected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                        borderColor: isSelected ? '#7C3AED' : 'rgba(255,255,255,0.07)',
                        color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      <span className="text-[11px] font-bold capitalize">{item.value}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">{item.ratio}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Modo de Geração e Áudio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Modo */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                  Modo de Geração
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full py-2.5 px-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {GROK_LITE_CONFIG.MODES.map((m) => (
                    <option key={m.value} value={m.value} className="bg-zinc-950 text-white">
                      {m.label} — {m.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Áudio */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                  Áudio Integrado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHasAudio(true)}
                    className="py-2.5 px-3 rounded-xl cursor-pointer transition-all border flex items-center justify-center gap-2"
                    style={{
                      background: hasAudio ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.02)',
                      borderColor: hasAudio ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.07)',
                      color: hasAudio ? '#4ade80' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Com áudio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasAudio(false)}
                    className="py-2.5 px-3 rounded-xl cursor-pointer transition-all border flex items-center justify-center gap-2"
                    style={{
                      background: !hasAudio ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.02)',
                      borderColor: !hasAudio ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)',
                      color: !hasAudio ? '#f87171' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Mudo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Box de Resumo de Cobrança e Botão Gerar ── */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(17,17,24,0.95))',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-brand-purple" />
                <span className="text-xs font-bold text-white">Créditos desta Geração</span>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-brand-purple">
                  {currentCost} créditos
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  {resolution} • {duration}s
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-zinc-400">Seu saldo disponível:</span>
              <span className="font-semibold text-white">
                {isAdmin ? '∞ Ilimitado' : `${availableCredits} créditos`}
              </span>
            </div>

            {!hasEnoughCredits && (
              <div
                className="p-3 rounded-xl flex items-center justify-between gap-3"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Você precisa de mais créditos para esta opção.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlansModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-[11px] font-bold hover:bg-red-500/30 transition-colors shrink-0 cursor-pointer"
                >
                  Recarregar
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !hasEnoughCredits}
              className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: loading ? '#4B5563' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                boxShadow: loading ? 'none' : '0 0 20px rgba(124,58,237,0.35)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando solicitação...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Gerar com Grok 1.5 Lite ({currentCost} créditos)</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Painel de Exibição / Player e Histórico (Direita, 5 cols) ── */}
        <div className="lg:col-span-5 space-y-5">
          {/* Status Ativo / Barra de Progresso */}
          {loading && (
            <div
              className="rounded-2xl p-5 animate-fade-in space-y-4"
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.25)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-purple" />
                  <span className="text-xs font-bold text-white">
                    {activeGeneration?.isExtend ? 'Estendendo vídeo...' : 'Geração em andamento...'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-brand-purple">
                  {progress}%
                </span>
              </div>

              {/* Barra de Progresso Real */}
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(progress, 5)}%` }}
                />
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                A IA está sintetizando os quadros e o áudio da cena. Este processo ocorre nos servidores de renderização e continuará mesmo se você atualizar a página.
              </p>
            </div>
          )}

          {/* Player do Vídeo Concluído */}
          {completedVideo && completedVideo.result_url && (
            <div
              className="rounded-2xl p-5 space-y-4 animate-scale-up"
              style={{
                background: '#111118',
                border: '1px solid rgba(124,58,237,0.3)',
                boxShadow: '0 0 30px rgba(124,58,237,0.15)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-bold text-white">Vídeo Concluído</span>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA' }}
                >
                  {completedVideo.resolution || resolution} • {completedVideo.duration || duration}s
                </span>
              </div>

              {/* Player HTML5 */}
              <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
                <video
                  src={completedVideo.result_url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Prompt do Vídeo */}
              <p className="text-xs text-zinc-300 italic line-clamp-2">
                "{completedVideo.prompt}"
              </p>

              {/* Ações: Download e Estender */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={completedVideo.result_url}
                  download={`grok-1.5-lite-${completedVideo.id || 'video'}.mp4`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Vídeo</span>
                </a>

                <button
                  type="button"
                  onClick={() => openExtendModal(completedVideo)}
                  className="h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Estender Vídeo</span>
                </button>
              </div>
            </div>
          )}

          {/* Placeholder quando não há vídeo concluído nem gerando */}
          {!completedVideo && !loading && (
            <div
              className="rounded-2xl p-6 text-center space-y-4"
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-purple-400">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Pronto para criar</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-sm mx-auto">
                  Escreva um prompt descritivo à esquerda e inicie a renderização cinematográfica com Grok 1.5 Lite.
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-2 text-[10px] text-zinc-500">
                <div>
                  <span className="font-bold text-zinc-400 block">Até 1080p</span>
                  Alta Definição
                </div>
                <div>
                  <span className="font-bold text-zinc-400 block">6s a 15s</span>
                  Duração Flexível
                </div>
                <div>
                  <span className="font-bold text-zinc-400 block">Extensão</span>
                  Continuidade
                </div>
              </div>
            </div>
          )}

          {/* ── Histórico Recente do Grok 1.5 Lite ── */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Histórico Grok 1.5 Lite
              </span>
              <button
                type="button"
                onClick={() => router.push('/history')}
                className="text-[11px] text-brand-purple hover:underline cursor-pointer font-semibold flex items-center gap-1"
              >
                Ver tudo <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-6 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando vídeos...
              </div>
            ) : historyVideos.length === 0 ? (
              <p className="py-4 text-center text-zinc-500 text-xs">
                Seus vídeos gerados com Grok 1.5 Lite aparecerão aqui.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto chat-scroll pr-1">
                {historyVideos.map((vid) => {
                  const isDone = vid.status === 'completed'
                  return (
                    <div
                      key={vid.id}
                      className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900/60 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {vid.result_url ? (
                          <div
                            onClick={() => setCompletedVideo(vid)}
                            className="w-12 h-12 rounded-lg bg-black border border-zinc-800 overflow-hidden relative shrink-0 cursor-pointer group"
                          >
                            <video
                              src={vid.result_url}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                            <Video className="w-5 h-5 text-zinc-600" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate">
                            {vid.prompt}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                isDone
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}
                            >
                              {isDone ? 'Pronto' : 'Processando'}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(vid.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isDone && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openExtendModal(vid)}
                            title="Estender vídeo"
                            className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={vid.result_url}
                            download={`grok-${vid.id}.mp4`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Baixar vídeo"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de Extensão de Vídeo ── */}
      {extendModalOpen && extendSourceVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setExtendModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-5 animate-scale-up border"
            style={{
              background: '#111118',
              borderColor: 'rgba(124,58,237,0.3)',
              boxShadow: '0 0 50px rgba(124,58,237,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Estender Vídeo</h3>
                  <p className="text-[11px] text-zinc-400">
                    A proporção de tela será herdada do vídeo original.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtendModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              {/* Preview Vídeo Original */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
                {extendSourceVideo.result_url && (
                  <div className="w-14 h-14 rounded-lg bg-black overflow-hidden shrink-0 border border-zinc-800">
                    <video src={extendSourceVideo.result_url} className="w-full h-full object-cover" muted />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-brand-purple font-bold uppercase tracking-wider block">
                    Vídeo Base
                  </span>
                  <p className="text-xs text-zinc-300 truncate">
                    {extendSourceVideo.prompt}
                  </p>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Proporção: {extendSourceVideo.aspect_ratio || 'landscape'}
                  </span>
                </div>
              </div>

              {/* Prompt de Continuação */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-1.5">
                  Continuação da Cena *
                </label>
                <textarea
                  required
                  rows={3}
                  value={extendPrompt}
                  onChange={(e) => setExtendPrompt(e.target.value)}
                  placeholder="Descreva o que acontece a seguir na cena após o término do vídeo original..."
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all resize-none"
                />
              </div>

              {/* Duração e Resolução da Extensão */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-1">
                    Duração Adicional
                  </label>
                  <select
                    value={extendDuration}
                    onChange={(e) => setExtendDuration(parseInt(e.target.value, 10))}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value={6}>6 segundos</option>
                    <option value={10}>10 segundos</option>
                    <option value={15}>15 segundos</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-1">
                    Resolução
                  </label>
                  <select
                    value={extendResolution}
                    onChange={(e) => setExtendResolution(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="480p">480p</option>
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                  </select>
                </div>
              </div>

              {/* Custo e Botão */}
              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Custo da extensão:</span>
                  <span className="text-sm font-bold text-brand-purple">
                    {extendCost} créditos
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExtendModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={extending}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {extending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Confirmar Extensão</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Planos */}
      <PlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
    </div>
  )
}
