import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { SecurityTools } from "./SecurityTools";
import { LabNetwork } from "./LabNetwork";
import { Academy } from "../academy/Academy";
import { VirtualNetwork } from "../network/VirtualNetwork";
import { VirtualDNS } from "../dns/VirtualDNS";
import { TOOL_CATALOG } from "./toolCatalog";
import { resetStorage, seedRandom } from "../../test/setup";

function buildTools() {
  return new SecurityTools(new VirtualNetwork(), new VirtualDNS());
}

describe("catálogo de herramientas", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("tiene más de 50 herramientas", () => {
    expect(TOOL_CATALOG.length).toBeGreaterThan(50);
  });

  it("cada herramienta trae su ficha educativa completa", () => {
    for (const tool of TOOL_CATALOG) {
      expect(tool.simple, tool.id).not.toBe("");
      expect(tool.whatItDoes, tool.id).not.toBe("");
      expect(tool.whyExists, tool.id).not.toBe("");
      expect(tool.whenToUse, tool.id).not.toBe("");
      expect(tool.resultMeaning, tool.id).not.toBe("");
      expect(tool.howToDetect, tool.id).not.toBe("");
      expect(tool.howToDefend, tool.id).not.toBe("");
      expect(tool.usage, tool.id).not.toBe("");
    }
  });

  it("no hay identificadores repetidos", () => {
    const ids = TOOL_CATALOG.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cubre varias categorías de seguridad", () => {
    const tools = buildTools();
    const cats = tools.categories();

    for (const esperada of ["escaneo", "web", "explotacion", "blue-team", "cripto"]) {
      expect(cats).toContain(esperada);
    }
  });
});

describe("ejecución contra el laboratorio virtual", () => {
  let tools: SecurityTools;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    tools = buildTools();
  });

  it("nmap enumera los servicios de una máquina de laboratorio", () => {
    const res = tools.run("nmap", ["10.10.5.20"]);

    expect(res.isError).toBe(false);
    expect(res.output).toContain("22/tcp");
    expect(res.output).toContain("ssh");
    expect(res.output).toContain("mysql");
  });

  it("sqlmap encuentra la inyección en el lab vulnerable", () => {
    const res = tools.run("sqlmap", ["http://10.10.5.10/login", "user"]);

    expect(res.output).toContain("VULNERABLE");
    expect(res.flag).toBe("NANDE{sqli_login_basico}");
  });

  it("linpeas revela la vía de escalada del lab avanzado", () => {
    const res = tools.run("linpeas", ["10.10.5.40"]);

    expect(res.output).toContain("SUID");
    expect(res.flag).toBe("NANDE{escalada_por_suid}");
  });

  it("gobuster descubre rutas ocultas", () => {
    const res = tools.run("gobuster", ["10.10.5.10"]);

    expect(res.output).toContain("/admin");
    expect(res.output).toContain("oculta");
  });

  it("base64 codifica y decodifica", () => {
    expect(tools.run("base64", ["hola"]).output.trim()).toBe("aG9sYQ==");
    expect(tools.run("base64", ["-d", "aG9sYQ=="]).output.trim()).toBe("hola");
  });

  it("una ficha no ejecutable lo dice sin fallar", () => {
    const res = tools.run("burp", []);

    expect(res.isError).toBe(false);
    expect(res.output).toContain("educativa");
  });
});

describe("aislamiento de las herramientas de seguridad", () => {
  let tools: SecurityTools;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    tools = buildTools();
  });

  it("rechaza objetivos que no son virtuales", () => {
    for (const objetivo of ["8.8.8.8", "1.1.1.1", "google.com", "192.168.0.1"]) {
      const res = tools.run("nmap", [objetivo]);
      expect(res.output, objetivo).toContain("fuera del sandbox");
    }
  });

  it("ping real de Internet es rechazado, el virtual funciona", () => {
    expect(tools.run("ping", ["8.8.8.8"]).output).toContain("fuera del sandbox");
    expect(tools.run("ping", ["10.10.5.10"]).output).toContain("recibidos");
  });

  it("whois solo acepta dominios virtuales", () => {
    expect(tools.run("whois", ["github.com"]).isError).toBe(true);
    expect(tools.run("whois", ["startup.nande"]).isError).toBe(false);
  });

  it("todas las máquinas de laboratorio viven en la red virtual", () => {
    const lab = new LabNetwork();

    for (const machine of lab.all()) {
      expect(machine.ip, machine.hostname).toMatch(/^10\.10\./);
    }
  });

  it("ninguna bandera de laboratorio parece un dato real", () => {
    const lab = new LabNetwork();

    for (const machine of lab.all()) {
      expect(machine.flag).toMatch(/^NANDE\{/);
    }
  });
});

describe("academia", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("ofrece una ruta de nivel 0 a experto", () => {
    const academy = new Academy();
    const all = academy.all();

    expect(all[0].stage).toBe(0);
    expect(all[0].requires).toEqual([]);
    expect(all.some((c) => c.level === "experto")).toBe(true);
  });

  it("los requisitos apuntan a cursos que existen", () => {
    const academy = new Academy();
    const ids = new Set(academy.all().map((c) => c.id));

    for (const course of academy.all()) {
      for (const req of course.requires) {
        expect(ids.has(req), `${course.id} requiere ${req}`).toBe(true);
      }
    }
  });

  it("calcula qué requisitos faltan", () => {
    const academy = new Academy();

    expect(academy.missingRequirements("redes", [])).toContain("linux");
    expect(
      academy.missingRequirements("redes", ["computacion", "linux"]),
    ).toEqual([]);
  });

  it("las herramientas de cada curso existen en la biblioteca", () => {
    const academy = new Academy();
    const tools = buildTools();

    for (const course of academy.all()) {
      for (const toolId of course.tools) {
        expect(tools.get(toolId), `${course.id}: ${toolId}`).toBeDefined();
      }
    }
  });
});

describe("academia navegable", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("academy.nande y tools.nande se abren desde el navegador", () => {
    const kernel = new VirtualKernel();

    const academy = kernel.browser.open("academy.nande");
    expect(academy.content).toContain("ÑANDE Academy");

    const tools = kernel.browser.open("tools.nande");
    expect(tools.content).toContain("Toolbox");

    kernel.dispose();
  });

  it("cada herramienta tiene su página con la ficha completa", () => {
    const kernel = new VirtualKernel();

    const page = kernel.browser.open("tools.nande", "/tool/nmap");
    expect(page.content).toContain("Cómo defenderse");
    expect(page.content).toContain("Golpea todas las puertas");

    kernel.dispose();
  });

  it("los cursos se navegan y enlazan sus herramientas", () => {
    const kernel = new VirtualKernel();

    const page = kernel.browser.open("academy.nande", "/course/redes");
    expect(page.content).toContain("IP");
    expect(page.content).toContain("ping");

    kernel.dispose();
  });
});
