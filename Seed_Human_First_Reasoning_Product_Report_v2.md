# Seed 产品报告（修正版）

> **工作名**：Seed / Origin / Thread  
> **产品类别**：Human-First Reasoning Layer + Idea Lineage System  
> **首要用户**：高频使用 AI、持续作出开放性判断的创业者与研究员  
> **最终愿景**：在 AI 成为默认答案来源的时代，保存人的第一判断、推理来源和思想成长轨迹，并让成熟思想找到真正的共鸣者。  
> **版本**：v2.0（基于“维生素陷阱”和“摩擦风险”重新设计）

---

## 0. 执行摘要

### 0.1 产品从什么现象出发

Seed 的起点不是“人需要一个更好看的知识图谱”，也不是“大家应该多写日记”。

真正的现象是：

> 人遇到开放性问题时，越来越少先形成自己的初始判断，而是先询问 AI，再被动评估一份已经组织好的答案。

AI 提高了效率，但也可能压缩以下过程：

```text
现实观察
→ 容忍不确定
→ 形成问题
→ 提出自己的初始解释
→ 寻找证据和反例
→ 修正判断
→ 形成真正属于自己的观点
```

Seed 的使命不是反对 AI，也不是让所有事情变慢，而是重新分配人与 AI 的角色：

```text
人：观察、第一判断、价值选择、最终结论、承担责任
AI：捕获、整理、连接、追问、挑战、检索、追踪变化
```

### 0.2 上一版产品为什么危险

如果产品要求用户每天主动打开 App、记录感悟、回答问题、整理知识树并坚持复盘，它会落入两个陷阱：

1. **维生素陷阱**  
   用户知道它“长期有益”，但不用不会立刻痛；留存依赖自律。

2. **摩擦陷阱**  
   产品要求用户放慢，而 ChatGPT 随时提供零摩擦完整答案；用户必须先接受产品价值观，才愿意持续使用。

因此，Seed 不能以“训练你多思考”为首要使用理由，而必须在用户已有工作流中提供即时、可感知的价值。

### 0.3 修正后的核心产品

Seed 应被定义为：

> **一层嵌入 AI、会议、文档与研究工作流的个人推理基础设施：自动保存重要判断的来源和变化，仅在高价值节点加入短暂思考检查，并直接生成用户需要的工作产物。**

核心体验：

```text
用户照常使用 ChatGPT / Claude / 浏览器 / 会议 / 文档 / 语音
                         ↓
Seed 低摩擦捕获重要观察、假设、证据和决定
                         ↓
自动建立 Reasoning Thread（推理线程）
                         ↓
只在提交重要结论或决定前，插入 20–60 秒选择性摩擦
                         ↓
生成决策 Memo、研究周报、实验计划、投资人 Update 等即时产物
                         ↓
长期形成个人思想谱系
                         ↓
用户主动选择将成熟问题发布到 Resonance Cloud
```

### 0.4 一句话定位

对外的实用定位：

> **Never lose why you made a decision.**  
> 永远不要丢失一个重要判断背后的原因。

更完整的产品定位：

> **Seed turns scattered observations, AI chats and evidence into traceable decisions and evolving ideas.**

底层使命：

> **AI 可以减少整理成本，但不能抹掉人形成第一判断的过程。**

---

# 1. 产品问题定义

## 1.1 宏观问题：AI 正在改变“思想从哪里开始”

过去，人通常先产生一个不完整判断，再去搜索资料、询问别人或验证。

现在越来越常见的流程是：

```text
产生疑问
→ 直接问 AI
→ AI 提出框架、观点和结论
→ 用户选择一个听起来合理的答案
```

这里最容易消失的不是“最终判断能力”，而是：

- 提问之前的现实观察；
- 查看答案之前的第一反应；
- 自己构造解释的尝试；
- 对不确定性的忍耐；
- 思想来源和演化过程。

结果未必是“人变笨”，但可能出现四种真实风险：

1. **判断来源模糊**：用户逐渐分不清哪些观点来自自己，哪些来自 AI。
2. **观点快速收敛**：用户过早接受一套完整框架，没有经历探索和分叉。
3. **决策不可回溯**：三个月后无法说明当时为何做出决定。
4. **组织重复争论**：推理过程散落在聊天、会议、文档和个人脑中。

相关研究已观察到，生成式 AI 使用正在把知识工作中的认知活动更多转向验证、整合和监督；在一项针对 319 名知识工作者、936 个实际案例的调查中，对 AI 的更高信心与较少的自报批判性思考投入相关。[1] OECD 也指出，AI 可以提升即时任务表现，但如果只是外包认知任务，表现提升不一定转化为持久学习。[2]

这并不能证明 AI 必然导致长期认知退化，但足以说明：产品设计不能只优化答案速度。

## 1.2 用户能直接感受到的“止痛问题”

不能向用户销售“保持人类独立思考”这种长期价值。第一层必须是他们今天就会痛的问题。

### 创业者的痛

- 客户洞察散落在会议、微信、Slack、语音和 AI 对话里；
- 产品方向变化后，团队不知道为什么变化；
- AI 生成的市场判断被误当成客户事实；
- 每周写投资人 Update、产品总结和决策 Memo 都要重新整理；
- 团队反复争论同一个问题；
- 一个错误假设可能浪费数周。

### 研究员的痛

- 实验异常和临时猜想没有及时记录；
- 观察、假设、解释和证据混在一起；
- 不记得某个研究方向最初如何形成；
- AI 建议与自己的贡献逐渐混淆；
- 给导师写周报时需要重新翻日志；
- 失败实验没有形成可利用的推理资产；
- 论文中的“贡献演化”难以清楚说明。

