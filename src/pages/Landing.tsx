import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, Button, type IconName } from "../ui";
import { speakJapanese } from "../lib/tts";
import { useAppStore } from "../store/useAppStore";

interface DemoToken {
  id: string;
  surface: string;
  dictionaryForm: string;
  reading: string;
  pos: string;
  jlpt: string;
  reasons: string[];
  meaning: string;
  sentenceHtml: string;
  sentencePlain: string;
}

const HERO_DEMO_TOKENS: DemoToken[] = [
  {
    id: "tabesaserarenakatta",
    surface: "食べさせられなかった",
    dictionaryForm: "食べる",
    reading: "たべる",
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
  },
  {
    id: "oishikatta",
    surface: "美味しかった",
    dictionaryForm: "美味しい",
    reading: "おいしい",
    pos: "Adjektiva-i (adj-i)",
    jlpt: "N5",
    reasons: ["bentuk lampau (-かった)"],
    meaning: "enak; lezat; sedap rasanya (delicious; tasty)",
    sentenceHtml:
      "「今日はとても<b>美味しかった</b>よ！」と先生は笑いながら言った。",
    sentencePlain: "「今日はとても美味しかったよ！」と先生は笑いながら言った。",
  },
  {
    id: "benkyoushiteiru",
    surface: "勉強している",
    dictionaryForm: "勉強する",
    reading: "べんきょうする",
    pos: "Suru Verb (vs)",
    jlpt: "N5",
    reasons: ["sedang berlangsung (-ている)"],
    meaning: "belajar; mempelajari dengan tekun (to study)",
    sentenceHtml:
      "日本語学校に通う学生たちは、毎日熱心に<b>勉強している</b>。",
    sentencePlain: "日本語学校に通う学生たちは、毎日熱心に勉強している。",
  },
  {
    id: "ikanakatta",
    surface: "行かなかった",
    dictionaryForm: "行く",
    reading: "いく",
    pos: "Godan Verb (v5k-s)",
    jlpt: "N5",
    reasons: ["negatif lampau (-なかった)"],
    meaning: "pergi; berangkat; menuju (to go; to proceed)",
    sentenceHtml:
      "外は静かな雨が降っていたので、予定していた散歩には<b>行かなかった</b>。",
    sentencePlain:
      "外は静かな雨が降っていたので、予定していた散歩には行かなかった。",
  },
];

