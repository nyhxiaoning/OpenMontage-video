# 三、TypeScript 开发规范

- 所有组件、函数、Hooks 必须定义类型

- 避免使用 `any`，优先使用 `unknown`

- 类型定义与模块放在一起，公共类型集中于 `/types`

- 接口命名以 `I` 开头，例如：

  ```ts
  interface IUser {
    id: number;
    username: string;
    role: string;
  }
  ```

- 公共 API 响应模型：

  ```ts
  interface ApiResponse<T> {
    code: number;
    data: T;
    message: string;
  }
  ```