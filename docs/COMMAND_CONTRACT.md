# COMMAND CONTRACT — ÑANDE Hacklab

Cada comando de la terminal tiene una responsabilidad clara. Regla: ONE
COMMAND = ONE RESPONSIBILITY. Los comandos NO guardan el estado del mundo ni
implementan los engines: consultan/mutan un runtime.

## Núcleo / filesystem / proceso
`pwd cd ls cat echo printf mkdir touch rm chmod chown ps clear help whoami id
hostname uname date env export which grep head tail wc` — sobre el FS/usuario
del jugador.

## Red / hosts / servicios
| Comando | Runtime | Efecto |
|---|---|---|
| `ping <ip>` `nslookup` `ip` `ifconfig` | Network/DNS | Diagnóstico |
| `nmap <host>` | HostRuntime | Puertos reales (open/closed/filtered) |
| `services [host]` · `service-info <s> <host>` | HostRuntime | Lectura |
| `service-start/stop/restart <s> <host>` | HostRuntime | Muta estado (efecto en nmap/curl/navegador/SOC) |
| `firewall block/allow <host> <puerto>` | HostRuntime | Firewall |
| `connect <host> [user] [clave]` | HostRuntime | Sesión remota / pivoting |

Dentro de una sesión remota: `ls cat pwd whoami hostname ps kill <pid>
services service-stop/start nmap (red interna) connect (pivotar) flag exit`.

## HTTP / web / DB
| `curl <url>` | VirtualBrowser→WebServer | HTTP real (SQLi, etc.) |
| `db-list` · `db-schema <db>` · `db-query <db> <sql>` | DatabaseRuntime | SQL real |

## Programación / herramientas
| `code new <n>` · `code <ruta>` | FS | Crea/mira código |
| `compile <ruta>` | Sandbox | Valida |
| `tool-install <ruta>` · `tool-list` · `tool-info` · `tool-remove` | ToolRuntime | Instalar/gestionar |
| `run <tool> [args]` | ToolRuntime | Ejecuta en sandbox |

## Defensa / operación
| `soc` · `soc alerts` · `soc clear` | BlueTeamSOC | Alertas de eventos reales |
| `snapshot create/list/restore/rm` | SnapshotManager | Fotos del mundo |

## Objetivos (target)
Todo objetivo debe vivir en la red virtual (`10.10.x.y`, `*.nande`, `*.lab`).
Un objetivo real se rechaza: `objetivo fuera del sandbox`.
