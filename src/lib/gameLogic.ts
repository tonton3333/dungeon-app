import {
  Character,
  CharacterStats,
  Enemy,
  Item,
  JobClass,
  BattleState,
  BattleLog,
  FloorEvent,
  FloorEventType,
  JOB_DEFINITIONS,
  calculateScore,
} from '@/types/game';

// ========== 定数 ==========

export const TOTAL_FLOORS = 5;
export const BOSS_FLOOR = TOTAL_FLOORS;
export const EXTRA_BOSS_FLOOR = 10;
export const MAX_ITEMS = 8;

// ========== 敵テンプレート型 ==========

interface EnemyTemplate {
  name: string;
  description: string;
  catchphrase: string;
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  exp: number;
}

// ========== キャラクター作成 ==========

export function createCharacter(name: string, jobClass: JobClass): Character {
  const def = JOB_DEFINITIONS[jobClass];
  return {
    id: crypto.randomUUID(),
    name,
    jobClass,
    level: 1,
    exp: 0,
    expToNext: 100,
    stats: { ...def.baseStats },
    items: [createPotion('小さな回復薬', 30)],
    equippedWeapon: null,
    equippedArmor: null,
    floor: 1,
  };
}

// ========== アイテム生成 ==========

export function createPotion(name: string, healAmount: number): Item {
  return {
    id: crypto.randomUUID(),
    name,
    type: 'potion',
    description: `HPを${healAmount}回復する。`,
    value: healAmount,
  };
}

export function createWeapon(name: string, attackBonus: number): Item {
  return {
    id: crypto.randomUUID(),
    name,
    type: 'weapon',
    description: `攻撃力が${attackBonus}上がる。`,
    value: attackBonus,
  };
}

export function createArmor(name: string, defenseBonus: number): Item {
  return {
    id: crypto.randomUUID(),
    name,
    type: 'armor',
    description: `防御力が${defenseBonus}上がる。`,
    value: defenseBonus,
  };
}

export function createAwakenPotion(): Item {
  return {
    id: crypto.randomUUID(),
    name: '目覚めの薬',
    type: 'potion',
    description: '眠りを即座に覚ます。',
    value: 0,
    specialEffect: 'awaken',
  };
}

export function createEther(): Item {
  return {
    id: crypto.randomUUID(),
    name: 'エーテル',
    type: 'mp_potion',
    description: 'MPを30回復する。',
    value: 30,
  };
}

export function createElixir(character?: { stats: { maxMp: number } }): Item {
  const value = character?.stats.maxMp ?? 999;
  return {
    id: crypto.randomUUID(),
    name: 'エリクサー',
    type: 'mp_potion',
    description: 'MPを全回復する。',
    value,
  };
}

export function createFireBomb(floor: number): Item {
  const dmg = 30 + floor * 5;
  return {
    id: crypto.randomUUID(),
    name: '火炎瓶',
    type: 'offensive',
    description: `敵に約${dmg}の炎ダメージを与える。`,
    value: dmg,
  };
}

export function createThunderScroll(floor: number): Item {
  const dmg = 50 + floor * 8;
  return {
    id: crypto.randomUUID(),
    name: '雷の巻物',
    type: 'offensive',
    description: `敵に約${dmg}の雷ダメージを与える。`,
    value: dmg,
  };
}

export function createPoisonArrow(floor: number): Item {
  const poisonDmg = 10 + floor * 3;
  return {
    id: crypto.randomUUID(),
    name: '毒の矢',
    type: 'offensive',
    description: `敵を毒状態にし、3ターン連続で${poisonDmg}のダメージを与える。`,
    value: poisonDmg,
    offensiveEffect: 'poison',
  };
}

export function createBomb(floor: number): Item {
  const dmg = 40 + floor * 6;
  return {
    id: crypto.randomUUID(),
    name: '爆弾',
    type: 'offensive',
    description: `敵に約${dmg}のダメージ。ボスには特に効果的（約1.8倍）。`,
    value: dmg,
    offensiveEffect: 'boss_bonus',
  };
}

// ========== バリアMPコスト ==========
export const BARRIER_MP_COST: Record<JobClass, number> = {
  warrior: 8,
  mage:    4,
  thief:   6,
};

// ========== 敵生成（フォールバック用 — Claude APIなしの基本実装） ==========

