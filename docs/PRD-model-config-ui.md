# PRD: Model Configuration WebUI for OpenMontage
## 第一阶段使用启动方式：如果没有使用前端界面，
启动方式

### （1）Terminal 1: 启动 API 后端
废弃make webui-start，使用下面的
- 直接: venv/bin/python -m uvicorn lib.config_api:app --port 3001

### （2）Terminal 2: React 开发模式
cd trae-react-template && pnpm dev

### （3）然后浏览器打开 http://localhost:5173/config


### （4）没有webUI的启动页面
直接使用ide进行开发而已。

当前设计是 Agent 作为 orchestrator，所有阶段通过读取 skill 文件和调用工具完成。

- 在 Claude Code 里用自然语言启动 pipeline





## Problem Statement

当前 OpenMontage 的视频制作流程在 assets 阶段经常因 API key 未配置或过期而失败（401 Unauthorized）。用户需要在 `.env` 文件中手动管理 15+ 个 API key，没有可视化界面来：
- 查看哪些模型已配置、哪些未配置
- 按项目需求选择和配置模型
- 在生成前验证配置完整性
- 跳过配置直接用默认/免费模型生成

这导致每次制作视频时，用户都需要先跑一遍 `provider_menu_summary()` 才能知道缺什么，然后手动编辑 `.env`，重启流程，且没有任何配置验证机制。

## Goals

| Goal | Success Metric |
|------|---------------|
| 可视化配置界面 | 用户在 WebUI 中 3 步内完成模型选择 + API key 输入 |
| 按项目自动推荐 | 根据所选 pipeline（cinematic/animation/etc.）推荐所需模型 |
| 生成前配置验证 | pipeline 每个 stage 开始前自动检查配置，缺失时阻断或降级 |
| 无配置兜底 | 用户可以选择跳过配置，系统自动用免费/可用模型继续 |
| 增量配置 | 用户不需要一次性配置所有 key，可以按需添加 |

## Non-Goals

- 不替换现有 `.env` 系统（向下兼容，WebUI 写入 `.env` 的包装层）
- 不做用户认证/多租户（单人使用工具）
- 不做付费/订阅管理（API key 由用户在对应平台自行获取）
- 不做模型 Marketplace（不引入新模型，只配置已有的 57 个工具）

---

## User Stories

### US-1: 首次启动配置向导
> 作为首次使用的用户，我启动项目后看到一个配置向导，它告诉我当前 pipeline 需要哪些模型，哪些已配置，哪些需要我输入 API key。

### US-2: 按项目选择模型
> 作为制作 cinematic 视频的用户，我在 WebUI 中选择了 "cinematic" pipeline，系统自动高亮 Seedance、FLUX、Suno 等推荐模型，其他模型折叠隐藏。

### US-3: 生成前配置检查
> 作为运行 pipeline 的用户，在执行 assets 阶段前，系统自动检查 Seedance 和 FLUX 的 API key 是否有效，如果缺失则弹出提示，让我决定是补充 key 还是降级到免费方案。

### US-4: 无配置快速生成
> 作为不想配置任何 API key 的用户，我点击"跳过配置，用免费模型继续"，系统自动选择 Pexels stock 视频 + Remotion 动画的组合方案开始生成脚本。

### US-5: 增量添加模型
> 作为已有部分配置的用户，我在制作新项目时只需要补充缺失的模型 key，已配置的保持不动。

---

## Functional Requirements

### FR-1: WebUI 启动与导航

| ID | Requirement | Priority |
|----|------------|----------|
| FR-1.1 | 项目初始化时（`make setup` 或首次运行），自动启动 WebUI 服务器 | Must |
| FR-1.2 | WebUI 默认运行在 `http://localhost:3001`（不与 Remotion Studio 的 3000 端口冲突） | Must |
| FR-1.3 | 主页面显示当前项目状态：pipeline 选择、模型配置完成度、下一步操作 | Must |
| FR-1.4 | 支持无浏览器环境（CI/CD、远程服务器），提供 CLI 等效操作 | Should |
| FR-1.5 | WebUI 与 CLI 共享同一套配置后端，状态实时同步 | Must |

### FR-2: 模型配置界面

