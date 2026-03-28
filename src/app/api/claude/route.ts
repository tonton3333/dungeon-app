import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

type RequestBody =
  | { type: 'narration'; floor: number; characterName: string; jobLabel: string; isExtra?: boolean }
  | { type: 'enemy'; floor: number; enemyName: string; isBoss: boolean; isExtra?: boolean }
  | { type: 'event'; eventType: 'treasure' | 'trap' | 'npc'; floor: number };

const SYSTEM_PROMPT = `あなたはダークファンタジーRPGのゲームマスターです。
日本語で、雰囲気のある短いテキストを生成してください。
余計な説明や前置きは不要です。指示されたテキストのみ出力してください。`;

/** APIキーがない・無効な場合のフォールバックテキスト */
function getFallbackText(body: RequestBody): string {
  switch (body.type) {
    case 'narration':
      return `第${body.floor}層の冷たい空気が${body.characterName}の頬を刺す。暗闇の中に何かが潜んでいる気配がした。`;
    case 'enemy':
      return JSON.stringify({ description: '謎めいた魔物。', catchphrase: '覚悟しろ！' });
    case 'event':
      return { treasure: '古びた宝箱が薄暗い通路の奥に佇んでいた。', trap: '突然、足元の石板が沈み込んだ！', npc: '壁際に人影が見えた。旅人だろうか。' }[body.eventType];
  }
}

function buildUserPrompt(body: RequestBody): string {
  switch (body.type) {
    case 'narration':
      if (body.isExtra) {
        return `エクストラダンジョン第${body.floor}層に踏み込んだ瞬間のナレーションを2〜3文で書いてください。
主人公: ${body.characterName}（${body.jobLabel}）
通常のダンジョンをはるかに超える暗黒と絶望の雰囲気、この世のものではない恐怖の気配、空間の歪みや存在の希薄化を描写してください。
ゲームのナレーターが語りかけるような文体で。`;
      }
      return `ダンジョンの第${body.floor}層に入った瞬間のナレーションを2〜3文で書いてください。
主人公: ${body.characterName}（${body.jobLabel}）
薄暗いダンジョンの雰囲気、独特の臭いや音、危険の気配などを盛り込んでください。
ゲームのナレーターが語りかけるような文体で。`;

    case 'enemy':
      if (body.isBoss && body.isExtra) {
        return `エクストラダンジョン最終ボス「${body.enemyName}」の説明とセリフをJSONで生成してください。
{"description": "（この世の存在を超えた恐るべき力と外見の描写・1文）", "catchphrase": "（世界の終焉と絶望を予感させる印象的なセリフ）"}
神話的な威圧感、宇宙規模の絶望、そして主人公への畏敬を表現してください。`;
      }
      if (body.isBoss) {
        return `ダンジョンボスの「${body.enemyName}」の説明とセリフをJSONで生成してください。
{"description": "（1文の迫力ある外見・特徴の説明）", "catchphrase": "（登場時の印象的なセリフ）"}
ボスらしい威圧感と個性を出してください。`;
      }
      if (body.isExtra) {
        return `エクストラダンジョン第${body.floor}層の強敵「${body.enemyName}」の説明とセリフをJSONで生成してください。
{"description": "（1文の恐ろしい特徴説明）", "catchphrase": "（絶望感のある戦闘開始セリフ）"}
通常の敵を超えた絶望的な強さと暗黒の個性を表現してください。`;
      }
      return `ダンジョン第${body.floor}層の敵「${body.enemyName}」の説明とセリフをJSONで生成してください。
{"description": "（1文の特徴説明）", "catchphrase": "（戦闘開始時のセリフ）"}
その階層にふさわしい強さと個性を表現してください。`;

    case 'event': {
      const eventDescriptions = {
        treasure: `ダンジョン第${body.floor}層で宝箱を発見した場面のナレーションを2文で書いてください。期待と緊張感を込めて。`,
        trap: `ダンジョン第${body.floor}層で罠にかかった場面のナレーションを2文で書いてください。驚きと痛みのリアクションを込めて。`,
        npc: `ダンジョン第${body.floor}層で謎の人物に出会った場面のナレーションを2文で書いてください。その人物の不思議な雰囲気を込めて。`,
      };
      return eventDescriptions[body.eventType];
    }
  }
}

export async function POST(request: NextRequest) {
  let body: RequestBody;

  // リクエストボディのパース
  try {
    body = await request.json();
  } catch (err) {
    console.error('[Claude Route] Failed to parse request body:', err);
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // APIキー未設定チェック（フォールバックで正常応答）
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`[Claude Route] APIキー確認: ${apiKey ? `設定済み(${apiKey.slice(0, 16)}...)` : '未設定'}`);
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.warn('[Claude Route] ANTHROPIC_API_KEY が未設定です。フォールバックテキストを返します。');
    return Response.json({ text: getFallbackText(body), fallback: true });
  }

  // Anthropicクライアントをリクエストごとに生成（環境変数の遅延評価）
  const client = new Anthropic({ apiKey });

  try {
    const userPrompt = buildUserPrompt(body);
    console.log(`[Claude Route] Calling API: type=${body.type}, floor=${'floor' in body ? body.floor : '-'}`);

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text.trim() : getFallbackText(body);

    console.log(`[Claude Route] Success: ${text.slice(0, 50)}...`);
    return Response.json({ text });

  } catch (error) {
    // エラー種別ごとに詳細ログ & フォールバック応答（クライアントを壊さない）
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[Claude Route] 認証エラー: APIキーが無効です。.env.local の ANTHROPIC_API_KEY を確認してください。', {
        status: error.status,
        message: error.message,
      });
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error('[Claude Route] レート制限エラー: しばらく待ってから再試行してください。', {
        status: error.status,
        message: error.message,
      });
    } else if (error instanceof Anthropic.BadRequestError) {
      console.error('[Claude Route] リクエストエラー:', {
        status: error.status,
        message: error.message,
        body: error.error,
      });
    } else if (error instanceof Anthropic.APIError) {
      console.error('[Claude Route] Anthropic APIエラー:', {
        status: error.status,
        message: error.message,
        name: error.name,
      });
    } else {
      console.error('[Claude Route] 予期しないエラー:', error);
    }

    // エラー時もフォールバックテキストで 200 を返す（ゲームを止めない）
    return Response.json({ text: getFallbackText(body), fallback: true });
  }
}
