recommended_design_system_id: tech-utility
recommended_design_system_title: Tech / utility — Datadog / GitHub

# InvestmentBanking V1 设计系统推荐

## 结论

唯一推荐 Open Design 内置方向 `tech-utility`。它不是因为产品属于金融行业，而是因为产品本质上是一个面向高专业度操作员的、数据密集、版本密集、控制密集的长期工作台：用户需要同时辨认对象、精确版本、来源定位、独立状态、阻断原因、可恢复动作与审计记录。`tech-utility` 的高信息密度、等宽数字、细边框表格、克制状态标记和操作员界面姿态与这些任务直接吻合。

本原型不混用其他设计系统。产品定制只扩展语义状态、审计/血缘、金融数据和材料版本组件，不改变 `tech-utility` 的基础视觉语法。

## 证据等级与产品理解

### 已由权威资料确认

- 核心问题：个人投行家需要把持续变化的管理材料、财务文件、尽调记录、买方/流程信息、报价和专业判断，转化为当前分析、可编辑银行家原生文件、审查决定与受控外部使用；变化必须能追踪到受影响的事实、计算、单元格、页面、审查、就绪结论与授权。证据：`.scratch/ai-investment-banking-productization-wayfinding/spec.md:5-21`。
- 主要用户：海外精品投行、小中型并购顾问机构或独立交易顾问中的执行型个人投行家，具备高专业度、可独立购买并负责日常卖方拍卖执行。证据：同上 `:23-27`。
- 产品形态：独立 Web App；持久化 Deal Workspace 是唯一业务权威，不是聊天机器人、一次性生成器、AI 技能菜单或静态文件库。证据：同上 `:23-39`；`docs/ux/information-architecture.md:49-60,82-92`。
- 核心业务链：Deal Setup / Paid Preflight → 精确 Source Packet → 可观察受控处理 → Evidence 检查 → 类型化 Human Decision / 更正 → 确定性校验 → Impact Assessment → Native / Reader 结果、QC 与 Package Readiness → Internal Controlled Export → 持续修订。证据：`docs/ux/wireframes.md:1354-1415` 与正式 UX Spec。
- 核心信息对象：Deal、Source Material / Source Record、Evidence、Claim、Fact、Assumption、Calculation、Model、Analysis、Process Event、Deliverable、Revision、Review、QC Finding、Human Decision、External-Use Decision、Job 等均为独立且可寻址的类型化对象。证据：`CONTEXT.md`；`docs/adr/0022-model-core-domain-objects-as-typed-relations.md:1-3`。
- 权威与审计：当前状态与追加式材料历史并存；Revision、Decision、Impact Assessment、QC、授权和导出不可静默覆盖。证据：`docs/adr/0003-store-current-state-with-append-only-material-history.md:1-3`。
- AI 边界：AI 只能产出版本化 Proposal / Evidence Candidate，不能直接创造 Fact、Human Decision、Process Event、授权或业务副作用。证据：`docs/adr/0020-constrain-ai-to-versioned-proposal-only-tasks.md:1-3`。
- 使用与交付边界：Internal Controlled Export 与 Externally Authorized Delivery、实际外部使用必须完全分离。证据：`docs/adr/0001-separate-internal-export-from-external-delivery.md:1-3`。
- 信息密度：正式 IA 规定九个稳定工作域、专业对象集合默认使用表格、对象详情含版本与独立状态、桌面可同时显示导航/主区/检查器。证据：`docs/ux/information-architecture.md:274-312`；`docs/ux/ux-spec.md:98-119`。
- 设备优先级：1280px 以上是完整工作区；1024–1279px 保留完整操作但折叠导航/检查器；1024px 以下只保留检查与退出类任务，并把材料决策、上传、外部授权等引导回桌面。证据：`docs/ux/ux-spec.md:1219-1271`。
- 可访问性：所有客户界面目标为 WCAG 2.2 AA；关键流程不可访问即未完成。证据：`docs/ux/ux-spec.md:62-73,1273-1275`。
- 前端约束：正式技术设计指定 Next.js App Router、React、TypeScript；Web 只拥有渲染、导航、可访问性与 API 客户端，不拥有权威域事务。证据：`docs/technical/technical-design.md:148-195`。

### 证据支持的合理推断

