import { describe, it, expect, mock, afterEach } from 'bun:test'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input'

describe('PromptInput', () => {
  afterEach(() => {
    cleanup()
  })

  it('submits text content', async () => {
    const onSubmit = mock(() => {})

    const { container } = render(
      <PromptInputProvider initialInput="Hello world">
        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea />
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    )

    const form = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    const [payload] = onSubmit.mock.calls[0] ?? []
    expect(payload).toEqual(
      expect.objectContaining({
        text: 'Hello world',
        files: [],
      })
    )
  })

  it('submits on Enter key press', async () => {
    const onSubmit = mock(() => {})

    const { container } = render(
      <PromptInputProvider initialInput="Send me">
        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea />
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    )

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('calls onError when file type is rejected', async () => {
    const onError = mock(() => {})

    const { container } = render(
      <PromptInput accept="image/*" onError={onError} onSubmit={() => {}}>
        <PromptInputTextarea />
        <PromptInputFooter>
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })
  })
})
