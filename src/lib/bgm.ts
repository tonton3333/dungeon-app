/**
 * BGM モジュール - Web Audio API プロシージャル背景音楽
 * ルックアヘッドスケジューラによるシームレスループ
 */
import { getSharedCtx, BGM_GAIN } from './audioContext';

// ========== 型 ==========
export type BGMType = 'explore' | 'battle_light' | 'battle_tense' | 'battle_boss' | 'login' | 'character' | 'extra_explore' | 'extra_boss';
type Note = { hz: number; vol: number; dur: number; type?: OscillatorType; atk?: number };
type Pattern = Note[][];

// ========== スケジューラ設定 ==========
const LOOK = 0.5;    // 先読み秒数（大きいほどタイマー遅延に強い）
const TICK = 25;     // ms（細かくポーリングして遅延を早期検知）

// ========== 状態 ==========
let _timer: ReturnType<typeof setInterval> | null = null;
let _masterGain: GainNode | null = null;
let _currentBGM: BGMType | null = null;
let _muted = false;
let _victoryPlaying = false;  // 勝利ジングル再生中フラグ
let _nextBeat = 0;
let _beat = 0;

// ========== 周波数定数（Hz） ==========
// D minor
const D2=73.42, F2=87.31, G2=98.00, A2=110.00, Bb2=116.54, C3=130.81;
const D3=146.83, F3=174.61, G3=196.00, A3=220.00, Bb3=233.08, C4=261.63;
const D4=293.66,            F4=349.23, G4=392.00, A4=440.00, C5=523.25;
// C major 追加
const C2=65.41, E3=164.81;
const E5=659.25, G5=783.99, C6=1046.50;
// G major 追加
const B2=123.47, B3=246.94, B4=493.88, D5=587.33;

// ========== ユーティリティ ==========
const pat = (len: number): Pattern => Array.from({ length: len }, () => []);
const n = (hz: number, vol: number, dur: number, type: OscillatorType = 'sine', atk = 0.01): Note =>
  ({ hz, vol, dur, type, atk });

// ========== パターン定義 ==========

// --- 探索BGM: Dマイナー 72BPM 16拍 (~13.3秒ループ) ---
const EXPLORE_BPM = 72;
const EXPLORE = pat(16);
// ベース
([[0,D2],[4,F2],[8,D2],[12,C3]] as [number,number][]).forEach(([b,h]) =>
  EXPLORE[b].push(n(h, 0.22, 3.2)));
// パッド（ゆっくりフェードイン）
([[0,[D3,F3,A3]],[8,[C3,F3,A3]]] as [number,number[]][]).forEach(([b,fs]) =>
  (fs as number[]).forEach(h => EXPLORE[b as number].push(n(h, 0.055, 6.5, 'sine', 0.6))));
// メロディ
([[0,D4,1.0],[5,F4,0.7],[9,A4,1.2],[13,G4,0.8]] as [number,number,number][]).forEach(([b,h,d]) =>
  EXPLORE[b].push(n(h, 0.10, d, 'sine', 0.04)));

// --- バトル弱 (1-2F): "First Strike" Dマイナー 96BPM 8拍 ---
const BATTLE_LIGHT_BPM = 96;
const BATTLE_LIGHT = pat(8);
([[0,D2],[4,A2]] as [number,number][]).forEach(([b,h]) =>
  BATTLE_LIGHT[b].push(n(h, 0.20, 3.6)));
([[0,D3],[1,F3],[2,A3],[3,F3],[4,D3],[5,F3],[6,G3],[7,F3]] as [number,number][]).forEach(([b,h]) =>
  BATTLE_LIGHT[b].push(n(h, 0.11, 0.45)));

// --- バトル強 (3-4F): "Shadow Blade" Dマイナー 132BPM 8拍 ---
const BATTLE_TENSE_BPM = 132;
const BATTLE_TENSE = pat(8);
([[0,D2],[1,D2],[2,F2],[3,D2],[4,G2],[5,D2],[6,A2],[7,D2]] as [number,number][]).forEach(([b,h],i) =>
  BATTLE_TENSE[b].push(n(h, i%2===0?0.28:0.20, 0.20, 'sawtooth')));
[0,4].forEach(b => BATTLE_TENSE[b].push(n(90, 0.50, 0.11, 'sine', 0.005)));
([[0,D3],[1,F3],[2,A3],[3,C4],[4,D4],[5,A3],[6,F3],[7,C4]] as [number,number][]).forEach(([b,h]) =>
  BATTLE_TENSE[b].push(n(h, 0.13, 0.12, 'square', 0.005)));

