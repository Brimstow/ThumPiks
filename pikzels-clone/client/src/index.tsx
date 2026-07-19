import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import { initDarkMode } from './hooks/useDarkMode';

// Apply stored color mode before first render to prevent flash
initDarkMode();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>
);
