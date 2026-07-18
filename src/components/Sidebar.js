'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import {
  MessageSquare,
  Trash2,
  X,
  User as UserIcon,
  Mail,
  CreditCard,
  Calendar,
  Coins,
  LogOut,
  PanelLeftClose,
  ChevronRight,
  Plus,
  ShieldCheck,
  Clock
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { PLANS } from '@/lib/plans-meta'
import PlansModal from '@/components/PlansModal'

/* ──────────────── MAX AI logo ──────────────── */
const MaxLogo = ({ size = 24 }) => (
  <img
    src="/logo.png"
    alt="MAX AI"
    width={size}
    height={size}
    className="shrink-0 object-contain"
  />
)

/* ──────────────── SIDEBAR ──────────────── */
export default function Sidebar() {
  const { dict } = useI18n()
  const {
    user, profile, loading,
    sidebarOpen: isOpen, setSidebarOpen: setIsOpen,
    signOut, refreshProfile
  } = useAuth()

  const searchParams = useSearchParams()
  const activeSessionId = searchParams.get('sessionId')
  const router = useRouter()
  const pathname = usePathname()

  const [sessions, setSessions] = useState([])
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [plansModalOpen, setPlansModalOpen] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)

  const isHistoryPage = pathname?.includes('/history')

  /* ── Fetch sessions ── */
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions')
      if (res.ok) setSessions(await res.json())
    } catch (err) {
      console.error('Erro ao buscar sessões:', err)
    }
  }

  useEffect(() => {
    let timer
    if (user) {
      timer = setTimeout(() => {
        fetchSessions()
      }, 0)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [user, activeSessionId])

  /* ── Auto-open on desktop ── */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOpen(window.innerWidth >= 768)
    }
  }, [setIsOpen])

  /* ── Create session ── */
  const handleCreateSession = () => {
    router.push('/dashboard')
    if (window.innerWidth < 768) setIsOpen(false)
  }

  /* ── Delete session ── */
  const handleDeleteSession = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleting(id)
    try {
      const res = await fetch(`/api/chat/sessions?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchSessions()
        if (activeSessionId === id) router.push('/dashboard')
      }
    } catch (err) {
      console.error('Erro ao deletar sessão:', err)
    } finally {
      setIsDeleting(null)
    }
  }



  /* ── Logout ── */
  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  /* ── Helpers ── */
  const getUserInitials = () => {
    if (profile?.name) {
      const parts = profile.name.trim().split(' ')
      return parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase()
    }
    return 'US'
  }

  const getNextBillingDate = () => {
    if (!user?.created_at) return 'N/A'
    const d = new Date(user.created_at)
    d.setDate(d.getDate() + 30)
    return d.toLocaleDateString('pt-BR')
  }

  const isAdmin = profile?.email === 'gabrieljesus2030@gmail.com'
  const remainingCredits = isAdmin ? '∞' : (profile ? (profile.credit_limit - profile.credit_used) : 100)

  // Auto-open plans modal if user has 0 credits remaining
  useEffect(() => {
    if (profile && !isAdmin && (profile.credit_limit - profile.credit_used) <= 0 && !hasAutoOpened) {
      setPlansModalOpen(true)
      setHasAutoOpened(true)
    }
  }, [profile, isAdmin, hasAutoOpened])

  /* ── Tab config ── */
  const tabs = [
    { key: 'chat', label: dict.dashboard.chatTab, icon: MessageSquare },
    { key: 'history', label: dict.dashboard.historyTab || 'Histórico', icon: Clock },
  ]

  const renderSidebarContent = () => (
    <div
      className="flex flex-col h-full select-none"
      style={{
        background: '#0B0B12',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >

      {/* ── Logo Header ── */}
      <div
        className="flex items-center justify-between px-5 shrink-0 desktop-sidebar-header"
        style={{ height: '64px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <MaxLogo size={26} />
          <span
            className="font-bold text-white tracking-tight"
            style={{ fontSize: '16px', letterSpacing: '-0.02em' }}
          >
            MAX
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
          style={{ transition: 'all 0.2s ease' }}
          title="Fechar sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* ── New Chat button ── */}
      <div className="px-4 pt-4 pb-3 shrink-0 desktop-sidebar-newchat">
        <button
          onClick={handleCreateSession}
          className="flex items-center gap-3 w-full cursor-pointer justify-center desktop-sidebar-newchat-btn"
          style={{
            height: '48px',
            borderRadius: '16px',
            background: '#7C3AED',
            boxShadow: '0 0 15px rgba(124,58,237,0.3)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#6D28D9'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#7C3AED'
            e.currentTarget.style.boxShadow = '0 0 15px rgba(124,58,237,0.3)'
          }}
        >
          <Plus className="w-4 h-4 text-white" />
          <span>{dict.buttons.newChat}</span>
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="px-4 pb-3 shrink-0 desktop-sidebar-tabs">
        <div
          className="flex desktop-sidebar-tabs-inner"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            padding: '3px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = key === 'history' ? isHistoryPage : (!isHistoryPage && key === 'chat')
            return (
              <button
                key={key}
                onClick={() => {
                  if (key === 'history') {
                    router.push('/history')
                  } else {
                    router.push('/dashboard')
                  }
                  if (window.innerWidth < 768) setIsOpen(false)
                }}
                className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer desktop-sidebar-tab-btn"
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="desktop-sidebar-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />

      {/* ── Sessions / Gallery content ── */}
      <div className="flex-1 overflow-y-auto chat-scroll px-3 py-3 desktop-sidebar-sessions">

        {!isHistoryPage && (
          <>
            <p
              className="uppercase tracking-wider font-bold px-3 pt-1 pb-2 desktop-sidebar-section-label"
              style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}
            >
              Recentes
            </p>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <MessageSquare className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>
                  Nenhuma conversa ainda
                </span>
              </div>
            ) : (
              <div className="space-y-0.5 desktop-sidebar-sessions-list">
                {sessions.map((sess) => {
                  const isActive = activeSessionId === sess.id
                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        router.push(`/dashboard?sessionId=${sess.id}`)
                        if (window.innerWidth < 768) setIsOpen(false)
                      }}
                      className="group flex items-center gap-2.5 cursor-pointer desktop-sidebar-session-item"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        transition: 'all 0.15s ease',
                        background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                        fontWeight: isActive ? '500' : '400',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.background = 'transparent'
                        if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                      }}
                    >
                      <MessageSquare
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}
                      />
                      <span className="flex-1 truncate">{sess.title}</span>
                      <button
                        disabled={isDeleting === sess.id}
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all disabled:opacity-50 cursor-pointer"
                        style={{ color: 'rgba(255,255,255,0.3)', transition: 'all 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                        title="Deletar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── User Profile footer ── */}
      <div
        className="shrink-0 p-3 space-y-1 desktop-sidebar-footer"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {!loading && user && (
          <button
            onClick={() => {
              refreshProfile()
              setProfileModalOpen(true)
            }}
            className="flex items-center gap-3 w-full text-left cursor-pointer desktop-sidebar-profile-btn"
            style={{
              padding: '12px',
              borderRadius: '18px',
              transition: 'all 0.2s ease',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <div
              className="flex items-center justify-center text-white shrink-0"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #7C3AED, #6d28d9)',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
              }}
            >
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="truncate"
                style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}
              >
                {profile?.name || 'Usuário'}
              </p>
              <p
                className="truncate"
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}
              >
                {remainingCredits} {dict.dashboard.remainingCredits}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => {
              router.push('/admin')
              if (window.innerWidth < 768) setIsOpen(false)
            }}
            className="flex items-center gap-2.5 w-full text-left cursor-pointer desktop-sidebar-footer-action"
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#A78BFA',
              transition: 'all 0.2s ease',
              background: 'transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{dict.dashboard.adminPanel}</span>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full text-left cursor-pointer desktop-sidebar-footer-action"
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '500',
            color: 'rgba(255,255,255,0.35)',
            transition: 'all 0.2s ease',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f87171'
            e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{dict.buttons.logout}</span>
        </button>
      </div>


    </div>
  )

  /* ════════════════════════════════════════════
     RENDER: Mobile drawer + Desktop sidebar
     ════════════════════════════════════════════ */
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-30"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 w-[280px] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-full transition-all duration-300 ease-out overflow-hidden ${
          isOpen ? 'w-[280px] lg:w-[300px]' : 'w-0'
        }`}
      >
        <div className="w-[280px] lg:w-[300px] h-full">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* ── Profile Modal ── */}
      {profileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '16px' }}
          onClick={() => setProfileModalOpen(false)}
        >
          <div
            className="animate-scale-up mx-auto w-full max-w-[420px] md:max-w-[640px] max-h-[90vh] md:max-h-none overflow-y-auto overflow-x-hidden p-4 md:p-6 relative"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '24px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 0 80px rgba(124,58,237,0.08)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 md:mb-6 w-full">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <UserIcon className="w-6 h-6 md:w-7 md:h-7 shrink-0" style={{ color: '#A78BFA', strokeWidth: 2 }} />
                <h3 className="text-[18px] md:text-[22px] font-bold text-white m-0 truncate">
                  Detalhes do Perfil
                </h3>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-250 ease-in-out shrink-0 ml-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex flex-col w-full min-w-0 gap-3 md:gap-3">
              
              {/* NOME */}
              <div 
                className="flex items-center gap-4 md:gap-5 p-4 md:p-5 rounded-[16px] md:rounded-[18px] transition-all duration-250 ease-in-out box-border w-full min-w-0 min-h-[80px] md:h-[96px]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <UserIcon className="w-6 h-6 shrink-0" style={{ color: '#A78BFA', strokeWidth: 2 }} />
                <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-[4px]">
                  <span className="text-[11px] md:text-[12px] font-bold tracking-[0.08em] uppercase text-white/35">
                    NOME
                  </span>
                  <span className="text-[16px] md:text-[18px] font-bold text-white break-words whitespace-normal line-clamp-2 md:line-clamp-none md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
                    {profile?.name || 'Test User'}
                  </span>
                </div>
              </div>

              {/* E-MAIL */}
              <div 
                className="flex items-center gap-4 md:gap-5 p-4 md:p-5 rounded-[16px] md:rounded-[18px] transition-all duration-250 ease-in-out box-border w-full min-w-0 min-h-[80px] md:h-[96px]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Mail className="w-6 h-6 shrink-0" style={{ color: '#8B5CF6', strokeWidth: 2 }} />
                <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-[4px]">
                  <span className="text-[11px] md:text-[12px] font-bold tracking-[0.08em] uppercase text-white/35">
                    E-MAIL
                  </span>
                  <span className="text-[16px] md:text-[18px] font-bold text-white break-words whitespace-normal md:whitespace-nowrap md:overflow-hidden md:text-ellipsis" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {user?.email || 'testuser_555888@gmail.com'}
                  </span>
                </div>
              </div>

              {/* PLANO */}
              <div 
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 md:gap-5 p-4 md:p-5 rounded-[16px] md:rounded-[18px] transition-all duration-250 ease-in-out box-border w-full min-w-0 min-h-[80px] md:h-[96px]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
                  <CreditCard className="w-6 h-6 shrink-0" style={{ color: '#22D3EE', strokeWidth: 2 }} />
                  <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-[4px]">
                    <span className="text-[11px] md:text-[12px] font-bold tracking-[0.08em] uppercase text-white/35">
                      PLANO
                    </span>
                    <span className="text-[16px] md:text-[18px] font-bold text-white break-words whitespace-normal md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
                      {(profile?.plan || 'Free').toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setProfileModalOpen(false)
                    setPlansModalOpen(true)
                  }}
                  className="h-[40px] px-[18px] rounded-[14px] font-semibold text-[14px] cursor-pointer transition-all duration-250 ease-in-out shrink-0 w-full sm:w-auto whitespace-nowrap mt-1 sm:mt-0"
                  style={{
                    background: 'rgba(124,58,237,0.15)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: '#A78BFA'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.25)'; e.currentTarget.style.transform = 'scale(1.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)'; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  Ver Planos
                </button>
              </div>

              {/* PRÓXIMA COBRANÇA */}
              <div 
                className="flex items-center gap-4 md:gap-5 p-4 md:p-5 rounded-[16px] md:rounded-[18px] transition-all duration-250 ease-in-out box-border w-full min-w-0 min-h-[80px] md:h-[96px]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Calendar className="w-6 h-6 shrink-0" style={{ color: '#00E676', strokeWidth: 2 }} />
                <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-[4px]">
                  <span className="text-[11px] md:text-[12px] font-bold tracking-[0.08em] uppercase text-white/35">
                    PRÓXIMA COBRANÇA
                  </span>
                  <span className="text-[16px] md:text-[18px] font-bold text-white break-words whitespace-normal md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
                    {getNextBillingDate() || '18/07/2026'}
                  </span>
                </div>
              </div>

              {/* CRÉDITOS */}
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 md:gap-5 p-4 md:p-5 rounded-[16px] md:rounded-[18px] transition-all duration-250 ease-in-out box-border w-full min-w-0 min-h-[90px] md:h-[110px] mb-1 md:mb-2"
                style={{
                  background: 'linear-gradient(90deg, rgba(124,58,237,0.12), rgba(124,58,237,0.04))',
                  border: '1px solid rgba(124,58,237,0.18)',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
                  <Coins className="w-6 h-6 shrink-0" style={{ color: '#A78BFA', strokeWidth: 2 }} />
                  <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-[4px]">
                    <span className="text-[11px] md:text-[12px] font-bold tracking-[0.08em] uppercase text-white/35">
                      CRÉDITOS
                    </span>
                    <span className="text-[16px] md:text-[18px] font-bold text-white break-words whitespace-normal md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
                      {isAdmin ? 'Ilimitado' : `${remainingCredits} / ${profile?.credit_limit || 100}`}
                    </span>
                  </div>
                </div>
                <div className="text-[14px] md:text-[16px] text-white/45 font-medium shrink-0 w-full sm:w-auto text-left sm:text-right mt-1 sm:mt-0 pl-10 sm:pl-0">
                  {isAdmin ? 'Ilimitado' : `${profile?.credit_used || 0} usados`}
                </div>
              </div>
            </div>

            {/* Footer / Fechar */}
            <div className="flex mt-3 md:mt-2 w-full md:w-auto md:justify-end">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="h-[48px] px-[22px] rounded-[14px] text-white text-[15px] font-semibold cursor-pointer transition-all duration-250 ease-in-out w-full md:w-auto shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}



      {/* ── Plans Comparison Modal ── */}
      <PlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
    </>
  )
}
