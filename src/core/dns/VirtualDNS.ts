export type DNSType = "A" | "TXT" | "CNAME" | "NS" | "MX" | "PTR";

export interface DNSRecord {
  hostname: string;
  address: string;
  type: "A";
}

/** Una respuesta de consulta genérica (lo que muestra `dig`). */
export interface DNSAnswer {
  name: string;
  type: DNSType;
  /** IP (A), texto (TXT), destino (CNAME/NS/MX/PTR). */
  value: string;
  /** Prioridad (sólo MX). */
  priority?: number;
}

/** Configuración de una zona DNS (para transferencia de zona / AXFR). */
interface ZoneConfig {
  /** Si es true, la zona permite AXFR a cualquiera: MALA config (leak de la
   *  zona entera). Es la vulnerabilidad clásica de recon por DNS. */
  axfrAllowed: boolean;
  /** Bandera que se captura al lograr la transferencia de zona. */
  flag?: string;
}

export class VirtualDNS {
  private records: Map<string, DNSRecord>;
  /** Entradas ENVENENADAS (DNS cache poisoning): nombre → IP falsa impuesta por
   *  un atacante. `resolve` las consulta ANTES que los registros reales, así el
   *  envenenamiento afecta a TODO lo que resuelve (nslookup, dig, curl, el
   *  navegador…): fuente única, ataque real, no un truco por comando. */
  private poisonMap = new Map<string, string>();
  // Registros no-A: son estado real de la zona, no adorno. `dig` los consulta y
  // la transferencia de zona (AXFR) los vuelca todos si la zona está mal
  // configurada. Fuente única para todo lo que consulta DNS.
  private txtRecords = new Map<string, string[]>();
  private cnameRecords = new Map<string, string>();
  private nsRecords = new Map<string, string[]>();
  private mxRecords = new Map<string, { host: string; priority: number }[]>();
  private zoneCfg = new Map<string, ZoneConfig>();

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

    // --- Registros de zona (realismo + recon). El dominio público nande está
    // BIEN configurado (no permite AXFR); la zona corporativa interna.nande está
    // MAL configurada y filtra toda su lista de hosts internos por transferencia
    // de zona: la vulnerabilidad clásica de recon por DNS.
    this.addNs("nande", "dns.nande");
    this.addMx("nande", "mail.nande", 10);
    this.addRecord("mail.nande", "10.10.0.38");
    this.addTxt("nande", "v=spf1 include:mail.nande -all");
    this.addTxt("nande", "nande-site-verification=n4nd3-r34lm-2024");
    this.configureZone("nande", { axfrAllowed: false });

    // Zona corporativa interna: AXFR abierto (mala config) → filtra los hosts
    // internos (el jump host y su LAN) que de otro modo habría que adivinar.
    this.addNs("interna.nande", "dns.nande");
    this.addTxt("interna.nande", "respaldos nocturnos hacia db-core; ver el NAS");
    this.configureZone("interna.nande", { axfrAllowed: true, flag: "ND{dns_zone_transfer}" });
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

  /* ---------------------------------------- registros no-A / zonas (recon) */

  addTxt(name: string, text: string): void {
    const key = name.toLowerCase();
    const arr = this.txtRecords.get(key) ?? [];
    arr.push(text);
    this.txtRecords.set(key, arr);
  }
  addCname(alias: string, canonical: string): void {
    this.cnameRecords.set(alias.toLowerCase(), canonical.toLowerCase());
  }
  addNs(zone: string, host: string): void {
    const key = zone.toLowerCase();
    const arr = this.nsRecords.get(key) ?? [];
    if (!arr.includes(host.toLowerCase())) arr.push(host.toLowerCase());
    this.nsRecords.set(key, arr);
  }
  addMx(zone: string, host: string, priority: number): void {
    const key = zone.toLowerCase();
    const arr = this.mxRecords.get(key) ?? [];
    arr.push({ host: host.toLowerCase(), priority });
    this.mxRecords.set(key, arr);
  }
  configureZone(zone: string, cfg: ZoneConfig): void {
    this.zoneCfg.set(zone.toLowerCase(), cfg);
  }

