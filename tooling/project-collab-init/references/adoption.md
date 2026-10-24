# 接入与合并

## 模板内容

| 位置 | 用途 |
|---|---|
| AGENTS.md | 当前项目说明、入口、每轮两项评估、权威文档与职责 |
| .agents/skills/project-memory/ | 项目记忆规则和条目模板 |
| .agents/skills/project-delegation/ | 委派评估、并发边界和派发模板 |
| memory/ | 空白索引、长期要求与候选；不预置旧编号或来源 |
| .codex/skills/ | OPSX、Superpowers 与开发规范的分类导航 |
| openspec/schemas/project-workflow/ | brainstorm → proposal → specs → design → tasks → implementation 及六份模板 |
| openspec/scripts/check-implementation-notes.mjs | tasks.md 与实施说明的一一对应校验 |
| openspec/config.yaml | 仅供新项目采用的通用默认 schema 与校验指引 |

模板没有业务规格、进行中任务、归档、应用依赖或 OpenSpec 生成技能。

## 脚本契约

需要 Node.js，使用内置模块，不需要 npm 安装本技能依赖。

```text
node <skill-dir>/scripts/init-project.mjs --target <project-root>
node <skill-dir>/scripts/init-project.mjs --target <project-root> --write
```

目标目录必须已经存在。默认预览只输出 JSON；`--write` 仅创建缺失文件，同内容文件保持不变，不同内容文件列为 `review`。全量路径预检在写入前完成，链接、junction 和类型冲突不会被当成普通输出目录。

退出码：`0` 文件操作完成且无需合并，`1` 文件或路径错误，`2` 参数错误，`3` 需人工或代理合并。`dependenciesVerified: false` 始终表示脚本未验收外部工具。中途发生环境或权限错误时可能已有部分缺失文件创建，检查报告与文件后再安全重跑；脚本不回滚原项目文件。

目标已有 config.yaml 或 config.yml 时，除与本模板 config.yaml 完全一致且没有 config.yml 的情况，所有 openspec/ 模板标记为 `deferred`，由代理确定正确规划位置后逐项接入。

## 合并决策

- **AGENTS.md**：先保留原项目说明及命令，合并适用的两项开场评估与入口。已有同义规则更新原位置，避免重复附加。若 AGENTS.override.md 或子目录规范实际覆盖根规范，检查生效链并在适用入口合并。补充的项目事实来自实际文件。
- **记忆**：保留原条目、编号、来源、候选和替代关系。已有记忆结构不必强行重排；明确入口或做有来源的迁移，并更新索引。初始化模板不是旧用户来源。仅当用户在目标项目明确授权自动维护 memory/ 才启用自动写入；已有授权无需重问，只有读取授权则保留只读状态并说明。只写协作机制本身不等于可以编造偏好条目。
- **自定义技能**：比较已有 project-memory/project-delegation，保留目标项目明确调整，合并真正缺失的约定。每轮展示只由主代理完成；子代理只读为默认，写入范围明确且互不重叠，任务树最多同时两个子代理；工具不可用时由主代理完成。
- **已有本地 OpenSpec**：先运行 `openspec list --json` 和 `openspec context --json`，以解析的 root.path 为准。读取配置、已有 schema 和变更元数据。增量放入通用 schema、模板和检查脚本，默认保留原 schema；新变更可显式选择 `--schema project-workflow`。只有用户已要求切换默认流程时才修改 schema 字段，保留 context/rules/operations 等已有字段；更新对应导航。AGENTS、导航和子代理技能中的实施说明检查只作用于采用该通用 schema 的变更，不把旧工作流变成新任务。已有任务不被本次接入改写。
- **外部 store**：解析目标项目声明的 store；存在注册店铺时按实际 CLI 要求带上 `--store`。解析失败就报告准确的缺失项；不在代码项目里另建本地规划目录，也不写外部 store 来绕过访问限制。需要把通用 schema 和校验脚本接入实际规划根目录时，确认该位置属于当前授权范围。导航准确反映最终位置。
- **只有 openspec/ 而无配置**：先用 CLI 确认其是否已有项目与变更，保留现有内容；不要将“配置缺失”推断为业务历史为空。
- **新项目**：用户的初始化请求已授权创建协作目录。落盘通用配置后，在目标根目录按当前 CLI 帮助运行 Codex 集成初始化，检查实际产生的文件，不生成虚构业务变更。

## 外部工具

1. 检查 `openspec --version`、`openspec init --help`、`openspec update --help`。若不存在，可按目标项目已有安装方式安装，或先完成模板并报告 CLI 待接入；不要把源项目的 package.json、node_modules 或锁文件复制到目标。Python 等项目不需要因为本技能而变成应用层 Node 项目。
2. 官方 Codex 入口为 `openspec init --tools codex`，维护生成文件使用当前 CLI 的 update/init。运行前检查项目的旧 commands、AGENTS 标记块及用户目录旧 opsx 提示文件：CLI 可能清理旧集成。存在会被移除的内容时先列出具体内容并取得所需授权；普通新增或已经授权的刷新不重复申请。不要自行复制和维护旧生成技能，运行后以实际输出为准。
3. 通过会话的技能列表确认 Superpowers。导航存在不代表插件可用；缺失时按当前环境的插件管理入口处理，不复制缓存、固定模型名或本机路径。若本轮无法完成安装，交付中标记待安装。
4. 父子代理规则以实际工具和更高优先级指令为边界，模板不会开启不存在的工具或改变沙箱权限。无需为接入规则擅自修改用户全局配置。

参考：

- [OpenSpec 官方安装说明](https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md)
- [OpenSpec 支持的工具](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md)
- [Codex 技能文档](https://learn.chatgpt.com/docs/build-skills)
- [Codex AGENTS.md 文档](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

## 验收

1. 检查实际生效的 AGENTS 入口、链接、两项技能与引用模板，确认没有源项目业务、绝对路径、旧来源和未经确认的授权。
2. 比较修改前后：现有业务、记忆和进行中任务保留，配置只发生约定的合并。脚本的 `review/deferred` 每项都有明确处理结果；故意保留差异不必追求模板全文一致。
3. CLI 可用时：`openspec context --json`、`openspec schemas --json`（带实际需要的 store 参数），确认通用 schema 被实际规划位置发现。检查生成技能存在，并与本轮工具列表区分；需要新会话才发现时如实说明。
4. 在隔离测试项目中验证任务检查器：一任务一文档通过，缺失、重复和多余文档拒绝。不要把假业务变更留在真实目标项目。
5. 分别报告：文件与规则接入、OpenSpec CLI 和生成技能、Superpowers 可用性、子代理工具与记忆写入授权。缺失依赖时报告“部分接入”，不声称完整可用。
