/**
 * MitmEngine — ARP spoofing / Adversary-in-the-Middle dentro del sandbox.
 *
 * En una LAN, para hablar con un vecino primero se resuelve su MAC por ARP. Un
 * atacante puede MENTIR ("yo soy el gateway") y envenenar la caché ARP de una
 * víctima: desde ese momento el tráfico de la víctima pasa POR él (MITM). Si la
 * víctima manda algo en claro (HTTP), el atacante lo lee.
 *
 * Acá el ataque es REAL contra el estado del mundo (regla 2/3/4/13), 100%
 * offline: hay víctimas (workstations reales del segmento local, registradas en
 * HostRuntime) que mandan un login EN CLARO a un servicio. Envenenar a una
 * víctima hace que ESE login sea interceptable por NandeShark. Nada scripteado:
 * si la víctima no manda nada en claro, no hay botín; si no está en tu segmento,
 * ARP no la alcanza (no cruza routers). Es lo que separa "MITM activo" de
 * "capturé credenciales".
 *
 * La lista de víctimas es la ÚNICA fuente de qué credencial viaja en claro por
 * la LAN; el terminal la consulta, la envenena y le pide a NandeShark que
 * materialice la intercepción.
 */

/** Una víctima de la LAN: una workstation que manda un login en claro. */
export interface MitmVictim {
  /** IP en el segmento local del jugador (10.10.0.x). */
  ip: string;
  /** Hostname de la workstation (host real registrado en HostRuntime). */
  hostname: string;
  /** Rol legible del dueño (contexto). */
  role: string;
  /** Host al que la víctima manda su login (servicio del mundo). */
  target: string;
  /** Método y ruta del login. */
  method: "GET" | "POST";
  path: string;
  /** Usuario que la víctima escribe. */
  user: string;
  /** Nombre del campo secreto que viaja en claro (típicamente "password"). */
  field: string;
  /** El secreto en claro (lo que el MITM cosecha). */
  secret: string;
}

/** Víctimas de la LAN corporativa (segmento del jugador 10.10.0.x). Son
 *  workstations de empleados que usan servicios por HTTP (sin cifrar). */
const VICTIMS: MitmVictim[] = [
  {
    ip: "10.10.0.7",
    hostname: "pc-conta.nande",
    role: "PC de Contaduría",
    target: "banco.nande",
    method: "POST",
    path: "/login",
    user: "mvera",
    field: "password",
    secret: "Contadora#2024",
  },
  {
    ip: "10.10.0.8",
    hostname: "pc-rrhh.nande",
    role: "PC de Recursos Humanos",
    target: "server.nande",
    method: "POST",
    path: "/login",
    user: "rrhh",
    field: "password",
    secret: "Legajos!2024",
  },
];

export class MitmEngine {
  private poisoned = new Set<string>();

  /** Todas las víctimas conocidas de la LAN (con su login en claro). */
  all(): MitmVictim[] {
    return VICTIMS.map((v) => ({ ...v }));
  }

  /** Busca una víctima por IP o hostname. */
  byRef(ref: string): MitmVictim | undefined {
    const r = ref.toLowerCase();
    return VICTIMS.find((v) => v.ip === ref || v.hostname.toLowerCase() === r);
  }

  /** ¿Está esta IP siendo interceptada (ARP envenenado) ahora mismo? */
  isPoisoned(ip: string): boolean {
    return this.poisoned.has(ip);
  }

  /** Envenená la caché ARP de una IP: su tráfico pasa a través del atacante. */
  poison(ip: string): void {
    this.poisoned.add(ip);
  }

  /** Cortá el MITM de una IP (o de todas). Devuelve cuántos objetivos se cortaron. */
  clear(ip?: string): number {
    if (ip) return this.poisoned.delete(ip) ? 1 : 0;
    const n = this.poisoned.size;
    this.poisoned.clear();
    return n;
  }

  /** IPs interceptadas ahora mismo. */
  active(): string[] {
    return [...this.poisoned];
  }
}
