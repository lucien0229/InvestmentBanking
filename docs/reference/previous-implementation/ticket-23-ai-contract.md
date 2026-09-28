# Ticket 23：Bid AI 契约与执行边界

> 历史技术参考：旧实现已废弃。保留原设计和技术合同供用户评估；文中旧状态、配置、运行命令和验收结论不代表当前环境，不授权执行。

状态：整改中的候选实现，**未启用运行、未完成开发环境验收**。本文件不关闭原票 AC，也不修改审计原件。

## 依据与范围

原票 `23-bid-comparison-selection-loop.md` 的第一、第四项 AC，以及审计 T23-F4，要求实现 `bid_term_extraction` 和 `bid_comparison_recommendation`。直接依据为 AI Prompt Contract §5–17、Bid/Comparison/Scenario/Decision typed contracts、ADR 0020、原票完整比较与选择范围。源条款、计算、建议、选择、Exclusive 和实际 Process Event 各自保留权威，不能互相替代。

已消费项目中记录的 `openai-investment-banking-0.1.29` 官方能力基线和 AI/Human control adoption 文档。原文所指的安装目录当前不存在；没有声称本次重新读取不存在的插件文件，也没有把插件文本放入运行 Prompt。每个候选包的 `official-reference-matrix.json` 明示此来源边界。产品约束继续作为实现依据。

## 已有候选实现

唯一 TypeScript 契约为 `packages/ai-contracts/src/bids.ts`；两项任务已加入共同 AI task registry，当前候选版本 1.0.1。输入、输出、八层英文 Prompt、Context Plan、合成 fixtures、评测规则、语义 validator 源码和来源矩阵由 `scripts/generate-bid-ai-contracts.ts` 编译并计算包摘要。执行 `--check` 可检查生成漂移，运行时还会检查实际 validator 源码摘要。

条款抽取可先于第一份正式 Bid，也可绑定一个现有 Bid 的精确前版。请求只能选择 Buyer、Round、proposal、精确 Source/representation/assessment 和已有 Evidence；不能提供模型、Prompt、输出、receipt 或已选择状态。AI 提出逐条候选，复用正式七维条款结构，保留小数文本、精度、单位、币种、期间、定义、条件和归属。一个候选必须通过 Evidence ID、run fragment ID 和来源关系同时校验。缺少所需维度时必须明确 abstain，不能用非材料性 omission 掩盖；完整结果也必须单独说明 conditions posture。

比较推荐消费一个完整精确比较，包含所有不可变成员条款、已保存标准化计算、选定 Scenario 及其批准假设和比较问题。结果必须保留全部成员、材料性／未评估条件、全部比较问题、反证以及本成员的精确 Calculation/Scenario/Assumption 身份。可以提出有条件的偏好，也可以明确 defer；没有 score、自动选择、阶段更新或外部使用授权字段。

共同校验在 Bid provider egress 前和结果验收时执行。它拒绝 Deal-wide projections、不在上下文的片段、错 Source 版本／摘要、错 representation、内容摘要或 locator 不匹配，以及超出完整 Prompt 和输入预算的请求。两项任务使用已编译 Prompt 和严格 JSON parser；重复键不会被 JSON.parse 静默覆盖。旧的通用同步 AI 入口明确拒绝 Bid 任务，防止它们在专用 Job 尚未接入时走到旧的全 Deal 上下文。

`packages/ai-contracts/src/bid-evaluation.ts` 和 `scripts/evaluate-bid-ai.ts` 提供合成离线评测。每个样本先执行真实候选调用，再执行三次隔离、盲化的 judge 调用。Judge 不接收预期结果、生产模型身份或其他 judge 分数；比较成员展示次序随机化。Critical、任一个低于 2 的判断、低于 3 的中位数、缺少判断或 evaluator abstention 都不能通过。评测记录请求前落盘、最多三个并发调用；恢复不会重新抽取已失败的候选或掩盖失败判断。评测脚本没有数据库写入或 enablement 权限路径。

## 本地验证边界

- 契约反例：错误来源／摘要／版本、错条件和比较身份、遗漏成员／融资／反证／比较问题、伪造 Calculation/Scenario/Assumption、修复改变语义、score／authority／schema escape。
- HTTP adapter：实际本地 HTTP 服务器验证编译 Prompt、发送前拒绝、原始片段摘要与 locator、上下文预算和重复 JSON 键。
- 评测 runner：本地 HTTP fixture 验证 7 个样本、28 次调用、最多 3 个并发、请求前 journal、恢复不重采样、Critical 失败保留。其评分是测试 fixture，不是真实 AI judge 或 Banker 评价。
- 首轮真实 HelloX 离线评测 `output/ticket-23-remediation/bid-ai-evaluation.json` 记录了一个 1.0.0 candidate 的 schema 失败，未执行 judge；不能计为通过。1.0.1 已修正明确数量／日期的样本和部分条款缺失时的 abstention，新增绝对 deadline 回归，完整真实评测待执行。所有离线结果均不能替代开发服务器完整功能验收。

## 达到 F4 / 原票 AC 前仍必须完成

1. 专用 `bid_ai_run` Job 和 typed scope/lineage：同 Account/Deal 的 Source、Evidence、Buyer/Round/proposal、可选前版或精确 comparison；服务端固定运行版本、Provider/Profile、参数和包摘要。
2. 命令、claim、发送、commit 的 Workspace/security/lease/Source/Comparison/current basis 检查。网络请求期间不持有业务事务；恢复后重新验证精确上下文。当前通用入口的拒绝只防止错误调用，不等于后台执行已完成。
3. Source Worker/Job Scope packet policy、不可变请求、幂等/replay、terminal failure/retry 和安全读取。所有新函数及 typed children 必须有实际 runtime SQL 的跨 Account/Deal、错 Actor、无 scope、错 lease 和不可变性证据。
4. 受治理 AI Run / Proposal 持久化：保存保护后的请求／响应、精确版本、校验、run fragments 与结果；比较推荐只能由合格 Run 产生，不能由客户端手写 JSON 声明。建议的额外 Evidence 也要接入持久化 Impact 关系。
5. 条款候选到人工确认 Bid intake/revision 的 typed adoption lineage；建议读取、当前适用性与 Banker Selection 引用。AI 运行本身不产生 receipt、选择或 Exclusive。
6. 每项任务完整的真实 provider 评测、版本冻结与 runtime enablement；失败样本必须保留，模型或契约变化按约束重新评测。当前候选包不能据本地测试自动启用。
7. 原型 UI 的精确输入选择、异步进度、候选审查、来源与计算查看、限制／abstention／恢复以及真实已认证开发服务器流程。尚未完成上述内容前，不勾选第一、第四项 AC，不关闭 F4。