| ID | Requirement | Priority |
|----|------------|----------|
| FR-2.1 | 按 capability 分组展示模型（video_generation / image_generation / tts / music_generation / etc.） | Must |
| FR-2.2 | 每个模型卡片显示：名称、提供商、状态（✅ 已配置 / ❌ 未配置 / ⚠️ 过期）、用途说明 | Must |
| FR-2.3 | 点击模型卡片展开 API key 输入框，支持 show/hide 密码 | Must |
| FR-2.4 | API key 输入后实时验证（调用对应 API 的轻量级 health check） | Must |
| FR-2.5 | 每个模型的 `install_instructions` 从 registry 动态读取，包含获取 key 的链接 | Must |
| FR-2.6 | 支持一键"复制 .env 格式"到剪贴板 | Should |
| FR-2.7 | 已配置的 key 显示脱敏版本（如 `FAL_KEY=sk-...a3f2`），hover 显示完整 | Should |
| FR-2.8 | 支持删除/重置已配置的 key | Should |

### FR-3: Pipeline 感知的模型推荐

| ID | Requirement | Priority |
|----|------------|----------|
| FR-3.1 | 用户选择 pipeline 后（如 cinematic），自动计算该 pipeline 推荐/必需的模型列表 | Must |
| FR-3.2 | 推荐模型高亮显示，可选模型折叠显示，无关模型隐藏 | Must |
| FR-3.3 | 显示配置完成度进度条（如 "4/6 必需模型已配置"） | Must |
| FR-3.4 | 用户切换 pipeline 时，模型推荐列表实时更新 | Must |
| FR-3.5 | 支持保存自定义模型配置模板（如 "我的日常配置"、"cinematic 专用"） | Could |

### FR-4: Pipeline 执行前配置检查

| ID | Requirement | Priority |
|----|------------|----------|
| FR-4.1 | 每个 stage 开始前，调用 `registry.ensure_discovered()` + 工具 `check_dependencies()` 验证 | Must |
| FR-4.2 | 如果必需工具未配置，中断 pipeline 并弹出配置引导（可跳转到 WebUI 对应配置页） | Must |
| FR-4.3 | 如果可选工具未配置，提供 3 个选项：(a) 补充配置 (b) 使用 fallback (c) 跳过该功能 | Must |
| FR-4.4 | 配置检查结果记录到 `decision_log`，包含缺失的工具、建议、用户选择 | Must |
| FR-4.5 | 支持 `--skip-config-check` 命令行参数跳过检查（用于已确认配置的环境） | Should |

### FR-5: 无配置兜底模式

| ID | Requirement | Priority |
|----|------------|----------|
| FR-5.1 | WebUI 提供"跳过配置"按钮，用户可以选择使用免费/可用模型 | Must |
| FR-5.2 | 系统根据当前已配置的模型自动生成最优可用方案（如：Pexels 视频 + FLUX 图片 + Google TTS + Suno 音乐） | Must |
| FR-5.3 | 如果连免费模型也不可用，提示用户至少配置一个方案，或选择纯 Remotion 动画方案 | Must |
| FR-5.4 | 跳过配置不影响后续脚本和场景规划阶段（这些阶段不需要 API key） | Must |

### FR-6: 配置持久化与安全

| ID | Requirement | Priority |
|----|------------|----------|
| FR-6.1 | API key 写入现有 `.env` 文件，格式兼容 | Must |
| FR-6.2 | 后端 API 不返回完整 key，只返回脱敏版本 | Must |
| FR-6.3 | `.env` 文件权限检查（仅当前用户可读写） | Should |
| FR-6.4 | 支持 `.env.local` 覆盖（gitignored 用户本地配置） | Should |

---

## Technical Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────┐
│                   OpenMontage                    │
│                                                  │
│  ┌─────────────┐    ┌─────────────────────────┐ │
│  │   WebUI     │    │      CLI / Agent         │ │
│  │  (port 3001)│    │  (venv/bin/python)      │ │
│  │             │◄──►│                          │ │
│  │  • 模型配置 │    │  • pipeline orchestration│ │
│  │  • Pipeline │    │  • config validation     │ │
│  │    选择     │    │  • tool execution        │ │
│  │  • 配置检查 │    │                          │ │
│  └──────┬──────┘    └──────────┬───────────────┘ │
│         │                      │                  │
│         └──────────┬───────────┘                  │
│                    ▼                              │
│         ┌──────────────────────┐                  │
│         │   Config Backend     │                  │
│         │  (lib/config_api.py) │                  │
│         │                      │                  │
│         │  • .env read/write   │                  │
│         │  • config.yaml       │                  │
│         │  • registry queries  │                  │
│         │  • dependency check  │                  │
│         └──────────┬───────────┘                  │
│                    ▼                              │
│  ┌───────────────────────────────────────┐       │
│  │         Existing System               │       │
│  │  .env  │  config.yaml  │  tool_registry│       │
│  └───────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

