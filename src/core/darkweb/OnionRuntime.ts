/**
 * OnionRuntime — la "dark web" virtual de ÑANDE. Servicios OCULTOS (.onion)
 * que sólo son alcanzables cuando el circuito de anonimato está activo. No es
 * decoración: la reachability se decide por el ESTADO real de anonimato, así
 * que enseña la lección de verdad — a un servicio oculto no llegás por la red
 * normal, necesitás el circuito.
 *
 * Todo es ficticio, educativo y sandboxeado: no hay Tor real ni red real, y el
 * contenido es material de aprendizaje (no hay nada ilícito de verdad).
 */

export interface OnionSite {
  address: string;
  title: string;
  /** Contenido en texto plano (lo que “sirve” el servicio oculto). */
  content: string;
  /** Bandera que premia llegar (opcional). */
  flag?: string;
}

export class OnionRuntime {
  private sites = new Map<string, OnionSite>();
  /** Lee el estado real de anonimato (si el circuito está activo). */
  private isAnon: () => boolean;

  constructor(isAnon: () => boolean) {
    this.isAnon = isAnon;
    this.seed();
  }

  private seed(): void {
    this.add({
      address: "biblioteca7k2fx.onion",
      title: "La Biblioteca — archivo libre",
      content:
        "Un archivo de documentos y manuales de seguridad, espejado por la comunidad. " +
        "Lección: muchos servicios .onion son legítimos (privacidad, censura). " +
        "Bandera de práctica: ND{onion_alcanzada_con_circuito}",
      flag: "ND{onion_alcanzada_con_circuito}",
    });
    this.add({
      address: "mercadoq9v3zt.onion",
      title: "Mercado (simulado) — SÓLO EDUCATIVO",
      content:
        "Simulación de un mercado clandestino, sin nada real a la venta. Sirve para " +
        "entender cómo operan (escrow, reputación, OPSEC del vendedor) y cómo los " +
        "investigan las fuerzas de seguridad. Todo ficticio.",
    });
    this.add({
      address: "buzon4whistle.onion",
      title: "Buzón seguro — filtraciones",
      content:
        "Un buzón tipo SecureDrop para filtrantes y periodistas. Lección: la privacidad " +
        "fuerte también protege a quien denuncia al poder. Usá el circuito con OPSEC.",
    });
  }

  private add(s: OnionSite): void {
    this.sites.set(s.address.toLowerCase(), s);
  }

  /** Direcciones conocidas (un “directorio” del que se corre la voz). */
  directory(): { address: string; title: string }[] {
    return [...this.sites.values()].map((s) => ({ address: s.address, title: s.title }));
  }

  has(address: string): boolean {
    return this.sites.has(address.toLowerCase());
  }

  /**
   * Intenta alcanzar un servicio oculto. Sólo responde si el circuito de
   * anonimato está activo (estado real). Devuelve el contenido o el motivo por
   * el que no se llega.
   */
  browse(address: string): { ok: boolean; site?: OnionSite; message: string } {
    if (!this.isAnon()) {
      return {
        ok: false,
        message:
          "Servicio oculto inalcanzable: los .onion no se resuelven por la red normal. " +
          "Activá el circuito de anonimato primero (anon on).",
      };
    }
    const site = this.sites.get(address.toLowerCase());
    if (!site) {
      return { ok: false, message: `No se encontró el servicio oculto: ${address}` };
    }
    return { ok: true, site, message: `Conectado a ${site.address} vía el circuito.` };
  }
}
