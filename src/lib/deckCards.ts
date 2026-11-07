// Card-level operations that keep IndexedDB (card bodies), the deck list (totals)
// and the SRS store (schedules) in sync. UI code should go through these helpers
// instead of calling deckDb directly.

import { deleteCards, getCards, getDeckMediaCount, listStoredDeckIds, putCards, putMedia, type StoredCard } from "./deckDb";
import { sanitizeInline, toPlain } from "./ankiText";
import { toHiragana } from "./kana";
import { compressBubbleImageForCard } from "./mangaCoordinates";
import { SEED_TOTALS, useAppStore } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";

export const DECK_LEVELS = ["N5", "N4", "N3", "N2", "N1", "Campuran"] as const;
export const DECK_KINDS = ["Core", "Anime", "Novel", "Manga", "YouTube"] as const;
export const DECK_COLORS = ["coral", "indigo", "sage", "ochre", "plum", "slate"] as const;
export const KANJI_SUGGEST = ["札", "語", "単", "漢", "学", "日", "旅", "夢"];

export const autoKanji = (t: string) => (t.match(/[\u3400-\u9fff]/g) ?? []).slice(0, 2).join("") || "札";

/** "N4 • Core" → { level: "N4", kind: "Core" } (best effort for older free-form labels). */
export function splitLevel(deck: { level: string; kind: string }) {
  const parts = deck.level.split("•").map((s) => s.trim());
  const level = parts.find((p) => (DECK_LEVELS as readonly string[]).includes(p)) ?? "Campuran";
  return { level, kind: deck.kind };
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** User-typed text → the safe inline HTML format cards are stored in. */
export const textToHtml = (s: string) => escapeHtml(s.trim()).replace(/\r?\n/g, "<br>");

/** Stored inline HTML → editable plain text (keeps Anki `漢字[かんじ]` furigana brackets). */
export const htmlToText = (s: string) =>
  s
    .split(/<br\s*\/?>/i)
    .map(toPlain)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// ---------------------------------------------------------------------------
// Starter decks
// ---------------------------------------------------------------------------

type Seed = [word: string, reading: string, meaning: string, sentence: string, translation: string];

const SEEDS: Record<string, Seed[]> = {
  "1": [
    ["大丈夫", "だいじょうぶ", "baik-baik saja; tidak apa-apa", " 大丈夫[だいじょうぶ]？ 怪我[けが]はない？", "Kamu baik-baik saja? Tidak terluka?"],
    ["約束", "やくそく", "janji", " 明日[あした]の 約束[やくそく]、 忘[わす]れないでね。", "Jangan lupa janji besok, ya."],
    ["準備", "じゅんび", "persiapan", "もう 準備[じゅんび]できた？", "Sudah siap?"],
    ["遅刻", "ちこく", "terlambat (datang)", " 電車[でんしゃ]が 止[と]まって 遅刻[ちこく]した。", "Keretanya berhenti, jadi aku terlambat."],
    ["片付ける", "かたづける", "merapikan; membereskan", " 部屋[へや]を 片付[かたづ]けなさい。", "Rapikan kamarmu."],
    ["届く", "とどく", "sampai; tersampaikan", " 諦[あきら]めなければ、きっと 届[とど]く。", "Kalau tidak menyerah, pasti akan tersampaikan."],
    ["自分らしく", "じぶんらしく", "menjadi diri sendiri", " 自分[じぶん]らしく 生[い]きることは、 思[おも]ったより 難[むずか]しい。", "Hidup menjadi diri sendiri lebih sulit dari yang dibayangkan."],
    ["久しぶり", "ひさしぶり", "sudah lama tidak (bertemu)", " 久[ひさ]しぶり！ 元気[げんき]だった？", "Lama tak jumpa! Apa kabar?"],
    ["似合う", "にあう", "cocok (dipakai)", "その 服[ふく]、よく 似合[にあ]ってるね。", "Baju itu cocok sekali untukmu."],
    ["気をつける", "きをつける", "berhati-hati", " 気[き]をつけて 帰[かえ]ってね。", "Hati-hati di jalan pulang, ya."],
    ["迷う", "まよう", "bingung; tersesat", "どっちにするか 迷[まよ]っている。", "Aku bingung mau pilih yang mana."],
    ["楽しみ", "たのしみ", "menantikan; hal yang dinanti", " 週末[しゅうまつ]の 旅行[りょこう]が 楽[たの]しみだ。", "Aku menantikan perjalanan akhir pekan."],
  ],
  "2": [
    ["寿命", "じゅみょう", "umur; masa hidup", " 人間[にんげん]の 寿命[じゅみょう]は 短[みじか]いんだね。", "Umur manusia itu pendek, ya."],
    ["魔法", "まほう", "sihir", " 魔法[まほう]はイメージの 世界[せかい]だ。", "Sihir adalah dunia imajinasi."],
    ["勇者", "ゆうしゃ", "pahlawan", " 勇者[ゆうしゃ]ヒンメルならそうした。", "Pahlawan Himmel pasti akan melakukan itu."],
    ["旅", "たび", "perjalanan; petualangan", "10 年[ねん]の 旅[たび]が 終[お]わった。", "Perjalanan sepuluh tahun telah berakhir."],
    ["弟子", "でし", "murid", " 私[わたし]の 弟子[でし]は 優秀[ゆうしゅう]だよ。", "Muridku sangat berbakat."],
    ["後悔", "こうかい", "penyesalan", "もっと 知[し]ろうとしなかったことを 後悔[こうかい]している。", "Aku menyesal tidak berusaha mengenalnya lebih jauh."],
    ["墓", "はか", "makam", " 仲間[なかま]の 墓[はか]に 花[はな]を 供[そな]える。", "Meletakkan bunga di makam rekan seperjalanan."],
    ["思い出", "おもいで", "kenangan", " 大切[たいせつ]な 思[おも]い 出[で]だ。", "Itu kenangan yang berharga."],
  ],
  "3": [
    ["台所", "だいどころ", "dapur", " 私[わたし]がこの 世[よ]でいちばん 好[す]きな 場所[ばしょ]は 台所[だいどころ]だと 思[おも]う。", "Kurasa tempat yang paling kusukai di dunia ini adalah dapur."],
    ["祖母", "そぼ", "nenek", " 祖母[そぼ]が 死[し]んでしまった。", "Nenekku telah meninggal."],
    ["孤独", "こどく", "kesepian; kesendirian", " 夜[よる]の 孤独[こどく]に 慣[な]れていく。", "Perlahan terbiasa dengan kesepian malam."],
    ["冷蔵庫", "れいぞうこ", "kulkas", " 冷蔵庫[れいぞうこ]の 音[おと]だけが 聞[き]こえる。", "Hanya suara kulkas yang terdengar."],
    ["眠る", "ねむる", "tidur", " 台所[だいどころ]の 床[ゆか]で 眠[ねむ]った。", "Aku tidur di lantai dapur."],
    ["居候", "いそうろう", "menumpang tinggal", " 田辺[たなべ] 家[け]に 居候[いそうろう]することになった。", "Aku jadi menumpang tinggal di rumah keluarga Tanabe."],
    ["不思議", "ふしぎ", "aneh; misterius", " 不思議[ふしぎ]な 人[ひと]たちだった。", "Mereka orang-orang yang misterius."],
    ["料理", "りょうり", "masakan; memasak", " 料理[りょうり]をすると 心[こころ]が 落[お]ち 着[つ]く。", "Memasak membuat hatiku tenang."],
  ],
  "ps-n5": [
    ["猫", "ねこ", "kucing", " 猫[ねこ]が 部屋[へや]にいます。", "Ada kucing di dalam kamar."],
    ["犬", "いぬ", "anjing", " 公園[こうえん]で 犬[いぬ]と 遊[あそ]びました。", "Bermain dengan anjing di taman."],
    ["水", "みず", "air", " 冷[つめ]たい 水[みず]を 飲[の]みます。", "Minum air dingin."],
    ["食べる", "たべる", "makan", " 朝[あさ]ご飯[はん]を 食[た]べました。", "Sudah makan sarapan."],
    ["飲む", "のむ", "minum", "お 茶[ちゃ]を 飲[の]みましょう。", "Ayo minum teh."],
    ["行く", "いく", "pergi", " 明日[あした]、 学校[がっこう]へ 行[い]きます。", "Besok pergi ke sekolah."],
    ["本", "ほん", "buku", " 図書館[としょかん]で 本[ほん]を 読[よ]む。", "Membaca buku di perpustakaan."],
    ["友だち", "ともだち", "teman", " 友[とも]だちと 話[はな]します。", "Berbicara dengan teman."],
    ["車", "くるま", "mobil", " 新[あたら]しい 車[くるま]を 買[か]いました。", "Membeli mobil baru."],
    ["家", "いえ", "rumah", " 私[わたし]の 家[いえ]は 近[ちか]くにあります。", "Rumah saya ada di dekat sini."],
  ],
  "ps-n4": [
    ["案内", "あんない", "panduan; memandu", " 京都[きょうと]の 町[まち]を 案内[あんない]します。", "Memandu di kota Kyoto."],
    ["準備", "じゅんび", "persiapan", " 旅行[りょこう]の 準備[じゅんび]をする。", "Menyiapkan keperluan liburan."],
    ["約束", "やくそく", "janji", " 約束[やくそく]を 守[まも]りましょう。", "Mari tepati janji."],
    ["遅刻", "ちこく", "terlambat", " 電車[でんしゃ]が 遅[おく]れて 遅刻[ちこく]した。", "Keretanya terlambat jadi saya terlambat."],
    ["片付ける", "かたづける", "membereskan", " 部屋[へや]を 片付[かたづ]けます。", "Membereskan kamar."],
    ["届く", "とどく", "sampai; tiba", " 荷物[にもつ]が 届[とど]きました。", "Paketnya sudah sampai."],
    ["似合う", "にあう", "cocok (pakaian)", "その 服[ふく]がよく 似合[にあ]う。", "Baju itu sangat cocok untukmu."],
    ["迷う", "まよう", "bingung; tersesat", " 道[みち]に 迷[まよ]ってしまった。", "Saya tersesat di jalan."],
  ],
  "ps-n3": [
    ["関心", "かんしん", "minat; perhatian", " 日本[にほん]の 文化[ぶんか]に 関心[かんしん]がある。", "Tertarik pada budaya Jepang."],
    ["複雑", "ふくざつ", "rumit", "この 文法[ぶんぽう]は 複雑[ふくざつ]だ。", "Tata bahasa ini rumit."],
    ["解決", "かいけつ", "menyelesaikan masalah", " 問題[もんだい]を 解決[かいけつ]する。", "Menyelesaikan masalah."],
    ["技術", "ぎじゅつ", "teknologi; keahlian", " 新[あたら]しい 技術[ぎじゅつ]を 学[まな]ぶ。", "Mempelajari teknologi baru."],
    ["経験", "けいけん", "pengalaman", "いい 経験[けいけん]になりました。", "Menjadi pengalaman yang baik."],
    ["台所", "だいどころ", "dapur", " 台所[だいどころ]で 料理[りょうり]を作る。", "Memasak di dapur."],
    ["孤独", "こどく", "kesepian", " 夜[よる]の 孤独[こどく]を感[かん]じる。", "Merasakan kesepian di malam hari."],
    ["不思議", "ふしぎ", "misterius; ajaib", " 不思議[ふしぎ]な 出来事[できごと]だった。", "Itu peristiwa yang misterius."],
  ],
  "ps-n2": [
    ["克服", "こくふく", "mengatasi; menaklukkan", " 弱点[じゃくてん]を 克服[こくふく]した。", "Mengatasi kelemahan."],
    ["影響", "えいきょう", "pengaruh", " 環境[かんきょう]が 人[ひと]に 影響[えいきょう]を 与[あた]える。", "Lingkungan memberi pengaruh pada manusia."],
    ["慎重", "しんちょう", "berhati-hati", " 慎重[しんちょう]に 判断[はんだん]すべきだ。", "Harus memutuskan secara hati-hati."],
    ["効果", "こうか", "efektivitas; efek", " 薬[くすり]の 効果[こうか]が 現[あらわ]れた。", "Efek obatnya mulai terlihat."],
    ["範囲", "はんい", "jangkauan; cakupan", " 試験[しけん]の 範囲[はんい]を 確認[かくにん]する。", "Memeriksa cakupan ujian."],
    ["居候", "いそうろう", "menumpang tinggal", " 友人[ゆうじん]の 家[いえ]に 居候[いそうろう]する。", "Menumpang tinggal di rumah teman."],
    ["寿命", "じゅみょう", "masa hidup; umur", " 人間[にんげん]の 寿命[じゅみょう]は 延[の]びた。", "Masa hidup manusia bertambah panjang."],
    ["後悔", "こうかい", "penyesalan", " 過去[かこ]の 行動[こうどう]を 後悔[こうかい]する。", "Menyesali perbuatan masa lalu."],
  ],
  "ps-n1": [
    ["相変わらず", "あいかわらず", "seperti biasa", " 彼[かれ]は 相変[あいか]わらず 元気[げんき]だ。", "Dia seperti biasa selalu bersemangat."],
    ["圧倒的", "あっとうてき", "luar biasa dominan", " 圧倒的[あっとうてき]な 力[ちから]を 見[み]せつける。", "Memperlihatkan kekuatan yang luar biasa dominan."],
    ["顕著", "けんちょ", "nyata; mencolok", " 成果[せいか]が 顕著[けんちょ]に 現[あらわ]れた。", "Hasilnya terlihat secara mencolok."],
    ["妥協", "だきょう", "kompromi", " 品質[ひんしつ]において 妥協[だきょう]しない。", "Tidak mau berkompromi soal kualitas."],
    ["躊躇", "ちゅうちょ", "ragu-ragu", " 躊躇[ちゅうちょ]せずに 行動[こうどう]する。", "Bertindak tanpa ragu-ragu."],
    ["魔法", "まほう", "sihir", " 魔法[まほう]のような 出来事[できごと]だ。", "Peristiwa yang bagaikan sihir."],
    ["勇者", "ゆうしゃ", "pahlawan", " 勇者[ゆうしゃ]が 旅[たび]に 出[で]る。", "Pahlawan pergi bertualang."],
    ["弟子", "деし", "murid; pembelajar", " 優秀[ゆうしゅう]な 弟子[でし]を 育[そだ]てる。", "Membimbing murid yang berbakat."],
  ],
  "ps-ankidrone": [
    ["日常", "にちじょう", "sehari-hari", " 日常[にちじょう]の 会話[かいわ]を 楽[たの]しむ。", "Menikmati obrolan sehari-hari."],
    ["会話", "かいわ", "percakapan", " 日本語[にほんご]で 会話[かいわ]する。", "Bercakap-cakap dalam bahasa Jepang."],
    ["時間", "じかん", "waktu", " 時間[じかん]を 大切[たいせつ]にする。", "Menghargai waktu."],
    ["瞬間", "しゅんかん", "sekejap; saat", "その 瞬間[しゅんかん]、すべてが 変[か]わった。", "Pada saat itu, segalanya berubah."],
    ["場所", "ばしょ", "tempat", " 静[しず]かな 場所[ばしょ]を 見[み]つける。", "Menemukan tempat yang sunyi."],
    ["感情", "かんじょう", "emosi; perasaan", " 自分[じぶん]の 感情[かんじょう]を 表現[ひょうげん]する。", "Mengekspresikan emosi diri."],
    ["記憶", "きおく", "ingatan; memori", " 楽[たの]しい 記憶[きおく]を 思[おも]い出[だ]す。", "Mengingat memori yang menyenangkan."],
    ["世界", "せかい", "dunia", " 新[あたら]しい 世界[せかい]を 見[み]る。", "Melihat dunia baru."],
    ["人間", "にんげん", "manusia", " 人間[にんげん]の 心[こころ]は 複雑[ふくざつ]だ。", "Hati manusia itu rumit."],
    ["未来", "みらい", "masa depan", " 明[あか]るい 未来[みらい]を 信[しん]じる。", "Percaya pada masa depan yang cerah."],
  ],
};

const SEED_FLAG = "ma-seed-v2-philia";

async function seedStarterDecks(): Promise<void> {
  const store = useAppStore.getState();
  const currentDecks = store.decks;

  // If Philia Space root deck is missing in state (e.g. from existing older localStorage), inject the hierarchy
  if (!currentDecks.some((d) => d.id === "ps-root")) {
    const philiaBundle: import("../store/useAppStore").DeckItem[] = [
      {
        id: "ps-root",
        title: "Philia Space",
        level: "Campuran • Core",
        kind: "Core",
        due: 0,
        total: 52,
        progress: 0,
        kanji: "宙",
        color: "indigo",
        updated: "Hari ini",
        source: "manual",
        subdeckIds: ["ps-bi"],
      },
      {
        id: "ps-bi",
        parentId: "ps-root",
        title: "Bahasa Indonesia",
        subdeckName: "Bahasa Indonesia",
        level: "Campuran • Core",
        kind: "Core",
        due: 0,
        total: 52,
        progress: 0,
        kanji: "印",
        color: "slate",
        updated: "Hari ini",
        source: "manual",
        subdeckIds: ["ps-ankidrone", "ps-kotoba"],
      },
      {
        id: "ps-ankidrone",
        parentId: "ps-bi",
        title: "Ankidrone Core 10K",
        subdeckName: "Ankidrone Core 10K",
        level: "Core 10K",
        kind: "Core",
        due: 0,
        total: 10,
        progress: 0,
        kanji: "単",
        color: "plum",
        updated: "Hari ini",
        source: "manual",
      },
      {
        id: "ps-kotoba",
        parentId: "ps-bi",
        title: "Kotoba N5-N1",
        subdeckName: "Kotoba N5-N1",
        level: "N5-N1 • Core",
        kind: "Core",
        due: 0,
        total: 42,
        progress: 0,
        kanji: "語",
        color: "ochre",
        updated: "Hari ini",
        source: "manual",
        subdeckIds: ["ps-n1", "ps-n2", "ps-n3", "ps-n4", "ps-n5"],
      },
      {
        id: "ps-n1",
        parentId: "ps-kotoba",
        title: "N1",
        subdeckName: "N1",
        level: "N1 • Core",
        kind: "Core",
        due: 0,
        total: 8,
        progress: 0,
        kanji: "極",
        color: "plum",
        updated: "Hari ini",
        source: "manual",
      },
      {
        id: "ps-n2",
        parentId: "ps-kotoba",
        title: "N2",
        subdeckName: "N2",
        level: "N2 • Core",
        kind: "Core",
        due: 0,
        total: 8,
        progress: 0,
        kanji: "上",
        color: "ochre",
        updated: "Hari ini",
        source: "manual",
      },
      {
        id: "ps-n3",
        parentId: "ps-kotoba",
        title: "N3",
        subdeckName: "N3",
        level: "N3 • Core",
        kind: "Core",
        due: 0,
        total: 8,
        progress: 0,
        kanji: "中",
        color: "indigo",
        updated: "Hari ini",
        source: "manual",
      },
      {
        id: "ps-n4",
        parentId: "ps-kotoba",
        title: "N4",
        subdeckName: "N4",
        level: "N4 • Core",
        kind: "Core",
        due: 0,
        total: 8,
        progress: 0,
        kanji: "基",
        color: "sage",
        updated: "Hari ini",
        source: "manual",
      },
      {
        id: "ps-n5",
        parentId: "ps-kotoba",
        title: "N5",
        subdeckName: "N5",
        level: "N5 • Core",
        kind: "Core",
        due: 0,
        total: 10,
        progress: 0,
        kanji: "初",
        color: "coral",
        updated: "Hari ini",
        source: "manual",
      },
    ];
    store.importDecksBatch(philiaBundle);
  }

  // Seed cards into IndexedDB for all seed keys
  for (const [deckId, rows] of Object.entries(SEEDS)) {
    const existing = await getCards(deckId);
    if (existing.length > 0) continue;
    const cards: StoredCard[] = rows.map(([word, reading, meaning, sentence, translation], i) => ({
      id: `s${deckId}-${String(i + 1).padStart(2, "0")}`,
      deckId,
      word,
      reading,
      meaning,
      sentence,
      translation,
      subdeck: "",
      tags: [],
    }));
    await putCards(cards);

    // Seed realistic due SRS schedules for demo subdecks
    if (["ps-n5", "ps-n4", "ps-n3", "ps-n2", "ps-ankidrone"].includes(deckId)) {
      const now = Date.now();
      const srsList = cards.map((c, idx) => ({
        id: c.id,
        repetitions: 2 + (idx % 3),
        interval: 1 + (idx % 4),
        easeFactor: 2.5,
        nextReview: now - (idx + 1) * 3600 * 1000, // already due
        lastReview: now - 86400 * 1000,
        lapses: 0,
      }));
      useReviewStore.getState().importSchedule(deckId, srsList);
    }
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SEED_FLAG, "1");
  }
}

