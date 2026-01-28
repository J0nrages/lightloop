import { useMemo, useState, useEffect, useCallback } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { fetch as expoFetch } from 'expo/fetch'
import { useAuth } from '@clerk/clerk-expo'
import { Link, router } from 'expo-router'

import { generateAPIUrl } from '@/lib/api'

const WELCOME_MESSAGE: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: "Hello! I'm your Lightloop hiring assistant. How can I help you today?",
    },
  ],
}

const getMessageText = (message: UIMessage) =>
  message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

export default function ChatScreen() {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [checkpoints, setCheckpoints] = useState<{
    id: number
    conversationId: number
    title: string
    summary?: string | null
    checkpointType: string
    createdAt: number
  }[]>([])
  const { isLoaded, isSignedIn, getToken } = useAuth()

  const fetchWithConversationCapture = useMemo(() => {
    const resolveRequestUrl = (value: RequestInfo | URL) => {
      if (typeof value === 'string') return value
      if (value instanceof URL) return value.toString()
      return value.url
    }

    const wrapped = async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      if (isSignedIn) {
        const token = await getToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }

      const { body, signal, ...rest } = init ?? {}
      const requestInit = {
        ...rest,
        ...(body === null ? {} : { body }),
        ...(signal == null ? {} : { signal }),
      }

      const response = await expoFetch(resolveRequestUrl(input), {
        ...requestInit,
        headers,
      })
      const header = response.headers.get('X-Conversation-Id')
      if (header) {
        const parsed = Number(header)
        if (!Number.isNaN(parsed)) {
          setConversationId(parsed)
        }
      }
      return response
    }
    return wrapped as unknown as typeof fetch
  }, [getToken, isSignedIn])

  const fetchWithAuth = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers()
      if (isSignedIn) {
        const token = await getToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }
      return expoFetch(generateAPIUrl(path), {
        ...init,
        headers,
      })
    },
    [getToken, isSignedIn]
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: generateAPIUrl('/api/chat'),
        fetch: fetchWithConversationCapture,
      }),
    [fetchWithConversationCapture]
  )

  const chat = useChat({
    messages: [WELCOME_MESSAGE],
    transport,
  })

  useEffect(() => {
    if (chat.messages.length === 0) {
      chat.setMessages([WELCOME_MESSAGE])
    }
  }, [chat])

  const refreshCheckpoints = useCallback(async () => {
    const response = await fetchWithAuth('/api/checkpoints')
    if (!response.ok) return
    const data = await response.json()
    if (Array.isArray(data.checkpoints)) {
      setCheckpoints(data.checkpoints)
    }
  }, [fetchWithAuth])

  const openConversation = useCallback(
    async (targetConversationId: number) => {
      const response = await fetchWithAuth(`/api/conversations/${targetConversationId}`)
      if (!response.ok) return
      const data = await response.json()
      if (Array.isArray(data.messages)) {
        chat.setMessages(data.messages)
        setConversationId(targetConversationId)
      }
    },
    [chat, fetchWithAuth]
  )

  useEffect(() => {
    if (isSignedIn) {
      refreshCheckpoints()
    }
  }, [isSignedIn, refreshCheckpoints])

  useEffect(() => {
    if (conversationId !== null) {
      refreshCheckpoints()
    }
  }, [conversationId, refreshCheckpoints])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || chat.status === 'streaming') return

    setInput('')
    await chat.sendMessage(
      { text: trimmed },
      {
        body: {
          conversationId: conversationId ?? undefined,
        },
      }
    )
  }

  const performNewSession = useCallback(async () => {
    if (chat.status === 'streaming') return
    if (conversationId !== null) {
      await fetchWithAuth('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, checkpointType: 'manual' }),
      })
    }
    setConversationId(null)
    chat.setMessages([WELCOME_MESSAGE])
    setInput('')
    await refreshCheckpoints()
  }, [chat, conversationId, fetchWithAuth, refreshCheckpoints])

  const startNewSession = useCallback(() => {
    if (chat.messages.length <= 1) {
      void performNewSession()
      return
    }
    Alert.alert(
      'Start a new session?',
      'We’ll save a checkpoint of this conversation so you can return later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start new session', style: 'destructive', onPress: () => void performNewSession() },
      ]
    )
  }, [chat.messages.length, performNewSession])

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted-foreground">Loading…</Text>
      </View>
    )
  }

  if (!isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-2xl font-semibold text-foreground">Sign in required</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to continue your Lightloop conversations.
        </Text>
        <Pressable
          className="mt-6 rounded-xl bg-primary px-4 py-3"
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text className="text-sm font-semibold text-primary-foreground">Sign in</Text>
        </Pressable>
        <Link href="/(auth)/sign-up" className="mt-4 text-sm text-primary">
          Create an account
        </Link>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View className="flex-1">
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <Pressable
            onPress={startNewSession}
            className="self-start rounded-full border border-border px-3 py-1 mb-3"
            disabled={chat.status === 'streaming'}
          >
            <Text className="text-xs font-semibold text-foreground">New Session</Text>
          </Pressable>
          {checkpoints.length > 0 ? (
            <View className="mb-4">
              <Text className="text-xs uppercase tracking-widest text-muted-foreground">Checkpoints</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                {checkpoints.map((checkpoint) => (
                  <Pressable
                    key={checkpoint.id}
                    onPress={() => openConversation(checkpoint.conversationId)}
                    className="mr-3 w-56 rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      {checkpoint.title}
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>
                      {checkpoint.summary || 'Open to continue from this point.'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {chat.messages.map((message) => {
            const isUser = message.role === 'user'
            return (
              <View
                key={message.id}
                className={`mb-3 rounded-2xl px-4 py-3 ${
                  isUser ? 'bg-primary/10 self-end' : 'bg-card'
                }`}
                style={{ maxWidth: '85%' }}
              >
                <Text className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isUser ? 'You' : 'Lightloop'}
                </Text>
                <Text className="text-base text-foreground">
                  {getMessageText(message) || '...'}
                </Text>
              </View>
            )
          })}
          {chat.error ? (
            <View className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
              <Text className="text-sm text-destructive">{chat.error.message}</Text>
            </View>
          ) : null}
        </ScrollView>
        <View className="border-t border-border bg-background px-4 py-3">
          {chat.status === 'streaming' ? (
            <Text className="text-xs text-muted-foreground mb-2">Thinking…</Text>
          ) : null}
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-xl border border-input bg-card px-3 py-2 text-base text-foreground"
              placeholder="Ask Lightloop..."
              placeholderTextColor="#9ca3af"
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Pressable
              className={`rounded-xl px-4 py-2 ${
                chat.status === 'streaming' ? 'bg-muted' : 'bg-primary'
              }`}
              onPress={handleSend}
              disabled={chat.status === 'streaming'}
            >
              <Text className="text-sm font-semibold text-primary-foreground">Send</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
