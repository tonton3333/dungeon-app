'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RankingEntry, JOB_DEFINITIONS } from '@/types/game';
import { fetchRankings } from '@/lib/supabase';

const RANKING_KEY = 'dungeon-ranking';

const JOB_ICONS: Record<string, string> = {
  warrior: '⚔️',
  mage: '🔮',
  thief: '🗡️',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function RankRow({ entry, rank }: { entry: RankingEntry; rank: number }) {
  const jobLabel = JOB_DEFINITIONS[entry.jobClass]?.label ?? entry.jobClass;
  const jobIcon = JOB_ICONS[entry.jobClass] ?? '❓';
  const date = new Date(entry.createdAt).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
        entry.trueClear
          ? 'bg-purple-900/20 border-purple-700/50'
          : entry.isCleared
          ? 'bg-amber-900/20 border-amber-700/50'
          : 'bg-gray-900 border-gray-800'
      }`}
    >
      <div className="w-8 text-center text-lg font-bold">
        {rank <= 3 ? RANK_MEDALS[rank - 1] : <span className="text-gray-500">{rank}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-gray-100 truncate">{entry.characterName}</span>
          {entry.trueClear ? (
            <span className="text-purple-300 text-xs font-bold bg-purple-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
              💎 TRUE CLEAR
            </span>
          ) : entry.isCleared ? (
            <span className="text-amber-400 text-xs font-bold bg-amber-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
              CLEAR
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{jobIcon} {jobLabel}</span>
          <span>Lv.{entry.level}</span>
          <span>{entry.playerName}</span>
          <span>
            {entry.trueClear ? `全${entry.floor}層真クリア` : entry.isCleared ? `全${entry.floor}層クリア` : `第${entry.floor}層で力尽きる`}
          </span>
        </div>
      </div>

      <div className="text-right">
        <div className={`font-bold text-lg ${entry.trueClear ? 'text-purple-300' : 'text-amber-400'}`}>
          {entry.score.toLocaleString()}
        </div>
        <div className="text-gray-600 text-xs">{date}</div>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [source, setSource] = useState<'db' | 'local' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);

      // 1. Supabase から取得を試みる
      try {
        const dbEntries = await fetchRankings();
        if (dbEntries.length > 0) {
          setEntries(dbEntries);
          setSource('db');
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('[Ranking] Supabase fetch failed, falling back to localStorage:', err);
      }

      // 2. フォールバック: localStorage から取得
      try {
        const raw = localStorage.getItem(RANKING_KEY);
        if (raw) {
          const data: RankingEntry[] = JSON.parse(raw);
          const sorted = data.sort((a, b) => b.score - a.score).slice(0, 50);
          setEntries(sorted);
          setSource('local');
        }
      } catch (err) {
        console.error('[Ranking] localStorage parse failed:', err);
        setEntries([]);
      }

      setIsLoading(false);
    }

    load();
  }, []);

  const clearCount = entries.filter((e) => e.isCleared).length;
  const trueClearCount = entries.filter((e) => e.trueClear).length;
  const topScore = entries[0]?.score ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← 戻る
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-amber-400 tracking-widest">🏆 RANKING</h1>
            <p className="text-amber-700 text-xs tracking-wider">Shadow Quest</p>
          </div>
          <Link
            href="/game"
            className="text-sm bg-amber-700 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors font-bold"
          >
            プレイ
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* データソース表示 */}
        {!isLoading && entries.length > 0 && (
          <div className="text-center text-xs text-gray-600 mb-4">
            {source === 'db' ? '🌐 Supabase DB から取得' : '💾 ローカルデータ（ゲストプレイ）'}
          </div>
        )}

        {/* ローディング */}
        {isLoading && (
          <div className="text-center py-20 text-gray-500">読み込み中...</div>
        )}

        {/* サマリー */}
        {!isLoading && entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{entries.length}</div>
              <div className="text-gray-500 text-xs mt-1">総記録数</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{clearCount}</div>
              <div className="text-gray-500 text-xs mt-1">クリア数</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {topScore.toLocaleString()}
              </div>
              <div className="text-gray-500 text-xs mt-1">最高スコア</div>
            </div>
            {trueClearCount > 0 && (
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-4 text-center col-span-3">
                <div className="text-2xl font-bold text-purple-300">💎 {trueClearCount}</div>
                <div className="text-gray-500 text-xs mt-1">真クリア達成</div>
              </div>
            )}
          </div>
        )}

        {/* ランキングリスト */}
        {!isLoading && entries.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📜</div>
            <p className="text-gray-500 mb-6">まだ記録がありません</p>
            <Link
              href="/game"
              className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
            >
              冒険を始める
            </Link>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <RankRow key={entry.id} entry={entry} rank={i + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
