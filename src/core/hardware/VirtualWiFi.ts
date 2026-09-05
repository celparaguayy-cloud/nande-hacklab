import type { VirtualNetwork } from "../network/VirtualNetwork";

/**
 * WiFi virtual de ÑANDE.
 *
 * La PC ve redes inalámbricas y se conecta a ellas. Todas son ficticias y
 * viven dentro del mundo: conectarse levanta la interfaz wlan0 y da acceso
 * a la red virtual; no hay wifi real de por medio.
 */

export interface WiFiNetwork {
  ssid: string;
  /** Señal 0-100. */
  signal: number;
  security: "abierta" | "WPA2" | "WPA3";
  /** Contraseña ficticia de laboratorio (solo si tiene seguridad). */
  password?: string;
  /** Descripción de a qué da acceso. */
  about: string;
}

const STORAGE_KEY = "nande-wifi";

/** Redes que se ven en el aire (todas del mundo virtual). */
const NETWORKS: WiFiNetwork[] = [
  {
    ssid: "ÑANDE-Home",
    signal: 92,
    security: "WPA2",
    password: "nande1234",
    about: "Red doméstica: acceso a la Internet virtual de ÑANDE.",
  },
  {
    ssid: "ÑANDE-Lab",
    signal: 78,
    security: "WPA3",
    password: "labseguro",
    about: "Red del laboratorio: acceso a las máquinas de práctica.",
  },
  {
    ssid: "CaféÑandé-Free",
    signal: 55,
    security: "abierta",
    about: "Red abierta: útil para aprender por qué las abiertas son riesgosas.",
  },
  {
    ssid: "Vecino-2G",
    signal: 34,
    security: "WPA2",
    password: "invitado",
    about: "Red del vecino virtual, señal débil.",
  },
];

export class VirtualWiFi {
  private network: VirtualNetwork;
  private connected: string | null;

  constructor(network: VirtualNetwork) {
    this.network = network;
    this.connected = this.load();

    // Si había una conexión guardada, se restablece la interfaz.
    if (this.connected) {
      this.network.setInterfaceState("wlan0", true);
    }
  }

  private load(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      if (this.connected) {
        localStorage.setItem(STORAGE_KEY, this.connected);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Sin persistencia el wifi igual funciona en esta sesión.
    }
  }

  /** Redes visibles, de mejor a peor señal. */
  scan(): WiFiNetwork[] {
    return NETWORKS.map((n) => {
      const copy = { ...n };
      // No se expone la contraseña al escanear.
      delete copy.password;
      return copy;
    }).sort((a, b) => b.signal - a.signal);
  }

  current(): string | null {
    return this.connected;
  }

  isConnected(): boolean {
    return this.connected !== null;
  }

  /**
   * Conecta a una red. Las abiertas no piden clave; las protegidas sí, y
   * debe coincidir con su clave ficticia de laboratorio.
   * Devuelve un mensaje del resultado.
   */
  connect(ssid: string, password?: string): { ok: boolean; message: string } {
    const net = NETWORKS.find(
      (n) => n.ssid.toLowerCase() === ssid.toLowerCase(),
    );

    if (!net) {
      return { ok: false, message: `No se encontró la red "${ssid}".` };
    }

    if (net.security !== "abierta") {
      if (!password) {
        return {
          ok: false,
          message: `"${net.ssid}" está protegida (${net.security}). Falta la contraseña.`,
        };
      }

      if (password !== net.password) {
        return { ok: false, message: `Contraseña incorrecta para "${net.ssid}".` };
      }
    }

    this.connected = net.ssid;
    this.network.setInterfaceState("wlan0", true);
    this.persist();

    return {
      ok: true,
      message: `Conectado a "${net.ssid}" (${net.security}). ${net.about}`,
    };
  }

  disconnect(): { ok: boolean; message: string } {
    if (!this.connected) {
      return { ok: false, message: "No hay ninguna red conectada." };
    }

    const previous = this.connected;
    this.connected = null;
    this.network.setInterfaceState("wlan0", false);
    this.persist();

    return { ok: true, message: `Desconectado de "${previous}".` };
  }
}
