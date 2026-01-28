import { createFileRoute } from '@tanstack/react-router'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message'
import { SalarySlider } from '@/components/gen-ui/SalarySlider'
import { Quiz } from '@/components/gen-ui/Quiz'
import { CandidateTable } from '@/components/gen-ui/CandidateTable'
import { Loader } from '@/components/ui/loader'
import { useEffect, useMemo } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useGlobalChat } from '@/contexts/ChatContext'
import { fallbackCandidates, fallbackQuiz } from '@/data/mock-gen-ui'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { messages, status, input, setInput, handleSubmit, checkpoints, openConversation, startNewSession } = useGlobalChat()
  const isLoading = status === 'streaming'
  const { view, setView } = useWorkspaceStore()

  const toolOutputs = useMemo(() => {
    const outputs: {
      candidates?: any[]
      salary?: { min: number; max: number; currency: string; current?: number }
      quiz?: { question: string; options: string[] }
      workspace?: 'dashboard' | 'candidates' | 'settings'
    } = {}

    messages.forEach((m) => {
      m.parts?.forEach((part: any) => {
        if (part.state !== 'output-available') return
        if (part.type === 'tool-showCandidates' && part.output?.candidates) {
          outputs.candidates = part.output.candidates
        }
        if (part.type === 'tool-salaryRange' && part.output) {
          outputs.salary = part.output
        }
        if (part.type === 'tool-quiz' && part.output) {
          outputs.quiz = part.output
        }
        if (part.type === 'tool-setWorkspace' && part.output?.view) {
          outputs.workspace = part.output.view
        }
      })
    })

    return outputs
  }, [messages])

  // If the model requests a workspace change, reflect it in the UI state
  useEffect(() => {
    if (toolOutputs.workspace) {
      setView(toolOutputs.workspace)
    }
  }, [toolOutputs.workspace, setView])

  const workspaceContent = (
    <div className="space-y-8 pb-20 max-w-2xl mx-auto">
      {view === 'dashboard' && (
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

      {view === 'candidates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Candidate Pipeline</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{(toolOutputs.candidates ?? fallbackCandidates).length} CANDIDATES</span>
          </div>
          <CandidateTable candidates={toolOutputs.candidates ?? fallbackCandidates} />
        </div>
      )}

      {view === 'settings' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Settings workspace is ready for model-driven controls.</p>
          <Quiz 
            question={toolOutputs.quiz?.question ?? fallbackQuiz.question}
            options={toolOutputs.quiz?.options ?? fallbackQuiz.options}
          />
        </div>
      )}

      {toolOutputs.salary && (
        <SalarySlider
          min={toolOutputs.salary.min}
          max={toolOutputs.salary.max}
          currency={toolOutputs.salary.currency}
          current={toolOutputs.salary.current}
        />
      )}

      {toolOutputs.quiz && view !== 'settings' && (
        <Quiz question={toolOutputs.quiz.question} options={toolOutputs.quiz.options} />
      )}
    </div>
  )

  const lastMessageId = messages[messages.length - 1]?.id

  return (
    <ChatLayout
      generativeUI={workspaceContent}
      input={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      status={status}
      onNewSession={startNewSession}
      shouldConfirmNewSession={messages.length > 1}
    >
      <div className="flex flex-col gap-8 py-10 max-w-2xl mx-auto">
        {checkpoints.length > 0 ? (
          <CheckpointShelf checkpoints={checkpoints} onOpen={openConversation} />
        ) : null}
        {messages.map((m) => {
          const textContent = m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || (m as any).content || ''
          const toolParts = (m.parts || []).filter((p: any) => p.type?.startsWith('tool-'))

          return (
            <Message key={m.id} className={m.role === 'user' ? 'flex-row-reverse' : ''}>
              <MessageAvatar 
                src={m.role === 'user' ? 'https://github.com/J0nrages.png' : 'https://github.com/shadcn.png'} 
                alt={m.role} 
                fallback={m.role === 'user' ? 'ME' : 'LL'} 
                className={m.role === 'user' ? 'ring-2 ring-primary/10' : 'ring-2 ring-muted'}
              />
              <div className="flex-1 space-y-3">
                <MessageContent
                  markdown
                  className={m.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl px-4 py-3' : 'bg-muted/30 rounded-2xl px-4 py-3'}
                  isAnimating={isLoading && m.id === lastMessageId}
                >
                  {textContent}
                </MessageContent>

                {toolParts.map((part: any) => (
                  <ToolPart key={part.id ?? part.type} part={part} onApprove={handleSubmit} />
                ))}
              </div>
            </Message>
          )
        })}
        
        {isLoading && !messages.some(m => m.id === lastMessageId && m.role === 'assistant') && (
          <Message>
            <MessageAvatar src="https://github.com/shadcn.png" alt="AI" fallback="LL" />
            <div className="flex items-center h-10 px-4 bg-muted/20 rounded-2xl">
              <Loader variant="typing" size="sm" />
            </div>
          </Message>
        )}

      </div>
    </ChatLayout>
  )
}

function CheckpointShelf({
  checkpoints,
  onOpen,
}: {
  checkpoints: Array<{
    id: number
    conversationId: number
    title: string
    summary?: string | null
    checkpointType: string
    createdAt: number
  }>
  onOpen: (conversationId: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Checkpoints</h4>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {checkpoints.map((checkpoint) => (
          <button
            key={checkpoint.id}
            onClick={() => onOpen(checkpoint.conversationId)}
            className="min-w-[220px] max-w-[260px] flex-shrink-0 rounded-2xl border border-muted-foreground/10 bg-card px-4 py-3 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md"
          >
            <div className="text-xs font-semibold text-foreground line-clamp-1">{checkpoint.title}</div>
            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
              {checkpoint.summary || 'Open to continue from this point.'}
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {checkpoint.checkpointType}
            </div>
          </button>
        ))}
      </div>
    </div>
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

type ToolPartProps = {
  part: any
  onApprove: (message: { text: string }) => void
}

function ToolPart({ part, onApprove }: ToolPartProps) {
  if (part.state && part.state !== 'output-available') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
        <Loader variant="typing" size="sm" />
        <span>{part.type?.replace('tool-', '')} running…</span>
      </div>
    )
  }

  const output = part.output ?? {}

  switch (part.type) {
    case 'tool-showCandidates':
      return <CandidateTable candidates={output.candidates ?? fallbackCandidates} />
    case 'tool-salaryRange':
      return (
        <SalarySlider
          min={output.min ?? 80000}
          max={output.max ?? 250000}
          currency={output.currency ?? 'USD'}
          current={output.current}
        />
      )
    case 'tool-quiz':
      return (
        <Quiz
          question={output.question ?? fallbackQuiz.question}
          options={output.options ?? fallbackQuiz.options}
        />
      )
    case 'tool-setWorkspace':
      return (
        <div className="inline-flex items-center gap-2 text-[11px] bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
          Workspace → {output.view}
        </div>
      )
    case 'tool-confirmAction':
      return (
        <div className="border border-amber-200/70 bg-amber-50 text-amber-900 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide">Approval needed</div>
          <div className="text-sm font-medium">{output.action ?? 'Action'}</div>
          {output.details && <p className="text-xs text-amber-800/80 leading-relaxed">{output.details}</p>}
          <div className="flex gap-2 pt-1">
            <button
              className="text-xs px-3 py-1.5 rounded-full bg-amber-900 text-amber-50 font-semibold"
              onClick={() => onApprove({ text: `APPROVE_ACTION:${output.action ?? 'action'}` })}
            >
              Approve
            </button>
            <button
              className="text-xs px-3 py-1.5 rounded-full border border-amber-300 text-amber-900"
              onClick={() => onApprove({ text: `REJECT_ACTION:${output.action ?? 'action'}` })}
            >
              Reject
            </button>
          </div>
        </div>
      )
    default:
      return null
  }
}
