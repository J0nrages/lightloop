import { Text, type TextProps } from 'react-native'

type BodyProps = TextProps & { className?: string }

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Body({ className, ...props }: BodyProps) {
  return <Text className={join('text-sm text-muted-foreground', className)} {...props} />
}
