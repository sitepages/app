'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/services/supabase/client'

export interface Category {
  id:    string
  name:  string
  icon:  string
  color: string
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon, color')
        .order('name')

      setCategories(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  return { categories, loading }
}
