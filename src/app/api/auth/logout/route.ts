// ログアウトはクライアントが localStorage を削除するだけで完結する。
// このエンドポイントは将来のサーバーサイドセッション管理拡張のためのプレースホルダー。
export async function POST() {
  return Response.json({ ok: true });
}
