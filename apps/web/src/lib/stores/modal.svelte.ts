import type { Snippet } from "svelte";

export type ModalAction = {
  label: string;
  class?: string;
  onClick?: () => void | Promise<void>;
  closeOnClick?: boolean;
};

export type ModalOptions = {
  title?: string;
  body: Snippet | string;
  actions?: ModalAction[];
};

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClass?: string;
};

class ModalStore {
  open = $state(false);
  options = $state<ModalOptions | null>(null);

  show(options: ModalOptions) {
    this.options = options;
    this.open = true;
  }

  close() {
    this.open = false;
    this.options = null;
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.show({
        title: options.title,
        body: options.message,
        actions: [
          {
            label: options.cancelLabel ?? "Cancel",
            class: "btn-ghost",
            onClick: () => resolve(false),
          },
          {
            label: options.confirmLabel ?? "Confirm",
            class: options.confirmClass ?? "btn-primary",
            onClick: () => resolve(true),
          },
        ],
      });
    });
  }
}

export const modalStore = new ModalStore();
