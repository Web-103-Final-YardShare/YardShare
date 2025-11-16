import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['yardshare-frontend.onrender.com'],
    host: true,
  },
  server: {
    allowedHosts: ['yardshare-frontend.onrender.com'],
    host: true,
  },
})
