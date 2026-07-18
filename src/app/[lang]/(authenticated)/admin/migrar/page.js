'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  Upload,
  Users,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Play,
  Eye,
  Loader2,
  ArrowLeft,
  FileText,
  ShieldAlert,
  Info,
} from 'lucide-react'

// ─── Parser ────────────────────────────────────────────────────────────────
/**
 * Parses lines like:
 *   "1. email: foo@bar.com - Plano: Iniciante - Créditos atual: 3000 - Data de expiração da assinatura: Vence dia 10/07."
 * Returns array of { email, plan, credits, renewalDate } or null on parse failure.
 */
function parseUserList(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const results = []
  const errors = []

  for (const line of lines) {
    try {
      // Extract email
      const emailMatch = line.match(/email:\s*([^\s-]+)/i)
      if (!emailMatch) continue // skip non-data lines

      const email = emailMatch[1].toLowerCase().trim()

      // Extract plan
      const planMatch = line.match(/Plano:\s*([^-]+)/i)
      const plan = planMatch ? planMatch[1].trim() : null

      // Extract credits
      const creditsMatch = line.match(/Créditos\s+atual:\s*(\d+)/i)
      const credits = creditsMatch ? parseInt(creditsMatch[1], 10) : null

      // Extract renewal date "Vence dia DD/MM"
      const dateMatch = line.match(/Vence\s+dia\s+(\d{1,2}\/\d{1,2})/i)
      const renewalDate = dateMatch ? dateMatch[1].trim() : null

      if (!email || !plan || credits === null || !renewalDate) {
        errors.push({ line, reason: 'Campos obrigatórios ausentes' })
        continue
      }

      results.push({ email, plan, credits, renewalDate })
    } catch (e) {
      errors.push({ line, reason: e.message })
    }
  }

  return { users: results, parseErrors: errors }
}

