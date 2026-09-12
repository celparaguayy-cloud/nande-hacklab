import { beforeEach, describe, expect, it } from "vitest";
import { Pulso } from "./Pulso";
import type { VirtualPerson } from "../world/WorldEngine";
import { resetStorage } from "../../test/setup";

function people(): VirtualPerson[] {
  return [
    {
      id: "p1",
      name: "Kamba Ríos",
      profession: "programadora",
      interests: ["redes", "café"],
    } as unknown as VirtualPerson,
  ];
}

describe("Pulso — red social más real (likes y comentarios)", () => {
  beforeEach(() => resetStorage());

  it("like es togglable, suma al conteo y persiste", () => {
    const pulso = new Pulso(people, () => 3);
    const post = pulso.feed()[0];
    expect(post).toBeDefined();

    const base = post.likes;
    expect(pulso.hasLiked(post.id)).toBe(false);

    expect(pulso.toggleLike(post.id)).toBe(true);
    expect(pulso.likeCountFor(post)).toBe(base + 1);

    // Persiste en otra instancia (misma sesión de storage).
    const otra = new Pulso(people, () => 3);
    expect(otra.hasLiked(post.id)).toBe(true);

    expect(otra.toggleLike(post.id)).toBe(false);
    expect(otra.hasLiked(post.id)).toBe(false);
  });

  it("comentar agrega y persiste el comentario del jugador", () => {
    const pulso = new Pulso(people, () => 5);
    const post = pulso.feed()[0];

    pulso.comment(post.id, "¡buenísimo!");
    const cs = pulso.commentsFor(post.id);
    expect(cs).toHaveLength(1);
    expect(cs[0].text).toBe("¡buenísimo!");
    expect(cs[0].author).toBe("vos");

    const otra = new Pulso(people, () => 5);
    expect(otra.commentsFor(post.id)).toHaveLength(1);
  });

  it("si comentás en el post de alguien, te responde y queda notificación", () => {
    const pulso = new Pulso(people, () => 7);
    const post = pulso.feed()[0];

    pulso.comment(post.id, "¿de qué es tu proyecto?", post.authorName);
    const cs = pulso.commentsFor(post.id);
    expect(cs).toHaveLength(2); // tu comentario + respuesta del autor
    expect(cs[1].author).toBe(post.authorName);

    const notifs = pulso.notifications();
    expect(notifs.length).toBe(1);
    expect(notifs[0].author).toBe(post.authorName);
    expect(pulso.unreadNotifications()).toBe(1);
  });
});
