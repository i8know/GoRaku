import { Link } from "react-router-dom";
import { CURRENT_CONSENT_VERSION } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export default function PrivacyPolicyPage() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");

  return (
    <main className="min-h-dvh bg-[var(--bg)] text-[var(--tinta)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-10 shadow-sm">
        <div
          role="note"
          className="mb-6 rounded-xl border border-[rgba(185,60,34,0.3)] bg-[rgba(185,60,34,0.08)] px-4 py-3 text-sm text-[var(--tinta)]"
        >
          <strong>Draf — perlu ditinjau.</strong> Dokumen ini merupakan rancangan kebijakan
          privasi untuk sistem akun dan sinkronisasi data belajar GoRaku (Tahap B2) dan wajib
          ditinjau oleh pengelola sebelum peluncuran penuh. Versi persetujuan:{" "}
          <code>{CURRENT_CONSENT_VERSION}</code>.
        </div>

        <header className="mb-8 border-b border-[var(--line)] pb-5">
          <p className="eyebrow">DOKUMEN PRIVASI GORAKU</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
            Kebijakan Privasi
          </h1>
          <p className="mt-2 text-sm text-[var(--tinta-2)]">
            Transparansi penyimpanan lokal dan sinkronisasi lintas perangkat atas data akun dan
            progres belajar bahasa Jepang di GoRaku.
          </p>
        </header>

        <div className="grid gap-6 text-sm leading-relaxed text-[var(--tinta-2)]">
          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              1. Data yang disinkronkan ke server Supabase (Tahap B2)
            </h2>
            <p>
              GoRaku bekerja secara <em>local-first</em>: data belajar Anda tetap disimpan di
              peramban agar dapat digunakan secara instan dan luring (<em>offline</em>). Setelah
              Anda menyetujui versi kebijakan ini, data berikut disinkronkan ke basis data
              Supabase yang dilindungi <em>Row Level Security</em> per akun:
            </p>
            <ul className="list-disc pl-5 mt-2 grid gap-1">
              <li>
                <strong>Profil akun (<code>profiles</code>):</strong> alamat email autentikasi, ID
                pengguna, nama tampilan (<code>display_name</code>), target JLPT (
                <code>jlpt_level</code>), waktu persetujuan (<code>consented_at</code>), dan versi
                persetujuan (<code>consent_version</code>).
              </li>
              <li>
                <strong>Pengaturan &amp; batas deck (<code>user_settings</code>):</strong> preferensi
                belajar harian, retensi FSRS, tampilan kartu, pengingat, serta batas per deck.
              </li>
              <li>
                <strong>Deck &amp; isi teks kartu (<code>decks</code>, <code>cards</code>):</strong>{" "}
                judul, hierarki sub-deck, metadata deck, serta isi teks kartu (kata, bacaan, arti,
                kalimat, terjemahan, tag, dan nama referensi media — <em>tanpa</em> berkas media).
              </li>
              <li>
                <strong>Jadwal FSRS, riwayat ulasan &amp; counter harian</strong> (
                <code>srs_cards</code>, <code>review_logs</code>, <code>daily_counters</code>):
                status stabilitas/kesulitan FSRS, catatan ulasan per kartu beserta ID perangkat acak
                (<code>device_id</code>), dan hitungan kartu baru/ulasan harian.
              </li>
            </ul>
            <p className="mt-2">
              Pengunggahan data belajar tidak akan dimulai sebelum Anda menyetujui versi kebijakan
              terbaru ini. Anda juga dapat menjeda sinkronisasi kapan saja pada perangkat tertentu
              melalui menu Pengaturan.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              2. Data yang tetap tersimpan hanya di perangkat ini (tidak disinkronkan)
            </h2>
            <p>
              Data berikut tetap terisolasi per akun hanya di penyimpanan peramban perangkat ini (
              <code>localStorage</code> dan <code>IndexedDB</code>) dan{" "}
              <strong>tidak diunggah ke server</strong> pada Tahap B2:
            </p>
            <ul className="list-disc pl-5 mt-2 grid gap-1">
              <li>
                <strong>Berkas media kartu:</strong> audio pelafalan dan gambar kartu (dari impor{" "}
                <code>.apkg</code> maupun potongan gelembung manga). Kartu tetap tampil normal di
                perangkat lain dengan pemberitahuan media lokal dan cadangan suara sistem (TTS).
              </li>
              <li>
                <strong>Buku, novel &amp; manga:</strong> seluruh berkas EPUB/TXT/CBZ, halaman
                manga, dan cache OCR.
              </li>
              <li>
                <strong>Kamus Yomitan:</strong> seluruh paket kamus yang Anda impor.
              </li>
              <li>
                <strong>Data lokal lainnya:</strong> antrean Sentence Mining (<code>minedQueue</code>
                ), daftar pustaka lokal (<code>libraryItems</code>), paket soal &amp; sesi ujian
                JLPT.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              3. Pengelola &amp; Kontak Privasi
            </h2>
            <p>
              Pengelola layanan: <strong>Royharto Bonifasius Manullang</strong>
              <br />
              Email kontak privasi / permintaan data: <strong>agnesmanalu123@gmail.com</strong>
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              4. Hak Anda atas Data (Ekspor &amp; Penghapusan Akun)
            </h2>
            <ul className="list-disc pl-5 grid gap-1.5">
              <li>
                <strong>Ekspor data:</strong> Anda dapat mengunduh profil, pengaturan, deck,
                kartu, progres SRS, serta metadata buku &amp; kamus dalam format JSON kapan saja
                melalui halaman Profil.
              </li>
              <li>
                <strong>Hapus akun permanen:</strong> Melalui menu Profil, Anda dapat menghapus
                akun Supabase (<code>auth.users</code> dan seluruh baris terhubung via CASCADE)
                sekaligus membersihkan seluruh penyimpanan lokal akun tersebut di peramban ini.
              </li>
            </ul>
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
          <Link to="/syarat" className="text-[var(--ai)] hover:underline">
            Baca Syarat Penggunaan →
          </Link>
        </footer>
      </div>
    </main>
  );
}
