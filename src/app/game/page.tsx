'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Character,
  BattleState,
  FloorEvent,
  GamePhase,
  JobClass,
  RankingEntry,
} from '@/types/game';
import {
  createCharacter,
  generateFloorEvent,
  initBattle,
  playerSleepTurn,
  playerAttack,
  playerMagic,
  playerUseItem,
  playerBarrier,
  playerFlee,
  enemyTurn,
  gainExp,
  applyBattleResult,
  equipItem,
  TOTAL_FLOORS,
  BOSS_FLOOR,
  EXTRA_BOSS_FLOOR,
  MAX_ITEMS,
  calculateScore,
} from '@/lib/gameLogic';
import { generateNarration, generateEnemyDetails } from '@/lib/claudeApi';
import * as SE from '@/lib/soundEffects';
import * as BGM from '@/lib/bgm';
import { getCurrentUserInfo } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import CharacterCreate from '@/components/CharacterCreate';
import DungeonView from '@/components/DungeonView';
import BattleView from '@/components/BattleView';
import HelpModal from '@/components/HelpModal';

// ---- API Route ヘルパー ----
async function saveCharacterToDB(character: Character, userId: string): Promise<void> {
  await fetch('/api/game/character', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ character, userId }),
  }).catch(err => console.error('[Game] saveCharacterToDB error:', err));
}

async function createPlayHistory(userId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/game/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    return data.histId ?? null;
  } catch (err) {
    console.error('[Game] createPlayHistory error:', err);
    return null;
  }
}

async function endPlayHistory(histId: string, floor: number, isCleared: boolean): Promise<void> {
  await fetch('/api/game/history', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ histId, floor, isCleared }),
  }).catch(err => console.error('[Game] endPlayHistory error:', err));
}

async function saveRankingToDB(params: {
  character: Character; userId: string; username: string;
  floor: number; isCleared: boolean; trueClear: boolean; score: number;
}): Promise<void> {
  await fetch('/api/game/ranking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).catch(err => console.error('[Game] saveRankingToDB error:', err));
}
const SAVE_KEY = 'dungeon-save';
const RANKING_KEY = 'dungeon-ranking';
const HELP_SEEN_KEY = 'dungeon-help-seen';

// ========== LocalStorage ヘルパー ==========

function loadSave(): {
  character: Character;
  phase: GamePhase;
  currentFloor: number;
  narration: string;
  explorationCount: number;
  playHistoryId: string | null;
  gameStartedAt: string | null;
} | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSave(
  character: Character,
  phase: GamePhase,
  currentFloor: number,
  narration: string,
  explorationCount: number,
  playHistoryId: string | null,
  gameStartedAt: string | null
) {
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({ character, phase, currentFloor, narration, explorationCount, playHistoryId, gameStartedAt })
  );
}

/** ローカルランキングにも保存（Supabase失敗時のフォールバック兼ゲスト対応） */
function addLocalRankingEntry(character: Character, floor: number, isCleared: boolean, trueClear = false) {
  const entry: RankingEntry = {
    id: crypto.randomUUID(),
    userId: 'guest',
    playerName: 'ゲスト',
    characterName: character.name,
    jobClass: character.jobClass,
    level: character.level,
    floor,
    clearedAt: isCleared ? new Date().toISOString() : null,
    diedAt: isCleared ? null : new Date().toISOString(),
    isCleared,
    trueClear,
    score: calculateScore(character, isCleared, trueClear),
    createdAt: new Date().toISOString(),
  };
  const existing: RankingEntry[] = JSON.parse(localStorage.getItem(RANKING_KEY) || '[]');
  localStorage.setItem(RANKING_KEY, JSON.stringify([entry, ...existing].slice(0, 100)));
}

// ========== ゲームオーバー / クリア画面 ==========

