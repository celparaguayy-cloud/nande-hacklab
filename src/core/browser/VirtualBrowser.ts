import { VirtualDNS } from "../dns/VirtualDNS";
import {
  VirtualInternet,
  type VirtualResource,
} from "../internet/VirtualInternet";

export interface VirtualPage {
  hostname: string;
  address: string;
  path: string;
  title: string;
  content: string;
  mimeType: string;
}

export class VirtualBrowser {
  private dns: VirtualDNS;
  private internet: VirtualInternet;

  constructor(dns: VirtualDNS, internet: VirtualInternet) {
    this.dns = dns;
    this.internet = internet;
  }

  open(hostname: string, path: string = "/"): VirtualPage {
    const cleanHostname = hostname.toLowerCase();

    const address = this.dns.resolve(cleanHostname);

    if (!address) {
      throw new Error(`DNS: no se encontró ${hostname}`);
    }

    const resource: VirtualResource | undefined =
      this.internet.getResource(cleanHostname, path);

    if (!resource) {
      throw new Error(
        `Servidor virtual no disponible: ${hostname}${path}`
      );
    }

    const site = this.internet.getSite(cleanHostname);

    if (!site) {
      throw new Error(`Sitio virtual no disponible: ${hostname}`);
    }

    return {
      hostname: cleanHostname,
      address,
      path,
      title: site.title,
      content: resource.content,
      mimeType: resource.mimeType,
    };
  }

  canOpen(hostname: string, path: string = "/"): boolean {
    try {
      this.open(hostname, path);
      return true;
    } catch {
      return false;
    }
  }

  listSites() {
    return this.internet.listSites();
  }
}
