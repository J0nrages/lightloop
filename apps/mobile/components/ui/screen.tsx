import { View, type ViewProps } from 'react-native'

type ScreenProps = ViewProps & { className?: string }

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Screen({ className, ...props }: ScreenProps) {
  return <View className={join('flex-1 bg-background px-6 pt-16', className)} {...props} />
}
