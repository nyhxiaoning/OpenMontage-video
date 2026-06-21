import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Progress,
  Select,
  Button,
  Form,
  Input,
  Tag,
  Space,
  Typography,
  message,
  Collapse,
  Modal,
  Spin,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  ForwardOutlined,
  ApiOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  FallOutlined,
  FilterOutlined,
} from '@ant-design/icons'

import type { ModelCard, PipelineInfo, StatusResponse, ConfigCheckResult } from '@/services/configApi'
import { configApi } from '@/services/configApi'
import './styles.css'

const { Text, Title, Paragraph } = Typography
const { Panel } = Collapse

/* ============================================================
   Constants
   ============================================================ */

const CAPABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  video_generation:    { label: 'Video Generation',  icon: '🎬' },
  image_generation:    { label: 'Image Generation',  icon: '🖼️' },
  tts:                 { label: 'Text-to-Speech',    icon: '🔊' },
  music_generation:    { label: 'Music Generation',  icon: '🎵' },
  video_post:          { label: 'Video Composition', icon: '🎞️' },
  audio_processing:    { label: 'Audio Processing',  icon: '🎧' },
  enhancement:         { label: 'Enhancement',       icon: '✨' },
  analysis:            { label: 'Analysis',          icon: '🔍' },
  subtitle:            { label: 'Subtitles',         icon: '📝' },
  graphics:            { label: 'Graphics',          icon: '📊' },
  avatar:              { label: 'Avatar',            icon: '👤' },
  character_animation: { label: 'Char Animation',    icon: '🧸' },
  other:               { label: 'Other',             icon: '⚙️' },
}

const ENV_VAR_MAP: Record<string, string> = {
  fal: 'FAL_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  elevenlabs: 'ELEVENLABS_API_KEY',
  suno: 'SUNO_API_KEY',
  runway: 'RUNWAY_API_KEY',
  heygen: 'HEYGEN_API_KEY',
  pexels: 'PEXELS_API_KEY',
  pixabay: 'PIXABAY_API_KEY',
  doubao: 'DOUBAO_SPEECH_API_KEY',
  tongyi: 'TONGYI_API_KEY',
}

/* ============================================================
   Types
   ============================================================ */

type CapGroup = {
  key: string
  label: string
  icon: string
  models: ModelCard[]
}

/* ============================================================
   Component
   ============================================================ */