### 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| **WebUI 后端** | Python FastAPI | 项目已用 Python，FastAPI 轻量、自动生成 OpenAPI、WebSocket 支持实时状态 |
| **WebUI 前端** | HTML + vanilla JS（单文件） | 避免引入 React/Remotion 依赖冲突，保持零前端构建步骤 |
| **配置后端** | 扩展现有 `lib/config_model.py` + 新增 `lib/config_api.py` | 复用 Pydantic 验证，最小侵入 |
| **实时通信** | Server-Sent Events (SSE) | 轻量，适合 pipeline 状态推送，不需要 WebSocket 双向 |
| **端口** | 3001 | 与 Remotion Studio 的 3000 区分 |

### 新增文件清单

```
lib/
  config_api.py              # NEW — FastAPI 后端，提供配置读写/检查 API
  config_health.py           # NEW — 配置健康检查逻辑

webui/
  index.html                 # NEW — 主页面（模型配置仪表盘）
  app.js                     # NEW — 前端逻辑
  style.css                  # NEW — 样式
  static/
    favicon.ico              # NEW

Makefile (update):
  webui-start                # NEW — 启动 WebUI
  webui-stop                 # NEW — 停止 WebUI
  config-check               # NEW — CLI 配置检查

AGENT_GUIDE.md (update)      # 添加 WebUI 集成说明
```

### 核心 API 端点

```
GET  /api/status              # 项目状态 + 配置完成度
GET  /api/capabilities        # 全量能力目录（来自 registry）
GET  /api/pipelines           # 可用 pipeline 列表
GET  /api/pipelines/:name     # 单个 pipeline 的模型推荐
GET  /api/models              # 所有模型 + 配置状态
POST /api/models/:name/config # 配置/更新单个模型的 API key
DELETE /api/models/:name/config # 删除模型配置
POST /api/check               # 触发完整配置检查
GET  /api/check/stream        # SSE: 实时推送检查结果
POST /api/env/write           # 批量写入 .env
GET  /api/health/:provider    # 单个 provider 的 API key 健康检查
```

---

## Implementation Plan

### Phase 1: 配置后端（Week 1）

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | 创建 `lib/config_api.py` — FastAPI 应用，提供上述 API 端点 | `lib/config_api.py` |
| 1.2 | 创建 `lib/config_health.py` — 每个 provider 的轻量 health check 实现 | `lib/config_health.py` |
| 1.3 | 扩展现有 `.env` 读写逻辑，支持安全脱敏 | `lib/env_loader.py` (update) |
| 1.4 | CLI 集成：`make config-check` 命令 | `Makefile` (update) |

**成功标准**: `python -m lib.config_api` 启动服务，`curl localhost:3001/api/status` 返回 JSON。

### Phase 2: WebUI 前端（Week 1-2）

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | 创建 `webui/index.html` — 主布局：侧边栏 capability 分组 + 主区域模型卡片 | `webui/index.html` |
| 2.2 | 创建 `webui/app.js` — API 调用、卡片渲染、实时状态更新 | `webui/app.js` |
| 2.3 | 创建 `webui/style.css` — 响应式布局，暗色主题（与 OpenMontage 调性一致） | `webui/style.css` |
| 2.4 | Pipeline 选择器：dropdown + 推荐模型高亮 | `webui/app.js` |
| 2.5 | API key 输入表单 + 实时验证 + 健康检查 | `webui/app.js` |

**成功标准**: 浏览器打开 `localhost:3001`，能看到模型配置面板，输入 key 后状态实时更新。

### Phase 3: Pipeline 集成（Week 2）

| Task | Description | Files |
|------|-------------|-------|
| 3.1 | 在 pipeline 初始化时注入配置检查钩子 | `lib/checkpoint.py` (update) |
| 3.2 | stage director skill 中增加配置检查步骤 | `skills/meta/checkpoint-protocol.md` (update) |
| 3.3 | 无配置兜底逻辑：自动选择最优免费方案 | `lib/config_health.py` |
| 3.4 | Agent 在 assets stage 前的配置检查对话流程 | `AGENT_GUIDE.md` (update) |

**成功标准**: 运行 pipeline 时，未配置的模型在 assets stage 前自动触发配置检查，用户可选择补充或降级。

### Phase 4: 集成测试（Week 2）

| Task | Description |
|------|-------------|
| 4.1 | E2E 测试：WebUI → 写入 .env → pipeline 读取 → 验证通过 |
| 4.2 | E2E 测试：未配置模型 → 配置检查阻断 → 降级方案 |
| 4.3 | E2E 测试：无配置模式 → 纯 Remotion 动画 |
| 4.4 | 回归测试：确保现有 CLI 流程不受影响 |

