import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { Chat, replyFor } from "./Chat";
import { generatePeople } from "../world/VirtualPeople";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

const people = generatePeople(60);
const dev = people.find((p) => p.profession === "developer")!;
const sec = people.find((p) => p.profession === "security-analyst")!;

describe("respuestas del chat", () => {
  it("un saludo recibe un saludo", () => {
    expect(replyFor(dev, "hola")).toMatch(/programando|hola|eh/i);
  });

  it("el analista de seguridad habla de hacking ético", () => {
    const r = replyFor(sec, "quiero probar un exploit");
    expect(r.toLowerCase()).toContain("lab");
  });

  it("preguntar por plata lleva a la bolsa", () => {
    expect(replyFor(dev, "cuánta plata tenés?").toLowerCase()).toContain("market");
  });

  it("la respuesta es estable para el mismo mensaje", () => {
    expect(replyFor(dev, "contame algo")).toBe(replyFor(dev, "contame algo"));
  });
});

describe("Chat", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("enviar guarda ida y vuelta en la conversación", () => {
    const chat = new Chat();
    const reply = chat.send(dev, "hola", 1);

    const convo = chat.history(dev.id)!;
    expect(convo.messages).toHaveLength(2);
    expect(convo.messages[0].from).toBe("me");
    expect(convo.messages[1].from).toBe("them");
    expect(convo.messages[1].text).toBe(reply);
  });

  it("un mensaje entrante suma no leídos hasta que se lee", () => {
    const chat = new Chat();
    chat.incoming(dev, 5);

    expect(chat.unreadTotal()).toBe(1);
    chat.markRead(dev.id);
    expect(chat.unreadTotal()).toBe(0);
  });

  it("la conversación más reciente queda primera", () => {
    const chat = new Chat();
    chat.send(dev, "hola", 1);
    chat.send(sec, "buenas", 2);
    chat.send(dev, "che", 3);

    expect(chat.conversations()[0].personId).toBe(dev.id);
  });

  it("persiste las conversaciones", () => {
    const chat = new Chat();
    chat.send(dev, "hola", 1);
    chat.flush();

    const reloaded = new Chat();
    expect(reloaded.history(dev.id)?.messages.length).toBe(2);
  });
});

describe("chat en la terminal", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("se puede escribir a un habitante y recibir respuesta", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    const person = kernel.worldEngine.getOnlinePeople()[0];

    const out = term.execute(`chat ${person.id} hola!`);
    expect(out).toContain("Vos →");
    expect(out).toContain(person.name);

    kernel.dispose();
  });

  it("chat sin conversaciones sugiere ver contactos", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    expect(term.execute("chat")).toContain("contactos");
    expect(term.execute("chat contactos")).toContain("línea");

    kernel.dispose();
  });
});
