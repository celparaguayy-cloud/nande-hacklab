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

function Exploit() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Un exploit abre UNA grieta concreta → sesión</text>
      {/* servicio vulnerable con grieta */}
      <rect x={30} y={44} width={104} height={96} rx={6} fill={PANEL2} stroke={RED} />
      <text x={82} y={64} fill={RED} fontSize={11} fontFamily={mono} textAnchor="middle">servicio</text>
      <text x={82} y={78} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">vulnerable</text>
      <path d="M60 92l14 10-10 12 16 8-12 12" fill="none" stroke={RED} strokeWidth={2} />
      {/* exploit */}
      <path d="M138 92h40" stroke={AMBER} strokeWidth={2} markerEnd="url(#exg)" />
      <text x={158} y={86} fill={AMBER} fontSize={9} fontFamily={mono} textAnchor="middle">exploit</text>
      {/* sesión */}
      <rect x={184} y={54} width={110} height={76} rx={6} fill="rgba(110,231,135,0.10)" stroke={GREEN} />
      <text x={239} y={78} fill={GREEN} fontSize={12} fontFamily={mono} textAnchor="middle">session 1</text>
      <text x={239} y={98} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">meterpreter</text>
      <text x={239} y={116} fill={GREEN} fontSize={9} fontFamily={sans} textAnchor="middle">shell abierta ✓</text>
      <text x={160} y={160} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">sin la grieta, no hay sesión</text>
      <defs><marker id="exg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker></defs>
    </Frame>
  );
}

function Payload() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">reverse shell: la víctima te llama a VOS</text>
      <rect x={22} y={60} width={78} height={54} rx={6} fill={PANEL2} stroke={GREEN} />
      <text x={61} y={84} fill={GREEN} fontSize={11} fontFamily={sans} textAnchor="middle">tu escucha</text>
      <text x={61} y={100} fill={DIM} fontSize={9} fontFamily={mono} textAnchor="middle">LHOST:4444</text>
      <rect x={220} y={60} width={78} height={54} rx={6} fill={PANEL2} stroke={RED} />
      <text x={259} y={84} fill={RED} fontSize={11} fontFamily={sans} textAnchor="middle">víctima</text>
      <text x={259} y={100} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">payload</text>
      <path d="M218 88H104" stroke={GREEN} strokeWidth={2} markerEnd="url(#pyg)" />
      <text x={160} y={80} fill={GREEN} fontSize={9.5} fontFamily={mono} textAnchor="middle">conexión inversa</text>
      <text x={160} y={132} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">así atraviesa el firewall de salida</text>
      <defs><marker id="pyg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker></defs>
    </Frame>
  );
}

function AdGrafo() {
  const nodes = [
    { x: 40, y: 130, t: "vos", c: GREEN },
    { x: 110, y: 90, t: "grupo", c: CYAN },
    { x: 180, y: 120, t: "svc-sql", c: AMBER },
    { x: 240, y: 78, t: "DB01", c: AMBER },
    { x: 288, y: 40, t: "DA", c: RED },
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4]];
  return (
    <Frame>
      <text x={160} y={20} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">AD es un grafo: buscás el camino a Domain Admins</text>
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={LINE} strokeWidth={2} markerEnd="url(#adg)" />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={12} fill={PANEL2} stroke={n.c} strokeWidth={2} />
          <text x={n.x} y={n.y + 26} fill={n.c} fontSize={9} fontFamily={mono} textAnchor="middle">{n.t}</text>
        </g>
      ))}
      <defs><marker id="adg" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={DIM} /></marker></defs>
    </Frame>
  );
}

function Kerberos() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Kerberoasting: pedís el ticket, lo crackeás afuera</text>
      {/* ticket */}
      <path d="M40 60h130v56H40a10 10 0 0 0 0-20 10 10 0 0 0 0-16z" fill={PANEL2} stroke={VIOLET} strokeWidth={2} />
      <text x={104} y={82} fill={VIOLET} fontSize={11} fontFamily={mono} textAnchor="middle">TGS</text>
      <text x={104} y={100} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">SVC-SQL (SPN)</text>
      <path d="M176 88h26" stroke={DIM} strokeWidth={2} markerEnd="url(#kbg)" />
      <text x={189} y={80} fill={DIM} fontSize={8} fontFamily={sans} textAnchor="middle">offline</text>
      <rect x={208} y={64} width={88} height={48} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={252} y={84} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">clave débil</text>
      <text x={252} y={101} fill={GREEN} fontSize={11} fontFamily={mono} textAnchor="middle">Verano2024!</text>
      <text x={160} y={140} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">no bloquea cuentas · sólo el evento 4769</text>
      <defs><marker id="kbg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={DIM} /></marker></defs>
    </Frame>
  );
}

