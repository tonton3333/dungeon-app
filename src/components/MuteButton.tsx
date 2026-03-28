'use client';

import { useState, useEffect } from 'react';
import * as BGM from '@/lib/bgm';

const MUTE_KEY = 'dungeon-sound-muted';

export default function MuteButton() {
  const [muted, setMuted] = useState(false);

  // マウント時に localStorage から初期状態を読み込む
  useEffect(() => {
    const stored = localStorage.getItem(MUTE_KEY);
    const initial = stored === '1';
    setMuted(initial);
    BGM.setBGMMuted(initial);
  }, []);

  const toggle = () => {
    setMuted(prev => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      BGM.setBGMMuted(next);
      // 同一タブ内の他コンポーネント（game/page.tsx の SE ガード）へ通知
      window.dispatchEvent(new CustomEvent('mutechange', { detail: { muted: next } }));
      return next;
    });
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-3 right-3 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-lg transition-colors"
      title={muted ? 'サウンドON' : 'サウンドOFF'}
      aria-label={muted ? 'サウンドON' : 'サウンドOFF'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
