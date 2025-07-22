import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

// Add error logging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Check if root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('Root element not found!');
  throw new Error('Root element not found!');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