### 高级知识工作者的痛

- 聊了几十轮 AI 后，得到很多文本，但没有形成清晰决定；
- 重要结论缺少证据来源和反例；
- 写方案时内容完整，却可能只是通用模型答案；
- 无法回溯“我为何相信这件事”。

Seed 的第一层价值不是“让你更聪明”，而是：

> **减少洞察丢失、重复整理、错误归因、不可解释决策和 AI 驱动的盲目收敛。**

---

# 2. 核心产品原则

## 2.1 人必须保留第一作者身份

产品必须明确区分：

- **Human Observation**：用户亲自注意到的事实或现象；
- **Human Judgment**：用户当前的判断；
- **AI Suggestion**：模型提出但未被用户接受的内容；
- **External Evidence**：论文、网页、客户原话、实验结果；
- **Team Conclusion**：多人共同形成的判断；
- **Decision**：用户或团队正式提交的选择。

AI 生成的内容不能自动进入“我的思想”。只有用户明确确认、修改或采纳后，才能成为新版本的一部分。

## 2.2 捕获零摩擦，思考选择性摩擦

不是所有任务都值得慢下来。

Seed 应遵循：

```text
95% 的时间：自动捕获、自动整理、不打断
5% 的时间：在高价值、高风险或不可逆节点进行短暂检查
```

### 不应触发摩擦的场景

- 查询天气、定义、简单事实；
- 快速翻译和格式调整；
- 低风险的文本草稿；
- 用户只是保存一条暂不发展的灵感；
- 当前处于会议或移动场景。

### 应触发摩擦的场景

- 产品方向、研究方向或资源投入发生变化；
- 用户准备正式采用 AI 给出的核心结论；
- 用户准备发送重要方案、提交论文或发布公开观点；
- 当前判断与过去的重要判断冲突；
- 结论高度依赖 AI，缺少现实证据；
- 决定具有不可逆或高成本后果；
- 系统发现一个假设已被多次提及但从未验证。

这与“所有问题都先让用户答题”不同。已有 HCI 研究表明，认知强制机制可以降低对 AI 的过度依赖，但过多摩擦同样可能损害体验；更合理的方向是与任务相匹配的选择性摩擦。[3][4]

## 2.3 先给即时产物，再积累长期价值

用户不会为了“几年后的思想图谱”每天回来。

Seed 必须在当下生成用户已经需要的结果：

- 产品决策 Memo；
- 客户访谈洞察；
- 假设验证清单；
- 实验下一步；
- 研究周报；
- 导师汇报；
- 投资人 Update；
- PRD 中的 rationale；
- 论文贡献与实验轨迹；
- 团队争议摘要。

思想谱系不是额外作业，而是这些产物在日常使用中的自然副产品。

## 2.4 原始表达不可覆盖

每条思想必须保留：

- 原始音频或原始文本；
- AI 转写；
- AI 结构化结果；
- 用户确认版本；
- 后续版本；
- 来源和时间。

这样用户多年后可以看到：

> 这个产品最早不是来自市场报告，而是来自某次现实观察。

## 2.5 不做无限信息流

产品不靠用户消费更多内容来留存。

默认不提供：

- 热榜；
- 无限滚动；
- 粉丝数；
- 高频推送；
- “每天必须记录”的连续打卡压力；
- AI 自动生成的无穷问题。

Seed 的目标不是占据用户时间，而是提高关键思考与决策的质量。

---

# 3. 目标市场与切入策略

## 3.1 首个切入用户：早期创业者

第一阶段建议聚焦：

> **高频使用 AI、每周做大量高不确定性产品判断的 2–20 人创业团队。**

原因：

- 痛点频繁且成本明确；
- 对话、会议、客户访谈和 AI 使用量大；
- 有现成工作产物需求；
- 决策历史对联合创始人、员工和投资人都有价值；
- 相比泛消费者，更可能为减少错误和重复工作付费。

### Founder JTBD（Jobs to Be Done）

当我与客户交流、使用 AI 研究市场并不断调整方向时，我希望系统能自动保存：

- 我观察到了什么；
- 哪些只是 AI 建议；
- 我为什么相信一个假设；
- 哪些证据改变了方向；
- 团队最终决定了什么；
- 下周应该验证什么。

这样我可以更快地：

- 对齐团队；
- 写更新；
- 复盘 pivot；
- 避免重复讨论；
- 向投资人解释方向变化；
- 避免把 AI 输出误当成事实。

## 3.2 第二个切入用户：研究员

研究员是非常适合的第二垂直领域，也适合创始人自己 dogfood。

### Researcher JTBD

当我读论文、做实验、与导师讨论并使用 AI 分析问题时，我希望系统能自动把：

```text
观察 → 假设 → 替代解释 → 实验 → 结果 → 新判断
```

连接起来，并自动生成：

- 每周研究汇报；
- 实验 rationale；
- 失败实验日志；
- hypothesis lineage；
- contribution evolution；
- 下一步最有信息增益的实验。

研究流程中的 AI 来源与可审计性正在变得更重要；已有工作提出把 AI 交互作为结构化、可检查的研究对象，而不只是把 AI 当成不可见的辅助工具。[5]

## 3.3 暂不优先的用户

- 泛日记用户；
- 纯学生学习打卡；
- 只需要会议转写的团队；
- 只希望自动写内容的创作者；
- 没有高价值开放性判断的普通办公用户。

这些市场很大，但容易把产品拉回“AI 笔记”或“自律工具”。

---

# 4. 最终产品架构

Seed 最终由六层组成：

