/**
 * Códice de herramientas OSS reales.
 *
 * ÑANDE enseña ciberseguridad con herramientas de verdad: acá vive el
 * conocimiento REAL de las herramientas open-source más usadas del oficio
 * (qué son, para qué sirven, un ejemplo de uso real) y su EQUIVALENTE jugable
 * dentro del sandbox de ÑANDE. Así el jugador aprende la herramienta que va a
 * usar en el mundo real, y la practica acá sin tocar nada real.
 *
 * Es SÓLO datos (sin red): el Ñandú offline, la Academia y la terminal lo
 * consultan. No descarga nada; el sandbox sigue 100% offline y aislado.
 */

export interface CodexTool {
  /** Clave de búsqueda (en minúsculas, sin espacios). */
  id: string;
  /** Nombre real de la herramienta. */
  name: string;
  /** Categoría del oficio. */
  category:
    | "recon"
    | "web"
    | "passwords"
    | "network"
    | "ad"
    | "exploit"
    | "wireless"
    | "forensics";
  /** Qué es y para qué sirve, en criollo pero preciso. */
  what: string;
  /** Un ejemplo de uso REAL de la herramienta (como en la vida real). */
  realExample: string;
  /** El equivalente jugable en ÑANDE (comando que SÍ corre en el sandbox). */
  nande: string;
}

