import { createAdminClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

/** プレイ開始: play_histories に INSERT → histId を返す */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('play_histories')
      .insert({ user_id: Number(userId), floor_reached: 1, is_clear: false })
      .select('id')
      .single();

    if (error) {
      console.error('[API] game/history POST error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ histId: String(data.id) });
  } catch (err) {
    console.error('[API] game/history POST unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** プレイ終了: play_histories を UPDATE */
export async function PATCH(req: NextRequest) {
  try {
    const { histId, floor, isCleared } = await req.json();
    if (!histId || floor == null || isCleared == null) {
      return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('play_histories')
      .update({ floor_reached: floor, is_clear: isCleared })
      .eq('id', Number(histId));

    if (error) {
      console.error('[API] game/history PATCH error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] game/history PATCH unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
