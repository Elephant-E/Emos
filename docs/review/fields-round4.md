# EMOS 管理台 · 响应字段使用审计（第四轮）

> 只读审计，未改任何源码。基线 HEAD `1361bcc`。取证账号 `e7E6K6OE4s`（roles: ["admin"]，服务商 `seller_id: 1002`），时间 2026-11-07，接口 `https://emos.best`。
> 方法：先从前端代码里抽出每页实际读取的字段（`row.*` / `item.*` / `video.*` / `stats.*`），再用同账号直连取真实响应逐字段比对；类型、单位、可空性、枚举值四项都核对。
> 取证工具：`curl -H "Authorization: Bearer <token>"`。**注意：该实例网络抖动明显**（记录/统计接口常 20–60s，部分请求超时），因此凡「未取到实物」的字段我在表格里标了「契约核对」，只引用 Postman 示例，不硬下结论。

---

## 结论先行

1. **12 个页面里 6 个有确定的响应字段错误**（另有 1 处是纯类型声明错），其中 2 个是整页级：**悄悄话页 4 个字段全错**（读 `content`/`reply_content`/`sender_id`/`created_at`，实际是 `sender_content`/`receiver_content`/`sender_user`/`sender_at`），**直播源状态永远不显示「正常」**（后端枚举是 `normal`/`error`，代码比的是 `'ok'`）。
2. **两处图片字段名错**：影片演职员的 `image_profile` 实际是**文件 id**（不是 URL），音乐的歌手实际字段是 `image_profile_url` 而代码与类型都写成 `image_profile` —— 前者渲染坏图，后者整列没有头像。
3. **lead 列的 8 条可疑项里，6 条是「我们的用法正确」**：`formatSize` 确实按字节（`size_upload` = 32,360,996,899,468 → 29.4 TB）、`media_seconds`/`play_seconds` 都是秒、`media_file_size` 是字节、`is_can_restore` 是真布尔、`video_count`/`stock`/`price` 都是整数、`subtitle_codec` 与歌词字段都存在。**错的是另外 2 条**：`invite_remaining`（API 给管理员也是 1，我们特判成 ∞）和订单的 `is_pay`/`is_delivery`（必须 1/0，传 `'true'` 直接 422，有 curl 实证）。
4. **语义误读集中在「时间/身份/层级」**：把「最近 7 天的封禁列表」当「是否被封禁」、把「扁平 3235 条的邀请关系数组」画成带层级箭头的树、把「邀请时间」与「加入时间」混为一谈（实测两者相差 2 天）。
5. 另有一类**类型声明与实际不符但不崩**：`mediaApi.list` 声明返回 `{medias: []}`，实际是**裸数组**（`useMediaList` 已做兼容，纯类型层问题）；`VideoPerson.gender` 声明 `number`，实际是 `"female"` 字符串；`MusicPersonItem.is_virtual` 声明 `boolean`，实际是 `0`。

---

## A. 逐页字段对照

图例：✅ 正确 · ❌ 错名/字段不存在 · ⚠️ 错类型/错单位/语义误读 · ❓ 未取到实物（契约核对）

### A1 概览（`OverviewView`）