export const TOOL_CODEX: CodexTool[] = [
  {
    id: "nmap",
    name: "Nmap",
    category: "recon",
    what: "El escáner de redes más usado. Descubre hosts vivos, puertos abiertos y qué servicio/versión corre en cada uno. Es el primer paso de casi todo.",
    realExample: "nmap -sV -p- 10.0.0.5",
    nande: "nmap <host>   (ej: nmap banco.nande)",
  },
  {
    id: "masscan",
    name: "masscan",
    category: "recon",
    what: "Escáner de puertos ultra rápido: barre rangos enormes de Internet en minutos. Útil para descubrimiento masivo, menos detalle que Nmap.",
    realExample: "masscan 10.0.0.0/8 -p80,443 --rate 10000",
    nande: "nmap <host>   (en ÑANDE el escaneo ya observa el estado real)",
  },
  {
    id: "gobuster",
    name: "Gobuster",
    category: "web",
    what: "Fuerza bruta de rutas y subdominios: prueba miles de nombres para encontrar carpetas y archivos ocultos que el sitio no enlaza.",
    realExample: "gobuster dir -u http://sitio -w wordlist.txt",
    nande: "gobuster <host>   (descubrí rutas ocultas del lab)",
  },
  {
    id: "ffuf",
    name: "ffuf",
    category: "web",
    what: "Fuzzer web rapidísimo: prueba payloads en cualquier parte de la petición (ruta, parámetros, headers) marcando dónde va cada intento con FUZZ.",
    realExample: "ffuf -u http://sitio/FUZZ -w wordlist.txt",
    nande: "gobuster <host>   (descubrimiento de rutas equivalente)",
  },
  {
    id: "sqlmap",
    name: "sqlmap",
    category: "web",
    what: "Automatiza la detección y explotación de inyección SQL: encuentra el parámetro vulnerable y hasta extrae toda la base de datos.",
    realExample: "sqlmap -u 'http://sitio/item?id=1' --dbs",
    nande: "sqlmap http://<host>/login <param>   (o hacé el SQLi a mano con curl)",
  },
  {
    id: "nikto",
    name: "Nikto",
    category: "web",
    what: "Escáner de servidores web: busca miles de archivos peligrosos, configuraciones inseguras y versiones viejas conocidas por ser vulnerables.",
    realExample: "nikto -h http://sitio",
    nande: "curl http://<host>/   +   gobuster <host>   (inspección web)",
  },
  {
    id: "burp",
    name: "Burp Suite",
    category: "web",
    what: "El proxy de interceptación estándar: capturás, ves y modificás cada petición entre tu navegador y el sitio. Base de casi todo el hacking web.",
    realExample: "Interceptar una petición y cambiar el parámetro 'role=user' a 'role=admin'.",
    nande: "curl para pedir/modificar a mano + DevTools del Navegador de ÑANDE",
  },
  {
    id: "hydra",
    name: "Hydra",
    category: "passwords",
    what: "Fuerza bruta de logins en vivo: prueba miles de usuario/clave contra SSH, HTTP, FTP, etc., hasta encontrar una combinación válida.",
    realExample: "hydra -l admin -P rockyou.txt ssh://10.0.0.5",
    nande: "crack <hash>   ·   o probá credenciales filtradas con connect",
  },
  {
    id: "john",
    name: "John the Ripper",
    category: "passwords",
    what: "Crackeador de hashes clásico: toma un hash (MD5, SHA, etc.) y prueba diccionario + reglas hasta encontrar la contraseña original.",
    realExample: "john --wordlist=rockyou.txt hashes.txt",
    nande: "crack <hash>   (ej: crack 5f4dcc3b5aa765d61d8327deb882cf99)",
  },
  {
    id: "hashcat",
    name: "hashcat",
    category: "passwords",
    what: "El crackeador de hashes más rápido, usa la GPU. Soporta cientos de tipos de hash y ataques por diccionario, máscara y reglas.",
    realExample: "hashcat -m 0 -a 0 hash.txt rockyou.txt",
    nande: "crack <hash>   ·   jwt crack <token>   (para firmas HS256)",
  },
  {
    id: "jwt_tool",
    name: "jwt_tool",
    category: "web",
    what: "Analiza y ataca JSON Web Tokens: decodifica, prueba alg:none, crackea la clave de firma y forja tokens nuevos.",
    realExample: "jwt_tool <token> -C -d rockyou.txt",
    nande: "jwt decode|crack|forge <token>",
  },
  {
    id: "wireshark",
    name: "Wireshark",
    category: "network",
    what: "El analizador de tráfico por excelencia: captura los paquetes que pasan por la red y te deja ver TODO — incluidas credenciales que viajan sin cifrar.",
    realExample: "Filtro de visualización:  http.request.method == \"POST\"",
    nande: "sniff   ·   sniff follow <host>   ·   sniff creds   (NandeShark)",
  },
  {
    id: "tcpdump",
    name: "tcpdump",
    category: "network",
    what: "Sniffer de línea de comandos: captura tráfico desde la terminal, sin interfaz gráfica. Liviano y en todos lados.",
    realExample: "tcpdump -i eth0 port 80 -w captura.pcap",
    nande: "sniff   (la captura del cable del mundo virtual)",
  },
  {
    id: "netcat",
    name: "Netcat",
    category: "network",
    what: "La 'navaja suiza' de las redes: abre conexiones TCP/UDP a mano, transfiere datos y sostiene shells. Simple y potentísima.",
    realExample: "nc -lvnp 4444   (escuchar una reverse shell)",
    nande: "connect <host> <usuario> <clave>   (sesión hacia otra máquina)",
  },
  {
    id: "bloodhound",
    name: "BloodHound",
    category: "ad",
    what: "Mapea el Directorio Activo como un grafo y encuentra el camino más corto hacia Domain Admin abusando de permisos y relaciones.",
    realExample: "Recolectar con SharpHound y buscar 'Shortest Path to Domain Admins'.",
    nande: "nandeblood   (el grafo del dominio y la ruta a Domain Admins)",
  },
  {
    id: "impacket",
    name: "Impacket",
    category: "ad",
    what: "Colección de scripts en Python para protocolos de red (SMB, Kerberos…): kerberoasting, pass-the-hash, ejecución remota y más.",
    realExample: "GetUserSPNs.py dominio/usuario -request   (kerberoasting)",
    nande: "kerberoast <cuenta>   +   crack-tgs   ·   connect (mov. lateral)",
  },
  {
    id: "mimikatz",
    name: "Mimikatz",
    category: "ad",
    what: "Extrae credenciales de la memoria de Windows: contraseñas, hashes y tickets Kerberos. El terror de los administradores.",
    realExample: "sekurlsa::logonpasswords",
    nande: "concepto enseñado en NandeBlood + la caza de credenciales del dominio",
  },
  {
    id: "metasploit",
    name: "Metasploit",
    category: "exploit",
    what: "El framework de explotación más famoso: catálogo enorme de exploits y payloads con un flujo común (elegí exploit → configurá → run).",
    realExample: "use exploit/...; set RHOSTS 10.0.0.5; run",
    nande: "reto   ·   objetivo   (labs con vulnerabilidades reales para explotar)",
  },
  {
    id: "aircrack",
    name: "aircrack-ng",
    category: "wireless",
    what: "Suite para auditar WiFi: captura el handshake de una red y crackea su clave WPA offline con diccionario.",
    realExample: "aircrack-ng -w rockyou.txt captura.cap",
    nande: "wifi   (auditá las redes WiFi del mundo virtual)",
  },
  {
    id: "wpscan",
    name: "WPScan",
    category: "web",
    what: "Escáner específico de WordPress: enumera usuarios, plugins y temas vulnerables de un sitio hecho con WordPress.",
    realExample: "wpscan --url http://sitio --enumerate u",
    nande: "gobuster + curl   (enumeración web equivalente)",
  },
];

/** Índice para buscar por id o por nombre. */
export function findTool(query: string): CodexTool | null {
  const q = query.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    TOOL_CODEX.find(
      (t) =>
        t.id === q ||
        t.name.toLowerCase().replace(/[^a-z0-9]/g, "") === q ||
        t.id.includes(q) ||
        t.name.toLowerCase().includes(query.trim().toLowerCase()),
    ) ?? null
  );
}

/** Explicación lista para mostrar (Ñandú / terminal). */
export function explainTool(t: CodexTool): string {
  return [
    `🛠️ ${t.name}  ·  [${t.category}]`,
    "",
    t.what,
    "",
    `En la vida real:  ${t.realExample}`,
    `En ÑANDE:         ${t.nande}`,
  ].join("\n");
}
