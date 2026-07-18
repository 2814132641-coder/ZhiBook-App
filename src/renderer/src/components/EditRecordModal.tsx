import { useEffect, useMemo, useState } from 'react'
import { App, Button, DatePicker, Input, InputNumber, Modal } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCategories } from '../store/categories'
import { formatAmount } from '../utils/format'
import type { RecordItem } from '@shared/types'

interface Props {
  record: RecordItem | null
  onClose: () => void
  onSaved: () => void
}

export default function EditRecordModal({ record, onClose, onSaved }: Props) {
  const { message } = App.useApp()
  const list = useCategories((s) => s.list)
  const loadCategories = useCategories((s) => s.load)

  const roots = useMemo(
    () => list.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [list]
  )
  const getChildrenOf = useMemo(
    () => (parentId: number) =>
      list.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder),
    [list]
  )

  const [amount, setAmount] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [rootId, setRootId] = useState<number | null>(null)
  const [childId, setChildId] = useState<number | null>(null)
  const [occurredAt, setOccurredAt] = useState<Dayjs>(dayjs())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (list.length === 0) loadCategories()
  }, [list.length, loadCategories])

  useEffect(() => {
    if (record) {
      setAmount(record.amount)
      setNote(record.note ?? '')
      setOccurredAt(dayjs(record.occurredAt))
      // 由当前分类找到父级
      const child = list.find((c) => c.id === record.categoryId)
      if (child) {
        setRootId(child.parentId)
        setChildId(child.id)
      }
    }
  }, [record, list])

  const childCategories = rootId !== null ? getChildrenOf(rootId) : []

  if (!record) return null

  const canSave =
    amount !== null && amount > 0 && childId !== null && !saving

  async function handleSave() {
    if (!record || !canSave || amount === null || childId === null) return
    setSaving(true)
    try {
      await window.api.records.update({
        id: record.id,
        amount,
        categoryId: childId,
        note: note.trim() || null,
        occurredAt: occurredAt.toDate().toISOString().slice(0, 19)
      })
      message.success('已更新')
      onSaved()
    } catch (e) {
      message.error('更新失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="编辑记录"
      open={!!record}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={!canSave}
          onClick={handleSave}
          style={{ background: '#2E7D5B', borderColor: '#2E7D5B' }}
        >
          保存
        </Button>
      ]}
    >
      <div style={{ marginBottom: 12 }}>
        <span style={{ marginRight: 8 }}>¥</span>
        <InputNumber
          value={amount}
          onChange={(v) => setAmount(v)}
          min={0}
          precision={2}
          controls={false}
          style={{ width: 200 }}
          formatter={(v) => `${v}`}
        />
        <span style={{ marginLeft: 8, color: '#E74C3C' }}>
          {amount ? formatAmount(amount) : ''}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6, color: '#7f8c8d', fontSize: 13 }}>一级分类</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {roots.map((cat) => (
            <Button
              key={cat.id}
              size="small"
              type={cat.id === rootId ? 'primary' : 'default'}
              onClick={() => {
                setRootId(cat.id)
                const children = getChildrenOf(cat.id)
                setChildId(children[0]?.id ?? null)
              }}
            >
              <span style={{ marginRight: 4 }}>{cat.icon}</span>
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6, color: '#7f8c8d', fontSize: 13 }}>二级分类</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {childCategories.map((cat) => (
            <Button
              key={cat.id}
              size="small"
              type={cat.id === childId ? 'primary' : 'default'}
              onClick={() => setChildId(cat.id)}
            >
              <span style={{ marginRight: 4 }}>{cat.icon}</span>
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6, color: '#7f8c8d', fontSize: 13 }}>时间</div>
        <DatePicker
          showTime
          value={occurredAt}
          onChange={(v) => setOccurredAt(v ?? dayjs())}
          format="YYYY-MM-DD HH:mm"
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <div style={{ marginBottom: 6, color: '#7f8c8d', fontSize: 13 }}>备注</div>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 50))}
          maxLength={50}
        />
      </div>
    </Modal>
  )
}