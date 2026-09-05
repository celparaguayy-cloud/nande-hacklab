import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { SearchResult } from "../../core/search/VirtualSearch";

interface BrowserProps {
  kernel: VirtualKernel;
}

type BrowserPage = "home" | "search" | "site";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function Browser({ kernel }: BrowserProps) {
  const [url, setUrl] = useState("https://search.nande");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<BrowserPage>("home");
  const [title, setTitle] = useState("ÑANDE Browser");
  const [results, setResults] = useState<SearchResult[]>([]);
  // El HTML del sitio se guarda aparte del texto de la pagina de busqueda:
  // antes ambos compartian el mismo estado con significados distintos.
  const [siteContent, setSiteContent] = useState("");
  const [nav, setNav] = useState<{ entries: string[]; index: number }>({
    entries: ["https://search.nande"],
    index: 0,
  });

  const canGoBack = nav.index > 0;
  const canGoForward = nav.index < nav.entries.length - 1;

  const cleanUrl = (target: string) => {
    const normalized = target
      .trim()
      .replace(/^https?:\/\//i, "");

    const [hostPart, ...pathParts] = normalized.split("/");

    const hostname = hostPart.toLowerCase();
    const path = pathParts.length
      ? `/${pathParts.join("/")}`
      : "/";

    return { hostname, path };
  };

  const recordHistory = (target: string) => {
    setNav((current) => {
      const prefix = current.entries.slice(0, current.index + 1);

      // Navegar a la pagina actual no agrega entrada ni mueve el indice.
      if (prefix[prefix.length - 1] === target) {
        return current;
      }

      return {
        entries: [...prefix, target],
        index: prefix.length,
      };
    });
  };

  const renderPage = (hostname: string, path: string, addHistory = true) => {
    const fullUrl =
      path === "/"
        ? `https://${hostname}`
        : `https://${hostname}${path}`;

    setUrl(fullUrl);

    if (addHistory) {
      recordHistory(fullUrl);
    }

    if (hostname === "search.nande") {
      setPage("search");
      setTitle("ÑANDE Search");
      return;
    }

    try {
      const result = kernel.browser.open(hostname, path);

      setPage("site");
      setTitle(result.title);
      setSiteContent(result.content);
      setResults([]);
    } catch (error) {
      // Se muestra el motivo real (DNS o red), como haria un navegador.
      const motivo =
        error instanceof Error
          ? error.message
          : "Error desconocido";

      setPage("site");
      setTitle("Sitio no disponible");
      setSiteContent(`
        <h1>No se pudo abrir el sitio</h1>
        <p><code>${escapeHtml(hostname)}${escapeHtml(path)}</code></p>

        <article>
          <h2>Motivo</h2>
          <p>${escapeHtml(motivo)}</p>
        </article>

        <p>
          Este navegador solo alcanza la Internet virtual de ÑANDE:
          dominios <code>.nande</code> dentro de la red 10.10.0.0/16.
        </p>
      `);
      setResults([]);
    }
  };

  const navigate = (target: string) => {
    const { hostname, path } = cleanUrl(target);

    if (!hostname) {
      return;
    }

    renderPage(hostname, path);
  };

  const goBack = () => {
    if (!canGoBack) {
      return;
    }

    const nextIndex = nav.index - 1;
    const { hostname, path } = cleanUrl(nav.entries[nextIndex]);

    setNav((current) => ({ ...current, index: nextIndex }));
    renderPage(hostname, path, false);
  };

  const goForward = () => {
    if (!canGoForward) {
      return;
    }

    const nextIndex = nav.index + 1;
    const { hostname, path } = cleanUrl(nav.entries[nextIndex]);

    setNav((current) => ({ ...current, index: nextIndex }));
    renderPage(hostname, path, false);
  };

  const openResult = (result: SearchResult) => {
    navigate(`https://${result.hostname}`);
  };

  const search = () => {
    const found = kernel.search.search(query);

    setResults(found);
    setPage("search");
    setTitle("ÑANDE Search");
  };

  const goHome = () => {
    const target = "https://search.nande";

    setUrl(target);
    setPage("home");
    setTitle("ÑANDE Browser");
    setResults([]);
  };

  return (
    <div style={browserStyle}>
      <header style={browserHeaderStyle}>
        <div style={topBarStyle}>
          <button
            onClick={goBack}
            style={{
              ...navButtonStyle,
              opacity: canGoBack ? 1 : 0.4,
            }}
            title="Atrás"
            disabled={!canGoBack}
          >
            ←
          </button>

          <button
            onClick={goForward}
            style={{
              ...navButtonStyle,
              opacity: canGoForward ? 1 : 0.4,
            }}
            title="Adelante"
            disabled={!canGoForward}
          >
            →
          </button>

          <button
            onClick={() => renderPage(cleanUrl(url).hostname, cleanUrl(url).path, false)}
            style={navButtonStyle}
            title="Recargar"
          >
            ⟳
          </button>

          <button onClick={goHome} style={navButtonStyle} title="Inicio">
            🏠
          </button>

          <button
            onClick={() => navigate("search.nande")}
            style={navButtonStyle}
            title="ÑANDE Search"
          >
            🔍
          </button>

          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigate(url);
              }
            }}
            style={addressBarStyle}
            placeholder="https://sitio.nande"
          />

          <button
            onClick={() => navigate(url)}
            style={goButtonStyle}
          >
            Ir
          </button>
        </div>

        <div style={searchBarStyle}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                search();
              }
            }}
            style={searchInputStyle}
            placeholder="Buscar en ÑANDE Search..."
          />

          <button onClick={search} style={searchActionStyle}>
            Buscar
          </button>
        </div>
      </header>

      <div style={contentWrapperStyle}>
        {page === "home" && (
          <main style={homeStyle}>
            <div style={logoStyle}>Ñ</div>

            <h1 style={homeTitleStyle}>ÑANDE</h1>

            <p style={homeDescriptionStyle}>
              La Internet virtual de ÑANDE HACKLAB
            </p>

            <div style={homeSearchStyle}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    search();
                  }
                }}
                style={largeSearchInputStyle}
                placeholder="¿Qué estás buscando?"
              />

              <button onClick={search} style={largeSearchButtonStyle}>
                🔍
              </button>
            </div>

            <div style={quickLinksStyle}>
              <button
                onClick={() => navigate("video.nande")}
                style={quickLinkStyle}
              >
                ▶ Videos
              </button>

              <button
                onClick={() => navigate("academy.nande")}
                style={quickLinkStyle}
              >
                🎓 Academy
              </button>

              <button
                onClick={() => navigate("news.nande")}
                style={quickLinkStyle}
              >
                📰 News
              </button>

              <button
                onClick={() => navigate("git.nande")}
                style={quickLinkStyle}
              >
                💻 Git
              </button>

              <button
                onClick={() => navigate("ctf.nande")}
                style={quickLinkStyle}
              >
                🏴 CTF
              </button>
            </div>
          </main>
        )}

        {page === "search" && (
          <main style={resultsPageStyle}>
            <div style={resultsHeaderStyle}>
              <div>
                <div style={smallLabelStyle}>ÑANDE SEARCH</div>
                <h1 style={pageTitleStyle}>{title}</h1>
              </div>

              <span style={resultCountStyle}>
                {results.length} resultados
              </span>
            </div>

            {results.length === 0 ? (
              <div style={emptyStyle}>
                <div style={{ fontSize: 42 }}>🔎</div>
                <h2>No encontramos resultados</h2>
                <p>Probá con otra búsqueda.</p>
              </div>
            ) : (
              <div style={resultsListStyle}>
                {results.map((result) => (
                  <article
                    key={result.hostname}
                    style={resultCardStyle}
                    onClick={() => openResult(result)}
                  >
                    <div style={resultUrlStyle}>
                      🔒 https://{result.hostname}
                    </div>

                    <h2 style={resultTitleStyle}>
                      {result.title}
                    </h2>

                    <p style={resultDescriptionStyle}>
                      {result.description}
                    </p>

                    <div style={tagsStyle}>
                      {result.keywords.slice(0, 5).map((keyword) => (
                        <span key={keyword} style={tagStyle}>
                          {keyword}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openResult(result);
                      }}
                      style={visitButtonStyle}
                    >
                      Visitar sitio →
                    </button>
                  </article>
                ))}
              </div>
            )}
          </main>
        )}

        {page === "site" && (
          <main style={sitePageStyle}>
            <div style={siteTopStyle}>
              <span style={siteLockStyle}>🔒</span>

              <div>
                <div style={siteAddressStyle}>{url}</div>
                <div style={siteStatusStyle}>
                  Sitio dentro de la Internet virtual de ÑANDE
                </div>
              </div>
            </div>

            <div style={siteBodyStyle}>

              <div
                className="nande-site"
                style={siteContentStyle}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  const link = target.closest("a");

                  if (!link) {
                    return;
                  }

                  event.preventDefault();

                  const href = link.getAttribute("href");

                  if (!href) {
                    return;
                  }

                  const current = cleanUrl(url);

                  if (href.startsWith("/")) {
                    navigate(`https://${current.hostname}${href}`);
                  } else {
                    navigate(href);
                  }
                }}
                dangerouslySetInnerHTML={{ __html: siteContent }}
              />

              <div style={siteActionsStyle}>
                <button
                  onClick={() => navigate("search.nande")}
                  style={secondaryButtonStyle}
                >
                  ← Volver a Search
                </button>

                <button
                  onClick={goHome}
                  style={secondaryButtonStyle}
                >
                  🏠 Inicio
                </button>
              </div>
            </div>
          </main>
        )}
      </div>

      <footer style={footerStyle}>
        <span>ÑANDE Browser</span>
        <span>● Internet virtual</span>
        <span>Sandbox aislado</span>
      </footer>
    </div>
  );
}

const browserStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 400,
  display: "flex",
  flexDirection: "column",
  background: "#0b0f14",
  color: "#e6edf3",
  overflow: "hidden",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const browserHeaderStyle: CSSProperties = {
  background: "#0d1218",
  borderBottom: "1px solid #29303a",
  boxShadow: "0 2px 14px rgba(0,0,0,0.28)",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 10px 7px",
};

const navButtonStyle: CSSProperties = {
  width: 34,
  height: 32,
  border: "1px solid #29303a",
  borderRadius: 7,
  background: "#151a21",
  color: "#c9d1d9",
  cursor: "pointer",
  fontSize: 16,
};

const addressBarStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 32,
  border: "1px solid #303945",
  borderRadius: 17,
  padding: "0 14px",
  color: "#d7dee7",
  background: "#080b10",
  outline: "none",
  fontSize: 13,
};

const goButtonStyle: CSSProperties = {
  height: 32,
  border: "1px solid #2563eb",
  borderRadius: 7,
  padding: "0 13px",
  background: "#1d4ed8",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};

const searchBarStyle: CSSProperties = {
  display: "flex",
  gap: 7,
  padding: "0 10px 8px",
};

const searchInputStyle: CSSProperties = {
  flex: 1,
  height: 32,
  border: "1px solid #29303a",
  borderRadius: 7,
  padding: "0 12px",
  color: "#d7dee7",
  background: "#10151c",
  outline: "none",
};

