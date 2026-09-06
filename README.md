# ÑANDE Hacklab

Un mundo virtual encapsulado donde se aprende hacking ético.

ÑANDE simula un escritorio Linux completo —terminal, archivos, navegador,
correo, chat— dentro de un mundo con 2000 habitantes que trabajan, crean
cosas y salen a la calle según la hora del día. Las lecciones y las
misiones se resuelven usando ese mundo: escaneás máquinas que existen sólo
en la simulación, leés correos de personajes que te piden ayuda y ganás
nivel resolviendo problemas reales de seguridad.

**Todo pasa dentro del navegador.** No hay servidor, no hay cuenta, no hay
salida a Internet.

👉 **[Probalo acá](https://celparaguayy-cloud.github.io/nande-hacklab/)**

## Por qué es seguro

Enseñar seguridad ofensiva con herramientas reales es un problema. ÑANDE lo
resuelve simulando todo: `nmap`, `sqlmap` e `hydra` existen como comandos,
pero operan sobre una red inventada que vive en memoria.

Esa garantía no es una promesa del README: está codificada como prueba.
[`src/test/isolation.test.ts`](src/test/isolation.test.ts) intercepta
`fetch`, `XMLHttpRequest`, `WebSocket` y `EventSource`, y verifica que el
mundo pueda arrancar, avanzar, publicar sitios y navegarlos sin usar
ninguna de esas salidas. Si alguien introduce una llamada de red, el test
falla.

## Qué hay adentro

| Aplicación | Qué hace |
|---|---|
| **Terminal** | Shell con tuberías, encadenado de comandos, variables y casi 60 comandos |
| **ÑANDE Learn** | Lecciones guiadas paso a paso, con validación de cada comando |
| **Navegador** | Internet virtual navegable: sitios, buscador, foros, repositorios |
| **Correo / Chat** | Los habitantes te escriben, te proponen misiones y te responden |
| **Mapa** | Plano de las nueve zonas del mundo, con quién anda por cada una |
| **Mundo 2D** | Los habitantes caminando entre zonas según su rutina del día |
| **Bolsa** | Economía con precios que se mueven solos |
| **Archivos, Procesos, Red, Notas, Juegos** | El resto del escritorio |

El contenido educativo cubre inyección SQL, escaneo de puertos, fuerza
bruta, análisis de logs y varias categorías del OWASP Top 10, siempre con
la defensa explicada junto al ataque.

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
    security/           Herramientas y laboratorios simulados
    academy/            Lecciones y validación
    internet/           Sitios, DNS, buscador
  components/   La interfaz. Consume el core, nunca al revés.
  styles/       theme.css: los tokens de diseño del escritorio
```

La separación es estricta y se puede verificar:

```bash
grep -r "from \"react\"" src/core | wc -l   # 0
```

Toda la comunicación entre el core y la interfaz pasa por un `EventBus`, y
el estado del mundo persiste en `localStorage`.

## Empaquetar como APK

El proyecto es una PWA instalable y está configurado con Capacitor para
salir como aplicación Android. Los pasos están en
[`BUILD-APK.md`](BUILD-APK.md).

## Publicación

Cada push a `main` construye el proyecto y lo publica en GitHub Pages
mediante [`.github/workflows`](.github/workflows).

## Licencia y uso

Material educativo. Las técnicas que se enseñan acá se practican sobre el
mundo simulado; aplicarlas contra sistemas ajenos sin autorización expresa
es un delito en Paraguay y en casi todos lados.
