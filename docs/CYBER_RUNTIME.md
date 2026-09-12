# CyberRuntime — el corazón de ÑANDE 5.0

> **La UI no es el mundo. El runtime es el mundo.**
> Un mundo, un estado, un reloj, un sistema de eventos.

`CyberRuntime` (`src/core/runtime/CyberRuntime.ts`) es la **API común** sobre la
que TODA herramienta del universo lee y escribe. Nmap, `curl`, el navegador, el
SOC, el CTF, las tools del jugador y los agentes NPC pasan por el mismo lugar y,
por eso, ven exactamente el mismo mundo.

```
UI → Tool → CyberRuntime → WorldState → resultado derivado → eventos
```

No hay salida falsa. No hay estado falso. Cuando parás un servicio, el escáner
deja de verlo porque el escáner **deriva del estado que acabás de cambiar** — no
porque alguien escribió ese texto.

## No reimplementa: delega

`CyberRuntime` **no** es una copia del mundo. Es una fachada delgada que delega
en los runtimes que ya son la única fuente de verdad de lo suyo:

| API              | Delega en                | Fuente de verdad de                          |
| ---------------- | ------------------------ | -------------------------------------------- |
| `runtime.host`   | `HostRuntime`            | hosts, servicios, puertos, alcance (pivoting)|
| `runtime.service`| `HostRuntime`            | estado de servicios (running/stopped), procesos |
| `runtime.process`| `HostRuntime`            | procesos vivos por host                      |
| `runtime.net`    | `VirtualDNS` / `VirtualNetwork` / `HostRuntime` | resolución, alcance, firewall |
| `runtime.identity`| `HostRuntime`           | autenticación (login success/failure)        |
| `runtime.http`   | `VirtualBrowser` → `WebServer` | peticiones HTTP, cookies, sesiones     |
| `runtime.db`     | `DatabaseRuntime`        | bases consultables (motor SQL real)          |
| `runtime.fs`     | `VirtualFilesystem`      | archivos y directorios                       |
| `runtime.clock`  | `VirtualClock` → `VirtualWorld` | el ÚNICO reloj del mundo               |
| `runtime.events` | `EventStore` → `EventBus`| la memoria del mundo (log consultable)       |

## Un solo reloj — `VirtualClock`

`VirtualClock` (`src/core/runtime/VirtualClock.ts`) **no inventa tiempo**: es una
fachada de lectura sobre el reloj del mundo (`VirtualWorld`). Así NPCs, servicios,
timeouts, CTF y eventos comparten la misma línea temporal. Una unidad de `tick`
es un minuto virtual.

```ts
runtime.clock.tick(); // === kernel.world.getState().clock.tick
runtime.clock.time(); // "14:03"
runtime.clock.day();  // día del mundo
```

## Una sola memoria — `EventStore`

`EventStore` (`src/core/runtime/EventStore.ts`) se suscribe al `EventBus` y guarda
un log consultable y reproducible de lo que pasa (ring buffer, tope 3000). Es la
memoria que consultan el SOC, la observabilidad y el correlador.

```ts
runtime.events.byType("runtime.host"); // todo lo que pasó con hosts/servicios
runtime.events.recent(50);             // los últimos 50 eventos, con su tick
runtime.events.countByType();          // resumen para tableros
```

Sólo se recuerdan los eventos con consecuencia real (`TRACKED`): creación de
entidades, procesos, archivos, alertas de seguridad, progreso de misión, noticias,
XP, ataques, incidentes del data center, etc.

## Reglas de realidad (probadas)

`src/core/runtime/CyberRuntime.test.ts` demuestra, sin mirar textos, que el
runtime **es** el mundo:

1. **Escaneo derivado**: parar `nginx` en `server.nande` hace que el puerto 80
   desaparezca del escaneo (y `httpUp` caiga).
2. **Todo queda registrado**: parar y arrancar un servicio agrega eventos
   `runtime.host` al `EventStore`.
3. **Un solo reloj**: `runtime.clock.tick()` es idéntico al reloj del mundo,
   antes y después de un `tick()`.
4. **http y navegador comparten servidor**: si el servicio web cae, una petición
   HTTP falla (no responde algo inventado).
5. **Firewall real**: bloquear el puerto 22 lo oculta del escaneo; permitirlo lo
   devuelve.

## Restricciones de seguridad (invariantes)

Todo lo anterior opera **exclusivamente sobre objetos virtuales**. Cero ejecución
en el host. Cero targeting del mundo real. Cero Internet no controlada. El único
lugar donde se permite red es `src/core/ai/net/` (IA conectada opcional con la
clave del jugador), y el test `src/test/isolation.test.ts` lo vigila.
