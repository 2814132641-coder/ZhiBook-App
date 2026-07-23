import { create } from 'zustand'
import type { Category } from '../../../shared/api/index'
import { api } from '../lib/api'

interface CategoriesState {
  list: Category[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  getById: (id: number) => Category | undefined
  getChildrenOf: (parentId: number | null) => Category[]
  getRoots: () => Category[]
}

export const useCategories = create<CategoriesState>((set, get) => ({
  list: [],
  loading: false,
  error: null,
  async load() {
    set({ loading: true, error: null })
    try {
      const list = await api.categories.list()
      set({ list, loading: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({ loading: false, error: msg })
      // 后端未就绪时 1s 后自动重试（最多 5 次）
      const retries = (get() as unknown as { _retries?: number })._retries ?? 0
      if (retries < 5) {
        ;(get() as unknown as { _retries?: number })._retries = retries + 1
        setTimeout(() => get().load(), 1000)
      }
    }
  },
  getById(id) {
    return get().list.find((c) => c.id === id)
  },
  getChildrenOf(parentId) {
    return get()
      .list.filter((c) => c.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },
  getRoots() {
    return get()
      .list.filter((c) => c.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }
}))