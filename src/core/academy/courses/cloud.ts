import type { Curso } from "../courseTypes";

/**
 * Módulo "Cloud Native y DevSecOps". Cursos modernos y actualizados (2024-2025)
 * ligados a los motores REALES del sandbox: ContainerRuntime (nandec ps/inspect/
 * exec/escape — pods, privileged, montajes de host, secretos en env, fuga al
 * host) y la cadena cloud/CI-CD de Yvytu (deploy.yvytu.nande → artefactos).
 * Temas al día: escape de contenedor (Leaky Vessels CVE-2024-21626), cadena de
 * suministro (xz-utils CVE-2024-3094), metadata cloud/SSRF (IMDSv2, Capital One)
 * y RBAC de Kubernetes. 100% offline: alta fidelidad dentro del sandbox.
 */

const CLOUD_CONTENEDORES: Curso = {
  id: "c-cloud-contenedores",
  title: "Contenedores: cómo (no) aíslan",
  subtitle: "Un contenedor no es una VM: comparte el kernel del host. Entender eso es entender por qué se puede escapar.",
  level: "avanzado",
  skill: "pentesting",
  hue: 200,
  glyph: "code",
  reward: { xp: 250, coins: 200 },
  slides: [
    {
      kind: "concept",
      title: "Un contenedor es un proceso, no una máquina",
      body:
        "Mucha gente cree que un contenedor es una 'mini computadora'. No lo es. Es un PROCESO normal del host, al que el kernel le recortó la vista del mundo con dos mecanismos: NAMESPACES (le dan su propia vista de procesos, red, montajes, usuarios) y CGROUPS (le limitan CPU, memoria, etc.). Pero el KERNEL es uno solo y COMPARTIDO con el host. Esa es la diferencia clave con una máquina virtual —que sí tiene su propio kernel— y la razón de que un contenedor sea una frontera de seguridad más débil de lo que parece.",
      diagram: "contenedor",
      bullets: [
        "Namespaces = vista aislada; cgroups = límites de recursos.",
        "El kernel es ÚNICO y compartido con el host.",
        "VM = kernel propio (frontera fuerte); contenedor = kernel compartido.",
      ],
    },
    {
      kind: "concept",
      title: "La imagen: superficie horneada",
      body:
        "Un contenedor nace de una IMAGEN: capas de archivos apiladas. Todo lo que metas en la imagen viaja con ella — incluidos los secretos que alguien 'dejó para probar'. Problemas clásicos y actuales: secretos horneados en una capa (siguen ahí aunque los borres en una capa posterior), el tag `:latest` que nadie sabe qué contiene hoy, imágenes base enormes y sin parchear, y dependencias traídas de registries públicos sin verificar. La imagen es parte de tu superficie de ataque, no un detalle de empaquetado.",
      diagram: "contenedor",
      bullets: [
        "La imagen son capas: un secreto en una capa queda para siempre.",
        ":latest = sorpresa; fijá versiones (digest).",
        "Imagen = superficie de ataque, no solo empaquetado.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es la diferencia de seguridad más importante entre un contenedor y una máquina virtual?",
      options: [
        "El contenedor comparte el kernel del host; la VM tiene el suyo, así que aísla mucho más fuerte",
        "La VM es más rápida de arrancar",
        "El contenedor no puede correr Linux",
        "No hay ninguna diferencia",
      ],
      correct: 0,
      explain:
        "La VM virtualiza el hardware y corre su propio kernel: para escapar hay que romper el hipervisor. El contenedor comparte el kernel del host: un bug del kernel, una mala config (privileged) o un montaje del host pueden bastar para salirse. Por eso 'contenedor ≠ sandbox de seguridad fuerte'.",
      diagram: "contenedor",
    },
    {
      kind: "concept",
      title: "Cuándo el aislamiento se rompe",
      body:
        "El aislamiento se debilita cuando le das al contenedor más poder del necesario: el flag `--privileged` (le quita casi todas las restricciones), montar el filesystem del host adentro del contenedor, compartir los namespaces del host (pid/net), o correr como root dentro del contenedor con capabilities peligrosas (CAP_SYS_ADMIN). Cada una de esas comodidades 'para que funcione' es un puente al host. El atacante que cae en un pod revisa exactamente esto primero.",
      diagram: "contenedor",
      bullets: [
        "--privileged, montar el host, namespaces del host: puentes al host.",
        "Root + CAP_SYS_ADMIN dentro del contenedor = peligro.",
        "Lo primero que mira un atacante: ¿cuánto poder tiene este pod?",
      ],
    },
    {
      kind: "lab",
      title: "Listá los contenedores",
      body: "Enumerá los pods/contenedores que corren en el cluster y fijate cuáles están marcados como privilegiados.",
      command: "nandec ps",
      explain:
        "Ves los contenedores con su imagen, namespace y —clave— si alguno está ⚠privileged. Ese es tu primer triaje: un pod privilegiado en kube-system es un candidato a fuga al host. Inspeccionalo con `nandec inspect <nombre>` para ver sus montajes. Es el mismo reflejo que `kubectl get pods` + `describe` en la vida real.",
      diagram: "kubernetes",
    },
    {
      kind: "concept",
      title: "Defensa: menos poder, por defecto",
      body:
        "La defensa de contenedores es quitar poder: NUNCA correr --privileged en producción, usar rootless (el proceso no es root ni dentro ni fuera), filesystem de solo lectura, DROPear todas las capabilities y volver a agregar sólo las imprescindibles, perfiles Seccomp/AppArmor, y en Kubernetes los Pod Security Standards en modo 'restricted'. La regla: el contenedor arranca con el mínimo privilegio y se le concede sólo lo que prueba necesitar.",
      diagram: "escudo",
      bullets: [
        "Nada de --privileged; rootless; filesystem read-only.",
        "Drop all capabilities + Seccomp/AppArmor.",
        "Kubernetes: Pod Security Standards 'restricted'.",
      ],
    },
  ],
};

const CLOUD_KUBERNETES: Curso = {
  id: "c-cloud-kubernetes",
  title: "Kubernetes: el plano de control",
  subtitle: "Pods, nodes, API server y el token que todo pod lleva puesto: cómo un contenedor se convierte en el cluster.",
  level: "avanzado",
  skill: "pentesting",
  hue: 215,
  glyph: "crown",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "Qué orquesta Kubernetes",
      body:
        "Kubernetes (K8s) corre y coordina contenedores a escala. Piezas: el POD (uno o más contenedores que viven juntos), el NODE (una máquina que corre pods), el API SERVER (el cerebro: todo pasa por él), el kubelet (el agente en cada node) y etcd (la base con todo el estado, incluidos los secrets). Atacar K8s es, casi siempre, llegar a hablarle al API server con más permisos de los que deberías.",
      diagram: "kubernetes",
      bullets: [
        "Pod (contenedores) → Node (máquina) → API server (cerebro).",
        "kubelet = agente del node; etcd = estado + secrets.",
        "El objetivo: hablarle al API server con permisos de más.",
      ],
    },
    {
      kind: "concept",
      title: "El token que todo pod lleva puesto",
      body:
        "Por defecto, Kubernetes monta un token de SERVICE ACCOUNT dentro de CADA pod (en /var/run/secrets/.../token). Ese token es una credencial para el API server. Si caés en un pod, lo primero es robar ese token. Qué podés hacer con él lo decide RBAC (Role-Based Access Control): si RBAC es laxo o el service account tiene permisos de más, el token te da el cluster. Mapea a MITRE ATT&CK T1550.001 (Application Access Token).",
      diagram: "kubernetes",
      bullets: [
        "Cada pod monta un token de service account por defecto.",
        "RBAC decide qué puede hacer ese token.",
        "SA con permisos de más = del pod al cluster (T1550.001).",
      ],
    },
    {
      kind: "quiz",
      prompt: "Caés en un pod y encontrás su token de service account. ¿De qué depende lo que podés hacer con él?",
      options: [
        "De RBAC: los roles y role bindings atados a ese service account",
        "Del color del pod",
        "De la versión de bash",
        "De nada: un token siempre da admin del cluster",
      ],
      correct: 0,
      explain:
        "El token identifica al service account; RBAC define sus permisos. Con RBAC bien ajustado (mínimo privilegio) el token casi no sirve. Con RBAC laxo —o un binding a cluster-admin 'para que ande'— ese token te entrega el cluster. Por eso el mínimo privilegio en RBAC es la defensa número uno.",
      diagram: "kubernetes",
    },
    {
      kind: "concept",
      title: "Del token al node: nodes/proxy y el kubelet",
      body:
        "Un permiso RBAC peligroso y subestimado es `nodes/proxy`: deja llegar a la API del kubelet de cualquier node SIN acceso de red directo ni certificados. Por ese proxy un atacante lista las specs de todos los pods (¡con sus variables de entorno y secretos!), lee la config y el material PKI del kubelet, y saca logs de contenedores de todo el node. Enumerar recursos del cluster mapea a MITRE T1613 (Container and Resource Discovery) y ejecutar comandos en contenedores a T1609.",
      diagram: "kubernetes",
      bullets: [
        "nodes/proxy → API del kubelet sin red directa ni certs.",
        "Permite leer specs/env/secretos de todos los pods del node.",
        "Enumeración = T1613; ejecución en contenedor = T1609.",
      ],
    },
    {
      kind: "lab",
      title: "Enumerá el cluster",
      body: "Listá los pods del cluster y mirá sus namespaces. La enumeración es el primer paso de todo ataque a Kubernetes.",
      command: "nandec ps",
      explain:
        "Ves los pods, su imagen y namespace, y cuáles son privilegiados. Esto es el equivalente a `kubectl get pods -A`: tu mapa del cluster. Un pod en kube-system o uno privilegiado son los que más interesan. El próximo paso es inspeccionar el más jugoso con `nandec inspect <pod>`.",
      diagram: "kubernetes",
    },
    {
      kind: "concept",
      title: "Defensa: RBAC mínimo y no montar el token",
      body:
        "Endurecer K8s: RBAC de mínimo privilegio (nada de bindings a cluster-admin por comodidad), `automountServiceAccountToken: false` donde el pod no necesite hablarle al API, NetworkPolicies para que los pods no se alcancen entre sí libremente, Pod Security Standards 'restricted', y auditar quién tiene permisos peligrosos como `nodes/proxy`, `pods/exec` o crear pods privilegiados. Cada permiso que recortás cierra una ruta del atacante.",
      diagram: "escudo",
      bullets: [
        "RBAC mínimo; nunca cluster-admin 'por las dudas'.",
        "automountServiceAccountToken: false si no hace falta.",
        "NetworkPolicies + PodSecurity 'restricted' + auditar permisos peligrosos.",
      ],
    },
  ],
};

