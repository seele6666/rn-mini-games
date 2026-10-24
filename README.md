# RN Mini Games

**An offline mini-game collection built with React Native, Expo and TypeScript.**

一个持续开发中的移动端小游戏合集，目前包含 **2048** 和 **斗地主（Dou Dizhu）**。项目围绕游戏规则建模、移动端交互、离线状态持久化与自动化测试展开，优先面向 Android，同时提供 Web 开发预览。

## Games

| 游戏 | 已实现功能 |
| --- | --- |
| **2048** | 4×4 棋盘、四向滑动与合并计分、2048 达成提示及继续挑战、终局判断、进度恢复 |
| **斗地主** | 三人离线对局（1 名玩家 + 2 名电脑）、叫地主与抢地主、牌型识别及出牌校验、四档电脑策略、提示、对局恢复、最近三手记录、音乐与震动设置 |

**2048**

- 将棋盘移动、合并、随机生成与终局判断封装在独立的 TypeScript 规则模块中。
- 使用原生手势处理滑动，并处理棋盘操作与页面滚动之间的手势竞争。
- 使用本地存储保存棋盘、分数和胜利状态，支持退出后恢复。

**斗地主**

- 实现 54 张牌的三人对局状态机，覆盖叫牌、抢地主、出牌、压牌、不出与胜负结算。
- 提供简单、普通、困难、非常困难四档策略；高难度使用受计算预算约束的采样与模拟搜索。
- 电脑决策仅接收当前座位可见的信息；玩家提示只建议操作，不会自动替玩家出牌。
- 支持对局存档恢复、最近三手完整出牌展示、离线配乐及可调整的震动反馈。
- Android 中首页与 2048 使用竖屏，斗地主牌桌使用横屏。

> 当前仍在迭代：功能代码与自动化测试不等于所有 Android 真机体验均已验收。具体结果见下方验证记录。

## Engineering Highlights

### 1. Game logic separated from UI

按功能划分模块，将规则计算、会话生命周期、持久化与 UI 分开管理。2048 的核心规则不依赖 React；斗地主通过独立的规则引擎处理合法动作和状态转换，便于测试与后续扩展。

### 2. Recoverable game sessions

使用 `AsyncStorage` 保存两个游戏的独立进度。斗地主存档会校验结构与操作历史，并通过重放动作核对最终状态；保存任务按顺序写入，避免异步写入覆盖较新的进度。

斗地主的异步电脑行动还会校验 `gameId`、`dealId`、`revision` 和任务有效性，降低切后台、离开页面或重开游戏后旧计算结果误更新当前对局的风险。

### 3. Observable and testable AI decisions

斗地主将玩家可见信息抽象为 `PlayerObservation`，电脑决策与玩家提示共用策略入口。项目包含启发式策略、受节点/时间/工作量预算约束的搜索，以及使用固定随机种子进行的策略对局基准。

策略表现仍在调优中；基准结果和局限性记录在 [斗地主验证文档](docs/doudizhu-validation.md)，不将桌面基准等同于手机实际性能。

### 4. Automated testing and Android validation

使用 **Jest** 和 **React Native Testing Library** 测试规则引擎、存档、会话、组件及部分用户操作，并维护独立的 Android 真机验收清单。

## Tech Stack

- **App:** Expo SDK 57, React Native, Expo Router, TypeScript
- **Interaction:** React Native Gesture Handler
- **Storage:** AsyncStorage
- **Media:** Expo Audio, Expo Haptics
- **Testing:** Jest, React Native Testing Library
- **Build:** EAS Build (Android APK)

## Project Structure

```text
src/
├── app/                         # Expo Router 路由与游戏入口
├── features/
│   ├── game2048/
│   │   ├── core/                 # 规则与棋盘计算
│   │   ├── session/              # 游戏会话与状态协调
│   │   ├── persistence/          # 存档与写入队列
│   │   └── ui/                   # 棋盘、手势与页面组件
│   └── doudizhu/
│       ├── engine.ts             # 对局状态机
│       ├── rules.ts              # 牌型与合法出牌规则
│       ├── ai/                   # 策略、搜索与基准测试
│       ├── storage.ts            # 存档校验和历史重放
│       ├── useDoudizhu.ts        # 会话与异步任务协调
│       └── GameScreen.tsx        # 斗地主牌桌
└── theme.ts
```

详细模块说明参见 [2048 模块文档](src/features/game2048/README.md)。需求和设计变更保存在 [OpenSpec](openspec/changes/) 中。

## Getting Started

需要 **Node.js 和 npm**（项目开发记录使用 Node.js 24）。

```bash
git clone https://github.com/seele6666/rn-mini-games.git
cd rn-mini-games
npm ci
npm start
```

使用兼容 Expo SDK 57 的开发客户端，或在已配置 Android 模拟器/设备后运行：

```bash
npm run android
```

浏览器开发预览：

```bash
npm run web
```

代码检查与测试：

```bash
npm run typecheck
npm test -- --runInBand
```

> Web 预览与 Jest 测试不能替代 Android 真机验收；各平台的本地存档互不共享。

### Build an Android APK

仓库配置了 EAS `preview` 构建配置，用于生成可独立安装的 Android APK：

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

构建需要 Expo 账号及可用的 EAS 项目权限。自行 Fork 构建时，可能需要重新关联自己的 EAS 项目。参见 [Expo APK 构建说明](https://docs.expo.dev/build-reference/apk/)。

## Validation Status

- **2048:** 仓库记录了 1.0.1 版本的 Android 真机回归，包括滑动、计分、返回导航和存档恢复。
- **斗地主:** 已包含规则、策略、组件和会话相关自动化测试及基准记录；仓库文档中的 **1.2.0 Android 真机验收项仍有待完成**。
- **Release:** 当前仓库尚未提供可直接下载的最新完整版 APK；本 README 不将旧版本的本地文件路径作为公开下载链接。

相关记录：[2048 Android 验收](docs/android-validation.md) · [斗地主策略与验收](docs/doudizhu-validation.md)

## Roadmap

- 完成包含最新斗地主功能的 Android APK 真机回归。
- 补充游戏截图、录屏与可访问的安装包发布页。
- 继续优化斗地主策略与交互体验，并补充可复现的性能数据。

## License

项目代码以 [MIT License](LICENSE) 开源。内置音乐 **“Monkeys Spinning Monkeys” — Kevin MacLeod** 根据 **CC BY 4.0** 使用，署名和来源见 [音频说明](assets/audio/README.md)；第三方素材不因本项目的 MIT 许可而改变其原有授权。