```text
1. Capture Layer        低摩擦捕获
2. Provenance Layer     思想来源与归属
3. Reasoning Layer      假设、证据和决定
4. Selective Friction   关键节点的短暂检查
5. Output Layer         即时工作产物
6. Lineage & Resonance  长期谱系与共鸣网络
```

## 4.1 Capture Layer：低摩擦捕获层

### 目标

让用户在十秒内保存一个尚未成形的观察，不要求整理。

### 输入渠道

#### 手机端

- 长按语音；
- 锁屏组件；
- 系统分享菜单；
- 截图；
- 一句话文字；
- Apple Watch / Wear OS；
- 耳机快捷指令；
- 离线记录后同步。

#### 浏览器扩展

- 保存 ChatGPT / Claude 对话片段；
- 保存网页段落；
- 保存搜索结果；
- 一键标注“我的反应”；
- 记录一段语音；
- 在复制 AI 答案时保存上下文。

#### 桌面端与集成

- Google Docs / Notion；
- Slack；
- Zoom / Google Meet 转写；
- GitHub Issue、实验日志；
- Obsidian 导入；
- PDF 与论文高亮。

### 捕获时的关键交互

用户不需要分类，只需表达：

> “我刚发现客户不是不想用 Agent，而是不敢让它做不可逆操作。”

Seed 保存：

- 原话；
- 时间；
- 输入渠道；
- 当前项目；
- 与之相关的会话或文档；
- 用户可选的来源标记。

系统在移动场景只回复：

> 已记下。需要时我会把它带回来。

不能立即用长篇分析打断用户。

## 4.2 Provenance Layer：思想来源层

这是 Seed 与普通 AI 笔记产品的重要区别。

每个内容单元都必须具有来源：

| 类型 | 示例 |
|---|---|
| `human_observation` | “三位客户都在不可逆操作处停住了。” |
| `human_hypothesis` | “真正障碍可能是撤销能力。” |
| `ai_suggestion` | “可以考虑 Agent 权限管理产品。” |
| `external_evidence` | 论文、市场数据、客户原话 |
| `team_statement` | 联合创始人提出的判断 |
| `decision` | “本周开发可撤销执行原型。” |

### 必须具备的能力

- 任何 AI 内容都带可见标签；
- 用户可以“采纳为我的当前判断”，但必须经过确认；
- 输出文档可显示或隐藏来源；
- 研究模式支持 AI 使用审计；
- 团队模式记录谁提出、谁修改、谁批准。

## 4.3 Reasoning Layer：推理线程

Seed 的核心数据对象不是 Note，而是 **Reasoning Thread**。

一个线程表示一个持续发展的开放性问题、假设或决定：

```text
问题：
企业为什么不愿部署自主 Agent？

观察：
客户在付款、删除和对外发送时停止自动化。

假设 v1：
模型准确率不足。

替代解释：
真正问题是不可逆风险。

证据：
5 次访谈，其中 4 次主动提到控制和撤销。

决定：
先制作 reversible execution prototype。

验证结果：
3/5 客户愿意测试。

假设 v2：
采用障碍集中在高风险动作，而非所有自动执行。
```

### 线程的核心对象

- Question；
- Observation；
- Hypothesis；
- Claim；
- Evidence；
- Counterexample；
- Alternative Explanation；
- Experiment；
- Result；
- Decision；
- Uncertainty；
- Open Loop；
- Output。

### 思想关系

- `supports`
- `contradicts`
- `refines`
- `replaces`
- `branches_from`
- `merges_with`
- `inspired_by`
- `tested_by`
- `decided_from`

第一版不需要展示复杂网络，但后台应保留这些关系。

## 4.4 Selective Friction：选择性摩擦层

### 核心产品原语：Thinking Pre-Commit

类似代码提交前的检查，但对象是重要判断。

当系统检测到高价值节点时，展示一张轻量卡片：

```text
你准备提交的决定：
将产品方向转向 Agent Governance。

当前依据：
- 2 次客户访谈
- 1 次团队讨论
- 4 段 AI 市场分析

尚未验证：
- 企业是否愿意付费
- 权限问题是否优先于部署复杂度

与过去判断的冲突：
三周前你认为核心障碍是模型准确率。

请用一句话回答：
什么真实证据让你改变了判断？
```

用户可：

- 语音回答；
- 一句话回答；
- 跳过并标记原因；
- 保存为草稿；
- 正式 Commit。

### 何时触发

使用一个风险评分器：

```text
friction_score =
  decision_impact
+ irreversibility
+ AI_dependency
+ evidence_gap
+ conflict_with_history
+ uncertainty
- user_urgency
- interruption_cost
```

当分数超过阈值才触发。

### 问题生成原则

每次最多一个问题，优先选择信息增益最高的问题：

- 什么证据最支持它？
- 什么情况会推翻它？
- 这是客户事实还是你的解释？
- 与过去判断相比，什么发生了变化？
- 这个结论主要来自你、AI 还是外部资料？
- 如果只能验证一个假设，应该验证哪个？

## 4.5 Output Layer：即时价值层

Seed 必须让用户因为实际工作回来，而不是因为“应该思考”。

### 创业者输出

- Decision Memo；
- Customer Insight Brief；
- Hypothesis Board；
- Weekly Founder Update；
- Investor Update；
- Pivot Timeline；
- PRD Rationale；
- Experiment Plan；
- Team Alignment Brief；
- “本周最危险的未验证假设”。

### 研究员输出

- Weekly Advisor Report；
- Hypothesis Lineage；
- Experiment Log；
- Failure Analysis；
- Alternative Explanations；
- Next Experiment Proposal；
- Contribution Evolution；
- Related-work Gap Notes；
- AI Usage Provenance Appendix。

### 输出生成原则

