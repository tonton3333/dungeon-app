'use client';

import { Character, JOB_DEFINITIONS } from '@/types/game';

interface StatusBarProps {
  character: Character;
  floor: number;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function StatusBar({ character, floor }: StatusBarProps) {
  const { stats, level, exp, expToNext, jobClass, name, equippedWeapon, equippedArmor, items } =
    character;
  const jobLabel = JOB_DEFINITIONS[jobClass].label;

  const hpColor =
    stats.hp / stats.maxHp > 0.5
      ? 'bg-green-500'
      : stats.hp / stats.maxHp > 0.25
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-3">
      <div className="max-w-2xl mx-auto">
        {/* 上段: 名前・職業・階層 */}
        <div className="flex justify-between items-center mb-2 pr-10 sm:pr-0">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold text-lg">{name}</span>
            <span className="text-gray-400 text-sm">{jobLabel}</span>
            <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded text-xs font-bold">
              Lv.{level}
            </span>
          </div>
          <div className="text-cyan-400 font-bold">
            <span className="text-gray-400 text-sm">第</span>
            <span className="text-xl">{floor}</span>
            <span className="text-gray-400 text-sm">層</span>
          </div>
        </div>

        {/* 中段: HP・MP・EXP */}
        <div className="grid grid-cols-3 gap-3 mb-1">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-red-400 font-bold">HP</span>
              <span className="text-gray-300">
                {stats.hp}/{stats.maxHp}
              </span>
            </div>
            <Bar value={stats.hp} max={stats.maxHp} color={hpColor} />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-blue-400 font-bold">MP</span>
              <span className="text-gray-300">
                {stats.mp}/{stats.maxMp}
              </span>
            </div>
            <Bar value={stats.mp} max={stats.maxMp} color="bg-blue-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-yellow-400 font-bold">EXP</span>
              <span className="text-gray-300">
                {exp}/{expToNext}
              </span>
            </div>
            <Bar value={exp} max={expToNext} color="bg-yellow-500" />
          </div>
        </div>

        {/* 下段: ステータス・装備・所持アイテム数 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
          <span>
            攻撃: <span className="text-orange-400">{stats.attack}</span>
          </span>
          <span>
            防御: <span className="text-cyan-400">{stats.defense}</span>
          </span>
          <span>
            速度: <span className="text-green-400">{stats.speed}</span>
          </span>
          {equippedWeapon && (
            <span className="text-orange-300 max-w-[120px] truncate">⚔ {equippedWeapon.name}</span>
          )}
          {equippedArmor && (
            <span className="text-cyan-300 max-w-[120px] truncate">🛡 {equippedArmor.name}</span>
          )}
          <span className="ml-auto">
            🎒 <span className="text-gray-300">{items.length}/8</span>
          </span>
        </div>
      </div>
    </div>
  );
}
