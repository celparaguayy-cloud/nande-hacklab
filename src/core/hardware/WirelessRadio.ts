/**
 * WirelessRadio — la radio 802.11 del mundo de ÑANDE.
 *
 * No es un "adivina la clave" de un solo paso: modela la cadena real de una
 * auditoría WiFi con la suite aircrack-ng, con sus dependencias de verdad.
 *
 *   1. airmon-ng start wlan0     → pone la placa en modo monitor (wlan0mon).
 *   2. airodump-ng wlan0mon      → escucha el aire: APs (BSSID, canal, cifrado)
 *                                  y las estaciones (clientes) asociadas.
 *   3. aireplay-ng --deauth      → expulsa a un cliente; al reconectarse, su
 *                                  4-way handshake WPA viaja por el aire y queda
 *                                  CAPTURADO. Sin cliente no hay handshake.
 *   4. aircrack-ng -w <lista>    → prueba el diccionario contra ESE handshake.
 *                                  Si la clave está en la lista, la encuentra.
 *
 * Cada paso exige el anterior: airodump no corre sin modo monitor, el deauth no
 * captura nada sin un cliente asociado, y aircrack no tiene qué crackear sin
 * handshake. Todo determinista y dentro del sandbox: no toca ninguna radio real.
 *
 * Las lecciones caen solas: una red abierta no tiene handshake que romper (se
 * espía directo), WPA3 (SAE) no cae a diccionario offline como WPA2, y una clave
 * larga que no está en la lista aguanta aunque captures el handshake.
 */

export type Encryption = "OPN" | "WPA2" | "WPA3";

/** Un punto de acceso visible en el aire. */
export interface AccessPoint {
  bssid: string;
  essid: string;
  channel: number;
  encryption: Encryption;
  /** Potencia recibida en dBm (más cerca de 0 = más fuerte). */
  power: number;
  /** Clave real de laboratorio (solo WPA2/WPA3). */
  password?: string;
  /** MAC de cada estación (cliente) asociada. */
  clients: string[];
  /** Bandera educativa al crackearla. */
  flag?: string;
}

/** Estado de captura de un AP durante la sesión. */
interface Capture {
  bssid: string;
  /** ¿Se capturó el 4-way handshake WPA? */
  handshake: boolean;
  /** Paquetes de datos "vistos" (para el contador estilo airodump). */
  data: number;
  /** Clave ya recuperada, si se crackeó. */
  crackedKey?: string;
}

/**
 * Diccionario de laboratorio: el subconjunto clásico de rockyou.txt. Es una
 * lista REAL contra la que se compara; si la clave del AP está acá, cae.
 */
export const ROCKYOU: string[] = [
  "123456", "12345678", "123456789", "password", "qwerty", "abc123",
  "111111", "1234567890", "invitado", "internet", "contraseña", "familia",
  "iloveyou", "admin", "welcome", "monkey", "dragon", "futbol",
  "paraguay", "asuncion", "guarani", "cerveza", "12345", "estrella",
];

export const WORDLISTS: Record<string, string[]> = {
  "rockyou.txt": ROCKYOU,
  "rockyou": ROCKYOU,
  // Listas chicas para demostrar que el tamaño del diccionario importa
  // (cuanto más corta, menos claves cubre).
  "top10.txt": ROCKYOU.slice(0, 10),
  "corta.txt": ROCKYOU.slice(0, 6),
};

