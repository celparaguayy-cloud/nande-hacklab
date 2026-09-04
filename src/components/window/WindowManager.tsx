import { useState } from "react";
import type { ReactNode } from "react";

interface WindowState {
id: string;
title: string;
minimized: boolean;
maximized: boolean;
x: number;
y: number;
width: number;
height: number;
}

interface WindowManagerProps {
children: ReactNode;
}

function WindowManager({ children }: WindowManagerProps) {
const [windows, setWindows] = useState<WindowState[]>([
{
id: "terminal",
title: "Terminal — student@nande-os",
minimized: false,
maximized: false,
x: 180,
y: 90,
width: 700,
height: 450,
},
]);

function updateWindow(
id: string,
changes: Partial<WindowState>,
) {
setWindows((current) =>
current.map((window) =>
window.id === id ? { ...window, ...changes } : window,
),
);
}

function closeWindow(id: string) {
setWindows((current) =>
current.filter((window) => window.id !== id),
);
}

return (
<>
{windows.map((window) => {
const style = window.maximized
? {
position: "absolute" as const,
top: "42px",
left: "0",
width: "100vw",
height: "calc(100vh - 42px)",
}
: {
position: "absolute" as const,
top: "${window.y}px",
left: "${window.x}px",
width: "${window.width}px",
height: "${window.height}px",
};

    return (
      <div
        key={window.id}
        style={{
          ...style,
          display: window.minimized ? "none" : "block",
          background: "#0b0f14",
          border: "1px solid #34414d",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
          zIndex: 10,
        }}
      >
        {/* Barra da janela */}
        <div
          style={{
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            boxSizing: "border-box",
            background: "#111820",
            borderBottom: "1px solid #26313b",
            color: "#e6edf3",
            fontSize: "13px",
          }}
        >
          <span>{window.title}</span>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() =>
                updateWindow(window.id, {
                  minimized: true,
                })
              }
              style={buttonStyle}
            >
              −
            </button>

            <button
              onClick={() =>
                updateWindow(window.id, {
                  maximized: !window.maximized,
                })
              }
              style={buttonStyle}
            >
              □
            </button>

            <button
              onClick={() => closeWindow(window.id)}
              style={buttonStyle}
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div
          style={{
            width: "100%",
            height: "calc(100% - 36px)",
          }}
        >
          {window.id === "terminal" ? children : null}
        </div>
      </div>
    );
  })}
</>

);
}

const buttonStyle: React.CSSProperties = {
width: "28px",
height: "24px",
border: "1px solid #34414d",
borderRadius: "5px",
background: "#18212b",
color: "#d7f9e9",
cursor: "pointer",
};

export default WindowManager;
