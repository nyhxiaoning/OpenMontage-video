import axios from 'axios'

export interface ModelCard {
  name: string
  provider: string
  capability: string
  tier: string
  status: string
  dependencies: string[]
  best_for: string[]
  has_api_key: boolean
  health_status?: string
  health_message?: string
  install_instructions?: string | null
}

export interface PipelineInfo {
  name: string
  description: string
  stability: string
  required_tools: string[]
  recommended_tools: string[]
  configured_count: number
  total_count: number
}

export interface StatusResponse {
  project_root: string
  config_available: boolean
  registry_available: boolean
  pipeline_loader_available: boolean
  configured_providers: string[]
  total_providers: number
  completion_pct: number
}

export interface ConfigCheckResult {
  tool_name: string
  capability: string
  status: string
  message: string
  severity: string
  fallback_tools: string[]
}

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor — unwrap response.data so callers get the raw payload
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

export const configApi = {
  getStatus: (): Promise<StatusResponse> =>
    api.get('/status'),

  getModels: (): Promise<ModelCard[]> =>
    api.get('/models'),

  getPipelines: (): Promise<PipelineInfo[]> =>
    api.get('/pipelines'),

  getPipelineDetail: (name: string): Promise<any> =>
    api.get(`/pipelines/${name}`),

  configModel: (name: string, key: string, value: string, persist = true): Promise<any> =>
    api.post(`/models/${name}/config`, { key, value, persist }),

  deleteModelConfig: (name: string): Promise<any> =>
    api.delete(`/models/${name}/config`),

  runConfigCheck: (): Promise<ConfigCheckResult[]> =>
    api.post('/check'),

  skipConfig: (mode = 'free_fallback', selectedTools: string[] = []): Promise<any> =>
    api.post('/skip-config', { mode, selected_tools: selectedTools }),

  getCapabilities: (): Promise<any> =>
    api.get('/capabilities'),

  checkStage: (pipeline: string, stage: string, autoSkip = false): Promise<any> =>
    api.post('/check/stage', { pipeline, stage, auto_skip: autoSkip }),
}

export default configApi
