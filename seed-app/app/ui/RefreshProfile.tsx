"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshTodayProfile } from "@/app/actions";

export default function RefreshProfile() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { try { await refreshTodayProfile(); router.refresh(); } catch { /* 保留今日画像 */ } })}
      disabled={pending}
      className="mono text-[11px] tracking-widest text-muted2 transition hover:text-muted disabled:opacity-40"
    >
      {pending ? "重画中…" : "↻ 重新生成"}
    </button>
  );
}
