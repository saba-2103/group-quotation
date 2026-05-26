import '@testing-library/jest-dom'

// Radix UI uses pointer events which jsdom does not implement.
// These stubs allow Radix Select, Dialog, and Sheet to open in tests.
window.PointerEvent = class PointerEvent extends MouseEvent {} as any

HTMLElement.prototype.hasPointerCapture = () => false
HTMLElement.prototype.setPointerCapture = () => {}
HTMLElement.prototype.releasePointerCapture = () => {}

// Radix UI uses scrollIntoView in Select dropdowns
Element.prototype.scrollIntoView = jest.fn()

// jsdom does not implement window.matchMedia. Default to "desktop" (mq:false)
// so components using useIsMobile() render the desktop variant in tests.
// Individual tests can override via window.matchMedia = jest.fn(() => ...).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),       // deprecated, kept for legacy callers
    removeListener: jest.fn(),    // deprecated, kept for legacy callers
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
