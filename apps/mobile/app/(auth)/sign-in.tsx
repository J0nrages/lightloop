import { useState } from 'react'
import { Link, router } from 'expo-router'
import { useSignIn } from '@clerk/clerk-expo'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/text-input'
import { Screen } from '@/components/ui/screen'
import { Title } from '@/components/ui/title'
import { Body } from '@/components/ui/body'
import { ErrorText } from '@/components/ui/error-text'
import { Stack } from '@/components/ui/stack'

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignIn = async () => {
    if (!isLoaded || isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/(tabs)')
        return
      }

      setError('Additional verification is required. Please check your email.')
    } catch (err: any) {
      const message = err?.errors?.[0]?.message ?? 'Unable to sign in'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen>
      <Title>Welcome back</Title>
      <Body className="mt-2">
        Sign in to continue your Lightloop conversations.
      </Body>

      <Stack className="mt-8">
        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button title={isSubmitting ? 'Signing in…' : 'Sign in'} onPress={handleSignIn} />
      </Stack>

      <Body className="mt-6">
        New here?{' '}
        <Link href="/(auth)/sign-up" className="text-primary">
          Create an account
        </Link>
      </Body>
    </Screen>
  )
}
