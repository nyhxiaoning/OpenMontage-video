# OpenMontage - 常用工具使用示例（中文版）

_面向中文开发者的工具使用速查手册。创建日期：2026-06-21_

---

## 目录

1. [基础：工具发现与注册](#1-基础工具发现与注册)
2. [工具调用模式](#2-工具调用模式)
3. [TTS 语音合成示例](#3-tts-语音合成示例)
4. [图像生成示例](#4-图像生成示例)
5. [视频生成示例](#5-视频生成示例)
6. [音频混音示例](#6-音频混音示例)
7. [视频拼接示例](#7-视频拼接示例)
8. [字幕生成示例](#8-字幕生成示例)
9. [场景检测示例](#9-场景检测示例)
10. [视频合成示例](#10-视频合成示例)
11. [Selector 自动路由示例](#11-selector-自动路由示例)
12. [增强工具示例](#12-增强工具示例)
13. [素材搜索示例](#13-素材搜索示例)
14. [完整工作流示例](#14-完整工作流示例)

---

## 1. 基础：工具发现与注册

所有工具通过 Registry 自动发现，无需手动注册。

```python
from tools.tool_registry import registry
import json

# 发现所有工具
registry.discover()

# 查看完整能力报告（人类可读）
print(json.dumps(registry.provider_menu_summary(), indent=2))

# 按能力查询（如所有 TTS 工具）
tts_tools = registry.get_by_capability("tts")
for tool in tts_tools:
    print(f"  {tool.name} ({tool.provider}) - {tool.get_status().value}")

# 按 Provider 查询（如所有 ElevenLabs 工具）
eleven_tools = registry.get_by_provider("elevenlabs")
for tool in eleven_tools:
    print(f"  {tool.name} - {tool.get_status().value}")

# 获取所有可用工具（依赖已满足）
available = registry.get_available()

# 查看完整能力目录
print(json.dumps(registry.capability_catalog(), indent=2))

# 查看完整 Provider 目录
print(json.dumps(registry.provider_catalog(), indent=2))
```

### 查看单个工具信息

```python
from tools.tool_registry import registry
registry.discover()

# 获取工具详细信息
info = registry._tools['flux_image'].get_info()
print(f"名称: {info['name']}")
print(f"能力: {info['capability']}")
print(f"Provider: {info['provider']}")
print(f"运行时: {info['runtime']}")
print(f"状态: {info['status']}")
print(f"依赖: {info['dependencies']}")
print(f"降级链: {info['fallback_tools']}")
print(f"推荐场景: {info['best_for']}")
```

---

## 2. 工具调用模式

所有工具统一通过 `.execute(params_dict)` 调用，返回 `ToolResult`。

```python
from tools.base_tool import ToolResult

# 通用调用模式
result: ToolResult = tool.execute({
    "param1": "value1",
    "param2": "value2",
})

# 检查结果
if result.success:
    print(f"成功! 耗时: {result.duration_seconds:.1f}s")
    print(f"花费: ${result.cost_usd:.4f}")
    print(f"输出文件: {result.artifacts}")
    print(f"数据: {result.data}")
else:
    print(f"失败: {result.error}")
```

### ToolResult 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | bool | 是否成功 |
| `data` | dict | 输出数据（如时间戳、元数据） |
| `artifacts` | list[str] | 生成的文件路径列表 |
| `error` | str | 失败时的错误信息 |
| `cost_usd` | float | 本次调用花费（美元） |
| `duration_seconds` | float | 执行耗时（秒） |
| `seed` | int | 随机种子（可复现） |
| `model` | str | 使用的模型名称 |

---

## 3. TTS 语音合成示例

### ElevenLabs TTS

```python
from tools.audio.elevenlabs_tts import ElevenLabsTTS

tts = ElevenLabsTTS()

# 基础调用
result = tts.execute({
    "text": "欢迎来到 OpenMontage，这是一个 AI 驱动的视频制作平台。",
    "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel
    "output_path": "projects/my-video/assets/audio/narration.mp3",
})

if result.success:
    print(f"音频文件: {result.artifacts[0]}")
    print(f"花费: ${result.cost_usd:.4f}")
```

### Google TTS

```python
from tools.audio.google_tts import GoogleTTS

tts = GoogleTTS()

result = tts.execute({
    "text": "OpenMontage supports over 700 voices in 50+ languages.",
    "voice_name": "en-US-Neural2-F",
    "language_code": "en-US",
    "output_path": "projects/my-video/assets/audio/narration.mp3",
})
```

### Piper TTS（免费离线）

```python
from tools.audio.piper_tts import PiperTTS

tts = PiperTTS()

result = tts.execute({
    "text": "This is a free offline text-to-speech voice.",
    "voice": "en_US-lessac-medium",
    "output_path": "projects/my-video/assets/audio/narration.wav",
})
# 无需 API key，完全免费
```

---

## 4. 图像生成示例

### FLUX 图像生成

```python
from tools.graphics.flux_image import FluxImage

gen = FluxImage()

result = gen.execute({
    "prompt": "A serene Japanese garden at sunset, cherry blossoms falling, 4K cinematic",
    "negative_prompt": "blurry, low quality, text",
    "width": 1920,
    "height": 1080,
    "model": "flux-pro/v1.1",
    "seed": 42,
    "output_path": "projects/my-video/assets/images/scene-01.png",
})

if result.success:
    print(f"图像: {result.artifacts[0]}")
    print(f"种子: {result.seed}")
    print(f"花费: ${result.cost_usd:.4f}")
```

### OpenAI DALL-E 3

```python
from tools.graphics.openai_image import OpenAIImage

gen = OpenAIImage()

result = gen.execute({
    "prompt": "A futuristic city skyline at night, cyberpunk style, neon lights",
    "size": "1792x1024",
    "quality": "hd",
    "output_path": "projects/my-video/assets/images/scene-02.png",
})
```

### Pexels 免费素材图

```python
from tools.graphics.pexels_image import PexelsImage

search = PexelsImage()

result = search.execute({
    "query": "ocean waves sunset",
    "per_page": 5,
    "orientation": "landscape",
    "output_dir": "projects/my-video/assets/images/",
})
# 免费，需 PEXELS_API_KEY
```

---

## 5. 视频生成示例

### Kling 视频生成

```python
from tools.video.kling_video import KlingVideo

gen = KlingVideo()

result = gen.execute({
    "prompt": "A cinematic drone shot flying over a misty mountain range at dawn",
    "aspect_ratio": "16:9",
    "duration": "5",
    "model": "kling-v2",
    "output_path": "projects/my-video/assets/video/scene-01.mp4",
})

if result.success:
    print(f"视频: {result.artifacts[0]}")
    print(f"花费: ${result.cost_usd:.4f}")
```

### WAN 2.1 本地 GPU 视频

```python
from tools.video.wan_video import WanVideo

gen = WanVideo()

result = gen.execute({
    "prompt": "A cat playing with a ball of yarn in slow motion",
    "model": "wan2.1-1.3b",  # 或 wan2.1-14b
    "num_frames": 81,
    "output_path": "projects/my-video/assets/video/scene-02.mp4",
})
# 免费，需要 GPU
```

### Seedance 2.0（首选高端）

```python
from tools.video.seedance_video import SeedanceVideo

gen = SeedanceVideo()

result = gen.execute({
    "prompt": "Cinematic slow motion of a whale breaching the ocean surface, golden hour lighting",
    "aspect_ratio": "16:9",
    "duration": 5,
    "output_path": "projects/my-video/assets/video/hero-shot.mp4",
})
```

---

## 6. 音频混音示例

### 基础混音（旁白 + 背景音乐 + 闪避）

```python
from tools.audio.audio_mixer import AudioMixer

mixer = AudioMixer()

# 方式一：full_mix 一键混音（推荐）
result = mixer.execute({
    "operation": "full_mix",
    "tracks": [
        {
            "path": "projects/my-video/assets/audio/narration.mp3",
            "role": "speech",
        },
        {
            "path": "projects/my-video/assets/music/background.mp3",
            "role": "music",
            "volume": 0.3,
        },
    ],
    "output_path": "projects/my-video/assets/audio/final-mix.mp3",
})

# 方式二：duck 操作（音乐在说话时自动降低）
result = mixer.execute({
    "operation": "duck",
    "primary_audio": "projects/my-video/assets/audio/narration.mp3",
    "secondary_audio": "projects/my-video/assets/music/background.mp3",
    "duck_amount": 0.25,
    "output_path": "projects/my-video/assets/audio/final-mix.mp3",
})
```

### 分段音乐混音

```python
# 音乐仅在特定时间段播放
result = mixer.execute({
    "operation": "segmented_music",
    "speech_path": "projects/my-video/assets/audio/narration.mp3",
    "music_path": "projects/my-video/assets/music/background.mp3",
    "segments": [
        {"start": 0, "end": 15, "music_volume": 0.3},
        {"start": 15, "end": 30, "music_volume": 0},  # 静音
        {"start": 30, "end": 60, "music_volume": 0.3},
    ],
    "output_path": "projects/my-video/assets/audio/final-mix.mp3",
})
```

---

## 7. 视频拼接示例

### 顺序拼接

```python
from tools.video.video_stitch import VideoStitch

stitch = VideoStitch()

result = stitch.execute({
    "operation": "stitch",
    "clips": [
        "projects/my-video/assets/video/scene-01.mp4",
        "projects/my-video/assets/video/scene-02.mp4",
        "projects/my-video/assets/video/scene-03.mp4",
    ],
    "transition": "cut",  # cut | crossfade | fade
    "output_path": "projects/my-video/renders/stitched.mp4",
})
```

### 交叉淡化拼接

```python
result = stitch.execute({
    "operation": "stitch",
    "clips": [
        "projects/my-video/assets/video/scene-01.mp4",
        "projects/my-video/assets/video/scene-02.mp4",
    ],
    "transition": "crossfade",
    "transition_duration": 0.5,  # 0.5 秒交叉淡化
    "output_path": "projects/my-video/renders/crossfade.mp4",
})
```

### 空间合成（画中画、并排）

```python
# 并排显示
result = stitch.execute({
    "operation": "spatial",
    "layout": "side_by_side",
    "clips": [
        "projects/my-video/assets/video/left.mp4",
        "projects/my-video/assets/video/right.mp4",
    ],
    "output_path": "projects/my-video/renders/side-by-side.mp4",
})

# 画中画
result = stitch.execute({
    "operation": "spatial",
    "layout": "picture_in_picture",
    "clips": [
        "projects/my-video/assets/video/main.mp4",
        "projects/my-video/assets/video/pip.mp4",
    ],
    "pip_position": "bottom_right",
    "pip_scale": 0.3,
    "output_path": "projects/my-video/renders/pip.mp4",
})
```

---

## 8. 字幕生成示例

### SRT 字幕

```python
from tools.subtitle.subtitle_gen import SubtitleGen

sub = SubtitleGen()

# 从转录结果生成字幕
result = sub.execute({
    "segments": [
        {
            "start": 0.0,
            "end": 2.5,
            "text": "Welcome to OpenMontage",
            "words": [
                {"word": "Welcome", "start": 0.0, "end": 0.5},
                {"word": "to", "start": 0.5, "end": 0.7},
                {"word": "OpenMontage", "start": 0.7, "end": 2.5},
            ],
        },
        {
            "start": 2.5,
            "end": 5.0,
            "text": "Your AI video production platform",
            "words": [
                {"word": "Your", "start": 2.5, "end": 2.8},
                {"word": "AI", "start": 2.8, "end": 3.2},
                {"word": "video", "start": 3.2, "end": 3.6},
                {"word": "production", "start": 3.6, "end": 4.3},
                {"word": "platform", "start": 4.3, "end": 5.0},
            ],
        },
    ],
    "format": "srt",  # srt | vtt | json
    "output_path": "projects/my-video/assets/subtitles.srt",
    "max_chars_per_line": 42,
    "highlight_style": "word_by_word",  # 逐字高亮
})

if result.success:
    print(f"字幕文件: {result.artifacts[0]}")
```

### VTT 字幕（带校正）

```python
result = sub.execute({
    "segments": [...],  # 转录片段
    "format": "vtt",
    "output_path": "projects/my-video/assets/subtitles.vtt",
    "corrections": {
        "cloud": "Claude",
        "open montaj": "OpenMontage",
    },
})
```

---

## 9. 场景检测示例

### 基础场景检测

```python
from tools.analysis.scene_detect import SceneDetect

detect = SceneDetect()

result = detect.execute({
    "input_path": "projects/my-video/source/interview.mp4",
    "method": "content",  # content | threshold | adaptive
    "threshold": 27.0,
    "min_scene_length_seconds": 1.0,
    "output_path": "projects/my-video/artifacts/scenes.json",
})

if result.success:
    scenes = result.data.get("scenes", [])
    print(f"检测到 {len(scenes)} 个场景")
    for i, scene in enumerate(scenes):
        print(f"  场景 {i+1}: {scene['start_time']:.1f}s - {scene['end_time']:.1f}s")
```

### 自适应检测

```python
result = detect.execute({
    "input_path": "projects/my-video/source/interview.mp4",
    "method": "adaptive",
    "output_path": "projects/my-video/artifacts/scenes.json",
})
```

---

## 10. 视频合成示例

### FFmpeg 合成（基础剪切 + 音频 + 字幕）

```python
from tools.video.video_compose import VideoCompose

compose = VideoCompose()

result = compose.execute({
    "operation": "compose",
    "input_path": "projects/my-video/assets/video/stitched.mp4",
    "output_path": "projects/my-video/renders/final.mp4",
    "edit_decisions": {
        "render_runtime": "ffmpeg",
        "cuts": [
            {"source": "scene-01.mp4", "in": 0, "out": 5},
            {"source": "scene-02.mp4", "in": 0, "out": 8},
        ],
        "audio_track": "projects/my-video/assets/audio/final-mix.mp3",
        "subtitle_file": "projects/my-video/assets/subtitles.srt",
    },
})
```

### Remotion 合成（React 动画渲染）

```python
result = compose.execute({
    "operation": "remotion_render",
    "input_path": "projects/my-video/artifacts/scene_plan.json",
    "output_path": "projects/my-video/renders/final.mp4",
    "edit_decisions": {
        "render_runtime": "remotion",
        "composition": "MainComposition",
        "props": {
            "scenes": [
                {"type": "text_card", "title": "OpenMontage", "duration": 3},
                {"type": "stat_card", "label": "Tools", "value": "52+", "duration": 4},
                {"type": "hero_title", "title": "AI Video Production", "duration": 3},
            ],
            "background_music": "projects/my-video/assets/music/background.mp3",
            "subtitle_config": {
                "style": "tiktok",
                "position": "bottom",
            },
        },
    },
})
```

### 字幕烧录

```python
result = compose.execute({
    "operation": "burn_subtitles",
    "input_path": "projects/my-video/renders/final-no-sub.mp4",
    "subtitle_file": "projects/my-video/assets/subtitles.srt",
    "output_path": "projects/my-video/renders/final.mp4",
    "subtitle_style": "tiktok",  # tiktok | default | minimal
})
```

---

## 11. Selector 自动路由示例

Selector 自动发现所有可用 Provider 并选择最佳。

### TTS Selector

```python
from tools.audio.tts_selector import TTSSelector

selector = TTSSelector()

# 自动选择最佳 TTS Provider
result = selector.execute({
    "text": "Hello, welcome to OpenMontage!",
    "preferred_provider": "auto",  # 或 "elevenlabs"、"google"、"openai"、"piper"
    "output_path": "projects/my-video/assets/audio/narration.mp3",
})

if result.success:
    provider = result.data.get("selected_provider", "unknown")
    print(f"选择了 Provider: {provider}")
    print(f"音频: {result.artifacts[0]}")
```

### Image Selector

```python
from tools.graphics.image_selector import ImageSelector

selector = ImageSelector()

# 自动选择最佳图像 Provider
result = selector.execute({
    "prompt": "A futuristic city at night, cyberpunk style",
    "width": 1920,
    "height": 1080,
    "preferred_provider": "auto",
    "output_path": "projects/my-video/assets/images/scene-01.png",
})
```

### Video Selector

```python
from tools.video.video_selector import VideoSelector

selector = VideoSelector()

# 自动选择最佳视频 Provider
result = selector.execute({
    "prompt": "A drone shot over mountains at sunrise",
    "operation": "text_to_video",
    "aspect_ratio": "16:9",
    "duration": 5,
    "preferred_provider": "auto",
    "output_path": "projects/my-video/assets/video/scene-01.mp4",
})
```

---

## 12. 增强工具示例

### 超分辨率

```python
from tools.enhancement.upscale import Upscale

upscaler = Upscale()

result = upscaler.execute({
    "input_path": "projects/my-video/assets/images/low-res.png",
    "scale_factor": 2,  # 2x 或 4x
    "output_path": "projects/my-video/assets/images/high-res.png",
})
```

### 背景移除

```python
from tools.enhancement.bg_remove import BgRemove

 remover = BgRemove()

result = remover.execute({
    "input_path": "projects/my-video/assets/images/photo.jpg",
    "output_path": "projects/my-video/assets/images/photo-nobg.png",
})
```

### 调色

```python
from tools.enhancement.color_grade import ColorGrade

grade = ColorGrade()

result = grade.execute({
    "input_path": "projects/my-video/renders/final-raw.mp4",
    "lut": "cinematic_warm",  # 内置 LUT 名称
    "intensity": 0.7,
    "output_path": "projects/my-video/renders/final-graded.mp4",
})
```

---

## 13. 素材搜索示例

### CLIP 语义搜索

```python
from tools.video.clip_search import ClipSearch

search = ClipSearch()

result = search.execute({
    "query": "person walking in rain with umbrella",
    "corpus_dir": "projects/my-video/corpus/",
    "top_k": 10,
    "min_score": 0.25,
})

if result.success:
    clips = result.data.get("results", [])
    print(f"找到 {len(clips)} 个匹配片段")
    for clip in clips[:5]:
        print(f"  {clip['score']:.3f} - {clip['source']} @ {clip['start_time']:.1f}s")
```

### 素材库构建

```python
from tools.video.corpus_builder import CorpusBuilder

builder = CorpusBuilder()

# 从 Archive.org 构建素材库
result = builder.execute({
    "operation": "build",
    "sources": ["archive_org", "nasa", "wikimedia"],
    "query": "ocean waves",
    "max_clips": 50,
    "output_dir": "projects/my-video/corpus/",
})
```

---

## 14. 完整工作流示例

以下展示一个从零开始的完整视频制作流程：

```python
import json
from tools.tool_registry import registry
from tools.audio.tts_selector import TTSSelector
from tools.graphics.image_selector import ImageSelector
from tools.video.video_stitch import VideoStitch
from tools.audio.audio_mixer import AudioMixer
from tools.subtitle.subtitle_gen import SubtitleGen
from tools.video.video_compose import VideoCompose

# 0. 发现工具
registry.discover()

# 1. 生成旁白
tts = TTSSelector()
narration = tts.execute({
    "text": "量子计算利用量子力学原理，实现了超越经典计算机的运算能力。",
    "preferred_provider": "auto",
    "output_path": "projects/quantum-video/assets/audio/narration.mp3",
})
print(f"旁白: {narration.artifacts[0]}")

# 2. 生成图像（多个场景）
img = ImageSelector()
scenes = []
for i, prompt in enumerate([
    "Quantum computing chip, blue glow, futuristic",
    "Qubit superposition visualization, abstract art",
    "Quantum entanglement illustration, scientific",
]):
    result = img.execute({
        "prompt": prompt,
        "width": 1920,
        "height": 1080,
        "output_path": f"projects/quantum-video/assets/images/scene-{i+1:02d}.png",
    })
    scenes.append(result.artifacts[0])

# 3. 拼接视频（使用 FFmpeg Ken Burns）
compose = VideoCompose()
compose.execute({
    "operation": "render",
    "output_path": "projects/quantum-video/renders/final.mp4",
    "edit_decisions": {
        "render_runtime": "ffmpeg",
        "cuts": [
            {"source": s, "in": 0, "out": 5} for s in scenes
        ],
        "audio_track": narration.artifacts[0],
    },
    "asset_manifest": {
        "assets": {f"scene-{i+1:02d}": {"path": s} for i, s in enumerate(scenes)},
    },
})

# 4. 生成字幕
sub = SubtitleGen()
sub.execute({
    "segments": narration.data.get("segments", []),
    "format": "srt",
    "output_path": "projects/quantum-video/assets/subtitles.srt",
})

# 5. 混音（旁白 + 背景音乐）
mixer = AudioMixer()
mixer.execute({
    "operation": "duck",
    "primary_audio": narration.artifacts[0],
    "secondary_audio": "projects/quantum-video/assets/music/background.mp3",
    "duck_amount": 0.25,
    "output_path": "projects/quantum-video/assets/audio/final-mix.mp3",
})

print("视频制作完成!")
```

---

## 附录：工具依赖速查

| 依赖类型 | 前缀 | 示例 | 说明 |
|----------|------|------|------|
| 系统命令 | `cmd:` | `cmd:ffmpeg` | 需要系统安装的二进制 |
| 环境变量 | `env:` | `env:FAL_KEY` | 需要设置的 API key |
| Python 包 | `python:` | `python:torch` | 需要 pip 安装的包 |

```bash
# 检查工具是否可用
python -c "
from tools.tool_registry import registry
import json
registry.discover()
print(json.dumps(registry.provider_menu(), indent=2))
"

# 快速检查某个工具的状态
python -c "
from tools.video.kling_video import KlingVideo
t = KlingVideo()
print(f'{t.name}: {t.get_status().value}')
print(f'依赖: {t.dependencies}')
"
```
