# android-installation Specification

## Purpose

独立安装能力让玩家在自己的 Android 手机上直接安装和运行小游戏集合。应用的核心玩法与本地存档在离线环境下也可用，不依赖开发服务器或 Expo Go。

## Requirements

### Requirement: 提供可安装 APK

项目 SHALL 提供生成 Android APK 的构建配置和可复现的构建步骤。

#### Scenario: 构建安装包

- **WHEN** 按项目文档运行 Android 安装包构建步骤并完成构建
- **THEN** 可获得可安装的 `.apk` 文件，而非仅有 `.aab` 文件

### Requirement: 独立运行核心游戏

已安装的 APK SHALL 无需 Expo Go 或开发服务器即可打开首页、游玩 2048 并使用本地存档。

#### Scenario: 手机离线运行

- **WHEN** 玩家在 Android 手机上安装 APK，并断开开发服务器与网络
- **THEN** 可以打开首页、进入 2048、完成滑动和计分
- **THEN** 关闭后再打开仍能恢复保存的棋盘
