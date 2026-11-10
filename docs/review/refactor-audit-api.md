# 类型 ↔ 真实 API 核对 · 字段错配 / 冗余 / 缺失

- **仓库**：`emos.club`（React 18 + TS + TanStack Query）
- **被审对象**：`src/api/types.ts`（435 行）、`src/api/endpoints.ts`（345 行）、`src/api/queries.ts`（审查期间在并行改动）、`api.postman_collection.json`（190 个请求）
- **真实后端**：`https://emos.best`，`Authorization: Bearer 1090_zijIu560MmusQM8j`（管理员 `elephant` / `e7E6K6OE4s`）
- **方式**：**只发 GET**（写接口 `move` / `syncMetadata` / `sync` / `seek` / `ban/change` 一个都没打），响应落地到 `/tmp/api-audit/*.json` 后跑脚本做「键集 + 类型 + null 率」统计。**未改 `src/`**。
- **判定口径**：
  - **【实测】**= 本次真机请求，附请求与响应片段；
  - **【读契约】**= 只看 `api.postman_collection.json`（写接口、或样本不足的接口），不当成实测结论；
  - **【既有记录】**= 仓库里 `docs/api-shapes.md` 前几轮探测留下的记录，用于补样本。
- **抽样量**（避免"看一条就下结论"）：`/api/watch` 264 条全量、`/api/video/list` 500 条、`/api/video/media/list` 6918 条、`/api/music/song/list` 150 条、`/api/shop/product/list` 120 条、`/api/video/persons` 39 条。

---

## 0. 一句话结论

**没有找到"必崩"的错配**——凡是类型撒谎的字段，今天恰好都没人读，或者读了也有 `?? []` / `> 0` 之类的兜底把 `null` 吃掉了。真正的问题集中在两类：

1. **幽灵字段**（类型/契约里有、真实后端从不返回）：`WatchItem.image_poster`（264/264 无）、`WatchAuthor.pseudonym`（264/264 无）、`VideoPerson.image_profile_url`（39/39 无）。其中 `pseudonym` **已经造成显示逻辑失效**：`WatchlistDetailView.tsx:156,597` 的 `author?.pseudonym || author?.username` 永远走后半段。
2. **一个类型服务多个形状**：`VideoMedia`（`media/list` 17 字段 vs `upload/video/base` 5 字段）、`MusicSong`（`song/list` 18 字段 vs `watch/{id}/music/search` 9 字段）、`SeekItem`（`/api/seek` 24 字段 vs `/api/seek/poll` 10 字段）、`VideoItem`（`video/list` 24 字段 vs `video/search` 5 字段）。这些类型让 TS 在**字段不存在的地方**给了"存在且非空"的承诺。

修复量不大：删 3 个幽灵字段、把 4 个复合类型拆开、给约 10 处「实际可空却声明必填」的字段补 `| null`、补 2 个参数（`include_delete`、`video/search` 的筛选参数）。

---

## 1. 类型错误清单

### 1.1 会显示错 / 有真实影响的（P1）

#### T1 `WatchAuthor.pseudonym` 是幽灵字段，作者名永远退化成 username【实测】

| | |
|---|---|
| 位置 | `src/api/types.ts:163`（`WatchAuthor`），读取点 `src/views/WatchlistDetailView.tsx:156,161,597` |
| 声明 | `pseudonym?: string \| null` |
| 实际 | `author` 264/264、`maintainers` 117/117 **只有** `user_id` / `username` / `avatar`，从来没有 `pseudonym` 键 |
| 影响 | 不崩，但「显示笔名」的意图 100% 落空，一律显示 username；`m.pseudonym \|\| m.username` 同理 |
| 修法 | 删掉 `pseudonym`（或让后端补；在契约里也没有这个字段，说明是前端臆造的）。删完 `\|\| username` 可以直接简化成 `.username` |

**实测**：

```
GET https://emos.best/api/watch?page=1&page_size=50   (翻 6 页取全 264 条)
"author":       {"user_id":"eJ3ZYR89Ks","username":"return","avatar":null}
"maintainers":  [{"user_id":"eQP312ER4s","username":"user_i","avatar":null}]
键统计：author keys {'user_id':264,'username':264,'avatar':264}
       maintainer keys {'user_id':117,'username':117,'avatar':117}
```

#### T2 `WatchItem.image_poster` 是幽灵字段（契约有、后端没实现）【实测 + 读契约】

| | |
|---|---|
| 位置 | `src/api/types.ts:177` |
| 声明 | `image_poster: string \| null`（必填） |
| 契约 | `api.postman_collection.json` /api/watch 的 200 示例里**有** `"image_poster": "XNrvMY2pkxbE"`（是文件 id，不是 URL） |
| 实际 | 264/264 条**没有这个键**，只有 `image_poster_url` |
| 影响 | 读它恒 `undefined`。当前全项目没有人读（见 §2），所以不崩；但类型和契约都在骗人，下一个人写 `Poster src={buildUrl(item.image_poster)}` 就会静默拿到空图 |
| 修法 | 删字段，或改 `image_poster?: string \| null` 并在注释里标「后端未实现，只有 image_poster_url」 |

**实测**（264 条全量键集，注意没有 `image_poster`）：

```
image_poster_url  {'str':132,'NoneType':132}
subscribe_id      {'int':264}
tags              {'list':264}
user_is_show      {'NoneType':256,'bool':8}
user_sort         {'NoneType':256,'int':8}
image_poster      ——— 不存在
```

#### T3 `VideoPerson`：3 个字段实测恒 `null` 却写成必填数字/布尔，1 个字段是幽灵【实测】

| 字段 | 声明（`types.ts:131-147`） | 实测（39 行 / 9 次查询、8 部片） | 契约 | 影响 |
|---|---|---|---|---|
| `id` | `number` | **39/39 `null`** | `"id": null` | `VideoDetailView.tsx:448` 用 `key={person.id}` → 8 个卡片 key 全是 `null`，React 重复 key 警告 + 复用错节点 |
| `person_id` | `number` | **39/39 `null`** | `"person_id": null` | 同上是"本地人物 id"，TMDb 来源的人没有 |
| `is_adult` | `boolean` | **39/39 `null`** | `"is_adult": null` | 无（没人读） |
| `image_profile_url` | `string \| null` | **字段不存在**（真实字段是 `image_profile`，文件 id） | 契约里也没有 | 幽灵字段；`VideoDetailView.tsx:449-452` 用的是 `image_profile` 拼 URL，正确 |
| `gender` | **`number \| null`** | `null` | 契约 desc 明确枚举 **字符串** `unknow/male/female/other` | 类型写错（number vs string）。同域 `/api/music/person/list` 实测 `'male'`/`'female'` 佐证 |
| （缺）`person_id_tmdb` | — | 39/39 都有，`int` | 契约有 | 前端拿不到"这个人是 TMDb 的谁" |
| （缺）`is_virtual` | — | 39/39 都有（`null`） | 契约有；`/api/music/person/list` 实测 `0`/`1` | 无 |

