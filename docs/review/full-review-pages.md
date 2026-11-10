# 页面功能完整性 & 状态处理审查（21 页）

审查对象：`rewrite/v2`，基线 `79ce044`（2026-11-10 20:18）。
运行方式：`VITE_MOCK=1 npx vite --port 5278`（5276 端口被并发进程占用并被反复 kill，改用 5278，跑的是同一份源码与同一份 `src/api/mock.ts`）。

标记约定：

- **实测**：在浏览器里真的点过 / 改过 URL / 改过 mock 观察到的。
- **读代码**：只从源码推导，mock 无法构造该场景。
- **并发修复中**：写报告时工作区已有未提交修改正在修这条（记录在案，避免重复劳动）。

每页「能做什么」是对源码交互点的清点（读代码得出）；其中标注「实测」的行为在浏览器里实际点过，未标注的是「交互入口确实存在、但 mock 下点了没有可判定的效果」，因此没有逐一点击。

---

## 0. 结论速览

| 严重度 | 数量 | 代表问题 |
| --- | --- | --- |
| **P1** | 0 | （唯一候选项：资源列表的 `{medias}` 信封 —— 审查末尾被并发进程用真机结果否定并已修复，降级为 P3，见 video-1） |
| **P2** | 5 | 悄悄话「发出的」把「发给」显示成自己；用户详情胡萝卜写死 `—`；订单备注弹层的「删除订单」在店铺视角调买家接口；音乐片单「每页条数」无效；歌曲 4.6 星显示成「未评分」 |
| **P3** | 51（另有 5 条跨页共性问题） | 越界页码的空白/误导空态、空 label、⌘K 无效、备注重复显示、英文 Director/Actor、复制失败仍报成功…… |

逐页结果：

| 页面 | 结果 |
| --- | --- |
| `/` 概览 | 1×P3（「继续观看 / 我的近况」错误态无重试；mock 缺两个接口导致常态即错误） |
| `/library` | 2×P3（越界页码伪装成空库且无分页器；`0 人求` 用警示徽标） |
| `/watchlists` | 1×P3（搜索无结果时仍说「还没有片单」） |
| `/watchlists/1000` 影视片单 | 2×P3（添加影片弹窗污染列表搜索；meta 缺失无错误态） |
| `/watchlists/1003` 音乐片单 | **1×P2**（每页条数选择器无效） |
| `/seek` | 3×P3（详情失败仍说「还没有人投票」；「全部」不含已取消；`去上传` 非 SPA 跳转） |
| `/music` songs/albums/persons | 3×P3（歌手 tab 三列全空；歌手无头像；歌曲状态列判定字段待确认） |
| `/live` | 3×P3（切频道不重置源分页；空 label；源类型只有 m3u8） |
| `/shop` 全站商品 | 2×P3（关闭分类弹层后 URL 残留；限购数量未校验） |
| `/shop?scope=mine` | 2×P3 + 1 已修（空态文案；分类排序静默失败；sellerId=0 兜底已并发修复） |
| `/shop/seller/1002` | 2×P3（无分类时搜索/排序整块消失；非法 ID 折 0 仍发请求） |
| `/orders?scope=shop` | **1×P2**（备注弹层删除调错接口）+ 1×P3（长商品名被当订单号） |
| `/orders?scope=mine` | 1×P3（双查询已并发修复） |
| `/lines` | 2×P3（越界页码整页空白；`sizes` 与路由可选值不一致） |
| `/users` | 通过 |
| `/users/eK98L0NEMs` | **1×P2**（胡萝卜写死 `—`）+ 2×P3（提示文案；最近播放无错误态） |
| `/fund?tab=orders` | 2×P3（任意状态都能提交凭证；切 tab 不重置页码） |
| `/fund?tab=merchant` | 2×P3（不显示服务商审核状态；转赠功能重复实现） |
| `/fund?tab=carrot` | 1×P3（明细失败被当成空态） |
| `/whisper` | **1×P2**（「发给」列显示自己）+ 1×P3（列表接口 mock 缺失） |
| `/account?tab=profile` | 4×P3（复制不校验结果；设备失败无错误态；高清海报开关在 mock 必失败；密码为 null 时按钮残缺） |
| `/account?tab=invite` | 3×P3（无邀请时无空态；备注重复；「已邀请 N 人」与表格口径不一致） |
| `/recycle` | 4×P3（空态文案；`by` 非受控；恢复在 mock 必失败；影片 tab 显示未删除数据） |
| `/media/1` | 6×P3（`{medias}` 信封兼容、字幕无错误态、演职员英文岗位、头像无兜底、空名字可提交、缺集时静默 return；其中第一条已并发修复） |
| `/music/song/1` | **1×P2**（评分下拉把 4.6 显示成「未评分」）+ 4×P3（收藏无状态回写；歌取不到无错误态；播放地址复制不校验；mock 下 songId 不生效） |

## 0.1 跨页共性问题

### 共-1（P3）列表页「空结果」与「页码越界」不可区分，越界时还会丢掉分页器

- 复现：`/library?page=2&page_size=20&q=&type=`（数据只有 10 条）。
- 预期：提示「第 2 页没有内容」并保留分页器让用户回第 1 页；或者自动纠正页码。
- 实际：显示 `没有匹配的影片 / 片库还是空的`（`src/views/LibraryView.tsx:105-111`），`data.total`（10）根本没用到，分页器整块消失 → 用户只能点「清空筛选」才能回到第 1 页。
- 同类：`/lines?page=2` 更糟，**整页空白**（无表格、无空态、无分页器，`src/views/LinesView.tsx:72` 只在 `paged.length > 0` 时渲染，而两个 EmptyBlock 只看 `rows.length`）。
- 验证：实测（两页都点过）。
- 建议统一做法：`data.total > 0 && data.items.length === 0` 时渲染「本页无内容 + 分页器」。

### 共-2（P3）空态文案不区分「库是空的」与「筛选/搜索没命中」

- `/watchlists` 搜不到时仍显示「还没有片单 + 新建片单」（`src/views/WatchlistsView.tsx:118-124`），暗示用户去建片单，实际是他搜索了不存在的名字。
- `/seek` 恒为「没有求片」（`SeekView.tsx:122`），即使勾了「只看我认领的」+ 类型筛选。
- `/recycle` 恒为「回收站是空的」（`RecycleView.tsx:128-132`），即使按资源 ID 搜了一个不存在的 ID。
- `/shop?scope=mine` 恒为「这个分类还没有商品」（`ShopView.tsx:266`），即使没选分类。
- 验证：实测（前三条改 mock 造空 + 改 URL 造筛选）；`/shop` 一条实测。
- 参照 `/music`、`/library`、`/seller` 已经做对了（`search.q ? 没有找到「q」 : 库还是空的`），可以直接抄。

### 共-3（P3）「取不到」与「没有」的提示混用

- `/` 的「继续观看」「我的近况」错误态只是两行灰字（`src/views/OverviewView.tsx:229` 的「暂时取不到观看记录，稍后刷新～」与 `:281` 的「本周记录取不到，稍后再看～」），**没有重试按钮**，也没有 `ErrorBlock`，与其它页的错误态不一致。
- 验证：实测（mock 缺 `/api/video/record/list`、`/api/user/stats/video/history`，所以常态就是这两句）。

### 共-4（P3）侧边栏标注了 ⌘K，但全站没有任何快捷键实现

- 复现：任意页按 `⌘K`。
- 预期：焦点跳到侧边栏搜索框。
- 实际：焦点仍在 `body`（实测）。`src/components/Sidebar.tsx:125-128` 渲染了 `<kbd>⌘</kbd><kbd>K</kbd>`，全仓 `grep metaKey` 无命中。
- 要么实现，要么删掉提示。

### 共-5（P3）复制到剪贴板失败也提示成功

- `src/views/AccountView.tsx:191`、`:208`：`void navigator.clipboard.writeText(...)` 后立刻 `toast('已复制…')`。非 HTTPS、无权限、iframe 场景下 writeText 会 reject，用户看到成功提示但剪贴板没变。
- 同类：`VideoDetailView.tsx:445`、`SongDetailView.tsx:226`（这两处有 `await`/`?.`，但 `SongDetailView` 在 `navigator.clipboard` 为 undefined 时仍会 toast「已复制」）。
- 验证：读代码。

---

