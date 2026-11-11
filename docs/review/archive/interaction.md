# 交互与可达性审查 · EMOS 管理台

审查对象：`src/views/*.tsx`、`src/components/*.tsx`、`src/ui/*.tsx`、`src/router.tsx`（含 `src/styles/*.css` 中影响交互的规则）
方式：只读代码审查，未启动浏览器、未改 `src/`
前提：单请求 2–6 秒、偶发超时。所有判断按"慢链路"场景校准——**反馈延迟是常态，不是异常**。
审查基线：`HEAD 9474275`（工作区此刻有其他改动，见文末「并发改动」；本文行号均以基线为准）。


**目录**：P0（4 条）· P1（16 条）· P2（25 条）· [四态覆盖表](#四态覆盖表) · [写操作失败提示体检](#写操作失败提示体检q1-的关注点) · [危险操作确认盘点](#危险操作确认盘点q3) · [键盘与焦点](#键盘与焦点q4) · [移动端](#移动端q5) · [可访问性清单](#可访问性清单q6) · [乐观更新建议表](#乐观更新与重复提交建议表q2) · [只改 5 处](#只改-5-处的话先改这-5-处)

## 一句话结论

四个状态里，**加载 / 空 / 错误**在列表页基本齐了（`StateBlock` 用得不错、`PayView` 的 404 文案是全站标杆），但
**权限不足 = 0 个页面有**；**错误文案分三档**：25 处写操作失败时**完全没有提示**，14 处只有「XX失败」这类通用动词，只有 3 处（上传归档、支付转赠、片单创建）把服务端的原因带给了用户。
最要命的三件事：confirm 的 Enter 会误触发危险操作、转赠胡萝卜连点两下会扣两次、键盘用户进不去任何列表详情页。

---

## P0 — 会丢数据 / 会误删 / 会扣钱 / 功能对某类用户完全不可用

**[P0] src/ui/confirm.tsx:45-53 — 全局 `keydown` 无条件把 Enter 当成"确定" — 用户 Tab 到「取消」上按 Enter，危险操作照样执行**
`useEffect` 里 `window.addEventListener('keydown')`，`if (e.key === 'Enter') settle(true)` 不判断事件目标。Enter 在 button 上会"先 keydown（冒泡到 window → 解析 Promise 为 true）、后 click（`settle(false)` 时 `current` 已被清空，无效果）"。
场景：删除影片页，用户想稳妥一点，Tab 到「取消」确认自己没点错，敲 Enter —— 影片被删。全部 12 处 `confirmDialog` 调用（删影片/删资源/删字幕/删线路/删频道/删源/删订单/删分类/删歌曲/移出片单/撤销邀请/解除封禁）全部受影响；另 2 处转赠胡萝卜连确认框都没有。
修法：把确认收敛到按钮自身，不要监听全局——
- 删掉 `window` 上的 Enter 分支，改成 `<div className="confirm" onKeyDown={(e) => { if (e.key === 'Enter' && e.target === confirmBtnRef.current) settle(true) }}>`；
- 或者更好：把 Confirm 内部换成 `<form onSubmit>` + 确定键 `type="submit"`、取消键 `type="button"`，浏览器天然只对表单提交响应 Enter；
- `autoFocus` 不要放在危险确认键上（:78），改为聚焦在对话框容器并 `aria-describedby` 指向 message。

**[P0] src/views/AccountView.tsx:512-529 — 「转赠」按钮只判断输入合法性，不判断 `isPending` — 连点两次 = 扣两次胡萝卜**
`disabled={!transferTo.trim() || transferAmount < 2}`（:514），没有 `actions.transfer.isPending`。慢链路下点完到成功有 2–6 秒完全无反馈，用户几乎必然会再点一次；两次 POST 都带同一 `{userId, carrot}`，后端若不做幂等就是两笔转出。
场景：转 500 胡萝卜，以为没点上，再点一次 → 余额少 1000，对方多收 1000，且「转账后不可撤回」。
修法：`disabled={... || actions.transfer.isPending}`，按钮文案切 `转赠中…`；`onSuccess` 里 `setTransferTo('')` 已有，补 `invalidateQueries(['carrot'])`。对照 `src/views/PayView.tsx:130-147`——那里有 `sending` state 做同样的事，属于正确示范，两处应统一（`PayView` 那份还应抽成共享的 `useSubmitGuard`）。
另外这处**完全没有二次确认**，钱款类操作应补 `confirmDialog`（见 P1 第 11 条）。

**[P0] src/views/LibraryView.tsx:128-137、179-181 — 列表行只能鼠标点，行内唯一的按钮是死按钮 — 键盘用户没有任何路径进入影片详情**
`<tr onClick={() => navigate(...)}>` 没有 `tabIndex`/`onKeyDown`/`role`（全仓 `tabIndex` 出现次数 = 0）；右侧 `row-menu` 按钮（:179）带 `aria-label="《…》的更多操作"` 但**没有 `onClick`**，点它只会冒泡触发整行跳转。
场景：只用键盘的运营同学在 /library 想打开一部片子 → Tab 只能走到「全选本页」复选框和「更多操作」，Enter 后一个没反应、前一个直接跳走且无法返回同一页；读完详情后只能靠浏览器后退。
同类：`src/views/WatchlistsView.tsx:124-128`、`src/views/LiveView.tsx:90`、`src/views/MusicView.tsx:111-115`（音乐列表还有"行可点跳详情"但专辑/歌手行不可点，同样的鼠标样式差异对读屏完全不可感知）。
修法：a) 行内放一个真链接——把片名 `cell-title__name` 换成 `<Link to="/media/$videoId">`（最省事，且支持 Ctrl/中键新标签页）；b) 或给 `<tr>` 加 `tabIndex={0} role="link"` + `onKeyDown` 处理 Enter/Space。b 方案记得给有 `onClick` 的行加 `.row--interactive:focus-visible` 可见焦点。顺手把 `row-menu` 的 `onClick` 补上（并 `stopPropagation`）。

**[P0] src/styles/components.css:684-685 + src/styles/components.css:154 — 窄屏下"卡片里的表格"没有横向滚动容器，被直接裁掉 — 手机上操作列完全不可达**
`@media (max-width:900px)` 只给 `.table-card` 加了 `overflow-x:auto`、给 `.table` 加了 `min-width:820px`；而 `.card`（组件内表格）和 `.page { overflow-x:hidden }` 会把这 820px 裁掉。
受影响：`src/views/VideoDetailView.tsx:238`（资源表）、`:281`（字幕表）、`src/views/SongDetailView.tsx:109`、`src/views/AccountView.tsx:230`（邀请记录）、`:328`（胡萝卜记录）、`:375`（封禁列表）、`src/views/UploadView.tsx:242`（暂存区）。
场景：iPhone 竖屏打开影片详情，资源表的「操作」列（重命名/删除）整列在视口外且**滚不过去**——页面级横向滚动被 `overflow-x:hidden` 掐死。
修法：抽一个 `<TableScroll>` 容器（`overflow-x:auto; -webkit-overflow-scrolling:touch`）套住所有 `.table`，而不是只给 `.table-card` 加；或者 `.card` 内表格改用 `<div class="table-scroll">`。

