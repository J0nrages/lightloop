import { create } from 'zustand'

export type NotificationVariant = 'action' | 'warning' | 'error'

export interface Notification {
  id: string
  message: string
  variant: NotificationVariant
  cta?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  autoDismiss?: number // ms, 0 = no auto dismiss
}

interface NotificationsState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => string
  removeNotification: (id: string) => void
  clearAll: () => void
}

let notificationId = 0

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${++notificationId}`
    const newNotification: Notification = {
      ...notification,
      id,
      dismissible: notification.dismissible ?? true,
      autoDismiss: notification.autoDismiss ?? (notification.variant === 'error' ? 0 : 5000),
    }

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }))

    // Auto dismiss if configured
    if (newNotification.autoDismiss && newNotification.autoDismiss > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, newNotification.autoDismiss)
    }

    return id
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  clearAll: () => {
    set({ notifications: [] })
  },
}))

// Convenience functions
export const notify = {
  info: (message: string, options?: Partial<Omit<Notification, 'id' | 'message' | 'variant'>>) =>
    useNotificationsStore.getState().addNotification({ message, variant: 'action', ...options }),

  warning: (message: string, options?: Partial<Omit<Notification, 'id' | 'message' | 'variant'>>) =>
    useNotificationsStore.getState().addNotification({ message, variant: 'warning', ...options }),

  error: (message: string, options?: Partial<Omit<Notification, 'id' | 'message' | 'variant'>>) =>
    useNotificationsStore.getState().addNotification({ message, variant: 'error', autoDismiss: 0, ...options }),
}
