<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChatApi, type ConversationItem, type MessageAttachment } from '../api/chat'
import MdiMagnify from '~icons/mdi/magnify'
import MdiHeartOutline from '~icons/mdi/heart-outline'
import MdiEmoticonOutline from '~icons/mdi/emoticon-outline'
import MdiPaperclip from '~icons/mdi/paperclip'
import MdiSend from '~icons/mdi/send'
import MdiPencilOutline from '~icons/mdi/pencil-outline'
import MdiCheckAll from '~icons/mdi/check-all'
import MdiCheck from '~icons/mdi/check'
import MdiImageOutline from '~icons/mdi/image-outline'
import MdiFilePdfBox from '~icons/mdi/file-pdf-box'
import MdiBellOutline from '~icons/mdi/bell-outline'
import MdiWeatherNight from '~icons/mdi/weather-night'
import MdiWhiteBalanceSunny from '~icons/mdi/white-balance-sunny'

type Conversation = {
  id: string
  name: string
  role?: string
  initials: string
  time: string
  preview: string
  unread: number
}

type MessageStatus = 'sent' | 'delivered' | 'read'

type Attachment = { type: 'image' | 'pdf'; url: string; name?: string }
type Notification = { id: string; name: string; text: string; time: string }

type ThreadItem =
  | { divider: string }
  | {
      side: 'left' | 'right'
      text?: string
      time?: string
      // legacy single file card
      file?: { name: string }
      // new: multiple attachments
      attachments?: Attachment[]
      // message status for right side only
      status?: MessageStatus
      // reply context
      replyTo?: { side: 'left' | 'right'; textSnippet: string }
    }

// Conversations loaded from backend
const conversations = reactive<Conversation[]>([])

// Cache of message threads by conversation id (string)
const threads = reactive<Record<string, ThreadItem[]>>({})

// Current auth user id from login
const savedUser = (() => {
  try { return JSON.parse(localStorage.getItem('authUser') || 'null') } catch { return null }
})()
const currentUserId = ref<number>(Number(savedUser?.id || 0))

const activeId = ref<string | null>(null)
const msgInput = ref('')
const searchQuery = ref('')
const showEmoji = ref(false)
const showAttach = ref(false)
const replyTo = ref<null | { side: 'left' | 'right'; textSnippet: string }>(null)
const selectedFiles = ref<Attachment[]>([])
// Attachment preview modal state
const isPreviewOpen = ref(false)
const previewType = ref<'image' | 'pdf' | null>(null)
const previewUrl = ref<string>('')
const previewName = ref<string>('')

// UI refs for dropdown close-on-outside-click
const emojiBtn = ref<HTMLElement | null>(null)
const attachBtn = ref<HTMLElement | null>(null)
const emojiDropdown = ref<HTMLElement | null>(null)
const attachDropdown = ref<HTMLElement | null>(null)
const imgInput = ref<HTMLInputElement | null>(null)
const pdfInput = ref<HTMLInputElement | null>(null)

// Simulated loader when switching conversations
const isLoadingThread = ref(false)

// Navbar & notifications & logout
const router = useRouter()
const showNotify = ref(false)
const notifyBtn = ref<HTMLElement | null>(null)
const notifyDropdown = ref<HTMLElement | null>(null)
const isLogoutOpen = ref(false)

// Dark mode persisted
const darkMode = ref<boolean>(false)
onMounted(async () => {
  const saved = localStorage.getItem('darkMode')
  if (saved) {
    darkMode.value = saved === 'true'
  }
  document.documentElement.classList.toggle('dark', darkMode.value)

  // Load initial data
  await loadConversations()
  await loadNotifications()
})

// Notifications list (mutable)
const notifications = reactive<Notification[]>([])

function formatTime(ts?: string | null) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function nameInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : ''
  return (first + last).toUpperCase()
}

function mapConversation(row: ConversationItem): Conversation {
  const isDirect = row.type === 'direct'
  const name = isDirect
    ? row.peer_username || `User ${row.peer_user_id ?? ''}`
    : row.title || `Group ${row.id}`
  const preview = row.last_message_body || (row.last_message_id ? '(Attachment)' : '')
  return {
    id: String(row.id),
    name,
    initials: nameInitials(name),
    time: formatTime(row.last_message_created_at || row.updated_at),
    preview: preview || '',
    unread: Number(row.unread || 0),
  }
}

