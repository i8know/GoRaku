import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DictionaryManagerModal from "../components/DictionaryManagerModal";
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
import { Button, Icon, PageHead, Tabs } from "../ui";

const FORMAT_TABS = ["Semua", "EPUB", "TXT"] as const;
type FormatTab = (typeof FORMAT_TABS)[number];

const BOOK_SORTS = [
  "Terakhir Dibaca",
  "Progres Baca",
  "Kata Ditambang",
  "Judul (A-Z)",
] as const;
type BookSort = (typeof BOOK_SORTS)[number];

const TONE_CLASSES = ["novel", "kitchen", "anime", "manga", "family", "ghibli"];

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

  const tone = TONE_CLASSES[index % TONE_CLASSES.length];
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshBooks = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listNovels();
      setBooks(list);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memuat daftar novel.",
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

  const handleFilesSelected = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    setUploading(true);
    setErrorMsg(null);
    let addedCount = 0;

    try {
      for (const file of arr) {
        const record = await addNovelFile(file);
        addedCount++;
        notify(`Novel "${record.title}" (${record.format.toUpperCase()}) ditambahkan`);
      }
      if (addedCount > 0) {
        await refreshBooks();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menambahkan berkas novel.";
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

  const handleDeleteBook = async (book: BookRecord) => {
    if (deletingBookId) return;
    setDeletingBookId(book.id);
    try {
      await deleteNovel(book.id);
      notify(`"${book.title}" dihapus dari Perpustakaan`);
      await refreshBooks();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus novel.",
      );
    } finally {
      setDeletingBookId(null);
    }
  };

  const filteredBooks = useMemo(() => {
    const filtered = books.filter((b) => {
      if (formatTab === "EPUB" && b.format !== "epub") return false;
      if (formatTab === "TXT" && b.format !== "txt") return false;
      if (q.trim()) {
        const hay = `${b.title} ${b.author}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "Progres Baca") return (b.progress ?? 0) - (a.progress ?? 0);
      if (sortBy === "Kata Ditambang") return (b.minedCount ?? 0) - (a.minedCount ?? 0);
      if (sortBy === "Judul (A-Z)") return a.title.localeCompare(b.title, "ja");
      return (b.updatedAt ?? b.addedAt ?? 0) - (a.updatedAt ?? a.addedAt ?? 0);
    });
  }, [books, formatTab, sortBy, q]);

  const heroBook = books[0] ?? null;

  return (
    <>
      <PageHead
        eyebrow="PERPUSTAKAAN NOVEL & IMMERSION"
        title="Perpustakaan"
        accent="読書"
        copy="Unggah novel EPUB atau TXT milikmu, baca langsung di browser, klik kata untuk membuka kamus Yomitan, dan tambang kalimat ke deck."
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            className="outline-button"
            onClick={() => setDictModalOpen(true)}
          >
            <Icon name="book" size={16} /> Kelola Kamus ({activeDictCount})
          </Button>
          <Button
            className="pg-primary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="plus" size={17} />{" "}
            {uploading ? "Memproses..." : "Tambah Novel (EPUB/TXT)"}
          </Button>
        </div>
      </PageHead>

      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.txt,application/epub+zip,text/plain"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            void handleFilesSelected(e.target.files);
            e.target.value = "";
          }
        }}
      />

      <DictionaryManagerModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
        onDictionariesChanged={setDictionaries}
      />

      {/* Pesan Error */}
      {errorMsg && (
        <div
          className="mb-5 rounded-xl px-4 py-3 border text-[13px] flex items-center justify-between gap-3"
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
            className="text-xs underline font-medium"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Hero: Novel Terakhir Dibaca */}
      {heroBook && (
        <section className="lb-hero">
          <BookCover book={heroBook} index={0} className="lb-cover" />
          <div className="lb-hero-body">
            <p className="eyebrow light">
              LANJUTKAN MEMBACA • {heroBook.format.toUpperCase()}
              {heroBook.encoding ? ` (${heroBook.encoding.toUpperCase()})` : ""}
            </p>
            <h2>{heroBook.title}</h2>
            <p className="lb-en">
              {heroBook.author} •{" "}
              {(heroBook.fileSize / 1024).toFixed(1)} KB
            </p>
            <div className="lb-hero-prog">
              <div className="progress">
                <i style={{ width: `${heroBook.progress}%` }} />
              </div>
              <span>
                {heroBook.progress}% selesai
              </span>
            </div>
            <div className="lb-hero-actions">
              <Button
                className="primary-light"
                onClick={() => navigate(`/library/${heroBook.id}`)}
              >
                {heroBook.progress > 0 ? "Lanjutkan Membaca" : "Mulai Membaca"}{" "}
                <Icon name="arrow" size={17} />
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
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            void handleFilesSelected(e.dataTransfer.files);
          }
        }}
        className="mb-6 rounded-2xl border-2 border-dashed p-5 transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          borderColor: isDragging ? "var(--accent)" : "var(--line-strong)",
          background: isDragging ? "var(--accent-soft)" : "var(--surface)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--accent)",
            }}
          >
            <Icon name="upload" size={20} />
          </div>
          <div>
            <div className="text-[14px] font-semibold">
              Seret &amp; lepas berkas novel <code>.epub</code> atau{" "}
              <code>.txt</code> ke sini
            </div>
            <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>
              Disimpan sepenuhnya di IndexedDB browser Anda (mendukung UTF-8,
              Shift_JIS, EUC-JP, dan furigana <code>&lt;ruby&gt;</code>).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {books.length === 0 && (
            <Button
              className="outline-button"
              disabled={uploading}
              onClick={() => void handleAddSampleNovel()}
            >
              <Icon name="sparkle" size={15} /> Muat Novel Contoh
            </Button>
          )}
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
              aria-label="Urutkan novel"
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
              placeholder="Cari judul atau penulis novel..."
            />
          </label>
        </div>
      </section>

      {/* Grid Kartu Buku */}
      {loading ? (
        <p className="pg-empty">Memuat koleksi perpustakaan...</p>
      ) : filteredBooks.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center my-4"
          style={{
            background: "var(--surface)",
            borderColor: "var(--line)",
          }}
        >
          <p className="text-[15px] font-semibold">
            {books.length === 0
              ? "Rak Perpustakaan masih kosong"
              : "Tidak ada novel yang cocok dengan pencarian"}
          </p>
          <p
            className="text-[13px] mt-1 max-w-md mx-auto"
            style={{ color: "var(--ink-3)" }}
          >
            {books.length === 0
              ? "Tambahkan berkas novel EPUB atau TXT milikmu, atau coba novel pendek contoh untuk menguji fitur klik kamus & sentence mining."
              : "Coba ubah kata kunci pencarian atau tab filter format di atas."}
          </p>
          {books.length === 0 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                className="pg-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" size={16} /> Unggah EPUB / TXT
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
          {filteredBooks.map((book, idx) => (
            <article className="lb-card" key={book.id}>
              <BookCover book={book} index={idx}>
                <em>
                  {book.format.toUpperCase()}
                  {book.encoding ? ` • ${book.encoding.toUpperCase()}` : ""}
                </em>
                <button
                  type="button"
                  className="lb-save"
                  aria-label={`Hapus ${book.title}`}
                  title="Hapus novel dari perpustakaan"
                  disabled={deletingBookId === book.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteBook(book);
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </BookCover>

              <h3 className="truncate" title={book.title}>
                {book.title}
              </h3>
              <p className="truncate" title={book.author}>
                {book.author}
              </p>
              <div className="progress">
                <i style={{ width: `${book.progress}%` }} />
              </div>
              <div className="lb-meta">
                <span>{book.progress}% selesai</span>
                <span>{(book.fileSize / 1024).toFixed(0)} KB</span>
              </div>
              <div className="lb-foot">
                <span title="Jumlah kalimat yang ditambang">
                  <Icon name="mine" size={14} /> {book.minedCount ?? 0} kartu
                </span>
                <Button
                  className="deck-open"
                  onClick={() => navigate(`/library/${book.id}`)}
                >
                  {book.progress === 0 ? "Mulai" : "Lanjutkan"}{" "}
                  <Icon name="arrow" size={15} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
