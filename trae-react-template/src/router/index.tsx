import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { Spin } from 'antd';
import AuthRoute from './AuthRoute';
import Layout from '@/layouts/Layout';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import MinecraftTokyo from "@/pages/home/index";
import LegoEditor from "@/pages/Editor";
import LegoInfo from "@/pages/legoDisplay";
import microLego from "@/pages/microlego";
import UserManagement from '@/pages/user-management';
import ConfigDashboard from '@/pages/config/ConfigDashboard';
import NotFound from '@/pages/not-found';

// 加载中组件
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spin size="large" />
  </div>
);

const AppRouter = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* 登录页 */}
        <Route path="/login" element={<Login />} />

        {/* 主应用路由 */}
        <Route
          path="/"
          element={
            <AuthRoute>
              <Layout />
            </AuthRoute>
          }
        >
          {/* 重定向到仪表盘 */}
          <Route index element={<Navigate to="/home" replace />} />


          {/* home */}
          <Route path="home" element={<MinecraftTokyo />} />
          {/* lego1.0 */}
          <Route path="lego" element={<LegoEditor />} />
          <Route path="lego-info" element={<LegoInfo />} />

          {/* lego2.0 */}
          <Route path="microLego" element={<microLego />} />

          {/* 仪表盘 */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* 用户管理 */}
          <Route path="user-management" element={<UserManagement />} />
          {/* Model Config */}
          <Route path="config" element={<ConfigDashboard />} />
        </Route>

        {/* 404 页面 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;