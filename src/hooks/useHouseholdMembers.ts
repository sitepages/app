'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/services/supabase/client'

export interface HouseholdMember {
  id:           string
  user_id:      string
  display_name: string
}

export function useHouseholdMembers(householdId: string) {
  const [members, setMembers]   = useState<HouseholdMember[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('household_members')
        .select('id, user_id, display_name')
        .eq('household_id', householdId)
      setMembers(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [householdId])

  return { members, loading }
}
