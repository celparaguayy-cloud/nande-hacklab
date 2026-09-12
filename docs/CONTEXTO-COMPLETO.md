# ÑANDE Hacklab — Contexto completo del proyecto (de 0 a hoy)

> Documento para darle contexto total a una IA (ChatGPT) y que proponga la
> próxima MEGA ACTUALIZACIÓN. Léelo entero: al final está lo que queremos y las
> reglas que hay que respetar.

---

## 1. QUÉ ES

**ÑANDE Hacklab** es un **simulador educativo de hacking ético**, hecho como un
**juego**, que corre 100% en el navegador (y como app Android). Es para que un
adolescente y un grupo de ciberseguridad aprendan hackeo REAL practicando, en un
**entorno ficticio y aislado** (nada es un sitio real, ningún dato sale del
dispositivo). Ambientado en una ciudad tipo Paraguay ("Asunción-cyber").

La idea central: NO es multiple-choice. Simula de verdad un sistema operativo,
una terminal, un navegador, webs vulnerables y una ciudad viva; y cada hackeo
enseña una técnica real (SQLi, XSS, IDOR, SSRF, JWT, etc.).

---

## 2. STACK Y RESTRICCIONES DURAS (respetar SIEMPRE)

- **Front:** React 19 + TypeScript + Vite 8. Sin backend.
- **Hosting:** GitHub Pages (sitio estático). Repo público.
- **100% OFFLINE / SANDBOX:** el juego NO hace ninguna llamada de red. Hay un
  **test de aislamiento** que falla si aparece `fetch(`, `XMLHttpRequest` o
  `WebSocket` en el código. Todo es determinista y local (localStorage).
- **Determinista:** el mundo se genera con semillas; misma semilla = mismo mundo.
- **Calidad:** ~401 tests (vitest) en verde, `tsc` estricto, `oxlint` limpio.
- **Tamaño actual:** ~181 archivos .ts/.tsx, ~37.500 líneas, 142 commits.
- **Seguridad/legal:** todo sitio falso lleva un cartel "SIMULACRO EDUCATIVO ·
  sitio ficticio · ningún dato sale de tu dispositivo". No se impersona a
  empresas reales. No se pueden exponer API keys en el sitio (es público).

---

## 3. ARQUITECTURA

- **VirtualKernel:** objeto central que cablea todos los sistemas.
- **EventBus:** eventos tipados (`mission.completed`, `world.news.created`,
  `lab.solved`, `browser.navigate`, etc.). Los componentes se suscriben.
- **Núcleo (`src/core/`) por módulos:** academy, ai, audio, browser, campaign,
  chat, crypto, db, desktop, dns, economy, events, filesystem, game, groups,
  hardware, http, internet, mail, mentor, network, news, notes, os, processes,
  programs, search, security, social, team, terminal, users, web, world.
- **UI (`src/components/`):** cada app es un componente React dentro de un
  gestor de ventanas.

---

## 4. TODO LO QUE YA ESTÁ CONSTRUIDO

### 4.1 Escritorio / SO (estilo Linux/Plasma)
- Gestor de ventanas real (arrastrar, minimizar, maximizar; en el celular las
  apps abren a pantalla completa), barra superior, dock, launcher de apps.
- Fondo de escritorio con reloj, clima y widgets. Temas/acentos configurables.
- Arranque tipo BIOS con elección de alias.
- **20 apps en el dock/launcher:** Terminal, Misión (Centro de Mando), Learn
  (academia), Archivos, Navegador, Correo, Pulso (red social), Mi Empresa, C2,
  Equipo, Chat, Red, Mapa, Mundo 2D, Monitor de procesos, Bolsa, Notas, Juegos,
  Procesos, Configuración.

### 4.2 Terminal (de verdad)
- Parser con **pipes (`|`), `&&`, `||`, `;`, comillas, redirección**.
- Builtins tipo Unix: pwd, ls, cd, cat, echo, mkdir, touch, rm, chmod, chown,
  ps, grep, head, tail, wc, env, export, which, date, printf, ip, ifconfig,
  ping, nslookup, uname, clear, help, etc.
- **69 herramientas de seguridad** en un toolbox: nmap, curl, crack (hashes),
  jwt (decode/crack/forge), proxychains (pivoting), tcpdump (sniffing), wifi,
  etc. Cada una hace algo realista contra el laboratorio.
