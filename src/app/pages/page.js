'use client'

import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════
   PLANS DATA
   ═══════════════════════════════════════════ */
const PLANS = [
  {
    name: 'Free',
    price: 'R$ 0',
    period: '',
    badge: 'Gratuito',
    description: 'Para testar a plataforma e começar a criar.',
    credits: '100 créditos de bônus',
    features: [
      'Gpt Image-2 (Imagens)',
      'Grok (Vídeos)',
      '100 créditos no cadastro',
      'Sem cartão de crédito',
    ],
    highlight: false,
    cta: 'Começar Grátis',
    href: '/auth',
  },
  {
    name: 'Iniciante',
    price: 'R$ 39,90',
    period: '/mês',
    badge: 'Popular',
    description: 'Para criadores casuais que querem consistência.',
    credits: '3.000 créditos/mês',
    features: [
      'Gpt Image-2 (Imagens)',
      'Grok (Vídeos)',
      '3.000 créditos por mês',
      'Limite: 10 vídeos/dia',
      'Suporte por e-mail',
    ],
    highlight: false,
    cta: 'Assinar Plano',
    href: 'https://buy.stripe.com/4gM3cu4bHfUY8200K693y04',
  },
  {
    name: 'Criador',
    price: 'R$ 67,90',
    period: '/mês',
    badge: 'Melhor Custo-Benefício',
    description: 'Para profissionais e criativos que escalam.',
    credits: '6.000 créditos/mês',
    features: [
      'Gpt Image-2 (Imagens)',
      'Grok + Veo 3.1',
      '6.000 créditos por mês',
      'Sem limite diário',
      'Suporte prioritário',
    ],
    highlight: true,
    cta: 'Escolher Criador',
    href: 'https://buy.stripe.com/14AeVcdMh5gkcig1Oa93y05',
  },
  {
    name: 'Empresas',
    price: 'R$ 119,90',
    period: '/mês',
    badge: 'Ilimitado',
    description: 'Para agências e negócios com volume alto.',
    credits: '20.000 créditos/mês',
    features: [
      'Todos os modelos de IA',
      '20.000 créditos por mês',
      'Sem limite diário',
      'Suporte VIP WhatsApp',
      'Ideal para equipes',
    ],
    highlight: false,
    cta: 'Escolher Empresas',
    href: 'https://buy.stripe.com/00wcN40ZvbEIfusgJ493y06',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Quais modelos de IA o MAX AI utiliza?',
    a: 'MAX AI é uma plataforma de inteligência artificial que permite criar imagens e vídeos profissionais a partir de descrições em texto. Utilizamos os melhores modelos do mundo como Gpt Image-2, Grok e Veo 3.1.',
  },
  {
    q: 'Preciso ter experiência com IA para usar?',
    a: 'Não! O MAX AI foi projetado para ser extremamente simples. Basta descrever o que você deseja em português e a IA faz todo o trabalho. Sem necessidade de conhecimento técnico.',
  },
  {
    q: 'Como funciona o sistema de créditos?',
    a: 'Cada geração consome uma quantidade de créditos dependendo do modelo e configurações. Imagens custam em média 25 créditos e vídeos variam de 18 a 140 créditos dependendo da resolução e duração.',
  },
  {
    q: 'Posso cancelar minha assinatura a qualquer momento?',
    a: 'Sim! Você pode cancelar quando quiser sem multa ou taxa adicional. O acesso continua ativo até o final do período já pago.',
  },
  {
    q: 'Os créditos acumulam de um mês para o outro?',
    a: 'Não. Os créditos são renovados mensalmente e os não utilizados não são transferidos para o próximo ciclo.',
  },
  {
    q: 'Qual a qualidade das imagens e vídeos gerados?',
    a: 'As imagens são geradas em alta resolução (até 4K) e os vídeos em até 1080p Full HD, dependendo do modelo e plano. A qualidade é profissional e pronta para uso comercial.',
  },
  {
    q: 'Posso usar as criações para fins comerciais?',
    a: 'Sim! Todas as imagens e vídeos gerados no MAX AI podem ser usados livremente em projetos pessoais ou comerciais. Você tem total direito de uso sobre suas criações.',
  },
]