## 0.2 并发修改说明（审查期间同一 checkout 上的其它提交）

审查期间另一个进程在同一个 checkout 上连续提交（`a6a297a` → `79ce044` → `9758df5` → `f29a6b2`）。其中有两条正是本次独立发现的问题，**已被该进程修复**，记录在此避免重复劳动；其余结论基于这些提交之外的代码。

| 提交 | 改动 | 对应本报告 |
| --- | --- | --- |
| `9758df5` | `useShopProducts(..., mine && Boolean(seller.data?.seller_id))`，等 seller 回来再查；`useShopOrders/useShopMineOrders` 加 `enabled` 按视角只挂一条 | 已修：shop-mine-1（我的店铺首帧用 `seller_id=0` 拉到全站商品）、orders-mine-1（两个视角同时发请求） |
| `9758df5` | `createOrder` / `payOrder` 改用 `invalidate(['shop'])` | 附带修掉「下单后商品详情/网格不刷新」（数据流审查的范围，本报告未单列） |
| `79ce044` | `ProductGrid` 补滚动加载失败重试；`useShopCounts` 三个计数请求补 `sort_by` | 本报告未把它列为问题（已修） |
| 未提交 | `mediaApi.list` 返回类型改成 `VideoMedia[]`，`useMediaList` 增加 `medias` 分支（注释：「真机返回的是数组，不是 { medias }」） | 已修：video-1 —— 真机结论否定了「P1 疑似」，降级为「类型声明与归一化不一致」 |

> 提醒：写报告期间 `src/api/endpoints.ts`、`src/api/queries.ts` 仍有未提交改动在进行，行号可能再漂移 ±几行。

## 0.3 mock 覆盖缺口（决定哪些结论只能「读代码」）

`src/api/mock.ts` 与 `src/api/endpoints.ts` 对不上的地方，会直接表现为「页面一片错误态」或「筛选点了没反应」，**这些不是应用缺陷**，但会让审查结论失真，建议补 mock：

| 接口 | 现状 | 影响页面 |
| --- | --- | --- |
| `GET /api/video/record/list` | 未实现 | `/` 继续观看恒错误 |
| `GET /api/user/stats/video/history` | 未实现 | `/` 我的近况恒错误 |
| `DELETE /api/watch/{id}` | 未实现 | 片单删除必失败 |
| `POST /api/watch` | 落进了 GET 分支（返回列表） | 新建/编辑片单「成功」但返回体不对 |
| `GET /api/watch` 忽略 `type`、`name` | 未按参数过滤 | 影视/音乐切换、片单搜索看不出区别 |
| `POST/DELETE /api/watch/{id}/music/{songId}` | 未实现 | 音乐片单加/删歌必失败 |
| `POST /api/seek/query`、`PUT /api/seek/urge` | 未实现 | 求片详情恒「取不到」；催片必失败 |
| `POST /api/seek` 忽略 `video_title` / `video_type` / `upload_self` | 未过滤 | 求片搜索、类型、「只看我认领的」看不出区别 |
| `GET /api/music/song/list` 忽略 `song_id` / `has_media` / `is_favorite` | 未过滤 | `/music/song/1` 显示的是第一首歌；「无资源」「我收藏的」无区别 |
| `DELETE /api/music/song/{id}/delete`、`PUT .../media/move` | 未实现 | 删歌、移资源必失败 |
| `GET /api/video/media/listAll` | 未实现 | `/recycle` 资源 tab 恒错误 |
| `PUT /api/video/media/restore` | 未实现 | 恢复资源必失败 |
| `GET /api/video/list` 忽略 `only_delete` | 未过滤 | `/recycle` 影片 tab 显示的是未删除影片 |
| `GET /api/whisper/receiver`、`/sender`、`POST /reply` | 未实现 | `/whisper` 恒错误（本次用临时 mock 补了这两个 GET 才验证出 P2） |
| `PUT /api/user/originalImage`、`DELETE /api/user/telegram` | 未实现 | 「高清海报」「解绑 Telegram」必失败 |
| `/api/shop/product/list` 忽略 `sort_by` / `sort_order` | 未排序 | 商城「销量/价格」排序看不出区别 |
| `/api/shop/order/shop/order` 与 `/user/order` 不分方法 | DELETE 都返回同一份列表 | 无法区分「删店铺订单 / 删我的订单」 |
| `GET /api/video/persons` 返回完整 picsum URL | 与 `VideoPerson.image_profile`（裸文件 id）语义不符 | 演职员头像全部裂图 |
| `/api/music/song/list` 缺 `has_media` | 只有 `count_medias` | 歌曲「状态」列恒 `—` |
| `/api/music/person/list` 返回 `image_profile` | UI 读 `image_profile_url` | 歌手 tab 永远没头像 |

---

## 1. `/` 概览

### 能做什么

- 工具条：`上传`（→ `/upload`）、`回收站`（→ `/recycle`）。
- 待办三卡：待处理求片 3 条、待发货订单 1 单、封禁中用户 1 人 —— 都可点，跳到对应页并带筛选（`{tab:'default'}` / `{pay:'paid',delivery:'pending'}` / `/users`）。数字与 mock 一致（`/api/seek` status=default 3 条；店铺订单 is_pay&!is_delivery 1 条；`/api/ban/list` 1 条）。
- `签到` 卡：`立即签到` → 打开「今日签到」弹窗（可填 10 字内一句话）→ 提交调 `/api/user/sign` → toast「第 1 位签到 · 连续 7 天 · +2 胡萝卜」；今天已签时按钮为「今天已签」且 disabled（mock `sign` 有值，所以实测走的是 disabled 分支）。
- `我的胡萝卜` 4,210 个 + 境界「结丹后期 · 距下一境 1,790」—— 与 `realmOf(4210)` 一致（4201→6000 差 1790）。
- `片单槽位` 2 个可用 → `/watchlists?scope=self`；`我的上传` 0 B → `/upload`。
- 继续观看 / 我的近况：见下。
- 底部「我的片单」区块只在**没有任何待办**时出现（mock 有待办，所以实测没出现；逻辑在 `OverviewView.tsx` 的 `showWatchlists`）。

### 状态三件套

| 区域 | 加载 | 空 | 错误 |
| --- | --- | --- | --- |
| 待办卡 | 用全部三张卡占位（注释交代过），不闪「没有待办」 | 隐藏整块并用「我的片单」填补 | 单项失败 → `—`（`useTodos` 内部 catch 成 null） |
| 签到/胡萝卜/槽位/上传 | `—` + 「读取中」 | — | 会话错误时顶部有 `ErrorBlock`（可重试） |
| 继续观看 | 骨架 | 「还没有未看完的内容」 | 只有一行灰字，**无重试** |
| 我的近况 | 骨架 | 「本周还没有观看记录」 | 只有一行灰字，**无重试** |

### 问题

**overview-1（P3）「继续观看」「我的近况」错误态没有重试，且与全站错误态风格不一致** — 读代码 + 实测（mock 缺接口，所以这两块常态就是错误文案）。位置：`src/views/OverviewView.tsx` 中 `watching.error` / `stats.error` 的两个 `<p className="card-note">`。预期：给 `ErrorBlock`（bare）或至少一个「重试」按钮，与 `StateBlock.tsx` 统一。

其余通过：数字全部对得上（3 条 / 1 单 / 1 人 / 4,210 / 2 个 / 0 B / 7 天连续 / +2）。

---

## 2. `/library` 媒体库

### 能做什么

- 类型 tab：全部 / 电影 / 剧集 → URL `type=`，数据随之变化（全部 10 条 → 电影 6 条），`共 N 条` 同步。
- 搜索框：输入即搜（350ms 防抖），实测输入「雾」→ URL `q=%E9%9B%BE`、剩 1 行；回车也会立即提交。
- 每页条数：`20 / 页` → 切 50 后 URL `page_size=50` 生效（Pager `onPageSize`）。
- 行点击 / 回车 / 空格 → `/media/$videoId?season=1&episode=1`；实测点「夜航西飞」进入 `/media/1`。
- `回收站` → `/recycle?tab=media...`；`新增入库` → `/upload`。
- 右上角「拉取中」小标签在 fetch 时出现。

### 状态

加载：`LoadingBlock`（8×5 骨架）✅；空：`EmptyBlock`（`没有匹配的影片` + 按有无关键词切换 hint + `清空筛选`）✅；错误：`ErrorBlock` + 重试 ✅。

