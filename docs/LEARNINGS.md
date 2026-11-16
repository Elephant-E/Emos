# 从旧项目（Vue 版）值得保留的东西

旧代码在 `main` 分支（`a01e9a0`）。下列做法在新架构中沿用。

## 直接采纳（已在新架构落地）

1. **声明式端点工厂**（`api/factory.js`）
   把 method / path / params / body 的映射收敛成配置，190 个端点的样板代码才不爆炸。
   新版改为类型化函数（`src/api/endpoints.ts`），保留同样的"一处定义、处处复用"。

2. **`buildQuery` 处理数组参数**
   后端要 `dates[]=2026-08-02`，JS 的 `URLSearchParams` 不会自动加 `[]`。
   新版在 `client.ts` 的 `buildUrl` 里复刻了这个规则。

3. **滚动容器单一事实源**（`useInfiniteScroll`）
   旧版把滚动容器固定为 `#scrollable-page`，调用点不再各传各的。
   新版页面滚动容器是 `.page`，将来做无限滚动时沿用同一思路。

4. **零偏移光晕只作装饰**
   发光只给数据可视化，其余元素不用。

5. **401 单次跳转防重入**
   旧 `api/index.js` 有 `_redirecting` 标志，新版 `client.ts` 保留。

## 已补回来的（原本缺，现已落地）

1. **全局 toast**：`ui/toast.tsx`，最多 5 条、超出顶掉最旧的。
2. **命令式 confirm / prompt**：`ui/confirm.tsx`、`ui/prompt.tsx`，`await confirmDialog({...})`。
3. **多账号切换**：`lib/accounts.ts` + 侧栏切换，本地同时存多个 token。
4. **上传队列**：`UploadView` 的队列（3 并发 + 每条独立状态 + 失败可重试）。

## 仍然缺的

1. **维护模式检查**：启动即判 `isMaintenance`，避免在维护期间继续操作。

## 已被新架构替代、不需要照搬

| 旧做法 | 新做法 |
|---|---|
| Pinia 存列表数据 | TanStack Query 缓存 + 失效 |
| 手写 loading/error ref | query 状态 + `ErrorBlock` / `LoadingBlock` |
| keep-alive 保列表位置 | 筛选/分页进 URL，返回即恢复 |
| 28 个按页面切的 composable | 按域切的 `queries.ts` + `views/*` |
| 2710 行 components.css（Apple HIG） | tokens → base → components 三层 |

## 视觉约束

1. **hover 不改变表面亮度**，只改变前景对比度。铺底色等于凭空造一层。
2. **状态块不是容器**：`ListSection` 直接渲染四态（出错 / 同形骨架 / 空 / 内容），
   不再套 `.table-card` 这类外层容器——列表自己就是卡片。
3. **列表已无表格**：全站零 `<table>`，信息型列表用 `RecordRow`、图片型用 `RecordGrid`，
   `thead` / `.table-card` / 粘性表头这些约束随表格一起移除。
