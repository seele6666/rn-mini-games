---
name: project-collab-init
description: Use when a user wants to initialize or migrate reusable OpenSpec, Superpowers, project memory, and parent-child agent collaboration conventions into a new or existing project.
---

# 项目协作初始化

为当前目标项目接入协作基础设施。模板自包含于 `assets/template/`，无需访问任何参考项目。业务需求、旧任务、旧记忆与插件缓存不在模板内。

## 使用流程

1. 确认目标项目根目录，读取其 AGENTS.md、相关技能、记忆索引、OpenSpec 配置及版本控制状态。技术栈和命令来自目标项目，已有用户要求与已授权操作继续有效。
2. 读取 [接入与合并说明](references/adoption.md)。区分新项目、已有本地 OpenSpec、外部 store；记录真实的记忆写入授权与依赖状态。
3. 用技能目录下脚本预览，命令中的技能路径由当前技能位置解析：

   ```text
   node <skill-dir>/scripts/init-project.mjs --target <project-root>
   ```

4. 用户已要求初始化即授权常规项目文件接入，无需为预览后的普通写入重复确认。在相同命令末尾加 `--write` 创建缺失文件。脚本只复制文件，不安装依赖、不合并旧文件。退出码 `3` 表示有文件需合并或已有 OpenSpec 配置需处理；不是完整成功。按接入说明逐项处理 `review` 与 `deferred`，保留已有业务、历史、编号、来源和当前工作区改动。
5. 依据实际项目补充 AGENTS.md，并记录记忆写入授权。源项目授权不能迁移；目标用户已明确授权时直接沿用。按当前 CLI 帮助接入 OpenSpec 生成技能，核实会话是否有 Superpowers 和子代理工具。缺少依赖时，完成不受影响的部分并准确报告待办。
6. 执行接入说明中的验收。交付修改文件、合并决策、真实验证结果及尚未完成的依赖。模板落盘、CLI 接入、插件可用与记忆授权分别报告。

## 调用示例

> 使用 $project-collab-init 为当前 Python 项目接入协作规范，保留已有 AGENTS.md、记忆和 OpenSpec 工作流；我授权按此机制自动维护当前项目的 memory/。

## 模板维护

维护模板时运行 `node --test <skill-dir>/tests/*.test.mjs`，并在隔离目录试用。完整目录可安装为用户级技能或作为模板包分发，见 [安装与使用](README.md)。OpenSpec 生成技能与 Superpowers 插件仍由各自工具管理。
