/**
 * Eventos dinámicos del mundo (§71 / idea #6).
 *
 * El mundo te tira ganchos: una corp sufre una brecha y su acción cae;
 * aparece un 0-day con tiempo límite; estalla un escándalo que es oro para
 * OSINT. Cada evento tiene una VENTANA temporal —hay que actuar a tiempo—.
 * Todo es determinista por día del mundo: mismo día, mismos eventos (así se
 * puede depurar y es reproducible), pero el flujo se siente vivo.
 */

export type EventType = "brecha" | "0day" | "escandalo" | "contrato" | "apagon";

export interface WorldEvent {
  id: string;
  type: EventType;
  icon: string;
  title: string;
  description: string;
  startDay: number;
  endDay: number;
  /** Días que le quedan (incluye el día actual). */
  diasRestantes: number;
}

const CORPS = [
  "Banco Justicia", "Nova Corp", "Gulu", "Vortex Media", "Nimbus Cloud",
  "Pytã Security", "Mbarete Bank", "Pixela Games", "Redix", "Portal Justicia",
];

interface Template {
  type: EventType;
  icon: string;
  title: (c: string) => string;
  desc: (c: string) => string;
  /** Duración de la ventana, en días. */
  dur: number;
}

const TEMPLATES: Template[] = [
  {
    type: "brecha", icon: "🔓", dur: 3,
    title: (c) => `Brecha en ${c}`,
    desc: (c) => `Se filtró una base de ${c}. Su acción se tambalea: momento de comprar barato o de hurgar mientras está caída.`,
  },
  {
    type: "0day", icon: "💥", dur: 2,
    title: (c) => `0-day contra ${c}`,
    desc: (c) => `Circula un exploit sin parche para ${c}. Ventana corta: el que llega primero, entra.`,
  },
  {
    type: "escandalo", icon: "📰", dur: 4,
    title: (c) => `Escándalo salpica a ${c}`,
    desc: (c) => `Rumores sobre ${c} explotan en Pulso. Buen momento para OSINT: la gente habla de más.`,
  },
  {
    type: "contrato", icon: "📨", dur: 3,
    title: (c) => `Contrato del colectivo · objetivo ${c}`,
    desc: (c) => `Año'ῖ paga por material comprometedor de ${c}. Tiempo limitado.`,
  },
  {
    type: "apagon", icon: "🌑", dur: 2,
    title: (c) => `Vigilancia baja en ${c}`,
    desc: (c) => `Turno reducido en ${c} estos días: menos detección, más oportunidad.`,
  },
];

/** Hash determinista de un número (para elegir contenido estable por ventana). */
function seed(n: number): number {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Ventana de eventos: una nueva cada 3 días. */
const WINDOW = 3;

function eventForWindow(w: number): WorldEvent {
  const s = seed(w);
  const tpl = TEMPLATES[s % TEMPLATES.length];
  const corp = CORPS[(s >>> 5) % CORPS.length];
  const startDay = w * WINDOW + 1;
  return {
    id: `ev-${w}`,
    type: tpl.type,
    icon: tpl.icon,
    title: tpl.title(corp),
    description: tpl.desc(corp),
    startDay,
    endDay: startDay + tpl.dur - 1,
    diasRestantes: 0,
  };
}

/** Eventos activos en un día dado del mundo, con sus días restantes. */
export function eventsActiveOn(day: number): WorldEvent[] {
  const d = Math.max(1, Math.floor(day));
  const currentWindow = Math.floor((d - 1) / WINDOW);

  const out: WorldEvent[] = [];
  // Se miran la ventana actual y las dos anteriores (por si su ventana es larga).
  for (let w = currentWindow; w >= currentWindow - 2 && w >= 0; w -= 1) {
    const ev = eventForWindow(w);
    if (d >= ev.startDay && d <= ev.endDay) {
      out.push({ ...ev, diasRestantes: ev.endDay - d + 1 });
    }
  }
  return out.sort((a, b) => a.diasRestantes - b.diasRestantes);
}
