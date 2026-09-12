import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registro del service worker: permite instalar la PWA y jugar sin conexión.
// OJO: dentro de la app Android (Capacitor) NO se registra. El WebView ya
// sirve todo desde el bundle local; un service worker ahí suele provocar
// pantalla en blanco o 404 al tomar versiones cacheadas. Por eso se limita a
// la web servida por http/https en un navegador real.
const isCapacitor =
  typeof (window as { Capacitor?: unknown }).Capacitor !== 'undefined' ||
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'file:'

if ('serviceWorker' in navigator && !isCapacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Sin service worker la app igual funciona, solo que no offline.
    })
  })
} else if ('serviceWorker' in navigator && isCapacitor) {
  // Si un SW quedó registrado de una versión web previa, lo quitamos dentro
  // del APK para que no interfiera con el bundle nativo.
  navigator.serviceWorker.getRegistrations?.().then((rs) => {
    rs.forEach((r) => r.unregister())
  }).catch(() => {})
}
