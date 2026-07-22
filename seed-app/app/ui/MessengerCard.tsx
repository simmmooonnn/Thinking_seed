"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNudge } from "@/app/actions";
import { buildItems, type MsgChallenge, type MsgResurface, type MsgItem, type MsgNudge } from "@/lib/messenger";

// 信使:每次只说一件事。挑战 > 主动提醒 > 重新浮现;无角标、无计数、可无痕忽略。
const KEY = "seed_msgr_v1";

const STANCE: Record<string, { label: string; color: string }> = {
  challenge: { label: "反例", color: "#f87171" },
  support: { label: "支持", color: "#34d399" },
  contradiction: { label: "自相矛盾", color: "#fbbf24" },
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface Cache {
  date?: string;
  dismissed?: string[];
  nudge?: MsgNudge | null;
  nudgeFetched?: boolean;
}

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export default function MessengerCard({
  challenges,
  resurface,
}: {
  challenges: MsgChallenge[];
  resurface: MsgResurface[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<MsgItem[] | null>(null);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const today = todayKey();
    let cache = readCache();
    if (cache.date !== today) cache = { date: today, dismissed: [] };
    const dismissed = new Set(cache.dismissed ?? []);

    function assemble(nudge: MsgNudge | null) {
      if (cancelled) return;
      const all = buildItems({ challenges, nudge, resurface }).filter((it) => !dismissed.has(it.id));
      setItems(all);
      if (all.length > 0) timer = setTimeout(() => !cancelled && setShow(true), 1200);
    }

    if (cache.nudgeFetched) {
      assemble(cache.nudge ?? null);
    } else {
      // 今天第一次:取一条 AI 轻声提醒并缓存(无论结果如何,当天不再调)
      getNudge()
        .then((n) => {
          const nudge = n ? { id: n.id, text: n.text, threadId: n.threadId } : null;
          localStorage.setItem(KEY, JSON.stringify({ ...cache, nudge, nudgeFetched: true }));
          assemble(nudge);
        })
        .catch(() => {
          localStorage.setItem(KEY, JSON.stringify({ ...cache, nudge: null, nudgeFetched: true }));
          assemble(null);
        });
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // 服务端每次渲染传入的数组引用会变,仅按内容 key 依赖,避免重复取 nudge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges.map((c) => c.id).join(","), resurface.map((r) => r.id).join(",")]);

  if (!items || items.length === 0) return null;
  const it = items[Math.min(i, items.length - 1)];

  function dismissAll() {
    setShow(false);
    const cache = readCache();
    const dismissed = new Set(cache.dismissed ?? []);
    for (const x of items ?? []) dismissed.add(x.id);
    localStorage.setItem(KEY, JSON.stringify({ ...cache, date: todayKey(), dismissed: [...dismissed] }));
    setTimeout(() => setItems([]), 700);
  }

  const icon = it.kind === "challenge" ? "⚔️" : it.kind === "nudge" ? "🌱" : "🌙";
  const accent = it.kind === "challenge" ? "#f87171" : it.kind === "nudge" ? "#34d399" : "#60a5fa";
  const goto = it.kind === "resurface" ? it.id : it.threadId;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 transition-all duration-700 ${
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl border bg-[#0d0f10]/90 px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,.5)] backdrop-blur"
        style={{ borderColor: `${accent}40` }}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 select-none text-base leading-none" style={{ filter: `drop-shadow(0 0 6px ${accent}99)` }}>
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            {it.kind === "challenge" && (
              <>
                <div className="mb-1 flex flex-nowrap items-center gap-2">
                  <span
                    className="mono shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px]"
                    style={{ color: (STANCE[it.stance] ?? STANCE.challenge).color, border: `1px solid ${(STANCE[it.stance] ?? STANCE.challenge).color}55` }}
                  >
                    {(STANCE[it.stance] ?? STANCE.challenge).label}
                  </span>
                  <span className="mono min-w-0 flex-1 truncate text-[11px] text-muted2">对「{it.threadTitle}」</span>
                </div>
                <p className="text-[13.5px] leading-relaxed text-[#e6e6ee]">{it.text}</p>
              </>
            )}
            {it.kind === "nudge" && <p className="text-[13.5px] leading-relaxed text-[#e6e6ee]">{it.text}</p>}
            {it.kind === "resurface" && (
              <>
                <p className="text-[14px] font-medium text-txt">{it.title}</p>
                <p className="mono mt-0.5 text-[11px] text-muted2">
                  {it.reason ?? `你 ${it.days} 天没碰它了`}
                </p>
                {it.question && <p className="mt-1 text-[12.5px] text-muted">这条线在问:{it.question}</p>}
              </>
            )}
            <div className="mt-2 flex items-center gap-2">
              {goto && (
                <button
                  onClick={() => router.push(`/thread/${goto}`)}
                  className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[#04140d] hover:brightness-110"
                  style={{ background: accent }}
                >
                  {it.kind === "resurface" ? "去想想" : "去看看"}
                </button>
              )}
              {items.length > 1 && (
                <button
                  onClick={() => setI((v) => (v + 1) % items.length)}
                  className="mono rounded-lg border border-line px-2.5 py-1 text-[11px] text-muted hover:text-txt"
                >
                  换一条
                </button>
              )}
            </div>
          </div>
          <button onClick={dismissAll} aria-label="今天不用再提醒" className="mono -mr-1 -mt-1 shrink-0 rounded px-1.5 text-muted2 hover:text-txt">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