**修法**：

```ts
export interface VideoPerson {
  id: number | null          // TMDb 来源的人没有本地 id
  person_id: number | null
  person_id_tmdb: number     // 新增：先按它去重
  name: string
  image_profile: string | null
  gender: string | null      // 'unknow' | 'male' | 'female' | 'other'
  is_adult: boolean | null
  is_virtual: number | null  // 新增
  // 删 image_profile_url
  …
}
```

`VideoDetailView.tsx:448` 的 key 同时改成 `key={person.person_id_tmdb ?? person.name}`。

**实测片段**：

```
GET https://emos.best/api/video/persons?video_list_id=126958&page=1&page_size=3
{"page":1,"page_size":3,"total":6,"items":[
  {"id":null,"person_id":null,"person_id_tmdb":1000,"name":"李知恩",
   "image_profile":"jlJYPqRa3GWADo5L","original_name":null,"tagline":null,
   "biography":null,"birthday":null,"gender":null,"birthplace":null,
   "is_virtual":null,"is_adult":null,"title":"Seong Huiju","job":null}, …]}
```

#### T4 `MusicSong` 被 `watch/{id}/music/search` 复用，一半字段不存在【实测】

| | |
|---|---|
| 位置 | `src/api/types.ts:385-399`（`MusicSong`）、`src/api/endpoints.ts:186-187`（`searchMusic` 返回 `ListResult<MusicSong>`） |
| 声明 | `description: string \| null`、`rating`、`video_list_id`、`has_media?`、`is_favorite?`、`count_medias?` 全都有 |
| 实际 | `song/search` 只回 **9 个键**：`song_id, todb_music_song_id, name, image_poster_url, tagline, duration, is_adult, person_artists, albums` |
| 影响 | 搜索候选行若读 `description`/`has_media` 会拿到 `undefined`（现在只读 `name`/`duration`/`person_artists`，所以不崩） |
| 修法 | 拆 `MusicSongBrief`（搜索用），或把这些字段标 `?` |

**实测**：

```
GET /api/watch/10006/music/search?song_title=月&page_size=8
{"items":[{"song_id":…,"todb_music_song_id":…,"name":"…","image_poster_url":null,
  "tagline":null,"duration":252,"is_adult":null,"person_artists":[…],"albums":[…]}]}
# 没有 description / has_media / is_favorite / count_medias / rating / video_list_id
```

同一类型在 `/api/music/song/list` 上**字段是齐的**（150/150 有 `has_media`/`is_favorite`/`count_medias`）：

```
has_media {'bool':150}  is_favorite {'bool':150}  count_medias {'int':150}
is_adult  {'NoneType':150}   ← 恒 null，见 T5
```

#### T5 `MusicSong.is_adult: boolean` 实测恒 `null`【实测】

150/150 都是 `null`（`song/list` 与 `watch/{id}/music/search` 两个接口一致）。目前无人读 → 不崩。修法：`is_adult: boolean | null`。

#### T6 `VideoItem` 被 `video/search` 复用，实际只有 5 个字段【实测】

| | |
|---|---|
| 位置 | `src/api/types.ts:64-89`、`src/api/endpoints.ts:106-107` |
| 声明 | `request<ListResult<VideoItem>>`（24 字段） |
| 实际 | `/api/video/search` 只回 `video_id, video_type, video_title, todb_id, tmdb_id` |
| 影响 | 唯一调用方 `src/views/UploadView.tsx:47`（"按片名搜索"）只读 `video_id`/`video_title` → 今天不崩。但这是"卡片预告"：下一个人按类型取 `video_image_poster` 会拿到 `undefined`，页面静默空白 |
| 修法 | 加 `VideoSearchItem`（5 字段）并让 `videoApi.search` 返回它 |

**实测**：

```
GET /api/video/search?page=1&page_size=2&title=tokyo
{"page":1,"page_size":2,"total":84,"items":[
 {"video_id":210464,"video_type":"movie","video_title":"Tokyo Blood","todb_id":210820,"tmdb_id":340048},
 {"video_id":209532,"video_type":"tv","video_title":"Tokyo Morning Express","todb_id":352822,"tmdb_id":14160}]}
```

#### T7 `WatchItem.user_is_show / user_sort` 声明必填，实测 256/264 为 `null`【实测】

| | |
|---|---|
| 位置 | `src/api/types.ts:183,184` |
| 声明 | `user_is_show: boolean`、`user_sort: number` |
| 实际 | 本人/已订阅的 8 条是 `bool`/`int`；其余 **256 条是 `null`** |
| 影响 | 唯一读取点 `WatchlistDetailView.tsx:105-106` 在 `item.is_self` 分支内，本人片单一定是 bool → **今天不会显示错**。但这是靠调用点的巧合兜住的，任何在列表页直接读它的代码都会把 `null` 当"未显示" |
| 修法 | `boolean \| null` / `number \| null`（或者让后端在非本人时补 false/0） |

**实测**：

```
GET /api/watch?page=1&page_size=3
{"items":[{"id":1081,…,"is_self":false,"user_is_show":null,"user_sort":null,…},
          {"id":10006,…,"is_self":true,"user_is_show":true,"user_sort":2,…}]}   ← is_self=1 时才有值
```

---

### 1.2 只是类型不准、当前无可见故障（P2/P3）

