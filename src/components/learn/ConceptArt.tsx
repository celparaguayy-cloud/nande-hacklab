import type { DiagramId } from "../../core/academy/Curriculum";

/**
 * Ilustraciones del currículo, dibujadas con SVG inline: 100% offline, sin
 * archivos ni URLs externas (respeta el aislamiento de red del proyecto). Cada
 * dibujo hace VISIBLE una idea (qué es un puerto, una IP, el DNS…), que es lo
 * que pidió el alumno: imágenes obligatorias para explicar mejor.
 */

// Paleta coherente con el tema oscuro de la Academia.
const INK = "#dbe7f0";
const DIM = "#8b98a5";
const LINE = "#2c3a48";
const CYAN = "#3daee9";
const GREEN = "#6ee787";
const AMBER = "#f5b544";
const RED = "#ff7b72";
const VIOLET = "#b98cff";
const PANEL = "#0e151c";
const PANEL2 = "#16202b";

const VB = "0 0 320 172";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox={VB}
      width="100%"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    >
      {children}
    </svg>
  );
}

const mono = "'JetBrains Mono', ui-monospace, monospace";
const sans = "system-ui, sans-serif";

/* ------------------------------- dibujos ------------------------------- */

function Internet() {
  return (
    <Frame>
      {/* cliente */}
      <rect x={18} y={64} width={70} height={48} rx={6} fill={PANEL2} stroke={LINE} />
      <rect x={26} y={72} width={54} height={26} rx={3} fill="#0a1017" stroke={CYAN} />
      <rect x={44} y={112} width={18} height={6} fill={LINE} />
      <text x={53} y={132} fill={DIM} fontSize={11} fontFamily={sans} textAnchor="middle">tu compu</text>
      {/* nube */}
      <ellipse cx={160} cy={78} rx={44} ry={26} fill={PANEL2} stroke={LINE} />
      <text x={160} y={74} fill={INK} fontSize={12} fontFamily={sans} textAnchor="middle">red</text>
      <text x={160} y={90} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">Internet</text>
      {/* servidor */}
      <rect x={232} y={58} width={64} height={60} rx={6} fill={PANEL2} stroke={LINE} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={240} y={66 + i * 16} width={48} height={10} rx={2} fill="#0a1017" stroke={GREEN} />
      ))}
      <text x={264} y={134} fill={DIM} fontSize={11} fontFamily={sans} textAnchor="middle">servidor</text>
      {/* flechas */}
      <line x1={90} y1={82} x2={114} y2={80} stroke={CYAN} strokeWidth={2} markerEnd="url(#ar)" />
      <line x1={206} y1={80} x2={230} y2={82} stroke={GREEN} strokeWidth={2} markerEnd="url(#arg)" />
      <text x={102} y={58} fill={CYAN} fontSize={10} fontFamily={mono} textAnchor="middle">pido</text>
      <text x={218} y={112} fill={GREEN} fontSize={10} fontFamily={mono} textAnchor="middle">responde</text>
      <defs>
        <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={CYAN} /></marker>
        <marker id="arg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker>
      </defs>
    </Frame>
  );
}

function Dominio() {
  return (
    <Frame>
      {/* barra de navegador */}
      <rect x={30} y={54} width={260} height={40} rx={20} fill={PANEL2} stroke={LINE} />
      <circle cx={54} cy={74} r={7} fill="none" stroke={GREEN} strokeWidth={2} />
      <path d="M51 74l2.5 2.5L58 71" stroke={GREEN} strokeWidth={2} fill="none" />
      <text x={74} y={79} fill={INK} fontSize={16} fontFamily={mono}>banco.nande</text>
      {/* etiqueta */}
      <line x1={110} y1={94} x2={110} y2={118} stroke={DIM} strokeDasharray="3 3" />
      <rect x={54} y={118} width={112} height={26} rx={5} fill="rgba(61,174,233,0.14)" stroke={CYAN} />
      <text x={110} y={135} fill={CYAN} fontSize={11} fontFamily={sans} textAnchor="middle">nombre para personas</text>
      <text x={160} y={34} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Un dominio = el nombre fácil de recordar</text>
    </Frame>
  );
}

