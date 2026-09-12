# EVENT MODEL — ÑANDE Hacklab

`EventBus` (`core/events/EventBus.ts`) es tipado y único. Los sistemas emiten y
se suscriben; nadie inventa eventos para llenar pantallas.

## Eventos de runtime (los que consume el SOC)

Emitidos como `runtime.host` con un `RuntimeEvent` de dato:

| kind | origen | severidad SOC |
|---|---|---|
| `service.started` | HostRuntime.startService | info |
| `service.stopped` | stopService / kill de su proceso | high |
| `service.restarted` | restartService | info |
| `process.killed` | killProcess | high |
| `port.blocked` / `port.unblocked` | firewall | info |
| `connection.refused` | navegador/curl a servicio caído | low |
| `login.success` | connect con credenciales válidas | medium |
| `login.failure` | credenciales inválidas | medium (→ critical si hay fuerza bruta) |
| `host.up` / `host.down` | setHostUp | info / critical |

`HostRuntime.timeline(n)` guarda estos eventos aunque no haya Ut: es la
evidencia persistente en el runtime.

## Otros eventos del mundo

`world.tick`, `world.entity.created`, `world.news.created`, `mission.completed`,
`lab.solved`, `player.xp`, `achievement.unlocked`, `mail.received`,
`chat.received`, `company.attack`, `group.joined`, `terminal.run`,
`browser.navigate`, … (ver `EventType`).

## Correlación

`BlueTeamSOC` traduce eventos en alertas y correlaciona (p. ej. N
`login.failure` al mismo host en una ventana de ticks → `critical` fuerza
bruta).