| # | 字段 | 声明 | 实际 / 契约 | 影响 | 修法 | 依据 |
|---|---|---|---|---|---|---|
| T8 | `VideoMedia.media_file_second` | `number \| undefined`（可选） | **45/6918 是 `null`**，其余 int | 若做 `seconds * 1000` 会得 `NaN`（今天无人读） | `media_file_second?: number \| null` | 【实测】 |
| T9 | `VideoMedia` 缺字段 | 只有 8 个 | `media/list` 实测还恒有 `user_id / season_id / episode_id / part_id / subtitle_count / storage_title / is_can_restore / media_file_metadata` | `RecycleView.tsx:158,170` 读的 `is_can_restore` / `storage_title` 正是靠 `Record<string, unknown>` 逃过类型检查 → 没有类型保护 | 补齐 8 个字段（见 §1.3 的拆分建议） | 【实测】 |
| T10 | `ShopOrder.urge_number` | `number` | 契约 unpaid 单为 `null`；本账号只有 1 单恰好非 null | `OrdersView.tsx:167-169` 的 `urge_number > 0`，`null > 0 === false` 恰好等价"未催" → 不显示错 | `number \| null` | 【读契约】+【实测】 |
| T11 | `ShopOrder` 缺 `price_settle` | — | 契约 shop 侧订单有 `"price_settle": 95` | 商户侧看不到结算金额（UI 目前也没展示） | 补字段 | 【读契约】 |
| T12 | `ShopOrder.seller` / `.product` | `unknown` | 实测 `seller={seller_id,name,cover_url}`、`product={id,description,exchange_way}` | 类型上拿不到任何字段，只能 `as` 强转 → 等于没有类型 | 补两个内联接口（注意 seller 不是 `ShopSeller`，没有 `status`/`is_self`/`description`） | 【实测】 |
| T13 | `UserInfo.password` | `string`（必填） | 本账号 `"534387"`（str）；`docs/api-shapes.md` 记录的另一个账号是 `null`；契约 200 示例也是 `"password": null` | `AccountView.tsx:208,212` 直接渲染 + `clipboard.writeText` → 拿到 null 会复制出字符串 `"null"` | `string \| null`，UI 加 `if (user.password)` | 【读契约】+【既有记录】 |
| T14 | `UserInfo` 缺字段 | — | 实测 `/api/user` 还返回 `server_abs`、`is_show_adult`、`is_show_watch_default`；契约 desc 里明确写了 `is_show_watch_default` | UI 拿不到「显示成人内容 / 默认片单」这类开关，无法在后台回显 | 补 3 个字段 | 【实测】 |
| T15 | `mediaApi.syncMetadata` 返回类型 | `CarrotDelta`（`{carrot:number}`） | 契约 200→**204 无 body** | `client.ts:111-135` 对空 body 返回 `''`（字符串）→ `result.carrot` 是 `undefined`。今天无人读 `.carrot`，所以不崩 | 返回类型改 `void`；或按 204 单独处理 | 【读契约】 |
| T16 | `ShopProduct.price` | `number \| null` | 120/120 都是 int（`price_origin`/`stock`/`sales` 同样恒 int） | 无（多写了一次 null 判断） | `price: number` | 【实测】 |
| T17 | `ShopProduct.description` / `exchange_way` | `string \| null`（可选 `?`） | 列表接口也恒有（`str` 109 / `null` 11；`str` 93 / `null` 27） | 无 | 去掉 `?`，保留 `\| null` | 【实测】 |
| T18 | `ShopProduct` 缺 `cover` | — | `product/info` 实测有 `"cover"`（文件 id） | 无 | 补 `cover?: string` | 【实测】 |
| T19 | `WatchItem.tags` | `string[] \| null` + 注释「不传 tags 时后端返回 null 而非 []」 | **264/264 都是数组**，其中 58 条是空数组 `[]` | 无（`item.tags ?? []` 是多余兜底）；但注释是错的，会误导下一个人去写 `?? []` | 改 `string[]`，删注释 | 【实测】 |
| T20 | `VideoEpisode.seek?` / `with_seek_is_request?` | 可选 | `with_seek=1&with_seek_is_request=1` 时**恒存在**（无求片为 `null`） | 无 | 去掉 `?` | 【实测】 |
| T21 | `WatchVideo.todb_id` | `number \| null` | 45/45 都是 int | 无 | `number` | 【实测】 |
| T22 | `VideoItem.tmdb_url` | `string \| null` | 500/500 都是 str（`tmdb_id` 为 null 时也给 `…/tv/` 这种半截 URL） | 无 | 保留 null 也行，但要知道它不会 null | 【实测】 |
| T23 | `uploadApi.images` 内联类型 | 缺 `file_type` | 实测每行都有 `file_type: "image/png"` | 无 | 补 | 【实测】 |
| T24 | `RankUpload` / `RankCarrot` / `PlayingNow` / `MusicArtistRef` | 4 个类型 | **全项目零引用**，`endpoints.ts` 里也没有 `/api/rank/*` 的封装 | 死类型；`PlayingNow` 还与实测对不上（实测 `rank/userVideoRecordPlaying` 有 `username`、`play_seconds`，类型里没有；类型里的 `play_speed`/`upload_pseudonym` 实际存在但没人用） | 删掉，或补 `rankApi` + 按实测修正 | 【实测】 |
| T25 | `SeekItem` 被 `/api/seek/poll` 复用 | 24 个必填字段 | poll 实测只回 **10 个键**：`id, todb_id, tmdb_id, video_type, video_title_display, video_season_id, video_season_number, video_episode_id, video_episode_number, updated_at`（无 `status`/`count_request`/`seek_carrot`/`is_can_claim`/`item_id`/`video_title`/封面/`video_list_id`） | `SeekView.tsx:59-63` 只读 `.length` → 不崩；但 `SeekItem` 的 14 个字段在 poll 上是 `undefined` | 拆 `SeekPollItem`（10 字段） | 【实测】 |

---

### 1.3 建议的拆分（一条修法解决 4 个问题）

```ts
// 今天：一个 VideoMedia 顶三个接口
//   /api/video/media/list      → 17 个字段（含 include_metadata=1 时的 media_file_metadata）
//   /api/upload/video/base     → 5 个字段（media_id, media_name, media_file_size, user_pseudonym, is_self_upload）
//   /api/video/media/listAll   → 27 个字段（多 video_title/season/episode/part/storage_title/deleted_at）

export interface VideoMediaBase {          // videoBase 用
  media_id: string; media_name: string; media_file_size: number
  user_pseudonym: string | null; is_self_upload: boolean
}
export interface VideoMedia extends VideoMediaBase {   // media/list 用
  media_status: string
  media_file_second: number | null
  media_file_metadata: unknown | null
  season_id: number; episode_id: number; part_id: number | null
  user_id: string
  subtitle_count: number
  storage_title: string
  is_can_restore: boolean
  deleted_at: string | null
  created_at: string
}
```

同理 `MusicSong` → `MusicSongBrief`（搜索）、`SeekItem` → `SeekPollItem`（poll）、`VideoItem` → `VideoSearchItem`（search）。

