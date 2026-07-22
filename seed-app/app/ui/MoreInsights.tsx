"use client";

import { useState } from "react";
import EvolutionCard from "./EvolutionCard";
import MainlinesButton from "./MainlinesButton";
import ContradictionsButton from "./ContradictionsButton";
import ReflectButton from "./ReflectButton";

// "还想看"抽屉: 四个深度分析默认收起,点谁展开谁——功能都在,但不抢注意力。
const ITEMS = [
  { key: "evolution", label: "思想编年史" },
  { key: "mainlines", label: "长期主线" },
  { key: "contradictions", label: "自相矛盾" },
  { key: "reflect", label: "认知镜子" },
] as const;

type Key = (typeof ITEMS)[number]["key"];

export default function MoreInsights() {
  const [open, setOpen] = useState<Set<Key>>(new Set());

  const toggle = (k: Key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted2">
        <span>还想看:</span>
        {ITEMS.map((it) => (
          <button
            key={it.key}
            onClick={() => toggle(it.key)}
            className="transition hover:text-txt"
            style={{ color: open.has(it.key) ? "var(--grow)" : undefined }}
          >
            {it.label}
            {open.has(it.key) ? " ▾" : ""}
          </button>
        ))}
      </div>
      {open.has("evolution") && <EvolutionCard />}
      {open.has("mainlines") && <MainlinesButton />}
      {open.has("contradictions") && <ContradictionsButton />}
      {open.has("reflect") && <ReflectButton />}
    </div>
  );
}
