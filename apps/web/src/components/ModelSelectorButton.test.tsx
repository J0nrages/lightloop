import { describe, it, expect, mock, afterAll } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const setSelectedModelMock = mock(() => {})
const models = [
  { id: 'model-a', name: 'Model A', provider: 'openai', description: 'A' },
  { id: 'model-b', name: 'Model B', provider: 'openai', description: 'B' },
]

mock.module('@/stores/model', () => ({
  AVAILABLE_MODELS: models,
  useModelStore: () => ({
    selectedModel: models[0],
    setSelectedModel: setSelectedModelMock,
  }),
}))

mock.module('@/components/ai-elements/model-selector', () => ({
  ModelSelector: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ModelSelectorTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ModelSelectorContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ModelSelectorInput: () => <input aria-label="Search models" />,
  ModelSelectorList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ModelSelectorEmpty: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ModelSelectorGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode
    heading?: string
  }) => (
    <div>
      {heading ? <div>{heading}</div> : null}
      {children}
    </div>
  ),
  ModelSelectorItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode
    onSelect?: () => void
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  ModelSelectorLogo: () => <span data-testid="logo" />,
  ModelSelectorName: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))

const { ModelSelectorButton } = await import('@/components/ModelSelectorButton')

describe('ModelSelectorButton', () => {
  it('selects a model from the list', () => {
    render(<ModelSelectorButton />)

    fireEvent.click(screen.getByText('Model B'))

    expect(setSelectedModelMock).toHaveBeenCalledWith(models[1])
  })
})

afterAll(() => {
  mock.restore()
})
