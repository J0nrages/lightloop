import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'

const shimPath = fileURLToPath(
  new URL('./src/lib/use-sync-external-store-shim.ts', import.meta.url)
)
const shimWithSelectorPath = fileURLToPath(
  new URL('./src/lib/use-sync-external-store-with-selector-shim.ts', import.meta.url)
)

const config = defineConfig({
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
      {
        find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
        replacement: shimWithSelectorPath,
      },
      {
        find: /^use-sync-external-store\/shim(\/index\.js)?$/,
        replacement: shimPath,
      },
    ],
  },
  plugins: [
    devtools(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
