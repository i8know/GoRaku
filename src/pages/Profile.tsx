import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, PageHead } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";
import { liveDeckStats, type LiveDeckStats } from "../lib/deckStats";
import { aggregateParentStats, getLeafDescendantDecks } from "../lib/deckSubdecks";
import { listNovels } from "../lib/bookStorage";

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const decks = useAppStore((s) => s.decks);
  const settings = useAppStore((s) => s.settings);
  const libraryItems = useAppStore((s) => s.libraryItems);
  const updateUser = useAppStore((s) => s.updateUser);
  const srsCards = useReviewStore((s) => s.srsCards);
  const newIntroduced = useReviewStore((s) => s.newIntroduced);
  const [booksCount, setBooksCount] = useState(0);

  useEffect(() => {
    let alive = true;
    void listNovels()
      .then((items) => {
        if (alive) setBooksCount(items.length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "Akira");
  const [nameError, setNameError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) return <div className="prof-empty"><p>Silakan login terlebih dahulu.</p></div>;

  // Calculate total stats
  const stats = useMemo(() => {
    const m = new Map<string, LiveDeckStats>();
    for (const d of decks) {
      const children = decks.filter((c) => c.parentId === d.id);
      if (children.length > 0) {
        m.set(d.id, aggregateParentStats(d, children, srsCards, newIntroduced, settings, decks));
      } else {
        m.set(d.id, liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings));
      }
    }
    return m;
  }, [decks, srsCards, newIntroduced, settings]);

  const rootDecks = useMemo(() => decks.filter((d) => !d.parentId), [decks]);
  const leafDecks = useMemo(
    () => decks.filter((d) => decks.every((c) => c.parentId !== d.id)),
    [decks],
  );
  const deckTotalCount = (d: (typeof decks)[number]) => {
    const leaves = getLeafDescendantDecks(d.id, decks);
    return leaves.length > 0 ? leaves.reduce((s, l) => s + l.total, 0) : d.total;
  };
  const totalCards = useMemo(() => leafDecks.reduce((s, d) => s + d.total, 0), [leafDecks]);
  const totalDue = useMemo(
    () => rootDecks.reduce((s, d) => s + (stats.get(d.id)?.due ?? 0), 0),
    [rootDecks, stats],
  );
  const totalDecks = rootDecks.length;
  const totalLibrary = booksCount > 0 ? booksCount : libraryItems.length;

  // Calculate streak (mock: days since join)
  const joinDate = new Date("2026-01-15");
  const today = new Date();
  const daysJoined = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = displayName.trim();
    if (!clean) {
      setNameError("Nama tampilan tidak boleh kosong.");
      return;
    }
    setNameError("");
    setDisplayName(clean);
    updateUser(clean, user.level);
    setEditMode(false);
    setStatusNotice("Nama tampilan diperbarui.");
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
    setStatusNotice("Progres berhasil diekspor.");
  };

  const handleDeleteAccount = () => {
    useAppStore.getState().logout();
    navigate("/login");
  };

  return (
    <>
      <PageHead eyebrow="PROFIL PENGGUNA" title="Akun Saya" accent="プロフィール" copy="Kelola identitas, preferensi, dan data pembelajaran Anda.">
        <Button className="pg-primary" onClick={() => navigate("/settings")}><Icon name="settings" size={17} /> Pengaturan</Button>
      </PageHead>

      <div className="prof-container">
        {statusNotice && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-[var(--garis)] bg-[var(--mizu-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--kon)]"
          >
            {statusNotice}
          </p>
        )}
        {/* Hero Section */}
        <section className="prof-hero">
          <div className="prof-header">
            <div className="prof-avatar-large">{user.name.charAt(0).toUpperCase()}</div>
            <div className="prof-header-info">
              {!editMode ? (
                <>
                  <h2>{displayName}</h2>
                  <p className="prof-level">{user.level} • Bergabung Januari 2026</p>
                  <p className="prof-email">{user.email}</p>
                  <Button className="prof-edit-btn" onClick={() => { setEditMode(true); setNameError(""); }}>
                    <Icon name="edit" size={14} /> Edit profil
                  </Button>
                </>
              ) : (
                <form className="prof-edit-form" onSubmit={handleSaveProfile} noValidate>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); if (nameError) setNameError(""); }}
                    placeholder="Nama Anda"
                    aria-label="Nama tampilan"
                    aria-invalid={Boolean(nameError)}
                    maxLength={40}
                    required
                    className="prof-input"
                  />
                  {nameError && (
                    <span role="alert" className="text-xs font-medium text-[var(--shu)]">
                      {nameError}
                    </span>
                  )}
                  <div className="prof-edit-actions">
                    <Button className="primary-light" type="submit">Simpan</Button>
                    <Button className="outline-button" onClick={() => { setDisplayName(user.name); setNameError(""); setEditMode(false); }}>Batal</Button>
                  </div>
                </form>
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
              <span className="prof-stat-label">Koleksi Pustaka</span>
              <strong>{totalLibrary}</strong>
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <div className="prof-grid">
          {/* Learning Progress */}
          <section className="prof-card">
            <div className="prof-card-head">
              <h2><Icon name="chart" size={18} /> Progres Belajar</h2>
              <Button className="prof-link" onClick={() => navigate("/progress")}>
                Lihat detail <Icon name="arrow" size={14} />
              </Button>
            </div>
            <div className="prof-progress-list">
              {rootDecks.slice(0, 3).map((deck) => {
                const st = stats.get(deck.id);
                const deckTotal = deckTotalCount(deck);
                const deckProgress = st?.progress ?? deck.progress;
                return (
                  <div key={deck.id} className="prof-progress-item">
                    <div>
                      <p className="prof-progress-title">{deck.title}</p>
                      <small>{deckTotal} kartu • {deckProgress}%</small>
                    </div>
                    <div className="prof-progress-bar">
                      <div style={{ width: `${deckProgress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="prof-card">
            <h2><Icon name="bolt" size={18} /> Aksi Cepat</h2>
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
                <div><strong>Jelajahi Perpustakaan</strong><small>Temukan sumber baru</small></div>
              </Button>
            </div>
          </section>

          {/* Account Settings */}
          <section className="prof-card">
            <h2><Icon name="lock" size={18} /> Keamanan Akun</h2>
            <div className="prof-settings-list">
              <div className="prof-setting-item">
                <div>
                  <p><strong>Kata Sandi</strong></p>
                  <small>Ubah kata sandi login Anda</small>
                </div>
                <Button className="outline-button" onClick={() => setStatusNotice("Pengelolaan kata sandi offline dikelola lewat perangkat.")}>
                  <Icon name="key" size={14} /> Ubah
                </Button>
              </div>
              <div className="prof-setting-item">
                <div>
                  <p><strong>Email Verifikasi</strong></p>
                  <small>{user.email ? `${user.email} • Terverifikasi` : "Akun lokal • Terverifikasi"}</small>
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
                <Button className="outline-button" onClick={() => setStatusNotice("Hanya 1 sesi lokal aktif pada browser ini.")}>
                  Kelola Sesi
                </Button>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="prof-card">
            <h2><Icon name="upload" size={18} /> Manajemen Data</h2>
            <div className="prof-data-actions">
              <Button className="outline-button" onClick={handleExportProgress}>
                <Icon name="download" size={16} /> Ekspor Progres
              </Button>
              <Button className="outline-button" onClick={() => navigate("/deck")}>
                <Icon name="upload" size={16} /> Impor Data
              </Button>
              <Button className="outline-button warn" onClick={() => navigate("/settings")}>
                <Icon name="refresh" size={16} /> Kelola &amp; Reset Progres
              </Button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="prof-card prof-card-danger">
            <h2><Icon name="alert" size={18} /> Zona Berbahaya</h2>
            <p className="prof-danger-text">Tindakan di bawah ini akan mengeluarkan akun dan menghapus sesi lokal. Lakukan dengan hati-hati.</p>
            {!confirmDelete ? (
              <Button className="outline-button warn" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={16} /> Hapus Akun Selamanya
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button className="outline-button warn" onClick={handleDeleteAccount}>
                  <Icon name="trash" size={16} /> Konfirmasi Hapus Akun
                </Button>
                <Button className="outline-button" onClick={() => setConfirmDelete(false)}>
                  Batal
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