---

## 2. 未使用字段清单

口径：`src/**` 里（**排除** `src/api/types.ts` 与 `src/api/mock.ts`）用整词搜索，字段名**一次都没出现过**。这类字段要么删、要么在注释里标「后端返回但界面不用」，避免下次有人以为改了要同步。

| 类型 | 未被任何代码读取的字段 |
|---|---|
| `VideoItem` | `tmdb_url`、`video_description`、`video_tagline`、`video_image_logo`、`video_image_backdrop`、`video_is_adult`、`parts_count`、`titles` |
| `VideoSeason` | `season_description` |
| `VideoEpisode` | `parts_count` |
| `VideoPerson` | `birthday`、`gender`、`birthplace`、`biography`、`is_adult`（`image_profile_url` 既不存在也没人读） |
| `VideoMedia` | `media_status?`、`media_file_second?` — **注意：整个 `VideoMedia` 类型实际上没有"活的"读者**：`mediaApi.list` 的返回值在 `useMediaList` 里被 `as unknown as Array<Record<string, unknown>>` 抹掉；唯一带类型的 `uploadApi.videoBase().video_medias` 也没人读（`UploadView.tsx:81` 只取 `base.title`） |
| `WatchItem` | `subscribe_id`、`image_poster`、`user_sort` |
| `WatchVideo` | `video_is_adult`、`video_is_delete`、`user_username`、`user_avatar` |
| `WatchVideoCandidate` | `todbv_id`、`video_is_adult`、`genres`（`genres` 不是"不想用"，而是**后端从来不给**，见 §3-P4） |
| `SeekItem` | `video_image_logo`、`video_image_backdrop`、`tmdb_url` |
| `CarrotHistory` | `expired_at` |
| `ShopProduct` | `time_start`、`time_end`、`user_buy_max` |
| `ShopOrder` | `time_pay`、`time_urge` |
| `MusicSong` | `is_adult`、`count_medias?` |
| `UserInfo` | `is_have_emps` |
| `UserDetail` | `is_disable` |
| 整类型 | `RankUpload`、`RankCarrot`、`PlayingNow`、`MusicArtistRef`（零引用） |

---

## 3. 参数不一致清单（`endpoints.ts` ↔ postman 契约）

按严重度排。**P1 会真的丢功能，P3 只是脏**。

| # | 接口 | 契约 | `endpoints.ts` | 实测 | 结论 / 修法 |
|---|---|---|---|---|---|
| P1 | `mediaApi.list` → `/api/video/media/list` | `video_list_id, video_season_id, video_episode_id, video_part_id, include_metadata, **include_delete**` | 少了 `include_delete`（`endpoints.ts:122-123`） | 传 `include_delete=1` 后端接受（200），不传时 `deleted_at` 6918/6918 全是 `null` | **少传**：后台永远看不到已删除资源。补参数 |
| P2 | `videoApi.search` → `/api/video/search` | `last_id, tmdb_id, todb_id, video_id, type, title, with_genre, sort_by, page, page_size` | 只有 `title, page, page_size, sort_by, type`（`endpoints.ts:106-107`） | 只验证了 `title` 可用（total 84） | **少传 5 个**：无法按 tmdb/todb/video_id 精确搜索，也没法要 `with_genre`。补参数 |
| P3 | `mediaApi.listAll` → `/api/video/media/listAll` | `media_id, user_id, only_delete, include_metadata`（`status` 在契约里是 `disabled: true`） | 多传 `status`、`page`、`page_size`（`endpoints.ts:124-125`） | `status=complete` 返回 200 且 `total=133353`（与不传时的量级一致，看不出是否生效）；`page`/`page_size` 有效（`page_size=3` 回 3 条） | **多传**：`status` 是个无效参数，建议删；`page`/`page_size` 实测有效但契约没写，建议在契约里补 |
| P4 | `watchApi.searchVideos` → `/api/watch/{id}/video/search` | `title, type`（**没有** `with_genre`） | 多传 `with_genre: true`（`endpoints.ts:177-178`；`queries.ts:298-299` 的注释还写「with_genre 让候选行能显示题材，省一次补充请求」） | `with_genre=1` 返回里**没有 genres 键** | **多传 + 注释误导**：`WatchVideoCandidate.genres` 永远是 `undefined`，`WatchlistDetailView.tsx:338` 的"· 题材"永远不显示。要么后端支持，要么删参数+删字段+删那一行渲染 |
| P5 | `watchApi.videos` → `/api/watch/{id}/video` | 只有 `video_title` | 多传 `page`、`page_size`（`endpoints.ts:175-176`） | `page_size=50` → 响应 `page_size: 15`，`items.length: 15`；`page=2` 有效（total 199）；`video_title=律界狂花` 有效（total 1） | **多传**：`page_size` 被后端写死 15。`WatchlistDetailView.tsx:312-313` 已经用响应里的 `page_size` 算页数兜住了；但同一文件的音乐侧 `:694` 还在用 `search.page_size`，需要确认（见 §5 未验证） |
| P6 | `shopApi.products` → `/api/shop/product/list` | `sort_by=sort&sort_order=asc` 都在示例里，语义必填 | `sort_order?: 'asc' \| 'desc'` **可选**（`endpoints.ts:271-272`） | **`sort_order` 硬必填**：缺 → **422** `{"message":"sort order 不能为空。"}`（`sort_by` 单独给也一样 422）；只给 `sort_order=asc`、不给 `sort_by` → **200**（有默认值）。`sort_by` 合法值实测只有 `sort / sales / price / stock`，`updated_at`、`created_at` → **422** `{"message":"已选的属性 sort by 无效。"}` | 契约没写"必填"是契约的漏；**类型该收紧**：`sort_order: 'asc'\|'desc'`（去掉 `?` 才是关键），`sort_by?: 'sort'\|'sales'\|'price'\|'stock'`。`queries.ts` 的 `useShopProducts` 与 `useShopProductsInfinite` 两处都硬编码了，暂时安全 |
| P7 | `mediaApi.move` / `seekApi.apply` / `uploadApi.videoBase` / `uploadApi.saveVideo` / `uploadApi.saveSubtitle` / `recordApi.change` | 契约 §「资源类型 item_type」明确枚举：`vl` 列表 / `vs` 季 / `ve` 集 / `vp` 分段 / `vm` 资源 / `vt` 字幕；音乐侧 `mp` / `ms` / `ma` | 一律 `itemType: string` | 无法实测（PUT/POST） | **类型该收紧**：`type ItemType = 'vl'\|'vs'\|'ve'\|'vp'\|'vm'\|'vt'`。今天 `VideoDetailView.tsx:635,677` 传的是 `'vl'`/`'ve'`，都对 |
| P8 | `musicApi.songs` / `albums` / `persons` | 契约列出完整参数：`song_id, name, has_media, is_favorite, is_rating, album_id, person_id_artist, person_name_artist, is_headless` 等 | `params: Record<string, unknown>` | 用到的 `name`/`has_media`/`is_favorite`/`page` 都有效 | **没有校验**（不是错）：拼错参数名不会有任何编译/运行提示，后端静默忽略。建议补内联类型 |
| P9 | `watchApi.createOrUpdate` | 请求体字段叫 **`point`**；列表/详情响应里叫 **`carrot`** | 请求用 `point`，读取用 `item.carrot`（`WatchlistDetailView.tsx:493`） | 实测列表 `"carrot": 1` | **不是 bug，是命名陷阱**：同一样东西两个名字，读代码时极易误以为 `point` 没生效。建议在 `types.ts` 的 `carrot` 上加注释 |
| P10 | `banApi.change` / `seekApi.list` / `shopApi.*` 的必填默认值 | — | 都有默认值（`reason='后台操作'`、`sort_by/sort_order` 默认、`remark ?? null`） | — | ✅ 与契约一致，无需改 |

