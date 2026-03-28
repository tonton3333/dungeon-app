/**
 * 認証システム診断エンドポイント（開発環境専用）
 * GET /api/auth/debug でDBとenv varの状態を確認する
 */
import { createAdminClient } from '@/lib/supabaseServer';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. 環境変数
  results.env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : '★未設定★',
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? `OK (${process.env.SUPABASE_SERVICE_ROLE_KEY.length}文字)`
      : '★未設定★',
  };

  // 2. Supabaseクライアント接続テスト
  try {
    const db = createAdminClient();
    results.client = 'OK';

    // 3. users テーブルの存在確認
    const { data, error } = await db
      .from('users')
      .select('count')
      .limit(0);

    if (error) {
      results.users_table = {
        status: 'ERROR',
        message: error.message,
        code: error.code,
        hint: error.hint,
        detail: error.details,
      };
    } else {
      results.users_table = { status: 'OK', data };
    }
  } catch (e) {
    results.client = { status: 'ERROR', message: String(e) };
  }

  return Response.json(results, {
    headers: { 'Content-Type': 'application/json' },
  });
}
