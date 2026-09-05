export type SocialPlatform =
  | "social"
  | "chat"
  | "video"
  | "git";

export interface SocialPost {
  id: string;
  authorId: string;
  content: string;
  platform: SocialPlatform;
  tick: number;
  likes: number;
  comments: number;
}

export interface SocialComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  tick: number;
}

export interface VirtualGroup {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface VirtualMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  tick: number;
}

const GROUPS: VirtualGroup[] = [
  {
    id: "group-students",
    name: "Estudiantes ÑANDE",
    description: "Comunidad general de estudiantes.",
    memberIds: [],
  },
  {
    id: "group-programming",
    name: "Programadores",
    description: "Programación, Linux y proyectos.",
    memberIds: [],
  },
  {
    id: "group-security",
    name: "Ciberseguridad",
    description: "Seguridad informática y aprendizaje.",
    memberIds: [],
  },
  {
    id: "group-gamers",
    name: "Gamers",
    description: "Videojuegos y entretenimiento.",
    memberIds: [],
  },
  {
    id: "group-music",
    name: "Música",
    description: "Música, artistas y recomendaciones.",
    memberIds: [],
  },
  {
    id: "group-business",
    name: "Emprendedores",
    description: "Negocios y proyectos virtuales.",
    memberIds: [],
  },
];

const POST_TEMPLATES = [
  "Hoy estuve trabajando en un proyecto nuevo.",
  "¿Alguien recomienda algo interesante para aprender?",
  "Acabo de descubrir algo muy interesante.",
  "Compartiendo una actualización de mi proyecto.",
  "¿Qué están haciendo hoy?",
  "Terminé una tarea que tenía pendiente.",
];

const MESSAGE_TEMPLATES = [
  "¿Qué tal?",
  "¿Ya viste lo nuevo?",
  "Estoy trabajando en eso ahora.",
  "Después te cuento.",
  "Jajaja, totalmente.",
  "¿Te sumás al proyecto?",
];

export class VirtualSocial {
  private posts: Map<string, SocialPost>;
  private comments: Map<string, SocialComment>;
  private groups: Map<string, VirtualGroup>;
  private messages: VirtualMessage[];

  private postCounter = 1;
  private commentCounter = 1;
  private messageCounter = 1;

  constructor(personIds: string[]) {
    this.posts = new Map();
    this.comments = new Map();

    this.groups = new Map(
      GROUPS.map((group) => [
        group.id,
        {
          ...group,
          memberIds: this.assignMembers(
            group.id,
            personIds,
          ),
        },
      ]),
    );

    this.messages = [];
  }

  private assignMembers(
    groupId: string,
    personIds: string[],
  ): string[] {
    return personIds.filter((_, index) => {
      const value =
        (index +
          groupId.length * 7) %
        4;

      return value !== 0;
    });
  }

  createPost(
    authorId: string,
    content: string,
    platform: SocialPlatform,
    tick: number,
  ): SocialPost {
    const post: SocialPost = {
      id: `post-${this.postCounter++}`,
      authorId,
      content,
      platform,
      tick,
      likes: 0,
      comments: 0,
    };

    this.posts.set(post.id, post);

    return structuredClone(post);
  }

  addComment(
    postId: string,
    authorId: string,
    content: string,
    tick: number,
  ): SocialComment | undefined {
    const post = this.posts.get(postId);

    if (!post) {
      return undefined;
    }

    const comment: SocialComment = {
      id: `comment-${this.commentCounter++}`,
      postId,
      authorId,
      content,
      tick,
    };

    this.comments.set(comment.id, comment);
    post.comments += 1;

    return structuredClone(comment);
  }

  sendMessage(
    groupId: string,
    senderId: string,
    content: string,
    tick: number,
  ): VirtualMessage | undefined {
    const group = this.groups.get(groupId);

    if (!group || !group.memberIds.includes(senderId)) {
      return undefined;
    }

    const message: VirtualMessage = {
      id: `message-${this.messageCounter++}`,
      groupId,
      senderId,
      content,
      tick,
    };

    this.messages.push(message);

    if (this.messages.length > 5000) {
      this.messages = this.messages.slice(-5000);
    }

    return structuredClone(message);
  }

