import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon, Button } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { newCardsLeftToday, useReviewStore } from "../store/useReviewStore";
import { getMedia, type StoredCard } from "../lib/deckDb";
import { loadDeckCards } from "../lib/deckCards";
import { initCard, isDue, reviewCard, type SRSCard } from "../lib/srs";
import { renderJapanese } from "../lib/ankiText";
import { speakJapanese } from "../lib/tts";
import "../decks.css";

type ReviewCard = {
  id: string;
  deckId?: string;
  subdeck?: string;
  word: string;
  reading: string;
  /** Inline HTML (sanitized for imported decks). */
  meaning: string;
  sentence: string;
  translation: string;
  audio?: string;
  sentenceAudio?: string;
  image?: string;
};

interface UndoHistoryItem {
  pos: number;
  cardId: string;
  deckId?: string;
  prevSrsCard: SRSCard | undefined;
  wasNew: boolean;
  wasRequeued: boolean;
}

function formatInterval(days: number) {
  if (days < 30) return `${days} hari`;
  if (days < 365) return `${(days / 30).toFixed(days < 60 ? 1 : 0)} bln`;
  return `${(days / 365).toFixed(1)} thn`;
}

const GRADES = [
  { q: 0, label: "Lupa", cls: "again" },
  { q: 2, label: "Sulit", cls: "hard" },
  { q: 4, label: "Baik", cls: "good" },
  { q: 5, label: "Mudah", cls: "easy" },
] as const;

