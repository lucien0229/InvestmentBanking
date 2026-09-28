# 保留的配置资产

核对日期：2026-09-28。先追溯项目历史对话，再与当前服务器、Supabase、Stripe、Resend 和 GitHub 状态核对。本清单区分实际已保存的值、仍由供应商保管的值与尚未证实已配置的能力。

## 本地使用

- 仓库根目录 `.env` 保存当前可复用的真实配置，权限 `0600`，由 Git 忽略。新实现可通过 dotenv 读取；该文件本身不会部署服务或修改供应商设置。
- `.env.example` 仅列变量名，所有值留空，可提交 Git。
- `.local-secrets/` 保存证书、签名私钥和 8 份原始服务器环境文件；目录 `0700`、文件 `0600`，由 Git 忽略。
- `.env` 中数据库默认指向原开发 Supabase，Stripe 为测试模式。开发业务结构已经清空；连接配置可用不代表旧应用还能运行。
- 原环境文件中的 `RELEASE_ID`、容器 socket、内部服务地址和 `NODE_ENV` 属于旧运行环境参数。新代码启动时按自己的运行方式设置；原始值完整保留在 `.local-secrets/original-*.env`。

不要把整个 `.env` 作为浏览器配置公开。只有新应用明确需要的 publishable/public 项可以进入前端。

## 已保存并核对的资产

| 资产 | 当前事实 | 本地保管方式 |
|---|---|---|
| 开发服务器 | `root@152.53.90.227`；SSH 登录已验证；其他项目共用该服务器 | `DEV_SSH_HOST`、`DEV_SSH_USER`、`DEV_SSH_PASSWORD` |
| 域名 | Namecheap 管理 `aptoren.com`；开发域 `dev-banking.aptoren.com` 指向上述服务器 | `DEVELOPMENT_DOMAIN`、`PRODUCTION_DOMAIN`；DNS 记录见下文 |
| TLS | 开发域证书有效，当前到期日为 2026-12-08；远端证书和续期配置保留 | `.local-secrets/dev-fullchain.pem`、`dev-privkey.pem`，对应 `TLS_*_FILE` |
| Supabase | 主项目 `bwwtzxfatsnqffbjndck`；开发 ref `xuysyaxzcpntvvzsgkdy`；区域 `us-east-1`；两者健康 | `SUPABASE_*`、`NEXT_PUBLIC_SUPABASE_*` |
| 开发分支 | ID `4b51feeb-a8fd-4aef-8fa4-a1233d4fcca5`，当前 `persistent=false`，保留原属性 | `SUPABASE_DEV_BRANCH_ID` |
| 数据库运行账号 | 原 app、dispatcher、reference/source/workbook worker 账号与密码保留；app 连接已使用证书校验重新验证 | `DATABASE_URL`、`JOB_DISPATCHER_DATABASE_URL`、`REFERENCE_WORKER_DATABASE_URL`、`SOURCE_WORKER_DATABASE_URL`、`WORKBOOK_WORKER_DATABASE_URL` |
| 数据库 CA | 当前服务器使用的 CA 链已复制并用于连接验证 | `.local-secrets/supabase-chain.pem`，`DATABASE_SSL_CA_FILE` |
| Supabase Auth | 6 个用户及 5 个 passkey 原记录保留，完整行指纹前后相同 | 继续由同一开发 Supabase 的 `auth` schema 保管 |
| Stripe | 原测试账户、6 个有效价格及产品保留；旧接收端暂停期间 Webhook 已禁用 | `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_*` 及 endpoint 元数据 |
| HelloX | 服务器当前 URL、API key、模型和推理参数已保存；本次没有发起付费推理 | `HELLOX_BASE_URL`、`HELLOX_API_KEY`、`HELLOX_MODEL`、`HELLOX_REASONING_EFFORT` |
| AI 受保护数据密钥 | 原服务器使用的加密配置已保存 | `AI_RUN_PROTECTED_KEY` |
| Artifact 签名 | 原 Ed25519 私钥与 key version 保留 | `.local-secrets/artifact-ed25519.pem`、`ARTIFACT_SIGNER_PRIVATE_KEY`、`ARTIFACT_SIGNER_KEY_VERSION` |
| Resend | 开发和生产邮件域均 verified、发送启用、接收关闭、打开/点击跟踪关闭 | `RESEND_*_DOMAIN_ID`、`SMTP_*`；供应商原配置不变 |
| GitHub 自动迁移 | `Database migrations` workflow 已手动禁用，页面已复核；原 Secrets 保留 | 云端继续保管，旧 workflow 不再执行 |

`.env` 保留 worker 账号时使用不同变量名，避免多个原始 `JOB_WORKER_DATABASE_URL` 互相覆盖。

## Auth、Passkey 与供应商保管的配置

已通过当前控制台核对开发 Auth Site URL 为 `https://dev-banking.aptoren.com`，redirect allowlist 包含 `https://dev-banking.aptoren.com/**`。历史资料提到的 localhost allowlist 本次未确认，不能当作已配置。

历史确认的 passkey RP ID 为 `dev-banking.aptoren.com`，origin 为 `https://dev-banking.aptoren.com`；对应变量已登记。Passkey 的注册记录及绑定关系保存在原 Supabase，不能通过复制 `.env` 重建。此次没有更改 Auth、RP、Session、SMTP 或邮件模板设置。

