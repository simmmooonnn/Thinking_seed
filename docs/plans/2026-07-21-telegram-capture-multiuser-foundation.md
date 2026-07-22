# Telegram 零摩擦捕获 + 多人数据模型地基 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让作者能在 Telegram 里(文字/语音)零摩擦捕获念头并被每日推送拉回,同时把数据层改造成多人就绪(User + userId 全局隔离 + getCurrentUser 接缝),全程不部署、纯本地。

**Architecture:** 阶段 A 先在现有 Next.js/Prisma 应用里引入 `User` 与 `userId` 全局隔离和 `getCurrentUser()` 接缝(A 阶段固定返回 owner),并把捕获管线拆成可被非 Next 进程复用的纯核 `ingest-core`。阶段 B 在 `seed-app/bot/` 加一个长轮询(getUpdates)的独立 node 进程,复用 ingest-core / transcribe / ai,把 Telegram 消息写进同一个 dev.db,并每天推送今日之问。

**Tech Stack:** Next.js 16.2.10 (App Router)、React 19、Prisma 6.19.3(锁定)、SQLite、@anthropic-ai/sdk(模型 `claude-haiku-4-5`)、OpenAI Whisper、新增 devDeps:`tsx`(跑 TS bot)、`dotenv`(bot 载入 .env.local)、`vitest`(纯逻辑单测)。Telegram 用原生 `fetch` 调 `https://api.telegram.org/bot<token>/<method>`,不加 SDK。

## Global Constraints

- **Prisma 锁定 6.19.3**,不得升级到 7(7 移除了 datasource 的 `url`,需 driver adapter)。
- **Next.js 16 有破坏性变更**:改动前读 `seed-app/node_modules/next/dist/docs/` 对应指南。
- **AI 模型固定 `claude-haiku-4-5`**(最便宜);结构化输出用 `output_config.format.json_schema`。
- **秘密不入库**:`.env` / `.env.local` / `*.db` 已被根 `.gitignore` 挡住;任何新配置项写进 `.env.local`,绝不硬编码或提交。
- **提交无 Claude 痕迹**:commit message 不带 `Co-Authored-By`、不带任何 Claude/工具标注;作者身份用本地已配置的 `simmmooonnn <simoon@umich.edu>`。
- **UI/回复文案用中文**,风格与现有一致(简洁、口语)。
- **不新增重依赖**:只允许 `tsx`、`dotenv`、`vitest`(devDeps)。
- **bot 目录在 `seed-app/bot/`**,与 app 共享 node_modules / prisma client;bot 内部用**相对路径** import `../lib/*`(不依赖 `@/` 别名,避免 tsx 解析问题)。
- **成本边界**:bot 捕获每条最多一次分类 + 一次归线 AI 调用;语音多一次 Whisper。不在本计划做限流(阶段 D)。

## 本计划不做(YAGNI)

云端部署、真登录/注册、SQLite→Postgres、自带 key、限流、图片捕获、Active Seed 挑战推送、共鸣 V5。

---

## 文件结构

**新建**
- `seed-app/lib/auth.ts` — `getCurrentUser()` 接缝(A 阶段返回 owner)。
- `seed-app/lib/ingest-core.ts` — 纯捕获管线(classify→suggest→create→touch,写 userId),无 server-only、无 revalidate。
- `seed-app/scripts/backfill-user.mjs` — 一次性:建 owner + 回填 userId。
- `seed-app/scripts/verify-isolation.mjs` — 两用户隔离验证(临时 DB)。
- `seed-app/bot/telegram.ts` — Telegram HTTP 薄封装(getMe/getUpdates/sendMessage/getFile/downloadFile)。
- `seed-app/bot/handlers.ts` — `handleUpdate(update, deps)` 纯分发(依赖注入,可单测)。
- `seed-app/bot/schedule.ts` — `shouldPushDaily(lastPushedISO, now, hour)` 纯函数。
- `seed-app/bot/index.ts` — 长轮询主循环 + 依赖装配 + 每日推送。
- `seed-app/bot/*.test.ts` — vitest 单测(telegram URL、handler 分发、schedule)。
- `seed-app/vitest.config.ts` — 最小 vitest 配置。

**修改**
- `seed-app/prisma/schema.prisma` — User + userId + DailyBrief 复合唯一。
- `seed-app/lib/ingest.ts` — 改为 ingest-core 的薄包装(+ revalidate)。
- `seed-app/lib/signals.ts` — 接受/使用 userId 过滤。
- `seed-app/app/actions.ts` — 全部 action 按 getCurrentUser 隔离。
- `seed-app/app/page.tsx`、`mind/page.tsx`、`brief/page.tsx`、`reading/page.tsx`、`outputs/page.tsx`、`thread/[id]/page.tsx` — 查询按 userId。
- `seed-app/app/api/{capture,voice,image,cron/challenge}/route.ts` — 按 userId。
- `seed-app/package.json` — devDeps + `bot`/`test` 脚本。

