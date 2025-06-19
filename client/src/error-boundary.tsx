import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('Error boundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[hsl(50,85%,95%)] to-[hsl(30,85%,90%)] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[hsl(201,30%,25%)] mb-4">
              Something went wrong
            </h2>
            <button
              className="bg-[hsl(50,85%,75%)] text-[hsl(201,30%,25%)] px-4 py-2 rounded"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;