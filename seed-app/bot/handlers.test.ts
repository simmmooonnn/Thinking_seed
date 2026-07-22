import { test, expect, vi } from "vitest";
import { handleUpdate } from "./handlers";

const baseDeps = () => ({
  resolveUserId: vi.fn(async (id: number) => (id === 7 ? "u1" : null)),
  ingestText: vi.fn(async () => ({ kind: "判断", threadTitle: "AI 把探索变成消费" })),
  transcribe: vi.fn(async () => "转写文本"),
  dailyQuestion: vi.fn(async () => "今天的问题?"),
  reply: vi.fn(async () => {}),
});

test("known user text → ingest + confirm reply", async () => {
  const d = baseDeps();
  await handleUpdate({ update_id: 1, message: { from: { id: 7 }, chat: { id: 7 }, text: "一个念头" } }, d);
  expect(d.ingestText).toHaveBeenCalledWith("u1", "一个念头");
  expect(d.reply).toHaveBeenCalledWith(7, expect.stringContaining("已记下"));
});

test("unknown user → ignored (no ingest, no reply)", async () => {
  const d = baseDeps();
  await handleUpdate({ update_id: 2, message: { from: { id: 999 }, chat: { id: 999 }, text: "x" } }, d);
  expect(d.ingestText).not.toHaveBeenCalled();
  expect(d.reply).not.toHaveBeenCalled();
});

test("/today → sends daily question", async () => {
  const d = baseDeps();
  await handleUpdate({ update_id: 3, message: { from: { id: 7 }, chat: { id: 7 }, text: "/today" } }, d);
  expect(d.reply).toHaveBeenCalledWith(7, expect.stringContaining("今天的问题"));
});
