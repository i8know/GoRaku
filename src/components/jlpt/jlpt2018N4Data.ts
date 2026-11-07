import { QuestionItem, QuestionDialogueTurn } from "../../lib/questionPack";
import { MockTest } from "./types";

interface Raw2018N4VocabItem {
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

const N4_VOCAB_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5, { ja: string; id: string }> = {
  1: {
    ja: "もんだい 1：＿＿＿のことばは ひらがなで どう かきますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 1 — Bacaan Kanji N4 (Soal 1–9)"
  },
  2: {
    ja: "もんだい 2：＿＿＿のことばは どう かきますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 2 — Penulisan Kanji N4 (Soal 10–15)"
  },
  3: {
    ja: "もんだい 3：（　）に なにを いれますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 3 — Kosakata Kontekstual N4 (Soal 16–25)"
  },
  4: {
    ja: "もんだい 4：＿＿＿の ぶんと だいたい おなじ いみの ぶんが あります。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。",
    id: "Mondai 4 — Sinonim & Parafrasa Kalimat N4 (Soal 26–30)"
  },
  5: {
    ja: "もんだい 5：つぎの ことばの つかいかたで いちばん いい ものを 1・2・3・4から ひとつ えらんで ください。",
    id: "Mondai 5 — Penggunaan Kata dalam Kalimat / 用法 (Soal 31–35)"
  }
};

const RAW_2018_N4_VOCAB: Raw2018N4VocabItem[] = [
  // もんだい 1 (1 - 9)
  {
    num: 1,
    mondai: 1,
    prompt: "今日は とても <u>楽しかった</u>ですね。",
    options: ["いそがしかった", "すずしかった", "たのしかった", "かなしかった"],
    correctIndex: 2,
    targetWord: "楽しかった",
    reading: "たのしかった",
    meaningEn: "was fun; was enjoyable",
    translationId: "Hari ini sangat menyenangkan, ya.",
    notes: "楽しい（たのしい）→ 楽しかった（たのしかった）. いそがしい = 忙しい (sibuk), すずしい = 涼しい (sejuk), かなしい = 悲しい (sedih)."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "わたしは この <u>味</u>が すきです。",
    options: ["かたち", "いろ", "におい", "あじ"],
    correctIndex: 3,
    targetWord: "味",
    reading: "あじ",
    meaningEn: "taste; flavor",
    translationId: "Saya suka rasa ini.",
    notes: "味 dibaca あじ (rasa). かたち = 形 (bentuk), いろ = 色 (warna), におい = 匂い (aroma/bau)."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "この あたりは ちょっと <u>不便</u>ですね。",
    options: ["ふべん", "ぶべん", "ふへん", "ぶへん"],
    correctIndex: 0,
    targetWord: "不便",
    reading: "ふべん",
    meaningEn: "inconvenient",
    translationId: "Daerah sekitar sini agak tidak praktis, ya.",
    notes: "不便 dibaca ふべん (tidak praktis). Lawan katanya adalah 便利（べんり）."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "やさいを <u>切って</u> ください。",
    options: ["とって", "きって", "あらって", "もって"],
    correctIndex: 1,
    targetWord: "切って",
    reading: "きって",
    meaningEn: "please cut",
    translationId: "Tolong potong sayurannya.",
    notes: "切る（きる）→ 切って（きって = memotong）. あらって = 洗って (mencuci)."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "はやしさん<u>以外</u>は みんな 来ました。",
    options: ["にそと", "にがい", "いそと", "いがい"],
    correctIndex: 3,
    targetWord: "以外",
    reading: "いがい",
    meaningEn: "except for; other than",
    translationId: "Semua orang sudah datang kecuali Saudara Hayashi.",
    notes: "以外 dibaca いがい (selain / kecuali)."
  },
  {
    num: 6,
    mondai: 1,
    prompt: "まどから ずっと <u>雲</u>を 見て いました。",
    options: ["ほし", "ゆき", "くも", "そら"],
    correctIndex: 2,
    targetWord: "雲",
    reading: "くも",
    meaningEn: "cloud",
    translationId: "Saya terus memandangi awan dari jendela.",
    notes: "雲 dibaca くも (awan). ほし = 星 (bintang), ゆき = 雪 (salju), そら = 空 (langit)."
  },
  {
    num: 7,
    mondai: 1,
    prompt: "その 電車は <u>急行</u>ですよ。",
    options: ["きゅこ", "きゅこう", "きゅうこ", "きゅうこう"],
    correctIndex: 3,
    targetWord: "急行",
    reading: "きゅうこう",
    meaningEn: "express train",
    translationId: "Kereta itu adalah kereta ekspres, lho.",
    notes: "急（きゅう）＋ 行（こう）＝ きゅうこう (keduanya memiliki bunyi panjang う)."
  },
  {
    num: 8,
    mondai: 1,
    prompt: "これは <u>写さないで</u> ください。",
    options: ["おさないで", "うつさないで", "けさないで", "おとさないで"],
    correctIndex: 1,
    targetWord: "写さないで",
    reading: "うつさないで",
    meaningEn: "please do not photograph / copy",
    translationId: "Tolong jangan memotret/menyalin ini.",
    notes: "写す（うつす = memotret/menyalin）→ 写さないで（うつさないで）."
  },
  {
    num: 9,
    mondai: 1,
    prompt: "その いけんには <u>反対</u>です。",
    options: ["はんたい", "ほんたい", "はんだい", "ほんだい"],
    correctIndex: 0,
    targetWord: "反対",
    reading: "はんたい",
    meaningEn: "opposition; against",
    translationId: "Saya menentang (tidak setuju dengan) pendapat itu.",
    notes: "反対 dibaca はんたい (menentang / berlawanan)."
  },

  // もんだい 2 (10 - 15)
  {
    num: 10,
    mondai: 2,
    prompt: "<u>くろい</u> くつしたが ほしいです。",
    options: ["白い", "黒い", "赤い", "青い"],
    correctIndex: 1,
    targetWord: "黒い",
    reading: "くろい",
    meaningEn: "black",
    translationId: "Saya ingin kaus kaki hitam.",
    notes: "黒い = くろい (hitam), 白い = しろい (putih), 赤い = あかい (merah), 青い = あおい (biru)."
  },
  {
    num: 11,
    mondai: 2,
    prompt: "なつやすみの <u>けいかく</u>は まだ きまって いません。",
    options: ["計書", "訂画", "計画", "訂書"],
    correctIndex: 2,
    targetWord: "計画",
    reading: "けいかく",
    meaningEn: "plan; schedule",
    translationId: "Rencana liburan musim panas masih belum diputuskan.",
    notes: "計画（けいかく）= rencana."
  },
  {
    num: 12,
    mondai: 2,
    prompt: "わたしは <u>いしゃ</u>に なりたいです。",
    options: ["匠員", "医員", "匠者", "医者"],
    correctIndex: 3,
    targetWord: "医者",
    reading: "いしゃ",
    meaningEn: "doctor; physician",
    translationId: "Saya ingin menjadi dokter.",
    notes: "医者（いしゃ）= dokter."
  },
  {
    num: 13,
    mondai: 2,
    prompt: "あしたの <u>よる</u> かぞくと 出かけます。",
    options: ["夜", "昼", "夕", "朝"],
    correctIndex: 0,
    targetWord: "夜",
    reading: "よる",
    meaningEn: "night; evening",
    translationId: "Besok malam saya akan pergi keluar bersama keluarga.",
    notes: "夜 = よる (malam), 昼 = ひる (siang), 夕 = ゆう (sore), 朝 = あさ (pagi)."
  },
  {
    num: 14,
    mondai: 2,
    prompt: "かさを <u>かして</u> ください。",
    options: ["貨して", "資して", "貸して", "質して"],
    correctIndex: 2,
    targetWord: "貸して",
    reading: "かして",
    meaningEn: "please lend me",
    translationId: "Tolong pinjami saya payung.",
    notes: "貸す（かす = meminjamkan）→ 貸して（かして）. Bagian atasnya adalah 代 + 貝."
  },
  {
    num: 15,
    mondai: 2,
    prompt: "あしたは サッカーの <u>しあい</u>が あります。",
    options: ["誠会", "誠合", "試会", "試合"],
    correctIndex: 3,
    targetWord: "試合",
    reading: "しあい",
    meaningEn: "match; game",
    translationId: "Besok ada pertandingan sepak bola.",
    notes: "試合（しあい）= pertandingan."
  },

  // もんだい 3 (16 - 25)
  {
    num: 16,
    mondai: 3,
    prompt: "さとうさんが けがを したと 聞いて、みんな（　★　）しました。",
    options: ["しんぱい", "けいけん", "しつれい", "おじぎ"],
    correctIndex: 0,
    targetWord: "しんぱい（心配）",
    reading: "しんぱい",
    meaningEn: "worry; concern",
    translationId: "Mendengar Saudara Sato terluka, semua orang merasa khawatir.",
    notes: "けがをしたと聞いて (mendengar terluka) → しんぱいしました (khawatir)."
  },
  {
    num: 17,
    mondai: 3,
    prompt: "わたしには しょうらい かしゅに なると いう（　★　）が あります。",
    options: ["けしき", "ゆめ", "おもいで", "せわ"],
    correctIndex: 1,
    targetWord: "ゆめ（夢）",
    reading: "ゆめ",
    meaningEn: "dream; ambition",
    translationId: "Saya memiliki impian untuk menjadi penyanyi di masa depan.",
    notes: "しょうらい（将来 = masa depan）かしゅになるという 夢（ゆめ = impian）."
  },
  {
    num: 18,
    mondai: 3,
    prompt: "リーさんも こんどの パーティーに（　★　）来て くださいね。",
    options: ["ひじょうに", "ぜひ", "じゅうぶん", "いつも"],
    correctIndex: 1,
    targetWord: "ぜひ",
    reading: "ぜひ",
    meaningEn: "by all means; certainly",
    translationId: "Saudara Lee juga pastikan datang ke pesta kali ini, ya.",
    notes: "ぜひ～てください digunakan saat mengajak/mengundang seseorang dengan penuh harap."
  },
  {
    num: 19,
    mondai: 3,
    prompt: "これから きかいの つかいかたを（　★　）しますから、よく 聞いて ください。",
    options: ["じゅんび", "りよう", "せつめい", "せいさん"],
    correctIndex: 2,
    targetWord: "せつめい（説明）",
    reading: "せつめい",
    meaningEn: "explanation",
    translationId: "Sekarang saya akan menjelaskan cara penggunaan mesinnya, jadi tolong dengarkan baik-baik.",
    notes: "つかいかたを 説明（せつめい）する = menjelaskan cara pakai."
  },
  {
    num: 20,
    mondai: 3,
    prompt: "はが わるいので、（　★　）ものは 食べられません。",
    options: ["きびしい", "かたい", "はやい", "ふかい"],
    correctIndex: 1,
    targetWord: "かたい（固い・硬い）",
    reading: "かたい",
    meaningEn: "hard; solid",
    translationId: "Karena gigi saya sedang sakit/buruk, saya tidak bisa makan makanan yang keras.",
    notes: "はがわるい (gigi bermasalah) → かたいもの (makanan keras) tidak bisa dimakan."
  },
  {
    num: 21,
    mondai: 3,
    prompt: "もりさんを デートに（　★　）が、行けないと 言われました。",
    options: ["さそいました", "つたえました", "あんないしました", "しょうかいしました"],
    correctIndex: 0,
    targetWord: "さそいました（誘いました）",
    reading: "さそいました",
    meaningEn: "invited; asked out",
    translationId: "Saya mengajak Saudara Mori berkencan, tetapi dikatakan tidak bisa pergi.",
    notes: "デートに 誘う（さそう）= mengajak kencan."
  },
  {
    num: 22,
    mondai: 3,
    prompt: "わたしの むすこは 1年で 5（　★　）くらい せが 高く なりました。",
    options: ["グラム", "ばん", "けん", "センチ"],
    correctIndex: 3,
    targetWord: "センチ",
    reading: "せんち",
    meaningEn: "centimeter (cm)",
    translationId: "Putra saya bertambah tinggi sekitar 5 cm dalam satu tahun.",
    notes: "せが 高くなりました (bertambah tinggi badan) diukur dengan satuan センチ (cm)."
  },
  {
    num: 23,
    mondai: 3,
    prompt: "お店で 3だいの パソコンを（　★　）、いちばん かるい パソコンを えらびました。",
    options: ["かたづけて", "かぞえて", "くらべて", "はらって"],
    correctIndex: 2,
    targetWord: "くらべて（比べて）",
    reading: "くらべて",
    meaningEn: "compared",
    translationId: "Saya membandingkan 3 unit laptop di toko, lalu memilih laptop yang paling ringan.",
    notes: "3だいのパソコンを 比べて（くらべて = membandingkan）."
  },
  {
    num: 24,
    mondai: 3,
    prompt: "たなかさんの いえの 電気が ついて いませんね。たなかさんは（　★　）の ようです。",
    options: ["うそ", "じゆう", "ちゅうし", "るす"],
    correctIndex: 3,
    targetWord: "るす（留守）",
    reading: "るす",
    meaningEn: "absent from home; not at home",
    translationId: "Lampu rumah Saudara Tanaka tidak menyala, ya. Sepertinya Saudara Tanaka sedang tidak ada di rumah.",
    notes: "るす（留守）= sedang keluar / tidak ada di rumah."
  },
  {
    num: 25,
    mondai: 3,
    prompt: "へやの かぎを さがして いますが、まだ（　★　）。",
    options: ["みつかりません", "つかまえません", "しりません", "さわりません"],
    correctIndex: 0,
    targetWord: "みつかりません（見つかりません）",
    reading: "みつかりません",
    meaningEn: "cannot be found (intransitive)",
    translationId: "Saya sedang mencari kunci kamar, tetapi masih belum ketemu.",
    notes: "さがしていますが、まだ 見つかりません（みつかりません = belum ditemukan/ketemu）."
  },

  // もんだい 4 (26 - 30)
  {
    num: 26,
    mondai: 4,
    prompt: "<u>おとうとは あの きっさてんで アルバイトを して います。</u>",
    options: [
      "おとうとは あの きっさてんで まって います。",
      "おとうとは あの きっさてんで はたらいて います。",
      "おとうとは あの きっさてんで コーヒーを 飲んで います。",
      "おとうとは あの きっさてんで 友だちと 話して います。"
    ],
    correctIndex: 1,
    targetWord: "アルバイトをしています ＝ はたらいています",
    reading: "はたらいています",
    meaningEn: "working part-time = working",
    translationId: "Adik laki-laki saya bekerja paruh waktu di kafe itu (= bekerja di kafe itu).",
    notes: "アルバイトをする (bekerja paruh waktu) bersinonim dengan 働く（はたらく = bekerja）."
  },
  {
    num: 27,
    mondai: 4,
    prompt: "<u>わたしは すいえいが すきです。</u>",
    options: [
      "わたしは はしるのが すきです。",
      "わたしは およぐのが すきです。",
      "わたしは ごはんを 食べるのが すきです。",
      "わたしは 本を 読むのが すきです。"
    ],
    correctIndex: 1,
    targetWord: "すいえい（水泳）＝ およぐの",
    reading: "およぐ",
    meaningEn: "swimming = to swim",
    translationId: "Saya suka renang (= suka berenang).",
    notes: "水泳（すいえい = olahraga renang）sama dengan 泳ぐ（およぐ = berenang）."
  },
  {
    num: 28,
    mondai: 4,
    prompt: "<u>それを 聞いて びっくりしました。</u>",
    options: [
      "それを 聞いて わらいました。",
      "それを 聞いて こまりました。",
      "それを 聞いて おこりました。",
      "それを 聞いて おどろきました。"
    ],
    correctIndex: 3,
    targetWord: "びっくりしました ＝ おどろきました",
    reading: "おどろきました",
    meaningEn: "was surprised = was astonished",
    translationId: "Mendengar hal itu saya terkejut (= おどろきました).",
    notes: "びっくりする bersinonim dengan 驚く（おどろく = terkejut/kaget）."
  },
  {
    num: 29,
    mondai: 4,
    prompt: "<u>あの 人は うつくしいですね。</u>",
    options: [
      "あの 人は きれいですね。",
      "あの 人は 元気ですね。",
      "あの 人は おもしろいですね。",
      "あの 人は わかいですね。"
    ],
    correctIndex: 0,
    targetWord: "うつくしい（美しい）＝ きれい",
    reading: "うつくしい",
    meaningEn: "beautiful = pretty",
    translationId: "Orang itu indah/cantik, ya (= きれいですね).",
    notes: "美しい（うつくしい）bersinonim dengan きれい (cantik/indah)."
  },
  {
    num: 30,
    mondai: 4,
    prompt: "<u>この 国は こめを ゆにゅうして います。</u>",
    options: [
      "この 国は こめを ほかの 国に うって います。",
      "この 国は こめを ほかの 国から もらって います。",
      "この 国は こめを ほかの 国から 買って います。",
      "この 国は こめを ほかの 国に あげて います。"
    ],
    correctIndex: 2,
    targetWord: "ゆにゅうしています（輸入）＝ ほかの国から買っています",
    reading: "ゆにゅう",
    meaningEn: "importing rice = buying rice from other countries",
    translationId: "Negara ini mengimpor beras (= membeli beras dari negara lain).",
    notes: "輸入する（ゆにゅうする = mengimpor）berarti membeli barang dari negara lain (ほかの国から買う). Lawannya 輸出（ゆしゅつ = ekspor / menjual ke negara lain）."
  },

  // もんだい 5 (31 - 35)
  {
    num: 31,
    mondai: 5,
    prompt: "つぎの ことばの つかいかたで いちばん いい ものを えらんで ください：<br/><strong>【 さいきん（最近） 】</strong>",
    options: [
      "<u>さいきん</u> りょうりが できたので、いっしょに 食べましょう。",
      "<u>さいきん</u> しゅくだいを 出して ください。",
      "きむらさんは <u>さいきん</u> けっこんした そうです。",
      "<u>さいきん</u> 電車が 来ますから、いそいで えきに 行きましょう。"
    ],
    correctIndex: 2,
    targetWord: "さいきん（最近）",
    reading: "さいきん",
    meaningEn: "recently; lately",
    translationId: "Kabarnya Saudara Kimura baru-baru ini menikah.",
    notes: "最近（さいきん）digunakan untuk peristiwa yang terjadi akhir-akhir ini (lampau dekat) atau keadaan yang berlangsung belakangan ini. Opsi 1 seharusnya さっき/たった今, opsi 2 いま, opsi 4 もうすぐ."
  },
  {
    num: 32,
    mondai: 5,
    prompt: "つぎの ことばの つかいかたで いちばん いい ものを えらんで ください：<br/><strong>【 おと（音） 】</strong>",
    options: [
      "ラジオの <u>おと</u>が 大きいので、もう 少し 小さく して ください。",
      "日本語の <u>おと</u>が じょうずに なりたいので、毎日 たくさん 話します。",
      "店の 人に 大きな <u>おと</u>で 名前を よばれました。",
      "すずきさんが ギターで ゆうめいな <u>おと</u>を ひいて くれました。"
    ],
    correctIndex: 0,
    targetWord: "おと（音）",
    reading: "おと",
    meaningEn: "sound; volume",
    translationId: "Karena suara radio terlalu keras, tolong kecilkan sedikit lagi.",
    notes: "音（おと）adalah bunyi benda/alat (ラジオの音). Opsi 2 seharusnya 発音（はつおん）, opsi 3 声（こえ = suara manusia）, opsi 4 曲（きょく = lagu）."
  },
  {
    num: 33,
    mondai: 5,
    prompt: "つぎの ことばの つかいかたで いちばん いい ものを えらんで ください：<br/><strong>【 けんがく（見学） 】</strong>",
    options: [
      "かばんが ほしいので、デパートに 行って <u>けんがく</u>します。",
      "わからない かんじは じしょで <u>けんがく</u>して ください。",
      "先生や 友だちと こうじょうを <u>けんがく</u>しました。",
      "まいばん テレビで ニュースを <u>けんがく</u>して います。"
    ],
    correctIndex: 2,
    targetWord: "けんがく（見学）",
    reading: "けんがく",
    meaningEn: "field trip; study tour; visiting a facility to learn",
    translationId: "Saya melakukan kunjungan studi ke pabrik bersama guru dan teman.",
    notes: "見学（けんがく）adalah mengunjungi tempat seperti pabrik (工場), sekolah, atau museum untuk mengamati dan belajar secara langsung."
  },
  {
    num: 34,
    mondai: 5,
    prompt: "つぎの ことばの つかいかたで いちばん いい ものを えらんで ください：<br/><strong>【 かざる（飾る） 】</strong>",
    options: [
      "やまだ先生は テストの おしらせを きょうしつに <u>かざりました</u>。",
      "おきゃくさんが 来ますから、へやに 花を <u>かざりましょう</u>。",
      "天気が わるいので、せんたくものは うちの 中に <u>かざります</u>。",
      "こっちの エアコンは、となりの へやの かべに <u>かざって</u> ください。"
    ],
    correctIndex: 1,
    targetWord: "かざる（飾る）",
    reading: "かざる",
    meaningEn: "to decorate; to display (flowers, pictures)",
    translationId: "Karena tamu akan datang, mari kita menghias ruangan dengan bunga.",
    notes: "飾る（かざる）berarti memajang/menghias agar indah (へやに花をかざる). Pengumuman ditempel (はる), jemuran digantung (ほす), AC dipasang (つける)."
  },
  {
    num: 35,
    mondai: 5,
    prompt: "つぎの ことばの つかいかたで いちばん いい ものを えらんで ください：<br/><strong>【 こうじ（工事） 】</strong>",
    options: [
      "はが いたかったので、はいしゃで <u>こうじ</u>を して もらいました。",
      "この セーターは 古いですが、<u>こうじ</u>を して、ずっと きて います。",
      "ほんだなが こわれて しまったので、<u>こうじ</u>を しました。",
      "この みちは <u>こうじ</u>を して いるので、とおれません。"
    ],
    correctIndex: 3,
    targetWord: "こうじ（工事）",
    reading: "こうじ",
    meaningEn: "construction work; roadwork",
    translationId: "Karena jalan ini sedang ada pekerjaan konstruksi, tidak bisa dilewati.",
    notes: "工事（こうじ）adalah pekerjaan konstruksi jalan/bangunan (みちの工事). Gigi = 治療（ちりょう）, rak buku = 修理（しゅうり）/ なおす."
  }
];

interface Raw2018N4GrammarReadingItem {
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

const N4_GRAMMAR_MONDAI_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6, { ja: string; id: string }> = {
  1: {
    ja: "もんだい 1：（　）に 何を 入れますか。1・2・3・4から いちばん いい ものを 一つ えらんで ください。",
    id: "Mondai 1 — Tata Bahasa & Partikel N4 (Soal 1–15)"
  },
  2: {
    ja: "もんだい 2：★ に 入る ものは どれですか。1・2・3・4から いちばん いい ものを 一つ えらんで ください。",
    id: "Mondai 2 — Menyusun Kalimat Bintang ★ N4 (Soal 16–20)"
  },
  3: {
    ja: "もんだい 3：21 から 25 に 何を 入れますか。文章の 意味を 考えて、1・2・3・4から いちばん いい ものを 一つ えらんで ください。",
    id: "Mondai 3 — Tata Bahasa Wacana / チン メイキ「水泳」 (Soal 21–25)"
  },
  4: {
    ja: "もんだい 4：つぎの (1) から (4) の 文章を 読んで、質問に 答えて ください。",
    id: "Mondai 4 — Pemahaman Bacaan Pendek / 短文読解 (Soal 26–29)"
  },
  5: {
    ja: "もんだい 5：つぎの 文章を 読んで、質問に 答えて ください。",
    id: "Mondai 5 — Pemahaman Bacaan Menengah / ケイティ ワン「東京駅で会った人」 (Soal 30–33)"
  },
  6: {
    ja: "もんだい 6：右の ページを 見て、下の 質問に 答えて ください。",
    id: "Mondai 6 — Pencarian Informasi / 青野市ニュース「春を楽しもう」 (Soal 34–35)"
  }
};

const N4_MONDAI_3_PASSAGE_HTML = `
<div class="space-y-3 text-left">
  <p class="text-xs font-semibold text-[#a06658]">下の文章は、留学生の作文です。</p>
  <div class="p-5 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-3 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="flex items-center justify-between border-b border-[#ece7de] pb-2">
      <span class="font-bold text-base">水泳</span>
      <span class="text-xs text-[#595750]">チン メイキ</span>
    </div>
    <p>
      私の しゅみは 水泳です。毎週 プールで 泳いで います。<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 21 】</span>、半年前までは 泳ぐことが できませんでした。日本に 来る 前に 住んでいた 所には 海も プールも なかったのです。
    </p>
    <p>
      半年前、夏休みに 日本人の ともだちと 海に 行きました。ともだちは 遠くまで 泳いで いきました。けれども、私<span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 22 】</span> 泳げませんでした。ともだちが かっこよかったので、私も 泳いで みたいと 思いました。
    </p>
    <p>
      次の 週から 町の プールで 泳ぐ 練習を 始めました。水泳の 上手な ともだちに 泳ぎ方を <span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 23 】</span>。難しかったですが、毎週 ともだちと 練習しました。それで 少しずつ <span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 24 】</span>。今は 一人で 練習して います。
    </p>
    <p>
      泳ぐのは とても 楽しいです。次に 海に 行くまでに たくさん <span class="px-1.5 py-0.5 rounded bg-[#f8ede9] border border-[#d95b43] font-bold text-[#bf5b46]">【 25 】</span>。
    </p>
  </div>
</div>
`;

const N4_MONDAI_4_Q26_HTML = `
<div class="space-y-2 text-left">
  <p class="text-xs font-semibold text-[#a06658]">(1) このお知らせが日本語学校の教室にあります。</p>
  <div class="p-5 rounded-xl bg-[#fffdfa] border-2 border-[#494740] space-y-3 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="text-center font-bold text-base underline">忘れ物がありました</div>
    <p>忘れた人は、先生たちの部屋へ取りに来てください。</p>
    <div class="pl-4 space-y-1 font-semibold">
      <div>① 辞書（103教室にありました）</div>
      <div>② 帽子（食堂にありました）</div>
    </div>
    <div class="p-3 rounded-lg bg-[#f9f7f2] border border-[#25231f] text-xs sm:text-sm">
      <u>12月5日（月）から7日（水）までは</u>、試験中ですから、先生たちの部屋には入れません。教室でクラスの先生に言ってください。
    </div>
    <div class="text-right text-xs text-[#595750]">2016年12月1日（木）　大西日本語学校</div>
  </div>
</div>
`;

const N4_MONDAI_4_Q27_HTML = `
<div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose">
  (2) アイスクリームは、夏に食べるととてもおいしいですが、私は寒い冬でも時々食べます。夏は毎日食べるので安いものしか買いませんが、冬は高いものを買います。暖かい部屋でいいアイスクリームを食べるのが、<u>私の楽しみ</u>なのです。
</div>
`;

const N4_MONDAI_4_Q28_HTML = `
<div class="space-y-2 text-left">
  <p class="text-xs font-semibold text-[#a06658]">(3) （日本語学校で）高田先生の机の上に、このメモがあります。</p>
  <div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-2 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="font-bold">高田先生</div>
    <p>
      みそ工場の林さんから電話がありました。<br/>
      1月に工場見学ができるのは、19日（木）10時、11時と 26日（木）14時、15時だそうです。<br/>
      見学の日と時間が決まったら、電話がほしいと言っていました。行く人の数も教えてもらいたいそうです。
    </p>
    <div class="text-right text-xs text-[#595750]">12月1日 10:20　ヒマル</div>
  </div>
</div>
`;

const N4_MONDAI_4_Q29_HTML = `
<div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] text-left font-['Noto_Serif_JP',serif] text-sm leading-loose">
  (4) 昨日初めて黒い消しゴムを買いました。レジの人が「白いのは、使うと消しゴムが黒く汚れて嫌だと言う人が多いから、黒いのを作ったそうですよ。」と教えてくれました。私は色がかっこいいから買ったので、理由を聞いて面白いなと思いました。
</div>
`;

const N4_MONDAI_5_PASSAGE_HTML = `
<div class="space-y-3 text-left">
  <p class="text-xs font-semibold text-[#a06658]">これはケイティさんが書いた作文です。</p>
  <div class="p-5 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-3 font-['Noto_Serif_JP',serif] text-sm leading-loose">
    <div class="flex items-center justify-between border-b border-[#ece7de] pb-2">
      <span class="font-bold text-base">東京駅で会った人</span>
      <span class="text-xs text-[#595750]">ケイティ ワン</span>
    </div>
    <p>
      先週、私は友達の家に遊びに行きました。行くときに、東京駅で電車を乗り換えなければならなかったのですが、東京駅は広すぎて、乗り換える電車の場所がわかりませんでした。それで、メモを持って駅の中を行ったり来たりしていました。
    </p>
    <p>
      <u>①「どうしよう。」</u>と思って困っていたとき、山田さんという女の人が声をかけてくれました。山田さんは駅の中にある喫茶店でお茶を飲みながら、私が行ったり来たりしているのを見ていたそうです。「どうしたんですか。」と聞かれたので、「電車の場所がわからないんです。」と答えました。山田さんは私が乗る電車のところまで一緒に行ってくれました。
    </p>
    <p>
      山田さんは仕事で東京に来ていて、今から京都に帰ると言いました。私は「時間は大丈夫ですか。」と聞きました。山田さんは「京都に行く新幹線はたくさんあるから、次のでも大丈夫です。私も、外国に住んでいたとき、いろいろな人に親切にしてもらいましたから。」と言いました。私は「本当にありがとうございます。」と<u>②お礼を言いました</u>。
    </p>
    <p>
      電車に乗って、一人になった私は、山田さんの言葉を思い出して、心が温かくなりました。そして、私も山田さんみたいに（　<strong>33</strong>　）と思いました。
    </p>
  </div>
</div>
`;

const N4_MONDAI_6_NOTICE_HTML = `
<div class="space-y-3 text-left">
  <div class="p-4 rounded-xl bg-[#fffdfa] border border-[#dcd7cc] space-y-2 font-['Noto_Serif_JP',serif]">
    <div class="flex items-center justify-between border-b border-[#ece7de] pb-2">
      <div>
        <span class="text-xs font-bold text-[#263d36] block">青野市ニュース</span>
        <h4 class="text-base font-extrabold text-[#25231f]">「春を楽しもう」</h4>
      </div>
      <span class="text-lg">🌷🌷🌷</span>
    </div>
    <p class="text-xs text-[#595750]">
      青野市では、毎月、食事会や音楽会などを開いています。（3月と4月の予定）
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="bg-[#263d36] text-white">
            <th class="p-2 text-left border border-white/15">名前（料金）</th>
            <th class="p-2 text-center border border-white/15">月・日</th>
            <th class="p-2 text-center border border-white/15">場所・時間</th>
            <th class="p-2 text-center">集まる時間</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#ece7de]">
          <tr>
            <td class="p-2.5 border border-[#ece7de]">
              <strong>① 食事会（500円）</strong><br/>
              青野市の有名な料理を一緒に作って、食べます。
            </td>
            <td class="p-2 text-center border border-[#ece7de]">3/5（日）</td>
            <td class="p-2 text-center border border-[#ece7de]">花村小学校<br/>11時〜14時</td>
            <td class="p-2 text-center border border-[#ece7de]">11時</td>
          </tr>
          <tr class="bg-[#f9f7f2]">
            <td class="p-2.5 border border-[#ece7de]">
              <strong>② 音楽会（800円）</strong><br/>
              お茶とお菓子を楽しみながら、音楽を聞きます。
            </td>
            <td class="p-2 text-center border border-[#ece7de] font-bold">3/11（土）</td>
            <td class="p-2 text-center border border-[#ece7de]">さくら寺<br/>14時〜16時</td>
            <td class="p-2 text-center border border-[#ece7de] font-bold">13時50分</td>
          </tr>
          <tr>
            <td class="p-2.5 border border-[#ece7de]">
              <strong>③ 音楽会（950円）</strong><br/>
              ピアノやバイオリンのコンサートです。
            </td>
            <td class="p-2 text-center border border-[#ece7de] font-bold">4/8（土）</td>
            <td class="p-2 text-center border border-[#ece7de]">市民体育館<br/>17時〜19時</td>
            <td class="p-2 text-center border border-[#ece7de] font-bold">16時50分</td>
          </tr>
          <tr class="bg-[#f9f7f2]">
            <td class="p-2.5 border border-[#ece7de]">
              <strong>④ バス旅行（800円）</strong><br/>
              バスで東川海岸に行って、海を見ながらお弁当を食べます。
            </td>
            <td class="p-2 text-center border border-[#ece7de]">4/15（土）</td>
            <td class="p-2 text-center border border-[#ece7de]">東川海岸<br/>8時〜14時</td>
            <td class="p-2 text-center border border-[#ece7de]">市民体育館に<br/>8時</td>
          </tr>
          <tr>
            <td class="p-2.5 border border-[#ece7de]">
              <strong>⑤ お祭り（お金はかかりません）</strong><br/>
              毎年行われているお祭りです。歌や踊りを楽しみましょう。
            </td>
            <td class="p-2 text-center border border-[#ece7de]">4/23（日）</td>
            <td class="p-2 text-center border border-[#ece7de]">東公園<br/>17時〜21時</td>
            <td class="p-2 text-center border border-[#ece7de]">17時より後の<br/>好きなとき</td>
          </tr>
          <tr class="bg-[#fff9f5]">
            <td class="p-2.5 border border-[#ece7de]">
              <strong>⑥ 音楽会（1,200円）</strong><br/>
              レストランで食事をしながら、ピアノを楽しみましょう。
            </td>
            <td class="p-2 text-center border border-[#ece7de] font-bold">4/29（土）</td>
            <td class="p-2 text-center border border-[#ece7de] font-bold">レストラン「黒川」<br/>12時〜14時</td>
            <td class="p-2 text-center border border-[#ece7de]">11時50分</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
`;

const RAW_2018_N4_GRAMMAR_READING: Raw2018N4GrammarReadingItem[] = [
  // もんだい 1 (1 - 15)
  {
    num: 1,
    mondai: 1,
    prompt: "きのうの しゅくだいは 少なかったので、（　★　）終わりました。",
    options: ["20分", "20分しか", "20分で", "20分を"],
    correctIndex: 2,
    targetWord: "20分で",
    reading: "にじゅっぷんで",
    meaningEn: "finished in 20 minutes",
    translationId: "Karena PR kemarin sedikit, selesai dalam waktu 20 menit.",
    notes: "Partikel で setelah durasi waktu menunjukkan batas/rentang waktu yang dibutuhkan untuk menyelesaikan suatu aksi (20分で終わりました)."
  },
  {
    num: 2,
    mondai: 1,
    prompt: "この ロボットは 人（　★　）会話することが できます。",
    options: ["や", "を", "へ", "と"],
    correctIndex: 3,
    targetWord: "と（人と会話する）",
    reading: "と",
    meaningEn: "converse with people",
    translationId: "Robot ini dapat bercakap-cakap dengan manusia.",
    notes: "Kata kerja yang melibatkan lawan bicara/interaksi timbal balik (会話する・話す・相談する) menggunakan partikel と."
  },
  {
    num: 3,
    mondai: 1,
    prompt: "弟は 小さいとき よく けがを して、両親（　★　）心配させました。",
    options: ["で", "を", "の", "や"],
    correctIndex: 1,
    targetWord: "を（両親を心配させる）",
    reading: "を",
    meaningEn: "made his parents worry (causative of emotion)",
    translationId: "Adik laki-laki saya saat kecil sering terluka dan membuat orang tua khawatir.",
    notes: "Pada bentuk kausatif (使役形) yang menyatakan emosi (心配させる・喜ばせる・悲しませる), orang yang mengalami emosi ditandai dengan partikel を."
  },
  {
    num: 4,
    mondai: 1,
    prompt: "ホテルの 朝ご飯の パンが とても おいしかったので、八つ（　★　）食べました。",
    options: ["も", "に", "が", "で"],
    correctIndex: 0,
    targetWord: "も（八つも）",
    reading: "も",
    meaningEn: "as many as eight!",
    translationId: "Karena roti sarapan hotel sangat enak, saya makan sampai 8 buah!",
    notes: "[Jumlah] + も menekankan bahwa jumlah tersebut terasa banyak/melebihi ekspektasi pembicara."
  },
  {
    num: 5,
    mondai: 1,
    prompt: "この 日本語の じしょは、150年前に 外国人（　★　）作られました。",
    options: ["から", "を", "について", "によって"],
    correctIndex: 3,
    targetWord: "によって",
    reading: "によって",
    meaningEn: "was created by a foreigner (passive creator marker)",
    translationId: "Kamus bahasa Jepang ini dibuat oleh orang asing 150 tahun yang lalu.",
    notes: "Dalam kalimat pasif yang menyatakan penciptaan karya/penemuan/buku, pelaku ditandai dengan ～によって."
  },
  {
    num: 6,
    mondai: 1,
    prompt: "A市の 運動場は（　★　）使えますが、予約が ひつようです。",
    options: ["だれでも", "だれを", "だれに", "だれが"],
    correctIndex: 0,
    targetWord: "だれでも",
    reading: "だれでも",
    meaningEn: "anyone can use it",
    translationId: "Lapangan olahraga Kota A siapa saja boleh menggunakannya, tetapi diperlukan reservasi.",
    notes: "Kata tanya + でも dalam kalimat positif berarti mencakup semuanya: だれでも = siapa saja."
  },
  {
    num: 7,
    mondai: 1,
    prompt: "前田「リーさん、いつも（　★　）国の かぞくに れんらくしますか。」<br/>リー「メールを 書くことが 多いです。」",
    options: ["どのぐらい", "どの", "どうやって", "どういう"],
    correctIndex: 2,
    targetWord: "どうやって",
    reading: "どうやって",
    meaningEn: "how; by what means",
    translationId: "Maeda: 'Lee-san, biasanya bagaimana caranya menghubungi keluarga di negara asal?' Lee: 'Seringnya menulis email.'",
    notes: "Jawaban Lee menyebutkan cara/metode (メールを書く), sehingga kata tanya yang tepat adalah どうやって (bagaimana caranya)."
  },
  {
    num: 8,
    mondai: 1,
    prompt: "娘は 先月 高校を 卒業しました。（　★　）大学の 入学式です。",
    options: ["だんだん", "あまり", "だいたい", "もうすぐ"],
    correctIndex: 3,
    targetWord: "もうすぐ",
    reading: "もうすぐ",
    meaningEn: "very soon; before long",
    translationId: "Putri saya lulus SMA bulan lalu. Sebentar lagi upacara masuk universitas.",
    notes: "もうすぐ menyatakan bahwa suatu peristiwa akan segera tiba dalam waktu dekat."
  },
  {
    num: 9,
    mondai: 1,
    prompt: "今朝は 駅に 行く バスが（　★　）来なかったので、タクシーで 行きました。",
    options: ["やっと", "なかなか", "きっと", "いつか"],
    correctIndex: 1,
    targetWord: "なかなか（～ない）",
    reading: "なかなか",
    meaningEn: "did not come easily / for a long time",
    translationId: "Tadi pagi karena bus menuju stasiun tak kunjung datang, saya pergi naik taksi.",
    notes: "なかなか + bentuk negatif (来なかった) berarti 'tak kunjung / sulit terjadi meski sudah ditunggu'."
  },
  {
    num: 10,
    mondai: 1,
    prompt: "山下「南さん、あしたか あさって、カラオケに 行かない？」<br/>南「あ、いいね。あしたは 都合が 悪いけど、あさって（　★　）だいじょうぶだよ。」",
    options: ["なのに", "だから", "でも", "なら"],
    correctIndex: 3,
    targetWord: "なら（あさってなら）",
    reading: "なら",
    meaningEn: "if it's the day after tomorrow",
    translationId: "Minami: 'Wah, bagus tuh. Besok jadwal saya tidak bisa, tapi kalau lusa tidak masalah.'",
    notes: "N + なら mengangkat salah satu opsi yang diajukan lawan bicara ('kalau lusa...')."
  },
  {
    num: 11,
    mondai: 1,
    prompt: "私は（　★　）間、スーパーで アルバイトを して いました。",
    options: ["夏休みに", "夏休みで", "夏休みの", "夏休み"],
    correctIndex: 2,
    targetWord: "夏休みの（間）",
    reading: "なつやすみのあいだ",
    meaningEn: "during the summer vacation",
    translationId: "Selama liburan musim panas, saya bekerja paruh waktu di supermarket.",
    notes: "Kata benda (夏休み) disambungkan dengan 間（あいだ）menggunakan partikel の → 夏休みの間."
  },
  {
    num: 12,
    mondai: 1,
    prompt: "先週 庭の 木の えだを 切りました。ぜんぶ（　★　）2時間 かかりました。",
    options: ["切ったり", "切るのに", "切りに", "切るか どうか"],
    correctIndex: 1,
    targetWord: "切るのに",
    reading: "きるのに",
    meaningEn: "it took 2 hours to cut them all",
    translationId: "Minggu lalu saya memotong dahan pohon di halaman. Butuh 2 jam untuk memotong semuanya.",
    notes: "V-kamus + のに（かかる・ひつようだ）menyatakan waktu/biaya yang diperlukan untuk melakukan aksi tersebut."
  },
  {
    num: 13,
    mondai: 1,
    prompt: "木村「山田さん、あしたの 午後、サッカーの 練習に 行きますか。」<br/>山田「ええ、行きます。でも、午前中に 用事が あるので、（　★　）。」",
    options: [
      "遅れないで ください",
      "遅れないほうが いいです",
      "遅れるかもしれません",
      "遅れては いけません"
    ],
    correctIndex: 2,
    targetWord: "遅れるかもしれません",
    reading: "おくれるかもしれません",
    meaningEn: "I might be late",
    translationId: "Yamada: 'Ya, saya pergi. Tapi karena pagi harinya ada urusan, saya mungkin akan terlambat.'",
    notes: "～かもしれません menyatakan kemungkinan ('mungkin akan terlambat')."
  },
  {
    num: 14,
    mondai: 1,
    prompt: "（食堂で）<br/>森「空いて いる 席が ありませんね。」<br/>田中「ええ。あ、でも、あそこの 席が（　★　）よ。」<br/>森「本当ですね。空くまで、少し 待ちましょう。」",
    options: ["空きそうです", "空きました", "空いて います", "空いたようです"],
    correctIndex: 0,
    targetWord: "空きそうです",
    reading: "あきそうです",
    meaningEn: "looks like it is about to become vacant",
    translationId: "Tanaka: 'Ya. Eh, tapi kursi di sebelah sana kelihatannya sebentar lagi kosong lho.'",
    notes: "Kalimat berikutnya berkata 「空くまで、少し待ちましょう」(mari tunggu sebentar sampai kosong), artinya kursi itu belum kosong tapi hampir kosong → V-masu + そうです (空きそうです)."
  },
  {
    num: 15,
    mondai: 1,
    prompt: "（会議室で）<br/>林「上田さん、会議の じゅんびは 終わりましたか。てつだいましょうか。」<br/>上田「ありがとうございます。じゃあ、いすが 一つ 足りないので、となりの 会議室から（　★　）。」<br/>林「はい、わかりました。」",
    options: [
      "持って こなくても いいですか",
      "持って きて もらえますか",
      "持って こないと いけませんか",
      "持って きて いませんか"
    ],
    correctIndex: 1,
    targetWord: "持って きて もらえますか",
    reading: "もってきてもらえますか",
    meaningEn: "could you bring one for me?",
    translationId: "Ueda: 'Terima kasih. Kalau begitu, karena kursinya kurang satu, bisakah tolong bawakan dari ruang rapat sebelah?'",
    notes: "Meminta bantuan dengan sopan menggunakan pola V-て＋もらえますか."
  },

  // もんだい 2 ★ 並べ替え (16 - 20)
  {
    num: 16,
    mondai: 2,
    isStarQuestion: true,
    prompt: "先月まで 花屋が あった ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿、おいしいです。",
    options: ["できた", "りんごの ケーキが", "きっさてんは", "場所に"],
    correctIndex: 2,
    targetWord: "きっさてんは（場所に → できた → ★きっさてんは → りんごのケーキが）",
    reading: "きっさてんは",
    meaningEn: "The cafe that opened at the place where a flower shop used to be...",
    translationId: "Kafe yang baru buka di tempat yang sampai bulan lalu adalah toko bunga itu, kue apelnya enak.",
    notes: "Susunan lengkap: 先月まで花屋があった 【4.場所に】【1.できた】【★3.きっさてんは】【2.りんごのケーキが】、おいしいです。 Kata pada ★ adalah 3. きっさてんは."
  },
  {
    num: 17,
    mondai: 2,
    isStarQuestion: true,
    prompt: "きのうの 夜 家に 帰ってから、かぎを ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ 覚えて いません。",
    options: ["どこ", "置いた", "に", "か"],
    correctIndex: 1,
    targetWord: "置いた（どこ → に → ★置いた → か）",
    reading: "おいた",
    meaningEn: "I don't remember where I put the key",
    translationId: "Sejak pulang ke rumah tadi malam, saya tidak ingat di mana saya meletakkan kunci.",
    notes: "Susunan lengkap: かぎを【1.どこ】【3.に】【★2.置いた】【4.か】覚えていません (klausa tanya tidak langsung どこに置いたか). Kata pada ★ adalah 2. 置いた."
  },
  {
    num: 18,
    mondai: 2,
    isStarQuestion: true,
    prompt: "私は ピアノを ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ 時間が ありません。",
    options: ["ひくのが", "ひく", "最近 いそがしくて", "好きですが"],
    correctIndex: 2,
    targetWord: "最近 いそがしくて（ひくのが → 好きですが → ★最近いそがしくて → ひく）",
    reading: "さいきんいそがしくて",
    meaningEn: "I like playing the piano, but recently I've been busy and have no time to play",
    translationId: "Saya suka bermain piano, tetapi akhir-akhir ini sibuk sehingga tidak punya waktu untuk bermain.",
    notes: "Susunan lengkap: ピアノを【1.ひくのが】【4.好きですが】【★3.最近 いそがしくて】【2.ひく】時間がありません。 Kata pada ★ adalah 3. 最近 いそがしくて."
  },
  {
    num: 19,
    mondai: 2,
    isStarQuestion: true,
    prompt: "私は 20さいの たんじょうびに そふが ＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ います。",
    options: ["大切に", "くれた", "使って", "カメラを"],
    correctIndex: 0,
    targetWord: "大切に（くれた → カメラを → ★大切に → 使って）",
    reading: "たいせつに",
    meaningEn: "taking good care of the camera my grandfather gave me",
    translationId: "Saya menggunakan dengan baik kamera yang diberikan kakek pada ulang tahun saya yang ke-20.",
    notes: "Susunan lengkap: そふが【2.くれた】【4.カメラを】【★1.大切に】【3.使って】います。 Kata pada ★ adalah 1. 大切に."
  },
  {
    num: 20,
    mondai: 2,
    isStarQuestion: true,
    prompt: "林「来週、野球の 試合を 見に 行こうと 思って いるんですが、リーさんも いっしょに どうですか。」<br/>リー「えっ、野球の 試合ですか。いいですね。＿＿＿ ＿＿＿ <u>　★　</u> ＿＿＿ です。」",
    options: ["ぜひ 行きたい", "ことがない", "見に行った", "ので"],
    correctIndex: 3,
    targetWord: "ので（見に行った → ことがない → ★ので → ぜひ行きたい）",
    reading: "ので",
    meaningEn: "because I have never been to see one, I'd love to go",
    translationId: "Karena saya belum pernah pergi menontonnya, saya sangat ingin pergi.",
    notes: "Susunan lengkap: 【3.見に行った】【2.ことがない】【★4.ので】【1.ぜひ 行きたい】です。 Kata pada ★ adalah 4. ので."
  },

  // もんだい 3 文章の文法 (21 - 25)
  {
    num: 21,
    mondai: 3,
    passageTitle: "留学生の作文：チン メイキ「水泳」",
    passageHtml: N4_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 21 】 に 入れるのに いちばん いい ものは どれですか。",
    options: ["しかし", "だから", "たとえば", "それに"],
    correctIndex: 0,
    targetWord: "しかし",
    reading: "しかし",
    meaningEn: "however; but",
    translationId: "Setiap minggu saya berenang di kolam renang. Akan tetapi (しかし), sampai setengah tahun yang lalu saya tidak bisa berenang.",
    notes: "Kalimat sebelum 【21】 menyatakan hobi berenang setiap minggu, sedangkan kalimat sesudahnya menyatakan dulu tidak bisa berenang → kontras (しかし)."
  },
  {
    num: 22,
    mondai: 3,
    passageTitle: "留学生の作文：チン メイキ「水泳」",
    passageHtml: N4_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 22 】 に 入れるのに いちばん いい ものは どれですか。",
    options: ["なら", "は", "より", "でも"],
    correctIndex: 1,
    targetWord: "は（私は）",
    reading: "は",
    meaningEn: "contrastive topic marker (as for me)",
    translationId: "Teman saya berenang sampai jauh. Akan tetapi, saya (私は) tidak bisa berenang.",
    notes: "Membandingkan ともだちは (bisa berenang jauh) dengan 私は (tidak bisa berenang) menggunakan partikel kontras は."
  },
  {
    num: 23,
    mondai: 3,
    passageTitle: "留学生の作文：チン メイキ「水泳」",
    passageHtml: N4_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 23 】 に 入れるのに いちばん いい ものは どれですか。",
    options: [
      "教えて いました",
      "教えて くれました",
      "教えて あげました",
      "教えて もらいました"
    ],
    correctIndex: 3,
    targetWord: "教えて もらいました",
    reading: "おしえてもらいました",
    meaningEn: "was taught by my friend (received the favor of being taught)",
    translationId: "Saya diajari cara berenang oleh teman yang pandai berenang (ともだちに 泳ぎ方を 教えてもらいました).",
    notes: "Subjek kalimat adalah penulis (私), dan terdapat ともだちに (oleh teman), sehingga menggunakan pola menerima bantuan: V-て＋もらいました."
  },
  {
    num: 24,
    mondai: 3,
    passageTitle: "留学生の作文：チン メイキ「水泳」",
    passageHtml: N4_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 24 】 に 入れるのに いちばん いい ものは どれですか。",
    options: [
      "泳いで おきました",
      "泳いで しまいました",
      "泳げる ことに なりました",
      "泳げる ように なりました"
    ],
    correctIndex: 3,
    targetWord: "泳げる ように なりました",
    reading: "およげるようになりました",
    meaningEn: "gradually became able to swim",
    translationId: "Karena itu, sedikit demi sedikit saya menjadi bisa berenang (泳げるようになりました).",
    notes: "Perubahan kemampuan dari tidak bisa menjadi bisa dinyatakan dengan V-potensial + ようになる (泳げるようになりました)."
  },
  {
    num: 25,
    mondai: 3,
    passageTitle: "留学生の作文：チン メイキ「水泳」",
    passageHtml: N4_MONDAI_3_PASSAGE_HTML,
    prompt: "文章の 【 25 】 に 入れるのに いちばん いい ものは どれですか。",
    options: [
      "練習したいです",
      "練習するためです",
      "練習したようです",
      "練習するそうです"
    ],
    correctIndex: 0,
    targetWord: "練習したいです",
    reading: "れんしゅうしたいです",
    meaningEn: "I want to practice a lot before going to the sea next time",
    translationId: "Sampai pergi ke laut berikutnya, saya ingin banyak berlatih.",
    notes: "Menyatakan keinginan pribadi penulis untuk masa depan: たくさん練習したいです."
  },

  // もんだい 4 短文読解 (26 - 29)
  {
    num: 26,
    mondai: 4,
    passageTitle: "短文読解 (1)：大西日本語学校「忘れ物がありました」",
    passageHtml: N4_MONDAI_4_Q26_HTML,
    prompt: "<u>試験中の日間に</u>忘れ物を取りに行きたい人は、どうしなければなりませんか。",
    options: [
      "忘れ物があった場所へ取りに行きます。",
      "教室で、自分のクラスの先生に話します。",
      "試験が終わるまで待ちます。",
      "先生たちの部屋へ取りに行きます。"
    ],
    correctIndex: 1,
    targetWord: "教室で、自分のクラスの先生に話します",
    reading: "きょうしつでじぶんのくらすのせんせいにはなします",
    meaningEn: "Speak to your class teacher in the classroom during the exam period",
    translationId: "Di dalam ruang kelas, berbicara kepada guru kelas masing-masing.",
    notes: "Kotak bawah pengumuman menyatakan: 「12月5日(月)から7日(水)までは、試験中ですから、先生たちの部屋には入れません。教室でクラスの先生に言ってください。」(opsi 2)."
  },
  {
    num: 27,
    mondai: 4,
    passageTitle: "短文読解 (2)：冬のアイスクリーム",
    passageHtml: N4_MONDAI_4_Q27_HTML,
    prompt: "<u>私の楽しみ</u>は何ですか。",
    options: [
      "夏にアイスクリームを食べること",
      "夏に毎日アイスクリームを食べること",
      "冬に暖かい部屋で毎日アイスクリームを食べること",
      "冬に暖かい部屋で高いアイスクリームを食べること"
    ],
    correctIndex: 3,
    targetWord: "冬に暖かい部屋で高いアイスクリームを食べること",
    reading: "たかいあいすくりーむをたべること",
    meaningEn: "Eating expensive/high-quality ice cream in a warm room in winter",
    translationId: "Memakan es krim mahal/berkualitas di ruangan yang hangat pada musim dingin.",
    notes: "Teks menyebutkan: 「冬は高いものを買います。暖かい部屋でいいアイスクリームを食べるのが、私の楽しみなのです。」 Di musim dingin penulis hanya makan kadang-kadang (時々), bukan 毎日, jadi opsi 4 yang tepat!"
  },
  {
    num: 28,
    mondai: 4,
    passageTitle: "短文読解 (3)：高田先生へのメモ（みそ工場見学）",
    passageHtml: N4_MONDAI_4_Q28_HTML,
    prompt: "このメモを読んで、高田先生は林さんに何を知らせなければなりませんか。",
    options: [
      "工場見学に行く日と時間が、いつごろ決まるか",
      "工場見学に行く日と時間と、行く人の数",
      "工場見学に行く日と時間だけ",
      "工場見学に行く人の数だけ"
    ],
    correctIndex: 1,
    targetWord: "工場見学に行く日と時間と、行く人の数",
    reading: "ひ・じかん・いくひとのかず",
    meaningEn: "The date and time of the factory tour, as well as the number of participants",
    translationId: "Hari dan jam kunjungan pabrik, serta jumlah orang yang akan pergi.",
    notes: "Kalimat terakhir memo: 「見学の日と時間が決まったら、電話がほしいと言っていました。行く人の数も教えてもらいたいそうです。」(opsi 2)."
  },
  {
    num: 29,
    mondai: 4,
    passageTitle: "短文読解 (4)：黒い消しゴム",
    passageHtml: N4_MONDAI_4_Q29_HTML,
    prompt: "「私」はどうして黒い消しゴムを買いましたか。",
    options: [
      "黒い消しゴムは、色がかっこいいと思ったから",
      "黒い消しゴムは、使った後で消しゴムが黒く汚れないから",
      "黒い消しゴムのほうが字をきれいに消せるから",
      "黒い消しゴムを買う人が多いと店の人に聞いたから"
    ],
    correctIndex: 0,
    targetWord: "色がかっこいいと思ったから",
    reading: "いろがかっこいいとおもったから",
    meaningEn: "Because the writer thought the black color looked cool",
    translationId: "Karena menurut penulis warna penghapus hitam itu keren.",
    notes: "Kalimat terakhir: 「私は色がかっこいいから買ったので、理由を聞いて面白いなと思いました。」 Alasan tidak terlihat kotor adalah alasan produsen yang baru diberitahu kasir setelah penulis membelinya."
  },

  // もんだい 5 中文読解 (30 - 33)
  {
    num: 30,
    mondai: 5,
    passageTitle: "中文読解：ケイティ ワン「東京駅で会った人」",
    passageHtml: N4_MONDAI_5_PASSAGE_HTML,
    prompt: "なぜ <u>①「どうしよう。」</u> と思いましたか。",
    options: [
      "知らない女の人に声をかけられたから",
      "間違えて東京駅で電車を降りてしまったから",
      "友達が見つからないから",
      "乗りたい電車の場所がわからないから"
    ],
    correctIndex: 3,
    targetWord: "乗りたい電車の場所がわからないから",
    reading: "のりたいでんしゃのばしょがわからないから",
    meaningEn: "Because Katy didn't know where the train she needed to transfer to was",
    translationId: "Karena tidak tahu lokasi kereta yang ingin dinaiki (untuk transit di Stasiun Tokyo).",
    notes: "Paragraf 1: 「東京駅は広すぎて、乗り換える電車の場所がわかりませんでした。」(opsi 4)."
  },
  {
    num: 31,
    mondai: 5,
    passageTitle: "中文読解：ケイティ ワン「東京駅で会った人」",
    passageHtml: N4_MONDAI_5_PASSAGE_HTML,
    prompt: "なぜ山田さんは「私」に声をかけましたか。",
    options: [
      "「私」が落としたメモを拾ったから",
      "「私」が行ったり来たりしているのを見たから",
      "「私」を山田さんの友達と間違えたから",
      "「私」と一緒にお茶を飲みたいと思ったから"
    ],
    correctIndex: 1,
    targetWord: "「私」が行ったり来たりしているのを見たから",
    reading: "いったりきたりしているのをみたから",
    meaningEn: "Because Yamada-san saw Katy walking back and forth looking lost",
    translationId: "Karena Yamada-san melihat penulis berjalan mondar-mandir (kebingungan).",
    notes: "Paragraf 2: 「山田さんは駅の中にある喫茶店でお茶を飲みながら、私が行ったり来たりしているのを見ていたそうです。」(opsi 2)."
  },
  {
    num: 32,
    mondai: 5,
    passageTitle: "中文読解：ケイティ ワン「東京駅で会った人」",
    passageHtml: N4_MONDAI_5_PASSAGE_HTML,
    prompt: "なぜ <u>②お礼を言いました</u> か。",
    options: [
      "山田さんが、京都に行く新幹線がたくさんあると「私」に教えてくれたから",
      "山田さんが、帰りが遅くなるかもしれないのに、「私」を案内してくれたから",
      "山田さんが、「私」の国のいろいろな人に親切にしてくれたと聞いたから",
      "山田さんが、「私」が乗る予定の電車の時間のことを心配してくれたから"
    ],
    correctIndex: 1,
    targetWord: "帰りが遅くなるかもしれないのに、「私」を案内してくれたから",
    reading: "あんないしてくれたから",
    meaningEn: "Because Yamada-san guided Katy to her train even though it might delay Yamada-san's return to Kyoto",
    translationId: "Karena Yamada-san telah mengantarkan penulis meskipun kepulangannya ke Kyoto mungkin menjadi terlambat.",
    notes: "Paragraf 2–3: Yamada-san hendak pulang ke Kyoto dengan Shinkansen, tetapi rela mengantar penulis sampai ke peron keretanya dan berkata kereta berikutnya pun tidak apa-apa (opsi 2)."
  },
  {
    num: 33,
    mondai: 5,
    passageTitle: "中文読解：ケイティ ワン「東京駅で会った人」",
    passageHtml: N4_MONDAI_5_PASSAGE_HTML,
    prompt: "文章の最後の（　33　）に入れるのに、いちばんいい文はどれですか。",
    options: [
      "困っている人に親切にしよう",
      "外国に住んでみたい",
      "仕事を頑張ろう",
      "東京駅のことをよく知りたい"
    ],
    correctIndex: 0,
    targetWord: "困っている人に親切にしよう",
    reading: "こまっているひとにしんせつにしよう",
    meaningEn: "Let's be kind to people in trouble, just like Yamada-san",
    translationId: "Saya ingin bersikap baik/menolong orang yang sedang kesulitan seperti Yamada-san.",
    notes: "Tersentuh oleh kebaikan Yamada-san yang membalas kebaikan orang-orang saat tinggal di luar negeri, penulis bertekad: 「私も山田さんみたいに（困っている人に親切にしよう）と思いました。」(opsi 1)."
  },

  // もんだい 6 情報検索 (34 - 35)
  {
    num: 34,
    mondai: 6,
    passageTitle: "情報検索：青野市ニュース「春を楽しもう」予定表",
    passageHtml: N4_MONDAI_6_NOTICE_HTML,
    prompt: "ハメスさんとマリアさんは、「春を楽しもう」に行きたいと思っています。<strong>4月に行われるもの</strong>で、<strong>お店の中で音楽を聞きながら、お昼に食事ができるもの</strong>がいいです。ハメスさんたちが選べるのは、どれですか。",
    options: ["②", "③", "⑤", "⑥"],
    correctIndex: 3,
    targetWord: "⑥（4/29 レストラン「黒川」12時〜14時・音楽会）",
    reading: "ろくばん",
    meaningEn: "Event 6 (April 29, 12:00-14:00 at Restaurant Kurokawa, piano concert with lunch)",
    translationId: "Acara ⑥: diadakan bulan April (4/29), di dalam restoran 'Kurokawa' pada jam makan siang (12:00–14:00) sambil mendengarkan piano.",
    notes: "Syarat: (1) Bulan April → eliminasi ① dan ② (bulan Maret). (2) Di dalam toko/restoran sambil mendengar musik & makan siang → ⑥ (レストランで食事をしながら、ピアノを楽しみましょう, 12時〜14時). Maka jawabannya 4 (⑥)!"
  },
  {
    num: 35,
    mondai: 6,
    passageTitle: "情報検索：青野市ニュース「春を楽しもう」予定表",
    passageHtml: N4_MONDAI_6_NOTICE_HTML,
    prompt: "ジーナさんは、「春を楽しもう」に行こうと思っています。<strong>土曜日</strong>に行きたいですが、<strong>集まる時間が13時より早いものには行けません</strong>。料金は<strong>1,000円以下</strong>がいいです。ジーナさんが選べるのは、どれですか。",
    options: ["2 と 3", "2 と 3 と 4", "2 と 3 と 5", "3 と 5"],
    correctIndex: 0,
    targetWord: "2 と 3（② 3/11(土) 13:50・800円 ＆ ③ 4/8(土) 16:50・950円）",
    reading: "にとさん",
    meaningEn: "Events 2 and 3",
    translationId: "Acara ② dan ③ (keduanya hari Sabtu, waktu kumpul setelah jam 13:00 yaitu 13:50 & 16:50, serta biaya ≤ 1.000 yen yaitu 800 yen & 950 yen).",
    notes: "Cek syarat Gina: (1) Hari Sabtu (土) → ②, ③, ④, ⑥. (2) Waktu kumpul setelah 13:00 → eliminasi ④ (8時) dan ⑥ (11時50分). (3) Biaya ≤ 1.000円 → ② (800円) dan ③ (950円). Maka jawabannya 1 (2と3)!"
  }
];

interface Raw2018N4ListeningItem {
  num: number;
  mondai: 1 | 2 | 3 | 4;
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

const N4_LISTENING_MONDAI_LABELS: Record<1 | 2 | 3 | 4, { ja: string; id: string }> = {
  1: {
    ja: "聴解 もんだい 1：まず しつもんを 聞いて ください。それから 話を 聞いて、1から 4の 中から、いちばん いい ものを 一つ えらんで ください。",
    id: "Choukai Mondai 1 — Pemahaman Tugas N4 (8 Soal)"
  },
  2: {
    ja: "聴解 もんだい 2：まず しつもんを 聞いて ください。その あと、もんだいようしを 見て ください。話を 聞いて、1から 4の 中から、いちばん いい ものを 一つ えらんで ください。",
    id: "Choukai Mondai 2 — Pemahaman Poin Kunci N4 (7 Soal)"
  },
  3: {
    ja: "聴解 もんだい 3：えを 見ながら しつもんを 聞いて ください。（やじるし ➡）の 人は 何と 言いますか。1から 3の 中から、いちばん いい ものを 一つ えらんで ください。",
    id: "Choukai Mondai 3 — Ungkapan Situasional N4 (5 Soal • 3 Pilihan)"
  },
  4: {
    ja: "聴解 もんだい 4：えなどが ありません。まず ぶんを 聞いて ください。それから、その へんじを 聞いて、1から 3の 中から、いちばん いい ものを 一つ えらんで ください。",
    id: "Choukai Mondai 4 — Respons Cepat N4 (8 Soal • 3 Pilihan)"
  }
};

const RAW_2018_N4_LISTENING: Raw2018N4ListeningItem[] = [
  // ================= もんだい 1 (1 - 8) =================
  {
    num: 1,
    mondai: 1,
    questionNumberInMondai: 1,
    prompt: "1ばん：本屋で店の人と女の人が話しています。店の人は何を使って絵本を包みますか。<br/><span class='text-xs text-[#77736b]'>（ア：船の絵の紙 ／ イ：花の絵の紙 ／ ウ：細いリボン ／ エ：太いリボン）</span>",
    options: ["1. ア・ウ（船の絵＋細いリボン）", "2. ア・エ（船の絵＋太いリボン）", "3. イ・ウ（花の絵＋細いリボン）", "4. イ・エ（花の絵＋太いリボン）"],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "男", text: "いらっしゃいませ。" },
      { speaker: "女", text: "この絵本をください。贈り物なので、きれいに包んでくれませんか。" },
      { speaker: "男", text: "はい、包む紙は二種類あります。こちらの船の絵と花の絵とどちらがいいでしょうか。" },
      { speaker: "女", text: "船の絵がいいです。リボンもつけてください。" },
      { speaker: "男", text: "はい。細いのと太いのがありますが、どちらにしますか。" },
      { speaker: "女", text: "そうですね。細いのにします。" },
      { speaker: "質問", text: "店の人は何を使って絵本を包みますか。" }
    ],
    targetWord: "ア・ウ（船の絵の紙 ＋ 細いリボン）",
    reading: "ふねのえ・ほそいりぼん",
    meaningEn: "Ship-patterned wrapping paper (ア) + thin ribbon (ウ)",
    translationId: "Kertas bungkus bergambar kapal (ア) dan pita tipis (ウ).",
    notes: "Wanita memilih: 「船の絵がいいです」(ア) dan 「細いのにします」(ウ) → Opsi 1 (アウ)."
  },
  {
    num: 2,
    mondai: 1,
    questionNumberInMondai: 2,
    prompt: "2ばん：先生の部屋で男の学生と先生が話しています。男の学生はいつまでに本を返さなければなりませんか。",
    options: [
      "1. ①（6月6日・火曜日）",
      "2. ②（6月16日・金曜日）",
      "3. ③（6月21日・水曜日）",
      "4. ④（6月22日・木曜日）"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "男", text: "先生、この本をかりてもいいですか。" },
      { speaker: "女", text: "いいですよ。" },
      { speaker: "男", text: "いつまでに返さなければなりませんか。" },
      { speaker: "女", text: "ええと、今日は七日ですね。再来週の金曜日、えっと、23日に授業で使いたいですから、授業の前の日までに返してください。" },
      { speaker: "男", text: "はい、木曜日ですね。" },
      { speaker: "女", text: "あ、すみません。その前の日までにお願いします。再来週の木曜日は学校に来ません。" },
      { speaker: "男", text: "はい、わかりました。" },
      { speaker: "質問", text: "男の学生はいつまでに本を返さなければなりませんか。" }
    ],
    targetWord: "③（21日・水曜日）",
    reading: "にじゅういちにち・すいようび",
    meaningEn: "Wednesday the 21st (Option 3)",
    translationId: "Rabu tanggal 21 Juni (karena kuliahnya Jumat tgl 23, Kamis tgl 22 dosen tidak datang, jadi sehari sebelumnya yaitu Rabu tgl 21).",
    notes: "23日（金）の前の日 ＝ 22日（木）→ 「その前の日までにお願いします」 ＝ 21日（水）(opsi 3)."
  },
  {
    num: 3,
    mondai: 1,
    questionNumberInMondai: 3,
    prompt: "3ばん：日本語学校で、先生が話しています。留学生は小学校に何を持って行かなければなりませんか。",
    options: [
      "1. 折り紙とスリッパ",
      "2. 写真とスリッパ",
      "3. 折り紙とお昼ご飯",
      "4. 写真とお昼ご飯"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "ええ、来週ミナミ小学校へ行って、折り紙を小学生たちに習いますね。皆さんは自分の国について写真を見せながら話しますね、写真を忘れないようにしてください。あっ、折り紙は小学校にあるものを使います。それから、小学校の建物に入る時には、靴をぬがなければなりませんから、スリッパを持っていってください。お昼ご飯は必要ありません、小学校が準備してくれます。" },
      { speaker: "質問", text: "留学生は小学校に何を持って行かなければなりませんか。" }
    ],
    targetWord: "写真とスリッパ",
    reading: "しゃしんとすりっぱ",
    meaningEn: "Photos and slippers (Option 2)",
    translationId: "Foto dan sandal selop (origami dan makan siang disediakan oleh pihak SD).",
    notes: "Yang harus dibawa: 写真 (foto negara asal) dan スリッパ (sandal dalam ruangan) → opsi 2."
  },
  {
    num: 4,
    mondai: 1,
    questionNumberInMondai: 4,
    prompt: "4ばん：日本語学校で、事務所の人と男の学生が話しています。男の学生は何を書きますか。<br/><span class='text-xs text-[#77736b]'>（ア：クラス ／ イ：名前 ／ ウ：じゅうしょ ／ エ：電話ばんごう）</span>",
    options: ["1. ア・イ・ウ・エ", "2. ア・イ・ウ", "3. イ・ウ・エ", "4. イ・ウ"],
    correctIndex: 3,
    dialogueScript: [
      { speaker: "女", text: "キムさん、こんにちは。どうしましたか。" },
      { speaker: "男", text: "あの、先週引っ越しをしたんですが……。" },
      { speaker: "女", text: "そうですか。じゃあ、この紙に名前と新しい住所と電話番号を書いてください。" },
      { speaker: "男", text: "はい。あのう、電話番号も書かなければなりませんか。変わったのは住所だけです。" },
      { speaker: "女", text: "じゃあ、電話番号はいいです。それから、クラスは来週新しいクラスに変わりますから、書かないでください。" },
      { speaker: "男", text: "はい。" },
      { speaker: "質問", text: "男の学生は何を書きますか。" }
    ],
    targetWord: "イ・ウ（名前と住所だけ）",
    reading: "なまえとじゅうしょ",
    meaningEn: "Name (イ) and Address (ウ) only (Option 4)",
    translationId: "Nama (イ) dan Alamat (ウ) saja (nomor telepon tidak berubah, kelas tidak perlu ditulis).",
    notes: "Nomor telepon (エ) tidak perlu ditulis karena tidak berubah, dan kelas (ア) diminta jangan ditulis → hanya イ (名前) dan ウ (じゅうしょ) = opsi 4."
  },
  {
    num: 5,
    mondai: 1,
    questionNumberInMondai: 5,
    prompt: "5ばん：会社で女の人と男の人が電話で話しています。女の人はどこから資料を持って行きますか。<br/><span class='text-xs text-[#77736b]'>（机の引き出し：上から 1・2・3・4 段目）</span>",
    options: [
      "1. 1（一番上の引き出し）",
      "2. 2（上から2番目／下から3番目の引き出し）",
      "3. 3（下から2番目の引き出し）",
      "4. 4（一番下の引き出し）"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "はい、鈴木です。" },
      { speaker: "男", text: "あ、もしもし。木村だけど、ごめん、急いで会議室まで資料を持って来てもらえる？僕の机の引き出しに入っているんだ。ええと、たぶん引き出しの下から二番目に入っていると思う。" },
      { speaker: "女", text: "はい、わかりました。下から二番目ですね。" },
      { speaker: "男", text: "あ、ごめん。そのもう一つ上だ。" },
      { speaker: "女", text: "はい、急いで持っていきます。" },
      { speaker: "質問", text: "女の人はどこから資料を持って行きますか。" }
    ],
    targetWord: "下から二番目のもう一つ上（＝2番）",
    reading: "もうひとつうえ",
    meaningEn: "One drawer above the second from the bottom",
    translationId: "Satu laci di atas laci kedua dari bawah.",
    notes: "Laci memiliki 4 tingkat (1, 2, 3, 4 dari atas). Kedua dari bawah adalah 3, lalu dikoreksi 「そのもう一つ上だ」(satu di atasnya) yaitu laci 2."
  },
  {
    num: 6,
    mondai: 1,
    questionNumberInMondai: 6,
    prompt: "6ばん：コンビニで、男の店員と女の店員が話しています。女の店員はこれから何をしなければなりませんか。",
    options: [
      "1. 店の前の掃除をする",
      "2. 店の中の床を掃除する",
      "3. ゴミ箱のゴミを店の裏に持っていく",
      "4. 窓の掃除をする"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "男", text: "田中さん、ご苦労さま。田中さんの仕事は3時までだから、そろそろ終わりだね。店のなかの掃除は終わった？" },
      { speaker: "女", text: "はい。" },
      { speaker: "男", text: "店の前は昼に掃除したから、まだきれいだね。じゃあ、最後にゴミ箱のゴミを店の裏に持っていって。" },
      { speaker: "女", text: "はい。あの、すみません。まだ窓の掃除が終わっていないです。" },
      { speaker: "男", text: "それは僕がやるからいいよ。じゃあ、いま頼んだことをやってから帰ってね。" },
      { speaker: "質問", text: "女の店員はこれから何をしなければなりませんか。" }
    ],
    targetWord: "ゴミ箱のゴミを店の裏に持っていく",
    reading: "ごみばこのごみをみせのうらにもっていく",
    meaningEn: "Take the trash from the trash bin to the back of the store (Option 3)",
    translationId: "Membawa sampah dari tempat sampah ke belakang toko (membersihkan jendela akan dikerjakan oleh staf pria).",
    notes: "Membersihkan jendela diambil alih oleh pria (それは僕がやるからいいよ), sehingga wanita hanya mengerjakan yang baru saja diminta: ゴミ箱のゴミを店の裏に持っていく (opsi 3)."
  },
  {
    num: 7,
    mondai: 1,
    questionNumberInMondai: 7,
    prompt: "7ばん：大学で先生が話しています。このクラスの留学生はどこでテキストを買いますか。",
    options: [
      "1. えき前の ほんや",
      "2. 大学の 中の ほんや",
      "3. じむしょ",
      "4. しょくどうの 前"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "男", text: "この授業では『日本語1』というテキストを使います。駅前の本屋や大学の中の本屋などには売っていませんから、私が皆さんのテキストを頼んでおきます。来週の授業の前に、事務所でお金を払って、テキストをもらってください。いま、食堂の前でも日本語のテキストを売っていますけれど、この授業で使うものはありません。" },
      { speaker: "質問", text: "このクラスの留学生はどこでテキストを買いますか。" }
    ],
    targetWord: "じむしょ（事務所）",
    reading: "じむしょ",
    meaningEn: "At the school office (Option 3)",
    translationId: "Di kantor administrasi (じむしょ).",
    notes: "「来週の授業の前に、事務所でお金を払って、テキストをもらってください。」(opsi 3)."
  },
  {
    num: 8,
    mondai: 1,
    questionNumberInMondai: 8,
    prompt: "8ばん：町の体育館で男の人と受付の人が話しています。男の人は来週の日曜日、体育館に何を持ってこなければなりませんか。<br/><span class='text-xs text-[#77736b]'>（ア：お金 300円 ／ イ：体育館ではく靴 ／ ウ：卓球のラケットと玉）</span>",
    options: ["1. ア・イ（お金＋靴）", "2. ア・ウ（お金＋ラケット）", "3. イ・ウ（靴＋ラケット）", "4. イ（靴だけ）"],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "男", text: "すみません。来週の日曜日、体育館で卓球がしたいんですが。" },
      { speaker: "女", text: "はい。卓球は一人2時間、300円ですが、何時間しますか。" },
      { speaker: "男", text: "2時間です。あのう、お金は今日払いますか。" },
      { speaker: "女", text: "あっ、利用するときお願いします。それから、卓球をするとき、体育館ではく靴が必要です。卓球の道具はこちらにありますので、自由に使ってください。" },
      { speaker: "質問", text: "男の人は来週の日曜日、体育館に何を持ってこなければなりませんか。" }
    ],
    targetWord: "ア・イ（お金300円 ＋ 体育館ではく靴）",
    reading: "おかねとくつ",
    meaningEn: "Money (ア) and indoor gym shoes (イ) (Option 1)",
    translationId: "Uang biaya (ア) dan sepatu olahraga dalam ruangan (イ) — alat tenis meja sudah tersedia di sana.",
    notes: "Biaya dibayar pada hari pemakaian (ア) dan wajib membawa sepatu dalam ruangan (イ), sedangkan alat tenis meja (ウ) sudah tersedia → opsi 1 (アイ)."
  },

  // ================= もんだい 2 (9 - 15 / 1ばん - 7ばん) =================
  {
    num: 9,
    mondai: 2,
    questionNumberInMondai: 1,
    prompt: "1ばん：男の人と女の人が話しています。女の人は昨日友達と一緒に何をしたと言っていますか。",
    options: [
      "1. うみの ちかくで しょくじした",
      "2. 山に のぼった",
      "3. うみで およいだ",
      "4. かいがんを さんぽした"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "男", text: "昨日はいい天気でしたね。どこかに出かけましたか。" },
      { speaker: "女", text: "ええ、友達と海の近くの店にいて、食事をしました。学生のときよく一緒に山に登っていた友達なんですが、久しぶりに会ったんです。" },
      { speaker: "男", text: "そうですか。昨日は暑かったから、海で泳いだんですか。" },
      { speaker: "女", text: "いいえ、泳いだり海岸を散歩したりしたかったんですけど、友達に用事ができてしまって、食事のあとすぐに帰りました。" },
      { speaker: "質問", text: "女の人は昨日友達と一緒に何をしたと言っていますか。" }
    ],
    targetWord: "うみの ちかくで しょくじした",
    reading: "うみのちかくでしょくじした",
    meaningEn: "Had a meal near the sea (Option 1)",
    translationId: "Makan bersama di toko dekat laut (tidak jadi berenang atau jalan-jalan di pantai karena temannya ada urusan).",
    notes: "「友達と海の近くの店にいて、食事をしました。」……「食事のあとすぐに帰りました。」(opsi 1)."
  },
  {
    num: 10,
    mondai: 2,
    questionNumberInMondai: 2,
    prompt: "2ばん：教室で先生が学生に話しています。学生は工場で何を作っている時に見学をしますか。",
    options: ["1. ジュース", "2. アイスクリーム", "3. キャンディー", "4. クッキー"],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "男", text: "来週はクラスで工場の見学に行きます。ジュースで有名な会社の工場ですが、アイスクリームやキャンディー、それからクッキーも作っているんですよ。本当はジュースを作る時に見学したかったんですが、来週はジュースは作られていないそうなので、皆さんはアイスクリームを見ることになりました。見学の後、クッキーのお土産がもらえるそうです。" },
      { speaker: "質問", text: "学生は工場で何を作っている時に見学をしますか。" }
    ],
    targetWord: "アイスクリーム",
    reading: "あいすくりーむ",
    meaningEn: "Ice cream (Option 2)",
    translationId: "Es krim (minggu depan pabrik sedang tidak memproduksi jus, jadi melihat pembuatan es krim).",
    notes: "「来週はジュースは作られていないそうなので、皆さんはアイスクリームを見ることになりました。」(opsi 2)."
  },
  {
    num: 11,
    mondai: 2,
    questionNumberInMondai: 3,
    prompt: "3ばん：授業のあとで、男の学生と女の学生が廊下で話しています。男の学生はいつ山本さんに手紙を渡しますか。",
    options: [
      "1. 山本さんが きょうしつに いるとき",
      "2. 山本さんが きょうしつを 出たとき",
      "3. 山本さんが としょかんに いるとき",
      "4. 山本さんが としょかんを 出たとき"
    ],
    correctIndex: 3,
    dialogueScript: [
      { speaker: "男", text: "森さん、この手紙を山本さんに渡してくれない？僕、山本さんのことがすきで、僕の気持を手紙に書いたんだけど、なかなか渡せないんだ。" },
      { speaker: "女", text: "自分で渡したほうがいいよ。山本さんなら、授業のあといつも30分ぐらい図書館にいるよ。" },
      { speaker: "男", text: "図書館は人が多いから、恥ずかしいよ。" },
      { speaker: "女", text: "じゃあ、出て来たときはどう？" },
      { speaker: "男", text: "うん、行ってみる。外で待って、自分で渡すよう。" },
      { speaker: "質問", text: "男の学生はいつ山本さんに手紙を渡しますか。" }
    ],
    targetWord: "山本さんが としょかんを 出たとき",
    reading: "としょかんをでたとき",
    meaningEn: "When Yamamoto-san comes out of the library (Option 4)",
    translationId: "Saat Yamamoto-san keluar dari perpustakaan.",
    notes: "「じゃあ、出て来たときはどう？」「うん、行ってみる。外で待って、自分で渡すよう。」(opsi 4)."
  },
  {
    num: 12,
    mondai: 2,
    questionNumberInMondai: 4,
    prompt: "4ばん：ラジオを聞いています。サクラ動物園はオープンの日にどうなりますか。",
    options: [
      "1. あく 時間が はやく なる",
      "2. しまる 時間が おそく なる",
      "3. 中学生いかは ただに なる",
      "4. チケットが 安く なる"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "今月二十日、金曜日にサクラ公園のとなりにサクラ動物園がオープンします。動物園は毎日10時から夕方5時までですが、オープンの日は午後8時まで開いているそうです。お仕事あとに、お子さんと一緒にいかがでしょうか。休みは毎週木曜です。チケットは600円で、中学生は500円、小学生いかのお子さんはただです。毎月はじめの土曜日にはチケットが安くなって、300円で入ります。" },
      { speaker: "質問", text: "サクラ動物園はオープンの日にどうなりますか。" }
    ],
    targetWord: "しまる 時間が おそく なる（午後8時まで開いている）",
    reading: "しまるじかんがおそくなる",
    meaningEn: "The closing time becomes later (open until 8 PM on opening day)",
    translationId: "Jam tutupnya menjadi lebih malam (buka sampai jam 8 malam pada hari pembukaan).",
    notes: "Biasanya buka sampai jam 5 sore, tetapi pada hari pembukaan buka sampai jam 8 malam (オープンの日は午後8時まで開いているそうです) → jam tutup lebih malam (opsi 2)."
  },
  {
    num: 13,
    mondai: 2,
    questionNumberInMondai: 5,
    prompt: "5ばん：女の留学生と男の留学生が話しています。女の留学生は日本の自動販売機についてどんなことに驚いたと言っていますか。",
    options: [
      "1. いろいろな ばしょに おいて あること",
      "2. うって いる ものの しゅるいが 多いこと",
      "3. ことばを 話すこと",
      "4. お金が ぬすまれないこと"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "ねえ、日本に来て、日本の自動販売機に驚かなかった？" },
      { speaker: "男", text: "驚いた。公園、病院、海、どこいってもあるから、すごいよ。" },
      { speaker: "女", text: "私が驚いたのは種類だよ。私の国では、売っているのは飲み物がほとんどだよ。" },
      { speaker: "男", text: "日本では、バナナや花、服も見たことがある。言葉を話す自動販売機もあって、東京では東京の言葉を、大阪では大阪の言葉を話すんだよ。" },
      { speaker: "質問", text: "女の留学生は日本の自動販売機についてどんなことに驚いたと言っていますか。" }
    ],
    targetWord: "うって いる ものの しゅるいが 多いこと",
    reading: "うっているもののしゅるいがおおいこと",
    meaningEn: "That there is a wide variety of items sold (Option 2)",
    translationId: "Banyaknya jenis barang yang dijual di mesin penjual otomatis.",
    notes: "Perhatikan kalimat mahasiswi: 「私が驚いたのは種類だよ。私の国では、売っているのは飲み物がほとんどだよ。」(opsi 2)."
  },
  {
    num: 14,
    mondai: 2,
    questionNumberInMondai: 6,
    prompt: "6ばん：スーパーで客と店の人が話しています。たまごが安くなる時間は何時から何時までですか。",
    options: [
      "1. 5時から 5時半まで",
      "2. 5時から 6時まで",
      "3. 5時半から 6時まで",
      "4. 5時半から 6時半まで"
    ],
    correctIndex: 3,
    dialogueScript: [
      { speaker: "女", text: "すみません。こちらのお店のホームページに今日はたまごが安いと書いてあったんですが、売り場はどこですか。" },
      { speaker: "男", text: "あそこですが、すみません、お客様、たまごが安くなるサービスは夕方の1時間だけなんです。" },
      { speaker: "女", text: "えっ、何時からですか。もう終わってしまいましたか。" },
      { speaker: "男", text: "いいえ、まだです。今ちょうど5時ですから、始まるまで30分あります。" },
      { speaker: "女", text: "分かりました。" },
      { speaker: "質問", text: "たまごが安くなる時間は何時から何時までですか。" }
    ],
    targetWord: "5時半から 6時半まで",
    reading: "ごじはんからろくじはんまで",
    meaningEn: "From 5:30 to 6:30 (Option 4)",
    translationId: "Dari pukul 5.30 sampai 6.30 (sekarang pukul 5.00, mulai 30 menit lagi dan berlangsung selama 1 jam).",
    notes: "Sekarang jam 5:00 + 30 menit lagi mulai = 5:30. Layanan berlangsung selama 1 jam (夕方の1時間だけ) = 5時半から6時半まで (opsi 4)."
  },
  {
    num: 15,
    mondai: 2,
    questionNumberInMondai: 7,
    prompt: "7ばん：会社で女の人と男の人が花見の場所について話しています。男の人はどうして東公園がいいと言っていますか。",
    options: [
      "1. 食べものの 店が たくさん あるから",
      "2. まつりが あって にぎやかだから",
      "3. ふねの 上で さくらが 見られるから",
      "4. 会社から あるいて 行けるから"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "女", text: "土曜日、仕事の帰りに花見に行かない？どこがいい？" },
      { speaker: "男", text: "東公園がいいよ。桜は東公園と北公園が有名だけど、北公園は毎年すごく込むだよ。公園の中に食べ物の店がたくさん出ていて、歩いていてもなかなか前に進めないんだ。" },
      { speaker: "女", text: "お祭りみたいで、賑やかに楽しそうだけど、ちょっと疲れるね。" },
      { speaker: "男", text: "東公園も人は多いだけど、池があって、船に乗って桜が見られるから楽しいよ。" },
      { speaker: "質問", text: "男の人はどうして東公園がいいと言っていますか。" }
    ],
    targetWord: "ふねの 上で さくらが 見られるから",
    reading: "ふねのうえでさくらがみられるから",
    meaningEn: "Because you can view the cherry blossoms from a boat on the pond (Option 3)",
    translationId: "Karena bisa melihat bunga sakura dari atas perahu di kolam.",
    notes: "「東公園も人は多いだけど、池があって、船に乗って桜が見られるから楽しいよ。」(opsi 3)."
  },

  // ================= もんだい 3 (16 - 20 / 1ばん - 5ばん, 3 Opsi) =================
  {
    num: 16,
    mondai: 3,
    questionNumberInMondai: 1,
    prompt: "1ばん：友達がかわいいネックレスをしています。買った店が知りたいです。何と言いますか。",
    options: [
      "1. どの店で買うつもりですか。",
      "2. それはどこで買ったんですか。",
      "3. 買ったかどうか教えてください。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "アナウンス", text: "友達がかわいいネックレスをしています。買った店が知りたいです。何と言いますか。" },
      { speaker: "女", text: "1. どの店で買うつもりですか。 2. それはどこで買ったんですか。 3. 買ったかどうか教えてください。" }
    ],
    targetWord: "それはどこで買ったんですか",
    reading: "それはどこでかったんですか",
    meaningEn: "Where did you buy that? (Option 2)",
    translationId: "Itu belinya di mana? (それはどこで買ったんですか).",
    notes: "Kalung sudah dipakai teman (sudah dibeli), jadi menanyakan tempat membelinya dalam bentuk lampau: それはどこで買ったんですか (opsi 2)."
  },
  {
    num: 17,
    mondai: 3,
    questionNumberInMondai: 2,
    prompt: "2ばん：机の下に自分の消しゴムが落ちました。友達に取ってもらいたいです。何と言いますか。",
    options: [
      "1. あっ、消しゴムを取ってあげようか。",
      "2. ごめん、消しゴムを拾ってくれる？",
      "3. ねえ、消しゴムが落ちたそうだよ。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "アナウンス", text: "机の下に自分の消しゴムが落ちました。友達に取ってもらいたいです。何と言いますか。" },
      { speaker: "男", text: "1. あっ、消しゴムを取ってあげようか。 2. ごめん、消しゴムを拾ってくれる？ 3. ねえ、消しゴムが落ちたそうだよ。" }
    ],
    targetWord: "ごめん、消しゴムを拾ってくれる？",
    reading: "けしごむをひろってくれる",
    meaningEn: "Sorry, could you pick up my eraser for me? (Option 2)",
    translationId: "Maaf, bisa tolong pungutkan penghapusku?",
    notes: "Meminta tolong secara akrab kepada teman untuk memungut benda jatuh menggunakan V-て＋くれる？: 消しゴムを拾ってくれる？ (opsi 2)."
  },
  {
    num: 18,
    mondai: 3,
    questionNumberInMondai: 3,
    prompt: "3ばん：エレベーターのなかです。他の人が降りた後で降ります。何と言いますか。",
    options: [
      "1. どうぞ、お先に。",
      "2. 前へ行きます。",
      "3. 後でお願いします。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "アナウンス", text: "エレベーターのなかです。他の人が降りた後で降ります。何と言いますか。" },
      { speaker: "男", text: "1. どうぞ、お先に。 2. 前へ行きます。 3. 後でお願いします。" }
    ],
    targetWord: "どうぞ、お先に",
    reading: "どうぞおさきに",
    meaningEn: "Please, after you / Go ahead first (Option 1)",
    translationId: "Silakan duluan (どうぞ、お先に).",
    notes: "Mempersilakan orang lain keluar/turun lift terlebih dahulu menggunakan ungkapan 「どうぞ、お先に。」(opsi 1)."
  },
  {
    num: 19,
    mondai: 3,
    questionNumberInMondai: 4,
    prompt: "4ばん：友達がカバンをしめるのを忘れています。何と言いますか。",
    options: [
      "1. カバンが開けておいてね。",
      "2. カバンが閉まったままだよ。",
      "3. カバンが開いているよ。"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "アナウンス", text: "友達がカバンをしめるのを忘れています。何と言いますか。" },
      { speaker: "女", text: "1. カバンが開けておいてね。 2. カバンが閉まったままだよ。 3. カバンが開いているよ。" }
    ],
    targetWord: "カバンが開いているよ",
    reading: "かばんがあいているよ",
    meaningEn: "Your bag is open! (Option 3)",
    translationId: "Tasmu terbuka lho! (カバンが開いているよ).",
    notes: "Keadaan tas yang sedang terbuka dinyatakan dengan kata kerja intransitif 開く（あく）dalam bentuk ています: カバンが開いているよ (opsi 3)."
  },
  {
    num: 20,
    mondai: 3,
    questionNumberInMondai: 5,
    prompt: "5ばん：看板の文字の読み方が知りたいです。何と言いますか。",
    options: [
      "1. どうやって書いたんですか。",
      "2. なんと書いてあるんですか。",
      "3. なにを書いておきましょうか。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "アナウンス", text: "読み方が知りたいです。何と言いますか。" },
      { speaker: "男", text: "1. どうやって書いたんですか。 2. なんと書いてあるんですか。 3. なにを書いておきましょうか。" }
    ],
    targetWord: "なんと書いてあるんですか",
    reading: "なんとかいてあるんですか",
    meaningEn: "What does it say / How is it written there? (Option 2)",
    translationId: "Apa yang tertulis di sana? / Bagaimana membacanya? (なんと書いてあるんですか).",
    notes: "Menanyakan isi/bacaan tulisan yang tertera pada papan menggunakan pola ～と書いてある: なんと書いてあるんですか (opsi 2)."
  },

  // ================= もんだい 4 (21 - 28 / 1ばん - 8ばん, 3 Opsi) =================
  {
    num: 21,
    mondai: 4,
    questionNumberInMondai: 1,
    prompt: "1ばん：「よかったら、お茶をもう一杯いかがですか。」",
    options: [
      "1. すみません、いただきます。",
      "2. もう一杯どうぞ。",
      "3. いいえ、どういたしまして。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "よかったら、お茶をもう一杯いかがですか。" },
      { speaker: "男", text: "1. すみません、いただきます。 2. もう一杯どうぞ。 3. いいえ、どういたしまして。" }
    ],
    targetWord: "すみません、いただきます",
    reading: "すみませんいただきます",
    meaningEn: "Thank you, I'll gladly have another cup (Option 1)",
    translationId: "Terima kasih, saya terima (すみません、いただきます).",
    notes: "Saat menerima tawaran makanan/minuman dengan sopan, diucapkan 「すみません、いただきます。」(opsi 1)."
  },
  {
    num: 22,
    mondai: 4,
    questionNumberInMondai: 2,
    prompt: "2ばん：「山本さん、忙しそうだけど、今ちょっと話せる？」",
    options: [
      "1. 話していませんよ。",
      "2. あっ、今は手伝えないですね。",
      "3. はい、なんですか。"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "男", text: "山本さん、忙しそうだけど、今ちょっと話せる？" },
      { speaker: "女", text: "1. 話していませんよ。 2. あっ、今は手伝えないですね。 3. はい、なんですか。" }
    ],
    targetWord: "はい、なんですか",
    reading: "はいなんですか",
    meaningEn: "Yes, what is it? (Option 3)",
    translationId: "Ya, ada apa? (はい、なんですか).",
    notes: "Terhadap pertanyaan 'Bisa bicara sebentar sekarang?' (今ちょっと話せる？), respons yang tepat adalah 「はい、なんですか。」(opsi 3)."
  },
  {
    num: 23,
    mondai: 4,
    questionNumberInMondai: 3,
    prompt: "3ばん：「リーさん、もうすぐ森さんの誕生日だね。プレゼントは何にしようか。」",
    options: [
      "1. それがいいね。",
      "2. プレゼントをあげようよ。",
      "3. うーん、Tシャツはどう？"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "女", text: "リーさん、もうすぐ森さんの誕生日だね。プレゼントは何にしようか。" },
      { speaker: "男", text: "1. それがいいね。 2. プレゼントをあげようよ。 3. うーん、Tシャツはどう？" }
    ],
    targetWord: "うーん、Tシャツはどう？",
    reading: "てぃーしゃつはどう",
    meaningEn: "Hmm, how about a T-shirt? (Option 3)",
    translationId: "Hmm, bagaimana kalau kaus T-shirt?",
    notes: "プレゼントは何にしようか (hadiahnya sebaiknya apa ya?) dijawab dengan usulan barang: うーん、Tシャツはどう？ (opsi 3)."
  },
  {
    num: 24,
    mondai: 4,
    questionNumberInMondai: 4,
    prompt: "4ばん：「あっ、その資料後で使うから、まだ片付けなくてもいいですよ。」",
    options: [
      "1. じゃあ、ここに置いておきます。",
      "2. いいえ、僕はもう使いませんよ。",
      "3. すぐ片付けましょうか。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "女", text: "あっ、その資料後で使うから、まだ片付けなくてもいいですよ。" },
      { speaker: "男", text: "1. じゃあ、ここに置いておきます。 2. いいえ、僕はもう使いませんよ。 3. すぐ片付けましょうか。" }
    ],
    targetWord: "じゃあ、ここに置いておきます",
    reading: "じゃあここにおいておきます",
    meaningEn: "Then I'll leave it right here (Option 1)",
    translationId: "Kalau begitu, saya biarkan/letakkan di sini ya.",
    notes: "Karena lawan bicara masih akan memakai dokumen itu nanti (まだ片付けなくてもいいですよ), respons alami adalah membiarkannya tetap di tempat: じゃあ、ここに置いておきます (opsi 1)."
  },
  {
    num: 25,
    mondai: 4,
    questionNumberInMondai: 5,
    prompt: "5ばん：「先輩、あのう、大学の授業の選び方について教えてもらえませんか。」",
    options: [
      "1. それはあげられないよ。",
      "2. うん、何でも聞いて。",
      "3. ぜひお願いするよ。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "先輩、あのう、大学の授業の選び方について教えてもらえませんか。" },
      { speaker: "男", text: "1. それはあげられないよ。 2. うん、何でも聞いて。 3. ぜひお願いするよ。" }
    ],
    targetWord: "うん、何でも聞いて",
    reading: "うんなんでもきいて",
    meaningEn: "Sure, ask me anything (Option 2)",
    translationId: "Ya, tanyakan saja apa pun (うん、何でも聞いて).",
    notes: "Menanggapi permintaan junior yang ingin bertanya tentang cara memilih mata kuliah: 「うん、何でも聞いて。」(opsi 2)."
  },
  {
    num: 26,
    mondai: 4,
    questionNumberInMondai: 6,
    prompt: "6ばん：「あっ、山田さん、怪我はもう良くなりましたか。」",
    options: [
      "1. あまりしませんでした。",
      "2. それはよかったです。",
      "3. すっかりなおりました。"
    ],
    correctIndex: 2,
    dialogueScript: [
      { speaker: "女", text: "あっ、山田さん、怪我はもう良くなりましたか。" },
      { speaker: "男", text: "1. あまりしませんでした。 2. それはよかったです。 3. すっかりなおりました。" }
    ],
    targetWord: "すっかりなおりました",
    reading: "すっかりなおりました",
    meaningEn: "It has completely healed (Option 3)",
    translationId: "Sudah sembuh sama sekali (すっかりなおりました).",
    notes: "怪我はもう良くなりましたか (Apakah lukanya sudah membaik?) → すっかりなおりました (sudah sembuh total, opsi 3)."
  },
  {
    num: 27,
    mondai: 4,
    questionNumberInMondai: 7,
    prompt: "7ばん：「リーさん、大学を卒業したらどうするか決まりましたか。」",
    options: [
      "1. 卒業できることになりました。",
      "2. 国に帰って、貿易の仕事をします。",
      "3. 銀行で働いたことがあります。"
    ],
    correctIndex: 1,
    dialogueScript: [
      { speaker: "女", text: "リーさん、大学を卒業したらどうするか決まりましたか。" },
      { speaker: "男", text: "1. 卒業できることになりました。 2. 国に帰って、貿易の仕事をします。 3. 銀行で働いたことがあります。" }
    ],
    targetWord: "国に帰って、貿易の仕事をします",
    reading: "くににかえってぼうえきのしごとをします",
    meaningEn: "I will return to my country and work in trade (Option 2)",
    translationId: "Saya akan pulang ke negara asal dan bekerja di bidang perdagangan internasional.",
    notes: "Menanyakan rencana setelah lulus kuliah (卒業したらどうするか) → 国に帰って、貿易の仕事をします (opsi 2)."
  },
  {
    num: 28,
    mondai: 4,
    questionNumberInMondai: 8,
    prompt: "8ばん：「ねえ、ここにあった会議の資料知らない？」",
    options: [
      "1. ええ、ないんですか。",
      "2. じゃあ、教えてください。",
      "3. 分かりませんでした。"
    ],
    correctIndex: 0,
    dialogueScript: [
      { speaker: "男", text: "ねえ、ここにあった会議の資料知らない？" },
      { speaker: "女", text: "1. ええ、ないんですか。 2. じゃあ、教えてください。 3. 分かりませんでした。" }
    ],
    targetWord: "ええ、ないんですか",
    reading: "ええ、ないんですか",
    meaningEn: "Huh, is it not there? (Option 1)",
    translationId: "Lho, memangnya tidak ada di situ? (ええ、ないんですか).",
    notes: "Ketika ditanya keberadaan dokumen yang tadinya ada di meja, respons terkejut karena ikut tidak tahu adalah 「ええ、ないんですか。」(opsi 1)."
  }
];

