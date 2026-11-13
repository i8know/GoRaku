import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const DictionaryManagerModal = lazy(() => import("../components/DictionaryManagerModal"));
const MangaManageModal = lazy(() => import("../components/MangaManageModal"));
import {
  addNovelFile,
  deleteNovel,
  extractCoverKanji,
  listNovels,
} from "../lib/bookStorage";
import {
  listDictionaries,
  type BookRecord,
  type DictionaryRecord,
} from "../lib/lexiconDb";
import {
  addMangaArchiveFile,
  addMangaImagesOrFolder,
  createSampleMangaCbzFile,
  isValidMangaImageEntry,
} from "../lib/mangaStorage";
import { Button, Icon, PageHead, Tabs } from "../ui";

const FORMAT_TABS = ["Semua", "Novel", "Manga", "EPUB", "TXT", "CBZ / Gambar"] as const;
type FormatTab = (typeof FORMAT_TABS)[number];

const BOOK_SORTS = [
  "Terakhir Dibaca",
  "Progres Baca",
  "Kata Ditambang",
  "Judul (A-Z)",
] as const;
type BookSort = (typeof BOOK_SORTS)[number];

const TONE_CLASSES = ["novel", "kitchen", "anime", "manga", "family", "ghibli"];

import { isMangaBook } from "../lib/bookUtils";

export { isMangaBook };

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatBadgeLabel(book: BookRecord): string {
  if (isMangaBook(book)) {
    const fmt =
      book.format === "images" ? "GAMBAR" : book.format.toUpperCase();
    return `MANGA • ${fmt}`;
  }
  return `NOVEL • ${book.format.toUpperCase()}${book.encoding ? ` (${book.encoding.toUpperCase()})` : ""}`;
}

function getBookReaderPath(book: BookRecord): string {
  return isMangaBook(book) ? `/manga/${book.id}` : `/library/${book.id}`;
}

/**
 * Mengekstrak seluruh berkas (termasuk isi folder rekursif bila pengguna menyeret folder)
 * dari event Drag-and-Drop (`DataTransfer`).
 */
async function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<File[]> {
  const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
  const webkitEntries = items
    .map((item) =>
      typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null,
    )
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (webkitEntries.some((e) => e.isDirectory)) {
    const collected: File[] = [];

    const traverseEntry = async (
      entry: FileSystemEntry,
      parentPath: string,
    ): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });
        const relPath = parentPath ? `${parentPath}/${file.name}` : file.name;
        try {
          Object.defineProperty(file, "webkitRelativePath", {
            value: relPath,
            configurable: true,
          });
        } catch {
          // Abaikan bila properti read-only
        }
        collected.push(file);
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        const subEntries: FileSystemEntry[] = [];
        while (true) {
          const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            reader.readEntries(resolve, reject);
          });
          if (!batch || batch.length === 0) break;
          subEntries.push(...batch);
        }
        const nextParent = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        for (const sub of subEntries) {
          await traverseEntry(sub, nextParent);
        }
      }
    };

    for (const rootEntry of webkitEntries) {
      await traverseEntry(rootEntry, "");
    }
    if (collected.length > 0) return collected;
  }

  return Array.from(dataTransfer.files || []);
}

