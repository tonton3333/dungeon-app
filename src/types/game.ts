// ========== 基本型 ==========

export type JobClass = 'warrior' | 'mage' | 'thief';

export type ItemType = 'potion' | 'mp_potion' | 'weapon' | 'armor' | 'offensive';

export type BattleCommand = 'attack' | 'magic' | 'flee' | 'item' | 'barrier' | 'pass';

export type GamePhase =
  | 'title'
  | 'auth'
  | 'character_create'
  | 'dungeon'
  | 'battle'
  | 'event'
  | 'game_over'
  | 'clear'       // 5F ボス撃破後の選択画面
  | 'extra_clear'; // 10F 真ラスボス撃破後の真クリア画面

export type FloorEventType = 'enemy' | 'treasure' | 'trap' | 'npc' | 'boss' | 'empty';

// ========== アイテム ==========

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  /** 回復薬: 回復量 / 武器: 攻撃力ボーナス / 防具: 防御力ボーナス / 攻撃アイテム: ダメージ量 */
  value: number;
  /** 攻撃アイテムの特殊効果 */
  offensiveEffect?: 'poison' | 'boss_bonus';
  /** 特殊効果（回復系） */
  specialEffect?: 'awaken';
}

// ========== キャラクター ==========

export interface CharacterStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
}

export interface Character {
  id: string;
  name: string;
  jobClass: JobClass;
  level: number;
  exp: number;
  expToNext: number;
  stats: CharacterStats;
  items: Item[];
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  floor: number;
}

// ========== 敵 ==========

export interface Enemy {
  id: string;
  name: string;
  description: string;
  catchphrase: string;
  stats: CharacterStats;
  expReward: number;
  itemDrop: Item | null;
  isBoss: boolean;
}

// ========== バトル ==========

export interface BattleLog {
  turn: number;
  actor: 'player' | 'enemy';
  action: string;
  damage?: number;
  heal?: number;
  message: string;
}

export interface BattleState {
  enemy: Enemy;
  playerStats: CharacterStats; // バトル中の一時ステータス
  turn: number;
  logs: BattleLog[];
  phase: 'player_turn' | 'enemy_turn' | 'result';
  result: 'ongoing' | 'win' | 'lose' | 'flee';
  barrierActive: boolean;         // バリアが張られているか
  poisonTurns: number;            // 毒の残りターン数（0=毒なし）
  poisonDamage: number;           // 毒ダメージ/ターン
  floor: number;                  // 現在の階層（エクストラ判定用）
  playerSleepTurns: number;       // プレイヤーの眠り残りターン（0=起きている）
  sleepUsedThisBattle: boolean;   // このバトルで睡眠を使ったか
  enemyAttackStacks: number;      // 攻撃力アップスタック（0〜3）
  enemyDefenseBonusTurns: number; // 防御力アップ残りターン数
}

// ========== フロアイベント ==========

export interface FloorEvent {
  type: FloorEventType;
  floor: number;
  narration: string;
  enemy?: Enemy;
  item?: Item;
  trapDamage?: number;
  npcMessage?: string;
}

// ========== ゲーム状態 ==========

export interface GameState {
  phase: GamePhase;
  character: Character | null;
  currentFloor: number;
  currentEvent: FloorEvent | null;
  battleState: BattleState | null;
  floorNarration: string;
  isLoading: boolean;
  message: string;
}

// ========== ランキング ==========

export interface RankingEntry {
  id: string;
  userId: string;
  playerName: string;
  characterName: string;
  jobClass: JobClass;
  level: number;
  floor: number;
  clearedAt: string | null;
  diedAt: string | null;
  isCleared: boolean;
  trueClear: boolean;
  score: number;
  createdAt: string;
}

// ========== 職業定義 ==========

export const JOB_DEFINITIONS: Record<
  JobClass,
  {
    label: string;
    description: string;
    baseStats: CharacterStats;
    /** レベルアップ時の成長値 */
    growthRate: {
      hp: number;
      mp: number;
      attack: number;
      defense: number;
    };
    magicName: string;
    magicMpCost: number;
    magicMultiplier: number;
  }
> = {
  warrior: {
    label: '戦士',
    description: '高い攻撃力と防御力を持つ前衛職。魔法は使えないが体力は随一。',
    baseStats: {
      hp: 120,
      maxHp: 120,
      mp: 10,
      maxMp: 10,
      attack: 15,
      defense: 12,
      speed: 8,
      luck: 5,
    },
    growthRate: { hp: 18, mp: 1, attack: 3, defense: 2 },
    magicName: '気合斬り',
    magicMpCost: 3,
    magicMultiplier: 2.0,
  },
  mage: {
    label: '魔法使い',
    description: '強力な魔法で敵を倒す後衛職。HPは低いが魔法ダメージは圧倒的。',
    baseStats: {
      hp: 70,
      maxHp: 70,
      mp: 50,
      maxMp: 50,
      attack: 6,
      defense: 5,
      speed: 9,
      luck: 8,
    },
    growthRate: { hp: 8, mp: 10, attack: 1, defense: 1 },
    magicName: 'ファイアボール',
    magicMpCost: 8,
    magicMultiplier: 3.5,
  },
  thief: {
    label: '盗賊',
    description: '素早さと運が高い万能型。逃げ成功率が高く、アイテム発見率もアップ。',
    baseStats: {
      hp: 90,
      maxHp: 90,
      mp: 25,
      maxMp: 25,
      attack: 11,
      defense: 7,
      speed: 15,
      luck: 14,
    },
    growthRate: { hp: 12, mp: 4, attack: 2, defense: 1 },
    magicName: '毒手裏剣',
    magicMpCost: 5,
    magicMultiplier: 2.2,
  },
};

// ========== スコア計算 ==========

export function calculateScore(character: Character, isCleared: boolean, trueClear = false): number {
  const floorScore = character.floor * 100;
  const levelScore = character.level * 50;
  const clearBonus = isCleared ? 5000 : 0;
  const trueClearBonus = trueClear ? 10000 : 0;
  return floorScore + levelScore + clearBonus + trueClearBonus;
}
