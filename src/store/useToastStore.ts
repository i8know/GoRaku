import { create } from "zustand";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  action?: ToastAction;
  /** Durasi dalam ms; 0 = bertahan sampai ditutup pengguna. Bawaan: 3200 ms. */
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  action?: ToastAction;
  persistent?: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  notify: (message: string) => void;
  notifyWithOptions: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => {
  const pushToast = (message: string, options?: ToastOptions) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const durationMs = options?.durationMs ?? 3200;
    const persistent = durationMs <= 0;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          message,
          ...(options?.action ? { action: options.action } : {}),
          ...(persistent ? { persistent: true } : {}),
        },
      ],
    }));
    if (!persistent) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, durationMs);
    }
  };

  return {
    toasts: [],
    notify: (message) => pushToast(message),
    notifyWithOptions: pushToast,
    dismiss: (id) =>
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  };
});
