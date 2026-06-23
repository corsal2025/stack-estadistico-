import react from '@vitejs/plugin-react'

/** @type {import('vitest/config').UserConfig} */
export default {
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/components/**/*.{js,jsx}'],
      exclude: ['src/__tests__/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  }
}
