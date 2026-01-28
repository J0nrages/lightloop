import type { Config } from 'tailwindcss'
import sharedConfig from '@lightloop/config/tailwind'

const config: Config = {
  ...sharedConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@clerk/**/*.{js,ts,jsx,tsx}',
    '../../packages/**/*.{js,ts,jsx,tsx}'
  ],
}

export default config