function IP() {
  const oct = ["10", "10", "5", "20"];
  return (
    <Frame>
      <text x={160} y={34} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">La IP = la dirección numérica real</text>
      {oct.map((n, i) => (
        <g key={i}>
          <rect x={40 + i * 64} y={58} width={52} height={48} rx={6} fill={PANEL2} stroke={CYAN} />
          <text x={66 + i * 64} y={89} fill={INK} fontSize={20} fontFamily={mono} textAnchor="middle">{n}</text>
          {i < 3 && <text x={95 + i * 64} y={88} fill={DIM} fontSize={20} fontFamily={mono} textAnchor="middle">.</text>}
        </g>
      ))}
      <text x={160} y={132} fill={DIM} fontSize={11} fontFamily={sans} textAnchor="middle">4 números de 0 a 255 · única en la red</text>
    </Frame>
  );
}

function Puerto() {
  const doors = [
    { n: "22", label: "SSH", open: true },
    { n: "80", label: "HTTP", open: true },
    { n: "443", label: "HTTPS", open: false },
  ];
  return (
    <Frame>
      <text x={160} y={26} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Una IP = un edificio · cada puerto, una puerta</text>
      <rect x={70} y={38} width={180} height={116} rx={6} fill={PANEL2} stroke={LINE} />
      {doors.map((d, i) => (
        <g key={i}>
          <rect
            x={90 + i * 54}
            y={70}
            width={40}
            height={64}
            rx={3}
            fill={d.open ? "rgba(110,231,135,0.14)" : "#0a1017"}
            stroke={d.open ? GREEN : RED}
            strokeWidth={2}
          />
          <circle cx={122 + i * 54} cy={104} r={2.5} fill={d.open ? GREEN : RED} />
          <text x={110 + i * 54} y={62} fill={INK} fontSize={13} fontFamily={mono} textAnchor="middle">{d.n}</text>
          <text x={110 + i * 54} y={150} fill={d.open ? GREEN : DIM} fontSize={10} fontFamily={sans} textAnchor="middle">
            {d.open ? "abierto" : "cerrado"}
          </text>
          <text x={110 + i * 54} y={104} fill={d.open ? GREEN : DIM} fontSize={9} fontFamily={sans} textAnchor="middle">{d.label}</text>
        </g>
      ))}
    </Frame>
  );
}

function DNS() {
  return (
    <Frame>
      <text x={160} y={30} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">El DNS traduce el nombre en número</text>
      <rect x={30} y={62} width={110} height={46} rx={8} fill={PANEL2} stroke={CYAN} />
      <text x={85} y={82} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">nombre</text>
      <text x={85} y={99} fill={INK} fontSize={13} fontFamily={mono} textAnchor="middle">banco.nande</text>
      {/* agenda */}
      <rect x={144} y={56} width={32} height={58} rx={4} fill={PANEL2} stroke={LINE} />
      <line x1={160} y1={56} x2={160} y2={114} stroke={LINE} />
      {[0, 1, 2, 3].map((i) => <line key={i} x1={148} y1={66 + i * 12} x2={172} y2={66 + i * 12} stroke={DIM} strokeWidth={0.7} />)}
      <text x={160} y={128} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">DNS</text>
      <line x1={140} y1={85} x2={143} y2={85} stroke={DIM} strokeWidth={2} />
      <line x1={177} y1={85} x2={186} y2={85} stroke={GREEN} strokeWidth={2} markerEnd="url(#dg)" />
      <rect x={188} y={62} width={104} height={46} rx={8} fill={PANEL2} stroke={GREEN} />
      <text x={240} y={82} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">dirección</text>
      <text x={240} y={99} fill={INK} fontSize={13} fontFamily={mono} textAnchor="middle">10.10.5.20</text>
      <defs><marker id="dg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker></defs>
    </Frame>
  );
}

