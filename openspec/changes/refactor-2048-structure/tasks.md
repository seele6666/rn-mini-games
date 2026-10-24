# Tasks

## 1. 基线

- [x] 1.1 保存当前源码、无关改动哈希与测试基线，区分既有失败；verification: verification/2048-structure 中具备快照、TypeScript 与全量 Jest 日志。

## 2. 职责迁移与界面拆分

- [x] 2.1 迁移 core、session、persistence 及相邻测试，更新引用并保留运行契约；verification: engine、useGame2048、storage、saveQueue 测试通过。
- [x] 2.2 按组件整理 ui，抽取样式、按钮、弹窗与棋盘手势 Hook，更新路由；verification: 棋盘、页面、首页与 2048 路由测试通过，原有样式和手势关系保留。

## 3. 说明与验收

- [x] 3.1 添加模块入口说明，明确职责、依赖方向与文件归属；verification: README 与实际目录及导入关系一致。
- [x] 3.2 完成类型检查、完整回归、静态外观对照与独立审查，记录既有问题及发布抽查边界；verification: TypeScript 与 2048 相关测试通过，全量回归无新增失败，OpenSpec 严格校验及逐任务说明检查通过，斗地主文件哈希不变。
