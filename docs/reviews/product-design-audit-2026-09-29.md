# InvestmentBanking 产品与设计审核报告

> 后续修订见[2026-09-30 设计修订记录](design-revision-2026-09-30.md)。本报告保留审核时的发现与行号；原始正文证据对应 Git 基线 `1dbd675fa7b2588e2c9be376a17f09aec4330008`，后续修订已使部分行号移动。

审核日期：2026-09-29  
审核基线：本地 Git HEAD 1dbd675fa7b2588e2c9be376a17f09aec4330008；开始审核时工作区干净。  
状态：审核结果与待确认改进方案。本文不改变既有产品契约，不启用实现任务或恢复旧原型。

## 结论

**现有设计的追溯与控制基础较成熟；最需要补强的是交付成果的实质标准、连续工作的效率，以及产品、UX、API、数据和权限之间的衔接。** 部分规则按字面实现会互相冲突；另一些虽能实现，却仍让开发者自行决定重要的产品行为。

产品方向、是否开发、Individual-first Sell-Side Auction、完整交易生命周期均作为既定前提。本次没有重审市场机会或购买意愿，也没有要求加入已延期的团队协作、VDR/邮箱连接器、人工 Banker 服务。

汇总为 **19 项：10 项 P1，9 项 P2**。P1 表示应在相关模块实现或验收前闭合的契约，并非暂停整个产品的判断；P2 是具体的体验改善、设计取舍或次级契约补全。没有因措辞或排版单列 P3。

首先应做的三件事：

1. 为两本 workbook、Teaser、CIM、Bid Memo 固定“输入什么、必须产出什么、什么情况算可用”，配对应的完整合成成果与反例。
2. 围绕“接收材料→复核少数关键问题→获得可用成果→材料变化后恢复工作”组织交互，减少重复声明、逐对象往返和无效下游操作。
3. 补齐证据原文读取、首份成果创建、依赖闭包、归档撤销与删除范围等契约，使前端、后端和数据层能实现同一行为。

这些建议不要求削弱证据、权限或人工判断边界。文档数量不是主要短板；需要的是每条重要用户任务有明确输入、动作、状态变化、输出和可检验结果。

## 审核方式与证据范围

现行文档清单共 **85 份 Markdown、22,747 行**：领域 1 份、产品及决策/来源资料 29 份、UX 5 份、技术 7 份、ADR 43 份。对这 85 份完成结构清点及 Markdown 本地目标链接检查，未发现缺失的本地链接目标；此检查不代表章节锚点、外链或语义已经全部正确。

| 文档组 | 本次深度 |
|---|---|
| 产品规范、领域定义 | 主线、对象、状态、范围和验收交叉审核 |
| 产品资产与历史决策 | 核心工作流、交付标准、首次价值、使用额度、变更和生命周期重点阅读；其他资料按索引与候选问题追溯 |
| UX 五件套 | 逐段检查，并对具体路径核对 API、权限和产品要求 |
| API、ERD、Permission | 逐段检查操作、关系、状态与事务；高影响发现再次独立反证 |
| Technical Design、System Architecture、Integration、AI Contract | 结构梳理；关键流程、AI、容量、恢复、评测和关联契约重点交叉检查 |
| ADR | 决策索引与替代关系核对；相关身份、共享、内容、投影、运行权限和恢复决策重点检查 |
| 历史原型、旧实现与旧验收 | 仅识别其历史地位，不作为当前设计正确或已经实现的证明 |

发现分为：**直接冲突**、**缺失的操作/事务契约**、**设计改善假设**。下文场景均为文档推演或建议的合成验收用例，不是本次实测的生产故障。没有执行旧应用、浏览器业务流程、数据库迁移、部署或供应商能力探针；没有读取凭据。Cookie 协议和备份边界另查官方一手说明。

引用行号对应上述审核基线；后续正文修改后，应以章节及内容重新定位。子审核只参与独立检查，最终发现已经合并去重并核对反证。

## 发现总览

| 编号 | 优先级 | 应改善的结果 | 判断类型 |
|---|---|---|---|
| F01 | P1 | 用明确内容合同与实质样例定义“好成果” | 产品/验收输入缺口 |
| F02 | P2 | 区分首次控制回路完成与首个可用业务成果 | 设计改善 |
| F03 | P1 | 文件数与活跃存储满后仍有真实恢复路径 | 规则缺口 |
| F04 | P2 | 按业务判断和根因组织复核与恢复 | 设计改善 |
| F05 | P2 | 旧材料已对外使用后的纠正能逐收件人完成 | 流程改善 |
| F06 | P1 | 工作启动前的额度确认与混合批次操作完整 | 跨层交互缺口 |
| F07 | P2 | 在同一 Deal 内跨对象找回工作内容 | 交互/API缺口 |
| F08 | P1 | 缩放或窄窗口不使桌面关键操作失效 | 直接冲突 |
| F09 | P2 | 合理规模的访问管理不被共享限流拖慢 | 数量推导与设计取舍 |
| F10 | P1 | 归档后仍能停止既有共享 | 明确规则产生的障碍 |
| F11 | P1 | 删除一个 Deal 不清除整个 Account 的关系 | 直接冲突 |
| F12 | P1 | 首份叙述性交付物有明确创建顺序 | 事务/身份契约缺口 |
| F13 | P1 | 变更评估能证明依赖集合完整 | 一致性契约缺口 |
| F14 | P1 | Evidence Inspector 能取得精确来源字节 | API映射缺口 |
| F15 | P1 | 恢复登录 Cookie 符合浏览器前缀规则 | 协议冲突 |
| F16 | P2 | 大任务共用资源时仍能及时完成小范围工作 | 调度设计缺口 |
| F17 | P2 | 恢复目标对应明确故障范围与共同恢复点 | 恢复合同歧义 |
| F18 | P2 | Source 当前状态选择具备明确并发行为 | API/数据契约缺口 |
| F19 | P2 | 暂停后保留的 blocked Job 有精确恢复动作 | 状态/操作契约缺口 |

