import { useMemo, useState } from "react";
import { Icon, PageHead, Tabs } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";

const ranges = ["7 hari", "30 hari", "90 hari"] as const;
type R = (typeof ranges)[number];

const vocab: Record<R, number[]> = {
  "7 hari": [1190, 1203, 1215, 1228, 1244, 1263, 1284],
  "30 hari": [1010, 1048, 1075, 1102, 1131, 1160, 1189, 1210, 1236, 1255, 1271, 1284],
  "90 hari": [520, 610, 702, 788, 861, 940, 1012, 1089, 1148, 1205, 1248, 1284],
};
const kpis: Record<R, { cards: string; ret: string; time: string; words: string; dc: string; dr: string; dt: string; dw: string }> = {
  "7 hari": { cards: "412", ret: "87%", time: "3j 42m", words: "+94", dc: "+12%", dr: "+2%", dt: "+8%", dw: "+21" },
  "30 hari": { cards: "1.640", ret: "85%", time: "14j 10m", words: "+274", dc: "+9%", dr: "+1%", dt: "+4%", dw: "+38" },
  "90 hari": { cards: "4.920", ret: "83%", time: "41j 05m", words: "+764", dc: "+22%", dr: "+5%", dt: "+17%", dw: "+190" },
};

const heat = Array.from({ length: 16 * 7 }, (_, i) => {
  const d = i % 7, w = Math.floor(i / 7);
  const v = (i * 7 + w * 3 + d * 5) % 11;
  const base = d >= 5 ? v - 3 : v;
  return base < 2 ? 0 : base < 4 ? 1 : base < 7 ? 2 : base < 9 ? 3 : 4;
});

const jlpt = [
  { lv: "N5", p: 100, n: "800 / 800" }, { lv: "N4", p: 78, n: "520 / 668" }, { lv: "N3", p: 41, n: "512 / 1.250" },
  { lv: "N2", p: 9, n: "140 / 1.600" }, { lv: "N1", p: 0, n: "0 / 2.600" },
];
const sourcesMix = [
  { n: "Novel", p: 58, c: "var(--kon)" }, { n: "Manga", p: 42, c: "var(--ai)" },
];
const forecast = [44, 31, 52, 27, 38, 60, 22];
const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function Line({
  pts,
  activeIdx,
  onHoverIdx,
}: {
  pts: number[];
  activeIdx: number | null;
  onHoverIdx: (idx: number | null) => void;
}) {
  const W = 600, H = 190, pad = 14;
  const min = Math.min(...pts) - 40, max = Math.max(...pts) + 20;
  const xy = pts.map((v, i) => [
    pad + (i * (W - pad * 2)) / (pts.length - 1),
    H - pad - ((v - min) / (max - min)) * (H - pad * 2),
  ]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  const selIdx = activeIdx ?? pts.length - 1;
  const selPt = xy[selIdx] ?? last;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="pr-line"
      role="img"
      aria-label="Pertumbuhan kosakata"
      onMouseLeave={() => onHoverIdx(null)}
    >
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} />
      ))}
      <path d={`${d} L${last[0]} ${H} L${xy[0][0]} ${H} Z`} className="area" />
      <path d={d} className="stroke" />
      <line
        x1={selPt[0]}
        x2={selPt[0]}
        y1={pad}
        y2={H - pad}
        stroke="var(--ai)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />
      {xy.map(([x, y], i) => {
        const isSel = i === selIdx;
        return (
          <g key={i} className="cursor-pointer" onMouseEnter={() => onHoverIdx(i)} onClick={() => onHoverIdx(i)}>
            <circle cx={x} cy={y} r={14} fill="transparent" stroke="none" />
            <circle cx={x} cy={y} r={isSel ? 6 : 3.5} />
          </g>
        );
      })}
    </svg>
  );
}