### 问题

**library-1（P3）越界页码 → 伪装成「片库还是空的」且分页器消失** — 实测 `?page=2`。见共-1。位置 `src/views/LibraryView.tsx:105-111`。

**library-2（P3，低价值，仅记录）**「求片」列在 `seek_is_request && request_count === 0` 时渲染 `⚠ 0 人求`（mock 第一条数据就是这种组合）。预期：0 人求不该用警示徽标。位置 `LibraryView.tsx` 求片单元格。实测。

数据核对：10 条影片的 `资源 N 个 · 字幕 N`、上映日期、类型、求片数均与 mock 一致（如夜航西飞 2 个/字幕 1/0 人求/2026-01-15；山海之间 6 个/字幕 2/5 人求/2022-05-15）。封面 picsum 图正常加载（naturalWidth=200）。

---

## 3. `/watchlists` 片单列表

### 能做什么

- 范围 tab：全部 / 我创建的 / 我订阅的 → `scope=`，`我订阅的` 实测只剩 1 条（4K 修复计划），符合 mock `is_subscribe`。
- 类型 seg：影视 / 音乐 → `type=`；**mock 不按 type 过滤**，所以影视 tab 里 4 条全在（含 `夜间通勤` 这首音乐片单），无法验证（mock 缺口）。
- 搜索框（350ms 防抖，`q=`）——同样因 mock 忽略 `name` 无法验证。
- 行点击 → 详情页；`删除` 只在 `is_self` 行出现，带二次确认（实测弹层文案：`删除片单「本周新片」？/ 24 部影片会一起从片单移除…`），确认后调 `DELETE /api/watch/{id}` → **实测弹错误 toast「未模拟的接口：/api/watch/1000」**（mock 缺口）。
- `新建片单` → `WatchlistForm` 弹窗（名称/简介/公开/价格/标签/封面/显示空片单）。
- 顶部「片单槽位剩余 2」来自 session。

### 状态

加载 ✅ `LoadingBlock`；空 ✅ `EmptyBlock`（但没有 hint）；错误 ✅ `ErrorBlock`+重试。分页器只有 onPage 没有 onPageSize（路由把 page_size 写死 20，见 `src/router.tsx:398`，但本页没暴露选择器，所以不算 bug）。

### 问题

**watchlists-1（P3）搜索无结果时文案误导** — 见共-2。实测：把名字搜成不存在的内容仍显示「还没有片单 / 新建片单」。

---

## 4. `/watchlists/1000` 影视片单详情

### 能做什么

- 头部：`订阅/取消订阅`（toast「已订阅」，mock 不持久化）、`编辑`（打开 `WatchlistForm`，提交走 `POST /api/watch`）、`维护者`（弹窗填用户 ID，空格分隔）、`隐藏/显示`、`动态抓取`（填 URL 保存/留空关闭）。
- 概览区：公开/私密徽标、标签 chips、`订阅需 N 胡萝卜`、简介、统计（24 影片 / 128 订阅 / 6 天前更新 / 作者 sorakand）。
- 列表：排序输入框（失焦提交，toast「已调整排序」）、备注按钮（弹窗，200 字内）、`移出`（二次确认）、行点击进影片详情。
- `添加影片` 弹窗：搜片名 → 候选行 → `加入`。

### 状态

- 片单 meta：**没有加载态也没有错误态**（`item` 为空时头部只剩「片单」二字，工具栏和列表照常渲染）。
- 影片列表：加载 ✅ 骨架；空 ✅「片单里还没有影片」；错误 ✅ `ErrorBlock`。
- 分页器用 `videos.data.page_size`（注释说明后端把 page_size 固定成 15）—— 做法正确。

### 问题

**watch-1000-1（P3）「添加影片」弹窗与页面筛选共用同一个 `term`** — 实测：打开弹窗输入「夜」后，URL 变成 `q=夜`、工具栏搜索框也变成「夜」、**背后的列表被过滤成 1 行**；关掉弹窗后列表仍然是被过滤的状态。位置：`src/views/WatchlistDetailView.tsx:44`（`useWatchSearch(id, term)`）与 `:309`（弹窗内 `<input value={term}>`），与 `:161`（工具栏输入框）同一个 state。预期：弹窗用自己的 state（音乐片单的「添加歌曲」就是用自己的 `songTerm`，见 `:646`）。

**watch-1000-2（P3）片单 meta 取不到时没有错误/不存在态，音乐片单会退化成影片片单 UI** — 实测（把 mock 的 `watches` 清空）：`/watchlists/1000` 与 `/watchlists/1003` 都只剩 `片单 / 详情` + `片单里还没有影片`；1003 本是音乐片单，走的是影片分支（`item?.type === 'music'` 为 false）。位置：`WatchlistDetailView.tsx:56`（`const item = watch.data?.items[0]`，无 `isLoading`/`!item` 分支）、`:177`（空态）。预期：区分「加载中」「片单不存在/无权限」两种状态。

---

## 5. `/watchlists/1003` 音乐片单详情

### 能做什么

- 搜歌名（350ms 防抖 → `q=`）；`添加歌曲` 弹窗（独立 state，输入即搜，`加入`）；`移除`（二次确认）；行点击 → `/music/song/$songId`；`返回列表`。
- 音乐片单在 mock 里 `is_edit_video=false`，所以没有添加/移除入口（正确：不是自己的片单）。

数据核对：3 首、时长 4:14 / 5:12 / 3:18、艺人 陈曦 / 林一 / （空）均与 mock 一致；「3 首」来自 `songs.data.total`。

### 状态

加载 ✅ `LoadingBlock`；空 ✅「这个片单还没有歌」；错误 ✅ `ErrorBlock`。

### 问题

**watch-1003-1（P2）「每页条数」选择器是死控件** — 实测：把 `20 / 页` 改成 `50 / 页`，URL 仍是 `page_size=20`，下拉框立刻跳回 20，列表不变。
- 原因：路由 `validateSearch` 把 `page_size` 写死 20（`src/router.tsx:417`），而 `WatchMusicList` 的 Pager 传了 `onPageSize`（`WatchlistDetailView.tsx:638`）→ `onSearch({page_size:50})` 被 validateSearch 覆盖回 20。
- 预期：要么放开 `page_size`（用 `asPageSize`），要么这个列表别暴露选择器。

---

## 6. `/seek` 求片

### 能做什么

- 状态 tab：全部 / 求片中 / 已认领 / 已完成 → `tab=`，实测「全部」7 条（10 条 mock 里 status 为 cancel 的 1 条、status 为 undefined 的 2 条被排除）。
- 类型 seg：不限 / 电影 / 剧集；开关「只看我认领的」；搜索框 —— 三者都只改 URL，**mock 不按这些参数过滤**，无法验证（mock 缺口）。
- 行点击 → `/media/$videoId`（带 season/episode）。
- 每行操作：`求片详情`（弹窗）、`认领`（`PUT /api/seek/claim`，toast「已认领」）、`去上传`（`<a href="/upload">`，整页刷新）、`催片`（弹窗填 1–5000 胡萝卜）。
- 详情弹窗：求片编号/状态/认领人/人数/悬赏/更新时间/上传期限 + 投票记录；已认领的行可「撤回认领」。

数据核对：求片数 1/3/8/12/2/5/1、悬赏 120/80/60/200/40/90/150、更新时间「刚刚/1 小时前/3 小时前…」都与 mock 一致。

### 状态

加载 ✅ 骨架 + 右上「拉取中」；空 ✅「没有求片」（无 hint/action）；错误 ✅ `ErrorBlock`+重试；详情弹窗有「读取中…」和「详情取不到，稍后再试～」。

### 问题

**seek-1（P3）详情接口失败时同时显示「还没有人投票。」** — 实测：点任一行「求片详情」，弹窗内容为 `详情取不到，稍后再试～ | 投票记录 | 还没有人投票。`。
- 原因：`Promise.all([query, history])` 一起 reject 后 `history` 保持 `[]`（`src/views/SeekView.tsx:206-216`），而投票空态只看 `!loading && history.length === 0`（`:292`）。
- 预期：详情失败时投票区应显示「一起取不到」，或干脆不渲染。

