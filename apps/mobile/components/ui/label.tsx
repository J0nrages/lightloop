import { Text, type TextProps } from 'react-native'

type LabelProps = TextProps & { className?: string }

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Label({ className, ...props }: LabelProps) {
  return <Text className={join('text-xs uppercase tracking-wide text-muted-foreground', className)} {...props} />
}
