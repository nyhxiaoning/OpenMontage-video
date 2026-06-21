import http from './http'

/**
 * 用户相关接口
 */
export interface IUser {
  id: number
  username: string
  email: string
  role: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface IUserListParams {
  page: number
  pageSize: number
  keyword?: string
  role?: string
}

export interface IUserListResponse {
  list: IUser[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取用户列表
 */
export const getUserList = (params: IUserListParams) => {
  return http.get<IUserListResponse>('/users', { params })
}

/**
 * 获取用户详情
 */
export const getUserDetail = (id: number) => {
  return http.get<IUser>(`/users/${id}`)
}

/**
 * 创建用户
 */
export const createUser = (data: Partial<IUser>) => {
  return http.post<IUser>('/users', data)
}

/**
 * 更新用户
 */
export const updateUser = (id: number, data: Partial<IUser>) => {
  return http.put<IUser>(`/users/${id}`, data)
}

/**
 * 删除用户
 */
export const deleteUser = (id: number) => {
  return http.delete(`/users/${id}`)
}