# Servidor de comunidad de ÑANDE (referencia, gratis para empezar)

Este es el backend del **multijugador de comunidad**: un mundo online opcional
donde entra quien quiere, ve cuánta gente hay conectada y compite en un ranking
global en vivo. Es un servidor mínimo, **cero dependencias** (sólo Node
nativo), pensado para correr gratis.

> El hacking del juego **siempre** ocurre contra el sandbox del dispositivo.
> Este servidor sólo mueve **estado del juego** (apodos, presencia, ranking).
> No hay red real para las herramientas ofensivas: eso no cambia.

## Correrlo local (gratis, para probar ya)

```bash
node server/index.mjs
# escucha en http://localhost:8787
```

En el juego, configurá esa URL (una vez):

```js
localStorage.setItem("nande-online-server", "http://localhost:8787");
```

Recargá: el juego entra en modo comunidad. Si borrás esa clave, vuelve a ser
100% offline.

## Hospedarlo gratis (para que entre la comunidad)

Cualquier free tier sirve porque no tiene dependencias: Render, Fly.io,
Railway, Deno Deploy, etc. Exponé el puerto `PORT` (el host lo inyecta) y
apuntá el juego a la URL pública (con **https**).

## Antes de abrirlo al público (importante: lo usan menores)

Este archivo es una **base de referencia**, no una solución de producción.
Antes de exponerlo a una comunidad real:

- **TLS/HTTPS** por delante (lo da el free tier).
- **Moderación y reporte de abuso** antes de habilitar cualquier chat. Por eso
  esta referencia **no tiene chat de texto libre**: sumar chat exige moderar.
- **Sin PII**: acá sólo hay apodos en memoria, sin cuentas ni datos personales.
  Mantené esa regla (apodo ≠ identidad real).
- **Límites/anti-abuso**: hay topes simples (tamaño de mensaje, techo de
  conexiones, TTL de presencia); reforzalos según tu escala.
