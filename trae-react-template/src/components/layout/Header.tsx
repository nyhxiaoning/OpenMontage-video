import { useSetState } from "ahooks";
import { useEffect } from "react";
import { Layout, Button, Dropdown, Avatar, Space, Typography } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

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
  onToggle?: () => void;
  children?: React.ReactNode | undefined;
};

/**
 * Constants
 */
const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC<Props> = (props = {}) => {
  /**
   * Params
   */

  /**
   * Props
   */
  const { collapsed = false, onToggle } = props;

  /**
   * States
   */
  const [state, setState] = useSetState({
    userInfo: {
      username: 'Admin',
      avatar: ''
    }
  });

  /**
   * Hooks
   */
  const { t } = useTranslation();

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
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleProfile = () => {
    // 跳转到个人资料页面
    console.log('跳转到个人资料');
  };

  const handleSettings = () => {
    // 跳转到设置页面
    console.log('跳转到设置');
  };

  /**
   * ChildrenProps
   */
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('menu.profile'),
      onClick: handleProfile,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('menu.settings'),
      onClick: handleSettings,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('menu.logout'),
      onClick: handleLogout,
      danger: true,
    },
  ];

  /**
   * Effects
   */
  useEffect(() => {
    // 获取用户信息
  }, []);

  /**
   * JSXComponents
   */
  return (
    <AntHeader className="bg-white shadow-sm border-b border-gray-200 px-4 flex items-center justify-between h-16">
      {/* 左侧：折叠按钮 */}
      <div className="flex items-center">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className="text-lg w-16 h-16"
        />
      </div>

      {/* 右侧：用户信息和语言切换 */}
      <div className="flex items-center space-x-4">
        {/* 语言切换 */}
        <LanguageSwitcher size="middle" />
        
        {/* 用户下拉菜单 */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          arrow
        >
          <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
            <Avatar 
              size="small" 
              icon={<UserOutlined />} 
              src={state.userInfo.avatar}
            />
            <Text className="text-gray-700 hidden md:inline">
              {state.userInfo.username}
            </Text>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;