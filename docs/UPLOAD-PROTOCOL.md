# 上传协议（按 wiki.emos.best/api/upload 校对）

## 上传分三类

| type | 说明 |
|---|---|
| `video` | 片源。需要先知道往哪部影片/哪一集入库 |
| `subtitle` | 字幕。只要拿到目标集 id 即可直接保存 |
| `image` | 图片。用于封面一类 |

## 三步

```
getUploadToken → 按返回的 type 选上传方式 → save
```

### 1. getUploadToken

`POST /api/upload/getUploadToken`

```json5
{
  "type": "video",          // video / subtitle / image
  "file_type": "video/mp4",
  "file_name": "demo.mp4",
  "file_size": 250817,      // 字节，必填，缺了 422
  "file_storage": "default" // 见下
}
```

`file_storage` 决定落点：

| 值 | 含义 |
|---|---|
| `default` | 默认 |
| `global` | 国际 |
| `internal` | 国内 |
| `zn_r2_upload` | Zn 存档服 R2 |
| `google_drive` | 谷歌盘 |

实测：该实例对五个取值（含非法值）都返回 200 且 `type: tusd`，
即目前统一走 tusd，参数未生效；仍按契约传。

返回：

```json5
{ "type": "onedrive", "file_id": "xWDKXEMv2E", "data": { "upload_url": "url" } }
```

`type` 决定上传方式：

| type | 方式 |
|---|---|
| `tusd` | tus 协议（本实例），用 tus-js-client，metadata 带 user_id + file_id |
| `r2` / `local` | 直接 PUT 整个文件 |
| `onedrive` | PUT + `Content-Range`，分片需 320 KB 整数倍 |
| `google_drive` | 同上，分片 256 KB 整数倍、最小 5 MB |
| `multipart` | 分片凭证 → 逐片 PUT → complete |

### 2. 视频要先取基本信息

`GET /api/upload/video/base?item_type=&item_id=`

`item_type` 只有两种：电影 `vl`、电视剧集 `ve`。

返回的 `title` 就是入库后显示的名字，剧集形如
`【我推的孩子】 - S01E03 - 漫画原作的电视剧`。

### 3. 保存

```
POST /api/upload/video/save     { item_type, item_id, file_id } → { count, carrot, media_id }
POST /api/upload/subtitle/save  { item_type, item_id, file_id } → { carrot, subtitle_id }
```

视频保存可能返回 422「视频正在合并中 请等待1分钟后再保存试下」——这是正常的等待信号，不是失败。

## 暂存区是另一件事

`GET /api/upload/store/disk` 返回的是**暂存区在哪些盘上**（`local_emos_1` 这类），
`GET /api/upload/store/file?path_type=` 列暂存文件，`POST /api/upload/store/archive`
把暂存文件归档到某部影片。

它和 `file_storage` 不是一个概念：前者是「已上传但还没入库的文件在哪」，
后者是「这次上传要落到哪」。界面上是两个独立的下拉。

## 已实测

```
POST /api/upload/getUploadToken           200
POST https://file.emos.best/files/        201   tus 创建
PATCH https://file.emos.best/files/...    200   tus 分片
POST /api/upload/subtitle/save            200
DELETE /api/video/subtitle/delete         {"carrot":1}
```

字幕列表需要 `video_list_id` **和** `video_episode_id` 同时给。
