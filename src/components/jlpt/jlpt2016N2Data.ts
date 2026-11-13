import { QuestionItem, QuestionDialogueTurn } from "../../lib/questionPack";
export { generateOfficial2016N2MockTest } from "./mockTestCatalog";

/**
 * Bank Soal Resmi 2016年12月 日本語能力試験 N2（2016-2 N2 • 全106問 • 155分）
 * Berdasarkan dokumen PDF "2016年12月 日语能力考 N2 真题":
 * - 第1部：言語知識（文字・語彙） (30 menit, 32 soal: 問題 1 [1-5], 問題 2 [6-10], 問題 3 [11-15], 問題 4 [16-22], 問題 5 [23-27], 問題 6 [28-32])
 * - 第2部：言語知識（文法）・読解 (75 menit, 43 soal: 問題 7 [33-44], 問題 8 ★ [45-49], 問題 9 文章文法 [50-54], 問題 10 短文5題 [55-59], 問題 11 中文3題 [60-68], 問題 12 統合理解A・B [69-70], 問題 13 長文 [71-73], 問題 14 情報検索 [74-75])
 * - 第3部：聴解 (50 menit, 31 soal: 問題 1 [5問], 問題 2 [6問], 問題 3 [5問], 問題 4 [11問], 問題 5 [4問: 1番, 2番, 3番-質問1, 3番-質問2])
 */

interface Raw2016N2VocabItem {
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
}

const VOCAB_N2_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6, { ja: string; id: string }> = {
  1: {
    ja: "問題 1：＿＿＿の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 1 — Bacaan Kanji N2 (Pilih bacaan hiragana yang tepat untuk kata bergaris bawah)"
  },
  2: {
    ja: "問題 2：＿＿＿の言葉を漢字で書くとき、最もよいものを1・2・3・4から一つ選びなさい。",
    id: "Mondai 2 — Penulisan Kanji N2 (Pilih penulisan Kanji yang tepat untuk kata bergaris bawah)"
  },
  3: {
    ja: "問題 3：（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 3 — Pembentukan Kata / 語形成 (Pilih prefiks/sufiks Kanji yang tepat untuk melengkapi kata)"
  },
  4: {
    ja: "問題 4：（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 4 — Kosakata Kontekstual N2 (Pilih kosakata yang tepat sesuai konteks kalimat)"
  },
  5: {
    ja: "問題 5：＿＿＿の言葉に意味が最も近いものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 5 — Sinonim & Parafrasa N2 (Pilih kata yang maknanya paling dekat dengan kata bergaris bawah)"
  },
  6: {
    ja: "問題 6：次の言葉の使い方として最も近いものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 6 — Penggunaan Kata / 用法 (Pilih kalimat yang menggunakan kata tersebut secara paling tepat)"
  }
};

const RAW_2016_N2_VOCAB: Raw2016N2VocabItem[] = [
  // 問題 1 (No. 1 - 5: 漢字の読み)
  {
    num: 1,
    mondai: 1,
    prompt: "先生に<u>貴重</u>な資料を見せていただいた。",
    options: ["きじゅう", "きちょう", "きっじゅう", "きっちょう"],
    correctIndex: 1,
    targetWord: "貴重",
    reading: "きちょう",
    meaningEn: "precious; valuable",
    translationId: "Saya diperlihatkan materi yang sangat berharga oleh guru.",
    notes: "貴重 dibaca きちょう (berharga / bernilai tinggi)."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "その話を聞いて、とても<u>怪しい</u>と思った。",
    options: ["むなしい", "くやしい", "おかしい", "あやしい"],
    correctIndex: 3,
    targetWord: "怪しい",
    reading: "あやしい",
    meaningEn: "suspicious; doubtful; fishy",
    translationId: "Mendengar cerita itu, saya merasa sangat mencurigakan.",
    notes: "怪しい dibaca あやしい (mencurigakan / meragukan). むなしい = 空しい / 虚しい, くやしい = 悔しい."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "佐藤さんは<u>容姿</u>も性格もいい。",
    options: ["よし", "ようし", "ようす", "よす"],
    correctIndex: 1,
    targetWord: "容姿",
    reading: "ようし",
    meaningEn: "appearance; figure; looks",
    translationId: "Sato-san baik penampilan fisik maupun kepribadiannya bagus.",
    notes: "容姿 dibaca ようし (penampilan fisik / paras). ようす = 様子 (keadaan)."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "これは危険を<u>伴う</u>実験だ。",
    options: ["はらう", "あつかう", "ともなう", "すくう"],
    correctIndex: 2,
    targetWord: "伴う",
    reading: "ともなう",
    meaningEn: "to accompany; to entail; to involve",
    translationId: "Ini adalah eksperimen yang disertai risiko bahaya.",
    notes: "伴う dibaca ともなう (menyertai / melibatkan). はらう = 払う, あつかう = 扱う, すくう = 救う."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "以前は、海外で暮らしたいという<u>願望</u>が強かった。",
    options: ["がんぼう", "げんぼう", "がんぼ", "げんぼ"],
    correctIndex: 0,
    targetWord: "願望",
    reading: "がんぼう",
    meaningEn: "desire; wish; aspiration",
    translationId: "Dulunya, keinginan untuk tinggal di luar negeri sangat kuat.",
    notes: "願望 dibaca がんぼう (keinginan / hasrat kuat)."
  },

  // 問題 2 (No. 6 - 10: 表記)
  {
    num: 6,
    mondai: 2,
    prompt: "友人を家に<u>まねいた</u>。",
    options: ["伯いた", "招いた", "泊いた", "召いた"],
    correctIndex: 1,
    targetWord: "招いた",
    reading: "まねいた",
    meaningEn: "invited",
    translationId: "Saya mengundang teman ke rumah.",
    notes: "招く (まねく - mengundang) ditulis dengan Kanji 招 (招いた)."
  },
  {
    num: 7,
    mondai: 2,
    prompt: "この商品は安全性が<u>ほしょう</u>されている。",
    options: ["補証", "保正", "保証", "補正"],
    correctIndex: 2,
    targetWord: "保証",
    reading: "ほしょう",
    meaningEn: "guarantee; warranty; assurance",
    translationId: "Produk ini keamanannya telah dijamin.",
    notes: "保証 (ほしょう) = jaminan / garansi (kualitas atau keamanan)."
  },
  {
    num: 8,
    mondai: 2,
    prompt: "この企業では、さまざまな<u>もよおし</u>を行っている。",
    options: ["携し", "催し", "推し", "権し"],
    correctIndex: 1,
    targetWord: "催し",
    reading: "もよおし",
    meaningEn: "event; festivity; function",
    translationId: "Perusahaan ini menyelenggarakan berbagai macam acara.",
    notes: "催し (もよおし) = acara / kegiatan (dari kata kerja 催す = menyelenggarakan)."
  },
  {
    num: 9,
    mondai: 2,
    prompt: "銀行に行って、お札を<u>こうか</u>に替えた。",
    options: ["硬貨", "固貨", "硬価", "固価"],
    correctIndex: 0,
    targetWord: "硬貨",
    reading: "こうか",
    meaningEn: "coin; metallic currency",
    translationId: "Saya pergi ke bank dan menukarkan uang kertas menjadi uang logam (koin).",
    notes: "硬貨 (こうか) = uang koin / logam (lawan dari 紙幣 = uang kertas)."
  },
  {
    num: 10,
    mondai: 2,
    prompt: "わが社の商品はここで<u>せいぞう</u>されている。",
    options: ["製増", "制増", "制造", "製造"],
    correctIndex: 3,
    targetWord: "製造",
    reading: "せいぞう",
    meaningEn: "manufacture; production",
    translationId: "Produk perusahaan kami diproduksi di sini.",
    notes: "製造 (せいぞう) = manufaktur / pembuatan produk."
  },

  // 問題 3 (No. 11 - 15: 語形成)
  {
    num: 11,
    mondai: 3,
    prompt: "男女の結婚（　）の違いについて調べた。",
    options: ["観", "識", "念", "察"],
    correctIndex: 0,
    targetWord: "結婚観",
    reading: "けっこんかん",
    meaningEn: "view on marriage",
    translationId: "Saya meneliti perbedaan pandangan tentang pernikahan antara pria dan wanita.",
    notes: "～観 (かん) = pandangan / nilai terhadap sesuatu (結婚観, 人生観, 価値観)."
  },
  {
    num: 12,
    mondai: 3,
    prompt: "ここでは（　）水準の医療が受けられる。",
    options: ["頂", "上", "高", "特"],
    correctIndex: 2,
    targetWord: "高水準",
    reading: "こうすいじゅん",
    meaningEn: "high standard; high level",
    translationId: "Di sini Anda dapat menerima layanan medis berstandar tinggi.",
    notes: "高水準 (こうすいじゅん) = standar tinggi / level tinggi."
  },
  {
    num: 13,
    mondai: 3,
    prompt: "今日は大学の講義で日本（　）の経営について学んだ。",
    options: ["状", "類", "式", "則"],
    correctIndex: 2,
    targetWord: "日本式",
    reading: "にほんしき",
    meaningEn: "Japanese-style; Japanese method",
    translationId: "Hari ini di kuliah universitas saya mempelajari manajemen gaya Jepang.",
    notes: "～式 (しき) = gaya / metode / sistem (日本式, 西洋式)."
  },
  {
    num: 14,
    mondai: 3,
    prompt: "開封しても、（　）使用の物は返品可能です。",
    options: ["外", "否", "前", "未"],
    correctIndex: 3,
    targetWord: "未使用",
    reading: "みしよう",
    meaningEn: "unused",
    translationId: "Meskipun kemasannya sudah dibuka, barang yang belum digunakan dapat dikembalikan.",
    notes: "未～ (み～) = belum (未使用 = belum dipakai, 未完成 = belum selesai, 未成年 = belum dewasa)."
  },
  {
    num: 15,
    mondai: 3,
    prompt: "受験生なので、勉強（　）の毎日だ。",
    options: ["漬け", "浸し", "溶け", "満ち"],
    correctIndex: 0,
    targetWord: "勉強漬け",
    reading: "べんきょうづけ",
    meaningEn: "completely immersed in study every day",
    translationId: "Karena saya siswa persiapan ujian, setiap hari saya tenggelam penuh dalam belajar.",
    notes: "～漬け (づけ) = tenggelam penuh / terus-menerus melakukan sesuatu (勉強漬け, 仕事漬け)."
  },

  // 問題 4 (No. 16 - 22: 文脈規定)
  {
    num: 16,
    mondai: 4,
    prompt: "この大学では一般向けの講座を開き、社会に学習の場を（　）している。",
    options: ["選出", "提供", "指示", "寄付"],
    correctIndex: 1,
    targetWord: "提供",
    reading: "ていきょう",
    meaningEn: "provision; offering; supplying",
    translationId: "Universitas ini membuka kursus untuk masyarakat umum dan menyediakan wadah belajar bagi masyarakat.",
    notes: "提供する (ていきょうする) = menyediakan / memberikan. 選出 = memilih wakil, 指示 = instruksi, 寄付 = donasi."
  },
  {
    num: 17,
    mondai: 4,
    prompt: "今年の夏は暑さが厳(きび)しく、仕事から家に帰ると疲れて（　）してしまう。",
    options: ["ぐったり", "しっかり", "すっきり", "ぎっしり"],
    correctIndex: 0,
    targetWord: "ぐったり",
    reading: "ぐったり",
    meaningEn: "completely exhausted; limp",
    translationId: "Musim panas tahun ini sangat terik, sehingga saat pulang kerja ke rumah saya kelelahan hingga terkulai lemas.",
    notes: "ぐったり = terkulai lemas karena kelelahan atau panas. すっきり = segar, ぎっしり = padat penuh."
  },
  {
    num: 18,
    mondai: 4,
    prompt: "学生時代の友人が私の名前を忘れていたので、とても（　）だった。",
    options: ["アウト", "ダウン", "ショック", "エラー"],
    correctIndex: 2,
    targetWord: "ショック",
    reading: "ショック",
    meaningEn: "shock; shocked",
    translationId: "Karena teman masa kuliah melupakan nama saya, saya sangat terguncang (syok).",
    notes: "ショック = syok / terpukul secara emosional."
  },
  {
    num: 19,
    mondai: 4,
    prompt: "通路に荷物を置いたら、通る人の（　）になりますよ。",
    options: ["面倒", "邪魔", "被害", "無理"],
    correctIndex: 1,
    targetWord: "邪魔",
    reading: "じゃま",
    meaningEn: "obstacle; hindrance; in the way",
    translationId: "Kalau menaruh barang di lorong jalan, itu akan menghalangi orang yang lewat, lho.",
    notes: "邪魔になる (じゃまになる) = menghalangi / mengganggu jalan."
  },
  {
    num: 20,
    mondai: 4,
    prompt: "少し長めの上(のぼ)り坂(ざか)だったが（　）ので、それほど疲れなかった。",
    options: ["おとなしかった", "ささやかだった", "なだらかだった", "よわよわしかった"],
    correctIndex: 2,
    targetWord: "なだらかだった",
    reading: "なだらかだった",
    meaningEn: "gentle (slope); gradual",
    translationId: "Meskipun tanjakannya agak panjang, karena landai, saya tidak terlalu lelah.",
    notes: "なだらか = landai / tidak curam (untuk lereng atau tanjakan 坂)."
  },
  {
    num: 21,
    mondai: 4,
    prompt: "出席者は皆会議に積極的に参加し、意見を（　）交換し合った。",
    options: ["活発に", "円満に", "機敏に", "濃厚に"],
    correctIndex: 0,
    targetWord: "活発に",
    reading: "かっぱつに",
    meaningEn: "actively; vigorously; lively",
    translationId: "Seluruh peserta berpartisipasi secara proaktif dalam rapat dan saling bertukar pendapat dengan aktif.",
    notes: "意見を活発に交換する = bertukar pendapat dengan aktif / hidup. 円満 = harmonis, 機敏 = tangkas."
  },
  {
    num: 22,
    mondai: 4,
    prompt: "列に並んでいたら、私の前に強引に（　）きた人がいて、嫌な気分になった。",
    options: ["当てはまって", "付け加えて", "行き着いて", "割り込んで"],
    correctIndex: 3,
    targetWord: "割り込んで",
    reading: "わりこんで",
    meaningEn: "cutting in line; barging in",
    translationId: "Saat sedang mengantre di barisan, ada orang yang menyerobot masuk secara paksa di depan saya, membuat perasaan saya kesal.",
    notes: "割り込む (わりこむ) = menyerobot antrean / menyela pembicaraan."
  },

  // 問題 5 (No. 23 - 27: 言い換え類義)
  {
    num: 23,
    mondai: 5,
    prompt: "高橋さんはとても<u>愉快な</u>人だ。",
    options: ["面白い", "おしゃれな", "親切な", "かわいい"],
    correctIndex: 0,
    targetWord: "愉快な",
    reading: "ゆかいな",
    meaningEn: "pleasant; amusing; funny; cheerful",
    translationId: "Takahashi-san adalah orang yang sangat menyenangkan (lucu/menarik).",
    notes: "愉快な人 (ゆかいなひと) = orang yang menyenangkan dan menghibur, paling dekat dengan 面白い (おもしろい)."
  },
  {
    num: 24,
    mondai: 5,
    prompt: "それは確かに<u>やむをえない</u>ことだと思う。",
    options: ["もったいない", "なさけない", "つまらない", "しかたない"],
    correctIndex: 3,
    targetWord: "やむをえない",
    reading: "やむをえない",
    meaningEn: "unavoidable; inevitable; cannot be helped",
    translationId: "Saya rasa hal itu memang tidak bisa dihindari (mau bagaimana lagi).",
    notes: "やむをえない = tidak terelakkan / mau bagaimana lagi = しかたない (仕方がない)."
  },
  {
    num: 25,
    mondai: 5,
    prompt: "少し<u>息抜きした</u>ほうがいいよ。",
    options: ["待った", "急いだ", "休んだ", "働いた"],
    correctIndex: 2,
    targetWord: "息抜きした",
    reading: "いきぬきした",
    meaningEn: "took a breather; took a break",
    translationId: "Sebaiknya kamu beristirahat sejenak (melepas penat).",
    notes: "息抜きする (いきぬきする) = melepas lelah / beristirahat sejenak = 休む (やすむ)."
  },
  {
    num: 26,
    mondai: 5,
    prompt: "今日はとても<u>ついていた</u>。",
    options: ["気分が悪かった", "運が悪かった", "気分がよかった", "運がよかった"],
    correctIndex: 3,
    targetWord: "ついていた",
    reading: "ついていた",
    meaningEn: "was lucky; had good fortune",
    translationId: "Hari ini saya sangat beruntung.",
    notes: "ついている = beruntung / mujur = 運がいい (うんがいい)."
  },
  {
    num: 27,
    mondai: 5,
    prompt: "私は<u>つねに</u>言葉遣いに気をつけている。",
    options: ["当然", "いつも", "特に", "できるだけ"],
    correctIndex: 1,
    targetWord: "つねに",
    reading: "つねに",
    meaningEn: "always; constantly",
    translationId: "Saya senantiasa berhati-hati dalam tutur kata.",
    notes: "常に (つねに) = selalu / senantiasa = いつも."
  },

  // 問題 6 (No. 28 - 32: 用法)
  {
    num: 28,
    mondai: 6,
    prompt: "次の言葉の使い方として最も近いものを、1・2・3・4から一つ選びなさい。\n\n【 延 長 】",
    options: [
      "悪天候で列車が運転をやめたため、旅行の出発が三日後に延長された。",
      "初めの設計では2階建てだったが、3階建ての家に延長することにした。",
      "予定の時間内に結論が出ず、会議が1時間延長されることになった。",
      "電車の中で居眠りをして、降りる駅を一駅延長してしまった。"
    ],
    correctIndex: 2,
    targetWord: "延長",
    reading: "えんちょう",
    meaningEn: "extension (of time, period, line)",
    translationId: "Karena belum ada kesimpulan dalam waktu yang dijadwalkan, rapat diputuskan diperpanjang 1 jam.",
    notes: "延長 (えんちょう) digunakan untuk memperpanjang durasi waktu/masa berlaku atau jalur (会議が1時間延長される). Pada opsi 1 seharusnya 延期された (ditunda), opsi 4 乗り過ごしてしまった."
  },
  {
    num: 29,
    mondai: 6,
    prompt: "次の言葉の使い方として最も近いものを、1・2・3・4から一つ選びなさい。\n\n【 さびる 】",
    options: [
      "暑いところに生ものをずっと置いておいたら、さびて臭くなった。",
      "昨夜は雨が相当降ったらしく、普段はきれいな川の水がさびて濁っている。",
      "鉢に植えた植物に水をやるのを忘れていたら、花がさびてしまった。",
      "この鉄の棒はずっと家の外に置いてあったので、さびて茶色くなっている。"
    ],
    correctIndex: 3,
    targetWord: "さびる",
    reading: "さびる",
    meaningEn: "to rust; to become rusty",
    translationId: "Batang besi ini terus diletakkan di luar rumah, sehingga berkarat dan berubah warna menjadi cokelat.",
    notes: "錆びる (さびる) berarti logam berkarat karena oksidasi/air (鉄の棒がさびて茶色くなっている). Untuk makanan busuk digunakan 腐る, untuk bunga layu 枯れる."
  },
  {
    num: 30,
    mondai: 6,
    prompt: "次の言葉の使い方として最も近いものを、1・2・3・4から一つ選びなさい。\n\n【 目 上 】",
    options: [
      "勉強会に参加した社員がすべて目上だったので、新人の私はとても緊張した。",
      "この店で一番値段が高く目上の商品は、店の奥にある棚に並べられていた。",
      "高校時代、鈴木さんはとても優秀で、成績はいつも学年で目上だった。",
      "あの若さで金賞を受賞した伊藤さんは、本当に目上の人だと思う。"
    ],
    correctIndex: 0,
    targetWord: "目上",
    reading: "めうえ",
    meaningEn: "superior; senior; person of higher status/age",
    translationId: "Karena semua karyawan yang mengikuti kelompok belajar adalah senior/atasan, saya yang karyawan baru merasa sangat gugup.",
    notes: "目上 (めうえ) merujuk pada orang yang kedudukan, pangkat, atau usianya lebih tinggi dari kita (lawan dari 目下). Untuk nilai peringkat tinggi (opsi 3) digunakan 上位 (じょうい)."
  },
  {
    num: 31,
    mondai: 6,
    prompt: "次の言葉の使い方として最も近いものを、1・2・3・4から一つ選びなさい。\n\n【 大げさ 】",
    options: [
      "息子の誕生日に料理を作りすぎてしまい、大げさに余ってしまった。",
      "天気予報によると、明日は今日より大げさに気温が下がるらしい。",
      "努力した結果、試験の成績が大げさに伸びて、先生に褒められた。",
      "あの人は小さなことを大げさに言うので、そのまま信じないほうがいい。"
    ],
    correctIndex: 3,
    targetWord: "大げさ",
    reading: "おおげさ",
    meaningEn: "exaggerated; grandiose; overblown",
    translationId: "Orang itu suka membicarakan hal kecil secara berlebihan (hiperbola), jadi sebaiknya jangan langsung dipercaya begitu saja.",
    notes: "大げさ (おおげさ) berarti melebih-lebihkan / mendramatisir ucapan atau tindakan (小さなことを大げさに言う). Untuk jumlah/suhu/nilai (opsi 1-3) digunakan 大幅に / 大きく / 大量に."
  },
  {
    num: 32,
    mondai: 6,
    prompt: "次の言葉の使い方として最も近いものを、1・2・3・4から一つ選びなさい。\n\n【 反 省 】",
    options: [
      "発表の原稿を全部覚えたのに、緊張のせいでどんなに反省しても全く思い出せない。",
      "今回の企画では、私の準備不足で周りに迷惑をかけたことをとても反省しています。",
      "祖父はいつも若いころの思い出を懐かしそうに反省して私に話してくれる。",
      "この機械の使い方を忘れないように、もう一度最初から反省しておきましょう。"
    ],
    correctIndex: 1,
    targetWord: "反省",
    reading: "はんせい",
    meaningEn: "self-reflection; regret; reconsideration of one's mistake",
    translationId: "Dalam proyek kali ini, saya sangat menyesali dan mengintrospeksi diri karena kurangnya persiapan saya telah merepotkan orang-orang di sekitar.",
    notes: "反省する (はんせいする) berarti merenungkan kembali kesalahan diri sendiri dan menyesalinya. Opsi 3 menggunakan 回想する / 振り返る, opsi 4 復習する / 確認する."
  }
];

