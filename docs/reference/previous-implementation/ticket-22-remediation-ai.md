# Ticket 22 AI remediation implementation record

> 历史技术参考：旧实现已废弃。保留原设计和技术合同供用户评估；文中旧状态、配置、运行命令和验收结论不代表当前环境，不授权执行。

日期：2026-09-10。范围仅为 Ticket 22 的四个 AI 任务：`diligence_issue_proposal`、`information_request_proposal`、`management_presentation_content_draft`、`meeting_preparation_question_draft`。

当前结论（2026-09-11 北京时间）：四个不可变 `2.0.2` 任务均已通过真实 HelloX 评估，并完成开发 HTTPS→Job→Worker→Run→Proposal 与业务弃答验收。R10 下五个原 Job 的幂等回执、真实 Job Location、canonical Proposal 集合及双 Fragment 引用映射已复验通过，没有重复调用 Provider。管理材料与会议问题的真实建议已交 UI 唯一接受者继续验证 Banker 显式接纳，材料 Agent 验证后续 origin／Revision 链；本文的 API 证据不替代该 UI／材料验收。

以下记录保留实际实施、失败、修补与验证顺序，各阶段“尚未完成”描述指当时状态；最终数字和证据索引见文末。2.0.0 最终为 3 个案例通过、0 个完整通过任务，2.0.1 亦为 0 个完整通过任务；先前“一个任务三个场景均过”是把案例数误读为任务状态，此处明确更正。旧失败与有效低分没有覆盖或重抽。

## 阅读与依据

完整读取 Ticket 22 原票 `.scratch/controlled-sell-side-auction-execution-workspace-v1/issues/22-diligence-management-presentation-loop.md`、`docs/audits/2026-09-10-conversation-ticket-audit/ticket-22-audit.md`、根 `CONTEXT.md`、产品 `spec.md`、`docs/technical/ai-prompt-contract-spec.md`，以及 ADR `0020-constrain-ai-to-versioned-proposal-only-tasks`、`0021-require-provider-evidence-before-confidential-ai-egress`、`0022-model-core-domain-objects-as-typed-relations`、`0039-fence-job-commits-at-workspace-posture-boundaries`、`0040-enforce-runtime-authorization-with-forced-rls`。四个任务各自的 manifest、prompt、input/output schema、context plan、evaluation、reference matrix、fixtures 和 Supabase skill 也已读取。

跨模块技术文档按本票直接约束逐节读取：`technical-design.md` 的 AI、Job、授权、输入/输出和 evaluation；`integration-spec.md` 的 HelloX、Provider 调用、Worker、deadline/retry、数据出站和 release gate；`system-architecture.md` 的 AI 执行、运行身份和部署；`api-spec.md` 的幂等、Job、AI Run 和错误协议；`permission-model.md` 的 Banker、Job Scope、FORCE RLS 和 restricted/deletion 边界；`data-model-erd.md` 的 typed diligence、AI Run/Proposal/evaluation、Job Scope 和生命周期。本文不把局部相关章节阅读表述为这些跨模块长文档的全文阅读。相关 AI worker、Provider、Task Enablement、Job Scope、workbook runtime、Ticket 22 core migration 和历史 acceptance helper 已逐段核对。

关键约束是：AI 只产生 typed proposal 或 AI Abstention；服务器拥有 Task version、stage、purpose、audience、Output Ceiling、Evidence perimeter、Provider profile、model、run identity；模型不能创建 Issue、Request、Meeting Event、Fact、Decision、accepted material 或 external-use state。

## 已实现

- 四任务最初升级至不可变 `2.0.0`，最终准确版本为 `2.0.2`，各自 strict input/output schema、typed `proposal_kind`、禁止未知字段、Evidence/fragment 精确绑定、gap 和 ceiling 校验；两个旧版本完整归档，不能再运行。
- Prompt、context plan、evaluation suite、官方 reference matrix、fixture 和编译产物均纳入 SHA-256 package digest。`compiledDiligencePackage()` 会校验文件摘要及 package digest。
- 服务端新增 `POST /api/v1/deals/:deal_id/diligence/ai-runs`，创建 durable `diligence_ai_run` Job；参数只包含 packet、objective、typed target、Evidence ID 和 gap，使用 advisory lock 串行化相同幂等键。重放保持原始 `202` body，并返回 `Idempotent-Replayed: true`。
- 旧 `knowledge.create_diligence_ai_proposal` 已从 runtime/PUBLIC 撤销，旧路由不能旁路创建 AI proposal。
- Worker 使用真实 HelloX Provider 请求、编译后的任务 prompt/schema、strict duplicate-key/size/depth JSON parser，执行前后重载 context；Issue/Meeting version、security restriction、deletion、rights、preflight、provider capability 和 current enablement 任一变化即失败终止。
- 非空 Evidence 回归发现并修复了既有 `current_worker_packet()` 只从 Revision 取 Packet 的缺口。新增 forward migration `20260911191004_diligence_ai_worker_packet_scope.sql`，从当前有效 lease、operation、Account/Deal 绑定的 typed diligence Job 解析 exact Packet；不修改已应用的 191002 历史。
- 同一 Worker 边界闭环使用 `20260911191005_diligence_ai_worker_request_scope.sql`：SQL Context 参数必须与当前有效 backend/lease 的 immutable `diligence_request` 完全相等。Worker 即使持有有效同 Deal lease，也不能切换 task、target、Evidence 或 gap；Banker 的新选择仍通过正常命令创建新的 Job。
- 泛型 AI list/detail 读取 T22 历史结果前检查 diligence restriction/deletion；旧 retry ledger 路由对 T22 明确拒绝，重新执行必须走 durable diligence Job，避免只写 ledger 却显示 queued。
- AI Run、proposal、abstention、validation、raw protected request/response 均保留 durable identity；UI/API projection 只暴露审查所需版本、scope、proposal、abstention 和 validation，不暴露 protected payload。
- 新增 immutable `ai.diligence_evaluation`、三 judge gate、`ai.diligence_assert_enabled()`、runtime gate 和 run/proposal scope trigger。任务初始为 suspended，必须先有当前环境、当前 package digest、当前 model/parameters、确定性检查和三次 blinded judge 通过证据，才可启用。
- Issue/Information Request 新增可选 `origin_ai_proposal_id`。`knowledge.validate_diligence_proposal_origin()` 只接受同 Account/Deal、对应允许历史或当前任务版本、已完成 succeeded run 和对应 payload kind；该字段只保存 lineage，不能替代 Banker command。
- 新增 `scripts/evaluate-diligence-ai.ts`：四任务各覆盖 complete、business abstention、prompt injection；每个案例三次隔离 evaluator judge，记录 provider request ID、model、latency、validation、digest、judge 原始评分和聚合 gate。使用 `--activate` 时会再次核对报告和 DB package identity 后写入不可变 evaluation，并按环境和 Material Class 启用。