function Protocolo() {
  return (
    <Frame>
      <text x={160} y={28} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">El protocolo = el idioma acordado</text>
      {/* HTTP */}
      <rect x={26} y={52} width={128} height={92} rx={8} fill={PANEL2} stroke={RED} />
      <text x={90} y={74} fill={RED} fontSize={16} fontFamily={mono} textAnchor="middle">HTTP</text>
      <text x={90} y={96} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">web normal</text>
      <text x={90} y={120} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">se puede</text>
      <text x={90} y={134} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">espiar 👀</text>
      {/* HTTPS */}
      <rect x={166} y={52} width={128} height={92} rx={8} fill={PANEL2} stroke={GREEN} />
      <text x={224} y={74} fill={GREEN} fontSize={16} fontFamily={mono} textAnchor="middle">HTTPS</text>
      {/* candado */}
      <rect x={214} y={92} width={20} height={16} rx={2} fill="none" stroke={GREEN} strokeWidth={2} />
      <path d="M217 92v-4a7 7 0 0 1 14 0v4" fill="none" stroke={GREEN} strokeWidth={2} />
      <text x={224} y={132} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">cifrada · segura</text>
    </Frame>
  );
}

function Url() {
  const parts = [
    { t: "http://", c: RED, l: "protocolo" },
    { t: "banco.nande", c: CYAN, l: "dominio" },
    { t: "/movimientos", c: GREEN, l: "ruta" },
    { t: "?id=7", c: AMBER, l: "parámetro" },
  ];
  let x = 20;
  return (
    <Frame>
      <text x={160} y={28} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Una URL, pieza por pieza</text>
      <rect x={14} y={48} width={292} height={40} rx={8} fill={PANEL} stroke={LINE} />
      {parts.map((p, i) => {
        const w = p.t.length * 7.2 + 6;
        const seg = (
          <g key={i}>
            <rect x={x} y={54} width={w} height={28} rx={4} fill="rgba(255,255,255,0.04)" stroke={p.c} />
            <text x={x + w / 2} y={73} fill={p.c} fontSize={12} fontFamily={mono} textAnchor="middle">{p.t}</text>
            <text x={x + w / 2} y={108} fill={p.c} fontSize={9.5} fontFamily={sans} textAnchor="middle">{p.l}</text>
            <line x1={x + w / 2} y1={88} x2={x + w / 2} y2={98} stroke={p.c} strokeWidth={0.8} strokeDasharray="2 2" />
          </g>
        );
        x += w + 6;
        return seg;
      })}
      <text x={160} y={140} fill={AMBER} fontSize={11} fontFamily={sans} textAnchor="middle">el parámetro lo controlás vos → ahí se ataca</text>
    </Frame>
  );
}

function Capas() {
  const layers = [
    { t: "Dominio", c: CYAN, s: "banco.nande" },
    { t: "IP", c: VIOLET, s: "10.10.5.20" },
    { t: "Puerto", c: AMBER, s: "22 · 80 · 443" },
    { t: "Servicio", c: GREEN, s: "SSH · web" },
    { t: "Protocolo", c: RED, s: "HTTP · SSH" },
  ];
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">El mapa completo, de arriba hacia abajo</text>
      {layers.map((l, i) => (
        <g key={i}>
          <rect x={54} y={32 + i * 27} width={212} height={22} rx={4} fill={PANEL2} stroke={l.c} />
          <text x={64} y={47 + i * 27} fill={l.c} fontSize={12} fontFamily={sans}>{l.t}</text>
          <text x={256} y={47 + i * 27} fill={DIM} fontSize={10.5} fontFamily={mono} textAnchor="end">{l.s}</text>
          {i < layers.length - 1 && (
            <text x={160} y={57 + i * 27} fill={DIM} fontSize={11} textAnchor="middle">↓</text>
          )}
        </g>
      ))}
    </Frame>
  );
}