/**
 * Mengonversi seluruh 35 soal Kosakata (文字・語彙) 2018 JLPT N4 ke format QuestionItem.
 */
export function get2018N4VocabQuestions(): QuestionItem[] {
  return RAW_2018_N4_VOCAB.map((item) => {
    const label = N4_VOCAB_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2018_n4_vocab_${String(item.num).padStart(2, "0")}`,
      type: item.mondai === 1 || item.mondai === 3 ? "G1_KANJI_READING" : "G2_KANJI_WRITING",
      level: "N4",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      officialSourceLabel: "2018年 日本語能力試験 N4 • 言語知識（文字・語彙）",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2018OfficialN4",
        generator_version: "2018.4",
        seed: 2018400 + item.num,
        tatoeba_jpn_id: 20184100 + item.num,
        jmdict_ent_seq: `2018-N4-V-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2018 N4"
      }
    };
  });
}

/**
 * Mengonversi seluruh 35 soal Tata Bahasa & Membaca (文法・読解) 2018 JLPT N4 ke format QuestionItem.
 */
export function get2018N4GrammarReadingQuestions(): QuestionItem[] {
  return RAW_2018_N4_GRAMMAR_READING.map((item) => {
    const label = N4_GRAMMAR_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2018_n4_gr_${String(item.num).padStart(2, "0")}`,
      type: item.mondai <= 3 ? "G3_PARTICLES" : "G4_CONTEXT_VOCAB",
      level: "N4",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      passageTitle: item.passageTitle,
      passageHtml: item.passageHtml,
      isStarQuestion: item.isStarQuestion,
      officialSourceLabel: "2018年 日本語能力試験 N4 • 言語知識（文法）・読解",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2018OfficialN4",
        generator_version: "2018.4",
        seed: 2018450 + item.num,
        tatoeba_jpn_id: 20184200 + item.num,
        jmdict_ent_seq: `2018-N4-GR-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2018 N4"
      }
    };
  });
}

