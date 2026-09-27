export interface DNSRecord {
  hostname: string;
  address: string;
  type: "A";
}

export class VirtualDNS {
  private records: Map<string, DNSRecord>;
  /** Entradas ENVENENADAS (DNS cache poisoning): nombre → IP falsa impuesta por
   *  un atacante. `resolve` las consulta ANTES que los registros reales, así el
   *  envenenamiento afecta a TODO lo que resuelve (nslookup, dig, curl, el
   *  navegador…): fuente única, ataque real, no un truco por comando. */
  private poisonMap = new Map<string, string>();

  constructor() {
    this.records = new Map();

    this.addRecord("gateway.nande", "10.10.0.1");
    this.addRecord("dns.nande", "10.10.0.53");

    this.addRecord("www.nande", "10.10.0.30");
    this.addRecord("video.nande", "10.10.0.31");
    this.addRecord("academy.nande", "10.10.0.32");
    this.addRecord("news.nande", "10.10.0.33");
    this.addRecord("git.nande", "10.10.0.34");
    this.addRecord("ctf.nande", "10.10.0.35");
    this.addRecord("shop.nande", "10.10.0.36");
    this.addRecord("search.nande", "10.10.0.37");

    this.addRecord("server01.lab", "10.10.0.20");
  }

  addRecord(hostname: string, address: string): void {
    this.records.set(
      hostname.toLowerCase(),
      {
        hostname,
        address,
        type: "A",
      }
    );
  }

  /** Alta de dominio en la zona virtual (la usan los habitantes). */
  register(hostname: string, address: string): DNSRecord {
    this.addRecord(hostname, address);

    return this.getRecord(hostname)!;
  }

  /** Baja de dominio. Devuelve si existia. */
  remove(hostname: string): boolean {
    return this.records.delete(hostname.toLowerCase());
  }

  has(hostname: string): boolean {
    return this.records.has(hostname.toLowerCase());
  }

  resolve(hostname: string): string | undefined {
    const key = hostname.toLowerCase();
    // El envenenamiento gana: si el nombre está spoofeado, resuelve a la IP
    // falsa (como una caché DNS comprometida en la vida real).
    const poisoned = this.poisonMap.get(key);
    if (poisoned !== undefined) return poisoned;
    return this.records.get(key)?.address;
  }

  /* --------------------------------------------------- DNS cache poisoning */

  /** Envenená la caché: fuerza que `hostname` resuelva a `address` (ataque). */
  poison(hostname: string, address: string): void {
    this.poisonMap.set(hostname.toLowerCase(), address);
  }

  /** Limpiá el envenenamiento de un nombre (o de TODOS si se omite). Devuelve
   *  cuántas entradas se limpiaron. */
  unpoison(hostname?: string): number {
    if (hostname) return this.poisonMap.delete(hostname.toLowerCase()) ? 1 : 0;
    const n = this.poisonMap.size;
    this.poisonMap.clear();
    return n;
  }

  /** ¿Está este nombre envenenado? Devuelve la IP falsa, o undefined. */
  poisonedAddress(hostname: string): string | undefined {
    return this.poisonMap.get(hostname.toLowerCase());
  }

  /** Nombres envenenados ahora mismo, con su IP falsa y la real (si existía). */
  poisonedNames(): { hostname: string; address: string; real?: string }[] {
    return [...this.poisonMap.entries()].map(([hostname, address]) => ({
      hostname,
      address,
      real: this.records.get(hostname)?.address,
    }));
  }

  getRecord(hostname: string): DNSRecord | undefined {
    const record = this.records.get(
      hostname.toLowerCase()
    );

    return record ? structuredClone(record) : undefined;
  }

  listRecords(): DNSRecord[] {
    return Array.from(this.records.values()).map(
      (record) => structuredClone(record)
    );
  }
}
