import { useEffect, useState, useCallback } from 'react'
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
  Tooltip,
  Modal,
  Spin,
  Divider,
  Statistic,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  ForwardOutlined,
  ApiOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
} from '@ant-design/icons'

import type { ModelCard, PipelineInfo, StatusResponse, ConfigCheckResult } from '@/services/configApi'
import { configApi } from '@/services/configApi'

const { Text, Title } = Typography
const { Panel } = Collapse

type CapabilityGroup = {
  title: string
  models: ModelCard[]
}

const STATUS_CONFIG: Record<string, { color: string; Icon: React.ElementType; text: string }> = {
  ok: { color: 'success', Icon: CheckCircleOutlined, text: 'Connected' },
  missing_key: { color: 'error', Icon: CloseCircleOutlined, text: 'No API Key' },
  invalid_key: { color: 'error', Icon: CloseCircleOutlined, text: 'Invalid Key' },
  rate_limited: { color: 'warning', Icon: ExclamationCircleOutlined, text: 'Rate Limited' },
  error: { color: 'error', Icon: CloseCircleOutlined, text: 'Error' },
  unknown: { color: 'default', Icon: ExclamationCircleOutlined, text: 'Unknown' },
}

const ConfigDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [models, setModels] = useState<ModelCard[]>([])
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [pipelineDetail, setPipelineDetail] = useState<any>(null)
  const [checkResults, setCheckResults] = useState<ConfigCheckResult[]>([])
  const [checking, setChecking] = useState(false)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [keyForm] = Form.useForm()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, modelsRes, pipelinesRes] = await Promise.all([
        configApi.getStatus(),
        configApi.getModels(),
        configApi.getPipelines(),
      ])
      setStatus(statusRes as StatusResponse)
      setModels(modelsRes as ModelCard[])
      setPipelines(pipelinesRes as PipelineInfo[])
      if (!selectedPipeline) {
        const cinematic = (pipelinesRes as PipelineInfo[]).find((p) => p.name === 'cinematic')
        if (cinematic) {
          setSelectedPipeline('cinematic')
          loadPipelineDetail('cinematic')
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

  const handlePipelineChange = (name: string) => {
    setSelectedPipeline(name)
    loadPipelineDetail(name)
  }

  const handleConfigModel = async (modelName: string, values: { key: string; value: string }) => {
    setConfiguring(modelName)
    try {
      const res: any = await configApi.configModel(modelName, values.key, values.value)
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
      setCheckResults(results as ConfigCheckResult[])
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

  const handleSkipConfig = async () => {
    Modal.confirm({
      title: 'Skip Configuration?',
      content: 'Pipeline will proceed with free/available models only. You can configure models later.',
      okText: 'Continue with Free Models',
      cancelText: 'Go Back',
      onOk: async () => {
        try {
          await configApi.skipConfig('free_fallback')
          message.info('Proceeding with free models only')
        } catch (err: any) {
          message.error(err.message)
        }
      },
    })
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

  useEffect(() => {
    fetchAll()
  }, [])

  const groupedModels = models.reduce<Record<string, ModelCard[]>>((acc, m) => {
    const cap = m.capability || 'other'
    if (!acc[cap]) acc[cap] = []
    acc[cap].push(m)
    return acc
  }, {})

  const capabilityLabels: Record<string, string> = {
    video_generation: 'Video Generation',
    image_generation: 'Image Generation',
    tts: 'Text-to-Speech',
    music_generation: 'Music Generation',
    video_post: 'Video Composition',
    audio_processing: 'Audio Processing',
    enhancement: 'Enhancement',
    analysis: 'Analysis',
    subtitle: 'Subtitles',
    graphics: 'Graphics',
    avatar: 'Avatar',
    character_animation: 'Character Animation',
    other: 'Other',
  }

  const configuredCount = status?.configured_providers?.length || 0
  const totalCount = status?.total_providers || 0
  const completionPct = status?.completion_pct || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" tip="Loading configuration..." />
      </div>
    )
  }

  return (
    <div className="config-dashboard p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ApiOutlined /> Model Configuration
          </Title>
          <Text type="secondary">Manage API keys and model providers for your video production pipeline</Text>
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

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Providers Configured"
              value={configuredCount}
              suffix={`/ ${totalCount}`}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: completionPct === 100 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Progress
              percent={Math.round(completionPct)}
              status={completionPct === 100 ? 'success' : 'active'}
              format={(pct) => (
                <span>
                  {pct}% configured — {completionPct === 100 ? 'All ready!' : `${totalCount - configuredCount} providers need API keys`}
                </span>
              )}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Pipelines Available" value={pipelines.length} prefix={<SettingOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card className="mb-6" title="Pipeline Selection">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a pipeline..."
              value={selectedPipeline || undefined}
              onChange={handlePipelineChange}
              options={pipelines.map((p) => ({
                value: p.name,
                label: `${p.name} (${p.stability})`,
              }))}
            />
          </Col>
          <Col span={16}>
            {pipelineDetail && (
              <Space>
                <Text>
                  Required: <strong>{pipelineDetail.configured_count}/{pipelineDetail.total_count}</strong> models configured
                </Text>
                <Progress
                  percent={Math.round((pipelineDetail.configured_count / Math.max(pipelineDetail.total_count, 1)) * 100)}
                  size="small"
                  style={{ width: 200 }}
                />
                <Button size="small" onClick={handleRunCheck} loading={checking}>
                  Run Config Check
                </Button>
              </Space>
            )}
          </Col>
        </Row>

        {checkResults.length > 0 && (
          <div className="mt-4">
            <Collapse size="small">
              <Panel header={`Check Results: ${checkResults.filter((r) => r.status === 'ok').length}/${checkResults.length} OK`} key="1">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {checkResults.map((r, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Text code>{r.tool_name}</Text>
                      <Tag color={r.status === 'ok' ? 'green' : 'red'}>{r.status}</Tag>
                      <Text type="secondary" style={{ flex: 1, margin: '0 16px' }}>
                        {r.message}
                      </Text>
                      {r.fallback_tools.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Fallback: {r.fallback_tools.join(', ')}
                        </Text>
                      )}
                    </div>
                  ))}
                </Space>
              </Panel>
            </Collapse>
          </div>
        )}
      </Card>

      <Row gutter={16} className="mb-6">
        <Col span={12}>
          <Card size="small" title="Quick Actions">
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRunCheck} loading={checking}>
                Run Full Config Check
              </Button>
              <Button icon={<ForwardOutlined />} onClick={handleSkipConfig}>
                Skip — Use Free Models
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Current .env">
            <Text type="secondary">
              {status?.project_root}/.env — {configuredCount} keys configured
            </Text>
            <Divider type="vertical" />
            <Button type="link" size="small" onClick={() => message.info('.env file path copied')}>
              Copy Path
            </Button>
          </Card>
        </Col>
      </Row>

      <Title level={4}>Model Providers</Title>
      {Object.entries(groupedModels).map(([cap, modelList]) => (
        <Card
          key={cap}
          className="mb-4 capability-group"
          title={
            <Space>
              <span>{capabilityLabels[cap] || cap}</span>
              <Tag color="blue">{modelList.length} models</Tag>
            </Space>
          }
          size="small"
        >
          <Row gutter={[16, 16]}>
            {modelList.map((model) => {
              const healthCfg = STATUS_CONFIG[model.health_status || 'unknown'] || STATUS_CONFIG.unknown
              const hasKey = model.has_api_key

              return (
                <Col key={model.name} xs={24} sm={12} md={8} lg={6}>
                  <Card size="small" className="model-card" type="inner">
                    <div className="flex justify-between items-center mb-2">
                      <Space>
                        <Text strong>{model.name}</Text>
                        <Tag color="default" style={{ fontSize: 11 }}>
                          {model.provider}
                        </Tag>
                      </Space>
                      <Tooltip title={healthCfg.text}>
                        <span style={{ color: healthCfg.color === 'success' ? '#52c41a' : '#ff4d4f', fontSize: 16 }}>
                          {hasKey ? '✓' : '✗'}
                        </span>
                      </Tooltip>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {model.best_for?.slice(0, 2).join(', ')}
                    </Text>
                    <Divider style={{ margin: '8px 0' }} />
                    {hasKey && model.health_status && (
                      <div className="mb-2">
                        <Tag color={healthCfg.color as any} icon={<healthCfg.Icon />} style={{ fontSize: 11 }}>
                          {healthCfg.text}
                        </Tag>
                        {model.health_message && (
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            {model.health_message}
                          </Text>
                        )}
                      </div>
                    )}
                    <ConfigForm
                      modelName={model.name}
                      provider={model.provider}
                      hasKey={hasKey}
                      installInstructions={model.install_instructions}
                      onSubmit={(values) => handleConfigModel(model.name, values)}
                      loading={configuring === model.name}
                    />
                  </Card>
                </Col>
              )
            })}
          </Row>
        </Card>
      ))}

      <Card className="mt-6" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
        <Space>
          <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
          <div>
            <Text strong>No API keys configured? No problem.</Text>
            <br />
            <Text type="secondary">
              Click "Skip — Use Free Models" to proceed with Pexels stock media, Remotion animations,
              and other free providers. You can always add API keys later.
            </Text>
          </div>
          <Button icon={<ForwardOutlined />} onClick={handleSkipConfig}>
            Skip Config
          </Button>
        </Space>
      </Card>
    </div>
  )
}

