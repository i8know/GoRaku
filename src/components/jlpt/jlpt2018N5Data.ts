import { QuestionItem, QuestionDialogueTurn } from "../../lib/questionPack";
import { JLPTLevel, SectionCategory } from "./types";

interface Raw2018VocabItem {
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

const VOCAB_MONDAI_LABELS: Record<1 | 2 | 3 | 4, { ja: string; id: string }> = {
  1: {
    ja: "もんだい 1：＿＿＿のことばは ひらがなで どう かきますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 1 — Bacaan Kanji (Pilih bacaan hiragana yang tepat untuk kata bergaris bawah)"
  },
  2: {
    ja: "もんだい 2：＿＿＿のことばは どう かきますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 2 — Penulisan Kanji & Katakana (Pilih penulisan yang tepat untuk kata bergaris bawah)"
  },
  3: {
    ja: "もんだい 3：（　）に なにが はいりますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 3 — Kosakata Kontekstual (Pilih kata yang tepat untuk mengisi tanda kurung)"
  },
  4: {
    ja: "もんだい 4：＿＿＿の ぶんと だいたい おなじ いみの ぶんが あります。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 4 — Sinonim & Parafrasa Kalimat (Pilih kalimat yang maknanya paling mendekati)"
  }
};

const RAW_2018_N5_VOCAB: Raw2018VocabItem[] = [
  // もんだい 1 (Soal 1 - 12)
  {
    num: 1,
    mondai: 1,
    prompt: "あしたは <u>雨</u>ですか。",
    options: ["ゆき", "あめ", "くもり", "はれ"],
    correctIndex: 1,
    targetWord: "雨",
    reading: "あめ",
    meaningEn: "rain",
    translationId: "Apakah besok hujan?",
    notes: "雨 dibaca あめ (hujan). ゆき = 雪 (salju), くもり = 曇り (mendung), はれ = 晴れ (cerah)."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "きょうしつで <u>書いて</u> ください。",
    options: ["はいて", "きいて", "かいて", "ひいて"],
    correctIndex: 2,
    targetWord: "書いて",
    reading: "かいて",
    meaningEn: "to write (te-form)",
    translationId: "Tolong tulis di dalam kelas.",
    notes: "書く (かく - menulis) berubah menjadi 書いて (かいて) dalam bentuk て. きいて = 聞いて (mendengar)."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "しゃしんは はこの <u>中</u>に あります。",
    options: ["よこ", "なか", "そと", "そば"],
    correctIndex: 1,
    targetWord: "中",
    reading: "なか",
    meaningEn: "inside; middle",
    translationId: "Fotonya ada di dalam kotak.",
    notes: "中 sebagai kata posisi dibaca なか (di dalam). よこ = 横 (samping), そと = 外 (luar), そば = 側 (dekat)."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "この いすは <u>小さい</u>です。",
    options: ["しいさい", "しさい", "ちいさい", "ちさい"],
    correctIndex: 2,
    targetWord: "小さい",
    reading: "ちいさい",
    meaningEn: "small; little",
    translationId: "Kursi ini kecil.",
    notes: "Perhatikan vokal panjang い pada 小さい (ちいさい), bukan ちさい."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "あしたは <u>火よう日</u>です。",
    options: ["かようび", "どようび", "すいようび", "にちようび"],
    correctIndex: 0,
    targetWord: "火よう日",
    reading: "かようび",
    meaningEn: "Tuesday",
    translationId: "Besok adalah hari Selasa.",
    notes: "火曜日 (かようび) = Selasa. 土曜日 (どようび) = Sabtu, 水曜日 (すいようび) = Rabu, 日曜日 (にちようび) = Minggu."
  },
  {
    num: 6,
    mondai: 1,
    prompt: "きれいな <u>空</u>ですね。",
    options: ["にわ", "うみ", "そら", "いえ"],
    correctIndex: 2,
    targetWord: "空",
    reading: "そら",
    meaningEn: "sky",
    translationId: "Langit yang indah, ya.",
    notes: "空 dibaca そら (langit). にわ = 庭 (halaman), うみ = 海 (laut), いえ = 家 (rumah)."
  },
  {
    num: 7,
    mondai: 1,
    prompt: "せいとが <u>百人</u> います。",
    options: ["びゃくじん", "びゃくにん", "ひゃくじん", "ひゃくにん"],
    correctIndex: 3,
    targetWord: "百人",
    reading: "ひゃくにん",
    meaningEn: "one hundred people",
    translationId: "Ada seratus orang murid.",
    notes: "百 dibaca ひゃく (bukan びゃく saat berdiri sendiri), dan kata bantu bilangan orang adalah ～にん (人)."
  },
  {
    num: 8,
    mondai: 1,
    prompt: "<u>魚</u>が たくさん いますよ。",
    options: ["さかな", "いぬ", "とり", "ねこ"],
    correctIndex: 0,
    targetWord: "魚",
    reading: "さかな",
    meaningEn: "fish",
    translationId: "Ada banyak ikan, lho.",
    notes: "魚 dibaca さかな (ikan). いぬ = 犬 (anjing), とり = 鳥 (burung), ねこ = 猫 (kucing)."
  },
  {
    num: 9,
    mondai: 1,
    prompt: "パンを <u>半分</u> ともだちに あげました。",
    options: ["ほんふん", "ほんぶん", "はんふん", "はんぶん"],
    correctIndex: 3,
    targetWord: "半分",
    reading: "はんぶん",
    meaningEn: "half",
    translationId: "Saya memberikan setengah roti kepada teman.",
    notes: "半分 mengalami rendaku dari ふん menjadi ぶん → はんぶん (setengah)."
  },
  {
    num: 10,
    mondai: 1,
    prompt: "ぎんこうと スーパーの <u>間</u>に ほそい みちが あります。",
    options: ["あいた", "あいだ", "どなり", "となり"],
    correctIndex: 1,
    targetWord: "間",
    reading: "あいだ",
    meaningEn: "between; space",
    translationId: "Di antara bank dan supermarket ada jalan sempit.",
    notes: "間 dibaca あいだ (di antara) dengan dakuten pada だ. となり = 隣 (sebelah)."
  },
  {
    num: 11,
    mondai: 1,
    prompt: "たまごを <u>三つ</u> とって ください。",
    options: ["みっつ", "いつつ", "さんつ", "ごつ"],
    correctIndex: 0,
    targetWord: "三つ",
    reading: "みっつ",
    meaningEn: "three (things)",
    translationId: "Tolong ambilkan tiga butir telur.",
    notes: "Hitungan benda umum asli Jepang (つ): 一つ(ひとつ), 二つ(ふたつ), 三つ(みっつ), 四つ(よっつ), 五つ(いつつ)."
  },
  {
    num: 12,
    mondai: 1,
    prompt: "きょうは <u>天気</u>が いいですね。",
    options: ["げんき", "けんき", "でんき", "てんき"],
    correctIndex: 3,
    targetWord: "天気",
    reading: "てんき",
    meaningEn: "weather",
    translationId: "Hari ini cuacanya bagus, ya.",
    notes: "天気 dibaca てんき (cuaca). Jangan tertukar dengan 元気 (げんき = sehat) atau 電気 (でんき = listrik)."
  },

  // もんだい 2 (Soal 13 - 20)
  {
    num: 13,
    mondai: 2,
    prompt: "この <u>わいしゃつ</u>を ください。",
    options: ["ワイシャソ", "ワイシャツ", "ウイシャソ", "ウイシャツ"],
    correctIndex: 1,
    targetWord: "ワイシャツ",
    reading: "わいしゃつ",
    meaningEn: "dress shirt; business shirt",
    translationId: "Tolong berikan kemeja ini.",
    notes: "Perbedaan visual Katakana ツ (tsu) dan ソ (so), serta ワ (wa) dan ウ (u): ワイシャツ."
  },
  {
    num: 14,
    mondai: 2,
    prompt: "わたしの くには <u>かわ</u>が おおいです。",
    options: ["川", "木", "山", "花"],
    correctIndex: 0,
    targetWord: "川",
    reading: "かわ",
    meaningEn: "river",
    translationId: "Di negara saya banyak sungai.",
    notes: "川 = かわ (sungai), 木 = き (pohon), 山 = やま (gunung), 花 = はな (bunga)."
  },
  {
    num: 15,
    mondai: 2,
    prompt: "ヤンさんの <u>がっこう</u>は どこですか。",
    options: ["字校", "学枚", "字枚", "学校"],
    correctIndex: 3,
    targetWord: "学校",
    reading: "がっこう",
    meaningEn: "school",
    translationId: "Sekolah Saudara Yan di mana?",
    notes: "学校 (がっこう): perhatikan radikal anak 子 pada 学 (bukan 字) dan 交 pada 校 (bukan 枚)."
  },
  {
    num: 16,
    mondai: 2,
    prompt: "この ざっしを <u>みて</u> ください。",
    options: ["見て", "買て", "目て", "貝て"],
    correctIndex: 0,
    targetWord: "見て",
    reading: "みて",
    meaningEn: "to look; to see (te-form)",
    translationId: "Tolong lihat majalah ini.",
    notes: "見る (みる) → 見て (みて). Jangan tertukar dengan 目 (め = mata) atau 貝 (かい = kerang)."
  },
  {
    num: 17,
    mondai: 2,
    prompt: "この カメラは <u>たかい</u>ですね。",
    options: ["古い", "新い", "高い", "安い"],
    correctIndex: 2,
    targetWord: "高い",
    reading: "たかい",
    meaningEn: "expensive; high",
    translationId: "Kamera ini mahal, ya.",
    notes: "高い = たかい (mahal/tinggi). 古い = ふるい (lama), 新しい = あたらしい (baru), 安い = やすい (murah)."
  },
  {
    num: 18,
    mondai: 2,
    prompt: "きのうは <u>かいしゃ</u>を やすみました。",
    options: ["公仕", "会仕", "公社", "会社"],
    correctIndex: 3,
    targetWord: "会社",
    reading: "かいしゃ",
    meaningEn: "company; office",
    translationId: "Kemarin saya libur kerja (perusahaan).",
    notes: "会社 (かいしゃ) = perusahaan. Perhatikan pasangan kanji 会 (bertemu) + 社 (perusahaan/kuil)."
  },
  {
    num: 19,
    mondai: 2,
    prompt: "まだ <u>いわないで</u> ください。",
    options: ["立わないで", "行わないで", "言わないで", "食わないで"],
    correctIndex: 2,
    targetWord: "言わないで",
    reading: "いわないで",
    meaningEn: "please do not say",
    translationId: "Tolong jangan katakan dulu.",
    notes: "言う (いう - berkata) bentuk ない menjadi 言わない → 言わないでください."
  },
  {
    num: 20,
    mondai: 2,
    prompt: "<u>らいげつ</u> けっこんします。",
    options: ["今月", "来月", "今週", "来週"],
    correctIndex: 1,
    targetWord: "来月",
    reading: "らいげつ",
    meaningEn: "next month",
    translationId: "Bulan depan saya akan menikah.",
    notes: "来月 (らいげつ) = bulan depan. 今月 (こんげつ) = bulan ini, 来週 (らいしゅう) = minggu depan."
  },

  // もんだい 3 (Soal 21 - 30)
  {
    num: 21,
    mondai: 3,
    prompt: "わたしの へやは この アパートの 2（　★　）です。",
    options: ["ほん", "だい", "さつ", "かい"],
    correctIndex: 3,
    targetWord: "かい（階）",
    reading: "かい",
    meaningEn: "floor; story of a building",
    translationId: "Kamar saya ada di lantai 2 apartemen ini.",
    notes: "～階 (かい) adalah kata bantu bilangan untuk lantai gedung. ほん = benda panjang, だい = mesin/kendaraan, さつ = buku."
  },
  {
    num: 22,
    mondai: 3,
    prompt: "その ナイフで りんごを（　★　）ください。",
    options: ["しめて", "おきて", "きって", "つけて"],
    correctIndex: 2,
    targetWord: "きって（切って）",
    reading: "きって",
    meaningEn: "to cut (te-form)",
    translationId: "Tolong potong apel dengan pisau itu.",
    notes: "ナイフで りんごを 切る (きる → きって) = memotong apel dengan pisau."
  },
  {
    num: 23,
    mondai: 3,
    prompt: "（　★　）を わすれましたから、じかんが わかりません。",
    options: ["じしょ", "とけい", "ちず", "さいふ"],
    correctIndex: 1,
    targetWord: "とけい（時計）",
    reading: "とけい",
    meaningEn: "watch; clock",
    translationId: "Karena lupa membawa jam, saya tidak tahu waktu.",
    notes: "Petunjuk konteks: じかんが わかりません (tidak tahu waktu) → 時計 (とけい = jam)."
  },
  {
    num: 24,
    mondai: 3,
    prompt: "わたしの うちは えきに ちかいですから、（　★　）です。",
    options: ["じょうぶ", "へた", "いっぱい", "べんり"],
    correctIndex: 3,
    targetWord: "べんり（便利）",
    reading: "べんり",
    meaningEn: "convenient; handy",
    translationId: "Karena rumah saya dekat dengan stasiun, sangat praktis.",
    notes: "えきに ちかい (dekat stasiun) → べんり (便利 = praktis). じょうぶ = kuat/kokoh, へた = tidak mahir."
  },
  {
    num: 25,
    mondai: 3,
    prompt: "なつやすみは まいにち（　★　）で およぎました。",
    options: ["プール", "レストラン", "ビル", "エレベーター"],
    correctIndex: 0,
    targetWord: "プール",
    reading: "ぷーる",
    meaningEn: "swimming pool",
    translationId: "Saat liburan musim panas setiap hari saya berenang di kolam renang.",
    notes: "およぎました (berenang) berpasangan dengan プール (kolam renang)."
  },
  {
    num: 26,
    mondai: 3,
    prompt: "しらない ことばが ありましたから、せんせいに（　★　）しました。",
    options: ["しつもん", "じゅぎょう", "べんきょう", "れんしゅう"],
    correctIndex: 0,
    targetWord: "しつもん（質問）",
    reading: "しつもん",
    meaningEn: "question",
    translationId: "Karena ada kosakata yang tidak saya ketahui, saya bertanya kepada guru.",
    notes: "せんせいに 質問（しつもん）します = bertanya kepada guru."
  },
  {
    num: 27,
    mondai: 3,
    prompt: "この へやは あついですから、（　★　）を あけましょう。",
    options: ["おふろ", "まど", "エアコン", "テーブル"],
    correctIndex: 1,
    targetWord: "まど（窓）",
    reading: "まど",
    meaningEn: "window",
    translationId: "Karena ruangan ini panas, mari kita buka jendelanya.",
    notes: "Kata kerja あけます (membuka) berpasangan dengan まど (jendela). Jika エアコン digunakan kata kerja つけます."
  },
  {
    num: 28,
    mondai: 3,
    prompt: "きのうは がっこうで たくさん かんじを（　★　）。",
    options: ["おぼえました", "こまりました", "もちました", "うりました"],
    correctIndex: 0,
    targetWord: "おぼえました（覚えました）",
    reading: "おぼえました",
    meaningEn: "memorized; learned",
    translationId: "Kemarin di sekolah saya menghafal banyak kanji.",
    notes: "かんじを 覚える（おぼえる）= menghafal/mengingat kanji."
  },
  {
    num: 29,
    mondai: 3,
    prompt: "この コーヒーは、さとうを たくさん いれましたから、（　★　）です。",
    options: ["からい", "あまい", "まるい", "わかい"],
    correctIndex: 1,
    targetWord: "あまい（甘い）",
    reading: "あまい",
    meaningEn: "sweet",
    translationId: "Kopi ini manis karena diberi banyak gula.",
    notes: "さとうを たくさん いれました (memasukkan banyak gula) → あまい (manis). からい = pedas/asin."
  },
  {
    num: 30,
    mondai: 3,
    prompt: "つよい かぜが（　★　）います。",
    options: ["いそいで", "はしって", "とんで", "ふいて"],
    correctIndex: 3,
    targetWord: "ふいて（吹いて）",
    reading: "ふいて",
    meaningEn: "to blow (wind)",
    translationId: "Angin kencang sedang bertiup.",
    notes: "Kolokasi alami bahasa Jepang: 風が吹く（かぜが ふく → ふいています）= angin bertiup."
  },

  // もんだい 4 (Soal 31 - 35)
  {
    num: 31,
    mondai: 4,
    prompt: "<u>これは りょうしんの しゃしんです。</u>",
    options: [
      "これは あねと いもうとの しゃしんです。",
      "これは あにと おとうとの しゃしんです。",
      "これは ちちと ははの しゃしんです。",
      "これは そふと そぼの しゃしんです。"
    ],
    correctIndex: 2,
    targetWord: "りょうしん（両親）",
    reading: "りょうしん",
    meaningEn: "parents (father and mother)",
    translationId: "Ini adalah foto orang tua (ayah dan ibu) saya.",
    notes: "りょうしん（両親）berarti kedua orang tua = ちち（父）と はは（母）."
  },
  {
    num: 32,
    mondai: 4,
    prompt: "<u>この ダンスは やさしいです。</u>",
    options: [
      "この ダンスは かんたんです。",
      "この ダンスは たいへんです。",
      "この ダンスは たのしいです。",
      "この ダンスは つまらないです。"
    ],
    correctIndex: 0,
    targetWord: "やさしい（易しい）",
    reading: "やさしい",
    meaningEn: "easy; simple",
    translationId: "Tarian ini mudah (= かんたん).",
    notes: "やさしい（易しい）dalam konteks pelajaran/tarian berarti mudah = かんたん（簡単）."
  },
  {
    num: 33,
    mondai: 4,
    prompt: "<u>ふくを せんたくしました。</u>",
    options: [
      "ふくを きました。",
      "ふくを ぬぎました。",
      "ふくを わたしました。",
      "ふくを あらいました。"
    ],
    correctIndex: 3,
    targetWord: "せんたくしました（洗濯しました）",
    reading: "せんたく",
    meaningEn: "did the laundry; washed clothes",
    translationId: "Saya telah mencuci pakaian (= ふくを あらいました).",
    notes: "せんたくする（洗濯する）= mencuci pakaian = ふくを あらう（洗う）."
  },
  {
    num: 34,
    mondai: 4,
    prompt: "<u>この へやは くらいですね。</u>",
    options: [
      "この へやは あかるいですね。",
      "この へやは あかるくないですね。",
      "この へやは しずかですね。",
      "この へやは しずかじゃないですね。"
    ],
    correctIndex: 1,
    targetWord: "くらい（暗い）",
    reading: "くらい",
    meaningEn: "dark; dim",
    translationId: "Ruangan ini gelap, ya (= tidak terang / あかるくない).",
    notes: "くらい（暗い = gelap）sama maknanya dengan bentuk negatif antonimnya: あかるくない（明るくない = tidak terang）."
  },
  {
    num: 35,
    mondai: 4,
    prompt: "<u>リーさんは もりさんに ペンを かしました。</u>",
    options: [
      "リーさんは もりさんに ペンを かりました。",
      "もりさんは リーさんに ペンを かりました。",
      "リーさんは もりさんに ペンを もらいました。",
      "もりさんは リーさんに ペンを もらいました。"
    ],
    correctIndex: 1,
    targetWord: "かしました（貸しました）",
    reading: "かしました",
    meaningEn: "lent (vs. かりました borrowed)",
    translationId: "Saudara Lee meminjamkan pulpen kepada Saudara Mori (= Saudara Mori meminjam pulpen dari Saudara Lee).",
    notes: "Aは Bに かしました (A meminjamkan kepada B) ekuivalen dengan Bは Aに かりました (B meminjam dari A). Jangan pilih もらいました karena meminjam harus dikembalikan!"
  }
];

interface Raw2018GrammarReadingItem {
  num: number;
  mondai: 1 | 2 | 3 | 4 | 5 | 6;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  targetWord: string;
  reading: string;
  meaningEn: string;
  translationId: string;
  notes: string;
  passageTitle?: string;
  passageHtml?: string;
  isStarQuestion?: boolean;
}

const GRAMMAR_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6, { ja: string; id: string }> = {
  1: {
    ja: "もんだい 1：（　）に なにが はいりますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 1 — Tata Bahasa & Partikel Kalimat (Soal 1–16)"
  },
  2: {
    ja: "もんだい 2：★ に はいる ものは どれですか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 2 — Menyusun Kalimat Bintang ★ (Soal 17–21)"
  },
  3: {
    ja: "もんだい 3：22 から 26 に なにが はいりますか。ぶんしょうを よんで、1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 3 — Tata Bahasa dalam Wacana / ニンさん・メイさんのさくぶん (Soal 22–26)"
  },
  4: {
    ja: "もんだい 4：つぎの ぶんを よんで、しつもんに こたえて ください。こたえは 1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 4 — Pemahaman Bacaan Pendek / 短文読解 (Soal 27–29)"
  },
  5: {
    ja: "もんだい 5：つぎの ぶんを よんで、しつもんに こたえて ください。こたえは 1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 5 — Pemahaman Bacaan Menengah / 中文読解 (Soal 30–31)"
  },
  6: {
    ja: "もんだい 6：つぎの ひょうを みて、しつもんに こたえて ください。",
    id: "Mondai 6 — Pencarian Informasi Tabel Rute / 情報検索 (Soal 32)"
  }
};

const MONDAI_3_PASSAGE_HTML = `
<div class="space-y-4 text-left">
  <p class="text-xs font-semibold text-[#a06658]">ニンさんと メイさんが、「すきな みせ」の さくぶんを 書きました。</p>
  <div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-2">
    <div class="flex items-center justify-between border-b border-[#ece7de] pb-1.5">
      <span class="font-bold text-sm text-[#25231f]">① ニンさんの さくぶん</span>
      <span class="text-xs text-[#77736b]">ニン</span>
    </div>
    <p class="text-sm leading-loose font-['Noto_Serif_JP',serif]">
      私は、「さくら」と いう すし屋が すきです。すしは、私の 国にも あります。<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 22 】</span>、私の 国の すしより、日本の すしの ほうが おいしいです。「さくら」の すしは、やすいです。そして、とても おいしいです。土曜日と 日曜日は、人が おおいです。私と ともだちは、いつも 月曜日か 火曜日に 行きます。いい みせも ありますから、みなさんも、いい すし屋を 知って いたら、<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 23 】</span>。
    </p>
  </div>
  <div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-2">
    <div class="flex items-center justify-between border-b border-[#ece7de] pb-1.5">
      <span class="font-bold text-sm text-[#25231f]">② メイさんの さくぶん</span>
      <span class="text-xs text-[#77736b]">メイ</span>
    </div>
    <p class="text-sm leading-loose font-['Noto_Serif_JP',serif]">
      先週、学校の 近くの ハンバーガー屋に はじめて <span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 24 】</span>。とても きれいな みせでした。私は、その みせで、たまごサンドイッチと 野菜<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 25 】</span> スープを たのみました。どちらも おいしかったです。その みせには、いろいろな こうちゃが ありました。私は こうちゃが だいすきですから、つぎは こうちゃを <span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 26 】</span>。
    </p>
  </div>
</div>
`;

const MONDAI_4_Q27_HTML = `
<div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose">
  私は 毎朝、パンか ごはんを 食べてから、学校へ 行きます。でも、けさは 8時30分に 起きましたから、なにも 食べないで 学校へ 行きました。
</div>
`;

const MONDAI_4_Q28_HTML = `
<div class="space-y-2 text-left">
  <p class="text-xs font-semibold text-[#a06658]">（高見大学で）</p>
  <div class="p-4 rounded-xl bg-[#fffdfa] border-2 border-[#494740] space-y-2 font-['Noto_Serif_JP',serif]">
    <div class="font-bold text-sm border-b border-[#ece7de] pb-1">「日本語 1」の クラスの みなさんへ</div>
    <p class="text-sm leading-loose">
      今日、花田先生は お休みです。「日本語 1」の クラスは ありません。<br/>
      今日の しゅくだいは、来週の クラスで 出して ください。
    </p>
  </div>
</div>
`;

const MONDAI_4_Q29_HTML = `
<div class="space-y-2 text-left">
  <p class="text-xs font-semibold text-[#a06658]">会社の ボゴさんの つくえの 上に、この メモが あります。</p>
  <div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-2 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="font-bold">ボゴさん</div>
    <p>
      先週の日曜日に、中西さんが、山田さんの たんじょうびの プレゼントを 買って くれました。一人 400円です。<br/>
      中西さんは 今週 休みですから、私が あつめて、来週、中西さんに わたします。<br/>
      今週の 金曜日までに 400円 ください。よろしく おねがいします。
    </p>
    <div class="text-right text-xs text-[#595750]">11月28日　多田</div>
  </div>
</div>
`;

const MONDAI_5_PASSAGE_HTML = `
<div class="space-y-3 text-left">
  <p class="text-xs font-semibold text-[#a06658]">つぎは、留学生の チンさんが 書いた さくぶんです。</p>
  <div class="p-5 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-3 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="flex items-center justify-between border-b border-[#ece7de] pb-2">
      <span class="font-bold text-base">「まちがえました」</span>
      <span class="text-xs text-[#595750]">チン シュン</span>
    </div>
    <p>
      火曜日に、日本語学校で かんじの テストが ありました。私は、家で、かんじの ノートを 作って、月曜日の 夜まで たくさん べんきょうしました。
    </p>
    <p>
      火曜日の 朝、電車の中でも ノートを 見ました。テストの ことばが たくさん ありましたから、私は 一生懸命 おぼえました。<u>① 電車の 外を 見ませんでした</u>。
    </p>
    <p>
      いつも 7時35分に 学校の 近くの 駅で おりて、学校まで 5分 歩きます。火曜日も、7時35分に なりましたから、電車を おりました。でも、その 駅は、学校の 近くの 駅では ありませんでした。私は まちがえて、ちがう 電車に 乗りました。そこから 学校の 近くの 駅まで、電車で 30分 かかりました。
    </p>
    <p>
      学校に 8時15分に 着きました。テストは 8時10分から 8時40分まででした。でも、テストは やさしかったですから、20分で ぜんぶ 書きました。<u>② ほんとうに よかったです</u>。
    </p>
  </div>
</div>
`;

const MONDAI_6_ROUTE_TABLE_HTML = `
<div class="space-y-3 text-left">
  <div class="p-3.5 rounded-xl bg-[#f8ede9] border border-[#d95b43]/40 text-xs sm:text-sm leading-relaxed font-['Noto_Serif_JP',serif]">
    リンさんは 来週、高木大学へ 行きます。リンさんは <strong>花田駅</strong>か <strong>糸川駅</strong>から 行きます。<strong>500円ぐらい</strong>で 行きたいです。そして、<strong>いちばん みじかい 時間</strong>で 行きたいです。
  </div>
  <div class="overflow-x-auto rounded-xl border border-[#dcd7cc] bg-[#fffdfa]">
    <table class="w-full text-xs sm:text-sm font-['Noto_Serif_JP',serif] border-collapse">
      <thead>
        <tr class="bg-[#263d36] text-white">
          <th class="p-2.5 text-left border-r border-white/15">出発駅</th>
          <th class="p-2.5 text-center border-r border-white/15">行き方</th>
          <th class="p-2.5 text-left">ルート・時間・料金（高木大学まで）</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#ece7de]">
        <tr>
          <td class="p-3 font-bold bg-[#f9f7f2] border-r border-[#ece7de]" rowspan="2">花田駅</td>
          <td class="p-3 text-center font-bold border-r border-[#ece7de]">①</td>
          <td class="p-3">
            <span class="font-semibold">バス（30分・200円）</span> → 桜駅 → <span class="font-semibold">歩く（20分）</span> → 高木大学
            <span class="ml-2 px-2 py-0.5 rounded bg-[#f2eee6] text-[11px] font-bold">計 50分 / 200円</span>
          </td>
        </tr>
        <tr>
          <td class="p-3 text-center font-bold border-r border-[#ece7de]">②</td>
          <td class="p-3">
            <span class="font-semibold">電車（20分・300円）</span> → 山川駅 → <span class="font-semibold">タクシー（10分・800円）</span> → 高木大学
            <span class="ml-2 px-2 py-0.5 rounded bg-[#fcedea] text-[#943828] text-[11px] font-bold">計 30分 / 1,100円</span>
          </td>
        </tr>
        <tr>
          <td class="p-3 font-bold bg-[#f9f7f2] border-r border-[#ece7de]" rowspan="2">糸川駅</td>
          <td class="p-3 text-center font-bold border-r border-[#ece7de]">③</td>
          <td class="p-3">
            <span class="font-semibold">バス（20分・200円）</span> → 大山駅 → <span class="font-semibold">バス（35分・250円）</span> → 高木大学前 → <span class="font-semibold">歩く（5分）</span>
            <span class="ml-2 px-2 py-0.5 rounded bg-[#f2eee6] text-[11px] font-bold">計 60分 / 450円</span>
          </td>
        </tr>
        <tr class="bg-[#fffdf8]">
          <td class="p-3 text-center font-bold border-r border-[#ece7de]">④</td>
          <td class="p-3">
            <span class="font-semibold">電車（25分・430円）</span> → 緑駅 → <span class="font-semibold">歩く（10分）</span> → 高木大学
            <span class="ml-2 px-2 py-0.5 rounded bg-[#e8efec] text-[#233c35] text-[11px] font-bold">計 35分 / 430円</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
`;

const RAW_2018_N5_GRAMMAR_READING: Raw2018GrammarReadingItem[] = [
  // もんだい 1 (Soal 1 - 16)
  {
    num: 1,
    mondai: 1,
    prompt: "私は あしたの ひこうき（　★　）国へ 帰ります。",
    options: ["を", "か", "で", "に"],
    correctIndex: 2,
    targetWord: "で",
    reading: "で",
    meaningEn: "by means of (transport particle)",
    translationId: "Saya akan pulang ke negara dengan pesawat besok.",
    notes: "Partikel で menunjukkan alat transportasi yang digunakan (ひこうきで 帰ります)."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "先週 デパートで かばん（　★　）くつなどを 買いました。",
    options: ["や", "は", "も", "へ"],
    correctIndex: 0,
    targetWord: "や",
    reading: "や",
    meaningEn: "and (non-exhaustive listing with など)",
    translationId: "Minggu lalu di toserba saya membeli tas, sepatu, dan lain-lain.",
    notes: "Pola A や B など digunakan untuk menyebutkan beberapa contoh benda secara tidak lengkap."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "私は 毎朝 7時ごろ 家（　★　）出ます。",
    options: ["に", "が", "と", "を"],
    correctIndex: 3,
    targetWord: "を",
    reading: "を",
    meaningEn: "departure point particle (with 出ます)",
    translationId: "Setiap pagi sekitar pukul 7 saya keluar dari rumah.",
    notes: "Kata kerja keluar/meninggalkan tempat (出ます・おりる) menggunakan partikel を untuk titik keberangkatan: 家を出ます."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "きのう スーパーで 田中さん（　★　）会いました。",
    options: ["の", "を", "に", "で"],
    correctIndex: 2,
    targetWord: "に",
    reading: "に",
    meaningEn: "target person particle (with 会います)",
    translationId: "Kemarin di supermarket saya bertemu dengan Saudara Tanaka.",
    notes: "Bertemu seseorang menggunakan pola [Orang] に 会います (atau と 会います)."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "私の うちの ほんだなは、きょねん 父（　★　）作りました。",
    options: ["を", "が", "で", "や"],
    correctIndex: 1,
    targetWord: "が",
    reading: "が",
    meaningEn: "subject marker particle",
    translationId: "Rak buku di rumah saya dibuat oleh ayah tahun lalu.",
    notes: "Topik kalimat adalah ほんだなは, sedangkan subjek pelaku yang membuatnya adalah 父が (ayah yang membuat)."
  },
  {
    num: 6,
    mondai: 1,
    prompt: "今日 やおやで りんごを 買いました。五つ（　★　）1,000円でした。",
    options: ["で", "に", "や", "と"],
    correctIndex: 0,
    targetWord: "で",
    reading: "で",
    meaningEn: "for (total quantity/price scope)",
    translationId: "Hari ini saya membeli apel di toko sayur. Lima buah harganya 1.000 yen.",
    notes: "Partikel で setelah jumlah menyatakan total satuan: 五つで 1,000円 (untuk 5 buah totalnya 1.000 yen)."
  },
  {
    num: 7,
    mondai: 1,
    prompt: "きのう（　★　）少し 寒かったですが、今日（　★　）寒くないです。",
    options: ["に ／ に", "は ／ は", "も ／ も", "を ／ を"],
    correctIndex: 1,
    targetWord: "は ／ は",
    reading: "は",
    meaningEn: "contrastive topic marker",
    translationId: "Kemarin agak dingin, tetapi hari ini tidak dingin.",
    notes: "Membandingkan dua waktu yang kontras (きのう vs 今日) menggunakan partikel kontras は…は."
  },
  {
    num: 8,
    mondai: 1,
    prompt: "南町は、海が きれい（　★　）、静かです。",
    options: ["や", "と", "で", "も"],
    correctIndex: 2,
    targetWord: "で",
    reading: "で",
    meaningEn: "te-form of na-adjective (きれいで)",
    translationId: "Kota Minami lautnya indah dan tenang.",
    notes: "Kata sifat-na (きれい) disambung ke klausa berikutnya dengan mengubah だ menjadi で → きれいで、静かです."
  },
  {
    num: 9,
    mondai: 1,
    prompt: "前川「林さん、（　★　）に ある カメラは 林さんのですか。」<br/>林「ええ、そうです。」",
    options: ["そこ", "どこ", "その", "どの"],
    correctIndex: 0,
    targetWord: "そこ",
    reading: "そこ",
    meaningEn: "there (place pronoun before に)",
    translationId: "Maekawa: 'Saudara Hayashi, apakah kamera yang ada di situ milik Saudara Hayashi?'",
    notes: "Sebelum partikel lokasi に diperlukan kata ganti tempat (そこ), bukan その (yang harus langsung diikuti kata benda) atau どこ (kata tanya)."
  },
  {
    num: 10,
    mondai: 1,
    prompt: "A「先週 はじめて スキーを しました。」<br/>B「そうですか。（　★　）でしたか。」<br/>A「とても 楽しかったです。」",
    options: ["どちら", "どなた", "いくつ", "いかが"],
    correctIndex: 3,
    targetWord: "いかが",
    reading: "いかが",
    meaningEn: "how was it (polite form of どう)",
    translationId: "B: 'Begitu ya. Bagaimana kesannya?' A: 'Sangat menyenangkan.'",
    notes: "Jawaban A adalah とても楽しかったです (sangat menyenangkan), sehingga pertanyaannya menanyakan kesan/keadaan: いかがでしたか (bentuk sopan dari どうでしたか)."
  },
  {
    num: 11,
    mondai: 1,
    prompt: "森「ケンさん、大学の じゅぎょうは 始まりましたか。」<br/>ケン「いいえ、（　★　）です。来週 始まります。」",
    options: ["よく", "もう", "まだ", "ちょっと"],
    correctIndex: 2,
    targetWord: "まだ",
    reading: "まだ",
    meaningEn: "not yet",
    translationId: "Ken: 'Belum. Minggu depan baru mulai.'",
    notes: "Terhadap pertanyaan 'Sudah mulai?', jawaban negatif yang menyatakan 'belum' adalah いいえ、まだです."
  },
  {
    num: 12,
    mondai: 1,
    prompt: "（びょういんで）<br/>いしゃ「今日から 一週間 薬を 飲んで、来週の 月曜日に（　★　）来て ください。」",
    options: ["あまり", "また", "たくさん", "だんだん"],
    correctIndex: 1,
    targetWord: "また",
    reading: "また",
    meaningEn: "again",
    translationId: "Dokter: 'Minumlah obat selama seminggu mulai hari ini, lalu datanglah lagi hari Senin minggu depan.'",
    notes: "また来てください = silakan datang lagi."
  },
  {
    num: 13,
    mondai: 1,
    prompt: "父は 毎朝 コーヒーを（　★　）ながら 新聞を 読みます。",
    options: ["飲み", "飲む", "飲んで", "飲んだ"],
    correctIndex: 0,
    targetWord: "飲み",
    reading: "のみ",
    meaningEn: "while drinking (V-masu stem + ながら)",
    translationId: "Ayah setiap pagi membaca koran sambil minum kopi.",
    notes: "Pola ～ながら (sambil melakukan dua aksi bersamaan) menggunakan bentuk ます tanpa ます: 飲みます → 飲みながら."
  },
  {
    num: 14,
    mondai: 1,
    prompt: "私は 小さいとき、なっとうが 好き（　★　）でした。",
    options: ["ない", "じゃない", "ありません", "じゃありません"],
    correctIndex: 3,
    targetWord: "じゃありません",
    reading: "じゃありません",
    meaningEn: "was not (polite past negative of na-adjective)",
    translationId: "Waktu kecil saya tidak suka natto.",
    notes: "Bentuk lampau negatif sopan dari kata sifat-na 好き (すき) adalah 好きじゃありませんでした (atau 好きではありませんでした)."
  },
  {
    num: 15,
    mondai: 1,
    prompt: "（ケーキ屋で）<br/>店の人「いらっしゃいませ。」<br/>山下「すみません、いちごの ケーキを 二つ（　★　）。」",
    options: ["どうぞ", "ください", "ありますか", "ほしいですか"],
    correctIndex: 1,
    targetWord: "ください",
    reading: "ください",
    meaningEn: "please give me",
    translationId: "Yamashita: 'Permisi, minta dua kue stroberi.'",
    notes: "Saat memesan barang di toko menggunakan pola [Benda] を [Jumlah] ください."
  },
  {
    num: 16,
    mondai: 1,
    prompt: "リー「日曜日に、私の 家で アンさんと べんきょうを します。キムさんも（　★　）。」<br/>キム「はい、行きます。」",
    options: ["来ませんか", "来ませんでしたか", "来ていますか", "来ていましたか"],
    correctIndex: 0,
    targetWord: "来ませんか",
    reading: "きませんか",
    meaningEn: "won't you come? (invitation)",
    translationId: "Lee: 'Hari Minggu saya akan belajar bersama An di rumah saya. Maukah Kim datang juga?'",
    notes: "Mengajak seseorang dengan sopan menggunakan pola ～ませんか (来ませんか = Maukah datang?)."
  },

  // もんだい 2 ★ 並べ替え (Soal 17 - 21)
  {
    num: 17,
    mondai: 2,
    isStarQuestion: true,
    prompt: "A「すみません、どこに ゆうびんきょくが ありますか。」<br/>B「つぎの ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ まがって ください。」",
    options: ["を", "右", "に", "しんごう"],
    correctIndex: 1,
    targetWord: "右（しんごう → を → ★右 → に）",
    reading: "みぎ",
    meaningEn: "turn right at the next traffic light",
    translationId: "Beloklah ke kanan di lampu lalu lintas berikutnya.",
    notes: "Susunan lengkap: つぎの 【4.しんごう】【1.を】【★2.右】【3.に】 まがってください。 Kata pada posisi ★ adalah 2. 右."
  },
  {
    num: 18,
    mondai: 2,
    isStarQuestion: true,
    prompt: "私は 日曜日に 兄 ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ でかけました。",
    options: ["と", "いっしょに", "の", "子ども"],
    correctIndex: 0,
    targetWord: "と（の → 子ども → ★と → いっしょに）",
    reading: "と",
    meaningEn: "together with my older brother's child",
    translationId: "Pada hari Minggu saya pergi keluar bersama anak kakak laki-laki saya.",
    notes: "Susunan lengkap: 兄【3.の】【4.子ども】【★1.と】【2.いっしょに】 でかけました。 Kata pada posisi ★ adalah 1. と."
  },
  {
    num: 19,
    mondai: 2,
    isStarQuestion: true,
    prompt: "きのう 買った おかしは ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ でした。",
    options: ["色", "が", "きれい", "まるくて"],
    correctIndex: 1,
    targetWord: "が（まるくて → 色 → ★が → きれい）",
    reading: "が",
    meaningEn: "round and had a pretty color",
    translationId: "Kue yang saya beli kemarin bentuknya bulat dan warnanya indah.",
    notes: "Susunan lengkap: 【4.まるくて】【1.色】【★2.が】【3.きれい】でした。 Kata pada posisi ★ adalah 2. が."
  },
  {
    num: 20,
    mondai: 2,
    isStarQuestion: true,
    prompt: "駅の ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ で ざっしを 買いました。",
    options: ["近く", "本屋", "に", "ある"],
    correctIndex: 3,
    targetWord: "ある（近く → に → ★ある → 本屋）",
    reading: "ある",
    meaningEn: "bookstore located near the station",
    translationId: "Saya membeli majalah di toko buku yang ada di dekat stasiun.",
    notes: "Susunan lengkap: 駅の【1.近く】【3.に】【★4.ある】【2.本屋】で ざっしを 買いました。 Kata pada posisi ★ adalah 4. ある."
  },
  {
    num: 21,
    mondai: 2,
    isStarQuestion: true,
    prompt: "先週 ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ の こうちゃは とても おいしかったです。",
    options: ["外国", "に", "もらった", "ともだち"],
    correctIndex: 2,
    targetWord: "もらった（ともだち → に → ★もらった → 外国）",
    reading: "もらった",
    meaningEn: "foreign black tea received from a friend",
    translationId: "Teh hitam luar negeri yang saya terima dari teman minggu lalu sangat enak.",
    notes: "Susunan lengkap: 先週【4.ともだち】【2.に】【★3.もらった】【1.外国】の こうちゃは…。 Kata pada posisi ★ adalah 3. もらった."
  },

  // もんだい 3 文章の文法 (Soal 22 - 26)
  {
    num: 22,
    mondai: 3,
    passageTitle: "ニンさんと メイさんの「すきな みせ」の さくぶん",
    passageHtml: MONDAI_3_PASSAGE_HTML,
    prompt: "ぶんしょうの 【 22 】 に はいる いちばん いい ものは どれですか。",
    options: ["だから", "でも", "それから", "じゃあ"],
    correctIndex: 1,
    targetWord: "でも",
    reading: "でも",
    meaningEn: "however; but",
    translationId: "Sushi ada juga di negara saya. Akan tetapi (でも), sushi Jepang lebih enak daripada sushi di negara saya.",
    notes: "Kalimat sebelum dan sesudah 【22】 bersifat kontras (di negara saya ada sushi, TETAPI sushi Jepang lebih enak) → でも."
  },
  {
    num: 23,
    mondai: 3,
    passageTitle: "ニンさんと メイさんの「すきな みせ」の さくぶん",
    passageHtml: MONDAI_3_PASSAGE_HTML,
    prompt: "ぶんしょうの 【 23 】 に はいる いちばん いい ものは どれですか。",
    options: [
      "教えて います",
      "教えましたよ",
      "教えて ください",
      "教えましょうか"
    ],
    correctIndex: 2,
    targetWord: "教えて ください",
    reading: "おしえてください",
    meaningEn: "please tell me",
    translationId: "Jika teman-teman tahu restoran sushi yang bagus, tolong beri tahu saya (教えてください).",
    notes: "みなさんも、いい すし屋を 知っていたら、教えてください (tolong beri tahu saya)."
  },
  {
    num: 24,
    mondai: 3,
    passageTitle: "ニンさんと メイさんの「すきな みせ」の さくぶん",
    passageHtml: MONDAI_3_PASSAGE_HTML,
    prompt: "ぶんしょうの 【 24 】 に はいる いちばん いい ものは どれですか。",
    options: [
      "入ります",
      "入るでしょう",
      "入りました",
      "入って ください"
    ],
    correctIndex: 2,
    targetWord: "入りました",
    reading: "はいりました",
    meaningEn: "entered; went into (past tense)",
    translationId: "Minggu lalu untuk pertama kalinya saya masuk ke toko hamburger di dekat sekolah.",
    notes: "Keterangan waktu 先週 (minggu lalu) mengharuskan predikat bentuk lampau: 入りました."
  },
  {
    num: 25,
    mondai: 3,
    passageTitle: "ニンさんと メイさんの「すきな みせ」の さくぶん",
    passageHtml: MONDAI_3_PASSAGE_HTML,
    prompt: "ぶんしょうの 【 25 】 に はいる いちばん いい ものは どれですか。",
    options: ["の", "を", "で", "から"],
    correctIndex: 0,
    targetWord: "の（野菜のスープ）",
    reading: "の",
    meaningEn: "vegetable soup (noun modifier particle)",
    translationId: "Di toko itu saya memesan sandwich telur dan sup sayur (野菜のスープ).",
    notes: "Partikel の menghubungkan dua kata benda di mana kata benda pertama menerangkan jenis/bahan kata benda kedua: 野菜のスープ."
  },
  {
    num: 26,
    mondai: 3,
    passageTitle: "ニンさんと メイさんの「すきな みせ」の さくぶん",
    passageHtml: MONDAI_3_PASSAGE_HTML,
    prompt: "ぶんしょうの 【 26 】 に はいる いちばん いい ものは どれですか。",
    options: [
      "飲みました",
      "飲んで いました",
      "飲みに 行きました",
      "飲みに 行きます"
    ],
    correctIndex: 3,
    targetWord: "飲みに 行きます",
    reading: "のみにいきます",
    meaningEn: "will go to drink",
    translationId: "Karena saya sangat suka teh hitam, lain kali (つぎは) saya akan pergi untuk minum teh hitam.",
    notes: "Kata つぎは (lain kali / berikutnya) merujuk pada rencana masa depan, sehingga menggunakan bentuk non-lampau: 飲みに行きます."
  },

  // もんだい 4 短文読解 (Soal 27 - 29)
  {
    num: 27,
    mondai: 4,
    passageTitle: "短文読解 1（けさの あさごはん）",
    passageHtml: MONDAI_4_Q27_HTML,
    prompt: "けさ、学校へ 行く まえに、なにを 食べましたか。",
    options: [
      "パンか ごはんを 食べました。",
      "パンと ごはんを 食べました。",
      "なにも 食べませんでした。",
      "学校へ 行きませんでした。"
    ],
    correctIndex: 2,
    targetWord: "なにも 食べませんでした",
    reading: "なにもたべませんでした",
    meaningEn: "ate nothing this morning",
    translationId: "Pagi ini sebelum pergi ke sekolah makan apa? → Tidak makan apa-apa.",
    notes: "Teks menyatakan: 「でも、けさは 8時30分に 起きましたから、なにも 食べないで 学校へ 行きました。」(pergi ke sekolah tanpa makan apa pun)."
  },
  {
    num: 28,
    mondai: 4,
    passageTitle: "短文読解 2（高見大学の おしらせ）",
    passageHtml: MONDAI_4_Q28_HTML,
    prompt: "「日本語 1」の クラスの がくせいは、どう しなければ なりませんか。",
    options: [
      "今日 クラスが ありますから、しゅくだいを 出して ください。",
      "今日 クラスが ありますから、来週 しゅくだいを 出して ください。",
      "今日 クラスは ありませんが、今日 しゅくだいを 出して ください。",
      "今日 クラスは ありません。しゅくだいは 来週 出して ください。"
    ],
    correctIndex: 3,
    targetWord: "今日クラスはありません・来週出してください",
    reading: "らいしゅうだしてください",
    meaningEn: "No class today; submit homework next week",
    translationId: "Hari ini tidak ada kelas. PR-nya silakan dikumpulkan minggu depan.",
    notes: "Sesuai papan pengumuman: 「日本語 1」の クラスは ありません。今日の しゅくだいは、来週の クラスで 出して ください。"
  },
  {
    num: 29,
    mondai: 4,
    passageTitle: "短文読解 3（多田さんの メモ）",
    passageHtml: MONDAI_4_Q29_HTML,
    prompt: "この メモを 見て、ボゴさんは 今週の 金曜日までに なにを しますか。",
    options: [
      "中西さんに お金を もらいます。",
      "多田さんに お金を わたします。",
      "山田さんに プレゼントを わたします。",
      "多田さんと プレゼントを 買いに 行きます。"
    ],
    correctIndex: 1,
    targetWord: "多田さんに お金を わたします",
    reading: "たださんにおかねをわたします",
    meaningEn: "hand over 400 yen to Tada-san by Friday",
    translationId: "Menyerahkan uang (400 yen) kepada Saudara Tada paling lambat hari Jumat minggu ini.",
    notes: "Perhatikan pengirim memo di kanan bawah adalah 多田 (Tada): 「私が あつめて、来週、中西さんに わたします。今週の 金曜日までに 400円 ください。」 Jadi Bogo menyerahkan uang kepada Tada (opsi 2)!"
  },

  // もんだい 5 中文読解 (Soal 30 - 31)
  {
    num: 30,
    mondai: 5,
    passageTitle: "中文読解：チン シュン「まちがえました」",
    passageHtml: MONDAI_5_PASSAGE_HTML,
    prompt: "どうして <u>① 電車の 外を 見ませんでした</u> か。",
    options: [
      "漢字の ノートを 作って いたから",
      "漢字の ノートを さがして いたから",
      "漢字テストの べんきょうが したかったから",
      "漢字テストの 時間を まちがえたから"
    ],
    correctIndex: 2,
    targetWord: "漢字テストの べんきょうが したかったから",
    reading: "かんじてすとのべんきょうがしたかったから",
    meaningEn: "because Chin wanted to study for the kanji test on the train",
    translationId: "Karena ingin belajar untuk tes kanji (menghafal kosakata di buku catatan).",
    notes: "Paragraf 2: 「火曜日の 朝、電車の中でも ノートを 見ました。テストの ことばが たくさん ありましたから、私は 一生懸命 おぼえました。」"
  },
  {
    num: 31,
    mondai: 5,
    passageTitle: "中文読解：チン シュン「まちがえました」",
    passageHtml: MONDAI_5_PASSAGE_HTML,
    prompt: "どうして <u>② ほんとうに よかったです</u> と思いましたか。",
    options: [
      "テストの 前に 学校に 着いたから",
      "テストが ぜんぶ できたから",
      "電車に 乗る 時間を まちがえなかったから",
      "学校の 近くの 駅で おりたから"
    ],
    correctIndex: 1,
    targetWord: "テストが ぜんぶ できたから",
    reading: "てすとがぜんぶできたから",
    meaningEn: "because Chin was able to finish all the test questions in 20 minutes",
    translationId: "Karena berhasil mengerjakan seluruh soal tes (dalam 20 menit meskipun terlambat 5 menit).",
    notes: "Paragraf 4: 「でも、テストは やさしかったですから、20分で ぜんぶ 書きました。ほんとうに よかったです。」"
  },

  // もんだい 6 情報検索 (Soal 32)
  {
    num: 32,
    mondai: 6,
    passageTitle: "情報検索：高木大学への 行き方（ルート比較表）",
    passageHtml: MONDAI_6_ROUTE_TABLE_HTML,
    prompt: "リンさんは、どの 行き方で 行きますか。",
    options: ["①", "②", "③", "④"],
    correctIndex: 3,
    targetWord: "④（糸川駅 → 電車25分・430円 → 緑駅 → 歩く10分）",
    reading: "よんばん",
    meaningEn: "Route 4 (35 minutes total, 430 yen)",
    translationId: "Rute ④: dari Stasiun Itogawa naik kereta 25 menit (430 yen) ke Stasiun Midori lalu jalan kaki 10 menit (total 35 menit, 430 yen).",
    notes: "Syarat Lin-san: sekitar/di bawah 500 yen & waktu paling singkat. Rute ① = 50 mnt (200 yen), Rute ② = 30 mnt tapi 1.100 yen (melebihi 500 yen), Rute ③ = 60 mnt (450 yen), Rute ④ = 35 mnt & 430 yen. Maka ④ adalah jawaban yang tepat!"
  }
];

interface Raw2018ListeningItem {
  num: number;
  mondai: 1 | 2 | 3 | 4;
  questionNumberInMondai: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  sceneIllustration: string;
  dialogueScript: QuestionDialogueTurn[];
  targetWord: string;
  reading: string;
  meaningEn: string;
  translationId: string;
  notes: string;
}

const LISTENING_MONDAI_LABELS: Record<1 | 2 | 3 | 4, { ja: string; id: string }> = {
  1: {
    ja: "聴解 もんだい 1：まず しつもんを きいて ください。それから はなしを きいて、1から 4の なかから、いちばん いい ものを ひとつ えらんで ください。",
    id: "Choukai Mondai 1 — Pemahaman Tugas / 課題理解 (7 Soal)"
  },
  2: {
    ja: "聴解 もんだい 2：まず しつもんを きいて ください。そのあと、もんだいようしを みて ください。はなしを きいて、1から 4の なかから、いちばん いい ものを ひとつ えらんで ください。",
    id: "Choukai Mondai 2 — Pemahaman Poin Kunci / ポイント理解 (6 Soal)"
  },
  3: {
    ja: "聴解 もんだい 3：えを みて ながら しつもんを きいて ください。やじるし（➡）の ひとは なんと いいますか。1から 3の なかから、いちばん いい ものを ひとつ えらんで ください。",
    id: "Choukai Mondai 3 — Ungkapan Situasional / 発話表現 (5 Soal • 3 Pilihan)"
  },
  4: {
    ja: "聴解 もんだい 4：えなどが ありません。ぶんを きいて、1から 3の なかから、いちばん いい ものを ひとつ えらんで ください。",
    id: "Choukai Mondai 4 — Respons Cepat / 即時応答 (6 Soal • 3 Pilihan)"
  }
};

const RAW_2018_N5_LISTENING: Raw2018ListeningItem[] = [
  // ================= もんだい 1 (1 - 7) =================
  {
    num: 1,
    mondai: 1,
    questionNumberInMondai: 1,
    prompt: "1番：「きっさてん みどり」は どれですか。",
    options: [
      "1（駅のすぐ前の建物）",
      "2（交差点を右に曲がった所）",
      "3（交差点を左に曲がり、銀行のとなり）",
      "4（交差点をまっすぐ行った奥）"
    ],
    correctIndex: 2,
    sceneIllustration: "MAP_KISSATEN_MIDORI",
    dialogueScript: [
      { speaker: "女", text: "すみません。「きっさてん みどり」は どこですか。" },
      { speaker: "男", text: "「きっさてん みどり」ですか。あそこに こうさてんが ありますね。" },
      { speaker: "女", text: "はい。" },
      { speaker: "男", text: "あの こうさてんを ひだりに まがって ください。みちの ひだりがわに ぎんこうが あります。「きっさてん みどり」は ぎんこうの となりですよ。" },
      { speaker: "女", text: "わかりました。ありがとう ございます。" },
      { speaker: "質問", text: "「きっさてん みどり」は どれですか。" }
    ],
    targetWord: "こうさてんを ひだりに まがる・ぎんこうの となり",
    reading: "ぎんこうのとなり",
    meaningEn: "Turn left at the intersection; next to the bank (Building 3)",
    translationId: "Belok kiri di persimpangan, Kafe Midori ada di sebelah bank (Nomor 3).",
    notes: "Petunjuk arah: あの こうさてんを ひだりに まがってください (belok kiri di perempatan) → みちの ひだりがわに ぎんこうがあります (di sisi kiri jalan ada bank) → ぎんこうの となり (sebelah bank = 3)."
  },
  {
    num: 2,
    mondai: 1,
    questionNumberInMondai: 2,
    prompt: "2番：おとこの ひとが さがしている ざっしは どれですか。",
    options: [
      "1（『時計』7月号）",
      "2（『時計』8月号）",
      "3（『車』7月号）",
      "4（『車』8月号）"
    ],
    correctIndex: 0,
    sceneIllustration: "MAGAZINE_TOKEI_7",
    dialogueScript: [
      { speaker: "男", text: "すみません。この 車の ざっしの 7月号は ありますか。この たなには 8月号しか ありません。" },
      { speaker: "女", text: "ああ、7月号は もう ないんです。すみません。" },
      { speaker: "男", text: "そうですか。じゃあ、あのう、その 時計の ざっしを 見せて ください。" },
      { speaker: "女", text: "はい、どうぞ。8月号ですか。" },
      { speaker: "男", text: "いいえ、7月号です。ありがとう。" },
      { speaker: "質問", text: "おとこの ひとが さがしている ざっしは どれですか。" }
    ],
    targetWord: "時計の ざっしの 7月号",
    reading: "とけいのざっしのしちがつごう",
    meaningEn: "July issue of the Watch magazine (Option 1)",
    translationId: "Majalah Jam (時計) edisi bulan Juli (7月号).",
    notes: "Majalah mobil (車) edisi bulan 7 sudah habis, lalu pria itu meminta melihat majalah jam (時計) edisi bulan 7 (7月号 = 1)."
  },
  {
    num: 3,
    mondai: 1,
    questionNumberInMondai: 3,
    prompt: "3番：おんなの ひとは いつ 本を かえしますか。",
    options: [
      "1（3日・月曜日）",
      "2（7日・金曜日）",
      "3（9日・日曜日）",
      "4（10日・月曜日）"
    ],
    correctIndex: 3,
    sceneIllustration: "CALENDAR_LIBRARY_10",
    dialogueScript: [
      { speaker: "男", text: "川口さん、その 本、おもしろいですか。" },
      { speaker: "女", text: "ええ、とても おもしろいですよ。図書館で かりました。" },
      { speaker: "男", text: "私も 読みたいです。" },
      { speaker: "女", text: "来週の 金曜日に かえしますよ。" },
      { speaker: "男", text: "7日ですね。じゃあ、その あとで かりたいです。" },
      { speaker: "女", text: "あ、すみません。図書館は 4日から 9日まで 休みですね。じゃあ、その つぎの 日に かえします。" },
      { speaker: "男", text: "わかりました。" },
      { speaker: "質問", text: "おんなの ひとは いつ 本を かえしますか。" }
    ],
    targetWord: "9日の つぎの 日 ＝ 10日",
    reading: "とおか",
    meaningEn: "The 10th (the day after the library holiday from the 4th to the 9th)",
    translationId: "Tanggal 10 (karena perpustakaan tutup dari tanggal 4 sampai 9, ia mengembalikannya keesokan harinya).",
    notes: "Awalnya ingin mengembalikan tanggal 7 (Jumat), tetapi perpustakaan libur tanggal 4–9. 「その つぎの 日に かえします」= sehari setelah tanggal 9, yaitu tanggal 10 (opsi 4)."
  },
  {
    num: 4,
    mondai: 1,
    questionNumberInMondai: 4,
    prompt: "4番：おんなの ひとは なにを 買いますか。",
    options: [
      "1（たまご 1こ・ぎゅうにゅう 1ほん・魚）",
      "2（たまご 3こ・ぎゅうにゅう 1ほん・魚）",
      "3（たまご 1こ・ぎゅうにゅう 1ほん・肉）",
      "4（たまご 3こ・ぎゅうにゅう 1ほん・肉）"
    ],
    correctIndex: 1,
    sceneIllustration: "SHOPPING_EGGS3_MILK1_FISH",
    dialogueScript: [
      { speaker: "男", text: "今日、これから 料理を 作るから、スーパーで たまごと ぎゅうにゅうを 買って きて。" },
      { speaker: "女", text: "うん、いくつ？" },
      { speaker: "男", text: "たまごは 3こ。ぎゅうにゅうは 1ぽん。" },
      { speaker: "女", text: "わかった。ほかには？" },
      { speaker: "男", text: "うーん、魚も 買って きて。肉は あるから、いいよ。" },
      { speaker: "女", text: "わかった。" },
      { speaker: "質問", text: "おんなの ひとは なにを 買いますか。" }
    ],
    targetWord: "たまご 3こ・ぎゅうにゅう 1ぽん・魚",
    reading: "たまごさんこ・ぎゅうにゅういっぽん・さかな",
    meaningEn: "3 eggs, 1 carton of milk, and fish (Option 2)",
    translationId: "3 butir telur, 1 kotak susu, dan ikan (daging sudah ada di rumah).",
    notes: "Perhatikan kalimat akhir: 「魚も 買ってきて。肉は あるから、いいよ。」→ Beli ikan, tidak perlu beli daging (opsi 2)."
  },
  {
    num: 5,
    mondai: 1,
    questionNumberInMondai: 5,
    prompt: "5番：おんなの ひとは 来週、何よう日に テストを うけますか。",
    options: [
      "1（げつようび）",
      "2（かようび）",
      "3（すいようび）",
      "4（もくようび）"
    ],
    correctIndex: 0,
    sceneIllustration: "TEST_DAY_MONDAY",
    dialogueScript: [
      { speaker: "女", text: "先生、すみません。来週の 火曜日は びょういんへ 行きますから、学校を 休みます。" },
      { speaker: "男", text: "あ、火曜日は テストですよ。" },
      { speaker: "女", text: "すみません。水曜日か 木曜日に テストを うけても いいですか。" },
      { speaker: "男", text: "うーん、水曜日は、私が 学校に 来ません。木曜日は、テストの へやを つかう ことが できません。月曜日は どうですか。" },
      { speaker: "女", text: "はい、だいじょうぶです。おねがいします。" },
      { speaker: "質問", text: "おんなの ひとは 来週、何よう日に テストを うけますか。" }
    ],
    targetWord: "げつようび（月曜日）",
    reading: "げつようび",
    meaningEn: "Monday (Option 1)",
    translationId: "Hari Senin (げつようび).",
    notes: "Selasa ke rumah sakit, Rabu guru tidak datang, Kamis ruangan tidak bisa dipakai → disepakati hari Senin (月曜日 = 1)."
  },
  {
    num: 6,
    mondai: 1,
    questionNumberInMondai: 6,
    prompt: "6番：おとこの ひとの きょうしつは どこですか。",
    options: [
      "1（1かいの 1ばん）",
      "2（1かいの 3ばん）",
      "3（2かいの 2ばん）",
      "4（2かいの 4ばん）"
    ],
    correctIndex: 3,
    sceneIllustration: "CLASSROOM_2F_ROOM4",
    dialogueScript: [
      { speaker: "男", text: "すみません。今日から 日本語を べんきょうします。きょうしつは どこですか。" },
      { speaker: "女", text: "お名前を 教えて ください。" },
      { speaker: "男", text: "ミラーです。" },
      { speaker: "女", text: "ミラーさんは Cクラスですね。きょうしつは 1かいの 3ばん…… あ、すみません。Cクラスは きのうから 2かいの 4ばんに なりました。" },
      { speaker: "男", text: "はい、ありがとう ございます。" },
      { speaker: "質問", text: "おとこの ひとの きょうしつは どこですか。" }
    ],
    targetWord: "2かいの 4ばん",
    reading: "にかいのよんばん",
    meaningEn: "2nd floor, Room 4 (Option 4)",
    translationId: "Lantai 2 ruang nomor 4 (2かいの 4ばん).",
    notes: "Koreksi informasi di akhir: 「あ、すみません。Cクラスは きのうから 2かいの 4ばんに なりました。」(opsi 4)."
  },
  {
    num: 7,
    mondai: 1,
    questionNumberInMondai: 7,
    prompt: "7番：おとこの ひとは あした、なにを もって 行きますか。",
    options: [
      "1（おにぎり・おちゃ）",
      "2（おにぎり・おちゃ・カメラ）",
      "3（おにぎり・カメラ）",
      "4（おちゃ・カメラ）"
    ],
    correctIndex: 2,
    sceneIllustration: "ITEMS_ONIGIRI_CAMERA",
    dialogueScript: [
      { speaker: "女", text: "あしたは いっしょに 山へ 行きますね。おひるごはんは、どう しますか。" },
      { speaker: "男", text: "おにぎりを もって 行きます。" },
      { speaker: "女", text: "いいですね。じゃあ、おちゃと おかしは 私が もって 行きますね。" },
      { speaker: "男", text: "ありがとう ございます。あのう、カメラは ありますか。" },
      { speaker: "女", text: "いえ、もって いません。" },
      { speaker: "男", text: "じゃあ、私のを もって 行きますね。" },
      { speaker: "質問", text: "おとこの ひとは あした、なにを もって 行きますか。" }
    ],
    targetWord: "おにぎりと カメラ",
    reading: "おにぎりとかめら",
    meaningEn: "Rice balls (onigiri) and a camera (Option 3)",
    translationId: "Onigiri dan kamera (teh dan camilan dibawa oleh pihak wanita).",
    notes: "Pria membawa おにぎり dan カメラ miliknya (opsi 3), sedangkan おちゃ dan おかし dibawa oleh wanita."
  },

  // ================= もんだい 2 (8 - 13 / Q1 - Q6) =================
  {
    num: 8,
    mondai: 2,
    questionNumberInMondai: 1,
    prompt: "1番：おんなの ひとは なにで ジュースを 作りましたか。",
    options: [
      "1（りんごと みかん）",
      "2（りんごと みかんと ぎゅうにゅう）",
      "3（りんごと バナナと ぎゅうにゅう）",
      "4（りんごと みかんと バナナ）"
    ],
    correctIndex: 3,
    sceneIllustration: "JUICE_APPLE_ORANGE_BANANA",
    dialogueScript: [
      { speaker: "女", text: "今朝、家で くだものの ジュースを 作りました。どうぞ 飲んで ください。" },
      { speaker: "男", text: "ありがとう ございます。……わあ、おいしいですね。" },
      { speaker: "女", text: "りんごと みかんを 入れました。それから、バナナも。" },
      { speaker: "男", text: "ぎゅうにゅうも 入って いますか。" },
      { speaker: "女", text: "いいえ、ぎゅうにゅうは 入れて いません。" },
      { speaker: "質問", text: "おんなの ひとは なにで ジュースを 作りましたか。" }
    ],
    targetWord: "りんごと みかんと バナナ",
    reading: "りんごとみかんとばなな",
    meaningEn: "Apples, mandarin oranges, and bananas (no milk)",
    translationId: "Apel, jeruk mikan, dan pisang (tanpa susu).",
    notes: "「りんごと みかんを 入れました。それから、バナナも。」「いいえ、ぎゅうにゅうは 入れていません。」(opsi 4)."
  },
  {
    num: 9,
    mondai: 2,
    questionNumberInMondai: 2,
    prompt: "2番：おんなの ひとの きょうだいは 何人ですか。",
    options: [
      "1（ひとり — 兄 1人）",
      "2（ふたり）",
      "3（さんにん）",
      "4（よにん）"
    ],
    correctIndex: 0,
    sceneIllustration: "SIBLINGS_COUNT_1",
    dialogueScript: [
      { speaker: "女", text: "キムさんの かぞくの しゃしんですね。キムさんの となりの 人は お兄さんですか。" },
      { speaker: "男", text: "ええ。兄と、あねも 二人 います。山川さんは きょうだいは 何人ですか。" },
      { speaker: "女", text: "私は 兄が 一人だけです。" },
      { speaker: "男", text: "そうですか。" },
      { speaker: "質問", text: "おんなの ひとの きょうだいは 何人ですか。" }
    ],
    targetWord: "ひとり（兄が 一人だけ）",
    reading: "ひとり",
    meaningEn: "One sibling (one older brother)",
    translationId: "Satu orang saudara kandung (hanya satu kakak laki-laki).",
    notes: "Pertanyaan menanyakan saudara milik wanita (山川さん): 「私は 兄が 一人だけです。」→ ひとり (opsi 1)."
  },
  {
    num: 10,
    mondai: 2,
    questionNumberInMondai: 3,
    prompt: "3番：おとこの ひとは いつも なんで 駅まで 行きますか。",
    options: [
      "1（バス）",
      "2（タクシー）",
      "3（じてんしゃ）",
      "4（あるいて）"
    ],
    correctIndex: 2,
    sceneIllustration: "TRANSPORT_BICYCLE",
    dialogueScript: [
      { speaker: "女", text: "ヤンさんの 家は 駅から とおいですか。" },
      { speaker: "男", text: "ええ。歩いたら 30分ぐらい かかります。バスは 朝と 夕方は ありますが、昼は ありません。" },
      { speaker: "女", text: "ああ、不便ですね。" },
      { speaker: "男", text: "だから、いつも 自転車で 駅まで 行きます。雨の 日も タクシーには 乗りません。" },
      { speaker: "質問", text: "おとこの ひとは いつも なんで 駅まで 行きますか。" }
    ],
    targetWord: "自転車（じてんしゃ）",
    reading: "じてんしゃ",
    meaningEn: "By bicycle (Option 3)",
    translationId: "Dengan sepeda (自転車).",
    notes: "「だから、いつも 自転車で 駅まで 行きます。」(opsi 3)."
  },
  {
    num: 11,
    mondai: 2,
    questionNumberInMondai: 4,
    prompt: "4番：おんなの ひとは 日曜日に なにを しましたか。",
    options: [
      "1（家で DVDを 見た）",
      "2（えいがかんへ えいがを 見に 行った）",
      "3（外で テニスを した）",
      "4（ともだちの 家へ あそびに 行った）"
    ],
    correctIndex: 0,
    sceneIllustration: "SUNDAY_DVD_AT_HOME",
    dialogueScript: [
      { speaker: "男", text: "田中さん、日曜日は ともだちと テニスを しましたか。" },
      { speaker: "女", text: "あ、雨でしたから、テニスは しませんでした。" },
      { speaker: "男", text: "じゃあ、いっしょに えいがを 見に 行きましたか。" },
      { speaker: "女", text: "いいえ。ともだちが 私の 家へ あそびに 来ました。家で いっしょに DVDを 見ました。" },
      { speaker: "質問", text: "おんなの ひとは 日曜日に なにを しましたか。" }
    ],
    targetWord: "家で いっしょに DVDを 見ました",
    reading: "いえでディーブイディーをみました",
    meaningEn: "Watched a DVD at home with her friend (Option 1)",
    translationId: "Menonton DVD bersama teman di rumah.",
    notes: "Karena hujan tidak jadi bermain tenis dan tidak pergi ke bioskop; temannya datang ke rumahnya dan menonton DVD di rumah (opsi 1)."
  },
  {
    num: 12,
    mondai: 2,
    questionNumberInMondai: 5,
    prompt: "5番：おとこの ひとは きのう、電車に 何時間 乗りましたか。",
    options: [
      "1（3じかん）",
      "2（3じかんはん）",
      "3（4じかん）",
      "4（4じかんはん）"
    ],
    correctIndex: 1,
    sceneIllustration: "TRAIN_DURATION_3H30M",
    dialogueScript: [
      { speaker: "女", text: "きのうは 山田さんの 結婚式でしたね。" },
      { speaker: "男", text: "ええ。川口町の ホテルで ありました。" },
      { speaker: "女", text: "そうですか。ここから とおいですね。何時間ぐらい かかりましたか。" },
      { speaker: "男", text: "電車に 3時間半 乗りました。それから、駅から バスに 30分 乗りましたから、ぜんぶで 4時間 かかりました。" },
      { speaker: "女", text: "たいへんでしたね。" },
      { speaker: "質問", text: "おとこの ひとは きのう、電車に 何時間 乗りましたか。" }
    ],
    targetWord: "3じかんはん（3時間半）",
    reading: "さんじかんはん",
    meaningEn: "3 hours and a half on the train (Option 2)",
    translationId: "3 jam setengah (3じかんはん) naik kereta.",
    notes: "Perhatikan pertanyaannya spesifik menanyakan 電車に何時間乗りましたか (berapa jam naik kereta) → 3時間半 (opsi 2), bukan total 4 jam dengan bus."
  },
  {
    num: 13,
    mondai: 2,
    questionNumberInMondai: 6,
    prompt: "6番：ふたりは なにを 食べますか。",
    options: [
      "1（そば）",
      "2（ピザ）",
      "3（すし）",
      "4（カレー）"
    ],
    correctIndex: 1,
    sceneIllustration: "FLOOR_DIRECTORY_PIZZA",
    dialogueScript: [
      { speaker: "女", text: "おなかが すきましたね。この ビルで なにか 食べませんか。" },
      { speaker: "男", text: "いいですね。えーと、3かいに ピザの 店と カレーの 店が ありますね。" },
      { speaker: "女", text: "4かいには、そばと すしが ありますね。" },
      { speaker: "男", text: "私は、そばか ピザが いいです。きのうの 夜、カレーと すしを 食べましたから。" },
      { speaker: "女", text: "じゃあ、3かいの 店に 行きましょう。" },
      { speaker: "質問", text: "ふたりは なにを 食べますか。" }
    ],
    targetWord: "ピザ（3かいの店）",
    reading: "ぴざ",
    meaningEn: "Pizza on the 3rd floor (Option 2)",
    translationId: "Pizza (karena pria memilih soba atau pizza, lalu wanita mengajak ke toko lantai 3 yaitu toko pizza).",
    notes: "Pria ingin そば (lantai 4) atau ピザ (lantai 3). Wanita berkata: 「じゃあ、3かいの 店に 行きましょう。」 Di lantai 3 yang dipilih pria adalah ピザ (opsi 2)!"
  },

  // ================= もんだい 3 (14 - 18 / Q1 - Q5, 3 Opsi) =================
  {
    num: 14,
    mondai: 3,
    questionNumberInMondai: 1,
    prompt: "1番：ともだちが つかれて います。なんと いいますか。",
    options: [
      "1. すこし 休みました。",
      "2. すこし 休んで います。",
      "3. すこし 休みましょう。"
    ],
    correctIndex: 2,
    sceneIllustration: "SCENE_TIRED_FRIEND",
    dialogueScript: [
      { speaker: "アナウンス", text: "ともだちが つかれて います。なんと いいますか。" },
      { speaker: "男", text: "1. すこし 休みました。 2. すこし 休んで います。 3. すこし 休みましょう。" }
    ],
    targetWord: "すこし 休みましょう",
    reading: "すこしやすみましょう",
    meaningEn: "Let's rest a little (Option 3)",
    translationId: "Mari kita istirahat sebentar (すこし 休みましょう).",
    notes: "Mengajak teman yang sedang kelelahan untuk beristirahat bersama menggunakan bentuk ajakan ～ましょう: すこし 休みましょう (opsi 3)."
  },
  {
    num: 15,
    mondai: 3,
    questionNumberInMondai: 2,
    prompt: "2番：ともだちに チョコレートを あげます。なんと いいますか。",
    options: [
      "1. チョコレート、とても おいしかったです。",
      "2. チョコレート、いただきます。",
      "3. チョコレート、いかがですか。"
    ],
    correctIndex: 2,
    sceneIllustration: "SCENE_OFFER_CHOCOLATE",
    dialogueScript: [
      { speaker: "アナウンス", text: "ともだちに チョコレートを あげます。なんと いいますか。" },
      { speaker: "女", text: "1. チョコレート、とても おいしかったです。 2. チョコレート、いただきます。 3. チョコレート、いかがですか。" }
    ],
    targetWord: "チョコレート、いかがですか",
    reading: "ちょこれーといかがですか",
    meaningEn: "Would you like some chocolate? (Option 3)",
    translationId: "Mau cokelat? / Silakan cokelatnya (チョコレート、いかがですか).",
    notes: "Menawarkan makanan/minuman kepada orang lain menggunakan ungkapan ～、いかがですか (atau どうぞ)."
  },
  {
    num: 16,
    mondai: 3,
    questionNumberInMondai: 3,
    prompt: "3番：エレベーターに 乗りたいです。なんと いいますか。",
    options: [
      "1. あ、乗ります！",
      "2. どうぞ 乗って ください。",
      "3. 乗りませんか。"
    ],
    correctIndex: 0,
    sceneIllustration: "SCENE_ELEVATOR_BOARDING",
    dialogueScript: [
      { speaker: "アナウンス", text: "エレベーターに 乗りたいです。なんと いいますか。" },
      { speaker: "女", text: "1. あ、乗ります！ 2. どうぞ 乗って ください。 3. 乗りませんか。" }
    ],
    targetWord: "あ、乗ります！",
    reading: "あのります",
    meaningEn: "Oh, I'm getting on! (Option 1)",
    translationId: "Ah, saya mau ikut naik! (あ、乗ります！).",
    notes: "Saat berlari mendekati lift yang hendak tertutup agar ditunggu oleh orang di dalam lift, orang Jepang mengatakan: 「あ、乗ります！」(opsi 1)."
  },
  {
    num: 17,
    mondai: 3,
    questionNumberInMondai: 4,
    prompt: "4番：まえの 人が ポケットから さいふが おちそうです。なんと いいますか。",
    options: [
      "1. おとしましたよ。",
      "2. 危ないですよ。",
      "3. ざんねんですね。"
    ],
    correctIndex: 1,
    sceneIllustration: "SCENE_WALLET_FALLING",
    dialogueScript: [
      { speaker: "アナウンス", text: "まえの 人が ポケットから さいふが おちそうです。なんと いいますか。" },
      { speaker: "女", text: "1. おとしましたよ。 2. 危ないですよ。 3. ざんねんですね。" }
    ],
    targetWord: "危ないですよ（あぶないですよ）",
    reading: "あぶないですよ",
    meaningEn: "Watch out! / Careful, it's about to fall! (Option 2)",
    translationId: "Hati-hati / Bahaya lho (dompetnya hampir jatuh)!",
    notes: "Dompetnya baru *hampir* jatuh dari saku (まだおちていない), jadi memperingatkan dengan 「危ないですよ」(opsi 2), bukan おとしましたよ (sudah jatuh)."
  },
  {
    num: 18,
    mondai: 3,
    questionNumberInMondai: 5,
    prompt: "5番：きっさてんで コーヒーと サンドイッチを たのみましたが、コーヒーが まだ 来ません。店の 人に なんと いいますか。",
    options: [
      "1. コーヒーは ありませんか。",
      "2. コーヒーは まだですか。",
      "3. コーヒーは どうですか。"
    ],
    correctIndex: 1,
    sceneIllustration: "SCENE_CAFE_WAITING_COFFEE",
    dialogueScript: [
      { speaker: "アナウンス", text: "きっさてんで コーヒーと サンドイッチを たのみましたが、コーヒーが まだ 来ません。店の 人に なんと いいますか。" },
      { speaker: "男", text: "1. コーヒーは ありませんか。 2. コーヒーは まだですか。 3. コーヒーは どうですか。" }
    ],
    targetWord: "コーヒーは まだですか",
    reading: "こーひーはまだですか",
    meaningEn: "Is my coffee not ready yet? (Option 2)",
    translationId: "Apakah kopinya belum datang/siap? (コーヒーは まだですか).",
    notes: "Menanyakan pesanan yang belum datang kepada pelayan menggunakan 「～はまだですか」(opsi 2)."
  },

  // ================= もんだい 4 (19 - 24 / Q1 - Q6, 3 Opsi) =================
  {
    num: 19,
    mondai: 4,
    questionNumberInMondai: 1,
    prompt: "1番：「いつ 日本へ 来ましたか。」",
    options: [
      "1. 去年です。",
      "2. 1年間です。",
      "3. 5月までです。"
    ],
    correctIndex: 0,
    sceneIllustration: "AUDIO_RESPONSE",
    dialogueScript: [
      { speaker: "女", text: "いつ 日本へ 来ましたか。" },
      { speaker: "男", text: "1. 去年です。 2. 1年間です。 3. 5月までです。" }
    ],
    targetWord: "去年です（きょねんです）",
    reading: "きょねんです",
    meaningEn: "Last year (Option 1)",
    translationId: "Kapan datang ke Jepang? → Tahun lalu (去年です).",
    notes: "Pertanyaan いつ (kapan) + 来ましたか (lampau) dijawab dengan titik waktu lampau: 去年です (tahun lalu)."
  },
  {
    num: 20,
    mondai: 4,
    questionNumberInMondai: 2,
    prompt: "2番：「昼ごはんは もう 食べましたか。」",
    options: [
      "1. はい、食べませんでした。",
      "2. いいえ、食べました。",
      "3. いいえ、今からです。"
    ],
    correctIndex: 2,
    sceneIllustration: "AUDIO_RESPONSE",
    dialogueScript: [
      { speaker: "女", text: "昼ごはんは もう 食べましたか。" },
      { speaker: "男", text: "1. はい、食べませんでした。 2. いいえ、食べました。 3. いいえ、今からです。" }
    ],
    targetWord: "いいえ、今からです",
    reading: "いいえいまからです",
    meaningEn: "No, I'm about to eat now (Option 3)",
    translationId: "Apakah sudah makan siang? → Belum, baru mau makan sekarang (いいえ、今からです).",
    notes: "Terhadap pertanyaan もう～ましたか, jawaban negatif yang alami adalah 「いいえ、まだです」 atau 「いいえ、今からです」(opsi 3)."
  },
  {
    num: 21,
    mondai: 4,
    questionNumberInMondai: 3,
    prompt: "3番：「かわいい くつですね。どこで 買いましたか。」",
    options: [
      "1. デパートで 買いました。",
      "2. あの 店が いいですよ。",
      "3. 3,000円でした。"
    ],
    correctIndex: 0,
    sceneIllustration: "AUDIO_RESPONSE",
    dialogueScript: [
      { speaker: "男", text: "かわいい くつですね。どこで 買いましたか。" },
      { speaker: "女", text: "1. デパートで 買いました。 2. あの 店が いいですよ。 3. 3,000円でした。" }
    ],
    targetWord: "デパートで 買いました",
    reading: "でぱーとでかいました",
    meaningEn: "I bought them at the department store (Option 1)",
    translationId: "Sepatu yang manis ya. Beli di mana? → Saya membelinya di toserba.",
    notes: "どこで買いましたか (beli di mana) → デパートで買いました (opsi 1)."
  },
  {
    num: 22,
    mondai: 4,
    questionNumberInMondai: 4,
    prompt: "4番：「あしたは 何時の 飛行機に 乗りますか。」",
    options: [
      "1. 2時間半ぐらいです。",
      "2. 4時半の 飛行機です。",
      "3. 飛行機の ほうが 速いですよ。"
    ],
    correctIndex: 1,
    sceneIllustration: "AUDIO_RESPONSE",
    dialogueScript: [
      { speaker: "女", text: "あしたは 何時の 飛行機に 乗りますか。" },
      { speaker: "男", text: "1. 2時間半ぐらいです。 2. 4時半の 飛行機です。 3. 飛行機の ほうが 速いですよ。" }
    ],
    targetWord: "4時半の 飛行機です",
    reading: "よじはんのひこうきです",
    meaningEn: "The 4:30 flight (Option 2)",
    translationId: "Besok naik pesawat jam berapa? → Pesawat jam 4.30.",
    notes: "何時の飛行機 (pesawat jam berapa) → 4時半の飛行機です (opsi 2)."
  },
  {
    num: 23,
    mondai: 4,
    questionNumberInMondai: 5,
    prompt: "5番：「田中さんの 電話番号を 知って いますか。」",
    options: [
      "1. はい、わかりますよ。",
      "2. いいえ、ちがいます。",
      "3. いいえ、知りませんでした。"
    ],
    correctIndex: 0,
    sceneIllustration: "AUDIO_RESPONSE",
    dialogueScript: [
      { speaker: "男", text: "田中さんの 電話番号を 知って いますか。" },
      { speaker: "女", text: "1. はい、わかりますよ。 2. いいえ、ちがいます。 3. いいえ、知りませんでした。" }
    ],
    targetWord: "はい、わかりますよ",
    reading: "はいわかりますよ",
    meaningEn: "Yes, I know it (Option 1)",
    translationId: "Apakah tahu nomor telepon Saudara Tanaka? → Ya, saya tahu (はい、わかりますよ).",
    notes: "Jika negatif untuk 知っていますか harus いいえ、知りません (bukan 知りませんでした). Maka jawaban yang benar adalah 1: はい、わかりますよ."
  },
  {
    num: 24,
    mondai: 4,
    questionNumberInMondai: 6,
    prompt: "6番：「先週の 土曜日と 日曜日は どこかへ 行きましたか。」",
    options: [
      "1. はい、土曜日に 行きましょう。",
      "2. どこへも 行きませんでした。",
      "3. 日曜日が いいです。"
    ],
    correctIndex: 1,
    sceneIllustration: "AUDIO_RESPONSE",
    dialogueScript: [
      { speaker: "女", text: "先週の 土曜日と 日曜日は どこかへ 行きましたか。" },
      { speaker: "男", text: "1. はい、土曜日に 行きましょう。 2. どこへも 行きませんでした。 3. 日曜日が いいです。" }
    ],
    targetWord: "どこへも 行きませんでした",
    reading: "どこへもいきませんでした",
    meaningEn: "I didn't go anywhere (Option 2)",
    translationId: "Sabtu dan Minggu lalu apakah pergi ke suatu tempat? → Saya tidak pergi ke mana-mana.",
    notes: "どこかへ 行きましたか → dijawab dengan どこへも 行きませんでした (tidak pergi ke mana pun, opsi 2)."
  }
];

/**
 * Mengonversi seluruh 35 soal Kosakata (文字・語彙) 2018 JLPT N5 ke format QuestionItem.
 */
export function get2018N5VocabQuestions(): QuestionItem[] {
  return RAW_2018_N5_VOCAB.map((item) => {
    const label = VOCAB_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2018_n5_vocab_${String(item.num).padStart(2, "0")}`,
      type: item.mondai === 1 || item.mondai === 3 ? "G1_KANJI_READING" : "G2_KANJI_WRITING",
      level: "N5",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      officialSourceLabel: "2018年 日本語能力試験 N5 • 言語知識（文字・語彙）",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2018OfficialN5",
        generator_version: "2018.1",
        seed: 201800 + item.num,
        tatoeba_jpn_id: 2018100 + item.num,
        jmdict_ent_seq: `2018-V-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2018 N5"
      }
    };
  });
}