**seek-2（P3）「全部」tab 里永远看不到「已取消 / 已遗忘」的求片** — 读代码：`TABS[0].statuses = ['default','upload','complete']`（`SeekView.tsx:25`），而 `SEEK_STATUS` 里定义了 `cancel`「已取消」和 `forget`「已遗忘」（`src/lib/format.ts`）。mock 里恰好有一条 status=cancel 的求片，实测任何 tab 都看不到它。预期：要么加「已取消」tab，要么把「全部」的真意写清楚。

**seek-3（P3）`去上传` 用 `<a href>` 而非 `<Link>`** — 整页刷新，丢失 SPA 状态（小事）。

---

## 7. `/music` 音乐（songs / albums / persons）

### 能做什么

- tab：歌曲 / 专辑 / 歌手 → `tab=`，且切 tab 会清空搜索词（`onSearch({tab, q:''})`）。
- 搜索框（350ms 防抖）；songs tab 额外「全部 / 无资源 / 我收藏的」seg（→ `filter=`）。
- 每行 `同步` 按钮 → `POST /api/music/sync`，toast「已触发同步」。
- 行点击只在 songs tab 生效（进歌曲详情）；albums/persons 行不可点（无详情页，符合现状）。

数据核对：歌曲 3 首、时长 4:14/5:12/3:18；专辑「潮汐 10 首 / 2026-03-01」「夜行记 8 首 / 2025-11-12」；歌手 2 位。

### 状态

加载 ✅ `LoadingBlock`（切 tab 时会真的出现，因为只查当前 tab）；空 ✅ 区分 `search.q`；错误 ✅ `ErrorBlock`。

### 问题

**music-1（P3）歌手 tab 复用了专辑/歌曲的列，三列全空** — 实测歌手 tab 每行是 `陈 | 陈曦(首字缩略) | — | — | —`：`艺人` 列取 `person_artists`（歌手数据没有）→ `original_name ?? '—'`；`发行` 列取 `release_date`（歌手没有）；`状态` 列对歌手什么都不匹配。位置 `src/views/MusicView.tsx:111-120`（表头写死三列）与 `:140-158`（单元格取值）。预期：歌手 tab 显示「作品数 `count_medias`」等有意义的列。

**music-2（P3）歌手头像永远不显示** — 读代码 + 实测：UI 读 `row.image_profile_url`（`MusicView.tsx:137-138`），而接口/`VideoPerson` 体系里的字段是 `image_profile`（裸文件 id，见 `src/api/types.ts:131-138`），mock 也只返回 `image_profile` → 歌手列表只能显示首字缩略图。预期：按 `image_profile` 拼 `https://image.theotherdb.org/original/{id}`（`VideoDetailView.tsx:392` 就是这么做的），两处要统一。

**music-3（P3）歌曲「状态」列恒 `—`，「无资源」筛选无法验证** — 读代码：`row.has_media === false` 才显示「无资源」徽标（`MusicView.tsx:151`），`MusicSong` 类型里 `has_media` 与 `count_medias` 都在（`types.ts:394-397`），但 mock 只给 `count_medias`。实测 `晨间信号`（`count_medias: 0`）状态列仍是 `—`。若后端也只返回 `count_medias`，这条就是真 bug。判为「待真机确认」。

---

## 8. `/live` 直播

### 能做什么

- 媒体库 tab：全部 / 央视 / 卫视 → `library=`，列表随 `live_library_id` 过滤（mock 支持）。
- 行点击展开/收起「直播源」（`channel=`），展开行内：源名称、类型（M3U8/FLV）、地址、上传者、状态徽标、`删除`（`is_can_edit` 才显示）、`新增源`（同样 `is_can_edit`）。
- `新增频道` 弹窗：频道名称 + 媒体库下拉 + 简介 → `POST /api/live/list`。
- 频道行 `删除`（二次确认）。
- 直播源分页：`total > page_size` 才出现。

数据核对：3 个频道、源数 3/2/1、排序 80/70/60、更新「7 天前 / 7 天前 / 13 天前」、媒体库列映射成「央视/卫视」均正确。

### 状态

加载 ✅；空 ✅「这个媒体库还没有频道」；错误 ✅；直播源：加载 ✅、空 ✅「这个频道还没有源」、**错误 ❌ 没有 `media.error` 分支**（`src/views/LiveView.tsx` 的 `renderSources` 只处理 `isLoading` / `items.length`）。

### 问题

**live-1（P3）切换频道不重置直播源分页** — 读代码：`mediaPage` 是本地 state（`LiveView.tsx:22`），只有源列表自己的 Pager 会改它；`onSearch({channel: ...})`（`:206`）不会把它归 1。当 A 频道有 2 页、B 频道只有 1 页时，从 A 第 2 页切到 B 会看到「这个频道还没有源」。mock 里每个频道源都 ≤50 条（1 页），无法实测。

**live-2（P3）「新增频道」弹窗里有一个空 `label.field`** — 实测 DOM：`[频道名称, (空), 媒体库, 简介]`，空单元占了 `1fr 1fr` 网格的左半格，把「媒体库」下拉挤成半宽。位置 `src/views/LiveView.tsx:286-287`。

**live-3（P3）新增源的类型只有 m3u8** — `src/views/LiveView.tsx:331-334` 的 `<select>` 只有一个 `<option value="m3u8">`，而列表里明明有 FLV 源（mock 第二条 `path_type: 'flv'`）。预期：如果后端支持 flv，至少给两个选项；如果不支持，列表就不该出现 flv 源。

---

## 9. `/shop` 全站商品

### 能做什么

- 范围 seg：全部商品 / 我的店铺（`scope=`）。
- 排序 seg：默认 / 销量 / 价格 → `sort=`（mock 忽略 `sort_by`，数据顺序不变，无法验证排序结果）。
- 搜索框（350ms 防抖 → `q=`），实测搜「徽章」从 44 件缩到 8 件，正确。
- 卡片网格 + 滚动加载：实测从 24 张滚到底 → 44 张 + 「到底了」（正好等于 mock 里 `is_up` 的 44 件，下架的「亚克力立牌」被正确排除）。
- 点卡片 → 商品详情弹窗（`/api/shop/product/info`）；卡片右下角购物袋 → 快捷购买弹窗；详情弹窗里有店铺链接 → `/shop/seller/1002`。

### 状态

加载 ✅ 骨架；空 ✅ 区分 `q`；错误 ✅（`browse.error` 有 `ErrorBlock`，且 `ProductGrid` 现在能显示「没加载出来，重试」——这是并发提交 `79ce044` 刚补的）；滚动加载到底 ✅「到底了」。

### 问题

**shop-all-1（P3）「分类 / 店铺」按钮不改 URL，关闭弹层后 URL 仍残留 `tab=categories`** — 读代码 + 实测：`panel` 是本地 state（`ShopView.tsx:60`），`setPanel('categories')`（`:154`）不动路由；`onClose={() => setPanel(null)}`（`:397`）也不动。所以直接访问 `/shop?tab=categories` 会弹层（实测 OK），但关掉之后刷新又弹出来，且面包屑一直显示「分类」。
- 预期：点按钮时同步 `onSearch({tab})`，关闭时 `tab='products'`。

**shop-all-2（P3）限购数量不校验** — 读代码：mock/接口都带 `user_buy_max`（`ProductDetailModal` / `BuyModal` 里完全没用到），数量上限只按 `stock` 算（`ProductModals.tsx` 中 `max={Math.max(1, p.stock)}`）。买超过限购数量会由后端 422，前端只能弹一个错误 toast。

---

## 10. `/shop?scope=mine` 我的店铺

### 能做什么

- 四张统计卡：待发货 1 单「需要处理」、在售商品 2 件「共 3 件」、订单 3 单、销量 433 件「全部商品累计」—— 与 mock 完全对得上（132+61+240=433）。
- 分类 tab：全部分类/周边/兑换码/会员 → `category=`，实测「兑换码」只剩 1 条。
- 排序 / 搜索 / `新增商品`（无分类时 disabled 并带 title「先创建至少一个分类」）。
- 表格行操作：`下架/上架`（`/api/shop/product/up`）、`编辑`（先用手上的行数据打开弹窗，再异步补 `product/info`）、`删除`（二次确认）。
- 商品编辑弹窗：名称/封面（`ImagePicker`）/售价/原价/库存/排序/分类/立即上架。
- `分类` 按钮 → 分类管理弹层（新增、拖排序输入框、删除）；`店铺` 按钮 → 店铺设置弹层（名称/状态/ID/简介 + 编辑店铺）。

