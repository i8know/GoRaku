import React, { useEffect, useState } from "react";
import { updateBookTitle } from "../lib/bookStorage";
import type { BookRecord } from "../lib/lexiconDb";
import {
  createMangaPageSource,
  naturalSortPageNames,
  updateMangaPageOrder,
  type MangaPageSource,
} from "../lib/mangaStorage";
import { Button, Icon } from "../ui";

interface MangaManageModalProps {
  book: BookRecord | null;
  onClose: () => void;
  onSaved: (updatedTitle: string) => void;
}

export default function MangaManageModal({
  book,
  onClose,
  onSaved,
}: MangaManageModalProps) {
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isManga =
    book?.type === "manga" ||
    book?.format === "cbz" ||
    book?.format === "zip" ||
    book?.format === "images";

  useEffect(() => {
    if (!book) return;
    setTitle(book.title);
    setPages(book.pageOrder ? [...book.pageOrder] : []);
    setErrorMsg(null);
    setPreviewIndex(null);
  }, [book]);

  // Muat pratinjau halaman secara malas saat pengguna memilih salah satu baris halaman
  useEffect(() => {
    if (!book || !isManga || previewIndex === null) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    let source: MangaPageSource | null = null;
    let createdUrl: string | null = null;

    setPreviewLoading(true);

    (async () => {
      try {
        source = await createMangaPageSource(book.id);
        // Cari indeks asli di book.pageOrder berdasarkan nama berkas di `pages[previewIndex]`
        const targetName = pages[previewIndex];
        const origIdx = source.pageOrder.indexOf(targetName);
        if (origIdx === -1) return;
        const blob = await source.loadPageBlob(origIdx);
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return createdUrl;
        });
      } catch {
        // Abaikan gagal muat pratinjau
      } finally {
        if (!cancelled) setPreviewLoading(false);
        await source?.close();
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [book, isManga, previewIndex, pages]);

  if (!book) return null;

  const movePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pages.length || fromIdx === toIdx) return;
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    if (previewIndex === fromIdx) {
      setPreviewIndex(toIdx);
    }
  };

  const handleNaturalSort = () => {
    setPages((prev) => naturalSortPageNames(prev));
    setPreviewIndex(null);
  };

  const handleReverseOrder = () => {
    setPages((prev) => [...prev].reverse());
    setPreviewIndex(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setErrorMsg("Judul tidak boleh kosong.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await updateBookTitle(book.id, trimmed);
      if (isManga && pages.length > 0) {
        const orderChanged =
          !book.pageOrder ||
          book.pageOrder.length !== pages.length ||
          book.pageOrder.some((p, i) => p !== pages[i]);
        if (orderChanged) {
          await updateMangaPageOrder(book.id, pages);
        }
      }
      onSaved(trimmed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyimpan perubahan.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
      style={{ zIndex: 90 }}
    >
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: isManga ? "720px" : "480px", width: "95%" }}
      >
        <Button className="modal-close" ariaLabel="Tutup" onClick={onClose}>
          <Icon name="close" />
        </Button>

        <p className="eyebrow">
          {isManga ? "PENGATURAN MANGA & HALAMAN" : "UBAH JUDUL NOVEL"}
        </p>
        <h2 className="text-xl font-bold mb-1">
          {isManga ? "Edit Judul & Urutan Halaman" : "Edit Judul Novel"}
        </h2>
        <p className="text-[13px] mb-4" style={{ color: "var(--ink-3)" }}>
          {isManga
            ? "Ubah judul tampilan manga atau atur urutan halaman secara manual bila urutan bawaan arsip tidak sesuai."
            : "Ubah judul tampilan novel Anda di Perpustakaan."}
        </p>

        {errorMsg && (
          <div
            className="mb-4 rounded-xl px-3.5 py-2.5 border text-[12px]"
            style={{
              background: "rgba(185, 60, 34, 0.08)",
              borderColor: "rgba(185, 60, 34, 0.3)",
              color: "var(--shu)",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-1.5">
              Judul Koleksi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-2.5 text-[14px]"
              style={{
                background: "var(--tsuki)",
                borderColor: "var(--garis)",
                color: "var(--tinta)",
              }}
              placeholder="Masukkan judul..."
              required
            />
          </div>

          {isManga && pages.length > 0 && (
            <div className="mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-[12px] font-semibold uppercase tracking-wider">
                  Urutan Halaman ({pages.length} Halaman)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNaturalSort}
                    className="rounded-lg border px-2.5 py-1 text-[12px] font-medium hover:opacity-90 transition"
                    style={{
                      background: "var(--tsuki)",
                      borderColor: "var(--garis)",
                    }}
                    title="Urutkan kembali secara natural sort (halaman 2 sebelum halaman 10)"
                  >
                    Natural Sort Otomatis
                  </button>
                  <button
                    type="button"
                    onClick={handleReverseOrder}
                    className="rounded-lg border px-2.5 py-1 text-[12px] font-medium hover:opacity-90 transition"
                    style={{
                      background: "var(--tsuki)",
                      borderColor: "var(--garis)",
                    }}
                    title="Balikkan urutan halaman dari akhir ke awal"
                  >
                    Balik Urutan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Daftar Halaman */}
                <div
                  className="md:col-span-2 rounded-xl border overflow-y-auto max-h-64 divide-y"
                  style={{
                    background: "var(--panel)",
                    borderColor: "var(--garis)",
                  }}
                >
                  {pages.map((pageName, idx) => {
                    const isSelected = previewIndex === idx;
                    return (
                      <div
                        key={`${pageName}-${idx}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] cursor-pointer transition-colors"
                        style={{
                          background: isSelected
                            ? "rgba(38, 72, 122, 0.1)"
                            : "transparent",
                        }}
                        onClick={() => setPreviewIndex(idx)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold shrink-0"
                            style={{
                              background:
                                idx === 0
                                  ? "var(--ai)"
                                  : "var(--tsuki)",
                              color: idx === 0 ? "#fff" : "var(--tinta-2)",
                            }}
                            title={
                              idx === 0
                                ? "Halaman 1 (Sampul Thumbnail)"
                                : `Halaman ${idx + 1}`
                            }
                          >
                            {idx + 1}
                          </span>
                          <span
                            className="truncate font-mono text-[12px]"
                            title={pageName}
                          >
                            {pageName}
                          </span>
                          {idx === 0 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                              style={{
                                background: "var(--tsuki)",
                                color: "var(--ai)",
                              }}
                            >
                              Sampul
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => movePage(idx, 0)}
                              className="px-1.5 py-0.5 rounded border text-[10px] hover:opacity-80"
                              style={{ borderColor: "var(--garis)" }}
                              title="Jadikan halaman pertama (Sampul)"
                            >
                              Ke #1
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => movePage(idx, idx - 1)}
                            className="w-6 h-6 rounded border flex items-center justify-center disabled:opacity-30"
                            style={{ borderColor: "var(--garis)" }}
                            aria-label={`Pindah halaman ${idx + 1} ke atas`}
                            title="Geser ke atas"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === pages.length - 1}
                            onClick={() => movePage(idx, idx + 1)}
                            className="w-6 h-6 rounded border flex items-center justify-center disabled:opacity-30"
                            style={{ borderColor: "var(--garis)" }}
                            aria-label={`Pindah halaman ${idx + 1} ke bawah`}
                            title="Geser ke bawah"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Panel Pratinjau Malas (Lazy Preview) */}
                <div
                  className="rounded-xl border p-3 flex flex-col items-center justify-center min-h-[180px] text-center"
                  style={{
                    background: "var(--tsuki)",
                    borderColor: "var(--garis)",
                  }}
                >
                  {previewIndex === null ? (
                    <p
                      className="text-[12px] px-2"
                      style={{ color: "var(--tinta-2)" }}
                    >
                      Klik salah satu baris halaman di samping untuk melihat
                      pratinjau gambarnya secara malas (lazy).
                    </p>
                  ) : previewLoading ? (
                    <p className="text-[12px]" style={{ color: "var(--tinta-2)" }}>
                      Memuat pratinjau halaman #{previewIndex + 1}...
                    </p>
                  ) : previewUrl ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <img
                        src={previewUrl}
                        alt={`Pratinjau halaman ${previewIndex + 1}`}
                        className="max-h-48 w-auto object-contain rounded border"
                        style={{ borderColor: "var(--garis)" }}
                      />
                      <span
                        className="text-[11px] font-mono truncate max-w-full"
                        style={{ color: "var(--tinta-2)" }}
                      >
                        Hal. {previewIndex + 1}: {pages[previewIndex]}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[12px]" style={{ color: "var(--tinta-2)" }}>
                      Pratinjau tidak tersedia.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 mt-4">
            <Button
              type="button"
              className="outline-button"
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" className="pg-primary" disabled={saving}>
              <Icon name="check" size={16} />{" "}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