## 一、把业务成果与连续使用做得更好

### F01 · P1 · 内容标准需要从类别描述落到可执行合同与样例

**依据。** [交付标准 L137–141](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/assets/banker-deliverable-and-quality-standard.md:137) 定义了两本 workbook、Teaser、CIM、Bid Memo 的用途与材料范围；[AI Contract L186–199](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/ai-prompt-contract-spec.md:186) 已把 comparison contract 和各类 section contract 作为必要输入；[ERD L712–716](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/data-model-erd.md:712) 给出合同与内容的承载结构，但未指向逐种交付物已冻结的具体内容实例。已有 Bid 类型、内容表和检查框架，不能据此说“没有模型”。

**场景与影响。** 合成报价 A 的 headline 为 120，包含现金 80、rollover 20、earnout 20；B 为现金 105。仅有金额、条件字段和引用，仍不足以规定哪些维度必须分列、哪些金额不能直接视为等价、哪些缺口需要假设或不可比提示。开发者、Prompt 作者和 QC 作者可能各自决定专业行为，甚至用同一套错误解释互相验证。这些数字仅为建议的验收输入。

**建议。** 先冻结五类核心成果的必需/条件/不适用模块、最低输入、计算与比较定义、披露要求、允许的定制、局部缺失结果、正反例。为一个完整合成 Deal 做出对应的五类黄金成果，再用业务特征不同的 Deal 验证模板的可变部分。Bid 比较明确区分 headline、cash at close、非现金与或有对价、条件、资金证据、时间及卖方已确认的优先项；不默认条件款兑现，也不默认使用单一总分。

**质量验证需同时补强。** [AI Contract L730–801](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/ai-prompt-contract-spec.md:730) 已有合成案例、三次盲评、维度评分和 Critical 检查，并明确允许同一模型分次担任裁判。现有框架值得保留；三次调用不能消除共同偏差，这是方法风险而非本次测得的错误率。应把独立固定的数值/状态真值、允许答案集、关键缺口、评分锚点、已知错例与可用成果样例补成版本化输入，检验裁判能否区分“引用正确但漏掉关键条件”“非常保守但没完成任务”和合格结果。具体统计阈值以实测基线确定，不编造行业标准，也不违反现有无外部 Banker 顾问的运营约束。

**验收。** 上述 A/B 输入必须明确 80 与 105 的现金差异、rollover 与 earnout 的条件，不能单凭 120 大于 105 推荐 A。变换期间、币种和缺失原始 Bid，取得预定的不可比、补材料或场景结果。每个 CIM 必需章节有完成、不适用或明确缺口；正确引用与文件能打开不能代替任务完成。

**同步范围。** 交付质量标准、产品验收、AI task 输入/评测、Content Contract 引用，以及新建的产品内容合同和样例资产。另应把[旧质量标准 L498](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/assets/banker-deliverable-and-quality-standard.md:498) 的人员 adjudication 期望与现行 AI-adjudicated 方案的替代关系写清，避免后续误引。

### F02 · P2 · 首次价值应对应用户选定的可用成果

**依据。** [获客与首次价值 L388–411](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/assets/self-serve-acquisition-and-conversion-system.md:388) 先让用户选 bounded first outcome，但 first_unmistakable_value 的条件是完成一次材料判断、适用校验、看到 native/reader 结果或正确 blocker、理解影响；[保证条款 L370–379](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/assets/premium-self-serve-monetization-and-unit-economics.md:370) 又使用该里程碑结束保证资格。首次导出在其他事件中另行记录。

**场景与影响。** 用户想获得本周讨论所需的报价比较初稿，已经完成一个事实确认、看见正确 blocker，真正所选成果却仍不可用。控制机制已证明有效，不等于这一工作目标已经完成。正确发现风险本身也可能有价值，关键是预先明确目标，不能让一个事件同时模糊承担教学毕业、激活和保证事实。

**建议与验收。** 分开记录首次控制回路完成和首个可用成果；按所选工作目标定义最低内容、允许缺口、原生可编辑与导出条件。若目标就是找出材料不足，也要在开始前说明该结果类型。以“控制回路完成但成果缺关键输出”“成果完整但首次导出失败”“正确识别不支持材料”“所选成果完成”四种用例核对事件、Guide 和保证状态。保证条款是否改用新谓词属于产品取舍，不能在技术实现时暗改。

**同步范围。** First Deal Guide、产品验收、获客事件、首次价值定义、保证条款的唯一事件引用。

### F03 · P1 · 文件数与活跃存储的阻塞缺少对应恢复选项