const CLOUD_ESCAPE: Curso = {
  id: "c-cloud-escape",
  title: "Fuga de contenedor al host",
  subtitle: "Un pod privilegiado con el disco del host montado adentro es una puerta directa al nodo. Así se cruza.",
  level: "avanzado",
  skill: "pentesting",
  hue: 15,
  glyph: "flame",
  reward: { xp: 300, coins: 240 },
  slides: [
    {
      kind: "concept",
      title: "Qué es un container escape",
      body:
        "Un 'escape' es salir del contenedor y ejecutar en el HOST (el node). Como el kernel es compartido, no hay que romper un hipervisor: alcanza con una mala config o un bug del runtime. La config más común y fatal: un pod `--privileged` que además monta el filesystem del host (por ejemplo `/` del host en `/host` del contenedor). Con eso, escribir en /host es escribir en el nodo: chroot al host, agregar una clave SSH, o leer los secretos del node. Game over del node.",
      diagram: "contenedor",
      bullets: [
        "Escape = del contenedor al host (al node).",
        "No hace falta romper un hipervisor: el kernel es compartido.",
        "Privileged + montaje del host (/ → /host) = puerta directa.",
      ],
    },
    {
      kind: "concept",
      title: "Caso real 2024: Leaky Vessels (CVE-2024-21626)",
      body:
        "No siempre hace falta una mala config: a veces es un bug del runtime. En enero de 2024, Snyk publicó 'Leaky Vessels' (CVE-2024-21626, CVSS 8.6) en runc —el runtime que está debajo de Docker y Kubernetes—. Por una fuga de descriptor de archivo, un proceso recién creado podía quedar con su directorio de trabajo en el filesystem del HOST, permitiendo el escape. Afectó a runc ≤ 1.1.11 y se parcheó en 1.1.12. Moraleja actual: mantené el runtime parcheado, no solo tus apps.",
      diagram: "contenedor",
      bullets: [
        "CVE-2024-21626 'Leaky Vessels' (runc, Snyk, ene-2024).",
        "Fuga de file descriptor → working dir en el host → escape.",
        "runc ≤1.1.11 afectado; parche en 1.1.12. Parcheá el runtime.",
      ],
    },
    {
      kind: "build",
      goal: "Escapar al host desde el pod privilegiado que monta el filesystem del nodo",
      pieces: ["nandec", "escape", "debug-tools", "inspect", "--privileged"],
      answer: ["nandec", "escape", "debug-tools"],
      hint: "El verbo es 'escape'; el objetivo es el pod privilegiado con el montaje del host (debug-tools).",
      explain:
        "`nandec escape debug-tools` abusa del montaje del host en el pod privilegiado para ejecutar en el nodo y leer su contenido. Sólo funciona si el pod cumple las condiciones (privileged + montaje del host): es una consecuencia real del estado, no un comando decorativo.",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un pod con `--privileged` y el disco del host montado es tan peligroso?",
      options: [
        "Porque escribir en el montaje del host es escribir en el nodo: permite tomar el servidor completo",
        "Porque consume mucha RAM",
        "Porque el pod se reinicia solo",
        "Porque cambia el nombre del cluster",
      ],
      correct: 0,
      explain:
        "Con el filesystem del host montado y privilegios altos, el contenedor deja de estar contenido: lo que escribas en ese montaje toca el nodo real (claves SSH, cron, binarios). De un pod pasás a ser dueño del node, y desde el node, de los demás pods que corren ahí.",
      diagram: "contenedor",
    },
    {
      kind: "lab",
      title: "Encontrá el pod escapable",
      body: "Inspeccioná el pod de herramientas de depuración y mirá si es privilegiado y qué monta.",
      command: "nandec inspect debug-tools",
      explain:
        "Vas a ver `Privilegiado: SÍ ⚠` y un montaje `/ → /host`: las dos condiciones del escape. El propio inspector te sugiere el siguiente paso (`nandec escape debug-tools`). Así se ve, en la vida real, un pod de 'debug' que quedó con demasiado poder y se vuelve el camino al nodo.",
      diagram: "contenedor",
    },
    {
      kind: "concept",
      title: "Defensa: que ningún pod sea una puerta",
      body:
        "Cerrar el escape: prohibir pods privilegiados (Pod Security 'restricted' o un admission controller como OPA/Gatekeeper o Kyverno), no montar hostPath (sobre todo `/`), runtimes al día (lección de Leaky Vessels), y aislar cargas sensibles con sandboxes de runtime (gVisor, Kata Containers) que SÍ ponen una frontera fuerte. La idea: aunque alguien caiga en un pod, que no tenga de dónde agarrarse para llegar al nodo.",
      diagram: "escudo",
      bullets: [
        "Prohibir privileged y hostPath con admission control (OPA/Kyverno).",
        "Runtime parcheado (Leaky Vessels).",
        "Cargas sensibles: gVisor / Kata (frontera fuerte).",
      ],
    },
  ],
};

