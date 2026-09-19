# Poner el repositorio en privado (manteniendo el juego en vivo)

El código ya tiene licencia **propietaria** (ver `LICENSE`): copiarlo sin permiso
es una infracción. Esto agrega la barrera práctica: que el código fuente no sea
visible en GitHub, sin perder el link del juego.

> Nota real: el juego es una web. El JavaScript **ya compilado** (minificado)
> que se sirve en el link siempre es descargable por cualquiera que abra la
> página — eso es inevitable en cualquier sitio web. Lo que se protege acá es el
> **código fuente** (TypeScript legible, tests, historial de commits,
> comentarios), que es lo que de verdad facilita copiar el proyecto.

Elegiste **privado + mantener el link**. Hay dos formas:

## Opción A — GitHub Pro (lo más simple, es pago)
1. Pasá tu cuenta a **GitHub Pro** (~4 USD/mes). Pro permite GitHub Pages en
   repos privados.
2. En el repo: **Settings → General → Danger Zone → Change repository
   visibility → Private**.
3. Listo: el repo queda privado y Pages sigue publicando el mismo link.

## Opción B — Fuente privado + sitio público (gratis)
La idea: el repo con el código se vuelve privado, y un **segundo repo público**
sólo guarda el sitio ya compilado (`dist/`), que es lo que Pages publica. Así el
fuente queda oculto y el link sigue vivo, sin pagar.

1. Creá un repo público nuevo y vacío, por ejemplo `nande-hacklab-app`.
2. Activá Pages en ese repo (Settings → Pages → Deploy from branch → `gh-pages`
   o `main`/`docs`), y ajustá `base` en `vite.config.ts` al nombre de ese repo.
3. En el repo privado, un workflow compila y **empuja sólo `dist/`** al repo
   público en cada push a `main` (yo te lo dejo listo si me confirmás el nombre
   del repo público y me das acceso).
4. Poné el repo de código en **privado** (mismo paso del Danger Zone).

Resultado: el fuente vive en el repo privado; el público sólo tiene el bundle
que de todos modos es visible al abrir la web.

## Qué NO cambia
- El APK: se sigue generando por el workflow (en repo privado, Actions gratis
  incluye ~2000 min/mes, de sobra para este proyecto).
- La licencia: aplica igual, repo público o privado.

Cuando decidas A o B, decime y te dejo lo que haga falta (en B, el workflow de
publicación al repo público).