const searchActionStyle: CSSProperties = {
  border: "1px solid #29303a",
  borderRadius: 7,
  padding: "0 16px",
  background: "#151a21",
  color: "#e6edf3",
  cursor: "pointer",
  fontWeight: 600,
};

const contentWrapperStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  background: "#0b0f14",
};

const homeStyle: CSSProperties = {
  minHeight: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 30,
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at center, #141b24 0%, #0b0f14 50%, #080b10 100%)",
};

const logoStyle: CSSProperties = {
  width: 78,
  height: 78,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 18,
  background: "#111820",
  border: "1px solid #34414d",
  color: "#e6edf3",
  fontSize: 44,
  fontWeight: 800,
  boxShadow: "0 10px 35px rgba(0,0,0,0.35)",
};

const homeTitleStyle: CSSProperties = {
  margin: "14px 0 4px",
  fontSize: 38,
  letterSpacing: 2,
  color: "#e6edf3",
};

const homeDescriptionStyle: CSSProperties = {
  margin: "0 0 25px",
  color: "#7f8995",
};

const homeSearchStyle: CSSProperties = {
  width: "min(650px, 90%)",
  display: "flex",
  gap: 8,
};

const largeSearchInputStyle: CSSProperties = {
  flex: 1,
  height: 46,
  border: "1px solid #303945",
  borderRadius: 24,
  padding: "0 18px",
  fontSize: 16,
  outline: "none",
  color: "#e6edf3",
  background: "#10151c",
  boxSizing: "border-box",
};

