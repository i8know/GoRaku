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
          privasi untuk tahap awal sistem akun GoRaku (Tahap B1) dan wajib ditinjau oleh
          pengelola sebelum peluncuran penuh. Versi persetujuan:{" "}
          <code>{CURRENT_CONSENT_VERSION}</code>.
        </div>

        <header className="mb-8 border-b border-[var(--line)] pb-5">
          <p className="eyebrow">DOKUMEN PRIVASI GORAKU</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
            Kebijakan Privasi
          </h1>
          <p className="mt-2 text-sm text-[var(--tinta-2)]">
            Transparansi penyimpanan data akun dan progres belajar bahasa Jepang di GoRaku.
          </p>
        </header>

        <div className="grid gap-6 text-sm leading-relaxed text-[var(--tinta-2)]">
          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              1. Data yang disimpan secara lokal di peramban Anda (Tahap B1)
            </h2>
            <p>
              Pada tahap B1, seluruh materi dan progres belajar utama Anda tetap bersifat{" "}
              <em>local-first</em> dan disimpan terisolasi per akun hanya di peramban perangkat ini
              (<code>localStorage</code> dan <code>IndexedDB</code>): daftar deck &amp; kartu
              flashcard, media kartu, jadwal FSRS, riwayat ulasan (<code>reviewLogs</code>),
              buku/manga yang Anda impor, kamus Yomitan, paket soal JLPT, sesi ujian tiruan, serta
              pengenal perangkat lokal acak (<code>device_id</code>) per akun.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--tinta)] mb-2">
              2. Data yang disimpan di server Supabase
            </h2>
            <p>
              Layanan autentikasi dan basis data akun dikelola melalui Supabase untuk memverifikasi
              identitas Anda dan menyimpan data profil dasar pada tabel <code>public.profiles</code>
              : alamat email, ID pengguna, nama tampilan (<code>display_name</code>), target tingkat
              JLPT (<code>jlpt_level</code>), waktu persetujuan (<code>consented_at</code>), dan
              versi persetujuan (<code>consent_version</code>).
            </p>
            <p className="mt-2">
              Tabel data belajar di server untuk sinkronisasi lintas perangkat (Tahap B2) sudah
              disiapkan skemanya dengan kebijakan Row Level Security ketat, namun belum menerima
              unggahan data belajar secara otomatis pada Tahap B1.
            </p>
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