**依据。** [套餐 L89–107](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/assets/premium-self-serve-monetization-and-unit-economics.md:89) 规定每 Active Deal 250 新文件/月、25GB 活跃存储；现有 processing pack 只加 5,000 pages 与 20 operations，archive pack 只增加归档存储。[同文 L346–347](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/assets/premium-self-serve-monetization-and-unit-economics.md:346) 却将买 pack 或等额度续期作为必要来源超量后的恢复办法。[技术设计 L518](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/technical-design.md:518) 要求分别检查文件数、页数和活跃存储。

**场景与影响。** 同一 Deal 第 251 个小文件即使远低于页数限额，也不能由现有 pack 解锁。持续交易的历史累积超过 25GB，续期也不会清空这些字节。另开 Deal 或删除必要历史不符合已有连续性与证据要求。

**建议。** 给每个独立限制定义阻塞与恢复矩阵。确定文件数是技术上限还是可购买容量、25GB 包括哪些原件/衍生内容/历史，以及同 Deal 的历史冷热分层或扩容路径。界面只能推荐真正解除当前限制的选项。另须固定[额度槽复用规则 L345](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/assets/premium-self-serve-monetization-and-unit-economics.md:345)：A 耗尽后归档、C 占用其槽、A 再激活时，哪个额度归谁，不能由实现者临时推断。

**验收。** 分别测试 250→251 个文件、24.9→25.1GB、只有 pages 耗尽、只有 operations 耗尽；用户看到准确的资源、恢复条件和额度效果。不得显示无效扩容、让续费假装解决累积存储，也不重复扣费或迫使拆分同一交易。

**同步范围。** 产品额度、Capacity Offer、Operation Preview、容量账本与 UX 恢复。

### F04 · P2 · 用业务判断与根因组织复核，降低逐对象操作成本

**依据。** [API L393–401](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:393) 禁止 Human Decision 和 material QC disposition 的 bulk；[UX L675–710](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/ux-spec.md:675) 已有 next action、五队列、materiality/期限/dependency 排序。问题不是没有工作台，而是尚未规定同根因的连续处理与实际复核劳动预算。

**场景与影响。** 一份新月度财务同时影响 Fact、valuation、CIM、Reader Copy 与 QC。十余条提醒中，当前可做的可能只有确认 EBITDA 口径；若先进入下游复核，只会再遇到上游 blocker。实际耗时尚未测量，不能断言产品一定比现有方式慢。

**建议。** 在既有 Action Center 上提供同根因恢复组：变化摘要、共同来源、受影响范围、当前可执行动作、后续依赖、可自动执行部分和仍需人工判断的节点。保留原子对象及各自结果，允许连续复核、显式复用理由、跳过已证明未变部分，新事件不抢走正在处理的上下文。若进一步引入固定集合确认，要逐项可审查/排除，重要冲突与专业选择保持单独判断；此方案需要显式修改现有 bulk 边界。

**验收。** 合成 300 个字段、10 个重大异常的资料集，下一期只有 12 项改变；记录操作数、重复输入、来源重复打开和任务耗时，不让用户重做未变的 288 项，异常也不能被组操作隐藏。一次源更新的恢复组应给出真实可执行第一步。

**同步范围。** Decision 语义、Action Center/Impact UX、排序分组投影、连续复核与可选的精确集合契约。

### F05 · P2 · 已对外使用旧材料后，应能逐收件人完成纠正

**依据。** [生命周期决策 L209](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/decisions/05-define-deal-workspace-model-and-lifecycle.md:209) 已要求 correction/withdrawal/recirculation 留新 Decision 与 Process Event；[UF-26 至 UF-28 L466–496](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/user-flow.md:466) 覆盖外部使用记录、影响评估和新 Revision，但未规定按旧版本收件人逐项完成后续纠正的用户流程。底层已有 delivery、actual-use 与 invalidation，建议复用。

**场景与建议。** Rev3 被 A 在线看过，又由 Banker 在产品外发给 B/C；Rev4 修正后，停止未来访问并不会让 B/C 自动得到更正。Impact 应列出旧版本、错误范围、已知收件人、仅授权/已访问/已外发、拟采取动作及完成状态。生成可供 Banker 自行发送的纠正材料，外部动作由本人记录；不增加自动邮件发送，不声称召回已取得的文件，不继承旧授权。

**验收。** 能表达“B 已收到纠正、C 待处理”；仅生成 Rev4 不得自动结案；A/B/C 的已知旧使用均被覆盖，Rev3 历史保持原样。

**同步范围。** 变更传播、UF-27/28、Action Center、既有 Open Item/Process Event 与收件人后续处理关系。

## 二、让关键交互真正接通

### F06 · P1 · 额度预览与混合批次接收需要明确用户操作

**依据。** [API L830–832](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:830) 强制涉及额度预留的命令携带 operation_preview_id 与 consent_digest，缺失/变化分别返回 422/409；[技术设计 L68](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/technical-design.md:68) 要求预留前显示分类与额度影响。[Sources UX L722–770](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/ux-spec.md:722) 和 [线框 L692–734](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/wireframes.md:692) 尚未给出对应完整预览、明确提交和变化后重审步骤。

**影响。** 客户端可能自行发明弹窗，或把后台取得的 digest 当成用户同意。额度充足时同样需要让用户区分不计量的局部纠正与完整重建，不能只在超额时提示。

