// 一次性回填脚本:仅用于"已有数据、userId 字段还是可空"的中间态。
// 全新空库无需跑这个——schema 里 userId 直接设必填,`prisma db push` 建表即可,没有历史行要补。
// 若要在已有数据的旧库上做这次迁移,顺序是:
//   1. schema 里先把 userId 设为可空,`prisma db push`(或 migrate)让旧行能存在;
//   2. 跑本脚本,把 userId 为空的历史行统一挂到 owner 用户上;
//   3. 确认回填完整后,把 schema 里的 userId 改回必填;
//   4. 再跑一次 `prisma db push`(或 migrate)落地必填约束。
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const owner =
  (await p.user.findFirst({ where: { isOwner: true } })) ??
  (await p.user.create({ data: { name: "我", isOwner: true } }));

const r = {
  thread: (await p.thread.updateMany({ where: { userId: null }, data: { userId: owner.id } })).count,
  entry: (await p.entry.updateMany({ where: { userId: null }, data: { userId: owner.id } })).count,
  brief: (await p.dailyBrief.updateMany({ where: { userId: null }, data: { userId: owner.id } })).count,
  link: (await p.threadLink.updateMany({ where: { userId: null }, data: { userId: owner.id } })).count,
};
console.log("owner", owner.id, "backfilled", r);
await p.$disconnect();
