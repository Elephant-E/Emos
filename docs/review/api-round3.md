# EMOS 管理台 · API 覆盖与正确性审计（第三轮）

> 只读审计，未改任何源码。基线 HEAD `432e039`，工作区干净。
> 三份来源：`api.postman_collection.json`（字段级契约，最高优先级）、wiki.emos.best（已亲自复核 `/api/use`、`/api/changelog`、`/api/upload`、`/api/pay`、`/api/shop`、`/introduction/carrot` 六页）、`docs/UPLOAD-PROTOCOL.md`（真机实测）。
> 方法：把 190 条 Postman 请求的 method+path 与 `src/api/endpoints.ts` 的 185 个方法自动对齐；再用「去空白后的跨行匹配」判定每个端点在 `views/`、`lib/`、`queries.ts` 中是否真被调用；对「已封装且在用」的，逐条比对 query/body 字段名、必填项、布尔编码与分页字段，并回溯到具体调用点。

---

## 结论先行

1. **覆盖率很高，正确率不高。** 186 个真实 API 里封装了 184 个（99%），但「已封装且在用」的 105 个里，**有 16 处参数/语义与契约不符**，其中 6 处会让调用必然失败或结果相反。
2. **最致命的一条：`PUT /api/video/media/delete` 的语义被当作「恢复」用。** 回收站「影片」Tab 的恢复按钮实际调用的是 `videoApi.remove()`（删除接口），响应里的 `is_delete` 被丢弃后一律 toast「已恢复」。
3. **第二致命：删除他人内容一律传 `reason: null`。** changelog 2026-03-29 明确「删除别人的内容时必须传入 reason」，而 `mediaApi.remove` / `subtitleApi.remove` 的 UI 没有任何原因输入框 —— 管理员删别人的资源/字幕必然 422，这恰恰是后台最常做的事。
4. **布尔编码只修了一半。** 客户端已经把 JS `boolean` 统一转成 1/0，但订单页的 `is_pay` / `is_delivery` 传的是**字符串** `'true'` / `'false'`，从 `buildUrl` 的转换分支下漏过 —— 订单页两个筛选维度、以及待办角的「待发货」计数同时中招。
5. **上传链路有 4 处断点**：`getUploadToken` 不传 wiki 明确要求的 `file_storage`（存储选择下拉形同虚设）；`onedrive`/`google_drive`/`multipart` 三种存储类型在 `uploadObject` 里直接 `return fileId`（**一个字节都没传**）却报告「上传中→入库成功」；暂存区「归档」缺必填 `item_type`/`item_id` 必然 422；手动关联影片时 `item_type` 恒为 `'vl'`，剧集资源会挂到剧集层而不是集。
6. **两个「幽灵端点」**：`PUT /api/user/agreeDownAgreement` 在 Postman 里根本不存在（185 个封装里唯一一条），「同意下载协议并开通」大概率 404；反过来 Postman 里的 2 个真实接口未封装（`POST /api/invite/exit`、`DELETE /api/shop/order/user/order`）。

---

## 一、覆盖统计

### 1.0 口径

| 计数 | 值 | 说明 |
|---|---|---|
| Postman 请求条目 | **190** | 其中唯一 method+path **189**（`GET /` 出现两次） |
| 扣除非端点条目 | −3 | `GET /`×2（文档占位：更改片单默认/歌手详情）、`GET /link`（登录跳转页）、`PUT /xxxx`（分片上传占位） |
| **真实 API 端点数** | **186** | |
| `endpoints.ts` 封装方法数 | **185** | 其中 184 与 Postman 对齐，1 条 Postman 里没有（见 1.3） |
| 代码中被引用 | 112 | 含只挂在死 hook / 未消费 mutation 上的 7 个 |
| **真实有 UI 触达** | **105** | 可直接调用或经「视图消费的 hook/mutation」触达 |
| **无任何 UI 入口** | **80** | 73 未被引用 + 7 只挂在死代码上 |

### 1.1 已封装且在用（105）

`*` = 参数或语义有已知问题（详见第二节）。

| 域 | 在用的端点 |
|---|---|
| 会话/用户（9） | `profile`、`showEmpty`、`pseudonym`、`agreeUpload`、`agreeDown`*、`sign`、`passwordTemporary`、`passwordReset`、`statsVideoHistory`* |
| 邀请（5） | `info`、`history`、`create`、`revoke`、`tree` |
| 上传（7） | `recognize`、`uploadToken`*、`saveVideo`、`saveSubtitle`、`disks`、`storeFiles`、`archive`* |
| 视频（7） | `list`、`search`、`sync`*、`remove`、`seasons`、`episodes`*、`persons` |
| 资源（8） | `list`、`listAll`、`remove`*、`restore`、`move`、`rename`、`playUrl`*、`syncMetadata` |
| 字幕（3） | `list`、`remove`*、`rename` |
| 观影记录（1） | `list` |
| 片单（14） | `list`、`createOrUpdate`、`remove`、`slot`、`show`、`subscribe`、`dynamic`、`videos`、`searchVideos`、`addVideo`、`removeVideo`、`music`、`removeMusic`（+ `sort` 只挂在未消费的 mutation 上，见 1.2） |
| 线路（3） | `list`、`create`、`remove` |
| 求片（5） | `list`、`query`、`history`、`claim`、`urge` |
| 萝卜（3） | `current`、`history`、`transfer`* |
| 直播（7） | `list`、`save`*、`remove`、`media`、`addMedia`*、`removeMedia`、`library` |
| 支付（4） | `base`、`apply`*、`query`、`userInfo` |
| 商城（14） | `sellerBase`、`sellerApply`*、`sellerUpdate`、`categories`、`createCategory`、`deleteCategory`、`products`、`saveProduct`*、`deleteProduct`、`productUp`、`ordersShop`*、`delivery`、`remarkOrder`、`deleteOrder` |
| 封禁（2） | `list`、`change` |
| 音乐（10） | `persons`、`songs`、`albums`、`favorite`、`sync`、`lyrics`、`media`、`deleteSong`（+ `rating` 未消费） |
| 基金（3） | `orders`、`create`、`evidence` |
| 悄悄话（3） | `sender`、`receiver`、`reply` |

### 1.2 已封装但无 UI 入口（80）

| 域 | 端点 | 备注 |
|---|---|---|
| 用户（2） | `videoHistory`、`videoLogout` | 设备列表/踢设备 —— 顶号工单唯一解法 |
| 邀请（1） | `emps` | 备注编辑 `remark` 也在其中 |
| 上传（7） | `videoBase`、`saveInternal`、`imageList`、`deleteImage`、`saveMusic`、`saveMusicHeadless`、`presign`/`complete`/`abort` | `presign/complete` 只在 mock 里出现，`uploadObject` 的 multipart 分支是空实现 |
| 视频（2） | `tree`、`getVideoId` | `getVideoId` 是「按 tmdb/todb 反查 video_id」的唯一入口 |
| 资源（1） | `listAll` 只在回收站用；`productSort`/`productCategory` 类的「有 mutation 无调用」见下 | |
| 记录（2） | `requests`、`change` | |
| 片单（7） | `maintainer`、`users`、`emptyVideos`、`emptyMusic`、`updateVideos`、`searchMusic`、`addMusic` | 音乐片单只能删歌、不能加歌 |
| 求片（2） | `poll`、`apply` | |
| 榜单（3） | `carrot`、`sign`、`playingLive` | `upload`/`playingVideo` 只挂在死 hook 上（`useRankUpload`/`usePlayingNow`） |
| 支付（8） | `update`、`transfer`、`create`、`close`、`testNotify`、`userCarrot`、`userSign`、`notifyEmail` | 用户页余额卡写死「—」正因 `userCarrot` 未接 |
| 商城（6） | `sortCategory`、`product`、`ordersUser`、`createOrder`、`payOrder`、`urgeOrder`、`closeOrder` | + `productSort`、`productCategory`（有 mutation，视图零调用） |
| 音乐（9） | `searchSongs`、`syncSpotifyArtist`、`createLyric`、`deleteLyric`、`deleteMedia`、`playUrl`、`moveMedia`、`updateVideoId`、`batchHashExist`、`updateAlbumVideoId` | + `rating`（有 mutation，视图零调用） |
| 红包（3）/投票（2）/抽奖（4）/影院（6） | 全部 | 按项目决定「不做」 |
| 基金（1） | `check` | |
| 悄悄话（1） | `create` | |