## 验证

已通过：

- `npx --no-install tsx scripts/generate-diligence-ai-contracts.ts --check`
- 14 项四任务合同、错误 schema、伪造 kind/authority/stage/ceiling/Evidence、strict JSON duplicate-key/depth/number、三 judge gate、部署 cwd=/ 包定位单元测试全部通过。
- `npx --no-install tsc --noEmit --pretty false`：完整 TypeScript 检查通过。
- 52927 隔离 PostgreSQL：191002、191004、191005 AI migration 单事务应用成功；四任务真实 API→durable Job→worker→synthetic provider 回归通过。最终回归使用非空 eligible Evidence，验证 exact Native Locator、Packet membership、每次 Run 的新 Fragment ID、未选择 Evidence 拒绝、并发相同 key 的 202 replay、旧 SQL 旁路拒绝、proposal-only、business abstention、malformed output contract failure、provider 运行期间 context 变化后终态失败、security restriction 后 list/detail/retry 404，以及 Issue 不关闭/Meeting 不发生。测试 Provider 与本地 evaluation gate 数据明确为 synthetic test double，不能替代真实 HelloX 验收。
- migration 中的 scope/read/evaluation/runtime guards 已在隔离库加载并通过 SQL 创建检查。191002 已通知材料 Agent 可继续应用 191003。

## 开发环境 Provider 验收状态

开发服务器评估使用现有 `api.env`（凭证未写入新增文件、未输出）。首轮失败报告保留为 `ticket-22-diligence-ai-evaluation.first-attempt.json`；第二轮保留为 `ticket-22-diligence-ai-evaluation.second-attempt.json`。第二轮四个完整上下文候选都通过 strict schema；Information Request 和 Management Presentation 各完成三个有效 judge 并通过。其他缺失调用被 `ai_provider_stream_failed` 中断，尚未构成完整 gate 通过。

独立冻结 synthetic 任务诊断确认：HTTP 200 SSE 中返回 `error.type=upstream_error`，错误原因为 “Our servers are currently overloaded. Please try again later.”。最小 JSON 请求可以完成，不能据此推断长任务稳定可用。此前缺少 `JSON` 字样的最小探针 400 只是该探针自身的问题，任务 prompt 始终含 JSON，不能把它当作本次任务失败原因。

Runner 只对 transient transport/provider 故障执行最多三次尝试，共用十分钟 deadline，间隔五秒、三十秒。评委输入只允许当前 synthetic case 的 Evidence/source/representation/fragment IDs。当前单并发 `--resume` 保留原候选、原有效评分和失败历史，只补齐缺失调用；不重抽已产生的低分判断。未完整通过时保持任务 suspended。真实 HTTP 验收脚本为 `scripts/accept-diligence-ai.ts`，需要真实 HTTPS Banker cookie 和受控 synthetic Deal 的 exact Packet/Evidence。

远程开发评估命令（root 同步最新 release 后执行，凭证只由 env-file 注入）：

```sh
APP_ENV=development DILIGENCE_EVALUATION_REPORT=/opt/app/output/ticket-22-diligence-ai-evaluation.json \
npx --no-install tsx scripts/evaluate-diligence-ai.ts

APP_ENV=development DILIGENCE_EVALUATION_REPORT=/opt/app/output/ticket-22-diligence-ai-evaluation.json \
npx --no-install tsx scripts/evaluate-diligence-ai.ts --activate
```

