import React from 'react';
import ReactDOM from 'react-dom/client';
import '../src/index.css';
import AdminApp from './AdminApp';
import { QueryProvider } from '../src/providers/QueryProvider';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryProvider>
      <AdminApp />
    </QueryProvider>
  </React.StrictMode>
);
