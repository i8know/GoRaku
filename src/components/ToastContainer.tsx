import { useToastStore } from "../store/useToastStore";

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div style={{ position: "fixed", bottom: 25, right: 25, zIndex: 120, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast"
          role={toast.persistent ? "alert" : "status"}
          style={toasts.length > 1 ? { position: "static" } : undefined}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.onClick}
              className="rounded px-2 py-1 text-[11px] font-semibold bg-white text-[var(--kon)] hover:opacity-90 cursor-pointer shrink-0 border-0"
            >
              {toast.action.label}
            </button>
          )}
          {toast.persistent && (
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup pemberitahuan"
              className="rounded px-1.5 py-0.5 text-xs text-white/80 hover:text-white bg-transparent border-0 cursor-pointer shrink-0"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
