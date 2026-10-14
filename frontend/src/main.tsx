import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { queryClient } from './api/consultas';
import { App } from './App';
import { AvisosProvider } from './components/Avisos';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AvisosProvider>
          <App />
        </AvisosProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
