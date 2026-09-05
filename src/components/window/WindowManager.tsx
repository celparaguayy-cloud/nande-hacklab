import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface WindowState {
  id: string;
  title: string;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface WindowManagerProps {
  apps: Record<string, ReactNode>;
}

function WindowManager({ apps }: WindowManagerProps) {
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
      zIndex: 10,
    },
  ]);

  const dragRef = useRef<DragState | null>(null);
  const zIndexRef = useRef(20);

  function bringToFront(id: string) {
    zIndexRef.current += 1;

    setWindows((current) =>
      current.map((win) =>
        win.id === id
          ? {
              ...win,
              zIndex: zIndexRef.current,
            }
          : win,
      ),
    );
  }

  function beginDrag(
    id: string,
    clientX: number,
    clientY: number,
  ) {
    const currentWindow = windows.find(
      (win) => win.id === id,
    );

    if (!currentWindow || currentWindow.maximized) {
      return;
    }

    dragRef.current = {
      id,
      offsetX: clientX - currentWindow.x,
      offsetY: clientY - currentWindow.y,
    };

    bringToFront(id);
  }

  function moveDrag(
    clientX: number,
    clientY: number,
  ) {
    const drag = dragRef.current;

    if (!drag) return;

    setWindows((current) =>
      current.map((win) =>
        win.id === drag.id
          ? {
              ...win,
              x: Math.max(
                0,
                clientX - drag.offsetX,
              ),
              y: Math.max(
                42,
                clientY - drag.offsetY,
              ),
            }
          : win,
      ),
    );
  }

  function endDrag() {
    dragRef.current = null;
  }

  function minimizeWindow(id: string) {
    setWindows((current) =>
      current.map((win) =>
        win.id === id
          ? {
              ...win,
              minimized: true,
            }
          : win,
      ),
    );
  }

  function maximizeWindow(id: string) {
    setWindows((current) =>
      current.map((win) =>
        win.id === id
          ? {
              ...win,
              maximized: !win.maximized,
              minimized: false,
            }
          : win,
      ),
    );
  }

  function closeWindow(id: string) {
    endDrag();

    setWindows((current) =>
      current.filter((win) => win.id !== id),
    );
  }

  function getWindowTitle(id: string) {
    if (id === "terminal") {
      return "Terminal — student@nande-os";
    }

    if (id === "files") {
      return "Files — /home/student";
    }

    return id;
  }

  function openWindow(id: string) {
    if (!apps[id]) {
      return;
    }

    setWindows((current) => {
      const existing = current.find(
        (win) => win.id === id,
      );

      if (existing) {
        zIndexRef.current += 1;

        return current.map((win) =>
          win.id === id
            ? {
                ...win,
                minimized: false,
                zIndex: zIndexRef.current,
              }
            : win,
        );
      }

      zIndexRef.current += 1;

      return [
        ...current,
        {
          id,
          title: getWindowTitle(id),
          minimized: false,
          maximized: false,
          x: 180,
          y: 90,
          width: 700,
          height: 450,
          zIndex: zIndexRef.current,
        },
      ];
    });
  }

  useEffect(() => {
    const globalWindow = window as Window & {
      openNandeWindow?: (id: string) => void;
    };

    globalWindow.openNandeWindow = openWindow;

    return () => {
      delete globalWindow.openNandeWindow;
    };
  }, [apps]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragRef.current) return;

      moveDrag(
        event.clientX,
        event.clientY,
      );
    }

    function handlePointerUp() {
      endDrag();
    }

    window.addEventListener(
      "pointermove",
      handlePointerMove,
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp,
    );

    window.addEventListener(
      "pointercancel",
      handlePointerUp,
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp,
      );

      window.removeEventListener(
        "pointercancel",
        handlePointerUp,
      );
    };
  }, []);

  return (
    <>
      {windows.map((win) => {
        const position = win.maximized
          ? {
              top: "42px",
              left: "0",
              width: "100vw",
              height: "calc(100vh - 42px)",
            }
          : {
              top: `${win.y}px`,
              left: `${win.x}px`,
              width: `${win.width}px`,
              height: `${win.height}px`,
            };

        return (
          <div
            key={win.id}
            onPointerDown={() =>
              bringToFront(win.id)
            }
            style={{
              position: "absolute",
              ...position,
              display: win.minimized
                ? "none"
                : "block",
              background: "#0b0f14",
              border: "1px solid #34414d",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.45)",
              zIndex: win.zIndex,
            }}
          >
            <div
              onPointerDown={(event) => {
                const target =
                  event.target as HTMLElement;

                if (
                  target.closest("button")
                ) {
                  return;
                }

                event.preventDefault();

                beginDrag(
                  win.id,
                  event.clientX,
                  event.clientY,
                );
              }}
              style={{
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                boxSizing: "border-box",
                background: "#111820",
                borderBottom:
                  "1px solid #26313b",
                color: "#e6edf3",
                fontSize: "13px",
                cursor: win.maximized
                  ? "default"
                  : "grab",
                touchAction: "none",
                userSelect: "none",
              }}
            >
              <span
                style={{
                  pointerEvents: "none",
                }}
              >
                {win.title}
              </span>

              <div
                style={{
                  display: "flex",
                  gap: "6px",
                }}
              >
                <button
                  onPointerDown={(event) =>
                    event.stopPropagation()
                  }
                  onClick={() =>
                    minimizeWindow(win.id)
                  }
                  style={buttonStyle}
                >
                  −
                </button>

                <button
                  onPointerDown={(event) =>
                    event.stopPropagation()
                  }
                  onClick={() =>
                    maximizeWindow(win.id)
                  }
                  style={buttonStyle}
                >
                  □
                </button>

                <button
                  onPointerDown={(event) =>
                    event.stopPropagation()
                  }
                  onClick={() =>
                    closeWindow(win.id)
                  }
                  style={buttonStyle}
                >
                  ×
                </button>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                height: "calc(100% - 44px)",
              }}
            >
              {apps[win.id] ?? null}
            </div>
          </div>
        );
      })}
    </>
  );
}

const buttonStyle: CSSProperties = {
  width: "30px",
  height: "28px",
  border: "1px solid #34414d",
  borderRadius: "5px",
  background: "#18212b",
  color: "#d7f9e9",
  cursor: "pointer",
  fontSize: "16px",
};

export default WindowManager;
