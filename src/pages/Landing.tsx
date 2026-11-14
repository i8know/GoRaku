import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, Button, type IconName } from "../ui";
import { speakJapanese } from "../lib/tts";
import { useAppStore } from "../store/useAppStore";

interface DemoToken {
  id: string;
  surface: string;
  dictionaryForm: string;
  reading: string;
  pitch: string;
  pos: string;
  jlpt: string;
  reasons: string[];
  meaning: string;
  sentenceHtml: string;
  sentencePlain: string;
  targetSubdeck: string;
}

const HERO_DEMO_TOKENS: DemoToken[] = [
  {
    id: "tabesaserarenakatta",
    surface: "食べさせられなかった",
    dictionaryForm: "食べる",
    reading: "たべる",
    pitch: "[2] 中高型 (たべ↓る)",
    pos: "Ichidan Verb (v1)",
    jlpt: "N5",
    reasons: [
      "negatif lampau (-なかった)",
      "pasif/potensial (-られる)",
      "kausatif (-させる)",
    ],
    meaning: "1. makan; mengonsumsi • 2. hidup dari (to eat; to live on)",
    sentenceHtml:
      "昨日は野菜を<b>食べさせられなかった</b>ので、少し困っていたようだった。",
    sentencePlain:
      "昨日は野菜を食べさせられなかったので、少し困っていたようだった。",
    targetSubdeck: "Philia Space :: Kotoba N5-N1 :: N5",
  },
  {
    id: "oishikatta",
    surface: "美味しかった",
    dictionaryForm: "美味しい",
    reading: "おいしい",
    pitch: "[3] 中高型 (おいし↓い)",
    pos: "Adjektiva-i (adj-i)",
    jlpt: "N5",
    reasons: ["bentuk lampau (-かった)"],
    meaning: "enak; lezat; sedap rasanya (delicious; tasty)",
    sentenceHtml:
      "「今日はとても<b>美味しかった</b>よ！」と先生は笑いながら言った。",
    sentencePlain: "「今日はとても美味しかったよ！」と先生は笑いながら言った。",
    targetSubdeck: "Philia Space :: Kotoba N5-N1 :: N5",
  },
  {
    id: "benkyoushiteiru",
    surface: "勉強している",
    dictionaryForm: "勉強する",
    reading: "べんきょうする",
    pitch: "[0] 平板型 (べんきょうする￣)",
    pos: "Suru Verb (vs)",
    jlpt: "N5",
    reasons: ["sedang berlangsung (-ている)"],
    meaning: "belajar; mempelajari dengan tekun (to study)",
    sentenceHtml:
      "日本語学校に通う学生たちは、毎日熱心に<b>勉強している</b>。",
    sentencePlain: "日本語学校に通う学生たちは、毎日熱心に勉強している。",
    targetSubdeck: "Philia Space :: Kotoba N5-N1 :: N5",
  },
  {
    id: "ikanakatta",
    surface: "行かなかった",
    dictionaryForm: "行く",
    reading: "いく",
    pitch: "[0] 平板型 (いく￣)",
    pos: "Godan Verb (v5k-s)",
    jlpt: "N5",
    reasons: ["negatif lampau (-なかった)"],
    meaning: "pergi; berangkat; menuju (to go; to proceed)",
    sentenceHtml:
      "外は静かな雨が降っていたので、予定していた散歩には<b>行かなかった</b>。",
    sentencePlain:
      "外は静かな雨が降っていたので、予定していた散歩には行かなかった。",
    targetSubdeck: "Philia Space :: Kotoba N5-N1 :: N5",
  },
];

const FEATURE_TABS = [
  {
    id: "reader",
    kanjiNum: "一",
    label: "Pembaca Novel & Manga",
    jpSub: "小説・漫画リーダー",
    icon: "book" as IconName,
    badge: "Foliate-js • Multi-Encoding • OCR",
    title: "Baca novel EPUB/TXT & manga CBZ dengan dukungan Furigana dan Tategaki",
    description:
      "Buka koleksi novel EPUB, berkas teks TXT (UTF-8, Shift_JIS, EUC-JP terdeteksi otomatis), maupun komik Manga CBZ/ZIP. Posisi baca terakhir disimpan presisi di IndexedDB sehingga halaman otomatis pulih saat dibuka kembali.",
    bullets: [
      "Dukungan tag <ruby><rt> furigana utuh tanpa mengganggu akurasi pemindaian kamus",
      "Pilihan kertas baca tradisional: Washi (Terang), Kohaku (Sepia), dan Sumi (Gelap)",
      "Mendukung tata letak horizontal (Yokogaki) maupun teks vertikal klasik (Tategaki)",
      "Pembaca Manga mode 1/2 halaman RTL dengan OCR gelembung dialog vertikal (jpn_vert)",
    ],
  },
  {
    id: "dictionary",
    kanjiNum: "二",
    label: "Kamus Yomitan & Deinflection",
    jpSub: "形態素解析・辞書検索",
    icon: "search" as IconName,
    badge: "Lookup ~1 ms • 200k+ Entri",
    title: "Mesin pencarian substring terpanjang & deinflection kata berkonjugasi",
    description:
      "Impor kamus ZIP berformat Yomitan (seperti JMdict atau Jitendex) melalui Web Worker tanpa membekukan layar. Saat Anda mengeklik kata berkonjugasi, mesin mengurai rantai imbuhan kembali ke bentuk kamus dalam satu transaksi IndexedDB.",
    bullets: [
      "Mendukung rantai konjugasi berlapis: Ichidan, Godan, Adjektiva-i, Suru, dan Kuru (ます, て/た, ない, ば, させる, られる, たい, ている)",
      "Normalisasi bacaan Katakana ke Hiragana otomatis untuk pencarian kata berkana",
      "Pengelompokan arti per kamus yang dapat dilipat beserta atribusi lisensi resmi (CC BY-SA 4.0)",
      "Pencarian global instan kapan saja lewat pintasan Command Palette (Ctrl+K / ⌘K)",
    ],
  },
  {
    id: "mining",
    kanjiNum: "三",
    label: "Sentence Mining Kontekstual",
    jpSub: "文脈マイニング",
    icon: "mine" as IconName,
    badge: "Ekstraksi Kalimat Cerdas",
    title: "Ubah kalimat novel atau dialog manga menjadi flashcard dalam 1 klik",
    description:
      "Tidak perlu lagi menyalin dan menempel kalimat secara manual. Klik kata yang belum dikenal di dalam novel, sorot balon dialog manga, atau gunakan Studio Teks — kalimat sumber otomatis diekstrak dan kata target ditandai tebal.",
    bullets: [
      "Ekstraksi kalimat kontekstual berdasarkan tanda baca (。！？) yang menjaga dialog 「...」 dan 『...』 tetap utuh",
      "Penanda duplikat otomatis jika kata (expression + reading) sudah ada di dalam deck tujuan",
      "Editor langsung pada popup untuk memilih sub-deck tujuan (N5–N1) sebelum disimpan",
      "Dilengkapi pengucapan suara bahasa Jepang (Web Speech API ja-JP) untuk kata dan kalimat",
    ],
  },
  {
    id: "srs",
    kanjiNum: "四",
    label: "Sub-Deck Anki & Review SRS",
    jpSub: "階層型暗記システム",
    icon: "cards" as IconName,
    badge: "SQLite WASM • Sub-Deck N5–N1",
    title: "Impor deck Anki (.apkg) dengan hierarki Sub-Deck N5–N1 otomatis",
    description:
      "Tarik berkas .apkg seperti Philia Space atau Core 10K langsung ke aplikasi. Sistem memisahkan struktur folder bertingkat (::) dan level JLPT N5–N1 menjadi sub-deck rapi sehingga Anda bebas memilih belajar N5 dulu atau N1.",
    bullets: [
      "Mendukung format paket Anki lama (.anki2) maupun kompresi modern (.anki21b / Zstandard)",
      "Hierarki Sub-Deck interaktif dengan penghitung 3-angka khas Anki: Baru (Biru), Belajar (Merah), Ulas (Hijau)",
      "Sesi review interaktif dengan pintasan keyboard (Spasi & 1–4), Undo (Ctrl+Z), dan toggle Furigana",
      "Ekspor kembali koleksi deck kapan saja ke format CSV atau JSON",
    ],
  },
] as const;

