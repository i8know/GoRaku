import { QuestionItem, QuestionDialogueTurn } from "../../lib/questionPack";
import { MockTest } from "./types";
import { CATEGORY_LABELS } from "./mockTestData";

/**
 * Bank Soal Resmi 2023年7月 日本語能力試験 N1（2023-1 N1 • 全96問 • 165分）
 * Berdasarkan dokumen PDF "2023年7月・N1":
 * - 第1部：言語知識（文字・語彙） (30 menit, 25 soal: 問題 1 [1-6], 問題 2 [7-13], 問題 3 [14-19], 問題 4 [20-25])
 * - 第2部：言語知識（文法）・読解 (80 menit, 41 soal: 問題 5 [26-35], 問題 6 ★ [36-40], 問題 7 文章文法 [41-44], 問題 8 短文4題 [45-48], 問題 9 中文4題 [49-56], 問題 10 長文 [57-59], 問題 11 統合理解A・B [60-61], 問題 12 主張理解長文 [62-64], 問題 13 情報検索 [65-66])
 * - 第3部：聴解 (55 menit, 30 soal: 問題 1 [5問], 問題 2 [6問], 問題 3 [5問], 問題 4 [11問], 問題 5 [3問: 1番, 2番-質問1, 2番-質問2])
 */

interface Raw2023N1VocabItem {
  num: number;
  mondai: 1 | 2 | 3 | 4;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  targetWord: string;
  reading: string;
  meaningEn: string;
  translationId: string;
  notes: string;
}

const VOCAB_N1_MONDAI_LABELS: Record<1 | 2 | 3 | 4, { ja: string; id: string }> = {
  1: {
    ja: "問題 1：＿＿＿の言葉の読み方として、最もよいものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 1 — Bacaan Kanji N1 (Pilih bacaan hiragana yang tepat untuk kata bergaris bawah)"
  },
  2: {
    ja: "問題 2：（　）に入れるのに最もよいものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 2 — Kosakata Kontekstual N1 (Pilih kosakata yang tepat sesuai konteks kalimat)"
  },
  3: {
    ja: "問題 3：＿＿＿の言葉に意味が最も近いものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 3 — Sinonim & Parafrasa N1 (Pilih kata/ungkapan yang maknanya paling dekat dengan kata bergaris bawah)"
  },
  4: {
    ja: "問題 4：次の言葉の使い方として、最もよいものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 4 — Penggunaan Kata / 用法 N1 (Pilih kalimat yang menggunakan kata tersebut secara paling tepat)"
  }
};

const RAW_2023_N1_VOCAB: Raw2023N1VocabItem[] = [
  // 問題 1 (No. 1 - 6: 漢字の読み)
  {
    num: 1,
    mondai: 1,
    prompt: "思わぬ出来事に、周りが<u>騒然</u>としていた。",
    options: ["ぼぜん", "そぜん", "ぼうぜん", "そうぜん"],
    correctIndex: 3,
    targetWord: "騒然",
    reading: "そうぜん",
    meaningEn: "noisy; uproarious; in an uproar; commotion",
    translationId: "Akibat kejadian tak terduga itu, suasana di sekitar menjadi gempar (gaduh).",
    notes: "騒然（とする）dibaca そうぜん (gempar / gaduh). ぼうぜん = 呆然 / 茫然 (terpana / melongo)."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "西村さんはいたずらした子供を優しく<u>諭した</u>。",
    options: ["さとした", "あやした", "ただした", "いやした"],
    correctIndex: 0,
    targetWord: "諭した",
    reading: "さとした",
    meaningEn: "admonished gently; reasoned with; counselled",
    translationId: "Nishimura-san menasihati anak yang berbuat nakal itu dengan lembut.",
    notes: "諭す dibaca さとす (menasihati agar sadar dan mengerti dengan baik). あやす = menimang bayi, ただす = 正す / 質す, いやす = 癒やす."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "社会生活を送る上で、<u>秩序</u>を守ることは重要だ。",
    options: ["ちつじょう", "じつじょ", "ちつじょ", "しつじょう"],
    correctIndex: 2,
    targetWord: "秩序",
    reading: "ちつじょ",
    meaningEn: "public order; discipline; regularity",
    translationId: "Dalam menjalani kehidupan bermasyarakat, menjaga ketertiban adalah hal yang penting.",
    notes: "秩序 dibaca ちつじょ (ketertiban / keteraturan; perhatikan 序 dibaca じょ tanpa vokal panjang う)."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "このあたりに犯人が<u>潜伏</u>しているという情報が入った。",
    options: ["せんふく", "ぜんぷく", "ぜんふく", "せんぷく"],
    correctIndex: 3,
    targetWord: "潜伏",
    reading: "せんぷく",
    meaningEn: "hiding; lying low;潜伏 (concealment / incubation)",
    translationId: "Masuk informasi bahwa pelaku kejahatan sedang bersembunyi di sekitar sini.",
    notes: "潜伏 dibaca せんぷく (bersembunyi / masa inkubasi; ふ berubah menjadi ぷ setelah ん)."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "アナウンサーの<u>朗らかな</u>声が響いた。",
    options: ["きよらか", "ほがらか", "やわらか", "なめらか"],
    correctIndex: 1,
    targetWord: "朗らかな",
    reading: "ほがらかな",
    meaningEn: "bright; cheerful; clear and resonant",
    translationId: "Suara penyiar yang ceria dan jernih menggema.",
    notes: "朗らか dibaca ほがらか (ceria / cerah / nyaring jernih). きよらか = 清らか, やわらか = 柔らか, なめらか = 滑らか."
  },
  {
    num: 6,
    mondai: 1,
    prompt: "新しい市長は地域文化の<u>振興</u>に力を入れている。",
    options: ["しんきょう", "じんこう", "しんこう", "じんきょう"],
    correctIndex: 2,
    targetWord: "振興",
    reading: "しんこう",
    meaningEn: "promotion; encouragement; revitalization",
    translationId: "Wali kota yang baru mencurahkan tenaga pada pemajuan budaya daerah.",
    notes: "振興 dibaca しんこう (pemajuan / pengembangan industri, budaya, atau daerah)."
  },

  // 問題 2 (No. 7 - 13: 文脈規定)
  {
    num: 7,
    mondai: 2,
    prompt: "今は両親と暮らしているが卒業して就職したら、家を出て（　）したいと思っている。",
    options: ["自制", "自立", "自重", "自任"],
    correctIndex: 1,
    targetWord: "自立",
    reading: "じりつ",
    meaningEn: "independence; self-reliance",
    translationId: "Sekarang saya tinggal bersama orang tua, tetapi setelah lulus dan bekerja nanti, saya ingin keluar dari rumah dan hidup mandiri.",
    notes: "自立する (じりつする) = hidup mandiri (tidak bergantung pada orang tua). 自制 = menahan diri, 自重 = berhati-hati menjaga sikap."
  },
  {
    num: 8,
    mondai: 2,
    prompt: "この企業は、売り上げの一部を町に寄付することで町の人々に利益を（　）している。",
    options: ["返上", "還元", "配給", "譲渡"],
    correctIndex: 1,
    targetWord: "還元",
    reading: "かんげん",
    meaningEn: "returning (profits to society/customers); giving back",
    translationId: "Perusahaan ini mengembalikan keuntungan kepada warga kota dengan menyumbangkan sebagian hasil penjualannya kepada kota.",
    notes: "利益を還元する (りえきをかんげんする) = mengembalikan manfaat/keuntungan kepada masyarakat atau konsumen."
  },
  {
    num: 9,
    mondai: 2,
    prompt: "今日は朝から空が（　）と曇っていて、今にも雨が降り出しそうだ。",
    options: ["びっしょり", "どっさり", "どんより", "ぐったり"],
    correctIndex: 2,
    targetWord: "どんより",
    reading: "どんより",
    meaningEn: "heavily overcast; dull; gloomy (sky)",
    translationId: "Hari ini sejak pagi langit mendung pekat, dan tampak seolah hujan akan turun saat ini juga.",
    notes: "どんより（と）曇る = mendung kelabu/pekat. びっしょり = basah kuyup, どっさり = banyak sekali, ぐったり = lemas kelelahan."
  },
  {
    num: 10,
    mondai: 2,
    prompt: "この生産管理のシステムは、維持費の高さが（　）になってなかなか普及しない。",
    options: ["ノイズ", "ロック", "タブー", "ネック"],
    correctIndex: 3,
    targetWord: "ネック",
    reading: "ネック",
    meaningEn: "bottleneck; obstacle; hindrance",
    translationId: "Sistem manajemen produksi ini sulit meluas penggunaannya karena tingginya biaya pemeliharaan menjadi kendala utama (bottleneck).",
    notes: "ネックになる (dari bottleneck) = menjadi penghambat / kendala utama."
  },
  {
    num: 11,
    mondai: 2,
    prompt: "大きな声で歌うと、ストレスの（　）になって気分がすっきりする。",
    options: ["発散", "発射", "流出", "排出"],
    correctIndex: 0,
    targetWord: "発散",
    reading: "はっさん",
    meaningEn: "letting out; venting; relieving (stress)",
    translationId: "Kalau bernyanyi dengan suara lantang, itu menjadi pelepas stres dan membuat perasaan segar.",
    notes: "ストレスの発散 (ストレスのはっさん) = pelepasan / pelampiasan stres."
  },
  {
    num: 12,
    mondai: 2,
    prompt: "この二つの漢字はよく似ていて（　）ので、読み間違えることがある。",
    options: ["まぎらわしい", "もっともらしい", "ずうずうしい", "なれなれしい"],
    correctIndex: 0,
    targetWord: "まぎらわしい",
    reading: "まぎらわしい",
    meaningEn: "confusing; easily mixed up; ambiguous",
    translationId: "Kedua Kanji ini sangat mirip dan mengecoh (mudah tertukar), sehingga terkadang salah dibaca.",
    notes: "紛らわしい (まぎらわしい) = mirip sehingga membingungkan / mudah tertukar. もっともらしい = terdengar masuk akal, ずうずうしい = tebal muka."
  },
  {
    num: 13,
    mondai: 2,
    prompt: "この店は細かいところまで掃除が（　）いて、清潔だ。",
    options: ["行き詰って", "行き交って", "行き着いて", "行き届いて"],
    correctIndex: 3,
    targetWord: "行き届いて",
    reading: "いきとどいて",
    meaningEn: "thorough; attentive to every detail; well-maintained",
    translationId: "Toko ini pembersihannya menjangkau dengan teliti sampai ke bagian-bagian kecil, sehingga bersih.",
    notes: "行き届く (いきとどく) = perhatian/pemeliharaan menjangkau seluruh sudut dengan teliti. 行き詰まる = buntu, 行き交う = berlalu-lalang."
  },

  // 問題 3 (No. 14 - 19: 言い換え類義)
  {
    num: 14,
    mondai: 3,
    prompt: "この条約は締結されると、農業に影響が出ることが<u>懸念</u>される。",
    options: ["期待", "心配", "予想", "重視"],
    correctIndex: 1,
    targetWord: "懸念",
    reading: "けねん",
    meaningEn: "fear; anxiety; concern",
    translationId: "Jika perjanjian ini ditandatangani, dikhawatirkan akan berdampak pada sektor pertanian.",
    notes: "懸念される (けねんされる) = dikhawatirkan / dicemaskan = 心配される."
  },
  {
    num: 15,
    mondai: 3,
    prompt: "久しぶりに会った友人は何だか<u>やつれて</u>いるようだった。",
    options: ["遠慮して", "張り切って", "やせ衰えて", "感動して"],
    correctIndex: 2,
    targetWord: "やつれて",
    reading: "やつれて",
    meaningEn: "haggard; gaunt; worn out and thin",
    translationId: "Teman yang sudah lama tidak saya temui tampak agak kurus dan layu (karena lelah/sakit).",
    notes: "やつれる = menjadi kurus pucat karena kelelahan, sakit, atau beban pikiran = やせ衰える (やせおとろえる)."
  },
  {
    num: 16,
    mondai: 3,
    prompt: "彼が<u>奮闘して</u>いる姿を見て、力を貸そうと思った。",
    options: ["じっと我慢して", "必死に頑張って", "激しく怒って", "焦って取り組んで"],
    correctIndex: 1,
    targetWord: "奮闘して",
    reading: "ふんとうして",
    meaningEn: "struggling hard; making strenuous efforts",
    translationId: "Melihat sosoknya yang sedang berjuang mati-matian, saya berpikir untuk membantunya.",
    notes: "奮闘する (ふんとうする) = berjuang keras dengan penuh semangat = 必死に頑張る."
  },
  {
    num: 17,
    mondai: 3,
    prompt: "あれは<u>不慮の</u>事故だったとしか言いようがない。",
    options: ["しかたない", "ありえない", "思いがけない", "情けない"],
    correctIndex: 2,
    targetWord: "不慮の",
    reading: "ふりょの",
    meaningEn: "unexpected; unforeseen; accidental",
    translationId: "Hanya bisa dikatakan bahwa itu adalah kecelakaan yang sama sekali tidak terduga.",
    notes: "不慮の (ふりょの) = tidak terduga / di luar perkiraan = 思いがけない."
  },
  {
    num: 18,
    mondai: 3,
    prompt: "倉庫の品物を<u>根こそぎ</u>持っていかれた。",
    options: ["すべて", "だいぶ", "一度に", "次々に"],
    correctIndex: 0,
    targetWord: "根こそぎ",
    reading: "ねこそぎ",
    meaningEn: "root and branch; completely; every single one",
    translationId: "Barang-barang di gudang dibawa kabur semuanya sampai habis tak bersisa.",
    notes: "根こそぎ (ねこそぎ) = sampai ke akar-akarnya / seluruhnya tanpa sisa = すべて."
  },
  {
    num: 19,
    mondai: 3,
    prompt: "若いころ私は、商品開発の仕事に<u>没頭して</u>いた。",
    options: ["飽きて", "憧れて", "不満を持って", "熱中して"],
    correctIndex: 3,
    targetWord: "没頭して",
    reading: "ぼっとうして",
    meaningEn: "absorbed in; immersed in; devoted to",
    translationId: "Saat masih muda, saya tenggelam penuh (sangat tekun) dalam pekerjaan pengembangan produk.",
    notes: "没頭する (ぼっとうする) = larut / fokus penuh pada satu hal = 熱中する (ねっちゅうする)."
  },

  // 問題 4 (No. 20 - 25: 用法)
  {
    num: 20,
    mondai: 4,
    prompt: "次の言葉の使い方として、最もよいものを 1・2・3・4 から一つ選びなさい。\n\n【 兆 し 】",
    options: [
      "来月は100万台バイクを生産する兆しです。",
      "消費税が上がり、売り上げの兆しが不透明だ。",
      "多くの人の兆しと違って、Aチームが優勝した。",
      "今年になっても景気がよくなる兆しが見られない。"
    ],
    correctIndex: 3,
    targetWord: "兆し",
    reading: "きざし",
    meaningEn: "sign; omen; indication (of a change)",
    translationId: "Meskipun sudah memasuki tahun ini, tanda-tanda membaiknya kondisi ekonomi belum terlihat.",
    notes: "兆し (きざし) = tanda-tanda awal munculnya suatu perubahan (景気がよくなる兆しが見られない / 春の兆し). Opsi 1 menggunakan 予定/見込み, opsi 2 見通し, opsi 3 予想."
  },
  {
    num: 21,
    mondai: 4,
    prompt: "次の言葉の使い方として、最もよいものを 1・2・3・4 から一つ選びなさい。\n\n【 収 容 】",
    options: [
      "大きなカバンに旅行の荷物を全部収容した。",
      "このコンサートホールは500人の観客を収容することができる。",
      "この辞書には8万語が収容されている。",
      "ビタミンを多く収容する食品をたくさん食べるようにしている。"
    ],
    correctIndex: 1,
    targetWord: "収容",
    reading: "しゅうよう",
    meaningEn: "accommodation; seating capacity; housing people in a facility",
    translationId: "Gedung konser ini dapat menampung 500 orang penonton.",
    notes: "収容する (しゅうようする) = menampung orang di dalam gedung/fasilitas (観客を収容する / 避難所に収容する). Opsi 1 収納した, opsi 3 収録されている, opsi 4 含有する/含む."
  },
  {
    num: 22,
    mondai: 4,
    prompt: "次の言葉の使い方として、最もよいものを 1・2・3・4 から一つ選びなさい。\n\n【 さえる 】",
    options: [
      "友人は時間にさえていて、遅刻したことは一度もない。",
      "父は感情がさえて顔に出るので、分かりやすい。",
      "コーヒーを飲んだら、目がさえてしまって、眠れない。",
      "彼の目標はさえていて、一度も変わることはなかった。"
    ],
    correctIndex: 2,
    targetWord: "さえる",
    reading: "さえる",
    meaningEn: "to become wide awake; to be clear-headed / sharp",
    translationId: "Setelah minum kopi, mata saya menjadi segar terjaga sehingga tidak bisa tidur.",
    notes: "目がさえる (めがさえる) = mata menjadi segar / hilang kantuknya (atau 頭がさえる = pikiran jernih, 腕がさえる = keahliannya tajam)."
  },
  {
    num: 23,
    mondai: 4,
    prompt: "次の言葉の使い方として、最もよいものを 1・2・3・4 から一つ選びなさい。\n\n【 痛 烈 】",
    options: [
      "その映画は評論家から痛烈な批判を受けた。",
      "彼らは痛烈な戦いを勝ち抜いて優勝した。",
      "痛烈な環境でも育つ作物を研究している。",
      "台風のせいで、痛烈な勢いの風が吹いている。"
    ],
    correctIndex: 0,
    targetWord: "痛烈",
    reading: "つうれつ",
    meaningEn: "scathing; bitter; severe (criticism/irony)",
    translationId: "Film itu menerima kritik pedas/tajam dari para kritikus.",
    notes: "痛烈な (つうれつな) digunakan untuk kritik, sindiran, atau pukulan argumen yang sangat tajam (痛烈な批判 / 痛烈な皮肉). Opsi 2 熾烈な/激しい戦い, opsi 3 過酷な環境, opsi 4 猛烈な勢い."
  },
  {
    num: 24,
    mondai: 4,
    prompt: "次の言葉の使い方として、最もよいものを 1・2・3・4 から一つ選びなさい。\n\n【 完 結 】",
    options: [
      "申し込み期間が完結する前に、急いで書類を出しに行った。",
      "駅前に建設中だったマンションが完結し、入居が始まった。",
      "3年間続いた連載小説が、いよいよ次回で完結する。",
      "充電が完結するまで、2時間程度かかります。"
    ],
    correctIndex: 2,
    targetWord: "完結",
    reading: "かんけつ",
    meaningEn: "conclusion; completion (of a story, series, or event)",
    translationId: "Novel bersambung yang telah berlangsung selama 3 tahun akhirnya akan tamat pada edisi berikutnya.",
    notes: "完結する (かんけつする) digunakan untuk cerita, novel bersambung, film seri, atau peristiwa yang mencapai akhir cerita/tamat (連載小説が完結する). Opsi 1 終了, opsi 2 完成, opsi 4 完了."
  },
  {
    num: 25,
    mondai: 4,
    prompt: "次の言葉の使い方として、最もよいものを 1・2・3・4 から一つ選びなさい。\n\n【 もろい 】",
    options: [
      "ここは古い住宅で、壁がもろくなっているため、立ち入り禁止だ。",
      "以前は力がもろかったので、毎日トレーニングして、筋肉をつけた。",
      "彼はまだ若く、仕事の経験ももろいが、やる気にあふれている。",
      "この野菜はあまり火を通しすぎると、栄養がもろくなってしまう。"
    ],
    correctIndex: 0,
    targetWord: "もろい",
    reading: "もろい",
    meaningEn: "brittle; fragile; crumbly",
    translationId: "Ini adalah bangunan rumah tua dan dindingnya sudah rapuh, sehingga dilarang masuk.",
    notes: "脆い (もろい) = rapuh / mudah hancur atau runtuh (壁がもろい / 涙もろい). Opsi 2 力が弱かった, opsi 3 経験も浅い/乏しい."
  }
];