### 状态

加载 ✅；空 ✅（文案问题见共-2）；错误 ✅ `ErrorBlock`（只针对 mine 分支，正确）；分类弹层/店铺弹层都有加载与空态 ✅。

### 问题

**shop-mine-1（P3，已被并发修复）** 我的店铺在 `seller.data` 还没回来时用 `seller_id=0` 查商品，会把全站商品填进表格（`ShopView.tsx:68`）。写报告时工作区已改成 `enabled: mine && Boolean(seller.data?.seller_id)`。

**shop-mine-2（P3）空态文案**「这个分类还没有商品」，即使当前是「全部分类」且没有搜索词（实测）。见共-2。

**shop-mine-3（P3）分类排序输入框失败无反馈** — 读代码：`onBlur` 里 `Number(e.target.value)`，非数字（如 `abc` → NaN）时静默 return，用户以为改了。位置 `ShopView.tsx` 分类弹层的 `input type=number`。

---

## 11. `/shop/seller/1002` 别人店铺

### 能做什么

- 头部 hint：`简介 · 2 件在售 · 3 个分类`，`回到商城`。
- 分类 tab / 搜索（本地 350ms 防抖）/ 排序 seg；卡片网格 + 到底提示（实测 2 件，正确排除下架商品）。
- 点卡片 → 商品详情弹窗；购物袋 → 购买弹窗。没有任何管理入口（符合「别人的店」）。

### 状态

店铺信息：**没有加载态**（标题直接是「店铺」直到数据回来）；错误 ✅ `ErrorBlock`；商品：加载 ✅、空 ✅（区分关键词）、错误 ✅；分页加载失败 ✅（`ProductGrid` 的新重试）。

### 问题

**seller-1（P3）路由把非法 ID 折成 0 继续发请求** — `src/router.tsx:126` `Number(sellerId) || 0`，`/shop/seller/abc` 会以 `seller_id=0` 请求并把 mock 的默认店铺当成「幕间小店」显示（实测 `/shop/seller/1002` 正常；`0` 的情况 mock 无法区分）。预期：非法 ID 直接渲染「店铺不存在」。

**seller-2（P3）没有分类时，搜索与排序整块消失** — 读代码：工具条被 `categories.data && categories.data.length > 0` 整个包住（`SellerView.tsx:54`），所以「一家有商品但没建分类的店」里用户连搜索都做不到。预期：搜索/排序独立于分类渲染。

---

## 12. `/orders?scope=shop` 店铺订单

### 能做什么

- 视角 seg：店铺订单 / 我的订单（`scope=`）。
- 搜索（订单号或商品名，350ms 防抖）；支付状态 tab：全部/已支付/待支付；发货状态 seg：全部/已发货/待发货 —— 实测「待发货」从 3 条变 2 条，URL `delivery=pending`，数据同步。
- 行内：用户名列（有 `user_id` 时是可点的 `/users/$id` 链接）、买家备注、单价×数量、支付/发货徽标（`催发货 N` 会变黄）、下单时间。
- 操作（店铺视角）：`发货` / `撤销发货`（`PUT /api/shop/order/shop/delivery`）、`备注`（弹窗 200 字）、`删除`（`DELETE /api/shop/order/shop/order`）。

数据核对：3 条订单的金额/数量/时间（含 UTC→+08 换算）全部正确。

### 状态

加载 ✅ 骨架 + 右上「拉取中」；空 ✅「没有符合条件的订单」（筛选和真空共用，但文案恰好通用）；错误 ✅ `ErrorBlock`。

### 问题

**orders-shop-1（P2）「备注」弹层里的「删除订单」在店铺视角调用的是买家接口** — 读代码：行内删除用 `mineScope ? removeOrder : deleteOrder`（`OrdersView.tsx:257`，正确），但同一个页面的备注弹层里那颗「删除订单」写死 `actions.removeOrder`（`OrdersView.tsx:294`）。
- 复现：店铺订单 → 任一行 `备注` → 弹层里点 `删除订单` → 确认。
- 预期：调 `DELETE /api/shop/order/shop/order`（商户侧）。
- 实际：调 `DELETE /api/shop/order/user/order`（买家侧）。mock 两个接口都不校验方法，所以只会在真机上表现为删不掉/无权限。判定：读代码。

**orders-shop-2（P3）搜索把「12 位以上字母数字」一律当订单号** — `OrdersView.tsx:51/57`：`/^[0-9A-Za-z]{12,}$/` 命中就传 `order_no`，否则 `order_title`。商品名如果超过 12 位纯字母数字（英文名、条形码式命名）就搜不到。预期：先用一次「订单号精确匹配」，失败后再按名称搜，或给用户一个显式切换。

---

## 13. `/orders?scope=mine` 我的订单

### 能做什么

- 2 条订单（1 待支付 / 1 已支付），行内操作：`付款`（`/api/shop/order/user/pay`，toast「已支付」）、`催发货`（`/api/shop/order/user/urge`）、`关闭`（二次确认 → `/close`）、`删除`（买家接口 `removeOrder`，这里是对的）。

### 状态

同 12（加载/空/错误齐全）。

### 问题

**orders-mine-1（P3，已被并发修复）** 两个视角的查询都无条件挂载 → 我的订单页也会请求店铺订单接口，非商家会 403（多一份无用请求与一条静默失败）。写报告时工作区已加 `enabled` 参数并在 `OrdersView` 里传 `mineScope`/`!mineScope`。

---

## 14. `/lines` 线路

### 能做什么

- 搜索框（客户端过滤 name/url/tagline，**无防抖**，每次按键都改 URL）→ 命中「没有匹配「x」的线路」空态。
- `新增线路` 弹窗（名称/地址/简介，三者都必填）→ 创建后 toast 并清空表单。
- `删除`（只在自己创建的、`is_self` 的线上出现）→ 二次确认。
- 每页条数 20/50（Pager `sizes={[20,50]}`，`onPageSize` 生效）。

数据核对：2 条线路、`创建时间` UTC→本地换算正确（`2026-09-20T18:00:24Z` → `09-21 02:00`）。

### 状态

加载 ✅；空 ✅「还没有线路」；搜索无结果 ✅；错误 ✅。

### 问题

**lines-1（P3）页码越界时整页空白** — 实测 `/lines?page=2`：`main` 里只剩「线路 / 线路 / 新增线路」，没有表格、没有分页器、没有任何空态（`LinesView.tsx:72` 的 `paged.length > 0` 是唯一渲染条件，而两个 EmptyBlock 都基于 `rows.length`）。用户被卡在一个只有 URL 错的页面上。见共-1。

**lines-2（P3）`sizes={[20,50]}` 与 `asPageSize` 的可选值不一致** — 路由允许 10/20/50/100（`src/lib/search.ts`），页面只给 20/50；`?size=100` 会被接受并生效，但下拉框没有对应 option（会显示为空）。影响很小。

---

## 15. `/users` 用户（封禁列表）

### 能做什么

- 按用户 ID 查详情（回车或按钮）→ `/users/$userId`，空值时按钮 disabled。
- 封禁列表：用户名（链接到详情）、用户 ID、原因、注册时间（相对时间）、`解除`（二次确认 → `PUT /api/ban/change` type=unblock → toast）。
- 提示「仅列出正在封禁中的账号」。

数据核对：1 条封禁记录，`2026-01-21T15:27:08Z` → `01-21 23:27` 正确。

### 状态

加载 ✅；空 ✅「没有封禁中的用户」；错误 ✅（含 403 的普通用户视角，`?nonadmin` 可复现）。无分页（接口本身就是全量数组）。

### 问题

通过。

---

## 16. `/users/eK98L0NEMs` 用户详情

### 能做什么

- 头部：`封禁列表`、`封禁/解除封禁`（`PUT /api/ban/change`）。
- 四张卡：账号状态（已封禁 / 检查中 / 未在封禁记录）、胡萝卜、上传量、邀请关系。
- 资料卡：用户 ID、用户名、Telegram、邀请人、注册时间、封禁原因（仅封禁时）。
- 最近活跃卡：邀请时间、最近播放、最近签到、最近 Telegram。
- 最近播放表：影片（可点进 `/media/$videoId`）、media_id、时间、来源 IP（+「· 代理」）、客户端 UA。

