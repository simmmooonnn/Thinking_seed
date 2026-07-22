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
