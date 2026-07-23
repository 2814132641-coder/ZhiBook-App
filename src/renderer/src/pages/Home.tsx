import { useEffect, useMemo, useState } from 'react'
import { App, Button, DatePicker, FloatButton, Input, InputNumber, Modal } from 'antd'
import { CalendarOutlined, CheckOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useCategories } from '../store/categories'
import { useRecentCategories, resolveRecentCategories } from '../store/recentCategories'
import { formatAmount } from '../utils/format'
import { playSuccessBeep } from '../utils/sound'
import SuccessOverlay from '../components/SuccessOverlay'
import { api } from '../lib/api';

/** 这些二级被选时，自动展开并聚焦备注输入框 */
const NOTE_FOCUS_NAMES = new Set([
  '聚餐请客',
  '人情往来',
  '礼物',
  '转账红包',
  '出差报账'
])

/**
 * 智能默认：根据当前时间在「餐饮」一级下选二级
 * - 早餐 05-10 / 午餐 11-14 / 晚餐 17-22 / 其他时间 → 默认下一个饭点的「最常见选项」
 * - 其余一级默认选第一个二级
 */
function pickSmartDefaultChild(
  rootName: string,
  childNames: string[],
  hour: number
): string {
  if (rootName === '餐饮') {
    if (hour >= 5 && hour < 10 && childNames.includes('早餐')) return '早餐'
    if (hour >= 11 && hour < 14 && childNames.includes('午餐')) return '午餐'
    if (hour >= 17 && hour < 22 && childNames.includes('晚餐')) return '晚餐'
    // 兜底：选第一个存在的早午晚
    for (const cand of ['早餐', '午餐', '晚餐']) {
      if (childNames.includes(cand)) return cand
    }
  }
  return childNames[0] ?? ''
}