/** APs del mundo. Alineados con las redes que ve `wifi scan`. */
function seedAccessPoints(): AccessPoint[] {
  return [
    {
      bssid: "A4:2B:8C:11:22:01", essid: "ÑANDE-Home", channel: 6,
      encryption: "WPA2", password: "nande1234", power: -42,
      clients: ["3C:5A:B4:00:00:11"],
    },
    {
      bssid: "F0:9F:C2:33:44:02", essid: "ÑANDE-Lab", channel: 11,
      encryption: "WPA3", password: "labseguro", power: -55,
      clients: ["3C:5A:B4:00:00:22"],
    },
    {
      bssid: "00:14:6C:55:66:03", essid: "CaféÑandé-Free", channel: 1,
      encryption: "OPN", power: -63,
      clients: ["3C:5A:B4:00:00:33", "3C:5A:B4:00:00:44"],
    },
    {
      bssid: "E8:94:F6:77:88:04", essid: "Vecino-2G", channel: 6,
      encryption: "WPA2", password: "invitado", power: -71,
      clients: ["3C:5A:B4:00:00:55"],
      flag: "ND{wifi_wpa_crackeada}",
    },
    {
      bssid: "B0:BE:76:99:AA:05", essid: "Corp-Secure", channel: 36,
      encryption: "WPA3", password: "R3d-C0rp-2024!largo", power: -78,
      clients: ["3C:5A:B4:00:00:66"],
    },
  ];
}

export class WirelessRadio {
  private aps: AccessPoint[];
  private monitor = false;
  private captures = new Map<string, Capture>();

  constructor() {
    this.aps = seedAccessPoints();
  }

  /* --------------------------------------------------------- modo monitor */

  /** ¿La placa está en modo monitor? (airodump/aireplay lo exigen). */
  isMonitor(): boolean {
    return this.monitor;
  }

  /** Nombre de la interfaz según el modo (como en Linux real). */
  iface(): string {
    return this.monitor ? "wlan0mon" : "wlan0";
  }

  startMonitor(): { ok: boolean; message: string } {
    if (this.monitor) {
      return { ok: true, message: "El modo monitor ya estaba activo en wlan0mon." };
    }
    this.monitor = true;
    return {
      ok: true,
      message: "modo monitor activado en wlan0mon (mac80211 monitor mode vif enabled)",
    };
  }

  stopMonitor(): { ok: boolean; message: string } {
    if (!this.monitor) {
      return { ok: false, message: "El modo monitor no estaba activo." };
    }
    this.monitor = false;
    return { ok: true, message: "modo monitor desactivado; wlan0 vuelve a modo managed." };
  }

  /* ------------------------------------------------------------- escaneo */

  /** APs del aire, de más fuerte a más débil (como los ordena airodump). */
  accessPoints(): AccessPoint[] {
    return [...this.aps].sort((a, b) => b.power - a.power);
  }

  /** Resuelve un AP por BSSID (MAC) o por ESSID (nombre), sin distinguir may/min. */
  resolve(ref: string): AccessPoint | undefined {
    const q = ref.trim().toLowerCase();
    return this.aps.find(
      (a) => a.bssid.toLowerCase() === q || a.essid.toLowerCase() === q,
    );
  }

  /** Estado de captura de un AP (crea uno vacío si no existía). */
  private captureOf(bssid: string): Capture {
    let c = this.captures.get(bssid);
    if (!c) {
      c = { bssid, handshake: false, data: 0 };
      this.captures.set(bssid, c);
    }
    return c;
  }

  hasHandshake(ref: string): boolean {
    const ap = this.resolve(ref);
    return ap ? !!this.captures.get(ap.bssid)?.handshake : false;
  }

  crackedKey(ref: string): string | undefined {
    const ap = this.resolve(ref);
    return ap ? this.captures.get(ap.bssid)?.crackedKey : undefined;
  }

  /* --------------------------------------------------------------- deauth */

