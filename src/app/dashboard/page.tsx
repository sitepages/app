import { createClient } from '@/services/supabase/server'
import { redirect }     from 'next/navigation'
import DashboardClient  from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('household_members')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <DashboardClient
      displayName={member?.display_name ?? 'você'}
      greeting={greeting}
    />
  )
}
