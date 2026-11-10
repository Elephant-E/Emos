# 内容域 API 核对（watch / seek / live / line / music / record）

> 审查对象：`src/api/endpoints.ts` 中内容域端点（watch / seek / live / line / music / record / rank）
> 分支 `rewrite/v2`；**只读审查，未改动 `src/`**
> 对照：`api.postman_collection.json`（下称「契约」）、`src/api/queries.ts`、`src/views/*.tsx`

## 0. 取证方式

| 项 | 说明 |
|---|---|
| 真实接口 | `BASE=https://emos.best`，`Authorization: Bearer <token>`（已脱敏） |
| 时间 | 2026-11-07 20:32–20:44 CST |
| 标记 | **`[实测]`** = 发过真实请求并拿到响应；**`[代码]`** = 仅读代码/契约推断 |
| 慢与 504 | 共 13 次请求耗时 >10s（最长 60s 超时）；2 次 `HTTP 000`（60s 超时）与 2 次瞬时连接失败，均按「重试两次」后成功。`/api/watch?type=music`、`/api/proxy/line?only_self=1` 首次均超时 |
| 写入型探针 | 为验证「传了会不会存」，实际创建并**已全部删除/还原**：片单 `10438`、`10439`（DELETE 204 ✓）、直播频道 `10043`、`10044`（DELETE 204 ✓）、直播源 `lg3jdm2zjrvk`（DELETE ✓）、歌曲 `1288279` 的收藏状态（ms 开→mp 无效→ms 关，已回到 `false`）、`mp/ms` 999999999 的收藏与评分（已还原为 false / null） |
| 收尾核对 | `GET /api/watch?name=审查测试` → `total:0`；`GET /api/live/list?title=审查测试*` → `total:0` |

**快照说明**：下文的文件行号对应 commit `8d21eb6` 的 `src/`。评审期间有其他轨道**并行改动**工作区（`WatchlistsView.tsx` 新增「萝卜门槛」徽标与「订阅所需胡萝卜」输入；另有 `ShopView.tsx`、`api/client.ts`、`api/queries.ts` 的改动），因此：
- **P2-03 的 `point` 部分、P2-08 的「门槛列」部分已在工作区修复**，其余结论不受影响；
- 被并行改动的文件，其行号可能上下漂移几行，定位时以符号名（`watchApi.createOrUpdate`、`useWatchVideos`、`Pager` 等）为准。

## 1. 总表

### 1.1 `watchApi`（片单，14 个方法）