### 契约有、`endpoints.ts` 没封装（能力缺失，非错配）

`/api/watch/{watch_id}/user`（片单成员列表）、`/api/video/tree`（树形浏览）、`/api/rank/{carrot,upload,userVideoRecordPlaying,userLiveRecordPlaying,sign}`、`/api/pay/getUserSign`、`/api/reel/*`、`/api/redPacket/*`、`/api/lottery/*`、`/api/telegram/vote/*`、`/api/music/song/{id}/updateVideoId`、`/api/music/album/{id}/updateVideoId`、`/api/video/record/change` 的 `type=vs`。

---

## 4. 今晚 7 个重点接口逐项核对

### 4.1 `/api/video/media/move` — `item_type` 取值【读契约（写接口，未打）】

- 契约里 `item_type` 的枚举写在 collection 根级 description：**`vl` 视频列表 / `vs` 视频季 / `ve` 视频集 / `vp` 视频分段 / `vm` 视频资源 / `vt` 视频字幕**（音乐侧另一套：`mp`/`ms`/`ma`）。
- 契约示例 `media/move?media_id=…&item_type=ve&item_id=3` → 与代码一致。
- 调用点：`VideoDetailView.tsx:635` 移动整片 → `'vl'` + `video.id`；`:677` 移动到某集 → `'ve'` + `ep.episode_id`。**取值正确**。
- 唯一问题：`endpoints.ts:128-129` 签名是 `itemType: string`，枚举没进类型（P7）。响应 `{carrot:1}` 与 `CarrotDelta` 一致 ✅。
- **未实测**：`PUT` 会改真实媒体归属，按要求没发。

### 4.2 `/api/video/media/syncMetadata` — 422 语义【读契约 + 读代码，未打】

- 契约：`PUT`，**响应是 `204` 且没有 body**，desc「针对无 metadata 的视频信息重新触发同步，点击后预计 3 分钟同步完成」。契约里**没有** 422 示例。
- 代码 `endpoints.ts:132-141`：正常路径声明 `CarrotDelta`（错，见 T15），并 `catch` 里用**字符串匹配** `error.message.includes('已存在 metadata')` 把 422 翻译成 `{ carrot: 0 }`。
- 风险（读代码就能确定，不依赖实测）：
  1. 语义翻译靠中文文案匹配 —— 后端改一个字（或加标点/换成英文）就退化成报红。
  2. `client.ts:129-133` 的 `msg` 取的是 `payload.message`，所以只要后端 422 的文案里还带「已存在 metadata」四个字，匹配就能工作（**这条是读代码推断，写接口未实测**；同一后端其它 422 的文案都是中文一句话，如 `{"message":"sort order 不能为空。"}`，格式上是吻合的）。
  3. 成功路径 204 → `client.ts` 返回 `''`（字符串），`(await …).carrot` 是 `undefined`。谁哪天读 `.carrot` 就会 `undefined` 参与运算。
- **修法**：`request<void>`；422 判断优先用 `(err as ApiError).status === 422`，文案只作为附加条件（`payload.message` 含「已存在」）。若确认该接口只有这一个 422 语义，直接 `status === 422 → 成功` 更稳。UI 层 `VideoDetailView.tsx:521` 的 toast「已同步元数据」在 422 时也会弹 —— 语义正确（确实已是目标状态）。

### 4.3 `/api/video/sync` — `tmdb_id` / `todb_id`【读契约（PATCH，未打）】

- 契约：`PATCH /api/video/sync?tmdb_id=&todb_id=1000`，desc「与 todb 二选一；**都存在以 todb 为准**」「异步执行，约一分钟」「返回的数组是查询到待同步的内容；为空则提示去 todb 平台先添加数据」。
- 代码 `endpoints.ts:108`：`{ tmdb_id?: number; todb_id?: number }` ✅ 与契约一致；调用点 `useVideoMutations.syncVideo`（`queries.ts`）只传 `todb_id` ✅。
- 唯一可改进：返回类型 `Array<Record<string, unknown>>`，契约里形状是 `{todb_id, video_type, video_title, date_air, is_adult}`；调用点只取"有没有内容"，暂无影响。

### 4.4 `/api/shop/product/list` — `sort_by` / `sort_order` 必填【实测 ✅ 契约缺】

```
GET /api/shop/product/list?page=1&page_size=2
HTTP 422  {"message":"sort order 不能为空。"}

GET /api/shop/product/list?page=1&page_size=2&sort_by=updated_at&sort_order=desc
HTTP 422  {"message":"已选的属性 sort by 无效。"}

GET /api/shop/product/list?page=1&page_size=1&sort_by={sort,sales,price,stock}&sort_order={asc,desc}
HTTP 200  ×8   ← 只有这 4 个 sort_by 合法
```

- 补充实测：`sort_order` 是**唯一**的硬必填项 —— 只给 `sort_by=sort` 仍 422，只给 `sort_order=asc` 却 200（`sort_by` 有默认值）。
- 结论：契约的示例里写了这两个参数但没标注必填/枚举，**真正的问题在契约**；`endpoints.ts` 把 `sort_order` 标成可选，是在类型层放行了会 422 的调用。修 P6。
- 返回字段：`price` 恒 int（T16）、`description`/`exchange_way` 恒有（T17）；`seller`/`category_name` 只在 `product/info` 有，与 `types.ts:342-345` 的注释一致 ✅。

