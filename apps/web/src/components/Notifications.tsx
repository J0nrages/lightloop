import { useNotificationsStore } from '@/stores/notifications'
import { SystemMessage } from '@/components/ui/system-message'
import { X } from 'lucide-react'

export function Notifications() {
  const { notifications, removeNotification } = useNotificationsStore()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="animate-in slide-in-from-right-5 fade-in duration-300"
        >
          <SystemMessage
            variant={notification.variant}
            fill
            cta={notification.cta}
            className="shadow-lg relative pr-8"
          >
            {notification.message}
            {notification.dismissible && (
              <button
                onClick={() => removeNotification(notification.id)}
                className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            )}
          </SystemMessage>
        </div>
      ))}
    </div>
  )
}
