'use client';

interface HelpModalProps {
  onClose: () => void;
  isFirstTime?: boolean;
}

export default function HelpModal({ onClose, isFirstTime = false }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-amber-400 tracking-wide">⚔ ゲームガイド</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div className="overflow-y-auto px-6 py-4 space-y-5 text-sm">

          {/* 目的 */}
          <section>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span>🏰</span> ゲームの目的
            </h3>
            <p className="text-gray-300 leading-relaxed">
              5層からなるダンジョンを探索し、最深部に潜むボスを倒してクリアを目指しましょう。
              各層を探索して経験値を集め、キャラクターを強化しながら進みます。
            </p>
          </section>

          {/* バトル */}
          <section>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span>⚔</span> バトルの操作
            </h3>
            <div className="space-y-1.5">
              {[
                { label: '攻撃', desc: '通常攻撃。確実にダメージを与える。' },
                { label: '魔法', desc: 'MP消費で強力な攻撃。職業によって魔法の種類が異なる。' },
                { label: 'アイテム', desc: '所持アイテムを使用する。回復や強化に役立てよう。' },
                { label: '逃げる', desc: '戦闘を離脱。盗賊は成功率が高い。ボス戦では逃げられない。' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-amber-500 font-bold w-14 shrink-0">{label}</span>
                  <span className="text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 職業 */}
          <section>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span>👤</span> 職業の特徴
            </h3>
            <div className="space-y-2">
              {[
                { icon: '⚔️', name: '戦士', desc: 'HP・攻撃・防御が高い。魔法は使えないが安定した近接戦闘が強み。' },
                { icon: '🔮', name: '魔法使い', desc: 'MPが高く魔法ダメージが圧倒的。HPは低いので回復アイテムを大切に。' },
                { icon: '🗡️', name: '盗賊', desc: '速度と運が高い。逃げやすくアイテム発見率もアップ。バランス型。' },
              ].map(({ icon, name, desc }) => (
                <div key={name} className="flex gap-2">
                  <span className="text-lg w-7 shrink-0">{icon}</span>
                  <div>
                    <span className="text-gray-200 font-bold">{name}　</span>
                    <span className="text-gray-400">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* アイテム */}
          <section>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span>🎒</span> アイテムの使い方
            </h3>
            <p className="text-gray-300 leading-relaxed">
              探索やイベントでアイテムを入手できます。最大8個まで所持可能。
              バトル中は「アイテム」コマンドから使用します。装備品（武器・防具）は
              所持品画面でタップすると装備できます。
            </p>
          </section>

          {/* ゲームオーバー */}
          <section>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span>💀</span> ゲームオーバーの条件
            </h3>
            <p className="text-gray-300 leading-relaxed">
              バトルでHPが0になるとゲームオーバーです。スコアと到達階層がランキングに記録されます。
              回復アイテムを温存しておき、ボス戦前にHPを満タンにしておくのがコツです。
            </p>
          </section>

        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
          >
            {isFirstTime ? 'はじめる' : '閉じる'}
          </button>
        </div>
      </div>
    </div>
  );
}
