import { Link } from "react-router-dom";
import { CURRENT_CONSENT_VERSION } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export default function TermsOfServicePage() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");

  return (
    <main className="min-h-dvh bg-[var(--bg)] text-[var(--tinta)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-10 shadow-sm">
        <div
          role="note"
          className="mb-6 rounded-xl border border-[rgba(185,60,34,0.3)] bg-[rgba(185,60,34,0.08)] px-4 py-3 text-sm text-[var(--tinta)]"
        >
          <strong>Draf — perlu ditinjau.</strong> Syarat penggunaan ini disusun sebagai draf
          untuk GoRaku Tahap B1 dan wajib ditinjau oleh pengelola layanan. Referensi versi:{" "}
          <code>{CURRENT_CONSENT_VERSION}</code>.
        </div>

        <header className="mb-8 border-b border-[var(--line)] pb-5">
          <p className="eyebrow">KETENTUAN LAYANAN GORAKU</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
            Syarat Penggunaan
          </h1>
          <p className="mt-2 text-sm text-[var(--tinta-2)]">
            Ketentuan umum penggunaan aplikasi pembelajaran GoRaku dan tanggung jawab konten lokal.
          </p>
        </header>

        <div className="grid gap-6 text-sm leading-relaxed text-[var(--tinta-2)]">
          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              1. Ruang Lingkup Layanan
            </h2>
            <p>
              GoRaku menyediakan alat bantu belajar bahasa Jepang (spaced repetition FSRS,
              pembaca novel/manga, dan latihan JLPT) yang beroperasi secara lokal di peramban
              Anda dengan autentikasi akun berbasis Supabase.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              2. Keamanan Akun &amp; Tanggung Jawab Konten Impor
            </h2>
            <p>
              Anda bertanggung jawab menjaga kerahasiaan kata sandi atau akun Google yang dipakai
              untuk masuk, serta memastikan berkas yang Anda impor ke penyimpanan lokal perangkat
              (paket <code>.apkg</code>, buku EPUB/TXT, arsip manga CBZ/ZIP, dan kamus Yomitan)
              diperoleh secara sah.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              3. Ketersediaan Layanan &amp; Cadangan Data
            </h2>
            <p>
              Selama Tahap B1 (sebelum sinkronisasi awan Tahap B2 diaktifkan), penghapusan cache/data
              situs pada peramban akan memengaruhi data belajar lokal. Anda disarankan mengekspor
              data secara berkala melalui fitur <strong>Ekspor data saya</strong> di halaman Profil.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              4. Kontak Pengelola Layanan
            </h2>
            <p>
              Nama Pengelola: <strong>[ISI OLEH PEMILIK]</strong>
              <br />
              Email Dukungan &amp; Pertanyaan Hukum: <strong>[ISI OLEH PEMILIK]</strong>
            </p>
          </section>
        </div>

        <footer className="mt-8 pt-5 border-t border-[var(--line)] flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
          <div className="flex flex-wrap gap-4">
            <Link to={signedIn ? "/settings" : "/login"} className="text-[var(--ai)] hover:underline">
              ← {signedIn ? "Kembali ke Pengaturan" : "Kembali ke Masuk / Daftar"}
            </Link>
            <Link to="/" className="text-[var(--tinta-2)] hover:text-[var(--ai)] hover:underline">
              Beranda Publik
            </Link>
          </div>
          <Link to="/privasi" className="text-[var(--ai)] hover:underline">
            Baca Kebijakan Privasi →
          </Link>
        </footer>
      </div>
    </main>
  );
}