interface ConfigFormProps {
  modelName: string
  provider: string
  hasKey: boolean
  installInstructions?: string | null
  onSubmit: (values: { key: string; value: string }) => void
  loading: boolean
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
}

const ConfigForm: React.FC<ConfigFormProps> = ({
  modelName,
  provider,
  hasKey,
  installInstructions,
  onSubmit,
  loading,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [keyForm] = Form.useForm()

  const envVar = ENV_VAR_MAP[provider] || `${provider.toUpperCase()}_API_KEY`

  const handleSubmit = async (values: { apiKey: string }) => {
    onSubmit({ key: envVar, value: values.apiKey })
    keyForm.resetFields()
  }

  if (hasKey && !expanded) {
    return (
      <Button type="link" size="small" onClick={() => setExpanded(true)}>
        Update Key
      </Button>
    )
  }

  return (
    <div>
      <Form layout="inline" onFinish={handleSubmit} form={keyForm} size="small">
        <Form.Item name="apiKey" rules={[{ required: true, message: 'Enter API key' }]} style={{ marginBottom: 4 }}>
          <Input.Password placeholder={envVar} style={{ width: 160 }} autoComplete="off" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 4 }}>
          <Button type="primary" htmlType="submit" size="small" loading={loading}>
            Save
          </Button>
        </Form.Item>
      </Form>
      {installInstructions && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          Get key: {installInstructions.substring(0, 80)}
          {installInstructions.length > 80 ? '...' : ''}
        </Text>
      )}
    </div>
  )
}

export default ConfigDashboard