function Pth() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Pass-the-Hash: entrás con el hash, sin la clave</text>
      <rect x={26} y={64} width={104} height={46} rx={5} fill={PANEL2} stroke={AMBER} />
      <text x={78} y={84} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">hash NT robado</text>
      <text x={78} y={100} fill={AMBER} fontSize={10} fontFamily={mono} textAnchor="middle">a1f9…7c2</text>
      <path d="M134 88h44" stroke={AMBER} strokeWidth={2} markerEnd="url(#ptg)" />
      <text x={156} y={80} fill={DIM} fontSize={8} fontFamily={mono} textAnchor="middle">NTLM</text>
      <rect x={184} y={56} width={112} height={62} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={240} y={80} fill={GREEN} fontSize={11} fontFamily={sans} textAnchor="middle">acceso ✓</text>
      <text x={240} y={100} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">sin contraseña</text>
      <text x={160} y={140} fill={RED} fontSize={10} fontFamily={sans} textAnchor="middle">el hash ES la credencial en NTLM</text>
      <defs><marker id="ptg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker></defs>
    </Frame>
  );
}

function Spray() {
  const users = ["ana", "svc-sql", "lore", "dba"];
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Spraying: UNA clave contra MUCHOS usuarios</text>
      <rect x={26} y={70} width={92} height={30} rx={5} fill={PANEL2} stroke={AMBER} />
      <text x={72} y={90} fill={AMBER} fontSize={11} fontFamily={mono} textAnchor="middle">Verano2024!</text>
      {users.map((u, i) => (
        <g key={i}>
          <rect x={196} y={40 + i * 26} width={98} height={20} rx={4} fill={PANEL2} stroke={i === 1 ? GREEN : LINE} />
          <text x={206} y={54 + i * 26} fill={i === 1 ? GREEN : DIM} fontSize={10} fontFamily={mono}>{u}{i === 1 ? " ✓" : ""}</text>
          <line x1={120} y1={85} x2={194} y2={50 + i * 26} stroke={i === 1 ? GREEN : LINE} strokeWidth={i === 1 ? 2 : 1} strokeDasharray={i === 1 ? "" : "3 3"} />
        </g>
      ))}
      <text x={72} y={118} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">no bloquea cuentas</text>
    </Frame>
  );
}

function Sniffer() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Sniffer: lee lo que viaja por el cable</text>
      <line x1={20} y1={92} x2={300} y2={92} stroke={LINE} strokeWidth={3} />
      {[60, 130, 210].map((x, i) => (
        <g key={i}>
          <rect x={x} y={80} width={26} height={24} rx={3} fill={PANEL2} stroke={i === 1 ? RED : CYAN} />
          <text x={x + 13} y={96} fill={i === 1 ? RED : CYAN} fontSize={9} fontFamily={mono} textAnchor="middle">{i === 1 ? "🔓" : "···"}</text>
        </g>
      ))}
      <rect x={112} y={120} width={96} height={30} rx={4} fill="rgba(255,123,114,0.12)" stroke={RED} />
      <text x={160} y={139} fill={RED} fontSize={10} fontFamily={mono} textAnchor="middle">password=girasol77</text>
      <text x={160} y={64} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">en HTTP la clave viaja en claro</text>
    </Frame>
  );
}

function CrackHash() {
  const words = ["123456", "girasol77", "qwerty"];
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Crackear: hasheás el diccionario y comparás</text>
      <rect x={24} y={48} width={96} height={30} rx={5} fill={PANEL2} stroke={VIOLET} />
      <text x={72} y={62} fill={DIM} fontSize={8} fontFamily={sans} textAnchor="middle">hash objetivo</text>
      <text x={72} y={74} fill={VIOLET} fontSize={10} fontFamily={mono} textAnchor="middle">2ab9…767</text>
      {words.map((w, i) => (
        <g key={i}>
          <rect x={200} y={42 + i * 30} width={96} height={22} rx={4} fill={PANEL2} stroke={i === 1 ? GREEN : LINE} />
          <text x={210} y={57 + i * 30} fill={i === 1 ? GREEN : DIM} fontSize={10} fontFamily={mono}>{w}{i === 1 ? " ✓" : ""}</text>
        </g>
      ))}
      <path d="M122 63h74" stroke={DIM} strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={160} y={150} fill={GREEN} fontSize={10} fontFamily={sans} textAnchor="middle">coincide el hash → clave = girasol77</text>
    </Frame>
  );
}

function Directorios() {
  const paths = [
    { p: "/login", s: "200", c: GREEN },
    { p: "/admin", s: "403", c: AMBER },
    { p: "/backup", s: "200", c: GREEN },
    { p: "/xyz", s: "404", c: DIM },
  ];
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">gobuster prueba rutas y mira el código</text>
      {paths.map((r, i) => (
        <g key={i}>
          <rect x={60} y={40 + i * 26} width={200} height={20} rx={4} fill={PANEL2} stroke={LINE} />
          <text x={70} y={54 + i * 26} fill={INK} fontSize={11} fontFamily={mono}>{r.p}</text>
          <text x={248} y={54 + i * 26} fill={r.c} fontSize={11} fontFamily={mono} textAnchor="end">{r.s}</text>
        </g>
      ))}
      <text x={160} y={158} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">200/403 existen · 404 no · lo oculto aparece</text>
    </Frame>
  );
}

