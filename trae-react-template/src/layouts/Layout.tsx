import { Layout as AntLayout } from 'antd';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Header from '@/components/layout/Header';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { useState } from 'react';

const { Content } = AntLayout;

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AntLayout className="min-h-screen">
      {/* 侧边栏 */}
      <Sidebar collapsed={collapsed} />

      <AntLayout>
        {/* 头部 */}
        <Header
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />

        {/* 面包屑 */}
        <Breadcrumb />

        {/* 主内容区 */}
        <Content className="m-6 p-6 bg-gray-50 min-h-[calc(100vh-128px)] rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
