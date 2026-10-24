# Brainstorm

## Goal and audience

为个人 React Native 学习项目整理 2048，验证职责目录、薄视图和就近测试是否方便定位与修改。

## Known constraints

- 使用现有 Expo、React Hooks、自定义 Hook 和 AsyncStorage，不引入 Redux。
- 2048 的玩法、外观、路由与旧存档保持兼容，尤其保留已经修复的快速滑动与页面滚动冲突处理。
- 当前工作区含未提交的斗地主升级与历史改动，必须保留。

## Options considered

- 只按文件扩展名分组：无法表达职责和依赖关系。
- 所有逻辑均转为纯函数：无法覆盖 React 生命周期、手势与存储副作用。
- 按游戏分组，游戏内分职责，UI 再按组件分组：用户已选择。

## Confirmed decisions

- 用户明确批准先用 2048 试点；斗地主完成现有升级后再整理，其升级不属于本次交付。
- 使用 core、session、persistence、ui 四个目录；UI 独立组件建立小目录。
- TSX 保留简单界面状态，业务计算放 TS，复杂协调放 TS Hook，外部读写放持久化模块。
- 页面与棋盘样式独立，按钮与弹窗少量样式内聚；测试紧邻被测模块。
- 本轮实现独立 OpenSpec 重构变更、代码迁移与回归，不单独构建 APK。

## Open questions

无影响实施的待定问题。目录和组件名称以用户批准的方案为准。
