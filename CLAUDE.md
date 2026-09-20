# ÑANDE HACKLAB — guía del proyecto

ÑANDE es un **cyber range educativo**: un escritorio Linux virtual, en el navegador,
donde se aprende y se practica hacking ético y defensa. React 19 + TypeScript + Vite,
desplegado en GitHub Pages. Público: desde principiantes hasta **profesionales que
quieren profundizar**. Debe **superar a TryHackMe / HackTheBox** en didáctica y realismo.

## Contrato de operación (lo pidió el dueño; rige TODAS las decisiones)

El dueño delegó las decisiones de producto (qué agregar, arquitectura, rumbo). El marco:

1. **No sólo para principiantes**: también para gente avanzada que quiere profundizar.
2. **Nada básico**: cursos avanzados, herramientas reales avanzadas, todo exacto y
   milimétrico — pero **dentro del sandbox**.
3. **Superar a la competencia** (TryHackMe, HackTheBox, etc.) en enseñanza y realismo.
4. **Futuro**: versión Pro en Play Store para monetizar (más adelante, no ahora).
5. **Cursos basados en la vida real**, aplicables dentro del sandbox.
6. **0 fakery**: el sandbox se trata como un **sistema real pero controlado** —
   comportamiento, semántica, salidas y apps con **fidelidad máxima**, nada scripteado.
7. **Herramientas y sitios idénticos a los reales** (flags, salidas, formatos).
8. **Cada actualización profundiza** el contenido y todo lo que rodea al sandbox.
9. **Máquinas de práctica reales y contenidas** dentro de ÑANDE (estilo HTB/THM),
   para que un avanzado practique **sin exponerse** ni exponer a nadie.
10. Enfoque: **enseñar, explicar y dar práctica**. "Tenés todo, sólo ejecutá."
11. **Investigar** nuevos métodos de hacking/ciberseguridad para mejorar el contenido.
12. **Gente seria también**: hackers reales y pentesters que vienen a practicar. Por eso
    la exigencia alta y el **realismo extremo** — el contenido debe aguantar el ojo de un
    profesional, no sólo enseñar a un principiante.
13. **Cero simulación: apenas veas un bug o una simulación/fakery dentro de ÑANDE, metés
    un motor REAL** (conexiones, redes, estado, protocolos — un sistema real de verdad
    dentro del sandbox), y además **agregás cosas para potenciar ese motor** hasta que sea
    completamente real, sea lo que sea. Recién después seguís con tus planes. (OJO: "real"
    sigue significando alta fidelidad DENTRO del sandbox — motores deterministas y con
    estado que reemplazan lo scripteado, nunca red real ni salir del dispositivo; ver los
    "Límites que NO se cruzan" y el req 6. De-fakear ≠ romper offline.)
14+. Más reglas en el futuro (se agregan acá cuando lleguen).

## REGLAS MAESTRAS — ÑANDE NEXT STAGE (rige junto con el contrato de arriba)

Las agregó el dueño. Amplían y precisan el marco. Ante duda, mandan estas.

1. **Profundidad antes que cantidad.** No agregar feature/herramienta/pantalla/máquina/
   sistema sólo para subir el número. Antes de crear algo nuevo preguntar: ¿profundiza un
   sistema existente? ¿conecta con el mundo? ¿mejora la experiencia? ¿aporta aprendizaje
   real dentro del sandbox? Si no, priorizar mejorar lo existente.
2. **Una sola fuente de verdad.** Cada estado importante (hosts, usuarios, credenciales,
   privilegios, servicios, vulns, sesiones, compromisos, flags, inventario, progreso) tiene
   UNA fuente central; nada de estados paralelos contradictorios. Herramientas, UI, misiones,
   grafos y eventos consultan ese estado central.
3. **Las herramientas no deben fingir.** Cada herramienta: (1) lee el estado real; (2) valida
   condiciones; (3) produce consecuencias reales en el motor; (4) emite los eventos; (5)
   actualiza el estado persistente cuando corresponde. Si algo aún es simulación simplificada,
   dejarlo explícito internamente y NO presentarlo como funcionalidad real.
4. **Cada vulnerabilidad tiene consecuencia real.** No basta un comando que la menciona. Debe
   existir la cadena verificable: descubrimiento → condición → explotación → cambio de estado
   → consecuencia → evidencia/flag. Las máquinas se resuelven con el motor, no con una
   secuencia decorativa de comandos.