---

## P1 — 会让人做错决定、会重复提交、出错后不知道该怎么办

**[P1] src/components/StateBlock.tsx:1-73（全站）— 没有"权限不足"态，403/无权限被塞进通用 ErrorBlock**
只有 `LoadingBlock` / `EmptyBlock` / `ErrorBlock` 三个。`ErrorBlock`（:57-62）对 403 的文案是兜底的「接口返回了错误。如果是权限问题，请联系管理员。」——把判断权丢给了用户。
真实的无权限场景全被"按钮消失"掩盖：`LiveView.tsx:111,153,176`（`is_can_edit`）、`WatchlistDetailView.tsx:122,176`（`is_edit_video`）、`SeekView.tsx:125`（`is_can_claim`）、`ShopView.tsx:92,147`（`isSeller`）、`LinesView.tsx:110`、`OrdersView.tsx`、`AccountView.tsx:368`（封禁 tab 对普通用户也可见）。
场景：运营同学打开别人建的片单，操作列是「—」，页面没有任何一句话说明"你没有编辑权"；他刷新三次、换浏览器、报 bug 给开发。更糟的是 `VideoDetailView.tsx:85-99` 的「删除」按钮**对所有人生效**，无权限者点下去 → 走确认框 → 403 → `onError` 没写 → 无声失败，看起来像"删了但没删"（见下条）。
修法：`StateBlock.tsx` 加 `ForbiddenBlock`（标题「你没有这个操作的权限」+ hint 说明"需要上传者/管理员/店铺所有者"+"申请权限"按钮）；`ErrorBlock` 里按 `error.status` 分流 `401/403/404/0/5xx` 五套文案；行内无权限时不要留空白，渲染 `<span class="muted">无编辑权</span>`（带 `title`）。

**[P1] src/views/VideoDetailView.tsx:95 等 25 处 — 写操作失败时完全没有提示，另有 14 处只说「XX失败」**
以 `VideoDetailView.tsx:95`（`removeVideo` 只有 `onSuccess`）为代表：用户确认删除 → 请求失败 → 卡片还在、没有提示、确认框已关 → 用户以为成功了，刷新后发现还在。
**完全静默（无 `onError`，无 toast，按钮无 pending）共 25 处**：
`ShopView.tsx:152`（上下架）、`:202`（新建分类）、`:239`（删分类）、`:396-404`（保存/申请店铺）、`LinesView.tsx:104`（删线路）、`LiveView.tsx:124`（删频道）、`:188`（删源）、`OrdersView.tsx:168`（删订单）、`:181`（存备注）、`AccountView.tsx:260`（撤销邀请）、`:438`（重置密码）、`:162`（显示空媒体库开关）、`:406`（解封）、`VideoDetailView.tsx:81,95,369,382,399,426,454`（同步/删影片/复制播放地址/同步元数据/删资源/重命名字幕/删字幕）、`SongDetailView.tsx:48`（删歌曲）、`WatchlistDetailView.tsx:57`（隐藏/显示）、`SeekView.tsx:39,40`（认领/催片）。
**只说「失败」不说为什么（14 处）**：`ShopView.tsx:330`「保存失败」、`OrdersView.tsx:126`「发货失败」、`LiveView.tsx:229`「创建失败」/`:292`「添加失败」、`AccountView.tsx:148`「更新失败」/`:481`「邀请失败」/`:523`「转赠失败」、`SongDetailView.tsx:32`「操作失败」、`WatchlistDetailView.tsx:52`「操作失败」/`:190`「移出失败」/`:279`「保存失败」、`VideoDetailView.tsx:352`「重命名失败」、`MusicView.tsx:157`「同步失败」、`LinesView.tsx:150`「创建失败」。
正面例子（值得直接复制）：`UploadView.tsx:90-93` 与 `:266-268` 直接把服务端 `message` 抛给 toast；`PayView.tsx:139-141` 同；`ErrorBlock` 的 `status===0` 分支把"连不上服务器"和"服务器返回错误"分开讲。
修法：抽 `useAction(mutation, { action: '删除影片' })` 一个 hook，统一 `onError` → `toast(friendly(err, action), 'error')`，其中 `friendly()` 按 `status` 生成"为什么 + 怎么办"：
- `0`：`删除影片失败：请求没到服务器（网络中断）。检查网络后重试。`
- `401`：`登录已过期，请重新登录后再删除。`（已有 `client.ts:91-100` 的自动跳转，但需提示）
- `403`：`删除影片失败：你不是这部影片的上传者，也没有管理员权限。`
- `404`：`删除影片失败：这部影片可能已被其他人删除，刷新看看。`
- `409/5xx`：`删除影片失败：服务端报错（${status}），已记录；稍后重试或把这句话发给管理员。`
注意别把原始 `Error.message` 直接倒给用户（`client.ts:110-114` 在无 body 时会给「请求失败（500）」这种半成品）。

**[P1] src/components/Modal.tsx:18-32 — Esc 关不掉、焦点不锁、关闭后不回焦点、回车不提交**
- 没有 Esc 处理（全仓 Esc 只在 `confirm.tsx:48` 出现一次）。
- 没有焦点陷阱、没有 `inert` 背景：Tab 会从弹窗跑到后面的侧栏和页面按钮上。
- `aria-modal="true"` 却只有 `aria-label={title}`，`hint`（往往是最重要的后果说明）没有 `aria-describedby`。
- 关闭后焦点落在 `body`，键盘用户回到列表要重新 Tab 十几下。
- 弹窗里的表单不是 `<form>`（`WatchlistsView.tsx:172-204`、`LinesView.tsx:128-172`、`ShopView.tsx:298-380`、`AccountView.tsx:424-500`…），回车提交不生效——用户习惯在「名称」里敲回车，什么都没发生。
场景：新增线路填了 3 个字段，按 Esc 想放弃 → 没反应；TAB 五下跑到背后的「新增线路」按钮上再回车，又开了一个。
修法：`Modal` 内加 `useEffect` 监听 Esc → `onClose`；挂载时记录 `document.activeElement` 并聚焦第一个可聚焦元素（或 `modalRef`），卸载时归还；给遮罩加 `aria-hidden`/背景 `inert`；`<div className="modal__body">` 外面包 `<form onSubmit>` 并把 footer 主按钮设为 `type="submit"`（或 `Modal` 暴露 `onSubmit`）。有未保存内容时，点遮罩关闭要先 `confirmDialog`。

