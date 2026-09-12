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

/** Nodos de salida ficticios de la red de anonimato (deterministas). */
const EXIT_NODES = [
  { pais: "Islandia", ip: "51.0.12.7" },
  { pais: "Suiza", ip: "51.0.44.19" },
  { pais: "Países Bajos", ip: "51.0.77.3" },
  { pais: "Rumania", ip: "51.0.99.42" },
];

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

  /** Enciende la red de anonimato y elige un nodo de salida. */
  enableTor(): { pais: string; ip: string } {
    this.state.torEnabled = true;
    this.state.exitIndex = (this.state.exitIndex + 1) % EXIT_NODES.length;
    return this.exitNode();
  }

  disableTor(): void {
    this.state.torEnabled = false;
  }

  /** Cambia de circuito: nuevo nodo de salida (si está encendido). */
  newCircuit(): { pais: string; ip: string } | null {
    if (!this.state.torEnabled) return null;
    this.state.exitIndex = (this.state.exitIndex + 1) % EXIT_NODES.length;
    return this.exitNode();
  }

  exitNode(): { pais: string; ip: string } {
    return EXIT_NODES[this.state.exitIndex];
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
