import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import AppErrorBoundary from './components/ErrorBoundary/AppErrorBoundary';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        appearance={{
          variables: {
            colorBackground: '#0a0a0a',
            colorText: '#ffffff',
            colorPrimary: '#d4af37',
          },
        }}
      >
        <AppErrorBoundary>
          <AppProvider>
            <App />
          </AppProvider>
        </AppErrorBoundary>
      </ClerkProvider>
    ) : (
      <AppErrorBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </AppErrorBoundary>
    )}
  </React.StrictMode>
);
