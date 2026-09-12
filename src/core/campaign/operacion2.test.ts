import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { CHAPTERS } from "./Campaign";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Operación 2 · Nimbus — capítulos nuevos completables", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("la campaña ahora tiene 12 capítulos e incluye Nimbus", () => {
    expect(CHAPTERS.length).toBe(12);
    expect(CHAPTERS.some((c) => c.title.includes("Nimbus"))).toBe(true);
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // ids únicos
  });

  it("los objetivos de Nimbus se capturan vulnerando labs reales (curl)", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    // Cada bandera de Operación 2 se obtiene atacando un lab de verdad.
    term.execute("curl http://ci.nande/repo/commit/4d5e6f");
    term.execute("curl http://cloud.nande/buckets/nimbus-backups");
    term.execute('curl "http://cloud.nande/iam/asumir?rol=deploy-bot"');
    term.execute("curl http://cloud.nande/contenedores/job-07");

    const flags = kernel.player.capturedFlags();
    for (const f of [
      "ND{devsecops_secreto_filtrado}",
      "ND{cloud_bucket_publico}",
      "ND{iam_permisivo}",
      "ND{contenedor_inseguro}",
    ]) {
      expect(flags, f).toContain(f);
    }
  });

  it("migración: un jugador que terminó Génesis (8 caps) reabre en Nimbus", () => {
    // Simula un guardado viejo: terminó el capítulo 8 (índice 7).
    localStorage.setItem(
      "nande-campaign",
      JSON.stringify({ current: 7, done: [], finished: true }),
    );
    const kernel = new VirtualKernel();
    const st = kernel.campaign.getState();
    expect(st.finished).toBe(false);
    expect(st.current).toBe(8); // c9 · primer capítulo de Nimbus
  });
});
