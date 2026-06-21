# OpenMontage - Project Learning Summary

_Auto-generated project knowledge document. Created: 2026-06-21_

---

## 1. What This Project Does

**OpenMontage** is an open-source, AI-orchestrated video production platform. The AI coding assistant (Claude Code, Cursor, Copilot, Windsurf, Codex) IS the intelligence — it reads pipeline manifests (YAML) + stage director skills (Markdown) and drives Python tools to produce video content end-to-end.

Core loop:
```
User prompt → Pipeline selection → Preflight (discover tools)
→ Stages: idea → script → scene_plan → assets → edit → compose
→ Self-review → Checkpoint → Human approval → Render
```

12 production pipelines:
- `animated-explainer` — AI-generated explainer with research, narration, visuals, music
- `talking-head` — Footage-led speaker videos
- `screen-demo` — Polished software screen recordings
- `clip-factory` — Batch short-form clips from one long source
- `podcast-repurpose` — Podcast highlights to video
- `cinematic` — Trailer, teaser, mood-driven edits
- `animation` — Motion graphics, kinetic typography
- `character-animation` — Local rigged cartoon characters
- `hybrid` — Source footage + AI-generated support visuals
- `avatar-spokesperson` — Avatar-driven presenter videos
- `localization-dub` — Subtitle, dub, translate existing video
- `documentary-montage` — Real footage from free stock + open archives

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Core language | Python 3.10+ (tools + persistence only) |
| Video composition | React/Remotion (Node.js), HyperFrames (HTML/GSAP), FFmpeg |
| Configuration | YAML (pipeline manifests), JSON Schema (artifact validation), Pydantic |
| Testing | pytest |
| Dependency management | pip, npm |
| Build | Makefile |

Core Python dependencies: `pyyaml`, `pydantic`, `jsonschema`, `python-dotenv`, `Pillow`, `requests`

---

## 3. Entry Points

OpenMontage is "Agent-first" — no single Python entry point. Key files:

| File | Purpose |
|------|---------|
| `AGENT_GUIDE.md` | Agent's complete operating guide and contract (read first) |
| `PROJECT_CONTEXT.md` | Architecture and conventions (single source of truth) |
| `tools/tool_registry.py` | Tool discovery and registry (runtime entry) |
| `render_demo.py` | Runnable zero-key demo script |
| `config.yaml` | Global configuration |
| `lib/checkpoint.py` | Checkpoint writer/reader |
| `lib/pipeline_loader.py` | Pipeline manifest loader |
| `tools/base_tool.py` | ToolContract base class |

---

## 4. Build / Test / Start Commands

> **Note:** Homebrew's Python is PEP 668 protected — `pip install` directly won't work. Use a virtual environment.

### Full Setup (replaces make setup)

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt
pip install numpy

# 3. Install Remotion (Node.js composition engine)
cd remotion-composer && npm install && cd ..

# 4. Create .env config
cp .env.example .env
# Edit .env to add API keys (all optional)

# 5. Verify installation
python -c "from tools.tool_registry import registry; registry.discover(); print('OK')"
```

### Daily Usage

```bash
# Activate venv each time you open a terminal
source venv/bin/activate

# Check available tools and providers
python -c "from tools.tool_registry import registry; import json; registry.discover(); print(json.dumps(registry.provider_menu_summary(), indent=2))"
```

### Testing

```bash
# Install test dependencies (first time)
pip install -r requirements-dev.txt

# Run contract tests (no API keys needed)
python -m pytest tests/contracts/ -v

