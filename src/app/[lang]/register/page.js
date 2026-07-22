'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // For focus states
  const [focusedInput, setFocusedInput] = useState(null)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      })

      if (signUpError) {
        let msg = signUpError.message
        if (msg.toLowerCase().includes('to signup, please confirm your email') || msg.toLowerCase().includes('confirm your email')) {
          msg = 'Para concluir o cadastro, por favor confirme seu e-mail através do link enviado.'
        } else if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already registered')) {
          msg = 'Este e-mail já está cadastrado.'
        }
        setError(msg)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 5000)
      }
    } catch (err) {
      setError('Ocorreu um erro ao criar a conta.')
    } finally {
      setLoading(false)
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

      {/* Card Registro */}
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
          Crie sua conta para começar a gerar vídeos e imagens
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

        {success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#22c55e',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar seu cadastro antes de fazer login.
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* NOME COMPLETO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.45)',
              marginLeft: '4px'
            }}>
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Seu nome"
              style={{
                width: '100%',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,.04)',
                border: focusedInput === 'name' ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,.08)',
                boxShadow: focusedInput === 'name' ? '0 0 20px rgba(124,58,237,.20)' : 'none',
                padding: '0 16px',
                fontSize: '16px',
                color: '#FFFFFF',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              minLength={6}
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

          {/* Botão Criar Conta */}
          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              disabled={loading || success}
              onMouseEnter={(e) => {
                if (!loading && !success) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(124,58,237,.35)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !success) {
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
                cursor: (loading || success) ? 'not-allowed' : 'pointer',
                opacity: (loading || success) ? 0.7 : 1,
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
                'Criar Conta'
              )}
            </button>
          </div>
        </form>

        {/* Link Login */}
        <div style={{
          marginTop: '28px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'rgba(255,255,255,.55)',
          fontWeight: '500'
        }}>
          Já tem uma conta?{' '}
          <Link 
            href="/login" 
            style={{ 
              color: '#8B5CF6', 
              textDecoration: 'none', 
              fontWeight: '700',
              marginLeft: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Entrar agora
          </Link>
        </div>
      </div>
    </div>
  )
}
