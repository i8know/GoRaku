import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Icon, Button, Toggle } from "../ui";
import {
  noteToCard,
  PRESET_DECKS,
  type ParseStep,
  type PresetDeck,
} from "../lib/apkg";
import type {
  SubdeckCommitDef,
  WorkerCommitOptions,
  WorkerCommitResult,
  WorkerParsedSummary,
  WorkerRequest,
  WorkerResponse,
} from "../workers/apkgImport.worker";
import { renderJapanese, ROLE_LABELS, ROLES, toPlain, type FieldMapping, type Role } from "../lib/ankiText";
import { deleteCards, deleteDeckData, deleteMedia } from "../lib/deckDb";
import { useAppStore } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";

type Stage = "pick" | "parsing" | "configure" | "saving" | "done" | "error";

const STEPS = ["Pilih sumber", "Analisis", "Atur deck", "Simpan"];
const STAGE_STEP: Record<Stage, number> = { pick: 0, error: 0, parsing: 1, configure: 2, saving: 3, done: 4 };
const PARSE_STEPS: { id: ParseStep; label: string }[] = [
  { id: "unzip", label: "Membuka arsip ZIP" },
  { id: "decompress", label: "Mendekompresi zstd & manifest media" },
  { id: "database", label: "Membaca struktur tabel SQLite" },
  { id: "notes", label: "Memetakan catatan, field & deck" },
];
const LEVELS = ["N5", "N4", "N3", "N2", "N1", "Campuran"];
const KINDS = ["Core", "Anime", "Novel", "Manga", "YouTube"];
const COLORS = ["coral", "indigo", "sage", "ochre", "plum", "slate"];
const KANJI_SUGGEST = ["札", "語", "単", "漢", "学", "日", "初", "魂", "話"];

const autoKanji = (t: string) => (t.match(/[\u3400-\u9fff]/g) ?? []).slice(0, 2).join("") || "札";
const ttsUrl = (text: string) =>
  `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(text)}`;

interface Props {
  initialFile?: File | null;
  onClose: () => void;
  onImported: (deckId: string, title: string) => void;
  onStudy: (deckId: string) => void;
}

interface SaveProgress {
  phase: "cards" | "media" | "finish";
  done: number;
  total: number;
  pct: number;
}

