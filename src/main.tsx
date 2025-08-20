import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

// Silence all console output in the browser to avoid exposing logs
// This overrides console methods with no-ops for this runtime session.
(() => {
  const noop = () => {};
  try { (console as any).log = noop; } catch {}
  try { (console as any).warn = noop; } catch {}
  try { (console as any).error = noop; } catch {}
  try { (console as any).info = noop; } catch {}
  try { (console as any).debug = noop; } catch {}
})();

// Check if root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found!');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