// ============================================================================
// 第2部：言語知識（文法）・読解 (41 Soal: No. 26 - 66, 80 Menit)
// ============================================================================

interface Raw2023N1GrammarReadingItem {
  num: number; // 26..66
  mondai: 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  targetWord: string;
  reading: string;
  meaningEn: string;
  translationId: string;
  notes: string;
  isStarQuestion?: boolean;
  passageHtml?: string;
}

const GRAMMAR_READING_N1_MONDAI_LABELS: Record<
  5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13,
  { ja: string; id: string }
> = {
  5: {
    ja: "問題 5：次の文の（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 5 — Tata Bahasa Kalimat N1 (Pilih bentuk tata bahasa yang tepat untuk mengisi tanda kurung)"
  },
  6: {
    ja: "問題 6：次の文の ★ に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 6 — Menyusun Kalimat Bintang ★ N1 (Pilih kata yang menempati posisi tanda bintang ★)"
  },
  7: {
    ja: "問題 7：次の文章を読んで、文章全体の内容を考えて、41 から 44 の中に入る最もよいものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 7 — Tata Bahasa dalam Wacana N1 (Pilih ungkapan yang tepat untuk mengisi nomor 41–44)"
  },
  8: {
    ja: "問題 8：次の（1）から（4）の文章を読んで、後の問いに対する答えとして、最もよいものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 8 — Pemahaman Bacaan Pendek / 短文 4題 (Pilih jawaban yang paling sesuai dengan isi teks pendek)"
  },
  9: {
    ja: "問題 9：次の（1）から（4）の文章を読んで、後の問いに対する答えとして、最もよいものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 9 — Pemahaman Bacaan Menengah / 中文 4題 (Pilih jawaban yang paling tepat berdasarkan isi wacana)"
  },
  10: {
    ja: "問題 10：次の文章を読んで、後の問いに対する答えとして、最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 10 — Pemahaman Bacaan Panjang / 内容理解（長文） (Wacana ロボピー & Makna 「心」)"
  },
  11: {
    ja: "問題 11：次の A と B の意見文を読んで、後の問いに対する答えとして、最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 11 — Pemahaman Terpadu / 統合理解 A・B (Bandingkan opini A dan B mengenai メモを取ること)"
  },
  12: {
    ja: "問題 12：次の文章を読んで、後の問いに対する答えとして、最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 12 — Pemahaman Argumen Wacana Panjang / 主張理解（長文） (Wacana Pendidikan & 過剰な期待)"
  },
  13: {
    ja: "問題 13：右のページは、木原市健康づくりセンター「いきいき運動教室のご案内」である。下の問いに対する答えとして、最もよいものを 1・2・3・4 から一つ選びなさい。",
    id: "Mondai 13 — Pencarian Informasi / 情報検索 (Brosur 木原市健康づくりセンター いきいき運動教室)"
  }
};

