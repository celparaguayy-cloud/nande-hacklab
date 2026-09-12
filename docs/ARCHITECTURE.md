# ARCHITECTURE — ÑANDE Hacklab (tras la transformación)

> Un solo mundo computacional. La UI no es el mundo; el runtime es el mundo.
> Si sacás la interfaz de una feature, el runtime sigue sabiendo qué existe,
> qué corre, qué está conectado y qué pasó.

## Mapa de runtimes (fuentes de verdad)

```
                         VirtualKernel  (cablea todo, un solo tick)
                                │
        ┌───────────────┬───────┴───────┬────────────────┬───────────────┐
        │               │               │                │               │
   EventBus        HostRuntime      WebServer+DNS     ToolRuntime      WorldEngine
  (eventos        (hosts, servicios, (HTTP real,      (+ Sandbox,     (4000 personas,
   tipados)        puertos, firewall, cookies,         código que      economía,
        │          procesos, creds,   sesiones)        corre y          social)
        │          red interna)          │             persiste)           │
        │               │                │                │               │
        ▼               ▼                ▼                ▼               ▼
   BlueTeamSOC     nmap / curl /     VirtualBrowser   NpcToolForge    Campaign /
  (consume         navegador /       (cliente HTTP)   (NPC crean       Consequences
   eventos         connect/pivot                      tools reales)    / Mentor)
   reales)
```

Otros: `DatabaseRuntime` (SQL real consultable), `AIService` (offline/Groq/Gemini),
`SnapshotManager` (guardar/restaurar el mundo).

## Principio de una sola verdad

- **Hosts/servicios/puertos** → `HostRuntime`. Lo consultan `nmap`, el
  navegador y `curl`. Apagar un servicio cambia a los tres.
- **HTTP** → `VirtualBrowser.request` → `WebServer` → `WebApp`. Navegador UI y
  `curl` comparten el mismo camino, cookies y sesiones.
- **DNS** → `VirtualDNS`, único.
- **Eventos** → `EventBus`; el SOC y el mundo escuchan lo mismo.
- **Código/herramientas** → `Sandbox` + `ToolRuntime` (jugador y NPC).
- **Personas/economía/social** → `WorldEngine`/`WorldRegistry`.

## Flujo de una acción (ejemplo canónico)

```
service-stop nginx server.nande
  → HostRuntime detiene el servicio y mata su proceso
  → emite runtime.host {service.stopped}
  → nmap server.nande        muestra 80 closed
  → curl http://server.nande  Conexión rechazada  (+ evento connection.refused)
  → BlueTeamSOC               alerta "Caída de servicio" (high)
```

## Seguridad / aislamiento

- Núcleo 100% offline y determinista. `src/test/isolation.test.ts` prohíbe
  `fetch(`/`XMLHttpRequest`/`WebSocket` en todo `src/core` **excepto**
  `src/core/ai/net/` (modo conectado opt-in, con la clave del jugador).
- El `CodeExecutionSandbox` corre código del jugador/NPC sin acceso al host
  (valida y sombrea globals; capacidades por herramienta).
- Nada sale de la red virtual 10.10.0.0/16; las herramientas rechazan objetivos
  reales.

## Documentos hermanos

`MEGA_TRANSFORMATION_AUDIT` · `NETWORK_MODEL` · `CODE_SANDBOX` · `TOOL_RUNTIME`
· `AI_MODEL`. (Modelo de datos y eventos: ver este archivo y `NETWORK_MODEL`.)

## Comandos nuevos de la terminal (contrato resumido)

| Comando | Qué hace |
|---|---|
| `services [host]` / `service-info` | Estado real de servicios |
| `service-start/stop/restart <svc> <host>` | Ciclo de vida de servicios |
| `firewall block/allow <host> <puerto>` | Firewall por puerto |
| `connect <host> [user] [clave]` | Sesión remota / pivoting (ls, cat, ps, kill, nmap, flag, exit) |
| `code new` / `compile` / `tool-install` / `tool-list` / `tool-info` / `tool-remove` | Programar herramientas |
| `run <tool> [args]` | Ejecuta una tool instalada |
| `soc` / `soc alerts` | Blue Team: alertas de eventos reales |
| `snapshot create/list/restore/rm` | Fotos del mundo |
| `db-list` / `db-schema` / `db-query <db> <sql>` | Bases de datos SQL reales |

## Verificación

68 archivos de test, 440 tests. Los tests clave son **anti-mock**: comprueban
mutación de estado y efectos cruzados entre sistemas (Experimentos A–G), no que
salga un texto esperado.
