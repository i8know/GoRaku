import { QuestionItem, QuestionDialogueTurn } from "../../lib/questionPack";
export { generateOfficial2022N3MockTest } from "./mockTestCatalog";

interface Raw2022N3VocabItem {
  num: number;
  mondai: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  targetWord: string;
  reading: string;
  meaningEn: string;
  translationId: string;
  notes: string;
}

const N3_VOCAB_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5, { ja: string; id: string }> = {
  1: {
    ja: "問題 1：＿＿＿の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 1 — Bacaan Kanji N3 (Soal 1–8)"
  },
  2: {
    ja: "問題 2：＿＿＿のことばを漢字で書くとき、最もよいものを、1・2・3・4から一つえらびなさい。",
    id: "Mondai 2 — Penulisan Kanji N3 (Soal 9–14)"
  },
  3: {
    ja: "問題 3：（　）に入れるのに最もよいものを、1・2・3・4から一つえらびなさい。",
    id: "Mondai 3 — Kosakata Kontekstual N3 (Soal 15–25)"
  },
  4: {
    ja: "問題 4：＿＿＿に意味が最も近いものを、1・2・3・4から一つえらびなさい。",
    id: "Mondai 4 — Sinonim & Persamaan Makna N3 (Soal 26–30)"
  },
  5: {
    ja: "問題 5：つぎのことばの使い方として最もよいものを、1・2・3・4から一つえらびなさい。",
    id: "Mondai 5 — Penggunaan Kata dalam Kalimat / 用法 N3 (Soal 31–35)"
  }
};

const RAW_2022_N3_VOCAB: Raw2022N3VocabItem[] = [
  // 問題 1 (1 - 8)
  {
    num: 1,
    mondai: 1,
    prompt: "この店では、いろいろな<u>容器</u>を売っています。",
    options: ["ようぎ", "ようき", "どうぐ", "どうく"],
    correctIndex: 1,
    targetWord: "容器",
    reading: "ようき",
    meaningEn: "container; vessel",
    translationId: "Di toko ini menjual bermacam-macam wadah.",
    notes: "容器 dibaca ようき (wadah/tempat penyimpanan). どうぐ = 道具 (alat)."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "山本さんは何と何を<u>比べた</u>んですか。",
    options: ["くらべた", "ならべた", "しらべた", "えらべた"],
    correctIndex: 0,
    targetWord: "比べた",
    reading: "くらべた",
    meaningEn: "compared",
    translationId: "Saudara Yamamoto membandingkan apa dengan apa?",
    notes: "比べる（くらべる = membandingkan）. ならべる = 並べる (menyusun), しらべる = 調べる (memeriksa)."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "書類が<u>複数</u>あるので、間違えないでください。",
    options: ["ふくす", "ふうすう", "ふくすう", "ふうす"],
    correctIndex: 2,
    targetWord: "複数",
    reading: "ふくすう",
    meaningEn: "multiple; plural",
    translationId: "Karena dokumennya ada beberapa (lebih dari satu), tolong jangan sampai salah.",
    notes: "複数 dibaca ふくすう (jamak / lebih dari satu)."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "昨日病院で<u>血圧</u>を計りました。",
    options: ["けつあつ", "けつやつ", "ちあつ", "ちやつ"],
    correctIndex: 0,
    targetWord: "血圧",
    reading: "けつあつ",
    meaningEn: "blood pressure",
    translationId: "Kemarin saya mengukur tekanan darah di rumah sakit.",
    notes: "血圧 dibaca dengan on'yomi: けつ（血）＋ あつ（圧）＝ けつあつ (tekanan darah)."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "ここから見る<u>夕日</u>はきれいだ。",
    options: ["ゆび", "ゆひ", "ゆうび", "ゆうひ"],
    correctIndex: 3,
    targetWord: "夕日",
    reading: "ゆうひ",
    meaningEn: "evening sun; setting sun",
    translationId: "Matahari senja yang terlihat dari sini sangat indah.",
    notes: "夕日 dibaca ゆうひ (matahari terbenam/senja), tanpa dakuten pada ひ."
  },
  {
    num: 6,
    mondai: 1,
    prompt: "そこに一人で行くのは<u>難しい</u>と思います。",
    options: ["きびしい", "めずらしい", "さびしい", "むずかしい"],
    correctIndex: 3,
    targetWord: "難しい",
    reading: "むずかしい",
    meaningEn: "difficult; hard",
    translationId: "Menurut saya sulit untuk pergi ke sana sendirian.",
    notes: "難しい = むずかしい (sulit). きびしい = 厳しい, めずらしい = 珍しい, さびしい = 寂しい."
  },
  {
    num: 7,
    mondai: 1,
    prompt: "中村さんから出張の<u>件</u>でお電話がありました。",
    options: ["けい", "よう", "けん", "よん"],
    correctIndex: 2,
    targetWord: "件",
    reading: "けん",
    meaningEn: "matter; subject; case",
    translationId: "Tadi ada telepon dari Saudara Nakamura mengenai perihal perjalanan dinas.",
    notes: "件 dibaca けん (perihal/urusan/hal)."
  },
  {
    num: 8,
    mondai: 1,
    prompt: "ここを<u>横断</u>するときは気をつけてください。",
    options: ["おうざん", "おうだん", "きだん", "きざん"],
    correctIndex: 1,
    targetWord: "横断",
    reading: "おうだん",
    meaningEn: "crossing (a road)",
    translationId: "Tolong berhati-hati saat menyeberang di sini.",
    notes: "横断 dibaca おうだん (menyeberang), seperti pada 横断歩道（おうだんほどう = zebra cross）."
  },

  // 問題 2 (9 - 14)
  {
    num: 9,
    mondai: 2,
    prompt: "車から出て、外の空気を<u>すった</u>。",
    options: ["吹った", "呼った", "吸った", "叫った"],
    correctIndex: 2,
    targetWord: "吸った",
    reading: "すった",
    meaningEn: "inhaled; breathed in",
    translationId: "Saya keluar dari mobil lalu menghirup udara luar.",
    notes: "空気を吸う（すう → 吸った = menghirup udara）. 吹く（ふく = meniup）, 呼ぶ（よぶ = memanggil）, 叫ぶ（さけぶ = berteriak）."
  },
  {
    num: 10,
    mondai: 2,
    prompt: "あしたのアルバイトは、いつもより時間が<u>みじかい</u>。",
    options: ["早い", "長い", "短い", "遅い"],
    correctIndex: 2,
    targetWord: "短い",
    reading: "みじかい",
    meaningEn: "short",
    translationId: "Kerja paruh waktu besok durasi waktunya lebih singkat daripada biasanya.",
    notes: "短い = みじかい (pendek/singkat)."
  },
  {
    num: 11,
    mondai: 2,
    prompt: "今日は少し、<u>い</u>の調子がよくない。",
    options: ["肩", "胃", "腰", "肌"],
    correctIndex: 1,
    targetWord: "胃",
    reading: "い",
    meaningEn: "stomach",
    translationId: "Hari ini kondisi lambung saya agak kurang baik.",
    notes: "胃 = い (lambung). 肩 = かた (bahu), 腰 = こし (pinggang), 肌 = はだ (kulit)."
  },
  {
    num: 12,
    mondai: 2,
    prompt: "その話を聞いて、みんなが<u>えがお</u>になった。",
    options: ["楽顔", "悲顔", "泣顔", "笑顔"],
    correctIndex: 3,
    targetWord: "笑顔",
    reading: "えがお",
    meaningEn: "smiling face; smile",
    translationId: "Mendengar cerita itu, semua orang tersenyum.",
    notes: "笑顔（えがお）= wajah tersenyum (笑 + 顔)."
  },
  {
    num: 13,
    mondai: 2,
    prompt: "<u>こくばん</u>を見てください。",
    options: ["黒板", "黒坂", "告板", "告坂"],
    correctIndex: 0,
    targetWord: "黒板",
    reading: "こくばん",
    meaningEn: "blackboard",
    translationId: "Tolong lihat ke papan tulis.",
    notes: "黒板（こくばん）= papan tulis (黒 hitam + 板 papan)."
  },
  {
    num: 14,
    mondai: 2,
    prompt: "それは<u>いっぱんてき</u>なことだと思う。",
    options: ["一段的", "一般的", "一役的", "一設的"],
    correctIndex: 1,
    targetWord: "一般的",
    reading: "いっぱんてき",
    meaningEn: "general; common; standard",
    translationId: "Menurut saya itu adalah hal yang umum.",
    notes: "一般的（いっぱんてき）= bersifat umum/lazim."
  },

  // 問題 3 (15 - 25)
  {
    num: 15,
    mondai: 3,
    prompt: "田中さんは私のめいと結婚したので、私たちは（　★　）になりました。",
    options: ["夫婦", "家内", "親戚", "兄弟"],
    correctIndex: 2,
    targetWord: "親戚（しんせき）",
    reading: "しんせき",
    meaningEn: "relative; kin",
    translationId: "Karena Saudara Tanaka menikah dengan keponakan perempuan saya, kami menjadi kerabat/sanak saudara.",
    notes: "親戚（しんせき）= kerabat / sanak famili."
  },
  {
    num: 16,
    mondai: 3,
    prompt: "昨日は駅で、学生時代の友達に（　★　）会って、びっくりした。",
    options: ["ついでに", "当然", "たまに", "偶然"],
    correctIndex: 3,
    targetWord: "偶然（ぐうぜん）",
    reading: "ぐうぜん",
    meaningEn: "by chance; accidentally; unexpectedly",
    translationId: "Kemarin di stasiun saya secara kebetulan bertemu teman masa kuliah, sehingga saya terkejut.",
    notes: "びっくりした (terkejut) karena bertemu secara kebetulan: 偶然（ぐうぜん）会う."
  },
  {
    num: 17,
    mondai: 3,
    prompt: "洗剤は種類が多いので、どれを買おうか（　★　）しまう。",
    options: ["迷って", "騒いで", "疑って", "飽きて"],
    correctIndex: 0,
    targetWord: "迷って（まよって）",
    reading: "まよって",
    meaningEn: "hesitate; cannot decide which to buy",
    translationId: "Karena deterjen ada banyak jenisnya, saya jadi bingung harus membeli yang mana.",
    notes: "どれを買おうか迷う（まよう）= bingung memilih yang mana."
  },
  {
    num: 18,
    mondai: 3,
    prompt: "足に（　★　）合う靴がなかなか見つからない。",
    options: ["はっきり", "ぴったり", "うっかり", "がっかり"],
    correctIndex: 1,
    targetWord: "ぴったり",
    reading: "ぴったり",
    meaningEn: "fitting perfectly; snugly",
    translationId: "Sepatu yang pas sekali di kaki tak kunjung ditemukan.",
    notes: "足にぴったり合う = pas sekali ukurannya di kaki."
  },
  {
    num: 19,
    mondai: 3,
    prompt: "天気がいいので、庭に洗濯物を（　★　）。",
    options: ["混ぜた", "揚げた", "干した", "こぼした"],
    correctIndex: 2,
    targetWord: "干した（ほした）",
    reading: "ほした",
    meaningEn: "hung out laundry to dry",
    translationId: "Karena cuacanya cerah, saya menjemur cucian di halaman.",
    notes: "洗濯物を干す（ほす）= menjemur pakaian."
  },
  {
    num: 20,
    mondai: 3,
    prompt: "今日の晩ご飯は、森さんが教えてくれた日本料理の（　★　）を見て作りました。",
    options: ["メッセージ", "レシピ", "サイン", "アナウンス"],
    correctIndex: 1,
    targetWord: "レシピ",
    reading: "れしぴ",
    meaningEn: "recipe",
    translationId: "Makan malam hari ini saya buat dengan melihat resep masakan Jepang yang diajarkan oleh Saudara Mori.",
    notes: "料理のレシピ = resep masakan."
  },
  {
    num: 21,
    mondai: 3,
    prompt: "映画の中に（　★　）する男性が、父にそっくりだった。",
    options: ["発生", "支出", "掲示", "登場"],
    correctIndex: 3,
    targetWord: "登場（とうじょう）",
    reading: "とうじょう",
    meaningEn: "appearance (in a movie, book, or stage)",
    translationId: "Pria yang muncul di dalam film itu sangat mirip dengan ayah saya.",
    notes: "映画や小説に登場（とうじょう）する = muncul sebagai tokoh dalam film/cerita."
  },
  {
    num: 22,
    mondai: 3,
    prompt: "大勢の前で歌うのは初めてだったので、（　★　）した。",
    options: ["どきどき", "だぶだぶ", "ぐうぐう", "ざあざあ"],
    correctIndex: 0,
    targetWord: "どきどき",
    reading: "どきどき",
    meaningEn: "heart pounding (with nervousness/excitement)",
    translationId: "Karena baru pertama kali bernyanyi di depan banyak orang, jantung saya berdebar-debar.",
    notes: "どきどきする = berdebar-debar karena gugup. だぶだぶ = kedodoran, ぐうぐう = tidur mendengkur/perut keroncongan, ざあざあ = hujan deras."
  },
  {
    num: 23,
    mondai: 3,
    prompt: "ホテルで海側の部屋を（　★　）したが、空いていなかった。",
    options: ["納得", "承知", "希望", "準備"],
    correctIndex: 2,
    targetWord: "希望（きぼう）",
    reading: "きぼう",
    meaningEn: "requested; wished for",
    translationId: "Di hotel saya menginginkan/meminta kamar di sisi laut, tetapi sedang tidak kosong.",
    notes: "海側の部屋を希望（きぼう）する = menginginkan/memilih kamar menghadap laut."
  },
  {
    num: 24,
    mondai: 3,
    prompt: "夜になると、隣の家の犬が（　★　）ので、うるさくてなかなか眠れない。",
    options: ["ほえる", "ひびく", "しゃべる", "どなる"],
    correctIndex: 0,
    targetWord: "ほえる（吠える）",
    reading: "ほえる",
    meaningEn: "to bark",
    translationId: "Saat malam tiba, karena anjing rumah sebelah menggonggong, berisik sehingga saya sulit tidur.",
    notes: "犬がほえる（吠える）= anjing menggonggong."
  },
  {
    num: 25,
    mondai: 3,
    prompt: "この道は狭いので、前の車を（　★　）のは危険ですよ。",
    options: ["飛び出す", "追い越す", "押し込む", "取り替える"],
    correctIndex: 1,
    targetWord: "追い越す（おいこす）",
    reading: "おいこす",
    meaningEn: "to overtake; to pass (a car ahead)",
    translationId: "Karena jalan ini sempit, mendahului/menyalip mobil di depan itu berbahaya lho.",
    notes: "前の車を追い越す（おいこす）= menyalip kendaraan di depan."
  },

  // 問題 4 (26 - 30)
  {
    num: 26,
    mondai: 4,
    prompt: "もう少し時間を<u>あたえよう</u>と思う。",
    options: ["あげよう", "もらおう", "作ろう", "使おう"],
    correctIndex: 0,
    targetWord: "あたえよう（与えよう）＝ あげよう",
    reading: "あたえよう",
    meaningEn: "to give (time/opportunity)",
    translationId: "Saya berpikir untuk memberikan sedikit waktu lagi.",
    notes: "与える（あたえる）berarti memberikan = あげる."
  },
  {
    num: 27,
    mondai: 4,
    prompt: "ここは車が<u>ずいぶん</u>多いですね。",
    options: ["最も", "非常に", "まあまあ", "やっぱり"],
    correctIndex: 1,
    targetWord: "ずいぶん ＝ 非常に（ひじょうに）",
    reading: "ずいぶん",
    meaningEn: "extremely; very; considerably",
    translationId: "Di sini mobilnya sangat banyak, ya.",
    notes: "ずいぶん（随分）dalam konteks ini berarti sangat/amat banyak = 非常に（ひじょうに）."
  },
  {
    num: 28,
    mondai: 4,
    prompt: "荷物は、<u>指定</u>の場所に置いてください。",
    options: ["決められた", "空いている", "近くの", "ほかの"],
    correctIndex: 0,
    targetWord: "指定（してい）＝ 決められた",
    reading: "してい",
    meaningEn: "designated = decided/specified",
    translationId: "Tolong letakkan barang bawaan di tempat yang telah ditentukan.",
    notes: "指定の場所 = tempat yang telah ditetapkan/ditentukan (決められた場所)."
  },
  {
    num: 29,
    mondai: 4,
    prompt: "山田さんの話を聞くまでは<u>不安</u>だった。",
    options: ["賛成", "大変", "心配", "反対"],
    correctIndex: 2,
    targetWord: "不安（ふあん）＝ 心配（しんぱい）",
    reading: "ふあん",
    meaningEn: "anxious; uneasy = worried",
    translationId: "Sebelum mendengar cerita Saudara Yamada, saya merasa cemas/khawatir.",
    notes: "不安（ふあん = cemas/gelisah）paling dekat maknanya dengan 心配（しんぱい = khawatir）."
  },
  {
    num: 30,
    mondai: 4,
    prompt: "<u>スケジュール</u>は川井さんに聞いてください。",
    options: ["行き方", "理由", "やり方", "予定"],
    correctIndex: 3,
    targetWord: "スケジュール ＝ 予定（よてい）",
    reading: "すけじゅーる",
    meaningEn: "schedule = plan/itinerary",
    translationId: "Untuk jadwalnya silakan tanyakan kepada Saudara Kawai.",
    notes: "スケジュール (schedule) = 予定（よてい = jadwal/rencana）."
  },

  // 問題 5 (31 - 35)
  {
    num: 31,
    mondai: 5,
    prompt: "つぎのことばの使い方として最もよいものをえらびなさい：<br/><strong>【 発展（はってん） 】</strong>",
    options: [
      "毎朝ジョギングを続けたら、健康が<u>発展</u>するだろう。",
      "テレビで紹介されてから、この店は客の数が<u>発展</u>した。",
      "林さんは中学校のとき、成績が急に<u>発展</u>したそうだ。",
      "この町は歴史的な建物が多く、観光地として<u>発展</u>してきた。"
    ],
    correctIndex: 3,
    targetWord: "発展（はってん）",
    reading: "はってん",
    meaningEn: "development; growth (of a town, industry, economy)",
    translationId: "Kota ini memiliki banyak bangunan bersejarah dan telah berkembang sebagai daerah wisata.",
    notes: "発展する digunakan untuk kota, industri, ekonomi, atau hubungan yang berkembang maju (観光地として発展してきた). Jumlah pelanggan = 増えた, nilai = 上がった."
  },
  {
    num: 32,
    mondai: 5,
    prompt: "つぎのことばの使い方として最もよいものをえらびなさい：<br/><strong>【 だく（抱く） 】</strong>",
    options: [
      "朝作ったお弁当を大きめのハンカチで<u>だいて</u>かばんに入れた。",
      "生まれた子を初めて<u>だいた</u>とき、とても小さくて軽いと感じた。",
      "けがをしないように、包丁をしっかり<u>だいて</u>魚を切った。",
      "引っ越しのとき運びやすいように、本や雑誌をひもで<u>だいた</u>。"
    ],
    correctIndex: 1,
    targetWord: "だく（抱く）",
    reading: "だく",
    meaningEn: "to hold in one's arms; to hug (a baby)",
    translationId: "Saat pertama kali menggendong/memeluk anak yang baru lahir, saya merasa ia sangat kecil dan ringan.",
    notes: "抱く（だく）berarti mendekap/menggendong dengan kedua lengan (生まれた子を抱く). Saputangan = 包む, pisau = 握る, tali = 縛る."
  },
  {
    num: 33,
    mondai: 5,
    prompt: "つぎのことばの使い方として最もよいものをえらびなさい：<br/><strong>【 原料（げんりょう） 】</strong>",
    options: [
      "ここから見える景色を<u>原料</u>にして、抽象的な絵をかくつもりだ。",
      "大学を卒業したら、留学の経験を<u>原料</u>にして仕事がしたい。",
      "このドラマは、海外の小説を<u>原料</u>にしたそうです。",
      "牛乳を<u>原料</u>にして、チーズやバターが作られます。"
    ],
    correctIndex: 3,
    targetWord: "原料（げんりょう）",
    reading: "げんりょう",
    meaningEn: "raw material; ingredient (for manufacturing products)",
    translationId: "Keju dan mentega dibuat dengan susu sapi sebagai bahan bakunya.",
    notes: "原料（げんりょう）adalah bahan mentah/baku untuk memproduksi barang olahan (牛乳を原料にしてチーズやバターが作られる)."
  },
  {
    num: 34,
    mondai: 5,
    prompt: "つぎのことばの使い方として最もよいものをえらびなさい：<br/><strong>【 異常（いじょう） 】</strong>",
    options: [
      "今年の夏は<u>異常</u>な暑さで、エアコンがよく売れたそうだ。",
      "その色は見えにくいので、赤などの<u>異常</u>な色を使ってください。",
      "妹の作文は上手に書けていたが、<u>異常</u>な漢字が一つあった。",
      "姉の靴は、私とは<u>異常</u>なサイズなので、借りることができない。"
    ],
    correctIndex: 0,
    targetWord: "異常（いじょう）",
    reading: "いじょう",
    meaningEn: "abnormal; unusual; extreme (weather/temperature)",
    translationId: "Karena musim panas tahun ini panasnya tidak normal (ekstrem), kabarnya AC terjual laris.",
    notes: "異常（いじょう）berarti kondisi yang menyimpang dari normal/ekstrem, seperti 異常な暑さ (panas ekstrem)."
  },
  {
    num: 35,
    mondai: 5,
    prompt: "つぎのことばの使い方として最もよいものをえらびなさい：<br/><strong>【 重なる（かさなる） 】</strong>",
    options: [
      "A銀行とB銀行が<u>重なって</u>、新しい銀行ができました。",
      "私たちの研究会に、来月から新しい仲間が<u>重なります</u>。",
      "子どもの運動会が大切な会議と<u>重なって</u>、見に行けない。",
      "貯金がたくさん<u>重なったら</u>、車を買おうと思っている。"
    ],
    correctIndex: 2,
    targetWord: "重なる（かさなる）",
    reading: "かさなる",
    meaningEn: "to overlap; to coincide (schedules/events)",
    translationId: "Karena festival olahraga anak bertepatan/bentrok dengan rapat penting, saya tidak bisa pergi menontonnya.",
    notes: "予定・行事が重なる（かさなる）berarti dua jadwal/acara jatuh pada waktu yang bersamaan (bentrok)."
  }
];

