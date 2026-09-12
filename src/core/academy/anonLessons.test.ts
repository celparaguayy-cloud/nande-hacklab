import { beforeEach, describe, expect, it } from "vitest";
import { LESSONS } from "./Lessons";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

function lesson(id: string) {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`falta la lección ${id}`);
  return l;
}

describe("Anonimato / OPSEC — comandos reales y lecciones completables", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("macchanger cambia la MAC de verdad en la red", () => {
    const antes = kernel.network.getInterface("wlan0")!.mac;
    const out = term.execute("macchanger wlan0 random");
    expect(out).toContain("cambiada");
    expect(kernel.network.getInterface("wlan0")!.mac).not.toBe(antes);
  });

  it("anon on cambia la IP visible (nodo de salida)", () => {
    expect(kernel.anonymity.isTorEnabled()).toBe(false);
    term.execute("anon on");
    expect(kernel.anonymity.isTorEnabled()).toBe(true);
    expect(term.execute("identidad")).toContain("por la red de anonimato");
  });

  it("l-anonimato: cada paso pasa su check con salida real", () => {
    const steps = lesson("l-anonimato").steps;
    const cmds = ["identidad", "macchanger wlan0 random", "anon on", "identidad"];
    cmds.forEach((cmd, i) => {
      const out = term.execute(cmd);
      expect(steps[i].check(cmd, out), `paso ${i}: ${cmd}`).toBe(true);
    });
  });

  it("l-opsec: exiftool delata y luego limpia", () => {
    const steps = lesson("l-opsec").steps;
    const reveal = term.execute("exiftool foto.jpg");
    expect(steps[0].check("exiftool foto.jpg", reveal)).toBe(true);
    expect(reveal).toContain("GPS");

    const clean = term.execute("exiftool -all= foto.jpg");
    expect(steps[1].check("exiftool -all= foto.jpg", clean)).toBe(true);
  });

  it("l-cripto: identificar y romper un hash débil", () => {
    const steps = lesson("l-cripto").steps;
    const c1 = "hashid 5f4dcc3b5aa765d61d8327deb882cf99";
    const c2 = "crack 5f4dcc3b5aa765d61d8327deb882cf99";
    expect(steps[0].check(c1, term.execute(c1))).toBe(true);
    expect(steps[1].check(c2, term.execute(c2))).toBe(true);
  });

  it("l-osint: whois y sherlock reúnen rastro público", () => {
    const steps = lesson("l-osint").steps;
    expect(steps[0].check("whois banco.nande", term.execute("whois banco.nande"))).toBe(true);
    expect(steps[1].check("sherlock kamba", term.execute("sherlock kamba"))).toBe(true);
  });
});
