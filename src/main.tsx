import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Mounting App...');
const container = document.getElementById('root');

if (container) {
  try {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('React render initiated.');
  } catch (err) {
    console.error('React Render Error:', err);
    container.innerHTML = `<div style="padding: 20px; color: red;"><h1>React Render Failed</h1><pre>${err}</pre></div>`;
  }
} else {
  console.error('Root container not found!');
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Critical Error: #root element missing.</h1></div>`;
}