function Escaneo() {
  const ports = [
    { a: -60, open: true }, { a: -20, open: false }, { a: 20, open: true }, { a: 60, open: false },
  ];
  const cx = 160, cy = 150, r = 92;
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">nmap barre las puertas y anota las abiertas</text>
      {/* arcos de radar */}
      {[40, 66, 92].map((rr) => (
        <path key={rr} d={`M ${cx - rr} ${cy} A ${rr} ${rr} 0 0 1 ${cx + rr} ${cy}`} fill="none" stroke={LINE} />
      ))}
      {/* barrido */}
      <path d={`M ${cx} ${cy} L ${cx + r * Math.cos((-35 * Math.PI) / 180)} ${cy + r * Math.sin((-35 * Math.PI) / 180)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((-15 * Math.PI) / 180)} ${cy + r * Math.sin((-15 * Math.PI) / 180)} Z`} fill="rgba(61,174,233,0.18)" />
      {ports.map((p, i) => {
        const rad = (p.a * Math.PI) / 180 - Math.PI / 2;
        const px = cx + (r - 18) * Math.cos(rad);
        const py = cy + (r - 18) * Math.sin(rad);
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={7} fill={p.open ? GREEN : "#0a1017"} stroke={p.open ? GREEN : DIM} strokeWidth={2} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={5} fill={CYAN} />
      <text x={70} y={150} fill={GREEN} fontSize={10} fontFamily={sans}>● abierto</text>
      <text x={210} y={150} fill={DIM} fontSize={10} fontFamily={sans}>● cerrado</text>
    </Frame>
  );
}

function Handshake() {
  const steps = [
    { t: "SYN", dir: 1, c: CYAN },
    { t: "SYN-ACK", dir: -1, c: GREEN },
    { t: "ACK", dir: 1, c: CYAN },
  ];
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">El saludo de 3 pasos que abre toda conexión</text>
      <rect x={20} y={40} width={54} height={100} rx={6} fill={PANEL2} stroke={LINE} />
      <text x={47} y={155} fill={DIM} fontSize={10} textAnchor="middle" fontFamily={sans}>cliente</text>
      <rect x={246} y={40} width={54} height={100} rx={6} fill={PANEL2} stroke={LINE} />
      <text x={273} y={155} fill={DIM} fontSize={10} textAnchor="middle" fontFamily={sans}>servidor</text>
      {steps.map((s, i) => {
        const y = 60 + i * 28;
        const x1 = s.dir === 1 ? 78 : 242;
        const x2 = s.dir === 1 ? 242 : 78;
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={s.c} strokeWidth={2} markerEnd={s.dir === 1 ? "url(#hr)" : "url(#hl)"} />
            <text x={160} y={y - 4} fill={s.c} fontSize={11} fontFamily={mono} textAnchor="middle">{s.t}</text>
          </g>
        );
      })}
      <defs>
        <marker id="hr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={CYAN} /></marker>
        <marker id="hl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker>
      </defs>
    </Frame>
  );
}

function FuerzaBruta() {
  return (
    <Frame>
      <text x={160} y={26} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Fuerza bruta: probar claves hasta que una entre</text>
      {/* candado */}
      <rect x={196} y={78} width={70} height={54} rx={6} fill={PANEL2} stroke={AMBER} strokeWidth={2} />
      <path d="M208 78v-12a23 23 0 0 1 46 0v12" fill="none" stroke={AMBER} strokeWidth={3} />
      <circle cx={231} cy={102} r={6} fill={AMBER} />
      <rect x={228} y={104} width={6} height={16} fill={AMBER} />
      {/* llaves */}
      {["1234", "admin", "girasol77", "qwerty"].map((k, i) => (
        <g key={i}>
          <rect x={30} y={62 + i * 20} width={120} height={16} rx={4} fill={PANEL2} stroke={i === 2 ? GREEN : LINE} />
          <text x={40} y={74 + i * 20} fill={i === 2 ? GREEN : DIM} fontSize={10.5} fontFamily={mono}>{k}</text>
          <line x1={150} y1={70 + i * 20} x2={190} y2={100} stroke={i === 2 ? GREEN : LINE} strokeWidth={i === 2 ? 2 : 1} strokeDasharray={i === 2 ? "" : "3 3"} />
        </g>
      ))}
      <text x={90} y={150} fill={GREEN} fontSize={10} fontFamily={sans} textAnchor="middle">girasol77 ✓ entra</text>
    </Frame>
  );
}

