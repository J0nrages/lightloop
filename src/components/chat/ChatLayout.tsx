import React from 'react'
import { useLayoutStore } from '@/stores/layout'
import { cn } from '@/lib/utils'
import { ChatContainerRoot, ChatContainerContent } from '@/components/ui/chat-container'
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from '@/components/ui/prompt-input'
import { Button } from '@/components/ui/button'
import { Send, Plus, Layout, SplitSquareVertical, MessageSquare, Command } from 'lucide-react'

export interface ChatLayoutProps {
  children: React.ReactNode
  generativeUI?: React.ReactNode
  input?: string
  onInputChange?: (value: string) => void
  onSubmit?: (e: React.FormEvent) => void
  isLoading?: boolean
}

export function ChatLayout({ 
  children, 
  generativeUI, 
  input, 
  onInputChange, 
  onSubmit,
  isLoading 
}: ChatLayoutProps) {
  const { mode, setMode } = useLayoutStore()

  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (onSubmit) onSubmit(e as any)
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative font-sans">
      {/* Layout Switcher (Minimal) */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setMode('centered')} className={cn("rounded-full border-muted-foreground/20 bg-background/50 backdrop-blur-sm", mode === 'centered' && 'bg-primary text-primary-foreground border-primary')}>
          <Layout className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setMode('split-right')} className={cn("rounded-full border-muted-foreground/20 bg-background/50 backdrop-blur-sm", mode === 'split-right' && 'bg-primary text-primary-foreground border-primary')}>
          <SplitSquareVertical className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setMode('floating')} className={cn("rounded-full border-muted-foreground/20 bg-background/50 backdrop-blur-sm", mode === 'floating' && 'bg-primary text-primary-foreground border-primary')}>
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>

      <div className={cn(
        "flex h-full w-full transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]",
        mode === 'centered' && "justify-center",
        mode === 'split-left' && "flex-row-reverse",
        mode === 'floating' && "relative"
      )}>
        {/* Main Chat Area */}
        <div className={cn(
          "flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] bg-background",
          mode === 'centered' && "w-full max-w-3xl border-x border-muted-foreground/10",
          mode === 'split-right' && "w-[40%] border-r border-muted-foreground/10",
          mode === 'split-left' && "w-[40%] border-l border-muted-foreground/10",
          mode === 'floating' && "hidden"
        )}>
          <ChatContainerRoot className="flex-1 px-4 scroll-smooth">
            <ChatContainerContent>
              {children}
            </ChatContainerContent>
          </ChatContainerRoot>

          <div className="p-6 border-t border-muted-foreground/10 bg-background">
            <div className="max-w-2xl mx-auto space-y-3">
              <PromptInput 
                value={input} 
                onValueChange={onInputChange}
                onSubmit={handleFormSubmit}
                className="rounded-[24px] shadow-sm border-muted-foreground/20 bg-muted/5 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/10 transition-all p-3"
              >
                <PromptInputTextarea placeholder="" className="px-2" />
                <PromptInputActions className="px-1">
                  <PromptInputAction tooltip="Attach files">
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </PromptInputAction>
                  <Button 
                    onClick={handleFormSubmit} 
                    disabled={isLoading || !input?.trim()} 
                    size="icon" 
                    className="rounded-full h-9 w-9 transition-all active:scale-90 bg-primary shadow-sm hover:shadow-md"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </PromptInputActions>
              </PromptInput>
              <p className="text-[10px] text-center text-muted-foreground/60 tracking-tight">
                AI can provide incorrect info. Verify important details.
              </p>
            </div>
          </div>
        </div>

        {/* Generative UI Area */}
        <div className={cn(
          "h-full overflow-y-auto bg-muted/5 transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] custom-scrollbar",
          mode === 'centered' && generativeUI ? "hidden" : "flex-1",
          mode === 'split-right' || mode === 'split-left' ? "w-[60%]" : "w-full",
          mode === 'floating' && "w-full"
        )}>
          <div className="max-w-5xl mx-auto p-10 h-full">
            {generativeUI || (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-1000 slide-in-from-bottom-2">
                <div className="w-20 h-20 rounded-[24px] bg-background border border-muted-foreground/10 shadow-sm flex items-center justify-center mb-6 ring-8 ring-muted/30">
                  <Command className="h-10 w-10 text-primary/40" />
                </div>
                <h3 className="font-semibold text-lg text-foreground tracking-tight">Interactive Workspace</h3>
                <p className="text-sm opacity-60 text-center max-w-[280px] mt-2 leading-relaxed">
                  Dynamic tools and components will render here to assist your hiring workflow.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat (Intercom Style) */}
        {mode === 'floating' && (
          <div className="absolute bottom-8 right-8 z-50 animate-in slide-in-from-bottom-6 zoom-in-90 duration-500 ease-[cubic-bezier(0.2,0,0,1)]">
             <div className="bg-background border border-muted-foreground/20 rounded-[28px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-[360px] h-[600px] flex flex-col overflow-hidden ring-1 ring-black/5 backdrop-blur-xl">
                <div className="p-5 border-b border-muted-foreground/10 flex justify-between items-center bg-primary text-primary-foreground">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <Command className="h-5 w-5" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm leading-none">Lightloop</div>
                      <div className="text-[10px] text-primary-foreground/60 mt-1 uppercase tracking-widest font-bold">Online</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMode('centered')} className="text-primary-foreground/80 h-9 w-9 rounded-full hover:bg-white/10">
                    <Layout className="h-4 w-4" />
                  </Button>
                </div>
                <ChatContainerRoot className="flex-1 p-5 scroll-smooth">
                  <ChatContainerContent>
                    {children}
                  </ChatContainerContent>
                </ChatContainerRoot>
                <div className="p-4 border-t border-muted-foreground/10 bg-background/50">
                  <PromptInput 
                    value={input} 
                    onValueChange={onInputChange}
                    onSubmit={handleFormSubmit}
                    className="rounded-2xl border-muted-foreground/20 shadow-none bg-muted/20 p-2"
                  >
                    <PromptInputTextarea placeholder="" className="min-h-[40px] px-2 text-sm" />
                    <Button 
                      onClick={handleFormSubmit}
                      disabled={isLoading || !input?.trim()}
                      size="icon" 
                      className="h-8 w-8 rounded-xl ml-auto bg-primary shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </PromptInput>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
