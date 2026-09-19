import type { Economy } from "../economy/Economy";
import type { NewsEngine } from "../news/NewsEngine";
import type { Notoriety } from "../game/Notoriety";
import type { Campaign } from "../campaign/Campaign";
import type { EventBus } from "../events/EventBus";

/**
 * Motor de consecuencias — el corazón de "el mundo reacciona a vos".
 *
 * Cuando el jugador captura una bandera o pulla un golpe, este motor
 * propaga las ondas por el resto de la simulación: la bolsa se sacude, el
 * diario titula, sube tu notoriedad y tu calor, y la campaña avanza. Un
 * solo hack toca economía + medios + progreso + persecución.
 */

/** Reacción del mundo a una señal capturada. */
interface Reaction {
  /** Ticker de la bolsa a sacudir y cuánto. */
  stock?: { ticker: string; factor: number };
  /** Titular del diario. */
  headline?: { title: string; body: string; category: string };
  notoriety: number;
  heat: number;
  faction?: { name: "colectivo" | "corporacion" | "agencia"; amount: number };
}

/** Qué provoca en el mundo cada bandera conocida. */
const REACTIONS: Record<string, Reaction> = {
  "ND{sqli_login_bypass}": {
    stock: { ticker: "MBA", factor: -0.12 },
    headline: {
      title: "Brecha en Mbarete Bank: acceso no autorizado al home banking",
      body: "Un fallo en el inicio de sesión permitió entrar como administrador. La acción del banco cae.",
      category: "Seguridad",
    },
    notoriety: 10,
    heat: 15,
    faction: { name: "colectivo", amount: 8 },
  },
  "M8arete-2024!": {
    stock: { ticker: "MBA", factor: -0.2 },
    headline: {
      title: "Filtración masiva: Mbarete guardaba las contraseñas en texto plano",
      body: "Datos de miles de clientes quedaron expuestos. Indignación y desplome de la acción.",
      category: "Seguridad",
    },
    notoriety: 15,
    heat: 25,
    faction: { name: "colectivo", amount: 12 },
  },
  "ND{jwt_forged_admin}": {
    stock: { ticker: "MBA", factor: -0.3 },
    headline: {
      title: "Mbarete pierde el control de su API tras un ataque de falsificación de tokens",
      body: "El colectivo Año'ῖ demuestra que cualquiera podía hacerse pasar por administrador.",
      category: "Seguridad",
    },
    notoriety: 30,
    heat: 40,
    faction: { name: "colectivo", amount: 20 },
  },
  "ND{idor_album_ajeno}": {
    stock: { ticker: "ARA", factor: -0.08 },
    headline: {
      title: "Fotos Arandú expuso álbumes privados por un fallo de permisos",
      body: "Cambiar un número en la URL bastaba para ver fotos ajenas.",
      category: "Seguridad",
    },
    notoriety: 8,
    heat: 10,
  },
  "ND{xss_reflejado}": {
    headline: {
      title: "Yvoty Blog inyectaba scripts: el buscador no filtraba nada",
      body: "Una búsqueda con una etiqueta <script> se ejecutaba en el navegador de cualquiera que abriera el enlace.",
      category: "Seguridad",
    },
    notoriety: 7,
    heat: 8,
  },
  "ND{cmd_injection_pwned}": {
    stock: { ticker: "PYT", factor: -0.1 },
    headline: {
      title: "Ejecución remota de comandos en Herramientas Pytã",
      body: "Una utilidad de red permitía correr comandos arbitrarios en el servidor.",
      category: "Seguridad",
    },
    notoriety: 12,
    heat: 18,
  },
  "ND{sniff_credenciales}": {
    headline: {
      title: "Sniffing en la red: credenciales viajaban en texto plano",
      body: "Un servicio sin cifrar dejaba ver usuario y contraseña a cualquiera en el segmento.",
      category: "Seguridad",
    },
    notoriety: 12,
    heat: 10,
  },
  "ND{arp_mitm}": {
    headline: {
      title: "Ataque man-in-the-middle por ARP spoofing",
      body: "Un atacante se puso entre la víctima y el router e interceptó su sesión.",
      category: "Seguridad",
    },
    notoriety: 16,
    heat: 18,
    faction: { name: "colectivo", amount: 8 },
  },
  "ND{wifi_wpa_crackeada}": {
    headline: {
      title: "Clave WiFi débil crackeada con diccionario",
      body: "Una red con contraseña común cayó en segundos ante un ataque offline.",
      category: "Seguridad",
    },
    notoriety: 10,
    heat: 8,
  },
  "ND{ssh_fuerza_bruta}": {
    headline: {
      title: "Servidor comprometido por fuerza bruta de SSH",
      body: "Miles de intentos automatizados dieron con una contraseña débil reutilizada.",
      category: "Seguridad",
    },
    notoriety: 12,
    heat: 14,
  },
  "ND{pivot_interno}": {
    stock: { ticker: "ÑND", factor: -0.1 },
    headline: {
      title: "Movimiento lateral: llegaron a la red interna por un host puente",
      body: "Tras tomar una máquina expuesta, el atacante pivoteó hacia segmentos internos con datos sensibles.",
      category: "Seguridad",
    },
    notoriety: 20,
    heat: 24,
    faction: { name: "colectivo", amount: 12 },
  },
  "ND{ssti_contexto_expuesto}": {
    stock: { ticker: "ÑND", factor: -0.11 },
    headline: {
      title: "SSTI en Codeá: la plantilla ejecutaba código del usuario",
      body: "Un generador de saludos evaluaba lo que el usuario metía entre llaves, exponiendo el servidor.",
      category: "Seguridad",
    },
    notoriety: 16,
    heat: 20,
    faction: { name: "colectivo", amount: 10 },
  },
  "ND{xxe_archivo_leido}": {
    headline: {
      title: "XXE en Nova: el importador leía archivos del servidor",
      body: "El parser de XML resolvía entidades externas y filtraba archivos internos.",
      category: "Seguridad",
    },
    notoriety: 14,
    heat: 18,
  },
  "ND{nosql_auth_bypass}": {
    stock: { ticker: "ÑND", factor: -0.14 },
    headline: {
      title: "Inyección NoSQL en Redix: entraban sin contraseña",
      body: "Un operador de Mongo en el login bastaba para autenticarse como administrador.",
      category: "Seguridad",
    },
    notoriety: 18,
    heat: 22,
    faction: { name: "colectivo", amount: 12 },
  },
  "ND{race_condition_toctou}": {
    headline: {
      title: "Condición de carrera en Gulu Cupones: se canjeaban de más",
      body: "Peticiones simultáneas explotaban la ventana entre chequear y descontar el cupón.",
      category: "Seguridad",
    },
    notoriety: 12,
    heat: 14,
  },
  "ND{csrf_transferencia}": {
    stock: { ticker: "MBA", factor: -0.1 },
    headline: {
      title: "CSRF en Banco Justicia: transferencias forzadas sin permiso",
      body: "La app móvil hacía transferencias con solo la cookie de sesión, sin token anti-CSRF.",
      category: "Seguridad",
    },
    notoriety: 12,
    heat: 16,
    faction: { name: "colectivo", amount: 8 },
  },
  "ND{lfi_config_incluida}": {
    headline: {
      title: "Portal Nova filtró su configuración por un LFI",
      body: "El portal incluía cualquier archivo que se le pidiera; se accedió a la config con secretos.",
      category: "Seguridad",
    },
    notoriety: 12,
    heat: 14,
  },
  "ND{upload_webshell}": {
    stock: { ticker: "ÑND", factor: -0.12 },
    headline: {
      title: "Bytebox comprometido: subieron una webshell",
      body: "El alojamiento aceptaba cualquier archivo; un script subido terminó ejecutándose en el servidor.",
      category: "Seguridad",
    },
    notoriety: 22,
    heat: 28,
    faction: { name: "colectivo", amount: 14 },
  },
  "ND{deserializacion_insegura}": {
    headline: {
      title: "Redix confiaba en sesiones serializadas del cliente",
      body: "Un objeto de sesión manipulado bastaba para hacerse pasar por administrador.",
      category: "Seguridad",
    },
    notoriety: 16,
    heat: 20,
    faction: { name: "colectivo", amount: 10 },
  },
  "ND{ssrf_metadata_robada}": {
    stock: { ticker: "VTX", factor: -0.16 },
    headline: {
      title: "SSRF en Vortex: robaron credenciales internas de la nube",
      body: "Un previsualizador de enlaces permitía llegar a la metadata interna y sacar llaves de administrador.",
      category: "Seguridad",
    },
    notoriety: 16,
    heat: 22,
    faction: { name: "colectivo", amount: 10 },
  },
  "ND{ssrf_interno}": {
    headline: {
      title: "Vortex expuso un panel interno por una petición del servidor",
      body: "El servicio alcanzaba direcciones que solo debían verse desde adentro.",
      category: "Seguridad",
    },
    notoriety: 10,
    heat: 12,
  },
  "ND{jwt_alg_none}": {
    stock: { ticker: "VTX", factor: -0.22 },
    headline: {
      title: "Vortex API aceptaba tokens sin firma (alg:none)",
      body: "Cualquiera podía hacerse pasar por administrador enviando un JWT no firmado.",
      category: "Seguridad",
    },
    notoriety: 20,
    heat: 26,
    faction: { name: "colectivo", amount: 12 },
  },
  "ND{open_redirect}": {
    headline: {
      title: "Enlaces de Gulu Link se usaban para phishing",
      body: "El acortador redirigía a cualquier sitio sin validar el destino.",
      category: "Seguridad",
    },
    notoriety: 7,
    heat: 8,
  },
  "ND{path_traversal_secreto}": {
    stock: { ticker: "TAP", factor: -0.09 },
    headline: {
      title: "Archivos Tapé filtró su configuración por un path traversal",
      body: "Se accedió a un archivo de secretos fuera de la carpeta pública.",
      category: "Seguridad",
    },
    notoriety: 10,
    heat: 12,
  },
};