### 4.5 `/api/music/song/{id}/media/list` — 归属字段【实测 ✅】

契约的示例里有 `user: {user_id, username, avatar}`，实测**一致**，且是"归属"的唯一来源（没有 `user_id` 平铺字段）：

```
GET /api/music/song/20149/media/list
[{"media_id":"x67w65opnejl","file_suffix":"mp3","file_type":"audio/mpeg","file_size":3984028,
  "file_hash":"3f5cc3…","file_duration":242,
  "file_metadata":{"album":null,"title":"跟悲伤结了帐 (网友改编)","artist":"Gareth.T;陶喆","year":null},
  "file_quality":"standard","meta_rate_bit":128000,"meta_rate_sampling":44100,"meta_bit_depth":0,
  "meta_channel":2,"path_type":"local_music_storage","is_primary":false,
  "name":"aaron501 上传","created_at":"2026-06-17T10:03:34.000000Z",
  "user":{"user_id":"eD3V8V53Ys","username":"aaron501","avatar":null}}]
```

- `endpoints.ts:326`：`request<Array<Record<string, unknown>>>` → **没有类型**，`SongDetailView` 只能靠字符串键取值。这是"归属字段拿不到类型保护"的真问题（不是错配）：`song_id` 是路径参数、`media_id` 是 query，两个 id 极易传反。建议补 `MusicMedia` 接口（20 个字段，见上）。

### 4.6 `/api/watch` — tags 数组 / 私密过滤【实测】

- **tags 恒为数组**：264/264 `list`，其中 58 条 `[]`。`types.ts:176` 的 `string[] | null` + 「不传 tags 时后端返回 null」注释**与实测相反**（T19）。
- **`image_poster` 恒缺失**（T2）。
- **`author` / `maintainers` 恒无 `pseudonym`**（T1）。
- **私密过滤**：`is_public=0` 与 `is_public=1` 都返回 `total=264`；但**全站 264 条都是 `is_public: true`**，本人 8 条也全是 public → **没有私密样本，无法判定该过滤器是否生效**。不作为问题上报，仅记在这里（见 §6）。
- `type=music` 返回 `total: 0`（全站没有音乐类片单）→ 片单页的"音乐"标签页必然是空的，这是数据现状，不是前端 bug。

### 4.7 `/api/video/list` — `tmdb_id` 搜索 / `only_delete`【实测 ✅】

```
GET /api/video/list?page=1&page_size=3&tmdb_id=313346   → {"total":1,"items":[{"video_id":126958,"tmdb_id":313346,…}]}
GET /api/video/list?page=1&page_size=2&only_delete=1    → {"total":160,"items":[{"video_id":65994,"is_delete":true,"item_id":"vl-65994"},…]}
GET /api/video/list?page=1&page_size=2&title=tokyo      → {"total":84}
GET /api/video/list?page=1&page_size=2&with_media=1     → 与不传时字段集完全相同（24 个键）
```

- `tmdb_id` 精确搜索 ✅、`only_delete` ✅（且返回的 `is_delete` 为 true）。
- `title` 是**子串**匹配（不是前缀）：`title=tokyo` → total 84；`title=blood` → **total 137**，命中 `Warm Blooded Animals` / `Tokyo Blood` / `Blood, Sweat and Luxuries`（中间命中，确认不是前缀）。
- `with_media=1` **不增加任何字段**（不像 `listAll` 的 `include_metadata` 会塞 ffprobe）。契约也没说它会加字段，但如果前端期待它返回媒体摘要，那是空期待。
- `VideoItem` 与实测的吻合度是全部类型里最好的（500 条抽样零错配，见 §5）。

---

## 5. 实测完全吻合、不用动的接口（正面结论）

避免读者以为"没列的就是没查"：

| 类型 | 抽样 | 结论 |
|---|---|---|
| `VideoItem`（`/api/video/list`） | 500 条 | `todb_id` 恒 int ✅；`tmdb_id` 1/500 为 null ✅ 可空正确；`item_id` 241/500 null、259 条 `"vl-<id>"` ✅；`titles`/`genres` 恒数组 ✅；`is_delete`/`seek_is_request` 恒 bool ✅ |
| `VideoSeason` | 1 部 1 季 | 9 字段全中 ✅ |
| `VideoEpisode` | 1 部 12 集（S01）+ 1 部 3 集（S03） | 14 字段全中；`seek` 对象 8 字段与 `types.ts:118-127` **逐字一致** ✅ |
| `LiveListItem` / `LiveMedia` / `/api/live/library` 的内联类型 | 15 频道 + 3 条媒体 | 全中 ✅（`description`/`tagline`/`pseudonym` 可 null 正确） |
| `LineItem` | 全量（10KB） | 6 字段全中 ✅ |
| `BanItem` | 全量 | 9 字段全中 ✅ |
| `CarrotHistory` | 3 条 | 全中（`expired_at` 有值，声明可空是保守正确）✅ |
| `SignCheck` / `CarrotDelta` / `IdResult` / `MessageResult` | — | ✅ |
| `ShopSeller` / `ShopCategory` | 2 个店铺 | `ShopSeller` 全中 ✅（`status:"pass"`、`is_self`、`cover_url` 可 null）；`ShopCategory` 只能读契约（真实店铺都没建分类，`seller_id=1001/1002` 都返回 `[]`） |
| `UserDetail` | 403 | `pay/getUserInfo` 对管理员返回 **403**，与 `types.ts:408` 注释「非服务商时接口 403」一致 ✅；`useUserPayInfo` 的 403→null 处理正确 |
| `/api/upload/video/base` | 2 次 | 见下 |

**`/api/upload/video/base` 的 404 不是 bug**：`item_type=vl&item_id=126958/1000/33647/201938` 全部返回 `404`，body 是纯文本 `emos api 404 :(`（不是 JSON），但 `item_id=1038`（本地已有）返回 200、`item_type=ve&item_id=3161584` 也返回 200。→ 404 表示"这条影片不在本地库"，与契约不冲突。

`item_type=ve` 的真实响应（注意只有 6 个键，`video_medias` 里只有 5 个字段——这是 T9 拆类型的直接证据）：