async function loadConversations() {
  const list = await ChatApi.listConversations()
  conversations.splice(0, conversations.length, ...list.map(mapConversation))
}

async function loadNotifications() {
  const rows = await ChatApi.notifications(20)
  const nameByConv: Record<string, string> = Object.fromEntries(
    conversations.map((c) => [c.id, c.name]),
  )
  const mapped: Notification[] = rows.map((n) => ({
    id: String(n.id),
    name: n.conversation_id ? (nameByConv[String(n.conversation_id)] || 'Conversation') : 'System',
    text: n.content,
    time: formatTime(n.created_at),
  }))
  notifications.splice(0, notifications.length, ...mapped)
}

const emojiList = [
  '😀',
  '😁',
  '😂',
  '🤣',
  '😊',
  '😍',
  '😘',
  '😜',
  '🤗',
  '🤔',
  '😐',
  '😶',
  '🙄',
  '😏',
  '😴',
  '😪',
  '😢',
  '😭',
  '😡',
  '👍',
  '👎',
  '👏',
  '🙌',
  '🙏',
  '💪',
  '🎉',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🤍',
  '🤎',
  '🖤',
  // More emojis
  '😉',
  '😇',
  '🥰',
  '🤩',
  '😋',
  '😎',
  '😌',
  '🤤',
  '😷',
  '🤒',
  '🤕',
  '🤧',
  '🥳',
  '🤯',
  '😬',
  '🤥',
  '😵',
  '🤠',
  '🤡',
  '🥺',
  '🤓',
  '😈',
  '👻',
  '💀',
  '👽',
  '🤖',
  '💤',
  '💫',
  '💥',
  '✨',
  '🔥',
  '🌈',
  '☀️',
  '⛅',
  '🌧️',
  '❄️',
  '🌪️',
  '🍎',
  '🍔',
  '🍟',
  '🍕',
  '🌮',
  '🍣',
  '🍪',
  '🎂',
  '🍩',
  '🍺',
  '🍷',
  '🍵',
  '⚽',
  '🏀',
  '🏈',
  '⚾',
  '🎾',
  '🏐',
  '🏓',
  '🥊',
  '🎮',
  '🎁',
  '📷',
  '🎵',
  '🎧',
  '💡',
  '📎',
  '📌',
  '✏️',
  '🖊️',
  '👋',
  '🤝',
  '✌️',
  '👌',
  '🤏',
  '🤞',
  '🤟',
  '🤘',
  '👏',
  '🫶',
  '🫰',
  '☝️',
  '👇',
  '👉',
  '👈',
]

const activePeer = computed(() => conversations.find((c) => c.id === activeId.value))
const activeThread = computed(() => (activeId.value ? (threads[activeId.value] ?? []) : []))
const filteredConversations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return conversations
  return conversations.filter(
    (c) => c.name.toLowerCase().includes(q) || (c.preview || '').toLowerCase().includes(q),
  )
})

async function switchConversation(id: string) {
  // close popovers and show loader
  showEmoji.value = false
  showAttach.value = false
  replyTo.value = null
  selectedFiles.value = []
  activeId.value = id
  isLoadingThread.value = true

  try {
    const cid = Number(id)
    const items = await ChatApi.listMessages(cid, 30)
    const mapped: ThreadItem[] = items
      .slice()
      .reverse()
      .map((m) => ({
        side: m.sender_id === currentUserId.value ? 'right' : 'left',
        text: m.body || undefined,
        time: formatTime(m.created_at),
        attachments: (m.attachments || []).map((a) => ({ type: a.type, url: a.url, name: a.file_name || undefined })),
      }))
    threads[id] = mapped

    // mark read now
  await ChatApi.markRead(cid)

    // zero unread in UI
    const conv = conversations.find((c) => c.id === id)
    if (conv) conv.unread = 0
  } finally {
    isLoadingThread.value = false
  }
}

function truncate(text: string, len: number) {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '…' : text
}

function onPickImages(files: FileList | null) {
  if (!files) return
  const accepted = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  const curr = [...selectedFiles.value]
  for (const f of Array.from(files)) {
    if (curr.length >= 3) break
    if (!accepted.includes(f.type)) continue
    if (f.size > 2 * 1024 * 1024) continue
    const url = URL.createObjectURL(f)
    curr.push({ type: 'image', url, name: f.name })
  }
  selectedFiles.value = curr.slice(0, 3)
}

