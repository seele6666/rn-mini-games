# Android 验收清单

以下项目需要 Android 实际运行。浏览器预览、TypeScript 和 Jest 通过不能视为本清单通过。首版任务状态保留在 `openspec/changes/archive/2026-10-04-add-game-hub-2048/tasks.md`。

## 开发运行

1. 手机安装对应版本 Expo Go，电脑运行 `npm start`，同一网络扫码进入。
2. 首屏只有 2048 可玩入口。点击进入，按系统返回键回首页，再次进入仍是原棋盘。
3. 依次测试左、右、上、下四个方向。轻触、短距离滑动、无效移动不会生成新方块；一个完整手势最多移动一次。
4. 检查窄屏、状态栏与系统底部区域，棋盘保持完整，分数和按钮可以看到或滚动到。
5. 保存一局后结束应用进程并重开，棋盘和分数一致。快速连续移动后立即回首页再进入也应一致。
6. 首次合成 2048 时弹出成功提示，继续挑战保留棋盘，4096 仍可合并；同局重新进入不会再次提示胜利。
7. 棋盘满但有相邻相同数字时仍可玩；没有可移动步骤时显示“本局结束”。
8. 点击重新开始，取消应保留棋盘和分数；确认后为两个数字、0 分的新局。结束进程再打开仍恢复新局。

## 独立 APK

按根 README 登录、构建 preview APK，下载并安装到手机。关闭 Expo Go 与 Metro、断开网络后，重复以上步骤。记录 EAS 构建链接或 APK 路径、设备型号和结果。

## 当前交付记录

2026-10-03：已接入首页、2048 引擎、棋盘手势、会话、存档和 APK 配置。

- `npm test -- --runInBand`：9 个测试文件、52 个测试通过。
- `npm run typecheck`、OpenSpec strict 校验和逐任务说明检查通过。
- `expo export --platform android`：Hermes 发布代码编译通过。这是 Android 代码包，不是 APK。
- 浏览器 360×800 预览：首页与棋盘显示完整；实际拖动能改变棋盘，刷新恢复一致；受控棋盘首次达到 2048 时显示继续按钮，继续后刷新不再提示；终局显示结束入口。取消重开保留棋盘与 1234 分，确认重开生成两个数字且为 0 分；直接打开游戏页后，返回按钮能进入首页，无浏览器运行错误。
- 审查发现并修复原生触摸需要阻止外层滚动，以及直接打开游戏页时返回首页的导航回退问题；各自回归测试通过。

2026-10-04：Expo 个人账号登录已确认，EAS 项目已创建并关联：

- 项目：`@seelelxd/seele-minigames`，ID 为 `40b4a53a-58d5-4a5c-84ad-e89e388fd331`。
- 项目地址：https://expo.dev/accounts/seelelxd/projects/seele-minigames
- Android 包名为 `com.seele.minigames`，EAS 已生成并管理 Android 签名。
- 首次 Git 提交为 `b5e7a77`。Git 克隆因沙箱用户与本机用户不同而触发所有权检查，改用 `EAS_NO_VCS=1` 和指定当前根目录上传；1.4 MB 项目压缩包已上传。
- 构建前再次执行 TypeScript 和 Jest：52 个测试通过。
- 首次构建 ID：`cc21e512-8533-4490-b8a1-2fbeaeae3f39`，记录地址：https://expo.dev/accounts/seelelxd/projects/seele-minigames/builds/cc21e512-8533-4490-b8a1-2fbeaeae3f39

首次云构建在 `:app:processReleaseResources` 失败：启动屏样式引用 `drawable/splashscreen_logo`，但没有配置图片，因此未生成该资源。已在临时验证工程的真实 Android prebuild 中复现；为 `expo-splash-screen` 补回模板已有的 `assets/images/splash-icon.png` 和图片宽度后，五种密度的 drawable 均生成，资源检查通过。

修复后构建 ID 为 `02ece630-5e66-4a19-bfca-36ac551f5529`，记录地址：https://expo.dev/accounts/seelelxd/projects/seele-minigames/builds/02ece630-5e66-4a19-bfca-36ac551f5529

修复后构建于 2026-10-04 09:38（北京时间）完成，EAS 状态为 `FINISHED`。已下载独立 APK：