// --- ボスバトル (5F): "Dragon's Wrath" Dマイナー 168BPM 16拍 ---
const BATTLE_BOSS_BPM = 168;
const BATTLE_BOSS = pat(16);
([[0,D2],[1,D2],[2,F2],[3,D2],[4,G2],[5,D2],[6,Bb2],[7,D2],
  [8,A2],[9,D2],[10,G2],[11,D2],[12,F2],[13,D2],[14,Bb2],[15,D2]] as [number,number][]).forEach(([b,h],i) =>
  BATTLE_BOSS[b].push(n(h, i%2===0?0.35:0.25, 0.20, 'sawtooth')));
[0,4,8,12].forEach(b => BATTLE_BOSS[b].push(n(85, 0.60, 0.13, 'sine', 0.004)));
[4,12].forEach(b => BATTLE_BOSS[b].push(n(200, 0.18, 0.08, 'square', 0.003)));
([[0,D3],[1,F3],[2,A3],[3,D4],[4,A3],[5,F3],[6,G3],[7,Bb3],
  [8,D3],[9,F3],[10,A3],[11,C4],[12,D4],[13,A3],[14,Bb3],[15,D4]] as [number,number][]).forEach(([b,h]) =>
  BATTLE_BOSS[b].push(n(h, 0.16, 0.09, 'square', 0.004)));
([[0,D4,1.5],[4,F4,1.0],[8,A4,1.5],[12,G4,0.8],[14,A4,0.5]] as [number,number,number][]).forEach(([b,h,d]) =>
  BATTLE_BOSS[b].push(n(h, 0.14, d, 'sawtooth', 0.02)));

// --- ログインBGM: "Ancient Gate" Dマイナー 56BPM 16拍 (重厚・神秘的) ---
const LOGIN_BPM = 56;
const LOGIN = pat(16);
// ベース: 重厚な低音ドローン
([[0,D2,6.5],[8,F2,4.0],[12,A2,4.0]] as [number,number,number][]).forEach(([b,h,d]) =>
  LOGIN[b].push(n(h, 0.26, d)));
// パッド: Dマイナーコード（ゆっくりフェードイン）
([[0,[D3,F3,A3]],[8,[C3,E3,G3]]] as [number,number[]][]).forEach(([b,fs]) =>
  (fs as number[]).forEach(h => LOGIN[b as number].push(n(h, 0.06, 7.5, 'sine', 1.0))));
// メロディ: 中低音域 Dマイナースケール（C5以上を使わない）
([[0,D4,1.5],[5,F4,1.0],[8,A4,1.8],[11,G4,0.9],[13,F4,0.7],[15,D4,1.8]] as [number,number,number][]).forEach(([b,h,d]) =>
  LOGIN[b].push(n(h, 0.10, d, 'sine', 0.12)));

// --- キャラクター作成BGM: "New Beginning" Gメジャー 72BPM 16拍 ---
const CHARACTER_BPM = 72;
const CHARACTER = pat(16);
([[0,G2,3.5],[4,D3,3.5],[8,G2,3.5],[12,B2,3.5]] as [number,number,number][]).forEach(([b,h,d]) =>
  CHARACTER[b].push(n(h, 0.18, d)));
([[0,[G3,B3,D4]],[8,[D3,G3,B3]]] as [number,number[]][]).forEach(([b,fs]) =>
  (fs as number[]).forEach(h => CHARACTER[b as number].push(n(h, 0.055, 7.0, 'sine', 0.7))));
([[0,G4,0.9],[4,A4,0.7],[6,B4,0.9],[9,D5,1.2],[13,B4,0.8]] as [number,number,number][]).forEach(([b,h,d]) =>
  CHARACTER[b].push(n(h, 0.09, d, 'sine', 0.06)));

// --- エクストラ探索BGM: "Abyss" Dマイナー+不協和 48BPM 16拍 (暗黒・絶望的) ---
const EXTRA_EXPLORE_BPM = 48;
const EXTRA_EXPLORE = pat(16);
// 重厚ドローンベース（D2+Bb2 増4度で不気味）
([[0,D2,10.0],[8,Bb2,6.0],[12,A2,5.0]] as [number,number,number][]).forEach(([b,h,d]) =>
  EXTRA_EXPLORE[b].push(n(h, 0.32, d)));
