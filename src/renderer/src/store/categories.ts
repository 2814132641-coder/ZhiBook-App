import { create } from 'zustand'
import type { Category } from '@shared/types'

interface CategoriesState {
  list: Category[]
  loading: boolean
  load: () => Promise<void>
  getById: (id: number) => Category | undefined
  getChildrenOf: (parentId: number | null) => Category[]
  getRoots: () => Category[]
}

export const useCategories = create<CategoriesState>((set, get) => ({
  list: [],
  loading: false,
  async load() {
    set({ loading: true })
    const list = await window.api.categories.list()
    set({ list, loading: false })
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