function Subdominios() {
  const subs = ["www", "mail", "dev", "admin"];
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Enumerar subdominios de un dominio</text>
      <rect x={116} y={36} width={88} height={26} rx={5} fill={PANEL2} stroke={CYAN} />
      <text x={160} y={53} fill={CYAN} fontSize={11} fontFamily={mono} textAnchor="middle">nande.local</text>
      {subs.map((s, i) => {
        const x = 30 + i * 72;
        return (
          <g key={i}>
            <line x1={160} y1={62} x2={x + 32} y2={104} stroke={LINE} />
            <rect x={x} y={104} width={64} height={24} rx={4} fill={PANEL2} stroke={i === 3 ? AMBER : LINE} />
            <text x={x + 32} y={120} fill={i === 3 ? AMBER : DIM} fontSize={9.5} fontFamily={mono} textAnchor="middle">{s}</text>
          </g>
        );
      })}
      <text x={160} y={150} fill={AMBER} fontSize={10} fontFamily={sans} textAnchor="middle">'admin' no estaba en la web pública</text>
    </Frame>
  );
}

function Mitm() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">MITM: el atacante se mete en el medio</text>
      <rect x={20} y={92} width={60} height={40} rx={5} fill={PANEL2} stroke={CYAN} />
      <text x={50} y={116} fill={DIM} fontSize={9} textAnchor="middle" fontFamily={sans}>víctima</text>
      <rect x={240} y={92} width={60} height={40} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={270} y={116} fill={DIM} fontSize={9} textAnchor="middle" fontFamily={sans}>router</text>
      <rect x={126} y={40} width={68} height={38} rx={5} fill="rgba(255,123,114,0.12)" stroke={RED} />
      <text x={160} y={63} fill={RED} fontSize={10} textAnchor="middle" fontFamily={sans}>atacante</text>
      <path d="M80 108h158" stroke={LINE} strokeWidth={1.5} strokeDasharray="4 3" />
      <path d="M70 96l84-18" stroke={RED} strokeWidth={2} markerEnd="url(#mmg)" />
      <path d="M166 78l82 18" stroke={RED} strokeWidth={2} markerEnd="url(#mmg)" />
      <text x={160} y={150} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">todo el tráfico pasa por él</text>
      <defs><marker id="mmg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={RED} /></marker></defs>
    </Frame>
  );
}

function Pivot() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Pivoting: saltás por un host a la red interna</text>
      <rect x={22} y={74} width={56} height={38} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={50} y={97} fill={GREEN} fontSize={9} textAnchor="middle" fontFamily={sans}>vos</text>
      <rect x={132} y={74} width={56} height={38} rx={5} fill={PANEL2} stroke={AMBER} />
      <text x={160} y={92} fill={AMBER} fontSize={9} textAnchor="middle" fontFamily={sans}>pivote</text>
      <text x={160} y={104} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={sans}>2 redes</text>
      {/* red interna */}
      <rect x={228} y={44} width={80} height={98} rx={6} fill="rgba(185,140,255,0.08)" stroke={VIOLET} strokeDasharray="4 3" />
      <text x={268} y={60} fill={VIOLET} fontSize={9} textAnchor="middle" fontFamily={sans}>red interna</text>
      {[0, 1].map((i) => <rect key={i} x={244} y={72 + i * 30} width={48} height={22} rx={3} fill={PANEL2} stroke={VIOLET} />)}
      <path d="M80 93h50" stroke={GREEN} strokeWidth={2} markerEnd="url(#pvg)" />
      <path d="M190 93h36" stroke={VIOLET} strokeWidth={2} markerEnd="url(#pvv)" />
      <defs>
        <marker id="pvg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker>
        <marker id="pvv" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={VIOLET} /></marker>
      </defs>
    </Frame>
  );
}

function Traversal() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Path traversal: te escapás de la carpeta web</text>
      <rect x={30} y={50} width={260} height={34} rx={6} fill={PANEL} stroke={CYAN} />
      <text x={44} y={71} fill={INK} fontSize={12} fontFamily={mono}>/img?f=</text>
      <text x={112} y={71} fill={RED} fontSize={12} fontFamily={mono}>../../../etc/passwd</text>
      {["/var/www", "..", "..", "/etc/passwd"].map((s, i) => (
        <g key={i}>
          <rect x={30 + i * 70} y={104} width={62} height={22} rx={4} fill={PANEL2} stroke={i === 3 ? RED : LINE} />
          <text x={61 + i * 70} y={119} fill={i === 3 ? RED : DIM} fontSize={9} fontFamily={mono} textAnchor="middle">{s}</text>
        </g>
      ))}
      <text x={160} y={150} fill={RED} fontSize={10} fontFamily={sans} textAnchor="middle">cada ../ sube un nivel → salís de lo permitido</text>
    </Frame>
  );
}

function Idor() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">IDOR: cambiás el número y ves lo ajeno</text>
      <rect x={40} y={44} width={110} height={40} rx={6} fill={PANEL2} stroke={GREEN} />
      <text x={95} y={62} fill={INK} fontSize={12} fontFamily={mono} textAnchor="middle">/order/7</text>
      <text x={95} y={78} fill={GREEN} fontSize={9} fontFamily={sans} textAnchor="middle">tu pedido ✓</text>
      <rect x={170} y={44} width={110} height={40} rx={6} fill="rgba(255,123,114,0.12)" stroke={RED} />
      <text x={225} y={62} fill={INK} fontSize={12} fontFamily={mono} textAnchor="middle">/order/8</text>
      <text x={225} y={78} fill={RED} fontSize={9} fontFamily={sans} textAnchor="middle">¡pedido de OTRO!</text>
      <path d="M150 64h18" stroke={AMBER} strokeWidth={2} markerEnd="url(#idg)" />
      <text x={160} y={116} fill={DIM} fontSize={10.5} fontFamily={sans} textAnchor="middle">el servidor no chequea de quién es el id</text>
      <text x={160} y={140} fill={AMBER} fontSize={10} fontFamily={sans} textAnchor="middle">+1 al id = datos que no son tuyos</text>
      <defs><marker id="idg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker></defs>
    </Frame>
  );
}

