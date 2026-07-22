"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ResurfaceItem {
  id: string;
  title: string;
  days: number;
  question: string | null;
}

export default function ResurfaceCard({ items }: { items: ResurfaceItem[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  // 按 id 记忆已忽略项: 软刷新后,新休眠的线程仍会浮现
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = items.filter((it) => !dismissed.has(it.id));
  if (visible.length === 0) return null;
  const it = visible[Math.min(i, visible.length - 1)];
  // 点 X = 关掉整张卡(当前这批一次收起);将来新休眠的线程(新 id)仍会浮现
  const hide = () =>
    setDismissed((prev) => {
      const next = new Set(prev);
      visible.forEach((v) => next.add(v.id));
      return next;
    });

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-16 z-20 flex justify-center px-4">
      <div className="toast pointer-events-auto w-full max-w-sm rounded-2xl border border-line2 bg-panel/90 p-3.5 shadow-2xl backdrop-blur">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-sm">🌙</span>
          <span className="mono text-[11px] uppercase tracking-wider text-muted">
            重新浮现 · 你 {it.days} 天没碰这条了
          </span>
          <button
            onClick={hide}
            aria-label="不再提示这条"
            className="ml-auto text-muted2 hover:text-txt"
            title="不再提示"
          >
            ✕
          </button>
        </div>
        <p className="text-[15px] font-medium text-txt">{it.title}</p>
        {it.question && <p className="mt-0.5 text-[13px] text-muted">↳ {it.question}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => router.push(`/thread/${it.id}`)}
            className="rounded-lg bg-grow px-3 py-1.5 text-[13px] font-semibold text-[#04140d] hover:brightness-110"
          >
            去想想
          </button>
          <button
            onClick={() => (i + 1 < visible.length ? setI((v) => v + 1) : hide())}
            className="mono rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted hover:text-txt"
          >
            {i + 1 < visible.length ? "换一条" : "稍后"}
          </button>
        </div>
      </div>
    </div>
  );
}
