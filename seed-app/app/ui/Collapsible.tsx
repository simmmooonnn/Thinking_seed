"use client";

import { useState, type ReactNode } from "react";

// 折叠壳: 空面板收成一行安静的小字,有需要时一键展开——打开一条线看到的是这条线本身,不是七个工具箱。
export default function Collapsible({
  label,
  defaultOpen,
  children,
}: {
  label: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mono flex w-full items-center rounded-xl border border-line/60 bg-panel/40 px-4 py-2 text-left text-[11.5px] text-muted2 transition hover:border-line hover:text-muted"
      >
        {label}
        <span className="ml-auto">＋</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(false)}
        aria-label="收起"
        className="mono absolute -top-2.5 right-3 z-10 rounded-full border border-line bg-panel px-1.5 text-[10px] text-muted2 hover:text-txt"
      >
        —
      </button>
      {children}
    </div>
  );
}
