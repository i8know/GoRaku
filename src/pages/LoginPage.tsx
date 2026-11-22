import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Icon, Button } from "../ui";
import { useAuthStore } from "../store/useAuthStore";
import {
  getPasswordStrength,
  sanitizeInternalRedirect,
} from "../lib/supabase";

type AuthMode = "login" | "register" | "forgot";

function extractUrlAuthError(search: string, hash: string): string {
  const sources = [search.replace(/^\?/, ""), hash.replace(/^#/, "")];
  for (const raw of sources) {
    if (!raw) continue;
    const params = new URLSearchParams(raw);
    const desc = params.get("error_description") || params.get("error");
    if (desc) {
      return desc.replace(/\+/g, " ").trim();
    }
  }
  return "";
}

export default function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const recoveryMode = useAuthStore((s) => s.recoveryMode);
  const isConfigured = useAuthStore((s) => s.isConfigured);
  const configError = useAuthStore((s) => s.configError);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset);
  const resendConfirmation = useAuthStore((s) => s.resendConfirmation);

  const location = useLocation();
  const navigate = useNavigate();
  const redirectTarget = sanitizeInternalRedirect(
    (location.state as { from?: unknown } | null)?.from,
    "/beranda",
  );

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const urlError = extractUrlAuthError(location.search, location.hash);
    if (urlError) {
      setError(urlError);
    }
  }, [location.search, location.hash]);

  if (status === "loading") {
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
          <p
            className="welcome-copy text-sm text-[var(--tinta-2)]"
            role="status"
            aria-live="polite"
          >
            Memeriksa sesi autentikasi…
          </p>
        </div>
      </main>
    );
  }

  if (recoveryMode) {
    return <Navigate to="/atur-ulang-sandi" replace />;
  }

  if (status === "signedIn" && user) {
    return <Navigate to={redirectTarget} replace />;
  }

  const strength = getPasswordStrength(password);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setNotice("");
    setPendingConfirmationEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setError(
        configError ||
          "Layanan autentikasi belum dikonfigurasi pada environment aplikasi ini.",
      );
      return;
    }

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    if (mode === "forgot") {
      setError("");
      setNotice("");
      setSubmitting(true);
      const res = await sendPasswordReset(cleanEmail);
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setNotice(
        "Jika alamat email terdaftar di GoRaku, tautan atur ulang kata sandi telah dikirim. Periksa kotak masuk atau folder spam Anda.",
      );
      return;
    }

    if (mode === "register") {
      if (!cleanName) {
        setError("Nama lengkap wajib diisi untuk membuat akun baru.");
        return;
      }
      if (!agreedPrivacy) {
        setError(
          "Anda wajib menyetujui Kebijakan Privasi dan Syarat Penggunaan sebelum mendaftar.",
        );
        return;
      }
      if (!strength.valid) {
        setError("Kata sandi minimal terdiri dari 6 karakter.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Konfirmasi kata sandi tidak cocok.");
        return;
      }
    } else if (!password || password.length < 6) {
      setError("Kata sandi minimal terdiri dari 6 karakter.");
      return;
    }

    setError("");
    setNotice("");
    setSubmitting(true);

    if (mode === "register") {
      const res = await signUp({
        email: cleanEmail,
        password,
        name: cleanName,
      });
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.needsEmailConfirmation) {
        setPendingConfirmationEmail(cleanEmail);
        setNotice(
          "Cek email kamu — klik tautan konfirmasi yang kami kirim untuk mengaktifkan akun GoRaku.",
        );
        return;
      }
      navigate(redirectTarget, { replace: true });
      return;
    }

    const res = await signIn(cleanEmail, password);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate(redirectTarget, { replace: true });
  };

  const handleGoogleSignIn = async () => {
    if (!isConfigured) {
      setError(
        configError ||
          "Layanan autentikasi belum dikonfigurasi pada environment aplikasi ini.",
      );
      return;
    }
    setError("");
    setNotice("");
    setSubmitting(true);
    const res = await signInWithGoogle(redirectTarget);
    if (res.error) {
      setSubmitting(false);
      setError(res.error);
    }
  };

  const handleResend = async () => {
    if (!pendingConfirmationEmail) return;
    setError("");
    setSubmitting(true);
    const res = await resendConfirmation(pendingConfirmationEmail);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNotice("Email verifikasi baru telah dikirim. Periksa kotak masuk atau folder spam Anda.");
  };

  const titleText =
    pendingConfirmationEmail
      ? "Cek email kamu"
      : mode === "register"
        ? "Buat akun"
        : mode === "forgot"
          ? "Lupa kata sandi"
          : "Masuk";

  const subtitleText =
    pendingConfirmationEmail
      ? "Satu langkah lagi sebelum mulai belajar — konfirmasi alamat email Anda melalui tautan yang kami kirimkan."
      : mode === "register"
        ? "Buat akun GoRaku agar ruang belajar Anda terpisah aman di perangkat ini."
        : mode === "forgot"
          ? "Masukkan email akun Anda untuk menerima tautan atur ulang kata sandi."
          : "Masuk ke akun GoRaku untuk mengakses deck, bacaan, dan progres belajarmu.";

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
        <h1>{titleText}</h1>
        <p className="welcome-copy text-xs text-[var(--tinta-2)]">
          {subtitleText}
        </p>

        {!isConfigured && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[rgba(185,60,34,0.3)] bg-[rgba(185,60,34,0.08)] px-3.5 py-2.5 text-xs text-[var(--tinta)]"
          >
            <strong className="block font-semibold text-[var(--shu)] mb-0.5">
              Autentikasi Belum Dikonfigurasi
            </strong>
            <span>
              {configError ||
                "Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY pada environment untuk mengaktifkan masuk dan pendaftaran."}
            </span>
          </div>
        )}

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

        {pendingConfirmationEmail ? (
          <div className="auth-form space-y-3">
            <Button
              className="outline-button w-full justify-center"
              disabled={submitting}
              onClick={() => void handleResend()}
            >
              Kirim ulang email verifikasi
            </Button>
            <Button
              className="outline-button w-full justify-center"
              onClick={() => switchMode("login")}
            >
              Kembali ke halaman Masuk
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {mode === "register" && (
              <label className="field">
                <span>Nama lengkap</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Nama tampilan Anda"
                  autoComplete="name"
                  maxLength={60}
                  required
                  aria-invalid={Boolean(error && !name.trim())}
                />
              </label>
            )}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                autoFocus
              />
            </label>

            {mode !== "forgot" && (
              <label className="field">
                <span>Kata sandi</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Minimal 6 karakter"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                />
              </label>
            )}

            {mode === "register" && (
              <>
                <div
                  className="mb-3 -mt-1 space-y-1"
                  aria-live="polite"
                >
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
                  <span>Konfirmasi kata sandi</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Ulangi kata sandi"
                    autoComplete="new-password"
                    required
                  />
                </label>

                <label className="flex items-start gap-2.5 mb-4 text-xs text-[var(--tinta)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(e) => {
                      setAgreedPrivacy(e.target.checked);
                      if (error) setError("");
                    }}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    Saya telah membaca dan menyetujui{" "}
                    <Link to="/privasi" className="text-[var(--ai)] font-semibold underline">
                      Kebijakan Privasi
                    </Link>{" "}
                    dan{" "}
                    <Link to="/syarat" className="text-[var(--ai)] font-semibold underline">
                      Syarat Penggunaan
                    </Link>
                    .
                  </span>
                </label>
              </>
            )}

            {mode === "login" && (
              <div className="flex justify-end mb-3 -mt-1">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs font-semibold text-[var(--ai)] hover:underline bg-transparent border-0 p-1 min-h-[28px]"
                >
                  Lupa kata sandi?
                </button>
              </div>
            )}

            <Button
              className="primary-light"
              type="submit"
              disabled={
                submitting ||
                !isConfigured ||
                (mode === "register" && !agreedPrivacy)
              }
            >
              <Icon name="check" size={18} />
              {submitting
                ? "Memproses…"
                : mode === "register"
                  ? "Daftar"
                  : mode === "forgot"
                    ? "Kirim tautan reset"
                    : "Masuk"}
            </Button>
          </form>
        )}

        {!pendingConfirmationEmail && (
          <>
            <p className="auth-toggle">
              {mode === "register"
                ? "Sudah punya akun? "
                : mode === "forgot"
                  ? "Ingat kata sandi Anda? "
                  : "Belum punya akun? "}
              <button
                type="button"
                onClick={() =>
                  switchMode(mode === "register" || mode === "forgot" ? "login" : "register")
                }
              >
                {mode === "register" || mode === "forgot" ? "Masuk" : "Daftar"}
              </button>
            </p>

            {mode !== "forgot" && (
              <>
                <div className="auth-divider">
                  <span>atau</span>
                </div>
                <div className="auth-socials">
                  <Button
                    className="outline-button"
                    disabled={submitting || !isConfigured}
                    onClick={() => void handleGoogleSignIn()}
                  >
                    Masuk dengan Google
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap text-xs">
          <Link to="/" className="auth-back !mt-0">
            Kembali ke beranda
          </Link>
          <span aria-hidden="true" className="text-[var(--garis)]">•</span>
          <Link to="/privasi" className="auth-back !mt-0">
            Privasi
          </Link>
          <span aria-hidden="true" className="text-[var(--garis)]">•</span>
          <Link to="/syarat" className="auth-back !mt-0">
            Syarat
          </Link>
        </div>
      </div>
    </main>
  );
}
