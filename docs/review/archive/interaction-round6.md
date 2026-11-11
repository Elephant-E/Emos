# 全量重构复验（第六轮）

范围：`rewrite/v2` 上 `a79b2a2..9da0895`（实际 16 个提交，任务书说 12 个），只读复核，未改 src。
方法：读 diff 与最终文件，跑 `npx tsc --noEmit`（**通过**，`noUnusedLocals` 开着），逐条对照第五轮清单。
样本：26 个 Modal（上一轮 25）、23 处 confirmDialog、8 处 `is-stale`、11 处 `content-in`。

> 行号基准：`9da0895`（`rewrite/v2` 当前 HEAD）。审查期间工作区另有无关的未提交改动（`LibraryView` 片名加类型/流派、`components.css` 加 `.cell-sub`），不影响本文引用。

**一句话结论：这轮修掉了「看得见的差异」，却把「反馈的类型」弄丢了——toast 的三色圆点是全站唯一的成功/失败信号，在"删死代码"时被一起删掉了。其余回归都属于"改对了 A、漏了 B"的局部失配，没有架构性问题。**

---

## 一、第五轮 5 条清单逐条状态

| # | 第五轮条目 | 状态 | 这轮做了什么 | 还差什么 |
|---|---|---|---|---|
| 1 | **危险色语义** | 🟡 部分修 | `f6f08b0`：5 个文件 10 处换成 `.btn--danger-text`；`.table .btn--danger-text { color: var(--c-red) }` 让表内静止即红（`components.css:1217`） | ① "静止即红"**只在 `.table` 内生效**，表外仍是灰的（`:1239-1246`）；② 两个**导航**链接误用危险色（`VideoDetailView:125`、`WatchlistDetailView:336`）；③ 表内 hover 铺了红色底（`:1218`），违反 SPEC §4「hover 只改前景颜色」 |
| 2 | **忙碌态统一** | 🟡 部分修 | `9da0895`：`LinesView:94`、`LiveView:68`、`LiveView:178`、`WatchlistDetailView:206` 补 `disabled` | 还有 **6 处行删没有** `disabled`：`OrdersView:151`、`ShopView:167`、`WatchlistsView:171`、`SongDetailView:44`、`VideoDetailView:98`、`VideoDetailView:580`；且新增的全是"全局 `isPending` 禁掉整表"，不是按行；`aria-busy` 仍是 1 处（`SeekView`） |
| 3 | **弹层结构统一** | ⬜ 未修 | 新增 FundView 转赠弹层用了 `footer` 槽（`FundView:44-113`），这点是对的 | Modal 从 25 涨到 **26**，footer 槽仍是少数；宽度还是 400 / 420 / 460 / 480 / 520 / 600 **六档**；标题仍是"动词 / 名词 / 动作·对象"三套；`UploadView` 新增的"归档到影片"弹层又在 body 里放按钮 |
| 4 | **回车语义** | 🟡 部分修（P0 已修） | `confirm.tsx`：danger 时焦点移到「取消」（`:88`），Esc 不再穿透（`isConfirmOpen()` + `stopImmediatePropagation`，`Modal.tsx:40`、`confirm.tsx:57-60`） | 弹层仍**没有 `<form>` / `onSubmit`**，回车不能提交；没有 `autoFocus` 的弹层，回车仍等于关窗（`Modal.tsx:32-34` 未动） |
| 5 | **筛选进 URL** | ⬜ 未修 | 间接改善：转赠搬到资金页后，账号页的自绘分页整块消失 | `LinesView` 的 `term/page/pageSize` 仍在 state；`ShopView` 的 `page/categoryId` 仍在 state；Fund 胡萝卜 tab 把 `pageSize` 写死 20、忽略 URL 的 `size`（`FundView:65`）；`page_size` / `size` 两种参数名仍并存 |

### 顺带复核第五轮的 P0/P1 附加项

| 附加项 | 状态 | 证据 |
|---|---|---|
| Esc 嵌套（关底层、留确认框） | ✅ 已修 | `isConfirmOpen()` 计数 + `document` 监听 + `stopImmediatePropagation` |
| danger 确认框焦点在「删除」 | ✅ 已修 | `autoFocus={pending.danger}` 给了取消按钮（`confirm.tsx:88`） |
| 错误提示双发 | 🟡 部分修 | `SongDetailView`、`WatchlistDetailView` 清了；`WatchlistsView:61` 与 `RecycleView:43/62` 仍在（`mutateAsync` + catch 叠在全局 `MutationCache.onError` 上） |
| 分页三套实现 | 🟡 部分修 | 账号页那套随转赠一起消失；`ShopView:197`、`WatchlistDetailView:220` 仍是自绘 |
| 弹层标题式样 | ⬜ 未修 | 新弹层继续两种写法混用（`转赠胡萝卜` vs `归档到影片 · X`） |

---

## 二、新增问题（回归）清单

### P0 · 反馈类型信号被删掉了

**2.1 toast 的 success / error 视觉完全消失**

`src/styles/components.css` 里这三条被删（`git show a79b2a2..HEAD -- src/styles/components.css`）：