```json
{"video_list_name":"被放逐的作废赋予魔术师享受随心所欲的第二人生。",
 "season_number":"S01","episode_number":"E02","episode_title":"…",
 "title":"… - S01E02 - …",
 "video_medias":[{"media_id":"5rpvqyx2gok9","media_name":"1080P - h264 - 掉色人🔥 上传",
                  "media_file_size":1452001351,"user_pseudonym":"掉色人🔥","is_self_upload":false}]}
```

---

## 6. 无法验证 / 未验证（明确列出，不当结论用）

1. **所有写接口**：`move`（item_type 取值）、`syncMetadata`（422 语义）、`video/sync`（tmdb_id/todb_id）、`seek` POST（sort_by/sort_order 必填）、`ban/change`、`shop/product/*` 的写操作 —— 按要求**只发 GET**，这些结论全部来自契约 + 代码，已在 §4 标注。
2. **`/api/seek` 的完整返回形状**：只能读契约（示例与 `types.ts` 的 `SeekItem` 逐字一致 ✅）。poll 已实测（10 个键，见 T25）。
3. **`/api/watch?is_public=0` 是否真的过滤**：全站 264 条 + 本人 8 条都是 public，无私密样本。
4. **`/api/watch/{id}/music` 的 `page_size` 是否也写死 15、返回是否完整 `MusicSong`**：全站没有任何 music 类片单（`type=music` → total 0），取不到样本。`WatchlistDetailView.tsx:694` 用 `search.page_size` 算页数，若该接口也固定 15，会像视频侧一样算少总页数——建议顺手对齐成 `songs.data.page_size`。
5. **`mediaApi.list` 的 `include_delete=1` 到底返回什么**：我抽的影片没有已删资源，两次响应字节数完全相同（3003B）。参数本身被接受、契约也明确写了它。
6. **`/api/video/media/listAll` 的 `status` 是否生效**：不传/传 `complete` 都返回 200，`total` 量级一致（133353），无法分辨。

---

## 7. 建议的修复顺序

1. **删 3 个幽灵字段**（5 分钟）：`WatchItem.image_poster`、`WatchAuthor.pseudonym`、`VideoPerson.image_profile_url`。删 `pseudonym` 后顺手把 `WatchlistDetailView.tsx:156,161,597` 的 `|| username` 收成 `.username`。
2. **`VideoPerson` 的 null 化 + 补 `person_id_tmdb`**（10 分钟，含 `VideoDetailView.tsx:448` 的 key）。
3. **拆 4 个复合类型**：`VideoMedia`/`MusicSong`/`SeekItem`/`VideoItem` 各加一个 brief 版本（§1.3 模板）。
4. **补 2 个参数**：`mediaApi.list` 的 `include_delete`、`videoApi.search` 的 `tmdb_id/todb_id/video_id/with_genre`；同时删掉 `watchApi.searchVideos` 无效的 `with_genre` 和 `listAll` 的 `status`。
5. **收紧 2 处必填/枚举**：`shopApi.products` 的 `sort_by`/`sort_order`（会 422）、`item_type` 改成 union。
6. **`syncMetadata` 改 `request<void>`**，422 判定从"中文文案 includes"改成 `status === 422`。
7. 顺手：`UserInfo` 补 3 个字段 + `password` 可空；`ShopOrder` 补 `price_settle` 与 seller/product 内联类型。

前 4 步全是类型层改动、不碰运行逻辑，`npx tsc --noEmit` 能直接验证；第 5 步要顺带看一眼 `queries.ts` 里两处 `shopApi.products` 调用是否都传了排序参数（今天都传了）。

---

## 附录 A：本次实际发出的请求（全部 GET，可复现）

