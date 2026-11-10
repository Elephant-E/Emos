# 数据流与缓存一致性审查（TanStack Query）

> **只读审计**：未改动 `src/` 任何文件。基线 `rewrite/v2` @ `c6dcbe4`（工作区干净，行号以该提交为准）。
> 审查范围：全部 `useQuery` / `useInfiniteQuery` / `useMutation` 的 key 设计、失效范围、`enabled`、请求参数、`staleTime`、以及视图层的 loading/empty/error 接线。
> 取证口径：**实测**＝真的在跑起来的页面上做了操作并观察了 QueryCache 事件；**读码**＝只读源码推断。每条结论都标了口径。

---

## 0. 结论摘要（按影响排序）

| # | 问题 | 口径 | 影响 |
|---|---|---|---|
| 1 | `createOrder` 只失效 `['shop','mineOrders']` 与 `['shop','products']`，**没失效商城实际在用的 `['shop','productsInfinite']`，也没失效 `['shop','product',id]`** | 实测 | 买完商品后卡片上的库存/销量、详情弹窗里的库存/售罄状态在 **5 分钟（列表）/ 60 秒（详情）内都不变** |
| 2 | 下单/付款后「我的店铺」四个指标卡（销量、订单、待发货、在售）全部不刷新 | 实测 | 商户看到的是下单前的数字 |
| 3 | 「我的店铺」首屏会先用 `seller_id` 缺省的请求拉**全站 45 件**商品（含别家、含下架）填进表格；seller 请求失败时**永久**停在这个错误列表 | 实测 | 跨店铺数据串台 + 分页总数错（共 45 条 / 4 页） |
| 4 | `/orders` 同时请求「店铺订单」和「我的订单」两个列表，且任一订单 mutation 会触发**两次**请求 | 实测 | 每页固定 1 次白请求；每次发货/备注/删除多 1 次请求 |
| 5 | `payOrder` 只失效 `['shop','mineOrders']`，不同步商户视角列表与「待发货」计数 | 实测 | 管理员自己付款后，切到「店铺订单」还显示待支付 |
| 6 | 上传（视频/音频）、归档、字幕上传、移动资源、支付页转赠等**完全没有任何缓存失效** | 读码 | 媒体列表、影片资源数、胡萝卜余额、概览数字不更新，只能靠刷新页面 |
| 7 | 全局 `staleTime: 5min` + `refetchOnWindowFocus: false`，且这些页面没有手动刷新入口 | 实测（查单二次查询不发请求）+ 读码 | 库存/订单状态最长 5 分钟陈旧；`/pay` 查单复用缓存，付款后重查看不到新状态 |

---

## 1. 验证方法与局限（重要）

### 1.1 实测环境
- `VITE_MOCK=1 npx vite --port 5276`（`--strictPort`；首次 5276 被占用时起在 5277，两边结论一致，下文数字来自 5276）。
- 页面里没有暴露 QueryClient，用 React fiber 反查 `QueryClientProvider` 的 `client`，然后：
  - 订阅 `queryCache`，把每次 `action === 'fetch'` 记成一次**真实请求**（mock 走的是进程内 `mockRequest`，无网络可抓，只能从 cache 事件计数）；
  - 包一层 `client.invalidateQueries`，记录**每次失效的 filter 与它命中的 key**。
- 因此下面凡写「实测」的计数，都是 QueryCache 的 fetch 事件计数，等于实际打到 `mockRequest` 的次数。

### 1.2 mock 会掩盖/伪造以下现象（否则会误判）
| mock 行为 | 后果 |
|---|---|
| `createOrder` 不改库存/销量，POST 也不落库 | **无法**用「数字变没变」证明失效缺失，只能用「请求有没有发」证明。反过来，「买完库存不变」在 mock 里是必然的，不能当作 bug 证据 |
| `/api/shop/product/list` **忽略 `sort_by`/`sort_order`** | 商城「销量/价格」排序在 mock 下看起来完全没反应（参数其实传对了） |
| 同上，`category_id` 只过滤基础 3 条，随后无条件拼上 40 条 bulk 商品 | 切分类时商品看起来没变（参数其实传对了） |
| `/api/shop/order/shop/order` 忽略 `order_no`/`order_title`（user/list 才实现） | 订单页搜单号在 mock 下无效 |
| `/api/video/{id}/delete` 恒返回 `is_delete: true` | 回收站「恢复影片」在 mock 下**必然**提示「仍是删除状态」（`RecycleView.tsx:72-74`），不是前端 bug |
| `pay/query` 对任意单号返回同一对象 | 查单结果无法体现状态变化 |

### 1.3 未覆盖
- 真实后端（`emos.club`）本轮**没有发任何真实请求**（避免副作用）。后端契约以仓库内 `api.postman_collection.json` 与 `docs/review/api-shop.md`（历史实测）为准，凡引用这两处会写明「契约」。

---

## 2. mutation → invalidate 对照表

约定：`['shop']` 这类前缀失效会命中所有以该元素开头的 key（TanStack 默认前缀匹配）。「漏」一列只列**有查询真实消费该数据**的 key。

### 2.1 商城（`queries.ts` `useShopMutations`，573-621）
`invalidate()` = `['shop']` + `['session']`（575-578）。**除 `createOrder`/`payOrder` 外，其余 15 个都走这个宽失效**，因此基本不漏（代价是过度失效，见 P2-7）。