```css
- .toast--success i { background: var(--c-green); }
- .toast--error i { background: var(--c-red); }
- .toast--error { color: var(--fg); }
```

而 `src/ui/toast.tsx:51-52` 仍在渲染 `<div className={... toast--${item.type}}><i />`。结果是：

- `.toast i` 只剩 `background: var(--fg-4)`（`:769`）→ 成功、失败、信息**三种提示长得一模一样**；
- 失败文案也随之回到 `--fg-2`，与成功同级。

这是全站唯一的全局反馈通道（76 处调用、`MutationCache.onError` 兜底也走它）。删掉后，"操作成功了没有"只能靠读文字。**这条应当最优先恢复**，它是"删死代码"里的误删，不是设计决定。

### P0 · `.is-stale` 会锁住点击

```css
.is-stale { opacity: 0.45; transition: opacity 120ms var(--ease); pointer-events: none; }  /* :1012-1016 */
```

8 个列表页把它挂在**整个 `.table-card`** 上（`LibraryView:105`、`OrdersView:75`、`ShopView:110`、`LiveView:137`、`MusicView:90`、`SeekView:87`、`WatchlistsView:113`、`RecycleView:135`）。

问题不在变暗，在 `pointer-events: none`：

1. **分页也在里面**。`<Pager>` 就在 `.table-card` 内（`LibraryView:183`、`LiveView:209`），切换筛选后整块变暗 + 不可点，用户想"翻回去"要等新数据到达（SPEC 记录这台实例有 2–11s 的接口）。
2. **行操作按钮一起失效**，且没有任何光标提示（`pointer-events: none` 连 `cursor: pointer` 都拿去）。
3. 变暗 + 不能点 + 没有说明，读起来就是"页面卡住了"——正是这条改动想避免的感受。

建议：保留 `opacity: .45` 与过渡，删掉 `pointer-events: none`；若要防误点，只对 `.table tbody tr` 的点击加 `pointer-events: none`，把 Pager 排除在外。

### P1 · 详情页海报从 76×108 缩成 30×40

`VideoDetailView:136`：

```
- <img className="poster-img" style={{ width: 76, height: 108 }} src={...} />
+ <Poster src={video.video_image_poster} name={video.video_title} />
```

`Poster` 只用默认 `className="poster-img"`（`components.css:1249`，30×40），且组件**没有 `style` 透传**（`Poster.tsx:8`），调用方无法还原尺寸。详情页头部的主视觉缩成了列表缩略图大小。

其余 5 处替换（`MusicView:119`、`OrdersView:95`、`ShopView:128`、`LibraryView:141`、`SeekView:108`）原本就是 30×40，无影响——**所以这是单点失配，不是组件问题**：给 `Poster` 加 `style` 或 `size` 透传即可。

### P1 · 危险色被用在导航上

| 位置 | 现在 | 应该 |
|---|---|---|
| `VideoDetailView:125` 空态「回到媒体库」 | `btn btn--danger-text` | `btn btn--ghost` |
| `WatchlistDetailView:336` 页头「返回列表」 | `btn btn--danger-text` | `btn btn--ghost` |

表外 `.btn--danger-text` 静止是灰的（`:1243`），所以今天只是"hover 时变红"。但一旦有人把"静止即红"推广到全局（这是提交信息里写的目标），**"返回列表"会变成红色按钮**。危险色用在导航上是语义污染，现在就改掉成本最低。

### P1 · 表内危险按钮 hover 铺底色

```css
.table .btn--danger-text:hover { color: #fff; background: rgba(255, 92, 92, 0.16); }   /* :1218 */
```

SPEC §4 第一条：「hover 只改前景颜色。不铺底色、不位移、不加阴影」。这是本轮**新引入**的直接违规（上一轮是 `.btn--ghost`/`.btn--quiet` 的灰→红，没有底色）。建议改回只改颜色，用 `--c-red` → `#ffb094` 的两级亮度表达 hover。

### P1 · `.cards--1` 没有定义

`FundView:25` 用了 `<section className="cards cards--1">`，但 CSS 只有 `.cards`（3 列）、`.cards--2`、`.cards--4`、`.cards--wide`（`components.css:308-316`、`:1277-1278`）。结果是「胡萝卜余额」这张卡**只占 1/3 列宽**，右边空着两大格。

改法二选一：加 `.cards--1 { grid-template-columns: minmax(0,1fr) }`，或直接用现成的 `.cards--wide`。

### P1 · 窄屏侧栏的账号名不再隐藏

`components.css:585` 的窄屏规则仍在按**旧结构**写：

```css
.rail__foot > span:last-child { display: none; }
```

但 `Sidebar.tsx:164-167` 现在把账号名放进了按钮内部（`.rail__account-name`），不再是 `.rail__foot` 的直接子 `span`。于是 ≤900px（`--rail-w-icon: 66px`）时，头像 26px + 名字 + 箭头挤在 66px 里，被 `.rail` 的 `overflow: hidden` 裁掉一半。

改：`.rail__foot .rail__account-name, .rail__foot .rail__account-caret { display: none; }` 并让 `.rail__account { justify-content: center }`。