function commonSubdeckRoot(subdecks: string[]): string {
  const valid = subdecks.filter(Boolean);
  if (valid.length === 0) return "";
  const parts = valid.map((n) => n.split("::"));
  const root: string[] = [];
  for (let i = 0; i < parts[0].length; i++) {
    const seg = parts[0][i];
    if (parts.every((p) => p[i] === seg)) root.push(seg);
    else break;
  }
  return root.join(" · ") || valid[0].split("::").pop() || "";
}

async function recoverOrphanedDecks(): Promise<void> {
  try {
    const storedIds = await listStoredDeckIds();
    const knownIds = new Set(useAppStore.getState().decks.map((d) => d.id));
    for (const deckId of storedIds) {
      if (knownIds.has(deckId) || !deckId.startsWith("deck-")) continue;
      const cards = await getCards(deckId);
      if (cards.length === 0) continue;
      // Re-check in case an import just finished concurrently
      if (useAppStore.getState().decks.some((d) => d.id === deckId)) continue;
      const subdecks = [...new Set(cards.map((c) => c.subdeck).filter(Boolean))];
      const mediaCount = await getDeckMediaCount(deckId);
      const importedAt = Number(deckId.replace(/^deck-/, "")) || Date.now();
      const title = commonSubdeckRoot(subdecks) || "Deck Impor Anki";
      useAppStore.getState().importDeck({
        id: deckId,
        title,
        level: "Campuran • Core",
        kind: "Core",
        total: cards.length,
        kanji: autoKanji(title),
        color: "indigo",
        meta: {
          fileName: `${title}.apkg`,
          fileSize: 0,
          format: "anki21b",
          importedAt,
          noteTypes: [],
          subdecks,
          mediaCount,
          skipped: 0,
        },
      });
    }
  } catch {
    /* ignore recovery errors */
  }
}

