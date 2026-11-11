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

视频保存可能返回 422「视频正在合并中 请等待1分钟后再保存试下」——这是正常的等待信号。

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

## 暂存区是第四件事

`GET /api/upload/store/disk` 返回暂存区在哪些盘上（`local_emos_1` 这类），
`GET /api/upload/store/file?path_type=` 列暂存文件，
`POST /api/upload/store/archive` 把暂存文件归档到某部影片。

它和上面三个都不一样：**文件已经传上去了，只是还没入库**。

**需要单独申请权限**：`store/file` 对没有权限的账号返回
`422 {"message":"请先申请权限后使用"}`。所以上传页对这种情况整块不显示
（连「暂存盘」下拉一起），而不是挂一块错误提示。

「暂存盘」下拉只决定浏览哪个盘，不是上传参数，放在暂存区那张卡里，
不要和「上传落点」（`getUploadToken` 的 `file_storage`）混成一个概念。
