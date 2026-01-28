import { useState } from 'react'
import { Link, router } from 'expo-router'
import { useSignUp } from '@clerk/clerk-expo'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/text-input'
import { Screen } from '@/components/ui/screen'
import { Title } from '@/components/ui/title'
import { Body } from '@/components/ui/body'
import { ErrorText } from '@/components/ui/error-text'
import { Stack } from '@/components/ui/stack'

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'verify'>('form')

  const handleSignUp = async () => {
    if (!isLoaded || isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      await signUp.create({
        emailAddress: email,
        password,
      })

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStep('verify')
    } catch (err: any) {
      const message = err?.errors?.[0]?.message ?? 'Unable to sign up'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async () => {
    if (!isLoaded || isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/(tabs)')
        return
      }
      setError('Verification not complete. Please try again.')
    } catch (err: any) {
      const message = err?.errors?.[0]?.message ?? 'Unable to verify email'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen>
      <Title>Create your account</Title>
      <Body className="mt-2">
        Start building your hiring workspace in Lightloop.
      </Body>

      {step === 'form' ? (
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
          <Button title={isSubmitting ? 'Creating…' : 'Create account'} onPress={handleSignUp} />
        </Stack>
      ) : (
        <Stack className="mt-8">
          <Body>We sent a verification code to {email}.</Body>
          <Input placeholder="Verification code" value={code} onChangeText={setCode} />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button title={isSubmitting ? 'Verifying…' : 'Verify email'} onPress={handleVerify} />
        </Stack>
      )}

      <Body className="mt-6">
        Already have an account?{' '}
        <Link href="/(auth)/sign-in" className="text-primary">
          Sign in
        </Link>
      </Body>
    </Screen>
  )
}
