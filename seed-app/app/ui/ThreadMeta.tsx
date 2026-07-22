"use client";

import { useState, useTransition } from "react";
import { updateThread, deleteThread } from "@/app/actions";
import { STATUS_LABEL } from "@/lib/types";

const STATUSES = ["seed", "developing", "decided", "archived"];

export default function ThreadMeta({
  id,
  title,
  question,
  claim,
  status,
}: {
  id: string;
  title: string;
  question: string;
  claim: string;
  status: string;
}) {
  const [, start] = useTransition();
  const [t, setT] = useState(title);
  const [q, setQ] = useState(question);
  const [c, setC] = useState(claim);

  const save = (data: Record<string, string>) => start(() => updateThread(id, data));

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <input
        value={t}
        onChange={(e) => setT(e.target.value)}
        onBlur={() => t.trim() && t !== title && save({ title: t.trim() })}
        className="w-full bg-transparent text-xl font-semibold outline-none"
      />
      <div className="mt-3 space-y-2.5">
        <Field
          label="当前问题"
          value={q}
          onChange={setQ}
          onSave={() => q !== question && save({ question: q })}
          placeholder="你正在追问什么?"
          accent="var(--grow)"
        />
        <Field
          label="当前判断"
          value={c}
          onChange={setC}
          onSave={() => c !== claim && save({ claim: c })}
          placeholder="你现在的立场是?"
          accent="var(--amber)"
        />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => save({ status: s })}
            className="mono rounded-md border px-2.5 py-1 text-[11px]"
            style={{
              color: s === status ? "#04140d" : "var(--muted)",
              background: s === status ? "var(--grow)" : "transparent",
              borderColor: s === status ? "var(--grow)" : "var(--line)",
            }}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <button
          onClick={() => {
            if (confirm("删除这个线程?(里面的条目会退回 Inbox)")) start(() => deleteThread(id));
          }}
          className="mono ml-auto text-[11px] text-muted2 hover:text-txt"
        >
          删除线程
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onSave,
  placeholder,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-lg border border-line bg-panel2 px-3 py-2"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <div className="mono mb-1 text-[10px] uppercase tracking-wider text-muted2">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted2"
      />
    </div>
  );
}