const largeSearchButtonStyle: CSSProperties = {
  width: 50,
  height: 46,
  border: "1px solid #2563eb",
  borderRadius: 23,
  background: "#1d4ed8",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 18,
};

const quickLinksStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 8,
  marginTop: 22,
};

const quickLinkStyle: CSSProperties = {
  border: "1px solid #29303a",
  borderRadius: 18,
  padding: "8px 13px",
  background: "#151a21",
  color: "#c9d1d9",
  cursor: "pointer",
};

const resultsPageStyle: CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 26,
};

const resultsHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 20,
  marginBottom: 22,
};

const smallLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#7f8995",
  letterSpacing: 1.5,
};

const pageTitleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 25,
  color: "#e6edf3",
};

const resultCountStyle: CSSProperties = {
  color: "#7f8995",
  fontSize: 13,
};

const resultsListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 13,
};

const resultCardStyle: CSSProperties = {
  background: "#10151c",
  border: "1px solid #29303a",
  borderRadius: 12,
  padding: 18,
  cursor: "pointer",
  boxShadow: "0 5px 18px rgba(0,0,0,0.2)",
};

const resultUrlStyle: CSSProperties = {
  fontSize: 12,
  color: "#58a6ff",
  marginBottom: 6,
};

const resultTitleStyle: CSSProperties = {
  margin: "0 0 7px",
  fontSize: 20,
  color: "#79b8ff",
};

const resultDescriptionStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#aab4bf",
  lineHeight: 1.5,
};

const tagsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 13,
};

const tagStyle: CSSProperties = {
  padding: "3px 8px",
  borderRadius: 12,
  background: "#18212b",
  border: "1px solid #29303a",
  color: "#8fa0b1",
  fontSize: 11,
};

const visitButtonStyle: CSSProperties = {
  border: "1px solid #303945",
  borderRadius: 7,
  padding: "7px 11px",
  background: "#151a21",
  color: "#79b8ff",
  cursor: "pointer",
  fontWeight: 600,
};

const emptyStyle: CSSProperties = {
  textAlign: "center",
  padding: 70,
  color: "#7f8995",
};

const sitePageStyle: CSSProperties = {
  minHeight: "100%",
  background: "#0b0f14",
};

const siteTopStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "15px 20px",
  borderBottom: "1px solid #29303a",
  background: "#10151c",
};

const siteLockStyle: CSSProperties = {
  fontSize: 18,
};

const siteAddressStyle: CSSProperties = {
  fontWeight: 700,
  color: "#d7dee7",
  fontSize: 13,
};

const siteStatusStyle: CSSProperties = {
  marginTop: 3,
  color: "#657180",
  fontSize: 11,
};

const siteBodyStyle: CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 35,
  boxSizing: "border-box",
};

const siteContentStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: "#b5c0cc",
};


const siteActionsStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 25,
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #303945",
  borderRadius: 8,
  padding: "8px 13px",
  background: "#151a21",
  color: "#c9d1d9",
  cursor: "pointer",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "6px 12px",
  background: "#080b10",
  borderTop: "1px solid #29303a",
  color: "#657180",
  fontSize: 10,
};
