import { useEffect, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";

interface WorldMonitorProps {
  kernel: VirtualKernel;
}

function WorldMonitor({ kernel }: WorldMonitorProps) {
  // Resumen barato: contadores y ultimas entidades. Antes este componente
  // clonaba las 2000 personas dos veces por segundo para mostrar dos numeros.
  const [summary, setSummary] = useState(() => kernel.summary());

  useEffect(() => {
    const refresh = () => {
      setSummary(kernel.summary());
    };

    refresh();

    // Se observa el mundo por eventos en vez de sondearlo con un intervalo propio.
    const unsubscribeTick = kernel.events.subscribe(
      "world.tick",
      refresh,
    );

    const unsubscribeEntity = kernel.events.subscribe(
      "world.entity.created",
      refresh,
    );

    return () => {
      unsubscribeTick();
      unsubscribeEntity();
    };
  }, [kernel]);

  const entities = summary.recentEntities;
  const counts = summary.entityCountsByType;
  const events = summary.recentEvents;
  const news = summary.recentNews;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        boxSizing: "border-box",
        padding: "20px",
        background: "#0b0f14",
        color: "#e6edf3",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            ÑANDE WORLD
          </h2>

          <div
            style={{
              marginTop: "5px",
              color: "#8b98a5",
              fontSize: "13px",
            }}
          >
            Mundo virtual persistente
          </div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            background: "#13251c",
            color: "#7ee2a8",
            fontSize: "12px",
          }}
        >
          ● ACTIVO
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <Stat label="Habitantes" value={summary.peopleCount} />

        <Stat label="Online" value={summary.onlineCount} />

        <Stat label="Entidades" value={summary.entityCount} />

        <Stat label="Tick" value={summary.clock.tick} />

        <Stat label="Vínculos" value={summary.relationshipCount} />

        <Stat label="Noticias" value={summary.newsCount} />
      </div>

      <section>
        <h3 style={{ marginBottom: "12px" }}>
          Actividad del mundo
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
          }}
        >
          {Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div
                key={type}
                style={{
                  padding: "12px",
                  border: "1px solid #26313b",
                  borderRadius: "8px",
                  background: "#111820",
                }}
              >
                <div
                  style={{
                    color: "#8b98a5",
                    fontSize: "12px",
                    marginBottom: "5px",
                  }}
                >
                  {type}
                </div>

                <strong
                  style={{
                    fontSize: "22px",
                  }}
                >
                  {count}
                </strong>
              </div>
            ))}
        </div>
      </section>

      <section style={{ marginTop: "24px" }}>
        <h3 style={{ marginBottom: "12px" }}>
          Últimas entidades creadas
        </h3>

        {entities.length === 0 ? (
          <div
            style={{
              padding: "20px",
              border: "1px solid #26313b",
              borderRadius: "8px",
              color: "#8b98a5",
            }}
          >
            Todavía no se han creado entidades.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {entities.map((entity) => (
                <div
                  key={entity.id}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #26313b",
                    borderRadius: "8px",
                    background: "#111820",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >
                    <strong>
                      {entity.name}
                    </strong>

                    <span
                      style={{
                        color: "#8b98a5",
                        fontSize: "12px",
                      }}
                    >
                      {entity.type}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      color: "#8b98a5",
                      fontSize: "12px",
                    }}
                  >
                    {entity.id} · {entity.ownerId}
                  </div>
                </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: "24px" }}>
        <h3 style={{ marginBottom: "12px" }}>
          Últimas noticias
        </h3>

        {news.length === 0 ? (
          <Empty texto="El diario todavía no publicó nada." />
        ) : (
          <div style={listStyle}>
            {news.map((article) => (
              <div key={article.id} style={cardStyle}>
                <strong>{article.headline}</strong>

                <div style={metaStyle}>
                  {article.category} · tick {article.tick}
                  {article.relatedHostname
                    ? ` · ${article.relatedHostname}`
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: "24px" }}>
        <h3 style={{ marginBottom: "12px" }}>
          Actividad reciente
        </h3>

        {events.length === 0 ? (
          <Empty texto="Todavía no pasó nada en el mundo." />
        ) : (
          <div style={listStyle}>
            {events.map((event) => (
              <div key={event.id} style={cardStyle}>
                <div>{event.description}</div>

                <div style={metaStyle}>
                  {event.type} · tick {event.tick}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const listStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const cardStyle = {
  padding: "10px 12px",
  border: "1px solid #26313b",
  borderRadius: "8px",
  background: "#111820",
};

const metaStyle = {
  marginTop: "4px",
  color: "#8b98a5",
  fontSize: "12px",
};

function Empty({ texto }: { texto: string }) {
  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #26313b",
        borderRadius: "8px",
        color: "#8b98a5",
      }}
    >
      {texto}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: "15px",
        border: "1px solid #26313b",
        borderRadius: "8px",
        background: "#111820",
      }}
    >
      <div
        style={{
          color: "#8b98a5",
          fontSize: "12px",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <strong style={{ fontSize: "24px" }}>
        {value}
      </strong>
    </div>
  );
}

export default WorldMonitor;