| mutation | 接口 | 影响的数据 | 失效的 key | 漏 | 判定 |
|---|---|---|---|---|---|
| `toggleUp` 580 | `PUT shop/product/up` | 上架状态、`count.onSale` | `['shop']`,`['session']` | — | ✅（过度） |
| `setSort` 581 | `PUT shop/product/sort` | 商品顺序 | 同上 | — | ✅ 但**无调用点**（死代码） |
| `setCategory` 582 | `PUT shop/product/category` | 商品分类 | 同上 | — | ✅ 但**无调用点** |
| `removeProduct` 583 | `DELETE shop/product/delete` | 商品、`count.*` | 同上 | — | ✅ 实测命中 18 个 key |
| `saveProduct` 584 | `POST shop/product/createOrUpdate` | 商品 | 同上 | — | ✅（载荷缺字段见 P3-3） |
| `sortCategory` 585 | `PUT shop/category/sort` | 分类顺序 | 同上 | — | ✅ |
| `createCategory` 589 | `POST shop/category/create` | 分类 | 同上 | — | ✅ |
| `removeCategory` 590 | `DELETE shop/category/delete` | 分类、商品分类归属 | 同上 | — | ✅ |
| `saveSeller` 591 / `applySeller` 592 | `POST shop/seller/update|apply` | 店铺信息、`is_self` | 同上 | — | ✅ |
| `deliver` 593 | `PUT shop/order/shop/delivery` | 订单发货状态、`count.pending` | 同上 | `['todos']`（概览待发货计数） | ⚠️ 见 P2-1 |
| `remark` 597 | `POST shop/order/shop/remark` | 订单备注 | 同上 | `['todos']` | ⚠️ 同上 |
| `deleteOrder` 599 | `DELETE shop/order/shop/order` | 订单列表、`count.orders` | 同上 | `['todos']` | ⚠️ 同上 |
| `removeOrder` 601 | `DELETE shop/order/user/order` | 我的订单、`count.orders` | 同上 | `['todos']` | ⚠️ 同上 |
| `urgeOrder` 602 | `PUT shop/order/user/urge` | 催发货次数 | 同上 | `['todos']` | ⚠️ 同上 |
| `closeOrder` 606 | `POST shop/order/user/close` | 订单状态 | 同上 | `['todos']` | ⚠️ 同上 |
| **`createOrder` 608-615** | `POST shop/order/user/create` | 我的订单、商品库存/销量、`count.*` | `['shop','mineOrders']`、`['shop','products']` | **`['shop','productsInfinite']`**、**`['shop','product',id]`**、**`['shop','count','products'|'onSale'|'orders'|'pending'|'sales']`**、`['todos']` | ❌ **P0-1** |
| **`payOrder` 616-619** | `POST shop/order/user/pay` | 我的订单、商户视角订单、`count.orders`/`pending` | `['shop','mineOrders']` | **`['shop','orders']`**、**`['shop','count','orders'|'pending']`**、`['todos']` | ❌ **P0-2** |

### 2.2 影片 / 媒体 / 字幕（`useVideoMutations` 343-361）
`invalidate()` = `['video', id]` + `['media']` + `['subtitles']`（345-349）。

| mutation | 影响的数据 | 漏 | 判定 |
|---|---|---|---|
| `syncVideo` 352 | 影片元数据、`medias_count` | `['videos']`（媒体库列表） | ⚠️ P2-2 |
| `removeVideo` 353 | 影片删除态 | `['videos']`（列表里仍在）、`['recycle','video']`（回收站没有它） | ❌ P1-3 |
| `renameMedia` 355 | 资源名 | — | ✅ |
| `removeMedia` 356 | 资源、`medias_count` | `['videos']`、`['recycle','media']` | ⚠️ P2-2 |
| `syncMetadata` 357 | 资源元数据 | — | ✅ |
| `renameSubtitle`/`removeSubtitle` 358-359 | 字幕 | `['videos']` 的 `subtitles_count` | ⚠️ P3 |
| `playUrl` 354 | 无（不进缓存） | — | ✅ |

### 2.3 片单 / 歌单（`useWatchMutations` 841-912、`useWatchMusicMutations` 255-271）
失效 = `['watch']` + `['watches']`（845-846）；音乐侧 = `['watch',id,'music']` + `['watch',id]`。

覆盖 `['watch',id,'meta'|'videos'|'music'|'seasons']`、`['watch','stats'*]`、`['watch',id,'search'*]`、`['watches',*]`、`['record','list']`（后者是 `['record',...]`，**不**被覆盖）。
**全部 mutation 都不漏**（除了对 `['record','list']` 的连带失效，实际无必要）。判定：✅（过度失效：改一部片单的排序会把 `['watch','stats',4]`、所有搜索缓存一起失效，见 P2-7）。

### 2.4 音乐（`useMusicMutations` 732-753）
失效 = `['music']` → 覆盖 `songs`/`albums`/`persons`/`song`/`lyrics`/`media`。✅ 全部不漏。

