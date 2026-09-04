import Terminal from "../terminal/Terminal";

function Desktop() {
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
{/* Barra superior */}
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

  {/* Escritorio */}
  <div
    style={{
      padding: "24px",
      display: "flex",
      gap: "20px",
    }}
  >
    {/* Icono Terminal */}
    <button
      style={{
        width: "90px",
        height: "90px",
        background: "rgba(20, 27, 35, 0.9)",
        border: "1px solid #34414d",
        borderRadius: "12px",
        color: "#e6edf3",
        cursor: "pointer",
        fontSize: "13px",
      }}
      onClick={() => {
        const event = new CustomEvent("nande:open-terminal");
        window.dispatchEvent(event);
      }}
    >
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>
        &gt;_
      </div>
      Terminal
    </button>
  </div>

  {/* Ventana de terminal */}
  <div
    style={{
      position: "absolute",
      top: "90px",
      left: "180px",
      width: "calc(100vw - 220px)",
      height: "calc(100vh - 140px)",
      minWidth: "320px",
      minHeight: "240px",
      background: "#0b0f14",
      border: "1px solid #34414d",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
    }}
  >
    <div
      style={{
        height: "36px",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        background: "#111820",
        borderBottom: "1px solid #26313b",
        fontSize: "13px",
      }}
    >
      Terminal — student@nande-os
    </div>

    <div style={{ height: "calc(100% - 36px)" }}>
      <Terminal />
    </div>
  </div>
</div>

);
}

export default Desktop;