| 端点 | 请求字段（契约 → 前端） | 响应字段（用了 / 漏了） | UI 入口 | 结论 |
|---|---|---|---|---|
| `GET /api/watch` | 契约：`watch_id` `type` `name` `author_id` `author_username` `is_public` `is_self` `is_subscribe`。前端：`watch_id` `type` `is_self` `is_subscribe` `page` `page_size`。**未用** `name` `author_id` `author_username` `is_public` | 用：`id` `type` `name` `description` `tags` `is_public` `carrot` `image_poster_url` `is_self` `is_edit_video` `is_subscribe` `user_is_show` `author.username` `video_count` `subscribe_count` `updated_at`。漏：`subscribe_id` `maintainers` `image_poster` `user_sort` `is_show_empty` | 片单页（`WatchlistsView`）+ 详情页 meta（`useWatch`，`queries.ts:206`） | **可用**。缺「按名称/作者搜索」与「只看公开」；`carrot`（订阅门槛）原只在详情页展示（**并行轨道已在列表补徽标**） |
| `POST /api/watch` | 契约 9 字段：`id` `type` `name` `description` `is_public` `point` `tags` `is_show_empty` `image_poster_url`。前端传 7：`type` `name` `description` `is_public` `point`(原恒 0，**已由并行轨道补输入**) `tags` `is_show_empty`(仍恒 true)。**漏** `id`（新建可省）与 `image_poster_url` | 用：无（`{watch_id,count}` 都丢弃）。`count` 语义不明（实测返回 9），前端未用 | 片单页「新建片单」 | **有问题**：见 §2.1、P2-01~03。且**只能新建，不能改**（`id` 从不传，无编辑入口） |
| `DELETE /api/watch/{id}` | 无 body | 204 空体 | 列表页「删除」（仅 `is_self`） | **正确** |
| `POST /api/watch/slot` | 无参数 | `{slot_remaining}` | 账号页「用胡萝卜兑换片单槽位」（`AccountView.tsx:289-306`） | **正确**（会扣胡萝卜，未实测） |
| `PUT /api/watch/{id}/sort` | `sort`（query） | 空体 | **无入口**：`useWatchMutations.sort`（`queries.ts:640`）定义了但没被解构使用 | 能力缺口：已订阅片单不能排序 |
| `PUT /api/watch/{id}/show` | 无参数 | `{is_show}`（前端类型写 `{is_show:boolean}` ✓） | 详情页「隐藏/显示」（`is_self`） | **正确**；注意读的是 `user_is_show`，写接口回 `is_show`，命名不一致但靠 refetch 兜住 |
| `PUT /api/watch/{id}/subscribe` | `sort`（可选，订阅时生效） | `{is_subscribe}` | 详情页「订阅/取消订阅」 | **可用但漏参**：`queries.ts:637` 不传 `sort`，订阅后排序恒由后端默认 |
| `PUT /api/watch/{id}/dynamic` | body `{url}`（空则关闭） | 契约三种形态：`{url}` / `{url,spider:{count_sync,count_no_data}}` / `{error}`。前端类型只声明 `{url}` | 详情页「动态抓取」弹窗（`WatchlistDetailView.tsx:281-312`） | **可用但吞信息**：抓取条数、`{error}` 错误态都没展示 |
| `GET /api/watch/{id}/video` | 契约：`video_title`。前端额外传 `page` `page_size` | 用：`video_id` `video_title` `video_origin_title` `video_date_air` `video_image_poster` `video_type` `sort` `remark`。漏：`todb_id` `tmdb_id` `genres` `video_is_adult` `video_is_delete` `user_id` `user_username` `user_avatar` `updated_at` | 详情页影片表 | **分页有 bug**：`page_size` 被后端固定为 15，前端 Pager 按 20 算 → 尾部内容不可达（P1-01） |
| `GET /api/watch/{id}/video/search` | 契约：`title` `type`；前端只传 `title` | 用：`video_id` `video_title` `video_type` `video_date_air` `video_image_poster`。漏：`todbv_id` `video_origin_title`（同名片要靠原名区分） | 详情页「添加影片」弹窗 | **可用**：无法按类型过滤，同名片难辨 |
| `POST /api/watch/{id}/video/{videoId}` | body `{sort, remark}`；前端固定 `sort=80`、`remark=null` | `{count}` 丢弃 | 添加影片 | **漏能力**：契约的「排序 1-5000 / 备注 100 字」完全没有输入 |
| `DELETE /api/watch/{id}/video/{videoId}` | 无 | `{count}` 丢弃 | 行内「移出」 | **正确** |
| `GET /api/watch/{id}/music` | 契约：`song_title`；前端额外传 `page` `page_size` | 用：`song_id` `name` `description` `duration` `count_medias`(契约无此字段)。漏：`person_artists` `albums` `rating` `sort` `remark` `image_poster_url` `tagline` `todb_music_music_id` | 音乐片单详情（`WatchlistDetailView.tsx:318-445`） | **有 bug**：见 P2-05（`count_medias` 不存在，列恒 0） |
| `DELETE /api/watch/{id}/music/{songId}` | 无 | `{count}` 丢弃 | 行内「移除」 | **正确**；但**没有「加歌」入口**（P1-03） |

### 1.2 `seekApi`（求片）

| 端点 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|
| `POST /api/seek` | 契约：`video_type` `sort_by` `sort_order` `status` `upload_self` `video_title` `with_user`。前端：`sort_by`(默认 `updated_at`) `sort_order`(默认 `desc`) `status` `page` `page_size`。**未用** `video_type` `upload_self` `video_title` `with_user` | 用：`id` `status` `video_type` `video_title_display` `video_image_poster` `count_request` `seek_carrot` `updated_at` `upload_username` `is_can_claim`。漏：`upload_expired_at` `tmdb_url` `item_id` `video_list_id` `video_season_*` `video_episode_*` `video_image_logo` `video_image_backdrop` `users[]` | 求片页 | **必填项正确**（实测缺 `sort_by`→422、缺 `sort_order`→422）；**筛选全缺**（2.4 万条只能按状态翻页，P2-06） |
| `GET /api/seek/query` | `seek_id` | 用：`status` `upload_username` `request_count` `seek_carrot` `updated_at` `upload_expired_at`；`seek_id` 实测返回 `null`（前端用列表 id，无影响） | 求片页「详情」弹窗 | **正确** |
| `GET /api/seek/history` | `seek_id`（契约另有 `video_list_id`/`video_season_id`/`video_episode_id`，「必须传一个」） | 用：`username` `carrot` `created_at`；漏 `avatar` | 详情弹窗「投票记录」 | **正确** |
| `PUT /api/seek/claim` | body `{seek_id, type:'confirm'\|'cancel'}` | `{status}` 丢弃（靠 invalidate 刷新） | 行内「认领」/详情「撤回认领」 | **正确**（非存在 id → 404，实测） |
| `PUT /api/seek/urge` | body `{seek_id, carrot}`（1–5000） | `{seek_carrot}` 未取用 | 行内「催片」弹窗 | **正确但无前置校验**：输入框只有 `min/max`，手输 0 直接 422（实测「carrot 必须大于等于 1」） |
| `GET /api/seek/poll` | `last_id` `page_size` | 数组（`id`…`updated_at`） | **无入口** | 未接；`endpoints.ext.ts:69` 有 typed 包装但无人调用（§2.3） |
| `PUT /api/seek/apply` | `item_type` `item_id`（query） | `{seek_is_request}` | **无入口** | 未接；`endpoints.ext.ts:70` 同上（§2.3） |

