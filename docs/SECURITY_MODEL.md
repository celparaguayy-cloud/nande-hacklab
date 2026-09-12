# SECURITY MODEL — ÑANDE Hacklab

## Invariantes (no negociables)

1. **Núcleo 100% offline.** Ningún módulo de `src/core` usa `fetch`/`XHR`/
   `WebSocket`/`EventSource`, salvo `src/core/ai/net/` (modo conectado opt-in).
   Lo verifica `src/test/isolation.test.ts` (barrido estático) + trampas en
   runtime que registran cualquier llamada de red.
2. **Sandbox sin acceso al host.** El código del jugador/NPC corre en
   `CodeExecutionSandbox`: `compile()` rechaza vías de escape (fetch, eval,
   Function, constructor, globalThis, process, localStorage…); `run()` sombrea
   globals peligrosos y sólo expone la API `nande` limitada por capacidades.
3. **Objetivos sólo virtuales.** Las herramientas rechazan cualquier objetivo
   fuera de `10.10.0.0/16` / `*.nande` / `*.lab`.
4. **Sin claves en el repo.** La clave de IA es del jugador y vive en su
   `localStorage`. El modo conectado se carga perezosamente y sólo con clave.
5. **Todo ficticio.** Ninguna marca/persona real; cartel de simulacro en las
   webs de laboratorio; nada del jugador sale del dispositivo (salvo, en modo
   conectado, el texto que el propio jugador manda a su IA con su clave).

## Modelo de amenaza (del juego, educativo)

El jugador ataca hosts ficticios; el Blue Team (SOC) detecta sus acciones vía
eventos reales. Enseña ataque y defensa sin poder dañar nada real.

## Degradación segura

Si el modo conectado falla, se cae a la IA offline. Si `localStorage` no está,
se juega sin persistencia. La IA nunca ejecuta su salida directamente: el
código generado pasa por el sandbox (compile → capacidades → run).