const PILLAR_CARDS: {
  icon: IconName;
  kanjiWatermark: string;
  tag: string;
  jpTag: string;
  title: string;
  desc: string;
  highlights: string[];
}[] = [
  {
    icon: "book",
    kanjiWatermark: "読",
    tag: "PEMBACA MULTI-FORMAT",
    jpTag: "読書空間",
    title: "Perpustakaan EPUB, TXT & Manga",
    desc: "Simpan novel dan manga Jepang di browser, baca per halaman atau gulir, dan lanjutkan tepat dari posisi kalimat terakhir.",
    highlights: ["Deteksi Shift_JIS & UTF-8", "Dukungan <ruby> Furigana", "Mode Yokogaki & Tategaki"],
  },
  {
    icon: "search",
    kanjiWatermark: "辞",
    tag: "KAMUS OFFLINE",
    jpTag: "高速辞書",
    title: "Impor ZIP Format Yomitan",
    desc: "Gunakan JMdict atau Jitendex secara offline. Proses impor berjalan di Web Worker per 1.000 baris dengan tombol batal.",
    highlights: ["Skema Yomitan v3", "Prioritas Multi-Kamus", "Lookup ~1 milidetik"],
  },
  {
    icon: "sparkle",
    kanjiWatermark: "態",
    tag: "MORFOLOGI JEPANG",
    jpTag: "活用分解",
    title: "Deinflection Berlapis",
    desc: "Mengenali perubahan kata kerja dan kata sifat hingga rantai 4 lapis dan memvalidasinya terhadap aturan kamus.",
    highlights: ["Ichidan, Godan, Adj-i", "Kausatif-Pasif-Negatif", "Validasi Tag Aturan (v1/v5)"],
  },
  {
    icon: "mine",
    kanjiWatermark: "掘",
    tag: "SENTENCE MINING",
    jpTag: "文脈採掘",
    title: "1-Click Popup & Studio Teks",
    desc: "Klik kata di novel, pindai balon dialog manga, atau gunakan Studio Teks untuk membuat kartu lengkap dengan kalimat sumber.",
    highlights: ["Dialog 「...」 Tidak Terpotong", "Deteksi Kartu Ganda", "Audio Pengucapan ja-JP"],
  },
  {
    icon: "cards",
    kanjiWatermark: "層",
    tag: "REVOLUSI ANKI",
    jpTag: "階層構造",
    title: "Impor .apkg & Sub-Deck N5–N1",
    desc: "Bawa masuk deck Anki lengkap dengan hierarki sub-deck bertingkat (Philia Space / Core 10K) dan media audio/gambar offline.",
    highlights: ["Sub-Deck N5 hingga N1", "Format .anki2 & .anki21b", "3 Indikator Baru/Belajar/Ulas"],
  },
  {
    icon: "lock",
    kanjiWatermark: "密",
    tag: "ARSITEKTUR PRIVASI",
    jpTag: "完全ローカル",
    title: "100% Local-First di Browser",
    desc: "Tanpa backend server. Seluruh berkas novel, kamus, hasil ujian JLPT, dan jadwal kartu disimpan aman di IndexedDB perangkat Anda.",
    highlights: ["Tanpa Upload ke Server", "Bekerja Tanpa Internet", "Isolasi Data Pengguna"],
  },
];

const SUBDECK_DEMO_TREE = [
  { id: "n5", code: "N5", title: "Kotoba N5 (Dasar)", kanji: "五", newCount: 15, learnCount: 2, dueCount: 10, total: 100, sample: "食べる • 行く • 美味しい • 水" },
  { id: "n4", code: "N4", title: "Kotoba N4 (Menengah Awal)", kanji: "四", newCount: 15, learnCount: 0, dueCount: 3, total: 120, sample: "届ける • 相談 • 間に合う • 丁寧" },
  { id: "n3", code: "N3", title: "Kotoba N3 (Menengah)", kanji: "三", newCount: 15, learnCount: 0, dueCount: 28, total: 150, sample: "雰囲気 • 影響 • 具体的 • 把握" },
  { id: "n2", code: "N2", title: "Kotoba N2 (Mahir Awal)", kanji: "二", newCount: 15, learnCount: 0, dueCount: 119, total: 180, sample: "妥協 • 経緯 • 概念 • 顕著" },
  { id: "n1", code: "N1", title: "Kotoba N1 (Mahir)", kanji: "一", newCount: 20, learnCount: 0, dueCount: 0, total: 200, sample: "網羅 • 礎 • 普遍的 • 凌駕" },
  { id: "core", code: "10K", title: "Ankidrone Core 10K", kanji: "核", newCount: 20, learnCount: 16, dueCount: 98, total: 134, sample: "懐かしい • 寿命 • 木漏れ日 • 居場所" },
] as const;

const FAQ_ITEMS = [
  {
    q: "Apakah novel, manga, dan kamus yang saya unggah dikirim ke server?",
    a: "Tidak sama sekali. 語楽 (GORAKU) dirancang dengan arsitektur 100% Local-First menggunakan IndexedDB (Dexie), SQLite WASM, dan Web Worker di dalam browser Anda. Berkas EPUB, TXT, CBZ, kamus Yomitan, maupun paket Anki .apkg tidak pernah meninggalkan perangkat Anda.",
  },
  {
    q: "Bagaimana cara kerja pemisahan Sub-Deck otomatis saat mengimpor deck Anki (.apkg)?",
    a: "Ketika Anda mengimpor paket Anki seperti Philia Space atau Core 10K, sistem secara cerdas membaca hierarki tanda '::' serta tag level JLPT (N5–N1) untuk membangun struktur pohon Sub-Deck. Anda cukup menekan deck induk untuk membuka sub-deck dan bebas memilih ingin belajar level N5 terlebih dahulu atau langsung N1.",
  },
  {
    q: "Dari mana saya bisa mendapatkan berkas kamus format Yomitan?",
    a: "Anda dapat mengunduh berkas ZIP kamus bebas lisensi terbuka seperti JMdict_english.zip (rilis resmi proyek yomidevs/jmdict-yomitan atau Jitendex yang berlisensi CC BY-SA 4.0 milik EDRDG), lalu mengimpornya lewat menu 'Kelola Kamus' di aplikasi.",
  },
  {
    q: "Bagaimana cara kerja pencarian kata yang sudah berubah bentuk (konjugasi)?",
    a: "Saat Anda mengeklik kata di pembaca novel (misalnya 食べさせられなかった), mesin pencarian memindai substring terpanjang dan menjalankan tabel aturan deinflection mandiri untuk mengembalikannya ke bentuk kamus (食べる) beserta penjelasan rantai perubahannya.",
  },
] as const;

const NAV_LINKS = [
  { id: "simulasi", label: "Simulasi" },
  { id: "subdeck-jlpt", label: "Sub-Deck & JLPT" },
  { id: "eksplorer", label: "4 Modul Inti" },
  { id: "fitur", label: "Arsitektur" },
  { id: "faq", label: "FAQ" },
] as const;

