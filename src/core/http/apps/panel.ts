import {
  html,
  redirect,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * panel.nande — un servicio web LEGÍTIMO (no un laboratorio vulnerable): un
 * panel de control con login, sesión por cookie y un tablero detrás del
 * acceso. Existe para que la Internet virtual tenga sitios "de verdad", con
 * backend, autenticación y estado — no solo blancos para hackear.
 *
 * Credenciales de demo (se muestran en la portada): operador / nande2024.
 */
export class ControlPanelApp implements WebApp {
  readonly hostname = "panel.nande";
  readonly title = "ÑANDE Panel";
  readonly description = "Panel de control con login y sesión (servicio real).";
  readonly kind = "panel" as const;

  private authed(req: HttpRequest): boolean {
    return req.cookies.panel_sesion === "ok";
  }

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/logout") {
      return { ...redirect("/"), setCookies: { panel_sesion: "" } };
    }

    if (req.path === "/login") {
      const usuario = (req.body.usuario ?? req.query.usuario ?? "").trim();
      const password = (req.body.password ?? req.query.password ?? "").trim();
      if (usuario === "operador" && password === "nande2024") {
        return { ...redirect("/dashboard"), setCookies: { panel_sesion: "ok" } };
      }
      return html(page(this.title, notice("Usuario o clave incorrectos.", "err") + this.loginForm()));
    }

    if (req.path === "/dashboard") {
      if (!this.authed(req)) return redirect("/");
      return html(page(this.title, this.dashboard()));
    }

    // Portada.
    if (this.authed(req)) return redirect("/dashboard");
    return html(page(this.title, this.loginForm()));
  }

  private loginForm(): string {
    return `
<p>Ingresá al panel de control.</p>
<form method="POST" action="/login">
  ${field("Usuario", "usuario", "text", "")}
  ${field("Clave", "password", "password", "")}
  <button type="submit">Entrar</button>
</form>
<p class="site-foot">Demo: <code>operador</code> / <code>nande2024</code></p>`;
  }

  private dashboard(): string {
    return `
${notice("Sesión iniciada. Bienvenido, operador.", "ok")}
<h2>Tablero</h2>
<ul>
  <li>Servicios monitoreados: 6 activos</li>
  <li>Alertas abiertas: 0</li>
  <li>Última copia de seguridad: hoy</li>
</ul>
<p>Este es un servicio real del mundo: te dejó entrar porque tu sesión
(cookie <code>panel_sesion</code>) es válida. Cerrá sesión cuando termines.</p>
<p class="site-foot"><a href="/logout">Cerrar sesión</a></p>`;
  }
}