const MODELS = [
  {
    name: 'Gpt Image-2',
    type: 'Imagens',
    desc: 'O modelo mais avançado da OpenAI para geração de imagens fotorrealistas e artísticas a partir de texto.',
    icon: '🎨',
    color: '#3B82F6',
  },
  {
    name: 'Grok',
    type: 'Vídeos',
    desc: 'Modelo da xAI para criação de vídeos dinâmicos com controle de duração, resolução e estilo.',
    icon: '🎬',
    color: '#A78BFA',
  },
  {
    name: 'Veo 3.1',
    type: 'Vídeos',
    desc: 'Motor de vídeo do Google com qualidade cinematográfica. Disponível em versões Fast e Lite.',
    icon: '🌟',
    color: '#10B981',
  },
]

/* ═══════════════════════════════════════════
   ANIMATED SECTION HOOK
   ═══════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

function Section({ children, className = '', style = {}, id }) {
  const { ref, isVisible } = useScrollReveal()
  return (
    <section
      ref={ref}
      id={id}
      className={className}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </section>
  )
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header
        className="lp-header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '0 24px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: scrolled ? 'rgba(6,6,10,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/pages" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="MAX AI" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>MAX AI</span>
          </a>

          {/* Desktop Nav */}
          <nav className="lp-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a href="#recursos" className="lp-nav-link">Recursos</a>
            <a href="#modelos" className="lp-nav-link">Modelos</a>
            <a href="#planos" className="lp-nav-link">Planos</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
            <a href="/auth" className="lp-cta-btn-small">Começar Grátis</a>
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="lp-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '22px' }}>
              <span style={{ height: '2px', background: '#fff', borderRadius: '2px', transition: 'all 0.3s', transform: mobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
              <span style={{ height: '2px', background: '#fff', borderRadius: '2px', transition: 'all 0.3s', opacity: mobileMenuOpen ? 0 : 1 }} />
              <span style={{ height: '2px', background: '#fff', borderRadius: '2px', transition: 'all 0.3s', transform: mobileMenuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            background: 'rgba(6,6,10,0.97)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '28px',
          }}
        >
          {['Recursos', 'Modelos', 'Planos', 'FAQ'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: '24px', fontWeight: '600', color: '#fff', textDecoration: 'none', letterSpacing: '-0.01em' }}
            >
              {item}
            </a>
          ))}
          <a
            href="/auth"
            className="lp-cta-btn-small"
            style={{ marginTop: '12px', fontSize: '16px', padding: '14px 32px' }}
          >
            Começar Grátis
          </a>
        </div>
      )}

      {/* ═══════════════ HERO ═══════════════ */}
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 24px 80px',
          overflow: 'hidden',
        }}
      >
        {/* Background Effects */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(124,58,237,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '820px' }}>
          {/* Badge */}
          <div className="lp-hero-badge">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'lpPulse 2s infinite' }} />
            Plataforma #1 de IA Generativa do Brasil
          </div>

          {/* Headline */}
          <h1 className="lp-hero-h1">
            Crie <span className="lp-gradient-text">imagens</span> e{' '}
            <span className="lp-gradient-text-2">vídeos</span> incríveis com IA
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: '1.7',
            maxWidth: '600px',
            margin: '0 auto 40px',
            fontWeight: '400',
          }}>
            Os melhores modelos do mundo — Gpt Image-2, Grok e Veo 3.1 — reunidos em uma única plataforma simples e poderosa.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth" className="lp-cta-btn-primary">
              Começar Grátis →
            </a>
            <a href="#planos" className="lp-cta-btn-secondary">
              Ver Planos
            </a>
          </div>

          {/* Trust */}
          <p style={{ marginTop: '28px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>
            ✦ Sem cartão de crédito &nbsp;·&nbsp; ✦ 100 créditos grátis &nbsp;·&nbsp; ✦ Cancele quando quiser
          </p>
        </div>
      </div>

      {/* ═══════════════ COMPARISON ═══════════════ */}
      <Section id="comparacao" style={{ padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="lp-section-tag">Por que MAX AI?</p>
            <h2 className="lp-section-h2">IA Comum vs MAX AI</h2>
            <p className="lp-section-sub">Veja a diferença de quem usa ferramentas fragmentadas vs uma plataforma completa.</p>
          </div>

          <div className="lp-comparison-grid">
            {/* IA Comum */}
            <div className="lp-compare-card lp-compare-bad">
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✕</span> IA Comum
              </div>
              <ul className="lp-compare-list">
                <li>Precisa alternar entre várias ferramentas</li>
                <li>Interface complexa em inglês</li>
                <li>Pagamento em dólar e limites rígidos</li>
                <li>Sem suporte em português</li>
                <li>Qualidade inconsistente</li>
              </ul>
            </div>

            {/* MAX AI */}
            <div className="lp-compare-card lp-compare-good">
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✓</span> MAX AI
              </div>
              <ul className="lp-compare-list lp-compare-list-good">
                <li>Tudo reunido em uma única plataforma</li>
                <li>Interface intuitiva 100% em português</li>
                <li>Preços em reais a partir de R$39,90</li>
                <li>Suporte dedicado em português</li>
                <li>4 modelos de IA de ponta integrados</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <Section id="recursos" style={{ padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="lp-section-tag">Recursos</p>
            <h2 className="lp-section-h2">Tudo que você precisa para criar</h2>
            <p className="lp-section-sub">Uma plataforma completa para gerar conteúdo visual profissional com inteligência artificial.</p>
          </div>

          <div className="lp-features-grid">
            {[
              { icon: '🖼️', title: 'Geração de Imagens', desc: 'Crie ilustrações, fotos realistas, designs e arte digital com o Gpt Image-2 a partir de descrições em texto.', color: '#3B82F6' },
              { icon: '🎬', title: 'Geração de Vídeos', desc: 'Produza vídeos cinematográficos com Grok e Veo 3.1 em até 1080p Full HD.', color: '#A78BFA' },
              { icon: '🖼️➡️🎬', title: 'Imagem para Vídeo', desc: 'Transforme suas imagens estáticas em vídeos dinâmicos. Envie uma referência e a IA anima.', color: '#10B981' },
              { icon: '⚡', title: 'Processamento Rápido', desc: 'Gerações em segundos para imagens e poucos minutos para vídeos. Sem filas de espera.', color: '#F59E0B' },
              { icon: '🎛️', title: 'Controle Total', desc: 'Escolha resolução, proporção, duração e estilo. Parâmetros ajustáveis para cada modelo.', color: '#EC4899' },
              { icon: '📱', title: 'Multiplataforma', desc: 'Acesse pelo navegador, instale como app no celular (PWA) ou desktop. Funciona em qualquer dispositivo.', color: '#06B6D4' },
            ].map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  marginBottom: '18px',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', marginBottom: '8px', letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.65' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════ MODELS ═══════════════ */}
      <Section id="modelos" style={{ padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="lp-section-tag">Modelos de IA</p>
            <h2 className="lp-section-h2">Os melhores modelos do mundo</h2>
            <p className="lp-section-sub">Acesse os modelos mais avançados de geração de conteúdo visual, todos em um só lugar.</p>
          </div>

          <div className="lp-models-grid">
            {MODELS.map((m) => (
              <div key={m.name} className="lp-model-card" style={{ '--model-color': m.color }}>
                <div style={{
                  fontSize: '40px',
                  marginBottom: '16px',
                  filter: `drop-shadow(0 0 20px ${m.color}40)`,
                }}>
                  {m.icon}
                </div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: m.color,
                  marginBottom: '8px',
                }}>
                  {m.type}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '10px', letterSpacing: '-0.02em' }}>{m.name}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.65' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <Section id="planos" style={{ padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="lp-section-tag">Planos</p>
            <h2 className="lp-section-h2">Escolha o plano ideal para você</h2>
            <p className="lp-section-sub">Comece grátis e escale conforme sua necessidade. Todos os planos podem ser cancelados a qualquer momento.</p>
          </div>

          <div className="lp-pricing-grid">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`lp-pricing-card ${plan.highlight ? 'lp-pricing-highlight' : ''}`}
              >
                {plan.highlight && (
                  <div className="lp-pricing-badge">⭐ Recomendado</div>
                )}
                <div style={{ marginBottom: '24px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: plan.highlight ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                  }}>
                    {plan.badge}
                  </span>
                  <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginTop: '6px', letterSpacing: '-0.02em' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', lineHeight: '1.5' }}>
                    {plan.description}
                  </p>
                </div>

                <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '36px', fontWeight: '800', color: '#fff', letterSpacing: '-0.03em' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>
                    {plan.period}
                  </span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' }}>
                      <span style={{ color: '#10B981', fontWeight: '700', fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.href}
                  target={plan.href.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className={plan.highlight ? 'lp-plan-btn-highlight' : 'lp-plan-btn'}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <Section id="faq" style={{ padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="lp-section-tag">FAQ</p>
            <h2 className="lp-section-h2">Perguntas Frequentes</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="lp-faq-item">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="lp-faq-q"
                >
                  <span>{item.q}</span>
                  <span style={{
                    fontSize: '20px',
                    color: 'rgba(255,255,255,0.3)',
                    transition: 'transform 0.3s ease',
                    transform: openFaq === i ? 'rotate(45deg)' : 'none',
                    flexShrink: 0,
                  }}>
                    +
                  </span>
                </button>
                <div
                  className="lp-faq-a"
                  style={{
                    maxHeight: openFaq === i ? '300px' : '0',
                    opacity: openFaq === i ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.4s ease, opacity 0.3s ease',
                  }}
                >
                  <p style={{ padding: '0 20px 18px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7' }}>
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════ CTA FINAL ═══════════════ */}
      <Section style={{ padding: '80px 24px 100px' }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '60px 40px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.08))',
          border: '1px solid rgba(124,58,237,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-10%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle at 30% 50%, rgba(124,58,237,0.06) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: '800',
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: '1.2',
              marginBottom: '16px',
            }}>
              Pronto para transformar suas ideias em realidade?
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7', maxWidth: '500px', margin: '0 auto 32px' }}>
              Comece grátis agora mesmo. Sem cartão de crédito, sem compromisso. 100 créditos de bônus no cadastro.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/auth" className="lp-cta-btn-primary">
                Criar Minha Conta Grátis →
              </a>
              <a
                href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Tenho%20interesse%20no%20MAX%20AI"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-cta-btn-secondary"
              >
                💬 Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer style={{
        padding: '40px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="MAX AI" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>MAX AI</span>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} MAX AI. Todos os direitos reservados.
          </p>
          <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
            <a href="mailto:adventistasdosabado@gmail.com" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Suporte</a>
            <a href="/auth" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Login</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ═══════════════════════════════════════════
   GLOBAL STYLES (embedded)
   ═══════════════════════════════════════════ */
const GLOBAL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes lpPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ── Nav ── */
  .lp-nav-link {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255,255,255,0.55);
    text-decoration: none;
    transition: color 0.2s;
  }
  .lp-nav-link:hover { color: #fff; }

  .lp-cta-btn-small {
    display: inline-flex;
    align-items: center;
    padding: 10px 22px;
    font-size: 13px;
    font-weight: 700;
    color: #000;
    background: #fff;
    border-radius: 999px;
    text-decoration: none;
    transition: all 0.2s;
    box-shadow: 0 4px 16px rgba(255,255,255,0.1);
  }
  .lp-cta-btn-small:hover {
    background: #e5e5e5;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(255,255,255,0.15);
  }

  .lp-mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
  }

  .lp-desktop-nav { display: flex !important; }

  @media (max-width: 768px) {
    .lp-desktop-nav { display: none !important; }
    .lp-mobile-menu-btn { display: flex !important; }
  }

  /* ── Hero ── */
  .lp-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.65);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    margin-bottom: 28px;
    letter-spacing: 0.02em;
  }

  .lp-hero-h1 {
    font-size: clamp(32px, 6vw, 64px);
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.04em;
    line-height: 1.1;
    margin-bottom: 20px;
  }

  .lp-gradient-text {
    background: linear-gradient(135deg, #3B82F6, #06B6D4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lp-gradient-text-2 {
    background: linear-gradient(135deg, #7C3AED, #A78BFA);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lp-cta-btn-primary {
    display: inline-flex;
    align-items: center;
    padding: 16px 32px;
    font-size: 15px;
    font-weight: 700;
    color: #000;
    background: #fff;
    border-radius: 999px;
    text-decoration: none;
    transition: all 0.25s;
    box-shadow: 0 8px 30px rgba(255,255,255,0.1);
  }
  .lp-cta-btn-primary:hover {
    background: #e5e5e5;
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(255,255,255,0.15);
  }

  .lp-cta-btn-secondary {
    display: inline-flex;
    align-items: center;
    padding: 16px 32px;
    font-size: 15px;
    font-weight: 600;
    color: rgba(255,255,255,0.75);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 999px;
    text-decoration: none;
    transition: all 0.25s;
  }
  .lp-cta-btn-secondary:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.15);
    color: #fff;
    transform: translateY(-2px);
  }

  /* ── Section Tags ── */
  .lp-section-tag {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #A78BFA;
    margin-bottom: 12px;
  }

  .lp-section-h2 {
    font-size: clamp(26px, 4vw, 42px);
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.03em;
    line-height: 1.15;
    margin-bottom: 14px;
  }

  .lp-section-sub {
    font-size: 16px;
    color: rgba(255,255,255,0.45);
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.65;
  }

  /* ── Comparison ── */
  .lp-comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  @media (max-width: 700px) {
    .lp-comparison-grid { grid-template-columns: 1fr; }
  }

  .lp-compare-card {
    padding: 32px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .lp-compare-bad {
    background: rgba(239,68,68,0.04);
    border-color: rgba(239,68,68,0.1);
  }
  .lp-compare-good {
    background: rgba(16,185,129,0.04);
    border-color: rgba(16,185,129,0.15);
  }

  .lp-compare-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .lp-compare-list li {
    font-size: 14px;
    color: rgba(255,255,255,0.55);
    line-height: 1.5;
    padding-left: 24px;
    position: relative;
  }
  .lp-compare-list li::before {
    content: '✕';
    position: absolute;
    left: 0;
    color: #EF4444;
    font-weight: 700;
    font-size: 12px;
  }
  .lp-compare-list-good li::before {
    content: '✓';
    color: #10B981;
  }

  /* ── Features ── */
  .lp-features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 900px) { .lp-features-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .lp-features-grid { grid-template-columns: 1fr; } }

  .lp-feature-card {
    padding: 28px;
    border-radius: 18px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    transition: all 0.3s ease;
  }
  .lp-feature-card:hover {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.1);
    transform: translateY(-4px);
  }

  /* ── Models ── */
  .lp-models-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 900px) { .lp-models-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 500px) { .lp-models-grid { grid-template-columns: 1fr; } }

  .lp-model-card {
    padding: 32px 24px;
    border-radius: 18px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    text-align: center;
    transition: all 0.3s ease;
  }
  .lp-model-card:hover {
    background: rgba(255,255,255,0.04);
    border-color: var(--model-color, rgba(255,255,255,0.1));
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  }

  /* ── Pricing ── */
  .lp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    align-items: stretch;
  }
  @media (max-width: 1000px) { .lp-pricing-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .lp-pricing-grid { grid-template-columns: 1fr; } }

  .lp-pricing-card {
    padding: 32px 24px;
    border-radius: 20px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    position: relative;
    transition: all 0.3s ease;
  }
  .lp-pricing-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.1);
  }

  .lp-pricing-highlight {
    border-color: rgba(245,158,11,0.35) !important;
    background: rgba(245,158,11,0.04) !important;
    box-shadow: 0 0 40px rgba(245,158,11,0.06);
  }
  .lp-pricing-highlight:hover {
    border-color: rgba(245,158,11,0.5) !important;
  }

  .lp-pricing-badge {
    position: absolute;
    top: -1px;
    right: 20px;
    background: #F59E0B;
    color: #000;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 5px 14px;
    border-radius: 0 0 10px 10px;
  }

  .lp-plan-btn, .lp-plan-btn-highlight {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
    font-size: 14px;
    font-weight: 700;
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.25s;
    margin-top: auto;
    cursor: pointer;
  }
  .lp-plan-btn {
    color: #fff;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .lp-plan-btn:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.15);
  }
  .lp-plan-btn-highlight {
    color: #000;
    background: #F59E0B;
    border: 1px solid #F59E0B;
    box-shadow: 0 4px 16px rgba(245,158,11,0.2);
  }
  .lp-plan-btn-highlight:hover {
    background: #EAB308;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(245,158,11,0.25);
  }

  /* ── FAQ ── */
  .lp-faq-item {
    border-radius: 14px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .lp-faq-item:hover {
    border-color: rgba(255,255,255,0.1);
  }

  .lp-faq-q {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 20px;
    font-size: 15px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    gap: 16px;
    font-family: inherit;
  }
  .lp-faq-q:hover { color: #fff; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

  /* ── Smooth scroll ── */
  html { scroll-behavior: smooth; }
`
