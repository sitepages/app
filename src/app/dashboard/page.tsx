import { createClient } from '@/services/supabase/server'
import { TrendingUp, TrendingDown, DollarSign, Upload } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Busca nome do membro no household
  const { data: member } = await supabase
    .from('household_members')
    .select('display_name')
    .eq('user_id', user!.id)
    .single()

  const displayName = member?.display_name ?? 'você'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <p className="text-slate-500 text-sm mb-1">{greeting},</p>
        <h1 className="text-3xl font-semibold text-slate-100">
          {displayName} 👋
        </h1>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <SummaryCard
          label="Gastos do mês"
          value="R$ 0,00"
          icon={<TrendingDown size={18} />}
          color="text-red-400"
          bg="bg-red-500/10"
          border="border-red-500/20"
        />
        <SummaryCard
          label="Receitas do mês"
          value="R$ 0,00"
          icon={<TrendingUp size={18} />}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          border="border-emerald-500/20"
        />
        <SummaryCard
          label="Saldo estimado"
          value="R$ 0,00"
          icon={<DollarSign size={18} />}
          color="text-indigo-400"
          bg="bg-indigo-500/10"
          border="border-indigo-500/20"
        />
      </div>

      {/* CTA de importação */}
      <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
          <Upload size={24} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-slate-200 font-medium mb-1">Nenhuma transação ainda</p>
          <p className="text-slate-500 text-sm">
            Importe seu extrato do Nubank para começar
          </p>
        </div>
        <a
          href="/dashboard/import"
          className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
        >
          Importar CSV
        </a>
      </div>
    </div>
  )
}

function SummaryCard({
  label, value, icon, color, bg, border
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  bg: string
  border: string
}) {
  return (
    <div className={`bg-slate-900 border ${border} rounded-2xl p-6 flex items-start gap-4`}>
      <div className={`${bg} ${color} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-xs mb-1">{label}</p>
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      </div>
    </div>
  )
}
