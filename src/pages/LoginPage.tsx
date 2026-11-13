import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon, Button } from "../ui";
import { useAppStore } from "../store/useAppStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanName = name.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    if (isRegister && !cleanName) {
      setError("Nama lengkap wajib diisi untuk membuat akun baru.");
      return;
    }
    setError("");
    login(cleanName || "Akira", cleanEmail || "akira@immersion.jp");
    navigate("/beranda");
  };

  const quickLogin = (providerName: string, providerEmail: string) => {
    setError("");
    login(providerName, providerEmail);
    navigate("/beranda");
  };

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">語</span>
          <span className="brand-copy"><strong>語楽</strong><small>GORAKU</small></span>
        </div>
        <h1>{isRegister ? "Buat akun" : "Masuk"}</h1>
        <p className="welcome-copy">
          {isRegister ? "Daftar untuk mulai belajar." : "Selamat kembali, pelajar."}
        </p>

        <form onSubmit={submit} className="auth-form" noValidate>
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-[rgba(185,60,34,0.3)] bg-[rgba(185,60,34,0.08)] px-3 py-2 text-xs font-medium text-[var(--shu)]"
            >
              {error}
            </p>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="akira@example.com"
              autoComplete="email"
              aria-invalid={Boolean(error && email.trim())}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Nama</span>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
              placeholder="Akira"
              autoComplete="name"
              required={isRegister}
              aria-invalid={Boolean(error && isRegister && !name.trim())}
            />
          </label>
          <label className="field">
            <span>Kata sandi</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>
          <Button className="primary-light" type="submit"><Icon name="check" size={18} /> {isRegister ? "Daftar" : "Masuk"}</Button>
        </form>

        <p className="auth-toggle">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }}>
            {isRegister ? "Masuk" : "Daftar"}
          </button>
        </p>

        <div className="auth-divider"><span>atau</span></div>
        <div className="auth-socials">
          <Button className="outline-button" onClick={() => quickLogin("Akira", "akira@gmail.com")}>Google</Button>
          <Button className="outline-button" onClick={() => quickLogin("Akira", "akira@github.com")}>GitHub</Button>
        </div>

        <Link to="/" className="auth-back">Kembali ke beranda</Link>
      </div>
    </main>
  );
}