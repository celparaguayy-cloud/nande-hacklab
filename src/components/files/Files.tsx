import { useMemo, useState } from "react";
import { VirtualKernel } from "../../core/VirtualKernel";

interface FilesProps {
  kernel: VirtualKernel;
}

export function Files({ kernel }: FilesProps) {
  const [currentPath, setCurrentPath] = useState("/home/student");
  const [refresh, setRefresh] = useState(0);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");

  const entries = useMemo(() => {
    void refresh;

    try {
      return kernel.filesystem.listDirectory(currentPath);
    } catch {
      return [];
    }
  }, [kernel, currentPath, refresh]);

  const refreshFiles = () => {
    setRefresh((value) => value + 1);
  };

  const buildPath = (name: string) => {
    return currentPath === "/"
      ? `/${name}`
      : `${currentPath}/${name}`;
  };

  const goBack = () => {
    if (currentPath === "/") return;

    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();

    setCurrentPath(
      parts.length > 0 ? `/${parts.join("/")}` : "/",
    );
  };

  const createFolder = () => {
    const name = window.prompt("Nombre de la carpeta:");

    if (!name) return;

    const cleanName = name.trim();

    if (!cleanName) return;

    try {
      kernel.filesystem.createDirectory(buildPath(cleanName));
      refreshFiles();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo crear la carpeta.",
      );
    }
  };

  const createFile = () => {
    const name = window.prompt("Nombre del archivo:");

    if (!name) return;

    const cleanName = name.trim();

    if (!cleanName) return;

    try {
      kernel.filesystem.createFile(buildPath(cleanName));
      refreshFiles();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo crear el archivo.",
      );
    }
  };

  const deleteEntry = (path: string) => {
    const name = path.split("/").pop() || path;

    if (!window.confirm(`¿Eliminar "${name}"?`)) {
      return;
    }

    try {
      kernel.filesystem.remove(path);
      refreshFiles();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar.",
      );
    }
  };

  const openFile = (path: string) => {
    try {
      const content = kernel.filesystem.readFile(path);

      setEditingPath(path);
      setEditorContent(content);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el archivo.",
      );
    }
  };

  const saveFile = () => {
    if (!editingPath) return;

    try {
      kernel.filesystem.writeFile(
        editingPath,
        editorContent,
      );

      setEditingPath(null);
      setEditorContent("");
      refreshFiles();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el archivo.",
      );
    }
  };

  const cancelEditing = () => {
    setEditingPath(null);
    setEditorContent("");
  };

  const openEntry = (
    path: string,
    type: "file" | "directory",
  ) => {
    if (type === "directory") {
      setCurrentPath(path);
      return;
    }

    openFile(path);
  };

  if (editingPath) {
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
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid #29303a",
          }}
        >
          <button onClick={cancelEditing}>
            ← Volver
          </button>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "monospace",
              fontSize: 13,
            }}
          >
            {editingPath}
          </div>

          <button onClick={saveFile}>
            💾 Guardar
          </button>
        </div>

        <textarea
          value={editorContent}
          onChange={(event) =>
            setEditorContent(event.target.value)
          }
          spellCheck={false}
          autoFocus
          style={{
            flex: 1,
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            border: "none",
            outline: "none",
            padding: 16,
            background: "#0b0f14",
            color: "#d7f9e9",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        />
      </div>
    );
  }

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
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid #29303a",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={goBack}
          disabled={currentPath === "/"}
        >
          ←
        </button>

        <div
          style={{
            flex: 1,
            minWidth: 140,
            padding: "7px 10px",
            borderRadius: 6,
            background: "#181d24",
            color: "#b9c2cc",
            fontFamily: "monospace",
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentPath}
        </div>

        <button onClick={createFolder}>
          📁+
        </button>

        <button onClick={createFile}>
          📄+
        </button>

        <button onClick={refreshFiles}>
          ↻
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 12,
        }}
      >
        {entries.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "#7f8995",
            }}
          >
            Directorio vacío
          </div>
        ) : (
          entries.map((entry) => {
            const name =
              entry.path.split("/").pop() || entry.path;

            return (
              <div
                key={entry.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px",
                  marginBottom: 5,
                  borderRadius: 7,
                  background: "#151a21",
                }}
              >
                <button
                  onClick={() =>
                    openEntry(entry.path, entry.type)
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "none",
                    background: "transparent",
                    color: "#e8edf2",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span style={{ fontSize: 20 }}>
                    {entry.type === "directory"
                      ? "📁"
                      : "📄"}
                  </span>

                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name}
                  </span>

                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: "#7f8995",
                    }}
                  >
                    {entry.permissions}
                  </span>
                </button>

                <button
                  onClick={() =>
                    deleteEntry(entry.path)
                  }
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
