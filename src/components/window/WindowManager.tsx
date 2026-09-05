import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";

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

/** Barra de titulo de cada aplicacion del escritorio. */
const WINDOW_TITLES: Record<string, string> = {
  terminal: "Terminal — student@nande-os",
  files: "Files — /home/student",
  processes: "Process Monitor",
  settings: "Settings",
  network: "Network Manager",
  browser: "ÑANDE Browser",
  world: "ÑANDE World",
};

/** Alto de la barra superior del escritorio. */
const TOP_BAR = 42;

/** Parte de la ventana que siempre debe quedar dentro de la pantalla. */
const MIN_VISIBLE = 80;

/** Alto de la fila de iconos del escritorio. */
const ICON_ROW = 138;

/** Geometria inicial adaptada al tamano real de la pantalla. */
function initialGeometry(offset: number) {
  const screenWidth =
    typeof window === "undefined" ? 1024 : window.innerWidth;

  const screenHeight =
    typeof window === "undefined" ? 768 : window.innerHeight;

  // En telefonos la ventana ocupa casi todo: una de 700px en x=180
  // quedaba practicamente fuera de una pantalla de 360px.
  const compact = screenWidth < 760;

  if (compact) {
    return {
      x: 8,
      y: TOP_BAR + 8,
      width: Math.max(240, screenWidth - 16),
      height: Math.max(280, screenHeight - TOP_BAR - 16),
    };
  }

  // En pantallas grandes las ventanas caen en cascada, por debajo de la
  // fila de iconos para no taparlos al abrir el escritorio.
  const step = (offset % 6) * 28;
  const top = TOP_BAR + ICON_ROW;

  return {
    x: 140 + step,
    y: top + step,
    width: Math.min(700, screenWidth - 80),
    height: Math.min(450, screenHeight - top - 40),
  };
}

interface WindowManagerProps {
  apps: Record<string, ReactNode>;
  /** El escritorio recibe aqui la funcion para abrir ventanas. */
  openerRef?: MutableRefObject<(id: string) => void>;
}

function WindowManager({ apps, openerRef }: WindowManagerProps) {
  const [windows, setWindows] = useState<WindowState[]>(() => [
    {
      id: "terminal",
      title: WINDOW_TITLES.terminal,
      minimized: false,
      maximized: false,
      zIndex: 10,
      ...initialGeometry(0),
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
      current.map((win) => {
        if (win.id !== drag.id) {
          return win;
        }

        // Se deja siempre un borde visible por los cuatro lados para que
        // una ventana no pueda perderse fuera de la pantalla.
        const maxX = window.innerWidth - MIN_VISIBLE;
        const maxY = window.innerHeight - MIN_VISIBLE;

        return {
          ...win,
          x: Math.min(
            maxX,
            Math.max(MIN_VISIBLE - win.width, clientX - drag.offsetX),
          ),
          y: Math.min(
            maxY,
            Math.max(TOP_BAR, clientY - drag.offsetY),
          ),
        };
      }),
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
    return WINDOW_TITLES[id] ?? id;
  }

  const openWindow = useCallback((id: string) => {
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
          zIndex: zIndexRef.current,
          ...initialGeometry(current.length),
        },
      ];
    });
  }, [apps]);

  // El escritorio abre ventanas por esta referencia, no por una funcion
  // colgada del objeto window global.
  useEffect(() => {
    if (openerRef) {
      openerRef.current = openWindow;
    }
  }, [openerRef, openWindow]);

  // Al rotar el telefono o achicar la ventana, se reencuadra lo que
  // hubiera quedado fuera de la pantalla.
  useEffect(() => {
    function handleResize() {
      setWindows((current) =>
        current.map((win) => ({
          ...win,
          width: Math.min(win.width, window.innerWidth - 16),
          height: Math.min(
            win.height,
            window.innerHeight - TOP_BAR - 16,
          ),
          x: Math.min(
            Math.max(win.x, MIN_VISIBLE - win.width),
            window.innerWidth - MIN_VISIBLE,
          ),
          y: Math.min(
            Math.max(win.y, TOP_BAR),
            window.innerHeight - MIN_VISIBLE,
          ),
        })),
      );
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
