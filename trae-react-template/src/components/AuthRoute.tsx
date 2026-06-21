import { FC } from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Types
 */
type AuthRouteProps = {
  children: React.ReactNode;
};

/**
 * Constants
 */
const AuthRoute: FC<AuthRouteProps> = ({ children }) => {
  /**
   * Hooks
   */
  const location = useLocation();
  
  /**
   * Check Authentication
   */
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  /**
   * JSXComponents
   */
  if (!isAuthenticated) {
    // 重定向到登录页面，并保存当前路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AuthRoute;