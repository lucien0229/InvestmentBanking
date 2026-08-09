# InvestmentBanking V1 页面覆盖记录

本文件把 `docs/ux/wireframes.md` 的正式 frame archetype 映射到当前 Open Design 原型。共享 archetype 复用组件，但所有正式任务入口均有独立路由、状态或上下文，不以一张通用 Dashboard 代替。

语言覆盖：V1 全部客户可见 surface 使用英文，包括页面标题、导航、CTA、字段、验证、空/加载/错误/成功状态和无障碍标签；内部覆盖记录继续使用中文以便评审。

## 公开发现与购买

| Frame | 原型入口 | 覆盖结果 |
|---|---|---|
| WF-PUB-01 Outcome | `/` | 完整：Outcome、产品边界、控制闭环与明确 CTA |
| WF-PUB-02 Project Northstar proof | `/project-northstar` | 完整：9 个可恢复 proof checkpoints |
| WF-PUB-03 mechanism/content | `/how-it-works/*`、`/security-data/*`、`/resources/*`、`/triggers/*` | 完整 archetype：机制、限制和证明回链 |
| WF-PUB-04 Pricing | `/pricing` | 完整：$995/月、$10,950/年、容量与商业边界 |
| WF-PUB-05 Qualification | `/qualification` | 完整：非机密资格检查与不确定结果 |
| WF-ACC-01 Account Access Gateway | `/account-access`、`email-sent`、`verify-email`、`passkey/register`、`passkey/sign-in`、`recovery/*`、`expired`、`denied` | 完整：Magic Link 首次验证、Passkey 必需、内容隔离恢复与 Checkout 交接 |
| WF-ACC-02 Sensitive Action Reauthentication | `/account-access/reauthenticate` | 完整：5 分钟新鲜 Passkey、单次 Grant、无受保护 payload、取消与缺失动作安全恢复 |
| WF-CHK-01 Checkout task shell | `/checkout/order`、`/checkout/terms`、`/checkout/payment` | 完整：durable steps、精确条款和表单 |
| WF-CHK-02 Payment / entitlement | `/checkout/confirmation`、`/checkout/recovery` | 完整：单次 Entitlement、Receipt 与恢复 |

## Banker Account 与 Deal 建立

| Frame | 原型入口 | 覆盖结果 |
|---|---|---|
| WF-ACT-01 Deals | `/app/deals` | 完整：搜索、空状态、容量和 Deal 入口 |
| WF-ACT-02 Usage / Plan / cancellation | `/app/account/usage-plan`、`/app/account/usage-plan/cancellation` | 完整：容量、期限、取消后果和 Post-Term |
| WF-ACT-03 account settings | `/app/account/billing`、`notifications`、`security`、`help` | 完整 archetype：Passkey 必需、Magic Link 仅恢复、单一 Session 及 12h/7d 期限 |
| WF-ACT-04 Data / Export / Deletion | `/app/account/data`、`/app/account/data/delete-account` | 完整：账户出口、Deal lifecycle、Account/Deal 删除与重新验证分离 |
| WF-SET-01 Create Deal / Setup | `/app/deals/new`、`/app/deals/project-northstar/setup` | 完整：5 步设置与默认控制边界 |
| WF-PRE-01 Paid Preflight | `/app/deals/project-northstar/controls/preflight` | 完整：通过、人工复核和范围边界 |
| WF-GDE-01 First Deal Guide | `/app/deals/project-northstar/guide` | 完整：5 个正式对象任务回链 |
| WF-GDE-02 completion | `/app/deals/project-northstar/guide/completion` | 完整：Source、Decision、Validation、Revision、Export 收据 |

## Deal Execution Desk 与专业对象

| Frame | 原型入口 | 覆盖结果 |
|---|---|---|
| WF-OVR-01 Overview | `/app/deals/project-northstar/overview` | 完整：下一受控动作、状态摘要和阶段 |
| WF-ACTN-01 Action Center | `/app/deals/project-northstar/actions` | 完整：5 队列、搜索、空状态与 canonical 跳转 |
| WF-COL-01 collection | 九个工作域集合页 | 完整：表格/列表、过滤、搜索和上下文预览 |
| WF-OBJ-01 object detail | `/source-records/sr-002`、`/claims/clm-018`、`/analysis/analyses/anl-014`、`/buyers/buyer-07`、`/deliverables/del-004` | 完整 archetype：属性、版本、状态、关系、历史与 tabs |
| WF-JOB-01 durable Job | `/actions/jobs/job-0098` | 完整：checkpoint、heartbeat、失败、恢复和完成 |
| WF-SRC-01 Add Source | `/sources/add` | 完整：选择、权利、解析、错误恢复、Packet |
| WF-SRC-02 Source Packet | `/source-packets/sp-004` | 完整：成员、版本与下游 Impact |
| WF-TPL-01 Templates / Compatibility | `/execution-package/templates` | 完整：模板版本、格式与限制 |
| WF-EVD-01 Evidence Inspector | `/evidence-decisions` | 完整：精确 locator、支持/挑战 Claim、Lineage |
| WF-CTL-01 Human Decision | `/evidence-decisions/control-review` | 完整：字段错误、理由、不可变 Decision 和后果 |
| WF-ANL-01 Analysis | `/analysis`、`/analysis/analyses/anl-014` | 完整：Proposal、Decision、deterministic result 与 Impact |

