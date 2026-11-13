import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, PageHead, Toggle } from "../ui";
import { useAppStore } from "../store/useAppStore";
import DictionaryManagerModal from "../components/DictionaryManagerModal";
import { listDictionaries, type DictionaryRecord } from "../lib/lexiconDb";

export default function SettingsPage({ notify }: { notify: (m: string) => void }) {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [name, setName] = useState(user?.name || "Akira");
  const [level, setLevel] = useState(user?.level || "N3");
  const [newCards, setNewCards] = useState(settings.newCards);
  const [maxReview, setMaxReview] = useState(settings.maxReview);
  const [furi, setFuri] = useState(settings.furi);
  const [audio, setAudio] = useState(settings.audio);
  const [romaji, setRomaji] = useState(settings.romaji);
  const [remind, setRemind] = useState(settings.remind);
  const [time, setTime] = useState(settings.time);
  const [weekly, setWeekly] = useState(settings.weekly);
  const [size, setSize] = useState(settings.size);
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);

  useEffect(() => {
    void listDictionaries().then(setDictionaries).catch(() => {});
  }, []);

  const handleSave = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      notify("Nama panggilan tidak boleh kosong");
      return;
    }
    setName(cleanName);
    updateUser(cleanName, level);
    updateSettings({
      newCards,
      maxReview,
      furi,
      audio,
      romaji,
      remind,
      time,
      weekly,
      size,
    });
    notify("Pengaturan disimpan");
  };

  return (
    <>
      <PageHead eyebrow="PREFERENSI" title="Pengaturan" accent="設定" copy="Atur ritme belajar, tampilan kartu, dan pengingat sesuai caramu.">
        <Button className="pg-primary" onClick={handleSave}><Icon name="check" size={17} /> Simpan perubahan</Button>
      </PageHead>

      <div className="st-grid">
        <section className="st-card">
          <div className="st-title"><span><Icon name="user" size={18} /></span><div><h2>Profil</h2><p>Identitas dan target belajarmu</p></div></div>
          <div className="st-profile"><div className="avatar st-avatar">{(name.trim() || "P").charAt(0).toUpperCase()}</div><div><strong>{name.trim() || "Pelajar"}</strong><small>Level 14 • bergabung Januari 2026</small></div></div>
          <label className="field"><span>Nama panggilan</span><input value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Target level JLPT</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>{["N5", "N4", "N3", "N2", "N1"].map((l) => <option key={l}>{l}</option>)}</select>
          </label>
        </section>

        <section className="st-card">
          <div className="st-title"><span><Icon name="target" size={18} /></span><div><h2>Ritme belajar</h2><p>Batas harian agar tetap konsisten</p></div></div>
          <div className="st-range"><div><span>Kartu baru per hari</span><b>{newCards}</b></div><input type="range" min={5} max={50} step={5} value={newCards} onChange={(e) => setNewCards(+e.target.value)} aria-label="Kartu baru per hari" /></div>
          <div className="st-range"><div><span>Maksimum review per hari</span><b>{maxReview}</b></div><input type="range" min={40} max={300} step={20} value={maxReview} onChange={(e) => setMaxReview(+e.target.value)} aria-label="Maksimum review per hari" /></div>
          <p className="st-note">Estimasi waktu: sekitar <strong>{Math.round((newCards * 1.2 + maxReview * 0.18) / 5) * 5} menit</strong> per hari.</p>
        </section>

        <section className="st-card">
          <div className="st-title"><span><Icon name="cards" size={18} /></span><div><h2>Tampilan kartu</h2><p>Bagaimana kartu ditampilkan</p></div></div>
          <div className="st-row"><div><strong>Tampilkan furigana</strong><small>Bacaan hiragana di atas kanji</small></div><Toggle on={furi} onChange={setFuri} label="Furigana" /></div>
          <div className="st-row"><div><strong>Putar audio otomatis</strong><small>Saat kartu dibalik</small></div><Toggle on={audio} onChange={setAudio} label="Audio otomatis" /></div>
          <div className="st-row"><div><strong>Tampilkan romaji</strong><small>Untuk pemula</small></div><Toggle on={romaji} onChange={setRomaji} label="Romaji" /></div>
          <div className="st-row"><div><strong>Ukuran teks Jepang</strong></div>
            <div className="st-seg" role="group" aria-label="Ukuran teks Jepang">
              {["Kecil", "Sedang", "Besar"].map((s) => (
                <button key={s} type="button" aria-pressed={size === s} className={size === s ? "on" : ""} onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="st-card">
          <div className="st-title"><span><Icon name="bell" size={18} /></span><div><h2>Pengingat</h2><p>Jaga streak tetap menyala</p></div></div>
          <div className="st-row"><div><strong>Pengingat harian</strong><small>Notifikasi jika belum review</small></div><Toggle on={remind} onChange={setRemind} label="Pengingat harian" /></div>
          <div className="st-row"><div><strong>Waktu pengingat</strong></div><input className="st-time" type="time" value={time} disabled={!remind} onChange={(e) => setTime(e.target.value)} aria-label="Waktu pengingat" /></div>
          <div className="st-row"><div><strong>Ringkasan mingguan</strong><small>Dikirim setiap hari Minggu</small></div><Toggle on={weekly} onChange={setWeekly} label="Ringkasan mingguan" /></div>
        </section>

        <section className="st-card st-danger">
          <div className="st-title"><span><Icon name="upload" size={18} /></span><div><h2>Data &amp; Kamus</h2><p>Kelola kamus Yomitan dan cadangkan koleksimu</p></div></div>
          <div className="st-actions">
            <Button className="outline-button" onClick={() => navigate("/license")}>
              <Icon name="bookmark" size={16} /> Lisensi &amp; Atribusi Sumber Data
            </Button>
            <Button className="outline-button" onClick={() => setDictModalOpen(true)}>
              <Icon name="book" size={16} /> Kelola Kamus Yomitan ({dictionaries.filter((d) => d.enabled).length})
            </Button>
            <Button className="outline-button" onClick={() => notify("Deck diekspor sebagai .apkg")}><Icon name="upload" size={16} /> Ekspor deck</Button>
            <Button className="outline-button" onClick={() => notify("Pilih berkas untuk diimpor")}><Icon name="plus" size={16} /> Impor deck</Button>
            <Button className="outline-button warn" onClick={() => notify("Progres belum dihapus — konfirmasi diperlukan")}><Icon name="trash" size={16} /> Reset progres</Button>
          </div>
        </section>
      </div>

      <DictionaryManagerModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
        onDictionariesChanged={setDictionaries}
      />
    </>
  );
}
