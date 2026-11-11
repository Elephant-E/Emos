# 上传：三条不同的路

上传不是一个功能。按旧项目（`a01e9a0` 的 `uploader.js` / `uploadStorage.js` /
`ImageUploader.vue`）的划分，它们是三件互不相干的事。

| | 做什么 | 落点 | 代码 |
|---|---|---|---|
| **资源上传** | 视频、字幕，必须绑到某部影片的某一集 | `upload/video/save`、`upload/subtitle/save` | 上传页 |
| **图床** | 图片，传一次到处引用 | `upload/image/list` | `ImagePicker` 组件 |
| **临时上传** | 换一个能直接用的直链，不入库 | `temporary.emos.best/upload` | `uploadTemporary()` |

---

## 一、资源上传

### 上传前先做四件事

旧项目（`uploadStore.js` + `identify.js`）在真正传之前有一轮检查，新后台按同样的顺序做：

| 是哪一类 | `detectUploadKind()`：视频 / 字幕 / 音乐，其余（图片等）不收<br>mime 之外按扩展名兜（`.mkv` 常是 `octet-stream`） | 不支持的跳过并提示 |
| 队列里有没有同一份 | 文件名 + 大小都和队列里某条相同 | 跳过并提示 |
| 文件名能不能认出是哪一部 | `GET /api/upload/video/recognize?file_name=` | 认不出 → 待关联，手动选目标 |
| **落点上是不是已经有这份文件** | `GET /api/upload/video/base?item_type=&item_id=` 的 `video_medias`，比 `media_file_size`<br>只对视频做 | 撞上 → 状态「重复」，**不允许上传** |

查重只比文件大小（旧项目也是这么做的）：转码或重封装过的同一部片大小不同，抓不到。
命中时状态是「重复」而不是「失败」—— 失败可以重试，重复重试只会把同一份文件再传一遍。

同时把 `video_medias.length` 显示成「已有 N 个资源」，传之前就能看到这个落点上有什么。

### 三类文件走同一条队列

上传页同时收**视频、字幕、音乐**，按类型分流（旧项目 `detectFileType` 也是这么分的）：

| 类型 | 选什么目标 | 上传 | 保存 |
|---|---|---|---|
| 视频 | 影片 / 某一集 | `getUploadToken(type=video)` | `upload/video/save` |
| 字幕 | 影片 / 某一集 | `getUploadToken(type=subtitle)` | `upload/subtitle/save` |
| 音乐 | 某一首歌 | `getUploadToken(type=music)` | `upload/music/save` |

**图片不在这一页**：商品封面与片单封面走 `ImagePicker`（传一次进图库、到处引用），
红包封面那类「换一个能直接用的直链」走 `temporary.emos.best`，都不是入库体系。

音乐没有文件名识别可用（旧项目的 `/api/identify` 已 404）：

```
文件名 → 去掉扩展名与开头音轨号，「歌手 - 歌名」取歌名那段 → GET /api/music/song/search
  唯一命中 → 直接绑上
  没有或多条 → 状态「待选歌」，手动搜一首
```

### 三步

```
getUploadToken → 按返回的 type 上传 → save
```

`getUploadToken` 请求体：

```json5
{
  "type": "video",            // video 视频 / subtitle 字幕 / image 图片 / music 音乐
  "file_type": "video/mp4",
  "file_name": "demo.mp4",
  "file_size": 250817,        // 字节，必填，缺了 422
  "file_storage": "zn_r2_upload"
}
```

### 存储落点只暴露两个

旧项目 `uploadStorage.js` 的原话：

| 值 | 状态 |
|---|---|
| `global` | 已停用 |
| `internal` | 已停用 |
| `default` | 已停用（后端不再分配可用存储设备） |
| `zn_r2_upload` | **可用**，默认选它 |
| `google_drive` | **可用**，不支持国内直传，有 CORS 限制 |

### 返回的 type 决定怎么传

| type | 方式 |
|---|---|
| `tusd` | tus 协议（本实例用的就是这个），tus-js-client，metadata 带 user_id + file_id |
| `multipart` | presign → 逐片 PUT（拿 ETag）→ complete；失败 abort |
| `onedrive` | PUT + `Content-Range`，分片必须是 320 KB 整数倍 |
| `google_drive` | 同上，分片 256 KB 整数倍、最小 5 MB |
| `r2` / `local` | 整文件 PUT |

### 批量

一次最多 3 个并发（旧项目默认 3、上限 10）。工具栏的「全部上传」只跑状态为「待上传」的项，
「重复」和「待关联」不参与。

### 保存

```
POST /api/upload/video/save     { item_type, item_id, file_id } → { count, carrot, media_id }
POST /api/upload/subtitle/save  { item_type, item_id, file_id } → { carrot, subtitle_id }
```

`item_type`：电影 `vl`（`item_id` 是 `video_id`）、电视剧集 `ve`（`item_id` 是 `episode_id`）。

**电影没有季集**（真机实测：电影的 `/season` 与 `/episode` 都返回空数组），所以：
- 资源与字幕都挂影片级 `vl`
- 影片详情页对电影不显示「季与集」那一栏
- 上传页识别电影返回 `item_type: "vl"`，识别剧集返回 `ve` + `episode_id`

上传页的**手动选目标**也要能落到集：选到剧集后依次选季、选集，否则资源挂不上去。

视频保存可能返回 422「视频正在合并中 请等待1分钟后再保存试下」——这是正常的等待信号，
保存失败会重试 3 次（间隔 3s / 6s / 9s），和旧项目一致。

上传前可以用 `GET /api/upload/video/base?item_type=&item_id=` 拿到准确的
入库标题，剧集形如 `【我推的孩子】 - S01E03 - 漫画原作的电视剧`。

---

## 二、图床（图片）

图片不需要绑定任何东西，传上去就进图库，需要的地方选一张、拿直链。

```tsx
<ImagePicker
  label="封面"
  value={form.cover_url}
  onChange={(url) => setForm({ ...form, cover_url: url })}
/>
```

弹窗里三件事：按文件名搜索、点选、删图；底部可以上传新图。
上传走 `uploadImage()`（内部就是 `getUploadToken(type=image)` + 上传）。

目前接了两处：

| 位置 | 字段 |
|---|---|
| 商品表单 | `cover_url` |
| 片单表单 | `image_poster_url` |

---

## 三、临时上传

独立服务，不属于入库体系：

```ts
POST https://temporary.emos.best/upload
FormData: file + emos_id
Header:   Authorization: Bearer <token>
→ { url }
```

单文件 80MB 以内。旧项目里这个只给红包封面用。

当前后台没有对应功能，能力先在 `uploadTemporary()` 里备着。

---

## 不做：暂存区

`GET /api/upload/store/disk`、`GET /api/upload/store/file?path_type=`、
`POST /api/upload/store/archive` 这三个接口提供「浏览/归档已经传到存储、
但还没绑定到影片的文件」。

**没有接，并且已经从代码里删掉**（界面、`uploadApi` 封装、mock 一起删）：

```
GET /api/upload/store/file?path_type=local_emos_1
→ 422 {"message":"请先申请权限后使用"}
```

这个能力要单独申请权限，连管理员 token 都拿不到，等于对谁都不可用 ——
留一个永远是错误态或永远空着的卡片没有意义。

如果以后真的拿到权限，按上面的三个接口重新接即可：归档的 `item_type`
和上传一致（电影 `vl` / 剧集 `ve`），归档成功要给影片资源、媒体列表和
胡萝卜余额做失效。
