# 六、工程与最佳实践

- **Vite 插件体系：**

  - unplugin-auto-import（自动导入 React Hooks）
  - unplugin-icons（SVG 图标自动引入）

- **CI/CD 集成：** Husky + Lint-Staged
- **Git Commit 规范：** `feat:`, `fix:`, `chore:`, `refactor:`, `style:`
- **国际化 (i18n)：** 使用 react-i18next，JSON 文件组织语言包
- **接口层封装：**

  - 模块化组织（`services/user.ts`、`services/order.ts`）
  - 使用统一请求实例

- **组件封装策略：**

  - 所有基础组件放置 `/components/base`
  - 禁止在业务逻辑中直接调用 AntD 原组件（必须二次封装）