---

## 阶段 A:多人数据模型地基

### Task A1:Schema 加 User + 可空 userId + 关系

**Files:**
- Modify: `seed-app/prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma models `User { id, name?, telegramUserId? @unique, isOwner, createdAt, threads, entries, briefs, links }`;`Thread/Entry/DailyBrief/ThreadLink` 各多一个 `userId String?` + `user User? @relation(...)`;`DailyBrief` 复合唯一 `@@unique([userId, date])`。

- [ ] **Step 1:先停开发服务器**(db push 会因 query_engine.dll 被占而 EPERM)

Run:
```bash
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }"
```
Expected: 无输出(端口已释放)。

- [ ] **Step 2:编辑 schema——新增 User,并给根实体加可空 userId + 关系**

在 `seed-app/prisma/schema.prisma` 顶部(datasource/generator 之后)加:
```prisma
model User {
  id             String   @id @default(cuid())
  name           String?
  telegramUserId String?  @unique
  isOwner        Boolean  @default(false)
  createdAt      DateTime @default(now())

  threads Thread[]
  entries Entry[]
  briefs  DailyBrief[]
  links   ThreadLink[]
}
```
在 `Thread` 内加:
```prisma
  userId String?
  user   User?   @relation(fields: [userId], references: [id], onDelete: Cascade)
```
在 `Entry` 内加同样两行(`userId String?` + `user User? @relation(...)`)。
在 `DailyBrief` 内加同样两行,并把原来的 `date String @unique` 改成 `date String`,在 model 末尾加:
```prisma
  @@unique([userId, date])
```
在 `ThreadLink` 内加同样两行(`userId String?` + `user User? @relation(...)`)。

- [ ] **Step 3:推 schema 到本地 DB(可空列,数据不丢)**

Run:
```bash
cd seed-app && npx prisma db push
```
Expected: `Your database is now in sync with your Prisma schema`,并重新生成 client。

- [ ] **Step 4:验证 User 表存在、旧数据仍在**

Run:
```bash
cd seed-app && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{console.log('users',await p.user.count(),'threads',await p.thread.count(),'entries',await p.entry.count());await p.\$disconnect()})()"
```
Expected: `users 0 threads <非0> entries <非0>`(旧数据在,User 空)。

- [ ] **Step 5:Commit**

```bash
cd .. && git add seed-app/prisma/schema.prisma && git commit -m "schema: add User model and nullable userId on owned entities"
```

---

### Task A2:回填 owner + userId,再把列改为必填

**Files:**
- Create: `seed-app/scripts/backfill-user.mjs`
- Modify: `seed-app/prisma/schema.prisma`(userId 去掉 `?`)

**Interfaces:**
- Consumes: Task A1 的 schema。
- Produces: 数据库中存在一个 `isOwner:true` 的 User;所有 Thread/Entry/DailyBrief/ThreadLink 的 `userId` 指向它;schema 中这些 `userId` 变为必填 `String`。

- [ ] **Step 1:写回填脚本**

Create `seed-app/scripts/backfill-user.mjs`:
```js
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
```

- [ ] **Step 2:跑回填**

Run:
```bash
cd seed-app && node scripts/backfill-user.mjs
```
Expected: 打印 `owner <id> backfilled { thread: N, entry: M, brief: K, link: J }`。

- [ ] **Step 3:确认无残留 null**

Run:
```bash
cd seed-app && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const n=await p.thread.count({where:{userId:null}})+await p.entry.count({where:{userId:null}});console.log('null userId rows:',n);await p.\$disconnect()})()"
```
Expected: `null userId rows: 0`。

- [ ] **Step 4:把 schema 里四处 `userId String?` 改为 `userId String`,relation 的 `User?` 改为 `User`**(去掉两处问号:字段类型与关系类型)。然后 db push:

Run:
```bash
cd seed-app && npx prisma db push
```
Expected: in sync,无因 null 报错(因已回填)。

- [ ] **Step 5:Commit**

```bash
cd .. && git add seed-app/scripts/backfill-user.mjs seed-app/prisma/schema.prisma && git commit -m "data: backfill owner userId and make userId required"
```

---

### Task A3:getCurrentUser() 接缝

**Files:**
- Create: `seed-app/lib/auth.ts`

**Interfaces:**
- Produces: `export async function getCurrentUser(): Promise<{ id: string; name: string | null; telegramUserId: string | null }>` — A 阶段返回 `isOwner:true` 的用户(不存在则创建)。

- [ ] **Step 1:写 lib/auth.ts**

Create `seed-app/lib/auth.ts`:
```ts
import { prisma } from "./db";

