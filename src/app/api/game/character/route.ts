import { createAdminClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { character, userId } = await req.json();
    if (!character || !userId) {
      return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('characters').upsert(
      {
        user_id:     Number(userId),
        name:        character.name,
        job:         character.jobClass,
        level:       character.level,
        hp:          character.stats.hp,
        max_hp:      character.stats.maxHp,
        mp:          character.stats.mp,
        max_mp:      character.stats.maxMp,
        experience:  character.exp,
        weapon_slot: character.equippedWeapon ?? null,
        armor_slot:  character.equippedArmor ?? null,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('[API] game/character error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] game/character unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
