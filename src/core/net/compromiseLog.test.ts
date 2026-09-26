import { beforeEach, describe, expect, it } from "vitest";
import { CompromiseLog } from "./CompromiseLog";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * CompromiseLog — fuente ÚNICA de verdad de los hosts que comprometió el
 * jugador (regla 2). Anti-mock: la parte de integración maneja el MOTOR real
 * (connect/pivot/escalada/loot por el terminal) y verifica que el registro sale
 * de acciones reales, no de una lista paralela. Cubre además que persiste al
 * salir de la sesión y que netmap/botin lo reflejan (regla 5/12/15).
 */
describe("CompromiseLog — registro central de compromisos", () => {
  describe("unidad", () => {
    let log: CompromiseLog;
    let tick = 0;
    beforeEach(() => {
      tick = 0;
      log = new CompromiseLog(() => tick);
    });

    it("registra un host nuevo y no duplica al re-registrarlo", () => {
      log.record({ hostname: "a.nande", ip: "10.0.0.1", os: "linux", user: "ana", level: "user", via: null });
      tick = 5;
      log.record({ hostname: "A.nande", ip: "10.0.0.1", os: "linux", user: "ana", level: "user", via: "jump" });
      expect(log.count()).toBe(1); // case-insensitive, misma entrada
      const c = log.get("a.nande")!;
      expect(c.firstTick).toBe(0);
      expect(c.lastTick).toBe(5);
      expect(c.via).toBe("jump"); // se actualiza la ruta más reciente
    });

    it("sube a root pero nunca baja de nivel", () => {
      log.record({ hostname: "a.nande", ip: "10.0.0.1", os: "linux", user: "ana", level: "user", via: null });
      expect(log.rootCount()).toBe(0);
      expect(log.upgradeToRoot("a.nande")).toBe(true);
      expect(log.get("a.nande")!.level).toBe("root");
      // Un re-registro como "user" no debe degradar el root ya logrado.
      log.record({ hostname: "a.nande", ip: "10.0.0.1", os: "linux", user: "ana", level: "user", via: null });
      expect(log.get("a.nande")!.level).toBe("root");
      expect(log.rootCount()).toBe(1);
    });

    it("acumula botín sin duplicar", () => {
      log.record({ hostname: "a.nande", ip: "10.0.0.1", os: "linux", user: "ana", level: "user", via: null });
      expect(log.addLoot("a.nande", "ND{uno}")).toBe(true);
      expect(log.addLoot("a.nande", "ND{uno}")).toBe(false); // dedup
      expect(log.addLoot("a.nande", "ND{dos}")).toBe(true);
      expect(log.get("a.nande")!.loot).toEqual(["ND{uno}", "ND{dos}"]);
      expect(log.lootCount()).toBe(2);
      expect(log.addLoot("inexistente", "ND{x}")).toBe(false);
    });
  });

  describe("integración con el motor real (terminal)", () => {
    let kernel: VirtualKernel;
    let term: VirtualTerminal;
    beforeEach(() => {
      resetStorage();
      seedRandom();
      kernel = new VirtualKernel();
      term = new VirtualTerminal(kernel);
    });

    it("arranca vacío: nada comprometido hasta actuar de verdad", () => {
      expect(kernel.compromises.count()).toBe(0);
      expect(term.execute("botin")).toContain("todavía no comprometiste");
    });

    it("connect y pivote registran el compromiso REAL con su ruta, y persiste al salir", () => {
      // Entrada pública: tomamos server.nande.
      expect(term.execute("connect server.nande soporte Verano2024")).toContain("conectado");
      expect(kernel.compromises.has("server.nande")).toBe(true);
      const server = kernel.compromises.get("server.nande")!;
      expect(server.via).toBeNull(); // desde tu equipo
      expect(server.level).toBe("user");

      // Pivote a un host interno de la LAN corporativa.
      expect(term.execute("connect caja.interna.nande admin GiraSol#2024")).toContain("conectado");
      const caja = kernel.compromises.get("caja.interna.nande")!;
      expect(caja.via).toBe("server.nande"); // ruta de pivoting real

      // Loot: leer la bandera de /root la registra en el host.
      term.execute("cat /root/flag.txt");
      expect(kernel.compromises.get("caja.interna.nande")!.loot).toContain("ND{pivoting_red_interna}");

      // Salir de la sesión NO borra el compromiso (persiste como estado del mundo).
      term.execute("exit");
      term.execute("exit");
      expect(kernel.compromises.count()).toBe(2);
      expect(kernel.compromises.has("caja.interna.nande")).toBe(true);
    });

    it("la escalada a root de verdad sube el nivel en el registro", () => {
      expect(term.execute("connect web01.nande devops Delfin2024")).toContain("conectado");
      expect(kernel.compromises.get("web01.nande")!.level).toBe("user");
      // Escape GTFOBins real: find -exec /bin/sh.
      const out = term.execute("sudo find . -exec /bin/sh ;");
      expect(out.toLowerCase()).toContain("root");
      expect(kernel.compromises.get("web01.nande")!.level).toBe("root");
      expect(kernel.compromises.rootCount()).toBe(1);
    });

    it("netmap y botin reflejan la MISMA realidad (el host tomado sale marcado)", () => {
      term.execute("connect server.nande soporte Verano2024");
      term.execute("exit");
      // netmap (desde tu equipo) marca server.nande como tuyo.
      const mapa = term.execute("netmap");
      expect(mapa).toContain("server.nande");
      expect(mapa).toContain("⊙ tuyo");
      // botin lo lista con su nivel.
      const botin = term.execute("botin");
      expect(botin).toContain("server.nande");
      expect(botin).toContain("1 host");
      expect(term.execute("man botin")).toContain("hosts comprometidos");
    });
  });
});
