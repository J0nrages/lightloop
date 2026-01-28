import { TextInput, type TextInputProps } from 'react-native'

type InputProps = TextInputProps & {
  className?: string
}

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      className={join(
        'w-full rounded-xl border border-input bg-card px-3 py-2 text-base text-foreground',
        className
      )}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  )
}
