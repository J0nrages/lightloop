import type { Config } from 'tailwindcss'
import sharedConfig from '@lightloop/config/tailwind'

const config: Config = {
  darkMode: sharedConfig.darkMode,
  theme: sharedConfig.theme,
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  plugins: [],
}

export default config