**建议。** 在既有提交 Review 中显示工作范围、本次计量分类/数量、剩余容量、失败恢复规则；只有新增费用才进入购买选择，不额外叠多层确认。预览过期、依赖或额度变化时保留输入、突出差异并重新提交。

同时补齐混合批次体验：[线框 L694、714](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/wireframes.md:694) 禁止声明前选文件，而 API 又需要每文件声明。可区分本地选择元数据与实际上传：先得到本地清单，显式将声明应用于选中项，展示例外，声明未完不传输；以批次表分别显示 transfer/safety/acceptance/parse，失败成员单独修复。已有批量选择、部分接受和续传，不应重新发明底层能力。

**验收。** 局部纠正与 full rebuild 显示各自准确计量；另一标签页消耗额度后，原页面保留输入并提示变化。20 个文件中 3 个权限不同、2 个缺声明，差异不能被统一声明掩盖；重试失败成员不重复创建已接受 Source。

**同步范围。** 通用 Review、Sources、Work Objective、Revision、Job recovery、线框、API 错误映射与用户同意事件。

### F07 · P2 · 同 Deal 跨对象检索应有可用入口与结果闭环

**依据。** [IA L787–796](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/information-architecture.md:787) 定义同 Deal 授权对象/版本搜索；[技术设计 L338–347](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/technical-design.md:338) 有 FTS 与 locator。现有 [collection UX L123–146](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/ux-spec.md:123) 和 API 主要是单对象列表 q，没有统一 Deal search 的入口、结果类型和操作合同。

**场景与建议。** 用户记得管理层关于“客户流失”的一句话，却不记得在 Source、Claim、Issue 还是旧 CIM。增加 Deal-scoped 搜索入口，结果带简短上下文、对象角色、来源/版本/日期、命中位置与相关输出跳转；明确 current/history。区分没有命中与尚未索引/解析受限，保持现有权限与历史开关。无需跨 Deal 检索或另造聊天入口。

**验收。** 用户不知道对象类型时仍能一次搜索找到 Source、Claim 与 CIM 的关联命中并打开 exact locator；未完成索引不能呈现为确定不存在，其他 Deal 不返回。

**同步范围。** IA、UX 搜索/返回、线框、API operation/response、FTS 覆盖与一致性状态。

### F08 · P1 · CSS 宽度限制与桌面缩放验收冲突

**依据。** [UX L1241–1284](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/ux-spec.md:1241) 按 CSS viewport 切换模式，低于 1024px 禁止上传、重要判断、新导出和共享；[技术设计 L1422–1435](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/technical-design.md:1422) 同时要求这些关键流程在 200% zoom/reflow 下通过。

**场景与建议。** 桌面页面缩放或分屏使布局视口低于阈值，用户已经在桌面，却被要求“Continue on desktop”。应把版面适配与动作能力分开，用纵向/分步 Review 与面板切换保留关键网页操作；原生 Office 编辑仍可要求相应桌面应用。不要要求用户缩回 100% 才能完成现有无障碍验收。

**验收。** 1440px 和 1180px 桌面在 200% 页面缩放下完成上传、Evidence→Decision、新 Internal Export；中途缩放不丢 Draft、不撤销提交能力。此处为规则冲突推演，尚未做当前产品浏览器实测。

**同步范围。** 响应式/无障碍 UX、UF-38、IA、WF-SM 与技术验收。

### F09 · P2 · 访问管理的合理吞吐需要与敏感限流匹配

**依据。** [Integration L780–787](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/integration-spec.md:780) 采用 token bucket，Sensitive Grant 为 10/10分钟、burst 2；[API L399](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:399) 禁止 Access mutation bulk；每次恢复、撤销各需独立 Grant。

**场景与影响。** 一次临时限制解除后，用户逐一恢复 20 个仍有效的 Access。按满 bucket 起步、无其他竞争、连续按分钟补令牌推算，发出 20 次 Grant 最早约需 18 分钟，尚未计重认证、阅读或失败；这不是实测耗时。正常导出也占同一预算。

**反证与建议。** 普通 Fact/Assumption 判断不受该 Grant 限流；Access 已可原子创建所需 Delivery；撤销共同 Decision 已可停掉其全部匹配 Access。因此问题限于跨 Decision 的选择性管理、逐项恢复和共享额度。建议区分扩权、导出与收缩权限预算，设计连续 Review/结果队列；如增设固定集合撤销，明确集合、版本和逐项结果。恢复仍须显式确认，不自动复活历史访问。

**验收与同步。** 20 个 Access 分属多个 Decision，测试选择性撤销、恢复和并行导出，明确接受的吞吐与等待提示；同步 rate policy、权限/API、Access Control 和恢复 UX。是否改变集合操作边界是待确认取舍。

## 三、补齐会导致不同实现的技术契约

### F10 · P1 · 归档后应保留停止既有共享的窄权限

**依据。** [Permission L244](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/permission-model.md:244) 明确 Archived Deal 不能 revoke/resume Recipient Access，既有访问又不自动终止，并说明归档前是“不重新激活就能撤销”的最后机会。[产品规范 L328](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/product/spec.md:328) 要求重新激活占用 Active Deal slot。

