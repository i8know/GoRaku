# Inventaris Halaman & Modal GoRaku

Dokumen ini mencatat seluruh rute halaman dan modal yang ada di GoRaku beserta berkas TSX dan CSS yang mengaturnya, sebagai acuan redesain Aizome.

## Rute Publik
| Rute | Komponen | CSS / Gaya Terkait | Catatan |
|---|---|---|---|
| `/` | `src/pages/Landing.tsx` | `src/index.css` (`.landing*`, `.lnav-*`), inline hex | Navbar sudah diubah menjadi Floating Pill Aizome |
| `/login` | `src/pages/LoginPage.tsx` | `src/index.css` (`.auth*`), `src/ui.tsx` | Form login/daftar mock |

## Cangkang Aplikasi (ProtectedLayout)
| Komponen | CSS / Gaya Terkait | Catatan |
|---|---|---|
| `src/components/Layout.tsx` | `src/index.css` (`.app-shell`, `.sidebar`, `.topbar`, `.mobile-bottom-nav`), inline hex | Membungkus seluruh rute `/beranda` s.d. `/settings` |
| `src/components/PageTransition.tsx` | `framer-motion` | Transisi antar halaman |
| `src/components/ToastContainer.tsx` | `src/index.css` / inline hex | Notifikasi toast global |
| `src/components/Skeleton.tsx` | `src/index.css` / inline hex | Placeholder loading |

## Rute Terlindungi
| Rute | Komponen | CSS / Gaya Terkait | Catatan |
|---|---|---|---|
| `/beranda` | `src/App.tsx` | `src/pages.css`, `src/decks.css`, `src/index.css`, inline hex | Dashboard beranda, daftar deck, ritme minggu |
| `/deck` | `src/pages/Decks.tsx` | `src/decks.css`, `src/pages.css`, inline hex | Daftar deck & sub-deck |
| `/deck/:deckId` | `src/pages/DeckDetail.tsx` | `src/decks.css`, `src/pages.css`, inline hex | Detail deck & daftar kartu |
| `/deck/:deckId/review` | `src/pages/Review.tsx` | `src/decks.css`, `src/pages.css`, inline hex | Sesi review SRS |
| `/mining` | `src/pages/Mining.tsx` | `src/pages.css`, `src/decks.css`, inline hex | Sentence mining & parser kamus |
| `/library` | `src/pages/Library.tsx` | `src/pages.css`, `src/decks.css`, inline hex | Perpustakaan novel & manga |
| `/library/:bookId` | `src/pages/Reader.tsx` + `src/components/ReaderPopup.tsx` | `src/pages.css`, `src/decks.css`, inline hex | Pembaca novel (Foliate-js / TXT) |
| `/manga/:bookId` | `src/pages/MangaReader.tsx` + `src/components/MangaOcrPanel.tsx` + `src/components/ReaderPopup.tsx` | `src/pages.css`, `src/decks.css`, inline hex | Pembaca manga (CBZ/gambar + OCR) |
| `/progress` | `src/pages/Progress.tsx` | `src/pages.css`, `src/decks.css`, inline hex | Statistik & progres belajar |
| `/exam` | `src/pages/Exam.tsx` + `src/components/jlpt/*` (`TestSessionRunner.tsx`, `TestReviewView.tsx`, `ListeningSceneCard.tsx`, `QuestionCard.tsx`) | `src/pages.css`, `src/decks.css`, banyak inline hex | Simulasi & tryout JLPT N5–N1 |
| `/license` | `src/pages/LicenseAttribution.tsx` | `src/pages.css`, inline hex | Atribusi lisensi & kamus |
| `/profile` | `src/pages/Profile.tsx` | `src/pages.css`, inline hex | Profil pengguna |
| `/settings` | `src/pages/Settings.tsx` | `src/pages.css`, `src/decks.css`, inline hex | Pengaturan aplikasi |

## Modal Global & Kontekstual
| Modal | Komponen | Dipakai di |
|---|---|---|
| Command Palette | `src/components/CommandPaletteModal.tsx` | `Layout.tsx` |
| Pengelola Kamus | `src/components/DictionaryManagerModal.tsx` | `Layout.tsx`, `Settings.tsx` |
| Impor Deck (.apkg) | `src/components/ImportDeckModal.tsx` | `App.tsx`, `Decks.tsx` |
| Form Buat/Ubah Deck | `src/components/DeckFormModal.tsx` + `DeckIdentityFields.tsx` | `App.tsx`, `Decks.tsx` |
| Detail Deck | `src/components/DeckDetailModal.tsx` | `Decks.tsx` |
| Editor Kartu | `src/components/CardEditorModal.tsx` | `DeckDetail.tsx`, `Review.tsx` |
| Kelola Manga | `src/components/MangaManageModal.tsx` | `Library.tsx` |
| Detail Ujian JLPT | `src/components/jlpt/TestDetailsModal.tsx` | `Exam.tsx` |
| Cek Audio Ujian | `src/components/jlpt/AudioCheckModal.tsx` | `Exam.tsx`, `TestSessionRunner.tsx` |
| Materi Tambahan Ujian | `src/components/jlpt/ExtraMaterialsModal.tsx` | `Exam.tsx`, `TestSessionRunner.tsx` |