## 拍卖、执行包与比较

| Frame | 原型入口 | 覆盖结果 |
|---|---|---|
| WF-AUC-01 Auction object | `/auction-process`、`/auction-process/buyers/buyer-07` | 完整：阶段、Buyer、NDA、Access、Bid 和事件 |
| WF-AUC-02 Bid comparison | `/auction-process/bids/compare` | 完整：原始与标准化口径并存 |
| WF-CTL-02 Stage transition | `/auction-process/stage-transition` | 完整：范围、买方后果与 Process Event |
| WF-PKG-01 Package Overview | `/execution-package` | 完整：适用性、Revision、Native/Reader、QC 与授权边界 |
| WF-PKG-02 Deliverable detail | `/deliverables/del-004` | 完整：Artifact、Revision、Review、QC 与 External Use |
| WF-CMP-01 Revision comparison | `/deliverables/del-004/revisions/compare` | 完整：语义与控制差异 |
| WF-CMP-02 Native / Reader parity | `/deliverables/del-004/revisions/0.4/parity` | 完整：位置级 parity 和 finding |
| WF-CMP-03 Reimport comparison | `/history-portability/reimports/ri-004` | 完整：导出基线、离线编辑、当前 Workspace 三方比较 |

## 复核、外部使用与生命周期

| Frame | 原型入口 | 覆盖结果 |
|---|---|---|
| WF-QC-01 QC Finding | `/review-readiness/qc-findings/qc-022` | 完整：精确差异、严重度、处置和 re-review |
| WF-IMP-01 Impact Assessment | `/review-readiness/impact-assessments/ia-014` | 完整：五类影响分组 |
| WF-RDY-01 Package Readiness | `/review-readiness/package-readiness` | 完整：blocker-first 矩阵，无总分 |
| WF-EXT-01 External-Use Decision | `/review-readiness/external-use-decisions/new` 与 `eud-018` | 完整：Draft/recorded、exact-scope 授权与单次 Grant |
| WF-EXT-02 Delivery / Recipient creation | `/review-readiness/recipient-access/new` | 完整：Delivery、Recipient Access、actual use 分离，创建动作需单次 Grant |
| WF-HIS-01 History & Portability | `/history-portability` | 完整：四个 append-only 视图与边界 ledger |
| WF-EXP-01 Internal Controlled Export | `/history-portability/internal-export` | 完整：内容、哈希、限制、Manifest、重新验证与 Receipt |
| WF-ARC-01 Archive package | `/history-portability/archive-packages/new` | 完整：包含、排除、Manifest 与可下载合成记录 |
| WF-LIF-01 Lifecycle | `/controls/lifecycle` | 完整：Archive / Restore 与 capacity 后果 |
| WF-DEL-01 Deletion | `/controls/delete`、`/app/account/data/delete-account`、`/deletion-status/*` | 完整：Deal/Account 高风险确认、typed phrase、单次 Grant 与内容隔离状态页 |

## Recipient Access

| Frame | 原型入口 | 覆盖结果 |
|---|---|---|
| WF-REC-01 identity / access | `/recipient-access/ra-018` | 完整：身份与授权检查，不泄露其他 Deal 信息 |
| WF-REC-02 exact viewer | `/recipient-access/ra-018/viewer` | 完整：无 Workspace 导航、只读、无下载/转发 |
| WF-REC-03 unavailable | `/recipient-access/ra-018/unavailable` | 完整：不泄露原因的安全恢复状态 |

## 已实现的关键跨页闭环

1. 公开 Outcome → Qualification → Magic Link → Passkey → Checkout → Deal Setup。
2. Deal Setup → Paid Preflight → First Deal Guide → Source Packet。
3. Evidence conflict → Human Decision → Deterministic Validation → Impact → Package Readiness → Internal Controlled Export → History。
4. Bid comparison → Stage-transition Control Review → Process Event。
5. QC Finding → Package Readiness → External-Use Decision → Authorized Delivery → Recipient Access → Actual Use event。
6. Archive Package → Lifecycle Archive/Restore → 独立 Deletion Review。
7. 敏感动作保存 → 内容隔离 Passkey 重新验证 → 单次 Grant 消耗 → 原任务 Receipt；取消不会产生业务状态。

## 明确边界

- 所有公司、金额、时间、ID、哈希、文件、买方和交易事件均为 Project Northstar 合成演示数据。
- 共享页面 archetype 不是功能合并：对象身份、Revision、状态、权限和路由仍然独立。
- 原型没有真实身份、支付、上传、AI、Office/PDF 渲染、外部授权、审计或删除后端。
- Human Decision、Stage Transition、Pause/Resume、Archive/Restore、subscription cancellation 和普通 Job 不进入 Sensitive Action Grant；Account/Deal export、External-Use Decision、Recipient Access、Deal/Account deletion 等文档定义动作才进入。
- 1024px 以下保持可检查与恢复；材料 Decision、上传、阶段转换、外部授权等高风险动作按正式 UX 边界提示回到桌面。
