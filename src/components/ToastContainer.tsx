import { useToastStore } from "../store/useToastStore";

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div style={{ position: "fixed", bottom: 25, right: 25, zIndex: 120, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
