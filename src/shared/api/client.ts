/**
 * 共享 API client（fetch 封装）
 * 桌面端与移动端都用同一个 client 调用后端 REST API
 */

import type {
  Category,
  CreateCategoryInput,
  CreateRecordInput,
  ListRecordsQuery,
  MonthlySummary,
  RecordItem,
  UpdateCategoryInput,
  UpdateRecordInput
} from './types'

export interface ApiConfig {
  /** API 基础地址，默认 http://127.0.0.1:5210 */
  baseUrl?: string
  /** fetch 额外选项 */
  fetchOptions?: RequestInit
}

export class ApiClient {
  private baseUrl: string
  private fetchOptions: RequestInit

  constructor(config: ApiConfig = {}) {
    this.baseUrl = (config.baseUrl ?? 'http://127.0.0.1:5210').replace(/\/$/, '')
    this.fetchOptions = config.fetchOptions ?? {}
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      ...this.fetchOptions,
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...this.fetchOptions.headers,
        ...init.headers
      }
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status} ${res.statusText}: ${text}`)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  records = {
    create: (input: CreateRecordInput) =>
      this.request<RecordItem>('/api/records', { method: 'POST', body: JSON.stringify(input) }),
    update: (input: UpdateRecordInput) =>
      this.request<RecordItem>(`/api/records/${input.id}`, {
        method: 'PUT',
        body: JSON.stringify(input)
      }),
    delete: (id: number) =>
      this.request<void>(`/api/records/${id}`, { method: 'DELETE' }),
    list: (query: ListRecordsQuery = {}) => {
      const params = new URLSearchParams()
      if (query.month) params.set('month', query.month)
      if (query.categoryId) params.set('categoryId', String(query.categoryId))
      if (query.keyword) params.set('keyword', query.keyword)
      const qs = params.toString()
      return this.request<RecordItem[]>(`/api/records${qs ? `?${qs}` : ''}`)
    }
  }

  categories = {
    list: () => this.request<Category[]>('/api/categories'),
    create: (input: CreateCategoryInput) =>
      this.request<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    update: (input: UpdateCategoryInput) =>
      this.request<Category>(`/api/categories/${input.id}`, {
        method: 'PUT',
        body: JSON.stringify(input)
      }),
    delete: (id: number) =>
      this.request<void>(`/api/categories/${id}`, { method: 'DELETE' })
  }

  stats = {
    monthlySummary: (month: string) =>
      this.request<MonthlySummary>(`/api/stats/monthly?month=${encodeURIComponent(month)}`)
  }

  settings = {
    exportCSV: () => this.request<{ path: string }>('/api/settings/export', { method: 'POST' }),
    clearAll: () => this.request<void>('/api/settings/clear', { method: 'POST' })
  }
}

/** 桌面与移动端共享默认 client */
export const api = new ApiClient()