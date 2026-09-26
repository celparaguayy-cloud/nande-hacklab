import { beforeEach, describe, expect, it } from "vitest";
import { LESSONS } from "./Lessons";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Anti-mock: las lecciones nuevas del mega update tienen que ser COMPLETABLES
 * con la salida real de la terminal, no sólo estar bien escritas. Ejecutamos
 * el comando de cada paso y comprobamos que su `check` da true.
 */
function lesson(id: string) {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`falta la lección ${id}`);
  return l;
}

describe("Lecciones nuevas — completables con salida real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("l-servicios: cada paso pasa su check", () => {
    const steps = lesson("l-servicios").steps;
    const cmds = ["services server.nande", "service-stop nginx server.nande", "curl http://server.nande"];
    cmds.forEach((cmd, i) => {
      const out = term.execute(cmd);
      expect(steps[i].check!(cmd, out), `paso ${i}: ${cmd}`).toBe(true);
    });
  });

  it("l-codigo: crear, instalar y correr una tool pasa cada check", () => {
    const steps = lesson("l-codigo").steps;
    const cmds = ["code new mi-scanner", "tool-install mi-scanner", "run mi-scanner server.nande"];
    cmds.forEach((cmd, i) => {
      const out = term.execute(cmd);
      expect(steps[i].check!(cmd, out), `paso ${i}: ${cmd}`).toBe(true);
    });
  });

  it("l-pivoting: conectar, escanear interno y leer la bandera pasa cada check", () => {
    const steps = lesson("l-pivoting").steps;

    const o0 = term.execute("connect server.nande soporte Verano2024");
    expect(steps[0].check!("connect server.nande soporte Verano2024", o0)).toBe(true);

    const o1 = term.execute("nmap");
    expect(steps[1].check!("nmap", o1)).toBe(true);

    term.execute("connect caja.interna.nande admin GiraSol#2024");
    const o2 = term.execute("cat /root/flag.txt");
    expect(steps[2].check!("cat /root/flag.txt", o2)).toBe(true);
  });

  it("l-yvytu: la cadena capstone completa pasa cada check (paso a paso, motor real)", () => {
    const steps = lesson("l-yvytu").steps;
    const cmds = [
      "connect deploy.yvytu.nande ci Deploy2024",
      "cat /home/ci/user.txt",
      "sudo -l",
      "sudo awk 'BEGIN{system(\"/bin/sh\")}'",
      "cat /root/deploy.env",
      "connect artefactos.yvytu.nande deployer Art3f@cts!2024",
      "cat /root/flag.txt",
    ];
    expect(cmds.length).toBe(steps.length);
    cmds.forEach((cmd, i) => {
      const out = term.execute(cmd);
      expect(steps[i].check!(cmd, out), `paso ${i}: ${cmd}`).toBe(true);
    });
  });
});
