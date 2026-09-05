import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { ZoneSnapshot } from "../../core/world/WorldMap";
import type { MapPlace } from "../../core/world/WorldMap";

interface WorldMapViewProps {
  kernel: VirtualKernel;
}

/**
 * Mapa 2D del mundo: una grilla de zonas temáticas. Cada celda muestra
 * cuánta gente vive ahí y cuántos lugares se crearon. Al tocar una zona
 * se ven sus lugares.
 */
function WorldMapView({ kernel }: WorldMapViewProps) {
  const [zones, setZones] = useState<ZoneSnapshot[]>(() =>
    kernel.map.snapshot(),
  );
  const [selected, setSelected] = useState<string | null>(null);

  // El mapa se refresca cuando aparecen entidades nuevas en el mundo.
  useEffect(() => {
    const refresh = () => setZones(kernel.map.snapshot());

    const unsubs = [
      kernel.events.subscribe("world.entity.created", refresh),
      kernel.events.subscribe("world.tick", refresh),
    ];

    return () => {
      for (const off of unsubs) {
        off();
      }
    };
  }, [kernel]);

  const selectedZone = zones.find((z) => z.id === selected);

  // Los lugares de la zona elegida se derivan durante el render: dependen
  // solo de la selección y del estado actual del mundo (zones refresca).
  const places: MapPlace[] = selected
    ? kernel.map.placesInZone(selected)
    : [];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>🗺️ ÑANDE Map</h2>
        <span style={{ color: "#8b98a5", fontSize: 13 }}>
          El mundo virtual, por zonas
        </span>
      </div>

      <div style={gridStyle}>
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() =>
              setSelected((current) =>
                current === zone.id ? null : zone.id,
              )
            }
            style={{
              ...cellStyle,
              gridColumn: zone.col + 1,
              gridRow: zone.row + 1,
              background: zone.color,
              outline:
                selected === zone.id ? "2px solid #7cc4ff" : "none",
            }}
            title={zone.description}
          >
            <div style={{ fontSize: 30 }}>{zone.icon}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{zone.name}</div>
            <div style={cellMetaStyle}>
              👤 {zone.residents} · 📍 {zone.places}
            </div>
          </button>
        ))}
      </div>

      {selectedZone && (
        <section style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>
            {selectedZone.icon} {selectedZone.name}
          </h3>
          <p style={{ color: "#8b98a5", marginTop: 0 }}>
            {selectedZone.description}
          </p>

          {places.length === 0 ? (
            <p style={{ color: "#8b98a5" }}>
              Todavía no hay lugares en esta zona.
            </p>
          ) : (
            <div style={placesStyle}>
              {places.map((place) => (
                <div key={place.id} style={placeCardStyle}>
                  <strong>{place.name}</strong>
                  <div style={cellMetaStyle}>
                    {place.type} · por {place.ownerName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "auto",
  boxSizing: "border-box",
  padding: 18,
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
};

const headerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  marginBottom: 16,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gridTemplateRows: "repeat(3, 1fr)",
  gap: 8,
  maxWidth: 560,
};

const cellStyle: CSSProperties = {
  border: "1px solid #26313b",
  borderRadius: 12,
  color: "#e6edf3",
  padding: "14px 8px",
  minHeight: 96,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const cellMetaStyle: CSSProperties = {
  color: "#cfd8e0",
  fontSize: 12,
  marginTop: 4,
};

const panelStyle: CSSProperties = {
  marginTop: 18,
  padding: 14,
  border: "1px solid #26313b",
  borderRadius: 10,
  background: "#111820",
};

const placesStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 8,
};

const placeCardStyle: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #26313b",
  borderRadius: 8,
  background: "#0b0f14",
};

export default WorldMapView;
