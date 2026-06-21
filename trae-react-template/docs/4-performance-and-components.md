# 四、性能优化与组件实践

- 使用 `React.memo` 缓存无状态组件
- 使用 `useCallback`、`useMemo` 避免重复渲染
- 按需加载组件、样式、图标（Ant Design 官方推荐写法）
- 表格类组件使用分页与虚拟滚动（`react-window`）
- 避免内联函数与过深嵌套逻辑