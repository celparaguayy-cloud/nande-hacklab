# AI MODEL — ÑANDE Hacklab (IA opcional)

La IA es **opt-in** y **offline por defecto**. El núcleo del juego no cambia:
sigue 100% offline y determinista.

## Modos

- **Offline (por defecto, sin clave):** `OfflineProvider` (`core/ai/OfflineProvider.ts`).
  Determinista, sin red, respuestas por reglas/plantillas conscientes del tema
  (tutor de hacking, NPC). Misma entrada → misma respuesta.
- **Conectado (opt-in, clave del jugador):** Groq o Gemini
  (`core/ai/net/ConnectedProviders.ts`), usando la **clave del propio jugador**
  guardada en su navegador. Nunca hay una clave del proyecto en el repo.

## Piezas

| Archivo | Rol |
|---|---|
| `core/ai/AIProvider.ts` | Interfaz `generate(messages)`. |
| `core/ai/OfflineProvider.ts` | IA local determinista (sin red). |
| `core/ai/AISettings.ts` | Config del jugador en `localStorage` (`nande-ai-config`). Default offline. |
| `core/ai/net/ConnectedProviders.ts` | Groq + Gemini (la única red real del proyecto). |
| `core/ai/AIService.ts` | Fachada: elige proveedor; si falla el conectado, cae a offline. |

`kernel.ai` expone el servicio. `mode()` = `offline` | `connected`.

## Aislamiento (regla dura)

- La red real vive **sólo** en `src/core/ai/net/`. El test de aislamiento
  (`src/test/isolation.test.ts`) permite `fetch(` **únicamente** en esa carpeta
  y sigue prohibiéndolo en todo el resto del núcleo.
- El `AIService` carga `net/ConnectedProviders` de forma **perezosa** (dynamic
  import) y sólo cuando hay clave: sin clave, ese código nunca se ejecuta.
- Si el modo conectado falla (sin internet, clave inválida, CORS), el servicio
  **cae al offline**: la IA nunca rompe el juego.
- La clave es del jugador, vive en su dispositivo, y no se sube a ningún lado
  salvo la API que el jugador eligió (Groq/Gemini) con su propia clave.

## Verificación

`core/ai/AIService.test.ts`: offline por defecto; OfflineProvider determinista;
poner clave activa `connected` y borrarla vuelve a `offline`; `generate()`
responde aun sin clave; la config persiste. El test de aislamiento confirma que
el núcleo (todo menos `ai/net/`) no usa red.

## Pendiente

- Panel en Configuración para pegar la clave y elegir proveedor/modelo.
- Usar `kernel.ai` en el chat de NPC y en el tutor (La Mani) cuando haya clave.
- Validar el código que genere la IA por el `CodeExecutionSandbox` antes de
  instalarlo como herramienta (ya existe el pipeline).
