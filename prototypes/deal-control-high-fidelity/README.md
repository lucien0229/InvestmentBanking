# Deal Control · 受控卖方拍卖执行工作台

## Design status

- **Status:** Confirmed Prototype Design
- **Version:** Prototype Design v1.0
- **Confirmed on:** 2026-08-09
- **Confirmed by:** Product Founder
- **OpenDesign project:** `fa5ba593-3875-442a-87a9-1807527b2bbb`

This prototype is the confirmed design reference for implementation. It remains subordinate to the confirmed Product Specification, `CONTEXT.md`, accepted ADRs, UX documentation, and technical contracts. It does not represent production readiness, final brand or legal-copy approval, live-integration acceptance, or release approval.

基于 InvestmentBanking 权威产品文档制作的多页面、高保真 React 原型。它完整呈现从公开发现、资格与购买，到 Banker Account、Deal Setup、九个工作域、受控交付、外部授权和 Recipient Access 的产品边界。

所有公司、金额、时间、文件、买方、哈希与交易记录均为 **Project Northstar 合成演示数据**。

V1 正式产品界面采用 **English-only**：公开页面、账户与 Checkout、Deal Workspace、Recipient Surface、表单验证、空/加载/错误/成功状态、辅助文本与无障碍标签均使用英文。中文仅保留在内部设计与交付文档中，不提供运行时语言切换。

## 直接预览

- 本地开发入口：`http://127.0.0.1:4173/app-shell.html`

```bash
npm ci
npm run dev
```

生产构建与本地预览：

```bash
npm run build
npm run preview
```

根 `index.html` 是 Open Design 的轻量 production 入口，加载 `dist/` 中固定命名、无外部模块导入的 CSS 和 JavaScript；`app-shell.html` 是 Vite 开发入口。界面、状态、数据和样式仍保留在拆分的 React/TypeScript 源码中。

## 已完成的产品范围

- 公开产品面：Outcome、Project Northstar proof、机制、安全与数据使用、定价、资格检查和资源页。
- 购买与账户：Magic Link 首次验证、Passkey 注册/登录、内容隔离的 Security Recovery Session、Checkout、Entitlement、Deals、计划、账单、通知、安全、数据出口与帮助。
- Deal 建立：Create Deal、Paid Preflight、First Deal Guide 与首个受控闭环完成页。
- 九个工作域：Overview、Action Center、Sources、Evidence & Decisions、Analysis、Auction Process、Execution Package、Review & Readiness、History & Portability。
- 专业对象：Source Record、Source Packet、Claim、Analysis、Buyer、Deliverable、Durable Job、Revision / parity / reimport comparison。
- 高风险控制：Human Decision、Stage Transition、QC、Impact、Package Readiness、Internal Export、External-Use Decision、Authorized Delivery、Archive、Lifecycle 与 Deletion；文档定义的敏感动作使用 5 分钟新鲜 Passkey 与单次 Sensitive Action Grant。
- Recipient Access：身份检查、导航隔离的精确 Revision Viewer 与不可用状态。

完整 frame-to-route 对照见 [`page-coverage.md`](./page-coverage.md)，产品结构和验收口径见 [`prototype-brief.md`](./prototype-brief.md)。

## 推荐演示路径

### 1. 第一条受控价值闭环

`Overview → Evidence & Decisions → Control Review → Analysis → Impact → Review & Readiness → Internal Controlled Export → History & Portability`

这条路径保留 Source Evidence、Human Decision、确定性校验、Revision、Review/QC 和 Export Receipt 的独立身份；Internal Export 不会被误写为外部授权。

### 2. 外部使用闭环

`QC Finding → Package Readiness → External-Use Decision → Authorized Delivery → Recipient Access → Actual Use event`

授权、交付和实际使用始终是三条不同记录，Recipient Viewer 不显示 Deal 工作区导航。

### 3. 购买并建立第一个 Deal

