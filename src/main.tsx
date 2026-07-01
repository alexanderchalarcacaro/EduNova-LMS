import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider, useUser, useClerk } from '@clerk/clerk-react'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { GlobalProvider } from './context/GlobalContext'
import App from './App.tsx'
import './assets/index.css'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkAppWrapper() {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();
  return (
    <App 
      guestMode={false} 
      clerkUser={user} 
      clerkSignOut={clerk.signOut} 
      clerkLoaded={isLoaded} 
      clerkOpenSignIn={() => clerk.openSignIn()}
    />
  );
}

// Filter system warnings to keep the console clean and professional
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const firstArg = args[0];
  if (typeof firstArg === 'string') {
    if (
      firstArg.includes('Clerk: Clerk has been loaded with development keys') ||
      firstArg.includes('React Router Future Flag Warning') ||
      firstArg.includes('v7_relativeSplatPath')
    ) {
      return;
    }
  }
  originalWarn(...args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <GlobalProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {clerkPubKey ? (
            <ClerkProvider publishableKey={clerkPubKey}>
              <ClerkAppWrapper />
            </ClerkProvider>
          ) : (
            <App guestMode={true} />
          )}
        </BrowserRouter>
      </GlobalProvider>
    </Provider>
  </React.StrictMode>,
)