**[P1] src/views/LibraryView.tsx:106-121 — 表头"排序"是假的：`aria-sort` 放错元素、没有 `onClick`、箭头硬编码**
`<button className="th-sort" aria-sort="none|descending">` —— `aria-sort` 属于 `<th>`，放在 button 上读屏不会念；三列（资源/求片/上映）都没有点击处理，但「求片」那列永远显示降序箭头。
场景：用户点「资源」想按资源数排序，没反应；再点「求片」，还是没反应，只能认为"这个后台排序坏了"。读屏用户听到的是普通按钮"求片"，无法得知当前按什么排序。
修法：`<th aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}>`，button 内 `onClick` 调 `onSearch({ sort_by, sort_order, page: 1 })`；不打算支持排序的列就别渲染 `.th-sort`，只留静态文字。

**[P1] src/views/ShopView.tsx:149-158 — 「下架」无 pending、无失败提示、无乐观更新 — 慢网下必然被连点，结果与意图相反**
`toggleUp` 是"切换"语义且幂等性差：点第一下没反馈 → 再点一下 → 两个请求先后到达 → 最终可能又回到"已上架"，而用户以为已经下架了。徽章要等 `invalidateQueries(['shop'])` 重新拉完（2–6s）才变。
修法：`onMutate` 里乐观改缓存（`qc.setQueryData(['shop','products',page,categoryId], prev => 把目标 product.is_up 取反)`），`onError` 回滚 + 提示；`disabled={actions.toggleUp.isPending && actions.toggleUp.variables === product.product_id}`，文案切「下架中…」。同理 `OrdersView.tsx:121-131` 的「发货」、`AccountView.tsx:157-166` 的开关（**开关是受控于 `user.is_show_empty`，2–6 秒内点它界面完全不动，用户会连点 3 次**）、`WatchlistDetailView.tsx:52` 的订阅（已有 `isPending` 保护，但文案不变，仍像没点上）。

**[P1] src/views/OrdersView.tsx:121-131、157-190 — 「发货」「保存」「删除订单」三个按钮都没有 pending 保护 — 重复发货 / 重复建备注 / 误删**
`deliver`（:124）、`remark.mutate`（:181）都只判 `onSuccess`，按钮 `disabled` 只来自表单内容。连点两次 = 两个发货请求（第二次 5xx，静默）、两个备注请求。
更糟的是 **「删除订单」被放进了"订单备注"弹窗的 footer，紧挨着「保存」**（:157-177），样式还是 `btn--ghost`（危险色不可见）。用户想保存备注，手滑点在旁边 → 弹一个「删除这个订单？」的红色确认。
修法：三个按钮统一 `disabled={mutation.isPending}`；把「删除订单」从备注弹窗里挪到行操作区（`删除` 用 `btn--danger`）或"更多"菜单，二级入口 + 二次确认；备注弹窗只留「取消 / 保存」。

**[P1] src/views/ShopView.tsx:298-337 / LinesView.tsx:138-156 / LiveView.tsx:212-235、276-298 / AccountView.tsx:434-448、469-487 — 弹窗主按钮不判 `isPending` — 双击变两条数据**
`saveProduct` 的 `product_id: editing.product_id ?? null`，意味着每次提交都是"新建"，双击 = 两个重复商品；`saveChannel` 双击 = 两个同 `code` 频道；`invite`（:469-487）连 `disabled` 属性都没有，只靠 null 检查。
修法：所有弹窗主按钮 `disabled={!valid || mutation.isPending}`，文案 `保存 → 保存中…`，成功后 `setEditing(null)` 已有。

**[P1] src/views/SeekView.tsx:144-175（配合 :39-40）— 催片弹窗点完立刻关闭，失败无任何提示，且悬赏额不校验**
`:159` `setUrgeTarget(null)` 紧跟 `urge.mutate(...)`，所以 `disabled={urge.isPending}`（:156）永远看不到；`urge` mutation（:40）只有 `onSuccess`，失败时弹窗已关、无 toast、胡萝卜没扣也没加——用户不知道到底催成功没有。
输入框 `min={1} max={5000}` 只是 HTML 属性（手动输入仍可为 0 / 负数 / 5000.5），按钮不校验。
场景：悬赏 2000 胡萝卜催片，点完弹窗消失、页面刷新后发现求片数没变，再催一次 → 若第一次其实成功，就是白送 2000。
修法：`mutate` 成功后（`onSuccess`）再关弹窗；`onError` 留在弹窗内显示原因 + 余额是否变化；提交前 `Number.isInteger(carrot) && carrot >= 1 && carrot <= 5000`，否则内联报错并禁用按钮。

**[P1] src/ui/toast.tsx:11-12、32、42-48 — 错误提示 2.6 秒就消失、不可关闭、不暂停、用 `role="status"` — 慢链路下最关键的反馈留不住**
`DURATION = 2600`，`setTimeout` 一刀切；错误文案（尤其带上服务端 message 的长句）根本读不完；鼠标悬停不暂停；`role="status"` 是 polite，读屏会等当前播报结束后念，可能已经该消失了。成功/失败仅靠左侧色点区分（:48 `.toast--error i`），色盲用户只剩文字差异。
场景：转赠失败，toast 一闪而过，用户只看到"失败了"半句，只能去翻余额猜发生了什么。
修法：`type === 'error'` 用 `DURATION = 8000` 或常驻 + 关闭按钮；`onMouseEnter` 暂停计时；错误用 `role="alert"`（`aria-live="assertive"`），成功用 `status`；错误 toast 前加 `失败：` 前缀 + `IconAlert`，不要只靠颜色；`MAX = 5` 时若挤出的是未读错误要合并成「还有 N 条错误」。

**[P1] src/api/client.ts:50-69 — 没有请求超时，GET 还会重试 3 次 — "偶发超时"表现为永久骨架屏，最坏等 18 秒**
`request()` 对 GET `attempts = 3`，退避 300/600ms；结合单请求 2–6 秒，一次网络抖动的最坏耗时 ≈ 6+0.3+6+0.6+6 ≈ **18.9 秒**，全程页面只有 `LoadingBlock`，没有任何"还在等/可以取消"的提示。真正挂住的连接（TCP 不返回）**永远不会失败**，`ErrorBlock` 也不会出现——正好违背"慢网下加载/失败态尤其重要"的前提。
场景：进 /library，骨架屏转 40 秒，用户以为系统崩了，切到别的页面再切回来（缓存还在，继续转）。
修法：`fetch(..., { signal: AbortSignal.timeout(12_000) })`，把 `TimeoutError` 映射成 `fail(0, ...)` 走 `ErrorBlock` 的"连不上服务器"分支；`LoadingBlock` 支持 `slowAfterMs`（>6s 显示「网络较慢，仍在等待…」+「取消」按钮）；GET 重试保留但只在 `status === 0` 且总时长 < 15s 内重试。

