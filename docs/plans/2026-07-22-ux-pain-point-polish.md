# UX 痛点打磨 — 实现计划

Spec: docs/specs/2026-07-22-ux-pain-point-polish-design.md
分支: feat/ux-polish。每个任务独立提交;全程 tsc/build/vitest 全绿;终审后合并 main。

## T1 信使合一(先做,消除三卡)
- 新建 `lib/messenger.ts`:纯函数 `orderItems(items)`(优先级 challenge > nudge > resurface,组内保持原序)、`resurfaceReason(dormant, links, activeThreads)`(经 ThreadLink 连到 7 日内活跃线程 → 理由字符串,否则 null)。
- 新建 `lib/messenger.test.ts`(vitest;扩 vitest.config include lib/**)。
- 新建 `app/ui/MessengerCard.tsx`:props {challenges, resurface};客户端首挂载取 nudge(沿用 ProactiveNudge 的当日 localStorage 缓存/关闭逻辑,键 seed_msgr_v1);单条显示 + 「换一条」轮换 + ✕ 当日关卡;无数量角标;底部居中 bottom-24。
- `app/page.tsx`:服务端算 resurface 理由(带 question);渲染 MessengerCard;删 ResurfaceCard/ChallengeAlert/ProactiveNudge 引用并删除三个组件文件。

## T2 星图专注模式
- `app/ui/Cloud.tsx`:state viewMode('focus'|'all'),默认 entry 数>40 为 focus;useMemo 过滤传给 Graph 的 data:focus 下仅 root+thread 节点+root/rel 链;点击线程星(现有 focus HUD 状态)后追加该线 entries+links;分段控件「专注|全部」放图例旁。
- 兼容:图例过滤、搜索、悬停高亮、EntryPopover 在两档均工作;lineage 展开仅在 all 或聚焦线程下不受影响。

## T3 捕获回执+一步纠正
- `app/actions.ts` createEntry 返回 {id, kind, threadId, threadTitle, question}|null(ingest 后查线程 title/question)。
- `app/api/voice/route.ts` 响应加 {kind, threadTitle, question, entryId}。
- `app/ui/CaptureBar.tsx`:提交成功显示回执卡(8s 自动消失):类别+归线+「这条线在问:…」;5 类别 chip(setKind)+移出线程(moveEntryToThread);✕。
- `/` 快捷键聚焦输入(非输入态、非 isComposing);Esc 失焦。

## T4 简报去愧疚化
- `app/brief/page.tsx`:Listener 移除「N 条待归类」;Gardener 移除两条计数,改无数字温和提示。

## T5 证据链
- `app/actions.ts` computeProfile 返回 {profile, basis:{entries, threads, authorPct, unchallenged, openHypotheses, weeks}};`ProfileCard.tsx` 渲染依据行。
- `lib/ai.ts` evolutionStory chapter schema 加 threads:string[](prompt 说明:标注每节涉及的思想线名,来自给定列表);`computeEvolution` 返回 {story, titleToId};`EvolutionCard.tsx` chip 渲染,匹配到 id 的做 Link。

## T6 全绿+终审+合并+推送
- vitest(含新测试)/tsc/build 全绿;终审整条分支 diff;修 Critical/Important;合并 main;推 GitHub。
