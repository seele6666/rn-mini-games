# 小游戏合集 · Expo / React Native

个人 Android 小游戏集合与 React Native 学习作品，使用 Expo SDK 57、Expo Router 和 TypeScript，通过 OpenSpec 和 Superpowers 推进开发。

- **2048**：经典4×4滑动合并、计分、达到2048后继续挑战，以及本地进度保存。
- **斗地主**：完全离线的三人叫地主／抢地主，一名真人与两名电脑；简单、普通、困难、非常困难四档，提示由玩家确认，独立保存对局，仅显示阵营胜负。展示全桌最近三手完整出牌，提供内置替代配乐、音量与震动设置及点击反馈。Android牌桌横屏，首页和2048竖屏。

斗地主的策略基准、新APK与真机验收证据见 [斗地主验收记录](docs/doudizhu-validation.md)。

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

如果构建中的 Git 克隆提示 `dubious ownership`（例如目录由沙箱用户创建），可以使用 EAS 的直接目录上传方式。在项目根目录的 PowerShell 运行：

```powershell
$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = (Get-Location).Path
npx eas-cli@latest build -p android --profile preview
```

这两个变量只作用于当前终端。上传内容由 `.easignore` 控制；项目已关联个人 EAS 项目，Android 签名由 EAS 管理。

应用显示名为“小游戏合集”，包名为 `com.seele.minigames`。`eas.json` 的 `preview.android.buildType` 明确为 `apk`，构建结束后从 EAS 输出的链接下载 `.apk`，传到手机并允许安装该来源的应用。它包含游戏代码，不依赖 Expo Go 或 Metro 开发服务器。[Expo 官方 APK 构建说明](https://docs.expo.dev/build-reference/apk/)

安装后关闭开发服务器和 Expo Go，断开网络，按 [Android 验收清单](docs/android-validation.md) 复核。重新安装或清除应用数据可能清空存档；正常关闭与重新打开会恢复已保存的棋盘、分数和胜利标记。

### 当前 APK

2026-10-21 已本地构建 **1.1.0（versionCode 3，ARM64）**：[本地 APK](artifacts/minigames-1.1.0-android.apk)，大小39.61 MiB，包含2048和斗地主。已用原发布签名签署并核验包名、版本、签名、对齐及内置游戏bundle；手机离线、方向、手势与存档验收待测。构建和校验记录见 [斗地主验收记录](docs/doudizhu-validation.md)。

### 历史 APK：1.0.1

2026-10-04 的手势修复版 preview 构建已成功：[下载 1.0.1 APK](https://expo.dev/artifacts/eas/3ScvjQ0EkoePDBM4_LbMgI5569QtdfdL7Q7Ba8dlXbo.apk)。本地副本为 `artifacts/minigames-1.0.1-android.apk`，大小 93.79 MiB，Android versionCode 为 2，可覆盖安装上一版。修复棋盘与页面滚动的手势竞争，以及快速滑动时完整位移的计算；用户已确认 33 项真机验收完成，快速滑动缺陷已解决。构建记录、用户反馈与 SHA-256 见 [Android 验收清单](docs/android-validation.md)。

首版变更已[归档](openspec/changes/archive/2026-10-04-add-game-hub-2048/tasks.md)，正式规格位于 `openspec/specs/`：小游戏首页、经典 2048、本地存档和独立 APK。

## 代码位置

```text
src/app/index.tsx                 # 小游戏首页
src/app/games/2048.tsx            # 游戏路由
src/app/games/doudizhu.tsx        # 斗地主路由、焦点及无历史系统返回
src/features/game2048/
  core/                          # 棋盘规则、随机生成、胜利与终局判断
  persistence/                   # 存档校验、读写与顺序保存队列
  session/                       # 加载、游戏操作和保存反馈
  ui/                            # 页面、棋盘、手势 Hook、按钮与弹窗
  README.md                      # 职责、依赖与文件归属说明
src/features/doudizhu/
  cards.ts / rules.ts / engine.ts # 实体牌、牌型和纯对局状态机
  ai/                            # 公平观察、策略、受预算的采样模拟与基准
  storage.ts / saveQueue.ts      # 独立存档、重放校验和串行写入
  useDoudizhu.ts                 # 恢复、保存、前后台及迟到任务保护
  Hand.tsx / GameScreen.tsx      # 手牌选中与横屏牌桌
  RecentPlays.tsx                # 全桌最近三手及独立横向浏览
  settings.ts / useDoudizhuMedia.ts # 独立设置、内置配乐与轻震动
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
