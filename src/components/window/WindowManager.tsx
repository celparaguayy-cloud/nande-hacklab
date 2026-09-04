import { useState, type PointerEvent, type ReactNode } from "react";

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

const [dragging, setDragging] = useState<{
id: string;
offsetX: number;
offsetY: number;
} | null>(null);

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

function startDragging(
event: PointerEvent<HTMLDivElement>,
window: WindowState,
) {
if (window.maximized) return;

const target = event.currentTarget.parentElement;

if (!target) return;

const rect = target.getBoundingClientRect();

setDragging({
  id: window.id,
  offsetX: event.clientX - rect.left,
  offsetY: event.clientY - rect.top,
});

event.currentTarget.setPointerCapture(event.pointerId);

}

function dragWindow(event: PointerEvent<HTMLDivElement>) {
if (!dragging) return;

setWindows((current) =>
  current.map((window) =>
    window.id === dragging.id
      ? {
          ...window,
          x: Math.max(0, event.clientX - dragging.offsetX),
          y: Math.max(42, event.clientY - dragging.offsetY),
        }
      : window,
  ),
);

}

function stopDragging() {
setDragging(null);
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
        <div
          onPointerDown={(event) =>
            startDragging(event, window)
          }
          onPointerMove={dragWindow}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
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
            cursor: window.maximized ? "default" : "move",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          <span>{window.title}</span>

          <div
            style={{
              display: "flex",
              gap: "6px",
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
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
