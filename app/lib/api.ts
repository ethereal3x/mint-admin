import type {
  Strategy,
  StrategyListResponse,
  StrategyFormData,
  ModelMapping,
  MappingListResponse,
  MappingFormData,
  ModelInfo,
  DialogueSummary,
  DialogueRecord,
} from "~/lib/types"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

// Strategy API
export async function fetchStrategies(page: number, pageSize: number): Promise<StrategyListResponse> {
  return request<StrategyListResponse>(`/admin/v1/strategies?page=${page}&page_size=${pageSize}`)
}

export async function fetchStrategy(ruleId: string): Promise<Strategy> {
  return request<Strategy>(`/admin/v1/strategies/${ruleId}`)
}

export async function createStrategy(data: StrategyFormData): Promise<Strategy> {
  return request<Strategy>("/admin/v1/strategies", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateStrategy(ruleId: string, data: StrategyFormData): Promise<Strategy> {
  return request<Strategy>(`/admin/v1/strategies/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteStrategy(ruleId: string): Promise<void> {
  return request<void>(`/admin/v1/strategies/${ruleId}`, { method: "DELETE" })
}

// Mapping API
export async function fetchMappings(manufacturer?: string): Promise<MappingListResponse> {
  const query = manufacturer ? `?manufacturer=${encodeURIComponent(manufacturer)}` : ""
  return request<MappingListResponse>(`/admin/v1/mappings${query}`)
}

export async function fetchMapping(id: number): Promise<ModelMapping> {
  return request<ModelMapping>(`/admin/v1/mappings/${id}`)
}

export async function createMapping(data: MappingFormData): Promise<ModelMapping> {
  return request<ModelMapping>("/admin/v1/mappings", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateMapping(id: number, data: MappingFormData): Promise<ModelMapping> {
  return request<ModelMapping>(`/admin/v1/mappings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteMapping(id: number): Promise<void> {
  return request<void>(`/admin/v1/mappings/${id}`, { method: "DELETE" })
}

// Agent API
export async function fetchModels(): Promise<ModelInfo[]> {
  const data = await request<{ models: ModelInfo[] }>("/api/v1/agent/models")
  return data.models
}

export async function fetchHistory(dialogueId: string): Promise<DialogueRecord[]> {
  const data = await request<{ records: DialogueRecord[] }>(`/api/v1/agent/history/${dialogueId}`)
  return data.records
}

export async function fetchDialogues(userId?: string): Promise<DialogueSummary[]> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : ""
  const data = await request<{ dialogues: DialogueSummary[] }>(`/api/v1/agent/dialogues${query}`)
  return data.dialogues
}

export async function streamChat(
  model: string,
  question: string,
  dialogueId: string,
  recordId: string,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch("/api/v1/agent/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, question, dialogue_id: dialogueId, record_id: recordId }),
    signal,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  if (!response.body) throw new Error("No response body")
  return response.body
}
