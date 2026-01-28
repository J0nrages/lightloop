import { describe, it, expect, mock, afterAll } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
describe('Notifications', () => {
  it('renders notifications and allows dismiss', async () => {
    const removeNotificationMock = mock(() => {})

    mock.module('@/stores/notifications', () => ({
      useNotificationsStore: () => ({
        notifications: [
          {
            id: 'n-1',
            message: 'Validation warning',
            variant: 'warning',
            dismissible: true,
            autoDismiss: 0,
          },
        ],
        removeNotification: removeNotificationMock,
      }),
    }))

    const { Notifications } = await import('@/components/Notifications')

    render(<Notifications />)

    expect(screen.getByText('Validation warning')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(removeNotificationMock).toHaveBeenCalledWith('n-1')
  })
})

afterAll(() => {
  mock.restore()
})