const CLOUD_CICD: Curso = {
  id: "c-cloud-cicd",
  title: "CI/CD y cadena de suministro",
  subtitle: "El pipeline que despliega a producción es la joya: comprometerlo infecta a todos los que confían en él.",
  level: "avanzado",
  skill: "pentesting",
  hue: 330,
  glyph: "target",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "El runner de CI es la joya de la corona",
      body:
        "Un pipeline de CI/CD construye tu código y lo despliega a producción. Para eso, el RUNNER tiene credenciales potentes: claves de la nube, tokens del registry, acceso a producción. Comprometer el runner no es 'hackear una máquina más': es conseguir las llaves de todo lo que ese pipeline toca. Por eso los atacantes modernos apuntan al CI/CD: es un multiplicador. Un runner expuesto con un usuario de servicio y clave floja es un pie adentro de todo el despliegue.",
      diagram: "supplychain",
      bullets: [
        "El runner guarda credenciales a la nube y a producción.",
        "Comprometerlo = las llaves de todo lo que el pipeline toca.",
        "Es un multiplicador: un host, pero con acceso a todo.",
      ],
    },
    {
      kind: "concept",
      title: "Poisoned Pipeline Execution y dependency confusion",
      body:
        "Dos técnicas actuales. PPE (Poisoned Pipeline Execution): metés comandos en algo que el pipeline ejecuta (un script del repo, un Makefile, un paso que corre código de un pull request) y el runner los corre con SUS privilegios. DEPENDENCY CONFUSION (Alex Birsan, 2021): publicás en un registry público un paquete con el MISMO nombre que uno interno y una versión más alta; el gestor de dependencias se traga el público por error y ejecutás código en el build. El denominador común: el pipeline confía en entradas que no controla.",
      diagram: "supplychain",
      bullets: [
        "PPE: colás comandos en algo que el pipeline ejecuta.",
        "Dependency confusion: paquete público pisa al interno.",
        "Raíz: el pipeline confía en entradas que no controla.",
      ],
    },
    {
      kind: "concept",
      title: "Casos reales: SolarWinds y xz-utils",
      body:
        "SolarWinds (2020): atacantes comprometieron el BUILD de Orion e inyectaron el backdoor SUNBURST en actualizaciones firmadas; se distribuyó a ~18.000 clientes. xz-utils (CVE-2024-3094, 2024, CVSS 10.0): una persona ('Jia Tan') pasó años ganándose la confianza de un proyecto open source hasta conseguir commit, y metió un backdoor en liblzma que habilitaba acceso SSH no autenticado. Casi se cuela en Debian y Fedora; lo cazó un ingeniero por una demora de 0,5s. Lección: la confianza del software es parte de tu superficie.",
      diagram: "supplychain",
      bullets: [
        "SolarWinds 2020: backdoor SUNBURST en el build firmado (~18k).",
        "xz-utils 2024 (CVE-2024-3094): backdoor en liblzma vía ingeniería social.",
        "La confianza en dependencias/builders es superficie de ataque.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué comprometer el pipeline de CI/CD es tan grave comparado con hackear un servidor cualquiera?",
      options: [
        "Porque el pipeline tiene credenciales a producción y distribuye artefactos: su compromiso se propaga a todos los que confían",
        "Porque los pipelines no tienen logs",
        "Porque siempre corren como invitado",
        "No es grave, es un servidor más",
      ],
      correct: 0,
      explain:
        "El CI/CD concentra confianza y privilegios: firma y reparte software, y guarda las llaves de producción. Comprometerlo convierte un solo acceso en acceso a todo lo aguas abajo (clientes, otros equipos). Es el apalancamiento que hace a la cadena de suministro tan atractiva.",
      diagram: "supplychain",
    },
    {
      kind: "lab",
      title: "Reconocé el runner de CI",
      body: "Enumerá los servicios del runner de despliegue de Yvytu. Mirá qué expone antes de intentar entrar.",
      command: "nmap -sV deploy.yvytu.nande",
      explain:
        "Ves los servicios del runner (por ejemplo SSH). Un usuario de servicio con clave de temporada es la entrada clásica; de ahí se escala y se pivotea al repositorio interno de artefactos. Es exactamente la cadena de los retos de Yvytu Cloud: foothold en el runner → root → exfiltración de artefactos.",
      diagram: "supplychain",
    },
    {
      kind: "concept",
      title: "Defensa: menos confianza de larga vida",
      body:
        "Endurecer la cadena: credenciales EFÍMERAS por OIDC en vez de secretos de larga vida guardados en el CI; firmar y verificar artefactos (Sigstore/cosign) y adoptar SLSA para probar la procedencia del build; fijar dependencias por hash (lockfiles) y usar registries internos que no caigan en dependency confusion; aislar y efímerizar los runners (uno limpio por job); y mínimo privilegio en los tokens del pipeline. La meta: que un compromiso puntual no herede las llaves del reino.",
      diagram: "escudo",
      bullets: [
        "OIDC efímero en vez de secretos de larga vida.",
        "Firmar artefactos (cosign) + procedencia (SLSA).",
        "Pin de dependencias por hash + runners efímeros y mínimos.",
      ],
    },
  ],
};

