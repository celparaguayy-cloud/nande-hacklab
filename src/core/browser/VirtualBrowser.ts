import { VirtualDNS } from "../dns/VirtualDNS";
import { VirtualNetwork } from "../network/VirtualNetwork";
import {
  VirtualInternet,
  type VirtualResource,
} from "../internet/VirtualInternet";
import { WebServer } from "../http/WebServer";
import type { HttpMethod, HttpResponse } from "../http/types";

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
  private server?: WebServer;
  /** Cookies guardadas por host, como las guardaría un navegador real. */
  private cookieJar = new Map<string, Record<string, string>>();

  constructor(
    dns: VirtualDNS,
    internet: VirtualInternet,
    network: VirtualNetwork,
    server?: WebServer,
  ) {
    this.dns = dns;
    this.internet = internet;
    this.network = network;
    this.server = server;
  }

  /** ¿Este host es una aplicación web dinámica (con HTTP real)? */
  isWebApp(hostname: string): boolean {
    return this.server?.has(hostname.toLowerCase()) ?? false;
  }

  private cookieHeader(host: string): string {
    const jar = this.cookieJar.get(host) ?? {};
    return Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private storeCookies(host: string, set: Record<string, string>): void {
    if (Object.keys(set).length === 0) return;

    const jar = this.cookieJar.get(host) ?? {};

    for (const [name, value] of Object.entries(set)) {
      if (value === "") delete jar[name];
      else jar[name] = value;
    }

    this.cookieJar.set(host, jar);
  }

  /** Cookies actuales de un host, para mostrarlas en las DevTools. */
  cookiesOf(host: string): Record<string, string> {
    return { ...(this.cookieJar.get(host.toLowerCase()) ?? {}) };
  }

  /**
   * Petición HTTP a una aplicación web del mundo.
   *
   * Maneja cookies y sigue redirecciones (hasta un tope), como un
   * navegador. Devuelve la respuesta final más la ruta a la que se llegó.
   */
  request(
    method: HttpMethod,
    hostname: string,
    fullPath: string,
    body: Record<string, string> = {},
  ): { response: HttpResponse; finalPath: string } {
    const host = hostname.toLowerCase();

    if (!this.server?.has(host)) {
      throw new Error(`No es una aplicación web: ${hostname}`);
    }

    const address = this.dns.resolve(host);

    if (address && !this.network.isReachable(address)) {
      throw new Error(`Red: ${host} no es alcanzable desde esta máquina`);
    }

    let path = fullPath || "/";
    let currentMethod = method;
    let currentBody = body;
    let response: HttpResponse | undefined;

    for (let hop = 0; hop < 6; hop += 1) {
      response = this.server.request(
        currentMethod,
        host,
        path,
        this.cookieHeader(host),
        currentBody,
      );

      this.storeCookies(host, response.setCookies);

      if (
        (response.status === 301 || response.status === 302) &&
        response.headers.Location
      ) {
        path = response.headers.Location;
        currentMethod = "GET";
        currentBody = {};
        continue;
      }

      break;
    }

    return { response: response!, finalPath: path };
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
