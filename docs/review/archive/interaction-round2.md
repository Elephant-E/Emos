# 交互与可达性审查 · 第二轮

审查对象：`src/views/*.tsx`、`src/components/*.tsx`、`src/ui/*.tsx`、`src/router.tsx`（含 `src/styles/*.css` 中影响交互的规则）
方式：只读代码审查，未启动浏览器、未改 `src/`
前提：单请求 2–6 秒、偶发超时。判断一律按"慢链路"校准。

**基线**：`HEAD 68cd790`。工作区另有未提交改动（`VideoDetailView.tsx`、`WatchlistDetailView.tsx`、`components.css` 的 `.btn--danger-text`），本文按**工作区当前内容**判定，已标注。

**相对第一轮的变化**：新增 `/recycle`、`/users/$userId`，概览页整体重写为个人仪表盘，全站接了一个 `MutationCache.onError`，行内动作统一改成表格文字按钮。

**一句话结论**：P0 从 4 条降到 **1 条**（兑换槽位连点扣两次胡萝卜），P1 解决 2 / 部分 4 / 未解决 10。三个新页面里 `/music` 四态最稳、`/recycle` 有"错误当空"、`/users/:id` 把**所有接口失败**渲染成"你没有服务商权限"（本轮最容易误导人的一条）。lead 问的四件事：**焦点陷阱仍然完全没有**（Modal 与 Confirm 都没有，Esc 只有 Confirm 有，弹窗内回车提交仍然不生效）；危险动作 15/18 有确认，但 **17/18 与常规动作同级渲染**，且 `.table .btn` 让表格里的 `btn--danger` 失效；键盘入口只修了媒体库一页。

---

## 一、第一轮问题复核（P0×4 / P1×16）

图例：✅ 已解决 · 🟡 部分 · ❌ 未解决 · ⚠️ 解决了但带出新问题

| # | 第一轮问题 | 现状 | 复核结论 |
|---|---|---|---|
| P0-1 | `confirm` 全局 Enter 误确认（`ui/confirm.tsx:45-53`） | 已加 `data-confirm-action="cancel"` 判定：焦点在「取消」上按 Enter 直接 return，且对确认键 `preventDefault` 后再 `settle(true)`（:48-53） | ✅ 已解决（残留 2 个小问题，见第二节 P2 里 `confirm.tsx` 两条） |
| P0-2 | 转赠胡萝卜连点扣两次（`AccountView.tsx:512-529`） | `disabled` 加了 `actions.transfer.isPending`（:575），并补了 `confirmDialog`（含金额、接收方、"无法追回"）（:577-583） | ✅ 已解决 |
| P0-3 | 列表行无键盘入口（`LibraryView.tsx`） | `<tr tabIndex={0} role="link" onKeyDown>`（:116-128），`row-menu` 补了 `onClick` + 文案改成「打开《…》详情」（:169），末列 `td` 加了 `stopPropagation`（:168） | 🟡 部分：只有媒体库修了；片单（`WatchlistsView.tsx:129`）、直播（`LiveView.tsx:90`）、音乐（`MusicView.tsx:111-115`）仍是裸 `onClick`，全仓 `tabIndex` 仍只出现 1 次。**复选框那一格没加 `stopPropagation`（:129-131）→ 勾选仍会跳页面** |
| P0-4 | 窄屏卡片内表格被裁（`components.css:684-685`） | `.table-card{overflow:auto}` 变成无条件（:459-465），卡片内表格 `min-width` 820→420（:1162），并给 `.card-body` 加了 `overflow-x:auto` | 🟡 部分：`.table-card` 全宽度都能横滚了 ✅；但影片详情/歌曲详情/账号/上传的卡片表格**没有 `.card-body` 包裹**，420px 表格放进 ~318px 的卡片里仍被 `.page{overflow-x:hidden}`（:153）裁掉右侧操作列 |
| P1-1 | 无「权限不足」态 | 出现 3 处权限解释：`WatchlistDetailView.tsx:113-117`（"你不是这个维护者"）、`UserDetailView.tsx:75-79`（"没有服务商权限"）、`RecycleView.tsx:144`（行内 `title`）。仍无统一组件 | 🟡 部分（方向对了），⚠️ 但 `UserDetail` 把**所有失败**都渲染成"没有服务商权限"（见第二节「用户详情」条） |
| P1-2 | 25 处写操作静默失败 | `main.tsx:12-19` 全局 `MutationCache.onError` → toast，本地 `onError` 几乎全删 | ✅ 已解决，⚠️ 双 toast + 文案仍无「为什么/怎么办」（见第二节「双 toast」条） |
| P1-3 | `Modal` 无 Esc / 无焦点陷阱 / 无回车提交 | `Modal.tsx` 逐字未改（33 行，与第一轮完全相同） | ❌ 未解决 |
| P1-4 | 表头假排序、`aria-sort` 挂错元素 | `LibraryView` 直接删掉了 `.th-sort`，改为静态 `<th>资源/求片/上映>`（:108-110） | ✅ 已解决（选择了"不做排序"这条正确路线） |
| P1-5 | 商城上下架无 pending / 无乐观 / 无提示 | `ShopView.tsx:152` 仍是无 `disabled`、无 `onMutate` 的裸 `mutate` | ❌ 未解决 |
| P1-6 | 订单发货/备注无 pending | `OrdersView.tsx:137`、`:147` 未改；删订单被挪到行内（:149-163） | 🟡 部分只解决了"删除与保存同级" |
| P1-7 | 弹窗主按钮不判 `isPending` | `ShopView.tsx:329` 仍只判 `!editing.name?.trim()`；`LinesView`/`LiveView` 弹窗同 | ❌ 未解决 |
| P1-8 | 催片弹窗点完即关、失败无提示 | `SeekView.tsx` 未改（`mutate` 后立即 `setUrgeTarget(null)`） | ❌ 未解决（错误现在有全局 toast，但弹窗仍提前关，用户看不到"到底扣没扣"） |
| P1-9 | 错误 toast 2.6 秒消失 | `ui/toast.tsx` 未改 | ❌ 未解决（**且现在所有写操作都靠它，权重比第一轮更高**） |
| P1-10 | 无请求超时，GET 重试 3 次最坏 18s | `client.ts` 只加了布尔参数序列化（:40-52），无 `AbortSignal.timeout` | ❌ 未解决 |
| P1-11 | 转赠（钱）无二次确认 | `AccountView` 已修；`PayView.tsx:130-147` 仍无确认（有 `sending` 保护） | 🟡 部分 |
| P1-12 | 行内复选框无 `onChange` + 冒泡跳转 | `LibraryView.tsx:104`（全选）、`:129-131`（行内）仍是裸 `input`，该 `td` 未 `stopPropagation` | ❌ 未解决 |
| P1-13 | `placeholderData` 显示上一页数据无"陈旧"标记 | 未改；新增的 `/recycle` 也用了 `placeholderData`（`queries.ts:548-570`） | ❌ 未解决 |
| P1-14 | 子查询无错误分支，错误伪装成空 | 概览页两处给了文案（`OverviewView.tsx:148`、`:261`）；直播源（`LiveView.tsx:160-161`）未改；新增页面各自新增了同类问题（回收站"错误当空"、用户详情"错误当权限"） | 🟡 部分，整体未收敛 |
| P1-15 | 401 静默弹回登录页、不读 `next` | `client.ts:91-100` 与 `PlaceholderView.tsx:13-42` 均未改 | ❌ 未解决 |
| P1-16 | 窄屏侧栏图标导航成无名链接 | `Sidebar.tsx:115` 仍是 `<Link>` 无 `aria-label`，`<900px` 靠 CSS 隐藏文字（`components.css:675`） | ❌ 未解决（导航项从 12 增至 13，影响面变大） |

