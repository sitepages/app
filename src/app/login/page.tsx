'use client'

import { useState, useTransition } from 'react'
import { login } from './actions'
import { Eye, EyeOff, TrendingUp, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600,
            top: '-15%', left: '50%', transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(0,196,122,0.07) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 400,
            bottom: '-10%', right: '10%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative w-full max-w-[380px] animate-fade-up">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'var(--brand-bg)',
              border: '1px solid var(--brand-border)',
              boxShadow: '0 0 32px rgba(0,196,122,0.12)',
            }}
          >
            <TrendingUp size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.3px' }}>
            Finança Casa
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Gestão financeira do casal
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Entre para acessar seu painel financeiro
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>
                E-mail
              </label>
              <input
                name="email" type="email" required autoComplete="email"
                placeholder="voce@exemplo.com"
                className="input"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required autoComplete="current-password"
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: 'var(--danger)',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-lg w-full justify-center mt-2"
            >
              {isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Entrando...</>
              ) : (
                <><span>Entrar</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          Acesso restrito — uso pessoal do casal
        </p>
      </div>
    </main>
  )
}
