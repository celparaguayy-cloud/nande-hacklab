# PERSISTENCE — ÑANDE Hacklab

El estado persiste en `localStorage` bajo claves con prefijo `nande-`. No hay
backend: es un sitio estático.

## Qué se persiste
- Mundo/reloj (`nande-world`, registro), progreso, notoriedad, economía,
  campaña, correo, chat, grupos, notas, apariencia, red.
- **Herramientas** del jugador y NPC (`nande-tools`, `ToolRuntime`).
- **Config de IA** (`nande-ai-config`) — incluida la clave del jugador (sólo en
  su dispositivo).
- **Snapshots** (`nande-snapshots`, `SnapshotManager`): fotos del resto.

## Qué NO se persiste (a propósito)
- Estado vivo de `HostRuntime` (servicios on/off, firewall): se re-siembra en
  cada arranque para que cada sesión de laboratorio empiece limpia. Para
  guardar/volver a un estado, usar **snapshots**.

## Robustez
Cada lectura/escritura va en `try/catch`: si `localStorage` está deshabilitado
o corrupto, el juego arranca en un estado por defecto (nunca rompe).

## Reset y fotos
- `resetStorage()` (tests) limpia todo.
- `snapshot create/restore` guarda y reescribe el conjunto `nande-*` (tras
  restaurar hay que recargar para reconstruir el kernel).

## Futuro
IndexedDB para estado grande (mundo completo, historiales) — hoy alcanza con
localStorage para lo que se persiste.
