'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { PLANS } from '@/lib/plans-meta'
import PlansModal from '@/components/PlansModal'
import { ImageIcon, Sparkles, Coins, AlertTriangle, ArrowRight, Loader2, UploadCloud, X } from 'lucide-react'

export default function GenerateImagePage() {
  const { profile, refreshProfile } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('auto')
  const [loading, setLoading] = useState(false)
  const isGeneratingRef = useRef(false)
  const [refImage, setRefImage] = useState(null)
  const [error, setError] = useState(null)
  const [plansModalOpen, setPlansModalOpen] = useState(false)
  const router = useRouter()

  const imageCost = 20
  const availableCredits = profile ? (profile.credit_limit - profile.credit_used) : 100
  const hasEnoughCredits = availableCredits >= imageCost

  const isImageRestricted = profile && ['free', 'iniciante'].includes(profile.plan?.toLowerCase() || 'free')

  if (isImageRestricted) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 bg-brand-blue/10 rounded-2xl border border-brand-blue/15 mb-4 text-brand-blue animate-pulse">
            <ImageIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Ferramenta Premium
          </h1>
          <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
            O gerador de imagens **GPT Image-2** está disponível apenas nos planos **Criador** e **Empresas**. Veja os planos abaixo para fazer o upgrade.
          </p>
        </div>

        {/* Pricing comparison list */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch mb-8 select-none">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.name}
              className={`glass-panel border rounded-card p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-premium ${
                plan.highlight ? 'border-amber-500 ring-1 ring-amber-500/20' : plan.accent
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-small">
                  Recomendado
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60 block">{plan.badge}</span>
                  <h3 className="text-base font-bold text-white mt-1">{plan.name}</h3>
                  <p className="text-[11px] text-zinc-550 mt-1 leading-normal">{plan.description}</p>
                </div>
                
                <div className="py-2 border-y border-white/[0.04]">
                  <p className="text-xl font-black text-white">{plan.price}</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">mensal</p>
                </div>
                
                <ul className="space-y-2 text-[11px] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span className="text-zinc-300 font-medium">{plan.credits}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span className="text-zinc-300">{plan.tools}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span className="text-zinc-300">{plan.limit}</span>
                  </li>
                </ul>
              </div>
              
              <div className="mt-6">
                {plan.checkoutUrl ? (
                  <a
                    href={plan.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      plan.highlight 
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md' 
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/5'
                    }`}
                  >
                    Assinar Plano
                  </a>
                ) : (
                  <a
                    href="mailto:adventistasdosabado@gmail.com?subject=Upgrade%20MAX%20AI"
                    className={`w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      plan.highlight 
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md' 
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/5'
                    }`}
                  >
                    Solicitar Upgrade
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-[11px] text-zinc-550 bg-white/[0.02] border border-white/[0.04] p-4 rounded-card max-w-xl mx-auto leading-relaxed animate-fade-in">
          Para alterar seu plano, fale com o suporte enviando um e-mail para <a href="mailto:adventistasdosabado@gmail.com" className="text-brand-blue hover:underline">adventistasdosabado@gmail.com</a>. O plano será atualizado imediatamente após a aprovação.
        </div>
      </div>
    )
  }

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
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          ref_image: refImage,
        }),
      })

      if (response.ok) {
        await refreshProfile()
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.error || 'Ocorreu um erro ao iniciar a geração de imagem.')
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
          <ImageIcon className="h-7 w-7 text-brand-blue" /> Gerador de Imagem
        </h1>
        <p className="text-zinc-400 text-xs mt-1">
          Crie ilustrações incríveis, fotos realistas e designs futuristas a partir de descrições em texto com o modelo GPT Image-2.
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
                placeholder="Descreva a imagem que deseja criar em detalhes. Ex: Um lobo mecânico no topo de um arranha-céu em uma floresta tecnológica sob luas duplas, renderizado em 3D realista..."
                className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-input text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-355 block uppercase tracking-wider">Imagem de Referência (Opcional)</label>
              {!refImage ? (
                <div className="border border-dashed border-zinc-800 hover:border-brand-blue/50 rounded-input p-5 text-center cursor-pointer transition-all hover:bg-zinc-950/20 relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-brand-blue/35 group-hover:bg-brand-blue/5 transition-all">
                      <UploadCloud className="h-4.5 w-4.5 text-zinc-400 group-hover:text-brand-blue transition-all" />
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
                      <p className="text-[10px] text-zinc-500">Será usada para guiar a geração (Image to Image)</p>
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-350 block uppercase tracking-wider">Aspect Ratio (Proporção)</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-input text-sm text-zinc-200 focus:outline-none focus:border-brand-blue transition-all cursor-pointer"
              >
                <option value="auto">Auto (Automático / Quadrado ou proporção ideal)</option>
                <option value="1:1">1:1 Quadrado</option>
                <option value="16:9">16:9 Horizontal (Cinema / Desktop)</option>
                <option value="9:16">9:16 Vertical (Stories / TikTok)</option>
                <option value="4:3">4:3 Fotografia Clássica</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !hasEnoughCredits}
            className="w-full h-11 bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-600/90 disabled:opacity-50 text-white font-bold rounded-[14px] text-sm flex items-center justify-center gap-2 cursor-pointer btn-glow transition-all shadow-lg shadow-brand-blue/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Iniciando Geração...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Criar Imagem <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Informational Panel */}
        <div className="space-y-6">
          {/* Credit balance card */}
          <div className="glass-panel rounded-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coins className="h-4 w-4 text-brand-blue" /> Detalhes de Crédito
            </h3>

            <div className="flex justify-between items-center text-sm border-b border-zinc-900 pb-3">
              <span className="text-zinc-400">Saldo Atual:</span>
              <span className="font-bold text-white">{availableCredits} créditos</span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-zinc-900 pb-3">
              <span className="text-zinc-400">Custo da Imagem:</span>
              <span className="font-bold text-brand-blue">-{imageCost} créditos</span>
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-zinc-400">Saldo Após Geração:</span>
              <span className={`font-bold ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
                {availableCredits - imageCost} créditos
              </span>
            </div>

            {!hasEnoughCredits && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-small text-xs flex gap-2 leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Você precisa de pelo menos 20 créditos para iniciar a geração de uma imagem.</span>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-card p-5 space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dica MAX AI</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              O gerador de imagem utiliza o modelo GPT Image-2 que é otimizado para entender prompts complexos com descrições ricas em detalhes artísticos e fotográficos.
            </p>
          </div>
        </div>
      </div>

      {/* ── Plans Comparison Modal ── */}
      <PlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
    </div>
  )
}