- [直接下载 APK](https://expo.dev/artifacts/eas/U3G_r0HDsACrszoTvKh72-TBesptUTpGDoWc2Hv1SVg.apk)
- 本地文件：`artifacts/minigames-1.0.0-android.apk`。
- 大小：97,358,490 字节（92.85 MiB）。
- SHA-256：`1719B91B33967F8A7152D8A080378BEF93272F19DD3FE3F8DC738B4A4C253554`。
- APK 归档检查通过：包含 Android 清单、4 个 DEX 文件、2,169,904 字节的内置游戏代码包和 88 个原生库。

首份 APK 下载时尚无真机验收证据；后续设备信息、实际结果与缺陷复测见下方“用户真机反馈与手势修复”。本机未检测到 Android SDK 的 adb，真机结果由用户反馈。

EAS 首次读取配置曾遇到 `EXDEV` 原子改名错误；创建缺失的用户配置后，登录状态命令已可正常运行。

## 用户真机反馈与手势修复

用户已安装并测试独立 APK 1.0.0。设备为 Redmi K90 Max；用户提供的系统版本为 OS 4.0.0.14，Android 主版本尚未确认。

首轮反馈中，用户报告对话中验收项 01–26 通过，27–33 未测。对应测试内容为：

| 编号 | 内容 |
| --- | --- |
| 01–08 | 安装、断网启动、首页入口、初始棋盘、界面和返回导航 |
| 09–18 | 四向滑动、短距离和斜滑过滤、一次手势一步、合并计分、新方块与无效移动 |
| 19–22 | 切换应用、关闭重开、快速操作后重新进入与无效移动后的恢复 |
| 23–26 | 取消重开、系统返回关闭确认框、确认新局与新局存档恢复 |
| 27–33 | 达成 2048、继续挑战、胜利标记恢复、4096、满盘可合并及终局恢复 |

首轮反馈同时发现：棋盘内快速滑动时，页面可能滚动而棋盘不移动。因此当时 09、18 涉及快速滑动的部分需复测；任务 4.1 保持未勾选。首页导航已有真机证据，任务 1.2 勾选；涉及胜利状态的任务等待 27–33。

排查发现旧实现使用 JS responder 回调阻止原生滚动，该阻止可能晚于 Android ScrollView 的快速触摸拦截。改为原生 Pan 与 Native ScrollView 手势的阻塞关系，保持棋盘外页面可滚动。审查还确认 Pan 的 translation 从激活位置开始累计，可能漏掉第一次快速移动；现改为在 onBegin 记录绝对位置，结束时计算完整位移，取消和结束后清理起点。测试模拟首次移动 80px、释放时再移动 10px 的真实原生序列，先复现漏步，再验证合并、计分和存档。

修复后 9 个测试文件、57 个测试与 TypeScript 检查通过；OpenSpec strict 校验和逐任务说明检查通过。新版 APK 标记为 1.0.1、Android versionCode 2，同一包名和签名用于覆盖安装。

新版真机复测重点：在棋盘内连续快速向上下左右滑动，确认页面没有随棋盘手势滚动；随后在棋盘外滑动，确认说明区域仍可滚动。覆盖安装后还应核对原存档和重启恢复。

1.0.1 构建 ID：`c2b2ddaf-87fa-48ad-b7c8-a897f6165e0d`。构建记录：https://expo.dev/accounts/seelelxd/projects/seele-minigames/builds/c2b2ddaf-87fa-48ad-b7c8-a897f6165e0d

该构建于 2026-10-04 10:37（北京时间）完成，EAS 状态为 `FINISHED`，已下载并检查本地 APK：

- [下载 1.0.1 APK](https://expo.dev/artifacts/eas/3ScvjQ0EkoePDBM4_LbMgI5569QtdfdL7Q7Ba8dlXbo.apk)。
- 本地文件：`artifacts/minigames-1.0.1-android.apk`。
- 大小：98,340,922 字节（93.79 MiB）。
- SHA-256：`81D8CCF6B6A79D174DEB216911C0821616A344E5FCD40339BC3772F84C3C7DA0`。
- 包含 Android 清单、4 个 DEX 文件、3,152,328 字节内置游戏代码包和 88 个原生库。

## 最终真机验收结果

2026-10-04：用户在 1.0.1 修复版交付后确认“27–33 均测试完毕，之前的 bug 也修好了”。结合首轮 01–26 的通过反馈，33 项真机验收完成，快速滑动被页面抢占的问题已由用户确认解决。

- 胜利与继续挑战：首次合成 2048 的提示、继续当前棋盘、4096 及更大数字。
- 胜利状态恢复：返回首页或重启后不重复提示已达成 2048。
- 终局：满盘可合并仍可玩，无可用移动时显示结束，重启后恢复结束状态。
- 原生手势：此前报告的快速滑动漏步和页面抢占缺陷复测通过。
- 独立安装、离线运行、导航、计分、重开与存档恢复：依据此前 01–26 的通过反馈。

真机证据来源为用户在本对话中的反馈，设备信息沿用 Redmi K90 Max / OS 4.0.0.14。开发侧的 57 项自动化测试、TypeScript 检查、OpenSpec 校验和成功构建记录作为补充证据。任务完成状态保留在 `openspec/changes/archive/2026-10-04-add-game-hub-2048/tasks.md`。

2026-10-04：用户选择同步规格后归档，四份正式规格已写入 `openspec/specs/`，本次变更保留于 `openspec/changes/archive/2026-10-04-add-game-hub-2048/`。

