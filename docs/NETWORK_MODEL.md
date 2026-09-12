# NETWORK MODEL — ÑANDE Hacklab

> Estado tras Phase 4-5 (primer corte). La red virtual pasó de **dos
> realidades desconectadas** a **una sola fuente de verdad** para "hosts,
> servicios y puertos".

## Componentes

| Capa | Archivo | Rol |
|---|---|---|
| `VirtualNetwork` | `core/network/VirtualNetwork.ts` | Interfaces (lo/eth0/wlan0) y **conectividad** (`isReachable`): ¿hay red hacia 10.10.0.0/16? |
| `VirtualDNS` | `core/dns/VirtualDNS.ts` | nombre → IP. Único, compartido por navegador, `curl` y herramientas. |
| **`HostRuntime`** | `core/net/HostRuntime.ts` | **Fuente única de verdad** de hosts vivos: cada host tiene `services[]` (con `state` running/stopped), `firewall[]` (puertos bloqueados) y `up`. |

## La regla

**nmap no sabe la respuesta; el mundo la sabe.** El navegador, `curl` y `nmap`
consultan el MISMO `HostRuntime`:

- Navegador/`curl` → `HostRuntime.httpReachable(host)` antes de conectar
  (`VirtualBrowser.assertHttpUp`). Si el servicio HTTP está caído o el puerto
  filtrado → *conexión rechazada* y queda un evento `connection.refused`.
- `nmap` → `HostRuntime.resolve(target)` y renderiza el estado real:
  `open` (corriendo), `closed` (detenido), `filtered` (firewall).

## Flujo de una petición

```
Navegador / curl
   → DNS.resolve(host)                     (nombre → IP)
   → VirtualNetwork.isReachable(ip)        (¿hay red?)
   → HostRuntime.httpReachable(host)       (¿el servicio HTTP escucha?)
   → WebServer.request → WebApp.handle     (aplicación + DB)
```

Si cualquier eslabón falla, la petición falla — y el eslabón de servicio es
**mutable en runtime**.

## Ciclo de vida de servicios (comandos)

```
services [host]                     lista hosts o servicios de un host
service-info <servicio> <host>      detalle
service-start  <servicio> <host>    → state=running
service-stop   <servicio> <host>    → state=stopped   (curl/navegador/nmap lo ven)
service-restart <servicio> <host>
firewall block  <host> <puerto>     → puerto filtrado
firewall allow  <host> <puerto>
```

Cada cambio deja un `RuntimeEvent` en `HostRuntime.timeline()` (evidencia para
el SOC): `service.started`, `service.stopped`, `connection.refused`,
`port.blocked`, `port.unblocked`, `host.up/down`. Los eventos también se
emiten al `EventBus` como `runtime.host`.

## Siembra (una sola verdad, poblada desde lo existente)

`VirtualKernel.seedHosts()` puebla el runtime desde lo que ya había:
- Cada webapp del `WebServer` → host con `nginx` en 80/tcp (`server.nande`
  suma `sshd`).
- Cada `LabMachine` de `LabNetwork` → host con sus servicios reales.

Así no hay doble fuente de verdad: `LabNetwork` queda como *catálogo semilla*
(y sigue dando vulns/archivos/flags a otras herramientas), pero el estado vivo
de puertos/servicios vive en `HostRuntime`.

## Invariantes / aislamiento

- Todo en memoria y determinista (misma seed → mismo mapa de puertos; hay test).
- Nada sale de 10.10.0.0/16; sin `fetch`/XHR/WebSocket (test de aislamiento).
- Un host **no registrado** en el runtime no se bloquea (`httpReachable`
  devuelve `true`): los sitios dinámicos (news.nande, academy.nande…) siguen
  funcionando sin cambios.

## Verificación (anti-mock)

`core/net/HostRuntime.test.ts` comprueba **efectos cruzados**, no textos:
`service-stop nginx server.nande` → `curl` falla, `browser.request` lanza,
`nmap` muestra `closed`, y el timeline tiene `service.stopped` +
`connection.refused`. `firewall block` → `filtered`. Determinismo entre dos
kernels con la misma seed.

## Pendiente (próximas fases)

- Persistir el estado de servicios/firewall (IndexedDB, Phase 40) para que
  sobreviva al recargar.
- `ProcessManager` real detrás de cada servicio (`servicio → proceso → puerto`).
- `traceroute`/rutas/latencia y `netstat`/`ss` leyendo del runtime.
- Migrar el resto de herramientas (hydra, tcpdump…) a consultar `HostRuntime`.
