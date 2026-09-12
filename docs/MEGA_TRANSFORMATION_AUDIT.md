# ÑANDE Hacklab — MEGA TRANSFORMATION AUDIT (Phase 0)

> Auditoría del código **real** del repositorio (leído, no supuesto) antes de
> empezar la transformación total a un mundo computacional ejecutable.
> Fecha: día 1 de la transformación. Base: 181 archivos .ts/.tsx, ~37.5k líneas,
> 401 tests en verde, sin backend, 100% offline/sandbox.

La regla que ordena todo lo que sigue:

> **THE UI IS NOT THE WORLD. THE RUNTIME IS THE WORLD.**
> Antes de tocar una feature: *¿qué estado real del WorldState cambia?* Si la
> respuesta es "ninguno, solo la interfaz" → no se implementa así.

---

## 0. Resumen ejecutivo (lo que hay que saber en 30 segundos)

**La buena noticia:** ÑANDE ya tiene varios runtimes *de verdad* y comparte
fuentes de verdad en zonas clave. En particular:

- **HTTP ya está unificado.** El navegador (UI) y el `curl` de la terminal
  usan **el mismo camino**: `VirtualBrowser.request()` → `WebServer` →
  `WebApp.handle()`, con las **mismas** cookies, sesiones y redirecciones, y
  ambos pasan por el **mismo** `VirtualDNS` + `VirtualNetwork.isReachable()`.
  Ver `terminal/VirtualTerminal.ts:1508-1546` (curl delega en `browser.request`)
  y `browser/VirtualBrowser.ts:75-123`.
- **SQL es real.** `db/Database.ts` + `db/parser.ts` + `db/tokenizer.ts`
  ejecutan las inyecciones de verdad. No es `if labMode==="sqli"`.
- **El mundo social/economía es una sola fuente de verdad** vía
  `WorldRegistry` + `WorldEngine` + `VirtualPeople` (4000 personas deterministas).

**El problema central (lo que rompe la sensación de "un mundo"):** hay **dos
realidades de red desconectadas** y **no existe ciclo de vida de servicios**:

1. **`VirtualNetwork`** (interfaces + `isReachable` por subred) → la usan
   navegador y `curl`.
2. **`LabNetwork`** (catálogo de máquinas con servicios y `up` **estáticos**) →
   la usan `nmap`, `hydra`, `tcpdump`, etc. (`security/SecurityTools.ts`).

Estas dos no se hablan. `nmap 10.10.7.10` (banco.nande, que **sí** es una
WebApp del WebServer) no encuentra nada, porque nmap solo conoce las máquinas
de `LabNetwork`. Y **`service-stop nginx` no existe**: un servicio es un dato
inmutable dentro de `LabMachine`, con un `up: boolean` que nadie cambia en
runtime. Ahí está el corazón de la transformación (Experimentos A y B).

---

## 1. Inventario de sistemas y clasificación

Leyenda:
`REAL` = estado→comportamiento, fuente de verdad;
`PARTIAL` = modela algo real pero incompleto o inmutable;
`MOCK` = devuelve salida fabricada; `UI_ONLY` = solo interfaz;
`DUP` = fuente de verdad duplicada; `REUSE` = base sólida a conservar/migrar.

### 1.1 Núcleo / cableado

| Sistema | Archivo | Estado | Notas |
|---|---|---|---|
| `VirtualKernel` | `core/VirtualKernel.ts` (809) | REAL/REUSE | Instancia y cablea todo; único `tick()`; `scanForSignals`/`captureSignal` como único punto de "logro". Se vuelve el dueño del `WorldState`. |
| `EventBus` | `core/events/EventBus.ts` | REAL/REUSE | Bus tipado (`EventType`). **Limitación:** el set de eventos es corto y sin `RuntimeEventStore` (no hay historial consultable por el SOC). Falta un catálogo de eventos de runtime. |

### 1.2 Sistema operativo / máquina