function GameOverScreen({
  character,
  floor,
  onRestart,
}: {
  character: Character;
  floor: number;
  onRestart: () => void;
}) {
  const score = calculateScore(character, false);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="text-7xl mb-4">💀</div>
        <h2 className="text-4xl font-bold text-red-500 mb-1">GAME OVER</h2>
        <p className="text-red-900 text-xs tracking-widest mb-2">Shadow Quest ～闇黒の迷宮～</p>
        <p className="text-gray-400 mb-6">
          {character.name} は第 {floor} 層で力尽きた…
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-sm">
          <div className="grid grid-cols-2 gap-2 text-left">
            <span className="text-gray-400">到達階層:</span>
            <span className="text-gray-200">第 {floor} 層</span>
            <span className="text-gray-400">レベル:</span>
            <span className="text-gray-200">Lv.{character.level}</span>
            <span className="text-gray-400">スコア:</span>
            <span className="text-amber-400 font-bold">{score.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
          >
            もう一度挑む
          </button>
          <Link
            href="/ranking"
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-bold rounded-xl transition-colors text-center"
          >
            ランキング
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClearScreen({
  character,
  onEndAdventure,
  onEnterExtra,
}: {
  character: Character;
  onEndAdventure: () => void;
  onEnterExtra: () => void;
}) {
  const score = calculateScore(character, true);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="text-7xl mb-4">🏆</div>
        <h2 className="text-4xl font-bold text-amber-400 mb-1">QUEST CLEAR!</h2>
        <p className="text-amber-700 text-xs tracking-widest mb-2">Shadow Quest ～闇黒の迷宮～</p>
        <p className="text-gray-300 mb-4">
          {character.name} が魔王を倒しダンジョンを制覇した！
        </p>
        <div className="bg-gray-900 border border-amber-700 rounded-xl p-4 mb-5 text-sm">
          <div className="grid grid-cols-2 gap-2 text-left">
            <span className="text-gray-400">クリア階層:</span>
            <span className="text-gray-200">全 {TOTAL_FLOORS} 層</span>
            <span className="text-gray-400">最終レベル:</span>
            <span className="text-gray-200">Lv.{character.level}</span>
            <span className="text-gray-400">スコア:</span>
            <span className="text-amber-400 font-bold text-lg">{score.toLocaleString()}</span>
          </div>
        </div>

        {/* エクストラステージ誘導 */}
        <div className="bg-gray-900/80 border border-purple-700/60 rounded-xl p-4 mb-4">
          <p className="text-purple-300 text-sm mb-3">
            🌑 深淵の扉が現れた…<br />
            <span className="text-gray-400 text-xs">さらなる力が眠る10層の奈落が待ち受けている。</span>
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onEnterExtra}
              className="w-full py-3 bg-purple-900 hover:bg-purple-800 border border-purple-500 text-purple-200 font-bold rounded-xl transition-colors"
            >
              🌑 更なる深みへ（エクストラステージ）
            </button>
            <button
              onClick={onEndAdventure}
              className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
            >
              冒険を終える
            </button>
          </div>
        </div>
        <Link
          href="/ranking"
          className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
        >
          ランキングを見る
        </Link>
      </div>
    </div>
  );
}

function ExtraClearScreen({
  character,
  onRestart,
}: {
  character: Character;
  onRestart: () => void;
}) {
  const score = calculateScore(character, true, true);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4"
         style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0a 100%)' }}>
      <div className="text-center max-w-md w-full">
        <div className="text-7xl mb-4">💎</div>
        <h2 className="text-4xl font-bold text-purple-300 mb-1 tracking-widest">TRUE CLEAR!</h2>
        <p className="text-purple-500 text-xs tracking-widest mb-1">Shadow Quest ～闇黒の迷宮～</p>
        <p className="text-purple-400 text-sm mb-2">真のクリア達成</p>
        <p className="text-gray-300 mb-5">
          {character.name} が混沌神を打ち倒し、世界に光をもたらした！
        </p>
        <div className="bg-purple-900/30 border border-purple-600/50 rounded-xl p-4 mb-6 text-sm">
          <div className="grid grid-cols-2 gap-2 text-left">
            <span className="text-gray-400">到達階層:</span>
            <span className="text-gray-200">全 {EXTRA_BOSS_FLOOR} 層</span>
            <span className="text-gray-400">最終レベル:</span>
            <span className="text-gray-200">Lv.{character.level}</span>
            <span className="text-gray-400">スコア:</span>
            <span className="text-purple-300 font-bold text-lg">{score.toLocaleString()}</span>
            <span className="text-gray-400">真クリアボーナス:</span>
            <span className="text-purple-400 font-bold">+10,000</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
          >
            新たな伝説へ
          </button>
          <Link
            href="/ranking"
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-bold rounded-xl transition-colors text-center"
          >
            ランキング
          </Link>
        </div>
      </div>
    </div>
  );
}

// ========== メインゲームコンポーネント ==========

