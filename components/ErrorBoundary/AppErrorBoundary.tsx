import React from 'react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Keep minimal logging, avoid leaking sensitive runtime state.
    console.error('Productivitree rendering error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-2xl font-semibold">Productivitree hit an unexpected error.</h1>
            <p className="text-sm text-slate-300">
              Refresh the page. If the issue persists, clear local data from browser storage and retry.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