| Sistema | Archivo | Estado | Notas |
|---|---|---|---|
| `VirtualOS` | `core/os/VirtualOS.ts` | PARTIAL | Estado del "SO" del jugador; `tick()`. No modela múltiples máquinas. |
| `VirtualFilesystem` | `core/filesystem/VirtualFilesystem.ts` (365) | REAL/REUSE | FS por usuario con permisos. Una sola instancia (la del jugador); no hay FS por host. |
| `VirtualUsers` | `core/users/VirtualUsers.ts` | PARTIAL | Usuarios locales. Sin identidad ligada a cuentas web/sesiones. |
| `VirtualProcesses` | `core/processes/VirtualProcesses.ts` (88) | **MOCK/UI_ONLY** | 3 procesos hardcodeados (`init`, `network-manager`, `terminal`). Sin PID padre, sin `exec`, sin `env/cwd`, sin exitCode, sin stdout/stderr, sin vínculo a servicios. Es un juguete para que `ps` muestre algo. **A reescribir: `VirtualProcessManager`.** |
| `VirtualPrograms` | `core/programs/VirtualPrograms.ts` | UI_ONLY | Registro de *metadatos* de programas (`name/path/permissions`). No ejecuta nada. |
| `VirtualHardware` / `VirtualWiFi` | `core/hardware/*` | PARTIAL | CPU/RAM/disco "de adorno" + wifi ligado a `VirtualNetwork`. |

### 1.3 Red / DNS

| Sistema | Archivo | Estado | Notas |
|---|---|---|---|
| `VirtualNetwork` | `core/network/VirtualNetwork.ts` (167) | **PARTIAL/DUP** | Interfaces (lo/eth0/wlan0) + `isReachable(addr)` **por subred** (10.10.0.0/16) y uplink. **No** modela hosts, puertos, servicios, firewall, rutas, ni conexiones. Es "hay red o no hay red". |
| `LabNetwork` | `core/security/LabNetwork.ts` (396) | **PARTIAL/DUP** | Catálogo de `LabMachine` con `services[]`, `vulns[]`, `webRoutes[]`, `files[]`, `flag`, `up`. Buen **modelo de datos**, pero **inmutable en runtime** (nadie apaga un servicio) y **separado** de `VirtualNetwork` y del `WebServer`. |
| `VirtualDNS` | `core/dns/VirtualDNS.ts` (74) | REAL/REUSE | Un solo DNS, compartido por browser/curl/tools. Bien. Falta: registros no-A, zonas por organización. |

> **DUPLICACIÓN #1 (la más importante):** "la red" y "un host con servicios"
> existen en **dos** lugares que no se sincronizan. Además "un host" aparece
> repartido en cuatro registros parciales: `VirtualDNS` (nombre→IP),
> `VirtualInternet` (sitios), `WebServer` (apps), `LabNetwork` (máquinas).

### 1.4 HTTP / web / datos

| Sistema | Archivo | Estado | Notas |
|---|---|---|---|
| `WebServer` + `WebApp` | `core/http/WebServer.ts`, `http/apps/*` | REAL/REUSE | Enrutado por hostname, `HttpRequest`/`HttpResponse` con query/body/cookies, 500 con traza. Handlers = webs vulnerables reales. |
| `VirtualBrowser` | `core/browser/VirtualBrowser.ts` (179) | REAL/REUSE | Cliente HTTP: cookie jar por host, sigue redirecciones, gate por DNS+red. **Compartido con `curl`.** |
| `Database` (SQL) | `core/db/*` (parser+tokenizer+Database, ~1.3k) | REAL/REUSE | Motor SQL real detrás de los labs de SQLi. **Por-lab**, no hay `VirtualDatabaseRuntime` con catálogo de DBs/usuarios/permisos/transacciones compartido. |
| `VirtualInternet` / `LivingSite` / `WorldPublisher` | `core/internet/*` | REAL/PARTIAL | Sitios estáticos + sitios dinámicos (`resolve(path)`) + publicación de lo que crean los NPCs. Convive con `WebServer` (webapps) — dos formas de "servir" contenido. |
| Vulnerabilidades | `http/apps/labs*.ts`, `bank.ts`, etc. | REAL (mayoría) | La mayoría son fallas reales en el handler (SQLi, IDOR, path traversal, SSRF por string-match, JWT alg:none, CSRF, LFI, upload, deserialización…). **PARTIAL:** algunas "detectan" el ataque por regex/substring (`/<script/`, `includes("169.254")`) en vez de un fallo estructural — funcionan pero no cambian si "se corrige la config". |

