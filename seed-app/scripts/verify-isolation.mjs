import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const url = "file:./verify-tmp.db";
process.env.DATABASE_URL = url;
execSync("npx prisma db push --skip-generate --accept-data-loss", { cwd: process.cwd(), stdio: "ignore" });

const p = new PrismaClient({ datasources: { db: { url } } });
const a = await p.user.create({ data: { name: "A", isOwner: true } });
const b = await p.user.create({ data: { name: "B" } });
await p.thread.create({ data: { title: "A的线", userId: a.id } });
await p.thread.create({ data: { title: "B的线", userId: b.id } });

const aSees = await p.thread.findMany({ where: { userId: a.id } });
const bSees = await p.thread.findMany({ where: { userId: b.id } });
const ok = aSees.length === 1 && aSees[0].title === "A的线" && bSees.length === 1 && bSees[0].title === "B的线";
console.log(ok ? "PASS 隔离生效" : "FAIL 串了", { a: aSees.map(t=>t.title), b: bSees.map(t=>t.title) });

await p.$disconnect();
// Prisma 把 file:./verify-tmp.db 解析到 schema 所在目录(prisma/),而非 cwd,真实文件在 prisma/verify-tmp.db
rmSync("./prisma/verify-tmp.db", { force: true });
process.exit(ok ? 0 : 1);