**小结**：P0 2 条彻底解决、2 条部分；P1 2 条彻底解决、4 条部分、10 条未解决。第一轮那条"**Modal 没有焦点陷阱**"至今原封不动——这是本轮确认的最大的未完成项（见 Q4 专项）。

---

## 二、本轮新发现

### P0

**[P0] src/views/AccountView.tsx:208-221 — 「用胡萝卜兑换片单槽位」既无 `isPending` 也无二次确认 — 连点两次扣两次胡萝卜**
按钮调的是裸 `watchApi.slot()`（:211），`onClick` 里 `.then(成功, 失败)`，没有 disabled、没有 busy 文案、没有 confirm。慢链路 2–6 秒无反馈，用户必然再点；两次 `POST /api/watch/slot` = 两次扣费。
失败分支还会猜原因：`() => toast('兑换失败，胡萝卜可能不足', 'error')`（:216）——网络超时也这么说，用户去充值，实际是网断了。
场景：余额 300，兑换一次 200，连点两下 → 余额 0，只多了一个槽位。
修法：改成 `useMutation`（自动获得全局 `onError`），`disabled={mutation.isPending}` + 文案「兑换中…」，前面套 `confirmDialog({ title: '用 200 胡萝卜兑换 1 个片单槽位？', hint: '兑换后不可撤销，余额将从 300 变为 100。' })`；`onSuccess` 里 `session.refetch()` 已有，保留。
同类但影响小：`agreeUpload`（:194）/`agreeDown`（:203）也无 pending，双击会发两次开通请求（幂等，低危）。

### P1 — 新交互隐患 / 错误通道 / 危险动作层级

**[P1] src/views/VideoDetailView.tsx（「移到其他集」弹窗，当前约 :442-491）— 每行一个按钮、无忙碌态、无 loading、无确认、20 个同名按钮**
逐条：
1. **没有忙碌态**：`onClick` 里裸调 `mediaApi.move(...)`（:474-483），按钮无 `disabled`、无"移动中…"。点完 2–6 秒内弹窗纹丝不动，用户会再点一次或换一行点 → 同一资源两个 move 请求，先到的写入、后到的覆盖或报错。
2. **列表没有加载/错误态**：切季时 `moveEpisodes` 重新拉取（`useEpisodes(videoId, moveSeason)`，:62），期间 `(moveEpisodes.data ?? [])`（:465）渲染为空数组 → 白板 2–6 秒，看起来像"这一季没有集"；请求失败同样白板，什么都不说。
3. **每行按钮没有上下文**：`aria-label` 缺失，读屏 20 个按钮全叫「移到这里」（:485）；键盘 Tab 要穿过 20 个同名按钮。
4. **没有二次确认，但 hint 自己承认会花钱**：`hint="传错集会扣两次胡萝卜，用这个把它挪到正确的位置。"`（:445）——既然会扣胡萝卜，就不该点一下就走。
5. `moveEpisodes` 在弹窗关闭时也常驻（顶层 hook），首屏多一次 episodes 请求（与 `episodes` 同 key 时被去重，改季才真发）。
场景：12 集剧，用户误点 E05 的「移到这里」→ 无反馈 → 又点 E05 一次 → 两次移动，胡萝卜扣两遍。
修法：`useMutation` 包 `mediaApi.move`；`busyId` state 控制被点那一行「移动中…」并禁用整列；`moveEpisodes.isLoading` 渲染 `LoadingBlock bare rows={4}`、`moveEpisodes.error` 渲染 `ErrorBlock bare onRetry`；每个按钮 `aria-label={`移到第 ${ep.episode_number} 集 ${ep.episode_title}`}`；点击后先 `confirmDialog`（message 写清"从 S1E1 移到 S1E5，会扣除胡萝卜"）。