1. 明确区分事实、判断、AI 建议和未验证假设；
2. 只使用线程中可追溯的内容；
3. 缺少证据时明确标记，不自动补全；
4. 允许用户点击任意句子查看来源；
5. 用户确认后才成为正式产物。

## 4.6 Lineage Layer：思想成长轨迹

长期价值是：

> Seed 不只记得你想过什么，还记得你为什么改变。

例如：

```text
v1：AI 让人越来越少思考
  ↓ 具体化
v2：AI 减少的是形成初始判断的过程
  ↓ 发现商业风险
v3：持续摩擦会导致产品留存失败
  ↓ 修正产品机制
v4：捕获零摩擦，只在高价值节点选择性摩擦
  ↓ 找到切入场景
v5：Founder / Researcher Reasoning Layer
```

每次版本变化记录：

- 触发事件；
- 新增证据；
- 被推翻的假设；
- 用户自己写下的变化理由；
- AI 的贡献；
- 信心变化；
- 影响的决定。

### 用户看到的界面

不要首先展示“满屏节点”。

优先展示：

- 一条清晰时间线；
- v1 与 v2 的语义 Diff；
- 当前结论；
- 仍未解决的问题；
- 哪个证据真正改变了观点。

## 4.7 Resonance Cloud：思想共鸣网络

这是后期网络效应，不是 MVP 留存基础。

### 用户分享的不是私人笔记

用户选择发布一个经过处理的思想卡：

```text
问题：
即时 AI 答案是否降低了人形成第一判断的意愿？

当前主张：
问题可能不在 AI 本身，而在无差别的答案式交互。

已有证据：
个人行为观察 + 相关 HCI 研究。

尚未解决：
如何衡量长期独立判断能力？

正在寻找：
认知科学研究者、AI 教育创业者、反方观点。
```

### 匹配类型

- **Independent Resonance**：独立形成相似问题的人；
- **Complementary Evidence**：拥有用户缺少证据的人；
- **Constructive Opposition**：具有关键反对观点的人；
- **Method Match**：能提供实验或验证方法的人；
- **Collaboration Match**：可能共同形成项目的人。

### 反社交媒体设计

- 不做公开粉丝数；
- 不做热榜；
- 不按情绪和互动量推荐；
- 不默认公开时间线；
- 每周只提供少量高质量匹配；
- 强调来源、独立形成时间和思想差异；
- 分享粒度由用户控制。

---

# 5. 核心用户流程

## 5.1 创业者流程

### 场景一：客户访谈后的洞察

1. 用户结束客户通话；
2. 在手机上说一句：
   > “他不是不相信 AI，而是不愿让它执行不能撤销的动作。”
3. Seed 自动关联会议转写；
4. 提取：
   - 客户事实；
   - 创始人解释；
   - 新假设；
5. 关联过去三次相似观察；
6. 生成一个 “Customer Insight” 草稿；
7. 不立即打断；
8. 当用户准备修改 Roadmap 时，触发 Pre-Commit：
   > “这是 4/6 客户共同现象，还是你对少数案例的解释？”
9. 用户回答；
10. Seed 生成 Decision Memo 和验证计划。

### 场景二：AI 对话后的产品方向

1. 用户与 ChatGPT 讨论市场；
2. 浏览器扩展识别到用户复制大量 AI 结论；
3. 在会话结束时轻量提示：
   > “保存这次讨论为一个推理线程？”
4. Seed 区分：
   - 用户原始问题；
   - AI 提出的观点；
   - 用户明确赞同的内容；
5. 当用户准备把结论写入 PRD 时，询问：
   > “其中哪一条有真实客户证据？”
6. 生成带来源的 PRD rationale。

## 5.2 研究员流程

### 场景：实验异常

1. 用户实验后语音记录：
   > “训练越久，模型反而更像平均形状。”
2. Seed 标记为 `observation`，不是结论；
3. 自动关联相关 checkpoint、日志和过去报告；
4. 候选解释：
   - mean-seeking；
   - latent bottleneck；
   - data imbalance；
   - visualization pipeline；
5. 不直接告诉用户答案；
6. 当用户准备写周报时触发：
   > “你准备把 mean-seeking 写成主因。哪个实验能区分它和 latent bottleneck？”
7. 生成：
   - 当前观察；
   - 竞争性假设；
   - 最有信息增益的下一实验；
   - 导师周报。

---

# 6. 信息架构与页面设计

## 6.1 浏览器扩展

第一版最重要的入口。

### 功能

- ChatGPT / Claude 对话保存；
- 选中网页文本保存；
- 一键语音；
- 标记来源：
  - 我的观察；
  - AI 建议；
  - 外部证据；
  - 决定；
- 创建或关联 Reasoning Thread；
- 导出前 Pre-Commit；
- 快速查看当前线程的关键假设。

### UX 原则

- 不自动保存所有私人内容；
- 默认用户主动确认；
- 重要提取可以在本地预处理；
- 一次点击即可完成；
- 不持续弹窗。

## 6.2 手机端 / PWA

### 首页

只有一个主要入口：

> **刚刚注意到了什么？**

下面最多显示：

- 一个待确认的重要捕获；
- 一个今天需要回看的决定；
- 一个在工作中即将使用的旧洞察。

### 页面

- Capture；
- Inbox；
- Thread；
- Commit；
- Weekly Brief。

第一版可以用 PWA，不必立即开发原生 App。

## 6.3 Web Dashboard

### 1. Inbox

自动捕获但尚未确认的内容：

- 原始输入；
- 来源；
- 建议类型；
- 候选线程；
- 置信度。

用户操作：

- 接受；
- 修改；
- 合并；
- 标为外部资料；
- 忽略。

