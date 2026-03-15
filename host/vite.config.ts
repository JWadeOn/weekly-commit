/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// REMOTE_URL is injected at build time via Docker ARG → ENV (browser-facing URL of the remote MFE)
// Must be a full URL with protocol so the browser loads it as a script; Railway env often omits https://
const rawRemote = process.env['REMOTE_URL'] ?? 'http://localhost:3001'
const remoteUrl =
  rawRemote.startsWith('http://') || rawRemote.startsWith('https://')
    ? rawRemote
    : `https://${rawRemote.replace(/^\/+/, '')}`

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        weeklyCommitModule: `${remoteUrl}/assets/remoteEntry.js`,
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    // Required for @originjs/vite-plugin-federation
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
  preview: {
    port: 3000,
    host: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
