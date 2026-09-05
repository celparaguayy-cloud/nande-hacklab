import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { LabNetwork } from "./LabNetwork";
import { SecurityTools } from "./SecurityTools";
import { VirtualNetwork } from "../network/VirtualNetwork";
import { VirtualDNS } from "../dns/VirtualDNS";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

function tools() {
  return new SecurityTools(new VirtualNetwork(), new VirtualDNS());
}

describe("laboratorio OWASP", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("existe owasplab con varias vulnerabilidades del Top 10", () => {
    const lab = new LabNetwork().getByIp("10.10.5.50");

    expect(lab).toBeDefined();
    const ids = lab!.vulns.map((v) => v.id);
    expect(ids).toContain("NANDE-WEB-CMDI");
    expect(ids).toContain("NANDE-WEB-SSRF");
    expect(ids).toContain("NANDE-WEB-MISCONF");
  });

  it("commix detecta la inyección de comandos", () => {
    const res = tools().run("commix", ["http://10.10.5.50/ping"]);
    expect(res.output).toContain("VULNERABLE");
    expect(res.flag).toBe("NANDE{owasp_top10_labs}");
  });

  it("ssrf detecta el fallo del importador", () => {
    const res = tools().run("ssrf", ["http://10.10.5.50/import"]);
    expect(res.output).toContain("SSRF");
    expect(res.flag).toBe("NANDE{owasp_top10_labs}");
  });

  it("gobuster encuentra .git y backups expuestos", () => {
    const res = tools().run("gobuster", ["10.10.5.50"]);
    expect(res.output).toContain(".git");
    expect(res.output).toContain("config.bak");
  });

  it("curl filtra el backup con credenciales", () => {
    const res = tools().run("curl", ["http://10.10.5.50/config.bak"]);
    expect(res.output).toContain("DB_PASS");
  });

  it("las herramientas OWASP siguen rechazando objetivos reales", () => {
    const t = tools();
    expect(t.run("commix", ["http://8.8.8.8/x"]).output).toContain("fuera del sandbox");
    expect(t.run("ssrf", ["8.8.8.8"]).output).toContain("fuera del sandbox");
  });
});

describe("lecciones OWASP", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("la lección de inyección de comandos se completa", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-owasp-cmdi");
    term.execute("nmap 10.10.5.50");
    const done = term.execute("commix http://10.10.5.50/ping");

    expect(done).toContain("Lección completada");
    kernel.dispose();
  });

  it("la lección de SSRF se completa", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-owasp-ssrf");
    const done = term.execute("ssrf http://10.10.5.50/import");

    expect(done).toContain("Lección completada");
    kernel.dispose();
  });

  it("la lección de misconfig atraviesa gobuster y curl", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-owasp-misconf");
    term.execute("gobuster 10.10.5.50");
    const done = term.execute("curl http://10.10.5.50/config.bak");

    expect(done).toContain("Lección completada");
    kernel.dispose();
  });

  it("el curso OWASP existe y sus herramientas están en la biblioteca", () => {
    const kernel = new VirtualKernel();
    const course = kernel.academy.get("owasp");

    expect(course).toBeDefined();
    for (const toolId of course!.tools) {
      expect(kernel.tools.get(toolId), toolId).toBeDefined();
    }
    kernel.dispose();
  });
});
