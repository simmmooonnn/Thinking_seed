import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { ingestCore, type IngestOpts } from "./ingest-core";

// 网页侧捕获入口: 取当前用户 → ingestCore → 触发页面刷新。
export async function ingest(text: string, opts?: IngestOpts) {
  const user = await getCurrentUser();
  const res = await ingestCore(user.id, text, opts);
  if (!res) return null;
  revalidatePath("/");
  if (res.suggested) revalidatePath(`/thread/${res.suggested}`);
  return res;
}