### 1.3 `liveApi`（直播，8 个方法）

| 端点 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|
| `GET /api/live/list` | 契约：`library_id` `code` `title`；前端：`library_id` `page` `page_size`(10，被忽略)。**未用** `code` `title` | 用：`id` `live_library_id` `title` `tagline` `image_poster_url` `sort` `is_can_edit` `media_count` `updated_at`。漏：`code`（官方源标识）`description` | 直播页 | **可用**：无搜索；`page_size` 恒 15（P2-04） |
| `POST /api/live/list` | 契约：`id` `live_library_id` `title` `description` `tagline` `image_poster`；前端：`live_library_id` `title` `code` `description`。**多传** `code`（后端忽略，实测）**漏** `tagline` `image_poster` `id` | `{count}` 丢弃 | 直播页「新增频道」 | **有问题**：`code` 是死字段（P2-02）；无编辑入口 |
| `DELETE /api/live/list/{id}` | 无 | 204 | 行内「删除」（`is_can_edit`） | **正确** |
| `GET /api/live/media` | 契约：`live_list_id`；前端额外 `page:1, page_size:50` | 用：`media_id` `name` `path_type` `path_url` `status` `is_can_edit`。漏：`pseudonym`（源提供者）`created_at` | 展开行「直播源」 | **只显示前 15 条**且无分页（P2-04） |
| `POST /api/live/media` | body `{live_list_id, name, path_type, path_url}`（一致） | `{live_media_id, carrot}` 丢弃 | 「新增源」弹窗 | **枚举错**：`path_type` 选 flv/mp4 → 422（P1-05） |
| `DELETE /api/live/media/{media_id}` | 无 | `{carrot}` | 行内「删除」 | **正确** |
| `POST /api/live/media/update` | body `{live_list_id, medias[]}`（一致） | `{delete_count}` | **无入口**（外部接口语义：整体替换/清空自己的源） | 未接，可接受 |
| `GET /api/live/library` | 无 | 全用（`id` `title` `image_poster_url`） | 媒体库 tab | **正确** |

### 1.4 `lineApi`（线路）

| 端点 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|
| `GET /api/proxy/line` | `only_self`（前端从不传） | 全用：`id` `name` `url` `tagline` `is_self` `created_at` | 线路页 | **正确**；实测 `only_self=1` 后端**不生效**（仍返回 47 条含 `is_self:false`），前端反正不用 |
| `POST /api/proxy/line` | body `{name, url, tagline}`（一致） | `{id}` | 「新增线路」 | **正确**；实测 `tagline` 其实**必填**（缺省 422），契约未标注，前端恰好也必填 |
| `DELETE /api/proxy/line?id=` | `id`（query） | 空体 | 行内「删除」（`is_self`） | **正确** |

### 1.5 `musicApi`（音乐，9 个方法）

| 端点 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|
| `GET /api/music/person/list` | 契约：`person_id` `name`；前端：`name` `page` `page_size` | 用：`person_id` `name` `original_name` `tagline` `image_profile_url`。漏：`biography` `birthday` `gender` `birthplace` `is_virtual` `is_adult` `image_backdrop_url` | 音乐页「歌手」tab | **可用**：无详情页，`biography`/`birthday` 等整块没展示 |
| `GET /api/music/song/list` | 契约：`song_id` `name` `has_media` `is_favorite` `is_rating` `album_id` `person_id_artist` `person_name_artist` `is_headless`。前端：`name`（列表）/`song_id`（详情）+ `page/page_size`，参数类型是 `Record<string, unknown>`（无编译期保护） | 用：`name` `image_poster_url` `tagline` `duration` `person_artists[].name` `has_media`。漏：`is_favorite` `rating` `rating_user` `count_medias` `count_lryics` `albums` `release_date` `is_adult` `video_list_id` `todb_music_song_id` | 音乐页「歌曲」tab + 歌曲详情 | **可用但筛选项全缺**（52 万首，P2-07）；`has_media` 只用来看「无资源」，`count_lryics`/`count_medias` 未用 |
| `GET /api/music/album/list` | 契约：`album_id` `name` `has_media` `is_favorite` `is_rating` `person_id_artist` `person_name_artist`；前端只 `name` | 用：`name` `person_artists` `release_date` `image_poster_url` `count_song` `tagline`。漏：`is_favorite` `rating` `has_media` `description` `release_company` `image_background_url` `video_list_id` `type` | 音乐页「专辑」tab | **可用但无详情页、无筛选** |
| `PUT /api/music/favorite` | `type` `value`（query） | `{is_favorite}` 丢弃 | 歌曲详情「收藏」按钮 | **type 错**：歌曲应为 `ms`，前端传 `mp`（P1-02，已实测） |
| `PUT /api/music/rating` | `type` `value` `rating`（5 分制，null 删除） | `{rating}` | **无入口**（`useMusicMutations.rating` 是死代码） | 未接 |
| `PATCH /api/music/sync` | `type` `value` | `{type, value}` | 歌曲行「⋯ → 同步」 | **type 疑似错**（同 `mp/ms` 问题，无法实测区分）；专辑/歌手 tab 没有同步入口 |
| `GET /api/music/song/{id}/lyric/list` | 无 | 用：`type` `language` `name` `created_at` `content`。漏 `lyric_id` `user` | 详情「歌词」tab | **只读**：无新建/删除（`endpoints.ext.ts:97-98` 有，未接） |
| `GET /api/music/song/{id}/media/list` | 无 | 用：`media_id` `name` `file_suffix` `file_size` `meta_rate_bit` `user.username`。漏：`file_quality` `file_duration` `is_primary` `file_metadata.album/title/artist` `file_type` `file_hash` `path_type` `created_at` | 详情「资源」tab | **只读**：无播放/删除/移动/设主源（ext 有，未接）；`file_quality`（lossless）这类关键信息没展示 |
| `DELETE /api/music/song/{id}/delete` | 无 | `{carrot}` | 详情「删除」 | **正确**（无二次说明删除粒度，文案已提「资源不会立即清除」） |

