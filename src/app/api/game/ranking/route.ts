import { createAdminClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { character, userId, username, floor, isCleared, trueClear, score } = await req.json();
    if (!character || !userId || !username || floor == null || isCleared == null || score == null) {
      return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('rankings').insert({
      user_id:        Number(userId),
      username,
      character_name: character.name,
      job:            character.jobClass,
      floor_reached:  floor,
      is_clear:       isCleared,
      true_clear:     trueClear ?? false,
      score,
    });

    if (error) {
      console.error('[API] game/ranking error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] game/ranking unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