const FLOOR_ENEMY_TEMPLATES: Record<number, EnemyTemplate[]> = {
  1: [
    { name: 'スライム', description: 'ぷるぷると震える青いスライム。', catchphrase: 'ぷるぷる！', hp: 30, mp: 0, attack: 5, defense: 2, exp: 20 },
    { name: 'コウモリ', description: '翼をはためかせて突進してくる。', catchphrase: 'キィィィ！', hp: 25, mp: 0, attack: 7, defense: 1, exp: 18 },
    { name: 'ゴブリン', description: 'ニヤリと笑う小柄な魔物。', catchphrase: 'うひひひ！', hp: 40, mp: 0, attack: 8, defense: 3, exp: 25 },
  ],
  2: [
    { name: 'ウルフ', description: '牙を剥き出しにして唸る狼型魔物。', catchphrase: 'ガウウウ！', hp: 60, mp: 0, attack: 12, defense: 4, exp: 45 },
    { name: 'ゾンビ', description: '腐敗した体で近づいてくる不死の魔物。', catchphrase: '...うーっ...', hp: 80, mp: 0, attack: 10, defense: 6, exp: 50 },
    { name: 'コボルト', description: '集団行動を好む犬頭の魔物。', catchphrase: 'やっつけろ！', hp: 55, mp: 0, attack: 11, defense: 5, exp: 40 },
  ],
  3: [
    { name: 'リザードマン', description: '鱗に覆われた強靭な体を持つ魔物。', catchphrase: 'お前の肉をいただく！', hp: 100, mp: 0, attack: 18, defense: 10, exp: 80 },
    { name: 'ダークエルフ', description: '闇魔法を操る邪悪なエルフ。', catchphrase: '消えてなくなれ！', hp: 80, mp: 40, attack: 15, defense: 8, exp: 85 },
    { name: 'ストーンゴーレム', description: '巨大な石の体を持つ人形。動きは遅い。', catchphrase: '...（轟音）...', hp: 130, mp: 0, attack: 20, defense: 18, exp: 90 },
  ],
  4: [
    { name: 'バンシー', description: '断末魔の叫びで正気を奪う霊的存在。', catchphrase: '魂を寄越せェェェ！', hp: 110, mp: 60, attack: 22, defense: 12, exp: 120 },
    { name: 'ミノタウロス', description: '巨大な斧を振り回す牛頭の戦士。', catchphrase: 'オォォォォ！', hp: 160, mp: 0, attack: 28, defense: 15, exp: 130 },
    { name: 'ネクロマンサー', description: '死者を操る邪悪な魔術師。', catchphrase: '死は終わりではない！', hp: 90, mp: 80, attack: 20, defense: 10, exp: 125 },
  ],
  5: [
    { name: 'ドラゴンゾンビ', description: '死してなお竜の力を持つ恐るべき存在。', catchphrase: 'この炎で焼き尽くしてやる！', hp: 200, mp: 50, attack: 35, defense: 20, exp: 200 },
    { name: 'ヴァンパイアロード', description: '古の血の王、全ての吸血鬼の支配者。', catchphrase: '貴様の血は私のものだ！', hp: 180, mp: 80, attack: 32, defense: 22, exp: 210 },
  ],
};

const BOSS: EnemyTemplate = {
  name: '魔王ダークロード',
  description: 'ダンジョンの最深部に君臨する絶対的な悪の王。その力は計り知れない。',
  catchphrase: 'ふははは！よくぞここまで来た。だが、貴様の旅はここで終わりだ！',
  hp: 500,
  mp: 200,
  attack: 50,
  defense: 35,
  exp: 1000,
};

// ========== エクストラステージ（6〜10F）==========

