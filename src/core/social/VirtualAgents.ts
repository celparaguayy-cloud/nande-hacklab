import type { VirtualPerson } from "../world/WorldEngine";
import { AgentMemory } from "./AgentMemory";
import { AgentRelationships } from "./AgentRelationships";
import type {
  WorldEntity,
  WorldEntityType,
} from "../world/WorldRegistry";
import {
  VirtualSocial,
  type SocialPlatform,
} from "./VirtualSocial";

export type AgentMood =
  | "happy"
  | "curious"
  | "focused"
  | "tired"
  | "excited"
  | "neutral";

export type AgentAction =
  | "idle"
  | "post"
  | "comment"
  | "chat"
  | "create";

export interface VirtualAgentState {
  personId: string;
  mood: AgentMood;
  energy: number;
  goal: string;
  lastAction: AgentAction;
  lastTick: number;
  lastCreatedTick: number;
  creationCount: number;
}

/** Ticks que un agente espera como mínimo entre dos creaciones. */
const CREATE_COOLDOWN_TICKS = 250;

/** Cantidad máxima de entidades que un mismo agente llega a crear. */
const MAX_CREATIONS_PER_AGENT = 5;

/** Energía mínima para encarar una creación. */
const CREATE_MIN_ENERGY = 20;

const GOALS = [
  "aprender algo nuevo",
  "terminar un proyecto",
  "hablar con la comunidad",
  "compartir conocimientos",
  "descubrir contenido interesante",
  "ayudar a otro habitante",
];

const MOODS: AgentMood[] = [
  "happy",
  "curious",
  "focused",
  "tired",
  "excited",
  "neutral",
];

const POST_MESSAGES: Record<string, string[]> = {
  student: [
    "Estoy estudiando algo nuevo hoy.",
    "Encontré un tema bastante interesante para aprender.",
  ],
  developer: [
    "Estoy trabajando en un proyecto nuevo.",
    "Hoy estuve probando una idea de programación.",
  ],
  "security-analyst": [
    "Estoy revisando algunos conceptos de seguridad.",
    "La seguridad requiere entender bien cómo funcionan los sistemas.",
  ],
  journalist: [
    "Encontré un tema interesante para investigar.",
    "Preparando una nueva publicación para la comunidad.",
  ],
  gamer: [
    "¿Qué están jugando últimamente?",
    "Hoy toca un poco de gaming.",
  ],
  designer: [
    "Estoy trabajando en un diseño nuevo.",
    "Probando algunas ideas creativas.",
  ],
  teacher: [
    "Hoy quiero compartir algo que aprendí.",
    "Siempre hay algo nuevo que enseñar.",
  ],
  technician: [
    "Revisando sistemas y hardware virtual.",
    "Hoy estoy trabajando con redes.",
  ],
  entrepreneur: [
    "Pensando en nuevas ideas para proyectos.",
    "Un buen proyecto empieza con una buena idea.",
  ],
  researcher: [
    "Encontré algo interesante durante una investigación.",
    "Analizando nueva información.",
  ],
  merchant: [
    "Actualizando algunos productos de mi tienda.",
    "La comunidad siempre tiene nuevas ideas.",
  ],
  user: [
    "Hola comunidad 👋",
    "¿Qué novedades hay por aquí?",
  ],
};

interface CreationProfile {
  type: WorldEntityType;
  prefixes: string[];
  purpose: string;
  tags: string[];
  /**
   * Marcas propias, de una sola pieza, para que el mundo no suene todo
   * igual ni todo en guaraní: "Gulu", "Banco Justicia", "Vortex"… conviven
   * con los nombres de dos palabras (prefijo + raíz).
   */
  brands?: string[];
}

