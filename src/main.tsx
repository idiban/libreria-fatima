import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🛑 BLOQUEO NUCLEAR DE SERVICE WORKERS INYECTADOS
if ('serviceWorker' in navigator) {
  // 1. Sobreescribimos la función nativa del navegador para que la plataforma no pueda usarla
  navigator.serviceWorker.register = async () => {
    console.warn('Intento de registro de Service Worker bloqueado por seguridad.');
    return null as any;
  };
  
  // 2. Aniquilamos cualquier Service Worker zombi que ya se haya instalado
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister().then(() => {
        console.log('Service Worker zombi eliminado de raíz.');
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);