# Run all tests
python -m pytest tests/ -v
```

### Render Demo Videos

```bash
python render_demo.py
```

### GPU Setup (optional, requires NVIDIA GPU)

```bash
pip install -r requirements-gpu.txt
pip install diffusers transformers accelerate
```

---

## 5. Where to Start Adding Features

### New Tool (Provider)
1. Create Python file in `tools/` subdirectory (e.g., `tools/video/`, `tools/audio/`, `tools/graphics/`)
2. Inherit from `BaseTool` (see `tools/base_tool.py`)
3. Implement `execute(params_dict)` returning `ToolResult`
4. Set all contract fields (name, version, tier, capability, provider, supports, fallback_tools, agent_skills)
5. Registry auto-discovers it — no manual registration needed
6. Optional: Add Layer 3 skill in `.agents/skills/`

### New Pipeline
1. Create YAML manifest in `pipeline_defs/` (validate against `schemas/pipelines/pipeline_manifest.schema.json`)
2. Create stage director skills in `skills/pipelines/<pipeline-name>/` (7 skills: idea through publish)
3. Reference meta skills (reviewer, checkpoint-protocol) in the manifest
4. Add contract tests in `tests/contracts/`

### New Skill / Knowledge
- Layer 2 (project conventions): `skills/`
- Layer 3 (generic technology knowledge): `.agents/skills/`

---

## 6. Architecture: Three-Layer Knowledge System

```
Layer 1: tools/ + pipeline_defs/     → "What exists" — executable capabilities + orchestration
Layer 2: skills/                     → "How to use it" — OpenMontage conventions and quality bars
Layer 3: .agents/skills/             → "How it works" — external technology knowledge packs
```

Reading order:
1. Registry / tool contract — discover what's available
2. Relevant pipeline or creative skill (Layer 2) — know HOW to use it in this context
3. Underlying vendor skill (Layer 3) — **mandatory before calling any generation tool**

---

## 7. Key Patterns

- **Pipeline state machine:** `idea → script → scene_plan → assets → edit → compose → publish`
- **Instruction-driven stages:** Each stage has a director skill (MD) that teaches the agent HOW
- **Selector pattern:** `tts_selector`, `image_selector`, `video_selector` auto-discover providers from registry
- **Tool classes:** PascalCase without "Tool" suffix (e.g., `MusicGen`, `VideoCompose`)
- **All tools inherit `BaseTool`** and call via `.execute(params_dict)` returning `ToolResult`
- **Style playbooks:** YAML defining visual language, typography, motion, audio
- **Canonical artifacts:** `brief`, `script`, `scene_plan`, `asset_manifest`, `edit_decisions`, `render_report`
- **Three composition runtimes:** FFmpeg (always), Remotion (React/Node.js), HyperFrames (HTML/GSAP)
- **Projects stored under** `projects/<kebab-case-name>/` with artifacts/, assets/, renders/

---

## 8. Available Tools (52 total)

### Video Generation (13 providers)
Kling, Runway Gen-4, Google Veo 3, Grok, Higgsfield, MiniMax, HeyGen, WAN 2.1 (local), Hunyuan (local), CogVideo (local), LTX-Video (local/Modal), Pexels, Pixabay, Wikimedia Commons

### Image Generation (10 providers)
FLUX, Google Imagen, Grok, DALL-E 3, Recraft, Local Diffusion, Pexels, Pixabay, Unsplash, ManimCE

### Text-to-Speech (4 providers)
ElevenLabs, Google TTS (700+ voices), OpenAI TTS, Piper (free offline)

### Music & Sound
Suno AI, ElevenLabs Music, ElevenLabs SFX

### Post-Production (always free)
FFmpeg, Video Stitch, Video Trimmer, Audio Mixer, Audio Enhance, Color Grade, Subtitle Gen

### Enhancement
Upscale, Background Remove, Face Enhance, Face Restore

### Analysis
Transcriber (WhisperX), Scene Detect, Frame Sampler, Video Understand

### Avatar
Talking Head (SadTalker/MuseTalk), Lip Sync (Wav2Lip)

---

## 9. Directory Structure

```
OpenMontage-video/
├── tools/                  # 52 Python tools (the agent's hands)
│   ├── video/              # Video gen + compose, stitch, trim
│   ├── audio/              # TTS, music, mixing, enhancement
│   ├── graphics/           # Image/graphics generation + diagrams
│   ├── enhancement/        # Upscale, bg remove, face enhance
│   ├── analysis/           # Transcription, scene detect, frame sampling
│   ├── avatar/             # Talking head, lip sync
│   └── subtitle/           # SRT/VTT generation
├── pipeline_defs/          # 13 YAML pipeline manifests
├── skills/                 # Markdown skill files (the agent's knowledge)
│   ├── pipelines/          # Per-pipeline stage director skills
│   ├── creative/           # Creative technique skills
│   ├── core/               # Core tool skills
│   └── meta/               # Reviewer, checkpoint protocol
├── schemas/                # JSON Schemas (contract validation)
├── styles/                 # Visual style playbooks (YAML)
├── remotion-composer/      # React/Remotion video composition engine
├── lib/                    # Core infrastructure (config, checkpoints, pipeline loader)
├── tests/                  # Contract tests, QA, eval harness
├── AGENT_GUIDE.md          # Agent operating guide (read first)
├── PROJECT_CONTEXT.md      # Architecture reference
├── config.yaml             # Global configuration
├── Makefile                # Build commands
└── setup.py                # Python package setup
```

---

## 10. Tool System Deep Dive

### BaseTool Contract

All tools inherit from `BaseTool` (ABC) and declare:

| Field | Purpose |
|-------|---------|
| `name`, `version` | Identity |
| `tier` | CORE, VOICE, ENHANCE, GENERATE, SOURCE, ANALYZE, PUBLISH |
| `capability` | What it does (e.g., `tts`, `image_generation`, `video_post`) |
| `provider` | Which service (e.g., `elevenlabs`, `ffmpeg`, `selector`) |
| `runtime` | LOCAL, LOCAL_GPU, API, HYBRID |
| `stability` | EXPERIMENTAL, BETA, PRODUCTION |
| `dependencies` | Required binaries (`cmd:ffmpeg`), env vars (`env:ELEVENLABS_API_KEY`), Python packages (`python:torch`) |
| `input_schema`, `output_schema` | JSON Schema for inputs/outputs |
| `fallback_tools` | Ordered fallback chain |
| `agent_skills` | Links to Layer 3 knowledge skills |
| `resource_profile` | CPU, RAM, VRAM, disk, network requirements |
| `retry_policy` | Max retries, backoff strategy |

**Required method:** `execute(inputs) -> ToolResult`

`ToolResult` carries: `success`, `data`, `artifacts` (file paths), `error`, `cost_usd`, `duration_seconds`, `seed`, `model`.

### Tool Registry

`ToolRegistry` is a singleton that auto-discovers all `BaseTool` subclasses via `pkgutil.walk_packages()`. No manual registration.

Key queries:
- `get_by_capability("tts")` — all TTS tools
- `get_by_provider("elevenlabs")` — all ElevenLabs tools
- `get_available()` — tools whose dependencies are satisfied
- `find_fallback("elevenlabs_tts")` — resolve fallback chain
- `support_envelope()` — full capability report for agent consumption
- `gpu_required_tools()`, `network_required_tools()`

### Selector Pattern (Auto-Discovery)

Three selector tools abstract multi-provider capabilities:

| Selector | Capability | How selection works |
|----------|-----------|---------------------|
| `tts_selector` | Text-to-speech | Ranks by task fit, quality, control, reliability, cost, latency, continuity |
| `image_selector` | Image generation | Ranks from live registry; no hardcoded provider order |
| `video_selector` | Video generation | Ranks from live registry; user preference respected |

Adding a new provider tool automatically makes it available through the selector — no selector code changes needed.

### Tool Inventory by Category (57+ tools)

**Analysis (4):** transcriber (WhisperX), scene_detect, frame_sampler, video_understand (CLIP/BLIP-2)

**Audio (8):** elevenlabs_tts, google_tts, openai_tts, piper_tts, tts_selector, music_gen, audio_mixer, audio_enhance

**Avatar (2):** talking_head (SadTalker/MuseTalk), lip_sync (Wav2Lip)

**Enhancement (5):** upscale (Real-ESRGAN), bg_remove (rembg/U2Net), face_enhance, face_restore (CodeFormer/GFPGAN), color_grade (FFmpeg LUTs)

**Graphics (13):** flux_image, grok_image, google_imagen, openai_image, recraft_image, local_diffusion, pexels_image, pixabay_image, image_selector, code_snippet, diagram_gen, math_animate (ManimCE), image_gen (deprecated)

**Subtitle (1):** subtitle_gen

**Video (18):** grok_video, heygen_video, higgsfield_video, veo_video, kling_video, runway_video, minimax_video, wan_video, hunyuan_video, cogvideo_video, ltx_video_local, ltx_video_modal, pexels_video, pixabay_video, video_selector, video_compose (FFmpeg), video_stitch, video_trimmer

---

## 11. Pipeline System Deep Dive

### Pipeline Manifest Structure (YAML)

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
  # ... through publish
```