**场景与影响。** A 归档后，其槽被新 Deal 占用；用户想停止 A 的既有访问，却要先腾容量或购买容量重新激活。这是明确规则造成的操作障碍，不能要求用户通过删除整笔交易来停止共享。

**建议与验收。** Archived 允许 exact Access/External-Use Decision 的撤销，保持当前认证、Grant、版本和审计要求；不允许借此新建、延期或恢复访问，也不占活跃容量。以“A 已归档、全部槽被占满”验证直接撤销、正在读取的会话按既定边界停止、旧访问事实保留。

**同步范围。** 生命周期与权限矩阵、归档 Review、API、RLS 及相应验收。

### F11 · P1 · 删除一个 Deal 与删除 Account 的身份效果必须分开

**依据。** [UF-33 L533–540](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/user-flow.md:533) 和 [Permission L534–537](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/permission-model.md:534) 仅移除受影响 Deal/scope 的访问；但 [Permission L557](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/permission-model.md:557)、[ADR-0041 L29](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/adr/0041-use-supabase-auth-for-v1-authentication.md:29) 对 Account 或 Deal 删除都写成移除全部普通产品关系，身份只可查询删除状态。CONTEXT、ERD 与 ADR-0038 也有相同的笼统 claimant-only 表述。

**场景与影响。** 同账户有 A、B，仅删除 A。如果按后一种文字实现，B、账户及订阅管理也可能被封。最终删除身份时“没有其他合法关系”的条件已经存在，但不能消除接受单 Deal 删除时就清空关系的冲突。

**建议。** 固定两种作用范围：Deal 删除只撤销该 Deal 的访问、Jobs、Grants 等，Actor、Account、其他 Deals 与订阅保留；该删除请求的 Status Grant 可与仍有效的普通身份并存。Account 删除才进入 claimant-only。最终供应商身份清理还需检查其他有效关系和未结束 claimant。

**验收。** 删除 A 后 A 不可读，B、账单和正常购买继续可用，删除状态只返回 A 的最小状态；多个删除请求分别保留自己的状态查询期限。同步领域定义、ADR、ERD、Permission、API 与两条 UX 删除流程。

### F12 · P1 · 首份 Narrative 内容接受与 Revision 创建顺序尚未闭合

**依据。** [API L1059](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:1059) 的内容接受返回 DeliverableRevisionContent；[ERD L713](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/data-model-erd.md:713) 要求其绑定 Revision；[API L1173](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:1173) 的 create_revision 又以已接受的 semantic content 为输入，成功 Job 才链接 immutable Revision。

**判断边界。** 可通过 acceptance 原子创建 Revision 等方式实现，因此不能说这是不可解的循环。问题是文档没有选定：首次没有 Revision 时，内容归属谁、哪个命令创建身份、文件生成失败后留下什么。Workbook 的关系模型并不直接受此问题影响。

**建议。** 优先考虑 Deliverable 下的不可变 Accepted Content Version，构建 Job 消费其精确版本，成功后原子创建 Revision 与文件/manifest/内容绑定。另一方案是 acceptance 原子创建有明确状态的 semantic Revision，但要同步改写 create_revision 的意义、失败状态与可用性判定。两种择一，不能由不同开发模块各自选用。

**验收。** 从零 Revision 的 Teaser/CIM/Memo 完成内容接受到首个成果；在接受后、字节生成后、DB 绑定前分别中断，重试不留下假完成版本、不改旧内容、不重复收费。同步 API、ERD、ADR-0032、AI 输入和首次生成流程。

### F13 · P1 · Impact 必须证明候选依赖集合完整

**依据。** [ERD L552–576](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/data-model-erd.md:552) 规定 typed relation 是权威，dependency projection 可滞后，Impact 用它生成候选闭包后逐候选回查。[ERD L1202–1210](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/data-model-erd.md:1202) 已有 source watermark；[AI Contract L196](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/ai-prompt-contract-spec.md:196) 的影响任务只接收这个候选闭包。

**场景与影响。** 新 Revision 已建立权威依赖，但投影还没有新 edge，随后立即更正对应 Fact。逐项回查能排除虚假候选，却不能发现根本没进入候选集的真实依赖。通用一致性 cursor、watermark 和“不错误提升 readiness”原则都已有；缺的是 Impact 执行时的具体完整性前提。未证明当前实现发生漏失效或越权。

**建议。** 规定相关 lineage 提交序列、水位与评估快照的关系。水位未覆盖时有界等待，之后通过 typed relation 补全闭包，或把完整性标为未确定并限制相关结果/外用；不能把空候选当成没有影响。评估完成前并发新增依赖也要重验。

**验收。** 暂停投影消费者，新建 Revision→Fact 关系，再更正 Fact；必须找到该 Revision，或明确保持评估未完成，恢复消费者后与权威闭包一致。同步 ERD、Impact 合同、readiness/授权检查与专门的并发用例。

### F14 · P1 · Evidence Inspector 缺 Source/Representation 字节授权的具体操作

**依据。** [UX L799–808](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/ux/ux-spec.md:799) 要求格式感知的原文和 exact locator 上下文。[API L979–982](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:979)、[L1399–1401](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:1399) 提供 Source/Representation 元数据；[L1288–1289](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:1288) 的普通 Deal 字节 Grant 操作针对 Artifact。现有目录有导出、发票、外发等其他专门 Grant，但未规定 Accepted Source Object/Source Representation 对应入口；这两者在 ERD 是独立于 Deliverable Artifact 的 typed attachment。