export default function GamePage() {
  const router = useRouter();

  // ゲーム状態
  const [phase, setPhase] = useState<GamePhase>('character_create');
  const [character, setCharacter] = useState<Character | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFirstHelp, setIsFirstHelp] = useState(false);
  const [muted, setMuted] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('dungeon-sound-muted') === '1'
  );
  const [currentFloor, setCurrentFloor] = useState(1);
  const [floorNarration, setFloorNarration] = useState('');
  const [currentEvent, setCurrentEvent] = useState<FloorEvent | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [explorationCount, setExplorationCount] = useState(0);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Supabase 用状態
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('ゲスト');
  const [playHistoryId, setPlayHistoryId] = useState<string | null>(null);
  const gameStartedAt = useRef<string | null>(null);

  // ========== 初期化: ユーザー情報取得 & セーブデータ読み込み ==========

  useEffect(() => {
    // AudioContext をユーザーの最初の操作で unlock
    SE.initAudio();

    // Supabase ユーザー情報を取得
    getCurrentUserInfo().then(({ userId: uid, username: uname }) => {
      setUserId(uid);
      setUsername(uname);
    });

    // 初回訪問時はヘルプを表示
    if (!localStorage.getItem(HELP_SEEN_KEY)) {
      setIsFirstHelp(true);
      setShowHelp(true);
    }

    // LocalStorage からセーブデータ読み込み
    const save = loadSave();
    if (save) {
      setHasSavedGame(true);
      setCharacter(save.character);
      setPhase(save.phase === 'battle' ? 'dungeon' : save.phase);
      setCurrentFloor(save.currentFloor);
      setFloorNarration(save.narration);
      setExplorationCount(save.explorationCount);
      setPlayHistoryId(save.playHistoryId ?? null);
      gameStartedAt.current = save.gameStartedAt ?? null;
    }

    // アンマウント時に BGM を停止
    return () => { BGM.stopBGM(); };
  }, []);

  // フェーズ・階層・イベントに応じて BGM を切り替え
  useEffect(() => {
    if (phase === 'character_create') BGM.startBGM('character');
    else if (phase === 'dungeon')     BGM.startExploreBGM(currentFloor);
    else if (phase === 'battle') {
      const isBoss = currentEvent?.type === 'boss';
      const isTrueBoss = isBoss && currentFloor === EXTRA_BOSS_FLOOR;
      BGM.startBattleBGM(currentFloor, isBoss, isTrueBoss);
    } else {
      BGM.stopBGM(); // game_over / clear
    }
  }, [phase, currentFloor, currentEvent]);

  // ミュート状態を BGM にも反映
  useEffect(() => {
    BGM.setBGMMuted(muted);
  }, [muted]);

  // MuteButton（layout）からのミュート変更を SE ガードに反映
  useEffect(() => {
    const handler = (e: CustomEvent) => setMuted(e.detail.muted);
    window.addEventListener('mutechange', handler as EventListener);
    return () => window.removeEventListener('mutechange', handler as EventListener);
  }, []);

  // ========== Supabase DB保存ヘルパー ==========

  /** キャラクター & プレイ履歴をDBに保存（ログイン時のみ） */
  const saveToSupabase = useCallback(
    async (char: Character, floor: number): Promise<string | null> => {
      if (!userId) return null;

      // characters テーブルへ upsert
      await saveCharacterToDB(char, userId);

      // play_histories テーブルへ insert (まだ作成されていない場合)
      const histId = await createPlayHistory(userId);
      return histId;
    },
    [userId]
  );

  /** ゲーム終了時に play_histories & rankings を更新 */
  const finalizeToSupabase = useCallback(
    async (char: Character, floor: number, isCleared: boolean, histId: string | null, trueClear = false) => {
      if (!userId) {
        return;
      }

      const score = calculateScore(char, isCleared, trueClear);

      // play_histories 終了更新
      if (histId) {
        await endPlayHistory(histId, floor, isCleared);
      }

      // rankings 追加
      await saveRankingToDB({ character: char, userId, username, floor, isCleared, trueClear, score });
    },
    [userId, username]
  );

  // ========== サウンド ==========

  const play = useCallback((fn: () => void) => {
    if (!muted) fn();
  }, [muted]);

  // ========== キャラクター作成 ==========

  const handleCharacterCreate = useCallback(
    async (name: string, jobClass: JobClass) => {
      const char = createCharacter(name, jobClass);
      const startedAt = new Date().toISOString();
      gameStartedAt.current = startedAt;

      setIsLoading(true);

      // Claude API でナレーション生成
      let narration = `第1層への扉が開かれた。${name}は深呼吸をして、暗いダンジョンへと足を踏み入れた。`;
      try {
        narration = await generateNarration(1, name, jobClass);
      } catch (err) {
        console.error('[Game] generateNarration error:', err);
      }

      // Supabase DB保存（ログイン時のみ）
      let histId: string | null = null;
      if (userId) {
        histId = await saveToSupabase(char, 1);
        setPlayHistoryId(histId);
      }

      setCharacter(char);
      setPhase('dungeon');
      setCurrentFloor(1);
      setFloorNarration(narration);
      setExplorationCount(0);
      setMessage('');
      persistSave(char, 'dungeon', 1, narration, 0, histId, startedAt);
      setIsLoading(false);
    },
    [userId, saveToSupabase]
  );

  // ========== ダンジョン探索 ==========

  const handleExplore = useCallback(async () => {
    if (!character || isLoading) return;

    setIsLoading(true);
    setMessage('');

    const isBossEncounter = explorationCount >= 2 && (currentFloor === BOSS_FLOOR || currentFloor === EXTRA_BOSS_FLOOR);
    const event = generateFloorEvent(currentFloor, isBossEncounter);

    if (event.enemy) {
      try {
        event.enemy = await generateEnemyDetails(currentFloor, event.enemy, isBossEncounter);
      } catch (err) {
        console.error('[Game] generateEnemyDetails error:', err);
      }
    }

    setIsLoading(false);

    // 罠: その場でダメージ
    if (event.type === 'trap' && event.trapDamage) {
      play(SE.playDamage);
      const newHp = Math.max(0, character.stats.hp - event.trapDamage);
      const newChar = { ...character, stats: { ...character.stats, hp: newHp } };
      setCharacter(newChar);
      setCurrentEvent(event);

      if (newHp <= 0) {
        // 罠で死亡
        addLocalRankingEntry(newChar, currentFloor, false);
        await finalizeToSupabase(newChar, currentFloor, false, playHistoryId);
        localStorage.removeItem(SAVE_KEY);
        setPhase('game_over');
      } else {
        const newCount = explorationCount + 1;
        setExplorationCount(newCount);
        persistSave(newChar, 'dungeon', currentFloor, floorNarration, newCount, playHistoryId, gameStartedAt.current);
      }
      return;
    }

    // 敵 / ボス
    if ((event.type === 'enemy' || event.type === 'boss') && event.enemy) {
      play(SE.playBattleStart);
      const battle = initBattle(character, event.enemy, currentFloor);
      setBattleState(battle);
      setCurrentEvent(event);
      setPhase('battle');
      return;
    }

    // 宝箱 / NPC / 空振り
    const newCount = explorationCount + 1;
    setExplorationCount(newCount);
    setCurrentEvent(event);
    if (event.type === 'treasure' && event.item) play(SE.playItemGet);
    persistSave(character, 'dungeon', currentFloor, floorNarration, newCount, playHistoryId, gameStartedAt.current);
  }, [character, currentFloor, explorationCount, isLoading, floorNarration, playHistoryId, finalizeToSupabase]);

  // ========== イベント完了 ==========

  const handleEventContinue = useCallback(() => {
    if (!character || !currentEvent) return;

    let newChar = character;
    let msg = '';
    if (currentEvent.type === 'treasure' && currentEvent.item) {
      if (character.items.length < MAX_ITEMS) {
        newChar = { ...character, items: [...character.items, currentEvent.item] };
        setCharacter(newChar);
      } else {
        msg = `所持品がいっぱいで ${currentEvent.item.name} を持てなかった…（最大${MAX_ITEMS}個）`;
      }
    }

    setCurrentEvent(null);
    setPhase('dungeon');
    if (msg) setMessage(msg);
    persistSave(newChar, 'dungeon', currentFloor, floorNarration, explorationCount, playHistoryId, gameStartedAt.current);
  }, [character, currentEvent, currentFloor, floorNarration, explorationCount, playHistoryId]);

  // ========== バトルアクション ==========

  const handleBattleAction = useCallback(
    async (action: 'attack' | 'magic' | 'flee' | 'item' | 'barrier' | 'pass', itemId?: string) => {
      if (!character || !battleState || isLoading) return;

      let newState = battleState;
      let newChar = character;

      switch (action) {
        case 'attack':
          play(SE.playAttack);
          newState = playerAttack(battleState, character);
          break;
        case 'magic':
          play(SE.playMagic);
          newState = playerMagic(battleState, character);
          newChar = { ...character, stats: { ...character.stats, mp: newState.playerStats.mp } };
          break;
        case 'item':
          if (itemId) {
            const res = playerUseItem(battleState, character, itemId);
            newState = res.battleState;
            newChar = res.updatedCharacter;
          }
          break;
        case 'barrier':
          newState = playerBarrier(battleState, character);
          newChar = { ...character, stats: { ...character.stats, mp: newState.playerStats.mp } };
          break;
        case 'flee':
          newState = playerFlee(battleState, character);
          break;
        case 'pass':
          newState = playerSleepTurn(battleState);
          break;
      }

      // 逃げ成功
      if (newState.result === 'flee') {
        newChar = applyBattleResult(newChar, newState);
        setCharacter(newChar);
        setBattleState(null);
        setCurrentEvent(null);
        setPhase('dungeon');
        setMessage('逃げ切った！');
        persistSave(newChar, 'dungeon', currentFloor, floorNarration, explorationCount, playHistoryId, gameStartedAt.current);
        return;
      }

      // 勝利
      if (newState.result === 'win') {
        // applyBattleResult前に所持枠チェック（戦闘中のアイテム使用後の枠数で判定）
        const canPickUpDrop = newState.enemy.itemDrop != null && newChar.items.length < MAX_ITEMS;
        newChar = applyBattleResult(newChar, newState);
        const { character: leveled, leveledUp, levelsGained } = gainExp(newChar, newState.enemy.expReward);
        newChar = leveled;

        if (leveledUp) play(SE.playLevelUp);
        if (canPickUpDrop) play(SE.playItemGet);

        let msg = `${newState.enemy.name} を倒した！ ${newState.enemy.expReward} EXP 獲得！`;
        if (leveledUp) msg += ` ★ レベルアップ！ Lv.${newChar.level}（+${levelsGained}）`;
        if (newState.enemy.itemDrop) {
          if (canPickUpDrop) {
            msg += ` 📦 ${newState.enemy.itemDrop.name} を入手！`;
          } else {
            msg += ` 📦 ${newState.enemy.itemDrop.name} を入手できなかった（所持品がいっぱい）`;
          }
        }

        const newCount = explorationCount + 1;

        // ボスクリア
        if (currentEvent?.type === 'boss') {
          setCharacter(newChar);
          localStorage.removeItem(SAVE_KEY);
          setBattleState(null);
          setCurrentEvent(null);
          if (currentFloor === EXTRA_BOSS_FLOOR) {
            // 真クリア
            play(SE.playTrueClear);
            addLocalRankingEntry(newChar, currentFloor, true, true);
            await finalizeToSupabase(newChar, currentFloor, true, playHistoryId, true);
            setPhase('extra_clear');
          } else {
            // 通常クリア → 選択画面へ（ランキング保存は選択後）
            play(SE.playClear);
            setPhase('clear');
          }
          return;
        }

        // 通常戦闘勝利後: キャラクターをDBに更新
        if (userId) {
          await saveCharacterToDB(newChar, userId);
        }

        // 勝利ジングル再生 → 2.8秒後に自動で探索BGMへ移行
        BGM.playVictoryJingle();

        setCharacter(newChar);
        setBattleState(null);
        setCurrentEvent(null);
        setPhase('dungeon');
        setMessage(msg);
        setExplorationCount(newCount);
        persistSave(newChar, 'dungeon', currentFloor, floorNarration, newCount, playHistoryId, gameStartedAt.current);
        return;
      }

      // 敵ターン
      if (newState.phase === 'enemy_turn') {
        newState = enemyTurn(newState);

        if (newState.result === 'lose') {
          play(SE.playGameOver);
          const deadChar = { ...newChar, stats: { ...newChar.stats, hp: 0 } };
          setCharacter(deadChar);
          addLocalRankingEntry(deadChar, currentFloor, false);
          await finalizeToSupabase(deadChar, currentFloor, false, playHistoryId);
          localStorage.removeItem(SAVE_KEY);
          setBattleState(null);
          setPhase('game_over');
          return;
        }

        // 敵の攻撃でダメージを受けた
        play(SE.playDamage);
      }

      setCharacter(newChar);
      setBattleState(newState);
    },
    [character, battleState, isLoading, currentFloor, explorationCount, floorNarration, currentEvent, playHistoryId, userId, finalizeToSupabase]
  );

  // ========== 次の階へ ==========

  const handleNextFloor = useCallback(async () => {
    if (!character || currentFloor >= EXTRA_BOSS_FLOOR) return;

    setIsLoading(true);
    const nextFloor = currentFloor + 1;

    let narration = `第${nextFloor}層の扉が開いた。更なる深みが冒険者を待ち受けている。`;
    try {
      narration = await generateNarration(nextFloor, character.name, character.jobClass);
    } catch (err) {
      console.error('[Game] generateNarration error:', err);
    }

    const updatedChar = { ...character, floor: nextFloor };

    // フロア進行をDBに反映
    if (userId) {
      await saveCharacterToDB(updatedChar, userId);
    }

    setCharacter(updatedChar);
    setCurrentFloor(nextFloor);
    setFloorNarration(narration);
    setExplorationCount(0);
    setCurrentEvent(null);
    setMessage('');
    persistSave(updatedChar, 'dungeon', nextFloor, narration, 0, playHistoryId, gameStartedAt.current);
    setIsLoading(false);
  }, [character, currentFloor, playHistoryId, userId]);

  // ========== ダンジョン内アイテム使用（回復薬） ==========

  const handleDungeonUseItem = useCallback(
    (itemId: string) => {
      if (!character) return;
      const item = character.items.find((i) => i.id === itemId);
      if (!item || (item.type !== 'potion' && item.type !== 'mp_potion')) return;

      const newItems = character.items.filter((i) => i.id !== itemId);
      let newStats = { ...character.stats };
      let message = '';

      if (item.type === 'potion') {
        const healed = Math.min(character.stats.maxHp - character.stats.hp, item.value);
        newStats.hp = Math.min(character.stats.maxHp, character.stats.hp + item.value);
        message = `🧪 ${item.name}を使った！HPが${healed}回復した！`;
      } else {
        const isElixir = item.value >= character.stats.maxMp;
        const restored = isElixir
          ? character.stats.maxMp - character.stats.mp
          : Math.min(character.stats.maxMp - character.stats.mp, item.value);
        newStats.mp = isElixir ? character.stats.maxMp : Math.min(character.stats.maxMp, character.stats.mp + item.value);
        message = isElixir
          ? `🔮 ${item.name}を使った！MPが全回復した！`
          : `🔮 ${item.name}を使った！MPが${restored}回復した！`;
      }

      const newChar = { ...character, stats: newStats, items: newItems };
      play(SE.playItemGet);
      setCharacter(newChar);
      setMessage(message);
      persistSave(newChar, phase, currentFloor, floorNarration, explorationCount, playHistoryId, gameStartedAt.current);
    },
    [character, phase, currentFloor, floorNarration, explorationCount, playHistoryId, play]
  );

  // ========== アイテム破棄 ==========

  const handleDiscardItem = useCallback(
    (itemId: string) => {
      if (!character) return;
      const item = character.items.find((i) => i.id === itemId);
      if (!item) return;
      const newChar = { ...character, items: character.items.filter((i) => i.id !== itemId) };
      setCharacter(newChar);
      setMessage(`🗑 ${item.name} を捨てた。`);
      persistSave(newChar, phase, currentFloor, floorNarration, explorationCount, playHistoryId, gameStartedAt.current);
    },
    [character, phase, currentFloor, floorNarration, explorationCount, playHistoryId]
  );

  // ========== アイテム装備 ==========

  const handleEquipItem = useCallback(
    (itemId: string) => {
      if (!character) return;
      const newChar = equipItem(character, itemId);
      setCharacter(newChar);
      persistSave(newChar, phase, currentFloor, floorNarration, explorationCount, playHistoryId, gameStartedAt.current);
    },
    [character, phase, currentFloor, floorNarration, explorationCount, playHistoryId]
  );

  // ========== リスタート ==========

  const handleRestart = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setCharacter(null);
    setPhase('character_create');
    setCurrentFloor(1);
    setFloorNarration('');
    setCurrentEvent(null);
    setBattleState(null);
    setExplorationCount(0);
    setMessage('');
    setPlayHistoryId(null);
    gameStartedAt.current = null;
  }, []);

  // ========== クリア後の選択 ==========

  /** 冒険を終える（通常クリア扱いでランキング保存） */
  const handleEndAdventure = useCallback(async () => {
    if (!character) return;
    addLocalRankingEntry(character, BOSS_FLOOR, true, false);
    await finalizeToSupabase(character, BOSS_FLOOR, true, playHistoryId, false);
    handleRestart();
  }, [character, playHistoryId, finalizeToSupabase, handleRestart]);

  /** エクストラステージへ進む */
  const handleEnterExtra = useCallback(async () => {
    if (!character) return;
    setIsLoading(true);
    const extraFloor = BOSS_FLOOR + 1;
    let narration = `深淵への扉が開いた。${character.name}は更なる闇へと足を踏み入れた。`;
    try {
      narration = await generateNarration(extraFloor, character.name, character.jobClass, true);
    } catch (err) {
      console.error('[Game] generateNarration (extra) error:', err);
    }
    const updatedChar = { ...character, floor: extraFloor };

    setCharacter(updatedChar);
    setCurrentFloor(extraFloor);
    setFloorNarration(narration);
    setExplorationCount(0);
    setCurrentEvent(null);
    setMessage('');
    persistSave(updatedChar, 'dungeon', extraFloor, narration, 0, playHistoryId, gameStartedAt.current);
    setPhase('dungeon');
    setIsLoading(false);
  }, [character, playHistoryId]);

  // ========== レンダリング ==========

  if (phase === 'game_over' && character) {
    return <GameOverScreen character={character} floor={currentFloor} onRestart={handleRestart} />;
  }

  if (phase === 'clear' && character) {
    return <ClearScreen character={character} onEndAdventure={handleEndAdventure} onEnterExtra={handleEnterExtra} />;
  }

  if (phase === 'extra_clear' && character) {
    return <ExtraClearScreen character={character} onRestart={handleRestart} />;
  }

  if (phase === 'character_create') {
    return (
      <>
        <CharacterCreate
          onComplete={handleCharacterCreate}
          isLoading={isLoading}
          onBack={!hasSavedGame ? () => router.push('/') : undefined}
        />
        {showHelp && (
          <HelpModal
            isFirstTime={isFirstHelp}
            onClose={() => {
              setShowHelp(false);
              localStorage.setItem(HELP_SEEN_KEY, '1');
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-10">
        {character && (
          <StatusBar
            character={phase === 'battle' && battleState ? { ...character, stats: battleState.playerStats } : character}
            floor={currentFloor}
          />
        )}
        <div className="flex justify-between items-center px-4 py-1 bg-gray-900/50 text-xs">
          <Link href="/" className="text-gray-600 hover:text-gray-400 transition-colors">
            ← タイトルへ
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-gray-700">{userId ? `👤 ${username}` : '🎮 ゲスト'}</span>
            <button
              onClick={() => { setIsFirstHelp(false); setShowHelp(true); }}
              className="text-gray-600 hover:text-amber-400 transition-colors font-bold"
              title="ゲームガイド"
            >
              ？
            </button>
          </div>
          <Link href="/ranking" className="text-gray-600 hover:text-gray-400 transition-colors">
            ランキング 🏆
          </Link>
        </div>
      </header>

      {showHelp && (
        <HelpModal
          isFirstTime={isFirstHelp}
          onClose={() => {
            setShowHelp(false);
            localStorage.setItem(HELP_SEEN_KEY, '1');
          }}
        />
      )}

      {phase === 'battle' && battleState && character && (
        <BattleView
          character={character}
          battleState={battleState}
          onAction={handleBattleAction}
        />
      )}

      {phase === 'dungeon' && character && (
        <DungeonView
          character={character}
          floor={currentFloor}
          narration={floorNarration}
          currentEvent={currentEvent}
          explorationCount={explorationCount}
          message={message}
          isLoading={isLoading}
          onExplore={handleExplore}
          onNextFloor={handleNextFloor}
          onEventContinue={handleEventContinue}
          onEquipItem={handleEquipItem}
          onUseItem={handleDungeonUseItem}
          onDiscardItem={handleDiscardItem}
        />
      )}
    </div>
  );
}
