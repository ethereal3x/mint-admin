import type { AuthResult, UserInfo } from "~/lib/types"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const response = await fetch(url, { headers, ...options })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  const data = await response.json()
  if (data.code && data.code !== 0) {
    throw new Error(data.message || "未知错误")
  }
  return data
}

const TOKEN_KEY = "mint_token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export async function registerAccount(
  account: string,
  password: string,
  displayName?: string,
  avatarUrl?: string,
): Promise<AuthResult> {
  const data = await request<AuthResult>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ account, password, display_name: displayName, avatar_url: avatarUrl }),
  })
  return data
}

export async function login(identifier: string, credential: string): Promise<AuthResult> {
  const data = await request<AuthResult>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, credential }),
  })
  return data
}

export async function fetchMe(): Promise<UserInfo> {
  const data = await request<{ user: UserInfo }>("/api/v1/user/me")
  return data.user
}

export async function updateAvatar(avatarUrl: string): Promise<UserInfo> {
  const data = await request<{ user: UserInfo }>("/api/v1/user/avatar", {
    method: "PUT",
    body: JSON.stringify({ avatar_url: avatarUrl }),
  })
  return data.user
}

export async function updatePassword(oldPassword: string, newPassword: string): Promise<void> {
  await request("/api/v1/user/password", {
    method: "PUT",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
}

export async function updateNickname(nickname: string): Promise<UserInfo> {
  const data = await request<{ user: UserInfo }>("/api/v1/user/nickname", {
    method: "PUT",
    body: JSON.stringify({ nickname }),
  })
  return data.user
}
