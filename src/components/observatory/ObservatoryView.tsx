import { useEffect, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import "./observatory.css";

interface Props {
  kernel: VirtualKernel;
}

type Tone = "ok" | "warn" | "crit" | "idle";

interface Tile {
  name: string;
  chip: string;
  value: string;
  sub: string;
  tone: Tone;
}

/**
 * ÑANDE Observatory — el panel de diagnóstico del runtime (Directiva §190).
 *
 * NO inventa nada: lee kernel.worldState() (la vista agregada de todos los
 * runtimes-fuente) y muestra la SALUD real del mundo — hosts, servicios,
 * alertas, IA, mundo vivo y los últimos eventos del runtime. Es "observabilidad
 * de verdad": si acá se ve algo, es porque el runtime lo sabe, no la pantalla.
 */
export default function ObservatoryView({ kernel }: Props) {
  const [, setTick] = useState(0);

  // Refresco acotado: cada 1.5s re-leemos el estado (barato; no re-render por
  // cada evento del mundo, que serían miles).
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const ws = safeWorldState(kernel);
  const hostsTotal = ws.hosts.length;
  const hostsUp = ws.hosts.filter((h) => h.up).length;
  const servicesRunning = ws.hosts.reduce(
    (n, h) => n + h.services.filter((s) => s.state === "running").length,
    0,
  );
  const alerts = ws.alerts;
  const alertsTotal =
    alerts.info + alerts.low + alerts.medium + alerts.high + alerts.critical;
  const socTone: Tone =
    alerts.critical > 0 ? "crit" : alerts.high + alerts.medium > 0 ? "warn" : "ok";

  const tiles: Tile[] = [
    { name: "KERNEL", chip: "ACTIVO", value: "OK", sub: `uptime ${ws.clock.tick}`, tone: "ok" },
    { name: "RED", chip: "ONLINE", value: `${hostsUp}/${hostsTotal}`, sub: "hosts arriba", tone: hostsUp === hostsTotal ? "ok" : "warn" },
    { name: "SERVICIOS", chip: "RUNNING", value: String(servicesRunning), sub: "escuchando", tone: "ok" },
    { name: "IA", chip: ws.ai === "connected" ? "CONECTADA" : "OFFLINE", value: ws.ai === "connected" ? "◆" : "○", sub: ws.ai === "connected" ? "proveedor propio" : "local determinista", tone: ws.ai === "connected" ? "idle" : "ok" },
    { name: "MUNDO", chip: "VIVO", value: `${ws.online}`, sub: `en línea / ${ws.people}`, tone: "ok" },
    { name: "SOC", chip: (ws.alertTop || "sin alertas").toUpperCase(), value: String(alertsTotal), sub: "alertas totales", tone: socTone },
    { name: "DATOS", chip: "SQL", value: String(ws.databases.length), sub: "bases + " + ws.tools.length + " tools", tone: "ok" },
    { name: "PERSIST", chip: "SNAPSHOTS", value: String(ws.snapshots.length), sub: "fotos guardadas", tone: "ok" },
  ];

  const overall: Tone = socTone === "crit" ? "crit" : hostsUp < hostsTotal || socTone === "warn" ? "warn" : "ok";
  const statusText =
    overall === "crit" ? "ALERTA CRÍTICA" : overall === "warn" ? "ATENCIÓN" : "SISTEMAS NOMINALES";

  const day = ws.clock.day ?? Math.floor(ws.clock.tick / 1440) + 1;
  const hh = String(ws.clock.hour ?? 0).padStart(2, "0");
  const mm = String(ws.clock.minute ?? 0).padStart(2, "0");

  return (
    <div className="obs">
      <header className="obs__head">
        <span className="obs__title">◈ ÑANDE OBSERVATORY</span>
        <span className="obs__status" data-tone={overall}>{statusText}</span>
        <span className="obs__clock">DÍA {day} · {hh}:{mm} · uptime {ws.clock.tick}</span>
      </header>

      <div className="obs__grid">
        {tiles.map((t) => (
          <div key={t.name} className="obs__tile" data-tone={t.tone}>
            <div className="obs__tile-top">
              <span className="obs__tile-name">{t.name}</span>
              <span className="obs__tile-chip">{t.chip}</span>
            </div>
            <div className="obs__tile-value">{t.value}</div>
            <div className="obs__tile-sub">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="obs__row">
        <div className="obs__panel">
          <h3>MEDIDORES EN VIVO</h3>
          <SegBar label="Hosts" value={hostsUp} max={Math.max(1, hostsTotal)} color="var(--obs-green)" num={`${hostsUp}/${hostsTotal}`} />
          <SegBar label="Online" value={ws.online} max={Math.max(1, ws.people)} color="var(--obs-cyan)" num={`${ws.online}`} />
          <SegBar label="Crít" value={alerts.critical} max={Math.max(1, alertsTotal)} color="var(--obs-red)" num={String(alerts.critical)} />
          <SegBar label="Alta" value={alerts.high} max={Math.max(1, alertsTotal)} color="var(--obs-amber)" num={String(alerts.high)} />
          <SegBar label="Media" value={alerts.medium} max={Math.max(1, alertsTotal)} color="var(--obs-magenta)" num={String(alerts.medium)} />
          <SegBar label="Baja" value={alerts.low + alerts.info} max={Math.max(1, alertsTotal)} color="var(--obs-cyan)" num={String(alerts.low + alerts.info)} />
        </div>

        <div className="obs__panel">
          <h3>EVENTOS DEL RUNTIME</h3>
          <div className="obs__log">
            {ws.runtimeEvents.length === 0 ? (
              <div className="obs__log-empty">Silencio en el cable. Hacé algo y aparece acá.</div>
            ) : (
              ws.runtimeEvents.slice(0, 14).map((e, i) => (
                <div key={i} className="obs__log-line">
                  <span className="obs__log-t">[{String(e.at ?? "")}]</span>{" "}
                  <span className="obs__log-k">{e.kind ?? "evento"}</span>{" "}
                  {e.host ?? e.message ?? ""}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SegBar({
  label,
  value,
  max,
  color,
  num,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  num: string;
}) {
  const SEGMENTS = 20;
  const on = Math.round((Math.min(value, max) / max) * SEGMENTS);
  return (
    <div className="obs__bar-row">
      <span className="obs__bar-label">{label}</span>
      <div className="obs__bar" style={{ ["--barcolor" as string]: color }}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className="obs__seg" data-on={i < on ? 1 : 0} />
        ))}
      </div>
      <span className="obs__bar-num">{num}</span>
    </div>
  );
}

interface WSHost {
  hostname: string;
  up: boolean;
  services: { state: string }[];
}
interface WS {
  clock: { tick: number; day?: number; hour?: number; minute?: number };
  hosts: WSHost[];
  tools: unknown[];
  alerts: { info: number; low: number; medium: number; high: number; critical: number };
  alertTop: string | null;
  databases: unknown[];
  ai: string;
  people: number;
  online: number;
  snapshots: unknown[];
  runtimeEvents: { kind?: string; host?: string; message?: string; at?: number | string }[];
}

function safeWorldState(kernel: VirtualKernel): WS {
  const empty: WS = {
    clock: { tick: 0 },
    hosts: [],
    tools: [],
    alerts: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
    alertTop: null,
    databases: [],
    ai: "offline",
    people: 0,
    online: 0,
    snapshots: [],
    runtimeEvents: [],
  };
  try {
    return kernel.worldState() as unknown as WS;
  } catch {
    return empty;
  }
}
