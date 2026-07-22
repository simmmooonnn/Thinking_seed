"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runReading } from "@/app/actions";

export default function ReadingButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <button
      onClick={() =>
        start(async () => {
          try {
            const r = await runReading();
            setNote(r.count > 0 ? `为「${r.title}」找了 ${r.count} 篇` : "所有线程都找过了(或没找到)");
            router.refresh();
          } catch {
            setNote("联网失败,过一会儿再试");
          }
        })
      }
      disabled={pending}
      className="rounded-lg border border-evi/50 px-3.5 py-1.5 text-sm text-evi hover:bg-evi/10 disabled:opacity-40"
      title="每次为下一条还没推荐的线程联网找一批文章"
    >
      {pending ? "联网找文章中…(约 10 秒)" : note ?? "为线程找推荐阅读"}
    </button>
  );
}
