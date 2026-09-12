import { describe, expect, it, beforeEach } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Regresión: unirse a un grupo tiene que andar EN CASTELLANO. El comando se
 * ofrece como "grupos", pero antes el único subcomando que unía era "join"
 * (inglés), así que "grupos unir rojo" no hacía nada — justo lo que se
 * reportó como "los grupos no me andan".
 */
describe("comando de grupos (unirse en castellano)", () => {
  let k: VirtualKernel;
  let t: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
    t = new VirtualTerminal(k);
  });

  it("'grupos unir rojo' une al equipo rojo", () => {
    const out = t.execute("grupos unir rojo");
    expect(out).toContain("Te uniste");
    expect(k.groups.memberOf()).toBe("g-redteam");
  });

  it("'grupos unir azul' une al equipo azul", () => {
    t.execute("grupos unir azul");
    expect(k.groups.memberOf()).toBe("g-blueteam");
  });

  it("acepta el id directo y también el inglés 'join'", () => {
    t.execute("grupos unir g-ctf");
    expect(k.groups.memberOf()).toBe("g-ctf");
    // cambiar con la forma en inglés sigue andando (a un grupo abierto)
    t.execute("groups join g-blueteam");
    expect(k.groups.memberOf()).toBe("g-blueteam");
  });

  it("'grupos salir' saca del grupo", () => {
    t.execute("grupos unir rojo");
    t.execute("grupos salir");
    expect(k.groups.memberOf()).toBeNull();
  });

  it("un nombre que no existe avisa, no falla en silencio", () => {
    const out = t.execute("grupos unir noexiste");
    expect(out.toLowerCase()).toContain("no encontré");
    expect(k.groups.memberOf()).toBeNull();
  });
});