以下值没有从供应商重新导出，因此 `.env` 明确留空；留空不是丢失，也不应据此重置或轮换原配置：

| 变量 | 当前保管源及边界 |
|---|---|
| `SUPABASE_DB_URL` | GitHub `development` Environment 的迁移 Secret；界面不提供原 Secret 的反向读取。旧文档明确它没有放入 VPS runtime。新开发需要管理级 SQL 时可继续使用已连接的 Supabase 工具。 |
| `SMTP_PASSWORD` | Supabase Custom SMTP / Resend 原发送密钥。Resend 列表只返回名称、ID 和创建时间，不能重新导出 secret。 |
| `SUPABASE_ACCESS_TOKEN` | 未找到该项目已保存的个人管理 token，不将工具连接误写成可复用 token。 |

开发 SMTP key：`investment-banking-dev-smtp`，ID `7d3e2b12-8cbc-4022-891d-b15c6428f786`；生产 SMTP key：`investment-banking-prod-smtp`，ID `f1ef1e28-5201-448c-acc6-539c6052faaa`。二者元数据当前仍存在。SMTP 历史配置为 `smtp.resend.com:465`、用户 `resend`，开发发件人为 `no-reply@dev-banking.aptoren.com`。

锁屏中断了后续 Session、Passkey 和 SMTP 控制台字段的逐项导出。本次保持这些云端设置原样，现有登录配置的保全依据为同项目保留、Auth 数据及平台对象不变；不声称已经把完整 Supabase Auth 配置复制进本地文件。

## Stripe 测试资产

账户 `acct_1UAPgD2SUlTvcsKt`；当前 endpoint `we_1UCIH42SUlTvcsKtYIz5BEl7`，URL `https://dev-banking.aptoren.com/webhooks/stripe`，订阅 `checkout.session.completed`，此次状态改为 disabled。重新接入新实现前应先实现并验证签名处理，再启用这个 endpoint；原 signing secret 已保留。

| 配置变量 | Price ID | USD 价格 |
|---|---|---|
| `STRIPE_PRICE_MONTHLY` | `price_1UAPpY2SUlTvcsKt46AEkrZl` | 995/月 |
| `STRIPE_PRICE_ANNUAL` | `price_1UAPpZ2SUlTvcsKtDkIbTCqa` | 10,950/年 |
| `STRIPE_PRICE_ADDITIONAL_ACTIVE_DEAL_MONTHLY` | `price_1UAPpZ2SUlTvcsKtIddGC6pf` | 500/月 |
| `STRIPE_PRICE_ADDITIONAL_ACTIVE_DEAL_ANNUAL` | `price_1UAPpa2SUlTvcsKtFQfYQNp3` | 5,500/年 |
| `STRIPE_PRICE_INTENSIVE_PROCESSING` | `price_1UAPpb2SUlTvcsKtxaAclUpq` | 1,000/次 |
| `STRIPE_PRICE_ARCHIVE_CAPACITY_MONTHLY` | `price_1UAPpb2SUlTvcsKt1I57Sx5b` | 50/月 |

以上价格均通过当前 API 确认 active 且 `livemode=false`。客户、订阅和支付历史没有删除。历史对话证明 9 月 5 日完成过自动 Webhook 闭环，但不据此宣称完整订阅生命周期已经实现。

## DNS 与邮件域

开发 Resend domain ID 为 `cc17392e-0ec3-41cd-a867-26d4e522e1e7`，生产为 `0273543e-dd35-45be-a96c-20751e876fe7`。完整 DKIM/SPF/MX 当前记录随供应商快照保存到仓库外备份 `inventory/cloud-final.json`。

- `send.dev-banking` 与 `send.banking` 的 MX：`feedback-smtp.us-east-1.amazonses.com`，priority 10。
- 同名 SPF TXT：`v=spf1 include:amazonses.com ~all`。
- DKIM TXT 分别位于 `resend._domainkey.dev-banking`、`resend._domainkey.banking`，均 verified。
- 生产邮件域验证成功不代表生产 Web 站点已配置。本次未观察到 `banking.aptoren.com` 的 Web A/AAAA 记录。

## 不能登记为已配置的能力

当前没有 Resend Webhook；专用业务通知链路没有完整配置证明。Aspose 许可、Microsoft 365/Windows 验收环境、Google Cloud KMS、独立 Audit signing key 和完整灾备恢复演练均未找到足够已配置证据。旧开发 Office 使用 LibreOffice 的 `development_foss_v1`，相关服务已退役。

## 历史来源范围

按项目关联对话追溯：约 210 条重启之前的历史对话，覆盖 user/assistant 消息；对 Auth、Ticket03、Ticket07、Ticket12、域重构和总体审核等重点对话进一步核对工具证据。不是逐行审计所有对话的全部工具输出。

重点来源 thread IDs：`01a03bf6-e4ad-7e60-9328-6c3a42dc8ca9`、`01a04165-01bb-7e73-90c5-505331674c41`、`01a05b82-602d-7550-8128-c1ae1ff1ce53`、`01a06f1e-778d-7060-8ff3-4daffae5da9d`、`01a065f1-5bce-79c1-8f53-03bfd08c23c2`、`01a081bb-7820-7520-8e99-12a1765d99bd`、`01a08953-9591-7ac3-97f2-5d4b3fc7a507`。服务器访问线索来自 `01a086cc-e115-7433-89d7-895e6b6e539b`，实际配置以本次服务器读取值为准。