let seedPromise: Promise<void> | null = null;
export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedStarterDecks().catch((e) => console.warn("Seeding skipped", e));
  }
  await seedPromise;
  await recoverOrphanedDecks();
}

/** Cards of a deck in insertion order (waits for the starter decks to be seeded on first run). */
export async function loadDeckCards(deckId: string): Promise<StoredCard[]> {
  await ensureSeeded();
  const directCards = await getCards(deckId);
  const decks = useAppStore.getState().decks;
  
  // Recursively collect all descendant deck IDs
  const descendantIds = new Set<string>();
  const queue = [deckId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const d of decks) {
      if (d.parentId === current && !descendantIds.has(d.id)) {
        descendantIds.add(d.id);
        queue.push(d.id);
      }
    }
  }

  if (descendantIds.size === 0) return directCards;
  const childCardsArrays = await Promise.all([...descendantIds].map((id) => getCards(id)));
  return [...directCards, ...childCardsArrays.flat()];
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export interface CardDraft {
  word: string;
  reading: string;
  meaning: string;
  sentence: string;
  translation: string;
  tags: string[];
}

const newId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function syncTotal(deckId: string) {
  const directCards = await getCards(deckId);
  const decks = useAppStore.getState().decks;
  const currentDeck = decks.find((d) => d.id === deckId);
  const childDecks = decks.filter((d) => d.parentId === deckId);
  let total = directCards.length;
  if (childDecks.length > 0) {
    total = childDecks.reduce((sum, cd) => sum + cd.total, directCards.length);
  }
  useAppStore.getState().updateDeck(deckId, { total });

  let ancestorId = currentDeck?.parentId;
  const visited = new Set<string>();
  while (ancestorId && !visited.has(ancestorId)) {
    visited.add(ancestorId);
    const ancestor = decks.find((d) => d.id === ancestorId);
    const siblings = decks.filter((d) => d.parentId === ancestorId);
    const ancestorDirectCards = await getCards(ancestorId);
    const siblingTotal = siblings.reduce(
      (sum, sd) => sum + (sd.id === deckId ? total : sd.total),
      ancestorDirectCards.length,
    );
    useAppStore.getState().updateDeck(ancestorId, { total: siblingTotal });
    ancestorId = ancestor?.parentId;
  }

  return total;
}