5. **Coherencia global.** Una acción importante produce las MISMAS consecuencias sin importar
   desde dónde se ejecute. Si Terminal compromete un host, esa realidad se refleja en Mission
   Engine, Graph, History, UI, World State, estadísticas y flags. Nunca una capa dice una cosa
   y otra dice otra.
6. **Todo cambio crítico tiene test.** Si toca el estado del mundo, primero (o junto) el test
   funcional. Especialmente: privilegios, autenticación, credenciales, movimiento lateral,
   máquinas, flags, servicios, vulns, relaciones AD, persistencia. No aceptar "parece funcionar".
7. **El motor es más importante que la interfaz.** Entre pantalla nueva y mejora profunda del
   motor, priorizar el motor. La UI representa el estado real, no lo sustituye.
8. **No duplicar lógica.** Antes de crear, buscar si ya existe algo equivalente. Preferir
   reutilizar / extender / refactorizar local / API común. No cinco implementaciones del mismo
   concepto.
9. **No romper el sandbox.** Offline-by-default y aislado. Ninguna mejora introduce egress real,
   credenciales expuestas, API keys incrustadas, llamadas de red no autorizadas ni interacción
   con sistemas reales. La alta fidelidad ocurre dentro del mundo virtual.
10. **Realismo basado en estado.** El realismo sale de relaciones y consecuencias, no de texto
    bonito. Un usuario con privilegios afecta de verdad qué puede hacer; un host comprometido
    cambia de verdad su estado; una cuenta capturada modifica de verdad las rutas.
11. **Máquinas como sistemas, no como guiones.** No "comando A→B→C→flag". Una máquina tiene
    activos, servicios, usuarios, relaciones, condiciones, vulns, estados y caminos alternativos
    cuando tenga sentido. Dos jugadores pueden llegar al mismo objetivo por rutas distintas si el
    estado lo permite.
12. **El grafo refleja la realidad.** Nunca decoración: se deriva del estado real (hosts,
    usuarios, relaciones, privilegios, sesiones, compromisos) y se recalcula cuando cambia el mundo.
13. **Cero regresiones.** Antes de tocar un sistema importante: entender consumidores, localizar
    invariantes, revisar tests, preservar compatibilidad. Después: tsc → lint → tests → build. Si
    algo falla, corregir la causa real; nunca desactivar tipos, borrar tests ni bajar cobertura
    para forzar verde.
14. **No grandes refactors sin necesidad.** No reemplazar arquitectura estable por elegancia.
    Cambios estructurales sólo por bug real, duplicación real, límite de escalabilidad,
    inconsistencia o mantenibilidad. Cambiar menos código, pero mejor.
15. **UX: siempre hay un próximo paso.** Un jugador nuevo nunca queda mirando la interfaz sin
    saber qué hacer. Cada flujo responde: ¿dónde estoy? ¿qué sé? ¿qué puedo hacer? ¿qué me falta?
    ¿qué conseguí? La complejidad interna no se traduce en confusión.
16. **Aprendizaje integrado.** Academia, labs y mundo se refuerzan: una lección prepara una acción
    del mundo; una acción del mundo enseña; un error se vuelve aprendizaje. No separar "teoría" y
    "juego".
17. **Contenido específico, no repetitivo.** Cada curso/máquina/concepto con identidad propia. No
    reutilizar arte/ejemplos/textos/estructuras genéricas cuando el concepto pueda representarse
    específicamente. Reutilizar infraestructura SÍ; repetir contenido visible NO.
18. **Observabilidad interna.** Los sistemas críticos explican por qué pasó algo: estado anterior,
    acción, validación, cambio aplicado, evento emitido, resultado. Nada de estados mágicos.
19. **De-fakery continuo.** Ante simulación falsa / inconsistencia / resultado decorativo: no
    taparlo con UI. Encontrar la lógica incorrecta, reemplazarla por implementación stateful dentro
    del sandbox, y agregar prueba que impida que vuelva.
20. **No declarar "real" sin evidencia.** No afirmar "real/completo/funcional" porque el código
    parezca correcto. La afirmación se apoya en test / ejecución / estado observable / build / CI.
    Diferenciar SIEMPRE: IMPLEMENTADO ≠ VERIFICADO ≠ DESPLEGADO.
21. **Cada release es reproducible.** Una versión publicada se reconstruye desde Git y vuelve a
    pasar typecheck + lint + tests + build. No depender de cambios locales ocultos.
22. **Preservar la historia del proyecto.** No sobrescribir cambios sin entenderlos. No reset
    destructivo para "ordenar". Commits pequeños y trazables.
