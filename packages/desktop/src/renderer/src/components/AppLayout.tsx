import { Layout, Menu } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Content } = Layout

/**
 * 根据当前小时获取问候语
 * 5-11 早上好 / 12-17 下午好 / 18-22 晚上好 / 其余夜深了
 */
function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return '早上好'
  if (hour >= 12 && hour < 18) return '下午好'
  if (hour >= 18 && hour < 23) return '晚上好'
  return '夜深了'
}

const items = [
  { key: '/home', label: '🏠 主页' },
  { key: '/history', label: '📋 历史' },
  { key: '/report', label: '📊 报表' },
  { key: '/settings', label: '⚙️ 设置' }
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const selected =
    items.find((it) => location.pathname.startsWith(it.key))?.key ?? '/home'

  const now = new Date()
  const greet = greeting(now.getHours())

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--color-bg-canvas)' }}>
      <Header
        className="glass"
        style={{
          background: 'var(--glass-bg)',
          padding: '0 24px',
          borderBottom: 'none',
          boxShadow: '0 1px 0 var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-brand)',
            letterSpacing: 1
          }}
        >
          轻账
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-brand)',
              boxShadow: '0 0 0 4px var(--color-brand-light)'
            }}
            aria-hidden
          />
          {greet}，今天花了多少？
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[selected]}
          onClick={({ key }) => navigate(key)}
          items={items}
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            borderBottom: 'none',
            background: 'transparent',
            gap: 4,
            fontSize: 'var(--font-size-md)'
          }}
        />
      </Header>
      <Content style={{ padding: 24, background: 'var(--color-bg-canvas)' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}