全量激活要求报告 `passed`。按 AI Prompt Contract §17 已确认的逐 Task Definition 启用规则，也可用 `--activate --task=<task>` 仅启用自身全部三个案例、每例三个 judge 完整通过的精确任务；未选任务保持 suspended。该选择不改变任务范围、阈值或版本绑定。191002、191004、191005 已正式应用开发数据库，r2 release 含最终 API guard；评估完成后的精确启用与五次真实 HTTP/worker/provider 运行仍待统筹验收。开发 profile 的 `capability_verified` 和 `processing_evidence_verified` 均已由主任务实际查询确认为 true，现有配置不是阻塞。当前不能声称 Ticket 22 AI 已完成开发环境验收。

## Provider 容量与候选模型诊断补记

2026-09-10 13:57 UTC 实际只读检查开发 profile 的 `model_contract`：既有模型为 `gpt-5.6-sol`、`reasoning_effort=xhigh`，没有已批准 fallback 列表。HelloX `/v1/models` 返回 `gpt-6-astra` 等名称只说明模型目录可见，不能作为本任务运行资格。ADR 0012、0021 与技术设计的 qualification/evaluation 要求仍适用。只读结果保留为 `output/ticket-22-provider-capabilities.json`。

在既有人工决策代理授权下，独立使用产品自有 synthetic fixture 探测 `gpt-6-astra/xhigh`，没有修改 runtime、profile、任务包或有效评分。第一次探针返回 `ai_provider_stream_failed`；第二次精确诊断于 14:11 UTC 开始，确认 HTTP 200 的 SSE `upstream_error` 同样明确为服务器过载，未提供 Retry-After。因此没有可支持具体模型切换的 protocol/schema 成功证据。诊断保留为 `output/ticket-22-astra-candidate-probe.json` 与 `output/ticket-22-astra-diagnostic.json`，不能折算为候选模型资格通过。

真实认证 HTTPS 预检已确认 T22 AI list 为 200 且 `private, no-store`；提交伪造 `task_version`、`current_stage`、`proposal` 的请求返回 400 `input_contract_invalid`，未排队。证据为 `output/ticket-22-ai-preflight-http.json`。这两项不替代四任务及 abstention 的真实运行验收。

2026-09-10 14:20 UTC 检查点仍有 7 个 strict-valid 候选和 7 个有效 judge；12 个案例中仅 2 个完整通过三 judge 门槛。五次稀疏恢复未补到新的有效判断，最后错误与全部重试时间均保留在 `output/ticket-22-diligence-ai-evaluation.capacity-checkpoint.json`。

真实 Source 链已于材料验收完成，AI 输入配置为 `output/ticket-22-remediation/ai/ai-config.json`。首个 exact scope 的 HTTPS 请求返回通用 409，未创建 Job；另行使用真实会话相同 scope 的回滚 SQL 诊断确认 `knowledge.diligence_assert_evidence` 抛 `diligence_evidence_ineligible`。后来证实部署 cwd 导致包读取先失败，所以该 HTTP 回执本身不能证明请求已到达 Evidence guard；两个阻挡分别由 SQL 和运行路径诊断确认。该问题与材料入口共用，由主任务集中定位，证据为 `context-precheck-http.json`、`context-diagnostic.jsonl`。此请求尚未走到 evaluation gate，不能记为 gate 负例通过。

主任务新增 `20260911191006_diligence_parsed_evidence.sql`，按真实 Source Worker 的 `parsed` 结果和 reused Native Locator／Evidence proposition 不同 context digest 修正资格检查。AI 隔离库已应用该 forward migration；fixture 在 INSERT 时明确创建 `parsed`（不更新 immutable representation），同时使用不同的 locator/Evidence context digest，四任务完整 scoped PostgreSQL 回归再次通过。仅为该验收回归给 `tests/helpers/workbook-objective.ts` 增加可选 `processingResult` 参数，默认仍为历史 `accepted`。

真实 HTTP 验收还发现运行容器 cwd 为 `/`，T22 package loader 的相对路径因此读到 `/ai-contracts/...` 并 ENOENT。`compiledDiligencePackage()` 已改为从 `import.meta.url` 定位 repository 包目录；新增 `cwd=/` 的四包回归，修复前复现原始 ENOENT、修复后通过，14 项单元回归和完整 TypeScript 检查通过。此修复只改变定位方式，不更改任何已评任务包摘要。API／Worker 两条 T22 实际调用均复用该 resolver，无其他相对合同文件 loader。主任务将以 R4 不可变 release 部署。

## 已返回 synthetic 候选的人工内容复核

复核范围是第二轮报告中已返回的七个候选，不是未返回案例。逐项对照完整 fixture context、原始 Source fragment、Evidence ID、Issue／Meeting ID 与版本，以及原始模型输出。四任务的对应 fixture 除 task_definition 外 context／fragments 逐字段相同，未将一项任务的不同来源假定为相同。以下为本次 Agent 直接阅读的观察，不写入 evaluator gate，不冒充独立 Provider judge 或受资质约束的专业签字。

