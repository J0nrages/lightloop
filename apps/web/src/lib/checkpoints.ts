type MessageLike = {
  role: string
  content: string
}

export function truncateText(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}…`
}

export function deriveCheckpointTitle(messages: MessageLike[]) {
  const lastUser = messages.find((m) => m.role === 'user')
  const source = (lastUser?.content || messages[0]?.content || 'Conversation checkpoint').trim()
  return truncateText(source, 60) || 'Conversation checkpoint'
}

export function deriveCheckpointSummary(messages: MessageLike[]) {
  if (messages.length === 0) return null
  const summary = messages
    .slice()
    .reverse()
    .map((m) => `${m.role === 'user' ? 'You' : 'Assistant'}: ${m.content}`)
    .join(' ')
    .trim()
  return summary ? truncateText(summary, 240) : null
}

export function deriveConversationTitleFromMessage(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'New Chat'
  return truncateText(normalized, 60) || 'New Chat'
}