### 1.6 `recordApi` / `rankApi`

| 端点 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|
| `GET /api/video/record/list` | `page` `page_size`（契约连参数都没写，实测支持） | 用：`video_title` `video_id` `video_image_poster` `season_number` `episode_number` `play_seconds` `media_seconds` `is_complete`。漏：`media_id` `media_name`（哪个版本）`play_ua` `time`（上次观看时间） | 首页「继续观看」 | **够用**；建议补 `time` 与 `media_name` |
| `/api/rank/*`（5 个） | — | — | **`endpoints.ts` 无 `rankApi`，UI 无入口** | 未接入（`[代码]`：`mock.ts:221-223` 还在给假数据） |

## 2. 重点疑点逐条判定

### 2.1 新建片单 `POST /api/watch`（用户点名的疑点）

**必填顺序（实测，逐个剥离）**：
`type` → `name` → `is_public` → `is_show_empty`；`point` / `tags` / `description` / `image_poster_url` / `id` 均可选。

| 探针 | 结果 |
|---|---|
| `{}` | 422 `type 不能为空。` |
| `{type:'video'}` | 422 `name 不能为空。` |
| `{type,name}` | 422 `is public 不能为空。` |
| `{type,name,is_public}` | 422 `is show empty 不能为空。` |
| 7 字段（无 `point`） | 200 `{watch_id:10439,count:9}`，回读 `carrot:0`、`tags:null` |
| 全 9 字段（`point:5`、`is_show_empty:false`、带 `image_poster_url`） | 200 `{watch_id:10438,count:9}`，回读 **`carrot:5`、`is_show_empty:false`、`image_poster_url` 原样存下** |

结论：
1. **缺 `id` 不是问题**（新建传 `null` 或不传都行；但代价是「编辑已有片单」这条能力整体缺失，见 P2-01）。
2. **缺 `image_poster_url` 是问题**：后端会**原样持久化**并回显，前端不传 → 自建片单**永远没有封面**，列表/详情只能显示首字占位块。
3. **`point` 恒 0 是问题**：写入字段叫 `point`、读取字段叫 `carrot`（实测 5 → `carrot:5`），前端表单里原连输入框都没有（**评审期间已由并行轨道补上**），此前等于「订阅门槛」这个产品能力对后台完全不可用；而详情页 `WatchlistDetailView.tsx:106` 又确实按 `carrot>0` 渲染「订阅需 X 胡萝卜」——展示端已就绪、创建端缺失。
4. **`is_show_empty` 恒 true 是「可接受但不完整」**：它确实是必填（无法省略），但实测可存 `false`，所以「用户不可选」属于能力缺失而非契约限制。
5. 额外发现：不传 `tags` 时后端返回 **`null`**（不是 `[]`），而前端 `types.ts:163` 声明为 `string[]` 并直接 `.length` / `.map` —— 见 P1-04。

### 2.2 片单 `maintainers` 前端用了吗

**没有。** `[代码]` `maintainers` 只出现在 `types.ts:174` 与 `mock.ts`；`WatchlistsView` / `WatchlistDetailView` 均未读取。`[实测]` 真实数据里确实有维护者（如片单 `10210`、`1039` 各带 1 个维护者），但后台无从看到「谁能编辑这个片单」，维护者管理 API（`endpoints.ext.ts:53` `PUT /api/watch/{id}/maintainer`）也没有入口。→ P3-01。

### 2.3 `seekApi.poll` / `apply` 该不该接

