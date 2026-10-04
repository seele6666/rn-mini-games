# 项目工作说明

## 项目方向

使用 Expo、React Native 和 TypeScript 开发个人 Android 小游戏合集，首版是经典 2048。当前变更为 `add-game-hub-2048`；需求、设计和任务以该变更的 OpenSpec 文档为准。Android 真机验证与独立 APK 验收需要实际设备与构建记录。

## 工作入口

- OpenSpec 实际技能：`.agents/skills/openspec-*/SKILL.md`。
- 四步 OPSX 导航：`.codex/skills/opsx/README.md`。
- Superpowers 插件技能入口：`.codex/skills/superpowers/README.md`。
- 用户开发规范：`.codex/skills/development-rules/README.md`；目前仅为预留位置。

`.codex/skills/` 在本项目中是分类导航目录，不替代 `.agents/skills/` 的技能发现机制。

## OpenSpec 文档位置

- 进行中的变更：`openspec/changes/<change-name>/`。
- 已归档变更：`openspec/changes/archive/`。
- 正式规格：`openspec/specs/`。
- 项目配置：`openspec/config.yaml`；默认 schema 为 `openspec/schemas/rn-2048-workflow/schema.yaml`。

新变更按该 schema 生成 brainstorm、proposal、specs、design、tasks 和逐任务 implementation 文档。`tasks.md` 是任务完成状态的唯一记录。用户以后提出游戏内容时，再按流程填写具体制品。

进入 apply 或 archive 前，从项目根目录运行 `node openspec/scripts/check-implementation-notes.mjs <change-name>`。OpenSpec 对 `implementation/*.md` 只检查是否有文件，这个脚本负责检查每条任务是否恰有一份对应文档。

保留 OpenSpec 生成的技能，避免维护重复副本。用户明确限定为目录整理时，只处理目录和说明文件；游戏内容按后续请求推进。
