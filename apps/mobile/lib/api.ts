import Constants from 'expo-constants'

const normalizeDevOrigin = (value: string) => {
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('exp://') || value.startsWith('exps://')) {
    return value.replace(/^exps?:\/\//, 'http://')
  }
  return `http://${value}`
}

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`

  if (process.env.NODE_ENV === 'development') {
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl
    if (!hostUri) {
      throw new Error('Unable to determine Expo host URI for API requests')
    }
    return `${normalizeDevOrigin(hostUri)}${path}`
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL environment variable is not defined')
  }
  return `${baseUrl}${path}`
}
