import { prisma } from "./db";

// A 阶段: 固定返回 owner。将来 C 阶段改为读 session/cookie 返回登录用户,签名不变。
export async function getCurrentUser() {
  const existing = await prisma.user.findFirst({ where: { isOwner: true } });
  if (existing) return existing;
  return prisma.user.create({ data: { name: "我", isOwner: true } });
}
