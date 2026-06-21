// 通用 API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
  success: boolean;
}

// 分页参数
export interface PaginationParams {
  current: number;
  pageSize: number;
  total?: number;
}

// 用户信息
export interface IUser {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

// 菜单项
export interface IMenuItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  children?: IMenuItem[];
  permission?: string;
  hidden?: boolean;
}

// 表格列配置
export interface ITableColumn {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean;
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

// 表单字段配置
export interface IFormField {
  name: string;
  label: string;
  type: 'input' | 'select' | 'date' | 'textarea' | 'number';
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  rules?: any[];
}