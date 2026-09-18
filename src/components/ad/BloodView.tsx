import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { AnalysisId, Edge, EdgeType, GraphNode, PrincipalKind } from "../../core/ad/Directory";

interface BloodViewProps {
  kernel: VirtualKernel;
}

/** Color por tipo de arista, como en BloodHound. */
const EDGE_COLOR: Record<EdgeType, string> = {
  MemberOf: "#60a5fa",
  AdminTo: "#f97316",
  HasSession: "#a78bfa",
  GenericAll: "#ef4444",
  ForceChangePassword: "#f43f5e",
  CanRDP: "#34d399",
};

const KIND_LABEL: Record<PrincipalKind, string> = {
  user: "usuario",
  group: "grupo",
  computer: "equipo",
};

const COL_W = 210;
const ROW_H = 84;
const PAD = 46;
const NODE_R = 21;
/** Separación entre capas y dentro de la capa cuando el grafo va de arriba a abajo. */
const COL_W_V = 150;
const ROW_H_V = 78;

/**
 * NandeBlood — el mapa de ataque del dominio, como BloodHound de verdad: un
 * GRAFO que se ve y se recorre, no una lista. Los nodos se ordenan por capas
 * según su distancia real a Domain Admins (atacante a la izquierda, objetivo a
 * la derecha), las aristas llevan su tipo real (MemberOf, AdminTo, GenericAll,
 * ForceChangePassword, HasSession) y las consultas prearmadas resaltan el
 * subgrafo que importa. Todo es estado real: al poseer un nodo, el grafo y la
 * ruta se recalculan.
 */
