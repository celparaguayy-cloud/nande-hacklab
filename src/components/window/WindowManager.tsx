import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { appTitle } from "../desktop/apps";
import { AppIcon } from "../desktop/AppIcon";

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

/** Alto de la barra superior del escritorio (coincide con --nd-topbar). */
const TOP_BAR = 40;

/** Alto reservado abajo para que el dock no quede tapado. */
const DOCK_ZONE = 78;

/** Parte de la ventana que siempre debe quedar dentro de la pantalla. */
const MIN_VISIBLE = 80;

/** Por debajo de este ancho el escritorio se comporta como un teléfono. */
const COMPACT_WIDTH = 760;

function isCompact(): boolean {
  return typeof window !== "undefined" && window.innerWidth < COMPACT_WIDTH;
}

/** Geometria inicial adaptada al tamano real de la pantalla. */
function initialGeometry(offset: number) {
  const screenWidth =
    typeof window === "undefined" ? 1024 : window.innerWidth;

  const screenHeight =
    typeof window === "undefined" ? 768 : window.innerHeight;

  // En telefonos la ventana ocupa casi todo: una de 700px en x=180
  // quedaba practicamente fuera de una pantalla de 360px.
  if (screenWidth < COMPACT_WIDTH) {
    return {
      x: 8,
      y: TOP_BAR + 8,
      width: Math.max(240, screenWidth - 16),
      height: Math.max(280, screenHeight - TOP_BAR - DOCK_ZONE - 8),
    };
  }

  // En pantallas grandes las ventanas caen en cascada, centradas y sin
  // pisar el dock.
  const width = Math.min(880, screenWidth - 160);
  const height = Math.min(560, screenHeight - TOP_BAR - DOCK_ZONE - 40);
  const step = (offset % 6) * 30;

  return {
    x: Math.max(20, Math.round((screenWidth - width) / 2) - 90 + step),
    y: TOP_BAR + 28 + step,
    width,
    height,
  };
}

interface WindowManagerProps {
  apps: Record<string, ReactNode>;
  /** El escritorio recibe aqui la funcion para abrir ventanas. */
  openerRef?: MutableRefObject<(id: string) => void>;
  /** Avisa al dock qué apps están abiertas, para marcar el punto. */
  onOpenWindowsChange?: (ids: string[]) => void;
}

function WindowManager({
  apps,
  openerRef,
  onOpenWindowsChange,
}: WindowManagerProps) {
  // Arranca sin ventanas: lo primero que ve el usuario es el escritorio.
  // Antes se abría la terminal sola y en un teléfono tapaba todo, así que
  // nunca se llegaba a ver que existían las demás aplicaciones.
  const [windows, setWindows] = useState<WindowState[]>([]);

  const dragRef = useRef<DragState | null>(null);
  const zIndexRef = useRef(20);

  // La ventana enfocada es la de z-index más alto que esté visible.
  const focusedId = windows
    .filter((win) => !win.minimized)
    .reduce<WindowState | null>(
      (top, win) => (!top || win.zIndex > top.zIndex ? win : top),
      null,
    )?.id;

  useEffect(() => {
    onOpenWindowsChange?.(windows.map((win) => win.id));
  }, [windows, onOpenWindowsChange]);

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

  function beginDrag(id: string, clientX: number, clientY: number) {
    const currentWindow = windows.find((win) => win.id === id);

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

  function moveDrag(clientX: number, clientY: number) {
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
          y: Math.min(maxY, Math.max(TOP_BAR, clientY - drag.offsetY)),
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
        win.id === id ? { ...win, minimized: true } : win,
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

    setWindows((current) => current.filter((win) => win.id !== id));
  }

  const openWindow = useCallback((id: string) => {
    if (!apps[id]) {
      return;
    }

    setWindows((current) => {
      const existing = current.find((win) => win.id === id);

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
          title: appTitle(id),
          minimized: false,
          // En el teléfono una ventana flotante no tiene sentido: se abre
          // maximizada, como una app de celular.
          maximized: isCompact(),
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

      moveDrag(event.clientX, event.clientY);
    }

    function handlePointerUp() {
      endDrag();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  return (
    <>
      {windows.map((win) => {
        const position = win.maximized
          ? {
              top: `${TOP_BAR}px`,
              left: "0",
              width: "100vw",
              // Se descuenta el dock: maximizada no significa taparlo.
              height: `calc(100dvh - ${TOP_BAR + DOCK_ZONE}px)`,
              borderRadius: 0,
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
            className="nd-window"
            data-focused={focusedId === win.id}
            onPointerDown={() => bringToFront(win.id)}
            style={{
              ...position,
              display: win.minimized ? "none" : "flex",
              zIndex: win.zIndex,
            }}
          >
            <div
              className="nd-titlebar"
              onDoubleClick={() => maximizeWindow(win.id)}
              onPointerDown={(event) => {
                const target = event.target as HTMLElement;

                if (target.closest("button")) {
                  return;
                }

                event.preventDefault();

                beginDrag(win.id, event.clientX, event.clientY);
              }}
              style={{ cursor: win.maximized ? "default" : "grab" }}
            >
              <AppIcon id={win.id} size={17} />

              <span className="nd-titlebar__title">{win.title}</span>

              <button
                className="nd-win-btn"
                title="Minimizar"
                aria-label="Minimizar"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => minimizeWindow(win.id)}
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect y="4.4" width="10" height="1.4" rx="0.7" fill="currentColor" />
                </svg>
              </button>

              <button
                className="nd-win-btn"
                title={win.maximized ? "Restaurar" : "Maximizar"}
                aria-label={win.maximized ? "Restaurar" : "Maximizar"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => maximizeWindow(win.id)}
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect
                    x="0.7"
                    y="0.7"
                    width="8.6"
                    height="8.6"
                    rx="1.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                </svg>
              </button>

              <button
                className="nd-win-btn nd-win-btn--close"
                title="Cerrar"
                aria-label="Cerrar"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => closeWindow(win.id)}
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path
                    d="M1 1l8 8M9 1l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="nd-window__body">{apps[win.id] ?? null}</div>
          </div>
        );
      })}
    </>
  );
}

export default WindowManager;
