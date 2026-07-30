import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Segmented,
  Space
} from 'antd'
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useCategories } from '../store/categories'
import { formatAmount, formatDateTime } from '../utils/format'
import type { RecordItem } from '../../../shared/api/index'
import EditRecordModal from '../components/EditRecordModal'
import { api } from '../lib/api';
import { useConnection } from '../lib/useConnection'
import { useNavigate } from 'react-router-dom'

export default function History() {
  const { message } = App.useApp()
  const list = useCategories((s) => s.list)
  const loadCategories = useCategories((s) => s.load)

  const navigate = useNavigate()
  const { online, checking, retry } = useConnection()

  const [scope, setScope] = useState<'month' | 'all'>('month')
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [keyword, setKeyword] = useState('')
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<RecordItem | null>(null)

  useEffect(() => {
    if (list.length === 0) loadCategories()
  }, [list.length, loadCategories])

  const query = useMemo(() => {
    const q: { month?: string; keyword?: string } = {}
    if (scope === 'month') q.month = month.format('YYYY-MM')
    if (keyword.trim()) q.keyword = keyword.trim()
    return q
  }, [scope, month, keyword])

  async function refresh() {
    setLoading(true)
    try {
      const data = await api.records.list(query)
      setRecords(data)
    } catch (e) {
      message.error('加载失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.month, query.keyword])

  async function handleDelete(id: number) {
    try {
      await api.records.delete(id)
      message.success('已删除')
      refresh()
    } catch (e) {
      message.error('删除失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Segmented<'month' | 'all'>
            value={scope}
            onChange={(v) => setScope(v)}
            options={[
              { label: '本月', value: 'month' },
              { label: '全部', value: 'all' }
            ]}
          />
          {scope === 'month' && (
            <DatePicker.MonthPicker
              value={month}
              onChange={(v) => v && setMonth(v)}
              format="YYYY 年 MM 月"
              allowClear={false}
            />
          )}
          <Input
            placeholder="搜索备注 / 分类"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
        </Space>

        {records.length === 0 && !loading ? (
          online === false ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 20, marginBottom: 12 }}>无法连接到后端</div>
              <div style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                检测到后端服务不可用，历史记录加载失败。你可以重试或前往设置查看帮助。
              </div>
              <Button type="primary" loading={checking} onClick={retry} style={{ marginRight: 8 }}>
                重试
              </Button>
              <Button onClick={() => navigate('/settings')}>打开设置</Button>
            </div>
          ) : (
            <Empty description="暂无记录" />
          )
        ) : (
          <List
            loading={loading}
            dataSource={records}
            renderItem={(item) => {
              const color = item.categoryColor ?? 'var(--color-text-secondary)'
              return (
                <List.Item
                  key={item.id}
                  actions={[
                    <Button
                      key="edit"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => setEditing(item)}
                    />,
                    <Popconfirm
                      key="del"
                      title="确认删除？"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(item.id)}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: color,
                          color: 'var(--color-bg-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}
                      >
                        {item.categoryIcon ?? '📦'}
                      </div>
                    }
                    title={
                      <span>
                        <span style={{ color: 'var(--color-text-secondary)', marginRight: 8 }}>
                          {item.categoryName ?? '未知'}
                        </span>
                        <span style={{ color: 'var(--color-text-primary)' }}>{item.note ?? ''}</span>
                      </span>
                    }
                    description={formatDateTime(item.occurredAt)}
                  />
                  <div
                    className="amount"
                    style={{ color: 'var(--color-danger)', fontSize: 18, minWidth: 100, textAlign: 'right' }}
                  >
                    -{formatAmount(item.amount)}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Card>

      <EditRecordModal
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
