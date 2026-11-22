import { useEffect, useState } from "react";
import { getScopedStorageItem, setScopedStorageItem } from "../lib/userStorageScope";
import { Hanko, Icon } from "../ui";

export const FIRST_RUN_DISMISSED_KEY = "goraku.firstRun.dismissed";
export const FIRST_RUN_COMPLETED_SHOWN_KEY = "goraku.firstRun.completedShown";

function readStorageFlag(key: string): boolean {
  return getScopedStorageItem(key) === "1";
}

function writeStorageFlag(key: string, value: "1"): void {
  setScopedStorageItem(key, value);
}

export interface FirstRunChecklistProps {
  activeDictCount: number;
  booksCount: number;
  minedCardsCount: number;
  reviewedCount: number;
  onOpenDictManager: () => void;
  onAddBook: () => void;
  onStartMining: () => void;
  onStartReview: () => void;
  layout?: "stack" | "wide";
  className?: string;
}

interface ChecklistStep {
  id: string;
  done: boolean;
  title: string;
  detail: string;
  cta: string;
  onAction: () => void;
}

/**
 * Daftar periksa orientasi awal berbasis data nyata pengguna.
 * Tampil di Beranda & Perpustakaan hingga seluruh langkah selesai atau ditutup.
 */
export default function FirstRunChecklist({
  activeDictCount,
  booksCount,
  minedCardsCount,
  reviewedCount,
  onOpenDictManager,
  onAddBook,
  onStartMining,
  onStartReview,
  layout = "stack",
  className = "",
}: FirstRunChecklistProps) {
  const [dismissed, setDismissed] = useState(() => readStorageFlag(FIRST_RUN_DISMISSED_KEY));
  const [completedShownBefore, setCompletedShownBefore] = useState(() =>
    readStorageFlag(FIRST_RUN_COMPLETED_SHOWN_KEY),
  );
  const [collapsedNow, setCollapsedNow] = useState(false);

  const steps: ChecklistStep[] = [
    {
      id: "dict",
      done: activeDictCount > 0,
      title: "Pasang kamus Yomitan",
      detail: "Wajib sebelum membaca agar kata Jepang bisa langsung dicari.",
      cta: activeDictCount > 0 ? "Kelola kamus" : "Pasang kamus",
      onAction: onOpenDictManager,
    },
    {
      id: "book",
      done: booksCount > 0,
      title: "Tambahkan novel atau manga",
      detail: "Unggah EPUB, TXT, CBZ, ZIP, atau coba contoh bawaan.",
      cta: booksCount > 0 ? "Lihat rak" : "Tambah bacaan",
      onAction: onAddBook,
    },
    {
      id: "mine",
      done: minedCardsCount > 0,
      title: "Tambang kartu kalimat pertama",
      detail: "Klik kata saat membaca lalu simpan contoh kalimat ke deck.",
      cta: "Mulai mining",
      onAction: onStartMining,
    },
    {
      id: "review",
      done: reviewedCount > 0,
      title: "Selesaikan review SRS pertama",
      detail: "Mulai sesi ulasan singkat untuk menguji retensi FSRS.",
      cta: "Mulai review",
      onAction: onStartReview,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const firstPendingIndex = steps.findIndex((s) => !s.done);

  useEffect(() => {
    if (!allDone || dismissed || completedShownBefore || collapsedNow) return;
    const mountedAt = Date.now();
    const timer = window.setTimeout(() => {
      writeStorageFlag(FIRST_RUN_COMPLETED_SHOWN_KEY, "1");
      setCompletedShownBefore(true);
      setCollapsedNow(true);
    }, 2600);
    return () => {
      window.clearTimeout(timer);
      if (Date.now() - mountedAt >= 500) {
        writeStorageFlag(FIRST_RUN_COMPLETED_SHOWN_KEY, "1");
      }
    };
  }, [allDone, dismissed, completedShownBefore, collapsedNow]);

  const handleDismiss = () => {
    writeStorageFlag(FIRST_RUN_DISMISSED_KEY, "1");
    if (allDone) {
      writeStorageFlag(FIRST_RUN_COMPLETED_SHOWN_KEY, "1");
      setCompletedShownBefore(true);
    }
    setDismissed(true);
  };

  if (dismissed || collapsedNow) return null;
  if (allDone && completedShownBefore) return null;

  if (allDone) {
    return (
      <section
        className={`frc-card frc-card--done ${className}`.trim()}
        aria-label="Orientasi awal selesai"
      >
        <div className="frc-done-inner">
          <Hanko char="済" label="Orientasi awal selesai" size={44} />
          <div className="frc-done-copy">
            <p className="frc-eyebrow">ORIENTASI SELESAI</p>
            <h2 className="frc-title">Semua langkah awal sudah siap</h2>
            <p className="frc-sub">
              Kamus, bahan bacaan, mining kalimat, dan jadwal FSRS aktif.
            </p>
          </div>
          <button
            type="button"
            className="frc-dismiss"
            onClick={handleDismiss}
            aria-label="Tutup pesan orientasi selesai"
          >
            Tutup
          </button>
        </div>
      </section>
    );
  }

  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section
      className={`frc-card ${className}`.trim()}
      aria-label="Panduan mulai pertama kali"
    >
      <div className="frc-head">
        <div>
          <p className="frc-eyebrow">MULAI BELAJAR · {doneCount}/{steps.length}</p>
          <h2 className="frc-title">Langkah awal immersion</h2>
        </div>
        <button
          type="button"
          className="frc-dismiss"
          onClick={handleDismiss}
          aria-label="Tutup panduan mulai"
        >
          Tutup
        </button>
      </div>

      <div
        className="frc-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={doneCount}
        aria-label={`${doneCount} dari ${steps.length} langkah awal selesai`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>

      <ol className={`frc-steps ${layout === "wide" ? "frc-steps--wide" : ""}`}>
        {steps.map((step, index) => {
          const isNext = index === firstPendingIndex;
          return (
            <li
              key={step.id}
              className={`frc-step${step.done ? " frc-step--done" : ""}${isNext ? " frc-step--next" : ""}`}
            >
              <span className="frc-marker" aria-hidden="true">
                {step.done ? <Icon name="check" size={14} /> : index + 1}
              </span>
              <div className="frc-step-body">
                <span className="frc-step-title">{step.title}</span>
                <span className="frc-step-detail">{step.detail}</span>
              </div>
              <button
                type="button"
                className={`frc-step-btn${isNext ? " is-next" : ""}`}
                onClick={step.onAction}
                aria-label={
                  step.done
                    ? `${step.title} (Selesai) — ${step.cta}`
                    : `${step.title} — ${step.cta}`
                }
              >
                {step.cta}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
