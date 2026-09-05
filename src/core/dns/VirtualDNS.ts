export interface DNSRecord {
  hostname: string;
  address: string;
  type: "A";
}

export class VirtualDNS {
  private records: Map<string, DNSRecord>;

  constructor() {
    this.records = new Map();

    this.addRecord("gateway.nande", "10.10.0.1");
    this.addRecord("dns.nande", "10.10.0.53");
    this.addRecord("server01.lab", "10.10.0.20");
    this.addRecord("web.nande", "10.10.0.30");
  }

  addRecord(hostname: string, address: string): void {
    this.records.set(hostname.toLowerCase(), {
      hostname,
      address,
      type: "A",
    });
  }

  resolve(hostname: string): string | undefined {
    return this.records.get(hostname.toLowerCase())?.address;
  }

  getRecord(hostname: string): DNSRecord | undefined {
    const record = this.records.get(hostname.toLowerCase());

    return record ? structuredClone(record) : undefined;
  }

  listRecords(): DNSRecord[] {
    return Array.from(this.records.values()).map((record) =>
      structuredClone(record),
    );
  }
}
