/**
 * ContainerRuntime — un runtime de contenedores/Kubernetes VIRTUAL. Modela, de
 * forma educativa y determinista, dos fallas clásicas del mundo cloud-native:
 *
 *  1. Secretos filtrados en variables de entorno (un `env` que expone una
 *     credencial o token dentro del contenedor).
 *  2. Contenedor PRIVILEGIADO con el filesystem del host montado: permite
 *     "escapar" y leer un archivo del nodo (container escape).
 *
 * Es estado real: `exec env` muestra lo que de verdad tiene el contenedor, y
 * `escape` sólo funciona si el contenedor es privilegiado y monta el host. No
 * hay Docker real ni host real: todo es ficticio y sandboxeado.
 */

export interface Mount {
  hostPath: string;
  containerPath: string;
  readOnly: boolean;
}

export interface Container {
  name: string;
  image: string;
  namespace: string;
  status: "Running" | "Pending" | "CrashLoopBackOff";
  env: Record<string, string>;
  privileged: boolean;
  mounts: Mount[];
  /** Puerto expuesto del pod (informativo). */
  port?: number;
}

/** Campos de env que son secretos (fuga si están en claro). */
const SECRET_ENV = ["TOKEN", "SECRET", "PASSWORD", "PASS", "APIKEY", "API_KEY", "KEY", "DB_PASSWORD"];

export const NODE_FLAG_PATH = "/host/root/flag.txt";
export const NODE_FLAG = "ND{container_escape_privilegiado}";
export const K8S_SECRET_FLAG = "ND{k8s_secret_en_env}";

export class ContainerRuntime {
  private containers = new Map<string, Container>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    // Un frontend "sano" (sin secretos, no privilegiado).
    this.add({
      name: "web-frontend",
      image: "nande/web:1.4",
      namespace: "default",
      status: "Running",
      env: { NODE_ENV: "production", API_URL: "http://api.default.svc" },
      privileged: false,
      mounts: [],
      port: 80,
    });

    // Un pod de API que FILTRA un secreto en env (mala práctica real).
    this.add({
      name: "api-backend",
      image: "nande/api:2.1",
      namespace: "default",
      status: "Running",
      env: {
        NODE_ENV: "production",
        DB_HOST: "postgres.default.svc",
        DB_PASSWORD: "Sup3rS3cr3t!", // ← secreto en claro: fuga
        JWT_SECRET: K8S_SECRET_FLAG, // ← la bandera vive acá
      },
      privileged: false,
      mounts: [],
      port: 8080,
    });

    // Un "debug pod" PRIVILEGIADO con el host montado: escape de contenedor.
    this.add({
      name: "debug-tools",
      image: "nande/debug:latest",
      namespace: "kube-system",
      status: "Running",
      env: { DEBUG: "1" },
      privileged: true,
      mounts: [{ hostPath: "/", containerPath: "/host", readOnly: false }],
    });
  }

  private add(c: Container): void {
    this.containers.set(c.name.toLowerCase(), c);
  }

  /* ------------------------------------------------------------- consulta */

  list(namespace?: string): Container[] {
    const all = [...this.containers.values()];
    return namespace ? all.filter((c) => c.namespace === namespace) : all;
  }

  get(name: string): Container | undefined {
    return this.containers.get(name.toLowerCase());
  }

  /** `exec <c> env`: las variables de entorno REALES del contenedor. */
  env(name: string): Record<string, string> | null {
    return this.get(name)?.env ?? null;
  }

  /** Secretos expuestos en el env de un contenedor (fuga educativa). */
  leakedSecrets(name: string): { key: string; value: string }[] {
    const c = this.get(name);
    if (!c) return [];
    return Object.entries(c.env)
      .filter(([k]) => SECRET_ENV.some((s) => k.toUpperCase().includes(s)))
      .map(([key, value]) => ({ key, value }));
  }

  /** ¿El contenedor puede escapar al host? (privilegiado + monta el host) */
  canEscape(name: string): boolean {
    const c = this.get(name);
    if (!c) return false;
    return c.privileged && c.mounts.some((m) => m.hostPath === "/" && !m.readOnly);
  }

  /**
   * Intenta el escape: si el contenedor es privilegiado y monta el host,
   * "leés" un archivo del nodo a través del montaje. Devuelve el contenido
   * (incluida la bandera) o un error si no se puede escapar.
   */
  escape(name: string, hostFile = NODE_FLAG_PATH): { ok: boolean; content?: string; message: string } {
    const c = this.get(name);
    if (!c) return { ok: false, message: `contenedor desconocido: ${name}` };
    if (!this.canEscape(name)) {
      return {
        ok: false,
        message: `${name} no es privilegiado o no monta el host: no hay escape`,
      };
    }
    // El montaje del host expone su filesystem: leemos el archivo del nodo.
    const mount = c.mounts.find((m) => m.hostPath === "/")!;
    if (!hostFile.startsWith(mount.containerPath)) {
      return { ok: false, message: `ruta ${hostFile} fuera del montaje ${mount.containerPath}` };
    }
    return { ok: true, content: NODE_FLAG, message: `leíste ${hostFile} del nodo vía ${name}` };
  }
}