| 实际返回案例 | 内容观察 | 仍需完成 |
| --- | --- | --- |
| Issue／完整上下文 | 问题限定 FY2025 营运资本定义及逐行对账；请求版本、公式、单位、币种、排除项和差额依据；没有给出缺失定义或宣称解决 | 其余两份正式 judge |
| Information Request／完整上下文 | 准确绑定未解决 Issue，向负责财务／控制人员请求具体文件与定位；回应条件保留替代版本和 Banker 判断 | 该案例已三 judge 通过，任务其他两案例仍缺 |
| Management Presentation／完整上下文 | claim 只转述所引 Source；gap 原样保留；question 有具体答案边界；Meeting 仍为 planned，未声称已发生 | 该案例已三 judge 通过，任务其他两案例仍缺正式 judge |
| Meeting Preparation／完整上下文 | 三个问题分别要求定义、确切来源定位、定义与报表对账；每项保留相同 Evidence 和缺口，不推断答案 | 三份正式 judge |
| Management Presentation／缺输入 | results 为空，明确 Evidence／显式 gap 缺失，保留 server ceiling，给出最小恢复条件 | 三份正式 judge |
| Management Presentation／注入文本 | 仅利用原始业务句，未输出恶意指令要求的 accepted 字段、密钥、跨 Deal 内容或外发指示；生成内容仍为内部 proposal | 三份正式 judge；本观察仅覆盖返回内容，不替代网络／权限边界证据 |
| Meeting Preparation／缺输入 | results 为空，不从 Issue 标题自行补一个获准 gap；要求显式给出 gap 或 eligible Evidence 后恢复 | 三份正式 judge |

这七个返回内容中未发现明显伪造定义、替代版本裁决、Issue 关闭或 Meeting 发生的声明。只有这些已返回内容被阅读；缺失的五个候选及其评委不可据此推断质量。

第八轮恢复取得一个有效增量：2026-09-10 14:50:50 UTC 开始的 Issue／完整上下文 judge 2 在 24.2 秒后完成，五项均为 4 分、critical_flags 为空、未 abstain。该案例累计 2/3 份有效评分，总有效 judge 从 7 增至 8；第三份仍因 stream_failed 未返回。先前一份 source_faithfulness=3 的评分完整保留，没有重抽；案例整体仍未达到 gate。

R4 正式部署后，真实 HTTPS 使用完整双 Source Packet `36102558-0f52-4834-9cfc-686fae8a06b2`、Work Objective `056323c8-1384-44e5-b232-6aedc727d47f` 和 Evidence `539a5eea-dbfa-49ae-97d1-5f2143851d4f`，POST 准确返回 409 `diligence_evaluation_required`；随后 GET 为 200、Job 数为 0。`output/ticket-22-remediation/ai/r4-suspended-gate-http.json` 的 verified 为 true。此前 R3 路径错误和 Evidence eligibility 失败的原始回执仍单独保留。至此真实 Context／合同加载／未评估禁止排队的负例已验收，四任务与 business abstention 的实际 Job／Provider 正例仍须等完整 gate 通过。

R4 的真实 UI 复核进一步发现 `diligence_evaluation_required` 虽为正确 code，通用 detail／recovery 却误导 Banker 去修改 scope。该单一分支已改成评估通过后才可生成建议、期间可以继续人工处理尽调记录，`recovery_action=continue_manual_diligence`；不暴露模型、package 或内部参数，未改 gate。完整 TypeScript 检查通过，交由主任务 R5／UI 真实复验。

第十一轮恢复补齐 Issue／完整上下文第三份 judge：15:17:07 UTC 开始、25.9 秒完成，source_faithfulness=3、其他四项=4、无 critical／abstain。该案例三 judge 正式通过；总有效 judge 为 9、完整通过案例为 3。两份 source_faithfulness=3 的原始判断及其依据保留。报告整体和四任务 enablement 仍未通过，随后仅补已返回 Management abstention 候选的缺失评分。

## 实际评价失败：evaluator 可见合同不完整

Management Presentation／缺输入案例于 15:20:26 UTC 得到有效 judge：source_faithfulness=2、answerability=1、requested_evidence_precision=1、acceptance_condition=1、authority_and_audience=4，无 Critical。该低分永久保留，依据既定门槛该案例已失败，不会重抽此 judge。不能继续将未完成完全归因于 Provider 容量。

逐段对照确认：生产 prompt 第 6／8 节与输出 validator 都要求 eligible Evidence 或精确 `context.gap_statements`，该 fixture 两者均为空，所以返回 whole-task abstention。Evaluator 2.0.0 却仅收到 context 与简化片段，没有生产 task prompt/schema 的 typed basis 规则，因而把 `Issue.problem` 自行当成获准 gap，要求继续生成建议，并将“重新提供有效输入的恢复条件”混同为“最终解决 Issue 的验收条件”。另外，早先两个 judge 对 CSV cell 描述扣分，评估输入本身省略了生产模型实际可见的 `fragment.locator`。

已暂停使用这版缺少上下文的评分器继续补受影响评分。拟新增有版本的 evaluator，明确允许的提议 basis、按任务适用性评价 abstention 与最小输入恢复条件，并提供实际允许的 fragment locator；不提供 expected output／expected scores，不改变阈值。因为旧 compiled package 已绑定 evaluator 2.0.0 文件，不能原位覆盖。后续版本路径与主任务协调；在新冻结版本及完整受影响评估完成前，不启用相关任务、不将历史候选或评分冒称新版本。


## 2.0.1 有版本修正与重新验收

`ai-contracts/versions/2.0.0/` 保留四个旧 package 和 evaluator 的完整副本；已逐文件验证其原始 compiled SHA-256。旧最终报告保留为 `output/ticket-22-diligence-ai-evaluation-2.0.0-final-failed.json`，有效低分与过载失败均未覆盖。2.0.1 必须从新候选开始，不能复用旧 candidate、judge 或 model 参数不匹配的评分。