### 2. Threads

按问题或决定，而不是按文件夹组织。

每个线程显示：

- 当前问题；
- 当前判断；
- 关键假设；
- 证据数量与质量；
- 最近变化；
- 下一步。

### 3. Commit

待确认的重要决定：

- 当前结论；
- 来源构成；
- 历史冲突；
- 证据缺口；
- 一个关键问题；
- 正式提交。

### 4. Outputs

- 周报；
- Decision Memo；
- 实验计划；
- 投资人 Update；
- 自定义模板。

### 5. Journey

思想演化时间线，不以复杂图谱为主。

### 6. Settings & Privacy

- 数据源；
- AI 训练授权；
- 保留期限；
- 自动捕获规则；
- 团队权限；
- 导出与删除。

---

# 7. MVP 定义

## 7.1 MVP 目标

不是证明“知识图谱很酷”，而是验证：

> 用户是否愿意把重要 AI 对话和现实观察交给 Seed，并依赖它生成可追溯的工作产物。

## 7.2 MVP 用户

优先招募：

- 10–20 位早期创业者；
- 5–10 位研究员；
- 每周至少使用 AI 5 次；
- 每周至少做 2 次开放性判断；
- 已经需要写周报、决策 Memo 或研究汇报。

## 7.3 MVP 功能边界

### 必做

1. Chrome 扩展：
   - 保存 ChatGPT / Claude 对话；
   - 保存网页片段；
   - 标记来源；
2. Web/PWA 快速语音与文字捕获；
3. 自动提取：
   - Observation；
   - Hypothesis；
   - Evidence；
   - Decision；
4. Reasoning Thread；
5. 一个轻量 Pre-Commit 问题；
6. 用户确认与版本记录；
7. 两类输出模板：
   - Founder Weekly / Decision Memo；
   - Research Weekly Report；
8. 搜索与基础时间线；
9. 隐私设置与完整导出。

### 暂不做

- 复杂知识图谱；
- 社交网络；
- 自动抓取全部浏览记录；
- 全平台深度集成；
- 多 Agent 炫技；
- 长篇 AI 教练对话；
- 每日打卡；
- 原生 iOS / Android；
- 复杂团队权限；
- 自动替用户生成最终观点。

## 7.4 MVP 成功标准

### 激活

用户在 24 小时内完成：

- 3 次捕获；
- 1 个 Reasoning Thread；
- 1 次 Commit 或输出。

### 4 周留存

目标用户中：

- ≥40% 每周至少捕获 2 次；
- ≥30% 每周生成或使用 1 个工作产物；
- ≥25% 回看过两周前的线程；
- ≥20% 的核心想法产生第二版本。

### 价值信号

用户明确表示至少一项：

- 避免了一次重复讨论；
- 找回了一条本来会丢失的洞察；
- 更快完成周报或决策 Memo；
- 发现某个“事实”其实只是 AI 建议；
- 因历史冲突而修正决定；
- 用 Seed 产物与团队或导师完成真实沟通。

### 付费信号

不要问“你喜欢吗”，而要测试：

- 是否愿意每月支付 10–20 美元；
- 是否愿意把它作为固定周报或决策流程；
- 如果停止使用，哪项工作会变麻烦；
- 是否愿意邀请联合创始人或导师查看输出。

---

# 8. 技术实现方案

## 8.1 推荐技术栈

### 前端

- Web：Next.js + TypeScript；
- UI：Tailwind CSS + shadcn/ui；
- 状态：TanStack Query；
- 编辑器：TipTap；
- PWA：Next.js PWA；
- 浏览器扩展：Plasmo 或 WXT；
- 后期移动端：React Native / Expo。

### 后端

- API：FastAPI（Python）或 NestJS；
- 数据库：PostgreSQL；
- 向量检索：pgvector；
- 对象存储：S3 / Cloudflare R2；
- 队列：Redis + Celery / BullMQ；
- 鉴权：Clerk / Auth0 / Supabase Auth；
- 监控：Sentry；
- 分析：PostHog（严格控制隐私事件）。

### AI

- 语音转写：Whisper API 或其他 ASR；
- 结构提取：低成本模型；
- 复杂关系判断和问题选择：高质量模型；
- Embedding：用于候选检索，不直接决定思想关系；
- 可选本地模型：隐私敏感用户后期支持。

## 8.2 AI 处理流水线

```text
Raw Capture
    ↓
Transcription / Cleaning
    ↓
Source Classification
    ↓
Thought Element Extraction
    ↓
Candidate Thread Retrieval
    ↓
Relationship Classification
    ↓
Risk / Importance Scoring
    ↓
User Confirmation
    ↓
Thread Update
    ↓
Selective Friction Decision
    ↓
Output Generation
```

### 重要设计

向量相似度只能用来找候选，不能直接判断“这是同一个思想的新版本”。

关系判断需要综合：

- 语义核心；
- 时间；
- 用户上下文；
- 项目；
- 假设结构；
- 因果方向；
- 用户反馈；
- 来源。

## 8.3 数据模型

### `captures`

```text
id
user_id
raw_text
audio_url
source_type
source_url
captured_at
project_id
privacy_level
processing_status
```

### `thought_units`

```text
id
capture_id
type
content
author_type
confidence
user_confirmed
created_at
```

`type` 可为：

```text
observation
question
hypothesis
claim
evidence
counterexample
alternative_explanation
experiment
result
decision
uncertainty
```

`author_type`：

```text
human
ai
external
team
hybrid
```

### `threads`

```text
id
user_id
title
current_question
current_claim
status
importance_score
risk_score
created_at
updated_at
```

### `thread_relations`