// ダークパッド（超スローアタック、不協和コード）
([[0,[D3,F3,Bb3]],[8,[C3,F3,A3]]] as [number,number[]][]).forEach(([b,fs]) =>
  (fs as number[]).forEach(h => EXTRA_EXPLORE[b as number].push(n(h, 0.07, 10.0, 'sine', 1.8))));
// 不穏な下降メロディ
([[2,D4,1.5],[5,C4,1.2],[8,Bb3,2.0],[11,A3,1.2],[13,G3,1.0],[15,D3,2.0]] as [number,number,number][]).forEach(([b,h,d]) =>
  EXTRA_EXPLORE[b].push(n(h, 0.09, d, 'sine', 0.18)));

// --- エクストラボスBGM: "Chaos God" Dマイナー 192BPM 16拍 (最高強度) ---
const EXTRA_BOSS_BPM = 192;
const EXTRA_BOSS_PAT = pat(16);
// ヘビーキック（全拍）
[0,2,4,6,8,10,12,14].forEach(b => EXTRA_BOSS_PAT[b].push(n(50, 0.75, 0.15, 'sine', 0.003)));
// スネアアクセント
[4,8,12].forEach(b => EXTRA_BOSS_PAT[b].push(n(200, 0.35, 0.07, 'square', 0.003)));
// アグレッシブベース
([[0,D2],[1,D2],[2,F2],[3,G2],[4,A2],[5,Bb2],[6,G2],[7,D2],
  [8,D2],[9,C3],[10,Bb2],[11,D2],[12,F2],[13,A2],[14,G2],[15,D2]] as [number,number][]).forEach(([b,h],i) =>
  EXTRA_BOSS_PAT[b].push(n(h, i%2===0?0.42:0.32, 0.17, 'sawtooth')));
// 高速リードライン
([[0,D4],[1,F4],[2,G4],[3,A4],[4,D4],[5,G4],[6,F4],[7,Bb3],
  [8,D4],[9,A4],[10,G4],[11,F4],[12,Bb3],[13,A4],[14,G4],[15,D4]] as [number,number][]).forEach(([b,h]) =>
  EXTRA_BOSS_PAT[b].push(n(h, 0.22, 0.13, 'square', 0.003)));
// メロディアクセント（ロングノート）
([[0,D3,0.8],[4,Bb2,0.8],[8,G3,1.0],[12,A3,0.8]] as [number,number,number][]).forEach(([b,h,d]) =>
  EXTRA_BOSS_PAT[b].push(n(h, 0.28, d, 'sawtooth', 0.01)));

// ========== BGM設定マップ ==========
const CONFIG: Record<BGMType, { bpm: number; pat: Pattern }> = {
  explore:        { bpm: EXPLORE_BPM,       pat: EXPLORE },
  battle_light:   { bpm: BATTLE_LIGHT_BPM,  pat: BATTLE_LIGHT },
  battle_tense:   { bpm: BATTLE_TENSE_BPM,  pat: BATTLE_TENSE },
  battle_boss:    { bpm: BATTLE_BOSS_BPM,   pat: BATTLE_BOSS },
  login:          { bpm: LOGIN_BPM,         pat: LOGIN },
  character:      { bpm: CHARACTER_BPM,     pat: CHARACTER },
  extra_explore:  { bpm: EXTRA_EXPLORE_BPM, pat: EXTRA_EXPLORE },
  extra_boss:     { bpm: EXTRA_BOSS_BPM,    pat: EXTRA_BOSS_PAT },
};

