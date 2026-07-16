import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '400px', padding: '40px',
          textAlign: 'center', color: '#f8fafc', background: '#0a0a0a',
          borderRadius: '12px', border: '1px solid #1f1f1f', margin: '20px'
        }}>
          <AlertTriangle size={48} color='#ef4444' style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Oops! Algo deu errado.</h2>
          <p style={{ color: '#a1a1aa', marginBottom: '24px', maxWidth: '400px' }}>
            Tivemos um problema inesperado ao carregar esta parte da página.
            Sua conexão pode ter oscilado ou ocorreu uma falha de sincronização.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '1rem', fontWeight: '500', cursor: 'pointer'
            }}
          >
            <RefreshCcw size={16} />
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
