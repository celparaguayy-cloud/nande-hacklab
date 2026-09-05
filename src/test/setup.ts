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
