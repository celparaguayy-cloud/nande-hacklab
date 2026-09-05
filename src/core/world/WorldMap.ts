import type { WorldRegistry, WorldEntity, WorldEntityType } from "./WorldRegistry";
import type { VirtualProfession } from "./WorldEngine";

/**
 * Mapa 2D del mundo de ÑANDE.
 *
 * El mundo se organiza en zonas temáticas ubicadas en una grilla. Cada
 * habitante vive en una zona según su profesión, y los lugares que crean
 * (empresas, tiendas, laboratorios, comunidades) aparecen en la zona que
 * les corresponde. El mapa no guarda datos propios: los lee del mundo.
 */

export interface MapZone {
  id: string;
  name: string;
  icon: string;
  /** Posición en la grilla del mapa (columna, fila). */
  col: number;
  row: number;
  color: string;
  description: string;
}

export interface MapPlace {
  id: string;
  name: string;
  type: WorldEntityType;
  zoneId: string;
  ownerName: string;
}

export interface ZoneSnapshot extends MapZone {
  residents: number;
  places: number;
}

/** Las nueve zonas del mundo (spec §22). */
export const ZONES: MapZone[] = [
  {
    id: "residencial",
    name: "Residencial",
    icon: "🏠",
    col: 0,
    row: 0,
    color: "#3b5161",
    description: "Donde viven los habitantes de ÑANDE.",
  },
  {
    id: "negocios",
    name: "Negocios",
    icon: "🏢",
    col: 1,
    row: 0,
    color: "#4a5a3f",
    description: "Empresas y emprendimientos del mundo.",
  },
  {
    id: "academia",
    name: "Academia",
    icon: "🎓",
    col: 2,
    row: 0,
    color: "#5a4a6a",
    description: "La academia de ciberseguridad y el aprendizaje.",
  },
  {
    id: "tecnologia",
    name: "Tecnología",
    icon: "💻",
    col: 0,
    row: 1,
    color: "#3f5a5a",
    description: "Desarrolladores, herramientas y proyectos.",
  },
  {
    id: "comercio",
    name: "Comercio",
    icon: "🛒",
    col: 1,
    row: 1,
    color: "#6a5a3f",
    description: "La tienda del mundo y sus vendedores.",
  },
  {
    id: "servicios",
    name: "Servicios",
    icon: "🏥",
    col: 2,
    row: 1,
    color: "#5a3f4a",
    description: "Servidores, red y sistemas del mundo.",
  },
  {
    id: "medios",
    name: "Medios",
    icon: "📰",
    col: 0,
    row: 2,
    color: "#4a4a6a",
    description: "Noticias, periodistas y publicaciones.",
  },
  {
    id: "entretenimiento",
    name: "Entretenimiento",
    icon: "🎮",
    col: 1,
    row: 2,
    color: "#6a3f5a",
    description: "Juegos, video y cultura del mundo.",
  },
  {
    id: "investigacion",
    name: "Investigación",
    icon: "🔬",
    col: 2,
    row: 2,
    color: "#3f6a5a",
    description: "Ciencia, investigación y análisis.",
  },
];

/** Zona donde vive cada profesión. */
const PROFESSION_ZONE: Record<VirtualProfession, string> = {
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

/** Zona donde aparece cada tipo de lugar creado. */
const TYPE_ZONE: Partial<Record<WorldEntityType, string>> = {
  company: "negocios",
  tool: "tecnologia",
  app: "tecnologia",
  project: "tecnologia",
  website: "medios",
  game: "entretenimiento",
  video: "entretenimiento",
  channel: "entretenimiento",
  course: "academia",
  lab: "academia",
  community: "residencial",
  organization: "negocios",
  forum: "residencial",
  event: "entretenimiento",
  repository: "tecnologia",
};

export class WorldMap {
  private registry: WorldRegistry;
  /** Conteo de residentes por zona, calculado una vez. */
  private residentsByZone: Map<string, number>;

  constructor(
    registry: WorldRegistry,
    professions: Iterable<VirtualProfession>,
  ) {
    this.registry = registry;
    this.residentsByZone = new Map();

    // Los residentes por zona no cambian (la profesión es fija), así que
    // se cuentan una sola vez en la construcción.
    for (const profession of professions) {
      const zoneId = PROFESSION_ZONE[profession] ?? "residencial";
      this.residentsByZone.set(
        zoneId,
        (this.residentsByZone.get(zoneId) ?? 0) + 1,
      );
    }
  }

  /** Zona de una entidad según su tipo. */
  zoneOf(type: WorldEntityType): string {
    return TYPE_ZONE[type] ?? "residencial";
  }

  /** Lugares (entidades del mundo) que están en una zona. */
  placesInZone(zoneId: string, limit: number = 30): MapPlace[] {
    const places: MapPlace[] = [];

    for (const entity of this.registry.all()) {
      if (this.zoneOf(entity.type) !== zoneId) {
        continue;
      }

      places.push(this.toPlace(entity));

      if (places.length >= limit) {
        break;
      }
    }

    return places;
  }

  private toPlace(entity: WorldEntity): MapPlace {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      zoneId: this.zoneOf(entity.type),
      ownerName: entity.metadata.ownerName ?? entity.ownerId,
    };
  }

  /** Cantidad de lugares por zona, sin clonar entidades. */
  private placesCount(): Map<string, number> {
    const counts = new Map<string, number>();

    for (const [type, count] of Object.entries(
      this.registry.countByType(),
    )) {
      const zoneId = this.zoneOf(type as WorldEntityType);
      counts.set(zoneId, (counts.get(zoneId) ?? 0) + count);
    }

    return counts;
  }

  /** Snapshot barato del mapa completo para la UI. */
  snapshot(): ZoneSnapshot[] {
    const places = this.placesCount();

    return ZONES.map((zone) => ({
      ...zone,
      residents: this.residentsByZone.get(zone.id) ?? 0,
      places: places.get(zone.id) ?? 0,
    }));
  }
}
