'use client';

import { useState } from 'react';
import { Character, FloorEvent, Item } from '@/types/game';
import { TOTAL_FLOORS, BOSS_FLOOR, EXTRA_BOSS_FLOOR } from '@/lib/gameLogic';

interface DungeonViewProps {
  character: Character;
  floor: number;
  narration: string;
  currentEvent: FloorEvent | null;
  explorationCount: number;
  message: string;
  isLoading: boolean;
  onExplore: () => void;
  onNextFloor: () => void;
  onEventContinue: () => void;
  onEquipItem: (itemId: string) => void;
  onUseItem: (itemId: string) => void;
  onDiscardItem: (itemId: string) => void;
}

function ItemCard({
  item, onEquip, onUse, onDiscard,
}: {
  item: Item;
  onEquip: () => void;
  onUse: () => void;
  onDiscard: () => void;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const icons: Record<string, string> = { potion: '🧪', mp_potion: '🔮', weapon: '⚔️', armor: '🛡️', offensive: '💣' };
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2 text-sm">
      <div className="flex-1 min-w-0 mr-2">
        <div className="text-gray-200 truncate">
          {icons[item.type] ?? '📦'} {item.name}
        </div>
        <div className="text-gray-500 text-xs truncate">{item.description}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {(item.type === 'potion' || item.type === 'mp_potion') && !confirmDiscard && (
          <button
            onClick={onUse}
            className="text-xs bg-green-800 hover:bg-green-700 text-green-300 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
          >
            使う
          </button>
        )}
        {(item.type === 'weapon' || item.type === 'armor') && !confirmDiscard && (
          <button
            onClick={onEquip}
            className="text-xs bg-amber-700 hover:bg-amber-600 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
          >
            装備
          </button>
        )}
        {item.type === 'offensive' && !confirmDiscard && (
          <span className="text-xs text-gray-500 whitespace-nowrap">バトルで使用</span>
        )}
        {confirmDiscard ? (
          <>
            <button
              onClick={() => { onDiscard(); setConfirmDiscard(false); }}
              className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded transition-colors whitespace-nowrap"
            >
              捨てる？
            </button>
            <button
              onClick={() => setConfirmDiscard(false)}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-0.5 rounded transition-colors"
            >
              ✕
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDiscard(true)}
            className="text-xs text-gray-600 hover:text-red-400 px-1 py-0.5 rounded transition-colors"
            title="捨てる"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

function EventPanel({ event, onContinue }: { event: FloorEvent; onContinue: () => void }) {
  const eventIcons: Record<string, string> = {
    treasure: '💰',
    trap: '⚠️',
    npc: '👤',
    empty: '🌀',
    enemy: '💀',
    boss: '👹',
  };

  return (
    <div className="bg-gray-900 border border-gray-600 rounded-xl p-5 mb-4">
      <div className="text-center text-3xl mb-3">{eventIcons[event.type]}</div>
      <p className="text-gray-200 text-center leading-relaxed mb-4 italic">
        &ldquo;{event.narration}&rdquo;
      </p>

      {event.type === 'treasure' && event.item && (
        <div className="bg-amber-900/40 border border-amber-700 rounded-lg p-3 mb-4 text-center">
          <p className="text-amber-400 font-bold">
            {event.item.type === 'potion' ? '🧪' : event.item.type === 'mp_potion' ? '🔮' : event.item.type === 'weapon' ? '⚔️' : event.item.type === 'armor' ? '🛡️' : '💣'}{' '}
            {event.item.name} を入手！
          </p>
          <p className="text-gray-400 text-sm mt-1">{event.item.description}</p>
        </div>
      )}

      {event.type === 'trap' && event.trapDamage && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 mb-4 text-center">
          <p className="text-red-400 font-bold">⚡ {event.trapDamage} ダメージ！</p>
        </div>
      )}

      {event.type === 'npc' && event.npcMessage && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-4">
          <p className="text-green-300 text-center">{event.npcMessage}</p>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 font-bold rounded-lg transition-colors"
      >
        続ける →
      </button>
    </div>
  );
}

export default function DungeonView({
  character,
  floor,
  narration,
  currentEvent,
  explorationCount,
  message,
  isLoading,
  onExplore,
  onNextFloor,
  onEventContinue,
  onEquipItem,
  onUseItem,
  onDiscardItem,
}: DungeonViewProps) {
  const [showPotionList, setShowPotionList] = useState(false);
  const canAdvance = (floor < TOTAL_FLOORS || (floor > BOSS_FLOOR && floor < EXTRA_BOSS_FLOOR)) && explorationCount >= 3;
  const canBossChallenge = (floor === BOSS_FLOOR || floor === EXTRA_BOSS_FLOOR) && explorationCount >= 2;
  const isFinalFloor = floor === BOSS_FLOOR || floor === EXTRA_BOSS_FLOOR;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* フロアナレーション */}
      {narration && !currentEvent && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
          <div className="text-center text-amber-400 font-bold mb-2 text-sm tracking-wider">
            ── 第 {floor} 層 ──
          </div>
          <p className="text-gray-300 text-center leading-relaxed italic text-sm">
            &ldquo;{narration}&rdquo;
          </p>
        </div>
      )}

      {/* イベントパネル */}
      {currentEvent && (
        <EventPanel event={currentEvent} onContinue={onEventContinue} />
      )}

      {/* メッセージ */}
      {message && !currentEvent && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-4 text-center text-green-300 text-sm">
          {message}
        </div>
      )}

      {/* 探索アクション */}
      {!currentEvent && (
        <div className="space-y-3 mb-6">
          <button
            onClick={onExplore}
            disabled={isLoading}
            className="w-full py-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500 text-gray-100 font-bold rounded-xl text-lg transition-all"
          >
            {isLoading ? '探索中...' : '⚔ ダンジョンを探索する'}
          </button>

          {canAdvance && !isFinalFloor && (
            <button
              onClick={onNextFloor}
              disabled={isLoading}
              className="w-full py-3 bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700 text-purple-300 font-bold rounded-xl transition-all"
            >
              🔽 次の階層へ進む（第 {floor + 1} 層）
            </button>
          )}

          {canBossChallenge && isFinalFloor && (
            <button
              onClick={onExplore}
              disabled={isLoading}
              className="w-full py-3 bg-red-900/50 hover:bg-red-800/50 border border-red-700 text-red-300 font-bold rounded-xl animate-pulse transition-all"
            >
              👹 ボスに挑む
            </button>
          )}

          {/* 回復アイテム使用 */}
          {(() => {
            const potions = character.items.filter((i) => i.type === 'potion' || i.type === 'mp_potion');
            return (
              <>
                <button
                  onClick={() => setShowPotionList((v) => !v)}
                  disabled={potions.length === 0}
                  className={`w-full py-2 text-sm font-bold rounded-xl border transition-all disabled:bg-gray-900 disabled:border-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed ${
                    showPotionList
                      ? 'bg-green-900/60 border-green-600 text-green-300'
                      : 'bg-gray-900/60 hover:bg-green-900/30 border-gray-700 hover:border-green-800 text-gray-400 hover:text-green-400'
                  }`}
                >
                  {potions.length === 0 ? '🧪 回復薬なし' : `🧪 アイテムを使う（回復薬 ${potions.length}個）`}
                </button>
                {showPotionList && potions.length > 0 && (
                  <div className="bg-gray-900 border border-green-800 rounded-xl p-3 space-y-2">
                    {potions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
                      >
                        <div>
                          <span className="text-sm text-gray-200">
                            {item.type === 'mp_potion' ? '🔮' : '🧪'} {item.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {item.value > 0 ? `+${item.value} ${item.type === 'mp_potion' ? 'MP' : 'HP'}` : '眠り回復'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onUseItem(item.id);
                            setShowPotionList(false);
                          }}
                          className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          使う
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowPotionList(false)}
                      className="w-full py-1 text-gray-500 hover:text-gray-300 text-xs transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 探索ヒント */}
      {!currentEvent && (
        <div className="text-center text-xs text-gray-600 mb-6">
          探索回数: {explorationCount}回
          {!canAdvance && !isFinalFloor && floor < TOTAL_FLOORS && (
            <span className="ml-2">（次の階へは3回以上の探索が必要）</span>
          )}
        </div>
      )}

      {/* インベントリ */}
      {character.items.length > 0 && !currentEvent && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <h3 className="text-gray-400 text-sm font-bold mb-3">所持アイテム</h3>
          <div className="space-y-2">
            {character.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEquip={() => onEquipItem(item.id)}
                onUse={() => { onUseItem(item.id); }}
                onDiscard={() => onDiscardItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
