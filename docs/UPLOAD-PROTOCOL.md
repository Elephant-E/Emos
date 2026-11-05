# 上传协议（已按 wiki.emos.best 实现并真机验证）

## 流程

三步：`getUploadToken` → 按存储类型上传 → `save`

`getUploadToken` 必填：`type`（video/subtitle/image）、`file_type`、`file_name`、`file_size`（字节）。

返回 `{ type, file_id, data: { upload_url } }`，`type` 决定上传方式：

| type | 方式 |
|---|---|
| `tusd` | tus 协议（本实例用的就是这个），用 `tus-js-client`，metadata 带 `user_id` + `file_id` |
| `r2` / `local` | 直接 PUT 整个文件 |
| `onedrive` | PUT + `Content-Range`，分片需 320 KB 整数倍 |
| `google_drive` | 同上，分片 256 KB 整数倍、最小 5 MB |
| `multipart` | 分片凭证 → 逐片 PUT → `complete` |

保存：

```
POST /api/upload/video/save     { item_type, item_id, file_id } → { count, carrot, media_id }
POST /api/upload/subtitle/save  { item_type, item_id, file_id } → { carrot, subtitle_id }
```

`item_type`：电影 `vl`、剧集 `ve`。视频保存可能返回 422「视频正在合并中」。

## 已实测（2026-11-05，真实上传后清理）

```
POST /api/upload/getUploadToken           200
POST https://file.emos.best/files/        201   ← tus 创建
PATCH https://file.emos.best/files/...    200   ← tus 分片
POST /api/upload/subtitle/save            200   ← 拿到 subtitle_id
DELETE /api/video/subtitle/delete         {"carrot":1}  ← 清理测试数据
```

字幕列表需要 `video_list_id` **和** `video_episode_id` 同时给，只给后者会 422。