### Standard Stage Progression (8 stages)

```
research → proposal → script → scene_plan → assets → edit → compose → publish
```

Each stage:
1. Has a **stage-director skill** (Markdown instructions for the agent)
2. Declares **tools_available** (what the agent can call)
3. **Produces** one or more canonical artifacts
4. Has **review_focus** criteria and **success_criteria**
5. Can require **human approval** before proceeding

### Pipeline → Stage Director Skills Mapping

| Pipeline | Stages | Has Executive Producer |
|----------|--------|----------------------|
| animated-explainer | research, proposal, script, scene_plan, assets, edit, compose, publish | Yes |
| animation | research, proposal, script, scene_plan, assets, edit, compose, publish | Yes |
| talking-head | idea, script, scene_plan, assets, edit, compose, publish | No |
| screen-demo | idea, script, scene_plan, assets, edit, compose, publish | Yes |
| clip-factory | idea, script, scene_plan, assets, edit, compose, publish | Yes |
| podcast-repurpose | idea, script, scene_plan, assets, edit, compose, publish | Yes |
| cinematic | idea, script, scene_plan, assets, edit, compose, publish | Yes |
| hybrid | idea, script, scene_plan, assets, edit, compose, publish | Yes |
| avatar-spokesperson | idea, script, scene_plan, assets, edit, compose, publish | Yes |
| localization-dub | idea, script, scene_plan, assets, edit, compose, publish | Yes |
| character-animation | idea, script, character_design, rig_plan, scene_plan, assets, edit, compose | No |
| documentary-montage | idea, script, scene_plan, assets, edit, compose | No |

