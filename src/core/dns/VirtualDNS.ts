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

    this.addRecord("www.nande", "10.10.0.30");
    this.addRecord("video.nande", "10.10.0.31");
    this.addRecord("academy.nande", "10.10.0.32");
    this.addRecord("news.nande", "10.10.0.33");
    this.addRecord("git.nande", "10.10.0.34");
    this.addRecord("ctf.nande", "10.10.0.35");
    this.addRecord("shop.nande", "10.10.0.36");

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

  resolve(hostname: string): string | undefined {
    return this.records.get(
      hostname.toLowerCase()
    )?.address;
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