/**
 * Mengonversi seluruh 32 soal Tata Bahasa & Membaca (文法・読解) 2018 JLPT N5 ke format QuestionItem.
 */
export function get2018N5GrammarReadingQuestions(): QuestionItem[] {
  return RAW_2018_N5_GRAMMAR_READING.map((item) => {
    const label = GRAMMAR_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2018_n5_gr_${String(item.num).padStart(2, "0")}`,
      type: item.mondai <= 3 ? "G3_PARTICLES" : "G4_CONTEXT_VOCAB",
      level: "N5",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      passageTitle: item.passageTitle,
      passageHtml: item.passageHtml,
      isStarQuestion: item.isStarQuestion,
      officialSourceLabel: "2018年 日本語能力試験 N5 • 言語知識（文法）・読解",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2018OfficialN5",
        generator_version: "2018.1",
        seed: 201850 + item.num,
        tatoeba_jpn_id: 2018200 + item.num,
        jmdict_ent_seq: `2018-GR-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2018 N5"
      }
    };
  });
}

/**
 * Mengonversi seluruh 24 soal Mendengarkan (聴解) 2018 JLPT N5 ke format QuestionItem.
 */
export function get2018N5ListeningQuestions(): QuestionItem[] {
  return RAW_2018_N5_LISTENING.map((item) => {
    const label = LISTENING_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2018_n5_listen_${String(item.num).padStart(2, "0")}`,
      type: "G4_CONTEXT_VOCAB",
      level: "N5",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      dialogueScript: item.dialogueScript,
      sceneIllustration: item.sceneIllustration,
      officialSourceLabel: "2018年 日本語能力試験 N5 • 聴解",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2018OfficialN5",
        generator_version: "2018.1",
        seed: 201890 + item.num,
        tatoeba_jpn_id: 2018300 + item.num,
        jmdict_ent_seq: `2018-L-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2018 N5"
      }
    };
  });
}

