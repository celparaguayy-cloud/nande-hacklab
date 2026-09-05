import { VirtualDNS } from "../dns/VirtualDNS";
import { VirtualNetwork } from "../network/VirtualNetwork";
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
  private network: VirtualNetwork;

  constructor(
    dns: VirtualDNS,
    internet: VirtualInternet,
    network: VirtualNetwork,
  ) {
    this.dns = dns;
    this.internet = internet;
    this.network = network;
  }

  open(hostname: string, path: string = "/"): VirtualPage {
    const cleanHostname = hostname.toLowerCase();

    const address = this.dns.resolve(cleanHostname);

    if (!address) {
      throw new Error(`DNS: no se encontró ${hostname}`);
    }

    // La navegacion pasa por la red virtual: si eth0 esta caida, o la
    // direccion queda fuera de la subred simulada, no hay respuesta.
    if (!this.network.isReachable(address)) {
      throw new Error(
        `Red: ${address} no es alcanzable desde esta máquina`,
      );
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
