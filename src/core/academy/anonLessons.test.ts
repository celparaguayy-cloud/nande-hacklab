import { beforeEach, describe, expect, it } from "vitest";
import { LESSONS } from "./Lessons";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

function lesson(id: string) {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`falta la lección ${id}`);
  return l;
}

describe("Anonimato / OPSEC — comandos reales y lecciones completables", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("macchanger cambia la MAC de verdad en la red", () => {
    const antes = kernel.network.getInterface("wlan0")!.mac;
    const out = term.execute("macchanger wlan0 random");
    expect(out).toContain("cambiada");
    expect(kernel.network.getInterface("wlan0")!.mac).not.toBe(antes);
  });

  it("anon on cambia la IP visible (nodo de salida)", () => {
    expect(kernel.anonymity.isTorEnabled()).toBe(false);
    term.execute("anon on");
    expect(kernel.anonymity.isTorEnabled()).toBe(true);
    expect(term.execute("identidad")).toContain("por la red de anonimato");
  });

  it("l-anonimato: cada paso pasa su check con salida real", () => {
    const steps = lesson("l-anonimato").steps;
    const cmds = ["identidad", "macchanger wlan0 random", "anon on", "identidad"];
    cmds.forEach((cmd, i) => {
      const out = term.execute(cmd);
      expect(steps[i].check(cmd, out), `paso ${i}: ${cmd}`).toBe(true);
    });
  });

  it("l-opsec: exiftool delata y luego limpia", () => {
    const steps = lesson("l-opsec").steps;
    const reveal = term.execute("exiftool foto.jpg");
    expect(steps[0].check("exiftool foto.jpg", reveal)).toBe(true);
    expect(reveal).toContain("GPS");

    const clean = term.execute("exiftool -all= foto.jpg");
    expect(steps[1].check("exiftool -all= foto.jpg", clean)).toBe(true);
  });

  it("l-cripto: identificar y romper un hash débil", () => {
    const steps = lesson("l-cripto").steps;
    const c1 = "hashid 5f4dcc3b5aa765d61d8327deb882cf99";
    const c2 = "crack 5f4dcc3b5aa765d61d8327deb882cf99";
    expect(steps[0].check(c1, term.execute(c1))).toBe(true);
    expect(steps[1].check(c2, term.execute(c2))).toBe(true);
  });

  it("l-osint: whois y sherlock reúnen rastro público", () => {
    const steps = lesson("l-osint").steps;
    expect(steps[0].check("whois banco.nande", term.execute("whois banco.nande"))).toBe(true);
    expect(steps[1].check("sherlock kamba", term.execute("sherlock kamba"))).toBe(true);
  });

  it("l-wifi: la cadena real airmon → deauth → aircrack crackea un WPA2 débil", () => {
    const steps = lesson("l-wifi").steps;
    expect(steps[0].check("wifi scan", term.execute("wifi scan"))).toBe(true);
    const s1 = "airmon-ng start wlan0";
    expect(steps[1].check(s1, term.execute(s1))).toBe(true);
    const s2 = "aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon";
    expect(steps[2].check(s2, term.execute(s2))).toBe(true);
    const s3 = "aircrack-ng -w rockyou.txt Vecino-2G";
    expect(steps[3].check(s3, term.execute(s3))).toBe(true);
  });

  it("l-reversing: strings encuentra una credencial quemada", () => {
    const steps = lesson("l-reversing").steps;
    const out = term.execute("strings /var/www/config.php");
    expect(steps[0].check("strings /var/www/config.php", out)).toBe(true);
  });

  it("l-blueteam: una acción genera una alerta que el SOC muestra", () => {
    const steps = lesson("l-blueteam").steps;
    const c1 = "service-stop nginx server.nande";
    expect(steps[0].check(c1, term.execute(c1))).toBe(true);
    const c2 = "soc alerts";
    expect(steps[1].check(c2, term.execute(c2))).toBe(true);
  });

  it("l-cloud / l-devsecops / l-threatintel: labs vía curl dan su bandera", () => {
    const cloud = "curl http://cloud.nande/buckets/nimbus-backups";
    expect(lesson("l-cloud").steps[0].check(cloud, term.execute(cloud))).toBe(true);

    const dev = "curl http://ci.nande/repo/commit/4d5e6f";
    expect(lesson("l-devsecops").steps[0].check(dev, term.execute(dev))).toBe(true);

    const ti = 'curl "http://ti.nande/atribuir?ioc=nande_lock&actor=gris"';
    expect(lesson("l-threatintel").steps[0].check(ti, term.execute(ti))).toBe(true);
  });

  it("l-phishing: phish-analyzer reconoce el engaño", () => {
    const c = "phish-analyzer correo-01";
    expect(lesson("l-phishing").steps[0].check(c, term.execute(c))).toBe(true);
  });
});