// ========== スケジューラ ==========
function scheduleNote(ctx: AudioContext, master: GainNode, note: Note, time: number) {
  const { hz, vol, dur, type = 'sine', atk = 0.01 } = note;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + atk);
  g.gain.setValueAtTime(vol, time + Math.max(0, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  g.connect(master);

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = hz;
  osc.connect(g);
  osc.start(time);
  osc.stop(time + dur + 0.01);
}

function runScheduler(ctx: AudioContext, cfg: { bpm: number; pat: Pattern }) {
  if (!_masterGain || ctx.state === 'suspended') return;
  const master = _masterGain;
  const beatDur = 60 / cfg.bpm;
  const patLen  = cfg.pat.length;
  const now     = ctx.currentTime;

  // タイマーが大幅に遅延した場合（2拍以上遅れ）: 現在時刻に追いつかせる
  // 小さな遅れ（LOOK範囲内）はそのまま while ループで追いつく
  if (_nextBeat < now - beatDur * 2) {
    _nextBeat = now;
  }

  while (_nextBeat < now + LOOK) {
    // 過去のノートはスケジュールしない（直近0.01秒の誤差は許容）
    if (_nextBeat >= now - 0.01) {
      cfg.pat[_beat % patLen].forEach(note => scheduleNote(ctx, master, note, _nextBeat));
    }
    _nextBeat += beatDur;
    _beat++;
  }
}

// ========== 公開 API ==========

/** BGMを開始する（同じ種類が再生中なら何もしない） */
export function startBGM(type: BGMType): void {
  // 勝利ジングル中はexplore以外の呼び出しはブロックしない
  // exploreへの切り替えは勝利ジングル完了後に自動実行されるためブロック
  if (_victoryPlaying && type === 'explore') return;

  if (_currentBGM === type && _timer !== null) return;

  stopBGM();

  const ctx = getSharedCtx();
  if (!ctx) return;

  const cfg = CONFIG[type];
  _currentBGM = type;
  _beat = 0;
  _nextBeat = ctx.currentTime + 0.1;

  _masterGain = ctx.createGain();
  _masterGain.gain.value = _muted ? 0 : BGM_GAIN;
  _masterGain.connect(ctx.destination);

  _timer = setInterval(() => {
    const c = getSharedCtx();
    if (c) runScheduler(c, cfg);
  }, TICK);
}

/** 階層に応じた探索BGMを開始 */
export function startExploreBGM(floor: number): void {
  startBGM(floor > 5 ? 'extra_explore' : 'explore');
}

/** 階層・ボスフラグから適切なバトルBGMを選択して開始 */
export function startBattleBGM(floor: number, isBoss: boolean, isTrueBoss = false): void {
  if (isTrueBoss)      startBGM('extra_boss');
  else if (isBoss)     startBGM('battle_boss');
  else if (floor > 5)  startBGM('battle_boss'); // エクストラ通常戦もボスBGM
  else if (floor <= 2) startBGM('battle_light');
  else                 startBGM('battle_tense');
}

/** BGMをフェードアウトして停止 */
export function stopBGM(): void {
  if (_timer !== null) { clearInterval(_timer); _timer = null; }
  if (_masterGain) {
    const ctx = getSharedCtx();
    const g = _masterGain;
    if (ctx) {
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 700);
    } else {
      try { g.disconnect(); } catch { /* ignore */ }
    }
    _masterGain = null;
  }
  _currentBGM = null;
  _beat = 0;
}

/**
 * 勝利ジングルを再生し、完了後に探索BGMへ自動移行する。
 * バトルBGMを即座に停止し、jingle中はexplore BGM自動開始をブロックする。
 */
export function playVictoryJingle(): void {
  stopBGM();
  _victoryPlaying = true;

  const ctx = getSharedCtx();
  if (ctx && !_muted) {
    const now = ctx.currentTime;
    // Cメジャー上昇アルペジオ → 和音ホールド (計~2.8秒)
    const jingle: [number, number, number][] = [
      [C5,    0.00, 0.18], // C5
      [E5,    0.14, 0.18], // E5
      [G5,    0.28, 0.18], // G5
      [C6,    0.42, 1.60], // C6 ホールド (主旋律)
      [G5,    0.42, 1.40], // G5 ハーモニー
      [E5,    0.42, 1.20], // E5 ハーモニー
      [C5,    0.42, 1.00], // C5 ハーモニー
      [G5,    2.10, 0.60], // 解決
      [C5,    2.10, 0.55],
    ];
    jingle.forEach(([hz, delay, dur]) => {
      const t = now + delay;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.02);
      g.gain.setValueAtTime(0.11, t + dur - 0.06);
      g.gain.linearRampToValueAtTime(0, t + dur);
      g.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz;
      osc.connect(g);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    });
  }

  // 2.8秒後に探索BGMへ移行
  setTimeout(() => {
    _victoryPlaying = false;
    startBGM('explore');
  }, 2800);
}

/** ミュート状態を更新（フェード付き） */
export function setBGMMuted(muted: boolean): void {
  _muted = muted;
  if (_masterGain) {
    const ctx = getSharedCtx();
    if (ctx) {
      _masterGain.gain.setValueAtTime(_masterGain.gain.value, ctx.currentTime);
      _masterGain.gain.linearRampToValueAtTime(muted ? 0 : BGM_GAIN, ctx.currentTime + 0.3);
    }
  }
}
