'use client'

import { useRef, useEffect } from 'react'
import { X, Sparkles, Lock, Check, ChevronLeft, ChevronRight, Gift } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { PLANS } from '@/lib/plans-meta'

export default function PlansModal({ isOpen, onClose }) {
  const scrollRef = useRef(null)
  const { dict, lang } = useI18n()
  const pt = dict?.plans || {}
  const btns = dict?.buttons || {}

  const PLANS_DATA = [
    {
      key: 'INICIANTE',
      badge: pt.INICIANTE?.badge ?? 'POPULAR',
      badgeColor: '#FFFFFF',
      badgeBg: '#7C3AED',
      name: pt.INICIANTE?.name || 'Iniciante',
      nameColor: '#FFFFFF',
      description: pt.INICIANTE?.description || 'Para criadores casuais.',
      descColor: '#A78BFA',
      price: pt.INICIANTE?.price || 'R$ 39,90',
      period: pt.period || '/mês',
      benefits: pt.INICIANTE?.benefits || [],
      border: '1.5px solid #7C3AED',
      glow: '0 0 32px rgba(124,58,237,0.25)',
      btnLabel: btns.subscribe || 'Assinar Plano',
      btnStyle: 'purple',
      checkoutUrl: PLANS.INICIANTE.checkoutLinks[lang],
      recommended: false,
      bonusLabel: pt.INICIANTE?.bonusLabel || '',
      bonusAmount: pt.INICIANTE?.bonusAmount || '',
      bonusText: pt.INICIANTE?.bonusText || '',
    },
    {
      key: 'CRIADOR',
      badge: pt.CRIADOR?.badge ?? '',
      badgeColor: '#F59E0B',
      badgeBg: 'rgba(245,158,11,0.12)',
      name: pt.CRIADOR?.name || 'Criador',
      nameColor: '#FFFFFF',
      description: pt.CRIADOR?.description || 'Para profissionais e criativos.',
      descColor: '#A78BFA',
      price: pt.CRIADOR?.price || 'R$ 67,90',
      period: pt.period || '/mês',
      benefits: pt.CRIADOR?.benefits || [],
      border: '1.5px solid #F59E0B',
      glow: '0 0 32px rgba(245,158,11,0.2)',
      btnLabel: btns.subscribe || 'Assinar Plano',
      btnStyle: 'orange',
      checkoutUrl: PLANS.CRIADOR.checkoutLinks[lang],
      recommended: true,
      recLabel: pt.CRIADOR?.recommended || 'RECOMENDADO',
      bonusLabel: pt.CRIADOR?.bonusLabel || '',
      bonusAmount: pt.CRIADOR?.bonusAmount || '',
      bonusText: pt.CRIADOR?.bonusText || '',
    },
    {
      key: 'EMPRESAS',
      badge: pt.EMPRESAS?.badge ?? 'MELHOR CUSTO-BENEFÍCIO',
      badgeColor: '#8B5CF6',
      badgeBg: 'rgba(139,92,246,0.15)',
      name: pt.EMPRESAS?.name || 'Empresas',
      nameColor: '#FFFFFF',
      description: pt.EMPRESAS?.description || 'Para agências e negócios.',
      descColor: 'rgba(255,255,255,0.55)',
      price: pt.EMPRESAS?.price || 'R$ 119,90',
      period: pt.period || '/mês',
      benefits: pt.EMPRESAS?.benefits || [],
      border: '1px solid rgba(255,255,255,0.08)',
      glow: 'none',
      btnLabel: btns.subscribe || 'Assinar Plano',
      btnStyle: 'dark',
      checkoutUrl: PLANS.EMPRESAS.checkoutLinks[lang],
      recommended: false,
      bonusLabel: pt.EMPRESAS?.bonusLabel || '',
      bonusAmount: pt.EMPRESAS?.bonusAmount || '',
      bonusText: pt.EMPRESAS?.bonusText || '',
    },
  ]

  useEffect(() => {
    if (isOpen && scrollRef.current && window.innerWidth <= 768) {
      const containerWidth = scrollRef.current.clientWidth;
      const cardWidth = 320;
      const gap = 20;
      const scrollPosition = (cardWidth + gap) - (containerWidth / 2) + (cardWidth / 2);
      scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'instant' });
    }
  }, [isOpen])

  const scroll = (direction) => {
    if (scrollRef.current) {
      const cardWidth = 340
      scrollRef.current.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fade-in 0.25s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1280px',
          width: '92%',
          margin: 'auto',
          borderRadius: '28px',
          padding: '0',
          background: 'rgba(8,8,14,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'scale-up 0.3s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '32px 40px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <h2 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '28px',
              fontWeight: '700',
              color: '#FFFFFF',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}>
              <Sparkles style={{ width: '26px', height: '26px', color: '#A78BFA', flexShrink: 0 }} />
              {pt.title || 'Planos de Assinatura'}
            </h2>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
              fontWeight: '400',
            }}>
              {pt.subtitle || 'Escolha o plano ideal para as suas criações de vídeo e imagem'}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <div style={{ padding: '40px', position: 'relative' }}>
          <style>{`
            .plans-scroll-container {
              display: flex;
              gap: 20px;
              justify-content: center;
              align-items: stretch;
            }
            .mobile-arrow {
              display: none !important;
            }
            @media (max-width: 768px) {
              .plans-scroll-container {
                justify-content: flex-start !important;
                overflow-x: auto !important;
                scroll-snap-type: x mandatory !important;
                scroll-behavior: smooth !important;
                -webkit-overflow-scrolling: touch;
                padding-bottom: 20px;
              }
              .plans-scroll-container::-webkit-scrollbar {
                display: none;
              }
              .mobile-arrow {
                display: flex !important;
              }
              .plan-card-wrapper {
                scroll-snap-align: center !important;
              }
            }
          `}</style>

          <button 
            className="mobile-arrow"
            onClick={() => scroll('left')}
            style={{
              position: 'absolute',
              left: '0px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              background: 'transparent',
              border: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              padding: '10px'
            }}
          >
            <ChevronLeft size={48} strokeWidth={2.5} style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.8)) drop-shadow(0px 0px 4px rgba(0,0,0,0.8))' }} />
          </button>

          <div 
            ref={scrollRef}
            className="plans-scroll-container"
          >
            {PLANS_DATA.map(plan => (
              <PlanCard key={plan.key} plan={plan} />
            ))}
          </div>

          <button 
            className="mobile-arrow"
            onClick={() => scroll('right')}
            style={{
              position: 'absolute',
              right: '0px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              background: 'transparent',
              border: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              padding: '10px'
            }}
          >
            <ChevronRight size={48} strokeWidth={2.5} style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.8)) drop-shadow(0px 0px 4px rgba(0,0,0,0.8))' }} />
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px 32px',
          position: 'relative'
        }}>
          <div style={{ flex: 1 }} />
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '13px',
              marginBottom: '8px',
            }}>
              <Lock style={{ width: '14px', height: '14px' }} />
              <span>{pt.securePayment || 'Pagamento seguro e criptografado.'}</span>
            </div>
            <p style={{
              margin: 0,
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
            }}>
              {pt.footerNote || 'Os créditos não são cumulativos. Renovação automática pode ser cancelada a qualquer momento.'}
            </p>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            >
              {btns.close || 'Fechar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ plan }) {
  const btnStyles = {
    dark: {
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#FFFFFF',
    },
    purple: {
      background: '#7C3AED',
      border: '1px solid #7C3AED',
      color: '#FFFFFF',
    },
    orange: {
      background: '#F59E0B',
      border: '1px solid #F59E0B',
      color: '#000000',
    },
  }

  const btn = btnStyles[plan.btnStyle]

  return (
    <div
      className="plan-card-wrapper"
      style={{
        width: '320px',
        minHeight: '410px',
        padding: '24px',
        borderRadius: '24px',
        flex: 'none',
        background: 'rgba(255,255,255,0.02)',
        border: plan.border,
        boxShadow: plan.glow,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {plan.recommended && (
        <div style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: '#F59E0B',
          color: '#000000',
          fontSize: '10px',
          fontWeight: '800',
          letterSpacing: '0.06em',
          padding: '4px 10px',
          borderRadius: '6px',
        }}>
          {plan.recLabel}
        </div>
      )}

      {plan.badge ? (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: '6px',
          background: plan.badgeBg,
          color: plan.badgeColor,
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.06em',
          marginBottom: '16px',
          alignSelf: 'flex-start',
        }}>
          {plan.badge}
        </div>
      ) : (
        <div style={{ height: '24px', marginBottom: '16px' }} />
      )}

      <h3 style={{
        fontSize: '28px',
        fontWeight: '700',
        color: plan.nameColor,
        margin: '0 0 6px',
        letterSpacing: '-0.02em',
        lineHeight: '1.1',
      }}>
        {plan.name}
      </h3>

      <p style={{
        fontSize: '13px',
        color: plan.descColor,
        marginBottom: '20px',
        fontWeight: '500',
        margin: '0 0 20px 0',
      }}>
        {plan.description}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
        marginBottom: plan.bonusAmount ? '16px' : '20px',
      }}>
        <span style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#FFFFFF',
          letterSpacing: '-0.03em',
          lineHeight: '1',
        }}>
          {plan.price}
        </span>
        <span style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: '500',
        }}>
          {plan.period}
        </span>
      </div>

      {plan.bonusAmount && (
        <div style={{
          border: '2px solid #00E676',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(0, 230, 118, 0.06)',
        }}>
          <Gift style={{
            width: '28px',
            height: '28px',
            color: '#00E676',
            flexShrink: 0,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#00E676',
              letterSpacing: '0.08em',
              lineHeight: '1.2',
            }}>
              {plan.bonusLabel}
            </span>
            <span style={{
              fontSize: '26px',
              fontWeight: '800',
              color: '#00E676',
              letterSpacing: '-0.02em',
              lineHeight: '1.1',
            }}>
              {plan.bonusAmount}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#00E676',
              letterSpacing: '0.06em',
              lineHeight: '1.2',
            }}>
              {plan.bonusText}
            </span>
          </div>
        </div>
      )}

      <div style={{
        height: '1px',
        background: 'rgba(255,255,255,0.07)',
        marginBottom: '20px',
        width: '100%',
        flexShrink: 0,
      }} />

      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: '0 0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: 1,
      }}>
        {plan.benefits.map((b, i) => (
          <li key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: '1.4',
          }}>
            <Check style={{
              width: '16px',
              height: '16px',
              color: '#00E676',
              flexShrink: 0,
              marginTop: '1px',
              strokeWidth: 3,
            }} />
            {(() => {
              const bonusMatch = b.match(/^(.+?)(\+ [\d.]+ \(Bônus\)|\+ [\d.]+ \(Bonus\))(.*)$/);
              if (bonusMatch) {
                return (
                  <span>
                    {bonusMatch[1]}
                    <span style={{ color: '#00E676', fontWeight: '700' }}>{bonusMatch[2]}</span>
                    {bonusMatch[3]}
                  </span>
                );
              }
              return b;
            })()}
          </li>
        ))}
      </ul>

      {plan.checkoutUrl ? (
        <a
          href={plan.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '48px',
            borderRadius: '12px',
            background: btn.background,
            border: btn.border,
            color: btn.color,
            fontSize: '15px',
            fontWeight: '700',
            textDecoration: 'none',
            transition: 'all 0.25s ease',
            cursor: 'pointer',
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {plan.btnLabel}
        </a>
      ) : (
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '48px',
            borderRadius: '12px',
            background: btn.background,
            border: btn.border,
            color: btn.color,
            fontSize: '15px',
            fontWeight: '700',
            textDecoration: 'none',
            transition: 'all 0.25s ease',
            cursor: 'pointer',
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {plan.btnLabel}
        </button>
      )}
    </div>
  )
}
