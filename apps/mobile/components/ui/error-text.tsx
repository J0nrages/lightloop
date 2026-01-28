import { Text, type TextProps } from 'react-native'

type ErrorTextProps = TextProps & { className?: string }

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function ErrorText({ className, ...props }: ErrorTextProps) {
  return <Text className={join('text-sm text-destructive', className)} {...props} />
}