/**
 * Bank Soal Kurasi Level N4, N3, N2, N1 agar semua tab level dapat dimainkan secara interaktif.
 */
const MULTI_LEVEL_CURATED_BANK: Record<Exclude<JLPTLevel, "N5">, QuestionItem[]> = {
  N4: [
    {
      id: "jlpt_n4_q01",
      type: "G1_KANJI_READING",
      level: "N4",
      mondaiNumber: 1,
      mondaiLabelJa: "もんだい 1：＿＿＿のことばの 読み方として 最もよいものを えらんでください。",
      mondaiLabelId: "Mondai 1 — Bacaan Kanji N4",
      prompt: "この <u>計画</u>は とても いいと 思います。",
      options: ["けいかく", "けいがく", "きかく", "きがく"],
      correctIndex: 0,
      explanation: {
        targetWord: "計画",
        reading: "けいかく",
        meaningEn: "plan; project",
        translationId: "Menurut saya rencana ini sangat bagus.",
        notes: "計画 dibaca けいかく (rencana)."
      },
      provenance: { generator: "jlptCuratedN4", generator_version: "1.0", seed: 401 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n4_q02",
      type: "G1_KANJI_READING",
      level: "N4",
      mondaiNumber: 1,
      mondaiLabelJa: "もんだい 1：＿＿＿のことばの 読み方として 最もよいものを えらんでください。",
      mondaiLabelId: "Mondai 1 — Bacaan Kanji N4",
      prompt: "電車の <u>都合</u>が 悪くて おくれました。",
      options: ["とごう", "つごう", "とあい", "つあい"],
      correctIndex: 1,
      explanation: {
        targetWord: "都合",
        reading: "つごう",
        meaningEn: "circumstances; convenience",
        translationId: "Saya terlambat karena kendala jadwal kereta.",
        notes: "都合 dibaca つごう (keadaan/jadwal)."
      },
      provenance: { generator: "jlptCuratedN4", generator_version: "1.0", seed: 402 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n4_q03",
      type: "G2_KANJI_WRITING",
      level: "N4",
      mondaiNumber: 2,
      mondaiLabelJa: "もんだい 2：＿＿＿のことばを 漢字で どう 書きますか。",
      mondaiLabelId: "Mondai 2 — Penulisan Kanji N4",
      prompt: "日本の <u>ぶんか</u>に きょうみが あります。",
      options: ["文化", "文花", "分化", "分花"],
      correctIndex: 0,
      explanation: {
        targetWord: "文化",
        reading: "ぶんか",
        meaningEn: "culture",
        translationId: "Saya tertarik pada budaya Jepang.",
        notes: "文化 (ぶんか) = budaya."
      },
      provenance: { generator: "jlptCuratedN4", generator_version: "1.0", seed: 403 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n4_q04",
      type: "G3_PARTICLES",
      level: "N4",
      mondaiNumber: 1,
      mondaiLabelJa: "もんだい 1：（　）に なにが はいりますか。",
      mondaiLabelId: "Mondai 1 — Tata Bahasa N4",
      prompt: "雨が 降って いますから、かさを 持って（　★　）ほうが いいですよ。",
      options: ["行った", "行く", "行って", "行かない"],
      correctIndex: 0,
      explanation: {
        targetWord: "行ったほうがいい",
        reading: "いったほうがいい",
        meaningEn: "had better take an umbrella",
        translationId: "Karena sedang hujan, sebaiknya kamu membawa payung.",
        notes: "Saran positif menggunakan bentuk た + ほうがいい: 持って行ったほうがいい."
      },
      provenance: { generator: "jlptCuratedN4", generator_version: "1.0", seed: 404 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n4_q05",
      type: "G4_CONTEXT_VOCAB",
      level: "N4",
      mondaiNumber: 4,
      mondaiLabelJa: "もんだい 4：つぎの ぶんを よんで、しつもんに こたえてください。",
      mondaiLabelId: "Mondai 4 — Pemahaman Bacaan N4",
      passageTitle: "社内メール：会議室の変更について",
      passageHtml: `<div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-sm font-['Noto_Serif_JP',serif] leading-loose">明日の午後2時からの営業会議は、第1会議室のエアコンが故障しているため、3階の第2会議室に変更します。資料は各自プリントして持参してください。</div>`,
      prompt: "どうして 会議室が 変わりましたか。",
      options: [
        "参加する人が 増えたから",
        "第1会議室の エアコンが こわれて いるから",
        "会議の 時間が 変わったから",
        "資料を コピーする 機械が ないから"
      ],
      correctIndex: 1,
      explanation: {
        targetWord: "エアコンが故障しているため",
        reading: "こしょうしているため",
        meaningEn: "Because the air conditioner in Conference Room 1 is out of order",
        translationId: "Karena AC di Ruang Rapat 1 sedang rusak (故障している).",
        notes: "故障（こしょう）＝ こわれている (rusak)."
      },
      provenance: { generator: "jlptCuratedN4", generator_version: "1.0", seed: 405 },
      review: { status: "approved" }
    }
  ],
  N3: [
    {
      id: "jlpt_n3_q01",
      type: "G1_KANJI_READING",
      level: "N3",
      mondaiNumber: 1,
      mondaiLabelJa: "問題 1：＿＿＿の言葉の読み方として最もよいものを一つ選びなさい。",
      mondaiLabelId: "Mondai 1 — Bacaan Kanji N3",
      prompt: "会議の <u>延期</u>が 決まった。",
      options: ["えんき", "ていき", "たんき", "ちょうき"],
      correctIndex: 0,
      explanation: {
        targetWord: "延期",
        reading: "えんき",
        meaningEn: "postponement; adjournment",
        translationId: "Penundaan rapat telah diputuskan.",
        notes: "延期（えんき）= penundaan jadwal."
      },
      provenance: { generator: "jlptCuratedN3", generator_version: "1.0", seed: 301 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n3_q02",
      type: "G3_PARTICLES",
      level: "N3",
      mondaiNumber: 1,
      mondaiLabelJa: "問題 1：（　）に入れるのに最もよいものを一つ選びなさい。",
      mondaiLabelId: "Mondai 1 — Tata Bahasa N3",
      prompt: "日本へ 来て（　★　）、毎日 自炊して います。",
      options: ["以来", "最中に", "おかげで", "せいで"],
      correctIndex: 0,
      explanation: {
        targetWord: "～て以来（いらい）",
        reading: "ていらい",
        meaningEn: "ever since coming to Japan",
        translationId: "Sejak datang ke Jepang, setiap hari saya memasak sendiri.",
        notes: "Pola V-て以来 menyatakan keadaan yang terus berlangsung sejak titik waktu di masa lalu hingga sekarang."
      },
      provenance: { generator: "jlptCuratedN3", generator_version: "1.0", seed: 302 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n3_q03",
      type: "G4_CONTEXT_VOCAB",
      level: "N3",
      mondaiNumber: 4,
      mondaiLabelJa: "問題 4：次の文章を読んで、後の問いに対する答えとして最もよいものを一つ選びなさい。",
      mondaiLabelId: "Mondai 4 — Dokkai N3",
      passageTitle: "図書館のリニューアル休館のお知らせ",
      passageHtml: `<div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-sm font-['Noto_Serif_JP',serif] leading-loose">市立図書館は、コンピューターシステムの更新工事のため、来月1日から10日まで休館いたします。休館中に本を返却される方は、正面玄関横の「返却ポスト」をご利用ください（ただしCD・DVDは破損防止のため開館後にカウンターへお持ちください）。</div>`,
      prompt: "休館中に CDを 返したい 人は どうしなければ なりませんか。",
      options: [
        "正面玄関横の 返却ポストに 入れる",
        "11日以降に 図書館の カウンターへ 持って 行く",
        "郵送で 図書館に 送る",
        "来月1日までに 必ず 返す"
      ],
      correctIndex: 1,
      explanation: {
        targetWord: "開館後にカウンターへお持ちください",
        reading: "かいかんごにかうんたーへ",
        meaningEn: "Bring CDs/DVDs to the counter after the library reopens (from the 11th)",
        translationId: "Membawanya ke loket perpustakaan setelah perpustakaan buka kembali (setelah tanggal 10).",
        notes: "CD・DVD tidak boleh dimasukkan ke kotak pengembalian (返却ポスト) agar tidak rusak."
      },
      provenance: { generator: "jlptCuratedN3", generator_version: "1.0", seed: 303 },
      review: { status: "approved" }
    }
  ],
  N2: [
    {
      id: "jlpt_n2_q01",
      type: "G1_KANJI_READING",
      level: "N2",
      mondaiNumber: 1,
      mondaiLabelJa: "問題 1：＿＿＿の言葉の読み方として最もよいものを一つ選びなさい。",
      mondaiLabelId: "Mondai 1 — Bacaan Kanji N2",
      prompt: "新しい 制度が <u>実施</u>された。",
      options: ["じっし", "じつし", "しんし", "しみ"],
      correctIndex: 0,
      explanation: {
        targetWord: "実施",
        reading: "じっし",
        meaningEn: "implementation; enforcement",
        translationId: "Sistem baru telah diberlakukan.",
        notes: "実施 dibaca じっし dengan sokuon (っ)."
      },
      provenance: { generator: "jlptCuratedN2", generator_version: "1.0", seed: 201 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n2_q02",
      type: "G3_PARTICLES",
      level: "N2",
      mondaiNumber: 1,
      mondaiLabelJa: "問題 7：（　）に入れるのに最もよいものを一つ選びなさい。",
      mondaiLabelId: "Mondai 7 — Tata Bahasa N2",
      prompt: "この 計画は、予算の 問題（　★　）実現が 難しいと 言われて いる。",
      options: ["からして", "ぬきにしては", "にこたえて", "にもとづいて"],
      correctIndex: 0,
      explanation: {
        targetWord: "～からして",
        reading: "からして",
        meaningEn: "judging even from the budget issue alone",
        translationId: "Rencana ini, dilihat dari masalah anggarannya saja, dikatakan sulit diwujudkan.",
        notes: "N + からして mengangkat satu contoh representatif untuk menilai keseluruhan situasi."
      },
      provenance: { generator: "jlptCuratedN2", generator_version: "1.0", seed: 202 },
      review: { status: "approved" }
    }
  ],
  N1: [
    {
      id: "jlpt_n1_q01",
      type: "G1_KANJI_READING",
      level: "N1",
      mondaiNumber: 1,
      mondaiLabelJa: "問題 1：＿＿＿の言葉の読み方として最もよいものを一つ選びなさい。",
      mondaiLabelId: "Mondai 1 — Bacaan Kanji N1",
      prompt: "両国間の 交渉は <u>難航</u>して いる。",
      options: ["なんこう", "なんごう", "だんこう", "だんごう"],
      correctIndex: 0,
      explanation: {
        targetWord: "難航",
        reading: "なんこう",
        meaningEn: "rough going; deadlock; difficulty",
        translationId: "Perundingan antara kedua negara tengah berjalan alot.",
        notes: "難航する（なんこうする）= mengalami jalan buntu / kesulitan besar."
      },
      provenance: { generator: "jlptCuratedN1", generator_version: "1.0", seed: 101 },
      review: { status: "approved" }
    },
    {
      id: "jlpt_n1_q02",
      type: "G3_PARTICLES",
      level: "N1",
      mondaiNumber: 1,
      mondaiLabelJa: "問題 5：（　）に入れるのに最もよいものを一つ選びなさい。",
      mondaiLabelId: "Mondai 5 — Tata Bahasa N1",
      prompt: "彼女の 演奏は、聴衆に 深い 感動を 与えず（　★　）。",
      options: ["にはおかなかった", "にはあたらない", "までもない", "ともかぎらない"],
      correctIndex: 0,
      explanation: {
        targetWord: "～ずにはおかない",
        reading: "ずにはおかない",
        meaningEn: "cannot help but; inevitably evokes deep emotion",
        translationId: "Permainan musiknya pasti menghadirkan kesan mendalam bagi para pendengar.",
        notes: "V-ない (tanpa ない) + ずにはおかない = pasti menimbulkan suatu dampak/reaksi."
      },
      provenance: { generator: "jlptCuratedN1", generator_version: "1.0", seed: 102 },
      review: { status: "approved" }
    }
  ]
};

/**
 * Mengambil soal untuk level N4 - N1 berdasarkan kategori seksi.
 */
export function getCuratedQuestionsForLevel(
  level: Exclude<JLPTLevel, "N5">,
  category: SectionCategory,
  count: number
): QuestionItem[] {
  const base = MULTI_LEVEL_CURATED_BANK[level] || MULTI_LEVEL_CURATED_BANK.N4;
  const n5FallbackVocab = get2018N5VocabQuestions();
  const n5FallbackGr = get2018N5GrammarReadingQuestions();
  const n5FallbackListen = get2018N5ListeningQuestions();

  const pool: QuestionItem[] = [
    ...base,
    ...(category === "listening"
      ? n5FallbackListen
      : category === "grammar_reading"
      ? n5FallbackGr
      : [...n5FallbackVocab, ...n5FallbackGr])
  ];

  return pool.slice(0, Math.min(count, pool.length));
}

/**
 * Menghitung skor skala resmi JLPT (0-180) untuk hasil pengerjaan tes N5.
 * Standar Resmi 2018 JLPT N5 (Halaman 2 PDF):
 * - 言語知識（文字・語彙・文法）・読解: 0 ~ 120 poin (基準点 / Batas minimum seksi: 38 poin)
 * - 聴解: 0 ~ 60 poin (基準点 / Batas minimum seksi: 19 poin)
 * - 総合得点 (Total): 0 ~ 180 poin (合格点 / Batas lulus total: 90 poin)
 */
export interface OfficialJLPTScoreSummary {
  langReadingScaled: number; // 0..120
  langReadingPassed: boolean; // >= 38
  listeningScaled: number; // 0..60
  listeningPassed: boolean; // >= 19
  totalScaled: number; // 0..180
  overallPassed: boolean; // total >= 90 && langReading >= 38 && listening >= 19
  passThresholdTotal: number;
  passThresholdLangReading: number;
  passThresholdListening: number;
}

export function calculateOfficialJLPTScore(
  vocabCorrect: number,
  vocabTotal: number,
  grCorrect: number,
  grTotal: number,
  listenCorrect: number,
  listenTotal: number,
  levelLabel: JLPTLevel = "N5"
): OfficialJLPTScoreSummary {
  const langTotalQ = Math.max(1, vocabTotal + grTotal);
  const langCorrectQ = vocabCorrect + grCorrect;
  const langReadingScaled = Math.round((langCorrectQ / langTotalQ) * 120);
  const listeningScaled =
    listenTotal > 0 ? Math.round((listenCorrect / listenTotal) * 60) : 0;
  const totalScaled = langReadingScaled + listeningScaled;

  const passThresholdTotal =
    levelLabel === "N1"
      ? 100
      : levelLabel === "N2"
      ? 90
      : levelLabel === "N3"
      ? 95
      : levelLabel === "N4"
      ? 90
      : 80; // Untuk 2018 N5 PDF tertulis 90点 (standar tinggi) / 80点; kita gunakan 90点 sesuai tabel halaman 2 PDF!

  const officialTotalTarget = levelLabel === "N5" ? 90 : passThresholdTotal;
  const passThresholdLangReading = 38;
  const passThresholdListening = 19;

  const langReadingPassed = langReadingScaled >= passThresholdLangReading;
  const listeningPassed = listeningScaled >= passThresholdListening;
  const overallPassed =
    totalScaled >= officialTotalTarget && langReadingPassed && listeningPassed;

  return {
    langReadingScaled,
    langReadingPassed,
    listeningScaled,
    listeningPassed,
    totalScaled,
    overallPassed,
    passThresholdTotal: officialTotalTarget,
    passThresholdLangReading,
    passThresholdListening
  };
}

