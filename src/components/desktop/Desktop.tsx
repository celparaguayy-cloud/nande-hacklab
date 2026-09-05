import { useMemo } from "react";
import WindowManager from "../window/WindowManager";
import Terminal from "../terminal/Terminal";
import { Files } from "../files/Files";
import { ProcessMonitor } from "../processes/ProcessMonitor";
import { Settings } from "../settings/Settings";
import { NetworkManager } from "../network/NetworkManager";
import Browser from "../browser/Browser";
import { VirtualKernel } from "../../core/VirtualKernel";

const iconStyle = {
  width: "90px",
  height: "90px",
  background: "rgba(20, 27, 35, 0.9)",
  border: "1px solid #34414d",
  borderRadius: "12px",
  color: "#e6edf3",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  cursor: "pointer",
};

function Desktop() {
  const kernel = useMemo(() => new VirtualKernel(), []);

  function openWindow(id: string) {
    const nandeWindow = window as Window & {
      openNandeWindow?: (id: string) => void;
    };

    nandeWindow.openNandeWindow?.(id);
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background:
          "radial-gradient(circle at top right, #17212b 0%, #080b10 55%, #05070a 100%)",
        color: "#e6edf3",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          boxSizing: "border-box",
          background: "rgba(8, 11, 16, 0.92)",
          borderBottom: "1px solid #26313b",
          fontSize: "14px",
        }}
      >
        <strong>ÑANDE OS</strong>

        <div>
          LAB • student • online
        </div>
      </div>

      <div
        style={{
          padding: "24px",
          display: "flex",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => openWindow("terminal")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            &gt;_
          </div>
          Terminal
        </button>

        <button
          onClick={() => openWindow("files")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            📁
          </div>
          Files
        </button>

        <button
          onClick={() => openWindow("processes")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            📊
          </div>
          Processes
        </button>

        <button
          onClick={() => openWindow("settings")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            ⚙️
          </div>
          Settings
        </button>

        <button
          onClick={() => openWindow("network")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🌐
          </div>
          Network
        </button>

        
        <button
          onClick={() => openWindow("browser")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🌍
          </div>
          Browser
        </button>
      </div>

      <WindowManager
        apps={{
          terminal: <Terminal kernel={kernel} />,
          files: <Files kernel={kernel} />,
          processes: <ProcessMonitor kernel={kernel} />,
          settings: <Settings kernel={kernel} />,
          network: <NetworkManager kernel={kernel} />,
          browser: <Browser kernel={kernel} />,
        }}
      />
    </div>
  );
}

export default Desktop;