function BookCover({
  book,
  index,
  className = "lb-cover",
  children,
}: {
  book: BookRecord;
  index: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!book.coverBlob) {
      setCoverUrl(null);
      return;
    }
    const url = URL.createObjectURL(book.coverBlob);
    setCoverUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [book.coverBlob]);

  const tone = isMangaBook(book)
    ? "manga"
    : TONE_CLASSES[index % TONE_CLASSES.length];
  const kanji = extractCoverKanji(book.title);

  return (
    <div
      className={`${className} ${tone} relative overflow-hidden`}
      style={
        coverUrl
          ? {
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {!coverUrl && <span>{kanji}</span>}
      {children}
    </div>
  );
}

const SAMPLE_NOVEL_TXT = `吾輩は猫である（サンプル短編）
夏目漱石

第一章　猫と人間の言葉

｜吾輩《わがはい》は｜猫《ねこ》である。｜名前《なまえ》はまだ｜無《な》い。
どこで｜生《う》まれたかとんと｜見当《けんとう》がつかぬ。何でも｜薄暗《うすぐら》いじめじめした｜所《ところ》でニャーニャー｜泣《な》いていた事だけは｜記憶《きおく》している。
「今日はとても｜美味《おい》しかったよ！」と｜先生《せんせい》は｜笑《わら》いながら言った。しかし昨日は野菜を｜食《た》べさせられなかったので、少し困っていたようだった。
｜日本語学校《にほんごがっこう》に通う｜学生《がくせい》たちは、毎日熱心に｜勉強《べんきょう》している。「いつもありがとう！」と｜元気《げんき》な声が部屋に響いた。

第二章　雨の日の読書

翌朝、外は静かな｜雨《あめ》が降っていた。予定していた散歩には｜行《い》かなかったが、温かいコーヒーを飲みながら古い本を｜読《よ》んでいた。
やがて友人が｜来《き》ました。「あまり｜美味《おい》しくなかったお菓子だけど、一緒に｜食《た》べよう」と彼は言った。`;

export default function LibraryPage({
  notify,
}: {
  onAdd?: () => void;
  notify: (m: string) => void;
}) {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formatTab, setFormatTab] = useState<FormatTab>("Semua");
  const [sortBy, setSortBy] = useState<BookSort>("Terakhir Dibaca");
  const [q, setQ] = useState("");
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [managingBook, setManagingBook] = useState<BookRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const refreshBooks = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listNovels();
      setBooks(list);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memuat daftar perpustakaan.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBooks();
    void listDictionaries().then(setDictionaries).catch(() => {});
  }, [refreshBooks]);

  const activeDictCount = dictionaries.filter((d) => d.enabled).length;

  /**
   * Memproses berkas yang dipilih atau diseret ke Perpustakaan:
   * - Berkas .epub / .txt -> ditambahkan sebagai Novel
   * - Berkas .cbz / .zip -> ditambahkan sebagai Manga (dibaca secara malas)
   * - Kumpulan berkas gambar (.jpg/.png/.webp) atau satu folder -> digabung sebagai 1 item Manga
   */
  const handleFilesSelected = async (filesInput: FileList | File[]) => {
    const arr = Array.from(filesInput);
    if (arr.length === 0) return;

    setUploading(true);
    setErrorMsg(null);
    let addedCount = 0;

    try {
      const novelFiles: File[] = [];
      const mangaArchives: File[] = [];
      const looseOrFolderFiles: File[] = [];

      for (const f of arr) {
        const lower = f.name.toLowerCase();
        const relPath = f.webkitRelativePath || "";

        // Jika berasal dari pemilihan folder (webkitRelativePath berisi '/'),
        // kelompokkan ke dalam pemroses folder manga kecuali jika itu berkas .cbz/.epub sendiri
        if (relPath.includes("/") && !lower.endsWith(".epub") && !lower.endsWith(".cbz") && !lower.endsWith(".zip")) {
          looseOrFolderFiles.push(f);
          continue;
        }

        if (lower.endsWith(".pdf")) {
          throw new Error(
            "Format PDF tidak didukung. Silakan unggah novel (.epub/.txt) atau manga (.cbz/.zip/gambar JPG, PNG, WebP).",
          );
        }

        if (lower.endsWith(".epub") || lower.endsWith(".txt")) {
          novelFiles.push(f);
        } else if (lower.endsWith(".cbz") || lower.endsWith(".zip")) {
          mangaArchives.push(f);
        } else if (
          isValidMangaImageEntry(f.name) ||
          lower === "comicinfo.xml"
        ) {
          looseOrFolderFiles.push(f);
        } else {
          looseOrFolderFiles.push(f);
        }
      }

      // 1. Proses berkas novel (.epub / .txt)
      for (const novelFile of novelFiles) {
        const record = await addNovelFile(novelFile);
        addedCount++;
        notify(`Novel "${record.title}" (${record.format.toUpperCase()}) ditambahkan`);
      }

      // 2. Proses berkas arsip manga (.cbz / .zip)
      for (const archiveFile of mangaArchives) {
        const record = await addMangaArchiveFile(archiveFile);
        addedCount++;
        notify(
          `Manga "${record.title}" (${record.pageCount} halaman) ditambahkan`,
        );
      }

      // 3. Proses kumpulan berkas gambar atau folder
      if (looseOrFolderFiles.length > 0) {
        const hasValidImage = looseOrFolderFiles.some((f) =>
          isValidMangaImageEntry(f.webkitRelativePath || f.name),
        );
        if (!hasValidImage && novelFiles.length === 0 && mangaArchives.length === 0) {
          throw new Error(
            "Tidak ditemukan berkas yang didukung. Gunakan .epub/.txt untuk novel, atau .cbz/.zip/gambar (JPG, PNG, WebP) untuk manga.",
          );
        }
        if (hasValidImage) {
          const record = await addMangaImagesOrFolder(looseOrFolderFiles);
          addedCount++;
          notify(
            `Manga "${record.title}" (${record.pageCount} halaman) ditambahkan`,
          );
        }
      }

      if (addedCount > 0) {
        await refreshBooks();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menambahkan berkas ke perpustakaan.";
      setErrorMsg(msg);
      notify(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleAddSampleNovel = async () => {
    setUploading(true);
    setErrorMsg(null);
    try {
      const file = new File([SAMPLE_NOVEL_TXT], "Wagahai_Sample_Novel.txt", {
        type: "text/plain;charset=utf-8",
      });
      const rec = await addNovelFile(file);
      await refreshBooks();
      notify(`Novel sampel "${rec.title}" siap dibaca!`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membuat novel sampel.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAddSampleManga = async () => {
    setUploading(true);
    setErrorMsg(null);
    try {
      const cbzFile = await createSampleMangaCbzFile();
      const rec = await addMangaArchiveFile(cbzFile);
      await refreshBooks();
      notify(
        `Manga sampel "${rec.title}" (${rec.pageCount} halaman) siap dibaca!`,
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membuat manga sampel.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBook = async (book: BookRecord) => {
    if (deletingBookId) return;
    setDeletingBookId(book.id);
    try {
      await deleteNovel(book.id);
      notify(`"${book.title}" dihapus dari Perpustakaan`);
      await refreshBooks();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus koleksi.",
      );
    } finally {
      setDeletingBookId(null);
    }
  };

  const filteredBooks = useMemo(() => {
    const filtered = books.filter((b) => {
      const isManga = isMangaBook(b);
      if (formatTab === "Novel" && isManga) return false;
      if (formatTab === "Manga" && !isManga) return false;
      if (formatTab === "EPUB" && b.format !== "epub") return false;
      if (formatTab === "TXT" && b.format !== "txt") return false;
      if (formatTab === "CBZ / Gambar" && !isManga) return false;
      if (q.trim()) {
        const hay = `${b.title} ${b.author} ${b.volume ?? ""}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "Progres Baca") return (b.progress ?? 0) - (a.progress ?? 0);
      if (sortBy === "Kata Ditambang") return (b.minedCount ?? 0) - (a.minedCount ?? 0);
      if (sortBy === "Judul (A-Z)") return a.title.localeCompare(b.title, "ja");
      const tA = a.lastReadAt ?? a.addedAt;
      const tB = b.lastReadAt ?? b.addedAt;
      return tB.localeCompare(tA);
    });
  }, [books, formatTab, sortBy, q]);

  const heroBook = books[0] ?? null;

  return (
    <>
      <PageHead
        eyebrow="PERPUSTAKAAN NOVEL, MANGA & SENTENCE MINING"
        title="Perpustakaan"
        accent="読書"
        copy="Unggah novel (EPUB/TXT) atau manga (CBZ/ZIP/Gambar) milikmu, baca langsung di browser, gunakan OCR gelembung dialog & kamus Yomitan, lalu tambang kalimat ke deck."
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            className="outline-button"
            onClick={() => setDictModalOpen(true)}
          >
            <Icon name="book" size={16} /> Kelola Kamus ({activeDictCount})
          </Button>
          <Button
            className="outline-button"
            disabled={uploading}
            onClick={() => folderInputRef.current?.click()}
          >
            <Icon name="upload" size={16} /> Pilih Folder Manga
          </Button>
          <Button
            className="pg-primary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="plus" size={17} />{" "}
            {uploading ? "Memproses..." : "Tambah Novel / Manga"}
          </Button>
        </div>
      </PageHead>

      {/* Input Berkas (.epub, .txt, .cbz, .zip, atau multi-gambar .jpg/.png/.webp) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.txt,.cbz,.zip,.jpg,.jpeg,.png,.webp,application/epub+zip,application/vnd.comicbook+zip,application/zip,text/plain,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            void handleFilesSelected(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Input Satu Folder (webkitdirectory) untuk Manga */}
      <input
        ref={(el) => {
          folderInputRef.current = el;
          if (el) {
            el.setAttribute("webkitdirectory", "");
            el.setAttribute("directory", "");
          }
        }}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            void handleFilesSelected(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {dictModalOpen && (
        <Suspense fallback={null}>
          <DictionaryManagerModal
            open={dictModalOpen}
            onClose={() => setDictModalOpen(false)}
            onDictionariesChanged={setDictionaries}
          />
        </Suspense>
      )}

      {managingBook && (
        <Suspense fallback={null}>
          <MangaManageModal
            book={managingBook}
            onClose={() => setManagingBook(null)}
            onSaved={(newTitle) => {
              setManagingBook(null);
              notify(`Perubahan pada "${newTitle}" disimpan`);
              void refreshBooks();
            }}
          />
        </Suspense>
      )}

      {/* Pesan Error */}
      {errorMsg && (
        <div
          className="mb-5 rounded-xl px-4 py-3 border text-[13px] flex items-center justify-between gap-3"
          style={{
            background: "rgba(185, 60, 34, 0.08)",
            borderColor: "rgba(185, 60, 34, 0.3)",
            color: "var(--shu)",
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs underline font-medium"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Hero: Item Terakhir Dibaca */}
      {heroBook && (
        <section className="lb-hero">
          <BookCover book={heroBook} index={0} className="lb-cover" />
          <div className="lb-hero-body">
            <p className="eyebrow light">
              LANJUTKAN MEMBACA • {formatBadgeLabel(heroBook)}
            </p>
            <div className="flex items-center gap-2">
              <h2>{heroBook.title}</h2>
              <button
                type="button"
                onClick={() => setManagingBook(heroBook)}
                className="p-1.5 min-w-[28px] min-h-[28px] max-sm:min-w-[36px] max-sm:min-h-[36px] inline-flex items-center justify-center rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                title="Edit judul atau urutan halaman"
                aria-label={`Edit ${heroBook.title}`}
              >
                <Icon name="edit" size={15} />
              </button>
            </div>
            <p className="lb-en">
              {heroBook.author}
              {heroBook.volume ? ` • ${heroBook.volume}` : ""} •{" "}
              {isMangaBook(heroBook)
                ? `Hal. ${(heroBook.currentPage ?? 0) + 1} dari ${heroBook.pageCount ?? 0} (${formatFileSize(heroBook.fileSize)})`
                : formatFileSize(heroBook.fileSize)}
            </p>
            <div className="lb-hero-prog">
              <div className="progress">
                <i style={{ width: `${heroBook.progress}%` }} />
              </div>
              <span>{heroBook.progress}% selesai</span>
            </div>
            <div className="lb-hero-actions">
              <Button
                className="primary-light"
                onClick={() => navigate(getBookReaderPath(heroBook))}
              >
                {heroBook.progress > 0 ? "Lanjutkan Membaca" : "Mulai Membaca"}
              </Button>
              <span>
                <Icon name="mine" size={16} /> {heroBook.minedCount ?? 0} kalimat
                ditambang
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Dropzone Drag-and-Drop */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);
          const droppedFiles = await extractFilesFromDataTransfer(e.dataTransfer);
          if (droppedFiles.length > 0) {
            await handleFilesSelected(droppedFiles);
          }
        }}
        className="mb-6 rounded-2xl border-2 border-dashed p-5 transition-colors flex flex-col lg:flex-row items-center justify-between gap-4"
        style={{
          borderColor: isDragging ? "var(--ai)" : "var(--garis)",
          background: isDragging ? "rgba(180, 201, 219, 0.16)" : "var(--panel)",
        }}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--tsuki)",
              color: "var(--ai)",
            }}
          >
            <Icon name="upload" size={20} />
          </div>
          <div>
            <div className="text-[14px] font-semibold">
              Seret &amp; lepas novel (<code>.epub</code>, <code>.txt</code>) atau
              manga (<code>.cbz</code>, <code>.zip</code>, gambar, atau folder)
            </div>
            <p className="text-[12px]" style={{ color: "var(--tinta-2)" }}>
              Novel dan arsip manga disimpan langsung di perangkat dan dimuat per
              halaman sesuai urutan asli secara otomatis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <Button
            className="outline-button"
            disabled={uploading}
            onClick={() => void handleAddSampleManga()}
          >
            <Icon name="sparkle" size={15} /> Manga Contoh (CBZ)
          </Button>
          {books.length === 0 && (
            <Button
              className="outline-button"
              disabled={uploading}
              onClick={() => void handleAddSampleNovel()}
            >
              <Icon name="sparkle" size={15} /> Novel Contoh
            </Button>
          )}
          <Button
            className="outline-button"
            disabled={uploading}
            onClick={() => folderInputRef.current?.click()}
          >
            <Icon name="upload" size={15} /> Pilih Folder
          </Button>
          <Button
            className="outline-button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="plus" size={15} /> Pilih Berkas
          </Button>
        </div>
      </section>

      {/* Toolbar Filter & Pencarian */}
      <section className="pg-toolbar">
        <Tabs items={FORMAT_TABS} value={formatTab} onChange={setFormatTab} />
        <div className="pg-toolbar-right">
          <label className="pg-select">
            <Icon name="filter" size={15} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BookSort)}
              aria-label="Urutkan koleksi"
            >
              {BOOK_SORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="pg-search">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul atau penulis..."
            />
          </label>
        </div>
      </section>

      {/* Grid Kartu Buku & Manga */}
      {loading ? (
        <p className="pg-empty">Memuat koleksi perpustakaan...</p>
      ) : filteredBooks.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center my-4"
          style={{
            background: "var(--panel)",
            borderColor: "var(--garis)",
          }}
        >
          <p className="text-[15px] font-semibold">
            {books.length === 0
              ? "Rak Perpustakaan masih kosong"
              : "Tidak ada koleksi yang cocok dengan filter"}
          </p>
          <p
            className="text-[13px] mt-1 max-w-md mx-auto"
            style={{ color: "var(--tinta-2)" }}
          >
            {books.length === 0
              ? "Tambahkan berkas novel (.epub/.txt) atau manga (.cbz/.zip/kumpulan gambar/folder), atau muat contoh untuk menguji fitur pembaca dan sentence mining."
              : "Coba ubah kata kunci pencarian atau tab filter format di atas."}
          </p>
          {books.length === 0 && (
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <Button
                className="pg-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" size={16} /> Unggah Novel / Manga
              </Button>
              <Button
                className="outline-button"
                onClick={() => void handleAddSampleManga()}
              >
                <Icon name="sparkle" size={16} /> Coba Manga Contoh
              </Button>
              <Button
                className="outline-button"
                onClick={() => void handleAddSampleNovel()}
              >
                <Icon name="sparkle" size={16} /> Coba Novel Contoh
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="lb-grid">
          {filteredBooks.map((book, idx) => {
            const isManga = isMangaBook(book);
            return (
              <article className="lb-card" key={book.id}>
                <BookCover book={book} index={idx}>
                  <em>{formatBadgeLabel(book)}</em>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="lb-save"
                      style={{ right: "2.65rem" }}
                      aria-label={`Edit ${book.title}`}
                      title={
                        isManga
                          ? "Edit judul & urutan halaman manga"
                          : "Edit judul novel"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingBook(book);
                      }}
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      className="lb-save"
                      aria-label={`Hapus ${book.title}`}
                      title="Hapus dari perpustakaan"
                      disabled={deletingBookId === book.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteBook(book);
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </BookCover>

                <div className="flex items-center justify-between gap-1">
                  <h3 className="truncate" title={book.title}>
                    {book.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setManagingBook(book)}
                    className="p-1 min-w-[28px] min-h-[28px] max-sm:min-w-[36px] max-sm:min-h-[36px] inline-flex items-center justify-center rounded opacity-60 hover:opacity-100 shrink-0"
                    title={
                      isManga
                        ? "Edit judul & urutan halaman"
                        : "Edit judul"
                    }
                    aria-label={`Ubah judul ${book.title}`}
                  >
                    <Icon name="edit" size={13} />
                  </button>
                </div>

                <p className="truncate" title={book.author}>
                  {book.author}
                  {book.volume ? ` • ${book.volume}` : ""}
                </p>
                <div className="progress">
                  <i style={{ width: `${book.progress}%` }} />
                </div>
                <div className="lb-meta">
                  {isManga ? (
                    <>
                      <span>
                        Hal. {(book.currentPage ?? 0) + 1}/{book.pageCount ?? 0} (
                        {book.progress}%)
                      </span>
                      <span>{book.pageCount ?? 0} halaman</span>
                    </>
                  ) : (
                    <>
                      <span>{book.progress}% selesai</span>
                      <span>{formatFileSize(book.fileSize)}</span>
                    </>
                  )}
                </div>
                <div className="lb-foot">
                  <span title="Jumlah kalimat yang ditambang">
                    <Icon name="mine" size={14} /> {book.minedCount ?? 0} kartu
                  </span>
                  <Button
                    className="deck-open"
                    onClick={() => navigate(getBookReaderPath(book))}
                  >
                    {book.progress === 0 ? "Mulai" : "Lanjutkan"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
