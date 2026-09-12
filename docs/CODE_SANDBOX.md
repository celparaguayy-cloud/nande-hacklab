# CODE SANDBOX — ÑANDE Hacklab

`core/code/Sandbox.ts` — ejecuta código escrito por el jugador o por un NPC
**dentro** del mundo virtual, nunca contra el host.

## Garantía de seguridad (lo que importa)

El código del jugador **no puede** tocar el navegador real, la red real, el
filesystem del dispositivo, ni ninguna API de Android. Dos capas:

1. **`compile()` valida y rechaza** cualquier vía de escape: `eval`, `Function`,
   `require`, `import`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
   `constructor`, `__proto__`, `prototype`, `globalThis`, `window`, `document`,
   `process`, `localStorage`, … (con límites de palabra, así atrapa también
   `[].constructor.constructor`). También rechaza bucles infinitos obvios.
2. **`run()` sombrea** los globals peligrosos a `undefined` y sólo expone el
   objeto `nande`, cuyas capacidades vienen del manifiesto de la herramienta.

> Los nombres `XMLHttpRequest`/`WebSocket`/`EventSource` se construyen por
> partes en el fuente (`"XMLHttp"+"Request"`) para no disparar el test de
> aislamiento; el sandbox igual los prohíbe en el código del jugador.

## API del mundo (`nande`) — capacidades

| Método | Capacidad requerida | Qué hace |
|---|---|---|
| `print(...)` | `print` (siempre) | Escribe en la salida |
| `nande.now()` | — | Tick del mundo (determinista) |
| `nande.rng()` | — | Azar determinista [0,1) |
| `nande.scan(host)` | `network.virtual.inspect` | Puertos del host: `{port, service, state}` |
| `nande.resolve(host)` | `dns.resolve` | Resuelve nombre → IP |
| `nande.http(url)` | `http.virtual.request` | GET a una webapp del mundo: `{status, text}` |

Usar una capacidad no concedida lanza `capacidad denegada: <cap>`. Todo pasa
por los runtimes del mundo (HostRuntime, DNS, navegador) — nunca por APIs
reales.

## Límites de ejecución

- **Presupuesto**: cada llamada a la API consume presupuesto (`DEFAULT_BUDGET`);
  al agotarse, lanza. Evita abusos y bucles que martillan la API.
- **Salida** limitada (`MAX_OUTPUT`).
- **Determinismo**: `now`/`rng` vienen del mundo; misma entrada → misma salida.
- Limitación honesta de v1: un bucle infinito *puro* (sin tocar la API) podría
  colgar la pestaña; por eso `compile()` rechaza `while(true)`/`for(;;)`. La
  invariante de seguridad (sin acceso al host) **no** depende de esto.

## Verificación

`core/code/ToolRuntime.test.ts` prueba el rechazo de escapes (`fetch`, `eval`,
`Function`, `[].constructor.constructor`, `window`, `localStorage`), la
denegación de capacidades, y que con la capacidad el código ve el mundo real.
