import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { HackerGroups } from "./HackerGroups";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("HackerGroups", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("arranca con varios grupos éticos", () => {
    const g = new HackerGroups();
    expect(g.count()).toBeGreaterThanOrEqual(5);
    expect(g.all().some((x) => x.focus === "red-team")).toBe(true);
    expect(g.all().some((x) => x.focus === "blue-team")).toBe(true);
  });

  it("unirse cambia la membresía y suma un miembro", () => {
    const g = new HackerGroups();
    const before = g.get("g-redteam")!.members;

    const r = g.join("g-redteam");
    expect(r.ok).toBe(true);
    expect(g.memberOf()).toBe("g-redteam");
    expect(g.get("g-redteam")!.members).toBe(before + 1);
  });

  it("no se puede unir dos veces al mismo, y cambiar de grupo funciona", () => {
    const g = new HackerGroups();
    g.join("g-redteam");
    expect(g.join("g-redteam").ok).toBe(false);

    g.join("g-ctf");
    expect(g.memberOf()).toBe("g-ctf");
  });

  it("un grupo cerrado no recluta", () => {
    const g = new HackerGroups();
    expect(g.join("g-osint").ok).toBe(false);
  });

  it("salir deja sin grupo", () => {
    const g = new HackerGroups();
    g.join("g-blueteam");
    expect(g.leave().ok).toBe(true);
    expect(g.memberOf()).toBeNull();
  });

  it("con el tiempo crecen y publican operaciones", () => {
    const g = new HackerGroups();
    const opsBefore = g.recentOps().length;
    for (let t = 1; t <= 2000; t++) g.tick(t);
    expect(g.recentOps().length).toBeGreaterThan(opsBefore);
  });

  it("persiste la membresía y los grupos", () => {
    const g = new HackerGroups();
    g.join("g-privacidad");
    g.flush();
    expect(new HackerGroups().memberOf()).toBe("g-privacidad");
  });
});

describe("grupos en el mundo", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("groups.nande es navegable y se une desde la web", () => {
    const kernel = new VirtualKernel();
    expect(kernel.browser.open("groups.nande").content).toContain("Grupos hacker");

    const join = kernel.browser.open("groups.nande", "/join/g-ctf");
    expect(join.content).toContain("uniste");
    expect(kernel.groups.memberOf()).toBe("g-ctf");

    kernel.dispose();
  });

  it("el comando groups lista y une", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    expect(term.execute("groups")).toContain("Red Team");
    expect(term.execute("groups join g-redteam")).toContain("uniste");

    kernel.dispose();
  });

  it("buscar 'hacker' lleva a los grupos", () => {
    const kernel = new VirtualKernel();
    expect(kernel.search.search("grupos hacker")[0].hostname).toBe("groups.nande");
    kernel.dispose();
  });
});
