import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * tcpdump / tshark — pruebas de REALIDAD. El sniffer (NandeShark) NO inventa
 * paquetes: sólo ve el tráfico que el mundo generó de verdad. tcpdump habla
 * BPF (filtro de captura); tshark habla filtros de DISPLAY (lenguaje Wireshark)
 * y estadísticas. Todo 100% offline, sobre el mismo motor HTTP/AUTH del juego.
 */
describe("tcpdump / tshark — análisis de tráfico real y offline", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("tcpdump contra un host de laboratorio con texto plano captura la bandera", () => {
    const out = term.execute("tcpdump 10.10.5.20"); // netlab01: ftp/telnet/http
    expect(out).toContain("ND{sniff_credenciales}");
    // La bandera queda REGISTRADA en el jugador (no es sólo texto en pantalla).
    expect(kernel.player.capturedFlags()).toContain("ND{sniff_credenciales}");
  });

  it("tcpdump -A con filtro BPF muestra el POST REAL en el cable, con la fuga", () => {
    // Generamos tráfico real: un login por HTTP manda la clave en claro.
    term.execute('curl -X POST http://banco.nande/login -d "usuario=admin&password=girasol77"');
    const out = term.execute("tcpdump -A host banco.nande");
    expect(out).toContain("banco.nande"); // el filtro BPF host acotó al banco
    expect(out).toContain("password=girasol77"); // -A vuelca el cuerpo tal cual viajó
    expect(out).toContain("🔓"); // marcado como credencial en claro
  });

  it("tcpdump NO inventa: sin tráfico previo, 0 paquetes (sólo ve lo real)", () => {
    const out = term.execute("tcpdump host inexistente.nande");
    expect(out).toMatch(/0 paquetes/i);
    expect(out).not.toContain("🔓");
  });

  it("tcpdump -c limita la cantidad de paquetes mostrados", () => {
    term.execute('curl http://banco.nande/');
    term.execute('curl http://banco.nande/login');
    term.execute('curl http://tienda.nande/');
    const out = term.execute("tcpdump -c 1 tcp");
    expect(out).toMatch(/1 paquete/);
  });

  it("tshark -Y filtra por el lenguaje de DISPLAY (distinto del BPF)", () => {
    term.execute('curl -X POST http://banco.nande/login -d "usuario=admin&password=x"');
    term.execute('curl http://banco.nande/'); // un GET que NO debe matchear el POST
    const out = term.execute('tshark -Y "http.request.method==POST"');
    expect(out).toContain("banco.nande");
    expect(out).toMatch(/1 paquete|que matchean/);
  });

  it("tshark -Y ip.addr== filtra por dirección (campo de display)", () => {
    term.execute('curl http://banco.nande/');
    const out = term.execute('tshark -Y "ip.addr==10.10.0.5"'); // IP del jugador
    expect(out).toContain("10.10.0.5");
  });

  it("tshark rechaza un filtro de display inválido (barra roja)", () => {
    term.execute('curl http://banco.nande/');
    const out = term.execute('tshark -Y "http.request.method====POST"');
    expect(out).toMatch(/inválido/i);
  });

  it("tshark -z io,phs da la jerarquía de protocolos (Statistics)", () => {
    term.execute('curl http://banco.nande/login');
    const out = term.execute("tshark -z io,phs");
    expect(out).toContain("Protocol Hierarchy");
    expect(out).toContain("HTTP");
  });

  it("tshark -z conv lista las conversaciones entre extremos", () => {
    term.execute('curl http://banco.nande/');
    const out = term.execute("tshark -z conv");
    expect(out).toContain("Conversations");
    expect(out).toMatch(/↔/);
    expect(out).toMatch(/pkts/);
  });
});
