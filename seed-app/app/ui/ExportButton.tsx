"use client";

import { useTransition } from "react";
import { exportAll } from "@/app/actions";

export default function ExportButton() {
  const [pending, start] = useTransition();
  function run() {
    start(async () => {
      const json = await exportAll();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seed-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  return (
    <button
      onClick={run}
      disabled={pending}
      className="rounded-lg border border-line2 px-4 py-2 text-sm hover:border-grow/50 disabled:opacity-40"
    >
      {pending ? "导出中…" : "导出全部数据 (JSON)"}
    </button>
  );
}