const FEATURE_TABS = [
  {
    id: "reader",
    label: "1. Pembaca Novel EPUB & TXT",
    icon: "book" as IconName,
    badge: "Foliate-js + Multi-Encoding",
    title: "Baca novel Jepang langsung di browser dengan dukungan Furigana & Tategaki",
    description:
      "Buka koleksi novel EPUB maupun berkas teks TXT (UTF-8, Shift_JIS, atau EUC-JP terdeteksi otomatis). Posisi baca terakhir disimpan menggunakan EPUB CFI di IndexedDB sehingga halaman otomatis pulih saat dibuka kembali.",
    bullets: [
      "Dukungan tag <ruby><rt> furigana utuh tanpa mengganggu akurasi pencarian kamus",
      "Pilihan tema baca (Terang, Sepia, Gelap), ukuran huruf, serta mode Per Halaman atau Gulir",
      "Mendukung tata letak horizontal (Yokogaki) maupun eksperimen teks vertikal (Tategaki)",
      "Daftar isi (Table of Contents) otomatis dan deteksi bab cerdas untuk berkas TXT",
    ],
  },
  {
    id: "dictionary",
    label: "2. Kamus Yomitan & Deinflection",
    icon: "search" as IconName,
    badge: "Lookup < 2 ms • 200k+ Entri",
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
    label: "3. Sentence Mining Kontekstual",
    icon: "mine" as IconName,
    badge: "Ekstraksi Kalimat Cerdas",
    title: "Ubah kalimat novel menjadi kartu flashcard kontekstual dalam 1 klik",
    description:
      "Tidak perlu lagi menyalin dan menempel kalimat secara manual. Klik kata yang belum dikenal di dalam novel atau tempel teks bebas di Studio Mining — kalimat sumber otomatis diekstrak dan kata target ditandai tebal.",
    bullets: [
      "Ekstraksi kalimat kontekstual berdasarkan tanda baca (。！？) yang menjaga dialog 「...」 dan 『...』 tetap utuh",
      "Penanda duplikat otomatis jika kata (expression + reading) sudah ada di dalam deck tujuan",
      "Editor langsung pada popup untuk menyesuaikan arti atau kalimat sebelum disimpan ke deck",
      "Dilengkapi pengucapan suara bahasa Jepang (Web Speech API ja-JP) untuk kata dan kalimat",
    ],
  },
  {
    id: "srs",
    label: "4. Deck Anki (.apkg) & Review SRS",
    icon: "cards" as IconName,
    badge: "SQLite WASM + Zstd",
    title: "Impor deck Anki favoritmu dan kuasai kosakata dengan jadwal terukur",
    description:
      "Sudah punya koleksi deck Anki seperti Kaishi 1.5k atau Core 2k/6k? Tarik berkas .apkg langsung ke aplikasi lengkap dengan gambar, audio MP3, dan subdeck — lalu pelajari bersama kartu hasil tambangan novelmu.",
    bullets: [
      "Mendukung format paket Anki lama (.anki2) maupun format kompresi baru (.anki21b / Zstandard)",
      "Sesi review interaktif dengan pintasan keyboard (Spasi & 1–4), tombol Undo (Ctrl+Z), dan toggle Furigana cepat",
      "Ekspor kembali koleksi deck kapan saja ke format CSV atau JSON",
      "Analitik progres visual: grafik pertumbuhan kosakata, target JLPT N5–N1, dan heatmap konsistensi 16 minggu",
    ],
  },
] as const;

const PILLAR_CARDS: {
  icon: IconName;
  tag: string;
  title: string;
  desc: string;
  highlights: string[];
}[] = [
  {
    icon: "book",
    tag: "PEMBACA NOVEL",
    title: "Perpustakaan EPUB & TXT",
    desc: "Simpan novel Jepang di browser, baca per halaman atau gulir, dan lanjutkan tepat dari posisi kalimat terakhir.",
    highlights: ["Deteksi Shift_JIS & UTF-8", "Dukungan <ruby> Furigana", "Mode Yokogaki & Tategaki"],
  },
  {
    icon: "search",
    tag: "KAMUS OFFLINE",
    title: "Impor ZIP Format Yomitan",
    desc: "Gunakan JMdict atau Jitendex secara offline. Proses impor berjalan di Web Worker per 1.000 baris dengan tombol batal.",
    highlights: ["Skema Yomitan v3", "Prioritas Multi-Kamus", "Lookup < 2 milidetik"],
  },
  {
    icon: "sparkle",
    tag: "MORFOLOGI JEPANG",
    title: "Deinflection Berlapis",
    desc: "Mengenali perubahan kata kerja dan kata sifat hingga rantai 4 lapis dan memvalidasinya terhadap aturan kamus.",
    highlights: ["Ichidan, Godan, Adj-i", "Kausatif-Pasif-Negatif", "Validasi Tag Aturan (v1/v5)"],
  },
  {
    icon: "mine",
    tag: "SENTENCE MINING",
    title: "1-Click Popup & Studio Teks",
    desc: "Klik kata di novel, deteksi teks dialog manga, atau gunakan Studio Teks Bebas untuk membuat kartu lengkap dengan kalimat sumber.",
    highlights: ["Dialog 「...」 Tidak Terpotong", "Deteksi Kartu Ganda", "Audio Pengucapan ja-JP"],
  },
  {
    icon: "upload",
    tag: "KOMPATIBILITAS ANKI",
    title: "Impor .apkg & Subdeck",
    desc: "Bawa masuk deck Anki lengkap dengan media audio dan gambar menggunakan pengurai SQLite WebAssembly di sisi klien.",
    highlights: ["Dukungan .anki2 & .anki21b", "Audio & Gambar Offline", "Ekspor CSV & JSON"],
  },
  {
    icon: "lock",
    tag: "ARSITEKTUR PRIVASI",
    title: "100% Local-First di Browser",
    desc: "Tanpa backend server. Seluruh berkas novel, kamus, dan jadwal kartu disimpan aman di IndexedDB perangkat Anda.",
    highlights: ["Tanpa Upload ke Server", "Bekerja Tanpa Internet", "Isolasi Data Pengguna"],
  },
];

