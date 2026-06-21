import { useSetState } from 'ahooks'
import { useEffect, useMemo } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, theme } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleTheme } from '@/store/slices/themeSlice'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

const { Header, Sider, Content } = Layout

/**
 * Types
 */
type LayoutState = {
  collapsed: boolean
}

/**
 * Constants
 */
const MainLayout: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { token } = theme.useToken()

  /**
   * States
   */
  const [state, setState] = useSetState<LayoutState>({
    collapsed: false,
  })

  /**
   * Redux States
   */
  const isDarkMode = useAppSelector(state => state.theme.isDarkMode)

  /**
   * 菜单配置 - 使用 useMemo 确保语言变化时重新渲染
   */
  const menuItems = useMemo(() => [
    {
      key: '/home',
      icon: <DashboardOutlined />,
      label: t('menu.home'),
    },
    {
      key: '/lego',
      icon: <DashboardOutlined />,
      label: t('menu.lego'),
    },
    {
      key: '/lego-info',
      icon: <DashboardOutlined />,
      label: t('menu.legoInfo'),
    },
    {
      key: '/microLego',
      icon: <DashboardOutlined />,
      label: t('menu.lego2'),
    },
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('menu.dashboard'),
    },
    {
      key: '/user-management',
      icon: <UserOutlined />,
      label: t('menu.userManagement'),
    },
  ], [t])

  /**
   * 用户下拉菜单 - 使用 useMemo 确保语言变化时重新渲染
   */
  const userMenuItems = useMemo(() => [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('menu.profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('menu.settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('menu.logout'),
      danger: true,
    },
  ], [t])

  /**
   * Events
   */
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'logout':
        // 处理退出登录逻辑
        console.log('退出登录')
        break
      case 'profile':
        console.log('个人资料')
        break
      case 'settings':
        console.log('设置')
        break
    }
  }

  const toggleCollapsed = () => {
    setState({ collapsed: !state.collapsed })
  }

  const handleThemeToggle = () => {
    dispatch(toggleTheme())
  }

  /**
   * Effects
   */
  useEffect(() => {
    // 根据路由设置默认选中的菜单项
  }, [location.pathname])

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={state.collapsed}
        className="shadow-md"
        style={{
          background: token.colorBgContainer,
        }}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
          <h1 className={`font-bold text-lg ${state.collapsed ? 'hidden' : 'block'}`}>
            {t('layout.appName')}
          </h1>
          {state.collapsed && <div className="w-8 h-8 bg-primary-500 rounded"></div>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-r-0"
        />
      </Sider>

      <Layout>
        <Header
          className="px-4 flex items-center justify-between shadow-sm"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorder}`,
          }}
        >
          <div className="flex items-center">
            <Button
              type="text"
              icon={state.collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
              className="text-lg w-16 h-16"
            />
          </div>

          <div className="flex items-center space-x-4">
            <Button
              type="text"
              onClick={handleThemeToggle}
              className="text-sm"
            >
              {isDarkMode ? '🌞' : '🌙'}
            </Button>

            <LanguageSwitcher size="small" />

            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded">
                <Avatar size="small" icon={<UserOutlined />} />
                <span className="text-sm">{t('layout.admin')}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="m-6 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout