# GitHub Actions 开发数据库配置

本文只配置开发环境。当前约定是：

- GitHub `develop` 分支 -> Supabase 持久化 `dev` 分支，项目 ref
  `xuysyaxzcpntvvzsgkdy`。
- GitHub `main` 分支 -> Supabase 主项目 `bwwtzxfatsnqffbjndck`，但生产自动迁移
  当前不启用，也不需要配置。

仓库当前公开分支列表只有 `main`。因此，在启用“合并到 `develop` 自动迁移”前，
还必须先在 GitHub 创建 `develop` 分支（从 `main` 当前版本分出），并把本次仓库
变更合并到该分支；否则工作流不会被自动触发。这个分支创建/推送属于 GitHub
外部写操作，本次没有擅自执行。

## 一次性配置

### 1. 获取开发数据库连接串

在 Supabase Dashboard 中：

1. 打开 `InvestmentBanking` 项目。
2. 选择 `dev` 分支。
3. 点击 **Connect**，选择 **Postgres**，优先复制 **Session pooler** 连接串。
4. 复制连接串，并确认它指向 `xuysyaxzcpntvvzsgkdy` 对应的开发数据库。

Session pooler 对 GitHub Actions 的 IPv4 runner 兼容性更好；只有确认 runner 可用
IPv6 时才改用 Direct connection。连接串中的密码必须保持 URL 编码（特殊字符不能
直接替换成未编码字符）。连接串只用于 GitHub Actions 的迁移作业。不要提交到仓库、不要写入
`.env`、不要粘贴到聊天窗口。若 Dashboard 没有现成密码，先在项目数据库设置中
重置/获取数据库密码，再重新生成连接串。

### 2. 建立 GitHub Environment

在仓库页面进入 **Settings -> Environments -> New environment**，创建名称精确为
`development`。

在 `development` Environment 下添加：

- **Environment secret** `SUPABASE_DB_URL`：填入上一步复制的开发数据库连接串。

本仓库的工作流直接使用 `supabase ... --db-url`，所以当前不需要额外配置
`SUPABASE_ACCESS_TOKEN`、`SUPABASE_PROJECT_ID` 或 `SUPABASE_DB_PASSWORD`；不要为了
“凑齐变量”而把这些凭据复制进仓库。

先不要设置 `SUPABASE_MIGRATIONS_ENABLED_DEV` 和
`SUPABASE_MIGRATION_BASELINE_CONFIRMED_DEV`，或者保持为空/`false`。
开发数据库当前存在“实际表结构”和“Supabase migration history”不完全一致的
情况，必须先完成一次人工审阅的基线/对账；在此之前，工作流只做校验，不会执行
远程迁移。

### 3. 配置完成后的检查

在 GitHub Actions 手动运行 **Database migrations** 前，先确认本次变更已经推送到
GitHub 的 `develop` 分支；然后选择：

- `environment`: `development`
- `dry_run`: `true`

预期结果：`Validate migrations` 通过；在 enable/baseline 仍为 false 时不会连接
远程数据库。不要把数据库连接串贴到日志或 issue 中。

## 基线确认后的启用

基线对账完成、并且已经审阅 `supabase migration list` 与 schema 差异后，再在
`development` Environment 同时添加/修改：

- `SUPABASE_MIGRATIONS_ENABLED_DEV=true`
- `SUPABASE_MIGRATION_BASELINE_CONFIRMED_DEV=true`

之后，合并到 `develop` 的每次发布会自动执行：校验迁移 -> dry-run -> 应用待执行
迁移。迁移成功是应用发布的前置条件；迁移失败时应用发布不会继续。

## 本次不配置的项目

- 不配置 `production` Environment、生产数据库 secret 或生产 baseline 变量。
- 不在开发服务器上保存 `SUPABASE_DB_URL`；该凭据只进入 GitHub Environment Secret。
- 不使用 `supabase/seed.sql` 对远程开发库做自动填充；seed 仅用于本地临时数据库。

完成开发 `SUPABASE_DB_URL` secret 配置、并准备好 `develop` 分支后，只需告知
“开发 secret 已配置”，不要发送 secret 内容；随后再进行开发分支的基线对账和首次
dry-run。
