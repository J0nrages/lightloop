import { useChat } from "@tanstack/ai-react";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Loader } from "@/components/ui/loader";

export function Chat() {
  const { messages, status } = useChat({
    api: "/api/chat",
  });

  const lastMessageId = messages[messages.length - 1]?.id;

  return (
    <div className="flex flex-col gap-6 py-8">
      {messages.map((m) => (
        <Message key={m.id} className={m.role === 'user' ? 'flex-row-reverse' : ''}>
          <MessageAvatar 
            src={m.role === 'user' ? 'https://github.com/J0nrages.png' : 'https://github.com/shadcn.png'} 
            alt={m.role} 
            fallback={m.role === 'user' ? 'ME' : 'AI'} 
          />
          <MessageContent 
            markdown 
            className={m.role === 'user' ? 'bg-primary text-primary-foreground' : ''}
            isAnimating={status === 'streaming' && m.id === lastMessageId}
          >
            {m.content}
          </MessageContent>
        </Message>
      ))}
      
      {status === 'submitted' && (
        <Message>
          <MessageAvatar src="https://github.com/shadcn.png" alt="AI" fallback="AI" />
          <div className="flex items-center h-8">
            <Loader variant="typing" size="sm" />
          </div>
        </Message>
      )}
    </div>
  );
}