const EXTRA_FLOOR_ENEMY_TEMPLATES: Record<number, EnemyTemplate[]> = {
  6: [
    { name: '冥界の騎士', description: '死者の国から召喚された漆黒の騎士。', catchphrase: '貴様は来るべきではなかった！', hp: 280, mp: 0, attack: 48, defense: 26, exp: 300 },
    { name: '魔獣ヘルウルフ', description: '地獄の炎に包まれた巨大な狼型魔物。', catchphrase: 'グオォォォ！', hp: 250, mp: 0, attack: 45, defense: 23, exp: 280 },
    { name: '呪われた魔術師', description: '禁忌の魔法を操る闇の賢者。', catchphrase: '貴様の魂を贄に捧げよ！', hp: 230, mp: 100, attack: 52, defense: 20, exp: 290 },
  ],
  7: [
    { name: '地獄の炎竜', description: '業火を吐き出す深紅の竜。鱗は溶岩より硬い。', catchphrase: '塵となれ！', hp: 340, mp: 0, attack: 55, defense: 30, exp: 380 },
    { name: '影の暗殺者', description: '影そのものから生まれた存在。一撃で急所を貫く。', catchphrase: '...（無言の斬撃）', hp: 300, mp: 0, attack: 60, defense: 27, exp: 360 },
    { name: '骨の王', description: '無数の死者の骨から成る不死の支配者。', catchphrase: '死は始まりに過ぎぬ！', hp: 360, mp: 50, attack: 52, defense: 33, exp: 390 },
  ],
  8: [
    { name: '混沌の精霊', description: '存在自体が理の崩壊を引き起こす上位精霊。', catchphrase: '現実が溶けていくぞ！', hp: 400, mp: 120, attack: 63, defense: 35, exp: 480 },
    { name: '深淵の悪魔', description: '深淵の底から這い出た七大悪魔の一柱。', catchphrase: '絶望を味わえ！', hp: 420, mp: 100, attack: 60, defense: 38, exp: 500 },
    { name: '禁忌の魔神', description: '封印されていた古の神。解放された怒りは計り知れない。', catchphrase: '何千年もの怒りを受けてみよ！', hp: 380, mp: 150, attack: 68, defense: 32, exp: 490 },
  ],
  9: [
    { name: '虚無の支配者', description: '「無」を操る存在。触れたものは消滅する。', catchphrase: '全ては虚無に帰す…', hp: 480, mp: 200, attack: 75, defense: 43, exp: 600 },
    { name: '終焉の騎士王', description: '世界の終わりを告げる最後の騎士。その剣は滅びを纏う。', catchphrase: '覚悟せよ。これが終焉だ！', hp: 500, mp: 100, attack: 73, defense: 45, exp: 620 },
    { name: '滅びの預言者', description: '滅亡の未来を見た者。全てを諦め、ただ破壊を求める。', catchphrase: '貴様の未来も…終わりだ', hp: 460, mp: 250, attack: 78, defense: 40, exp: 610 },
  ],
};

const TRUE_BOSS = {
  name: '混沌神カオスロード',
  description: 'この世界の創造と終焉を司る混沌の原初神。その力は概念の域に達し、存在するだけで空間が歪む。',
  catchphrase: '…なぜ、まだ生きている。これほどの深淵まで辿り着いた者は初めてだ。だが——ここが終わりだ！',
  hp: 1200,
  mp: 500,
  attack: 95,
  defense: 55,
  exp: 5000,
};

function buildEnemyFromTemplate(
  tmpl: EnemyTemplate,
  speed: number,
  luck: number,
  itemDrop: Item | null,
  isBoss = false,
): Enemy {
  return {
    id: crypto.randomUUID(),
    name: tmpl.name,
    description: tmpl.description,
    catchphrase: tmpl.catchphrase,
    stats: {
      hp: tmpl.hp,
      maxHp: tmpl.hp,
      mp: tmpl.mp,
      maxMp: tmpl.mp,
      attack: tmpl.attack,
      defense: tmpl.defense,
      speed,
      luck,
    },
    expReward: tmpl.exp,
    itemDrop,
    isBoss,
  };
}

export function generateEnemy(floor: number, isBoss: boolean): Enemy {
  if (isBoss) {
    if (floor === EXTRA_BOSS_FLOOR) {
      return buildEnemyFromTemplate(TRUE_BOSS, 18, 10, createWeapon('混沌神の欠片', 60), true);
    }
    return buildEnemyFromTemplate(BOSS, 10, 5, createWeapon('魔王の剣', 30), true);
  }

  if (floor > TOTAL_FLOORS) {
    const clampedFloor = Math.min(floor, 9) as 6 | 7 | 8 | 9;
    const templates = EXTRA_FLOOR_ENEMY_TEMPLATES[clampedFloor];
    const tmpl = templates[Math.floor(Math.random() * templates.length)];
    return buildEnemyFromTemplate(tmpl, 10 + floor * 2, 5, rollItemDrop(floor));
  }

  const clampedFloor = Math.min(floor, 5) as 1 | 2 | 3 | 4 | 5;
  const templates = FLOOR_ENEMY_TEMPLATES[clampedFloor];
  const tmpl = templates[Math.floor(Math.random() * templates.length)];
  return buildEnemyFromTemplate(tmpl, 5 + floor * 2, 3, rollItemDrop(floor));
}

function rollItemDrop(floor: number): Item | null {
  const rand = Math.random();
  if (rand < 0.25) return createPotion(`回復薬(${floor}F)`, 20 + floor * 10);
  if (rand < 0.35) return createWeapon(`${floor}階の武器`, floor * 3);
  if (rand < 0.42) return createArmor(`${floor}階の防具`, floor * 2);
  if (rand < 0.52 && floor >= 2) return rollOffensiveDrop(floor);
  if (rand < 0.58) return createEther();           // 約 6%
  if (rand < 0.60) return createElixir();          // 約 2%（レア）
  if (rand < 0.63) return createAwakenPotion();    // 約 3%
  return null;
}

