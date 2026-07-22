"use client";

import { useState, useTransition } from "react";
import { KINDS, KIND_ORDER, kindMeta, type Kind } from "@/lib/types";
import { setKind, deleteEntry, moveEntryToThread } from "@/app/actions";

export interface EntryDTO {
  id: string;
  text: string;
  kind: string;
  aiSuggested: boolean;
  threadId: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
}

const authorBorder: Record<string, string> = {
  human: "var(--grow)",
  ai: "var(--ai)",
  external: "var(--evi)",
};

export default function EntryCard({ entry }: { entry: EntryDTO }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const meta = kindMeta(entry.kind);
  const border = entry.kind === "decision" ? "var(--amber)" : authorBorder[meta.author];

  return (
    <div
      className="group rounded-xl border border-line bg-panel2 p-3.5"
      style={{ borderLeft: `3px solid ${border}` }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="mono inline-flex items-center gap-1.5 text-[11px]"
          style={{ color: meta.dot }}
          title="点击修改来源"
        >
          <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: meta.dot }} />
          {meta.label}
          {entry.aiSuggested && <span className="text-ai/70">✨</span>}
        </button>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted2 opacity-0 transition group-hover:opacity-100">
          <button
            disabled={pending}
            onClick={() => start(() => moveEntryToThread(entry.id, null))}
            className="hover:text-txt"
            title="移回 Inbox"
          >
            ↩
          </button>
          <button
            disabled={pending}
            onClick={() => confirm("删除这条?") && start(() => deleteEntry(entry.id))}
            className="hover:text-txt"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>

      {open && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              disabled={pending}
              onClick={() => start(async () => { await setKind(entry.id, k as Kind); setOpen(false); })}
              className="mono rounded-md border px-2 py-1 text-[11px]"
              style={{
                color: KINDS[k].dot,
                borderColor: k === entry.kind ? KINDS[k].dot : "var(--line)",
                background: k === entry.kind ? "rgba(255,255,255,.05)" : "transparent",
              }}
            >
              {KINDS[k].label}
            </button>
          ))}
        </div>
      )}

      {entry.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.imageUrl}
          alt="图片"
          className="mb-2 max-h-48 w-full rounded-lg border border-line object-contain"
        />
      )}
      <p className="text-[15px] leading-relaxed text-[#d6d6de] whitespace-pre-wrap">
        {entry.audioUrl && <span className="mr-1 text-muted2" title="语音">🎤</span>}
        {entry.imageUrl && <span className="mr-1 text-muted2" title="图片">🖼️</span>}
        {entry.text}
      </p>
      {entry.audioUrl && (
        <audio src={entry.audioUrl} controls className="mt-2 h-8 w-full max-w-[16rem]" />
      )}
    </div>
  );
}
