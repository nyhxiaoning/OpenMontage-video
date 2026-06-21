

## 组件实现与布局选型

- **局部组件优先使用 shadcn/ui**：
  在开发每一个具体的组件时，优先使用并定制现成的 [shadcn/ui](https://ui.shadcn.com/docs/installation/vite) 组件进行拼装。通过其提供的原子化配置和 Tailwind CSS 快速实现细粒度的交互和样式。

- **大型布局策略**：
  页面的宏观或大型布局（如整体框架结构、大区块排版、复杂的表格/表单容器等），依然根据当前的 **Ant Design** 或 **Tailwind CSS** 进行组织与实现。

- **组合原则**：
  采用“大布局使用 Ant Design / Tailwind CSS，小组件使用 shadcn/ui” 的原则。大的布局层负责骨架搭建，具体的业务或细粒度组件内部使用 shadcn/ui 积木式拼装，以确保开发效率、灵活性与高度可定制性。

## 参考资料

- shadcn/ui Vite 安装与官方文档：[https://ui.shadcn.com/docs/installation/vite](https://ui.shadcn.com/docs/installation/vite)