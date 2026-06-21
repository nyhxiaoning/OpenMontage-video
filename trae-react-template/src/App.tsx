import { ConfigProvider } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import ConfigDashboard from '@/pages/config/ConfigDashboard';
import I18nProvider from '@/components/I18nProvider';

const App: React.FC = () => {
  const themeConfig = {
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 6,
      wireframe: false,
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <I18nProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/config" replace />} />
          <Route path="/config" element={<ConfigDashboard />} />
          <Route path="*" element={<Navigate to="/config" replace />} />
        </Routes>
      </I18nProvider>
    </ConfigProvider>
  );
};

export default App;