// ============================================================================
// 第2部：言語知識（文法）・読解 (43 Soal: No. 33 - 75, 75 Menit)
// ============================================================================

interface Raw2016N2GrammarReadingItem {
  num: number; // 33..75
  mondai: 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
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

const GRAMMAR_READING_N2_MONDAI_LABELS: Record<
  7 | 8 | 9 | 10 | 11 | 12 | 13 | 14,
  { ja: string; id: string }
> = {
  7: {
    ja: "問題 7：次の文の（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 7 — Tata Bahasa Kalimat N2 (Pilih bentuk tata bahasa yang tepat untuk mengisi tanda kurung)"
  },
  8: {
    ja: "問題 8：次の文の ★ に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 8 — Menyusun Kalimat Bintang ★ N2 (Pilih kata yang menempati posisi tanda bintang ★)"
  },
  9: {
    ja: "問題 9：次の文章を読んで、文章全体の内容を考えて、（ 50 ）から（ 54 ）の中に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 9 — Tata Bahasa dalam Wacana N2 (Pilih kata/ungkapan yang tepat untuk mengisi nomor 50–54)"
  },
  10: {
    ja: "問題 10：次の（1）から（5）の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 10 — Pemahaman Bacaan Pendek / 短文 5題 (Pilih jawaban yang paling sesuai dengan isi teks pendek)"
  },
  11: {
    ja: "問題 11：次の（1）から（3）の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 11 — Pemahaman Bacaan Menengah / 中文 3題 (Pilih jawaban yang paling tepat berdasarkan isi wacana)"
  },
  12: {
    ja: "問題 12：次の A と B の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 12 — Pemahaman Terpadu / 統合理解 A・B (Bandingkan sudut pandang teks A dan teks B)"
  },
  13: {
    ja: "問題 13：次の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 13 — Pemahaman Gagasan Wacana Panjang / 主張理解（長文） (Pilih jawaban yang sesuai dengan argumen penulis)"
  },
  14: {
    ja: "問題 14：右のページは、あるホテルのホームページに載っている案内である。下の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 14 — Pencarian Informasi / 情報検索 (Cari informasi paket prasmanan ミハマホテル yang sesuai syarat)"
  }
};

const PASSAGE_N2_MONDAI_9 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="text-xs font-semibold text-[#6b665c]">以下は、雑誌のコラムである。</p>
  <p class="font-bold text-center text-[#27241f]">日本発のトイレマーク</p>
  <p>　公衆トイレの入り口に描かれている男女の絵のマーク。そのマークがあれば、文字で「トイレ」と書かれていなくても、そこがトイレであることがわかる。世界のあちこちで使われているこのトイレマークが実は日本で生まれたものだということを <strong>【 50 】</strong>。</p>
  <p>　トイレマークが生まれたのは、1964年の東京オリンピックがきっかけだ。この東京オリンピックは、アルファベットを使わない国での初めての開催であったため、特に問題になったのが、言葉の壁だった。当時、日本国内の案内板は「お手洗い」などと日本語で書かれているものがほとんどだった。<strong>【 51 】</strong>、それでは世界90数か国から来日する選手たちに理解してもらえない。かといって、参加国すべての国の言葉で書くわけにもいかない。そこで、案内板作成者たちは、あらゆる国の選手が理解できるよう、絵で表すことを考えた。<strong>【 52 】</strong>、トイレマークなのだ。</p>
  <p>　そのほかにも、食堂、シャワー、公衆電話等の施設や設備を表すマークや、水泳、バレーボール等の競技を表すマークも作られた。競技を表すマークは、この東京オリンピックで初めて全面的に導入され、高い評価を受けた。そして、その後のオリンピックでもデザインを変えながら毎回 <strong>【 53 】</strong>。トイレマークに代表されるように、東京オリンピックをきっかけに日本で生まれたマークが、言葉の壁を越え、今や新たなコミュニケーション手段として、世界に広がっている。それは、あらゆる人にわかりやすくという思いが世界に届いた <strong>【 54 】</strong>。</p>
</div>
`.trim();

const PASSAGE_N2_M10_1 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（1）</p>
  <p>　「ルール」はなぜあるのでしょうか？</p>
  <p>　スポーツを理解するために最初に確認しておきますが、〝スポーツは人間が楽しむためのもの〟です。これが出発点です。決して「世の中に無ければならないモノ」でもなければ、生きるためにどうしても「必要なモノ」でもありませんが、楽しむためのモノであり、その〝スポーツで楽しむ〟ために「ルール」があるのです。</p>
  <p>　そして、ルールのもとで勝敗を競いますが、このことが楽しくないのであれば、スポーツをする価値はありません。</p>
  <p class="text-right text-xs text-[#6b665c]">（高峰修『スポーツ教養入門』による）</p>
</div>
`.trim();

const PASSAGE_N2_M10_2 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（2）以下は、ある会社の社内文書である。</p>
  <div class="p-3.5 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5">
    <p class="text-right text-xs">平成28年1月12日</p>
    <p class="text-xs font-semibold">社員各位</p>
    <p class="text-right text-xs font-semibold">総務課長</p>
    <p class="font-bold text-center text-[#27241f] py-1">暖房使用についてのお願い</p>
    <p>　本格的な冬を迎え、暖房の使用が増加しており、12月の電気代は前月に比べて約30%増となりました。節電のため、室内温度は22度以下に設定するとともに、使用していない場所の暖房を切ること、退社時の切り忘れをなくすことなどを徹底してください。</p>
    <p>　また、服装で調整するなど各自で工夫し、暖房に頼りすぎないようご協力をお願いいたします。</p>
  </div>
</div>
`.trim();

const PASSAGE_N2_M10_3 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（3）</p>
  <p>　実は「やりたいことをやる」ためには、シンプルに間近の目標を達成していくだけで十分だと思います。「いつか大きな仕事を成し遂げたい（注）」と思っていても、実際にそれがどんなものかはわかりようがないし、本当に自分が望んでいるものが何なのかもわかりません。</p>
  <p>　それより「目の前のやりたいこと」を見つけ、それに集中できるようなプログラムを組んでいけば、自然に「自分のやっていること」が「自分の望んでいること」に近づいていく可能性が高いような気がします。</p>
  <p class="text-right text-xs text-[#6b665c]">（榊原英資『榊原式スピード思考力』による）</p>
  <p class="text-xs text-[#6b665c] pt-1 border-t border-[#e5dfd3]">（注）成し遂げる：達成する</p>
</div>
`.trim();

const PASSAGE_N2_M10_4 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（4）以下は、コーヒー豆の販売会社から届いたはがきである。</p>
  <div class="p-3.5 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-2">
    <p class="text-xs text-[#6b665c]">189-6715　東京都橋谷市南 3-15-8-302　<strong>マリア・スミス 様</strong></p>
    <p class="font-bold text-center border-y border-[#e5dfd3] py-1">割引フェアのご案内</p>
    <p>いつも「野田コーヒー」をご愛飲くださいまして、ありがとうございます。</p>
    <p>コーヒー豆を定期購入されているお客様に、お得な割引フェアについてご案内いたします。</p>
    <p>当社ではこの冬、新商品「冬の味わい」を発売します。定期購入をされているお客様には、この商品を<strong>15%割引の特別価格</strong>でご提供いたします。購入を希望される方は、<strong>10月中にご予約ください</strong>。</p>
    <p>なお、すでにご案内しておりますとおり、定期購入をされているお客様は、その他の全商品がいつでも10%割引でお求めいただけます。あわせてご利用ください。</p>
    <p class="text-xs text-[#6b665c]">商品の詳細・ご注文方法につきましては、裏面をご覧ください。</p>
  </div>
</div>
`.trim();

const PASSAGE_N2_M10_5 = `
<div class="space-y-2 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（5）</p>
  <p>　どういう日が「いい一日」であるかは人によって異なるだろうが、日記を書き続けることで、自分にとっての「いい一日」というものの構成要件（注）がわかってくる。どうすれば「いい一日」になるかがわかってくるということだ。そうなれば「いい一日」がたまたま訪れるのをただ待つのではなく、「今日」が「いい一日」になるように、「今日はいい一日だった」と日記に書けるように、主体的に行動するようになるだろう。</p>
  <p class="text-right text-xs text-[#6b665c]">（大久保孝治『日常生活の探究―ライフスタイルの社会学』による）</p>
  <p class="text-xs text-[#6b665c] pt-1 border-t border-[#e5dfd3]">（注）構成要件：構成するのに必要な条件</p>
</div>
`.trim();

const PASSAGE_N2_M11_1 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（1）</p>
  <p>　日本ではよく、「若者はもっと個性を発揮すべきだ」とか、「個性を磨くべきだ」などと言われます。けれど私は、そういう言葉にはあまり意味がないと思っています。</p>
  <p>　また、日本では「個性」という言葉が主に人の外観に関して使われることにも、私は違和感（注1）を持っています。たとえば、「個性的なファッション、個性的なヘアスタイル」は、「人がアッと驚くような奇抜（注2）なスタイル」であることが多いでしょう。</p>
  <p class="text-xs text-[#6b665c]">（中略）</p>
  <p>　このように考えると、「個性＝人より目立つこと」と、多くの人が錯覚（注3）しているのではないかと思います。</p>
  <p>　でも、根本的なことを言ってしまえば、この世に生まれた人間は一人残らず全員、それぞれの個性を持っています。だから、誰かに「磨きなさい」と命令されて、義務のように磨く必要などないのです。</p>
  <p>　あなたが生まれ持った個性は、明らかにあなただけのものです。世界中に、あなたと同じ個性を持つ人など誰一人としていないのですから、「他の人はどうかな？」とキョロキョロすることは不必要だし、他人の真似をする必要もありません。真似しようとしても真似できないのが、個性というものなのです。</p>
  <p>　あなた自身が「楽しい、面白い、不思議だ、ワクワクする、ドキドキする」と感じ、心から求めているものを優先すれば、それでいいのです。「磨く」とか「発揮する」などと意識しなくても、自分が本当に好きなもの、興味があることに気持ちが向かっていけば、自分の世界がどんどん広がっていく。それが<u>本当の意味で「個性を磨く」</u>ということです。</p>
  <p class="text-right text-xs text-[#6b665c]">（今北純一『自分力を高める』による）</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）違和感：ここでは、なにか違うという感じ</p>
    <p>（注2）奇抜な：珍しくて目立っている</p>
    <p>（注3）錯覚する：勘違いする</p>
  </div>
</div>
`.trim();

const PASSAGE_N2_M11_2 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（2）</p>
  <p>　「話し言葉」の最も重要な特徴は、声を使うところにあるのではなく、聞き手が目の前にいるというところにあります。話し手と聞き手は、親しい関係の場合もあれば、初対面の人、行きずり（注1）の人の場合もありますが、少なくとも両者は、そこがどんな場所で、どんな状況であるかについて、一定の共通認識（注2）を持っています。同時に、相手がどういう人であるかについても、ある程度はわかります。</p>
  <p class="text-xs text-[#6b665c]">（中略）</p>
  <p>　ところが「書き言葉」になると、たとえ親しい相手への手紙でも、あちこちで説明が必要になります。自分しか読まないはずの覚え書きでも、時間がたつと書かれた状況がわからなくなりますから、「あとで読み返すかもしれない自分」への最低限の配慮（注3）はしておかなくてはなりません。説明するというのは、「自分には言葉にしなくてもわかっていること」を、わざわざ言葉にする作業ですから、とてもやっかいです。でも、そこがきちんとできていないと、<u>誤解が生じて</u>取り返しのつかない（注4）結果になることもありえます。面とむかって（注5）の話なら、相手が気を悪くすれば急いで謝ることもできますが、手紙だと、怒らせたことに気づかないまま関係が切れる恐れすらあるのです。</p>
  <p>　ですから、「書き言葉」においては、文字の読み書きという知識に加えて、自分が書いたものを読む相手がどんな情報を必要としているかを推測する（注6）力、そして、その情報を、どんな言い方、どんな順序で提供すれば、わかってもらいやすく、誤解が生じにくいかを考える力が、いかに（注7）大きな意味を持つかが分かっていただけると思います。</p>
  <p class="text-right text-xs text-[#6b665c]">（脇明子『読む力が未来をひらく―小学生への読書支援』による）</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）行きずりの人：たまたま出会った人 ／ （注2）認識：理解 ／ （注3）配慮：気配り</p>
    <p>（注4）取り返しのつかない：もとに戻せないほど大変な ／ （注5）面とむかって：対面して</p>
    <p>（注6）推測する：ここでは、想像する ／ （注7）いかに：どんなに</p>
  </div>
</div>
`.trim();

const PASSAGE_N2_M11_3 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="font-bold text-xs text-[#6b665c]">（3）</p>
  <p>　従来（注1）、旅行業にとって顧客（注2）を喜ばせることは難しくなかった。自分の行ったことがないところに行きたい、見たことがないものを見たい、食べたことのないものを食べたいというのが主なニーズであったし、長い休みの存在自体が旅行の動機になり得たからだ。だから参加者の多くは、そこに行って、そこそこ（注3）の観光ができれば、十分に満足した。旅行会社は、価格を抑えるために人々を大量に効率良く（注4）送客すればよかった。北海道や沖縄、グアムやハワイ、アジアのリゾート地……場所の魅力を繰り返し伝えて刺激し続ければそれでよかった。</p>
  <p>　しかし、そうして多くの人がさまざまな場所に出掛けるようになると、今度はただ行くだけでは満足しなくなる。目的が必要になる。行ってどうするのか、何ができるのかという目的が重要になる。</p>
  <p class="text-xs text-[#6b665c]">（中略）</p>
  <p>　この流れは現在も続いており、旅の動機づけとしては重要な視点となっている。ただ、残念ながらそういうことをマス（注5）としてとらえることが、価値観の多様化のなかで難しくなってきている。個々の目的を一つに束ねてマスの企画にすることが難しいのだ。ブームが発生しづらくなっている状況と原因は同じであろう。</p>
  <p class="text-right text-xs text-[#6b665c]">（近藤康生『なぜ、人は旅に出るのか』による）</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）従来：これまで ／ （注2）顧客：客 ／ （注3）そこそこの：まあまあの</p>
    <p>（注4）効率良く：ここでは、経費や時間をかけずに ／ （注5）マス：集団</p>
  </div>
</div>
`.trim();

const PASSAGE_N2_MONDAI_12 = `
<div class="space-y-3 text-sm leading-relaxed">
  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5">
    <p class="font-bold text-[#263d36]">A</p>
    <p>　公立の図書館では、利用者へのサービス向上のために、人気の高い本を複数冊置くことが増えている。本が複数冊あれば、同時に多くの利用者に貸し出せて、予約待ちの期間も短くできる。</p>
    <p>　このような図書館の姿勢に対して、予算は限られているのだから買える本の種類が少なくなってしまうのではないかと心配する声もある。しかし、借りたい本がなかなか借りられない図書館では利用者は満足しないだろう。公立の図書館は、多くの人々に読書のきっかけを与え、本を読む楽しさや喜びを感じてもらうようにする役割を持っている。図書館に同じ本を複数冊置くことは、その役割を果たすための一つの方法だといえる。</p>
  </div>
  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5">
    <p class="font-bold text-[#bf5b46]">B</p>
    <p>　最近公立の図書館では、人気の高い本を複数購入しているそうだ。有名な作家の小説などが対象らしい。流行の本を早く読みたいという利用者の希望に応えようとする図書館の気持ちは理解できる。しかし、どうしても早く読みたければ自分で買えばいいのだから、図書館がそのために多くの予算を使う必要はない。</p>
    <p>　税金で運営されている公立図書館の存在意義は、学問的に価値のある本や手に入りにくい本など、さまざまな種類の本を一冊でも多くそろえていることだ。書店にない本でも図書館に行けば読めるというのが本来の姿だろう。同じ本を多く買うことによってその役割が果たせなくなったら、利用者に対するサービスの低下につながるといえる。</p>
  </div>
</div>
`.trim();

const PASSAGE_N2_MONDAI_13 = `
<div class="space-y-2.5 text-sm leading-relaxed">
  <p class="text-xs font-semibold text-[#6b665c]">以下は、あるデザイナーの書いた文章である。</p>
  <p>　私のアイディアのもとは、自分の生きてきた道の中にすべて詰まっているのだ、というふうに思っています。いままで生きてきた中で、<u>感動したことを現代に持ち帰ってくる</u>。過去の中で感動したことをコピーして、それをデザインしているのです。アイディアはいつも人から、時代からもらう。自分で考え出すことは少ないのです。</p>
  <p>　私は、感動したときのシーンはよく覚えています。色も匂いも形も光も季節も、そのときの景色も、そのときその場に誰がいたかも、何を食べたかも、思い出の中に鮮明に刻み込まれています。感動すると、それくらい記憶装置が自動的に働いて、すべてを映し込んでいるのです。</p>
  <p class="text-xs text-[#6b665c]">（中略）</p>
  <p>　中学の頃のこと、高校のあのとき、社会人になったときのこと、妻と旅をしたときの情景などいろいろなシーンが思い出されて、それを遡って切り取りにいくわけです。</p>
  <p>　けれどもそれが、もやーっとした（注1）ものだと切り取れない。なぜ、もやーっとするかと言えば、心の底から感動していないからです。しっかり感動していないと、持ち帰れないのです。</p>
  <p>　感動は、自分の力だけでなく、親の力だったり、友だちの力だったり、ほかの人の力によってもつくられています。子どものときから大事に育てられたとか、自分を包んでくれる街がきちっと大人たちによって美しく保たれていたとか、そういう周囲の力でつくられている場合もあるわけです。</p>
  <p>　そうした感動の思い出を大切に持ち帰ってきて、いまあるものとコラボレーションする（注2）と、新商品が生まれます。そういう意味では、まるっきりの（注3）新商品なんてあり得ません。アイディアはいつも、そんな過去の「感動の森」の中から探し出してくるものなのです。</p>
  <p>　いい思い出がたくさんあるかどうか、いい人に会ったかどうか、美味しいものを食べたかどうか。そういうヒト・コト・モノとのよき思い出の引き出しをどれだけ持っているかによって、アイディアの湧き出る（注4）量は変わるのです。</p>
  <p class="text-right text-xs text-[#6b665c]">（水戸岡鋭治『あと1%だけ、やってみよう―私の仕事哲学』による）</p>
  <div class="text-xs text-[#6b665c] pt-1.5 border-t border-[#e5dfd3] space-y-0.5">
    <p>（注1）もやーっとした：はっきりしない ／ （注2）コラボレーションする：ここでは、組み合わせる</p>
    <p>（注3）まるっきりの：全くの ／ （注4）湧き出る：ここでは、生まれてくる</p>
  </div>
</div>
`.trim();

const PASSAGE_N2_MONDAI_14 = `
<div class="space-y-3 text-sm leading-relaxed">
  <div class="flex items-center justify-between border-b border-[#dcd6c8] pb-1.5">
    <span class="font-bold text-base text-[#27241f]">ビュッフェのご案内</span>
    <span class="px-2 py-0.5 rounded bg-[#263d36] text-white text-xs font-bold">ミハマホテル</span>
  </div>
  <p class="text-xs">レストラン「ベルン」および「みよし」では、以下のビュッフェをご用意しております。お好みの料理を食べ放題でお楽しみください。</p>

  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-2">
    <p class="font-bold text-[#263d36]">■ ベルン（洋食）</p>
    <table class="w-full text-xs border-collapse border border-[#dcd6c8]">
      <thead>
        <tr class="bg-[#f3efe6] text-[#27241f]">
          <th class="border border-[#dcd6c8] px-2 py-1 text-left">コース・時間（制限時間）</th>
          <th class="border border-[#dcd6c8] px-2 py-1 text-left">区分</th>
          <th class="border border-[#dcd6c8] px-2 py-1 text-right">おとな</th>
          <th class="border border-[#dcd6c8] px-2 py-1 text-right">シニア</th>
          <th class="border border-[#dcd6c8] px-2 py-1 text-right">こども</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="border border-[#dcd6c8] px-2 py-1 font-semibold" rowspan="2">◆ ランチ<br/>11:30〜14:00（制限時間 90分）</td>
          <td class="border border-[#dcd6c8] px-2 py-1">平日</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">3,300円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">3,000円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">1,700円</td>
        </tr>
        <tr>
          <td class="border border-[#dcd6c8] px-2 py-1">土日・祝日</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">4,000円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">3,700円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">2,000円</td>
        </tr>
        <tr>
          <td class="border border-[#dcd6c8] px-2 py-1 font-semibold" rowspan="2">◆ デザート<br/>15:00〜17:00（制限時間 60分）</td>
          <td class="border border-[#dcd6c8] px-2 py-1">平日</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">2,500円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">2,200円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">1,500円</td>
        </tr>
        <tr>
          <td class="border border-[#dcd6c8] px-2 py-1">土日・祝日</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">3,000円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">2,700円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">1,800円</td>
        </tr>
        <tr>
          <td class="border border-[#dcd6c8] px-2 py-1 font-semibold" rowspan="2">◆ 夕食<br/>18:00〜21:00（制限時間 2時間）</td>
          <td class="border border-[#dcd6c8] px-2 py-1">平日</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">5,500円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">5,000円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">2,000円</td>
        </tr>
        <tr>
          <td class="border border-[#dcd6c8] px-2 py-1">土日・祝日</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right font-bold">6,000円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right font-bold">5,500円</td>
          <td class="border border-[#dcd6c8] px-2 py-1 text-right">2,500円</td>
        </tr>
      </tbody>
    </table>
    <div class="text-xs bg-[#f9f6f0] p-2 rounded border border-[#e5dfd3]">
      <p class="font-bold">“窓際特別テーブル”のご案内</p>
      <p>レストラン「ベルン」では、海が見渡せる窓際の特別席をご用意しております。最高の眺めとともにビュッフェをお楽しみください。<u>ビュッフェ料金に、1テーブル（2〜4名様）1,000円の追加料金</u>でご利用いただけます。</p>
    </div>
  </div>

  <div class="p-3 rounded-lg border border-[#dcd6c8] bg-[#fffdfa] space-y-1.5">
    <p class="font-bold text-[#bf5b46]">■ みよし（和食）</p>
    <p class="text-xs font-semibold">◆ ランチ 11:00〜16:00（制限時間 2時間） • 土日・祝日のみ</p>
    <p class="text-xs">料金：おとな 4,500円 ／ シニア 4,200円 ／ こども 2,200円</p>
  </div>

  <div class="text-xs text-[#595750] space-y-0.5">
    <p class="font-semibold">＊ビュッフェ料金の区分について（ベルン・みよし共通）</p>
    <p>・おとな…中学生から64歳までのお客様</p>
    <p>・シニア…65歳以上のお客様</p>
    <p>・こども…4歳から小学生までのお子様（3歳以下のお子様は無料です。）</p>
  </div>
</div>
`.trim();

const RAW_2016_N2_GRAMMAR_READING: Raw2016N2GrammarReadingItem[] = [
  // 問題 7 (No. 33 - 44: 文法形式の判断)
  {
    num: 33,
    mondai: 7,
    prompt: "卒業論文がなかなか書けなくて、一時は（　）かけたが、何とか今日無事に提出することができた。",
    options: ["あきらめ", "あきらめて", "あきらめる", "あきらめた"],
    correctIndex: 0,
    targetWord: "あきらめかけた",
    reading: "あきらめかけた",
    meaningEn: "almost gave up; was on the verge of giving up",
    translationId: "Karena skripsi kelulusan tak kunjung bisa ditulis, sempat hampir menyerah, tetapi syukurlah hari ini berhasil dikumpulkan dengan selamat.",
    notes: "V-ます (tanpa ます) + かける = hampir melakukan / baru setengah jalan (あきらめかけた = hampir menyerah)."
  },
  {
    num: 34,
    mondai: 7,
    prompt: "子どものころ、母（　）作ったハンバーグが大好きで、よく作ってもらった。",
    options: ["の", "との", "によって", "にとって"],
    correctIndex: 0,
    targetWord: "母の作った",
    reading: "ははのつくった",
    meaningEn: "made by my mother",
    translationId: "Waktu kecil, saya sangat menyukai steik hamburg yang dibuat ibu, dan sering minta dibuatkan.",
    notes: "Partikel の dapat menggantikan が dalam anak kalimat yang menerangkan kata benda (母が作ったハンバーグ ＝ 母の作ったハンバーグ)."
  },
  {
    num: 35,
    mondai: 7,
    prompt: "多様な情報があふれる現代社会（　）、大切なのは、膨大な情報の中から、自分に必要な情報を選ぶ力である。",
    options: ["に加えて", "において", "を基にして", "を込めて"],
    correctIndex: 1,
    targetWord: "において",
    reading: "において",
    meaningEn: "in; within (formal sphere/context)",
    translationId: "Di dalam masyarakat modern yang dibanjiri beragam informasi, hal yang penting adalah kemampuan memilih informasi yang diperlukan diri sendiri dari sekian banyak informasi.",
    notes: "N + において = di dalam / pada (bentuk formal dari で untuk ruang lingkup waktu, tempat, atau situasi)."
  },
  {
    num: 36,
    mondai: 7,
    prompt: "作文が得意な友達に「どうやったらうまくなれるの？」と聞いたら、「たくさん書けば（　）うまくなるよ。」と言われた。",
    options: ["必ずしも", "たとえ", "そのうち", "さっき"],
    correctIndex: 2,
    targetWord: "そのうち",
    reading: "そのうち",
    meaningEn: "eventually; before long; sooner or later",
    translationId: "Saat saya bertanya kepada teman yang pandai mengarang, 'Bagaimana caranya supaya bisa mahir?', ia menjawab, 'Kalau banyak menulis, lama-kelamaan nanti juga akan mahir.'",
    notes: "そのうち = lama-kelamaan / tidak lama lagi / pada waktunya."
  },
  {
    num: 37,
    mondai: 7,
    prompt: "看護師の仕事は夜勤もあって大変だが、自分でこの仕事を選んだ（　）、がんばって続けたいと思う。",
    options: ["以上", "とたん", "あげくに", "かのように"],
    correctIndex: 0,
    targetWord: "選んだ以上",
    reading: "えらんだいじょう",
    meaningEn: "now that I have chosen; since I chose",
    translationId: "Pekerjaan perawat memang berat karena ada sif malam juga, tetapi karena saya sendiri yang telah memilih pekerjaan ini, saya ingin berusaha keras melanjutkannya.",
    notes: "V-た / Bentuk biasa + 以上（は） = karena sudah ... maka harus/ingin ... (menyatakan tekad atau kewajiban)."
  },
  {
    num: 38,
    mondai: 7,
    prompt: "（内線電話で）\n山田「はい、山田です。」\n木村「受付の木村ですが、X社の中川様が（　）。」\n山田「わかりました。すぐ行きます。」",
    options: ["伺いました", "お目にかかりました", "ございました", "お越しになりました"],
    correctIndex: 3,
    targetWord: "お越しになりました",
    reading: "おこしになりました",
    meaningEn: "has arrived / came (honorific Sonkeigo)",
    translationId: "(Di telepon internal) Yamada: 'Ya, dengan Yamada.' Kimura: 'Saya Kimura dari resepsionis, Bapak/Ibu Nakagawa dari Perusahaan X telah tiba.' Yamada: 'Baik, saya segera ke sana.'",
    notes: "お越しになる (おこしになる) adalah bentuk hormat (尊敬語) dari 来る / 行く untuk tamu (中川様). 伺う dan お目にかかる adalah 謙譲語 (merendahkan diri sendiri)."
  },
  {
    num: 39,
    mondai: 7,
    prompt: "人は一生のうちどのくらい寝ているのでしょうか。仮に一日8時間寝て、80歳まで生きる（　）。すると、睡眠時間は約233,600時間で、約27年寝ている計算になります。",
    options: ["となりました", "とします", "とされていました", "と見られます"],
    correctIndex: 1,
    targetWord: "とします",
    reading: "とします",
    meaningEn: "let us suppose; assuming that",
    translationId: "Berapa lama manusia tidur sepanjang hidupnya? Andaikan kita tidur 8 jam sehari dan hidup sampai usia 80 tahun. Maka waktu tidur berjumlah sekitar 233.600 jam, atau terhitung tidur sekitar 27 tahun.",
    notes: "（仮に）～とする / ～とします = andaikan / misalkan (digunakan saat membuat pengandaian atau simulasi hitungan)."
  },
  {
    num: 40,
    mondai: 7,
    prompt: "夢を語る（　）誰でもできるが、実現させるのは簡単なことではない。",
    options: ["だけでは", "だけなら", "ためしか", "ためには"],
    correctIndex: 1,
    targetWord: "だけなら",
    reading: "だけなら",
    meaningEn: "if it is just (talking about a dream)",
    translationId: "Kalau sekadar membicarakan impian sih siapa pun bisa, tetapi mewujudkannya bukanlah hal yang mudah.",
    notes: "～だけなら = kalau hanya sekadar ... (diikuti kalimat kontras bahwa tindakan sebenarnya lebih sulit)."
  },
  {
    num: 41,
    mondai: 7,
    prompt: "（説明書で）\n「エアコンを掃除するときは、安全上、必ずコンセントを（　）してください。」",
    options: ["抜いたことを", "抜いたことが", "抜いてからに", "抜いてからは"],
    correctIndex: 2,
    targetWord: "抜いてからに",
    reading: "ぬいてからに",
    meaningEn: "do it after unplugging",
    translationId: "(Pada buku petunjuk) 'Saat membersihkan AC, demi keselamatan, pastikan melakukannya setelah mencabut steker listrik.'",
    notes: "V-てからにする / V-てからにしてください = lakukanlah (pembersihan itu) setelah terlebih dahulu melakukan V."
  },
  {
    num: 42,
    mondai: 7,
    prompt: "私はスピーチが苦手なのに、今度友達の結婚パーティーでスピーチを（　）、困っている。",
    options: ["しにくくて", "してほしくて", "させてみたくて", "することになってしまって"],
    correctIndex: 3,
    targetWord: "することになってしまって",
    reading: "することになってしまって",
    meaningEn: "ended up having to do (it was decided that I would give a speech)",
    translationId: "Padahal saya tidak pandai berpidato, tetapi kali ini saya malah terpilih harus memberikan pidato di pesta pernikahan teman, sehingga saya kebingungan.",
    notes: "V-ることになってしまう = diputuskan oleh keadaan/pihak lain bahwa saya harus melakukan V (dengan nuansa menyesal/repot)."
  },
  {
    num: 43,
    mondai: 7,
    prompt: "せっかく、夕日がきれいなことで有名なA海岸に来たのに、急に雨が降り出した。どうも夕日は（　）。",
    options: ["見えてもしかたない", "見られないことだった", "見られそうにない", "見えないことがあった"],
    correctIndex: 2,
    targetWord: "見られそうにない",
    reading: "みられそうにない",
    meaningEn: "unlikely to be able to see",
    translationId: "Padahal sudah jauh-jauh datang ke Pantai A yang terkenal karena matahari terbenamnya yang indah, tiba-tiba hujan turun. Tampaknya matahari terbenam tidak akan bisa dilihat.",
    notes: "V-ます (potensial: 見られ) + そうにない = tampaknya tidak mungkin bisa ... (どうも夕日は見られそうにない)."
  },
  {
    num: 44,
    mondai: 7,
    prompt: "山川「中村くん、毎日ジョギング（　）？」\n中村「うん、そうなんだよ。」\n山川「実は、ぼくもなんだよ。走るっていいよね。」",
    options: ["しない", "しててもいい", "しちゃえば", "してるんだって"],
    correctIndex: 3,
    targetWord: "してるんだって",
    reading: "してるんだって",
    meaningEn: "I heard you're doing (jogging every day)?",
    translationId: "Yamakawa: 'Nakamura-kun, katanya kamu jogging setiap hari ya?' Nakamura: 'Iya, begitulah.' Yamakawa: 'Sebenarnya aku juga lho. Berlari itu menyenangkan ya.'",
    notes: "～んだって？ (dalam percakapan akrab dengan intonasi tanya) = 'Katanya kamu ... ya?' (mengonfirmasi kabar yang didengar)."
  },

  // 問題 8 (No. 45 - 49: ★ 並べ替え)
  {
    num: 45,
    mondai: 8,
    isStarQuestion: true,
    prompt: "結婚生活を送る ＿＿＿ ＿＿＿ ★ ＿＿＿ 、相手への思いやりの気持ちを持つことだと思う。",
    options: ["うえで", "といえば", "大切か", "何が"],
    correctIndex: 2,
    targetWord: "大切か",
    reading: "たいせつか",
    meaningEn: "what is important in living a married life",
    translationId: "Kalau ditanya apa yang penting dalam menjalani kehidupan pernikahan, menurut saya adalah memiliki perasaan tenggang rasa terhadap pasangan.",
    notes: "Urutan lengkap: 結婚生活を送る 【1. うえで】 【4. 何が】 【★ 3. 大切か】 【2. といえば】、相手への思いやりの気持ちを持つことだと思う。 Pola: V-るうえで (dalam hal melakukan V) + 何が大切かといえば (kalau bicara tentang apa yang penting)."
  },
  {
    num: 46,
    mondai: 8,
    isStarQuestion: true,
    prompt: "就職したときに ＿＿＿ ＿＿＿ ★ ＿＿＿ とうとう壊れたので、買い換えることにした。",
    options: ["ずっと", "買って以来", "かばんが", "使っていた"],
    correctIndex: 3,
    targetWord: "使っていた",
    reading: "つかっていた",
    meaningEn: "had been using continuously since buying it",
    translationId: "Karena tas yang terus saya gunakan sejak saya beli saat mulai bekerja akhirnya rusak, saya memutuskan untuk membeli penggantinya.",
    notes: "Urutan lengkap: 就職したときに 【2. 買って以来】 【1. ずっと】 【★ 4. 使っていた】 【3. かばんが】 とうとう壊れたので... (anak kalimat yang menerangkan かばんが)."
  },
  {
    num: 47,
    mondai: 8,
    isStarQuestion: true,
    prompt: "登山には不思議な魅力がある。登っているときはこんなに ＿＿＿ ＿＿＿ ★ ＿＿＿ なぜかまた登りたくなる。",
    options: ["思うのに", "二度としたくないと", "苦しいことは", "山を下りて何日かすると"],
    correctIndex: 0,
    targetWord: "思うのに",
    reading: "おもうのに",
    meaningEn: "even though I think I never want to do such a painful thing again",
    translationId: "Mendaki gunung memiliki daya tarik yang ajaib. Padahal saat sedang mendaki kita berpikir tidak mau lagi melakukan hal semenyiksa ini untuk kedua kalinya, tetapi beberapa hari setelah turun gunung entah mengapa kita ingin mendaki lagi.",
    notes: "Urutan lengkap: 登っているときはこんなに 【3. 苦しいことは】 【2. 二度としたくないと】 【★ 1. 思うのに】 【4. 山を下りて何日かすると】 なぜかまた登りたくなる。"
  },
  {
    num: 48,
    mondai: 8,
    isStarQuestion: true,
    prompt: "彫刻家川村たけるが作る動物の彫刻作品は、形はシンプル ＿＿＿ ＿＿＿ ＿＿＿ ★ 生命力にあふれている。",
    options: ["動き出し", "そうな", "ながら", "今にも"],
    correctIndex: 1,
    targetWord: "そうな",
    reading: "そうな",
    meaningEn: "looks as if it is about to start moving at any moment",
    translationId: "Karya patung hewan buatan pematung Takeru Kawamura, meskipun bentuknya sederhana, penuh dengan daya hidup yang tampak seolah akan mulai bergerak saat ini juga.",
    notes: "Urutan lengkap: 形はシンプル 【3. ながら】 【4. 今にも】 【1. 動き出し】 【★ 2. そうな】 生命力にあふれている。 Pola: シンプルながら (meskipun sederhana) + 今にも動き出しそうな (tampak seolah akan mulai bergerak sekarang juga)."
  },
  {
    num: 49,
    mondai: 8,
    isStarQuestion: true,
    prompt: "ビジネスで成功できる人とできない人の違いは、どんなに大変な状況でもあきらめずに ＿＿＿ ＿＿＿ ＿＿＿ ★ と思う。",
    options: ["かどうか", "取り組める", "にある", "最後まで"],
    correctIndex: 2,
    targetWord: "にある",
    reading: "にある",
    meaningEn: "lies in whether or not one can keep tackling it to the very end",
    translationId: "Perbedaan antara orang yang bisa sukses dalam bisnis dan yang tidak terletak pada apakah ia sanggup berusaha mengerjakannya sampai akhir tanpa menyerah dalam situasi sesulit apa pun.",
    notes: "Urutan lengkap: あきらめずに 【4. 最後まで】 【2. 取り組める】 【1. かどうか】 【★ 3. にある】 と思う。 Pola: 違いは～かどうかにある (perbedaannya terletak pada apakah ... atau tidak)."
  },

  // 問題 9 (No. 50 - 54: 文章の文法「日本発のトイレマーク」)
  {
    num: 50,
    mondai: 9,
    passageHtml: PASSAGE_N2_MONDAI_9,
    prompt: "【 50 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: [
      "ご存じなわけだ",
      "ご存じだろうか",
      "ご存じのようだ",
      "ご存じだからだろう"
    ],
    correctIndex: 1,
    targetWord: "ご存じだろうか",
    reading: "ごぞんじだろうか",
    meaningEn: "do you know that...?",
    translationId: "Tahukah Anda bahwa simbol toilet yang digunakan di berbagai penjuru dunia ini sebenarnya lahir di Jepang?",
    notes: "Di awal artikel kolom majalah, penulis menyapa pembaca dengan pertanyaan retoris: ～ということをご存じだろうか (Tahukah Anda bahwa ...?)."
  },
  {
    num: 51,
    mondai: 9,
    passageHtml: PASSAGE_N2_MONDAI_9,
    prompt: "【 51 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: ["それに", "しかし", "または", "それどころか"],
    correctIndex: 1,
    targetWord: "しかし",
    reading: "しかし",
    meaningEn: "however; but",
    translationId: "Kala itu, sebagian besar papan petunjuk di Jepang ditulis dalam bahasa Jepang seperti 'お手洗い'. Namun, dengan begitu para atlet yang datang dari 90 lebih negara di dunia tidak dapat memahaminya.",
    notes: "しかし (namun) menghubungkan fakta kondisi papan petunjuk berbahasa Jepang dengan masalah bahwa atlet asing tidak bisa memahaminya."
  },
  {
    num: 52,
    mondai: 9,
    passageHtml: PASSAGE_N2_MONDAI_9,
    prompt: "【 52 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: [
      "作成者が理解したのは",
      "日本で考えられたのが",
      "ここに生み出したのは",
      "こうして生まれたのが"
    ],
    correctIndex: 3,
    targetWord: "こうして生まれたのが",
    reading: "こうしてうまれたのが",
    meaningEn: "what was born in this way is...",
    translationId: "Maka para pembuat papan petunjuk berpikir untuk menampilkannya dengan gambar agar atlet dari negara mana pun dapat mengerti. Yang lahir dengan cara demikian adalah simbol toilet.",
    notes: "こうして生まれたのが、トイレマークなのだ = Yang lahir melalui proses demikian (こうして) adalah simbol toilet."
  },
  {
    num: 53,
    mondai: 9,
    passageHtml: PASSAGE_N2_MONDAI_9,
    prompt: "【 53 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: [
      "使用されている",
      "使用した点だ",
      "使用していける",
      "使用したいものだ"
    ],
    correctIndex: 0,
    targetWord: "使用されている",
    reading: "しようされている",
    meaningEn: "is being used (every time)",
    translationId: "Dan pada Olimpiade-Olimpiade berikutnya pun, piktogram tersebut terus digunakan setiap kali sambil mengalami perubahan desain.",
    notes: "毎回使用されている (digunakan setiap kali penyelenggaraan Olimpiade hingga kini)."
  },
  {
    num: 54,
    mondai: 9,
    passageHtml: PASSAGE_N2_MONDAI_9,
    prompt: "【 54 】に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    options: [
      "結果として表れるかもしれない",
      "結果のはずだった",
      "結果に違いない",
      "結果でなければならなかった"
    ],
    correctIndex: 2,
    targetWord: "結果に違いない",
    reading: "けっかにちがいない",
    meaningEn: "must be the result of",
    translationId: "Hal itu pastilah merupakan hasil dari tersampaikannya niat tulus 'agar mudah dipahami oleh siapa pun' ke seluruh dunia.",
    notes: "～に違いない menutup esai dengan kesimpulan meyakinkan penulis ('pastilah merupakan hasil dari...')."
  },

  // 問題 10 (No. 55 - 59: 短文読解 5題)
  {
    num: 55,
    mondai: 10,
    passageHtml: PASSAGE_N2_M10_1,
    prompt: "55　筆者の考えに合うのはどれか。",
    options: [
      "ルールのないスポーツにも価値がある。",
      "ルールはスポーツで楽しむためのものだ。",
      "スポーツはルールを理解してから始めるべきだ。",
      "スポーツを通して、ルールの重要さが理解できる。"
    ],
    correctIndex: 1,
    targetWord: "ルールはスポーツで楽しむためのものだ",
    reading: "スポーツでたのしむため",
    meaningEn: "rules exist so that people can enjoy sports",
    translationId: "Manakah yang sesuai dengan pemikiran penulis? → Aturan (rule) ada untuk bersenang-senang melalui olahraga.",
    notes: "Teks menyatakan secara eksplisit: 「楽しむためのモノであり、その〝スポーツで楽しむ〟ために『ルール』があるのです。」"
  },
  {
    num: 56,
    mondai: 10,
    passageHtml: PASSAGE_N2_M10_2,
    prompt: "56　この文書を書いた、一番の目的は何か。",
    options: [
      "暖房の使用を減らす工夫について意見を求める。",
      "暖房を使用せず、服装で調整することを求める。",
      "暖房を無駄に使用しないことを求める。",
      "暖房の温度を変更しないことを求める。"
    ],
    correctIndex: 2,
    targetWord: "暖房を無駄に使用しないことを求める",
    reading: "だんぼうをむだにしようしない",
    meaningEn: "to ask employees not to use heating wastefully",
    translationId: "Apa tujuan utama penulisan dokumen internal ini? → Meminta karyawan agar tidak menggunakan pemanas ruangan secara boros/sia-sia.",
    notes: "Surat meminta pengaturan suhu maksimal 22°C, mematikan pemanas di ruangan kosong, tidak lupa mematikan saat pulang, serta menyesuaikan pakaian = 暖房を無駄に使用しないこと."
  },
  {
    num: 57,
    mondai: 10,
    passageHtml: PASSAGE_N2_M10_3,
    prompt: "57　筆者の考えに合うのはどれか。",
    options: [
      "「やりたいことをやる」には、大きな目標を立てることが大切だ。",
      "「自分の望んでいること」を知れば、今何をすべきかがわかるようになる。",
      "「自分のやっていること」が「自分の望んでいること」だと気づくことが大切だ。",
      "「目の前のやりたいこと」を続ければ、それが「自分の望んでいること」になり得る。"
    ],
    correctIndex: 3,
    targetWord: "「目の前のやりたいこと」を続ければ、それが「自分の望んでいること」になり得る",
    reading: "めのまえのやりたいこと",
    meaningEn: "if you keep doing what you want to do right in front of you, it can become what you truly desire",
    translationId: "Manakah yang sesuai dengan pemikiran penulis? → Jika kita terus mengerjakan hal yang ingin dilakukan di depan mata, hal itu dapat mendekati apa yang benar-benar kita impikan.",
    notes: "Paragraf kedua: 「『目の前のやりたいこと』を見つけ、それに集中できるようなプログラムを組んでいけば、自然に『自分のやっていること』が『自分の望んでいること』に近づいていく可能性が高い」."
  },
  {
    num: 58,
    mondai: 10,
    passageHtml: PASSAGE_N2_M10_4,
    prompt: "58　このはがきで紹介されている割引サービスについて正しいものはどれか。",
    options: [
      "コーヒー豆を定期購入している人は、10月中だけ「冬の味わい」を10%割引で買うことができる。",
      "コーヒー豆を定期購入している人が10月中に「冬の味わい」を予約すれば、15%割引で買うことができる。",
      "「冬の味わい」を10月中に予約すれば、その他の商品をすべて15%割引で買うことができる。",
      "「冬の味わい」を買った人は、10月中だけその他の商品をすべて10%割引で買うことができる。"
    ],
    correctIndex: 1,
    targetWord: "定期購入している人が10月中に「冬の味わい」を予約すれば、15%割引",
    reading: "ていきこうにゅう・じゅうごパーセントわりびき",
    meaningEn: "regular subscribers who pre-order 'Winter Flavor' in October get a 15% discount",
    translationId: "Manakah pernyataan yang benar mengenai layanan diskon pada kartu pos ini? → Pelanggan langganan tetap biji kopi yang memesan (pre-order) 'Fuyu no Ajiwai' selama bulan Oktober dapat membelinya dengan diskon 15%.",
    notes: "Teks kartu pos: 「定期購入をされているお客様には、この商品（冬の味わい）を15%割引の特別価格でご提供いたします。購入を希望される方は、10月中にご予約ください。」"
  },
  {
    num: 59,
    mondai: 10,
    passageHtml: PASSAGE_N2_M10_5,
    prompt: "59　筆者によると、日記を書き続けるとどうなるか。",
    options: [
      "毎日を「いい一日」にしようとするようになる。",
      "毎日が「いい一日」だと思えるようになる。",
      "「いい一日」が訪れるのを楽しみにするようになる。",
      "「いい一日」をいつまでも忘れないようになる。"
    ],
    correctIndex: 0,
    targetWord: "毎日を「いい一日」にしようとするようになる",
    reading: "まいにちをいいいちにちにしようとする",
    meaningEn: "one comes to act proactively to make every day a 'good day'",
    translationId: "Menurut penulis, apa yang terjadi jika kita terus menulis buku harian? → Kita akan bertindak secara proaktif untuk menjadikan setiap hari sebagai 'hari yang baik'.",
    notes: "Kalimat terakhir: 「『いい一日』がたまたま訪れるのをただ待つのではなく、『今日』が『いい一日』になるように…主体的に行動するようになるだろう。」"
  },

  // 問題 11 (No. 60 - 68: 中文読解 3題)
  {
    num: 60,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_1,
    prompt: "60　日本人が使う「個性」という言葉について、筆者はどのように述べているか。",
    options: [
      "本来の意味とは違う使い方がされている。",
      "意味がないと思っている人が多い。",
      "主に若者に対して使われている。",
      "人によって使い方がさまざまだ。"
    ],
    correctIndex: 0,
    targetWord: "本来の意味とは違う使い方がされている",
    reading: "ほんらいのいみとはちがうつかいかた",
    meaningEn: "it is being used in a way that differs from its original meaning",
    translationId: "Bagaimana penulis menjelaskan kata 'kosei' (individualitas) yang digunakan orang Jepang? → Kata tersebut digunakan dengan cara yang berbeda dari makna aslinya (disalahartikan sekadar tampil mencolok dari orang lain).",
    notes: "Paragraf 2–3 menjelaskan bahwa di Jepang 「個性」 dipakai untuk penampilan mencolok/nyentrik (奇抜なスタイル), sehingga banyak orang salah kaprah (錯覚している) bahwa 個性＝人より目立つこと."
  },
  {
    num: 61,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_1,
    prompt: "61　個性について、筆者の考えに合うものはどれか。",
    options: [
      "他人には理解できないものである。",
      "人より目立つことで発揮できるものである。",
      "人間なら誰でも持っているものである。",
      "ファッションを通して主張できるものである。"
    ],
    correctIndex: 2,
    targetWord: "人間なら誰でも持っているものである",
    reading: "にんげんならだれでももっている",
    meaningEn: "it is something that every human being possesses",
    translationId: "Manakah yang sesuai dengan pemikiran penulis mengenai 'kosei' (keunikan diri)? → Merupakan sesuatu yang dimiliki oleh setiap manusia tanpa terkecuali.",
    notes: "Paragraf 4: 「この世に生まれた人間は一人残らず全員、それぞれの個性を持っています。」"
  },
  {
    num: 62,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_1,
    prompt: "62　筆者によると、<u>本当の意味で「個性を磨く」</u>とはどのようなことか。",
    options: [
      "自分の心に従って、関心があることを追い求めること",
      "自分が好きかどうかより、個性的に見られるかどうかを優先すること",
      "周囲の意見を参考に、無理なく自分の世界を広げること",
      "どんな物事にも、楽しさや面白さを見つける努力をすること"
    ],
    correctIndex: 0,
    targetWord: "自分の心に従って、関心があることを追い求めること",
    reading: "じぶんのこころにしたがって",
    meaningEn: "following one's own heart and pursuing what one is genuinely interested in",
    translationId: "Menurut penulis, apakah yang dimaksud dengan 'mengasah keunikan diri dalam arti sesungguhnya'? → Mengikuti kata hati sendiri dan mengejar hal-hal yang benar-benar diminati.",
    notes: "Paragraf terakhir: 「心から求めているものを優先すれば、それでいいのです。…自分が本当に好きなもの、興味があることに気持ちが向かっていけば、自分の世界がどんどん広がっていく。」"
  },
  {
    num: 63,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_2,
    prompt: "63　筆者によると、「話し言葉」の重要な特徴とは何か。",
    options: [
      "話し手と聞き手が声を使って情報を共有するところ",
      "話し手と聞き手の関係が多様であるところ",
      "話し手が聞き手との親しさによって表現を使い分けるところ",
      "話し手が聞き手と場面を共有するところ"
    ],
    correctIndex: 3,
    targetWord: "話し手が聞き手と場面を共有するところ",
    reading: "はなしてがききてとばめんをきょうゆうする",
    meaningEn: "the speaker and listener share the immediate scene/situation",
    translationId: "Menurut penulis, apa ciri terpenting dari 'bahasa lisan' (話し言葉)? → Pembicara dan lawan bicara berbagi situasi/tempat yang sama secara langsung.",
    notes: "Paragraf 1: 「『話し言葉』の最も重要な特徴は、声を使うところにあるのではなく、聞き手が目の前にいるというところにあります。…そこがどんな場所で、どんな状況であるかについて、一定の共通認識を持っています。」"
  },
  {
    num: 64,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_2,
    prompt: "64　<u>誤解が生じて</u>とあるが、どのような時に誤解が生じるのか。",
    options: [
      "読み手に必要な情報を十分に説明していない時",
      "読み手が理解していることを再び説明してしまった時",
      "自分のために書いたものを相手に送ってしまった時",
      "気を悪くした相手にきちんと謝らなかった時"
    ],
    correctIndex: 0,
    targetWord: "読み手に必要な情報を十分に説明していない時",
    reading: "よみてにひつようなじょうほうをじゅうぶんにせつめいしていないとき",
    meaningEn: "when one fails to sufficiently explain information needed by the reader",
    translationId: "Disebutkan 'timbul kesalahpahaman', kapan kesalahpahaman itu muncul? → Ketika penulis tidak menjelaskan secara memadai informasi yang dibutuhkan oleh pembaca.",
    notes: "Paragraf 2: 「説明するというのは、『自分には言葉にしなくてもわかっていること』を、わざわざ言葉にする作業ですから、とてもやっかいです。でも、そこがきちんとできていないと、誤解が生じて…」"
  },
  {
    num: 65,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_2,
    prompt: "65　「書き言葉」について、筆者の考えに合うのはどれか。",
    options: [
      "相手がどのような情報を必要としているのかを調べることが大切だ。",
      "何をどのように書けば相手が理解できるかを考えることが大切だ。",
      "言い方や順序よりも文字と言葉の正確さを優先させたほうがいい。",
      "読み書きの知識よりも書く内容を重視したほうがいい。"
    ],
    correctIndex: 1,
    targetWord: "何をどのように書けば相手が理解できるかを考えることが大切だ",
    reading: "なにをどのようにかけばあいてがりかいできるか",
    meaningEn: "it is important to consider what and how to write so the reader can understand",
    translationId: "Manakah yang sesuai dengan pemikiran penulis mengenai 'bahasa tulis' (書き言葉)? → Penting untuk memikirkan informasi apa dan bagaimana cara serta urutan menuliskannya agar pembaca dapat memahami tanpa salah paham.",
    notes: "Paragraf 3: 「相手がどんな情報を必要としているかを推測する力、そして、その情報を、どんな言い方、どんな順序で提供すれば、わかってもらいやすく、誤解が生じにくいかを考える力が、いかに大きな意味を持つか…」"
  },
  {
    num: 66,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_3,
    prompt: "66　筆者によると、これまでの旅はどのようなものだったか。",
    options: [
      "高くても遠い場所でのんびり過ごせればよかった。",
      "経験したことのないことができればよかった。",
      "気に入った場所に繰り返し行ければよかった。",
      "近くて安い場所に短期間に行ければよかった。"
    ],
    correctIndex: 1,
    targetWord: "経験したことのないことができればよかった",
    reading: "けいけんしたことのないことができればよかった",
    meaningEn: "people were satisfied as long as they could experience things they had never done before",
    translationId: "Menurut penulis, seperti apakah perjalanan wisata selama ini (di masa lalu)? → Cukup dengan bisa mengalami hal-hal yang belum pernah dialami sebelumnya (pergi ke tempat baru, melihat dan memakan hal baru).",
    notes: "Paragraf 1: 「自分の行ったことがないところに行きたい、見たことがないものを見たい、食べたことのないものを食べたいというのが主なニーズであった…」"
  },
  {
    num: 67,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_3,
    prompt: "67　筆者によると、客は旅で何を重視するようになってきたか。",
    options: [
      "一回の旅行でさまざまな場所へ行けるかどうか",
      "観光するだけで満足できるかどうか",
      "行ってしたいことができるかどうか",
      "新しい場所へ行けるかどうか"
    ],
    correctIndex: 2,
    targetWord: "行ってしたいことができるかどうか",
    reading: "いってしたいことができるかどうか",
    meaningEn: "whether they can do what they want to do at the destination",
    translationId: "Menurut penulis, apa yang kini mulai dipentingkan oleh wisatawan dalam perjalanan? → Apakah mereka bisa melakukan apa yang ingin mereka lakukan setelah sampai di tujuan.",
    notes: "Paragraf 2: 「今度はただ行くだけでは満足しなくなる。目的が必要になる。行ってどうするのか、何ができるのかという目的が重要になる。」"
  },
  {
    num: 68,
    mondai: 11,
    passageHtml: PASSAGE_N2_M11_3,
    prompt: "68　筆者によると、旅行会社が難しいと感じている点は何か。",
    options: [
      "個々のニーズに合った団体旅行を考え出すこと",
      "魅力を感じてもらえる場所を探し続けること",
      "旅行に行こうという気持ちにさせること",
      "価格を抑えた団体旅行を企画すること"
    ],
    correctIndex: 0,
    targetWord: "個々のニーズに合った団体旅行を考え出すこと",
    reading: "ここのニーズにあっただんたいりょこう",
    meaningEn: "devising group tour packages that match diverse individual needs",
    translationId: "Menurut penulis, hal apa yang dirasakan sulit oleh biro perjalanan? → Merancang paket wisata rombongan (massal) yang dapat menyatukan tujuan/kebutuhan masing-masing individu yang beragam.",
    notes: "Paragraf 3: 「個々の目的を一つに束ねてマスの企画にすることが難しいのだ。」"
  },

  // 問題 12 (No. 69 - 70: 統合理解 A・B「公立の図書館」)
  {
    num: 69,
    mondai: 12,
    passageHtml: PASSAGE_N2_MONDAI_12,
    prompt: "69　公立図書館が人気のある本を複数冊置くことについて、AとBはどのように述べているか。",
    options: [
      "AもBも、利用者の希望を重視しすぎていると述べている。",
      "AもBも、利用者へのサービス向上につながると述べている。",
      "Aは予算が足りなくなると述べ、Bは図書館の存在意義が失われると述べている。",
      "Aは利用者の満足度が高くなると述べ、Bは予算の使い方として適切でないと述べている。"
    ],
    correctIndex: 3,
    targetWord: "Aは利用者の満足度が高くなると述べ、Bは予算の使い方として適切でないと述べている",
    reading: "とうごうりかい",
    meaningEn: "A states it increases user satisfaction, while B states it is an inappropriate use of budget",
    translationId: "Bagaimana pendapat A dan B mengenai perpustakaan umum yang menyediakan beberapa eksemplar buku populer? → A menyatakan hal itu meningkatkan kepuasan pengunjung (memperpendek antrean), sedangkan B menyatakan itu bukan penggunaan anggaran yang tepat.",
    notes: "A mendukung kebijakan tersebut demi kepuasan peminjam, sedangkan B mengkritik: 「どうしても早く読みたければ自分で買えばいいのだから、図書館がそのために多くの予算を使う必要はない。」"
  },
  {
    num: 70,
    mondai: 12,
    passageHtml: PASSAGE_N2_MONDAI_12,
    prompt: "70　公立図書館の役割について、AとBはどのように述べているか。",
    options: [
      "AもBも、利用者の教養を高めることだと述べている。",
      "AもBも、読書が好きな人を増やすことだと述べている。",
      "Aは利用者に読書に親しんでもらうことだと述べ、Bは貸し出す本の多様性を確保することだと述べている。",
      "Aは利用者が読書を楽しめる環境を作ることだと述べ、Bは書店よりも新しい本をそろえることだと述べている。"
    ],
    correctIndex: 2,
    targetWord: "Aは利用者に読書に親しんでもらうことだと述べ、Bは貸し出す本の多様性を確保することだと述べている",
    reading: "としょかんのやくわり",
    meaningEn: "A says it is to help users enjoy reading, while B says it is to ensure diversity of books",
    translationId: "Bagaimana A dan B menjelaskan peran perpustakaan umum? → A menyatakan perannya adalah membuat masyarakat akrab dan senang membaca buku, sedangkan B menyatakan perannya adalah memastikan keberagaman jenis buku yang tersedia.",
    notes: "A: 「多くの人々に読書のきっかけを与え、本を読む楽しさや喜びを感じてもらうようにする役割」; B: 「学問的に価値のある本や手に入りにくい本など、さまざまな種類の本を一冊でも多くそろえていること」."
  },

  // 問題 13 (No. 71 - 73: 長文読解「デザイナーのアイディアと感動の森」)
  {
    num: 71,
    mondai: 13,
    passageHtml: PASSAGE_N2_MONDAI_13,
    prompt: "71　<u>感動したことを現代に持ち帰ってくる</u>とは、どのようなことか。",
    options: [
      "感動したシーンを人に語る。",
      "感動した記憶をデザインに生かす。",
      "過去に流行したデザインをコピーする。",
      "人が感動したことからデザインのヒントをもらう。"
    ],
    correctIndex: 1,
    targetWord: "感動した記憶をデザインに生かす",
    reading: "かんどうしたきおくをデザインにいかす",
    meaningEn: "utilizing memories of being deeply moved in one's designs",
    translationId: "Apa yang dimaksud dengan 'membawa pulang hal yang menggetarkan hati ke masa kini'? → Memanfaatkan ingatan/kenangan yang mengharukan di masa lalu ke dalam desain saat ini.",
    notes: "Kalimat berikutnya menjelaskan: 「過去の中で感動したことをコピーして、それをデザインしているのです。」 dan 「そうした感動の思い出を大切に持ち帰ってきて、いまあるものとコラボレーションすると、新商品が生まれます。」"
  },
  {
    num: 72,
    mondai: 13,
    passageHtml: PASSAGE_N2_MONDAI_13,
    prompt: "72　感動について、筆者の考えに合うのはどれか。",
    options: [
      "感動は周囲の力でしかつくられない。",
      "感動したことは年を取るにつれて思い出せなくなる。",
      "周囲の力でつくられた感動は記憶に残りやすい。",
      "心の底から感動したことは鮮明な思い出となる。"
    ],
    correctIndex: 3,
    targetWord: "心の底から感動したことは鮮明な思い出となる",
    reading: "こころのそこからかんどうしたこと",
    meaningEn: "things that deeply move you from the bottom of your heart become vivid memories",
    translationId: "Manakah yang sesuai dengan pemikiran penulis mengenai rasa haru/kagum (感動)? → Hal yang menyentuh dari lubuk hati terdalam akan menjadi kenangan yang tajam dan jelas.",
    notes: "Paragraf 2 & 4: 「感動すると、それくらい記憶装置が自動的に働いて、すべてを映し込んでいる」「なぜ、もやーっとするかと言えば、心の底から感動していないからです。」"
  },
  {
    num: 73,
    mondai: 13,
    passageHtml: PASSAGE_N2_MONDAI_13,
    prompt: "73　アイディアについて、筆者はどのように考えているか。",
    options: [
      "記憶が強いほど、アイデアが生まれやすくなる。",
      "他人の力を上手に利用することで、アイディアが商品につながる。",
      "感動した思い出が豊富であるほど、多くのアイディアが生まれる。",
      "感動をヒト・コト・モノに分けて考えると、いいアイディアが生まれる。"
    ],
    correctIndex: 2,
    targetWord: "感動した思い出が豊富であるほど、多くのアイディアが生まれる",
    reading: "かんどうしたおもいでがほうふであるほど",
    meaningEn: "the richer one's treasury of moving memories, the more ideas spring forth",
    translationId: "Bagaimana pemikiran penulis mengenai ide (アイディア)? → Semakin kaya kenangan indah yang menggetarkan hati yang dimiliki seseorang, semakin banyak ide yang lahir.",
    notes: "Paragraf terakhir: 「そういうヒト・コト・モノとのよき思い出の引き出しをどれだけ持っているかによって、アイディアの湧き出る量は変わるのです。」"
  },

  // 問題 14 (No. 74 - 75: 情報検索「ミハマホテル ビュッフェのご案内」)
  {
    num: 74,
    mondai: 14,
    passageHtml: PASSAGE_N2_MONDAI_14,
    prompt: "74　ユンさんは、来週ミハマホテルのビュッフェに行きたいと考えている。金曜か土曜の12時から17時の間で、2時間いられるものがいい。ユンさんの希望に合うビュッフェはどれか。",
    options: [
      "「ベルン」のランチビュッフェ",
      "「ベルン」のデザートビュッフェ",
      "「ベルン」の夕食ビュッフェ",
      "「みよし」のランチビュッフェ"
    ],
    correctIndex: 3,
    targetWord: "「みよし」のランチビュッフェ",
    reading: "みよしのランチビュッフェ",
    meaningEn: "Lunch Buffet at 'Miyoshi' (Sat/Sun/Holidays 11:00-16:00, 2-hour limit)",
    translationId: "Yoon-san ingin pergi ke prasmanan Hotel Mihama minggu depan pada hari Jumat atau Sabtu antara pukul 12:00–17:00, dan ingin paket yang berdurasi 2 jam. Manakah yang sesuai? → Lunch Buffet 'Miyoshi'.",
    notes: "Syarat Yoon-san: Jumat/Sabtu pukul 12:00–17:00 dan durasi 2 jam. Pada restoran ベルン, ランチ hanya 90 menit, デザート hanya 60 menit, dan 夕食 mulai pukul 18:00. Sedangkan ランチ di みよし buka hari Sabtu (土日・祝日のみ) pukul 11:00–16:00 dengan batas waktu 2 jam (制限時間2時間)."
  },
  {
    num: 75,
    mondai: 14,
    passageHtml: PASSAGE_N2_MONDAI_14,
    prompt: "75　エンリケさんは、今度の土曜日に妻と一緒にレストラン「ベルン」の夕食ビュッフェに行き、「窓際特別テーブル」を利用したい。エンリケさんは63歳、妻は66歳である。エンリケさんたちの料金はどのようになるか。",
    options: [
      "エンリケさん 6,000円、妻 6,000円のみ",
      "エンリケさん 6,000円、妻 6,000円、テーブル料金 1,000円",
      "エンリケさん 6,000円、妻 5,500円、テーブル料金 1,000円",
      "エンリケさん 5,500円、妻 5,000円、テーブル料金 1,000円"
    ],
    correctIndex: 2,
    targetWord: "エンリケさん 6,000円、妻 5,500円、テーブル料金 1,000円",
    reading: "ろくせんえん・ごせんごひゃくえん・せんえん",
    meaningEn: "Enrique 6,000 yen (Adult), Wife 5,500 yen (Senior 65+), Table fee 1,000 yen",
    translationId: "Enrique-san (63 tahun) dan istrinya (66 tahun) ingin makan malam prasmanan di 'Bern' pada hari Sabtu dan memesan 'Meja Khusus Tepi Jendela'. Berapa rincian biayanya? → Enrique-san 6.000 yen, istri 5.500 yen, biaya meja 1.000 yen.",
    notes: "Hari Sabtu (土日・祝日) 夕食 di ベルン: Enrique-san (63 tahun = おとな [SMP〜64 tahun]) = 6.000円; Istri (66 tahun = シニア [65 tahun ke atas]) = 5.500円; ditambah 窓際特別テーブル (1テーブル 2〜4名様) = 1.000円."
  }
];