| 字段 | 响应实际 | 我们的用法 | 结论 |
|---|---|---|---|
| `user.size_upload` | int，字节（`32360996899468`） | `formatSize(caps.sizeUpload)` | ✅ 29.4 TB 显示正确 |
| `user.slot_remaining` | int（`2`） | 直接显示 | ✅ |
| `user.invite_remaining` | int（`1`，管理员也是 1） | `caps` 对 admin 特判 → `∞ / 不限` | ⚠️ **C1** |
| `user.sign` | object \| null（`{sign_index, sign_at, earn_point, continuous_days}`） | `Boolean(sign)` → 今天是否已签 | ✅ 用法正确。注意别把 `/api/sign/check` 的 `is_sign` 当成签到：那是「**是否已登录**」（实测该账号 `is_sign: true` 而 `sign: null` 即今日未签），代码目前没误用 |
| `user.carrot` / `carrot/current.carrot` | int（`38237`） | `formatThousand` | ✅ |
| `carrot/history.items[]` | `trigger_type_string: str`、`point: int`（可为负）、`created_at: ISO8601Z` | `created_at.slice(5,10)`、按 `point` 着色 | ✅ |
| `record/list.items[]` | `media_seconds: int`、`play_seconds: int`（都是**秒**）、`is_complete: bool`、`time: "YYYY-MM-DD HH:mm:ss"`（本地格式） | `play/media` 算进度、按 `is_complete` 过滤 | ✅（实测 220/1247、1337/1494，无 `play > media`） |
| `record/list.items[].video_image_poster` | URL \| null | `<img src>` | ✅ |
| `stats/video/history[]` | `date: "YYYY-MM-DD"`、`video_watch_second_real: int`（秒）、`video_watch_second_content: int`、`todbv_id`（注意不是 `todb_id`） | 按 `date` 聚合 `_real` | ✅ 用对了字段（`_real` = 观看时长；`_content` = 内容时长） |
| `watch.items[].video_count / name / updated_at` | int / str / ISO8601Z | 直接显示、`slice(5,10)` | ✅ |
| 待办三数（seek/order/ban） | 见 A7/B3 | `useTodos` | ⚠️ **B8**（订单数因字符串布尔变成 null 被吞） |

### A2 媒体库（`LibraryView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `video_id` / `todb_id` / `tmdb_id` | int | 显示 | ✅ |
| `video_type` | `"movie" \| "tv"` | 映射中文 | ✅ |
| `video_title` / `video_origin_title` | str / str\|null | 显示 | ✅ |
| `video_date_air` | `"2025-10-10"` \| null | 原样显示 | ✅ |
| `medias_count` / `subtitles_count` / `request_count` | int | 显示 | ✅ |
| `seek_is_request` | bool | 条件渲染 | ✅ |
| `video_image_poster` | URL \| null | `<img>` | ✅ |
| `is_delete` | bool | 详情页徽标 | ✅ |

### A3 影片详情（`VideoDetailView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `seasons[]` | `season_id: int`、`season_title`、`season_number: int`、`has_media: bool` | 切季 tab | ✅（`has_media` 未用） |
| `episodes[]` | `runtime: int` —— **分钟**（实测 48）、`medias_count`、`subtitles_count` | `${ep.runtime} 分` | ✅ 单位正确 |
| `media/list` | **裸数组**（不是 `{medias}`），字段 `media_id/media_name/media_file_size(int 字节)/media_file_second(int 秒)/user_pseudonym/media_status` | `useMediaList` 兼容数组 | ⚠️ **B6**（仅类型声明错） |
| 同上 `media_file_size` | 字节（`102674585528` = 95.6 GB） | `formatSize` | ✅ |
| `subtitle/list[]` | `subtitle_id`、`subtitle_title`、`subtitle_codec`（如 `"mp4"`）、`user_pseudonym`、`created_at` ISO | 四列 + 重命名 | ✅❓（Postman 示例核对，实测该集无字幕） |
| `persons[]` | `image_profile: "kDZ1VRm13V5ROl4E"` —— **文件 id，不是 URL**；`gender: null`；`job: null`；`title: "Self - Host"` | `<img src={person.image_profile}>` | ❌ **B4**；另 `key={person.id}` 而 `id` 为 `null` |
| `video.medias_count` | 整部剧的资源总数（6），但当前集可能 0 | 头部统计 | ⚠️ 语义：头部「资源 6」与列表「这一集还没有资源」并存，用户会以为页面坏了 |

### A4 上传（`UploadView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `store/disk` | `string[]`（`["local_emos_1","local_emos_2"]`） | 下拉选项 | ✅ |
| `store/file[]` | `file_name` / `file_size:int` / `mime_type` | 暂存区表格 | ✅❓（无权限，422「请先申请权限后使用」，仅契约核对） |
| `video/recognize` 成功 | `{file_type, video_id, video_title, video_type, date_air, video_season_id, …, item_type, item_id}` —— **没有 `title`** | `res.item_id`、`res.item_type`、`res.title ?? file.name` | ❌ **B7**（标题永远退回文件名） |
| `video/recognize` 失败 | 422 `{"message":"未找到对应的视频, 请先同步后使用."}` | 显示 message | ✅ |
| `getUploadToken` | `{type, file_id, data:{upload_url}}` | 按 `type` 分流协议 | ✅ |

