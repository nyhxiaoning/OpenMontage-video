# 五、UI / 样式规范（PC 端特化）

- 采用 **Ant Design + TailwindCSS 混合开发模式**

  - 结构布局、表单、数据展示使用 antd
  - 自定义布局与主题通过 Tailwind Utility 类增强

- 响应式适配优先级：

  - PC 主视图：固定宽度 + 自适应容器
  - 移动兼容：使用 Tailwind 断点（`md:`、`lg:`）

- **主题定制：**

  - 使用 Ant Design Token 配置（在 `config/theme.ts` 中）
  - 同步 Tailwind 主题变量

**示例：**

```tsx
<Card className="shadow-md p-4 bg-white dark:bg-gray-900">
  <div className="flex justify-between items-center">
    <span className="text-lg font-semibold">用户管理</span>
    <Button type="primary">新增用户</Button>
  </div>
</Card>
```