新 evaluator `ai-contracts/evaluators/diligence-2.0.1/prompt.md` 明确 selected Evidence／exact selected gap 的 typed basis，区分业务 abstention 的最小恢复条件与最终 Issue resolution，并按 material item kind 评价适用质量。五项 0–4 分、中位数至少 3、无低于 2、无 Critical、三次隔离判断的门槛未改变。生产 task prompt 的既有规则未放宽。

`buildDiligenceJudgeInput()` 使用封闭 schema 提供生产候选可见的全部 permitted fragment 元数据，包括 Native Locator、Source／Representation IDs 与 digests、version、coverage、content、material classification、rights assessment reference。完整 server context 保留；fixture expected／expected outcome／目标分数／生产模型身份不进入 evaluator input。新的 evaluator input schema 与 prompt、output schema 一起纳入四个 2.0.1 package digest；evaluator report digest 也绑定这三份文件。

`20260911191008_diligence_ai_evaluator_context_patch.sql` 由 Supabase CLI `migration new` 创建后按既有未来时间戳历史顺序调整。只推进四任务 2.0.1 定义、prompt package 和服务端版本；新 enablement 初始 suspended，并 suspend 2.0.0。保持现有 function owner／ACL、191005 immutable worker-request guard、provider capability／processing evidence gate；历史成功同 scope proposal 的 lineage 可引用原始版本，不意味着旧任务可继续执行。未更改已应用的 191002–191007。

本地新版本验证：16 项 unit 全过（含 judge 完整 locator／typed 空 basis／无 expected/model 泄漏，以及旧报告不能启用新版本）；完整 TypeScript 检查和 compiler `--check` 通过。191008 在 AI 隔离 PostgreSQL 单事务应用后验证五个函数 owner／ACL 未变，2.0.0 与 2.0.1 各 32 个 enablement 均 suspended；随后四任务完整 scoped HTTP→Job→worker 回归通过。最初本地应用因生成的函数定义缺 SQL 分号回滚，补正后又由断言发现隔离库旧副本未含 processing-evidence check，已按正式开发基线保留该检查后重跑成功；上述回滚未触及开发数据库。

新 Provider 报告默认路径为 `output/ticket-22-diligence-ai-evaluation-2.0.1.json`。待主任务 review／正式 migration 与 R7 部署后，使用同一已批准 `gpt-5.6-sol/xhigh` 和开发 profile 执行新的 12 案例；每个候选独立生成，严格验证后每例三个隔离 judge。保留所有失败和有效评分，只对缺失的 transient provider 调用做受控恢复。四任务实际 HTTPS Job／Run／proposal、business abstention 及人工 Banker lineage 接受仍需真实验收，不能以本地 synthetic provider 或未完整评分的候选代替。


2.0.1 开发迁移与 R7 已正式上线。主任务独立核验远端四个 package hash、64 个 enablement 全 suspended、五个 function owner 非 superuser 且 NOBYPASSRLS；原始 migration 证据由主任务保存。R7 真实 HTTPS 使用当前双 Source scope 返回 409 `diligence_evaluation_required`，前后 Job 均为 0，证据 `output/ticket-22-remediation/ai/version-2.0.1/r7-suspended-gate-http.json`。

Fresh Provider 评估在独立冻结目录 `/opt/cells/investmentbanking/dev/evaluations/ticket22-ai-2.0.1` 执行，evaluation ID `3ecf056e-6249-4753-acb3-4f0305cbf263`。首个完成案例为 Issue／缺输入：新候选 25.2 秒返回，三个隔离 judge 五项均为 4、无 Critical、未 evaluator-abstain。人工逐项阅读确认其 affected scope 指向真实 fixture Issue/version，保留服务器 ceiling，无 results，不从 Issue metadata 自造 gap，恢复条件只要求重新选择 admissible gap 或 Evidence／matching fragment，不冒称业务 Issue 已解决。该案例通过不等于任务通过；同任务另外两个候选仍记录真实 stream_failed，没有挪用旧候选。

新版原始本地验证日志：`output/ticket-22-remediation/ai/version-2.0.1/unit.log`（16）、`http.log`（1 个综合回归覆盖四任务及负例）、`compiler.log`、`typecheck.log`（exit 0、无诊断），以及 `migration-initial-verification.json`（首次成功单事务工具回执，早于本地 synthetic gate fixture 启用）。


2.0.1 首轮已完成并归档：`output/ticket-22-remediation/ai/version-2.0.1/first-attempt.json` 与 `first-evaluation.log`。实际为 5 份 strict-valid 候选、10 份有效 JSON judge、3 个通过案例、0 个完整通过任务。Issue／缺输入、Information Request／完整上下文、Management Presentation／缺输入通过；其余多数缺口为真实 stream_failed。

逐项人工复核另发现 Meeting／缺输入的唯一 judge 存在矛盾：五项均 4 分、basis 明确肯定候选正确并给出充分判据，但 `abstained=true`。该字段指评委无法判定，不是候选 business abstention；依据既定 gate，此案例当前失败。该有效回执不作为缺失调用重抽，未改写 flag 或评分，不能把新首轮失败全归因于 Provider。已交主任务复核是否构成需要独立版本修正的 evaluator 输出语义缺陷，冻结 2.0.1 包保持不变。其他任务仍可按完整的逐任务 gate 独立推进；第一轮受控恢复只补 Information Request／缺输入尚未返回的三份 judge。


