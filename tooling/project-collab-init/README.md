# 项目协作初始化包

包含 `project-collab-init` 技能、独立通用模板与创建缺失文件的 Node.js 脚本。模板已去除参考项目的业务、旧记忆和本机路径。

## 安装技能

把整个 `project-collab-init` 文件夹放到 Codex 的用户级技能目录：通常为 `~/.codex/skills/`（自定义 CODEX_HOME 时使用其 skills/）；也可按 Codex 当前文档使用 `~/.agents/skills/`，选择一处即可。不要把同名技能装到多个位置。

若已有同名技能，先比较或备份再合并，不覆盖本地修改。跨电脑时复制此完整目录或解压同名压缩包即可；无需复制原项目。

新会话中调用：

```text
使用 $project-collab-init 为当前项目接入 OpenSpec、Superpowers、项目记忆和父子代理协作规范。
```

需要自动沉淀项目记忆时补充：

```text
我授权按此机制自动维护当前项目的 memory/。
```

技能未出现在当前会话时，重新打开目标项目的新聊天；也可让代理读取此目录的 SKILL.md。

## 直接使用模板

先在真实项目根目录执行预览，再按需要创建缺失文件：

```text
node <skill-dir>/scripts/init-project.mjs --target <project-root>
node <skill-dir>/scripts/init-project.mjs --target <project-root> --write
```

脚本不覆盖旧文件；退出码 3 提醒需要合并。合并、外部 store、记忆授权与依赖验收见 [接入说明](references/adoption.md)。OpenSpec CLI、它生成的技能和 Superpowers 插件是单独的依赖，复制模板不会安装它们。

## 验证本包

```text
node --test <skill-dir>/tests/*.test.mjs
```

有 OpenSpec CLI 时，可额外执行隔离的真实接入检查：

```text
node <skill-dir>/tests/openspec-smoke.mjs <path-to-installed-openspec/bin/openspec.js>
```

检查会在临时项目中生成 Codex 技能、校验 schema 并读取制品依赖；检测到可能被 CLI 清理的用户旧 opsx 提示文件时会停止，不触碰它们。

已执行的检查与独立代理演练见 [验证记录](references/validation.md)。

发布给别人时携带整个技能目录，`assets/template/` 就是模板包。不要只复制 SKILL.md。