**影响与建议。** 查看证据不应要求先生成交付物或做一次导出，更不能通过直接 Storage 地址绕过已有规则。补 Source/Representation 下的窄粒度 Object Grant 操作，绑定源版本、attachment、digest、查看目的和当前权限；不虚构 Deliverable Revision。明确原文查看、局部渲染和原件下载的区别及各自权限。

**验收。** 上传受支持 PDF/XLSX 后，用户无需先建成果即可查看支持和挑战关系的原文上下文；跨 Deal、错误 attachment、已经失去查看权限的读取被拒绝。同步 API、Gateway typed attachment、Evidence Inspector 与读取验收。

### F15 · P1 · Recovery Cookie 的前缀与 Path 冲突

**依据。** [API L138](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:138) 设置 __Host-security_recovery_session，同时指定 Path=/api/v1。IETF 草案要求 __Host- Cookie 使用 Secure、Path=/，且不带 Domain；符合前缀规则的用户代理会拒收不满足条件的 Cookie。已核对 [IETF §4.1.3.2](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-4.1.3.2) 和 [§5.7](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.7)。

**影响与修订。** 按当前文字发出响应，服务端即使返回创建成功，浏览器也可能没有可用恢复会话。保留 __Host- 时将 Path 改为 /，并同步清除 Cookie 的 Path。恢复权限继续由服务端 session-mode allowlist 限制，Cookie Path 不承担授权边界。

**验收。** 在 HTTPS 真浏览器确认建立、发送和清除 Cookie；恢复 Cookie 访问普通 Deal 路由仍被拒绝。当前 Recipient Cookie 已使用 Path=/，不应一并误改。本次核验的是协议及文档冲突，没有运行产品的恢复登录。

## 四、补齐等待、恢复与状态选择

### F16 · P2 · 全局调度需要用户等待预算和公平规则

**依据。** [架构 L639–659](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/system-architecture.md:639) 全局 Heavy concurrency 为 2，每 Account 可有 2 个完整工作流；[技术设计 L771–786](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/technical-design.md:771) 允许 full workflow 达 4 小时；[ERD L1464](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/data-model-erd.md:1464) 已有 priority 索引，另有 queue age 监测。未明确优先级含义、跨 Account 公平性、短纠错与大包的资源竞争，以及排队时间是否计入总期限。

**场景与建议。** 两个大包使用全部重处理资源时，其他 Banker 的短纠错/导出可能等待。入口限流不等于取得执行资源。设计 Account 间轮转、等待时间提升优先级、短任务预留或安全检查点让出资源，区分排队/执行/依赖/用户等待。先在现有单机边界内明确调度，不以扩大架构代替规则；预计耗时只使用有依据的测量。

**验收。** 多 Account 的大包、短纠错与导出混合运行，验证短任务等待上界、长任务不饥饿、取消后资源回收与不重复扣量。等待目标由最低配置压测确定。同步调度合同、Job UX、容量与性能验收。

### F17 · P2 · 恢复目标需要明确适用故障与共同恢复点

**依据。** [架构 L682–700](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/system-architecture.md:682) 和 [技术设计 L1290–1315](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/technical-design.md:1290) 同时规定数据库 RPO≤5分钟、对象恢复副本≤15分钟、每日独立逻辑备份以及组合验证，但未把这些目标对应到各类故障。官方说明数据库备份不包含 Storage 对象字节；项目删除也会删除其供应商侧备份。[Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)

**判断边界。** 不能据此说没有备份，或普通恢复必定丢一天数据。PITR 可用时有较近恢复路径；若供应商恢复点不可用、只能依赖每日独立逻辑备份，最新独立数据库状态可能已接近一天。更近的对象字节不能重建期间丢失的 Decision、Revision 和关系；数据库与对象的共同可用时间也需要定义。

**建议与验收。** 按误写、主机损失、托管恢复点不可用、对象丢失、密钥不可用分别记录目标、前提与恢复步骤。测试数据库和对象时间错位时如何选择一致快照、标记待恢复内容、验证 manifest 与删除 tombstone。向用户说明最近可恢复成果时间及未恢复范围，不把单一 RPO当完整 Deal 的恢复承诺。此处没有判断当前实例的 PITR 配置或实测 RTO。

**同步范围。** 架构/技术恢复矩阵、备份 manifest、演练与产品状态说明。

### F18 · P2 · Source 当前选择的并发合同要显式化

**依据。** [ERD L372–375](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/data-model-erd.md:372) 有 classification、rights、reliance、condition 的 current-selection 与 row_version；[API L993–1002](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:993) 主要声明新增 assessment，未明确是否同时选为 current、针对什么 ETag 做比较，以及当前选择如何读取。[API L333–335](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:333) 又要求每项操作显式声明并发配置。

**建议。** 对每个 assessment 明确“仅追加”或“追加并选为 current”；后者要求当前选择的可读版本和原子条件更新，前者另给明确选择命令。首次没有 current 时也需规定。不要按 created_at 自动选择，也不能写完 assessment 却让用户误以为已生效。

**验收与同步。** 两个标签页基于旧状态更改同 Source/purpose，后提交者收到可理解的冲突；另一 purpose 不误冲突；成功后的当前读、Job 权限与 Impact 对应同次选择。同步 API schema、ERD 原子边界和冲突 UX。

