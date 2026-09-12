# CAPABILITIES — ÑANDE Hacklab

Las capacidades limitan qué puede hacer el código que corre en el
`CodeExecutionSandbox`. Cada herramienta declara (o infiere) las suyas; usar
una no concedida lanza `capacidad denegada`.

| Capacidad | Permite | API |
|---|---|---|
| `print` | escribir salida | `print(...)` (siempre) |
| `network.virtual.inspect` | escanear puertos de un host | `nande.scan(host)` |
| `http.virtual.request` | pedir una web del mundo | `nande.http(url)` |
| `dns.resolve` | resolver nombre→IP | `nande.resolve(host)` |
| `execution.run` | (reservada) ejecutar sub-tools | — |

Sin capacidad: `nande.now()` y `nande.rng()` (deterministas) siempre están.

## Inferencia

`inferCapabilities(source)` mira qué llama el código: `nande.scan` →
`network.virtual.inspect`, `nande.http` → `http.virtual.request`,
`nande.resolve` → `dns.resolve`. El manifiesto puede declararlas explícitamente.

## Nunca

`*` (comodín). El código nunca alcanza: filesystem/proceso/red/APIs del
dispositivo. Ver `CODE_SANDBOX.md` y `SECURITY_MODEL.md`.
