'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import {
  LayoutDashboard, ArrowLeftRight, Upload,
  Wallet, TrendingUp, ShoppingCart, Target,
  BarChart3, Settings, LogOut, CreditCard,
  TrendingDown, Home,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',              label: 'Visão Geral',   icon: LayoutDashboard, color: '#00C47A' },
      { href: '/dashboard/transactions', label: 'Transações',    icon: ArrowLeftRight,  color: '#3B82F6' },
      { href: '/dashboard/import',       label: 'Importar CSV',  icon: Upload,          color: '#8B5CF6' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/dashboard/accounts',      label: 'Patrimônio',    icon: Wallet,       color: '#F59E0B' },
      { href: '/dashboard/income',        label: 'Rendas',        icon: TrendingUp,   color: '#10B981' },
      { href: '/dashboard/budget',        label: 'Orçamento',     icon: CreditCard,   color: '#6366F1' },
      { href: '/dashboard/installments',  label: 'Parcelas',      icon: CreditCard,   color: '#A78BFA' },
      { href: '/dashboard/debts',         label: 'Dívidas',       icon: TrendingDown, color: '#F87171' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/dashboard/cost-of-living', label: 'Custo de Vida', icon: Home,         color: '#00C47A' },
      { href: '/dashboard/credit-card',    label: 'Cartão',        icon: CreditCard,   color: '#F87171' },
      { href: '/dashboard/grocery',        label: 'Mercado',       icon: ShoppingCart, color: '#F97316' },
      { href: '/dashboard/goals',          label: 'Metas',         icon: Target,       color: '#EC4899' },
      { href: '/dashboard/analytics',      label: 'Histórico',     icon: BarChart3,    color: '#06B6D4' },
    ],
  },
]

export default function Sidebar({ userId }: { userId: string }) {
  const pathname = usePathname()

  return (
    <aside
      style={{ width: 'var(--sidebar-w)', borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      className="flex-shrink-0 flex flex-col h-screen sticky top-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[60px]"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
          <TrendingUp size={15} style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight"
            style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>Finança Casa</p>
          <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
            Gestão familiar
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10.5px] font-semibold uppercase tracking-widest px-3 mb-1.5"
              style={{ color: 'var(--text-muted)' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, color }) => {
                const active = pathname === href
                return (
                  <Link key={href} href={href} className="nav-item"
                    style={active ? {
                      background: 'var(--brand-bg)',
                      color: 'var(--brand)',
                      border: '1px solid var(--brand-border)',
                    } : {}}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: active ? `${color}20` : 'var(--bg-elevated)',
                        color:      active ? color : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}>
                      <Icon size={13} />
                    </span>
                    <span style={{ color: active ? 'var(--brand)' : undefined }}>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5"
        style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <Link href="/dashboard/settings" className="nav-item">
          <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            <Settings size={13} />
          </span>
          Configurações
        </Link>
        <form action={logout}>
          <button type="submit" className="nav-item w-full">
            <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <LogOut size={13} />
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>Sair</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
