import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * DFIR — pruebas de REALIDAD. Anti-mock: la recolección sale del estado vivo
 * del host (si matás un proceso, desaparece de la evidencia), los indicadores
 * salen de lo que de verdad pasó, y la cadena de custodia detecta una evidencia
 * alterada porque la huella se recalcula sobre el contenido.
 */
describe("Investigator / DFIR — forense sobre el mundo real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("la recolección refleja el estado VIVO del host, no una foto inventada", () => {
    const before = kernel.dfir.collect("server.nande");
    expect(before).not.toBeNull();
    expect(before!.host).toBe("server.nande");
    expect(before!.processes.length).toBeGreaterThan(0);
    expect(before!.services.length).toBeGreaterThan(0);

    // Parar un servicio de verdad tiene que verse en la próxima recolección.
    const svc = before!.services.find((s) => s.state === "running")!;
    kernel.hosts.stopService("server.nande", svc.name);
    const after = kernel.dfir.collect("server.nande")!;
    expect(after.services.find((s) => s.name === svc.name)!.state).not.toBe("running");
    expect(after.digest).not.toBe(before!.digest);
  });

  it("la cadena de custodia detecta evidencia alterada", () => {
    const art = kernel.dfir.collect("server.nande")!;
    expect(kernel.dfir.verify(art)).toBe(true);

    const tampered = { ...art, processes: art.processes.slice(1) };
    expect(kernel.dfir.verify(tampered)).toBe(false);
  });

  it("un host inexistente no se puede recolectar (no se inventa)", () => {
    expect(kernel.dfir.collect("no.existe")).toBeNull();
    expect(kernel.dfir.collectable()).toContain("server.nande");
  });

  it("sin actividad no hay caso, y con actividad real aparece paciente cero", () => {
    expect(kernel.dfir.patientZero()).toBeNull();
    expect(kernel.dfir.report()).toContain("Sin caso");

    kernel.hosts.authenticate("server.nande", "soporte", "mala1");
    const z = kernel.dfir.patientZero();
    expect(z).not.toBeNull();
    expect(z!.host).toBe("server.nande");
    expect(kernel.dfir.report()).toContain("Paciente cero");
  });

  it("los indicadores salen de la evidencia: credencial en claro capturada por la red", () => {
    kernel.browser.request("POST", "banco.nande", "/login", { user: "ana", password: "Clave123" });
    const iocs = kernel.dfir.iocs();
    const cred = iocs.find((i) => i.kind === "credencial");
    expect(cred).toBeDefined();
    expect(cred!.value).toContain("Clave123");
    expect(cred!.why).toContain("claro");
  });

  it("extrae el usuario atacado y el puerto tocado del texto REAL de los eventos", () => {
    for (let i = 0; i < 6; i += 1) kernel.hosts.authenticate("server.nande", "soporte", `mala${i}`);
    kernel.hosts.stopService("server.nande", "nginx");

    const iocs = kernel.dfir.iocs();
    const user = iocs.find((i) => i.kind === "usuario");
    expect(user?.value).toBe("soporte");
    expect(user!.hits).toBeGreaterThanOrEqual(6);

    // "nginx se detuvo (80/tcp)" → el puerto sale de ahí, no de una lista fija.
    expect(iocs.find((i) => i.kind === "puerto")?.value).toBe("80");

    // Una IP no se cataloga como nombre de host.
    expect(iocs.filter((i) => i.kind === "host").every((i) => !/^\d+\.\d+\.\d+\.\d+$/.test(i.value))).toBe(true);
  });

  it("pivotear sobre un indicador trae toda la evidencia que lo menciona", () => {
    for (let i = 0; i < 5; i += 1) kernel.hosts.authenticate("server.nande", "soporte", `mala${i}`);
    kernel.hosts.stopService("server.nande", "nginx");

    const hits = kernel.dfir.pivot("server.nande");
    expect(hits.length).toBeGreaterThanOrEqual(5);
    expect(hits.every((h) => h.host.includes("server") || h.detail.includes("server"))).toBe(true);

    // Y filtrar por tipo devuelve sólo ese tipo.
    const fails = kernel.dfir.timeline({ kind: "login.failure" });
    expect(fails.length).toBeGreaterThanOrEqual(5);
    expect(fails.every((e) => e.kind === "login.failure")).toBe(true);
  });

  it("el informe incluye el veredicto, las técnicas y la línea de tiempo reales", () => {
    for (let i = 0; i < 6; i += 1) kernel.hosts.authenticate("server.nande", "soporte", `mala${i}`);
    kernel.hosts.stopService("server.nande", "nginx");

    const rep = kernel.dfir.report();
    expect(rep).toContain("INFORME DE INCIDENTE");
    expect(rep).toContain("server.nande");
    expect(rep).toContain("LÍNEA DE TIEMPO");
    // La fuerza bruta la detecta el correlador de verdad, no un texto fijo.
    expect(rep).toContain("T1110");
  });

  it("desde la terminal se recolecta, se listan indicadores y se emite el informe", () => {
    for (let i = 0; i < 6; i += 1) kernel.hosts.authenticate("server.nande", "soporte", `mala${i}`);

    expect(term.execute("dfir collect server.nande")).toContain("server.nande");
    expect(term.execute("dfir iocs")).toContain("server.nande");
    expect(term.execute("dfir report")).toContain("INFORME DE INCIDENTE");
  });

  it("el DFIR recupera el IOC del ACTOR de un incidente del data center (lazo SOC→DFIR→TI)", () => {
    // El mundo ataca tu data center: el incidente trae el IOC del actor.
    const inc = kernel.threats.maybeAttack(100)!;
    expect(inc.ioc, "el incidente debería traer un IOC").toBeTruthy();

    // El DFIR, además de ver la caída del servicio, ahora surfacea ese IOC como
    // indicador atribuible (antes sólo veía 'un servicio se cayó').
    const iocs = kernel.dfir.iocs();
    const amenaza = iocs.find((i) => i.kind === "amenaza" && i.value === inc.ioc);
    expect(amenaza, `el DFIR debería exponer el IOC del actor (${inc.ioc})`).toBeTruthy();
    expect(amenaza!.why).toContain(inc.rival);

    // Y ese mismo IOC + su actor cierran la atribución en la plataforma de TI.
    const findActor = (rival: string) => rival; // el alias del incidente es el actor
    const body = kernel.browser.request(
      "GET",
      "ti.nande",
      "/atribuir?ioc=" + encodeURIComponent(inc.ioc!) + "&actor=" + encodeURIComponent(findActor(inc.rival)),
    ).response.body;
    expect(body).toContain("ND{ti_atribucion}");
  });

  it("dfir pivot sobre el IOC (o el actor) de un incidente conecta con el ataque real", () => {
    const inc = kernel.threats.maybeAttack(100)!;
    // Pivot sobre el IOC del actor: ahora trae la conexión con el ataque real
    // (antes no traía nada porque el IOC no estaba en la línea de tiempo).
    const porIoc = kernel.dfir.pivot(inc.ioc!);
    expect(porIoc.some((e) => e.detail.includes(inc.rival) && e.host === inc.host)).toBe(true);
    // Pivot sobre el actor también lo encuentra.
    const porActor = kernel.dfir.pivot(inc.rival);
    expect(porActor.some((e) => e.host === inc.host)).toBe(true);
  });

  it("la RESPUESTA es trazable: contener deja el rastro (ataque → contención)", () => {
    const inc = kernel.threats.maybeAttack(100)!;
    // Antes de contener: pivot muestra el ataque, no la respuesta.
    const antes = kernel.dfir.pivot(inc.rival);
    expect(antes.some((e) => e.kind === "contención")).toBe(false);
    // Contené el incidente (respuesta defensiva) más tarde.
    expect(kernel.threats.contain(inc.id, 130).ok).toBe(true);
    // Ahora el pivot muestra el ciclo completo: ataque + contención trazada.
    const despues = kernel.dfir.pivot(inc.rival);
    const cont = despues.find((e) => e.kind === "contención");
    expect(cont, "el pivot debería mostrar la contención").toBeTruthy();
    expect(cont!.tick).toBe(130);
    expect(cont!.detail).toContain(inc.rival);
  });
});
