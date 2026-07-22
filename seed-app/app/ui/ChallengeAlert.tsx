"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AlertItem {
  id: string;
  threadId: string;
  threadTitle: string;
  stance: string;
  text: string;
}

const STANCE: Record<string, { label: string; color: string }> = {
  challenge: { label: "反例", color: "#f87171" },
  support: { label: "支持", color: "#34d399" },
  contradiction: { label: "自相矛盾", color: "#fbbf24" },
};

export default function ChallengeAlert({ items }: { items: AlertItem[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  // 按 id 记忆已忽略项(而非整卡布尔): 软刷新后新挑战仍能浮现
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = items.filter((it) => !dismissed.has(it.id));
  if (visible.length === 0) return null;
  const it = visible[Math.min(i, visible.length - 1)];
  const s = STANCE[it.stance] ?? STANCE.challenge;
  // 点 X = 关掉整张卡(当前这批一次收起);将来全新的挑战(新 id)仍会浮现
  const hide = () =>
    setDismissed((prev) => {
      const next = new Set(prev);
      visible.forEach((v) => next.add(v.id));
      return next;
    });
  const skip = () => (i + 1 < visible.length ? setI((v) => v + 1) : hide());

  return (
    <div className="absolute bottom-16 left-4 z-20 w-72">
      <div className="toast rounded-2xl border border-line2 bg-panel/90 p-3.5 shadow-2xl backdrop-blur" style={{ borderLeft: `3px solid ${s.color}` }}>
        <div className="mb-1 flex flex-nowrap items-center gap-2">
          <span className="shrink-0 text-sm">🛰️</span>
          <span className="mono min-w-0 flex-1 truncate text-[11px] uppercase tracking-wider text-muted">
            Active Seed · {visible.length} 条
          </span>
          <button onClick={hide} aria-label="忽略这条" className="shrink-0 text-muted2 hover:text-txt">✕</button>
        </div>
        <div className="mb-1 flex flex-nowrap items-center gap-2">
          <span className="mono shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px]" style={{ color: s.color, border: `1px solid ${s.color}55` }}>{s.label}</span>
          <span className="mono min-w-0 flex-1 truncate text-[11px] text-muted2">对「{it.threadTitle}」</span>
        </div>
        <p className="text-[14px] leading-relaxed text-[#e6e6ee]">{it.text}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => router.push(`/thread/${it.threadId}`)}
            className="rounded-lg bg-grow px-3 py-1.5 text-[13px] font-semibold text-[#04140d] hover:brightness-110"
          >
            去这条线程
          </button>
          <button
            onClick={skip}
            className="mono rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted hover:text-txt"
          >
            {i + 1 < visible.length ? "下一条" : "知道了"}
          </button>
        </div>
      </div>
    </div>
  );
}