- 用户在日常工作中需要比营销型 SaaS 更高的横向信息密度和更低的视觉噪声；状态必须依靠文字、图标、位置和颜色共同表达。
- 可信度主要来自精确对象身份、版本、来源、规则、结果和动作后果，而不是“银行蓝”、大面积品牌色或装饰性数据图表。
- 原型应优先验证高风险控制闭环，而非覆盖营销站、购买与全部九个工作域的每个细分对象。
- 右侧 Inspector 适合预览关系与阻断，但最终材料决策必须进入完整 Control Review 页面。

### 仍未确定

- 正式品牌名称、Logo、品牌语气和商业视觉资产未在已检查的权威资料中锁定。
- 正式前端组件库未指定；技术栈指定 Next.js/React/TypeScript，但本 Open Design 原型为便于本地预览采用 React + TypeScript + Vite，不构成生产架构决策。
- 生产 Capability Manifest 的限制值、真实客户数据、Office 渲染结果和实际授权主体均仍需实现/验证；原型只能使用清楚标记的 Project Northstar 合成演示数据。
- 正式 V1 UI 文档要求英文；本次 Open Design 会话按 zh-CN 交付界面，技术标识和对象 ID 保持英文。生产本地化范围仍未决定。

## 候选设计系统决策矩阵

评分为 1–5，权重合计 100%。所有候选 ID 均由 Open Design 方向库实查确认。

| 评价维度 | 权重 | tech-utility | modern-minimal | human-approachable | editorial-monocle | brutalist-experimental |
|---|---:|---:|---:|---:|---:|---:|
| 产品语义和用户任务匹配度 | 15% | 5 | 4 | 3 | 3 | 2 |
| 复杂工作流承载能力 | 15% | 5 | 4 | 3 | 2 | 2 |
| 数据密度与信息层级 | 15% | 5 | 4 | 3 | 2 | 2 |
| 专业可信度 | 10% | 5 | 5 | 4 | 4 | 2 |
| 可访问性 | 10% | 5 | 5 | 5 | 4 | 3 |
| 响应式适应能力 | 10% | 4 | 5 | 5 | 3 | 2 |
| 组件覆盖度 | 10% | 5 | 4 | 4 | 2 | 2 |
| 原型实现可行性 | 10% | 5 | 5 | 4 | 3 | 3 |
| 品牌区分度 | 5% | 4 | 4 | 3 | 4 | 5 |
| **加权总分 / 5** | **100%** | **4.85** | **4.40** | **3.70** | **2.85** | **2.35** |

### 排除理由

- `modern-minimal`：精确且成熟，但更适合中等密度软件界面；默认留白和展示姿态会弱化本产品的操作员密度、状态对比和表格主导结构。它是最强次选，但没有 `tech-utility` 那么贴合任务。
- `human-approachable`：可访问性和响应式优秀，但 12–18px 圆角、较强触感与更丰富面板配色容易把严肃控制对象包装成消费级任务卡，降低版本/审计语义的锋利度。
- `editorial-monocle`：在研究报告和公开内容上有效，但其大留白、衬线标题和低组件密度不适合持续交易执行工作台；Open Design 方向说明本身也明确不建议用于 SaaS/dashboard/product utility。
- `brutalist-experimental`：辨识度最高，但强边框、极端字号、正文等宽和非对称构图会牺牲长时间阅读、表格扫描、复杂表单与材料决策的效率。

## 继承规则

以下部分直接继承 `tech-utility`，不作混搭：

```css
:root {
  --bg:      oklch(98% 0.005 250);
  --surface: oklch(100% 0 0);
  --fg:      oklch(22% 0.02 240);
  --muted:   oklch(50% 0.018 240);
  --border:  oklch(90% 0.008 240);
  --accent:  oklch(58% 0.16 145);

  --font-display: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-body:    -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace;
}
```

- 背景与工作面：冷白页面背景、纯白工作面，主次层级由边框、间距和内容组织承担。
- 排版：界面标题与正文使用同一系统无衬线栈；ID、哈希、时间、版本、金额、比率和表格数字使用等宽或 tabular numerics。
- 表格：细分隔线、无斑马纹、紧凑行高、悬停只改变背景/边框，不降低文字对比。
- 色彩：行动色只有一个绿色主强调；不可用大面积色块、渐变或品牌色洗屏。
- 阴影：普通工作面无阴影；仅菜单、对话框与 Inspector overlay 使用单层轻阴影。