> 计数对齐：73（未被任何代码引用）+ 7（只挂在死 hook 或从未被调用的 mutation 上：`rankApi.upload`、`rankApi.playingVideo`、`shopApi.productSort`、`shopApi.productCategory`、`watchApi.sort`、`liveApi.updateMedia`、`musicApi.rating`）= 80。

### 1.3 未封装

| 类型 | 端点 | 影响 |
|---|---|---|
| **Postman 有、代码没有（真实接口，2 个）** | `POST /api/invite/exit`（退出邀请关系） | 用户主动脱离邀请人；后台无入口，只能让用户去客户端操作 |
| | `DELETE /api/shop/order/user/order`（用户侧删除订单） | 商户侧删除已封装（`shopApi.deleteOrder`），用户侧删除没有 |
| **代码有、Postman 没有（1 个）** | `PUT /api/user/agreeDownAgreement`（`userApi.agreeDown`） | **185 个封装里唯一一条在契约中不存在的路径**；`/api/user` 响应确有 `is_can_down` 字段，但没有对应的开通接口 → 「同意下载协议并开通」大概率 404。需真机确认；若确无此接口，应改为提示走客户端/管理员开通 |
| 非端点条目（3 个） | `GET /`×2、`GET /link`、`PUT /xxxx` | 文档占位，不需要封装 |

---

## 二、用错清单（按严重度）

### 2.1 致命：调用必然失败，或结果与用户意图相反

