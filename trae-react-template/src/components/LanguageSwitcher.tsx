import { Dropdown, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLanguage } from '@/hooks/useLanguage';

interface LanguageSwitcherProps {
  size?: 'small' | 'middle' | 'large';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ size = 'middle' }) => {
  const { currentLanguage, changeLanguage } = useLanguage();

  const languageOptions = [
    {
      key: 'zh-CN',
      label: '简体中文',
    },
    {
      key: 'en-US',
      label: 'English',
    },
  ];

  const handleLanguageChange = ({ key }: { key: string }) => {
    changeLanguage(key);
  };

  const getCurrentLanguageLabel = () => {
    return currentLanguage === 'zh-CN' ? '简体中文' : 'English';
  };

  return (
    <Dropdown
      menu={{
        items: languageOptions,
        onClick: handleLanguageChange,
        selectedKeys: [currentLanguage],
      }}
      placement="bottomRight"
    >
      <Button 
        type="text" 
        icon={<GlobalOutlined />} 
        size={size}
        className="flex items-center"
      >
        {getCurrentLanguageLabel()}
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;