export default function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const deck = useAppStore((s) => s.decks.find((d) => d.id === deckId));
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const reviewCardAction = useReviewStore((s) => s.reviewCardAction);
  const restoreCardState = useReviewStore((s) => s.restoreCardState);

  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [pos, setPos] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [history, setHistory] = useState<UndoHistoryItem[]>([]);
  const [media, setMedia] = useState<{ audio?: string; sentenceAudio?: string; image?: string }>({});
  const [playing, setPlaying] = useState<"word" | "sentence" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const card = queue && pos < queue.length ? queue[pos] : undefined;
  const srsCard = useReviewStore((s) => {
    if (!card) return undefined;
    const targetDeckId = card.deckId || deckId;
    return targetDeckId ? s.srsCards[targetDeckId]?.[card.id] : undefined;
  });

  // Build the session queue once: due reviews first, then today's new cards.
  useEffect(() => {
    if (!deck) return;
    let alive = true;
    loadDeckCards(deck.id)
      .then((cards) => {
        if (!alive) return;
        const { srsCards, newIntroduced } = useReviewStore.getState();
        const getCardSrs = (c: StoredCard): SRSCard | undefined => {
          const targetDeckId = c.deckId || deck.id;
          return targetDeckId ? srsCards[targetDeckId]?.[c.id] : undefined;
        };

        const due = cards
          .filter((c) => {
            const sc = getCardSrs(c);
            return sc && isDue(sc);
          })
          .sort((a, b) => (getCardSrs(a)?.nextReview ?? 0) - (getCardSrs(b)?.nextReview ?? 0))
          .slice(0, settings.maxReview);

        const fresh = cards
          .filter((c) => !getCardSrs(c))
          .slice(0, newCardsLeftToday(newIntroduced[deck.id], settings.newCards));

        setQueue([...due, ...fresh]);
      })
      .catch(() => alive && setQueue([]));
    return () => {
      alive = false;
    };
    // Queue is intentionally built once per deck; SRS updates during the session must not reshuffle it.
  }, [deck?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve media blobs for the current card (supports both .apkg media and manga bubble crops).
  useEffect(() => {
    setMedia({});
    if (!card || !deck) return;
    let alive = true;
    const urls: string[] = [];
    (async () => {
      const out: typeof media = {};
      for (const k of ["audio", "sentenceAudio", "image"] as const) {
        const name = card[k];
        if (!name) continue;
        const blob = await getMedia(deck.id, name).catch(() => undefined);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        out[k] = url;
      }
      if (alive) setMedia(out);
      else urls.forEach((u) => URL.revokeObjectURL(u));
    })();
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [card, deck]);

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(null);
  };
  useEffect(() => stopAudio, [pos]);

  const play = useCallback(
    (which: "word" | "sentence") => {
      if (!card) return;
      const blobSrc = which === "word" ? media.audio : media.sentenceAudio;
      if (blobSrc) {
        audioRef.current?.pause();
        const a = new Audio(blobSrc);
        audioRef.current = a;
        setPlaying(which);
        a.addEventListener("ended", () => setPlaying(null));
        a.addEventListener("error", () => setPlaying(null));
        a.play().catch(() => setPlaying(null));
        return;
      }

      // Gunakan Web Speech API (ja-JP) jika kartu tidak memiliki berkas audio bawaan
      const textToSpeak =
        which === "word"
          ? card.reading || card.word
          : card.sentence.replace(/\[[^\]]*\]/g, "");
      if (speakJapanese(textToSpeak)) {
        setPlaying(which);
        window.setTimeout(() => setPlaying(null), 1200);
      }
    },
    [card, media],
  );

  // Auto-play once when the answer is revealed.
  useEffect(() => {
    if (showAnswer && settings.audio) play("word");
  }, [showAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useCallback(
    (quality: number) => {
      if (!card || !deckId) return;
      const targetDeckId = card.deckId || deckId;
      const currentSrsMap = useReviewStore.getState().srsCards[targetDeckId] ?? {};
      const prevSrsCard = currentSrsMap[card.id];
      const wasNew = !prevSrsCard;
      const wasRequeued = quality < 3;

      setHistory((h) => [
        ...h,
        {
          pos,
          cardId: card.id,
          deckId: targetDeckId,
          prevSrsCard: prevSrsCard ? { ...prevSrsCard } : undefined,
          wasNew,
          wasRequeued,
        },
      ]);

      reviewCardAction(targetDeckId, card.id, quality);
      setReviewed((r) => r + 1);
      // "Lupa" puts the card back at the end of this session, like Anki's relearning step.
      if (wasRequeued) setQueue((q) => (q ? [...q, card] : q));
      setShowAnswer(false);
      setPos((p) => p + 1);
    },
    [card, deckId, pos, reviewCardAction],
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0 || !deckId) return;
    const last = history[history.length - 1];
    const targetDeckId = last.deckId || deckId;
    restoreCardState(targetDeckId, last.cardId, last.prevSrsCard, last.wasNew);
    if (last.wasRequeued) {
      setQueue((q) => (q && q.length > 0 ? q.slice(0, -1) : q));
    }
    setHistory((h) => h.slice(0, -1));
    setReviewed((r) => Math.max(0, r - 1));
    setPos(last.pos);
    setShowAnswer(true);
  }, [history, deckId, restoreCardState]);

  // Keyboard: Space/Enter reveals, 1–4 grades, R plays audio, Ctrl+Z / Z undoes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (!card) return;
      if (!showAnswer && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShowAnswer(true);
      } else if (showAnswer && ["1", "2", "3", "4"].includes(e.key)) {
        answer(GRADES[Number(e.key) - 1].q);
      } else if (e.key.toLowerCase() === "r") {
        play("word");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, showAnswer, answer, play, handleUndo]);

  if (!deck) {
    return (
      <div className="review-empty">
        <p>Deck tidak ditemukan.</p>
        <Button onClick={() => navigate("/deck")}>Kembali ke Decks</Button>
      </div>
    );
  }

  if (queue === null) {
    return (
      <div className="review-container">
        <div className="review-stage">
          <div className="review-card-front rv-loading" aria-busy="true">
            <i /><i /><i />
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    const nothingToDo = queue.length === 0;
    return (
      <div className="review-complete">
        <div className="review-complete-content">
          <div className="review-complete-icon">
            <Icon name="check" size={48} />
          </div>
          <h2>{nothingToDo ? "Tidak ada kartu hari ini" : "Sesi selesai! お疲れ様でした！"}</h2>
          <p>
            {nothingToDo
              ? `Semua kartu di "${deck.title}" sudah kamu kerjakan. Kembali lagi besok, ya.`
              : `Kamu telah menyelesaikan ${reviewed} kartu hari ini dengan penuh konsistensi.`}
          </p>
          <div className="review-complete-actions">
            {history.length > 0 && (
              <Button className="outline-button" onClick={handleUndo}>
                <Icon name="refresh" size={16} /> Batalkan kartu terakhir
              </Button>
            )}
            <Button className="primary-light" onClick={() => navigate("/beranda")}>
              <Icon name="home" size={16} /> Ke Beranda
            </Button>
            <Button className="outline-button" onClick={() => navigate("/deck")}>
              <Icon name="deck" size={16} /> Lihat Decks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const base = srsCard ?? initCard(card.id);
  const isNewCard = !srsCard;

  return (
    <div className="review-container">
      <div className="review-header flex-wrap gap-2">
        <Button className="review-back" onClick={() => navigate(`/deck/${deck.id}`)}>
          <Icon name="arrow-left" size={18} /> {deck.title}
        </Button>

        <div className="review-progress-bar">
          <div className="review-progress-fill" style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            title="Batalkan penilaian sebelumnya (Ctrl+Z)"
            className="rounded-lg border border-[var(--garis)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-semibold text-[var(--tinta-2)] hover:border-[var(--ai)] hover:text-[var(--ai)] disabled:opacity-40 transition-colors"
          >
            ↶ Undo
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ furi: !settings.furi })}
            title="Tampilkan/sembunyikan furigana"
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              settings.furi
                ? "border-[var(--kon)] bg-[var(--kon)] text-white"
                : "border-[var(--garis)] bg-[var(--panel)] text-[var(--tinta-2)]"
            }`}
          >
            あ Furigana
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ audio: !settings.audio })}
            title="Putar audio otomatis saat jawaban dibuka"
            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
              settings.audio
                ? "border-[var(--ai)] bg-[var(--ai)] text-white"
                : "border-[var(--garis)] bg-[var(--panel)] text-[var(--tinta-2)]"
            }`}
          >
            <Icon name="volume" size={14} />
          </button>

          <span className="review-count">{pos + 1} / {queue.length}</span>
        </div>
      </div>

      <div className="review-stage">
        <div className="review-card-front">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {card.subdeck && <span className="rv-subdeck-badge">{card.subdeck}</span>}
            {isNewCard && <span className="rv-new">Kartu baru</span>}
          </div>
          {(settings.furi || showAnswer) && card.reading && <small className="review-reading" lang="ja">{card.reading}</small>}
          <div className="review-word-row">
            <h1 className="review-word" lang="ja">{card.word}</h1>
            <button className={`review-audio-btn ${playing === "word" ? "rv-playing" : ""}`} onClick={() => (playing === "word" ? stopAudio() : play("word"))} aria-label="Putar audio" title="Putar pengucapan kata (R)">
              <Icon name="volume" size={22} />
            </button>
          </div>
          {showAnswer && (
            <div className="review-answer">
              {media.image && <img className="rv-image" src={media.image} alt="" />}
              {card.meaning && <p className="review-meaning" dangerouslySetInnerHTML={{ __html: card.meaning }} />}
              {(card.sentence || card.translation) && (
                <div className="review-context">
                  {card.sentence && (
                    <div className="rv-sentence-row">
                      <p className="review-sentence" lang="ja" dangerouslySetInnerHTML={{ __html: renderJapanese(card.sentence, settings.furi) }} />
                      <button className={`rv-mini-audio ${playing === "sentence" ? "rv-playing" : ""}`} onClick={() => play("sentence")} aria-label="Putar audio kalimat" title="Dengarkan kalimat">
                        <Icon name="volume" size={15} />
                      </button>
                    </div>
                  )}
                  {card.translation && <p className="review-translation" dangerouslySetInnerHTML={{ __html: card.translation }} />}
                </div>
              )}
            </div>
          )}
        </div>

        {!showAnswer ? (
          <Button className="review-show" onClick={() => setShowAnswer(true)}>
            <Icon name="eye" size={18} /> Tampilkan jawaban <kbd className="rv-kbd">Spasi</kbd>
          </Button>
        ) : (
          <div className="review-actions">
            <p className="review-prompt">Seberapa baik kamu mengingat kata ini?</p>
            <div className="review-buttons">
              {GRADES.map((g, i) => (
                <Button key={g.q} className={`review-btn review-btn-${g.cls}`} onClick={() => answer(g.q)}>
                  <strong>{g.label}</strong>
                  <small>{g.q < 3 ? "Ulangi lagi" : formatInterval(reviewCard(base, g.q).interval)}</small>
                  <kbd className="rv-kbd">{i + 1}</kbd>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
