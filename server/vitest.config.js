/** @type {import('vitest/config').UserConfig} */
export default {
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/app.js', 'src/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
}
