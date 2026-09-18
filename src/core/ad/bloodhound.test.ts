import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * NandeBlood como BloodHound real: grafo con capas para dibujar, detalle de
 * nodo (quién te controla / a quién controlás) y consultas prearmadas.
 * Anti-mock: todo sale del grafo real del dominio, y cambia cuando actuás.
 */
describe("NandeBlood — grafo y análisis al estilo BloodHound", () => {
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("el grafo trae nodos con capa y todas las aristas reales", () => {
    const g = kernel.directory.graph();
    expect(g.nodes.length).toBeGreaterThanOrEqual(8);
    expect(g.edges.length).toBeGreaterThanOrEqual(8);
    // Domain Admins es el objetivo: distancia 0 y la capa más alta.
    const da = g.nodes.find((n) => n.principal.name.startsWith("DOMAIN ADMINS"))!;
    expect(da.distanceToTarget).toBe(0);
    const maxRank = Math.max(...g.nodes.map((n) => n.rank));
    expect(da.rank).toBe(maxRank);
    // El foothold del jugador está más lejos que el objetivo.
    const yo = g.nodes.find((n) => n.principal.name.startsWith("JUGADOR"))!;
    expect(yo.distanceToTarget).toBeGreaterThan(0);
    expect(yo.rank).toBeLessThan(da.rank);
  });

  it("nodeDetail dice quién te controla y a quién controlás", () => {
    const d = kernel.directory.nodeDetail("LORE.MARTINEZ@NANDE.LOCAL")!;
    expect(d).not.toBeNull();
    expect(d.principal.kind).toBe("user");
    // Lore es AdminTo de su estación y tiene GenericAll sobre la cuenta SPN.
    expect(d.outbound.some((e) => e.type === "AdminTo")).toBe(true);
    expect(d.outbound.some((e) => e.type === "GenericAll")).toBe(true);
    // A Lore la controla Mesa de Ayuda por ForceChangePassword.
    expect(d.inbound.some((e) => e.type === "ForceChangePassword")).toBe(true);
    expect(kernel.directory.nodeDetail("NO-EXISTE")).toBeNull();
  });

  it("consulta 'ruta más corta' devuelve el subgrafo del camino", () => {
    const r = kernel.directory.runAnalysis("shortest-path");
    expect(r.edges.length).toBeGreaterThan(0);
    expect(r.nodes.size).toBeGreaterThan(1);
    // Todo borde del camino conecta nodos del subgrafo.
    for (const e of r.edges) {
      expect(r.nodes.has(e.from)).toBe(true);
      expect(r.nodes.has(e.to)).toBe(true);
    }
    expect(r.note).toContain("salto");
  });

  it("consulta 'kerberoastable' encuentra la cuenta con SPN", () => {
    const r = kernel.directory.runAnalysis("kerberoastable");
    expect(r.nodes.size).toBeGreaterThan(0);
    expect([...r.nodes].some((n) => n.startsWith("SVC-SQL"))).toBe(true);
  });

  it("consulta 'domain-admins' lista los miembros reales del grupo", () => {
    const das = kernel.directory.domainAdmins();
    expect(das.length).toBeGreaterThan(0);
    expect(das.some((p) => p.name.startsWith("ADMIN-SQL"))).toBe(true);
    const r = kernel.directory.runAnalysis("domain-admins");
    expect(r.edges.every((e) => e.type === "MemberOf")).toBe(true);
  });

  it("'owned' crece cuando de verdad poseés un nodo nuevo", () => {
    const antes = kernel.directory.runAnalysis("owned").nodes.size;
    // Kerberoast + crack de la cuenta de servicio: acción REAL del motor.
    kernel.directory.kerberoast("SVC-SQL@NANDE.LOCAL");
    const r = kernel.directory.crack("SVC-SQL@NANDE.LOCAL", "Verano2024!");
    expect(r.ok).toBe(true);
    const despues = kernel.directory.runAnalysis("owned").nodes.size;
    expect(despues).toBeGreaterThan(antes);
  });

  it("el catálogo de consultas está completo y corre sin romperse", () => {
    const list = kernel.directory.analysisList();
    expect(list.length).toBeGreaterThanOrEqual(5);
    for (const q of list) {
      const r = kernel.directory.runAnalysis(q.id);
      expect(typeof r.note).toBe("string");
      expect(r.nodes instanceof Set).toBe(true);
    }
  });
});