**[P1] src/api/queries.ts:584-591 + src/views/UserDetailView.tsx:18、73-79 — 用户详情把"接口失败"渲染成"你没有服务商权限" — 错误伪装成权限（新页面的门面问题）**
`useUserPayInfo` 的 `queryFn` 里 `.catch(() => null)`（:589）把错误吞成 `null`；页面用 `const limited = !pay.isLoading && !info`（:18）判定"没权限"。结果：
- 500 / 超时 / 断网 → `info=null`、`pay.error` 永远为空 → 渲染"当前账号没有服务商权限，看不到余额、观影权限与注册时间"+「申请成为服务商」链接（:75-79）。
- 同一页的 `{pay.error ? <ErrorBlock …/> : null}`（:73）成了**死代码**，永远不触发。
场景：后端 500，管理员看到"你没有服务商权限"，去 /pay 申请开通 → 白折腾；真正的故障没人知道。
修法：删掉 `queryFn` 里的 `.catch`；把 `limited` 改成 `pay.isSuccess && !info`（或仅 404 才判无权限）；错误态交给 `ErrorBlock`。

**[P1] src/views/RecycleView.tsx:91-99 — 回收站加载失败时同时显示「取不到数据」和「回收站是空的」**
`:91` 渲染 `ErrorBlock`，`:94` 的判据是 `!active.isLoading && rows.length === 0`，没有排除 `active.error` → 两个状态块上下叠着出现。
场景：回收站接口 500 → 顶部红块"这一屏没取到数据"，下面大字"回收站是空的"，用户相信了后者，认为删除的内容都没了。
修法：`{!active.error && !active.isLoading && rows.length === 0 ? …}`（第一轮 `LibraryView.tsx:90`、`SeekView.tsx:70` 就是这么写的，照抄即可）。

**[P1] src/main.tsx:12-19 + 5 处本地 `onError` — 全局错误提示上线后，5 处会弹两条 toast**
全局 `MutationCache.onError` 对所有 mutation 生效，而这些地方仍保留自己的 `onError`：
`WatchlistsView.tsx:59`（创建片单）、`WatchlistDetailView.tsx:52`（订阅）、`SongDetailView.tsx:32`（收藏）、`RecycleView.tsx:42`、`:60`（两处 `catch` 里 toast）。
场景：点收藏失败 → 屏幕右下角同时冒出「操作失败」和「xxx（500）」，两条都在 2.6 秒后消失，用户只看到一串闪过。
修法：二选一——要么本地只做回滚/内联红字，把文案交给全局；要么给这些 mutation 加 `meta: { silent: true }`，全局 `onError` 里 `if (mutation.meta?.silent) return`。**不要两套并存。**

**[P1] src/views/RecycleView.tsx:39-45、56-63 — `catch` 里猜原因（"可能没有权限"），把 5xx 和断网说成权限问题**
`toast('恢复失败，可能没有权限', 'error')` / `toast('恢复失败', 'error')`，`status` 被吞掉。全局 onError 的 `message（status）` 反而更准确。
场景：恢复时断网 → 用户被告知"可能没有权限"，去找管理员要权限。
修法：直接 `await actions.restoreMedia.mutateAsync(...)` 不 try/catch（让全局报错），只保留 `finally { setBusy(null) }`。

**[P1] src/api/queries.ts:580 — 「恢复影片」复用了删除接口，语义待核实**
`restoreVideo: useMutation({ mutationFn: (videoId) => videoApi.remove(videoId) })`，而 `videoApi.remove` 打的是 `PUT /api/video/{id}/delete`；`docs/api-inventory.md:115` 里这个端点就是"删除"，没有独立的 restore。返回值带 `is_delete`，像是 toggle —— **如果后端不是 toggle，点「恢复」等于再删一次**（或 4xx 后静默）。
场景：回收站点「恢复」，toast 说"已恢复"，刷新后影片还在回收站里（或彻底没了）。
修法：前端至少要校验返回值 `is_delete === false` 才 toast 成功（`remove` 的返回类型里本来就有这个字段）；更稳妥是确认后加 `videoApi.restore`（`PUT /api/video/{id}/restore`）或让后端明确 toggle 语义。

**[P1] src/views/OverviewView.tsx:105、:193-198、:42 — 概览页三处错误无声，且其中两处会显示成"假数据"**
- `:105` `formatThousand(carrot.data?.carrot ?? session.data?.carrot ?? 0)`：胡萝卜接口失败 → **显示 0 个胡萝卜**（用户以为余额被清空）。
- `:193-198` `{!stats.data ? <skeleton/> : null}`：观影统计失败 → **永久骨架**，看起来在加载，其实永远加载不完。
- `:42` `ready = session.isFetched && Boolean(session.data)`：session 失败 → 四个卡片永远「读取中」，没有错误提示。
- `carrotHistory.error`、`stats.error`、`session.error` 全站唯一没接的几张卡就在这页（页面其余两处 `watching.error`/`myWatches.error` 反而接了，说明作者知道该接）。
场景：/carrot/current 超时 → 首页大大的「0 个」，用户去充钱；「我的近况」永远转圈。
修法：`carrot.error` → 值显示 `—` + 小字「余额读取失败，点这里重试」；`stats.error` → 换成一句话错误 + 重试按钮（别用骨架）；`session.error` → 顶部一条提示条。