function rollOffensiveDrop(floor: number): Item {
  const r = Math.random();
  if (floor >= 4 && r < 0.25) return createBomb(floor);
  if (floor >= 3 && r < 0.5)  return createThunderScroll(floor);
  if (floor >= 3 && r < 0.75) return createPoisonArrow(floor);
  return createFireBomb(floor);
}

// ========== フロアイベント生成 ==========

export function generateFloorEvent(floor: number, isBossFloor: boolean): FloorEvent {
  if (isBossFloor) {
    return {
      type: 'boss',
      floor,
      narration: `第${floor}層の最深部... 強大な魔力が渦を巻いている。ボスが待ち受けているようだ。`,
      enemy: generateEnemy(floor, true),
    };
  }

  const rand = Math.random();
  let type: FloorEventType;

  if (rand < 0.50) type = 'enemy';
  else if (rand < 0.65) type = 'treasure';
  else if (rand < 0.75) type = 'trap';
  else if (rand < 0.85) type = 'npc';
  else type = 'empty';

  switch (type) {
    case 'enemy':
      return {
        type: 'enemy',
        floor,
        narration: `第${floor}層を進んでいると、暗闇から魔物が現れた！`,
        enemy: generateEnemy(floor, false),
      };

    case 'treasure': {
      const item = rollTreasure(floor);
      return {
        type: 'treasure',
        floor,
        narration: `古びた宝箱を発見した！慎重に開けてみると...`,
        item,
      };
    }

    case 'trap': {
      const trapDamage = 5 + floor * 3 + Math.floor(Math.random() * 10);
      return {
        type: 'trap',
        floor,
        narration: `罠だ！床の石板を踏んだ瞬間、矢が飛んできた！`,
        trapDamage,
      };
    }

    case 'npc':
      return {
        type: 'npc',
        floor,
        narration: `洞窟の片隅に人影を発見した。旅人だろうか？`,
        npcMessage: rollNpcMessage(floor),
      };

    default:
      return {
        type: 'empty',
        floor,
        narration: `第${floor}層の通路を進む。今は何も起こらなかった。`,
      };
  }
}

function rollTreasure(floor: number): Item {
  const rand = Math.random();
  if (rand < 0.35) return createPotion(`上級回復薬(${floor}F)`, 40 + floor * 15);
  if (rand < 0.55) return createWeapon(`${floor}階の銘剣`, floor * 4 + 2);
  if (rand < 0.70) return createArmor(`${floor}階の鎧`, floor * 3 + 2);
  if (rand < 0.82) return rollOffensiveDrop(floor);
  if (rand < 0.91) return createEther();
  if (rand < 0.96) return createElixir();
  return createAwakenPotion();
}

