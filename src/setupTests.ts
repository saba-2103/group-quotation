import '@testing-library/jest-dom'

// Radix UI uses pointer events which jsdom does not implement.
// These stubs allow Radix Select, Dialog, and Sheet to open in tests.
window.PointerEvent = class PointerEvent extends MouseEvent {} as any

HTMLElement.prototype.hasPointerCapture = () => false
HTMLElement.prototype.setPointerCapture = () => {}
HTMLElement.prototype.releasePointerCapture = () => {}

// Radix UI uses scrollIntoView in Select dropdowns
Element.prototype.scrollIntoView = jest.fn()

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