function Ssrf() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">SSRF: el servidor pide la URL por vos</text>
      <rect x={22} y={74} width={54} height={38} rx={5} fill={PANEL2} stroke={CYAN} />
      <text x={49} y={97} fill={DIM} fontSize={9} textAnchor="middle" fontFamily={sans}>vos</text>
      <rect x={128} y={68} width={64} height={50} rx={5} fill={PANEL2} stroke={AMBER} />
      <text x={160} y={90} fill={AMBER} fontSize={10} textAnchor="middle" fontFamily={sans}>servidor</text>
      <text x={160} y={104} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={sans}>web</text>
      <rect x={244} y={74} width={62} height={38} rx={5} fill="rgba(255,123,114,0.12)" stroke={RED} />
      <text x={275} y={92} fill={RED} fontSize={9} textAnchor="middle" fontFamily={sans}>interno</text>
      <text x={275} y={104} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>169.254…</text>
      <path d="M76 93h50" stroke={CYAN} strokeWidth={2} markerEnd="url(#ssg)" />
      <path d="M192 93h50" stroke={RED} strokeWidth={2} markerEnd="url(#ssr)" />
      <text x={101} y={86} fill={DIM} fontSize={8} fontFamily={mono} textAnchor="middle">url=…</text>
      <text x={160} y={140} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">llega a lo que vos no alcanzás</text>
      <defs>
        <marker id="ssg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={CYAN} /></marker>
        <marker id="ssr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={RED} /></marker>
      </defs>
    </Frame>
  );
}

function Cmdi() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Inyección de comandos: tu texto se ejecuta</text>
      <rect x={30} y={44} width={260} height={30} rx={5} fill={PANEL} stroke={CYAN} />
      <text x={42} y={64} fill={INK} fontSize={12} fontFamily={mono}>ping 10.0.0.1</text>
      <text x={150} y={64} fill={RED} fontSize={12} fontFamily={mono}>; whoami</text>
      <rect x={30} y={88} width={260} height={62} rx={5} fill="#0a1017" stroke={LINE} />
      <text x={42} y={108} fill={DIM} fontSize={11} fontFamily={mono}>64 bytes from 10.0.0.1…</text>
      <text x={42} y={128} fill={GREEN} fontSize={11} fontFamily={mono}>root</text>
      <text x={42} y={144} fill={DIM} fontSize={9} fontFamily={sans}>el ; encadenó tu comando extra</text>
    </Frame>
  );
}

function Jwt() {
  const segs = [
    { t: "header", c: RED },
    { t: "payload", c: VIOLET },
    { t: "firma", c: CYAN },
  ];
  let x = 26;
  return (
    <Frame>
      <text x={160} y={26} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Un JWT = 3 partes separadas por punto</text>
      {segs.map((s, i) => {
        const w = 80;
        const seg = (
          <g key={i}>
            <rect x={x} y={62} width={w} height={34} rx={5} fill="rgba(255,255,255,0.04)" stroke={s.c} />
            <text x={x + w / 2} y={83} fill={s.c} fontSize={11} fontFamily={mono} textAnchor="middle">{s.t}</text>
            {i < 2 && <text x={x + w + 3} y={84} fill={DIM} fontSize={16} fontFamily={mono}>.</text>}
          </g>
        );
        x += w + 12;
        return seg;
      })}
      <text x={66} y={116} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">algoritmo</text>
      <text x={158} y={116} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">datos (rol!)</text>
      <text x={250} y={116} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">sella todo</text>
      <text x={160} y={144} fill={AMBER} fontSize={10} fontFamily={sans} textAnchor="middle">si la firma es débil, cambiás el rol a admin</text>
    </Frame>
  );
}

function Siem() {
  const logs = ["login fail ana", "login fail ana", "login fail ana", "login OK ana"];
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">El SIEM junta logs y dispara una alerta</text>
      {logs.map((l, i) => (
        <g key={i}>
          <rect x={26} y={36 + i * 22} width={150} height={18} rx={3} fill={PANEL2} stroke={LINE} />
          <text x={34} y={49 + i * 22} fill={i === 3 ? GREEN : DIM} fontSize={9} fontFamily={mono}>{l}</text>
        </g>
      ))}
      <path d="M178 90h26" stroke={AMBER} strokeWidth={2} markerEnd="url(#smg)" />
      <rect x={206} y={64} width={92} height={52} rx={6} fill="rgba(245,181,68,0.12)" stroke={AMBER} />
      <text x={252} y={86} fill={AMBER} fontSize={11} fontFamily={sans} textAnchor="middle">⚠ ALERTA</text>
      <text x={252} y={104} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">fuerza bruta</text>
      <text x={160} y={150} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">la ráfaga de intentos es el patrón que caza</text>
      <defs><marker id="smg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker></defs>
    </Frame>
  );
}

