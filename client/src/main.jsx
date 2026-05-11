import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BlocksProvider } from './state/BlocksContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BlocksProvider>
        <App />
      </BlocksProvider>
    </BrowserRouter>
  </React.StrictMode>
);