---

## 交互流程

### 正常配置流程

```
用户启动项目
    │
    ▼
WebUI 显示配置仪表盘
    │
    ├── Pipeline 选择: [cinematic ▼]
    │       │
    │       ▼
    │   推荐模型: Seedance 🔴 FLUX 🔴 Suno 🟢 ElevenLabs 🔴
    │   完成度: 1/4 必需模型已配置
    │
    ├── 点击 FLUX 卡片
    │       │
    │       ▼
    │   展开: API Key 输入框 + 获取 key 链接
    │   [输入 FAL_KEY]
    │   [验证] → ✅ FAL_KEY 有效
    │   [保存到 .env]
    │
    └── 完成度更新: 2/4 ✅
            │
            ▼
        [开始制作] → Pipeline 启动
```

### 无配置兜底流程

```
用户启动项目
    │
    ▼
WebUI: "检测到未配置模型"
    │
    ├── [配置模型] → 正常配置流程
    │
    ├── [跳过，用免费模型] → 无配置兜底
    │       │
    │       ▼
    │   方案: Pexels 视频 (stock) + Recraft 图片 + Google TTS + 无音乐
    │   用户确认 → Pipeline 以 stock-led 模式启动
    │
    └── [仅生成脚本] → 跳过 assets，只产出 script + scene_plan
```

### Pipeline 执行中检查流程

```
assets stage 开始前
    │
    ▼
config_check(required_tools=["seedance_video", "flux_image", "suno_music"])
    │
    ├── seedance_video: ❌ FAL_KEY 过期
    │   ├── [更新 FAL_KEY]
    │   ├── [使用 Kling 替代] ($0.10/5s, 质量略降)
    │   └── [跳过，无视频]
    │
    ├── flux_image: ❌ FAL_KEY 过期
    │   ├── [更新 FAL_KEY]
    │   ├── [使用 Recraft 替代] ($0.04/image)
    │   └── [跳过，无参考图]
    │
    ├── suno_music: ✅ SUNO_API_KEY 有效
    │
    └── elevenlabs_tts: ❌ ELEVENLABS_API_KEY 过期
        ├── [更新 API Key]
        ├── [使用 OpenAI TTS 替代]
        └── [跳过，无配音]
            │
            ▼
        用户选择 → 更新配置 → assets stage 继续
```

---

## Data Models

### ConfigCheckResult

```python
@dataclass
class ConfigCheckResult:
    tool_name: str
    capability: str
    status: "ok" | "missing_key" | "invalid_key" | "dependency_missing"
    message: str
    severity: "required" | "optional" | "suggestion"
    fallback_tools: list[str]
    install_instructions: str
```

### PipelineModelRecommendation

```python
@dataclass
class PipelineModelRecommendation:
    pipeline_name: str
    required: list[ToolInfo]       # 必需的模型
    recommended: list[ToolInfo]    # 推荐的模型
    optional: list[ToolInfo]       # 可选的模型
    configured_count: int
    total_count: int
    free_fallback: list[str]       # 免费替代方案
```

---

## Design Principles

1. **零干扰原则**: 配置检查只在 stage 边界触发，不在生成过程中打断
2. **渐进披露**: 默认只显示当前 pipeline 相关的模型，不暴露全部 57 个工具
3. **无配置即用**: 跳过配置不应成为阻塞，系统自动选择最优可用方案
4. **安全优先**: API key 脱敏存储，后端不返回明文，前端输入框支持 show/hide
5. **CLI 等价**: 所有 WebUI 操作都有对应的 CLI 命令，适合 CI/CD 和远程服务器

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| WebUI 增加项目复杂度，破坏现有 CLI 工作流 | High | WebUI 是可选的；CLI 完全独立可用 |
| FastAPI 后端与 agent 流程的并发安全问题 | Medium | 配置写入加文件锁；`.env` 读取缓存 + 手动刷新 |
| API key 验证触发 rate limit | Medium | Health check 有 24h 缓存，不每次请求都调 API |
| 前端单文件 HTML 难以维护 | Low | 功能范围控制在配置面板，不引入复杂前端框架 |
| 与 Remotion 3000 端口冲突 | Low | 固定 3001 端口，Makefile 中检查占用 |

---

## Out of Scope (Post-MVP)

- 多用户/团队配置管理
- API key 自动轮转
- 模型性能监控 Dashboard
- 预算告警（当前有 `cost_tracker` 但无 UI）
- 模型 A/B 测试框架
- 一键部署到 Vercel/Railway