### F19 · P2 · Pause 后的 blocked Job 需要明确恢复动作

**依据。** [Permission L255](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/permission-model.md:255) 允许暂停后的 Job 保留在 blocked/workspace_posture_changed，并要求 resume 后 explicit recovery；[API L734–738](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:734) 的 retry 只允许 failed_retryable，依赖触发恢复只列 waiting_for_source/user；[操作目录 L1274–1275](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/api-spec.md:1274) 只有 cancel/retry。ERD 状态图虽允许 blocked→queued，尚未给出用户触发条件与操作。

**建议。** 为该可恢复原因定义窄的恢复命令，或明确将 Deal resume 与用户选择的 Job 恢复组合；重验未变依赖、重新取得当前 posture 的 Scope、复用已接受步骤。若依赖已变则走新的 rerun 与预览，不能用通用 resume 绕过任意 blocker。

**验收与同步。** Job 完成第一步后暂停，旧 worker 不再提交；恢复 Deal 后，用户只执行缺失步骤。源已变、付费权限已终止等情况给出准确后续路径，不能默默从头扣一次完整操作。同步 API、状态机、Job recovery UX 与额度分类。

## 五、建议怎样修订文档

### 优先顺序与可审查交付物

| 顺序 | 应形成的设计成果 | 对应发现 | 完成判据 |
|---|---|---|---|
| 1 | 核心交付物内容合同、完整合成成果、实质质量正反例、首次可用成果定义 | F01、F02 | 给定同一组输入，产品、Prompt、文件生成与 QC 不再自行解释“应该产出什么” |
| 2 | 材料接收、工作启动、关键复核、变更恢复、查找与外部纠正的连续操作说明 | F03–F07、F09 | 每步有明确用户动作、范围、状态、恢复路径及对应 API；记录重复劳动与有效任务耗时 |
| 3 | 来源读取、首版创建、影响完整性、共享生命周期、身份删除与恢复的完整契约 | F08、F10–F15、F18、F19 | 前端步骤、命令输入、数据库事务、权限及失败恢复逐一对应；相关并发/错误用例有唯一预期 |
| 4 | 多账户任务调度与按故障分类的恢复设计 | F16、F17 | 等待与恢复承诺有适用范围、测量办法和用户可见状态 |
| 5 | 跨文档复核与开发输入检查 | 全部 | 每项产品要求能追到 UX、API/状态/数据规则与验收场景；遗留决策不再藏在不同文档中 |

顺序表示设计依赖；例如 Cookie、删除作用范围等清晰勘误可随对应合同一起先处理。这里没有创建实现队列，也没有要求先完成一套庞大新流程再开发。

### 建议固定的几个关键规则

以下是供确认的修订方向，不是已替换的现行正文：

- **删除范围**：单 Deal 删除只终止该 Deal 的普通访问及处理；保留同 Actor 对 Account 和其他 Deal 的合法关系。Account 删除才终止账户范围的普通关系。
- **归档共享**：归档不得阻止责任人收回既有访问；收回不占活跃 Deal 容量，也不授予新访问。
- **来源检查**：Evidence 的来源查看有独立、精确的 Source/Representation 读取路径，无需先生成交付物。
- **变更评估**：只有证明依赖闭包覆盖了相关已提交关系，才可完成本次影响评估；无法证明时显示未完成，不能解释成没有影响。
- **用户同意**：consent digest 代表用户看过的精确范围与额度效果，不等于客户端后台取得一个预览结果。
- **首个可用成果**：首次价值按用户预先选定的工作目标判定，控制回路完成单独记录；正确 blocker 是否算该目标成功，必须事前明示。

### 真正需要产品取舍的事项

大部分跨文档冲突有明确的修订方向；以下项目则应在修订时保留可审查的选择及理由，不能用技术细节替用户决定：

1. **容量恢复**：文件数属于硬技术上限还是可购买资源；活跃历史如何计量、分层和扩容。建议先保证同一 Deal 的必要材料有诚实、连续的恢复路径，再统一 offer。
2. **复核单位**：先采用不改变决策语义的连续复核，还是允许固定集合确认。建议先用共享上下文、明确理由复用和只复核变化项验证效率，避免直接引入宽泛 bulk approve。
3. **首次价值与保证**：是否把首次可用成果作为保证合同的里程碑。建议拆分事件，并对每种首目标定义可读谓词；更改商业条款需明确记录，而非只改埋点。
4. **小屏能力**：如何在窄屏中保留完整、可理解的关键 Review。建议先保证桌面缩放/分屏任务完整，再明确手机支持范围，不用 viewport 充当业务权限。
5. **访问管理吞吐**：撤销、恢复和导出的预算是否分开，以及是否需要精确集合撤销。建议优先改善收缩权限路径，恢复仍保持明确审查。

Content 与 Revision 的事务设计、投影完整性方案等属于需要写清的技术选择，可按本报告推荐方案起草后统一评审，不必逐个把底层实现选择变成用户问卷。

### 文档如何成为后续开发依据

保留现有 concern-specific 文档分工，每条规则只有一个主定义，其他文档引用它。建议为关键需求建立轻量追踪表：**用户任务 → 产品规则 → UX 动作 → API 命令/错误 → 数据与权限不变量 → 验收场景**。这是一张对应关系表，不是新的实现管理系统。