```bash
TOKEN=1090_zijIu560MmusQM8j
H="Authorization: Bearer $TOKEN"
B=https://emos.best

# 会话 / 账号
curl -sS -H "$H" "$B/api/sign/check"
curl -sS -H "$H" "$B/api/user"
curl -sS -H "$H" "$B/api/user/server/videoHistory"
curl -sS -H "$H" "$B/api/user/passwordTemporary"
curl -sS -H "$H" "$B/api/user/stats/video/history?dates%5B%5D=2026-11-10"
curl -sS -H "$H" "$B/api/carrot/current"
curl -sS -H "$H" "$B/api/carrot/history?page=1&page_size=3"
curl -sS -H "$H" "$B/api/invite/info"
curl -sS -H "$H" "$B/api/invite/history?page=1&page_size=3"
curl -sS -H "$H" "$B/api/invite/tree"
curl -sS -H "$H" "$B/api/ban/list"

# 视频 / 媒体 / 字幕 / 记录 / 求片
curl -sS -H "$H" "$B/api/video/list?page=1&page_size=2"                  # + page=1..5&page_size=100 抽样 500 条
curl -sS -H "$H" "$B/api/video/list?page=1&page_size=3&tmdb_id=313346"
curl -sS -H "$H" "$B/api/video/list?page=1&page_size=2&only_delete=1"
curl -sS -H "$H" "$B/api/video/list?page=1&page_size=2&title=tokyo"
curl -sS -G -H "$H" "$B/api/video/list" --data-urlencode "title=blood" --data-urlencode "page=1" --data-urlencode "page_size=3"   # total 137，中间命中
curl -sS -H "$H" "$B/api/video/list?page=1&page_size=2&with_media=1"
curl -sS -H "$H" "$B/api/video/list?todb_id=79245&page=1&page_size=2"
curl -sS -H "$H" "$B/api/video/search?page=1&page_size=2&title=tokyo"
curl -sS -H "$H" "$B/api/video/126958/season"
curl -sS -H "$H" "$B/api/video/126958/episode?season_number=1&with_seek=1&with_seek_is_request=1"
curl -sS -H "$H" "$B/api/video/33647/episode?season_number=3&with_seek=1&with_seek_is_request=1"
curl -sS -H "$H" "$B/api/video/persons?video_list_id=126958&page=1&page_size=3"   # + 9 部片，39 行
curl -sS -H "$H" "$B/api/video/persons?video_list_id=126958&video_episode_id=3161584"
curl -sS -H "$H" "$B/api/video/getVideoId?video_id_type=tmdb&video_id_value=1600"
curl -sS -H "$H" "$B/api/video/media/list?video_list_id=126958"           # + 6 部片，6918 行
curl -sS -H "$H" "$B/api/video/media/list?video_list_id=126958&include_delete=1"
curl -sS -H "$H" "$B/api/video/media/list?video_list_id=126958&include_metadata=1"
curl -sS -H "$H" "$B/api/video/media/listAll?page=1&page_size=3"
curl -sS -H "$H" "$B/api/video/media/listAll?only_delete=1&page=1&page_size=3"
curl -sS -H "$H" "$B/api/video/media/listAll?status=complete&page=1&page_size=2"
curl -sS -H "$H" "$B/api/video/subtitle/list?video_list_id=126958"
curl -sS -H "$H" "$B/api/video/record/request?page=1&page_size=3"
curl -sS -H "$H" "$B/api/video/record/list?page=1&page_size=3"
curl -sS -H "$H" "$B/api/seek/poll?page_size=5"
curl -sS -H "$H" "$B/api/seek/query?seek_id=1"
curl -sS -H "$H" "$B/api/seek/history?seek_id=1"

# 片单
curl -sS -H "$H" "$B/api/watch?page=1&page_size=50"          # 翻页取全 264 条
curl -sS -H "$H" "$B/api/watch?page=1&page_size=5&is_self=1"
curl -sS -H "$H" "$B/api/watch?page=1&page_size=1&is_public=0"
curl -sS -H "$H" "$B/api/watch?type=music&page=1&page_size=5"
curl -sS -H "$H" "$B/api/watch/1081/video?page=1&page_size=3"
curl -sS -H "$H" "$B/api/watch/1081/video?page=1&page_size=50"
curl -sS -H "$H" "$B/api/watch/1081/video?page=2"
curl -sS -G -H "$H" "$B/api/watch/1081/video" --data-urlencode "video_title=律界狂花"
curl -sS -G -H "$H" "$B/api/watch/1081/video/search" --data-urlencode "title=tokyo" --data-urlencode "with_genre=1"
curl -sS -H "$H" "$B/api/watch/10006/music?page=1&page_size=20"
curl -sS -G -H "$H" "$B/api/watch/10006/music/search" --data-urlencode "song_title=月" --data-urlencode "page_size=8"

# 音乐
curl -sS -H "$H" "$B/api/music/song/list?page=1&page_size=50"          # 3 页，150 条
curl -sS -H "$H" "$B/api/music/song/list?page=1&page_size=5&has_media=1"
curl -sS -H "$H" "$B/api/music/song/20149/media/list"
curl -sS -H "$H" "$B/api/music/song/2807/lyric/list"
curl -sS -H "$H" "$B/api/music/person/list?page=1&page_size=2"
curl -sS -H "$H" "$B/api/music/album/list?page=1&page_size=2"

# 直播 / 线路 / 上传 / 支付 / 商城 / 资金
curl -sS -H "$H" "$B/api/live/list?page=1&page_size=3"
curl -sS -H "$H" "$B/api/live/library"
curl -sS -H "$H" "$B/api/live/media?live_list_id=1101&page=1"
curl -sS -H "$H" "$B/api/proxy/line"
curl -sS -H "$H" "$B/api/upload/image/list?page=1&page_size=2"
curl -sS -H "$H" "$B/api/upload/store/disk"
curl -sS -H "$H" "$B/api/upload/store/file?path_type=local_emos_1"    # 422 需权限，符合预期
curl -sS -H "$H" "$B/api/upload/video/recognize?file_name=test.mp4&provider=binary"
curl -sS -G -H "$H" "$B/api/upload/video/base" --data-urlencode "item_type=vl" --data-urlencode "item_id=1038"
curl -sS -G -H "$H" "$B/api/upload/video/base" --data-urlencode "item_type=vl" --data-urlencode "item_id=126958"   # 404 资源不存在
curl -sS -G -H "$H" "$B/api/upload/video/base" --data-urlencode "item_type=ve" --data-urlencode "item_id=3161584"
curl -sS -H "$H" "$B/api/pay/base"
curl -sS -H "$H" "$B/api/pay/getUserInfo?user_id=e7E6K6OE4s"          # 403，符合注释
curl -sS -H "$H" "$B/api/pay/getUserCarrot?user_id=e7E6K6OE4s"        # 403
curl -sS -H "$H" "$B/api/shop/seller/base"
curl -sS -H "$H" "$B/api/shop/seller/base?seller_id=1001"
curl -sS -H "$H" "$B/api/shop/category/list?seller_id=1002"
curl -sS -H "$H" "$B/api/shop/product/list?page=1&page_size=50&sort_by=sort&sort_order=asc"   # 4 页，120 条
curl -sS -H "$H" "$B/api/shop/product/list?page=1&page_size=2"                                 # 422
curl -sS -H "$H" "$B/api/shop/product/list?page=1&page_size=2&sort_by=updated_at&sort_order=desc"  # 422
curl -sS -H "$H" "$B/api/shop/product/info?product_id=1025"
curl -sS -H "$H" "$B/api/shop/order/user/list?page=1&page_size=50"
curl -sS -H "$H" "$B/api/shop/order/shop/order?page=1&page_size=2"
curl -sS -H "$H" "$B/api/fund/order/list?page=1&page_size=2"

# 排行（用来验证死类型 T24）
curl -sS -H "$H" "$B/api/rank/carrot"
curl -sS -H "$H" "$B/api/rank/upload"
curl -sS -H "$H" "$B/api/rank/userVideoRecordPlaying"
```

**未发出任何 POST / PUT / PATCH / DELETE。**

## 附录 B：这份文档里"实测"的可信边界

- 「实测」= 该账号、该时刻、该资源的一次观测。`null` 率是抽样统计（264 / 500 / 6918 / 150 / 120 / 39 条），不是后端约束的证明；但**"字段从不出现"**这类结论（`image_poster`、`pseudonym`、`image_profile_url`）在 264 ~ 6918 条样本上是 0 次出现，可以当作事实处理。
- 「契约」= `api.postman_collection.json` 里人工写的示例与说明。它自己也有错（`image_poster` 出现在 /api/watch 示例里、`shop/product/list` 没标必填、music person 写 `image_profile` 而实际是 `image_profile_url`）——所以契约与实测冲突时，**以实测为准**，本文已逐条标注。
- 归因：审查期间 `src/` 有并行改动（`src/api/queries.ts` 的 mtime 在变、随后被提交；`ImagePicker.tsx`/`PageHeader.tsx` 也在改），所以**本文引用 `queries.ts` 的地方一律以函数名为准，行号可能漂移**。`src/api/types.ts`（20:38）与 `src/api/endpoints.ts`（23:34）在整段审查期间未变动，行号可信。