function Reversing() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Reversing: de bytes a instrucciones legibles</text>
      <rect x={22} y={44} width={120} height={96} rx={5} fill={PANEL2} stroke={LINE} />
      <text x={32} y={64} fill={DIM} fontSize={10} fontFamily={mono}>55 48 89 e5</text>
      <text x={32} y={82} fill={DIM} fontSize={10} fontFamily={mono}>8b 45 fc 83</text>
      <text x={32} y={100} fill={DIM} fontSize={10} fontFamily={mono}>f8 2a 74 05</text>
      <text x={82} y={130} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">bytes</text>
      <path d="M146 92h28" stroke={CYAN} strokeWidth={2} markerEnd="url(#rvg)" />
      <rect x={178} y={44} width={120} height={96} rx={5} fill={PANEL2} stroke={CYAN} />
      <text x={188} y={64} fill={GREEN} fontSize={10} fontFamily={mono}>push rbp</text>
      <text x={188} y={82} fill={GREEN} fontSize={10} fontFamily={mono}>mov eax,[..]</text>
      <text x={188} y={100} fill={AMBER} fontSize={10} fontFamily={mono}>cmp eax,0x2a</text>
      <text x={238} y={130} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">ensamblador</text>
      <defs><marker id="rvg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={CYAN} /></marker></defs>
    </Frame>
  );
}

function Contenedor() {
  return (
    <Frame>
      <text x={160} y={24} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Contenedores: apps aisladas sobre un mismo kernel</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={30 + i * 92} y={44} width={80} height={54} rx={6} fill={PANEL2} stroke={CYAN} />
          <rect x={40 + i * 92} y={54} width={60} height={12} rx={2} fill="#0a1017" stroke={GREEN} />
          <text x={70 + i * 92} y={86} fill={DIM} fontSize={9} fontFamily={mono} textAnchor="middle">app{i + 1}</text>
        </g>
      ))}
      <rect x={30} y={108} width={264} height={24} rx={4} fill="rgba(61,174,233,0.10)" stroke={CYAN} />
      <text x={160} y={124} fill={CYAN} fontSize={10} fontFamily={sans} textAnchor="middle">kernel del host (compartido)</text>
      <text x={160} y={150} fill={AMBER} fontSize={10} fontFamily={sans} textAnchor="middle">si te escapás del contenedor, tocás el host</text>
    </Frame>
  );
}

function Adcs() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">ADCS ESC1: pedís un cert a nombre del admin</text>
      <rect x={20} y={70} width={60} height={40} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={50} y={88} fill={GREEN} fontSize={9} textAnchor="middle" fontFamily={sans}>vos</text>
      <text x={50} y={101} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={sans}>user común</text>
      <rect x={128} y={62} width={70} height={56} rx={6} fill={PANEL2} stroke={AMBER} />
      <text x={163} y={84} fill={AMBER} fontSize={10} textAnchor="middle" fontFamily={sans}>CA / plantilla</text>
      <text x={163} y={99} fill={RED} fontSize={8} textAnchor="middle" fontFamily={mono}>SAN=libre</text>
      <text x={163} y={110} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={sans}>emite .pfx</text>
      <rect x={244} y={70} width={62} height={40} rx={5} fill="rgba(185,140,255,0.12)" stroke={VIOLET} />
      <text x={275} y={88} fill={VIOLET} fontSize={9} textAnchor="middle" fontFamily={sans}>PKINIT</text>
      <text x={275} y={101} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>hash NT</text>
      <path d="M80 90h46" stroke={GREEN} strokeWidth={2} markerEnd="url(#acg)" />
      <path d="M198 90h44" stroke={VIOLET} strokeWidth={2} markerEnd="url(#acv)" />
      <text x={160} y={144} fill={RED} fontSize={10} fontFamily={sans} textAnchor="middle">un cert como el DA = sos el DA</text>
      <defs>
        <marker id="acg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker>
        <marker id="acv" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={VIOLET} /></marker>
      </defs>
    </Frame>
  );
}

function Dcsync() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">DCSync: pedís la réplica como si fueras otro DC</text>
      <rect x={30} y={62} width={80} height={54} rx={6} fill="rgba(255,123,114,0.10)" stroke={RED} />
      <text x={70} y={84} fill={RED} fontSize={10} textAnchor="middle" fontFamily={sans}>atacante</text>
      <text x={70} y={100} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={sans}>(Domain Admin)</text>
      <rect x={210} y={62} width={80} height={54} rx={6} fill={PANEL2} stroke={CYAN} />
      <text x={250} y={84} fill={CYAN} fontSize={10} textAnchor="middle" fontFamily={sans}>DC</text>
      <text x={250} y={100} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>NTDS.dit</text>
      <path d="M110 80h96" stroke={RED} strokeWidth={1.8} markerEnd="url(#dsg)" />
      <text x={158} y={74} fill={DIM} fontSize={8} fontFamily={mono} textAnchor="middle">DRSGetNCChanges</text>
      <path d="M206 100h-96" stroke={AMBER} strokeWidth={1.8} markerEnd="url(#dsa)" />
      <text x={158} y={114} fill={AMBER} fontSize={8} fontFamily={mono} textAnchor="middle">hashes (krbtgt…)</text>
      <text x={160} y={150} fill={DIM} fontSize={10} fontFamily={sans} textAnchor="middle">con krbtgt forjás un Golden Ticket</text>
      <defs>
        <marker id="dsg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={RED} /></marker>
        <marker id="dsa" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={AMBER} /></marker>
      </defs>
    </Frame>
  );
}