const FAQ_ITEMS = [
  {
    q: "Apakah novel dan kamus yang saya unggah dikirim ke server?",
    a: "Tidak sama sekali. 語楽 (GORAKU) dirancang dengan arsitektur 100% Local-First menggunakan IndexedDB (Dexie) dan Web Worker di dalam browser Anda. Berkas EPUB, TXT, kamus Yomitan, maupun paket Anki .apkg tidak pernah meninggalkan perangkat Anda.",
  },
  {
    q: "Dari mana saya bisa mendapatkan berkas kamus format Yomitan?",
    a: "Anda dapat mengunduh berkas ZIP kamus bebas lisensi terbuka seperti JMdict_english.zip (rilis resmi proyek yomidevs/jmdict-yomitan atau Jitendex yang berlisensi CC BY-SA 4.0 milik EDRDG), lalu mengimpornya lewat menu 'Kelola Kamus' di aplikasi.",
  },
  {
    q: "Bagaimana cara kerja pencarian kata yang sudah berubah bentuk (konjugasi)?",
    a: "Saat Anda mengeklik kata di pembaca novel (misalnya 食べさせられなかった), mesin pencarian memindai substring terpanjang dan menjalankan tabel aturan deinflection mandiri untuk mengembalikannya ke bentuk kamus (食べる) beserta penjelasan rantai perubahannya.",
  },
  {
    q: "Format berkas apa saja yang didukung saat ini?",
    a: "Untuk perpustakaan bacaan, aplikasi mendukung novel berformat .epub dan .txt (dengan deteksi otomatis UTF-8, Shift_JIS, dan EUC-JP). Untuk kartu flashcard, aplikasi mendukung impor paket Anki .apkg (baik format lama maupun .anki21b) serta ekspor CSV/JSON.",
  },
] as const;

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

  // State untuk FAQ Accordion
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const activeToken =
    HERO_DEMO_TOKENS.find((t) => t.id === selectedTokenId) ?? HERO_DEMO_TOKENS[0];
  const activeTab =
    FEATURE_TABS.find((t) => t.id === activeTabId) ?? FEATURE_TABS[0];
  const minedCount = Object.values(minedMap).filter(Boolean).length;

  const readerThemeStyle =
    heroTheme === "dark"
      ? { bg: "#181a19", fg: "#e9e6df", border: "#2f3431", sub: "#9ea4a0" }
      : heroTheme === "sepia"
        ? { bg: "#f4ecd8", fg: "#2c241b", border: "#dccbb1", sub: "#6d5d4b" }
        : { bg: "#fffdfa", fg: "#25231f", border: "#e2ded5", sub: "#7a756c" };

  return (
    <div className="landing">
      {/* Navigasi Atas */}
      <nav className="landing-nav">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">語</span>
          <span className="brand-copy">
            <strong>語楽</strong>
            <small>GORAKU</small>
          </span>
        </div>
        <div className="landing-nav-links">
          <a href="#simulasi">Simulasi Interaktif</a>
          <a href="#eksplorer">Penjelasan Fitur</a>
          <a href="#fitur">6 Pilar Sistem</a>
          <a href="#faq">FAQ</a>
          <Link to={user ? "/beranda" : "/login"}>
            <Button className="pg-primary">
              <Icon name="arrow" size={16} /> {user ? "Buka Dashboard" : "Masuk / Mulai"}
            </Button>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION + LIVE READER & SENTENCE MINING SIMULATOR */}
      <section id="simulasi" className="landing-hero" style={{ paddingTop: "125px", paddingBottom: "70px", alignItems: "flex-start" }}>
        <div className="landing-hero-copy" style={{ flex: 1.15 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfd8cc] bg-[#fffdfa] px-3.5 py-1.5 text-[11px] font-bold text-[#a06658] mb-4 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#d95b43] animate-pulse" />
            PLATFORM IMMERSION &amp; SENTENCE MINING BAHASA JEPANG
          </div>

          <h1>
            Baca novel Jepang, klik kata,<br />
            <span>dan tambang kalimat ke deck.</span>
          </h1>

          <p className="welcome-copy" style={{ fontSize: "14px", maxWidth: "540px", lineHeight: 1.7 }}>
            <strong>語楽 (GORAKU)</strong> menggabungkan <strong>Pembaca Novel EPUB/TXT</strong>,{" "}
            <strong>Kamus Offline Yomitan dengan Deinflection</strong>, serta{" "}
            <strong>Flashcard SRS Kompatibel Anki (.apkg)</strong> langsung di dalam browser Anda —
            100% lokal tanpa mengirim konten pribadi ke server.
          </p>

          {/* Tag Fitur Inti */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              "📖 Pembaca EPUB & TXT (Furigana <ruby>)",
              "🔍 Kamus Yomitan + Deinflection (< 2ms)",
              "⛏️ 1-Click Sentence Mining Kontekstual",
              "🗂️ Impor Anki (.apkg / .anki21b) + FSRS",
            ].map((pill) => (
              <span
                key={pill}
                className="rounded-lg border border-[#dfd9ce] bg-[#faf7f0] px-2.5 py-1 text-[11px] font-semibold text-[#494740]"
              >
                {pill}
              </span>
            ))}
          </div>

          <div className="landing-cta" style={{ marginTop: "28px", marginBottom: "34px" }}>
            <Link to={user ? "/beranda" : "/login"}>
              <Button className="pg-primary" style={{ padding: "13px 22px", fontSize: "12.5px" }}>
                <Icon name="arrow" size={18} /> {user ? "Lanjutkan di Dashboard" : "Mulai Belajar Sekarang"}
              </Button>
            </Link>
            <a href="#eksplorer" style={{ textDecoration: "none" }}>
              <Button className="outline-button" style={{ padding: "13px 18px", fontSize: "12.5px" }}>
                <Icon name="book" size={17} /> Pelajari Cara Kerja Fitur
              </Button>
            </a>
          </div>

          <div className="landing-stats">
            <div>
              <strong>~1,12 ms</strong>
              <span>kecepatan lookup 200rb entri</span>
            </div>
            <div>
              <strong>4+ Lapis</strong>
              <span>rantai deinflection verba</span>
            </div>
            <div>
              <strong>100% Lokal</strong>
              <span>IndexedDB + Web Worker</span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE READER & POPUP SIMULATOR */}
        <div className="w-full max-w-[520px] flex-1">
          <div
            className="rounded-2xl border shadow-2xl overflow-hidden transition-colors"
            style={{
              background: readerThemeStyle.bg,
              color: readerThemeStyle.fg,
              borderColor: readerThemeStyle.border,
            }}
          >
            {/* Simulator Top Toolbar */}
            <div
              className="flex items-center justify-between gap-2 px-4 py-2.5 border-b text-xs"
              style={{ borderColor: readerThemeStyle.border }}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#d95b43] px-2 py-0.5 text-[10px] font-bold text-white">
                  SIMULASI LANGSUNG
                </span>
                <span className="font-semibold truncate" lang="ja">
                  吾輩は猫である • Bab 1
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHeroFurigana((v) => !v)}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                    heroFurigana
                      ? "border-[#c4543f] bg-[#f1e6df] text-[#c4543f]"
                      : "border-current/20 opacity-70"
                  }`}
                >
                  あ Furigana
                </button>
                {(["light", "sepia", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHeroTheme(t)}
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      heroTheme === t ? "border-[#d95b43] font-bold" : "border-transparent opacity-65"
                    }`}
                  >
                    {t === "light" ? "Terang" : t === "sepia" ? "Sepia" : "Gelap"}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulator Novel Excerpt with Clickable Conjugated Words */}
            <div className="p-5 border-b" style={{ borderColor: readerThemeStyle.border }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#d95b43]">
                  👇 Klik salah satu kata bergaris bawah di dalam novel:
                </span>
                <span className="text-[10.5px] font-semibold" style={{ color: readerThemeStyle.sub }}>
                  <Icon name="mine" size={12} /> {minedCount} ditambang
                </span>
              </div>

              <p
                lang="ja"
                className="text-[16.5px] leading-[2.15] font-serif select-none"
              >
                「今日はとても
                <button
                  type="button"
                  onClick={() => setSelectedTokenId("oishikatta")}
                  className={`mx-0.5 rounded px-1 py-0.5 transition-all cursor-pointer border-b-2 ${
                    selectedTokenId === "oishikatta"
                      ? "bg-[#d95b43] text-white border-[#d95b43] font-bold"
                      : "border-dashed border-[#d95b43]/70 hover:bg-[#d95b43]/15"
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
                  className={`mx-0.5 rounded px-1 py-0.5 transition-all cursor-pointer border-b-2 ${
                    selectedTokenId === "tabesaserarenakatta"
                      ? "bg-[#d95b43] text-white border-[#d95b43] font-bold"
                      : "border-dashed border-[#d95b43]/70 hover:bg-[#d95b43]/15"
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
                  className={`mx-0.5 rounded px-1 py-0.5 transition-all cursor-pointer border-b-2 ${
                    selectedTokenId === "benkyoushiteiru"
                      ? "bg-[#d95b43] text-white border-[#d95b43] font-bold"
                      : "border-dashed border-[#d95b43]/70 hover:bg-[#d95b43]/15"
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
                  className={`mx-0.5 rounded px-1 py-0.5 transition-all cursor-pointer border-b-2 ${
                    selectedTokenId === "ikanakatta"
                      ? "bg-[#d95b43] text-white border-[#d95b43] font-bold"
                      : "border-dashed border-[#d95b43]/70 hover:bg-[#d95b43]/15"
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

            {/* Simulated ReaderPopup Output */}
            <div className="p-4 bg-[#faf7f0] text-[#25231f]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span lang="ja" className="text-xs font-bold text-[#c4543f]">
                      {activeToken.reading}
                    </span>
                    <span className="rounded bg-[#233c35]/10 px-2 py-0.5 text-[10px] font-bold text-[#233c35]">
                      {activeToken.pos} • {activeToken.jlpt}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <strong lang="ja" className="text-2xl font-serif font-bold">
                      {activeToken.dictionaryForm}
                    </strong>
                    <button
                      type="button"
                      onClick={() => speakJapanese(activeToken.reading)}
                      title="Dengarkan pengucapan kata"
                      className="rounded-lg border border-[#dcd6ca] bg-white p-1.5 text-[#c4543f] hover:bg-[#f1e6df]"
                    >
                      <Icon name="volume" size={14} />
                    </button>
                  </div>
                </div>

                <span className="rounded-lg bg-[#f1e6df] px-2.5 py-1 text-[10.5px] font-bold text-[#bf5b46] text-right">
                  {activeToken.surface} → {activeToken.dictionaryForm}
                  <small className="block text-[9.5px] font-normal opacity-85">
                    {activeToken.reasons.join(" ← ")}
                  </small>
                </span>
              </div>

              <p className="text-xs text-[#494740] mb-2.5 font-medium">
                <strong>Arti Kamus (JMdict):</strong> {activeToken.meaning}
              </p>

              {/* Extracted Context Sentence Box */}
              <div className="rounded-xl border border-[#e2ded5] bg-white p-2.5 mb-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#8e8a82] mb-1">
                  <span>Kalimat Sumber Otomatis (Target Ditandai &lt;b&gt;)</span>
                  <button
                    type="button"
                    onClick={() => speakJapanese(activeToken.sentencePlain)}
                    className="text-[#c4543f] hover:underline flex items-center gap-1"
                  >
                    <Icon name="volume" size={12} /> Putar Kalimat
                  </button>
                </div>
                <p
                  lang="ja"
                  className="text-xs leading-relaxed text-[#25231f]"
                  dangerouslySetInnerHTML={{ __html: activeToken.sentenceHtml }}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#6f6b63]">
                  Deck Tujuan: <strong>Novel Immersion</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMinedMap((prev) => ({
                      ...prev,
                      [activeToken.id]: true,
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer ${
                    minedMap[activeToken.id]
                      ? "bg-[#2f6b4f]"
                      : "bg-[#c4543f] hover:bg-[#ad432f]"
                  }`}
                >
                  <Icon name={minedMap[activeToken.id] ? "check" : "plus"} size={15} />
                  {minedMap[activeToken.id]
                    ? "✓ Sudah Ditambahkan ke Deck"
                    : "Tambah ke Deck"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FEATURE EXPLORER (4 TAB MENDALAM) */}
      <section id="eksplorer" className="landing-section" style={{ paddingTop: "50px", paddingBottom: "70px" }}>
        <div className="section-heading" style={{ marginBottom: "24px" }}>
          <div>
            <p className="eyebrow">BEDAH FITUR INTERAKTIF</p>
            <h2>Bagaimana setiap modul 語楽 bekerja untukmu?</h2>
          </div>
          <p className="text-xs text-[#77746c] max-w-md">
            Pilih salah satu modul di bawah untuk melihat penjelasan teknis dan pratinjau interaktifnya.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
          {FEATURE_TABS.map((tab) => {
            const isOn = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  isOn
                    ? "border-[#233c35] bg-[#233c35] text-white shadow-md"
                    : "border-[#e1ddd4] bg-[#fffdfa] text-[#25231f] hover:border-[#c4543f]"
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                    isOn ? "bg-white/15 text-white" : "bg-[#f1e6df] text-[#c4543f]"
                  }`}
                >
                  <Icon name={tab.icon} size={18} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-xs truncate">{tab.label}</strong>
                  <small
                    className={`block text-[10px] truncate mt-0.5 ${
                      isOn ? "text-white/75" : "text-[#8e8a82]"
                    }`}
                  >
                    {tab.badge}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-[#e1ddd4] bg-[#fffdfa] p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-block rounded-full bg-[#f1e6df] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#bf5b46]">
                {activeTab.badge}
              </span>
              <h3 className="text-2xl font-serif font-bold text-[#25231f] leading-snug">
                {activeTab.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#5c5851] leading-relaxed">
                {activeTab.description}
              </p>
              <ul className="space-y-2.5 pt-1">
                {activeTab.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[#3b3832]">
                    <span className="w-5 h-5 rounded-full bg-[#233c35] text-white grid place-items-center shrink-0 mt-0.5">
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
                  Coba Fitur Ini Sekarang <Icon name="arrow" size={16} />
                </Button>
              </div>
            </div>

            {/* Interactive Visual Preview per Tab */}
            <div className="lg:col-span-5 rounded-2xl border border-[#e6e1d6] bg-[#f7f4ec] p-5">
              {activeTab.id === "reader" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#233c35]">
                      Pratinjau Mode Teks Pembaca
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewWritingMode("horizontal-tb")}
                        className={`rounded px-2 py-1 text-[10px] font-bold ${
                          previewWritingMode === "horizontal-tb"
                            ? "bg-[#233c35] text-white"
                            : "bg-white text-[#5c5851]"
                        }`}
                      >
                        Horizontal (Yokogaki)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewWritingMode("vertical-rl")}
                        className={`rounded px-2 py-1 text-[10px] font-bold ${
                          previewWritingMode === "vertical-rl"
                            ? "bg-[#233c35] text-white"
                            : "bg-white text-[#5c5851]"
                        }`}
                      >
                        Vertikal (Tategaki)
                      </button>
                    </div>
                  </div>
                  <div
                    lang="ja"
                    className="rounded-xl border border-[#dfd9ce] bg-[#fffdfa] p-4 font-serif text-base leading-loose min-h-[160px] flex items-center justify-center"
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
                  <p className="text-[11px] text-[#6f6b63]">
                    Tag <code>&lt;rt&gt;</code> furigana otomatis diabaikan saat pemindaian kamus agar kata dasar kanji tetap ditemukan secara presisi.
                  </p>
                </div>
              )}

              {activeTab.id === "dictionary" && (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-[#233c35]">
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
                        className="flex items-center justify-between rounded-xl border border-[#e1ddd4] bg-white px-3 py-2"
                      >
                        <div>
                          <span className="text-[10px] text-[#8e8a82] block">{row.step}</span>
                          <strong lang="ja" className="font-serif text-sm text-[#25231f]">
                            {row.val}
                          </strong>
                        </div>
                        <span className="rounded bg-[#f1e6df] px-2 py-0.5 text-[10px] font-bold text-[#bf5b46]">
                          {row.note}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab.id === "mining" && (
                <div className="space-y-3 text-xs">
                  <div className="text-[11px] font-bold text-[#233c35]">
                    Perbandingan Ekstraksi Kalimat Dialog
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
                    <span className="text-[10px] font-bold text-red-700 uppercase block mb-1">
                      ❌ Pemisah Titik/Tanda Seru Biasa (Terpotong)
                    </span>
                    <p lang="ja" className="text-xs text-red-900">
                      「本当に<b>信じられない</b>！
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#2f6b4f]/30 bg-[#e9f5ee] p-3">
                    <span className="text-[10px] font-bold text-[#2f6b4f] uppercase block mb-1">
                      ✓ Ekstraktor Kontekstual 語楽 (Utuh dengan Atribusi)
                    </span>
                    <p lang="ja" className="text-xs text-[#1c3b2c]">
                      「本当に<b>信じられない</b>！」と彼女は驚いた声で言った。
                    </p>
                  </div>
                  <p className="text-[11px] text-[#6f6b63]">
                    Pelacak kedalaman tanda kutip <code>「」</code> dan <code>『』</code> memastikan kalimat dialog beserta klausa penutupnya tidak terpotong di tengah.
                  </p>
                </div>
              )}

              {activeTab.id === "srs" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#233c35]">
                      Simulasi Kartu Review SRS
                    </span>
                    <button
                      type="button"
                      onClick={() => setDemoCardFlipped((v) => !v)}
                      className="rounded-lg bg-[#233c35] px-2.5 py-1 text-[10px] font-bold text-white cursor-pointer"
                    >
                      {demoCardFlipped ? "Lihat Depan" : "Balik Kartu (Spasi)"}
                    </button>
                  </div>
                  <div
                    onClick={() => setDemoCardFlipped((v) => !v)}
                    className="rounded-xl border border-[#dfd9ce] bg-white p-5 text-center cursor-pointer shadow-xs min-h-[165px] flex flex-col justify-center"
                  >
                    <small lang="ja" className="text-xs text-[#c4543f] font-bold">
                      {demoCardFlipped ? "じゅみょう" : "Klik untuk membuka jawaban"}
                    </small>
                    <strong lang="ja" className="text-3xl font-serif my-1 text-[#25231f]">
                      寿命
                    </strong>
                    {demoCardFlipped && (
                      <div className="mt-2 pt-2 border-t border-[#ebe6dc] text-xs space-y-1">
                        <p className="font-bold text-[#233c35]">umur; masa hidup (lifespan)</p>
                        <p lang="ja" className="text-[#5c5851]">
                          人間の<b>寿命</b>は短いんだね。
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                    <div className="rounded-lg bg-[#f9e5e1] py-1.5 text-[#b53d2a]">1 • Lupa</div>
                    <div className="rounded-lg bg-[#f6ebd8] py-1.5 text-[#9a6312]">2 • Sulit</div>
                    <div className="rounded-lg bg-[#e3f1e8] py-1.5 text-[#2f6b4f]">3 • Baik</div>
                    <div className="rounded-lg bg-[#e1ecf7] py-1.5 text-[#2b5b84]">4 • Mudah</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* 6 PILAR KEUNGGULAN SISTEM */}
      <section id="fitur" className="landing-section" style={{ paddingTop: "30px" }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">ARSITEKTUR &amp; FITUR LENGKAP</p>
            <h2>6 Pilar Utama 語楽 (GORAKU)</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-7">
          {PILLAR_CARDS.map((card) => (
            <article key={card.title} className="landing-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-[#f1e6df] text-[#c4543f] grid place-items-center">
                    <Icon name={card.icon} size={21} />
                  </span>
                  <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#a06658]">
                    {card.tag}
                  </span>
                </div>
                <h3 className="text-base font-serif font-bold mb-2">{card.title}</h3>
                <p className="text-xs text-[#6f6b63] leading-relaxed mb-4">{card.desc}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[#ebe6dc]">
                {card.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-md bg-[#f5f1e8] px-2 py-0.5 text-[10px] font-semibold text-[#494740]"
                  >
                    ✓ {h}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ALUR KERJA 4 LANGKAH IMMERSION */}
      <section id="cara-kerja" className="landing-section landing-dark">
        <div className="section-heading light">
          <div>
            <p className="eyebrow light">ALUR BELAJAR END-TO-END</p>
            <h2>4 Langkah Menguasai Kosakata dari Novel Asli</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Impor Kamus &amp; Deck</h3>
            <p>
              Unggah kamus ZIP Yomitan (seperti JMdict) di menu Kelola Kamus atau impor deck Anki <code>.apkg</code> milikmu.
            </p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Tambah Novel EPUB/TXT</h3>
            <p>
              Tarik berkas novel Jepang ke Perpustakaan. Buka dan baca dengan furigana serta posisi halaman yang tersimpan otomatis.
            </p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Klik Kata &amp; Tambang</h3>
            <p>
              Klik kata yang belum dikenal di dalam novel. Lihat arti kamus + deinflection, lalu klik <strong>Tambah ke Deck</strong>.
            </p>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <h3>Review SRS Harian</h3>
            <p>
              Ulas kartu jatuh tempo setiap hari lengkap dengan kalimat asli dari novel yang baru saja kamu baca.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ INTERAKTIF (ACCORDION) */}
      <section id="faq" className="landing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PERTANYAAN UMUM</p>
            <h2>Tanya Jawab Seputar 語楽</h2>
          </div>
        </div>
        <div className="space-y-3 mt-6 max-w-3xl mx-auto">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#e1ddd4] bg-[#fffdfa] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-serif font-bold text-sm text-[#25231f] hover:bg-[#f7f4ec] transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span className="text-[#c4543f] text-base font-sans">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[#5c5851] leading-relaxed border-t border-[#f0ece3] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-14 rounded-3xl bg-[#233c35] p-8 sm:p-10 text-center text-white shadow-xl">
          <p className="eyebrow light">MULAI PERJALANAN IMMERSION-MU</p>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mt-1 mb-3">
            Siap membaca novel Jepang pertamamu di 語楽?
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto mb-6">
            Langsung masuk ke dashboard, muat novel contoh <em>吾輩は猫である</em> dalam 1 klik, dan rasakan pengalaman Sentence Mining secara langsung.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to={user ? "/beranda" : "/login"}>
              <Button className="primary-light" style={{ padding: "12px 22px", fontSize: "12.5px" }}>
                <Icon name="arrow" size={18} /> {user ? "Buka Dashboard 語楽" : "Masuk & Mulai Belajar"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="brand">
          <span className="brand-mark">語</span>
          <span className="brand-copy">
            <strong>語楽</strong>
            <small>GORAKU</small>
          </span>
        </div>
        <p>© 2026 語楽 (GORAKU) — Aplikasi Belajar Bahasa Jepang Berbasis Immersion, Pembaca Novel, &amp; Sentence Mining.</p>
      </footer>
    </div>
  );
}
