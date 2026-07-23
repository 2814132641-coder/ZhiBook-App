/**
 * 桌面端 API client
 * 包装 @zhibook/shared 的 ApiClient，统一从后端 HTTP 服务获取数据
 */
import { ApiClient } from '../../../shared/api/index'
import type {
  Category,
  RecordItem,
  MonthlySummary,
  CreateRecordInput,
  UpdateRecordInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ListRecordsQuery,
  CategorySummary
} from '../../../shared/api/index'

export const api = new ApiClient({
  baseUrl: 'http://127.0.0.1:5210'
})

export type {
  Category,
  RecordItem,
  MonthlySummary,
  CreateRecordInput,
  UpdateRecordInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ListRecordsQuery,
  CategorySummary
}