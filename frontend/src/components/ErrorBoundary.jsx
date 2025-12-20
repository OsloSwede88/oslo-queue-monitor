import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console or error reporting service
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    // Reset the error boundary and reload the page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
            background: 'rgba(30, 30, 58, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#ef4444'
            }}>
              Oops! Something went wrong
            </h1>
            <p style={{
              fontSize: '1rem',
              marginBottom: '2rem',
              opacity: 0.8,
              lineHeight: 1.6
            }}>
              We're sorry, but something unexpected happened.
              Please try refreshing the page or contact support if the problem persists.
            </p>

            <details style={{
              marginBottom: '2rem',
              textAlign: 'left',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}>
              <summary style={{
                cursor: 'pointer',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#fbbf24'
              }}>
                Error Details
              </summary>
              {this.state.error && (
                <div style={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginTop: '0.5rem',
                  opacity: 0.9
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && this.state.errorInfo.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </details>

            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#fff',
                background: 'linear-gradient(135deg, #9D4EDD 0%, #7209B7 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(157, 78, 221, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(157, 78, 221, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(157, 78, 221, 0.3)';
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
