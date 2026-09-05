import { useState } from "react";
import type { WiFiNetwork } from "../../core/hardware/VirtualWiFi";
import { VirtualKernel } from "../../core/VirtualKernel";

interface NetworkManagerProps {
  kernel: VirtualKernel;
}

export function NetworkManager({
  kernel,
}: NetworkManagerProps) {
  const [online, setOnline] = useState(
    kernel.world.getState().online,
  );
  const [connected, setConnected] = useState(
    () => kernel.wifi.current(),
  );
  const [feedback, setFeedback] = useState("");
  const networks: WiFiNetwork[] = kernel.wifi.scan();

  const connectTo = (net: WiFiNetwork) => {
    // Para redes protegidas se pide la contraseña ficticia de laboratorio.
    let password: string | undefined;

    if (net.security !== "abierta") {
      password =
        window.prompt(`Contraseña de "${net.ssid}"`) ?? undefined;

      if (password === undefined) {
        return;
      }
    }

    const result = kernel.wifi.connect(net.ssid, password);
    setFeedback(result.message);
    setConnected(kernel.wifi.current());
  };

  const disconnectWifi = () => {
    const result = kernel.wifi.disconnect();
    setFeedback(result.message);
    setConnected(kernel.wifi.current());
  };

  const toggleNetwork = () => {
    const next = !online;
    kernel.world.setOnline(next);
    setOnline(next);
  };

  const world = kernel.world.getState();

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
      <h2 style={{ marginTop: 0 }}>🌐 Network Manager</h2>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>Estado de red</h3>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: online ? "#65d391" : "#d36b6b",
            }}
          />

          <strong>
            {online ? "Conectado" : "Desconectado"}
          </strong>
        </div>

        <button onClick={toggleNetwork}>
          {online
            ? "Desconectar"
            : "Conectar"}
        </button>
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>Interfaz virtual</h3>

        <InfoRow label="Interfaz" value="eth0" />
        <InfoRow
          label="IP"
          value={online ? "10.10.0.10" : "—"}
        />
        <InfoRow
          label="Gateway"
          value={online ? "10.10.0.1" : "—"}
        />
        <InfoRow
          label="DNS"
          value={online ? "10.10.0.53" : "—"}
        />
        <InfoRow
          label="Hostname"
          value={world.hostname}
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>Entorno</h3>

        <InfoRow
          label="Red"
          value="ÑANDE Virtual Network"
        />

        <InfoRow
          label="Modo"
          value="Sandbox"
        />

        <InfoRow
          label="Internet real"
          value="No utilizada"
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={titleStyle}>📶 WiFi virtual</h3>

        {feedback && (
          <div
            style={{
              marginBottom: 10,
              padding: "6px 10px",
              borderRadius: 6,
              background: "#12202a",
              color: "#7ee2a8",
              fontSize: 13,
            }}
          >
            {feedback}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {networks.map((net) => {
            const isHere = net.ssid === connected;

            return (
              <div
                key={net.ssid}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  border: "1px solid #29303a",
                  borderRadius: 8,
                  background: isHere ? "#12251c" : "#101820",
                }}
              >
                <div>
                  <div>
                    {net.security === "abierta" ? "" : "🔒 "}
                    {net.ssid}
                    {isHere ? "  ✓" : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#7f8995" }}>
                    {net.security} · señal {net.signal}%
                  </div>
                </div>

                {isHere ? (
                  <button onClick={disconnectWifi} style={wifiBtnStyle}>
                    Desconectar
                  </button>
                ) : (
                  <button onClick={() => connectTo(net)} style={wifiBtnStyle}>
                    Conectar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const wifiBtnStyle = {
  padding: "6px 12px",
  border: "1px solid #34414d",
  borderRadius: 6,
  background: "#1b2430",
  color: "#e8edf2",
  cursor: "pointer",
  fontSize: 13,
};

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
      <span style={{ fontFamily: "monospace" }}>
        {value}
      </span>
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
