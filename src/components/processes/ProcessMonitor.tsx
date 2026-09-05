import { useMemo, useState } from "react";
import { VirtualKernel } from "../../core/VirtualKernel";

interface ProcessMonitorProps {
  kernel: VirtualKernel;
}

export function ProcessMonitor({
  kernel,
}: ProcessMonitorProps) {
  const [refresh, setRefresh] = useState(0);

  const processes = useMemo(() => {
    void refresh;
    return kernel.processes.list();
  }, [kernel, refresh]);

  const refreshProcesses = () => {
    setRefresh((value) => value + 1);
  };

  const stopProcess = (pid: number) => {
    try {
      kernel.processes.stop(pid);
      refreshProcesses();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo detener el proceso.",
      );
    }
  };

  const startProcess = (pid: number) => {
    try {
      kernel.processes.start(pid);
      refreshProcesses();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar el proceso.",
      );
    }
  };

  const killProcess = (pid: number) => {
    const process = kernel.processes.find(pid);

    if (!process) return;

    if (pid <= 3) {
      window.alert(
        "Los procesos principales del sistema están protegidos.",
      );
      return;
    }

    if (
      !window.confirm(
        `¿Eliminar el proceso ${process.name} (PID ${pid})?`,
      )
    ) {
      return;
    }

    try {
      kernel.processes.kill(pid);
      refreshProcesses();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el proceso.",
      );
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#101318",
        color: "#e8edf2",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          borderBottom: "1px solid #29303a",
        }}
      >
        <div>
          <strong>Process Monitor</strong>
          <div
            style={{
              marginTop: 2,
              color: "#7f8995",
              fontSize: 11,
            }}
          >
            {processes.length} procesos
          </div>
        </div>

        <button onClick={refreshProcesses}>
          ↻ Actualizar
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 12,
        }}
      >
        {processes.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "#7f8995",
            }}
          >
            No hay procesos.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {processes.map((process) => (
              <div
                key={process.pid}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "55px 1fr 80px 80px 130px",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  borderRadius: 7,
                  background: "#151a21",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    color: "#9da8b4",
                  }}
                >
                  {process.pid}
                </span>

                <div>
                  <div>{process.name}</div>
                  <div
                    style={{
                      color: "#7f8995",
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    {process.owner}
                  </div>
                </div>

                <span
                  style={{
                    color:
                      process.status === "running"
                        ? "#9ee6bd"
                        : "#e6c77a",
                  }}
                >
                  {process.status}
                </span>

                <span
                  style={{
                    fontFamily: "monospace",
                    color: "#9da8b4",
                  }}
                >
                  CPU {process.cpu}%
                </span>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 5,
                  }}
                >
                  {process.status === "running" ? (
                    <button
                      onClick={() =>
                        stopProcess(process.pid)
                      }
                    >
                      Pausar
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        startProcess(process.pid)
                      }
                    >
                      Iniciar
                    </button>
                  )}

                  <button
                    onClick={() =>
                      killProcess(process.pid)
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
