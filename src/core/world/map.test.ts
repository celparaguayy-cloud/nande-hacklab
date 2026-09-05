import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { WorldMap, ZONES } from "./WorldMap";
import { Communities } from "../social/Communities";
import { WorldRegistry } from "./WorldRegistry";
import { generatePeople } from "./VirtualPeople";
import { resetStorage, seedRandom } from "../../test/setup";

describe("WorldMap", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("tiene nueve zonas en una grilla 3x3", () => {
    expect(ZONES).toHaveLength(9);

    const positions = new Set(ZONES.map((z) => `${z.col},${z.row}`));
    expect(positions.size).toBe(9);

    for (const zone of ZONES) {
      expect(zone.col).toBeGreaterThanOrEqual(0);
      expect(zone.col).toBeLessThan(3);
      expect(zone.row).toBeGreaterThanOrEqual(0);
      expect(zone.row).toBeLessThan(3);
    }
  });

  it("cuenta residentes por zona según la profesión", () => {
    const registry = new WorldRegistry();
    const people = generatePeople(300);
    const map = new WorldMap(registry, people.map((p) => p.profession));

    const snapshot = map.snapshot();
    const total = snapshot.reduce((sum, z) => sum + z.residents, 0);

    expect(total).toBe(300);
  });

  it("ubica los lugares creados en la zona de su tipo", () => {
    const registry = new WorldRegistry();
    const people = generatePeople(50);
    const map = new WorldMap(registry, people.map((p) => p.profession));

    registry.create("company", "Empresa X", "d", "p1", 1);
    registry.create("lab", "Lab Y", "d", "p2", 2);

    expect(map.zoneOf("company")).toBe("negocios");
    expect(map.zoneOf("lab")).toBe("academia");

    expect(map.placesInZone("negocios").some((p) => p.name === "Empresa X")).toBe(true);
    expect(map.placesInZone("academia").some((p) => p.name === "Lab Y")).toBe(true);
  });

  it("el snapshot refleja el mundo real del kernel", () => {
    const kernel = new VirtualKernel();

    for (let t = 1; t <= 1500; t++) {
      kernel.tick();
    }

    const snapshot = kernel.map.snapshot();
    const residents = snapshot.reduce((s, z) => s + z.residents, 0);
    const places = snapshot.reduce((s, z) => s + z.places, 0);

    expect(residents).toBe(2000);
    expect(places).toBe(kernel.registry.count());

    kernel.dispose();
  });
});

describe("Communities", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("funda comunidades semilla con un fundador afín", () => {
    const people = generatePeople(200);
    const communities = new Communities(people);

    expect(communities.count()).toBeGreaterThan(0);

    for (const c of communities.all()) {
      expect(c.memberIds.length).toBeGreaterThanOrEqual(1);
      expect(c.founderId).toBeTruthy();
    }
  });

  it("suman miembros afines a lo largo del tiempo", () => {
    const people = generatePeople(500);
    const communities = new Communities(people);
    const online = people.filter((p) => p.online);

    const before = communities.totalMembers();

    for (let t = 1; t <= 2000; t++) {
      communities.tick(t, online);
    }

    expect(communities.totalMembers()).toBeGreaterThan(before);
  });

  it("los miembros de una comunidad tienen su interés", () => {
    const people = generatePeople(500);
    const byId = new Map(people.map((p) => [p.id, p]));
    const communities = new Communities(people);
    const online = people.filter((p) => p.online);

    for (let t = 1; t <= 2000; t++) {
      communities.tick(t, online);
    }

    for (const community of communities.all()) {
      for (const memberId of community.memberIds) {
        const member = byId.get(memberId)!;
        // El fundador puede no compartir el tema exacto, el resto sí.
        if (memberId !== community.founderId) {
          expect(member.interests, community.id).toContain(community.topic);
        }
      }
    }
  });

  it("community.nande es navegable y muestra las comunidades", () => {
    const kernel = new VirtualKernel();

    for (let t = 1; t <= 1000; t++) {
      kernel.tick();
    }

    const front = kernel.browser.open("community.nande");
    expect(front.content).toContain("Comunidades");

    const first = kernel.worldEngine.getCommunities().all()[0];
    const page = kernel.browser.open("community.nande", `/c/${first.id}`);
    expect(page.content).toContain(first.name);

    kernel.dispose();
  });
});