数据核对：上传量 `1.0KB`（1024 B）、注册时间 `01-01 08:00`、最近播放 `11-10 18:09`、IP/UA/代理标记均正确。

### 状态

`pay`（用户信息）：加载无骨架（卡片直接显示 `—`）；错误 ✅ `ErrorBlock`；403 → `limited` 提示 ✅（会提示「没有服务商权限」并给 `/pay` 链接）。最近播放：加载 ✅、空 ✅「近一周没有播放记录」、**错误 ❌（`records.error` 没处理）**。邀请信息：失败时 `useUserInvite` 内部 catch 成 null（会显示 `—`，不区分「没有」和「取不到」）。

### 问题

**user-detail-1（P2）「胡萝卜」写死 `—`，但接口已经返回了 carrot** — 实测：页面同时显示「上传量 1.0KB」（说明 `/api/pay/getUserInfo` 成功、`info` 有值，mock 里 `carrot: 120`）和「胡萝卜 — 个 / 需要服务商权限」。位置 `src/views/UserDetailView.tsx:100-105`。
- 预期：`info ? formatThousand(info.carrot) : '—'`，提示文案也只在没有权限时出。
- 实际：无论有没有权限都是 `—` + 「需要服务商权限」。

**user-detail-2（P3）账号状态的解释文案语义不清** — 实测显示「以封禁列表为准，未被列出即可解封试探」。「即可解封试探」读不通，且这句是在**未封禁**时显示的，容易误解。位置 `UserDetailView.tsx` 第一张卡的 `stat__delta`。

**user-detail-3（P3）「最近播放」表失败时无错误态** — 读代码：只处理 `records.isLoading` 和 `items.length === 0`。

---

## 17. `/fund?tab=orders` 基金订单

### 能做什么

- tab：基金订单 / 支付服务 / 胡萝卜（`tab=`）；`新建订单`（活动码 + 胡萝卜数 → `POST /api/fund/order/create` → toast 单号）。
- 表格：订单标题、单号·档位·活动名、胡萝卜数、补贴 `¥N`、状态（审核中/已打款/待提交）、时间、`提交凭证`（弹窗：图片 URL 每行一个 + 备注，提交前校验 URL 必须是 http(s)）。
- 分页（onPage + onPageSize 都生效）。

数据核对：3 条订单的胡萝卜 100/600/100、补贴 ¥1/¥6/¥1、状态与时间全部与 mock 一致。

### 状态

加载 ✅；空 ✅「还没有基金订单」；错误 ✅；切到别的 tab 不会白拉（`enabled: tab === 'orders'`）✅。

### 问题

**fund-1（P3）任意状态的订单都能点「提交凭证」** — 实测「已打款」「审核中」两行同样有按钮。预期：只有「待提交」（`payout_status === 'default'`）可提交，其余置灰或隐藏。位置 `src/views/FundView.tsx:246-256`。

**fund-2（P3）切 tab 不重置页码** — 读代码：`onTab` 只改 `tab`（`src/router.tsx` 的 `FundRoute` → `navigate({search:{...search, tab}})`）。在订单第 3 页切到胡萝卜，会落在胡萝卜记录的「第 3 页」→ 空白。

---

## 18. `/fund?tab=merchant` 支付服务

### 能做什么

- 两张统计卡：累计收入 0 / 累计支出 0 胡萝卜。
- 回调地址卡：当前 URL 或「未配置」+ 简介，`编辑` → 弹窗（名称/描述/回调地址）→ `PUT /api/pay/update`。
- 查询订单：输入订单号 → 展示 支付状态/订单金额/支付方式/商品（实测输入 `20260814221653fundLKoR0` → 已支付 / 68 / alipay / 限量海报 A3）；查不到时显示「没有查到这个订单，或订单号有误。」（读代码，mock 的 `/api/pay/query` 恒成功，造不出查询失败）
- 转赠胡萝卜：对方 ID + 数量（2–6000）→ `POST /api/carrot/transfer`。
- 404（不是服务商）时显示「还不是支付服务商」+ 申请按钮（扣 5000 胡萝卜的二次确认）。（读代码；mock 的 `/api/pay/base` 恒 200，这条分支实测不到）

### 状态

`pay/base`：加载时数值显示 `—`；错误 ✅（404 与非 404 分开处理，非 404 会把卡片整块隐藏）；查单：加载 ✅ 骨架、错误 ✅ 文案、空 ✅ 无。

### 问题

**fund-merchant-1（P3）不显示服务商状态** — 实测：mock 里 `status: 'review'`（审核中），页面上完全看不到；`head-note` 只在非 embedded（即独立 `/pay`）时渲染，而 `/pay` 又被重定向到 `/fund?tab=merchant`（`src/router.tsx:300-303` 的 `payRoute.beforeLoad`）。等于「审核中」这个状态在全站无处可见。

**fund-merchant-2（P3）转赠功能在「胡萝卜」tab 里重复了一遍** — 两个 tab 都有转赠（`PayView` 与 `CarrotSection` 各一套，校验规则相同）。不算缺陷，但维护面翻倍。

---

## 19. `/fund?tab=carrot` 胡萝卜

### 能做什么

- 余额卡 4,210 + `转赠`（余额 < 2 时 disabled）。
- 转赠弹窗：对方 ID + 数量（2–6000）+ 二次确认 → toast「已转赠，余额 N」。
- 明细表：来源、变动（+2/+3 绿、负数红）、时间；分页与每页条数都生效。

数据核对：8 条记录、+2/+3 交替、时间 `11-01 16:00`（`2026-11-01T08:00Z` +8）全部正确。

### 状态

加载 ✅（余额无骨架，显示 `—`）；空 ✅「还没有胡萝卜记录」（改 mock 实测）；错误 ❌ 没有 `history.error` 分支（失败时会显示空态「还没有胡萝卜记录」）。

### 问题

**fund-carrot-1（P3）明细加载失败会被当成「还没有胡萝卜记录」** — 读代码：`{!history.isLoading && rows.length === 0 ? <EmptyBlock .../> : null}`，没有 `history.error`。

---

## 20. `/whisper` 悄悄话

### 能做什么

- tab：收到的 / 发出的（`tab=`）。
- `发起` 弹窗：接收者用户 ID + 内容 → `POST /api/whisper/create` → toast「已发起」。
- 收到的行：`回复` 弹窗（显示原文 + textarea）→ `POST /api/whisper/reply`。
- 匿名行显示「匿名」，正文下方显示「回复：…」。

### 状态

加载 ✅ 骨架；空 ✅「还没有收到/发出过悄悄话」；错误 ✅ `ErrorBlock`+重试（**默认 mock 下就是错误态**，因为 `/api/whisper/receiver|sender` 未实现）。为了验证正常态，本次临时给 mock 补了这两个 GET 与 reply（验证后已复原）。

### 问题

**whisper-1（P2）「发出的」列表的「发给」列显示的是发送者自己** — 实测（临时 mock：发送者 sorakand → 接收者 zhou）：`发出的` tab 表格里「发给」= **sorakand**。
- 原因：`const peerUser = (row.sender_user ?? row.receiver_user)`（`src/views/WhisperView.tsx:97`）——收到视角取 `sender_user` 是对的，发出视角应该取 `receiver_user`。
- 预期：「发给 zhou」。同一行还会因为 `row.sender_is_anonymous` 把我自己的匿名开关套到对方身上。
- 修法：`tab === 'receiver' ? row.sender_user : row.receiver_user`，匿名字段同理（接收视角用 `sender_is_anonymous`）。

**whisper-2（P3）列表接口在 mock 里缺失** — 见 0.3。当前状态：/whisper 永远只有错误态，无法自测。

---

## 21. `/account?tab=profile` 账号资料

### 能做什么

- 头部：`签到`（今天已签时 disabled 显示「今天已签」）、`无上传权限` 提示。
- 三张卡：胡萝卜 4,210（+ 片单槽位 2 · 邀请名额 3）、累计上传 0 B（+ 权限状态）、片单槽位 2。
- 客户端登录：视频服/直播服/音乐服（有值才显示，点了复制）、`登录密码` → `显示` → 明文 + 复制（`must_otp` 时有一次性密码提示）。
- 已登录设备表：设备名、客户端版本、最后使用、`下线`（单设备）；`全部下线`（设备数 > 0 时出现）。
- 账号设置：笔名（非空且变更后可保存）、`显示空媒体库`/`高清海报` 两个开关、Telegram 绑定状态（`解绑` / `去绑定` / `加入群组`）、四个权限小格、`同意上传/下载协议并开通`、`用胡萝卜兑换片单槽位`、`获取临时登录密码`（显示 N 秒内有效）、`重置永久密码`（弹窗）。