const ConfigDashboard: React.FC = () => {
  // ---- State ----
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [models, setModels] = useState<ModelCard[]>([])
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [pipelineDetail, setPipelineDetail] = useState<any>(null)
  const [checkResults, setCheckResults] = useState<ConfigCheckResult[]>([])
  const [checking, setChecking] = useState(false)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [activeCap, setActiveCap] = useState<string>('all')
  const [skipModalVisible, setSkipModalVisible] = useState(false)
  const [skipMode, setSkipMode] = useState('free_fallback')

  const [keyForm] = Form.useForm()

  /* ============================================================
     Data Fetching
     ============================================================ */

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, modelsRes, pipelinesRes] = await Promise.all([
        configApi.getStatus(),
        configApi.getModels(),
        configApi.getPipelines(),
      ])
      setStatus(statusRes)
      setModels(modelsRes)
      setPipelines(pipelinesRes)

      // Auto-select cinematic pipeline
      if (!selectedPipeline) {
        const cinematic = (pipelinesRes as PipelineInfo[]).find((p) => p.name === 'cinematic')
        if (cinematic) {
          setSelectedPipeline('cinematic')
        }
      }
    } catch (err: any) {
      message.error(`Failed to load config: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [selectedPipeline])

  const loadPipelineDetail = async (name: string) => {
    try {
      const detail = await configApi.getPipelineDetail(name)
      setPipelineDetail(detail)
    } catch (err: any) {
      message.error(`Failed to load pipeline: ${err.message}`)
    }
  }

  // Load pipeline detail when pipelines change
  useEffect(() => {
    if (selectedPipeline) {
      loadPipelineDetail(selectedPipeline)
    }
  }, [selectedPipeline, pipelines])

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ============================================================
     Derived Data
     ============================================================ */

  // Group models by capability
  const capGroups = useMemo<CapGroup[]>(() => {
    const groups: Record<string, ModelCard[]> = {}
    const sortedCaps = Object.keys(CAPABILITY_LABELS)

    for (const model of models) {
      const cap = model.capability || 'other'
      if (!groups[cap]) groups[cap] = []
      groups[cap].push(model)
    }

    const result: CapGroup[] = []
    for (const cap of sortedCaps) {
      if (groups[cap]?.length) {
        result.push({
          key: cap,
          label: CAPABILITY_LABELS[cap]?.label || cap,
          icon: CAPABILITY_LABELS[cap]?.icon || '⚙️',
          models: groups[cap],
        })
      }
    }

    // Add any unclassified
    for (const [cap, ms] of Object.entries(groups)) {
      if (!CAPABILITY_LABELS[cap] && ms.length) {
        result.push({ key: cap, label: cap, icon: '⚙️', models: ms })
      }
    }

    return result
  }, [models])

  // Set of tool names required by selected pipeline
  const pipelineToolSet = useMemo(() => {
    if (!pipelineDetail?.tools) return new Set<string>()
    return new Set(pipelineDetail.tools.map((t: any) => t.name))
  }, [pipelineDetail])

  // Count stats
  const stats = useMemo(() => {
    const configured = models.filter((m) => m.has_api_key).length
    const total = models.length
    const recommended = pipelineDetail?.tools?.filter((t: any) => t.has_api_key).length || 0
    const recommendedTotal = pipelineDetail?.tools?.length || 0
    return { configured, total, recommended, recommendedTotal }
  }, [models, pipelineDetail])

  // Filter models by active capability
  const visibleModels = useMemo(() => {
    if (activeCap === 'all') return models
    return models.filter((m) => m.capability === activeCap)
  }, [models, activeCap])

  /* ============================================================
     Handlers
     ============================================================ */

  const handlePipelineChange = (name: string) => {
    setSelectedPipeline(name)
    setActiveCap('all')
  }

  const handleConfigModel = async (modelName: string, values: { key: string; value: string }) => {
    setConfiguring(modelName)
    try {
      await configApi.configModel(modelName, values.key, values.value)
      message.success(`${modelName} configured successfully`)
      keyForm.resetFields()
      fetchAll()
    } catch (err: any) {
      message.error(`Failed to configure ${modelName}: ${err.message}`)
    } finally {
      setConfiguring(null)
    }
  }

  const handleDeleteConfig = async (modelName: string) => {
    try {
      await configApi.deleteModelConfig(modelName)
      message.success(`${modelName} configuration removed`)
      fetchAll()
    } catch (err: any) {
      message.error(`Failed to remove ${modelName}: ${err.message}`)
    }
  }

  const handleRunCheck = async () => {
    setChecking(true)
    try {
      const results = await configApi.runConfigCheck()
      setCheckResults(results)
      const missing = results.filter((r) => r.status !== 'ok')
      if (missing.length > 0) {
        message.warning(`${missing.length} tools need configuration`)
      } else {
        message.success('All tools configured and ready')
      }
    } catch (err: any) {
      message.error(`Check failed: ${err.message}`)
    } finally {
      setChecking(false)
    }
  }

  const handleSkipConfig = async (mode: string) => {
    setSkipMode(mode)
    setSkipModalVisible(true)
  }

  const confirmSkip = async () => {
    try {
      await configApi.skipConfig(skipMode)
      message.info('Proceeding with available models only')
      setSkipModalVisible(false)
    } catch (err: any) {
      message.error(err.message)
    }
  }

  const handleStartPipeline = () => {
    if (!selectedPipeline) {
      message.warning('Please select a pipeline first')
      return
    }
    Modal.confirm({
      title: 'Start Pipeline?',
      content: `Starting "${selectedPipeline}" pipeline. Make sure required models are configured.`,
      okText: 'Start',
      cancelText: 'Cancel',
      onOk: () => {
        message.info(`Pipeline "${selectedPipeline}" would start here`)
      },
    })
  }

  /* ============================================================
     Sub-components
     ============================================================ */

  const HealthTag = ({ model }: { model: ModelCard }) => {
    if (!model.has_api_key) {
      return <Tag icon={<CloseCircleOutlined />} color="error">No Key</Tag>
    }
    const status = model.health_status || 'unknown'
    const cfg: Record<string, { color: string; icon: any; text: string }> = {
      ok:          { color: 'success', icon: <CheckCircleOutlined />, text: 'Connected' },
      missing_key: { color: 'error',   icon: <CloseCircleOutlined />, text: 'Missing Key' },
      invalid_key: { color: 'error',   icon: <CloseCircleOutlined />, text: 'Invalid Key' },
      rate_limited:{ color: 'warning', icon: <ExclamationCircleOutlined />, text: 'Rate Limited' },
      error:       { color: 'error',   icon: <ExclamationCircleOutlined />, text: 'Error' },
      unknown:     { color: 'default', icon: <ExclamationCircleOutlined />, text: 'Checking...' },
    }
    const c = cfg[status] || cfg.unknown
    return (
      <Tag color={c.color as any} icon={c.icon} style={{ fontSize: 11 }}>
        {c.text}
      </Tag>
    )
  }

  const ConfigFormInline = ({ model }: { model: ModelCard }) => {
    const [expanded, setExpanded] = useState(false)
    const envVar = ENV_VAR_MAP[model.provider] || `${model.provider.toUpperCase()}_API_KEY`

    const handleSubmit = async (values: { apiKey: string }) => {
      handleConfigModel(model.name, { key: envVar, value: values.apiKey })
    }

    if (model.has_api_key && !expanded) {
      return (
        <Space size="small">
          <Button type="link" size="small" onClick={() => setExpanded(true)}>
            Update Key
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Remove API Key?',
                content: `This will remove the ${model.provider} API key.`,
                onOk: () => handleDeleteConfig(model.name),
              })
            }}
          >
            Remove
          </Button>
        </Space>
      )
    }

    return (
      <div className="config-form-inline">
        <Form layout="inline" onFinish={handleSubmit} size="small">
          <Form.Item
            name="apiKey"
            rules={[{ required: true, message: 'Enter API key' }]}
            style={{ marginBottom: 4, flex: 1 }}
          >
            <Input.Password
              placeholder={envVar}
              style={{ width: '100%', minWidth: 140 }}
              autoComplete="off"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 4 }}>
            <Button type="primary" htmlType="submit" size="small" loading={configuring === model.name}>
              Save
            </Button>
          </Form.Item>
        </Form>
        {model.install_instructions && (
          <div className="config-hint">
            Get key: {model.install_instructions.substring(0, 100)}
            {model.install_instructions.length > 100 ? '...' : ''}
          </div>
        )}
      </div>
    )
  }

  /* ============================================================
     Loading State
     ============================================================ */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" tip="Loading configuration..." />
      </div>
    )
  }

  /* ============================================================
     Render
     ============================================================ */

  const completionPct = status?.completion_pct || 0
  const configuredCount = status?.configured_providers?.length || 0
  const totalCount = status?.total_providers || 0

  return (
    <div className="config-dashboard">
      {/* ===== Top Header ===== */}
      <div className="config-header">
        <div className="config-header-left">
          <Title level={3} style={{ margin: 0 }}>
            <ApiOutlined /> Model Configuration
          </Title>
          <Text type="secondary">
            Manage API keys and providers for your video production pipeline
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAll}>
            Refresh
          </Button>
          <Button icon={<PlayCircleOutlined />} type="primary" onClick={handleStartPipeline}>
            Start Pipeline
          </Button>
        </Space>
      </div>

      {/* ===== Pipeline Selection Banner ===== */}
      <div className="pipeline-banner">
        <RocketOutlined className="pipeline-banner-icon" />
        <div className="pipeline-banner-info">
          <h3>Pipeline</h3>
          <p>
            {pipelineDetail
              ? `${pipelineDetail.configured_count}/${pipelineDetail.total_count} models configured for this pipeline`
              : 'Select a pipeline to see recommended models'}
          </p>
        </div>
        <div className="pipeline-select-wrapper">
          <Select
            style={{ width: '100%' }}
            placeholder="Select pipeline..."
            value={selectedPipeline || undefined}
            onChange={handlePipelineChange}
            options={pipelines.map((p) => ({
              value: p.name,
              label: `${p.name} (${p.stability})`,
            }))}
            size="middle"
          />
        </div>
      </div>

      {/* ===== Stats Row ===== */}
      <div className="config-stats">
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: completionPct === 100 ? '#52c41a' : '#faad14' }}>
            {configuredCount}<span style={{ color: '#bfbfbf', fontWeight: 400 }}>/{totalCount}</span>
          </div>
          <div className="stat-card-label">Providers Configured</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{pipelines.length}</div>
          <div className="stat-card-label">Pipelines Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: stats.recommended === stats.recommendedTotal ? '#52c41a' : '#faad14' }}>
            {stats.recommended}<span style={{ color: '#bfbfbf', fontWeight: 400 }}>/{stats.recommendedTotal}</span>
          </div>
          <div className="stat-card-label">Pipeline Models Ready</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#597ef7' }}>{Math.round(completionPct)}%</div>
          <div className="stat-card-label">Overall Completion</div>
        </div>
      </div>

      {/* ===== Progress Bar ===== */}
      <Card size="small" style={{ marginBottom: 20 }}>
        <Progress
          percent={Math.round(completionPct)}
          status={completionPct === 100 ? 'success' : 'active'}
          format={(pct) => (
            <span style={{ fontSize: 13 }}>
              {pct}% configured — {completionPct === 100
                ? 'All ready!'
                : `${totalCount - configuredCount} providers need API keys`}
            </span>
          )}
        />
      </Card>

      {/* ===== Main Content: Sidebar + Grid ===== */}
      <Card size="small" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="config-layout">
          {/* --- Capability Sidebar --- */}
          <div className="cap-sidebar">
            <div className="cap-sidebar-title">Capabilities</div>

            {/* "All" option */}
            <div
              className={`cap-sidebar-item ${activeCap === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCap('all')}
            >
              <Space>
                <FilterOutlined />
                <span>All Models</span>
              </Space>
              <span className="cap-sidebar-badge">{models.length}</span>
            </div>

            {/* Capability groups */}
            {capGroups.map((group) => {
              const readyCount = group.models.filter((m) => m.has_api_key).length
              return (
                <div
                  key={group.key}
                  className={`cap-sidebar-item ${activeCap === group.key ? 'active' : ''}`}
                  onClick={() => setActiveCap(group.key)}
                >
                  <Space>
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </Space>
                  <span className="cap-sidebar-badge">
                    {readyCount}/{group.models.length}
                  </span>
                </div>
              )
            })}
          </div>

          {/* --- Model Cards Area --- */}
          <div className="config-main">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong style={{ fontSize: 15 }}>
                  {activeCap === 'all'
                    ? 'All Models'
                    : `${CAPABILITY_LABELS[activeCap]?.icon || ''} ${CAPABILITY_LABELS[activeCap]?.label || activeCap}`}
                </Text>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {visibleModels.length} models
                </Text>
              </div>

              <Space>
                {checkResults.length > 0 && (
                  <Tag color={checkResults.filter((r) => r.status === 'ok').length === checkResults.length ? 'green' : 'orange'}>
                    Check: {checkResults.filter((r) => r.status === 'ok').length}/{checkResults.length}
                  </Tag>
                )}
                <Button size="small" onClick={handleRunCheck} loading={checking}>
                  Run Check
                </Button>
              </Space>
            </div>

            {/* Model cards */}
            {visibleModels.length === 0 ? (
              <div className="config-empty">
                <div className="config-empty-icon">📭</div>
                <div className="config-empty-text">No models in this category</div>
              </div>
            ) : (
              <Row gutter={[14, 14]}>
                {visibleModels.map((model) => {
                  const isRecommended = pipelineToolSet.has(model.name)
                  const isUnavailable = !model.has_api_key

                  return (
                    <Col key={model.name} xs={24} sm={12} lg={8} xl={6}>
                      <Card
                        size="small"
                        className={`model-card-enhanced ${isRecommended ? 'recommended' : ''} ${isUnavailable ? 'unavailable' : ''}`}
                      >
                        {isRecommended && (
                          <span className="recommended-badge">⭐ Recommended</span>
                        )}

                        {/* Header */}
                        <div className="model-card-header">
                          <div className="model-card-header-left">
                            <Text strong className="model-card-title">{model.name}</Text>
                            <span className="model-card-provider">{model.provider}</span>
                          </div>
                          <HealthTag model={model} />
                        </div>

                        {/* Body */}
                        <div className="model-card-body">
                          <div className="model-card-use">
                            {model.best_for?.slice(0, 2).join(', ') || 'General purpose'}
                          </div>
                          {model.health_message && model.has_api_key && (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {model.health_message}
                              </Text>
                            </div>
                          )}
                        </div>

                        {/* Footer: status + actions */}
                        <div className="model-card-footer">
                          <div className="model-card-status">
                            <span className={`status-dot ${model.has_api_key ? 'ok' : 'error'}`} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {model.has_api_key ? 'Configured' : 'Not configured'}
                            </Text>
                          </div>
                        </div>

                        {/* Config form */}
                        <ConfigFormInline model={model} />
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            )}
          </div>
        </div>
      </Card>

      {/* ===== Check Results Collapse ===== */}
      {checkResults.length > 0 && (
        <Card size="small" className="check-results-panel" style={{ marginTop: 16 }}>
          <Collapse size="small" defaultActiveKey={['1']}>
            <Panel
              header={`Check Results: ${checkResults.filter((r) => r.status === 'ok').length}/${checkResults.length} OK`}
              key="1"
            >
              <Row gutter={[8, 4]}>
                {checkResults.map((r, i) => (
                  <Col span={12} key={i}>
                    <div className="check-result-row">
                      <Text code style={{ fontSize: 12 }}>{r.tool_name}</Text>
                      <Tag color={r.status === 'ok' ? 'green' : 'red'} style={{ fontSize: 11 }}>
                        {r.status}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 11, flex: 1 }}>
                        {r.message}
                      </Text>
                    </div>
                  </Col>
                ))}
              </Row>
            </Panel>
          </Collapse>
        </Card>
      )}

      {/* ===== Quick Actions + .env Info ===== */}
      <Row gutter={16} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="Quick Actions">
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={handleRunCheck} loading={checking}>
                Run Full Config Check
              </Button>
              <Button icon={<ThunderboltOutlined />} onClick={() => handleSkipConfig('free_fallback')}>
                Skip — Use Free Models
              </Button>
              <Button icon={<BulbOutlined />} onClick={() => handleSkipConfig('script_only')}>
                Script Only (No API)
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Environment">
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {status?.project_root}/.env — {configuredCount} keys configured
              </Text>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(`${status?.project_root}/.env`)
                  message.success('Path copied to clipboard')
                }}
              >
                Copy Path
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ===== Skip Config Banner ===== */}
      <Card
        style={{
          background: '#f6ffed',
          borderColor: '#b7eb8f',
          marginBottom: 16,
        }}
      >
        <Space>
          <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <div>
            <Text strong>No API keys configured? No problem.</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Click below to skip configuration and proceed with free/available models.
              You can always add API keys later.
            </Text>
          </div>
          <Button icon={<ForwardOutlined />} onClick={() => handleSkipConfig('free_fallback')}>
            Skip Config
          </Button>
        </Space>
      </Card>

      {/* ===== Skip Config Modal ===== */}
      <Modal
        title="Skip Configuration"
        open={skipModalVisible}
        onOk={confirmSkip}
        onCancel={() => setSkipModalVisible(false)}
        okText="Continue"
        cancelText="Go Back"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Paragraph>
            Choose how you want to proceed without configuring all API keys:
          </Paragraph>

          <Card
            size="small"
            style={{ cursor: 'pointer', borderColor: skipMode === 'free_fallback' ? '#1890ff' : undefined }}
            onClick={() => setSkipMode('free_fallback')}
          >
            <Space>
              <ThunderboltOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>Use Free / Available Models</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  System will use Pexels stock media, Google TTS, Remotion animations,
                  and other available providers automatically.
                </Text>
              </div>
            </Space>
          </Card>

          <Card
            size="small"
            style={{ cursor: 'pointer', borderColor: skipMode === 'script_only' ? '#1890ff' : undefined }}
            onClick={() => setSkipMode('script_only')}
          >
            <Space>
              <BulbOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>Script & Scene Plan Only</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Skip asset generation entirely. Generate only the script and scene plan
                  — no API keys needed for these stages.
                </Text>
              </div>
            </Space>
          </Card>

          <Card
            size="small"
            style={{ cursor: 'pointer', borderColor: skipMode === 'skip' ? '#1890ff' : undefined }}
            onClick={() => setSkipMode('skip')}
          >
            <Space>
              <FallOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>Skip & Configure Later</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Start pipeline with minimal setup. Configure missing tools when needed.
                </Text>
              </div>
            </Space>
          </Card>
        </Space>
      </Modal>
    </div>
  )
}

export default ConfigDashboard
