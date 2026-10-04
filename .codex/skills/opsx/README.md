# OPSX 四步流程入口

这里按工作阶段整理入口；完整、可执行的技能指令由 OpenSpec 维护在 `.agents/skills/`。本项目的制品顺序和模板由 [`rn-2048-workflow`](../../../openspec/schemas/rn-2048-workflow/schema.yaml) 定义。

| 阶段 | 入口 | Codex 技能名称 |
| --- | --- | --- |
| Explore | [探索](explore/README.md) | `openspec-explore` |
| Propose | [提案](propose/README.md) | `openspec-propose` |
| Apply | [实施](apply/README.md) | `openspec-apply-change` |
| Archive | [归档](archive/README.md) | `openspec-archive-change` |

在支持 `$` 技能引用的入口中使用 `$<技能名称>`，也可直接要求使用对应技能。

不要在本目录另存或修改生成技能的副本；后续刷新由 `openspec update` 处理。已有的 sync 和 update 技能保留在原位置。

Propose 将为每个变更准备 `brainstorm.md`、`proposal.md`、能力规格、`design.md`、`tasks.md`，以及 `implementation/` 下与每条任务一一对应的实施说明。任务进度只记录在 `tasks.md`。

Explore 阶段默认是讨论；跨对话继续前先把结论保存到变更的 `brainstorm.md`，或在新对话提供探索摘要。

进入 Apply 或 Archive 前，运行 `node openspec/scripts/check-implementation-notes.mjs <change-name>`，检查任务与实施文档是否一一对应。