// A 阶段: 固定返回 owner。将来 C 阶段改为读 session/cookie 返回登录用户,签名不变。
export async function getCurrentUser() {
  const existing = await prisma.user.findFirst({ where: { isOwner: true } });
  if (existing) return existing;
  return prisma.user.create({ data: { name: "我", isOwner: true } });
}
```

- [ ] **Step 2:验证返回 owner**

Run:
```bash
cd seed-app && npx tsx -e "import {getCurrentUser} from './lib/auth'; getCurrentUser().then(u=>{console.log('owner',u.id,u.isOwner);process.exit(0)})"
```
Expected: 打印 owner id。(若 tsx 未装,本步在 Task B1 装 tsx 后再验;可先跳过并在 A6 的构建中间接覆盖。)

- [ ] **Step 3:Commit**

```bash
cd .. && git add seed-app/lib/auth.ts && git commit -m "auth: add getCurrentUser seam (owner for now)"
```

---

### Task A4:抽出 ingest-core(纯管线,带 userId),ingest 变薄包装

**Files:**
- Create: `seed-app/lib/ingest-core.ts`
- Modify: `seed-app/lib/ingest.ts`

**Interfaces:**
- Consumes: `classifyKind`, `suggestThread`(来自 `./ai`)、`prisma`。
- Produces:
  - `export interface IngestOpts { audioUrl?: string; imageUrl?: string; source?: string; kind?: string }`
  - `export async function ingestCore(userId: string, text: string, opts?: IngestOpts): Promise<{ entry: Entry; suggested: string | null } | null>` — 分类→在**该 userId 的**线程里 suggest→create(带 userId)→touch 该线程 updatedAt。**不 revalidate。**
  - `ingest.ts` 保留原签名 `ingest(text, opts?)`,内部 `getCurrentUser()` 取 userId → `ingestCore` → `revalidatePath`。

- [ ] **Step 1:写 lib/ingest-core.ts**

Create `seed-app/lib/ingest-core.ts`:
```ts
import { prisma } from "./db";
import { classifyKind, suggestThread } from "./ai";

export interface IngestOpts {
  audioUrl?: string;
  imageUrl?: string;
  source?: string;
  kind?: string;
}

