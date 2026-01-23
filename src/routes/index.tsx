import { createFileRoute } from '@tanstack/react-router'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message'
import { PromptSuggestion } from '@/components/ui/prompt-suggestion'
import { SalarySlider } from '@/components/gen-ui/SalarySlider'
import { Quiz } from '@/components/gen-ui/Quiz'
import { CandidateTable } from '@/components/gen-ui/CandidateTable'
import { Loader } from '@/components/ui/loader'
import { useChat } from '@ai-sdk/react'
import { useEffect, useState } from 'react'
import { useCopilotRegistry } from '@/components/chat/CopilotRegistry'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  useCopilotRegistry()
  const { messages, input, setInput, handleSubmit, status } = useChat({
    api: 'http://localhost:4111/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your Lightloop hiring assistant. I've analyzed your requirements for a Senior Frontend Engineer. How can I help you today?"
      }
    ]
  })

  const [activeGenUI, setActiveGenUI] = useState<'welcome' | 'salary' | 'quiz' | 'candidates'>('welcome')

  // Auto-switch GenUI based on content (Simulated for demo)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || ''
    if (lastMessage.includes('salary') || lastMessage.includes('range')) {
      setActiveGenUI('salary')
    } else if (lastMessage.includes('quiz') || lastMessage.includes('test')) {
      setActiveGenUI('quiz')
    } else if (lastMessage.includes('candidate') || lastMessage.includes('match')) {
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

  const lastMessageId = messages[messages.length - 1]?.id

  return (
    <ChatLayout 
      generativeUI={generativeContent}
      input={input}
      onInputChange={setInput}
      onSubmit={(e) => handleSubmit(e as any)}
      isLoading={status === 'submitted' || status === 'streaming'}
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
              isAnimating={status === 'streaming' && m.id === lastMessageId}
            >
              {m.content}
            </MessageContent>
          </Message>
        ))}
        
        {(status === 'submitted' || status === 'streaming') && !messages.some(m => m.id === lastMessageId && m.role === 'assistant') && (
          <Message>
            <MessageAvatar src="https://github.com/shadcn.png" alt="AI" fallback="LL" />
            <div className="flex items-center h-10 px-4 bg-muted/20 rounded-2xl">
              <Loader variant="typing" size="sm" />
            </div>
          </Message>
        )}

        {messages.length < 3 && (
          <div className="grid grid-cols-2 gap-2 max-w-xl ml-12 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            <PromptSuggestion onClick={() => setInput("What is Sam Chen's score?")}>Sam Chen's score</PromptSuggestion>
            <PromptSuggestion onClick={() => setInput("Generate a technical quiz")}>Technical quiz</PromptSuggestion>
            <PromptSuggestion onClick={() => setInput("Show me salary ranges")}>Salary ranges</PromptSuggestion>
            <PromptSuggestion onClick={() => setInput("Compare candidates")}>Compare all</PromptSuggestion>
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
