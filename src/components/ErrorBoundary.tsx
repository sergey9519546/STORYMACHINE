import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-16 font-mono">
          <div className="brutal-border-thick brutal-shadow p-12 max-w-xl w-full space-y-6">
            <h1 className="text-3xl font-bold uppercase tracking-widest text-black border-b-4 border-black pb-4">
              Something went wrong
            </h1>
            <pre className="text-sm text-red-600 bg-gray-50 p-4 overflow-auto border-2 border-black">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest hover:bg-[#FF4444] transition-colors brutal-border"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
