import { createClient } from '@supabase/supabase-js';
import { Character, JobClass, RankingEntry } from '@/types/game';
import { getSession } from './auth';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ========== 認証ヘルパー ==========

/** ログイン中のユーザー情報を localStorage から取得 */
export async function getCurrentUserInfo(): Promise<{ userId: string | null; username: string }> {
  const session = getSession();
  if (!session) return { userId: null, username: 'ゲスト' };
  return { userId: session.userId, username: session.username };
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentUserInfo()).userId;
}

export async function getCurrentUsername(): Promise<string> {
  return (await getCurrentUserInfo()).username;
}

// ========== characters テーブル ==========
// user_id に UNIQUE 制約を設けてユーザーごとに1レコード管理する。

/** キャラクターをDBに保存 (user_id で UPSERT) */
export async function saveCharacterToDB(
  character: Character,
  userId: string,
  _currentFloor: number
): Promise<void> {
  const payload = {
    user_id: Number(userId),
    name: character.name,
    job: character.jobClass,
    level: character.level,
    hp: character.stats.hp,
    max_hp: character.stats.maxHp,
    mp: character.stats.mp,
    max_mp: character.stats.maxMp,
    experience: character.exp,
    weapon_slot: character.equippedWeapon ?? null,
    armor_slot: character.equippedArmor ?? null,
  };

  const { error } = await supabase
    .from('characters')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('[Supabase] saveCharacterToDB error:', error.message, error.code);
  }
}

// ========== play_histories テーブル ==========

/** プレイ開始時に履歴レコードを作成。作成された履歴IDを返す */
export async function createPlayHistory(
  _character: Character,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('play_histories')
    .insert({ user_id: Number(userId), floor_reached: 1, is_clear: false })
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] createPlayHistory error:', error.message, error.code);
    return null;
  }

  return String(data.id);
}

/** プレイ終了時（クリア or 死亡）に履歴を更新 */
export async function endPlayHistory(
  historyId: string,
  _character: Character,
  floor: number,
  isCleared: boolean
): Promise<void> {
  const { error } = await supabase
    .from('play_histories')
    .update({ floor_reached: floor, is_clear: isCleared })
    .eq('id', Number(historyId));

  if (error) {
    console.error('[Supabase] endPlayHistory error:', error.message, error.code);
  }
}

// ========== rankings テーブル ==========

interface SaveRankingParams {
  character: Character;
  userId: string;
  username: string;
  floor: number;
  isCleared: boolean;
  trueClear: boolean;
  score: number;
  playHistoryId: string | null;
  gameStartedAt: string | null;
}

/** クリア or ゲームオーバー時にランキングを保存 */
export async function saveRankingToDB({
  character,
  userId,
  username,
  floor,
  isCleared,
  trueClear,
}: SaveRankingParams): Promise<void> {
  const { error } = await supabase
    .from('rankings')
    .insert({
      user_id: Number(userId),
      username,
      character_name: character.name,
      job: character.jobClass,
      floor_reached: floor,
      is_clear: isCleared,
      true_clear: trueClear,
    });

  if (error) {
    console.error('[Supabase] saveRankingToDB error:', error.message, error.code);
  }
}

// ========== ランキング取得 ==========

/** DBからランキングTOP50を取得。失敗時は空配列 */
export async function fetchRankings(): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .from('rankings')
    .select('id, username, character_name, job, floor_reached, is_clear, true_clear, score, created_at')
    .order('true_clear',    { ascending: false })
    .order('is_clear',      { ascending: false })
    .order('floor_reached', { ascending: false })
    .order('created_at',    { ascending: true })
    .limit(50);

  if (error) {
    console.error('[Supabase] fetchRankings error:', error.message, error.code);
    return [];
  }

  return data.map((r: Record<string, unknown>) => {
    const floor      = r.floor_reached as number;
    const isCleared  = r.is_clear as boolean;
    const trueClear  = (r.true_clear as boolean) ?? false;
    const score      = (r.score as number) ?? 0;

    return {
      id:            String(r.id),
      userId:        '',
      playerName:    r.username as string,
      characterName: r.character_name as string,
      jobClass:      r.job as JobClass,
      level:         0,
      floor,
      clearedAt:  isCleared ? (r.created_at as string) : null,
      diedAt:    !isCleared ? (r.created_at as string) : null,
      isCleared,
      trueClear,
      score,
      createdAt: r.created_at as string,
    };
  });
}
