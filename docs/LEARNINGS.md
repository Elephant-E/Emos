# 从旧项目（Vue 版）值得保留的东西

旧代码在 `main` 分支（`a01e9a0`）。重写不等于推翻，下面这些是它做对了的部分。

## 直接采纳（已在新架构落地或即将落地）

1. **声明式端点工厂**（`api/factory.js`）
   把 method / path / params / body 的映射收敛成配置，190 个端点的样板代码才不爆炸。
   新版改为类型化函数（`src/api/endpoints.ts`），保留同样的"一处定义、处处复用"。

2. **`buildQuery` 处理数组参数**
   后端要 `dates[]=2026-08-02`，JS 的 `URLSearchParams` 不会自动加 `[]`。
   新版在 `client.ts` 的 `buildUrl` 里复刻了这个规则。

3. **滚动容器单一事实源**（`useInfiniteScroll`）
   旧版把滚动容器固定为 `#scrollable-page`，调用点不再各传各的，这个判断是对的。
   新版页面滚动容器是 `.page`，将来做无限滚动时沿用同一思路。

4. **零偏移光晕 = 装饰**的自觉
   旧 UI 里发光元素克制，新设计系统延续（发光只给数据可视化）。

5. **401 单次跳转防重入**
   旧 `api/index.js` 有 `_redirecting` 标志，新版 `client.ts` 保留。

## 值得补回来的（当前缺失）

1. **全局 toast**：最多 5 条、超出顶掉最旧的、内容转义。所有写操作都需要它。
2. **命令式 confirm**：`const ok = await confirm('删除这个片单？')`，不用每个页面写 modal state。
3. **多账号切换**：`accounts` 数组 + `isCurrent`，本地同时存多个 token。
4. **上传队列**：队列 + 失败重试 + 每个任务独立的存储位置（`useUploadQueue`）。
5. **维护模式检查**：启动即判 `isMaintenance`，避免用户在里面点半天。

## 已被新架构替代、不需要照搬

| 旧做法 | 新做法 |
|---|---|
| Pinia 存列表数据 | TanStack Query 缓存 + 失效 |
| 手写 loading/error ref | query 状态 + `ErrorBlock` / `LoadingBlock` |
| keep-alive 保列表位置 | 筛选/分页进 URL，返回即恢复 |
| 28 个按页面切的 composable | 按域切的 `queries.ts` + `views/*` |
| 2710 行 components.css（Apple HIG） | tokens → base → components 三层 |

## 视觉约束（写进代码前先读这三条）

1. **hover 不改变表面亮度**，只改变前景对比度。铺底色等于凭空造一层。
2. **状态块不是容器**：`LoadingBlock / EmptyBlock / ErrorBlock` 传 `bare` 放进卡片，容器由调用方决定。
3. **表格 thead 默认透明**，只有页面级 `.table-card` 的粘性表头保留底色。
