export interface VirtualUser {
  username: string;
  uid: number;
  groups: string[];
  home: string;
  isRoot: boolean;
}

export class VirtualUsers {
  private users: Map<string, VirtualUser>;

  constructor() {
    this.users = new Map();

    this.addUser({
      username: "root",
      uid: 0,
      groups: ["root", "admin"],
      home: "/root",
      isRoot: true,
    });

    this.addUser({
      username: "student",
      uid: 1000,
      groups: ["users"],
      home: "/home/student",
      isRoot: false,
    });
  }

  addUser(user: VirtualUser): void {
    if (this.users.has(user.username)) {
      throw new Error(`El usuario ya existe: ${user.username}`);
    }

    this.users.set(user.username, user);
  }

  getUser(username: string): VirtualUser | undefined {
    return this.users.get(username);
  }

  getAllUsers(): VirtualUser[] {
    return Array.from(this.users.values());
  }

  userExists(username: string): boolean {
    return this.users.has(username);
  }

  isRoot(username: string): boolean {
    return this.users.get(username)?.isRoot ?? false;
  }
}
