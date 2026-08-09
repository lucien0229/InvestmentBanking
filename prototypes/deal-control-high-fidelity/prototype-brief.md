# InvestmentBanking V1 高保真原型简报

## 产品和用户摘要

Deal Control 是面向执行型个人投行家的受控 Sell-Side Auction 工作台。它把持续变化的 Source Material、Evidence、Banker judgment、确定性校验、Deliverables、Revisions、Review/QC、流程对象和外部使用记录组织为可检查、可恢复、可审计的权威对象。

目标用户是海外精品投行、小中型并购顾问机构或独立交易顾问中的高专业度个人 Banker。可信度来自精确对象、版本、Native Locator、状态、控制记录和后果，不来自装饰性“银行风”。

所有业务内容均为 **Project Northstar 合成演示数据**。

## 页面清单

### 公开发现与购买

- Outcome、Project Northstar proof、How It Works、Security & Data Use、Pricing、Qualification、Resources / trigger pages。
- Account Access Gateway：邮箱入口、Magic Link 已发送/验证、Passkey 注册/登录、内容隔离的 Security Recovery Session、会话结束、拒绝和缺失敏感动作状态。
- Checkout：Order、Terms、Payment、Confirmation、Recovery。

### Banker Account

- Deals collection、搜索和空状态。
- Usage & Plan、cancellation Control Review。
- Billing & Invoices、Notifications、Account & Security、Data / Export / Deletion、Help & Support。

### Deal Setup 和指导

- Create Deal / Deal Setup。
- Paid Preflight 的 pending、review-required 和 passed 状态。
- First Deal Guide 和 first controlled loop completion。

### Deal Workspace 九个稳定工作域

1. Overview。
2. Action Center。
3. Sources。
4. Evidence & Decisions。
5. Analysis。
6. Auction Process。
7. Execution Package。
8. Review & Readiness。
9. History & Portability。

### 专业对象与高风险任务

- Source Record、Source Packet、Claim、Analysis、Buyer、Deliverable canonical detail。
- Durable Job detail。
- Add Source、Templates & Compatibility。
- Human Decision Control Review、Stage-transition Control Review。
- Bid Comparison、Revision Comparison、Native / Reader parity、Reimport comparison。
- QC Finding、Impact Assessment、Package Readiness。
- External-Use Decision、Authorized Delivery、Recipient Access creation、Actual External Use event。
- Internal Controlled Export、Archive Package、Lifecycle、Deletion。
- Recipient identity/access、navigation-free exact viewer、unavailable state。

完整 frame-to-route 映射见 `page-coverage.md`。

## 页面之间的导航关系

```text
Public Outcome
├── Project Northstar proof
├── How It Works / Security / Resources
├── Pricing
└── Qualification → Magic Link → Passkey → Checkout → Deal Setup

Banker Account
├── Deals → Deal Workspace
├── Usage / Billing / Notifications / Security
└── Data controls → Archive / Lifecycle / Deletion

Deal Workspace
├── Setup / Paid Preflight / First Deal Guide
├── 9 stable domains
├── canonical object detail / Job detail
├── Control Review / comparisons / QC / Impact
└── Internal Export / External Use / lifecycle

Recipient Access
└── identity check → exact Revision viewer
```

纯导航使用带真实 `href` 的链接。Action queue 和 Inspector 只负责索引/预览，完成工作仍发生在 canonical page 或 Control Review。

## 最关键端到端流程

### 购买并建立第一个 Deal

Outcome → Qualification → Magic Link mailbox verification → required Passkey registration → Order → Terms → Payment → Entitlement confirmation → Create Deal → Paid Preflight → First Deal Guide。

### 第一条受控价值闭环

1. 检查 `CLM-018`：Draft CIM 的 `$18.4m` 与 Management Model `Operating Case!F42` 的 `$17.8m`。
2. 对照 Cash extraction v1 `$6.2m` 与 `Balance Sheet!F28` 的 `$4.7m`。
3. 在 Control Review 记录限定用途的 Human Decision 和更正理由。
4. 运行确定性规则，把 `$1.5m` tie-out 恢复为 `$0.0m`。
5. 查看 Impact Assessment；recalculation、regeneration、re-review、circulation blocked、unaffected 分开。
6. 检查 Package Readiness，并创建带哈希、限制和 Manifest 的 Internal Controlled Export。
7. 在 History 检查 Decision、Validation、Revision 与 Export Receipt；External-Use Decision 保持独立。

### 外部使用闭环

QC Finding → Package Readiness → exact-scope External-Use Decision → Authorized Delivery / Recipient Access → Recipient identity check → navigation-free Reader Viewer → Actual External Use event。

External-Use Decision、Delivery 和 actual use 永远不是同一条状态。

## 各页面的主要信息和操作

