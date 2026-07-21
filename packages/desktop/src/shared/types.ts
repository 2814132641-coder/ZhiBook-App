// 主进程与渲染端共用的类型定义

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
  occurredAt: string // ISO8601 本地时间
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
  month?: string // YYYY-MM
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

export interface AppApi {
  records: {
    create: (input: CreateRecordInput) => Promise<RecordItem>
    update: (input: UpdateRecordInput) => Promise<RecordItem>
    delete: (id: number) => Promise<void>
    list: (query?: ListRecordsQuery) => Promise<RecordItem[]>
  }
  categories: {
    list: () => Promise<Category[]>
    create: (input: CreateCategoryInput) => Promise<Category>
    update: (input: UpdateCategoryInput) => Promise<Category>
    delete: (id: number) => Promise<void>
  }
  stats: {
    monthlySummary: (month: string) => Promise<MonthlySummary>
  }
  settings: {
    exportCSV: () => Promise<string>
    clearAll: () => Promise<void>
  }
}

declare global {
  interface Window {
    api: AppApi
  }
}