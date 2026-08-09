import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RouterProvider } from './router';
import './styles/tokens.css';
import './styles/globals.css';
import './styles/components.css';
import './styles/responsive.css';
import './styles/screens.css';
import './styles/workflow.css';
import './styles/polish.css';
import './styles/surfaces.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </StrictMode>,
);