### 2.5 账号（`useAccountMutations` 389-425）
失效 = `['session']`、`['invite']`、`['carrot']`、`['ban']`；`logoutDevice` → `['user','devices']`。✅ 全部不漏（`temporaryPassword` 不涉及缓存）。

### 2.6 回收站（`useRecycleMutations` 780-791）
失效 = `['recycle']`、`['videos']`、`['video']`（前缀，覆盖 detail/seasons/episodes/persons）。
| mutation | 漏 | 判定 |
|---|---|---|
| `restoreMedia` 788 | **`['media']`**（影片详情的资源列表）、**`['subtitles']`** | ❌ P2-3 |
| `restoreVideo` 789 | — （`PUT video/{id}/delete` 契约就是「删除/恢复」toggle，用 `remove` 是**对的**） | ✅ |

### 2.7 直播 / 线路 / 求片 / 悄悄话
| 模块 | 失效 | 漏 | 判定 |
|---|---|---|---|
| `useLiveMutations` 647-657 | `['live']` | — | ✅ |
| `useLineMutations` 659-666 | `['line']` | — | ✅ |
| `useSeekApply` 198-204、SeekView `claim`/`cancelClaim`/`urge`（65-75） | `['seeks']` | `['todos']`（概览待处理求片） | ⚠️ P2-1 |
| `useWhisper...`（WhisperView 29-49） | `['whisper']` | — | ✅ |

### 2.8 视图内直接调接口（不走 mutation 的写操作）——**全部无失效**
| 位置 | 写操作 | 应失效但没失效的 key | 判定 |
|---|---|---|---|
| `UploadView.tsx:102`（`uploadAndSave`） | 视频入库 | `['media']`、`['video',id]`、`['videos']`、`['carrot']`、`['session']` | ❌ P1-1 |
| `UploadView.tsx:334-345`（`uploadApi.archive`） | 暂存归档入库 | 同上 | ❌ P1-1 |
| `UploadView.tsx:125`（`userApi.agreeUpload`） | 开通上传 | `['session']`（`canUpload`） | ⚠️ P2-5 |
| `VideoDetailView.tsx:567`（`mediaApi.move`） | 资源移到别的集 | `['media',{目标 season/episode}]`、`['video',id,'episodes']`（`medias_count`） | ⚠️ P2-4 |
| `VideoDetailView.tsx:508-523`（`uploadSubtitle`） | 字幕上传 | `['subtitles']` 其他 key、`['videos']` | ⚠️ P3 |
| `SongDetailView.tsx:172-174`（`uploadSong`） | 音频上传 | `['music','song',id]`（`count_medias`）、`['music','songs']`、`['carrot']` | ❌ P1-2 |
| `PayView.tsx:178`（`carrotApi.transfer`） | 转赠胡萝卜 | `['carrot']`、`['session']` | ❌ P1-4 |
| `PayView.tsx:59-66`（`payApi.apply`） | 申请服务商 | 只有 `base.refetch()`，够用 | ✅ |
| `WatchlistsView.tsx:201`（`watchApi.remove`） | 删片单 | `['watches']` 其他 key（scope=self/subscribed）、`['session']`（槽位） | ❌ P1-5 |

### 2.9 其余 mutation
| 位置 | 失效 | 判定 |
|---|---|---|
| `WatchlistsView.tsx:56-74` 新建片单 | 只有 `['watches']` | ⚠️ 漏 `['session']`（页头「片单槽位剩余」），见 P1-5 |
| `OverviewView.tsx:61-81` 签到 | `['session']`、`['carrot']`（前缀覆盖 history）、`['todos']` | ✅ |
| `FundView.tsx:147-152` 建基金订单 / `156-170` 提交凭证 | 只有 `['fund']` | ⚠️ 漏 `['carrot']`/`['session']`（下单扣萝卜），见 P1-4 |
| `ImagePicker.tsx:91-118` 传图/删图 | `['upload','images']` | ✅ |

---

## 3. 问题清单

### P0-1【实测】下单后商城卡片与商品详情不刷新
- **位置**：`src/api/queries.ts:608-615`（`createOrder.onSuccess`）、`src/views/ShopView.tsx:68`（商城网格实际用的是 `useShopProductsInfinite`）、`src/components/ProductModals.tsx:20`（详情用 `useShopProduct`，`queries.ts:546-553` 带 `staleTime: 60_000`）
- **实测证据**（`/shop?scope=all`，点卡片「购买」→「下单」）：
  ```
  invalidate ["shop","mineOrders"]              → 命中 0 个 key
  invalidate ["shop","products"]                → 命中 ["shop","products",0,1,0,"","",true]
                                                        ["shop","products",1002,1,0,"","",false]
  ```
  命中的两个 key 在「全站」视图里**都没有被订阅**（`products` 的 `enabled = mine`，见 `ShopView.tsx:66`）。真正渲染网格的 `["shop","productsInfinite",0,0,"","",true]` 既没被失效也没重取（`dataUpdatedAt` 前后一致）。随后重开详情弹窗：`["shop","product",1000]` 的 fetch 次数仍为 1、`dataUpdatedAt` 未变 —— **库存/售罄判定来自缓存**。
