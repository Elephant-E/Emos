# 视频域 API 逐条核对

基线：`rewrite/v2`。取证方式：真实请求 `https://emos.best`，token `1090_zijIu560MmusQM8j`。

## 一、请求字段

| 端点 | Postman 契约字段 | 前端实际传 | 结论 |
|---|---|---|---|
| `GET /api/video/list` | tmdb_id / todb_id / video_id / type / title / only_delete / with_media / page / page_size | 全部 | PASS |
| `GET /api/video/search` | last_id / tmdb_id / todb_id / video_id / type / title / **with_genre** / sort_by / page / page_size | title / page / page_size / sort_by / type | 缺 5 个可选字段；`with_genre` 能带回题材，不用另调接口 |
| `GET /api/video/{id}/season` | — | — | PASS |
| `GET /api/video/{id}/episode` | season_number / **with_seek** / **with_seek_is_request** | 只传 season_number | **缺认领信息**：带 with_seek=1 时每集多返回 `seek` 字段（实测字段确实出现，当前数据为 null） |
| `GET /api/video/persons` | video_list_id / video_season_id / video_episode_id | 全部 | PASS |
| `GET /api/video/media/list` | video_list_id / video_season_id / video_episode_id / video_part_id / include_metadata / include_delete | 前五个 | 缺 include_delete（详情页不展示已删资源，可接受） |
| `GET /api/video/media/listAll` | media_id / user_id / status / only_delete / include_metadata | 加 page / page_size | **契约未写分页，但后端支持**：实测 page=2 返回不同数据，total 360,692 |
| `DELETE /api/video/media/delete` | media_id / reason | 一致 | PASS |
| `PUT /api/video/media/restore` | media_id | 一致 | PASS（前端已按 `is_can_restore` 控制按钮） |
| `PUT /api/video/media/move` | media_id / item_type / item_id | 一致 | PASS |
| `PUT /api/video/media/rename` | media_id / name | 一致 | PASS |
| `GET /api/video/media/playUrl` | media_id | 一致 | PASS（每次 -1 萝卜，缓存 10 分钟） |
| `PUT /api/video/media/syncMetadata` | media_id | 一致 | PASS |
| `GET /api/video/subtitle/list` | video_list_id / video_episode_id / video_part_id / media_id | 一致 | PASS |
| `DELETE /api/video/subtitle/delete` | subtitle_id / reason | 一致 | PASS |
| `PUT /api/video/subtitle/rename` | subtitle_id / title | 一致 | PASS |
| `PATCH /api/video/sync` | tmdb_id / todb_id（二选一） | 一致 | PASS，但**契约要求「返回数组为空时提示在 todb 平台先添加数据」，前端未处理** |
| `PUT /api/video/{id}/delete` | — | — | PASS |

## 二、响应字段

### `GET /api/video/persons` —— 返回 15 个字段，前端只用 3 个

```
返回：biography / birthday / birthplace / gender / id / image_profile / is_adult /
      is_virtual / job / name / original_name / person_id / person_id_tmdb / tagline / title
使用：image_profile / name / job
```

实测第一条：`{name: '昱霖', job: null, title: '陈拾'}`

- `title` 是**角色名**，前端写的是 `person.job ?? person.title`，于是演职员卡片显示成「昱霖 / 陈拾」，没有说明这是「饰演的陈拾」
- `job` 为 null 时（演员表常见），职位信息完全丢失

### `GET /api/video/{id}/episode`

带 `with_seek=1` 才返回 `seek`（认领信息）与 `with_seek_is_request`。前端没传，因此**无法在集号格子上标记「这集被求片」**。当前集号格子只有绿点表示「有资源」。

## 三、UI 未接入但契约存在的端点

| 端点 | 用途 | 是否值得接 |
|---|---|---|
| `GET /api/video/tree` | 按 type/title/tmdb/todb/video_id 查片库树 | 与 video/list 重复，暂不接 |
| `GET /api/video/getVideoId` | 用 tmdb/todb id 反查 video_id | 有用：拿到外部 id 时可直接定位 |
| `GET /api/video/record/request` | 近一周播放记录，admin 可查全局 | 有用：可做「谁在什么时候看的」 |
| `PUT /api/video/record/change` | 批量把某视频/某季/某集的记录标记删除或完成 | 有用：清理异常播放记录 |

## 四、上传域

| 端点 | 结论 |
|---|---|
| `POST /api/upload/getUploadToken` | **契约有 5 个字段，前端只传 4 个，缺 `file_storage`**。上传页有存储盘选择器，但只用于「暂存区浏览」和「归档」，上传本身不指定盘 —— 用户选的盘不影响文件落点 |
| `POST /api/upload/video/saveInternal` | 契约明写「接口于 261018 因麻佬服务到期废弃」，前端仍保留封装（在 endpoints.ext.ts），应删 |
| `presign` / `complete` / `abort`（multipart 系列） | 后端实际用 tusd，这三个是 S3 分片协议，不适用，应删 |
| `POST /api/upload/store/archive` | item_type / item_id / path_type / file_name，已补齐，PASS |
| `GET /api/upload/video/recognize` | 用于识别片名，PASS |
| `image/list` / `image/delete` | 图片管理，UI 未接 |

## 五、待确认（需要产品判断）

1. ~~`is_can_restore`~~ —— 已确认前端用了：`RecycleView.tsx:158` 的 `row.is_can_restore !== false`，与契约一致。
2. **`file_storage`**：上传是否应该跟随用户选的存储盘，还是固定默认盘。
3. **`with_seek`**：剧集列表是否要显示「这集被求片」的状态。


## 六、用户域顺带核对（我做的部分）

`GET /api/user` 返回 25 个字段，UI 未使用的：

| 字段 | 情况 |
|---|---|
| `is_have_emps` | 契约无注释，旧项目也没用过，含义不明 |
| `is_show_watch_default` | 与 `is_show_empty` 同类设置，但**后端没有对应的写接口**（user 域写接口只有 showEmpty / pseudonym / sign / passwordReset / agreeUploadAgreement），只读不可改 |
| `telegram_group_url` | TG 群链接，可以直接展示成「加入群组」入口，当前未用 |

`GET /api/user/server/videoHistory`（已登录设备列表）与 `POST /api/user/server/videoLogout`（远程登出）
两个端点有封装但未接入 UI —— 属于账号安全功能，值得做。
