"use client";

import { useState, useTransition } from "react";
import { runChallenge, dismissChallenge } from "@/app/actions";

export interface ChallengeCard {
  id: string;
  stance: string;
  text: string;
  sourceTitle: string | null;
  url: string | null;
}

const STANCE: Record<string, { label: string; color: string }> = {
  challenge: { label: "反方", color: "#f87171" },
  support: { label: "支持", color: "#34d399" },
  contradiction: { label: "自相矛盾", color: "#fbbf24" },
};

export default function ChallengePanel({
  threadId,
  cards,
}: {
  threadId: string;
  cards: ChallengeCard[];
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-evi">Active Seed · 上网挑战我</span>
        <button
          onClick={() =>
            start(async () => {
              try {
                const r = await runChallenge(threadId);
                setNote(r.count > 0 ? null : "这次没找到明确的证据,换个说法再试。");
              } catch {
                setNote("联网失败,过一会儿再试。");
              }
            })
          }
          disabled={pending}
          className="ml-auto rounded-lg border border-evi/50 px-3.5 py-1.5 text-sm text-evi hover:bg-evi/10 disabled:opacity-40"
        >
          {pending ? "联网找证据中…(约 10 秒)" : "让 AI 上网找反例/证据"}
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="mt-2 text-sm text-muted2">{note ?? "AI 会联网,给你这个判断找 1-2 条反方证据和 1 条支持证据——让现实来挑战你。"}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {cards.map((k) => {
            const s = STANCE[k.stance] ?? STANCE.challenge;
            return (
              <div
                key={k.id}
                className="rounded-xl border border-line bg-panel2 p-3"
                style={{ borderLeft: `3px solid ${s.color}` }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="mono rounded px-1.5 py-0.5 text-[10px]" style={{ color: s.color, border: `1px solid ${s.color}55` }}>
                    {s.label}
                  </span>
                  <button
                    onClick={() => start(() => dismissChallenge(k.id))}
                    className="mono ml-auto text-[11px] text-muted2 hover:text-txt"
                  >
                    忽略
                  </button>
                </div>
                <p className="text-[14px] leading-relaxed text-[#d6d6de]">{k.text}</p>
                {k.sourceTitle && (
                  <div className="mono mt-1.5 text-[11px] text-muted2">
                    来源:
                    {k.url ? (
                      <a href={k.url} target="_blank" rel="noreferrer" className="ml-1 text-evi hover:underline">
                        {k.sourceTitle} ↗
                      </a>
                    ) : (
                      <span className="ml-1">{k.sourceTitle}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
