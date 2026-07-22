'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // For focus states
  const [focusedInput, setFocusedInput] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        let msg = signInError.message
        if (msg.toLowerCase().includes('email not confirmed')) {
          msg = 'E-mail não confirmado. Por favor, verifique seu e-mail para confirmar sua conta.'
        } else if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
          msg = 'E-mail ou senha incorretos.'
        }
        setError(msg)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('Ocorreu um erro ao fazer login.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      if (error) throw error
    } catch (err) {
      setError('Ocorreu um erro ao conectar com o Google.')
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#08080D',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glow Suave Central */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at center, rgba(124,58,237,.12), transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Card Login */}
      <div style={{
        width: '460px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '32px',
        borderRadius: '28px',
        background: 'rgba(15,15,24,.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,.08)',
        boxShadow: '0 0 80px rgba(124,58,237,.08)',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/logo.png" alt="MAX AI 2.0" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          color: '#FFFFFF',
          textAlign: 'center',
          margin: '0 0 8px 0',
          letterSpacing: '-0.02em',
        }}>
          MAX AI 2.0
        </h1>

        {/* Subtítulo */}
        <p style={{
          fontSize: '15px',
          color: 'rgba(255,255,255,.65)',
          textAlign: 'center',
          margin: '0 0 28px 0',
          fontWeight: '400',
        }}>
          Entre na sua conta para criar vídeos e imagens
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* E-MAIL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.45)',
              marginLeft: '4px'
            }}>
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              placeholder="seu@email.com"
              style={{
                width: '100%',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,.04)',
                border: focusedInput === 'email' ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,.08)',
                boxShadow: focusedInput === 'email' ? '0 0 20px rgba(124,58,237,.20)' : 'none',
                padding: '0 16px',
                fontSize: '16px',
                color: '#FFFFFF',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* SENHA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.45)',
              marginLeft: '4px'
            }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              placeholder="••••••••"
              style={{
                width: '100%',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,.04)',
                border: focusedInput === 'password' ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,.08)',
                boxShadow: focusedInput === 'password' ? '0 0 20px rgba(124,58,237,.20)' : 'none',
                padding: '0 16px',
                fontSize: '16px',
                color: '#FFFFFF',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Botão Entrar */}
          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(124,58,237,.35)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
              style={{
                width: '100%',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(90deg, #7C3AED, #8B5CF6)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                boxSizing: 'border-box'
              }}
            >
              {loading ? (
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              ) : (
                'Entrar'
              )}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.1)' }} />
          <span style={{ margin: '0 12px', fontSize: '13px', color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ou</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.1)' }} />
        </div>

        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            onMouseEnter={(e) => {
              if (!googleLoading) {
                e.currentTarget.style.background = 'rgba(255,255,255,.08)'
              }
            }}
            onMouseLeave={(e) => {
              if (!googleLoading) {
                e.currentTarget.style.background = 'rgba(255,255,255,.04)'
              }
            }}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,.04)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '500',
              border: '1px solid rgba(255,255,255,.08)',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              opacity: googleLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            {googleLoading ? (
              <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continuar com o Google
              </>
            )}
          </button>
        </div>

        {/* Link Cadastro */}
        <div style={{
          marginTop: '28px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'rgba(255,255,255,.55)',
          fontWeight: '500'
        }}>
          Não tem uma conta?{' '}
          <Link 
            href="/register" 
            style={{ 
              color: '#8B5CF6', 
              textDecoration: 'none', 
              fontWeight: '700',
              marginLeft: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Cadastrar-se agora
          </Link>
        </div>
      </div>
    </div>
  )
}
