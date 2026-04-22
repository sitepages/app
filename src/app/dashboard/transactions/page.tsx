'use client'

import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories }   from '@/hooks/useCategories'
import { Filter, TrendingDown, TrendingUp } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PAID:    { label: 'Pago',      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  PENDING: { label: 'Pendente',  color: 'text-yellow-400  bg-yellow-500/10  border-yellow-500/20'  },
  PLANNED: { label: 'Planejado', color: 'text-blue-400    bg-blue-500/10    border-blue-500/20'    },
}

export default function TransactionsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7) // "2024-01"
  const [month,       setMonth]      = useState(currentMonth)
  const [categoryId,  setCategoryId] = useState('')
  const [statusFilter, setStatus]    = useState('')

  const { transactions, loading } = useTransactions(HOUSEHOLD_ID, {
    month,
    category_id: categoryId || undefined,
    status:      statusFilter || undefined,
  })

  const { categories } = useCategories()

  const totalGastos  = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const totalCreditos = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-1">Transações</h1>
          <p className="text-slate-500 text-sm">Histórico completo do casal</p>
        </div>
        <a
          href="/dashboard/import"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          + Importar CSV
        </a>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <Filter size={15} className="text-slate-500" />

        {/* Mês */}
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {/* Categoria */}
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">Todas as categorias</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">Todos os status</option>
          <option value="PAID">Pago</option>
          <option value="PENDING">Pendente</option>
          <option value="PLANNED">Planejado</option>
        </select>

        {/* Resumo rápido */}
        <div className="ml-auto flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-red-400">
            <TrendingDown size={14} />
            {formatCurrency(totalGastos)}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp size={14} />
            {formatCurrency(totalCreditos)}
          </span>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          Nenhuma transação encontrada para este período.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Quem</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-200 font-medium">{tx.description}</p>
                    <p className="text-slate-600 text-xs mt-0.5">{tx.raw_title}</p>
                  </td>
                  <td className="px-4 py-3">
                    {tx.categories ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{
                          color:           tx.categories.color,
                          backgroundColor: tx.categories.color + '18',
                          borderColor:     tx.categories.color + '40',
                        }}
                      >
                        {tx.categories.name}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {tx.household_members?.display_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {tx.status && STATUS_LABELS[tx.status] ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_LABELS[tx.status].color}`}>
                        {STATUS_LABELS[tx.status].label}
                      </span>
                    ) : null}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium whitespace-nowrap ${
                    tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(value)
}