function Ics() {
  return (
    <Frame>
      <text x={160} y={20} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">IT → OT: del dato al proceso físico</text>
      <rect x={20} y={40} width={80} height={100} rx={6} fill="rgba(61,174,233,0.07)" stroke={CYAN} strokeDasharray="4 3" />
      <text x={60} y={56} fill={CYAN} fontSize={9} textAnchor="middle" fontFamily={sans}>IT</text>
      {["ERP", "historian"].map((s, i) => (
        <g key={i}>
          <rect x={32} y={66 + i * 32} width={56} height={24} rx={3} fill={PANEL2} stroke={LINE} />
          <text x={60} y={82 + i * 32} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>{s}</text>
        </g>
      ))}
      <rect x={220} y={40} width={84} height={100} rx={6} fill="rgba(255,123,114,0.07)" stroke={RED} strokeDasharray="4 3" />
      <text x={262} y={56} fill={RED} fontSize={9} textAnchor="middle" fontFamily={sans}>OT / planta</text>
      {["HMI", "PLC", "bomba"].map((s, i) => (
        <g key={i}>
          <rect x={232} y={62 + i * 26} width={60} height={20} rx={3} fill={PANEL2} stroke={i === 2 ? AMBER : LINE} />
          <text x={262} y={76 + i * 26} fill={i === 2 ? AMBER : DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>{s}</text>
        </g>
      ))}
      <rect x={120} y={72} width={80} height={36} rx={5} fill={PANEL2} stroke={VIOLET} />
      <text x={160} y={90} fill={VIOLET} fontSize={9} textAnchor="middle" fontFamily={sans}>uplink</text>
      <text x={160} y={102} fill={DIM} fontSize={7.5} textAnchor="middle" fontFamily={sans}>doble-homed</text>
      <path d="M100 90h20" stroke={CYAN} strokeWidth={1.6} markerEnd="url(#icg)" />
      <path d="M200 90h20" stroke={RED} strokeWidth={1.6} markerEnd="url(#icr)" />
      <text x={160} y={152} fill={AMBER} fontSize={9.5} fontFamily={sans} textAnchor="middle">Modbus no autentica: alcanzarlo es controlarlo</text>
      <defs>
        <marker id="icg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={CYAN} /></marker>
        <marker id="icr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={RED} /></marker>
      </defs>
    </Frame>
  );
}

function Matrix() {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const lit = new Set([1, 3, 6, 8, 11]);
  const tactics = ["Recon", "Acceso", "Persist.", "Impacto"];
  return (
    <Frame>
      <text x={160} y={20} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">ATT&amp;CK: tácticas (columnas) y técnicas</text>
      {tactics.map((t, i) => (
        <text key={i} x={44 + i * 76} y={40} fill={CYAN} fontSize={8.5} textAnchor="middle" fontFamily={sans}>{t}</text>
      ))}
      {cells.map((c) => {
        const col = c % 4;
        const row = Math.floor(c / 4);
        const on = lit.has(c);
        return (
          <g key={c}>
            <rect x={16 + col * 76} y={48 + row * 30} width={64} height={24} rx={3}
              fill={on ? "rgba(245,181,68,0.18)" : PANEL2} stroke={on ? AMBER : LINE} />
            <text x={48 + col * 76} y={64 + row * 30} fill={on ? AMBER : DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>
              {on ? "T✓" : "·"}
            </text>
          </g>
        );
      })}
      <text x={160} y={152} fill={DIM} fontSize={9.5} fontFamily={sans} textAnchor="middle">cada técnica del ataque enciende su celda</text>
    </Frame>
  );
}

function Purple() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Purple team: el ataque y la defensa en un loop</text>
      <rect x={24} y={58} width={78} height={48} rx={6} fill="rgba(255,123,114,0.10)" stroke={RED} />
      <text x={63} y={80} fill={RED} fontSize={10} textAnchor="middle" fontFamily={sans}>RED</text>
      <text x={63} y={95} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={sans}>emula APT</text>
      <rect x={218} y={58} width={78} height={48} rx={6} fill="rgba(61,174,233,0.10)" stroke={CYAN} />
      <text x={257} y={80} fill={CYAN} fontSize={10} textAnchor="middle" fontFamily={sans}>BLUE</text>
      <text x={257} y={95} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={sans}>detecta/contiene</text>
      <path d="M102 74h116" stroke={RED} strokeWidth={1.8} markerEnd="url(#pug)" />
      <text x={160} y={68} fill={DIM} fontSize={8} fontFamily={sans} textAnchor="middle">técnica</text>
      <path d="M218 92h-116" stroke={CYAN} strokeWidth={1.8} markerEnd="url(#pub)" />
      <text x={160} y={104} fill={DIM} fontSize={8} fontFamily={sans} textAnchor="middle">detección / bloqueo</text>
      <text x={160} y={138} fill={VIOLET} fontSize={11} fontFamily={sans} textAnchor="middle">morado = rojo + azul</text>
      <text x={160} y={154} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">contener corta al adversario en marcha</text>
      <defs>
        <marker id="pug" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={RED} /></marker>
        <marker id="pub" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={CYAN} /></marker>
      </defs>
    </Frame>
  );
}