- **`poll`**（`GET /api/seek/poll?last_id&page_size`，只返回未认领）：`[实测]` 可用，返回数组（`id`、`video_title_display`、`updated_at`…）。当前求片页用 `refetchInterval: 30_000` 全量重查 `POST /api/seek`（`queries.ts:182`），该接口 `total` 已达 **23,999**，而轮询每次都拉当前页 + 重新排序，成本与闪烁都更高。**建议接**：用 `last_id` 做增量提示（「有 N 条新求片」角标），列表本身保留手动/低频刷新。优先级 P3。
- **`apply`**（`PUT /api/seek/apply?item_type&item_id`，求片/取消求片）：`[实测]` 未调用，但契约返回 `{seek_is_request}`。后台是管理端，**用户侧求片不该由后台代劳**；不过视频详情页（`VideoDetailView.tsx:152` 已展示「N 人求片」）加一个「加入/取消求片」快捷操作成本极低、运营常用。**建议按需接**，不是缺陷。优先级 P3。

### 2.4 直播源状态枚举（normal / error）

`[实测]` 真实数据 `status` 全部为 `normal`；契约明确只有 `normal` 与 `error`。前端 `LiveView.tsx:98-101`：

```
badge--ok / 正常  ←  normal
badge--warn / 异常 ←  error
其余            → 原样字符串
```

**判断：正确**，且对未知值有兜底，不需要改。唯一遗漏是 `error` 时没有「为什么错／怎么修」的提示（可接受）。

### 2.5 音乐 `person_artists` / `count_medias` 等字段

- `person_artists`：**用了**，但只在歌曲/专辑列表的「艺人」列（`MusicView.tsx:117` 取 `name` 拼接）。**漏掉**：`person_id`（点不进去，没有歌手详情）、`image_profile_url`（行内头像）、`original_name`（外文名，列表同名片无区分）。歌手 tab 反而用 `original_name` 填「艺人」列（`MusicView.tsx:137`）——语义上比名称重复合理，但与歌曲 tab 不同源。
- `count_medias` / `count_lryics`：`[实测]` 只有 `/api/music/song/list` 返回这两个字段；`/api/music/song/{id}/media/list` 不返回 `count_medias`。前端**唯一使用处**是音乐片单里的「收藏」列（`WatchlistDetailView.tsx:409`），而 `GET /api/watch/{id}/music` 的响应（契约明确）**没有** `count_medias` 字段 → 该列恒为 `0`，表头语义也错（见 P2-05）。
- 顺带：`is_favorite` / `rating` / `rating_user` 一律未用，导致「谁收藏了、几分」在后台完全不可见。

## 3. 问题清单（按严重度）

### P1

**P1-01 片单影片分页与后端实际页长不一致，尾部内容点不到**
`src/views/WatchlistDetailView.tsx:233`（`<Pager total={videos.data.total} page={search.page} pageSize={search.page_size}>`，且无 `onPageSize`）+ `src/router.tsx:359`（`page_size` 强制 20）+ `src/api/queries.ts:211-216`。
`[实测]` `GET /api/watch/10005/video?page=1&page_size=1` / `=2` / `=20` 一律返回 **15 条**且 `page_size:15`；`page=2` 的 `sort` 从 16 开始（偏移按 15 算）。即 `page_size` 参数被后端忽略、固定 15。
后果：以「高分电影」为例 `total=5000`，Pager 按 20 算出 250 页，而真实需要 334 页 → **最后约 1250 部影片在 UI 上永远翻不到**；「每页条数」下拉也没接（`onPageSize` 缺失）。
修复：`pageSize={videos.data.page_size}`（用后端回显的 15），或把 `page_size` 需求提给后端；同时补 `onPageSize` 或直接删掉 search 里的 `page_size`。

**P1-02 歌曲收藏用错 `item_type`：`mp`（歌手）当成了歌曲**
`src/views/SongDetailView.tsx:35-37`（`actions.favorite.mutate({ type: 'mp', value: songId })`）。契约「音乐相关」目录说明：`mp` 人员(歌手) / `ms` 音乐(歌曲) / `ma` 专辑。
`[实测]` 对歌曲 `1288279`：`type=ms` → 该歌曲 `is_favorite:true`；随后 `type=mp`（同 id）→ 歌曲 `is_favorite` **不变**（收藏打到了 id 相同的歌手身上）；再 `type=ms` → 回到 `false`。`type=xx` → 422「已选的属性 type 无效」。
后果：点「收藏」永远收藏不到这首歌，且会污染同 id 歌手的收藏关系。
修复：改成 `type: 'ms'`；同时把 `mp/ms/ma` 收敛成 `type MusicItemType = 'mp' | 'ms' | 'ma'`（现在 `type: string`，编译器完全兜不住）。

**P1-03 歌单只能减不能加（音乐片单功能不闭环）**
`src/api/endpoints.ts:115-117` 只有 `music` / `removeMusic`；`endpoints.ext.ts:62-65` 有 `searchMusic` + `addMusic` 但**无人 import**（全仓 `clientApi` 零引用）。
后果：音乐片单里不能添加歌曲，只能一首首删；页头提示「在音乐页把喜欢的歌加进来」（`WatchlistDetailView.tsx:371`）——而音乐页根本没有「加入歌单」入口。这是**双向断链**。
修复：`watchApi` 补 `searchMusic` / `addMusic`（把 ext 里的两个方法搬进 `endpoints.ts`），详情页音乐分支加「添加歌曲」弹窗；或在音乐行加「加入片单」。

