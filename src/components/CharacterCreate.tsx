'use client';

import { useState } from 'react';
import { JobClass, JOB_DEFINITIONS } from '@/types/game';

interface CharacterCreateProps {
  onComplete: (name: string, jobClass: JobClass) => void;
  isLoading: boolean;
  onBack?: () => void;
}

const JOB_ICONS: Record<JobClass, string> = {
  warrior: '⚔️',
  mage: '🔮',
  thief: '🗡️',
};

export default function CharacterCreate({ onComplete, isLoading, onBack }: CharacterCreateProps) {
  const [name, setName] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobClass | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }
    if (!selectedJob) {
      setError('職業を選んでください');
      return;
    }
    setError('');
    onComplete(name.trim(), selectedJob);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* 戻るボタン */}
        {onBack && (
          <div className="mb-4">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              ← タイトルへ戻る
            </button>
          </div>
        )}

        {/* タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400 mb-1 tracking-wide">
            Shadow Quest
          </h1>
          <p className="text-amber-300 text-sm tracking-widest mb-2">～闇黒の迷宮～</p>
          <p className="text-gray-400">キャラクターを作成して冒険を始めよう</p>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
          {/* 名前入力 */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              冒険者の名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="例: アレン"
              maxLength={12}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {/* 職業選択 */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-3">職業を選択</label>
            <div className="space-y-3">
              {(Object.keys(JOB_DEFINITIONS) as JobClass[]).map((job) => {
                const def = JOB_DEFINITIONS[job];
                const isSelected = selectedJob === job;
                return (
                  <button
                    key={job}
                    onClick={() => setSelectedJob(job)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-900/30'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{JOB_ICONS[job]}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-100">{def.label}</span>
                          {isSelected && (
                            <span className="text-amber-400 text-xs">選択中</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{def.description}</p>
                        {isSelected && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                            <span className="text-red-400">
                              HP: {def.baseStats.maxHp}
                            </span>
                            <span className="text-blue-400">
                              MP: {def.baseStats.maxMp}
                            </span>
                            <span className="text-orange-400">
                              攻撃: {def.baseStats.attack}
                            </span>
                            <span className="text-cyan-400">
                              防御: {def.baseStats.defense}
                            </span>
                            <span className="text-purple-400">
                              魔法: {def.magicName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* エラー */}
          {error && (
            <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
          )}

          {/* 開始ボタン */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg text-lg transition-colors"
          >
            {isLoading ? '準備中...' : '冒険を始める'}
          </button>
        </div>
      </div>
    </div>
  );
}