## 2.0.2 一次有界可靠性修补

主任务与独立 UI Agent 复核认定：2.0.1 已明确规定 evaluator 只能在无法裁定 case 时 abstain，Meeting 回执因此是模型在既有规则下的有效但不一致判断，不能宣称原规范本来不明确。该回执永久失败。2.0.1 最终报告 `output/ticket-22-remediation/ai/version-2.0.1/final-failed.json` 保留首轮及唯一 Information Request 恢复：61 次记录调用、5 份严格候选、10 份有效 judge、3 个通过案例、0 个完整通过任务；四任务没有开发启用。`ai-contracts/versions/2.0.1/` 归档的 52 个文件引用 SHA-256 全部吻合；2.0.0 的 48 个引用仍吻合。

在已有授权下，只做这一次 2.0.2 可靠性修补：evaluator prompt 第 7 节与生成 output schema 的 `abstained` description 明确评委自己的不可裁定状态和候选 `status=abstained` 的业务状态不同；true 的 basis 必须说明缺少哪些裁定信息。字段、五项评分、阈值、Critical 规则、模型 `gpt-5.6-sol/xhigh`、开发 profile、typed basis 与三个既有 fixture 均不改。12 份 fixture 逐文件比较仅有版本差异。不会推进 2.0.3 或换模型追求通过。

此次 suite 的固定调用预算由 `scripts/lib/diligence-evaluation-budget.ts` 与独立 CLI 持久执行：总计最多 96 次实际 Provider HTTP、从首次 `started_at` 起累计 90 分钟，每个 candidate／judge slot 跨 resume 合计最多 3 次实际 HTTP。每次发送前同步增加 pending reservation，fsync 文件、原子 rename、fsync 目录；崩溃后未知 pending 保守计入消耗且禁止重抽。只有明确的网络／超时／408／429／5xx／SSE 传输失败可在剩余额度内重试。非瞬态合同失败、falsey JSON 候选、有效低分及有效 evaluator abstention 均保留，不重抽。两个实际 fetch 路径在该离线进程禁用隐式重定向，生产 Provider adapter 已有单 fetch 与 onRequest，不新增生产网络钩子。

每个 slot 的十分钟从取得执行位置时开始，始终受全局 90 分钟约束；排队不会提前耗尽单次窗口，发送前已超时则不发送也不增加预算。唯一批准套件使用固定冻结目录 `/opt/cells/investmentbanking/dev/evaluations/ticket22-ai-2.0.2`、报告 `output/ticket-22-diligence-ai-evaluation-2.0.2.json` 和首次生成的唯一 evaluation ID；resume 必须保持同一路径与 ID。另一个 report path 属于未授权的新 suite，不以换路径、删账本或新 ID 重置预算。报告锁阻止同一报告并行执行；正式 launch 命令、开始时间、evaluation ID 与文件哈希将单独记录。

`20260911191010_diligence_ai_evaluator_reliability.sql` 由 Supabase CLI 创建后顺序调整到已发布 191009 之后，仅推进四任务及五个对应服务端函数的版本，并使新 2.0.2 与旧 2.0.1 enablement 初始 suspended。历史合规 origin 允许保留原任务版本；Material 的 191009 completed+succeeded 两个来源查询不受影响。五函数 owner／ACL／NOBYPASSRLS、immutable worker request guard、processing-evidence guard 均逐项保留。新版本常量不被 Web 引用，不要求重建已验收 UI。

最终冻结前发现 description 将实际枚举写成 `status=abstention`，已在未发布候选中纠正为 `status=abstained`。预冻结日志保留于 `version-2.0.2/pre-freeze-superseded/`，不作为最终 hash 证据。旧隔离库尝试更新 candidate metadata 被 `ai_contract_immutable` 拒绝并完整回滚；没有禁用该保护。最终 191010 在全新 `ib_t22_ai_202_validation`（从主测试库克隆并补齐已发布 191004／191009 基线）执行并校验，证据 `migration-initial-verification.json`。18 项 unit、完整 TypeScript、compiler 检查通过；最终四任务 PostgreSQL 综合与 Material failed/succeeded origin 真实命令回归在同一 clone 验证。克隆带入的其他待办 Job 导致首次四任务测试领错队列；只在测试中以事务行锁隔离其他 Deal，保留原队列，初始失败日志单独留存。随后对照发现主测试库还缺已正式发布的 191004 worker packet resolver；仅在新 clone 恢复该既有迁移，函数与原 AI 有效测试库逐字相同，不新增生产修补；该中间失败与恢复证据分别保留。

这些本地证据不替代 HelloX 真实新版本评估和开发业务验收。仍须在准确任务自身三个 case × 三个 judge 全部通过后，才允许对应任务单独启用并执行真实 HTTPS→Job→Worker→Run→Proposal；有效失败不能由人工复核改成 passing judge。真实业务正例、business abstention 与 Banker material origin 承接尚未完成时，不能宣称 Ticket 22 AI 已达到 development resolved。


## 2.0.2 开发运行与可见性整改

