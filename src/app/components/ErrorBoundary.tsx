import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary. Catches uncaught render-tree errors and renders a
 * generic fallback so the app does not crash to a blank screen — and so stack
 * traces never bleed into the DOM in production.
 *
 * Detailed error info is forwarded to the console only in dev. In production,
 * wire this up to a remote error reporter (Sentry, etc.) when one is added.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '32rem',
          margin: '4rem auto',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          The application encountered an unexpected error. Please reload the
          page. If the problem persists, contact your administrator.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '0.25rem',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
