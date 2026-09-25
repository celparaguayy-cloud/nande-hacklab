/**
 * NetworkLife — la red interna VIVA: otros "jugadores" que habitan el mundo.
 *
 * ÑANDE no tiene multijugador por red (rompería el aislamiento: ver
 * isolation.test.ts). En su lugar, el mundo está POBLADO por actores autónomos
 * que comparten el MISMO estado que vos: operadores y admins que trabajan en
 * los hosts, y otros operadores (rivales) que también están adentro. Cuando
 * pivoteás a un host, `who`/`w` te muestra quién más hay logueado — no estás
 * solo. Es la sensación de multijugador, dentro del sandbox.
 *
 * "Real" acá = estado DERIVADO y determinista, no texto al azar (regla 13/19):
 * la presencia de cada habitante es una función pura del reloj del mundo (el
 * mismo `tick` que todo lo demás), así que es reproducible y coherente. No hay
 * red real, no se muta nada por fuera: `sessionsOn(host, tick)` calcula quién
 * está ahora. Los rivales reusan la MISMA identidad del ranking (RivalHackers),
 * una sola fuente de verdad (regla 2/8).
 */

/** Un habitante del mundo con sesión periódica en un host (NPC o rival). */
export interface Resident {
  /** Usuario con el que aparece logueado. */
  user: string;
  /** Host (hostname) que habita. */
  host: string;
  /** IP desde la que se conecta (su workstation / salto de gestión). */
  fromIp: string;
  /** Rol legible (para dar contexto). */
  role: string;
  /** staff = personal legítimo; rival = otro operador (competencia real). */
  kind: "staff" | "rival";
  /** Actividades que rota mientras está logueado (se elige por tick). */
  activity: string[];
  /** Período de su ciclo de presencia, en ticks (1 tick ≈ 1 minuto). */
  period: number;
  /** Cuántos ticks del período está presente (ventana activa). */
  active: number;
  /** Desfase de fase, para que no entren y salgan todos a la vez. */
  offset: number;
}

/** Una sesión viva sobre un host, calculada para un tick dado. */
export interface LiveSession {
  user: string;
  fromIp: string;
  role: string;
  kind: "staff" | "rival";
  /** Minutos que lleva inactivo (derivado del tick). */
  idleMin: number;
  /** Qué está haciendo ahora (derivado del tick). */
  activity: string;
}

export class NetworkLife {
  private residents: Resident[] = [];
  private now: () => number;

  constructor(now: () => number) {
    this.now = now;
    this.seed();
  }

  /** Alta de un habitante (lo usan los tests y futuras extensiones). */
  add(resident: Resident): void {
    this.residents.push(resident);
  }

  /** Todos los habitantes registrados (sin filtrar por presencia). */
  all(): Resident[] {
    return [...this.residents];
  }

  /**
   * ¿Está presente este habitante en `tick`? Función pura: la fase del ciclo
   * cae dentro de la ventana activa. Determinista y reproducible.
   */
  private present(r: Resident, tick: number): boolean {
    const phase = ((tick + r.offset) % r.period + r.period) % r.period;
    return phase < r.active;
  }

  /**
   * Sesiones vivas sobre un host AHORA (o en un tick dado). Deriva del reloj
   * del mundo: mismo estado que ve todo el sandbox. No muta nada.
   */
  sessionsOn(host: string, tick: number = this.now()): LiveSession[] {
    const key = host.toLowerCase();
    return this.residents
      .filter((r) => r.host.toLowerCase() === key && this.present(r, tick))
      .map((r) => {
        const phase = ((tick + r.offset) % r.period + r.period) % r.period;
        // Idle: dentro de la ventana activa, cuánto hace que "no toca teclas".
        const idleMin = phase % 7;
        const activity = r.activity[Math.floor(tick / 3) % r.activity.length];
        return { user: r.user, fromIp: r.fromIp, role: r.role, kind: r.kind, idleMin, activity };
      })
      .sort((a, b) => a.user.localeCompare(b.user));
  }

  /** ¿Hay algún rival (otro operador) logueado en este host ahora? */
  rivalOn(host: string, tick: number = this.now()): LiveSession | undefined {
    return this.sessionsOn(host, tick).find((s) => s.kind === "rival");
  }

  /**
   * Habitantes de la red interna que construimos (corp → BD → OT) y del
   * objetivo del red team. Cada uno con un ciclo propio: la mayoría del tiempo
   * hay alguien, pero no siempre los mismos — el mundo respira.
   */
  private seed(): void {
    // --- Personal legítimo (staff) que trabaja en cada host ---
    this.add({
      user: "soporte", host: "server.nande", fromIp: "10.10.0.15",
      role: "Soporte / mesa de ayuda", kind: "staff",
      activity: ["tail -f /var/log/syslog", "vim tickets.md", "systemctl status nginx"],
      period: 90, active: 55, offset: 0,
    });
    this.add({
      user: "respaldo", host: "nas.interna.nande", fromIp: "10.10.66.5",
      role: "Job de respaldos nocturno", kind: "staff",
      activity: ["rsync /srv/datos → db-core", "verificando snapshots", "du -sh /srv/datos"],
      period: 60, active: 20, offset: 12,
    });
    this.add({
      user: "admin", host: "caja.interna.nande", fromIp: "10.10.66.5",
      role: "Sysadmin de la LAN", kind: "staff",
      activity: ["psql clientes", "revisando cron", "top"],
      period: 120, active: 40, offset: 30,
    });
    this.add({
      user: "dbadmin", host: "db-core.interna.nande", fromIp: "10.10.88.5",
      role: "DBA (base central)", kind: "staff",
      activity: ["psql -c 'VACUUM ANALYZE'", "pg_dump maestra", "monitoreando réplicas"],
      period: 100, active: 60, offset: 20,
    });
    this.add({
      user: "operador", host: "hmi.planta.nande", fromIp: "10.10.77.2",
      role: "Operador de planta (turno)", kind: "staff",
      activity: ["monitoreando proceso", "ajustando setpoint", "registrando lote"],
      period: 80, active: 70, offset: 5,
    });

    // --- Otro OPERADOR (rival) que también está adentro: la sensación de
    // multijugador. Reusa un alias real del ranking (RivalHackers) — misma
    // identidad, una sola fuente de verdad. Aparece de a ratos sobre el
    // objetivo del red team: podés cruzártelo.
    this.add({
      user: "0xMbói", host: "objetivo.corp.nande", fromIp: "10.10.9.66",
      role: "Operador rival (Año'ῖ)", kind: "rival",
      activity: ["enumerando servicios", "probando credenciales", "montando persistencia"],
      period: 70, active: 22, offset: 8,
    });
  }
}
