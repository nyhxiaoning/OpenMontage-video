import {
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useEffect } from 'react';
import { useSetState } from 'ahooks';
import { useTranslation } from 'react-i18next';

/**
 * APIs
 */

/**
 * Components
 */

/**
 * Resources
 */

/**
 * Styles
 */

/**
 * Types
 */
type Props = {
  collapsed?: boolean;
  children?: React.ReactNode | undefined;
};

/**
 * Constants
 */
const { Sider } = Layout;

const Sidebar: React.FC<Props> = (props = {}) => {
  /**
   * Params
   */

  /**
   * Props
   */
  const { collapsed = false } = props;

  /**
   * States
   */
  const [state, setState] = useSetState({
    selectedKeys: ['/dashboard'],
    openKeys: [] as string[],
  });

  /**
   * Hooks
   */
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Paginations
   */

  /**
   * Payloads
   */

  /**
   * Requests
   */

  /**
   * Events
   */
  const handleMenuClick = ({ key }: { key: string }) => {
    setState({ selectedKeys: [key] });
    navigate(key);
  };

  const handleOpenChange = (openKeys: string[]) => {
    setState({ openKeys });
  };

  /**
   * ChildrenProps
   */
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('menu.dashboard'),
    },
    {
      key: '/config',
      icon: <ApiOutlined />,
      label: t('menu.modelConfig'),
    },
    {
      key: '/user-management',
      icon: <TeamOutlined />,
      label: t('menu.userManagement'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('menu.settings'),
      children: [
        {
          key: '/settings/profile',
          icon: <UserOutlined />,
          label: t('menu.profile'),
        },
      ],
    },
  ];

  /**
   * Effects
   */
  useEffect(() => {
    // 根据当前路径设置选中的菜单项
    setState({ selectedKeys: [location.pathname] });
  }, [location.pathname]);

  /**
   * JSXComponents
   */
  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="bg-white shadow-sm border-r border-gray-200"
      width={256}
      collapsedWidth={80}
    >
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <div className="text-xl font-bold text-blue-600">
          {collapsed ? 'A' : t('layout.systemNameShort')}
        </div>
      </div>

      {/* 菜单 */}
      <Menu
        mode="inline"
        selectedKeys={state.selectedKeys}
        openKeys={state.openKeys}
        items={menuItems}
        onClick={handleMenuClick}
        onOpenChange={handleOpenChange}
        className="border-none"
        style={{ height: 'calc(100vh - 64px)', borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;