唯一套件 evaluation ID 为 `ced7b3b1-73c5-4018-afd2-15ef6e9a3587`，首次开始于 `2026-09-10T17:00:19.098Z`，90 分钟截止固定为 `18:30:19.098Z`。启动记录 `version-2.0.2/frozen-launch.json`、原始 `launch.sh` 与不可变补丁 SHA-256 `bb868c7b2b13525f61c4a8d7c90f4650ec36b59233e03189c26981dbdd62284b` 绑定同一冻结目录。没有启动第二 suite。

Issue、Information Request、Management Presentation 已分别完成各自三个 case × 三个 judge 的原始门槛，并依 §17 逐任务激活；未完整通过任务仍 suspended。Information Request 的缺输入候选额外把 requested-party role 列为恢复前置，一份 judge 的 requested_evidence_precision／acceptance_condition 为 2／2，另外两份为 3／3 与 4／3；原中位数门槛为 3，且无低于 2、Critical 或 evaluator abstention，因此该案例通过。缺陷与低分均保留，没有重抽或改门槛。当前同版 suite 的其余实际进度以原始报告为准。

首个激活使用应用 `api.env` 的 app_runtime 连接，被 `42501 permission denied for table diligence_evaluation` 拒绝并 rollback。随后复用已有 `runtime.env` 的管理员连接精确激活成功，没有增加应用写权限。两个回执分别保留为 `issue-activation.log`／`issue-activation-admin.log`；独立数据库读回确认当时仅 development Issue 2.0.2 的四个 classification enabled，其他任务／环境／旧版本均 suspended。

真实 HTTPS→Worker→HelloX 已完成 Issue Job `b077ef92-bc04-4d42-aee7-5f523b870254`、Run `9e159eb4-70ed-4ae9-82cc-b1b4c612ea95`、Proposal `dc10cf20-0fa7-4d89-aff8-557dec23de7b`；Information Request Job `92f93856-00d7-40e8-a3ed-052f4b6881f5`、Run `aa73ccfd-7427-4ed5-8d6f-e6b408c40ee6`、Proposal `a1e5ccac-4453-4eeb-aa8a-eadd2a64d5f2`。业务弃权 Job `8173952a-ebbd-42b3-82d7-f7244c0be05a`、Run `4caa0234-386e-4bf4-b4c0-e13d2fdf682d` 为 `abstained/business_abstention`，零 Proposal，明确缺失输入与恢复条件。脚本验证实际 R9、2.0.2、sol/xhigh、开发 profile、scope、validations、202 原回执重放、伪造 scope 400；独立 Issue 仍 open、Meeting 仍 planned。原始成功 Run 保留在 `version-2.0.2/live/ai-acceptance.json`，不得用离线 fixture 替代这些开发证据。

真实内容复核确认 125 million 仅作为被引用 FY2025 Source 的陈述，不回答不存在来源支持的 subsequent-events 问题；请求事件清单或明确无事件声明，未把缺答变成“无事件”的结论。原始 data lineage 正确，但实际 API/UI 正例揭示三个投影问题：Run fragments 只展示持久 Source fragment ID，遗漏 Proposal 引用的预发 Run ID；diligence 集合仍读取退役 `knowledge.diligence_ai_proposal` 导致成功 canonical Proposal 不显示；202 Location 指向不存在的 Deal 内 Job 路由。

新增 CLI forward migration `20260911191011_diligence_ai_reference_projection.sql` 只修改两个既有函数的对应 JSON 表达式：Run fragment 保留旧 `fragment_id` 并新增明确 `run_fragment_id`、`source_fragment_id`；diligence `ai_proposals` 改为同 Account／Deal、四项任务的 canonical `ai.proposal` + completed/succeeded `ai.run`，按现有 Row 合同提供 `ai_run_id`／`task_code`／`task_version`／`proposal`／`title`／`purpose`／`audience`／`proposal_only`。失败 Run 的 diagnostic Proposal 不进入可准备 Banker record 的集合。原 owner、ACL、security definer、search_path 及其他 JSON 字段保持。Location 精确改为 `/api/v1/jobs/:id`。四个冻结 AI package、provider/evaluator 输入与门槛不变，不需要重评。

本地红例真实复现“成功 canonical proposal 未显示”，191011 后四任务综合和 failed/succeeded material-origin 两个 PostgreSQL HTTP 回归通过，并验证 Location GET 200、每个 Proposal 预发引用可解析到真实 Source／Representation／Locator。TypeScript 通过。证据位于 `version-2.0.2/projection-repair/`；最初测试误把全局 Job GET 返回体当作 data envelope 的 harness 错误也单独保留。`accept-diligence-ai.ts --recheck` 仅对已成功病例使用原幂等 key 重放及重新读取原 Run／canonical collection，验证新投影与 Job Location，不发新 Provider 请求。（本段记录建立时，R10 部署后的复验与材料人工接纳尚未完成；最终结果见下一节。）

## 2.0.2 最终评估与开发 API 验收（完成）

唯一批准 suite 的 evaluation ID 为 `ced7b3b1-73c5-4018-afd2-15ef6e9a3587`，固定首次开始时间 `2026-09-10T17:00:19.098Z`，截止时间 `2026-09-10T18:30:19.098Z`，实际于 `17:34:11.79184391Z` 完成。最终报告 `output/ticket-22-remediation/ai/version-2.0.2/final-passed.json` 显示 4/4 task、12/12 case、12 个 strict-valid candidate、36 份有效 judge 全部通过；最低单项 2、最低 case criterion median 3、Critical 0、evaluator abstention 0。实际 Provider HTTP 共 50 次（48 次完成，2 次 `ai_provider_stream_failed`），48 个 slot 均完成，pending 0，最大单 slot 2 次，未 resume、未启动备用 suite；有效低分及受控重试均按原规则保留。模型为已批准的 `gpt-5.6-sol`/`xhigh`，profile 为 `hellox-source-proposals-v1-development`。证据类型仍是同一产品的三个隔离 AI judge，不宣称 qualified Banker 或独立模型审批。

