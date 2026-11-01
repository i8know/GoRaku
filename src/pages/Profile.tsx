import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, PageHead } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const decks = useAppStore((s) => s.decks);
  const libraryItems = useAppStore((s) => s.libraryItems);
  const updateUser = useAppStore((s) => s.updateUser);
  const getDeckStats = useReviewStore((s) => s.getDeckStats);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "Akira");

  if (!user) return <div className="prof-empty"><p>Silakan login terlebih dahulu.</p></div>;

  // Calculate total stats
  const totalCards = decks.reduce((s, d) => s + d.total, 0);
  const totalDue = decks.reduce((s, d) => s + d.due, 0);
  const totalDecks = decks.length;
  const totalLibrary = libraryItems.length;

  // Calculate streak (mock: days since join)
  const joinDate = new Date("2026-01-15");
  const today = new Date();
  const daysJoined = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  const handleSaveProfile = () => {
    updateUser(displayName, user.level);
    setEditMode(false);
  };

  const handleExportProgress = () => {
    const data = {
      user: { name: user.name, email: user.email, level: user.level },
      decks,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goraku-progress-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChangePassword = () => {
    alert("Fitur ubah password akan tersedia segera.");
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.")) {
      alert("Akun akan dihapus. Anda akan diarahkan ke halaman login.");
      useAppStore.getState().logout();
      navigate("/login");
    }
  };

  return (
    <>
      <PageHead eyebrow="PROFIL PENGGUNA" title="Akun Saya" accent="プロフィール" copy="Kelola identitas, preferensi, dan data pembelajaran Anda.">
        <Button className="pg-primary" onClick={() => navigate("/settings")}><Icon name="settings" size={17} /> Pengaturan</Button>
      </PageHead>

      <div className="prof-container">
        {/* Hero Section */}
        <section className="prof-hero">
          <div className="prof-header">
            <div className="prof-avatar-large">{user.name.charAt(0).toUpperCase()}</div>
            <div className="prof-header-info">
              {!editMode ? (
                <>
                  <h1>{displayName}</h1>
                  <p className="prof-level">{user.level} • Bergabung Januari 2026</p>
                  <p className="prof-email">{user.email}</p>
                  <Button className="prof-edit-btn" onClick={() => setEditMode(true)}>
                    <Icon name="edit" size={14} /> Edit profil
                  </Button>
                </>
              ) : (
                <div className="prof-edit-form">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nama Anda"
                    className="prof-input"
                  />
                  <div className="prof-edit-actions">
                    <Button className="primary-light" onClick={handleSaveProfile}>Simpan</Button>
                    <Button className="outline-button" onClick={() => setEditMode(false)}>Batal</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="prof-stats">
            <div className="prof-stat">
              <span className="prof-stat-label">Hari Belajar</span>
              <strong>{daysJoined}</strong>
            </div>
            <div className="prof-stat">
              <span className="prof-stat-label">Deck Aktif</span>
              <strong>{totalDecks}</strong>
            </div>
            <div className="prof-stat">
              <span className="prof-stat-label">Total Kartu</span>
              <strong>{totalCards.toLocaleString("id-ID")}</strong>
            </div>
            <div className="prof-stat">
              <span className="prof-stat-label">Jatuh Tempo</span>
              <strong className="prof-stat-hot">{totalDue}</strong>
            </div>
            <div className="prof-stat">
              <span className="prof-stat-label">Sumber Library</span>
              <strong>{totalLibrary}</strong>
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <div className="prof-grid">
          {/* Learning Progress */}
          <section className="prof-card">
            <div className="prof-card-head">
              <h3><Icon name="chart" size={18} /> Progres Belajar</h3>
              <Button className="prof-link" onClick={() => navigate("/progress")}>
                Lihat detail <Icon name="arrow" size={14} />
              </Button>
            </div>
            <div className="prof-progress-list">
              {decks.slice(0, 3).map((deck) => (
                <div key={deck.id} className="prof-progress-item">
                  <div>
                    <p className="prof-progress-title">{deck.title}</p>
                    <small>{deck.total} kartu • {deck.progress}%</small>
                  </div>
                  <div className="prof-progress-bar">
                    <div style={{ width: `${deck.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="prof-card">
            <h3><Icon name="bolt" size={18} /> Aksi Cepat</h3>
            <div className="prof-actions">
              <Button className="prof-action-btn primary-light" onClick={() => navigate("/beranda")}>
                <Icon name="play" size={18} />
                <div><strong>Mulai Review</strong><small>Kartu yang jatuh tempo</small></div>
              </Button>
              <Button className="prof-action-btn primary-light" onClick={() => navigate("/mining")}>
                <Icon name="mine" size={18} />
                <div><strong>Sentence Mining</strong><small>Tambah kata dari sumber</small></div>
              </Button>
              <Button className="prof-action-btn primary-light" onClick={() => navigate("/library")}>
                <Icon name="book" size={18} />
                <div><strong>Jelajahi Library</strong><small>Temukan sumber baru</small></div>
              </Button>
            </div>
          </section>

          {/* Account Settings */}
          <section className="prof-card prof-card-danger">
            <h3><Icon name="lock" size={18} /> Keamanan Akun</h3>
            <div className="prof-settings-list">
              <div className="prof-setting-item">
                <div>
                  <p><strong>Kata Sandi</strong></p>
                  <small>Ubah kata sandi login Anda</small>
                </div>
                <Button className="outline-button" onClick={handleChangePassword}>
                  <Icon name="key" size={14} /> Ubah
                </Button>
              </div>
              <div className="prof-setting-item">
                <div>
                  <p><strong>Email Verifikasi</strong></p>
                  <small>{user.email} • Terverifikasi</small>
                </div>
                <Button className="outline-button" disabled>
                  <Icon name="check" size={14} /> Terverifikasi
                </Button>
              </div>
              <div className="prof-setting-item">
                <div>
                  <p><strong>Sesi Aktif</strong></p>
                  <small>Saat ini masuk di 1 perangkat</small>
                </div>
                <Button className="outline-button">
                  Kelola Sesi
                </Button>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="prof-card">
            <h3><Icon name="upload" size={18} /> Manajemen Data</h3>
            <div className="prof-data-actions">
              <Button className="outline-button" onClick={handleExportProgress}>
                <Icon name="download" size={16} /> Ekspor Progres
              </Button>
              <Button className="outline-button">
                <Icon name="upload" size={16} /> Impor Data
              </Button>
              <Button className="outline-button warn" onClick={() => alert("Fitur reset progress akan segera tersedia")}>
                <Icon name="refresh" size={16} /> Reset Progres
              </Button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="prof-card prof-card-danger">
            <h3><Icon name="alert" size={18} /> Zona Berbahaya</h3>
            <p className="prof-danger-text">Tindakan di bawah ini tidak dapat dibatalkan. Lakukan dengan hati-hati.</p>
            <Button className="outline-button warn" onClick={handleDeleteAccount}>
              <Icon name="trash" size={16} /> Hapus Akun Selamanya
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
