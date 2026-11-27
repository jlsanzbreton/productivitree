import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import AppErrorBoundary from './components/ErrorBoundary/AppErrorBoundary';
import { startDesktopStorage } from './services/desktop';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// In the Mac app the tree lives in a file: read it before the app starts.
startDesktopStorage().finally(() => root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </AppErrorBoundary>
  </React.StrictMode>
));
