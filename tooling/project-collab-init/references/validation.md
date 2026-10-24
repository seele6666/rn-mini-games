# 验证记录

验证日期：2026-10-18。下述项目均为隔离测试目录，示例偏好和任务属于合成夹具，不是真实用户记忆。

## 文件与脚本

- Node.js v24.14.1：10 项自动检查通过，包含默认预览、空项目创建、重复执行、旧规则与记忆保留、YAML/YML 配置延后、文件类型冲突、链接目录拒绝、参数校验和任务说明的一一对应检查。
- 包内 Markdown 本地链接全部可解析，所有 JavaScript 模块通过语法检查。
- skill-creator 的 quick_validate.py：技能格式有效。
- PyYAML 6.0.3：UI 元数据、OpenSpec 配置和通用 schema 三份 YAML 均可解析。

## 真实 OpenSpec 接入

使用单独安装在验证目录的 OpenSpec 1.14.3；不修改应用依赖或用户全局工具。

在临时项目运行模板脚本和 `openspec init --tools codex --profile core`，原模板配置保持不变，生成 6 个 OpenSpec 技能。`schema validate project-workflow` 通过；context 指向测试项目；新测试变更采用 project-workflow，applyRequires 为 implementation，制品依赖包含六类文档。测试项目在结束时删除。

可复现命令见包根 README 的可选 smoke 检查。

## 独立代理试用

基线：只有源项目导航时，目标机器无法访问源项目就无法完成文件迁移，插件也不能靠导航安装。新包因此包含完整通用模板，并分别验收文件、CLI、插件和授权。

正向演练：独立代理只读取新技能包和合成 Python 目标项目，实际运行预览与创建并合并旧文件。目标原 AGENTS 业务约定、记忆 M-042、原默认 spec-driven 配置和进行中任务得到保留；通用 schema 作为可选新增，未把源项目授权带入目标。

演练发现复制的委派技能中任务说明检查缺少 schema 条件；已修正通用模板、AGENTS 和合并指南，限定于采用 project-workflow 的变更。其他工作流沿用原检查要求。

演练环境 PATH 缺少 OpenSpec CLI，故该目标的 CLI 生成技能接入属于部分完成；与前述独立的真实 CLI 检查分别记录。未宣称模拟项目业务测试或设备验收通过。
