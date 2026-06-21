# 一、项目开发规范

## 技术栈

- **框架**：React 18+
- **构建工具**：Vite 7+
- **状态管理**：Redux Toolkit / Zustand
- **UI 组件库**：Ant Design + TailwindCSS + shadcn/ui
- **CSS 方案**：SCSS Modules + TailwindCSS Utility 类
- **路由管理**：React Router v6+
- **网络请求**：Axios 封装（含 Token 拦截与全局错误处理）
- **国际化**：react-i18next
- **代码规范**：ESLint + Prettier + Husky + Lint-Staged
- **包管理工具**：pnpm
- **单元测试**：Vitest + React Testing Library

---

## 导入规范

- 使用路径别名 `@` → `src/`
- 使用路径别名 `@@` → `src/shared/`

---

## 目录结构

```bash
# react-pc-admin
├─ public/
│  ├─ favicon.ico
│  └─ manifest.json
├─ src/
│  ├─ assets/             # 静态资源
│  ├─ components/         # 公共组件
│  │  ├─ base/            # 通用基础封装组件（如Button、Modal等）
│  │  └─ layout/          # 布局组件（Header、Sidebar、Footer）
│  ├─ hooks/              # 通用Hooks
│  ├─ layouts/            # 页面布局结构
│  ├─ pages/              # 业务页面
│  │  └─ dashboard/       # 示例页面
│  │     ├─ components/
│  │     ├─ services/
│  │     └─ index.tsx
│  ├─ router/             # 路由定义
│  ├─ store/              # Redux/Zustand 状态管理
│  ├─ services/           # 网络请求封装与模块API
│  ├─ utils/              # 工具函数
│  ├─ styles/             # Tailwind + 全局样式
│  ├─ App.tsx             # 应用入口
│  └─ main.tsx            # 启动文件
├─ types/                 # 类型定义
├─ tests/                 # 单元测试
├─ .eslintrc.cjs
├─ .prettierrc
├─ tailwind.config.ts
├─ vite.config.ts
└─ tsconfig.json
```

**规范说明：**

- 每个功能模块必须内聚（组件、逻辑、样式、服务放一起）
- 不允许出现跨目录强耦合
- 所有工具方法与通用逻辑抽离到 `@@/utils` 或 `@@/hooks`