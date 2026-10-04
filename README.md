# 小游戏合集 · Expo / React Native

个人 Android 小游戏集合与 React Native 学习作品。首版提供经典 4×4 2048：滑动合并、计分、首次达到 2048 后继续挑战，以及设备上的进度保存。使用 Expo SDK 57、Expo Router 和 TypeScript，通过 OpenSpec 和 Superpowers 推进开发。

## 开发与检查

需要 Node.js（当前使用 24）和 npm。在 PowerShell 中：

```powershell
npm install
npm start
# 手机安装与 SDK 57 对应的 Expo Go，电脑与手机在同一网络，扫描终端二维码。
# 已连接 Android 调试设备或启动模拟器时也可以：
npm run android

npm run typecheck
npm test -- --runInBand
```

`npm run web` 提供浏览器预览。浏览器和 Android 分别保存自己的进度；Web 检查不能替代 Android 验收。

## 构建独立 Android APK

使用个人 Expo 账号登录，首次构建会提示创建或关联 EAS 项目及生成 Android 签名。联网构建，游戏安装后可以离线运行。

```powershell
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest build -p android --profile preview
```

应用显示名为“小游戏合集”，包名为 `com.seele.minigames`。`eas.json` 的 `preview.android.buildType` 明确为 `apk`，构建结束后从 EAS 输出的链接下载 `.apk`，传到手机并允许安装该来源的应用。它包含游戏代码，不依赖 Expo Go 或 Metro 开发服务器。[Expo 官方 APK 构建说明](https://docs.expo.dev/build-reference/apk/)

安装后关闭开发服务器和 Expo Go，断开网络，按 [Android 验收清单](docs/android-validation.md) 复核。重新安装或清除应用数据可能清空存档；正常关闭与重新打开会恢复已保存的棋盘、分数和胜利标记。

## 代码位置

```text
src/app/index.tsx                 # 小游戏首页
src/app/games/2048.tsx            # 游戏路由
src/features/game2048/
  engine.ts                      # 纯函数规则、随机生成、胜利与终局判断
  storage.ts                     # AsyncStorage 与存档格式校验
  saveQueue.ts                   # 顺序写入，重新进入时等待待保存进度
  useGame2048.ts                  # 加载、游戏操作和保存反馈
  GameBoard.tsx                   # 16 格棋盘、方向手势
  GameScreen.tsx                  # 分数、继续游戏与重新开始确认
```

规则与存档测试使用确定性输入；组件测试验证真实会话和用户操作。测试配置依据 [Expo Jest 文档](https://docs.expo.dev/develop/unit-testing/)。

## OpenSpec 工作目录

```text
.
├── AGENTS.md                     # 项目工作入口
├── .codex/
│   └── skills/                   # 按用途整理的导航与规范
│       ├── superpowers/          # 已安装插件的技能入口
│       ├── development-rules/    # 用户开发规范预留位置
│       └── opsx/
│           ├── explore/          # 探索入口
│           ├── propose/          # 提案入口
│           ├── apply/            # 实施入口
│           └── archive/          # 归档入口
├── .agents/
│   └── skills/                   # OpenSpec 生成、Codex 实际加载的技能
│       ├── openspec-explore/
│       ├── openspec-propose/
│       ├── openspec-apply-change/
│       ├── openspec-archive-change/
│       ├── openspec-sync-specs/
│       └── openspec-update-change/
└── openspec/
    ├── config.yaml               # 默认使用 rn-2048-workflow
    ├── schemas/
    │   └── rn-2048-workflow/     # 制品顺序、编写规范和 Markdown 模板
    ├── specs/                    # 正式规格
    └── changes/                  # 进行中的变更
        └── archive/              # 已归档变更
```

## 使用说明

- [OPSX 四步入口](.codex/skills/opsx/README.md)
- [Superpowers 技能入口](.codex/skills/superpowers/README.md)
- [用户开发规范位置](.codex/skills/development-rules/README.md)

`.codex/skills/` 中目前存放导航说明，不包含重复的 `SKILL.md`。完整 OPSX 技能仍保留在 `.agents/skills/`，Superpowers 由已安装插件提供。

后续可以先提出游戏想法，使用 `openspec-explore` 探索，再按 propose、apply、archive 推进。项目默认采用 [rn-2048-workflow](openspec/schemas/rn-2048-workflow/schema.yaml)：每次变更会准备 `brainstorm.md`、`proposal.md`、`specs/<能力>/spec.md`、`design.md`、`tasks.md` 和 `implementation/X.Y-<任务名>.md`。任务状态只在 `tasks.md` 中维护。

Explore 讨论不会自动保存文件。跨对话继续时，可要求把结论写入该变更的 `brainstorm.md`。进入 Apply 或 Archive 前，运行 `node openspec/scripts/check-implementation-notes.mjs <变更名>` 检查任务与逐任务说明是否一一对应。
