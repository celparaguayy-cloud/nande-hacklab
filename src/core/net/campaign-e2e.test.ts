import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Campaña red↔blue de punta a punta — GUARDA DE COHERENCIA de todo el motor de
 * red construido esta tanda. Los tests unitarios cubren cada sistema por
 * separado; este los encadena en UN SOLO kernel y verifica que interactúan sin
 * pisarse: el EventBus, el correlador MITRE, las reacciones del mundo y las
 * fuentes únicas de estado acumulan de forma coherente a lo largo de toda una
 * operación (regla 5/6/13/20). Si una futura refactorización rompe la
 * coherencia entre capas, este test lo caza.
 */
describe("Campaña completa red↔blue — coherencia de extremo a extremo", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("recon → MITM↔IDS → OT sabotaje↔defensa → AD takeover → DCSync → Golden Ticket↔rotación", () => {
    // ── 1) Reconocimiento: el DC es un host real con puertos de AD ───────────
    const dcScan = term.execute("nmap 10.10.0.5");
    expect(dcScan).toContain("88/tcp"); // Kerberos → es un DC
    expect(dcScan).toContain("445/tcp");

    // ── 2) MITM de capa 2/3 y su detección azul ──────────────────────────────
    term.execute("arpspoof pc-conta.nande");
    expect(kernel.shark.credentials().some((c) => c.value === "Contadora#2024")).toBe(true);
    expect(term.execute("ids")).toMatch(/ARP SPOOFING/);
    term.execute("arpspoof stop");
    term.execute("dnsspoof banco.nande");
    expect(term.execute("ids")).toMatch(/DNS SPOOFING/);
    term.execute("dnsspoof stop");

    // ── 3) OT: pivot IT→OT, fingerprint, sabotaje y defensa ───────────────────
    term.execute("connect server.nande soporte Verano2024");
    term.execute("connect nas.interna.nande respaldo NasÑande#2024");
    term.execute("connect db-core.interna.nande dbadmin Core-DB!2024");
    expect(term.execute("modbus id plc.planta.nande")).toContain("NPLC-3000");
    expect(term.execute("modbus write plc.planta.nande reg 1 90")).toContain("IMPACTO FÍSICO");
    expect(kernel.plc.process("plc.planta.nande")!.hazard).toBe("overpressure");
    // Defensa OT: proteger el PLC bloquea el sabotaje siguiente.
    term.execute("modbus protect plc.planta.nande on");
    expect(term.execute("modbus write plc.planta.nande reg 1 130")).toMatch(/protegido|rechazada/i);
    expect(kernel.plc.process("plc.planta.nande")!.safety).toBe("ok"); // no se destruyó
    term.execute("exit");
    term.execute("exit");
    term.execute("exit");

    // ── 4) AD: enum → spray → abuso → PtH → Domain Admins ─────────────────────
    expect(term.execute("enum4linux nande.local")).toContain("SVC-SQL@NANDE.LOCAL");
    term.execute("crackmapexec smb dc01.nande.local -u svc-sql -p Verano2024!");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    term.execute("mimikatz sekurlsa::logonpasswords");
    term.execute('mimikatz "sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL"');
    expect(kernel.directory.domainOwned()).toBe(true);

    // ── 5) DCSync (krbtgt) → Golden Ticket (persistencia) ─────────────────────
    const krbtgt = kernel.directory.krbtgtHash();
    expect(term.execute('mimikatz "lsadump::dcsync /all"')).toContain(krbtgt);
    term.execute(`mimikatz "kerberos::golden /user:Administrator /krbtgt:${krbtgt}"`);
    expect(kernel.directory.hasDomainPersistence()).toBe(true);

    // ── 6) Defensa AD: rotar krbtgt DOS veces mata la persistencia ────────────
    term.execute("rotate-krbtgt");
    expect(kernel.directory.hasDomainPersistence()).toBe(true); // una no alcanza
    term.execute("rotate-krbtgt");
    expect(kernel.directory.hasDomainPersistence()).toBe(false);

    // ── Coherencia global: el correlador MITRE acumuló TODAS las técnicas ─────
    const ids = new Set(kernel.mitre.all().map((d) => d.mitreId));
    // MITM (L2/L3), OT (ICS), AD (identidad) — todas en la MISMA matriz.
    expect([...ids].some((id) => id.startsWith("T1557"))).toBe(true); // AiTM (ARP/DNS)
    expect(ids.has("T0831")).toBe(true); // OT: Manipulation of Control
    expect(ids.has("T1078")).toBe(true); // AD: Valid Accounts
    expect(ids.has("T1003.006")).toBe(true); // AD: DCSync
    expect(ids.has("T1558.001")).toBe(true); // AD: Golden Ticket

    // El mundo REACCIONÓ a los golpes grandes (OT + dominio), no sólo detección.
    const heads = kernel.news.latest(40).map((a) => a.headline).join(" | ");
    expect(heads).toMatch(/planta|sobrepresión|industrial/i); // OT
    expect(heads).toMatch(/dominio|Domain Admins/i); // AD
    expect(kernel.reputation().offensive).toBeGreaterThan(0);

    // DFIR reconstruye el incidente desde los MISMOS eventos reales.
    const dfir = term.execute("dfir");
    expect(dfir).not.toMatch(/no hay incidentes/i);
  });
});