function rollNpcMessage(floor: number): string {
  const messages = [
    `「この先には強力な魔物が棲んでいる。気をつけろ」`,
    `「ここで引き返すなら今のうちだぞ」`,
    `「第${floor}層では罠に注意しろよ」`,
    `「体力は惜しまず回復薬を使え。死んでからでは遅い」`,
    `「勇者よ、ダンジョンの最深部には魔王が待っているらしい」`,
    `「魔法使いは魔力の管理が命だ」`,
    `「盗賊は逃げ足を活かせ」`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ========== バトル ==========

export function initBattle(character: Character, enemy: Enemy, floor: number): BattleState {
  return {
    enemy,
    playerStats: { ...character.stats },
    turn: 1,
    logs: [],
    phase: 'player_turn',
    result: 'ongoing',
    barrierActive: false,
    poisonTurns: 0,
    poisonDamage: 0,
    floor,
    playerSleepTurns: 0,
    sleepUsedThisBattle: false,
    enemyAttackStacks: 0,
    enemyDefenseBonusTurns: 0,
  };
}

/** ダメージ計算（分散 ±20%） */
function calcDamage(attack: number, defense: number): number {
  const base = Math.max(1, attack - Math.floor(defense * 0.5));
  const variance = 0.8 + Math.random() * 0.4;
  return Math.max(1, Math.floor(base * variance));
}

/** クリティカル判定（luck依存） */
function isCritical(luck: number): boolean {
  return Math.random() < luck / 100;
}

/** ミス判定（通常攻撃のみ・確率5%） */
function isMiss(): boolean {
  return Math.random() < 0.05;
}

export function playerAttack(state: BattleState, character: Character): BattleState {
  const newState = deepCopyState(state);

  // ミス判定（5%）
  if (isMiss()) {
    newState.logs.push({
      turn: newState.turn,
      actor: 'player',
      action: 'attack',
      damage: 0,
      message: `${character.name}の攻撃は外れた！`,
    });
    newState.phase = 'enemy_turn';
    return newState;
  }

  const crit = isCritical(character.stats.luck);
  const defBonus = newState.enemyDefenseBonusTurns > 0 ? 1.3 : 1.0;
  const effectiveDef = Math.floor(newState.enemy.stats.defense * defBonus);
  let dmg = calcDamage(newState.playerStats.attack, effectiveDef);
  if (crit) dmg = Math.floor(dmg * 1.5);

  newState.enemy.stats.hp = Math.max(0, newState.enemy.stats.hp - dmg);

  const defMsg = newState.enemyDefenseBonusTurns > 0 ? '（防御↑）' : '';
  const log: BattleLog = {
    turn: newState.turn,
    actor: 'player',
    action: 'attack',
    damage: dmg,
    message: crit
      ? `${character.name}の会心の一撃！ ${newState.enemy.name}に${dmg}のダメージ！${defMsg}`
      : `${character.name}の攻撃！ ${newState.enemy.name}に${dmg}のダメージ！${defMsg}`,
  };
  newState.logs.push(log);

  if (newState.enemy.stats.hp <= 0) {
    newState.phase = 'result';
    newState.result = 'win';
  } else {
    newState.phase = 'enemy_turn';
  }

  return newState;
}

export function playerMagic(state: BattleState, character: Character): BattleState {
  const newState = deepCopyState(state);
  const def = JOB_DEFINITIONS[character.jobClass];

  if (newState.playerStats.mp < def.magicMpCost) {
    newState.logs.push({
      turn: newState.turn,
      actor: 'player',
      action: 'magic',
      message: `MPが足りない！（必要MP: ${def.magicMpCost}）`,
    });
    return newState;
  }

  newState.playerStats.mp -= def.magicMpCost;
  const defBonus = newState.enemyDefenseBonusTurns > 0 ? 1.3 : 1.0;
  const effectiveDef = Math.floor(newState.enemy.stats.defense * defBonus);
  const baseDmg = Math.floor(newState.playerStats.attack * def.magicMultiplier);
  const dmg = Math.max(1, Math.floor(baseDmg * (0.85 + Math.random() * 0.3) / (defBonus * 0.5 + 0.5)));
  newState.enemy.stats.hp = Math.max(0, newState.enemy.stats.hp - dmg);

  const defMsg = newState.enemyDefenseBonusTurns > 0 ? '（防御↑）' : '';
  newState.logs.push({
    turn: newState.turn,
    actor: 'player',
    action: 'magic',
    damage: dmg,
    message: `${character.name}の${def.magicName}！ ${newState.enemy.name}に${dmg}の魔法ダメージ！${defMsg}`,
  });

  if (newState.enemy.stats.hp <= 0) {
    newState.phase = 'result';
    newState.result = 'win';
  } else {
    newState.phase = 'enemy_turn';
  }

  return newState;
}

/** 攻撃アイテム使用時のダメージ計算とログ生成 */
function applyOffensiveItem(state: BattleState, item: Item): BattleState {
  if (item.offensiveEffect === 'poison') {
    state.poisonTurns = 3;
    state.poisonDamage = item.value;
    state.logs.push({
      turn: state.turn,
      actor: 'player',
      action: 'item',
      message: `${item.name}を使った！${state.enemy.name}は毒状態になった！（3ターン・${item.value}/ターン）`,
    });
  } else if (item.offensiveEffect === 'boss_bonus') {
    const base = Math.floor(item.value * (0.85 + Math.random() * 0.3));
    const dmg = state.enemy.isBoss ? Math.floor(base * 1.8) : base;
    state.enemy.stats.hp = Math.max(0, state.enemy.stats.hp - dmg);
    state.logs.push({
      turn: state.turn,
      actor: 'player',
      action: 'item',
      damage: dmg,
      message: state.enemy.isBoss
        ? `${item.name}で大爆発！${state.enemy.name}に${dmg}の大ダメージ！`
        : `${item.name}を使った！${state.enemy.name}に${dmg}のダメージ！`,
    });
    if (state.enemy.stats.hp <= 0) { state.phase = 'result'; state.result = 'win'; return state; }
  } else {
    const dmg = Math.max(1, Math.floor(item.value * (0.85 + Math.random() * 0.3)));
    state.enemy.stats.hp = Math.max(0, state.enemy.stats.hp - dmg);
    state.logs.push({
      turn: state.turn,
      actor: 'player',
      action: 'item',
      damage: dmg,
      message: `${item.name}を使った！${state.enemy.name}に${dmg}のダメージ！`,
    });
    if (state.enemy.stats.hp <= 0) { state.phase = 'result'; state.result = 'win'; return state; }
  }
  state.phase = 'enemy_turn';
  return state;
}

export function playerUseItem(
  state: BattleState,
  character: Character,
  itemId: string
): { battleState: BattleState; updatedCharacter: Character } {
  const newState = deepCopyState(state);
  const newChar = deepCopyCharacter(character);

  const itemIndex = newChar.items.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) {
    newState.logs.push({
      turn: newState.turn,
      actor: 'player',
      action: 'item',
      message: 'そのアイテムは存在しない！',
    });
    return { battleState: newState, updatedCharacter: newChar };
  }

  const item = newChar.items[itemIndex];
  newChar.items.splice(itemIndex, 1);

  if (item.type === 'potion' && item.specialEffect === 'awaken') {
    newState.playerSleepTurns = 0;
    newState.logs.push({ turn: newState.turn, actor: 'player', action: 'item', message: `${item.name}を使った！眠りから覚めた！` });
    newState.phase = 'enemy_turn';

  } else if (item.type === 'potion') {
    const before = newState.playerStats.hp;
    newState.playerStats.hp = Math.min(newState.playerStats.maxHp, newState.playerStats.hp + item.value);
    const healed = newState.playerStats.hp - before;
    newState.logs.push({ turn: newState.turn, actor: 'player', action: 'item', heal: healed, message: `${item.name}を使った！HPが${healed}回復した！` });
    newState.phase = 'enemy_turn';

  } else if (item.type === 'mp_potion') {
    const before = newState.playerStats.mp;
    const isElixir = item.value >= newState.playerStats.maxMp;
    newState.playerStats.mp = isElixir
      ? newState.playerStats.maxMp
      : Math.min(newState.playerStats.maxMp, newState.playerStats.mp + item.value);
    const restored = newState.playerStats.mp - before;
    newState.logs.push({
      turn: newState.turn, actor: 'player', action: 'item', heal: restored,
      message: isElixir ? `${item.name}を使った！MPが全回復した！` : `${item.name}を使った！MPが${restored}回復した！`,
    });
    newState.phase = 'enemy_turn';

  } else if (item.type === 'offensive') {
    applyOffensiveItem(newState, item);

  } else {
    newChar.items.splice(itemIndex, 0, item); // 使えなかったので元の位置に戻す
    newState.logs.push({ turn: newState.turn, actor: 'player', action: 'item', message: `${item.name}はバトル中に使えない！` });
  }

  return { battleState: newState, updatedCharacter: newChar };
}

export function playerBarrier(state: BattleState, character: Character): BattleState {
  const newState = deepCopyState(state);
  const mpCost = BARRIER_MP_COST[character.jobClass];

  if (newState.playerStats.mp < mpCost) {
    newState.logs.push({
      turn: newState.turn,
      actor: 'player',
      action: 'barrier',
      message: `MPが足りない！（必要MP: ${mpCost}）`,
    });
    return newState;
  }

  newState.playerStats.mp -= mpCost;
  newState.barrierActive = true;
  newState.logs.push({
    turn: newState.turn,
    actor: 'player',
    action: 'barrier',
    message: `${character.name}はバリアを張った！次の攻撃ダメージが半減する！`,
  });
  newState.phase = 'enemy_turn';
  return newState;
}

/** 眠り中のターンスキップ */
export function playerSleepTurn(state: BattleState): BattleState {
  const newState = deepCopyState(state);
  newState.logs.push({
    turn: newState.turn,
    actor: 'player',
    action: 'pass',
    message: `眠っていて動けない…（あと${newState.playerSleepTurns}ターン）`,
  });
  newState.phase = 'enemy_turn';
  return newState;
}

export function playerFlee(state: BattleState, character: Character): BattleState {
  const newState = deepCopyState(state);
  // 逃げ成功率: speed差 + luck補正
  const fleeChance = Math.min(
    0.85,
    Math.max(0.1, 0.5 + (character.stats.speed - newState.enemy.stats.speed) * 0.05 + character.stats.luck * 0.01)
  );
  const success = Math.random() < fleeChance;

  if (success) {
    newState.phase = 'result';
    newState.result = 'flee';
    newState.logs.push({
      turn: newState.turn,
      actor: 'player',
      action: 'flee',
      message: `${character.name}はうまく逃げ切った！`,
    });
  } else {
    newState.logs.push({
      turn: newState.turn,
      actor: 'player',
      action: 'flee',
      message: `逃げようとしたが失敗した！`,
    });
    newState.phase = 'enemy_turn';
  }

  return newState;
}

// ========== 敵行動選択 ==========

type EnemyAction = 'strong_attack' | 'sleep' | 'attack_up' | 'defense_up' | 'normal_attack';

function selectEnemyAction(
  canSleep: boolean,
  sleepUsed: boolean,
  attackStacks: number,
  isExtraFloor: boolean
): EnemyAction {
  type W = [EnemyAction, number];
  const weights: W[] = isExtraFloor
    ? [
        ['strong_attack', 18],
        ['sleep',        canSleep && !sleepUsed ? 12 : 0],
        ['attack_up',   attackStacks < 3 ? 22 : 0],
        ['defense_up',  22],
        ['normal_attack', 26],
      ]
    : [
        ['strong_attack', 15],
        ['sleep',        canSleep && !sleepUsed ? 10 : 0],
        ['attack_up',   attackStacks < 3 ? 20 : 0],
        ['defense_up',  20],
        ['normal_attack', 35],
      ];

  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [action, weight] of weights) {
    r -= weight;
    if (r <= 0) return action;
  }
  return 'normal_attack';
}