function onPickPdf(files: FileList | null) {
  if (!files) return
  const curr = [...selectedFiles.value]
  for (const f of Array.from(files)) {
    if (curr.length >= 3) break
    if (f.type !== 'application/pdf') continue
    if (f.size > 2 * 1024 * 1024) continue
    const url = URL.createObjectURL(f)
    curr.push({ type: 'pdf', url, name: f.name })
  }
  selectedFiles.value = curr.slice(0, 3)
}

function removeSelected(i: number) {
  const [item] = selectedFiles.value.splice(i, 1)
  if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url)
}

async function sendMessage() {
  const text = msgInput.value.trim()
  if (!text && selectedFiles.value.length === 0) return
  if (!activeId.value) return
  const cid = Number(activeId.value)

  // optimistic UI append
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const list = (threads[activeId.value] = threads[activeId.value] || [])
  const optimisticIdx = list.push({
    side: 'right',
    text: text || undefined,
    time: now,
    attachments: selectedFiles.value.length ? [...selectedFiles.value] : undefined,
    status: 'sent',
    replyTo: replyTo.value || undefined,
  }) - 1

  try {
    const atts: MessageAttachment[] | undefined = selectedFiles.value.length
      ? selectedFiles.value.map((a) => ({ type: a.type, url: a.url, file_name: a.name }))
      : undefined
  await ChatApi.sendMessage(cid, { body: text || undefined, attachments: atts })

    // update conversation preview/time
    const conv = conversations.find((c) => c.id === activeId.value)
    if (conv) {
      conv.preview = text || (atts && atts.length ? '(Attachment)' : '')
      conv.time = now
    }

    // simulate delivery/read ticks
    setTimeout(() => {
      const m = list[optimisticIdx]
      if (m && 'status' in m) m.status = 'delivered'
    }, 800)
    setTimeout(() => {
      const m = list[optimisticIdx]
      if (m && 'status' in m) m.status = 'read'
    }, 1600)
  } finally {
    // reset input state
    msgInput.value = ''
    selectedFiles.value = []
    replyTo.value = null
    showEmoji.value = false
    showAttach.value = false
  }
}

function onSelectEmoji(e: string) {
  msgInput.value += e
}

function startReply(m: Extract<ThreadItem, { side: 'left' | 'right' }>) {
  const msg = m as Exclude<ThreadItem, { divider: string }>
  const firstAtt = msg.attachments && msg.attachments.length ? msg.attachments[0] : undefined
  const text = msg.text || (firstAtt ? firstAtt.name || firstAtt.type : '') || ''
  replyTo.value = { side: m.side, textSnippet: truncate(text, 20) }
}

function openAttachment(type: 'image' | 'pdf', url: string, name = '') {
  previewType.value = type
  previewUrl.value = url
  previewName.value = name
  isPreviewOpen.value = true
}

function closePreview() {
  isPreviewOpen.value = false
  previewType.value = null
  previewUrl.value = ''
  previewName.value = ''
}

onMounted(() => {
  // No-op; reserved for future data loading
})

function handleGlobalClick(e: MouseEvent) {
  const t = e.target as Node
  if (showEmoji.value) {
    const inside = emojiDropdown.value?.contains(t) || emojiBtn.value?.contains(t)
    if (!inside) showEmoji.value = false
  }
  if (showAttach.value) {
    const inside = attachDropdown.value?.contains(t) || attachBtn.value?.contains(t)
    if (!inside) showAttach.value = false
  }
  if (showNotify.value) {
    const inside = notifyDropdown.value?.contains(t) || notifyBtn.value?.contains(t)
    if (!inside) showNotify.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick)
})

function toggleEmoji() {
  showEmoji.value = !showEmoji.value
  showAttach.value = false
}

function toggleAttach() {
  showAttach.value = !showAttach.value
  showEmoji.value = false
}

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  localStorage.setItem('darkMode', String(darkMode.value))
  document.documentElement.classList.toggle('dark', darkMode.value)
}

function toggleNotify() {
  showNotify.value = !showNotify.value
}

function openLogout() {
  isLogoutOpen.value = true
}

