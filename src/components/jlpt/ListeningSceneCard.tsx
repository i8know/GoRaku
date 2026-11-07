import React from "react";

interface ListeningSceneCardProps {
  sceneKey?: string;
}

export default function ListeningSceneCard({ sceneKey }: ListeningSceneCardProps) {
  if (!sceneKey || sceneKey === "AUDIO_RESPONSE") return null;

  switch (sceneKey) {
    case "MAP_KISSATEN_MIDORI":
      return (
        <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#dcd7cc] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#77736b]">
            <span className="font-bold text-[#25231f]">🗺️ 地図イラスト（もんだい1・1番）</span>
            <span>「きっさてん みどり」は 1〜4 のどれですか</span>
          </div>
          <svg
            viewBox="0 0 420 210"
            className="w-full max-w-md mx-auto rounded-xl bg-[#f7f4eb] border border-[#e2ded5]"
            role="img"
            aria-label="Peta Kissaten Midori"
          >
            {/* Jalan Vertikal & Horizontal */}
            <rect x="175" y="10" width="54" height="190" fill="#e6e1d4" />
            <rect x="20" y="78" width="380" height="48" fill="#e6e1d4" />
            <line x1="202" y1="15" x2="202" y2="195" stroke="#fffdf8" strokeDasharray="6 6" strokeWidth="2" />
            <line x1="25" y1="102" x2="395" y2="102" stroke="#fffdf8" strokeDasharray="6 6" strokeWidth="2" />

            {/* Gedung 4 (Atas) */}
            <rect x="130" y="18" width="38" height="32" rx="4" fill="#fffdfa" stroke="#25231f" strokeWidth="2" />
            <text x="149" y="39" textAnchor="middle" className="text-xs font-bold fill-[#25231f]">4</text>

            {/* Bank & Gedung 3 (Kiri setelah belok kiri di perempatan) */}
            <rect x="92" y="132" width="68" height="34" rx="4" fill="#e8efec" stroke="#263d36" strokeWidth="2" />
            <text x="126" y="153" textAnchor="middle" className="text-[11px] font-bold fill-[#263d36]">ぎんこう</text>

            <rect x="34" y="132" width="48" height="34" rx="4" fill="#fffdfa" stroke="#d95b43" strokeWidth="2" />
            <text x="58" y="154" textAnchor="middle" className="text-xs font-bold fill-[#25231f]">3</text>

            {/* Gedung 1 (Kiri Atas jalan) */}
            <rect x="34" y="36" width="48" height="34" rx="4" fill="#fffdfa" stroke="#25231f" strokeWidth="2" />
            <text x="58" y="58" textAnchor="middle" className="text-xs font-bold fill-[#25231f]">1</text>

            {/* Gedung 2 (Kanan perempatan) */}
            <rect x="255" y="36" width="48" height="34" rx="4" fill="#fffdfa" stroke="#25231f" strokeWidth="2" />
            <text x="279" y="58" textAnchor="middle" className="text-xs font-bold fill-[#25231f]">2</text>

            {/* Posisi Pembicara (Bawah) */}
            <circle cx="202" cy="182" r="10" fill="#d95b43" />
            <text x="202" y="186" textAnchor="middle" className="text-[10px] font-bold fill-white">▲</text>
            <text x="248" y="186" className="text-[11px] font-bold fill-[#595750]">現在地（ここ）</text>
          </svg>
        </div>
      );

    case "MAGAZINE_TOKEI_7":
      return (
        <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#dcd7cc] shadow-sm space-y-2">
          <div className="text-xs font-bold text-[#25231f]">📚 雑誌のイラスト（もんだい1・2番）</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { no: 1, title: "時計", month: "7月号", icon: "⌚" },
              { no: 2, title: "時計", month: "8月号", icon: "⌚" },
              { no: 3, title: "車", month: "7月号", icon: "🚗" },
              { no: 4, title: "車", month: "8月号", icon: "🚗" }
            ].map((m) => (
              <div
                key={m.no}
                className="p-3 rounded-xl bg-[#f9f7f2] border border-[#e2ded5] text-center space-y-1 font-['Noto_Serif_JP',serif]"
              >
                <div className="text-xs font-bold text-[#88847b]">選択肢 {m.no}</div>
                <div className="text-2xl">{m.icon}</div>
                <div className="font-bold text-base text-[#25231f]">{m.title}</div>
                <div className="inline-block px-2 py-0.5 rounded bg-[#263d36] text-white text-xs font-bold">
                  {m.month}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "CALENDAR_LIBRARY_10":
      return (
        <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#dcd7cc] shadow-sm space-y-2">
          <div className="text-xs font-bold text-[#25231f]">📅 図書館カレンダー（もんだい1・3番）</div>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse font-['Noto_Serif_JP',serif]">
              <thead>
                <tr className="bg-[#f2eee6] text-[#494740]">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                    <th key={d} className="p-1.5 border border-[#dcd7cc]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-[#dcd7cc]">2日</td>
                  <td className="p-2 border border-[#dcd7cc] font-bold bg-[#fff9f5]">3日 ①</td>
                  <td className="p-2 border border-[#dcd7cc] bg-[#fcedea] text-[#943828]">4日 休</td>
                  <td className="p-2 border border-[#dcd7cc] bg-[#fcedea] text-[#943828]">5日 休</td>
                  <td className="p-2 border border-[#dcd7cc] bg-[#fcedea] text-[#943828]">6日 休</td>
                  <td className="p-2 border border-[#dcd7cc] bg-[#fcedea] text-[#943828] font-bold">7日 ②休</td>
                  <td className="p-2 border border-[#dcd7cc] bg-[#fcedea] text-[#943828]">8日 休</td>
                </tr>
                <tr>
                  <td className="p-2 border border-[#dcd7cc] bg-[#fcedea] text-[#943828] font-bold">9日 ③休</td>
                  <td className="p-2 border border-[#dcd7cc] font-bold bg-[#e8efec] text-[#233c35]">10日 ④</td>
                  <td className="p-2 border border-[#dcd7cc]">11日</td>
                  <td className="p-2 border border-[#dcd7cc]">12日</td>
                  <td className="p-2 border border-[#dcd7cc]">13日</td>
                  <td className="p-2 border border-[#dcd7cc]">14日</td>
                  <td className="p-2 border border-[#dcd7cc]">15日</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );

    case "SHOPPING_EGGS3_MILK1_FISH":
      return (
        <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#dcd7cc] shadow-sm space-y-2">
          <div className="text-xs font-bold text-[#25231f]">🛒 買い物メモのイラスト（もんだい1・4番）</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-['Noto_Serif_JP',serif]">
            <div className="p-3 rounded-xl bg-[#f9f7f2] border border-[#e2ded5] text-center space-y-1">
              <div className="font-bold text-[#bf5b46]">1</div>
              <div>🥚 たまご × 1</div>
              <div>🥛 ぎゅうにゅう × 1</div>
              <div>🐟 さかな</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f9f7f2] border border-[#e2ded5] text-center space-y-1">
              <div className="font-bold text-[#bf5b46]">2</div>
              <div>🥚🥚🥚 たまご × 3</div>
              <div>🥛 ぎゅうにゅう × 1</div>
              <div>🐟 さかな</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f9f7f2] border border-[#e2ded5] text-center space-y-1">
              <div className="font-bold text-[#bf5b46]">3</div>
              <div>🥚 たまご × 1</div>
              <div>🥛 ぎゅうにゅう × 1</div>
              <div>🥩 にく</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f9f7f2] border border-[#e2ded5] text-center space-y-1">
              <div className="font-bold text-[#bf5b46]">4</div>
              <div>🥚🥚🥚 たまご × 3</div>
              <div>🥛 ぎゅうにゅう × 1</div>
              <div>🥩 にく</div>
            </div>
          </div>
        </div>
      );

    case "CLASSROOM_2F_ROOM4":
      return (
        <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#dcd7cc] shadow-sm space-y-2">
          <div className="text-xs font-bold text-[#25231f]">🏫 校舎の案内図（もんだい1・6番）</div>
          <div className="space-y-2 font-['Noto_Serif_JP',serif] text-xs">
            <div className="grid grid-cols-5 gap-1.5 items-center">
              <span className="font-bold text-[#263d36]">2かい</span>
              <div className="p-2 rounded bg-[#f2eee6] text-center">1ばん</div>
              <div className="p-2 rounded bg-[#fff9f5] border border-[#d95b43] text-center font-bold">2ばん (③)</div>
              <div className="p-2 rounded bg-[#f2eee6] text-center">3ばん</div>
              <div className="p-2 rounded bg-[#fff9f5] border border-[#d95b43] text-center font-bold">4ばん (④)</div>
            </div>
            <div className="grid grid-cols-5 gap-1.5 items-center">
              <span className="font-bold text-[#595750]">1かい</span>
              <div className="p-2 rounded bg-[#fff9f5] border border-[#d95b43] text-center font-bold">1ばん (①)</div>
              <div className="p-2 rounded bg-[#f2eee6] text-center">2ばん</div>
              <div className="p-2 rounded bg-[#fff9f5] border border-[#d95b43] text-center font-bold">3ばん (②)</div>
              <div className="p-2 rounded bg-[#f2eee6] text-center">事務室</div>
            </div>
          </div>
        </div>
      );

    case "FLOOR_DIRECTORY_PIZZA":
      return (
        <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#dcd7cc] shadow-sm space-y-2">
          <div className="text-xs font-bold text-[#25231f]">🍽️ レストラン案内板（もんだい2・6番）</div>
          <div className="grid grid-cols-2 gap-3 text-xs font-['Noto_Serif_JP',serif]">
            <div className="p-3 rounded-xl bg-[#f9f7f2] border border-[#e2ded5]">
              <div className="font-bold text-[#263d36] mb-1">4かい（4F）</div>
              <div>🍜 1. そば　／　🍣 3. すし</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f9f7f2] border border-[#e2ded5]">
              <div className="font-bold text-[#bf5b46] mb-1">3かい（3F）</div>
              <div>🍕 2. ピザ　／　🍛 4. カレー</div>
            </div>
          </div>
        </div>
      );

    case "SCENE_TIRED_FRIEND":
    case "SCENE_OFFER_CHOCOLATE":
    case "SCENE_ELEVATOR_BOARDING":
    case "SCENE_WALLET_FALLING":
    case "SCENE_CAFE_WAITING_COFFEE": {
      const sceneDescriptions: Record<string, { title: string; speakerRole: string; visual: string }> = {
        SCENE_TIRED_FRIEND: {
          title: "場面 1：歩いている友だちが汗をかいて疲れています",
          speakerRole: "あなた（➡）が友だちに声をかけます",
          visual: "😓💦 友だち　⬅　🗣️【あなた ➡】"
        },
        SCENE_OFFER_CHOCOLATE: {
          title: "場面 2：箱に入ったチョコレートを友だちに勧めています",
          speakerRole: "あなた（➡）がチョコレートを差し出しています",
          visual: "【あなた ➡】🍫✨　➡　🙂 友だち"
        },
        SCENE_ELEVATOR_BOARDING: {
          title: "場面 3：エレベーターのドアが閉まりそうで、急いで乗ろうとしています",
          speakerRole: "走ってきた人（➡）が中の人に言います",
          visual: "🛗 [エレベーターの中の人]　⬅　🏃‍♀️💨【乗る人 ➡】"
        },
        SCENE_WALLET_FALLING: {
          title: "場面 4：前を歩く人の後ろポケットから財布が落ちそうです",
          speakerRole: "後ろを歩く人（➡）が前の人に注意します",
          visual: "🚶‍♂️👛💦（ポケットから落ちそう）　⬅　😮【後ろの人 ➡】"
        },
        SCENE_CAFE_WAITING_COFFEE: {
          title: "場面 5：テーブルにサンドイッチだけあり、注文したコーヒーがまだ来ません",
          speakerRole: "客（➡）が店の人に尋ねます",
          visual: "🥪☕❓【客 ➡】　➡　🧑‍🍳 店の人"
        }
      };
      const info = sceneDescriptions[sceneKey];
      return (
        <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#dcd7cc] shadow-sm space-y-2 text-center">
          <div className="text-xs font-bold text-[#a06658]">{info.title}</div>
          <div className="py-3 px-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de] text-base sm:text-lg font-bold font-['Noto_Serif_JP',serif]">
            {info.visual}
          </div>
          <div className="text-[11px] text-[#77736b]">{info.speakerRole}</div>
        </div>
      );
    }

    default:
      return null;
  }
}