**P1-04 `tags` 可能是 `null`，列表页会直接崩**
`[实测]` 不传 `tags` 创建的片单回读 `"tags":null`；`[代码]` `src/views/WatchlistsView.tsx:149`（`watch.tags.length ? ...`）与 `src/views/WatchlistDetailView.tsx:101`（`item.tags.map(...)`）都直接当数组用；`types.ts:163` 声明 `tags: string[]` 掩盖了这一点。
后果：只要有人（客户端/API/旧数据）建了无标签的公开片单，后台片单列表整页白屏。
修复：渲染处 `watch.tags ?? []`，并把类型改成 `tags: string[] | null` 逼出所有调用点。

**P1-05 直播源类型下拉给了后端不接受的枚举**
`src/views/LiveView.tsx:328-332`（`m3u8` / `flv` / `mp4`）。`[实测]` `POST /api/live/media` 传 `path_type:"flv"` → 422「已选的属性 path type 无效。」；`m3u8` 正常。
后果：选 flv/mp4 的用户必然失败，且提示语与表单项对不上（错误来自后端校验，不像「这个选项不支持」）。
修复：只保留 `m3u8`（若确实要 flv/mp4，需后端先支持）；文案提示「目前仅支持 m3u8」。另：`path_type` 真实存在系统值 `guanfang`（`[实测]` 源列表里有），只读展示时建议翻译成「官方」。

### P2

**P2-01 片单没有「编辑」入口，`id` 字段永远不传**
`src/api/endpoints.ts:99`（类型里有 `id`）+ `src/views/WatchlistsView.tsx:45-56`（只在新建时调用，不带 `id`）。契约「存在则更新」。
后果：名称/简介/标签/是否公开/订阅门槛/封面，创建后**一律改不了**；要改只能删了重建（还消耗槽位）。
修复：详情页加「编辑」→ 复用 `createOrUpdate` 并传 `id`。

**P2-02 直播频道「代号 code」是必填的死字段**
`src/views/LiveView.tsx:49`（`if (!form.title.trim() || !form.code.trim()) return`）、`:280`（输入框）、`:54`（提交 `code`）。契约 `POST /api/live/list` **没有** `code` 字段，并注明「如果存在 code 则为官方源」。
`[实测]` 带 `code:"REVIEWTEST"` 创建成功但回读 `code:null`；再按 `GET /api/live/list?code=REVIEWTEST` 查 → `total:0`（即 `code` 被忽略）。
后果：用户被强制填一个不生效的字段；且如果哪天后端接受它，就等于允许后台伪造官方源编号。
修复：删掉输入框与校验，或改成只读展示（官方源显示 `code`）。

**P2-03 新建片单缺少「所需胡萝卜 point」「封面 image_poster_url」「显示空媒体 is_show_empty」三项输入**
`src/views/WatchlistsView.tsx:34`（state 里有 `point` 但原无输入框）、`:52`（原 `point: form.point` 恒 0）、`:55`（`is_show_empty: true` 硬编码）、`:219-234`（原表单只有 名称/简介/标签/公开）。
`[实测]` 三者后端都能存（见 §2.1）。
状态：**`point` 输入已由并行轨道补上**；仍缺 `image_poster_url`（封面）与 `is_show_empty`（显示空媒体）两项。修复：封面用 `endpoints.ext.ts:28` 的 `imageList` 选图，`is_show_empty` 加开关（默认 true 保持现状）。

**P2-04 直播 `page_size` 被忽略 + 源列表无分页**
`[实测]` `/api/live/list` 与 `/api/live/media` 的 `page_size` 一律被固定成 15（传 1、2、10、50 都返回 15）。`src/api/queries.ts:445` 请求 `page_size:50` 无意义；`src/views/LiveView.tsx:91` 直接渲染 `media.data.items`，**没有 Pager**。
后果：源数 >15 的频道只能看到前 15 个源、也删不掉后面的；卡片标题却显示 `media.data.total`（`:77`），数字与列表条数不符。
修复：媒体源加 Pager（按 15），或让后端支持 `page_size`；`useLiveList` 的 `pageSize=10` 默认值改成 15（或删掉），以免请求值与实际页长不符。

**P2-05 音乐片单「收藏」列取错字段，恒为 0**
`src/views/WatchlistDetailView.tsx:381`（表头「收藏」）与 `:409`（`{song.count_medias ?? 0}`）。`GET /api/watch/{id}/music` 契约响应里没有 `count_medias`（也没有 `is_favorite`），只有 `duration` `rating` `sort` `remark` `person_artists` `albums`。
后果：整列恒 0，读起来像「这首歌没人收藏」；同时 `person_artists`/`sort`/`remark` 这些真有的字段没展示。
修复：列改成「艺人」（`person_artists.map(p=>p.name)`）或「排序/备注」；若要保留收藏，需后端在歌单接口补 `is_favorite`。

