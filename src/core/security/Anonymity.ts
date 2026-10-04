/**
 * Anonymity — el estado de anonimato del jugador en la red virtual.
 *
 * Modela, de forma educativa y determinista, las herramientas con las que un
 * operador cuida su rastro: enrutar por una red tipo Tor (cambia tu "IP de
 * salida"), y cambiar la MAC de la placa (MAC spoofing). No hay red real: es
 * para APRENDER qué te delata y cómo se mitiga.
 *
 * Aprendizaje clave (OPSEC): el anonimato no es un botón mágico. Bajás tu
 * huella, pero los metadatos, los horarios, la reutilización de identidades y
 * los errores humanos siguen delatando. Eso lo enseñan las lecciones.
 */

/** Un relay de la red de anonimato, con los datos que publica un relay Tor real. */
export interface Relay {
  /** Apodo del relay (nickname). */
  nick: string;
  pais: string;
  /** Bandera unicode del país (decorativa, inline). */
  bandera: string;
  ip: string;
  /** Huella (fingerprint) del relay — en Tor son 40 hex; acá 16 para que entre. */
  fp: string;
  /** Ancho de banda anunciado, en MiB/s. */
  bw: number;
  /** Flags del consenso (Guard, Fast, Stable, Exit, …). */
  flags: string[];
}

/** Relays de ENTRADA (guards): estables, se mantienen por meses. */
const GUARDS: Relay[] = [
  { nick: "gandalf", pais: "Alemania", bandera: "🇩🇪", ip: "77.20.4.11", fp: "A1B2C3D4E5F60718", bw: 42, flags: ["Guard", "Fast", "Stable", "V2Dir"] },
  { nick: "quijote", pais: "España", bandera: "🇪🇸", ip: "88.12.9.230", fp: "B2C3D4E5F6071829", bw: 31, flags: ["Guard", "Fast", "Stable"] },
  { nick: "sakura", pais: "Japón", bandera: "🇯🇵", ip: "126.44.1.88", fp: "C3D4E5F607182930", bw: 55, flags: ["Guard", "Fast", "Stable", "HSDir"] },
  { nick: "aurora", pais: "Canadá", bandera: "🇨🇦", ip: "99.3.77.142", fp: "D4E5F60718293041", bw: 28, flags: ["Guard", "Fast", "Stable"] },
];

/** Relays del MEDIO: sólo conectan entrada con salida. */
const MIDDLES: Relay[] = [
  { nick: "libertas", pais: "Francia", bandera: "🇫🇷", ip: "92.33.18.4", fp: "E5F6071829304152", bw: 37, flags: ["Fast", "Stable", "V2Dir"] },
  { nick: "pampa", pais: "Argentina", bandera: "🇦🇷", ip: "181.22.5.90", fp: "F607182930415263", bw: 19, flags: ["Fast", "Running"] },
  { nick: "fjord", pais: "Noruega", bandera: "🇳🇴", ip: "51.19.44.7", fp: "0718293041526374", bw: 48, flags: ["Fast", "Stable"] },
  { nick: "mistral", pais: "Italia", bandera: "🇮🇹", ip: "79.8.120.33", fp: "1829304152637485", bw: 24, flags: ["Fast", "Running"] },
];

/** Relays de SALIDA (exit): el destino ve SU IP. Pocos y preciados. */
const EXIT_NODES: Relay[] = [
  { nick: "surtur", pais: "Islandia", bandera: "🇮🇸", ip: "51.0.12.7", fp: "2930415263748596", bw: 33, flags: ["Exit", "Fast", "Stable"] },
  { nick: "helvetia", pais: "Suiza", bandera: "🇨🇭", ip: "51.0.44.19", fp: "30415263748596A7", bw: 40, flags: ["Exit", "Fast", "Stable", "V2Dir"] },
  { nick: "tulp", pais: "Países Bajos", bandera: "🇳🇱", ip: "51.0.77.3", fp: "415263748596A7B8", bw: 52, flags: ["Exit", "Fast", "Stable", "HSDir"] },
  { nick: "dracula", pais: "Rumania", bandera: "🇷🇴", ip: "51.0.99.42", fp: "5263748596A7B8C9", bw: 21, flags: ["Exit", "Fast", "Running"] },
];

/** Un circuito es la cadena de 3 relays (entrada → medio → salida). */
export interface Circuit {
  guard: Relay;
  middle: Relay;
  exit: Relay;
}

export interface AnonymityState {
  torEnabled: boolean;
  /** Índice del nodo de salida actual (rota al reconectar). */
  exitIndex: number;
}

export class Anonymity {
  private state: AnonymityState = { torEnabled: false, exitIndex: 0 };

  isTorEnabled(): boolean {
    return this.state.torEnabled;
  }

  /** Enciende la red de anonimato y arma un circuito de 3 saltos. */
  enableTor(): Relay {
    this.state.torEnabled = true;
    this.state.exitIndex = (this.state.exitIndex + 1) % EXIT_NODES.length;
    return this.exitNode();
  }

  disableTor(): void {
    this.state.torEnabled = false;
  }

  /** Cambia de circuito: nuevos relays (si está encendido). */
  newCircuit(): Relay | null {
    if (!this.state.torEnabled) return null;
    this.state.exitIndex = (this.state.exitIndex + 1) % EXIT_NODES.length;
    return this.exitNode();
  }

  exitNode(): Relay {
    return EXIT_NODES[this.state.exitIndex];
  }

  /**
   * El circuito actual: entrada (guard) → medio → salida. Es determinista y
   * rota al reconectar (newCircuit). La propiedad clave que enseña: ningún
   * relay ve las dos puntas a la vez.
   */
  circuit(): Circuit {
    const i = this.state.exitIndex;
    return {
      guard: GUARDS[i % GUARDS.length],
      middle: MIDDLES[(i + 1) % MIDDLES.length],
      exit: EXIT_NODES[i],
    };
  }

  /** IP que ve el destino: la del nodo de salida si Tor está activo. */
  visibleIp(realIp: string): string {
    return this.state.torEnabled ? this.exitNode().ip : realIp;
  }

  /**
   * Nivel de anonimato (educativo): sube con Tor y MAC cambiada, pero nunca
   * llega a "total" — el mensaje es que el anonimato perfecto no existe.
   */
  level(macChanged: boolean): { score: number; label: string; tips: string[] } {
    let score = 0;
    if (this.state.torEnabled) score += 2;
    if (macChanged) score += 1;
    const label = score >= 3 ? "alto" : score >= 2 ? "medio" : score >= 1 ? "bajo" : "nulo";
    const tips: string[] = [];
    if (!this.state.torEnabled) tips.push("Enrutá por la red de anonimato: anon on");
    if (!macChanged) tips.push("Cambiá tu MAC: macchanger wlan0 random");
    tips.push("Ojo: los metadatos, los horarios y reutilizar identidades te delatan igual.");
    return { score, label, tips };
  }
}

/** Genera una MAC aleatoria-pero-determinista a partir de una semilla. */
export function randomMac(seed: number): string {
  const b = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 24).toString(16).padStart(2, "0");
  };
  // Primer octeto localmente administrado y par (unicast): 02.
  return ["02", b(), b(), b(), b(), b()].join(":");
}
