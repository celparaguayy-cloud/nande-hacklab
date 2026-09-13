import { VirtualDNS } from "../dns/VirtualDNS";
import { VirtualNetwork } from "../network/VirtualNetwork";
import {
  VirtualInternet,
  type VirtualResource,
} from "../internet/VirtualInternet";
import { WebServer } from "../http/WebServer";
import type { HttpMethod, HttpResponse } from "../http/types";
import type { HostRuntime } from "../net/HostRuntime";

export interface VirtualPage {
  hostname: string;
  address: string;
  path: string;
  title: string;
  content: string;
  mimeType: string;
}

/**
 * Un hecho de tráfico HTTP REAL: lo que de verdad viajó por la red virtual en
 * una petición. Es lo que captura NandeShark (incluye el cuerpo del formulario,
 * así una credencial enviada en claro se ve "en el cable" — la lección clásica).
 */
export interface TrafficRecord {
  method: HttpMethod;
  host: string;
  ip: string;
  path: string;
  status: number;
  reqBody: Record<string, string>;
  tick: number;
}

export class VirtualBrowser {
  private dns: VirtualDNS;
  private internet: VirtualInternet;
  private network: VirtualNetwork;
  private server?: WebServer;
  private hosts?: HostRuntime;
  private onTraffic?: (t: TrafficRecord) => void;
  private now: () => number;
  /** Último sitio que el jugador visitó (para que La Mani sepa dónde está). */
  private lastHost = "";
  /** Cookies guardadas por host, como las guardaría un navegador real. */
  private cookieJar = new Map<string, Record<string, string>>();

  constructor(
    dns: VirtualDNS,
    internet: VirtualInternet,
    network: VirtualNetwork,
    server?: WebServer,
    hosts?: HostRuntime,
    opts?: { onTraffic?: (t: TrafficRecord) => void; now?: () => number },
  ) {
    this.dns = dns;
    this.internet = internet;
    this.network = network;
    this.server = server;
    this.hosts = hosts;
    this.onTraffic = opts?.onTraffic;
    this.now = opts?.now ?? (() => 0);
  }

  /**
   * Comprueba que el servicio HTTP del host esté realmente disponible en el
   * HostRuntime. Si el host no está gestionado ahí, no interfiere. Si el
   * servicio está caído o el puerto bloqueado, deja el evento y lanza el
   * error de conexión rechazada — igual que un servidor real que no escucha.
   */
  private assertHttpUp(host: string): void {
    if (!this.hosts) return;
    if (this.hosts.httpReachable(host)) return;
    this.hosts.refuseConnection(host, 80, "servicio HTTP caído o puerto bloqueado");
    throw new Error(
      `Conexión rechazada: ${host} no acepta HTTP (servicio caído o puerto bloqueado)`,
    );
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
    this.lastHost = host;

    if (!this.server?.has(host)) {
      throw new Error(`No es una aplicación web: ${hostname}`);
    }

    const address = this.dns.resolve(host);

    if (address && !this.network.isReachable(address)) {
      throw new Error(`Red: ${host} no es alcanzable desde esta máquina`);
    }

    this.assertHttpUp(host);

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

    // El tráfico REAL de esta petición queda disponible para quien escuche el
    // cable (NandeShark). No es un log decorativo: es lo que de verdad viajó,
    // incluido el cuerpo del formulario tal cual se envió.
    this.onTraffic?.({
      method,
      host,
      ip: this.dns.resolve(host) ?? "",
      path: fullPath || "/",
      status: response!.status,
      reqBody: body,
      tick: this.now(),
    });

    return { response: response!, finalPath: path };
  }

  /** El último sitio visitado (para el contexto de La Mani). */
  currentSite(): string {
    return this.lastHost;
  }

  open(hostname: string, path: string = "/"): VirtualPage {
    const cleanHostname = hostname.toLowerCase();
    this.lastHost = cleanHostname;

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

    this.assertHttpUp(cleanHostname);

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
