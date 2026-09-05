import type { VirtualPerson } from "../world/WorldEngine";
import { AgentMemory } from "./AgentMemory";
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
}

const CREATION_PROFILES: Record<string, CreationProfile> = {
  developer: {
    type: "app",
    prefixes: ["App", "Nodo", "Core"],
    purpose: "experimentar con nuevas ideas de programación",
    tags: ["programación", "tecnología"],
  },
  designer: {
    type: "website",
    prefixes: ["Portal", "Estudio", "Espacio"],
    purpose: "compartir proyectos creativos",
    tags: ["diseño", "web"],
  },
  gamer: {
    type: "game",
    prefixes: ["Juego", "Arena", "Zona"],
    purpose: "entretener a la comunidad",
    tags: ["gaming", "entretenimiento"],
  },
  teacher: {
    type: "course",
    prefixes: ["Curso", "Taller", "Escuela"],
    purpose: "compartir conocimientos con quien quiera aprender",
    tags: ["educación", "aprendizaje"],
  },
  "security-analyst": {
    type: "lab",
    prefixes: ["Lab", "Laboratorio", "Refugio"],
    purpose: "practicar seguridad en un entorno controlado",
    tags: ["ciberseguridad", "educación"],
  },
  journalist: {
    type: "website",
    prefixes: ["Diario", "Portal", "Boletín"],
    purpose: "publicar investigaciones y noticias del mundo virtual",
    tags: ["noticias", "investigación"],
  },
  entrepreneur: {
    type: "company",
    prefixes: ["Empresa", "Grupo", "Cooperativa"],
    purpose: "desarrollar nuevos proyectos",
    tags: ["negocios", "emprendimiento"],
  },
  researcher: {
    type: "project",
    prefixes: ["Proyecto", "Instituto", "Observatorio"],
    purpose: "investigar y documentar hallazgos",
    tags: ["ciencia", "investigación"],
  },
  merchant: {
    type: "company",
    prefixes: ["Tienda", "Mercado", "Feria"],
    purpose: "ofrecer productos a la comunidad",
    tags: ["comercio", "negocios"],
  },
  technician: {
    type: "tool",
    prefixes: ["Herramienta", "Taller", "Central"],
    purpose: "trabajar con sistemas y redes",
    tags: ["tecnología", "redes"],
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
    this.createEntity = createEntity;

    for (const person of people) {
      this.agents.set(
        person.id,
        {
          personId: person.id,
          mood: MOODS[person.id.length % MOODS.length],
          energy: 50 + (person.activity % 50),
          goal: GOALS[person.id.length % GOALS.length],
          lastAction: "idle",
          lastTick: 0,
          lastCreatedTick: -1,
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

    // El contador entra en la semilla para que cada creación
    // del mismo agente reciba un nombre distinto.
    const seed = this.hashText(
      `${person.id}:${creationCount}`,
    );

    const prefix =
      profile.prefixes[
        seed % profile.prefixes.length
      ];

    const root =
      NAME_ROOTS[
        (seed >>> 4) % NAME_ROOTS.length
      ];

    const name = `${prefix} ${root}`;

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

  tick(
    tick: number,
    people: VirtualPerson[],
    social: VirtualSocial,
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
        const ticksDesdeCreacion =
          agent.lastCreatedTick < 0
            ? Number.POSITIVE_INFINITY
            : tick - agent.lastCreatedTick;

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
        const posts =
          social.getPosts();

        if (posts.length > 0) {
          const post =
            posts[
              Math.floor(
                Math.random() *
                  posts.length,
              )
            ];

          if (post.authorId !== person.id) {
            const comment = social.addComment(
              post.id,
              person.id,
              "Interesante publicación 👀",
              tick,
            );

            if (comment) {
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
            }
          }
        }

        agent.energy = Math.max(
          0,
          agent.energy - 1,
        );
      }

      if (action === "chat") {
        const groups =
          social.getGroups();

        if (groups.length > 0) {
          const group =
            groups[
              Math.floor(
                Math.random() *
                  groups.length,
              )
            ];

          if (
            group.memberIds.includes(
              person.id,
            )
          ) {
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
