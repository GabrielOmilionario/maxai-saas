'use client'

import { useState } from 'react'
import { Sparkles, Coins, Check, ArrowRight, Loader2, Star } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function BuyCreditsPage({ params }) {
  const { profile } = useAuth()
  const [loadingPkg, setLoadingPkg] = useState(null)
  
  const isSubscriber = profile && profile.plan && profile.plan !== 'Free'
  
  const PACKAGES = [
    { amount: 1000, price: 17.90, badge: null, highlight: false },
    { amount: 2500, price: 39.90, badge: 'ECONOMIA', highlight: false },
    { amount: 5000, price: 74.90, badge: 'POPULAR', highlight: true },
    { amount: 10000, price: 139.90, badge: 'PRO', highlight: false },
    { amount: 20000, price: 259.90, badge: 'AGÊNCIA', highlight: false },
    { amount: 50000, price: 599.90, badge: 'ESTÚDIO', highlight: false },
    { amount: 100000, price: 1099.90, badge: 'MASTER', highlight: false },
    { amount: 1000000, price: 8990.00, badge: 'ENTERPRISE', highlight: false },
  ]

  const handleBuy = async (pkgAmount) => {
    setLoadingPkg(pkgAmount)
    try {
      const res = await fetch('/api/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pkgAmount, lang: params.lang })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erro ao processar pagamento.')
        setLoadingPkg(null)
      }
    } catch (err) {
      alert('Erro de conexão.')
      setLoadingPkg(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08080D] text-white overflow-y-auto chat-scroll select-none relative">
      {/* Background Glow */}
      <div className="absolute top-[-5%] left-[20%] w-[600px] h-[500px] bg-[#7C3AED]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-16 relative z-10 animate-fade-in-up">
        
        {/* Cabeçalho */}
        <div className="flex flex-col items-start gap-4 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/15 flex items-center justify-center border border-[#7C3AED]/20 shadow-[0_0_20px_rgba(124,58,237,0.15)]">
              <Sparkles className="w-6 h-6 text-[#A78BFA]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Comprar Créditos</h1>
          </div>
          <p className="text-white/50 text-[15px] max-w-xl">
            Adicione créditos à sua conta e continue criando sem limites.
          </p>
        </div>

        {/* Banner Destaque */}
        <div className="mb-14 w-full rounded-2xl bg-[#7C3AED]/[0.04] border border-[#7C3AED]/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#7C3AED]/10 blur-[60px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-start md:items-center gap-5 z-10">
            <div className="w-10 h-10 rounded-full bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white mb-1">
                Assinantes possuem vantagens exclusivas na compra de créditos.
              </h3>
              <p className="text-[14px] text-white/50">
                Economize ainda mais adquirindo créditos extras como assinante.
              </p>
            </div>
          </div>

          <div className="z-10 shrink-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30">
              <Check className="w-4 h-4 text-[#A78BFA]" />
              <span className="text-[12px] font-bold text-[#A78BFA] tracking-wide uppercase">
                Vantagem de Assinante
              </span>
            </div>
          </div>
        </div>

        {/* Grid de Pacotes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PACKAGES.map((pkg, idx) => {
            const hasDiscount = isSubscriber
            const originalPrice = pkg.price
            const finalPrice = hasDiscount ? originalPrice * 0.9 : originalPrice

            return (
              <div
                key={pkg.amount}
                className="flex flex-col group transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div
                  className="flex-1 flex flex-col w-full h-[400px] p-6 rounded-[24px] box-border relative transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: pkg.highlight ? '1.5px solid #7C3AED' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: pkg.highlight ? '0 0 32px rgba(124,58,237,0.25)' : 'none',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = pkg.highlight 
                      ? '0 10px 40px rgba(124,58,237,0.35)' 
                      : '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = pkg.highlight 
                      ? '0 0 32px rgba(124,58,237,0.25)' 
                      : 'none'
                  }}
                >
                  {pkg.badge && (
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: pkg.highlight ? '#7C3AED' : 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: '800',
                      letterSpacing: '0.06em',
                      padding: '4px 10px',
                      borderRadius: '6px',
                    }}>
                      {pkg.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
                      <Coins className="w-6 h-6 text-[#A78BFA]" />
                    </div>
                  </div>

                  <h3 className="text-[28px] font-bold text-white mb-2 tracking-tight">
                    {pkg.amount.toLocaleString('pt-BR')}
                  </h3>
                  <p className="text-[14px] text-white/50 mb-8 font-medium">créditos virtuais</p>

                  <div className="flex flex-col gap-1 mb-8">
                    {hasDiscount && (
                      <span className="text-[13px] text-white/30 line-through decoration-white/20 font-medium">
                        R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-[32px] font-bold text-white tracking-tight leading-none">
                        R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1" />

                  <div className="w-full h-[1px] bg-white/5 mb-6" />

                  <button
                    onClick={() => handleBuy(pkg.amount)}
                    disabled={loadingPkg !== null}
                    className="w-full h-12 rounded-[12px] flex items-center justify-center gap-2 text-[15px] font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
                    style={{
                      background: pkg.highlight ? '#7C3AED' : 'rgba(255,255,255,0.07)',
                      border: pkg.highlight ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      if (loadingPkg === null) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.background = pkg.highlight ? '#6D28D9' : 'rgba(255,255,255,0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.background = pkg.highlight ? '#7C3AED' : 'rgba(255,255,255,0.07)'
                    }}
                    onMouseDown={(e) => {
                       e.currentTarget.style.transform = 'scale(0.98)'
                    }}
                    onMouseUp={(e) => {
                       e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                  >
                    {loadingPkg === pkg.amount ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Comprar Agora <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* CSS para animação */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        `}} />
      </div>
    </div>
  )
}
