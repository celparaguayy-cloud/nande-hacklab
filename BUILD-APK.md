# Cómo generar el APK de ÑANDE Hacklab

La app es una web (Vite + React) empaquetable como APK con **Capacitor**.
Este archivo deja todo listo; solo falta correr los comandos en una
computadora que tenga **Node**, **Java (JDK 17)** y el **Android SDK**
(se instalan con Android Studio).

## 0. Probar YA sin APK (recomendado para la demo)

No hace falta APK para probar. La app es una **PWA instalable**:

```bash
npm install
npm run build
npm run preview -- --host
```

Abrí en el celular la URL que muestra (la de tu red local, `http://192.168.x.x:4173`),
y en el menú del navegador elegí **"Agregar a pantalla de inicio"**.
Queda como una app (ícono, pantalla completa) y funciona sin conexión.

## 1. Instalar Capacitor (una sola vez)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

## 2. Agregar la plataforma Android (una sola vez)

```bash
npm run build
npx cap add android
```

## 3. Cada vez que cambie la app

```bash
npm run build
npx cap sync android
```

## 4. Generar el APK

Opción A — con Android Studio (más simple):

```bash
npx cap open android
```

En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

Opción B — por línea de comandos:

```bash
cd android
./gradlew assembleDebug
```

El APK de depuración queda en:
`android/app/build/outputs/apk/debug/app-debug.apk`

Ese archivo se copia al teléfono y se instala (hay que permitir
"instalar apps de orígenes desconocidos").

## Íconos del APK

Para íconos nativos, poné una imagen cuadrada en `resources/icon.png`
(1024×1024) y corré:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --android
```

## Notas

- La app funciona 100% offline: todo el mundo virtual es local.
- No hace ninguna conexión a Internet real (el aislamiento está en el código).
- `capacitor.config.json` ya apunta a `dist` como carpeta web.
