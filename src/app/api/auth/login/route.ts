import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  console.log('[auth/login] ===== リクエスト受信 =====');

  let username: string, password: string;
  try {
    const body = await request.json();
    username = body.username;
    password = body.password;
    console.log('[auth/login] username:', JSON.stringify(username));
  } catch (e) {
    console.error('[auth/login] JSON parse error:', e);
    return Response.json({ error: 'リクエスト形式が正しくありません' }, { status: 400 });
  }

  const trimmed = (username ?? '').trim();
  if (!trimmed || !password) {
    return Response.json({ error: 'ユーザー名とパスワードを入力してください' }, { status: 400 });
  }

  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch (e) {
    console.error('[auth/login] Supabaseクライアント作成失敗:', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }

  console.log('[auth/login] ユーザー検索中...');
  const { data: user, error } = await db
    .from('users')
    .select('id, username, password_hash')
    .eq('username', trimmed)
    .maybeSingle();

  if (error) {
    console.error('[auth/login] SELECT エラー:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return Response.json({ error: `DBエラー: ${error.message}` }, { status: 500 });
  }

  console.log('[auth/login] ユーザー検索結果:', user ? '見つかった' : '見つからない');

  // ユーザー不在 or パスワード不一致（同一エラーで情報漏洩防止）
  const valid = user ? await bcrypt.compare(password, user.password_hash as string) : false;
  if (!user || !valid) {
    console.log('[auth/login] 認証失敗');
    return Response.json({ error: 'ユーザー名またはパスワードが正しくありません' }, { status: 401 });
  }

  console.log('[auth/login] ✅ ログイン成功! userId:', user.id);
  return Response.json({ userId: user.id as string, username: user.username as string });
}
