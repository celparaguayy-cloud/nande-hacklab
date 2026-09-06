import { useEffect, useMemo, useRef, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { SearchResult } from "../../core/search/VirtualSearch";
import type { HttpResponse } from "../../core/http/types";
import "./browser.css";

interface BrowserProps {
  kernel: VirtualKernel;
}

/** Una parada del historial de navegación. */
interface HistoryEntry {
  url: string;
}

/** Rastro de la última petición, para el panel de red (DevTools). */
interface Trace {
  method: string;
  url: string;
  status: number;
  contentType: string;
  cookies: Record<string, string>;
  sql?: string;
  note?: string;
}

const HOME = "nande.home";

function splitUrl(target: string): { hostname: string; path: string } {
  const normalized = target.trim().replace(/^https?:\/\//i, "");
  const slash = normalized.indexOf("/");

  if (slash === -1) {
    return { hostname: normalized.toLowerCase(), path: "/" };
  }

  return {
    hostname: normalized.slice(0, slash).toLowerCase(),
    path: normalized.slice(slash) || "/",
  };
}

export default function Browser({ kernel }: BrowserProps) {
  const [address, setAddress] = useState(HOME);
  const [bodyHtml, setBodyHtml] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [viewSource, setViewSource] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState("");

  const [history, setHistory] = useState<HistoryEntry[]>([{ url: HOME }]);
  const [cursor, setCursor] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);

  const canBack = cursor > 0;
  const canForward = cursor < history.length - 1;

  // Sitios destacados para la página de inicio.
  const featured = useMemo(
    () => [
      { host: "banco.nande", label: "Banco Mbarete", tag: "SQLi" },
      { host: "blog.yvoty.nande", label: "Yvoty Blog", tag: "XSS" },
      { host: "fotos.arandu.nande", label: "Fotos Arandú", tag: "IDOR" },
      { host: "docs.tape.nande", label: "Archivos Tapé", tag: "Traversal" },
      { host: "tools.pyta.nande", label: "Herramientas Pytã", tag: "CMDi" },
      { host: "www.nande", label: "Portal ÑANDE", tag: "" },
      { host: "news.nande", label: "Noticias", tag: "" },
      { host: "git.nande", label: "Repositorios", tag: "" },
    ],
    [],
  );

  function pushHistory(url: string) {
    setHistory((current) => {
      const prefix = current.slice(0, cursor + 1);
      if (prefix[prefix.length - 1]?.url === url) return current;
      const next = [...prefix, { url }];
      setCursor(next.length - 1);
      return next;
    });
  }

  /** Carga una URL. `record` distingue navegación nueva de atrás/adelante. */
  function load(
    target: string,
    options: { record?: boolean; method?: "GET" | "POST"; body?: Record<string, string> } = {},
  ) {
    const { record = true, method = "GET", body = {} } = options;
    setError("");
    setViewSource(false);

    // Inicio y búsqueda son especiales.
    if (target === HOME || target === "") {
      setAddress(HOME);
      setResults(null);
      setBodyHtml(renderHome(featured));
      setTrace(null);
      if (record) pushHistory(HOME);
      return;
    }

    // Búsqueda: "buscar: términos" o el host de búsqueda.
    const searchMatch = target.match(/^(?:buscar:|search:)\s*(.+)$/i);
    if (searchMatch) {
      runSearch(searchMatch[1], record);
      return;
    }

    const { hostname, path } = splitUrl(target);

    // Aplicación web dinámica → petición HTTP real.
    if (kernel.browser.isWebApp(hostname)) {
      try {
        const { response, finalPath } = kernel.browser.request(
          method,
          hostname,
          path,
          body,
        );
        applyResponse(hostname, finalPath, method, response, record);
      } catch (err) {
        showError(hostname, err);
      }
      return;
    }

    // Sitio estático heredado (portal, noticias, git, sitios de NPC…).
    try {
      const openPath = path;
      const page = kernel.browser.open(hostname, openPath);
      const full = `${hostname}${openPath === "/" ? "" : openPath}`;
      setAddress(full);
      setResults(null);
      setBodyHtml(wrapLegacy(page.content));
      setTrace({
        method: "GET",
        url: full,
        status: 200,
        contentType: page.mimeType,
        cookies: {},
      });
      if (record) pushHistory(full);
    } catch (err) {
      showError(hostname, err);
    }
  }

  function applyResponse(
    hostname: string,
    path: string,
    method: string,
    response: HttpResponse,
    record: boolean,
  ) {
    const full = `${hostname}${path === "/" ? "" : path}`;
    setAddress(full);
    setResults(null);
    setBodyHtml(response.body);

    setTrace({
      method,
      url: full,
      status: response.status,
      contentType: response.contentType,
      cookies: kernel.browser.cookiesOf(hostname),
      sql: response.debug?.sql,
      note: response.debug?.note,
    });

    if (record) pushHistory(full);
  }

  function runSearch(q: string, record: boolean) {
    const found = kernel.search.search(q);
    setResults(found);
    setBodyHtml("");
    setAddress(`buscar: ${q}`);
    setTrace(null);
    if (record) pushHistory(`buscar: ${q}`);
  }

  function showError(hostname: string, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    setError(message);
    setBodyHtml("");
    setResults(null);
    setAddress(hostname);
    setTrace(null);
  }

  // Primera carga: la página de inicio.
  useEffect(() => {
    setBodyHtml(renderHome(featured));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intercepta clics en enlaces y envíos de formularios del HTML renderizado,
  // para que la navegación pase por el navegador virtual.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest("a");
      if (!link) return;

      event.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (!href || href === "#") return;

      // Enlace absoluto (otro host) vs. ruta relativa dentro del host actual.
      if (/^https?:\/\//i.test(href) || /^[a-z0-9.-]+\.nande/i.test(href)) {
        load(href);
      } else {
        const { hostname } = splitUrl(address);
        load(`${hostname}${href.startsWith("/") ? "" : "/"}${href}`);
      }
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement;
      event.preventDefault();

      const method = (form.getAttribute("method") ?? "GET").toUpperCase();
      const action = form.getAttribute("action") ?? "/";
      const data = new FormData(form);
      const fields: Record<string, string> = {};
      for (const [key, value] of data.entries()) {
        fields[key] = String(value);
      }

      const { hostname } = splitUrl(address);
      const actionPath = action.startsWith("/") ? action : `/${action}`;

      if (method === "POST") {
        load(`${hostname}${actionPath}`, { method: "POST", body: fields });
      } else {
        const qs = new URLSearchParams(fields).toString();
        load(`${hostname}${actionPath}${qs ? `?${qs}` : ""}`);
      }
    }

    node.addEventListener("click", onClick);
    node.addEventListener("submit", onSubmit);

    return () => {
      node.removeEventListener("click", onClick);
      node.removeEventListener("submit", onSubmit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, bodyHtml]);

  function go(delta: number) {
    const target = cursor + delta;
    if (target < 0 || target >= history.length) return;
    setCursor(target);
    load(history[target].url, { record: false });
  }

  return (
    <div className="br">
      <div className="br__bar">
        <button className="br__nav" disabled={!canBack} onClick={() => go(-1)} title="Atrás">‹</button>
        <button className="br__nav" disabled={!canForward} onClick={() => go(1)} title="Adelante">›</button>
        <button className="br__nav" onClick={() => load(address, { record: false })} title="Recargar">⟳</button>
        <button className="br__nav" onClick={() => load(HOME)} title="Inicio">⌂</button>

        <form
          className="br__addr"
          onSubmit={(e) => {
            e.preventDefault();
            load(address);
          }}
        >
          <input
            value={address}
            spellCheck={false}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="host.nande  ·  o escribí para buscar"
          />
        </form>

        <button
          className={`br__nav${viewSource ? " br__nav--on" : ""}`}
          onClick={() => setViewSource((v) => !v)}
          title="Ver código fuente"
        >{"</>"}</button>
        <button
          className={`br__nav${showTools ? " br__nav--on" : ""}`}
          onClick={() => setShowTools((v) => !v)}
          title="Herramientas de desarrollo"
        >⚙</button>
      </div>

      <div className="br__split">
        <div className="br__viewport" ref={viewportRef}>
          {error ? (
            <div className="br__error">
              <strong>No se pudo cargar el sitio</strong>
              <p>{error}</p>
              <button className="nd-btn" onClick={() => load(HOME)}>Volver al inicio</button>
            </div>
          ) : results ? (
            <SearchResults results={results} onOpen={(host) => load(host)} />
          ) : viewSource ? (
            <pre className="br__source">{bodyHtml}</pre>
          ) : (
            <div
              className="br__doc nande-site"
              // El HTML lo genera el propio núcleo del juego (no viene de
              // fuera), así que se renderiza directamente.
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </div>

        {showTools && <DevTools trace={trace} />}
      </div>
    </div>
  );
}

function DevTools({ trace }: { trace: Trace | null }) {
  return (
    <div className="br__tools">
      <div className="br__tools-head">Herramientas de desarrollo · Red</div>
      {!trace ? (
        <p className="br__tools-empty">Navegá a un sitio para ver la petición.</p>
      ) : (
        <div className="br__tools-body">
          <Row k="Método" v={trace.method} />
          <Row k="URL" v={trace.url} />
          <Row k="Estado" v={String(trace.status)} />
          <Row k="Tipo" v={trace.contentType} />

          {trace.sql && (
            <div className="br__tools-block">
              <div className="br__tools-label">Consulta SQL ejecutada</div>
              <pre className="br__tools-sql">{trace.sql}</pre>
            </div>
          )}

          {trace.note && (
            <div className="br__tools-block">
              <div className="br__tools-label">Servidor</div>
              <pre className="br__tools-sql">{trace.note}</pre>
            </div>
          )}

          <div className="br__tools-block">
            <div className="br__tools-label">Cookies</div>
            {Object.keys(trace.cookies).length === 0 ? (
              <p className="br__tools-empty">Sin cookies.</p>
            ) : (
              Object.entries(trace.cookies).map(([k, v]) => (
                <Row key={k} k={k} v={v} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="br__row">
      <span className="br__row-k">{k}</span>
      <span className="br__row-v">{v}</span>
    </div>
  );
}

function SearchResults({
  results,
  onOpen,
}: {
  results: SearchResult[];
  onOpen: (host: string) => void;
}) {
  if (results.length === 0) {
    return <p className="br__tools-empty">Sin resultados.</p>;
  }

  return (
    <div className="br__results">
      {results.map((r) => (
        <button
          key={r.hostname}
          className="br__result"
          onClick={() => onOpen(r.hostname)}
        >
          <span className="br__result-title">{r.title}</span>
          <span className="br__result-url">{r.hostname}</span>
          <span className="br__result-desc">{r.description}</span>
        </button>
      ))}
    </div>
  );
}

/** Envuelve el HTML de un sitio estático heredado. */
function wrapLegacy(content: string): string {
  return content;
}

function renderHome(
  featured: { host: string; label: string; tag: string }[],
): string {
  const cards = featured
    .map(
      (f) => `
<a class="br-tile" href="${f.host}">
  <span class="br-tile__name">${f.label}</span>
  ${f.tag ? `<span class="br-tile__tag">${f.tag}</span>` : ""}
  <span class="br-tile__host">${f.host}</span>
</a>`,
    )
    .join("");

  return `
<div class="br-home">
  <h1 class="br-home__title">Internet de ÑANDE</h1>
  <p class="br-home__sub">Escribí un host en la barra, o entrá a un laboratorio.
  Los que tienen etiqueta son webs vulnerables para practicar.</p>
  <div class="br-home__grid">${cards}</div>
</div>`;
}
