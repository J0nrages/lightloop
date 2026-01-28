import { View, type ViewProps } from 'react-native'

type StackProps = ViewProps & { className?: string }

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Stack({ className, ...props }: StackProps) {
  return <View className={join('gap-4', className)} {...props} />
}