function Inyeccion() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Tu texto se cuela DENTRO de la orden SQL</text>
      {/* campo de login */}
      <rect x={22} y={40} width={130} height={30} rx={5} fill={PANEL} stroke={CYAN} />
      <text x={30} y={59} fill={RED} fontSize={11} fontFamily={mono}>admin' OR '1'='1 --</text>
      <text x={30} y={84} fill={DIM} fontSize={9} fontFamily={sans}>lo que escribís ↑</text>
      <line x1={152} y1={55} x2={172} y2={55} stroke={AMBER} strokeWidth={2} markerEnd="url(#ig)" />
      {/* orden resultante */}
      <rect x={176} y={40} width={132} height={92} rx={5} fill={PANEL2} stroke={AMBER} />
      <text x={184} y={58} fill={DIM} fontSize={9.5} fontFamily={mono}>SELECT * FROM</text>
      <text x={184} y={72} fill={DIM} fontSize={9.5} fontFamily={mono}>users WHERE</text>
      <text x={184} y={88} fill={INK} fontSize={9.5} fontFamily={mono}>user='admin'</text>
      <text x={184} y={102} fill={RED} fontSize={9.5} fontFamily={mono}>OR '1'='1' --'</text>
      <text x={184} y={122} fill={GREEN} fontSize={9.5} fontFamily={sans}>→ siempre verdadero</text>
      <text x={90} y={112} fill={AMBER} fontSize={10} fontFamily={sans} textAnchor="middle">' rompe la orden</text>
      <defs><marker id="ig" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker></defs>
    </Frame>
  );
}

function Wifi() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">El WiFi manda paquetes por el aire</text>
      {/* router */}
      <rect x={132} y={100} width={56} height={30} rx={4} fill={PANEL2} stroke={CYAN} />
      <line x1={144} y1={100} x2={144} y2={86} stroke={CYAN} strokeWidth={2} />
      <line x1={176} y1={100} x2={176} y2={86} stroke={CYAN} strokeWidth={2} />
      <circle cx={148} cy={115} r={2} fill={GREEN} />
      <text x={160} y={148} fill={DIM} fontSize={10} textAnchor="middle" fontFamily={sans}>router</text>
      {/* arcos */}
      {[26, 44, 62].map((rr, i) => (
        <path key={rr} d={`M ${160 - rr} 84 A ${rr} ${rr} 0 0 1 ${160 + rr} 84`} fill="none" stroke={i === 1 ? CYAN : LINE} strokeWidth={2} />
      ))}
      <text x={60} y={60} fill={AMBER} fontSize={11} fontFamily={mono}>📡 airodump</text>
      <text x={230} y={60} fill={AMBER} fontSize={10} fontFamily={sans}>captura .cap</text>
    </Frame>
  );
}

