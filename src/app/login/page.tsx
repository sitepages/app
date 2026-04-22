'use client'

import { useState, useTransition } from 'react'
import { login } from './actions'
import { Eye, EyeOff, TrendingUp, Loader2 } from 'lucide-react'

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
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-violet-700/8 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div
          className="flex items-center gap-3 justify-center mb-10"
          style={{ animation: 'fadeUp 0.5s ease forwards', opacity: 0 }}
        >
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-100">
            Finança Casa
          </span>
        </div>

        {/* Card */}
        <div
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl"
          style={{ animation: 'fadeUp 0.5s ease 0.1s forwards', opacity: 0 }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-100 mb-1">
              Bem-vindo de volta
            </h1>
            <p className="text-slate-500 text-sm">
              Entre para ver seu painel financeiro
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="voce@exemplo.com"
                className="
                  w-full bg-slate-800/60 border border-slate-700 rounded-xl
                  px-4 py-3 text-sm text-slate-100 placeholder-slate-600
                  focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                  transition-all duration-200
                "
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="
                    w-full bg-slate-800/60 border border-slate-700 rounded-xl
                    px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-600
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                    transition-all duration-200
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={isPending}
              className="
                w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800
                disabled:cursor-not-allowed text-white font-medium
                rounded-xl py-3 px-4 text-sm
                flex items-center justify-center gap-2
                transition-all duration-200
                shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30
                mt-2
              "
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs text-slate-600 mt-6"
          style={{ animation: 'fadeUp 0.5s ease 0.3s forwards', opacity: 0 }}
        >
          Acesso restrito — uso pessoal
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
