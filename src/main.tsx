import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import App from './App';
import './index.css';
import { handleError, secureLog } from './lib/error';

// Error handling
window.addEventListener('error', (event) => {
  secureLog('error', 'Global error:', 'Main');
  handleError(event.error, 'Main');
});

window.addEventListener('unhandledrejection', (event) => {
  secureLog('error', 'Unhandled promise rejection:', 'Main');
  handleError(event.reason, 'Main');
});

// Create root element if it doesn't exist
const container = document.getElementById('root');
if (!container) {
  secureLog('error', 'Root element not found!', 'Main');
  throw new Error('Root element not found!');
}

// Mount the application
const root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
