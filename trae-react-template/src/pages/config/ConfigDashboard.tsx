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
  Tooltip,
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
  CopyOutlined,
} from '@ant-design/icons'

import type { ModelCard, PipelineInfo, StatusResponse, ConfigCheckResult } from '@/services/configApi'
import { configApi } from '@/services/configApi'
import './styles.css'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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
  const { t } = useTranslation()
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

  // Pipeline execution state
  const [stageChecks, setStageChecks] = useState<Record<string, any>>({})
  const [checkingStages, setCheckingStages] = useState(false)

  // Phase 5: Skip config fallback plan
  const [fallbackPlan, setFallbackPlan] = useState<any>(null)
  const [loadingFallback, setLoadingFallback] = useState(false)

  // Env safety check (FR-6.3)
  const [envSafety, setEnvSafety] = useState<any>(null)

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
      setStatus(statusRes || null)
      setModels(Array.isArray(modelsRes) ? modelsRes : [])
      const pipelinesList = Array.isArray(pipelinesRes) ? pipelinesRes : []
      setPipelines(pipelinesList)

      // Auto-select cinematic pipeline
      if (!selectedPipeline && pipelinesList.length > 0) {
        const cinematic = pipelinesList.find((p: any) => p.name === 'cinematic')
        if (cinematic) {
          setSelectedPipeline('cinematic')
        } else {
          setSelectedPipeline(pipelinesList[0]?.name || '')
        }
      }
    } catch (err: any) {
      message.error(t('config.failedToLoadConfig', { message: err.message }))
    } finally {
      setLoading(false)
    }
  }, [selectedPipeline])

  const loadPipelineDetail = async (name: string) => {
    try {
      const detail = await configApi.getPipelineDetail(name)
      setPipelineDetail(detail)
    } catch (err: any) {
      message.error(t('config.failedToLoadPipeline', { message: err.message }))
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
      message.success(t('config.modelConfigured', { name: modelName }))
      keyForm.resetFields()
      fetchAll()
    } catch (err: any) {
      message.error(t('config.configuredSuccess', { name: modelName }))
    } finally {
      setConfiguring(null)
    }
  }

  const handleDeleteConfig = async (modelName: string) => {
    try {
      await configApi.deleteModelConfig(modelName)
      message.success(t('config.modelRemoved', { name: modelName }))
      fetchAll()
    } catch (err: any) {
      message.error(t('config.removeSuccess', { name: modelName }))
    }
  }

  const handleRunCheck = async () => {
    setChecking(true)
    try {
      const results = await configApi.runConfigCheck()
      setCheckResults(results)
      const missing = results.filter((r) => r.status !== 'ok')
      if (missing.length > 0) {
        message.warning(t('config.toolNeedConfig', { count: missing.length }))
      } else {
        message.success(t('config.allStagesPass'))
      }
    } catch (err: any) {
      message.error(t('config.preflightCheckFailed', { message: err.message }))
    } finally {
      setChecking(false)
    }
  }

  const handleSkipConfig = async (mode: string) => {
    setSkipMode(mode)
    setSkipModalVisible(true)
    setFallbackPlan(null)

    // Fetch fallback plan (FR-5.2)
    if (mode === 'free_fallback') {
      setLoadingFallback(true)
      try {
        const plan = await configApi.skipConfig(mode)
        setFallbackPlan(plan.fallback_plan || null)
      } catch {
        setFallbackPlan(null)
      } finally {
        setLoadingFallback(false)
      }
    }
  }

  const confirmSkip = async () => {
    try {
      await configApi.skipConfig(skipMode)
      message.info(t('config.proceedingAvailable'))
      setSkipModalVisible(false)
      setFallbackPlan(null)
    } catch (err: any) {
      message.error(err.message || t('config.preflightCheckFailed', { message: '' }))
    }
  }

  // Load env safety on mount (FR-6.3)
  useEffect(() => {
    configApi.getEnvSafety().then(setEnvSafety).catch(() => setEnvSafety(null))
  }, [])

  // Run pre-flight check across all pipeline stages
  const handlePreFlightCheck = async () => {
    if (!selectedPipeline || !pipelineDetail) {
      message.warning(t('config.selectPipelineFirst'))
      return
    }
    setCheckingStages(true)
    setStageChecks({})
    try {
      const stages = pipelineDetail.stages || []
      const results: Record<string, any> = {}
      for (const stage of stages) {
        const stageName = stage.name
        try {
          const check = await configApi.checkStage(selectedPipeline, stageName, false)
          results[stageName] = check
        } catch {
          results[stageName] = { ready: false, error: 'Check failed' }
        }
      }
      setStageChecks(results)
      const blocked = Object.values(results).filter((r: any) => !r.ready).length
      if (blocked > 0) {
        message.warning(t('config.toolNeedConfig', { count: blocked }))
      } else {
        message.success(t('config.allStagesPass'))
      }
    } catch (err: any) {
      message.error(t('config.preflightCheckFailed', { message: err.message }))
    } finally {
      setCheckingStages(false)
    }
  }

  const handleStartPipeline = () => {
    if (!selectedPipeline) {
      message.warning(t('config.selectPipelineFirst'))
      return
    }
    if (!pipelineDetail) {
      message.warning(t('config.pipelineDetailsNotLoaded'))
      return
    }
    const blocked = Object.entries(stageChecks).filter(([, r]: [string, any]) => !r.ready)
    if (blocked.length > 0) {
      const names = blocked.map(([name]) => name).join(', ')
      Modal.confirm({
        title: t('config.startPipelineWithIssues'),
        content: t('config.stagesWithIssues', { names }),
        okText: t('config.startWithFallbacks'),
        cancelText: t('config.configureFirst'),
        onOk: () => {
          message.info(t('config.pipelineStartedFallback', { name: selectedPipeline }))
        },
      })
    } else {
      Modal.confirm({
        title: t('config.startPipelineConfirm'),
        content: t('config.pipelineWouldStart', { name: selectedPipeline }),
        okText: t('config.startPipeline'),
        cancelText: t('common.cancel'),
        onOk: () => {
          message.info(t('config.pipelineWouldStart', { name: selectedPipeline }))
        },
      })
    }
  }

  /* ============================================================
     Sub-components
     ============================================================ */

  const HealthTag = ({ model }: { model: ModelCard }) => {
    if (!model.has_api_key) {
      return <Tag icon={<CloseCircleOutlined />} color="error">{t('config.noKey')}</Tag>
    }
    const status = model.health_status || 'unknown'
    const cfg: Record<string, { color: string; icon: any; text: string }> = {
      ok:          { color: 'success', icon: <CheckCircleOutlined />, text: t('config.connected') },
      missing_key: { color: 'error',   icon: <CloseCircleOutlined />, text: t('config.missingKey') },
      invalid_key: { color: 'error',   icon: <CloseCircleOutlined />, text: t('config.invalidKey') },
      rate_limited:{ color: 'warning', icon: <ExclamationCircleOutlined />, text: t('config.rateLimited') },
      error:       { color: 'error',   icon: <ExclamationCircleOutlined />, text: t('config.error') },
      unknown:     { color: 'default', icon: <ExclamationCircleOutlined />, text: t('config.checking') },
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
      const maskedKey = `${envVar}=${envVar.includes('KEY') ? 'sk-...' : '***'}`
      return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text code style={{ fontSize: 11, background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {maskedKey}
            </Text>
            <Tooltip title={t('config.copyEnvLine')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(`${envVar}=<your-api-key>`)
                  message.success(t('config.copied'))
                }}
                style={{ fontSize: 11 }}
              />
            </Tooltip>
          </div>
          <Space size="small">
            <Button type="link" size="small" onClick={() => setExpanded(true)}>
              {t('config.updateKey')}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                Modal.confirm({
                  title: t('config.removeApiKeyConfirm'),
                  content: t('config.removeApiKeyContent', { provider: model.provider }),
                  onOk: () => handleDeleteConfig(model.name),
                })
              }}
            >
              {t('config.remove')}
            </Button>
          </Space>
        </Space>
      )
    }

    return (
      <div className="config-form-inline">
        <Form layout="inline" onFinish={handleSubmit} size="small">
          <Form.Item
            name="apiKey"
            rules={[{ required: true, message: t('config.enterApiKey') }]}
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
              {t('config.save')}
            </Button>
          </Form.Item>
        </Form>
        {model.install_instructions && (
          <div className="config-hint">
            {t('config.getKey')} {model.install_instructions.substring(0, 100)}
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
        <Spin size="large" tip={t('common.loading')} />
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
            <ApiOutlined /> {t('config.title')}
          </Title>
          <Text type="secondary">
            {t('config.subtitle')}
          </Text>
        </div>
        <Space>
          <LanguageSwitcher size="small" />
          <Button icon={<ReloadOutlined />} onClick={fetchAll}>
            {t('config.refresh')}
          </Button>
          <Button icon={<PlayCircleOutlined />} type="primary" onClick={handleStartPipeline}>
            {t('config.startPipeline')}
          </Button>
        </Space>
      </div>

      {/* ===== Pipeline Selection Banner ===== */}
      <div className="pipeline-banner">
        <RocketOutlined className="pipeline-banner-icon" />
        <div className="pipeline-banner-info">
          <h3>{t('menu.dashboard')}</h3>
          <p>
            {pipelineDetail
              ? t('config.configuredForPipeline', { count: pipelineDetail.configured_count, total: pipelineDetail.total_count })
              : t('config.pipelineSelect')}
          </p>
        </div>
        <div className="pipeline-select-wrapper">
          <Select
            style={{ width: '100%' }}
            placeholder={t('config.selectPipeline')}
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

      {/* ===== Pre-flight Check Panel ===== */}
      {selectedPipeline && (
        <Card size="small" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text strong style={{ fontSize: 14 }}>{t('config.preflightCheck')}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('config.preflightDesc')}
              </Text>
            </div>
            <Space>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={checkingStages}
                onClick={handlePreFlightCheck}
              >
                {t('config.checkAllStages')}
              </Button>
            </Space>
          </div>

          {/* Stage check results */}
          {Object.keys(stageChecks).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Row gutter={[8, 8]}>
                {pipelineDetail?.stages?.map((stage: any) => {
                  const check = stageChecks[stage.name]
                  if (!check) return null
                  const ready = check.ready
                  const missingCount = (check.missing_required?.length || 0) + (check.missing_optional?.length || 0)
                  return (
                    <Col span={12} key={stage.name}>
                      <Card size="small" style={{
                        borderColor: ready ? '#b7eb8f' : '#ffccc7',
                        background: ready ? '#f6ffed' : '#fff2f0',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: ready ? '#52c41a' : '#ff4d4f',
                            flexShrink: 0,
                          }} />
                          <Text strong style={{ fontSize: 13 }}>{stage.name}</Text>
                          {ready ? (
                            <Tag color="success" style={{ fontSize: 11 }}>{t('config.allReady')}</Tag>
                          ) : (
                            <Tag color="error" style={{ fontSize: 11 }}>
                              {missingCount} {t('config.toolsNeedConfig', { count: missingCount })}
                            </Tag>
                          )}
                        </div>
                        {!ready && check.missing_required?.length > 0 && (
                          <div style={{ marginTop: 4, fontSize: 11, color: '#ff4d4f' }}>
                            {t('config.required')} {check.missing_required.map((t: any) => t.tool_name || t).join(', ')}
                          </div>
                        )}
                        {!ready && check.missing_optional?.length > 0 && (
                          <div style={{ marginTop: 2, fontSize: 11, color: '#faad14' }}>
                            {t('config.optional')} {check.missing_optional.map((t: any) => t.tool_name || t).join(', ')}
                          </div>
                        )}
                        {check.free_fallbacks_available?.length > 0 && (
                          <div style={{ marginTop: 2, fontSize: 11, color: '#1890ff' }}>
                            {t('config.freeFallbacks')} {check.free_fallbacks_available.join(', ')}
                          </div>
                        )}
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            </div>
          )}
        </Card>
      )}

      {/* ===== Stats Row ===== */}
      <div className="config-stats">
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: completionPct === 100 ? '#52c41a' : '#faad14' }}>
            {configuredCount}<span style={{ color: '#bfbfbf', fontWeight: 400 }}>/{totalCount}</span>
          </div>
          <div className="stat-card-label">{t('config.providersConfigured')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{pipelines.length}</div>
          <div className="stat-card-label">{t('config.pipelinesAvailable')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: stats.recommended === stats.recommendedTotal ? '#52c41a' : '#faad14' }}>
            {stats.recommended}<span style={{ color: '#bfbfbf', fontWeight: 400 }}>/{stats.recommendedTotal}</span>
          </div>
          <div className="stat-card-label">{t('config.pipelineModelsReady')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#597ef7' }}>{Math.round(completionPct)}%</div>
          <div className="stat-card-label">{t('config.overallCompletion')}</div>
        </div>
      </div>

      {/* ===== Progress Bar ===== */}
      <Card size="small" style={{ marginBottom: 20 }}>
        <Progress
          percent={Math.round(completionPct)}
          status={completionPct === 100 ? 'success' : 'active'}
          format={(pct) => (
            <span style={{ fontSize: 13 }}>
              {pct}% {t('config.configured')} — {completionPct === 100
                ? t('config.allReady')
                : `${totalCount - configuredCount} ${t('config.providersNeedKeys', { count: totalCount - configuredCount })}`}
            </span>
          )}
        />
      </Card>

      {/* ===== Main Content: Sidebar + Grid ===== */}
      <Card size="small" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="config-layout">
          {/* --- Capability Sidebar --- */}
          <div className="cap-sidebar">
            <div className="cap-sidebar-title">{t('config.capabilities')}</div>

            {/* "All" option */}
            <div
              className={`cap-sidebar-item ${activeCap === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCap('all')}
            >
              <Space>
                <FilterOutlined />
                <span>{t('config.allModels')}</span>
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
                    ? t('config.allModels')
                    : `${CAPABILITY_LABELS[activeCap]?.icon || ''} ${CAPABILITY_LABELS[activeCap]?.label || activeCap}`}
                </Text>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {t('config.modelsCount', { count: visibleModels.length })}
                </Text>
              </div>

              <Space>
                {checkResults.length > 0 && (
                  <Tag color={checkResults.filter((r) => r.status === 'ok').length === checkResults.length ? 'green' : 'orange'}>
                    {t('config.checkResults', {
                      ok: checkResults.filter((r) => r.status === 'ok').length,
                      total: checkResults.length,
                    })}
                  </Tag>
                )}
                <Button size="small" onClick={handleRunCheck} loading={checking}>
                  {t('config.runCheck')}
                </Button>
              </Space>
            </div>

            {/* Model cards */}
            {visibleModels.length === 0 ? (
              <div className="config-empty">
                <div className="config-empty-icon">📭</div>
                <div className="config-empty-text">{t('config.noModels')}</div>
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
                          <span className="recommended-badge">{t('config.recommended')}</span>
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
                              {model.has_api_key ? t('config.configured') : t('config.notConfigured')}
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
              header={t('config.checkResults', {
                ok: checkResults.filter((r) => r.status === 'ok').length,
                total: checkResults.length,
              })}
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
          <Card size="small" title={t('config.quickActions')}>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={handleRunCheck} loading={checking}>
                {t('config.runFullCheck')}
              </Button>
              <Button icon={<ThunderboltOutlined />} onClick={() => handleSkipConfig('free_fallback')}>
                {t('config.skipFreeModels')}
              </Button>
              <Button icon={<BulbOutlined />} onClick={() => handleSkipConfig('script_only')}>
                {t('config.scriptOnly')}
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title={t('config.environment')}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {status?.project_root}/.env — {t('config.configuredCountOfTotal', { configured: configuredCount, total: totalCount })}
                </Text>
                {envSafety?.issues?.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <Tag color="warning" style={{ fontSize: 11 }}>
                      ⚠️ {envSafety.issues[0]}
                    </Tag>
                  </div>
                )}
              </div>
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    // FR-2.6: Copy .env format
                    const lines = models
                      .filter(m => m.has_api_key)
                      .map(m => `${ENV_VAR_MAP[m.provider] || m.provider.toUpperCase() + '_API_KEY'}=<your-key>`)
                    navigator.clipboard.writeText(lines.join('\n'))
                    message.success(t('config.envFormatCopied'))
                  }}
                >
                  {t('config.copyEnvFormat')}
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(`${status?.project_root}/.env`)
                    message.success(t('config.pathCopied'))
                  }}
                >
                  {t('config.copyPath')}
                </Button>
                {envSafety?.recommendations?.length > 0 && (
                  <Tooltip title={envSafety.recommendations[0]}>
                    <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                  </Tooltip>
                )}
              </Space>
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
            <Text strong>{t('config.skipConfigTitle')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('config.skipConfigDesc')}
            </Text>
          </div>
          <Button icon={<ForwardOutlined />} onClick={() => handleSkipConfig('free_fallback')}>
            {t('config.skipConfig')}
          </Button>
        </Space>
      </Card>

      {/* ===== Skip Config Modal (FR-5.2: auto-generated fallback plan) ===== */}
      <Modal
        title={t('config.skipConfigTitle2')}
        open={skipModalVisible}
        onOk={confirmSkip}
        onCancel={() => { setSkipModalVisible(false); setFallbackPlan(null) }}
        okText={t('config.continue')}
        cancelText={t('config.goBack')}
        width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Paragraph style={{ marginBottom: 0 }}>
            {t('config.chooseHowToProceed')}
          </Paragraph>

          <Card
            size="small"
            style={{ cursor: 'pointer', borderColor: skipMode === 'free_fallback' ? '#1890ff' : undefined }}
            onClick={() => setSkipMode('free_fallback')}
          >
            <Space>
              <ThunderboltOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>{t('config.useFreeModels')}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('config.freeModelDesc')}
                </Text>
              </div>
            </Space>

            {/* Fallback plan visualization (FR-5.2/5.3) */}
            {skipMode === 'free_fallback' && (
              <div style={{ marginTop: 12 }}>
                {loadingFallback ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <Spin size="small" /> <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{t('config.analyzingTools')}</Text>
                  </div>
                ) : fallbackPlan ? (
                  <div style={{ background: '#fafafa', borderRadius: 6, padding: '10px 14px', fontSize: 12 }}>
                    {fallbackPlan.can_proceed !== undefined && (
                      <div style={{ marginBottom: 8, fontWeight: 500, color: fallbackPlan.can_proceed ? '#52c41a' : '#ff4d4f' }}>
                        {fallbackPlan.can_proceed ? t('config.freePipelineCanProceed') : t('config.someNoFreeFallback')}
                      </div>
                    )}
                    {fallbackPlan.media && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <Text>🎬 Video</Text>
                        <Text type={fallbackPlan.media.available ? 'success' : 'danger'} style={{ fontSize: 11 }}>
                          {fallbackPlan.media.source}
                        </Text>
                      </div>
                    )}
                    {fallbackPlan.images && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <Text>🖼️ Images</Text>
                        <Text type={fallbackPlan.images.available ? 'success' : 'danger'} style={{ fontSize: 11 }}>
                          {fallbackPlan.images.source}
                        </Text>
                      </div>
                    )}
                    {fallbackPlan.tts && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <Text>🔊 Narration</Text>
                        <Text type={fallbackPlan.tts.available ? 'success' : 'danger'} style={{ fontSize: 11 }}>
                          {fallbackPlan.tts.source}
                        </Text>
                      </div>
                    )}
                    {fallbackPlan.music && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <Text>🎵 Music</Text>
                        <Text type={fallbackPlan.music.available ? 'success' : 'danger'} style={{ fontSize: 11 }}>
                          {fallbackPlan.music.source}
                        </Text>
                      </div>
                    )}
                    {fallbackPlan.composition && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <Text>🎞️ Composition</Text>
                        <Text type={fallbackPlan.composition.available ? 'success' : 'danger'} style={{ fontSize: 11 }}>
                          {fallbackPlan.composition.source}
                        </Text>
                      </div>
                    )}
                    {fallbackPlan.uncovered && fallbackPlan.uncovered.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #f0f0f0' }}>
                        <Text type="warning" style={{ fontSize: 11 }}>
                          ⚠️ {t('config.noFreeFallback', { tools: fallbackPlan.uncovered.map((u: any) =>
                            typeof u === 'string' ? u : u.tool || 'unknown'
                          ).join(', ') })}
                        </Text>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 8 }}>
                    {t('config.clickModeToSee')}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card
            size="small"
            style={{ cursor: 'pointer', borderColor: skipMode === 'script_only' ? '#1890ff' : undefined }}
            onClick={() => setSkipMode('script_only')}
          >
            <Space>
              <BulbOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>{t('config.scriptOnlyTitle')}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('config.scriptOnlyDesc')}
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
                <Text strong>{t('config.skipLaterTitle')}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('config.skipLaterDesc')}
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