export function enemyTurn(state: BattleState): BattleState {
  const newState = deepCopyState(state);

  // 防御バフ経過
  if (newState.enemyDefenseBonusTurns > 0) {
    newState.enemyDefenseBonusTurns -= 1;
  }

  // 毒ダメージ（敵に）
  if (newState.poisonTurns > 0) {
    newState.enemy.stats.hp = Math.max(0, newState.enemy.stats.hp - newState.poisonDamage);
    newState.poisonTurns -= 1;
    const remaining = newState.poisonTurns;
    newState.logs.push({
      turn: newState.turn,
      actor: 'player',
      action: 'item',
      damage: newState.poisonDamage,
      message: `☠ 毒！ ${newState.enemy.name}に${newState.poisonDamage}のダメージ！${remaining > 0 ? `（残り${remaining}ターン）` : '（毒が切れた）'}`,
    });

    if (newState.enemy.stats.hp <= 0) {
      newState.phase = 'result';
      newState.result = 'win';
      newState.turn += 1;
      return newState;
    }
  }

  // 眠り経過（enemy turnの末尾で減算）
  const willDecrementSleep = newState.playerSleepTurns > 0;

  // 行動選択
  const isExtraFloor = newState.floor > BOSS_FLOOR;
  const canSleep = newState.enemy.stats.maxMp > 0;
  const action = selectEnemyAction(canSleep, newState.sleepUsedThisBattle, newState.enemyAttackStacks, isExtraFloor);

  if (action === 'sleep') {
    // 睡眠攻撃
    const sleepTurns = 2 + Math.floor(Math.random() * 2); // 2〜3
    newState.playerSleepTurns = Math.max(newState.playerSleepTurns, sleepTurns);
    newState.sleepUsedThisBattle = true;
    newState.logs.push({
      turn: newState.turn,
      actor: 'enemy',
      action: 'sleep',
      message: `${newState.enemy.name}の眠りの霧！ 眠りに包まれた…（${sleepTurns}ターン行動不能）`,
    });

  } else if (action === 'attack_up') {
    // 攻撃力アップ
    newState.enemyAttackStacks = Math.min(3, newState.enemyAttackStacks + 1);
    const pct = newState.enemyAttackStacks * 20;
    newState.logs.push({
      turn: newState.turn,
      actor: 'enemy',
      action: 'attack_up',
      message: `${newState.enemy.name}は力を溜めている！（攻撃力+${pct}%）`,
    });

  } else if (action === 'defense_up') {
    // 防御力アップ
    newState.enemyDefenseBonusTurns += 2;
    newState.logs.push({
      turn: newState.turn,
      actor: 'enemy',
      action: 'defense_up',
      message: `${newState.enemy.name}は身構えた！（防御力+30%・2ターン）`,
    });

  } else {
    // 通常攻撃 or 強攻撃（ミス判定あり）
    if (isMiss()) {
      newState.logs.push({
        turn: newState.turn,
        actor: 'enemy',
        action: 'attack',
        damage: 0,
        message: `${newState.enemy.name}の攻撃をかわした！`,
      });
    } else {
      const isStrong = action === 'strong_attack';
      const atkMult = (isStrong ? 1.5 : 1.0) * (1 + 0.2 * newState.enemyAttackStacks);
      newState.enemyAttackStacks = 0;
      let dmg = Math.max(1, Math.floor(calcDamage(newState.enemy.stats.attack, newState.playerStats.defense) * atkMult));

      if (newState.barrierActive) {
        dmg = Math.max(1, Math.floor(dmg / 2));
        newState.barrierActive = false;
        newState.logs.push({
          turn: newState.turn,
          actor: 'enemy',
          action: 'attack',
          damage: dmg,
          message: isStrong
            ? `🛡 バリアが効いた！ ${newState.enemy.name}の渾身の一撃！ ${dmg}のダメージ（半減）！`
            : `🛡 バリアが効いた！ ${newState.enemy.name}の攻撃！ ${dmg}のダメージ（半減）！`,
        });
      } else {
        newState.logs.push({
          turn: newState.turn,
          actor: 'enemy',
          action: 'attack',
          damage: dmg,
          message: isStrong
            ? `${newState.enemy.name}の渾身の一撃！ プレイヤーに${dmg}の大ダメージ！`
            : `${newState.enemy.name}の攻撃！ プレイヤーに${dmg}のダメージ！`,
        });
      }

      newState.playerStats.hp = Math.max(0, newState.playerStats.hp - dmg);
    }
  }

  // 眠り残りターン減算
  if (willDecrementSleep) {
    newState.playerSleepTurns = Math.max(0, newState.playerSleepTurns - 1);
    if (newState.playerSleepTurns === 0) {
      newState.logs.push({
        turn: newState.turn,
        actor: 'player',
        action: 'pass',
        message: '目を覚ました！',
      });
    }
  }

  newState.turn += 1;

  if (newState.playerStats.hp <= 0) {
    newState.phase = 'result';
    newState.result = 'lose';
  } else {
    newState.phase = 'player_turn';
  }

  return newState;
}