// ============================================================================
// 第3部：聴解 (31 Soal, 50 Menit: 問題 1 [5], 問題 2 [6], 問題 3 [5], 問題 4 [11], 問題 5 [4])
// ============================================================================

interface Raw2016N2ListeningItem {
  num: number; // 1..31
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

const LISTENING_N2_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5, { ja: string; id: string }> = {
  1: {
    ja: "問題 1：問題 1では、まず質問を聞いてください。それから話を聞いて、問題用紙の 1から 4の中から、最もよいものを一つ選んでください。",
    id: "Mondai 1 — Pemahaman Tugas (Dengarkan pertanyaan, lalu pilih tindakan yang harus dilakukan selanjutnya)"
  },
  2: {
    ja: "問題 2：問題 2では、まず質問を聞いてください。そのあと、問題用紙のせんたくしを読んでください。それから話を聞いて、問題用紙の 1から 4の中から、最もよいものを一つ選んでください。",
    id: "Mondai 2 — Pemahaman Poin Kunci (Dengarkan alasan/poin utama yang ditanyakan)"
  },
  3: {
    ja: "問題 3：問題 3では、問題用紙に何もいんさつされていません。全体としてどんな内容かを聞く問題です。まず話を聞いてください。それから、質問とせんたくしを聞いて、1から 4の中から、最もよいものを一つ選んでください。",
    id: "Mondai 3 — Pemahaman Garis Besar (Dengarkan monolog/dialog, lalu pilih tema atau maksud utama pembicara)"
  },
  4: {
    ja: "問題 4：問題 4では、問題用紙に何もいんさつされていません。まず文を聞いてください。それから、それに対する返事を聞いて、1から 3の中から、最もよいものを一つ選んでください。",
    id: "Mondai 4 — Respons Cepat N2 (Dengarkan kalimat pendek dan pilih balasan terbaik dari 3 opsi)"
  },
  5: {
    ja: "問題 5：問題 5では、長めの話を聞きます。問題用紙にメモをとってもかまいません。話を聞いて、最もよいものを一つ選んでください。",
    id: "Mondai 5 — Pemahaman Terpadu / 統合理解 (Dengarkan diskusi/penjelasan panjang lalu jawab pertanyaan keputusan akhir)"
  }
};

const RAW_2016_N2_LISTENING: Raw2016N2ListeningItem[] = [
  // ==================== 問題 1 (1番 - 5番: 5問) ====================
  {
    num: 1,
    mondai: 1,
    questionLabelJa: "1番",
    prompt: "会社で男の先輩と女の後輩が話しています。女の後輩はこのあとまず何をしなければなりませんか。",
    options: [
      "先週の会議の記録を作成する",
      "調査結果を入力する",
      "林さんに電話をする",
      "プレゼンのしりょうを作成する"
    ],
    correctIndex: 1,
    audioText:
      "会社で男の先輩と女の後輩が話しています。女の後輩はこのあとまず何をしなければなりませんか。女：先輩、先週の会議の記録、作成できました。男：ありがとう。じゃあ、アンケートの調査結果の入力をお願いできる？女：はい。あの、林さんへの電話と来週のプレゼンの資料はどうしましょうか。男：林さんには僕が電話しておくよ。プレゼンの資料は、調査結果のデータがそろってからでいいから、まずは入力を先に頼むね。女：わかりました。女の後輩はこのあとまず何をしなければなりませんか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "会社で男の先輩と女の後輩が話しています。女の後輩はこのあとまず何をしなければなりませんか。" },
      { speaker: "Kouhai (Wanita)", gender: "female", text: "先輩、先週の会議の記録、作成できました。" },
      { speaker: "Senpai (Pria)", gender: "male", text: "ありがとう。じゃあ、アンケートの調査結果の入力をお願いできる？" },
      { speaker: "Kouhai (Wanita)", gender: "female", text: "はい。あの、林さんへの電話と来週のプレゼンの資料はどうしましょうか。" },
      { speaker: "Senpai (Pria)", gender: "male", text: "林さんには僕が電話しておくよ。プレゼンの資料は、調査結果のデータがそろってからでいいから、まずは入力を先に頼むね。" },
      { speaker: "Kouhai (Wanita)", gender: "female", text: "わかりました。" },
      { speaker: "Narator", gender: "female", text: "女の後輩はこのあとまず何をしなければなりませんか。" }
    ],
    targetWord: "調査結果を入力する",
    reading: "ちょうさけっかをにゅうりょくする",
    meaningEn: "input the survey results",
    translationId: "Junior wanita sudah selesai membuat notula rapat minggu lalu, telepon ke Hayashi-san dilakukan oleh senior pria, dan materi presentasi dibuat setelah data hasil survei diinput terlebih dahulu.",
    notes: "Kata kunci: 「まずは入力を先に頼むね」 → 調査結果を入力する."
  },
  {
    num: 2,
    mondai: 1,
    questionLabelJa: "2番",
    prompt: "図書館で男の学生と図書館の人が話しています。男の学生は今日いくら払わなければなりませんか。",
    options: ["2000円", "1000円", "900円", "100円"],
    correctIndex: 2,
    audioText:
      "図書館で男の学生と図書館の人が話しています。男の学生は今日いくら払わなければなりませんか。男：すみません、借りていたこの本、コーヒーをこぼして汚してしまったんですが…。女：ああ、これだと買い直しになりますので、本の代金として2000円いただくことになります。ただ、学生さんは図書保険に入っていますので、半額の1000円になります。男：そうですか。あ、先月申請した時にデポジットとして100円払っているんですが。女：はい、ではその100円を引いた金額を今日お支払いください。男の学生は今日いくら払わなければなりませんか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "図書館で男の学生と図書館の人が話しています。男の学生は今日いくら払わなければなりませんか。" },
      { speaker: "Mahasiswa", gender: "male", text: "すみません、借りていたこの本、コーヒーをこぼして汚してしまったんですが…。" },
      { speaker: "Petugas Perpustakaan", gender: "female", text: "ああ、これだと買い直しになりますので、本の代金として2000円いただくことになります。ただ、学生さんは図書保険に入っていますので、半額の1000円になります。" },
      { speaker: "Mahasiswa", gender: "male", text: "そうですか。あ、先月申請した時にデポジットとして100円払っているんですが。" },
      { speaker: "Petugas Perpustakaan", gender: "female", text: "はい、ではその100円を引いた金額を今日お支払いください。" },
      { speaker: "Narator", gender: "male", text: "男の学生は今日いくら払わなければなりませんか。" }
    ],
    targetWord: "900円",
    reading: "きゅうひゃくえん",
    meaningEn: "900 yen",
    translationId: "Harga buku 2.000 yen, ditanggung setengah oleh asuransi perpustakaan mahasiswa menjadi 1.000 yen, dikurangi deposit 100 yen = 900 yen.",
    notes: "2000円 ÷ 2 (半額) = 1000円 − 100円 = 900円."
  },
  {
    num: 3,
    mondai: 1,
    questionLabelJa: "3番",
    prompt: "市役所の駐輪場で女の学生と係の人が話しています。女の学生はこのあとまず何をしなければなりませんか。",
    options: [
      "ちゅうりんじょうで張り紙を見る",
      "大学でしんせいしょのじゅんびをする",
      "市役所にしんせいしょを取りに行く",
      "市役所でがくせいしょうをコピーする"
    ],
    correctIndex: 3,
    audioText:
      "市役所の駐輪場で女の学生と係の人が話しています。女の学生はこのあとまず何をしなければなりませんか。女：すみません、来月からこの駐輪場を定期利用したいんですが、どうすればいいですか。男：申請書はもう書いてありますか。女：はい、大学の掲示板の案内を見て、申請書は記入して持ってきました。学生証もあります。男：学生証のコピーも必要なんですよ。隣の市役所のロビーにコピー機がありますから、先にコピーを取ってきてください。女の学生はこのあとまず何をしなければなりませんか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "市役所の駐輪場で女の学生と係の人が話しています。女の学生はこのあとまず何をしなければなりませんか。" },
      { speaker: "Mahasiswi", gender: "female", text: "すみません、来月からこの駐輪場を定期利用したいんですが、どうすればいいですか。" },
      { speaker: "Petugas", gender: "male", text: "申請書はもう書いてありますか。" },
      { speaker: "Mahasiswi", gender: "female", text: "はい、大学の掲示板の案内を見て、申請書は記入して持ってきました。学生証もあります。" },
      { speaker: "Petugas", gender: "male", text: "学生証のコピーも必要なんですよ。隣の市役所のロビーにコピー機がありますから、先にコピーを取ってきてください。" },
      { speaker: "Narator", gender: "female", text: "女の学生はこのあとまず何をしなければなりませんか。" }
    ],
    targetWord: "市役所でがくせいしょうをコピーする",
    reading: "しやくしょでがくせいしょうをコピーする",
    meaningEn: "photocopy her student ID card at city hall",
    translationId: "Formulir pendaftaran sudah diisi dan dibawa, tetapi masih perlu fotokopi kartu mahasiswa di lobi balai kota sebelah.",
    notes: "「隣の市役所のロビーにコピー機がありますから、先にコピーを取ってきてください」 → 市役所でがくせいしょうをコピーする."
  },
  {
    num: 4,
    mondai: 1,
    questionLabelJa: "4番",
    prompt: "男の人と女の人が登山の準備について話しています。男の人はまず何をしますか。",
    options: [
      "インターネットで店をさがす",
      "木村さんに道具を借りる",
      "アウトドア用品の店で道具を買う",
      "初心者向けのこうざに参加する"
    ],
    correctIndex: 1,
    audioText:
      "男の人と女の人が登山の準備について話しています。男の人はまず何をしますか。男：来月初めて登山に行くんだけど、まず道具を買いに行こうと思って。ネットでアウトドア用品の店を探してるんだ。女：最初から全部買うと高いわよ。一回行ってみて、続けられそうなら買えば？木村さんがよく山に登ってるから、リュックとか借りられるか聞いてみたら？男：なるほどね。じゃあ買う前にまず木村さんに相談してみるよ。女：あと、来週初心者向けの登山講座もあるから、後で教えるね。男の人はまず何をしますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "男の人と女の人が登山の準備について話しています。男の人はまず何をしますか。" },
      { speaker: "Pria", gender: "male", text: "来月初めて登山に行くんだけど、まず道具を買いに行こうと思って。ネットでアウトドア用品の店を探してるんだ。" },
      { speaker: "Wanita", gender: "female", text: "最初から全部買うと高いわよ。一回行ってみて、続けられそうなら買えば？木村さんがよく山に登ってるから、リュックとか借りられるか聞いてみたら？" },
      { speaker: "Pria", gender: "male", text: "なるほどね。じゃあ買う前にまず木村さんに相談してみるよ。" },
      { speaker: "Wanita", gender: "female", text: "あと、来週初心者向けの登山講座もあるから、後で教えるね。" },
      { speaker: "Narator", gender: "male", text: "男の人はまず何をしますか。" }
    ],
    targetWord: "木村さんに道具を借りる",
    reading: "きむらさんにどうぐをかりる",
    meaningEn: "borrow equipment from Kimura-san",
    translationId: "Sebelum membeli peralatan yang mahal, pria itu memutuskan untuk meminjam peralatan terlebih dahulu kepada Kimura-san.",
    notes: "「じゃあ買う前にまず木村さんに相談してみるよ」 → 木村さんに道具を借りる."
  },
  {
    num: 5,
    mondai: 1,
    questionLabelJa: "5番",
    prompt: "食品会社で女の上司と男の部下が話しています。男の部下はこのあとまず何をしなければなりませんか。",
    options: [
      "工場のかんりのじょうきょうを調べる",
      "けいやくのうかにじょうきょうを聞く",
      "運送会社にじょうきょうを聞く",
      "そうこのほぞんじょうきょうを調べる"
    ],
    correctIndex: 2,
    audioText:
      "食品会社で女の上司と男の部下が話しています。男の部下はこのあとまず何をしなければなりませんか。男：課長、さっき取引先のスーパーから連絡があって、今日納品した野菜の一部が傷んでいたそうです。女：えっ、本当？工場の管理状況と倉庫の保存状況は確認した？男：はい、工場も倉庫も問題ありませんでした。契約農家から届いた時点でも新鮮でした。女：そう。じゃあ配送中の温度管理に問題があったのかもしれないわね。すぐに運送会社に連絡して状況を聞いてみて。男：わかりました、すぐ確認します。男の部下はこのあとまず何をしなければなりませんか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "食品会社で女の上司と男の部下が話しています。男の部下はこのあとまず何をしなければなりませんか。" },
      { speaker: "Bawahan (Pria)", gender: "male", text: "課長、さっき取引先のスーパーから連絡があって、今日納品した野菜の一部が傷んでいたそうです。" },
      { speaker: "Kepala Seksi (Wanita)", gender: "female", text: "えっ、本当？工場の管理状況と倉庫の保存状況は確認した？" },
      { speaker: "Bawahan (Pria)", gender: "male", text: "はい、工場も倉庫も問題ありませんでした。契約農家から届いた時点でも新鮮でした。" },
      { speaker: "Kepala Seksi (Wanita)", gender: "female", text: "そう。じゃあ配送中の温度管理に問題があったのかもしれないわね。すぐに運送会社に連絡して状況を聞いてみて。" },
      { speaker: "Bawahan (Pria)", gender: "male", text: "わかりました、すぐ確認します。" },
      { speaker: "Narator", gender: "female", text: "男の部下はこのあとまず何をしなければなりませんか。" }
    ],
    targetWord: "運送会社にじょうきょうを聞く",
    reading: "うんそうがいしゃにじょうきょうをきく",
    meaningEn: "ask the shipping company about the situation",
    translationId: "Karena pabrik, gudang, dan petani mitra sudah diperiksa dan tidak bermasalah, bawahan pria harus segera menghubungi perusahaan ekspedisi/pengiriman.",
    notes: "「すぐに運送会社に連絡して状況を聞いてみて」 → 運送会社にじょうきょうを聞く."
  },

  // ==================== 問題 2 (1番 - 6番: 6問) ====================
  {
    num: 6,
    mondai: 2,
    questionLabelJa: "1番",
    prompt: "警察官が地域の住民の家を訪ねています。警察官が今日来た一番の目的は何ですか。",
    options: [
      "近所で起こった事件について調べるため",
      "さいがい時のひなん場所を知らせるため",
      "どこにだれが住んでいるのか知るため",
      "たんとうちいきの住民にあいさつするため"
    ],
    correctIndex: 2,
    audioText:
      "警察官が地域の住民の家を訪ねています。警察官が今日来た一番の目的は何ですか。男：こんにちは。先月からこの地区の担当になりました警察官の田中です。女：ああ、ご苦労様です。近くで何か事件でもあったんですか。男：いいえ、そうではありません。災害が起きた時などにすぐ対応できるように、どの家にどなたが住んでいらっしゃるか把握するために回っているんです。よろしければこちらのカードにご家族のお名前と連絡先をご記入いただけますか。警察官が今日来た一番の目的は何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "警察官が地域の住民の家を訪ねています。警察官が今日来た一番の目的は何ですか。" },
      { speaker: "Polisi", gender: "male", text: "こんにちは。先月からこの地区の担当になりました警察官の田中です。" },
      { speaker: "Warga", gender: "female", text: "ああ、ご苦労様です。近くで何か事件でもあったんですか。" },
      { speaker: "Polisi", gender: "male", text: "いいえ、そうではありません。災害が起きた時などにすぐ対応できるように、どの家にどなたが住んでいらっしゃるか把握するために回っているんです。よろしければこちらのカードにご家族のお名前と連絡先をご記入いただけますか。" },
      { speaker: "Narator", gender: "male", text: "警察官が今日来た一番の目的は何ですか。" }
    ],
    targetWord: "どこにだれが住んでいるのか知るため",
    reading: "どこにだれがすんでいるのかしるため",
    meaningEn: "to know who lives where",
    translationId: "Polisi berkeliling untuk mendata siapa yang tinggal di setiap rumah agar dapat merespons cepat jika terjadi bencana.",
    notes: "「どの家にどなたが住んでいらっしゃるか把握するために回っているんです」 ＝ どこにだれが住んでいるのか知るため."
  },
  {
    num: 7,
    mondai: 2,
    questionLabelJa: "2番",
    prompt: "大学で女の学生と先生が教育実習について話しています。女の学生は授業で何が一番問題だったと言っていますか。",
    options: [
      "きんちょうして落ち着きがなかったこと",
      "話の進み方が適当でなかったこと",
      "声が小さくて聞き取りにくかったこと",
      "質問への対応がよくなかったこと"
    ],
    correctIndex: 3,
    audioText:
      "大学で女の学生と先生が教育実習について話しています。女の学生は授業で何が一番問題だったと言っていますか。男：高校での教育実習、どうだった？最初は緊張して声が小さくなるんじゃないかと心配していたよね。女：はい、でも本番では落ち着いて大きな声で話せましたし、授業の進め方も予定通りにできました。ただ、生徒から予想外の質問が出た時に、うまく答えられなくて焦ってしまって…。それが一番の反省点です。女の学生は授業で何が一番問題だったと言っていますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "大学で女の学生と先生が教育実習について話しています。女の学生は授業で何が一番問題だったと言っていますか。" },
      { speaker: "Dosen", gender: "male", text: "高校での教育実習、どうだった？最初は緊張して声が小さくなるんじゃないかと心配していたよね。" },
      { speaker: "Mahasiswi", gender: "female", text: "はい、でも本番では落ち着いて大きな声で話せましたし、授業の進め方も予定通りにできました。ただ、生徒から予想外の質問が出た時に、うまく答えられなくて焦ってしまって…。それが一番の反省点です。" },
      { speaker: "Narator", gender: "female", text: "女の学生は授業で何が一番問題だったと言っていますか。" }
    ],
    targetWord: "質問への対応がよくなかったこと",
    reading: "しつもんへのたいおうがよくなかったこと",
    meaningEn: "her response to questions was not good",
    translationId: "Saat praktik mengajar, yang menjadi masalah utama bagi mahasiswi adalah tidak bisa menjawab dengan baik ketika muncul pertanyaan tak terduga dari siswa.",
    notes: "「生徒から予想外の質問が出た時に、うまく答えられなくて…それが一番の反省点です」 → 質問への対応がよくなかったこと."
  },
  {
    num: 8,
    mondai: 2,
    questionLabelJa: "3番",
    prompt: "レストランの店長と女の店員が話しています。どうして来週の開店日を延期することにしましたか。",
    options: [
      "スタッフの数がそろっていないから",
      "店の工事が間に合わないから",
      "メニューが決まっていないから",
      "注文した食器がとどいていないから"
    ],
    correctIndex: 3,
    audioText:
      "レストランの店長と女の店員が話しています。どうして来週の開店日を延期することにしましたか。女：店長、新しいお店のオープン、来週から再来週に延期になったって本当ですか。内装の工事が遅れているんですか。男：いや、工事は昨日終わったし、アルバイトのスタッフもメニューも全部そろってるんだ。ただ、海外に特注したお皿やグラスが船便の遅れで来週までに届かないことがわかってね。それがないと料理が出せないから。どうして来週の開店日を延期することにしましたか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "レストランの店長と女の店員が話しています。どうして来週の開店日を延期することにしましたか。" },
      { speaker: "Staf (Wanita)", gender: "female", text: "店長、新しいお店のオープン、来週から再来週に延期になったって本当ですか。内装の工事が遅れているんですか。" },
      { speaker: "Manajer (Pria)", gender: "male", text: "いや、工事は昨日終わったし、アルバイトのスタッフもメニューも全部そろってるんだ。ただ、海外に特注したお皿やグラスが船便の遅れで来週までに届かないことがわかってね。それがないと料理が出せないから。" },
      { speaker: "Narator", gender: "male", text: "どうして来週の開店日を延期することにしましたか。" }
    ],
    targetWord: "注文した食器がとどいていないから",
    reading: "ちゅうもんしたしょっきがとどいていないから",
    meaningEn: "because the ordered tableware has not arrived",
    translationId: "Pembukaan restoran ditunda karena piring dan gelas pesanan khusus dari luar negeri terlambat tiba.",
    notes: "「特注したお皿やグラスが船便の遅れで来週までに届かない」 ＝ 注文した食器がとどいていないから."
  },
  {
    num: 9,
    mondai: 2,
    questionLabelJa: "4番",
    prompt: "テレビで専門家が『ぼんやりする時間』について話しています。専門家はなぜぼんやりする時間が必要だと言っていますか。",
    options: [
      "考え事をするため",
      "頭の中を整理するため",
      "のうを休めるため",
      "体をリラックスさせるため"
    ],
    correctIndex: 1,
    audioText:
      "テレビで専門家が『ぼんやりする時間』について話しています。専門家はなぜぼんやりする時間が必要だと言っていますか。男：皆さんは毎日忙しく働いていて、何もしないでぼんやりする時間は無駄だと思っていませんか。また、ぼんやりしている時は脳が休まっていると思われがちですが、実はそうではありません。脳はぼんやりしている間に、それまでに得たたくさんの記憶や情報を分類し、頭の中を整理しているのです。ですから、一日に少しはぼんやりする時間を作ることが大切です。専門家はなぜぼんやりする時間が必要だと言っていますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "テレビで専門家が『ぼんやりする時間』について話しています。専門家はなぜぼんやりする時間が必要だと言っていますか。" },
      { speaker: "Pakar", gender: "male", text: "皆さんは毎日忙しく働いていて、何もしないでぼんやりする時間は無駄だと思っていませんか。また、ぼんやりしている時は脳が休まっていると思われがちですが、実はそうではありません。脳はぼんやりしている間に、それまでに得たたくさんの記憶や情報を分類し、頭の中を整理しているのです。ですから、一日に少しはぼんやりする時間を作ることが大切です。" },
      { speaker: "Narator", gender: "female", text: "専門家はなぜぼんやりする時間が必要だと言っていますか。" }
    ],
    targetWord: "頭の中を整理するため",
    reading: "あたまのなかをせいりするため",
    meaningEn: "to organize information inside one's head",
    translationId: "Saat melamun/santai sejenak, otak bukan sedang berhenti, melainkan sedang mengelompokkan ingatan dan merapikan informasi di dalam kepala.",
    notes: "「それまでに得たたくさんの記憶や情報を分類し、頭の中を整理しているのです」 → 頭の中を整理するため."
  },
  {
    num: 10,
    mondai: 2,
    questionLabelJa: "5番",
    prompt: "ラジオで大学の教授が最近の科学研究について話しています。教授が心配していることは何ですか。",
    options: [
      "すぐに社会に役立つ研究が少ないこと",
      "産業界の協力が得られなくなること",
      "実用化までに時間がかかりすぎること",
      "きそ研究がじゅうしされなくなること"
    ],
    correctIndex: 3,
    audioText:
      "ラジオで大学の教授が最近の科学研究について話しています。教授が心配していることは何ですか。男：最近は大学と企業が協力して、すぐに新製品や実用化につながる研究が盛んに行われています。社会にすぐ役立つ研究はもちろん大切ですが、その一方で、すぐには利益につながらない基礎研究の予算が減らされ、軽視される傾向があります。基礎研究という土台がなければ、将来の大きな発見は生まれませんから、この状況を大変危惧しています。教授が心配していることは何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "ラジオで大学の教授が最近の科学研究について話しています。教授が心配していることは何ですか。" },
      { speaker: "Profesor", gender: "male", text: "最近は大学と企業が協力して、すぐに新製品や実用化につながる研究が盛んに行われています。社会にすぐ役立つ研究はもちろん大切ですが、その一方で、すぐには利益につながらない基礎研究の予算が減らされ、軽視される傾向があります。基礎研究という土台がなければ、将来の大きな発見は生まれませんから、この状況を大変危惧しています。" },
      { speaker: "Narator", gender: "male", text: "教授が心配していることは何ですか。" }
    ],
    targetWord: "きそ研究がじゅうしされなくなること",
    reading: "きそけんきゅうがじゅうしされなくなること",
    meaningEn: "basic research no longer being valued/emphasized",
    translationId: "Profesor mengkhawatirkan kecenderungan berkurangnya anggaran dan diabaikannya riset dasar (基礎研究) yang tidak langsung menghasilkan keuntungan instan.",
    notes: "「基礎研究の予算が減らされ、軽視される傾向があります」 ＝ きそ研究がじゅうしされなくなること."
  },
  {
    num: 11,
    mondai: 2,
    questionLabelJa: "6番",
    prompt: "電気店で女の店員が新しい照明器具について説明しています。この商品の新しい特徴は何ですか。",
    options: [
      "電気をつけておく時間が設定できる",
      "動くものに反応して電気がつく",
      "電気の明るさが細かくちょうせつできる",
      "外の明るさに応じて電気の明るさが変わる"
    ],
    correctIndex: 3,
    audioText:
      "電気店で女の店員が新しい照明器具について説明しています。この商品の新しい特徴は何ですか。女：こちらは今月発売された最新のLED照明です。タイマー機能や、人が通るとセンサーが反応してつく機能、またリモコンで明るさを細かく調節できる機能は従来のモデルにもありましたが、今回の新製品は窓から入る外の光の量をセンサーが感知して、昼間は自動で少し暗めに、夕方から夜にかけては自動で明るくなるよう調整してくれるんです。この商品の新しい特徴は何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "電気店で女の店員が新しい照明器具について説明しています。この商品の新しい特徴は何ですか。" },
      { speaker: "Pramuniaga (Wanita)", gender: "female", text: "こちらは今月発売された最新のLED照明です。タイマー機能や、人が通るとセンサーが反応してつく機能、またリモコンで明るさを細かく調節できる機能は従来のモデルにもありましたが、今回の新製品は窓から入る外の光の量をセンサーが感知して、昼間は自動で少し暗めに、夕方から夜にかけては自動で明るくなるよう調整してくれるんです。" },
      { speaker: "Narator", gender: "female", text: "この商品の新しい特徴は何ですか。" }
    ],
    targetWord: "外の明るさに応じて電気の明るさが変わる",
    reading: "そとのあかるさにおうじてでんきのあかるさがかわる",
    meaningEn: "the brightness of the light changes automatically according to outside brightness",
    translationId: "Fitur baru lampu LED ini adalah sensor yang mendeteksi cahaya luar dari jendela dan mengubah tingkat kecerahan lampu secara otomatis.",
    notes: "「窓から入る外の光の量をセンサーが感知して…自動で明るくなるよう調整してくれる」 → 外の明るさに応じて電気の明るさが変わる."
  },

  // ==================== 問題 3 (1番 - 5番: 5問・概要理解) ====================
  {
    num: 12,
    mondai: 3,
    questionLabelJa: "1番",
    prompt: "講演会で作家が話しています。作家は何について話していますか。",
    options: [
      "小説のテーマの見つけ方",
      "小説を書き始めたきっかけ",
      "朝に執筆することの良さ",
      "健康を維持するための運動"
    ],
    correctIndex: 2,
    audioText:
      "講演会で作家が話しています。女：小説家というと、夜中にコーヒーを飲みながら書いているイメージがあるかもしれませんが、私は毎日朝5時に起きて午前中だけ書くようにしています。以前は夜遅くまで書いていたんですが、どうしても疲れがたまって文章が暗くなりがちでした。朝に切り替え、太陽の光を浴びながら書くようになってからは、頭がすっきりして筆も進みますし、前向きな表現が自然と出てくるようになったんです。作家は何について話していますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "講演会で作家が話しています。" },
      { speaker: "Penulis (Wanita)", gender: "female", text: "小説家というと、夜中にコーヒーを飲みながら書いているイメージがあるかもしれませんが、私は毎日朝5時に起きて午前中だけ書くようにしています。以前は夜遅くまで書いていたんですが、どうしても疲れがたまって文章が暗くなりがちでした。朝に切り替え、太陽の光を浴びながら書くようになってからは、頭がすっきりして筆も進みますし、前向きな表現が自然と出てくるようになったんです。" },
      { speaker: "Narator", gender: "male", text: "作家は何について話していますか。" }
    ],
    targetWord: "朝に執筆することの良さ",
    reading: "あさにしっぴつすることのよさ",
    meaningEn: "the benefits of writing in the morning",
    translationId: "Penulis menceritakan manfaat beralih menulis novel di pagi hari dibanding larut malam.",
    notes: "Inti monolog: kelebihan/manfaat menulis karya di pagi hari (朝に執筆することの良さ)."
  },
  {
    num: 13,
    mondai: 3,
    questionLabelJa: "2番",
    prompt: "テレビでアナウンサーが地域の商店街について話しています。何について話していますか。",
    options: [
      "新しい客を増やすための取り組み",
      "商店街の歴史と伝統",
      "高齢者の買い物を支援するサービス",
      "若い店主がオープンした店の紹介"
    ],
    correctIndex: 2,
    audioText:
      "テレビでアナウンサーが地域の商店街について話しています。男：緑町の商店街では先月から、地域の高齢者向けに新しい取り組みを始めました。坂道が多くて買い物に来るのが大変だというお年寄りの声を受け、電話一本で商店街のいろいろな店の商品をまとめて自宅まで届けるサービスです。配達するスタッフが直接顔を合わせて声をかけることで、一人暮らしの高齢者の見守りにもつながっていると好評です。何について話していますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "テレビでアナウンサーが地域の商店街について話しています。" },
      { speaker: "Penyiar", gender: "male", text: "緑町の商店街では先月から、地域の高齢者向けに新しい取り組みを始めました。坂道が多くて買い物に来るのが大変だというお年寄りの声を受け、電話一本で商店街のいろいろな店の商品をまとめて自宅まで届けるサービスです。配達するスタッフが直接顔を合わせて声をかけることで、一人暮らしの高齢者の見守りにもつながっていると好評です。" },
      { speaker: "Narator", gender: "female", text: "何について話していますか。" }
    ],
    targetWord: "高齢者の買い物を支援するサービス",
    reading: "こうれいしゃのかいものをしえんするサービス",
    meaningEn: "a service supporting elderly residents with their shopping",
    translationId: "Penyiar menjelaskan layanan pengantaran belanjaan dari distrik pertokoan untuk membantu warga lansia.",
    notes: "Inti laporan: 高齢者の買い物を支援するサービス."
  },
  {
    num: 14,
    mondai: 3,
    questionLabelJa: "3番",
    prompt: "会社の会議で課長が話しています。課長が一番言いたいことは何ですか。",
    options: [
      "残業時間を減らしてほしい",
      "部署内の情報共有を徹底してほしい",
      "顧客からの苦情にはすぐ対応してほしい",
      "新商品の開発スピードを上げてほしい"
    ],
    correctIndex: 1,
    audioText:
      "会社の会議で課長が話しています。男：最近、担当者しか知らない案件が多くて、担当者が外出している時に取引先から問い合わせがあっても他の人が答えられないというケースが目立ちます。トラブルやクレームだけでなく、普段の業務の進み具合も、チームの共有フォルダに毎日記録してください。誰が休んでも他のメンバーがすぐフォローできる体制を作ることが重要です。課長が一番言いたいことは何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "会社の会議で課長が話しています。" },
      { speaker: "Kepala Seksi", gender: "male", text: "最近、担当者しか知らない案件が多くて、担当者が外出している時に取引先から問い合わせがあっても他の人が答えられないというケースが目立ちます。トラブルやクレームだけでなく、普段の業務の進み具合も、チームの共有フォルダに毎日記録してください。誰が休んでも他のメンバーがすぐフォローできる体制を作ることが重要です。" },
      { speaker: "Narator", gender: "male", text: "課長が一番言いたいことは何ですか。" }
    ],
    targetWord: "部署内の情報共有を徹底してほしい",
    reading: "ぶしょないのじょうほうきょうゆうをてっていしてほしい",
    meaningEn: "wants team members to thoroughly share information within the department",
    translationId: "Kepala seksi meminta seluruh anggota tim mencatat progres kerja harian di folder bersama agar informasi terbagi merata.",
    notes: "Inti arahan: 部署内の情報共有を徹底してほしい."
  },
  {
    num: 15,
    mondai: 3,
    questionLabelJa: "4番",
    prompt: "ラジオで登山家が山の天気について話しています。登山家が伝えたいことは何ですか。",
    options: [
      "山の天気予報の仕組み",
      "雨の日の登山の楽しみ方",
      "天候の変化に備えることの大切さ",
      "初心者におすすめの登山の季節"
    ],
    correctIndex: 2,
    audioText:
      "ラジオで登山家が山の天気について話しています。女：山に登る時、出発前にふもとで晴れているからといって安心してしまう人が多いんですが、山の天気は本当に変わりやすいんです。急に霧が出て視界が悪くなったり、夏でも雨が降って風が強まると冬のように体温が奪われたりします。ですから、どんなに天気が良くても必ず雨具と防寒着をリュックに入れ、少しでも天気が崩れそうなら引き返す勇気を持ってください。登山家が伝えたいことは何ですか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "ラジオで登山家が山の天気について話しています。" },
      { speaker: "Pendaki Gunung", gender: "female", text: "山に登る時、出発前にふもとで晴れているからといって安心してしまう人が多いんですが、山の天気は本当に変わりやすいんです。急に霧が出て視界が悪くなったり、夏でも雨が降って風が強まると冬のように体温が奪われたりします。ですから、どんなに天気が良くても必ず雨具と防寒着をリュックに入れ、少しでも天気が崩れそうなら引き返す勇気を持ってください。" },
      { speaker: "Narator", gender: "female", text: "登山家が伝えたいことは何ですか。" }
    ],
    targetWord: "天候の変化に備えることの大切さ",
    reading: "てんこうのへんかにそなえることのたいせつさ",
    meaningEn: "the importance of preparing for weather changes in the mountains",
    translationId: "Pendaki mengingatkan pentingnya bersiap menghadapi perubahan cuaca di gunung (membawa jas hujan & baju hangat serta berani putar balik).",
    notes: "Inti pesan: 天候の変化に備えることの大切さ."
  },
  {
    num: 16,
    mondai: 3,
    questionLabelJa: "5番",
    prompt: "大学の授業で先生が江戸時代の町の暮らしについて話しています。何について話していますか。",
    options: [
      "江戸時代のリサイクルの仕組み",
      "江戸時代の火事対策",
      "江戸時代の職人の給料",
      "江戸時代の流行のファッション"
    ],
    correctIndex: 0,
    audioText:
      "大学の授業で先生が江戸時代の町の暮らしについて話しています。男：江戸の町では、物は最後まで無駄なく使われていました。例えば、着古した着物は子ども服に仕立て直され、さらにボロボロになるとおむつや雑巾になり、最後は燃やして灰にして肥料や洗剤として売られました。また、壊れた傘や鍋を修理する専門の業者も毎日町を回っていました。現代以上に徹底した循環型社会だったと言えます。何について話していますか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "大学の授業で先生が江戸時代の町の暮らしについて話しています。" },
      { speaker: "Dosen", gender: "male", text: "江戸の町では、物は最後まで無駄なく使われていました。例えば、着古した着物は子ども服に仕立て直され、さらにボロボロになるとおむつや雑巾になり、最後は燃やして灰にして肥料や洗剤として売られました。また、壊れた傘や鍋を修理する専門の業者も毎日町を回っていました。現代以上に徹底した循環型社会だったと言えます。" },
      { speaker: "Narator", gender: "male", text: "何について話していますか。" }
    ],
    targetWord: "江戸時代のリサイクルの仕組み",
    reading: "えどじだいのリサイクルのしくみ",
    meaningEn: "the recycling system in the Edo period",
    translationId: "Dosen menjelaskan sistem daur ulang (recycling) dan masyarakat sirkular pada zaman Edo.",
    notes: "Inti kuliah: 江戸時代のリサイクルの仕組み (循環型社会)."
  },

  // ==================== 問題 4 (1番 - 11番: 11問・即時応答・3選択肢) ====================
  {
    num: 17,
    mondai: 4,
    questionLabelJa: "1番",
    prompt: "「田中さん、頼んでおいた会議の資料、もうできてるに決まってるよね？」",
    options: [
      "すみません、あと10分で終わります。",
      "ええ、私が決めたんですよ。",
      "まだ頼んでいませんけど。"
    ],
    correctIndex: 0,
    audioText:
      "田中さん、頼んでおいた会議の資料、もうできてるに決まってるよね？ 1. すみません、あと10分で終わります。 2. ええ、私が決めたんですよ。 3. まだ頼んでいませんけど。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "田中さん、頼んでおいた会議の資料、もうできてるに決まってるよね？" },
      { speaker: "Opsi 1", gender: "female", text: "1. すみません、あと10分で終わります。" },
      { speaker: "Opsi 2", gender: "female", text: "2. ええ、私が決めたんですよ。" },
      { speaker: "Opsi 3", gender: "female", text: "3. まだ頼んでいませんけど。" }
    ],
    targetWord: "すみません、あと10分で終わります",
    reading: "にきまってる",
    meaningEn: "Sorry, it will be finished in 10 more minutes",
    translationId: "'Tanaka-san, materi rapat yang sudah saya minta pasti sudah selesai, kan?' → 'Maaf, 10 menit lagi selesai.'",
    notes: "～に決まってるよね？ = pasti sudah ..., kan?"
  },
  {
    num: 18,
    mondai: 4,
    questionLabelJa: "2番",
    prompt: "「今度のプロジェクト、佐藤さんがリーダーを引き受けてくれたおかげで、うまくいきそうだね。」",
    options: [
      "佐藤さんに断られたんですか。",
      "まだ誰がやるか決まってないんですね。",
      "本当に頼もしいですよね。"
    ],
    correctIndex: 2,
    audioText:
      "今度のプロジェクト、佐藤さんがリーダーを引き受けてくれたおかげで、うまくいきそうだね。 1. 佐藤さんに断られたんですか。 2. まだ誰がやるか決まってないんですね。 3. 本当に頼もしいですよね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "今度のプロジェクト、佐藤さんがリーダーを引き受けてくれたおかげで、うまくいきそうだね。" },
      { speaker: "Opsi 1", gender: "male", text: "1. 佐藤さんに断られたんですか。" },
      { speaker: "Opsi 2", gender: "male", text: "2. まだ誰がやるか決まってないんですね。" },
      { speaker: "Opsi 3", gender: "male", text: "3. 本当に頼もしいですよね。" }
    ],
    targetWord: "本当に頼もしいですよね",
    reading: "ひきうけてくれたおかげで",
    meaningEn: "He really is reliable/dependable, isn't he?",
    translationId: "'Proyek kali ini, berkat Sato-san bersedia menerima tugas sebagai pemimpin, tampaknya akan berjalan lancar ya.' → 'Benar-benar bisa diandalkan ya.'",
    notes: "引き受ける (menerima tanggung jawab) + おかげで (berkat)."
  },
  {
    num: 19,
    mondai: 4,
    questionLabelJa: "3番",
    prompt: "「あの新しいカフェ、行ってみないことには、おいしいかどうかわからないよ。」",
    options: [
      "じゃあ、今度一緒に行ってみようか。",
      "行かないほうがいいってこと？",
      "もう行って確かめたんだね。"
    ],
    correctIndex: 0,
    audioText:
      "あの新しいカフェ、行ってみないことには、おいしいかどうかわからないよ。 1. じゃあ、今度一緒に行ってみようか。 2. 行かないほうがいいってこと？ 3. もう行って確かめたんだね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "あの新しいカフェ、行ってみないことには、おいしいかどうかわからないよ。" },
      { speaker: "Opsi 1", gender: "female", text: "1. じゃあ、今度一緒に行ってみようか。" },
      { speaker: "Opsi 2", gender: "female", text: "2. 行かないほうがいいってこと？" },
      { speaker: "Opsi 3", gender: "female", text: "3. もう行って確かめたんだね。" }
    ],
    targetWord: "じゃあ、今度一緒に行ってみようか",
    reading: "いってみないことには",
    meaningEn: "Then let's go try it together next time",
    translationId: "'Kafe baru itu, kalau belum mencoba pergi ke sana, kita tidak akan tahu enak atau tidak.' → 'Kalau begitu, kapan-kapan kita coba ke sana bersama yuk.'",
    notes: "～ないことには…ない = kalau belum ..., maka tidak ...."
  },
  {
    num: 20,
    mondai: 4,
    questionLabelJa: "4番",
    prompt: "「すみません、こちらの申込書、今日中に出さないわけにはいかないでしょうか。」",
    options: [
      "はい、今日出していただかなくても結構ですよ。",
      "いえ、今日中に出してはいけないんですよ。",
      "ええ、明日まで待っていただけませんか。"
    ],
    correctIndex: 0,
    audioText:
      "すみません、こちらの申込書、今日中に出さないわけにはいかないでしょうか。 1. はい、今日出していただかなくても結構ですよ。 2. いえ、今日中に出してはいけないんですよ。 3. ええ、明日まで待っていただけませんか。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "すみません、こちらの申込書、今日中に出さないわけにはいかないでしょうか。" },
      { speaker: "Opsi 1", gender: "male", text: "1. はい、今日出していただかなくても結構ですよ。" },
      { speaker: "Opsi 2", gender: "male", text: "2. いえ、今日中に出してはいけないんですよ。" },
      { speaker: "Opsi 3", gender: "male", text: "3. ええ、明日まで待っていただけませんか。" }
    ],
    targetWord: "はい、今日出していただかなくても結構ですよ",
    reading: "ださないわけにはいかないでしょうか",
    meaningEn: "Yes, it is fine even if you don't submit it today",
    translationId: "'Maaf, apakah formulir pendaftaran ini mau tidak mau harus dikumpulkan hari ini juga?' → 'Tidak apa-apa kok meskipun Anda tidak mengumpulkannya hari ini.'",
    notes: "～ないわけにはいかないでしょうか = apakah wajib / harus dilakukan hari ini?"
  },
  {
    num: 21,
    mondai: 4,
    questionLabelJa: "5番",
    prompt: "「昨日のサッカーの試合、見に行けばよかったなあ。」",
    options: [
      "見に行って本当に楽しかったね。",
      "行かなかったの？いい試合だったのに。",
      "行きたくなかったんだね。"
    ],
    correctIndex: 1,
    audioText:
      "昨日のサッカーの試合、見に行けばよかったなあ。 1. 見に行って本当に楽しかったね。 2. 行かなかったの？いい試合だったのに。 3. 行きたくなかったんだね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "昨日のサッカーの試合、見に行けばよかったなあ。" },
      { speaker: "Opsi 1", gender: "female", text: "1. 見に行って本当に楽しかったね。" },
      { speaker: "Opsi 2", gender: "female", text: "2. 行かなかったの？いい試合だったのに。" },
      { speaker: "Opsi 3", gender: "female", text: "3. 行きたくなかったんだね。" }
    ],
    targetWord: "行かなかったの？いい試合だったのに",
    reading: "みにいけばよかったなあ",
    meaningEn: "You didn't go? Even though it was a great match!",
    translationId: "'Pertandingan sepak bola kemarin, coba saja aku pergi menontonnya ya.' → 'Kamu tidak pergi? Padahal pertandingannya seru lho.'",
    notes: "～ばよかった expresses regret for not having done something (faktanya tidak pergi)."
  },
  {
    num: 22,
    mondai: 4,
    questionLabelJa: "6番",
    prompt: "「課長、来週の出張のスケジュール、変更になったりしませんよね？」",
    options: [
      "うん、今のところ予定通りだよ。",
      "えっ、僕が変更したの？",
      "じゃあ、変更しておいてね。"
    ],
    correctIndex: 0,
    audioText:
      "課長、来週の出張のスケジュール、変更になったりしませんよね？ 1. うん、今のところ予定通りだよ。 2. えっ、僕が変更したの？ 3. じゃあ、変更しておいてね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "課長、来週の出張のスケジュール、変更になったりしませんよね？" },
      { speaker: "Opsi 1", gender: "male", text: "1. うん、今のところ予定通りだよ。" },
      { speaker: "Opsi 2", gender: "male", text: "2. えっ、僕が変更したの？" },
      { speaker: "Opsi 3", gender: "male", text: "3. じゃあ、変更しておいてね。" }
    ],
    targetWord: "うん、今のところ予定通りだよ",
    reading: "いまのところよていどおりだよ",
    meaningEn: "Yeah, so far it is as scheduled",
    translationId: "'Pak Kepala Seksi, jadwal perjalanan dinas minggu depan tidak akan berubah, kan?' → 'Ya, sejauh ini sesuai jadwal kok.'",
    notes: "予定通り (よていどおり) = sesuai jadwal."
  },
  {
    num: 23,
    mondai: 4,
    questionLabelJa: "7番",
    prompt: "「このパソコン、修理に出したところで、またすぐ壊れるんじゃないかな。」",
    options: [
      "じゃあ、新しいのを買ったほうがいいね。",
      "修理に出せばしばらく安心だね。",
      "修理する場所がわからないんだね。"
    ],
    correctIndex: 0,
    audioText:
      "このパソコン、修理に出したところで、またすぐ壊れるんじゃないかな。 1. じゃあ、新しいのを買ったほうがいいね。 2. 修理に出せばしばらく安心だね。 3. 修理する場所がわからないんだね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "このパソコン、修理に出したところで、またすぐ壊れるんじゃないかな。" },
      { speaker: "Opsi 1", gender: "female", text: "1. じゃあ、新しいのを買ったほうがいいね。" },
      { speaker: "Opsi 2", gender: "female", text: "2. 修理に出せばしばらく安心だね。" },
      { speaker: "Opsi 3", gender: "female", text: "3. 修理する場所がわからないんだね。" }
    ],
    targetWord: "じゃあ、新しいのを買ったほうがいいね",
    reading: "しゅうりにだしたところで",
    meaningEn: "Then it would be better to buy a new one",
    translationId: "'Laptop ini, kalaupun dibawa ke tempat servis, paling-paling sebentar lagi rusak lagi kan.' → 'Kalau begitu, lebih baik beli yang baru saja ya.'",
    notes: "V-たところで = kalaupun melakukan V, hasilnya tetap sia-sia."
  },
  {
    num: 24,
    mondai: 4,
    questionLabelJa: "8番",
    prompt: "「鈴木さん、プレゼンの発表、新入社員とは思えないほど堂々としてたね。」",
    options: [
      "やっぱり新人だから緊張してたね。",
      "ほんと、すごく落ち着いてて立派だったね。",
      "鈴木さん、新入社員じゃなかったんだね。"
    ],
    correctIndex: 1,
    audioText:
      "鈴木さん、プレゼンの発表、新入社員とは思えないほど堂々としてたね。 1. やっぱり新人だから緊張してたね。 2. ほんと、すごく落ち着いてて立派だったね。 3. 鈴木さん、新入社員じゃなかったんだね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "鈴木さん、プレゼンの発表、新入社員とは思えないほど堂々としてたね。" },
      { speaker: "Opsi 1", gender: "male", text: "1. やっぱり新人だから緊張してたね。" },
      { speaker: "Opsi 2", gender: "male", text: "2. ほんと、すごく落ち着いてて立派だったね。" },
      { speaker: "Opsi 3", gender: "male", text: "3. 鈴木さん、新入社員じゃなかったんだね。" }
    ],
    targetWord: "ほんと、すごく落ち着いてて立派だったね",
    reading: "どうどうとしてたね",
    meaningEn: "Really, he was so calm and impressive!",
    translationId: "'Presentasi Suzuki-san tadi begitu percaya diri dan mantap sampai tidak terasa seperti karyawan baru ya.' → 'Benar, dia sangat tenang dan luar biasa ya.'",
    notes: "～とは思えないほど堂々としていた = begitu percaya diri sampai-sampai sulit dipercaya bahwa ia karyawan baru."
  },
  {
    num: 25,
    mondai: 4,
    questionLabelJa: "9番",
    prompt: "「お客様、こちらの商品はあいにく在庫を切らしておりまして…。」",
    options: [
      "じゃあ、今ある分だけでいいですよ。",
      "そうですか、ではまた今度にします。",
      "切ってあるほうが使いやすいですね。"
    ],
    correctIndex: 1,
    audioText:
      "お客様、こちらの商品はあいにく在庫を切らしておりまして…。 1. じゃあ、今ある分だけでいいですよ。 2. そうですか、ではまた今度にします。 3. 切ってあるほうが使いやすいですね。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pramuniaga)", gender: "female", text: "お客様、こちらの商品はあいにく在庫を切らしておりまして…。" },
      { speaker: "Opsi 1", gender: "male", text: "1. じゃあ、今ある分だけでいいですよ。" },
      { speaker: "Opsi 2", gender: "male", text: "2. そうですか、ではまた今度にします。" },
      { speaker: "Opsi 3", gender: "male", text: "3. 切ってあるほうが使いやすいですね。" }
    ],
    targetWord: "そうですか、ではまた今度にします",
    reading: "ざいこをきらしておりまして",
    meaningEn: "I see, then I'll come back another time",
    translationId: "'Pelanggan yang terhormat, mohon maaf produk ini kebetulan sedang kehabisan stok...' → 'Begitu ya, kalau begitu lain kali saja.'",
    notes: "在庫を切らす (ざいこをきらす) = kehabisan stok barang."
  },
  {
    num: 26,
    mondai: 4,
    questionLabelJa: "10番",
    prompt: "「昨日の映画、評判がいいから見に行ったのに、期待はずれもいいとこだったよ。」",
    options: [
      "そんなに面白くなかったの？",
      "いいところがたくさんあったんだね。",
      "評判通りでよかったじゃない。"
    ],
    correctIndex: 0,
    audioText:
      "昨日の映画、評判がいいから見に行ったのに、期待はずれもいいとこだったよ。 1. そんなに面白くなかったの？ 2. いいところがたくさんあったんだね。 3. 評判通りでよかったじゃない。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Pria)", gender: "male", text: "昨日の映画、評判がいいから見に行ったのに、期待はずれもいいとこだったよ。" },
      { speaker: "Opsi 1", gender: "female", text: "1. そんなに面白くなかったの？" },
      { speaker: "Opsi 2", gender: "female", text: "2. いいところがたくさんあったんだね。" },
      { speaker: "Opsi 3", gender: "female", text: "3. 評判通りでよかったじゃない。" }
    ],
    targetWord: "そんなに面白くなかったの？",
    reading: "きたいはずれもいいとこ",
    meaningEn: "Was it really that uninteresting?",
    translationId: "'Film kemarin, padahal aku tonton karena ulasannya bagus, tapi benar-benar mengecewakan parah.' → 'Sebegitu tidak menariknya kah?'",
    notes: "期待はずれもいいとこ（ろ）だ = benar-benar jauh dari ekspektasi / sangat mengecewakan."
  },
  {
    num: 27,
    mondai: 4,
    questionLabelJa: "11番",
    prompt: "「ねえ、さっき言ったこと、冗談に決まってるじゃない。本気にしないでよ。」",
    options: [
      "なんだ、びっくりさせないでよ。",
      "やっぱり本当のことだったんだね。",
      "冗談じゃなくてよかったわ。"
    ],
    correctIndex: 0,
    audioText:
      "ねえ、さっき言ったこと、冗談に決まってるじゃない。本気にしないでよ。 1. なんだ、びっくりさせないでよ。 2. やっぱり本当のことだったんだね。 3. 冗談じゃなくてよかったわ。",
    dialogueScript: [
      { speaker: "Pembicara 1 (Wanita)", gender: "female", text: "ねえ、さっき言ったこと、冗談に決まってるじゃない。本気にしないでよ。" },
      { speaker: "Opsi 1", gender: "male", text: "1. なんだ、びっくりさせないでよ。" },
      { speaker: "Opsi 2", gender: "male", text: "2. やっぱり本当のことだったんだね。" },
      { speaker: "Opsi 3", gender: "male", text: "3. 冗談じゃなくてよかったわ。" }
    ],
    targetWord: "なんだ、びっくりさせないでよ",
    reading: "じょうだんにきまってるじゃない",
    meaningEn: "Oh come on, don't scare me like that!",
    translationId: "'Hei, yang kukatakan barusan jelas cuma bercanda lah. Jangan dianggap serius dong.' → 'Astaga, jangan bikin kaget begitu dong.'",
    notes: "本気にしないでよ = jangan dianggap serius."
  },

  // ==================== 問題 5 (1番, 2番, 3番[質問1・質問2]: 4問・統合理解) ====================
  {
    num: 28,
    mondai: 5,
    questionLabelJa: "1番",
    prompt: "市役所の会議で男女3人が市民マラソンの記念品について話し合っています。記念品は何に決まりましたか。",
    options: [
      "Tシャツ",
      "スポーツタオル",
      "水筒（ボトル）",
      "エコバッグ"
    ],
    correctIndex: 1,
    audioText:
      "市役所の会議で男女3人が市民マラソンの記念品について話し合っています。男1：来月の市民マラソンで参加者に配る記念品ですが、今年は予算を少し抑えつつ、実用的なものにしたいですね。去年はTシャツでしたが、サイズ分けが大変でした。女：そうですね。サイズに関係ないものなら、スポーツタオルか携帯用の水筒、あるいはエコバッグはどうでしょうか。男2：水筒は喜ばれそうですが、予算オーバーになりそうですね。エコバッグは安いですけど、マラソンのイメージとは少し違う気がします。女：じゃあ、走った後すぐ汗も拭けますし、市のロゴを入れたスポーツタオルがいいですね。男1：よし、予算内にも収まりますし、今年はそれにしましょう。記念品は何に決まりましたか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "市役所の会議で男女3人が市民マラソンの記念品について話し合っています。" },
      { speaker: "Ketua Rapat (Pria 1)", gender: "male", text: "来月の市民マラソンで参加者に配る記念品ですが、今年は予算を少し抑えつつ、実用的なものにしたいですね。去年はTシャツでしたが、サイズ分けが大変でした。" },
      { speaker: "Staf (Wanita)", gender: "female", text: "そうですね。サイズに関係ないものなら、スポーツタオルか携帯用の水筒、あるいはエコバッグはどうでしょうか。" },
      { speaker: "Staf (Pria 2)", gender: "male", text: "水筒は喜ばれそうですが、予算オーバーになりそうですね。エコバッグは安いですけど、マラソンのイメージとは少し違う気がします。" },
      { speaker: "Staf (Wanita)", gender: "female", text: "じゃあ、走った後すぐ汗も拭けますし、市のロゴを入れたスポーツタオルがいいですね。" },
      { speaker: "Ketua Rapat (Pria 1)", gender: "male", text: "よし、予算内にも収まりますし、今年はそれにしましょう。" },
      { speaker: "Narator", gender: "male", text: "記念品は何に決まりましたか。" }
    ],
    targetWord: "スポーツタオル",
    reading: "スポーツタオル",
    meaningEn: "sports towel",
    translationId: "Kaos sulit pembagian ukurannya, botol minum melebihi anggaran, tas ramah lingkungan kurang cocok dengan citra maraton, sehingga dipilih handuk olahraga (スポーツタオル).",
    notes: "Keputusan akhir: スポーツタオル."
  },
  {
    num: 29,
    mondai: 5,
    questionLabelJa: "2番",
    prompt: "大学のゼミで先生と学生2人がフィールドワークの調査先について話しています。どの町を調査することにしましたか。",
    options: [
      "A町（古い町並みが残る観光地）",
      "B町（農業体験が盛んな農村）",
      "C町（工場跡地を再開発した町）",
      "D町（離島で漁業が中心の町）"
    ],
    correctIndex: 2,
    audioText:
      "大学のゼミで先生と学生2人がフィールドワークの調査先について話しています。男1（先生）：今年のゼミの合宿調査だけど、候補の4つの町のうちどこにするか決めよう。テーマは『都市の再生と住民の暮らし』だから、それに合う場所がいいね。女：はい。A町は古い町並みの観光地で魅力的ですが、去年別のゼミが調査していました。B町は農村のグリーンツーリズムが中心なので、都市の再生というテーマからは少し外れますね。男2：C町は昔工場がたくさんあった地域を公園や商業施設に再開発した町で、交通の便もいいです。D町は離島なので移動だけで時間がかかりすぎます。男1（先生）：よし、テーマにも合っているし、日帰りでも追加調査に行きやすいC町に決定しよう。どの町を調査することにしましたか。",
    dialogueScript: [
      { speaker: "Narator", gender: "female", text: "大学のゼミで先生と学生2人がフィールドワークの調査先について話しています。" },
      { speaker: "Dosen", gender: "male", text: "今年のゼミの合宿調査だけど、候補の4つの町のうちどこにするか決めよう。テーマは『都市の再生と住民の暮らし』だから、それに合う場所がいいね。" },
      { speaker: "Mahasiswi", gender: "female", text: "はい。A町は古い町並みの観光地で魅力的ですが、去年別のゼミが調査していました。B町は農村のグリーンツーリズムが中心なので、都市の再生というテーマからは少し外れますね。" },
      { speaker: "Mahasiswa", gender: "male", text: "C町は昔工場がたくさんあった地域を公園や商業施設に再開発した町で、交通の便もいいです。D町は離島なので移動だけで時間がかかりすぎます。" },
      { speaker: "Dosen", gender: "male", text: "よし、テーマにも合っているし、日帰りでも追加調査に行きやすいC町に決定しよう。" },
      { speaker: "Narator", gender: "female", text: "どの町を調査することにしましたか。" }
    ],
    targetWord: "C町（工場跡地を再開発した町）",
    reading: "シーまち",
    meaningEn: "Town C (redeveloped former factory district)",
    translationId: "Karena tema seminar adalah 'Regenerasi Kota dan Kehidupan Warga' serta akses transportasinya mudah, mereka memilih Kota C.",
    notes: "Keputusan akhir: C町."
  },
  {
    num: 30,
    mondai: 5,
    questionLabelJa: "3番（質問1）",
    prompt: "商店街のラジオ番組で4つの通り（北中通り・大川通り・上田通り・山下通り）の週末イベントについて紹介しています。\n【質問1】男の人は日曜日にどの通りに行くことにしましたか。",
    options: [
      "北中通り",
      "大川通り",
      "上田通り",
      "山下通り"
    ],
    correctIndex: 1,
    audioText:
      "商店街のラジオ番組を聞きながら、男の人と女の人が週末の予定を話しています。アナウンサー：今週末、市の4つの通りで特別イベントが開催されます。まず『北中通り』では全国のパン屋が集まるパンまつりが開かれ、焼きたてのパンが楽しめます。次に川沿いの『大川通り』では古本市とジャズの生演奏が行われ、コーヒーを飲みながらゆっくり本を探せます。『上田通り』では子ども向けのおもちゃ広場と人形劇、『山下通り』では地元の新鮮な野菜や果物を格安で販売する朝市が開かれます。男：どれも面白そうだね。僕は日曜日に新しく出た小説や古い歴史の本を探したいし、音楽も聴きたいからここに行こうかな。女：いいね。私は日曜日の朝、料理に使う新鮮な野菜や果物をたくさん買いたいから、こっちの通りに行くわ。質問1：男の人は日曜日にどの通りに行くことにしましたか。",
    dialogueScript: [
      { speaker: "Narator", gender: "male", text: "商店街のラジオ番組を聞きながら、男の人と女の人が週末の予定を話しています。" },
      { speaker: "Penyiar Radio", gender: "female", text: "今週末、市の4つの通りで特別イベントが開催されます。まず『北中通り』では全国のパン屋が集まるパンまつりが開かれ、焼きたてのパンが楽しめます。次に川沿いの『大川通り』では古本市とジャズの生演奏が行われ、コーヒーを飲みながらゆっくり本を探せます。『上田通り』では子ども向けのおもちゃ広場と人形劇、『山下通り』では地元の新鮮な野菜や果物を格安で販売する朝市が開かれます。" },
      { speaker: "Pria", gender: "male", text: "どれも面白そうだね。僕は日曜日に古い歴史の本を探したいし、音楽も聴きたいからここに行こうかな。" },
      { speaker: "Wanita", gender: "female", text: "いいね。私は日曜日の朝、料理に使う新鮮な野菜や果物をたくさん買いたいから、こっちの通りに行くわ。" },
      { speaker: "Narator", gender: "male", text: "質問1：男の人は日曜日にどの通りに行くことにしましたか。" }
    ],
    targetWord: "大川通り",
    reading: "おおかわどおり",
    meaningEn: "Okawa Street (used book market & live jazz)",
    translationId: "Pria itu ingin mencari buku sejarah bekas dan mendengarkan musik jazz, sehingga ia memilih pergi ke 大川通り.",
    notes: "大川通り：古本市とジャズの生演奏 → pilihan pria pada 質問1."
  },
  {
    num: 31,
    mondai: 5,
    questionLabelJa: "3番（質問2）",
    prompt: "商店街のラジオ番組で4つの通り（北中通り・大川通り・上田通り・山下通り）の週末イベントについて紹介しています。\n【質問2】女の人は日曜日にどの通りに行くことにしましたか。",
    options: [
      "北中通り",
      "大川通り",
      "上田通り",
      "山下通り"
    ],
    correctIndex: 3,
    audioText:
      "質問2：女の人は日曜日にどの通りに行くことにしましたか。アナウンサー：『北中通り』ではパンまつり、『大川通り』では古本市とジャズの生演奏、『上田通り』では子ども向けのおもちゃ広場と人形劇、『山下通り』では地元の新鮮な野菜や果物を格安で販売する朝市が開かれます。女：私は日曜日の朝、料理に使う新鮮な野菜や果物をたくさん買いたいから、こっちの通りに行くわ。質問2：女の人は日曜日にどの通りに行くことにしましたか。",
    dialogueScript: [
      { speaker: "Penyiar Radio", gender: "female", text: "『北中通り』ではパンまつり、『大川通り』では古本市とジャズの生演奏、『上田通り』では子ども向けのおもちゃ広場と人形劇、『山下通り』では地元の新鮮な野菜や果物を格安で販売する朝市が開かれます。" },
      { speaker: "Wanita", gender: "female", text: "私は日曜日の朝、料理に使う新鮮な野菜や果物をたくさん買いたいから、こっちの通りに行くわ。" },
      { speaker: "Narator", gender: "male", text: "質問2：女の人は日曜日にどの通りに行くことにしましたか。" }
    ],
    targetWord: "山下通り",
    reading: "やましたどおり",
    meaningEn: "Yamashita Street (morning market selling fresh local vegetables and fruits)",
    translationId: "Wanita itu ingin membeli sayuran dan buah-buahan segar di pasar pagi pada Minggu pagi, sehingga ia memilih pergi ke 山下通り.",
    notes: "山下通り：地元の新鮮な野菜や果物を格安で販売する朝市 → pilihan wanita pada 質問2."
  }
];

