import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, Button, type IconName } from "../ui";
import { speakJapanese } from "../lib/tts";
import { useAppStore } from "../store/useAppStore";
import { DyeTile } from "../ui";
import { jlptDyeStep } from "../lib/dye";

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
    badge: "Skema Yomitan v3 • Lokal",
    title: "Pencarian substring terpanjang & deinflection kata berkonjugasi secara lokal",
    description:
      "Impor kamus ZIP berformat Yomitan (JMdict atau Jitendex) via Web Worker bertahap dengan tombol batal dan prioritas multi-kamus di browser.",
    bullets: [
      "Mengurai konjugasi Ichidan, Godan, Adj-i, Suru, dan Kuru beserta validasi tag aturan (v1/v5/adj-i)",
      "Normalisasi bacaan Katakana ke Hiragana otomatis dengan pengelompokan arti & atribusi CC BY-SA 4.0",
      "Pencarian global instan kapan saja lewat Command Palette (Ctrl+K / ⌘K)",
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
    title: "Impor paket .apkg lengkap dengan hierarki Sub-Deck N5–N1 dan media offline",
    description:
      "Tarik berkas .apkg (Philia Space atau Core 10K) via SQLite WASM. Sistem mempartisi struktur bertingkat (::) beserta media audio dan gambar offline di IndexedDB.",
    bullets: [
      "Mendukung format paket Anki .anki2 maupun modern .anki21b / Zstandard beserta ekspor CSV/JSON",
      "Hierarki Sub-Deck interaktif dengan penghitung 3-angka: Baru (新), Belajar (習), Ulas (復)",
      "Sesi review FSRS lewat pintasan keyboard (Spasi & 1–4), Undo (Ctrl+Z), dan toggle Furigana",
    ],
  },
] as const;

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

const NAV_PILL_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.78,
};

