/**
 * Vitest + React Testing Library global setup.
 * - Extends vitest's expect with jest-dom matchers (toBeInTheDocument, etc.)
 * - Mocks GSAP and @gsap/react so animation hooks are no-ops during tests.
 */
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Suppress GSAP warnings — we're replacing the library with stubs
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    set: vi.fn(),
    fromTo: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis()
    }))
  }
}))

vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn()
}))
