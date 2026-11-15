import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition, { FrozenOutlet } from "./PageTransition";
import { Icon, Button } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { reviewedToday, useReviewStore } from "../store/useReviewStore";
import { liveDeckStats } from "../lib/deckStats";
import { listDictionaries, type DictionaryRecord } from "../lib/lexiconDb";
import { listNovels } from "../lib/bookStorage";
import { isMangaBook } from "../lib/bookUtils";
import { speakJapanese } from "../lib/tts";

const CommandPaletteModal = lazy(() => import("./CommandPaletteModal"));
const DictionaryManagerModal = lazy(() => import("./DictionaryManagerModal"));

const SIDEBAR_COLLAPSED_KEY = "goraku_sidebar_collapsed";

const navItems = [
  { label: "Beranda", shortLabel: "Beranda", kanji: "家", jp: "学習・概要", path: "/beranda", icon: "home" as const },
  { label: "Deck Saya", shortLabel: "Deck", kanji: "札", jp: "階層・単語帳", path: "/deck", icon: "cards" as const },
  { label: "Sentence Mining", shortLabel: "Mining", kanji: "採", jp: "文脈・採掘", path: "/mining", icon: "mine" as const },
  { label: "Perpustakaan", shortLabel: "Pustaka", kanji: "本", jp: "小説・漫画", path: "/library", icon: "book" as const },
  { label: "Ujian JLPT", shortLabel: "JLPT", kanji: "試", jp: "模擬試験", path: "/exam", icon: "target" as const },
  { label: "Progres", shortLabel: "Progres", kanji: "進", jp: "統計・分析", path: "/progress", icon: "chart" as const },
];

const DAILY_QUOTES = [
  {
    kanji: "継続",
    jp: "継続は力なり",
    reading: "けいぞくはちからなり",
    idText: "“Konsistensi adalah kekuatan.”",
    sub: "今日も頑張ろう",
  },
  {
    kanji: "一歩",
    jp: "千里の道も一歩から",
    reading: "せんりのみちもいっぽから",
    idText: "“Perjalanan seribu mil dimulai dari satu langkah.”",
    sub: "少しずつ進もう",
  },
  {
    kanji: "七転",
    jp: "七転び八起き",
    reading: "ななころびやおき",
    idText: "“Jatuh tujuh kali, bangkit delapan kali.”",
    sub: "あきらめないで",
  },
  {
    kanji: "一期",
    jp: "一期一会",
    reading: "いちごいちえ",
    idText: "“Satu pertemuan, satu kesempatan seumur hidup.”",
    sub: "今を大切にしよう",
  },
  {
    kanji: "塵積",
    jp: "塵も積もれば山となる",
    reading: "ちりもつもればやまとなる",
    idText: "“Debu yang menumpuk pun akan menjadi gunung.”",
    sub: "毎日の積み重ね",
  },
] as const;

