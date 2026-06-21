# 二、React 开发规范

## 组件开发规范

- 全部使用 **函数式组件 + Hooks**
- 组件命名采用 **PascalCase**
- 文件名采用 **kebab-case**
- 每个组件必须具有清晰的职责与注释说明

## 状态管理规范

- 推荐使用 **Redux Toolkit + RTK Query**
- 小范围状态使用 **Zustand** 替代 Redux
- 全局状态（如用户信息、权限、配置）集中管理

## 路由规范

- 所有路由集中在 `/router`
- 使用 `React.lazy + Suspense` 实现懒加载
- 动态路由根据权限生成
- 路由守卫在高阶组件层（`AuthRoute`）实现

## 网络请求规范

- 全局统一封装 Axios
- 实现请求与响应拦截、Token 注入、错误处理
- 公共错误由 `antd.message.error()` 统一提示
- 推荐搭配 `React Query` 管理数据缓存与刷新逻辑

---

## 示例代码（Axios 封装）

```ts
// src/services/http.ts
import axios from "axios";
import { message } from "antd";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (res) => {
    if (res.data.code !== 200) {
      message.error(res.data.message || "请求失败");
      return Promise.reject(res.data);
    }
    return res.data;
  },
  (err) => {
    message.error("网络错误或服务器异常");
    return Promise.reject(err);
  }
);

export default instance;
```