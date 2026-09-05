import type { VirtualPerson } from "../world/WorldEngine";
import { AgentMemory } from "./AgentMemory";
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
  | "chat";

export interface VirtualAgentState {
  personId: string;
  mood: AgentMood;
  energy: number;
  goal: string;
  lastAction: AgentAction;
  lastTick: number;
}

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

export class VirtualAgents {
  private agents: Map<string, VirtualAgentState>;
  private memory: AgentMemory;

  constructor(people: VirtualPerson[]) {
    this.agents = new Map();
    this.memory = new AgentMemory();

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

    return "chat";
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