### 1.5 Herramientas de seguridad (terminal)

| Sistema | Archivo | Estado | Notas |
|---|---|---|---|
| `SecurityTools` | `core/security/SecurityTools.ts` (1291) | **PARTIAL/MOCK** | `nmap` lee servicios reales de `LabNetwork` (bien) pero el resultado es **inmutable**: apagar un servicio no cambia el scan; un host fuera de LabNetwork da respuesta genérica. `hydra`, `tcpdump`, `proxychains`, etc. arman salida a partir de datos estáticos de la máquina (semi-mock). |
| `toolCatalog` | `core/security/toolCatalog.ts` (1348) | REUSE | Catálogo de 69 herramientas (metadatos/niveles/categorías). |
| Terminal | `core/terminal/VirtualTerminal.ts` (2876) | PARTIAL/REUSE | Parser con pipes/`&&`/`||`/`;`/comillas/redirección (bueno). Pero **dispatch por un `switch` gigante de ~69 `case`** dentro de una clase monolítica: cada comando NO declara su contrato (args/capabilities/target/sideEffects). **A refactorizar: `CommandRegistry`.** |

### 1.6 Mundo vivo / social / economía / juego

| Sistema | Archivo | Estado | Notas |
|---|---|---|---|
| `WorldRegistry` / `WorldEngine` / `VirtualPeople` | `core/world/*` | REAL/REUSE | Fuente única de personas/entidades. 4000 personas deterministas. |
| `Economy` / `Livelihoods` / robo | `core/economy/*`, `world/*`, kernel | REAL/REUSE | Plata circula; robar mueve saldo real NPC→jugador. |
| `Pulso` (social) | `core/social/*` | PARTIAL | Feed sembrado por persona (bien tras el último pulido) pero sin `SocialGraph` real (follows/comments/notifications/reputation como grafo). |
| `Chat`, `VirtualMail` | `core/chat/*`, `core/mail/*` | PARTIAL | NPCs responden por personalidad/tema; bandeja se llena. Sin identidad/sesión unificada. |
| `Campaign` + `Consequences` + `Mentor` | `core/campaign/*`, `world/Consequences.ts`, `mentor/*` | REAL/REUSE | Señal capturada → consecuencias (economía/diario/notoriedad/campaña). La Mani gradúa por tema. |
| `Academy` + `Lessons` + `Defenses` | `core/academy/*` | PARTIAL/REUSE | **Bueno:** verifica mirando el comando y su salida reales. **Falta:** estructura demo→ejercicio→lab→challenge→assessment→capstone y niveles 0-6. |
| `MissionEngine`, `Progression`, `Notoriety`, `PlayerCompany`, `Store`, `Marketplace`, `HackerGroups`, `Notes` | varios | REAL/PARTIAL | Progresión y meta-juego funcionan; misiones aún se completan por señal, no siempre por "investigar→evidencia→acción→consecuencia". |

### 1.7 IA

| Sistema | Archivo | Estado | Notas |
|---|---|---|---|
| `AIProvider` | `core/ai/AIProvider.ts` | **UI_ONLY/STUB** | Solo la **interfaz** (`generate(messages)`). No hay `OfflineProvider`, `GroqProvider` ni `GeminiProvider`, ni gestión de clave del jugador, ni gate offline-por-defecto, ni validación/sandbox de código generado. Todo por construir (Phase 15). |

---

## 2. Duplicaciones y sistemas desconectados (a colapsar)

1. **Red duplicada:** `VirtualNetwork` (reachability) vs `LabNetwork` (máquinas/servicios).
   → Colapsar en **`VirtualNetworkEngine`** único: hosts, interfaces, IPs,
   puertos, servicios, firewall, rutas, conexiones. `nmap` y el browser
   **preguntan al mismo mundo**.
2. **"Host" repartido en 4 registros:** DNS + VirtualInternet + WebServer + LabNetwork.
   → Un `VirtualHost` es la entidad; DNS/HTTP/servicios/scan derivan de él.
