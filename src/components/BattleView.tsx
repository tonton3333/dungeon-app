'use client';

import { useRef, useEffect, useState } from 'react';
import { Character, BattleState, BattleLog, BattleCommand, JOB_DEFINITIONS } from '@/types/game';
import { BARRIER_MP_COST } from '@/lib/gameLogic';

interface BattleViewProps {
  character: Character;
  battleState: BattleState;
  onAction: (action: BattleCommand, itemId?: string) => void;
}

function HpBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LogEntry({ log }: { log: BattleLog }) {
  const actorColor = log.actor === 'player' ? 'text-cyan-400' : 'text-red-400';
  return (
    <div className={`text-sm py-1 ${actorColor}`}>
      {log.message}
      {log.damage && (
        <span className="text-yellow-300 font-bold ml-1">(-{log.damage})</span>
      )}
      {log.heal && (
        <span className="text-green-300 font-bold ml-1">(+{log.heal})</span>
      )}
    </div>
  );
}

export default function BattleView({ character, battleState, onAction }: BattleViewProps) {
  const {
    enemy, playerStats, logs, phase, turn,
    barrierActive, poisonTurns,
    playerSleepTurns, enemyAttackStacks, enemyDefenseBonusTurns,
  } = battleState;
  const logRef = useRef<HTMLDivElement>(null);
  const def = JOB_DEFINITIONS[character.jobClass];
  const [showItemList, setShowItemList] = useState(false);

  // ログ自動スクロール
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // フェーズ切り替え時にアイテムリストを閉じる
  useEffect(() => {
    if (phase !== 'player_turn') setShowItemList(false);
  }, [phase]);

  const enemyHpColor =
    enemy.stats.hp / enemy.stats.maxHp > 0.5
      ? 'bg-red-500'
      : enemy.stats.hp / enemy.stats.maxHp > 0.25
      ? 'bg-orange-500'
      : 'bg-red-800';

  const playerHpColor =
    playerStats.hp / playerStats.maxHp > 0.5
      ? 'bg-green-500'
      : playerStats.hp / playerStats.maxHp > 0.25
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const isPlayerTurn = phase === 'player_turn';
  const isSleeping = isPlayerTurn && playerSleepTurns > 0;
  const barrierMpCost = BARRIER_MP_COST[character.jobClass];
  const usableItems = character.items.filter((i) => i.type === 'potion' || i.type === 'mp_potion' || i.type === 'offensive');

  const itemTypeIcon: Record<string, string> = {
    potion: '🧪',
    mp_potion: '🔮',
    offensive: '💣',
    weapon: '⚔️',
    armor: '🛡️',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* バトルヘッダー */}
      <div className="text-center mb-4">
        <span className="text-gray-500 text-sm">Turn {turn}</span>
        {enemy.isBoss && (
          <span className="ml-3 bg-red-900 text-red-300 px-3 py-0.5 rounded-full text-xs font-bold animate-pulse">
            !! BOSS !!
          </span>
        )}
      </div>

      {/* 敵 */}
      <div
        className={`bg-gray-900 border rounded-xl p-5 mb-4 ${
          enemy.isBoss ? 'border-red-700' : 'border-gray-700'
        }`}
      >
        <div className="flex items-start gap-4 mb-3">
          <div className="text-4xl">{enemy.isBoss ? '👹' : '👾'}</div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2
                className={`font-bold text-lg ${
                  enemy.isBoss ? 'text-red-400' : 'text-gray-100'
                }`}
              >
                {enemy.name}
              </h2>
              {poisonTurns > 0 && (
                <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                  ☠ 毒 {poisonTurns}T
                </span>
              )}
              {enemyAttackStacks > 0 && (
                <span className="text-xs bg-orange-900 text-orange-300 px-2 py-0.5 rounded-full">
                  ⚡ 攻撃+{enemyAttackStacks * 20}%
                </span>
              )}
              {enemyDefenseBonusTurns > 0 && (
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  🛡 防御↑ {enemyDefenseBonusTurns}T
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-2">{enemy.description}</p>
            <p className="text-orange-300 text-sm italic">&ldquo;{enemy.catchphrase}&rdquo;</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-red-400 text-sm font-bold w-8">HP</span>
          <div className="flex-1">
            <HpBar value={enemy.stats.hp} max={enemy.stats.maxHp} color={enemyHpColor} />
          </div>
          <span className="text-gray-300 text-sm w-20 text-right">
            {enemy.stats.hp}/{enemy.stats.maxHp}
          </span>
        </div>
      </div>

      {/* バトルログ */}
      <div
        ref={logRef}
        className="bg-gray-950 border border-gray-800 rounded-xl p-4 h-36 overflow-y-auto mb-4"
      >
        {logs.length === 0 ? (
          <p className="text-gray-600 text-sm text-center">バトル開始！</p>
        ) : (
          logs.map((log, i) => <LogEntry key={i} log={log} />)
        )}
      </div>

      {/* プレイヤーHP/MP */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-400 font-bold">HP</span>
              <span className="text-gray-300">
                {playerStats.hp}/{playerStats.maxHp}
              </span>
            </div>
            <HpBar value={playerStats.hp} max={playerStats.maxHp} color={playerHpColor} />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-blue-400 font-bold">MP</span>
                {barrierActive && (
                  <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded-full">
                    🛡 バリア中
                  </span>
                )}
                {playerSleepTurns > 0 && (
                  <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded-full animate-pulse">
                    💤 眠り {playerSleepTurns}T
                  </span>
                )}
              </div>
              <span className="text-gray-300">
                {playerStats.mp}/{playerStats.maxMp}
              </span>
            </div>
            <HpBar value={playerStats.mp} max={playerStats.maxMp} color="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* 眠り中UI */}
      {isPlayerTurn && playerSleepTurns > 0 && (
        <div className="mb-3 p-3 bg-indigo-950 border border-indigo-700 rounded-xl text-center">
          <p className="text-indigo-300 text-sm mb-2">💤 眠っていて動けない…（あと{playerSleepTurns}ターン）</p>
          <button
            onClick={() => onAction('pass')}
            className="w-full py-2 bg-indigo-800 hover:bg-indigo-700 border border-indigo-600 text-indigo-200 font-bold rounded-xl transition-all text-sm"
          >
            ターンをスキップ
          </button>
        </div>
      )}

      {/* コマンドボタン（2+2+1レイアウト） */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAction('attack')}
          disabled={!isPlayerTurn || isSleeping}
          className="py-4 bg-red-900/60 hover:bg-red-800/60 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed border border-red-700 disabled:border-gray-700 text-red-300 font-bold rounded-xl transition-all"
        >
          ⚔ 攻撃
        </button>

        <button
          onClick={() => onAction('magic')}
          disabled={!isPlayerTurn || isSleeping || playerStats.mp < def.magicMpCost}
          className="py-4 bg-purple-900/60 hover:bg-purple-800/60 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed border border-purple-700 disabled:border-gray-700 text-purple-300 font-bold rounded-xl transition-all"
        >
          ✨ {def.magicName}
          <span className="block text-xs font-normal text-purple-400 mt-0.5">
            MP {def.magicMpCost}
          </span>
        </button>

        {/* バリア */}
        <button
          onClick={() => onAction('barrier')}
          disabled={!isPlayerTurn || isSleeping || playerStats.mp < barrierMpCost || barrierActive}
          className="py-4 bg-blue-900/60 hover:bg-blue-800/60 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed border border-blue-700 disabled:border-gray-700 text-blue-300 font-bold rounded-xl transition-all"
        >
          🛡 バリア
          <span className="block text-xs font-normal text-blue-400 mt-0.5">
            {barrierActive ? '展開中' : `MP ${barrierMpCost}`}
          </span>
        </button>

        {/* アイテム */}
        {usableItems.length > 0 ? (
          <button
            onClick={() => setShowItemList((v) => !v)}
            disabled={!isPlayerTurn}
            className={`py-4 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed border font-bold rounded-xl transition-all ${
              showItemList
                ? 'bg-green-800/80 border-green-500 text-green-200'
                : 'bg-green-900/60 hover:bg-green-800/60 border-green-700 text-green-300'
            }`}
          >
            🧪 アイテム
            <span className="block text-xs font-normal text-green-400 mt-0.5">
              {usableItems.length}個所持
            </span>
          </button>
        ) : (
          <button
            disabled
            className="py-4 bg-gray-800 border border-gray-700 text-gray-600 font-bold rounded-xl cursor-not-allowed"
          >
            🧪 アイテムなし
          </button>
        )}

        {/* 逃げる（全幅） */}
        <button
          onClick={() => onAction('flee')}
          disabled={!isPlayerTurn || isSleeping}
          className="col-span-2 py-3 bg-gray-800/60 hover:bg-gray-700/60 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed border border-gray-600 disabled:border-gray-700 text-gray-300 font-bold rounded-xl transition-all"
        >
          💨 逃げる
        </button>
      </div>

      {/* アイテム選択リスト */}
      {showItemList && isPlayerTurn && (
        <div className="mt-3 bg-gray-900 border border-green-800 rounded-xl p-3 space-y-2">
          <p className="text-green-400 text-xs font-bold mb-2">── アイテムを選択 ──</p>
          {usableItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-200">
                  {itemTypeIcon[item.type]} {item.name}
                </div>
                <div className="text-xs text-gray-400 truncate">{item.description}</div>
              </div>
              <button
                onClick={() => {
                  onAction('item', item.id);
                  setShowItemList(false);
                }}
                className="ml-3 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                使う
              </button>
            </div>
          ))}
          <button
            onClick={() => setShowItemList(false)}
            className="w-full py-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ターン表示 */}
      {!isPlayerTurn && phase !== 'result' && (
        <div className="text-center mt-4 text-orange-400 animate-pulse">
          {enemy.name} のターン...
        </div>
      )}
    </div>
  );
}
