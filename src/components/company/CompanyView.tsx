import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { CONTROLS, ATTACKS, FOUNDING_COST } from "../../core/game/PlayerCompany";
import { sound } from "../../core/audio/Sound";

interface CompanyViewProps {
  kernel: VirtualKernel;
}

/**
 * Mi Empresa: fundás tu propia empresa y la DEFENDÉS. Blue Team desde la
 * silla del dueño — cada control que activás repele un ataque; si te falta,
 * te sacan plata. Entendés por qué importa cada control cuando el atacado
 * sos vos.
 */
function CompanyView({ kernel }: CompanyViewProps) {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);
  const [nombre, setNombre] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const offs = [
      kernel.events.subscribe("company.attack", () => { sound.play("alert"); refresh(); }),
      kernel.events.subscribe("player.xp", refresh),
    ];
    return () => { for (const off of offs) off(); };
  }, [kernel]);

  const day = () => Math.floor(kernel.world.getState().clock.tick / 1440) + 1;
  const empresa = kernel.company.get();

  if (!empresa) {
    const puede = kernel.player.wallet >= FOUNDING_COST;
    return (
      <div style={container}>
        <div style={hero}><div style={{ fontSize: 30 }}>🏢</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Fundá tu empresa</div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>Y después defendela de los ataques.</div>
          </div>
        </div>
        <div style={card}>
          <p style={{ marginTop: 0, fontSize: 13, opacity: 0.85 }}>
            Poné un nombre y arrancá. Cuesta <b>N$ {FOUNDING_COST}</b> (tenés N$ {kernel.player.wallet}).
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de tu empresa"
              style={inputStyle} />
            <button
              disabled={!puede || nombre.trim().length < 2}
              onClick={() => {
                if (kernel.player.spend(FOUNDING_COST) && kernel.company.found(nombre, day())) {
                  sound.play("success"); setAviso(""); refresh();
                } else setAviso("No se pudo fundar (¿nombre corto o sin plata?).");
              }}
              style={{ ...btn, opacity: puede && nombre.trim().length >= 2 ? 1 : 0.5 }}
            >Fundar</button>
          </div>
          {!puede ? <p style={{ color: "#ff9b7b", fontSize: 12 }}>Te falta plata. Hackeá algo primero. 😅</p> : null}
          {aviso ? <p style={{ color: "#ff9b7b", fontSize: 12 }}>{aviso}</p> : null}
        </div>
      </div>
    );
  }

  const activos = new Set(empresa.defenses);
  return (
    <div style={container}>
      <div style={hero}><div style={{ fontSize: 30 }}>🏢</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{empresa.name}</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>Fundada el día {empresa.foundedDay}</div>
        </div>
      </div>

      <div style={statRow}>
        <Stat v={`N$ ${empresa.treasury}`} l="caja" />
        <Stat v={`${empresa.repelidos}`} l="ataques repelidos" />
        <Stat v={`${empresa.sufridos}`} l="ataques sufridos" />
      </div>

      {empresa.ultimoParte ? (
        <div style={{ ...card, borderLeft: `3px solid ${empresa.sufridos > 0 && empresa.ultimoParte.includes("perdiste") ? "#ff7b72" : "#7ee787"}` }}>
          <b>Último parte:</b> {empresa.ultimoParte}
        </div>
      ) : null}

      <h3 style={sectionTitle}>Controles de seguridad</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {CONTROLS.map((c) => {
          const on = activos.has(c.id);
          const atk = ATTACKS.find((a) => a.id === c.repele);
          return (
            <div key={c.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <strong>{on ? "✅ " : ""}{c.nombre}</strong>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Frena: {atk?.texto}</div>
              </div>
              {on ? (
                <span style={{ color: "#7ee787", fontSize: 12, fontWeight: 700 }}>ACTIVO</span>
              ) : (
                <button
                  disabled={empresa.treasury < c.costo}
                  onClick={() => { if (kernel.company.addControl(c.id)) { sound.play("click"); refresh(); } }}
                  style={{ ...btn, opacity: empresa.treasury >= c.costo ? 1 : 0.5, whiteSpace: "nowrap" }}
                >Activar N$ {c.costo}</button>
              )}
            </div>
          );
        })}
      </div>

      <h3 style={sectionTitle}>Poné a prueba tus defensas</h3>
      <button
        onClick={() => {
          const idx = Math.floor(Math.random() * ATTACKS.length);
          kernel.company.receiveAttack(idx);
          sound.play("alert"); refresh();
        }}
        style={{ ...btn, background: "var(--nd-danger, #dc2626)", color: "#fff" }}
      >Simular un ataque ahora</button>
      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
        El mundo también te ataca solo cada tanto: si dejaste un hueco, te sacan
        plata. Activá el control que frena cada técnica.
      </p>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "10px 8px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>{v}</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{l}</div>
    </div>
  );
}

const accent = "#7cc4ff";
const container: CSSProperties = { padding: 16, color: "#e6edf3", overflowY: "auto", height: "100%" };
const hero: CSSProperties = { display: "flex", gap: 12, alignItems: "center", marginBottom: 14 };
const statRow: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 };
const card: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 };
const sectionTitle: CSSProperties = { margin: "18px 0 10px", fontSize: 16 };
const inputStyle: CSSProperties = { flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.25)", color: "#e6edf3", font: "inherit", fontSize: 13 };
const btn: CSSProperties = { padding: "9px 16px", borderRadius: 8, border: "none", background: "rgba(124,196,255,0.15)", color: accent, fontWeight: 700, cursor: "pointer", fontSize: 13 };

export default CompanyView;
