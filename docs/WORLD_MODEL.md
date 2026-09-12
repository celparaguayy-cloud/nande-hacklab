# WORLD MODEL — ÑANDE Hacklab

El mundo es un conjunto de runtimes con una sola fuente de verdad cada uno,
agregados por `kernel.worldState()`.

## Entidades

- **Host** (`HostRuntime`): hostname, ip, os, up, `services[]`, `firewall[]`,
  `processes[]`, `creds[]`, `files{}`, `reachableFrom[]` (red interna), `flag`.
- **Servicio**: name, port, protocol, kind (http/ssh/db/…), state
  (running/stopped/failed), pid.
- **Proceso**: pid, name, owner, cpu, memory, service?.
- **Herramienta** (`ToolRuntime`): manifest (name, version, capabilities,
  author), source, origin (player|npc). Persistida.
- **Base de datos** (`DatabaseRuntime`): tablas/columnas/filas, motor SQL real.
- **Persona** (`WorldEngine`): 4000, deterministas (nombre, oficio, intereses,
  online, economía).
- **Evento de runtime** (`RuntimeEvent`): la evidencia que consume el SOC.
- **Alerta** (`BlueTeamSOC`): derivada de eventos, con severidad.

## Relaciones que hacen viva la simulación

```
servicio ── respaldado por ──▶ proceso (pid)
host ── expone ──▶ servicios ── gate ──▶ HTTP/SSH/DB
host interno ── reachableFrom ──▶ host público (pivoting)
acción ── emite ──▶ evento ── consume ──▶ SOC (alerta)
persona ── crea ──▶ herramienta (NpcToolForge)
```

Ver `ARCHITECTURE.md` para el mapa completo y el flujo canónico.