function Tunnel() {
  return (
    <Frame>
      <text x={160} y={22} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Túnel SOCKS: un pivote abre la red interna</text>
      <rect x={20} y={72} width={54} height={40} rx={5} fill={PANEL2} stroke={GREEN} />
      <text x={47} y={95} fill={GREEN} fontSize={9} textAnchor="middle" fontFamily={sans}>vos</text>
      <rect x={126} y={72} width={60} height={40} rx={5} fill={PANEL2} stroke={AMBER} />
      <text x={156} y={90} fill={AMBER} fontSize={9} textAnchor="middle" fontFamily={sans}>pivote</text>
      <text x={156} y={103} fill={DIM} fontSize={7.5} textAnchor="middle" fontFamily={mono}>:1080</text>
      <rect x={236} y={44} width={72} height={96} rx={6} fill="rgba(185,140,255,0.08)" stroke={VIOLET} strokeDasharray="4 3" />
      <text x={272} y={60} fill={VIOLET} fontSize={8.5} textAnchor="middle" fontFamily={sans}>interna</text>
      {[0, 1, 2].map((i) => <rect key={i} x={248} y={70 + i * 22} width={48} height={16} rx={3} fill={PANEL2} stroke={VIOLET} />)}
      {/* tubo del túnel */}
      <path d="M74 92h52" stroke={GREEN} strokeWidth={8} strokeOpacity={0.25} />
      <path d="M186 92h50" stroke={VIOLET} strokeWidth={8} strokeOpacity={0.25} />
      <path d="M74 92h52" stroke={GREEN} strokeWidth={2} markerEnd="url(#tng)" />
      <path d="M186 92h50" stroke={VIOLET} strokeWidth={2} markerEnd="url(#tnv)" />
      <text x={160} y={150} fill={DIM} fontSize={9.5} fontFamily={sans} textAnchor="middle">proxychains manda tus tools por el túnel</text>
      <defs>
        <marker id="tng" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={GREEN} /></marker>
        <marker id="tnv" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={VIOLET} /></marker>
      </defs>
    </Frame>
  );
}

function Radar() {
  return (
    <Frame>
      <text x={160} y={20} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Tu rastro: cada acción deja huella</text>
      <circle cx={100} cy={96} r={52} fill="none" stroke={LINE} />
      <circle cx={100} cy={96} r={34} fill="none" stroke={LINE} />
      <circle cx={100} cy={96} r={16} fill="none" stroke={LINE} />
      <line x1={48} y1={96} x2={152} y2={96} stroke={LINE} strokeWidth={0.7} />
      <line x1={100} y1={44} x2={100} y2={148} stroke={LINE} strokeWidth={0.7} />
      <path d="M100 96 L142 72" stroke={GREEN} strokeWidth={1.5} />
      {[[128, 74, RED], [78, 68, AMBER], [116, 118, AMBER], [70, 112, GREEN]].map((p, i) => (
        <circle key={i} cx={p[0] as number} cy={p[1] as number} r={4} fill={p[2] as string} />
      ))}
      <rect x={176} y={52} width={130} height={86} rx={6} fill={PANEL2} stroke={LINE} />
      <text x={186} y={72} fill={DIM} fontSize={9} fontFamily={sans}>ruido escaneo</text>
      <rect x={186} y={78} width={110} height={7} rx={3} fill="#0a1017" stroke={LINE} />
      <rect x={186} y={78} width={78} height={7} rx={3} fill={RED} />
      <text x={186} y={104} fill={DIM} fontSize={9} fontFamily={sans}>logins fallidos</text>
      <rect x={186} y={110} width={110} height={7} rx={3} fill="#0a1017" stroke={LINE} />
      <rect x={186} y={110} width={44} height={7} rx={3} fill={AMBER} />
      <text x={240} y={150} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">sigilo = bajar esas barras</text>
    </Frame>
  );
}