**[P1] src/views/AccountView.tsx:502-542 / src/views/PayView.tsx:117-152 — 转赠胡萝卜（不可撤回）没有二次确认**
页面底部只有一行小字「单次 2 – 6000 个，转出后不可撤回」，确认动作就是弹窗里的「转赠」。给陌生 ID 输错一位 → 钱给了别人，不可撤回。对比删除类操作都有 `confirmDialog` + message + hint 两层，唯独"不可逆的钱"没有。
修法：`onClick` 先 `await confirmDialog({ title: '转赠 500 胡萝卜？', message: `将转给用户 ${transferTo.trim()}，余额将从 1200 变为 700。`, hint: '转出后不可撤回，对方不会收到退款入口。', confirmText: '确认转赠', danger: true })`；顺手把接收方 ID 的回显（用户名/头像）加进确认文案，防止打错字。

**[P1] src/views/LibraryView.tsx:139-141 — 行内复选框没有 `onChange`，点它会冒泡触发整行跳转 — 想勾选却跳走了**
`<input className="cbx" type="checkbox" aria-label="选择《…》">` 无 `onChange`、无受控 state，父级 `<tr onClick>` 会收到点击。表头「全选本页」（:101）同理，勾上只是 DOM 视觉，刷新即失效，且没有批量操作栏承接它。
场景：用户想勾 3 部片子批量处理 → 每勾一次跳一次详情页。
修法：真要批量就补 `selectedIds` state + 批量工具条 + `e.stopPropagation()`；不做批量就把这两列复选框删掉（假控件比缺控件更伤信任）。

**[P1] src/api/queries.ts:84-98 等（`placeholderData: (prev) => prev`）+ 各列表页 — 切页/切筛选时直接显示上一批数据，无"陈旧"标记**
`useVideoPage`/`useSeekPage`/`useWatchPage`/`useShopProducts`/`useShopOrders`/`useLiveList`/`useMusicSongs` 都带 `placeholderData`。点第 2 页后 2–6 秒内，屏幕上仍是第 1 页的行，页码显示"第 2 页"，只有角落里的 `stamp` 写"同步中"。
场景：用户点"第 2 页"，看到的是第 1 页内容，以为分页坏了，连点三次。
修法：保留 `placeholderData` 避免闪烁，但给表格容器加 `aria-busy` + `opacity:.55` + 顶部细进度条（`isPlaceholderData` 时），并给 `LoadingBlock` 之外的"刷新中"一个显式文案；或改用 `keepPreviousData + 骨架遮罩`。

**[P1] src/views/LiveView.tsx:160-161、src/views/ShopView.tsx:219-220、src/views/AccountView.tsx:226-227、324-325、372-373、src/views/VideoDetailView.tsx:279、src/views/UploadView.tsx:33 — 子查询没有错误分支，失败时显示"空"或"空白" — 错误伪装成空**
`LiveView` 直播源区只有 `isLoading` 与「没有源」；请求 500 时 `data` 为 `undefined` → 卡片里 0 个源、无提示，用户以为频道真的没源，去新建一个重复的。
`AccountView.tsx:95` 只接了 `session.error`，`info/inviteHistory/carrotHistory/tree/bans` 五个查询的错误都没接。
`UploadView.tsx:33` 的 `disks` 错误未处理 → 「存储位置」下拉是空的，用户不知道是没盘还是加载失败，此时上传必然失败。
修法：每个 `useQuery` 都落三态（`error → ErrorBlock(bare, onRetry)` / `isLoading → LoadingBlock(bare)` / `data`）；空态的判断必须挂在 `data && !error` 上，避免"错误当空"。

**[P1] src/api/client.ts:91-100 + src/views/PlaceholderView.tsx:13-42 — 令牌无效/过期时静默弹回登录页，不说原因**
401 → `setToken(null)` → `location.replace('/login?next=...')`，而 `LoginView`（:13-42）完全不读 `next`，也没有任何错误展示位：粘一个错 token → 页面闪一下回到登录框，空白如初。用户会反复粘贴同一个错 token。
修法：跳转前用 `sessionStorage` 标记原因（或读 `?next` 显示「将返回 /library」），`LoginView` 顶部渲染提示条「令牌无效或已过期，请重新粘贴」；登录成功后跳回 `next`。

---

## P2 — 体验/规范问题，攒着一起改

**[P2] src/components/Pager.tsx:51 — 页码是"死按钮"** `<button aria-current="page">{page}</button>` 无 `onClick`，能 Tab 到、能按、什么也不发生。改成 `<span aria-current="page">`（`aria-current` 本来就该在文本节点上）。

**[P2] src/components/Pager.tsx:19-23、57-73 — 跳页输入只在"总页数 > 5"时出现，且 `onBlur` 也提交** 页数少时没有直达入口（不一致）；`onBlur` 提交意味着"输入到一半点了别处"就跳页；Enter 会触发 `submit` 再触发 `onBlur` 的 `submit`（幂等但多余）。建议常显、输入非法时内联提示、只有 Enter / 明确按钮才提交。

**[P2] src/components/Pager.tsx:13 与 src/views/AccountView.tsx:349-360 等 3 处手写分页并存** `WatchlistDetailView.tsx:203-216`、`ShopView.tsx:171-184`、`AccountView.tsx:349-360`、`VideoDetailView` 等都手抄了一遍分页，导致：`AccountView.tsx:356` 的「下一页」**没有 `disabled`**（总页数未知，能一直往后点出空页）；`ShopView`/`WatchlistDetail` 没有每页条数。统一改用 `Pager`。

**[P2] src/components/Sidebar.tsx:81-83 — 「收起侧栏」是无 `onClick` 的死按钮**（aria-label 写着"收起侧栏"，点了没反应）。

**[P2] src/components/Sidebar.tsx:86-93 — 搜索框是死的，却画了 `⌘K` 快捷键提示**：无 `onChange`、无提交、全仓没有任何 `⌘K` 监听（`grep keydown` 只有 4 处输入框回车）。要么实现"聚焦 + 全站搜索"，要么去掉 `kbd` 与输入框。配套：全站缺跳转后**焦点**管理——路由切换不把焦点移到 `h1`，也没有 `skip link`（`.page` 的滚动复位已在工作区补上，见「并发改动」）；建议每次 `useRouterState` 变化时 `h1.focus()` 并给 `h1` 加 `tabIndex={-1}`。

**[P2] src/views/WatchlistsView.tsx:70 — 片单槽位写死** `Math.max(0, 2)`：永远显示"剩余 2"。应取 `useSession().data.slot_remaining`（`OverviewView.tsx:67` 已经这么用了）。

**[P2] src/views/OrdersView.tsx:202 — 「上次更新」永远显示"刚刚"** `formatRelative(new Date().toISOString())` 是当前时间，不是订单更新时间。应当取 `order.updated_at` 或去掉这一行。

**[P2] src/views/WatchlistsView.tsx:172-204 — 新建片单没有"槽位为 0"的前置提示** 提交后才由后端报错（`onError` 展示了服务端 message，比别处好），但更好的是按钮旁就写「已用 2/2，无法新建」。