| 页面族 | 主要信息 | 主要操作 |
|---|---|---|
| Public | Outcome、机制、证据、价格、限制 | 检查证明、资格与账户入口 |
| Checkout | Order、条款、付款、Entitlement | 持久化步骤并安全恢复 |
| Banker Account | Deals、容量、账单、设置、数据控制 | 打开 Deal、修改账户设置、进入生命周期控制 |
| Setup / Preflight / Guide | Deal identity、stage、rights、confidentiality、output ceiling | 建立 Workspace、锁定处理边界、完成首个闭环 |
| Workspace collection | 精确对象、独立状态、版本和下一动作 | 搜索、过滤、打开 canonical object |
| Object detail | identity、properties、tabs、relationships、history | 检查精确 Source / Claim / Analysis / Buyer / Deliverable |
| Control Review | exact scope、evidence、options、impact、record | 记录 Human Decision 或 Process Event |
| Review / Readiness | QC、Impact、exact readiness 和 external posture | 解决 finding、检查阻断、进入授权或导出 |
| History / Lifecycle | append-only events、Archive、Reimport、Delete | 创建可移植包、归档/恢复、审查删除 |
| Recipient | exact authorization、identity、Reader Copy、expiry | 验证后只读查看，不下载/转发 |

## 关键状态

- `conflicted`、`decision required`、`mechanical failed / passed`。
- `recalculation / regeneration / re-review required`。
- `circulation blocked`、`not authorized`、`authorized with conditions`。
- `job running / failed / resumable / completed`。
- `not stage-required`，不误报为 missing 或 failed。
- `archived / restored / deletion queued`。
- `reauthentication required / Grant consumed / Grant missing or expired`。
- `recipient active / expired / revoked / unavailable`。
- `empty / loading / error / success` 均有非颜色表达和恢复路径。

## 响应式策略

- **≥1280px**：完整专业工作台；左侧域导航、中央工作区和右侧 Inspector 可并列。
- **1024–1279px**：域导航与 Inspector 进入开关/overlay，保留完整桌面动作。
- **<1024px**：依据正式 UX 边界提供检查与恢复，不宣称完整移动执行。Material Decision、Source upload、Stage transition、Internal Export creation 和 External authorization 回到桌面完成。
- 页面级容器、表格滚动区、长 ID/哈希、长英文文案和数字使用独立溢出策略；不允许整页横向滚动。

## 设计系统应用规则

- 唯一主设计系统：`tech-utility`。
- 冷白背景、白色工作面、细边框、高密度表格、系统无衬线与等宽数字。
- 单一绿色主动作；状态色只用于小面积 badge、border 和反馈，并始终配合文字/图标。
- 控件 6px、面板 8px、Dialog 10px；无泛滥的大圆角、渐变或阴影。
- 普通工作面无阴影；只在 popover、dialog、overlay 使用轻阴影。
- 一个视口同一任务只有一个 primary CTA；次级入口使用 secondary 或 text link。

## 文档、推断与未决问题

### 来自权威文档

- 五个隔离客户 surface、九个稳定工作域、对象/状态模型、完整业务流程来自 `CONTEXT.md`、已接受 ADR、IA、User Flow、UX Spec 与 Wireframes。
- 公开价格 `$995/month`、`$10,950/year paid upfront`、1 位 Individual Banker、2 个并发 Active Deal Workspaces 来自正式商业/UX 文档。
- Internal Export、External-Use Decision、Delivery 与 actual use 分离来自 ADR 0001 和正式 UX 文件。
- 桌面优先和小屏受限边界来自正式 UX Spec。

### 合理推断

- 用 React + TypeScript + Vite 作为 Open Design 运行容器；正式技术设计中的生产栈仍是 Next.js App Router。
- 对象 archetype 由少数共享组件实现，但保留路由、身份、状态和任务语义。
- 演示文件、时间、公司、买方、哈希和部分业务记录均为明确标注的合成数据。

### 仍未解决

- 正式品牌名称、Logo 与需法律或生产数据确认的最终英文文案。
- 生产组件库、真实 API / Job / Office / PDF / payment / identity provider 行为。
- 生产 Capability Manifest 的实时限制、provider profile 和实际合规证明。
- 生产认证、Passkey attestation、Grant 签发与 API 侧资源版本校验的具体实现。

## 原型验收标准

- `npm run build` 无 TypeScript 或 Vite 错误。
- 自动化测试覆盖核心控制闭环、Magic Link / Passkey、受限恢复、敏感动作 Grant、购买链、Recipient 隔离、搜索/空状态、表单错误和代表性正式路由。
- 所有文档 frame archetype 有明确 route/view 映射；无仅外观可点击的控件。
- 关键流程通过链接可完整操作，关键状态在页面间或刷新后可恢复。
- Internal Controlled Export 不等同于外部授权；授权不等同于 delivery 或 actual use。
- 所有真实业务值均不伪造；示例数据持续标记为合成演示。
- 1440×900 和 1280×800 的主要布局无明显遮挡、截断、整页横向溢出或不可达动作。
- 键盘焦点、表单标签、错误提示、非颜色状态、44px 点击区、表格和长内容通过检查。
- Open Design 根入口可以直接预览最新 production build。
