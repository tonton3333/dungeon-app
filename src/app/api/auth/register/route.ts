import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  console.log('[auth/register] ===== リクエスト受信 =====');

  // --- 環境変数チェック ---
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('[auth/register] SUPABASE_URL:', url ? url.slice(0, 35) + '...' : '★未設定★');
  console.log('[auth/register] SERVICE_ROLE_KEY:', key ? `設定済み (${key.length}文字)` : '★未設定★');

  // --- リクエスト本文のパース ---
  let username: string, password: string;
  try {
    const body = await request.json();
    username = body.username;
    password = body.password;
    console.log('[auth/register] username:', JSON.stringify(username), '/ password.length:', password?.length ?? 0);
  } catch (e) {
    console.error('[auth/register] JSON parse error:', e);
    return Response.json({ error: 'リクエスト形式が正しくありません' }, { status: 400 });
  }

  // --- バリデーション ---
  const trimmed = (username ?? '').trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return Response.json({ error: 'ユーザー名は2〜20文字にしてください' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return Response.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
  }

  // --- Supabase クライアント作成 ---
  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
    console.log('[auth/register] Supabaseクライアント作成成功');
  } catch (e) {
    console.error('[auth/register] Supabaseクライアント作成失敗:', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }

  // --- 重複チェック ---
  console.log('[auth/register] 重複チェック中... username:', trimmed);
  const { data: existing, error: dupError } = await db
    .from('users')
    .select('id')
    .eq('username', trimmed)
    .maybeSingle();

  if (dupError) {
    console.error('[auth/register] 重複チェックエラー:', {
      message: dupError.message,
      code:    dupError.code,
      details: dupError.details,
      hint:    dupError.hint,
    });
    return Response.json({
      error: `DB接続エラー: ${dupError.message}`,
      code: dupError.code,
      hint: dupError.hint,
      detail: dupError.details,
    }, { status: 500 });
  }

  console.log('[auth/register] 重複チェック完了:', existing ? '既存ユーザーあり' : '新規OK');
  if (existing) {
    return Response.json({ error: 'このユーザー名は既に使われています' }, { status: 409 });
  }

  // --- bcrypt ハッシュ化 ---
  console.log('[auth/register] bcrypt hash 開始 (cost=12)...');
  const password_hash = await bcrypt.hash(password, 12);
  console.log('[auth/register] bcrypt hash 完了');

  // --- INSERT ---
  console.log('[auth/register] users テーブルに INSERT...');
  const { data, error } = await db
    .from('users')
    .insert({ username: trimmed, password_hash })
    .select('id, username')
    .single();

  if (error) {
    console.error('[auth/register] INSERT エラー:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    });
    return Response.json({
      error: `登録エラー: ${error.message}`,
      code: error.code,
      hint: error.hint,
    }, { status: 500 });
  }

  console.log('[auth/register] ✅ 登録成功! userId:', data.id, 'username:', data.username);
  return Response.json({ userId: data.id as string, username: data.username as string });
}
