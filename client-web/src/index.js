// client-web/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.css'; // <<< IMPORT THE GENERATED TAILWIND CSS
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);