**[P1] src/views/OrdersView.tsx:137-158、src/views/ShopView.tsx:148-180、src/views/WatchlistsView.tsx:164-190 — 删除类动作与常规动作完全同级渲染（Q5 的直接答案）**
三处行尾都是同一组 `.btn--quiet`：订单「发货 / 备注 / **删除**」、商品「下架 / 编辑 / **删除**」、片单「**删除**」。再叠加新规则 `.table .btn { padding: 0; border: 0; color: var(--fg-3) }`（`components.css:1174-1179`）——**它们在视觉上就是三四个一模一样的灰色文字**，删除没有任何区分。
更糟：`components.css` 里 `.table .btn`（0,2,0）比 `.btn--danger`（0,1,0）优先级高，**现在给表格里的删除按钮加 `btn--danger` 也不会变红**（hover 也被 :1180 的 `.table .btn:hover` 覆盖）。
页头同理：`VideoDetailView.tsx:90` 的「删除」是 `.btn--danger-text`（`components.css:1199-1207`），默认色 `--fg-3`，只在 hover 变红——触屏没有 hover，等于永不显红。它和「返回列表」「同步」并排在同一行（:80-103）。
场景：手机上行尾三个文字，手指点「备注」偏 20px 点到「删除」→ 弹确认框；习惯性点「确定」→ 订单没了。
修法：① 行尾只保留 1 个主操作 + 1 个「更多」菜单，删除收进菜单；② 若坚持平铺，用 `.table .btn--danger { color: #ff9a7a }` 这类更高优先级规则（别忘了 `border: 0` 之外的 `padding` 要还回来）；③ 页头删除左移、用真实按钮形态而不是纯文字。

### P2

**[P2] src/components/Pager.tsx:51 — 页码仍是死按钮**（`<button aria-current="page">` 无 `onClick`，能 Tab 到、能按、无事发生）。第一轮已报，未改。

**[P2] src/components/Pager.tsx:57-73 — 跳页输入仍只在"总页数 > 5"时出现，`onBlur` 仍会提交**（输入到一半点别处就跳页）。

**[P2] src/views/LibraryView.tsx:129-131、:104 — 复选框仍是假控件，且点击仍冒泡到行 → 跳详情**（只有末列 `td` 加了 `stopPropagation`，见 :168）。场景：用户想勾 3 部片子，每勾一次被弹到详情页。

**[P2] src/views/LibraryView.tsx:116-128 — 行 `role="link"` 没有可访问名称，且内部嵌了 3 个可聚焦控件**（行本身 + 复选框 + 行尾按钮）。读屏会把整行 6 列文字（含"#1234 · todb 5678 · 原名"）念成链接名；`role="link"` 里套 `checkbox` 属于嵌套交互控件。建议：去掉 `role`/`tabIndex`，改成把片名做成 `<Link>`（第一轮建议的 a 方案），行内其余控件保持自然 Tab 序。

**[P2] src/views/MusicView.tsx:111-115 — 歌曲行仍是裸 `onClick`，无 `tabIndex`/`onKeyDown`**（专辑/歌手行不可点但光标样式不同，读屏无法区分）。同类：`WatchlistsView.tsx:129`、`LiveView.tsx:90`。

**[P2] src/views/MusicView.tsx:148-161 — 行尾「⋯」的 `aria-label` 仍是「操作」，且点它是"同步"不是"更多"**（`actions.sync.mutate`）。同一图标在媒体库表示"打开详情"，在这里表示"同步"，**同一个视觉承担两种语义**，用户无法预测。

**[P2] src/views/SongDetailView.tsx:27-37 — 「收藏」无 pending、无状态回显、失败时双 toast**：按钮永远写"收藏"，点完不知道当前是否已收藏；`onError` 与全局重复（见第二节「双 toast」条）。建议：`isPending` 禁用 + 图标/文案切换「已收藏」，`onSuccess` 后乐观取反。

**[P2] src/views/SeekView.tsx:125-128、src/views/UploadView.tsx:201-204 — 新加的两个导航用裸 `<a href>`，绕开路由 → 整页刷新**
`<a className="btn btn--quiet" href="/upload">去上传</a>`、`<a href={`/media/${id}?season=1&episode=1`}>查看</a>`。慢链路上一次整页刷新 = 白屏 3–6 秒 + QueryClient 缓存全丢 + 侧栏重新挂载。
修法：换 `<Link to="/upload">` / `<Link to="/media/$videoId" params=… search=…>`。

**[P2] src/styles/components.css:459-465 + :468-479 — 粘性表头实际不生效**
`.table thead th{position:sticky;top:0}` 的最近滚动祖先是 `.table-card`（`overflow:auto`，:464），但 `.table-card` 没有 `max-height`，自身不产生纵向滚动；真正滚动的是 `.page`（:151-156）。sticky 不会跨出最近的滚动容器 → 表头照旧随页面滚走。
场景：媒体库翻到第 5 页往下滚，表头消失，几列数字分不清哪个是资源数。
修法：`.table-card{max-height:calc(100dvh - 240px);overflow:auto}`（让卡片自己滚），或把横向滚动从 `.table-card` 拆到一个内层 `.table-x` 上，让 sticky 重新绑到 `.page`。

