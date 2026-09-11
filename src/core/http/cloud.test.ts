import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Nube ficticia: cloud/IAM/contenedores (tanda 15)", () => {
  const host = "cloud.nande";
  it("el bucket público expone secretos; el privado da 403", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    expect(k.browser.isWebApp(host)).toBe(true);
    expect(k.browser.request("GET", host, "/buckets/nimbus-backups").response.body).toContain("ND{cloud_bucket_publico}");
    expect(k.browser.request("GET", host, "/buckets/nimbus-privado").response.status).toBe(403);
  });
  it("asumir el rol IAM permisivo escala; el de solo lectura no", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    expect(k.browser.request("GET", host, "/iam/asumir?rol=deploy-bot").response.body).toContain("ND{iam_permisivo}");
    expect(k.browser.request("GET", host, "/iam/asumir?rol=lector-reportes").response.body).not.toContain("ND{iam_permisivo}");
  });
  it("el contenedor privilegiado filtra; el estándar no", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    expect(k.browser.request("GET", host, "/contenedores/job-07").response.body).toContain("ND{contenedor_inseguro}");
    expect(k.browser.request("GET", host, "/contenedores/web-01").response.body).not.toContain("ND{contenedor_inseguro}");
  });
});