- **Motor SQL real** detrás: las inyecciones se ejecutan de verdad.
- `learn`, `hint`, `run <programa>` (corre "creaciones" de los habitantes).

### 4.3 Navegador virtual + capa HTTP
- Barra de direcciones inteligente (host o búsqueda), historial atrás/adelante,
  "ver código fuente", DevTools con panel de red (método, estado, SQL ejecutado,
  cookies).
- **Motor HTTP:** peticiones GET/POST, formularios, cookies, sesiones, estados.
- DNS virtual, buscador virtual, "internet" de sitios estáticos + apps dinámicas.
- **Móvil:** tocás un payload de la pista y se pone solo en el campo (o abre la
  URL del ataque). Todos los labs son jugables sin teclear casi nada.

### 4.4 Laboratorios vulnerables (22 en total)
Clásicos: SQLi login (banco), UNION SELECT, XSS reflejado (blog), IDOR (fotos),
path traversal (docs), command injection (herramientas de red), SSRF
(previsualizador), JWT alg:none (API), open redirect (acortador), CSRF (banca
móvil), LFI (portal), upload de webshell (hosting), deserialización insegura,
SSTI (plantillas), XXE (importador XML), NoSQL injection (login Mongo), race
condition (cupones).
Avanzados/nuevos: Nube (bucket público, IAM permisivo, contenedor inseguro),
DevSecOps (secreto en git, dependencia vulnerable), Seguridad de IA / prompt
injection (agente), SOC/Blue Team (triage, SIEM, DFIR), Threat Intel (IOCs,
atribución), Purple Team, Blackbox (examen final).
Además: **sitios de NPC generados** — cada habitante puede tener su web con
falla real y credenciales propias (SQLi + crack o husmeando en la red social).

### 4.5 Campaña "Operación Génesis" (8 capítulos con historia)
1. El primer acceso (SQLi login) · 2. La base de datos (UNION) · 3. Romper el
candado (crack de hash) · 4. El token de oro (forjar JWT) · 5-8. "El Golpe":
pivoting → sniffing → llave de la nube (SSRF) → vaciar la caja (tomar una
cuenta y transferir). Cada objetivo tiene pista, bandera, y el mundo reacciona.
Centro de Mando muestra "Tu próximo paso" con botón que te lleva al lugar exacto.

### 4.6 Academia (13 lecciones guiadas, paso a paso)
nmap, SQLi, rutas ocultas, privesc a root, command injection, SSRF, config
insegura, fallas de auth, lado defensor, y varias OWASP. Cada lección: explica,
te da una tarea, verifica que la hiciste mirando tu comando y su salida, y
recién ahí te explica por qué funcionó y cómo se defiende.

### 4.7 Mundo vivo
- **4.000 habitantes** con nombre, edad, oficio, intereses, nivel técnico,
  actividad, estado online. Nombres decorrelacionados (1.835 nombres distintos).
- **Economía** que circula (la gente cobra, gasta, las empresas facturan; la
  bolsa se mueve; robar mueve plata de verdad).
- **Clima**, rutina diaria (la gente está en zonas según la hora), eventos del
  mundo, **facciones** (Colectivo / Corporaciones / Agencias) con reputación.
- **Hackers rivales** (ranking) que compiten con vos.
- **Mapa** con zonas y lugares; **Mundo 2D** caminable con edificios enterables.

### 4.8 Red social "Pulso" (ingeniería social / OSINT)
Feed tipo Twitter/Instagram: la gente publica quejas, logros, fotos… y **filtra
sin querer** datos aprovechables (mascota = pregunta de seguridad, trabajo,
cumpleaños, y a veces la contraseña REAL que abre su sitio). Buscar personas,
ver perfiles, seguir. Los posts varían por persona (oficio/intereses).

### 4.9 Otras apps
- **Chat** con NPC (responden según personalidad, tema, y a veces filtran).
- **Correo** (bandeja que se llena con el tiempo).
- **Mi Empresa:** fundás una empresa, factura, y te la pueden hackear (defensa).
- **C2:** centro de mando de botnet educativo/simulado.
- **Bolsa:** comprar/vender acciones que reaccionan a tus hackeos.
- **Notas, Juegos (mini-juegos), Archivos, Monitor de procesos, Red (wifi).**