- **影响**：真实后端上，买完再点同一商品，详情弹窗仍显示「库存 24 / 立即购买」（后端已减库存），60 秒内重复下单会拿到「库存不足」报错；卡片上的「销量/库存/已售罄」也要等 5 分钟或手动刷新。
- **修复**：`createOrder.onSuccess` 改为
  ```ts
  qc.invalidateQueries({ queryKey: ['shop'] })   // 与其余 15 个 mutation 一致（含 productsInfinite / product / count）
  qc.invalidateQueries({ queryKey: ['todos'] })
  ```
  若要精细：`['shop','productsInfinite']` + `['shop','product',p.productId]` + `['shop','count']`。另外把 `useShopProduct` 的 `staleTime: 60_000` 去掉（库存不该有 1 分钟粘性）。

### P0-2【实测】付款后只刷新买家列表：商户列表与「待发货」计数不动
- **位置**：`src/api/queries.ts:616-619`
- **实测证据**（`/orders?scope=mine` 点「付款」）：
  ```
  invalidate ["shop","mineOrders"] → 命中 ["shop","mineOrders",1,{}]        ← 只有这一个
  ```
  `["shop","orders",1,{}]`（商户视角，同一个 hook 里一直在订阅）与 `["shop","count","pending",1002]` 都没被失效。
- **影响**：管理员既是买家又是商户（`useCapabilities.isMerchant` 里 `isAdmin` 直接为真），付完款切到「店铺订单」看到的还是「待支付」；「我的店铺」的「待发货」卡片也不加 1。第二台设备/另一个后台账号付款时同理。
- **修复**：`qc.invalidateQueries({ queryKey: ['shop'] })`，另加 `['todos']`（概览「待发货订单」计数来自 `useTodos`，`queries.ts:167`）。

### P0-3【实测】下单/付款后「我的店铺」四个指标卡不刷新
- **位置**：`src/api/queries.ts:504-543`（`useShopCounts` 5 个查询全部 `staleTime` 默认 5min）+ `createOrder`/`payOrder` 的窄失效
- **实测证据**：下单成功后读 cache：
  ```
  ["shop","count","sales",1002]      stale: false   dataUpdatedAt 未变
  ["shop","count","orders",1002]     stale: false
  ["shop","count","pending",1002]    stale: false
  ```
  （对照：`deliver` 因走 `['shop']` 宽失效，会把这 5 个标记为 stale。）
- **影响**：商户看自己的店，「销量 / 订单 / 待发货 / 在售」在下单、付款、催发货、关闭订单后全部停在旧值，直到 5 分钟 staleTime 过期后重新挂载。
- **修复**：同 P0-1（宽失效 `['shop']`）。另外 `count.*` 建议显式 `staleTime: 30_000`，让「待发货」这类数字至少每次进入页面都校准一次。

### P1-1【读码】上传 / 归档完全不失效缓存
- **位置**：`src/views/UploadView.tsx:95-109`（`uploadAndSave` 成功后只 `patch()` 队列状态）、`:332-346`（`uploadApi.archive` 成功后只 `storeFiles.refetch()`）
- **现象**：上传成功后 toast 写着「入库完成，+N 胡萝卜」，但
  - `['carrot','current']`/`['session']` 不动 → 侧栏与概览的胡萝卜余额不涨；
  - `['media',{video_list_id…}]` 不动 → 去影片详情看不到刚传的资源（`useMediaList` 默认 5 分钟 staleTime）；
  - `['videos']`/`['video',id]` 不动 → 媒体库的「N 个资源」、集号上的圆点不更新；
  - `['recycle']`、`['todos']` 也无关但同理。
- **建议**：`uploadAndSave` 返回后 `qc.invalidateQueries({queryKey:['media']})`、`['video', item_id]`、`['videos']`、`['carrot']`、`['session']`；归档同理（目标 `video_id` 已知）。

### P1-2【读码】歌曲音频上传后只 `media.refetch()`
- **位置**：`src/views/SongDetailView.tsx:172-174`
- **现象**：只刷当前 `['music','media',songId]`；`['music','song',songId]`（`count_medias`）与音乐列表 `['music','songs',…]`（列表里「状态/资源数」列）保持旧值，`staleTime` 5 分钟；胡萝卜余额同理不涨。
- **建议**：改用 `useMusicMutations().addMedia` 之类的 mutation，`onSuccess` 走 `['music']` 宽失效 + `['carrot']`。

### P1-3【读码】删除影片后媒体库列表仍显示该片
- **位置**：`src/api/queries.ts:345-349`（`useVideoMutations.invalidate` 不含 `['videos']`）、`src/views/VideoDetailView.tsx:135`
- **现象**：在详情页删片 → 只有 `['video',id]`/`['media']`/`['subtitles']` 失效。返回 `/library` 时 `['videos',params]` 是 fresh 的 5 分钟缓存，**被删的片子还在表里**；同理回收站 `['recycle','video']` 不会出现它。
- **建议**：`invalidate` 追加 `qc.invalidateQueries({ queryKey: ['videos'] })` 与 `['recycle']`。

