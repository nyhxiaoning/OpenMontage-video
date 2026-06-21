import { ConfigProvider, theme } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import ConfigDashboard from '@/pages/config/ConfigDashboard';
import { Provider } from 'react-redux';
import { store } from '@/store';

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
      <Routes>
        <Route path="/" element={<Navigate to="/config" replace />} />
        <Route path="/config" element={<ConfigDashboard />} />
        <Route path="*" element={<Navigate to="/config" replace />} />
      </Routes>
    </ConfigProvider>
  );
};

export default App;
