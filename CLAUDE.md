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
