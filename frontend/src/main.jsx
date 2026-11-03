import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LocaleProvider } from './features/v2/locale';

import './styles/tokens.css';
import './styles/glass.css';
import './styles/base.css';
import './styles/motion.css';
import './styles/enterprise.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocaleProvider><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter></LocaleProvider>
  </React.StrictMode>
);
