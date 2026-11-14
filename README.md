# GoRaku — Ma (間) Japanese Immersion SRS

GoRaku adalah aplikasi belajar bahasa Jepang berbasis *spaced repetition* (SRS) dengan dukungan impor deck Anki (`.apkg`), subdeck hierarkis, latihan menulis kanji, dan pembaca bacaan imersi.

## Penjadwal FSRS & Perilaku Harian

GoRaku menggunakan algoritma **FSRS** melalui paket [`ts-fsrs@5.4.2`](https://github.com/open-spaced-repetition/ts-fsrs) (`enable_short_term: false`) dan batas hari belajar ala Anki:

- **Pergantian hari belajar (`dayStartHour`):** Bawaan pukul **04:00** waktu lokal (dapat diatur pada rentang `00:00–08:00` di Pengaturan). Hari belajar dihitung dari tanggal lokal `(now - dayStartHour jam)`. Kartu dengan interval $\ge 1$ hari dijadwalkan jatuh tempo tepat pada awal hari belajar ke-`interval` (pukul `dayStartHour:00`), bukan `now + interval × 24 jam`.
- **Target ingatan (`desiredRetention`):** Bawaan **0.90** (90%), dapat diatur pada rentang `0.80–0.97`. Retensi lebih tinggi menghasilkan interval review lebih pendek (lebih sering mengulang).
- **Pemetaan tombol penilaian:**
  - `Lupa` (pintas `1`, kualitas `0`) $\rightarrow$ `Rating.Again`
  - `Sulit` (pintas `2`, kualitas `2`) $\rightarrow$ `Rating.Hard`
  - `Baik` (pintas `3`, kualitas `4`) $\rightarrow$ `Rating.Good`
  - `Mudah` (pintas `4`, kualitas `5`) $\rightarrow$ `Rating.Easy`
- **Pengulangan dalam sesi (*drill*):** Kartu yang dinilai **Lupa** diantrekan ulang pada sesi yang sama sebagai latihan (*drill*). Penilaian kedua dan seterusnya pada kartu yang sama di sesi yang sama tidak mengubah status FSRS, tidak menambah `lapses`, dan tidak mencatat log baru di IndexedDB (`reviewLogs`).

### Migrasi Lazy Kartu SM-2 ke FSRS (`legacyToFsrs`)

Kartu dari jadwal SM-2 lama atau hasil impor `.apkg` (tanpa penanda `scheduler: "fsrs"`) dimigrasi secara *lazy* pada saat pertama kali dinilai tanpa mengubah jadwal sebelum kartu tersebut direview:

1. **Kartu yang belum pernah lulus review (`repetitions <= 0`):**
   - Diperlakukan sebagai kartu baru (`State.New`, `stability = 0`, `reps = 0`).
2. **Kartu yang sudah pernah direview (`repetitions > 0`):**
   - Status awal disetel ke `State.Review`.
   - **Stabilitas (`stability`)** didekati dari interval SM-2 dalam satuan hari dengan batas bawah `0.5` hari:
     $$\text{stability} = \max(0.5,\ \text{interval})$$
   - **Kesulitan (`difficulty`)** dipetakan secara monoton terbalik dari `easeFactor` SM-2 (rentang umum $1.3 - 3.0$, bawaan $2.5$) ke rentang FSRS $[1, 10]$ (semakin tinggi *ease factor*, semakin rendah *difficulty*):
     $$\text{difficulty} = \text{clamp}\!\left(10 - 4.5 \times (\text{easeFactor} - 1.3),\ 1,\ 10\right)$$
     Contoh nilai pemetaan:
     - `easeFactor = 1.3` $\rightarrow$ `difficulty = 10.0`
     - `easeFactor = 2.5` (bawaan SM-2) $\rightarrow$ `difficulty = 4.6`
     - `easeFactor = 3.0` $\rightarrow$ `difficulty = 2.35`
     - `easeFactor >= 3.3` $\rightarrow$ `difficulty = 1.0`

## Pengembangan

```bash
npm install
npm test
npm run build
```
