# Proposal

## Why

用户希望在自己的 Android 手机上玩一个小游戏集合，并借此学习 React Native。先交付可以独立安装、实际可玩的 2048，建立后续添加其他游戏的首页入口。

## What Changes

- 创建 Expo + React Native Android 应用，打开时展示小游戏选择首页，首版只有 2048。
- 实现经典 4×4 2048：滑动、合并、计分、胜利后继续、无可用移动时结束和重新开始。
- 在本机保存进行中的棋盘和分数，重新打开应用时恢复。
- 提供可独立安装的 Android APK 构建配置与可复现的安装验证步骤。

## Capabilities

### New Capabilities

- `game-catalog`：展示小游戏列表并进入选中的游戏。
- `classic-2048`：执行经典 2048 的棋盘规则与游戏状态反馈。
- `saved-game`：保存和恢复本机游戏进度。
- `android-installation`：生成并安装无需 Expo Go 运行的 Android APK。

### Modified Capabilities

无；项目尚无正式能力规格。

## Impact

新增 Expo/React Native 工程、游戏页面和逻辑、本地存储、测试及 EAS APK 构建配置。首版面向单人、单台 Android 设备，不需要账户、服务端或联网游戏功能。