### P1-4【读码】萝卜余额在多处写操作后不更新
- **位置**：`src/views/PayView.tsx:176-186`（`carrotApi.transfer` 直接调用）、`src/views/FundView.tsx:147-152`（建基金订单扣萝卜）、`src/views/SongDetailView.tsx:172`、`src/views/UploadView.tsx:102`
- **现象**：只有 `FundView` 的「转赠」（走 `useAccountMutations().transfer` → 失效 `['carrot']`）会更新余额；`PayView` 里同一个动作是裸调用，余额卡、概览「我的胡萝卜」、胡萝卜记录都停在旧值，只有 toast 里给出了新余额。
- **建议**：把 `PayView` 的转赠换成一个 `useMutation`（或复用 `useAccountMutations`），`onSuccess` 失效 `['carrot']`/`['session']`。

### P1-5【读码】片单新建/删除后槽位数字与其他 scope 列表不更新
- **位置**：`src/views/WatchlistsView.tsx:56-74`（只失效 `['watches']`）、`:199-208`（`watchApi.remove` + `refetch()`）
- **现象**：页头「片单槽位剩余 N」来自 `['session']`，创建/删除片单都不失效 → 数字不变（创建片单会消耗槽位）。删除走裸调用 `watchApi.remove` + 当前页 `refetch()`：`scope=self` 与 `scope=subscribed` 的缓存、概览「我的片单」（`['watches',{page:1,page_size:4,is_self:true,…}]`）都还是旧数据，5 分钟内切过去仍看得到已删除的片单。
- **建议**：删除也做成 mutation，`onSuccess` 失效 `['watches']` + `['session']`。

### P2-1【读码】`['todos']` 永远不会被业务 mutation 失效
- **位置**：`src/api/queries.ts:153-173`（`useTodos`：待处理求片 / 待发货订单 / 封禁用户），只有 `OverviewView.tsx:55-59` 的签到会失效它
- **现象**：`deliver`/`remark`/`deleteOrder`/`urgeOrder`/`closeOrder`/`createOrder`（订单类）与 `useSeekApply`/`claim`（求片类）都不会失效 `['todos']`。`useTodos` 的 `staleTime` 是 60s，所以最坏 60 秒内概览的待办数字是旧的；如果用户 60 秒内从「店铺」跳到概览，看到的仍是发货前的计数。
- **建议**：在 `useShopMutations` 的宽失效里加 `['todos']`；求片侧同理。

### P2-2【读码】媒体/影片计数类数据不同步
- **位置**：`src/api/queries.ts:345-349`
- **现象**：`syncVideo`、`removeMedia`、`removeSubtitle` 之后 `['videos']`（媒体库列表的 `medias_count`/`subtitles_count` 列）不失效，最长 5 分钟不一致。

### P2-3【读码】回收站恢复资源后，影片详情里还是看不到
- **位置**：`src/api/queries.ts:782-786`
- **现象**：`restoreMedia` 失效了 `['recycle']`/`['videos']`/`['video']`，**没有** `['media']`/`['subtitles']` —— 恢复的资源正是要回到 `['media',{video_list_id,…}]` 这张表里显示的。

### P2-4【读码】移动资源只 refetch 当前集
- **位置**：`src/views/VideoDetailView.tsx:565-573`
- **现象**：`mediaApi.move` 后只 `media.refetch()`（当前集）。目标集的 `['media',{video_season_id,…}]`、以及 `['video',id,'episodes']` 的 `medias_count`（集号圆点）都没失效；如果目标集之前被打开过，切过去仍看不到这个资源。

### P2-5【读码】「同意上传协议」不失效 `['session']`
- **位置**：`src/views/UploadView.tsx:125`、`useCapabilities` 的 `canUpload`（`queries.ts:66`）
- **现象**：同意协议后 `canUpload` 仍是旧值（5 分钟），页面里依赖它的提示/按钮状态不变。

### P2-6【实测】重复请求：每个页面都有固定浪费
实测 `/shop?scope=all` 冷启动（清空 cache 后挂载）打出的请求：
| key | 次数 | 说明 |
|---|---|---|
| `["shop","seller"]` | 1 | `useCapabilities`（`queries.ts:55-60`） |
| `["shop","seller",0]` | 1 | `useShopSeller()`（`queries.ts:428-433`）→ **同一个 `/api/shop/seller/base` 被请求两次** |
| `["shop","categories",1002]` | 1 | `ShopView.tsx:62` 无条件查；但「全站」视图根本不渲染分类 tab（`:201` 才渲染） |
| `["shop","count","products"|"onSale"|"orders"|"pending"|"sales",1002]` | 5 | `ShopView.tsx:70` 无条件查；指标卡只在 `mine && isSeller && tab==='products'` 时渲染（`:158`），且 `sales` 那条是 `page_size: 200` 的重查询 |
| `["shop","productsInfinite",0,0,"","",true]` | 1 | 唯一必要的那条 |

实测 `/shop?scope=mine` 冷启动：
| key | 是否被请求 | 说明 |
|---|---|---|
| `["shop","products",0,1,0,"","",false]` | **是**（total=45） | `ShopView.tsx:66` 的 `seller.data?.seller_id ?? 0`：seller 还没回来时 `sellerId=0`，而 `enabled=mine` 已经是 true → 先按**全站**查一次 |
| `["shop","productsInfinite",0,0,"","",true]` | **是** | 卡片网格在「我的店铺」不渲染，但这个 hook 没有 `enabled`（`ShopView.tsx:68`） |
| `["shop","count",…,1002]` ×5 | 是 | 合理（指标卡要显示） |