function Escudo() {
  return (
    <Frame>
      <text x={160} y={30} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Saber atacar es saber defender</text>
      <path d="M160 44l58 22v34c0 34-25 58-58 66-33-8-58-32-58-66V66z" fill="rgba(110,231,135,0.10)" stroke={GREEN} strokeWidth={2} />
      <path d="M138 104l16 16 32-34" fill="none" stroke={GREEN} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

function Terminal() {
  return (
    <Frame>
      <rect x={30} y={38} width={260} height={100} rx={8} fill="#0a1017" stroke={LINE} />
      <rect x={30} y={38} width={260} height={20} rx={8} fill={PANEL2} />
      <circle cx={44} cy={48} r={4} fill={RED} />
      <circle cx={58} cy={48} r={4} fill={AMBER} />
      <circle cx={72} cy={48} r={4} fill={GREEN} />
      <text x={44} y={82} fill={GREEN} fontSize={13} fontFamily={mono}>student@nande:~$</text>
      <text x={44} y={104} fill={INK} fontSize={13} fontFamily={mono}>whoami</text>
      <text x={44} y={124} fill={DIM} fontSize={13} fontFamily={mono}>student</text>
      <rect x={148} y={94} width={8} height={14} fill={GREEN} opacity={0.8} />
      <text x={160} y={162} fill={DIM} fontSize={11} fontFamily={sans} textAnchor="middle">le escribís órdenes con palabras</text>
    </Frame>
  );
}

function Archivo() {
  const rows = [
    { p: "drwxr-xr-x", n: "documentos", c: CYAN },
    { p: "-rw-r--r--", n: "notas.txt", c: INK },
    { p: "-rwsr-xr-x", n: "acceso", c: RED },
  ];
  return (
    <Frame>
      <text x={160} y={26} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">ls -l: permisos · dueño · nombre</text>
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={24} y={40 + i * 30} width={272} height={24} rx={4} fill={PANEL2} stroke={LINE} />
          <text x={34} y={56 + i * 30} fill={r.p.includes("s") ? RED : DIM} fontSize={11} fontFamily={mono}>{r.p}</text>
          <text x={150} y={56 + i * 30} fill={DIM} fontSize={11} fontFamily={mono}>student</text>
          <text x={224} y={56 + i * 30} fill={r.c} fontSize={11} fontFamily={mono}>{r.n}</text>
        </g>
      ))}
      <text x={160} y={150} fill={AMBER} fontSize={10.5} fontFamily={sans} textAnchor="middle">la 's' roja = permiso especial (¡peligro!)</text>
    </Frame>
  );
}

function Hash() {
  return (
    <Frame>
      <rect x={20} y={64} width={78} height={44} rx={5} fill={PANEL2} stroke={CYAN} />
      <text x={59} y={80} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">entrada</text>
      <text x={59} y={97} fill={INK} fontSize={12} fontFamily={mono} textAnchor="middle">hola123</text>
      <path d="M100 86h22" stroke={DIM} strokeWidth={2} markerEnd="url(#hh)" />
      <path d="M126 60h60v52h-60z" fill="rgba(185,140,255,0.12)" stroke={VIOLET} />
      <text x={156} y={82} fill={VIOLET} fontSize={11} fontFamily={mono} textAnchor="middle">SHA-256</text>
      <text x={156} y={98} fill={DIM} fontSize={8.5} fontFamily={sans} textAnchor="middle">función</text>
      <path d="M188 86h20" stroke={DIM} strokeWidth={2} markerEnd="url(#hh)" />
      <rect x={210} y={64} width={92} height={44} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={256} y={80} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">huella fija</text>
      <text x={256} y={97} fill={GREEN} fontSize={10} fontFamily={mono} textAnchor="middle">a1f9…7c2</text>
      <text x={160} y={132} fill={DIM} fontSize={10.5} fontFamily={sans} textAnchor="middle">ida sí, vuelta no · misma entrada → misma huella</text>
      <defs><marker id="hh" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={DIM} /></marker></defs>
    </Frame>
  );
}

function Cookie() {
  return (
    <Frame>
      <text x={160} y={26} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">La cookie = tu pulsera de "ya entré"</text>
      <rect x={40} y={46} width={100} height={64} rx={8} fill={PANEL2} stroke={CYAN} />
      <text x={90} y={66} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">servidor</text>
      <text x={90} y={86} fill={GREEN} fontSize={9} fontFamily={sans} textAnchor="middle">login ✓</text>
      <text x={90} y={100} fill={DIM} fontSize={8} fontFamily={sans} textAnchor="middle">te da cookie →</text>
      <rect x={186} y={54} width={94} height={48} rx={8} fill="rgba(245,181,68,0.12)" stroke={AMBER} />
      <text x={233} y={74} fill={AMBER} fontSize={10} fontFamily={mono} textAnchor="middle">session=</text>
      <text x={233} y={90} fill={AMBER} fontSize={10} fontFamily={mono} textAnchor="middle">a9f3b1</text>
      <path d="M142 82h40" stroke={AMBER} strokeWidth={2} markerEnd="url(#ck)" />
      <text x={160} y={132} fill={RED} fontSize={10.5} fontFamily={sans} textAnchor="middle">si te la roban, entran como vos sin la clave</text>
      <defs><marker id="ck" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker></defs>
    </Frame>
  );
}

