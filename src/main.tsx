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
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // Buscar actualizaciones al abrir: si hay una versión nueva esperando,
      // que tome control y se recargue una sola vez. Así el usuario NO queda
      // pegado a una versión vieja con bugs ya arreglados.
      reg.update().catch(() => {})
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing
        if (!nw) return
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // Hay una versión nueva instalada y ya había una controlando: recargar.
            window.location.reload()
          }
        })
      })
    }).catch(() => {
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
