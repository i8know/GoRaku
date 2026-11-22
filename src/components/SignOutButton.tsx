import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../ui";
import { useAuthStore, type AuthActionResult } from "../store/useAuthStore";
import { useToastStore } from "../store/useToastStore";

export type SignOutButtonVariant = "label" | "icon";

let intentionalSignOutPending = false;
let intentionalSignOutResetTimer: ReturnType<typeof setTimeout> | null = null;

export function markIntentionalSignOut(): void {
  if (intentionalSignOutResetTimer !== null) {
    clearTimeout(intentionalSignOutResetTimer);
    intentionalSignOutResetTimer = null;
  }
  intentionalSignOutPending = true;
}

export function scheduleIntentionalSignOutReset(): void {
  if (intentionalSignOutResetTimer !== null) {
    clearTimeout(intentionalSignOutResetTimer);
  }
  intentionalSignOutResetTimer = setTimeout(() => {
    intentionalSignOutPending = false;
    intentionalSignOutResetTimer = null;
  }, 0);
}

export function isIntentionalSignOutActive(): boolean {
  return intentionalSignOutPending;
}

export interface SignOutButtonProps {
  /** "label": ikon logout + teks "Keluar". "icon": ikon saja dengan aria-label & tooltip "Keluar". */
  variant?: SignOutButtonVariant;
  className?: string;
  iconSize?: number;
  onBeforeSignOut?: () => void;
  onAfterSignOut?: () => void;
}

export interface SignOutFlowControllerDeps {
  signOut: () => Promise<AuthActionResult>;
  notify: (message: string) => void;
  navigateToLogin: () => void;
  onBeforeSignOut?: () => void;
  onPendingChange: (pending: boolean) => void;
}

/**
 * Menjalankan alur keluar akun dengan proteksi klik ganda sinkron,
 * status proses ("Keluar…"), notifikasi toast bila terjadi galat,
 * dan pengalihan akhir ke layar masuk (`/login`).
 */
export function createSignOutFlowHandler(
  deps: SignOutFlowControllerDeps,
  inFlightRef: { current: boolean } = { current: false },
): () => Promise<boolean> {
  return async () => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    markIntentionalSignOut();
    deps.onPendingChange(true);

    try {
      deps.onBeforeSignOut?.();
      const res = await deps.signOut();
      if (res?.error) {
        deps.notify(res.error);
      }
      deps.navigateToLogin();
      return true;
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Gagal keluar dari akun. Sesi lokal tetap dibersihkan.";
      deps.notify(message);
      deps.navigateToLogin();
      return true;
    } finally {
      inFlightRef.current = false;
      scheduleIntentionalSignOutReset();
      deps.onPendingChange(false);
    }
  };
}

export interface SignOutButtonViewProps {
  variant: SignOutButtonVariant;
  signingOut: boolean;
  className?: string;
  iconSize?: number;
  onClick: () => void;
}

export function SignOutButtonView({
  variant,
  signingOut,
  className = "",
  iconSize = 16,
  onClick,
}: SignOutButtonViewProps) {
  const label = signingOut ? "Keluar…" : "Keluar";

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={`signout-icon-btn ${className}`.trim()}
        aria-label={label}
        title={label}
        disabled={signingOut}
        aria-busy={signingOut || undefined}
        onClick={onClick}
      >
        <Icon name="logout" size={iconSize} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`outline-button signout-btn ${className}`.trim()}
      disabled={signingOut}
      aria-busy={signingOut || undefined}
      onClick={onClick}
    >
      <Icon name="logout" size={iconSize} />
      <span>{label}</span>
    </button>
  );
}

export default function SignOutButton({
  variant = "label",
  className = "",
  iconSize = 16,
  onBeforeSignOut,
  onAfterSignOut,
}: SignOutButtonProps) {
  const signOut = useAuthStore((s) => s.signOut);
  const notify = useToastStore((s) => s.notify);
  const navigate = useNavigate();

  const [signingOut, setSigningOut] = useState(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSignOut = createSignOutFlowHandler(
    {
      signOut,
      notify,
      onBeforeSignOut,
      navigateToLogin: () => {
        if (onAfterSignOut) {
          onAfterSignOut();
        } else {
          navigate("/login", { replace: true, state: null });
        }
      },
      onPendingChange: (pending) => {
        if (mountedRef.current) {
          setSigningOut(pending);
        }
      },
    },
    inFlightRef,
  );

  return (
    <SignOutButtonView
      variant={variant}
      signingOut={signingOut}
      className={className}
      iconSize={iconSize}
      onClick={() => void handleSignOut()}
    />
  );
}