  getGroups(): VirtualGroup[] {
    return Array.from(this.groups.values()).map(
      (group) => structuredClone(group),
    );
  }

  getPosts(
    platform?: SocialPlatform,
  ): SocialPost[] {
    return Array.from(this.posts.values())
      .filter(
        (post) =>
          !platform ||
          post.platform === platform,
      )
      .map((post) => structuredClone(post))
      .reverse();
  }

  /**
   * Un post al azar sin clonar el muro entero.
   *
   * getPosts() copia hasta 2000 posts en profundidad; llamarlo una vez
   * por agente que comenta hacia que el coste del tick creciera con la
   * cantidad de publicaciones acumuladas.
   */
  pickRandomPost(): SocialPost | undefined {
    if (this.posts.size === 0) {
      return undefined;
    }

    const target = Math.floor(Math.random() * this.posts.size);
    let position = 0;

    for (const post of this.posts.values()) {
      if (position === target) {
        return structuredClone(post);
      }

      position += 1;
    }

    return undefined;
  }

  /** Grupo al azar del que la persona sea miembro, sin clonar miembros. */
  pickRandomGroupForMember(
    personId: string,
  ): { id: string; name: string } | undefined {
    const candidates: Array<{ id: string; name: string }> = [];

    for (const group of this.groups.values()) {
      if (group.memberIds.includes(personId)) {
        candidates.push({ id: group.id, name: group.name });
      }
    }

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates[
      Math.floor(Math.random() * candidates.length)
    ];
  }

  getComments(postId: string): SocialComment[] {
    return Array.from(this.comments.values())
      .filter(
        (comment) =>
          comment.postId === postId,
      )
      .map((comment) =>
        structuredClone(comment),
      );
  }

  getMessages(groupId: string): VirtualMessage[] {
    return this.messages
      .filter(
        (message) =>
          message.groupId === groupId,
      )
      .map((message) =>
        structuredClone(message),
      );
  }

  tick(
    tick: number,
    onlinePersonIds: string[],
  ): void {
    if (onlinePersonIds.length === 0) {
      return;
    }

    // Actividad social ocasional.
    if (Math.random() < 0.25) {
      const author =
        onlinePersonIds[
          Math.floor(
            Math.random() *
              onlinePersonIds.length,
          )
        ];

      const content =
        POST_TEMPLATES[
          Math.floor(
            Math.random() *
              POST_TEMPLATES.length,
          )
        ];

      this.createPost(
        author,
        content,
        "social",
        tick,
      );
    }

    // Conversación ocasional en un grupo.
    if (Math.random() < 0.35) {
      const groups = Array.from(this.groups.values());

      const group =
        groups[
          Math.floor(
            Math.random() *
              groups.length,
          )
        ];

      // Con ~1000 conectados, includes() sobre un array convertia este
      // cruce en O(miembros x conectados) en cada tick.
      const onlineSet = new Set(onlinePersonIds);

      const members = group.memberIds.filter((id) =>
        onlineSet.has(id),
      );

      if (members.length > 0) {
        const sender =
          members[
            Math.floor(
              Math.random() *
                members.length,
            )
          ];

        const content =
          MESSAGE_TEMPLATES[
            Math.floor(
              Math.random() *
                MESSAGE_TEMPLATES.length,
            )
          ];

        this.sendMessage(
          group.id,
          sender,
          content,
          tick,
        );
      }
    }

    // Mantener un tamaño razonable.
    if (this.posts.size > 2000) {
      const oldPosts =
        Array.from(this.posts.keys()).slice(
          0,
          this.posts.size - 2000,
        );

      for (const id of oldPosts) {
        this.posts.delete(id);
      }
    }
  }
}
