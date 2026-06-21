import { useSetState } from "ahooks";
import { useEffect } from "react";
import { Form, Input, Button, Card, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { setUser } from "@/store/slices/userSlice";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Types
 */
type LoginForm = {
  username: string;
  password: string;
};

type Props = {
  children?: React.ReactNode | undefined;
};

/**
 * Constants
 */
const Login: React.FC<Props> = (props = {}) => {
  /**
   * Hooks
   */
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  /**
   * States
   */
  const [state, setState] = useSetState({
    loading: false,
  });

  /**
   * Events
   */
  const handleLogin = async (values: LoginForm) => {
    setState({ loading: true });
    
    try {
      // 模拟登录 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟用户数据
      const userData = {
        id: 1,
        username: values.username,
        email: `${values.username}@example.com`,
        role: 'admin',
        avatar: '',
      };
      
      // 保存 token
      localStorage.setItem('token', 'mock-jwt-token');
      
      // 更新 Redux 状态
      dispatch(setUser(userData));
      
      message.success(t('login.loginSuccess'));
      navigate('/dashboard');
    } catch (error) {
      message.error(t('login.loginError'));
    } finally {
      setState({ loading: false });
    }
  };

  /**
   * Effects
   */
  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  /**
   * JSXComponents
   */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      {/* 语言切换器 */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('login.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('login.subtitle')}
          </p>
        </div>
        
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('login.usernameRequired') }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('login.username')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('login.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.password')}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={state.loading}
            >
              {t('login.loginButton')}
            </Button>
          </Form.Item>
        </Form>
        
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t('login.testAccount')}</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;