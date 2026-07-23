// 共享类型 · 桌面、移动端、后端都用

export interface Category {
  id: number
  parentId: number | null
  name: string
  icon: string
  color: string
  sortOrder: number
}

export interface RecordItem {
  id: number
  amount: number
  categoryId: number
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  note: string | null
  occurredAt: string
  createdAt: string
  updatedAt: string
}

export interface CreateRecordInput {
  amount: number
  categoryId: number
  note?: string | null
  occurredAt: string
}

export interface UpdateRecordInput extends CreateRecordInput {
  id: number
}

export interface CreateCategoryInput {
  parentId: number | null
  name: string
  icon?: string
  color?: string
}

export interface UpdateCategoryInput extends CreateCategoryInput {
  id: number
}

export interface ListRecordsQuery {
  month?: string
  categoryId?: number
  keyword?: string
}

export interface CategorySummary {
  categoryId: number
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amount: number
  percent: number
}

export interface MonthlySummary {
  month: string
  total: number
  count: number
  avgPerDay: number
  byCategory: CategorySummary[]
}