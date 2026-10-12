export type ToastTone = "default" | "success" | "destructive";
export type ToastCloseReason = "timeout" | "action" | "dismiss";

export type ToastOptions = {
  message: string;
  tone?: ToastTone;
  /** Botão opcional no aviso, por exemplo "Desfazer". */
  action?: { label: string; onclick: () => void };
  /** Milissegundos até sumir. 0 deixa o aviso fixo até ser fechado. */
  duration?: number;
  /** Chamado uma vez quando o aviso some, dizendo por quê. */
  onclose?: (reason: ToastCloseReason) => void;
};

export type ToastItem = Required<Pick<ToastOptions, "message" | "tone" | "duration">> &
  Pick<ToastOptions, "action" | "onclose"> & { id: number };

class ToastStore {
  items = $state<ToastItem[]>([]);
  #next = 1;
  #timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(options: ToastOptions): number {
    const id = this.#next++;
    const item: ToastItem = { id, tone: "default", duration: 4000, ...options };
    this.items = [...this.items, item];
    if (item.duration > 0)
      this.#timers.set(
        id,
        setTimeout(() => this.close(id, "timeout"), item.duration),
      );
    return id;
  }

  close(id: number, reason: ToastCloseReason = "dismiss") {
    const item = this.items.find((candidate) => candidate.id === id);
    if (!item) return;
    clearTimeout(this.#timers.get(id));
    this.#timers.delete(id);
    this.items = this.items.filter((candidate) => candidate.id !== id);
    item.onclose?.(reason);
  }

  /** Executa a ação do aviso e o fecha. */
  act(id: number) {
    const item = this.items.find((candidate) => candidate.id === id);
    if (!item) return;
    item.action?.onclick();
    this.close(id, "action");
  }
}

export const toast = new ToastStore();