export default function ImportDeckModal({ initialFile, onClose, onImported, onStudy }: Props) {
  const decks = useAppStore((s) => s.decks);
  const importDeck = useAppStore((s) => s.importDeck);
  const updateDeck = useAppStore((s) => s.updateDeck);
  const furigana = useAppStore((s) => s.settings.furi);
  const importSchedule = useReviewStore((s) => s.importSchedule);

  const [stage, setStage] = useState<Stage>("pick");
  const [parseStep, setParseStep] = useState<ParseStep>("unzip");
  const [parsePct, setParsePct] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<WorkerParsedSummary | null>(null);

  const [destMode, setDestMode] = useState<"new" | "existing">("new");
  const [existingDeckId, setExistingDeckId] = useState(decks[0]?.id ?? "");

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("N4");
  const [kind, setKind] = useState("Core");
  const [color, setColor] = useState("indigo");
  const [kanji, setKanji] = useState("札");
  const [selectedDecks, setSelectedDecks] = useState<Set<string>>(new Set());
  const [mappings, setMappings] = useState<Record<string, FieldMapping>>({});
  const [activeType, setActiveType] = useState("");
  const [splitIntoSubdecks, setSplitIntoSubdecks] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(true);
  // Requirement 4: Default schedule mode is (a) import as new cards ("new"), with option (b) estimate from ivl & factor ("estimate")
  const [scheduleMode, setScheduleMode] = useState<"new" | "estimate">("new");
  // Requirement 5: Duplicate handling based on note id ("skip" or "update")
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [sampleIdx, setSampleIdx] = useState(0);

  const [progress, setProgress] = useState<SaveProgress>({ phase: "cards", done: 0, total: 0, pct: 0 });
  const [result, setResult] = useState<WorkerCommitResult | null>(null);

  const [previewAudioUrl, setPreviewAudioUrl] = useState<string>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string>();

  const fileInput = useRef<HTMLInputElement>(null);
  const startedWith = useRef<File | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const previewReqId = useRef(0);
  const pendingPreviewCallbacks = useRef<Map<number, (blob?: Blob) => void>>(new Map());

  // Track active commit target so user cancellation ("Batal") can clean up partial IndexedDB data
  // and commit-success always has the exact deck metadata without stale closure issues.
  const activeCommitRef = useRef<{
    deckId: string;
    isNewDeck: boolean;
    finalTitle: string;
    level: string;
    kind: string;
    kanji: string;
    color: string;
    fileName: string;
    fileSize: number;
    format: string;
    noteTypes: string[];
    subdecks: string[];
    writtenCardIds: string[];
    writtenMediaNames: string[];
  } | null>(null);

  const onImportedRef = useRef(onImported);
  useEffect(() => {
    onImportedRef.current = onImported;
  }, [onImported]);

  const busy = stage === "parsing" || stage === "saving";

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingPreviewCallbacks.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, [terminateWorker]);

  const applyParsedSummary = useCallback((p: WorkerParsedSummary, presetOverride?: PresetDeck) => {
    setParsed(p);
    setMappings(p.initialMappings);
    setActiveType(p.noteTypes[0]?.id ?? "");
    setSelectedDecks(new Set(p.subdecks.map((d) => d.id)));
    setSplitIntoSubdecks(p.hierarchy?.hasSubdecks ?? false);
    setTitle(p.suggestedTitle);
    setKanji(presetOverride ? presetOverride.kanji : autoKanji(p.suggestedTitle));
    if (presetOverride) {
      setLevel(presetOverride.level);
      setKind(presetOverride.kind);
      setColor(presetOverride.color);
    }
    setSampleIdx(0);
    setStage("configure");
  }, []);

  const ensureWorker = useCallback(
    (presetOverride?: PresetDeck) => {
      terminateWorker();
      const w = new Worker(new URL("../workers/apkgImport.worker.ts", import.meta.url), {
        type: "module",
      });

      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        if (msg.type === "parse-progress") {
          setParseStep(msg.step);
          setParsePct(msg.pct);
        } else if (msg.type === "parse-success") {
          setParsePct(100);
          applyParsedSummary(msg.summary, presetOverride);
        } else if (msg.type === "preview-media-result") {
          const cb = pendingPreviewCallbacks.current.get(msg.requestId);
          if (cb) {
            pendingPreviewCallbacks.current.delete(msg.requestId);
            cb(msg.blob);
          }
        } else if (msg.type === "commit-progress") {
          if (activeCommitRef.current) {
            if (msg.writtenCardIdsBatch?.length) {
              activeCommitRef.current.writtenCardIds.push(...msg.writtenCardIdsBatch);
            }
            if (msg.writtenMediaBatch?.length) {
              activeCommitRef.current.writtenMediaNames.push(...msg.writtenMediaBatch);
            }
          }
          setProgress({
            phase: msg.phase,
            done: msg.done,
            total: msg.total,
            pct: msg.pct,
          });
        } else if (msg.type === "commit-success") {
          const commitMeta = activeCommitRef.current;
          activeCommitRef.current = null;
          const res = msg.result;

          if (commitMeta) {
            if (commitMeta.isNewDeck) {
              if (res.subdecksCreated && res.subdecksCreated.length > 0) {
                // 1. Build subdeck children mapping for multi-level hierarchy
                const subdeckChildrenMap = new Map<string, string[]>();
                for (const sub of res.subdecksCreated) {
                  const arr = subdeckChildrenMap.get(sub.parentId) ?? [];
                  arr.push(sub.id);
                  subdeckChildrenMap.set(sub.parentId, arr);
                }

                // 2. Parent deck
                const parentDeckData = {
                  id: res.deckId,
                  title: commitMeta.finalTitle,
                  level: `${commitMeta.level} • ${commitMeta.kind}`,
                  kind: commitMeta.kind,
                  total: res.finalDeckTotal,
                  kanji: commitMeta.kanji,
                  color: commitMeta.color,
                  subdeckIds: subdeckChildrenMap.get(res.deckId) ?? res.subdecksCreated.map((s) => s.id),
                  meta: {
                    fileName: commitMeta.fileName,
                    fileSize: commitMeta.fileSize,
                    format: commitMeta.format,
                    importedAt: Date.now(),
                    noteTypes: commitMeta.noteTypes,
                    subdecks: res.subdecksCreated.map((s) => s.title),
                    mediaCount: res.mediaStored,
                    mediaFailed: res.mediaFailed,
                    decksCount: res.subdecksCreated.length,
                    skipped: res.skipped,
                  },
                };

                // 3. Child subdecks with multi-level parentId and subdeckIds
                const subdeckItems = res.subdecksCreated.map((sub) => ({
                  id: sub.id,
                  parentId: sub.parentId,
                  subdeckIds: subdeckChildrenMap.get(sub.id),
                  title: sub.title,
                  subdeckName: sub.subdeckName,
                  level: sub.level,
                  kind: sub.kind,
                  total: sub.total,
                  kanji: sub.kanji,
                  color: sub.color,
                }));

                useAppStore.getState().importDecksBatch([parentDeckData, ...subdeckItems]);

                // 4. Import SRS per subdeck
                for (const sub of res.subdecksCreated) {
                  if (sub.srsCards.length > 0) {
                    useReviewStore.getState().importSchedule(sub.id, sub.srsCards);
                  }
                }
              } else {
                useAppStore.getState().importDeck({
                  id: res.deckId,
                  title: commitMeta.finalTitle,
                  level: `${commitMeta.level} • ${commitMeta.kind}`,
                  kind: commitMeta.kind,
                  total: res.finalDeckTotal,
                  kanji: commitMeta.kanji,
                  color: commitMeta.color,
                  meta: {
                    fileName: commitMeta.fileName,
                    fileSize: commitMeta.fileSize,
                    format: commitMeta.format,
                    importedAt: Date.now(),
                    noteTypes: commitMeta.noteTypes,
                    subdecks: commitMeta.subdecks,
                    mediaCount: res.mediaStored,
                    mediaFailed: res.mediaFailed,
                    decksCount: res.decksCount,
                    skipped: res.skipped,
                  },
                });

                if (res.srsCards.length > 0) {
                  useReviewStore.getState().importSchedule(res.deckId, res.srsCards);
                }
              }
            } else {
              useAppStore.getState().updateDeck(res.deckId, {
                total: res.finalDeckTotal,
                updatedAt: Date.now(),
              });
              if (res.srsCards.length > 0) {
                useReviewStore.getState().importSchedule(res.deckId, res.srsCards);
              }
            }

            onImportedRef.current(res.deckId, commitMeta.finalTitle);
          }

          setResult(res);
          setStage("done");
        } else if (msg.type === "error") {
          activeCommitRef.current = null;
          setError(msg.message);
          setStage("error");
        }
      };

      w.onerror = (err) => {
        console.error("Worker error:", err);
        activeCommitRef.current = null;
        setError("Terjadi kesalahan pada Web Worker saat memproses berkas. Pastikan berkas .apkg tidak rusak.");
        setStage("error");
      };

      workerRef.current = w;
      return w;
    },
    [applyParsedSummary, terminateWorker],
  );

  const postToWorker = useCallback((msg: WorkerRequest) => {
    workerRef.current?.postMessage(msg);
  }, []);

  // ---------------------------------------------------------------- parsing
  const handleFile = useCallback(
    (file: File) => {
      setError("");
      setStage("parsing");
      setParseStep("unzip");
      setParsePct(5);
      const w = ensureWorker();
      w.postMessage({ type: "parse-file", file } satisfies WorkerRequest);
    },
    [ensureWorker],
  );

  const loadPreset = useCallback(
    (preset: PresetDeck) => {
      setError("");
      setStage("parsing");
      setParseStep("notes");
      setParsePct(80);
      const w = ensureWorker(preset);
      w.postMessage({ type: "parse-preset", preset } satisfies WorkerRequest);
    },
    [ensureWorker],
  );

  // Cancel active worker & clean up partial IndexedDB data if cancelled during saving
  const cancelActiveImport = useCallback(async () => {
    terminateWorker();
    const commitMeta = activeCommitRef.current;
    activeCommitRef.current = null;

    if (commitMeta) {
      try {
        if (commitMeta.isNewDeck) {
          await deleteDeckData(commitMeta.deckId);
        } else {
          if (commitMeta.writtenCardIds.length > 0) {
            await deleteCards(commitMeta.deckId, commitMeta.writtenCardIds);
          }
          if (commitMeta.writtenMediaNames.length > 0) {
            await deleteMedia(commitMeta.deckId, commitMeta.writtenMediaNames);
          }
        }
      } catch {
        /* ignore cleanup errors */
      }
    }

    setParsed(null);
    setError("");
    setStage("pick");
  }, [terminateWorker]);

  useEffect(() => {
    if (initialFile && startedWith.current !== initialFile) {
      startedWith.current = initialFile;
      handleFile(initialFile);
    }
  }, [initialFile, handleFile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ---------------------------------------------------------------- derived
  const subdeckName = useMemo(
    () => new Map(parsed?.subdecks.map((d) => [d.id, d.name]) ?? []),
    [parsed],
  );

  const selectedNotesCount = useMemo(() => {
    if (!parsed) return 0;
    let sum = 0;
    for (const id of selectedDecks) {
      sum += parsed.subdeckStats[id]?.noteCount ?? 0;
    }
    return sum;
  }, [parsed, selectedDecks]);

  const scheduledCount = useMemo(() => {
    if (!parsed) return 0;
    let sum = 0;
    for (const id of selectedDecks) {
      sum += parsed.subdeckStats[id]?.scheduledCount ?? 0;
    }
    return sum;
  }, [parsed, selectedDecks]);

  const typesInUse = useMemo(() => {
    if (!parsed) return [];
    const ids = new Set<string>();
    for (const sdId of selectedDecks) {
      for (const ntId of parsed.subdeckStats[sdId]?.noteTypeIds ?? []) {
        ids.add(ntId);
      }
    }
    return parsed.noteTypes.filter((t) => ids.has(t.id));
  }, [parsed, selectedDecks]);

  const activeNoteType = typesInUse.find((t) => t.id === activeType) ?? typesInUse[0];
  const mapping = activeNoteType ? mappings[activeNoteType.id] : undefined;

  const samples = useMemo(() => {
    if (!parsed || !activeNoteType) return [];
    const allForType = parsed.samplesByType[activeNoteType.id] ?? [];
    const filtered = allForType.filter((n) => selectedDecks.has(n.deckId));
    return filtered.length > 0 ? filtered : allForType;
  }, [parsed, activeNoteType, selectedDecks]);

  const sample = samples.length ? samples[sampleIdx % samples.length] : undefined;
  const preview =
    sample && mapping ? noteToCard(sample, mapping, "preview", subdeckName.get(sample.deckId) ?? "") : null;

  // Request media blob from Worker for live preview, creating & revoking ObjectURL cleanly
  useEffect(() => {
    setPreviewAudioUrl(undefined);
    const audioName = preview?.audio;
    if (!parsed || !audioName || !workerRef.current) return;

    let objectUrl: string | undefined;
    let cancelled = false;
    const reqId = ++previewReqId.current;

    pendingPreviewCallbacks.current.set(reqId, (blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewAudioUrl(objectUrl);
    });
    postToWorker({ type: "preview-media", requestId: reqId, name: audioName });

    return () => {
      cancelled = true;
      pendingPreviewCallbacks.current.delete(reqId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [parsed, preview?.audio, postToWorker]);

  useEffect(() => {
    setPreviewImageUrl(undefined);
    const imageName = preview?.image;
    if (!parsed || !imageName || !workerRef.current) return;

    let objectUrl: string | undefined;
    let cancelled = false;
    const reqId = ++previewReqId.current;

    pendingPreviewCallbacks.current.set(reqId, (blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewImageUrl(objectUrl);
    });
    postToWorker({ type: "preview-media", requestId: reqId, name: imageName });

    return () => {
      cancelled = true;
      pendingPreviewCallbacks.current.delete(reqId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [parsed, preview?.image, postToWorker]);

  const missingWord = typesInUse.some((t) => (mappings[t.id]?.word ?? -1) < 0);
  const canImport = (destMode === "existing" || !!title.trim()) && selectedNotesCount > 0 && !missingWord;

  const setRole = (role: Role, idx: number) => {
    if (!activeNoteType) return;
    setMappings((m) => ({ ...m, [activeNoteType.id]: { ...m[activeNoteType.id], [role]: idx } }));
  };

  const toggleDeck = (id: string) =>
    setSelectedDecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ---------------------------------------------------------------- saving
  const commit = () => {
    if (!parsed || !canImport || !workerRef.current) return;

    const isNew = destMode === "new";
    const chosenExisting = decks.find((d) => d.id === existingDeckId);
    const deckId = isNew ? `deck-${Date.now()}` : existingDeckId;
    const finalTitle = isNew ? title.trim() : (chosenExisting?.title ?? "Deck");

    activeCommitRef.current = {
      deckId,
      isNewDeck: isNew,
      finalTitle,
      level,
      kind,
      kanji: kanji.trim() || "札",
      color,
      fileName: parsed.fileName,
      fileSize: parsed.fileSize,
      format: parsed.format,
      noteTypes: parsed.noteTypes.map((t) => t.name),
      subdecks: parsed.subdecks.filter((d) => selectedDecks.has(d.id)).map((d) => d.name),
      writtenCardIds: [],
      writtenMediaNames: [],
    };

    let subdeckOptionsPayload: WorkerCommitOptions["subdeckOptions"] = undefined;
    if (isNew && splitIntoSubdecks && parsed.hierarchy?.hasSubdecks) {
      const pathIdMap = new Map<string, string>();
      const groupsWithIds = parsed.hierarchy.groups.map((g, idx) => {
        const id = g.isContainer
          ? `${deckId}-c-${idx + 1}-${encodeURIComponent(g.subdeckName).replace(/[^a-zA-Z0-9]/g, "").slice(0, 15).toLowerCase()}`
          : `${deckId}-sd-${idx + 1}-${g.levelCode.toLowerCase()}`;
        if (g.pathKey) {
          pathIdMap.set(g.pathKey, id);
        }
        return { g, id };
      });

      const groups: SubdeckCommitDef[] = groupsWithIds.map(({ g, id }) => {
        let parentId = deckId;
        if (g.parentPathKey && pathIdMap.has(g.parentPathKey)) {
          parentId = pathIdMap.get(g.parentPathKey)!;
        }
        return {
          key: g.key,
          id,
          title: g.title.includes("•") ? g.title : `${finalTitle} • ${g.title}`,
          subdeckName: g.subdeckName,
          level: g.level,
          kind,
          kanji: g.kanji,
          color: g.color,
          pathKey: g.pathKey,
          parentPathKey: g.parentPathKey,
          parentId,
          isContainer: g.isContainer,
        };
      });

      subdeckOptionsPayload = {
        enabled: true,
        strategy: parsed.hierarchy.strategy,
        groups,
      };
    }

    setStage("saving");
    setProgress({ phase: "cards", done: 0, total: selectedNotesCount, pct: 0 });

    postToWorker({
      type: "commit-import",
      options: {
        deckId,
        isNewDeck: isNew,
        selectedDeckIds: [...selectedDecks],
        mappings,
        includeMedia,
        scheduleMode,
        duplicateMode,
        subdeckOptions: subdeckOptionsPayload,
      },
    });
  };

  const reset = () => {
    terminateWorker();
    activeCommitRef.current = null;
    setParsed(null);
    setError("");
    setStage("pick");
  };

  // ---------------------------------------------------------------- render
  const pct = progress.pct;
  const step = STAGE_STEP[stage];

  const formatBadgeLabel = (fmt: string) => {
    if (fmt === "anki21b") return "Anki v3 (zstd .anki21b)";
    if (fmt === "anki21") return "Anki Paket (2.1)";
    if (fmt === "anki2") return "Anki Paket (2.0)";
    if (fmt === "csv") return "File Tabel (CSV)";
    if (fmt === "tsv") return "File Tabel (TSV)";
    if (fmt === "json") return "File Kartu (JSON)";
    return fmt.toUpperCase();
  };

  return (
    <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
      <div
        className={`imp-modal ${stage === "configure" ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="imp-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="imp-head">
          <div>
            <p className="eyebrow">PUSAT IMPOR DECK</p>
            <h2 id="imp-title">
              Impor Deck <span>{parsed ? `(${formatBadgeLabel(parsed.format)})` : "Multiformat"}</span>
            </h2>
          </div>
          <ol className="imp-steps" aria-label="Langkah impor">
            {STEPS.map((s, i) => (
              <li key={s} className={i < step ? "done" : i === step ? "on" : ""}>
                <i>{i < step ? <Icon name="check" size={12} /> : i + 1}</i>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <Button
            className="modal-close"
            ariaLabel="Tutup"
            onClick={() => {
              if (busy) void cancelActiveImport().then(onClose);
              else onClose();
            }}
          >
            <Icon name="close" />
          </Button>
        </header>

        <div className="imp-body">
          {stage === "pick" && (
            <div className="imp-pick">
              <div
                id="imp-dropzone"
                className={`imp-drop ${dragging ? "drag" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInput.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
              >
                <div className="imp-stack" aria-hidden="true">
                  <span className="c1">語</span>
                  <span className="c2">単</span>
                  <span className="c3">札</span>
                </div>
                <h3>Tarik &amp; lepas file deck ke sini</h3>
                <p>
                  atau <u>pilih file dari perangkat</u> — semua diproses di Web Worker tanpa kirim ke server
                </p>
                <div className="imp-chips">
                  <span>.apkg (Anki v2 / v3 .anki21b)</span>
                  <span>.colpkg</span>
                  <span>.csv</span>
                  <span>.tsv</span>
                  <span>.json</span>
                </div>
                <input
                  ref={fileInput}
                  id="imp-file-input"
                  type="file"
                  accept=".apkg,.colpkg,.zip,.csv,.tsv,.txt,.json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Preset Decks (1-click ready to study) */}
              <div className="imp-presets">
                <div className="imp-presets-head">
                  <span className="imp-sub">Atau pilih deck siap pakai (1-klik langsung belajar)</span>
                </div>
                <div className="imp-preset-grid">
                  {PRESET_DECKS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="imp-preset-card"
                      onClick={() => loadPreset(preset)}
                    >
                      <div className={`imp-preset-art deck-art ${preset.color}`}>
                        <span>{preset.kanji}</span>
                      </div>
                      <div className="imp-preset-info">
                        <strong>{preset.title}</strong>
                        <p>{preset.description}</p>
                        <small>
                          {preset.cards.length} kartu • {preset.level}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="imp-howto">
                <div>
                  <b>1</b>
                  <p>
                    <strong>Dari Anki:</strong> Pilih deck, klik <em>File → Export</em>, format <em>.apkg</em> (mendukung format terbaru v3 zstd maupun lama).
                  </p>
                </div>
                <div>
                  <b>2</b>
                  <p>
                    <strong>Dari Tabel/Excel:</strong> Ekspor sebagai <em>.csv</em> atau <em>.tsv</em> dengan kolom kata &amp; arti.
                  </p>
                </div>
                <div>
                  <b>3</b>
                  <p>
                    <strong>Cadangan JSON:</strong> Unggah file cadangan <em>.json</em> dari aplikasi ini kapan pun.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stage === "parsing" && (
            <div className="imp-status">
              <div className="imp-enso" aria-hidden="true">
                <span>読</span>
              </div>
              <h3>Membaca &amp; menganalisis berkas di Web Worker…</h3>
              <div className="imp-bar">
                <i style={{ width: `${parsePct}%` }} />
              </div>
              <p className="imp-bar-meta">{parsePct}% selesai</p>
              <ul className="imp-checklist">
                {PARSE_STEPS.map((s, i) => {
                  const cur = PARSE_STEPS.findIndex((p) => p.id === parseStep);
                  return (
                    <li key={s.id} className={i < cur ? "done" : i === cur ? "on" : ""}>
                      <i>{i < cur ? <Icon name="check" size={12} /> : null}</i>
                      {s.label}
                    </li>
                  );
                })}
              </ul>
              <div style={{ marginTop: "16px" }}>
                <Button className="outline-button" onClick={() => void cancelActiveImport()}>
                  Batal
                </Button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="imp-status">
              <div className="imp-error-ico">
                <Icon name="alert" size={30} />
              </div>
              <h3>Gagal memproses berkas</h3>
              <p className="imp-error-msg">{error}</p>
              <Button className="pg-primary" onClick={reset}>
                <Icon name="refresh" size={15} /> Pilih berkas lain atau coba preset
              </Button>
            </div>
          )}

          {stage === "configure" && parsed && (
            <div className="imp-config">
              <div className="imp-col">
                <section className="imp-file">
                  <span className="imp-file-ico">
                    <Icon name="cards" size={20} />
                  </span>
                  <div>
                    <strong title={parsed.fileName}>{parsed.fileName}</strong>
                    <small>
                      {formatBadgeLabel(parsed.format)} • {parsed.totalDecks} deck •{" "}
                      {parsed.totalNotes.toLocaleString("id-ID")} kartu
                      {parsed.mediaCount > 0 && ` • ${parsed.mediaCount.toLocaleString("id-ID")} media`}
                    </small>
                  </div>
                  <button className="imp-link" onClick={reset}>
                    Ganti
                  </button>
                </section>

                {/* Target deck selection: New vs Existing */}
                {decks.length > 0 && (
                  <section className="imp-panel">
                    <h4>Tujuan penyimpanan</h4>
                    <div className="imp-dest-options">
                      <label className={`imp-dest-choice ${destMode === "new" ? "on" : ""}`}>
                        <input
                          type="radio"
                          name="destMode"
                          checked={destMode === "new"}
                          onChange={() => setDestMode("new")}
                        />
                        <div>
                          <strong>Buat deck baru</strong>
                          <small>Deck terpisah dengan sampul &amp; kanji sendiri</small>
                        </div>
                      </label>
                      <label className={`imp-dest-choice ${destMode === "existing" ? "on" : ""}`}>
                        <input
                          type="radio"
                          name="destMode"
                          checked={destMode === "existing"}
                          onChange={() => setDestMode("existing")}
                        />
                        <div>
                          <strong>Gabungkan ke deck yang ada</strong>
                          <small>Tambahkan kartu langsung ke koleksimu</small>
                        </div>
                      </label>
                    </div>

                    {destMode === "existing" && (
                      <label className="field" style={{ marginTop: "12px" }}>
                        <span>Pilih deck tujuan</span>
                        <select
                          id="imp-dest-deck"
                          value={existingDeckId}
                          onChange={(e) => setExistingDeckId(e.target.value)}
                        >
                          {decks.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.title} ({d.total.toLocaleString("id-ID")} kartu)
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </section>
                )}

                {destMode === "new" && (
                  <section className="imp-panel">
                    <h4>Identitas deck baru</h4>
                    <label className="field">
                      <span>Nama deck</span>
                      <input
                        id="imp-title-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Nama deck"
                      />
                    </label>
                    <div className="imp-row2">
                      <label className="field">
                        <span>Level target</span>
                        <select
                          id="imp-level"
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                        >
                          {LEVELS.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Kategori</span>
                        <select
                          id="imp-kind"
                          value={kind}
                          onChange={(e) => setKind(e.target.value)}
                        >
                          {KINDS.map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="imp-look">
                      <div className={`imp-cover deck-art ${color}`}>
                        <span>{kanji || "札"}</span>
                        <i />
                      </div>
                      <div className="imp-look-ctrl">
                        <span className="imp-sub">Warna sampul</span>
                        <div className="imp-swatches">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`deck-art ${c} ${c === color ? "on" : ""}`}
                              aria-label={`Warna ${c}`}
                              aria-pressed={c === color}
                              onClick={() => setColor(c)}
                            />
                          ))}
                        </div>
                        <span className="imp-sub">Kanji sampul</span>
                        <div className="imp-kanji">
                          <input
                            id="imp-kanji"
                            value={kanji}
                            maxLength={2}
                            onChange={(e) => setKanji(e.target.value)}
                            aria-label="Kanji sampul"
                          />
                          {KANJI_SUGGEST.map((k) => (
                            <button
                              key={k}
                              type="button"
                              className={k === kanji ? "on" : ""}
                              onClick={() => setKanji(k)}
                            >
                              {k}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {destMode === "new" && parsed.hierarchy?.hasSubdecks && (
                  <section className="imp-panel" style={{ background: "var(--tsuki)", border: "1px solid var(--garis)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "13px", color: "var(--kon)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Icon name="cards" size={15} /> Struktur Sub-deck (Revolusi Anki)
                        </h4>
                        <small style={{ color: "var(--tinta-2)", fontSize: "11px", display: "block", marginTop: "2px" }}>
                          {parsed.hierarchy.strategy === "anki-subdecks"
                            ? `Ditemukan ${parsed.hierarchy.groups.length} sub-deck di dalam paket Anki ini.`
                            : `Ditemukan ${parsed.hierarchy.groups.length} tingkatan level JLPT (N5–N1) dari tag kartu.`}
                        </small>
                      </div>
                      <Toggle
                        on={splitIntoSubdecks}
                        onChange={setSplitIntoSubdecks}
                        label="Pecah per sub-deck"
                      />
                    </div>

                    {splitIntoSubdecks ? (
                      <div style={{ marginTop: "10px" }}>
                        <p style={{ fontSize: "11px", color: "var(--tinta-2)", margin: "0 0 8px 0" }}>
                          Kartu otomatis dipisah ke sub-deck masing-masing (mis. <b>N5 hanya di sub-deck N5</b>, <b>N4 di sub-deck N4</b>):
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {parsed.hierarchy.groups.map((g) => (
                            <div
                              key={g.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "7px 10px",
                                background: "var(--panel)",
                                border: "1px solid var(--garis)",
                                borderRadius: "8px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  className={`deck-art ${g.color}`}
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "5px",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 700,
                                    fontSize: "11px",
                                    color: "#fff",
                                  }}
                                >
                                  {g.kanji}
                                </span>
                                <strong style={{ fontSize: "12px", color: "var(--tinta)" }}>{g.title}</strong>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "rgba(180, 201, 219, 0.28)",
                                    color: "var(--kon)",
                                  }}
                                >
                                  {g.levelCode}
                                </span>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--tinta-2)" }}>
                                  {g.noteCount.toLocaleString("id-ID")} kartu
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: "11px", color: "var(--tinta-2)", margin: "6px 0 0" }}>
                        Mode gabung: Semua {selectedNotesCount.toLocaleString("id-ID")} kartu akan digabung menjadi satu deck tunggal tanpa sub-deck.
                      </p>
                    )}
                  </section>
                )}

                {parsed.subdecks.length > 1 && (
                  <section className="imp-panel">
                    <h4>
                      Sub-deck{" "}
                      <small>
                        {selectedDecks.size}/{parsed.subdecks.length} sub-deck aktif ({parsed.totalDecks} total deck)
                      </small>
                      <button
                        type="button"
                        className="imp-link"
                        onClick={() =>
                          setSelectedDecks(
                            selectedDecks.size === parsed.subdecks.length
                              ? new Set()
                              : new Set(parsed.subdecks.map((d) => d.id)),
                          )
                        }
                      >
                        {selectedDecks.size === parsed.subdecks.length ? "Kosongkan" : "Pilih semua"}
                      </button>
                    </h4>
                    <ul className="imp-subdecks">
                      {parsed.subdecks.map((d) => (
                        <li key={d.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedDecks.has(d.id)}
                              onChange={() => toggleDeck(d.id)}
                            />
                            <span>
                              {d.name.split("::").map((seg, i, arr) =>
                                i < arr.length - 1 ? (
                                  <em key={i}>{seg} › </em>
                                ) : (
                                  <b key={i}>{seg}</b>
                                ),
                              )}
                            </span>
                            <small>{d.noteCount.toLocaleString("id-ID")}</small>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="imp-panel">
                  <h4>Opsi impor lanjutan</h4>
                  {parsed.mediaCount > 0 && (
                    <div className="imp-opt">
                      <div>
                        <strong>Sertakan media ({parsed.mediaCount.toLocaleString("id-ID")} berkas)</strong>
                        <small>Audio (.oga/.mp3) &amp; gambar didekompresi bertahap ke IndexedDB</small>
                      </div>
                      <Toggle
                        on={includeMedia}
                        onChange={setIncludeMedia}
                        label="Sertakan media"
                      />
                    </div>
                  )}

                  <div className="imp-opt">
                    <div>
                      <strong>Jadwal kartu (SRS)</strong>
                      <small>
                        {scheduleMode === "new"
                          ? "Impor semua sebagai kartu baru (default)"
                          : `Perkirakan jadwal dari ivl & factor (${scheduledCount.toLocaleString("id-ID")} kartu terjadwal)`}
                      </small>
                    </div>
                    <select
                      id="imp-schedule-mode"
                      value={scheduleMode}
                      onChange={(e) => setScheduleMode(e.target.value as "new" | "estimate")}
                      aria-label="Opsi jadwal kartu"
                    >
                      <option value="new">Impor sebagai kartu baru (Default)</option>
                      <option value="estimate">Perkirakan state dari ivl &amp; factor</option>
                    </select>
                  </div>

                  <div className="imp-opt">
                    <div>
                      <strong>Penanganan duplikat (Note ID)</strong>
                      <small>
                        {duplicateMode === "skip"
                          ? "Lewati catatan dengan Note ID yang sudah ada"
                          : "Perbarui isi kartu jika Note ID sudah ada"}
                      </small>
                    </div>
                    <select
                      id="imp-duplicate-mode"
                      value={duplicateMode}
                      onChange={(e) => setDuplicateMode(e.target.value as "skip" | "update")}
                      aria-label="Penanganan duplikat"
                    >
                      <option value="skip">Lewati duplikat</option>
                      <option value="update">Perbarui duplikat</option>
                    </select>
                  </div>

                  <div className="imp-opt">
                    <div>
                      <strong>Furigana otomatis</strong>
                      <small>Tampilkan bacaan ruby pada kanji kalimat</small>
                    </div>
                    <span className="imp-badge-on">Aktif</span>
                  </div>
                </section>
              </div>

              <div className="imp-col">
                <section className="imp-panel">
                  <h4>
                    Pemetaan field <small>dideteksi otomatis</small>
                  </h4>
                  {typesInUse.length > 1 && (
                    <div className="pg-tabs imp-types" role="tablist">
                      {typesInUse.map((t) => (
                        <button
                          key={t.id}
                          role="tab"
                          type="button"
                          aria-selected={t.id === activeNoteType?.id}
                          className={t.id === activeNoteType?.id ? "on" : ""}
                          onClick={() => {
                            setActiveType(t.id);
                            setSampleIdx(0);
                          }}
                        >
                          {t.name} <small>{t.noteCount}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {activeNoteType && mapping && (
                    <div className="imp-map">
                      {typesInUse.length === 1 && (
                        <p className="imp-type">
                          Tipe data: <b>{activeNoteType.name}</b>
                        </p>
                      )}
                      {ROLES.map((role) => {
                        const idx = mapping[role];
                        const sampleVal = idx >= 0 && sample ? sample.fields[idx] ?? "" : "";
                        const snippet =
                          role === "audio" || role === "sentenceAudio"
                            ? sampleVal.match(/\[sound:([^\]]+)\]/)?.[1] ?? ""
                            : role === "image"
                              ? /<img/i.test(sampleVal)
                                ? "gambar"
                                : ""
                              : toPlain(sampleVal);
                        return (
                          <div
                            key={role}
                            className={`imp-map-row ${ROLE_LABELS[role].required && idx < 0 ? "bad" : ""}`}
                          >
                            <div>
                              <strong>
                                {ROLE_LABELS[role].label}
                                {ROLE_LABELS[role].required && <em>*</em>}
                              </strong>
                              <small>{ROLE_LABELS[role].hint}</small>
                            </div>
                            <select
                              id={`imp-map-${role}`}
                              value={idx}
                              onChange={(e) => setRole(role, Number(e.target.value))}
                              aria-label={ROLE_LABELS[role].label}
                            >
                              <option value={-1}>— Tidak dipakai —</option>
                              {activeNoteType.fields.map((f, i) => (
                                <option key={i} value={i}>
                                  {f}
                                </option>
                              ))}
                            </select>
                            <span className="imp-snippet" title={snippet}>
                              {snippet || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="imp-preview">
                  <div className="imp-preview-head">
                    <span className="imp-sub">Pratinjau kartu nyata</span>
                    <div className="imp-nav">
                      <button
                        type="button"
                        aria-label="Contoh sebelumnya"
                        onClick={() =>
                          setSampleIdx((i) => (i - 1 + samples.length) % Math.max(1, samples.length))
                        }
                      >
                        <Icon name="arrow-left" size={14} />
                      </button>
                      <span>
                        {samples.length ? (sampleIdx % samples.length) + 1 : 0} / {samples.length}
                      </span>
                      <button
                        type="button"
                        aria-label="Contoh berikutnya"
                        onClick={() =>
                          setSampleIdx((i) => (i + 1) % Math.max(1, samples.length))
                        }
                      >
                        <Icon name="arrow" size={14} />
                      </button>
                    </div>
                  </div>
                  {preview ? (
                    <div className="imp-card">
                      <div className={`imp-card-band deck-art ${destMode === "new" ? color : "sage"}`}>
                        <i />
                      </div>
                      <div className="imp-card-front">
                        {preview.reading && <small>{preview.reading}</small>}
                        <strong lang="ja">{preview.word}</strong>
                        <button
                          type="button"
                          className="imp-play"
                          aria-label="Putar suara"
                          title="Putar Audio"
                          onClick={() => {
                            const src = previewAudioUrl ?? ttsUrl(preview.word);
                            void new Audio(src).play().catch(() => undefined);
                          }}
                        >
                          <Icon name="volume" size={15} />
                        </button>
                      </div>
                      <div className="imp-card-back">
                        {previewImageUrl && <img src={previewImageUrl} alt="" />}
                        {preview.meaning && (
                          <p
                            className="imp-mean"
                            dangerouslySetInnerHTML={{ __html: preview.meaning }}
                          />
                        )}
                        {preview.sentence && (
                          <p
                            className="imp-sent"
                            lang="ja"
                            dangerouslySetInnerHTML={{
                              __html: renderJapanese(preview.sentence, furigana),
                            }}
                          />
                        )}
                        {preview.translation && (
                          <p
                            className="imp-trans"
                            dangerouslySetInnerHTML={{ __html: preview.translation }}
                          />
                        )}
                        {!preview.meaning && !preview.sentence && (
                          <p className="imp-trans">Belum ada field untuk sisi belakang.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="imp-card empty">
                      <Icon name="alert" size={18} /> Tentukan field untuk “Kata / Depan” agar kartu bisa ditampilkan.
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {stage === "saving" && (
            <div className="imp-status">
              <div className="imp-enso" aria-hidden="true">
                <span>{progress.phase === "media" ? "音" : "札"}</span>
              </div>
              <h3>
                {progress.phase === "media"
                  ? "Mendekompresi & menyimpan berkas media ke IndexedDB…"
                  : progress.phase === "finish"
                    ? "Menyelesaikan sinkronisasi…"
                    : "Menyimpan kartu ke IndexedDB (per kelompok 500)…"}
              </h3>
              <div className="imp-bar">
                <i style={{ width: `${pct}%` }} />
              </div>
              <p className="imp-bar-meta">
                {progress.done.toLocaleString("id-ID")} / {progress.total.toLocaleString("id-ID")} • {pct}%
              </p>
              <small className="imp-note">
                Berjalan di latar belakang (Web Worker) — UI tetap responsif.
              </small>
              <div style={{ marginTop: "16px" }}>
                <Button className="outline-button warn" onClick={() => void cancelActiveImport()}>
                  Batal &amp; Hapus Data Setengah Jadi
                </Button>
              </div>
            </div>
          )}

          {stage === "done" && result && (
            <div className="imp-status">
              <div className="imp-success">
                <Icon name="check" size={34} />
              </div>
              <h3>
                Deck “{destMode === "new" ? title.trim() : decks.find((d) => d.id === existingDeckId)?.title}” siap dipelajari!
              </h3>
              <div className="imp-result">
                <div>
                  <strong>{result.decksCount.toLocaleString("id-ID")}</strong>
                  <span>jumlah deck</span>
                </div>
                <div>
                  <strong>{result.cardsTotal.toLocaleString("id-ID")}</strong>
                  <span>
                    kartu disimpan
                    {result.cardsUpdated > 0 ? ` (${result.cardsUpdated} diperbarui)` : ""}
                  </span>
                </div>
                <div>
                  <strong>{result.mediaStored.toLocaleString("id-ID")}</strong>
                  <span>media berhasil</span>
                </div>
                <div>
                  <strong>{result.mediaFailed.toLocaleString("id-ID")}</strong>
                  <span>media gagal</span>
                </div>
                <div>
                  <strong>{result.skipped.toLocaleString("id-ID")}</strong>
                  <span>kartu terlewati</span>
                </div>
              </div>
              {(result.skippedDuplicates > 0 || result.skippedEmpty > 0 || result.scheduled > 0) && (
                <small className="imp-note">
                  {result.skippedDuplicates > 0 && `${result.skippedDuplicates.toLocaleString("id-ID")} duplikat dilewati. `}
                  {result.skippedEmpty > 0 && `${result.skippedEmpty.toLocaleString("id-ID")} catatan dilewati karena field depan kosong. `}
                  {result.scheduled > 0 && `${result.scheduled.toLocaleString("id-ID")} jadwal SRS diperkirakan.`}
                </small>
              )}

              {result.subdecksCreated && result.subdecksCreated.length > 0 && (
                <div style={{ marginTop: "14px", padding: "10px 14px", background: "var(--tsuki)", border: "1px solid var(--garis)", borderRadius: "10px", fontSize: "12px", color: "var(--kon)", textAlign: "left" }}>
                  <strong>Terbagi ke dalam {result.subdecksCreated.length} sub-deck:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                    {result.subdecksCreated.map((s) => (
                      <span key={s.id} style={{ background: "rgba(180, 201, 219, 0.28)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>
                        {s.subdeckName} ({s.total.toLocaleString("id-ID")} kartu)
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="imp-done-actions">
                <Button className="outline-button" onClick={onClose}>
                  Kembali ke Koleksi Deck
                </Button>
                <Button className="pg-primary" onClick={() => onStudy(result.deckId)}>
                  Mulai Belajar Sekarang
                </Button>
              </div>
            </div>
          )}
        </div>

        {stage === "configure" && parsed && (
          <footer className="imp-foot">
            <p>
              {missingWord ? (
                <span className="warn">
                  <Icon name="alert" size={14} /> Tentukan field “Kata / Depan” untuk setiap tipe catatan.
                </span>
              ) : (
                <>
                  <b>{selectedNotesCount.toLocaleString("id-ID")}</b> kartu dari{" "}
                  <b>
                    {selectedDecks.size === parsed.subdecks.length
                      ? parsed.totalDecks
                      : selectedDecks.size}
                  </b>{" "}
                  deck akan diimpor
                  {destMode === "existing"
                    ? ` ke deck “${decks.find((d) => d.id === existingDeckId)?.title}”`
                    : includeMedia && parsed.mediaCount > 0
                      ? ` beserta ${parsed.mediaCount.toLocaleString("id-ID")} berkas media`
                      : ""}
                </>
              )}
            </p>
            <div>
              <Button className="outline-button" onClick={onClose}>
                Batal
              </Button>
              <Button
                className="pg-primary"
                disabled={!canImport}
                onClick={commit}
              >
                <Icon name="download" size={15} />{" "}
                {destMode === "existing" ? "Simpan ke Deck Terpilih" : "Impor Deck Baru"}
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