const PASSAGE_N1_MONDAI_7 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-center text-[#27241f]">一生の仕事</p>
  <p>　自分の作品を読み返さぬ日はないと言っていい。</p>
  <p>　書斎の手近な場所に全著作を収めた棚があり、読書や執筆に倦んだ（注1）ときには適当に一冊を抜き出して読み始める。退屈して寝てしまうときもあれば、仕事をそっちのけで読了してしまうこともある。</p>
  <p>　まさかナルシストではない。復読に耐えるほどたいそうな <strong>【 41 】</strong>。わが子はよその子よりもかわいいと思う親の情である。</p>
  <p>　読みながら勝手に感心したり、あきれ果てたり、<strong>【 42 】</strong>。</p>
  <p>　気に入らない点があるのなら書き直せば良さそうなものだが、どうしてもできない。単行本を文庫本にするときですら、校閲上の明らかな誤りの他にはまず筆を入れるということがない。横着なわけではなく、読めば読むほどその文章を書いていたころの自分を <strong>【 43 】</strong> のである。いくらか齢（注2）を食ったからといって、齢なりに懸命であったおのれの文章を滅ぼすことは忍びないし、その間に得たものも多いが喪った（注3）ものもまた多かろうと思えば勇気も要る。</p>
  <p>　出来栄えのいかんに関わらず、自分なりに全きをめざしていたのである。そうした過去の自分には敬意を払い続けねばならないし、また同時に現在の自分は、未来の自分に恥じぬ小説を書かねばなるまい。一生の仕事 <strong>【 44 】</strong> そうしたものであろうと思う。</p>
  <p>　かにかくに、この短い文章もいつか読み返して愕然とするのであろうが。</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）倦(あぐ)んだ：疲れた ／ （注2）齢(よわい)：年齢 ／ （注3）喪(うしな)った：失った</p>
  </div>
</div>
`.trim();

const PASSAGE_N1_M8_1 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（1）</p>
  <p>　情報社会、あるいは情報化社会と言ってもいいですが、そこで懸命に生きていこうとすると、まず出てくる悲鳴があります。つまり、あまりにも多くの情報があって、その中のどれが本当なのか、何を選んだらいいかわからない。今、流行っているものの情報に熱心であればあるほど、世間で流行っていることを知らないと自分が遅れるんじゃないか、という焦りみたいなものが人間を突き動かすのが情報化社会の特徴です。</p>
</div>
`.trim();

const PASSAGE_N1_M8_2 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（2）以下は、「書くこと」について述べたものである。</p>
  <p>　「思ったこと」や「考えたこと」という抽象的な存在が文字という具体的な存在に変化した瞬間、その筆者は自分自身の「思ったこと」や「考えたこと」を、直接、自分の目で「見た」ことになる。つまり、客観的に「観察」することになるわけだ。「書くこと」は「読むこと」。自分の文章を読みながら書き進めるのが、「書く」という作業なのである。観察はほとんど必然的に「批判」のこころを呼び起こす。「思ったこと」や「考えたこと」の浅さや甘さを、書いた瞬間に思い知らされるのである。</p>
</div>
`.trim();

const PASSAGE_N1_M8_3 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（3）</p>
  <p>　昔と比べてモノが売れなくなり、広告の働きも悪くなっていることから、表現の面白さや新奇性ばっかりに走ってしまう——要は、本来、最も大切であるはずの消費者心理のツボを十分に突ききれていない、分析しきれていない、いわば表面上の、表現にこだわった広告が増えているように感じます。</p>
  <p>　消費者心理は「本質」、表現は「伝え方」とも言い換えられますが、最も大切な本質を重視せず、表面上の伝え方ばかりに重きが置かれるようになっている状況は、いかがなものでしょうか？本質なきところに良い伝え方など存在するはずがないのです。</p>
</div>
`.trim();

const PASSAGE_N1_M8_4 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（4）</p>
  <p>　語り合えば語り合うほど他人と自分との違いがより繊細にわかるようになること。それが対話だ。「わかりあえない」「伝わらない」という戸惑いや痛みから出発すること。それは、不可欠なものに心を開くことである。そのことで、ひとはより熱い対話をすることができるようになる。対話のなかでみずからの思考をも鍛えていく。よくよく考えたうえで口にされる他人の異なる思いや考えに、これまたよく耳を澄ますことで、じぶんの考えを再点検しはじめるからだ。</p>
</div>
`.trim();

const PASSAGE_N1_M9_1 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（1）</p>
  <p>　「常識を疑ってみる」ということ、実はそれが学問の始まりでもあります。勉強が「強いて勉める」という受動的な側面を持つものであるならば、学問は「問うて学ぶ」ことであり、極めて能動的な行為です。自ら主体的な行為として問うことを通して、常識とされてきたものの見方を疑い、それを少しずらすなどして、別の見方を見出そうとしていきます。学問の「正解」はひとつとは限りません。学ぶこととは、単純に知識を増やすということではなく、ましてやテストで覚えたことを吐き出すことでもなく、それを自分のものとして再編成していくことであり、さらに言えば自分の物差しが変わり、自分自身が変わっていくことなのです。そして、思いがけない大発見や、独創的なアイデアが生まれるかもしれません。</p>
  <p>　「疑う」という言葉は、通常は否定的な意味で使われます。「人を疑う」と言えば、普通はその人を信用しないというのと同義なわけです。私も、人を疑って生きるよりも、できるだけ人を信じて生きていたいと思っています。しかし、世の中で当たり前とされている事柄を「疑う」ことが必要な時もあります。「常識だから」という一言で目を閉ざし、それに安易に取り込まれてしまうことなく、そこを少しずらしたところに面白いことを見出していくために。それは、何事も信用しないというような厭世的な生き方に繋がるのでなく、むしろ創造的で豊かな世界を紡ぎだしていくための、積極的な営みなのです。</p>
</div>
`.trim();

const PASSAGE_N1_M9_2 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（2）</p>
  <p>　春に美しい花を咲かせるカタクリは、アリに種まきをさせるという驚くべき戦略を持っている。カタクリの種が熟すのは花が咲いてから、およそ2ヶ月後だ。はじけて地面に落ちた種は、すぐにアリがやってきて巣に運んでいってしまう。薄茶色の種の先に白い部分がある。これが脂肪分に富んだエライオゾームと呼ばれるものだ。アリはこの部分に惹かれる（注1）ことが分かっている。エライオゾームはアリにとってそれほど魅力的な物質であるらしい。</p>
  <p>　運ばれた種はアリの巣に貯蔵されることになるが、アリは二日もすると、せっかく運び込んだ種を巣から運び出してしまう。種は巣の中深いところに持ち込まれても発芽できないから、これはカタクリにとって好都合だ。どうしてアリはせっかく集めた種を棄ててしまうのだろうか。実は熟して地上に落ちたばかりのカタクリの種についているエライオゾームは、アリの幼虫が共通して持つにおいに近い物質を持っているのだという。アリは種を食べ物として集めるわけではなく、自分の幼虫と思って巣に持ち帰るらしいというわけだ。ところが種がはじけてから24時間もすると、アリの死んだ幼虫のにおいに変わるのだそうだ。それで今度はアリは種を巣の外に捨てに行くのだというから恐れ入ってしまう。</p>
  <p class="text-xs text-[#6b665c] pt-1 border-t border-[#e5dfd3]">（注1）惹(ひ)かれる：心が引きつけられる</p>
</div>
`.trim();

const PASSAGE_N1_M9_3 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（3）</p>
  <p>　子は親の鏡と言われる。こどもを見れば親が分かるということだが、こどもは親のしぐさ、もの言いを実によく見ている。三つにもなれば如何にも（注1）生意気で反論などをするものだが、<u>「そんな言い方をするもんじゃない」と言ったら負けだ</u>。「あら、あなたの言い方とそっくりよ」と横からチクリと揶揄される（注2）のがオチだから。全くこどもは物真似の名人なのである。アイドル歌手からくまのプーさんの喋り方まで、見境なく（注3）貪欲にコピーしてしまう。コピーすることによってこどもたちはすべてを獲得してゆく。こどもたちは個性的であろうなどと少しも考えない。みんなと同じようにできることが嬉しくてたまらないのだ。</p>
  <p>　だが、こどもの再現のありさまを少し注意深く観察していると、この性能の良い複写機の、本当の性能の良さが見えてくる。大人たちの考えるコピーとはいささか違うのである。こどもたちの身体的能力、言語的能力は未熟なのでオリジナルなものの完璧なコピーはできない。従ってこどもはオリジナルなものを自由に改変する。切り捨て、誇張する。それはオリジナルなものからの絶妙な逸脱なのである。この模倣行為は、むしろ、一人のこどもの生きる生活全体のなかで、今全く新しく意味付けられた別のオリジナルなものが生成していると言ってもいいものなのだ。</p>
  <p>　こどもが模倣をしながらも、とりわけ個性的であるのは、このような模倣モデルからの自由な逸脱があるからだ。私たちがこどもを見て楽しむのも、その逸脱のほほえましさなのではないか。</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）如何(いか)にも：見るからに ／ （注2）揶揄(やゆ)される：からかわれる ／ （注3）見境(みさかい)なく：区別なく、何でも</p>
  </div>
</div>
`.trim();

const PASSAGE_N1_M9_4 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（4）</p>
  <p>　人々の肉体には、実は大きな幅がある。生まれ持った個性があり、成長の段階で著しく改変するこうした人間が使用するものを作る際の方向性には、二つの選択肢がある。一つは、異なる体格や身体能力を持つ多数の人々が同じものや環境を平等に使えるようにする方法。もう一つは、それぞれの体格や能力に合わせて、いくつかのサイズや機能を用意する方法である。前者は経済的に有利な試みだが、その効果に限界があるケースが多い。後者は多様なユーザーに対応できるが、開発に時間がかかり、しかも作られたもののコストが上昇してしまうという問題性を孕んでいる（注1）。</p>
  <p>　ユニバーサルデザイン（UD）では、使い手の様々な問題負担を抑えつつ、個人に不平等感を抱かせないデザインやものづくりを求められている。デザインに平等という意識を上手に反映させていくために、多様な使い手とできるだけ接触し対話を行い、使い手に対する知識と体験を広げることが効果的だ。私たちは平等という感覚をどのようなときに感じ、考えるのかという点を、見つめ直したい。</p>
  <p>　私たちが平等かどうかを意識するのは、確かな不平等の予感や印象を持つときであることは間違いない。平等がきちんと保証されている場合、その状況は私たちにとって自然なことであり、問題意識が芽生える（注2）ことはない。しかしデザインやものづくりに当たっては、問題が発生してから平等について考えるのではなく、ものやサービスに常に必要な普通の意識であるととらえたい。</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）孕(はら)む：含む ／ （注2）芽生える：生まれる</p>
  </div>
</div>
`.trim();

const PASSAGE_N1_MONDAI_10 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="text-xs font-semibold text-[#6b665c]">以下は、筆者がほかの研究員とともに開発したロボットについて書かれた文章である。</p>
  <p>　通常、ロボットに対するプログラミングは、センサから取得した情報に応じてロボットが何らかの反応をするようなものを作っていく。たとえば「障害物を察知したら避ける」といった具合のものである。しかし、僕はロボピーがもっと適当に、意味のない動きも含めてさまざまな行動を取るようにしたのだ。</p>
  <p>　300以上の動作プログラムをし、動作パターンが次々にどういう順番で発現するかというルールを700以上プログラムした。その結果複雑に、多様に動くロボットが実現された。ここまでやると、自分たちでもプログラムがどう作用するかわからなくなる。何に反応して、どんな行動をするか予測不能になった。</p>
  <p>　そんなプログラミングをしておいたロボピーを研究室に置いていたら、何が起こったか。僕らがミーティングをしているとき、突然ロボピーは僕らの音声を認識し、「そうではないよ」と言って手をぶらぶらさせながら<u>どこかへ向かって歩きだした</u>のだ。それを見て僕らは呆気にとられながらも、ロボピーに意思を感じてしまった。僕らの話を聞いていて、彼は思うところがあり、だからどこかへ行ってしまったのだろう、と。</p>
  <p>　もちろんそれは、ロボピーの中のあるプログラムが、何かをきっかけに作動しただけのことだ。だがなにか首尾一貫したひとつの意思決定機構から生み出された行動であるかのように見えたのだ。</p>
  <p>　僕はそのとき確信した。「心とは、観察する側の問題である」と。</p>
  <p>　非常に単純な機械の動きに「心を感じますか」と問えば、感じると言う人は少ない。多少複雑でも、原理を知っていれば「それは心ではない」と言う。しかし、人間は複雑である。いや、虫程度でもいい。動きが相当以上に複雑なものに対しては、相手のことを一から、すべては理解しきれない。自分の頭の中で完全に再現しきれない、解釈しきれない、理解しきれないほど複雑なもの、仕組みがよくわからないくらい入りくんだものが目の前にあると、「こいつは、私の知らないところで勝手に独立して考え、動いているのだろう」という想像が働く。その浮かんできた想像に名前をつけずにはいられなくなる。それを「心」と呼んでいるのだ。</p>
  <p>　心とは、複雑に動くモノに現実的にあるというより、その動きを見ている側が想像しているものなのだ。そしてその心は、見ている側の自分にもないと都合が悪い。とくに人間同士であればお互いに「心がある」と感じてしまっている。だからひとはみな「自分には心がある」と思う。しかし心は、実は自分の中にいくら問い合わせ、内省してみてもしょうがない。相手を観察し、想像することでしかわからないものなのだ。</p>
</div>
`.trim();

const PASSAGE_N1_MONDAI_11 = `
<div class="space-y-3 text-sm leading-relaxed">
  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5">
    <p class="font-bold text-[#263d36]">A</p>
    <p>　私は普段からメモ魔（注）ですが、人の講演に行くと、必死にメモを取りながら話を聞きます。せっかくその場にいるのだから、最大限吸収して帰ろうと考えます。あるいは友達とくだらない話をしている時でも、「あれ？」と思ったことや、「いい話だ」と思ったことは、何でもその場でメモを取るようにしています。そこで感じた何かや、新しく知り得たものは、別の機会に自分の役に立つかもしれないからです。</p>
    <p>　新しい発想や考え方のヒントを得たいといつも問題意識を持っていれば、何気ない人の発言のなかにも発見があるはずです。メモを取らなければ忘れてしまいますので、必然的にメモを取ることになります。手を動かして、記録を取る結果、記憶にも残りやすくなります。こうして意識化・可視化することが大切なのです。</p>
  </div>
  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5">
    <p class="font-bold text-[#bf5b46]">B</p>
    <p>　話を聞いている時に、視線も上げずにただひたすらメモを取っている人がいる。熱心さは伝わるが、質問もされないと興味や関心を持って聞いてもらえているのか不安になる。このような人は、メモを取ることが目的になってしまっているのではないか。多くの情報を正確に書きとることに集中してしまい、肝心な内容が頭に入っていないのだ。</p>
    <p>　しかしどんなに正確にメモを取ったとしても、内容が理解できていなければ、あとでメモを活かすこともできない。受け身ではなく、自分に必要な情報は何か、自分だったらどうするかというように自分と関連付けて、主体的に考えながら聞くことが必要だ。メモは、あとで話を整理する際の手がかりになれば十分である。</p>
  </div>
  <p class="text-xs text-[#6b665c]">（注）メモ魔：何でもメモを取る人</p>
</div>
`.trim();

const PASSAGE_N1_MONDAI_12 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p>　企業にとっても、人々にとっても、さきのみえない不安な時代である。そしてそんな不安な時代を生きる子供たちに、「生きる力」をつけさせたいという「親心」は、わからないではない。また企業の経営者が、少しでも優秀な人材を取り込みたいと考えるのは、必然ではあるだろう。地域の衰退や産業の空洞化を食い止められる人間が現れてくれれば、わたしたちの不安な気持ちも、いくぶんなりとも和らぐというものである。</p>
  <p>　しかし、まがりなりにも教育学を専門とする者として、ここは言わせてほしい。現代日本社会の問題を、なんでもかんでも教育で解決しようというのはいただけない。</p>
  <p>　確かに教育は、人間を育てることを通じて、人々の人生や社会の未来に対して、一定の貢献を為すことができる。しかしわたしに言わせれば、そのような教育の役立ちの度合いは、<u>決して大きいものではない</u>。教育には不確定性がつきものである。これはもう、教員養成のテキストでも論じられる「教育学の基本のキ」だ。教えたからといって、その分だけ子どもが育つというわけではないし、教えたつもりがないのに、子供の方が勝手に学んでいるということもある。もちろん教師も教育学者も、その確率論的な育ちをどうにかして望ましい方向に向ける努力はするが、なんと言っても育つのは子どもなのだから、「最小限のコストで最大限のメリットを達成しなさい」「必要な人材をきっちりきっかり、耳をそろえて（注1）社会に納品しなさい」などという注文を、そうそう請け負うことはできない。</p>
  <p>　それにそもそも教育は、経済のためだけのものでも、共同体の維持のためだけのものでも、家族のためだけのものでもない。市場も、国家も、地域共同体も、そして家族も、もっと役に立つ教育をしろ、意味のある教育をしろと言うけれど、それぞれ注文はバラバラなのである。もちろん教育は、それぞれの要求に（確率論的に）少しずつ貢献はする。しかしそれをもって推し進めて、どれかの目的のためだけに合理化・効率化しようとすれば、教育はずいぶんと歪な（注2）ものになる。まして、みんながみんな教育からそれぞれの利益を引き出そうと躍起になっても（注3）、そんな過剰な期待に引き裂かれた教育がうまく機能するとは思えない。</p>
  <p class="text-xs text-[#6b665c]">（中略）</p>
  <p>　停滞の続くこの社会で、誰もが不安に押しつぶされ、ちょうどその分だけ教育に過剰な期待や希望を託そうとしている。その結果、教育、なかでも学校教育が、改革の波に呑まれ、余裕をなくしそうになっている。教育に多くをもとめすぎると警報を鳴らすことは、結果的に、この社会と教育を持続させるためにいま一番必要なことなのではないだろうか。</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）耳をそろえて：不足なく ／ （注2）歪な：ゆがんだ ／ （注3）躍起になっても：必死になっても</p>
  </div>
</div>
`.trim();

const PASSAGE_N1_MONDAI_13 = `
<div class="space-y-3 text-sm leading-relaxed">
  <div class="text-center border-b border-[#dcd6c8] pb-2">
    <p class="text-xs font-bold text-[#263d36]">木原市健康づくりセンター</p>
    <p class="text-base font-extrabold text-[#27241f]">いきいき運動教室のご案内</p>
  </div>
  <p class="text-xs">健康のために、楽しく運動しませんか。健康づくりセンターでは、三つのクラスを毎週開講しています（通年開講）。1回ごとの予約制なので、ご自分のペースで受講ができます。</p>

  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5 text-xs">
    <p class="font-bold text-[#263d36]">【対象】下の①②両方に当てはまる方</p>
    <p>① <strong>市内在住、もしくは市内で勤務している、18歳以上の方</strong></p>
    <p>② <strong>健康づくりセンターの健康度測定を、受講日から過去1年以内に受けた方</strong></p>
  </div>

  <table class="w-full text-xs border-collapse border border-[#dcd6c8]">
    <thead>
      <tr class="bg-[#f3efe6] text-[#27241f]">
        <th class="border border-[#dcd6c8] px-2 py-1 text-left">曜日</th>
        <th class="border border-[#dcd6c8] px-2 py-1 text-left">クラス名</th>
        <th class="border border-[#dcd6c8] px-2 py-1 text-left">内容</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-[#dcd6c8] px-2 py-1 font-semibold">水曜日</td>
        <td class="border border-[#dcd6c8] px-2 py-1 font-bold">ダンス A</td>
        <td class="border border-[#dcd6c8] px-2 py-1">初心者でもできるゆっくりしたダンスをします。</td>
      </tr>
      <tr>
        <td class="border border-[#dcd6c8] px-2 py-1 font-semibold">木曜日</td>
        <td class="border border-[#dcd6c8] px-2 py-1 font-bold">ダンス B</td>
        <td class="border border-[#dcd6c8] px-2 py-1">リズムに合わせて速く動くダンスをします。</td>
      </tr>
      <tr>
        <td class="border border-[#dcd6c8] px-2 py-1 font-semibold">金曜日</td>
        <td class="border border-[#dcd6c8] px-2 py-1 font-bold">体操</td>
        <td class="border border-[#dcd6c8] px-2 py-1">全身を使った体操をします。</td>
      </tr>
    </tbody>
  </table>
  <p class="text-xs font-semibold">〈時間〉10:40〜12:00　〈会場〉第一運動室　〈料金〉1回 500円</p>

  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5 text-xs">
    <p class="font-bold text-[#bf5b46]">【利用方法】</p>
    <p class="font-semibold">◆ 予約の仕組み（各クラス毎回必要・先着順・定員20名）</p>
    <p>・<strong>基本予約</strong>：すべてのクラスの中から週に1回分だけ予約できます。受講日の前の週から可能です。</p>
    <p>・<strong>追加予約</strong>：<u>実施日の2日前に定員に達していないクラスに限り</u>、基本予約1回分のほかに追加予約ができます（週1回のみ）。<u>空きは2日前から、健康づくりセンター窓口か電話で確認できます</u>。</p>
    <p class="font-semibold pt-1">◆ 予約方法</p>
    <p>・いきいき運動教室の予約が初めての方は、健康度測定の結果票をお持ちになり、窓口で予約してください。受講者カードを作ります。</p>
    <p>・<u>予約が2回目以降の方は、健康づくりセンターにある予約機か電話でしてください</u>。</p>
  </div>
</div>
`.trim();

const RAW_2023_N1_GRAMMAR_READING: Raw2023N1GrammarReadingItem[] = [
  // 問題 5 (No. 26 - 35: 文法形式の判断)
  {
    num: 26,
    mondai: 5,
    prompt: "努力して夢を叶えた弟のことを兄として誇り（　）思う。",
    options: ["を", "で", "が", "に"],
    correctIndex: 3,
    targetWord: "誇りに思う",
    reading: "ほこりにおもう",
    meaningEn: "to feel proud of; to take pride in",
    translationId: "Sebagai seorang kakak, saya merasa bangga terhadap adik laki-laki saya yang telah berusaha keras dan mewujudkan impiannya.",
    notes: "～を誇りに思う (ほこりにおもう) = merasa bangga terhadap ...."
  },
  {
    num: 27,
    mondai: 5,
    prompt: "失敗は誰でも避けたいものだが、失敗（　）学べないこともある。",
    options: ["にまで", "まででも", "からしか", "だけから"],
    correctIndex: 2,
    targetWord: "失敗からしか",
    reading: "しっぱいからしか",
    meaningEn: "only from failure (can one learn)",
    translationId: "Kegagalan memang sesuatu yang ingin dihindari siapa saja, tetapi ada pula hal yang hanya bisa dipelajari dari kegagalan.",
    notes: "N + からしか + V-ない = hanya bisa (dipelajari/diperoleh) dari N."
  },
  {
    num: 28,
    mondai: 5,
    prompt: "合唱コンクールで歌っている子供たちの表情は、（　）そのものだった。",
    options: ["真剣", "真剣で", "真剣に", "真剣な"],
    correctIndex: 0,
    targetWord: "真剣そのもの",
    reading: "しんけんそのもの",
    meaningEn: "the very embodiment of seriousness; utterly serious",
    translationId: "Ekspresi anak-anak yang sedang bernyanyi di lomba paduan suara itu benar-benar tampak sangat serius.",
    notes: "N / Kata sifat-な (tanpa な) + そのものだ = benar-benar wujud asli dari ... / sangat ... (真剣そのもの)."
  },
  {
    num: 29,
    mondai: 5,
    prompt: "同僚の山下さんは、最初はおとなしい人だと思っていたが、一緒に仕事を（　）実はよくしゃべる人だということがわかった。",
    options: ["する間", "する限り", "するうちに", "するとしたら"],
    correctIndex: 2,
    targetWord: "するうちに",
    reading: "するうちに",
    meaningEn: "while working together; as we continued working together",
    translationId: "Rekan kerja saya, Yamashita-san, awalnya saya kira orang yang pendiam, tetapi seiring bekerja bersama barulah saya tahu bahwa ia sebenarnya suka berbicara.",
    notes: "V-る / V-ている + うちに = seiring berjalannya waktu saat melakukan V, terjadi perubahan keadaan/kesadaran."
  },
  {
    num: 30,
    mondai: 5,
    prompt: "忙しくて引っ越しの荷造りが（　）荷造りを全部やってくれるサービスがあると友人が教えてくれた。",
    options: [
      "できずにいたなら",
      "できずにいたところ",
      "できないようにしたら",
      "できないようにしたところ"
    ],
    correctIndex: 1,
    targetWord: "できずにいたところ",
    reading: "できずにいたところ",
    meaningEn: "when I was unable to pack (and stuck in that state)",
    translationId: "Ketika saya sedang tidak sempat mengemas barang pindahan karena sibuk, teman saya memberi tahu bahwa ada layanan yang bisa mengemaskan seluruh barang.",
    notes: "V-ずにいる (berada dalam keadaan belum bisa melakukan V) + ところ (ketika sedang dalam situasi itu, terjadi sesuatu)."
  },
  {
    num: 31,
    mondai: 5,
    prompt: "まだ11月の初めなのに、昨日は雪が（　）寒かった。",
    options: [
      "降ることがあるかのように",
      "降るなんて思えないぐらい",
      "降るとは思えないように",
      "降るんじゃないかというぐらい"
    ],
    correctIndex: 3,
    targetWord: "降るんじゃないかというぐらい",
    reading: "ふるんじゃないかというぐらい",
    meaningEn: "so cold that one might think it was going to snow",
    translationId: "Padahal baru awal bulan November, kemarin begitu dinginnya sampai-sampai terasa seolah salju akan turun.",
    notes: "～んじゃないかというぐらい / ～のではないかと思うほど = begitu ekstremnya sampai-sampai kita mengira akan terjadi ...."
  },
  {
    num: 32,
    mondai: 5,
    prompt: "いつも駅から大学までバスを使っているが、2キロほどなので、歩こうと思えば（　）。",
    options: [
      "歩くほかない",
      "歩けなくもない",
      "歩いてはいられない",
      "歩けるわけがない"
    ],
    correctIndex: 1,
    targetWord: "歩けなくもない",
    reading: "あるけなくもない",
    meaningEn: "it is not impossible to walk; I could walk if I wanted to",
    translationId: "Biasanya saya naik bus dari stasiun ke universitas, tetapi karena jaraknya hanya sekitar 2 km, kalau niat jalan kaki sebenarnya bukannya tidak bisa.",
    notes: "V-ようと思えば + V（可能形）なくもない = kalau berniat melakukannya, sebenarnya bisa saja (bukannya tidak mungkin)."
  },
  {
    num: 33,
    mondai: 5,
    prompt: "（ホームページで）\n「先日の第3回さくら市教育講演会には、たくさんの方が（　）。」",
    options: [
      "おいでくださいました",
      "お越しいただきました",
      "ご参加いただきました",
      "ご覧くださいました"
    ],
    correctIndex: 0,
    targetWord: "おいでくださいました",
    reading: "おいでくださいました",
    meaningEn: "kindly came/attended (honorific subject with が)",
    translationId: "(Di situs web) 'Pada Seminar Pendidikan Kota Sakura ke-3 beberapa hari lalu, banyak sekali hadirin yang telah berkenan datang.'",
    notes: "Karena subjek kalimat menggunakan partikel が (たくさんの方が), predikatnya harus berupa 尊敬語 (おいでくださる = datang). Opsi 2 dan 3 menggunakan いただく (謙譲語) sehingga memerlukan たくさんの方に."
  },
  {
    num: 34,
    mondai: 5,
    prompt: "この辺りの町並みは外国のような雰囲気で、ここを訪れるだけで海外を旅行（　）。",
    options: [
      "するつもりでいる",
      "してくるつもりだ",
      "したつもりになれる",
      "するつもりになっていた"
    ],
    correctIndex: 2,
    targetWord: "したつもりになれる",
    reading: "したつもりになれる",
    meaningEn: "can feel as if one has traveled abroad",
    translationId: "Pemandangan kota di sekitar sini bernuansa seperti luar negeri, sehingga hanya dengan berkunjung ke sini kita bisa merasa seolah-olah sedang berwisata ke luar negeri.",
    notes: "V-た + つもりになれる = bisa merasakan sensasi seolah-olah telah melakukan V."
  },
  {
    num: 35,
    mondai: 5,
    prompt: "（図書館で）\n娘「図書館っていいね。だって、自分で買わなくてもこんなにたくさんの本が（　）。」\n母「そうだね。」",
    options: [
      "読めるんだもん",
      "読めるもんか",
      "読みたいんだもん",
      "読みたいもんか"
    ],
    correctIndex: 0,
    targetWord: "読めるんだもん",
    reading: "よめるんだもん",
    meaningEn: "because I can read (so many books without buying them)!",
    translationId: "(Di perpustakaan) Anak perempuan: 'Perpustakaan itu enak ya. Habisnya, tanpa harus beli sendiri pun kita bisa membaca buku sebanyak ini.' Ibu: 'Benar ya.'",
    notes: "だって～んだもん (bentuk percakapan akrab dari ～んだもの) menyatakan alasan setelah だって. ～もんか menyatakan penyangkalan keras ('mana mungkin bisa!')."
  },

  // 問題 6 (No. 36 - 40: ★ 並べ替え)
  {
    num: 36,
    mondai: 6,
    isStarQuestion: true,
    prompt: "スピーチプレゼンテーションにおいて、ジェスチャーを使いながら話すのは ＿＿＿ ★ ＿＿＿ ＿＿＿ 印象を悪くすることもあるので注意が必要だ。",
    options: [
      "あまりに",
      "効果的である反面",
      "かえって",
      "大きすぎるジェスチャーは"
    ],
    correctIndex: 0,
    targetWord: "あまりに",
    reading: "あまりに",
    meaningEn: "excessively large gestures can conversely make a bad impression",
    translationId: "Dalam presentasi pidato, berbicara sambil menggunakan gestur di satu sisi memang efektif, namun di sisi lain gestur yang terlalu berlebihan justru dapat memperburuk kesan, sehingga perlu berhati-hati.",
    notes: "Urutan lengkap: ジェスチャーを使いながら話すのは 【2. 効果的である反面】 【★ 1. あまりに】 【4. 大きすぎるジェスチャーは】 【3. かえって】 印象を悪くすることもあるので注意が必要だ。"
  },
  {
    num: 37,
    mondai: 6,
    isStarQuestion: true,
    prompt: "今や、書籍や衣料品だけでなく生鮮食品も、インターネット ＿＿＿ ★ ＿＿＿ ＿＿＿ 時代である。",
    options: [
      "自宅にいながらにして",
      "手軽に購入できる",
      "環境があれば",
      "アクセスが可能な"
    ],
    correctIndex: 2,
    targetWord: "環境があれば",
    reading: "かんきょうがあれば",
    meaningEn: "if there is an environment with internet access",
    translationId: "Kini adalah zaman di mana bukan hanya buku dan pakaian, melainkan bahan pangan segar pun dapat dibeli dengan mudah sambil tetap berada di rumah asalkan tersedia lingkungan akses internet.",
    notes: "Urutan lengkap: インターネット 【4. アクセスが可能な】 【★ 3. 環境があれば】 【1. 自宅にいながらにして】 【2. 手軽に購入できる】 時代である。"
  },
  {
    num: 38,
    mondai: 6,
    isStarQuestion: true,
    prompt: "よく似た昆虫の判別は大変難しいという。中には、かなり ＿＿＿ ＿＿＿ ★ ＿＿＿ 場合もあるそうだ。",
    options: [
      "判別が難しい",
      "昆虫学者でさえも",
      "経験を積んだ",
      "迷うほど"
    ],
    correctIndex: 3,
    targetWord: "迷うほど",
    reading: "まようほど",
    meaningEn: "so difficult to distinguish that even experienced entomologists hesitate",
    translationId: "Membedakan serangga yang sangat mirip konon amat sulit. Di antaranya, kabarnya ada pula kasus yang begitu sulit dibedakan sampai-sampai ahli serangga yang sudah sangat berpengalaman pun ikut bingung.",
    notes: "Urutan lengkap: 中には、かなり 【3. 経験を積んだ】 【2. 昆虫学者でさえも】 【★ 4. 迷うほど】 【1. 判別が難しい】 場合もあるそうだ。"
  },
  {
    num: 39,
    mondai: 6,
    isStarQuestion: true,
    prompt: "今年の ＿＿＿ ＿＿＿ ★ ＿＿＿ 気持ちのほうが大きかった。",
    options: [
      "転職にあたり",
      "うそになるが",
      "少しも不安がなかったといえば",
      "新たなことに挑戦できてうれしいという"
    ],
    correctIndex: 1,
    targetWord: "うそになるが",
    reading: "うそになるが",
    meaningEn: "it would be a lie to say I had no anxiety at all, but...",
    translationId: "Saat pindah kerja tahun ini, kalau saya katakan tidak ada rasa cemas sedikit pun tentu bohong, tetapi perasaan senang karena bisa menantang hal baru jauh lebih besar.",
    notes: "Urutan lengkap: 今年の 【1. 転職にあたり】 【3. 少しも不安がなかったといえば】 【★ 2. うそになるが】 【4. 新たなことに挑戦できてうれしいという】 気持ちのほうが大きかった。"
  },
  {
    num: 40,
    mondai: 6,
    isStarQuestion: true,
    prompt: "北山市は ＿＿＿ ＿＿＿ ★ ＿＿＿ のどかなところだった。",
    options: [
      "人口10万人を超える都市となったが",
      "北山駅周辺以外にはほとんど何もない",
      "今でこそ",
      "30年前までは"
    ],
    correctIndex: 3,
    targetWord: "30年前までは",
    reading: "さんじゅうねんまえまでは",
    meaningEn: "now it has become a city of over 100,000, but until 30 years ago...",
    translationId: "Kota Kitayama sekarang memang telah menjadi kota berpenduduk lebih dari 100.000 jiwa, tetapi sampai 30 tahun yang lalu hanyalah tempat pedesaan yang tenang di mana hampir tidak ada apa-apa selain di sekitar Stasiun Kitayama.",
    notes: "Urutan lengkap: 北山市は 【3. 今でこそ】 【1. 人口10万人を超える都市となったが】 【★ 4. 30年前までは】 【2. 北山駅周辺以外にはほとんど何もない】 のどかなところだった。 Pola: 今でこそ～が、…までは～だった."
  },

  // 問題 7 (No. 41 - 44: 文章の文法「一生の仕事」)
  {
    num: 41,
    mondai: 7,
    passageHtml: PASSAGE_N1_MONDAI_7,
    prompt: "【 41 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: [
      "小説であってもだ",
      "小説でもあるまい",
      "小説なのであろうか",
      "小説なのではないか"
    ],
    correctIndex: 1,
    targetWord: "小説でもあるまい",
    reading: "しょうせつでもあるまい",
    meaningEn: "it is surely not such a grand novel (worthy of repeated reading)",
    translationId: "Saya tentu bukan seorang narsis. Karya saya juga bukanlah novel hebat yang layak dibaca berulang kali. Itu hanyalah kasih sayang orang tua yang menganggap anaknya sendiri lebih manis daripada anak orang lain.",
    notes: "N + でもあるまい = bukanlah N (yang sebegitu hebatnya). Penulis merendah bahwa karyanya bukan novel agung, melainkan ia membacanya karena rasa sayang seperti orang tua terhadap anaknya."
  },
  {
    num: 42,
    mondai: 7,
    passageHtml: PASSAGE_N1_MONDAI_7,
    prompt: "【 42 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: [
      "褒めたり叱ったりする",
      "褒めたり叱ったりしたほうがいい",
      "褒めたり叱ったりするようだ",
      "褒めたり叱ったりしても仕方ない"
    ],
    correctIndex: 0,
    targetWord: "褒めたり叱ったりする",
    reading: "ほめたりしかったりする",
    meaningEn: "praising and scolding (one's own work while reading)",
    translationId: "Sambil membaca, saya terkagum-kagum sendiri, geleng-geleng kepala sendiri, serta memuji sekaligus memarahi karya itu.",
    notes: "Kalimat ini mendeskripsikan kebiasaan penulis sendiri saat membaca ulang karyanya (感心したり、あきれ果てたり、褒めたり叱ったりする)."
  },
  {
    num: 43,
    mondai: 7,
    passageHtml: PASSAGE_N1_MONDAI_7,
    prompt: "【 43 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: [
      "否定せずにいられなくなる",
      "否定しがちになる",
      "否定できなくなる",
      "否定するようになる"
    ],
    correctIndex: 2,
    targetWord: "否定できなくなる",
    reading: "ひていできなくなる",
    meaningEn: "become unable to deny/reject (one's past self who wrote it)",
    translationId: "Bukan karena malas, melainkan semakin dibaca, saya semakin tidak tega menyangkal diri saya pada masa menulis karangan tersebut (sehingga tidak bisa menulis ulang/mengubahnya).",
    notes: "Karena penulis tidak tega menghapus tulisan masa mudanya yang ditulis dengan sungguh-sungguh (おのれの文章を滅ぼすことは忍びない), ia menjadi tidak bisa menyangkal dirinya di masa lalu (否定できなくなる)."
  },
  {
    num: 44,
    mondai: 7,
    passageHtml: PASSAGE_N1_MONDAI_7,
    prompt: "【 44 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: ["も含めて", "でない限り", "にしても", "とは"],
    correctIndex: 3,
    targetWord: "とは",
    reading: "とは",
    meaningEn: "what is called a 'lifelong work' is...",
    translationId: "Yang namanya pekerjaan seumur hidup (一生の仕事とは) saya rasa memang seperti itulah.",
    notes: "N + とは～ものだ = mendefinisikan hakikat atau makna mendalam dari N (一生の仕事とはそうしたものであろうと思う)."
  },

  // 問題 8 (No. 45 - 48: 短文読解 4題)
  {
    num: 45,
    mondai: 8,
    passageHtml: PASSAGE_N1_M8_1,
    prompt: "45　筆者の考えに合うのはどれか。",
    options: [
      "情報を求める人ほど、知らない情報があることに不安を感じる。",
      "情報を得ることに熱心な人は、世間で流行っていることしか知らない。",
      "多くの情報から必要なものが選べなければ、世間から遅れてしまう。",
      "流行っているものの情報に熱心なだけでは、情報化社会で生きられない。"
    ],
    correctIndex: 0,
    targetWord: "情報を求める人ほど、知らない情報があることに不安を感じる",
    reading: "じょうほうをもとめるひとほど",
    meaningEn: "the more eager people are for information, the more anxious they feel about not knowing something",
    translationId: "Manakah yang sesuai dengan pemikiran penulis? → Semakin antusias seseorang mencari informasi terkini, semakin ia merasa cemas jika ada informasi populer yang tidak ia ketahui.",
    notes: "Kalimat terakhir: 「今、流行っているものの情報に熱心であればあるほど、世間で流行っていることを知らないと自分が遅れるんじゃないか、という焦りみたいなものが人間を突き動かす」."
  },
  {
    num: 46,
    mondai: 8,
    passageHtml: PASSAGE_N1_M8_2,
    prompt: "46　筆者によると、「書くこと」によってどうなるか。",
    options: [
      "自身の新しい考え方に気づく。",
      "自身の意見を具体的に伝えられる。",
      "自身の意見を批判的に見ることができる。",
      "自身のこころの変化を観察することができる。"
    ],
    correctIndex: 2,
    targetWord: "自身の意見を批判的に見ることができる",
    reading: "じしんのいけんをひはんてきにみることができる",
    meaningEn: "one can view one's own thoughts/opinions critically and objectively",
    translationId: "Menurut penulis, apa yang terjadi melalui aktivitas 'menulis'? → Kita dapat mengamati secara objektif dan melihat pemikiran/pendapat kita sendiri secara kritis.",
    notes: "Teks: 「客観的に『観察』することになるわけだ。…観察はほとんど必然的に『批判』のこころを呼び起こす。『思ったこと』や『考えたこと』の浅さや甘さを、書いた瞬間に思い知らされるのである。」"
  },
  {
    num: 47,
    mondai: 8,
    passageHtml: PASSAGE_N1_M8_3,
    prompt: "47　筆者の考えに合うのはどれか。",
    options: [
      "消費者心理を捉えた広告作りは、昔より難しくなっている。",
      "消費者心理を捉えていないのは、良い広告とは言えない。",
      "消費者心理を捉えていれば、広告は表現にこだわる必要はない。",
      "消費者心理を捉えているだけでは、効き目のある広告にはならない。"
    ],
    correctIndex: 1,
    targetWord: "消費者心理を捉えていないのは、良い広告とは言えない",
    reading: "しょうひしゃしんりをとらえていない",
    meaningEn: "an advertisement that fails to grasp consumer psychology cannot be called good",
    translationId: "Manakah yang sesuai dengan pemikiran penulis? → Iklan yang tidak menangkap psikologi konsumen (esensi utama) tidak dapat disebut sebagai iklan yang baik.",
    notes: "Kalimat terakhir: 「消費者心理は『本質』、表現は『伝え方』とも言い換えられますが…本質なきところに良い伝え方など存在するはずがないのです。」"
  },
  {
    num: 48,
    mondai: 8,
    passageHtml: PASSAGE_N1_M8_4,
    prompt: "48　対話について、筆者はどのように述べているか。",
    options: [
      "他人とじぶんの違いが大きいほど、熱い対話ができる。",
      "他人との思考の違いを把握することで、自身の思考が深められる。",
      "わかりあえないという戸惑いや痛みが克服でき、他人と共感できる。",
      "思いや考えを表現する能力が鍛えられ、他人に理解してもらいやすくなる。"
    ],
    correctIndex: 1,
    targetWord: "他人との思考の違いを把握することで、自身の思考が深められる",
    reading: "たにんとのしこうのちがいをはあくする",
    meaningEn: "by grasping the differences between others' thoughts and one's own, one deepens one's own thinking",
    translationId: "Bagaimana penulis menjelaskan tentang dialog (対話)? → Dengan memahami perbedaan pemikiran antara orang lain dan diri sendiri serta mendengarkan pandangan yang berbeda, kita menguji ulang dan memperdalam pemikiran kita sendiri.",
    notes: "Kalimat terakhir: 「対話のなかでみずからの思考をも鍛えていく。よくよく考えたうえで口にされる他人の異なる思いや考えに、これまたよく耳を澄ますことで、じぶんの考えを再点検しはじめるからだ。」"
  },

  // 問題 9 (No. 49 - 56: 中文読解 4題)
  {
    num: 49,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_1,
    prompt: "49　筆者によると、学問とはどのような行為か。",
    options: [
      "「正解」を求めて、自ら主体的に問い続けていく行為である。",
      "独創的なアイデアを生み出すために、自らのものの見方を変える行為だ。",
      "自ら問いながら、ものの見方を模索しながら自分自身が変わっていく行為だ。",
      "新しい知識を積極的に取り入れることで、自分自身を変えていく行為だ。"
    ],
    correctIndex: 2,
    targetWord: "自ら問いながら、ものの見方を模索しながら自分自身が変わっていく行為だ",
    reading: "みずからといながら",
    meaningEn: "an act in which one questions proactively, explores perspectives, and transforms oneself",
    translationId: "Menurut penulis, tindakan seperti apakah 'ilmu pengetahuan / belajar' (学問) itu? → Tindakan bertanya secara aktif, mencari sudut pandang baru, dan mengubah tolok ukur serta diri sendiri.",
    notes: "Paragraf 1: 「自ら主体的な行為として問うことを通して、常識とされてきたものの見方を疑い…自分の物差しが変わり、自分自身が変わっていくことなのです。」"
  },
  {
    num: 50,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_1,
    prompt: "50　学問で「疑う」ことについて、筆者の考えに合うのはどれか。",
    options: [
      "何を信じればいいのかを理解するのに欠かせない行為だ。",
      "豊かに生きるために、新しい常識を作りだす積極的な行為だ。",
      "常識に安易に取り込まれないために必要だが、否定的な行為だ。",
      "常識に縛られずに、これまでと異なる考え方を生み出す行為だ。"
    ],
    correctIndex: 3,
    targetWord: "常識に縛られずに、これまでと異なる考え方を生み出す行為だ",
    reading: "じょうしきにしばられずに",
    meaningEn: "an act of generating new ways of thinking without being bound by common sense",
    translationId: "Manakah yang sesuai dengan pemikiran penulis mengenai 'meragukan' (疑う) dalam keilmuan? → Merupakan tindakan positif untuk melahirkan cara pandang baru tanpa terbelenggu oleh apa yang dianggap lumrah (常識).",
    notes: "Paragraf 2: 「『常識だから』という一言で目を閉ざし、それに安易に取り込まれてしまうことなく、そこを少しずらしたところに面白いことを見出していくために。…創造的で豊かな世界を紡ぎだしていくための、積極的な営みなのです。」"
  },
  {
    num: 51,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_2,
    prompt: "51　筆者によると、アリはなぜカタクリの種を巣に運ぶのか。",
    options: [
      "種についている脂肪分がアリの好物だから。",
      "種はアリの成長に欠かせない栄養分だから。",
      "種がアリの餌になる幼虫に似ているから。",
      "種をアリの生きた幼虫だと思うから。"
    ],
    correctIndex: 3,
    targetWord: "種をアリの生きた幼虫だと思うから",
    reading: "たねをアリのいきたようちゅうだとおもうから",
    meaningEn: "because the ants mistake the seed for their own living larva",
    translationId: "Menurut penulis, mengapa semut mengangkut biji bunga Katakuri ke sarangnya? → Karena elaiosom pada biji tersebut memiliki bau yang mirip larva semut hidup, sehingga semut mengiranya sebagai larva mereka sendiri.",
    notes: "Paragraf 2: 「エライオゾームは、アリの幼虫が共通して持つにおいに近い物質を持っているのだという。アリは種を食べ物として集めるわけではなく、自分の幼虫と思って巣に持ち帰るらしいというわけだ。」"
  },
  {
    num: 52,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_2,
    prompt: "52　筆者によると、アリはなぜ集めた種を捨てるのか。",
    options: [
      "種のにおいで、アリの幼虫が死んでしまうから。",
      "種からアリの死んだ幼虫のにおいがするから。",
      "種がアリの死んだ幼虫と同じ色に変わるから。",
      "種がはじけて、アリの嫌うにおいを出すから。"
    ],
    correctIndex: 1,
    targetWord: "種からアリの死んだ幼虫のにおいがするから",
    reading: "たねからアリのしんだようちゅうのにおいがするから",
    meaningEn: "because after 24 hours the seed emits the scent of a dead ant larva",
    translationId: "Menurut penulis, mengapa semut membuang kembali biji yang sudah dikumpulkannya ke luar sarang? → Karena setelah 24 jam, bau biji tersebut berubah menjadi bau larva semut yang sudah mati.",
    notes: "Kalimat terakhir: 「ところが種がはじけてから24時間もすると、アリの死んだ幼虫のにおいに変わるのだそうだ。それで今度はアリは種を巣の外に捨てに行くのだという」."
  },
  {
    num: 53,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_3,
    prompt: "53　<u>「そんな言い方をするもんじゃない」と言ったら負けだ</u>とあるが、なぜか。",
    options: [
      "こどもの成長を否定しているようなものだから。",
      "こどもの反論が正しいと認めるようなものだから。",
      "自分で自分を注意しているようなものだから。",
      "自分がこどもと同じレベルで答えるようなものだから。"
    ],
    correctIndex: 2,
    targetWord: "自分で自分を注意しているようなものだから",
    reading: "じぶんでじぶんをちゅういしている",
    meaningEn: "because the child is merely copying the parent's way of speaking, so scolding them is like scolding oneself",
    translationId: "Mengapa dikatakan bahwa jika orang tua menegur 'Jangan bicara dengan gaya seperti itu' maka orang tua kalah? → Karena cara bicara anak itu sebenarnya meniru persis cara bicara orang tuanya sendiri, sehingga menegur anak sama saja dengan menegur diri sendiri.",
    notes: "Paragraf 1: 「こどもは親のしぐさ、もの言いを実によく見ている。…『あら、あなたの言い方とそっくりよ』と横からチクリと揶揄されるのがオチだから。」"
  },
  {
    num: 54,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_3,
    prompt: "54　こどもの模倣について、筆者はどのように考えているか。",
    options: [
      "完璧にはコピーできないことが、個性につながっている。",
      "完璧にコピーしようとしているが、本質は捉えられていない。",
      "オリジナルなものを自由に変えて、おとなを楽しませようとしている。",
      "オリジナルからの逸脱を気にせず、自分の個性を表現しようとしている。"
    ],
    correctIndex: 0,
    targetWord: "完璧にはコピーできないことが、個性につながっている",
    reading: "かんぺきにはコピーできないことが、こせいにつながっている",
    meaningEn: "the inability to copy perfectly leads to free deviation and unique individuality",
    translationId: "Bagaimana pemikiran penulis mengenai peniruan (模倣) yang dilakukan anak-anak? → Ketidakmampuan mereka meniru secara sempurna justru melahirkan perubahan/penyimpangan bebas yang menjadi keunikan (individualitas) baru.",
    notes: "Paragraf 2–3: 「こどもたちの身体的能力、言語的能力は未熟なのでオリジナルなものの完璧なコピーはできない。従ってこどもはオリジナルなものを自由に改変する。…こどもが模倣をしながらも、とりわけ個性的であるのは、このような模倣モデルからの自由な逸脱があるからだ。」"
  },
  {
    num: 55,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_4,
    prompt: "55　人間が使用するものを作る際の問題点について、筆者が述べていることはどれか。",
    options: [
      "同じもので多様な使い手に対応すると、そのものの効果に限界が生じる。",
      "同じものを多様な使い手に対応させるには、開発に時間がかかりすぎる。",
      "個別の使い手に対応すると、そのものの効果が見えにくくなる。",
      "個別の使い手に対応すると、平等にものが使えなくなる。"
    ],
    correctIndex: 0,
    targetWord: "同じもので多様な使い手に対応すると、そのものの効果に限界が生じる",
    reading: "おなじものでたようなつかいてにたいおうする",
    meaningEn: "trying to accommodate diverse users with a single identical product has limits to its effectiveness",
    translationId: "Manakah yang disebutkan penulis mengenai permasalahan saat membuat barang yang digunakan manusia? → Jika menggunakan satu barang yang sama untuk melayani beragam pengguna (opsi pertama), efektivitasnya memiliki keterbatasan.",
    notes: "Paragraf 1: 「一つは、異なる体格や身体能力を持つ多数の人々が同じものや環境を平等に使えるようにする方法。…前者は経済的に有利な試みだが、その効果に限界があるケースが多い。」"
  },
  {
    num: 56,
    mondai: 9,
    passageHtml: PASSAGE_N1_M9_4,
    prompt: "56　ユニバーサルデザインにおけるデザインやものづくりについて、筆者が最も言いたいことはなにか。",
    options: [
      "多様な使い手が、平等だという感覚が持てるものを作り出すべきだ。",
      "使い手が不平等だと感じたら、原因を究明しなければならない。",
      "すべての使い手にとって平等であるものにすることは難しい。",
      "常に使い手にとっての平等について考えなければならない。"
    ],
    correctIndex: 3,
    targetWord: "常に使い手にとっての平等について考えなければならない",
    reading: "つねにつかいてにとってのびょうどうについてかんがえなければならない",
    meaningEn: "we must always regard equality for users as a constant, normal awareness in design and manufacturing",
    translationId: "Apa yang paling ingin disampaikan penulis mengenai desain dan pembuatan barang dalam Universal Design? → Kesetaraan bagi pengguna harus senantiasa dipikirkan sebagai kesadaran dasar setiap saat, bukan baru dipikirkan setelah muncul masalah.",
    notes: "Kalimat terakhir: 「デザインやものづくりに当たっては、問題が発生してから平等について考えるのではなく、ものやサービスに常に必要な普通の意識であるととらえたい。」"
  },

  // 問題 10 (No. 57 - 59: 長文読解「ロボピーと『心』」)
  {
    num: 57,
    mondai: 10,
    passageHtml: PASSAGE_N1_MONDAI_10,
    prompt: "57　ロボピーが、ほかのロボットと異なる点は何か。",
    options: [
      "動作パターンが限られているので、ある程度動きが予測できる。",
      "与えられた情報の一部を自分で判断して動くので、動きが予測できない。",
      "どう動くかというプログラムを多数組み込んだので、動きが予測できない。",
      "多様で複雑な動作をプログラムしたので、人間のように自然な動きができる。"
    ],
    correctIndex: 2,
    targetWord: "どう動くかというプログラムを多数組み込んだので、動きが予測できない",
    reading: "どううごくかというプログラムをたすうくみこんだ",
    meaningEn: "because hundreds of action programs and rules were built in, its movements are unpredictable",
    translationId: "Apa perbedaan Robovie (ロボピー) dibandingkan robot lainnya? → Karena ditanamkan sangat banyak program gerakan (300+) dan aturan urutan (700+), gerakannya menjadi tidak dapat diprediksi bahkan oleh pembuatnya.",
    notes: "Paragraf 2: 「300以上の動作プログラムをし、動作パターンが次々にどういう順番で発現するかというルールを700以上プログラムした。…何に反応して、どんな行動をするか予測不能になった。」"
  },
  {
    num: 58,
    mondai: 10,
    passageHtml: PASSAGE_N1_MONDAI_10,
    prompt: "58　<u>どこかへ向かって歩きだした</u>とあるが、その時筆者にはどのように思えたか。",
    options: [
      "プログラムに間違いがあり、ロボピーに意思が生まれて動いた。",
      "プログラムが作動したのではなく、ロボピー自身が考えて動いた。",
      "プログラムが作動して、意思があるかのようにロボピーが動いた。",
      "プログラムが誤作動して、制作者の意図に反してロボピーが動いた。"
    ],
    correctIndex: 2,
    targetWord: "プログラムが作動して、意思があるかのようにロボピーが動いた",
    reading: "プログラムがさどうして、いしがあるかのように",
    meaningEn: "a program was triggered, making Robovie move as if it had its own will/intention",
    translationId: "Ketika Robovie 'mulai berjalan menuju suatu tempat', bagaimana hal itu tampak bagi penulis? → Program di dalam Robovie bekerja karena suatu pemicu, tetapi Robovie tampak bergerak seolah-olah memiliki kehendak/pikiran sendiri.",
    notes: "Paragraf 4: 「もちろんそれは、ロボピーの中のあるプログラムが、何かをきっかけに作動しただけのことだ。だがなにか首尾一貫したひとつの意思決定機構から生み出された行動であるかのように見えたのだ。」"
  },
  {
    num: 59,
    mondai: 10,
    passageHtml: PASSAGE_N1_MONDAI_10,
    prompt: "59　「心」について、筆者はどのように考えているか。",
    options: [
      "あると思って観察すれば、複雑な動きの意図が理解できる。",
      "実体がないので、あるとかないとか想像しても意味がない。",
      "仕組みが複雑すぎるため、人間同士であっても想像できない。",
      "理解しきれない複雑な動きを見たときに、人間が想像するものだ。"
    ],
    correctIndex: 3,
    targetWord: "理解しきれない複雑な動きを見たときに、人間が想像するものだ",
    reading: "りかいしきれないふくざつなうごきをみたときに",
    meaningEn: "something that humans imagine when observing movements too complex to fully comprehend",
    translationId: "Bagaimana pemikiran penulis mengenai 'hati/pikiran' (心)? → 'Hati/pikiran' adalah sesuatu yang dibayangkan oleh pihak pengamat ketika melihat gerakan yang begitu rumit hingga tidak dapat dipahami sepenuhnya.",
    notes: "Paragraf 6–7: 「理解しきれないほど複雑なもの…が目の前にあると、『こいつは、私の知らないところで勝手に独立して考え、動いているのだろう』という想像が働く。…それを『心』と呼んでいるのだ。」"
  },

  // 問題 11 (No. 60 - 61: 統合理解 A・B「メモを取ることと話の聞き方」)
  {
    num: 60,
    mondai: 11,
    passageHtml: PASSAGE_N1_MONDAI_11,
    prompt: "60　メモを取ることについて、AとBはどのように述べているか。",
    options: [
      "AもBも、量よりも書きとる内容を意識して取ることが重要だと述べている。",
      "AもBも、できるだけ多くの情報を正確に書き取ったほうがいいと述べている。",
      "Aは内容を活用するために必要だと述べ、Bは取ることに集中し過ぎては意味がないと述べている。",
      "Aは問題点や感想なども一緒に記入したほうがいいと述べ、Bは話の内容を理解していなければ正確には取れないと述べている。"
    ],
    correctIndex: 2,
    targetWord: "Aは内容を活用するために必要だと述べ、Bは取ることに集中し過ぎては意味がないと述べている",
    reading: "メモをとること",
    meaningEn: "A states note-taking is necessary to utilize the content later, while B states focusing too much on taking notes is meaningless",
    translationId: "Bagaimana A dan B menjelaskan tentang mencatat memo? → A menyatakan mencatat itu perlu agar isinya tidak terlupakan dan bisa dimanfaatkan di kesempatan lain, sedangkan B menyatakan jika terlalu fokus mencatat sampai tidak memahami isi pembicaraan maka tidak ada gunanya.",
    notes: "A: 「別の機会に自分の役に立つかもしれないからです。…メモを取らなければ忘れてしまいますので、必然的にメモを取ることになります」; B: 「多くの情報を正確に書きとることに集中してしまい、肝心な内容が頭に入っていないのだ。」"
  },
  {
    num: 61,
    mondai: 11,
    passageHtml: PASSAGE_N1_MONDAI_11,
    prompt: "61　話の聞き方について、AとBの認識で共通していることは何か。",
    options: [
      "何かを得ようという姿勢で聞くことが重要だ。",
      "その場ですべてを理解しようとしなくてもいい。",
      "手を動かしながら聞いたほうが、記憶に残りやすい。",
      "興味や関心を示し、話し手に安心感を与えることが大切だ。"
    ],
    correctIndex: 0,
    targetWord: "何かを得ようという姿勢で聞くことが重要だ",
    reading: "なにかをえようというしせいで聞く",
    meaningEn: "it is important to listen proactively with the attitude of gaining something for oneself",
    translationId: "Apa kesamaan pandangan A dan B mengenai cara mendengarkan pembicaraan? → Penting untuk mendengarkan secara aktif dengan sikap ingin memperoleh sesuatu yang bermanfaat bagi diri sendiri.",
    notes: "A: 「最大限吸収して帰ろうと考えます。…新しい発想や考え方のヒントを得たいといつも問題意識を持っていれば…」; B: 「受け身ではなく、自分に必要な情報は何か、自分だったらどうするかというように自分と関連付けて、主体的に考えながら聞くことが必要だ。」"
  },

  // 問題 12 (No. 62 - 64: 主張理解・長文「教育の不確定性と過剰な期待」)
  {
    num: 62,
    mondai: 12,
    passageHtml: PASSAGE_N1_MONDAI_12,
    prompt: "62　<u>決して大きいものではない</u>と考える理由として、筆者が述べているのはどれか。",
    options: [
      "企業や社会が望む人材と、教育学で目標とする人材は異なるから。",
      "「生きる力」をつけるために必要なことは、明確ではないから。",
      "子ども一人一人に合わせて、教育の内容を変えられないから。",
      "子どもは、教えたとおりに育つとはかぎらないから。"
    ],
    correctIndex: 3,
    targetWord: "子どもは、教えたとおりに育つとはかぎらないから",
    reading: "こどもはおしえたとおりにそだつとはかぎらない",
    meaningEn: "because children do not necessarily grow up exactly as they are taught (education inherently involves uncertainty)",
    translationId: "Apa alasan yang dikemukakan penulis bahwa tingkat kontribusi pendidikan 'sama sekali tidaklah besar'? → Karena pendidikan selalu mengandung ketidakpastian, dan anak-anak belum tentu tumbuh persis sesuai dengan apa yang diajarkan.",
    notes: "Paragraf 3: 「教育には不確定性がつきものである。…教えたからといって、その分だけ子どもが育つというわけではないし、教えたつもりがないのに、子供の方が勝手に学んでいるということもある。」"
  },
  {
    num: 63,
    mondai: 12,
    passageHtml: PASSAGE_N1_MONDAI_12,
    prompt: "63　教育について、筆者の考えに合うのはどれか。",
    options: [
      "それぞれの目的に合わせて合理化・効率化しなければ、機能しない。",
      "みんなで一つの目的を共有しなければ、効果は上がらない。",
      "特定の目的を果たすために存在するものではない。",
      "役に立つかどうかという観点で評価されるべきだ。"
    ],
    correctIndex: 2,
    targetWord: "特定の目的を果たすために存在するものではない",
    reading: "とくていのもくてきをはたすためにそんざいするものではない",
    meaningEn: "education does not exist merely to fulfill one specific utilitarian purpose",
    translationId: "Manakah yang sesuai dengan pemikiran penulis mengenai pendidikan? → Pendidikan bukanlah sesuatu yang ada semata-mata demi memenuhi satu tujuan tertentu (seperti ekonomi, negara, atau keluarga saja).",
    notes: "Paragraf 4: 「そもそも教育は、経済のためだけのものでも、共同体の維持のためだけのものでも、家族のためだけのものでもない。…どれかの目的のためだけに合理化・効率化しようとすれば、教育はずいぶんと歪なものになる。」"
  },
  {
    num: 64,
    mondai: 12,
    passageHtml: PASSAGE_N1_MONDAI_12,
    prompt: "64　筆者が最も言いたいことは何か。",
    options: [
      "多様な社会の要求に応じられるように、教育のあり方を考え直すべきだ。",
      "社会の不安を取り除くためには、教育を合理化・効率化すべきではない。",
      "教育の改革によって、安定した社会を持続させていくことが必要だろう。",
      "現代社会の問題のすべてが、教育で解決できると思ってはいけない。"
    ],
    correctIndex: 3,
    targetWord: "現代社会の問題のすべてが、教育で解決できると思ってはいけない",
    reading: "げんだいしゃかいのもんだいのすべてが、きょういくでかいけつできるとおもってはいけない",
    meaningEn: "we must not think that all problems of modern society can be solved by education alone (do not place excessive expectations on education)",
    translationId: "Apa pesan utama yang paling ingin disampaikan penulis? → Kita tidak boleh berpikir bahwa segala permasalahan masyarakat modern dapat diselesaikan melalui pendidikan (jangan membebani pendidikan dengan ekspektasi yang berlebihan).",
    notes: "Paragraf 2 & terakhir: 「現代日本社会の問題を、なんでもかんでも教育で解決しようというのはいただけない。」「教育に多くをもとめすぎると警報を鳴らすことは、結果的に、この社会と教育を持続させるためにいま一番必要なことなのではないだろうか。」"
  },

  // 問題 13 (No. 65 - 66: 情報検索「木原市健康づくりセンター いきいき運動教室のご案内」)
  {
    num: 65,
    mondai: 13,
    passageHtml: PASSAGE_N1_MONDAI_13,
    prompt:
      "65　次の4人は今年の4月に、運動教室を受講したいと考えている。この中で、この教室を受講できる人は誰か。\n" +
      "・ダニエルさん（54歳 ／ 住んでいる所：木原市内 ／ 勤務地：木原市外 ／ 健康度測定：去年の1月に受けた）\n" +
      "・木村さん（34歳 ／ 住んでいる所：木原市外 ／ 勤務地：木原市内 ／ 健康度測定：去年の10月に受けた）\n" +
      "・大川さん（16歳 ／ 住んでいる所：木原市内 ／ 勤務地：なし ／ 健康度測定：今年の2月に受けた）\n" +
      "・チェさん（27歳 ／ 住んでいる所：木原市内 ／ 勤務地：木原市内 ／ 健康度測定：今年の5月に受ける予定）",
    options: ["ダニエルさん", "木村さん", "大川さん", "チェさん"],
    correctIndex: 1,
    targetWord: "木村さん",
    reading: "きむらさん",
    meaningEn: "Kimura-san (34 years old, works in Kihara City, took the health check in October last year)",
    translationId: "Dari 4 orang tersebut yang ingin mengikuti kelas olahraga pada bulan April tahun ini, siapakah yang memenuhi syarat? → Kimura-san.",
    notes: "Syarat ①: tinggal atau bekerja di Kota Kihara & berusia 18 tahun ke atas (大川さん 16 tahun gugur). Syarat ②: mengikuti 健康度測定 dalam 1 tahun terakhir dari bulan April tahun ini (ダニエルさん Januari tahun lalu = sudah lewat 1 tahun; チェさん baru rencana Mei). 木村さん (34 th, bekerja di 木原市内, tes Oktober tahun lalu = 6 bulan lalu) memenuhi kedua syarat."
  },
  {
    num: 66,
    mondai: 13,
    passageHtml: PASSAGE_N1_MONDAI_13,
    prompt: "66　シャヒンさんは、来週の「ダンス A」を予約したが、空きがあれば来週の「体操」も追加予約したいと考えている。どうすればいいか。",
    options: [
      "来週の月曜日以降に窓口か電話で空きを確認し、空きがあれば、窓口で予約する。",
      "来週の月曜日以降に窓口か電話で空きを確認し、空きがあれば、予約機か電話で予約する。",
      "来週の水曜日以降に窓口か電話で空きを確認し、空きがあれば、窓口で予約する。",
      "来週の水曜日以降に窓口か電話で空きを確認し、空きがあれば、予約機か電話で予約する。"
    ],
    correctIndex: 3,
    targetWord: "来週の水曜日以降に窓口か電話で空きを確認し、空きがあれば、予約機か電話で予約する",
    reading: "らいしゅうのすいようびいこう",
    meaningEn: "From next Wednesday onward, check availability at the counter or by phone, and if available, reserve via the reservation machine or by phone",
    translationId: "Shahin-san sudah memesan kelas 'Dance A' minggu depan, dan ingin memesan tambahan (追加予約) kelas 'Senam (体操)' minggu depan jika masih ada kuota. Apa yang harus dilakukan? → Mulai hari Rabu minggu depan, mengecek ketersediaan di loket atau lewat telepon, dan jika ada kursi kosong, memesan melalui mesin reservasi atau telepon.",
    notes: "Kelas 体操 diadakan hari Jumat (金曜日). 追加予約 dapat dicek dan dipesan mulai 2 hari sebelum pelaksanaan (実施日の2日前 ＝ 水曜日以降) melalui 窓口 atau 電話. Karena Shahin-san sudah pernah memesan ダンスA (berarti ini adalah 予約が2回目以降の方), maka pemesanannya dilakukan melalui 予約機か電話."
  }
];

// ============================================================================
// 第3部：聴解 (30 Soal, 55 Menit: 問題 1 [5], 問題 2 [6], 問題 3 [5], 問題 4 [11], 問題 5 [3])
// ============================================================================

interface Raw2023N1ListeningItem {
  num: number; // 1..30
  mondai: 1 | 2 | 3 | 4 | 5;
  questionLabelJa: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  audioText: string;
  dialogueScript: QuestionDialogueTurn[];
  targetWord: string;
  reading: string;
  meaningEn: string;
  translationId: string;
  notes: string;
  passageHtml?: string;
}

const LISTENING_N1_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5, { ja: string; id: string }> = {
  1: {
    ja: "問題 1：問題 1では、まず質問を聞いてください。それから話を聞いて、問題用紙の 1から 4の中から、最もよいものを一つ選んでください。",
    id: "Mondai 1 — Pemahaman Tugas N1 (Dengarkan pertanyaan, lalu pilih tindakan yang harus dilakukan selanjutnya)"
  },
  2: {
    ja: "問題 2：問題 2では、まず質問を聞いてください。そのあと、問題用紙のせんたくしを読んでください。それから話を聞いて、問題用紙の 1から 4の中から、最もよいものを一つ選んでください。",
    id: "Mondai 2 — Pemahaman Poin Kunci N1 (Dengarkan alasan/poin utama yang ditanyakan)"
  },
  3: {
    ja: "問題 3：問題 3では、問題用紙に何もいんさつされていません。まず話を聞いてください。それから、質問とせんたくしを聞いて、1から 4の中から、最もよいものを一つ選んでください。",
    id: "Mondai 3 — Pemahaman Garis Besar N1 (Dengarkan monolog/dialog, lalu pilih tema atau maksud utama pembicara)"
  },
  4: {
    ja: "問題 4：問題 4では、問題用紙に何もいんさつされていません。まず文を聞いてください。それから、それに対する返事を聞いて、1から 3の中から、最もよいものを一つ選んでください。",
    id: "Mondai 4 — Respons Cepat N1 (Dengarkan kalimat pendek dan pilih balasan terbaik dari 3 opsi)"
  },
  5: {
    ja: "問題 5：問題 5では、長めの話を聞きます。問題用紙にメモをとってもかまいません。話を聞いて、最もよいものを一つ選んでください。",
    id: "Mondai 5 — Pemahaman Terpadu / 統合理解 N1 (Dengarkan diskusi panjang lalu jawab pertanyaan keputusan akhir)"
  }
};

const RAW_2023_N1_LISTENING: Raw2023N1ListeningItem[] = [
  // ==================== 問題 1 (1番 - 5番: 5問) ====================
  {
    num: 1,
    mondai: 1,
    questionLabelJa: "1番",
    prompt: "大学のサークルで男の学生と女の学生が学園祭の準備について話しています。女の学生は今日のミーティングで何をしますか。",
    options: [
      "話し合いの進行をする",
      "調理器具を借りてくる",
      "ほかのサークルの情報を集める",
      "ミーティングの記録をとる"
    ],
    correctIndex: 3,
    audioText:
      "大学のサークルで男の学生と女の学生が学園祭の準備について話しています。女の学生は今日のミーティングで何をしますか。男：今日のミーティングだけど、僕が話し合いの進行をやるね。調理器具を借りる手続きと、ほかのサークルの出店情報はもう集めておいたから。女：ありがとう。じゃあ私は今日のミーティングの記録をとるね。決定事項をまとめて後でみんなに共有するわ。男：うん、よろしく頼むよ。女の学生は今日のミーティングで何をしますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "大学のサークルで男の学生と女の学生が学園祭の準備について話しています。女の学生は今日のミーティングで何をしますか。" },
      { speaker: "Mahasiswa", gender: "male", text: "今日のミーティングだけど、僕が話し合いの進行をやるね。調理器具を借りる手続きと、ほかのサークルの出店情報はもう集めておいたから。" },
      { speaker: "Mahasiswi", gender: "female", text: "ありがとう。じゃあ私は今日のミーティングの記録をとるね。決定事項をまとめて後でみんなに共有するわ。" },
      { speaker: "Mahasiswa", gender: "male", text: "うん、よろしく頼むよ。" },
      { speaker: "Narator", gender: "female", text: "女の学生は今日のミーティングで何をしますか。" }
    ],
    targetWord: "ミーティングの記録をとる",
    reading: "ミーティングのきろくをとる",
    meaningEn: "take minutes/records of the meeting",
    translationId: "Dalam rapat hari ini, mahasiswi bertugas mencatat jalannya rapat (ミーティングの記録をとる).",
    notes: "「じゃあ私は今日のミーティングの記録をとるね」 → ミーティングの記録をとる."
  },
  {
    num: 2,
    mondai: 1,
    questionLabelJa: "2番",
    prompt: "会社で女の上司と男の社員が社内交流イベントについて話しています。男の社員はこのあとまず何をしますか。",
    options: [
      "食事会を計画する",
      "若い社員の希望を調査する",
      "アンケートの案を作る",
      "ベテラン社員の意見を聞く"
    ],
    correctIndex: 2,
    audioText:
      "会社で女の上司と男の社員が社内交流イベントについて話しています。男の社員はこのあとまず何をしますか。男：課長、来月の部署間交流イベントですが、食事会を計画したらどうでしょうか。女：うーん、ベテラン社員には好評だけど、若い社員の中には別のイベントを希望する人も多いみたいなのよ。まずは若い社員がどんな企画を望んでいるかアンケートで調査してみてくれる？男：わかりました。じゃあ早速アンケートの質問項目の案を作って、課長にお見せします。女：ええ、お願いね。男の社員はこのあとまず何をしますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "会社で女の上司と男の社員が社内交流イベントについて話しています。男の社員はこのあとまず何をしますか。" },
      { speaker: "Staf (Pria)", gender: "male", text: "課長、来月の部署間交流イベントですが、食事会を計画したらどうでしょうか。" },
      { speaker: "Kepala Seksi (Wanita)", gender: "female", text: "うーん、ベテラン社員には好評だけど、若い社員の中には別のイベントを希望する人も多いみたいなのよ。まずは若い社員がどんな企画を望んでいるかアンケートで調査してみてくれる？" },
      { speaker: "Staf (Pria)", gender: "male", text: "わかりました。じゃあ早速アンケートの質問項目の案を作って、課長にお見せします。" },
      { speaker: "Kepala Seksi (Wanita)", gender: "female", text: "ええ、お願いね。" },
      { speaker: "Narator", gender: "male", text: "男の社員はこのあとまず何をしますか。" }
    ],
    targetWord: "アンケートの案を作る",
    reading: "アンケートのあんをつくる",
    meaningEn: "draft a questionnaire plan",
    translationId: "Sebelum menyebarkan survei kepada karyawan muda, karyawan pria akan membuat draf kuesioner terlebih dahulu untuk diperlihatkan kepada atasan.",
    notes: "「じゃあ早速アンケートの質問項目の案を作って、課長にお見せします」 → アンケートの案を作る."
  },
  {
    num: 3,
    mondai: 1,
    questionLabelJa: "3番",
    prompt: "スポーツクラブでコーチが女の人にランニングのフォームを指導しています。女の人はこれから何に気をつけて走りますか。",
    options: [
      "目線を下げないようにする",
      "ひじを後ろに引き上げる",
      "背中が丸まらないようにする",
      "体の重心の左右のバランスをとる"
    ],
    correctIndex: 1,
    audioText:
      "スポーツクラブでコーチが女の人にランニングのフォームを指導しています。女の人はこれから何に気をつけて走りますか。男：今の走り方ですが、以前は下を向きがちだった目線もしっかり前を向いていますし、背筋も伸びていて背中が丸まる癖も直っていますね。左右の重心のバランスも安定していますよ。ただ、腕を振る時にひじが前に出すぎているので、ひじをもっと後ろに引き上げるように意識して走ってみてください。推進力がぐっと上がりますよ。女：はい、やってみます。女の人はこれから何に気をつけて走りますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "スポーツクラブでコーチが女の人にランニングのフォームを指導しています。女の人はこれから何に気をつけて走りますか。" },
      { speaker: "Pelatih (Pria)", gender: "male", text: "今の走り方ですが、以前は下を向きがちだった目線もしっかり前を向いていますし、背筋も伸びていて背中が丸まる癖も直っていますね。左右の重心のバランスも安定していますよ。ただ、腕を振る時にひじが前に出すぎているので、ひじをもっと後ろに引き上げるように意識して走ってみてください。推進力がぐっと上がりますよ。" },
      { speaker: "Wanita", gender: "female", text: "はい、やってみます。" },
      { speaker: "Narator", gender: "female", text: "女の人はこれから何に気をつけて走りますか。" }
    ],
    targetWord: "ひじを後ろに引き上げる",
    reading: "ひじをうしろにひきあげる",
    meaningEn: "pull her elbows back when swinging her arms",
    translationId: "Pandangan mata, punggung, dan keseimbangan sudah bagus; yang perlu diperhatikan selanjutnya adalah menarik siku ke belakang saat mengayunkan lengan.",
    notes: "「ひじをもっと後ろに引き上げるように意識して走ってみてください」 → ひじを後ろに引き上げる."
  },
  {
    num: 4,
    mondai: 1,
    questionLabelJa: "4番",
    prompt: "会社で男の人と女の人が新しい店舗の企画書について話しています。女の人はこのあと企画書をどう直しますか。",
    options: [
      "山川駅の利用データを足す",
      "地域住民の年代を調べる",
      "売上予測を修正する",
      "店内のデザインを変更する"
    ],
    correctIndex: 0,
    audioText:
      "会社で男の人と女の人が新しい店舗の企画書について話しています。女の人はこのあと企画書をどう直しますか。女：部長、山川駅前に出店する新店舗の企画書、ご確認いただけましたか。男：ああ、地域住民の年代別のデータや売上予測、それに店内のデザイン案もよくまとまっているよ。ただ、平日の朝晩にどれくらい通勤客が通るのかが知りたいから、山川駅の1日の乗降客数の利用データをグラフにして付け足しておいてくれる？女：かしこまりました。すぐ追加します。女の人はこのあと企画書をどう直しますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "会社で男の人と女の人が新しい店舗の企画書について話しています。女の人はこのあと企画書をどう直しますか。" },
      { speaker: "Staf (Wanita)", gender: "female", text: "部長、山川駅前に出店する新店舗の企画書、ご確認いただけましたか。" },
      { speaker: "Kepala Bagian (Pria)", gender: "male", text: "ああ、地域住民の年代別のデータや売上予測、それに店内のデザイン案もよくまとまっているよ。ただ、平日の朝晩にどれくらい通勤客が通るのかが知りたいから、山川駅の1日の乗降客数の利用データをグラフにして付け足しておいてくれる？" },
      { speaker: "Staf (Wanita)", gender: "female", text: "かしこまりました。すぐ追加します。" },
      { speaker: "Narator", gender: "male", text: "女の人はこのあと企画書をどう直しますか。" }
    ],
    targetWord: "山川駅の利用データを足す",
    reading: "やまかわえきのりようデータをたす",
    meaningEn: "add usage data for Yamakawa Station",
    translationId: "Wanita itu diminta menambahkan grafik data jumlah penumpang harian Stasiun Yamakawa ke dalam proposal.",
    notes: "「山川駅の1日の乗降客数の利用データをグラフにして付け足しておいてくれる？」 → 山川駅の利用データを足す."
  },
  {
    num: 5,
    mondai: 1,
    questionLabelJa: "5番",
    prompt: "キャンプ場でインストラクターが参加者に作業の説明をしています。参加者はまず何をしますか。",
    options: [
      "炭に火をつける",
      "かなづちでくぎをたたく",
      "平らな石を探す",
      "保護メガネをつける"
    ],
    correctIndex: 2,
    audioText:
      "キャンプ場でインストラクターが参加者に作業の説明をしています。参加者はまず何をしますか。男：これから野外調理用のかまどを作ります。後で炭に火をつけたり、板を組み立てる時にかなづちでくぎをたたいたりしますが、その際は安全のため保護メガネをつけてもらいます。ただ、最初はかまどの土台を作りますので、まずは河原へ行って、グラグラしないように大きくて平らな石を10個ほど探して集めてきてください。参加者はまず何をしますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "キャンプ場でインストラクターが参加者に作業の説明をしています。参加者はまず何をしますか。" },
      { speaker: "Instruktur (Pria)", gender: "male", text: "これから野外調理用のかまどを作ります。後で炭に火をつけたり、板を組み立てる時にかなづちでくぎをたたいたりしますが、その際は安全のため保護メガネをつけてもらいます。ただ、最初はかまどの土台を作りますので、まずは河原へ行って、グラグラしないように大きくて平らな石を10個ほど探して集めてきてください。" },
      { speaker: "Narator", gender: "female", text: "参加者はまず何をしますか。" }
    ],
    targetWord: "平らな石を探す",
    reading: "たいらないしをさがす",
    meaningEn: "search for flat stones",
    translationId: "Untuk membuat fondasi tungku masak terlebih dahulu, peserta diminta mencari batu yang rata di tepi sungai.",
    notes: "「まずは河原へ行って、グラグラしないように大きくて平らな石を10個ほど探して集めてきてください」 → 平らな石を探す."
  },

  // ==================== 問題 2 (1番 - 6番: 6問) ====================
  {
    num: 6,
    mondai: 2,
    questionLabelJa: "1番",
    prompt: "地域の科学館で男の職員と女の職員が星空観察会について話しています。男の職員は何が一番心配だと言っていますか。",
    options: [
      "広い場所が確保できるか",
      "機材の数を十分にそろえられるか",
      "新しいぼうえんきょうを使いこなせるか",
      "星座をわかりやすく解説できるか"
    ],
    correctIndex: 3,
    audioText:
      "地域の科学館で男の職員と女の職員が星空観察会について話しています。男の職員は何が一番心配だと言っていますか。女：来週の子ども向け星空観察会、屋上の広いスペースも確保できたし、望遠鏡の数も十分そろったわね。新しく入ったデジタル望遠鏡の操作はもう慣れた？男：うん、操作は昨日の練習でバッチリだよ。ただ、今回は小学生が対象だから、専門用語を使わずに星座の神話や動きを子どもたちにわかりやすく解説できるかどうか、それが一番不安なんだ。男の職員は何が一番心配だと言っていますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "地域の科学館で男の職員と女の職員が星空観察会について話しています。男の職員は何が一番心配だと言っていますか。" },
      { speaker: "Staf (Wanita)", gender: "female", text: "来週の子ども向け星空観察会、屋上の広いスペースも確保できたし、望遠鏡の数も十分そろったわね。新しく入ったデジタル望遠鏡の操作はもう慣れた？" },
      { speaker: "Staf (Pria)", gender: "male", text: "うん、操作は昨日の練習でバッチリだよ。ただ、今回は小学生が対象だから、専門用語を使わずに星座の神話や動きを子どもたちにわかりやすく解説できるかどうか、それが一番不安なんだ。" },
      { speaker: "Narator", gender: "male", text: "男の職員は何が一番心配だと言っていますか。" }
    ],
    targetWord: "星座をわかりやすく解説できるか",
    reading: "せいざをわかりやすくかいせつできるか",
    meaningEn: "whether he can explain the constellations in an easy-to-understand way",
    translationId: "Hal yang paling dikhawatirkan petugas pria adalah apakah ia bisa menjelaskan rasi bintang dengan mudah dipahami oleh anak SD.",
    notes: "「星座の神話や動きを子どもたちにわかりやすく解説できるかどうか、それが一番不安なんだ」 → 星座をわかりやすく解説できるか."
  },
  {
    num: 7,
    mondai: 2,
    questionLabelJa: "2番",
    prompt: "会社で社長がインタビューを受けています。社長は若手社員の意欲を高めるために何が一番効果があったと言っていますか。",
    options: [
      "商品の開発を任せたこと",
      "基本的な仕事の大切さを理解してもらったこと",
      "せんぱいとチームを組ませたこと",
      "給料を上げたこと"
    ],
    correctIndex: 0,
    audioText:
      "会社で社長がインタビューを受けています。社長は若手社員の意欲を高めるために何が一番効果があったと言っていますか。女：御社では若手社員が大変生き生きと働いていますが、モチベーションを高めるために何が一番効果的でしたか。男：そうですね、以前は先輩とペアを組ませて基本的な業務を徹底的に教えていたんですが、受け身になりがちでした。そこで思い切って、入社3年目の若手だけで新商品の企画から開発まで一貫して任せてみたんです。責任は重いですが、それが一番彼らのやる気に火をつけましたね。社長は若手社員の意欲を高めるために何が一番効果があったと言っていますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "会社で社長がインタビューを受けています。社長は若手社員の意欲を高めるために何が一番効果があったと言っていますか。" },
      { speaker: "Pewawancara (Wanita)", gender: "female", text: "御社では若手社員が大変生き生きと働いていますが、モチベーションを高めるために何が一番効果的でしたか。" },
      { speaker: "Presiden Direktur (Pria)", gender: "male", text: "そうですね、以前は先輩とペアを組ませて基本的な業務を徹底的に教えていたんですが、受け身になりがちでした。そこで思い切って、入社3年目の若手だけで新商品の企画から開発まで一貫して任せてみたんです。責任は重いですが、それが一番彼らのやる気に火をつけましたね。" },
      { speaker: "Narator", gender: "female", text: "社長は若手社員の意欲を高めるために何が一番効果があったと言っていますか。" }
    ],
    targetWord: "商品の開発を任せたこと",
    reading: "しょうひんのかいはつをまかせたこと",
    meaningEn: "entrusting them with product development",
    translationId: "Hal yang paling efektif meningkatkan motivasi karyawan muda adalah mempercayakan perencanaan hingga pengembangan produk baru kepada mereka.",
    notes: "「新商品の企画から開発まで一貫して任せてみたんです。…それが一番彼らのやる気に火をつけましたね」 → 商品の開発を任せたこと."
  },
  {
    num: 8,
    mondai: 2,
    questionLabelJa: "3番",
    prompt: "講演会でスポーツ指導者が子どものスポーツ指導について話しています。指導者が最も大切だと言っていることは何ですか。",
    options: [
      "なるべく小さいときから始めさせること",
      "憧れの選手を目標とさせること",
      "けがを乗り越えさせること",
      "体の発達に合った練習をさせること"
    ],
    correctIndex: 3,
    audioText:
      "講演会でスポーツ指導者が子どものスポーツ指導について話しています。指導者が最も大切だと言っていることは何ですか。男：最近は幼児期から専門的なトレーニングを始めたり、プロの選手と同じ練習メニューをこなしたりする子どもが増えています。しかし、子どもの骨や筋肉はまだ成長段階にあり、大人と同じ負荷をかけると大きなけがにつながります。何より重要なのは、その時々の年齢や体の発達段階に合った無理のない練習をさせることです。指導者が最も大切だと言っていることは何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "講演会でスポーツ指導者が子どものスポーツ指導について話しています。指導者が最も大切だと言っていることは何ですか。" },
      { speaker: "Pelatih Olahraga (Pria)", gender: "male", text: "最近は幼児期から専門的なトレーニングを始めたり、プロの選手と同じ練習メニューをこなしたりする子どもが増えています。しかし、子どもの骨や筋肉はまだ成長段階にあり、大人と同じ負荷をかけると大きなけがにつながります。何より重要なのは、その時々の年齢や体の発達段階に合った無理のない練習をさせることです。" },
      { speaker: "Narator", gender: "male", text: "指導者が最も大切だと言っていることは何ですか。" }
    ],
    targetWord: "体の発達に合った練習をさせること",
    reading: "からだのはったつにあったれんしゅうをさせること",
    meaningEn: "having children do practice suited to their physical development",
    translationId: "Pelatih menekankan bahwa yang paling penting adalah memberikan latihan yang sesuai dengan tahap perkembangan fisik anak.",
    notes: "「何より重要なのは、その時々の年齢や体の発達段階に合った無理のない練習をさせることです」 → 体の発達に合った練習をさせること."
  },
  {
    num: 9,
    mondai: 2,
    questionLabelJa: "4番",
    prompt: "テレビで建築家が新しくできた市立図書館について話しています。この図書館が賞を受けた一番の理由は何ですか。",
    options: [
      "歴史のある建物の活用",
      "最新の自動貸し出しシステム",
      "外の光を広く取り入れられる窓",
      "段差がない設計"
    ],
    correctIndex: 0,
    audioText:
      "テレビで建築家が新しくできた市立図書館について話しています。この図書館が賞を受けた一番の理由は何ですか。女：今年度の建築デザイン賞を受賞した市立図書館ですが、バリアフリーで段差がない設計や、最新の自動貸し出しシステム、大きな窓も好評ですね。男：はい。ただ、今回の受賞で審査員から最も高く評価されたのは、明治時代に建てられた古い銀行のレンガ造りの建物を壊さずに補強し、その歴史的な空間をそのまま図書館として再生・活用した点なんです。この図書館が賞を受けた一番の理由は何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "テレビで建築家が新しくできた市立図書館について話しています。この図書館が賞を受けた一番の理由は何ですか。" },
      { speaker: "Pembawa Acara (Wanita)", gender: "female", text: "今年度の建築デザイン賞を受賞した市立図書館ですが、バリアフリーで段差がない設計や、最新の自動貸し出しシステム、大きな窓も好評ですね。" },
      { speaker: "Arsitek (Pria)", gender: "male", text: "はい。ただ、今回の受賞で審査員から最も高く評価されたのは、明治時代に建てられた古い銀行のレンガ造りの建物を壊さずに補強し、その歴史的な空間をそのまま図書館として再生・活用した点なんです。" },
      { speaker: "Narator", gender: "female", text: "この図書館が賞を受けた一番の理由は何ですか。" }
    ],
    targetWord: "歴史のある建物の活用",
    reading: "れきしのあるたてもののかつよう",
    meaningEn: "utilization of a historic building",
    translationId: "Alasan utama perpustakaan kota tersebut memenangkan penghargaan arsitektur adalah pemanfaatan kembali bangunan bank bersejarah dari zaman Meiji.",
    notes: "「明治時代に建てられた古い銀行のレンガ造りの建物を…そのまま図書館として再生・活用した点」 ＝ 歴史のある建物の活用."
  },
  {
    num: 10,
    mondai: 2,
    questionLabelJa: "5番",
    prompt: "飲料メーカーの会議で男の人と女の人が商品の売り上げについて話しています。女の人は売り上げを伸ばすためにどうすべきだと言っていますか。",
    options: [
      "甘さを抑えた味に変えること",
      "価格を下げること",
      "商品名を考え直すこと",
      "せんでんのしかたを変えること"
    ],
    correctIndex: 3,
    audioText:
      "飲料メーカーの会議で男の人と女の人が商品の売り上げについて話しています。女の人は売り上げを伸ばすためにどうすべきだと言っていますか。男：春に発売した果汁入りのお茶だけど、思ったほど売り上げが伸びていないね。甘さをもう少し抑えるか、価格を下げたほうがいいのかな。女：いえ、購入者アンケートでは味も価格も満足度が非常に高いんです。商品名も覚えやすいですし。ただ、どういう場面で飲む飲み物なのかが消費者に伝わっていないので、仕事中のリフレッシュに最適だというメッセージを前面に出して、宣伝のやり方を変えるべきだと思います。女の人は売り上げを伸ばすためにどうすべきだと言っていますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "飲料メーカーの会議で男の人と女の人が商品の売り上げについて話しています。女の人は売り上げを伸ばすためにどうすべきだと言っていますか。" },
      { speaker: "Pria", gender: "male", text: "春に発売した果汁入りのお茶だけど、思ったほど売り上げが伸びていないね。甘さをもう少し抑えるか、価格を下げたほうがいいのかな。" },
      { speaker: "Wanita", gender: "female", text: "いえ、購入者アンケートでは味も価格も満足度が非常に高いんです。商品名も覚えやすいですし。ただ、どういう場面で飲む飲み物なのかが消費者に伝わっていないので、仕事中のリフレッシュに最適だというメッセージを前面に出して、宣伝のやり方を変えるべきだと思います。" },
      { speaker: "Narator", gender: "male", text: "女の人は売り上げを伸ばすためにどうすべきだと言っていますか。" }
    ],
    targetWord: "せんでんのしかたを変えること",
    reading: "せんでんのしかたをかえること",
    meaningEn: "changing the way the product is advertised",
    translationId: "Karena rasa, harga, dan nama produk sudah disukai konsumen, wanita itu menyarankan untuk mengubah cara promosi/iklan.",
    notes: "「宣伝のやり方を変えるべきだと思います」 ＝ せんでんのしかたを変えること."
  },
  {
    num: 11,
    mondai: 2,
    questionLabelJa: "6番",
    prompt: "大学で男の学生と女の学生が経済学の講義について話しています。男の学生はこの講義の何が面白かったと言っていますか。",
    options: [
      "かへいの役割の変化",
      "世界全体の経済の動き",
      "国の政治的判断と経済の関係",
      "人の心理が消費活動に与える影響"
    ],
    correctIndex: 3,
    audioText:
      "大学で男の学生と女の学生が経済学の講義について話しています。男の学生はこの講義の何が面白かったと言っていますか。女：今期の経済学の授業、貨幣の歴史から世界経済の動き、政治と経済の関係まで幅広かったね。男：うん。中でも一番興味深かったのは、後半の行動経済学のテーマだな。人間は必ずしも合理的に買い物をしているわけじゃなくて、その時の気分や思い込みといった人間の心理が消費活動にどれだけ大きな影響を与えているかという話、すごく面白かったよ。男の学生はこの講義の何が面白かったと言っていますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "大学で男の学生と女の学生が経済学の講義について話しています。男の学生はこの講義の何が面白かったと言っていますか。" },
      { speaker: "Mahasiswi", gender: "female", text: "今期の経済学の授業、貨幣の歴史から世界経済の動き、政治と経済の関係まで幅広かったね。" },
      { speaker: "Mahasiswa", gender: "male", text: "うん。中でも一番興味深かったのは、後半の行動経済学のテーマだな。人間は必ずしも合理的に買い物をしているわけじゃなくて、その時の気分や思い込みといった人間の心理が消費活動にどれだけ大きな影響を与えているかという話、すごく面白かったよ。" },
      { speaker: "Narator", gender: "female", text: "男の学生はこの講義の何が面白かったと言っていますか。" }
    ],
    targetWord: "人の心理が消費活動に与える影響",
    reading: "ひとのしんりがしょうひかつどうにあたえるえいきょう",
    meaningEn: "the influence of human psychology on consumer behavior",
    translationId: "Mahasiswa pria merasa bagian paling menarik dari kuliah ekonomi tersebut adalah pengaruh psikologi manusia terhadap aktivitas konsumsi.",
    notes: "「人間の心理が消費活動にどれだけ大きな影響を与えているかという話、すごく面白かったよ」 → 人の心理が消費活動に与える影響."
  },

  // ==================== 問題 3 (1番 - 5番: 5問・概要理解) ====================
  {
    num: 12,
    mondai: 3,
    questionLabelJa: "1番",
    prompt: "ラジオで映画監督が映画作りについて話しています。監督は何について話していますか。",
    options: [
      "映画音楽が観客の感情に与える効果",
      "地方の町で撮影を行うことの魅力",
      "新人俳優を起用する理由",
      "最新のCG技術を使った映像表現"
    ],
    correctIndex: 1,
    audioText:
      "ラジオで映画監督が映画作りについて話しています。男：私はこれまで多くの映画を地方の小さな町で撮影してきました。スタジオでセットを組むほうが天候にも左右されず効率的だと言われますが、その土地ならではの空気感や、地元の人々が長年暮らしてきた街並みの味わいは、どんなに精巧なセットでも再現できません。また、撮影を通じて地域の方々と交流することで、脚本にはなかった温かい場面が生まれることも多いのです。監督は何について話していますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "ラジオで映画監督が映画作りについて話しています。" },
      { speaker: "Sutradara Film", gender: "male", text: "私はこれまで多くの映画を地方の小さな町で撮影してきました。スタジオでセットを組むほうが天候にも左右されず効率的だと言われますが、その土地ならではの空気感や、地元の人々が長年暮らしてきた街並みの味わいは、どんなに精巧なセットでも再現できません。また、撮影を通じて地域の方々と交流することで、脚本にはなかった温かい場面が生まれることも多いのです。" },
      { speaker: "Narator", gender: "female", text: "監督は何について話していますか。" }
    ],
    targetWord: "地方の町で撮影を行うことの魅力",
    reading: "ちほうのまちでさつえいをおこなうことのみりょく",
    meaningEn: "the appeal of filming movies in regional towns",
    translationId: "Sutradara menceritakan daya tarik melakukan syuting film di kota-kota daerah dibanding di studio.",
    notes: "Inti monolog: 地方の町で撮影を行うことの魅力."
  },
  {
    num: 13,
    mondai: 3,
    questionLabelJa: "2番",
    prompt: "講演会で経営コンサルタントが話しています。話のテーマは主に何ですか。",
    options: [
      "海外市場へ進出する際のリスク管理",
      "異業種の企業と協力することの利点",
      "社内のペーパーレス化の進め方",
      "テレワークにおける社員の評価方法"
    ],
    correctIndex: 1,
    audioText:
      "講演会で経営コンサルタントが話しています。女：技術や市場の変化が激しい現代において、自社だけの技術やノウハウで革新的な新商品を生み出すことには限界があります。そこで近年注目されているのが、全く異なる業種の企業同士が手を組む取り組みです。例えば、食品メーカーとIT企業、あるいは繊維メーカーと医療機器メーカーが協力することで、これまでの常識を覆すような新しい価値が生まれています。話のテーマは主に何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "講演会で経営コンサルタントが話しています。" },
      { speaker: "Konsultan Bisnis", gender: "female", text: "技術や市場の変化が激しい現代において、自社だけの技術やノウハウで革新的な新商品を生み出すことには限界があります。そこで近年注目されているのが、全く異なる業種の企業同士が手を組む取り組みです。例えば、食品メーカーとIT企業、あるいは繊維メーカーと医療機器メーカーが協力することで、これまでの常識を覆すような新しい価値が生まれています。" },
      { speaker: "Narator", gender: "male", text: "話のテーマは主に何ですか。" }
    ],
    targetWord: "異業種の企業と協力することの利点",
    reading: "いぎょうしゅのきぎょうときょうりょくすることのりてん",
    meaningEn: "the advantages of collaborating with companies from different industries",
    translationId: "Konsultan menjelaskan keuntungan bekerja sama antarperusahaan dari bidang industri yang berbeda.",
    notes: "Inti kuliah: 異業種の企業と協力することの利点."
  },
  {
    num: 14,
    mondai: 3,
    questionLabelJa: "3番",
    prompt: "テレビで博物館の館長が新しい展示方法について話しています。館長が一番伝えたいことは何ですか。",
    options: [
      "貴重な資料を長く保存することの難しさ",
      "実際に触れて体験できる展示の意義",
      "デジタルアーカイブを公開するメリット",
      "音声ガイドを多言語化する必要性"
    ],
    correctIndex: 1,
    audioText:
      "テレビで博物館の館長が新しい展示方法について話しています。男：これまでの博物館といえば、ガラスケースの中に展示物を入れて『手を触れないでください』と書くのが当たり前でした。もちろん貴重な文化財の保護は大切ですが、見るだけでは物の重さや質感までは伝わりません。そこで当館では、精巧なレプリカや一部の実物資料を実際に手で触って動かせるコーナーを大幅に増やしました。五感を使って体感することで、歴史や科学への興味がぐっと深まるはずです。館長が一番伝えたいことは何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "テレビで博物館の館長が新しい展示方法について話しています。" },
      { speaker: "Kepala Museum", gender: "male", text: "これまでの博物館といえば、ガラスケースの中に展示物を入れて『手を触れないでください』と書くのが当たり前でした。もちろん貴重な文化財の保護は大切ですが、見るだけでは物の重さや質感までは伝わりません。そこで当館では、精巧なレプリカや一部の実物資料を実際に手で触って動かせるコーナーを大幅に増やしました。五感を使って体感することで、歴史や科学への興味がぐっと深まるはずです。" },
      { speaker: "Narator", gender: "female", text: "館長が一番伝えたいことは何ですか。" }
    ],
    targetWord: "実際に触れて体験できる展示の意義",
    reading: "じっさいにふれてたいけんできるてんじのいぎ",
    meaningEn: "the significance of hands-on exhibitions that visitors can actually touch",
    translationId: "Kepala museum menjelaskan makna penting pameran interaktif yang dapat disentuh langsung dengan pancaindra.",
    notes: "Inti pesan: 実際に触れて体験できる展示の意義."
  },
  {
    num: 15,
    mondai: 3,
    questionLabelJa: "4番",
    prompt: "大学の授業で教授が『睡眠と記憶』について話しています。教授は何について説明していますか。",
    options: [
      "睡眠不足が身体の免疫に与える悪影響",
      "年齢とともに必要な睡眠時間が変わる理由",
      "学習した後に睡眠をとることの重要性",
      "質の高い睡眠をとるための寝室の環境"
    ],
    correctIndex: 2,
    audioText:
      "大学の授業で教授が『睡眠と記憶』について話しています。女：試験の前に徹夜で勉強する学生がよくいますが、脳科学の観点から見ると非常に非効率的です。新しい知識や技術を学んだ後、脳は睡眠中にその情報を整理し、長期的な記憶として定着させます。実験でも、同じ時間勉強した場合、徹夜したグループよりしっかり6時間以上眠ったグループのほうが翌日のテストの成績が圧倒的に高いことがわかっています。教授は何について説明していますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "大学の授業で教授が『睡眠と記憶』について話しています。" },
      { speaker: "Profesor", gender: "female", text: "試験の前に徹夜で勉強する学生がよくいますが、脳科学の観点から見ると非常に非効率的です。新しい知識や技術を学んだ後、脳は睡眠中にその情報を整理し、長期的な記憶として定着させます。実験でも、同じ時間勉強した場合、徹夜したグループよりしっかり6時間以上眠ったグループのほうが翌日のテストの成績が圧倒的に高いことがわかっています。" },
      { speaker: "Narator", gender: "male", text: "教授は何について説明していますか。" }
    ],
    targetWord: "学習した後に睡眠をとることの重要性",
    reading: "がくしゅうしたあとにすいみんをとることのじゅうようせい",
    meaningEn: "the importance of getting sleep after studying to consolidate memory",
    translationId: "Profesor menjelaskan pentingnya tidur setelah belajar agar informasi tertanam menjadi ingatan jangka panjang.",
    notes: "Inti penjelasan: 学習した後に睡眠をとることの重要性."
  },
  {
    num: 16,
    mondai: 3,
    questionLabelJa: "5番",
    prompt: "市役所の説明会で担当者が『緑のカーテン』について話しています。担当者の話の目的は何ですか。",
    options: [
      "市の公園に植える木の種類を募集すること",
      "家庭でのツル性植物の栽培を呼びかけること",
      "新しいゴミの分別方法を周知すること",
      "太陽光発電パネルの補助金を案内すること"
    ],
    correctIndex: 1,
    audioText:
      "市役所の説明会で担当者が『緑のカーテン』について話しています。男：夏の厳しい日差しを遮り、エアコンの使用を抑える工夫として、窓の外にゴーヤやアサガオなどのツル性植物を這わせる『緑のカーテン』が非常に効果的です。葉から水分が蒸発することで周囲の温度も下がりますし、収穫も楽しめます。市では来週から希望するご家庭に苗とネットを無料で配布しますので、ぜひご自宅の窓辺で育ててみてください。担当者の話の目的は何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "市役所の説明会で担当者が『緑のカーテン』について話しています。" },
      { speaker: "Petugas Kota", gender: "male", text: "夏の厳しい日差しを遮り、エアコンの使用を抑える工夫として、窓の外にゴーヤやアサガオなどのツル性植物を這わせる『緑のカーテン』が非常に効果的です。葉から水分が蒸発することで周囲の温度も下がりますし、収穫も楽しめます。市では来週から希望するご家庭に苗とネットを無料で配布しますので、ぜひご自宅の窓辺で育ててみてください。" },
      { speaker: "Narator", gender: "female", text: "担当者の話の目的は何ですか。" }
    ],
    targetWord: "家庭でのツル性植物の栽培を呼びかけること",
    reading: "かていでのツルせいしょくぶつのさいばいをよびかけること",
    meaningEn: "encouraging households to grow climbing plants ('green curtains')",
    translationId: "Petugas mengajak warga menanam tanaman merambat ('tirai hijau') di jendela rumah untuk menghemat energi di musim panas.",
    notes: "Inti ajakan: 家庭でのツル性植物の栽培を呼びかけること."
  },

  // ==================== 問題 4 (1番 - 11番: 11問・即時応答・3選択肢) ====================
  {
    num: 17,
    mondai: 4,
    questionLabelJa: "1番",
    prompt: "「今回の新規事業、リスクがないといったらうそになるけど、挑戦する価値は十分あるよ。」",
    options: [
      "リスクが全くないなら安心ですね。",
      "挑戦しないほうがいいということですか。",
      "そうですね、思い切ってやってみましょう。"
    ],
    correctIndex: 2,
    audioText:
      "今回の新規事業、リスクがないといったらうそになるけど、挑戦する価値は十分あるよ。 1. リスクが全くないなら安心ですね。 2. 挑戦しないほうがいいということですか。 3. そうですね、思い切ってやってみましょう。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "今回の新規事業、リスクがないといったらうそになるけど、挑戦する価値は十分あるよ。" },
      { speaker: "Opsi 1", gender: "female", text: "1. リスクが全くないなら安心ですね。" },
      { speaker: "Opsi 2", gender: "female", text: "2. 挑戦しないほうがいいということですか。" },
      { speaker: "Opsi 3", gender: "female", text: "3. そうですね、思い切ってやってみましょう。" }
    ],
    targetWord: "そうですね、思い切ってやってみましょう",
    reading: "ないといったらうそになる",
    meaningEn: "I agree, let's take the plunge and try it!",
    translationId: "'Bisnis baru kali ini, kalau dibilang tidak ada risiko tentu bohong, tetapi sangat layak untuk dicoba.' → 'Benar, mari kita beranikan diri mencobanya.'",
    notes: "～ないといったらうそになる = memang ada (risikonya), tetapi ～."
  },
  {
    num: 18,
    mondai: 4,
    questionLabelJa: "2番",
    prompt: "「山田くん、さっきの取引先への説明、もうちょっと言葉を選べばよかったんじゃない？」",
    options: [
      "すみません、配慮が足りませんでした。",
      "そんなにうまく説明できていましたか。",
      "はい、時間をかけて選んだんですが。"
    ],
    correctIndex: 0,
    audioText:
      "山田くん、さっきの取引先への説明、もうちょっと言葉を選べばよかったんじゃない？ 1. すみません、配慮が足りませんでした。 2. そんなにうまく説明できていましたか。 3. はい、時間をかけて選んだんですが。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "山田くん、さっきの取引先への説明、もうちょっと言葉を選べばよかったんじゃない？" },
      { speaker: "Opsi 1", gender: "male", text: "1. すみません、配慮が足りませんでした。" },
      { speaker: "Opsi 2", gender: "male", text: "2. そんなにうまく説明できていましたか。" },
      { speaker: "Opsi 3", gender: "male", text: "3. はい、時間をかけて選んだんですが。" }
    ],
    targetWord: "すみません、配慮が足りませんでした",
    reading: "ことばをえらべばよかったんじゃない",
    meaningEn: "I'm sorry, I wasn't considerate enough",
    translationId: "'Yamada-kun, penjelasan ke klien barusan, bukankah sebaiknya kamu lebih berhati-hati memilih kata-kata?' → 'Maaf, saya kurang bijaksana/peka.'",
    notes: "言葉を選ぶ = berhati-hati dalam memilih kata agar sopan."
  },
  {
    num: 19,
    mondai: 4,
    questionLabelJa: "3番",
    prompt: "「あのベテランの職人が引退するなんて、工場にとって痛手以外の何ものでもないね。」",
    options: [
      "そこまで大きな影響はないんですね。",
      "本当に大きな損失ですよね。",
      "けがをして引退されたんですか。"
    ],
    correctIndex: 1,
    audioText:
      "あのベテランの職人が引退するなんて、工場にとって痛手以外の何ものでもないね。 1. そこまで大きな影響はないんですね。 2. 本当に大きな損失ですよね。 3. けがをして引退されたんですか。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "あのベテランの職人が引退するなんて、工場にとって痛手以外の何ものでもないね。" },
      { speaker: "Opsi 1", gender: "female", text: "1. そこまで大きな影響はないんですね。" },
      { speaker: "Opsi 2", gender: "female", text: "2. 本当に大きな損失ですよね。" },
      { speaker: "Opsi 3", gender: "female", text: "3. けがをして引退されたんですか。" }
    ],
    targetWord: "本当に大きな損失ですよね",
    reading: "いたでいがいのなにものでもない",
    meaningEn: "It really is a huge loss, isn't it?",
    translationId: "'Pensiunnya pengrajin senior itu benar-benar merupakan pukulan berat bagi pabrik kita.' → 'Benar-benar kerugian yang sangat besar ya.'",
    notes: "痛手（いたで）= pukulan telak / kerugian besar; ～以外の何ものでもない = tidak lain adalah ～."
  },
  {
    num: 20,
    mondai: 4,
    questionLabelJa: "4番",
    prompt: "「部長、来期の予算案ですが、これ以上削るくらいなら計画自体を見直したほうがましです。」",
    options: [
      "じゃあ、もう少し予算を削ってみようか。",
      "そこまで言うなら、もう一度ゼロから検討しよう。",
      "予算を減らしたほうが計画が進みそうだね。"
    ],
    correctIndex: 1,
    audioText:
      "部長、来期の予算案ですが、これ以上削るくらいなら計画自体を見直したほうがましです。 1. じゃあ、もう少し予算を削ってみようか。 2. そこまで言うなら、もう一度ゼロから検討しよう。 3. 予算を減らしたほうが計画が進みそうだね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "部長、来期の予算案ですが、これ以上削るくらいなら計画自体を見直したほうがましです。" },
      { speaker: "Opsi 1", gender: "male", text: "1. じゃあ、もう少し予算を削ってみようか。" },
      { speaker: "Opsi 2", gender: "male", text: "2. そこまで言うなら、もう一度ゼロから検討しよう。" },
      { speaker: "Opsi 3", gender: "male", text: "3. 予算を減らしたほうが計画が進みそうだね。" }
    ],
    targetWord: "そこまで言うなら、もう一度ゼロから検討しよう",
    reading: "けずるくらいなら…ほうがましです",
    meaningEn: "If you say so that strongly, let's reconsider the plan from scratch",
    translationId: "'Pak Kepala Bagian, mengenai rancangan anggaran periode depan, daripada dipangkas lebih jauh lagi, lebih baik meninjau ulang rencana itu sendiri.' → 'Kalau kamu bicara sampai sejauh itu, mari kita kaji ulang lagi dari nol.'",
    notes: "～くらいなら…ほうがましだ = daripada harus ..., lebih mending ...."
  },
  {
    num: 21,
    mondai: 4,
    questionLabelJa: "5番",
    prompt: "「例のシステムの不具合、原因を突き止めるのに3日もかかったよ。早く見つかればそれにこしたことはなかったんだけどね。」",
    options: [
      "すぐに見つかって本当によかったね。",
      "まあ、とにかく原因がわかって何よりだよ。",
      "結局原因はわからずじまいだったんだね。"
    ],
    correctIndex: 1,
    audioText:
      "例のシステムの不具合、原因を突き止めるのに3日もかかったよ。早く見つかればそれにこしたことはなかったんだけどね。 1. すぐに見つかって本当によかったね。 2. まあ、とにかく原因がわかって何よりだよ。 3. 結局原因はわからずじまいだったんだね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "例のシステムの不具合、原因を突き止めるのに3日もかかったよ。早く見つかればそれにこしたことはなかったんだけどね。" },
      { speaker: "Opsi 1", gender: "female", text: "1. すぐに見つかって本当によかったね。" },
      { speaker: "Opsi 2", gender: "female", text: "2. まあ、とにかく原因がわかって何よりだよ。" },
      { speaker: "Opsi 3", gender: "female", text: "3. 結局原因はわからずじまいだったんだね。" }
    ],
    targetWord: "まあ、とにかく原因がわかって何よりだよ",
    reading: "それにこしたことはない",
    meaningEn: "Well, at any rate, it's great that the cause was found",
    translationId: "'Gangguan sistem itu butuh 3 hari untuk menemukan penyebabnya. Tentu kalau ketemu lebih cepat akan lebih baik sih.' → 'Yah, yang penting syukurlah penyebabnya sudah ketahuan.'",
    notes: "～ばそれにこしたことはない = kalau bisa ～ tentu itu yang paling ideal."
  },
  {
    num: 22,
    mondai: 4,
    questionLabelJa: "6番",
    prompt: "「ねえ、さっきの会議での木村さんの発言、聞き捨てならないよね。」",
    options: [
      "うん、あれはちょっと黙っていられないね。",
      "ええ、すぐ聞き流したほうがいいわよ。",
      "ほんと、役に立ついい意見だったね。"
    ],
    correctIndex: 0,
    audioText:
      "ねえ、さっきの会議での木村さんの発言、聞き捨てならないよね。 1. うん、あれはちょっと黙っていられないね。 2. ええ、すぐ聞き流したほうがいいわよ。 3. ほんと、役に立ついい意見だったね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "ねえ、さっきの会議での木村さんの発言、聞き捨てならないよね。" },
      { speaker: "Opsi 1", gender: "male", text: "1. うん、あれはちょっと黙っていられないね。" },
      { speaker: "Opsi 2", gender: "male", text: "2. ええ、すぐ聞き流したほうがいいわよ。" },
      { speaker: "Opsi 3", gender: "male", text: "3. ほんと、役に立ついい意見だったね。" }
    ],
    targetWord: "うん、あれはちょっと黙っていられないね",
    reading: "ききずてならない",
    meaningEn: "Yeah, we really can't stay silent about that",
    translationId: "'Hei, ucapan Kimura-san di rapat tadi tidak bisaibiarkan begitu saja kan.' → 'Iya, itu sih kita tidak bisa tinggal diam.'",
    notes: "聞き捨てならない (ききずてならない) = ucapan yang keterlaluan sehingga tidak bisa diabaikan begitu saja."
  },
  {
    num: 23,
    mondai: 4,
    questionLabelJa: "7番",
    prompt: "「新しく入ったアルバイトの林くん、仕事が早いといったらないよ。」",
    options: [
      "そんなに手際がいいんですか。",
      "まだ慣れていないから仕方ないですよ。",
      "もう少し早く来てほしいですね。"
    ],
    correctIndex: 0,
    audioText:
      "新しく入ったアルバイトの林くん、仕事が早いといったらないよ。 1. そんなに手際がいいんですか。 2. まだ慣れていないから仕方ないですよ。 3. もう少し早く来てほしいですね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "新しく入ったアルバイトの林くん、仕事が早いといったらないよ。" },
      { speaker: "Opsi 1", gender: "female", text: "1. そんなに手際がいいんですか。" },
      { speaker: "Opsi 2", gender: "female", text: "2. まだ慣れていないから仕方ないですよ。" },
      { speaker: "Opsi 3", gender: "female", text: "3. もう少し早く来てほしいですね。" }
    ],
    targetWord: "そんなに手際がいいんですか",
    reading: "はやいといったらない",
    meaningEn: "Is he really that efficient/skillful?",
    translationId: "'Staf paruh waktu baru Hayashi-kun itu kerjanya luar biasa cepat lho.' → 'Sebegitu cekatannya kah dia?'",
    notes: "～といったらない = luar biasa ～ / sangat ～ (tingkat ekstrem)."
  },
  {
    num: 24,
    mondai: 4,
    questionLabelJa: "8番",
    prompt: "「母さん、せっかく送ってくれた野菜だけど、一人暮らしじゃ食べきれるわけないよ。」",
    options: [
      "あら、足りなかったならもっと送るわよ。",
      "じゃあ、近所の友達にでもお裾分けしたら？",
      "全部食べられてよかったじゃない。"
    ],
    correctIndex: 1,
    audioText:
      "母さん、せっかく送ってくれた野菜だけど、一人暮らしじゃ食べきれるわけないよ。 1. あら、足りなかったならもっと送るわよ。 2. じゃあ、近所の友達にでもお裾分けしたら？ 3. 全部食べられてよかったじゃない。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "母さん、せっかく送ってくれた野菜だけど、一人暮らしじゃ食べきれるわけないよ。" },
      { speaker: "Opsi 1", gender: "female", text: "1. あら、足りなかったならもっと送るわよ。" },
      { speaker: "Opsi 2", gender: "female", text: "2. じゃあ、近所の友達にでもお裾分けしたら？" },
      { speaker: "Opsi 3", gender: "female", text: "3. 全部食べられてよかったじゃない。" }
    ],
    targetWord: "じゃあ、近所の友達にでもお裾分けしたら？",
    reading: "たべきれるわけない",
    meaningEn: "Then why don't you share some with your friends nearby?",
    translationId: "'Bu, sayuran yang Ibu kirimkan ini, karena aku tinggal sendirian mana mungkin habis kumakan sendiri.' → 'Kalau begitu, bagaimana kalau dibagi ke teman dekat rumahmu?'",
    notes: "食べきれるわけない = tidak mungkin sanggup menghabiskan semuanya; お裾分け (おすそわけ) = berbagi makanan/oleh-oleh."
  },
  {
    num: 25,
    mondai: 4,
    questionLabelJa: "9番",
    prompt: "「来週の学会の発表、準備不足で不安でたまらないよ。」",
    options: [
      "準備が万全なら安心だね。",
      "今からでもできるだけのことはやろうよ。",
      "発表しなくて済むことになったんだね。"
    ],
    correctIndex: 1,
    audioText:
      "来週の学会の発表、準備不足で不安でたまらないよ。 1. 準備が万全なら安心だね。 2. 今からでもできるだけのことはやろうよ。 3. 発表しなくて済むことになったんだね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "来週の学会の発表、準備不足で不安でたまらないよ。" },
      { speaker: "Opsi 1", gender: "female", text: "1. 準備が万全なら安心だね。" },
      { speaker: "Opsi 2", gender: "female", text: "2. 今からでもできるだけのことはやろうよ。" },
      { speaker: "Opsi 3", gender: "female", text: "3. 発表しなくて済むことになったんだね。" }
    ],
    targetWord: "今からでもできるだけのことはやろうよ",
    reading: "ふあんでたまらない",
    meaningEn: "Let's do everything we possibly can starting right now!",
    translationId: "'Presentasi konferensi ilmiah minggu depan, karena kurang persiapan aku cemas bukan main.' → 'Mulai sekarang pun ayo kita lakukan semaksimal mungkin.'",
    notes: "不安でたまらない = sangat cemas tak tertahankan."
  },
  {
    num: 26,
    mondai: 4,
    questionLabelJa: "10番",
    prompt: "「この新しいソフト、使い方を覚えるまでは大変だけど、慣れれば便利この上ないよ。」",
    options: [
      "慣れてもあまり使えないんですね。",
      "それはぜひ早く使いこなしたいですね。",
      "そんなに簡単に覚えられるんですか。"
    ],
    correctIndex: 1,
    audioText:
      "この新しいソフト、使い方を覚えるまでは大変だけど、慣れれば便利この上ないよ。 1. 慣れてもあまり使えないんですね。 2. それはぜひ早く使いこなしたいですね。 3. そんなに簡単に覚えられるんですか。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "この新しいソフト、使い方を覚えるまでは大変だけど、慣れれば便利この上ないよ。" },
      { speaker: "Opsi 1", gender: "male", text: "1. 慣れてもあまり使えないんですね。" },
      { speaker: "Opsi 2", gender: "male", text: "2. それはぜひ早く使いこなしたいですね。" },
      { speaker: "Opsi 3", gender: "male", text: "3. そんなに簡単に覚えられるんですか。" }
    ],
    targetWord: "それはぜひ早く使いこなしたいですね",
    reading: "べんりこのうえない",
    meaningEn: "Then I definitely want to master using it soon!",
    translationId: "'Perangkat lunak baru ini memang repot sampai hafal cara pakainya, tetapi kalau sudah terbiasa, praktisnya tiada tara.' → 'Kalau begitu saya ingin cepat-cepat mahir menggunakannya.'",
    notes: "～この上ない (このうえない) = tiada bandingannya / sangat luar biasa ～."
  },
  {
    num: 27,
    mondai: 4,
    questionLabelJa: "11番",
    prompt: "「高橋さん、昨日のトラブルの件、私がうっかり確認を怠ったばかりに、ご迷惑をおかけしてすみませんでした。」",
    options: [
      "いえ、もう解決しましたから気にしないでください。",
      "確認してくれたおかげで助かりましたよ。",
      "高橋さんのせいじゃないから謝らないでください。"
    ],
    correctIndex: 0,
    audioText:
      "高橋さん、昨日のトラブルの件、私がうっかり確認を怠ったばかりに、ご迷惑をおかけしてすみませんでした。 1. いえ、もう解決しましたから気にしないでください。 2. 確認してくれたおかげで助かりましたよ。 3. 高橋さんのせいじゃないから謝らないでください。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "高橋さん、昨日のトラブルの件、私がうっかり確認を怠ったばかりに、ご迷惑をおかけしてすみませんでした。" },
      { speaker: "Opsi 1", gender: "male", text: "1. いえ、もう解決しましたから気にしないでください。" },
      { speaker: "Opsi 2", gender: "male", text: "2. 確認してくれたおかげで助かりましたよ。" },
      { speaker: "Opsi 3", gender: "male", text: "3. 高橋さんのせいじゃないから謝らないでください。" }
    ],
    targetWord: "いえ、もう解決しましたから気にしないでください",
    reading: "かくにんをおこたったばかりに",
    meaningEn: "No, it's already resolved so please don't worry about it",
    translationId: "'Takahashi-san, soal masalah kemarin, gara-gara saya lalai melakukan pengecekan, saya telah merepotkan Anda, mohon maaf.' → 'Tidak apa-apa, masalahnya sudah selesai jadi jangan dipikirkan.'",
    notes: "怠る (おこたる = lalai) + ～たばかりに (gara-gara melakukan ～ maka terjadi akibat buruk)."
  },

  // ==================== 問題 5 (1番, 2番[質問1・質問2]: 3問・統合理解) ====================
  {
    num: 28,
    mondai: 5,
    questionLabelJa: "1番",
    prompt: "会社の会議で男女3人が社内研修の方法について話し合っています。どの方法で研修を行うことに決まりましたか。",
    options: [
      "平日の夜にオンラインで行う",
      "土曜日に外部の研修施設で行う",
      "平日の昼間に社内の会議室で行う",
      "各自が録画された動画を見て学習する"
    ],
    correctIndex: 2,
    audioText:
      "会社の会議で男女3人が社内研修の方法について話し合っています。男1：来月のコンプライアンス研修だけど、全社員が参加しやすく、かつグループ討論もしっかりできる方法にしたいね。女：はい。平日の夜にオンラインでやる案や、各自がオンデマンド動画を見る案もありますが、動画視聴だけだと議論ができませんし、夜は子育て中の社員が参加しにくいです。男2：じゃあ土曜日に外部の施設を借りて集まるのはどうですか。女：休日の出勤になると振替休日の調整が大変ですよ。それより、平日の昼間に部門ごとに時間を分けて社内の大会議室に集まれば、業務時間内に討論もできます。男1：なるほど、それが一番現実的で効果も高そうだね。それでいこう。どの方法で研修を行うことに決まりましたか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "会社の会議で男女3人が社内研修の方法について話し合っています。" },
      { speaker: "Manajer (Pria 1)", gender: "male", text: "来月のコンプライアンス研修だけど、全社員が参加しやすく、かつグループ討論もしっかりできる方法にしたいね。" },
      { speaker: "Staf (Wanita)", gender: "female", text: "はい。平日の夜にオンラインでやる案や、各自がオンデマンド動画を見る案もありますが、動画視聴だけだと議論ができませんし、夜は子育て中の社員が参加しにくいです。" },
      { speaker: "Staf (Pria 2)", gender: "male", text: "じゃあ土曜日に外部の施設を借りて集まるのはどうですか。" },
      { speaker: "Staf (Wanita)", gender: "female", text: "休日の出勤になると振替休日の調整が大変ですよ。それより、平日の昼間に部門ごとに時間を分けて社内の大会議室に集まれば、業務時間内に討論もできます。" },
      { speaker: "Manajer (Pria 1)", gender: "male", text: "なるほど、それが一番現実的で効果も高そうだね。それでいこう。" },
      { speaker: "Narator", gender: "male", text: "どの方法で研修を行うことに決まりましたか。" }
    ],
    targetWord: "平日の昼間に社内の会議室で行う",
    reading: "へいじつのひるまにしゃないのかいぎしつでおこなう",
    meaningEn: "hold it during weekday daytime in the company's conference room",
    translationId: "Mereka memutuskan mengadakan pelatihan pada siang hari di hari kerja di ruang rapat perusahaan agar bisa berdiskusi kelompok selama jam kerja.",
    notes: "Keputusan akhir: 平日の昼間に社内の会議室で行う."
  },
  {
    num: 29,
    mondai: 5,
    questionLabelJa: "2番（質問1）",
    prompt: "ラジオで4つの本屋（島田書店・森山書店・ミナミブックス・北川ブックス）の特徴を紹介しています。それを聞いて男の人と女の人が話しています。\n【質問1】男の人はどの本屋に行くことにしましたか。",
    options: [
      "島田書店",
      "森山書店",
      "ミナミブックス",
      "北川ブックス"
    ],
    correctIndex: 2,
    audioText:
      "ラジオで4つの本屋の特徴を紹介しています。それを聞いて男の人と女の人が話しています。アナウンサー：今日は駅周辺の個性豊かな4つの書店をご紹介します。まず『島田書店』は、明治創業の老舗で、美術書や歴史の専門書、古書が充実しています。次に『森山書店』は、児童書や絵本が豊富で、親子で座って読める広いキッズスペースがあります。『ミナミブックス』は夜11時まで営業しており、カフェが併設されていて購入前の本もコーヒーを飲みながらじっくり選べます。最後の『北川ブックス』は外国語の書籍や海外の雑誌、旅行ガイドブックを専門に扱っています。男：へえ、いろんな本屋があるんだね。僕は今日仕事が終わるのが夜9時過ぎになるし、ゆっくりお茶でも飲みながらビジネス書を選びたいから、ここに行ってみよう。女：いいわね。私は来月ヨーロッパへ旅行に行くから、現地の詳しい情報や外国語の本を探しに、週末こっちの店に行ってみるわ。質問1：男の人はどの本屋に行くことにしましたか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "ラジオで4つの本屋の特徴を紹介しています。それを聞いて男の人と女の人が話しています。" },
      { speaker: "Penyiar Radio", gender: "female", text: "今日は駅周辺の個性豊かな4つの書店をご紹介します。まず『島田書店』は、明治創業の老舗で、美術書や歴史の専門書、古書が充実しています。次に『森山書店』は、児童書や絵本が豊富で、親子で座って読める広いキッズスペースがあります。『ミナミブックス』は夜11時まで営業しており、カフェが併設されていて購入前の本もコーヒーを飲みながらじっくり選べます。最後の『北川ブックス』は外国語の書籍や海外の雑誌、旅行ガイドブックを専門に扱っています。" },
      { speaker: "Pria", gender: "male", text: "へえ、いろんな本屋があるんだね。僕は今日仕事が終わるのが夜9時過ぎになるし、ゆっくりお茶でも飲みながらビジネス書を選びたいから、ここに行ってみよう。" },
      { speaker: "Wanita", gender: "female", text: "いいわね。私は来月ヨーロッパへ旅行に行くから、現地の詳しい情報や外国語の本を探しに、週末こっちの店に行ってみるわ。" },
      { speaker: "Narator", gender: "female", text: "質問1：男の人はどの本屋に行くことにしましたか。" }
    ],
    targetWord: "ミナミブックス",
    reading: "ミナミブックス",
    meaningEn: "Minami Books (open until 11 PM with an attached cafe)",
    translationId: "Pria itu pulang kerja lewat pukul 9 malam dan ingin memilih buku sambil minum kopi di kafe, sehingga ia memilih pergi ke ミナミブックス.",
    notes: "ミナミブックス：夜11時まで営業しており、カフェが併設されている → pilihan pria pada 質問1."
  },
  {
    num: 30,
    mondai: 5,
    questionLabelJa: "2番（質問2）",
    prompt: "ラジオで4つの本屋（島田書店・森山書店・ミナミブックス・北川ブックス）の特徴を紹介しています。\n【質問2】女の人はどの本屋に行くことにしましたか。",
    options: [
      "島田書店",
      "森山書店",
      "ミナミブックス",
      "北川ブックス"
    ],
    correctIndex: 3,
    audioText:
      "質問2：女の人はどの本屋に行くことにしましたか。アナウンサー：『島田書店』は美術書や歴史の専門書、『森山書店』は児童書や絵本、『ミナミブックス』は夜11時まで営業でカフェ併設、『北川ブックス』は外国語の書籍や海外の雑誌、旅行ガイドブックを専門に扱っています。女：私は来月ヨーロッパへ旅行に行くから、現地の詳しい情報や外国語の本を探しに、週末こっちの店に行ってみるわ。質問2：女の人はどの本屋に行くことにしましたか。",
    dialogueScript: [
      { speaker: "Penyiar Radio", gender: "female", text: "『島田書店』は美術書や歴史の専門書、『森山書店』は児童書や絵本、『ミナミブックス』は夜11時まで営業でカフェ併設、『北川ブックス』は外国語の書籍や海外の雑誌、旅行ガイドブックを専門に扱っています。" },
      { speaker: "Wanita", gender: "female", text: "私は来月ヨーロッパへ旅行に行くから、現地の詳しい情報や外国語の本を探しに、週末こっちの店に行ってみるわ。" },
      { speaker: "Narator", gender: "female", text: "質問2：女の人はどの本屋に行くことにしましたか。" }
    ],
    targetWord: "北川ブックス",
    reading: "きたがわブックス",
    meaningEn: "Kitagawa Books (specializes in foreign language books, overseas magazines, and travel guides)",
    translationId: "Wanita itu akan berwisata ke Eropa bulan depan dan ingin mencari buku panduan wisata serta buku bahasa asing, sehingga ia memilih pergi ke 北川ブックス.",
    notes: "北川ブックス：外国語の書籍や海外の雑誌、旅行ガイドブックを専門に扱っている → pilihan wanita pada 質問2."
  }
];

// ============================================================================
// Fungsi Konversi & Ekspor Dataset Resmi 2023年7月 日本語能力試験 N1
// ============================================================================

export function get2023N1VocabQuestions(): QuestionItem[] {
  return RAW_2023_N1_VOCAB.map((item) => {
    const mondaiInfo = VOCAB_N1_MONDAI_LABELS[item.mondai];
    const qType =
      item.mondai === 1 ? "G1_KANJI_READING" : "G4_CONTEXT_VOCAB";

    return {
      id: `2023-n1-vocab-${item.num}`,
      level: "N1",
      type: qType,
      sectionCategory: "vocab",
      mondaiNumber: item.mondai,
      mondaiTitleJa: mondaiInfo.ja,
      mondaiTitleId: mondaiInfo.id,
      questionNumberLabel: `問題${item.mondai} - 問${item.num}`,
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2023N1OfficialPdf",
        generator_version: "1.0",
        seed: 20230700 + item.num
      },
      review: { status: "approved" }
    };
  });
}

export function get2023N1GrammarReadingQuestions(): QuestionItem[] {
  return RAW_2023_N1_GRAMMAR_READING.map((item) => {
    const mondaiInfo = GRAMMAR_READING_N1_MONDAI_LABELS[item.mondai];
    return {
      id: `2023-n1-gr-${item.num}`,
      level: "N1",
      type: item.mondai <= 7 ? "G3_PARTICLES" : "G4_CONTEXT_VOCAB",
      sectionCategory: "grammar_reading",
      mondaiNumber: item.mondai,
      mondaiTitleJa: mondaiInfo.ja,
      mondaiTitleId: mondaiInfo.id,
      questionNumberLabel: `問題${item.mondai} - 問${item.num}`,
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      isStarQuestion: item.isStarQuestion,
      passageHtml: item.passageHtml,
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2023N1OfficialPdf",
        generator_version: "1.0",
        seed: 20230800 + item.num
      },
      review: { status: "approved" }
    };
  });
}

export function get2023N1ListeningQuestions(): QuestionItem[] {
  return RAW_2023_N1_LISTENING.map((item) => {
    const mondaiInfo = LISTENING_N1_MONDAI_LABELS[item.mondai];
    return {
      id: `2023-n1-listen-${item.num}`,
      level: "N1",
      type: "G4_CONTEXT_VOCAB",
      sectionCategory: "listening",
      mondaiNumber: item.mondai,
      mondaiTitleJa: mondaiInfo.ja,
      mondaiTitleId: mondaiInfo.id,
      questionNumberLabel: `聴解 問題${item.mondai} - ${item.questionLabelJa}`,
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      audioText: item.audioText,
      dialogueScript: item.dialogueScript,
      passageHtml: item.passageHtml,
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2023N1OfficialPdf",
        generator_version: "1.0",
        seed: 20230900 + item.num
      },
      review: { status: "approved" }
    };
  });
}

/**
 * Membangun objek MockTest untuk 2023年7月 日本語能力試験 N1（公式過去問・全96問・165分）
 * - 第1部：言語知識（文字・語彙） (30分 • 25問: 問題1〜4)
 * - 第2部：言語知識（文法）・読解 (80分 • 41問: 問題5〜13)
 * - 第3部：聴解 (55分 • 30問: 問題1〜5)
 * - 合格点：100 / 180点（基準点：言語知識・読解 38/120点、聴解 19/60点）
 */
export function generateOfficial2023N1MockTest(): MockTest {
  return {
    id: 20231,
    title: "日本語能力試験 N1 模擬テスト (Simulasi 2023)",
    subtitle:
      "25 文字・語彙（用法付） • 41 文法・読解（一生の仕事・カタクリとアリ・ロボピーと心・メモA/B・教育論・木原市運動教室） • 30 聴解（統合理解付）",
    badgeLabel: "Simulasi N1 • 96問",
    isOfficialPastPaper: true,
    officialYear: "2023年7月",
    level: 1,
    levelLabel: "N1",
    difficulty: "standard",
    difficultyLabel: "Standar",
    totalDurationMinutes: 165,
    totalQuestions: 96,
    passingScoreTotal: 100,
    passingScoreLangReading: 38,
    passingScoreListening: 19,
    mock_sections: [
      {
        id: 2023101,
        mock_test_id: 20231,
        position: 1,
        category: "vocab",
        duration_minutes: 30,
        mock_questions_count: 25,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: 2023102,
        mock_test_id: 20231,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 80,
        mock_questions_count: 41,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: 2023103,
        mock_test_id: 20231,
        position: 3,
        category: "listening",
        duration_minutes: 55,
        mock_questions_count: 30,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ]
  };
}