/**
 * Mengonversi seluruh 28 soal Mendengarkan (聴解) 2018 JLPT N4 ke format QuestionItem.
 */
export function get2018N4ListeningQuestions(): QuestionItem[] {
  return RAW_2018_N4_LISTENING.map((item) => {
    const label = N4_LISTENING_MONDAI_LABELS[item.mondai];
    return {
      id: `jlpt2018_n4_listen_${String(item.num).padStart(2, "0")}`,
      type: "G4_CONTEXT_VOCAB",
      level: "N4",
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      mondaiNumber: item.mondai,
      mondaiLabelJa: label.ja,
      mondaiLabelId: label.id,
      dialogueScript: item.dialogueScript,
      officialSourceLabel: "2018年 日本語能力試験 N4 • 聴解",
      explanation: {
        targetWord: item.targetWord,
        reading: item.reading,
        meaningEn: item.meaningEn,
        translationId: item.translationId,
        notes: item.notes
      },
      provenance: {
        generator: "jlpt2018OfficialN4",
        generator_version: "2018.4",
        seed: 2018490 + item.num,
        tatoeba_jpn_id: 20184300 + item.num,
        jmdict_ent_seq: `2018-N4-L-${item.num}`
      },
      review: {
        status: "approved",
        reviewer: "Official Answer Key 2018 N4"
      }
    };
  });
}