---

## 12. Canonical Artifacts (11 types, JSON-schema validated)

| Artifact | Stage | Contains |
|----------|-------|----------|
| `research_brief` | research | Landscape analysis, data points, audience insights, angles |
| `proposal_packet` | proposal | Concept options, production plan, cost estimates, approval gate |
| `brief` | idea | Title, hook, key points, tone, style, platform, duration |
| `script` | script | Timestamped sections with enhancement cues, pronunciation guides |
| `scene_plan` | scene_plan | Scene definitions with type, description, timing |
| `asset_manifest` | assets | Generated assets with path, source tool, scene association |
| `edit_decisions` | edit | Editorial cuts with in/out timings |
| `render_report` | compose | Output metadata (format, resolution, duration) |
| `publish_log` | publish | Platform publication entries with status |
| `review` | (any) | Reviewer feedback and approval records |
| `cost_log` | (any) | Budget tracking entries |

---

## 13. Budget Governance

### Lifecycle

```
estimate(tool, operation, $) → entry_id
        |
reserve(entry_id)          # locks budget
        |
reconcile(entry_id, $)     # records actual spend
```

### Budget Modes (config.yaml)

| Mode | Behavior |
|------|----------|
| `observe` | Track costs, no enforcement |
| `warn` | Log warnings on overruns, allow execution |
| `cap` | Reject operations that exceed remaining budget |

### Controls
- **Total budget:** $10.00 (default)
- **Reserve holdback:** 10% — kept as safety margin
- **Single-action approval threshold:** $0.50 — pause for approval above this
- **New paid tool approval:** first-time use of any paid tool requires confirmation
- Persists to `cost_log.json` per project

---

## 14. Configuration (config.yaml)