```text
from_unit_id
to_unit_id
relation_type
model_confidence
user_confirmed
reason
```

### `commits`

```text
id
thread_id
decision_text
human_rationale
evidence_snapshot
ai_dependency_score
uncertainty
reversal_condition
committed_at
```

### `outputs`

```text
id
thread_id
template_type
content
source_map
user_approved
created_at
```

### `feedback`

```text
suggestion_id
accepted
edited
dismiss_reason
usefulness_score
```

## 8.4 关键模型任务

### 任务一：来源分类

判断一段内容是：

- 用户原始判断；
- AI 建议；
- 外部引用；
- 团队结论；
- 混合内容。

### 任务二：思想单元抽取

从文本中抽出观察、假设、证据和决定，不能把所有句子都变成“观点”。

### 任务三：线程对齐

判断新内容应：

- 创建新线程；
- 支持旧线程；
- 修正旧假设；
- 反驳旧观点；
- 分出新分支；
- 与另一个线程合并。

### 任务四：高价值问题选择

从候选问题中选出一个最值得问的问题，而不是生成十个问题。

### 任务五：输出生成

必须带来源映射，不能将不确定内容写成确定事实。

## 8.5 AI Prompt 原则

系统提示应长期包含：

1. 不默认替用户形成完整观点；
2. 严格区分观察、解释和证据；
3. AI 建议永远标注来源；
4. 不虚构证据；
5. 问题一次只给一个；
6. 优先问能改变行动的问题；
7. 允许用户跳过；
8. 输出必须可回溯；
9. 不把文本相似误判为思想演化；
10. 用户确认优先于模型判断。

---

# 9. 八周 MVP 开发计划

## 第 1 周：用户验证与原型

- 访谈 10 位创业者、5 位研究员；
- 收集过去一个月真实的：
  - AI 对话；
  - 决策；
  - 周报；
  - 实验日志；
- 确定最痛的单一输出；
- Figma 原型：
  - Capture；
  - Thread；
  - Commit；
  - Weekly Output。

**退出条件**：至少 5 人愿意用自己的真实数据试用。

## 第 2 周：基础后端和数据模型

- 用户、capture、thought unit、thread 数据表；
- API；
- 文件存储；
- 认证；
- 基础隐私控制；
- 文本捕获。

## 第 3 周：浏览器扩展

- 支持 ChatGPT / Claude；
- 用户选中会话片段；
- 保存 URL、标题、角色和文本；
- 标记来源；
- 一键关联线程。

## 第 4 周：AI 提取与线程

- 结构提取；
- 候选线程检索；
- 用户确认界面；
- 基础时间线；
- 手动修正。

## 第 5 周：语音捕获与 PWA

- 手机语音；
- 转写；
- Inbox；
- 快速确认；
- 离线缓存。

## 第 6 周：Thinking Pre-Commit

- 风险评分；
- 关键问题生成；
- Human rationale；
- Commit 版本；
- 冲突提示。

## 第 7 周：输出层

- Founder Weekly；
- Decision Memo；
- Research Weekly；
- 来源查看；
- 导出 Markdown / PDF / Google Docs（第一版可先 Markdown）。

## 第 8 周：封闭测试

- 15–30 位用户；
- 每周访谈；
- 观察实际工作流；
- 记录触发摩擦后是否跳过；
- 调整问题频率和输出质量；
- 测试付费。

---

# 10. 评估体系

## 10.1 北极星指标

> **每周被用户用于真实工作、并且可追溯到人类判断与证据的 Reasoning Commit 数量。**

它比“笔记数量”更接近价值。

## 10.2 输入指标

- 每周有效捕获数；
- 捕获完成时间；
- 用户主动标注来源比例；
- AI 对话保存率；
- 捕获后确认率。

## 10.3 思考质量指标

- 形成第二版本的线程比例；
- 被新增证据修正的判断数量；
- 用户识别并纠正 AI 来源的次数；
- Pre-Commit 后决定发生改变的比例；
- 有明确推翻条件的决定比例；
- 观察与解释被正确区分的比例。

## 10.4 工作价值指标

- 周报节省时间；
- Decision Memo 使用次数；
- 团队查看或评论次数；
- 导师/投资人实际接收次数；
- 避免重复讨论的自报案例；
- 用户停止使用后最想念的输出。

## 10.5 摩擦健康指标

- Pre-Commit 展示率；
- 完成率；
- 跳过率；
- 关闭扩展率；
- 用户认为“不必要打断”的比例；
- 单周平均摩擦次数。

建议初期每位用户每周最多 2–4 次主动摩擦。

## 10.6 AI 质量评估

建立人工标注数据集：

- 来源分类准确率；
- thought unit 抽取 F1；
- 同线程对齐准确率；
- 关系分类准确率；
- 问题有用度；
- 输出事实可追溯率；
- 用户修改距离；
- AI 将建议误标为用户思想的严重错误率。

其中最后一项必须接近零。

---

# 11. 商业模式

## 11.1 个人专业版

建议价格：每月 12–20 美元。

包括：

- 浏览器捕获；
- 语音；
- 无限或高额度线程；
- 思想版本；
- 周报与 Decision Memo；
- 外部导出；
- 基础隐私设置。

## 11.2 Founder Team

建议价格：每用户每月 25–40 美元。

增加：

- 共享线程；
- 决策批准；
- 团队观点来源；
- Slack / Notion 集成；
- 团队周报；
- Pivot Timeline；
- 权限和审计。

## 11.3 Research Lab

可按实验室收费：

- 研究模板；
- 实验谱系；
- AI 使用审计；
- 私有数据空间；
- 导师和学生权限；
- 本地导出；
- 机构 SSO。

## 11.4 Enterprise

