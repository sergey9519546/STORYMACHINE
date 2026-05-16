import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
  errorTime: string | null;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to unsigned hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorTime: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorTime: new Date().toISOString() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught UI error:", error, info.componentStack);
  }

  handleCopyError = () => {
    const { error, errorTime } = this.state;
    if (!error) return;
    const details = JSON.stringify({
      message: error.message,
      stack: error.stack,
      time: errorTime,
    });
    navigator.clipboard.writeText(details).catch(() => {
      // Fallback: do nothing silently
    });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const { error, errorTime } = this.state;
      const errorCode = hashString(error.message).slice(0, 8).toUpperCase();

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-white flex flex-col items-center justify-center p-16 font-mono"
        >
          <div className="brutal-border-thick brutal-shadow p-12 max-w-xl w-full space-y-6">
            <h1 className="text-3xl font-bold uppercase tracking-widest text-black border-b-4 border-black pb-4">
              Something went wrong
            </h1>
            <pre className="text-sm text-red-600 bg-gray-50 p-4 overflow-auto border-2 border-black">
              {error.message}
            </pre>
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
              Error code: <span className="text-black font-bold">{errorCode}</span>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => this.setState({ error: null, errorTime: null })}
                className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest hover:bg-[#FF4444] transition-colors brutal-border"
              >
                Try Again
              </button>
              <button
                onClick={this.handleCopyError}
                className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors brutal-border border-2 border-black"
              >
                Copy Error Details
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors brutal-border border-2 border-black"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
