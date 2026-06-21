# 九、状态管理规范

## 概述
前端状态管理主要解决跨组件、跨页面的数据通信与全局数据共享。良好的状态管理规范可以降低组件间的耦合，提升代码的可维护性与可追溯性。

## 选型原则

针对不同复杂度的项目与场景，优先采用不同的状态管理方案：

- **简单项目/中小型应用**：优先使用 **Zustand**。
  - **优势**：极其轻量、API 简单直观、无样板代码，上手极快。
  - **场景**：全局主题色配置、侧边栏折叠状态、少数模块间的简单数据共享等。

- **复杂项目/大型企业级应用**：强制推荐使用 **@reduxjs/toolkit (RTK)**。
  - **优势**：提供了标准化、强约束的架构保障（严格的单向数据流），包含完善的开发者工具（Redux DevTools），便于追踪与回滚复杂数据流。
  - **场景**：庞大的全局权限配置、跨页面强交互的数据同步、需要利用中间件解决复杂异步逻辑等。

## 目录与文件规范

所有的状态管理逻辑及对应的路由切片文件，必须统一集中放置在 `src/store` 文件夹中。不允许在业务组件或 `pages/` 目录下散落全局状态定义。

### 1. Zustand 目录规范
如果是基于 Zustand，建议根据业务模块按 Feature 拆分，每个文件代表一个独立的 Store：
```bash
src/
└─ store/
   ├─ useAuthStore.ts      # 用户鉴权与登录状态
   ├─ useSettingsStore.ts  # 全局系统设置状态
   └─ useLayoutStore.ts    # 页面布局、侧边栏折叠等UI状态
```

### 2. Redux Toolkit (RTK) 目录规范
如果是基于 RTK，必须将配置入口统一放置在 `store/index.ts`，并将对应的切片 (slices) 隔离到 `store/slices/` 下：
```bash
src/
└─ store/
   ├─ index.ts             # configureStore 全局实例入口
   ├─ hooks.ts             # 二次封装带类型的 useDispatch 和 useSelector
   └─ slices/              # 切片文件夹
      ├─ authSlice.ts      # 用户鉴权切片
      ├─ tableSlice.ts     # 全局表格通用参数切片
      └─ routerSlice.ts    # 动态路由权限配置切片
```

## 状态隔离最佳实践

- **局部 UI 状态**：例如表单当前的输入值、弹窗的显示/隐藏（`visible`）、当前 Tab 的高亮索引，**必须**使用组件内部的 `useState` 或 `useReducer`，绝对禁止污染全局 Store。
- **服务端请求状态**：如列表接口返回的数据、请求中的 `loading` 状态。尽量结合 `React Query` 或 `RTK Query` 来管理请求缓存。除非该数据需要被跨页面广泛消费，否则不应主动塞入 Redux/Zustand 中。
- **全局共享状态**：只有“跨层级组件通信必须依赖”的状态，才应该提升到 `src/store` 中进行集中管理。