23. **Priorización** (cuando hay muchas pendientes): 1) bugs que rompen coherencia del mundo;
    2) regresiones; 3) sistemas existentes incompletos; 4) tests y observabilidad; 5) UX de flujos
    importantes; 6) profundidad del motor; 7) contenido nuevo; 8) mejoras visuales; 9) features
    experimentales.
24. **Regla de oro.** Antes de "¿qué feature agregamos ahora?", preguntar "¿qué parte de ÑANDE ya
    existe pero todavía no funciona a la profundidad que debería?". Esa pregunta tiene prioridad.
25. **Objetivo final.** ÑANDE no es una colección de herramientas: es un mundo de simulación
    coherente donde el estado importa, las acciones tienen consecuencias, las herramientas
    interactúan con sistemas reales del sandbox, los errores son detectables, las rutas cambian, el
    aprendizaje ocurre por interacción, y todo permanece verificable, mantenible y offline-safe.

**REGLA FINAL: menos features falsamente profundas; más sistemas realmente conectados.**

## Límites que NO se cruzan (seguridad = parte de hacerse cargo)

ÑANDE lo usan menores Y profesionales; la práctica seria convive con público joven. La
contención no es un adorno: es lo que lo hace seguro y lo que cumple el req 6/9
("controlado", "sin exponerse"). Realismo extremo SÍ; salirse del sandbox NO.

- **100% offline / contenido en el dispositivo.** Ninguna herramienta del juego hace
  peticiones a internet real ni saca datos del dispositivo. La única red real permitida
  vive aislada en `src/core/ai/net/` (asistente IA opcional, con API key del usuario).
  Enforzado por `src/test/isolation.test.ts`. "Real" = alta fidelidad, no red real.
- **Sin falsas afirmaciones (§219).** No decir que algo es un kernel/VM/host real cuando
  es una implementación de alta fidelidad. Ser preciso en la copia de los cursos.
- **Imágenes inline (SVG) / locales**, nunca URLs externas (rompe el offline).
- **Licencia propietaria** (ver LICENSE). El repo privado es paso manual del dueño.

## Cómo se trabaja acá (método probado)

Pase de profundidad por herramienta: **probar el motor empíricamente → profundizar el
motor → profundizar/crear el curso → tests permanentes → desplegar.** Herramientas ya
profundizadas: nmap, hydra, sqlmap, gobuster/ffuf, wget (clonado offline).

- Motor de herramientas ofensivas: `RUNNERS[tool]` en `src/core/security/SecurityTools.ts`
  (ctx: `web`, `dns`, `lab`, `hosts`, `radio`). Catálogo: `src/core/security/toolCatalog.ts`.
- Terminal: `src/core/terminal/VirtualTerminal.ts` (comandos propios como curl/wget/crack/jwt)
  + UI `src/components/terminal/Terminal.tsx` (pestañas y temas estilo Kitty).
- Academia: cursos en `src/core/academy/courses/*.ts` (tipos en `courseTypes.ts`);
  lecciones guiadas en `src/core/academy/Lessons.ts`; itinerarios/retos en `Tracks.ts`.
  **Todo curso debe estar en un itinerario** (lo exige `tracks.test.ts`).
- Apps web vulnerables: `src/core/http/apps/*.ts` (motor SQL/HTTP/DNS reales).
- Guardia clave: `src/core/academy/courseLabs.test.ts` corre TODOS los comandos de los
  labs y exige que existan y entreguen la bandera que prometen ("los comandos funcionan").

### Reglas de código

- `erasableSyntaxOnly`: **prohibidas** las propiedades de parámetro en constructores.
- Verificar SIEMPRE antes de desplegar: `npx tsc -b`, `npx vitest run`, `npx oxlint src/`.

### Desplegar (a GitHub Pages)

1. Subir `src/version.ts` (NANDE_VERSION + NANDE_BUILD) y el `CACHE` de `public/sw.js`.
2. `npm run build` → commit en la rama de trabajo → push.
3. `git checkout -B main origin/main && git merge --ff-only <rama> && git push origin main`
   (el push a main dispara `.github/workflows/deploy.yml`).
4. Verificar en vivo: `https://celparaguayy-cloud.github.io/nande-hacklab/sw.js` con el CACHE nuevo.

### Atribución de commits

Terminar cada commit con las líneas `Co-Authored-By:` y `Claude-Session:` que provee la
sesión. No incluir identificadores de modelo en commits, PRs, ni código del repo.
