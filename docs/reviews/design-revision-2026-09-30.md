# 产品设计修订记录 · 2026-09-30

本轮已将[审核报告](product-design-audit-2026-09-29.md)的 19 项发现落实到设计文档、合成业务样例和明确的验收输入。产品方向、Individual 用户边界、人工业务判断边界和上传/导出优先方式保持原有范围；没有启动应用实现、旧任务队列、原型或部署。

“设计已修订”表示规则、交互和实现合同已写明，不表示代码、模型、Office 文件、供应商或线上系统已通过验收。原审核报告保留为修订前快照。

## 这次具体改善了什么

1. **用实际成果定义质量。** 两类 Workbook、Teaser、CIM、Bid Memo 都有内容模块、最低输入、数值/比较规则、允许的缺项、定制边界和质量门槛。Harbor 合成交易包含固定输入、五份完整语义成果和 16 个正反例/变更案例；数字错误、隐藏缺项和误导性报价比较有唯一预期。
2. **把首次价值落在用户拿到的结果上。** 控制回路是教学里程碑；首次可用成果要求完成用户选定的内容和控制、生成匹配的 native/reader，并成功取得内部导出。正确 blocker 不会被计作成功成果。保证和推荐奖励使用购买时的判据版本。
3. **减少连续工作的重复操作。** 支持先在本地选文件、批次共享声明与逐文件例外、每次工作启动前明确额度确认；支持连续逐项复核、按根因安排下一步、同 Deal 搜索、逐收件人跟进旧材料纠正。每个业务判断仍是独立、精确的人工提交。
4. **让已有控制在真实使用中可执行。** 窄屏和缩放保留关键 Web 操作；归档后可以停止共享；单 Deal 删除不会清除整个账户；首版内容接受和文件构建有明确先后；影响评估、当前状态选择和暂停恢复有并发及失败语义。

## 本轮采用的设计取舍

| 事项 | 最终规则 | 代价或边界 |
|---|---|---|
| 文件数耗尽 | 原 $1,000 处理包增加 250 个新文件额度，同时保留 5,000 页、20 次完整工作流 | 价格不变但可用额度扩大，发布前应重算单位成本；不能解锁单文件/解析器技术上限 |
| 活跃存储耗尽 | 每活跃槽位 25 GB 专属额度；活跃溢出和归档共享原 250 GB 池；原 $50/250 GB 包改名为 Retained Storage Capacity Pack | 存储不按月清零；归档前必须预览池占用；不自动购买或删数据 |
| 槽位复用 | 基础用量同时记入稳定槽位和 Deal 月度账本；专属处理包单独分配 | 防止换槽位/归档重建刷新额度；需要原子分配和补偿记录 |
| 首次可用成果 | 默认财务复核，也可选内部营销稿或两份报价复核；冻结所需内容及允许缺项 | 比旧控制回路更接近实际价值，但结果和检索回执必须由服务端记录，不能依赖埋点 |
| 连续复核 | 固定上下文、逐项确认、显式复用理由草稿和保存进度 | 不提供批量 Human Decision；未变化对象必须有精确依据才能跳过 |
| 访问恢复吞吐 | 导出、权限扩展、撤销、安全恢复分开限流；保留逐对象单次授权 | 初始额度是待测的设计参数，不是已实现吞吐或公共 SLA |
| 首版 Narrative | 独立 Accepted Content Version，成功构建后原子创建 Revision | 多一个明确的内容身份，换来失败重试、首版创建和内容复核的确定性 |
| 灾难恢复 | 按故障范围选择完整的 DB/对象/密钥/墓碑共同恢复点 | 日级副本不能宣称 5 分钟 RPO；主存储和唯一镜像同时丢失、密钥永久丢失没有恢复承诺 |

这些规则属于本次已确认设计优化范围。商业合同采用 `commercial-v1.1`，购买前必须展示并记录新版本；不回写已有购买的历史条款。

## 19 项发现的设计与验收映射

全部状态为**设计已修订，运行验收待实现**。下列反例是后续开发的必测输入，不能仅检查文档关键词或模拟页面。

