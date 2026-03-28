/**
 * Web Audio API プロシージャル効果音モジュール
 * 外部ファイル不要・ブラウザのみで動作
 */

export { initAudio } from './audioContext';
import { getSharedCtx, getSEDest } from './audioContext';

/** SE の接続先（マスターゲイン経由） */
function dest(): AudioNode {
  const ctx = getSharedCtx();
  return getSEDest() ?? ctx!.destination;
}

/** ノイズバッファを生成 */
function makeNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
  const size = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

/** オシレーターを作成して接続 */
function makeOsc(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  dest: AudioNode
): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(dest);
  return osc;
}

// ========== 効果音 ==========

/** バトル開始: 緊張感のあるドラム+上昇トーン */
export function playBattleStart(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const dg = ctx.createGain();
  dg.gain.setValueAtTime(0.5, now);
  dg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  dg.connect(dest());
  const drum = makeOsc(ctx, 'sine', 120, dg);
  drum.frequency.exponentialRampToValueAtTime(35, now + 0.35);
  drum.start(now); drum.stop(now + 0.35);

  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.18, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  ng.connect(dest());
  const n = makeNoise(ctx, 0.12);
  n.connect(ng); n.start(now); n.stop(now + 0.12);

  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0, now + 0.12);
  rg.gain.linearRampToValueAtTime(0.22, now + 0.25);
  rg.gain.linearRampToValueAtTime(0, now + 0.5);
  rg.connect(dest());
  const rise = makeOsc(ctx, 'sawtooth', 200, rg);
  rise.frequency.exponentialRampToValueAtTime(700, now + 0.5);
  rise.start(now + 0.12); rise.stop(now + 0.5);
}

/** 攻撃: 剣の鋭い下降スイープ */
export function playAttack(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  g.connect(dest());

  const osc = makeOsc(ctx, 'sawtooth', 650, g);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
  osc.start(now); osc.stop(now + 0.18);

  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.12, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  ng.connect(dest());
  const n = makeNoise(ctx, 0.08);
  n.connect(ng); n.start(now); n.stop(now + 0.08);
}

/** 魔法: キラキラ上昇アルペジオ */
export function playMagic(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const freqs = [523, 659, 784, 1047, 1319];
  freqs.forEach((freq, i) => {
    const t = now + i * 0.07;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    g.connect(dest());

    const o = makeOsc(ctx, 'sine', freq, g);
    o.start(t); o.stop(t + 0.28);
    const o2 = makeOsc(ctx, 'sine', freq * 2, g);
    o2.start(t); o2.stop(t + 0.18);
  });
}

/** ダメージ: 鈍い衝撃音 */
export function playDamage(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  g.connect(dest());

  const osc = makeOsc(ctx, 'sine', 90, g);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
  osc.start(now); osc.stop(now + 0.22);

  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.35, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  ng.connect(dest());
  const n = makeNoise(ctx, 0.12);
  n.connect(ng); n.start(now); n.stop(now + 0.12);
}

/** レベルアップ: 明るい上昇アルペジオ */
export function playLevelUp(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [262, 330, 392, 523, 659, 784];
  notes.forEach((freq, i) => {
    const t = now + i * 0.09;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    g.connect(dest());

    const o = makeOsc(ctx, 'sine', freq, g);
    o.start(t); o.stop(t + 0.2);
    const o2 = makeOsc(ctx, 'sine', freq * 2, g);
    o2.start(t); o2.stop(t + 0.12);
  });
}

/** アイテム取得: コインのような高音 */
export function playItemGet(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [[1200, 0], [1600, 0.1], [1200, 0.18]].forEach(([freq, delay]) => {
    const t = now + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    g.connect(dest());

    const o = makeOsc(ctx, 'sine', freq, g);
    o.start(t); o.stop(t + 0.14);
  });
}

/** ゲームオーバー: 重く暗い下降音 */
export function playGameOver(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [440, 349, 262, 220];
  notes.forEach((freq, i) => {
    const t = now + i * 0.28;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.06);
    g.gain.setValueAtTime(0.28, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    g.connect(dest());

    const o = makeOsc(ctx, 'sawtooth', freq, g);
    o.start(t); o.stop(t + 0.5);
    const o2 = makeOsc(ctx, 'sine', freq * 0.5, g);
    o2.start(t); o2.stop(t + 0.5);
  });
}

/** 真クリア: 壮大なファンファーレ（通常クリアより長く豪華） */
export function playTrueClear(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 低音から上昇するアルペジオ → 壮大な和音ホールド → 解決フレーズ (計~4.5秒)
  const melody: [number, number, number][] = [
    [196, 0.00, 0.14],  // G3 (低め)
    [261, 0.12, 0.14],  // C4
    [329, 0.24, 0.14],  // E4
    [392, 0.36, 0.14],  // G4
    [523, 0.48, 0.14],  // C5
    [659, 0.60, 0.14],  // E5
    [784, 0.72, 0.14],  // G5
    [1047,0.84, 2.20],  // C6 ホールド（主旋律）
    [784, 0.84, 2.00],  // G5 ハーモニー
    [659, 0.84, 1.80],  // E5 ハーモニー
    [523, 0.84, 1.60],  // C5 ハーモニー
    [392, 0.84, 1.40],  // G4 ハーモニー
    // 解決フレーズ
    [784, 3.20, 0.22],
    [659, 3.42, 0.22],
    [784, 3.64, 0.30],
    [1047,3.94, 0.80],
  ];
  melody.forEach(([hz, delay, dur]) => {
    const t = now + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.02);
    g.gain.setValueAtTime(0.18, t + dur - 0.06);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(dest());
    const o = makeOsc(ctx, 'sine', hz, g);
    o.start(t); o.stop(t + dur + 0.01);
  });

  // 低音ベース
  [[65, 0.48, 0.6], [98, 0.84, 2.0], [130, 3.20, 0.6], [98, 3.64, 1.2]].forEach(([hz, delay, dur]) => {
    const t = now + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(dest());
    const o = makeOsc(ctx, 'sine', hz, g);
    o.start(t); o.stop(t + dur + 0.01);
  });
}

/** クリア: 明るくファンファーレ */
export function playClear(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const melody: [number, number, number][] = [
    [523, 0, 0.18],
    [659, 0.18, 0.18],
    [784, 0.36, 0.18],
    [1047, 0.54, 0.35],
    [784, 0.95, 0.18],
    [1047, 1.15, 0.6],
  ];
  melody.forEach(([freq, delay, dur]) => {
    const t = now + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.02);
    g.gain.setValueAtTime(0.2, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(dest());

    const o = makeOsc(ctx, 'sine', freq, g);
    o.start(t); o.stop(t + dur);
    const o2 = makeOsc(ctx, 'sine', freq * 1.5, g);
    o2.start(t); o2.stop(t + dur);
  });

  [[131, 0, 0.3], [165, 0.36, 0.3], [196, 0.72, 0.7]].forEach(([freq, delay, dur]) => {
    const t = now + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(dest());

    const o = makeOsc(ctx, 'sine', freq, g);
    o.start(t); o.stop(t + dur);
  });
}
