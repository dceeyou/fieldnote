import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App.tsx'
import { ThemeProvider } from './app/ThemeProvider.tsx'
import './styles/index.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled app error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '3rem auto', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#dc2626' }}>Application Encountered an Error</h2>
          <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>
            {import.meta.env.DEV
              ? this.state.error?.message || 'An unexpected error occurred during rendering.'
              : 'An unexpected error occurred. Please reload the application to continue.'}
          </p>
          {import.meta.env.DEV && this.state.error?.stack && (
            <pre
              style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '0.5rem',
                overflow: 'auto',
                fontSize: '0.8rem',
              }}
            >
              {this.state.error.stack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#2b5134',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
)

// Register PWA Service Worker for offline capability & desktop/mobile installation
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('AgriFlow updated. Refresh to apply latest version.')
              }
            })
          }
        })
      })
      .catch((err) => {
        console.warn('Service Worker registration skipped or failed:', err)
      })
  })
}

