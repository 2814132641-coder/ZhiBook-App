import React from 'react'
import { Alert, Button, Space } from 'antd'
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons'

type Props = {
  online: boolean | null
  checking: boolean
  onRetry: () => void
  onOpenSettings?: () => void
}

export default function OfflineBanner({ online, checking, onRetry, onOpenSettings }: Props) {
  if (online === null || online === true) return null

  return (
    <div style={{ margin: '12px 0' }}>
      <Alert
        type="warning"
        showIcon
        message="无法连接到本地后端服务"
        description={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>检测到后端服务不可用，部分功能（历史/报表/导出等）可能受限。</span>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={checking}
                onClick={onRetry}
                size="small"
              >
                重试
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={onOpenSettings}
                size="small"
              >
                打开设置
              </Button>
            </Space>
          </div>
        }
      />
    </div>
  )
}