```yaml
llm:
  provider: anthropic            # anthropic | openai | gemini | openrouter | ollama | mistral | minimax
  model: null                    # null = use provider default
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

### Environment Variables (.env)

| Variable | Used By | Purpose |
|----------|---------|---------|
| `ELEVENLABS_API_KEY` | elevenlabs_tts, music_gen | TTS, music, sound effects |
| `OPENAI_API_KEY` | openai_tts, openai_image | TTS fallback, DALL-E 3 |
| `XAI_API_KEY` | grok_image, grok_video | Grok image/video generation |
| `FAL_KEY` | flux_image, kling_video, veo_video, minimax_video, recraft_image | fal.ai hosted models |
| `HEYGEN_API_KEY` | heygen_video | Multi-provider video generation |
| `PEXELS_API_KEY` | pexels_image, pexels_video | Stock media |
| `PIXABAY_API_KEY` | pixabay_image, pixabay_video | Stock media |
| `GOOGLE_API_KEY` | google_imagen, google_tts | Google Imagen images, Google Cloud TTS |
| `RUNWAY_API_KEY` | runway_video | Runway Gen-3/Gen-4 direct |
| `HIGGSFIELD_API_KEY` + `HIGGSFIELD_API_SECRET` | higgsfield_video | Higgsfield multi-model video |
| `MODAL_LTX2_ENDPOINT_URL` | ltx_video_modal | Self-hosted LTX-2 |
| `VIDEO_GEN_LOCAL_ENABLED` | local video tools | Enable local GPU generation |
| `VIDEO_GEN_LOCAL_MODEL` | wan, hunyuan, ltx, cogvideo | Select local model |

---

## 15. Skills Index (Layer 2)

### Core Skills (6)

| Skill | File | Trigger |
|-------|------|---------|
| FFmpeg | `core/ffmpeg.md` | Video encoding, filtering, composition |
| Remotion | `core/remotion.md` | React-based composition |
| HyperFrames | `core/hyperframes.md` | HTML/CSS/GSAP composition |
| WhisperX | `core/whisperx.md` | Transcription with word-level timestamps |
| Subtitle Sync | `core/subtitle-sync.md` | Subtitle timing and alignment |
| Color Grading | `core/color-grading.md` | FFmpeg color profiles, LUT workflow |

### Creative Skills (28)

| Skill | File | Trigger |
|-------|------|---------|
| Video Editing | `creative/video-editing.md` | Cut decisions, pacing, rhythm |
| Enhancement Strategy | `creative/enhancement-strategy.md` | Overlay placement and density |
| Data Visualization | `creative/data-visualization.md` | Chart type selection, animation |
| Video Stitching | `creative/video-stitching.md` | Multi-clip assembly, spatial composition |
| Video Gen Prompting | `creative/video-gen-prompting.md` | Universal video generation prompt vocabulary |
| Seedance Prompting | `creative/prompting/seedance-prompting.md` | Seedance 2.0 preferred premium default |
| Grok Prompting | `creative/prompting/grok-prompting.md` | Grok image/video prompting |
| Sora Prompting | `creative/prompting/sora-prompting.md` | Sora 2 structured template |
| VEO Prompting | `creative/prompting/veo-prompting.md` | VEO 3.1 14-component structure |
| LTX Prompting | `creative/prompting/ltx-prompting.md` | LTX-2 6-element structure |
| HunyuanVideo Prompting | `creative/prompting/hunyuan-prompting.md` | HunyuanVideo formula |
| Storytelling | `creative/storytelling.md` | Narrative structure, hooks, pacing |
| Sound Design | `creative/sound-design.md` | Audio ducking, LUFS targets, SFX timing |
| Typography | `creative/typography.md` | Font selection, text sizing, safe zones |
| ManimCE Usage | `creative/manim-usage.md` | Scene composition, animation timing |
| Image Gen Usage | `creative/image-gen-usage.md` | Prompt consistency, batch strategy |
| Image Provider Usage | `creative/image-provider-usage.md` | Provider selection, cost-quality tradeoffs |
| B-Roll Planning | `creative/broll-planning.md` | Stock vs. generated decision |
| Stock Sourcing | `creative/stock-sourcing-usage.md` | Pexels/Pixabay usage |
| Scene Detect | `creative/scene-detect-usage.md` | Threshold tuning, algorithm selection |
| Diagram Gen | `creative/diagram-gen-usage.md` | Complexity limits, progressive building |
| Music Gen | `creative/music-gen-usage.md` | BPM selection, prompt engineering |
| BG Removal | `creative/bg-remove-usage.md` | Model selection, alpha matting |
| Upscaling | `creative/upscale-usage.md` | Scale factor, model selection |
| Face Restore | `creative/face-restore-usage.md` | CodeFormer/GFPGAN selection |
| Lip Sync | `creative/lip-sync-usage.md` | Wav2Lip model selection |
| Talking Head | `creative/talking-head-gen-usage.md` | SadTalker/MuseTalk |
| Video Understanding | `creative/video-understand-usage.md` | Visual QA, quality gating |

### Meta Skills (4)

| Skill | File | Purpose |
|-------|------|---------|
| Onboarding | `meta/onboarding.md` | First-interaction greeting, capability discovery |
| Reviewer | `meta/reviewer.md` | Self-review protocol after every stage |
| Checkpoint Protocol | `meta/checkpoint-protocol.md` | When/how to checkpoint and request human approval |
| Skill Creator | `meta/skill-creator.md` | Dynamically create new skills during pipeline runs |

### Style Playbooks (3)

| Playbook | Category | Mood | Best For |
|----------|----------|------|----------|
| `clean-professional` | motion-graphics | polished, trustworthy | Corporate, educational, SaaS |
| `flat-motion-graphics` | motion-graphics | energetic, bold | Social media, TikTok, startups |
| `minimalist-diagram` | whiteboard | focused, technical | Technical deep-dives, architecture |

---

## 16. Composition Runtimes

| Engine | Used For | Requires |
|--------|----------|----------|
| **FFmpeg** | Video-only cuts, concat, trim, subtitle burn | `ffmpeg` binary (always available) |
| **Remotion** | React-based composition: animated scenes, text cards, charts, transitions with spring physics, word-level captions, TalkingHead avatar | Node.js (`npx`) + `remotion-composer/` + `node_modules` |
| **HyperFrames** | HTML/CSS/GSAP composition: kinetic typography, product promos, launch reels, website-to-video, registry blocks, SVG character rigs | Node.js ≥ 22 + FFmpeg + `npx` |

Runtime is chosen at proposal (`render_runtime`) and locked through `edit_decisions`. Silent swaps forbidden.

---

## 17. Test Architecture

```
tests/
├── contracts/              # Tool contract validation, schema checks, registry tests
├── qa/                     # Integration tests: TTS, image gen, music, audio mix, video compose/stitch, E2E
├── eval/                   # Golden scenario replay harness for regression testing
├── pipelines/              # Pipeline-level tests
├── tools/                  # Individual tool tests
└── styles/                 # Style playbook tests
```

- **Contract tests:** verify every tool satisfies `BaseTool` contract (identity, schemas, dependencies, inheritance)
- **QA tests:** call real tools with real APIs/binaries and inspect output quality
- **Eval harness:** replays golden scenarios with tolerance-based comparison for stochastic outputs

---

## 18. Key Design Decisions

1. **No runtime orchestrator** — The LLM agent reads YAML + Markdown and drives everything. Debuggable (just read the skill) and model-agnostic.

2. **No LLM API key in runtime** — OpenMontage doesn't call LLM APIs. The coding assistant IS the LLM. Tools call domain-specific APIs (ElevenLabs, fal.ai, etc.).

3. **Checkpoint-based resumption** — Any stage can fail and the pipeline resumes from the last checkpoint. No re-running completed stages.

4. **Schema-validated artifacts** — Every stage output validated against JSON Schema before checkpoint is written. Prevents garbage propagation.

5. **Budget as a first-class concept** — Cost estimation before execution, budget reservation, and reconciliation. Agent cannot silently overspend.

6. **Selector pattern over hard-coded providers** — Capabilities degrade gracefully. Missing API key? Selector falls through to next provider or local alternative.

7. **Skills over code for intelligence** — Creative decisions, quality checklists, review criteria, and prompt templates live in Markdown skills, not Python. Behavior tuned by editing text files, not code.

8. **Dual-provider support** — Every capability supports both API providers (cloud, paid) and local/open-source alternatives (free, GPU-dependent).

---

## 19. Layer 3 Skills (Installed Agent Skills)

| Category | Installed Skills |
|----------|-----------------|
| **Video Composition** | `remotion-best-practices`, `remotion`, `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `website-to-hyperframes` |
| **Video Processing** | `ffmpeg`, `video_toolkit` |
| **TTS & Audio** | `text-to-speech`, `speech-to-text`, `music`, `sound-effects`, `elevenlabs`, `agents`, `setup-api-key` |
| **Image Generation** | `flux-best-practices`, `bfl-api`, `grok-media` |
| **Math Animation** | `manimce-best-practices`, `manimgl-best-practices`, `manim-composer` |
| **3D Graphics** | `threejs-animation`, `threejs-fundamentals`, `threejs-geometry`, `threejs-interaction`, `threejs-lighting`, `threejs-loaders`, `threejs-materials`, `threejs-postprocessing`, `threejs-shaders`, `threejs-textures` |
| **Diagrams** | `beautiful-mermaid`, `d3-viz` |
| **Animation** | `framer-motion`, `lottie-bodymovin` |
| **Design** | `tailwind-design-system`, `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns` |
| **AI Video** | `heygen`, `avatar-video`, `create-video`, `faceswap`, `ai-video-gen`, `video-download`, `video-edit`, `video-translate`, `video-understand`, `visual-style` |
| **AI Video (Premium)** | `seedance-2-0` (preferred premium default) |
| **Infrastructure** | `acestep`, `ltx2`, `playwright-recording` |