function Firewall() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">El firewall deja pasar unos y bloquea otros</text>
      {/* muro de ladrillos */}
      {[0, 1, 2, 3].map((r) => (
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={140 + (r % 2 ? 0 : 12) + c * 24} y={40 + r * 20} width={22} height={18} rx={2} fill={PANEL2} stroke={RED} strokeWidth={1} />
        ))
      ))}
      {/* paquete permitido */}
      <circle cx={40} cy={64} r={9} fill={GREEN} />
      <path d="M50 64h150" stroke={GREEN} strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#fg)" />
      <text x={40} y={86} fill={GREEN} fontSize={9} fontFamily={sans} textAnchor="middle">:443 ok</text>
      {/* paquete bloqueado */}
      <circle cx={40} cy={118} r={9} fill={RED} />
      <path d="M50 118h95" stroke={RED} strokeWidth={2} strokeDasharray="4 3" />
      <text x={150} y={122} fill={RED} fontSize={13} fontFamily={sans}>✕</text>
      <text x={40} y={140} fill={RED} fontSize={9} fontFamily={sans} textAnchor="middle">:23 bloqueado</text>
      <defs><marker id="fg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker></defs>
    </Frame>
  );
}

function Phishing() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Phishing: un anzuelo disfrazado de algo confiable</text>
      {/* correo falso */}
      <rect x={40} y={40} width={150} height={92} rx={8} fill={PANEL2} stroke={LINE} />
      <text x={52} y={60} fill={DIM} fontSize={10} fontFamily={sans}>De: banco-seguro@…</text>
      <rect x={52} y={70} width={126} height={12} rx={2} fill="#0a1017" />
      <rect x={52} y={88} width={100} height={12} rx={2} fill="#0a1017" />
      <rect x={52} y={108} width={70} height={16} rx={4} fill="rgba(255,123,114,0.2)" stroke={RED} />
      <text x={87} y={120} fill={RED} fontSize={9} fontFamily={sans} textAnchor="middle">entrá acá ya</text>
      {/* anzuelo */}
      <path d="M235 44v40a16 16 0 0 1-32 0" fill="none" stroke={AMBER} strokeWidth={3} />
      <path d="M228 40l7 4 7-4" fill="none" stroke={AMBER} strokeWidth={3} />
      <circle cx={203} cy={92} r={4} fill={AMBER} />
      <text x={250} y={124} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">te pesca la clave</text>
    </Frame>
  );
}

function Vpn() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">La VPN mete tu tráfico en un túnel cifrado</text>
      <rect x={24} y={70} width={48} height={38} rx={5} fill={PANEL2} stroke={CYAN} />
      <text x={48} y={124} fill={DIM} fontSize={9} textAnchor="middle" fontFamily={sans}>vos</text>
      {/* túnel */}
      <rect x={84} y={66} width={152} height={46} rx={23} fill="rgba(61,174,233,0.08)" stroke={CYAN} strokeDasharray="5 4" />
      <path d="M96 89h128" stroke={GREEN} strokeWidth={2} markerEnd="url(#vg)" />
      <text x={160} y={82} fill={CYAN} fontSize={9.5} fontFamily={sans} textAnchor="middle">🔒 túnel cifrado</text>
      <rect x={248} y={70} width={48} height={38} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={272} y={124} fill={DIM} fontSize={9} textAnchor="middle" fontFamily={sans}>servidor</text>
      <text x={160} y={140} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">nadie en el medio ve qué mandás</text>
      <defs><marker id="vg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker></defs>
    </Frame>
  );
}

