import { Component } from 'react'
import { Notice } from '../ui/bits.jsx'

/**
 * Catches errors thrown while RENDERING any component below it (and in their lifecycle
 * methods) and shows a recovery screen instead of letting React unmount the whole app to a
 * blank white page.
 *
 * What it does NOT catch (React limitation): errors in event handlers, in async code such as
 * fetch().then(), and in the boundary itself. Those still need try/catch or .catch().
 *
 * Error boundaries must be class components; there is no hook equivalent.
 *
 *   resetKey - when this value changes (App passes the current path) the boundary clears its
 *              error, so navigating away from a broken page gives the next page a fresh start.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught a render error:', error, info?.componentStack)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.reset()
  }

  // Re-render the children. If whatever broke is still broken, the boundary simply catches again.
  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="eb">
        <Notice
          title="Something went wrong."
          message="This page hit an unexpected error. You can try again, or go back to the home page."
          onRetry={this.reset}
        />
        <div className="eb__actions">
          <a className="btn btn--quiet btn--sm" href="/">Back to home</a>
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
        <details className="eb__details">
          <summary>Error details</summary>
          <pre>{String(error?.message || error)}</pre>
        </details>
      </div>
    )
  }
}
