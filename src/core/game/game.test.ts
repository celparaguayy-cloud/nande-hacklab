import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { Progression, xpForLevel, levelForXp } from "./Progression";
import { MissionEngine } from "./Missions";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Progression", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("empieza en nivel 1 con moneda inicial", () => {
    const p = new Progression();
    const s = p.getState();

    expect(s.level).toBe(1);
    expect(s.xp).toBe(0);
    expect(s.wallet).toBe(5000);
  });

  it("la curva de nivel es creciente y coherente", () => {
    expect(xpForLevel(1)).toBeLessThan(xpForLevel(2));
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(1))).toBe(2);
  });

  it("otorga XP, sube de nivel y paga moneda", () => {
    const p = new Progression();

    const r = p.award(100, { skill: "web", coins: 80 });

    expect(r.leveledUp).toBe(true);
    expect(r.newLevel).toBe(2);
    expect(p.getState().skills.web).toBe(100);
    expect(p.wallet).toBe(5080);
  });

  it("los logros no se duplican", () => {
    const p = new Progression();

    expect(p.unlock("x", "X", "desc")).toBe(true);
    expect(p.unlock("x", "X", "desc")).toBe(false);
    expect(p.getState().achievements).toHaveLength(1);
  });

  it("gastar respeta el saldo", () => {
    const p = new Progression();

    expect(p.spend(200)).toBe(true);
    expect(p.wallet).toBe(4800);
    expect(p.spend(9999)).toBe(false);
  });

  it("marca labs resueltos una sola vez", () => {
    const p = new Progression();

    expect(p.markLabSolved("lab-1")).toBe(true);
    expect(p.markLabSolved("lab-1")).toBe(false);
    expect(p.isLabSolved("lab-1")).toBe(true);
  });

  it("persiste y se recupera tras recargar", () => {
    const p = new Progression();
    p.award(150, { coins: 20 });
    p.unlock("a", "A", "d");
    p.flush();

    const reloaded = new Progression();
    expect(reloaded.getState().xp).toBe(150);
    expect(reloaded.hasAchievement("a")).toBe(true);
  });
});

describe("MissionEngine", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("bloquea misiones hasta cumplir requisitos", () => {
    const p = new Progression();
    const m = new MissionEngine(p);

    expect(m.status("m-primer-comando")).toBe("disponible");
    expect(m.status("m-primer-escaneo")).toBe("bloqueada");
  });

  it("completar una misión da recompensa y desbloquea la siguiente", () => {
    const p = new Progression();
    const m = new MissionEngine(p);

    // m-primer-comando exige el curso 'linux'.
    const done = m.onCourseCompleted("linux");
    expect(done.map((x) => x.id)).toContain("m-primer-comando");
    expect(p.getState().xp).toBeGreaterThan(0);

    // Ahora la siguiente misión está disponible.
    expect(m.status("m-primer-escaneo")).toBe("disponible");
  });

  it("no completa una misión bloqueada aunque se cumpla su objetivo", () => {
    const p = new Progression();
    const m = new MissionEngine(p);

    // lab-web-01 pertenece a una misión con requisitos no cumplidos.
    const done = m.onLabSolved("lab-web-01");
    expect(done).toHaveLength(0);
  });
});

describe("integración del juego en la terminal", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("capturar una bandera acredita XP, moneda y logro", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const before = kernel.player.getState();
    const out = term.execute("sqlmap http://10.10.5.10/login user");

    expect(out).toContain("resuelto");
    expect(out).toContain("Logro desbloqueado");

    const after = kernel.player.getState();
    expect(after.xp).toBeGreaterThan(before.xp);
    expect(after.wallet).toBeGreaterThan(before.wallet);
    expect(after.solvedLabs).toContain("lab-web-01");

    kernel.dispose();
  });

  it("resolver el mismo lab dos veces no paga de nuevo", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("sqlmap http://10.10.5.10/login user");
    const midXp = kernel.player.getState().xp;
    const out = term.execute("sqlmap http://10.10.5.10/login user");

    expect(out).toContain("ya estaba resuelto");
    expect(kernel.player.getState().xp).toBe(midXp);

    kernel.dispose();
  });

  it("profile, missions, skills y store responden", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    expect(term.execute("profile")).toContain("Nivel");
    expect(term.execute("missions")).toContain("Misiones");
    expect(term.execute("skills")).toContain("Habilidades");
    expect(term.execute("store")).toContain("Store");

    kernel.dispose();
  });
});

describe("Store del mundo", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("lista lo que crean los habitantes con precio estable", () => {
    const kernel = new VirtualKernel();

    // Crear una entidad vendible directamente en el registro.
    const entity = kernel.registry.create(
      "tool", "Escáner Yvoty", "Una herramienta", "person-1", 5, [], {
        ownerName: "Yvoty",
      },
    );

    const listing = kernel.store.get(entity.id);
    expect(listing).toBeDefined();
    expect(listing!.price).toBe(kernel.store.priceOf(entity));

    // store.nande es navegable y lo muestra.
    const page = kernel.browser.open("store.nande");
    expect(page.content).toContain("Escáner Yvoty");

    kernel.dispose();
  });

  it("comprar descuenta del saldo", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const entity = kernel.registry.create(
      "game", "Juego Tape", "Un juego", "person-2", 6,
    );

    const before = kernel.player.wallet;
    const out = term.execute(`buy ${entity.id}`);

    expect(out).toContain("Compraste");
    expect(kernel.player.wallet).toBeLessThan(before);

    kernel.dispose();
  });
});
