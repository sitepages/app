'use client'

import { useState } from 'react'
import { createClient } from '@/services/supabase/client'

export function useDeleteTransaction(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false)

  // Hard delete — remove permanentemente
  async function hardDelete(id: string) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    setLoading(false)
    if (!error) onSuccess?.()
    return { error }
  }

  // Soft delete — marca como inativa, fica no histórico
  async function softDelete(id: string) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setLoading(false)
    if (!error) onSuccess?.()
    return { error }
  }

  // Restaurar soft delete
  async function restore(id: string) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: null })
      .eq('id', id)
    setLoading(false)
    if (!error) onSuccess?.()
    return { error }
  }

  // Hard delete de um batch inteiro (desfaz uma importação)
  async function hardDeleteBatch(batchId: string) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('import_batch_id', batchId)
    if (!error) {
      await supabase.from('import_batches').delete().eq('id', batchId)
      onSuccess?.()
    }
    setLoading(false)
    return { error }
  }

  // Soft delete de um batch inteiro
  async function softDeleteBatch(batchId: string) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('import_batch_id', batchId)
    setLoading(false)
    if (!error) onSuccess?.()
    return { error }
  }

  return { loading, hardDelete, softDelete, restore, hardDeleteBatch, softDeleteBatch }
}
