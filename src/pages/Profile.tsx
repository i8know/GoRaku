import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon, Button, PageHead } from "../ui";
import SignOutButton from "../components/SignOutButton";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useReviewStore } from "../store/useReviewStore";
import { liveDeckStats, type LiveDeckStats } from "../lib/deckStats";
import { aggregateParentStats, getLeafDescendantDecks } from "../lib/deckSubdecks";
import { listNovels } from "../lib/bookStorage";
import {
  DELETE_ACCOUNT_CONFIRMATION_WORD,
  deleteCurrentUserAccount,
  downloadUserAccountExport,
} from "../lib/accountData";
import {
  getPasswordStrength,
  hasEmailPasswordIdentity,
  normalizeJlptLevel,
} from "../lib/supabase";

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const decks = useAppStore((s) => s.decks);
  const settings = useAppStore((s) => s.settings);
  const deckLimits = useAppStore((s) => s.deckLimits);
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
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [selectedLevel, setSelectedLevel] = useState(normalizeJlptLevel(user?.level));
  const [savingProfile, setSavingProfile] = useState(false);
  const [nameError, setNameError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");

  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [exportingData, setExportingData] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const authUser = useAuthStore((s) => s.user);
  const authProfile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const isEmailPasswordUser = hasEmailPasswordIdentity(authUser);
  const passwordStrength = getPasswordStrength(newPassword);

  useEffect(() => {
    setDisplayName(user?.name || "");
    setSelectedLevel(normalizeJlptLevel(user?.level));
  }, [user?.name, user?.level]);

  if (!user) return <div className="prof-empty"><p>Silakan login terlebih dahulu.</p></div>;

  // Calculate total stats
  const stats = useMemo(() => {
    const m = new Map<string, LiveDeckStats>();
    for (const d of decks) {
      const children = decks.filter((c) => c.parentId === d.id);
      if (children.length > 0) {
        m.set(d.id, aggregateParentStats(d, children, srsCards, newIntroduced, settings, decks, Date.now(), deckLimits));
      } else {
        m.set(d.id, liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings, Date.now(), deckLimits));
      }
    }
    return m;
  }, [decks, srsCards, newIntroduced, settings, deckLimits]);

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

  const joinedAtSource = authUser?.created_at ?? authProfile?.consented_at ?? null;
  const daysJoined = useMemo(() => {
    if (!joinedAtSource) return 1;
    const ms = new Date(joinedAtSource).getTime();
    if (!Number.isFinite(ms)) return 1;
    return Math.max(1, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)) + 1);
  }, [joinedAtSource]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = displayName.trim();
    if (!clean) {
      setNameError("Nama tampilan tidak boleh kosong.");
      return;
    }
    setNameError("");
    setErrorNotice("");
    setStatusNotice("");
    const normalizedLevel = normalizeJlptLevel(selectedLevel);

    if (authUser) {
      setSavingProfile(true);
      const res = await updateProfile({
        display_name: clean,
        jlpt_level: normalizedLevel,
      });
      setSavingProfile(false);
      if (res.error) {
        setErrorNotice(res.error);
        return;
      }
    } else {
      updateUser(clean, normalizedLevel);
    }

    setDisplayName(clean);
    setSelectedLevel(normalizedLevel);
    setEditMode(false);
    setStatusNotice("Profil berhasil disimpan.");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");
    setStatusNotice("");
    if (newPassword.length < 8) {
      setErrorNotice("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorNotice("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }
    setSavingPassword(true);
    const res = await updatePassword(newPassword);
    setSavingPassword(false);
    if (res.error) {
      setErrorNotice(res.error);
      return;
    }
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordFormOpen(false);
    setStatusNotice("Kata sandi berhasil diperbarui.");
  };

  const handleExportMyData = async () => {
    setErrorNotice("");
    setStatusNotice("");
    setExportingData(true);
    try {
      await downloadUserAccountExport(authUser, authProfile);
      setStatusNotice("Seluruh data akun dan progres belajar Anda berhasil diekspor (JSON).");
    } catch {
      setErrorNotice("Gagal mengekspor data akun. Silakan coba lagi.");
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION_WORD) {
      setErrorNotice(`Ketik "${DELETE_ACCOUNT_CONFIRMATION_WORD}" terlebih dahulu untuk mengonfirmasi penghapusan.`);
      return;
    }
    setErrorNotice("");
    setStatusNotice("");
    setDeletingAccount(true);
    const res = await deleteCurrentUserAccount({ userId: authUser?.id ?? null });
    setDeletingAccount(false);
    if (res.error) {
      setErrorNotice(res.error);
      return;
    }
    navigate("/", { replace: true });
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
        {errorNotice && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-[rgba(185,60,34,0.3)] bg-[rgba(185,60,34,0.08)] px-4 py-2.5 text-xs font-semibold text-[var(--shu)]"
          >
            {errorNotice}
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
                  <p className="prof-level">Target JLPT {user.level}</p>
                  <p className="prof-email">{user.email}</p>
                  <div className="prof-header-actions">
                    <Button className="prof-edit-btn" onClick={() => { setEditMode(true); setNameError(""); }}>
                      <Icon name="edit" size={14} /> Edit profil
                    </Button>
                    <SignOutButton variant="label" />
                  </div>
                </>
              ) : (
                <form className="prof-edit-form" onSubmit={(e) => void handleSaveProfile(e)} noValidate>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); if (nameError) setNameError(""); }}
                    placeholder="Nama Anda"
                    aria-label="Nama tampilan"
                    aria-invalid={Boolean(nameError)}
                    maxLength={40}
                    required
                    disabled={savingProfile}
                    className="prof-input"
                  />
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(normalizeJlptLevel(e.target.value))}
                    aria-label="Target level JLPT"
                    disabled={savingProfile}
                    className="prof-input"
                  >
                    {JLPT_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Target {lvl}
                      </option>
                    ))}
                  </select>
                  {nameError && (
                    <span role="alert" className="text-xs font-medium text-[var(--shu)]">
                      {nameError}
                    </span>
                  )}
                  <div className="prof-edit-actions">
                    <Button className="primary-light" type="submit" disabled={savingProfile}>
                      {savingProfile ? "Menyimpan…" : "Simpan"}
                    </Button>
                    <Button
                      className="outline-button"
                      disabled={savingProfile}
                      onClick={() => {
                        setDisplayName(user.name);
                        setSelectedLevel(normalizeJlptLevel(user.level));
                        setNameError("");
                        setEditMode(false);
                      }}
                    >
                      Batal
                    </Button>
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
                  <small>
                    {isEmailPasswordUser
                      ? "Ganti kata sandi untuk akun email Anda"
                      : "Akun ini masuk melalui Google; kelola kata sandi melalui akun Google Anda."}
                  </small>
                </div>
                {isEmailPasswordUser && (
                  <Button
                    className="outline-button"
                    onClick={() => {
                      setPasswordFormOpen((prev) => !prev);
                      setErrorNotice("");
                    }}
                  >
                    <Icon name="key" size={14} /> {passwordFormOpen ? "Tutup" : "Ganti kata sandi"}
                  </Button>
                )}
              </div>

              {isEmailPasswordUser && passwordFormOpen && (
                <form
                  onSubmit={(e) => void handleChangePassword(e)}
                  noValidate
                  className="rounded-xl border border-[var(--garis)] bg-[var(--bg)] p-4 grid gap-3"
                >
                  <label className="grid gap-1 text-xs font-semibold">
                    <span>Kata sandi baru (minimal 8 karakter)</span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={savingPassword}
                      className="prof-input"
                    />
                    {newPassword.length > 0 && (
                      <small className="text-[var(--tinta-2)] font-normal">
                        {passwordStrength.label}
                      </small>
                    )}
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    <span>Konfirmasi kata sandi baru</span>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={savingPassword}
                      className="prof-input"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" className="primary-light" disabled={savingPassword}>
                      {savingPassword ? "Menyimpan…" : "Simpan kata sandi"}
                    </Button>
                  </div>
                </form>
              )}

              <div className="prof-setting-item">
                <div>
                  <p><strong>Email Akun</strong></p>
                  <small>
                    {authUser?.email
                      ? `${authUser.email} • ${authUser.email_confirmed_at ? "Terverifikasi" : "Menunggu verifikasi"}`
                      : user.email}
                  </small>
                </div>
                <Button className="outline-button" disabled>
                  <Icon name="check" size={14} /> Aktif
                </Button>
              </div>
              <div className="prof-setting-item">
                <div>
                  <p><strong>Privasi &amp; Syarat</strong></p>
                  <small>
                    Persetujuan versi{" "}
                    <code>{authProfile?.consent_version ?? "-"}</code>
                  </small>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold">
                  <Link to="/privasi" className="text-[var(--ai)] hover:underline">
                    Kebijakan Privasi
                  </Link>
                  <Link to="/syarat" className="text-[var(--ai)] hover:underline">
                    Syarat Penggunaan
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="prof-card">
            <h2><Icon name="upload" size={18} /> Manajemen Data</h2>
            <div className="prof-data-actions">
              <Button
                className="outline-button"
                disabled={exportingData}
                onClick={() => void handleExportMyData()}
              >
                <Icon name="download" size={16} />{" "}
                {exportingData ? "Menyiapkan ekspor…" : "Ekspor data saya (JSON)"}
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
            <h2><Icon name="alert" size={18} /> Hapus Akun</h2>
            <p className="prof-danger-text">
              Penghapusan akun bersifat permanen: akun Supabase, data profil di server, serta
              seluruh deck, kartu, jadwal FSRS, dan pustaka lokal milik akun ini di peramban akan
              dihapus.
            </p>
            {!confirmDelete ? (
              <Button
                className="outline-button warn"
                onClick={() => {
                  setConfirmDelete(true);
                  setDeleteConfirmText("");
                  setErrorNotice("");
                }}
              >
                <Icon name="trash" size={16} /> Hapus Akun Selamanya
              </Button>
            ) : (
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-semibold text-[var(--tinta)]">
                  <span>
                    Ketik <code>{DELETE_ACCOUNT_CONFIRMATION_WORD}</code> untuk mengonfirmasi:
                  </span>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={DELETE_ACCOUNT_CONFIRMATION_WORD}
                    aria-label="Konfirmasi penghapusan akun"
                    disabled={deletingAccount}
                    className="prof-input"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      background: "var(--shu)",
                      borderColor: "var(--shu)",
                      color: "#fff",
                    }}
                    disabled={
                      deletingAccount ||
                      deleteConfirmText.trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION_WORD
                    }
                    onClick={() => void handleDeleteAccount()}
                  >
                    <Icon name="trash" size={16} />{" "}
                    {deletingAccount ? "Menghapus akun…" : "Hapus akun saya selamanya"}
                  </button>
                  <Button
                    className="outline-button"
                    disabled={deletingAccount}
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteConfirmText("");
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