function Xss() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">XSS: tu código se ejecuta en el navegador de OTRO</text>
      {/* caja de comentario */}
      <rect x={30} y={40} width={140} height={30} rx={5} fill={PANEL} stroke={CYAN} />
      <text x={40} y={59} fill={RED} fontSize={10} fontFamily={mono}>&lt;script&gt;robar()&lt;/script&gt;</text>
      <text x={40} y={84} fill={DIM} fontSize={9} fontFamily={sans}>lo dejás en un comentario ↑</text>
      <path d="M170 55h22" stroke={AMBER} strokeWidth={2} markerEnd="url(#xg)" />
      {/* navegador víctima */}
      <rect x={196} y={40} width={100} height={92} rx={6} fill={PANEL2} stroke={LINE} />
      <rect x={196} y={40} width={100} height={16} rx={6} fill="#0a1017" />
      <rect x={210} y={70} width={72} height={30} rx={4} fill="rgba(255,123,114,0.15)" stroke={RED} />
      <text x={246} y={89} fill={RED} fontSize={10} fontFamily={sans} textAnchor="middle">⚠ alert</text>
      <text x={246} y={122} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">víctima</text>
      <defs><marker id="xg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker></defs>
    </Frame>
  );
}

function Privesc() {
  const steps = [
    { y: 120, label: "student", c: CYAN, icon: "🙂" },
    { y: 92, label: "www-data", c: AMBER, icon: "⚙" },
    { y: 64, label: "sudo", c: AMBER, icon: "🔑" },
    { y: 40, label: "root", c: RED, icon: "👑" },
  ];
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Escalar privilegios: de usuario común a root</text>
      {steps.map((s, i) => (
        <g key={i}>
          <rect x={70 + i * 44} y={s.y} width={110} height={16} rx={3} fill={PANEL2} stroke={s.c} />
          <text x={78 + i * 44} y={s.y + 12} fill={s.c} fontSize={10} fontFamily={mono}>{s.icon} {s.label}</text>
        </g>
      ))}
      <text x={250} y={150} fill={RED} fontSize={10.5} fontFamily={sans} textAnchor="end">root = control total</text>
    </Frame>
  );
}

function Osint() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">OSINT: armar el perfil con datos PÚBLICOS</text>
      {[
        { x: 34, t: "📷 foto", s: "metadatos GPS" },
        { x: 122, t: "👤 perfil", s: "nombre, escuela" },
        { x: 210, t: "📍 lugar", s: "dónde vive" },
      ].map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={46} width={80} height={50} rx={6} fill={PANEL2} stroke={LINE} />
          <text x={c.x + 40} y={70} fill={INK} fontSize={11} fontFamily={sans} textAnchor="middle">{c.t}</text>
          <text x={c.x + 40} y={86} fill={DIM} fontSize={8.5} fontFamily={sans} textAnchor="middle">{c.s}</text>
        </g>
      ))}
      {/* lupa */}
      <circle cx={150} cy={126} r={13} fill="none" stroke={CYAN} strokeWidth={2.5} />
      <line x1={160} y1={136} x2={172} y2={148} stroke={CYAN} strokeWidth={3} />
      <text x={196} y={132} fill={CYAN} fontSize={10.5} fontFamily={sans}>todo junto = quién sos</text>
    </Frame>
  );
}

const ART: Record<DiagramId, () => React.ReactElement> = {
  internet: Internet,
  dominio: Dominio,
  ip: IP,
  puerto: Puerto,
  dns: DNS,
  protocolo: Protocolo,
  url: Url,
  capas: Capas,
  escaneo: Escaneo,
  handshake: Handshake,
  fuerzabruta: FuerzaBruta,
  inyeccion: Inyeccion,
  wifi: Wifi,
  escudo: Escudo,
  terminal: Terminal,
  archivo: Archivo,
  hash: Hash,
  cookie: Cookie,
  firewall: Firewall,
  phishing: Phishing,
  vpn: Vpn,
  xss: Xss,
  privesc: Privesc,
  osint: Osint,
};

/** Dibuja la ilustración pedida (o nada si el id no existe). */
export function ConceptArt({ diagram }: { diagram: DiagramId }) {
  const Draw = ART[diagram];
  if (!Draw) return null;
  return (
    <div
      style={{
        background: "linear-gradient(160deg, #0c141c, #0a1017)",
        border: "1px solid #22303c",
        borderRadius: 12,
        padding: "8px 8px 4px",
      }}
    >
      <Draw />
    </div>
  );
}

export default ConceptArt;