export async function addCards(deckId: string, drafts: CardDraft[]): Promise<StoredCard[]> {
  const cards: StoredCard[] = drafts.map((d) => ({
    id: newId() + Math.random().toString(36).slice(2, 4),
    deckId,
    word: d.word.trim(),
    reading: d.reading.trim(),
    meaning: textToHtml(d.meaning),
    sentence: textToHtml(d.sentence),
    translation: textToHtml(d.translation),
    subdeck: "",
    tags: d.tags,
  }));
  await putCards(cards);
  await syncTotal(deckId);
  return cards;
}

/**
 * Menghasilkan kunci unik `(expression + reading)` yang dinormalisasi ke Hiragana
 * untuk mendeteksi kartu ganda di dalam sebuah deck.
 */
export function buildCardDuplicateKey(word: string, reading: string): string {
  const w = word.trim();
  const r = toHiragana((reading || word).trim());
  return `${w}::${r}`;
}

/**
 * Mengambil himpunan kunci `(expression + reading)` dari seluruh kartu yang sudah ada
 * di dalam deck tujuan agar popup Sentence Mining dapat memberi penanda duplikat.
 */
export async function getDeckDuplicateKeys(deckId: string): Promise<Set<string>> {
  const cards = await loadDeckCards(deckId);
  const set = new Set<string>();
  for (const c of cards) {
    set.add(buildCardDuplicateKey(c.word, c.reading));
    if (c.word.trim()) {
      set.add(`${c.word.trim()}::*`);
    }
  }
  return set;
}

