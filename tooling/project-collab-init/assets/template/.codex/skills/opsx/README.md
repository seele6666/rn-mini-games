# OPSX 四步入口

| 阶段 | 技能名称 |
|---|---|
| 探索 | `openspec-explore` |
| 提案 | `openspec-propose` |
| 实施 | `openspec-apply-change` |
| 归档 | `openspec-archive-change` |

实际技能由 OpenSpec CLI 在 `.agents/skills/` 生成和维护；以当前安装产生的名称和路径为准。Codex 可用 `$<技能名称>` 引用。此导航不能替代技能安装。

新项目采用 [project-workflow](../../../openspec/schemas/project-workflow/schema.yaml)；已有项目以实际合并后的配置为准。流程包含 brainstorm、proposal、specs、design、tasks，以及每条任务的一份 implementation 文档。

探索结论需要跨对话继续时保存到变更的 brainstorm.md。任务完成状态只写在 tasks.md。apply/archive 前在实际规划根目录运行 `node openspec/scripts/check-implementation-notes.mjs <change-name>`。

OpenSpec 管理制品、依赖和状态；实施方法按需使用 Superpowers，计划细节放回本流程对应文档。
