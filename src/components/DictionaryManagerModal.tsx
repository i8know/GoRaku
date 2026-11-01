import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDictionaryCascade,
  listDictionaries,
  setDictionaryEnabled,
  updateDictionaryPriorities,
  type DictionaryRecord,
} from "../lib/lexiconDb";
import { Icon } from "../ui";
import type {
  YomitanImportStage,
  YomitanWorkerRequest,
  YomitanWorkerResponse,
} from "../workers/yomitanImport.worker";

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "accent" | "sage" | "neutral";
}) {
  const styles: Record<string, React.CSSProperties> = {
    accent: {
      background: "rgba(194, 78, 52, 0.12)",
      color: "var(--accent, #c24e34)",
    },
    sage: {
      background: "rgba(47, 107, 79, 0.14)",
      color: "var(--sage, #2f6b4f)",
    },
    neutral: {
      background: "rgba(0, 0, 0, 0.06)",
      color: "var(--ink-2, #4d4841)",
    },
  };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={styles[tone]}
    >
      {children}
    </span>
  );
}

function Btn({
  children,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const sizeClass =
    size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]";
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--accent, #c24e34)",
      color: "#fff",
      borderColor: "transparent",
    },
    secondary: {
      background: "var(--bg-canvas, #faf7f2)",
      color: "var(--ink, #1d1b18)",
      borderColor: "var(--line, #e6e0d6)",
    },
    danger: {
      background: "rgba(180, 35, 24, 0.1)",
      color: "#b42318",
      borderColor: "rgba(180, 35, 24, 0.25)",
    },
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border font-medium transition-opacity disabled:opacity-45 cursor-pointer ${sizeClass}`}
      style={variantStyles[variant]}
    >
      {icon}
      {children}
    </button>
  );
}

interface DictionaryManagerModalProps {
  open: boolean;
  onClose: () => void;
  onDictionariesChanged?: (dicts: DictionaryRecord[]) => void;
}

const STAGE_LABELS: Record<YomitanImportStage, string> = {
  membuka_zip: "Membuka ZIP & Validasi",
  membaca_tag: "Mengimpor Tag Kamus",
  menyimpan_istilah: "Menyimpan Entri Kamus",
  menyimpan_meta: "Menyimpan Metadata Frekuensi/Pitch",
  membersihkan: "Membersihkan Data Sementara",
};

export default function DictionaryManagerModal({
  open,
  onClose,
  onDictionariesChanged,
}: DictionaryManagerModalProps) {
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // State impor
  const [importing, setImporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [progress, setProgress] = useState<{
    stage: YomitanImportStage;
    percent: number;
    currentFile: string;
    processedFiles: number;
    totalFiles: number;
    importedTerms: number;
    message: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedAttrId, setExpandedAttrId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const refreshDictionaries = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listDictionaries();
      setDictionaries(list);
      onDictionariesChanged?.(list);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memuat daftar kamus.",
      );
    } finally {
      setLoadingList(false);
    }
  }, [onDictionariesChanged]);

  useEffect(() => {
    if (open) {
      void refreshDictionaries();
    }
  }, [open, refreshDictionaries]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const startImportFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setImporting(true);
    setCancelling(false);
    setProgress({
      stage: "membuka_zip",
      percent: 1,
      currentFile: file.name,
      processedFiles: 0,
      totalFiles: 1,
      importedTerms: 0,
      message: `Membaca berkas ${file.name}...`,
    });

    try {
      const buffer = await file.arrayBuffer();
      const worker = new Worker(
        new URL("../workers/yomitanImport.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<YomitanWorkerResponse>) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === "progress") {
          setProgress({
            stage: msg.stage,
            percent: msg.percent,
            currentFile: msg.currentFile,
            processedFiles: msg.processedFiles,
            totalFiles: msg.totalFiles,
            importedTerms: msg.importedTerms,
            message: msg.message,
          });
          return;
        }

        if (msg.type === "complete") {
          worker.terminate();
          workerRef.current = null;
          setImporting(false);
          setCancelling(false);
          setProgress(null);
          setSuccessMsg(
            `Berhasil mengimpor kamus "${msg.dictionary.title}" (${msg.dictionary.termCount.toLocaleString("id-ID")} entri istilah).`,
          );
          void refreshDictionaries();
          return;
        }

        if (msg.type === "cancelled") {
          worker.terminate();
          workerRef.current = null;
          setImporting(false);
          setCancelling(false);
          setProgress(null);
          setErrorMsg(msg.message);
          void refreshDictionaries();
          return;
        }

        if (msg.type === "error") {
          worker.terminate();
          workerRef.current = null;
          setImporting(false);
          setCancelling(false);
          setProgress(null);
          setErrorMsg(msg.message);
          void refreshDictionaries();
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        workerRef.current = null;
        setImporting(false);
        setCancelling(false);
        setProgress(null);
        setErrorMsg(
          err.message || "Terjadi kesalahan pada Web Worker impor kamus.",
        );
      };

      const req: YomitanWorkerRequest = {
        type: "import-yomitan",
        buffer,
        fileName: file.name,
        replaceExisting,
      };
      worker.postMessage(req, [buffer]);
    } catch (err) {
      setImporting(false);
      setCancelling(false);
      setProgress(null);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal membaca berkas ZIP kamus.",
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void startImportFile(file);
  };

  const handleCancelImport = () => {
    if (!workerRef.current || !importing) return;
    setCancelling(true);
    const req: YomitanWorkerRequest = { type: "cancel" };
    workerRef.current.postMessage(req);
  };

  const handleToggleEnabled = async (dict: DictionaryRecord) => {
    if (dict.id == null) return;
    await setDictionaryEnabled(dict.id, !dict.enabled);
    await refreshDictionaries();
  };

  const handleMovePriority = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= dictionaries.length) return;
    const reordered = [...dictionaries];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const ids = reordered
      .map((d) => d.id)
      .filter((id): id is number => typeof id === "number");
    await updateDictionaryPriorities(ids);
    await refreshDictionaries();
  };

  const handleDeleteDictionary = async (dict: DictionaryRecord) => {
    if (dict.id == null || deletingId != null) return;
    setDeletingId(dict.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await deleteDictionaryCascade(dict.id);
      setSuccessMsg(`Kamus "${dict.title}" berhasil dihapus.`);
      await refreshDictionaries();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus kamus.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(18, 17, 15, 0.58)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: "var(--bg-canvas)",
          borderColor: "var(--line)",
          color: "var(--ink)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              <Icon name="book" size={18} />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold leading-tight">
                Kelola Kamus Yomitan
              </h2>
              <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>
                Impor kamus ZIP berformat Yomitan (JMdict / Jitendex) untuk fitur
                pembaca novel &amp; sentence mining
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={importing ? undefined : onClose}
            disabled={importing}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ color: "var(--ink-3)" }}
            title="Tutup"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Petunjuk Unduh & Lisensi */}
          <div
            className="rounded-xl p-4 border text-[12.5px] leading-relaxed"
            style={{
              background: "var(--surface)",
              borderColor: "var(--line)",
              color: "var(--ink-2)",
            }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="font-semibold text-[13px]" style={{ color: "var(--ink)" }}>
                Petunjuk Unduh Kamus (Format Yomitan v3)
              </div>
              <Badge tone="accent">100% Lokal di Browser</Badge>
            </div>
            <p className="mt-1.5">
               Aplikasi ini tidak membundel data kamus secara bawaan. Unduh arsip{" "}
              <code className="px-1.5 py-0.5 rounded bg-black/5 text-[11.5px]">
                .zip
              </code>{" "}
              kamus berformat Yomitan (jangan diekstrak), lalu unggah di bawah ini:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-[12px]">
              <li>
                <strong>JMdict (Bahasa Inggris / Indonesia)</strong>:{" "}
                <a
                  href="https://yomitan.wiki/dictionaries/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  yomitan.wiki/dictionaries
                </a>{" "}
                (pilih <code>JMdict_english.zip</code>)
              </li>
              <li>
                <strong>Jitendex (JMdict yang diperkaya contoh)</strong>:{" "}
                <a
                  href="https://jitendex.org"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  jitendex.org
                </a>
              </li>
            </ul>
            <p className="mt-2 text-[11px]" style={{ color: "var(--ink-3)" }}>
              Lisensi data: Kamus berbasis JMdict merupakan hak cipta{" "}
              <strong>
                Electronic Dictionary Research and Development Group (EDRDG)
              </strong>{" "}
              dan didistribusikan di bawah lisensi{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                CC BY-SA 4.0
              </a>
              .
            </p>
          </div>

          {/* Area Impor ZIP */}
          <div
            className="rounded-xl p-5 border border-dashed"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--line-strong)",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleFileChange}
              className="hidden"
            />

            {!importing ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[14px] font-medium">
                    Tambah Kamus Baru (.zip)
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                    Mendukung berkas <code>index.json</code>,{" "}
                    <code>term_bank_N.json</code>, <code>tag_bank_N.json</code>,
                    dan <code>term_meta_bank_N.json</code>.
                  </div>
                  <label className="inline-flex items-center gap-2 mt-2.5 text-[12px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="rounded"
                    />
                    <span style={{ color: "var(--ink-2)" }}>
                      Timpa jika kamus dengan nama yang sama sudah ada
                    </span>
                  </label>
                </div>

                <Btn
                  variant="primary"
                  icon={<Icon name="upload" size={15} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Pilih ZIP Kamus
                </Btn>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold">
                      {progress
                        ? STAGE_LABELS[progress.stage]
                        : "Memproses Kamus..."}
                    </div>
                    <div
                      className="text-[12px] mt-0.5"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {progress?.message}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[15px] font-semibold">
                      {progress?.percent ?? 0}%
                    </div>
                    {progress && progress.totalFiles > 0 && (
                      <div
                        className="text-[11px] font-mono"
                        style={{ color: "var(--ink-3)" }}
                      >
                        Berkas {progress.processedFiles}/{progress.totalFiles}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  className="w-full h-2.5 rounded-full overflow-hidden"
                  style={{ background: "var(--line)" }}
                >
                  <div
                    className="h-full transition-all duration-200 rounded-full"
                    style={{
                      width: `${Math.max(2, progress?.percent ?? 2)}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div
                    className="text-[12px] font-mono"
                    style={{ color: "var(--ink-2)" }}
                  >
                    Entri tersimpan:{" "}
                    <strong>
                      {(progress?.importedTerms ?? 0).toLocaleString("id-ID")}
                    </strong>
                    {progress?.currentFile ? ` • ${progress.currentFile}` : ""}
                  </div>

                  <Btn
                    variant="danger"
                    size="sm"
                    disabled={cancelling}
                    onClick={handleCancelImport}
                  >
                    {cancelling ? "Membatalkan..." : "Batal"}
                  </Btn>
                </div>
              </div>
            )}
          </div>

          {/* Pesan Error / Sukses */}
          {errorMsg && (
            <div
              className="rounded-xl px-4 py-3 border text-[13px] flex items-start justify-between gap-3"
              style={{
                background: "rgba(180, 35, 24, 0.08)",
                borderColor: "rgba(180, 35, 24, 0.3)",
                color: "#b42318",
              }}
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-xs underline shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {successMsg && (
            <div
              className="rounded-xl px-4 py-3 border text-[13px] flex items-start justify-between gap-3"
              style={{
                background: "rgba(47, 107, 79, 0.1)",
                borderColor: "rgba(47, 107, 79, 0.3)",
                color: "var(--sage)",
              }}
            >
              <span>{successMsg}</span>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-xs underline shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Daftar Kamus Terpasang */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[14px] font-semibold">
                Daftar Kamus Terpasang ({dictionaries.length})
              </div>
              <span className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                Urutan atas memiliki prioritas pencarian lebih tinggi
              </span>
            </div>

            {loadingList ? (
              <div
                className="rounded-xl p-8 text-center text-[13px]"
                style={{
                  background: "var(--surface)",
                  color: "var(--ink-3)",
                }}
              >
                Memuat daftar kamus...
              </div>
            ) : dictionaries.length === 0 ? (
              <div
                className="rounded-xl p-8 border text-center"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--line)",
                }}
              >
                <div className="text-[14px] font-medium">
                  Belum ada kamus yang diimpor
                </div>
                <p
                  className="text-[12.5px] mt-1 max-w-md mx-auto"
                  style={{ color: "var(--ink-3)" }}
                >
                  Unggah arsip ZIP kamus Yomitan (seperti{" "}
                  <code>JMdict_english.zip</code>) agar Anda dapat mengeklik kata
                  saat membaca novel.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dictionaries.map((dict, idx) => {
                  const isDeleting = deletingId === dict.id;
                  const showAttr = expandedAttrId === dict.id;

                  return (
                    <div
                      key={dict.id ?? dict.title}
                      className="rounded-xl p-4 border transition-all"
                      style={{
                        background: dict.enabled
                          ? "var(--surface)"
                          : "var(--bg-elevated)",
                        borderColor: "var(--line)",
                        opacity: dict.enabled ? 1 : 0.72,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Toggle Aktif / Nonaktif */}
                          <input
                            type="checkbox"
                            checked={dict.enabled}
                            onChange={() => void handleToggleEnabled(dict)}
                            disabled={importing || isDeleting}
                            className="mt-1 w-4 h-4 rounded cursor-pointer"
                            title={
                              dict.enabled ? "Nonaktifkan kamus" : "Aktifkan kamus"
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="font-mono text-[11px] px-2 py-0.5 rounded font-semibold"
                                style={{
                                  background: "var(--bg-canvas)",
                                  color: "var(--ink-2)",
                                }}
                              >
                                #{idx + 1}
                              </span>
                              <h3 className="text-[15px] font-semibold truncate">
                                {dict.title}
                              </h3>
                              <Badge tone={dict.enabled ? "sage" : "neutral"}>
                                {dict.enabled ? "Aktif" : "Nonaktif"}
                              </Badge>
                              <Badge tone="neutral">v{dict.format}</Badge>
                            </div>

                            <div
                              className="text-[12px] mt-1 flex items-center gap-3 flex-wrap"
                              style={{ color: "var(--ink-3)" }}
                            >
                              <span>Revisi: {dict.revision}</span>
                              <span>•</span>
                              <span>
                                <strong>
                                  {dict.termCount.toLocaleString("id-ID")}
                                </strong>{" "}
                                istilah
                              </span>
                              {dict.tagCount ? (
                                <>
                                  <span>•</span>
                                  <span>
                                    {dict.tagCount.toLocaleString("id-ID")} tag
                                  </span>
                                </>
                              ) : null}
                              {dict.metaCount ? (
                                <>
                                  <span>•</span>
                                  <span>
                                    {dict.metaCount.toLocaleString("id-ID")} meta
                                  </span>
                                </>
                              ) : null}
                            </div>

                            {dict.description && (
                              <p
                                className="text-[12px] mt-1.5 line-clamp-2"
                                style={{ color: "var(--ink-2)" }}
                              >
                                {dict.description}
                              </p>
                            )}

                            {/* Tombol tampilkan atribusi */}
                            <div className="mt-2 flex items-center gap-3 text-[11.5px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedAttrId(
                                    showAttr ? null : (dict.id ?? null),
                                  )
                                }
                                className="underline font-medium"
                                style={{ color: "var(--accent)" }}
                              >
                                {showAttr
                                  ? "Sembunyikan Atribusi & Metadata"
                                  : "Lihat Atribusi & Lisensi"}
                              </button>
                              {dict.url && (
                                <a
                                  href={dict.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                  style={{ color: "var(--ink-3)" }}
                                >
                                  Situs Sumber
                                </a>
                              )}
                            </div>

                            {showAttr && (
                              <div
                                className="mt-2.5 p-3 rounded-lg border text-[11.5px] whitespace-pre-wrap leading-relaxed"
                                style={{
                                  background: "var(--bg-canvas)",
                                  borderColor: "var(--line)",
                                  color: "var(--ink-2)",
                                }}
                              >
                                {dict.author && (
                                  <div className="mb-1">
                                    <strong>Pembuat:</strong> {dict.author}
                                  </div>
                                )}
                                <div>
                                  <strong>Atribusi Lisensi:</strong>{" "}
                                  {dict.attribution ||
                                    "Data kamus diimpor pengguna. Jika berbasis JMdict/EDRDG, berlisensi di bawah CC BY-SA 4.0."}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Kontrol Prioritas & Hapus */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleMovePriority(idx, -1)}
                            disabled={idx === 0 || importing || isDeleting}
                            className="px-2.5 py-1.5 rounded-lg border text-[12px] font-medium disabled:opacity-35"
                            style={{
                              borderColor: "var(--line)",
                              background: "var(--bg-canvas)",
                            }}
                            title="Naikkan prioritas"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleMovePriority(idx, 1)}
                            disabled={
                              idx === dictionaries.length - 1 ||
                              importing ||
                              isDeleting
                            }
                            className="px-2.5 py-1.5 rounded-lg border text-[12px] font-medium disabled:opacity-35"
                            style={{
                              borderColor: "var(--line)",
                              background: "var(--bg-canvas)",
                            }}
                            title="Turunkan prioritas"
                          >
                            ↓
                          </button>
                          <Btn
                            variant="danger"
                            size="sm"
                            disabled={importing || isDeleting}
                            onClick={() => void handleDeleteDictionary(dict)}
                          >
                            {isDeleting ? "Menghapus..." : "Hapus"}
                          </Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3.5 border-t flex items-center justify-between"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>
            Total kamus aktif:{" "}
            <strong>{dictionaries.filter((d) => d.enabled).length}</strong> dari{" "}
            {dictionaries.length}
          </span>
          <Btn variant="secondary" disabled={importing} onClick={onClose}>
            Selesai
          </Btn>
        </div>
      </div>
    </div>
  );
}