**[P2] src/styles/components.css:685 + :1161-1162 — 窄屏卡片内表格仍会被裁**（详见复核表 P0-4）：`VideoDetailView.tsx:240/298`、`SongDetailView.tsx:70/104`、`AccountView.tsx:340/363/382/430`、`UploadView.tsx:227` 的表格都没有 `.card-body` 容器。修法：给这些 `<article className="card">` 内的表格套 `<div className="card-body">`（已有样式，零成本）。

**[P2] src/views/OverviewView.tsx:81、:136、:251、:299 与 src/views/UserDetailView.tsx:83、:118 — 行内 `gridTemplateColumns` 在 900px 断点仍会赢**
`components.css:660` 在 ≤1240px 用了 `!important` 压住行内样式，但 `:683` 的 ≤900px 规则**没有 `!important`** → 手机上概览页第一排仍是 4 列（每列 ~72px），"我的胡萝卜"数字被挤成竖排。
修法：900px 规则同样加 `!important`，或把行内 `gridTemplateColumns` 换成 `.cards--four` / `.cards--two` 类。

**[P2] src/components/WatchHeatmap.tsx（整个文件，112 行）— 没有任何地方引用它**
`grep WatchHeatmap src` 只有组件自身；概览页自己画了 7 根柱子（`OverviewView.tsx:204-224`）。死代码，且它自己也只用 `onMouseEnter` + `title` 展示单日时长（:74-76），键盘/读屏拿不到数据。要么接进页面并把 `title` 换成可聚焦元素，要么删掉。

**[P2] src/views/AccountView.tsx:190-207 — 权限开通按钮无法表达"正在开通"**：`agreeUpload`/`agreeDown` 无 `isPending`、无禁用；成功后靠 `invalidateQueries` 让按钮消失（2–6 秒延迟其间按钮还在，可再点）。建议 `disabled={mutation.isPending}` + 文案「开通中…」。

**[P2] src/views/UserDetailView.tsx:12、:17、:90 — 封禁名单查询失败时显示"账号状态：正常"**
`bans.error` 未接，`banned = (bans.data ?? []).find(...)`（:17）在失败时恒为 `null` → 卡片写"正常"、`stat__delta` 写"不在封禁名单里"，页头还会显示「封禁」按钮。
场景：/ban/list 超时，管理员看到某已被封用户"状态正常"，去封禁 → 才报错。
修法：`bans.error` → 该卡显示「封禁状态未知」+ 重试；`banned` 判定加 `bans.isSuccess`。

**[P2] src/views/UserDetailView.tsx:81-185 — 没有统一加载态，全靠零散"读取中/检查中"**（:90、:166）。建议 `pay.isLoading` 时给主体一个 `LoadingBlock bare`，而不是让四张卡各自显示 `—`。

**[P2] src/ui/confirm.tsx:27-37 — 并发 `confirmDialog` 会吞掉前一个 Promise**
`open()` 里直接 `current.current = next`，第二次调用覆盖第一次的 `resolve` → 第一次 `await` 永远不返回（其 `onClick` 闭包挂着，那次操作永不发生）。
场景：两个删除按钮各点一下（或双击同一按钮），只执行第一个确认框对应…实际是第二个；第一次点击被静默丢弃。
修法：`if (current.current) return Promise.resolve(false)`（排队或拒绝新请求）。

**[P2] src/ui/confirm.tsx:82 — 危险确认键仍带 `autoFocus`**：确认框一出现焦点就在红色「删除」上，用户习惯性按 Enter（或触摸键盘的回车）即确认。建议聚焦到对话框容器（`tabIndex={-1}`）而不是动作键。

**[P2] src/views/AccountView.tsx:211（`watchApi.slot`）、VideoDetailView.tsx（「移到其他集」里的 `mediaApi.move`）、WatchlistsView.tsx:181（`watchApi.remove`）、PayView.tsx:136（`carrotApi.transfer`）— 全局错误通道有洞：这 4 处绕过 `useMutation` 直接调 API**
`watchApi.slot()`、`mediaApi.move()`、`watchApi.remove()`、`carrotApi.transfer()` 都是裸 Promise，`MutationCache.onError`（`main.tsx:12-19`）**管不到它们**，只能靠各自的 `catch`。这正好解释了为什么本轮新写的三处交互（兑换槽位、移到其他集、删片单）仍然是通用/猜测式文案。
修法：统一包成 `useMutation`，或抽一个 `runAction(promise, { action })` 走同一套错误映射——否则"全站错误提示统一"这件事只做了一半。

**[P2] src/ui/toast.tsx:11-12、:42 — 仍未改**：错误 2.6s 消失、不可关闭、不暂停、`role="status"`（polite）。第二轮把**所有**写操作错误都压到了这一条通道上，权重比第一轮更高。建议：error 8s 或常驻 + 关闭按钮；`role="alert"`。

**[P2] src/api/client.ts:50-69 — 仍无请求超时**：GET 3 次重试 + 2–6s/次，最坏 ≈18.9s 纯骨架屏；挂死的连接永不失败。建议 `AbortSignal.timeout(12_000)` 并映射到 `status: 0`。

**[P2] 概览页骨架屏没有可访问信号**：`OverviewView.tsx:146/195/260` 是裸 `div.skeleton`，无 `aria-busy`、无 `aria-live`；`<LoadingBlock>` 有（`StateBlock.tsx:5`）。"加载态只留骨架"对视力正常用户没问题，但读屏用户完全收不到"正在加载"。

**[P2] src/styles/components.css:1174-1184 — `.table .btn{padding:0;border:0}` 让表格内所有按钮失去盒子**：回收站的「恢复」、订单的「发货/备注/删除」等，触控目标只剩 ~14px 高的文字（远低于 44px）。第一轮的"触控目标过小"问题在表格里被放大了。

