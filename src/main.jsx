import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// This is the standard entry point for a React application.
// It finds the HTML element with the id 'root' and renders your main App component inside it.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
