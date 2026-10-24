# Design

## Context

2048 当前 7 份源码与 7 份测试平放。GameScreen 内定义 Button、Dialog 和页面样式；GameBoard 内包含滑动生命周期。useGame2048 已负责会话，engine、storage、saveQueue 与 gesture 已独立，无需改写其算法。

## Goals and non-goals

按用户批准的四类职责和组件目录组织，薄化视图并就近测试。保留玩家行为和注入入口。本次不修改斗地主、不抽取跨游戏公共组件、不引入状态管理库、不构建 APK。

## Architecture and data flow

- core/engine.ts 及其测试：原样迁移棋盘类型、创建、移动、合并和结束判断。
- session/useGame2048.ts 及其测试：只调整导入。模块级 persistence 保持单例，依赖 core 与 persistence。
- persistence/{storage,saveQueue}.ts 及其测试：只调整 core 的相对导入；SAVE_KEY 和版本保持原值。
- ui/screen：GameScreen、独立 styles 与原页面测试。保留 confirmRestart 简单界面状态和页面原生滚动手势绑定。
- ui/board：GameBoard、独立 styles、useBoardGesture、gesture 及原棋盘/方向测试。Hook 接收 onMove 与可选 scrollGesture，返回原生 Pan 手势；保留 minDistance、maxPointers、block、绝对坐标差、取消与 finalize 清理。
- ui/button 与 ui/dialog：提取原函数及其原样式，继续以相同参数被页面调用。
- 更新 src/app/games/2048.tsx 的直接导入，不保留旧路径的转发副本。
- game2048/README.md 说明目录、依赖方向、随机性与副作用边界及后续文件归属。

## Decisions and alternatives

不按扩展名分目录；TS Hook 与 TSX 视图可处于同一组件目录，职责由文件名和接口说明。页面与棋盘 StyleSheet 独立，少量按钮/弹窗样式留在组件内。不额外新增 barrel、全局 store 或控制器层。

## Risks and mitigations

- 旧版快速滑动修复被覆盖：使用当前工作区原文迁移，复用原手势组件测试与页面阻止滚动关系测试。
- 队列作用域变化：模块级共享 persistence 不移入 Hook，不改变序列化与读取等待。
- 外观变化：按原对象逐项搬移样式，保持 render 中的行内样式、文本和组件属性，额外比对迁移前后样式。
- 未提交的斗地主升级混入：仅编辑 2048、其路由与本变更；记录斗地主源码及制品文件哈希核验。

## Verification approach

先保存当前源码文本快照、TypeScript 与全量 Jest 基线至忽略的 verification/2048-structure，再迁移。已有行为测试是本次保持绿色的重构契约，不为目录变化添加镜像测试。

记录的基线：TypeScript 通过；全量 Jest 25 套通过、2 套失败，260 项通过、1 项失败、2 项跳过。失败为斗地主 GameScreen 的反馈用例 5 秒超时及 DoudizhuRoute 的 expo-audio 原生模块初始化异常。2048、首页和 2048 路由基线均通过。保存源码快照时使用 .txt 后缀，避免快照被 TypeScript 当作源代码扫描。

迁移后跑 2048 及首页/路由测试、TypeScript、全量 Jest、OpenSpec 严格校验及逐任务说明检查。仅在出现新变化或未解决问题时补充检查；不修改斗地主以消除基线问题。用源码样式/渲染对比验证布局保留；真机滑动与存档抽查留到后续发布。

## Open questions

无。
