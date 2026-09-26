# ÑANDE Hacklab

Un cyber range educativo: un mundo virtual encapsulado donde se aprende y se
practica hacking ético y defensa.

ÑANDE simula un escritorio Linux completo —terminal, archivos, navegador,
correo, chat— dentro de un mundo con 2000 habitantes que trabajan, crean cosas
y salen a la calle según la hora del día. Las lecciones y las misiones se
resuelven usando ese mundo: escaneás máquinas que existen sólo en la
simulación, pivoteás por una red interna segmentada, defendés tu data center de
ataques reales del motor, leés correos de personajes que te piden ayuda y ganás
nivel resolviendo problemas de seguridad de verdad.

**El hacking pasa 100% dentro del dispositivo.** Las herramientas ofensivas
nunca tocan internet real: operan sobre el mundo simulado. Hay dos funciones
**opcionales** que sí usan red, aisladas del hacking y explicadas abajo: el
**multijugador de comunidad** (presencia + ranking) y un **asistente IA** (con
la clave del propio jugador).

👉 **[Probalo acá](https://celparaguayy-cloud.github.io/nande-hacklab/)**

## Por qué es seguro

Enseñar seguridad ofensiva con herramientas reales es un problema. ÑANDE lo
resuelve simulando todo: `nmap`, `sqlmap`, `hydra`, `metasploit`, `mimikatz`,
`aircrack-ng`… existen como comandos, pero operan sobre una red inventada que
vive en memoria. Apuntarlos a un objetivo real (una IP, `google.com`) se
rechaza: el límite está en el código, no en la confianza.

Esa garantía no es una promesa del README: está codificada como prueba.
[`src/test/isolation.test.ts`](src/test/isolation.test.ts) intercepta `fetch`,
`XMLHttpRequest`, `WebSocket` y `EventSource`, y verifica que el mundo pueda
arrancar, avanzar, publicar sitios y navegarlos —y que las herramientas
ofensivas corran— **sin ninguna salida de red real**. La única red real permitida
vive en dos módulos aislados y **opt-in**, y el test hace fallar cualquier
llamada de red fuera de ellos:

- [`src/core/net/online/`](src/core/net/online/) — multijugador de comunidad.
- [`src/core/ai/net/`](src/core/ai/net/) — asistente IA (clave del jugador).

Esos canales sólo mueven estado del juego (apodos, ranking) o texto del
asistente: **nunca datos del dispositivo ni nada de las herramientas de ataque**.

## Multijugador de comunidad (opcional)

La app **Comunidad** conecta el juego a un servidor de comunidad: ves quién está
en línea y competís en un ranking global en vivo (que suma tu reputación
**ofensiva + defensiva**). Es multijugador **del juego** —el hacking sigue
contra el sandbox— y se puede **desconectar** para jugar 100% offline.

El servidor es mínimo y sin dependencias; se hospeda gratis. Los pasos están en
[`server/DEPLOY.md`](server/DEPLOY.md). No transporta chat de texto libre (la
moderación va antes que el chat) ni PII: sólo apodos y puntajes.

## Qué hay adentro

| Aplicación | Qué hace |
|---|---|
| **Terminal** | Shell con tuberías, encadenado de comandos, variables y decenas de comandos |
| **ÑANDE Learn** | Lecciones guiadas paso a paso, con validación de cada comando |
| **Máquinas / Arena** | Salas estilo HTB/THM: vulnerá objetivos de punta a punta y capturá su bandera |
| **Red interna** | Red corporativa segmentada (DMZ → LAN → BD restringida → OT/planta): pivoteás multi-salto con `connect`/`netmap` |
| **Red vs Blue** | SOC, DFIR e inteligencia de amenazas: defendés tu data center, investigás incidentes y atribuís al actor real |
| **Comunidad** | Multijugador online opcional: presencia + ranking global |
| **Navegador** | Internet virtual navegable: sitios, buscador, foros, apps web vulnerables |
| **Correo / Chat** | Los habitantes te escriben, te proponen misiones y te responden |
| **Mapa / Mundo 2D** | Las nueve zonas del mundo y los habitantes moviéndose según su rutina |
| **Bolsa** | Economía con precios que se mueven solos |
| **Archivos, Procesos, Red, Notas, Juegos** | El resto del escritorio |

El contenido educativo cubre inyección SQL, escaneo de puertos, fuerza bruta,
pivoting y movimiento lateral, escalada de privilegios, Active Directory,
análisis de logs, forense (DFIR), threat intelligence y varias categorías del
OWASP Top 10, siempre con la defensa explicada junto al ataque.

## Cómo correrlo

Hace falta Node 22 o más nuevo.

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
```

Otros comandos:

```bash
npm test           # toda la suite de pruebas
npm run typecheck  # tsc
npm run lint       # oxlint
npm run build      # build de producción a dist/
```

## Cómo está armado

```
src/
  core/         La simulación. No importa React en ningún lado.
    VirtualKernel.ts    Compone todos los subsistemas
    terminal/           El shell y sus comandos
    world/              Habitantes, rutinas, zonas, clima
    net/                Hosts, servicios y red interna (net/online: comunidad)
    security/           Herramientas y laboratorios simulados
    soc/                Blue Team: SOC, DFIR, correlación MITRE
    threat/             Actores de amenaza (fuente única para SOC/TI)
    game/               Rivales, duelo PvP, co-op, notoriedad
    academy/            Lecciones y validación
    http/ + internet/   Sitios, DNS, buscador, apps web vulnerables
  components/   La interfaz. Consume el core, nunca al revés.
  styles/       theme.css: los tokens de diseño del escritorio
```

La separación es estricta y se puede verificar:

```bash
grep -rl 'from "react"' src/core | wc -l   # 0
```

Toda la comunicación entre el core y la interfaz pasa por un `EventBus`, y el
estado del mundo persiste en `localStorage`.

## Empaquetar como APK

El proyecto es una PWA instalable y está configurado con Capacitor para salir
como aplicación Android. Los pasos están en [`BUILD-APK.md`](BUILD-APK.md).

## Publicación

Cada push a `main` construye el proyecto y lo publica en GitHub Pages mediante
[`.github/workflows`](.github/workflows).

## Licencia y uso

**© 2026 ÑANDE HACKLAB. Todos los derechos reservados.** Software propietario:
ver [`LICENSE`](LICENSE). No está permitido copiar, distribuir ni crear obras
derivadas sin autorización expresa y por escrito del Titular.

Material educativo. Las técnicas que se enseñan acá se practican sobre el mundo
simulado; aplicarlas contra sistemas ajenos sin autorización expresa es un
delito en Paraguay y en casi todos lados.
