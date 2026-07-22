"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEntry } from "@/app/actions";

export default function CaptureBar() {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [pending, start] = useTransition();

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
      await createEntry(fd);
      setVal("");
      router.refresh();
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
          else router.refresh();
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
                  : "刚刚想到了什么?  ↵ 记下 · 🎤 说"
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
