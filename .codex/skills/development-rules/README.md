# 用户开发规范

本目录导航用户提出的开发规范，例如协作、记忆、命名、测试和提交约定。实际技能保存在项目 `.agents/skills/` 中。

## 已接入规范

| 入口 | 用途 |
|---|---|
| [project-delegation](../../../.agents/skills/project-delegation/SKILL.md) | 每轮评估委派收益，明确派发范围、并发上限和返回结构 |
| [project-memory](../../../.agents/skills/project-memory/SKILL.md) | 每轮评估记忆适用性，沉淀长期要求、重复偏好并处理替代 |
| [项目记忆索引](../../../memory/index.md) | 查看有效记忆与相关数据入口 |
| [项目工作说明](../../../AGENTS.md) | 查看两项评估的开场约定及 OpenSpec 入口 |

## 后续规范

- 普通规范可先保存为 Markdown 文档，并从根目录 `AGENTS.md` 添加入口。
- 需要作为 Codex 可发现的自定义技能时，在项目 `.agents/skills/<skill-name>/SKILL.md` 中定义，并在这里记录链接。
- 本目录中的普通文档不会因为放在 `.codex/skills/` 下就自动成为可调用技能。

项目已使用 Expo、React Native 和 TypeScript 开发个人 Android 小游戏合集，经典 2048 首版已归档。正式游戏行为见 `openspec/specs/`；本目录只维护规范导航。
