'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { PLANS } from '@/lib/plans-meta'
import PlansModal from '@/components/PlansModal'
import { Video, Sparkles, Coins, AlertTriangle, ArrowRight, Loader2, UploadCloud, X, Image as ImageIcon } from 'lucide-react'

export default function GenerateVideoPage() {
  const { profile, refreshProfile } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('grok-3')
  const [aspectRatio, setAspectRatio] = useState('landscape')
  const [resolution, setResolution] = useState('480p')
  const [duration, setDuration] = useState('6')
  const [loading, setLoading] = useState(false)
  const isGeneratingRef = useRef(false)
  const [refImage, setRefImage] = useState(null)
  const [error, setError] = useState(null)
  const [plansModalOpen, setPlansModalOpen] = useState(false)
  const router = useRouter()

  let videoCost = 20;
  if (model === 'seedance-2') {
    const durationSeconds = Number(duration) || 5;
    if (resolution === '720p') {
      videoCost = (refImage ? 85 : 140) * durationSeconds;
    } else {
      videoCost = (refImage ? 40 : 65) * durationSeconds;
    }
  } else if (model.includes('veo')) {
    videoCost = 18;
  } else {
    // Grok
    if (resolution === '720p') {
      if (String(duration) === '6') videoCost = 80;
      else if (String(duration) === '10') videoCost = 105;
      else if (String(duration) === '15') videoCost = 130;
      else videoCost = 80;
    } else {
      // 480p
      if (String(duration) === '6') videoCost = 55;
      else if (String(duration) === '10') videoCost = 80;
      else if (String(duration) === '15') videoCost = 105;
      else videoCost = 55;
    }
  }
  const availableCredits = profile ? (profile.credit_limit - profile.credit_used) : 100
  const hasEnoughCredits = availableCredits >= videoCost

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor, envie apenas arquivos de imagem.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setRefImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (!file) continue

        const reader = new FileReader()
        reader.onloadend = () => {
          setRefImage(reader.result)
        }
        reader.readAsDataURL(file)
        break // Stop after first image paste
      }
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (loading || isGeneratingRef.current) return
    if (!prompt) return

    // Block immediately if user has 0 credits remaining (100% used)
    const isAdmin = profile?.email === 'gabrieljesus2030@gmail.com'
    if (!isAdmin && availableCredits <= 0) {
      setPlansModalOpen(true)
      setError('Você consumiu 100% dos seus créditos. Adquira um plano para continuar gerando.')
      return
    }

    setLoading(true)
    isGeneratingRef.current = true
    setError(null)

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          aspect_ratio: aspectRatio,
          resolution,
          duration,
          ref_image: refImage,
        }),
      })

      if (response.ok) {
        // Refresh profile to immediately update user credits
        await refreshProfile()
        // Redirect to dashboard to watch generation progress
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.error || 'Ocorreu um erro ao iniciar a geração.')
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
      isGeneratingRef.current = false
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <Video className="h-7 w-7 text-brand-purple" /> Gerador de Vídeo
        </h1>
        <p className="text-zinc-400 text-xs mt-1">
          Utilize o modelo de IA de última geração Grok-3 para criar vídeos cinemáticos incríveis a partir de texto.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-small text-xs mb-6 animate-pulse-glow flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Settings and Form */}
        <form onSubmit={handleGenerate} className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-card p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-350 block uppercase tracking-wider">Prompt de Texto</label>
              <textarea
                required
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onPaste={handlePaste}
                placeholder="Descreva detalhadamente o que você deseja ver no seu vídeo. Ex: Um astronauta caminhando pelas ruas de neon de Tóquio, estilo cyberpunk, fumaça flutuando, cinematic 4k..."
                className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-input text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-355 block uppercase tracking-wider">Imagem de Referência (Opcional)</label>
              {!refImage ? (
                <div className="border border-dashed border-zinc-800 hover:border-brand-purple/50 rounded-input p-5 text-center cursor-pointer transition-all hover:bg-zinc-950/20 relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-brand-purple/35 group-hover:bg-brand-purple/5 transition-all">
                      <UploadCloud className="h-4.5 w-4.5 text-zinc-400 group-hover:text-brand-purple transition-all" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-zinc-300">
                        Clique para enviar ou arraste uma imagem
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        PNG, JPG ou WEBP (Max 1 imagem)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-input border border-zinc-800 overflow-hidden bg-zinc-950/80 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-small overflow-hidden border border-zinc-800 shrink-0">
                      <img src={refImage} alt="Referência" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-300">Imagem selecionada</p>
                      <p className="text-[10px] text-zinc-500">Será usada para guiar a geração do vídeo</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRefImage(null)}
                    className="p-1.5 rounded-small hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Modelo de Vídeo</label>
                <select
                  value={model}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setModel(newModel);
                    if (newModel.includes('veo')) {
                      setDuration('6');
                      setResolution('720p');
                    } else if (newModel === 'grok-3') {
                      setDuration('6');
                      if (!['480p', '720p'].includes(resolution)) setResolution('480p');
                    }
                  }}
                  className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-input text-sm text-zinc-200 focus:outline-none focus:border-brand-purple transition-all cursor-pointer"
                >
                  <option value="grok-3">Grok-3 Video</option>
                  <option value="veo-3.1-fast">Veo 3.1 Fast</option>
                  <option value="veo-3.1-lite">Veo 3.1 Lite</option>
                  <option value="seedance-2">Seedance 2.0</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Aspect Ratio (Proporção)</label>
                {model.includes('veo') ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('16:9')}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${aspectRatio === '16:9' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700'}`}
                      style={{ height: '100px' }}
                    >
                      <div className="w-[48px] h-[32px] border-2 border-zinc-700 rounded-md flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-zinc-500" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-200">16:9</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('9:16')}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${aspectRatio === '9:16' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700'}`}
                      style={{ height: '100px' }}
                    >
                      <div className="w-[32px] h-[48px] border-2 border-zinc-700 rounded-md flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-zinc-500" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-200">9:16</span>
                    </button>
                  </div>
                ) : (
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-input text-sm text-zinc-200 focus:outline-none focus:border-brand-purple transition-all cursor-pointer"
                  >
                    <option value="landscape">Horizontal (16:9)</option>
                    <option value="portrait">Vertical (9:16)</option>
                    <option value="square">Quadrado (1:1)</option>
                    <option value="vertical">Retrato (2:3)</option>
                    <option value="horizontal">Paisagem (3:2)</option>
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Resolução</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-input text-sm text-zinc-200 focus:outline-none focus:border-brand-purple transition-all cursor-pointer"
                >
                  {model.includes('veo') ? (
                    <>
                      <option value="720p">720p HD</option>
                      <option value="1080p">1080p Full HD</option>
                    </>
                  ) : (
                    <>
                      <option value="480p">480p SD</option>
                      <option value="720p">720p HD</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Duração</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-input text-sm text-zinc-200 focus:outline-none focus:border-brand-purple transition-all cursor-pointer"
                >
                  {model.includes('veo') ? (
                    <>
                      <option value="4">4 segundos</option>
                      <option value="6">6 segundos</option>
                      <option value="8">8 segundos</option>
                    </>
                  ) : model === 'grok-3' ? (
                    <>
                      <option value="6">6 segundos</option>
                      <option value="10">10 segundos</option>
                      <option value="15">15 segundos</option>
                    </>
                  ) : (
                    <>
                      <option value="5">5 segundos</option>
                      <option value="10">10 segundos</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !hasEnoughCredits}
            className="w-full h-11 bg-gradient-to-r from-brand-purple to-indigo-600 hover:from-brand-purple/90 hover:to-indigo-600/90 disabled:opacity-50 text-white font-bold rounded-[14px] text-sm flex items-center justify-center gap-2 cursor-pointer btn-glow transition-all shadow-lg shadow-brand-purple/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Geração Iniciada...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Criar Vídeo <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Informational Panel */}
        <div className="space-y-6">
          {/* Credit balance card */}
          <div className="glass-panel rounded-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coins className="h-4 w-4 text-brand-purple" /> Detalhes de Crédito
            </h3>

            <div className="flex justify-between items-center text-sm border-b border-zinc-900 pb-3">
              <span className="text-zinc-400">Saldo Atual:</span>
              <span className="font-bold text-white">{availableCredits} créditos</span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-zinc-900 pb-3">
              <span className="text-zinc-400">Custo do Vídeo:</span>
              <span className="font-bold text-brand-purple">-{videoCost} créditos</span>
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-zinc-400">Saldo Após Geração:</span>
              <span className={`font-bold ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
                {availableCredits - videoCost} créditos
              </span>
            </div>

            {!hasEnoughCredits && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-small text-xs flex gap-2 leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Você precisa de pelo menos {videoCost} créditos para iniciar a geração de um vídeo.</span>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-card p-5 space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dica MAX AI</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              O modelo Grok-3 entrega gerações rápidas e dinâmicas de alta fidelidade visual para qualquer prompt.
            </p>
          </div>
        </div>
      </div>

      {/* ── Plans Comparison Modal ── */}
      <PlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
    </div>
  )
}
