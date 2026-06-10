import type {
  ModelConfig,
  ConfigListResponse,
  ConfigFormData,
  ManufacturerGroup,
  ModelInfo,
  ModelStat,
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
  const data = await response.json()
  if (data.code && data.code !== 0) {
    throw new Error(data.message || "未知错误")
  }
  return data
}

// ModelConfig API
export async function fetchConfigs(page: number, pageSize: number): Promise<ConfigListResponse> {
  return request<ConfigListResponse>(`/admin/v1/configs?page=${page}&page_size=${pageSize}`)
}

export async function fetchConfig(id: number): Promise<ModelConfig> {
  const data = await request<{ config: ModelConfig }>(`/admin/v1/configs/${id}`)
  return data.config
}

export async function createConfig(data: ConfigFormData): Promise<ModelConfig> {
  const result = await request<{ config: ModelConfig }>("/admin/v1/configs", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return result.config
}

export async function updateConfig(id: number, data: ConfigFormData): Promise<ModelConfig> {
  const result = await request<{ config: ModelConfig }>(`/admin/v1/configs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
  return result.config
}

export async function deleteConfig(id: number): Promise<void> {
  return request<void>(`/admin/v1/configs/${id}`, { method: "DELETE" })
}

export async function fetchModelStats(): Promise<ModelStat[]> {
  const data = await request<{ stats: ModelStat[] }>("/admin/v1/stats/models")
  return data.stats
}

// Agent API
export async function fetchModels(): Promise<ManufacturerGroup[]> {
  const data = await request<{ manufacturers: ManufacturerGroup[] }>("/api/v1/chat/models")
  return data.manufacturers
}

export async function fetchHistory(dialogueId: string): Promise<DialogueRecord[]> {
  const data = await request<{ records: DialogueRecord[] }>(`/api/v1/chat/history/${dialogueId}`)
  return data.records
}

export async function fetchDialogues(userId?: string): Promise<DialogueSummary[]> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : ""
  const data = await request<{ dialogues: DialogueSummary[] }>(`/api/v1/chat/dialogues${query}`)
  return data.dialogues
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch("/api/v1/files/upload?user_id=admin", {
    method: "POST",
    body: formData,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  const data = await response.json()
  if (data.code !== 0) throw new Error(data.message || "上传失败")
  return data.data.url
}

export async function streamChat(
  model: string,
  question: string,
  dialogueId: string,
  recordId: string,
  imageUrls: string[],
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch("/api/v1/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, question, dialogue_id: dialogueId, record_id: recordId, image_urls: imageUrls }),
    signal,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  if (!response.body) throw new Error("No response body")
  return response.body
}