---

## 三、四态覆盖表（18 页）

图例：✅ 有且文案清楚 · 🟡 有但缺分支/文案弱 · ❌ 没有 · 失败重试 = `ErrorBlock` 是否带 `onRetry`

| 页面 | 加载 | 空 | 错误 | 失败重试 | 权限不足 | 说明 |
|---|---|---|---|---|---|---|
| 总览 `/` | 🟡 | ✅ | 🟡 | ❌ | ❌ | 只有 `watching`/`myWatches` 有错误文案且无重试；`carrot`/`stats`/`session`/`carrotHistory` 无声（见第二节「概览页」条）；骨架无 `aria-busy` |
| 媒体库 `/library` | ✅ | ✅ | ✅ | ✅ | ❌ | 仍是三态范式页；缺权限提示 |
| 影片详情 `/media/$id` | ✅ | ✅ | 🟡 | ✅ | ❌ | 新增「找不到这部影片 + 回媒体库」（`VideoDetailView.tsx:111-121`）✅；字幕区（:298-300）、季/集（:184、:203）仍只有空/有数据，无错误态；「删除」对所有人生效 |
| 求片 `/seek` | ✅ | ✅ | ✅ | ✅ | 🟡 | 无权认领时按钮静默变「催片」；新增「已认领 → 去上传」（:125-128，裸 `<a>`） |
| 片单 `/watchlists` | ✅ | ✅ | ✅ | ✅ | ❌ | 槽位改为真实值（`WatchlistsView.tsx:72`）✅；新建仍不判槽位 |
| 片单详情 `/watchlists/$id` | ✅ | ✅ | 🟡 | ✅ | ✅ | **新增「你不是维护者，只能查看和搜索」（:113-117）——本轮唯一的完整权限说明**；候选搜索失败仍静默；片单不存在时仍空白 |
| 上传 `/upload` | ❌ | ✅ | 🟡 | ❌ | 🟡 | `disks`/`storeFiles`/`candidates` 三个查询都没有加载态；`storeFiles` 的错误块仍无 `onRetry`（:241）；无上传权限时仍可选文件 |
| 直播 `/live` | ✅ | ✅ | 🟡 | ✅ | ❌ | `list` ✅；`library`/`media` 无错误态（:160-161）→ 失败显示"0 个源" |
| 商城 `/shop` | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 商品 ✅；分类失败→空白（:237-238）、无空态；店铺 404 无空态（:276-292）；非卖家按钮消失但无说明；新增删除商品（:163-179）✅ |
| 订单 `/orders` | ✅ | ✅ | ✅ | ✅ | ❌ | 三态齐；发货/备注仍无 pending |
| 线路 `/lines` | ✅ | ✅ | ✅ | ✅ | 🟡 | 非本人线路显示「—」，无解释 |
| **回收站 `/recycle`** | ✅ | 🟡 | ✅ | ✅ | 🟡 | 空/错**同时显示**（见第二节「回收站」条）；行内 `title="不是自己上传的资源，无法恢复"` 是鼠标专属解释（:144）；`placeholderData` 会显示上一页 |
| **音乐 `/music`** | ✅ | ✅ | ✅ | ✅ | ❌ | 三态齐；列表无收藏入口（收藏只在歌曲详情）；歌曲行无键盘入口 |
| 歌曲详情 `/music/song/$id` | ✅ | ✅ | ✅ | ✅ | ❌ | 歌词/资源三态齐；收藏无 pending/无回显 + 双 toast |
| **支付 `/pay`** | 🟡 | ✅ | ✅ | ✅ | ❌ | 404 有专门说明（`PayView.tsx:43-51`，全站最佳）；转赠仍无二次确认；卡片用 `—` 占位 |
| 账号 `/account` | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 只有 `session.error` 被接（:98）；`info`/`inviteHistory`/`carrotHistory`/`bans`/`carrot` 全静默；新增能力面板 + 开通入口（正向权限展示）✅ |
| **用户详情 `/users/$id`** | ❌ | ❌ | ❌ | ❌ | 🟡 | **接口失败被渲染成"没有服务商权限"**（见第二节「用户详情」条），`ErrorBlock` 是死代码；`bans` 失败显示"状态正常"；无骨架；无"用户不存在"空态 |
| 登录 `/login` | ❌ | — | ❌ | ❌ | — | 令牌无效仍静默弹回，不读 `?next` |

**汇总（18 页）**：加载 ✅ 12 / 🟡 3 / ❌ 3；空 ✅ 13 / 🟡 3 / ❌ 1（登录页不适用）；错误 ✅ 9 / 🟡 7 / ❌ 2；**失败重试 ✅ 14 / ❌ 4**（总览、上传、用户详情、登录）；**权限不足 ✅ 1 / 🟡 7 / ❌ 10**。

**针对 lead 点名的四页**：
- `/recycle`：加载/错误/重试齐 ✅，**空态与错误态打架**（见第二节「回收站」条），权限只有行内 `title`。
- `/users/:id`：**四态里三个是坏的**——没有骨架、没有"用户不存在"、错误被伪装成权限；唯一的权限文案不是"你没权限"而是"你没服务商权限"，且会误报。
- `/music`：四态齐 ✅（这页最稳），但无权限概念、无收藏入口、行不可键盘进入。
- `/pay`：空态/错误态是标杆 ✅，权限与二次确认是空白。

---

## 四、键盘与焦点现状（Q4 直接回答）

> **结论：焦点陷阱（focus trap）完全没有——不止 Modal，Confirm 也没有。Esc 只有 Confirm 有，Modal 没有。弹窗表单的 Enter 提交仍然没有（`Modal` 不是 `<form>`）。**

