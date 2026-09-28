import type { VirtualNetwork } from "../network/VirtualNetwork";
import type { WirelessRadio, AccessPoint } from "./WirelessRadio";

/**
 * WiFi virtual de ÑANDE.
 *
 * La PC ve redes inalámbricas y se conecta a ellas. Todas son ficticias y
 * viven dentro del mundo: conectarse levanta la interfaz wlan0 y da acceso
 * a la red virtual; no hay wifi real de por medio.
 *
 * FUENTE ÚNICA (regla 2): no mantiene su propia lista de redes. El aire lo
 * define WirelessRadio (el mismo que ven airodump-ng y la suite aircrack). Así
 * `wifi scan` y `airodump-ng` muestran las MISMAS redes, con la MISMA seguridad
 * y clave: si crackeás una WPA con aircrack, esa misma clave te conecta acá.
 */

export interface WiFiNetwork {
  ssid: string;
  /** Señal 0-100 (derivada de la potencia en dBm del AP). */
  signal: number;
  security: "abierta" | "WPA2" | "WPA3";
  /** Contraseña ficticia de laboratorio (solo si tiene seguridad). */
  password?: string;
  /** Descripción de a qué da acceso. */
  about: string;
}

const STORAGE_KEY = "nande-wifi";

/** Potencia recibida (dBm) → barra de señal 0-100. -30dBm≈100, -90dBm≈0. */
function powerToSignal(dbm: number): number {
  return Math.max(0, Math.min(100, Math.round(((dbm + 90) / 60) * 100)));
}

/** Cifrado de la radio → etiqueta de seguridad de la UI de wifi. */
function securityOf(ap: AccessPoint): WiFiNetwork["security"] {
  return ap.encryption === "OPN" ? "abierta" : ap.encryption;
}

export class VirtualWiFi {
  private network: VirtualNetwork;
  private radio: WirelessRadio;
  private connected: string | null;

  constructor(network: VirtualNetwork, radio: WirelessRadio) {
    this.network = network;
    this.radio = radio;
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

  /** Redes visibles, de mejor a peor señal. Derivadas del aire (WirelessRadio):
   *  las MISMAS que ve airodump-ng. Sin exponer contraseñas. */
  scan(): WiFiNetwork[] {
    return this.radio.accessPoints().map((ap) => ({
      ssid: ap.essid,
      signal: powerToSignal(ap.power),
      security: securityOf(ap),
      about: ap.about ?? `Red ${ap.encryption} en canal ${ap.channel}.`,
    }));
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
    const ap = this.radio.resolve(ssid);

    if (!ap) {
      return { ok: false, message: `No se encontró la red "${ssid}".` };
    }

    const security = securityOf(ap);
    if (security !== "abierta") {
      if (!password) {
        return {
          ok: false,
          message: `"${ap.essid}" está protegida (${security}). Falta la contraseña.`,
        };
      }

      // La clave real es la del aire (WirelessRadio): la misma que recupera
      // aircrack. Conocerla o haberla crackeado da lo mismo — vale la clave.
      if (password !== ap.password) {
        return { ok: false, message: `Contraseña incorrecta para "${ap.essid}".` };
      }
    }

    this.connected = ap.essid;
    this.network.setInterfaceState("wlan0", true);
    this.persist();

    return {
      ok: true,
      message: `Conectado a "${ap.essid}" (${security}). ${ap.about ?? ""}`.trimEnd(),
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
