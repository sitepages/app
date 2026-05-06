export type WishItemStatus = 'quero' | 'economizando' | 'comprado'

export interface WishCategory {
  id: string
  household_id: string
  name: string
  icon?: string
  color?: string
}

export interface WishItem {
  id: string
  household_id: string
  category_id?: string
  category?: WishCategory
  name: string
  description?: string
  image_url?: string
  target_price?: number
  saved_amount: number
  priority: number
  status: WishItemStatus
  target_date?: string
  purchase_date?: string
  url?: string
  added_by?: string
  created_at: string
  updated_at: string
}

export interface CreateWishItemDTO {
  name: string
  description?: string
  category_id?: string
  target_price?: number
  saved_amount?: number
  target_date?: string
  url?: string
  image_url?: string
  status?: WishItemStatus
}

export interface CreateWishCategoryDTO {
  name: string
  icon?: string
  color?: string
}

export function getWishItemProgress(item: WishItem): {
  percentage: number
  remaining: number
  isComplete: boolean
} {
  if (!item.target_price || item.target_price <= 0) {
    return { percentage: 0, remaining: 0, isComplete: false }
  }
  const percentage = Math.min(100, (item.saved_amount / item.target_price) * 100)
  const remaining = Math.max(0, item.target_price - item.saved_amount)
  const isComplete = item.saved_amount >= item.target_price
  return { percentage, remaining, isComplete }
}
