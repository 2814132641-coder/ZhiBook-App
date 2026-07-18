import { Layout, Menu } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Content } = Layout

const items = [
  { key: '/home', label: '🏠 主页' },
  { key: '/history', label: '📋 历史' },
  { key: '/report', label: '📊 报表' },
  { key: '/settings', label: '⚙️ 设置' }
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const selected = items.find((it) => location.pathname.startsWith(it.key))?.key ?? '/home'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 24
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#2E7D5B',
            letterSpacing: 1
          }}
        >
          轻账
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[selected]}
          onClick={({ key }) => navigate(key)}
          items={items}
          style={{ flex: 1, borderBottom: 'none', background: 'transparent' }}
        />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  )
}