// 纯捕获管线: 网页(经 ingest.ts 包装)与 bot 进程共用。按 userId 隔离,不做 revalidate。
export async function ingestCore(userId: string, text: string, opts?: IngestOpts) {
  const t = text.trim();
  if (!t) return null;

  const [kind, threads] = await Promise.all([
    opts?.kind ? Promise.resolve(opts.kind) : classifyKind(t),
    prisma.thread.findMany({
      where: { userId, status: { not: "archived" } },
      select: { id: true, title: true, claim: true },
    }),
  ]);
  const suggested = await suggestThread(t, threads);

  const entry = await prisma.entry.create({
    data: {
      text: t,
      kind,
      aiSuggested: true,
      userId,
      threadId: suggested ?? null,
      linkSuggested: !!suggested,
      audioUrl: opts?.audioUrl ?? null,
      imageUrl: opts?.imageUrl ?? null,
      source: opts?.source ?? "text",
    },
  });

  if (suggested) {
    await prisma.thread.update({ where: { id: suggested }, data: { updatedAt: new Date() } });
  }
  return { entry, suggested };
}
```

- [ ] **Step 2:把 lib/ingest.ts 改为薄包装**

Replace `seed-app/lib/ingest.ts` 全文:
```ts
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
```

- [ ] **Step 3:构建验证(类型/引用无误)**

Run:
```bash
cd seed-app && npx tsc --noEmit
```
Expected: 无输出(通过)。

- [ ] **Step 4:Commit**

```bash
cd .. && git add seed-app/lib/ingest-core.ts seed-app/lib/ingest.ts && git commit -m "ingest: extract user-scoped ingestCore; ingest wraps it"
```

---

### Task A5:server actions + signals 按 userId 隔离

**Files:**
- Modify: `seed-app/app/actions.ts`、`seed-app/lib/signals.ts`

**Interfaces:**
- Consumes: `getCurrentUser`(A3)、`ingestCore`(A4)。
- Produces: 所有 action 的读查询 `where` 带 `userId: user.id`;所有 create 写 `userId: user.id`;`gatherQuestionSignals(userId)` 接收 userId 参数。

**转换规则(对该文件每个 prisma 调用逐一套用):**
- 函数体开头加 `const user = await getCurrentUser();`(已在别处取过则复用)。
- `prisma.thread.findMany/findFirst/findUnique/count(...)`:在 `where` 合并 `userId: user.id`(findUnique 若按 id,改用 findFirst 加 `userId` 以防越权读他人)。
- `prisma.entry.*`、`prisma.dailyBrief.*`、`prisma.threadLink.*` 同理加 `userId`。
- 子表 `claimVersion/challenge/reading`:通过其 thread 过滤 —— 写前先确认 `thread.userId===user.id`;查询用 `where: { thread: { userId: user.id } }`。
- create 时补 `userId: user.id`(threadLink、dailyBrief upsert 的 create 分支、任何直接建的 entry/thread)。
- `createEntry` 改为调用 `ingest`(已内含 user);`newThreadFromEntry`/`createThread` create 时写 `userId`。
- `computeProfile`/`computeEvolution`/`getNudge`/`refreshDailyQuestion`/`scanContradictions`/`mainlines`/`reflect`/`discoverThreadLinks`/`makeWeekly`/`exportAll` 等:所有 findMany 加 `userId`。
- `refreshDailyQuestion` 的 `dailyBrief.upsert`:`where` 用复合键 `{ userId_date: { userId: user.id, date } }`,create 带 `userId`。
- 调用 `gatherQuestionSignals()` 处改为 `gatherQuestionSignals(user.id)`。

**示例(exportAll,展示 where 注入):**
```ts
export async function exportAll(): Promise<string> {
  const user = await getCurrentUser();
  const [threads, inbox, versions, challenges, readings, links, briefs] = await Promise.all([
    prisma.thread.findMany({ where: { userId: user.id }, include: { entries: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
    prisma.entry.findMany({ where: { userId: user.id, threadId: null }, orderBy: { createdAt: "asc" } }),
    prisma.claimVersion.findMany({ where: { thread: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.challenge.findMany({ where: { thread: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.reading.findMany({ where: { thread: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.threadLink.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.dailyBrief.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
  ]);
  return JSON.stringify({ exportedAt: new Date().toISOString(), threads, inbox, versions, challenges, readings, links, briefs }, null, 2);
}
```

- [ ] **Step 1:改 `lib/signals.ts` 接收 userId**

把 `gatherQuestionSignals()` 签名改为 `gatherQuestionSignals(userId: string)`;其中 `prisma.thread.findMany({ where: { status: {...} } })` 合并 `userId`;`claimVersion.findFirst` 的 thread 过滤加 `where: { thread: { userId } }`。

- [ ] **Step 2:按转换规则逐一改 `app/actions.ts` 的每个 action**(含上面示例与 upsert 复合键)。

- [ ] **Step 3:类型检查**

Run: `cd seed-app && npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 4:Commit**

```bash
cd .. && git add seed-app/app/actions.ts seed-app/lib/signals.ts && git commit -m "actions/signals: scope all queries by current user"
```

---

### Task A6:pages + api routes + cron 按 userId 隔离;两用户隔离测试

**Files:**
- Modify: `seed-app/app/page.tsx`、`mind/page.tsx`、`brief/page.tsx`、`reading/page.tsx`、`outputs/page.tsx`、`thread/[id]/page.tsx`、`app/api/{capture,voice,image,cron/challenge}/route.ts`
- Create: `seed-app/scripts/verify-isolation.mjs`

**Interfaces:**
- Consumes: `getCurrentUser`。
- Produces: 页面/路由渲染只含当前用户数据;`thread/[id]` 若线程不属当前用户 → `notFound()`。

**转换规则:**
- 每个 page 组件开头 `const user = await getCurrentUser();`,所有 prisma 读加 `where: { userId: user.id }`(子表用 `thread: { userId: user.id }`)。
- `thread/[id]/page.tsx`:取线程改 `prisma.thread.findFirst({ where: { id, userId: user.id }, ... })`,取不到 → `notFound()`。
- api routes(capture/voice/image):落库改走 `ingestCore(user.id, ...)`(voice/image 先转写/描述再 ingestCore);`cron/challenge` 的 `thread.findMany` 加 `userId`,并对 challenge/reading 的 thread 归属校验。cron 无 http 会话,用 `getCurrentUser()`(A 阶段=owner)即可。

- [ ] **Step 1:逐个改 6 个 page + 4 个 route**(套用转换规则)。

- [ ] **Step 2:写隔离验证脚本(临时独立 DB,不碰 dev.db)**

Create `seed-app/scripts/verify-isolation.mjs`:
```js
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
rmSync("./verify-tmp.db", { force: true });
process.exit(ok ? 0 : 1);
```

- [ ] **Step 3:跑隔离测试**

Run: `cd seed-app && node scripts/verify-isolation.mjs`
Expected: `PASS 隔离生效`,退出码 0。

- [ ] **Step 4:全量构建回归**

Run: `cd seed-app && npx tsc --noEmit && npm run build`
Expected: `✓ Compiled successfully`,静态页生成无报错。

- [ ] **Step 5:手动冒烟**(dev 起来,首页/线程/mind/brief 正常渲染 owner 数据)

Run: `cd seed-app && npm run dev`(另开)后 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: `200`;点开一条线程 `/thread/<id>` 也 200,非 owner 的乱 id → 404。

- [ ] **Step 6:Commit**

```bash
cd .. && git add seed-app/app seed-app/scripts/verify-isolation.mjs && git commit -m "pages/routes/cron: scope by current user; add isolation test"
```

---

## 阶段 B:Telegram 捕获 + 回来 bot

### Task B1:bot 工具链与骨架(getMe 打通)

**Files:**
- Modify: `seed-app/package.json`
- Create: `seed-app/vitest.config.ts`、`seed-app/bot/telegram.ts`(占位 getMe)、`seed-app/bot/index.ts`(占位)
- Modify: `seed-app/.env.local`(加 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_OWNER_ID`)——**手动**,不提交

**Interfaces:**
- Produces: `npm run bot` 能连上 Telegram 打印 bot 用户名;`npm test` 能跑 vitest。

- [ ] **Step 1:装 devDeps**

Run:
```bash
cd seed-app && npm i -D tsx dotenv vitest
```
Expected: 安装成功(Prisma 版本不动)。

- [ ] **Step 2:package.json 加脚本**

在 `scripts` 加:
```json
"bot": "tsx --env-file=.env.local bot/index.ts",
"test": "vitest run"
```

- [ ] **Step 3:vitest 最小配置**

Create `seed-app/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["bot/**/*.test.ts"], environment: "node" } });
```

- [ ] **Step 4:telegram.ts 先只做 getMe**

Create `seed-app/bot/telegram.ts`:
```ts
const BASE = (token: string) => `https://api.telegram.org/bot${token}`;

async function call<T>(token: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE(token)}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result as T;
}

export function getMe(token: string) {
  return call<{ id: number; username: string }>(token, "getMe");
}
```

- [ ] **Step 5:index.ts 占位——打印 getMe**

Create `seed-app/bot/index.ts`:
```ts
import { getMe } from "./telegram";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error("缺 TELEGRAM_BOT_TOKEN(写进 .env.local)"); process.exit(1); }

const me = await getMe(token);
console.log(`bot 已连接: @${me.username}`);
```

- [ ] **Step 6:手动在 .env.local 加两行**(不提交):
```
TELEGRAM_BOT_TOKEN="<BotFather 给的 token>"
TELEGRAM_OWNER_ID="<你的 Telegram 数字 user id>"
```
(拿 owner id:给 bot 发一句话后看 B4 日志,或先用 @userinfobot 查。)

- [ ] **Step 7:验证连通**

Run: `cd seed-app && npm run bot`
Expected: 打印 `bot 已连接: @你的botname`,进程退出。

- [ ] **Step 8:Commit(不含 .env.local)**

```bash
cd .. && git add seed-app/package.json seed-app/package-lock.json seed-app/vitest.config.ts seed-app/bot/telegram.ts seed-app/bot/index.ts && git commit -m "bot: tooling + telegram getMe skeleton"
```

---

### Task B2:Telegram 客户端补全 + 单测

**Files:**
- Modify: `seed-app/bot/telegram.ts`
- Create: `seed-app/bot/telegram.test.ts`

**Interfaces:**
- Produces:
  - `getUpdates(token, offset?): Promise<Update[]>`
  - `sendMessage(token, chatId, text): Promise<void>`
  - `getFile(token, fileId): Promise<{ file_path: string }>`
  - `downloadFile(token, filePath): Promise<Buffer>`
  - 类型 `Update`(含 `update_id`、可选 `message: { from:{id}, chat:{id}, text?, voice?:{file_id}, entities? }`)。

- [ ] **Step 1:写失败单测(sendMessage 构造正确请求)**

Create `seed-app/bot/telegram.test.ts`:
```ts
import { test, expect, vi } from "vitest";
import { sendMessage } from "./telegram";

test("sendMessage posts chat_id + text to sendMessage endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, result: {} }) });
  vi.stubGlobal("fetch", fetchMock);
  await sendMessage("TKN", 42, "hi");
  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.telegram.org/botTKN/sendMessage");
  expect(JSON.parse(opts.body)).toEqual({ chat_id: 42, text: "hi" });
});
```

- [ ] **Step 2:跑,确认失败**

Run: `cd seed-app && npm test`
Expected: FAIL(`sendMessage` 未导出)。

- [ ] **Step 3:实现 getUpdates/sendMessage/getFile/downloadFile + 类型**

在 `bot/telegram.ts` 追加:
```ts
export interface Update {
  update_id: number;
  message?: {
    from?: { id: number };
    chat: { id: number };
    text?: string;
    voice?: { file_id: string };
    entities?: { type: string }[];
  };
}

export function getUpdates(token: string, offset?: number) {
  return call<Update[]>(token, "getUpdates", { offset, timeout: 30 });
}

export async function sendMessage(token: string, chatId: number, text: string) {
  await call(token, "sendMessage", { chat_id: chatId, text });
}

export function getFile(token: string, fileId: string) {
  return call<{ file_path: string }>(token, "getFile", { file_id: fileId });
}

export async function downloadFile(token: string, filePath: string): Promise<Buffer> {
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  return Buffer.from(await res.arrayBuffer());
}
```

- [ ] **Step 4:跑,确认通过**

Run: `cd seed-app && npm test`
Expected: PASS。

- [ ] **Step 5:Commit**

```bash
cd .. && git add seed-app/bot/telegram.ts seed-app/bot/telegram.test.ts && git commit -m "bot: telegram client (getUpdates/sendMessage/getFile/download) + test"
```

---

### Task B3:handleUpdate 分发(依赖注入)+ 单测(文字捕获 / 未知用户忽略)

**Files:**
- Create: `seed-app/bot/handlers.ts`、`seed-app/bot/handlers.test.ts`

**Interfaces:**
- Produces:
  - `interface HandlerDeps { resolveUserId(tgId: number): Promise<string | null>; ingestText(userId: string, text: string): Promise<{ kind: string; threadTitle: string | null }>; transcribe(fileId: string): Promise<string>; dailyQuestion(userId: string): Promise<string>; reply(chatId: number, text: string): Promise<void>; }`
  - `async function handleUpdate(update: Update, deps: HandlerDeps): Promise<void>` — 未知 tgId → 忽略;`/today` → 回今日之问;`/start` → 问候;语音 → transcribe → ingest → 回执;文字 → ingest → 回执「🌱 已记下 · {kind} · 归入「{thread}」」(无线程→「暂放收件箱」)。

- [ ] **Step 1:写失败单测**

Create `seed-app/bot/handlers.test.ts`:
```ts
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
```

- [ ] **Step 2:跑,确认失败**

Run: `cd seed-app && npm test`
Expected: FAIL(`handleUpdate` 未定义)。

- [ ] **Step 3:实现 handlers.ts**

Create `seed-app/bot/handlers.ts`:
```ts
import type { Update } from "./telegram";

export interface HandlerDeps {
  resolveUserId(tgId: number): Promise<string | null>;
  ingestText(userId: string, text: string): Promise<{ kind: string; threadTitle: string | null }>;
  transcribe(fileId: string): Promise<string>;
  dailyQuestion(userId: string): Promise<string>;
  reply(chatId: number, text: string): Promise<void>;
}

export async function handleUpdate(update: Update, deps: HandlerDeps): Promise<void> {
  const msg = update.message;
  const tgId = msg?.from?.id;
  const chatId = msg?.chat.id;
  if (!msg || tgId == null || chatId == null) return;

  const userId = await deps.resolveUserId(tgId);
  if (!userId) return; // 只认已绑定用户(防注入)

  if (msg.text?.startsWith("/start")) {
    await deps.reply(chatId, "🌱 我是 Seed。把任何念头发给我——文字或语音,我替你记下并归好线。");
    return;
  }
  if (msg.text?.startsWith("/today")) {
    await deps.reply(chatId, `🌰 今天值得想一小时的一个问题:\n${await deps.dailyQuestion(userId)}`);
    return;
  }

  let text = msg.text ?? null;
  if (!text && msg.voice) text = await deps.transcribe(msg.voice.file_id);
  if (!text) return;

  const { kind, threadTitle } = await deps.ingestText(userId, text);
  const where = threadTitle ? `归入「${threadTitle}」` : "暂放收件箱";
  const head = msg.voice ? `🎤 “${text}”\n` : "";
  await deps.reply(chatId, `${head}🌱 已记下 · ${kind} · ${where}`);
}
```

- [ ] **Step 4:跑,确认通过**

Run: `cd seed-app && npm test`
Expected: PASS(3 项)。

- [ ] **Step 5:Commit**

```bash
cd .. && git add seed-app/bot/handlers.ts seed-app/bot/handlers.test.ts && git commit -m "bot: handleUpdate dispatch (text/voice/commands) + tests"
```

---

### Task B4:装配真实依赖 + 长轮询主循环(文字捕获打通)

**Files:**
- Modify: `seed-app/bot/index.ts`

**Interfaces:**
- Consumes: `getUpdates/sendMessage`(B2)、`handleUpdate`(B3)、`ingestCore`(A4)、`prisma`、`classifyKind` 结果映射、`gatherQuestionSignals`+`dailyQuestion`(现有)。
- Produces: 常驻进程,持续拉取并分发;首启把 `TELEGRAM_OWNER_ID` 绑到 owner 的 `telegramUserId`。

- [ ] **Step 1:实现装配 + 循环**

Replace `seed-app/bot/index.ts`:
```ts
import { prisma } from "../lib/db";
import { ingestCore } from "../lib/ingest-core";
import { dailyQuestion } from "../lib/ai";
import { gatherQuestionSignals } from "../lib/signals";
import { kindMeta } from "../lib/types";
import { getMe, getUpdates, sendMessage } from "./telegram";
import { handleUpdate, type HandlerDeps } from "./handlers";

const token = process.env.TELEGRAM_BOT_TOKEN;
const ownerTg = process.env.TELEGRAM_OWNER_ID;
if (!token) { console.error("缺 TELEGRAM_BOT_TOKEN"); process.exit(1); }

// 首启: 把 owner id 绑到 owner 用户(A 阶段单人)
if (ownerTg) {
  const owner = await prisma.user.findFirst({ where: { isOwner: true } });
  if (owner && owner.telegramUserId !== ownerTg) {
    await prisma.user.update({ where: { id: owner.id }, data: { telegramUserId: ownerTg } });
  }
}

const deps: HandlerDeps = {
  resolveUserId: async (tgId) =>
    (await prisma.user.findUnique({ where: { telegramUserId: String(tgId) } }))?.id ?? null,
  ingestText: async (userId, text) => {
    const res = await ingestCore(userId, text, { source: "telegram" });
    const kind = res?.entry.kind ?? "observation";
    const title = res?.suggested
      ? (await prisma.thread.findUnique({ where: { id: res.suggested }, select: { title: true } }))?.title ?? null
      : null;
    return { kind: kindMeta(kind).label, threadTitle: title };
  },
  transcribe: async () => { throw new Error("voice not wired yet"); }, // B5 接
  dailyQuestion: async (userId) => {
    const threads = await prisma.thread.findMany({
      where: { userId, status: { in: ["seed", "developing"] } },
      orderBy: { updatedAt: "desc" }, take: 20, select: { title: true, claim: true },
    });
    const signals = await gatherQuestionSignals(userId);
    return dailyQuestion(threads.map((t) => ({ title: t.title, claim: t.claim })), signals);
  },
  reply: (chatId, text) => sendMessage(token, chatId, text),
};

const me = await getMe(token);
console.log(`bot 已连接: @${me.username} — 长轮询中,Ctrl+C 退出`);

let offset: number | undefined;
for (;;) {
  try {
    const updates = await getUpdates(token, offset);
    for (const u of updates) {
      offset = u.update_id + 1;
      await handleUpdate(u, deps);
    }
  } catch (e) {
    console.error("轮询出错,2s 后重试:", (e as Error).message);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
```

- [ ] **Step 2:类型检查**

Run: `cd seed-app && npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3:手动端到端(文字)**

启动:`cd seed-app && npm run bot`。在 Telegram 给 bot 发「测试:AI 让我越来越懒得自己想」。
Expected: bot 回「🌱 已记下 · 判断 · 归入「…」/暂放收件箱」;打开网页 owner 名下能看到该 entry(可能需刷新)。
(若首次不知 owner id:先随便发一句,bot 因未绑定会忽略;看不到回复时,用 @userinfobot 查到数字 id 填入 `.env.local` 的 `TELEGRAM_OWNER_ID`,重启 bot。)

- [ ] **Step 4:Commit**

```bash
cd .. && git commit -am "bot: wire real deps + long-poll loop (text capture works)"
```

---

### Task B5:语音捕获(转写 → 捕获)

**Files:**
- Modify: `seed-app/bot/index.ts`(接 transcribe)、必要时 `seed-app/lib/transcribe.ts`(导出可复用函数)

**Interfaces:**
- Consumes: `getFile`/`downloadFile`(B2)、`lib/transcribe.ts` 的转写函数(现有 `/api/voice` 用它)。
- Produces: `deps.transcribe(fileId)` 下载语音 → Whisper 转写 → 返回文本。

- [ ] **Step 1:确认 lib/transcribe.ts 导出以 Buffer/文件为输入的转写函数**

Read `seed-app/lib/transcribe.ts`。若其只接 web `File`/`Blob`,加一个 `export async function transcribeBuffer(buf: Buffer, filename: string): Promise<string>`(用全局 `FormData`/`Blob` 包 buffer,POST Whisper,与现有逻辑一致)。

- [ ] **Step 2:index.ts 里实现 transcribe dep**

把 `transcribe` 依赖替换为:
```ts
  transcribe: async (fileId) => {
    const { getFile, downloadFile } = await import("./telegram");
    const f = await getFile(token, fileId);
    const buf = await downloadFile(token, f.file_path);
    const { transcribeBuffer } = await import("../lib/transcribe");
    return transcribeBuffer(buf, "voice.ogg");
  },
```

- [ ] **Step 3:类型检查**

Run: `cd seed-app && npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 4:手动端到端(语音)**

`npm run bot` 后给 bot 发一条语音条。
Expected: bot 回「🎤 "…转写…" · 🌱 已记下 · {kind} · …」;网页可见。

- [ ] **Step 5:Commit**

```bash
cd .. && git commit -am "bot: voice capture via Whisper transcription"
```

---

### Task B6:每日推送(今日之问)

**Files:**
- Create: `seed-app/bot/schedule.ts`、`seed-app/bot/schedule.test.ts`
- Modify: `seed-app/bot/index.ts`(循环内接调度)

**Interfaces:**
- Produces: `shouldPushDaily(lastPushedYmd: string | null, now: Date, hour: number): boolean` — 当 now 的本地日期 ≠ lastPushedYmd 且本地小时 ≥ hour 时返回 true。

- [ ] **Step 1:写失败单测**

Create `seed-app/bot/schedule.test.ts`:
```ts
import { test, expect } from "vitest";
import { shouldPushDaily } from "./schedule";

const at = (h: number) => new Date(2026, 6, 21, h, 0, 0);

test("pushes once after the hour on a new day", () => {
  expect(shouldPushDaily(null, at(9), 9)).toBe(true);
  expect(shouldPushDaily("2026-07-21", at(10), 9)).toBe(false); // 今天已推
  expect(shouldPushDaily("2026-07-20", at(10), 9)).toBe(true);  // 新的一天
});

test("does not push before the hour", () => {
  expect(shouldPushDaily(null, at(8), 9)).toBe(false);
});
```

- [ ] **Step 2:跑,确认失败** — `cd seed-app && npm test` → FAIL。

- [ ] **Step 3:实现 schedule.ts**

Create `seed-app/bot/schedule.ts`:
```ts
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function shouldPushDaily(lastPushedYmd: string | null, now: Date, hour: number): boolean {
  return now.getHours() >= hour && ymd(now) !== lastPushedYmd;
}
```

- [ ] **Step 4:跑,确认通过** — `npm test` → PASS。

- [ ] **Step 5:循环内接入推送**

在 `index.ts`:加 `import { shouldPushDaily, ymd } from "./schedule";`;循环外 `let lastPush: string | null = null; const PUSH_HOUR = 9;`;在 `for(;;)` 体内、处理完 updates 后加:
```ts
    const now = new Date();
    const owner = await prisma.user.findFirst({ where: { isOwner: true } });
    if (owner?.telegramUserId && shouldPushDaily(lastPush, now, PUSH_HOUR)) {
      const q = await deps.dailyQuestion(owner.id);
      await sendMessage(token, Number(owner.telegramUserId), `🌰 今天值得想一小时的一个问题:\n${q}`);
      lastPush = ymd(now);
    }
```
（getUpdates 的 30s 长轮询超时保证每 ≤30s 复查一次时钟。）

- [ ] **Step 6:类型检查 + 手动**

Run: `cd seed-app && npx tsc --noEmit`
Expected: 无输出。手动:把 `PUSH_HOUR` 临时设为当前小时、`lastPush` 逻辑触发一次,确认收到推送;回复该消息 → 被捕获成 entry。测完把 PUSH_HOUR 改回 9。

- [ ] **Step 7:Commit**

```bash
cd .. && git add seed-app/bot/schedule.ts seed-app/bot/schedule.test.ts seed-app/bot/index.ts && git commit -m "bot: daily question push (reply captures)"
```

---

### Task B7:收尾——README + .env 示例 + 全绿

**Files:**
- Create: `seed-app/bot/README.md`、`seed-app/.env.example`
- Modify: 无

**Interfaces:** 无新接口。

- [ ] **Step 1:写 bot/README.md**(如何拿 BotFather token、填 .env.local、`npm run bot`、离线补拉说明、安全:仅认 owner id)。

- [ ] **Step 2:写 .env.example**(键名占位,无真值):
```
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
TELEGRAM_BOT_TOKEN=""
TELEGRAM_OWNER_ID=""
```

- [ ] **Step 3:全绿检查**

Run: `cd seed-app && npm test && npx tsc --noEmit && npm run build`
Expected: 测试全 PASS、tsc 无输出、build ✓。

- [ ] **Step 4:Commit**

```bash
cd .. && git add seed-app/bot/README.md seed-app/.env.example && git commit -m "bot: docs + env example"
```

---

## 自查(spec 覆盖)

- 长轮询不部署 → B1/B2/B4 ✓
- 文字捕获 → B3/B4 ✓;语音 → B5 ✓;图片 → 明确 v1.1 不做 ✓
- ingestCore 抽取(共用管线) → A4 ✓
- 每日推送 + 回复即捕获 → B6 ✓;`/today` → B3 ✓
- 安全(只认 owner tgId) → B3(unknown→忽略)+ B4(绑定) ✓
- User/userId/DailyBrief 复合唯一 → A1 ✓;getCurrentUser 接缝 → A3 ✓;全局隔离 → A5/A6 ✓;迁移回填 → A2 ✓
- 两用户隔离测试 → A6 ✓;回归构建 → A6/B7 ✓;离线补拉说明 → B7 README ✓

## 风险

- **userId 重构易漏**:A5/A6 用"转换规则 + 逐文件"覆盖,A6 隔离测试 + build 兜底。
- **tsx 载入 .env.local**:用 `--env-file=.env.local`(Node 20.6+);若报不支持,改用 `bot/index.ts` 顶部 `import "dotenv/config"` 前 `process.env` 手动读 `.env.local`,或加 `dotenv.config({path:".env.local"})`。
- **prisma 在 bot 进程**:与 app 共用 client,无需额外配置;bot 写入不触发网页 revalidate(刷新可见,已接受)。