数据核对：胡萝卜/槽位/上传量/设备时间（`11-08 05:00`）全部正确；`观影权限 未开通` 与 mock `is_viewing: false` 一致。

### 状态

会话错误 ✅ `ErrorBlock`；设备：加载 ✅、空 ✅「没有登录中的设备」、**错误 ❌**；临时密码：有 loading 文案 ✅。

### 问题

**account-profile-1（P3）复制不校验结果** — 见共-5（`AccountView.tsx:191`、`:208`）。

**account-profile-2（P3）设备列表失败无错误态** — 读代码：只有 `devices.isLoading` 和 `devices.data.length === 0` 两个分支。改 mock 造空实测过空态正常，但把接口打成 404 时这张卡会只剩标题。

**account-profile-3（P3）「高清海报」开关在 mock 下必然报错** — `/api/user/originalImage` 未实现（mock 缺口），点一下会弹「未模拟的接口…（404）」。

**account-profile-4（P3）`user.password` 可能为 null 时按钮文案残缺** — 读代码：`user.password` 类型允许 null（`must_otp` 未启用时后端给 null，见 `endpoints.ts` 的注释），`{user.password} · 复制` 会渲染成「 · 复制」，点下去复制的是字符串 "null"。

---

## 22. `/account?tab=invite` 邀请

### 能做什么

- 邀请名额卡：3 个可用、已邀请 12 人、加入时间。
- `邀请用户`：输入用户 ID → `邀请` → 弹窗（ID + 备注）→ `POST /api/invite`。
- 我的邀请表：按 `invite_user_id` 从当前用户往下递归（缩进显示层级）、`直接 3 · 合计 5 人`、用户名（链接）、用户 ID、`由 X 邀请`、`已禁用` 标记、加入时间、最近播放、备注（一级可编辑，二级只读）、`撤销`（一级才有）。

数据核对：5 行、层级缩进、`由 lin/zhou 邀请`、`已禁用`（xuan）、备注「同事」全部与 mock 树一致；上限 50 行有提示。

### 状态

加载 ❌（`myTree` 没有骨架，数据回来前整块不渲染）；空 ❌；错误 ❌（`tree.error` / `inviteHistory.error` 都没处理）。

### 问题

**account-invite-1（P3）没有任何邀请时整块消失，没有空态** — 实测（把 mock 的 tree 清空）：页面只剩「邀请名额 3 个可用 / 已邀请 12 人」和「邀请用户」输入框，**「我的邀请」区块完全不见**，用户无法判断是「没邀请过」还是「没加载出来」。位置 `src/views/AccountView.tsx:489`（`myTree.length > 0` 才渲染）。

**account-invite-2（P3）备注显示两遍** — 实测 lin 那行：用户名下方是 `e1000Xs · 备注：同事`，同一行「备注」列又显示 `同事`。位置 `AccountView.tsx:524`（拼进 code 行）与备注列的按钮文案。预期：只留一处（列里可编辑的那处）。

**account-invite-3（P3）「已邀请 12 人」与表格里 5 人并存** — 实测。`invite_count` 是累计数、表格是现存树，两者口径不同但没有任何说明，容易被当成 bug。

---

## 23. `/recycle` 回收站

### 能做什么

- tab：资源 / 影片（`tab=`）；资源 tab 额外「搜索范围」下拉（资源 ID / 上传者 ID，`by=`）；搜索框（350ms 防抖）。
- 资源表：资源名/ID、所属影片（+S/E）、大小、存储、入库时间（相对）、`恢复`（`is_can_restore !== false` 才有）。
- 影片表：海报/片名、类型、TODB、上映、`恢复`。
- 恢复都有二次确认；影片恢复还会识别 toggle 语义（返回 `is_delete` 仍为 true 时提示「仍是删除状态，请重试」）。
- 分页 + 每页条数（onPage/onPageSize 都生效）。

### 状态

加载 ✅；空 ✅「回收站是空的」；错误 ✅（资源 tab 在 mock 下就是错误态，因为 `listAll` 未实现）。

### 问题

**recycle-1（P3）空态不区分筛选/越界** — 见共-2。位置 `RecycleView.tsx:128-132`。

**recycle-2（P3）`by` 下拉是非受控 `defaultValue`** — 读代码：`<select defaultValue={by}>`（`RecycleView.tsx` 工具条）。切到影片 tab 会把 URL 的 `by` 重置成 `media_id`（`onTab` 里写死），但资源 tab 重新挂载前如果 URL 被外部改动，下拉不会跟着变。影响很小。

**recycle-3（P3）资源 tab 的「恢复」在 mock 下必失败** — `/api/video/media/restore` 未实现（mock 缺口）；影片 tab 的「恢复」则因为 `PUT /api/video/{id}/delete` 是 toggle 但 mock 恒返回 `is_delete: true`，会稳定提示「这部影片仍是删除状态，请重试」（mock 缺口）。

**recycle-4（P3）影片 tab 在 mock 下展示的是未删除影片** — `/api/video/list` 忽略 `only_delete`（mock 缺口），回收站里出现了 10 部正常影片，容易让人误判「回收站数据错了」。

---

## 24. `/media/1` 影片详情

### 能做什么

- 头部：`返回列表`、`同步`（`PATCH /api/video/sync`）、`求片`（电影按 `vl`、剧集按 `ve`，二次确认）、`删除`（`PUT /api/video/{id}/delete`）。
- 概览：类型/题材 chips、`N 人求片`、`已删除` 标记、原片名、TODB/TMDB/资源数/字幕数。
- 季与集：季下拉（`?season=`）、集 chip 网格（`?episode=`，有求片/有资源的小圆点）、当前集信息（日期·时长·资源·字幕·求片悬赏）。
- 资源表：资源名/ID、大小、上传者、`⋯` 菜单（编辑资源名 / 复制播放地址 / 同步元数据 / 移到其他集 / 删除）。
- 字幕表：标题+创建时间、格式、上传者、`⋯`（重命名 / 删除字幕）；`上传字幕`（srt/ass/vtt，带进度条）。
- 演职员（最多 8 位）。
- 找不到影片时：「找不到这部影片 / 它可能已被删除（去回收站看看），或这个 ID 不存在。」+ 回到媒体库 ✅（实测，把 mock 的 videos 清空）。

数据核对：TODB 1000、TMDB 63247、资源 2、字幕 1、8.0 GB / 2.0 GB、字幕时间 `11-01 18:05`、剧集 2 季 × 4 集、切到第 2 季显示「第 1 集」均正确。

### 状态

影片本体：加载 ✅ 骨架、错误 ✅、不存在 ✅。
资源：加载 ✅、空 ✅（带「去上传页…」hint）、错误 ✅。
字幕：加载 ❌、空 ✅、错误 ❌。
演职员：加载 ❌、空（整块隐藏，可接受）、错误 ❌。
赛季/集：加载 ✅ 骨架、空 ✅「这一季还没有集」。

### 问题

**video-1（P3，审查末尾已被并发修复）资源列表与 `mediaApi.list` 的返回类型不一致**

- 现象（实测如何暴露）：把 mock 的 `/api/video/media/list` 改成返回 `{ medias: [ ... ] }`（即 `mediaApi.list` 声明的返回类型 `{ medias?: VideoMedia[] }`）后，`/media/1` 的资源区变成「这一集还没有资源 / 去上传页把文件入库到这里。」
- 原因：`useMediaList`（`src/api/queries.ts:313` 起）当时只识别「裸数组 / `items` / `data`」，没有 `medias` 分支，与它自己 `mediaApi.list` 的类型契约自相矛盾；mock 恰好返回裸数组，所以平时看不出来。
- 结局：写报告时为 P1（若后端真按 `{medias}` 返回，资源区整块失效）。**收尾阶段并发进程按真机结果把类型改成 `VideoMedia[]` 并给归一化补了 `medias` 分支**，注释写明「真机返回的是数组，不是 { medias }」。因此真正的缺陷只是「类型声明写错 + 归一化不兼容第二种形状」，降级为 P3，且已修。
- 留下的建议：`useMediaList` 现在同时兼容三种形状，属于防御性代码；类型既然定成数组，`items`/`data` 两个兜底可以考虑删除，避免以后有人以为接口会返回信封。

