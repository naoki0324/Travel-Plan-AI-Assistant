import { GoogleGenAI } from "@google/genai";
import type { ItineraryItem } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might show a UI element asking the user to configure their key.
  // For this context, we throw an error.
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY as string });

export const getTravelSuggestions = async (
  itinerary: ItineraryItem[],
  problem: string,
  constraints: string,
  suggestionType: 'schedule' | 'spots'
): Promise<string> => {
  const model = 'gemini-2.5-flash';

  const itineraryString = itinerary.length > 0
    ? itinerary.map(item => `- ${item.time}: ${item.activity}${item.url ? ` (${item.url})` : ''}`).join('\n')
    : '予定はまだ入力されていません。';

  const systemInstruction = `あなたは、日本の旅行プランを提案するAIアシスタントです。あなたの役割は、ユーザーから提供された情報に基づき、指定された厳格な形式で、旅行の代替案またはおすすめスポットを提案することです。余計な挨拶、前置き、結びの言葉、説明文は一切含めず、指示された形式のテキストのみを生成してください。`;

  const taskInstruction = suggestionType === 'schedule'
    ? '今回のタスクは「代替案」の形式で出力してください。'
    : '今回のタスクは「おすすめスポット」の形式で出力してください。';

  const contents = `
# 元の旅行計画:
---
${itineraryString}
---

# 直面している問題:
---
${problem}
---

# 新しい計画への制約・要望:
---
${constraints}
---

# 今回のタスク:
---
${taskInstruction}
---

# 絶対的な指示:
1. 出力形式:
   - 代替案の場合: 元の計画と同様のリスト形式で、1つだけ提案してください。時間と活動内容を記載します。
   - おすすめスポットの場合: 場所の名前、概要、営業時間、定休日をセットにして、リスト形式で最大5つまで提案してください。各項目名は必ず「概要：」「営業時間：」「定休日：」としてください。
2. 禁止事項:
   - 太字、マークダウンなどの装飾は絶対に使用しないでください。
   - 指示されたリスト以外の文章（例: 「こちらが代替案です」、「いかがでしょうか？」など）は一切含めないでください。
   - 出力は指示されたリスト形式のテキストのみにしてください。

# 出力例（代替案の場合）:
- 09:40 自宅を出る
- 10:00 石神井公園駅 発
- 11:05 鶴見駅 着 
- 11:10 曹洞宗 大本山 總持寺   
- 11:55〜12:14 北ノ麺　もりうち
- 12:50 鶴見駅 発
- 13:29~13:36 弁天橋駅
- 13:41~13:56 海芝浦駅 
- 14:06~14:09 国道駅
- 14:18~14:23 鶴見川　散策
- 14:38~14:53 オリンピック(ホームセンター)
- 15:22 鶴見駅 発
- 17:39 神保原駅 着
- 18:26 自宅 着

# 出力例（おすすめスポットの場合）:
1. シァル鶴見
概要：JR鶴見駅直結のショッピングセンター。ファッション、雑貨、レストランなど多彩な店舗が揃う。
営業時間：10:00～21:00 (店舗により異なる)
定休日：不定休

2. 鶴見区民文化センター サルビアホール
概要：コンサートや演劇が楽しめる文化施設。地域のイベントも多数開催。
営業時間：9:00～22:00
定休日：年末年始、施設点検日

3. キリン横浜ビアビレッジ
概要：ビールの製造工程を見学できるほか、できたてのビールを味わえるレストランも併設。
営業時間：10:00～17:00
定休日：月曜日（祝日の場合は翌日）、年末年始
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `エラーが発生しました: ${error.message}\n\nAPIキーが有効か、または正しく設定されているか確認してください。`;
    }
    return "APIの呼び出し中に不明なエラーが発生しました。";
  }
};