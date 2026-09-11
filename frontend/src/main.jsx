import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } else {
    console.error('FATAL: #root container element missing from document.');
  }
} catch (mountErr) {
  console.error('[VoxGuard Mount Failure]:', mountErr);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#070a12;color:#ffffff;text-align:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
        <div style="width:52px;height:52px;border-radius:14px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;">⚠️</div>
        <h2 style="font-size:1.2rem;font-weight:600;margin-bottom:8px;">VoxGuard encountered a browser compatibility issue.</h2>
        <p style="font-size:0.85rem;color:#94a3b8;max-width:380px;margin-bottom:20px;">The security console could not start in this browser environment. Tap below to reload.</p>
        <button onclick="window.location.reload()" style="background:#00f0ff;color:#070a12;border:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.9rem;cursor:pointer;">Reload Application</button>
      </div>
    `;
  }
}
