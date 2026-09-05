import { useState } from "react";
import { VirtualKernel } from "../../core/VirtualKernel";
import { WALLPAPERS, ACCENTS } from "../../core/desktop/Appearance";

interface SettingsProps {
  kernel: VirtualKernel;
}

export function Settings({ kernel }: SettingsProps) {
  const [hostname, setHostname] = useState(
    kernel.os.getState().hostname,
  );
  const [message, setMessage] = useState("");
  const [appearance, setAppearance] = useState(() =>
    kernel.appearance.getState(),
  );

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