/**
 * Menyimpan kartu hasil Sentence Mining ke deck tujuan menggunakan model `StoredCard`
 * yang sudah ada, dengan mempertahankan tag inline aman (`<b>kata</b>` pada kalimat sumber)
 * serta menyimpan gambar gelembung manga terkompresi (opsional) ke store `media` yang sama
 * dengan media hasil impor deck.
 */
export async function addMinedCardToDeck(
  deckId: string,
  draft: CardDraft & { subdeck?: string; imageBlob?: Blob },
): Promise<StoredCard> {
  const cardId = newId() + Math.random().toString(36).slice(2, 4);
  let imageMediaName: string | undefined;

  if (draft.imageBlob && draft.imageBlob.size > 0) {
    const compressed = await compressBubbleImageForCard(
      draft.imageBlob,
      800,
      0.8,
    );
    imageMediaName = `manga-bubble-${cardId}.${compressed.ext}`;
    await putMedia(deckId, [[imageMediaName, compressed.blob]]);
  }

  const card: StoredCard = {
    id: cardId,
    deckId,
    word: draft.word.trim(),
    reading: draft.reading.trim(),
    meaning: sanitizeInline(draft.meaning.trim().replace(/\r?\n/g, "<br>")),
    sentence: sanitizeInline(draft.sentence.trim().replace(/\r?\n/g, "<br>")),
    translation: textToHtml(draft.translation),
    image: imageMediaName,
    subdeck: draft.subdeck?.trim() ?? "",
    tags: draft.tags,
  };
  await putCards([card]);
  await syncTotal(deckId);
  return card;
}

