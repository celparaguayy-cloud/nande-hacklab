import { describe, expect, it, beforeEach } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Regresión de descubribilidad: al ENTRAR a un laboratorio (su página "/"),
 * el jugador tiene que ver de una qué se busca ahí. Antes, tools.pyta y
 * preview.vortex solo mostraban la pista DESPUÉS de enviar el formulario, así
 * que la web parecía "no hackeable". Este test exige que cada laboratorio diga
 * su objetivo/pista ya en la portada.
 */
const LABS = [
  "banco.nande", "blog.yvoty.nande", "fotos.arandu.nande", "docs.tape.nande",
  "tools.pyta.nande", "preview.vortex.nande", "api.vortex.nande", "link.gulu.nande",
  "m.banco-justicia.nande", "portal.nova.nande", "files.bytebox.nande",
  "cuenta.redix.nande", "saludos.codea.nande", "import.nova.nande",
  "login.redix.nande", "cupones.gulu.nande", "soc.nande", "blackbox.nande",
  "ti.nande", "cloud.nande", "ci.nande", "agente.nande", "purple.nande",
];

// Señales de que la portada orienta: una pista explícita, el objetivo, o la
// tarea/consigna del panel defensivo.
const GUIA = /pista|objetivo|probá|proba|tu trabajo|tu tarea|consigna|reconstru|reto|desafí/i;

describe("cada laboratorio orienta desde su portada", () => {
  let k: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
  });

  it.each(LABS)("%s muestra qué hacer al entrar", (host) => {
    const { response } = k.browser.request("GET", host, "/");
    expect(response.status).toBeLessThan(400);
    const texto = response.body.replace(/<[^>]+>/g, " ");
    expect(texto).toMatch(GUIA);
  });
});
