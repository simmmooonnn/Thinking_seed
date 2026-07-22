"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNudge } from "@/app/actions";

interface Nudge {
  id: string;
  text: string;
  threadId?: string;
}

const KEY = "seed_nudge_v1";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function ProactiveNudge() {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const today = todayKey();
    let cache: { date?: string; dismissed?: string[]; nudge?: Nudge } = {};
    try {
      cache = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      cache = {};
    }
    const dismissed: string[] = cache.date === today ? cache.dismissed ?? [] : [];

    function reveal(n: Nudge) {
      setNudge(n);
      // 轻轻延迟出现,像"注意到"之后才开口
      timer = setTimeout(() => !cancelled && setShow(true), 1400);
    }

    async function run() {
      // 当天已经算过一条 → 直接用缓存,绝不再调 AI(关掉后也一样,避免反复刷新重复花钱)
      if (cache.date === today && cache.nudge) {
        if (!cancelled && !dismissed.includes(cache.nudge.id)) reveal(cache.nudge);
        return;
      }
      // 今天第一次:调一次,把结果缓存下来(无论之后是否关闭)
      const n = await getNudge();
      if (cancelled) return;
      localStorage.setItem(KEY, JSON.stringify({ date: today, dismissed, nudge: n ?? undefined }));
      if (n && !dismissed.includes(n.id)) reveal(n);
    }

    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setShow(false);
    const n = nudge;
    if (!n) return;
    // 动画收起后彻底卸载,否则透明卡片仍留在原位吞掉点击(会挡住星图缩放/重置按钮)
    setTimeout(() => setNudge(null), 700);
    const today = todayKey();
    let cache: { date?: string; dismissed?: string[]; nudge?: Nudge } = {};
    try {
      cache = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      cache = {};
    }
    const dismissed = new Set(cache.date === today ? cache.dismissed ?? [] : []);
    dismissed.add(n.id);
    localStorage.setItem(KEY, JSON.stringify({ date: today, dismissed: [...dismissed], nudge: cache.nudge }));
  }

  if (!nudge) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 transition-all duration-700 ${
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-grow/25 bg-[#0d0f10]/90 px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,.5)] backdrop-blur">
        <span className="mt-0.5 select-none text-base leading-none" style={{ filter: "drop-shadow(0 0 6px rgba(52,211,153,.6))" }}>
          🌱
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] leading-relaxed text-[#e6e6ee]">{nudge.text}</p>
          {nudge.threadId && (
            <Link href={`/thread/${nudge.threadId}`} className="mono mt-1.5 inline-block text-[11px] text-grow hover:underline">
              去看看 →
            </Link>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="知道了"
          className="mono -mr-1 -mt-1 shrink-0 rounded px-1.5 text-muted2 hover:text-txt"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