// ============================================================================
// Fungsi Konversi & Ekspor Dataset Resmi 2016年12月 日本語能力試験 N2
// ============================================================================

export function get2016N2VocabQuestions(): QuestionItem[] {
  return RAW_2016_N2_VOCAB.map((item) => {
    const mondaiInfo = VOCAB_N2_MONDAI_LABELS[item.mondai];
    const qType =
      item.mondai === 1
        ? "G1_KANJI_READING"
        : item.mondai === 2
        ? "G2_KANJI_WRITING"
        : "G4_CONTEXT_VOCAB";

    return {
      id: `2016-n2-vocab-${item.num}`,
      level: "N2",
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
        generator: "jlpt2016N2OfficialPdf",
        generator_version: "1.0",
        seed: 20161200 + item.num
      },
      review: { status: "approved" }
    };
  });
}

export function get2016N2GrammarReadingQuestions(): QuestionItem[] {
  return RAW_2016_N2_GRAMMAR_READING.map((item) => {
    const mondaiInfo = GRAMMAR_READING_N2_MONDAI_LABELS[item.mondai];
    return {
      id: `2016-n2-gr-${item.num}`,
      level: "N2",
      type: item.mondai <= 9 ? "G3_PARTICLES" : "G4_CONTEXT_VOCAB",
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
        generator: "jlpt2016N2OfficialPdf",
        generator_version: "1.0",
        seed: 20161300 + item.num
      },
      review: { status: "approved" }
    };
  });
}

export function get2016N2ListeningQuestions(): QuestionItem[] {
  return RAW_2016_N2_LISTENING.map((item) => {
    const mondaiInfo = LISTENING_N2_MONDAI_LABELS[item.mondai];
    return {
      id: `2016-n2-listen-${item.num}`,
      level: "N2",
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
        generator: "jlpt2016N2OfficialPdf",
        generator_version: "1.0",
        seed: 20161400 + item.num
      },
      review: { status: "approved" }
    };
  });
}
