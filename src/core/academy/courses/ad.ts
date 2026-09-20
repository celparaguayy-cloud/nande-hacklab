import type { Curso } from "../courseTypes";

/**
 * Módulo "Active Directory" de ÑANDE — el ataque a dominios Windows, que es
 * el pan de cada día del pentest de empresa (y lo que más piden HTB/THM en
 * los caminos de red team).
 *
 * Se apoya en el Directorio REAL (kernel.directory): un grafo con estado que
 * cambia a medida que comprometés cuentas. Cada herramienta —enum4linux,
 * crackmapexec, kerberoast, crack-tgs, abuse, nandeblood— opera sobre ESE
 * grafo, no sobre texto scripteado. La cadena clásica, de foothold a Domain
 * Admins, se recorre de verdad. Todo ficticio y offline (NANDE.LOCAL).
 */

const AD_DIRECTORIO: Curso = {
  id: "c-ad-directorio",
  title: "Active Directory: de un usuario a dueño del dominio",
  subtitle: "Enumerar el dominio, spray de credenciales, Kerberoasting y abusar el grafo hasta Domain Admins.",
  level: "avanzado",
  skill: "pentesting",
  hue: 210,
  glyph: "crown",
  reward: { xp: 420, coins: 340 },
  slides: [
    {
      kind: "concept",
      title: "Por qué Active Directory es EL objetivo en una empresa",
      body:
        "Casi toda empresa mediana o grande maneja sus usuarios, computadoras y permisos con Active Directory (AD): el 'directorio' del dominio Windows. Si comprometés el dominio, controlás TODO — cada PC, cada servidor, cada cuenta. Por eso el 99% de los pentest internos terminan en 'Domain Admin'. AD no se ataca con un exploit mágico: se ataca ABUSANDO relaciones legítimas mal configuradas (quién es admin de qué, quién puede cambiarle la clave a quién). En ÑANDE el dominio NANDE.LOCAL es un grafo REAL con estado: lo que comprometés queda comprometido, y la ruta al objetivo se recalcula sola.",
      diagram: "dominio",
      bullets: [
        "Dueño del dominio = dueño de todas las máquinas y cuentas.",
        "No es un exploit: es encadenar permisos mal puestos.",
      ],
    },
    {
      kind: "concept",
      title: "El grafo: nodos y aristas (como BloodHound)",
      body:
        "AD se modela como un GRAFO. Los nodos son usuarios, grupos y computadoras. Las aristas son relaciones: MemberOf (pertenece a un grupo), AdminTo (es admin local de una máquina), HasSession (tiene sesión abierta ahí), GenericAll/ForceChangePassword (control sobre otra cuenta). Un atacante no piensa en 'máquinas sueltas': piensa en CAMINOS por el grafo, del nodo que ya controla al nodo Domain Admins. La herramienta que dibuja ese grafo y encuentra el camino más corto se llama BloodHound; en ÑANDE es 'nandeblood'.",
      diagram: "capas",
      bullets: [
        "Nodos: usuarios, grupos, equipos. Aristas: MemberOf, AdminTo, HasSession, GenericAll…",
        "Se busca el CAMINO más corto de lo que tenés a Domain Admins.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: enumerá el dominio",
      body:
        "Todo arranca sabiendo qué hay. Corré enum4linux contra el dominio: te lista usuarios, grupos, equipos y —clave— las cuentas de servicio con SPN (las kerberoasteables).",
      command: "enum4linux nande.local",
      explain:
        "enum4linux vuelca los principals REALES del dominio. Fijate en SVC-SQL: tiene un SPN, así que es kerberoasteable. También ves ADMIN-SQL (un DBA que está en Domain Admins) y el objetivo, DOMAIN ADMINS. Con este mapa ya sabés a quién apuntar. Enumerar SIEMPRE va primero.",
      diagram: "dominio",
    },
    {
      kind: "concept",
      title: "Password spraying: una clave, muchos usuarios",
      body:
        "La fuerza bruta clásica prueba muchas claves contra UN usuario — y bloquea la cuenta. El spraying hace lo contrario: prueba UNA clave probable (la típica 'Verano2024!', el nombre de la empresa + año) contra MUCHOS usuarios. Así no bloqueás a nadie y encontrás al que reusó la clave floja. crackmapexec (alias cme/nxc) es la navaja suiza para esto por SMB: si una credencial entra, te lo dice, y marca (Pwn3d!) si esa cuenta es admin local de una máquina.",
      diagram: "fuerzabruta",
      bullets: [
        "Spraying: una clave contra muchos usuarios (no bloquea cuentas).",
        "(Pwn3d!) = esa credencial te da admin local de un equipo.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: spray con crackmapexec",
      body:
        "Probá la clave débil contra la cuenta de servicio del SQL. Si entra, la POSEÉS de verdad: el grafo del dominio cambia.",
      command: "crackmapexec smb dc01.nande.local -u svc-sql -p Verano2024!",
      explain:
        "cme autentica por SMB contra el Directorio real. La clave entra y aparece (Pwn3d!) porque SVC-SQL es admin local de DB01. Y no es cosmético: SVC-SQL queda comprometida en el grafo. Corré 'nandeblood' después y vas a ver cómo cambió la ruta hacia Domain Admins.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Kerberoasting: robá el hash de una cuenta de servicio",
      body:
        "Las cuentas de servicio (las que corren SQL, IIS, etc.) tienen un SPN. Cualquier usuario del dominio puede PEDIR un ticket Kerberos (TGS) para ese SPN — y ese ticket viene cifrado con el hash de la clave de la cuenta de servicio. Te lo llevás y lo crackeás OFFLINE (sin tocar el dominio, sin bloquear nada). Como esas cuentas suelen tener claves viejas y débiles, caen. Eso es Kerberoasting: pedir el TGS y romperlo tranquilo en tu máquina.",
      diagram: "hash",
      bullets: [
        "Cualquiera pide el TGS de un SPN; viene cifrado con la clave del servicio.",
        "Se crackea offline: ni bloqueás cuentas ni hacés ruido en el DC (salvo el 4769).",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: pedí el TGS (kerberoast)",
      body:
        "Pedí el ticket de la cuenta de servicio SVC-SQL. Te devuelve un hash crackeable offline.",
      command: "kerberoast SVC-SQL@NANDE.LOCAL",
      explain:
        "Obtenés el $krb5tgs$… de SVC-SQL. Ese hash sale del hash de su contraseña: si la clave es débil, lo reventás offline. Pedir el TGS deja el evento 4769 en el DC — es la huella que el Blue Team caza para detectar Kerberoasting.",
      diagram: "hash",
    },
    {
      kind: "lab",
      title: "Practicá: crackeá el TGS y poseé la cuenta",
      body:
        "Crackeá el hash con la clave candidata. Si acertás, poseés la cuenta de servicio — y con ella, todo lo que esa cuenta puede tocar.",
      command: "crack-tgs SVC-SQL@NANDE.LOCAL Verano2024!",
      explain:
        "La clave era débil: crackeás el TGS y ahora POSEÉS SVC-SQL. Cambio de estado real en el grafo. Como SVC-SQL es admin de DB01 —donde el DBA (miembro de Domain Admins) tiene sesión—, acabás de abrir la puerta al último salto. Esto es lo que hacés en la vida real con hashcat -m 13100.",
      diagram: "privesc",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué el Kerberoasting es tan peligroso y a la vez tan sigiloso?",
      options: [
        "Cualquier usuario del dominio puede pedir el TGS y crackearlo OFFLINE: no bloquea cuentas ni golpea el servicio, y muchas cuentas de servicio tienen claves débiles y viejas",
        "Porque explota un fallo de red del protocolo TCP",
        "Porque apaga el controlador de dominio",
        "Porque necesita ser Domain Admin de antemano",
      ],
      correct: 0,
      explain:
        "El crackeo es offline: una vez que tenés el TGS, rompés la clave en tu máquina sin volver a tocar el dominio, así que no hay bloqueos ni caídas. Y como las cuentas de servicio suelen arrastrar contraseñas viejas y débiles, el ataque tiene una tasa de éxito altísima. La única huella real es el pedido del ticket (evento 4769) — por eso el Blue Team monitorea Kerberoasting.",
      diagram: "hash",
    },
    {
      kind: "concept",
      title: "Recorrer el grafo: abusar aristas hasta Domain Admins",
      body:
        "Con una cuenta comprometida, 'caminás' el grafo abusando cada arista: si tenés GenericAll sobre una cuenta, le cambiás la clave; si sos AdminTo de una máquina donde otro tiene sesión, robás su token; si ese otro es Domain Admin, ganaste. Cada paso lo hacés con 'abuse <origen> <destino>' y sólo funciona si YA poseés el origen — igual que en la vida real. nandeblood te muestra en cada momento el camino más corto que te falta.",
      diagram: "privesc",
      bullets: [
        "abuse recorre una arista: sólo si ya poseés el nodo de origen.",
        "El objetivo: llegar a un nodo que sea (o herede) Domain Admins.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: mirá el grafo y la ruta al objetivo",
      body:
        "Abrí nandeblood: te dibuja el dominio, marca lo que ya poseés y calcula el camino más corto que te falta para llegar a Domain Admins.",
      command: "nandeblood",
      explain:
        "nandeblood (nuestro BloodHound) deriva la ruta del GRAFO real y de lo que ya conquistaste — no está escrita. A medida que comprometés cuentas con cme/kerberoast/abuse, la ruta se acorta. Cuando poseés Domain Admins, el dominio es tuyo: control total. Ese es el final de un pentest interno.",
      diagram: "capas",
    },
    {
      kind: "concept",
      title: "Defensa: cómo se corta esta cadena",
      body:
        "Todo esto se previene, y por eso lo enseñamos: claves LARGAS y únicas para cuentas de servicio (idealmente gMSA, que las rota solas) mata el Kerberoasting; el principio de mínimo privilegio (que nadie sea admin de lo que no necesita) borra aristas del grafo; monitorear el evento 4769 y los logons raros detecta el spray y el roasting; y separar cuentas de administración (tier 0) evita que un DBA tenga sesión donde un atacante la pueda robar. El grafo del atacante es el mismo mapa que el defensor usa para taparse.",
      diagram: "escudo",
      bullets: [
        "Claves largas/gMSA para servicios · mínimo privilegio · monitorear 4769.",
        "El mismo grafo que te ataca es el que te dice qué endurecer.",
      ],
    },
  ],
};

export const AD_COURSES: Curso[] = [AD_DIRECTORIO];
