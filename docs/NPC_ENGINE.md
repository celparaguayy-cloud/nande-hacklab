# NPC ENGINE — ÑANDE Hacklab

Los NPC no son adornos: usan los mismos runtimes que el jugador.

## Vida social/económica
`VirtualAgents` + `WorldEngine`: 4000 personas con oficio, intereses, rutina,
estado online y economía. Crean entidades del mundo (repos, apps, empresas,
comunidades) que se publican en la Internet virtual y salen en el diario.

## NPC desarrolladores (herramientas reales)
`NpcToolForge` (`core/code/NpcToolForge.ts`): un NPC "que programa" genera
código real de una plantilla, lo compila, lo somete a **sus** tests y sólo si
pasan lo instala en el `ToolRuntime` (origin `npc`). Si no compila o falla, no
publica nada.
- Al arrancar: `kernel.seedNpcTools()` publica unas cuantas (determinista).
- Con el tiempo: en el tick, un habitante en línea publica otra (con tope 24),
  y sale como noticia.
- El jugador las ve en `tool-list`, las inspecciona (`code`/`tool-info`) y las
  ejecuta (`run`) en el mismo sandbox capado.

## Chat
`Chat` responde según personalidad/tema; a veces filtra datos (ingeniería
social). Con el modo IA conectado (clave del jugador) se puede potenciar; sin
clave usa el `OfflineProvider` determinista.

## Verificación
`ToolRuntime.test.ts`: un NPC que no compila no publica; uno que pasa sus tests
queda ejecutable e inspeccionable; determinismo de las tools sembradas.