interface Raw2022N3GrammarReadingItem {
  num: number;
  mondai: 1 | 2 | 3 | 4 | 5 | 6 | 7;
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

const N3_GRAMMAR_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, { ja: string; id: string }> = {
  1: {
    ja: "問題 1：つぎの文の（　）に入れるのに最もよいものを、1・2・3・4から一つえらびなさい。",
    id: "Mondai 1 — Tata Bahasa & Ungkapan Kalimat N3 (Soal 1–13)"
  },
  2: {
    ja: "問題 2：次の文の ★ に入る最もよいものを、1・2・3・4から一つ選びなさい。",
    id: "Mondai 2 — Menyusun Kalimat Bintang ★ N3 (Soal 14–18)"
  },
  3: {
    ja: "問題 3：つぎの文章を読んで、文章全体の内容を考えて、(19)から(22)の中に入る最もよいものを、1・2・3・4から一つえらびなさい。",
    id: "Mondai 3 — Tata Bahasa Wacana / グエン テイ ラン「京都旅行」 (Soal 19–22)"
  },
  4: {
    ja: "問題 4：つぎの(1)から(4)の文章を読んで、質問に答えなさい。",
    id: "Mondai 4 — Pemahaman Bacaan Pendek / 短文読解 4題 (Soal 23–26)"
  },
  5: {
    ja: "問題 5：つぎの(1)と(2)の文章を読んで、質問に答えなさい。",
    id: "Mondai 5 — Pemahaman Bacaan Menengah / 中文読解 2題 (Soal 27–32)"
  },
  6: {
    ja: "問題 6：つぎの文章を読んで、質問に答えなさい。",
    id: "Mondai 6 — Pemahaman Bacaan Panjang / 長文読解「眠りと体の中心の温度」 (Soal 33–36)"
  },
  7: {
    ja: "問題 7：右のページの案内を読んで、下の質問に答えなさい。",
    id: "Mondai 7 — Pencarian Informasi / 情報検索「秋の日帰りバス旅行のご案内」 (Soal 37–38)"
  }
};

const N3_MONDAI_3_PASSAGE_HTML = `
<div class="space-y-3 text-left">
  <p class="text-xs font-semibold text-[#a06658]">以下は、留学生の作文である。</p>
  <div class="p-5 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-3 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="flex items-center justify-between border-b border-[#ece7de] pb-2">
      <span class="font-bold text-base">京都旅行</span>
      <span class="text-xs text-[#595750]">グエン テイ ラン</span>
    </div>
    <p>
      私は夏休みに京都を旅行しました。日本で旅行するとき、普段はホテルに泊まりますが、京都では温泉のある旅館に泊まりました。畳の部屋に入るのは初めてでした。<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 19 】</span>にも初めて入りました。夕食もおいしかったです。
    </p>
    <p>
      次の日、部屋で出発の準備をしていたら、腕時計<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 20 】</span>ないことに気がつきました。かばんの中を探しても見つからなくて、腕時計が落ちていなかったかフロントで聞きましたが、ありませんでした。母にもらった大切な時計だったので、私はもう一度、部屋に戻って探すことにしました。フロントの人も旅館の中を探してみると言ってくれました。
    </p>
    <p>
      やはり部屋にはなく、泣きそうになっていたとき、フロントの人が私の時計を見つけて、部屋に持ってきてくれました。温泉の入り口のところに<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 21 】</span>。朝、温泉に入ったときに、落としてしまったようです。時計が見つかって、旅館の人たちもとても喜んでくれました。
    </p>
    <p>
      京都旅行の一番の思い出は、時計が見つかったことを一緒に喜んでくれた旅館の人たちの笑顔です。旅行では観光地や食べ物だけではなく、人の優しさもいい思い出に<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 22 】</span>。
    </p>
  </div>
</div>
`;

const N3_MONDAI_4_Q23_HTML = `
<div class="space-y-2 text-left">
  <p class="text-xs font-semibold text-[#a06658]">(1) （会社で）コピー機の上に、この紙が置いてある。</p>
  <div class="p-4 rounded-xl bg-[#fffdfa] border-2 border-[#494740] space-y-2 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="font-bold">営業課の皆さんへ</div>
    <p>
      営業課のコピー機は今、故障していて使えません。修理を頼んでいますが、明日の午後まで来られないそうです。急ぎでないコピーは、明日まで待ってください。
    </p>
    <p>
      今日中にコピーしなければならない書類がある場合は、会計課のコピー機を使用してください。50枚以上コピーをする場合は、先に会計課に連絡をしておく必要がありますので、コピーをする前に中島に知らせてください。
    </p>
  </div>
</div>
`;

const N3_MONDAI_4_Q24_HTML = `
<div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose space-y-2">
  <p>
    (2) 6歳の娘がボールを上手に投げられるようになりたいと言う。私は娘の投げ方の悪い点をいろいろと説明して、何回もボールを投げさせているが、娘はなかなかうまくならない。
  </p>
  <p>
    昨日、あるテレビ番組でボール投げについて取り上げていた。番組では、子供に大きさや重さの違うさまざまなボールを投げさせたり、紙飛行機を飛ばさせたりして、ちょうどいい力の入れ方を体で覚えさせていた。娘に必要なのは、これかもしれない。次は、このやり方を娘にやらせてみようと思う。
  </p>
</div>
`;

const N3_MONDAI_4_Q25_HTML = `
<div class="space-y-2 text-left">
  <p class="text-xs font-semibold text-[#a06658]">(3) これは、ある店が客の寺坂さんに書いたメールである。</p>
  <div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-2 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="font-bold">寺坂ゆき様</div>
    <p>いつもご利用いただき、ありがとうございます。</p>
    <p>
      2月4日にいただいたご注文についてのご連絡です。寺坂様がホームページからご注文になった革製財布（茶色）ですが、直前の電話注文で品切れになっておりました。大変申し訳ございません。お届けできるのは3月上旬になってしまいますが、いかがいたしましょうか。キャンセルもお受けいたしますので、ご希望をお聞かせください。
    </p>
    <p>なお、同じ商品の違う色でしたら、すぐにお送りできます。あわせてご検討ください。</p>
    <div class="text-right text-xs text-[#595750]">財布専門店タキグチ 広田</div>
  </div>
</div>
`;

const N3_MONDAI_4_Q26_HTML = `
<div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose space-y-2">
  <p>
    (4) 私の家には、履かなくなった古い靴がたくさんある。捨てようかと思っていたとき、ある靴屋のちらしを見た。いらない靴を店に持っていけば、その店で使える割引券と交換してくれるそうだ。回収した靴を燃やす（注）ときに出る熱が、電気を作るためのエネルギーに利用できて、環境にいいとも書かれていた。私一人が持っていっても、環境にそんなに大きい影響はないと思うが、新しい靴が安く買えるなら、古い靴は捨てないで店に持っていこうと思った。
  </p>
  <p class="text-xs text-[#77736b]">（注）燃やす：焼く</p>
</div>
`;

const N3_MONDAI_5_PASSAGE1_HTML = `
<div class="p-5 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose space-y-3">
  <div class="font-bold text-xs text-[#a06658]">中文読解 (1)：父の古いラジオ</div>
  <p>
    先日、押し入れから父の古いラジオが出てきた。スイッチを入れてみたら、<u>①懐かしい声</u>が流れてきた。高校生のころ、大好きだったラジオの音楽番組のアナウンサーだった。私はつい番組を聞き続けてしまった。
  </p>
  <p>
    あのころ私はよくラジオを聞いていた。ラジオのおかげで、勉強をしながらでも、ニュースや最新の音楽などさまざまな情報を知ることができた。今考えると、私にとってラジオはテレビよりも身近で便利なものだった。
  </p>
  <p>
    今はラジオを聞く人が減っているそうだ。インターネットなどで、好きなときに知りたいニュースが見られるし、聞きたい音楽も聞けるようになったのだから、当然だ。
  </p>
  <p>
    しかし、考えてみれば、車を運転する人や畑で仕事をする人などは、今でもよくラジオを聞いている。ほかのことをしながらでも、さまざまな情報が手に入るというラジオにしかない良さ、便利さがあるのだ。私も掃除や料理をするようなときには、<u>②また、ラジオを聞こう</u>と思った。
  </p>
</div>
`;

const N3_MONDAI_5_PASSAGE2_HTML = `
<div class="p-5 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose space-y-3">
  <div class="font-bold text-xs text-[#a06658]">中文読解 (2)：田舎に引っ越して農業を始める夢</div>
  <p>私たち夫婦の夢は、田舎に引っ越して農業を始めることです。</p>
  <p>
    そこで先日、ある町が東京で開いた<u>①説明会</u>に参加してみました。その町では人口が減ったので、町民を募集するために説明会を開いています。もう100人以上が移り住んでいて、多くの人は楽しく生活しています。しかし、うまくいかなかった例もあるそうです。
  </p>
  <p>
    そのような例には<u>②共通点</u>があると思いました。ある人は、田舎の生活にあこがれて引っ越して来ましたが、すぐに退屈な毎日が嫌になったそうです。農業がしたくて来たのにあまりにも大変で、都会に戻ってしまった例もありました。毎月の町内の掃除など、都会では経験したことがなかったことが意外にめんどうくさいと感じる人もいるそうです。説明会では、このような例も知ってから検討してほしいと言っていました。
  </p>
  <p>
    成功例ばかり見ていた私たちは、考えが甘かったようです。でも、夢はあきらめたくないので、よく調べて、計画を立てて、実行できるように頑張りたいと思います。
  </p>
</div>
`;

const N3_MONDAI_6_PASSAGE_HTML = `
<div class="p-5 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose space-y-3">
  <div class="font-bold text-xs text-[#a06658]">長文読解：眠りと体の中心の温度</div>
  <p>
    最近、私は布団に入ってもしばらく眠れなくて、悩んでいる。朝は決まった時間に起きなければならないので、眠る時間が短くなって、昼間に眠くなってしまう。それで、体が疲れるまで運動をすれば、布団に入ってすぐに眠くなるだろうと考えて、寝る1時間前に走ることにした。だが、2週間続けてみても、<u>①全然変わらない</u>。
  </p>
  <p>
    そこで、どうやったら眠れるようになるか調べてみた。すると、<u>②体の中心の温度の変化が重要だ</u>ということがわかった。例えば、寝る2、3時間前に軽く走ったり、ぬるめの風呂にゆっくり入ったりするといいそうだ。こうすることで、体が中心まで温まる。すると、体は表面から熱を出そうとする。表面から熱が出ていくと、中心の温度が下がっていく。このようにして、中心の温度が下がる状態を作ると、人は眠りやすくなるのだそうだ。
  </p>
  <p>
    注意したほうがいいこととして、こんなことも書いてあった。寝る直前に運動しすぎたり、熱い風呂に入ったりするのは、体は温まるが、頭がはっきりして眠くなくなってしまうので、逆効果らしい。つまり、私のやっていたことは<u>③間違い</u>だったのだ。
  </p>
  <p>
    眠るために頑張っていたが、夜に一人で走るのは少し怖いと思っていたし、実は運動も好きではない。運動以外にいい方法があると知ってうれしくなった。これからは、（　<strong>36</strong>　）と思う。
  </p>
</div>
`;

const N3_MONDAI_7_FLYER_HTML = `
<div class="space-y-3 text-left font-['Noto_Serif_JP',serif]">
  <div class="p-5 rounded-xl bg-[#fffdfa] border-2 border-[#263d36] space-y-4">
    <div class="text-center border-b border-[#ece7de] pb-2">
      <h4 class="text-lg font-extrabold text-[#25231f]">🍁 秋の日帰りバス旅行のご案内</h4>
      <p class="text-xs text-[#77736b]">ゆうやけ観光 • 受付時間 7:30〜18:00</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div class="p-3 rounded-xl bg-[#f9f7f2] border border-[#dcd7cc] space-y-1">
        <div class="font-bold text-sm text-[#263d36]">① 川中市内観光と川中東温泉</div>
        <div><strong>料金：</strong>平日 7,500円 ／ 土・日 8,500円</div>
        <div><strong>食事：</strong>ついていません</div>
        <div><strong>出発日：</strong>10月6日（土）・11月12日（月）</div>
      </div>

      <div class="p-3 rounded-xl bg-[#f9f7f2] border border-[#dcd7cc] space-y-1">
        <div class="font-bold text-sm text-[#263d36]">② 大岩チーズ場見学と川中美術館</div>
        <div><strong>料金：</strong>平日 8,500円 ／ 土・日 9,500円</div>
        <div><strong>食事：</strong>昼食</div>
        <div><strong>出発日：</strong>10月30日（火）・11月10日（土）</div>
      </div>

      <div class="p-3 rounded-xl bg-[#f9f7f2] border border-[#dcd7cc] space-y-1">
        <div class="font-bold text-sm text-[#263d36]">③ 北森市立博物館と花丸温泉</div>
        <div><strong>料金：</strong>平日 11,000円 ／ 土・日 12,000円</div>
        <div><strong>食事：</strong>昼食</div>
        <div><strong>出発日：</strong>10月29日（月）・11月11日（日）</div>
      </div>

      <div class="p-3 rounded-xl bg-[#fff9f5] border border-[#d95b43]/50 space-y-1">
        <div class="font-bold text-sm text-[#bf5b46]">④ 空石山ハイキングと空石温泉</div>
        <div><strong>料金：</strong>平日 10,000円 ／ 土・日 11,000円</div>
        <div><strong>食事：</strong>昼食</div>
        <div><strong>出発日：</strong>10月25日（木）・11月3日（土）</div>
      </div>
    </div>

    <div class="p-3 rounded-xl bg-[#f8f5ef] border border-[#e2ded5] text-xs space-y-1 leading-relaxed">
      <div class="font-bold text-[#25231f]">【お申し込み後のキャンセル料】</div>
      <p>
        ・出発日の10日前〜8日前まで：料金の <strong>20%</strong><br/>
        ・出発日の7日前〜2日前まで：料金の <strong>30%</strong><br/>
        ・出発日の前日：料金の <strong>40%</strong><br/>
        ・当日の出発前まで：料金の <strong>50%</strong> ／ 出発後：<strong>100%</strong><br/>
        ・キャンセルのご連絡は、受付時間内（7:30〜18:00）にお願いします。
      </p>
    </div>
  </div>
</div>
`;

const RAW_2022_N3_GRAMMAR_READING: Raw2022N3GrammarReadingItem[] = [
  // 問題 1 (1 - 13)
  {
    num: 1,
    mondai: 1,
    prompt: "（教室で）<br/>アン「先生、スピーチ大会の申込書を書いてきました。書き方がよくわからないところなんですが、ここの書き方はこれ（　★　）大丈夫でしょうか。」",
    options: ["に", "で", "と", "が"],
    correctIndex: 1,
    targetWord: "これで大丈夫でしょうか",
    reading: "これでだいじょうぶでしょうか",
    meaningEn: "Is it okay like this / with this?",
    translationId: "Apakah cara penulisannya di bagian ini sudah tidak apa-apa dengan seperti ini (これで)?",
    notes: "これでいい／これで大丈夫 = sudah cukup/benar dengan kondisi seperti ini."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "（北山市のホームページで）<br/>7月25日と26日の2日間、北山公園（　★　）夏祭りが行われました。",
    options: ["において", "にとって", "に対して", "について"],
    correctIndex: 0,
    targetWord: "において",
    reading: "において",
    meaningEn: "at; in (formal location marker for events)",
    translationId: "Selama 2 hari pada tanggal 25 dan 26 Juli, festival musim panas telah diselenggarakan di Taman Kitayama.",
    notes: "～において adalah bentuk formal dari partikel lokasi で untuk pengumuman/berita."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "私は、誰（　★　）親切で優しい兄をとても尊敬している。",
    options: ["にだけ", "からだけ", "にでも", "からでも"],
    correctIndex: 2,
    targetWord: "誰にでも",
    reading: "だれにでも",
    meaningEn: "kind to everyone / anyone",
    translationId: "Saya sangat menghormati kakak laki-laki saya yang ramah dan baik hati kepada siapa saja.",
    notes: "誰にでも親切 = ramah kepada siapa pun."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "（教室で）<br/>先生「来週の授業でこのプリントを使いますから、（　★　）持ってきてください。」",
    options: ["全く", "非常に", "決して", "必ず"],
    correctIndex: 3,
    targetWord: "必ず（かならず）",
    reading: "かならず",
    meaningEn: "without fail; be sure to",
    translationId: "Guru: 'Karena lembar cetak ini akan dipakai pada pelajaran minggu depan, pastikan membawanya.'",
    notes: "必ず～てください = pastikan / wajib melakukan."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "友達の結婚式に招待されたが、出張があって（　★　）行けない。",
    options: ["どうしても", "それほど", "せっかく", "つい"],
    correctIndex: 0,
    targetWord: "どうしても（～ない）",
    reading: "どうしても",
    meaningEn: "no matter what; cannot possibly go",
    translationId: "Saya diundang ke pernikahan teman, tetapi karena ada perjalanan dinas bagaimanapun juga saya tidak bisa pergi.",
    notes: "どうしても＋Bentuk Negatif = bagaimanapun usahanya tetap tidak bisa."
  },
  {
    num: 6,
    mondai: 1,
    prompt: "私の応援している野球選手が、肩のけがの（　★　）、しばらく試合に出られなくなった。とても心配だ。",
    options: ["途中で", "一方で", "ように", "ために"],
    correctIndex: 3,
    targetWord: "～のために（原因・理由）",
    reading: "けがのために",
    meaningEn: "due to a shoulder injury",
    translationId: "Pemain bisbol yang saya dukung tidak bisa tampil dalam pertandingan untuk sementara waktu karena cedera bahu.",
    notes: "N + の + ために menyatakan penyebab/alasan terjadinya suatu akibat."
  },
  {
    num: 7,
    mondai: 1,
    prompt: "歯医者「歯を（　★　）寝てしまうと、虫歯になりやすくなります。寝る前にきちんと磨くようにしてください。」",
    options: ["磨いて", "磨かずに", "磨くたび", "磨かなくて"],
    correctIndex: 1,
    targetWord: "磨かずに",
    reading: "みがかずに",
    meaningEn: "without brushing one's teeth",
    translationId: "Dokter gigi: 'Jika tidur tanpa menggosok gigi, akan mudah berlubang.'",
    notes: "V-ない (tanpa ない) + ずに = melakukan aksi berikutnya tanpa melakukan V (= 磨かないで)."
  },
  {
    num: 8,
    mondai: 1,
    prompt: "（電話で）<br/>中川「もしもし。林さん、今ちょっといい？」<br/>林「あ、ごめん。これから（　★　）、あとでこっちから電話するね。」",
    options: [
      "出かけるところなのに",
      "出かけているところなのに",
      "出かけるところだから",
      "出かけているところだから"
    ],
    correctIndex: 2,
    targetWord: "出かけるところだから",
    reading: "でかけるところだから",
    meaningEn: "because I'm just about to go out",
    translationId: "Hayashi: 'Ah, maaf. Karena saya baru saja mau berangkat keluar sekarang, nanti saya telepon balik ya.'",
    notes: "これから + V-kamus + ところだ = baru akan melakukan sesuatu sesaat lagi."
  },
  {
    num: 9,
    mondai: 1,
    prompt: "（道で）<br/>A「すみません。東図書館を探しているんですが……。」<br/>B「ああ、東図書館ですね。この坂を（　★　）郵便局がありますから、その角を右に曲がってください。」",
    options: [
      "のぼっていくと",
      "のぼっていきながら",
      "のぼってくるには",
      "のぼってくるとき"
    ],
    correctIndex: 0,
    targetWord: "のぼっていくと",
    reading: "のぼっていくと",
    meaningEn: "if you go up this slope, you'll find a post office",
    translationId: "Kalau Anda naik menanjaki bukit ini, akan ada kantor pos, jadi beloklah ke kanan di sudut itu.",
    notes: "Gerakan menjauh dari titik pembicara menggunakan ～ていく, dan petunjuk jalan menggunakan kondisi ～と (のぼっていくと)."
  },
  {
    num: 10,
    mondai: 1,
    prompt: "A「さくら駅の近くに新しくできたラーメン屋、（　★　）？」<br/>B「ううん、知らない。」<br/>A「昨日初めて行ったんだけど、すごくおいしかったよ。」",
    options: ["知っとく", "知っちゃう", "知ってく", "知ってる"],
    correctIndex: 3,
    targetWord: "知ってる（知っている）",
    reading: "しってる",
    meaningEn: "Do you know ...? (casual form of 知っていますか)",
    translationId: "A: 'Restoran ramen yang baru buka di dekat Stasiun Sakura, kamu tahu nggak?'",
    notes: "Dalam percakapan akrab, い pada ～ている sering luluh menjadi ～てる (知ってる？)."
  },
  {
    num: 11,
    mondai: 1,
    prompt: "（電話で）<br/>山下「はい、X建設営業課、山下です。」<br/>石田「ABC銀行の石田と申しますが、中川さんか林さんはいらっしゃいますか。」<br/>山下「はい、中川が（　★　）ので、今、代わります。」",
    options: ["いたします", "おります", "いただきます", "ございます"],
    correctIndex: 1,
    targetWord: "おります（謙譲語）",
    reading: "おります",
    meaningEn: "is here (humble form of います for in-group member)",
    translationId: "Yamashita: 'Ya, Nakagawa ada di tempat, jadi sekarang saya sambungkan.'",
    notes: "Kepada pihak luar perusahaan (石田), keberadaan rekan satu perusahaan sendiri (中川) dinyatakan dengan bentuk merendah (謙譲語) dari います yaitu おります."
  },
  {
    num: 12,
    mondai: 1,
    prompt: "私は美術館が好きで、今までいろいろな美術館に行った。国内の美術館が多いが、海外の美術館に（　★　）。",
    options: [
      "行ったこともある",
      "行ったことはない",
      "行くこともできる",
      "行くこともできない"
    ],
    correctIndex: 0,
    targetWord: "行ったこともある",
    reading: "いったこともある",
    meaningEn: "I have also been to art museums overseas",
    translationId: "Kebanyakan adalah museum seni di dalam negeri, tetapi saya juga pernah pergi ke museum seni di luar negeri.",
    notes: "V-たことがある／こともある menyatakan pengalaman yang pernah dilakukan."
  },
  {
    num: 13,
    mondai: 1,
    prompt: "（靴屋で）<br/>客「すみません。この靴、（　★　）。」<br/>店員「どうぞ。サイズはこちらでよろしいですか。」<br/>客「はい。」",
    options: [
      "履いてもらえませんか",
      "履かないんですか",
      "履いてみてもいいですか",
      "履くことになりますか"
    ],
    correctIndex: 2,
    targetWord: "履いてみてもいいですか",
    reading: "はいてみてもいいですか",
    meaningEn: "May I try putting these shoes on?",
    translationId: "Pelanggan: 'Permisi. Apakah boleh saya coba pakai sepatu ini?'",
    notes: "Mencoba melakukan sesuatu (V-てみる) + meminta izin (～てもいいですか) → 履いてみてもいいですか."
  },

  // 問題 2 ★ 並べ替え (14 - 18)
  {
    num: 14,
    mondai: 2,
    isStarQuestion: true,
    prompt: "留学している息子 ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ 毎日楽しく過ごしていると書かれていて安心した。",
    options: ["メール", "から", "に", "の"],
    correctIndex: 0,
    targetWord: "メール（から → の → ★メール → に）",
    reading: "めーる",
    meaningEn: "In the email from my son who is studying abroad...",
    translationId: "Di dalam email dari putra saya yang sedang kuliah di luar negeri tertulis bahwa ia menjalani hari-hari dengan menyenangkan, sehingga saya lega.",
    notes: "Susunan lengkap: 留学している息子【2.から】【4.の】【★1.メール】【3.に】…書かれていて安心した。 Kata pada ★ adalah 1. メール."
  },
  {
    num: 15,
    mondai: 2,
    isStarQuestion: true,
    prompt: "来週から1か月間、出張で東京に行く。東京には ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ 一緒に食事でもしたいと思う。",
    options: ["いるので", "いる間に", "友達が", "東京に"],
    correctIndex: 3,
    targetWord: "東京に（友達が → いるので → ★東京に → いる間に）",
    reading: "とうきょうに",
    meaningEn: "Since I have a friend in Tokyo, while I am in Tokyo...",
    translationId: "Karena di Tokyo ada teman, selama saya berada di Tokyo saya ingin makan bersama dengannya.",
    notes: "Susunan lengkap: 東京には【3.友達が】【1.いるので】【★4.東京に】【2.いる間に】一緒に食事でもしたいと思う。 Kata pada ★ adalah 4. 東京に."
  },
  {
    num: 16,
    mondai: 2,
    isStarQuestion: true,
    prompt: "バイオリンが ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ こんなに面白い楽器はないと感じる。",
    options: [
      "1年前に習い始めたのだが",
      "弾くほど",
      "弾けば",
      "弾けるようになりたくて"
    ],
    correctIndex: 2,
    targetWord: "弾けば（弾けるようになりたくて → 1年前に習い始めたのだが → ★弾けば → 弾くほど）",
    reading: "ひけば",
    meaningEn: "the more I play it, the more I feel there is no instrument as interesting as this",
    translationId: "Karena ingin bisa bermain biola saya mulai belajar 1 tahun lalu, dan semakin dimainkan semakin terasa tidak ada alat musikemenarik ini.",
    notes: "Susunan lengkap: バイオリンが【4.弾けるようになりたくて】【1.1年前に習い始めたのだが】【★3.弾けば】【2.弾くほど】こんなに面白い楽器はないと感じる。 Pola 弾けば弾くほど (semakin... semakin...). Kata pada ★ adalah 3. 弾けば."
  },
  {
    num: 17,
    mondai: 2,
    isStarQuestion: true,
    prompt: "A「お誕生日おめでとう。これ、プレゼントだよ。」<br/>B「わあ、かばんだ。ちょうど ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ んだ。ありがとう。」",
    options: ["こういう色の", "欲しい", "と思っていた", "かばんが"],
    correctIndex: 1,
    targetWord: "欲しい（こういう色の → かばんが → ★欲しい → と思っていた）",
    reading: "ほしい",
    meaningEn: "I was just thinking I wanted a bag of this color!",
    translationId: "Wah, tas! Kebetulan sekali aku sedang berpikir ingin tas berwarna seperti ini. Terima kasih.",
    notes: "Susunan lengkap: ちょうど【1.こういう色の】【4.かばんが】【★2.欲しい】【3.と思っていた】んだ。 Kata pada ★ adalah 2. 欲しい."
  },
  {
    num: 18,
    mondai: 2,
    isStarQuestion: true,
    prompt: "都会と田舎には違うところも多いが、どちらも、人が働き、＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿。",
    options: ["という点で", "違いは", "生活している", "ない"],
    correctIndex: 1,
    targetWord: "違いは（生活している → という点で → ★違いは → ない）",
    reading: "ちがいは",
    meaningEn: "there is no difference in that people work and live in both",
    translationId: "Kota dan desa memiliki banyak perbedaan, tetapi keduanya tidak memiliki perbedaan dalam hal tempat manusia bekerja dan hidup.",
    notes: "Susunan lengkap: 人が働き、【3.生活している】【1.という点で】【★2.違いは】【4.ない】。 Kata pada ★ adalah 2. 違いは."
  },

  // 問題 3 文章の文法 (19 - 22)
  {
    num: 19,
    mondai: 3,
    passageTitle: "留学生の作文：グエン テイ ラン「京都旅行」",
    passageHtml: N3_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 19 】 に入る最もよいものはどれですか。",
    options: ["温泉", "あの温泉", "そんな温泉", "これらの温泉"],
    correctIndex: 0,
    targetWord: "温泉",
    reading: "おんせん",
    meaningEn: "hot spring (onsen in general)",
    translationId: "Masuk ke kamar berlantai tatami adalah pengalaman pertama saya. Masuk ke pemandian air panas (温泉) juga pertama kalinya.",
    notes: "Menyatakan pengalaman pertama kali mandi di onsen secara umum (bukan menunjuk satu onsen spesifik dengan あの/そんな/これらの) → 温泉にも初めて入りました."
  },
  {
    num: 20,
    mondai: 3,
    passageTitle: "留学生の作文：グエン テイ ラン「京都旅行」",
    passageHtml: N3_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 20 】 に入る最もよいものはどれですか。",
    options: ["まで", "しか", "は", "が"],
    correctIndex: 3,
    targetWord: "が（腕時計がないこと）",
    reading: "が",
    meaningEn: "noticed that my wristwatch was missing",
    translationId: "Keesokan harinya saat bersiap berangkat di kamar, saya menyadari bahwa jam tangan saya tidak ada.",
    notes: "Di dalam anak kalimat yang menerangkan こと (腕時計がないこと), subjek ditandai dengan partikel が."
  },
  {
    num: 21,
    mondai: 3,
    passageTitle: "留学生の作文：グエン テイ ラン「京都旅行」",
    passageHtml: N3_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 21 】 に入る最もよいものはどれですか。",
    options: [
      "落ちたままです",
      "落ちたばかりです",
      "落ちていたそうです",
      "落ちていたことです"
    ],
    correctIndex: 2,
    targetWord: "落ちていたそうです",
    reading: "おちていたそうです",
    meaningEn: "I heard from the front desk staff that it had been dropped near the onsen entrance",
    translationId: "Katanya (dari petugas resepsionis) jam itu terjatuh di dekat pintu masuk pemandian air panas.",
    notes: "Penulis tidak melihatnya sendiri melainkan diberitahu oleh petugas resepsionis yang menemukannya → bentuk kabar/informasi ～たそうです (落ちていたそうです)."
  },
  {
    num: 22,
    mondai: 3,
    passageTitle: "留学生の作文：グエン テイ ラン「京都旅行」",
    passageHtml: N3_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 22 】 に入る最もよいものはどれですか。",
    options: [
      "なっただろうと思います",
      "なるのだと感じました",
      "なったのではないでしょうか",
      "なるでしょうか"
    ],
    correctIndex: 1,
    targetWord: "なるのだと感じました",
    reading: "なるのだと感じました",
    meaningEn: "I felt/realized that people's kindness also becomes a wonderful memory",
    translationId: "Dalam perjalanan wisata, bukan hanya tempat wisata dan makanan saja, saya merasakan bahwa kebaikan hati orang-orang pun menjadi kenangan yang indah.",
    notes: "Menyatakan kesadaran/kesan mendalam penulis dari pengalamannya sendiri: いい思い出になるのだと感じました."
  },

  // 問題 4 短文読解 (23 - 26)
  {
    num: 23,
    mondai: 4,
    passageTitle: "短文読解 (1)：営業課のコピー機故障のお知らせ",
    passageHtml: N3_MONDAI_4_Q23_HTML,
    prompt: "営業課のホンさんは、明日の朝の会議で使う資料を今日中に5枚コピーしたいと考えている。どうしなければならないか。",
    options: [
      "営業課でコピーをする。中島さんに言う必要はない。",
      "会計課でコピーをする。中島さんに言う必要はない。",
      "中島さんに言ってから、営業課でコピーをする。",
      "中島さんに言ってから、会計課でコピーをする。"
    ],
    correctIndex: 1,
    targetWord: "会計課でコピーをする。中島さんに言う必要はない。",
    reading: "かいけいかでこぴーをする",
    meaningEn: "Make copies in the Accounting Department; no need to inform Nakajima-san (since it is only 5 pages, under 50)",
    translationId: "Memfotokopi di bagian Akuntansi (会計課). Tidak perlu melapor kepada Saudara Nakajima (karena hanya 5 lembar, kurang dari 50 lembar).",
    notes: "Sesuai pengumuman: (1) Jika harus difotokopi hari ini, gunakan mesin milik 会計課. (2) Melapor ke Nakajima hanya jika memfotokopi 50 lembar atau lebih (50枚以上). Karena Hon-san hanya 5 lembar, langsung ke 会計課 tanpa perlu melapor ke Nakajima (opsi 2)."
  },
  {
    num: 24,
    mondai: 4,
    passageTitle: "短文読解 (2)：娘のボール投げの練習",
    passageHtml: N3_MONDAI_4_Q24_HTML,
    prompt: "テレビ番組を見て、「私」は娘のボール投げがうまくならないのは、なぜだと思ったか。",
    options: [
      "上手な投げ方についての「私」の説明が下手だったから。",
      "繰り返し同じ投げ方で投げる練習をさせていなかったから。",
      "実際に「私」が上手に投げているところを見せていなかったから。",
      "ちょうどいい力の入れ方を体で覚える練習をさせていなかったから。"
    ],
    correctIndex: 3,
    targetWord: "ちょうどいい力の入れ方を体で覚える練習をさせていなかったから",
    reading: "ちょうどいいちからのいれかたをからでおぼえる",
    meaningEn: "Because the writer hadn't let the daughter practice feeling the right amount of force with her body",
    translationId: "Karena belum melatih putrinya mengenali takaran tenaga yang pas secara langsung melalui tubuhnya.",
    notes: "Paragraf 2: 「ちょうどいい力の入れ方を体で覚えさせていた。娘に必要なのは、これかもしれない。」(opsi 4)."
  },
  {
    num: 25,
    mondai: 4,
    passageTitle: "短文読解 (3)：財布専門店タキグチからのメール",
    passageHtml: N3_MONDAI_4_Q25_HTML,
    prompt: "このメールで言いたいこととして、合っているのはどれか。",
    options: [
      "商品が品切れになったから、3月上旬に送る。",
      "商品が品切れになったから、3月上旬にもう一度注文してほしい。",
      "商品が品切れで、届けるまでに時間がかかるから、どうしたいか知らせてほしい。",
      "注文と違う色の商品を送ってしまったから、正しい色のものをすぐに送る。"
    ],
    correctIndex: 2,
    targetWord: "商品が品切れで、届けるまでに時間がかかるから、どうしたいか知らせてほしい",
    reading: "どうしたいかしらせてほしい",
    meaningEn: "Since the item is out of stock and will take time to deliver, please let us know what you would like to do",
    translationId: "Karena barangnya habis terjual dan butuh waktu sampai awal Maret untuk dikirim, toko meminta pelanggan memberi tahu apa yang ingin dilakukan (menunggu, batal, atau ganti warna).",
    notes: "Email menyatakan: 「お届けできるのは3月上旬になってしまいますが、いかがいたしましょうか。キャンセルもお受けいたしますので、ご希望をお聞かせください。」(opsi 3)."
  },
  {
    num: 26,
    mondai: 4,
    passageTitle: "短文読解 (4)：古い靴と割引券の交換",
    passageHtml: N3_MONDAI_4_Q26_HTML,
    prompt: "「私」が古い靴を店に持っていこうと思った理由の中で、最も大きいものはどれか。",
    options: [
      "古い靴を割引券と交換して、新しい靴を買うときに使いたいと思ったから。",
      "古い靴を売ってお金をもらい、そのお金で新しい靴を買いたいと思ったから。",
      "古い靴をきれいに直してもらって、もう一度履きたいと思ったから。",
      "古い靴を利用してもらって、環境をよくしたいと思ったから。"
    ],
    correctIndex: 0,
    targetWord: "古い靴を割引券と交換して、新しい靴を買うときに使いたいと思ったから",
    reading: "わりびきけんとこうかんして",
    meaningEn: "To exchange the old shoes for a discount coupon to use when buying new shoes",
    translationId: "Karena ingin menukarkan sepatu lama dengan kupon diskon dan menggunakannya saat membeli sepatu baru.",
    notes: "Kalimat terakhir: 「私一人が持っていっても、環境にそんなに大きい影響はないと思うが、新しい靴が安く買えるなら、古い靴は捨てないで店に持っていこうと思った。」(opsi 1)."
  },

  // 問題 5 中文読解 (27 - 32)
  {
    num: 27,
    mondai: 5,
    passageTitle: "中文読解 (1)：父の古いラジオ",
    passageHtml: N3_MONDAI_5_PASSAGE1_HTML,
    prompt: "<u>①懐かしい声</u>とあるが、何か。",
    options: [
      "「私」が高校生のころの父の声。",
      "「私」が高校生のころの自分の声。",
      "「私」が高校生のころ大好きだった歌手の声。",
      "「私」が高校生のころ聞いていたアナウンサーの声。"
    ],
    correctIndex: 3,
    targetWord: "「私」が高校生のころ聞いていたアナウンサーの声",
    reading: "あなうんさーのこえ",
    meaningEn: "The voice of the radio announcer the writer used to listen to in high school",
    translationId: "Suara penyiar acara musik radio yang sering didengarkan penulis semasa SMA.",
    notes: "Paragraf 1: 「スイッチを入れてみたら、①懐かしい声が流れてきた。高校生のころ、大好きだったラジオの音楽番組のアナウンサーだった。」(opsi 4)."
  },
  {
    num: 28,
    mondai: 5,
    passageTitle: "中文読解 (1)：父の古いラジオ",
    passageHtml: N3_MONDAI_5_PASSAGE1_HTML,
    prompt: "<u>②また、ラジオを聞こう</u>と思ったのはどうしてか。",
    options: [
      "ラジオは、テレビより小さくて身近に置くことができるから",
      "ラジオは、インターネットより多くのことを教えてくれるから",
      "ラジオは、新しいことだけでなく古いことも伝えてくれるから",
      "ラジオは、何かをしながらでも、いろいろなことを知ることができるから"
    ],
    correctIndex: 3,
    targetWord: "何かをしながらでも、いろいろなことを知ることができるから",
    reading: "なにかをしながらでも",
    meaningEn: "Because with radio you can learn various information while doing other tasks",
    translationId: "Karena dengan radio kita bisa mengetahui berbagai informasi sambil mengerjakan hal lain (seperti bersih-bersih atau memasak).",
    notes: "Paragraf 4: 「ほかのことをしながらでも、さまざまな情報が手に入るというラジオにしかない良さ、便利さがあるのだ。」(opsi 4)."
  },
  {
    num: 29,
    mondai: 5,
    passageTitle: "中文読解 (1)：父の古いラジオ",
    passageHtml: N3_MONDAI_5_PASSAGE1_HTML,
    prompt: "この文章のテーマは何か。",
    options: [
      "ラジオ番組の楽しさ。",
      "ラジオの良さ。",
      "ラジオの歴史の長さ。",
      "ラジオの使い方の工夫。"
    ],
    correctIndex: 1,
    targetWord: "ラジオの良さ",
    reading: "らじおのよさ",
    meaningEn: "The good qualities / merits of radio",
    translationId: "Kelebihan/keunggulan radio (dapat didengarkan sambil beraktivitas lain).",
    notes: "Keseluruhan esai membahas keunggulan khas radio (ラジオにしかない良さ、便利さ) dibanding TV dan internet (opsi 2)."
  },
  {
    num: 30,
    mondai: 5,
    passageTitle: "中文読解 (2)：田舎に引っ越して農業を始める夢",
    passageHtml: N3_MONDAI_5_PASSAGE2_HTML,
    prompt: "町が<u>①説明会</u>を開いた目的は何か。",
    options: [
      "町に引っ越して来てくれる人を募集すること。",
      "町に引っ越して来る人を助けてくれる町民を募集すること。",
      "町の農業について、アドバイスをしてくれる専門家を募集すること。",
      "町の人口を増やすにはどうしたらいいか、考えてくれる人を募集すること。"
    ],
    correctIndex: 0,
    targetWord: "町に引っ越して来てくれる人を募集すること",
    reading: "まちにひっこしてきてくれるひとをぼしゅうすること",
    meaningEn: "To recruit people who will move to and live in the town",
    translationId: "Merekrut orang-orang yang mau pindah dan menetap di kota kecil tersebut.",
    notes: "Paragraf 2: 「その町では人口が減ったので、町民を募集するために説明会を開いています。」(opsi 1)."
  },
  {
    num: 31,
    mondai: 5,
    passageTitle: "中文読解 (2)：田舎に引っ越して農業を始める夢",
    passageHtml: N3_MONDAI_5_PASSAGE2_HTML,
    prompt: "<u>②共通点</u>とあるが、それはどのような点だと考えられるか。",
    options: [
      "期待していた生活ができていないが、我慢して生活している点。",
      "期待していた生活ができるようになり、楽しく生活ができている点。",
      "期待していた生活と実際の生活が同じではなかったが、満足している点。",
      "期待していた生活と実際の生活が違い、不満を感じた点。"
    ],
    correctIndex: 3,
    targetWord: "期待していた生活と実際の生活が違い、不満を感じた点",
    reading: "きたいしていたせいかつとじっさいのせいかつがちがい",
    meaningEn: "The point that actual life differed from the expected life, causing dissatisfaction",
    translationId: "Kesamaan bahwa kehidupan nyata di desa berbeda dari kehidupan yang dibayangkan/diharapkan sehingga merasa tidak puas.",
    notes: "Paragraf 3 menjelaskan contoh orang yang membayangkan hidup indah di desa tetapi kenyataannya bosan, pertanian terlalu berat, dan kerja bakti terasa merepotkan (opsi 4)."
  },
  {
    num: 32,
    mondai: 5,
    passageTitle: "中文読解 (2)：田舎に引っ越して農業を始める夢",
    passageHtml: N3_MONDAI_5_PASSAGE2_HTML,
    prompt: "説明会に行ってから、自分の夢について、「私」はどう思うようになったか。",
    options: [
      "失敗例が多すぎるから、実行するのはあきらめたほうがよさそうだ。",
      "失敗例を知ったので、実行するかしないかを検討したい。",
      "失敗例のことも考えて、しっかり計画を立てて実行したい。",
      "失敗例より成功例がたくさんあるから、失敗例は気にせずにすぐ実行したい。"
    ],
    correctIndex: 2,
    targetWord: "失敗例のことも考えて、しっかり計画を立てて実行したい",
    reading: "しっかりけいかくをたててじっこうしたい",
    meaningEn: "Taking failure cases into account as well, I want to research carefully, make a solid plan, and carry out my dream",
    translationId: "Dengan turut mempertimbangkan contoh kegagalan, saya ingin mencari tahu dengan matang, menyusun rencana, dan mewujudkan impian tersebut.",
    notes: "Paragraf 4: 「成功例ばかり見ていた私たちは、考えが甘かったようです。でも、夢はあきらめたくないので、よく調べて、計画を立てて、実行できるように頑張りたいと思います。」(opsi 3)."
  },

  // 問題 6 長文読解 (33 - 36)
  {
    num: 33,
    mondai: 6,
    passageTitle: "長文読解：眠りと体の中心の温度",
    passageHtml: N3_MONDAI_6_PASSAGE_HTML,
    prompt: "<u>①全然変わらない</u>とあるが、何が変わらないのか。",
    options: [
      "布団に入ってもしばらく眠れないこと。",
      "運動しないと眠れないこと。",
      "朝、決まった時間に起きられないこと。",
      "1時間も走り続けられないこと。"
    ],
    correctIndex: 0,
    targetWord: "布団に入ってもしばらく眠れないこと",
    reading: "ふとんにはいってもしばらくねむれないこと",
    meaningEn: "Being unable to fall asleep for a while after getting into bed",
    translationId: "Kondisi tidak bisa langsung tidur selama beberapa waktu meskipun sudah masuk ke futon.",
    notes: "Paragraf 1: Masalah awal penulis adalah 「布団に入ってもしばらく眠れなくて、悩んでいる」, lalu ia mencoba lari 1 jam sebelum tidur selama 2 minggu tetapi kondisi sulit tidurnya tetap tidak berubah (opsi 1)."
  },
  {
    num: 34,
    mondai: 6,
    passageTitle: "長文読解：眠りと体の中心の温度",
    passageHtml: N3_MONDAI_6_PASSAGE_HTML,
    prompt: "<u>②体の中心の温度の変化が重要だ</u>とあるが、この変化を起こすためには、どうすればいいか。",
    options: [
      "体の中心の温度をまず下げることで、中心の温度が上がる状態を作る。",
      "体の中心の温度をまず上げることで、中心の温度が下がる状態を作る。",
      "体の中心の温度を上げて、中心の温度が決まった温度から下がらない状態を作る。",
      "体の中心の温度を上げたり下げたりして、中心の温度が変化し続ける状態を作る。"
    ],
    correctIndex: 1,
    targetWord: "体の中心の温度をまず上げることで、中心の温度が下がる状態を作る",
    reading: "ちゅうしんのおんどをまずあげることで",
    meaningEn: "First raise the core body temperature so that it subsequently drops",
    translationId: "Menaikkan suhu bagian tengah tubuh terlebih dahulu (2–3 jam sebelum tidur), sehingga tercipta kondisi suhu tengah tubuh yang menurun saat hendak tidur.",
    notes: "Paragraf 2: 「こうすることで、体が中心まで温まる。すると、体は表面から熱を出そうとする。表面から熱が出ていくと、中心の温度が下がっていく。」(opsi 2)."
  },
  {
    num: 35,
    mondai: 6,
    passageTitle: "長文読解：眠りと体の中心の温度",
    passageHtml: N3_MONDAI_6_PASSAGE_HTML,
    prompt: "<u>③間違い</u>とあるが、「私」が間違えて、していたことは何か。",
    options: [
      "寝る1時間前に体が疲れるまで運動をすること。",
      "寝る1時間前に軽い運動をすること。",
      "寝る2、3時間前に体が疲れるまで運動をすること。",
      "寝る2、3時間前に軽い運動をすること。"
    ],
    correctIndex: 0,
    targetWord: "寝る1時間前に体が疲れるまで運動をすること",
    reading: "ねるいちじかんまえにからだがつかれるまでうんどうをすること",
    meaningEn: "Exercising until exhausted 1 hour before going to bed",
    translationId: "Berolahraga sampai tubuh lelah pada waktu 1 jam sebelum tidur.",
    notes: "Paragraf 1 & 3: Penulis tadinya berlari 1 jam sebelum tidur sampai tubuhnya lelah (体が疲れるまで運動をすれば…寝る1時間前に走ることにした), padahal olahraga berat sesaat sebelum tidur justru membuat otak terjaga (逆効果)."
  },
  {
    num: 36,
    mondai: 6,
    passageTitle: "長文読解：眠りと体の中心の温度",
    passageHtml: N3_MONDAI_6_PASSAGE_HTML,
    prompt: "最後の（　36　）に入れるのに最もよいものはどれか。",
    options: [
      "起きる時間を遅くしよう。",
      "布団に入って自然に眠くなるのを待とう。",
      "ぬるめの風呂にゆっくり入ってから寝よう。",
      "軽く走ってから寝よう。"
    ],
    correctIndex: 2,
    targetWord: "ぬるめの風呂にゆっくり入ってから寝よう",
    reading: "ぬるめのふろにゆっくりはいってから",
    meaningEn: "take a slow, lukewarm bath before going to bed",
    translationId: "Mulai sekarang saya berpikir untuk berendam perlahan di air hangat-hangat kuku sebelum tidur.",
    notes: "Paragraf 4 menyatakan: 「実は運動も好きではない。運動以外にいい方法があると知ってうれしくなった。」 Cara selain olahraga yang disebutkan di paragraf 2 adalah 「ぬるめの風呂にゆっくり入ったりする」(opsi 3)!"
  },

  // 問題 7 情報検索 (37 - 38)
  {
    num: 37,
    mondai: 7,
    passageTitle: "情報検索：秋の日帰りバス旅行のご案内",
    passageHtml: N3_MONDAI_7_FLYER_HTML,
    prompt: "田中さんは、<strong>出発日が土曜日</strong>のバス旅行に申し込みたいと思っている。<strong>昼食がついていて</strong>、<strong>温泉に行けるもの</strong>がいい。田中さんの希望に合うのはどれか。",
    options: ["①", "②", "③", "④"],
    correctIndex: 3,
    targetWord: "④（空石山ハイキングと空石温泉：11月3日(土)・昼食・空石温泉）",
    reading: "よんばん",
    meaningEn: "Tour 4 (Saturday Nov 3, lunch included, visits Soraishi Onsen)",
    translationId: "Tur ④: keberangkatan hari Sabtu (11月3日), termasuk makan siang (昼食), dan mengunjungi pemandian air panas (空石温泉).",
    notes: "Cek syarat Tanaka-san: ① tidak ada makan siang (ついていません); ② tidak ke onsen; ③ keberangkatannya hanya Senin & Minggu (tidak ada Sabtu); ④ ada hari Sabtu (11月3日), ada 昼食, dan ke 空石温泉 (opsi 4)!"
  },
  {
    num: 38,
    mondai: 7,
    passageTitle: "情報検索：秋の日帰りバス旅行のご案内",
    passageHtml: N3_MONDAI_7_FLYER_HTML,
    prompt: "ロバートさんは、<strong>出発日が明日 10月6日（土）</strong>の「①川中市内観光と川中東温泉」に申し込んでいたが、行けなくなった。<strong>今日の受付時間のうちにキャンセルする場合</strong>、キャンセル料はどうなるか。",
    options: [
      "7,500円の 40% を払う。",
      "8,500円の 40% を払う。",
      "7,500円の 50% を払う。",
      "8,500円の 50% を払う。"
    ],
    correctIndex: 1,
    targetWord: "8,500円の 40% を払う",
    reading: "はっせんごひゃくえんのよんじゅっぱーせんと",
    meaningEn: "Pay 40% of the 8,500 yen weekend fare (since cancelling the day before departure)",
    translationId: "Membayar 40% dari tarif 8.500 yen (karena keberangkatan hari Sabtu bertarif 8.500 yen, dan membatalkan sehari sebelum keberangkatan dikenakan 40%).",
    notes: "10月6日（土）adalah hari Sabtu → tarif Tur ① untuk 土・日 adalah 8,500円. Karena keberangkatan adalah besok (明日), maka hari ini adalah 出発日の前日 (H-1) → biaya pembatalan 40% (opsi 2)!"
  }
];

interface Raw2022N3ListeningItem {
  num: number;
  mondai: 1 | 2 | 3 | 4 | 5;
  questionNumberInMondai: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  dialogueScript: QuestionDialogueTurn[];
  targetWord: string;
  reading: string;
  meaningEn: string;
  translationId: string;
  notes: string;
}

const N3_LISTENING_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5, { ja: string; id: string }> = {
  1: {
    ja: "聴解 問題 1：まず質問を聞いてください。それから話を聞いて、問題用紙の1から4の中から、最もよいものを一つえらんでください。",
    id: "Choukai Mondai 1 — Pemahaman Tugas / 課題理解 N3 (6 Soal)"
  },
  2: {
    ja: "聴解 問題 2：まず質問を聞いてください。そのあと、問題用紙を見てください。話を聞いて、1から4の中から、最もよいものを一つえらんでください。",
    id: "Choukai Mondai 2 — Pemahaman Poin Kunci / ポイント理解 N3 (6 Soal)"
  },
  3: {
    ja: "聴解 問題 3：問題用紙に何も印刷されていません。全体としてどんな内容かを聞く問題です。1から4の中から、最もよいものを一つえらんでください。",
    id: "Choukai Mondai 3 — Pemahaman Gambaran Umum / 概要理解 N3 (3 Soal)"
  },
  4: {
    ja: "聴解 問題 4：絵を見ながら質問を聞いてください。やじるし（➡）の人は何と言いますか。1から3の中から、最もよいものを一つえらんでください。",
    id: "Choukai Mondai 4 — Ungkapan Situasional / 発話表現 N3 (4 Soal • 3 Pilihan)"
  },
  5: {
    ja: "聴解 問題 5：問題用紙に何も印刷されていません。まず文を聞いてください。それから、そのへんじを聞いて、1から3の中から、最もよいものを一つえらんでください。",
    id: "Choukai Mondai 5 — Respons Cepat / 即時応答 N3 (9 Soal • 3 Pilihan)"
  }
};

const RAW_2022_N3_LISTENING: Raw2022N3ListeningItem[] = [
  // ================= 問題 1 (1 - 6) =================
  {
    num: 1,
    mondai: 1,
    questionNumberInMondai: 1,
    prompt: "1番：男の人と女の人がコンサートのチケットについて話しています。男の人はこのあと、どうしますか。",
    options: [
      "1. チケット売り場にチケットを買いに行く",
      "2. インターネットでチケットを買う",
      "3. 川野さんにお金をわたす",
      "4. わりびきけんを もらいに行く"
    ],
    correctIndex: 3,
    dialogueScript: [
      { speaker: "男", text: "来月のジャズコンサート、一緒に行かない？インターネットでチケット買おうと思ってるんだけど。" },
      { speaker: "女", text: "いいね。あ、でも、川野さんがそのコンサートの割引券を持ってるって言ってたよ。チケット売り場で買うときに使えるって。" },
      { speaker: "男", text: "本当？じゃあ、ネットで予約するんじゃなくて、川野さんにその割引券をもらいに行ってから売り場で買おう。" },
      { speaker: "質問", text: "男の人はこのあと、どうしますか。" }
    ],
    targetWord: "わりびきけんを もらいに行く",
    reading: "わりびきけんをもらいにいく",
    meaningEn: "Go get the discount coupon from Kawano-san first (Option 4)",
    translationId: "Pergi meminta kupon diskon kepada Kawano-san terlebih dahulu.",
    notes: "Pria memutuskan untuk meminta kupon diskon terlebih dahulu kepada Kawano-san sebelum membeli tiket di loket (opsi 4)."
  },
  {
    num: 2,
    mondai: 1,
    questionNumberInMondai: 2,
    prompt: "2番：留守番電話のメッセージを聞いています。学生はこのあとまず何をしなければなりませんか。",
    options: [
      "1. しょるいをいんさつする",
      "2. 先生にメールでしょるいを送る",
      "3. 先生のメールにへんしんする",
      "4. 先生に会いに行く時間を決める"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "もしもし、佐藤先生です。奨学金の申し込み書類のことで電話しました。明日印刷して持ってきてもらうことになっていましたが、その前に一度内容を確認したいので、今日中にメールで書類のデータファイルを送ってください。確認したらこちらから返信します。" },
      { speaker: "質問", text: "学生はこのあとまず何をしなければなりませんか。" }
    ],
    targetWord: "先生にメールでしょるいを送る",
    reading: "せんせいにめーるでしょるいをおくる",
    meaningEn: "Send the document file to the professor by email today (Option 2)",
    translationId: "Mengirimkan berkas dokumen kepada dosen melalui email hari ini.",
    notes: "「その前に一度内容を確認したいので、今日中にメールで書類のデータファイルを送ってください。」(opsi 2)."
  },
  {
    num: 3,
    mondai: 1,
    questionNumberInMondai: 3,
    prompt: "3番：おかし屋で、店の人とアルバイトの人が話しています。アルバイトの人は商品をどのように箱に入れますか。<br/><span class='text-xs text-[#77736b]'>（ア：大きい箱に縦に入れる ／ イ：大きい箱に横に入れる ／ ウ：ふたをしてシールを貼る ／ エ：ふたをしてリボンを結ぶ）</span>",
    options: ["1. ア・イ", "2. ア・エ", "3. イ・ウ", "4. ウ・エ"],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "男", text: "今日から新しいクッキーの箱詰めをお願いします。クッキーは横に並べて入れてください（イ）。それから、箱のふたを閉めたら、リボンではなく、真ん中に店のシールを貼ってください（ウ）。" },
      { speaker: "女", text: "はい、わかりました。" },
      { speaker: "質問", text: "アルバイトの人は商品をどのように箱に入れますか。" }
    ],
    targetWord: "イ・ウ（横に入れて、ふたをしてシールを貼る）",
    reading: "いう",
    meaningEn: "Arrange horizontally (イ) and put a seal on the lid (ウ) (Option 3)",
    translationId: "Menyusun kue secara mendatar (イ) lalu menutup kotak dan menempelkan stiker (ウ).",
    notes: "Langkah yang diminta adalah イ lalu ウ → Opsi 3 (イウ)."
  },
  {
    num: 4,
    mondai: 1,
    questionNumberInMondai: 4,
    prompt: "4番：市民センターで受付の人と男の人が話しています。男の人はこのあと、何をしなければなりませんか。",
    options: [
      "1. だいひょうしゃの名前を書く",
      "2. メンバーぜんいんに住所を聞く",
      "3. 利用の注意点をかくにんする",
      "4. 使用料をはらう"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "男", text: "すみません、体育館の予約申込書を書いたんですが、これでいいですか。" },
      { speaker: "女", text: "はい、代表者のお名前とご住所、それから使用料もいただいていますね。あ、裏面に『利用の注意点』が書いてありますので、そちらを読んで確認のチェックを入れてください。メンバー全員の住所は不要です。" },
      { speaker: "質問", text: "男の人はこのあと、何をしなければなりませんか。" }
    ],
    targetWord: "利用の注意点をかくにんする",
    reading: "りようのちゅういてんをかくにんする",
    meaningEn: "Check the precautions for use on the back of the form (Option 3)",
    translationId: "Memeriksa poin-poin perhatian penggunaan fasilitas di halaman belakang formulir.",
    notes: "Nama perwakilan dan biaya sewa sudah selesai, yang belum dilakukan adalah membaca & mencentang 『利用の注意点』(opsi 3)."
  },
  {
    num: 5,
    mondai: 1,
    questionNumberInMondai: 5,
    prompt: "5番：大学の図書館で、男の学生と図書館の人が話しています。男の学生はこのあと、どうしますか。",
    options: [
      "1. ほかの大学のとしょかんに行く",
      "2. 本のゆうそうを しんせいする",
      "3. 本のコピーをしんせいする",
      "4. ぶんがくぶのしりょうしつに行く"
    ],
    correctIndex: 3,
    dialogueScript: [
      { speaker: "男", text: "すみません、レポートに使うこの本を探しているんですが、貸出中になっていて……他の大学の図書館から郵送やコピーを申請できますか。" },
      { speaker: "女", text: "ええ、できますが1週間ほどかかりますよ。あ、ちょっと待ってください。この本なら、文学部の資料室にも1冊置いてありますよ。あそこなら今日すぐ読めます。" },
      { speaker: "男", text: "本当ですか！じゃあ、今からそこへ行ってみます。" },
      { speaker: "質問", text: "男の学生はこのあと、どうしますか。" }
    ],
    targetWord: "ぶんがくぶのしりょうしつに行く",
    reading: "ぶんがくぶのしりょうしつにいく",
    meaningEn: "Go to the Literature Department's reference room (Option 4)",
    translationId: "Pergi ke ruang referensi Fakultas Sastra.",
    notes: "Karena buku yang sama tersedia di ruang referensi Fakultas Sastra (文学部の資料室) dan bisa dibaca hari ini juga, mahasiswa langsung menuju ke sana (opsi 4)."
  },
  {
    num: 6,
    mondai: 1,
    questionNumberInMondai: 6,
    prompt: "6番：パーティー会場で、女の人と男の人が準備をしています。男の人はこのあと、何をしますか。",
    options: [
      "1. テーブルを動かす",
      "2. いすを運ぶ",
      "3. かびんをかたづける",
      "4. ゆかをそうじする"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "テーブルはもう動かしたし、床の掃除も終わったね。次はテーブルの上の花瓶を片付けようか。" },
      { speaker: "女", text: "花瓶はそのままでいいって店長が言ってたよ。それより、参加者が増えたから、倉庫から椅子をあと10脚運んできてくれる？" },
      { speaker: "男", text: "わかった。すぐ運んでくるよ。" },
      { speaker: "質問", text: "男の人はこのあと、何をしますか。" }
    ],
    targetWord: "いすを運ぶ",
    reading: "いすをはこぶ",
    meaningEn: "Carry chairs from the storage room (Option 2)",
    translationId: "Mengangkut kursi tambahan dari gudang.",
    notes: "Meja dan lantai sudah selesai, vas bunga dibiarkan tetap di tempat, dan pria diminta mengangkut 10 kursi tambahan (いすを運ぶ = opsi 2)."
  },

  // ================= 問題 2 (7 - 12 / 1番 - 6番) =================
  {
    num: 7,
    mondai: 2,
    questionNumberInMondai: 1,
    prompt: "1番：女子学生がスピーチの練習をしたあと、先生と話しています。先生は、女子学生にどんなアドバイスをしましたか。",
    options: [
      "1. 前を見て話す",
      "2. もう少しゆっくり話す",
      "3. 決められた時間内に話し終える",
      "4. スピーチをみじかくする"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "先生、今のスピーチの練習、どうでしたか。時間内に終わるように少し急いで話したんですが。" },
      { speaker: "男", text: "前をしっかり見て話せていたし、時間の長さもちょうどよかったですよ。ただ、後半が少し早口になって聞き取りにくかったので、もう少しゆっくり落ち着いて話すといいですね。" },
      { speaker: "質問", text: "先生は、女子学生にどんなアドバイスをしましたか。" }
    ],
    targetWord: "もう少しゆっくり話す",
    reading: "もうすこしゆっくりはなす",
    meaningEn: "Speak a little more slowly (Option 2)",
    translationId: "Berbicara sedikit lebih pelan.",
    notes: "「もう少しゆっくり落ち着いて話すといいですね。」(opsi 2)."
  },
  {
    num: 8,
    mondai: 2,
    questionNumberInMondai: 2,
    prompt: "2番：男の人と女の人が動物園について話しています。女の人は、その動物園のどんなところが一番好きだと言っていますか。",
    options: [
      "1. 広くてきれいなところ",
      "2. 動物とあそべる場所があるところ",
      "3. めずらしい動物がいるところ",
      "4. 動物のしゅるいが多いところ"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "先週、新しくなった緑動物園に行ってきたんだ。広くてきれいだったし、珍しい鳥もいたよ。" },
      { speaker: "女", text: "私もあの動物園、大好き！動物の種類はそれほど多くないけど、うさぎや羊に直接触って一緒に遊べる広場があるでしょう？私はあそこが一番気に入ってるの。" },
      { speaker: "質問", text: "女の人は、その動物園のどんなところが一番好きだと言っていますか。" }
    ],
    targetWord: "動物とあそべる場所があるところ",
    reading: "どうぶつとあそべるばしょがあるところ",
    meaningEn: "That there is a place where you can play with the animals (Option 2)",
    translationId: "Adanya area tempat pengunjung bisa bermain bersama hewan.",
    notes: "「うさぎや羊に直接触って一緒に遊べる広場があるでしょう？私はあそこが一番気に入ってるの。」(opsi 2)."
  },
  {
    num: 9,
    mondai: 2,
    questionNumberInMondai: 3,
    prompt: "3番：大学のテニス部のミーティングで、キャプテンが話しています。練習のやり方をどのように変えると言っていますか。",
    options: [
      "1. 毎日れんしゅうする",
      "2. きほんのれんしゅうをふやす",
      "3. 1日のれんしゅう時間をへらす",
      "4. 週1日はれんしゅうを休む"
    ],
    correctIndex: 3,
    dialogueScript: [
      { speaker: "男", text: "これまで私たちは大会に向けて毎日休まず練習してきましたが、最近疲れがたまってけがをする部員が増えています。1日の練習時間や基本練習のメニューは変えませんが、来週から水曜日は練習を休みにします。しっかり体を休めてください。" },
      { speaker: "質問", text: "練習のやり方をどのように変えると言っていますか。" }
    ],
    targetWord: "週1日はれんしゅうを休む",
    reading: "しゅういちにちはれんしゅうをやすむ",
    meaningEn: "Take one day off from practice every week (Option 4)",
    translationId: "Meliburkan latihan 1 hari dalam seminggu (setiap hari Rabu).",
    notes: "「来週から水曜日は練習を休みにします。」→ libur latihan 1 hari seminggu (opsi 4)."
  },
  {
    num: 10,
    mondai: 2,
    questionNumberInMondai: 4,
    prompt: "4番：旅行会社の人がツアーの参加者に話しています。スーツケースを預ける人は、いつまでにホテルのロビーに持ってこなければなりませんか。",
    options: [
      "1. 出発の前日の午後6時",
      "2. 出発の前日の午後8時",
      "3. 出発の日の午前6時",
      "4. 出発の日の午前8時"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "女", text: "明日の朝は午前8時にバスで出発します。大きなスーツケースを先にトラックで空港へ送りたい方は、当初は今夜8時までにロビーに持ってきていただく予定でしたが、トラックの時間が変わったため、明日の朝、出発当日の午前6時までにロビーへお持ちください。" },
      { speaker: "質問", text: "スーツケースを預ける人は、いつまでにホテルのロビーに持ってこなければなりませんか。" }
    ],
    targetWord: "出発の日の午前6時",
    reading: "しゅっぱつのひのごぜんろくじ",
    meaningEn: "By 6:00 AM on the day of departure (Option 3)",
    translationId: "Paling lambat pukul 6.00 pagi pada hari keberangkatan.",
    notes: "Jadwal truk berubah menjadi: 「明日の朝、出発当日の午前6時までにロビーへお持ちください。」(opsi 3)."
  },
  {
    num: 11,
    mondai: 2,
    questionNumberInMondai: 5,
    prompt: "5番：男の人が、子どもに水泳を習わせた理由を話しています。どうして水泳を習わせたと言っていますか。",
    options: [
      "1. むすこがやりたいと言ったから",
      "2. 体力をつけさせたかったから",
      "3. じしんをつけさせたかったから",
      "4. 勉強をがんばるようになると聞いたから"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "うちの息子、小学生のころ風邪をひきやすくて体が弱かったから、体力をつけさせたくて水泳教室に通わせたんだ。最初は本人は嫌がっていたんだけど、続けているうちに体も丈夫になって、自信もついたみたいだよ。" },
      { speaker: "質問", text: "どうして水泳を習わせたと言っていますか。" }
    ],
    targetWord: "体力をつけさせたかったから",
    reading: "たいりょくをつけさせたかったから",
    meaningEn: "Because he wanted his son to build physical strength/stamina (Option 2)",
    translationId: "Karena ingin putranya memiliki stamina/fisik yang kuat.",
    notes: "Alasan awal menyuruh kursus renang: 「風邪をひきやすくて体が弱かったから、体力をつけさせたくて水泳教室に通わせたんだ。」(opsi 2)."
  },
  {
    num: 12,
    mondai: 2,
    questionNumberInMondai: 6,
    prompt: "6番：テレビで、パン屋の店長が話しています。店長は何について話していますか。",
    options: [
      "1. しょうひんを売るためのくふう",
      "2. 店でいちばん売れているもの",
      "3. 開店前にじゅんびすること",
      "4. 店を始めた年"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "男", text: "うちのパン屋では、お客様に焼きたてのパンを手に取ってもらえるように、パンが焼き上がる時間を書いたカードを棚の前に置いています。また、どんな材料を使っているか絵を描いてわかりやすく紹介しています。そうすると、お客様が安心して買ってくださるんです。" },
      { speaker: "質問", text: "店長は何について話していますか。" }
    ],
    targetWord: "しょうひんを売るためのくふう",
    reading: "しょうひんをうるためのくふう",
    meaningEn: "Creative efforts / ideas for selling products (Option 1)",
    translationId: "Upaya kreatif / terobosan untuk menjual produk di tokonya.",
    notes: "Manajer toko menceritakan berbagai upaya kreatif (工夫) seperti memasang kartu jam matang roti dan ilustrasi bahan agar pelanggan tertarik membeli (opsi 1)."
  },

  // ================= 問題 3 概要理解 (13 - 15 / 1番 - 3番) =================
  {
    num: 13,
    mondai: 3,
    questionNumberInMondai: 1,
    prompt: "問題3・1番：テレビで専門家が話しています。専門家は主に何について話していますか。",
    options: [
      "1. 朝ごはんを食べることの大切さ",
      "2. 朝ごはんを短時間で作る方法",
      "3. 子どもが喜ぶ朝ごはんのメニュー",
      "4. 世界のいろいろな朝ごはん"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "朝は忙しくて朝食を抜いてしまう人も多いですが、朝ごはんを食べると脳にエネルギーが送られて集中力が高まり、1日を元気に始められます。バナナ1本やスープだけでも構いませんから、毎朝何か食べてから出かける習慣をつけましょう。" },
      { speaker: "質問", text: "専門家は主に何について話していますか。" }
    ],
    targetWord: "朝ごはんを食べることの大切さ",
    reading: "あさごはんをたべることのたいせつさ",
    meaningEn: "The importance of eating breakfast (Option 1)",
    translationId: "Pentingnya sarapan pagi.",
    notes: "Inti pembicaraan adalah pentingnya makan pagi untuk energi otak dan konsentrasi (opsi 1)."
  },
  {
    num: 14,
    mondai: 3,
    questionNumberInMondai: 2,
    prompt: "問題3・2番：会社の会議で課長が話しています。課長が言いたいことは何ですか。",
    options: [
      "1. 残業を減らして早く帰ってほしい",
      "2. 会議の時間を短くしてほしい",
      "3. 新しい商品のアイデアを出してほしい",
      "4. 他の部署ともっと協力してほしい"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "男", text: "来年の春に発売する新しいお菓子の企画についてですが、若い世代にもっと買ってもらえるようなこれまでにない商品を作りたいと考えています。来週の会議までに、一人二つ以上、自由な発想で新商品のアイデアを考えてきてください。" },
      { speaker: "質問", text: "課長が言いたいことは何ですか。" }
    ],
    targetWord: "新しい商品のアイデアを出してほしい",
    reading: "あたらしいしょうひんのあいであをだしてほしい",
    meaningEn: "Wants team members to come up with ideas for a new product (Option 3)",
    translationId: "Meminta para staf mengajukan ide produk baru.",
    notes: "「新商品のアイデアを考えてきてください」→ meminta ide produk baru (opsi 3)."
  },
  {
    num: 15,
    mondai: 3,
    questionNumberInMondai: 3,
    prompt: "問題3・3番：ラジオでアナウンサーが町の図書館について話しています。何について紹介していますか。",
    options: [
      "1. 図書館が新しく建て替えられたこと",
      "2. 図書館で始まった新しいサービス",
      "3. 図書館の本を汚さないためのルール",
      "4. 図書館で働くボランティアの募集"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "市立図書館では今月から、仕事帰りの方でも本を借りられるように平日の開館時間を夜9時まで延長しました。また、スマートフォンから読みたい本の予約や貸出期間の延長ができるシステムも新たにスタートしました。" },
      { speaker: "質問", text: "アナウンサーは何について紹介していますか。" }
    ],
    targetWord: "図書館で始まった新しいサービス",
    reading: "としょかんで始まったあたらしいさーびす",
    meaningEn: "New services started at the city library (Option 2)",
    translationId: "Layanan baru yang dimulai di perpustakaan kota.",
    notes: "Memperkenalkan perpanjangan jam buka dan sistem reservasi via smartphone sebagai layanan baru perpustakaan (opsi 2)."
  },

  // ================= 問題 4 発話表現 (16 - 19 / 1番 - 4番, 3 Opsi) =================
  {
    num: 16,
    mondai: 4,
    questionNumberInMondai: 1,
    prompt: "問題4・1番：友達の家に着きました。玄関で友達が迎えてくれています。やじるし（➡）の人は何と言いますか。",
    options: [
      "1. おじゃまします。",
      "2. いらっしゃいませ。",
      "3. ごちそうさまでした。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "アナウンス", text: "友達の家に着きました。やじるしの人は何と言いますか。" },
      { speaker: "女", text: "1. おじゃまします。 2. いらっしゃいませ。 3. ごちそうさまでした。" }
    ],
    targetWord: "おじゃまします",
    reading: "おじゃまします",
    meaningEn: "Excuse me for intruding / May I come in (Option 1)",
    translationId: "Permisi (saat masuk ke rumah orang lain).",
    notes: "Saat memasuki rumah orang lain diucapkan 「おじゃまします。」(opsi 1)."
  },
  {
    num: 17,
    mondai: 4,
    questionNumberInMondai: 2,
    prompt: "問題4・2番：重い荷物を持って部屋に入ろうとしています。ドアの近くにいる人にドアを開けてもらいたいです。何と言いますか。",
    options: [
      "1. すみません、ドアを開けてあげましょうか。",
      "2. すみません、ドアを開けてもらえませんか。",
      "3. すみません、ドアを開けてもいいですか。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "アナウンス", text: "重い荷物を持って部屋に入ろうとしています。ドアを開けてもらいたいです。何と言いますか。" },
      { speaker: "男", text: "1. すみません、ドアを開けてあげましょうか。 2. すみません、ドアを開けてもらえませんか。 3. すみません、ドアを開けてもいいですか。" }
    ],
    targetWord: "すみません、ドアを開けてもらえませんか",
    reading: "どあをあけてもらえませんか",
    meaningEn: "Excuse me, could you open the door for me? (Option 2)",
    translationId: "Permisi, bisakah tolong bukakan pintunya?",
    notes: "Meminta bantuan orang lain membukakan pintu menggunakan V-て＋もらえませんか (opsi 2)."
  },
  {
    num: 18,
    mondai: 4,
    questionNumberInMondai: 3,
    prompt: "問題4・3番：喫茶店で友達と話しています。隣のテーブルの椅子が空いているので、使いたいです。隣の人に何と言いますか。",
    options: [
      "1. あのう、この椅子、使ってもよろしいですか。",
      "2. あのう、この椅子、使ってくれませんか。",
      "3. あのう、この椅子、使いましょうか。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "アナウンス", text: "隣のテーブルの椅子を使いたいです。隣の人に何と言いますか。" },
      { speaker: "女", text: "1. あのう、この椅子、使ってもよろしいですか。 2. あのう、この椅子、使ってくれませんか。 3. あのう、この椅子、使いましょうか。" }
    ],
    targetWord: "この椅子、使ってもよろしいですか",
    reading: "つかってよろしいですか",
    meaningEn: "Excuse me, may I use this chair? (Option 1)",
    translationId: "Permisi, bolehkah saya memakai kursi ini?",
    notes: "Meminta izin dengan sopan menggunakan V-てもよろしいですか (opsi 1)."
  },
  {
    num: 19,
    mondai: 4,
    questionNumberInMondai: 4,
    prompt: "問題4・4番：スポーツジムの受付で、見学を申し込みたいです。受付の人に何と言いますか。",
    options: [
      "1. すみません、中を見学させていただけますか。",
      "2. すみません、中を見学してくださいますか。",
      "3. すみません、中を見学されたらどうですか。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "アナウンス", text: "スポーツジムの受付で、見学を申し込みたいです。受付の人に何と言いますか。" },
      { speaker: "男", text: "1. すみません、中を見学させていただけますか。 2. すみません、中を見学してくださいますか。 3. すみません、中を見学されたらどうですか。" }
    ],
    targetWord: "中を見学させていただけますか",
    reading: "けんがくさせていただけますか",
    meaningEn: "Excuse me, may I be allowed to tour/look inside? (Option 1)",
    translationId: "Permisi, bolehkah saya diizinkan melihat-lihat bagian dalamnya?",
    notes: "Meminta izin melakukan sesuatu secara sopan menggunakan V-kausatif (させて) + いただけますか (見学させていただけますか = opsi 1)."
  },

  // ================= 問題 5 即時応答 (20 - 28 / 1番 - 9番, 3 Opsi) =================
  {
    num: 20,
    mondai: 5,
    questionNumberInMondai: 1,
    prompt: "問題5・1番：「田中さん、明日の会議の資料、もうコピーしてくれた？」",
    options: [
      "1. あっ、これからするところです。",
      "2. ええ、コピーしておいてください。",
      "3. いいえ、コピーしなくていいですよ。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "田中さん、明日の会議の資料、もうコピーしてくれた？" },
      { speaker: "男", text: "1. あっ、これからするところです。 2. ええ、コピーしておいてください。 3. いいえ、コピーしなくていいですよ。" }
    ],
    targetWord: "あっ、これからするところです",
    reading: "これからするところです",
    meaningEn: "Oh, I'm just about to do it now (Option 1)",
    translationId: "Oh, saya baru saja mau mengerjakannya sekarang.",
    notes: "これからするところです = baru akan mengerjakannya sekarang (opsi 1)."
  },
  {
    num: 21,
    mondai: 5,
    questionNumberInMondai: 2,
    prompt: "問題5・2番：「この新しいパソコン、前のよりずっと使いやすいね。」",
    options: [
      "1. 前のほうがよかったね。",
      "2. ほんとう、買ってよかったね。",
      "3. まだ使ったことがないんだね。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "この新しいパソコン、前のよりずっと使いやすいね。" },
      { speaker: "女", text: "1. 前のほうがよかったね。 2. ほんとう、買ってよかったね。 3. まだ使ったことがないんだね。" }
    ],
    targetWord: "ほんとう、買ってよかったね",
    reading: "ほんとうかってよかったね",
    meaningEn: "Really, I'm glad we bought it! (Option 2)",
    translationId: "Benar ya, syukurlah kita membelinya.",
    notes: "Menyetujui bahwa laptop baru jauh lebih mudah dipakai: 「ほんとう、買ってよかったね。」(opsi 2)."
  },
  {
    num: 22,
    mondai: 5,
    questionNumberInMondai: 3,
    prompt: "問題5・3番：「すみません、駅へ行くバスはもう出てしまいましたか。」",
    options: [
      "1. ええ、ちょうど今出たところですよ。",
      "2. いいえ、まだ乗らないでください。",
      "3. はい、あと5分で来ますよ。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "すみません、駅へ行くバスはもう出てしまいましたか。" },
      { speaker: "男", text: "1. ええ、ちょうど今出たところですよ。 2. いいえ、まだ乗らないでください。 3. はい、あと5分で来ますよ。" }
    ],
    targetWord: "ええ、ちょうど今出たところですよ",
    reading: "ちょうどいまでたところですよ",
    meaningEn: "Yes, it just left right now (Option 1)",
    translationId: "Ya, baru saja berangkat sekarang.",
    notes: "もう出てしまいましたか (Apakah sudah berangkat?) → ええ、ちょうど今出たところですよ (Ya, baru saja berangkat, opsi 1)."
  },
  {
    num: 23,
    mondai: 5,
    questionNumberInMondai: 4,
    prompt: "問題5・4番：「森さん、風邪はどう？もう熱は下がった？」",
    options: [
      "1. うん、おかげさまで元気になったよ。",
      "2. うん、お大事にね。",
      "3. いいえ、熱が出たままなんだ。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "森さん、風邪はどう？もう熱は下がった？" },
      { speaker: "男", text: "1. うん、おかげさまで元気になったよ。 2. うん、お大事にね。 3. いいえ、熱が出たままなんだ。" }
    ],
    targetWord: "うん、おかげさまで元気になったよ",
    reading: "おかげさまでげんきになったよ",
    meaningEn: "Yes, thanks to you, I'm feeling well now (Option 1)",
    translationId: "Ya, berkat doa Anda saya sudah sehat kembali.",
    notes: "Saat ditanya kondisi kesehatan yang sudah sembuh, dijawab dengan 「おかげさまで元気になったよ。」(opsi 1)."
  },
  {
    num: 24,
    mondai: 5,
    questionNumberInMondai: 5,
    prompt: "問題5・5番：「あれ？雨が降ってきたね。傘持ってる？」",
    options: [
      "1. うん、持ってこなかったよ。",
      "2. ううん、駅まで走ろうか。",
      "3. じゃあ、貸してあげるね。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "あれ？雨が降ってきたね。傘持ってる？" },
      { speaker: "女", text: "1. うん、持ってこなかったよ。 2. ううん、駅まで走ろうか。 3. じゃあ、貸してあげるね。" }
    ],
    targetWord: "ううん、駅まで走ろうか",
    reading: "ううんえきまではしろうか",
    meaningEn: "No (I don't have one), shall we run to the station? (Option 2)",
    translationId: "Enggak bawa, bagaimana kalau kita lari sampai stasiun?",
    notes: "ううん (tidak punya payung) → mengajak lari sampai stasiun (opsi 2)."
  },
  {
    num: 25,
    mondai: 5,
    questionNumberInMondai: 6,
    prompt: "問題5・6番：「すみません、この近くにATMはありますか。」",
    options: [
      "1. あそこのコンビニの中にありますよ。",
      "2. はい、ここで払えますよ。",
      "3. いいえ、あそこにはありませんよ。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "すみません、この近くにATMはありますか。" },
      { speaker: "男", text: "1. あそこのコンビニの中にありますよ。 2. はい、ここで払えますよ。 3. いいえ、あそこにはありませんよ。" }
    ],
    targetWord: "あそこのコンビニの中にありますよ",
    reading: "あそこのこんびにのなかにありますよ",
    meaningEn: "There is one inside that convenience store over there (Option 1)",
    translationId: "Ada di dalam minimarket sebelah sana.",
    notes: "Memberitahukan lokasi ATM terdekat: あそこのコンビニの中にありますよ (opsi 1)."
  },
  {
    num: 26,
    mondai: 5,
    questionNumberInMondai: 7,
    prompt: "問題5・7番：「部長、来週の出張のホテル、予約しておきましょうか。」",
    options: [
      "1. うん、頼むよ。",
      "2. ええ、予約してあげますよ。",
      "3. いいえ、予約してもらいました。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "部長、来週の出張のホテル、予約しておきましょうか。" },
      { speaker: "男", text: "1. うん、頼むよ。 2. ええ、予約してあげますよ。 3. いいえ、予約してもらいました。" }
    ],
    targetWord: "うん、頼むよ",
    reading: "うんたのむよ",
    meaningEn: "Yeah, please do / I'm counting on you (Option 1)",
    translationId: "Ya, tolong ya (うん、頼むよ).",
    notes: "Atasan menerima tawaran bawahan yang menanyakan ～ておきましょうか dengan 「うん、頼むよ。」(opsi 1)."
  },
  {
    num: 27,
    mondai: 5,
    questionNumberInMondai: 8,
    prompt: "問題5・8番：「今日のサッカーの試合、見に行けなくて残念だったね。」",
    options: [
      "1. 本当に。すごく面白かったね。",
      "2. うん、次は絶対見に行こうね。",
      "3. ええ、見に行けてよかったね。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "今日のサッカーの試合、見に行けなくて残念だったね。" },
      { speaker: "女", text: "1. 本当に。すごく面白かったね。 2. うん、次は絶対見に行こうね。 3. ええ、見に行けてよかったね。" }
    ],
    targetWord: "うん、次は絶対見に行こうね",
    reading: "つぎはぜったいみにいこうね",
    meaningEn: "Yeah, let's definitely go watch it next time! (Option 2)",
    translationId: "Iya, lain kali kita harus pergi menontonnya ya.",
    notes: "Karena hari ini tidak bisa pergi menonton, respons yang tepat adalah 「うん、次は絶対見に行こうね。」(opsi 2)."
  },
  {
    num: 28,
    mondai: 5,
    questionNumberInMondai: 9,
    prompt: "問題5・9番：「木村さん、その新しい時計、とてもよく似合っていますね。」",
    options: [
      "1. いいえ、どういたしまして。",
      "2. ありがとうございます。気に入ってるんです。",
      "3. そうですか。すみません。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "木村さん、その新しい時計、とてもよく似合っていますね。" },
      { speaker: "男", text: "1. いいえ、どういたしまして。 2. ありがとうございます。気に入ってるんです。 3. そうですか。すみません。" }
    ],
    targetWord: "ありがとうございます。気に入ってるんです",
    reading: "きにいってるんです",
    meaningEn: "Thank you. I really like it too (Option 2)",
    translationId: "Terima kasih. Saya sangat menyukainya.",
    notes: "Menerima pujian tentang jam tangan baru dengan 「ありがとうございます。気に入ってるんです。」(opsi 2)."
  }
];

