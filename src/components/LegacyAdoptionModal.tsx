import { useEffect, useState } from "react";
import {
  adoptLegacyDataForUser,
  clearLegacyLocalData,
  deferLegacyForSession,
  markLegacyDeclinedForUser,
  type LegacyDataSummary,
} from "../lib/legacyAdoption";
import { Button, Icon } from "../ui";

export interface LegacyAdoptionModalProps {
  open: boolean;
  userId: string;
  userEmail: string;
  summary: LegacyDataSummary;
  onClose: () => void;
  onAdopted: () => void;
}

export default function LegacyAdoptionModal({
  open,
  userId,
  userEmail,
  summary,
  onClose,
  onAdopted,
}: LegacyAdoptionModalProps) {
  const [busy, setBusy] = useState(false);
  const [confirmClearLegacy, setConfirmClearLegacy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        deferLegacyForSession(userId);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, userId, onClose]);

  if (!open) return null;

  const handleAdopt = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await adoptLegacyDataForUser(userId);
      onAdopted();
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message
          ? `Penyalinan data belum selesai: ${err.message}`
          : "Gagal menghubungkan data lama. Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = () => {
    if (busy) return;
    markLegacyDeclinedForUser(userId);
    onClose();
  };

  const handleDefer = () => {
    if (busy) return;
    deferLegacyForSession(userId);
    onClose();
  };

  const handleClearLegacy = async () => {
    if (busy) return;
    if (!confirmClearLegacy) {
      setConfirmClearLegacy(true);
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      await clearLegacyLocalData();
      onClose();
    } catch {
      setErrorMsg("Gagal menghapus data lokal lama. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const details: string[] = [];
  if (summary.customDeckCount > 0) details.push(`${summary.customDeckCount} deck`);
  if (summary.cardCount > 0) details.push(`${summary.cardCount.toLocaleString("id-ID")} kartu`);
  if (summary.reviewLogCount > 0) details.push(`${summary.reviewLogCount.toLocaleString("id-ID")} log ulasan`);
  if (summary.bookCount > 0) details.push(`${summary.bookCount} buku/manga`);
  if (summary.dictionaryCount > 0) details.push(`${summary.dictionaryCount} kamus`);
  if (summary.questionPackCount > 0) details.push(`${summary.questionPackCount} paket soal`);
  if (details.length === 0 && summary.hasReviewStorage) details.push("progres jadwal FSRS");

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="imp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legacy-adopt-title"
        style={{ maxWidth: 520 }}
      >
        <header className="imp-head">
          <div>
            <p className="eyebrow">DATA LOKAL DITEMUKAN</p>
            <h2 id="legacy-adopt-title">Hubungkan data belajar lama?</h2>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={handleDefer}
            disabled={busy}
            aria-label="Tunda nanti"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div style={{ display: "grid", gap: "14px", padding: "18px 20px" }}>
          <p style={{ margin: 0, color: "var(--tinta-2)", lineHeight: 1.55 }}>
            Peramban ini menyimpan data belajar sebelum sistem akun aktif (
            <strong>{details.join(", ") || "data belajar lokal"}</strong>). Hubungkan data
            tersebut ke akun <strong>{userEmail || "ini"}</strong> agar riwayat dan dekmu tetap
            terbawa?
          </p>

          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "0.875rem",
              color: "var(--tinta-2)",
              lineHeight: 1.5,
            }}
          >
            Jika kamu memilih <strong>Mulai kosong</strong>, akun ini tidak akan menerima data
            tersebut. Pada perangkat bersama, kamu juga dapat memilih{" "}
            <strong>Hapus data lama</strong> untuk membuang salinan pra-akun secara permanen dari
            peramban ini agar tidak ditawarkan ke akun lain.
          </div>

          {errorMsg && (
            <div className="auth-alert auth-alert-error" role="alert">
              <Icon name="alert" size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
            }}
          >
            <Button
              type="button"
              className={`outline-button warn ${confirmClearLegacy ? "armed" : ""}`}
              onClick={() => void handleClearLegacy()}
              disabled={busy}
            >
              <Icon name="trash" size={14} />{" "}
              {confirmClearLegacy ? "Klik lagi untuk hapus permanen" : "Hapus data lama"}
            </Button>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
              <Button type="button" className="btn btn-ghost" onClick={handleDefer} disabled={busy}>
                Nanti
              </Button>
              <Button type="button" className="btn btn-ghost" onClick={handleDecline} disabled={busy}>
                Mulai kosong
              </Button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "var(--shu)", borderColor: "var(--shu)", color: "#fff" }}
                onClick={handleAdopt}
                disabled={busy}
              >
                {busy
                  ? "Menyalin data…"
                  : errorMsg
                    ? "Coba lagi"
                    : "Hubungkan ke akun ini"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
