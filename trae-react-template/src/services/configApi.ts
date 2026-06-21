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

// Request interceptor — log for debugging
api.interceptors.request.use((config) => {
  console.log(`[ConfigAPI] ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

// Response interceptor — our FastAPI returns raw data, not {code, data, message}
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export const configApi = {
  getStatus: () => api.get<StatusResponse>('/status'),

  getModels: () => api.get<ModelCard[]>('/models'),

  getPipelines: () => api.get<PipelineInfo[]>('/pipelines'),

  getPipelineDetail: (name: string) => api.get(`/pipelines/${name}`),

  configModel: (name: string, key: string, value: string, persist = true) =>
    api.post(`/models/${name}/config`, { key, value, persist }),

  deleteModelConfig: (name: string) =>
    api.delete(`/models/${name}/config`),

  runConfigCheck: () => api.post<ConfigCheckResult[]>('/check'),

  streamConfigCheck: () =>
    fetch('http://localhost:3001/api/check/stream').then((res) => {
      if (!res.body) throw new Error('No stream')
      return new ReadableStream({
        start(controller) {
          const reader = res.body!.getReader()
          const decoder = new TextDecoder()
          reader.read().then(({ done }) => {
            if (done) controller.close()
          })
          ;(reader as any)._read = () =>
            reader.read().then(({ done, value }) => {
              if (done) controller.close()
              else controller.enqueue(value)
            })
        },
      })
    }),

  skipConfig: (mode = 'free_fallback', selectedTools: string[] = []) =>
    api.post('/skip-config', { mode, selected_tools: selectedTools }),

  getCapabilities: () => api.get('/capabilities'),
}

export default configApi