实测 `/orders` 冷启动：`["shop","orders",1,{}]` 与 `["shop","mineOrders",1,{}]` **两条都请求**（`OrdersView.tsx:46-57` 两个 hook 都无条件挂载，只有渲染时二选一）。点一次「发货」后计数：`mineOrders` 从 1 变 2、`orders` 从 1 变 1 —— 因为两个 hook 都是活跃 observer，`['shop']` 失效让**两个列表都重取一次**，其中一个是屏幕上看不到的。

- **建议**：
  1. `useCapabilities` 里改成调用 `useShopSeller()`（或统一 key 为 `['shop','seller',0]`），消掉重复的 `sellerBase`；
  2. `useShopCategories(..., enabled)` / `useShopCounts(..., enabled)` 加 `enabled: mine`（或 `tab === 'products'`）；
  3. `useShopProductsInfinite` 加 `enabled: !mine`，并把 sellerId 就绪作为前置（见 P1-6）；
  4. `OrdersView` 只挂当前视角那个 hook（`enabled: scope === 'shop' | 'mine'`），或按 scope 分支渲染两个组件。

### P1-6【实测】「我的店铺」首屏用全站数据填充表格（跨店串台）
- **位置**：`src/views/ShopView.tsx:66`（`mine ? (seller.data?.seller_id ?? 0) : 0`）+ `queries.ts:468`（`enabled` 只判断 `mine`）
- **实测证据**：`/shop?scope=mine` 冷启动后 cache 里同时存在
  ```
  ["shop","products",0,1,0,"","",false]      total 45   ← seller 未就绪时发出的请求（无 seller_id）
  ["shop","products",1002,1,0,"","",false]   total 3    ← 正确
  ```
  45 条里包含 mock 的 40 条 bulk 与另外两家店的商品，且因为 `onlyUp=false`（`ShopView.tsx:66` 给 mine 传 `!mine=false`）还包含**已下架**商品。
- **影响**：
  - 正常网络下是「表格闪一下 45 条、分页显示共 45 条 / 4 页」再跳回 3 条；
  - **seller 请求失败时（`seller.data` 一直是 undefined）会永久停在全站列表**，页面上只剩顶部一条错误提示，下面照常渲染别家的（含已下架）商品；
  - 这段时间 `isSeller` 还是 undefined，操作列显示「—」，所以暂时不会误点删除/编辑，但数据是错的。
- **修复**：`useShopProducts` 的 `enabled` 改成 `enabled && (!mine || sellerId > 0)`，或在 `ShopView` 里传 `mine && Boolean(seller.data?.seller_id)`；同样给 `useShopProductsInfinite` 加 `enabled: !mine`。

### P2-7【读码】失效范围过宽：`['shop']` / `['watch']` / `['music']` 一刀切
- **位置**：`queries.ts:576`、`:844-846`、`:734`
- **现象**：改一个片单的排序会把 `['watch','stats',4]`（`staleTime` 10 分钟、要打 4 次 `stats/video/history` 的查询）和所有 `watch*` 搜索缓存一起失效；`deliver` 一条订单会让商城商品列表、分类、店铺信息全部重取。实测一次「发货」命中 18 个 key。
- **影响**：不是错误，但把「窄失效漏刷」的修法（改成宽失效）会放大请求量；上面 P0-1/P0-2 建议用 `['shop']` 是权衡后的选择，`['watch']`/`['music']` 建议分层：片单元信息 / 片单内容 / 统计各用一个前缀。
- **备注**：命中列表里还有大量 `…,0]` 的 key（`sellerId=0` 的空壳查询，从未 fetch），说明「未就绪占位 key」也在被失效，属噪音。

### P3-1【读码】`useShopProductsInfinite` 的翻页判定依赖后端原样返回 page_size
- **位置**：`queries.ts:500`：`last.items.length < pageSize ? undefined : pages.length + 1`
- **风险**：片单视频接口就出现过「后端固定 15、前端传 20」的先例（`WatchlistDetailView.tsx:297` 的注释、历史 C1-01）。若商品接口某天也钳制 `page_size`，这里会一直以为还有下一页，直到取到空页才停（`ProductGrid` 会多打 N 次请求）。
- **建议**：用 `last.total` 对比已加载条数，或读 `last.page_size` 而非请求参数。

### P3-2【读码】URL 参数与请求参数不一致的两处
1. `WatchlistDetailView` 的路由把 `page_size` 固定成 20（`router.tsx:415-419`），请求也传 20，但该接口实际固定 15（`queries.ts` 注释 + 历史 C1-01）——**传了但后端不认**，只是返回值纠正了 Pager 才没出错。
2. `useShopMineOrders` / `useShopOrders` 的 `filter` 里，`order_no`/`order_title` 二选一靠正则猜测（`OrdersView.tsx:50`、`:56`：`/^[0-9A-Za-z]{12,}$/`）。纯字母数字的商品名（如 `EMOS2026LIMITED`，≥12 位）会被当成单号查，结果为空。

