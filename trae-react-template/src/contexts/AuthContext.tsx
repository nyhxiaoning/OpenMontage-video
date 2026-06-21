import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';

interface IUser {
  id: number
  username: string
  email: string
  role: string
  avatar?: string
}

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, isAuthenticated, permissions } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    // 这里可以添加获取用户信息的逻辑
    // 比如从 localStorage 获取 token 并验证
    const token = localStorage.getItem('token');
    if (token && !currentUser) {
      // 可以在这里调用 API 获取用户信息
      console.log('需要获取用户信息');
    }
  }, [currentUser, dispatch]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission) || permissions.includes('*');
  };

  const value: AuthContextType = {
    user: currentUser,
    token: localStorage.getItem('token'),
    loading: false, // 可以根据实际需要添加 loading 状态
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};