  /**
   * Ataque de deautenticación: expulsa a un cliente del AP. Al reconectarse,
   * su handshake WPA queda capturado. Requiere modo monitor y AL MENOS un
   * cliente asociado. Una red abierta no tiene handshake que capturar.
   */
  deauth(ref: string): { ok: boolean; message: string; captured?: boolean } {
    if (!this.monitor) {
      return { ok: false, message: "aireplay-ng: la placa no está en modo monitor (corré 'airmon-ng start wlan0')." };
    }
    const ap = this.resolve(ref);
    if (!ap) {
      return { ok: false, message: `aireplay-ng: no veo ningún AP "${ref}" en el aire.` };
    }
    if (ap.clients.length === 0) {
      return {
        ok: false,
        message: `aireplay-ng: ${ap.essid} no tiene clientes asociados. Sin cliente no hay handshake que capturar.`,
      };
    }
    if (ap.encryption === "OPN") {
      return {
        ok: true,
        captured: false,
        message: `${ap.essid} es una red ABIERTA: no hay handshake WPA. El tráfico ya viaja en claro — se espía directo, no se crackea.`,
      };
    }
    const cap = this.captureOf(ap.bssid);
    cap.handshake = true;
    cap.data += 1;
    return {
      ok: true,
      captured: true,
      message: `handshake WPA capturado de ${ap.essid} (${ap.bssid}). Ya podés crackearlo con aircrack-ng.`,
    };
  }

  /* -------------------------------------------------------------- aircrack */

  /**
   * Corre un diccionario contra el handshake capturado de un AP. Devuelve una
   * traza con la mecánica real: cantidad de claves, velocidad y resultado.
   * No hay clave "mágica": si no está en la lista, no cae.
   */
  crack(ref: string, wordlist: string): {
    ok: boolean;
    found: boolean;
    key?: string;
    keysTested: number;
    rate: number;
    message: string;
    flag?: string;
  } {
    const ap = this.resolve(ref);
    if (!ap) {
      return { ok: false, found: false, keysTested: 0, rate: 0, message: `aircrack-ng: no encuentro el AP "${ref}".` };
    }
    if (ap.encryption === "OPN") {
      return {
        ok: false, found: false, keysTested: 0, rate: 0,
        message: `aircrack-ng: ${ap.essid} es una red abierta: no tiene clave que crackear.`,
      };
    }
    if (!this.captures.get(ap.bssid)?.handshake) {
      return {
        ok: false, found: false, keysTested: 0, rate: 0,
        message: `aircrack-ng: no hay handshake capturado de ${ap.essid}. Capturá uno primero (airodump-ng + aireplay-ng --deauth).`,
      };
    }
    const list = WORDLISTS[wordlist.toLowerCase()] ?? WORDLISTS["rockyou.txt"];
    const rate = ap.encryption === "WPA3" ? 380 : 1150; // k/s de laboratorio

    // WPA3 usa SAE: no se ataca con diccionario offline como WPA2. La lista
    // corre igual, pero el handshake no se puede validar así.
    if (ap.encryption === "WPA3") {
      return {
        ok: true, found: false, keysTested: list.length, rate,
        message:
          `aircrack-ng: ${ap.essid} usa WPA3 (SAE). SAE no permite el ataque de diccionario offline del WPA2:\n` +
          `cada intento exige hablar con el AP. El handshake capturado no alcanza. Por eso WPA3 es el consejo.`,
      };
    }

    const idx = list.findIndex((w) => w === ap.password);
    if (idx < 0) {
      return {
        ok: true, found: false, keysTested: list.length, rate,
        message:
          `aircrack-ng: probadas ${list.length}/${list.length} claves — KEY NOT FOUND.\n` +
          `La clave de ${ap.essid} no está en ${wordlist}. Una clave larga y aleatoria aguanta el diccionario.`,
      };
    }

    const cap = this.captureOf(ap.bssid);
    cap.crackedKey = ap.password;
    return {
      ok: true, found: true, key: ap.password, keysTested: idx + 1, rate,
      flag: ap.flag,
      message: `KEY FOUND! [ ${ap.password} ] — clave de ${ap.essid} recuperada en el intento ${idx + 1}.`,
    };
  }

  /** Reinicia el estado (para pruebas): managed, sin capturas. */
  reset(): void {
    this.aps = seedAccessPoints();
    this.monitor = false;
    this.captures.clear();
  }
}