function Cloud() {
  return (
    <Frame>
      <text x={160} y={20} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Metadata de la nube: credenciales a un GET</text>
      <rect x={18} y={70} width={58} height={38} rx={5} fill={PANEL2} stroke={CYAN} />
      <text x={47} y={93} fill={DIM} fontSize={9} textAnchor="middle" fontFamily={sans}>app (SSRF)</text>
      <rect x={120} y={60} width={80} height={56} rx={6} fill={PANEL2} stroke={AMBER} />
      <text x={160} y={82} fill={AMBER} fontSize={10} textAnchor="middle" fontFamily={sans}>metadata</text>
      <text x={160} y={97} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>169.254.169.254</text>
      <text x={160} y={108} fill={DIM} fontSize={7.5} textAnchor="middle" fontFamily={sans}>sin auth (v1)</text>
      <rect x={244} y={70} width={62} height={38} rx={5} fill="rgba(255,123,114,0.12)" stroke={RED} />
      <text x={275} y={88} fill={RED} fontSize={9} textAnchor="middle" fontFamily={sans}>IAM temp</text>
      <text x={275} y={101} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>AKIA…</text>
      <path d="M76 89h44" stroke={CYAN} strokeWidth={2} markerEnd="url(#clg)" />
      <path d="M200 89h44" stroke={RED} strokeWidth={2} markerEnd="url(#clr)" />
      <text x={160} y={140} fill={DIM} fontSize={9.5} fontFamily={sans} textAnchor="middle">IMDSv2 exige token (PUT) → corta el SSRF simple</text>
      <defs>
        <marker id="clg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={CYAN} /></marker>
        <marker id="clr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={RED} /></marker>
      </defs>
    </Frame>
  );
}

function Kubernetes() {
  return (
    <Frame>
      <text x={160} y={20} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Kubernetes: el pod habla con el API server</text>
      <rect x={200} y={40} width={104} height={100} rx={6} fill="rgba(61,174,233,0.07)" stroke={CYAN} strokeDasharray="4 3" />
      <text x={252} y={56} fill={CYAN} fontSize={9} textAnchor="middle" fontFamily={sans}>plano de control</text>
      <rect x={214} y={64} width={76} height={22} rx={3} fill={PANEL2} stroke={CYAN} />
      <text x={252} y={79} fill={INK} fontSize={9} textAnchor="middle" fontFamily={mono}>API server</text>
      <rect x={214} y={94} width={76} height={20} rx={3} fill={PANEL2} stroke={LINE} />
      <text x={252} y={108} fill={DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>etcd · RBAC</text>
      <rect x={16} y={54} width={110} height={74} rx={6} fill="rgba(185,140,255,0.06)" stroke={VIOLET} strokeDasharray="4 3" />
      <text x={71} y={70} fill={VIOLET} fontSize={9} textAnchor="middle" fontFamily={sans}>worker node</text>
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={28} y={78 + i * 24} width={86} height={18} rx={3} fill={PANEL2} stroke={i === 0 ? RED : LINE} />
          <text x={71} y={91 + i * 24} fill={i === 0 ? RED : DIM} fontSize={8} textAnchor="middle" fontFamily={mono}>{i === 0 ? "pod ⚠ token" : "pod"}</text>
        </g>
      ))}
      <path d="M114 87h86" stroke={RED} strokeWidth={1.8} markerEnd="url(#kbg)" />
      <text x={160} y={81} fill={DIM} fontSize={8} fontFamily={mono} textAnchor="middle">SA token</text>
      <text x={160} y={150} fill={DIM} fontSize={9.5} fontFamily={sans} textAnchor="middle">RBAC laxo = el pod manda al cluster</text>
      <defs><marker id="kbg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={RED} /></marker></defs>
    </Frame>
  );
}

function SupplyChain() {
  const stages = ["commit", "build", "deploy"];
  return (
    <Frame>
      <text x={160} y={20} fill={DIM} fontSize={12} fontFamily={sans} textAnchor="middle">Cadena de suministro: envenenás una etapa</text>
      {stages.map((s, i) => (
        <g key={i}>
          <rect x={20 + i * 100} y={56} width={80} height={34} rx={6} fill={PANEL2} stroke={i === 1 ? RED : CYAN} />
          <text x={60 + i * 100} y={77} fill={i === 1 ? RED : INK} fontSize={10} textAnchor="middle" fontFamily={mono}>{s}</text>
          {i < 2 && <path d={`M${100 + i * 100} 73h20`} stroke={DIM} strokeWidth={1.6} markerEnd="url(#scg)" />}
        </g>
      ))}
      <text x={160} y={108} fill={RED} fontSize={9.5} fontFamily={sans} textAnchor="middle">dependencia / runner comprometido</text>
      <rect x={60} y={118} width={200} height={22} rx={4} fill="rgba(255,123,114,0.10)" stroke={RED} />
      <text x={160} y={133} fill={DIM} fontSize={9} fontFamily={sans} textAnchor="middle">un solo eslabón infecta a todos los que confían</text>
      <defs><marker id="scg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill={DIM} /></marker></defs>
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
  exploit: Exploit,
  payload: Payload,
  adgrafo: AdGrafo,
  kerberos: Kerberos,
  pth: Pth,
  spray: Spray,
  sniffer: Sniffer,
  crackhash: CrackHash,
  directorios: Directorios,
  subdominios: Subdominios,
  mitm: Mitm,
  pivot: Pivot,
  traversal: Traversal,
  idor: Idor,
  ssrf: Ssrf,
  cmdi: Cmdi,
  jwt: Jwt,
  siem: Siem,
  reversing: Reversing,
  contenedor: Contenedor,
  adcs: Adcs,
  dcsync: Dcsync,
  ics: Ics,
  matrix: Matrix,
  purple: Purple,
  tunnel: Tunnel,
  radar: Radar,
  cloud: Cloud,
  kubernetes: Kubernetes,
  supplychain: SupplyChain,
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
