# 2048 结构试点验收记录

日期：2026-10-24。任务状态统一见 tasks.md。

## 变更范围

按 core、session、persistence、ui 四类职责迁移 2048；UI 按 screen、board、button、dialog 分目录。抽取页面/棋盘样式和棋盘手势 Hook，保留简单弹窗状态，更新路由直接导入，新增模块 README。

游戏规则、随机数调用顺序、存档键和格式、模块级共享保存队列与手势关系保持原样。未调整斗地主、依赖、应用版本或正式玩法规格；未构建 APK。

## 自动验证

| 检查 | 迁移前 | 迁移后 |
|---|---|---|
| TypeScript `--noEmit` | 通过 | 通过 |
| 规则、会话、存档、队列 | 通过 | 4 套、37 项通过 |
| 棋盘、方向、页面、首页与 2048 路由 | 通过 | 5 套、20 项通过 |
| 完整 Jest | 25 套通过、2 套失败；260 项通过、1 项失败、2 项跳过 | 26 套通过、1 套失败；261 项通过、2 项跳过 |
| OpenSpec strict | — | 通过 |
| 逐任务实施说明 | — | 5 项任务各有一份说明 |

完整回归没有新增失败，但完整项目测试仍非全绿：

- `src/features/catalog/DoudizhuRoute.test.tsx`：迁移前后都在导入 expo-audio 时出现 `Cannot read properties of undefined (reading 'prototype')`，测试套件未能运行。
- `src/features/doudizhu/GameScreen.test.tsx` 的 `human selection, rejection and confirmation have separate feedback without extra actions` 在基线发生 5 秒超时，迁移后完整回归通过。斗地主文件未改，不能将本次通过归因于修复。
- 两个默认跳过的斗地主长耗时 AI 基准未执行，本轮不代表斗地主升级或牌力验收。

## 兼容与外观静态对照

使用 TypeScript 语法树对当前工作区迁移前快照与迁移后文件对照，共 23 项检查通过：

- 规则、会话、存档、保存队列和方向判断除 import 外相同；全部原测试除 import 外相同。
- 页面、按钮和弹窗的函数正文相同，棋盘 JSX 相同。
- 原页面样式与拆分后的页面/按钮/弹窗样式逐项相同；棋盘样式和数字配色相同。
- Pan 配置、全部手势回调与起点 ref 相同，保留绝对坐标差和取消清理；原页面阻止滚动关系测试通过。
- 棋盘尺寸公式仍为 `Math.min(width - 48, 420)`；320、360、390、468、800 宽度下分别为 272、312、342、420、420，均保留原边距约束。
- 60 个斗地主源码及现有变更制品的 SHA256 与操作前一致。

上述外观检查属于静态等价与尺寸计算核验，没有声称完成截图对照或真机布局验收。

## 可复现命令与证据

从项目根目录运行：

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/jest/bin/jest.js --runInBand --cacheDirectory verification/2048-structure/jest-cache src/features/game2048/core src/features/game2048/session src/features/game2048/persistence
node node_modules/jest/bin/jest.js --runInBand --cacheDirectory verification/2048-structure/jest-cache src/features/game2048/ui src/features/catalog/GameRoute.test.tsx src/features/catalog/HomeScreen.test.tsx
node node_modules/jest/bin/jest.js --runInBand --cacheDirectory verification/2048-structure/jest-cache
node openspec/scripts/check-implementation-notes.mjs refactor-2048-structure
openspec validate refactor-2048-structure --strict
```

本地原始证据位于忽略目录 `verification/2048-structure/`：baseline-jest.log、baseline-typescript.log、module-jest.log、ui-jest.log、final-jest.log、final-typescript.log、source-equivalence.json、unrelated-before.json。`before/` 保存的是本轮开始的工作区文本快照，而非 Git HEAD；`compare-source.cjs` 可在保留这些本地材料时重跑静态对照。上述材料不会随 Git 提交自动保存，本文件保留必要结果。

## 独立审查

独立只读审查未发现本次重构引入的可操作问题。审查者对照迁移前工作区快照，核验了共享保存队列、注入入口、存档格式、原生滚动手势到棋盘 Hook 的接线，以及按钮、弹窗与棋盘展示的一致性；独立重跑 23 项静态等价检查，并确认 34 个相对导入均可解析、路由除导入路径外相同、src 无旧路径引用。主代理复核了相应源码与检查输出。

审查没有重复运行 Jest，也没有进行设备测试；真机滑动、截图布局和覆盖安装恢复仍留作后续发布抽查。

## 发布时的真机抽查

后续发布 APK 时，在同一设备覆盖安装并检查：旧进度恢复、快速四向滑动、取消和短滑、棋盘与页面滚动冲突、连续返回再进入、窄屏布局、弹窗及达到 2048 后继续挑战。本次没有执行真机抽查或 APK 构建。
