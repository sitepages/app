'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface GrocerySession {
  id: string; household_id: string; user_id: string | null
  store_name: string; date: string; total_amount: number
  notes: string | null; created_at: string
  item_count?: number
}
export interface GroceryItem {
  id: string; session_id: string; product_id: string | null
  name: string; quantity: number; unit: string
  unit_price: number; total_price: number; subcategory: string | null
}
export interface GroceryProduct {
  id: string; household_id: string; ean_code: string | null
  internal_code: string | null; name: string; brand: string | null
  unit: string; subcategory: string | null
  last_price: number | null; last_purchased: string | null; is_active: boolean
}

export const SUBCATEGORIES = [
  'Proteína', 'Hortifruti', 'Laticínio', 'Padaria',
  'Bebida', 'Limpeza', 'Higiene', 'Congelado', 'Mercearia', 'Outros'
]

export function useGrocery(householdId: string) {
  const [sessions, setSessions]   = useState<GrocerySession[]>([])
  const [products, setProducts]   = useState<GroceryProduct[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('grocery_sessions')
      .select('*')
      .eq('household_id', householdId)
      .order('date', { ascending: false })
    if (error) setError(error.message)
    else setSessions(data ?? [])
    setLoading(false)
  }, [householdId])

  const fetchProducts = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('grocery_products')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('name')
    setProducts(data ?? [])
  }, [householdId])

  useEffect(() => { fetchSessions(); fetchProducts() }, [fetchSessions, fetchProducts])

  // Estatísticas do mês
  function getMonthStats(month: string) {
    const monthSessions = sessions.filter(s => s.date.startsWith(month))
    const total = monthSessions.reduce((s, sess) => s + Number(sess.total_amount), 0)
    const avg   = monthSessions.length > 0 ? total / monthSessions.length : 0
    return { total, count: monthSessions.length, avg }
  }

  async function fetchItems(sessionId: string): Promise<GroceryItem[]> {
    const supabase = createClient()
    const { data } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('total_price', { ascending: false })
    return data ?? []
  }

  async function createSession(data: { store_name: string; date: string; notes?: string }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: session, error } = await supabase
      .from('grocery_sessions')
      .insert({ ...data, household_id: householdId, user_id: user?.id, total_amount: 0 })
      .select('id').single()
    if (!error) fetchSessions()
    return { sessionId: session?.id, error }
  }

  async function addItem(sessionId: string, item: Omit<GroceryItem, 'id' | 'session_id'>) {
    const supabase = createClient()
    await supabase.from('grocery_items').insert({ ...item, session_id: sessionId })

    // Atualiza total da sessão
    const items = await fetchItems(sessionId)
    const total = items.reduce((s, i) => s + Number(i.total_price), 0)
    await supabase.from('grocery_sessions').update({ total_amount: total }).eq('id', sessionId)

    // Atualiza/cria produto no catálogo se tiver nome
    if (item.name) {
      const existing = products.find(p =>
        p.name.toLowerCase() === item.name.toLowerCase()
      )
      if (existing) {
        await supabase.from('grocery_products').update({
          last_price: item.unit_price, last_purchased: new Date().toISOString().split('T')[0],
        }).eq('id', existing.id)
        await supabase.from('grocery_price_history').insert({
          product_id: existing.id, session_id: sessionId,
          store_name: '', price: item.unit_price, date: new Date().toISOString().split('T')[0],
        })
      }
    }
    fetchSessions()
    fetchProducts()
  }

  async function deleteSession(id: string) {
    const supabase = createClient()
    await supabase.from('shopping_lists').update({ grocery_session_id: null }).eq('grocery_session_id', id)
    await supabase.from('grocery_sessions').delete().eq('id', id)
    fetchSessions()
  }

  async function deleteItem(itemId: string, sessionId: string) {
    const supabase = createClient()
    await supabase.from('grocery_items').delete().eq('id', itemId)
    const items = await fetchItems(sessionId)
    const total = items.reduce((s, i) => s + Number(i.total_price), 0)
    await supabase.from('grocery_sessions').update({ total_amount: total }).eq('id', sessionId)
    fetchSessions()
  }

  return {
    sessions, products, loading, error,
    getMonthStats, fetchItems,
    createSession, addItem, deleteSession, deleteItem,
    refetch: fetchSessions,
  }
}
