import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space
} from 'antd'
import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useCategories } from '../store/categories'
import type { Category } from '../../../shared/api/index'
import { api } from '../lib/api';

export default function Settings() {
  const { message, modal } = App.useApp()
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

  const [editing, setEditing] = useState<Category | null>(null)
  const [creatingFor, setCreatingFor] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (list.length === 0) loadCategories()
  }, [list.length, loadCategories])

  async function handleDelete(cat: Category) {
    if (cat.parentId === null) {
      message.warning('一级分类不可删除')
      return
    }
    try {
      await api.categories.delete(cat.id)
      message.success(`已删除「${cat.name}」及其相关流水`)
      loadCategories()
    } catch (e) {
      message.error('删除失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const path = await api.settings.exportCSV()
      message.success(`已导出到：${path}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes('已取消')) {
        message.error('导出失败：' + msg)
      }
    } finally {
      setExporting(false)
    }
  }

  function handleClearAll() {
    modal.confirm({
      title: '确认清空所有数据？',
      content: '将永久删除所有流水与设置，且无法恢复。建议先导出 CSV 备份。',
      okText: '我已备份，永久删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.settings.clearAll()
          message.success('已清空所有数据')
          loadCategories()
        } catch (e) {
          message.error('清空失败：' + (e instanceof Error ? e.message : String(e)))
        }
      }
    })
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <Card title="分类管理" style={{ marginBottom: 16 }}>
        {roots.length === 0 ? (
          <Empty description="暂无分类" />
        ) : (
          <Collapse
            accordion
            items={roots.map((root) => {
              const children = getChildrenOf(root.id)
              return {
                key: root.id,
                label: (
                  <span style={{ fontWeight: 600 }}>
                    <span style={{ marginRight: 6 }}>{root.icon}</span>
                    {root.name}
                    <span style={{ marginLeft: 8, color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                      ({children.length})
                    </span>
                  </span>
                ),
                children: (
                  <List
                    size="small"
                    dataSource={children}
                    locale={{ emptyText: '暂无二级分类' }}
                    renderItem={(c) => (
                      <List.Item
                        actions={[
                          <Button
                            key="e"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => setEditing(c)}
                          />,
                          <Popconfirm
                            key="d"
                            title={`确认删除「${c.name}」？`}
                            description="相关流水会一并删除"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(c)}
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ]}
                      >
                        <span style={{ marginRight: 8 }}>{c.icon}</span>
                        {c.name}
                      </List.Item>
                    )}
                  />
                ),
                extra: (
                  <Button
                    size="small"
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCreatingFor(root.id)
                    }}
                  >
                    新增二级
                  </Button>
                )
              }
            })}
          />
        )}
      </Card>

      <Card title="数据" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
            block
          >
            导出全部记录为 CSV
          </Button>
          <Button type="primary" danger block onClick={handleClearAll}>
            清空所有数据
          </Button>
        </Space>
      </Card>

      <Card title="关于">
        <p style={{ margin: 0 }}>
          <strong>轻账</strong> · 本地化、轻量、个人记账工具
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)' }}>
          数据 100% 存在你的电脑本地，不联网、不上传、不注册。
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)' }}>版本 0.1.0</p>
      </Card>

      <CategoryEditModal
        category={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          loadCategories()
        }}
      />
      <CategoryCreateModal
        parentId={creatingFor}
        onClose={() => setCreatingFor(null)}
        onSaved={() => {
          setCreatingFor(null)
          loadCategories()
        }}
      />
    </div>
  )
}

interface EditProps {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}

function CategoryEditModal({ category, onClose, onSaved }: EditProps) {
  const { message } = App.useApp()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setIcon(category.icon ?? '')
      setColor(category.color ?? '')
    }
  }, [category])

  if (!category) return null

  async function handleSave() {
    if (!category) return
    if (!name.trim()) {
      message.warning('名称不能为空')
      return
    }
    setSaving(true)
    try {
      await api.categories.update({
        id: category.id,
        parentId: category.parentId,
        name: name.trim(),
        icon: icon.trim(),
        color: color.trim()
      })
      message.success('已保存')
      onSaved()
    } catch (e) {
      message.error('保存失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="编辑分类"
      open={!!category}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
    >
      <Form layout="vertical">
        <Form.Item label="名称">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </Form.Item>
        <Form.Item label="图标（emoji 或文字）">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
        </Form.Item>
        <Form.Item label="颜色（hex，例如 #2E7D5B）">
          <Input value={color} onChange={(e) => setColor(e.target.value)} maxLength={9} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

interface CreateProps {
  parentId: number | null
  onClose: () => void
  onSaved: () => void
}

function CategoryCreateModal({ parentId, onClose, onSaved }: CreateProps) {
  const { message } = App.useApp()
  const getById = useCategories((s) => s.getById) // getById 返回单个 Category 或 undefined，本身已是稳定值，无需 useShallow
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (parentId === null) {
      setName('')
      setIcon('📦')
    }
  }, [parentId])

  if (parentId === null) return null

  const parent = getById(parentId)
  const defaultColor = parent?.color ?? 'var(--color-brand)'

  async function handleSave() {
    if (parentId === null) return
    if (!name.trim()) {
      message.warning('名称不能为空')
      return
    }
    setSaving(true)
    try {
      await api.categories.create({
        parentId,
        name: name.trim(),
        icon: icon.trim() || '📦',
        color: defaultColor
      })
      message.success('已新增')
      setName('')
      setIcon('📦')
      onSaved()
    } catch (e) {
      message.error('新增失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`新增二级分类（${parent?.name ?? ''}）`}
      open={parentId !== null}
      onCancel={onClose}
      onOk={handleSave}
      okText="新增"
      cancelText="取消"
      confirmLoading={saving}
    >
      <Form layout="vertical">
        <Form.Item label="名称">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </Form.Item>
        <Form.Item label="图标（默认 📦）">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
        </Form.Item>
        <Form.Item label={`颜色（继承自「${parent?.name ?? ''}」：${defaultColor}）`}>
          <Input value={defaultColor} disabled />
        </Form.Item>
      </Form>
    </Modal>
  )
}