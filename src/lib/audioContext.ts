/**
 * 共有 AudioContext シングルトン
 * soundEffects.ts と bgm.ts が同じコンテキストを使う
 *
 * ■ 音量バランス
 *   SE_GAIN  : SE 全体の音量 (0〜1)
 *   BGM_GAIN : bgm.ts の masterGain 初期値として参照
 */

export const SE_GAIN  = 0.45;  // SE を下げる
export const BGM_GAIN = 0.80;  // BGM を上げる

let _ctx: AudioContext | null = null;
let _seGain: GainNode | null = null;

export function getSharedCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

/**
 * SE 用の出力先ノードを返す。
 * 全 SE はここに繋ぐことで SE_GAIN が一括適用される。
 */
export function getSEDest(): AudioNode | null {
  const ctx = getSharedCtx();
  if (!ctx) return null;
  if (!_seGain) {
    _seGain = ctx.createGain();
    _seGain.gain.value = SE_GAIN;
    _seGain.connect(ctx.destination);
  }
  return _seGain;
}

/** ページの最初のユーザー操作で AudioContext を unlock する */
export function initAudio(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    if (!_ctx) _ctx = new AudioContext();
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
    window.removeEventListener('pointerdown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
}