### 4.10 La Mani (mentor adaptativo)
Ayudante flotante que da ayuda EN ESCALERA (empujón → pista → comando →
"hacelo conmigo") y **se gradúa por tema** cuando demostrás que ya sabés. Botón
"Ejecutar" para comandos de terminal, "Copiar" para payloads web.

### 4.11 Progresión y meta-juego
- XP/niveles, notoriedad y **calor** (si subís mucho, el Blue Team te detecta),
  reputación por facción, **certificaciones** derivadas de las banderas
  capturadas, **informe** final, logros.
- **Persistencia** en localStorage.
- **PWA + APK Android** (via CI). Instalable.

---

## 5. HISTORIA DEL DESARROLLO (de 0 a hoy, resumida)
1. Base: escritorio, ventanas, terminal, mapa, estética pixel, arranque móvil.
2. Motores: SQL real, capa HTTP, navegador de verdad, labs explotables.
3. Mundo vivo: habitantes, economía, facciones, rivales, red social, chat.
4. Toma de cuentas de NPC (login + panel privado), robo real, empresas.
5. La Mani, academia por itinerarios, C2/botnet, mundo 2D enterable, PWA/APK.
6. **Pulido grande (lo último):** se arreglaron bugs que hacían sentir el juego
   roto — el navegador iba a la home en vez del sitio, se borraba lo tipeado en
   los formularios, el XSS no daba bandera, un capítulo daba un hash imposible,
   Pulso repetía posts (homónimos), etc. Onboarding con "próximo paso",
   tap-to-fill/navigate en móvil, cartel de simulacro por seguridad. Los 22 labs
   y la campaña entera quedaron **verificados jugables en el celular**.

**Estado hoy:** en vivo, estable, 401 tests en verde. URL del juego:
`celparaguayy-cloud.github.io/nande-hacklab/`.

---

## 6. LO QUE QUEREMOS PARA LA NUEVA MEGA ACTUALIZACIÓN

Queremos que el salto **se SIENTA** (de "app educativa" a "juego/entorno de
verdad"). En palabras del dueño:

- **Un escritorio real, un sistema real, una web real** — más auténtico y
  profundo, no simulado "de mentira".
- **Poder PROGRAMAR y crear herramientas FUNCIONALES** dentro del juego (un
  editor/IDE donde escribís código que corre de verdad y arma tus propias tools).
- **Los bots/NPC crean herramientas funcionales** también (no adornos).
- **Red social más realista.**
- **Nuevos métodos y capítulos en la academia** (más contenido de aprendizaje).
- **Integrar IA con Groq y Gemini** para potenciar el juego (NPC que conversan
  de verdad, tutor IA, contenido generado, el lab de prompt-injection real…).
  → Restricción: la API key NO puede ir en el sitio público. La forma sana es
  **modo IA opcional con la clave del propio jugador** (queda en su navegador);
  sin clave, el juego funciona igual, offline y determinista.
- Ideas ya sobre la mesa (opcionales): **acceso remoto** al escritorio/celular
  de la persona que comprometés (otra pantalla con sus archivos/chats/mail);
  **pivoting en una red interna real**; **modo Blue Team** (defender tu
  empresa); una **Operación 2** (campaña nueva).

---

## 7. LO QUE LE PEDIMOS A CHATGPT

Con TODO lo anterior, proponé una **MEGA ACTUALIZACIÓN** como documento maestro,
detallado, que:
1. Tenga un **nombre/tema** y una visión clara del "antes → después".
2. Se organice en **pilares** y liste **funcionalidades concretas** (qué se ve,
   qué hace el jugador, qué sistemas nuevos hacen falta).
3. Explique **cómo lograr "programar tus herramientas funcionales"** y "los bots
   crean tools funcionales" dentro de un sandbox del navegador (p. ej. un
   lenguaje/intérprete propio o un JS sandboxeado — SIN romper el aislamiento).
4. Diga **dónde y cómo integrar la IA (Groq/Gemini)** respetando que la clave es
   del jugador y que sin clave todo funciona igual.
5. Proponga los **nuevos capítulos/métodos de la academia** y cómo hacer la
   **red social más realista**.
6. Respete TODAS las restricciones de la sección 2 (offline por defecto,
   determinista, sin exponer claves, React+TS+Vite, GitHub Pages, con tests).
7. Dé un **orden de construcción** (por dónde empezar, en tandas) y qué es
   "must-have" vs "nice-to-have".

Que sea ambicioso pero construible sobre lo que ya existe.
