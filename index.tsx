import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import AppErrorBoundary from './components/ErrorBoundary/AppErrorBoundary';
import { startDesktopStorage } from './services/desktop';
import { startDiagnostics } from './services/diagnostics';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Mac app: keep a log of errors and hangs, and read the tree from its file before starting.
startDiagnostics();
startDesktopStorage().finally(() => root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </AppErrorBoundary>
  </React.StrictMode>
));
