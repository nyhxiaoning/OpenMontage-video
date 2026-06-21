import { useSetState } from "ahooks";
import { useEffect } from "react";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Types
 */
type Props = {
  children?: React.ReactNode | undefined;
};

/**
 * Constants
 */
const NotFound: React.FC<Props> = (props = {}) => {
  /**
   * Hooks
   */
  const navigate = useNavigate();
  const { t } = useTranslation();

  /**
   * States
   */
  const [state, setState] = useSetState({});

  /**
   * Events
   */
  const handleBackHome = () => {
    navigate('/dashboard');
  };

  /**
   * Effects
   */
  useEffect(() => {}, []);

  /**
   * JSXComponents
   */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Result
        status="404"
        title="404"
        subTitle={t('notFound.description')}
        extra={
          <Button type="primary" onClick={handleBackHome}>
            {t('notFound.backHome')}
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;