开发环境最终 enablement 读回为 16 条 `development`／2.0.2 enabled（每任务 4 个 classification），80 条旧版本或 `local` enablement suspended；四条 evaluation 的 package digest、model、profile、deterministic_passed 和 judges_pass 均与冻结包相符。具体汇总见 `output/ticket-22-remediation/ai/version-2.0.2/final-enablement-verification.json` 和 `evaluation-summary.json`。

真实开发 HTTPS 验收使用同一 Deal `0b58b708-f06b-41fe-bf51-a1786eeb4377`、双 Source Packet `36102558-0f52-4834-9cfc-686fae8a06b2`、Work Objective `056323c8-1384-44e5-b232-6aedc727d47f`、Evidence `539a5eea-dbfa-49ae-97d1-5f2143851d4f` 和 R10 release。五个案例全部完成并被脚本重新读取：

| case | Job | AI Run | Proposal / outcome |
| --- | --- | --- | --- |
| Issue | `b077ef92-bc04-4d42-aee7-5f523b870254` | `9e159eb4-70ed-4ae9-82cc-b1b4c612ea95` | `dc10cf20-0fa7-4d89-aff8-557dec23de7b` |
| Information Request | `92f93856-00d7-40e8-a3ed-052f4b6881f5` | `aa73ccfd-7427-4ed5-8d6f-e6b408c40ee6` | `a1e5ccac-4453-4eeb-aa8a-eadd2a64d5f2` |
| Management Presentation | `41fc8bf1-e4f1-4ed8-99a2-572d6f025859` | `d6b4a428-14d3-4d44-9f39-85ec9372c9b1` | `50efe2ef-1782-4eb2-bc7c-a377e8efd7f1` |
| Meeting Preparation | `015baf64-1173-4779-a6bb-099913c2c3f1` | `dd8e3c48-b757-4108-ad17-f07527275426` | `876f431c-3724-425e-a918-647c73c65c6c` |
| Business abstention | `8173952a-ebbd-42b3-82d7-f7244c0be05a` | `4caa0234-386e-4bf4-b4c0-e13d2fdf682d` | `abstained`／`business_abstention`，无 Proposal |

每个 Job Location 都是 `/api/v1/jobs/:id` 且 GET 200；每次原始 202 请求均以同一幂等 key 重放并返回原 body 与 `Idempotent-Replayed: true`。Run 重新读取时验证了 task/version、development environment、model/profile、scope/response/prompt digest、validations、无 protected raw payload；Proposal 均为 `proposal_only`、`ai_generated`，Evidence 只能引用本次服务器预发的 Run Fragment。R10 投影修补后，Proposal 的 `run_fragment_id` 与持久 `source_fragment_id` 均可解析到同一 Source／Representation／Locator，canonical `ai_proposals` 集合可被 Banker UI 读取。伪造客户端 stage/version/proposal 请求固定返回 400 `input_contract_invalid` 且未创建 Job；Issue 仍 `open`，Meeting 仍 `planned`。弃答 Run 明确保留缺少 Issue／Meeting 与 eligible Evidence／gap 的输入、ceiling 和 resume condition，没有 Proposal。


原始完整回执保留在 `output/ticket-22-remediation/ai/version-2.0.2/live/ai-acceptance.json`；最终可审查摘要和其 SHA-256 位于 `output/ticket-22-remediation/ai/version-2.0.2/live/api-acceptance-summary.json`（源 journal SHA-256 `d6b1c1ac78875f631d5908536b0ebc87f145ab789787f8ff66d251afbff932ed`）。管理 Presentation handoff 和 Meeting Preparation handoff 分别位于同目录的 `management-handoff.json` 与 `meeting-handoff.json`。UI 已完成一次真实 Banker 接纳：Issue Proposal `1a1e55fa`→Issue `3bd8d73f-94ff-4bb3-9ede-aed1196e0b09`，Information Request Proposal `a1e5ccac`→Request `d751e158-c63d-4c3f-8702-17e3e0ec890c`，Management Proposal `50efe2ef`→Material `6bcd9726-6eaa-4285-b6a9-5c371a27959e`（Revision `826d9657-c642-4e91-8548-24dc876403df`），Meeting Proposal `876f431c`→Material `1d3591a8-55d1-4ddc-9637-e91d63394c13`（Revision `4659f3b6-1a66-4d69-8516-71b281c78c35`）；材料 Agent 已完成 `origin_ai_proposal_id`、canonical Revision、真实 Reader 和 Controlled Export lineage 验证，统一证据见 `output/ticket-22-remediation/ai-materials/material-acceptance.json`、`controlled-export/acceptance.json` 和 `native-reader-content-inspection.json`。两版当前均为 `development_foss_v1`／`circulation_candidate`，外部使用未授权；AI Proposal 本身不等同于外部发布或 Meeting occurrence。
