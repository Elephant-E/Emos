# 契约验证（用 Postman 里记录的真实响应）

我这边连不上 `test.emos.best`：该域名没有公网 A 记录，只在你本机的代理里解析；
TCP 能建连但 TLS ClientHello 立刻被 reset。所以我换了验证方式——

把集合里 **158 条真实响应**导出成 fixtures，让前端直接跑这些数据：

```bash
VITE_MOCK=fixtures npm run dev
```

这条路验证的是「我的字段解析能不能吃下真实响应」，比手点更严格。

## 已验证通过（12 个路由全部渲染，无报错、无 undefined）

`/`、`/library`、`/media/1`、`/watchlists`、`/watchlists/1000`、`/seek`、`/upload`、
`/account`、`/shop`、`/orders`、`/live`、`/lines`

关键契约确认：

| 项 | 结果 |
|---|---|
| 列表信封 | `{page, page_size, total, items}` ✔ |
| 影视字段 | `video_title / video_type / medias_count / subtitles_count / video_date_air` ✔ |
| 影片详情来源 | `/api/video/list?video_id=` 取 `items[0]` ✔（确实没有单条接口） |
| 季 | `season_number / season_title / season_id` ✔ |
| 集 | **`?season_number=` 不会过滤**，接口返回全部季的集，必须按 `season_id` 前端过滤 ✔（已修） |
| 片单 | `id / name / video_count / subscribe_count / tags / carrot / is_edit_video` ✔ |
| 求片 | `status ∈ default/upload/complete`、`seek_carrot`、`is_can_claim` ✔ |
| 账号 | `is_can_upload / slot_remaining / carrot` ✔ |
| 店铺 | `status: examine` → 审核中 ✔ |
| 直播 | `live/list`、`live/media`、`live/library` ✔ |
| 线路 | `proxy/line` 数组，`is_self` 决定能否删除 ✔ |

## 这轮验证改掉的真问题

1. **季/集串季**：`/episode?season_number=N` 在真实环境里返回全部集（记录的那次响应就是全季的），
   列表里出现 01、01、01、01 反复。改为按 `season_id` 过滤后才正确（西部世界 S1 十集正常）。
2. **集行被截断**：标题、时长、资源、字幕挤一行，右半截被切。改为两行（标题 / 元信息）。
3. **季切换器溢出**：五个长季名把段落撑爆，改成可横向滚动的 tab。
4. **fixtures 模式被登录守卫拦回 /login**：守卫判断的是 `VITE_MOCK === '1'`，没覆盖 `fixtures`。

## 仍无法离线验证的两处

| 接口 | 原因 | 影响 |
|---|---|---|
| `GET /api/video/media/list` | 集合里只记录了 `listAll`，没有这个 | 详情页资源列表用的是手写兜底，字段按 `media_id/media_name/media_file_size/user_pseudonym` 猜的 |
| `POST /api/upload/getUploadToken` | 只记录了失败响应（"此资源您一周内上传过"） | 成功响应里 file_id 的字段名未知，代码按 `file_id/fileId/id/file_key/key/upload_id` 依次尝试 |

这两处等你连上后端跑一次就能定，改动点都在一个函数里。
