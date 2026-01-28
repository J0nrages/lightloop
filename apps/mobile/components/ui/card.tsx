import { View, type ViewProps } from 'react-native'

type CardProps = ViewProps & { className?: string }

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={join('rounded-2xl border border-border bg-card p-4', className)}
      {...props}
    />
  )
}
