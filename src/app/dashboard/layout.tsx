import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="dashboard-layout" style={{ background: 'var(--bg-base)' }}>
      <Sidebar userId={user.id} />
      <div className="dashboard-main">
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  )
}
