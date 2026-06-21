import { ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();

  // 根据当前语言设置 Ant Design 的 locale
  const getAntdLocale = () => {
    if (i18n.language === 'en-US') {
      dayjs.locale('en');
      return enUS;
    }
    dayjs.locale('zh-cn');
    return zhCN;
  };

  return (
    <ConfigProvider locale={getAntdLocale()}>
      {children}
    </ConfigProvider>
  );
};

export default I18nProvider;