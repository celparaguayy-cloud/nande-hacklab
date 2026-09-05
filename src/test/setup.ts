/**
 * Entorno de pruebas: localStorage en memoria.
 *
 * El mundo persiste en localStorage, que no existe en Node. Se instala una
 * version en memoria para que los sistemas se prueben tal como corren en el
 * navegador, sin tocar disco ni red.
 */
class MemoryStorage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
}

if (!("localStorage" in globalThis)) {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

export function resetStorage(): void {
  globalThis.localStorage.clear();
}

/**
 * Mundo reproducible.
 *
 * La simulacion decide con Math.random, asi que dos corridas de la misma
 * prueba exploraban mundos distintos y un caso podia fallar de vez en
 * cuando. En las pruebas se reemplaza el generador por uno con semilla:
 * el mundo se comporta igual siempre y un fallo se puede reproducir.
 *
 * Solo afecta al entorno de pruebas; la aplicacion sigue usando el
 * generador del navegador.
 */
const DEFAULT_SEED = 20260905;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reinicia el generador para que la prueba arranque siempre igual. */
export function seedRandom(seed: number = DEFAULT_SEED): void {
  Math.random = mulberry32(seed);
}

seedRandom();
