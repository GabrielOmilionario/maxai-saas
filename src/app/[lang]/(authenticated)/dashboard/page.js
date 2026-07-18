'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import CameraModal from '@/components/CameraModal'
import { PLANS } from '@/lib/plans-meta'
import PlansModal from '@/components/PlansModal'
import {
  ChevronDown,
  Sparkles,
  Plus,
  ArrowUp,
  Mic,
  Paperclip,
  Camera,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Download,
  AlertTriangle,
  RefreshCw,
  Video,
  Image as ImageIcon,
  X,
  Paintbrush,
  PanelLeftOpen,
  Loader2,
  ArrowRight,
  Coins,
  Search,
  Music,
  Code2,
  Wand2
} from 'lucide-react'

/* ──────────────── MAX LOGO ──────────────── */
const MaxLogo = ({ size = 32 }) => (
  <img
    src="/logo.png"
    alt="MAX AI"
    width={size}
    height={size}
    className="shrink-0 object-contain"
  />
)

/* ──────────────── MODEL CONFIG ──────────────── */
const MODELS = [
  { key: 'grok-3', label: 'Grok - Vídeo', icon: Video, accent: 'purple', type: 'video' },
  { key: 'veo-3.1-fast', label: 'Veo 3.1 Fast', icon: Video, accent: 'green', type: 'video' },
  { key: 'veo-3.1-lite', label: 'Veo 3.1 Lite', icon: Video, accent: 'teal', type: 'video' },
  { key: 'gpt-image', label: 'GPT Image-2', icon: Paintbrush, accent: 'blue', type: 'image' },
  { key: 'seedance-2', label: 'Seedance 2.0', icon: Video, accent: 'indigo', type: 'video' },
]

const QUICK_ACTIONS = [
  { model: 'gpt-image', text: 'Criar Imagem', icon: ImageIcon, prompt: 'Crie uma imagem de um dragão futurista voando entre prédios cyberpunk', isPro: false, accentColor: '#A78BFA' },
  { model: 'grok-3', text: 'Vídeo com IA', icon: Video, prompt: 'Crie um vídeo cinematográfico de um astronauta andando na lua de Marte', isPro: false, accentColor: '#A78BFA' },
]