后期能力：

- 私有部署；
- 本地模型；
- 数据保留策略；
- 完整审计；
- DLP；
- 不用于训练保证；
- 合规与 IP 管理。

---

# 12. Go-to-Market

## 12.1 不要销售“多思考”

使命可以讲人类认知，但首个销售话术要具体。

### 对创业者

> 把客户对话、AI 研究和产品假设变成可追溯的决策历史，并自动生成 Founder Update。

### 对研究员

> 自动连接你的观察、假设、实验和结果，生成每周研究汇报，并保留 AI 使用来源。

## 12.2 首批获客方式

- 自己的创业者和研究者社群；
- AI 峰会现场 Demo；
- 创始人公开展示一条真实 Idea Journey；
- Product Hunt / Hacker News；
- 创业加速器和实验室；
- “Founder Weekly Generator” 免费入口；
- “Research Progress Report” 免费入口；
- Chrome 扩展自然分发。

## 12.3 内容策略

不要写泛泛的“AI 让人变笨”。

更有力量的内容：

- “我已经分不清哪些创业观点是我自己的。”
- “为什么团队三个月后说不清一次 pivot 的理由？”
- “AI 时代，Decision Log 应该记录什么？”
- “一条研究假设如何从实验异常中长出来？”
- “AI provenance 不只是引用问题，也是个人思想所有权问题。”

---

# 13. 竞争与差异化

Obsidian 提供本地笔记、双向链接和 Canvas，可帮助用户可视化并连接资料；Tana 已经支持语音捕获、结构化节点和知识图谱；Mem 强调无负担整理和自动呈现相关上下文。[6][7][8]

因此以下功能本身没有足够壁垒：

- 语音转写；
- 自动标签；
- 知识图谱；
- 相似笔记推荐；
- 与笔记聊天；
- 自动总结；
- 周报生成。

Seed 必须在四点上形成明显差异：

1. **Provenance**  
   知道一个观点来自用户、AI、外部资料还是团队。

2. **Reasoning Thread**  
   组织对象不是笔记，而是问题、假设、证据和决定。

3. **Selective Friction**  
   不持续教育用户，只在高价值节点保护人的判断。

4. **Idea / Decision Lineage**  
   追踪为什么发生变化，而不只是内容之间相关。

### 简化对比

| 产品类别 | 主要对象 | 核心价值 |
|---|---|---|
| Obsidian | 文件与链接 | 用户自己组织知识 |
| Tana | 结构化节点与工作流 | 捕获并组织工作信息 |
| Mem | 无负担记忆与召回 | 自动整理并呈现上下文 |
| 会议工具 | 会议与行动项 | 记录和执行 |
| Seed | 判断、假设、证据和变化 | 可追溯地形成决定与思想 |

---

# 14. 风险与防线

## 14.1 仍然成为维生素

### 风险

用户觉得报告很好看，但没有真实工作依赖。

### 防线

- 聚焦必须产出的周报和决策；
- 集成进现有工作流；
- 用真实发送、分享和决策验证价值；
- 删除没有被使用的“漂亮功能”。

## 14.2 摩擦导致流失

### 防线

- 默认不打断；
- 每周主动摩擦上限；
- 用户自定义风险级别；
- 提供“今天不要问”；
- 每个问题必须解释为何此时询问；
- 跳过不会产生惩罚。

## 14.3 AI 继续替用户思考

### 防线

- AI 建议不自动归属用户；
- 结论前要求 Human Rationale；
- 默认生成结构，不生成立场；
- 输出中显示来源；
- 重点指标不是生成文本量。

## 14.4 自动关系判断不可靠

### 防线

- AI 关系均为建议；
- 高影响变化必须用户确认；
- 支持撤销和版本历史；
- 候选检索与最终判断分开；
- 显示模型不确定性。

## 14.5 隐私与知识产权

Seed 会保存用户最敏感的未发表思想，这是最高等级风险。

### 必须做到

- 默认私密；
- 端到端传输加密；
- 静态加密；
- 不默认用于模型训练；
- 可完全导出；
- 可彻底删除；
- 每个数据源单独授权；
- 团队访问明确；
- Resonance Cloud 必须主动选择发布；
- 后期支持本地或私有部署。

## 14.6 Resonance Cloud 变成社交媒体

### 防线

- 不做粉丝经济；
- 不做热榜；
- 不按互动量排名；
- 不默认公开；
- 低频高质量匹配；
- 公开思想需要明确问题、证据和未解决部分；
- 尊重原创时间线与贡献记录。

---

# 15. 迭代路线

## Phase 0：人工服务验证（2 周）

暂不开发完整产品。

- 用户转发 AI 对话、语音和周报素材；
- 人工 + AI 生成 Reasoning Thread；
- 每周交付 Founder / Research Brief；
- 观察用户真正关心什么。

目标：找到唯一最强的止痛输出。

## Phase 1：Capture + Output（0–2 个月）

- Chrome 扩展；
- PWA 语音；
- Inbox；
- Thread；
- Founder Weekly / Research Weekly。

目标：证明零摩擦输入能产生真实工作价值。

## Phase 2：Pre-Commit + Provenance（2–4 个月）

- 来源分类；
- 决策前检查；
- 历史冲突；
- Human rationale；
- Decision Memo。

目标：证明选择性摩擦能提高决策质量而不伤害留存。

## Phase 3：Idea Lineage（4–8 个月）

- 版本；
- 语义 Diff；
- 分支和合并；
- 证据变化；
- Pivot / Hypothesis Timeline。

目标：形成难以被普通笔记产品复制的核心体验。

## Phase 4：团队协作（8–14 个月）