export default function ProgressPage() {
  const [range, setRange] = useState<R>("7 hari");
  const [hoverPtIdx, setHoverPtIdx] = useState<number | null>(null);
  const [hoverHeatIdx, setHoverHeatIdx] = useState<number | null>(null);

  const decks = useAppStore((s) => s.decks);
  const srsCards = useReviewStore((s) => s.srsCards);

  const realStats = useMemo(() => {
    const totalCardsInDecks = decks.reduce((s, d) => s + d.total, 0);
    let totalStudiedCards = 0;
    let totalMasteredCards = 0;
    for (const deckMap of Object.values(srsCards)) {
      const list = Object.values(deckMap ?? {});
      totalStudiedCards += list.length;
      totalMasteredCards += list.filter((c) => c.repetitions >= 3).length;
    }
    return {
      totalDecks: decks.length,
      totalCardsInDecks,
      totalStudiedCards,
      totalMasteredCards,
    };
  }, [decks, srsCards]);

  const k = kpis[range];
  const pts = vocab[range];
  const maxF = Math.max(...forecast);

  const selectedPtIndex = hoverPtIdx !== null && hoverPtIdx < pts.length ? hoverPtIdx : pts.length - 1;
  const selectedPtValue = pts[selectedPtIndex] ?? pts[pts.length - 1];

  const cards = [
    { l: "Kartu direview", v: k.cards, d: k.dc, i: "cards" as const },
    { l: "Retensi rata-rata", v: k.ret, d: k.dr, i: "target" as const },
    { l: "Waktu belajar", v: k.time, d: k.dt, i: "clock" as const },
    { l: "Kosakata baru", v: k.words, d: k.dw, i: "sparkle" as const },
  ];

  const activeHeatInfo = useMemo(() => {
    if (hoverHeatIdx === null) return null;
    const lv = heat[hoverHeatIdx] ?? 0;
    const weekNum = Math.floor(hoverHeatIdx / 7) + 1;
    const dayName = days[hoverHeatIdx % 7];
    const cardsEst = lv === 0 ? 0 : lv * 14 + (hoverHeatIdx % 5);
    return `Minggu ${weekNum} (${dayName}): ${cardsEst} kartu diulas`;
  }, [hoverHeatIdx]);

  return (
    <>
      <PageHead eyebrow="PERKEMBANGAN" title="Progres" accent="belajar" copy="Lihat seberapa jauh kamu melangkah — angka kecil yang tumbuh setiap hari.">
        <Tabs
          items={ranges}
          value={range}
          onChange={(r) => {
            setRange(r);
            setHoverPtIdx(null);
          }}
        />
      </PageHead>

      <section className="pr-kpis">
        {cards.map((c) => (
          <article key={c.l}>
            <span className="pr-ico"><Icon name={c.i} size={18} /></span>
            <strong>{c.v}</strong>
            <small>{c.l}</small>
            <em>▲ {c.d} vs periode lalu</em>
          </article>
        ))}
      </section>

      <section className="mb-5 rounded-2xl border border-[var(--garis)] bg-[var(--panel)] px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[var(--kon)] text-white grid place-items-center">
            <Icon name="check" size={15} />
          </span>
          <div>
            <strong className="text-[var(--tinta)]">Status Koleksi &amp; SRS Aktif:</strong>{" "}
            <span className="text-[var(--tinta-2)]">
              {realStats.totalDecks} deck • {realStats.totalCardsInDecks.toLocaleString("id-ID")} total kartu
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>
            Sudah dipelajari: <strong className="text-[var(--kon)]">{realStats.totalStudiedCards} kartu</strong>
          </span>
          <span>
            Dikuasai (≥3x): <strong className="text-[var(--ai)]">{realStats.totalMasteredCards} kartu</strong>
          </span>
        </div>
      </section>

      <div className="pr-row">
        <section className="pr-panel pr-wide">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">PERTUMBUHAN (ARAHKAN KURSOR KE TITIK)</p>
              <h2>Kosakata yang kamu kuasai</h2>
            </div>
            <span className="goal">
              Titik #{selectedPtIndex + 1}: {selectedPtValue.toLocaleString("id-ID")} kata
            </span>
          </div>
          <Line pts={pts} activeIdx={hoverPtIdx} onHoverIdx={setHoverPtIdx} />
          <div className="pr-axis"><span>{range === "7 hari" ? "7 hari lalu" : range === "30 hari" ? "30 hari lalu" : "3 bulan lalu"}</span><span>Hari ini</span></div>
        </section>

        <section className="pr-panel">
          <div className="section-heading compact"><div><p className="eyebrow">TARGET JLPT</p><h2>Kemajuan level</h2></div></div>
          <ul className="pr-jlpt">
            {jlpt.map((j) => (
              <li key={j.lv}><b>{j.lv}</b><div className="progress"><i style={{ width: `${j.p}%` }} /></div><small>{j.n}</small></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="pr-panel pr-heat-wrap">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">KONSISTENSI</p>
            <h2>16 minggu terakhir</h2>
          </div>
          <div className="pr-streaks items-center">
            {activeHeatInfo && (
              <span className="rounded-lg bg-[var(--mizu-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--ai)]">
                {activeHeatInfo}
              </span>
            )}
            <span><Icon name="flame" size={16} /> Streak <b>12</b></span>
            <span>Terpanjang <b>41</b></span>
          </div>
        </div>
        <div
          className="pr-heat"
          role="region"
          aria-label={activeHeatInfo ? `Peta aktivitas belajar (${activeHeatInfo})` : "Peta aktivitas belajar (arahkan kursor atau gunakan tombol panah untuk menelusuri hari)"}
          tabIndex={0}
          onMouseLeave={() => setHoverHeatIdx(null)}
          onBlur={() => setHoverHeatIdx(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              setHoverHeatIdx((prev) => (prev === null ? 0 : Math.min(heat.length - 1, prev + 1)));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              setHoverHeatIdx((prev) => (prev === null ? heat.length - 1 : Math.max(0, prev - 1)));
            }
          }}
        >
          {heat.map((v, i) => (
            <i
              key={i}
              className={`l${v} transition-transform hover:scale-125${hoverHeatIdx === i ? " ring-2 ring-[var(--shu)]" : ""}`}
              onMouseEnter={() => setHoverHeatIdx(i)}
              title={`Hari ke-${i + 1}: level aktivitas ${v}`}
            />
          ))}
        </div>
        <div className="pr-legend">Sedikit <i className="l0" /><i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" /> Banyak</div>
      </section>

      <div className="pr-row pr-row-b">
        <section className="pr-panel">
          <div className="section-heading compact"><div><p className="eyebrow">PRAKIRAAN</p><h2>Review 7 hari ke depan</h2></div></div>
          <div className="pr-forecast">
            {forecast.map((v, i) => (
              <div key={i} title={`${i === 0 ? "Hari ini" : days[i]}: ${v} kartu`}>
                <span>{v}</span>
                <i style={{ height: `${(v / maxF) * 100}%` }} className={i === 0 ? "today" : ""} />
                <small>{i === 0 ? "Hari ini" : days[i]}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="pr-panel">
          <div className="section-heading compact"><div><p className="eyebrow">SUMBER BELAJAR</p><h2>Dari mana kata-katamu</h2></div></div>
          <div className="pr-stack">{sourcesMix.map((s) => <i key={s.n} style={{ width: `${s.p}%`, background: s.c }} title={`${s.n} ${s.p}%`} />)}</div>
          <ul className="pr-mix">{sourcesMix.map((s) => <li key={s.n}><i style={{ background: s.c }} />{s.n}<b>{s.p}%</b></li>)}</ul>
        </section>
      </div>
    </>
  );
}
