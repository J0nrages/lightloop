import { Pressable, Text, type PressableProps } from 'react-native'

type ButtonProps = PressableProps & {
  title: string
  variant?: 'primary' | 'secondary'
  className?: string
}

const join = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(' ')

export function Button({ title, variant = 'primary', className, disabled, ...props }: ButtonProps) {
  return (
    <Pressable
      className={join(
        'items-center justify-center rounded-xl px-4 py-3',
        variant === 'primary' ? 'bg-primary' : 'bg-card',
        disabled ? 'opacity-60' : undefined,
        className
      )}
      disabled={disabled}
      {...props}
    >
      <Text className={join('text-sm font-semibold', variant === 'primary' ? 'text-primary-foreground' : 'text-foreground')}>
        {title}
      </Text>
    </Pressable>
  )
}