// ─── CSV export ────────────────────────────────────────────────────────────
function exportCSV(results) {
  const header = 'Email,Ação,Status,Mensagem\n'
  const rows = results
    .map((r) => {
      const msg = r.message.replace(/"/g, '""')
      return `"${r.email}","${r.action}","${r.status}","${msg}"`
    })
    .join('\n')

  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `migracao_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status, action }) {
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle size={10} />
        Erro
      </span>
    )
  }
  if (action === 'created') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <UserPlus size={10} />
        Criado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <RefreshCw size={10} />
      Atualizado
    </span>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function MigratePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [rawText, setRawText] = useState('')
  const [parsedUsers, setParsedUsers] = useState([])
  const [parseErrors, setParseErrors] = useState([])

  // Preview state
  const [preview, setPreview] = useState(null) // { total, toCreate, toUpdate, toCreateList, toUpdateList }
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Migration state
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0) // 0-100
  const [progressLabel, setProgressLabel] = useState('')
  const [migrationResults, setMigrationResults] = useState(null) // { summary, results }
  const [migrationError, setMigrationError] = useState(null)

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false)

  // Filter for results table
  const [resultFilter, setResultFilter] = useState('all') // all | created | updated | error

  const textareaRef = useRef(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || user.email !== 'gabrieljesus2030@gmail.com')) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // ── Parse the text whenever it changes ───────────────────────────────────
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedUsers([])
      setParseErrors([])
      setPreview(null)
      return
    }
    const { users, parseErrors: errs } = parseUserList(rawText)
    setParsedUsers(users)
    setParseErrors(errs)
    setPreview(null) // reset preview on text change
    setMigrationResults(null)
  }, [rawText])

  // ── Preview handler ───────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!parsedUsers.length) return
    setLoadingPreview(true)
    setPreview(null)
    setMigrationError(null)

    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', users: parsedUsers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido')
      setPreview(data)
    } catch (e) {
      setMigrationError(e.message)
    } finally {
      setLoadingPreview(false)
    }
  }

  // ── Migration handler (with simulated progress) ───────────────────────────
  const handleMigrate = async () => {
    setShowConfirm(false)
    setMigrating(true)
    setProgress(0)
    setProgressLabel('Iniciando migração...')
    setMigrationResults(null)
    setMigrationError(null)

    // Simulate progress ticks while waiting for the API
    const total = parsedUsers.length
    let tick = 0
    const interval = setInterval(() => {
      tick++
      // Progress goes from 0 → 90 while waiting, last 10% on completion
      const simulated = Math.min(90, Math.round((tick / (total * 1.2)) * 90))
      setProgress(simulated)
      setProgressLabel(`Processando usuários... (estimado ${simulated}%)`)
    }, 300)

    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate', users: parsedUsers }),
      })
      const data = await res.json()

      clearInterval(interval)
      setProgress(100)
      setProgressLabel('Migração concluída!')

      if (!res.ok) throw new Error(data.error || 'Erro ao executar migração')

      setMigrationResults(data)
    } catch (e) {
      clearInterval(interval)
      setMigrationError(e.message)
      setProgressLabel('Erro na migração.')
    } finally {
      setMigrating(false)
    }
  }

  // ── Filtered results ──────────────────────────────────────────────────────
  const filteredResults = migrationResults?.results?.filter((r) => {
    if (resultFilter === 'all') return true
    if (resultFilter === 'error') return r.status === 'error'
    return r.action === resultFilter
  }) ?? []

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Upload size={24} className="text-violet-400" />
              Migração de Usuários
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              Cole a lista de usuários, analise e execute a migração com segurança.
            </p>
          </div>
        </div>

        {/* ── Info banner ─────────────────────────────────────────────────── */}
        <div className="flex gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong>Migração Idempotente:</strong> Usuários já existentes terão apenas plano, créditos e data de renovação atualizados.
            Novos usuários serão criados no Supabase Auth com perfil completo. O processo pode ser reexecutado com segurança.
          </div>
        </div>

        {/* ── Textarea ────────────────────────────────────────────────────── */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <FileText size={16} className="text-violet-400" />
              Lista de Usuários
            </div>
            {parsedUsers.length > 0 && (
              <span className="text-xs text-zinc-500">
                {parsedUsers.length} usuário(s) detectado(s)
                {parseErrors.length > 0 && (
                  <span className="ml-2 text-amber-400">· {parseErrors.length} linha(s) ignorada(s)</span>
                )}
              </span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Cole aqui a lista de usuários. Exemplo:\n1. email: user@email.com - Plano: Iniciante - Créditos atual: 3000 - Data de expiração da assinatura: Vence dia 10/07.`}
            className="w-full h-64 bg-transparent px-5 py-4 text-sm text-zinc-300 placeholder-zinc-600 font-mono resize-y focus:outline-none"
            disabled={migrating}
          />
        </div>

        {/* ── Parse errors ─────────────────────────────────────────────────── */}
        {parseErrors.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
              <AlertTriangle size={14} />
              {parseErrors.length} linha(s) não puderam ser interpretadas:
            </div>
            <ul className="text-xs text-amber-300/70 space-y-1 font-mono">
              {parseErrors.map((e, i) => (
                <li key={i} className="truncate">
                  <span className="text-amber-400">· </span>{e.line.slice(0, 80)}...
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        {parsedUsers.length > 0 && !migrationResults && (
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handlePreview}
              disabled={loadingPreview || migrating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPreview ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Eye size={15} />
              )}
              Analisar Lista
            </button>

            {preview && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={migrating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-900/30"
              >
                <Play size={15} />
                Executar Migração
              </button>
            )}
          </div>
        )}

        {/* ── Preview card ─────────────────────────────────────────────────── */}
        {preview && !migrationResults && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
              <Users size={20} className="mx-auto mb-2 text-zinc-400" />
              <div className="text-3xl font-bold text-white">{preview.total}</div>
              <div className="text-zinc-500 text-sm mt-1">Total detectados</div>
            </div>
            <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-5 text-center">
              <UserPlus size={20} className="mx-auto mb-2 text-emerald-400" />
              <div className="text-3xl font-bold text-emerald-400">{preview.toCreate}</div>
              <div className="text-zinc-500 text-sm mt-1">Novos usuários</div>
            </div>
            <div className="bg-zinc-900 border border-blue-500/20 rounded-2xl p-5 text-center">
              <RefreshCw size={20} className="mx-auto mb-2 text-blue-400" />
              <div className="text-3xl font-bold text-blue-400">{preview.toUpdate}</div>
              <div className="text-zinc-500 text-sm mt-1">Serão atualizados</div>
            </div>
          </div>
        )}

        {/* ── Global error ─────────────────────────────────────────────────── */}
        {migrationError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong>Erro:</strong> {migrationError}
            </div>
          </div>
        )}

        {/* ── Progress bar ──────────────────────────────────────────────────── */}
        {migrating && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-zinc-300">
              <Loader2 size={18} className="animate-spin text-violet-400" />
              <span className="font-medium">{progressLabel}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 bg-gradient-to-r from-violet-600 to-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-zinc-500 text-xs">{progress}%</div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {migrationResults && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{migrationResults.summary.total}</div>
                <div className="text-zinc-500 text-xs mt-1">Total</div>
              </div>
              <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{migrationResults.summary.created}</div>
                <div className="text-zinc-500 text-xs mt-1">Criados</div>
              </div>
              <div className="bg-zinc-900 border border-blue-500/20 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{migrationResults.summary.updated}</div>
                <div className="text-zinc-500 text-xs mt-1">Atualizados</div>
              </div>
              <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{migrationResults.summary.errors}</div>
                <div className="text-zinc-500 text-xs mt-1">Erros</div>
              </div>
            </div>

            {/* Success banner */}
            {migrationResults.summary.errors === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <CheckCircle2 size={18} />
                <span>Migração concluída sem erros!</span>
              </div>
            )}

            {/* Error banner */}
            {migrationResults.summary.errors > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <ShieldAlert size={18} />
                <span>{migrationResults.summary.errors} usuário(s) com erro. Verifique a tabela abaixo.</span>
              </div>
            )}

            {/* Filters + export */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'created', label: 'Criados' },
                  { key: 'updated', label: 'Atualizados' },
                  { key: 'error', label: 'Erros' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setResultFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      resultFilter === f.key
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => exportCSV(migrationResults.results)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium border border-zinc-700 transition-colors"
              >
                <Download size={14} />
                Exportar CSV
              </button>
            </div>

            {/* Results table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-zinc-500 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-zinc-500 font-medium">Email</th>
                      <th className="text-left px-4 py-3 text-zinc-500 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-zinc-500 font-medium">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r, i) => (
                      <tr
                        key={r.email}
                        className={`border-b border-zinc-800/50 ${
                          r.status === 'error' ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 text-zinc-600 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-zinc-300 font-mono text-xs">{r.email}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={r.status} action={r.action} />
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 text-xs max-w-xs truncate">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm modal ───────────────────────────────────────────────────── */}
      {showConfirm && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10">
                <ShieldAlert size={22} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Confirmar Migração</h2>
                <p className="text-zinc-400 text-sm">Esta ação irá modificar o banco de dados.</p>
              </div>
            </div>

            <div className="bg-zinc-800/60 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-300">
                <span>Total de usuários</span>
                <span className="font-bold text-white">{preview.total}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Novos usuários a criar</span>
                <span className="font-bold text-emerald-400">{preview.toCreate}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Usuários a atualizar</span>
                <span className="font-bold text-blue-400">{preview.toUpdate}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors shadow-lg shadow-violet-900/30"
              >
                Confirmar e Migrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