**[P2] src/views/WatchlistDetailView.tsx:70-72 — 片单被删/无权限时是纯空白页** `watch.data.items[0]` 为空时不渲染任何东西，也没有 EmptyBlock；用户落在一条只有搜索框的页面上，无处可去。补 `EmptyBlock title="片单不存在或已删除" action={返回列表}`。

**[P2] src/views/VideoDetailView.tsx:279 — 字幕区没有错误态**（只有空/有数据），失败时静默消失。

**[P2] src/views/UploadView.tsx:237 — 暂存区 `ErrorBlock` 没传 `onRetry`**，别的 `ErrorBlock` 都有重试；且 `:118-127` 的存储下拉在 `disks` 为空时是空 `<select>`，没有"没有可用存储"的说明。

**[P2] src/views/UploadView.tsx:201-208 — 上传中不可取消**，慢链路下 8MB 分片 × N 片可能几分钟，用户只能刷新页面（会丢掉整个队列）。

**[P2] src/views/ShopView.tsx:232-237 — 删除分类缺 hint 层** message 说了"商品会变为未分类"（后果），但没说可恢复性；对比 `WatchlistDetailView.tsx:180-186` 的两层写法（后果 + 不可恢复/影响范围）是最佳范式，其余按它对齐。另 `ShopView` 没有"删除商品"入口（`queries.ts` 里 `removeProduct` 定义了但没人用）。

**[P2] src/views/AccountView.tsx:70-80 — 签到失败文案固定为「今天已经签到过了」**，网络错误/500 也这么显示，误导。应只对特定业务码用它，其它走通用错误映射。

**[P2] src/views/LibraryView.tsx:52-64 等 7 处 — `role="tab"` 只贴了 ARIA 标签，没实现的 tab 键盘语义** 涉及 `LibraryView.tsx:52-64`、`SeekView.tsx:58-64`、`AccountView.tsx:86-92`、`ShopView.tsx:63-69、75-89`、`MusicView.tsx:58-69`、`OrdersView.tsx:52-58`、`VideoDetailView.tsx:165-178`：没有 `aria-controls`/`role="tabpanel"`，没有 ←/→ 切换，`aria-selected` 的 tab 不在 tab 序里（正确的 roving tabindex 应为选中项 `tabIndex=0`，其余 `-1`）。
成本最低的修法：**这些其实是筛选按钮，不是 tab**——把 `role="tablist"/"tab"` 换成 `<div role="group" aria-label="类型筛选">` + `<button aria-pressed>`，语义立刻正确（`WatchlistsView.tsx:84-91` 的 `.seg` 就是 `aria-pressed`，已经是正确写法）。

**[P2] src/views/*.tsx（全站所有表格，16 张）— 表格缺 `scope` / 缺无障碍名称** `<th>` 没有 `scope="col"`，`<table>` 没有 `<caption class="visually-hidden">`。读屏在 7 列表格里的单元格导航会失去列标题。改动量极小（`scope="col"` 批量加）。

**[P2] 纯 placeholder 的输入框没有可访问名称** `LibraryView.tsx:66-73`（搜索片名）、`MusicView.tsx:72-79`、`WatchlistDetailView.tsx:114-120`、`LinesView.tsx:43-49`、`PayView.tsx:83、120-129`、`ShopView.tsx:197`。`placeholder` 在输入后即消失，读屏不一定念。补 `aria-label`（弹窗里的 `field` 用 `<label>` 包着，已经合规）。

**[P2] src/styles/base.css:68-74 — `prefers-reduced-motion` 规则语法错误，整段失效**（审查期间已在工作区修复，仅留档） 媒体查询里直接写声明、没有选择器，末尾还多一个 `}`：
```css
@media (prefers-reduced-motion: reduce) {
  animation-duration: 0.001ms !important;   /* 无选择器 → 浏览器丢弃 */
  ...
}
}
```
后果：`LoadingBlock` 的 `shimmer`（`components.css:653-656`）无限动画、toast 进场动画对前庭敏感用户照旧生效。修成 `*, *::before, *::after { animation-duration: .001ms !important; ... }`。

**[P2] src/styles/components.css:628-634 — 输入框的焦点环被自己吃掉了** `.input { outline: none }` + `.input:focus { border-color: var(--line-hot) }`；`base.css:39-42` 的 `:focus-visible` 优先级更低（`.input:focus` 0,2,0 > `:focus-visible` 0,1,0）。键盘用户在「商品编辑」这种 6 个输入框的弹窗里只能靠 `#181715 → rgba(255,255,255,.16)` 的边框变化找焦点，几乎看不见。修成 `.input:focus-visible { outline: 2px solid ...; outline-offset: 1px }`。

**[P2] src/styles/components.css:549-563 — 行尾「⋯」按钮对比度不足** `color: var(--fg-5) (#6b6962)` + `opacity: .55`，压到 `#121110` 背景上有效对比约 2:1（非文本图形最低要求 3:1），默认几乎看不见，而这恰恰是每行唯一能点的东西。改 `opacity: .8`，或把颜色换成语义更强的 `--fg-4`。

**[P2] src/styles/components.css:209 等 — 触控目标普遍小于 44×44** `.btn{height:32}`（`components.css:209`）、`.btn--icon{28×28}`（:244）、`.row-menu{26×26}`（:549）、`.pager button{28}`（:573）、`.tab{32}`（:435）、`.cbx{15×15}`（:593）、`.rail__menu-remove{24}`（:1004）。窄屏/触屏上误触率高；在 `@media (max-width:900px)` 里统一提到 `min-height:40px`、行尾按钮加 `padding` 撑到 40。

**[P2] 状态区分依赖颜色** 大部分 `.badge` 都有文字（`已上架/待发货/…`）——这点做得好。仍有两处只剩颜色：toast 的成功/失败（见 P1）、以及 `OverviewView.tsx:107-117` 的两条占比条（旁有文字标签，勉强可接受）。建议 badge 统一带一个形状/图标差异（如 `●` vs `▲`），toast 加 `IconAlert`/`IconCheck`。

**[P2] src/views/OverviewView.tsx:125、src/views/AccountView.tsx:198、302、src/views/PayView.tsx:79 — 内联 `gridTemplateColumns: 'repeat(2, minmax(0,1fr))'` 覆盖了窄屏断点**（`components.css:682` 的 `.cards { grid-template-columns: minmax(0,1fr) }` 被行内样式压过）→ <900px 时这些区块仍是两列，卡片被挤到 ~160px 宽，"累计收入/累计支出"数字换行。改用 `.cards--two` 类，在断点里归零。

**[P2] src/views/VideoDetailView.tsx:159 — 详情页主体是写死的两列 `minmax(0,.85fr) minmax(0,1.15fr)`**，窄屏下右列 ~150px，资源表被压（叠加上面的 P0 裁剪问题就是完全不可用）。补一个 `@media (max-width:900px)` 的单列规则（需要一个类名，当前是行内样式，无法用媒体查询覆盖）。

