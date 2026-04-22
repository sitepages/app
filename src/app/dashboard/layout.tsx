import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar userId={user.id} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
