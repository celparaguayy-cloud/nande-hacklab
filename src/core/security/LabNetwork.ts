/**
 * Red de laboratorio de ÑANDE.
 *
 * Maquinas completamente ficticias contra las que se practica. Todo vive
 * en la red virtual 10.10.x.y; ninguna de estas direcciones, servicios o
 * credenciales existe fuera del sandbox. Las herramientas de seguridad de
 * ÑANDE solo pueden apuntar aca.
 */

export interface LabService {
  port: number;
  protocol: "tcp" | "udp";
  name: string;
  /** Version ficticia del servicio, para practicar identificacion. */
  version: string;
  banner: string;
}

export interface LabVuln {
  /** Identificador educativo, no un CVE real. */
  id: string;
  title: string;
  /** Categoria: web, network, auth, crypto, etc. */
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  port?: number;
  /** En que se apoya el laboratorio para ensenar a encontrarla. */
  hint: string;
}

export interface LabFile {
  path: string;
  content: string;
}

export interface LabWebRoute {
  path: string;
  /** Si la ruta responde a fuzzing de directorios. */
  hidden?: boolean;
  title: string;
}

export interface LabMachine {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  description: string;
  services: LabService[];
  vulns: LabVuln[];
  webRoutes: LabWebRoute[];
  /** Archivos que aparecen en enumeracion, para forense y escalada. */
  files: LabFile[];
  /** Bandera educativa, ficticia. */
  flag: string;
  up: boolean;
}