### A5 求片（`SeekView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| 列表 `seek_carrot` / `count_request` / `status` / `is_can_claim` / `upload_username` / `video_title_display` / `updated_at` | int / int / enum / bool / str\|null / str / ISO | 展示与按钮 | ✅（`seek_carrot == null` 才显示「—」，0 正常显示为 0，判断正确） |
| `seek/query` | `{seek_id(可能 null), status, upload_username, upload_expired_at, is_can_claim, request_count, seek_carrot, updated_at}` | 详情面板读 6 个键 | ✅ |
| `seek/history[]` | `{username, carrot:int, created_at: ISO}` | 投票记录 | ✅ |

### A6 片单（`WatchlistsView` / `WatchlistDetailView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `video_count` / `subscribe_count` / `is_public` / `tags[]` / `updated_at` | int / int / bool / str[] / ISO | 列表列 | ✅ |
| `author` | `{user_id, username, avatar}`（官方片单为 null） | 显示 username | ✅ |
| `user_is_show` / `user_sort` | **`null`**（未订阅时） | `item.user_is_show ? '隐藏' : '显示'` | ✅ 可空已容错 |
| `is_edit_video` / `is_subscribe` / `is_self` | bool | 控制增删 | ✅ |
| `watch/{id}/video` | `page_size` **服务端固定 15**（请求 2/20 都被忽略）、`sort:int`、`remark:str\|null`、`video_is_delete:bool`、`user_username` | 分页用 `data.page_size` | ✅（分页自洽，但「每页条数」不可控） |
| `watch/{id}/music` | `{page,page_size,total,items}` | 同视频分支 | ✅❓（该片单 `total: 0`） |

### A7 商城 / 订单（`ShopView` / `OrdersView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `product.price` / `price_origin` / `stock` / `sales` / `sort` | 全部 int（`4000 / 8000 / 5000 / 10 / 1`） | 直接显示 | ✅（**未标注单位**，见 C5） |
| `product.is_up` | **真布尔** `true` | 上架徽标 | ✅ |
| `product.up_time` / `time_start` / `time_end` | `"YYYY-MM-DD HH:mm:ss"` \| null | `formatDateTime` | ✅ |
| `product.user_buy_max` | `null` | 未使用 | ✅ |
| `seller/base` | `{seller_id:int, name, description, cover_url, status:"pass", is_self:true}` | 状态映射 | ✅（非商户时 `status:"default"`，代码已按 status 判断） |
| `shop/order/shop/order` | `status_pay: "paid" \| "unpaid"`（**没有 `"pay"`**）、`urge_number: int\|null`、`buy_number:int`、`time_delivery: 本地时间\|null`、`price_order:int` | `status_pay === 'pay' \|\| 'paid'` | ✅ 结果正确，`'pay'` 是死分支 |
| 订单筛选 `is_pay` / `is_delivery` | 后端要求**布尔 1/0**，传 `true` → 422 | 传字符串 `'true'`/`'false'` | ❌ **B3** |

### A8 直播 / 线路（`LiveView` / `LinesView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `live/list` | `media_count:int`、`sort:int`、`updated_at:ISO`、`is_can_edit:bool`、`page_size` **固定 15** | 列表列 | ✅ |
| `live/media[].status` | **`"normal"` / `"error"`**（实测 `"normal"`） | `row.status === 'ok'` | ❌ **B2** |
| `live/media[].path_type` | 实测 `"guanfang"`（不止 m3u8） | `.toUpperCase()` | ✅（显示 `GUANFANG`，略怪但有信息） |
| `live/library[]` | `{id:int, title, image_poster_url}` | tab | ✅ |
| `proxy/line[]` | `{id, name, url, tagline, is_self:bool, created_at:ISO}` | 列表 | ✅ |