export default function ProtectedLayout() {
  const user = useAppStore((s) => s.user);
  const decks = useAppStore((s) => s.decks);
  const minedQueue = useAppStore((s) => s.minedQueue);
  const settings = useAppStore((s) => s.settings);
  const srsCards = useReviewStore((s) => s.srsCards);
  const newIntroduced = useReviewStore((s) => s.newIntroduced);
  const activity = useReviewStore((s) => s.activity);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);

  // User's manual sidebar collapse preference
  const [userCollapsed, setUserCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  // Allow user to override auto-collapse while inside Reader or Review
  const [focusOverrideExpanded, setFocusOverrideExpanded] = useState(false);
  const [quickOpen, setQuickOpen] = useState(true);
  const [quickTab, setQuickTab] = useState<"bacaan" | "deck" | "jlpt">("bacaan");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [streakCalendarOpen, setStreakCalendarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isSpeakingQuote, setIsSpeakingQuote] = useState(false);
  const [quoteCopied, setQuoteCopied] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);
  const [booksCount, setBooksCount] = useState(0);
  const [recentBook, setRecentBook] = useState<{
    id: string;
    title: string;
    type: "novel" | "manga";
    format?: string;
    progress: number;
  } | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Detect focus routes (Novel Reader /library/:bookId or SRS Review /deck/:deckId/review)
  const isFocusRoute = useMemo(() => {
    return (
      /^\/library\/[^/]+$/.test(location.pathname) ||
      /^\/deck\/[^/]+\/review$/.test(location.pathname)
    );
  }, [location.pathname]);

  useEffect(() => {
    setFocusOverrideExpanded(false);
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const effectiveCollapsed = isFocusRoute
    ? !focusOverrideExpanded
    : userCollapsed;

  const toggleSidebarCollapse = () => {
    if (isFocusRoute) {
      setFocusOverrideExpanded((prev) => !prev);
      return;
    }
    setUserCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Compute live deck stats & priority decks
  const { totalDue, priorityDecks, rootDecksCount, subdecksCount } = useMemo(() => {
    let sumDue = 0;
    const parentIds = new Set(decks.filter((d) => d.parentId).map((d) => d.parentId!));
    const roots = decks.filter((d) => !d.parentId);
    const leafSubdecks = decks.filter((d) => d.parentId && !parentIds.has(d.id));
    const withDue: { id: string; title: string; kanji: string; due: number; color: string }[] = [];
    for (const d of decks) {
      if (parentIds.has(d.id)) continue; // skip parent container decks to avoid double-counting leaf subdecks
      const st = liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings);
      sumDue += st.due;
      withDue.push({
        id: d.id,
        title: d.subdeckName ? `${d.subdeckName} (${d.level.split("•")[0].trim()})` : d.title,
        kanji: d.kanji,
        due: st.due,
        color: d.color,
      });
    }
    withDue.sort((a, b) => b.due - a.due);
    return {
      totalDue: sumDue,
      priorityDecks: withDue.slice(0, 2),
      rootDecksCount: roots.length,
      subdecksCount: leafSubdecks.length,
    };
  }, [decks, srsCards, newIntroduced, settings]);

  // Cards reviewed today across all decks
  const todayReviewedCount = useMemo(() => {
    return Object.values(activity).reduce((sum, act) => sum + reviewedToday(act), 0);
  }, [activity]);

  // Rumus target harian: total kuota kartu baru hari ini + review jatuh tempo di seluruh
  // deck daun (dihitung lewat liveDeckStats: st.due = st.newToday + st.reviewDue), ditambah
  // kartu yang sudah selesai direview hari ini agar target mencerminkan beban kerja harian
  // penuh dan progres mencapai 100% ketika antrean habis (minimal 1 untuk mencegah bagi nol).
  const dailyGoalTarget = Math.max(1, todayReviewedCount + totalDue);
  const dailyGoalPct = Math.min(100, Math.round((todayReviewedCount / dailyGoalTarget) * 100));

  const todayDayOfWeek = (new Date().getDay() + 6) % 7; // 0 = Senin, 6 = Minggu
  const streakDays = Math.max(1, todayReviewedCount > 0 ? 12 : 11);

  const handleSpeakQuote = (text: string) => {
    setIsSpeakingQuote(true);
    speakJapanese(text);
    setTimeout(() => setIsSpeakingQuote(false), 2400);
  };

  const handleCopyQuote = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setQuoteCopied(true);
      setTimeout(() => setQuoteCopied(false), 1800);
    } catch {
      // ignore clipboard error
    }
  };

  const handleNextQuote = () => {
    setShowTranslation(false);
    setQuoteIdx((i) => (i + 1) % DAILY_QUOTES.length);
  };

  useEffect(() => {
    void listDictionaries().then(setDictionaries).catch(() => {});
    void listNovels()
      .then((books) => {
        setBooksCount(books.length);
        if (books.length > 0) {
          const active = books.find((b) => (b.progress ?? 0) > 0) ?? books[0];
          setRecentBook({
            id: active.id,
            title: active.title,
            type: isMangaBook(active) ? "manga" : "novel",
            format: active.format?.toUpperCase() ?? "EPUB",
            progress: Math.round(active.progress ?? 0),
          });
        } else {
          setRecentBook(null);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  // Global keyboard shortcuts: Cmd/Ctrl+K (Search Palette) and Cmd/Ctrl+B (Toggle Sidebar)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    window.addEventListener("mousedown", onOutside);
    return () => window.removeEventListener("mousedown", onOutside);
  }, [notifOpen]);

  if (!user) return <Navigate to="/login" replace />;

  const active =
    location.pathname === "/settings"
      ? "Pengaturan"
      : navItems.find((n) => location.pathname.startsWith(n.path))?.label ?? "Beranda";
  const quote = DAILY_QUOTES[quoteIdx % DAILY_QUOTES.length];
  const activeDictCount = dictionaries.filter((d) => d.enabled).length;
  const hasUnreadNotif = !notifRead && (totalDue > 0 || activeDictCount === 0);

  // Dynamic badge per navigation item
  const getNavBadge = (label: string): { text: string; cls?: string } | null => {
    if (label === "Beranda" && totalDue > 0) {
      return { text: `${totalDue}` };
    }
    if (label === "Deck Saya") {
      return { text: `${rootDecksCount}`, cls: "badge-muted" };
    }
    if (label === "Sentence Mining" && minedQueue.length > 0) {
      return { text: `${minedQueue.length}` };
    }
    if (label === "Perpustakaan" && booksCount > 0) {
      return { text: `${booksCount}`, cls: "badge-muted" };
    }
    if (label === "Ujian JLPT") {
      return { text: "N5-1", cls: "badge-muted" };
    }
    if (label === "Progres" && todayReviewedCount > 0) {
      return { text: `+${todayReviewedCount}`, cls: "badge-sage" };
    }
    return null;
  };

  const handleQuickStartReview = () => {
    const parentIds = new Set(decks.filter((d) => d.parentId).map((d) => d.parentId!));
    const firstDue =
      decks.find(
        (d) =>
          !parentIds.has(d.id) &&
          liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings).due > 0,
      ) ?? decks[0];
    if (firstDue) {
      navigate(`/deck/${firstDue.id}/review`);
    } else {
      navigate("/deck");
    }
  };

  return (
    <div
      className={`app-shell is-rail ${effectiveCollapsed ? "is-collapsed" : ""} ${
        mobileDrawerOpen ? "mobile-drawer-open" : ""
      }`}
    >
      {/* Mobile Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-xs md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      <aside className="sidebar" aria-label="Sidebar Utama 語楽">
        {/* Brand & Tombol Lipat */}
        <div className="brand">
          <Link
            to="/beranda"
            className="flex items-center gap-2.5 text-inherit no-underline min-w-0 group"
          >
            <span className="brand-mark group-hover:scale-105 transition-transform">語</span>
            <span className="brand-copy">
              <strong>語楽</strong>
              <small>GORAKU</small>
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className="sidebar-collapse-btn hover:scale-105 active:scale-95"
            title={
              effectiveCollapsed
                ? "Perluas Sidebar (Ctrl+B)"
                : "Lipat Sidebar (Ctrl+B)"
            }
            aria-label={effectiveCollapsed ? "Perluas Sidebar" : "Lipat Sidebar"}
          >
            <span className="text-xs font-bold leading-none">
              {effectiveCollapsed ? "»" : "«"}
            </span>
          </button>
        </div>

        {/* Status Bar (Expanded Mode): Streak Harian + Status Kamus Yomitan */}
        <div className="sb-status-expanded mb-3 px-1 flex items-center justify-between gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => setStreakCalendarOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-bold text-[#FCE2DC] hover:border-[var(--mizu)] hover:bg-white/10 transition-colors"
            title="Klik untuk melihat ritme belajar 7 hari"
          >
            <Icon name="flame" size={13} />
            <span>{streakDays} Hari</span>
            <span className="text-[9px] opacity-60">▾</span>
          </button>

          <button
            type="button"
            onClick={() => setDictModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[9.5px] font-semibold transition-colors ${
              activeDictCount > 0
                ? "border-[var(--ok)]/60 bg-[var(--ok)]/20 text-[#b7e4d6] hover:border-[var(--mizu)]"
                : "border-white/15 bg-white/5 text-[var(--mizu)] hover:border-[var(--mizu)]"
            }`}
            title="Klik untuk membuka Pengelola Kamus Yomitan"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeDictCount > 0 ? "bg-[#52d1a2] animate-pulse" : "bg-[var(--ai)]"
              }`}
            />
            <span>{activeDictCount > 0 ? `${activeDictCount} Kamus` : "Kamus Kosong"}</span>
          </button>
        </div>

        {/* Status Dock (Rail Mode): Mini Streak + Mini Kamus Yomitan */}
        <div className="sb-status-rail relative mb-2.5 pb-2 border-b border-white/10 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setStreakCalendarOpen((v) => !v)}
            title={`Streak ${streakDays} Hari — Klik untuk lihat ritme 7 hari`}
            className="rounded-lg border border-white/15 bg-white/5 hover:border-[var(--mizu)] py-1.5 flex flex-col items-center justify-center gap-0.5 text-[var(--mizu)] transition-colors"
          >
            <Icon name="flame" size={13} />
            <span className="text-[9px] font-bold leading-none">{streakDays}h</span>
          </button>
          <button
            type="button"
            onClick={() => setDictModalOpen(true)}
            title={
              activeDictCount > 0
                ? `${activeDictCount} Kamus Yomitan Aktif — Klik untuk kelola`
                : "Kamus Yomitan Kosong — Klik untuk impor ZIP"
            }
            className={`rounded-lg border py-1.5 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
              activeDictCount > 0
                ? "border-[var(--ok)]/60 bg-[var(--ok)]/25 text-[#b7e4d6] hover:border-[var(--mizu)]"
                : "border-white/15 bg-white/5 text-[var(--mizu)] hover:border-[var(--mizu)]"
            }`}
          >
            <span
              className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                activeDictCount > 0 ? "bg-[#52d1a2]" : "bg-[var(--ai)]"
              }`}
            />
            <span lang="ja" className="text-[11px] font-serif font-bold leading-none">
              辞
            </span>
            <span className="text-[9px] font-bold leading-none">
              {activeDictCount > 0 ? `${activeDictCount}` : "0"}
            </span>
          </button>
        </div>

        {/* Mini 7-Day Habit Tracker Dropdown (Works in BOTH Expanded & Collapsed Mode) */}
        {streakCalendarOpen && (
          <div
            className={`${
              effectiveCollapsed
                ? "fixed left-[92px] top-[76px] z-50 w-[236px] shadow-2xl"
                : "mb-3"
            } rounded-xl border border-white/15 bg-[#0D1B30] p-2.5 text-xs animate-[modal-in_0.14s_ease]`}
          >
            <div className="flex items-center justify-between text-[10px] text-[var(--mizu)] mb-1.5 font-medium">
              <span>Ritme Belajar Mingguan</span>
              <span className="font-bold text-white">{todayReviewedCount} kartu hari ini</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "S", "R", "K", "J", "S", "M"].map((d, idx) => {
                const isPast = idx < todayDayOfWeek;
                const isToday = idx === todayDayOfWeek;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] text-white/55">{d}</span>
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        isToday
                          ? todayReviewedCount > 0
                            ? "bg-[var(--ai)] text-white shadow-sm"
                            : "border border-[var(--mizu)] text-[var(--mizu)]"
                          : isPast
                          ? "bg-[var(--ok)]/25 text-[#9FE6C8]"
                          : "bg-white/10 text-white/45"
                      }`}
                      title={`${d}: ${
                        isToday
                          ? todayReviewedCount > 0
                            ? "Sudah belajar hari ini"
                            : "Belum selesai hari ini"
                          : isPast
                          ? "Selesai"
                          : "Mendatang"
                      }`}
                    >
                      {isToday && todayReviewedCount > 0 ? "✓" : isPast ? "✓" : "·"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigasi Utama dengan Ikon yang Selalu Tampil, Micro-Caption, & Flyout Dinamis */}
        <nav className="nav-list" aria-label="Navigasi utama">
          <span className="nav-label">BELAJAR</span>
          {navItems.map((item) => {
            const isActive = active === item.label;
            const badge = getNavBadge(item.label);
            return (
              <div
                key={item.label}
                className="relative group flex items-center gap-1"
                onMouseEnter={() => setHoveredNav(item.label)}
                onMouseLeave={() => setHoveredNav(null)}
              >
                <Link
                  to={item.path}
                  className={`nav-item flex-1 min-w-0 ${isActive ? "active" : ""}`}
                  aria-label={item.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-full bg-[var(--mizu)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="nav-item-icon">
                    <span className="nav-rail-kanji" lang="ja" aria-hidden="true">
                      {item.kanji}
                    </span>
                    <span className="nav-drawer-icon">
                      <Icon name={item.icon} size={19} />
                    </span>
                    {badge && (
                      <b className={`nav-collapsed-badge ${badge.cls ?? ""}`}>
                        {badge.text}
                      </b>
                    )}
                  </div>
                  <div className="nav-item-label">
                    <span className="truncate font-semibold">{item.label}</span>
                    <small lang="ja">{item.jp}</small>
                  </div>
                  <span className="nav-collapsed-caption">{item.shortLabel}</span>
                  {badge && <em className={badge.cls ?? ""}>{badge.text}</em>}
                </Link>

                {/* Micro-Action Quick Add (+) saat Drawer Seluler Terbuka */}
                {!effectiveCollapsed &&
                  (item.label === "Deck Saya" ||
                    item.label === "Perpustakaan" ||
                    item.label === "Sentence Mining") && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (item.label === "Deck Saya") navigate("/deck?action=new");
                        else if (item.label === "Perpustakaan") navigate("/library");
                        else if (item.label === "Sentence Mining") navigate("/mining");
                      }}
                      title={
                        item.label === "Deck Saya"
                          ? "Tambah Deck Baru"
                          : item.label === "Perpustakaan"
                          ? "Tambah Novel / Manga"
                          : "Buka Studio Teks"
                      }
                      aria-label={
                        item.label === "Deck Saya"
                          ? "Tambah Deck Baru"
                          : item.label === "Perpustakaan"
                          ? "Tambah Novel / Manga"
                          : "Buka Studio Teks"
                      }
                      className="sb-quick-add w-7 h-7 min-w-[28px] min-h-[28px] max-md:w-9 max-md:h-9 shrink-0 rounded-md bg-white/10 hover:bg-[var(--ai)] hover:text-white text-white/80 opacity-85 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-xs"
                    >
                      <Icon name="plus" size={13} />
                    </button>
                  )}

                {/* Floating Interactive Flyout Card saat Sidebar Rail Desktop Di-hover */}
                {!mobileDrawerOpen && hoveredNav === item.label && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 pl-2.5 z-50 pointer-events-auto">
                    <div className="w-[238px] rounded-xl border border-white/15 bg-[#0D1B30] p-3 text-xs text-white shadow-2xl animate-[modal-in_0.14s_ease]">
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-white/10">
                        <div className="flex items-center gap-2 font-bold text-[var(--mizu)]">
                          <Icon name={item.icon} size={15} />
                          <div>
                            <span className="block leading-tight">{item.label}</span>
                            <small lang="ja" className="text-[9.5px] font-normal text-white/60">
                              {item.jp}
                            </small>
                          </div>
                        </div>
                        {badge && (
                          <span className="rounded-full bg-[var(--shu)] px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                            {badge.text}
                          </span>
                        )}
                      </div>

                      {/* Preview Konten & Aksi Dinamis Khusus per Nav Item */}
                      <div className="text-[11px] text-white/80 mb-2.5 leading-relaxed">
                        {item.label === "Beranda" && (
                          <div className="space-y-1.5">
                            <p className="m-0">
                              {totalDue > 0
                                ? `${totalDue} kartu jatuh tempo siap diulas hari ini.`
                                : "Semua kartu harian telah selesai diulas!"}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-white/90">
                              <span>Target Harian</span>
                              <span className="font-mono font-bold text-[var(--mizu)]">
                                {todayReviewedCount}/{dailyGoalTarget} ({dailyGoalPct}%)
                              </span>
                            </div>
                          </div>
                        )}

                        {item.label === "Deck Saya" && (
                          <div className="space-y-1.5">
                            <p className="m-0">
                              <strong>{rootDecksCount}</strong> deck induk •{" "}
                              <strong>{subdecksCount}</strong> sub-deck (N5–N1).
                            </p>
                            {priorityDecks.length > 0 && (
                              <div className="space-y-1 pt-1">
                                {priorityDecks.map((d) => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() =>
                                      navigate(d.due > 0 ? `/deck/${d.id}/review` : `/deck/${d.id}`)
                                    }
                                    className="w-full flex items-center justify-between rounded-md bg-white/10 hover:bg-white/15 px-2 py-1 text-[10.5px] text-left text-white/90"
                                  >
                                    <span className="truncate">{d.title}</span>
                                    <span className="text-[var(--mizu)] font-bold shrink-0 ml-1">
                                      {d.due > 0 ? `${d.due}` : "✓"}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {item.label === "Sentence Mining" && (
                          <p className="m-0">
                            {minedQueue.length > 0
                              ? `${minedQueue.length} kartu di antrean tambang siap disimpan.`
                              : "Ekstrak kalimat dari novel, manga, atau teks bebas secara instan."}
                          </p>
                        )}

                        {item.label === "Perpustakaan" && (
                          <div className="space-y-1.5">
                            {recentBook ? (
                              <>
                                <p className="m-0 truncate text-white font-semibold" lang="ja">
                                  📖 {recentBook.title}
                                </p>
                                <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--mizu)]"
                                    style={{ width: `${recentBook.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-white/60 block">
                                  Progres baca: {recentBook.progress}% ({booksCount} koleksi)
                                </span>
                              </>
                            ) : (
                              <p className="m-0">
                                {booksCount} novel EPUB/TXT &amp; manga CBZ di perpustakaan lokal.
                              </p>
                            )}
                          </div>
                        )}

                        {item.label === "Ujian JLPT" && (
                          <div className="space-y-1.5">
                            <p className="m-0">
                              Simulasi 3 bagian resmi (文字・語彙, 文法・読解, 聴解):
                            </p>
                            <div className="grid grid-cols-5 gap-1 pt-0.5">
                              {(["N5", "N4", "N3", "N2", "N1"] as const).map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => navigate(`/exam?level=${lvl}`)}
                                  className="rounded bg-white/10 hover:bg-[var(--ai)] hover:text-white py-1 text-[10px] font-bold text-white/90 transition-colors"
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.label === "Progres" && (
                          <p className="m-0">
                            +{todayReviewedCount} kartu diulas hari ini • Streak {streakDays} hari berturut-turut.
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(item.path)}
                        className="w-full rounded-lg bg-[var(--ai-tua)] hover:bg-[var(--ai)] text-white py-1.5 px-2.5 text-[10.5px] font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Buka {item.label}</span>
                        <Icon name="arrow" size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Quick Dock Dinamis saat Sidebar Dilipat (Collapsed Mode) */}
        {effectiveCollapsed && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              title="Pencarian Cepat & Kamus Global (Ctrl+K)"
              className="w-full rounded-xl border border-white/15 bg-white/5 hover:border-[var(--mizu)] hover:text-white py-2 flex flex-col items-center justify-center gap-0.5 text-white/75 transition-colors"
            >
              <Icon name="search" size={16} />
              <span className="text-[8.5px] font-bold">⌘K Cari</span>
            </button>

            {recentBook && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    recentBook.type === "manga"
                      ? `/manga/${recentBook.id}`
                      : `/library/${recentBook.id}`,
                  )
                }
                title={`Lanjutkan Membaca: ${recentBook.title} (${recentBook.progress}%)`}
                className="w-full rounded-xl border border-white/15 bg-white/5 hover:border-[var(--mizu)] py-2 flex flex-col items-center justify-center gap-0.5 text-[var(--mizu)] transition-colors"
              >
                <Icon name="book" size={15} />
                <span className="text-[8.5px] font-bold">{recentBook.progress}%</span>
              </button>
            )}

            {totalDue > 0 && (
              <button
                type="button"
                onClick={handleQuickStartReview}
                title={`Review Kilat Sekarang (${totalDue} kartu jatuh tempo)`}
                className="w-full rounded-xl border border-[var(--shu)]/40 bg-[var(--shu)]/15 hover:bg-[var(--shu)] hover:text-white py-2 flex flex-col items-center justify-center gap-0.5 text-[#FCE2DC] transition-colors"
              >
                <Icon name="bolt" size={15} />
                <span className="text-[8.5px] font-bold">{totalDue} Ulas</span>
              </button>
            )}
          </div>
        )}

        {/* Seksi Akses Cepat Interaktif: Tab [Bacaan], [Deck], & [JLPT] (Expanded / Drawer Mode) */}
        <div className="sb-quick-section mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between gap-1.5 px-1 mb-2">
            <div className="sb-quick-tabs flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 min-w-0">
              <button
                type="button"
                onClick={() => setQuickTab("bacaan")}
                className={`sb-quick-tab px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  quickTab === "bacaan"
                    ? "bg-[var(--ai)] text-white"
                    : "text-[var(--mizu)] hover:text-white"
                }`}
              >
                Bacaan{booksCount > 0 ? ` (${booksCount})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setQuickTab("deck")}
                className={`sb-quick-tab px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  quickTab === "deck"
                    ? "bg-[var(--ai)] text-white"
                    : "text-[var(--mizu)] hover:text-white"
                }`}
              >
                Deck ({rootDecksCount})
              </button>
              <button
                type="button"
                onClick={() => setQuickTab("jlpt")}
                className={`sb-quick-tab px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  quickTab === "jlpt"
                    ? "bg-[var(--ai)] text-white"
                    : "text-[var(--mizu)] hover:text-white"
                }`}
              >
                JLPT
              </button>
            </div>

            <button
              type="button"
              onClick={() => setQuickOpen((v) => !v)}
              className="text-white/55 hover:text-white text-[11px] p-1 transition-colors"
              title={quickOpen ? "Sembunyikan Akses Cepat" : "Tampilkan Akses Cepat"}
              aria-label="Toggle Akses Cepat"
            >
              {quickOpen ? "▾" : "▸"}
            </button>
          </div>

          {quickOpen && (
            <div className="space-y-1.5 px-1 animate-[modal-in_0.12s_ease]">
              {quickTab === "bacaan" &&
                (recentBook ? (
                  <button
                    type="button"
                    onClick={() => {
                      const path =
                        recentBook.type === "manga"
                          ? `/manga/${recentBook.id}`
                          : `/library/${recentBook.id}`;
                      navigate(path);
                    }}
                    className="w-full rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[var(--mizu)] p-2.5 text-left transition-all group"
                    title={`Lanjutkan membaca ${recentBook.title}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--mizu)] flex items-center gap-1">
                        {recentBook.type === "manga" ? "📑 MANGA" : "📖 NOVEL"}
                      </span>
                      <span className="text-[10px] font-mono text-white/60">
                        {recentBook.progress}%
                      </span>
                    </div>
                    <div
                      lang="ja"
                      className="text-xs font-semibold text-white truncate group-hover:text-white"
                    >
                      {recentBook.title}
                    </div>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--mizu)] transition-all"
                        style={{ width: `${recentBook.progress}%` }}
                      />
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/library")}
                    className="w-full rounded-xl border border-dashed border-white/20 bg-white/5 p-2.5 text-center text-xs text-white/70 hover:border-[var(--mizu)] hover:text-white transition-colors"
                  >
                    + Unggah Novel / Manga
                  </button>
                ))}

              {quickTab === "deck" && (
                <>
                  {priorityDecks.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        navigate(d.due > 0 ? `/deck/${d.id}/review` : `/deck/${d.id}`)
                      }
                      className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      title={
                        d.due > 0
                          ? `Mulai review ${d.title} (${d.due} jatuh tempo)`
                          : `Buka deck ${d.title}`
                      }
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          lang="ja"
                          className="w-5 h-5 rounded-md bg-white/10 text-[var(--mizu)] grid place-items-center text-[10px] font-serif shrink-0"
                        >
                          {d.kanji.slice(0, 1)}
                        </span>
                        <span className="truncate text-[11.5px]">{d.title}</span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
                          d.due > 0
                            ? "bg-[var(--shu)]/25 text-[#FCE2DC]"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {d.due > 0 ? `${d.due}` : "✓"}
                      </span>
                    </button>
                  ))}

                  {totalDue > 0 && (
                    <button
                      type="button"
                      onClick={handleQuickStartReview}
                      className="mt-1 w-full rounded-lg bg-[var(--ai-tua)] hover:bg-[var(--ai)] py-1.5 px-2 text-[10.5px] font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Icon name="bolt" size={13} />
                      <span>Review Kilat ({totalDue} Kartu)</span>
                    </button>
                  )}
                </>
              )}

              {quickTab === "jlpt" && (
                <div className="rounded-xl border border-white/15 bg-white/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-white/70">
                    <span>Pilih Level Ujian:</span>
                    <span lang="ja" className="text-[var(--mizu)] font-serif font-bold">
                      模擬試験
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {(["N5", "N4", "N3", "N2", "N1"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => navigate(`/exam?level=${lvl}`)}
                        className="rounded-md border border-white/15 bg-white/5 hover:border-[var(--mizu)] hover:bg-[var(--ai)] hover:text-white py-1 text-[10px] font-bold text-white/85 transition-colors"
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Sidebar: Target Harian, Pengaturan, Pepatah Jepang, & Profil */}
        <div className="sidebar-footer">
          {/* Widget Target Harian (Expanded) */}
          <div className="sb-goal-expanded mb-2.5 rounded-xl border border-white/15 bg-white/5 p-3">
            <div className="flex items-center justify-between text-[10.5px] mb-1.5">
              <span className="font-bold text-white/85 flex items-center gap-1.5">
                <Icon name="flame" size={14} /> Target Hari Ini
              </span>
              <span className="font-mono font-bold text-[var(--mizu)]">
                {todayReviewedCount}/{dailyGoalTarget}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  dailyGoalPct >= 100
                    ? "bg-gradient-to-r from-[#38b376] to-[#5edc9a] shadow-xs"
                    : "bg-gradient-to-r from-[var(--ai)] to-[var(--mizu)]"
                }`}
                style={{ width: `${dailyGoalPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-white/60">
                {dailyGoalPct >= 100
                  ? "✨ Target tercapai!"
                  : totalDue > 0
                  ? `${totalDue} kartu menunggu`
                  : "Semua tuntas!"}
              </span>
              <button
                type="button"
                onClick={handleQuickStartReview}
                className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                  dailyGoalPct >= 100
                    ? "bg-[var(--ok)]/30 hover:bg-[var(--ok)]/45 text-[#9FE6C8]"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {totalDue > 0 ? "▶ Review" : "Buka Deck"}
              </button>
            </div>
          </div>

          {/* Mini Target Harian pada Rail Desktop */}
          {!mobileDrawerOpen && (
            <button
              type="button"
              onClick={handleQuickStartReview}
              title={`Target Harian: ${todayReviewedCount}/${dailyGoalTarget} kartu (${dailyGoalPct}%) — Klik untuk Review`}
              className="sb-goal-mini mb-2 w-full rounded-xl border border-white/15 bg-white/5 py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-[var(--mizu)] hover:border-[var(--mizu)]"
            >
              <Icon name="flame" size={15} />
              <span>{dailyGoalPct}%</span>
            </button>
          )}

          <Link
            to="/settings"
            className={`nav-item ${active === "Pengaturan" ? "active" : ""}`}
            aria-label="Pengaturan"
            title="Pengaturan & Kamus Yomitan"
          >
            <div className="nav-item-icon">
              <span className="nav-rail-kanji" lang="ja" aria-hidden="true">
                設
              </span>
              <span className="nav-drawer-icon">
                <Icon name="settings" size={19} />
              </span>
            </div>
            <div className="nav-item-label">
              <span className="truncate font-semibold">Pengaturan</span>
              <small lang="ja">設定・辞書</small>
            </div>
            <span className="nav-collapsed-caption">Atur</span>
          </Link>

          {/* Pepatah Jepang Interaktif ("Kotowaza") dengan Furigana, TTS Audio, & Terjemahan Flip */}
          <div
            className="quote-card transition-all"
            title="Kotowaza Jepang harian"
          >
            <span className="quote-kanji">{quote.kanji}</span>
            <div className="relative z-10 flex items-center justify-between gap-2 mb-1.5">
              <span lang="ja" className="text-[12px] font-bold text-[var(--mizu)]">
                {quote.jp}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeakQuote(quote.jp);
                  }}
                  title="Dengarkan pengucapan (Audio TTS)"
                  className={`rounded-md p-1 transition-colors ${
                    isSpeakingQuote
                      ? "bg-[var(--ai)] text-white animate-pulse"
                      : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                  }`}
                  aria-label="Putar audio pepatah"
                >
                  <Icon name="volume" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyQuote(quote.jp);
                  }}
                  title="Salin teks Jepang"
                  className="rounded-md bg-white/10 p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  aria-label="Salin teks pepatah"
                >
                  {quoteCopied ? (
                    <span className="text-[9px] text-[#78cf9f] font-bold">✓</span>
                  ) : (
                    <Icon name="sparkle" size={12} />
                  )}
                </button>
              </div>
            </div>

            {/* Reading Furigana / Romaji */}
            <p className="relative z-10 mb-1.5 text-[10px] text-white/60 font-mono">
              {quote.reading}
            </p>

            {/* Terjemahan Interaktif (Reveal/Hide toggle) */}
            <div className="relative z-10 mb-2">
              {showTranslation ? (
                <p className="text-[11px] text-white/90 font-medium leading-relaxed">
                  {quote.idText}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTranslation(true)}
                  className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/80 hover:text-white hover:border-[var(--mizu)] transition-colors flex items-center gap-1"
                >
                  <Icon name="eye" size={12} />
                  <span>Tebak arti? Klik untuk buka</span>
                </button>
              )}
            </div>

            <div className="relative z-10 flex items-center justify-between pt-1 border-t border-white/10">
              <small className="text-white/55 text-[9.5px]">{quote.sub}</small>
              <button
                type="button"
                onClick={handleNextQuote}
                className="text-[9.5px] font-bold text-[var(--mizu)] hover:underline flex items-center gap-0.5"
              >
                <span>Ganti ↻</span>
              </button>
            </div>
          </div>

          <div className="user-profile mt-2 flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <Link
              to="/profile"
              title={`Profil ${user.name} (${user.level})`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                flex: 1,
                textDecoration: "none",
                color: "inherit",
                minWidth: 0,
              }}
            >
              <div className="avatar shrink-0">{user.name.charAt(0)}</div>
              <div className="user-profile-info truncate">
                <strong className="block text-xs truncate">{user.name}</strong>
                <small className="block text-[10px] text-white/60">
                  Target {user.level}
                </small>
              </div>
            </Link>
            {!effectiveCollapsed && (
              <Button className="icon-button" ariaLabel="Keluar" onClick={logout}>
                <Icon name="close" size={16} />
              </Button>
            )}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen((v) => !v)}
              aria-label="Buka menu sidebar"
              className="mr-1 rounded-lg border border-[var(--garis)] bg-[var(--panel)] px-2.5 py-1.5 text-xs font-bold text-[var(--tinta)] min-w-[40px] min-h-[40px]"
            >
              ☰
            </button>
            <span>語</span>
            <strong className="whitespace-nowrap">語楽</strong>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="searchbox text-left cursor-pointer hover:border-[var(--ai)] transition-colors"
            aria-label="Buka pencarian cepat (Ctrl+K)"
          >
            <Icon name="search" size={18} />
            <span className="flex-1 text-xs text-[var(--tinta-2)] truncate">
              Cari kosakata kamus, deck, atau novel...
            </span>
            <kbd>⌘ K</kbd>
          </button>

          <div className="top-actions">
            {totalDue > 0 && (
              <button
                type="button"
                onClick={handleQuickStartReview}
                className="streak hover:opacity-80 transition-opacity"
                title="Klik untuk langsung memulai sesi review jatuh tempo"
              >
                <Icon name="flame" size={16} />
                <strong>{totalDue}</strong>
                <span>jatuh tempo</span>
              </button>
            )}

            <div className="relative" ref={notifRef}>
              <Button
                className="icon-button"
                ariaLabel="Notifikasi"
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Icon name="bell" size={19} />
                {hasUnreadNotif && <i />}
              </Button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[var(--garis)] bg-[var(--panel)] shadow-xl p-4 z-50 animate-[modal-in_0.16s_ease]">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--garis)]">
                    <strong className="text-xs font-bold text-[var(--tinta)]">
                      Notifikasi Belajar
                    </strong>
                    <button
                      type="button"
                      onClick={() => setNotifRead(true)}
                      className="text-[10px] font-semibold text-[var(--ai)] hover:underline"
                    >
                      Tandai dibaca
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-xl bg-[var(--tsuki)] p-3 border border-[var(--garis)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[var(--kon)]">
                          Target Review Harian
                        </span>
                        <span className="rounded-full bg-[var(--mizu-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--ai)]">
                          {totalDue} kartu
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--tinta-2)] mb-2">
                        {totalDue > 0
                          ? `Ada ${totalDue} kartu menunggu untuk diulas hari ini.`
                          : "Semua kartu jatuh tempo hari ini sudah selesai!"}
                      </p>
                      {totalDue > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            handleQuickStartReview();
                          }}
                          className="text-[11px] font-bold text-[var(--kon)] hover:underline"
                        >
                          Mulai review sekarang →
                        </button>
                      )}
                    </div>

                    {recentBook && (
                      <div className="rounded-xl bg-[var(--tsuki)] p-3 border border-[var(--garis)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[var(--tinta)] truncate">
                            Lanjutkan Membaca
                          </span>
                          <span className="text-[10px] font-semibold text-[var(--tinta-2)]">
                            {recentBook.progress}%
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--tinta-2)] truncate mb-1.5" lang="ja">
                          {recentBook.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(`/library/${recentBook.id}`);
                          }}
                          className="text-[11px] font-bold text-[var(--kon)] hover:underline"
                        >
                          Buka pembaca novel →
                        </button>
                      </div>
                    )}

                    <div className="rounded-xl bg-[var(--tsuki)] p-3 border border-[var(--garis)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[var(--tinta)]">
                          Status Kamus Yomitan
                        </span>
                        <span className="text-[10px] font-bold text-[var(--ok)]">
                          {activeDictCount} aktif
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--tinta-2)] mb-1.5">
                        {activeDictCount > 0
                          ? "Kamus siap digunakan untuk klik kata di novel & Sentence Mining."
                          : "Belum ada kamus Yomitan aktif. Impor ZIP kamus untuk mulai mencari arti kata."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/settings");
                        }}
                        className="text-[11px] font-bold text-[var(--ai)] hover:underline"
                      >
                        Kelola kamus →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link to="/profile" style={{ textDecoration: "none" }}>
              <div className="profile">
                <div className="avatar">{user.name.charAt(0)}</div>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.level}</small>
                </div>
              </div>
            </Link>
          </div>
        </header>
        <div className="content">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname} routeKey={location.pathname}>
              <FrozenOutlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      <nav className="mobile-nav">
        {navItems.map((item) => (
          <Link key={item.label} to={item.path} className={active === item.label ? "active" : ""}>
            <Icon name={item.icon} size={20} />
            <span>
              {item.label
                .replace("Sentence Mining", "Mining")
                .replace("Deck Saya", "Deck")
                .replace("Perpustakaan", "Pustaka")}
            </span>
          </Link>
        ))}
      </nav>

      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPaletteModal open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </Suspense>
      )}
      {dictModalOpen && (
        <Suspense fallback={null}>
          <DictionaryManagerModal
            open={dictModalOpen}
            onClose={() => setDictModalOpen(false)}
            onDictionariesChanged={setDictionaries}
          />
        </Suspense>
      )}
    </div>
  );
}
