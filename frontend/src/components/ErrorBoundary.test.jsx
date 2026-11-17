import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from './ErrorBoundary.jsx'

// A child that throws while rendering whenever `broken.value` is true.
const broken = { value: true }
function Bomb() {
  if (broken.value) throw new Error('kaboom')
  return <p>All good</p>
}

let consoleError

beforeEach(() => {
  broken.value = true
  // React and the boundary both log caught errors; keep the test output clean but still assert on it.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    broken.value = false
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the recovery UI instead of a blank page when a child throws while rendering', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    expect(screen.getByText('kaboom')).toBeInTheDocument()
    expect(screen.queryByText('All good')).not.toBeInTheDocument()
  })

  it('logs the error so it is not swallowed silently', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)

    const logged = consoleError.mock.calls.some(([first]) => String(first).includes('ErrorBoundary caught a render error'))
    expect(logged).toBe(true)
  })

  it('Try again re-renders the children once the cause is fixed', async () => {
    const user = userEvent.setup()
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    broken.value = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Try again shows the recovery UI again if the child still throws', async () => {
    const user = userEvent.setup()
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
  })

  it('clears the error when resetKey changes (e.g. the user navigates to another page)', () => {
    const { rerender } = render(<ErrorBoundary resetKey="/listings"><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    broken.value = false
    rerender(<ErrorBoundary resetKey="/rent"><Bomb /></ErrorBoundary>)

    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('keeps showing the error while resetKey stays the same', () => {
    const { rerender } = render(<ErrorBoundary resetKey="/listings"><Bomb /></ErrorBoundary>)

    broken.value = false
    rerender(<ErrorBoundary resetKey="/listings"><Bomb /></ErrorBoundary>)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
