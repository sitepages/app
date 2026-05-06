'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import {
  LayoutDashboard, ArrowLeftRight, Upload, FileUp,
  Wallet, TrendingUp, ShoppingCart, Target,
  BarChart3, Settings, LogOut, CreditCard,
  TrendingDown, Home, Menu, X, Sun, Moon, Heart,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',              label: 'Visão Geral',  icon: LayoutDashboard, color: '#00C47A' },
      { href: '/dashboard/transactions', label: 'Transações',   icon: ArrowLeftRight,  color: '#3B82F6' },
      { href: '/dashboard/import',           label: 'Cartão Nubank', icon: Upload, color: '#8B5CF6' },
      { href: '/dashboard/import/statement', label: 'Extrato Conta', icon: FileUp, color: '#06B6D4' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/dashboard/accounts',     label: 'Patrimônio',   icon: Wallet,       color: '#F59E0B' },
      { href: '/dashboard/income',       label: 'Rendas',       icon: TrendingUp,   color: '#10B981' },
      { href: '/dashboard/budget',       label: 'Orçamento',    icon: CreditCard,   color: '#6366F1' },
      { href: '/dashboard/installments', label: 'Parcelas',     icon: CreditCard,   color: '#A78BFA' },
      { href: '/dashboard/debts',        label: 'Dívidas',      icon: TrendingDown, color: '#F87171' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/dashboard/cost-of-living', label: 'Custo de Vida', icon: Home,         color: '#00C47A' },
      { href: '/dashboard/credit-card',    label: 'Cartão',        icon: CreditCard,   color: '#F87171' },
      { href: '/dashboard/grocery',        label: 'Mercado',       icon: ShoppingCart, color: '#F97316' },
      { href: '/dashboard/goals',          label: 'Metas',         icon: Target,       color: '#EC4899' },
      { href: '/dashboard/wishlist',       label: 'Desejos',       icon: Heart,        color: '#F472B6' },
      { href: '/dashboard/analytics',      label: 'Histórico',     icon: BarChart3,    color: '#06B6D4' },
    ],
  },
]

const BOTTOM_NAV = [
  { href: '/dashboard',              label: 'Início',     icon: LayoutDashboard, color: '#00C47A' },
  { href: '/dashboard/transactions', label: 'Transações', icon: ArrowLeftRight,  color: '#3B82F6' },
  { href: '/dashboard/import',       label: 'Importar',   icon: Upload,          color: '#8B5CF6' },
  { href: '/dashboard/grocery',      label: 'Mercado',    icon: ShoppingCart,    color: '#F97316' },
  { href: '/dashboard/wishlist',      label: 'Desejos',    icon: Heart,           color: '#F472B6' },
]

function NavLink({ href, label, icon: Icon, color, compact = false, onClick }: {
  href: string; label: string; icon: any; color: string; compact?: boolean; onClick?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link href={href} onClick={onClick}
      title={compact ? label : undefined}
      className="nav-item"
      style={{
        justifyContent: compact ? 'center' : undefined,
        padding: compact ? '9px 0' : undefined,
        background: active ? 'var(--brand-bg)' : undefined,
        color: active ? 'var(--brand)' : undefined,
        border: active ? '1px solid var(--brand-border)' : undefined,
      }}
    >
      <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: active ? `${color}20` : 'var(--bg-elevated)',
          color: active ? color : 'var(--text-muted)',
          transition: 'all 0.15s',
        }}>
        <Icon size={13} />
      </span>
      {!compact && <span style={{ color: active ? 'var(--brand)' : undefined }}>{label}</span>}
    </Link>
  )
}

