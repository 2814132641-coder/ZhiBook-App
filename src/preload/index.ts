import { contextBridge, ipcRenderer } from 'electron'
import type { AppApi, CreateCategoryInput, CreateRecordInput, ListRecordsQuery, UpdateCategoryInput, UpdateRecordInput } from '../shared/types'

const api: AppApi = {
  records: {
    create: (input: CreateRecordInput) => ipcRenderer.invoke('records:create', input),
    update: (input: UpdateRecordInput) => ipcRenderer.invoke('records:update', input),
    delete: (id: number) => ipcRenderer.invoke('records:delete', id),
    list: (query?: ListRecordsQuery) => ipcRenderer.invoke('records:list', query ?? {})
  },
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    create: (input: CreateCategoryInput) => ipcRenderer.invoke('categories:create', input),
    update: (input: UpdateCategoryInput) => ipcRenderer.invoke('categories:update', input),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },
  stats: {
    monthlySummary: (month: string) => ipcRenderer.invoke('stats:monthlySummary', month)
  },
  settings: {
    exportCSV: () => ipcRenderer.invoke('settings:exportCSV'),
    clearAll: () => ipcRenderer.invoke('settings:clearAll')
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore (fallback only)
  window.api = api
}