# Tasks

任务状态只在本文件维护。每条任务对应一份 `implementation/X.Y-<slug>.md`，开始实施前读取其依赖、规格与说明。

## 1. 规则与对局引擎

- [x] 1.1 实现54张实体牌、牌型判定、比较与结构化合法动作生成； verification: `npm test -- --runInBand src/features/doudizhu/rules.test.ts`，覆盖所有牌型边界及生成动作合法性。
- [x] 1.2 实现洗发牌、有限叫抢、全部不叫重发和地主底牌转换； verification: `npm test -- --runInBand src/features/doudizhu/engine.test.ts`，叫抢路径有限、底牌只加入一次、54牌守恒。
- [x] 1.3 实现出牌／不出、过时动作拒绝和阵营终局； verification: `npm test -- --runInBand src/features/doudizhu/engine.test.ts`，非法动作状态不变、两次不出清轮、农民共享胜利。

## 2. 公平电脑与难度

- [x] 2.1 实现玩家观察、简单策略和本地叫抢选择； verification: `npm test -- --runInBand src/features/doudizhu/ai/observation.test.ts src/features/doudizhu/ai/heuristic.test.ts`，隐藏牌置换不改变输入、叫抢不见底牌、所有动作合法。
- [x] 2.2 实现普通策略、农民配合及只建议不提交的提示接口； verification: `npm test -- --runInBand src/features/doudizhu/ai/heuristic.test.ts`，立即胜利、拆牌、队友接手与提示无副作用场景通过。
- [x] 2.3 实现困难档采样模拟、全流程计算预算、取消与合法回退； verification: `npm test -- --runInBand src/features/doudizhu/ai/search.test.ts`，确实采样推演、预算0/异常/取消正确、模拟玩家不读取全知信息。

- [x] 2.4 扩展expert公平搜索、统一决策和旧存档难度兼容； verification: AI与storage专项测试，原hard预算保持、expert预算/取消/公平通过。

## 3. 存档与会话

- [x] 3.1 实现独立斗地主存档、历史重放校验和跨挂载串行保存； verification: `npm test -- --runInBand src/features/doudizhu/storage.test.ts src/features/doudizhu/saveQueue.test.ts`，三阶段往返、损坏恢复、写入失败继续与2048键隔离通过。
- [x] 3.2 实现会话、恢复、前后台暂停、唯一电脑提交和确认重开； verification: `npm test -- --runInBand src/features/doudizhu/useDoudizhu.test.tsx`，迟到AI和提示无效、重复事件不重提、保存失败提示及取消重开通过。

- [x] 3.3 实现独立设置、离线配乐、音频生命周期与可关闭轻震动； verification: settings/media专项测试，默认值、串行写入、失焦暂停、异常重试与节流通过。

## 4. 牌桌与游戏入口

- [x] 4.1 实现横屏牌桌、20张可操作手牌、阶段按钮、难度选择和胜负结果； verification: `npm test -- --runInBand src/features/doudizhu/GameScreen.test.tsx src/features/doudizhu/Hand.test.tsx`，权限、选牌、提示和重开界面通过，手势真机验收留在5.3。
- [x] 4.2 接入首页第二入口、路由回退与页面方向配置； verification: `npm test -- --runInBand src/features/catalog`、`npm run typecheck`，两个入口路由正确且原2048返回保持有效，原生方向留在5.3验收。

- [ ] 4.3 实现全桌最近三手完整牌、视觉反馈、设置面板及会话暂停； verification: 历史选择器、Hand、GameScreen、session测试，800×360与20牌可访问。

## 5. 综合验证与独立APK

- [ ] 5.1 完成新版全量回归、困难与expert成对种子难度基准和验收文档； verification: typecheck、完整Jest、至少100种子×3座次配对且expert总体胜率高于hard，旧版证据保留。
- [ ] 5.2 更新1.2.0/code4并本地构建原签名ARM64独立APK； verification: Gradle成功、APK包名/版本/签名/内置音乐/SHA-256通过，旧1.1.0产物保留。
- [ ] 5.3 在Android真机验收四档离线对局、最近三手、音乐反馈、存档和expert响应； verification: 按 `docs/doudizhu-validation.md` 逐项记录设备、APK、实际结果和性能数据，含2048回归，未测或失败不得标记完成。
