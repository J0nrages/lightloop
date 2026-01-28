import { Stack, Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { ActivityIndicator, View } from 'react-native'

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    )
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