**[P2] src/views/OverviewView.tsx:173 — 卡片内的 `EmptyBlock` 少了 `bare`，渲染成"卡片套卡片"** 它被放在 `<article className="card">`（:126）里，却又包了一层 `.table-card`（深色渐变+边框+阴影）。按 `docs/LEARNINGS.md` 的约定"状态块不是容器"，卡片内一律传 `bare`——全站 27 处 `bare` 用法都在卡片/折叠区里（正确），只有这一处漏了，于是"正在播放"卡片会出现双层边框。

---

## 四态覆盖表

图例：✓ 有且文案清楚 · 部分 有但缺分支/文案弱 · ✗ 没有

| 页面 | 加载 | 空 | 错误 | 权限不足 | 说明 |
|---|---|---|---|---|---|
| 总览 `/` | 部分 | 部分 | 部分 | ✗ | 数字位显示 `—`、榜单只有 skeleton（`OverviewView.tsx:129,153`），没有统一 `LoadingBlock`；错误只接了 `zones/rank`（:21），`seekOpen/carrot/playing` 失败被吞；上传榜空列表无空态（只有"正在播放"有，且缺 `bare`） |
| 媒体库 `/library` | ✓ | ✓ | ✓ | ✗ | 三态范式页，可作为模板（:84-95）；缺权限提示、表头排序假 |
| 影片详情 `/media/$id` | ✓ | ✓ | 部分 | ✗ | `detail/media` 有错误块；`seasons/episodes/subtitles/persons` 全无错误态（字幕区 :279 只有空/有数据）；无权限者仍看到「删除」 |
| 求片 `/seek` | ✓ | ✓ | ✓ | ✗ | `is_can_claim` 为假时按钮直接变「催片」，没有"你无权认领"的说明 |
| 片单 `/watchlists` | ✓ | ✓ | ✓ | ✗ | 新建不判断槽位；槽位数字是假的（:70） |
| 片单详情 `/watchlists/$id` | ✓ | ✓ | 部分 | ✗ | `watch/videos` 有；候选搜索（:233）失败静默；片单不存在时整页空白（:70-72） |
| 上传 `/upload` | ✗ | ✓ | 部分 | ✗ | `disks/storeFiles/candidates` 三个查询都没有加载态（暂存区显示"0 个文件"）；`disks` 错误未接；上传失败态做得好（:90-93） |
| 直播 `/live` | ✓ | ✓ | 部分 | ✗ | `list` 有；`library/media` 没有错误态（:160-161）→ 失败显示"0 个源" |
| 商城 `/shop` | 部分 | ✓ | 部分 | ✗ | 商品三态齐；分类失败→空白（:219-220）；店铺 404 无空态（:258）；非卖家按钮消失但无说明 |
| 订单 `/orders` | ✓ | ✓ | ✓ | ✗ | 三态齐；但发货/备注/删除无 pending、错误静默 |
| 线路 `/lines` | ✓ | ✓ | ✓ | ✗ | 三态齐；删除失败静默（:104） |
| 音乐 `/music` | ✓ | ✓ | ✓ | ✗ | 三态齐；只对"歌曲"行可点，专辑/歌手行无详情入口（可接受但需一致） |
| 歌曲详情 `/music/song/$id` | ✓ | ✓ | ✓ | ✗ | 歌词/资源都有三态；收藏/删除失败只有"操作失败" |
| 支付 `/pay` | 部分 | ✓ | ✓ | ✗ | 卡片用 `—` 占位；`base` 404 有专门说明（:43-48）——**这是全站最好的空/错误文案**，值得复制；查单错误也有解释（:90-94） |
| 账号 `/account` | ✓ | 部分 | 部分 | ✗ | 只有 `session.error` 被接（:95）；`info/inviteHistory/carrotHistory/tree/bans` 错误全静默；封禁 tab 对所有用户可见 |
| 登录 `/login` | ✗ | — | ✗ | ✗ | 令牌无效 → 静默弹回，无任何错误提示、不读 `?next` |
| 404 页 `router.tsx:30-38` | — | ✓ | — | — | 有返回入口，合规 |

**汇总：加载 11/16 ✓（另 3 部分、2 个 ✗）、空 13/16 ✓、错误 8/16 完全 ✓（另 7 个只有部分分支）、权限不足 0/16。**
四个状态里唯一系统性缺失的是**权限**：底层数据其实齐全（`is_can_edit` / `is_edit_video` / `is_can_claim` / `is_self` / `is_can_upload`），只是全部只用来"隐藏按钮"，从不解释。

---

## 写操作失败提示体检（Q1 的关注点）

| 位置 | 现状 | 该说什么（为什么 + 怎么办） |
|---|---|---|
| `VideoDetailView.tsx:95` 删影片 | 无错误处理 | "删除失败：请求超时（网络）。影片仍在，可直接重试；若反复失败，管理员可以在「回收处」手动处理。" |
| `VideoDetailView.tsx:81` 同步 | 无 | "触发同步失败：TMDB 暂时不可达。已保留原数据，10 分钟后再试。" |
| `VideoDetailView.tsx:347` 重命名资源 | "重命名失败" | 区分 403（"只有上传者可以改名"）/ 409（"该资源已被删除"）/ 0（网络） |
| `ShopView.tsx:152` 上下架 | **完全无声** | "下架失败：你不是这个店铺的管理员（403）。" / "网络中断，商品仍是已上架状态。" |
| `LinesView.tsx:104` 删线路 | 无 | "删除失败：这条线路已被客户端使用中。先让用户切到其它线路再删。" |
| `LiveView.tsx:124/188` 删频道/源 | 无 | "删除失败：还有 N 个源在线，需要先移除源。" |
| `OrdersView.tsx:124/181/168` 发货/备注/删单 | 发货有通用文案，另两个无 | "发货失败：订单已发货过（409）。" / "备注保存失败：超出 200 字。" |
| `AccountView.tsx:516` 转赠 | "转赠失败" | "转赠失败：余额不足（当前 320，需要 500）。" / "对方 ID 不存在。" |
| `AccountView.tsx:438` 重置密码 | 无 | "重置失败：新密码不符合强度要求（至少 8 位）。" |
| `AccountView.tsx:74` 签到 | 固定"今天已经签到过了" | 只对业务码说这句，其它走通用映射 |
| `SeekView.tsx:40` 催片 | 无 | "催片失败：余额不足（需要 2000，当前 800）。" / "该求片已被他人认领。" |
| `PayView.tsx:139` 转赠 / `UploadView.tsx:266` 归档 | ✓ 直接展示服务端 message | 保持，并补一行"如果这句话看不懂，截图发给管理员" |
| `WatchlistDetailView.tsx:52/190` 订阅/移出 | "操作失败" / "移出失败" | "移出失败：这个片单已满/已被删除。" |

