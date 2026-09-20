import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Escalada de privilegios REAL (estilo HTB) sobre web01.nande. No hay salida
 * pregrabada: el estado de la sesión cambia (devops → root) sólo si el comando
 * es un escape de shell válido (GTFOBins), y la bandera de root vive en /root,
 * ilegible hasta que escalás. Anti-mock: si el motor deja de escalar, o deja
 * de proteger /root, este test lo caza.
 */
describe("Privesc — web01.nande (sudo NOPASSWD find → GTFOBins → root)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("foothold: devops entra y captura la bandera de usuario", () => {
    const conn = term.execute("connect web01.nande devops Delfin2024");
    expect(conn).toContain("conectado a web01.nande");
    expect(term.execute("whoami")).toContain("devops");
    const user = term.execute("cat /home/devops/user.txt");
    expect(user).toContain("ND{foothold_devops}");
    expect(kernel.player.capturedFlags()).toContain("ND{foothold_devops}");
  });

  it("como devops, /root está protegido (la escalada importa)", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const denied = term.execute("cat /root/flag.txt");
    expect(denied).toMatch(/Permiso denegado/i);
    expect(kernel.player.capturedFlags()).not.toContain("ND{privesc_sudo_root}");
  });

  it("sudo -l revela el binario NOPASSWD", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const out = term.execute("sudo -l");
    expect(out).toContain("/usr/bin/find");
    expect(out).toMatch(/NOPASSWD/);
  });

  it("sudo con un binario NO permitido es rechazado", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const out = term.execute("sudo vim");
    expect(out).toMatch(/no puede ejecutar/i);
    expect(term.execute("whoami")).toContain("devops"); // sigue sin escalar
  });

  it("sudo find -exec /bin/sh escala a root y libera /root", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const esc = term.execute("sudo find . -exec /bin/sh \\;");
    expect(esc).toMatch(/uid=0\(root\)/);
    expect(term.execute("whoami")).toContain("root");
    const root = term.execute("cat /root/flag.txt");
    expect(root).toContain("ND{privesc_sudo_root}");
    expect(kernel.player.capturedFlags()).toContain("ND{privesc_sudo_root}");
  });

  it("find permitido pero SIN escape no escala (no es fakery)", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const benign = term.execute("sudo find /etc -name passwd");
    expect(benign).not.toMatch(/uid=0\(root\)/);
    expect(term.execute("whoami")).toContain("devops");
  });

  it("escalar a root enciende una detección MITRE (coherencia SOC/OPSEC/DFIR)", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const before = kernel.mitre.count();
    term.execute("sudo find . -exec /bin/sh \\;");
    // La acción ofensiva se propaga a la capa defensiva: no es sólo texto.
    expect(kernel.mitre.techniques().map((t) => t.mitreId)).toContain("T1548.003");
    expect(kernel.mitre.count()).toBeGreaterThan(before);
    const det = kernel.mitre.all().find((d) => d.mitreId === "T1548.003");
    expect(det?.host).toBe("web01.nande");
  });

  it("un find SIN escape no genera detección de escalada (sin falsos positivos)", () => {
    term.execute("connect web01.nande devops Delfin2024");
    term.execute("sudo find /etc -name passwd");
    expect(kernel.mitre.techniques().map((t) => t.mitreId)).not.toContain("T1548.003");
  });
});