### P2 · CSS 里留着四个没人用的选择器

"删死代码"删了 14 个类，但这几处漏了：

| 位置 | 内容 | 问题 |
|---|---|---|
| `components.css:414` | `.th-sort[aria-sort='descending'] svg,` | 基础规则已删，这行**与下一行 `.table tbody td` 拼成了一个选择器列表**。今天 no view 用 `aria-sort`，所以无视觉影响；一旦有人加回来，那个 svg 会吃到 `height: 38px; padding: 7px 20px; border-bottom` |
| `components.css:629` | `.legend { padding-top: 0 }` | 只在 900px 媒体查询里剩一条，基规则已删 |
| `components.css:1112` | `.com-zone,` | 与 `.badge, .zone` 拼在一起，`.com-zone` 全站未使用 |
| `components.css:1238` | `.table td.action-cell` | 全站未使用（第五轮已提过） |

### P2 · 媒体查询里重复了一段全局规则

`components.css:593-607`（`@media (max-width: 900px)` 内）出现了 `.page-title__hint` 与 `.crumb__link` 的**完整副本**，与 `:204-216` 的全局定义一字不差，缩进也没跟上。不影响渲染，但说明这次补丁是把全局规则贴进了媒体查询，后续改一处会漏另一处。

### P2 · 侧栏显示用户名，概览显示笔名

- `Sidebar.tsx:166`：`{user?.username || '未登录'}`
- `OverviewView:87`：`session.data?.pseudonym || session.data?.username`

同一个"我是谁"，侧栏用登录名、概览用笔名。（`rememberAccount` 的存盘也改成了 `user.username`，同源。）如果是有意为之（笔名可重复，切换账号需要唯一标识），建议在侧栏加一行小字标出笔名；否则统一回 `pseudonym || username`。

### P2 · 直播页的 pending 是"点一行、全表禁用"

`LiveView:68` 与 `:178` 用的是 `actions.removeMedia.isPending` / `actions.removeChannel.isPending`——全局 pending，删一个源会让**所有源行**同时变灰。第二/三轮已经论证过应按 `mutation.variables` 精确到行（`SeekView:163` 是现成模板）。

### P2 · 面包屑漏了「支付」

`PageHeader.tsx` 的 `SECTION_PATH` 有 15 个键，但 `PayView.tsx:33` 的 crumb 是 `['支付']`，没有对应项 → 支付页的面包屑首段仍不可点。同类风险：这张表靠手写字符串与路由对齐，新增页面忘了加就会静默回落。

### P3 · 新建的归档弹层

`UploadView:279-320`：

- 「归档到这里」按钮**没有 `disabled`**，连点会重复归档（第二次必然失败，但会弹错）；
- 搜索 + 结果列表与上面「选择影片」弹层（`:287` 起）几乎逐行重复，两份实现将来会分叉。

### P3 · `.is-stale` 与 `.content-in` 挂在同一个元素上

8 个列表页都是 `className="table-card content-in ... is-stale"`。`animation` 里的 `opacity` 优先级高于普通声明，所以"刚挂载 + 处于 stale"的那 160ms 里，0.45 的变暗会被动画覆盖成 1。实际窗口很窄（key 变化时 is-stale 已为 false），但这是个隐患：**不要用 animation 与类内 opacity 表达同一属性**。

---

## 三、转赠移走后，AccountView 的残留

**没有未使用的 import 或 state。** `tsconfig` 开了 `noUnusedLocals`/`noUnusedParameters`，`npx tsc --noEmit` 通过；`transferring` / `transferTo` / `transferAmount` / `carrotPage` / `useCarrotHistory` / `useBanList` / `IconLeft` / `IconRight` 均已清除。

只有一处**参数层**的残留：`router.tsx:104-108` 的 `tab` 收窄为 `'profile' | 'invite'`，旧链接 `?tab=carrot` / `?tab=ban` 现在会**静默降级到「资料」**。已确认全仓库没有这类链接了（封禁入口改到 `/users`），所以不会误导用户；但外部书签会落到错误 tab。可接受，记一笔即可。

---

## 四、为了不再回归

1. **恢复 toast 三色**，并把 `toast--success/--error` 写进 SPEC §4——它属于"反馈语义"，不是装饰。
2. **`.btn--danger-text` 只给破坏性动作**；导航用 `.btn--ghost`。若要把"静止即红"推广到全局，先清掉这两处误用。
3. **`.is-stale` 只负责变暗**，不参与命中测试；要防误点就只锁行。
4. **组件收口时检查调用方的尺寸假设**（`Poster` 加 `style` 透传）。
5. **改结构的同一条提交里同步改对应的 CSS 选择器**（侧栏 `.rail__foot > span:last-child`、`.th-sort`），否则"删死代码"会变成"留下死选择器"。

---

## 五、一句结论

**方向都对，收尾少了"回头看对照物"这一步——删 toast 三色时没查谁依赖它，改侧栏结构时没查媒体查询，换 Poster 时没查调用方给了尺寸；先把 2.1 恢复（今天），其余按 P1 → P2 补，骨架不用动。**
