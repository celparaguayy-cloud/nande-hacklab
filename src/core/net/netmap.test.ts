import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Mapa de red del sandbox — derivado del ESTADO real de hosts (única fuente de
 * verdad, regla 2/12). Anti-mock: netmap sólo muestra lo alcanzable; los
 * segmentos internos quedan ocultos hasta pivotar (coherencia con la
 * reachability real). Si alguien filtra un host interno al mapa público, o el
 * agrupamiento por subred se rompe, este test lo caza.
 */
describe("Mapa de red (subnets + netmap)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("subnets() agrupa por /24 y marca las internas", () => {
    const subs = kernel.hosts.subnets();
    const by = new Map(subs.map((s) => [s.base, s]));
    // La subred de sitios públicos existe y NO es interna.
    expect(by.get("10.10.7")?.internal).toBe(false);
    expect(by.get("10.10.7")?.hosts.some((h) => h.hostname === "banco.nande")).toBe(true);
    // La caja interna vive en un segmento marcado interno.
    expect(by.get("10.10.66")?.internal).toBe(true);
    expect(by.get("10.10.66")?.hosts.some((h) => h.hostname === "caja.interna.nande")).toBe(true);
  });

  it("cada host cae en la /24 correcta derivada de su IP", () => {
    for (const sn of kernel.hosts.subnets()) {
      for (const h of sn.hosts) {
        expect(h.ip.split(".").slice(0, 3).join(".")).toBe(sn.base);
      }
    }
  });

  it("netmap muestra hosts públicos pero NO los internos (sin fakery)", () => {
    const out = term.execute("netmap");
    expect(out).toContain("banco.nande");
    expect(out).toContain("10.10.7.10");
    expect(out).toContain("web01.nande"); // la máquina de privesc está en el mapa
    // El host interno no se ve desde la red del jugador.
    expect(out).not.toContain("caja.interna.nande");
    expect(out).toContain("pivoting");
  });

  it("canReach: regla única de alcance (jugador vs. pivot)", () => {
    const h = kernel.hosts;
    expect(h.canReach(null, "banco.nande")).toBe(true);
    expect(h.canReach(null, "caja.interna.nande")).toBe(false);
    expect(h.canReach("server.nande", "caja.interna.nande")).toBe(true);
    // Por IP también (el origen se resuelve contra el mismo estado).
    expect(h.canReach("10.10.0.42", "10.10.66.10")).toBe(true);
    expect(h.canReach("web01.nande", "caja.interna.nande")).toBe(false);
    expect(h.canReach(null, "no.existe.nande")).toBe(false);
  });

  it("netmap dentro de una sesión remota muestra la red interna del host pivoteado", () => {
    expect(term.execute("connect server.nande soporte Verano2024")).toContain("conectado");
    const out = term.execute("netmap");
    expect(out).toContain("Mapa de red desde server.nande (10.10.0.42)");
    expect(out).toContain("sesión de soporte");
    // La ruta real de saltos.
    expect(out).toContain("tu equipo (10.10.0.10) -> server.nande (10.10.0.42) [soporte]");
    // El segmento interno y su host, con los servicios que responden AHORA.
    expect(out).toContain("10.10.66.0/24  [interno]");
    expect(out).toMatch(/10\.10\.66\.10\s+caja\.interna\.nande\s+2 svc/);
    // Coherente con internalSubnetsFrom (misma relación que connect).
    const internas = kernel.hosts.internalSubnetsFrom("server.nande");
    for (const sn of internas) {
      for (const hh of sn.hosts) {
        expect(out).toContain(hh.hostname);
        expect(kernel.hosts.canReach("server.nande", hh.hostname)).toBe(true);
      }
    }
  });

  it("el mapa remoto refleja el estado real: servicio caído y host apagado", () => {
    term.execute("connect server.nande soporte Verano2024");
    kernel.hosts.stopService("caja.interna.nande", "postgres");
    expect(term.execute("netmap")).toMatch(/caja\.interna\.nande\s+1 svc/);
    // nmap interno dice lo mismo que netmap (una sola verdad).
    expect(term.execute("nmap")).toContain("caja.interna.nande  (1 servicios)");
    kernel.hosts.setHostUp("caja.interna.nande", false);
    expect(term.execute("netmap")).toMatch(/caja\.interna\.nande\s+apagado/);
    // Un host apagado no responde al escaneo.
    expect(term.execute("nmap")).not.toContain("caja.interna.nande");
  });

  it("desde un host sin red interna lo dice, y al salir vuelve el mapa local", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const out = term.execute("netmap");
    expect(out).toContain("Mapa de red desde web01.nande");
    expect(out).toContain("no se ve ninguna red interna nueva");
    expect(out).not.toContain("caja.interna.nande");
    term.execute("exit");
    const local = term.execute("netmap");
    expect(local).toContain("=== Mapa de red - NANDE");
    expect(local).not.toContain("caja.interna.nande");
  });

  it("connect sigue la misma regla: el interno no se alcanza desde tu equipo", () => {
    expect(term.execute("connect caja.interna.nande admin GiraSol#2024")).toContain("no es alcanzable");
  });

  it("man netmap documenta el modo sesión remota", () => {
    const man = term.execute("man netmap");
    expect(man).toContain("sesión remota");
    expect(man).toContain("ruta de pivoting");
  });

  it("LAN interna crecida: segmentación y pivote multi-salto (una fuente de verdad)", () => {
    const h = kernel.hosts;
    // Los segmentos internos existen y están marcados como tales.
    const by = new Map(h.subnets().map((sn) => [sn.base, sn]));
    expect(by.get("10.10.66")?.internal).toBe(true);
    expect(by.get("10.10.99")?.internal).toBe(true);
    // La LAN corporativa (66) tiene ahora varios hosts, no uno solo.
    expect(by.get("10.10.66")?.hosts.map((x) => x.hostname).sort()).toEqual(
      ["caja.interna.nande", "nas.interna.nande"],
    );
    expect(by.get("10.10.99")?.hosts.map((x) => x.hostname)).toEqual(["db-core.interna.nande"]);

    // Regla de alcance = topología real (defensa en profundidad):
    // el jugador no llega a ningún host interno.
    for (const t of ["nas.interna.nande", "db-core.interna.nande"]) {
      expect(h.canReach(null, t)).toBe(false);
    }
    // El jump host ve toda la LAN corporativa; la caja ve a su par el NAS.
    expect(h.canReach("server.nande", "nas.interna.nande")).toBe(true);
    expect(h.canReach("caja.interna.nande", "nas.interna.nande")).toBe(true);
    // Pero el segmento restringido SÓLO se alcanza desde el NAS (un salto más).
    expect(h.canReach("server.nande", "db-core.interna.nande")).toBe(false);
    expect(h.canReach("caja.interna.nande", "db-core.interna.nande")).toBe(false);
    expect(h.canReach("nas.interna.nande", "db-core.interna.nande")).toBe(true);
  });

  it("los hosts internos nuevos NO se filtran al mapa del jugador (sin fakery)", () => {
    const out = term.execute("netmap");
    expect(out).not.toContain("nas.interna.nande");
    expect(out).not.toContain("db-core.interna.nande");
    expect(out).not.toContain("10.10.66");
    expect(out).not.toContain("10.10.99");
  });

  it("netmap context-aware: cada salto revela un mapa distinto de la LAN", () => {
    // Salto 1: desde el jump host se ve toda la LAN corporativa 10.10.66.0/24.
    term.execute("connect server.nande soporte Verano2024");
    const desdeServer = term.execute("netmap");
    expect(desdeServer).toContain("10.10.66.0/24  [interno]  (2 hosts)");
    expect(desdeServer).toContain("nas.interna.nande");
    expect(desdeServer).not.toContain("db-core.interna.nande"); // el 99 no se ve todavía

    // Salto 2: desde el NAS aparece el segmento restringido 10.10.99.0/24.
    term.execute("connect nas.interna.nande respaldo NasÑande#2024");
    const desdeNas = term.execute("netmap");
    expect(desdeNas).toContain("Mapa de red desde nas.interna.nande");
    expect(desdeNas).toContain("10.10.99.0/24  [interno]");
    expect(desdeNas).toContain("db-core.interna.nande");
    expect(desdeNas).toContain(
      "tu equipo (10.10.0.10) -> server.nande (10.10.0.42) [soporte] -> nas.interna.nande (10.10.66.20) [respaldo]",
    );
  });

  it("pivote multi-salto completo captura las dos banderas de la LAN (motor real)", () => {
    for (const step of [
      "connect server.nande soporte Verano2024",
      "connect nas.interna.nande respaldo NasÑande#2024",
      "cat /etc/backup/targets.conf",
      "connect db-core.interna.nande dbadmin Core-DB!2024",
      "cat /root/flag.txt",
    ]) {
      term.execute(step);
    }
    const flags = kernel.player.capturedFlags();
    expect(flags).toContain("ND{nas_backup_expuesto}");
    expect(flags).toContain("ND{segmento_restringido_ok}");
  });

  it("segmento OT/Planta: cuarto nivel de una red segmentada real (Purdue)", () => {
    const h = kernel.hosts;
    const by = new Map(h.subnets().map((sn) => [sn.base, sn]));
    // La red industrial existe y es interna (no se ve desde el jugador).
    expect(by.get("10.10.77")?.internal).toBe(true);
    expect(by.get("10.10.77")?.hosts.map((x) => x.hostname).sort()).toEqual(
      ["hmi.planta.nande", "plc.planta.nande"],
    );
    // Cadena de segmentación completa: cada capa sólo se alcanza desde la previa.
    expect(h.canReach(null, "hmi.planta.nande")).toBe(false);
    expect(h.canReach("db-core.interna.nande", "hmi.planta.nande")).toBe(true);
    // Rutas ALTERNATIVAS al PLC (regla 11): HMI y también el historian.
    expect(h.canReach("hmi.planta.nande", "plc.planta.nande")).toBe(true);
    expect(h.canReach("db-core.interna.nande", "plc.planta.nande")).toBe(true);
    // Pero NO desde la LAN corporativa ni desde el jugador (aislamiento OT).
    expect(h.canReach("caja.interna.nande", "plc.planta.nande")).toBe(false);
    expect(h.canReach(null, "plc.planta.nande")).toBe(false);
  });

  it("los hosts OT no se filtran al mapa del jugador (sin fakery)", () => {
    const out = term.execute("netmap");
    expect(out).not.toContain("planta.nande");
    expect(out).not.toContain("10.10.77");
  });

  it("netmap context-aware: el historian revela la red OT; la HMI, el PLC", () => {
    for (const step of [
      "connect server.nande soporte Verano2024",
      "connect nas.interna.nande respaldo NasÑande#2024",
      "connect db-core.interna.nande dbadmin Core-DB!2024",
    ]) {
      term.execute(step);
    }
    // Desde el historian (doble-homed) se ve toda la red de planta.
    const desdeDb = term.execute("netmap");
    expect(desdeDb).toContain("10.10.77.0/24  [interno]  (2 hosts)");
    expect(desdeDb).toContain("hmi.planta.nande");
    expect(desdeDb).toContain("plc.planta.nande");
    // Desde la HMI queda a la vista el PLC.
    term.execute("connect hmi.planta.nande operador Planta#2024");
    const desdeHmi = term.execute("netmap");
    expect(desdeHmi).toContain("Mapa de red desde hmi.planta.nande");
    expect(desdeHmi).toContain("plc.planta.nande");
    expect(desdeHmi).toContain(
      "-> db-core.interna.nande (10.10.99.10) [dbadmin] -> hmi.planta.nande (10.10.77.10) [operador]",
    );
  });

  it("dos rutas distintas al PLC capturan la misma bandera (red real, regla 11)", () => {
    const solveViaHmi = () => {
      const t = new VirtualTerminal(kernel);
      for (const step of [
        "connect server.nande soporte Verano2024",
        "connect nas.interna.nande respaldo NasÑande#2024",
        "connect db-core.interna.nande dbadmin Core-DB!2024",
        "connect hmi.planta.nande operador Planta#2024",
        "connect plc.planta.nande ingenieria PlcÑande!2024",
        "cat /root/flag.txt",
      ]) t.execute(step);
    };
    const solveDirecto = () => {
      const t = new VirtualTerminal(kernel);
      for (const step of [
        "connect server.nande soporte Verano2024",
        "connect nas.interna.nande respaldo NasÑande#2024",
        "connect db-core.interna.nande dbadmin Core-DB!2024",
        "connect plc.planta.nande ingenieria PlcÑande!2024", // ruta directa historian→PLC
        "cat /root/flag.txt",
      ]) t.execute(step);
    };
    solveViaHmi();
    expect(kernel.player.capturedFlags()).toContain("ND{ot_plc_control}");
    // La segunda ruta también resuelve (no depende de haber pasado por la HMI).
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    solveDirecto();
    expect(kernel.player.capturedFlags()).toContain("ND{ot_plc_control}");
  });

  it("pivotar a un host interno enciende Movimiento Lateral en el SOC/MITRE (coherencia)", () => {
    // Entrar desde tu equipo NO es movimiento lateral (acceso inicial).
    term.execute("connect server.nande soporte Verano2024");
    expect(kernel.mitre.recent(20).some((d) => d.mitreId === "T1021")).toBe(false);
    // Pivotar de un host comprometido a otro SÍ lo es: enciende la detección.
    term.execute("connect caja.interna.nande admin GiraSol#2024");
    const lateral = kernel.mitre.recent(20).find((d) => d.mitreId === "T1021");
    expect(lateral, "el pivote debería encender Movimiento Lateral").toBeTruthy();
    expect(lateral!.tactic).toBe("Lateral Movement");
    expect(lateral!.host).toBe("caja.interna.nande");
    expect(lateral!.detail).toContain("server.nande");
  });

  it("recolectar la bandera de un host comprometido enciende Collection (T1005)", () => {
    term.execute("connect server.nande soporte Verano2024");
    term.execute("connect caja.interna.nande admin GiraSol#2024");
    // Antes de leer el loot no hay Collection.
    expect(kernel.mitre.recent(30).some((d) => d.mitreId === "T1005")).toBe(false);
    // Leer la bandera = recolección/exfiltración: enciende la técnica.
    term.execute("cat /root/flag.txt");
    const col = kernel.mitre.recent(30).find((d) => d.mitreId === "T1005");
    expect(col, "leer el loot debería encender Collection").toBeTruthy();
    expect(col!.tactic).toBe("Collection");
    expect(col!.host).toBe("caja.interna.nande");
    // Re-leer no duplica la técnica (dedupe por bandera).
    term.execute("cat /root/flag.txt");
    expect(kernel.mitre.recent(30).filter((d) => d.mitreId === "T1005").length).toBe(1);
  });

  it("escanear la red interna desde un host comprometido enciende Discovery (T1046)", () => {
    term.execute("connect server.nande soporte Verano2024");
    // Antes de escanear no hay Discovery.
    expect(kernel.mitre.recent(30).some((d) => d.mitreId === "T1046")).toBe(false);
    // nmap interno revela la red → enciende Descubrimiento.
    term.execute("nmap");
    const disc = kernel.mitre.recent(30).find((d) => d.mitreId === "T1046");
    expect(disc, "el nmap interno debería encender Discovery").toBeTruthy();
    expect(disc!.tactic).toBe("Discovery");
    expect(disc!.host).toBe("server.nande");
    // Re-escanear desde el mismo host no duplica (dedupe por origen).
    term.execute("nmap");
    expect(kernel.mitre.recent(30).filter((d) => d.mitreId === "T1046").length).toBe(1);
  });

  it("killchain muestra tu cadena en orden de kill-chain, desde detecciones reales", () => {
    // Sin nada ejecutado, no hay cadena.
    expect(term.execute("killchain")).toContain("todavía no se detectó");
    // Ejecutá la cadena de post-explotación.
    term.execute("connect server.nande soporte Verano2024");
    term.execute("nmap");                                        // Discovery T1046
    term.execute("connect caja.interna.nande admin GiraSol#2024"); // Lateral T1021
    term.execute("cat /root/flag.txt");                          // Collection T1005
    const kc = term.execute("killchain");
    expect(kc).toContain("Fases alcanzadas: 3/13");
    // Las tres fases marcadas, con sus técnicas.
    expect(kc).toMatch(/✔ Descubrimiento[\s\S]*T1046/);
    expect(kc).toMatch(/✔ Movimiento lateral[\s\S]*T1021/);
    expect(kc).toMatch(/✔ Recolección[\s\S]*T1005/);
    // El orden de kill-chain: Descubrimiento antes que Movimiento lateral antes que Recolección.
    expect(kc.indexOf("Descubrimiento")).toBeLessThan(kc.indexOf("Movimiento lateral"));
    expect(kc.indexOf("Movimiento lateral")).toBeLessThan(kc.indexOf("Recolección"));
  });
});
