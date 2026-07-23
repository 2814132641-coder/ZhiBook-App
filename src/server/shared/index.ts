// 顶层入口：显式导出（兼容 CJS 与 ESM）
export { ApiClient } from './api'
export type {
  Category,
  RecordItem,
  MonthlySummary,
  CreateRecordInput,
  UpdateRecordInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ListRecordsQuery,
  CategorySummary,
  ApiConfig
} from './api'

export { SEED_CATEGORIES, SEED_TOTAL } from './schema'
export type { SeedCategory } from './schema'

export { formatAmount, currentMonth, nowIso, formatDateTime, formatDate } from './utils'
export { pickSmartDefaultChild, NOTE_FOCUS_NAMES, getNoteHint } from './utils'