结论：**文案质量分三层**——① 带 `status` 分流并给出下一步（目前 0 处）；② 只有通用动词（14 处）；③ 完全静默（25 处）。第 ③ 类才是"写操作失败提示"最该先补的，因为它们连"失败"都不说。

---

## 危险操作确认盘点（Q3）

| 操作 | 有确认 | message 说清后果 | hint 说清可恢复性 |
|---|---|---|---|
| 移出片单 `WatchlistDetailView.tsx:180-186` | ✓ | ✓ | ✓（**全站最佳：说明"影片本身不会被删，其它片单不受影响"**） |
| 删线路 `LinesView.tsx:96-102` | ✓ | ✓ | ✓（"建议先切线路"——给了操作建议） |
| 删频道 `LiveView.tsx:116-122` | ✓ | ✓ | ✓ |
| 删直播源 `LiveView.tsx:180-186` | ✓ | ✓ | ✓ |
| 删影片 `VideoDetailView.tsx:88-94` | ✓ | ✓ | ✓（"可从回收处恢复"） |
| 删资源 `VideoDetailView.tsx:391-397` | ✓ | ✓ | ✓（"会扣胡萝卜，可恢复"） |
| 删字幕 `VideoDetailView.tsx:446-452` | ✓ | ✓ | ✓（"扣 1 个胡萝卜，可重传"） |
| 删歌曲 `SongDetailView.tsx:41-47` | ✓ | ✓ | ✓ |
| 撤销邀请 `AccountView.tsx:252-258` | ✓ | ✓ | ✓（"返还 1 个名额"） |
| 解除封禁 `AccountView.tsx:400-404` | ✓ | ✓ | ✓ |
| 删订单 `OrdersView.tsx:160-166` | ✓ | ✓ | ✓（"不可撤销"） |
| 删分类 `ShopView.tsx:232-237` | ✓ | ✓ | ✗（缺 hint 层） |
| **转赠胡萝卜 `AccountView.tsx:516` / `PayView.tsx:136`** | **✗** | ✗ | 只有页面小字，**且双击会转两次** |
| 重置永久密码 `AccountView.tsx:434-448` | ✗（弹窗内直接执行） | hint 有说明"所有设备需重新登录" | 建议补 confirm（不可逆） |

覆盖率 12/14，文案总体达标（这是本仓库做得最好的一块）。两个洞都关乎"钱/账号安全"。

---

## 键盘与焦点（Q4）

| 检查项 | 结论 |
|---|---|
| Modal Esc 关闭 | **✗ 全部无**（`Modal.tsx` 无 keydown；Esc 全仓只有 `confirm.tsx:48`） |
| Confirm Esc 关闭 | ✓ `confirm.tsx:48` |
| Confirm Enter | ⚠ **危险**：全局监听，焦点在「取消」上也执行（P0 第 1 条） |
| Modal 内 Enter 提交 | ✗ 弹窗内表单不是 `<form>`，回车无效 |
| 焦点锁定（trap） | ✗ Modal 与 Confirm 都没有 trap，Tab 会跑到背后页面 |
| 关闭后焦点归还 | ✗ 落在 `body` |
| 遮罩后的内容对 AT 隐藏 | ✗ 无 `inert`/`aria-hidden`（`aria-modal` 对部分读屏无效） |
| 表单 Tab 顺序 | 基本正常（DOM 顺序 = 视觉顺序）；长表单在弹窗内滚动时浏览器会跟随焦点，可接受 |
| 列表行键盘入口 | ✗ `tabIndex` 全仓 0 处（P0 第 3 条） |
| 焦点可见 | 部分：全局 `:focus-visible` 有，但 `.input` 自己 `outline:none` 覆盖（P2） |
| 跳转后焦点管理 | ✗ 无 `skip link`，无焦点复位，无 `document.title` 更新 |
| 快捷键 | ✗ `⌘K` 只是装饰 |

---

## 移动端（Q5）

- **[P1] src/components/Sidebar.tsx:103-114 — 窄屏下导航变无名链接**：`<900px` 时 `rail__item > span:not(.rail__ico)` 被 `display:none`（`components.css:674`），文字标签消失，而图标本身是 `aria-hidden`（`icons.tsx` 的 `Svg`），于是读屏只剩一串「链接」。场景：视障用户在小屏笔电上无法分辨 12 个导航项。修法：`<Link aria-label={item.label}>`（视觉标签由 CSS 隐藏时，必须用显式 `aria-label` 兜底）。
- 表格横向滚动：`.table-card` 内 ✓（`overflow-x:auto`，`components.css:684`）；`.card` 内 ✗（被 `.page{overflow-x:hidden}` 裁掉）→ **见 P0 第 4 条**。
- 窄屏操作不可达的页面：影片详情（资源/字幕的操作列）、歌曲详情、账号页三个子表、上传页暂存区。另外 `VideoDetailView.tsx:159` 的双列布局让右列只有 ~150px。
- `OverviewView`/`PayView`/`AccountView` 的行内两列 grid 在窄屏不塌陷（P2）。
- 触控目标普遍 <44px（P2）。
- 行 `onClick` + 横向滑动：桌面鼠标无碍，触屏上"想横滑表格却误触跳转"概率高，建议触屏用 `onPointerUp` 判断位移 < 8px 才算点击，或直接改成行内链接（同 P0 第 3 条的修法，一并解决）。

---

## 可访问性清单（Q6）

| 项 | 结论 |
|---|---|
| 图标按钮的 `aria-label` | 大部分 ✓（`Sidebar` 6 处、`Pager` 4 处、`Modal` 关闭、各行 `row-menu`）。缺：窄屏侧栏图标导航（见上）、`MusicView.tsx:150` 的 `aria-label="操作"` 过于空泛（应"同步歌曲《X》"） |
| 图标本身 | ✓ `Svg` 默认 `aria-hidden="true"`，不会污染可访问名称 |
| `aria-sort` | ✗ 放错元素且无交互（P1）；`aria-sort` 也未反映真实排序 |
| 表格语义 | ⚠ 缺 `scope="col"`、缺 `caption` |
| 进度/加载 | ✓ `LoadingBlock` 有 `aria-busy` + `aria-live="polite"`；但错误块无 `role="alert"`，错误出现不会被播报 |
| Toast | ⚠ `role="status"`（politeness 不足）+ 2.6s 即消失（P1） |
| 颜色唯一区分 | ⚠ 大部分 badge 有文字 ✓；toast 类型、`row-menu` 对比度、占比条依赖颜色 |
| 对比度 | `--fg-4` ≈ 4.97:1 ✓；`--fg-5` ≈ 3.5:1（小字不合格）；`.row-menu` 有效 ≈2:1 ✗ |
| 动效偏好 | ✗ `prefers-reduced-motion` 规则语法坏了（P2） |
| 语言/标题 | ⚠ `index.html` 未设逐页 `document.title`；建议路由变化时更新 |
| 读屏播报筛选结果数 | ✗ 切 tab/搜索后条数变化无 `aria-live` 播报 |

