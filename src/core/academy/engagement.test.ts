import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Anti-mock del ENGAGEMENT web: la auditoría guiada de punta a punta tiene que
 * ser completable de verdad contra el motor. Conducimos la terminal por cada
 * etapa —comandos reales y respuestas ('responder ...') a las preguntas de
 * interpretación— y exigimos que la lección se complete y que caigan las dos
 * banderas web. Si algún paso deja de validar, este test lo caza.
 */
describe("Engagement web — auditá el banco de punta a punta", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("l-eng-web se completa siguiendo la metodología real", () => {
    // Secuencia: comando de acción o 'responder <x>' en los pasos de pregunta.
    const flow = [
      "learn l-eng-web",
      "nmap -sV banco.nande",
      "responder 80",
      "gobuster dir -u http://banco.nande -w comun",
      "responder /login",
      "curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\"",
      "responder admin",
      "curl \"http://banco.nande/movimientos?q=a%' UNION SELECT id,usuario,password,rol FROM usuarios--\"",
      "responder M8arete-2024!",
      "responder preparadas",
    ];

    let last = "";
    for (const cmd of flow) last = term.execute(cmd);

    // La última respuesta cierra la lección.
    expect(last, "el último paso debería cerrar la lección").toMatch(/Lección completada/i);
    expect(kernel.player.completedCourses()).toContain("lesson:l-eng-web");
    // Y por el camino capturó las dos banderas web, de verdad.
    const flags = kernel.player.capturedFlags();
    expect(flags).toContain("ND{sqli_login_bypass}");
    expect(flags).toContain("ND{sqli_union_dump}");
  });

  it("l-eng-host se completa: recon → fuerza bruta → acceso → pivot → botín", () => {
    const flow = [
      "learn l-eng-host",
      "nmap -sV server.nande",
      "responder 22",
      "hydra ssh://server.nande",
      "responder Verano2024",
      "connect server.nande soporte Verano2024",
      "cat /home/soporte/notas.txt",
      "responder caja.interna.nande",
      "connect caja.interna.nande admin GiraSol#2024",
      "cat /root/flag.txt",
      "responder intentos",
    ];
    let last = "";
    for (const cmd of flow) last = term.execute(cmd);
    expect(last, "el último paso debería cerrar la lección").toMatch(/Lección completada/i);
    expect(kernel.player.completedCourses()).toContain("lesson:l-eng-host");
    const flags = kernel.player.capturedFlags();
    expect(flags).toContain("ND{ssh_fuerza_bruta}");
    expect(flags).toContain("ND{pivoting_red_interna}");
  });

  it("l-eng-blue se completa: logs → triage → SIEM → DFIR → informe", () => {
    const flow = [
      "learn l-eng-blue",
      "curl http://soc.nande/logs",
      "responder 10.10.66.13",
      "curl http://soc.nande/triage?id=A3",
      "responder incidente",
      "curl http://soc.nande/siem?q=10.10.66.13",
      "responder sql",
      "curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
      "curl \"http://soc.nande/reportar?ip=10.10.66.13&tecnica=sql\"",
      "responder preparadas",
    ];
    let last = "";
    for (const cmd of flow) last = term.execute(cmd);
    expect(last, "el último paso debería cerrar la lección").toMatch(/Lección completada/i);
    expect(kernel.player.completedCourses()).toContain("lesson:l-eng-blue");
    const flags = kernel.player.capturedFlags();
    for (const f of ["ND{soc_triage}", "ND{siem_correlacion}", "ND{dfir_timeline}", "ND{forense_intrusion}"]) {
      expect(flags, `falta ${f}`).toContain(f);
    }
  });

  it("no avanza si respondés cualquier cosa a una pregunta", () => {
    term.execute("learn l-eng-web");
    term.execute("nmap -sV banco.nande");
    const bad = term.execute("responder cualquiercosa");
    expect(bad).toMatch(/No es esa|Volvé a leer/i);
    // Sigue en el paso de la pregunta (no se completó).
    expect(kernel.player.completedCourses()).not.toContain("lesson:l-eng-web");
  });
});