function cancelLogout() {
  isLogoutOpen.value = false
}

function confirmLogout() {
  isLogoutOpen.value = false
  router.push('/')
}

const latestNotifications = computed(() => notifications.slice(0, 5))

async function dismissNotification(id: string) {
  try {
    await ChatApi.readNotification(Number(id))
  } finally {
    const i = notifications.findIndex((n) => n.id === id)
    if (i !== -1) notifications.splice(i, 1)
  }
}
</script>

<template>
  <!-- Top Navbar -->
  <nav
    class="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
  >
    <div class="max-w-full mx-auto px-3 md:px-4 h-12 flex items-center justify-between">
      <div class="font-semibold dark:text-white">Chat One Ledger</div>
      <div class="flex items-center gap-2">
        <!-- Dark mode toggle -->
        <button
          class="w-9 h-9 rounded-lg grid place-items-center bg-slate-100 dark:bg-slate-700 cursor-pointer"
          title="Toggle dark mode"
          @click="toggleDarkMode"
        >
          <MdiWeatherNight v-if="!darkMode" class="text-[18px] text-slate-700/85" />
          <MdiWhiteBalanceSunny v-else class="text-[18px] text-yellow-400" />
        </button>
        <!-- Notifications -->
        <div class="relative">
          <button
            class="w-9 h-9 rounded-lg grid place-items-center bg-slate-100 dark:bg-slate-700 cursor-pointer"
            title="Notifications"
            ref="notifyBtn"
            @click="toggleNotify"
          >
            <MdiBellOutline class="text-[18px] text-slate-700/85 dark:text-slate-200" />
            <span
              v-if="notifications.length"
              class="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] grid place-items-center animate-pulse-slow"
            >
              {{ notifications.length > 99 ? '99+' : notifications.length }}
            </span>
          </button>
          <div
            v-if="showNotify"
            ref="notifyDropdown"
            class="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 z-20"
          >
            <div class="text-sm font-semibold text-center px-2 py-1 dark:text-slate-200">
              Notifications
            </div>
            <ul class="max-h-64 overflow-auto">
              <li
                v-for="n in latestNotifications"
                :key="n.id"
                class="px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded grid grid-cols-[1fr_auto] items-start gap-2"
              >
                <div>
                  <div class="text-sm font-medium dark:text-slate-200">{{ n.name }}</div>
                  <div class="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {{ truncate(n.text, 20) }}
                  </div>
                  <div class="text-[11px] text-slate-500">{{ n.time }}</div>
                </div>
                <button
                  class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-1 cursor-pointer"
                  title="Dismiss"
                  @click.stop="dismissNotification(n.id)"
                >
                  ×
                </button>
              </li>
              <li
                v-if="!latestNotifications.length"
                class="px-2 py-3 text-sm text-slate-500 text-center"
              >
                No notifications yet
              </li>
            </ul>
          </div>
        </div>
        <!-- Logout -->
        <button
          class="h-9 rounded-lg px-3 bg-red-500 text-white font-medium cursor-pointer"
          @click="openLogout"
        >
          Logout
        </button>
      </div>
    </div>
  </nav>

  <!-- Mobile users list (top) -->
  <div class="md:hidden p-2 bg-[#f2f3f7] dark:bg-slate-900">
    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-3"
    >
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search..."
        class="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 rounded-xl outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400"
      />
      <div
        class="mt-2 max-h-56 overflow-auto space-y-1"
        style="scrollbar-gutter: stable both-edges"
      >
        <button
          v-for="c in filteredConversations"
          :key="c.id"
          @click="switchConversation(c.id)"
          class="grid grid-cols-[40px_1fr_auto] gap-2 p-2 rounded-xl items-center w-full text-left cursor-pointer"
          :class="
            c.id === activeId
              ? 'bg-[#eef6ff] dark:bg-slate-700 outline-1 outline-[#dbeafe] dark:outline-slate-600'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          "
        >
          <img src="/profile.png" alt="Avatar" class="size-10 rounded-full object-cover" />
          <div>
            <div class="font-semibold dark:text-slate-200">{{ c.name }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-300 truncate">
              {{ truncate(c.preview, 10) }}
            </div>
          </div>
          <div class="grid gap-1 justify-items-end min-w-14">
            <div class="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {{ c.time }}
            </div>
            <div v-if="c.unread" class="text-[11px] bg-blue-500 text-white rounded-full px-2">
              {{ c.unread }}
            </div>
            <MdiCheckAll v-else class="text-[16px] text-slate-500/70" aria-hidden="true" />
          </div>
        </button>
      </div>
    </div>
  </div>

  <div
    class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 w-full mx-auto h-[calc(100dvh-48px)] p-2 md:p-4 text-slate-900 dark:text-slate-100 bg-[#f2f3f7] dark:bg-slate-900"
    :class="activePeer ? 'xl:grid-cols-[280px_1fr_320px]' : 'xl:grid-cols-[280px_1fr]'"
  >
    <!-- LEFT -->
    <aside
      class="col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden min-h-0 md:flex flex-col hidden"
    >
      <div class="grid grid-cols-[48px_1fr_auto] items-center gap-3 p-4 border-b border-slate-200">
        <img src="/profile.png" alt="Me" class="size-12 rounded-full object-cover" />
        <div>
          <div class="font-bold">David Peters</div>
          <div class="text-xs text-slate-500">Senior Developer</div>
        </div>
        <button class="text-slate-600/80 cursor-pointer" title="Edit">
          <MdiPencilOutline class="text-[20px]" />
        </button>
      </div>
      <div class="p-3 border-b border-slate-200 dark:border-slate-700">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search Here..."
          class="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 rounded-xl outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400"
        />
      </div>
      <div class="overflow-auto p-2 space-y-1" style="scrollbar-gutter: stable both-edges">
        <button
          v-for="c in filteredConversations"
          :key="c.id"
          @click="switchConversation(c.id)"
          class="grid grid-cols-[44px_1fr_auto] gap-2 p-2.5 rounded-xl items-center w-full text-left cursor-pointer"
          :class="
            c.id === activeId
              ? 'bg-[#eef6ff] dark:bg-slate-700 outline-1 outline-[#dbeafe] dark:outline-slate-600'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          "
        >
          <img
            src="/profile.png"
            alt="Avatar"
            class="size-11 rounded-full object-cover"
            aria-hidden="true"
          />
          <div>
            <div class="font-semibold">{{ c.name }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-300 truncate">
              {{ truncate(c.preview, 10) }}
            </div>
          </div>
          <div class="grid gap-1 justify-items-end min-w-16">
            <div class="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {{ c.time }}
            </div>
            <div v-if="c.unread" class="text-[11px] bg-blue-500 text-white rounded-full px-2">
              {{ c.unread }}
            </div>
            <MdiCheckAll v-else class="text-[16px] text-slate-500/70" aria-hidden="true" />
          </div>
        </button>
      </div>
    </aside>

    <!-- CENTER -->
    <main
      class="col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden min-h-0 flex flex-col"
    >
      <div v-if="!activePeer" class="flex-1 grid place-items-center p-8">
        <div class="text-center max-w-md">
          <h2 class="text-xl font-semibold mb-4">Welcome to Chat One Ledger</h2>
          <img src="/chat.png" alt="Welcome" class="mx-auto max-w-64 w-full" />
        </div>
      </div>

      <header
        v-else
        class="p-3.5 border-b border-slate-200 dark:border-slate-700 grid grid-cols-[1fr_auto] items-center gap-3 sticky top-0 z-10 bg-white dark:bg-slate-800"
      >
        <div class="grid grid-cols-[40px_1fr] items-center gap-2.5">
          <img src="/profile.png" alt="Peer" class="size-10 rounded-full object-cover" />
          <div>
            <div class="font-semibold flex items-center gap-1.5">
              <span>{{ activePeer?.name || 'Unknown' }}</span>
              <span
                class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_#ecfeff]"
                title="Online"
              ></span>
            </div>
            <div class="text-xs text-slate-500">{{ activePeer?.role || '—' }}</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            class="w-9 h-9 rounded-lg grid place-items-center bg-slate-100 cursor-pointer"
            title="Search"
          >
            <MdiMagnify class="text-[18px] text-slate-700/85" />
          </button>
          <button
            class="w-9 h-9 rounded-lg grid place-items-center bg-slate-100 cursor-pointer"
            title="Favorite"
          >
            <MdiHeartOutline class="text-[18px] text-slate-700/85" />
          </button>
        </div>
      </header>

      <section
        v-if="activePeer"
        class="p-4 overflow-auto grid content-start gap-3 flex-1"
        style="scrollbar-gutter: stable both-edges"
        aria-live="polite"
        aria-label="Messages"
      >
        <!-- Loading skeleton while switching chats -->
        <template v-if="isLoadingThread">
          <div class="grid gap-2 grid-cols-[40px_1fr] items-start">
            <div class="size-10 rounded-full bg-slate-200 animate-pulse" />
            <div class="h-12 w-2/3 bg-slate-200 rounded-2xl rounded-tl-md animate-pulse" />
          </div>
          <div class="grid grid-cols-1">
            <div
              class="justify-self-end h-10 w-1/2 bg-slate-200 rounded-2xl rounded-tl-md animate-pulse"
            />
          </div>
          <div class="grid gap-2 grid-cols-[40px_1fr] items-start">
            <div class="size-10 rounded-full bg-slate-200 animate-pulse" />
            <div class="h-16 w-3/4 bg-slate-200 rounded-2xl rounded-tl-md animate-pulse" />
          </div>
        </template>
        <template v-else>
          <template v-for="(m, i) in activeThread" :key="i">
            <div v-if="'divider' in m" class="text-center text-xs text-slate-500 my-2 relative">
              <span class="relative z-10 bg-transparent px-2">{{ m.divider }}</span>
              <span
                class="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-slate-200 w-[35%]"
              ></span>
              <span
                class="absolute right-0 top-1/2 -translate-y-1/2 h-px bg-slate-200 w-[35%]"
              ></span>
            </div>
            <div
              v-else
              class="grid gap-2"
              :class="m.side === 'left' ? 'grid-cols-[40px_1fr]' : 'grid-cols-1'"
            >
              <img
                v-if="m.side === 'left'"
                src="/profile.png"
                alt="Peer"
                class="size-10 rounded-full object-cover"
                aria-hidden="true"
              />
              <div
                class="max-w-[min(520px,75%)] px-3 py-2.5 rounded-2xl rounded-tl-md shadow-lg whitespace-pre-wrap wrap-break-word"
                :class="
                  m.side === 'right'
                    ? 'justify-self-end bg-indigo-900 text-white'
                    : 'bg-[#eef4ff] text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                "
                @click="startReply(m)"
              >
                <div v-if="m.replyTo" class="mb-1 border-l-2 pl-2 text-xs opacity-80">
                  Replying to {{ m.replyTo.side === 'right' ? 'you' : activePeer?.name }}:
                  {{ m.replyTo.textSnippet }}
                </div>
                <template v-if="m.file">
                  <div
                    class="grid grid-cols-[52px_1fr] gap-2.5 items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5"
                  >
                    <div
                      class="h-[52px] w-[52px] rounded-md grid place-items-center bg-linear-to-b from-slate-50 to-slate-200 dark:from-slate-600 dark:to-slate-700 border border-slate-200 dark:border-slate-600 shadow-inner text-[10px] text-slate-500 dark:text-slate-300 text-center leading-tight"
                    >
                      PROJECT STATUS REPORT
                    </div>
                    <div>
                      <div class="text-sm text-slate-800 dark:text-slate-100 font-medium">
                        {{ m.file.name }}
                      </div>
                      <div class="text-xs text-slate-500 dark:text-slate-300">Tap to preview</div>
                    </div>
                  </div>
                </template>
                <template v-if="m.attachments && m.attachments.length">
                  <div class="flex flex-wrap gap-2 mb-1">
                    <template v-for="(a, ai) in m.attachments" :key="ai">
                      <img
                        v-if="a.type === 'image'"
                        :src="a.url"
                        :alt="a.name || 'image'"
                        class="w-20 h-20 object-cover rounded cursor-pointer"
                        @click.stop="openAttachment('image', a.url, a.name)"
                      />
                      <div
                        v-else
                        class="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 cursor-pointer"
                        @click.stop="openAttachment('pdf', a.url, a.name)"
                      >
                        <MdiFilePdfBox class="text-[18px]" />
                        <span class="text-xs truncate max-w-[120px]">{{
                          a.name || 'document.pdf'
                        }}</span>
                      </div>
                    </template>
                  </div>
                </template>
                <template v-if="m.text">{{ m.text }}</template>
                <!-- Time and status inside bubble (bottom-right) -->
                <div
                  v-if="'side' in m"
                  class="mt-1 flex items-center gap-1 justify-end text-[10px]"
                  :class="m.side === 'right' ? 'text-white/80' : 'text-slate-500'"
                >
                  <span>{{ m.time || '' }}</span>
                  <template v-if="m.side === 'right'">
                    <MdiCheck v-if="m.status === 'sent'" class="text-[12px]" />
                    <MdiCheckAll v-else-if="m.status === 'delivered'" class="text-[12px]" />
                    <MdiCheckAll v-else class="text-[12px] text-blue-300" />
                  </template>
                </div>
              </div>
            </div>
          </template>
        </template>
      </section>

      <footer
        v-if="activePeer"
        class="p-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0 z-10"
      >
        <form
          class="grid grid-cols-[1fr_auto] items-center gap-2"
          @submit.prevent="sendMessage"
          autocomplete="off"
        >
          <!-- Reply bar -->
          <div
            v-if="replyTo"
            class="col-span-2 mb-1 text-xs text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded p-2 flex items-center justify-between"
          >
            <div>
              Replying to {{ replyTo.side === 'right' ? 'you' : activePeer?.name }}:
              <strong>{{ replyTo.textSnippet }}</strong>
            </div>
            <button
              type="button"
              class="ml-2 text-slate-500 cursor-pointer"
              @click="replyTo = null"
            >
              ×
            </button>
          </div>
          <!-- Selected attachments preview -->
          <div v-if="selectedFiles.length" class="col-span-2 mb-1 flex flex-wrap gap-2">
            <template v-for="(a, i) in selectedFiles" :key="i">
              <div v-if="a.type === 'image'" class="relative">
                <img :src="a.url" :alt="a.name || 'image'" class="w-16 h-16 rounded object-cover" />
                <button
                  type="button"
                  class="absolute -top-2 -right-2 bg-black/60 text-white rounded-full w-5 h-5 cursor-pointer"
                  @click="removeSelected(i)"
                >
                  ×
                </button>
              </div>
              <div
                v-else
                class="relative flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100"
              >
                <MdiFilePdfBox class="text-[18px]" />
                <span class="text-xs truncate max-w-[120px]">{{ a.name || 'document.pdf' }}</span>
                <button
                  type="button"
                  class="ml-1 text-slate-500 cursor-pointer"
                  @click="removeSelected(i)"
                >
                  ×
                </button>
              </div>
            </template>
          </div>
          <div
            class="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-2.5 py-2 grid grid-cols-[auto_1fr_auto] items-center gap-2"
          >
            <button
              type="button"
              class="w-9 h-9 rounded-lg grid place-items-center bg-slate-100 dark:bg-slate-700 cursor-pointer"
              title="Emoji"
              ref="emojiBtn"
              @click="toggleEmoji"
            >
              <MdiEmoticonOutline class="text-[18px] text-slate-700/85 dark:text-slate-200" />
            </button>
            <input
              v-model="msgInput"
              type="text"
              placeholder="Write something..."
              class="border-0 outline-none px-1.5 py-2 w-full placeholder:text-slate-400 dark:placeholder:text-slate-400 dark:text-slate-100"
            />
            <div class="flex gap-1.5">
              <button
                type="button"
                class="w-9 h-9 rounded-lg grid place-items-center bg-slate-100 dark:bg-slate-700 cursor-pointer"
                title="Attach"
                ref="attachBtn"
                @click="toggleAttach"
              >
                <MdiPaperclip class="text-[18px] text-slate-700/85 dark:text-slate-200" />
              </button>
            </div>

            <!-- Emoji dropdown upward -->
            <div
              v-if="showEmoji"
              class="absolute bottom-full mb-2 left-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 w-64 grid grid-cols-8 gap-1 z-10"
              ref="emojiDropdown"
            >
              <button
                v-for="(e, i) in emojiList"
                :key="i"
                type="button"
                class="text-xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                @click="onSelectEmoji(e)"
              >
                {{ e }}
              </button>
            </div>

            <!-- Attach dropdown upward -->
            <div
              v-if="showAttach"
              class="absolute bottom-full mb-2 right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 w-56 grid gap-2 z-10"
              ref="attachDropdown"
            >
              <button
                type="button"
                class="flex items-center gap-2 px-2 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                @click="imgInput?.click()"
              >
                <MdiImageOutline class="text-[18px]" />
                <span>Image</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2 px-2 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                @click="pdfInput?.click()"
              >
                <MdiFilePdfBox class="text-[18px]" />
                <span>PDF</span>
              </button>
              <input
                ref="imgInput"
                type="file"
                class="hidden"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple
                @change="onPickImages(($event.target as HTMLInputElement).files)"
              />
              <input
                ref="pdfInput"
                type="file"
                class="hidden"
                accept="application/pdf"
                multiple
                @change="onPickPdf(($event.target as HTMLInputElement).files)"
              />
              <div class="text-[11px] text-slate-500 px-1">Max 3 files • ≤ 2MB/file</div>
            </div>
          </div>
          <button
            class="w-11 h-11 rounded-full bg-blue-600 grid place-items-center shadow-[0_8px_18px_rgba(59,130,246,.35)]"
            aria-label="Send"
          >
            <MdiSend class="text-white text-[20px]" />
          </button>
        </form>
      </footer>
    </main>

    <!-- RIGHT -->
    <aside
      v-if="activePeer"
      class="col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden min-h-0 xl:flex flex-col"
    >
      <div class="p-4 border-b border-slate-200 dark:border-slate-700">
        <input
          type="search"
          placeholder="Search Here..."
          class="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400"
        />
      </div>
      <div class="p-5 grid gap-3">
        <img
          src="/profile.png"
          alt="Peer"
          class="size-20 rounded-full object-cover border-4 border-white dark:border-slate-700 mx-auto"
        />
        <div class="text-center">
          <div class="font-bold">{{ activePeer?.name || 'Unknown' }}</div>
          <div class="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            {{ activePeer?.role || '—' }}
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-slate-200 dark:border-slate-700">
        <div class="font-semibold mb-2">Attachments</div>
        <div class="grid grid-cols-4 gap-2">
          <div
            class="border border-slate-200 dark:border-slate-700 rounded-xl p-2 grid place-items-center gap-1 text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800"
          >
            <MdiFilePdfBox class="text-[22px]" /> PDF
          </div>
          <div
            class="border border-slate-200 dark:border-slate-700 rounded-xl p-2 grid place-items-center gap-1 text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800"
          >
            <MdiImageOutline class="text-[22px]" /> IMAGE
          </div>
        </div>
      </div>
    </aside>
  </div>

  <!-- Attachment Preview Modal -->
  <div
    v-if="isPreviewOpen"
    class="fixed inset-0 z-100 grid place-items-center bg-black/30 backdrop-blur-sm"
    @click="closePreview"
  >
    <div
      class="max-w-[90vw] max-h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden"
      @click.stop
    >
      <div class="flex items-center justify-between px-4 py-2 border-b border-slate-200">
        <div class="text-sm font-medium truncate max-w-[70vw]">{{ previewName }}</div>
        <button class="text-slate-600 cursor-pointer" @click="closePreview">✕</button>
      </div>
      <div class="p-2">
        <img
          v-if="previewType === 'image'"
          :src="previewUrl"
          :alt="previewName || 'image'"
          class="max-w-[86vw] max-h-[75vh] object-contain"
        />
        <iframe v-else-if="previewType === 'pdf'" :src="previewUrl" class="w-[86vw] h-[75vh]" />
      </div>
    </div>
  </div>

  <!-- Logout Confirm Modal -->
  <div
    v-if="isLogoutOpen"
    class="fixed inset-0 z-100 grid place-items-center bg-black/30 backdrop-blur-sm"
    @click="cancelLogout"
  >
    <div
      class="w-[92vw] max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      @click.stop
    >
      <div
        class="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-semibold dark:text-slate-200"
      >
        Confirm Logout
      </div>
      <div class="px-4 py-3 text-sm dark:text-slate-200">Are you sure you want to logout?</div>
      <div class="px-4 py-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
        <button class="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700" @click="cancelLogout">
          Cancel
        </button>
        <button class="px-3 py-2 rounded-lg bg-red-500 text-white" @click="confirmLogout">
          Logout
        </button>
      </div>
    </div>
  </div>
</template>
