# Hospedar el servidor de comunidad GRATIS (paso a paso)

Este servidor no tiene dependencias y corre como un proceso Node normal, así que
cualquier free tier que corra Node sirve. La ruta más simple y **sin tarjeta**
es **Render**. Al final está cómo conectarlo con el juego.

## 🚀 Deploy en un clic

Con el repo abierto, tocá el botón, iniciá sesión en Render y confirmá — el
`render.yaml` de este repo hace toda la configuración sola:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/celparaguayy-cloud/nande-hacklab)

`https://render.com/deploy?repo=https://github.com/celparaguayy-cloud/nande-hacklab`

Cuando termine te da una URL **https**; pegala en el juego (app **Comunidad** →
Activar). Abajo están los pasos manuales por si preferís hacerlo a mano.

---

> Recordá: esto sólo mueve estado del juego (apodos, presencia, ranking). El
> hacking sigue 100% dentro del sandbox del dispositivo. El chat llega recién
> cuando sumes moderación.

---

## Opción A — Render (recomendada, gratis, sin tarjeta)

### 1. Creá la cuenta
- Entrá a https://render.com y registrate (podés usar tu cuenta de GitHub).
- No pide tarjeta para el plan **Free**.

### 2. Conectá este repositorio
- En Render: **New +** → **Web Service**.
- Elegí **Build and deploy from a Git repository** y autorizá GitHub.
- Seleccioná el repo del juego (`nande-hacklab`).

### 3. Configurá el servicio (valores exactos)
| Campo | Valor |
|---|---|
| **Name** | `nande-community` (o el que quieras) |
| **Region** | la más cercana a tu comunidad |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | *(dejalo vacío o `echo sin build`)* |
| **Start Command** | `node index.mjs` |
| **Instance Type** | **Free** |

- Health check path (si lo pide): `/health`.
- **No** agregues variables de entorno: Render inyecta `PORT` solo, y el
  servidor ya lo usa.

### 4. Deploy
- Clic en **Create Web Service**. Render clona, arranca y en ~1 min te da una URL
  **https**, tipo:
  ```
  https://nande-community.onrender.com
  ```
- Probala: abrí `https://TU-URL/health` en el navegador → debe responder
  `{"ok":true,"online":0}`.

> ⚡ Atajo: como el repo trae `render.yaml`, también podés hacer **New +** →
> **Blueprint** → elegir el repo, y Render toma toda la config sola.

### ⚠ Detalle del plan Free
El servicio **se duerme tras ~15 min sin uso** y tarda unos segundos en
despertar en la próxima visita (y se corta la conexión en vivo mientras duerme).
Para una comunidad que arranca está perfecto; si querés que esté siempre
despierto, es un plan pago (eso ya cuesta).

---

## Opción B — cualquier otro host de Node
Railway, Fly.io, Koyeb, etc. Misma idea: **Root Directory** `server`, **Start
Command** `node index.mjs`, y que expongan el puerto `PORT`. Varios piden tarjeta
para el free tier; por eso arriba va Render.

---

## Conectar el juego con tu servidor

1. Abrí ÑANDE (https://celparaguayy-cloud.github.io/nande-hacklab/).
2. Abrí la app **Comunidad** (en el dock).
3. En **Activar la comunidad**, pegá tu URL **https** (ej.
   `https://nande-community.onrender.com`) y tocá **Activar**.
4. Listo: entrás con tu apodo, ves quién está en línea y el ranking global en
   vivo. Compartí ese mismo paso con tu gente y ya están todos en el mismo mundo.

Para volver a offline: en la misma app, **Desconectar** (borra la URL guardada).

---

## Antes de abrirlo a una comunidad grande (lo usan menores)
- La URL debe ser **https** (Render ya lo da).
- **Moderación + reporte de abuso** antes de habilitar cualquier chat (por eso
  esta referencia no tiene chat de texto libre).
- **Sin PII**: acá sólo hay apodos en memoria, sin cuentas ni datos personales.
  Mantené esa regla.
- Es un servidor de **referencia**: para mucha escala, reforzá límites y
  considerá persistencia. Para empezar con tu comunidad, alcanza.
