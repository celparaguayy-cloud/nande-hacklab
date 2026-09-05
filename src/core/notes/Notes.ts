/**
 * Notas del escritorio de ÑANDE.
 *
 * Un bloc de notas simple: crear, editar y borrar notas, todo persistido.
 */

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedTick: number;
}

const STORAGE_KEY = "nande-notes";

export class Notes {
  private notes: Map<string, Note>;
  private counter: number;

  constructor() {
    const saved = this.load();
    this.notes = new Map((saved?.notes ?? []).map((n) => [n.id, n]));
    this.counter = saved?.counter ?? 1;
  }

  private load(): { notes: Note[]; counter: number } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as { notes: Note[]; counter: number };
      if (!saved || !Array.isArray(saved.notes)) return null;
      return saved;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          notes: Array.from(this.notes.values()),
          counter: this.counter,
        }),
      );
    } catch {
      // Sin guardado las notas viven solo en esta sesión.
    }
  }

  all(): Note[] {
    return Array.from(this.notes.values())
      .sort((a, b) => b.updatedTick - a.updatedTick)
      .map((n) => ({ ...n }));
  }

  get(id: string): Note | undefined {
    const n = this.notes.get(id);
    return n ? { ...n } : undefined;
  }

  count(): number {
    return this.notes.size;
  }

  create(title: string, body: string, tick: number): Note {
    const note: Note = {
      id: `note-${this.counter++}`,
      title: title.trim() || "Sin título",
      body,
      updatedTick: tick,
    };
    this.notes.set(note.id, note);
    this.save();
    return { ...note };
  }

  update(id: string, changes: Partial<Pick<Note, "title" | "body">>, tick: number): Note | undefined {
    const note = this.notes.get(id);
    if (!note) return undefined;

    if (changes.title !== undefined) note.title = changes.title.trim() || "Sin título";
    if (changes.body !== undefined) note.body = changes.body;
    note.updatedTick = tick;

    this.save();
    return { ...note };
  }

  remove(id: string): boolean {
    const ok = this.notes.delete(id);
    if (ok) this.save();
    return ok;
  }
}
