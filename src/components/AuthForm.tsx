'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';

interface AuthFormProps {
  onGuestPlay: () => void;
}

function validateUsername(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2)  return 'ユーザー名は2文字以上にしてください';
  if (trimmed.length > 20) return 'ユーザー名は20文字以内にしてください';
  return '';
}

function validatePassword(value: string): string {
  if (value.length < 8) return 'パスワードは8文字以上にしてください';
  return '';
}

export default function AuthForm({ onGuestPlay }: AuthFormProps) {
  const [mode, setMode] = useState<'top' | 'login' | 'register'>('top');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const usernameError = validateUsername(username);
    if (usernameError) { setError(usernameError); return; }

    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }

    setIsLoading(true);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
        return;
      }

      // セッションを localStorage に保存してゲームへ
      setSession({ userId: data.userId, username: data.username });
      router.push('/game');
    } catch {
      setError('通信エラーが発生しました。しばらくしてから再試行してください');
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'top') {
    return (
      <div className="space-y-3">
        <button
          onClick={onGuestPlay}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-lg transition-colors"
        >
          ゲストとして冒険する
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-bold rounded-xl transition-colors"
          >
            ログイン
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-bold rounded-xl transition-colors"
          >
            新規登録
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-gray-300 font-bold text-center">
        {mode === 'login' ? 'ログイン' : '新規登録'}
      </h3>

      <div>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ユーザー名（2〜20文字・日本語可）"
          autoComplete="username"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード（8文字以上）"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
      />

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
      >
        {isLoading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録'}
      </button>
      <button
        type="button"
        onClick={() => { setMode('top'); setError(''); }}
        className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        戻る
      </button>
    </form>
  );
}
