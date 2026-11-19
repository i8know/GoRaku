import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore, type AuthStatus } from "../store/useAuthStore";

export interface ProtectedRouteProps {
  children?: ReactNode;
}

export function resolveProtectedRouteAction(
  status: AuthStatus,
  user: unknown,
  location: { pathname: string; search: string; hash: string },
):
  | { action: "loading" }
  | {
      action: "redirect";
      to: "/login";
      state: { from: { pathname: string; search: string; hash: string } };
    }
  | { action: "allow" } {
  if (status === "loading") {
    return { action: "loading" };
  }
  if (status !== "signedIn" || !user) {
    return {
      action: "redirect",
      to: "/login",
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      },
    };
  }
  return { action: "allow" };
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const decision = resolveProtectedRouteAction(status, user, location);

  if (decision.action === "loading") {
    return (
      <div
        className="app-shell grid place-items-center min-h-dvh px-4 text-sm text-[var(--tinta-2)]"
        role="status"
        aria-live="polite"
      >
        Memeriksa sesi akun…
      </div>
    );
  }

  if (decision.action === "redirect") {
    return <Navigate to={decision.to} replace state={decision.state} />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export default ProtectedRoute;
