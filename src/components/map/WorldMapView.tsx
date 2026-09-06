import { useEffect, useMemo, useRef, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { MapPlace, ZoneSnapshot } from "../../core/world/WorldMap";
import { AppIcon } from "../desktop/AppIcon";

interface WorldMapViewProps {
  kernel: VirtualKernel;
}

/* ------------------------------------------------------------------
   Geometría del plano.
   El mapa es una ciudad de 3x3 manzanas separadas por avenidas, no una
   grilla de tarjetas: la idea es que se lea como un plano.

   El lienzo se mide en píxeles reales de la ventana en vez de usar un
   viewBox fijo: con un viewBox fijo el plano quedaba con franjas negras
   enormes arriba y abajo en una ventana angosta y alta, como la del
   teléfono.
   ------------------------------------------------------------------ */
const MARGIN = 20;
const STREET = 24;

/** Tamaño mínimo del plano; por debajo de esto el SVG deja scroll. */
const MIN_W = 300;
const MIN_H = 340;

interface Layout {
  viewW: number;
  viewH: number;
  blockW: number;
  blockH: number;
}

function layoutFor(width: number, height: number): Layout {
  const viewW = Math.max(MIN_W, width);
  const viewH = Math.max(MIN_H, height);

  return {
    viewW,
    viewH,
    blockW: (viewW - MARGIN * 2 - STREET * 2) / 3,
    blockH: (viewH - MARGIN * 2 - STREET * 2) / 3,
  };
}

function blockX(col: number, l: Layout): number {
  return MARGIN + col * (l.blockW + STREET);
}

function blockY(row: number, l: Layout): number {
  return MARGIN + row * (l.blockH + STREET);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * El texto del plano escala con la manzana.
 *
 * Con un tamaño fijo, en el teléfono los rótulos salían por fuera del
 * bloque y se pisaban entre zonas vecinas.
 */
function titleSize(l: Layout): number {
  return clamp(l.blockW / 8.5, 11, 20);
}

function metaSize(l: Layout): number {
  return clamp(l.blockW / 15, 8.5, 13);
}

/** Ancho aproximado de un texto en la fuente del sistema. */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.52;
}

/** Corta un nombre que no entra en el ancho disponible. */
function fitText(text: string, maxWidth: number, fontSize: number): string {
  if (textWidth(text, maxWidth ? fontSize : fontSize) <= maxWidth) return text;

  const max = Math.floor(maxWidth / (fontSize * 0.52));

  if (max <= 1) return "…";

  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Primera variante del rótulo que entra en la manzana.
 *
 * Se prueba de la más completa a la más corta: así una ventana ancha
 * muestra todo y una angosta muestra lo esencial, sin cortar a mitad de
 * palabra por un umbral inventado.
 */
function pickLabel(
  candidates: string[],
  maxWidth: number,
  fontSize: number,
): string {
  for (const text of candidates) {
    if (textWidth(text, fontSize) <= maxWidth) return text;
  }

  return fitText(candidates[candidates.length - 1], maxWidth, fontSize);
}

/**
 * Generador pseudoaleatorio con semilla.
 *
 * Los edificios tienen que quedar en el mismo lugar en cada render: con
 * Math.random el barrio entero se reacomodaba en cada tick del mundo.
 */
function seeded(seed: string): () => number {
  let h = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: number;
}

/**
 * Edificios de una manzana: más lugares creados, más construcción.
 *
 * Se dibujan como una silueta apoyada en el borde de abajo, no repartidos
 * en una grilla: en una ventana baja la grilla los achataba hasta que
 * parecían rayas horizontales en vez de edificios.
 */
function buildingsFor(zone: ZoneSnapshot, l: Layout): Building[] {
  const random = seeded(zone.id);
  const count = Math.min(14, 6 + Math.round(zone.places * 1.2));
  const out: Building[] = [];

  const padX = 13;
  const top = 24 + titleSize(l) + metaSize(l);
  const floor = l.blockH - 14;
  const usableW = l.blockW - padX * 2;
  const usableH = Math.max(18, floor - top);

  const slot = usableW / count;
  const w = Math.max(4, Math.min(22, slot * 0.72));

  for (let i = 0; i < count; i += 1) {
    const h = usableH * (0.34 + random() * 0.62);

    out.push({
      x: padX + i * slot + (slot - w) / 2,
      y: floor - h,
      w,
      h,
      tone: 0.16 + random() * 0.26,
    });
  }

  return out;
}

/** Puntos de la gente que está en la zona ahora mismo. */
function peopleDots(zone: ZoneSnapshot, l: Layout): { x: number; y: number }[] {
  const random = seeded(`${zone.id}-gente`);
  const count = Math.min(22, zone.present);
  const out: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    out.push({
      x: 14 + random() * Math.max(10, l.blockW - 28),
      y:
        22 +
        titleSize(l) +
        metaSize(l) +
        random() * Math.max(8, l.blockH - 36 - titleSize(l) - metaSize(l)),
    });
  }

  return out;
}

/**
 * Plano del mundo de ÑANDE.
 *
 * Cada manzana es una zona temática. Se ve cuánto se construyó (los
 * edificios salen de los lugares creados) y quién anda por ahí ahora
 * mismo (los puntitos salen de la rutina diaria de los habitantes).
 */
function WorldMapView({ kernel }: WorldMapViewProps) {
  const readZones = () =>
    kernel.map.snapshot(
      // Antes esto se llamaba sin presencia, así que el mapa decía
      // "0 ahora" en todas las zonas a cualquier hora del día.
      kernel.worldEngine.presenceByZone(kernel.world.getState().clock.hour),
    );

  const [zones, setZones] = useState<ZoneSnapshot[]>(readZones);
  const [selected, setSelected] = useState<string | null>(null);

  // El plano se dibuja a la medida de la ventana, así que hay que saber
  // cuánto mide.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });

  useEffect(() => {
    const node = canvasRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;

      setSize({
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const layout = layoutFor(size.width, size.height);

  // El mapa se refresca cuando aparecen entidades nuevas en el mundo.
  useEffect(() => {
    const refresh = () => setZones(readZones());

    const unsubs = [
      kernel.events.subscribe("world.entity.created", refresh),
      kernel.events.subscribe("world.tick", refresh),
    ];

    return () => {
      for (const off of unsubs) {
        off();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kernel]);

  const selectedZone = zones.find((z) => z.id === selected);

  // Los lugares de la zona elegida se derivan durante el render: dependen
  // solo de la selección y del estado actual del mundo (zones refresca).
  const places: MapPlace[] = selected ? kernel.map.placesInZone(selected) : [];

  const totals = useMemo(
    () => ({
      residents: zones.reduce((sum, z) => sum + z.residents, 0),
      places: zones.reduce((sum, z) => sum + z.places, 0),
      present: zones.reduce((sum, z) => sum + z.present, 0),
    }),
    [zones],
  );

  return (
    <div className="nd-map">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "12px 14px",
          borderBottom: "1px solid var(--nd-border)",
          background: "var(--nd-surface-2)",
        }}
      >
        <AppIcon id="map" size={30} />

        <div style={{ minWidth: 0 }}>
          <h2>Plano de ÑANDE</h2>
          <div
            className="nd-app-head__sub"
            style={{ display: "flex", flexWrap: "wrap", gap: "0 8px" }}
          >
            <span>{totals.residents} habitantes</span>
            <span>· {totals.places} lugares</span>
            <span style={{ color: "var(--nd-ok)" }}>
              · {totals.present} en la calle
            </span>
          </div>
        </div>
      </div>

      <div className="nd-map__canvas" ref={canvasRef}>
        <svg
          className="nd-map__svg"
          viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern
              id="nd-asphalt"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <rect width="24" height="24" fill="#0d1620" />
              <circle cx="6" cy="6" r="0.8" fill="rgba(255,255,255,0.035)" />
              <circle cx="18" cy="15" r="0.8" fill="rgba(255,255,255,0.03)" />
            </pattern>
          </defs>

          <rect width={layout.viewW} height={layout.viewH} fill="url(#nd-asphalt)" />

          {/* Avenidas: la línea punteada del medio de cada calle. */}
          <g
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.6"
            strokeDasharray="12 12"
          >
            {[0, 1].map((i) => {
              const x = blockX(i, layout) + layout.blockW + STREET / 2;
              const y = blockY(i, layout) + layout.blockH + STREET / 2;

              return [
                <line
                  key={`v${i}`}
                  x1={x}
                  y1={MARGIN}
                  x2={x}
                  y2={layout.viewH - MARGIN}
                />,
                <line
                  key={`h${i}`}
                  x1={MARGIN}
                  y1={y}
                  x2={layout.viewW - MARGIN}
                  y2={y}
                />,
              ];
            })}
          </g>

          {zones.map((zone) => {
            const x = blockX(zone.col, layout);
            const y = blockY(zone.row, layout);
            const active = selected === zone.id;

            return (
              <g
                key={zone.id}
                className="nd-map__zone"
                transform={`translate(${x} ${y})`}
                onClick={() =>
                  setSelected((current) =>
                    current === zone.id ? null : zone.id,
                  )
                }
              >
                <title>{zone.description}</title>

                <rect
                  width={layout.blockW}
                  height={layout.blockH}
                  rx="14"
                  fill={zone.color}
                  stroke={active ? "var(--nd-accent)" : "rgba(255,255,255,0.11)"}
                  strokeWidth={active ? 2.6 : 1.2}
                />

                {/* Vereda. */}
                <rect
                  x="6"
                  y="6"
                  width={layout.blockW - 12}
                  height={layout.blockH - 12}
                  rx="10"
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />

                {buildingsFor(zone, layout).map((b, i) => (
                  <g key={i}>
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      rx="2"
                      fill={`rgba(255,255,255,${b.tone})`}
                    />
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={Math.min(4, b.h)}
                      rx="2"
                      fill="rgba(255,255,255,0.16)"
                    />
                  </g>
                ))}

                {peopleDots(zone, layout).map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3"
                    fill="var(--nd-ok)"
                    opacity="0.9"
                  />
                ))}

                <text
                  x="13"
                  y={13 + titleSize(layout)}
                  fill="rgba(255,255,255,0.96)"
                  fontSize={titleSize(layout)}
                  fontWeight="650"
                  fontFamily="var(--nd-sans)"
                >
                  {fitText(zone.name, layout.blockW - 26, titleSize(layout))}
                </text>

                <text
                  x="13"
                  y={17 + titleSize(layout) + metaSize(layout)}
                  fill="rgba(255,255,255,0.62)"
                  fontSize={metaSize(layout)}
                  fontFamily="var(--nd-sans)"
                >
                  {pickLabel(
                    [
                      `${zone.residents} viven · ${zone.places} lugares · ${zone.present} ahora`,
                      `${zone.residents} viven · ${zone.present} ahora`,
                      `${zone.present} ahora`,
                    ],
                    layout.blockW - 26,
                    metaSize(layout),
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="nd-map__side">
        {selectedZone ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h3>{selectedZone.name}</h3>
              <span className="nd-app-head__sub">
                {selectedZone.description}
              </span>
              <button
                className="nd-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => setSelected(null)}
              >
                Cerrar
              </button>
            </div>

            {places.length === 0 ? (
              <p
                style={{
                  marginTop: 10,
                  color: "var(--nd-text-faint)",
                  fontSize: 13,
                }}
              >
                Todavía no hay lugares en esta zona. Los habitantes los van
                creando solos con el paso de los días.
              </p>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(190px, 1fr))",
                  gap: 8,
                }}
              >
                {places.map((place) => (
                  <div key={place.id} className="nd-card">
                    <strong style={{ fontSize: 13 }}>{place.name}</strong>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--nd-text-dim)",
                        marginTop: 3,
                      }}
                    >
                      {place.type} · por {place.ownerName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p
            style={{
              color: "var(--nd-text-dim)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Tocá una manzana para ver qué hay en esa zona.
          </p>
        )}
      </div>
    </div>
  );
}

export default WorldMapView;
