"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshDailyQuestion } from "@/app/actions";

export default function RefreshQuestion() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { try { await refreshDailyQuestion(); router.refresh(); } catch { /* 静默: 保留原问题 */ } })}
      disabled={pending}
      className="mono text-[11px] tracking-widest text-muted2 transition hover:text-muted disabled:opacity-40"
    >
      {pending ? "拟稿中…" : "↻ 换今天的问题"}
    </button>
  );
}
