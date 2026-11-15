import React, { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MockTest,
  MockSection,
  SectionSessionResult
} from "../components/jlpt/types";
import {
  generateOfficial2018N5MockTest,
  generateOfficial2018N4MockTest,
  generateOfficial2022N3MockTest,
  generateOfficial2016N2MockTest,
  generateOfficial2023N1MockTest
} from "../components/jlpt/mockTestCatalog";
import { calculateOfficialJLPTScore } from "../components/jlpt/jlptScoring";
import { loadQuestionsForTestAndSection } from "../components/jlpt/mockTestLoader";
import type { QuestionItem } from "../lib/questionPack";
import { Icon } from "../ui";

const AudioCheckModal = lazy(() => import("../components/jlpt/AudioCheckModal"));
const TestDetailsModal = lazy(() => import("../components/jlpt/TestDetailsModal"));
const TestSessionRunner = lazy(() => import("../components/jlpt/TestSessionRunner"));
const TestReviewView = lazy(() => import("../components/jlpt/TestReviewView"));

export interface ExamPageProps {
  notify?: (type: "success" | "error" | "info", msg: string) => void;
}

const STORAGE_KEY_SESSIONS = "jlpt_mock_sessions_v1";

interface MondaiBreakdownItem {
  mondai: number;
  titleJa: string;
  titleId: string;
  count: number;
  rangeLabel: string;
  startIndex: number;
  badge?: string;
}

const SECTION_MONDAI_BREAKDOWN_BY_LEVEL: Record<
  "N5" | "N4" | "N3" | "N2" | "N1",
  Record<string, MondaiBreakdownItem[]>