const CLOUD_SECRETOS: Curso = {
  id: "c-cloud-secretos",
  title: "Secretos y metadata de la nube",
  subtitle: "Del env de un pod al servicio de metadata: cómo un SSRF se convierte en credenciales de la nube.",
  level: "avanzado",
  skill: "pentesting",
  hue: 150,
  glyph: "search",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "Los secretos viven (mal) en el entorno",
      body:
        "La forma más común y más filtrable de pasarle un secreto a una app es una VARIABLE DE ENTORNO. Es cómodo, pero cualquiera que ejecute dentro del contenedor las lee, aparecen en volcados de proceso, en logs y en las specs de los pods. Si caés en un pod, leer su env es de lo primero que hacés: tokens de base, claves de API, credenciales del registry. 'Estaba en una variable de entorno' es la causa raíz de incontables brechas.",
      diagram: "cloud",
      bullets: [
        "Env var = cómodo y filtrable (procesos, logs, specs).",
        "Caíste en un pod → leé su env primero.",
        "Secretos en env = causa raíz habitual de brechas.",
      ],
    },
    {
      kind: "concept",
      title: "El servicio de metadata: 169.254.169.254",
      body:
        "Toda instancia en la nube (AWS, Azure, GCP) puede consultar un servicio interno de METADATA en la IP mágica 169.254.169.254 para leer su propia config… y sus credenciales IAM TEMPORALES. En la versión vieja (IMDSv1) ese servicio respondía a CUALQUIER pedido HTTP, sin autenticación. Si una app en la instancia tiene un SSRF (le hacés pedir una URL que vos elegís), le pedís 169.254.169.254 y te devuelve las credenciales de la nube de esa instancia. SSRF + metadata = la vulnerabilidad web más impactante de la era cloud.",
      diagram: "cloud",
      bullets: [
        "169.254.169.254 = metadata; devuelve credenciales IAM temporales.",
        "IMDSv1 respondía sin autenticar a cualquier pedido.",
        "SSRF que alcanza la metadata = credenciales de la nube.",
      ],
    },
    {
      kind: "concept",
      title: "Capital One (2019) e IMDSv2",
      body:
        "Esto no es teoría. Capital One (marzo 2019): un WAF mal configurado permitió un SSRF que alcanzó IMDSv1 y sacó las credenciales temporales de una instancia con permiso de leer S3; se exfiltraron datos de +100 millones de solicitudes de crédito. La respuesta de AWS fue IMDSv2 (nov 2019): exige un handshake —un PUT que devuelve un token de sesión y un header `X-aws-ec2-metadata-token` en cada lectura— que un SSRF simple no puede hacer. Por eso 'exigí IMDSv2' es hoy una defensa estándar.",
      diagram: "cloud",
      bullets: [
        "Capital One 2019: SSRF → IMDSv1 → IAM → +100M de registros.",
        "IMDSv2 (2019): PUT token + header en cada lectura.",
        "IMDSv2 corta el SSRF clásico: hacelo obligatorio.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cómo frena IMDSv2 el ataque de SSRF a la metadata?",
      options: [
        "Exige un token de sesión por PUT y un header especial en cada lectura, que un SSRF simple no puede enviar",
        "Cambia la IP 169.254.169.254 por otra secreta",
        "Apaga el servicio de metadata",
        "Pide una contraseña al usuario final",
      ],
      correct: 0,
      explain:
        "IMDSv1 respondía a un GET pelado, justo lo que un SSRF sabe provocar. IMDSv2 obliga a un PUT previo para obtener un token y luego mandar ese token en un header en cada GET; el primitivo típico de SSRF no puede armar ese handshake. No es magia: sube el listón lo suficiente para romper el ataque clásico.",
      diagram: "cloud",
    },
    {
      kind: "lab",
      title: "Leé el entorno de un pod",
      body: "Ejecutá en el pod de backend y volcá sus variables de entorno. Fijate si quedó algún secreto a la vista.",
      command: "nandec exec api-backend env",
      explain:
        "Volcás el env del pod: si alguien dejó un secreto en una variable (lo habitual), aparece acá, y el motor lo marca como filtrado. Ese es el salto 'tengo un pod' → 'tengo una credencial'. En una instancia real, el siguiente paso sería buscar un SSRF y pedir 169.254.169.254 para conseguir las credenciales IAM.",
      diagram: "cloud",
    },
    {
      kind: "concept",
      title: "Defensa: secretos gestionados y metadata endurecida",
      body:
        "Dejar de filtrar: NO poner secretos en env ni en la imagen; usar un gestor de secretos (Vault, AWS Secrets Manager, K8s Secrets bien montados) con rotación; exigir IMDSv2 y bajar el 'hop limit' a 1 (así un contenedor no alcanza la metadata del host); roles IAM de mínimo privilegio (que el SSRF, si pasa, robe poco); y defensa en profundidad contra SSRF en la app (allowlist de destinos, bloquear IPs internas como 169.254.0.0/16). Capas: ninguna sola alcanza.",
      diagram: "escudo",
      bullets: [
        "Secretos en un gestor (Vault/Secrets Manager), no en env.",
        "IMDSv2 obligatorio + hop limit 1; IAM de mínimo privilegio.",
        "Anti-SSRF en la app: allowlist y bloquear 169.254.0.0/16.",
      ],
    },
  ],
};

export const CLOUD_COURSES: Curso[] = [
  CLOUD_CONTENEDORES,
  CLOUD_KUBERNETES,
  CLOUD_ESCAPE,
  CLOUD_CICD,
  CLOUD_SECRETOS,
];