export default function Home() {
  const { message } = App.useApp()
  const list = useCategories((s) => s.list)
  const loadCategories = useCategories((s) => s.load)
  const recentItems = useRecentCategories((s) => s.items)
  const recordRecent = useRecentCategories((s) => s.record)

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
  const [showNote, setShowNote] = useState(false)
  const [noteRef, setNoteRef] = useState(false) // 是否因选择触发，自动展开后 true 可让 TextArea autoFocus
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [occurredAt, setOccurredAt] = useState<Dayjs>(dayjs())
  const [saving, setSaving] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayAmount, setOverlayAmount] = useState(0)
  const [shakeKey, setShakeKey] = useState(0)

  useEffect(() => {
    if (list.length === 0) loadCategories()
  }, [list.length, loadCategories])

  // 智能默认：进入页面时选「餐饮」一级 + 根据当前小时选二级
  useEffect(() => {
    if (selectedRootId !== null) return
    if (roots.length === 0) return
    const nowHour = dayjs().hour()
    // 优先「餐饮」，否则取第一个一级
    const food = roots.find((r) => r.name === '餐饮') ?? roots[0]
    const children = getChildrenOf(food.id)
    const smartChildName = pickSmartDefaultChild(
      food.name,
      children.map((c) => c.name),
      nowHour
    )
    const smartChild = children.find((c) => c.name === smartChildName) ?? children[0]
    setSelectedRootId(food.id)
    setSelectedChildId(smartChild?.id ?? null)
  }, [roots, getChildrenOf, selectedRootId])

  // 一级切换：重置二级（保留当前若仍存在，否则用智能默认）
  useEffect(() => {
    if (selectedRootId === null) return
    const children = getChildrenOf(selectedRootId)
    const root = roots.find((r) => r.id === selectedRootId)
    if (!root) return
    const defaultName = pickSmartDefaultChild(
      root.name,
      children.map((c) => c.name),
      dayjs().hour()
    )
    setSelectedChildId((prev) => {
      if (prev && children.some((c) => c.id === prev)) return prev
      return children.find((c) => c.name === defaultName)?.id ?? children[0]?.id ?? null
    })
  }, [selectedRootId, getChildrenOf, roots])

  const childCategories = selectedRootId !== null ? getChildrenOf(selectedRootId) : []

  // 处理二级选择：触发备注联动 + 记录最近使用
  function handleSelectChild(id: number) {
    const child = list.find((c) => c.id === id)
    setSelectedChildId(id)
    recordRecent(id)
    // 需要备注的二级自动展开
    if (child && NOTE_FOCUS_NAMES.has(child.name)) {
      setShowNote(true)
      setNoteRef(true) // 仅在下一次渲染让其 autoFocus=true，然后自动重置
    }
  }

  // 让 TextArea 在自动展开时聚焦一次
  useEffect(() => {
    if (noteRef) {
      const t = setTimeout(() => setNoteRef(false), 800)
      return () => clearTimeout(t)
    }
  }, [noteRef])

  const canSave =
    amount !== null && amount > 0 && selectedChildId !== null && !saving && !showOverlay

  async function handleSave() {
    if (!canSave || selectedChildId === null || amount === null) return
    setSaving(true)
    try {
      const created = await api.records.create({
        amount,
        categoryId: selectedChildId,
        note: note.trim() || null,
        occurredAt: occurredAt.toDate().toISOString().slice(0, 19)
      })
      setOverlayAmount(created.amount)
      setShowOverlay(true)
      playSuccessBeep()
      setShakeKey((k) => k + 1)
      message.success(`已记录 ${formatAmount(created.amount)}`)
      setAmount(null)
      setNote('')
      setShowNote(false)
      setNoteRef(false)
      setOccurredAt(dayjs())
    } catch (e) {
      message.error('保存失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  const currentRoot = roots.find((c) => c.id === selectedRootId)
  const recentCats = resolveRecentCategories(recentItems, list)

  // 二级需要备注提示文案
  const selectedChildName = list.find((c) => c.id === selectedChildId)?.name ?? ''
  const noteHint =
    NOTE_FOCUS_NAMES.has(selectedChildName)
      ? `建议备注：${
          selectedChildName === '聚餐请客'
            ? '参与者 / 餐厅'
            : selectedChildName === '人情往来' || selectedChildName === '转账红包'
            ? '对象 / 事项'
            : selectedChildName === '礼物'
            ? '送给谁 / 礼物'
            : selectedChildName === '出差报账'
            ? '项目 / 客户'
            : '备注'
        }`
      : '添加备注（可选）'

  // 加载中 / 错误状态
  const loading = useCategories((s) => s.loading)
  const error = useCategories((s) => s.error)

  if (roots.length === 0 && loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <div style={{ color: 'var(--color-text-secondary)' }}>正在连接后端服务...</div>
        {error && (
          <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>
            {error} — 自动重试中
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      key={shakeKey}
      className={shakeKey > 0 ? 'shake' : undefined}
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 16px 112px',
        position: 'relative'
      }}
    >
      {/* ============ 时间（独立一行 · 顶位）============ */}
      <div
        onClick={() => setShowTimePicker(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 4px 6px',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: 12
        }}
      >
        <CalendarOutlined />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {occurredAt.format('YYYY 年 M 月 D 日 · HH:mm')}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-tertiary)' }}>点击修改 ›</span>
      </div>
      <Modal
        title="选择时间"
        open={showTimePicker}
        onCancel={() => setShowTimePicker(false)}
        onOk={() => setShowTimePicker(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <DatePicker
          showTime
          value={occurredAt}
          onChange={(v) => setOccurredAt(v ?? dayjs())}
          format="YYYY-MM-DD HH:mm"
          style={{ width: '100%' }}
        />
      </Modal>

      {/* ============ 金额 · 32px 品牌绿 ============ */}
      <div
        style={{
          padding: '16px 8px 20px',
          borderBottom: '1px solid #EEE'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'flex-end',
            gap: 6
          }}
        >
          <span style={{ fontSize: 22, color: 'var(--color-brand)', fontWeight: 700 }}>¥</span>
          <InputNumber
            value={amount}
            onChange={(v) => setAmount(v)}
            min={0}
            precision={2}
            step={0.01}
            placeholder="0.00"
            controls={false}
            data-testid="amount-input"
            style={{
              flex: 1,
              border: 'none',
              boxShadow: 'none',
              background: 'transparent',
              fontSize: 48,
              fontWeight: 700,
              color: amount ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
              textAlign: 'right',
              padding: 0,
              height: 'auto',
              lineHeight: 1
            }}
          />
        </div>
      </div>

      {/* ============ 一级分类 · 横向滑动 Tab ============ */}
      <div
        className="tab-scroll"
        style={{
          padding: '14px 0 4px',
          gap: 4
        }}
      >
        {roots.map((cat) => {
          const active = cat.id === selectedRootId
          return (
            <div
              key={cat.id}
              className="tab-cell"
              onClick={() => setSelectedRootId(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '8px 14px 10px',
                minWidth: 64,
                color: active ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                borderBottom: active ? '3px solid #2E7D5B' : '3px solid transparent',
                transition: 'color 0.15s, border-color 0.15s'
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  lineHeight: 1,
                  marginBottom: 4,
                  display: 'inline-block',
                  width: '1em',
                  textAlign: 'center'
                }}
              >
                {cat.icon}
              </span>
              {cat.name}
            </div>
          )
        })}
      </div>

      {/* ============ 最近使用 · 顶部一行 3 个 cell ============ */}
      {recentCats.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              marginBottom: 6,
              padding: '0 2px'
            }}
          >
            <ClockCircleOutlined />
            <span>最近使用</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(recentCats.length, 3)}, 1fr)`,
              gap: 8
            }}
          >
            {recentCats.map((cat) => {
              const active = cat.id === selectedChildId
              const color = cat.color
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectChild(cat.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 4px',
                    minHeight: 56,
                    border: active ? `2px solid ${color}` : '2px solid transparent',
                    borderRadius: 10,
                    background: active ? color : 'var(--color-bg-canvas)',
                    color: active ? 'var(--color-bg-surface)' : 'var(--color-text-primary)',
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                  title={cat.name}
                >
                  <span
                    style={{
                      fontSize: 22,
                      lineHeight: 1,
                      filter: active ? 'brightness(0) invert(1)' : 'none'
                    }}
                  >
                    {cat.icon}
                  </span>
                  <span
                    style={{
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat.name}
                  </span>
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'var(--color-bg-surface)',
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        boxShadow: '0 1px 3px var(--shadow-sm)'
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ============ 二级分类 · 5 列 Grid（全部二级）============ */}
      {childCategories.length > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            background: 'var(--color-bg-surface)',
            borderRadius: 12,
            boxShadow: '0 1px 3px var(--shadow-xs)'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8
            }}
          >
            {childCategories.map((cat) => {
              const active = cat.id === selectedChildId
              const color = cat.color || currentRoot?.color || 'var(--color-brand)'
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectChild(cat.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '10px 4px',
                    minHeight: 70,
                    border: active ? `3px solid ${color}` : '1px solid transparent',
                    borderRadius: 10,
                    background: active ? color : 'var(--color-bg-canvas)',
                    color: active ? 'var(--color-bg-surface)' : 'var(--color-text-primary)',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s',
                    boxShadow: active ? `0 6px 16px ${color}55` : 'none',
                    transform: active ? 'translateY(-1px)' : 'none',
                    position: 'relative'
                  }}
                >
                  <span
                    style={{
                      fontSize: 26,
                      lineHeight: 1,
                      display: 'inline-block',
                      width: '1em',
                      textAlign: 'center',
                      filter: active ? 'brightness(0) invert(1)' : 'none'
                    }}
                  >
                    {cat.icon}
                  </span>
                  <span style={{ textAlign: 'center', lineHeight: 1.15 }}>{cat.name}</span>
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'var(--color-bg-surface)',
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1,
                        boxShadow: '0 1px 3px var(--shadow-sm)'
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ============ 备注（默认折叠；选中特定二级时自动展开并聚焦）============ */}
      <div style={{ marginTop: 12 }}>
        {!showNote ? (
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => setShowNote(true)}
            style={{
              width: '100%',
              color: NOTE_FOCUS_NAMES.has(selectedChildName) ? 'var(--color-cat-food)' : 'var(--color-text-secondary)',
              borderColor: NOTE_FOCUS_NAMES.has(selectedChildName) ? 'rgba(255, 140, 66, 0.4)' : 'var(--color-border)',
              background: 'var(--color-bg-surface)',
              borderRadius: 12,
              padding: '14px 16px',
              height: 'auto'
            }}
          >
            {noteHint}
          </Button>
        ) : (
          <div
            style={{
              padding: 14,
              background: 'var(--color-bg-surface)',
              borderRadius: 12,
              boxShadow: '0 1px 3px var(--shadow-xs)'
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: NOTE_FOCUS_NAMES.has(selectedChildName) ? 'var(--color-cat-food)' : 'var(--color-text-secondary)',
                marginBottom: 6
              }}
            >
              {noteHint}
            </div>
            <Input.TextArea
              autoFocus={noteRef || undefined}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 50))}
              maxLength={50}
              showCount
              autoSize={{ minRows: 2, maxRows: 4 }}
              onBlur={() => {
                if (!note.trim()) setShowNote(false)
              }}
            />
          </div>
        )}
      </div>

      {/* ============ FAB 保存按钮 ============ */}
      <FloatButton
        icon={<CheckOutlined />}
        type="primary"
        tooltip={canSave ? '保存这笔花销' : '请先输入金额与分类'}
        onClick={handleSave}
        disabled={!canSave}
        style={{
          right: 32,
          bottom: 32,
          width: 64,
          height: 64,
          background: canSave ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
          boxShadow: '0 8px 24px var(--shadow-brand-md)'
        }}
      />

      {showOverlay && (
        <SuccessOverlay amount={overlayAmount} onDone={() => setShowOverlay(false)} />
      )}
    </div>
  )
}