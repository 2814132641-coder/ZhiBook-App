import { useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Input, DatePicker, InputNumber } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCategories } from '../store/categories'
import { formatAmount } from '../utils/format'

export default function Home() {
  const { message } = App.useApp()
  const list = useCategories((s) => s.list)
  const loadCategories = useCategories((s) => s.load)

  // 用 useMemo 在组件内派生稳定引用，避免 selector 返回新数组触发死循环
  const roots = useMemo(
    () => list.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [list]
  )
  const getChildrenOf = useMemo(
    () => (parentId: number) =>
      list.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder),
    [list]
  )

  const [selectedRootId, setSelectedRootId] = useState<number | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [occurredAt, setOccurredAt] = useState<Dayjs>(dayjs())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (list.length === 0) loadCategories()
  }, [list.length, loadCategories])

  // 默认选中第一个一级
  useEffect(() => {
    if (!selectedRootId && roots.length > 0) {
      setSelectedRootId(roots[0].id)
    }
  }, [roots, selectedRootId])

  // 一级切换时重置二级
  useEffect(() => {
    if (selectedRootId !== null) {
      const children = getChildrenOf(selectedRootId)
      if (children.length > 0) {
        setSelectedChildId(children[0].id)
      } else {
        setSelectedChildId(null)
      }
    }
  }, [selectedRootId, getChildrenOf])

  const childCategories = selectedRootId !== null ? getChildrenOf(selectedRootId) : []

  const canSave = amount !== null && amount > 0 && selectedChildId !== null && !saving

  async function handleSave() {
    if (!canSave || selectedChildId === null || amount === null) return
    setSaving(true)
    try {
      const created = await window.api.records.create({
        amount,
        categoryId: selectedChildId,
        note: note.trim() || null,
        occurredAt: occurredAt.toDate().toISOString().slice(0, 19)
      })
      message.success(`已记录 ${formatAmount(created.amount)}`)
      setAmount(null)
      setNote('')
      setOccurredAt(dayjs())
    } catch (e) {
      message.error('保存失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 32, color: '#2E7D5B', marginRight: 8 }}>¥</span>
          <InputNumber
            value={amount}
            onChange={(v) => setAmount(v)}
            min={0}
            precision={2}
            step={0.01}
            placeholder="0.00"
            style={{ fontSize: 36, width: 280 }}
            controls={false}
            data-testid="amount-input"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: '#7f8c8d', fontSize: 13 }}>一级分类</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {roots.map((cat) => {
              const active = cat.id === selectedRootId
              return (
                <Button
                  key={cat.id}
                  type={active ? 'primary' : 'default'}
                  onClick={() => setSelectedRootId(cat.id)}
                  style={
                    active
                      ? { background: cat.color, borderColor: cat.color }
                      : { borderColor: cat.color, color: cat.color }
                  }
                >
                  <span style={{ marginRight: 4 }}>{cat.icon}</span>
                  {cat.name}
                </Button>
              )
            })}
          </div>
        </div>

        {childCategories.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: '#7f8c8d', fontSize: 13 }}>二级分类</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {childCategories.map((cat) => {
                const active = cat.id === selectedChildId
                return (
                  <Button
                    key={cat.id}
                    type={active ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setSelectedChildId(cat.id)}
                  >
                    <span style={{ marginRight: 4 }}>{cat.icon}</span>
                    {cat.name}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: '#7f8c8d', fontSize: 13 }}>时间</div>
          <DatePicker
            showTime
            value={occurredAt}
            onChange={(v) => setOccurredAt(v ?? dayjs())}
            style={{ width: '100%' }}
            format="YYYY-MM-DD HH:mm"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8, color: '#7f8c8d', fontSize: 13 }}>备注（可选，最多 50 字）</div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 50))}
            placeholder="例如：午餐-公司食堂-麻辣烫"
            maxLength={50}
            showCount
          />
        </div>

        <Button
          type="primary"
          size="large"
          block
          disabled={!canSave}
          loading={saving}
          onClick={handleSave}
          style={{ background: '#2E7D5B', borderColor: '#2E7D5B' }}
        >
          保存
        </Button>
      </Card>
    </div>
  )
}