function LandingNav({ loggedIn }: { loggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string>(NAV_LINKS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const targetLockRef = useRef<{ id: string; until: number } | null>(null);
  const location = useLocation();

  // Keadaan "scrolled" setelah > 24px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy deterministik dengan lock singkat saat loncat anchor agar pill meluncur mulus sekali jalan
  useEffect(() => {
    let rafId = 0;

    const clearLockIfManual = () => {
      targetLockRef.current = null;
    };

    const updateActive = () => {
      rafId = 0;
      const lock = targetLockRef.current;
      if (lock) {
        const now = performance.now();
        const targetEl = document.getElementById(lock.id);
        const atBottom =
          lock.id === NAV_LINKS[NAV_LINKS.length - 1].id &&
          window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 24;
        const settledAtTarget =
          lock.id === NAV_LINKS[0].id
            ? window.scrollY <= 12
            : atBottom ||
              (targetEl !== null &&
                Math.abs(targetEl.getBoundingClientRect().top - 96) <= 14);

        if (settledAtTarget || now >= lock.until) {
          targetLockRef.current = null;
        } else {
          setActiveId(lock.id);
          return;
        }
      }

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
    window.addEventListener("wheel", clearLockIfManual, { passive: true });
    window.addEventListener("touchmove", clearLockIfManual, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("wheel", clearLockIfManual);
      window.removeEventListener("touchmove", clearLockIfManual);
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
      targetLockRef.current = { id, until: performance.now() + 900 };
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
      <a
        href="#simulasi"
        className="lnav-brand"
        aria-label="GoRaku, kembali ke atas"
        onClick={() => {
          targetLockRef.current = {
            id: NAV_LINKS[0].id,
            until: performance.now() + 900,
          };
          setActiveId(NAV_LINKS[0].id);
          setMenuOpen(false);
        }}
      >
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
            {activeId === l.id && (
              <motion.span
                layoutId="lnav-desktop-pill"
                className="lnav-active-bg"
                style={{ borderRadius: "var(--r-pill)" }}
                transition={NAV_PILL_SPRING}
                aria-hidden="true"
              />
            )}
            <span className="lnav-link-text">{l.label}</span>
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
        {NAV_LINKS.map((l, idx) => (
          <a
            key={l.id}
            {...linkProps(l.id)}
            tabIndex={menuOpen ? undefined : -1}
            style={{ "--lnav-i": idx } as React.CSSProperties}
          >
            {activeId === l.id && (
              <motion.span
                layoutId="lnav-mobile-pill"
                className="lnav-active-bg"
                style={{ borderRadius: "var(--r-pill)" }}
                transition={NAV_PILL_SPRING}
                aria-hidden="true"
              />
            )}
            <span className="lnav-link-text">{l.label}</span>
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
    <div className="landing landing-v2 washi">
      {/* NAVIGASI ATAS — Floating Pill (Aizome) */}
      <LandingNav loggedIn={!!user} />

      <main id="main-content">
      {/* 壱 • HERO SECTION — Editorial Split + Panel Kain & Bunkobon Live Simulator */}
      <section id="simulasi" className="landing-hero landing-hero-v2">
        <div className="landing-hero-copy flex flex-col justify-center">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <p lang="ja" className="landing-tategaki-lead m-0">
              言葉に出会い、文脈ごと記憶する。
            </p>

            <div className="min-w-0 flex-1">
              <h1>
                Baca karya asli Jepang, klik satu kata,{" "}
                <span>tambahkan ke dalam ingatan.</span>
              </h1>

              <p className="welcome-copy">
                <strong>語楽 (GORAKU)</strong> menyatukan pembaca novel EPUB/TXT &amp; manga OCR, kamus offline Yomitan dengan deinflection, hierarki sub-deck Anki (<code>.apkg</code>) N5–N1, serta latihan ujian JLPT dalam satu ruang kerja berbasis kertas <em>Washi</em> yang berjalan lokal di perangkat Anda.
              </p>

              <div className="landing-cta flex items-center gap-5 flex-wrap mt-6">
                <Link
                  to={user ? "/beranda" : "/login"}
                  className="primary-light no-underline"
                  style={{ padding: "var(--sp-3) var(--sp-5)", fontSize: "var(--fs-16)" }}
                >
                  {user ? "Lanjutkan di Dashboard" : "Mulai Belajar Sekarang"}
                </Link>
                <a
                  href="#eksplorer"
                  className="inline-flex items-center gap-1.5 text-base font-semibold text-[var(--kon)] hover:text-[var(--ai)] underline underline-offset-4 py-2"
                >
                  Lihat cara kerjanya <Icon name="arrow" size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PANEL KAIN (BOKASHI + SEIGAIHA) & BUNKOBON LIVE SIMULATOR */}
        <div className="landing-fabric-panel w-full" data-glyph="読">
          <div className="landing-fabric-panel__seigaiha motif-seigaiha" aria-hidden="true" />
          <div
            className="landing-bunko-overlap rounded-[var(--r-box)] border shadow-xl overflow-hidden transition-colors"
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
                  className="rounded border px-2 py-0.5 text-xs font-serif font-bold shrink-0"
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
                  className="rounded-md border px-2.5 min-h-[32px] inline-flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
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
                      className="rounded-md border px-2.5 min-h-[32px] inline-flex items-center justify-center text-xs font-serif transition-colors cursor-pointer"
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
              className="p-4 border-b flex gap-4 items-stretch"
              style={{ borderColor: readerThemeStyle.border }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span
                    className="text-xs font-bold uppercase tracking-[0.06em]"
                    style={{ color: readerThemeStyle.accent }}
                  >
                    Ketuk kata bergaris bawah untuk membedah morfologi:
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1"
                    style={{ background: readerThemeStyle.badgeBg, color: readerThemeStyle.sub }}
                  >
                    <Icon name="mine" size={12} /> {minedCount} kartu ditambang
                  </span>
                </div>

                <p lang="ja" className="text-base leading-[2.1] font-serif select-none m-0">
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
                        美味<rt className="text-xs">おい</rt>しかった
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
                        食<rt className="text-xs">た</rt>べさせられなかった
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
                        勉強<rt className="text-xs">べんきょう</rt>している
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
                        行<rt className="text-xs">い</rt>かなかった
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
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span lang="ja" className="text-xs font-bold text-[var(--ai)]">
                      {activeToken.reading}
                    </span>
                    <span className="rounded bg-[var(--kon)]/10 px-2 py-0.5 text-xs font-bold text-[var(--kon)]">
                      {activeToken.pos} • {activeToken.jlpt}
                    </span>
                    <span
                      lang="ja"
                      className="rounded border border-[var(--garis)] bg-[var(--panel)] px-1.5 py-0.5 text-xs font-mono text-[var(--tinta-2)]"
                      title="Pola Pitch Accent Bahasa Jepang"
                    >
                      高低: {activeToken.pitch}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <strong lang="ja" className="text-base font-serif font-bold text-[var(--kon)]">
                      {activeToken.dictionaryForm}
                    </strong>
                    <button
                      type="button"
                      onClick={() => speakJapanese(activeToken.reading)}
                      title="Dengarkan pengucapan kata"
                      aria-label={`Dengarkan pengucapan ${activeToken.dictionaryForm}`}
                      className="min-w-[32px] min-h-[32px] grid place-items-center rounded-[var(--r-sm)] border border-[var(--garis)] bg-[var(--panel)] p-1.5 text-[var(--ai)] hover:bg-[var(--tsuki)] transition-colors cursor-pointer"
                    >
                      <Icon name="volume" size={14} />
                    </button>
                  </div>
                </div>

                <div className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] px-2.5 py-1.5 text-right">
                  <div lang="ja" className="text-xs font-bold text-[var(--kon)]">
                    {activeToken.surface} → {activeToken.dictionaryForm}
                  </div>
                  <small className="block text-xs text-[var(--tinta-2)] mt-0.5">
                    {activeToken.reasons.join(" ← ")}
                  </small>
                </div>
              </div>

              <p className="text-base text-[var(--tinta)] mb-2 font-medium leading-snug">
                <strong>JMdict (CC BY-SA 4.0):</strong> {activeToken.meaning}
              </p>

              {/* Extracted Context Sentence Box */}
              <div className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] p-2.5 mb-2.5">
                <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--tinta-2)] mb-1">
                  <span>Kalimat Konteks Otomatis (Tag &lt;b&gt; Utuh)</span>
                  <button
                    type="button"
                    onClick={() => speakJapanese(activeToken.sentencePlain)}
                    className="min-h-[32px] px-2 -my-1 rounded-[var(--r-sm)] text-xs font-bold text-[var(--ai)] hover:bg-[var(--tsuki)] hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 normal-case"
                  >
                    <Icon name="volume" size={12} /> Putar Kalimat
                  </button>
                </div>
                <p
                  lang="ja"
                  className="text-base leading-relaxed text-[var(--tinta)] m-0 font-serif"
                  dangerouslySetInnerHTML={{ __html: activeToken.sentenceHtml }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-[var(--tinta-2)] flex items-center gap-1.5">
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
                  className={`inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-3.5 py-2 min-h-[36px] text-base font-bold text-white transition-colors cursor-pointer ${
                    minedMap[activeToken.id]
                      ? "bg-[var(--ai-tua)]"
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

      {/* REVOLUSI SUB-DECK ANKI & LATIHAN UJIAN JLPT (INTERACTIVE SHOWCASE) */}
      <section id="subdeck-jlpt" className="landing-section">
        {/* Pita JLPT Bokashi + Seigaiha */}
        <div className="landing-jlpt-ribbon mb-5">
          <div className="landing-jlpt-ribbon__seigaiha motif-seigaiha" aria-hidden="true" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-bold tracking-[0.06em] uppercase text-[var(--mizu)] m-0 mb-1">
                階層デッキ • HIERARKI DECK &amp; LATIHAN BERJENJANG
              </p>
              <h2 className="text-2xl font-serif font-bold text-white m-0 mb-1.5">
                Sub-Deck Anki N5–N1 &amp; Latihan Ujian Berjenjang
              </h2>
              <p className="text-sm text-white/90 m-0 leading-relaxed">
                Buka deck induk untuk memunculkan sub-deck per tingkat JLPT. Seluruh paket soal di bawah adalah <strong>latihan orisinal, bukan soal resmi JLPT</strong>, disusun mengikuti tiga bagian evaluasi bertahap.
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2 shrink-0">
              {(["N5", "N4", "N3", "N2", "N1"] as const).map((lvl) => (
                <div
                  key={lvl}
                  className="flex flex-col items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 backdrop-blur-xs"
                >
                  <DyeTile step={jlptDyeStep(lvl)} glyph={lvl} size={32} />
                  <span className="text-xs font-mono font-semibold text-white/90">
                    {lvl === "N5" ? "Dasar" : lvl === "N4" ? "Pemula" : lvl === "N3" ? "Menengah" : lvl === "N2" ? "Lanjut" : "Mahir"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT CARD: Interactive Anki Sub-Deck Hierarchy Demo */}
          <div className="lg:col-span-7 jp-koushi-frame p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3 pb-2.5 border-b border-[var(--garis)]">
              <div>
                <span className="text-xs font-bold tracking-[0.06em] uppercase text-[var(--ai)]">
                  階層デッキ • MULTI-LEVEL ANKI TREE
                </span>
                <h3 className="text-sm font-serif font-bold text-[var(--kon)] m-0 mt-0.5">
                  Tekan Deck Induk → Muncul Sub-Deck (N5–N1)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[var(--kon)] font-semibold">新 Baru</span>
                <span className="text-[var(--ai-tua)] font-semibold">習 Belajar</span>
                <span className="text-[var(--ai)] font-semibold">復 Ulas</span>
              </div>
            </div>

            {/* Interactive Parent Deck Row */}
            <div className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--tsuki)] overflow-hidden">
              <button
                type="button"
                aria-expanded={demoParentOpen}
                aria-controls="demo-subdeck-rows"
                onClick={() => setDemoParentOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left bg-[var(--kon)] text-white cursor-pointer transition-colors hover:bg-[var(--ai-tua)]"
              >
                <div className="flex items-center gap-2.5">
                  <Icon name={demoParentOpen ? "chevron-up" : "chevron-down"} size={15} />
                  <span lang="ja" className="w-7 h-7 rounded bg-white/15 grid place-items-center font-serif font-bold text-sm">
                    宙
                  </span>
                  <div>
                    <strong className="text-sm font-serif block">
                      Philia Space ▸ Bahasa Indonesia
                    </strong>
                    <small className="text-xs text-white/85">
                      {demoParentOpen ? "Tekan untuk menutup cabang sub-deck" : "Tekan untuk membuka 6 sub-deck (N5–N1 & Core 10K)"}
                    </small>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
                  <span className="text-white/90">新 40</span>
                  <span className="text-white/85">習 18</span>
                  <span className="text-[var(--mizu)] font-bold">復 258</span>
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
                        className={`w-full text-left flex items-center justify-between px-3.5 py-1.5 cursor-pointer transition-colors text-sm ${
                          isSelected ? "bg-[var(--tsuki)] font-semibold" : "hover:bg-[var(--tsuki)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pl-1">
                          <span className="font-mono text-[var(--teks-redup)] text-xs">
                            {i === SUBDECK_DEMO_TREE.length - 1 ? "└─" : "├─"}
                          </span>
                          <DyeTile step={jlptDyeStep(sub.code)} glyph={sub.kanji} size={24} className="dye-tile-mini" />
                          <span className="truncate text-[var(--tinta)]">{sub.title}</span>
                          <span className="rounded border border-[var(--garis)] bg-[var(--kertas-2)] px-1.5 py-0.5 text-xs font-bold text-[var(--kon)]">
                            {sub.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs">
                          <span className={sub.newCount > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}>
                            新 {sub.newCount}
                          </span>
                          <span className={sub.learnCount > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}>
                            習 {sub.learnCount}
                          </span>
                          <span className={sub.dueCount > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}>
                            復 {sub.dueCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div id="demo-subdeck-rows" className="px-3.5 py-2.5 text-sm text-[var(--tinta-2)] bg-[var(--panel)] flex items-center justify-between gap-2">
                  <span>Sub-deck disembunyikan — daftar tetap ringkas.</span>
                  <button
                    type="button"
                    onClick={() => setDemoParentOpen(true)}
                    className="min-h-[32px] px-2 text-xs font-bold text-[var(--ai)] hover:underline inline-flex items-center shrink-0 cursor-pointer"
                  >
                    Buka Sub-deck ▾
                  </button>
                </div>
              )}
            </div>

            {/* Selected Subdeck Quick Detail */}
            <div className="mt-3 rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--tsuki)] p-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--tinta-2)] block">
                  Sub-Deck Terpilih: {activeSubdeck.title} ({activeSubdeck.total} kartu)
                </span>
                <p lang="ja" className="text-sm font-serif text-[var(--tinta)] m-0 mt-0.5">
                  Contoh kosakata: <strong>{activeSubdeck.sample}</strong>
                </p>
              </div>
              <Button
                className="btn-kon"
                style={{ padding: "var(--sp-2) var(--sp-3)", fontSize: "var(--fs-14)" }}
                onClick={() => navigate(user ? "/deck" : "/login")}
              >
                {user ? "Buka Koleksi Deck" : "Masuk untuk Buka Deck"} <Icon name="arrow" size={14} />
              </Button>
            </div>
          </div>

          {/* RIGHT CARD: Original JLPT Practice Exam Preview */}
          <div className="lg:col-span-5 jp-koushi-frame p-4">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[var(--garis)]">
              <div>
                <span className="text-xs font-bold tracking-[0.06em] uppercase text-[var(--kon)]">
                  模擬練習 • LATIHAN UJIAN ORISINAL
                </span>
                <h3 className="text-sm font-serif font-bold text-[var(--tinta)] m-0 mt-0.5">
                  Format 3 Bagian &amp; Mondai Interaktif
                </h3>
              </div>
              <span lang="ja" className="rounded border border-[var(--kon)] px-2 py-0.5 text-xs font-serif font-bold text-[var(--kon)]">
                N5–N1
              </span>
            </div>

            {/* 3 Section Pills */}
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              {[
                { sec: "Bagian 1", jp: "文字・語彙", sub: "Kosakata & Kanji" },
                { sec: "Bagian 2", jp: "文法・読解", sub: "Tata Bahasa" },
                { sec: "Bagian 3", jp: "聴解", sub: "Mendengarkan" },
              ].map((part) => (
                <div
                  key={part.sec}
                  className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--tsuki)] p-2"
                >
                  <small className="block text-xs font-bold uppercase tracking-[0.04em] text-[var(--tinta-2)]">
                    {part.sec}
                  </small>
                  <strong lang="ja" className="font-serif text-sm text-[var(--kon)] block">
                    {part.jp}
                  </strong>
                  <span className="text-xs text-[var(--tinta-2)]">{part.sub}</span>
                </div>
              ))}
            </div>

            {/* Interactive Mini Mondai Question */}
            <div className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--tinta-2)] mb-1.5">
                <span>CONTOH LATIHAN ORISINAL • LEVEL N5 (PARTIKEL)</span>
                <span lang="ja" className="text-[var(--ai)]">問題 1</span>
              </div>
              <p lang="ja" className="text-sm font-serif font-semibold text-[var(--tinta)] mb-2.5">
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
                      className={`rounded-md border py-2 min-h-[36px] font-serif font-bold text-sm transition-colors cursor-pointer ${
                        isPicked
                          ? isRight
                            ? "border-[var(--kon)] bg-[var(--kon)] text-white"
                            : "border-[var(--ai)] bg-[var(--tsuki)] text-[var(--kon)]"
                          : "border-[var(--garis)] bg-[var(--tsuki)] text-[var(--tinta)] hover:border-[var(--kon)]"
                      }`}
                    >
                      {idx + 1}. {opt}
                    </button>
                  );
                })}
              </div>

              {demoExamChoice !== null && (
                <div className="mt-2.5 pt-2 border-t border-[var(--garis)] text-sm text-[var(--tinta)]">
                  {demoExamChoice === 0 ? (
                    <span className="text-[var(--kon)] font-bold inline-flex items-center gap-1.5">
                      <Icon name="check" size={14} className="shrink-0" />
                      <span>Benar! Partikel 「を」 menandai objek langsung dari kata kerja transitif 飲みます.</span>
                    </span>
                  ) : (
                    <span className="text-[var(--tinta-2)] font-semibold inline-flex items-center gap-1.5">
                      <Icon name="close" size={14} className="shrink-0 text-[var(--kon)]" />
                      <span>Kurang tepat. Jawaban yang benar adalah 1 (を) sebagai penanda objek langsung.</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-[var(--tinta-2)]">
                Soal latihan orisinal (bukan soal resmi JLPT) untuk N5–N1 dengan timer.
              </span>
              <Button
                className="outline-button"
                style={{ padding: "8px 14px", fontSize: "14px" }}
                onClick={() => navigate(user ? "/exam" : "/login")}
              >
                {user ? "Halaman Latihan" : "Masuk untuk Latihan"} <Icon name="arrow" size={14} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* EMPAT MODUL INTI, EXPLORER INTERAKTIF & ARSITEKTUR LOKAL (#eksplorer + #fitur) */}
      <section id="eksplorer" className="landing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EMPAT MODUL &amp; ARSITEKTUR LOKAL</p>
            <h2>Bagaimana setiap modul 語楽 bekerja untukmu?</h2>
          </div>
          <p className="text-sm text-[var(--tinta-2)] max-w-md m-0">
            Empat modul terhubung dari membaca teks asli hingga pengulangan berjarak FSRS — seluruhnya berjalan lokal di browser.
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          role="tablist"
          aria-label="4 Modul Inti GoRaku"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4"
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
                className={`flex items-center gap-3 rounded-[var(--r-box)] border p-3 text-left transition-colors cursor-pointer ${
                  isOn
                    ? "border-[var(--kon)] bg-[var(--kon)] text-white"
                    : "border-[var(--garis)] bg-[var(--panel)] text-[var(--tinta)] hover:border-[var(--ai)]"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded grid place-items-center shrink-0 ${
                    isOn ? "bg-white/15 text-white" : "bg-[var(--tsuki)] text-[var(--ai)]"
                  }`}
                >
                  <Icon name={tab.icon} size={17} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-sm truncate">{tab.label}</strong>
                  <small
                    lang="ja"
                    className={`block text-xs truncate mt-0.5 ${
                      isOn ? "text-[var(--mizu)]" : "text-[var(--tinta-2)]"
                    }`}
                  >
                    {tab.jpSub}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="jp-koushi-frame p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
          >
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block rounded bg-[var(--tsuki)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em] text-[var(--ai)]">
                  {activeTab.badge}
                </span>
                <span lang="ja" className="text-xs font-serif text-[var(--tinta-2)]">
                  〔 {activeTab.jpSub} 〕
                </span>
              </div>
              <h3 className="text-sm font-serif font-bold text-[var(--kon)] leading-snug m-0">
                {activeTab.title}
              </h3>
              <p className="text-sm text-[var(--tinta-2)] leading-relaxed m-0">
                {activeTab.description}
              </p>
              <ul className="space-y-1.5 pt-1 m-0 pl-0 list-none">
                {activeTab.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--tinta)]">
                    <span className="w-4 h-4 rounded-full bg-[var(--kon)] text-white grid place-items-center shrink-0 mt-1">
                      <Icon name="check" size={11} />
                    </span>
                    <span className="leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-1">
                <Button
                  className="btn-kon"
                  style={{ fontSize: "var(--fs-14)", padding: "var(--sp-2) var(--sp-4)" }}
                  onClick={() => navigate(user ? "/beranda" : "/login")}
                >
                  {user ? "Buka Fitur di Dashboard" : "Masuk untuk Mencoba Fitur"} <Icon name="arrow" size={15} />
                </Button>
              </div>
            </div>

            {/* Interactive Visual Preview per Tab */}
            <div className="lg:col-span-5 rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--tsuki)] p-4">
              {activeTab.id === "reader" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--kon)]">
                      Pratinjau Mode Teks Pembaca
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        aria-pressed={previewWritingMode === "horizontal-tb"}
                        onClick={() => setPreviewWritingMode("horizontal-tb")}
                        className={`rounded-md px-2.5 min-h-[32px] inline-flex items-center text-xs font-bold transition-colors cursor-pointer ${
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
                        className={`rounded-md px-2.5 min-h-[32px] inline-flex items-center text-xs font-bold transition-colors cursor-pointer ${
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
                    className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] p-3.5 font-serif text-sm leading-loose min-h-[132px] flex items-center justify-center"
                    style={{
                      writingMode: previewWritingMode,
                      maxHeight: "172px",
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
                  <p className="text-sm text-[var(--tinta-2)] m-0 leading-relaxed">
                    Tag <code>&lt;rt&gt;</code> furigana otomatis diabaikan saat pencarian kamus agar kata dasar kanji tetap tepat.
                  </p>
                </div>
              )}

              {activeTab.id === "dictionary" && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[var(--kon)]">
                    Alur Deinflection &amp; Lookup Tunggal
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {[
                      { step: "Input Klik di Novel", val: "食べさせられなかった", note: "Bentuk turunan" },
                      { step: "1. Kupas Negatif Lampau", val: "食べさせられる", note: "-なかった → -る" },
                      { step: "2. Kupas Pasif/Potensial", val: "食べさせる", note: "-られる → -る" },
                      { step: "3. Kupas Kausatif & Validasi v1", val: "食べる 【たべる】", note: "Cocok di JMdict!" },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] px-3 py-1.5 gap-2"
                      >
                        <div>
                          <span className="text-xs text-[var(--tinta-2)] block">{row.step}</span>
                          <strong lang="ja" className="font-serif text-sm text-[var(--tinta)]">
                            {row.val}
                          </strong>
                        </div>
                        <span className="rounded bg-[var(--tsuki)] px-2 py-0.5 text-xs font-bold text-[var(--ai)] shrink-0">
                          {row.note}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab.id === "mining" && (
                <div className="space-y-2.5 text-sm">
                  <div className="text-xs font-bold text-[var(--kon)]">
                    Perbandingan Ekstraksi Kalimat Dialog
                  </div>
                  <div className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] p-2.5">
                    <span className="text-xs font-bold text-[var(--teks-redup)] uppercase tracking-[0.06em] inline-flex items-center gap-1 mb-1">
                      <Icon name="close" size={12} /> Pemisah Biasa (Terpotong)
                    </span>
                    <p lang="ja" className="text-sm text-[var(--tinta-2)] m-0">
                      「本当に<b>信じられない</b>！
                    </p>
                  </div>
                  <div className="rounded-[var(--r-box)] border border-[var(--ai)] bg-[var(--panel)] p-2.5">
                    <span className="text-xs font-bold text-[var(--kon)] uppercase tracking-[0.06em] inline-flex items-center gap-1 mb-1">
                      <Icon name="check" size={12} /> Ekstraktor Kontekstual 語楽
                    </span>
                    <p lang="ja" className="text-sm text-[var(--tinta)] m-0">
                      「本当に<b>信じられない</b>！」と彼女は驚いた声で言った。
                    </p>
                  </div>
                  <p className="text-sm text-[var(--tinta-2)] m-0 leading-relaxed">
                    Pelacak tanda kutip <code>「」</code> dan <code>『』</code> menjaga dialog serta klausa penutup tetap utuh.
                  </p>
                </div>
              )}

              {activeTab.id === "srs" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--kon)]">
                      Simulasi Kartu Review FSRS
                    </span>
                    <button
                      type="button"
                      onClick={() => setDemoCardFlipped((v) => !v)}
                      className="rounded-md bg-[var(--kon)] px-3 min-h-[32px] inline-flex items-center text-xs font-bold text-white hover:bg-[var(--ai-tua)] transition-colors cursor-pointer"
                    >
                      {demoCardFlipped ? "Lihat Depan" : "Balik Kartu (Spasi)"}
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-pressed={demoCardFlipped}
                    onClick={() => setDemoCardFlipped((v) => !v)}
                    className="w-full rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] p-4 text-center cursor-pointer shadow-xs min-h-[136px] flex flex-col justify-center items-center hover:border-[var(--ai)] transition-colors"
                  >
                    <small lang="ja" className="text-xs text-[var(--ai)] font-bold">
                      {demoCardFlipped ? "じゅみょう • Sub-deck N3" : "Klik untuk membuka jawaban"}
                    </small>
                    <strong lang="ja" className="text-2xl font-serif my-1 text-[var(--tinta)]">
                      寿命
                    </strong>
                    {demoCardFlipped && (
                      <div className="mt-1.5 pt-1.5 border-t border-[var(--garis)] text-sm space-y-0.5 w-full">
                        <p className="font-bold text-[var(--kon)] m-0">umur; masa hidup (lifespan)</p>
                        <p lang="ja" className="text-[var(--tinta-2)] m-0">
                          人間の<b>寿命</b>は短いんだね。
                        </p>
                      </div>
                    )}
                  </button>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
                    <div className="rounded bg-[var(--kertas-2)] border border-[var(--garis)] py-1 text-[var(--tinta)]">1 • Lupa</div>
                    <div className="rounded bg-[var(--kertas-2)] border border-[var(--garis)] py-1 text-[var(--ai-tua)]">2 • Sulit</div>
                    <div className="rounded bg-[var(--tsuki)] border border-[var(--garis)] py-1 text-[var(--kon)]">3 • Baik</div>
                    <div className="rounded bg-[var(--kon)] py-1 text-white">4 • Mudah</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pita Ringkas Arsitektur Lokal (#fitur digabung ke seksi modul) */}
        <div id="fitur" className="scroll-mt-24 pt-5 mt-5 border-t border-[var(--garis)]">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--ai)]">
              ARSITEKTUR &amp; PRIVASI • PENYIMPANAN LOKAL DI PERANGKAT
            </span>
            <span className="text-xs text-[var(--tinta-2)]">
              Tanpa backend server — bekerja offline &amp; isolasi data pengguna di browser.
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                jp: "検索速度 • KAMUS",
                title: "Lookup & Deinflection Cepat di Memori",
                desc: "Kamus Yomitan v3 diproses via Web Worker bertahap dengan tombol batal dan validasi tag aturan (v1/v5).",
              },
              {
                jp: "階層構造 • SUB-DECK",
                title: "Partisi .apkg via SQLite WASM",
                desc: "Membaca .anki2/.anki21b beserta media audio/gambar offline ke hierarki sub-deck JLPT N5–N1.",
              },
              {
                jp: "保存設計 • PRIVASI",
                title: "100% Local-First di IndexedDB",
                desc: "Novel, manga, progres baca, riwayat FSRS, dan hasil latihan JLPT tidak pernah meninggalkan perangkat.",
              },
            ].map((stmt) => (
              <div
                key={stmt.jp}
                className="rounded-[var(--r-box)] border border-[var(--garis)] bg-[var(--panel)] px-4 py-3"
              >
                <span lang="ja" className="block text-xs font-bold uppercase tracking-[0.05em] text-[var(--ai)] mb-1">
                  {stmt.jp}
                </span>
                <strong className="block text-sm font-serif font-bold text-[var(--kon)] mb-1">
                  {stmt.title}
                </strong>
                <p className="text-sm text-[var(--tinta-2)] m-0 leading-snug">
                  {stmt.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 伍 • PITA RINGKAS CARA KERJA */}
      <section id="cara-kerja" className="landing-section landing-dark">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-4">
          <div>
            <p className="eyebrow light">学習の道筋 • ALUR BELAJAR END-TO-END</p>
            <h2 className="text-2xl font-serif font-bold text-white m-0">
              4 Langkah Menguasai Bahasa Jepang dari Karya Asli
            </h2>
          </div>
          <span lang="ja" className="text-xs font-serif text-white/80">
            継続は力なり — Konsistensi adalah kekuatan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="step">
            <span lang="ja" className="step-num">壱</span>
            <h3>Impor Kamus &amp; Sub-Deck</h3>
            <p>Unggah kamus ZIP Yomitan atau tarik paket Anki <code>.apkg</code> menjadi sub-deck N5–N1.</p>
          </div>
          <div className="step">
            <span lang="ja" className="step-num">弐</span>
            <h3>Baca Novel &amp; Manga</h3>
            <p>Buka EPUB, TXT, atau CBZ dengan furigana, tema Washi, dan OCR dialog vertikal.</p>
          </div>
          <div className="step">
            <span lang="ja" className="step-num">参</span>
            <h3>Klik Kata &amp; Tambang</h3>
            <p>Bedah arti kamus &amp; deinflection, lalu simpan ke sub-deck beserta kalimat konteksnya.</p>
          </div>
          <div className="step">
            <span lang="ja" className="step-num">肆</span>
            <h3>Review SRS &amp; Latihan JLPT</h3>
            <p>Ulas kartu jatuh tempo per sub-deck dan ukur pemahaman lewat simulasi JLPT N5–N1.</p>
          </div>
        </div>
      </section>

      {/* FAQ INTERAKTIF (NATIVE DETAILS/SUMMARY) */}
      <section id="faq" className="landing-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <div className="section-heading" style={{ marginBottom: 14 }}>
              <div>
                <p className="eyebrow" style={{ margin: "0 0 4px" }}>PERTANYAAN UMUM</p>
                <h2>Tanya Jawab Seputar 語楽</h2>
              </div>
            </div>
            <div className="border-t border-[var(--garis)]">
              {FAQ_ITEMS.map((item, idx) => (
                <details
                  key={idx}
                  className="landing-faq-details"
                  open={idx === 0}
                >
                  <summary className="font-serif font-bold text-sm text-[var(--tinta)] py-3">
                    <span>{item.q}</span>
                    <span className="landing-faq-chevron text-[var(--ai)] text-xs font-sans shrink-0 transition-transform" aria-hidden="true">
                      ▾
                    </span>
                  </summary>
                  <div
                    id={`faq-answer-${idx}`}
                    className="px-2 pb-3 text-sm text-[var(--tinta-2)] leading-relaxed"
                  >
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Bottom CTA Banner */}
          <div className="lg:col-span-5 rounded-[var(--r-box)] border border-[var(--ai)] bg-[var(--kon)] p-6 text-white relative overflow-hidden">
            <p className="eyebrow light">一歩ずつ、確実に • MULAI IMMERSION</p>
            <h3 className="text-[length:var(--fs-24)] leading-snug font-serif font-bold mt-1 mb-2 text-white">
              Siap membangun ruang belajar pribadi di 語楽?
            </h3>
            <p className="text-sm text-[var(--mizu)] mb-5 leading-relaxed">
              Masuk ke dashboard, pilih sub-deck N5–N1, baca novel contoh <em>吾輩は猫である</em>, atau mulai simulasi JLPT sekarang.
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                to={user ? "/beranda" : "/login"}
                className="outline-button no-underline text-sm font-bold px-4 py-2.5"
                style={{
                  background: "#fff",
                  color: "var(--kon)",
                  borderColor: "#fff",
                }}
              >
                {user ? "Buka Dashboard 語楽" : "Masuk & Mulai Belajar"}
              </Link>
              {user ? (
                <Link
                  to="/deck"
                  className="outline-button no-underline text-sm px-4 py-2.5"
                  style={{
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
                  className="outline-button no-underline text-sm px-4 py-2.5"
                  style={{
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
        </div>
      </section>
      </main>

      {/* FOOTER — Minimalist Japanese Editorial Colophon */}
      <footer className="landing-footer">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="brand" style={{ padding: 0 }}>
              <span className="brand-mark text-sm" style={{ background: "var(--kon)" }}>語</span>
              <span className="brand-copy">
                <strong className="text-sm">語楽</strong>
                <small className="text-xs">GORAKU</small>
              </span>
            </div>
            <span className="rounded border border-[var(--garis)] px-2 py-0.5 text-xs font-serif font-semibold text-[var(--tinta-2)]">
              純国産ローカル
            </span>
          </div>

          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap justify-center text-xs">
            <Link to="/beranda" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Dashboard</Link>
            <Link to="/deck" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Koleksi Deck</Link>
            <Link to="/library" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Perpustakaan</Link>
            <Link to="/mining" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Sentence Mining</Link>
            <Link to="/exam" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Ujian JLPT</Link>
            <Link to="/license" className="inline-flex items-center min-h-[32px] px-2 py-1 rounded-md text-[var(--tinta-2)] hover:text-[var(--ai)] hover:bg-[var(--tsuki)] no-underline transition-colors">Atribusi &amp; Lisensi</Link>
          </div>

          <p className="m-0 text-sm text-[var(--tinta-2)]">
            © 2026 語楽 (GORAKU) —千里の道も一歩から。
          </p>
        </div>
      </footer>
    </div>
  );
}
