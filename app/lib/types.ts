export interface ModelConfig {
  id: number
  model_type: string
  manufacturer: string
  description: string
  input_price: number
  output_price: number
  api_key: string
  url: string
  max_tokens: number
  stream: boolean
  temperature: number
  top_p: number
  n: number
  presence_penalty: number
  frequency_penalty: number
  agent_generate_type: string
  route: string
  is_enabled: number
}

export interface ConfigListResponse {
  configs: ModelConfig[]
  total: number
}

export interface ConfigFormData {
  model_type: string
  manufacturer: string
  description: string
  input_price: number
  output_price: number
  api_key: string
  url: string
  max_tokens: number
  stream: boolean
  temperature: number
  top_p: number
  n: number
  presence_penalty: number
  frequency_penalty: number
  agent_generate_type: string
  route: string
  is_enabled: number
}

export interface ModelInfo {
  model: string
  description: string
}

export interface ManufacturerGroup {
  manufacturer: string
  models: ModelInfo[]
}

export interface ModelStat {
  model: string
  total_input_tokens: number
  total_output_tokens: number
  total_input_cost: number
  total_output_cost: number
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
  input_cost: number
  output_cost: number
}
