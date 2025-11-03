// Minimal chat API client for syncing with Fastify backend
// Base URL: set VITE_API_BASE in .env or defaults to production API

export type ConversationItem = {
  id: number
  type: 'direct' | 'group'
  title: string | null
  created_by: number | null
  created_at: string | null
  updated_at: string | null
  last_message_id?: number | null
  last_message_body?: string | null
  last_message_created_at?: string | null
  unread?: number
  peer_user_id?: number | null
  peer_username?: string | null
  peer_avatar?: string | null
  peer_email?: string | null
  peer_role?: number | null
}

export type MessageAttachment = {
  type: 'image' | 'pdf'
  url: string
  file_name?: string | null
  mime_type?: string | null
  byte_size?: number | null
}

export type MessageItem = {
  id: number
  conversation_id: number
  sender_id: number | null
  body: string | null
  reply_to_message_id: number | null
  created_at: string
  sender_username?: string | null
  sender_avatar?: string | null
  attachments?: MessageAttachment[]
}

const BASE = import.meta.env.VITE_API_BASE || 'https://api-chat-oneled.masmut.dev'

type ApiEnvelope<T> = { data: T; status: 'success' | 'error'; message: string }

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const extraHeaders = (init?.headers || {}) as Record<string, string>
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { headers, credentials: 'omit', ...init })
  if (!res.ok) {
    // Try to read standardized envelope even on errors, without swallowing the error
    let errJson: Partial<ApiEnvelope<unknown>> | null = null
    try {
      errJson = (await res.json()) as Partial<ApiEnvelope<unknown>>
    } catch {}
    if (errJson && typeof errJson === 'object' && 'message' in errJson!) {
      const msg = (errJson as Record<string, unknown>).message
      throw new Error(typeof msg === 'string' && msg.trim() ? msg : `HTTP ${res.status}`)
    }
    // fall back to text if not JSON/envelope
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  // 204 no content
  if (res.status === 204) return undefined as unknown as T
  const json = await res.json().catch(() => null)
  // Unwrap standardized envelope { data, status, message }
  if (json && typeof json === 'object' && 'status' in json && 'data' in json) {
    const env = json as ApiEnvelope<T>
    if (env.status !== 'success') {
      throw new Error(env.message || 'Request failed')
    }
    return env.data
  }
  // Fallback to raw JSON (backward compatibility)
  return json as T
}

export const ChatApi = {
  login(email: string, password: string) {
    type LoginPayload = { token: string; user: { id: number; email: string; username: string; role: number } }
    return http<LoginPayload | LoginPayload[]>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((d) => {
      const out = Array.isArray(d) ? d[0] : d
      if (!out || typeof out !== 'object' || !('token' in out)) {
        throw new Error('Invalid login response')
      }
      return out as LoginPayload
    })
  },
  usersList(limit = 100, offset = 0, q?: string) {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (q && q.trim()) qs.set('q', q.trim())
    return http<Array<{ id: number; username: string | null; email: string | null; avatar: string | null; role: number }>>(`/api/users?${qs}`)
  },
  listConversations(limit = 30, offset = 0) {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    return http<ConversationItem[]>(`/api/conversations?${q}`)
  },
  createConversation(body: { type: 'direct' | 'group'; title?: string; participantUserIds?: number[] }) {
    type Created = { id: number }
    return http<Created | Created[]>(`/api/conversations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((d) => (Array.isArray(d) ? (d[0] as Created) : d))
  },
  deleteConversation(conversationId: number) {
    return http<unknown>(`/api/conversations/${conversationId}`, { method: 'DELETE' }).then(() => undefined)
  },
  listMessages(conversationId: number, limit = 20, cursor?: string) {
    const q = new URLSearchParams({ limit: String(limit) })
    // Cursor is currently not used by the backend; kept for forward compatibility
    if (cursor) q.set('cursor', cursor)
    return http<MessageItem[]>(`/api/conversations/${conversationId}/messages?${q}`)
  },
  sendMessage(conversationId: number, body: {
    body?: string
    replyToMessageId?: number
    attachments?: MessageAttachment[]
  }) {
    type Created = { id: number }
    return http<Created | Created[]>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((d) => (Array.isArray(d) ? (d[0] as Created) : d))
  },
  markRead(conversationId: number) {
    return http<unknown>(`/api/conversations/${conversationId}/read`, { method: 'POST' }).then(() => undefined)
  },
  unreadByConversation() {
    return http<Array<{ conversation_id: number; unread: number }>>(`/api/conversations/unread`)
  },
  notifications(limit = 20) {
    const q = new URLSearchParams({ limit: String(limit) })
    return http<Array<{ id: number; user_id: number; conversation_id: number | null; content: string; created_at: string; read_at: string | null }>>(`/api/notifications?${q}`)
  },
  readNotification(id: number) {
    return http<unknown>(`/api/notifications/${id}/read`, { method: 'PATCH' }).then(() => undefined)
  }
}
