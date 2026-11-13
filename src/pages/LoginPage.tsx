import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon, Button } from "../ui";
import { useAppStore } from "../store/useAppStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(name || "Akira", email || "akira@immersion.jp");
    navigate("/beranda");
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">語</span>
          <span className="brand-copy"><strong>語楽</strong><small>GORAKU</small></span>
        </div>
        <h2>{isRegister ? "Buat akun" : "Masuk"}</h2>
        <p className="welcome-copy">
          {isRegister ? "Daftar untuk mulai belajar." : "Selamat kembali, pelajar."}
        </p>

        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="akira@example.com" autoFocus />
          </label>
          <label className="field">
            <span>Nama</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Akira" />
          </label>
          <label className="field">
            <span>Kata sandi</span>
            <input type="password" placeholder="••••••••" />
          </label>
          <Button className="primary-light" type="submit"><Icon name="check" size={18} /> {isRegister ? "Daftar" : "Masuk"}</Button>
        </form>

        <p className="auth-toggle">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button type="button" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Masuk" : "Daftar"}
          </button>
        </p>

        <div className="auth-divider"><span>atau</span></div>
        <div className="auth-socials">
          <Button className="outline-button" onClick={() => login("Akira", "akira@gmail.com")}>Google</Button>
          <Button className="outline-button" onClick={() => login("Akira", "akira@github.com")}>GitHub</Button>
        </div>

        <Link to="/" className="auth-back">Kembali ke beranda</Link>
      </div>
    </div>
  );
}