### A9 音乐（`MusicView` / `SongDetailView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `duration` | int，**秒**（`183`、`713`） | `m:ss` | ✅ |
| `has_media` / `count_medias` / `count_lryics`（后端拼写如此） | bool / int / int | `has_media === false` 打「无资源」 | ✅ 未读 `count_lryics`，无错 |
| `person_artists[]` | `{name, image_profile_url, …}` | `map(a => a.name)` | ✅ |
| `album.count_song` | int | `${count_song} 首` | ✅ |
| 歌手 Tab 图片 | **`image_profile_url`** | `row.image_profile` | ❌ **B5** |
| `music/song/{id}/media[]` | `file_size:int`（字节）、`meta_rate_bit:int`（**bps**，`128000`）、`file_suffix`、`user.username`、`file_duration:int`（秒） | `/1000` 转 kbps | ✅ 单位全部正确 |
| `lyric/list[]` | `{lyric_id:int, type:"lrc", language:"unknown", content, name:null, created_at:ISO, user:{…}}` | 五列 | ✅ |

### A10 回收站（`RecycleView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `media/listAll?only_delete=1` | `media_file_size:int`（字节，`607399770`）、`media_file_second: **null**`、`media_status:"delete"`、`storage_title:"Zn存档服"`、`is_can_restore:**false**`、`deleted_at:**null**` | `is_can_restore !== false` 决定是否显示「恢复」 | ✅ 判断正确；⚠️ 删除时间拿不到（C6） |
| `video/list?only_delete=1` | `is_delete: true`、`video_date_air`、`todb_id` | 影片 tab | ✅ |

### A11 用户 / 账号（`UserDetailView` / `AccountView` / `UserSearchView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `pay/getUserInfo` | `{user_id, username, avatar, is_viewing, invite_user_id, size_upload:int 字节, telegram_user_id, is_disable:bool, created_at:ISO}` | 资料卡 + 上传量 | ✅（`is_disable` 未用，改用封禁列表 → C3） |
| `invite/info` | `{invite_at:"2026-01-17 10:10:10", invite_remaining:1, invite_count:11, parent:{user_id,pseudonym}}` | 名额/已邀请/加入时间 | ⚠️ **C1**；`invite_at` 是「我加入的时间」，不是被邀请人的时间 |
| `invite/history[]` | `{user_id, username, telegram_user_id, invite_at, join_at, last_video_player, last_telegram_message, last_user_sign, invite_remark}` | 邀请时间/最近播放 | ✅ 字段对；⚠️ `invite_at` 与 `join_at` 不同（实测相差 2 天），见 C4 |
| `invite/tree[]` | **扁平数组 3235 条**，字段 `{user_id, username, invite_at, invite_user_id, is_disabled, join_at, …}`，**无 children** | 逐行渲染 + `index>0` 画 chevron | ⚠️ **C2** |
| `ban/list[]` | `{user_id, username, avatar, invite_user_id, invite_pseudonym, invite_at, telegram_user_id, disable_reason, created_at}`，**只含最近 7 天** | 封禁 tab + 用户详情「账号状态」 | ⚠️ **C3** |
| `carrot/history` | `{trigger_type_string, point:int, created_at:ISO, expired_at:"YYYY-MM-DD"}` | 流水表 | ✅ |

### A12 资金 / 快捷话（`FundView` / `WhisperView`）

| 字段 | 响应实际 | 用法 | 结论 |
|---|---|---|---|
| `fund/order/list` | `{activity_code, activity_name, order_no, order_title, tier_name, tier_carrot, tier_price, time_expired, payed_at, payout_status, payout_status_string, payout_price, payout_at}` | `row.no ?? row.order_no`、`row.fund_activity_code ?? row.activity_code`、`tier_carrot`、`payout_status_string`、`payed_at` | ✅ 有 fallback 兜住（`no`/`fund_activity_code`/`remark` 三个字段不存在，`remark` 恒空） |
| `pay/base` | **HTTP 404** + `{"success":false,"message":"emos api 404 :("}` | 404 分支显示「未开通」 | ✅ 分支判断正确 |
| `whisper/sender[]` / `whisper/receiver[]` | sender：`{whisper_id, sender_content, sender_is_anonymous, sender_at, receiver_user:{id,username,avatar}, receiver_content, receiver_at}`；receiver：同结构但换成 `sender_user` | `row.content` / `row.reply_content` / `row.sender_id` / `row.receiver_pseudonym` / `row.created_at` | ❌ **B1** 全部错名 |

---

## B. 确定错误（导致显示错误或崩溃），按严重度

