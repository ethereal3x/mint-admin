export interface Strategy {
  id: number
  rule_id: string
  api_key: string
  agent_model: string
  agent_manufacturer: string
  agent_generate_type: string
  url: string
  max_tokens: number
  stream: boolean
  temperature: number
  top_p: number
  n: number
  presence_penalty: number
  frequency_penalty: number
  route: string
  is_enabled: number
}

export interface StrategyListResponse {
  strategies: Strategy[]
  total: number
}

export interface StrategyFormData {
  api_key: string
  agent_model: string
  agent_manufacturer: string
  agent_generate_type: string
  url: string
  max_tokens: number
  stream: boolean
  temperature: number
  top_p: number
  n: number
  presence_penalty: number
  frequency_penalty: number
  route: string
  is_enabled: number
}

export interface ModelMapping {
  id: number
  model_type: string
  manufacturer: string
  description: string
}

export interface MappingListResponse {
  mappings: ModelMapping[]
}

export interface MappingFormData {
  model_type: string
  manufacturer: string
  description: string
}

export interface ModelInfo {
  model: string
  manufacturer: string
  description: string
}

export interface DialogueSummary {
  dialogue_id: string
  title: string
  message_count: number
  updated_time: string
}

export interface DialogueRecord {
  record_id: string
  user_content: string
  agent_content: string
  model: string
  total_tokens: number
}
