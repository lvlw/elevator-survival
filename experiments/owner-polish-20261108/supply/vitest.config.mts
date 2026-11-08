import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['experiments/owner-polish-20261108/supply/supply-audit.test.tsx'],
  },
})
