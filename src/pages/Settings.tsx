import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, PageHead, Toggle } from "../ui";
import { useAppStore } from "../store/useAppStore";
import DictionaryManagerModal from "../components/DictionaryManagerModal";
import { listDictionaries, type DictionaryRecord } from "../lib/lexiconDb";
import {
  exportScheduleBackupJson,
  importScheduleBackup,
} from "../lib/scheduleBackup";

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
  const [dayStartHour, setDayStartHour] = useState(settings.dayStartHour ?? 4);
  const [desiredRetention, setDesiredRetention] = useState(settings.desiredRetention ?? 0.9);
  const [newOrder, setNewOrder] = useState<"urutan" | "acak">(settings.newOrder ?? "urutan");
  const [furi, setFuri] = useState(settings.furi);
  const [audio, setAudio] = useState(settings.audio);
  const [romaji, setRomaji] = useState(settings.romaji);
  const [remind, setRemind] = useState(settings.remind);
  const [time, setTime] = useState(settings.time);
  const [weekly, setWeekly] = useState(settings.weekly);
  const [size, setSize] = useState(settings.size);
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const handleExportSchedule = async () => {
    try {
      const json = await exportScheduleBackupJson();
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goraku-jadwal-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify("Jadwal belajar diekspor sebagai JSON");
    } catch {
      notify("Gagal mengekspor jadwal belajar");
    }
  };

  const handleImportScheduleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const { cardsCount, logsCount } = await importScheduleBackup(text);
      notify(`Jadwal berhasil diimpor (${cardsCount} kartu, ${logsCount} log review)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Berkas jadwal tidak valid";
      notify(msg);
    }
  };

  useEffect(() => {
    void listDictionaries().then(setDictionaries).catch(() => {});
  }, []);

  const handleSave = () => {
    updateUser(name, level);
    updateSettings({
      newCards,
      maxReview,
      dayStartHour,
      desiredRetention,
      newOrder,
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
          <div className="st-title"><span><Icon name="user" size={18} /></span><div><h3>Profil</h3><p>Identitas dan target belajarmu</p></div></div>
          <div className="st-profile"><div className="avatar st-avatar">{name.charAt(0).toUpperCase()}</div><div><strong>{name || "Pelajar"}</strong><small>Level 14 • bergabung Januari 2026</small></div></div>
          <label className="field"><span>Nama panggilan</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Target level JLPT</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>{["N5", "N4", "N3", "N2", "N1"].map((l) => <option key={l}>{l}</option>)}</select>
          </label>
        </section>

        <section className="st-card">
          <div className="st-title"><span><Icon name="target" size={18} /></span><div><h3>Ritme belajar</h3><p>Batas harian agar tetap konsisten</p></div></div>
          <div className="st-range"><div><span>Kartu baru per hari</span><b>{newCards}</b></div><input type="range" min={1} max={50} step={1} value={newCards} onChange={(e) => setNewCards(+e.target.value)} aria-label="Kartu baru per hari" /></div>
          <div className="st-range"><div><span>Maksimum review per hari</span><b>{maxReview}</b></div><input type="range" min={40} max={300} step={20} value={maxReview} onChange={(e) => setMaxReview(+e.target.value)} aria-label="Maksimum review per hari" /></div>
          <div className="st-range"><div><span>Pergantian hari belajar</span><b>{String(dayStartHour).padStart(2, "0")}:00</b></div><input type="range" min={0} max={8} step={1} value={dayStartHour} onChange={(e) => setDayStartHour(+e.target.value)} aria-label="Pergantian hari belajar" /></div>
          <div className="st-range"><div><span>Target ingatan (FSRS)</span><b>{Math.round(desiredRetention * 100)}%</b></div><input type="range" min={0.8} max={0.97} step={0.01} value={desiredRetention} onChange={(e) => setDesiredRetention(+e.target.value)} aria-label="Target ingatan (FSRS)" /></div>
          <div className="st-row"><div><strong>Urutan kartu baru</strong><small>Sesuai urutan deck atau diacak per hari</small></div>
            <div className="st-seg">
              {([
                { id: "urutan", label: "Urutan" },
                { id: "acak", label: "Acak" },
              ] as const).map((opt) => (
                <button key={opt.id} type="button" className={newOrder === opt.id ? "on" : ""} onClick={() => setNewOrder(opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p className="st-note">Target retensi lebih tinggi menjadwalkan review lebih sering agar hafalan lebih kuat.</p>
          <p className="st-note">Estimasi waktu: sekitar <strong>{Math.round((newCards * 1.2 + maxReview * 0.18) / 5) * 5} menit</strong> per hari.</p>
        </section>

        <section className="st-card">
          <div className="st-title"><span><Icon name="cards" size={18} /></span><div><h3>Tampilan kartu</h3><p>Bagaimana kartu ditampilkan</p></div></div>
          <div className="st-row"><div><strong>Tampilkan furigana</strong><small>Bacaan hiragana di atas kanji</small></div><Toggle on={furi} onChange={setFuri} label="Furigana" /></div>
          <div className="st-row"><div><strong>Putar audio otomatis</strong><small>Saat kartu dibalik</small></div><Toggle on={audio} onChange={setAudio} label="Audio otomatis" /></div>
          <div className="st-row"><div><strong>Tampilkan romaji</strong><small>Untuk pemula</small></div><Toggle on={romaji} onChange={setRomaji} label="Romaji" /></div>
          <div className="st-row"><div><strong>Ukuran teks Jepang</strong></div>
            <div className="st-seg">{["Kecil", "Sedang", "Besar"].map((s) => <button key={s} className={size === s ? "on" : ""} onClick={() => setSize(s)}>{s}</button>)}</div>
          </div>
        </section>

        <section className="st-card">
          <div className="st-title"><span><Icon name="bell" size={18} /></span><div><h3>Pengingat</h3><p>Jaga streak tetap menyala</p></div></div>
          <div className="st-row"><div><strong>Pengingat harian</strong><small>Notifikasi jika belum review</small></div><Toggle on={remind} onChange={setRemind} label="Pengingat harian" /></div>
          <div className="st-row"><div><strong>Waktu pengingat</strong></div><input className="st-time" type="time" value={time} disabled={!remind} onChange={(e) => setTime(e.target.value)} aria-label="Waktu pengingat" /></div>
          <div className="st-row"><div><strong>Ringkasan mingguan</strong><small>Dikirim setiap hari Minggu</small></div><Toggle on={weekly} onChange={setWeekly} label="Ringkasan mingguan" /></div>
        </section>

        <section className="st-card st-danger">
          <div className="st-title"><span><Icon name="upload" size={18} /></span><div><h3>Data &amp; Kamus</h3><p>Kelola kamus Yomitan dan cadangkan koleksimu</p></div></div>
          <p className="st-note">Data belajar disimpan di peramban ini (localStorage &amp; IndexedDB). Ekspor jadwal secara berkala agar progres tidak hilang saat data situs dibersihkan.</p>
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => void handleImportScheduleFile(e)}
            aria-label="Pilih berkas JSON jadwal belajar"
          />
          <div className="st-actions">
            <Button className="outline-button" onClick={() => navigate("/license")}>
              <Icon name="bookmark" size={16} /> Lisensi &amp; Atribusi Sumber Data
            </Button>
            <Button className="outline-button" onClick={() => setDictModalOpen(true)}>
              <Icon name="book" size={16} /> Kelola Kamus Yomitan ({dictionaries.filter((d) => d.enabled).length})
            </Button>
            <Button className="outline-button" onClick={() => void handleExportSchedule()}><Icon name="download" size={16} /> Ekspor jadwal belajar (JSON)</Button>
            <Button className="outline-button" onClick={() => importFileRef.current?.click()}><Icon name="upload" size={16} /> Impor jadwal belajar (JSON)</Button>
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
