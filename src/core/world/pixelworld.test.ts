import { beforeEach, describe, expect, it } from "vitest";
import {
  createAvatars,
  retarget,
  step,
  zoneCenter,
  avatarAt,
  professionColor,
  WORLD_SIZE,
} from "./PixelWorld";
import { resetStorage, seedRandom } from "../../test/setup";

const people = [
  { id: "person-1", name: "Ana", profession: "developer" },
  { id: "person-2", name: "Beto", profession: "gamer" },
  { id: "person-3", name: "Cami", profession: "teacher" },
];

describe("PixelWorld", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("crea avatares dentro del mundo", () => {
    const avatars = createAvatars(people, () => "tecnologia");
    expect(avatars).toHaveLength(3);
    for (const a of avatars) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(WORLD_SIZE);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(WORLD_SIZE);
    }
  });

  it("cada profesión tiene un color", () => {
    expect(professionColor("developer")).toMatch(/^#/);
    expect(professionColor("desconocida")).toMatch(/^#/);
  });

  it("los avatares caminan hacia su destino", () => {
    const avatars = createAvatars(people, () => "residencial");
    avatars[0].targetX = avatars[0].x + 50;
    avatars[0].targetY = avatars[0].y;
    const x0 = avatars[0].x;

    for (let i = 0; i < 10; i++) step(avatars);
    expect(avatars[0].x).toBeGreaterThan(x0);
  });

  it("retarget manda al avatar a su nueva zona cuando cambia", () => {
    let zone = "residencial";
    const avatars = createAvatars(people, () => zone);
    // Cambia la zona: el destino debe caer en la nueva.
    zone = "academia";
    retarget(avatars, () => zone);

    const center = zoneCenter("academia");
    for (const a of avatars) {
      expect(a.zoneId).toBe("academia");
      // El destino está cerca del centro de la zona academia.
      expect(Math.abs(a.targetX - center.x)).toBeLessThan(60);
      expect(Math.abs(a.targetY - center.y)).toBeLessThan(60);
    }
  });

  it("avatarAt encuentra al más cercano dentro del radio", () => {
    const avatars = createAvatars(people, () => "comercio");
    const a = avatars[0];
    const found = avatarAt(avatars, a.x, a.y, 10);
    expect(found?.id).toBe(a.id);
    expect(avatarAt(avatars, -999, -999, 5)).toBeUndefined();
  });

  it("el paso no saca al avatar de un salto (movimiento suave)", () => {
    const avatars = createAvatars(people, () => "medios");
    avatars[0].targetX = avatars[0].x + 100;
    const before = avatars[0].x;
    step(avatars, 1.2);
    expect(avatars[0].x - before).toBeLessThanOrEqual(1.3);
  });
});
