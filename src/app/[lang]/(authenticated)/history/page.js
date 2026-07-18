'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  Search, X, Download, Trash2, Star, Check, ChevronDown,
  Image as ImageIcon, Video, Play, Loader2, Filter,
  Clock, Calendar, Heart, RefreshCw, ArrowLeft, CheckSquare
} from 'lucide-react'

/* ──────────────── HELPERS ──────────────── */
const groupByDate = (items) => {
  const groups = { today: [], yesterday: [], week: [], month: [], older: [] }
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart); monthStart.setDate(monthStart.getDate() - 30)

  items.forEach(item => {
    const d = new Date(item.created_at)
    if (d >= todayStart) groups.today.push(item)
    else if (d >= yesterdayStart) groups.yesterday.push(item)
    else if (d >= weekStart) groups.week.push(item)
    else if (d >= monthStart) groups.month.push(item)
    else groups.older.push(item)
  })
  return groups
}

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getModelDisplayName = (modelName) => {
  if (!modelName) return 'Desconhecido'
  if (modelName.includes('grok')) return 'Grok - Vídeo'
  if (modelName.includes('seedance')) return 'Seedance 2.0'
  if (modelName.includes('gpt-image')) return 'GPT Image-2'
  return modelName
}

/* ──────────────── HISTORY PAGE ──────────────── */
export default function HistoryPage() {
  const { profile } = useAuth()
  const router = useRouter()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Modal
  const [modalItem, setModalItem] = useState(null)

  // Refs
  const observerRef = useRef(null)
  const sentinelRef = useRef(null)
  const searchTimerRef = useRef(null)

  /* ── Debounce search ── */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery)
    }, 400)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchQuery])

  /* ── Fetch items ── */
  const fetchItems = useCallback(async (cursor = null, append = false) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      params.set('limit', '20')
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (searchDebounced.trim()) params.set('search', searchDebounced.trim())
      if (showFavorites) params.set('favorite', 'true')

      const res = await fetch(`/api/history?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setItems(prev => [...prev, ...data.items])
        } else {
          setItems(data.items)
        }
        setNextCursor(data.nextCursor)
        setHasMore(data.hasMore)
      }
    } catch (err) {
      console.error('History fetch error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [typeFilter, searchDebounced, showFavorites])

  useEffect(() => {
    setItems([])
    setNextCursor(null)
    setHasMore(false)
    setSelectedIds(new Set())
    setSelectMode(false)
    fetchItems()
  }, [fetchItems])

  /* ── Infinite scroll ── */
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && nextCursor) {
        fetchItems(nextCursor, true)
      }
    }, { threshold: 0.1 })

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => { if (observerRef.current) observerRef.current.disconnect() }
  }, [hasMore, loadingMore, nextCursor, fetchItems])

  /* ── Actions ── */
  const handleToggleFavorite = async (e, item) => {
    e.stopPropagation()
    const newFav = !item.favorite
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, favorite: newFav } : i))
    try {
      await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, favorite: newFav }),
      })
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, favorite: !newFav } : i))
    }
  }

  const handleDownload = async (e, item) => {
    e.stopPropagation()
    try {
      const response = await fetch(item.result_url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `max-${item.type}-${item.id.substring(0, 8)}.${item.type === 'video' ? 'mp4' : 'png'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(item.result_url, '_blank')
    }
  }

  const handleDelete = async (ids) => {
    if (!confirm(`Deseja realmente excluir ${ids.length === 1 ? 'este item' : `${ids.length} itens`}?`)) return
    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(i => !ids.includes(i.id)))
        setSelectedIds(new Set())
        if (ids.length > 1) setSelectMode(false)
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleBatchFavorite = async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      const item = items.find(i => i.id === id)
      if (item) {
        await fetch('/api/history', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, favorite: true }),
        })
      }
    }
    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, favorite: true } : i))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const handleBatchDownload = async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      const item = items.find(i => i.id === id)
      if (item) {
        try {
          const response = await fetch(item.result_url)
          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = `max-${item.type}-${item.id.substring(0, 8)}.${item.type === 'video' ? 'mp4' : 'png'}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(blobUrl)
        } catch { /* skip */ }
      }
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const grouped = groupByDate(items)
  const sections = [
    { key: 'today', label: 'Hoje', items: grouped.today },
    { key: 'yesterday', label: 'Ontem', items: grouped.yesterday },
    { key: 'week', label: 'Últimos 7 dias', items: grouped.week },
    { key: 'month', label: 'Últimos 30 dias', items: grouped.month },
    { key: 'older', label: 'Mais antigos', items: grouped.older },
  ].filter(s => s.items.length > 0)

  const TYPE_FILTERS = [
    { key: 'all', label: 'Todos', icon: Filter },
    { key: 'image', label: 'Imagens', icon: ImageIcon },
    { key: 'video', label: 'Vídeos', icon: Video },
  ]

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#0B0B0F', color: '#FFFFFF' }}>

      {/* ── Header ── */}
      <header
        className="shrink-0 px-4 md:px-8"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(11,11,15,0.9)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-[1400px] mx-auto py-5 space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="md:hidden flex items-center justify-center p-2 rounded-lg cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>
                  Histórico
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Suas imagens e vídeos gerados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!selectMode ? (
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s',
                  }}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Selecionar</span>
                </button>
              ) : (
                <button
                  onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    color: '#A78BFA',
                    transition: 'all 0.2s',
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por prompt, modelo..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type filters */}
            <div className="flex gap-1.5">
              {TYPE_FILTERS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    background: typeFilter === key ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${typeFilter === key ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: typeFilter === key ? '#A78BFA' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}

              {/* Favorites filter */}
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: showFavorites ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${showFavorites ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  color: showFavorites ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s',
                }}
              >
                <Star className="w-3.5 h-3.5" style={showFavorites ? { fill: '#f59e0b' } : {}} />
                <span className="hidden sm:inline">Favoritos</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-[1400px] mx-auto">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#A78BFA' }} />
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Carregando histórico...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Clock className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="text-center">
                <p style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                  {searchDebounced || showFavorites ? 'Nenhum resultado encontrado' : 'Nenhuma geração ainda'}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  {searchDebounced || showFavorites
                    ? 'Tente alterar os filtros ou a busca.'
                    : 'Use o chat para criar imagens e vídeos.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {sections.map(({ key, label, items: sectionItems }) => (
                <div key={key}>
                  <h2
                    className="text-xs font-bold uppercase tracking-wider mb-4 px-1"
                    style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}
                  >
                    {label}
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {sectionItems.map(item => {
                      const isSelected = selectedIds.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className="group relative overflow-hidden cursor-pointer"
                          style={{
                            borderRadius: '14px',
                            border: isSelected
                              ? '2px solid #A78BFA'
                              : '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(0,0,0,0.3)',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => {
                            if (selectMode) toggleSelect(item.id)
                            else setModalItem(item)
                          }}
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-square overflow-hidden">
                            {item.type === 'video' ? (
                              <>
                                <video
                                  src={item.result_url}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div
                                    className="p-2 rounded-full"
                                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                                  >
                                    <Play className="w-4 h-4 text-white" style={{ fill: 'white' }} />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <img
                                src={item.result_url}
                                alt={item.prompt}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                loading="lazy"
                              />
                            )}

                            {/* Selection checkbox */}
                            {selectMode && (
                              <div
                                className="absolute top-2 left-2 flex items-center justify-center"
                                style={{
                                  width: '22px', height: '22px', borderRadius: '6px',
                                  background: isSelected ? '#7C3AED' : 'rgba(0,0,0,0.5)',
                                  border: isSelected ? '2px solid #7C3AED' : '2px solid rgba(255,255,255,0.3)',
                                  backdropFilter: 'blur(4px)',
                                }}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            )}

                            {/* Favorite star */}
                            <button
                              onClick={(e) => handleToggleFavorite(e, item)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              style={{
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(4px)',
                                color: item.favorite ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                              }}
                            >
                              <Star className="w-3.5 h-3.5" style={item.favorite ? { fill: '#f59e0b' } : {}} />
                            </button>

                            {/* Hover overlay */}
                            {!selectMode && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                                <div className="flex gap-1.5 w-full">
                                  <button
                                    onClick={(e) => handleDownload(e, item)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', backdropFilter: 'blur(4px)' }}
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete([item.id]) }}
                                    className="flex items-center justify-center py-1.5 px-2.5 rounded-lg text-xs cursor-pointer"
                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', backdropFilter: 'blur(4px)' }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Type badge */}
                            <div
                              className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md opacity-100 group-hover:opacity-0 transition-opacity"
                              style={{
                                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                                fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.8)',
                              }}
                            >
                              {item.type === 'video' ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                              {item.type === 'video' ? 'Vídeo' : 'Imagem'}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-2.5 space-y-1">
                            <p
                              className="truncate"
                              style={{ fontSize: '11px', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}
                              title={item.prompt}
                            >
                              {item.prompt || 'Sem prompt'}
                            </p>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                                {getModelDisplayName(item.model_name)}
                              </span>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                                {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#A78BFA' }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Carregando mais...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Selection action bar ── */}
      {selectMode && selectedIds.size > 0 && (
        <div
          className="shrink-0 px-4 md:px-8 py-3 animate-slide-up"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(11,11,15,0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchFavorite}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  color: '#f59e0b',
                }}
              >
                <Star className="w-3.5 h-3.5" />
                Favoritar
              </button>
              <button
                onClick={handleBatchDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  color: '#A78BFA',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={() => handleDelete(Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={() => setModalItem(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-auto animate-scale-up"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '0',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(17,17,24,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '20px 20px 0 0',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: modalItem.type === 'video' ? 'rgba(124,58,237,0.15)' : 'rgba(6,182,212,0.15)',
                  }}
                >
                  {modalItem.type === 'video'
                    ? <Video className="w-4 h-4" style={{ color: '#A78BFA' }} />
                    : <ImageIcon className="w-4 h-4" style={{ color: '#06b6d4' }} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white" title={modalItem.prompt}>
                    {modalItem.prompt || 'Sem prompt'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    {getModelDisplayName(modalItem.model_name)} • {formatDate(modalItem.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleToggleFavorite(e, modalItem)}
                  className="p-2 rounded-lg cursor-pointer"
                  style={{
                    color: modalItem.favorite ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Star className="w-4 h-4" style={modalItem.favorite ? { fill: '#f59e0b' } : {}} />
                </button>
                <button
                  onClick={(e) => handleDownload(e, modalItem)}
                  className="p-2 rounded-lg cursor-pointer"
                  style={{ color: '#A78BFA', background: 'rgba(124,58,237,0.1)', transition: 'all 0.2s' }}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setModalItem(null)}
                  className="p-2 rounded-lg cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal content */}
            <div className="flex items-center justify-center p-4" style={{ minHeight: '300px' }}>
              {modalItem.type === 'video' ? (
                <video
                  src={modalItem.result_url}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '12px',
                  }}
                />
              ) : (
                <img
                  src={modalItem.result_url}
                  alt={modalItem.prompt}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '12px',
                  }}
                />
              )}
            </div>

            {/* Modal footer - prompt */}
            {modalItem.prompt && (
              <div
                className="px-5 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
                  Prompt
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  {modalItem.prompt}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
