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
import type { RecordItem } from '@shared/types'
import EditRecordModal from '../components/EditRecordModal'

export default function History() {
  const { message } = App.useApp()
  const list = useCategories((s) => s.list)
  const loadCategories = useCategories((s) => s.load)

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
      const data = await window.api.records.list(query)
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
      await window.api.records.delete(id)
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
          <Empty description="暂无记录" />
        ) : (
          <List
            loading={loading}
            dataSource={records}
            renderItem={(item) => {
              const color = item.categoryColor ?? '#95A5A6'
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
                          color: '#fff',
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
                        <span style={{ color: '#7f8c8d', marginRight: 8 }}>
                          {item.categoryName ?? '未知'}
                        </span>
                        <span style={{ color: '#2c3e50' }}>{item.note ?? ''}</span>
                      </span>
                    }
                    description={formatDateTime(item.occurredAt)}
                  />
                  <div
                    className="amount"
                    style={{ color: '#E74C3C', fontSize: 18, minWidth: 100, textAlign: 'right' }}
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