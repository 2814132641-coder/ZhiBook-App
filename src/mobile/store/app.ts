/**
 * 移动端 store · 用 Vue 3 composition API 简单实现
 * 不引 Pinia，避免多一个依赖
 */

import { ref, computed } from 'vue'
import { api } from '../shared/api/index'
import type { Category, RecordItem } from '../shared/api/index'

// ===== 分类 store =====
const categories = ref<Category[]>([])
const categoriesLoaded = ref(false)

async function loadCategories() {
  if (categoriesLoaded.value) return
  try {
    categories.value = await api.categories.list()
    categoriesLoaded.value = true
  } catch (e) {
    console.error('[store] loadCategories failed', e)
  }
}

const roots = computed(() =>
  categories.value.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder)
)

const getChildrenOf = (parentId: number | null) =>
  categories.value
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

function getById(id: number): Category | undefined {
  return categories.value.find((c) => c.id === id)
}

// ===== 流水 store =====
const records = ref<RecordItem[]>([])
const recordsLoading = ref(false)

async function loadRecords(query: { month?: string; keyword?: string } = {}) {
  recordsLoading.value = true
  try {
    records.value = await api.records.list(query)
  } catch (e) {
    console.error('[store] loadRecords failed', e)
  } finally {
    recordsLoading.value = false
  }
}

async function createRecord(input: {
  amount: number
  categoryId: number
  note?: string | null
  occurredAt: string
}) {
  const created = await api.records.create(input)
  records.value.unshift(created)
  return created
}

async function deleteRecord(id: number) {
  await api.records.delete(id)
  records.value = records.value.filter((r) => r.id !== id)
}

export function useAppStore() {
  return {
    // state
    categories,
    records,
    recordsLoading,
    // computed
    roots,
    // actions
    loadCategories,
    loadRecords,
    createRecord,
    deleteRecord,
    getChildrenOf,
    getById
  }
}