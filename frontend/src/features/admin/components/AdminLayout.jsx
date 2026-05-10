import { useState } from 'react';
import { Layout, Menu, Avatar, Button, theme } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Header, Content } = Layout;

const MENU_ITEMS = [
  {
    key: '/admin/dashboard',
    icon: <DashboardOutlined />,
    label: 'Analytics Dashboard',
  },
  {
    key: '/admin/workshops',
    icon: <AppstoreOutlined />,
    label: 'Workshop Management',
  },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const handleLogout = () => {
    // TODO: clear auth token/store before redirecting
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          className="flex items-center justify-center h-16 border-b border-gray-100 select-none"
          style={{ borderBottomColor: token.colorBorderSecondary }}
        >
          <span className="text-lg font-bold" style={{ color: token.colorPrimary }}>
            {collapsed ? 'U' : 'UniHub'}
          </span>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((c) => !c)}
            style={{ fontSize: 16 }}
          />

          <div className="flex items-center gap-3">
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: token.colorPrimary }}
            />
            <Button
              type="default"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              danger
            >
              Logout
            </Button>
          </div>
        </Header>

        <Content style={{ margin: 24, minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