const CREATION_PROFILES: Record<string, CreationProfile> = {
  developer: {
    type: "app",
    prefixes: ["App", "Nodo", "Core"],
    purpose: "experimentar con nuevas ideas de programación",
    tags: ["programación", "tecnología"],
    brands: ["Gulu", "Vortex", "Bytebox", "Nixel", "Zappy", "Codeá"],
  },
  designer: {
    type: "website",
    prefixes: ["Portal", "Estudio", "Espacio"],
    purpose: "compartir proyectos creativos",
    tags: ["diseño", "web"],
    brands: ["Pixelar", "Lumina", "Trazo", "Kromá"],
  },
  gamer: {
    type: "game",
    prefixes: ["Juego", "Arena", "Zona"],
    purpose: "entretener a la comunidad",
    tags: ["gaming", "entretenimiento"],
    brands: ["Vortex Games", "Pixel Arena", "NitroPlay"],
  },
  teacher: {
    type: "course",
    prefixes: ["Curso", "Taller", "Escuela"],
    purpose: "compartir conocimientos con quien quiera aprender",
    tags: ["educación", "aprendizaje"],
    brands: ["Academia Lumen", "Aprendé+", "Sabité"],
  },
  "security-analyst": {
    type: "lab",
    prefixes: ["Lab", "Laboratorio", "Refugio"],
    purpose: "practicar seguridad en un entorno controlado",
    tags: ["ciberseguridad", "educación"],
    brands: ["BlackVault", "RedShield", "Zero Trust Lab"],
  },
  journalist: {
    type: "website",
    prefixes: ["Diario", "Portal", "Boletín"],
    purpose: "publicar investigaciones y noticias del mundo virtual",
    tags: ["noticias", "investigación"],
    brands: ["Portal Justicia", "La Voz Digital", "NotiNova"],
  },
  entrepreneur: {
    type: "company",
    prefixes: ["Empresa", "Grupo", "Cooperativa"],
    purpose: "desarrollar nuevos proyectos",
    tags: ["negocios", "emprendimiento"],
    brands: ["Banco Justicia", "Grupo Vortex", "Nova Corp", "Fintar", "Kamba S.A."],
  },
  researcher: {
    type: "project",
    prefixes: ["Proyecto", "Instituto", "Observatorio"],
    purpose: "investigar y documentar hallazgos",
    tags: ["ciencia", "investigación"],
    brands: ["Instituto Lumen", "Quantia", "Observatorio Orbe"],
  },
  merchant: {
    type: "company",
    prefixes: ["Tienda", "Mercado", "Feria"],
    purpose: "ofrecer productos a la comunidad",
    tags: ["comercio", "negocios"],
    brands: ["Mercadín", "Comprá", "Bazar Orbe", "Tiendita Nova"],
  },
  technician: {
    type: "tool",
    prefixes: ["Herramienta", "Taller", "Central"],
    purpose: "trabajar con sistemas y redes",
    tags: ["tecnología", "redes"],
    brands: ["Redix", "NetCentral", "Cablera"],
  },
  student: {
    type: "project",
    prefixes: ["Proyecto", "Cuaderno", "Bitácora"],
    purpose: "practicar mientras aprende nuevas habilidades",
    tags: ["aprendizaje", "proyecto"],
  },
  user: {
    type: "community",
    prefixes: ["Comunidad", "Círculo", "Grupo"],
    purpose: "reunir gente con intereses parecidos",
    tags: ["comunidad", "social"],
    brands: ["Sento", "Órbita", "Punto de Encuentro"],
  },
};

const NAME_ROOTS = [
  "Ñande",
  "Arandu",
  "Kuarahy",
  "Yvoty",
  "Tape",
  "Pyahu",
  "Guasu",
  "Porã",
  "Tekove",
  "Mbarete",
  "Ára",
  "Pytu",
];

export class VirtualAgents {
  private agents: Map<string, VirtualAgentState>;
  private memory: AgentMemory;
  private relationships: AgentRelationships;
  private createEntity: (
    type: WorldEntityType,
    name: string,
    description: string,
    ownerId: string,
    tick: number,
    tags?: string[],
    metadata?: Record<string, string>,
  ) => WorldEntity;