export class Consequences {
  private economy: Economy;
  private news: NewsEngine;
  private notoriety: Notoriety;
  private campaign: Campaign;
  private events: EventBus;

  /** Señales ya procesadas, para no aplicar dos veces la misma consecuencia. */
  private processed = new Set<string>();

  constructor(deps: {
    economy: Economy;
    news: NewsEngine;
    notoriety: Notoriety;
    campaign: Campaign;
    events: EventBus;
  }) {
    this.economy = deps.economy;
    this.news = deps.news;
    this.notoriety = deps.notoriety;
    this.campaign = deps.campaign;
    this.events = deps.events;
  }

  /**
   * Procesa una señal capturada (bandera, contraseña, crack…). Propaga las
   * consecuencias por el mundo y avanza la campaña. Devuelve un resumen
   * para que la UI lo muestre.
   */
  capture(
    signal: string,
    tick: number,
  ): {
    reacted: boolean;
    busted: boolean;
    headline?: string;
    chapterCompleted?: string;
    campaignCompleted?: boolean;
  } {
    // La campaña siempre se entera (aunque no haya reacción económica).
    const progress = this.campaign.report(signal);

    if (this.processed.has(signal)) {
      return {
        reacted: false,
        busted: false,
        chapterCompleted: progress.chapterCompleted?.title,
        campaignCompleted: progress.campaignCompleted,
      };
    }
    this.processed.add(signal);

    // Banderas de acceso a sitios de habitantes: ND{acceso:<sitio>}. No
    // están en la tabla fija, pero comprometer a alguien igual tiene
    // consecuencias — sube tu notoriedad y tu calor, y el mundo se entera.
    const accessMatch = signal.match(/^ND\{acceso:([^}]+)\}$/);
    if (accessMatch) {
      const site = accessMatch[1];
      this.notoriety.addNotoriety(12);
      this.notoriety.adjustReputation("colectivo", 4);
      const { busted } = this.notoriety.addHeat(14);
      const article = this.news.headline(
        `Intrusión reportada en ${site}.nande`,
        `Un usuario denunció acceso no autorizado a su sitio. La brecha ya circula.`,
        "Seguridad",
        tick,
      );
      this.events.emit("world.news.created", { signal });
      return {
        reacted: true,
        busted,
        headline: article.headline,
        chapterCompleted: progress.chapterCompleted?.title,
        campaignCompleted: progress.campaignCompleted,
      };
    }

    const reaction = REACTIONS[signal];

    if (!reaction) {
      return {
        reacted: false,
        busted: false,
        chapterCompleted: progress.chapterCompleted?.title,
        campaignCompleted: progress.campaignCompleted,
      };
    }

    if (reaction.stock) {
      this.economy.shock(reaction.stock.ticker, reaction.stock.factor);
    }

    let headline: string | undefined;
    if (reaction.headline) {
      const article = this.news.headline(
        reaction.headline.title,
        reaction.headline.body,
        reaction.headline.category,
        tick,
      );
      headline = article.headline;
    }

    this.notoriety.addNotoriety(reaction.notoriety);
    if (reaction.faction) {
      this.notoriety.adjustReputation(reaction.faction.name, reaction.faction.amount);
    }

    const { busted } = this.notoriety.addHeat(reaction.heat);

    this.events.emit("world.news.created", { signal });

    return {
      reacted: true,
      busted,
      headline,
      chapterCompleted: progress.chapterCompleted?.title,
      campaignCompleted: progress.campaignCompleted,
    };
  }
}