区分三种状态：已确定设计、待产品取舍、待运行验证。已经在技术文档解决的旧“implementation-deferred”问题应链接到当前结论；历史文字作为来源保留，不能让开发者误以为仍可自由选型。现有入口已经说明历史 accepted/confirmed 不代表当前验证，应延续这个边界。

不要把“尚未开始新实现，所以没有生成 schema、测试、探针产物”当成当前文档缺陷。应先写清 schema 要表达的业务规则和可用输出，再在实现时生成对应代码与验证。

[Integration L979–989](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/technical/integration-spec.md:979) 已明确留下 measurement retention/身份关联、原始 webhook 字节保留、operator 人类身份机制三项决策。它们不是这次新发现的遗漏；后续修订应保留其受限/未启用状态与负责人，不能静默填默认值。本次没有选择或启用这些机制。

## 六、应保留的设计与已排除的误报

| 应保留的基础 | 审核中排除的误判 |
|---|---|
| Source、Evidence、Claim、Fact、Assumption、Decision 分离 | 不能为了界面简化合并为一个笼统 approved 状态 |
| 不可变 Revision、精确 lineage、原生编辑与三方再导入 | 不是缺少原生往返，也不是历史错误无法纠正 |
| 来源不足时限定输出、局部继续、补材料路径 | 不是缺一个来源就必须整笔 Deal 停摆 |
| 可从 In Market、Bid Evaluation 等阶段接入 | 不应要求用户重走或伪造早期交易历史 |
| Guide 复用真实对象，安全独立工作可继续 | 不是 onboarding 完成前整个产品被锁死 |
| 无真实冲突时可做正常确认 | 不要求用户人为制造 synthetic demo 中的错误 |
| 普通 Human Decision 不需 Sensitive Action Grant | 不把访问管理限流泛化到每个 Fact/Assumption 判断 |
| Recipient Access 可原子创建所需 Delivery | 不报告隐藏的必需 Delivery 前置调用 |
| 撤销共同 Decision 可停止其匹配 Access | 不声称完全没有整组停止访问能力 |
| projection 有 watermark、重建与一致性概念 | F13 针对消费时完整性要求，不是没有水位 |
| 最终身份删除已有其他合法关系保护 | F11 针对单 Deal 删除接受时的冲突，不抹去已有终结保护 |
| 控制动作不按次数收费、产品故障恢复不重复计量 | 容量和等待改善应延续这些良好激励 |

这些反证是保留现有成果的重要部分。后续修订应避免把已完整的控制设计重写一遍，或因某个流程缺口而加入不必要的新系统。

## 七、建议的验收输入与后续检查范围

除已有完整 Sell-Side Reference Deal 外，先把以下场景写成可执行验收说明，再在对应模块实现时落为测试或人工任务检查：

| 场景组 | 应证明什么 |
|---|---|
| 两种报价结构及缺失条件 | 内容合同能区分金额、条件、不可比与人工选择 |
| 首次目标四类结果 | 教学、可用成果、导出及保证事件各自准确 |
| 20 个混合声明文件、部分失败、预览过期 | 声明/范围/费用由用户清楚确认，成功项不重复 |
| 300 字段下一期仅 12 项变化 | 减少重复判断，同时保留重大异常审查 |
| 第 251 文件、活跃存储满、槽位复用 | 每类 blocker 对应有效恢复与明确额度归属 |
| 旧版本在线及产品外均已使用 | 更正按已知收件人跟踪，不自动外发或继承授权 |
| 200% zoom、分屏、键盘流程 | 关键网页任务仍可完成且不丢草稿 |
| 归档后槽位满、多个 Decision 的访问管理 | 收回权限不依赖付费扩容，吞吐符合选定目标 |
| 同账户 A/B，删 A；多个删除 claimant | 删除与身份清理范围准确 |
| 首次内容、文件生成和数据库绑定阶段失败 | 新成果创建及重试语义唯一 |
| 投影滞后、并发新 lineage、立即纠正 | 不遗漏真实依赖或假装评估完成 |
| Source 原文查看与错误 scope | 证据检查路径可用，授权仍精确 |
| 大包/短任务混合、Pause 后恢复 | 等待、公平、恢复和额度处理一致 |
| 数据库/对象恢复点错位 | 可恢复成果边界明确，历史与删除状态一致 |

本次已经完成的是静态审核、反证、方案整理和本地链接目标检查；上述表格是后续验收要求，**不是已经通过的测试清单**。也没有将当前文档对应的界面做高保真视觉评审，或用合成案例宣称真实 Banker 已接受产品。

外部依据仅用于少量技术事实：Cookie 前缀使用 IETF 原文；备份边界使用 Supabase 官方说明，并读取当日 changelog。其余主要结论来自本地现行契约和明确标注的设计推演。

## 本次交付边界

仅新增本审核报告。现有产品、领域、UX、技术设计与 ADR 正文保持原样，未提交、推送、部署或创建实现任务。

建议下一步按上述顺序修订设计，先产出可审查的核心成果合同和连续任务说明，再同步技术契约。完成修订后，以对应关系与上述场景复核，才能把“文档齐全”进一步变成“开发者不必猜测关键产品行为”。

