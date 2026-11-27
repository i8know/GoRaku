import { Link } from "react-router-dom";
import { Icon, type IconName } from "../ui";
import { CURRENT_CONSENT_VERSION, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { useSyncStore } from "../store/useSyncStore";

export interface SyncStatusBadgeProps {
  variant?: "sidebar" | "topbar";
  collapsed?: boolean;
}

export interface SyncPresentation {
  tone: "ok" | "syncing" | "pending" | "muted" | "warn";
  icon: IconName;
  label: string;
  shortLabel: string;
  title: string;
  spinning?: boolean;
}

export function deriveSyncPresentation(params: {
  status: ReturnType<typeof useSyncStore.getState>["status"];
  pendingCount: number;
  quarantinedCount: number;
  pausedOnDevice: boolean;
  progress: ReturnType<typeof useSyncStore.getState>["progress"];
  consentPending: boolean;
  lastError: string | null;
}): SyncPresentation {
  if (params.consentPending) {
    return {
      tone: "warn",
      icon: "lock",
      label: "Menunggu persetujuan",
      shortLabel: "Persetujuan",
      title: "Setujui pembaruan kebijakan privasi untuk mulai menyinkronkan data belajar",
    };
  }
  if (params.pausedOnDevice || params.status === "paused") {
    return {
      tone: "muted",
      icon: "clock",
      label: "Sinkronisasi dijeda",
      shortLabel: "Dijeda",
      title: "Sinkronisasi dijeda di perangkat ini · klik untuk mengelola di Pengaturan",
    };
  }
  if (params.status === "auth_required") {
    return {
      tone: "warn",
      icon: "alert",
      label: "Masuk ulang",
      shortLabel: "Masuk ulang",
      title: "Sesi akun berakhir · masuk ulang agar sinkronisasi dapat dilanjutkan",
    };
  }
  if (params.status === "offline") {
    const suffix = params.pendingCount > 0 ? ` (${params.pendingCount})` : "";
    return {
      tone: "muted",
      icon: "clock",
      label: `Offline${suffix}`,
      shortLabel: `Offline${suffix}`,
      title: "Perangkat sedang offline · perubahan tersimpan aman di perangkat ini",
    };
  }
  if (params.status === "syncing") {
    const hasProgress = params.progress && params.progress.total > 1;
    const progressText = hasProgress
      ? `Menyinkronkan ${params.progress!.done}/${params.progress!.total}`
      : "Menyinkronkan…";
    return {
      tone: "syncing",
      icon: "refresh",
      label: progressText,
      shortLabel: hasProgress ? `${params.progress!.done}/${params.progress!.total}` : "Sinkron…",
      title: progressText,
      spinning: true,
    };
  }
  if (params.status === "error") {
    return {
      tone: "warn",
      icon: "alert",
      label: "Sinkronisasi gagal",
      shortLabel: "Gagal",
      title: params.lastError || "Sinkronisasi gagal · klik untuk melihat detail di Pengaturan",
    };
  }
  if (params.quarantinedCount > 0) {
    return {
      tone: "warn",
      icon: "alert",
      label: `${params.quarantinedCount} perlu ditinjau`,
      shortLabel: `${params.quarantinedCount} ditinjau`,
      title: `${params.quarantinedCount} perubahan ditolak server · klik untuk meninjau di Pengaturan`,
    };
  }
  if (params.pendingCount > 0) {
    return {
      tone: "pending",
      icon: "upload",
      label: `${params.pendingCount} belum tersinkron`,
      shortLabel: `${params.pendingCount} tertunda`,
      title: `${params.pendingCount} perubahan menunggu disinkronkan`,
    };
  }
  return {
    tone: "ok",
    icon: "check",
    label: "Tersinkron",
    shortLabel: "Tersinkron",
    title: "Data belajar tersinkronisasi dengan akunmu",
  };
}

export default function SyncStatusBadge({
  variant = "sidebar",
  collapsed = false,
}: SyncStatusBadgeProps) {
  const authStatus = useAuthStore((s) => s.status);
  const authConfigured = useAuthStore((s) => s.isConfigured);
  const authProfile = useAuthStore((s) => s.profile);

  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const quarantinedCount = useSyncStore((s) => s.quarantined.length);
  const pausedOnDevice = useSyncStore((s) => s.pausedOnDevice);
  const progress = useSyncStore((s) => s.progress);
  const lastError = useSyncStore((s) => s.lastError);

  if (authStatus !== "signedIn" || (!authConfigured && !isSupabaseConfigured)) {
    return null;
  }

  const consentPending = authProfile?.consent_version !== CURRENT_CONSENT_VERSION;
  const view = deriveSyncPresentation({
    status,
    pendingCount,
    quarantinedCount,
    pausedOnDevice,
    progress,
    consentPending,
    lastError,
  });

  const text = variant === "topbar" ? view.shortLabel : view.label;

  return (
    <Link
      to="/settings#sinkronisasi"
      className={`sync-pill sync-pill--${variant} sync-tone--${view.tone}${collapsed ? " is-collapsed" : ""}`}
      title={view.title}
      aria-label={`Status sinkronisasi: ${view.label}`}
      aria-live="polite"
    >
      <span className={`sync-pill-icon${view.spinning ? " is-spinning" : ""}`} aria-hidden="true">
        <Icon name={view.icon} size={13} />
      </span>
      {!collapsed && <span className="sync-pill-text">{text}</span>}
    </Link>
  );
}