### B1 悄悄话页四个字段名全错 → 列表三项全显示「—」

- **位置**：[`WhisperView.tsx:74`](src/views/WhisperView.tsx#L74)、[`:78`](src/views/WhisperView.tsx#L78)、[`:79`](src/views/WhisperView.tsx#L79)、[`:82`](src/views/WhisperView.tsx#L82)
- **现状**：读 `row.content`（内容）、`row.reply_content`（回复）、`row.sender_pseudonym ?? row.sender_id` / `row.receiver_pseudonym ?? row.receiver_id`（对方）、`row.created_at`（时间）。
- **证据**（Postman `GET /api/whisper/sender` 200）：
  ```json
  [{"whisper_id":1001,"sender_content":"内容","sender_is_anonymous":false,
    "sender_at":"2026-09-23 11:34:44","receiver_user":{"id":"eXD3VPZ3Ys","username":"emos","avatar":null},
    "receiver_content":null,"receiver_at":null}]
  ```
  `GET /api/whisper/receiver` 用 `sender_user`，其余同名。**响应中不存在** `content` / `reply_content` / `sender_id` / `sender_pseudonym` / `receiver_pseudonym` / `created_at`。
- **影响**：收到的/发出的两 Tab，内容、对方、时间三列全部 `—`；「回复」按钮仍可用（`whisper_id` 是对的），但用户看不到要回什么。
- **建议**：`content → sender_content`、`reply_content → receiver_content`、对方 → `sender_user?.username`（收到的）/ `receiver_user?.username`（发出的）、时间 → `sender_at`（收到的用 `sender_at`，发出的用 `sender_at`，回复时间用 `receiver_at`）。

### B2 直播源状态枚举比对错值 → 永不显示「正常」

- **位置**：[`LiveView.tsx:175`](src/views/LiveView.tsx#L175)、[`:177`](src/views/LiveView.tsx#L177)
- **现状**：`row.status === 'ok' ? '正常' : row.status`。
- **证据**：`GET /api/live/media?live_list_id=1101` →
  ```json
  [{"media_id":"g1mj8k6gj7lk","name":"1080P migu","path_type":"guanfang","path_url":"cctv1",
    "status":"normal","pseudonym":"tiger998","is_can_edit":true}]
  ```
  Postman 注明 `status` 只有 `normal`（正常）/ `error`（错误）。
- **影响**：每个源都显示黄色徽标 + 英文 `normal`，健康源看起来像异常；77 个频道巡检时无法一眼分辨。
- **建议**：`row.status === 'normal' ? '正常' : '异常'`，并把 `error` 染红。

### B3 订单筛选 `is_pay` / `is_delivery` 传字符串 → 422（连坐待办角）

- **位置**：[`OrdersView.tsx:20-27`](src/views/OrdersView.tsx#L20)、[`queries.ts:217`](src/api/queries.ts#L217)
- **现状**：`filter: { is_pay: 'true' }` —— 字符串；`buildUrl` 只把 JS `boolean` 转 1/0，字符串原样拼上。
- **证据**：
  ```
  GET /api/shop/order/shop/order?page=1&page_size=2&is_pay=1     → 200 {"total":0,...}
  GET /api/shop/order/shop/order?page=1&page_size=2&is_pay=true  → 422 {"message":"is pay 必须为布尔值。"}
  ```
- **影响**：订单页切「已支付 / 待支付 / 已发货 / 待发货」任一个 Tab 都报错（页面出现红色错误块）；概览「待发货 N 单」因 `useTodos` 的 `safe()` 把 422 吞成 `null`，该卡片**永远不显示**，管理员以为没有待发货。
- **建议**：`filter` 里的值改成布尔 `true/false`，并把 `OrdersSearch` 的 `is_pay?: string` 收紧为 `boolean`。

### B4 影片演职员头像把文件 id 当 URL → 整排坏图

- **位置**：[`VideoDetailView.tsx:353-355`](src/views/VideoDetailView.tsx#L353)、类型 [`types.ts:122`](src/api/types.ts#L122)
- **现状**：`<img src={person.image_profile}>`。
- **证据**：`GET /api/video/persons?video_list_id=13474` →
  ```json
  [{"id":null,"person_id":null,"person_id_tmdb":11147879,"name":"Jesse Burgess",
    "image_profile":"kDZ1VRm13V5ROl4E","job":null,"title":"Self - Host"}]
  ```
  对照音乐侧 `GET /api/music/person/list` → `"image_profile_url":"https://image.theotherdb.org/original/1XaJpKvpxE4z3lx9"`。可见 `image_profile` 是**文件 id**，需要拼 `https://image.theotherdb.org/original/{id}`。
- **影响**：演职员一栏 8 个头像全部加载失败（裂图），页面观感崩坏；且 `key={person.id}` 的 `id` 为 `null`，React 会告警重复 key。
- **建议**：`src = image_profile ? \`https://image.theotherdb.org/original/${image_profile}\` : null`，`key` 改用 `person.person_id_tmdb ?? person.name`。

### B5 音乐歌手 Tab 读不存在的 `image_profile` → 永远没有头像

- **位置**：[`MusicView.tsx:118-119`](src/views/MusicView.tsx#L118)、类型 [`types.ts:408`](src/api/types.ts#L408)
- **现状**：`row.image_poster_url || row.image_profile`；`MusicPersonItem` 也只声明了 `image_profile`。
- **证据**：`GET /api/music/person/list?page=1&page_size=2` →
  ```json
  [{"person_id":1002,"name":"泰勒·斯威夫特","image_profile_url":"https://image.theotherdb.org/original/1XaJpKvpxE4z3lx9","image_backdrop_url":null}]
  ```
  （歌曲/专辑内嵌的 `person_artists[].image_profile_url` 同名。）
- **影响**：歌手 Tab 每行都退回「首字方块」，看起来像缺数据。
- **建议**：改读 `row.image_profile_url`，并在类型里补该字段（`image_profile` 删掉）。

### B6 `mediaApi.list` 返回类型声明错误（裸数组 vs `{medias}`）

- **位置**：[`endpoints.ts:96-97`](src/api/endpoints.ts#L96)、[`queries.ts`](src/api/queries.ts) 的 `useMediaList`
- **现状**：声明 `request<{ medias?: VideoMedia[] }>`，实际响应是 `[{...}]`。
- **证据**：`GET /api/video/media/list?video_list_id=6737` → `[{"season_id":null,"media_id":"2xeow77lpv49","media_file_size":102674585528,...}]`
- **影响**：运行时被 `useMediaList` 的三路兼容（array / items / data）兜住了，不会崩；但类型骗人 —— 以后谁直接用 `mediaApi.list()` 就会拿到 `undefined`。
- **建议**：改成 `request<VideoMedia[]>`，删掉那层兼容分支。

### B7 上传识别标题字段不存在 → 队列永远显示文件名

- **位置**：[`UploadView.tsx:69`](src/views/UploadView.tsx#L69)
- **现状**：`title: String(res.title ?? item.file.name)`。
- **证据**：Postman `GET /api/upload/video/recognize` 200 示例：
  ```json
  {"video_id":1002,"video_title":"21世纪大君夫人","video_type":"tv",
   "video_season_id":1001,"video_episode_id":1034,"item_type":"ve","item_id":1034}
  ```
  没有 `title` 字段（实测 422 只回 `message`，无法取 200 实物）。
- **影响**：识别成功后「目标」列显示 `xxx.mkv` 而不是「21世纪大君夫人 S01E02」，用户无法确认挂对了没有。
- **建议**：`res.video_title` + 季集号（`video_season_number` / `video_episode_number`）。

### B8 概览「待发货」角标被 422 吞掉（B3 的连坐）

- **位置**：[`queries.ts:203-224`](src/api/queries.ts#L203)
- **现状**：`safe(() => shopApi.ordersShop({ is_pay: 'true', is_delivery: 'false' }))` → 422 → 返回 `null`；`OverviewView` 用 `(item.value ?? 0) > 0` 过滤，null 项直接不渲染。
- **影响**：待办区少一格且没有任何提示；配合 B3 修好即消失。
- **建议**：与 B3 同修；`safe()` 建议在 dev 环境 `console.warn`，否则这类错误永远静默。

---

## C. 字段存在但语义被误读

### C1 `invite_remaining`：管理员被特判成 ∞，而 API 说的是 1

- **位置**：[`queries.ts:53-76`](src/api/queries.ts#L53)（`inviteRemaining: isAdmin ? null : …`）、[`AccountView.tsx:258-263`](src/views/AccountView.tsx#L258)
- **现状**：`caps.inviteRemaining === null` → 显示「∞ / 不限名额 / 管理员不限名额」。
- **证据**：`GET /api/user` → `"roles":["admin"], "invite_remaining": 1`；`GET /api/invite/info` → `{"invite_remaining":1,"invite_count":11}`。两个端点对同一管理员都给 **1**。
- **影响**：管理员以为可以无限邀请；实际发第二次邀请可能被拒（`POST /api/invite` 422「名额不足」），或与后端规则相反时给出错误承诺。
- **建议**：先确认后端是否对 admin 豁免；若不豁免，直接显示 `invite_remaining`（1），仅在真的返回 `null`/缺省时才显示「不限」。

### C2 「邀请关系」是扁平数组，却被画成带层级的树

- **位置**：[`AccountView.tsx:342-360`](src/views/AccountView.tsx#L342)
- **现状**：`tree.data.map((node, index) => … index > 0 ? <IconChevron/> : null)` —— 除了第一条都画一个「›」。
- **证据**：`GET /api/invite/tree` → 长度 **3235** 的一维数组，字段只有 `{user_id, username, invite_at, invite_user_id, is_disabled, join_at, …}`，**没有任何 children/嵌套**。
- **影响**：视觉上暗示「层级关系」，实际是全站邀请关系的平铺列表（3 千行同时渲染，也拖慢首屏）；用户会误以为第 2 行是第 1 行的下级。
- **建议**：按 `invite_user_id` 客户端组树（或直接改成「我的下级」表格 + 分页），去掉 chevron；3235 行务必分页/虚拟化。

### C3 「账号状态」用最近 7 天的封禁列表推导 → 老封禁显示「正常」

- **位置**：[`UserDetailView.tsx:90`](src/views/UserDetailView.tsx#L90)、[`:17`](src/views/UserDetailView.tsx#L17)
- **现状**：`banned = bans.find(...)`，找不到就显示「不在封禁名单里 / 正常」。
- **证据**：Postman `GET /api/ban/list` 描述：**「只显示最近一周的数据 如果不在此列表 可直接调用解封接口解封」**，示例只含近 7 天记录。
- **影响**：8 天前被封的用户，用户详情显示「正常」，并露出「封禁」按钮（点了可能报「已封禁」）；客服据此判断会出错。
- **建议**：文案改成「近 7 天无封禁记录」；封禁状态若需要真值，优先看 `pay/getUserInfo` 的 `is_disable`（该字段存在，目前没用）。

### C4 「邀请时间」与「加入时间」是两个不同字段，容易被当成同一件事

- **位置**：[`AccountView.tsx:310`](src/views/AccountView.tsx#L310)（列头「邀请时间」← `row.invite_at`）、[`UserDetailView.tsx:113`](src/views/UserDetailView.tsx#L113)（「加入于」← `join_at`）
- **证据**：`GET /api/invite/history` →
  ```json
  [{"user_id":"e53P8QK3Vs","invite_at":"2026-05-29 13:13:52","join_at":"2026-05-27 12:25:20"}]
  ```
  实测 `invite_at` 比 `join_at` **晚 2 天**（邀请动作发生在加入之后）。
- **影响**：单独看「邀请时间」会误判先后顺序；两处用词也不统一（邀请时间 / 加入于）。
- **建议**：统一成「加入时间（join_at）」+「邀请操作时间（invite_at）」两个明确列头，或只显示 `join_at`。

### C5 商品价格没有任何单位

- **位置**：[`ShopView.tsx`](src/views/ShopView.tsx) 价格列
- **证据**：`GET /api/shop/product/list?...&is_up=1` → `"price":4000,"price_origin":8000`；wiki `/api/shop` 说明商城「用萝卜进行易物」。
- **影响**：后台显示 `4000`，管理员无法确定是「4000 胡萝卜」还是「40.00 元」（同一站点支付页用的是萝卜）。
- **建议**：列头写「价格（胡萝卜）」，或直接显示 `4000 🥕`。

### C6 回收站拿不到「删除时间」

- **位置**：[`RecycleView.tsx:148`](src/views/RecycleView.tsx#L148) 列头「删除时间」、[`:170`](src/views/RecycleView.tsx#L170) 实际渲染 `row.created_at`
- **证据**：`GET /api/video/media/listAll?only_delete=1` → `"media_status":"delete","deleted_at":null,"created_at":"2026-01-19T10:39:35.000Z"`
- **影响**：列头写「删除时间」，显示的却是上传时间（相差可能一年），恢复时判断「刚删的还是老删的」会错。
- **建议**：列头改「入库时间」，或等后端回填 `deleted_at`（该字段存在但为 null）。

---

## D. 复核 lead 的可疑清单

| lead 的怀疑 | 结论 | 证据 |
|---|---|---|
| `formatSize` 假设字节 | ✅ **正确** | `size_upload: 32360996899468` → 29.4 TB；`media_file_size: 102674585528` → 95.6 GB；`file_size: 3984028` → 3.8 MB，三处量级都对 |
| `video_watch_second_real` / `media_seconds` 用于继续观看百分比 | ✅ **正确** | `record/list` 同时给 `media_seconds:1247` 与 `play_seconds:220`（都是秒，17.6%）；`stats` 的 `video_watch_second_real:76` 也是秒；两处没混用（进度用 record，统计用 stats） |
| `size_upload` 概览显示 29 TB | ✅ **正确** | 同上，字节 → 29.4 TB |
| `slot_remaining` / `invite_remaining`（admin ∞ 特判） | `slot_remaining` ✅（int 2）；`invite_remaining` ❌ **语义误读**（见 C1） | `/api/user` 与 `/api/invite/info` 对 admin 都返回 1 |
| `subtitle_codec` / lyric 相关字段 | ✅ **正确** | `subtitle_codec:"mp4"`、`subtitle_title`、`user_pseudonym`、`created_at` 均在；lyric 的 `type/language/content/name/created_at/user` 均在 |
| `watch.video_count`、`product.stock/price` | ✅ **正确** | `video_count:318`；`stock:5000`、`price:4000`（均为 int，但价格缺单位 → C5） |
| 回收站 `media_file_size`、`is_can_restore` | ✅ **正确** | `media_file_size:607399770`（字节）、`is_can_restore:false`（真布尔），代码用 `!== false` 判断，符合 Postman「只可恢复 is_can_restore 为 true 的」 |
| 订单 `is_pay`/`is_delivery` 真实类型 | ❌ **字符串导致 422**（见 B3） | `is_pay=1` → 200；`is_pay=true` → 422「is pay 必须为布尔值」 |

---

## 附：未能取到实物的字段（只做了契约核对）

| 端点 | 原因 | 影响的表格行 |
|---|---|---|
| `/api/video/subtitle/list` | 抽样的 3 部影片/剧集都没有字幕（返回 `[]`） | A3 字幕四列（Postman 示例字段名一致，判 ✅❓） |
| `/api/shop/order/shop/order` | 该账号不是消费者，订单为 0 条（仅请求参数可验） | A7 订单列（用 Postman 示例核对） |
| `/api/shop/category/list` | 需要 `seller_id`，不带参数直接 422「seller id 不能为空」 | 商城分类（代码已带 seller_id） |
| `/api/upload/store/file` | 422「请先申请权限后使用」 | A4 暂存区 |
| `/api/upload/video/recognize` 成功分支 | 文件名不在库，只拿到 422 | B7 依据 Postman 200 示例 |
| `/api/pay/getUserInfo`、`/api/whisper/*` | 请求超时 / 该账号无数据 | A11/A12 用 Postman 示例核对 |
| `/api/user/stats/video/history` 含「今天」 | 该接口对含今天日期的请求多次超时（历史日期正常返回），无法判断是「慢」还是「拒绝」 | 建议前端按 Postman 描述「只可查今天之前的数据」先把今天剔掉 |

---

*本轮只审返回字段的读取正确性；请求参数契约见 `docs/review/api-round3.md`，信息架构见 `docs/review/function-round2.md`。*
