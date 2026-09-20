import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * wget / clonador de sitios — pruebas de REALIDAD. Clona sitios VIRTUALES al
 * filesystem para recon offline. Golpea el mismo servidor que el navegador
 * (nada pre-calculado) y NUNCA toca internet real (100% offline).
 */
describe("wget — clonar sitios del mundo virtual para recon offline", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("descarga una página y la guarda en ./<host>/", () => {
    const out = term.execute("wget http://banco.nande/login");
    expect(out).toContain("HTTP 200");
    expect(out).toContain("./banco.nande/login.html");
    // El archivo existe DE VERDAD en el filesystem y guarda el HTML crudo.
    expect(kernel.filesystem.exists("/home/student/banco.nande/login.html")).toBe(true);
    const html = kernel.filesystem.readFile("/home/student/banco.nande/login.html");
    expect(html).toMatch(/<form|<input|<html|<!DOCTYPE/i); // HTML crudo, no texto pelado
  });

  it("recursivo: sigue los links del HTML del mismo host (wget -r)", () => {
    // Sesión real (bypass) → el área privada del banco tiene links internos.
    term.execute("curl -X POST http://banco.nande/login -d \"usuario=admin' -- &password=x\"");
    const out = term.execute("wget -r http://banco.nande/panel");
    // Siguió panel → movimientos → logout (varias páginas, no una sola).
    expect(out).toContain("/panel");
    expect(out).toContain("/movimientos");
    expect(kernel.filesystem.exists("/home/student/banco.nande/panel.html")).toBe(true);
    expect(kernel.filesystem.exists("/home/student/banco.nande/movimientos.html")).toBe(true);
    // Reporta un total (más de un archivo).
    expect(out).toMatch(/Descargado: [2-9]\d* archivo/);
  });

  it("el HTML clonado se puede analizar offline (grep encuentra los href)", () => {
    term.execute("curl -X POST http://banco.nande/login -d \"usuario=admin' -- &password=x\"");
    term.execute("wget -r http://banco.nande/panel");
    const grep = term.execute('cat banco.nande/panel.html | grep href');
    expect(grep).toContain("href"); // los links quedaron guardados para el recon
  });

  it("NO clona internet real: sólo el mundo virtual (100% offline)", () => {
    const out = term.execute("wget -r http://google.com");
    expect(out).toMatch(/offline|no se pudo resolver/i);
    // No creó nada: internet real no existe en el laboratorio.
    expect(kernel.filesystem.exists("/home/student/google.com")).toBe(false);
  });

  it("pide una URL si no se la das", () => {
    expect(term.execute("wget")).toContain("falta la URL");
  });
});
