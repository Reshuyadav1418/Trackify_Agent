import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Trackify ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neu-bg flex items-center justify-center p-6 text-neu-primary">
          <div className="neu-modal-card max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-2xl neu-inset mx-auto flex items-center justify-center text-rose-500 mb-5">
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-xl font-extrabold text-neu-primary mb-2">
              Something went wrong
            </h2>

            <p className="text-xs text-neu-secondary mb-6 font-medium leading-relaxed">
              An unexpected error occurred while rendering this page. Refreshing usually resolves this issue.
            </p>

            {this.state.error && (
              <div className="neu-inset-sm p-3 rounded-xl text-[11px] font-mono text-rose-400 text-left mb-6 max-h-32 overflow-y-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                type="button"
                className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-2"
              >
                <RotateCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                type="button"
                className="btn-secondary text-xs py-2 px-5 font-bold flex items-center gap-2"
              >
                <Home size={14} />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
