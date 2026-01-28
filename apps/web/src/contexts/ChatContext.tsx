import React, { createContext, useContext, useMemo, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useModelStore } from '@/stores/model'

interface ChatContextType {
  messages: UIMessage[]
  sendMessage: ReturnType<typeof useChat>['sendMessage']
  status: ReturnType<typeof useChat>['status']
  setMessages: ReturnType<typeof useChat>['setMessages']
  input: string
  setInput: (value: string) => void
  handleSubmit: (message: any) => Promise<void>
  checkpoints: ConversationCheckpointSummary[]
  refreshCheckpoints: () => Promise<void>
  openConversation: (conversationId: number) => Promise<void>
  startNewSession: () => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

const WELCOME_MESSAGE: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: "Hello! I'm your Lightloop hiring assistant. I've analyzed your requirements for a Senior Frontend Engineer. How can I help you today?"
    }
  ]
}

export interface ConversationCheckpointSummary {
  id: number
  conversationId: number
  title: string
  summary?: string | null
  checkpointType: string
  createdAt: number
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { selectedModel } = useModelStore()
  const [input, setInput] = React.useState('')
  const [conversationId, setConversationId] = React.useState<number | null>(null)
  const [checkpoints, setCheckpoints] = React.useState<ConversationCheckpointSummary[]>([])

  const fetchWithConversationCapture = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetch(input, init)
      const header = res.headers.get('X-Conversation-Id')
      if (header) {
        setConversationId(Number(header))
      }
      return res
    },
    {
      preconnect: (globalThis.fetch as any).preconnect,
    },
  ) as typeof fetch

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    fetch: fetchWithConversationCapture,
  }), [])

  const chat = useChat({
    messages: [WELCOME_MESSAGE],
    transport,
  })

  // Ensure welcome message is set on mount
  useEffect(() => {
    if (chat.messages.length === 0) {
      chat.setMessages([WELCOME_MESSAGE])
    }
  }, [])

  const handleSubmit = async (message: any) => {
    if (!message.text?.trim() && !message.files?.length) return
    if (chat.status === 'streaming') return

    setInput('')
    await chat.sendMessage(
      {
        text: message.text || '',
        files: message.files
      },
      {
        body: {
          model: selectedModel.id,
          conversationId: conversationId ?? undefined,
        }
      }
    )
  }

  const refreshCheckpoints = React.useCallback(async () => {
    const response = await fetch('/api/checkpoints')
    if (!response.ok) return
    const data = await response.json()
    if (Array.isArray(data.checkpoints)) {
      setCheckpoints(data.checkpoints)
    }
  }, [])

  const startNewSession = React.useCallback(async () => {
    if (chat.status === 'streaming') return
    if (conversationId !== null) {
      await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, checkpointType: 'manual' }),
      })
    }
    setConversationId(null)
    chat.setMessages([WELCOME_MESSAGE])
    setInput('')
    await refreshCheckpoints()
  }, [chat, conversationId, refreshCheckpoints])

  const openConversation = React.useCallback(
    async (targetConversationId: number) => {
      const response = await fetch(`/api/conversations/${targetConversationId}`)
      if (!response.ok) return
      const data = await response.json()
      if (Array.isArray(data.messages)) {
        chat.setMessages(data.messages)
        setConversationId(targetConversationId)
      }
    },
    [chat]
  )

  useEffect(() => {
    refreshCheckpoints()
  }, [refreshCheckpoints])

  useEffect(() => {
    if (conversationId !== null) {
      refreshCheckpoints()
    }
  }, [conversationId, refreshCheckpoints])

  const value = {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    setMessages: chat.setMessages,
    input,
    setInput,
    handleSubmit,
    checkpoints,
    refreshCheckpoints,
    openConversation,
    startNewSession
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useGlobalChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useGlobalChat must be used within a ChatProvider')
  }
  return context
}
