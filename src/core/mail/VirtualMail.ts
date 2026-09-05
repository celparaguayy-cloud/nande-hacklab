import type { EventBus } from "../events/EventBus";
import type { WorldEngine } from "../world/WorldEngine";

/**
 * Correo virtual de ÑANDE.
 *
 * Los habitantes le escriben al jugador: saludos, novedades y, algunos,
 * pedidos de misión. El jugador tiene una bandeja de entrada, puede leer y
 * responder, y aceptar las misiones que le llegan. Todo dentro del mundo,
 * sin correo real.
 */

export interface MailMessage {
  id: string;
  fromId: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  body: string;
  tick: number;
  read: boolean;
  /** Si el mensaje trae una propuesta de misión, su id. */
  missionId?: string;
}

const STORAGE_KEY = "nande-mail";
const MAX_MESSAGES = 60;

/** Cada cuántos ticks puede llegar un correo nuevo. */
const MAIL_INTERVAL = 90;

/** Plantillas de correos comunes (no misión). */
const GREETINGS: Array<{ subject: string; body: string }> = [
  {
    subject: "¡Bienvenido a ÑANDE!",
    body: "Hola, vi que sos nuevo por acá. Cualquier cosa que necesites, escribime. La comunidad es grande.",
  },
  {
    subject: "¿Viste la bolsa hoy?",
    body: "Los precios se movieron bastante. Si te interesa invertir, mirá el mercado con el comando 'market'.",
  },
  {
    subject: "Nuevo laboratorio para practicar",
    body: "Salió un lab nuevo en la academia. Si querés mejorar, probá 'learn' en la terminal.",
  },
];

/** Correos que proponen una misión, atados a las misiones existentes. */
const MISSION_MAILS: Array<{
  missionId: string;
  subject: string;
  body: string;
}> = [
  {
    missionId: "m-primer-escaneo",
    subject: "Necesito que revises una máquina",
    body: "Apareció un equipo raro en la red del laboratorio (10.10.5.20). ¿Podés averiguar qué servicios tiene? Escaneala con nmap. Te paso el dato porque confío en vos.",
  },
  {
    missionId: "m-login-roto",
    subject: "Nuestro login parece inseguro",
    body: "En weblab01 tenemos un formulario de acceso que quedó medio dudoso. ¿Lo probás por SQL injection antes que lo haga alguien con malas intenciones? Es un lab, tranquilo.",
  },
  {
    missionId: "m-ser-root",
    subject: "Encargo: escalá privilegios en rootlab",
    body: "Tenemos una máquina (10.10.5.40) donde entramos como usuario común pero necesitamos ver si se puede escalar a root. ¿Le das una mirada con linpeas?",
  },
];

interface MailState {
  messages: MailMessage[];
  counter: number;
  lastMailTick: number;
}

export class VirtualMail {
  private state: MailState;
  private events?: EventBus;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(events?: EventBus) {
    this.events = events;
    this.state = this.load() ?? {
      messages: [],
      counter: 1,
      lastMailTick: 0,
    };
  }

  private load(): MailState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const saved = JSON.parse(raw) as MailState;
      if (!saved || !Array.isArray(saved.messages)) return null;

      return {
        messages: saved.messages,
        counter: saved.counter ?? 1,
        lastMailTick: saved.lastMailTick ?? 0,
      };
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // El correo sigue en memoria aunque no se guarde.
    }
  }

  private save(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.write();
    }, 800);
  }

  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.write();
  }

  inbox(): MailMessage[] {
    return this.state.messages.map((m) => ({ ...m })).reverse();
  }

  unreadCount(): number {
    return this.state.messages.filter((m) => !m.read).length;
  }

  count(): number {
    return this.state.messages.length;
  }

  get(id: string): MailMessage | undefined {
    const m = this.state.messages.find((msg) => msg.id === id);
    return m ? { ...m } : undefined;
  }

  markRead(id: string): void {
    const m = this.state.messages.find((msg) => msg.id === id);
    if (m && !m.read) {
      m.read = true;
      this.save();
    }
  }

  private push(msg: Omit<MailMessage, "id" | "read">): MailMessage {
    const message: MailMessage = {
      ...msg,
      id: `mail-${this.state.counter++}`,
      read: false,
    };

    this.state.messages.push(message);

    if (this.state.messages.length > MAX_MESSAGES) {
      this.state.messages.splice(
        0,
        this.state.messages.length - MAX_MESSAGES,
      );
    }

    this.events?.emit("mail.received", {
      id: message.id,
      from: message.fromName,
      missionId: message.missionId,
    });

    this.save();
    return message;
  }

  /**
   * Genera correos con el tiempo: la mayoría son saludos/novedades y de vez
   * en cuando llega un pedido de misión de un habitante.
   */
  tick(tick: number, engine: WorldEngine): void {
    if (tick - this.state.lastMailTick < MAIL_INTERVAL) {
      return;
    }

    const online = engine.getOnlinePeople();
    if (online.length === 0) {
      return;
    }

    this.state.lastMailTick = tick;

    const sender = online[Math.floor(Math.random() * online.length)];
    const address = `${sender.name.toLowerCase().replace(/[^a-z]/g, "")}@mail.nande`;

    // Uno de cada tres correos propone una misión disponible.
    if (Math.random() < 0.34) {
      const mail =
        MISSION_MAILS[Math.floor(Math.random() * MISSION_MAILS.length)];

      // Solo si el jugador no completó ya esa misión-mail antes.
      const already = this.state.messages.some(
        (m) => m.missionId === mail.missionId,
      );

      if (!already) {
        this.push({
          fromId: sender.id,
          fromName: sender.name,
          fromAddress: address,
          subject: mail.subject,
          body: mail.body,
          tick,
          missionId: mail.missionId,
        });
        return;
      }
    }

    const greet = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    this.push({
      fromId: sender.id,
      fromName: sender.name,
      fromAddress: address,
      subject: greet.subject,
      body: greet.body,
      tick,
    });
  }

  /** Envía un correo del jugador (queda como registro en la bandeja). */
  sendReply(toName: string, body: string, tick: number): MailMessage {
    return this.push({
      fromId: "player",
      fromName: `Vos → ${toName}`,
      fromAddress: "student@mail.nande",
      subject: "Respuesta",
      body,
      tick,
    });
  }
}