> = {
  N5: {
    vocab: [
      {
        mondai: 1,
        titleJa: "もんだい 1：漢字の読み",
        titleId: "Bacaan Kanji dalam Hiragana",
        count: 12,
        rangeLabel: "No. 1–12",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：表記",
        titleId: "Penulisan Kanji & Katakana",
        count: 8,
        rangeLabel: "No. 13–20",
        startIndex: 12
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文脈規定",
        titleId: "Kosakata Kontekstual Kalimat",
        count: 10,
        rangeLabel: "No. 21–30",
        startIndex: 20
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：言い換え類義",
        titleId: "Sinonim & Parafrasa Kalimat",
        count: 5,
        rangeLabel: "No. 31–35",
        startIndex: 30
      }
    ],
    grammar_reading: [
      {
        mondai: 1,
        titleJa: "もんだい 1：文法形式の判断",
        titleId: "Partikel & Tata Bahasa Kalimat",
        count: 16,
        rangeLabel: "No. 1–16",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：★ 並べ替え",
        titleId: "Menyusun Kalimat Bintang ★",
        count: 5,
        rangeLabel: "No. 17–21",
        startIndex: 16,
        badge: "★ 並べ替え"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文章の文法",
        titleId: "Wacana Esai Nin-san & Mei-san",
        count: 5,
        rangeLabel: "No. 22–26",
        startIndex: 21,
        badge: "文章文法"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：内容理解（短文）",
        titleId: "Bacaan Pendek, Pengumuman & Memo",
        count: 3,
        rangeLabel: "No. 27–29",
        startIndex: 26,
        badge: "短文読解"
      },
      {
        mondai: 5,
        titleJa: "もんだい 5：内容理解（中文）",
        titleId: "Karangan Chin Shun「まちがえました」",
        count: 2,
        rangeLabel: "No. 30–31",
        startIndex: 29,
        badge: "中文読解"
      },
      {
        mondai: 6,
        titleJa: "もんだい 6：情報検索",
        titleId: "Tabel 4 Rute Menuju Universitas Takagi",
        count: 1,
        rangeLabel: "No. 32",
        startIndex: 31,
        badge: "ルート表"
      }
    ],
    listening: [
      {
        mondai: 1,
        titleJa: "もんだい 1：課題理解",
        titleId: "Pemahaman Tugas + Ilustrasi Peta & Denah",
        count: 7,
        rangeLabel: "1番–7番",
        startIndex: 0,
        badge: "イラスト付"
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：ポイント理解",
        titleId: "Pemahaman Poin Kunci Percakapan",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 7,
        badge: "会話聴解"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：発話表現",
        titleId: "Ungkapan Situasional Tanda Panah (➡)",
        count: 5,
        rangeLabel: "1番–5番",
        startIndex: 13,
        badge: "3選択肢"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：即時応答",
        titleId: "Respons Cepat Tanpa Ilustrasi",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 18,
        badge: "3選択肢"
      }
    ]
  },
  N4: {
    vocab: [
      {
        mondai: 1,
        titleJa: "もんだい 1：漢字の読み",
        titleId: "Bacaan Kanji N4 dalam Hiragana",
        count: 9,
        rangeLabel: "No. 1–9",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：表記",
        titleId: "Penulisan Kanji N4",
        count: 6,
        rangeLabel: "No. 10–15",
        startIndex: 9
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文脈規定",
        titleId: "Kosakata Kontekstual Kalimat",
        count: 10,
        rangeLabel: "No. 16–25",
        startIndex: 15
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：言い換え類義",
        titleId: "Sinonim & Parafrasa Kalimat",
        count: 5,
        rangeLabel: "No. 26–30",
        startIndex: 25
      },
      {
        mondai: 5,
        titleJa: "もんだい 5：用法",
        titleId: "Penggunaan Kata yang Tepat dalam Kalimat",
        count: 5,
        rangeLabel: "No. 31–35",
        startIndex: 30,
        badge: "用法"
      }
    ],
    grammar_reading: [
      {
        mondai: 1,
        titleJa: "もんだい 1：文法形式の判断",
        titleId: "Tata Bahasa, Partikel, Pasif & Kausatif N4",
        count: 15,
        rangeLabel: "No. 1–15",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：★ 並べ替え",
        titleId: "Menyusun Kalimat Bintang ★ N4",
        count: 5,
        rangeLabel: "No. 16–20",
        startIndex: 15,
        badge: "★ 並べ替え"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文章の文法",
        titleId: "Wacana Karangan Chin Meiki「水泳」",
        count: 5,
        rangeLabel: "No. 21–25",
        startIndex: 20,
        badge: "文章文法"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：内容理解（短文）",
        titleId: "4 Bacaan Pendek (忘れ物・アイス・みそ工場・黒い消しゴム)",
        count: 4,
        rangeLabel: "No. 26–29",
        startIndex: 25,
        badge: "短文4題"
      },
      {
        mondai: 5,
        titleJa: "もんだい 5：内容理解（中文）",
        titleId: "Karangan Katy Wan「東京駅で会った人」",
        count: 4,
        rangeLabel: "No. 30–33",
        startIndex: 29,
        badge: "中文読解"
      },
      {
        mondai: 6,
        titleJa: "もんだい 6：情報検索",
        titleId: "Jadwal Acara 青野市ニュース「春を楽しもう」",
        count: 2,
        rangeLabel: "No. 34–35",
        startIndex: 33,
        badge: "予定表検索"
      }
    ],
    listening: [
      {
        mondai: 1,
        titleJa: "もんだい 1：課題理解",
        titleId: "Pemahaman Tugas & Instruksi Praktis",
        count: 8,
        rangeLabel: "1ばん–8ばん",
        startIndex: 0,
        badge: "課題理解"
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：ポイント理解",
        titleId: "Pemahaman Poin Kunci & Alasan",
        count: 7,
        rangeLabel: "1ばん–7ばん",
        startIndex: 8,
        badge: "ポイント"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：発話表現",
        titleId: "Ungkapan Situasional Tanda Panah (➡)",
        count: 5,
        rangeLabel: "1ばん–5ばん",
        startIndex: 15,
        badge: "3選択肢"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：即時応答",
        titleId: "Respons Cepat Percakapan Sehari-hari",
        count: 8,
        rangeLabel: "1ばん–8ばん",
        startIndex: 20,
        badge: "3選択肢"
      }
    ]
  },
  N3: {
    vocab: [
      {
        mondai: 1,
        titleJa: "問題 1：漢字の読み",
        titleId: "Bacaan Kanji N3 dalam Hiragana",
        count: 8,
        rangeLabel: "No. 1–8",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "問題 2：表記",
        titleId: "Penulisan Kanji N3",
        count: 6,
        rangeLabel: "No. 9–14",
        startIndex: 8
      },
      {
        mondai: 3,
        titleJa: "問題 3：文脈規定",
        titleId: "Kosakata Kontekstual Kalimat",
        count: 11,
        rangeLabel: "No. 15–25",
        startIndex: 14
      },
      {
        mondai: 4,
        titleJa: "問題 4：言い換え類義",
        titleId: "Sinonim & Parafrasa Kalimat",
        count: 5,
        rangeLabel: "No. 26–30",
        startIndex: 25
      },
      {
        mondai: 5,
        titleJa: "問題 5：用法",
        titleId: "Penggunaan Kata yang Tepat dalam Kalimat",
        count: 5,
        rangeLabel: "No. 31–35",
        startIndex: 30,
        badge: "用法"
      }
    ],
    grammar_reading: [
      {
        mondai: 1,
        titleJa: "問題 1：文法形式の判断",
        titleId: "Tata Bahasa, Ungkapan Formal & Ekspresi N3",
        count: 13,
        rangeLabel: "No. 1–13",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "問題 2：★ 並べ替え",
        titleId: "Menyusun Kalimat Bintang ★ N3",
        count: 5,
        rangeLabel: "No. 14–18",
        startIndex: 13,
        badge: "★ 並べ替え"
      },
      {
        mondai: 3,
        titleJa: "問題 3：文章の文法",
        titleId: "Karangan Nguyen Thi Lan「京都旅行」",
        count: 4,
        rangeLabel: "No. 19–22",
        startIndex: 18,
        badge: "文章文法"
      },
      {
        mondai: 4,
        titleJa: "問題 4：内容理解（短文）",
        titleId: "4 Bacaan Pendek (営業課コピー機・ボール投げ・財布専門店メール・古い靴割引券)",
        count: 4,
        rangeLabel: "No. 23–26",
        startIndex: 22,
        badge: "短文4題"
      },
      {
        mondai: 5,
        titleJa: "問題 5：内容理解（中文）",
        titleId: "2 Wacana Menengah (父の古いラジオ & 田舎で農業を始める・説明会)",
        count: 6,
        rangeLabel: "No. 27–32",
        startIndex: 26,
        badge: "中文2題"
      },
      {
        mondai: 6,
        titleJa: "問題 6：内容理解（長文）",
        titleId: "Wacana Panjang「眠りと体の中心の温度」",
        count: 4,
        rangeLabel: "No. 33–36",
        startIndex: 32,
        badge: "長文読解"
      },
      {
        mondai: 7,
        titleJa: "問題 7：情報検索",
        titleId: "Brosur「秋の日帰りバス旅行のご案内」& Aturan キャンセル料",
        count: 2,
        rangeLabel: "No. 37–38",
        startIndex: 36,
        badge: "情報検索"
      }
    ],
    listening: [
      {
        mondai: 1,
        titleJa: "問題 1：課題理解",
        titleId: "Pemahaman Tugas & Tindakan Selanjutnya",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 0,
        badge: "課題理解"
      },
      {
        mondai: 2,
        titleJa: "問題 2：ポイント理解",
        titleId: "Pemahaman Poin Kunci & Alasan",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 6,
        badge: "ポイント"
      },
      {
        mondai: 3,
        titleJa: "問題 3：概要理解",
        titleId: "Pemahaman Garis Besar & Tema Pembicaraan",
        count: 3,
        rangeLabel: "1番–3番",
        startIndex: 12,
        badge: "概要理解"
      },
      {
        mondai: 4,
        titleJa: "問題 4：発話表現",
        titleId: "Ungkapan Situasional Tanda Panah (➡)",
        count: 4,
        rangeLabel: "1番–4番",
        startIndex: 15,
        badge: "3選択肢"
      },
      {
        mondai: 5,
        titleJa: "問題 5：即時応答",
        titleId: "Respons Cepat Percakapan Sehari-hari",
        count: 9,
        rangeLabel: "1番–9番",
        startIndex: 19,
        badge: "3選択肢"
      }
    ]
  },
  N2: {
    vocab: [
      {
        mondai: 1,
        titleJa: "問題 1：漢字の読み",
        titleId: "Bacaan Kanji N2 dalam Hiragana",
        count: 5,
        rangeLabel: "No. 1–5",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "問題 2：表記",
        titleId: "Penulisan Kanji N2",
        count: 5,
        rangeLabel: "No. 6–10",
        startIndex: 5
      },
      {
        mondai: 3,
        titleJa: "問題 3：語形成",
        titleId: "Pembentukan Kata Majemuk & Prefiks/Sufiks",
        count: 5,
        rangeLabel: "No. 11–15",
        startIndex: 10,
        badge: "語形成"
      },
      {
        mondai: 4,
        titleJa: "問題 4：文脈規定",
        titleId: "Kosakata Kontekstual Kalimat N2",
        count: 7,
        rangeLabel: "No. 16–22",
        startIndex: 15
      },
      {
        mondai: 5,
        titleJa: "問題 5：言い換え類義",
        titleId: "Sinonim & Parafrasa Kalimat N2",
        count: 5,
        rangeLabel: "No. 23–27",
        startIndex: 22
      },
      {
        mondai: 6,
        titleJa: "問題 6：用法",
        titleId: "Penggunaan Kata yang Tepat dalam Kalimat",
        count: 5,
        rangeLabel: "No. 28–32",
        startIndex: 27,
        badge: "用法"
      }
    ],
    grammar_reading: [
      {
        mondai: 7,
        titleJa: "問題 7：文法形式の判断",
        titleId: "Tata Bahasa, Keigo & Ungkapan Kalimat N2",
        count: 12,
        rangeLabel: "No. 33–44",
        startIndex: 0
      },
      {
        mondai: 8,
        titleJa: "問題 8：★ 並べ替え",
        titleId: "Menyusun Kalimat Bintang ★ N2",
        count: 5,
        rangeLabel: "No. 45–49",
        startIndex: 12,
        badge: "★ 並べ替え"
      },
      {
        mondai: 9,
        titleJa: "問題 9：文章の文法",
        titleId: "Kolom Majalah「日本発のトイレマーク」",
        count: 5,
        rangeLabel: "No. 50–54",
        startIndex: 17,
        badge: "文章文法"
      },
      {
        mondai: 10,
        titleJa: "問題 10：内容理解（短文）",
        titleId: "5 Bacaan Pendek (ルール・暖房文書・目の前の目標・野田コーヒー・日記)",
        count: 5,
        rangeLabel: "No. 55–59",
        startIndex: 22,
        badge: "短文5題"
      },
      {
        mondai: 11,
        titleJa: "問題 11：内容理解（中文）",
        titleId: "3 Wacana Menengah (個性とは何か・話し言葉と書き言葉・目的重視の旅)",
        count: 9,
        rangeLabel: "No. 60–68",
        startIndex: 27,
        badge: "中文3題"
      },
      {
        mondai: 12,
        titleJa: "問題 12：統合理解（A・B）",
        titleId: "Perbandingan 2 Teks「公立の図書館で人気の高い本を複数冊置くこと」",
        count: 2,
        rangeLabel: "No. 69–70",
        startIndex: 36,
        badge: "統合理解A/B"
      },
      {
        mondai: 13,
        titleJa: "問題 13：主張理解（長文）",
        titleId: "Esai Desainer「感動の森とアイディア」",
        count: 3,
        rangeLabel: "No. 71–73",
        startIndex: 38,
        badge: "長文読解"
      },
      {
        mondai: 14,
        titleJa: "問題 14：情報検索",
        titleId: "Panduan「ミハマホテル ビュッフェのご案内」（ベルン＆みよし）",
        count: 2,
        rangeLabel: "No. 74–75",
        startIndex: 41,
        badge: "情報検索"
      }
    ],
    listening: [
      {
        mondai: 1,
        titleJa: "問題 1：課題理解",
        titleId: "Pemahaman Tugas & Tindakan Selanjutnya",
        count: 5,
        rangeLabel: "1番–5番",
        startIndex: 0,
        badge: "課題理解"
      },
      {
        mondai: 2,
        titleJa: "問題 2：ポイント理解",
        titleId: "Pemahaman Poin Kunci & Alasan",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 5,
        badge: "ポイント"
      },
      {
        mondai: 3,
        titleJa: "問題 3：概要理解",
        titleId: "Pemahaman Garis Besar & Maksud Pembicara",
        count: 5,
        rangeLabel: "1番–5番",
        startIndex: 11,
        badge: "概要理解"
      },
      {
        mondai: 4,
        titleJa: "問題 4：即時応答",
        titleId: "Respons Cepat Percakapan N2",
        count: 11,
        rangeLabel: "1番–11番",
        startIndex: 16,
        badge: "3選択肢"
      },
      {
        mondai: 5,
        titleJa: "問題 5：統合理解",
        titleId: "Diskusi Panjang & 3番（北中・大川・上田・山下通り）質問1・質問2",
        count: 4,
        rangeLabel: "1番–3番(質問1・2)",
        startIndex: 27,
        badge: "統合理解"
      }
    ]
  },
  N1: {
    vocab: [
      {
        mondai: 1,
        titleJa: "問題 1：漢字の読み",
        titleId: "Bacaan Kanji N1 dalam Hiragana",
        count: 6,
        rangeLabel: "No. 1–6",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "問題 2：文脈規定",
        titleId: "Kosakata Kontekstual Kalimat N1",
        count: 7,
        rangeLabel: "No. 7–13",
        startIndex: 6
      },
      {
        mondai: 3,
        titleJa: "問題 3：言い換え類義",
        titleId: "Sinonim & Parafrasa Kalimat N1",
        count: 6,
        rangeLabel: "No. 14–19",
        startIndex: 13
      },
      {
        mondai: 4,
        titleJa: "問題 4：用法",
        titleId: "Penggunaan Kata yang Tepat dalam Kalimat",
        count: 6,
        rangeLabel: "No. 20–25",
        startIndex: 19,
        badge: "用法"
      }
    ],
    grammar_reading: [
      {
        mondai: 5,
        titleJa: "問題 5：文法形式の判断",
        titleId: "Tata Bahasa, Keigo & Ekspresi Kalimat N1",
        count: 10,
        rangeLabel: "No. 26–35",
        startIndex: 0
      },
      {
        mondai: 6,
        titleJa: "問題 6：★ 並べ替え",
        titleId: "Menyusun Kalimat Bintang ★ N1",
        count: 5,
        rangeLabel: "No. 36–40",
        startIndex: 10,
        badge: "★ 並べ替え"
      },
      {
        mondai: 7,
        titleJa: "問題 7：文章の文法",
        titleId: "Esai Sastra「一生の仕事」",
        count: 4,
        rangeLabel: "No. 41–44",
        startIndex: 15,
        badge: "文章文法"
      },
      {
        mondai: 8,
        titleJa: "問題 8：内容理解（短文）",
        titleId: "4 Bacaan Pendek (情報化社会・書くことと批判・広告の本質・対話と思考)",
        count: 4,
        rangeLabel: "No. 45–48",
        startIndex: 19,
        badge: "短文4題"
      },
      {
        mondai: 9,
        titleJa: "問題 9：内容理解（中文）",
        titleId: "4 Wacana Menengah (常識を疑う学問・カタクリとアリ・こどもの模倣・UDと平等)",
        count: 8,
        rangeLabel: "No. 49–56",
        startIndex: 23,
        badge: "中文4題"
      },
      {
        mondai: 10,
        titleJa: "問題 10：内容理解（長文）",
        titleId: "Wacana Panjang「ロボピーと『心とは観察する側の問題である』」",
        count: 3,
        rangeLabel: "No. 57–59",
        startIndex: 31,
        badge: "長文読解"
      },
      {
        mondai: 11,
        titleJa: "問題 11：統合理解（A・B）",
        titleId: "Perbandingan 2 Opini「メモを取ることと話の聞き方」",
        count: 2,
        rangeLabel: "No. 60–61",
        startIndex: 34,
        badge: "統合理解A/B"
      },
      {
        mondai: 12,
        titleJa: "問題 12：主張理解（長文）",
        titleId: "Esai Kritis「教育の不確定性と過剰な期待への警報」",
        count: 3,
        rangeLabel: "No. 62–64",
        startIndex: 36,
        badge: "主張長文"
      },
      {
        mondai: 13,
        titleJa: "問題 13：情報検索",
        titleId: "Brosur「木原市健康づくりセンター いきいき運動教室のご案内」",
        count: 2,
        rangeLabel: "No. 65–66",
        startIndex: 39,
        badge: "情報検索"
      }
    ],
    listening: [
      {
        mondai: 1,
        titleJa: "問題 1：課題理解",
        titleId: "Pemahaman Tugas & Tindakan Selanjutnya",
        count: 5,
        rangeLabel: "1番–5番",
        startIndex: 0,
        badge: "課題理解"
      },
      {
        mondai: 2,
        titleJa: "問題 2：ポイント理解",
        titleId: "Pemahaman Poin Kunci & Alasan",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 5,
        badge: "ポイント"
      },
      {
        mondai: 3,
        titleJa: "問題 3：概要理解",
        titleId: "Pemahaman Garis Besar & Maksud Pembicara",
        count: 5,
        rangeLabel: "1番–5番",
        startIndex: 11,
        badge: "概要理解"
      },
      {
        mondai: 4,
        titleJa: "問題 4：即時応答",
        titleId: "Respons Cepat Percakapan N1",
        count: 11,
        rangeLabel: "1番–11番",
        startIndex: 16,
        badge: "3選択肢"
      },
      {
        mondai: 5,
        titleJa: "問題 5：統合理解",
        titleId: "Diskusi Panjang & 2番（島田・森山・ミナミ・北川書店）質問1・質問2",
        count: 3,
        rangeLabel: "1番–2番(質問1・2)",
        startIndex: 27,
        badge: "統合理解"
      }
    ]
  }
};

