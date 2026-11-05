# 上传协议实测记录

## getUploadToken 的真实契约

必填四项（少任何一项返回 422）：

```json
{ "type": "subtitle", "file_type": "text/plain", "file_name": "qa.srt", "file_size": 48 }
```

`type` 取值：`video` / `subtitle` / `image` / `audio` / `music`。

## 返回值不是 S3，是 tusd

```json
{ "type": "tusd", "file_id": "QEDlQdg5EpWZ", "data": { "upload_url": "https://file.emos.best/files/" } }
```

`/api/upload/multipart/{file_id}/presign` 对小文件返回 **「此文件不支持分片上传」**。

结论：**当前 `src/lib/uploader.ts` 按 S3 分片协议实现（presign → PUT parts → complete），
与后端实际使用的 tus 协议不匹配。媒体上传与字幕上传都需要按 tus 重写。**

tus 创建流程（待验证）：POST `upload_url` +
`Tus-Resumable: 1.0.0` + `Upload-Length` + `Upload-Metadata`。
实测直接这样请求返回 422，缺少鉴权或 metadata 约定，需后端给出示例。

## 状态

- ✅ `file_size` 已补（缺它必 422）
- ❌ 上传链路未跑通，不能宣称「字幕上传可用」