/**
 * Membangun objek ujian lengkap 2018年 日本語能力試験 N4（公式過去問・全98問）
 * sesuai dokumen PDF N4-2018年 (35 文字・語彙 + 35 文法・読解 + 28 聴解 = 98 Soal, 115 Menit).
 */
export function generateOfficial2018N4MockTest(): MockTest {
  return {
    id: 20184,
    title: "2018年 日本語能力試験 N4【完全再現】",
    subtitle: "35 文字・語彙（用法付） • 35 文法・読解（★並べ替え・水泳・東京駅・青野市予定表） • 28 聴解（会話原文付）",
    badgeLabel: "2018年 公式過去問 • 98問",
    isOfficialPastPaper: true,
    officialYear: "2018",
    level: 4,
    levelLabel: "N4",
    difficulty: "standard",
    difficultyLabel: "Standar",
    totalDurationMinutes: 115,
    totalQuestions: 98,
    passingScoreTotal: 90,
    passingScoreLangReading: 38,
    passingScoreListening: 19,
    mock_sections: [
      {
        id: 2018401,
        mock_test_id: 20184,
        position: 1,
        category: "vocab",
        duration_minutes: 30,
        mock_questions_count: 35,
        titleJa: "言語知識（文字・語彙）",
        titleId: "Kosakata"
      },
      {
        id: 2018402,
        mock_test_id: 20184,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 60,
        mock_questions_count: 35,
        titleJa: "言語知識（文法）・読解",
        titleId: "Tata Bahasa & Membaca"
      },
      {
        id: 2018403,
        mock_test_id: 20184,
        position: 3,
        category: "listening",
        duration_minutes: 35,
        mock_questions_count: 28,
        titleJa: "聴解",
        titleId: "Mendengarkan"
      }
    ]
  };
}

