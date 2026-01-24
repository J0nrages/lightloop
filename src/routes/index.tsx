import { createFileRoute } from '@tanstack/react-router'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message'
import { PromptSuggestion } from '@/components/ui/prompt-suggestion'
import { SalarySlider } from '@/components/gen-ui/SalarySlider'
import { Quiz } from '@/components/gen-ui/Quiz'
import { CandidateTable } from '@/components/gen-ui/CandidateTable'
import { Loader } from '@/components/ui/loader'
import { useChat } from '@ai-sdk/react'
import { useEffect, useState, useRef } from 'react'
import { useLayoutStore } from '@/stores/layout'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const conversationIdRef = useRef<number | null>(null)

  const { messages, sendMessage, isLoading } = useChat({
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant' as const,
        content: "Hello! I'm your Lightloop hiring assistant. I've analyzed your requirements for a Senior Frontend Engineer. How can I help you today?"
      }
    ],
    fetch: async (url, options) => {
      // Inject conversationId into the request body
      const body = JSON.parse(options?.body as string || '{}')
      body.conversationId = conversationIdRef.current

      const response = await fetch(url, {
        ...options,
        body: JSON.stringify(body),
      })

      // Extract conversation ID from response headers
      const newConversationId = response.headers.get('X-Conversation-Id')
      if (newConversationId && !conversationIdRef.current) {
        conversationIdRef.current = parseInt(newConversationId, 10)
      }

      return response
    },
  })

  const [input, setInput] = useState('')
  const [activeGenUI, setActiveGenUI] = useState<'welcome' | 'salary' | 'quiz' | 'candidates'>('welcome')
  const { mode } = useLayoutStore()

  // Debug: log messages to see their structure
  useEffect(() => {
    console.log('Messages:', JSON.stringify(messages, null, 2))
  }, [messages])

  // Helper to get text content from a message
  const getMessageText = (msg: any): string => {
    if (msg?.parts) {
      return msg.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join(' ')
    }
    return msg?.content || ''
  }

  // Auto-switch GenUI based on content (Simulated for demo)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    const lastMessageText = getMessageText(lastMessage).toLowerCase()

    if (lastMessageText.includes('salary') || lastMessageText.includes('range')) {
      setActiveGenUI('salary')
    } else if (lastMessageText.includes('quiz') || lastMessageText.includes('test')) {
      setActiveGenUI('quiz')
    } else if (lastMessageText.includes('candidate') || lastMessageText.includes('match')) {
      setActiveGenUI('candidates')
    }
  }, [messages])

  const mockCandidates = [
    { id: '1', name: 'Alex Rivera', role: 'Senior Frontend', score: 9.2, status: 'interviewing' as const },
    { id: '2', name: 'Jordan Smith', role: 'Frontend Engineer', score: 8.5, status: 'new' as const },
    { id: '3', name: 'Sam Chen', role: 'Senior Frontend', score: 9.8, status: 'offered' as const },
  ]

  const generativeContent = (
    <div className="space-y-8 pb-20 max-w-2xl mx-auto">
      {activeGenUI === 'salary' && (
        <SalarySlider min={80000} max={250000} currency="USD" current={165000} />
      )}
      
      {activeGenUI === 'quiz' && (
        <Quiz 
          question="Which of these best describes your team's current frontend stack?"
          options={[
            "React 19 with TanStack Start",
            "Next.js with Vercel AI SDK",
            "Vue/Nuxt with custom AI",
            "Still evaluating modern options"
          ]}
        />
      )}

      {activeGenUI === 'candidates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Top Matches</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">3 FOUND</span>
          </div>
          <CandidateTable candidates={mockCandidates} />
        </div>
      )}

      {activeGenUI === 'welcome' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <CardWithIcon 
             title="Candidate Search" 
             desc="Find top-tier talent using AI-powered semantic matching." 
             onClick={() => setInput("Show me some senior frontend candidates")}
           />
           <CardWithIcon 
             title="Market Insights" 
             desc="Get real-time data on compensation and role requirements."
             onClick={() => setInput("What's the salary range for a Senior FE in NY?")}
           />
        </div>
      )}
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input
    setInput('')
    await sendMessage({ text: userMessage })
  }

  const lastMessageId = messages[messages.length - 1]?.id

  return (
    <ChatLayout
      generativeUI={generativeContent}
      input={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      <div className="flex flex-col gap-8 py-10 max-w-2xl mx-auto">
        {messages.map((m) => (
          <Message key={m.id} className={m.role === 'user' ? 'flex-row-reverse' : ''}>
            <MessageAvatar 
              src={m.role === 'user' ? 'https://github.com/J0nrages.png' : 'https://github.com/shadcn.png'} 
              alt={m.role} 
              fallback={m.role === 'user' ? 'ME' : 'LL'} 
              className={m.role === 'user' ? 'ring-2 ring-primary/10' : 'ring-2 ring-muted'}
            />
            <MessageContent
              markdown
              className={m.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl px-4 py-3' : 'bg-muted/30 rounded-2xl px-4 py-3'}
              isAnimating={isLoading && m.id === lastMessageId}
            >
              {m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || (m as any).content || ''}
            </MessageContent>
          </Message>
        ))}
        
        {isLoading && !messages.some(m => m.id === lastMessageId && m.role === 'assistant') && (
          <Message>
            <MessageAvatar src="https://github.com/shadcn.png" alt="AI" fallback="LL" />
            <div className="flex items-center h-10 px-4 bg-muted/20 rounded-2xl">
              <Loader variant="typing" size="sm" />
            </div>
          </Message>
        )}

        {/* Inline GenUI when in centered/chat-only mode */}
        {mode === 'centered' && activeGenUI !== 'welcome' && (
          <div className="ml-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeGenUI === 'salary' && (
              <SalarySlider min={80000} max={250000} currency="USD" current={165000} />
            )}
            {activeGenUI === 'quiz' && (
              <Quiz
                question="Which of these best describes your team's current frontend stack?"
                options={[
                  "React 19 with TanStack Start",
                  "Next.js with Vercel AI SDK",
                  "Vue/Nuxt with custom AI",
                  "Still evaluating modern options"
                ]}
              />
            )}
            {activeGenUI === 'candidates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Top Matches</h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">3 FOUND</span>
                </div>
                <CandidateTable candidates={mockCandidates} />
              </div>
            )}
          </div>
        )}

      </div>
    </ChatLayout>
  )
}

function CardWithIcon({ title, desc, onClick }: { title: string, desc: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="text-left p-6 bg-card border border-muted-foreground/10 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all group active:scale-[0.98]"
    >
      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h4>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{desc}</p>
    </button>
  )
}
