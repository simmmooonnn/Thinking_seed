"use client";

import { useRef, useState, useTransition } from "react";

export default function CaptureBox({
  action,
  placeholder = "刚刚想到了什么?",
  cta = "记下",
}: {
  action: (fd: FormData) => Promise<void>;
  placeholder?: string;
  cta?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  const [val, setVal] = useState("");

  function submit() {
    const text = val.trim();
    if (!text || pending) return;
    const fd = new FormData();
    fd.set("text", text);
    start(async () => {
      await action(fd);
      setVal("");
      ref.current?.focus();
    });
  }

  return (
    <div className="rounded-2xl border border-line2 bg-panel p-3 focus-within:border-grow/50">
      <textarea
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted2"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="mono text-[11px] text-muted2">
          {pending ? "AI 正在识别来源…" : "⌘/Ctrl + Enter 提交 · AI 只提议来源,你确认"}
        </span>
        <button
          onClick={submit}
          disabled={pending || !val.trim()}
          className="rounded-lg bg-grow px-4 py-1.5 text-sm font-semibold text-[#04140d] transition hover:brightness-110 disabled:opacity-40"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
