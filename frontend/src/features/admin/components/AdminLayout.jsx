import { useState } from 'react';
import { Layout, Menu, Avatar, Button, theme, ConfigProvider } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { useTheme } from '@/context/ThemeContext';

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
  {
    type: 'divider',
  },
  {
    key: '/',
    icon: <GlobalOutlined />,
    label: 'Back to Portal',
  },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    navigate('/login', { replace: true });
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          theme={isDark ? 'dark' : 'light'}
          className="border-r border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center justify-center h-16 border-b border-gray-100 dark:border-gray-800 select-none">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {collapsed ? 'U' : 'UniHub Admin'}
            </span>
          </div>

          <Menu
            mode="inline"
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={[location.pathname]}
            items={MENU_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', marginTop: 8 }}
          />
        </Sider>

        <Layout className="bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <Header
            className="flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800"
            style={{ height: 64, padding: '0 24px' }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((c) => !c)}
              className="text-gray-600 dark:text-gray-400"
            />

            <div className="flex items-center gap-4">
              <Button
                type="text"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                className="text-gray-600 dark:text-gray-400"
              />

              <div className="flex items-center gap-3">
                <Avatar icon={<UserOutlined />} className="bg-blue-600" />
                <Button
                  type="default"
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  danger
                  size="small"
                >
                  Logout
                </Button>
              </div>
            </div>
          </Header>

          <Content className="relative overflow-hidden">
            <div className="absolute inset-0 tech-grid-bg pointer-events-none" />
            <div className="relative p-6 h-full overflow-auto">
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