  /**
   * Consulta genérica de un tipo de registro (lo que hace `dig <name> <type>`).
   * Para A respeta el envenenamiento y sigue una cadena de CNAME (como un
   * resolver real). Devuelve las respuestas (vacío si no hay).
   */
  query(name: string, type: DNSType = "A"): DNSAnswer[] {
    const key = name.toLowerCase();
    switch (type) {
      case "A": {
        const cname = this.cnameRecords.get(key);
        const out: DNSAnswer[] = [];
        if (cname) out.push({ name: key, type: "CNAME", value: cname });
        const addr = this.resolve(cname ?? key);
        if (addr) out.push({ name: (cname ?? key), type: "A", value: addr });
        return out;
      }
      case "TXT":
        return (this.txtRecords.get(key) ?? []).map((value) => ({ name: key, type: "TXT" as const, value }));
      case "CNAME": {
        const c = this.cnameRecords.get(key);
        return c ? [{ name: key, type: "CNAME", value: c }] : [];
      }
      case "NS":
        return (this.nsRecords.get(key) ?? []).map((value) => ({ name: key, type: "NS" as const, value }));
      case "MX":
        return (this.mxRecords.get(key) ?? [])
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((m) => ({ name: key, type: "MX" as const, value: m.host, priority: m.priority }));
      case "PTR": {
        const n = this.reverse(name);
        return n ? [{ name, type: "PTR", value: n }] : [];
      }
    }
  }

  /** DNS inverso (PTR): el nombre cuyo registro A apunta a esa IP. */
  reverse(ip: string): string | undefined {
    for (const r of this.records.values()) {
      if (r.address === ip) return r.hostname;
    }
    return undefined;
  }

  /** Config de zona (si existe). */
  zoneConfig(zone: string): ZoneConfig | undefined {
    return this.zoneCfg.get(zone.toLowerCase());
  }
  zones(): string[] {
    return [...this.zoneCfg.keys()];
  }

  /** ¿Un nombre pertenece a la zona? (igual a la zona o subdominio de ella). */
  private inZone(name: string, zone: string): boolean {
    return name === zone || name.endsWith(`.${zone}`);
  }

  /**
   * Transferencia de zona (AXFR): si la zona la permite (mala config), vuelca
   * TODOS sus registros —A, CNAME, TXT, NS, MX— en una sola consulta. Es la
   * vulnerabilidad de recon: filtra los nombres internos que de otro modo habría
   * que adivinar. Si la zona no lo permite (lo normal), se rechaza.
   */
  zoneTransfer(zone: string): { allowed: boolean; records: DNSAnswer[]; flag?: string } {
    const z = zone.toLowerCase();
    const cfg = this.zoneCfg.get(z);
    if (!cfg || !cfg.axfrAllowed) return { allowed: false, records: [] };
    const out: DNSAnswer[] = [];
    for (const [host] of this.nsRecords) {
      if (this.inZone(host, z)) for (const v of this.nsRecords.get(host)!) out.push({ name: host, type: "NS", value: v });
    }
    for (const r of this.records.values()) {
      if (this.inZone(r.hostname.toLowerCase(), z)) out.push({ name: r.hostname, type: "A", value: r.address });
    }
    for (const [alias, canonical] of this.cnameRecords) {
      if (this.inZone(alias, z)) out.push({ name: alias, type: "CNAME", value: canonical });
    }
    for (const [name, texts] of this.txtRecords) {
      if (this.inZone(name, z)) for (const t of texts) out.push({ name, type: "TXT", value: t });
    }
    for (const [name, mxs] of this.mxRecords) {
      if (this.inZone(name, z)) for (const m of mxs) out.push({ name, type: "MX", value: m.host, priority: m.priority });
    }
    return { allowed: true, records: out, flag: cfg.flag };
  }
}