/**
 * Mengonversi seluruh 35 soal Kosakata (文字・語彙) 2022年12月 JLPT N3 ke format QuestionItem.
 */
export function get2022N3VocabQuestions(): QuestionItem[] {
  return RAW_2022_N3_VOCAB.map((item) => {
    const label = N3_VOCAB_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2022_n3_vocab_${String(item.num).padStart(2, "0")}`,
      type: item.mondai === 1 || item.mondai === 3 ? "G1_KANJI_READING" : "G2_KANJI_WRITING",
      level: "N3",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      officialSourceLabel: "2022年12月 日本語能力試験 N3 • 言語知識（文字・語彙）",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2022OfficialN3",
        generator_version: "2022.12",
        seed: 2022300 + item.num,
        tatoeba_jpn_id: 20223100 + item.num,
        jmdict_ent_seq: `2022-N3-V-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2022-12 N3"
      }
    };
  });
}

/**
 * Mengonversi seluruh 38 soal Tata Bahasa & Membaca (文法・読解) 2022年12月 JLPT N3 ke format QuestionItem.
 */
export function get2022N3GrammarReadingQuestions(): QuestionItem[] {
  return RAW_2022_N3_GRAMMAR_READING.map((item) => {
    const label = N3_GRAMMAR_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2022_n3_gr_${String(item.num).padStart(2, "0")}`,
      type: item.mondai <= 3 ? "G3_PARTICLES" : "G4_CONTEXT_VOCAB",
      level: "N3",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      passageTitle: item.passageTitle,
      passageHtml: item.passageHtml,
      isStarQuestion: item.isStarQuestion,
      officialSourceLabel: "2022年12月 日本語能力試験 N3 • 言語知識（文法）・読解",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2022OfficialN3",
        generator_version: "2022.12",
        seed: 2022350 + item.num,
        tatoeba_jpn_id: 20223200 + item.num,
        jmdict_ent_seq: `2022-N3-GR-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2022-12 N3"
      }
    };
  });
}

/**
 * Mengonversi seluruh 28 soal Mendengarkan (聴解) 2022年12月 JLPT N3 ke format QuestionItem.
 */
export function get2022N3ListeningQuestions(): QuestionItem[] {
  return RAW_2022_N3_LISTENING.map((item) => {
    const label = N3_LISTENING_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2022_n3_listen_${String(item.num).padStart(2, "0")}`,
      type: "G4_CONTEXT_VOCAB",
      level: "N3",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      dialogueScript: item.dialogueScript,
      officialSourceLabel: "2022年12月 日本語能力試験 N3 • 聴解",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2022OfficialN3",
        generator_version: "2022.12",
        seed: 2022390 + item.num,
        tatoeba_jpn_id: 20223300 + item.num,
        jmdict_ent_seq: `2022-N3-L-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2022-12 N3"
      }
    };
  });
}

