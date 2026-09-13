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

/**
 * Auto-actualización a prueba de balas.
 *
 * Problema real: usuarios quedaban PEGADOS a una versión vieja (el service
 * worker no cambiaba de bytes, así que el navegador no detectaba "actualización"
 * y la app instalada nunca se refrescaba). Esto lo resuelve a nivel de app:
 * comparamos el hash del JS que está corriendo (import.meta.url) con el que
 * anuncia el index.html EN VIVO. Si difieren, hay una versión nueva publicada:
 * limpiamos caches, pedimos al SW que se actualice y recargamos una sola vez.
 * Funciona aunque el SW sea viejo, siempre que haya red.
 */
async function selfHealToLatest(): Promise<void> {
  if (isCapacitor) return
  try {
    const runningHash = import.meta.url.match(/index-([\w-]+)\.js/)?.[1]
    if (!runningHash) return
    const html = await fetch('./index.html', { cache: 'no-store' }).then((r) => r.text())
    const liveHash = html.match(/index-([\w-]+)\.js/)?.[1]
    if (!liveHash || liveHash === runningHash) return
    // Hay una versión nueva en el servidor y NO es la que corre: refrescar.
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.()
      await reg?.update()
    } catch { /* seguimos igual */ }
    // Evita bucles: sólo recargamos una vez por versión detectada.
    const seen = sessionStorage.getItem('nande-updated-to')
    if (seen === liveHash) return
    sessionStorage.setItem('nande-updated-to', liveHash)
    window.location.reload()
  } catch {
    /* sin red: seguimos con lo que hay (offline-first) */
  }
}

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

// Chequeo de versión a nivel de app: al abrir y cada 5 min, si el servidor
// publicó una versión más nueva que la que corre, se auto-refresca. Así nadie
// queda pegado a un build viejo aunque el service worker no coopere.
if (!isCapacitor) {
  window.addEventListener('load', () => {
    void selfHealToLatest()
    setInterval(() => void selfHealToLatest(), 5 * 60 * 1000)
  })
}