export default function ExamPage({ notify }: ExamPageProps) {
  // Level ujian resmi aktif (N5, N4, N3, N2, atau N1)
  const [activeExamLevel, setActiveExamLevel] = useState<"N5" | "N4" | "N3" | "N2" | "N1">("N5");

  // Status Modal
  const [audioModalOpen, setAudioModalOpen] = useState<boolean>(false);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [loadingSection, setLoadingSection] = useState<boolean>(false);

  // Status Sesi Ujian Aktif & Review
  const [activeSession, setActiveSession] = useState<{
    test: MockTest;
    section: MockSection;
    questions: QuestionItem[];
    initialQuestionIndex?: number;
  } | null>(null);

  const [activeReview, setActiveReview] = useState<{
    test: MockTest;
    section: MockSection;
    result: SectionSessionResult;
  } | null>(null);

  // Riwayat Sesi Tersimpan (di-cache di localStorage)
  const [sessions, setSessions] = useState<Record<string, SectionSessionResult>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Simpan riwayat sesi ke localStorage saat berubah
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (err) {
      console.warn("Gagal menyimpan sesi ujian ke localStorage:", err);
    }
  }, [sessions]);

  // Ujian Resmi 2018年 N5 (91 Soal), 2018年 N4 (98 Soal), 2022年12月 N3 (101 Soal), 2016年12月 N2 (106 Soal) & 2023年7月 N1 (96 Soal)
  const official2018N5Test = useMemo(() => generateOfficial2018N5MockTest(), []);
  const official2018N4Test = useMemo(() => generateOfficial2018N4MockTest(), []);
  const official2022N3Test = useMemo(() => generateOfficial2022N3MockTest(), []);
  const official2016N2Test = useMemo(() => generateOfficial2016N2MockTest(), []);
  const official2023N1Test = useMemo(() => generateOfficial2023N1MockTest(), []);

  const currentExamTest =
    activeExamLevel === "N1"
      ? official2023N1Test
      : activeExamLevel === "N2"
      ? official2016N2Test
      : activeExamLevel === "N3"
      ? official2022N3Test
      : activeExamLevel === "N4"
      ? official2018N4Test
      : official2018N5Test;

  // Handler Memulai Seksi (atau langsung melompat ke Mondai tertentu)
  const handleStartSection = async (
    test: MockTest,
    section: MockSection,
    initialQuestionIndex: number = 0
  ) => {
    if (loadingSection) return;
    setLoadingSection(true);
    try {
      const questions = await loadQuestionsForTestAndSection(test, section);

      if (questions.length === 0) {
        notify?.("error", "Tidak ada soal yang tersedia untuk bagian ini.");
        return;
      }

      setSelectedTest(null);
      setActiveReview(null);
      setActiveSession({
        test,
        section,
        questions,
        initialQuestionIndex
      });
    } catch {
      notify?.("error", "Gagal memuat bank soal. Periksa koneksi Anda lalu coba lagi.");
    } finally {
      setLoadingSection(false);
    }
  };

  // Handler Tinjau Seksi yang Selesai
  const handleReviewSection = (test: MockTest, section: MockSection) => {
    const sessionKey = `${test.id}_${section.id}`;
    const result = sessions[sessionKey];
    if (!result) return;

    setSelectedTest(null);
    setActiveSession(null);
    setActiveReview({
      test,
      section,
      result
    });
  };

  // Handler Ulangi Seksi
  const handleRetakeSection = (test: MockTest, section: MockSection) => {
    const sessionKey = `${test.id}_${section.id}`;
    setSessions((prev) => {
      const next = { ...prev };
      delete next[sessionKey];
      return next;
    });

    void handleStartSection(test, section, 0);
  };

  // Handler Reset Skor untuk Level Aktif
  const handleResetCurrentTestSessions = () => {
    setSessions((prev) => {
      const next = { ...prev };
      currentExamTest.mock_sections.forEach((sec) => {
        delete next[`${currentExamTest.id}_${sec.id}`];
      });
      return next;
    });
    notify?.("info", `Riwayat skor ujian ${activeExamLevel} telah direset.`);
  };

  // Handler Pengiriman Sesi Jawaban
  const handleSubmitSession = (result: SectionSessionResult) => {
    const sessionKey = `${result.mockTestId}_${result.sectionId}`;
    setSessions((prev) => ({
      ...prev,
      [sessionKey]: result
    }));

    notify?.(
      "success",
      `Bagian selesai! Skor Anda: ${result.correctCount}/${result.totalQuestions} (${result.percentageScore}%)`
    );

    if (activeSession) {
      setActiveReview({
        test: activeSession.test,
        section: activeSession.section,
        result
      });
      setActiveSession(null);
    }
  };

  // Hitung ringkasan skor skala resmi 0-180 untuk ujian yang sedang aktif (N5 atau N4)
  const currentExamSummary = useMemo(() => {
    const sec0 = currentExamTest.mock_sections[0];
    const sec1 = currentExamTest.mock_sections[1];
    const sec2 = currentExamTest.mock_sections[2];

    const sVocab = sessions[`${currentExamTest.id}_${sec0.id}`];
    const sGr = sessions[`${currentExamTest.id}_${sec1.id}`];
    const sListen = sessions[`${currentExamTest.id}_${sec2.id}`];

    const vocabCorrect = sVocab?.correctCount ?? 0;
    const grCorrect = sGr?.correctCount ?? 0;
    const listenCorrect = sListen?.correctCount ?? 0;
    const completedCount = [sVocab, sGr, sListen].filter(Boolean).length;
    const hasTakenAny = completedCount > 0;
    const rawCorrect = vocabCorrect + grCorrect + listenCorrect;

    const scaled = calculateOfficialJLPTScore(
      vocabCorrect,
      sec0.mock_questions_count,
      grCorrect,
      sec1.mock_questions_count,
      listenCorrect,
      sec2.mock_questions_count,
      currentExamTest.levelLabel
    );

    return {
      hasTakenAny,
      completedCount,
      rawCorrect,
      vocabCorrect,
      vocabTotal: sec0.mock_questions_count,
      grCorrect,
      grTotal: sec1.mock_questions_count,
      listenCorrect,
      listenTotal: sec2.mock_questions_count,
      scaled
    };
  }, [sessions, currentExamTest]);

  // Jika sedang berada di sesi ujian aktif
  if (activeSession) {
    return (
      <Suspense
        fallback={
          <div className="py-16 text-center text-sm text-[var(--tinta-2)]" role="status">
            Memuat sesi ujian…
          </div>
        }
      >
        <TestSessionRunner
          test={activeSession.test}
          section={activeSession.section}
          questions={activeSession.questions}
          initialQuestionIndex={activeSession.initialQuestionIndex}
          onExit={() => setActiveSession(null)}
          onSubmit={handleSubmitSession}
        />
      </Suspense>
    );
  }

  // Jika sedang berada di mode review jawaban
  if (activeReview) {
    return (
      <Suspense
        fallback={
          <div className="py-16 text-center text-sm text-[var(--tinta-2)]" role="status">
            Memuat pembahasan…
          </div>
        }
      >
        <TestReviewView
          test={activeReview.test}
          section={activeReview.section}
          result={activeReview.result}
          onBackToOverview={() => setActiveReview(null)}
          onRetake={() => handleRetakeSection(activeReview.test, activeReview.section)}
        />
      </Suspense>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-[var(--tinta)]">
      {/* 1. Header Utama Ujian JLPT Format Baru */}
      <header className="rounded-2xl border border-[var(--garis)] bg-[var(--panel)] p-6 sm:p-7 shadow-[0_4px_24px_rgba(16,33,58,0.04)] relative overflow-hidden">
        <span
          className="absolute right-5 -bottom-3 [font-family:var(--font-serif)] text-[116px] font-bold text-[var(--ai)] pointer-events-none select-none leading-none opacity-[0.07]"
          aria-hidden="true"
        >
          験
        </span>

        <div className="relative z-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--kon)] text-white">
                {`模擬試験 • 日本語能力試験 ${currentExamTest.levelLabel} (Seri ${
                  currentExamTest.officialYear || "2018"
                })`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--mizu-soft)] text-[var(--ai)]">
                {`全${currentExamTest.totalQuestions}問 • ${currentExamTest.totalDurationMinutes}分 • 180点満点`}
              </span>
              <span className="text-xs text-[var(--tinta-2)]">
                Format Latihan Standar (文字・語彙 / 文法・読解 / 聴解)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--tinta)] [font-family:var(--font-serif)]">
              Simulasi Ujian Bahasa Jepang (JLPT)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--tinta-2)]">
              {currentExamTest.subtitle}
            </p>
            <p className="text-[11px] text-[var(--tinta-2)] pt-1">
              Materi simulasi orisinal berbasis data terbuka — bukan soal resmi The Japan Foundation / JEES.{" "}
              <Link
                to="/license"
                className="inline-flex items-center min-h-[28px] py-0.5 font-semibold text-[var(--ai)] hover:underline"
              >
                Lihat lisensi &amp; atribusi →
              </Link>
            </p>
          </div>

          {/* Tombol Header: Cek Audio & Lembar Ringkasan */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAudioModalOpen(true)}
              className="px-3.5 py-2 min-h-[40px] text-xs font-semibold rounded-xl border border-[var(--garis)] bg-[var(--panel)] hover:border-[var(--ai)] hover:text-[var(--ai)] text-[var(--tinta)] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Icon name="volume" size={16} />
              <span>Cek Audio</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTest(currentExamTest)}
              className="px-4 py-2 min-h-[40px] text-xs font-bold rounded-xl bg-[var(--kon)] hover:bg-[var(--ai-tua)] text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Icon name="book" size={16} />
              <span>Lembar Skor & Detail</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Pemilih Level Simulasi JLPT (N5, N4, N3, N2 & N1 模擬テスト) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            lvl: "N5" as const,
            test: official2018N5Test,
            yearLabel: "Simulasi Standar • Seri 2018",
            desc: "35 文字・語彙 • 32 文法・読解（高木大学ルート表） • 24 聴解"
          },
          {
            lvl: "N4" as const,
            test: official2018N4Test,
            yearLabel: "Simulasi Standar • Seri 2018",
            desc: "35 文字・語彙（用法付） • 35 文法・読解（水泳・東京駅・青野市予定表） • 28 聴解"
          },
          {
            lvl: "N3" as const,
            test: official2022N3Test,
            yearLabel: "Simulasi Standar • Seri 2022",
            desc: "35 文字・語彙 • 38 文法・読解（京都旅行・古いラジオ・眠りと体温・バス旅行） • 28 聴解"
          },
          {
            lvl: "N2" as const,
            test: official2016N2Test,
            yearLabel: "Simulasi Standar • Seri 2016",
            desc: "32 文字・語彙（語形成・用法付） • 43 文法・読解（トイレマーク・公立図書館A/B・ミハマホテル） • 31 聴解"
          },
          {
            lvl: "N1" as const,
            test: official2023N1Test,
            yearLabel: "Simulasi Standar • Seri 2023",
            desc: "25 文字・語彙（用法付） • 41 文法・読解（一生の仕事・ロボピーと心・メモA/B・教育論・木原市運動教室） • 30 聴解"
          }
        ].map(({ lvl, test, yearLabel, desc }) => {
          const isSelected = activeExamLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setActiveExamLevel(lvl)}
              className={`p-5 rounded-2xl border-2 text-left transition-colors flex items-center justify-between gap-4 ${
                isSelected
                  ? "bg-[var(--kon)] text-white border-[var(--kon)] shadow-[0_8px_24px_rgba(16,33,58,0.2)]"
                  : "bg-[var(--panel)] text-[var(--tinta)] border-[var(--garis)] hover:border-[var(--ai)]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      isSelected
                        ? "bg-white text-[var(--kon)]"
                        : "bg-[var(--kon)] text-white"
                    }`}
                  >
                    {`JLPT ${lvl}`}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? "text-[var(--mizu)]" : "text-[var(--ai)]"
                    }`}
                  >
                    {`${yearLabel} • 全${test.totalQuestions}問 (${test.totalDurationMinutes}分)`}
                  </span>
                </div>
                <div className="font-bold text-base [font-family:var(--font-serif)]">
                  {test.title}
                </div>
                <p
                  className={`text-xs ${
                    isSelected ? "text-[#DCE6F2]/90" : "text-[var(--tinta-2)]"
                  }`}
                >
                  {desc}
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "border-white bg-white/20" : "border-[var(--garis)]"
                }`}
              >
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Papan Skor Skala Resmi 0–180 & Standar Kelulusan */}
      <section className="rounded-2xl border border-[var(--garis)] bg-[var(--panel)] p-6 shadow-[0_4px_20px_rgba(16,33,58,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--garis)] pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ai)]">
              得点範囲・合格基準（Simulasi Skala Nilai JLPT {currentExamTest.levelLabel}）
            </span>
            <h2 className="text-lg font-bold text-[var(--tinta)] [font-family:var(--font-serif)] mt-0.5">
              Simulasi Nilai Skala 0〜180 &amp; Ambang Batas Seksi (基準点)
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {currentExamSummary.hasTakenAny && (
              <button
                type="button"
                onClick={handleResetCurrentTestSessions}
                className="px-3 py-1.5 min-h-[36px] rounded-lg border border-[var(--garis)] bg-[var(--panel)] text-xs font-medium text-[var(--tinta-2)] hover:border-[var(--kon)] hover:text-[var(--kon)] transition-colors"
              >
                Reset Skor
              </button>
            )}
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-bold ${
                !currentExamSummary.hasTakenAny
                  ? "bg-[var(--tsuki)] text-[var(--tinta-2)] border border-[var(--garis)]"
                  : currentExamSummary.scaled.overallPassed
                  ? "bg-[rgba(42,111,91,0.12)] text-[var(--ok)]"
                  : "bg-[var(--kertas-2)] text-[var(--kon)] border border-[var(--garis)]"
              }`}
            >
              {!currentExamSummary.hasTakenAny
                ? "未受験 • Siap Mulai Ujian"
                : currentExamSummary.scaled.overallPassed
                ? "合格圏内 • Mencapai Target Simulasi"
                : `不合格圏 • Perlu Mencapai ${currentExamSummary.scaled.passThresholdTotal}点 & 基準点`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kategori 1: Bahasa & Membaca (0-120) */}
          <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--tinta)] [font-family:var(--font-serif)]">
                言語知識（文字・語彙・文法）・読解
              </span>
              <span className="px-2 py-0.5 rounded bg-[var(--mizu-soft)] text-[var(--kon)] text-[10px] font-bold">
                基準点: 38点
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[var(--tinta)] [font-family:var(--font-serif)]">
              {currentExamSummary.hasTakenAny
                ? `${currentExamSummary.scaled.langReadingScaled} / 120点`
                : "ー / 120点"}
            </div>
            <p className="text-[11px] text-[var(--tinta-2)]">
              Gabungan Bagian 1 ({currentExamSummary.vocabTotal} soal) + Bagian 2 ({currentExamSummary.grTotal} soal) ={" "}
              <strong>
                {currentExamSummary.vocabCorrect + currentExamSummary.grCorrect} /{" "}
                {currentExamSummary.vocabTotal + currentExamSummary.grTotal}
              </strong>{" "}
              benar
            </p>
          </div>

          {/* Kategori 2: Mendengarkan (0-60) */}
          <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--tinta)] [font-family:var(--font-serif)]">
                聴解（リスニング）
              </span>
              <span className="px-2 py-0.5 rounded bg-[var(--mizu-soft)] text-[var(--kon)] text-[10px] font-bold">
                基準点: 19点
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[var(--tinta)] [font-family:var(--font-serif)]">
              {currentExamSummary.hasTakenAny
                ? `${currentExamSummary.scaled.listeningScaled} / 60点`
                : "ー / 60点"}
            </div>
            <p className="text-[11px] text-[var(--tinta-2)]">
              Bagian 3 Mendengarkan ({currentExamSummary.listenTotal} soal) ={" "}
              <strong>
                {currentExamSummary.listenCorrect} / {currentExamSummary.listenTotal}
              </strong>{" "}
              benar
            </p>
          </div>

          {/* Kategori 3: Skor Total (0-180) */}
          <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--ai)] shadow-[0_2px_10px_rgba(18,40,74,0.06)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--kon)] [font-family:var(--font-serif)]">
                総合得点（Total Nilai Skala）
              </span>
              <span className="px-2 py-0.5 rounded bg-[var(--mizu-soft)] text-[var(--ai)] text-[10px] font-bold">
                {`合格点: ${currentExamSummary.scaled.passThresholdTotal}点`}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[var(--kon)] [font-family:var(--font-serif)]">
              {currentExamSummary.hasTakenAny
                ? `${currentExamSummary.scaled.totalScaled} / 180点`
                : "ー / 180点"}
            </div>
            <p className="text-[11px] text-[var(--tinta-2)]">
              Total jawaban benar:{" "}
              <strong>
                {currentExamSummary.rawCorrect} / {currentExamTest.totalQuestions} soal
              </strong>{" "}
              ({currentExamSummary.completedCount}/3 bagian selesai)
            </p>
          </div>
        </div>
      </section>

      {/* 4. Ketiga Buku Soal Ujian (問題冊子 1〜3) beserta Daftar Mondai Interaktif */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--tinta)] [font-family:var(--font-serif)]">
              Bagian Ujian &amp; Rincian Mondai {currentExamTest.levelLabel} (全3部 • {currentExamTest.totalQuestions}問)
            </h2>
            <p className="text-xs text-[var(--tinta-2)]">
              Pilih <strong>Mulai Bagian</strong> untuk simulasi penuh per seksi, atau klik salah satu baris <strong>もんだい</strong> untuk langsung berlatih pada nomor soal tersebut.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {currentExamTest.mock_sections.map((sec, idx) => {
            const sessionKey = `${currentExamTest.id}_${sec.id}`;
            const sess = sessions[sessionKey];
            const mondaiList =
              SECTION_MONDAI_BREAKDOWN_BY_LEVEL[activeExamLevel][sec.category] || [];

            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-[var(--garis)] bg-[var(--panel)] overflow-hidden shadow-[0_6px_22px_rgba(16,33,58,0.04)] flex flex-col justify-between"
              >
                {/* Header Bagian */}
                <div className="p-5 bg-[var(--tsuki)] border-b border-[var(--garis)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--kon)] text-white">
                      第{idx + 1}部 • {sec.duration_minutes}分
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--mizu-soft)] text-[var(--ai)]">
                      {sec.mock_questions_count} Pertanyaan
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--tinta)] [font-family:var(--font-serif)]">
                    {sec.titleJa}
                  </h3>
                  <p className="text-xs font-medium text-[var(--tinta-2)]">{sec.titleId}</p>
                </div>

                {/* Daftar Mondai di dalam Bagian */}
                <div className="p-5 space-y-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ai)]">
                    Daftar Mondai ({mondaiList.length} Kategori)
                  </div>

                  <ul className="space-y-2">
                    {mondaiList.map((m) => (
                      <li key={m.mondai}>
                        <button
                          type="button"
                          onClick={() =>
                            handleStartSection(currentExamTest, sec, m.startIndex)
                          }
                          className="w-full p-3 rounded-xl bg-[var(--tsuki)] hover:bg-[var(--mizu-soft)] border border-[var(--garis)] hover:border-[var(--ai)] text-left transition-all group"
                          title={`Mulai dari ${m.titleJa} (${m.rangeLabel})`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-[var(--tinta)] [font-family:var(--font-serif)] group-hover:text-[var(--ai)]">
                              {m.titleJa}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--panel)] border border-[var(--garis)] text-[var(--tinta-2)] whitespace-nowrap tabular-nums shrink-0">
                              {m.count}問 ({m.rangeLabel})
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[11px] text-[var(--tinta-2)]">
                              {m.titleId}
                            </span>
                            {m.badge && (
                              <span className="text-[10px] font-bold text-[var(--ai)] whitespace-nowrap shrink-0">
                                {m.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Status Skor & Tombol Aksi */}
                <div className="p-5 pt-3 border-t border-[var(--garis)] bg-[var(--tsuki)] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--tinta-2)]">Status Pengerjaan:</span>
                    <span className="font-bold text-[var(--tinta)]">
                      {sess
                        ? `${sess.correctCount} / ${sec.mock_questions_count} Benar (${sess.percentageScore}%)`
                        : `ー / ${sec.mock_questions_count} Soal`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {sess && (
                      <button
                        type="button"
                        onClick={() => handleReviewSection(currentExamTest, sec)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[var(--kon)] hover:bg-[var(--ai-tua)] text-white transition-colors text-center"
                      >
                        Lihat Pembahasan
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={loadingSection}
                      onClick={() => void handleStartSection(currentExamTest, sec, 0)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[var(--kon)] hover:bg-[var(--ai-tua)] text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <Icon name="play" size={14} />
                      <span>
                        {loadingSection
                          ? "Memuat soal…"
                          : sess
                          ? `Ulangi Bagian ${idx + 1}`
                          : `Mulai Bagian ${idx + 1}`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Dialog Detail & Lembar Skor */}
      {selectedTest && (
        <Suspense fallback={null}>
          <TestDetailsModal
            isOpen={!!selectedTest}
            test={selectedTest}
            onClose={() => setSelectedTest(null)}
            onStartSection={(t, s) => void handleStartSection(t, s, 0)}
            onReviewSection={handleReviewSection}
            onRetakeSection={handleRetakeSection}
            sessions={sessions}
          />
        </Suspense>
      )}

      {/* Modal Cek Audio */}
      {audioModalOpen && (
        <Suspense fallback={null}>
          <AudioCheckModal
            isOpen={audioModalOpen}
            onClose={() => setAudioModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
