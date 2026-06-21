# OpenMontage - 项目知识总结（中文版）

_自动生成的项目知识文档。创建日期：2026-06-21_

---

[启动、构建和测试命令](#4-启动构建和测试命令)

## 1. 项目简介

**OpenMontage** 是一个开源的 AI 编排视频制作平台。AI 编程助手（Claude Code、Cursor、Copilot、Windsurf、Codex）本身就是智能层——它读取流水线清单（YAML）+ 阶段导演技能（Markdown），驱动 Python 工具完成端到端的视频制作。

核心循环：
```
用户提示 → 流水线选择 → 预检（发现工具）
→ 阶段执行：创意 → 脚本 → 场景规划 → 素材 → 编辑 → 合成
→ 自审 → 检查点 → 人工审批 → 渲染
```

12 条生产流水线：
- `animated-explainer` — AI 生成解说视频（含研究、旁白、视觉、音乐）
- `talking-head` — 实拍素材主导的演讲者视频
- `screen-demo` — 精致的软件屏幕录制
- `clip-factory` — 从一个长源批量提取短视频片段
- `podcast-repurpose` — 播客精华转视频
- `cinematic` — 预告片、先导片、情绪驱动剪辑
- `animation` — 动态图形、动态排版
- `character-animation` — 本地绑定义卡通角色
- `hybrid` — 实拍素材 + AI 生成辅助视觉
- `avatar-spokesperson` — 虚拟形象主持人视频
- `localization-dub` — 字幕、配音、翻译现有视频
- `documentary-montage` — 来自免费素材库和开放档案的实拍素材

---

## 2. 技术栈

| 层面 | 技术 |
|------|------|
| 核心语言 | Python 3.10+（仅工具和持久化） |
| 视频合成 | React/Remotion（Node.js）、HyperFrames（HTML/GSAP）、FFmpeg |
| 配置管理 | YAML（流水线清单）、JSON Schema（产物校验）、Pydantic |
| 测试框架 | pytest |
| 依赖管理 | pip、npm |
| 构建工具 | Makefile |

核心 Python 依赖：`pyyaml`、`pydantic`、`jsonschema`、`python-dotenv`、`Pillow`、`requests`

---

## 3. 入口文件

OpenMontage 采用 "Agent-first" 架构——没有单一的 Python 入口。关键文件：

| 文件 | 用途 |
|------|------|
| `AGENT_GUIDE.md` | Agent 的完整操作指南和合约（最先读） |
| `PROJECT_CONTEXT.md` | 架构和约定的单一事实来源 |
| `tools/tool_registry.py` | 工具发现和注册中心（运行时入口） |
| `render_demo.py` | 可运行的零密钥 demo 脚本 |
| `config.yaml` | 全局配置 |
| `lib/checkpoint.py` | 检查点写入/读取 |
| `lib/pipeline_loader.py` | 流水线清单加载器 |
| `tools/base_tool.py` | 工具合约基类 |

---

## 4. 启动、构建和测试命令

> **注意：** Homebrew 的 Python 受 PEP 668 保护，不能直接 `pip install`。必须使用虚拟环境。

### 完整初始化（替代 make setup）

```bash
# 1. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 2. 安装 Python 依赖
pip install -r requirements.txt
pip install numpy

# 3. 安装 Remotion（Node.js 合成引擎）
cd remotion-composer && npm install && cd ..

# 4. 创建 .env 配置文件
cp .env.example .env
# 编辑 .env 填写需要的 API key（全部可选）

# 5. 验证安装
python -c "from tools.tool_registry import registry; registry.discover(); print('OK')"
```

### 日常使用

```bash
# 每次打开终端先激活虚拟环境
source venv/bin/activate

# 查看可用工具和 Provider
python -c "from tools.tool_registry import registry; import json; registry.discover(); print(json.dumps(registry.provider_menu_summary(), indent=2))"
```

### 测试

```bash
# 安装测试依赖（首次）
pip install -r requirements-dev.txt

# 运行契约测试（无需 API key）
python -m pytest tests/contracts/ -v

# 运行全部测试
python -m pytest tests/ -v
```

### 渲染 demo 视频

```bash
python render_demo.py
```

### GPU 安装（可选，需要 NVIDIA GPU）

```bash
pip install -r requirements-gpu.txt
pip install diffusers transformers accelerate
```

---

## 5. 新增功能指南

### 新增工具（Provider）
1. 在 `tools/` 子目录创建 Python 文件（如 `tools/video/`、`tools/audio/`、`tools/graphics/`）
2. 继承 `BaseTool`（参考 `tools/base_tool.py`）
3. 实现 `execute(params_dict)` 返回 `ToolResult`
4. 设置所有合约字段（name、version、tier、capability、provider、supports、fallback_tools、agent_skills）
5. Registry 自动发现——无需手动注册
6. 可选：在 `.agents/skills/` 添加 Layer 3 技能

### 新增流水线
1. 在 `pipeline_defs/` 创建 YAML 清单（校验规则：`schemas/pipelines/pipeline_manifest.schema.json`）
2. 在 `skills/pipelines/<流水线名>/` 创建阶段导演技能（7 个技能：从 idea 到 publish）
3. 在清单中引用元技能（reviewer、checkpoint-protocol）
4. 在 `tests/contracts/` 添加契约测试

### 新增技能/知识
- Layer 2（项目约定）：`skills/`
- Layer 3（通用技术知识）：`.agents/skills/`

---

## 6. 架构：三层知识系统

```
Layer 1: tools/ + pipeline_defs/     → "有什么" — 可执行能力 + 编排定义
Layer 2: skills/                     → "怎么用" — OpenMontage 约定和质量标准
Layer 3: .agents/skills/             → "原理" — 外部技术知识包
```

阅读顺序：
1. Registry / 工具合约 — 发现有哪些可用
2. 相关流水线或创意技能（Layer 2）— 知道在此场景下如何使用
3. 底层供应商技能（Layer 3）— **调用任何生成工具前必读**

---

## 7. 关键模式

- **流水线状态机：** `idea → script → scene_plan → assets → edit → compose → publish`
- **指令驱动阶段：** 每个阶段有导演技能（MD）教 Agent 怎么做
- **Selector 模式：** `tts_selector`、`image_selector`、`video_selector` 从 Registry 自动发现 Provider
- **工具类命名：** PascalCase，不加 "Tool" 后缀（如 `MusicGen`、`VideoCompose`）
- **所有工具继承 `BaseTool`**，通过 `.execute(params_dict)` 调用，返回 `ToolResult`
- **风格手册：** YAML 定义视觉语言、排版、动效、音频
- **规范产物：** `brief`、`script`、`scene_plan`、`asset_manifest`、`edit_decisions`、`render_report`
- **三种合成运行时：** FFmpeg（始终可用）、Remotion（React/Node.js）、HyperFrames（HTML/GSAP）
- **项目存储在** `projects/<kebab-case-name>/` 下，含 artifacts/、assets/、renders/ 目录

---

## 8. 可用工具（52+ 个）

### 视频生成（13 个 Provider）
Kling、Runway Gen-4、Google Veo 3、Grok、Higgsfield、MiniMax、HeyGen、WAN 2.1（本地）、Hunyuan（本地）、CogVideo（本地）、LTX-Video（本地/Modal）、Pexels、Pixabay、Wikimedia Commons

### 图像生成（10 个 Provider）
FLUX、Google Imagen、Grok、DALL-E 3、Recraft、Local Diffusion、Pexels、Pixabay、Unsplash、ManimCE

### 语音合成（4 个 Provider）
ElevenLabs、Google TTS（700+ 声音）、OpenAI TTS、Piper（免费离线）

### 音乐与音效
Suno AI、ElevenLabs Music、ElevenLabs SFX

### 后期制作（始终免费）
FFmpeg、Video Stitch、Video Trimmer、Audio Mixer、Audio Enhance、Color Grade、Subtitle Gen

### 增强
Upscale、Background Remove、Face Enhance、Face Restore

### 分析
Transcriber（WhisperX）、Scene Detect、Frame Sampler、Video Understand

### 虚拟形象
Talking Head（SadTalker/MuseTalk）、Lip Sync（Wav2Lip）

---

## 9. 目录结构

```
OpenMontage-video/
├── tools/                  # 52+ Python 工具（Agent 的双手）
│   ├── video/              # 视频生成 + 合成、拼接、裁剪
│   ├── audio/              # TTS、音乐、混音、增强
│   ├── graphics/           # 图像/图形生成 + 图表
│   ├── enhancement/        # 超分、去背景、人脸增强
│   ├── analysis/           # 转录、场景检测、帧采样
│   ├── avatar/             # 虚拟形象、唇形同步
│   └── subtitle/           # SRT/VTT 生成
├── pipeline_defs/          # 13 个 YAML 流水线清单
├── skills/                 # Markdown 技能文件（Agent 的知识库）
│   ├── pipelines/          # 各流水线的阶段导演技能
│   ├── creative/           # 创意技术技能
│   ├── core/               # 核心工具技能
│   └── meta/               # 评审、检查点协议
├── schemas/                # JSON Schema（合约校验）
├── styles/                 # 视觉风格手册（YAML）
├── remotion-composer/      # React/Remotion 视频合成引擎
├── lib/                    # 核心基础设施（配置、检查点、流水线加载器）
├── tests/                  # 契约测试、QA 集成测试、评估工具
├── AGENT_GUIDE.md          # Agent 操作指南（最先读）
├── PROJECT_CONTEXT.md      # 架构参考
├── config.yaml             # 全局配置
├── Makefile                # 构建命令
└── setup.py                # Python 包设置
```

---

## 10. 工具系统详解

### BaseTool 合约

所有工具继承 `BaseTool`（ABC）并声明：

| 字段 | 用途 |
|------|------|
| `name`、`version` | 身份标识 |
| `tier` | CORE、VOICE、ENHANCE、GENERATE、SOURCE、ANALYZE、PUBLISH |
| `capability` | 功能（如 `tts`、`image_generation`、`video_post`） |
| `provider` | 服务商（如 `elevenlabs`、`ffmpeg`、`selector`） |
| `runtime` | LOCAL、LOCAL_GPU、API、HYBRID |
| `stability` | EXPERIMENTAL、BETA、PRODUCTION |
| `dependencies` | 所需二进制（`cmd:ffmpeg`）、环境变量（`env:ELEVENLABS_API_KEY`）、Python 包（`python:torch`） |
| `input_schema`、`output_schema` | 输入输出的 JSON Schema |
| `fallback_tools` | 有序降级链 |
| `agent_skills` | 指向 Layer 3 知识技能的链接 |
| `resource_profile` | CPU、RAM、VRAM、磁盘、网络需求 |
| `retry_policy` | 最大重试次数、退避策略 |

**必需方法：** `execute(inputs) -> ToolResult`

`ToolResult` 包含：`success`、`data`、`artifacts`（文件路径）、`error`、`cost_usd`、`duration_seconds`、`seed`、`model`。

### 工具注册中心

`ToolRegistry` 是单例，通过 `pkgutil.walk_packages()` 自动发现所有 `BaseTool` 子类。无需手动注册。

常用查询：
- `get_by_capability("tts")` — 所有 TTS 工具
- `get_by_provider("elevenlabs")` — 所有 ElevenLabs 工具
- `get_available()` — 依赖已满足的工具
- `find_fallback("elevenlabs_tts")` — 解析降级链
- `support_envelope()` — 完整能力报告
- `gpu_required_tools()`、`network_required_tools()`

### Selector 模式（自动发现）

三个 Selector 工具抽象多 Provider 能力：

| Selector | 能力 | 选择机制 |
|----------|------|----------|
| `tts_selector` | 语音合成 | 按任务匹配度、质量、控制力、可靠性、成本、延迟、连续性排名 |
| `image_selector` | 图像生成 | 从实时 Registry 排名；无硬编码 Provider 顺序 |
| `video_selector` | 视频生成 | 从实时 Registry 排名；尊重用户偏好 |

新增 Provider 工具后自动通过 Selector 可用——无需修改 Selector 代码。

### 工具清单（按类别，57+ 个）

**分析（4）：** transcriber（WhisperX）、scene_detect、frame_sampler、video_understand（CLIP/BLIP-2）

**音频（8）：** elevenlabs_tts、google_tts、openai_tts、piper_tts、tts_selector、music_gen、audio_mixer、audio_enhance

**虚拟形象（2）：** talking_head（SadTalker/MuseTalk）、lip_sync（Wav2Lip）

**增强（5）：** upscale（Real-ESRGAN）、bg_remove（rembg/U2Net）、face_enhance、face_restore（CodeFormer/GFPGAN）、color_grade（FFmpeg LUTs）

**图形（13）：** flux_image、grok_image、google_imagen、openai_image、recraft_image、local_diffusion、pexels_image、pixabay_image、image_selector、code_snippet、diagram_gen、math_animate（ManimCE）、image_gen（已弃用）

**字幕（1）：** subtitle_gen

**视频（18）：** grok_video、heygen_video、higgsfield_video、veo_video、kling_video、runway_video、minimax_video、wan_video、hunyuan_video、cogvideo_video、ltx_video_local、ltx_video_modal、pexels_video、pixabay_video、video_selector、video_compose（FFmpeg）、video_stitch、video_trimmer

---

## 11. 流水线系统详解

### 流水线清单结构（YAML）

```yaml
name: animated-explainer
version: "2.0"
category: generated          # talking_head | generated | hybrid | screen_recording | animation | cinematic | custom
default_checkpoint_policy: guided

orchestration:
  mode: executive-producer
  skill: pipelines/explainer/executive-producer
  budget_default_usd: 2.00
  max_revisions_per_stage: 3

compatible_playbooks:
  - clean-professional
  - flat-motion-graphics

stages:
  - name: research
    skill: pipelines/explainer/research-director
    produces: [research_brief]
    tools_available: []
    checkpoint_required: false
    human_approval_default: false
    review_focus: [...]
    success_criteria: [...]
  # ... 直到 publish
```

### 标准阶段流程（8 个阶段）

```
research → proposal → script → scene_plan → assets → edit → compose → publish
```

每个阶段：
1. 有一个**阶段导演技能**（Markdown 指令）
2. 声明 **tools_available**（可调用的工具）
3. **产出**一个或多个规范产物
4. 有 **review_focus** 标准和 **success_criteria**
5. 可要求**人工审批**后才能继续

### 流水线 → 阶段导演技能映射

| 流水线 | 阶段 | 有执行制片人 |
|--------|------|-------------|
| animated-explainer | research, proposal, script, scene_plan, assets, edit, compose, publish | 是 |
| animation | research, proposal, script, scene_plan, assets, edit, compose, publish | 是 |
| talking-head | idea, script, scene_plan, assets, edit, compose, publish | 否 |
| screen-demo | idea, script, scene_plan, assets, edit, compose, publish | 是 |
| clip-factory | idea, script, scene_plan, assets, edit, compose, publish | 是 |
| podcast-repurpose | idea, script, scene_plan, assets, edit, compose, publish | 是 |
| cinematic | idea, script, scene_plan, assets, edit, compose, publish | 是 |
| hybrid | idea, script, scene_plan, assets, edit, compose, publish | 是 |
| avatar-spokesperson | idea, script, scene_plan, assets, edit, compose, publish | 是 |
| localization-dub | idea, script, scene_plan, assets, edit, compose, publish | 是 |
| character-animation | idea, script, character_design, rig_plan, scene_plan, assets, edit, compose | 否 |
| documentary-montage | idea, script, scene_plan, assets, edit, compose | 否 |

---

## 12. 规范产物（11 种，JSON Schema 校验）

| 产物 | 阶段 | 内容 |
|------|------|------|
| `research_brief` | research | 市场分析、数据点、受众洞察、切入角度 |
| `proposal_packet` | proposal | 概念方案、制作计划、成本估算、审批门 |
| `brief` | idea | 标题、钩子、要点、调性、风格、平台、时长 |
| `script` | script | 带时间戳的段落，含增强提示、发音指南 |
| `scene_plan` | scene_plan | 场景定义（类型、描述、时序） |
| `asset_manifest` | assets | 已生成素材（路径、来源工具、场景关联） |
| `edit_decisions` | edit | 编辑剪切（入点/出点时间） |
| `render_report` | compose | 输出元数据（格式、分辨率、时长） |
| `publish_log` | publish | 平台发布记录（状态） |
| `review` | （任意） | 评审反馈和审批记录 |
| `cost_log` | （任意） | 预算追踪条目 |

---

## 13. 预算治理

### 生命周期

```
estimate(tool, operation, $) → entry_id
        |
reserve(entry_id)          # 锁定预算
        |
reconcile(entry_id, $)     # 记录实际花费
```

### 预算模式（config.yaml）

| 模式 | 行为 |
|------|------|
| `observe` | 仅追踪成本，不强制执行 |
| `warn` | 超支时记录警告，允许继续执行 |
| `cap` | 拒绝超出剩余预算的操作 |

### 控制项
- **总预算：** $10.00（默认）
- **预留比例：** 10% — 作为安全余量
- **单次操作审批阈值：** $0.50 — 超过此金额暂停等待审批
- **新付费工具审批：** 首次使用任何付费工具需确认
- 持久化到每个项目的 `cost_log.json`

---

## 14. 配置（config.yaml）

```yaml
llm:
  provider: anthropic            # anthropic | openai | gemini | openrouter | ollama | mistral | minimax
  model: null                    # null = 使用 Provider 默认值
  temperature: 0.7
  max_tokens: 4096

budget:
  mode: warn                     # observe | warn | cap
  total_usd: 10.00
  reserve_pct: 0.10
  single_action_approval_usd: 0.50
  require_approval_for_new_paid_tool: true

checkpoint:
  policy: guided                 # guided | manual_all | auto_noncreative
  storage_dir: pipeline

output:
  default_format: mp4
  default_codec: libx264
  default_audio_codec: aac
  default_resolution: "1920x1080"
  default_fps: 30
  default_crf: 23

paths:
  pipeline_dir: pipeline
  library_dir: library
  styles_dir: styles
  skills_dir: skills
  output_dir: output
```

### 环境变量（.env）

| 变量 | 使用者 | 用途 |
|------|--------|------|
| `ELEVENLABS_API_KEY` | elevenlabs_tts、music_gen | TTS、音乐、音效 |
| `OPENAI_API_KEY` | openai_tts、openai_image | TTS 备选、DALL-E 3 |
| `XAI_API_KEY` | grok_image、grok_video | Grok 图像/视频生成 |
| `FAL_KEY` | flux_image、kling_video、veo_video、minimax_video、recraft_image | fal.ai 托管模型 |
| `HEYGEN_API_KEY` | heygen_video | 多 Provider 视频生成 |
| `PEXELS_API_KEY` | pexels_image、pexels_video | 素材库 |
| `PIXABAY_API_KEY` | pixabay_image、pixabay_video | 素材库 |
| `GOOGLE_API_KEY` | google_imagen、google_tts | Google Imagen 图像、Google Cloud TTS |
| `RUNWAY_API_KEY` | runway_video | Runway Gen-3/Gen-4 直连 |
| `HIGGSFIELD_API_KEY` + `HIGGSFIELD_API_SECRET` | higgsfield_video | Higgsfield 多模型视频 |
| `MODAL_LTX2_ENDPOINT_URL` | ltx_video_modal | 自托管 LTX-2 |
| `VIDEO_GEN_LOCAL_ENABLED` | 本地视频工具 | 启用本地 GPU 生成 |
| `VIDEO_GEN_LOCAL_MODEL` | wan、hunyuan、ltx、cogvideo | 选择本地模型 |

---

## 15. 技能索引（Layer 2）

### 核心技能（6 个）

| 技能 | 文件 | 触发场景 |
|------|------|----------|
| FFmpeg | `core/ffmpeg.md` | 视频编码、滤镜、合成 |
| Remotion | `core/remotion.md` | React 基合成 |
| HyperFrames | `core/hyperframes.md` | HTML/CSS/GSAP 合成 |
| WhisperX | `core/whisperx.md` | 逐字时间戳转录 |
| 字幕同步 | `core/subtitle-sync.md` | 字幕时间对齐 |
| 调色 | `core/color-grading.md` | FFmpeg 色彩配置、LUT 工作流 |

### 创意技能（28 个）

| 技能 | 文件 | 触发场景 |
|------|------|----------|
| 视频编辑 | `creative/video-editing.md` | 剪切决策、节奏、韵律 |
| 增强策略 | `creative/enhancement-strategy.md` | 叠层放置和密度 |
| 数据可视化 | `creative/data-visualization.md` | 图表类型选择、动画 |
| 视频拼接 | `creative/video-stitching.md` | 多片段组装、空间合成 |
| 视频生成提示词 | `creative/video-gen-prompting.md` | 通用视频生成提示词词汇 |
| Seedance 提示词 | `creative/prompting/seedance-prompting.md` | Seedance 2.0 首选高端默认 |
| Grok 提示词 | `creative/prompting/grok-prompting.md` | Grok 图像/视频提示 |
| Sora 提示词 | `creative/prompting/sora-prompting.md` | Sora 2 结构化模板 |
| VEO 提示词 | `creative/prompting/veo-prompting.md` | VEO 3.1 十四组件结构 |
| LTX 提示词 | `creative/prompting/ltx-prompting.md` | LTX-2 六元素结构 |
| HunyuanVideo 提示词 | `creative/prompting/hunyuan-prompting.md` | HunyuanVideo 公式 |
| 叙事 | `creative/storytelling.md` | 叙事结构、钩子、节奏 |
| 音效设计 | `creative/sound-design.md` | 音频闪避、LUFS 目标、音效时机 |
| 排版 | `creative/typography.md` | 字体选择、文字尺寸、安全区 |
| ManimCE 用法 | `creative/manim-usage.md` | 场景构图、动画时序 |
| 图像生成用法 | `creative/image-gen-usage.md` | 提示词一致性、批量策略 |
| 图像 Provider 用法 | `creative/image-provider-usage.md` | Provider 选择、性价比权衡 |
| B-Roll 规划 | `creative/broll-planning.md` | 素材 vs 生成决策 |
| 素材采购 | `creative/stock-sourcing-usage.md` | Pexels/Pixabay 用法 |
| 场景检测 | `creative/scene-detect-usage.md` | 阈值调优、算法选择 |
| 图表生成 | `creative/diagram-gen-usage.md` | 复杂度限制、渐进式构建 |
| 音乐生成 | `creative/music-gen-usage.md` | BPM 选择、提示词工程 |
| 去背景 | `creative/bg-remove-usage.md` | 模型选择、Alpha 抠图 |
| 超分 | `creative/upscale-usage.md` | 缩放因子、模型选择 |
| 人脸修复 | `creative/face-restore-usage.md` | CodeFormer/GFPGAN 选择 |
| 唇形同步 | `creative/lip-sync-usage.md` | Wav2Lip 模型选择 |
| 虚拟形象生成 | `creative/talking-head-gen-usage.md` | SadTalker/MuseTalk |
| 视频理解 | `creative/video-understand-usage.md` | 视觉问答、质量门控 |

### 元技能（4 个）

| 技能 | 文件 | 用途 |
|------|------|------|
| 入门引导 | `meta/onboarding.md` | 首次交互问候、能力发现 |
| 评审器 | `meta/reviewer.md` | 每个阶段后的自审协议 |
| 检查点协议 | `meta/checkpoint-protocol.md` | 何时/如何设置检查点并请求人工审批 |
| 技能创建器 | `meta/skill-creator.md` | 在流水线运行中动态创建新技能 |

### 风格手册（3 个）

| 手册 | 类别 | 氛围 | 最佳用途 |
|------|------|------|----------|
| `clean-professional` | 动态图形 | 精致、可信赖 | 企业、教育、SaaS |
| `flat-motion-graphics` | 动态图形 | 活力、大胆 | 社交媒体、TikTok、初创公司 |
| `minimalist-diagram` | 白板 | 专注、技术感 | 技术深度解析、架构 |

---

## 16. 合成运行时

| 引擎 | 用途 | 依赖 |
|------|------|------|
| **FFmpeg** | 纯视频剪切、拼接、裁剪、字幕烧录 | `ffmpeg` 二进制（始终可用） |
| **Remotion** | React 基合成：动画场景、文字卡片、图表、弹簧物理转场、逐字字幕、TalkingHead 虚拟形象 | Node.js（`npx`）+ `remotion-composer/` + `node_modules` |
| **HyperFrames** | HTML/CSS/GSAP 合成：动态排版、产品推广、发布视频、网站转视频、注册表区块、SVG 角色绑定 | Node.js ≥ 22 + FFmpeg + `npx` |

运行时在提案阶段选择（`render_runtime`），通过 `edit_decisions` 锁定。禁止静默切换。

---

## 17. 测试架构

```
tests/
├── contracts/              # 工具合约校验、Schema 检查、Registry 测试
├── qa/                     # 集成测试：TTS、图像生成、音乐、音频混音、视频合成/拼接、E2E
├── eval/                   # 黄金场景回放工具（回归测试）
├── pipelines/              # 流水线级测试
├── tools/                  # 单工具测试
└── styles/                 # 风格手册测试
```

- **契约测试：** 验证每个工具满足 `BaseTool` 合约（身份、Schema、依赖、继承）
- **QA 测试：** 使用真实 API/二进制调用工具并检查输出质量
- **评估工具：** 回放黄金场景，对随机输出进行容差比较

---

## 18. 关键设计决策

1. **无运行时编排器** — LLM Agent 读取 YAML + Markdown 驱动一切。可调试（读技能即可）且模型无关。

2. **运行时无 LLM API key** — OpenMontage 不调用 LLM API。编程助手本身就是 LLM。工具调用领域特定 API（ElevenLabs、fal.ai 等）。

3. **基于检查点的恢复** — 任何阶段失败后从最后检查点恢复，不重跑已完成阶段。

4. **Schema 校验产物** — 每个阶段输出在写入检查点前经 JSON Schema 校验，防止垃圾传播。

5. **预算作为一等概念** — 执行前估算成本、预算预留、事后对账。Agent 无法静默超支。

6. **Selector 模式优于硬编码 Provider** — 能力优雅降级。缺 API key？Selector 降级到下一个 Provider 或本地替代。

7. **技能优于代码承载智能** — 创意决策、质量清单、评审标准、提示词模板都在 Markdown 技能中，不在 Python 里。行为通过编辑文本文件调优，而非代码。

8. **双 Provider 支持** — 每个能力同时支持 API Provider（云端付费）和本地/开源替代（免费，依赖 GPU）。

---

## 19. Layer 3 技能（已安装的 Agent 技能）

| 类别 | 已安装技能 |
|------|-----------|
| **视频合成** | `remotion-best-practices`、`remotion`、`hyperframes`、`hyperframes-cli`、`hyperframes-registry`、`website-to-hyperframes` |
| **视频处理** | `ffmpeg`、`video_toolkit` |
| **TTS 与音频** | `text-to-speech`、`speech-to-text`、`music`、`sound-effects`、`elevenlabs`、`agents`、`setup-api-key` |
| **图像生成** | `flux-best-practices`、`bfl-api`、`grok-media` |
| **数学动画** | `manimce-best-practices`、`manimgl-best-practices`、`manim-composer` |
| **3D 图形** | `threejs-animation`、`threejs-fundamentals`、`threejs-geometry`、`threejs-interaction`、`threejs-lighting`、`threejs-loaders`、`threejs-materials`、`threejs-postprocessing`、`threejs-shaders`、`threejs-textures` |
| **图表** | `beautiful-mermaid`、`d3-viz` |
| **动画** | `framer-motion`、`lottie-bodymovin` |
| **设计** | `tailwind-design-system`、`web-design-guidelines`、`vercel-react-best-practices`、`vercel-composition-patterns` |
| **AI 视频** | `heygen`、`avatar-video`、`create-video`、`faceswap`、`ai-video-gen`、`video-download`、`video-edit`、`video-translate`、`video-understand`、`visual-style` |
| **AI 视频（高端）** | `seedance-2-0`（首选高端默认） |
| **基础设施** | `acestep`、`ltx2`、`playwright-recording` |

---

## 20. tools/ 目录完整工具清单（实际扫描）

> 以下为 `tools/` 目录下所有 Python 工具文件的实际扫描结果，共 **83 个工具文件**（不含 `__init__.py`、`_shared.py`、`base.py` 等基础/辅助文件）。

### 基础设施（3 个）

| 文件 | 路径 | 说明 |
|------|------|------|
| `base_tool.py` | `tools/` | 工具合约基类（ABC），所有工具继承此类 |
| `tool_registry.py` | `tools/` | 工具自动发现注册中心（单例） |
| `cost_tracker.py` | `tools/` | 预算治理（估算→预留→对账） |

### analysis/ — 分析工具（12 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `transcriber.py` | `Transcriber` | WhisperX 语音转文字（逐字时间戳） |
| `transcript_fetcher.py` | `TranscriptFetcher` | 字幕/转录获取 |
| `scene_detect.py` | `SceneDetect` | 自动场景边界检测 |
| `frame_sampler.py` | `FrameSampler` | 智能帧提取 |
| `video_understand.py` | `VideoUnderstand` | CLIP/BLIP-2 视觉语言分析 |
| `video_analyzer.py` | `VideoAnalyzer` | 视频内容分析 |
| `video_downloader.py` | `VideoDownloader` | 视频下载 |
| `visual_qa.py` | `VisualQA` | 视觉问答 |
| `face_tracker.py` | `FaceTracker` | 人脸追踪 |
| `audio_probe.py` | `AudioProbe` | 音频探测/分析 |
| `audio_energy.py` | `AudioEnergy` | 音频能量分析 |
| `composition_validator.py` | `CompositionValidator` | 合成预校验（交付承诺、幻灯片风险） |

### audio/ — 音频工具（12 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `elevenlabs_tts.py` | `ElevenLabsTTS` | ElevenLabs 高品质语音合成 |
| `google_tts.py` | `GoogleTTS` | Google Cloud TTS（700+ 声音） |
| `openai_tts.py` | `OpenAITTS` | OpenAI TTS |
| `piper_tts.py` | `PiperTTS` | Piper 免费离线 TTS |
| `doubao_tts.py` | `DoubaoTTS` | 豆包/火山引擎 TTS |
| `tts_selector.py` | `TTSSelector` | TTS Provider 自动路由选择器 |
| `music_gen.py` | `MusicGen` | 音乐生成（通用） |
| `suno_music.py` | `SunoMusic` | Suno AI 音乐生成 |
| `pixabay_music.py` | `PixabayMusic` | Pixabay 免费音乐 |
| `freesound_music.py` | `FreesoundMusic` | Freesound 音效库 |
| `audio_mixer.py` | `AudioMixer` | 多轨混音、闪避、淡入淡出 |
| `audio_enhance.py` | `AudioEnhance` | 降噪、标准化 |

### avatar/ — 虚拟形象工具（2 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `talking_head.py` | `TalkingHead` | SadTalker/MuseTalk 虚拟形象动画 |
| `lip_sync.py` | `LipSync` | Wav2Lip 音频驱动唇形同步 |

### capture/ — 录屏工具（3 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `screen_recorder.py` | `ScreenRecorder` | 屏幕录制 |
| `cap_recorder.py` | `CapRecorder` | Cap 录制器 |
| `screen_capture_selector.py` | `ScreenCaptureSelector` | 录屏方式选择器 |

### character/ — 角色动画工具（1 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `character_animation.py` | `CharacterAnimation` | 本地角色动画（角色规格、SVG 绑定、姿态库、动作时间线、HyperFrames 包、QA） |

### enhancement/ — 增强工具（6 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `upscale.py` | `Upscale` | Real-ESRGAN 图像/视频超分 |
| `bg_remove.py` | `BgRemove` | rembg/U2Net 背景移除 |
| `face_enhance.py` | `FaceEnhance` | 人脸质量增强 |
| `face_restore.py` | `FaceRestore` | CodeFormer/GFPGAN 人脸修复 |
| `eye_enhance.py` | `EyeEnhance` | 眼部增强 |
| `color_grade.py` | `ColorGrade` | FFmpeg LUT 调色 |

### graphics/ — 图像/图形工具（13 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `flux_image.py` | `FluxImage` | FLUX 图像生成（fal.ai） |
| `google_imagen.py` | `GoogleImagen` | Google Imagen 图像生成 |
| `grok_image.py` | `GrokImage` | xAI Grok 图像编辑/生成 |
| `openai_image.py` | `OpenAIImage` | DALL-E 3 图像生成 |
| `recraft_image.py` | `RecraftImage` | Recraft 设计导向图像生成 |
| `local_diffusion.py` | `LocalDiffusion` | 本地 Stable Diffusion |
| `pexels_image.py` | `PexelsImage` | Pexels 免费素材图片 |
| `pixabay_image.py` | `PixabayImage` | Pixabay 免费素材图片 |
| `image_selector.py` | `ImageSelector` | 图像 Provider 自动路由选择器 |
| `image_gen.py` | `ImageGen` | 图像生成（已弃用） |
| `code_snippet.py` | `CodeSnippet` | 代码片段渲染 |
| `diagram_gen.py` | `DiagramGen` | 图表/流程图生成（Mermaid） |
| `math_animate.py` | `MathAnimate` | ManimCE 数学动画 |

### subtitle/ — 字幕工具（1 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| `subtitle_gen.py` | `SubtitleGen` | SRT/VTT 字幕生成 |

### video/ — 视频工具（30 个）

| 文件 | 工具类名 | 说明 |
|------|----------|------|
| **Provider 生成** | | |
| `kling_video.py` | `KlingVideo` | Kling 视频生成 |
| `runway_video.py` | `RunwayVideo` | Runway Gen-4 视频生成 |
| `veo_video.py` | `VeoVideo` | Google Veo 3 视频生成 |
| `grok_video.py` | `GrokVideo` | xAI Grok 视频生成 |
| `heygen_video.py` | `HeygenVideo` | HeyGen 多 Provider 视频网关 |
| `minimax_video.py` | `MinimaxVideo` | MiniMax 视频生成 |
| `higgsfield_video.py` | `HiggsfieldVideo` | Higgsfield 多模型视频 |
| `seedance_video.py` | `SeedanceVideo` | Seedance 2.0（首选高端默认） |
| `seedance_replicate.py` | `SeedanceReplicate` | Seedance 2.0 via Replicate |
| `wan_video.py` | `WanVideo` | WAN 2.1 本地 GPU 视频 |
| `hunyuan_video.py` | `HunyuanVideo` | Hunyuan 本地 GPU 视频 |
| `cogvideo_video.py` | `CogVideoVideo` | CogVideo 本地 GPU 视频 |
| `ltx_video_local.py` | `LtxVideoLocal` | LTX-Video 本地 GPU |
| `ltx_video_modal.py` | `LtxVideoModal` | LTX-Video Modal 云端 |
| `pexels_video.py` | `PexelsVideo` | Pexels 免费素材视频 |
| `pixabay_video.py` | `PixabayVideo` | Pixabay 免费素材视频 |
| **合成/拼接/裁剪** | | |
| `video_compose.py` | `VideoCompose` | 运行时感知合成编排（路由到 Remotion/HyperFrames/FFmpeg） |
| `video_stitch.py` | `VideoStitch` | 多片段组装、交叉淡化、画中画 |
| `video_trimmer.py` | `VideoTrimmer` | 精准剪切和提取 |
| `video_selector.py` | `VideoSelector` | 视频 Provider 自动路由选择器 |
| `hyperframes_compose.py` | `HyperFramesCompose` | HyperFrames 运行时（HTML/CSS/GSAP 合成） |
| `remotion_caption_burn.py` | `RemotionCaptionBurn` | Remotion 字幕烧录 |
| **素材搜索/处理** | | |
| `clip_search.py` | `ClipSearch` | CLIP 语义视频片段搜索 |
| `clip_cache.py` | `ClipCache` | 片段缓存管理 |
| `corpus_builder.py` | `CorpusBuilder` | 素材库构建（Archive.org、NASA 等） |
| `direct_clip_search.py` | `DirectClipSearch` | 直接片段搜索 |
| **特效/处理** | | |
| `green_screen_processor.py` | `GreenScreenProcessor` | 绿幕处理 |
| `green_screen_composite.py` | `GreenScreenComposite` | 绿幕合成 |
| `silence_cutter.py` | `SilenceCutter` | 静音自动剪切 |
| `auto_reframe.py` | `AutoReframe` | 自动重构（适配不同宽高比） |
| `showcase_card.py` | `ShowcaseCard` | 展示卡片生成 |

### video/stock_sources/ — 免费素材源（16 个）

| 文件 | 素材源 | 说明 |
|------|--------|------|
| `archive_org.py` | Archive.org | 互联网档案馆开放素材 |
| `nasa.py` | NASA | NASA 开放影像 |
| `wikimedia.py` | Wikimedia Commons | 维基共享资源 |
| `noaa.py` | NOAA | 美国国家海洋和大气管理局 |
| `jaxa.py` | JAXA | 日本宇宙航空研究开发机构 |
| `esa.py` | ESA | 欧洲航天局 |
| `loc.py` | Library of Congress | 美国国会图书馆 |
| `nara.py` | NARA | 美国国家档案馆 |
| `pexels.py` | Pexels | Pexels 免费素材（需 API key） |
| `pixabay_video.py` | Pixabay | Pixabay 免费素材（需 API key） |
| `unsplash.py` | Unsplash | Unsplash 免费图片（需 API key） |
| `coverr.py` | Coverr | Coverr 免费视频 |
| `dareful.py` | Dareful | Dareful 免费 4K 视频 |
| `mixkit.py` | Mixkit | Mixkit 免费素材 |
| `videvo.py` | Videvo | Videvo 免费素材 |
| `pond5_pd.py` | Pond5 Public Domain | Pond5 公共领域素材 |

---

### 工具总数统计

| 类别 | 数量 |
|------|------|
| 基础设施 | 3 |
| analysis（分析） | 12 |
| audio（音频） | 12 |
| avatar（虚拟形象） | 2 |
| capture（录屏） | 3 |
| character（角色动画） | 1 |
| enhancement（增强） | 6 |
| graphics（图像/图形） | 13 |
| subtitle（字幕） | 1 |
| video（视频） | 30 |
| video/stock_sources（素材源） | 16 |
| **合计** | **99** |

> 注：以上统计排除了 `__init__.py`、`_shared.py`、`base.py` 等非工具文件。实际注册到 Registry 的工具类数量可能略有不同（部分文件为辅助模块而非独立工具）。

---

## 21. 常用工具使用示例

> 完整示例文档见 [`PROJECT_LEARNING_TOOL_EXAMPLES_zh.md`](PROJECT_LEARNING_TOOL_EXAMPLES_zh.md)（822 行），以下为核心摘要。

### 基础模式

```python
from tools.tool_registry import registry
registry.discover()

# 查询可用工具
tts_tools = registry.get_by_capability("tts")
available = registry.get_available()

# 统一调用模式
result = tool.execute({"param": "value"})
if result.success:
    print(result.artifacts)  # 输出文件路径
    print(result.cost_usd)   # 花费
```

### TTS 语音合成

```python
from tools.audio.tts_selector import TTSSelector
selector = TTSSelector()
result = selector.execute({
    "text": "你好，欢迎使用 OpenMontage！",
    "preferred_provider": "auto",
    "output_path": "output/audio.mp3",
})
```

### 图像生成

```python
from tools.graphics.flux_image import FluxImage
gen = FluxImage()
result = gen.execute({
    "prompt": "A futuristic city at sunset, 4K cinematic",
    "width": 1920, "height": 1080,
    "output_path": "output/scene.png",
})
```

### 视频拼接

```python
from tools.video.video_stitch import VideoStitch
stitch = VideoStitch()
result = stitch.execute({
    "operation": "stitch",
    "clips": ["scene1.mp4", "scene2.mp4", "scene3.mp4"],
    "transition": "crossfade",
    "transition_duration": 0.5,
    "output_path": "output/stitched.mp4",
})
```

### 音频混音

```python
from tools.audio.audio_mixer import AudioMixer
mixer = AudioMixer()
result = mixer.execute({
    "operation": "duck",
    "primary_audio": "narration.mp3",
    "secondary_audio": "music.mp3",
    "duck_amount": 0.25,
    "output_path": "output/mixed.mp3",
})
```

### 字幕生成

```python
from tools.subtitle.subtitle_gen import SubtitleGen
sub = SubtitleGen()
result = sub.execute({
    "segments": transcription_segments,
    "format": "srt",
    "output_path": "output/subtitles.srt",
})
```

### 完整示例见

- [`PROJECT_LEARNING_TOOL_EXAMPLES_zh.md`](PROJECT_LEARNING_TOOL_EXAMPLES_zh.md) — 14 个章节、822 行、覆盖全部工具类型
