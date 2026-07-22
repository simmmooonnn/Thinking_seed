"use client";

import { useTransition } from "react";
import { KINDS, KIND_ORDER, kindMeta, type Kind } from "@/lib/types";
import {
  setKind,
  deleteEntry,
  moveEntryToThread,
  newThreadFromEntry,
  confirmLink,
} from "@/app/actions";

export interface EntryNode {
  id: string;
  text: string;
  kind: string;
  threadId: string | null;
  linkSuggested?: boolean;
  audioUrl?: string | null;
  imageUrl?: string | null;
}

export default function EntryPopover({
  entry,
  threads,
  onClose,
  onDone,
}: {
  entry: EntryNode;
  threads: { id: string; title: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const meta = kindMeta(entry.kind);

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line2 bg-panel p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: meta.dot }}
          />
          <span className="mono text-[11px]" style={{ color: meta.dot }}>
            {meta.label}
          </span>
          <button onClick={onClose} className="ml-auto text-muted2 hover:text-txt">
            ✕
          </button>
        </div>

        {entry.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.imageUrl}
            alt="原始图片"
            className="mb-3 max-h-56 w-full rounded-lg border border-line object-contain"
          />
        )}

        <p className="text-[15px] leading-relaxed text-[#e6e6ee] whitespace-pre-wrap">
          {entry.text}
        </p>

        {entry.audioUrl && (
          <div className="mt-3 flex items-center gap-2">
            <span className="mono text-[11px] text-muted2">🎤 原始语音</span>
            <audio src={entry.audioUrl} controls className="h-8 w-full max-w-[16rem]" />
          </div>
        )}

        {/* AI 仮リンクの確認/解除（Provenance: 関係も"人が确定") */}
        {entry.linkSuggested && entry.threadId && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber/40 bg-amber/5 px-3 py-2 text-[12px]">
            <span className="text-amber">
              ✨ AI 把它归入了〈{threads.find((t) => t.id === entry.threadId)?.title ?? "某线程"}〉
            </span>
            <div className="ml-auto flex gap-2">
              <button
                disabled={pending}
                onClick={() => start(async () => { await confirmLink(entry.id); onDone(); })}
                className="rounded border border-grow/50 px-2 py-0.5 text-grow hover:bg-grow/10"
              >
                确认
              </button>
              <button
                disabled={pending}
                onClick={() => start(async () => { await moveEntryToThread(entry.id, null); onDone(); })}
                className="rounded border border-line px-2 py-0.5 text-muted hover:text-txt"
              >
                移出
              </button>
            </div>
          </div>
        )}

        {/* 来源を変える（点开时だけ出る） */}
        <div className="mt-4">
          <div className="mono mb-1.5 text-[10px] uppercase tracking-wider text-muted2">
            这是什么?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                disabled={pending}
                onClick={() => start(async () => { await setKind(entry.id, k); onDone(); })}
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
        </div>

        {/* 归入 / 移动 */}
        <div className="mt-4">
          <div className="mono mb-1.5 text-[10px] uppercase tracking-wider text-muted2">
            属于哪个线程?
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              disabled={pending}
              onClick={() => start(() => newThreadFromEntry(entry.id))}
              className="rounded-md border border-grow/50 px-2 py-1 text-[11px] text-grow"
            >
              + 起新线程
            </button>
            {entry.threadId && (
              <button
                disabled={pending}
                onClick={() => start(async () => { await moveEntryToThread(entry.id, null); onDone(); })}
                className="rounded-md border border-line px-2 py-1 text-[11px] text-muted"
              >
                ↩ 移回 Inbox
              </button>
            )}
            {threads
              .filter((t) => t.id !== entry.threadId)
              .slice(0, 8)
              .map((t) => (
                <button
                  key={t.id}
                  disabled={pending}
                  onClick={() => start(async () => { await moveEntryToThread(entry.id, t.id); onDone(); })}
                  className="max-w-[9rem] truncate rounded-md border border-line px-2 py-1 text-[11px] text-[#d6d6de]"
                >
                  → {t.title}
                </button>
              ))}
          </div>
        </div>

        <button
          disabled={pending}
          onClick={() => start(async () => { await deleteEntry(entry.id); onDone(); })}
          className="mono mt-4 text-[11px] text-muted2 hover:text-txt"
        >
          删除这条
        </button>
      </div>
    </div>
  );
}
