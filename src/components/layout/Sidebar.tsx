'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  LogOut,
  TrendingUp,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',            label: 'Visão Geral',   icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações',   icon: ArrowLeftRight  },
  { href: '/dashboard/import',     label: 'Importar',      icon: Upload          },
]

export default function Sidebar({ userId }: { userId: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">

      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/30">
          <TrendingUp size={16} className="text-white" />
        </div>
        <span className="font-semibold text-slate-100 tracking-tight">Finança Casa</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }
              `}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={17} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
