'use client'

import type { ClassifiedTransaction } from '@/lib/classifier'
import type { Category } from '@/hooks/useCategories'

interface ImportPreviewTableProps {
  transactions: ClassifiedTransaction[]
  categories:   Category[]
  onChangeCategory: (index: number, categoryId: string) => void
}

export default function ImportPreviewTable({
  transactions,
  categories,
  onChangeCategory,
}: ImportPreviewTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 border-b border-slate-800">
            <th className="text-left px-4 py-3 text-slate-500 font-medium">Data</th>
            <th className="text-left px-4 py-3 text-slate-500 font-medium">Descrição</th>
            <th className="text-left px-4 py-3 text-slate-500 font-medium">Título original</th>
            <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
            <th className="text-right px-4 py-3 text-slate-500 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => (
            <tr
              key={i}
              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
              {/* Data */}
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">
                {formatDate(tx.date)}
              </td>

              {/* Descrição limpa */}
              <td className="px-4 py-3 text-slate-200 font-medium">
                {tx.description}
              </td>

              {/* Título original */}
              <td className="px-4 py-3 text-slate-600 text-xs max-w-[180px] truncate">
                {tx.raw_title}
              </td>

              {/* Categoria — editável */}
              <td className="px-4 py-3">
                <select
                  value={tx.category_id ?? ''}
                  onChange={e => onChangeCategory(i, e.target.value)}
                  className="
                    bg-slate-800 border border-slate-700 rounded-lg
                    px-2 py-1.5 text-xs text-slate-300
                    focus:outline-none focus:border-indigo-500
                    transition-colors
                  "
                >
                  <option value="">Sem categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </td>

              {/* Valor */}
              <td className={`px-4 py-3 text-right font-mono font-medium whitespace-nowrap ${
                tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {tx.amount > 0 ? '+' : ''}
                {formatCurrency(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>

        {/* Totais */}
        <tfoot>
          <tr className="bg-slate-900 border-t border-slate-700">
            <td colSpan={3} className="px-4 py-3 text-slate-500 text-xs">
              {transactions.length} transações
            </td>
            <td className="px-4 py-3 text-slate-500 text-xs">
              {transactions.filter(tx => tx.category_id).length} classificadas
            </td>
            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-300">
              {formatCurrency(transactions.reduce((sum, tx) => sum + tx.amount, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
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
