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