### P3-3【读码/契约】商品保存漏字段（与缓存无关，但同属数据流）
- **位置**：`ShopView.tsx:103-114`
- **现象**：只提交 9 个字段；契约里 `description`/`exchange_way`/`time_start`/`time_end`/`user_buy_max`/`cover_url` 未传。列表接口会返回 `description`/`exchange_way`，但详情弹窗（`ProductModals.tsx:66-67`）在读它们 → **后台新建的商品永远没有详情描述与兑换方式**。
- 与历史 `docs/review/api-shop.md` P2-1 一致，至今未修。

### P3-4【读码】未防抖的搜索查询（每次击键一个请求）
- `src/components/ImagePicker.tsx:86-89`：`queryKey: ['upload','images',term]` 直接绑输入框（无 350ms 防抖）。图库 40 张，每次击键一次 `/api/upload/image/list`。
- `src/views/WatchlistDetailView.tsx:44`：`useWatchSearch(id, term)` 与页面顶部的「在该片单里搜片名」**共用同一个 `term`**，所以只要输入框非空，即使「添加影片」弹窗没打开，也会持续打 `/api/watch/{id}/video/search`（`enabled: title.trim().length>0`）。同页 `videos` 查询又是 350ms 后按 URL 触发 → 一次输入产生两类请求。
- `src/views/UploadView.tsx:43-47`：`['upload','search',term]` 同样未防抖，且 key 用的是**未 trim** 的 `term`（多打一个空格就是新 key + 新请求）。
- **建议**：统一用 `useDebouncedValue`，key 用 trim 后的值。

### P3-5【读码】影片详情首帧按「无集」请求一次 media/subtitles
- **位置**：`VideoDetailView.tsx:53-59`
- `currentEpisode` 要等 `seasons`+`episodes` 两次请求回来才确定，期间 `useMediaList({video_list_id, video_season_id: undefined, video_episode_id: undefined})`/`useSubtitles` 都是 enabled 的 → 先按「整部影片」查一次（多 2 次请求），并且这一帧渲染出的是**整部影片的资源/字幕**（若后端按 `video_list_id` 返回全季数据，会把别的集的字幕显示在当前集下面）。数据回来后 key 变化再查一次。
- **建议**：`enabled: Boolean(currentEpisode)`，或让后端支持「只给 list_id 时返回空」。

### P3-6【读码】`ShopView` 遗留死条件与未使用的失效 key
- `ShopView.tsx:198` `{true ? (…) : null}`：条件被写死，包裹的 JSX 里再用 `mine`/`!mine` 各自判断。功能上没错（`mine` 与 `!mine` 互斥），但把「表格 vs 卡片」两套分支永远挂载，是上面 P2-6 里重复请求的结构性原因之一。
- `createOrder` 失效的 `['shop','products']` 在「全站」视图里没有订阅者（命中即空转）。

### P3-7【读码】`useSeekPoll` 的 key 与 `refetchInterval`
- **位置**：`queries.ts:206-213`
- `queryKey: ['seek','poll',lastId]`：列表首条 id 变化就换 key、旧 key 的 30s 轮询随组件卸载停止，行为正确；但 `['seek','poll',*]` 缓存会按 `lastId` 无限增长（`gcTime` 30 分钟后才回收）。影响很小，记录备查。

---

## 4. `queryKey` / `enabled` / `staleTime` 专项结论

### 4.1 漏参数导致的「改了筛选命中旧缓存」
**未发现**。逐条核对过：
- `useVideoPage`↔`['videos',params]`（title/type/page/page_size 全在 key 里）
- `useSeekPage`↔`status/video_title/video_type/upload_self`（`sort_order` 由 queryFn 固定为 `desc`，但 key 里没有；当前恒为常量，不构成 bug，属于脆弱点）
- `useShopProducts`↔`sellerId/page/categoryId/name/sortBy/onlyUp`（未含 `pageSize`，但调用点硬编码 12）
- `useShopProductsInfinite`↔`sellerId/categoryId/name/sortBy/onlyUp`（未含 `pageSize`，硬编码 24）
- `useMusicSongs`↔`page/term/filter`（`pageSize` 未入 key，硬编码 20）
- `useWatchPage`/`useWatchVideos`/`useWatchMusic`/`useDeletedMedia`/`useDeletedVideos`/`useShopOrders`/`useShopMineOrders`：筛选参数都在 key 里；对象字面量作为 key 元素是结构化哈希，不会因每次 render 产生新 key（实测 `["shop","orders",1,{}]` 在多次 render 间保持稳定、无额外请求）。

### 4.2 参数顺序/类型不一致导致未命中
**未发现**。`buildUrl`（`client.ts:38-57`）对 `undefined`/`null`/`''` 一律跳过、布尔转 `1/0`（后端要求），所以 `onlyUp ? true : undefined` 与对象里 `undefined` 字段都不会产生脏参数；`{is_pay:false}` 与 `{}` 也因哈希不同而分成两个 key（正确）。

