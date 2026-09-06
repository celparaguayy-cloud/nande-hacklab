import { describe, expect, it } from "vitest";
import { renderLivingSite } from "./LivingSite";
import type { WorldEntity } from "../world/WorldRegistry";

function entity(type: WorldEntity["type"], name: string): WorldEntity {
  return {
    id: `e-${name}`,
    type,
    name,
    description: `Sobre ${name}.`,
    ownerId: "person-1",
    createdTick: 0,
    updatedTick: 0,
    tags: ["redes"],
    metadata: { ownerName: "Ana" },
  };
}
const owner = { name: "Ana", profession: "developer", interests: ["Linux", "redes"] };

describe("sitios vivos de los habitantes", () => {
  it("un repo tiene varias páginas navegables", () => {
    const e = entity("repository", "MiHerramienta");
    expect(renderLivingSite(e, owner, 10, "/")).toBeTruthy();
    expect(renderLivingSite(e, owner, 10, "/commits")?.html).toContain("commits");
    expect(renderLivingSite(e, owner, 10, "/releases")).toBeTruthy();
    expect(renderLivingSite(e, owner, 10, "/no-existe")?.html ?? "404").toBeTruthy();
  });

  it("el sitio CRECE con el tiempo: más commits en día 30 que en día 2", () => {
    const e = entity("repository", "Proyecto");
    const c2 = renderLivingSite(e, owner, 2, "/commits")!.html.match(/[0-9a-f]{7}/g)?.length ?? 0;
    const c30 = renderLivingSite(e, owner, 30, "/commits")!.html.match(/[0-9a-f]{7}/g)?.length ?? 0;
    expect(c30).toBeGreaterThan(c2);
  });

  it("una empresa tiene productos, blog, equipo y novedades", () => {
    const e = entity("company", "Corp");
    expect(renderLivingSite(e, owner, 20, "/productos")?.html).toContain("mes");
    expect(renderLivingSite(e, owner, 20, "/equipo")?.html).toContain("Ana");
    expect(renderLivingSite(e, owner, 20, "/changelog")?.html).toContain("v");
  });

  it("un blog acumula entradas y cada entrada es leíble", () => {
    const e = entity("website", "Blog");
    const idx = renderLivingSite(e, owner, 15, "/posts")!.html;
    expect(idx).toContain("entradas");
    const post = renderLivingSite(e, owner, 15, "/posts/3")!.html;
    expect(post.length).toBeGreaterThan(120);
  });

  it("el contenido es determinista: mismo día, misma web", () => {
    const e = entity("company", "X");
    expect(renderLivingSite(e, owner, 12, "/blog")?.html).toBe(
      renderLivingSite(e, owner, 12, "/blog")?.html,
    );
  });
});
