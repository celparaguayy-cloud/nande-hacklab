/**
 * SnapshotManager — Experimento G: guardar el estado del mundo y volver a él.
 *
 * Toma una foto de todo el estado persistente del juego (las claves
 * `nande-*` de localStorage: progreso, herramientas, notas, economía,
 * campaña, mundo…) y la guarda con un nombre. Restaurar reescribe esas
 * claves. Sirve para experimentar tranquilo: probás algo arriesgado, y si
 * sale mal, volvés a la foto anterior.
 *
 * Tras restaurar hay que recargar la app: el kernel se reconstruye leyendo el
 * almacenamiento, así que la foto vuelve a la vida en el próximo arranque.
 */

const SNAP_KEY = "nande-snapshots";
const PREFIX = "nande-";

export interface SnapshotMeta {
  name: string;
  tick: number;
  keys: number;
}

interface SnapshotStore {
  [name: string]: { tick: number; data: Record<string, string> };
}

export class SnapshotManager {
  private now: () => number;

  constructor(now: () => number = () => 0) {
    this.now = now;
  }

  private read(): SnapshotStore {
    try {
      const raw = localStorage.getItem(SNAP_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as SnapshotStore;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  private write(store: SnapshotStore): void {
    try {
      localStorage.setItem(SNAP_KEY, JSON.stringify(store));
    } catch {
      /* sin persistencia */
    }
  }

  /** Todas las claves de estado del juego, menos la de los propios snapshots. */
  private gameKeys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX) && k !== SNAP_KEY) keys.push(k);
      }
    } catch {
      /* sin storage */
    }
    return keys;
  }

  /** Guarda una foto del estado actual con un nombre. */
  create(name: string): { ok: boolean; message: string } {
    const clean = name.trim();
    if (!clean) return { ok: false, message: "poné un nombre para la foto" };

    const data: Record<string, string> = {};
    for (const k of this.gameKeys()) {
      const v = localStorage.getItem(k);
      if (v !== null) data[k] = v;
    }

    const store = this.read();
    store[clean] = { tick: this.now(), data };
    this.write(store);
    return {
      ok: true,
      message: `foto "${clean}" guardada (${Object.keys(data).length} claves)`,
    };
  }

  list(): SnapshotMeta[] {
    const store = this.read();
    return Object.entries(store).map(([name, s]) => ({
      name,
      tick: s.tick,
      keys: Object.keys(s.data).length,
    }));
  }

  /**
   * Restaura una foto: borra el estado actual del juego y reescribe el de la
   * foto. NO recarga la app (eso lo hace quien llama): el kernel se rehace al
   * reiniciar.
   */
  restore(name: string): { ok: boolean; message: string } {
    const store = this.read();
    const snap = store[name.trim()];
    if (!snap) return { ok: false, message: `no existe la foto "${name}"` };

    // Borrar el estado actual del juego (no toca la clave de snapshots).
    for (const k of this.gameKeys()) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    // Reescribir el de la foto.
    for (const [k, v] of Object.entries(snap.data)) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* ignore */
      }
    }
    return { ok: true, message: `foto "${name}" restaurada — recargá la app para verla` };
  }

  remove(name: string): boolean {
    const store = this.read();
    if (!store[name.trim()]) return false;
    delete store[name.trim()];
    this.write(store);
    return true;
  }
}
