"use client";

import { useState, useTransition } from "react";
import { askQuestion, commitDecision } from "@/app/actions";

export interface Composition {
  observation: number;
  evidence: number;
  ai_suggestion: number;
  hypothesis: number;
  decision: number;
}

const RISK: Record<string, { label: string; color: string }> = {
  high: { label: "高", color: "#f87171" },
  mid: { label: "中", color: "#fbbf24" },
  low: { label: "低", color: "#34d399" },
};

export default function PreCommit({
  threadId,
  claim,
  comp,
  versions,
  prevClaim,
}: {
  threadId: string;
  claim: string;
  comp: Composition;
  versions: number;
  prevClaim: string | null;
}) {
  const [pending, start] = useTransition();
  const [q, setQ] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const ask = () =>
    start(async () => {
      setErr(null);
      try {
        setQ(await askQuestion(threadId));
      } catch {
        setErr("AI 暂时没能出题,过一会儿再试。");
      }
    });

  const commit = () =>
    start(async () => {
      setErr(null);
      try {
        await commitDecision(threadId, rationale);
        setRationale("");
      } catch {
        setErr("提交失败,你的依据还在,请再试一次。");
      }
    });

  const noEvidence = comp.evidence === 0;
  const aiHeavy = comp.ai_suggestion > comp.observation + comp.evidence;
  const conflict = versions > 1;
  const score = (noEvidence ? 2 : 0) + (conflict ? 1 : 0) + (aiHeavy ? 1 : 0);
  const risk = score >= 2 ? "high" : score === 1 ? "mid" : "low";

  return (
    <div className="rounded-2xl border border-amber/40 bg-amber/5 p-4">
      <div className="flex items-center gap-2">
        <span className="mono text-xs uppercase tracking-wider text-amber">⚡ 提交前检查 · Pre-Commit</span>
        <span
          className="mono ml-auto rounded-full px-2 py-0.5 text-[11px]"
          style={{ color: RISK[risk].color, border: `1px solid ${RISK[risk].color}55` }}
        >
          风险 {RISK[risk].label}
        </span>
      </div>

      <p className="mt-2 text-[15px] font-medium text-txt">{claim || "(还没写下当前判断)"}</p>

      <div className="mt-3 space-y-1.5 text-[12px]">
        <div className="mono text-muted">
          依据构成:
          <span className="text-grow"> {comp.observation} 观察</span> ·
          <span className="text-evi"> {comp.evidence} 证据</span> ·
          <span className="text-ai"> {comp.ai_suggestion} AI建议</span> ·
          <span className="text-grow"> {comp.hypothesis} 假设</span>
        </div>
        {noEvidence && <div className="text-amber">⚠ 尚未验证:这个判断还没有任何外部证据支撑。</div>}
        {conflict && (
          <div className="text-amber">
            ⚠ 与过去冲突:这个判断改过 {versions - 1} 次{prevClaim ? `,上一版是「${prevClaim}」` : ""}。
          </div>
        )}
        {aiHeavy && <div className="text-amber">⚠ 高度依赖 AI:AI 建议多于你的观察与证据。</div>}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-line/60 pt-3">
        <span className="mono text-[11px] text-ai">一个关键问题</span>
        <button
          onClick={ask}
          disabled={pending}
          className="mono ml-auto rounded-lg border border-ai/50 px-3 py-1 text-[11px] text-ai hover:bg-ai/10 disabled:opacity-40"
        >
          {pending ? "…" : q ? "换一个" : "让 AI 问我"}
        </button>
      </div>
      {err && <p className="mt-2 text-[13px] text-[#f87171]">{err}</p>}
      {q && <p className="mt-2 border-l-2 border-ai/60 pl-3 text-[15px] leading-relaxed text-txt">{q}</p>}

      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={2}
        placeholder="用一句话写下:什么真实证据/理由,让你确信或改变了这个判断?"
        className="mt-3 w-full resize-none rounded-lg bg-panel2 p-2.5 text-[14px] outline-none placeholder:text-muted2 focus:ring-1 focus:ring-amber/40"
      />
      <div className="mt-2 flex items-center gap-2">
        <span className="mono text-[11px] text-muted2">写下依据后,才把它标记为“已决定”。</span>
        <button
          onClick={commit}
          disabled={pending || !rationale.trim()}
          className="ml-auto rounded-lg bg-amber px-3.5 py-1.5 text-sm font-semibold text-[#1a1400] hover:brightness-110 disabled:opacity-40"
        >
          ✓ 记下依据,提交决定
        </button>
      </div>
    </div>
  );
}
