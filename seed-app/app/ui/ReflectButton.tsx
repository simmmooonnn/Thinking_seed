"use client";

import { useState, useTransition } from "react";
import { reflect } from "@/app/actions";

export default function ReflectButton() {
  const [pending, start] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  const run = () =>
    start(async () => {
      setErr(false);
      try {
        setText(await reflect());
      } catch {
        setErr(true);
      }
    });

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-ai">认知镜子</span>
        <button
          onClick={run}
          disabled={pending}
          className="ml-auto rounded-lg border border-ai/50 px-3.5 py-1.5 text-sm text-ai hover:bg-ai/10 disabled:opacity-40"
        >
          {pending ? "照一照…" : text ? "再照一次" : "我最近像在提问,还是消费答案?"}
        </button>
      </div>
      {err ? (
        <p className="mt-2 text-sm text-[#f87171]">照镜子失败,过一会儿再试。</p>
      ) : text ? (
        <p className="mt-3 border-l-2 border-ai/60 pl-3 text-[15px] leading-relaxed text-txt">{text}</p>
      ) : (
        <p className="mt-2 text-sm text-muted2">让 AI 基于你的记录构成,诚实说一句:你最近是在发展自己的想法,还是主要在消费信息。</p>
      )}
    </div>
  );
}