## 产品化 Token 建议

- 间距：4 / 8 / 12 / 16 / 24 / 32 / 48px，主工作区采用 8px 基线。
- 圆角：控件 6px、面板 8px、对话框 10px、药丸状态 999px；不使用大面积 16px+ 圆角卡片。
- 阴影：`0 12px 32px color-mix(in oklch, var(--fg) 12%, transparent)` 仅用于 overlay/dialog。
- 信息色：`--status-info: oklch(55% 0.12 250)`，用于可恢复信息，不替代标签文字。
- 警告色：`--status-warning: oklch(62% 0.13 75)`，用于 `waiting`、`stale`、`conflicted` 等需注意状态。
- 阻断色：`--status-critical: oklch(54% 0.18 28)`，用于 `blocked`、`failed`、`circulation blocked`。
- 通过色：直接使用 `--accent`，用于确定性校验通过和已保存收据；不用于暗示专业审批或外部授权。
- 所有状态背景由对应颜色与 `--surface` 的 10–14% `color-mix()` 派生，并同时显示图标/文字，禁止仅凭颜色表达。

## 产品专用组件

1. **Deal Workspace Shell**：九工作域导航、Deal 上下文头、主区、Context Inspector；1280px 完整并列，1024–1279px 折叠，窄屏进入受限只读导航。
2. **Independent State Summary**：按 Source & Evidence、Analysis & Mechanical、Deliverable & Review、Process、External Use 分组，禁止总分和单一“Ready”。
3. **Evidence Split Inspector**：原始来源定位与结构化 Evidence 并列，同步展示版本、Native Locator、支持/挑战关系。
4. **Control Review**：显示精确对象/版本、目的、证据、选项、影响、理由、将生成的不可变记录；提交动词必须描述结果。
5. **Lineage / Impact Ledger**：以分组列表为主，显示 recalculation / regeneration / re-review / circulation-blocked / unaffected；图仅为辅助。
6. **Package Readiness Matrix**：逐要求显示 exact scope、posture、evidence/control、blocker、next action，禁止百分比和主绿色“Ready”。
7. **Revision / Authorization Boundary**：版本标签与授权标签物理相邻但语义分离，明确旧授权不继承到新 Revision。
8. **Internal Controlled Export Review**：精确对象、哈希、包含/排除项、限制、内部目的、manifest，持续提示“不授权外部流转”。
9. **Durable Job Status**：阶段、已保留进度、心跳、可继续工作、最小恢复动作；无可靠 ETA 时禁止伪造百分比。
10. **Synthetic Data Marker**：在页头和关键演示记录持久显示“Project Northstar 合成演示数据”，避免演示数字冒充真实业务数据。

## 风险与缓解

| 风险 | 影响 | 缓解方式 |
|---|---|---|
| 高密度退化为视觉拥挤 | 难扫描、错误率上升 | 只在表格和控制页提高密度；说明文本、Control Review 与错误恢复保持清晰段落和稳定 8px 网格 |
| 绿色强调被误读为“已审批” | 破坏责任边界 | 绿色只表示机制状态/通过，始终附带具体文字；专业可用性、就绪、授权分别显示 |
| 状态颜色过多 | 降低主强调与品牌一致性 | 状态色只出现在小面积徽标、图标和边框；操作 CTA 仍只有 `--accent` |
| 技术工具感削弱金融专业气质 | 产品像开发者后台 | 使用真实金融对象、定义、单位、Native Locator、Revision、哈希和审计时间建立专业性，不靠装饰性“金融皮肤” |
| 1280px 表格拥挤 | 关键列被截断 | 默认列按任务优先级裁剪；保留列管理和 Inspector；数字不换行，长文本允许自然换行 |
| 小屏误导用户完成高风险动作 | 不安全或不可审查 | 1024px 以下提供只读检查与桌面安全交接；Material Decision、上传、外部授权等保持可见但不可提交 |
| 原型语言与正式 V1 英文规范不一致 | 不能直接作为生产文案 | 保留 canonical English ID/route；将 zh-CN 文案视为本次演示本地化层，生产实施前执行英文文案验收 |

