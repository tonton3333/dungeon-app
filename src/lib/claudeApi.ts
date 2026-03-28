/**
 * Claude API クライアント側ラッパー
 * 実際のAPI呼び出しは /api/claude Route Handler 経由でサーバーサイドで実行。
 * サーバー側でエラーが起きた場合もフォールバックテキストが返るため、
 * このモジュールは常に string を返し throw しない。
 */

import { Enemy, JobClass } from '@/types/game';

interface ClaudeResponse {
  text: string;
  fallback?: boolean; // true = APIキー未設定 or エラー時のフォールバック
}

async function callClaude(body: Record<string, unknown>): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // 400 など予期しないステータスの場合のみ throw
    throw new Error(`Claude API unexpected status: ${res.status}`);
  }

  const data: ClaudeResponse = await res.json();

  if (data.fallback) {
    console.info('[claudeApi] フォールバックテキストを使用しています（APIキー未設定 or エラー）');
  }

  return data.text;
}

/** 各階層入場時のナレーションを生成 */
export async function generateNarration(
  floor: number,
  characterName: string,
  jobClass: JobClass,
  isExtra = false
): Promise<string> {
  const jobLabel = { warrior: '戦士', mage: '魔法使い', thief: '盗賊' }[jobClass];
  return callClaude({ type: 'narration', floor, characterName, jobLabel, isExtra });
}

/** 敵のセリフや説明をより個性的に生成（オプション強化） */
export async function generateEnemyDetails(
  floor: number,
  enemy: Enemy,
  isBoss: boolean,
  isExtra = false
): Promise<Enemy> {
  const text = await callClaude({
    type: 'enemy',
    floor,
    enemyName: enemy.name,
    isBoss,
    isExtra,
  });

  try {
    const parsed = JSON.parse(text) as { description?: string; catchphrase?: string };
    return {
      ...enemy,
      description: parsed.description ?? enemy.description,
      catchphrase: parsed.catchphrase ?? enemy.catchphrase,
    };
  } catch {
    return enemy; // JSONパース失敗時は元の敵データをそのまま使う
  }
}

/** ランダムイベントのナレーションを生成 */
export async function generateEventNarration(
  eventType: 'treasure' | 'trap' | 'npc',
  floor: number
): Promise<string> {
  return callClaude({ type: 'event', eventType, floor });
}
