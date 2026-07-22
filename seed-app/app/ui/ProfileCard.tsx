"use client";

import { useState, useTransition } from "react";
import { computeProfile } from "@/app/actions";

interface Profile {
  fingerprint: string;
  strengths: string[];
  blindspots: string[];
  nudge: string;
}

export default function ProfileCard() {
  const [pending, start] = useTransition();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState(false);

  const run = () =>
    start(async () => {
      setErr(false);
      try {
        setP(await computeProfile());
      } catch {
        setErr(true);
      }
    });

  return (
    <div
      className="rounded-3xl border border-line bg-panel p-5"
      style={{ backgroundImage: "radial-gradient(500px 180px at 50% 0%, rgba(52,211,153,.08), transparent 70%)" }}
    >
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-[0.14em] text-grow">认知画像 · 你的思维指纹</span>
        <button
          onClick={run}
          disabled={pending}
          className="ml-auto rounded-lg border border-grow/50 px-3.5 py-1.5 text-sm text-grow hover:bg-grow/10 disabled:opacity-40"
        >
          {pending ? "生成中…" : p ? "重新生成" : "生成我的认知画像"}
        </button>
      </div>

      {err && <p className="mt-2 text-sm text-[#f87171]">生成失败,可能是网络或额度问题——过一会儿再试。</p>}

      {!p ? (
        !err && <p className="mt-2 text-sm text-muted2">Seed 从你全部的记录里,画一张只属于你的思维指纹:强在哪、盲区在哪、下一步该练什么。</p>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-[clamp(17px,2.2vw,22px)] font-semibold leading-snug text-txt">“{p.fingerprint}”</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mono mb-1.5 text-[11px] uppercase tracking-wider text-grow">长处</div>
              <ul className="space-y-1 text-[13.5px] leading-relaxed text-muted">
                {p.strengths.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            </div>
            <div>
              <div className="mono mb-1.5 text-[11px] uppercase tracking-wider text-amber">盲区</div>
              <ul className="space-y-1 text-[13.5px] leading-relaxed text-muted">
                {p.blindspots.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            </div>
          </div>
          {p.nudge && (
            <div className="rounded-xl border border-ai/30 bg-ai/5 px-3.5 py-2.5 text-[13.5px] text-[#e6e6ee]">
              <span className="mono mr-2 text-[11px] uppercase tracking-wider text-ai">今天试试</span>
              {p.nudge}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
