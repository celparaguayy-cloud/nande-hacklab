import { describe, expect, it, beforeEach } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Regresión: cada laboratorio CARGA y renderiza una portada con contenido real
 * (no está roto ni en blanco). Ya NO exigimos que muestre pistas: por pedido
 * del usuario, los laboratorios no dan pistas de cómo resolverlos — la única
 * ayuda es La Mani. Acá sólo garantizamos que la web sea navegable.
 */
const LABS = [
  "banco.nande", "blog.yvoty.nande", "fotos.arandu.nande", "docs.tape.nande",
  "tools.pyta.nande", "preview.vortex.nande", "api.vortex.nande", "link.gulu.nande",
  "m.banco-justicia.nande", "portal.nova.nande", "files.bytebox.nande",
  "cuenta.redix.nande", "saludos.codea.nande", "import.nova.nande",
  "login.redix.nande", "cupones.gulu.nande", "soc.nande", "blackbox.nande",
  "ti.nande", "cloud.nande", "ci.nande", "agente.nande", "purple.nande",
];

describe("cada laboratorio carga y no está roto", () => {
  let k: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
  });

  it.each(LABS)("%s renderiza su portada con contenido", (host) => {
    const { response } = k.browser.request("GET", host, "/");
    expect(response.status).toBeLessThan(400);
    const texto = response.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // Contenido real (no una página vacía o rota).
    expect(texto.length).toBeGreaterThan(40);
  });

  it.each(LABS)("%s ya no muestra 'Pista:' en la portada", (host) => {
    const { response } = k.browser.request("GET", host, "/");
    expect(response.body).not.toContain('class="lab-hint"');
  });
});
