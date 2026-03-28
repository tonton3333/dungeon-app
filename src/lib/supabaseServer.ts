/**
 * サーバー専用 Supabase クライアント（service role key 使用）
 * API Route 内でのみ使用すること。クライアントコンポーネントで import 禁止。
 */
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Supabase 環境変数が未設定です。URL: ${url ? 'OK' : '★未設定★'}, SERVICE_ROLE_KEY: ${key ? 'OK' : '★未設定★'}`
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 後方互換のためのシングルトンエクスポート（廃止予定）
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);
