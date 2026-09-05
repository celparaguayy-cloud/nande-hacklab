/**
 * Unica red de la simulacion: 10.10.0.0/16. Nada fuera de aqui es
 * alcanzable. 10.10.0.x son los servicios base y 10.10.1.x en adelante
 * queda para los servidores que levantan los habitantes.
 */
const VIRTUAL_SUBNET = "10.10.";

export interface VirtualInterface {
  name: string;
  mac: string;
  ip: string;
  netmask: string;
  gateway: string;
  dns: string;
  up: boolean;
}

export interface VirtualNetworkState {
  interfaces: VirtualInterface[];
}

export class VirtualNetwork {
  private state: VirtualNetworkState;

  constructor() {
    const saved = this.loadFromStorage();

    this.state = saved ?? {
      interfaces: [
        {
          name: "lo",
          mac: "00:00:00:00:00:00",
          ip: "127.0.0.1",
          netmask: "255.0.0.0",
          gateway: "0.0.0.0",
          dns: "127.0.0.1",
          up: true,
        },
        {
          name: "eth0",
          mac: "02:00:00:00:00:10",
          ip: "10.10.0.10",
          netmask: "255.255.255.0",
          gateway: "10.10.0.1",
          dns: "10.10.0.53",
          up: true,
        },
      ],
    };

    this.saveToStorage();
  }

  private loadFromStorage(): VirtualNetworkState | null {
    try {
      const raw = localStorage.getItem("nande-os-network");

      if (!raw) return null;

      const saved = JSON.parse(raw) as VirtualNetworkState;

      if (
        !saved ||
        !Array.isArray(saved.interfaces)
      ) {
        return null;
      }

      return saved;
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        "nande-os-network",
        JSON.stringify(this.state),
      );
    } catch {
      // El almacenamiento puede estar deshabilitado.
    }
  }

  getState(): VirtualNetworkState {
    return structuredClone(this.state);
  }

  getInterface(name: string): VirtualInterface | undefined {
    const iface = this.state.interfaces.find(
      (item) => item.name === name,
    );

    return iface
      ? structuredClone(iface)
      : undefined;
  }

  listInterfaces(): VirtualInterface[] {
    return structuredClone(this.state.interfaces);
  }

  setInterfaceState(name: string, up: boolean): void {
    const iface = this.state.interfaces.find(
      (item) => item.name === name,
    );

    if (!iface) {
      throw new Error(`Interfaz no encontrada: ${name}`);
    }

    iface.up = up;
    this.saveToStorage();
  }

  /**
   * Alcance dentro de la red virtual. Antes solo cuatro direcciones
   * sueltas respondian y cualquier servidor web quedaba inalcanzable.
   * Ahora responde toda la red virtual mientras eth0 este activa,
   * y nada fuera de ella: la simulacion no sale de 10.10.0.0/16.
   */
  isReachable(address: string): boolean {
    if (address === "127.0.0.1") {
      return this.getInterface("lo")?.up === true;
    }

    if (!address.startsWith(VIRTUAL_SUBNET)) {
      return false;
    }

    return this.getInterface("eth0")?.up === true;
  }
}