| 检查项 | 现状 | 证据 |
|---|---|---|
| Modal 有焦点陷阱吗 | ❌ **没有** | `Modal.tsx` 全文 33 行，无 keydown、无 ref 循环、无 `inert`、无禁止背景 Tab |
| Modal 能 Esc 关闭吗 | ❌ **不能** | 全仓 `Escape` 只出现 1 次，在 `ui/confirm.tsx:48` |
| Confirm 能 Esc 吗 | ✅ 能 | `confirm.tsx:48` |
| Confirm 有焦点陷阱吗 | ❌ 没有 | 同 Modal：Tab 可跑到遮罩后面 |
| 弹窗表单 Enter 提交 | ❌ 不能 | `WatchlistsView.tsx:172-204`、`LinesView.tsx:128-172`、`ShopView.tsx:298-380`、`AccountView.tsx:434-500` 都不是 `<form>`；在「名称」输入框敲回车无反应 |
| 关闭后焦点归还 | ❌ 没有 | 全仓没有 `.focus()` 调用；关闭后焦点落回 `body` |
| 背景内容对 AT 隐藏 | ❌ 没有 | 无 `inert`；`aria-modal="true"` 对 VoiceOver/NVDA 的浏览器实现不总是生效 |
| `aria-describedby` 关联 hint | ❌ 没有 | `Modal.tsx:20` 只有 `aria-label={title}`，`hint`（往往是"不可撤销"这类关键信息）没被关联 |
| 路由切换焦点 | ❌ 没有 | `AdminLayout.tsx:13-15` 只做了滚动复位，没有把焦点挪到 `h1`；无 skip link |
| 列表行键盘 | 🟡 仅媒体库 | `tabIndex` 全仓 1 处（`LibraryView.tsx:118`） |
| 输入框焦点环 | 🟡 改善了但仍是"颜色变化" | `.input{border-color:0.16}` / `.input:focus{border-color:0.4}`（`components.css:622-635`），`outline` 仍被吃掉；6 输入框的弹窗里靠边框深浅找焦点 |
| `⌘K` | ❌ 仍无快捷键 | 侧栏搜索框现在真的能用了（`Sidebar.tsx:88-101`，回车跳 /library）✅，但 `kbd` 提示仍是装饰（:102-103） |

**最小修法（一个文件覆盖 9+ 个弹窗）**：`Modal.tsx` 加三件事——① `useEffect` 监听 Escape → `onClose`；② 挂载时 `document.activeElement` 存起来 + 聚焦 `modalRef`，卸载时 `prev.focus()`；③ `onKeyDown` 里做 Tab 循环（或直接给 `.modal-overlay` 后面的兄弟加 `inert`，Chrome/Safari 都已支持）。再把 footer 主按钮包进 `<form onSubmit>` 就能拿到 Enter 提交。

---

## 五、危险操作分布（Q5 直接回答）

本轮 `confirmDialog` 调用点从 12 处增至 **20 处**（`grep` 计数），覆盖率不错。按"入口位置 × 是否与常规动作同级"列一遍：

| 位置 | 动作 | 有确认 | 与常规动作同级？ | 视觉是否区分危险 |
|---|---|---|---|---|
| `VideoDetailView.tsx:90` | 删除影片 | ✅ | **是**（页头与「返回列表」「同步」并排） | 🟡 `.btn--danger-text` 默认灰、仅 hover 变红 → 触屏永不显红 |
| `VideoDetailView.tsx`（资源弹窗内） | 删除资源 | ✅ | 是（弹窗内与「复制地址」「同步元数据」「移到其他集」同排，靠 `marginLeft:auto` 隔开） | ✅ `btn--danger` |
| `VideoDetailView.tsx`（字幕弹窗内） | 删除字幕 | ✅ | 是（与「保存」同排） | ❌ 用的是 `btn--ghost` |
| `VideoDetailView.tsx`（「移到其他集」弹窗） | 移到其他集（扣胡萝卜） | ❌ | 是（每行一个） | ❌ `btn--quiet` |
| `OrdersView.tsx:149-163` | 删除订单 | ✅ | **是**（行尾与「发货」「备注」并列，三个同款灰字） | ❌ 完全无区分（`.table .btn` 压制了 danger 色） |
| `ShopView.tsx:163-179` | 删除商品 | ✅ | **是**（行尾「下架/编辑/删除」） | ❌ 同上 |
| `ShopView.tsx:246-266` | 删除分类 | ✅ | 是（列表行尾） | ❌ 同上 |
| `WatchlistsView.tsx:170-188` | 删除片单 | ✅ | 是（行尾，单独一列稍好） | ❌ 同上 |
| `AccountView.tsx:208-221` | **兑换槽位（扣胡萝卜）** | ❌ | 是（账号页 5 个并列按钮中间） | ❌ |
| `AccountView.tsx:577-583` | 转赠胡萝卜 | ✅ 本轮已补 | 是（弹窗内） | ✅ `btn--primary` + 确认框 danger |
| `PayView.tsx:130-147` | 转赠胡萝卜 | ❌ | 是（卡片内与输入框并排） | ✅ `btn--primary` |
| `AccountView.tsx:462` | 解除封禁 | ✅ | 是 | ❌ |
| `UserDetailView.tsx:33-47` / `:49-67` | 解除封禁 / **封禁** | ✅ | **是**（页头与「封禁列表」导航链接完全同级，都是 `btn--ghost`） | ❌ |
| `RecycleView.tsx:30-35` / `:49-53` | 恢复（可能扣胡萝卜） | ✅ | 是（行尾唯一动作，可接受） | ✅ |
| `LiveView.tsx:116` / `:180` | 删除频道 / 源 | ✅ | 是（行尾） | ❌ |
| `LinesView.tsx:96` | 删除线路 | ✅ | 是（行尾） | ❌ |
| `SongDetailView.tsx:41` | 删除歌曲 | ✅ | 是（页头三连，与「收藏」同级） | ❌ 用 `btn--ghost` |
| `AccountView.tsx:312` | 撤销邀请 | ✅ | 是（行尾） | ❌ |
| `OrdersView` 备注弹窗 | 已移出（本轮修好） | — | — | — |

