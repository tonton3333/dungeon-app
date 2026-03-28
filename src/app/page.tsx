'use client';

import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { initAudio } from '@/lib/audioContext';
import * as BGM from '@/lib/bgm';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    initAudio();
    BGM.startBGM('login');
    return () => { BGM.stopBGM(); };
  }, []);

  const handleGuestPlay = () => {
    router.push('/game');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* タイトル */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-amber-400 mb-2 tracking-wide drop-shadow-lg">
            Shadow Quest
          </h1>
          <h2 className="text-xl font-bold text-amber-300 tracking-widest mb-4">
            ～闇黒の迷宮～
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Claude AIが生み出す無限のダンジョンを探索せよ。<br />
            5層を踏破し、魔王を打倒せよ。
          </p>
        </div>

        {/* 特徴 */}
        <div className="grid grid-cols-3 gap-3 mb-8 text-center">
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <div className="text-2xl mb-1">🏰</div>
            <div className="text-gray-400 text-xs leading-tight">5層の<br />ダンジョン</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <div className="text-2xl mb-1">🤖</div>
            <div className="text-gray-400 text-xs leading-tight">AI生成<br />ストーリー</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-gray-400 text-xs">ランキング</div>
          </div>
        </div>

        {/* 認証フォーム */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <AuthForm onGuestPlay={handleGuestPlay} />
        </div>

        {/* ランキングリンク */}
        <div className="text-center mt-6">
          <Link
            href="/ranking"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            🏆 ランキングを見る
          </Link>
        </div>
      </div>
    </div>
  );
}