`Outcome → Qualification → Magic Link → Passkey registration → Order → Terms → Payment → Entitlement → Create Deal → Paid Preflight → First Deal Guide`

Checkout checkpoint 与原型状态保存在浏览器 `localStorage`；账号菜单和 History 页可以重置合成演示状态。

## 交互、状态与可访问性

- 空状态：Deals、Sources、Action Center、History 与 Buyer 搜索均提供可恢复路径。
- 加载状态：HTML 入口提供静态装载反馈；Analysis、Source 解析和 Durable Job 使用带文字的非颜色状态。
- 错误状态：表单错误绑定到字段与摘要；Source 解析、Job、Checkout 恢复、Passkey 会话失效、缺失的 Sensitive Action 与未知路由均提供最小安全恢复动作。
- 按钮状态：primary、secondary、danger、disabled、busy、hover、active 与 `:focus-visible` 均有明确反馈，状态变化不降低文字对比。
- 键盘：原生链接承担导航；行动、历史和对象详情 tabs 支持方向键、Home、End，并关联精确 tabpanel；小屏工作域抽屉关闭时不会进入 Tab 顺序，打开后可用 Escape 关闭并将焦点返回触发按钮。
- 跳转：公开面、Banker Account、Deal Workspace 与 Recipient Surface 均有唯一的“跳到主要内容”入口。
- 长内容：ID、哈希、文件名、表格和 tabs 使用局部换行或局部横向滚动，不制造整页横向滚动。

## 响应式边界

- **≥1280px**：完整专业工作台，可并列显示工作域导航、主工作区和 Inspector。
- **1024–1279px**：工作域导航和 Inspector 改为 overlay，保留完整桌面动作。
- **<1024px**：公开站点导航与详情 tabs 使用局部横向滚动；材料 Decision、Source upload、Stage transition、Internal Export creation 与 External authorization 按正式 UX 边界提示回到桌面完成。

移动端是受限检查模式，不宣称完整移动执行体验。

## 已完成验证

| 检查 | 结果 |
|---|---|
| `npm run build` | TypeScript 与 Vite production build 通过 |
| `npm test` | 30 项交互回归通过，覆盖核心控制闭环、Magic Link / Passkey、受限恢复、5 分钟单次 Sensitive Action Grant、Account/Deal 删除、取消/缺失/过期动作恢复、Recipient 隔离、搜索恢复、字段错误、小屏抽屉键盘恢复、详情 tabs 和正式深链 |
| 依赖 | `npm audit` 为 0 个已知漏洞 |
| 静态完整性 | 无模板占位、Lorem Ipsum、Emoji 功能图标、`scrollIntoView` 或 CSS raw hex；所有顶层 section 均有 `data-od-id` |
| 导航与动作 | 导航使用真实 `href`；交互按钮均有事件、表单、Dialog 或状态目标 |
| Open Design | 根入口和 production 资产链可加载；1440px 桌面长页渲染成功 |

## 原型边界

正式技术设计指定 Next.js App Router、React 与 TypeScript。本项目使用 Vite 作为 Open Design 原型容器，不连接真实身份、支付、上传、AI、Office/PDF、授权、审计、删除或持久化后端。

正式品牌名称、Logo、生产组件库和实时 Capability Manifest 仍待生产阶段确认。英文界面基线已按 V1 文档落地；身份原型遵循 Supabase Auth、Magic Link 首次验证/受限恢复、Passkey 必需和单一 Banker Session 的产品合同，但不连接真实认证后端。后续 copy review 只处理术语、法律文本与生产数据接入，不再讨论中英版本分支。视觉系统继续使用项目已锁定的 `tech-utility`（冷白工作面、细边框、紧凑表格、Inter / 系统字体、等宽数字与单一绿色主动作）。

Open Design 长页图片导出器会在分段拼接时重复 sticky header；浏览器预览中的 DOM 仍只有一个 header。1440px 已完成成品渲染，1280px 依据现有断点与局部溢出规则完成静态布局检查，未执行第二次图像导出。
