import { create } from 'zustand'

const STORAGE_KEY = 'light-ledger:recent-categories'
const MAX_ITEMS = 3

interface RecentCategoriesState {
  items: number[] // categoryId 列表（最新在前），最多 3 个
  record: (categoryId: number) => void
  clear: () => void
}

function loadFromStorage(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'number')) {
      return parsed.slice(0, MAX_ITEMS)
    }
    return []
  } catch {
    return []
  }
}

function saveToStorage(items: number[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage 不可用时静默失败（不影响功能）
  }
}

export const useRecentCategories = create<RecentCategoriesState>((set, get) => ({
  items: loadFromStorage(),

  record(categoryId) {
    const current = get().items
    // 同 id 提升到首位；不存在则插入首位；超过 MAX 个丢弃尾部
    const filtered = current.filter((id) => id !== categoryId)
    const next = [categoryId, ...filtered].slice(0, MAX_ITEMS)
    saveToStorage(next)
    set({ items: next })
  },

  clear() {
    saveToStorage([])
    set({ items: [] })
  }
}))

/** 把 categoryId 列表解析为 Category 对象（用于渲染最近使用行） */
export function resolveRecentCategories(
  recentIds: number[],
  allCategories: { id: number; name: string; icon: string; color: string; parentId: number | null; sortOrder: number }[]
) {
  const map = new Map(allCategories.map((c) => [c.id, c]))
  return recentIds.map((id) => map.get(id)).filter((c): c is NonNullable<typeof c> => !!c && c.parentId !== null)
}