function SidebarContent({ compact = false, onNav }: { compact?: boolean; onNav?: () => void }) {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!compact && (
              <p className="text-[10.5px] font-semibold uppercase tracking-widest px-3 mb-1.5"
                style={{ color: 'var(--text-muted)' }}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.href} {...item} compact={compact} onClick={onNav} />
              ))}
            </div>
            {compact && <div style={{ height: 8 }} />}
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 space-y-0.5"
        style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>

        {/* Toggle de tema */}
        <button onClick={toggle} className="nav-item w-full"
          style={{ justifyContent: compact ? 'center' : undefined, padding: compact ? '9px 0' : undefined }}
          title={isLight ? 'Mudar para tema escuro' : 'Mudar para tema claro'}>
          <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: isLight ? 'rgba(245,158,11,0.12)' : 'rgba(96,165,250,0.12)',
                     color: isLight ? '#D97706' : '#60A5FA' }}>
            {isLight ? <Sun size={13} /> : <Moon size={13} />}
          </span>
          {!compact && (
            <span style={{ color: 'var(--text-secondary)' }}>
              {isLight ? 'Tema claro' : 'Tema escuro'}
            </span>
          )}
        </button>

        <NavLink href="/dashboard/settings" label="Configurações" icon={Settings}
          color="#6B7280" compact={compact} onClick={onNav} />
        <form action={logout}>
          <button type="submit" className="nav-item w-full"
            style={{ justifyContent: compact ? 'center' : undefined, padding: compact ? '9px 0' : undefined }}>
            <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <LogOut size={13} />
            </span>
            {!compact && <span style={{ color: 'var(--text-secondary)' }}>Sair</span>}
          </button>
        </form>
      </div>
    </>
  )
}

export default function Sidebar({ userId }: { userId: string }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      {/* ── DESKTOP ≥1024px: sidebar completa ── */}
      <aside className="sidebar-desktop"
        style={{
          width: 'var(--sidebar-w)', borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)', flexShrink: 0,
          display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
        }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-[60px] flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <TrendingUp size={15} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight"
              style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>Finança Casa</p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>Gestão familiar</p>
          </div>
        </div>
        <SidebarContent />
      </aside>

      {/* ── TABLET 768–1023px: sidebar colapsada ── */}
      <aside className="sidebar-tablet"
        style={{
          width: 64, borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)', flexShrink: 0,
          display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
        }}>
        {/* Logo icon only */}
        <div className="flex items-center justify-center h-[60px] flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <TrendingUp size={15} style={{ color: 'var(--brand)' }} />
          </div>
        </div>
        <SidebarContent compact />
      </aside>

      {/* ── MOBILE <768px: topbar + drawer + bottom nav ── */}

      {/* Top bar */}
      <header className="mobile-topbar"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: 56, background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
        }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <TrendingUp size={13} style={{ color: 'var(--brand)' }} />
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            Finança Casa
          </p>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="btn btn-ghost btn-sm"
          style={{ padding: 8 }} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
      </header>

      {/* Overlay do drawer */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)',
          }} />
      )}

      {/* Drawer */}
      <div ref={drawerRef}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 70,
          width: 280, background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: drawerOpen ? 'var(--shadow-lg)' : 'none',
        }}>
        <div className="flex items-center justify-between px-5 flex-shrink-0"
          style={{ height: 56, borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
              <TrendingUp size={13} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight"
                style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>Finança Casa</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Gestão familiar</p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>
        <SidebarContent onNav={() => setDrawerOpen(false)} />
      </div>

      {/* Bottom nav */}
      <nav className="mobile-bottom-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          height: 60, background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-around', padding: '0 4px',
        }}>
        {BOTTOM_NAV.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, flex: 1, padding: '6px 0', textDecoration: 'none',
                color: active ? color : 'var(--text-muted)',
                transition: 'color 0.15s',
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? `${color}20` : 'transparent',
                transition: 'background 0.15s',
              }}>
                <Icon size={18} />
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, lineHeight: 1 }}>{label}</span>
            </Link>
          )
        })}
        <button onClick={() => setDrawerOpen(true)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, flex: 1, padding: '6px 0', background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={18} />
          </div>
          <span style={{ fontSize: 10, lineHeight: 1 }}>Mais</span>
        </button>
      </nav>
    </>
  )
}
