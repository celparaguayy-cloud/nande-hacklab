import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * AdversaryEmulator — el adversario VIVO. Pruebas de REALIDAD: cada paso ejecuta
 * una técnica de verdad (la ve el SOC/DFIR/matriz), y la CONTENCIÓN del jugador
 * bloquea de verdad al adversario en marcha. No es un guion: si el activo del
 * próximo paso está contenido, el adversario no avanza.
 */
describe("AdversaryEmulator — adversario vivo y defensa real (purple team)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("corre la campaña de dominio y sus técnicas se DETECTAN (SOC/DFIR/matriz)", () => {
    kernel.adversary.start("ana-reta");
    const r = kernel.adversary.run();
    expect(r.status).toBe("succeeded");
    // Las técnicas del adversario encendieron la matriz ATT&CK…
    const ids = kernel.mitre.techniques().map((t) => t.mitreId);
    expect(ids).toContain("T1558.003"); // Kerberoasting
    expect(ids).toContain("T1078.002"); // dominancia de dominio
    // …y el SOC levantó alertas de esa actividad.
    expect(kernel.soc.count()).toBeGreaterThan(0);
    // …y el DFIR puede reconstruir el incidente del adversario.
    expect(kernel.dfir.reconstruct()).not.toBeNull();
  });

  it("la CONTENCIÓN del jugador BLOQUEA al adversario en marcha (deshabilitar cuenta)", () => {
    kernel.adversary.start("ana-reta");
    // El defensor deshabilita la cuenta de servicio ANTES de que el adversario
    // la use (paso Kerberoasting depende de SVC-SQL).
    kernel.containment.disableAccount("SVC-SQL@NANDE.LOCAL");
    const r = kernel.adversary.run();
    expect(r.status).toBe("blocked");
    // No llegó al dominio: la cadena se cortó.
    const ids = kernel.mitre.techniques().map((t) => t.mitreId);
    expect(ids).not.toContain("T1078.002");
    // Rehabilitar destraba y ahora sí progresa.
    kernel.containment.enableAccount("SVC-SQL@NANDE.LOCAL");
    const r2 = kernel.adversary.run();
    expect(r2.status).toBe("succeeded");
  });

  it("la campaña OT se BLOQUEA aislando el host de la planta", () => {
    kernel.adversary.start("karai-ot");
    kernel.containment.isolateHost("hmi.planta.nande"); // corta el salto IT→OT
    const r = kernel.adversary.run();
    expect(r.status).toBe("blocked");
    // No se ejecutó el sabotaje del SIS ni el impacto.
    const ids = kernel.mitre.techniques().map((t) => t.mitreId);
    expect(ids).not.toContain("T0858");
    expect(ids).not.toContain("T0879");
  });

  it("por terminal: start → status muestra qué activo contener; run cumple si no defendés", () => {
    expect(term.execute("apt start ana-reta")).toMatch(/armado|Aña Retã/);
    const status = term.execute("apt status");
    expect(status).toMatch(/Próximo paso|Depende de|SVC-SQL|server\.nande/);
    const run = term.execute("apt run");
    expect(run).toMatch(/CUMPLIÓ|objetivo/i);
  });

  it("start desconocido lista los perfiles disponibles", () => {
    const out = term.execute("apt start noexiste");
    expect(out).toContain("ana-reta");
    expect(out).toContain("karai-ot");
  });
});
