# API 覆盖对照

文档（`api.postman_collection.json`）：**190** 个接口；
代码（`src/api/endpoints.ts`）：**166** 个封装。

- 已接且有界面调用：**161**
- 已接但无调用：**2**
- 未接：**25**
- 代码有、文档没有：**3**
- 文档里 url 是空的：**2**

由 `scripts/check-api-coverage.py` 生成，结论按代码静态扫描得出。

## 未接（文档有、代码无封装）

| 分组 | 接口 | 方法 路径 |
|---|---|---|
| 登录相关 | link登录跳转 | `GET /link` |
| 用户相关 | 简单的信息 | `GET /api/user/base` |
| 上传相关 / 视频 | 内部入库 | `POST /api/upload/video/saveInternal` |
| 上传相关 / 音乐 | 保存为群星版本 | `POST /api/upload/music/saveHeadless` |
| 上传相关 / 分片上传 | 客户端上传分片 | `PUT https://emos.local/xxxx` |
| 上传相关 / 储存 | 可用储存列表 | `GET /api/upload/store/disk` |
| 上传相关 / 储存 | 暂存区文件 | `GET /api/upload/store/file` |
| 上传相关 / 储存 | 暂存区文件入库 | `POST /api/upload/store/archive` |
| 视频相关 / 资源相关 | 获取播放地址 | `GET /api/video/media/playUrl` |
| 视频相关 | 搜索获取目录树 | `GET /api/video/tree` |
| 片单相关 / 视频类 | 批量设置片单内视频 | `POST /api/watch/{var}/video/update` |
| 支付相关 | 转账给用户 | `POST /api/pay/transfer` |
| 支付相关 | 创建订单 | `POST /api/pay/create` |
| 支付相关 | 测试回调 | `POST /api/pay/testNotify` |
| 红包相关 | 在 telegram 发 html 格式红包 | `POST /api/redPacket/createTelegramHtml` |
| 音乐相关 / 音乐 / 资源 | 获取播放地址 | `GET /api/music/song/{var}/media/playUrl` |
| 音乐相关 / 音乐 | 更新关联的视频ID | `PUT /api/music/song/{var}/updateVideoId` |
| 音乐相关 / 音乐 | 通过hash批量判断资源是否存在 | `POST /api/music/song/batchHashExist` |
| 音乐相关 / 专辑 | 更新关联的视频ID | `PUT /api/music/album/{var}/updateVideoId` |
| 影院相关 | 随机影片 | `GET /api/reel/rand` |
| 影院相关 | 影片信息 | `GET /api/reel/info/{var}` |
| 影院相关 | 添加影片 | `POST /api/reel/create` |
| 影院相关 | 媒体列表 | `GET /api/reel/media` |
| 影院相关 | 获取播放清单 | `POST /api/reel/manifest` |
| 影院相关 | 更新播放进度 | `POST /api/reel/progress` |

## 文档里 url 是空的（没法判断）

| 分组 | 接口 |
|---|---|
| 用户相关 | 更改是否显示片单默认 |
| 音乐相关 / 歌手 | 歌手详情 |

## 已接但无调用（封装在、没人调）

| 分组 | 封装 | 方法 路径 | 判断 |
|---|---|---|---|
| 视频相关 / 观影记录 | `recordApi.change` | `PUT /api/video/record/change` | 改观影记录，用户侧行为 |
| 视频相关 | `videoApi.getVideoId` | `GET /api/video/getVideoId` | 按 todb/tmdb 反查 video_id，页面都有 video_id |

## 刻意不接 / 后台工具

| 接口 | 方法 路径 | 原因 |
|---|---|---|
| link登录跳转 | `GET /link` | 浏览器跳转用的授权链接，不是 API 调用；LoginView 里拼字符串 |
| 简单的信息 | `GET /api/user/base` | 字段是 /api/user 的子集，已有 /api/user |
| 内部入库 | `POST /api/upload/video/saveInternal` | 内部入库，服务端任务用 |
| 保存为群星版本 | `POST /api/upload/music/saveHeadless` | 「保存为群星版本」，契约里写明不建议；正常路径是先去 todb 补歌 |
| 客户端上传分片 | `PUT https://emos.local/xxxx` | 客户端分片上传的 PUT 目标（multipart/onedrive 直传），走 uploader 的 uploadObject，不是普通接口 |
| 可用储存列表 | `GET /api/upload/store/disk` | 暂存区需单独申请权限，管理员 token 也 422，已整体删除 |
| 暂存区文件 | `GET /api/upload/store/file` | 同上 |
| 暂存区文件入库 | `POST /api/upload/store/archive` | 同上 |
| 获取播放地址 | `GET /api/video/media/playUrl` | 播放地址按需求不展示 |
| 搜索获取目录树 | `GET /api/video/tree` | 取目录树，后台用不上（列表页走 /api/video/list） |
| 批量设置片单内视频 | `POST /api/watch/{var}/video/update` | 批量重置片单内容的对外接口：契约写明「请先联系官方确认」，且每次提交会清空整个片单 |
| 转账给用户 | `POST /api/pay/transfer` | 支付服务内的转账；胡萝卜转赠已用 /api/carrot/transfer |
| 创建订单 | `POST /api/pay/create` | 支付单由用户侧发起，后台只处理已有订单 |
| 测试回调 | `POST /api/pay/testNotify` | 回调自测，联调用 |
| 在 telegram 发 html 格式红包 | `POST /api/redPacket/createTelegramHtml` | 发到 Telegram 频道，bot 侧入口，后台没有场景 |
| 获取播放地址 | `GET /api/music/song/{var}/media/playUrl` | 播放地址按需求不展示 |
| 更新关联的视频ID | `PUT /api/music/song/{var}/updateVideoId` | 手工关联歌曲与影片，数据修补 |
| 通过hash批量判断资源是否存在 | `POST /api/music/song/batchHashExist` | 按 hash 批量判重，上传前的客户端逻辑 |
| 更新关联的视频ID | `PUT /api/music/album/{var}/updateVideoId` | 同上（专辑） |
| 随机影片 | `GET /api/reel/rand` | 随机会话：为一部影片开一次放映，返回 forge_reel_uuid |
| 影片信息 | `GET /api/reel/info/{var}` | 查这次放映的进度：哪一季哪一集、哪个源、第几秒、是否播完 |
| 添加影片 | `POST /api/reel/create` | 为指定影片开一次放映，用户侧动作 |
| 媒体列表 | `GET /api/reel/media` | 放映时挑版本，versions 带每个源的编码流信息 |
| 获取播放清单 | `POST /api/reel/manifest` | 按播放器支持的 codecs 取播放清单 |
| 更新播放进度 | `POST /api/reel/progress` | 上报播放进度，客户端定期发送 |

## 代码有、文档没有

这几个代码里在用，但 `api.postman_collection.json` 没收录，说明集合比实现对旧。

| 封装 | 方法 路径 | 调用方 |
|---|---|---|
| `userApi.agreeDown` | `PUT /api/user/agreeDownAgreement` | 1 |
| `userApi.originalImage` | `PUT /api/user/originalImage` | 1 |
| `userApi.unbindTelegram` | `DELETE /api/user/telegram` | 1 |
