# 项目工作说明

## 项目方向

使用 Expo、React Native 和 TypeScript 开发个人 Android 小游戏合集，首版是经典 2048。首版变更已归档至 `openspec/changes/archive/2026-10-04-add-game-hub-2048/`；正式行为规格以 `openspec/specs/` 为准，首版设计和任务记录保留在归档目录。Android 真机验证与独立 APK 验收需要实际设备与构建记录。

## 工作入口

- OpenSpec 实际技能：`.agents/skills/openspec-*/SKILL.md`。
- 四步 OPSX 导航：`.codex/skills/opsx/README.md`。
- Superpowers 插件技能入口：`.codex/skills/superpowers/README.md`。
- 用户开发规范：[分类导航](.codex/skills/development-rules/README.md)。
- 子代理评估：[project-delegation](.agents/skills/project-delegation/SKILL.md)。
- 项目记忆：[project-memory](.agents/skills/project-memory/SKILL.md)；数据入口为 [memory/index.md](memory/index.md)。

`.codex/skills/` 在本项目中是分类导航目录，不替代 `.agents/skills/` 的技能发现机制。

## 每轮规范评估

主代理每个用户轮次开始时，必须评估是否应用项目记忆、是否需要委派，并展示一次两条简短勾选；后续进度更新不重复展示。例如：

```text
[x] 记忆评估：应用 M-001，本轮展示两项评估。
[x] 子代理评估：主窗口处理，修改少且相互依赖。
```

勾选表示已评估；无需应用或委派时明确注明。尚未读取记忆时说明“适用，需加载索引”，不能声称已经应用某条记录。

新会话首次读取两项技能及记忆索引，随后按任务读取相关有效条目。后续复用已加载规范，任务变化或文件更新时重新检查。评估遵循两项技能的条件与模板；文件数量触发评估，委派还须判断独立性和摘要收益。

用户已授权主代理按记忆技能的条件自动维护项目根目录 `memory/`，无需逐条重新确认；写入须遵守当前模式和权限。子代理只返回结论、证据和候选，不写项目记忆，不自行继续拆分；主代理统一核验和整合任务状态。仅主代理向用户展示本节评估。

这些是项目默认工作规范；用户明确调整后按最新适用要求执行，同时遵守更高优先级指令。记忆仅作用于本项目，流程调整按用户明确要求进行。

## OpenSpec 文档位置

- 进行中的变更：`openspec/changes/<change-name>/`。
- 已归档变更：`openspec/changes/archive/`。
- 正式规格：`openspec/specs/`。
- 项目配置：`openspec/config.yaml`；默认 schema 为 `openspec/schemas/rn-2048-workflow/schema.yaml`。

新变更按该 schema 生成 brainstorm、proposal、specs、design、tasks 和逐任务 implementation 文档。`tasks.md` 是任务完成状态的唯一记录。用户以后提出游戏内容时，再按流程填写具体制品。

进入 apply 或 archive 前，从项目根目录运行 `node openspec/scripts/check-implementation-notes.mjs <change-name>`。OpenSpec 对 `implementation/*.md` 只检查是否有文件，这个脚本负责检查每条任务是否恰有一份对应文档。

保留 OpenSpec 生成的技能，避免维护重复副本。用户明确限定为目录整理时，只处理目录和说明文件；游戏内容按后续请求推进。
