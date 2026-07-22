"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 后台自动跑 Active Seed:打开首页后过一会儿、之后每 30 分钟,
// 处理一条还没挑战的线程 + 扫矛盾。全挑战过后自然安静。
export default function AutoSeed() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/cron/challenge", { method: "POST" });
        const j = await r.json();
        if (alive && j.generated) router.refresh();
      } catch {
        /* silent */
      }
    };
    const t = setTimeout(run, 12000);
    const iv = setInterval(run, 30 * 60 * 1000);
    return () => { alive = false; clearTimeout(t); clearInterval(iv); };
  }, [router]);
  return null;
}