### 4.3 `enabled=false` 时用错状态导致「永远空白」
逐个查了 `enabled` 的 8 处（`useShopCategories`、`useMediaList`（无 enabled）、`useSubtitles`、`useShopProducts`、`useShopCounts`、`useTodos` 相关、`usePayOrder`、`useSeekPoll`、`useWatchMusicSearch`、`useWatchSearch`、各视图的 `enabled` tab 分支）：
- **MusicView / FundView / RecycleView**：loading 与 empty 都取自 `active`（当前 tab 的查询），接线正确。
- **OverviewView:47-48 → 345-360**：`myWatchlists` 在 `showWatchlists === false` 时被禁用，但整块 section 也在同一条件里不渲染，不会出现「永远空白」。
- **ShopView**：`products` 在 `mine=false` 时禁用，其 loading/empty 都加了 `mine &&` 前缀（`:254-257`）；`browse` 的 loading/empty 加了 `!mine &&`（`:263-266`）。**这一处是 661bc09 刚修好的**，当前正确。
- 唯一残留：**P1-6**（`enabled` 判据少一个 `sellerId > 0`）—— 不是「空白」，而是**用别的数据集填充**。

### 4.4 staleTime / refetch 清单（谁该更实时）
| key | staleTime | 是否合理 |
|---|---|---|
| 全局默认（`main.tsx:20-27`） | 5min，`refetchOnWindowFocus:false`、`retry:false` | ⚠️ 对管理台可接受，但**库存/订单状态页没有手动刷新按钮**，5 分钟陈旧 + 焦点不刷新，是 P0-1/P0-2 叠加的放大器 |
| `['shop','product',id]`（`queries.ts:552`） | 60s | ❌ 库存/售罄不该有粘性，见 P0-1 |
| `['shop','count',*]` | 默认 5min | ⚠️ 待发货/订单数建议 30s，见 P0-3 |
| `['session']` 5min、`['carrot']` 60s、`['todos']` 60s、`['record','list']` 60s、`['watch','stats']` 10min | — | 基本合理 |
| `['pay','order',no]` | 默认 5min | ❌ 查单是「我要看最新状态」的动作，实测二次查询**不发请求**（见 P1-7） |

### 4.5 乐观更新
全仓 `onMutate` **零使用**（`grep onMutate src` 无结果）→ 不存在「乐观更新缺回滚」。所有写操作都是「等响应 → 失效 → 重取」，慢但一致。

---

## 5. 补充：P1-7【实测】查单复用缓存，看不到最新状态
- **位置**：`src/views/PayView.tsx:23-24`（`lookup` → `usePayOrder`，`queries.ts:832-839` 只有 `retry:false`，没有 `staleTime: 0`）
- **实测**：输入单号→「查询」→ 清空→重新输入同一单号→「查询」：第二次 **0 次请求**，`dataUpdatedAt` 仍是第一次的时间。
- **影响**：支付/退款状态变化后，同一单号在 5 分钟内怎么点「查询」都返回旧快照，界面上也没有「刷新」。
- **修复**：`staleTime: 0` + `refetchOnMount: 'always'`，或按钮直接 `orderQuery.refetch()`；`gcTime` 可保留。

---

## 6. 复现脚本（本次实测用的探针，未落盘到仓库）

在页面控制台执行（或 `browser_evaluate`）：

```js
// 1) 反查 QueryClient（React 18：容器上的 __reactContainer$xxx → fiber 树 → providerProps.client）
const el = document.getElementById('app')
const root = el[Object.keys(el).find(k => k.startsWith('__reactContainer$'))]
const stack = [root], seen = new Set(); let client = null
while (stack.length && !client) {
  const n = stack.pop(); if (!n || seen.has(n)) continue; seen.add(n)
  if (n.memoizedProps?.client?.getQueryCache) client = n.memoizedProps.client
  if (n.child) stack.push(n.child); if (n.sibling) stack.push(n.sibling)
}
// 2) 计数真实请求 = queryCache 里 action === 'fetch' 的事件
window.__qlog = []
client.getQueryCache().subscribe(e => e?.query && window.__qlog.push({ key: JSON.stringify(e.query.queryKey), action: e.action?.type ?? e.type }))
window.__summary = () => { const c = {}; for (const e of window.__qlog) if (e.action === 'fetch') c[e.key] = (c[e.key]||0)+1; return c }
// 3) 记录每次失效命中了哪些 key
const orig = client.invalidateQueries.bind(client)
client.invalidateQueries = (f, o) => { window.__ilog.push({ filter: JSON.stringify(f?.queryKey), matched: client.getQueryCache().findAll(f).map(q => JSON.stringify(q.queryKey)) }); return orig(f, o) }
window.__ilog = []
```

配合 `client.clear()` 制造「冷启动」，即可复现第 2 节的请求计数与失效命中。

---

## 7. 建议的修复顺序

1. **P0-1 / P0-2 / P0-3**：把 `createOrder`、`payOrder` 的失效改成 `['shop']` + `['todos']`；去掉 `useShopProduct` 的 `staleTime`。
2. **P1-6**：`useShopProducts` 加 `sellerId > 0` 前置，`useShopProductsInfinite` 加 `enabled: !mine`（同时解决串台与 1 次白请求）。
3. **P1-1 / P1-2 / P1-4 / P1-5**：把视图里的裸写操作收进 mutation，统一失效媒体/萝卜/片单槽位。
4. **P1-3 / P2-2 / P2-3 / P2-4**：给 `useVideoMutations`、`useRecycleMutations` 补 `['videos']`、`['media']`、`['subtitles']`。
5. **P2-6**：消掉 `sellerBase` 双 key、按需启用分类/计数、
   `OrdersView` 只挂当前视角。
6. 其余 P3 与「一刀切失效」重构。
