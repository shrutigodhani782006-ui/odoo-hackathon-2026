import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Apply saved theme before first render to prevent flash
if (localStorage.getItem('fleetflow_theme') === 'light') {
  document.body.classList.add('light');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
