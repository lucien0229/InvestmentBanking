# 2026-09-28 文档基线重启记录

用户通过 grilling 确认：保留完整设计文档和可复用配置，废弃旧原型、任务拆分及开发实现，清理本地和远端开发服务；保留原 Supabase 主项目、开发分支、Auth 用户与 passkey，仅清空开发业务结构和数据。本轮不开始新设计或开发。

## Git 与文档

- 新分支：`restart/document-baseline-20260928`，从 `9a9056f581adec601c54840b3b96cdda60430e71` 创建。
- 被废弃高保真 UI 的首个提交：`981b2387a701803c47fccd43dd31dedf71922bc6`。
- 旧 develop HEAD：`64975f333e6e6e1312c4883e8537341870bd5c2d`；保留为 `archive/pre-restart-20260928-164231`，原 develop 分支未改写。
- 原 tracked 修改另存为 Git stash，说明 `pre-restart tracked work 20260928-164231`；未跟踪文件、ignored 配置和工作目录另有仓库外完整备份。
- 保存当前 CONTEXT、产品 Spec、5 份 UX、7 份技术文档、43 份 ADR。12 份 Wayfinder 决策已转为普通历史产品决策，原实现 issues 与 DAG 不进入新基线。
- 两套原型的可执行代码、样式和构建入口均不进入新基线；历史设计文字和静态设计资料保留为明确退役的参考材料。
- 文档只调整分类、任务元数据和内部链接，没有重写产品要求；后续由用户优化。
- 未 push、未 force push、未创建 PR；其他工作树未改动。

## 开发环境清理

- 本地项目 Node 服务停止；5 个 Postgres 验收/开发容器及其 volume 已在备份后删除。
- 远端 33 个项目 Docker 运行/验收容器删除；6 份旧数据库 volume 原始内容已离线归档。
- 退役 `investmentbanking-office.service`、`investmentbanking-source.service`、`investmentbanking-source-signatures.timer`、`investmentbanking-source-signatures.service`。
- `ib-office` 用户级 Podman 残留运行进程已停止，linger 已关闭；没有残留 Podman 容器。11 个旧 Office 镜像、本地旧 Postgres 镜像及空闲项目网络已删除。
- 旧应用目录从 `/opt/cells/investmentbanking/dev` 移入同项目的退役目录。旧 `/opt/investmentbanking` 挂载点保留，其内容已归档并清空。
- 共享 Nginx 和 TLS 续期资产保留；仅开发域 app upstream 改为固定 503 暂停提示。19 个 SalesBrief 容器保留。
- GitHub `Database migrations` workflow 已手动禁用，旧 Secret 保留。Stripe 测试 Webhook 已 disabled，价格及支付资产保留。

## Supabase 验证

开发项目 `xuysyaxzcpntvvzsgkdy` 的 19 个业务 schema 共 280 张表已删除：`ai`、`analysis`、`app`、`archive`、`billing`、`commerce`、`deal`、`deletion`、`deliverable`、`external_use`、`identity`、`jobs`、`knowledge`、`measurement`、`notification`、`object_store`、`process`、`projection`、`source`。

整批事务最初遇到 `max_locks_per_transaction` 上限，事务完整回滚；随后按 schema 分批执行，每步比较 Auth、Storage 及平台对象指纹，任何变化都会令该步回滚。19 步均通过。

| 验证对象 | 清理前 | 清理后 |
|---|---:|---:|
| Auth 用户 | 6 | 6 |
| Passkey 注册记录 | 5 | 5 |
| 业务 schema | 19 | 0 |
| Storage buckets / objects | 0 / 0 | 0 / 0 |
| 旧 PGMQ 队列 | 1 | 0 |

完整 Auth 用户行指纹：`a56700307c4f06dee1d61ed8b8c9b626`；完整 passkey 行指纹：`5dc23a58c7bb89beed6ea28e7ffb098f`；前后一致，覆盖 ID 与用户绑定关系。此处 MD5 仅作同批数据一致性检查，不用于密码或安全签名。

旧迁移记录清空，仅保留本次最终退役操作记录 `retire_legacy_source_preserve_auth`。原数据库角色、密码和平台扩展保留。主项目 `bwwtzxfatsnqffbjndck` 未执行修改，主项目及开发分支仍 `ACTIVE_HEALTHY`。

旧业务账号到 Auth subject 的应用映射随业务 schema 删除；新实现需要重新建立应用自己的授权模型。保留 Auth 注册记录不等于存在可运行的新登录页面。

## 备份与恢复

本机保全目录：`/Users/wxm/Desktop/workspace/.investmentbanking-restart-backups/20260928-164231/`，目录权限 `0700`。

- `workspace-complete.tar.gz`：清理前完整工作区，含 Git、dirty/untracked/ignored 文件；已验证可读取。SHA-256：`7a57b63cb7b5086704e246f4c309ae272e00cb61ff72c771497f608fda285554`。
- `repository.bundle`：清理前所有 Git refs，已通过 `git bundle verify`。
- `working-files-before-switch/`：切换前全部工作文件的额外保全副本；tracked 修改同时保存于上述 stash 和最初完整压缩包。
- `config/`：服务器原始 env、证书、签名私钥、服务配置、Stripe 快照与整理后的本地配置。
- `databases/`：5 个本地数据库的 `pg_dumpall` 压缩文件。
- `documents/manifest.json`、`documents/validation.json`：设计文档逐项迁移与完整性记录。
- `inventory/`：服务清理结果、Auth 指纹、供应商状态和 GitHub 禁用证据。

远端保全目录：`/opt/cells/investmentbanking/retired-20260928-164231/`，权限 `0700`，包含旧运行目录、6 份数据库 volume 快照、服务定义与原 Nginx 配置。它们均不在有效部署入口。

恢复旧 Git 工作时，从外部压缩包解出到新的目录，或在独立工作树使用旧分支并应用已保存的 stash/patch；不要覆盖当前重启分支的文档优化。恢复旧服务属于新的部署操作，应先检查配置和数据结构。

开发 Supabase 业务数据按本次确认已废弃，没有创建可恢复的完整云数据库 dump；本地/远端验收数据库快照不是该云数据库的等价备份。Auth 和项目配置继续保管在原项目中。