export function BloodView({ kernel }: BloodViewProps) {
  const dir = kernel.directory;
  const [, setNonce] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisId>("shortest-path");
  const [selected, setSelected] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [log, setLog] = useState<string[]>([]);
  // Cámara del lienzo, como el de BloodHound: zoom 1 = tamaño real (1 unidad = 1 píxel),
  // se arrastra para pasear y los botones acercan/alejan. Para que 1:1 sea de verdad 1:1
  // hay que medir el panel: el viewBox usa SUS dimensiones, no las del grafo.
  // `cam` en null = encuadre automático (todo el grafo a la vista); en cuanto el
  // jugador arrastra o toca +/− pasa a mandar él, y "Ajustar" devuelve el automático.
  const [cam, setCam] = useState<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // En una ventana angosta (teléfono) el grafo y la ficha se apilan, y las capas
  // del grafo bajan en vez de ir a la derecha: es donde sobra pantalla.
  const [narrow, setNarrow] = useState(false);
  const [pane, setPane] = useState({ w: 640, h: 420 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  // Al capturar el puntero para arrastrar, el `click` posterior lo recibe el <svg>,
  // no el nodo: por eso la selección se resuelve en pointerdown/up con un umbral.
  const downNode = useRef<string | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const paneRef = useRef<HTMLDivElement | null>(null);

  const refresh = () => setNonce((n) => n + 1);
  const say = (m: string) => setLog((l) => [m, ...l].slice(0, 6));

  const { nodes, edges } = dir.graph();
  const result = dir.runAnalysis(analysis);
  const done = dir.domainOwned();
  const detail = selected ? dir.nodeDetail(selected) : null;

  // Layout por capas: x = capa (distancia al objetivo), y = orden dentro de la capa.
  // Barato (decenas de nodos) y `nodes` se recalcula en cada render: no hay nada que memorizar.
  const layout = computeLayout(nodes, narrow);


  const doKerberoast = (name: string) => {
    const r = dir.kerberoast(name);
    say(r.ok ? `${r.message} Probá crackear el TGS.` : `✘ ${r.message}`);
    refresh();
  };
  const doCrack = (name: string) => {
    if (!guess.trim()) { say("Escribí una clave para probar."); return; }
    const r = dir.crack(name, guess.trim());
    say(`${r.ok ? "✔" : "✘"} ${r.message}`);
    if (dir.domainOwned()) kernel.scanForSignals("ND{dominio_comprometido}");
    setGuess("");
    refresh();
  };
  const doAbuse = (from: string, to: string) => {
    const r = dir.abuse(from, to);
    say(`${r.ok ? "✔" : "✘"} ${r.message}`);
    if (dir.domainOwned()) kernel.scanForSignals("ND{dominio_comprometido}");
    refresh();
  };


  const edgeKey = (e: Edge) => `${e.from}|${e.type}|${e.to}`;
  const hotEdges = new Set(result.edges.map(edgeKey));

  // Medir el panel: el viewBox usa SUS dimensiones, así zoom 1 = 1 unidad por píxel.
  // El ResizeObserver dispara al observar, así que esa primera lectura ya mide.
  useEffect(() => {
    const el = paneRef.current;
    const outer = bodyRef.current;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (el) setPane({ w: el.clientWidth || 640, h: el.clientHeight || 420 });
      if (outer) setNarrow(outer.clientWidth < 560);
    });
    if (el) ro.observe(el);
    if (outer) ro.observe(outer);
    return () => ro.disconnect();
  }, []);

  // Encuadre automático derivado (sin efectos): todo el grafo, centrado.
  const gw = layout.width;
  const gh = layout.height;
  // Se deja margen en pantalla (no en el mundo) para que las etiquetas de los nodos
  // de los extremos entren enteras a cualquier zoom.
  const fitZoom = Math.min(
    3,
    Math.max(0.12, Math.min(Math.max(120, pane.w - 110) / gw, Math.max(100, pane.h - 60) / gh)),
  );
  const zoom = cam?.zoom ?? fitZoom;
  const pan = cam?.pan ?? { x: (pane.w / fitZoom - gw) / 2, y: (pane.h / fitZoom - gh) / 2 };

  // Con pocas relaciones resaltadas las etiquetas entran siempre; con muchas,
  // sólo al acercar (si no, se pisan). Es lo que hacen los visores de grafos.
  const showEdgeLabels = hotEdges.size <= 7 || zoom >= 0.55;

  const fit = () => setCam(null);
  const zoomBy = (f: number) => {
    const z = Math.min(3, Math.max(0.12, zoom * f));
    // Acercar/alejar respecto al centro del panel, no de la esquina.
    setCam({
      zoom: z,
      pan: { x: pan.x + (pane.w / z - pane.w / zoom) / 2, y: pan.y + (pane.h / z - pane.h / zoom) / 2 },
    });
  };
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setGrabbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    // Zoom 1 = 1 unidad por píxel: de pantalla a mundo es dividir por el zoom.
    setCam({ zoom, pan: { x: d.px + (e.clientX - d.x) / zoom, y: d.py + (e.clientY - d.y) / zoom } });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const moved = d ? Math.hypot(e.clientX - d.x, e.clientY - d.y) : 0;
    // Un toque corto sobre un nodo lo selecciona; si arrastró, sólo movió la cámara.
    if (downNode.current && moved < 5) {
      setSelected(downNode.current);
      setGuess("");
    }
    downNode.current = null;
    drag.current = null;
    setGrabbing(false);
  };

  const shortName = (n: string) => n.split("@")[0];

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>NandeBlood — {dir.domain}</div>
        <select style={select} value={analysis} onChange={(e) => setAnalysis(e.target.value as AnalysisId)}>
          {dir.analysisList().map((q) => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "#8b98a5", flex: 1, minWidth: 140 }}>{result.note}</span>
        <span style={{ fontSize: 12, color: done ? "#86efac" : "#8b98a5", whiteSpace: "nowrap" }}>
          {done ? "Dominio comprometido" : `${dir.owned().length} poseído(s)`}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={camBtn} onClick={() => zoomBy(1 / 1.25)} title="Alejar">−</button>
          <button style={camBtn} onClick={() => zoomBy(1.25)} title="Acercar">+</button>
          <button style={{ ...camBtn, width: "auto", padding: "0 8px" }} onClick={fit} title="Ver todo">Ajustar</button>
        </div>
      </div>

      <div style={{ ...body, flexDirection: narrow ? "column" : "row" }} ref={bodyRef}>
        <div style={{ ...graphPane, minHeight: narrow ? 320 : undefined }} ref={paneRef}>
          <svg
            width="100%"
            height="100%"
            viewBox={`${-pan.x} ${-pan.y} ${pane.w / zoom} ${pane.h / zoom}`}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ display: "block", touchAction: "none", cursor: grabbing ? "grabbing" : "grab" }}
          >
            <defs>
              {Object.entries(EDGE_COLOR).map(([type, color]) => (
                <marker key={type} id={`arrow-${type}`} viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
              ))}
            </defs>

            {/* Aristas: el tipo real de relación de AD. */}
            {edges.map((e) => {
              const a = layout.pos.get(e.from);
              const b = layout.pos.get(e.to);
              if (!a || !b) return null;
              const hot = hotEdges.has(edgeKey(e));
              const color = EDGE_COLOR[e.type];
              // Acortar la línea para que la flecha no quede bajo el nodo.
              const dx = b.x - a.x, dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len, uy = dy / len;
              const x1 = a.x + ux * NODE_R, y1 = a.y + uy * NODE_R;
              const x2 = b.x - ux * (NODE_R + 8), y2 = b.y - uy * (NODE_R + 8);
              return (
                <g key={edgeKey(e)} opacity={hot ? 1 : 0.22}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color}
                    strokeWidth={(hot ? 2.2 : 1.3) / zoom} markerEnd={`url(#arrow-${e.type})`} />
                </g>
              );
            })}

            {/* Nodos: forma por tipo, rojo si lo poseés, dorado el objetivo. */}
            {[...layout.pos.entries()].map(([name, { x, y, node }]) => {
              const p = node.principal;
              const isTarget = node.distanceToTarget === 0;
              const hot = result.nodes.has(name);
              const fill = p.owned ? "#7f1d1d" : isTarget ? "#78350f" : "#16202b";
              const stroke = p.owned ? "#ef4444" : isTarget ? "#f59e0b" : "#334155";
              const isSel = selected === name;
              return (
                <g key={name} opacity={hot ? 1 : 0.3} style={{ cursor: "pointer" }}
                  onPointerDown={() => { downNode.current = name; }}>
                  {p.kind === "computer" ? (
                    <rect x={x - NODE_R} y={y - NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={5}
                      fill={fill} stroke={isSel ? "#e6edf3" : stroke} strokeWidth={(isSel ? 3 : 2) / zoom} />
                  ) : p.kind === "group" ? (
                    <polygon
                      points={`${x},${y - NODE_R} ${x + NODE_R},${y} ${x},${y + NODE_R} ${x - NODE_R},${y}`}
                      fill={fill} stroke={isSel ? "#e6edf3" : stroke} strokeWidth={(isSel ? 3 : 2) / zoom} />
                  ) : (
                    <circle cx={x} cy={y} r={NODE_R} fill={fill}
                      stroke={isSel ? "#e6edf3" : stroke} strokeWidth={(isSel ? 3 : 2) / zoom} />
                  )}
                  <text x={x} y={y + 4 / zoom} fill="#e6edf3" fontSize={10 / zoom} textAnchor="middle"
                    style={{ fontFamily: "ui-monospace, monospace", pointerEvents: "none" }}>
                    {p.owned ? "●" : p.kind === "group" ? "▦" : p.kind === "computer" ? "▣" : "◯"}
                  </text>
                  <text
                    x={narrow ? x + NODE_R + 7 / zoom : x}
                    y={narrow ? y + 4 / zoom : y + NODE_R + 13 / zoom}
                    fill={p.owned ? "#fca5a5" : "#c9d3dd"} fontSize={10 / zoom}
                    textAnchor={narrow ? "start" : "middle"}
                    stroke="#0b1016" strokeWidth={3.5 / zoom} paintOrder="stroke"
                    style={{ fontFamily: "ui-monospace, monospace", pointerEvents: "none" }}>
                    {shortName(p.name)}
                  </text>
                </g>
              );
            })}

            {/* Etiquetas de la ruta, al final: quedan por encima de nodos y líneas.
                Van SIEMPRE arriba de la línea (abajo está el nombre del nodo) y a dos
                alturas según la capa, para que dos seguidas nunca se pisen. */}
            {showEdgeLabels && edges.map((e) => {
              if (!hotEdges.has(edgeKey(e))) return null;
              const a = layout.pos.get(e.from);
              const b = layout.pos.get(e.to);
              if (!a || !b) return null;
              return (
                <text key={`lbl-${edgeKey(e)}`}
                  x={(a.x + b.x) / 2 - (narrow ? 9 / zoom : 0)}
                  y={(a.y + b.y) / 2 - (narrow ? -3 : a.node.rank % 2 === 0 ? 11 : 26) / zoom}
                  fill={EDGE_COLOR[e.type]} fontSize={9.5 / zoom} textAnchor={narrow ? "end" : "middle"}
                  stroke="#0b1016" strokeWidth={3.5 / zoom} paintOrder="stroke"
                  style={{ fontFamily: "ui-monospace, monospace", pointerEvents: "none" }}>
                  {e.type}
                </text>
              );
            })}
          </svg>
          {!showEdgeLabels && (
            <div style={hint}>Acercá con + para leer el tipo de cada relación.</div>
          )}
        </div>

        <div style={narrow
          ? { ...sidePane, width: "auto", flexShrink: 1, maxHeight: "42%", borderLeft: "none", borderTop: "1px solid #1b2733" }
          : sidePane}>
          {detail ? (
            <>
              <div style={sideTitle}>{shortName(detail.principal.name)}</div>
              <div style={{ fontSize: 11, color: "#8b98a5", marginBottom: 6 }}>
                {KIND_LABEL[detail.principal.kind]} · {detail.principal.owned ? "POSEÍDO" : "no poseído"}
              </div>
              {detail.principal.note && (
                <div style={{ fontSize: 11.5, color: "#c9d3dd", marginBottom: 8 }}>{detail.principal.note}</div>
              )}

              {detail.principal.spn && (
                <div style={box}>
                  <div style={boxTitle}>Cuenta de servicio (SPN)</div>
                  <div style={{ fontSize: 11, color: "#c9d3dd", fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>
                    {detail.principal.spn}
                  </div>
                  {!detail.principal.owned && (
                    <>
                      <button style={actBtn} onClick={() => doKerberoast(detail.principal.name)}>Kerberoast</button>
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        <input style={input} placeholder="clave a probar" value={guess}
                          onChange={(e) => setGuess(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") doCrack(detail.principal.name); }} />
                        <button style={actBtn} onClick={() => doCrack(detail.principal.name)}>Crack TGS</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={box}>
                <div style={boxTitle}>Controla a ({detail.outbound.length})</div>
                {detail.outbound.length === 0 && <div style={muted}>Nada.</div>}
                {detail.outbound.map((e) => (
                  <div key={edgeKey(e)} style={edgeRow}>
                    <span style={{ color: EDGE_COLOR[e.type], minWidth: 118, fontSize: 10.5 }}>{e.type}</span>
                    <span style={{ flex: 1, fontSize: 11, minWidth: 0 }}>{shortName(e.to)}</span>
                    {detail.principal.owned && e.type !== "MemberOf" && !dir.get(e.to)?.owned && (
                      <button style={miniBtn} onClick={() => doAbuse(e.from, e.to)}>Abusar</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={box}>
                <div style={boxTitle}>Lo controla ({detail.inbound.length})</div>
                {detail.inbound.length === 0 && <div style={muted}>Nadie.</div>}
                {detail.inbound.map((e) => (
                  <div key={edgeKey(e)} style={edgeRow}>
                    <span style={{ color: EDGE_COLOR[e.type], minWidth: 118, fontSize: 10.5 }}>{e.type}</span>
                    <span style={{ flex: 1, fontSize: 11, minWidth: 0 }}>{shortName(e.from)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={muted}>
              Tocá un nodo del grafo para ver quién lo controla, sobre qué tiene control,
              y las acciones que podés ejecutar contra él.
            </div>
          )}

          {log.length > 0 && (
            <div style={box}>
              <div style={boxTitle}>Registro</div>
              {log.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: "#c9d3dd", padding: "2px 0" }}>{l}</div>
              ))}
            </div>
          )}

          <div style={{ ...box, marginTop: "auto" }}>
            <div style={boxTitle}>Leyenda</div>
            {(Object.keys(EDGE_COLOR) as EdgeType[]).map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, padding: "1px 0" }}>
                <span style={{ width: 14, height: 2, background: EDGE_COLOR[t] }} />
                <span style={{ color: "#8b98a5" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif", minHeight: 0 };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #1b2733", flexWrap: "wrap" };
const select: CSSProperties = { background: "#0e141b", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 8px", fontSize: 12 };
const body: CSSProperties = { flex: 1, display: "flex", minHeight: 0 };
const graphPane: CSSProperties = { flex: 1, overflow: "hidden", minWidth: 0, position: "relative", background: "radial-gradient(ellipse at 30% 20%, rgba(61,174,233,0.05), transparent 60%)" };
const sidePane: CSSProperties = { width: 290, flexShrink: 0, borderLeft: "1px solid #1b2733", padding: "10px 12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 };
const sideTitle: CSSProperties = { fontSize: 14, fontWeight: 700, wordBreak: "break-all" };
const box: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 10px" };
const boxTitle: CSSProperties = { fontSize: 10.5, color: "#93c5fd", fontWeight: 700, marginBottom: 5, letterSpacing: 0.3 };
const edgeRow: CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "2px 0" };
const muted: CSSProperties = { color: "#8b98a5", fontSize: 11.5, lineHeight: 1.6 };
const actBtn: CSSProperties = { background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", marginTop: 6 };
const miniBtn: CSSProperties = { background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 4, padding: "2px 7px", fontSize: 10, cursor: "pointer" };
const hint: CSSProperties = { position: "absolute", left: 10, bottom: 8, fontSize: 11, color: "#8b98a5", background: "rgba(11,16,22,0.8)", border: "1px solid #1b2733", borderRadius: 6, padding: "3px 8px", pointerEvents: "none" };
const camBtn: CSSProperties = { width: 26, height: 24, background: "#0e141b", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 5, fontSize: 13, lineHeight: 1, cursor: "pointer" };
const input: CSSProperties = { flex: 1, minWidth: 0, background: "#080f16", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 5, padding: "4px 7px", fontSize: 11, fontFamily: "ui-monospace, monospace" };

export default BloodView;

/**
 * Coloca los nodos en capas por su distancia real al objetivo. En horizontal las
 * capas avanzan hacia la derecha (como BloodHound en un monitor); en una ventana
 * angosta (teléfono) avanzan hacia abajo, que es donde sobra pantalla.
 */
function computeLayout(nodes: GraphNode[], vertical: boolean): {
  pos: Map<string, { x: number; y: number; node: GraphNode }>;
  width: number;
  height: number;
} {
  const byRank = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const arr = byRank.get(n.rank) ?? [];
    arr.push(n);
    byRank.set(n.rank, arr);
  }
  const pos = new Map<string, { x: number; y: number; node: GraphNode }>();
  let maxRows = 1;
  for (const [rank, arr] of byRank) {
    arr.sort((a, b) => a.principal.name.localeCompare(b.principal.name));
    maxRows = Math.max(maxRows, arr.length);
    arr.forEach((n, i) => {
      // Zigzag por capa: aprovecha el espacio libre y evita que dos etiquetas de
      // arista consecutivas caigan en la misma línea y se pisen.
      if (vertical) {
        const stagger = (rank % 2) * (COL_W_V * 0.35);
        pos.set(n.principal.name, { x: PAD + i * COL_W_V + stagger, y: PAD + rank * ROW_H_V, node: n });
      } else {
        const stagger = (rank % 2) * (ROW_H * 0.62);
        pos.set(n.principal.name, { x: PAD + rank * COL_W, y: PAD + i * ROW_H + stagger, node: n });
      }
    });
  }
  const maxRank = Math.max(0, ...nodes.map((n) => n.rank));
  return vertical
    ? {
        pos,
        width: PAD * 2 + (maxRows - 1) * COL_W_V + COL_W_V * 0.35 + 120,
        height: PAD * 2 + maxRank * ROW_H_V + 60,
      }
    : {
        pos,
        width: PAD * 2 + maxRank * COL_W + 120,
        height: PAD * 2 + (maxRows - 1) * ROW_H + ROW_H * 0.62 + 60,
      };
}
