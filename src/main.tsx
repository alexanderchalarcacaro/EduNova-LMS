import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App.tsx';
import './index.css';

// Silenciar los errores inofensivos de WebSocket de Vite por tener HMR deshabilitado
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (event.reason.message?.includes('WebSocket') || event.reason.toString().includes('WebSocket'))) {
    event.preventDefault();
  }
});

// Sobrescribir console.warn para ocultar la advertencia de desarrollo de Clerk si es necesario
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Clerk has been loaded with development keys')) {
    return;
  }
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[vite] failed to connect to websocket')) {
    return;
  }
  originalError(...args);
};

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/" 
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: '#2563EB' }
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
);

