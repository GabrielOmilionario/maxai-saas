'use client'

import { useState } from 'react'
import { Sparkles, Coins, ArrowRight, Loader2, Shield, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function BuyCreditsPage({ params }) {
  const { profile } = useAuth()
  const router = useRouter()
  const [loadingPkg, setLoadingPkg] = useState(null)
  
  const isSubscriber = profile && profile.plan && profile.plan !== 'Free'
  
  const PACKAGES = [
    { amount: 1000,    price: 17.90,   bonus: 0,      badge: null,         highlight: false },
    { amount: 2500,    price: 39.90,   bonus: 125,    badge: null,         highlight: false },
    { amount: 5000,    price: 74.90,   bonus: 300,    badge: 'POPULAR',    highlight: true  },
    { amount: 10000,   price: 139.90,  bonus: 700,    badge: null,         highlight: false },
    { amount: 20000,   price: 259.90,  bonus: 1600,   badge: null,         highlight: false },
    { amount: 50000,   price: 599.90,  bonus: 5000,   badge: null,         highlight: false },
    { amount: 100000,  price: 1099.90, bonus: 12000,  badge: null,         highlight: false },
    { amount: 1000000, price: 8990.00, bonus: 150000, badge: null,         highlight: false },
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

  const formatPrice = (val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const formatAmount = (val) => val.toLocaleString('pt-BR')

  return (
    <div className="bc-page">
      <style dangerouslySetInnerHTML={{ __html: `
        /* ══════════════════════════════════════════════
           BUY CREDITS — Premium Redesign
           ══════════════════════════════════════════════ */

        @keyframes bc-fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        .bc-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #09090B;
          color: #FFFFFF;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.06) transparent;
          position: relative;
          -webkit-font-smoothing: antialiased;
          user-select: none;
        }

        .bc-page::-webkit-scrollbar { width: 4px; }
        .bc-page::-webkit-scrollbar-track { background: transparent; }
        .bc-page::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 9999px; }

        /* ── Container ── */
        .bc-container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 48px 48px 64px;
          position: relative;
          z-index: 10;
          animation: bc-fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* ── Close button ── */
        .bc-close-btn {
          position: absolute;
          top: 48px;
          right: 48px;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 20;
        }
        .bc-close-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #FFFFFF;
        }

        /* ── Header ── */
        .bc-header {
          margin-bottom: 24px;
        }
        .bc-header-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .bc-header-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(124,58,237,0.12);
          border: 1px solid rgba(124,58,237,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bc-title {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.15;
          color: #FFFFFF;
        }
        .bc-subtitle {
          font-size: 16px;
          font-weight: 400;
          color: #A1A1AA;
          line-height: 1.5;
          max-width: 480px;
        }

        /* ── Banner ── */
        .bc-banner {
          width: 100%;
          height: 90px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.03) 100%);
          border: 1px solid rgba(124,58,237,0.12);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          margin-bottom: 32px;
          gap: 16px;
          overflow: hidden;
          position: relative;
        }
        .bc-banner-left {
          display: flex;
          align-items: center;
          gap: 20px;
          flex: 1;
          min-width: 0;
        }
        .bc-banner-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(124,58,237,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bc-banner-text h3 {
          font-size: 15px;
          font-weight: 600;
          color: #FFFFFF;
          margin-bottom: 2px;
        }
        .bc-banner-text p {
          font-size: 13px;
          color: #A1A1AA;
          font-weight: 400;
        }
        .bc-banner-btn {
          height: 36px;
          padding: 0 18px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid rgba(124,58,237,0.35);
          color: #A78BFA;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .bc-banner-btn:hover {
          background: rgba(124,58,237,0.12);
          border-color: rgba(124,58,237,0.5);
        }

        /* ── Grid — Desktop 4 cols ── */
        .bc-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 48px;
        }

        /* ── Card ── */
        .bc-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px;
          border-radius: 20px;
          background: #111114;
          border: 1px solid rgba(255,255,255,0.08);
          position: relative;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 320px;
          animation: bc-fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .bc-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          background: #16161D;
        }
        .bc-card.bc-card--popular {
          border-color: #7C3AED;
          box-shadow: 0 0 30px rgba(124,58,237,0.15);
        }
        .bc-card.bc-card--popular:hover {
          box-shadow: 0 0 40px rgba(124,58,237,0.25), 0 12px 40px rgba(0,0,0,0.5);
        }

        /* Badge */
        .bc-badge {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 14px;
          border-radius: 6px;
          background: #7C3AED;
          color: #FFFFFF;
        }

        /* Card icon */
        .bc-card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 16px;
          margin-bottom: 16px;
        }

        /* Amount */
        .bc-amount {
          font-size: 32px;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .bc-amount-label {
          font-size: 14px;
          font-weight: 500;
          color: #A1A1AA;
          margin-top: 4px;
          margin-bottom: 12px;
        }

        /* Bonus badge */
        .bc-bonus {
          display: inline-flex;
          align-items: center;
          height: 26px;
          padding: 0 12px;
          border-radius: 8px;
          background: rgba(124,58,237,0.12);
          border: 1px solid rgba(124,58,237,0.2);
          color: #A78BFA;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        /* Price */
        .bc-price-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 24px;
        }
        .bc-price-original {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.25);
          text-decoration: line-through;
        }
        .bc-price {
          font-size: 28px;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        /* Spacer */
        .bc-spacer {
          flex: 1;
        }

        /* Buy button */
        .bc-buy-btn {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          outline: none;
          color: #FFFFFF;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .bc-buy-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: scale(1.02);
        }
        .bc-buy-btn:active {
          transform: scale(0.98);
        }
        .bc-buy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }
        .bc-buy-btn--popular {
          background: #7C3AED;
          border-color: #7C3AED;
        }
        .bc-buy-btn--popular:hover {
          background: #8B5CF6;
        }

        /* ── Footer ── */
        .bc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          gap: 24px;
          flex-wrap: wrap;
        }
        .bc-footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bc-footer-shield {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bc-footer-text h4 {
          font-size: 14px;
          font-weight: 600;
          color: #FFFFFF;
        }
        .bc-footer-text p {
          font-size: 12px;
          color: #A1A1AA;
          font-weight: 400;
        }
        .bc-footer-brands {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .bc-footer-brand {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.02em;
        }
        .bc-footer-note {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 16px;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }
        .bc-footer-note svg {
          flex-shrink: 0;
        }

        /* ══════════════════════════════════════════════
           MOBILE: Cards as horizontal rows
           ══════════════════════════════════════════════ */

        @media (max-width: 767px) {
          .bc-container {
            padding: 32px 20px 40px;
          }
          .bc-close-btn {
            top: 32px;
            right: 20px;
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }
          .bc-title {
            font-size: 28px;
          }
          .bc-subtitle {
            font-size: 14px;
          }
          .bc-banner {
            height: auto;
            min-height: 80px;
            flex-direction: row;
            padding: 20px;
            gap: 12px;
          }
          .bc-banner-left {
            gap: 14px;
          }
          .bc-banner-icon {
            width: 40px;
            height: 40px;
          }
          .bc-banner-text h3 {
            font-size: 13px;
            line-height: 1.3;
          }
          .bc-banner-text p {
            display: none;
          }
          .bc-banner-btn {
            display: none;
          }
          .bc-banner-chevron {
            display: flex !important;
          }

          /* Grid → 1 column, row-style cards */
          .bc-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .bc-card {
            flex-direction: row;
            align-items: center;
            text-align: left;
            padding: 20px;
            min-height: auto;
            border-radius: 16px;
            gap: 16px;
          }
          .bc-card-icon {
            margin: 0;
            width: 44px;
            height: 44px;
            flex-shrink: 0;
          }
          .bc-card-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .bc-badge {
            position: static;
            transform: none;
            align-self: flex-start;
            font-size: 9px;
            padding: 3px 10px;
            border-radius: 5px;
            margin-bottom: 4px;
          }
          .bc-amount {
            font-size: 22px;
          }
          .bc-amount-label {
            font-size: 13px;
            margin: 0;
          }
          .bc-bonus {
            height: 22px;
            padding: 0 10px;
            font-size: 11px;
            margin: 4px 0 0 0;
            border-radius: 6px;
            align-self: flex-start;
          }
          .bc-price-block {
            display: none;
          }
          .bc-spacer {
            display: none;
          }
          .bc-card-right-mobile {
            display: flex !important;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            flex-shrink: 0;
          }
          .bc-mobile-price {
            font-size: 18px;
            font-weight: 700;
            color: #FFFFFF;
            white-space: nowrap;
          }
          .bc-mobile-buy-btn {
            height: 36px;
            padding: 0 20px;
            border-radius: 10px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            color: #FFFFFF;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
          }
          .bc-mobile-buy-btn--popular {
            background: #7C3AED;
            border-color: #7C3AED;
          }
          .bc-buy-btn {
            display: none;
          }
          .bc-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .bc-footer-brands {
            gap: 12px;
          }
          .bc-footer-brand {
            font-size: 11px;
          }
        }

        /* ══════════════════════════════════════════════
           TABLET: 2 columns
           ══════════════════════════════════════════════ */
        @media (min-width: 768px) and (max-width: 1023px) {
          .bc-container {
            padding: 40px 32px 48px;
          }
          .bc-close-btn {
            top: 40px;
            right: 32px;
          }
          .bc-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .bc-title {
            font-size: 32px;
          }
        }

        /* Hide mobile-only elements on desktop/tablet */
        .bc-card-right-mobile {
          display: none;
        }
        .bc-banner-chevron {
          display: none;
        }
      `}} />

      <div className="bc-container">
        {/* Close button */}
        <button className="bc-close-btn" onClick={() => router.back()}>
          <X style={{ width: 18, height: 18 }} />
        </button>

        {/* Header */}
        <div className="bc-header">
          <div className="bc-header-row">
            <div className="bc-header-icon">
              <Sparkles style={{ width: 24, height: 24, color: '#A78BFA' }} />
            </div>
            <h1 className="bc-title">Comprar Créditos</h1>
          </div>
          <p className="bc-subtitle">
            Adicione créditos à sua conta e continue criando sem limites.
          </p>
        </div>

        {/* Banner */}
        <div className="bc-banner">
          <div className="bc-banner-left">
            <div className="bc-banner-icon">
              <Sparkles style={{ width: 20, height: 20, color: '#A78BFA' }} />
            </div>
            <div className="bc-banner-text">
              <h3>Assinantes têm 10% de desconto em créditos extras!</h3>
              <p>Mais créditos, mais possibilidades.</p>
            </div>
          </div>
          <button className="bc-banner-btn">Vantagem de assinante</button>
          <div className="bc-banner-chevron">
            <ChevronRight style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.3)' }} />
          </div>
        </div>

        {/* Grid */}
        <div className="bc-grid">
          {PACKAGES.map((pkg, idx) => {
            const hasDiscount = isSubscriber
            const originalPrice = pkg.price
            const finalPrice = hasDiscount ? originalPrice * 0.9 : originalPrice

            return (
              <div
                key={pkg.amount}
                className={`bc-card ${pkg.highlight ? 'bc-card--popular' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Badge */}
                {pkg.badge && <div className="bc-badge">{pkg.badge}</div>}

                {/* Icon */}
                <div className="bc-card-icon">
                  <Coins style={{ width: 28, height: 28, color: '#A78BFA' }} />
                </div>

                {/* Content wrapper for mobile */}
                <div className="bc-card-content">
                  {/* Badge for mobile */}
                  {pkg.badge && (
                    <div className="bc-badge" style={{ display: 'none' }}>
                      {pkg.badge}
                    </div>
                  )}

                  {/* Amount */}
                  <div className="bc-amount">{formatAmount(pkg.amount)}</div>
                  <div className="bc-amount-label">créditos</div>

                  {/* Bonus */}
                  <div className="bc-bonus">
                    +{formatAmount(pkg.bonus)} bônus
                  </div>
                </div>

                {/* Price — Desktop only */}
                <div className="bc-price-block">
                  {hasDiscount && (
                    <span className="bc-price-original">
                      R$ {formatPrice(originalPrice)}
                    </span>
                  )}
                  <span className="bc-price">
                    R$ {formatPrice(finalPrice)}
                  </span>
                </div>

                <div className="bc-spacer" />

                {/* Button — Desktop only */}
                <button
                  className={`bc-buy-btn ${pkg.highlight ? 'bc-buy-btn--popular' : ''}`}
                  onClick={() => handleBuy(pkg.amount)}
                  disabled={loadingPkg !== null}
                >
                  {loadingPkg === pkg.amount ? (
                    <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    'Comprar'
                  )}
                </button>

                {/* Mobile right side */}
                <div className="bc-card-right-mobile">
                  <span className="bc-mobile-price">
                    R$ {formatPrice(finalPrice)}
                  </span>
                  <button
                    className={`bc-mobile-buy-btn ${pkg.highlight ? 'bc-mobile-buy-btn--popular' : ''}`}
                    onClick={() => handleBuy(pkg.amount)}
                    disabled={loadingPkg !== null}
                  >
                    {loadingPkg === pkg.amount ? (
                      <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                    ) : (
                      'Comprar'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="bc-footer">
          <div className="bc-footer-left">
            <div className="bc-footer-shield">
              <Shield style={{ width: 18, height: 18, color: '#A1A1AA' }} />
            </div>
            <div className="bc-footer-text">
              <h4>Compra 100% segura</h4>
              <p>Seus dados estão protegidos com criptografia de ponta a ponta.</p>
            </div>
          </div>
          <div className="bc-footer-brands">
            <span className="bc-footer-brand">VISA</span>
            <span className="bc-footer-brand" style={{ color: 'rgba(255,80,50,0.4)' }}>●●</span>
            <span className="bc-footer-brand">elo</span>
            <span className="bc-footer-brand">pix</span>
            <span className="bc-footer-brand">Boleto</span>
          </div>
          <div className="bc-footer-note">
            <Shield style={{ width: 14, height: 14 }} />
            <span>Os créditos não são cumulativos. Renovação automática pode ser cancelada a qualquer momento.</span>
          </div>
        </div>

      </div>
    </div>
  )
}
