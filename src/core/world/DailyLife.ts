import type { VirtualPerson, VirtualProfession } from "./WorldEngine";

/**
 * Rutina de vida de los habitantes.
 *
 * Cada habitante tiene un día: duerme de noche, trabaja o estudia de día,
 * socializa a la tarde y descansa a la noche. La actividad se DERIVA de la
 * hora del mundo y de la persona; no se guarda estado por habitante, así
 * que calcularla para 2000 personas es barato y no crece con el tiempo.
 */

export type LifeActivity =
  | "durmiendo"
  | "trabajando"
  | "estudiando"
  | "socializando"
  | "creando"
  | "descansando"
  | "en-linea";

export interface LifeState {
  activity: LifeActivity;
  icon: string;
  /** Zona del mapa donde está la persona en este momento. */
  zoneId: string;
  awake: boolean;
}

const ACTIVITY_ICON: Record<LifeActivity, string> = {
  durmiendo: "😴",
  trabajando: "💼",
  estudiando: "📚",
  socializando: "💬",
  creando: "🛠️",
  descansando: "🛋️",
  "en-linea": "🌐",
};

/** Zona de trabajo/estudio según la profesión (a dónde va de día). */
const WORK_ZONE: Record<VirtualProfession, string> = {
  student: "academia",
  developer: "tecnologia",
  "security-analyst": "servicios",
  teacher: "academia",
  journalist: "medios",
  gamer: "entretenimiento",
  designer: "tecnologia",
  merchant: "comercio",
  technician: "servicios",
  entrepreneur: "negocios",
  researcher: "investigacion",
  user: "residencial",
};

/** Actividad diurna típica de cada profesión. */
const WORK_ACTIVITY: Record<VirtualProfession, LifeActivity> = {
  student: "estudiando",
  developer: "creando",
  "security-analyst": "trabajando",
  teacher: "estudiando",
  journalist: "trabajando",
  gamer: "socializando",
  designer: "creando",
  merchant: "trabajando",
  technician: "trabajando",
  entrepreneur: "trabajando",
  researcher: "trabajando",
  user: "descansando",
};

/**
 * Hora a la que se levanta cada habitante. Se reparte entre las 5 y las 9
 * de forma estable por persona, para que no todos hagan lo mismo a la vez.
 */
function wakeHour(person: VirtualPerson): number {
  let hash = 0;

  for (let i = 0; i < person.id.length; i++) {
    hash = (hash * 31 + person.id.charCodeAt(i)) >>> 0;
  }

  return 5 + (hash % 5);
}

/** Estado de vida de una persona a una hora dada. */
export function lifeAt(person: VirtualPerson, hour: number): LifeState {
  const wake = wakeHour(person);
  const sleep = (wake + 16) % 24; // ~16 horas despierto

  const awake = sleep > wake
    ? hour >= wake && hour < sleep
    : hour >= wake || hour < sleep;

  if (!awake) {
    return {
      activity: "durmiendo",
      icon: ACTIVITY_ICON.durmiendo,
      zoneId: "residencial",
      awake: false,
    };
  }

  const hoursAwake = (hour - wake + 24) % 24;

  // Mañana y primera tarde: trabajo/estudio en su zona.
  if (hoursAwake < 8) {
    const activity = WORK_ACTIVITY[person.profession];

    return {
      activity,
      icon: ACTIVITY_ICON[activity],
      zoneId: WORK_ZONE[person.profession],
      awake: true,
    };
  }

  // Tarde: vida social, en zonas de encuentro.
  if (hoursAwake < 12) {
    return {
      activity: "socializando",
      icon: ACTIVITY_ICON.socializando,
      zoneId: "entretenimiento",
      awake: true,
    };
  }

  // Noche: descanso en casa.
  return {
    activity: "descansando",
    icon: ACTIVITY_ICON.descansando,
    zoneId: "residencial",
    awake: true,
  };
}

/** Si la persona está despierta a una hora dada. */
export function isAwake(person: VirtualPerson, hour: number): boolean {
  return lifeAt(person, hour).awake;
}

export function activityIcon(activity: LifeActivity): string {
  return ACTIVITY_ICON[activity];
}
