import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c1c22',
            color: '#f0ede8',
            border: '1.5px solid #2a2a35',
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
);