| # | 位置 | 现象 | 依据 | 修法 |
|---|---|---|---|---|
| F1 | [`queries.ts:613`](src/api/queries.ts#L613) `restoreVideo` → `videoApi.remove(videoId)` | 回收站「影片」Tab 的**恢复**按钮，实际调用 `PUT /api/video/{video_id}/delete`，并把响应 `{carrot,is_delete}` 丢弃，一律 toast「已恢复」 | Postman 只有 `/api/video/{id}/delete`，没有影片级 restore；该接口返回 `is_delete: true`。若后端是幂等删除（而非 toggle），点「恢复」= 再删一次 | 要么推动后端加 `PUT /api/video/{id}/restore`；要么先读回 `is_delete`，只有 != true 才提示成功，否则提示「该影片无法在此恢复」 |
| F2 | [`endpoints.ts:100`](src/api/endpoints.ts#L100) / [`queries.ts:362`](src/api/queries.ts#L362) `mediaApi.remove`；同 `subtitleApi.remove`（[`endpoints.ts:112`](src/api/endpoints.ts#L112)） | `reason` 恒为 `null`，UI 无原因输入 | changelog **2026-03-29**：「删除别人的内容时 必须传入 `reason` 原因」；Postman body 也注明「删除别人视频时 需要传入原因 50字内」 | 删除确认框加一个可选原因输入（他人内容时必填），透传到 `reason`；自己上传的内容可留空 |
| F3 | [`UploadView.tsx:267`](src/views/UploadView.tsx#L267) `uploadApi.archive({ path_type, file_name })` | 只传 2 个字段；Postman 的 `POST /api/upload/store/archive` body 是 4 个字段：`item_type`、`item_id`、`path_type`、`file_name`，且 `item_type/id` 是「入库到哪」的唯一标识 | Postman body 示例 + 响应 `{media_id, carrot}`（说明确实产生了资源，必须知道归属） | 归档前先选目标（复用 `uploadApi.videoBase`），传 `item_type` + `item_id`；否则该按钮永远 422 |
| F4 | [`OrdersView.tsx:20-27`](src/views/OrdersView.tsx#L20) / [`queries.ts:217`](src/api/queries.ts#L217) | `is_pay: 'true'`、`is_delivery: 'false'` 是**字符串**；`buildUrl` 只把 JS `boolean` 转 1/0，字符串原样透传 | 客户端 [`client.ts`](src/api/client.ts) 布尔分支；本项目既有结论「后端布尔参数要 1/0」 | 改成 `is_pay: true / false`（boolean），让 client 统一编码；同时把 `is_pay?: string` 的类型收紧为 `boolean`，防止回潮 |
| F5 | [`endpoints.ts:21`](src/api/endpoints.ts#L21) `userApi.agreeDown` | 路径 `/api/user/agreeDownAgreement` 在 Postman / api-inventory / mock 中均不存在（`agreeUploadAgreement` 存在） | 见 1.3 | 真机验证；若无此接口，改为「请联系管理员开通下载权限」，并删掉该封装 |

### 2.2 误导：不报错，但数值/语义是错的

| # | 位置 | 现象 | 依据 | 修法 |
|---|---|---|---|---|
| M1 | [`queries.ts:358`](src/api/queries.ts#L358) `syncVideo: videoApi.sync({ todb_id: videoId })` | 把 **EMOS video_id 当成 todb_id** 传给 `PATCH /api/video/sync` | Postman 视频列表示例：`video_id: 1` 对应 `todb_id: 1000`，两套 ID 不同源；接口语义是「从 todb 平台同步视频信息，返回待同步内容，为空说明 todb 上还没数据」 | 传 `todb_id: video.todb_id`（详情已拿到 `todb_id`），并对空数组给「todb 上还没有这部片」的提示 |
| M2 | [`lib/uploader.ts:68`](src/lib/uploader.ts#L68) | `uploadObject` 只实现了 `tusd`、`r2/local`；对 `onedrive` / `google_drive` / `multipart` **直接 `onProgress(1); return fileId`**，一个字节都没传，随后 `saveVideo` 照常调用 | wiki `/api/upload` 明确三种存储各自的请求方式（onedrive/google_drive 要 `Content-Range`，multipart 要 presign→PUT→complete） | 至少显式抛错「该存储类型暂不支持，请在服务端切换存储」；真机当前是 tusd，问题处于潜伏态 |
| M3 | [`lib/uploader.ts:35`](src/lib/uploader.ts#L35) + [`endpoints.ts:70`](src/api/endpoints.ts#L70) `uploadToken` | 请求体缺 `file_storage`；而 UI 顶部有一个「存储位置」下拉（`uploadApi.disks()` 的结果），看起来能选存储 | wiki `/api/upload` 的请求参数明确包含 `file_storage`（`global/internal/default/zn_r2_upload/google_drive`）；Postman 同 | 把选中的 `storage` 透传进 `uploadToken`；否则把下拉改成只用于「暂存区浏览」，并在文案上说明 |
| M4 | [`UploadView.tsx:304`](src/views/UploadView.tsx#L304) | 手动关联影片时 `item_type` 硬编码 `'vl'`，`item_id` 用 `video_id` | wiki：`item_type` 电影用 `vl`、电视剧用 `ve`（集），`upload/video/base` 的示例也是如此 | 选择器里继续选季/集，剧集传 `ve` + `episode_id`；否则剧集资源挂到剧集层，播放端按集匹配不到 |
| M5 | [`queries.ts:120-129`](src/api/queries.ts#L120) `useWatchStats` | 请求的 `dates[]` 包含**今天**；Postman 该接口注明「只可查今天之前的数据」 | Postman desc + 响应示例中只有历史日期；而 [`OverviewView`](src/views/OverviewView.tsx) 用今天的日期算 `todaySeconds`，据此决定问候语「今天看了 N 分钟 / 今天还没看片」 | 日期范围截到今天之前；「今天看了多少」改用 `recordApi.list`（该接口返回 `play_seconds`）或直接不显示 |
| M6 | [`VideoDetailView.tsx:400`](src/views/VideoDetailView.tsx#L400) `playUrl` | 每次点「复制播放地址」都会调用 `GET /api/video/media/playUrl` | Postman：「第三方播放使用 每次 `-1` 萝卜 获取后 可以缓存 10 分钟」 | 按钮文案标注「-1 萝卜」；对同一 media 缓存 10 分钟复用结果 |
| M7 | [`AccountView.tsx:585`](src/views/AccountView.tsx#L585) / [`PayView.tsx:175`](src/views/PayView.tsx#L175) 转赠 | 文案只写「单次 2 – 6000 个，转出后不可撤回」 | wiki `/introduction/carrot`：「转赠萝卜 系统扣 20% 手续费」；Postman `pay/transfer` 也注明「费率为千 6」（服务商通道） | 补手续费提示；并明确走 `carrotApi.transfer` 还是 `payApi.transfer`（两套费率不同，现在只用了前者） |
| M8 | [`ShopView.tsx:402-426`](src/views/ShopView.tsx#L402) 申请开店 | 提交前没有任何「扣 3000 萝卜」的提示 | wiki `/api/shop`：「申请时将扣除 `3k` 萝卜」；对照支付页确实写了「扣 5000」 | 申请开店弹窗补一句 + 二次确认，与支付页保持一致 |
| M9 | [`PayView.tsx:62`](src/views/PayView.tsx#L62) `payApi.apply('我的支付服务','由后台发起申请')` | 名称/描述硬编码；且申请按钮只在 `/api/pay/base` **返回 404** 的分支渲染 | Postman `/api/pay/apply` 的 `name` ≤10 字、`description` ≤200 字（合法）；但非服务商时 `/api/pay/base` 若返回 403 或 `status: default`（同 `/api/shop/seller/base` 的改法），按钮就永远不出现 | 申请入口不要绑在 404 上：按 `base.status` 判定；表单让用户填名称/简介 |
| M10 | [`LiveView.tsx:223`](src/views/LiveView.tsx#L223) 新增频道 | 传 `code` 且 UI 必填；Postman `POST /api/live/list` 的 body **没有 `code`**（文档只说明「如果存在 `code` 则为官方源」） | Postman body 4 字段：`id`、`live_library_id`、`title`、`description`、`tagline`、`image_poster_url` | 去掉必填 `code`（或明确标注「仅官方源填写」）；补 `image_poster_url`（可选） |
| M11 | [`ShopView.tsx`](src/views/ShopView.tsx) 商品表单 | 编辑弹窗只有 名称/售价/原价/库存/排序/分类/立即上架；`description`、`exchange_way`、`time_start`、`time_end` 从不发送 | Postman `createOrUpdate` 契约含这 4 个字段（`time_start/end` 是上下架时间窗） | 补字段；否则「限时活动」这类商品在后台永远做不出来 |

### 2.3 轻微：字段冗余、可选参数缺失、类型过宽

| # | 位置 | 现象 | 建议 |
|---|---|---|---|
| L1 | [`queries.ts:217`](src/api/queries.ts#L217) `useTodos` | 与 F4 同源的 `is_pay: 'true'`；`safe()` 容错会让它**静默变 null**，看不到错 | 修 F4 后顺带修这里；或至少 `console.warn` |
| L2 | [`endpoints.ts:90`](src/api/endpoints.ts#L90) `episodes` | 未传 `with_seek` / `with_seek_is_request`，剧集列表拿不到求片标记 | 求片页若要做「本集被求过」，补这两个参数 |
| L3 | [`endpoints.ts:96`](src/api/endpoints.ts#L96) `mediaApi.list` | 未传 `include_delete`：已删除资源在详情页不可见（只在回收站） | 详情页可加「显示已删除」开关 |
| L4 | [`endpoints.ts:110`](src/api/endpoints.ts#L110) `subtitleApi.list` | 只传 `video_list_id` + `video_episode_id`；契约还支持 `video_part_id`/`media_id` | 按 parts 细分时补 |
| L5 | [`ShopView`](src/views/ShopView.tsx) 售价输入 | 清空售价得到 `price: 0` / `null`，而契约要求 `price` 1–5w 必填 | 表单校验 1–50000 |
| L6 | [`inviteApi.create`](src/api/endpoints.ts#L34) | `invite_user_id` 未校验 `e…s` 10 位格式，Postman 标注必填且格式固定 | 输入框加正则校验，避免 422 才报错 |
| L7 | [`SeekView.tsx`](src/views/SeekView.tsx) 催片数量 | `Number(value)` 可能为 `NaN`（清空输入框时） | `Number.isFinite` 兜底 |
| L8 | [`liveApi.addMedia`](src/api/endpoints.ts#L216) | UI 允许 `flv` / `mp4`；Postman 注明 `path_type` 目前固定为 `m3u8` | 只留 m3u8，或加「实验性」标注 |
| L9 | [`recordApi.list`](src/api/endpoints.ts#L119) | 多传 `page` / `page_size`（契约未列，但响应含 `page/page_size`，实测可用） | 保留，无需改 |
| L10 | [`endpoints.ts:126`](src/api/endpoints.ts#L126) `createOrUpdate` | `is_show_empty` 现在是硬编码 `true`（[`WatchlistsView.tsx`](src/views/WatchlistsView.tsx#L45) 注释写了必填） | 语义上应跟随用户设置；至少让用户在弹窗里可选 |
| L11 | [`fundApi.orders`](src/api/endpoints.ts#L331) | 多传 `page/page_size`（契约未列，响应含） | 保留 |

### 2.4 已知踩坑复核（lead 给的清单）

| 已知坑 | 状态 | 证据 |
|---|---|---|
| `only_delete` / `is_self` 等布尔必须 1/0 | ✅ 已修（但漏了字符串路径，见 F4） | [`client.ts`](src/api/client.ts) 的 `typeof value === 'boolean'` 分支 |
| `POST /api/seek` 的 `sort_by` 必填 | ✅ 已修 | [`endpoints.ts:181-185`](src/api/endpoints.ts#L181) 默认 `updated_at/desc` |
| `POST /api/watch` 的 `is_show_empty` 必填 | ✅ 已修 | [`WatchlistsView.tsx:45`](src/views/WatchlistsView.tsx#L45) 传 `true` |
| 上传的 `file_size` 必填 | ✅ 已修 | [`endpoints.ts:70`](src/api/endpoints.ts#L70) 四字段齐全（仍缺 `file_storage`，见 M3） |
| `fund/order/evidence` 只有 `order_no/images/remark` | ✅ 符合 | [`FundView.tsx:44`](src/views/FundView.tsx#L44) 恰好这三个 |
| `POST /api/watch/watch_id/video/{id}` 的 `sort` 必填 | ✅ 符合 | `addVideo` 默认 80 |

### 2.5 需要真机/有 token 才能确认的（本次无法验证）

1. `agreeDownAgreement` 是否真的 404（F5）。
2. `is_pay`/`is_delivery` 传字符串是 422 还是被忽略（F4）—— 两种结果都是 bug，但修法优先级不同。
3. `archive` 缺 `item_type/item_id` 的报错文案（F3）。
4. 删除他人资源时 `reason: null` 的确切响应（F2）。
5. `/api/video/{id}/delete` 是否为 toggle（F1）。

---

## 三、建议补的 top 5 端点

按「用户价值 ÷ 改造成本」排序，全部来自 1.2 的 80 个无入口端点：

| # | 端点 | 为什么值得补 | 成本 | 现状证据 |
|---|---|---|---|---|
| 1 | `videoApi.getVideoId`（`GET /api/video/getVideoId`） | 唯一能「按 tmdb / todb 反查 video_id」的接口。入库时判断片子是否存在、客服拿截图里的 TMDB 号定位、避免重复建档都要用它；也是「按 ID 搜索」缺口的底座 | 极小：一个搜索框 + 结果列表 | 已封装未用；媒体库搜索只有片名 |
| 2 | `userApi.videoHistory` + `videoLogout`（`server/videoHistory`、`server/videoLogout`） | 「我被别人登着」是客服最高频工单之一；现在用户详情页没有任何设备入口，无法踢出 | 小：用户详情加一段设备表 + 每行「退出」 | 已封装未用；`UserDetailView` 只有资料与封禁 |
| 3 | `payApi.userCarrot` + `payApi.userSign` | 用户详情页的「胡萝卜」卡片目前是**写死的「—」**，即使有服务商权限也不显示；充值没到账/签到异常都答不了 | 小：两个单参接口，接进已有的 4 卡布局 | [`UserDetailView.tsx`](src/views/UserDetailView.tsx) 硬编码 `—`；两接口均未接 |
| 4 | `watchApi.searchMusic` + `watchApi.addMusic` | 音乐片单现在**只能删歌不能加歌**（`useWatchMusic` / `removeMusic` 已接，`searchMusic` / `addMusic` 没接）—— 用户看到的是一个坏页面 | 中：片单详情按 `type` 复用现有「添加影片」弹窗 | [`WatchlistDetailView.tsx:324`](src/views/WatchlistDetailView.tsx#L324) 只接了查+删 |
| 5 | `shopApi.product`（`GET /api/shop/product/info`） | 商品编辑弹窗现在只能回填列表字段，`description`/`exchange_way`/`time_start`/`time_end` 永远拿不到也存不了，等于商品详情页在后端有、在后台不可见 | 小：打开编辑弹窗时先拉一次详情再填表 | 已封装未用；对应 M11 |

**次选**（价值高但成本略高）：`uploadApi.imageList` + `deleteImage`（图片库/海报）、`liveApi.updateMedia`（批量换源）、`musicApi.createLyric` + `deleteLyric`（歌词编辑）、`shopApi.closeOrder`（关闭未支付订单）。

**建议明确不做**：红包（3）/ 抽奖（4）/ Telegram 投票（2）/ 影院（6）/ `rankApi.sign|carrot`（群榜，机器人在群里用）——共 15 个端点，与后台职责无关。

---

## 附：与 `docs/WIKI-NOTES.md` 的两处出入

1. **5000 / 3000 胡萝卜不在 `/introduction/carrot`**。该页只讲获取途径与境界表；实际出处是 `/api/pay`（申请扣 `5k`、提现手续费 ≤10‰）与 `/api/shop`（申请扣 `3k`）。数字本身没错，建议备注里改一下出处。
2. `/introduction/carrot` 里还有一条对 UI 有直接影响、但 WIKI-NOTES 未收录：**「转赠萝卜 系统扣 20% 手续费」**（对应 M7）。
3. `/api/changelog` 2026-04-09 的图片字段改名（`image_poster` → `image_poster_url`、`cover` → `cover_url`）已核对：片单、直播、商品三处代码均使用新字段名，✅ 符合。

---

*本审计只覆盖「契约一致性」；UI 体验问题见 `docs/review/function-round2.md`，接口可用性/错误处理见 `docs/review/interaction-round2.md`。*
