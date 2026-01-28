import { Text, type TextProps } from 'react-native'

type TitleProps = TextProps & { className?: string }

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Title({ className, ...props }: TitleProps) {
  return <Text className={join('text-3xl font-semibold text-foreground', className)} {...props} />
}