/**
 * Save edits to an existing card. Only fields whose plain-text value actually changed are
 * rewritten, so untouched Anki formatting (bold, line breaks…) is preserved.
 */
export async function updateCard(card: StoredCard, draft: CardDraft): Promise<StoredCard> {
  const pick = (field: "meaning" | "sentence" | "translation") =>
    draft[field].trim() === htmlToText(card[field]).trim() ? card[field] : textToHtml(draft[field]);
  const next: StoredCard = {
    ...card,
    word: draft.word.trim(),
    reading: draft.reading.trim(),
    meaning: pick("meaning"),
    sentence: pick("sentence"),
    translation: pick("translation"),
    tags: draft.tags,
  };
  await putCards([next]);
  useAppStore.getState().updateDeck(card.deckId, {});
  return next;
}

export async function removeCards(deckId: string, ids: string[]): Promise<void> {
  await deleteCards(deckId, ids);
  useReviewStore.getState().forgetCards(deckId, ids);
  await syncTotal(deckId);
}

export function draftFromCard(c?: StoredCard): CardDraft {
  if (!c) return { word: "", reading: "", meaning: "", sentence: "", translation: "", tags: [] };
  return {
    word: c.word,
    reading: c.reading,
    meaning: htmlToText(c.meaning),
    sentence: htmlToText(c.sentence),
    translation: htmlToText(c.translation),
    tags: c.tags ?? [],
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "deck";

export async function exportDeck(deckId: string, title: string, format: "csv" | "json"): Promise<number> {
  const cards = await getCards(deckId);
  const srs = useReviewStore.getState().srsCards[deckId] ?? {};
  if (format === "json") {
    const body = { title, exportedAt: new Date().toISOString(), cards: cards.map(({ deckId: _d, ...c }) => ({ ...c, srs: srs[c.id] ?? null })) };
    download(`${slug(title)}.json`, "application/json", JSON.stringify(body, null, 2));
  } else {
    const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [["word", "reading", "meaning", "sentence", "translation", "tags"].join(",")];
    for (const c of cards) rows.push([c.word, c.reading, toPlain(c.meaning), toPlain(c.sentence), toPlain(c.translation), (c.tags ?? []).join(" ")].map(cell).join(","));
    // BOM so Excel opens Japanese text correctly.
    download(`${slug(title)}.csv`, "text/csv;charset=utf-8", "\ufeff" + rows.join("\n"));
  }
  return cards.length;
}
