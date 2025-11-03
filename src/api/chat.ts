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

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const extraHeaders = (init?.headers || {}) as Record<string, string>
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { headers, credentials: 'omit', ...init })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  // 204 no content
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export const ChatApi = {
  login(email: string, password: string) {
    return http<{ token: string; user: { id: number; email: string; username: string; role: number } }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  listConversations(limit = 30, offset = 0) {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    return http<ConversationItem[]>(`/api/conversations?${q}`)
  },
  createConversation(body: { type: 'direct' | 'group'; title?: string; participantUserIds?: number[] }) {
    return http<{ id: number }>(`/api/conversations`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  listMessages(conversationId: number, limit = 20, cursor?: string) {
    const q = new URLSearchParams({ limit: String(limit) })
    if (cursor) q.set('cursor', cursor)
    return http<{ items: MessageItem[]; nextCursor: string | null }>(`/api/conversations/${conversationId}/messages?${q}`)
  },
  sendMessage(conversationId: number, body: {
    body?: string
    replyToMessageId?: number
    attachments?: MessageAttachment[]
  }) {
    return http<{ id: number }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  markRead(conversationId: number) {
    return http<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' })
  },
  unreadByConversation() {
    return http<Array<{ conversation_id: number; unread: number }>>(`/api/conversations/unread`)
  },
  notifications(limit = 20) {
    const q = new URLSearchParams({ limit: String(limit) })
    return http<Array<{ id: number; user_id: number; conversation_id: number | null; content: string; created_at: string; read_at: string | null }>>(`/api/notifications?${q}`)
  },
  readNotification(id: number) {
    return http<void>(`/api/notifications/${id}/read`, { method: 'PATCH' })
  }
}
