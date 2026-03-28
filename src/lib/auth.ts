/**
 * クライアント側セッション管理
 * ログイン情報を localStorage に保存・読み込み・削除する
 */

export interface SessionUser {
  userId: string;
  username: string;
}

const SESSION_KEY = 'dungeon_session';

/** localStorage からセッション情報を取得。未ログインまたはSSRの場合は null */
export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/** localStorage にセッション情報を保存 */
export function setSession(user: SessionUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** localStorage からセッション情報を削除（ログアウト） */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
