# 项目工作说明

## 项目范围

项目方向、技术栈、运行及测试命令以当前项目的 README 和依赖配置为准。初始化时根据实际项目补充本节，不从协作模板推断业务需求。

## 工作入口

- OpenSpec 实际技能：`.agents/skills/openspec-*/SKILL.md`，由 OpenSpec CLI 生成和维护。
- 协作与开发流程：[OPSX 导航](.codex/skills/opsx/README.md)。
- [Superpowers 入口](.codex/skills/superpowers/README.md)。
- [开发规范](.codex/skills/development-rules/README.md)。
- [项目记忆](.agents/skills/project-memory/SKILL.md)，数据入口为 [memory/index.md](memory/index.md)。
- [子代理评估](.agents/skills/project-delegation/SKILL.md)。

`.agents/skills/` 保存可发现的项目技能；`.codex/skills/` 只作分类导航。文件存在不代表 OpenSpec CLI、生成技能或 Superpowers 插件已安装。

## 每轮规范评估

主代理每个用户轮次开场展示一次两条简短评估，后续进度不重复：

```text
[x] 记忆评估：应用的编号与原因／无相关记忆／适用，需加载索引。
[x] 子代理评估：主窗口处理／委派内容，以及简短原因。
```

勾选表示已评估。新会话先读两项技能与记忆索引，再按范围读取有效条目；任务变化或文件更新时重新检查。文件数量只触发委派评估，是否委派仍取决于独立性与摘要收益。

主代理统一负责沟通、决策、整合、任务状态、项目记忆和最终验收。子代理不自行继续拆分，不写项目记忆，仅返回结论、证据和候选。仅主代理向用户展示两项评估。

记忆读取默认可用；自动维护当前项目 `memory/` 需目标项目用户明确授权。初始化代理应根据真实授权注明状态；源项目的授权不随模板迁移。普通记忆更新只改数据，技能流程按用户明确要求调整。

## OpenSpec 文档

- 正式行为：`openspec/specs/`。
- 进行中的变更：`openspec/changes/<change-name>/`；已归档变更：`openspec/changes/archive/`。
- 配置：`openspec/config.yaml`（已有项目也可能使用 `config.yml` 或外部 store）。以 CLI 解析出的实际根目录为准。
- 通用 schema：`openspec/schemas/project-workflow/schema.yaml`；已有项目按合并结果选择 schema，不自动替换原默认值。

通用制品顺序：brainstorm、proposal、specs、design、tasks、逐任务 implementation。`tasks.md` 是任务完成状态的唯一记录；每条任务恰有一份匹配的实施说明。

对采用 `project-workflow` 的变更，进入 apply/archive 前，从实际规划根目录运行；其他 schema 沿用其本身的检查要求：

```text
node openspec/scripts/check-implementation-notes.mjs <change-name>
```

OpenSpec 管理变更制品和任务状态；Superpowers 根据任务需要提供设计、调试、测试与验证方法。实施细节写入对应 implementation 文档，避免建立第二套任务完成状态。

当前用户明确要求优先于旧项目记忆；所有规则均遵守更高优先级指令和实际工具能力。