**P2-06 求片页没有任何筛选**
`src/api/endpoints.ts:126-136` 的 `SeekQuery` 声明了 `video_type` `upload_self` `video_title` `with_user`，`src/views/SeekView.tsx:35-39` 一个都没传；`src/api/queries.ts:178-184` 也只透传 `status`/`sort_by`。
后果：24,000 条求片只能按状态翻页；无法按「电影/剧集」「只看自己上传的」「按片名搜」定位。
修复：加片名搜索框（`video_title`，前缀匹配）、类型筛选、`upload_self` 开关；`with_user:true` 还能省掉每行的 `seek/history` 请求（`SeekView.tsx:139-141` 的 N+1）。

**P2-07 音乐列表（52 万首）没有任何过滤**
`src/api/queries.ts:478` 只传 `name`；契约的 `has_media` / `is_favorite` / `is_rating` / `person_id_artist` / `album_id` / `is_headless` 全未用，且 `musicApi.songs(params: Record<string, unknown>)`（`endpoints.ts:213`）没有类型保护。
后果：无法筛「无资源待补」「我收藏的」「我评过分的」——这恰好是后台最常用的三件事。
修复：参数改用显式 interface（对齐契约）+ 列表加「仅看无资源 / 仅看收藏」开关。

**P2-08 片单列表无搜索（「门槛」列已补）**
`src/views/WatchlistsView.tsx:37-43` 只传 `type` + `is_self`/`is_subscribe`；契约的 `name`、`author_username`（左匹配）、`is_public` 未用（`[实测]` `?name=热门` → 22 条，可用）。
后果：260 个片单只能一页页翻，找不到「某个人的片单」。
状态：`carrot` 门槛徽标已由并行轨道加到列表行；**搜索框仍缺**。修复：工具栏加搜索框（`name`），作者筛选（`author_username`）可作为进阶项。

**P2-09 直播列表 / 求片列表 / 音乐详情的信息缺口**（合并，逐条小改）
- `LiveView` 不显示 `code`（官方源标识）与源提供者 `pseudonym`（`[实测]` 存在）。
- `SeekView` 不显示 `upload_expired_at`（已认领快过期的条目在列表上看不出来，只能点开详情）。
- `SongDetailView.tsx:125-137` 资源表不显示 `file_quality`（lossless/high）、`file_duration`、`is_primary`、`file_metadata.album` —— 判断「同曲重复资源」缺少依据。

### P3

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| P3-01 | `maintainers` 从未展示，维护者管理 API 未接 | `types.ts:174`、`endpoints.ext.ts:53` | 详情页显示维护者头像/名单，`is_self` 时给「设置维护者」 |
| P3-02 | `subscribe` 不传 `sort`；`sort` mutation 未使用 | `queries.ts:637` / `:640` | 订阅时给默认排序；已订阅片单加拖拽/上下移排序 |
| P3-03 | `watchApi.dynamic` 的 `spider`/`error` 返回值被类型丢弃 | `endpoints.ts:106` | 类型补 `{url, spider?}` 与 `{error?}`，成功后提示「同步 576 条 / 1797 条无数据」 |
| P3-04 | `seek/poll` 未接，改用 30s 全量轮询 | `queries.ts:182` | 见 §2.3 |
| P3-05 | `seek/apply` 未接 | — | 视频详情加「代求片」，见 §2.3 |
| P3-06 | `musicApi.rating` 是死代码（mutation 定义但无入口） | `queries.ts:531` | 要么加评分控件，要么删除 |
| P3-07 | 歌词/资源只有读，没有增删/播放/移动 | `SongDetailView.tsx` 全文 | 按需接 `endpoints.ext.ts:96-102` |
| P3-08 | 音乐页只有「歌曲」tab 能同步；专辑/歌手不行 | `MusicView.tsx:152-168` | 三种 tab 都给同步，`type` 分别用 `ms`/`ma`/`mp` |
| P3-09 | `musicApi.sync` 的 `type` 疑似同样用错（`mp` 而非 `ms`） | `MusicView.tsx:158-160` | `[实测]` `PATCH /api/music/sync?type=ms\|mp\|ma&value=<不存在 id>` 一律 200 回显，无法用行为区分；按同一份契约定义应为 `ms`，建议一并改并回归 |
| P3-10 | 片单影片「添加」不能设排序/备注 | `endpoints.ts:111`（`sort=80, remark=null`） | 弹窗里加「排序 / 备注」两个可选输入 |
| P3-11 | 求片催片输入无前置校验 | `SeekView.tsx:266` | 提交前 clamp 到 1–5000，避免 422 往返 |
| P3-12 | `liveApi.updateMedia` 无入口 | `queries.ts:462` | 外部接口语义，可保留不用 |
| P3-13 | `rankApi` 整体缺失（5 个端点） | `endpoints.ts` 无 | 若要「排行榜」再做；否则把 `mock.ts:221-223` 的假数据也删掉 |
| P3-14 | `recordApi` 只有 `list`，`record/request`、`record/change` 未接 | `endpoints.ext.ts:48-50` | 按需 |

