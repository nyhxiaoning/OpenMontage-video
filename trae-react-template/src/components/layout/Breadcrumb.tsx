import { useSetState } from "ahooks";
import { useEffect } from "react";
import { Breadcrumb as AntBreadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';

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
  children?: React.ReactNode | undefined;
};

type BreadcrumbItem = {
  title: string | React.ReactNode;
  href?: string;
};

/**
 * Constants
 */

const Breadcrumb: React.FC<Props> = (props = {}) => {
  /**
   * Params
   */

  /**
   * Props
   */

  /**
   * States
   */
  const [state, setState] = useSetState({
    breadcrumbItems: [] as BreadcrumbItem[],
  });

  /**
   * Hooks
   */
  const { t } = useTranslation();
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

  /**
   * ChildrenProps
   */

  /**
   * Effects
   */
  useEffect(() => {
    // 根据当前路径生成面包屑
    const pathSnippets = location.pathname.split('/').filter(i => i);
    
    const breadcrumbItems: BreadcrumbItem[] = [
      {
        title: (
          <Link to="/dashboard" className="flex items-center text-gray-600 hover:text-blue-600">
            <HomeOutlined className="mr-1" />
            {t('menu.dashboard')}
          </Link>
        ),
      },
    ];

    // 根据路径生成面包屑项
    pathSnippets.forEach((snippet, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
      const isLast = index === pathSnippets.length - 1;
      
      let title = snippet;
      
      // 根据路径映射标题
      switch (snippet) {
        case 'dashboard':
          title = t('menu.dashboard');
          break;
        case 'user-management':
          title = t('menu.userManagement');
          break;
        case 'settings':
          title = t('menu.settings');
          break;
        case 'profile':
          title = t('menu.profile');
          break;
        default:
          title = snippet.charAt(0).toUpperCase() + snippet.slice(1);
      }

      if (isLast) {
        breadcrumbItems.push({
          title: <span className="text-gray-900">{title}</span>,
        });
      } else {
        breadcrumbItems.push({
          title: (
            <Link to={url} className="text-gray-600 hover:text-blue-600">
              {title}
            </Link>
          ),
        });
      }
    });

    setState({ breadcrumbItems });
  }, [location.pathname, t]);

  /**
   * JSXComponents
   */
  return (
    <div className="bg-white px-6 py-3 border-b border-gray-200">
      <AntBreadcrumb
        items={state.breadcrumbItems}
        className="text-sm"
      />
    </div>
  );
};

export default Breadcrumb;