// ========== 経験値・レベルアップ ==========

export function gainExp(character: Character, expAmount: number): { character: Character; leveledUp: boolean; levelsGained: number } {
  const newChar = deepCopyCharacter(character);
  newChar.exp += expAmount;

  let levelsGained = 0;
  while (newChar.exp >= newChar.expToNext) {
    newChar.exp -= newChar.expToNext;
    newChar.level += 1;
    levelsGained += 1;
    newChar.expToNext = calcExpToNext(newChar.level);
    applyLevelUp(newChar);
  }

  return { character: newChar, leveledUp: levelsGained > 0, levelsGained };
}

function calcExpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

function applyLevelUp(character: Character): void {
  const growth = JOB_DEFINITIONS[character.jobClass].growthRate;
  character.stats.maxHp += growth.hp;
  character.stats.hp = character.stats.maxHp; // レベルアップで全回復
  character.stats.maxMp += growth.mp;
  character.stats.mp = character.stats.maxMp;
  character.stats.attack += growth.attack;
  character.stats.defense += growth.defense;
}

// ========== アイテム装備 ==========

export function equipItem(character: Character, itemId: string): Character {
  const newChar = deepCopyCharacter(character);
  const index = newChar.items.findIndex((i) => i.id === itemId);
  if (index === -1) return newChar;

  const item = newChar.items[index];

  if (item.type === 'weapon') {
    // 旧装備のボーナスを先に解除してからインベントリに戻す
    if (newChar.equippedWeapon) {
      newChar.stats.attack -= newChar.equippedWeapon.value;
      newChar.items.push(newChar.equippedWeapon);
    }
    newChar.equippedWeapon = item;
    newChar.stats.attack += item.value;
    newChar.items.splice(index, 1);
  } else if (item.type === 'armor') {
    if (newChar.equippedArmor) {
      newChar.stats.defense -= newChar.equippedArmor.value;
      newChar.items.push(newChar.equippedArmor);
    }
    newChar.equippedArmor = item;
    newChar.stats.defense += item.value;
    newChar.items.splice(index, 1);
  }

  return newChar;
}