## 4. 参数细节核对

**布尔 → 1/0**：`[实测]` `GET /api/watch?is_public=true` → 422「is public 必须为布尔值。」；`is_self=true` → 同。`src/api/client.ts:45-50` 统一把 `true/false` 编码成 `1/0`，**做法正确**。唯一风险：`buildUrl` 会丢弃 `''`/`null`（`client.ts:42`），所以无法用 query 主动传空字符串（如 `?name=`）；目前没有依赖，但意味着「清空筛选」只能靠不发参数。

**枚举**：

| 参数 | 后端取值 | 前端 | 判定 |
|---|---|---|---|
| `watch.type` | `video` / `music`（`[实测]` 列表返回 `"type":"video"`；契约响应示例里**漏了这个字段**） | 同 | ✅ |
| `seek.status[]` | `default` / `upload` / `complete` / `cancel` / `forget` | 只用前 3 个 | ⚠️ `cancel`/`forget` 的求片在**任何 tab 都看不到**（「全部」也只是前 3 个） |
| `seek.sort_by` | `count_request` / `seek_carrot` / `upload_expired_at` / `updated_at` | 只有 `updated_at`（`queries.ts:181`） | ✅（能力未用） |
| `seek.claim.type` | `confirm` / `cancel` | 同 | ✅ |
| `live.media.path_type` | `m3u8`（文档「目前固定」）+ `guanfang`（`[实测]` 存在） | `m3u8`/`flv`/`mp4` | ❌ P1-05 |
| `music.favorite/rating/sync.type` | `mp` 歌手 / `ms` 歌曲 / `ma` 专辑 | 歌曲处用 `mp` | ❌ P1-02、P3-09 |
| `music.sync` 返回值 | `{type,value}`（回显，形似异步任务） | 丢弃 | ⚠️ 无法确认是否真同步成功 |
| `line.only_self` | `[实测]` 传 `1` 仍返回他人线路 → 后端不生效 | 不传 | ⚠️ 契约/实现不一致，前端未踩坑 |

**分页参数名**：全仓统一 `page` / `page_size` ✅（没有任何 `limit/offset/per_page` 混用）。但**页长语义**不统一：

| 端点 | 前端传 | 实测生效 | 后果 |
|---|---|---|---|
| `GET /api/watch` | 20 / 100 | ✅ 生效 | 正常 |
| `GET /api/seek` | 20 | ✅ 生效（传 2 返 2） | 正常 |
| `GET /api/music/song/list` | 20 | ✅ 生效（传 2 返 2、传 1 返 1；不传时默认 5） | 正常 |
| `GET /api/video/record/list` | 6 | ✅ 生效 | 正常 |
| `GET /api/watch/{id}/video` | 20 | ❌ 固定 **15** | **P1-01**（尾部不可达） |
| `GET /api/live/list` | 10 | ❌ 固定 **15** | P2-04（Pager 用回显值，尚可） |
| `GET /api/live/media` | 50 | ❌ 固定 **15** | P2-04（无分页，直接漏数据） |
| `GET /api/watch/{id}/music` | 20 | 未实测（实例无音乐片单） | 参考 `/video` 大概率也是 15 |

**契约缺口（不是前端问题，但影响核对）**：`page`/`page_size` 在 `/api/watch`、`/api/watch/{id}/video|music`、`/api/seek`、`/api/live/list`、`/api/live/media`、`/api/music/*` 全部生效但契约没写；`watch` 列表响应缺 `type`；`POST /api/watch` 的响应 `count` 语义不明（9）；`/api/proxy/line` 的 `tagline` 实际必填未标注；`/api/music/song/list` 实际返回 `todb_music_song_id`，契约写的是 `todb_music_music_id`。

## 5. 未实测项（诚实标注）

| 项 | 原因 |
|---|---|
| `watchApi.slot` 兑换 | 会真实扣除胡萝卜（用户余额 38219），只读审查不消费 |
| `watchApi.dynamic` | 同步调用会去目标地址真实抓取并落库，副作用不可逆 |
| `watchApi.sort` / `show` | 需先订阅才能排序/切换可见；为不改变他人片单订阅关系，仅读代码 |
| `watchApi.music` 页长、`count_medias` 缺失 | `[实测]` 全站 260 个片单 `type` 均为 `video`，`?type=music` → `total:0`，无音乐片单可测 |
| `seekApi.claim` / `urge` 成功路径 | 认领会改求片状态、催片会扣胡萝卜；只测了失败路径（404 / 422） |
| `musicApi.sync` 的真实语义 | 对不存在的 id 也返回 200 回显，无法区分；没有对真实歌曲触发同步以免污染数据 |
| `musicApi.favorite` 的 `ma`（专辑） | 未调用；仅验证了 `ms` 生效、`mp` 对歌曲无效、非法值 422 |