/* ──────────────── DASHBOARD ──────────────── */
function DashboardContent() {
  const { profile, refreshProfile, sidebarOpen, setSidebarOpen } = useAuth()
  const { dict } = useI18n()
  const searchParams = useSearchParams()
  const activeSessionId = searchParams.get('sessionId')
  const router = useRouter()

  const [messages, setMessages] = useState([])
  const [prompt, setPrompt] = useState('')
  const [activeModel, setActiveModel] = useState('grok-3')
  const [plansModalOpen, setPlansModalOpen] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  // UI states
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [feedbackState, setFeedbackState] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  const [mediaDimensions, setMediaDimensions] = useState({})

  // Video extension states
  const [extendModalOpen, setExtendModalOpen] = useState(false)
  const [extendVideoId, setExtendVideoId] = useState(null)
  const [extendPrompt, setExtendPrompt] = useState('')
  const [extending, setExtending] = useState(false)

  // WhatsApp Popup state
  const [showWhatsappPopup, setShowWhatsappPopup] = useState(false)

  useEffect(() => {
    const hasClosed = localStorage.getItem('hasClosedWhatsappPopup')
    if (!hasClosed) {
      setShowWhatsappPopup(true)
    }
  }, [])

  const closeWhatsappPopup = () => {
    setShowWhatsappPopup(false)
    localStorage.setItem('hasClosedWhatsappPopup', 'true')
  }

  // Enforce max 1 attachment for Grok model
  useEffect(() => {
    if (activeModel === 'grok-3' && attachments.length > 1) {
      setAttachments(attachments.slice(0, 1))
      setError('O modelo Grok-3 suporta no máximo 1 imagem de referência. As imagens excedentes foram removidas.')
    }
  }, [activeModel, attachments])

  // Video generation parameters (Grok)
  const [videoAspectRatio, setVideoAspectRatio] = useState('landscape')
  const [videoResolution, setVideoResolution] = useState('480p')
  const [videoDuration, setVideoDuration] = useState(6)
  const [videoMode, setVideoMode] = useState('custom')

  // When switching models, reset resolution/duration to sensible defaults
  const handleModelChange = (key) => {
    setActiveModel(key)
    setModelDropdownOpen(false)
    if (key.includes('veo')) {
      setVideoResolution('720p')
      setVideoDuration(6)
      setVideoAspectRatio('16:9')
    } else if (key === 'grok-3') {
      setVideoResolution('480p')
      setVideoDuration(6)
      setVideoAspectRatio('landscape')
    } else if (key === 'seedance-2') {
      setVideoResolution('480p')
      setVideoDuration(5)
      setVideoAspectRatio('16:9')
    }
  }

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const textareaRef = useRef(null)
  const modelMenuRef = useRef(null)
  const modelDropdownRef = useRef(null)
  const isSendingRef = useRef(false)
  const isExtendingRef = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  /* ── Fetch messages ── */
  const fetchMessages = useCallback(async (silent = false) => {
    if (!activeSessionId) {
      setMessages([])
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${activeSessionId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        const stillProcessing = data.some(
          (m) => m.role === 'assistant' && (m.status === 'pending' || m.status === 'processing')
        )
        if (!stillProcessing) {
          setSending(false)
          isSendingRef.current = false
        }
      } else {
        const errData = await res.json()
        setError(errData.error || 'Erro ao carregar mensagens.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [activeSessionId])

  useEffect(() => {
    let timer = setTimeout(() => {
      fetchMessages()
      setPrompt('')
      setAttachments([])
      setModelMenuOpen(false)
      setModelDropdownOpen(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [activeSessionId, fetchMessages])

  useEffect(() => { scrollToBottom() }, [messages])

  /* ── Polling ── */
  useEffect(() => {
    const hasActiveJobs = messages.some(
      (m) => m.role === 'assistant' && (m.status === 'pending' || m.status === 'processing')
    )
    if (hasActiveJobs && activeSessionId) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchMessages(true)
          refreshProfile()
        }, 10000)
      }
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [messages, activeSessionId, fetchMessages, refreshProfile])

  /* ── File upload ── */
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (activeModel === 'grok-3' && attachments.length >= 1) {
      setError('O modelo Grok-3 suporta no máximo 1 imagem de referência.')
      setModelMenuOpen(false)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => setAttachments((p) => [...p, reader.result])
    reader.readAsDataURL(file)
    setModelMenuOpen(false)
  }

  /* ── Paste Image ── */
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (!file) continue

        if (activeModel === 'grok-3' && attachments.length >= 1) {
          setError('O modelo Grok-3 suporta no máximo 1 imagem de referência.')
          return
        }

        const reader = new FileReader()
        reader.onloadend = () => setAttachments((p) => [...p, reader.result])
        reader.readAsDataURL(file)
        break // Stop after first image paste
      }
    }
  }

  /* ── Extend Video Submit ── */
  const handleExtendSubmit = async (e) => {
    if (e) e.preventDefault()
    if (extending || isExtendingRef.current) return
    if (!extendPrompt.trim() || !extendVideoId) return

    const remainingCreditsVal = isAdmin ? 999999 : (profile ? (profile.credit_limit - profile.credit_used) : 100)
    if (!isAdmin && remainingCreditsVal <= 0) {
      setPlansModalOpen(true)
      setError('Você consumiu 100% dos seus créditos. Adquira um plano para continuar gerando.')
      return
    }

    setExtending(true)
    isExtendingRef.current = true
    setError(null)
    const promptToSend = `Estender vídeo: ${extendPrompt}`
    const extendVideoIdToSend = extendVideoId
    setExtendPrompt('')
    setExtendVideoId(null)
    setExtendModalOpen(false)

    try {
      let currentSessionId = activeSessionId
      if (!currentSessionId) return

      setMessages((prev) => [
        ...prev,
        {
          id: 'temp-user',
          role: 'user',
          text: promptToSend,
          attachments: [],
          created_at: new Date().toISOString(),
        },
        {
          id: 'temp-assistant',
          role: 'assistant',
          text: '',
          status: 'processing',
          model_name: 'grok-3',
          created_at: new Date().toISOString(),
        },
      ])

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          text: promptToSend,
          model: 'grok-3',
          attachments: [],
          extendVideoId: extendVideoIdToSend,
        }),
      })

      if (res.ok) {
        fetchMessages(true)
        refreshProfile()
      } else {
        const errData = await res.json()
        setError(errData.error || 'Erro ao processar extensão de vídeo.')
        fetchMessages()
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao estender vídeo.')
      fetchMessages()
    } finally {
      setExtending(false)
      isExtendingRef.current = false
    }
  }

  /* ── Send prompt ── */
  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (sending || isSendingRef.current) return
    if (!prompt.trim() && attachments.length === 0) return

    const remainingCreditsVal = isAdmin ? 999999 : (profile ? (profile.credit_limit - profile.credit_used) : 100)
    if (!isAdmin && remainingCreditsVal <= 0) {
      setPlansModalOpen(true)
      setError('Você consumiu 100% dos seus créditos. Adquira um plano para continuar gerando.')
      return
    }

    setError(null)
    setSending(true)
    isSendingRef.current = true
    const promptToSend = prompt
    const attachmentsToSend = attachments
    setPrompt('')
    setAttachments([])
    setModelMenuOpen(false)

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      let currentSessionId = activeSessionId
      let isNewSession = false

      if (!currentSessionId) {
        const sessionRes = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: promptToSend.substring(0, 40) + (promptToSend.length > 40 ? '...' : ''),
            model: activeModel,
          }),
        })
        if (sessionRes.ok) {
          const session = await sessionRes.json()
          currentSessionId = session.id
          isNewSession = true
        } else {
          setError('Falha ao iniciar nova conversa.')
          setSending(false)
          isSendingRef.current = false
          return
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'temp-user',
          role: 'user',
          text: promptToSend,
          attachments: attachmentsToSend,
          created_at: new Date().toISOString(),
        },
        {
          id: 'temp-assistant',
          role: 'assistant',
          text: '',
          status: 'processing',
          model_name: activeModel,
          created_at: new Date().toISOString(),
        },
      ])

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          text: promptToSend,
          model: activeModel,
          attachments: attachmentsToSend,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          duration: videoDuration,
          mode: videoMode,
        }),
      })

      if (res.ok) {
        if (isNewSession) {
          router.push(`/dashboard?sessionId=${currentSessionId}`)
        } else {
          fetchMessages(true)
          refreshProfile()
        }
      } else {
        let errMessage = 'Erro ao processar mensagem.'
        try {
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errData = await res.json()
            errMessage = errData.error || errMessage
          } else {
            errMessage = `Erro do servidor (${res.status}): A requisição demorou muito ou falhou.`
          }
        } catch (e) {
          console.error('Failed to parse error response:', e)
        }
        setError(errMessage)
        setSending(false)
        isSendingRef.current = false
        fetchMessages()
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao enviar.')
      setSending(false)
      isSendingRef.current = false
      fetchMessages()
    }
  }

  const handleCopyPrompt = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const getModelLabel = (key) => {
    const found = MODELS.find(m => m.key === key)
    return found?.label || 'MAX'
  }

  const getModelIcon = (key) => {
    if (key === 'gpt-image') return <Paintbrush className="w-3.5 h-3.5" />
    return <Video className="w-3.5 h-3.5" />
  }

  const isVideoModel = activeModel !== 'gpt-image'
  const isAdmin = profile?.email === 'gabrieljesus2030@gmail.com'
  const remainingCredits = isAdmin ? '∞' : (profile ? (profile.credit_limit - profile.credit_used) : 100)
  const isWelcome = !activeSessionId && messages.length === 0

  /* ── Compute estimated credit cost ── */
  const getEstimatedCost = () => {
    if (activeModel === 'seedance-2') {
      const dur = Number(videoDuration) || 5
      const hasRef = attachments.length > 0
      if (videoResolution === '720p') {
        return (hasRef ? 85 : 140) * dur
      } else {
        return (hasRef ? 40 : 65) * dur
      }
    } else if (activeModel.includes('veo')) {
      return 18
    } else if (activeModel === 'grok-3') {
      const dur = String(videoDuration)
      if (videoResolution === '720p') {
        if (dur === '6') return 80
        if (dur === '10') return 105
        if (dur === '15') return 130
        return 80
      } else {
        // 480p
        if (dur === '6') return 55
        if (dur === '10') return 80
        if (dur === '15') return 105
        return 55
      }
    } else {
      return 25
    }
  }
  const estimatedCost = getEstimatedCost()

  /* ── Get media orientation class from dimensions ── */
  const getMediaStyle = (msgId) => {
    const dims = mediaDimensions[msgId]
    if (!dims) return { maxWidth: '480px' }
    const ratio = dims.width / dims.height
    if (Math.abs(ratio - 1) < 0.05) return { maxWidth: '500px' }
    if (ratio > 1) return { maxWidth: '600px' }
    return { maxWidth: '340px' }
  }

  /* ── Auto-resize textarea ── */
  const handleTextareaChange = (e) => {
    setPrompt(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (modelMenuOpen && modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        if (e.target.tagName === 'OPTION' || e.target.tagName === 'SELECT') return
        setModelMenuOpen(false)
      }
      if (modelDropdownOpen && modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setModelDropdownOpen(false)
      }
    }
    if (modelMenuOpen || modelDropdownOpen) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [modelMenuOpen, modelDropdownOpen])

  /* ═══════════════════════════════════════════
     PROMPT INPUT
     ═══════════════════════════════════════════ */
  const renderPromptInput = (maxWidth = '900px') => (
    <div className="desktop-input-pill" style={{ width: '100%', maxWidth, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Prompt pill */}
      <div className="chat-input-pill flex flex-col relative" style={{ padding: '10px 10px 10px 10px' }}>

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div
            className="flex gap-2 pb-3 mb-3 overflow-x-auto no-scrollbar"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {attachments.map((url, idx) => (
              <div
                key={idx}
                className="relative shrink-0 overflow-hidden"
                style={{ width: '52px', height: '52px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  className="absolute top-0 right-0 p-1 text-white"
                  style={{ background: 'rgba(0,0,0,0.7)', borderBottomLeftRadius: '6px' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">

          {/* Upload button */}
          <div className="relative shrink-0" ref={modelMenuRef}>
            <button
              type="button"
              onClick={() => setModelMenuOpen(!modelMenuOpen)}
              className="upload-btn"
              title="Adicionar"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Floating menu */}
            {modelMenuOpen && (
              <div
                className="absolute bottom-full left-0 mb-3 animate-slide-up text-left"
                style={{
                  width: '300px',
                  background: '#17171F',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  padding: '12px',
                  zIndex: 40,
                }}
              >
                <button
                  onClick={() => { setCameraOpen(true); setModelMenuOpen(false) }}
                  className="flex items-center gap-3 w-full text-left cursor-pointer"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'rgba(255,255,255,0.75)',
                    transition: 'all 0.15s ease',
                    marginBottom: '2px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <Camera className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </div>
                  <span>Câmera</span>
                </button>

                <button
                  onClick={() => { fileInputRef.current?.click(); setModelMenuOpen(false) }}
                  className="flex items-center gap-3 w-full text-left cursor-pointer"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'rgba(255,255,255,0.75)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <ImageIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </div>
                  <span>Fotos</span>
                </button>

                {/* Grok Settings */}
                {activeModel === 'grok-3' && (
                  <div
                    className="space-y-3 mt-3 pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', padding: '0 4px' }}>
                      Configurações do Grok
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Proporção', value: videoAspectRatio, onChange: setVideoAspectRatio, options: [['landscape','Horizontal (16:9)'],['portrait','Vertical (9:16)'],['square','Quadrado (1:1)'],['vertical','Retrato (2:3)'],['horizontal','Paisagem (3:2)']] },
                        { label: 'Resolução', value: videoResolution, onChange: setVideoResolution, options: [['480p','480p'],['720p','720p']] },
                        { label: 'Duração', value: videoDuration, onChange: (v) => setVideoDuration(Number(v)), options: [[6,'6 segundos'],[10,'10 segundos'],[15,'15 segundos']] },
                        { label: 'Modo', value: videoMode, onChange: setVideoMode, options: [['custom','Customizado'],['normal','Normal'],['extremely-crazy','Crazy (Fun)'],['extremely-spicy-or-crazy','Spicy (Crazy)']] },
                      ].map(({ label, value, onChange, options }) => (
                        <div key={label} className="space-y-1">
                          <label style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', display: 'block' }}>{label}</label>
                          <select
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full focus:outline-none cursor-pointer"
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.85)',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              transition: 'border-color 0.2s ease',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                          >
                            {options.map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Veo Settings */}
                {activeModel.includes('veo') && (
                  <div
                    className="space-y-3 mt-3 pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', padding: '0 4px' }}>
                      Configurações do {activeModel === 'veo-3.1-fast' ? 'Veo 3.1 Fast' : 'Veo 3.1 Lite'}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1 col-span-2">
                        <label style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', display: 'block' }}>Aspect Ratio</label>
                        <div className="flex gap-2 items-end">
                          <button
                            type="button"
                            onClick={() => setVideoAspectRatio('16:9')}
                            style={{
                              width: '100px', height: '70px',
                              border: videoAspectRatio === '16:9' ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                              color: 'rgba(255,255,255,0.85)',
                              transition: 'all 0.2s',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ width: '40px', height: '24px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon className="w-3 h-3 opacity-50" />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600' }}>16:9</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVideoAspectRatio('9:16')}
                            style={{
                              width: '60px', height: '80px',
                              border: videoAspectRatio === '9:16' ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                              color: 'rgba(255,255,255,0.85)',
                              transition: 'all 0.2s',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ width: '24px', height: '40px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon className="w-3 h-3 opacity-50" />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600' }}>9:16</span>
                          </button>
                        </div>
                      </div>

                      {[
                        { label: 'Resolução', value: videoResolution, onChange: setVideoResolution, options: [['720p','720p HD'],['1080p','1080p Full HD']] },
                        { label: 'Duração', value: videoDuration, onChange: (v) => setVideoDuration(Number(v)), options: [[4,'4 segundos'],[6,'6 segundos'],[8,'8 segundos']] },
                      ].map(({ label, value, onChange, options }) => (
                        <div key={label} className="space-y-1">
                          <label style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', display: 'block' }}>{label}</label>
                          <select
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full focus:outline-none cursor-pointer"
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.85)',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              transition: 'border-color 0.2s ease',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                          >
                            {options.map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', padding: '0 2px' }}>
                      🎥 Custo: <strong style={{ color: '#10b981' }}>18 créditos</strong>
                    </p>
                  </div>
                )}

                {/* Seedance Settings */}
                {activeModel === 'seedance-2' && (
                  <div
                    className="space-y-3 mt-3 pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', padding: '0 4px' }}>
                      Configurações do Seedance
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Proporção', value: videoAspectRatio, onChange: setVideoAspectRatio, options: [['16:9','Horizontal (16:9)'],['9:16','Vertical (9:16)'],['1:1','Quadrado (1:1)'],['4:3','Horizontal (4:3)'],['3:4','Vertical (3:4)'],['21:9','Cinemático (21:9)'],['adaptive','Adaptativo']] },
                        { label: 'Resolução', value: videoResolution, onChange: setVideoResolution, options: [['480p','480p'],['720p','720p']] },
                        { label: 'Duração', value: videoDuration, onChange: (v) => setVideoDuration(Number(v)), options: [[4,'4 segundos'],[5,'5 segundos'],[10,'10 segundos'],[15,'15 segundos']] },
                      ].map(({ label, value, onChange, options }) => (
                        <div key={label} className="space-y-1">
                          <label style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', display: 'block' }}>{label}</label>
                          <select
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full focus:outline-none cursor-pointer"
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.85)',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              transition: 'border-color 0.2s ease',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                          >
                            {options.map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />


          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            onPaste={handlePaste}
            disabled={sending}
            placeholder={isVideoModel ? dict.dashboard.describePromptVideo : dict.dashboard.describePromptImage}
            rows={1}
            className="flex-1 bg-transparent border-0 focus:outline-none resize-none leading-relaxed py-2 min-h-[28px] max-h-[160px] disabled:opacity-50"
            style={{
              fontSize: '15px',
              color: '#FFFFFF',
              caretColor: '#A78BFA',
            }}
          />

          {/* Send / Mic button */}
          <div className="shrink-0">
            {sending ? (
              <button
                disabled
                className="flex items-center justify-center cursor-not-allowed"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '999px',
                  background: 'rgba(124,58,237,0.15)',
                  color: '#A78BFA',
                }}
                title="Gerando..."
              >
                <Loader2 className="w-5 h-5 animate-spin" />
              </button>
            ) : prompt.trim() || attachments.length > 0 ? (
              <button
                onClick={handleSend}
                className="flex items-center justify-center transition-all"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  color: '#000000',
                  boxShadow: '0 4px 16px rgba(255,255,255,0.15)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,255,255,0.15)' }}
                title="Enviar"
              >
                <ArrowUp className="w-5 h-5" style={{ strokeWidth: 2.5 }} />
              </button>
            ) : (
              <button
                className="flex items-center justify-center transition-all cursor-pointer"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                title="Microfone"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cost estimate */}
      <div
        className="flex items-center justify-center gap-2 select-none"
        style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}
      >
        <Coins className="w-3.5 h-3.5" style={{ color: '#A78BFA' }} />
        <span>Esta geração custará <strong style={{ color: '#A78BFA' }}>{estimatedCost}</strong> créditos</span>
      </div>

      {/* Disclaimer */}
      <p
        className="text-center select-none"
        style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      >
        <Sparkles className="w-3 h-3" style={{ color: 'rgba(124,58,237,0.6)' }} />
        {dict.dashboard.disclaimer}
      </p>
    </div>
  )

  /* ═══════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════ */
  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ background: '#0B0B0F', color: '#FFFFFF' }}
    >

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between shrink-0 px-4 md:px-6 desktop-header"
        style={{
          height: '64px',
          background: 'rgba(11,11,15,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          zIndex: 10,
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 desktop-header-left-group">
          {/* Sidebar toggle */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center transition-colors cursor-pointer"
              style={{
                padding: '8px',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              title="Abrir sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden flex items-center justify-center transition-colors cursor-pointer"
              style={{
                padding: '8px',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              title="Fechar sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}

          {/* Search icon */}
          <button
            className="hidden md:flex items-center justify-center transition-colors cursor-pointer"
            style={{
              padding: '8px',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent' }}
            title="Pesquisar"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Model selector */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-2 cursor-pointer desktop-model-selector"
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                fontSize: '13px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.85)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'rgba(124,58,237,0.2)',
                  color: '#A78BFA',
                }}
              >
                {getModelIcon(activeModel)}
              </div>
              <span>{getModelLabel(activeModel)}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            </button>

            {modelDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-2 animate-fade-in"
                style={{
                  width: '220px',
                  background: '#17171F',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                  padding: '6px',
                  zIndex: 30,
                }}
              >
                {MODELS.map(({ key, label, cost, icon: Icon }) => {
                  const isLocked = false
                  return (
                    <button
                      key={key}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (isLocked) { setPlansModalOpen(true); setModelDropdownOpen(false) }
                        else { handleModelChange(key) }
                      }}
                      className="flex items-center justify-between w-full cursor-pointer"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.15s ease',
                        background: activeModel === key ? 'rgba(124,58,237,0.12)' : 'transparent',
                        color: activeModel === key ? '#A78BFA' : 'rgba(255,255,255,0.7)',
                      }}
                      onMouseEnter={e => { if (activeModel !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { if (activeModel !== key) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="flex items-center gap-1.5">
                        {label}
                        {isLocked && (
                          <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>PRO</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span style={{ fontSize: '11px' }}>{cost} cr</span>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 desktop-header-right-group">
          {/* Credits */}
          <div
            className="hidden sm:flex items-center gap-2 credits-badge cursor-pointer"
            onClick={() => setPlansModalOpen(true)}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#A78BFA' }} />
            <span>{remainingCredits} créditos</span>
          </div>

          {/* Plus */}
          <button
            onClick={() => router.push('/dashboard')}
            className="header-plus-btn"
            title="Nova Conversa"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Main scroll area ── */}
      <div className="flex-1 overflow-y-auto chat-scroll flex flex-col" style={{ position: 'relative' }}>

        {/* Error banner */}
        {error && (
          <div className="w-full max-w-[800px] mx-auto px-4 pt-4 desktop-error-banner">
            <div
              className="flex items-center gap-3 text-xs animate-fade-in"
              style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.12)',
                color: '#f87171',
                borderRadius: '12px',
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="p-1 rounded cursor-pointer transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Welcome screen ── */}
        {isWelcome ? (
          <div
            className="flex-1 flex flex-col items-center justify-center px-4"
            style={{
              minHeight: 'calc(100vh - 64px)',
              background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.1) 0%, transparent 70%)',
            }}
          >
            <div
              className="flex flex-col items-center animate-fade-in desktop-welcome-container"
              style={{ width: '100%', maxWidth: '800px', gap: '32px' }}
            >

              {/* Hero Icon */}
              <div
                className="hero-icon-card animate-icon-glow animate-float"
              >
                <MaxLogo size={40} />
              </div>

              {/* Headline */}
              <div className="text-center" style={{ gap: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h1
                  className="text-white font-bold text-center"
                  style={{
                    fontSize: 'clamp(28px, 4vw, 52px)',
                    fontWeight: '700',
                    letterSpacing: '-0.035em',
                    lineHeight: '1.15',
                  }}
                >
                  {dict.dashboard.whatToCreate}
                </h1>
                <p
                  className="text-center"
                  style={{
                    fontSize: '17px',
                    color: 'rgba(255,255,255,0.55)',
                    maxWidth: '520px',
                    lineHeight: '1.6',
                    fontWeight: '400',
                  }}
                >
                  {dict.dashboard.describeIdea}
                </p>
              </div>

              {/* Prompt input */}
              {renderPromptInput('860px')}

              {/* Quick action pills */}
              <div
                className="flex flex-wrap items-center justify-center"
                style={{ gap: '8px', width: '100%' }}
              >
                {QUICK_ACTIONS.map(({ model, text, icon: Icon, prompt: p, isPro, accentColor }) => {
                  const isLocked = false
                  return (
                    <button
                      key={`${model}-${text}`}
                      onClick={() => {
                        if (isLocked) {
                          setPlansModalOpen(true)
                        } else {
                          setActiveModel(model)
                          setPrompt(p)
                        }
                      }}
                      className="quick-action-btn"
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: accentColor, flexShrink: 0 }} />
                      <span>{model === 'gpt-image' ? dict.dashboard.createImageBtn : dict.dashboard.createVideoBtn}</span>
                      {isPro && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245,158,11,0.15)',
                            color: '#f59e0b',
                            marginLeft: '2px',
                          }}
                        >
                          PRO
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── Messages ── */
          <div className="flex-1">
            <div
              className="w-full mx-auto px-4 py-6 space-y-4 desktop-chat-messages"
              style={{ maxWidth: '768px', paddingBottom: '140px' }}
            >
              {loading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#A78BFA' }} />
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Carregando conversa...</span>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
                  >
                    {msg.role === 'user' ? (
                      /* User bubble */
                      <div className="flex flex-col items-end gap-2.5" style={{ maxWidth: '82%' }}>
                        {msg.attachments?.length > 0 && (
                          <div className="flex gap-2">
                            {msg.attachments.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt=""
                                className="object-cover"
                                style={{ width: '60px', height: '60px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                              />
                            ))}
                          </div>
                        )}
                        <div className="chat-bubble-user">
                          {msg.text}
                        </div>
                      </div>
                    ) : (
                      /* Assistant message */
                      <div className="flex items-start gap-3 w-full">
                        {/* Avatar */}
                        <div
                          className="flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '999px',
                            background: 'rgba(124,58,237,0.1)',
                            border: '1px solid rgba(124,58,237,0.15)',
                          }}
                        >
                          <Sparkles className="w-4 h-4" style={{ color: '#A78BFA' }} />
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          {msg.status === 'processing' || msg.status === 'pending' ? (
                            /* Loading state */
                            <div
                              className="space-y-3"
                              style={{
                                padding: '16px 20px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '16px',
                                maxWidth: '360px',
                              }}
                            >
                              <div className="flex items-center gap-2.5">
                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#A78BFA' }} />
                                <span style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
                                  {msg.status === 'pending' ? 'Na fila...' : 'Gerando...'}
                                </span>
                              </div>
                              <div
                                className="w-full h-1 overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px' }}
                              >
                                <div
                                  className="h-full animate-pulse-slow"
                                  style={{ width: '60%', background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderRadius: '999px' }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                                {getModelLabel(msg.model_name)} • Isso pode levar até 2 minutos
                              </span>
                            </div>
                          ) : msg.status === 'failed' ? (
                            /* Error state */
                            <div
                              className="flex items-start gap-3"
                              style={{
                                padding: '14px 16px',
                                background: 'rgba(239,68,68,0.05)',
                                border: '1px solid rgba(239,68,68,0.12)',
                                borderRadius: '14px',
                                maxWidth: '420px',
                              }}
                            >
                              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f87171' }} />
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: '600', color: '#f87171' }}>Geração falhou</p>
                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', lineHeight: '1.6' }}>
                                  {msg.error_msg || 'Erro na API. Créditos reembolsados.'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            /* Success: media + actions */
                            <div className="space-y-3">
                              <div
                                className="overflow-hidden"
                                style={{
                                  borderRadius: '16px',
                                  border: '1px solid rgba(255,255,255,0.07)',
                                  ...getMediaStyle(msg.id),
                                  background: 'rgba(0,0,0,0.2)',
                                  padding: '6px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                {msg.media_type === 'video' ? (
                                  <video
                                    src={msg.media_url}
                                    controls
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '75vh',
                                      width: 'auto',
                                      height: 'auto',
                                      objectFit: 'contain',
                                      borderRadius: '12px',
                                      display: 'block',
                                    }}
                                    onLoadedMetadata={(e) => {
                                      const v = e.currentTarget
                                      setMediaDimensions(prev => ({ ...prev, [msg.id]: { width: v.videoWidth, height: v.videoHeight } }))
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={msg.media_url}
                                    alt="Geração MAX AI"
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '75vh',
                                      width: 'auto',
                                      height: 'auto',
                                      objectFit: 'contain',
                                      borderRadius: '12px',
                                      display: 'block',
                                    }}
                                    loading="lazy"
                                    onLoad={(e) => {
                                      const img = e.currentTarget
                                      setMediaDimensions(prev => ({ ...prev, [msg.id]: { width: img.naturalWidth, height: img.naturalHeight } }))
                                    }}
                                  />
                                )}
                              </div>

                              {/* Action bar */}
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const actions = [
                                    {
                                      title: 'Copiar prompt',
                                      icon: copiedId === msg.id ? Check : Copy,
                                      color: copiedId === msg.id ? '#34d399' : '',
                                      onClick: () => handleCopyPrompt(
                                        messages.find((m, i) => messages[i + 1]?.id === msg.id && m.role === 'user')?.text || '',
                                        msg.id
                                      ),
                                    },
                                    {
                                      title: 'Baixar',
                                      icon: Download,
                                      onClick: () => handleDownload(msg.media_url, `max-${msg.id}.${msg.media_type === 'video' ? 'mp4' : 'png'}`),
                                    },
                                  ]

                                  if (msg.media_type === 'video' && msg.external_id) {
                                    actions.push({
                                      title: 'Estender Vídeo',
                                      icon: Sparkles,
                                      color: '#A78BFA',
                                      onClick: () => {
                                        setExtendVideoId(msg.external_id)
                                        setExtendModalOpen(true)
                                      }
                                    })
                                  }

                                  actions.push(
                                    {
                                      title: 'Gostei',
                                      icon: ThumbsUp,
                                      color: feedbackState[msg.id] === 'like' ? '#34d399' : '',
                                      onClick: () => setFeedbackState({ ...feedbackState, [msg.id]: 'like' }),
                                    },
                                    {
                                      title: 'Não gostei',
                                      icon: ThumbsDown,
                                      color: feedbackState[msg.id] === 'dislike' ? '#f87171' : '',
                                      onClick: () => setFeedbackState({ ...feedbackState, [msg.id]: 'dislike' }),
                                    }
                                  )

                                  return actions.map(({ title, icon: Icon, color = '', onClick }) => (
                                    <button
                                      key={title}
                                      onClick={onClick}
                                      className="cursor-pointer transition-all"
                                      style={{
                                        padding: '7px',
                                        borderRadius: '8px',
                                        color: color || 'rgba(255,255,255,0.3)',
                                        transition: 'all 0.15s ease',
                                      }}
                                      onMouseEnter={e => { if (!color) e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                                      onMouseLeave={e => { if (!color) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
                                      title={title}
                                    >
                                      <Icon className="w-4 h-4" />
                                    </button>
                                  ))
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer input (chat view only) ── */}
      {!isWelcome && (
        <div
          className="shrink-0 px-4 pt-4 desktop-footer-input"
          style={{
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            background: 'linear-gradient(to top, #0B0B0F 70%, transparent)',
          }}
        >
          {renderPromptInput('760px')}
        </div>
      )}

      {/* Camera */}
      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(img) => {
          if (activeModel === 'grok-3' && attachments.length >= 1) {
            setError('O modelo Grok-3 suporta no máximo 1 imagem de referência.')
          } else {
            setAttachments((p) => [...p, img])
          }
        }}
      />

      {/* Extend Video Modal */}
      {extendModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-lg shadow-2xl space-y-4 animate-scale-up p-6"
            style={{
              background: '#17171F',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: '#A78BFA' }} /> Estender Vídeo com Grok-3
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px', lineHeight: '1.6' }}>
                  Continue a história deste vídeo adicionando um novo prompt.
                </p>
              </div>
              <button
                onClick={() => { setExtendModalOpen(false); setExtendVideoId(null); }}
                className="cursor-pointer"
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.4)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  className="block"
                  style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}
                >
                  Prompt de Continuação
                </label>
                <textarea
                  required
                  rows={3}
                  value={extendPrompt}
                  onChange={(e) => setExtendPrompt(e.target.value)}
                  placeholder="O que deve acontecer em seguida?..."
                  className="w-full resize-none focus:outline-none"
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: '#FFFFFF',
                    lineHeight: '1.6',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              <div
                className="flex justify-between items-center text-xs"
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <span>Custo da extensão:</span>
                <span style={{ fontWeight: '700', color: '#A78BFA' }}>20 créditos</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setExtendModalOpen(false); setExtendVideoId(null); }}
                  className="cursor-pointer font-semibold flex items-center justify-center"
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={extending || !extendPrompt.trim()}
                  className="cursor-pointer font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #7C3AED, #4f46e5)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {extending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Estendendo...
                    </>
                  ) : (
                    <>
                      Estender <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Plans Comparison Modal ── */}
      <PlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />

      {/* ── WhatsApp Group Popup ── */}
      {showWhatsappPopup && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl p-5 max-w-sm relative">
            <button
              onClick={closeWhatsappPopup}
              className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-white font-bold mb-1">Participe do nosso grupo!</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Fique por dentro das novidades, receba avisos e converse com nossa comunidade.
                </p>
                <a
                  href="https://chat.whatsapp.com/ET2LToi0nDoHYkiimKh7g6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors w-full text-center"
                >
                  Entrar no Grupo
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────── PAGE EXPORT ──────────────── */
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3"
        style={{ background: '#0B0B0F' }}
      >
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#A78BFA' }} />
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Carregando...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