  constructor(
    people: VirtualPerson[],
    createEntity: (
      type: WorldEntityType,
      name: string,
      description: string,
      ownerId: string,
      tick: number,
      tags?: string[],
      metadata?: Record<string, string>,
    ) => WorldEntity,
  ) {
    this.agents = new Map();
    this.memory = new AgentMemory();
    this.relationships = new AgentRelationships();
    this.createEntity = createEntity;

    for (const person of people) {
      // Si todos arrancaran con el cooldown cumplido, el mundo nacería
      // con una rafaga de creaciones en los primeros ticks. El permiso
      // inicial se reparte a lo largo de una ventana de cooldown.
      const offset =
        this.hashText(person.id) % CREATE_COOLDOWN_TICKS;

      this.agents.set(
        person.id,
        {
          personId: person.id,
          mood: MOODS[person.id.length % MOODS.length],
          energy: 50 + (person.activity % 50),
          goal: GOALS[person.id.length % GOALS.length],
          lastAction: "idle",
          lastTick: 0,
          lastCreatedTick: offset - CREATE_COOLDOWN_TICKS,
          creationCount: 0,
        },
      );
    }
  }

  getAgent(personId: string): VirtualAgentState | undefined {
    const agent = this.agents.get(personId);

    return agent
      ? structuredClone(agent)
      : undefined;
  }

  getAgents(): VirtualAgentState[] {
    return Array.from(this.agents.values()).map(
      (agent) => structuredClone(agent),
    );
  }

  getMemory(): AgentMemory {
    return this.memory;
  }

  getRelationships(): AgentRelationships {
    return this.relationships;
  }

  getAgentMemories(
    personId: string,
  ) {
    return this.memory.getMemories(personId);
  }

  private chooseAction(): AgentAction {
    const roll = Math.random();

    if (roll < 0.55) {
      return "idle";
    }

    if (roll < 0.75) {
      return "post";
    }

    if (roll < 0.90) {
      return "comment";
    }

    if (roll < 0.97) {
      return "chat";
    }

    return "create";
  }

  private choosePlatform(
    person: VirtualPerson,
  ): SocialPlatform {
    if (person.profession === "developer") {
      return "git";
    }

    if (
      person.profession === "gamer" ||
      person.profession === "designer"
    ) {
      return "video";
    }

    return "social";
  }

  /** Hash estable: da variedad de nombres sin depender del azar. */
  private hashText(text: string): number {
    let hash = 0;

    for (let index = 0; index < text.length; index++) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }

    return hash;
  }

  private chooseCreation(
    person: VirtualPerson,
    creationCount: number,
  ): {
    type: WorldEntityType;
    name: string;
    description: string;
    tags: string[];
  } {
    const profile =
      CREATION_PROFILES[person.profession] ??
      CREATION_PROFILES.user;

    // Hashear `id:contador` no alcanzaba: con pocas combinaciones, dos
    // creaciones del mismo agente colisionaban por azar. En su lugar el
    // hash fija solo el punto de partida y el contador avanza de a uno
    // sobre una lista que junta las marcas propias (de una pieza) y la
    // grilla prefijo x raiz, asi que las creaciones sucesivas de un agente
    // caen siempre en nombres distintos y con estilos variados.
    const brands = profile.brands ?? [];
    const twoWord = profile.prefixes.length * NAME_ROOTS.length;
    const total = brands.length + twoWord;
    const start = this.hashText(person.id);
    const slot = (start + creationCount) % total;

    let name: string;
    if (slot < brands.length) {
      // Marca propia: "Gulu", "Banco Justicia", "Vortex"…
      name = brands[slot];
    } else {
      const s = slot - brands.length;
      const root = NAME_ROOTS[s % NAME_ROOTS.length];
      const prefix =
        profile.prefixes[
          Math.floor(s / NAME_ROOTS.length) % profile.prefixes.length
        ];
      name = `${prefix} ${root}`;
    }

    return {
      type: profile.type,
      name,
      description: `${name} es un espacio creado por ${person.name} para ${profile.purpose}.`,
      tags: profile.tags,
    };
  }

  private generatePost(
    person: VirtualPerson,
  ): string {
    const messages =
      POST_MESSAGES[person.profession] ??
      POST_MESSAGES.user;

    return messages[
      Math.floor(
        Math.random() * messages.length,
      )
    ];
  }

  /** Aviso opcional cuando un vinculo cambia de tipo. */
  onRelationshipChanged?: (
    relationship: ReturnType<AgentRelationships["interact"]>,
    agentId: string,
    tick: number,
  ) => void;

  tick(
    tick: number,
    people: Iterable<VirtualPerson>,
    social: VirtualSocial,
    peopleById?: Map<string, VirtualPerson>,
  ): void {
    for (const person of people) {
      if (!person.online) {
        continue;
      }

      const agent = this.agents.get(person.id);

      if (!agent) {
        continue;
      }

      // No todos los agentes actúan en cada tick.
      const activityChance =
        person.activity / 1000;

      if (
        Math.random() > activityChance
      ) {
        continue;
      }

      const action =
        this.chooseAction();

      agent.lastAction = action;
      agent.lastTick = tick;

      if (action === "post") {
        const platform =
          this.choosePlatform(person);

        const post = social.createPost(
          person.id,
          this.generatePost(person),
          platform,
          tick,
        );

        this.memory.rememberEvent(
          person.id,
          `Publicó en ${platform}: ${post.content}`,
          tick,
          5,
        );

        agent.energy = Math.max(
          0,
          agent.energy - 2,
        );
      }

      if (action === "create") {
        const ticksDesdeCreacion = tick - agent.lastCreatedTick;

        const puedeCrear =
          ticksDesdeCreacion >= CREATE_COOLDOWN_TICKS &&
          agent.creationCount < MAX_CREATIONS_PER_AGENT &&
          agent.energy >= CREATE_MIN_ENERGY;

        if (puedeCrear) {
          const creation = this.chooseCreation(
            person,
            agent.creationCount,
          );

          const entity = this.createEntity(
            creation.type,
            creation.name,
            creation.description,
            person.id,
            tick,
            creation.tags,
            {
              profession: person.profession,
              ownerName: person.name,
            },
          );

          agent.lastCreatedTick = tick;
          agent.creationCount += 1;

          this.memory.rememberProject(
            person.id,
            `Creó ${entity.type} "${entity.name}" (${entity.id}).`,
            tick,
          );

          agent.energy = Math.max(
            0,
            agent.energy - 5,
          );
        } else {
          // Sin cupo todavía: el agente se queda tranquilo este tick.
          agent.lastAction = "idle";
        }
      }

      if (action === "comment") {
        // Se mira mas de un post y se prefiere el de alguien conocido:
        // asi los vinculos ya formados guian a quien se responde.
        const candidates = [
          social.pickRandomPost(),
          social.pickRandomPost(),
        ].filter(
          (candidate): candidate is NonNullable<typeof candidate> =>
            candidate !== undefined &&
            candidate.authorId !== person.id,
        );

        const post = candidates.sort((a, b) => {
          const trustA =
            this.relationships.get(person.id, a.authorId)?.trust ?? 0;

          const trustB =
            this.relationships.get(person.id, b.authorId)?.trust ?? 0;

          return trustB - trustA;
        })[0];

        {
          if (post) {
            const comment = social.addComment(
              post.id,
              person.id,
              "Interesante publicación 👀",
              tick,
            );

            if (comment) {
              const author = peopleById?.get(post.authorId);

              const link = this.relationships.interact(
                person.id,
                post.authorId,
                tick,
                2,
                author?.profession === person.profession,
              );

              this.memory.rememberEvent(
                person.id,
                `Comentó una publicación de ${post.authorId}.`,
                tick,
                5,
              );

              this.memory.rememberPerson(
                person.id,
                post.authorId,
                "Escribió una publicación que el agente comentó.",
                tick,
              );

              if (link.changedFrom) {
                this.onRelationshipChanged?.(link, person.id, tick);
              }
            }
          }
        }

        agent.energy = Math.max(
          0,
          agent.energy - 1,
        );
      }

      if (action === "chat") {
        const group = social.pickRandomGroupForMember(
          person.id,
        );

        {
          if (group) {
            const message = social.sendMessage(
              group.id,
              person.id,
              "¿Qué tal comunidad?",
              tick,
            );

            if (message) {
              this.memory.rememberMessage(
                person.id,
                `Envió un mensaje al grupo ${group.name}.`,
                tick,
              );
            }
          }
        }

        agent.energy = Math.max(
          0,
          agent.energy - 1,
        );
      }

      if (agent.energy <= 10) {
        agent.mood = "tired";
      } else if (agent.energy >= 80) {
        agent.mood = "excited";
      }
    }
  }
}
