import { describe, it, expect, mock, afterAll } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const setSelectedModelMock = mock(() => {})
const setModeMock = mock(() => {})

const models = [
  { id: 'model-a', name: 'Model A', provider: 'openai' },
  { id: 'model-b', name: 'Model B', provider: 'openai' },
]

mock.module('@/stores/model', () => ({
  AVAILABLE_MODELS: models,
  useModelStore: () => ({
    selectedModel: models[0],
    setSelectedModel: setSelectedModelMock,
  }),
}))

mock.module('@/stores/layout', () => ({
  useLayoutStore: () => ({
    mode: 'centered',
    setMode: setModeMock,
  }),
}))

mock.module('@/components/ui/chat-container', () => ({
  ChatContainerRoot: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ChatContainerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

mock.module('@/components/ai-elements/prompt-input', () => ({
  PromptInput: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputTools: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputActionMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputActionMenuTrigger: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children ?? 'menu'}</button>
  ),
  PromptInputActionMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputActionAddAttachments: () => <button type="button">Attach</button>,
  PromptInputSelect: ({
    onValueChange,
    children,
  }: {
    onValueChange?: (value: string) => void
    children: React.ReactNode
  }) => (
    <div>
      <button type="button" data-testid="select-model-b" onClick={() => onValueChange?.('model-b')}>
        select
      </button>
      {children}
    </div>
  ),
  PromptInputSelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputSelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputSelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputSelectValue: () => <span>value</span>,
  PromptInputSubmit: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      send
    </button>
  ),
}))

const { ChatLayout } = await import('@/components/chat/ChatLayout')

describe('ChatLayout', () => {
  it('updates selected model when the prompt select changes', () => {
    render(
      <ChatLayout
        input=""
        onInputChange={() => {}}
        onSubmit={() => {}}
        status={'ready' as any}
      >
        <div>Messages</div>
      </ChatLayout>
    )

    fireEvent.click(screen.getByTestId('select-model-b'))

    expect(setSelectedModelMock).toHaveBeenCalledWith(models[1])
  })
})

afterAll(() => {
  mock.restore()
})
