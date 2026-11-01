import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition, { FrozenOutlet } from "./PageTransition";
import CommandPaletteModal from "./CommandPaletteModal";
import { Icon, Button } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { reviewedToday, useReviewStore } from "../store/useReviewStore";
import { liveDeckStats } from "../lib/deckStats";
import { listDictionaries, type DictionaryRecord } from "../lib/lexiconDb";
import { listNovels } from "../lib/bookStorage";
import { speakJapanese } from "../lib/tts";

const SIDEBAR_COLLAPSED_KEY = "goraku_sidebar_collapsed";

const navItems = [
  { label: "Beranda", path: "/beranda", icon: "home" as const },
  { label: "Deck Saya", path: "/deck", icon: "cards" as const },
  { label: "Sentence Mining", path: "/mining", icon: "mine" as const },
  { label: "Perpustakaan", path: "/library", icon: "book" as const },
  { label: "Progres", path: "/progress", icon: "chart" as const },
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);
  const [booksCount, setBooksCount] = useState(0);
  const [recentBook, setRecentBook] = useState<{ id: string; title: string; progress: number } | null>(null);
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
  const { totalDue, priorityDecks } = useMemo(() => {
    let sumDue = 0;
    const withDue: { id: string; title: string; kanji: string; due: number; color: string }[] = [];
    for (const d of decks) {
      const st = liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings);
      sumDue += st.due;
      withDue.push({
        id: d.id,
        title: d.title,
        kanji: d.kanji,
        due: st.due,
        color: d.color,
      });
    }
    withDue.sort((a, b) => b.due - a.due);
    return {
      totalDue: sumDue,
      priorityDecks: withDue.slice(0, 2),
    };
  }, [decks, srsCards, newIntroduced, settings]);

  // Cards reviewed today across all decks
  const todayReviewedCount = useMemo(() => {
    return Object.values(activity).reduce((sum, act) => sum + reviewedToday(act), 0);
  }, [activity]);

  const dailyGoalTarget = Math.max(10, settings.newCards + 15);
  const dailyGoalPct = Math.min(100, Math.round((todayReviewedCount / dailyGoalTarget) * 100));

  useEffect(() => {
    void listDictionaries().then(setDictionaries).catch(() => {});
    void listNovels()
      .then((books) => {
        setBooksCount(books.length);
        if (books.length > 0) {
          setRecentBook({
            id: books[0].id,
            title: books[0].title,
            progress: Math.round((books[0].progress || 0) * 100),
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
      return { text: `${decks.length}`, cls: "badge-muted" };
    }
    if (label === "Sentence Mining" && minedQueue.length > 0) {
      return { text: `${minedQueue.length}` };
    }
    if (label === "Perpustakaan" && booksCount > 0) {
      return { text: `${booksCount}`, cls: "badge-muted" };
    }
    if (label === "Progres" && todayReviewedCount > 0) {
      return { text: `+${todayReviewedCount}`, cls: "badge-sage" };
    }
    return null;
  };

  const handleQuickStartReview = () => {
    const firstDue =
      decks.find((d) => liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings).due > 0) ??
      decks[0];
    if (firstDue) {
      navigate(`/deck/${firstDue.id}/review`);
    } else {
      navigate("/deck");
    }
  };

  return (
    <div
      className={`app-shell ${effectiveCollapsed ? "is-collapsed" : ""} ${
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
        <div className="brand">
          <Link
            to="/beranda"
            className="flex items-center gap-2.5 text-inherit no-underline min-w-0"
          >
            <span className="brand-mark">語</span>
            <span className="brand-copy">
              <strong>語楽</strong>
              <small>GORAKU</small>
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className="sidebar-collapse-btn"
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

        {/* Navigasi Utama dengan Indikator Animasi & Badge Dinamis */}
        <nav className="nav-list" aria-label="Navigasi utama">
          <span className="nav-label">BELAJAR</span>
          {navItems.map((item) => {
            const isActive = active === item.label;
            const badge = getNavBadge(item.label);
            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setHoveredNav(item.label)}
                onMouseLeave={() => setHoveredNav(null)}
              >
                <Link
                  to={item.path}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-full bg-[#df674d]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center justify-center shrink-0">
                    <Icon name={item.icon} />
                    {effectiveCollapsed && badge && (
                      <i className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#df674d]" />
                    )}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {badge && <em className={badge.cls ?? ""}>{badge.text}</em>}
                </Link>

                {/* Floating Tooltip saat Sidebar Dilipat */}
                {effectiveCollapsed && hoveredNav === item.label && (
                  <div className="fixed left-[78px] z-50 pointer-events-none flex items-center gap-2 rounded-lg border border-[#323834] bg-[#171a18] px-3 py-1.5 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                    <span>{item.label}</span>
                    {badge && (
                      <span className="rounded-full bg-[#dc6048] px-1.5 py-0.5 text-[10px] text-white">
                        {badge.text}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Seksi Akses Cepat (Accordion Dinamis: Novel Terakhir & Deck Prioritas) */}
        <div className="sb-quick-section mt-4 pt-3 border-t border-[#262b28]">
          <button
            type="button"
            onClick={() => setQuickOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 pb-2 text-[9px] font-bold tracking-[0.18em] text-[#666d68] hover:text-[#a8b0ab] transition-colors"
          >
            <span>AKSES CEPAT</span>
            <span className="text-[11px]">{quickOpen ? "▾" : "▸"}</span>
          </button>

          {quickOpen && (
            <div className="space-y-1.5 px-1">
              {recentBook && (
                <button
                  type="button"
                  onClick={() => navigate(`/library/${recentBook.id}`)}
                  className="w-full rounded-xl border border-[#2a302c] bg-[#1e2320] hover:bg-[#252b28] hover:border-[#3c443f] p-2.5 text-left transition-all group"
                  title={`Lanjutkan membaca ${recentBook.title}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#d9644c]">
                      📖 Lanjut Baca
                    </span>
                    <span className="text-[10px] font-mono text-[#949a96]">
                      {recentBook.progress}%
                    </span>
                  </div>
                  <div
                    lang="ja"
                    className="text-xs font-semibold text-[#eef0ec] truncate group-hover:text-white"
                  >
                    {recentBook.title}
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-[#2e3430] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#d9644c] transition-all"
                      style={{ width: `${recentBook.progress}%` }}
                    />
                  </div>
                </button>
              )}

              {priorityDecks.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() =>
                    navigate(d.due > 0 ? `/deck/${d.id}/review` : `/deck/${d.id}`)
                  }
                  className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#b5bbb7] hover:bg-[#222724] hover:text-white transition-colors"
                  title={
                    d.due > 0
                      ? `Mulai review ${d.title} (${d.due} jatuh tempo)`
                      : `Buka deck ${d.title}`
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      lang="ja"
                      className="w-5 h-5 rounded-md bg-[#282e2b] text-[#e7dfcf] grid place-items-center text-[10px] font-serif shrink-0"
                    >
                      {d.kanji.slice(0, 1)}
                    </span>
                    <span className="truncate text-[11.5px]">{d.title}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
                      d.due > 0
                        ? "bg-[#dc6048]/20 text-[#ee846d]"
                        : "bg-[#2a302c] text-[#7c827e]"
                    }`}
                  >
                    {d.due > 0 ? `${d.due}` : "✓"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Sidebar: Target Harian, Pengaturan, Pepatah Jepang, & Profil */}
        <div className="sidebar-footer">
          {/* Widget Target Harian (Expanded) */}
          <div className="sb-goal-expanded mb-2.5 rounded-xl border border-[#2c332f] bg-[#1e2421] p-3">
            <div className="flex items-center justify-between text-[10.5px] mb-1.5">
              <span className="font-bold text-[#d5dbd7] flex items-center gap-1.5">
                <Icon name="flame" size={14} /> Target Hari Ini
              </span>
              <span className="font-mono font-bold text-[#e6a18f]">
                {todayReviewedCount}/{dailyGoalTarget}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#2c322e] overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d95b43] to-[#e7977f] transition-all duration-300"
                style={{ width: `${dailyGoalPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#8c918d]">
                {totalDue > 0 ? `${totalDue} kartu menunggu` : "Semua tuntas!"}
              </span>
              <button
                type="button"
                onClick={handleQuickStartReview}
                className="rounded-md bg-[#2b3c36] hover:bg-[#354b43] px-2 py-1 text-[10px] font-bold text-[#dfece6] transition-colors"
              >
                {totalDue > 0 ? "▶ Review" : "Buka Deck"}
              </button>
            </div>
          </div>

          {/* Mini Target Harian saat Sidebar Dilipat */}
          {effectiveCollapsed && (
            <button
              type="button"
              onClick={handleQuickStartReview}
              title={`Target Harian: ${todayReviewedCount}/${dailyGoalTarget} kartu (${dailyGoalPct}%) — Klik untuk Review`}
              className="mb-2 w-full rounded-xl border border-[#2c332f] bg-[#1e2421] py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-[#e6a18f] hover:border-[#df674d]"
            >
              <Icon name="flame" size={15} />
              <span>{dailyGoalPct}%</span>
            </button>
          )}

          <Link
            to="/settings"
            className={`nav-item ${active === "Pengaturan" ? "active" : ""}`}
            title={effectiveCollapsed ? "Pengaturan & Kamus Yomitan" : undefined}
          >
            <Icon name="settings" />
            <span>Pengaturan</span>
          </Link>

          <div
            className="quote-card cursor-pointer transition-transform hover:-translate-y-0.5 select-none"
            onClick={() => setQuoteIdx((i) => (i + 1) % DAILY_QUOTES.length)}
            title="Klik untuk mengganti pepatah Jepang harian"
          >
            <span className="quote-kanji">{quote.kanji}</span>
            <div className="relative z-10 flex items-center justify-between gap-2 mb-1">
              <span lang="ja" className="text-[11px] font-bold text-[#e6a18f]">
                {quote.jp}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakJapanese(quote.jp);
                }}
                title="Dengarkan pepatah"
                className="rounded-md bg-white/10 p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                <Icon name="volume" size={12} />
              </button>
            </div>
            <p>{quote.idText}</p>
            <div className="relative z-10 flex items-center justify-between">
              <small>{quote.sub}</small>
              <small className="text-[8px] opacity-60">Klik ganti ↻</small>
            </div>
          </div>

          <div className="user-profile mt-2 flex items-center justify-between gap-2 pt-2 border-t border-[#262b28]">
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
                <small className="block text-[10px] text-[#8c918d]">
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
              className="mr-1 rounded-lg border border-[#d8d3c9] bg-[#fffdfa] px-2 py-1 text-xs font-bold text-[#25231f]"
            >
              ☰
            </button>
            <span>語</span> 語楽
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="searchbox text-left cursor-pointer hover:border-[#c9604b] transition-colors"
            aria-label="Buka pencarian cepat (Ctrl+K)"
          >
            <Icon name="search" size={18} />
            <span className="flex-1 text-xs text-[#88877f] truncate">
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
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#e0dbd1] bg-[#fffdf9] shadow-xl p-4 z-50 animate-[modal-in_0.16s_ease]">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#ebe6dc]">
                    <strong className="text-xs font-bold text-[#25231f]">
                      Notifikasi Belajar
                    </strong>
                    <button
                      type="button"
                      onClick={() => setNotifRead(true)}
                      className="text-[10px] font-semibold text-[#c4543f] hover:underline"
                    >
                      Tandai dibaca
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-xl bg-[#f7f4ec] p-3 border border-[#ebe6dc]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#233c35]">
                          Target Review Harian
                        </span>
                        <span className="rounded-full bg-[#f1e6df] px-2 py-0.5 text-[10px] font-bold text-[#bf5b46]">
                          {totalDue} kartu
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6f6b63] mb-2">
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
                          className="text-[11px] font-bold text-[#c4543f] hover:underline"
                        >
                          Mulai review sekarang →
                        </button>
                      )}
                    </div>

                    {recentBook && (
                      <div className="rounded-xl bg-[#f7f4ec] p-3 border border-[#ebe6dc]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#25231f] truncate">
                            Lanjutkan Membaca
                          </span>
                          <span className="text-[10px] font-semibold text-[#8a867d]">
                            {recentBook.progress}%
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6f6b63] truncate mb-1.5" lang="ja">
                          {recentBook.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(`/library/${recentBook.id}`);
                          }}
                          className="text-[11px] font-bold text-[#233c35] hover:underline"
                        >
                          Buka pembaca novel →
                        </button>
                      </div>
                    )}

                    <div className="rounded-xl bg-[#f7f4ec] p-3 border border-[#ebe6dc]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#25231f]">
                          Status Kamus Yomitan
                        </span>
                        <span className="text-[10px] font-bold text-[#3f7a5f]">
                          {activeDictCount} aktif
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6f6b63] mb-1.5">
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
                        className="text-[11px] font-bold text-[#c4543f] hover:underline"
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

      <CommandPaletteModal open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
