"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEntry, setKind, moveEntryToThread, type CaptureReceipt } from "@/app/actions";
import { kindMeta, type Kind } from "@/lib/types";

// 回执可纠正的类别(用户自己的五类)
const FIX_KINDS: Kind[] = ["observation", "judgment", "question", "hypothesis", "decision"];

export default function CaptureBar() {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [pending, start] = useTransition();
  const [receipt, setReceipt] = useState<CaptureReceipt | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 録音
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [secs, setSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((c) => (c === msg ? null : c)), 3200);
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // 卸载时若还在录音,停掉 recorder 并释放麦克风轨道(否则麦克风指示灯一直亮)
      const mr = recRef.current;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stream.getTracks().forEach((t) => t.stop());
          mr.stop();
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  async function uploadImage(f: File) {
    if (!f.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("image", f);
      const res = await fetch("/api/image", { method: "POST", body: fd });
      const j = await res.json();
      if (j.error) notify(j.error);
      else router.refresh();
    } catch {
      notify("图片上传失败。");
    } finally {
      setUploading(false);
    }
  }

  function submitText() {
    const text = val.trim();
    if (!text || pending) return;
    const fd = new FormData();
    fd.set("text", text);
    start(async () => {
      try {
        const r = await createEntry(fd);
        setVal("");
        setReceipt(r);
        router.refresh();
      } catch {
        notify("没记下(网络波动),请重试。");
      }
    });
  }

  // 回执 8 秒后自动消失(纠正会刷新计时);不强制任何确认
  useEffect(() => {
    if (!receipt) return;
    const t = setTimeout(() => setReceipt(null), 8000);
    return () => clearTimeout(t);
  }, [receipt]);

  // 桌面零摩擦: 任意处按 / 直接聚焦输入条;Esc 失焦
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && el === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 一步纠正: 改类别 / 移出线程(不打断,不强制)
  function fixKind(k: Kind) {
    const r = receipt;
    if (!r || pending) return;
    start(async () => {
      try {
        await setKind(r.id, k);
        setReceipt({ ...r, kind: k });
        router.refresh();
      } catch {
        notify("没改成,请重试。");
      }
    });
  }
  function unlink() {
    const r = receipt;
    if (!r || pending) return;
    start(async () => {
      try {
        await moveEntryToThread(r.id, null);
        setReceipt({ ...r, threadId: null, threadTitle: null, question: null });
        router.refresh();
      } catch {
        notify("没改成,请重试。");
      }
    });
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) return;
        setUploading(true);
        try {
          const fd = new FormData();
          fd.set("audio", blob, "audio.webm");
          const res = await fetch("/api/voice", { method: "POST", body: fd });
          const j = await res.json();
          if (j.error) notify(j.error);
          else {
            if (j.entryId) {
              setReceipt({
                id: j.entryId,
                kind: j.kind ?? "observation",
                threadId: j.threadId ?? null,
                threadTitle: j.threadTitle ?? null,
                question: j.question ?? null,
              });
            }
            router.refresh();
          }
        } catch {
          notify("上传失败,检查网络。");
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      notify("无法访问麦克风:需允许权限(localhost/https 才能录音)。");
    }
  }

  function stopRec() {
    recRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const busy = pending || uploading;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 p-4">
      {toast && (
        <div className="toast pointer-events-auto rounded-full border border-amber/40 bg-panel/95 px-4 py-2 text-[13px] text-amber shadow-xl backdrop-blur">
          {toast}
        </div>
      )}

      {/* 捕获回执: AI 的归类是"可见、可查、可撤销"的 —— 一步纠正,不点 8 秒后自动消失 */}
      {receipt && (
        <div className="toast pointer-events-auto w-full max-w-xl rounded-2xl border border-line2 bg-panel/95 px-4 py-2.5 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="select-none">🌱</span>
            <span className="text-muted">已记下</span>
            <span className="mono text-[12px]" style={{ color: kindMeta(receipt.kind).dot }}>
              {kindMeta(receipt.kind).label}
            </span>
            <span className="min-w-0 truncate text-txt">
              {receipt.threadTitle ? `→「${receipt.threadTitle}」` : "→ 收件箱"}
            </span>
            <button
              onClick={() => setReceipt(null)}
              aria-label="知道了"
              className="mono ml-auto shrink-0 rounded px-1 text-muted2 hover:text-txt"
            >
              ✕
            </button>
          </div>
          {receipt.question && (
            <p className="mt-1 truncate text-[12px] text-muted2">这条线在问:{receipt.question}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="mono text-[10px] text-muted2">不对?</span>
            {FIX_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => fixKind(k)}
                disabled={pending || receipt.kind === k}
                className="mono rounded-md border px-1.5 py-0.5 text-[10px] transition disabled:opacity-90"
                style={{
                  color: receipt.kind === k ? kindMeta(k).dot : "var(--muted)",
                  borderColor: receipt.kind === k ? `${kindMeta(k).dot}66` : "var(--line)",
                  background: receipt.kind === k ? "rgba(255,255,255,.05)" : "transparent",
                }}
              >
                {kindMeta(k).label}
              </button>
            ))}
            {receipt.threadId && (
              <button
                onClick={unlink}
                disabled={pending}
                className="mono rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted transition hover:text-txt disabled:opacity-40"
              >
                移出线程
              </button>
            )}
          </div>
        </div>
      )}
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-line2 bg-panel/90 px-2 py-2 shadow-2xl backdrop-blur">
        {/* マイク */}
        <button
          onClick={recording ? stopRec : startRec}
          disabled={uploading || pending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40"
          style={{
            borderColor: recording ? "#f87171" : "var(--line2)",
            background: recording ? "rgba(248,113,113,.15)" : "transparent",
            color: recording ? "#f87171" : "var(--muted)",
          }}
          title={recording ? "停止并转写" : "语音记录"}
        >
          {recording ? "■" : "🎤"}
        </button>

        {/* 图片/截图 */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy || recording}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line2 text-muted transition hover:text-txt disabled:opacity-40"
          title="上传图片 / 截图(也可直接粘贴)"
        >
          📎
        </button>

        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onPaste={(e) => {
            const img = Array.from(e.clipboardData.items).find((it) => it.type.startsWith("image/"));
            if (img) {
              const f = img.getAsFile();
              if (f) { e.preventDefault(); uploadImage(f); }
            }
          }}
          onKeyDown={(e) => {
            // 中文/日文输入法组词时按 Enter 只是上屏候选词,不能当提交
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submitText();
          }}
          placeholder={
            recording
              ? `录音中 ${secs}s… 点 ■ 停止`
              : uploading
                ? "转写中…"
                : pending
                  ? "AI 识别来源…"
                  : "刚刚想到了什么?  ↵ 记下 · 🎤 说 · 任意处按 /"
          }
          disabled={recording || uploading}
          className="flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-muted2 disabled:opacity-60"
        />

        {recording && (
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full" style={{ background: "#f87171" }} />
        )}

        <button
          onClick={submitText}
          disabled={busy || recording || !val.trim()}
          className="h-9 w-9 shrink-0 rounded-full bg-grow text-lg font-bold text-[#04140d] transition hover:brightness-110 disabled:opacity-40"
          title="记下"
        >
          +
        </button>
      </div>
    </div>
  );
}
