'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'
import type {
  WishItem, WishCategory, WishItemStatus,
  CreateWishItemDTO, CreateWishCategoryDTO,
} from '@/lib/types/wishlist'

export function useWishlist(householdId: string) {
  const [items, setItems]           = useState<WishItem[]>([])
  const [categories, setCategories] = useState<WishCategory[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [catRes, itemRes] = await Promise.all([
      supabase.from('wish_categories').select('*').eq('household_id', householdId).order('name'),
      supabase.from('wish_items').select('*, category:wish_categories(*)').eq('household_id', householdId).order('priority'),
    ])
    if (catRes.error) setError(catRes.error.message)
    else setCategories(catRes.data ?? [])
    if (itemRes.error) setError(itemRes.error.message)
    else setItems(itemRes.data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function addItem(data: CreateWishItemDTO) {
    const supabase = createClient()
    const statusItems = items.filter(i => i.status === (data.status ?? 'quero'))
    const priority = statusItems.length > 0
      ? Math.max(...statusItems.map(i => i.priority)) + 1
      : 0
    await supabase.from('wish_items').insert({
      ...data,
      household_id: householdId,
      saved_amount: data.saved_amount ?? 0,
      status: data.status ?? 'quero',
      priority,
    })
    fetchAll()
  }

  async function updateItem(id: string, data: Partial<WishItem>) {
    const prev = items.find(i => i.id === id)
    setItems(items.map(i => i.id === id ? { ...i, ...data } : i))
    const supabase = createClient()
    const { error } = await supabase
      .from('wish_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      if (prev) setItems(items.map(i => i.id === id ? prev : i))
      setError(error.message)
    }
  }

  async function deleteItem(id: string) {
    setItems(items.filter(i => i.id !== id))
    const supabase = createClient()
    const { error } = await supabase.from('wish_items').delete().eq('id', id)
    if (error) { fetchAll(); setError(error.message) }
  }

  async function moveItem(id: string, newStatus: WishItemStatus) {
    const item = items.find(i => i.id === id)
    if (!item || item.status === newStatus) return
    const destItems = items.filter(i => i.status === newStatus)
    const newPriority = destItems.length > 0
      ? Math.max(...destItems.map(i => i.priority)) + 1
      : 0
    const patch: Partial<WishItem> = {
      status: newStatus,
      priority: newPriority,
      updated_at: new Date().toISOString(),
    }
    if (newStatus === 'comprado') {
      patch.purchase_date = new Date().toISOString().split('T')[0]
    }
    setItems(items.map(i => i.id === id ? { ...i, ...patch } : i))
    const supabase = createClient()
    const { error } = await supabase.from('wish_items').update(patch).eq('id', id)
    if (error) { fetchAll(); setError(error.message) }
  }

  async function reorderItems(itemId: string, newPriority: number, status: WishItemStatus) {
    const colItems = items
      .filter(i => i.status === status)
      .sort((a, b) => a.priority - b.priority)
    const moving = colItems.find(i => i.id === itemId)
    if (!moving) return
    const rest = colItems.filter(i => i.id !== itemId)
    rest.splice(newPriority, 0, moving)
    const reordered = rest.map((item, idx) => ({ ...item, priority: idx }))
    setItems(items.map(i => {
      const r = reordered.find(r => r.id === i.id)
      return r ? r : i
    }))
    const supabase = createClient()
    await Promise.all(
      reordered.map(i =>
        supabase.from('wish_items').update({ priority: i.priority }).eq('id', i.id)
      )
    )
  }

  async function addCategory(data: CreateWishCategoryDTO) {
    const supabase = createClient()
    const { data: cat, error } = await supabase
      .from('wish_categories')
      .insert({ ...data, household_id: householdId })
      .select('*')
      .single()
    if (!error && cat) setCategories([...categories, cat])
    return cat
  }

  async function uploadImage(file: File): Promise<string> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${householdId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('wish-images').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('wish-images').getPublicUrl(path)
    return data.publicUrl
  }

  return {
    items, categories, loading, error,
    refetch: fetchAll,
    addItem, updateItem, deleteItem,
    moveItem, reorderItems,
    addCategory, uploadImage,
  }
}
