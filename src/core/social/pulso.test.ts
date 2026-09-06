import { describe, expect, it } from "vitest";
import { Pulso } from "./Pulso";
import { weakPasswordFor } from "../crypto/cracker";
import type { VirtualPerson } from "../world/WorldEngine";
import { resetStorage, seedRandom } from "../../test/setup";

function person(id: string, name: string): VirtualPerson {
  return {
    id, name, age: 30, profession: "developer",
    interests: ["Linux", "redes"], technicalLevel: 5, activity: 0.5, online: true,
  };
}

describe("Pulso — red social e ingeniería social", () => {
  it("genera un feed con posts de la gente", () => {
    resetStorage(); seedRandom();
    const gente = Array.from({ length: 30 }, (_, i) => person(`p${i}`, `Persona${i}`));
    const pulso = new Pulso(() => gente, () => 1);
    const feed = pulso.feed(20);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[0].text.length).toBeGreaterThan(0);
  });

  it("algunos posts filtran la contraseña, y coincide con la del sitio", () => {
    resetStorage(); seedRandom();
    // Buscamos a alguien cuyo feed filtre la contraseña.
    const gente = Array.from({ length: 60 }, (_, i) => person(`p${i}`, `Vecino${i}`));
    const pulso = new Pulso(() => gente, () => 1);
    let encontrado: { name: string; leaked: string } | null = null;
    for (const g of gente) {
      const prof = pulso.profile(g.id)!;
      const leak = prof.posts.find((p) => p.leak === "password");
      if (leak) { encontrado = { name: g.name, leaked: leak.leakValue! }; break; }
    }
    expect(encontrado).toBeTruthy();
    // La clave filtrada es EXACTAMENTE la que abre su sitio.
    expect(encontrado!.leaked).toBe(weakPasswordFor(encontrado!.name));
  });

  it("seguir suma a la cuenta de seguidos y persiste", () => {
    resetStorage(); seedRandom();
    const gente = [person("p1", "Ana")];
    const pulso = new Pulso(() => gente, () => 1);
    pulso.follow("p1");
    expect(pulso.isFollowing("p1")).toBe(true);
    expect(pulso.followingCount()).toBe(1);
    expect(new Pulso(() => gente, () => 1).isFollowing("p1")).toBe(true);
  });

  it("buscar encuentra por nombre y handle", () => {
    resetStorage(); seedRandom();
    const gente = [person("p1", "Camila Rodríguez")];
    const pulso = new Pulso(() => gente, () => 1);
    expect(pulso.search("camila").length).toBe(1);
    expect(pulso.search("@camila").length).toBe(1);
  });
});
