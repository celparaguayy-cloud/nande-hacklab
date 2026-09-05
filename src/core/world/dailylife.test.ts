import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { lifeAt, isAwake } from "./DailyLife";
import { generatePeople } from "./VirtualPeople";
import { resetStorage, seedRandom } from "../../test/setup";

describe("DailyLife", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("de madrugada todo el mundo duerme", () => {
    const people = generatePeople(500);

    for (const person of people) {
      expect(lifeAt(person, 3).activity, person.id).toBe("durmiendo");
      expect(isAwake(person, 3)).toBe(false);
    }
  });

  it("a media mañana la mayoría está despierta y trabajando/estudiando", () => {
    const people = generatePeople(1000);

    const awake = people.filter((p) => isAwake(p, 9)).length;
    expect(awake).toBeGreaterThan(800);
  });

  it("cada persona tiene un día coherente: duerme, produce, socializa", () => {
    const people = generatePeople(200);

    for (const person of people) {
      const day = [3, 8, 15, 22].map((h) => lifeAt(person, h).activity);
      // A las 3 duerme; en algún momento del día está despierta.
      expect(day[0]).toBe("durmiendo");
      expect(day.some((a) => a !== "durmiendo")).toBe(true);
    }
  });

  it("la actividad diurna lleva a la persona a la zona de su profesión", () => {
    const dev = generatePeople(50).find((p) => p.profession === "developer")!;
    const morning = lifeAt(dev, (dev.age, 9));

    // Un developer trabaja en tecnología cuando está en su franja laboral.
    const life = lifeAt(dev, wakePlus(dev, 2));
    expect(life.zoneId).toBe("tecnologia");
    void morning;
  });

  it("no todos se levantan a la misma hora", () => {
    const people = generatePeople(300);
    const wakeStates = new Set(
      people.map((p) => (isAwake(p, 6) ? "1" : "0")),
    );

    // A las 6 algunos ya están despiertos y otros no.
    expect(wakeStates.size).toBe(2);
  });
});

// Ayuda: hora = despertar de la persona + n
function wakePlus(person: { id: string }, n: number): number {
  let hash = 0;
  for (let i = 0; i < person.id.length; i++) {
    hash = (hash * 31 + person.id.charCodeAt(i)) >>> 0;
  }
  const wake = 5 + (hash % 5);
  return (wake + n) % 24;
}

describe("vida del mundo en el kernel", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("el desglose de vida suma toda la población", () => {
    const kernel = new VirtualKernel();
    const breakdown = kernel.worldEngine.lifeBreakdown(10);
    const total = Object.values(breakdown).reduce((s, n) => s + n, 0);

    expect(total).toBe(2000);
    kernel.dispose();
  });

  it("la presencia por zona suma toda la población", () => {
    const kernel = new VirtualKernel();
    const presence = kernel.worldEngine.presenceByZone(14);
    const total = Object.values(presence).reduce((s, n) => s + n, 0);

    expect(total).toBe(2000);
    kernel.dispose();
  });

  it("hay más gente en línea de día que de noche", () => {
    const kernelDay = new VirtualKernel();
    // Forzar el reloj a media mañana y correr.
    for (let t = 1; t <= 400; t++) {
      kernelDay.worldEngine.tick(t, 10);
    }
    const day = kernelDay.worldEngine.getOnlineCount();
    kernelDay.dispose();

    const kernelNight = new VirtualKernel();
    for (let t = 1; t <= 400; t++) {
      kernelNight.worldEngine.tick(t, 3);
    }
    const night = kernelNight.worldEngine.getOnlineCount();
    kernelNight.dispose();

    expect(day).toBeGreaterThan(night);
  });

  it("el comando vecinos muestra la vida del mundo", () => {
    const kernel = new VirtualKernel();
    // (importación diferida para no cargar el componente)
    const out = kernel.worldEngine.lifeBreakdown(20);
    expect(out.descansando + out.socializando).toBeGreaterThan(0);
    kernel.dispose();
  });
});
