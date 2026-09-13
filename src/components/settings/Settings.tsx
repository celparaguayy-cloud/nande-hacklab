import { useState } from "react";
import { VirtualKernel } from "../../core/VirtualKernel";
import { WALLPAPERS, ACCENTS } from "../../core/desktop/Appearance";
import { sound } from "../../core/audio/Sound";

interface SettingsProps {
  kernel: VirtualKernel;
}

export function Settings({ kernel }: SettingsProps) {
  const [hostname, setHostname] = useState(
    kernel.os.getState().hostname,
  );
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(() => sound.isMuted());
  const [appearance, setAppearance] = useState(() =>
    kernel.appearance.getState(),
  );
  const [ai, setAi] = useState(() => kernel.ai.config());
  const refreshAi = () => setAi(kernel.ai.config());
  const [aiTest, setAiTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [aiTesting, setAiTesting] = useState(false);
  const testAi = async () => {
    setAiTesting(true);
    setAiTest(null);
    try {
      setAiTest(await kernel.ai.testConnection());
    } catch (e) {
      setAiTest({ ok: false, message: e instanceof Error ? e.message : "error" });
    } finally {
      setAiTesting(false);
    }
  };

  const chooseWallpaper = (id: string) => {
    kernel.appearance.setWallpaper(id);
    setAppearance(kernel.appearance.getState());
  };

  const chooseAccent = (color: string) => {
    kernel.appearance.setAccent(color);
    setAppearance(kernel.appearance.getState());
  };

  const os = kernel.os.getState();
  const world = kernel.world.getState();
  const user = kernel.users.getUser("student");

  const saveHostname = () => {
    const cleanHostname = hostname.trim();

    if (!cleanHostname) {
      setMessage("El hostname no puede estar vacío.");
      return;
    }

    kernel.os.setHostname(cleanHostname);
    setHostname(cleanHostname);
    setMessage("Hostname actualizado.");
  };

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        boxSizing: "border-box",
        padding: 18,
        background: "#101318",
        color: "#e8edf2",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ marginTop: 0 }}>⚙️ Settings</h2>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>🔊 Sonido</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#7f8995", fontSize: 13 }}>
            Efectos de sonido (teclas, logros, alertas)
          </span>
          <button
            onClick={() => { const m = sound.toggleMuted(); setMuted(m); if (!m) sound.play("click"); }}
            style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              border: "1px solid #2b3d4e",
              background: muted ? "transparent" : "rgba(124,196,255,0.15)",
              color: muted ? "#8b98a5" : "#7cc4ff", fontWeight: 600,
            }}
          >
            {muted ? "🔇 Silenciado" : "🔊 Activado"}
          </button>
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>🤖 Inteligencia artificial (opcional)</h3>
        <div style={{ color: "#7f8995", fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
          Por defecto el juego usa una IA local, offline. Si querés respuestas
          más ricas, pegá <b>tu propia</b> clave de Groq o Gemini: queda sólo en
          este dispositivo, nunca se sube a ningún lado. Sin clave, todo funciona igual.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {(["offline", "groq", "gemini"] as const).map((p) => (
            <button
              key={p}
              onClick={() => { kernel.ai.getSettings().setProvider(p); refreshAi(); }}
              style={{
                padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                border: "1px solid #2b3d4e",
                background: ai.provider === p ? "rgba(124,196,255,0.15)" : "transparent",
                color: ai.provider === p ? "#7cc4ff" : "#8b98a5", fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {p}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 12, color: kernel.ai.mode() === "connected" ? "#86efac" : "#8b98a5" }}>
            {kernel.ai.mode() === "connected" ? "● conectado" : "○ offline"}
          </span>
        </div>
        {ai.provider !== "offline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type="password"
              value={ai.apiKey}
              onChange={(e) => { kernel.ai.getSettings().setApiKey(e.target.value); refreshAi(); }}
              placeholder={`Tu clave de ${ai.provider}`}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #2b3d4e", background: "#0b1016", color: "#e6edf3", fontSize: 13 }}
            />
            <input
              value={ai.model}
              onChange={(e) => { kernel.ai.getSettings().setModel(e.target.value); refreshAi(); }}
              placeholder="modelo"
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #2b3d4e", background: "#0b1016", color: "#e6edf3", fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: "#7f8995" }}>
              Modelos sugeridos:
              <button style={hintChip} onClick={() => { kernel.ai.getSettings().setModel(ai.provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.0-flash"); refreshAi(); }}>
                {ai.provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.0-flash"}
              </button>
              {ai.provider === "gemini" && (
                <button style={hintChip} onClick={() => { kernel.ai.getSettings().setModel("gemini-2.5-flash"); refreshAi(); }}>gemini-2.5-flash</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={testAi}
                disabled={aiTesting}
                style={{ padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: "none", background: "#1d4ed8", color: "#fff", fontSize: 12.5, fontWeight: 600 }}
              >
                {aiTesting ? "Probando…" : "Probar conexión"}
              </button>
              <button
                onClick={() => { kernel.ai.getSettings().reset(); refreshAi(); setAiTest(null); }}
                style={{ padding: "6px 10px", borderRadius: 8, cursor: "pointer", border: "1px solid #2b3d4e", background: "transparent", color: "#fca5a5", fontSize: 12 }}
              >
                Borrar clave y volver a offline
              </button>
            </div>
            {aiTest && (
              <div style={{ fontSize: 12.5, padding: "8px 10px", borderRadius: 8, background: aiTest.ok ? "#052e1a" : "#2a1010", border: `1px solid ${aiTest.ok ? "#15803d" : "#7f1d1d"}`, color: aiTest.ok ? "#86efac" : "#fca5a5" }}>
                {aiTest.ok ? "✅ " : "⚠ "}{aiTest.message}
              </div>
            )}
            {ai.provider === "gemini" && (
              <div style={{ fontSize: 11, color: "#7f8995" }}>
                Clave gratis de Gemini: aistudio.google.com/apikey — anda desde el celu.
              </div>
            )}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>Sistema</h3>

        <InfoRow label="Sistema" value={os.name} />
        <InfoRow label="Versión" value={os.version} />
        <InfoRow label="Kernel" value={os.kernel} />
        <InfoRow label="Uptime" value={`${os.uptime} ticks`} />
        <InfoRow label="Estado" value={world.online ? "Online" : "Offline"} />
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>Usuario</h3>

        <InfoRow label="Usuario" value={user?.username ?? "student"} />
        <InfoRow label="UID" value={String(user?.uid ?? 1000)} />
        <InfoRow
          label="Home"
          value={user?.home ?? "/home/student"}
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>Hostname</h3>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <input
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            style={inputStyle}
          />

          <button onClick={saveHostname}>
            Guardar
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: 8,
              color: "#9ee6bd",
              fontSize: 12,
            }}
          >
            {message}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>Reloj virtual</h3>

        <InfoRow
          label="Día"
          value={String(world.clock.day)}
        />

        <InfoRow
          label="Hora"
          value={`${String(world.clock.hour).padStart(2, "0")}:${String(
            world.clock.minute,
          ).padStart(2, "0")}`}
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>🎨 Apariencia</h3>

        <div style={{ marginBottom: 8, color: "#7f8995", fontSize: 13 }}>
          Fondo del escritorio
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {WALLPAPERS.map((wp) => (
            <button
              key={wp.id}
              onClick={() => chooseWallpaper(wp.id)}
              title={wp.name}
              style={{
                width: 64,
                height: 42,
                borderRadius: 8,
                cursor: "pointer",
                background: wp.css,
                border:
                  appearance.wallpaperId === wp.id
                    ? "2px solid #7cc4ff"
                    : "1px solid #34414d",
              }}
            />
          ))}
        </div>

        <div style={{ marginBottom: 8, color: "#7f8995", fontSize: 13 }}>
          Color de acento
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {ACCENTS.map((color) => (
            <button
              key={color}
              onClick={() => chooseAccent(color)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                background: color,
                border:
                  appearance.accent === color
                    ? "3px solid #e8edf2"
                    : "1px solid #34414d",
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        padding: "8px 0",
        borderBottom: "1px solid #222a33",
      }}
    >
      <span style={{ color: "#7f8995" }}>{label}</span>
      <span style={{ fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

const sectionStyle = {
  marginBottom: 16,
  padding: 14,
  border: "1px solid #29303a",
  borderRadius: 9,
  background: "#151a21",
};

const hintChip = {
  padding: "3px 8px",
  borderRadius: 999,
  cursor: "pointer",
  border: "1px solid #2b3d4e",
  background: "transparent",
  color: "#7cc4ff",
  fontSize: 11,
};

const titleStyle = {
  margin: "0 0 10px",
  fontSize: 14,
};

const inputStyle = {
  flex: 1,
  minWidth: 180,
  padding: "8px 10px",
  border: "1px solid #34414d",
  borderRadius: 6,
  background: "#0b0f14",
  color: "#e8edf2",
  fontFamily: "monospace",
  outline: "none",
};
