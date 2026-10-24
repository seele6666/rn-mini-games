# 2048 模块

按职责组织游戏，UI 内再按独立组件建立小目录。测试紧邻被测文件。

## 从哪里开始

| 需要修改什么 | 入口 |
|---|---|
| 创建棋盘、移动、合并、计分、结束判断 | `core/engine.ts` |
| 游戏状态、加载、胜利提示、重开与保存协调 | `session/useGame2048.ts` |
| 存档校验和 AsyncStorage 读写 | `persistence/storage.ts` |
| 连续写入排序与恢复等待 | `persistence/saveQueue.ts` |
| 页面布局与重开弹窗开关 | `ui/screen/GameScreen.tsx` |
| 棋盘布局、牌面颜色和尺寸展示 | `ui/board/GameBoard.tsx`、`GameBoard.styles.ts` |
| 原生手势起点、取消、清理及页面滚动冲突 | `ui/board/useBoardGesture.ts` |
| 由位移判断滑动方向 | `ui/board/gesture.ts` |
| 本游戏使用的按钮、弹窗 | `ui/button/`、`ui/dialog/` |

## 依赖与职责

```text
2048 路由 → ui/screen → session → core
                    │          └→ persistence → core 类型
                    └→ ui/board、ui/button、ui/dialog
```

- `core` 不依赖 React、界面或存储。棋盘判断与合并属于计算逻辑；创建和移动接受随机数函数，默认使用 Math.random，因此不把整个 engine 都称作纯函数。
- `session` 负责 React 状态和副作用协调。共享保存队列保持在模块作用域，离开再进入时仍等待此前写入。组件可继续注入 storage 和 random，方便行为测试。
- `persistence` 负责外部读写及顺序，不依赖 UI 或 session。存档键为 `game2048.save.v1`，格式为 `{ version: 1, state }`。
- `ui` 的 TSX 负责展示、条件渲染与操作绑定，可保留弹窗开关等简单界面状态。复杂手势协调放 TS Hook，方向计算放普通 TS 函数；TS 文件并不自动意味着纯函数。

## 新文件如何归属

- 新增游戏规则放 core；会话与生命周期协调放 session；存储能力放 persistence。
- 独立 UI 组件在 ui 下建立小目录，专用 Hook、样式、计算函数及测试放在该组件附近。
- 页面和棋盘采用独立 `.styles.ts`；按钮和弹窗的少量样式保留在组件内。
- 这里的 Button、Dialog 目前是 2048 专用组件。跨游戏复用有实际需求时再讨论公共目录。
- 测试使用 `.test.ts` 或需要 JSX 时的 `.test.tsx`，与被测模块放在一起。通过棋盘和页面测试覆盖手势 Hook，不重复建立只检查内部实现的测试。

## 验证

从项目根目录运行：

```powershell
npm run typecheck
npm test -- --runInBand src/features/game2048 src/features/catalog/GameRoute.test.tsx src/features/catalog/HomeScreen.test.tsx
```

重构验收记录位于 `openspec/changes/refactor-2048-structure/verification.md`。正式玩法和存档规则以 `openspec/specs/classic-2048/`、`openspec/specs/saved-game/` 为准。
