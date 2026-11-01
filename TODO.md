# Japanese Language Learning App - Roadmap

## Sprint 1: Foundation & Auth
- [x] Setup `react-router-dom` (Public vs Protected routes).
- [x] Create `LandingPage.tsx` (Guest access).
- [x] Create `LoginPage.tsx` (Simple mock auth).
- [x] Implement `useAuthStore` using `zustand`.

## Sprint 2: Core UX
- [x] Migrate `App.tsx` layout to `Layout.tsx` (Main shell).
- [x] Add `ProtectedLayout` for authenticated routes.
- [x] Add loading skeletons for data fetching.

## Sprint 3: Functionality
- [x] Replace hardcoded mock data in pages with `useDeckStore` and `useMiningStore`.
- [x] Implement SRS (Spaced Repetition) logic for review cards (`src/lib/srs.ts`, `src/store/useReviewStore.ts`).
- [x] Add persistence (LocalStorage).
- [x] Add sound/audio player hook (`src/hooks/useAudio.ts`).

## Sprint 4: Polish
- [x] Add basic framer-motion/transitions & skeleton placeholders.
- [x] Refine accessibility (A11y) & responsive layouts.
- [x] Final build verified without errors.

## Sprint 5: Anki APKG Import & Deck Dashboard
- [x] Client-side `.apkg` / `.colpkg` parser (`src/lib/apkg.ts`) supporting legacy (`anki2`/`anki21`) and modern (`anki21b` zstd) archives via `fflate`, `fzstd`, and `sql.js` (WebAssembly).
- [x] IndexedDB offline storage (`src/lib/deckDb.ts`) for deck cards and media blobs (audio & images).
- [x] Anki field mapping heuristics, furigana `<ruby>` conversion, and HTML sanitization (`src/lib/ankiText.ts`).
- [x] Multi-step interactive import wizard (`src/components/ImportDeckModal.tsx`) with dropzone, deck customization, sub-deck filters, and live card preview.
- [x] Revamped Deck Dashboard (`src/pages/Decks.tsx`) with import hero banner, page-wide drag-and-drop, "Dari Anki" filter, and live SRS stats.
- [x] Deck Detail Sheet (`src/components/DeckDetailModal.tsx`) with card browser, search, SRS state tags, and deck deletion.
- [x] Review integration (`src/pages/Review.tsx`) with audio/image playback from IndexedDB, SM-2 scheduling, daily new-card limits, and keyboard shortcuts.