function LandingNav({ loggedIn }: { loggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string>(NAV_LINKS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Keadaan "scrolled" setelah > 24px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy deterministik berbasis posisi section terhadap ambang batas bawah pill
  useEffect(() => {
    let rafId = 0;
    const updateActive = () => {
      rafId = 0;
      if (window.scrollY <= 8) {
        setActiveId(NAV_LINKS[0].id);
        return;
      }
      if (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 24
      ) {
        setActiveId(NAV_LINKS[NAV_LINKS.length - 1].id);
        return;
      }

      const navBottom = navRef.current?.getBoundingClientRect().bottom ?? 80;
      const threshold = navBottom + 48;
      let current: string = NAV_LINKS[0].id;
      for (const l of NAV_LINKS) {
        const el = document.getElementById(l.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          current = l.id;
        }
      }
      setActiveId(current);
    };

    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  // Tutup menu saat halaman berpindah atau viewport melebar ke desktop
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Tutup menu: Escape (fokus kembali ke tombol menu) dan klik di luar
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const linkProps = (id: string) => ({
    href: `#${id}`,
    "aria-current": activeId === id ? ("true" as const) : undefined,
    onClick: () => {
      setActiveId(id);
      setMenuOpen(false);
    },
  });

  return (
    <nav
      ref={navRef}
      className={`landing-nav${scrolled ? " is-scrolled" : ""}`}
      aria-label="Navigasi utama"
    >
      <a href="#simulasi" className="lnav-brand" aria-label="GoRaku, kembali ke atas">
        <span className="lnav-seal" lang="ja" aria-hidden="true">語</span>
        <span className="lnav-brand-copy" aria-hidden="true">
          <strong lang="ja">語楽</strong>
          <small>GoRaku</small>
        </span>
        <span className="lnav-tagline" lang="ja" aria-hidden="true">
          日本語没入型学習環境
        </span>
      </a>

      <div className="lnav-links">
        {NAV_LINKS.map((l) => (
          <a key={l.id} {...linkProps(l.id)}>
            {l.label}
          </a>
        ))}
      </div>

      <div className="lnav-actions">
        <button
          ref={menuBtnRef}
          type="button"
          className="lnav-menu-btn"
          aria-label={menuOpen ? "Tutup menu" : "Menu"}
          aria-expanded={menuOpen}
          aria-controls="lnav-panel"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="lnav-menu-lines" aria-hidden="true" />
        </button>
        <Link to={loggedIn ? "/beranda" : "/login"} className="lnav-cta">
          <span className="lnav-cta-long">{loggedIn ? "Buka Dashboard" : "Masuk / Mulai"}</span>
          <span className="lnav-cta-short">{loggedIn ? "Dashboard" : "Masuk"}</span>
        </Link>
      </div>

      <div id="lnav-panel" className="lnav-panel" data-open={menuOpen} aria-hidden={!menuOpen}>
        {NAV_LINKS.map((l) => (
          <a key={l.id} {...linkProps(l.id)} tabIndex={menuOpen ? undefined : -1}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);

  // State untuk Simulator Pembaca & Sentence Mining di Hero
  const [selectedTokenId, setSelectedTokenId] = useState<string>("tabesaserarenakatta");
  const [heroFurigana, setHeroFurigana] = useState(true);
  const [heroTheme, setHeroTheme] = useState<"light" | "sepia" | "dark">("light");
  const [minedMap, setMinedMap] = useState<Record<string, boolean>>({});

  // State untuk Interactive Feature Explorer (4 Tab)
  const [activeTabId, setActiveTabId] = useState<(typeof FEATURE_TABS)[number]["id"]>("reader");
  const [previewWritingMode, setPreviewWritingMode] = useState<"horizontal-tb" | "vertical-rl">("horizontal-tb");
  const [demoCardFlipped, setDemoCardFlipped] = useState(false);

  // State untuk Interactive Sub-deck & JLPT Showcase
  const [demoParentOpen, setDemoParentOpen] = useState(true);
  const [selectedSubdeckId, setSelectedSubdeckId] = useState<string>("n5");
  const [demoExamChoice, setDemoExamChoice] = useState<number | null>(null);

  // State untuk FAQ Accordion
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const activeToken =
    HERO_DEMO_TOKENS.find((t) => t.id === selectedTokenId) ?? HERO_DEMO_TOKENS[0];
  const activeTab =
    FEATURE_TABS.find((t) => t.id === activeTabId) ?? FEATURE_TABS[0];
  const activeSubdeck =
    SUBDECK_DEMO_TREE.find((d) => d.id === selectedSubdeckId) ?? SUBDECK_DEMO_TREE[0];
  const minedCount = Object.values(minedMap).filter(Boolean).length;

  const readerThemeStyle =
    heroTheme === "dark"
      ? { bg: "#171a18", fg: "#ebe7df", border: "#353d38", sub: "#c0ced5", badgeBg: "#24302b", accent: "#8EC2DC" }
      : heroTheme === "sepia"
        ? { bg: "#f3ead6", fg: "#2b231a", border: "#d9c8ad", sub: "#5e4e3d", badgeBg: "#e7dac1", accent: "var(--ai-tua)" }
        : { bg: "var(--panel)", fg: "var(--tinta)", border: "var(--garis)", sub: "var(--tinta-2)", badgeBg: "var(--tsuki)", accent: "var(--ai)" };

  return (
    <div className="landing">
      {/* NAVIGASI ATAS — Floating Pill (Aizome) */}
      <LandingNav loggedIn={!!user} />

      <main id="main-content">
      {/* 壱 • HERO SECTION — Editorial Split + Bunkobon Live Simulator */}
      <section id="simulasi" className="landing-hero">
        <div className="landing-hero-copy">
          {/* Japanese Editorial Stamp & Eyebrow */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span lang="ja" className="jp-hanko text-[10.5px]">
              語楽之印
            </span>
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--tinta-2)]">
              IMMERSION • REVOLUSI ANKI • SIMULASI JLPT N5–N1
            </span>
          </div>

          <p
            lang="ja"
            className="text-xs sm:text-sm font-serif text-[var(--ai)] tracking-[0.18em] mb-1.5"
          >
            言葉に出会い、文脈ごと記憶する。
          </p>

          <h1>
            Baca karya asli Jepang,<br />
            klik satu kata, <span>tambang ke dalam ingatan.</span>
          </h1>

          <p className="welcome-copy">
            <strong>語楽 (GORAKU)</strong> menyatukan <strong>Pembaca Novel EPUB/TXT &amp; Manga OCR</strong>,{" "}
            <strong>Kamus Offline Yomitan dengan Deinflection</strong>,{" "}
            <strong>Hierarki Sub-Deck Anki (.apkg) N5–N1</strong>, serta{" "}
            <strong>Simulasi Ujian JLPT</strong> dalam satu ruang kerja minimalis berbasis kertas{" "}
            <em>Washi</em> — 100% berjalan lokal di perangkat Anda.
          </p>

          {/* Minimalist Architectural Feature Tags */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 max-w-[560px]">
            {[
              { jp: "読解", label: "Novel & Manga OCR" },
              { jp: "辞書", label: "Yomitan < 2ms" },
              { jp: "階層", label: "Sub-Deck N5–N1" },
              { jp: "試験", label: "Simulasi JLPT" },
            ].map((item) => (
              <div
                key={item.jp}
                className="flex items-center gap-2 rounded-lg border border-[var(--garis)] bg-[var(--panel)] px-2.5 py-2"
              >
                <span
                  lang="ja"
                  className="w-6 h-6 rounded bg-[var(--kon)] text-white font-serif text-[11px] font-bold grid place-items-center shrink-0"
                >
                  {item.jp}
                </span>
                <span className="text-[11px] font-semibold text-[var(--tinta)] leading-tight">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="landing-cta">
            <Link
              to={user ? "/beranda" : "/login"}
              className="primary-light no-underline"
              style={{ padding: "12px 22px", fontSize: "13px" }}
            >
              {user ? "Lanjutkan di Dashboard" : "Mulai Belajar Sekarang"}
            </Link>
            {user ? (
              <Link
                to="/exam"
                className="outline-button no-underline"
                style={{ padding: "12px 18px", fontSize: "12.5px" }}
              >
                <Icon name="sparkle" size={16} /> Buka Ujian JLPT
              </Link>
            ) : (
              <a
                href="#subdeck-jlpt"
                className="outline-button no-underline"
                style={{ padding: "12px 18px", fontSize: "12.5px" }}
              >
                <Icon name="sparkle" size={16} /> Coba Simulasi JLPT
              </a>
            )}
            <a
              href="#subdeck-jlpt"
              className="outline-button no-underline"
              style={{ padding: "12px 16px", fontSize: "12.5px" }}
            >
              <Icon name="cards" size={16} /> Lihat Hierarki Sub-Deck
            </a>
          </div>

          {/* Koushi 3-Column Technical Specification Strip */}
          <div className="landing-stats max-w-[560px]">
            <div>
              <small lang="ja" className="text-[9.5px] font-bold tracking-widest text-[var(--ai)] uppercase">
                検索速度 • LOOKUP
              </small>
              <strong>~1,00 ms</strong>
              <span>200.000+ entri JMdict &amp; 4 lapis deinflection</span>
            </div>
            <div>
              <small lang="ja" className="text-[9.5px] font-bold tracking-widest text-[var(--ai)] uppercase">
                階層構造 • SUB-DECK
              </small>
              <strong>N5 → N1</strong>
              <span>Partisi otomatis deck Anki .apkg per level</span>
            </div>
            <div>
              <small lang="ja" className="text-[9.5px] font-bold tracking-widest text-[var(--ai)] uppercase">
                保存設計 • PRIVASI
              </small>
              <strong>100% Lokal</strong>
              <span>IndexedDB + SQLite WASM tanpa server</span>
            </div>
          </div>
        </div>

        {/* RIGHT: BUNKOBON (文庫本) LIVE READER & YOMITAN INSPECTOR */}
        <div className="w-full max-w-[540px] flex-1">
          <div
            className="rounded-2xl border shadow-xl overflow-hidden transition-colors"
            style={{
              background: readerThemeStyle.bg,
              color: readerThemeStyle.fg,
              borderColor: readerThemeStyle.border,
            }}
          >
            {/* Bunkobon Header Bar */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b text-xs"
              style={{ borderColor: readerThemeStyle.border }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  lang="ja"
                  className="rounded border px-2 py-0.5 text-[10px] font-serif font-bold shrink-0"
                  style={{
                    color: readerThemeStyle.accent,
                    borderColor: readerThemeStyle.border,
                    backgroundColor: readerThemeStyle.badgeBg,
                  }}
                >
                  文庫判 • 四十二頁
                </span>
                <span className="font-serif font-semibold truncate text-xs" lang="ja">
                  夏目漱石『吾輩は猫である』
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setHeroFurigana((v) => !v)}
                  aria-pressed={heroFurigana}
                  className="rounded-md border px-2.5 min-h-[32px] inline-flex items-center justify-center text-[10.5px] font-bold transition-colors cursor-pointer"
                  style={
                    heroFurigana
                      ? {
                          borderColor: readerThemeStyle.accent,
                          backgroundColor: readerThemeStyle.badgeBg,
                          color: readerThemeStyle.accent,
                        }
                      : {
                          borderColor: readerThemeStyle.border,
                          color: readerThemeStyle.sub,
                        }
                  }
                  title="Tampilkan/sembunyikan Furigana"
                >
                  あ ルビ
                </button>
                {(
                  [
                    { id: "light", label: "和紙" },
                    { id: "sepia", label: "琥珀" },
                    { id: "dark", label: "墨" },
                  ] as const
                ).map((t) => {
                  const active = heroTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setHeroTheme(t.id)}
                      aria-pressed={active}
                      className="rounded-md border px-2.5 min-h-[32px] inline-flex items-center justify-center text-[10.5px] font-serif transition-colors cursor-pointer"
                      style={
                        active
                          ? {
                              borderColor: readerThemeStyle.accent,
                              backgroundColor: readerThemeStyle.badgeBg,
                              color: readerThemeStyle.accent,
                              fontWeight: 700,
                            }
                          : {
                              borderColor: "transparent",
                              color: readerThemeStyle.sub,
                              fontWeight: 600,
                            }
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bunkobon Excerpt Area with Tategaki Spine Margin */}
            <div
              className="p-5 border-b flex gap-4 items-stretch"
              style={{ borderColor: readerThemeStyle.border }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: readerThemeStyle.accent }}
                  >
                    Ketuk kata bergaris bawah untuk membedah morfologi:
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1"
                    style={{ background: readerThemeStyle.badgeBg, color: readerThemeStyle.sub }}
                  >
                    <Icon name="mine" size={11} /> {minedCount} kartu ditambang
                  </span>
                </div>

                <p lang="ja" className="text-[16.5px] leading-[2.2] font-serif select-none m-0">
                  「今日はとても
                  <button
                    type="button"
                    onClick={() => setSelectedTokenId("oishikatta")}
                    className={`mx-0.5 px-1.5 py-0.5 transition-colors cursor-pointer ${
                      selectedTokenId === "oishikatta"
                        ? "rounded-md bg-[var(--ai)] text-white font-bold no-underline shadow-xs"
                        : "underline decoration-2 decoration-dashed decoration-[var(--ai)]/70 underline-offset-4 hover:bg-[var(--ai)]/12 rounded-sm"
                    }`}
                  >
                    {heroFurigana ? (
                      <ruby>
                        美味<rt className="text-[9px]">おい</rt>しかった
                      </ruby>
                    ) : (
                      "美味しかった"
                    )}
                  </button>
                  よ！」と先生は言った。しかし昨日は野菜を
                  <button
                    type="button"
                    onClick={() => setSelectedTokenId("tabesaserarenakatta")}
                    className={`mx-0.5 px-1.5 py-0.5 transition-colors cursor-pointer ${
                      selectedTokenId === "tabesaserarenakatta"
                        ? "rounded-md bg-[var(--ai)] text-white font-bold no-underline shadow-xs"
                        : "underline decoration-2 decoration-dashed decoration-[var(--ai)]/70 underline-offset-4 hover:bg-[var(--ai)]/12 rounded-sm"
                    }`}
                  >
                    {heroFurigana ? (
                      <ruby>
                        食<rt className="text-[9px]">た</rt>べさせられなかった
                      </ruby>
                    ) : (
                      "食べさせられなかった"
                    )}
                  </button>
                  。学生たちは毎日熱心に
                  <button
                    type="button"
                    onClick={() => setSelectedTokenId("benkyoushiteiru")}
                    className={`mx-0.5 px-1.5 py-0.5 transition-colors cursor-pointer ${
                      selectedTokenId === "benkyoushiteiru"
                        ? "rounded-md bg-[var(--ai)] text-white font-bold no-underline shadow-xs"
                        : "underline decoration-2 decoration-dashed decoration-[var(--ai)]/70 underline-offset-4 hover:bg-[var(--ai)]/12 rounded-sm"
                    }`}
                  >
                    {heroFurigana ? (
                      <ruby>
                        勉強<rt className="text-[9px]">べんきょう</rt>している
                      </ruby>
                    ) : (
                      "勉強している"
                    )}
                  </button>
                  が、雨の日は散歩には
                  <button
                    type="button"
                    onClick={() => setSelectedTokenId("ikanakatta")}
                    className={`mx-0.5 px-1.5 py-0.5 transition-colors cursor-pointer ${
                      selectedTokenId === "ikanakatta"
                        ? "rounded-md bg-[var(--ai)] text-white font-bold no-underline shadow-xs"
                        : "underline decoration-2 decoration-dashed decoration-[var(--ai)]/70 underline-offset-4 hover:bg-[var(--ai)]/12 rounded-sm"
                    }`}
                  >
                    {heroFurigana ? (
                      <ruby>
                        行<rt className="text-[9px]">い</rt>かなかった
                      </ruby>
                    ) : (
                      "行かなかった"
                    )}
                  </button>
                  。
                </p>
              </div>

              {/* Traditional Tategaki Book Margin */}
              <div
                className="jp-tategaki-tag hidden sm:block"
                style={{
                  color: readerThemeStyle.sub,
                  borderLeftColor: readerThemeStyle.border,
                }}
              >
                第一章・文脈採掘の実演
              </div>
            </div>

            {/* Yomitan + Deinflection + Sub-deck Mining Inspector */}
            <div className="p-4 bg-[var(--tsuki)] text-[var(--tinta)]">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span lang="ja" className="text-xs font-bold text-[var(--ai)]">
                      {activeToken.reading}
                    </span>
                    <span className="rounded bg-[var(--kon)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--kon)]">
                      {activeToken.pos} • {activeToken.jlpt}
                    </span>
                    <span
                      lang="ja"
                      className="rounded border border-[var(--garis)] bg-[var(--panel)] px-1.5 py-0.5 text-[9.5px] font-mono text-[var(--tinta-2)]"
                      title="Pola Pitch Accent Bahasa Jepang"
                    >
                      高低: {activeToken.pitch}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <strong lang="ja" className="text-2xl font-serif font-bold text-[var(--tinta)]">
                      {activeToken.dictionaryForm}
                    </strong>
                    <button
                      type="button"
                      onClick={() => speakJapanese(activeToken.reading)}
                      title="Dengarkan pengucapan kata"
                      aria-label={`Dengarkan pengucapan ${activeToken.dictionaryForm}`}
                      className="min-w-[32px] min-h-[32px] grid place-items-center rounded-lg border border-[var(--garis)] bg-[var(--panel)] p-1.5 text-[var(--ai)] hover:bg-[var(--tsuki)] transition-colors cursor-pointer"
                    >
                      <Icon name="volume" size={14} />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--garis)] bg-[var(--tsuki)] px-2.5 py-1.5 text-right">
                  <div lang="ja" className="text-[11px] font-bold text-[var(--kon)]">
                    {activeToken.surface} → {activeToken.dictionaryForm}
                  </div>
                  <small className="block text-[9.5px] text-[var(--tinta-2)] mt-0.5">
                    {activeToken.reasons.join(" ← ")}
                  </small>
                </div>
              </div>

              <p className="text-xs text-[var(--tinta)] mb-2.5 font-medium">
                <strong>JMdict (CC BY-SA 4.0):</strong> {activeToken.meaning}
              </p>

              {/* Extracted Context Sentence Box */}
              <div className="rounded-xl border border-[var(--garis)] bg-[var(--panel)] p-2.5 mb-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--tinta-2)] mb-1">
                  <span>Kalimat Konteks Otomatis (Tag &lt;b&gt; Utuh)</span>
                  <button
                    type="button"
                    onClick={() => speakJapanese(activeToken.sentencePlain)}
                    className="min-h-[32px] px-2 -my-1 rounded-md text-[var(--ai)] hover:bg-[var(--tsuki)] hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Icon name="volume" size={12} /> Putar Kalimat
                  </button>
                </div>
                <p
                  lang="ja"
                  className="text-xs leading-relaxed text-[var(--tinta)] m-0 font-serif"
                  dangerouslySetInnerHTML={{ __html: activeToken.sentenceHtml }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10.5px] text-[var(--tinta-2)] flex items-center gap-1.5">
                  <Icon name="cards" size={13} /> Sub-deck Tujuan:{" "}
                  <strong className="text-[var(--kon)]">{activeToken.targetSubdeck}</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMinedMap((prev) => ({
                      ...prev,
                      [activeToken.id]: true,
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[36px] text-xs font-bold text-white transition-colors cursor-pointer ${
                    minedMap[activeToken.id]
                      ? "bg-[var(--ok)]"
                      : "bg-[var(--kon)] hover:bg-[var(--ai-tua)]"
                  }`}
                >
                  <Icon name={minedMap[activeToken.id] ? "check" : "plus"} size={14} />
                  {minedMap[activeToken.id]
                    ? "Tersimpan di Sub-deck N5"
                    : "Tambang ke Sub-deck N5"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVOLUSI SUB-DECK ANKI & SIMULASI UJIAN JLPT (INTERACTIVE SHOWCASE) */}
      <section id="subdeck-jlpt" className="landing-section" style={{ paddingTop: "32px", paddingBottom: "56px" }}>
        <div className="section-heading" style={{ marginBottom: "24px" }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>HIERARKI DECK &amp; EVALUASI STANDAR</p>
            <h2>Revolusi Sub-Deck Anki &amp; Simulasi Ujian JLPT N5–N1</h2>
          </div>
          <p className="text-xs text-[var(--tinta-2)] max-w-md">
            Tidak perlu bingung mengurutkan ribuan kartu. Buka deck untuk memunculkan sub-deck per level JLPT, lalu uji kesiapanmu lewat simulasi 3 bagian resmi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT CARD: Interactive Anki Sub-Deck Hierarchy Demo */}
          <div className="lg:col-span-7 jp-koushi-frame p-6">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4 pb-3 border-b border-[var(--garis)]">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--ai)]">
                  階層デッキ • MULTI-LEVEL ANKI TREE
                </span>
                <h3 className="text-lg font-serif font-bold text-[var(--tinta)] m-0 mt-0.5">
                  Tekan Deck Induk → Muncul Sub-Deck (N5–N1)
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                <span className="rounded bg-[#dbeafe] text-[#1d4ed8] px-2 py-0.5">Baru</span>
                <span className="rounded bg-[#fee2e2] text-[#b91c1c] px-2 py-0.5">Belajar</span>
                <span className="rounded bg-[#dcfce7] text-[#15803d] px-2 py-0.5">Ulas</span>
              </div>
            </div>

            {/* Interactive Parent Deck Row */}
            <div className="rounded-xl border border-[var(--garis)] bg-[var(--tsuki)] overflow-hidden">
              <button
                type="button"
                aria-expanded={demoParentOpen}
                aria-controls="demo-subdeck-rows"
                onClick={() => setDemoParentOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-[var(--kon)] text-white cursor-pointer transition-colors hover:bg-[var(--ai-tua)]"
              >
                <div className="flex items-center gap-2.5">
                  <Icon name={demoParentOpen ? "chevron-up" : "chevron-down"} size={15} />
                  <span lang="ja" className="w-7 h-7 rounded-md bg-white/15 grid place-items-center font-serif font-bold text-sm">
                    宙
                  </span>
                  <div>
                    <strong className="text-xs sm:text-sm font-serif block">
                      Philia Space ▸ Bahasa Indonesia
                    </strong>
                    <small className="text-[10px] text-white/80">
                      {demoParentOpen ? "Tekan untuk menutup cabang sub-deck" : "Tekan untuk membuka 6 sub-deck (N5–N1 & Core 10K)"}
                    </small>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-xs font-bold">
                  <span className="text-[#93c5fd]">40</span>
                  <span className="text-[#fca5a5]">18</span>
                  <span className="text-[#86efac]">258</span>
                </div>
              </button>

              {demoParentOpen ? (
                <div id="demo-subdeck-rows" className="divide-y divide-[var(--garis)] bg-[var(--panel)]">
                  {SUBDECK_DEMO_TREE.map((sub, i) => {
                    const isSelected = sub.id === selectedSubdeckId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedSubdeckId(sub.id)}
                        className={`w-full text-left flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-xs ${
                          isSelected ? "bg-[var(--tsuki)] font-semibold" : "hover:bg-[var(--tsuki)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pl-3">
                          <span className="font-mono text-[var(--tinta-2)] text-xs">
                            {i === SUBDECK_DEMO_TREE.length - 1 ? "└─" : "├─"}
                          </span>
                          <span
                            lang="ja"
                            className={`w-6 h-6 rounded text-[11px] font-serif font-bold grid place-items-center shrink-0 ${
                              isSelected ? "bg-[var(--ai)] text-white" : "bg-[var(--garis)] text-[var(--tinta)]"
                            }`}
                          >
                            {sub.kanji}
                          </span>
                          <span className="truncate text-[var(--tinta)]">{sub.title}</span>
                          <span className="rounded bg-[var(--garis)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--tinta)]">
                            {sub.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-2 font-mono text-xs font-bold">
                            <span className="text-[#1d4ed8] w-5 text-right">{sub.newCount}</span>
                            <span className={sub.learnCount > 0 ? "text-[#b91c1c] w-5 text-right" : "text-[var(--tinta-2)] w-5 text-right"}>
                              {sub.learnCount}
                            </span>
                            <span className={sub.dueCount > 0 ? "text-[#166534] w-7 text-right" : "text-[var(--tinta-2)] w-7 text-right"}>
                              {sub.dueCount}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div id="demo-subdeck-rows" className="px-4 py-3 text-xs text-[var(--tinta-2)] bg-[var(--panel)] flex items-center justify-between gap-2">
                  <span>Sub-deck disembunyikan — ukuran kartu tetap ringkas dan tidak menarik deck lain.</span>
                  <button
                    type="button"
                    onClick={() => setDemoParentOpen(true)}
                    className="min-h-[32px] px-2 font-bold text-[var(--ai)] hover:underline inline-flex items-center shrink-0 cursor-pointer"
                  >
                    Buka Sub-deck ▾
                  </button>
                </div>
              )}
            </div>

            {/* Selected Subdeck Quick Detail */}
            <div className="mt-3.5 rounded-xl border border-[var(--garis)] bg-[var(--tsuki)] p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--tinta-2)] block">
                  Sub-Deck Terpilih: {activeSubdeck.title} ({activeSubdeck.total} kartu)
                </span>
                <p lang="ja" className="text-xs font-serif text-[var(--tinta)] m-0 mt-0.5">
                  Contoh kosakata: <strong>{activeSubdeck.sample}</strong>
                </p>
              </div>
              <Button
                className="pg-primary"
                style={{ padding: "8px 14px", fontSize: "11px" }}
                onClick={() => navigate(user ? "/deck" : "/login")}
              >
                {user ? "Buka Koleksi Deck" : "Masuk untuk Buka Deck"} <Icon name="arrow" size={14} />
              </Button>
            </div>
          </div>

          {/* RIGHT CARD: Authentic JLPT Practice Exam Preview */}
          <div className="lg:col-span-5 jp-koushi-frame p-6">
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--garis)]">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--kon)]">
                  模擬試験 • SIMULASI UJIAN JLPT
                </span>
                <h3 className="text-lg font-serif font-bold text-[var(--tinta)] m-0 mt-0.5">
                  Struktur 3 Bagian &amp; Mondai Interaktif
                </h3>
              </div>
              <span lang="ja" className="jp-hanko text-[10px]">
                N5–N1
              </span>
            </div>

            {/* 3 Section Pills */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              {[
                { sec: "Bagian 1", jp: "文字・語彙", sub: "Kosakata & Kanji" },
                { sec: "Bagian 2", jp: "文法・読解", sub: "Tata Bahasa" },
                { sec: "Bagian 3", jp: "聴解", sub: "Mendengarkan" },
              ].map((part) => (
                <div
                  key={part.sec}
                  className="rounded-lg border border-[var(--garis)] bg-[var(--tsuki)] p-2"
                >
                  <small className="block text-[9px] font-bold uppercase text-[var(--tinta-2)]">
                    {part.sec}
                  </small>
                  <strong lang="ja" className="font-serif text-xs text-[var(--kon)] block">
                    {part.jp}
                  </strong>
                  <span className="text-[9.5px] text-[var(--tinta-2)]">{part.sub}</span>
                </div>
              ))}
            </div>

            {/* Interactive Mini Mondai Question */}
            <div className="rounded-xl border border-[var(--garis)] bg-[var(--panel)] p-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--tinta-2)] mb-2">
                <span>CONTOH SOAL • JLPT N5 (G3 PARTIKEL)</span>
                <span lang="ja" className="text-[var(--ai)]">問題 1</span>
              </div>
              <p lang="ja" className="text-base font-serif font-semibold text-[var(--tinta)] mb-3">
                毎朝、新鮮な水（　★　）飲みます。
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(["を", "に", "で", "へ"] as const).map((opt, idx) => {
                  const isPicked = demoExamChoice === idx;
                  const isRight = idx === 0;
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={isPicked}
                      onClick={() => setDemoExamChoice(idx)}
                      className={`rounded-lg border py-2 min-h-[36px] font-serif font-bold text-sm transition-colors cursor-pointer ${
                        isPicked
                          ? isRight
                            ? "border-[var(--ok)] bg-[var(--ok)]/10 text-[var(--ok)]"
                            : "border-[var(--shu)] bg-[var(--shu)]/10 text-[var(--shu)]"
                          : "border-[var(--garis)] bg-[var(--tsuki)] text-[var(--tinta)] hover:border-[var(--kon)]"
                      }`}
                    >
                      {idx + 1}. {opt}
                    </button>
                  );
                })}
              </div>

              {demoExamChoice !== null && (
                <div className="mt-3 pt-2.5 border-t border-[var(--garis)] text-[11px] text-[var(--tinta)]">
                  {demoExamChoice === 0 ? (
                    <span className="text-[var(--ok)] font-bold inline-flex items-center gap-1.5">
                      <Icon name="check" size={13} className="shrink-0" />
                      <span>Benar! Partikel 「を」 menandai objek langsung dari kata kerja transitif 飲みます.</span>
                    </span>
                  ) : (
                    <span className="text-[var(--kon)] font-bold inline-flex items-center gap-1.5">
                      <Icon name="close" size={13} className="shrink-0 text-[var(--shu)]" />
                      <span>Kurang tepat. Jawaban yang benar adalah 1 (を) sebagai penanda objek langsung.</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--tinta-2)]">
                15 paket ujian lengkap (N5–N1) dengan timer per bagian.
              </span>
              <Button
                className="outline-button"
                style={{ padding: "8px 14px", fontSize: "11px" }}
                onClick={() => navigate(user ? "/exam" : "/login")}
              >
                {user ? "Halaman Ujian" : "Masuk untuk Ujian Penuh"} <Icon name="arrow" size={14} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FEATURE EXPLORER (4 TAB MENDALAM) */}
      <section id="eksplorer" className="landing-section" style={{ paddingTop: "32px", paddingBottom: "56px" }}>
        <div className="section-heading" style={{ marginBottom: "24px" }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>BEDAH FITUR INTERAKTIF</p>
            <h2>Bagaimana setiap modul 語楽 bekerja untukmu?</h2>
          </div>
          <p className="text-xs text-[var(--tinta-2)] max-w-md">
            Pilih salah satu dari empat modul inti di bawah untuk melihat spesifikasi teknis dan simulasi interaktifnya.
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          role="tablist"
          aria-label="4 Modul Inti GoRaku"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6"
        >
          {FEATURE_TABS.map((tab) => {
            const isOn = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isOn}
                aria-controls="explorer-tabpanel"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  isOn
                    ? "border-[var(--kon)] bg-[var(--kon)] text-white shadow-md"
                    : "border-[var(--garis)] bg-[var(--panel)] text-[var(--tinta)] hover:border-[var(--ai)]"
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                    isOn ? "bg-white/15 text-white" : "bg-[var(--tsuki)] text-[var(--ai)]"
                  }`}
                >
                  <Icon name={tab.icon} size={18} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-xs truncate">{tab.label}</strong>
                  <small
                    lang="ja"
                    className={`block text-[10px] truncate mt-0.5 ${
                      isOn ? "text-[var(--mizu)]" : "text-[var(--tinta-2)]"
                    }`}
                  >
                    {tab.jpSub} • {tab.badge}
                  </small>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Tab Content Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            id="explorer-tabpanel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="jp-koushi-frame p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-full bg-[var(--tsuki)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ai)]">
                  {activeTab.badge}
                </span>
                <span lang="ja" className="text-xs font-serif text-[var(--tinta-2)]">
                  〔 {activeTab.jpSub} 〕
                </span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[var(--tinta)] leading-snug">
                {activeTab.title}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--tinta-2)] leading-relaxed">
                {activeTab.description}
              </p>
              <ul className="space-y-2.5 pt-1">
                {activeTab.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[var(--tinta)]">
                    <span className="w-5 h-5 rounded-full bg-[var(--kon)] text-white grid place-items-center shrink-0 mt-0.5">
                      <Icon name="check" size={12} />
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Button
                  className="pg-primary"
                  onClick={() => navigate(user ? "/beranda" : "/login")}
                >
                  {user ? "Buka Fitur di Dashboard" : "Masuk untuk Mencoba Fitur"} <Icon name="arrow" size={16} />
                </Button>
              </div>
            </div>

            {/* Interactive Visual Preview per Tab */}
            <div className="lg:col-span-5 rounded-2xl border border-[var(--garis)] bg-[var(--tsuki)] p-5">
              {activeTab.id === "reader" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[var(--kon)]">
                      Pratinjau Mode Teks Pembaca
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        aria-pressed={previewWritingMode === "horizontal-tb"}
                        onClick={() => setPreviewWritingMode("horizontal-tb")}
                        className={`rounded-md px-2.5 min-h-[32px] inline-flex items-center text-[10px] font-bold transition-colors cursor-pointer ${
                          previewWritingMode === "horizontal-tb"
                            ? "bg-[var(--kon)] text-white"
                            : "bg-[var(--panel)] text-[var(--tinta)] border border-[var(--garis)]"
                        }`}
                      >
                        横書き (Yokogaki)
                      </button>
                      <button
                        type="button"
                        aria-pressed={previewWritingMode === "vertical-rl"}
                        onClick={() => setPreviewWritingMode("vertical-rl")}
                        className={`rounded-md px-2.5 min-h-[32px] inline-flex items-center text-[10px] font-bold transition-colors cursor-pointer ${
                          previewWritingMode === "vertical-rl"
                            ? "bg-[var(--kon)] text-white"
                            : "bg-[var(--panel)] text-[var(--tinta)] border border-[var(--garis)]"
                        }`}
                      >
                        縦書き (Tategaki)
                      </button>
                    </div>
                  </div>
                  <div
                    lang="ja"
                    className="rounded-xl border border-[var(--garis)] bg-[var(--panel)] p-4 font-serif text-base leading-loose min-h-[160px] flex items-center justify-center"
                    style={{
                      writingMode: previewWritingMode,
                      maxHeight: "200px",
                    }}
                  >
                    <p className="m-0">
                      <ruby>
                        吾輩<rt>わがはい</rt>
                      </ruby>
                      は
                      <ruby>
                        猫<rt>ねこ</rt>
                      </ruby>
                      である。
                      <ruby>
                        名前<rt>なまえ</rt>
                      </ruby>
                      はまだ
                      <ruby>
                        無<rt>な</rt>
                      </ruby>
                      い。どこで
                      <ruby>
                        生<rt>う</rt>
                      </ruby>
                      まれたかとんと
                      <ruby>
                        見当<rt>けんとう</rt>
                      </ruby>
                      がつかぬ。
                    </p>
                  </div>
                  <p className="text-[11px] text-[var(--tinta-2)]">
                    Tag <code>&lt;rt&gt;</code> furigana otomatis diabaikan saat pemindaian kamus agar kata dasar kanji tetap ditemukan secara presisi.
                  </p>
                </div>
              )}

              {activeTab.id === "dictionary" && (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-[var(--kon)]">
                    Alur Deinflection &amp; Lookup Tunggal
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { step: "Input Klik di Novel", val: "食べさせられなかった", note: "10 karakter" },
                      { step: "1. Kupas Negatif Lampau", val: "食べさせられる", note: "-なかった → -る" },
                      { step: "2. Kupas Pasif/Potensial", val: "食べさせる", note: "-られる → -る" },
                      { step: "3. Kupas Kausatif & Validasi v1", val: "食べる 【たべる】", note: "Cocok di JMdict!" },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-[var(--garis)] bg-[var(--panel)] px-3 py-2"
                      >
                        <div>
                          <span className="text-[10px] text-[var(--tinta-2)] block">{row.step}</span>
                          <strong lang="ja" className="font-serif text-sm text-[var(--tinta)]">
                            {row.val}
                          </strong>
                        </div>
                        <span className="rounded bg-[var(--tsuki)] px-2 py-0.5 text-[10px] font-bold text-[var(--ai)]">
                          {row.note}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab.id === "mining" && (
                <div className="space-y-3 text-xs">
                  <div className="text-[11px] font-bold text-[var(--kon)]">
                    Perbandingan Ekstraksi Kalimat Dialog
                  </div>
                  <div className="rounded-xl border border-[var(--shu)]/30 bg-[var(--shu)]/10 p-3">
                    <span className="text-[10px] font-bold text-[var(--shu)] uppercase inline-flex items-center gap-1 mb-1">
                      <Icon name="close" size={12} /> Pemisah Titik/Tanda Seru Biasa (Terpotong)
                    </span>
                    <p lang="ja" className="text-xs text-[var(--tinta)] m-0">
                      「本当に<b>信じられない</b>！
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 p-3">
                    <span className="text-[10px] font-bold text-[var(--ok)] uppercase inline-flex items-center gap-1 mb-1">
                      <Icon name="check" size={12} /> Ekstraktor Kontekstual 語楽 (Utuh dengan Atribusi)
                    </span>
                    <p lang="ja" className="text-xs text-[var(--tinta)] m-0">
                      「本当に<b>信じられない</b>！」と彼女は驚いた声で言った。
                    </p>
                  </div>
                  <p className="text-[11px] text-[var(--tinta-2)]">
                    Pelacak kedalaman tanda kutip <code>「」</code> dan <code>『』</code> memastikan kalimat dialog beserta klausa penutupnya tidak terpotong di tengah.
                  </p>
                </div>
              )}

              {activeTab.id === "srs" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[var(--kon)]">
                      Simulasi Kartu Review SRS
                    </span>
                    <button
                      type="button"
                      onClick={() => setDemoCardFlipped((v) => !v)}
                      className="rounded-lg bg-[var(--kon)] px-3 min-h-[32px] inline-flex items-center text-[10.5px] font-bold text-white hover:bg-[var(--ai-tua)] transition-colors cursor-pointer"
                    >
                      {demoCardFlipped ? "Lihat Depan" : "Balik Kartu (Spasi)"}
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-pressed={demoCardFlipped}
                    onClick={() => setDemoCardFlipped((v) => !v)}
                    className="w-full rounded-xl border border-[var(--garis)] bg-[var(--panel)] p-5 text-center cursor-pointer shadow-xs min-h-[165px] flex flex-col justify-center items-center hover:border-[var(--ai)] transition-colors"
                  >
                    <small lang="ja" className="text-xs text-[var(--ai)] font-bold">
                      {demoCardFlipped ? "じゅみょう • Sub-deck N3" : "Klik untuk membuka jawaban"}
                    </small>
                    <strong lang="ja" className="text-3xl font-serif my-1 text-[var(--tinta)]">
                      寿命
                    </strong>
                    {demoCardFlipped && (
                      <div className="mt-2 pt-2 border-t border-[var(--garis)] text-xs space-y-1 w-full">
                        <p className="font-bold text-[var(--kon)]">umur; masa hidup (lifespan)</p>
                        <p lang="ja" className="text-[var(--tinta-2)]">
                          人間の<b>寿命</b>は短いんだね。
                        </p>
                      </div>
                    )}
                  </button>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                    <div className="rounded-lg bg-[var(--shu)]/10 py-1.5 text-[var(--shu)]">1 • Lupa</div>
                    <div className="rounded-lg bg-[#D49B27]/15 py-1.5 text-[#7c4d09]">2 • Sulit</div>
                    <div className="rounded-lg bg-[var(--ok)]/10 py-1.5 text-[var(--ok)]">3 • Baik</div>
                    <div className="rounded-lg bg-[var(--tsuki)] py-1.5 text-[var(--ai)]">4 • Mudah</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* 6 PILAR KEUNGGULAN SISTEM */}
      <section id="fitur" className="landing-section" style={{ paddingTop: "28px" }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>ARSITEKTUR &amp; FILOSOFI DESAIN</p>
            <h2>6 Pilar Utama 語楽 (GORAKU)</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-7">
          {PILLAR_CARDS.map((card) => (
            <article key={card.title} className="landing-card flex flex-col justify-between">
              {/* Subtle Japanese Kanji Watermark */}
              <span
                lang="ja"
                aria-hidden="true"
                className="pointer-events-none select-none absolute -right-2 -top-3 font-serif text-[72px] font-bold leading-none text-[var(--kon)]/[0.045]"
              >
                {card.kanjiWatermark}
              </span>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-[var(--tsuki)] text-[var(--ai)] grid place-items-center">
                    <Icon name={card.icon} size={20} />
                  </span>
                  <div className="text-right">
                    <span className="block text-[9.5px] font-bold tracking-wider uppercase text-[var(--ai)]">
                      {card.tag}
                    </span>
                    <small lang="ja" className="text-[10px] font-serif text-[var(--tinta-2)]">
                      {card.jpTag}
                    </small>
                  </div>
                </div>
                <h3 className="text-base font-serif font-bold mb-2">{card.title}</h3>
                <p className="text-xs text-[var(--tinta-2)] leading-relaxed mb-4">{card.desc}</p>
              </div>
              <div className="relative z-10 flex flex-wrap gap-1.5 pt-3 border-t border-[var(--garis)]">
                {card.highlights.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--tsuki)] px-2 py-0.5 text-[10px] font-semibold text-[var(--tinta-2)]"
                  >
                    <Icon name="check" size={11} className="text-[var(--ai)] shrink-0" />
                    <span>{h}</span>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 伍 • ALUR KERJA 4 LANGKAH IMMERSION */}
      <section id="cara-kerja" className="landing-section landing-dark">
        <div className="section-heading light">
          <div>
            <p className="eyebrow light">学習の道筋 • ALUR BELAJAR END-TO-END</p>
            <h2>4 Langkah Menguasai Bahasa Jepang dari Karya Asli</h2>
          </div>
          <span lang="ja" className="hidden md:inline-block font-serif text-sm text-white/60 tracking-widest">
            継続は力なり — Konsistensi adalah kekuatan
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          <div className="step">
            <span lang="ja" className="step-num">壱</span>
            <h3>Impor Kamus &amp; Sub-Deck</h3>
            <p>
              Unggah kamus ZIP Yomitan (JMdict) atau tarik paket Anki <code>.apkg</code> untuk dipartisi otomatis menjadi sub-deck N5–N1.
            </p>
          </div>
          <div className="step">
            <span lang="ja" className="step-num">弐</span>
            <h3>Baca Novel &amp; Manga</h3>
            <p>
              Buka berkas EPUB, TXT, atau CBZ di Perpustakaan dengan dukungan furigana, tema Washi, dan pemindaian OCR vertikal.
            </p>
          </div>
          <div className="step">
            <span lang="ja" className="step-num">参</span>
            <h3>Klik Kata &amp; Tambang</h3>
            <p>
              Klik kata yang belum dikenal. Lihat arti kamus + deinflection, lalu tambahkan ke sub-deck lengkap dengan kalimat aslinya.
            </p>
          </div>
          <div className="step">
            <span lang="ja" className="step-num">肆</span>
            <h3>Review SRS &amp; Ujian JLPT</h3>
            <p>
              Ulas kartu jatuh tempo setiap hari per sub-deck dan ukur kemampuanmu pada halaman simulasi ujian JLPT N5–N1.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ INTERAKTIF (ACCORDION) */}
      <section id="faq" className="landing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>PERTANYAAN UMUM</p>
            <h2>Tanya Jawab Seputar 語楽</h2>
          </div>
        </div>
        <div className="space-y-3 mt-6 max-w-3xl mx-auto">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[var(--garis)] bg-[var(--panel)] overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-serif font-bold text-sm text-[var(--tinta)] hover:bg-[var(--tsuki)] transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span className="text-[var(--ai)] text-base font-sans shrink-0" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    className="px-5 pb-4 text-xs text-[var(--tinta-2)] leading-relaxed border-t border-[var(--garis)] pt-3"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-14 rounded-2xl border border-[var(--ai)] bg-[var(--kon)] p-8 sm:p-10 text-center text-white shadow-xl relative overflow-hidden">
          <p className="eyebrow light">一歩ずつ、確実に • MULAI PERJALANAN IMMERSION-MU</p>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mt-1 mb-3 text-white">
            Siap membangun ruang belajar bahasa Jepang pribadimu di 語楽?
          </h2>
          <p className="text-xs sm:text-sm text-[var(--mizu)] max-w-xl mx-auto mb-6">
            Langsung masuk ke dashboard, pilih sub-deck N5–N1 pada <em>Philia Space</em>, baca novel contoh <em>吾輩は猫である</em>, atau mulai simulasi ujian JLPT sekarang.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to={user ? "/beranda" : "/login"}
              className="primary-light no-underline"
              style={{ padding: "12px 22px", fontSize: "13px" }}
            >
              {user ? "Buka Dashboard 語楽" : "Masuk & Mulai Belajar"}
            </Link>
            {user ? (
              <Link
                to="/deck"
                className="outline-button no-underline"
                style={{
                  padding: "12px 18px",
                  fontSize: "12.5px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  borderColor: "rgba(188,214,226,0.35)",
                }}
              >
                <Icon name="cards" size={16} /> Jelajahi Sub-Deck
              </Link>
            ) : (
              <a
                href="#subdeck-jlpt"
                className="outline-button no-underline"
                style={{
                  padding: "12px 18px",
                  fontSize: "12.5px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  borderColor: "rgba(188,214,226,0.35)",
                }}
              >
                <Icon name="cards" size={16} /> Lihat Hierarki Sub-Deck
              </a>
            )}
          </div>
        </div>
      </section>
      </main>

      {/* FOOTER — Minimalist Japanese Editorial Colophon */}
      <footer className="landing-footer">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand" style={{ padding: 0 }}>
              <span className="brand-mark">語</span>
              <span className="brand-copy">
                <strong>語楽</strong>
                <small>GORAKU</small>
              </span>
            </div>
            <span className="jp-hanko text-[9.5px]">純国産ローカル</span>
          </div>

          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap justify-center text-xs">
            <Link to="/beranda" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Dashboard</Link>
            <Link to="/deck" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Koleksi Deck</Link>
            <Link to="/library" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Perpustakaan</Link>
            <Link to="/mining" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Sentence Mining</Link>
            <Link to="/exam" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Ujian JLPT</Link>
            <Link to="/license" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Atribusi &amp; Lisensi</Link>
          </div>

          <p className="m-0 text-[11px] text-[var(--tinta-2)]">
            © 2026 語楽 (GORAKU) —千里の道も一歩から。
          </p>
        </div>
      </footer>
    </div>
  );
}