/** Catalogo de maquinas de practica. Todas ficticias. */
function buildMachines(): LabMachine[] {
  return [
    {
      id: "lab-web-01",
      hostname: "weblab01.lab",
      ip: "10.10.5.10",
      os: "ÑandeLinux 2.1 (virtual)",
      difficulty: "beginner",
      description:
        "Un servidor web sencillo con un formulario de login mal hecho. Ideal para empezar.",
      services: [
        {
          port: 22,
          protocol: "tcp",
          name: "ssh",
          version: "OpenÑSSH 8.2 (sim)",
          banner: "SSH-2.0-OpenÑSSH_8.2",
        },
        {
          port: 80,
          protocol: "tcp",
          name: "http",
          version: "ÑandeHTTPd 1.4 (sim)",
          banner: "ÑandeHTTPd/1.4",
        },
      ],
      vulns: [
        {
          id: "NANDE-WEB-SQLI",
          title: "Inyección SQL en el login",
          category: "web",
          severity: "high",
          port: 80,
          hint: "El campo usuario del login no valida comillas.",
        },
      ],
      webRoutes: [
        { path: "/", title: "Inicio" },
        { path: "/login", title: "Acceso" },
        { path: "/admin", hidden: true, title: "Panel de administración" },
        { path: "/robots.txt", hidden: true, title: "robots" },
      ],
      files: [
        {
          path: "/var/www/config.php",
          content:
            "// db=webapp user=web pass=ÑANDE-DEMO-1234 (ficticio de laboratorio)",
        },
      ],
      flag: "NANDE{sqli_login_basico}",
      up: true,
    },
    {
      id: "lab-net-01",
      hostname: "netlab01.lab",
      ip: "10.10.5.20",
      os: "ÑandeServer 3.0 (virtual)",
      difficulty: "beginner",
      description:
        "Varias puertas abiertas. Sirve para aprender a mirar qué servicios corre una máquina.",
      services: [
        {
          port: 21,
          protocol: "tcp",
          name: "ftp",
          version: "ÑandeFTP 2.0 (sim)",
          banner: "220 ÑandeFTP listo",
        },
        {
          port: 22,
          protocol: "tcp",
          name: "ssh",
          version: "OpenÑSSH 7.9 (sim)",
          banner: "SSH-2.0-OpenÑSSH_7.9",
        },
        {
          port: 23,
          protocol: "tcp",
          name: "telnet",
          version: "Ñandelnetd (sim)",
          banner: "Ñande telnet",
        },
        {
          port: 80,
          protocol: "tcp",
          name: "http",
          version: "ÑandeHTTPd 1.2 (sim)",
          banner: "ÑandeHTTPd/1.2",
        },
        {
          port: 3306,
          protocol: "tcp",
          name: "mysql",
          version: "ÑandeSQL 5.7 (sim)",
          banner: "ÑandeSQL 5.7",
        },
      ],
      vulns: [
        {
          id: "NANDE-NET-FTPANON",
          title: "FTP permite acceso anónimo",
          category: "network",
          severity: "medium",
          port: 21,
          hint: "Probá usuario anonymous sin contraseña.",
        },
        {
          id: "NANDE-NET-TELNET",
          title: "Telnet expone tráfico sin cifrar",
          category: "network",
          severity: "medium",
          port: 23,
          hint: "Telnet manda todo en texto plano.",
        },
      ],
      webRoutes: [{ path: "/", title: "Inicio" }],
      files: [],
      flag: "NANDE{enumeracion_de_servicios}",
      up: true,
    },
    {
      id: "lab-web-02",
      hostname: "shoplab.lab",
      ip: "10.10.5.30",
      os: "ÑandeLinux 2.1 (virtual)",
      difficulty: "intermediate",
      description:
        "Una tienda virtual con fallas de control de acceso. Para aprender IDOR y XSS.",
      services: [
        {
          port: 80,
          protocol: "tcp",
          name: "http",
          version: "ÑandeHTTPd 1.4 (sim)",
          banner: "ÑandeHTTPd/1.4",
        },
        {
          port: 443,
          protocol: "tcp",
          name: "https",
          version: "ÑandeHTTPd 1.4 (sim, TLS)",
          banner: "ÑandeHTTPd/1.4 TLS",
        },
      ],
      vulns: [
        {
          id: "NANDE-WEB-IDOR",
          title: "IDOR en pedidos",
          category: "web",
          severity: "high",
          port: 80,
          hint: "Cambiá el número de /order/123 y verás pedidos ajenos.",
        },
        {
          id: "NANDE-WEB-XSS",
          title: "XSS reflejado en la búsqueda",
          category: "web",
          severity: "medium",
          port: 80,
          hint: "El buscador devuelve lo que escribís sin limpiarlo.",
        },
      ],
      webRoutes: [
        { path: "/", title: "Tienda" },
        { path: "/search", title: "Buscar" },
        { path: "/order/1", title: "Pedido" },
        { path: "/api/orders", hidden: true, title: "API de pedidos" },
      ],
      files: [],
      flag: "NANDE{idor_y_xss}",
      up: true,
    },
    {
      id: "lab-linux-01",
      hostname: "rootlab.lab",
      ip: "10.10.5.40",
      os: "ÑandeLinux 2.1 (virtual)",
      difficulty: "advanced",
      description:
        "Máquina Linux para practicar escalada de privilegios con permisos mal puestos.",
      services: [
        {
          port: 22,
          protocol: "tcp",
          name: "ssh",
          version: "OpenÑSSH 8.2 (sim)",
          banner: "SSH-2.0-OpenÑSSH_8.2",
        },
      ],
      vulns: [
        {
          id: "NANDE-LNX-SUID",
          title: "Binario con SUID mal configurado",
          category: "privesc",
          severity: "high",
          hint: "Buscá binarios con el bit SUID que no deberían tenerlo.",
        },
        {
          id: "NANDE-LNX-CRON",
          title: "Tarea programada escribible",
          category: "privesc",
          severity: "high",
          hint: "Hay un cron que ejecuta un script que podés modificar.",
        },
      ],
      webRoutes: [],
      files: [
        {
          path: "/home/student/notes.txt",
          content: "recordar: revisar /opt/backup.sh (lo corre root)",
        },
        {
          path: "/opt/backup.sh",
          content: "#!/bin/sh\n# script de respaldo (laboratorio)",
        },
      ],
      flag: "NANDE{escalada_por_suid}",
      up: true,
    },
  ];
}

export class LabNetwork {
  private machines: Map<string, LabMachine>;

  constructor() {
    this.machines = new Map(
      buildMachines().map((machine) => [machine.ip, machine]),
    );
  }

  /** Todas las máquinas del laboratorio. */
  all(): LabMachine[] {
    return Array.from(this.machines.values()).map((m) => structuredClone(m));
  }

  /** Máquina por IP virtual. */
  getByIp(ip: string): LabMachine | undefined {
    const machine = this.machines.get(ip);

    return machine ? structuredClone(machine) : undefined;
  }

  /** Máquina por hostname de laboratorio. */
  getByHostname(hostname: string): LabMachine | undefined {
    const normalized = hostname.toLowerCase();

    for (const machine of this.machines.values()) {
      if (machine.hostname.toLowerCase() === normalized) {
        return structuredClone(machine);
      }
    }

    return undefined;
  }

  /** Resuelve un objetivo por IP o por hostname .lab. */
  resolve(target: string): LabMachine | undefined {
    return this.getByIp(target) ?? this.getByHostname(target);
  }

  /** Rango de direcciones vivas, para enseñar barridos de red. */
  liveHosts(): string[] {
    return this.all()
      .filter((machine) => machine.up)
      .map((machine) => machine.ip);
  }
}