- 共享线程；
- 团队争议；
- 决策批准；
- 组织思想历史；
- Slack / Notion / GitHub 深度集成。

## Phase 5：Resonance Cloud（个人价值稳定后）

- 用户选择性公开；
- 独立共鸣；
- 互补证据；
- 建设性反方；
- 研究或创业合作。

---

# 16. 关键决策门槛

在每个阶段继续投入前，需要满足明确条件。

## 进入 Phase 1

- 至少 5 名用户愿意连续 4 周提供真实资料；
- 至少一种输出每周被真实使用。

## 进入 Phase 2

- 4 周留存达到 30% 以上；
- 用户愿意为工作产物付费；
- 自动提取质量足以减少而非增加整理成本。

## 进入 Phase 3

- 用户已经会回看旧线程；
- 至少 20% 线程自然产生第二版本；
- 用户明确需要“为什么改变”，而不只是搜索旧内容。

## 进入团队产品

- 创始人主动邀请队友；
- 共享决策比个人私密记录更有价值；
- 权限与安全能力准备充分。

## 进入 Resonance Cloud

- 私人端形成高质量、可分享的结构化思想；
- 用户主动要求找到相关研究者或创业者；
- 有可靠的隐私和原创归属机制；
- 不依赖公共信息流才能留存。

---

# 17. 产品演示脚本

一个有说服力的 Demo 不需要展示宏大知识图谱。

### 场景

创业者与 AI 和客户交流后，决定从“通用 Agent 平台”转向“可撤销 Agent 执行层”。

### Demo 流程

1. 手机语音捕获客户观察；
2. 浏览器扩展保存 AI 市场讨论；
3. Seed 自动建立一个 Reasoning Thread；
4. 用户准备在 PRD 中提交方向变化；
5. Pre-Commit 显示：
   - 客户证据；
   - AI 建议；
   - 未验证假设；
   - 与过去方向的冲突；
6. 用户用 20 秒说明改变理由；
7. Seed 自动生成：
   - Decision Memo；
   - 下一周验证实验；
   - 投资人 Update；
8. 最后显示思想时间线：
   > “这次 pivot 最早来自三周前的一条语音观察。”

这能够同时展示：

- 低摩擦捕获；
- 人类判断；
- 来源；
- 选择性摩擦；
- 即时产物；
- 长期谱系。

---

# 18. 最终产品定义

Seed 不是：

- AI 日记；
- 第二大脑；
- 自动知识图谱；
- 反 ChatGPT 的慢思考工具；
- 要求用户自律的认知训练 App；
- 自动替人写观点的助手。

Seed 是：

> **一个嵌入现有 AI 工作流的 Human-First Reasoning Layer。它自动捕获散落的观察、AI 对话和证据，在重要决定前保护用户的第一判断，生成可追溯的工作产物，并长期记录一个思想为何诞生、如何改变以及最终变成什么。**

产品的三层价值：

### 第一层：止痛

> 不再丢失洞察，不再重复整理，不再忘记为什么做出决定。

### 第二层：工作质量

> 清楚区分事实、假设、AI 建议和团队判断，使产品与研究决策更可解释。

### 第三层：长期使命

> 在 AI 成为默认答案来源的时代，保留人提出问题、形成第一判断和拥有思想的能力。

最终一句话：

> **Most AI helps you produce an answer. Seed helps you preserve the human reasoning that makes the answer yours.**

中文：

> **大多数 AI 帮你产出答案；Seed 保存使这个答案真正属于你的那段人类推理。**

---

# 19. 立即执行清单

未来 14 天不要先开发复杂系统，按照以下顺序行动：

1. 找 5 位创业者和 5 位研究员；
2. 收集他们最近一次真实的产品或研究决定；
3. 要求他们提供相关的 AI 对话、会议和笔记；
4. 人工整理成：
   - Observation；
   - Hypothesis；
   - Evidence；
   - AI Suggestion；
   - Decision；
   - Change Reason；
5. 给他们生成一页 Decision / Research Memo；
6. 询问：
   - 哪部分最有价值？
   - 哪部分他们愿意每周使用？
   - 哪个问题是不必要的摩擦？
   - 是否愿意付费？
7. 用 Figma 做四个页面：
   - Capture；
   - Thread；
   - Commit；
   - Output；
8. 先开发 Chrome 扩展 + Web Dashboard；
9. 第一版只做一种输出；
10. 四周后根据真实留存决定是否继续做 Idea Lineage。

---

# 参考资料

[1] Microsoft Research, *The Impact of Generative AI on Critical Thinking: Self-Reported Reductions in Cognitive Effort and Confidence Effects from a Survey of Knowledge Workers*, 2025.  
https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/

[2] OECD, *OECD Digital Education Outlook 2026*, 2026.  
https://www.oecd.org/en/publications/oecd-digital-education-outlook-2026_062a7394-en.html

[3] Buçinca et al., *Cognitive Forcing Functions Can Reduce Overreliance on AI in AI-Assisted Decision-Making*, CHI.  
https://dl.acm.org/doi/10.1145/3449287

[4] *The Role of Task-Specific Selective Friction in AI-Assisted Workflows*, 2026.  
https://dl.acm.org/doi/10.1145/3808045.3808049

[5] *A Research Object Approach to Generative AI Governance*, 2026.  
https://arxiv.org/abs/2604.11261

[6] Obsidian, *Canvas — Visualize your ideas*.  
https://obsidian.md/canvas

[7] Tana, *Voice memos* and *Knowledge graph*.  
https://outliner.tana.inc/voice-memos  
https://outliner.tana.inc/knowledge-graph

[8] Mem, *Your AI Thought Partner*.  
https://get.mem.ai/
