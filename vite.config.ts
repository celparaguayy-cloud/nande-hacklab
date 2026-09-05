import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: la app funciona servida desde cualquier ruta, como
  // archivo local y dentro del APK (Capacitor sirve desde el sistema de
  // archivos, no desde la raíz de un dominio).
  base: './',
  plugins: [react()],
})