// ========== バトル後処理 ==========

/** バトル勝利後にキャラクターのHPを同期し、アイテムドロップを処理する */
export function applyBattleResult(
  character: Character,
  state: BattleState
): Character {
  const newChar = deepCopyCharacter(character);
  // バトル中のHP/MP変化を反映
  newChar.stats.hp = state.playerStats.hp;
  newChar.stats.mp = state.playerStats.mp;

  // アイテムドロップ（所持上限チェック）
  if (state.result === 'win' && state.enemy.itemDrop && newChar.items.length < MAX_ITEMS) {
    newChar.items.push(state.enemy.itemDrop);
  }

  return newChar;
}

// ========== スコア ==========

export { calculateScore };

// ========== ユーティリティ ==========

function deepCopyState(state: BattleState): BattleState {
  return {
    ...state,
    enemy: {
      ...state.enemy,
      stats: { ...state.enemy.stats },
      itemDrop: state.enemy.itemDrop ? { ...state.enemy.itemDrop } : null,
    },
    playerStats: { ...state.playerStats },
    logs: [...state.logs],
  };
}

function deepCopyCharacter(character: Character): Character {
  return {
    ...character,
    stats: { ...character.stats },
    items: character.items.map((i) => ({ ...i })),
    equippedWeapon: character.equippedWeapon ? { ...character.equippedWeapon } : null,
    equippedArmor: character.equippedArmor ? { ...character.equippedArmor } : null,
  };
}