**video-2（P3）字幕区没有加载态与错误态** — 读代码（`VideoDetailView.tsx:58` 拿数据，`:343-344` 只处理空/有）：接口 500 或 403 时字幕卡只剩「上传字幕」一个按钮，用户看不出是空的还是没取到。

**video-3（P3）演职员岗位直接显示接口英文原值，角色名被丢弃** — 实测显示 `Director` / `Actor`；`person.title`（「机长」「乘客」）只在 `job` 为空时才用（`VideoDetailView.tsx:402`）。预期：`job` 映射成中文（导演/演员），或优先显示角色名「饰 机长」。

**video-4（P3）演职员头像拼 URL 无兜底** — `src={`https://image.theotherdb.org/original/${person.image_profile}`}`（`:392`）：接口若返回完整 URL 会二次拼接（mock 下 3 张头像全部 naturalWidth=0，实测），且 `<img>` 没有 `onError` 回退到 `person-card__poster--empty` 占位。

**video-5（P3）「编辑资源」允许提交空名字** — 读代码：保存按钮没有 `disabled`，`renameMedia` 直接发空串。位置 `VideoDetailView.tsx` 资源编辑弹窗的 footer。

**video-6（P3）求片/上传字幕在缺少当前集时静默 return** — 读代码：`if (!itemId) return`（求片）、`if (!file || !currentEpisode) return`（上传字幕）；用户点了没有任何反馈。

---

## 25. `/music/song/1` 歌曲详情

### 能做什么

- 头部：`返回列表`、`收藏`（`/api/music/favorite`，toast「已切换收藏」）、评分下拉（未评分/1–5 星 → `/api/music/rating`）、`删除`（二次确认）。
- tab：歌词 / 资源。
- 歌词：列表（语言/名称/创建时间/正文 pre）、`添加歌词` 弹窗（语言 + 正文，正文空时保存 disabled）→ `/lyric/create`。
- 资源：`上传音频`（文件选择 + 进度）、表格（文件名/ID/时长、后缀+音质、大小、码率、上传者、`播放地址`（复制）、`删除`）。

数据核对：时长 4:14、`TEXT / zh-CN / 简体中文 / 10-20 18:00`、两条资源 `flac · 无损 40 MB 900 kbps` / `mp3 · 高品质 13 MB 320 kbps`、主资源徽标均正确。

### 状态

歌曲本体：加载 ❌（标题先显示「歌曲详情」，无骨架）、空 ❌、**错误 ❌（`song.error` 从未渲染）**。
歌词：加载 ✅ 骨架、空 ✅「还没有歌词」+ 添加按钮、错误 ✅ `ErrorBlock`。
资源：加载 ✅、空 ✅「还没有音频资源」、错误 ✅。

### 问题

**song-1（P2）评分下拉把 4.6 星显示成「未评分」** — 实测：mock 的歌曲 `rating: 4.6`，下拉框 `value=""`、选中项是「未评分」。
- 原因：`<select value={song.data?.rating ?? ''}>` 的 options 只有 `''` 和 1–5 的整数（`src/views/SongDetailView.tsx:54` 的 value 与 `:64-70` 的 options），4.6 匹配不到任何 option，浏览器回退到第一个。
- 预期：显示「4.6 星」（可以加一个动态 option），或把接口的小数评分取整后再比对。
- 影响：用户会以为这首歌没评过分，甚至重新评一次覆盖掉原值。

**song-2（P3）「收藏」按钮没有状态** — 读代码 + 实测：按钮永远是「收藏」，接口返回 `is_favorite` 也没有回写；点完只有 toast。标题区同样没有收藏标记。

**song-3（P3）歌曲本体取不到时没有错误态/空态** — 读代码：`song.error` 从未渲染，`song.data` 为 null 时头部退化成「歌曲详情 / #id」，歌词与资源区照常渲染。

**song-4（P3）资源「播放地址」在 clipboard 不可用时仍报成功** — 见共-5（`SongDetailView.tsx:226` 用了 `?.`，undefined 时静默跳过写剪贴板但仍 toast）。

**song-5（P3）mock 下 `/music/song/1` 显示的是第 2001 首歌** — `/api/music/song/list` 忽略 `song_id`（mock 缺口），所以 URL 的 id 与页面内容对不上，容易被误判成路由 bug。

---

## 附录 A：空数据实验记录（只改 mock，已复原）

改动方式：在 `src/api/mock.ts` 里插入 `videos.length = 0` 之类的临时语句，或在返回处替换成 `[]`，验证后 `cp` 回原文件（`md5` 一致：`1e93216433bbc1a44f337bead27a333c`，`git status` 里 `src/api/mock.ts` 干净）。

| 造的空白 | 页面 | 观察到的空态 | 结论 |
| --- | --- | --- | --- |
| `videos = []` | `/library` | 「没有匹配的影片 / 片库还是空的 / 清空筛选」 | 合理 |
| `videos = []` | `/seek` | 「没有求片」 | 合理但无 hint |
| `videos = []` | `/media/1` | 「找不到这部影片 + hint + 回到媒体库」 | 很好 |
| `videos = []` | `/recycle?tab=video` | 「回收站是空的」 | 合理（但见 recycle-1） |
| `songs = []` | `/music?tab=songs` | 「这个库还是空的」 | 合理 |
| `watches = []` | `/watchlists` | 「还没有片单 + 新建片单」 | 合理 |
| `watches = []` | `/watchlists/1000`、`/1003` | 头部退化成「片单 / 详情」，正文「片单里还没有影片」 | **不合理**（watch-1000-2） |
| shop 商品全清 | `/shop` | 「还没有在售商品」 | 合理 |
| shop 商品全清 | `/shop?scope=mine` | 四张卡全 0 +「这个分类还没有商品」 | 文案不准（shop-mine-2） |
| shop 商品全清 | `/shop/seller/1002` | 「这家店还没有在售商品」+ 头部「0 件在售」 | 很好 |
| 店铺订单全清 | `/orders?scope=shop`、`?scope=mine` | 「没有符合条件的订单」 | 合理 |
| 线路全清 | `/lines` | 「还没有线路」 | 合理 |
| 封禁列表清空 | `/users` | 「没有封禁中的用户」 | 合理 |
| 设备列表清空 | `/account?tab=profile` | 「没有登录中的设备」 | 合理 |
| 邀请树清空 | `/account?tab=invite` | **整块消失，无空态** | **不合理**（account-invite-1） |
| 胡萝卜明细清空 | `/fund?tab=carrot` | 「还没有胡萝卜记录」 | 合理 |
| 字幕/资源/演职员清空 | `/media/1` | 「还没有字幕」/「这一集还没有资源 + hint」/ 演职员整块隐藏 | 基本合理（演职员可加空态） |
| 资源改为 `{medias:[…]}` | `/media/1` | **「这一集还没有资源」（数据被丢弃）** | 归一化不认 `medias`（video-1，已修；真机确认返回数组，故不是 P1） |
| 补 `/api/whisper/receiver|sender` | `/whisper` | 列表正常渲染 | 由此发现 whisper-1 |

## 附录 B：无法验证清单（mock 限制）

1. 全站/我的店铺的**分类与关键词筛选对全站视图**（已知坑：后端无接口）。
2. 片单的「影视/音乐」切换与片单搜索（mock 不过滤 `type` / `name`）。
3. 求片的关键词/类型/「只看我认领的」（mock 不过滤）。
4. 音乐「无资源」「我收藏的」（mock 不过滤 `has_media` / `is_favorite`），以及歌曲「状态」列。
5. 商城「销量/价格」排序（mock 不过滤 `sort_by`）。
6. 所有写操作的**持久化**（订阅、隐藏、维护者、片单编辑、商品上下架、删除…）：mock 都是固定返回值，只能验证「点了有没有报错/toast」，不能验证「改完列表是否对」。
7. 分页 >1 页的真实场景：mock 数据量大多只有 1 页（商城全站是唯一能翻页的，已验证 2 页 + 到底）。
8. 权限分支（普通用户 403）：只有 `/shop/order/shop/order` 与 `/api/ban/list` 能用 `?nonadmin` 预览。
