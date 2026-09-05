import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualMail } from "./VirtualMail";
import { WorldEngine } from "../world/WorldEngine";
import { WorldRegistry } from "../world/WorldRegistry";
import { EventBus } from "../events/EventBus";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

function engine() {
  return new WorldEngine(new WorldRegistry(), new EventBus());
}

describe("VirtualMail", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("empieza vacío y con el tiempo llegan correos", () => {
    const mail = new VirtualMail();
    const eng = engine();

    expect(mail.count()).toBe(0);

    for (let t = 1; t <= 3000; t++) mail.tick(t, eng);

    expect(mail.count()).toBeGreaterThan(0);
    expect(mail.unreadCount()).toBe(mail.count());
  });

  it("marcar leído baja los no leídos", () => {
    const mail = new VirtualMail();
    const eng = engine();
    for (let t = 1; t <= 3000; t++) mail.tick(t, eng);

    const first = mail.inbox()[0];
    mail.markRead(first.id);
    expect(mail.get(first.id)!.read).toBe(true);
    expect(mail.unreadCount()).toBe(mail.count() - 1);
  });

  it("algunos correos proponen misiones reales", () => {
    const mail = new VirtualMail();
    const eng = engine();
    for (let t = 1; t <= 5000; t++) mail.tick(t, eng);

    const withMission = mail.inbox().filter((m) => m.missionId);
    expect(withMission.length).toBeGreaterThan(0);
    for (const m of withMission) {
      expect(m.missionId).toMatch(/^m-/);
    }
  });

  it("no repite el mismo correo de misión", () => {
    const mail = new VirtualMail();
    const eng = engine();
    for (let t = 1; t <= 8000; t++) mail.tick(t, eng);

    const ids = mail.inbox().filter((m) => m.missionId).map((m) => m.missionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("una respuesta queda registrada", () => {
    const mail = new VirtualMail();
    const before = mail.count();
    mail.sendReply("Yvoty", "ok, lo reviso", 10);
    expect(mail.count()).toBe(before + 1);
  });

  it("persiste la bandeja", () => {
    const mail = new VirtualMail();
    const eng = engine();
    for (let t = 1; t <= 3000; t++) mail.tick(t, eng);
    const n = mail.count();
    mail.flush();

    expect(new VirtualMail().count()).toBe(n);
  });
});

describe("correo en la terminal", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("mail muestra la bandeja y read marca leído", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    // Se avanza solo el correo (no el mundo entero) para poblar la bandeja.
    for (let t = 1; t <= 3000; t++) {
      kernel.mail.tick(t, kernel.worldEngine);
    }

    expect(term.execute("mail")).toContain("Bandeja");

    const first = kernel.mail.inbox()[0];
    const read = term.execute(`mail read ${first.id}`);
    expect(read).toContain("Asunto:");
    expect(kernel.mail.get(first.id)!.read).toBe(true);

    kernel.dispose();
  });

  it("se puede aceptar la misión que llega por correo", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    for (let t = 1; t <= 6000; t++) {
      kernel.mail.tick(t, kernel.worldEngine);
    }

    const missionMail = kernel.mail.inbox().find((m) => m.missionId);
    expect(missionMail).toBeDefined();

    const out = term.execute(`mail accept ${missionMail!.id}`);
    expect(out).toContain("Misión aceptada");

    kernel.dispose();
  });
});
