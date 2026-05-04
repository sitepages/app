'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

export interface ShoppingList {
  id: string
  household_id: string
  name: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  budget: number | null
  estimated_total: number
  actual_total: number | null
  created_by: string | null
  completed_at: string | null
  grocery_session_id: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingListItem {
  id: string
  list_id: string
  household_id: string
  product_name: string
  quantity: number
  unit: string | null
  estimated_price: number | null
  actual_price: number | null
  is_checked: boolean
  grocery_product_id: string | null
  category_hint: string | null
  added_by: string | null
  checked_by: string | null
  checked_at: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingListSuggestion {
  product_name: string
  last_price: number | null
  times_bought: number
  grocery_product_id: string | null
}

export function useShoppingList() {
  const [activeList, setActiveList] = useState<ShoppingList | null>(null)
  const [items, setItems]           = useState<ShoppingListItem[]>([])
  const [suggestions, setSuggestions] = useState<ShoppingListSuggestion[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const fetchActiveList = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) setError(error.message)
    else setActiveList(data)
    return data
  }, [])

  const fetchItems = useCallback(async (listId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setItems(data ?? [])
  }, [])

  const fetchSuggestions = useCallback(async () => {
    const supabase = createClient()
    const { data: sessions } = await supabase
      .from('grocery_sessions')
      .select('id')
      .eq('household_id', HOUSEHOLD_ID)
    if (!sessions || sessions.length === 0) return

    const sessionIds = sessions.map(s => s.id)
    const { data } = await supabase
      .from('grocery_items')
      .select('name, unit_price, product_id')
      .in('session_id', sessionIds)
    if (!data) return

    const map = new Map<string, { times: number; lastPrice: number | null; productId: string | null }>()
    for (const item of data) {
      const key = item.name.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.times++
        if (item.unit_price != null) existing.lastPrice = item.unit_price
      } else {
        map.set(key, { times: 1, lastPrice: item.unit_price ?? null, productId: item.product_id ?? null })
      }
    }

    setSuggestions(
      [...map.entries()]
        .sort((a, b) => b[1].times - a[1].times)
        .slice(0, 10)
        .map(([name, { times, lastPrice, productId }]) => ({
          product_name: name,
          times_bought: times,
          last_price: lastPrice,
          grocery_product_id: productId,
        }))
    )
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const list = await fetchActiveList()
    if (list) await fetchItems(list.id)
    else setItems([])
    await fetchSuggestions()
    setLoading(false)
  }, [fetchActiveList, fetchItems, fetchSuggestions])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime: shopping_lists channel
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('shopping_lists_realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shopping_lists',
        filter: `household_id=eq.${HOUSEHOLD_ID}`,
      }, async () => {
        const list = await fetchActiveList()
        if (list) fetchItems(list.id)
        else setItems([])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchActiveList, fetchItems])

  // Realtime: shopping_list_items channel (depends on active list)
  const activeListId = activeList?.id ?? null
  useEffect(() => {
    if (!activeListId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`shopping_list_items_${activeListId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shopping_list_items',
        filter: `list_id=eq.${activeListId}`,
      }, () => fetchItems(activeListId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeListId, fetchItems])

  async function recalcEstimatedTotal(listId: string, currentItems: ShoppingListItem[]) {
    const total = currentItems.reduce((sum, i) =>
      sum + (Number(i.estimated_price ?? 0) * Number(i.quantity)), 0)
    const supabase = createClient()
    await supabase.from('shopping_lists').update({ estimated_total: total }).eq('id', listId)
  }

  async function createList(name = 'Lista de compras', budget?: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({ household_id: HOUSEHOLD_ID, name, budget: budget ?? null, created_by: user?.id ?? null })
      .select('*')
      .single()
    if (!error && data) { setActiveList(data); setItems([]) }
    return data
  }

  async function addItem(payload: {
    product_name: string
    quantity?: number
    unit?: string
    estimated_price?: number
    grocery_product_id?: string
    category_hint?: string
  }) {
    if (!activeList) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: activeList.id,
        household_id: HOUSEHOLD_ID,
        product_name: payload.product_name,
        quantity: payload.quantity ?? 1,
        unit: payload.unit ?? null,
        estimated_price: payload.estimated_price ?? null,
        grocery_product_id: payload.grocery_product_id ?? null,
        category_hint: payload.category_hint ?? null,
        added_by: user?.id ?? null,
      })
      .select('*')
      .single()
    if (!error && data) {
      const newItems = [...items, data]
      setItems(newItems)
      recalcEstimatedTotal(activeList.id, newItems)
    }
  }

  async function removeItem(itemId: string) {
    const supabase = createClient()
    await supabase.from('shopping_list_items').delete().eq('id', itemId)
    const newItems = items.filter(i => i.id !== itemId)
    setItems(newItems)
    if (activeList) recalcEstimatedTotal(activeList.id, newItems)
  }

  async function toggleItem(itemId: string) {
    if (!activeList) return
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const newChecked = !item.is_checked
    await supabase.from('shopping_list_items').update({
      is_checked: newChecked,
      checked_by: newChecked ? (user?.id ?? null) : null,
      checked_at: newChecked ? new Date().toISOString() : null,
    }).eq('id', itemId)
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, is_checked: newChecked, checked_by: newChecked ? (user?.id ?? null) : null, checked_at: newChecked ? new Date().toISOString() : null }
        : i
    ))
  }

  async function updateItemPrice(itemId: string, actualPrice: number) {
    const supabase = createClient()
    await supabase.from('shopping_list_items').update({ actual_price: actualPrice }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, actual_price: actualPrice } : i))
  }

  async function updateBudget(budget: number | null) {
    if (!activeList) return
    const supabase = createClient()
    await supabase.from('shopping_lists').update({ budget }).eq('id', activeList.id)
    setActiveList(prev => prev ? { ...prev, budget } : null)
  }

  async function finalizeList(): Promise<string | null> {
    if (!activeList) return null
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const checkedItems = items.filter(i => i.is_checked)
    const actualTotal = checkedItems.reduce((sum, i) =>
      sum + (Number(i.actual_price ?? i.estimated_price ?? 0) * Number(i.quantity)), 0)

    const { data: session, error: sessError } = await supabase
      .from('grocery_sessions')
      .insert({
        household_id: HOUSEHOLD_ID,
        user_id: user?.id ?? null,
        store_name: activeList.name,
        date: new Date().toISOString().split('T')[0],
        total_amount: actualTotal,
        notes: 'Gerado da lista de compras',
      })
      .select('id')
      .single()

    if (sessError || !session) return null

    for (const item of checkedItems) {
      const unitPrice = Number(item.actual_price ?? item.estimated_price ?? 0)
      const qty = Number(item.quantity)
      await supabase.from('grocery_items').insert({
        session_id: session.id,
        household_id: HOUSEHOLD_ID,
        name: item.product_name,
        quantity: qty,
        unit: item.unit ?? 'UN',
        unit_price: unitPrice,
        total_price: unitPrice * qty,
        subcategory: item.category_hint ?? null,
        product_id: item.grocery_product_id ?? null,
      })
    }

    await supabase.from('shopping_lists').update({
      status: 'COMPLETED',
      grocery_session_id: session.id,
      completed_at: new Date().toISOString(),
      actual_total: actualTotal,
    }).eq('id', activeList.id)

    setActiveList(null)
    setItems([])
    return session.id
  }

  async function archiveList() {
    if (!activeList) return
    const supabase = createClient()
    await supabase.from('shopping_lists').update({ status: 'ARCHIVED' }).eq('id', activeList.id)
    setActiveList(null)
    setItems([])
  }

  return {
    activeList, items, suggestions, loading, error,
    createList, addItem, removeItem, toggleItem,
    updateItemPrice, updateBudget, finalizeList, archiveList,
  }
}
