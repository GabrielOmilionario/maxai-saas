'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { 
  Loader2, 
  Search, 
  User as UserIcon, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  KeyRound, 
  Check, 
  X, 
  AlertTriangle,
  Award,
  Zap,
  Edit,
  RefreshCw,
  UserPlus,
  Trash2,
  Upload
} from 'lucide-react'

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Search state
  const [search, setSearch] = useState('')

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  // Plan editing states
  const [editingPlanUser, setEditingPlanUser] = useState(null)
  const [editPlanName, setEditPlanName] = useState('Free')
  const [editCreditLimit, setEditCreditLimit] = useState(100)
  const [editExpiresAt, setEditExpiresAt] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  // Create user states
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [createUserName, setCreateUserName] = useState('')
  const [createUserEmail, setCreateUserEmail] = useState('')
  const [createUserPassword, setCreateUserPassword] = useState('')
  const [createUserPlan, setCreateUserPlan] = useState('Free')
  const [createUserCredits, setCreateUserCredits] = useState(100)
  const [createUserExpiresAt, setCreateUserExpiresAt] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)

  // Clean Storage state
  const [isCleaning, setIsCleaning] = useState(false)

  // Fetch all users and monthly usage
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        const errData = await res.json()
        setError(errData.error || 'Erro ao carregar usuários.')
      }
    } catch (err) {
      setError('Erro de conexão ao carregar painel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.email !== 'gabrieljesus2030@gmail.com') {
        router.push('/dashboard')
      } else {
        fetchUsers()
      }
    }
  }, [user, profile, authLoading, router])

  // Reset password handler
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!selectedUser || !newPassword || newPassword.trim().length < 6) return
    
    setResettingPassword(true)
    setError(null)
    setSuccess(null)
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          userId: selectedUser.id,
          newPassword: newPassword
        })
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess(`Senha do usuário ${selectedUser.email} redefinida com sucesso!`)
        setPasswordModalOpen(false)
        setNewPassword('')
        setSelectedUser(null)
      } else {
        setError(data.error || 'Falha ao redefinir senha.')
      }
    } catch (err) {
      setError('Erro de conexão.')
    } finally {
      setResettingPassword(false)
    }
  }

  // Plan update handler
  const handleUpdatePlan = async (e) => {
    e.preventDefault()
    if (!editingPlanUser) return

    setSavingPlan(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePlan',
          userId: editingPlanUser.id,
          plan: editPlanName,
          creditLimit: editCreditLimit,
          expiresAt: editExpiresAt || null
        })
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess(`Plano de ${editingPlanUser.name} atualizado com sucesso!`)
        setEditingPlanUser(null)
        fetchUsers()
      } else {
        setError(data.error || 'Falha ao atualizar plano.')
      }
    } catch (err) {
      setError('Erro de conexão.')
    } finally {
      setSavingPlan(false)
    }
  }

  // Create user handler
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreatingUser(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createUser',
          name: createUserName,
          email: createUserEmail,
          password: createUserPassword,
          plan: createUserPlan,
          creditLimit: createUserCredits,
          expiresAt: createUserExpiresAt || null
        })
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess(`Usuário ${createUserName} criado com sucesso!`)
        setCreateUserModalOpen(false)
        setCreateUserName('')
        setCreateUserEmail('')
        setCreateUserPassword('')
        setCreateUserPlan('Free')
        setCreateUserCredits(100)
        setCreateUserExpiresAt('')
        fetchUsers()
      } else {
        setError(data.error || 'Falha ao criar usuário.')
      }
    } catch (err) {
      setError('Erro de conexão ao criar usuário.')
    } finally {
      setCreatingUser(false)
    }
  }

  // Quick Plan Presets
  const applyPlanPreset = (presetName) => {
    setEditPlanName(presetName)
    if (presetName === 'Free') setEditCreditLimit(100)
    if (presetName === 'Iniciante') setEditCreditLimit(3000)
    if (presetName === 'Criador') setEditCreditLimit(6000)
    if (presetName === 'Empresas') setEditCreditLimit(20000)
  }

  // Quick Plan Presets for Create User
  const applyCreateUserPlanPreset = (presetName) => {
    setCreateUserPlan(presetName)
    if (presetName === 'Free') setCreateUserCredits(100)
    if (presetName === 'Iniciante') setCreateUserCredits(3000)
    if (presetName === 'Criador') setCreateUserCredits(6000)
    if (presetName === 'Empresas') setCreateUserCredits(20000)
  }

  // Clean Storage handler
  const handleCleanStorage = async () => {
    if (!window.confirm("ATENÇÃO: Você está prestes a esvaziar todos os vídeos e fotos gerados, bem como os caches de mídia do servidor. Essa ação NÃO PODE ser desfeita. Deseja continuar?")) {
      return
    }

    setIsCleaning(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/clean-storage', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSuccess(data.message || 'Armazenamento limpo com sucesso!')
        fetchUsers()
      } else {
        setError(data.error || 'Falha ao limpar armazenamento.')
      }
    } catch (err) {
      setError('Erro de conexão ao limpar armazenamento.')
    } finally {
      setIsCleaning(false)
    }
  }

  // Initials helper
  const getUserInitials = (name) => {
    if (!name) return 'US'
    const parts = name.trim().split(' ')
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase()
  }

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.plan?.toLowerCase().includes(term)
    )
  })

  // Statistics calculation
  const totalUsers = users.length
  const activeSubs = users.filter(u => u.plan && u.plan.toLowerCase() !== 'free').length
  const totalMonthlyGens = users.reduce((acc, curr) => acc + (curr.monthly_generations || 0), 0)

  if (authLoading || !user || user.email !== 'gabrieljesus2030@gmail.com') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#08080D]">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08080D] text-white overflow-y-auto chat-scroll px-6 py-8 select-none relative">
      
      {/* Background Glow */}
      <div className="absolute top-[-5%] left-[20%] w-[600px] h-[500px] bg-[#7C3AED]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#7C3AED]" />
            Painel do Administrador
          </h1>
          <p className="text-sm text-white/60 mt-1.5">
            Gerenciamento geral da plataforma, controle de assinaturas e auditoria de usuários.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleCleanStorage}
            disabled={isCleaning}
            className="h-[42px] px-5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[13px] font-semibold rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50"
            title="Esvaziar banco de mídias"
          >
            {isCleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Esvaziar Storage
          </button>
          <button
            onClick={() => setCreateUserModalOpen(true)}
            className="h-[42px] px-5 bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_15px_rgba(124,58,237,0.3)] text-white text-[13px] font-semibold rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Criar Usuário
          </button>
          <Link
            href="./migrar"
            className="h-[42px] px-5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-[13px] font-semibold rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2 backdrop-blur-md"
            title="Migrar usuários da plataforma antiga"
          >
            <Upload className="w-4 h-4" />
            Migrar Usuários
          </Link>
          <button
            onClick={fetchUsers}
            className="h-[42px] px-5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white text-[13px] font-semibold rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar Dados
          </button>
        </div>
      </div>

      {/* Error and Success Notifications */}
      {error && (
        <div className="relative z-10 mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[14px] font-medium animate-fade-in backdrop-blur-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="relative z-10 mb-6 flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-[14px] font-medium animate-fade-in backdrop-blur-sm">
          <Check className="w-5 h-5 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Card 1 */}
        <div className="h-[120px] rounded-[24px] bg-white/[0.03] border border-white/[0.08] p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-xl group hover:border-white/15 transition-all">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#22D3EE]/15 blur-[50px] rounded-full transition-colors"></div>
          <div className="flex items-center justify-between z-10">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white/60">Usuários Registrados</p>
            <UserIcon className="w-5 h-5 text-[#22D3EE]" />
          </div>
          <p className="text-[42px] font-[800] text-white leading-none mt-2 z-10">{loading ? '...' : totalUsers}</p>
        </div>

        {/* Card 2 */}
        <div className="h-[120px] rounded-[24px] bg-white/[0.03] border border-white/[0.08] p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-xl group hover:border-white/15 transition-all">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#F59E0B]/15 blur-[50px] rounded-full transition-colors"></div>
          <div className="flex items-center justify-between z-10">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white/60">Assinaturas Ativas</p>
            <Award className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <p className="text-[42px] font-[800] text-white leading-none mt-2 z-10">{loading ? '...' : activeSubs}</p>
        </div>

        {/* Card 3 */}
        <div className="h-[120px] rounded-[24px] bg-white/[0.03] border border-white/[0.08] p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-xl group hover:border-white/15 transition-all">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#7C3AED]/20 blur-[50px] rounded-full transition-colors"></div>
          <div className="flex items-center justify-between z-10">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white/60">Gerações no Mês (Geral)</p>
            <Sparkles className="w-5 h-5 text-[#A78BFA]" />
          </div>
          <p className="text-[42px] font-[800] text-white leading-none mt-2 z-10">{loading ? '...' : totalMonthlyGens}</p>
        </div>
      </div>

      {/* Main Content Card (Users Table Area) */}
      <div className="relative z-10 flex-1 min-h-[500px] rounded-[24px] bg-white/[0.02] border border-white/[0.06] p-6 backdrop-blur-xl flex flex-col shadow-2xl">
        
        {/* Table Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou plano..."
              className="w-full h-[48px] bg-white/[0.03] border border-transparent focus:border-white/10 rounded-[16px] pl-11 pr-4 text-[14px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-white/40 text-[13px] font-medium self-center">
            Exibindo <strong className="text-white">{filteredUsers.length}</strong> de <strong className="text-white">{users.length}</strong> usuários
          </span>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-x-auto chat-scroll rounded-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
              <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
              <span className="text-white/40 text-[13px] font-medium">Carregando dados dos usuários...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center">
                <Search className="w-6 h-6 text-white/20" />
              </div>
              <span className="text-[14px] text-white/40 font-medium">Nenhum usuário correspondente encontrado</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase font-bold tracking-wider text-white/40">
                  <th className="pb-4 pl-4">Usuário</th>
                  <th className="pb-4">Plano</th>
                  <th className="pb-4 w-[180px]">Uso de Créditos</th>
                  <th className="pb-4">Gerações (Mês)</th>
                  <th className="pb-4">Cadastro</th>
                  <th className="pb-4 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredUsers.map((u) => {
                  const isUserAdmin = u.email === 'gabrieljesus2030@gmail.com'
                  const pName = u.plan?.toLowerCase() || 'free'
                  
                  // Progress calculation
                  const percentage = isUserAdmin ? 100 : Math.min(100, Math.max(0, ((u.credit_used || 0) / (u.credit_limit || 1)) * 100))
                  
                  // Plan Styles
                  let planClasses = 'bg-white/5 text-white/40' // Free default
                  let progressColor = 'bg-white/20' // Free default
                  
                  if (pName === 'iniciante') {
                    planClasses = 'bg-[#7C3AED]/15 text-[#A78BFA]'
                    progressColor = 'bg-[#7C3AED]'
                  } else if (pName === 'criador') {
                    planClasses = 'bg-[#F59E0B]/15 text-[#F59E0B]'
                    progressColor = 'bg-[#F59E0B]'
                  } else if (pName === 'empresas') {
                    planClasses = 'bg-[#22D3EE]/15 text-[#22D3EE]'
                    progressColor = 'bg-[#22D3EE]'
                  } else if (isUserAdmin) {
                     progressColor = 'bg-[#7C3AED]'
                  }

                  return (
                    <tr key={u.id} className="h-[72px] hover:bg-[#7C3AED]/[0.08] transition-all duration-200 group">
                      {/* Name & Email */}
                      <td className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-[32px] h-[32px] rounded-full bg-[#7C3AED] flex items-center justify-center text-[12px] font-bold text-white shrink-0 shadow-[0_0_10px_rgba(124,58,237,0.4)]">
                            {getUserInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[16px] font-semibold text-white truncate flex items-center gap-2">
                              {u.name || 'Usuário'}
                              {isUserAdmin && (
                                <span className="px-1.5 py-0.5 bg-[#7C3AED]/20 text-[#A78BFA] text-[10px] font-bold rounded">
                                  ADMIN
                                </span>
                              )}
                            </p>
                            <p className="text-[13px] text-white/65 truncate select-text mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Subscription Plan */}
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${planClasses}`}>
                          <Zap className="w-3 h-3" />
                          {u.plan || 'Free'}
                        </span>
                      </td>

                      {/* Credit Usage Progress Bar */}
                      <td className="pr-6">
                        <div className="flex flex-col justify-center gap-1.5 w-full">
                          <div className="flex items-center justify-between text-[13px] font-semibold">
                            {isUserAdmin ? (
                              <span className="text-white">Ilimitado</span>
                            ) : (
                              <>
                                <span className="text-white">{u.credit_used || 0}</span>
                                <span className="text-white/40">/ {u.credit_limit || 100}</span>
                              </>
                            )}
                          </div>
                          {!isUserAdmin && (
                            <div className="w-full h-[6px] bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${progressColor} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                           {isUserAdmin && (
                            <div className="w-full h-[6px] bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${progressColor} w-full`} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Monthly Generations count */}
                      <td className="text-[14px] font-semibold text-white">
                        {u.monthly_generations || 0}
                      </td>

                      {/* Registration Date */}
                      <td className="text-[13px] font-medium text-white/60">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => {
                              setEditingPlanUser(u)
                              setEditPlanName(u.plan || 'Free')
                              setEditCreditLimit(u.credit_limit || 100)
                              setEditExpiresAt(u.expires_at ? new Date(u.expires_at).toISOString().split('T')[0] : '')
                            }}
                            disabled={isUserAdmin}
                            className="h-[36px] px-3 bg-white/5 hover:bg-white/10 text-white font-medium text-[13px] rounded-[12px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                            title="Gerenciar Assinatura"
                          >
                             <Award className="w-4 h-4 text-white/70" />
                             Assinatura
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedUser(u)
                              setPasswordModalOpen(true)
                            }}
                            className="h-[36px] px-3 bg-white/5 hover:bg-white/10 text-white font-medium text-[13px] rounded-[12px] transition-colors cursor-pointer flex items-center gap-2"
                            title="Redefinir Senha"
                          >
                            <KeyRound className="w-4 h-4 text-white/70" />
                            Senha
                          </button>

                          <button
                            onClick={() => {
                              setEditingPlanUser(u)
                              setEditPlanName(u.plan || 'Free')
                              setEditCreditLimit(u.credit_limit || 100)
                              setEditExpiresAt(u.expires_at ? new Date(u.expires_at).toISOString().split('T')[0] : '')
                            }}
                            disabled={isUserAdmin}
                            className="h-[36px] px-3 bg-white/5 hover:bg-white/10 text-white font-medium text-[13px] rounded-[12px] transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Editar Usuário"
                          >
                            <Edit className="w-4 h-4 text-white/70" />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Plan Edit Modal */}
      {editingPlanUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08080D]/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-[420px] bg-[#111118] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-[#7C3AED]" />
                Gerenciar Assinatura
              </h3>
              <button 
                onClick={() => setEditingPlanUser(null)} 
                className="p-1.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePlan} className="p-6 space-y-5">
              <div className="bg-white/5 p-4 rounded-[16px] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1">Usuário</span>
                <p className="text-[14px] text-white font-bold">{editingPlanUser.name}</p>
                <p className="text-[12px] text-white/60 mt-0.5">{editingPlanUser.email}</p>
              </div>

              {/* Preset buttons */}
              <div className="space-y-3">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Planos Rápidos</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Free', label: 'Free (100 cr)' },
                    { name: 'Iniciante', label: 'Inic (3k cr)' },
                    { name: 'Criador', label: 'Cria (6k cr)' },
                    { name: 'Empresas', label: 'Empr (20k cr)' }
                  ].map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPlanPreset(p.name)}
                      className={`h-[42px] text-[12px] font-bold rounded-[14px] transition-all cursor-pointer border ${
                        editPlanName === p.name 
                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' 
                          : 'bg-white/5 border-transparent text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Settings */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Nome do Plano</label>
                  <input
                    type="text"
                    value={editPlanName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditPlanName(val);
                      if (val.toLowerCase() === 'free') setEditCreditLimit(100);
                      else if (val.toLowerCase() === 'iniciante') setEditCreditLimit(3000);
                      else if (val.toLowerCase() === 'criador') setEditCreditLimit(6000);
                      else if (val.toLowerCase() === 'empresas') setEditCreditLimit(20000);
                    }}
                    required
                    className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Créditos</label>
                  <input
                    type="number"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Data de Expiração (Opcional)</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlanUser(null)}
                  className="flex-1 h-[48px] bg-white/5 hover:bg-white/10 border border-white/5 text-white font-semibold rounded-[16px] text-[14px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="flex-1 h-[48px] bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_15px_rgba(124,58,237,0.3)] text-white font-bold rounded-[16px] text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08080D]/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-[420px] bg-[#111118] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#7C3AED]" />
                Redefinir Senha
              </h3>
              <button 
                onClick={() => { setPasswordModalOpen(false); setSelectedUser(null); setNewPassword('') }} 
                className="p-1.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-5">
               <div className="bg-white/5 p-4 rounded-[16px] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1">Usuário</span>
                <p className="text-[14px] text-white font-bold">{selectedUser.name}</p>
                <p className="text-[12px] text-white/60 mt-0.5">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setPasswordModalOpen(false); setSelectedUser(null); setNewPassword('') }}
                  className="flex-1 h-[48px] bg-white/5 hover:bg-white/10 border border-white/5 text-white font-semibold rounded-[16px] text-[14px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="flex-1 h-[48px] bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_15px_rgba(124,58,237,0.3)] text-white font-bold rounded-[16px] text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {createUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08080D]/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-[480px] bg-[#111118] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#7C3AED]" />
                Criar Novo Usuário
              </h3>
              <button 
                onClick={() => setCreateUserModalOpen(false)} 
                className="p-1.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Nome</label>
                  <input
                    type="text"
                    value={createUserName}
                    onChange={(e) => setCreateUserName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Email</label>
                  <input
                    type="email"
                    value={createUserEmail}
                    onChange={(e) => setCreateUserEmail(e.target.value)}
                    required
                    placeholder="Ex: joao@email.com"
                    className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Senha Inicial</label>
                <input
                  type="password"
                  value={createUserPassword}
                  onChange={(e) => setCreateUserPassword(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                />
              </div>

              {/* Preset buttons */}
              <div className="space-y-3">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Planos Rápidos</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Free', label: 'Free (100 cr)' },
                    { name: 'Iniciante', label: 'Inic (3k cr)' },
                    { name: 'Criador', label: 'Cria (6k cr)' },
                    { name: 'Empresas', label: 'Empr (20k cr)' }
                  ].map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyCreateUserPlanPreset(p.name)}
                      className={`h-[42px] text-[12px] font-bold rounded-[14px] transition-all cursor-pointer border ${
                        createUserPlan === p.name 
                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' 
                          : 'bg-white/5 border-transparent text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Plano</label>
                  <input
                    type="text"
                    value={createUserPlan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateUserPlan(val);
                      if (val.toLowerCase() === 'free') setCreateUserCredits(100);
                      else if (val.toLowerCase() === 'iniciante') setCreateUserCredits(3000);
                      else if (val.toLowerCase() === 'criador') setCreateUserCredits(6000);
                      else if (val.toLowerCase() === 'empresas') setCreateUserCredits(20000);
                    }}
                    required
                    className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Créditos</label>
                  <input
                    type="number"
                    value={createUserCredits}
                    onChange={(e) => setCreateUserCredits(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Data de Expiração (Opcional)</label>
                <input
                  type="date"
                  value={createUserExpiresAt}
                  onChange={(e) => setCreateUserExpiresAt(e.target.value)}
                  className="w-full h-[48px] bg-white/5 border border-white/5 focus:border-[#7C3AED]/50 rounded-[14px] px-4 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateUserModalOpen(false)}
                  className="flex-1 h-[48px] bg-white/5 hover:bg-white/10 border border-white/5 text-white font-semibold rounded-[16px] text-[14px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex-1 h-[48px] bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_15px_rgba(124,58,237,0.3)] text-white font-bold rounded-[16px] text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