---

## 乐观更新与重复提交建议表（Q2）

| Mutation | 现状 | 建议 |
|---|---|---|
| 商城上下架 `ShopView.tsx:152` | 无 pending / 无乐观 / 无错误 | **乐观**（取反 `is_up`，失败回滚）+ `isPending` 禁用 + 文案「下架中…」 |
| 订阅片单 `WatchlistDetailView.tsx:52` | 有 `isPending`，无乐观，文案不变 | **乐观**（`is_subscribe` 取反 + `subscribe_count ±1`）+ 文案「订阅中…」 |
| 音乐收藏 `SongDetailView.tsx:30` | 无状态、按钮恒为"收藏" | **乐观**（心形/收藏态切换）+ 失败回滚 + toast |
| 显示/隐藏片单 `WatchlistDetailView.tsx:57` | 有 pending，无乐观 | 乐观（`user_is_show` 取反） |
| 显示空媒体库开关 `AccountView.tsx:158-164` | **受控于服务端值，无乐观 → 点了 2–6 秒内界面不动** | **必须乐观**，否则用户必然连点 |
| 订单发货 `OrdersView.tsx:124` | 无 pending，无乐观 | 乐观（`time_delivery` 置为当前时间）+ 禁用 + 行内 loading |
| 片单加/移影片 `WatchlistDetailView.tsx:188,247` | 无乐观 | 乐观（列表增删 + `video_count ±1`），失败回滚并 toast |
| 催片 `SeekView.tsx:158` | 无（弹窗直接关） | 先 `isPending` 再关；成功后可乐观 +1 求片数 |
| 认领 `SeekView.tsx:126` | 有 `isPending` ✓ | 保持，补错误文案 |
| 转赠 `AccountView.tsx:516` / `PayView.tsx:136` | Pay 有 `sending` ✓ / Account 无 | Account 补 pending + confirm；两者都**不要**乐观（钱必须等服务端确认） |

通用规则建议写进 `docs/`：**切换类（toggle）乐观 + 回滚；金额/删除不乐观，但只要 `isPending` 就必须禁用并换文案**。当前多数写操作按钮没有 `isPending` 禁用（`SeekView`、`WatchlistDetailView`、`WatchlistsView` 是少数做对的），而且"禁用"从不伴随文字变化——慢链路下用户分不清"我正在提交"和"这个按钮坏了"。

---

## 只改 5 处的话，先改这 5 处

按"每分钟能挽回多少错误"排序，每处都是小 diff、不动架构：

1. **`src/ui/confirm.tsx:45-53` —— 去掉全局 Enter，改成 keydown 只认聚焦的确定键（或包 `<form>`）。**
   一处改动修掉全站 12 个确认框的误触发（并把 2 处缺确认的钱款操作补上）。P0 里唯一"一个 bug 影响所有删除"的点，性价比最高，且改完不需要回归任何业务逻辑。

2. **`src/views/AccountView.tsx:512-529` —— 转赠按钮加 `isPending` + `disabled`，并在 `onClick` 里补 `confirmDialog`（含接收方与余额变化）。**
   直接对应"扣两次钱"。同时把 `PayView.tsx:130-147` 的 `sending` 写法抽成小 hook 复用到两处，顺带解决"钱的操作没确认"。

3. **列表行的键盘入口：`src/views/LibraryView.tsx:128-137`（并顺手 `:179` 死按钮、`:139` 复选框冒泡）。**
   把片名单元格换成 `<Link to="/media/$videoId">` + 给 `row-menu` 补 `onClick` + `stopPropagation` + 复选框 `stopPropagation`。
   一次改动同时解决：键盘进不去详情、点复选框被弹走、点"更多"被弹走——三个用户每天都会撞到的问题。`WatchlistsView.tsx:124`、`LiveView.tsx:90`、`MusicView.tsx:111` 照抄即可。

4. **`src/components/Modal.tsx` —— Esc 关闭 + 焦点陷阱 + 关闭后归还焦点 + 主按钮 `type="submit"` 包进 `<form>`。**
   全站 9 个弹窗（新建片单/新增线路/新增频道/新增源/商品编辑/店铺/邀请/重置密码/添加影片）一次性获得符合直觉的键盘行为。改一个 33 行的文件，收益覆盖所有表单页。

5. **写操作的统一失败出口：新增 `src/lib/action.ts`（`useAction` + `friendlyError(status, action)`），先接 `ShopView.tsx:152`、`OrdersView.tsx:121-190`、`LiveView.tsx:112-126、176-193` 三处的 `onError`/`isPending`。**
   这三处是"完全静默 + 连点会写脏数据"的集中地（上下架、发货、删频道）。做完就有了可复制的范式，剩余 22 处静默点后续按同一模式扫尾；同时顺手把 14 处「XX失败」的通用文案换成"为什么 + 怎么办"。

> 第 6 顺位（如果还有余量）：`StateBlock` 加 `ForbiddenBlock` + `ErrorBlock` 按 `status` 分流。这是"四态表里唯一 0/16"的格子，也是用户最容易误判成 bug 的一类状态。

---

## 附：本次审查用到的判定口径

- **加载态**：有没有在"等待 2–6 秒"期间给出可理解的占位（不只是不空白）。
- **空态**：`data && length === 0` 且 **`!error`**（把错误当空一律算缺）。
- **错误态**：有没有错误块 **且** 说清"为什么 + 怎么办" **且** 可重试。
- **权限不足**：403 / `is_can_*` 为假 / `is_self` 为假时，用户能否知道"我没有这个权限"以及"怎么获得"。
- **危险操作**：是否有确认 **且** message（后果）+ hint（可恢复性）两层。
- **可达性**：仅用键盘 + 读屏，能否完成该页的主要任务。

---

## 附：审查期间的并发改动（避免误判）

审查开始时工作区已被其他同学改动，以下三项**不在本文行号基线上**：

| 文件 | 改动 | 对本文的影响 |
|---|---|---|
| `src/styles/base.css:68` | `prefers-reduced-motion` 补上 `*, *::before, *::after` 选择器 | 本文 P2「动效偏好失效」**已修复**，留档备查 |
| `src/layouts/AdminLayout.tsx:7-15` | 路由切换时 `.page.scrollTo({ top: 0 })` | 本文 P2「跳转后管理」的**滚动部分已解决**，焦点复位仍缺 |
| `src/views/UploadView.tsx:177` + `src/styles/components.css:920-928` | 上传进度条由 `width%` 改为 `transform: scaleX()` | 交互无关（性能/合成层），不计入本次审查 |

截至本次交付，其余发现未见修复：P0 四条、P1 十六条、P2 二十四条仍然成立（若有人先动了其中某条，以当前代码为准，本文留作对照）。