**结论**：确认框覆盖得不错（18 类动作里 15 类有确认，只剩 3 处没有：移到其他集、兑换槽位、`PayView` 转赠）。真正的问题是**渲染层级**——这 18 类里有 17 类直接与常规动作并排，其中 6 处（订单/商品/分类/片单/频道/源的删除）连颜色都没有，因为 `.table .btn` 把所有表格内按钮统一成灰字（`components.css:1174-1180`）。**给它们加 `btn--danger` 现在也不会生效**，这条 CSS 必须先修。

---

## 六、只改 5 处的话，先改这 5 处

按"每分钟能挽回多少损失 + 改动有多小"排序：

1. **`src/views/UserDetailView.tsx:18` + `src/api/queries.ts:589` —— 让"接口失败"不再显示成"没有服务商权限"。**
   删掉 `queryFn` 里的 `.catch(() => null)`，把 `limited` 改成 `pay.isSuccess && !info`。两行改动，直接消灭本轮最容易误导人的一类信息（管理员会照着这句话去申请开通），顺带让那个死掉的 `ErrorBlock` 活过来。同页 `bans.error` 一起接（"封禁状态未知"）。

2. **`src/views/AccountView.tsx:208-221 —— 兑换槽位加 `isPending` + 二次确认。**
   和第一轮的转赠是同一类问题（钱 + 无 pending + 无确认），是仅剩的 P0。改成 `useMutation` 后还能免费拿到全局错误提示，顺手删掉那句会误导读者的"胡萝卜可能不足"。

3. **`src/styles/components.css:1174-1184` + 三个删除按钮 —— 让危险动作在行尾可辨认。**
   先给 `.table .btn--danger` 加一条优先级更高的规则（否则加 class 无效），再把订单/商品/片单的「删除」改成 danger，或统一收进「⋯」菜单（`MusicView` 的 `row-menu` 已经是现成范式）。OPC 上"误点删除"是唯一会丢数据的路径，而它现在的视觉权重和「备注」一样。

4. **`src/views/VideoDetailView.tsx`（「移到其他集」弹窗）—— 补忙碌态、加载/错误态、每行可区分的名字。**
   本轮唯一"新写的、会花胡萝卜、且完全无反馈"的交互：`busyId` + `disabled` + 「移动中…」，`moveEpisodes.isLoading` → `LoadingBlock bare`，`aria-label` 带上集号，点击前套确认。同一个模式可以照搬到 `/recycle` 的恢复（那里已经做对了，正好互为参照）。

5. **`src/components/Modal.tsx` —— Esc 关闭 + 焦点陷阱 + 关闭归还焦点（lead 明确问的这条）。**
   33 行文件、9+ 个弹窗一次性受益。这是第一轮就报过、第二轮仍未动的唯一"整站级"可达性缺陷：现在键盘用户在任何一个弹窗里按 Esc 没反应、Tab 会跑到弹窗背后的侧栏、关掉后焦点丢在 `body`。

> 第 6 顺位（如果还有余量）：① 把 5 处"本地 onError + 全局 onError"的双 toast 收掉（`main.tsx:12-19` 加 `meta.silent`）并把 4 处裸 API 调用收进 `useMutation`；② `OverviewView.tsx:105`（错误显示成 0 个胡萝卜）与 `:193-198`（错误永久骨架）。这两条不需要设计决策，纯收敛。

---

## 附：判定口径

- 每个页面必查四态 + 第 5 项：`ErrorBlock` 是否带 `onRetry`（"失败重试"是 lead 本轮新增的检查项）。
- **空态必须排除 `error`**：`data && length === 0` 但没排除 `error` → 记 🟡/❌（回收站就是这条的新样本）。
- **权限不足**：403 / `is_can_*` 为假 / `is_self` 为假时，用户能否知道"我没有这个权限"以及"怎么获得"；只说 `—` 不算。
- **危险动作**：是否有确认 **且** message（后果）+ hint（可恢复性）两层 **且** 与常规动作在视觉/位置上可区分。
- **新交互**：只看"点了之后 2–6 秒内发生什么"——有没有让人知道点击已被接收（忙碌态），有没有让人知道失败了（错误态），连点会不会出事。

## 附：本轮工作区状态

审查期间 `src/views/VideoDetailView.tsx`、`src/views/WatchlistDetailView.tsx`、`src/styles/components.css` 有未提交改动（且仍在变），**影片详情页的行号可能已漂移**——该文件的结论请以「弹窗/区块」描述为准（新增 `.btn--danger-text`、影片详情空态、片单详情权限提示）；本文按当前工作区内容判定，若这些改动被回退，`P1-1`、`P1-3` 的表述需要相应下调。`src/ui/toast.tsx`、`src/components/Modal.tsx`、`src/components/StateBlock.tsx`、`src/components/Pager.tsx` 在第一轮之后**没有任何改动**（`git diff --stat` 为空）。
