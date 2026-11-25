import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Icon } from "../ui";
import { useAuthStore } from "../store/useAuthStore";
import { extractSafeUrlAuthError, getPasswordStrength } from "../lib/supabase";

export default function ResetPasswordPage() {
  const status = useAuthStore((s) => s.status);
  const recoveryMode = useAuthStore((s) => s.recoveryMode);
  const isConfigured = useAuthStore((s) => s.isConfigured);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const clearRecoveryMode = useAuthStore((s) => s.clearRecoveryMode);

  const location = useLocation();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const urlError = extractSafeUrlAuthError(location.search, location.hash);
    if (urlError) {
      setError(urlError);
    }
  }, [location.search, location.hash]);

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.valid) {
      setError("Kata sandi baru minimal terdiri dari 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setError("");
    setNotice("");
    setSubmitting(true);
    const res = await updatePassword(newPassword);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    clearRecoveryMode();
    setNotice("Kata sandi berhasil diperbarui. Mengalihkan ke dashboard…");
    navigate("/beranda", { replace: true });
  };

  const hasValidSession = status === "signedIn" || recoveryMode;

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">語</span>
          <span className="brand-copy">
            <strong>語楽</strong>
            <small>GORAKU</small>
          </span>
        </div>

        <h1>Atur Ulang Kata Sandi</h1>
        <p className="welcome-copy text-xs text-[var(--tinta-2)]">
          Masukkan kata sandi baru untuk akun GoRaku Anda.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-[rgba(185,60,34,0.3)] bg-[rgba(185,60,34,0.08)] px-3 py-2 text-xs font-medium text-[var(--shu)]"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-lg border border-[var(--garis)] bg-[var(--mizu-soft)] px-3 py-2 text-xs font-medium text-[var(--kon)]"
          >
            {notice}
          </p>
        )}

        {status === "loading" ? (
          <p
            className="mt-5 text-center text-sm text-[var(--tinta-2)]"
            role="status"
            aria-live="polite"
          >
            Memverifikasi tautan pemulihan…
          </p>
        ) : !isConfigured || !hasValidSession ? (
          <div className="auth-form space-y-3 text-center">
            <p className="text-xs text-[var(--tinta-2)]">
              Tautan pemulihan tidak valid, sudah digunakan, atau telah kedaluwarsa.
            </p>
            <Link to="/login" className="outline-button w-full justify-center no-underline">
              Kembali ke halaman Masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <label className="field">
              <span>Kata sandi baru</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                required
                autoFocus
              />
            </label>

            <div className="mb-3 -mt-1 space-y-1" aria-live="polite">
              <div className="flex gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{
                      background:
                        strength.score >= step
                          ? strength.score === 3
                            ? "var(--ok)"
                            : "var(--ai)"
                          : "var(--garis)",
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-[var(--tinta-2)]">
                Kekuatan sandi: <strong className="text-[var(--kon)]">{strength.label}</strong>
              </p>
            </div>

            <label className="field">
              <span>Konfirmasi kata sandi baru</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Ulangi kata sandi baru"
                autoComplete="new-password"
                required
              />
            </label>

            <Button className="primary-light" type="submit" disabled={submitting}>
              <Icon name="check" size={18} />
              {submitting ? "Menyimpan…" : "Simpan Kata Sandi Baru"}
            </Button>
          </form>
        )}

        <Link to="/" className="auth-back">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