| 发现 | 当前设计依据 | 必须证明的行为 |
|---|---|---|
| F01 内容质量 | [内容合同](../product/contracts/deliverable-content.md)、[合成样例](../product/reference-deals/harbor-components/README.md)、AI Prompt Spec | 8.6 的 EBITDA、B 报价 53.7 现金/最高 61.7 总额等固定真值一致；拒绝 16 个案例中标明的错误；生成后另验 native/reader |
| F02 首次成果 | [首次可用成果](../product/contracts/capacity-and-first-outcome.md#two-useful-milestones)、Guide/Guarantee/事件合同 | 正确 blocker、只有预览或中断下载不能完成 useful outcome；禁止混算旧判据队列 |
| F03 容量恢复 | [容量合同](../product/contracts/capacity-and-first-outcome.md#capacity-with-a-recovery-path)、Usage ERD | 第 251 个小文件、25 GB 活跃占用、共享池满、换槽位都出现可执行选项且不会重复扣费或刷新额度 |
| F04 连续复核 | [CW-03](../ux/continuous-workflows.md#cw-03--continuous-individual-review)、Action Center/typed Decision | 20 项复核中途退出/版本改变保留已完成项；理由预填不形成自动批准；根因下一步实际可执行 |
| F05 外部纠正 | [CW-05](../ux/continuous-workflows.md#cw-05--correct-materials-already-used-externally)、Open Item/Event API 与 ERD | 区分只授权、已传输、人工记载发送和未知；逐收件人有处理结果，新增收件人可重开；不虚报发信/已读 |
| F06 接收与启动 | [CW-02](../ux/continuous-workflows.md#cw-02--mixed-source-batch-and-work-consent)、Operation Preview | 未声明行不上传；低于额度也先确认；过期 preview409 保留草稿；部分成功不重收整批费用 |
| F07 跨对象查找 | [CW-04](../ux/continuous-workflows.md#cw-04--find-work-across-one-deal)、`search_deal` | 搜到精确当前/历史位置；索引未完成明确显示；权限撤销后不泄漏旧命中；查询文本不进 URL/日志 |
| F08 窄屏可用性 | [CW-07](../ux/continuous-workflows.md#cw-07--layout-changes-permissions-do-not)、UX Spec/线框 | 在 200% 缩放、低于 1024 CSS px 下走完接收、证据/决策、新导出和撤销访问，不出现宽度权限门槛 |
| F09 访问管理限流 | [独立额度](../technical/control-consistency.md#6-recovery-session-cookie-and-scoped-rate-budgets)、Integration Spec | 同一账户连续恢复 20 个 Access，分别精确授权；429/再认证保持进度，撤销不被扩权请求耗尽 |
| F10 归档撤销 | [共享范围](../technical/control-consistency.md#5-sharing-and-deletion-scope)、Permission Model | 无空闲活跃槽位也能撤销旧 Access/Decision，立即阻断后续访问；不能新建/恢复共享 |
| F11 删除边界 | 同上；ADR0038/0041、删除流程与 ERD | 删除 A 后 B、账户和订阅继续使用；A 的任务/对象授权失效；最终身份删除检查其他关系与 claimant |
| F12 首版顺序 | [ADR0044](../adr/0044-accept-narrative-content-before-artifact-revisions.md)、[创建事务](../technical/control-consistency.md#1-accepted-content-before-the-first-narrative-revision) | 无 Revision 时可接受内容；构建失败保留内容、没有空 Revision；并发首版构建只有一个 CAS 提交 |
| F13 影响完整性 | [完整依赖集合](../technical/control-consistency.md#2-complete-impact-closure)、Impact ERD | 暂停 projection 后增加新依赖仍被找到或保持阻塞；发布时新增依赖导致重算，不能漏过 |
| F14 来源字节 | [精确来源授权](../technical/control-consistency.md#3-exact-source-and-representation-bytes)、API/grant attachment | 精确 Source/Representation 可供 Inspector 读取；无伪造 Revision；预览权不变成原件下载权；跨 Deal 拒绝 |
| F15 恢复 Cookie | [Cookie 合同](../technical/control-consistency.md#6-recovery-session-cookie-and-scoped-rate-budgets)、API6.1.1 | 浏览器接受 `__Host-`/`Path=/`；清除路径一致；恢复 session 仍不能调用普通 Banker 路由 |
| F16 排队体验 | [公平调度](../technical/control-consistency.md#8-fair-scheduling-and-visible-waiting)、Jobs/Integration | 两账户长任务下小任务不被长期饿死；记录 P95 排队与执行耗时；超时释放预留并显示真实下一步 |
| F17 恢复范围 | [故障矩阵](../technical/control-consistency.md#9-recoverable-data-not-unrelated-rpo-numbers)、架构/技术设计 | 分别演练 PITR、主机丢失、供应商恢复不可用、对象丢失及密钥故障；报告实际共同恢复点和删除墓碑重放 |
| F18 当前选择并发 | [选择 CAS](../technical/control-consistency.md#4-append-only-assessments-and-current-selection)、8 个 typed API | 两个客户端竞争首次/替换选择只有一个成功；旧 assessment 保留未选中；权限/Job fence 与选择原子更新 |
| F19 暂停后续做 | [精确恢复](../technical/control-consistency.md#7-resume-preserved-work-after-pause)、Job API | 同输入、未过期时同 Job 换授权 epoch 续做；旧 worker 不得提交；变化/过期时显式新范围并复用有效步骤 |

## 文档如何作为开发依据

从[产品入口](../product/README.md)读取产品规范、内容/容量合同和合成样例；交互按 CW 与现有 UX/线框；身份、领域、API、数据和事务按 CONTEXT、技术规范与 ADR。新增的主题文档不是另一份待选方案：正文和入口已经同步，避免旧规则与新补充互相覆盖。

本轮涉及的操作仍为 typed API。新增内容版本、Source 字节授权、当前选择、Deal 搜索、首次结果选择、外部纠正事件和暂停恢复均列入 API；相应版本、关系、状态、收件人工作项、额度分配和回执列入 ERD。实现时生成 OpenAPI/JSON Schema、迁移及测试，不把 Markdown 示例误当成已运行的 schema 或迁移。

## 本轮验证与证据边界

本轮检查文档链接/锚点、接口 ID 和 method/path 唯一性、Markdown 表格结构、合成案例 JSON 以及固定数值重算；并检查旧容量、首次价值、窄屏禁用、删除范围和 Cookie 错误规则是否仍在当前正文生效。具体执行结果见本节末尾的验证记录。

Cookie 前缀规则核对了 [IETF 原文](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-4.1.3.2)；数据库备份不包含 Storage 对象的边界核对了 [Supabase 官方说明](https://supabase.com/docs/guides/platform/backups)。其余新增容量、速率、等待预算和成果门槛是本项目设计取舍，不是供应商保证或行业认证。

Harbor 是一套合成内容基准，不是完整 Sell-Side 生命周期/原生文件回归库。本轮没有生成 Office/PDF 成品、运行三模型评审、做用户测试、测服务性能或执行恢复演练；后续实现必须按上表补这些证据。原 Integration Spec 中埋点保留期限、原始 Webhook 保留、operator 身份等显式 deferral 保持待定，相应能力继续遵守原禁用条件。当前配置和生产能力没有被重新确认。

本轮没有提交或推送 Git，也没有修改供应商、数据库或线上服务。

验证记录（2026-09-30）：

- 33 份新增或修改的 Markdown 中，392 个本地链接/锚点检查通过，代码围栏配对通过。
- API 目录的 365 个操作标识与 method/path 组合无重复；这是目录结构检查，不是接口运行测试。
- Harbor 案例 JSON 解析通过，16 个案例 ID 唯一；14 组固定数值使用十进制定点数重新计算，全部与预期一致。
- 与 Git 基线比较，没有新增 Markdown 表格列数/孤立表格行问题；`git diff --check` 通过。
- 对当前正文中的旧容量包、宽度权限门槛、首次成果顺序、删除范围、内容版本 ERD 和恢复 Cookie 做过交叉检查；历史决策与审核快照保持历史语境。