3. **Procesos de juguete vs servicios estáticos:** no hay relación
   `service → process → puerto → endpoint`. → `ProcessManager` + `ServiceManager`.
4. **Dos formas de servir web:** `WebServer`(apps) y `VirtualInternet`(sitios).
   → Mantener ambos vía **adaptador** a un `VirtualHTTPRuntime`, pero una sola
   resolución `DNS→red→firewall→conexión→servidor→app→DB`.
5. **Comandos sin contrato:** `switch` monolítico. → `CommandRegistry`.

---

## 3. Qué NO tocar / migrar con adaptador (anti-regresión)

Conservar comportamiento y **migrar** (feature → adapter → runtime nuevo →
migrar → borrar viejo). No romper: campaña, labs, escritorio, mundo, social,
mail, academia, progresión, PWA/APK.

Bases sólidas a reutilizar tal cual o casi:
- `EventBus`, `VirtualDNS`, `WebServer`/`WebApp`/`HttpRequest`, `VirtualBrowser`
  (cookie jar + redirecciones), motor **SQL** (`db/*`),
  `WorldRegistry`/`WorldEngine`/`VirtualPeople`, `Economy`, `Campaign` +
  `Consequences`, mecanismo de verificación de la `Academy`, `LabNetwork`
  **como modelo de datos** (se vuelve el "seed" de los `VirtualHost`).

---

## 4. Riesgos duros (no negociables)

- **Aislamiento:** `src/test/isolation.test.ts` falla si aparece `fetch(`,
  `XMLHttpRequest` o `WebSocket` en el código. Todo runtime nuevo es en memoria.
  La IA (Phase 15) y el "Connected Mode" (Phase 16) son la **única** excepción,
  detrás de la clave del propio jugador y con allowlist; el núcleo sigue offline.
- **Determinismo:** RNG sembrado. Misma seed + mismas acciones = mismo mundo.
- **Sin claves en el repo** (público).
- **Móvil primero**, PWA/APK, sin depender de mouse.
- **Perf:** nada de miles de loops; event-driven + ticks + lazy.

---

## 5. Estrategia de migración por fases (orden de ejecución)

No avanzar de fase si la anterior está estructuralmente rota. Cada fase:
inspect → design → implement → integrate → **test (npm test / build / typecheck)**
→ fix → document → verify, con **anti-mock tests** (comprueban mutación de
estado, efectos cruzados, persistencia, eventos y determinismo — no que salga
el texto esperado).

- **P1 WorldState:** contenedor único (arranca envolviendo lo existente).
- **P2-3 Host/Process/Service:** `VirtualHost`, `VirtualProcessManager`,
  `ServiceManager` (sembrados desde `LabNetwork`).
- **P4-5 Red/DNS/HTTP/DB unificados:** `VirtualNetworkEngine` que consultan
  nmap **y** browser/curl. **Experimento A** (service-stop nginx) y **B**
  (firewall block) verdes con tests.
- **P6-8 Terminal 2.0 / Sandbox / ToolRuntime:** `CommandRegistry`,
  `CodeExecutionSandbox`, herramientas del jugador que compilan/testean/instalan
  y **persisten** (Experimentos C/D).
- **P9-14 NPC engine / Internet virtual / Academy 3.0 / Cyber range / SOC /
  Social+Economía.**
- **P15-16 IA opcional (Groq/Gemini con clave del jugador) / Connected Mode.**
- **P17-18 Performance / UI polish.**

## 6. Definición de éxito (verificable, no narrada)

La cadena del prompt debe poder ejecutarse de punta a punta contra **un solo
WorldState**: abrir terminal → descubrir host → resolver DNS → inspeccionar
servicios → conectar al servicio → abrirlo en el browser → observar HTTP →
consultar datos permitidos → escribir/compilar/probar/instalar/usar una tool →
generar eventos → verlos en el SOC → completar misión → aprender → modificar el
sistema → comprobar que cambió. Y **el test más importante:** si se quita la UI
de una feature, el runtime sigue sabiendo qué existe/corre/está conectado. Si al
quitar la UI desaparece la realidad, es un mock.
