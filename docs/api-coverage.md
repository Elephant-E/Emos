# API 覆盖对照

文档（`api.postman_collection.json`）：**190** 个接口；
代码（`src/api/endpoints.ts`）：**150** 个封装。

- 已接且有界面调用：**139**
- 已接但无调用：**8**
- 未接：**41**
- 代码有、文档没有：**3**
- 文档里 url 是空的：**2**

由 `scripts/check-api-coverage.py` 生成，结论按代码静态扫描得出。

## 未接（文档有、代码无封装）

| 分组 | 接口 | 方法 路径 |
|---|---|---|
| 登录相关 | link登录跳转 | `GET /link` |
| 用户相关 | 简单的信息 | `GET /api/user/base` |
| 邀请相关 | 退出邀请 | `POST /api/invite/exit` |
| 邀请相关 | 邀请用户进入emps | `POST /api/invite/emps` |
| 上传相关 / 视频 | 内部入库 | `POST /api/upload/video/saveInternal` |
| 上传相关 / 音乐 | 保存为群星版本 | `POST /api/upload/music/saveHeadless` |
| 上传相关 / 分片上传 | 客户端上传分片 | `PUT https://emos.local/xxxx` |
| 上传相关 / 储存 | 可用储存列表 | `GET /api/upload/store/disk` |
| 上传相关 / 储存 | 暂存区文件 | `GET /api/upload/store/file` |
| 上传相关 / 储存 | 暂存区文件入库 | `POST /api/upload/store/archive` |
| 视频相关 | 搜索获取目录树 | `GET /api/video/tree` |
| 片单相关 / 视频类 | 批量设置片单内视频 | `POST /api/watch/{var}/video/update` |
| 片单相关 | 查看已订阅用户 | `GET /api/watch/{var}/user` |
| 榜单相关 | 萝卜排行榜 | `GET /api/rank/carrot` |
| 榜单相关 | 上传量排行榜 | `GET /api/rank/upload` |
| 榜单相关 | 正在播放 | `GET /api/rank/userVideoRecordPlaying` |
| 榜单相关 | 正在播放-live | `GET /api/rank/userLiveRecordPlaying` |
| 榜单相关 | 签到排行榜 | `GET /api/rank/sign` |
| 支付相关 | 转账给用户 | `POST /api/pay/transfer` |
| 支付相关 | 创建订单 | `POST /api/pay/create` |
| 支付相关 | 测试回调 | `POST /api/pay/testNotify` |
| 支付相关 | 给用户发送邮件通知 | `POST /api/pay/sendNotifyEmail` |
| 支付相关 | 查询用户签到信息 | `GET /api/pay/getUserSign` |
| 红包相关 | 在 telegram 发 html 格式红包 | `POST /api/redPacket/createTelegramHtml` |
| Telegram相关 / 投票 | 创建投票 | `POST /api/telegram/vote/create` |
| Telegram相关 / 投票 | 查看投票结果 | `GET /api/telegram/vote/result` |
| 抽奖相关 | 创建抽奖 | `POST /api/lottery/create` |
| 抽奖相关 | 查看中奖列表 | `GET /api/lottery/win` |
| 抽奖相关 | 取消抽奖 | `PUT /api/lottery/cancel` |
| 抽奖相关 | 手动开奖 | `PUT /api/lottery/stop` |
| 音乐相关 / 其他 | 用spotify歌手去todb同步数据 | `PATCH /api/music/syncSpotifyArtist` |
| 音乐相关 / 音乐 | 更新关联的视频ID | `PUT /api/music/song/{var}/updateVideoId` |
| 音乐相关 / 音乐 | 通过hash批量判断资源是否存在 | `POST /api/music/song/batchHashExist` |
| 音乐相关 / 专辑 | 更新关联的视频ID | `PUT /api/music/album/{var}/updateVideoId` |
| 影院相关 | 随机影片 | `GET /api/reel/rand` |
| 影院相关 | 影片信息 | `GET /api/reel/info/{var}` |
| 影院相关 | 添加影片 | `POST /api/reel/create` |
| 影院相关 | 媒体列表 | `GET /api/reel/media` |
| 影院相关 | 获取播放清单 | `POST /api/reel/manifest` |
| 影院相关 | 更新播放进度 | `POST /api/reel/progress` |
| 基金相关 / 订单 | 判断是否可以参与活动 | `POST /api/fund/order/check` |

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
| 片单相关 / 视频类 | `watchApi.emptyVideos` | `DELETE /api/watch/{var}/video/empty` | 清空片单内视频；片单详情现在只能一条条移除 |
| 片单相关 / 音乐类 | `watchApi.emptyMusic` | `DELETE /api/watch/{var}/music/empty` | 清空片单内音乐，同上 |
| 求片相关 | `seekApi.query` | `GET /api/seek/query` | 求片详情；求片页只有列表，看不到这条求片的完整信息与谁给了胡萝卜 |
| 求片相关 | `seekApi.history` | `GET /api/seek/history` | 求片的胡萝卜记录，同上 |
| 支付相关 | `payApi.close` | `PUT /api/pay/close` | 支付服务没有「关闭」入口；申请下来之后只能一直开着 |
| 支付相关 | `payApi.userCarrot` | `GET /api/pay/getUserCarrot` | 见 pay/transfer：本站转赠走 carrot 域 |

## 该补的缺口

| 分组 | 接口 | 方法 路径 | 说明 |
|---|---|---|---|
| 邀请相关 | 退出邀请 | `POST /api/invite/exit` | 退出被邀请的关系；邀请页没有这个入口 |
| 邀请相关 | 邀请用户进入emps | `POST /api/invite/emps` | 邀请用户进入 emps |
| 片单相关 / 视频类 | 批量设置片单内视频 | `POST /api/watch/{var}/video/update` | 批量设置片单内视频；现在只能一条条加/删 |
| 片单相关 | 查看已订阅用户 | `GET /api/watch/{var}/user` | 查看片单订阅用户；旧项目片单详情有 |
| 榜单相关 | 萝卜排行榜 | `GET /api/rank/carrot` | 萝卜排行榜，旧项目 CarrotModal 有 |
| 榜单相关 | 上传量排行榜 | `GET /api/rank/upload` | 上传量排行榜，旧项目 UploadRankModal 有 |
| 榜单相关 | 正在播放 | `GET /api/rank/userVideoRecordPlaying` | 正在播放，旧项目 ViewingModal 有 |
| 榜单相关 | 正在播放-live | `GET /api/rank/userLiveRecordPlaying` | 正在播放（直播），同上 |
| 榜单相关 | 签到排行榜 | `GET /api/rank/sign` | 签到排行榜，旧项目 SignRankModal 有 |
| 支付相关 | 查询用户签到信息 | `GET /api/pay/getUserSign` | 查用户签到信息（支付服务） |
| Telegram相关 / 投票 | 创建投票 | `POST /api/telegram/vote/create` | 创建投票，旧项目 VoteModal 有 |
| Telegram相关 / 投票 | 查看投票结果 | `GET /api/telegram/vote/result` | 查看投票结果，同上 |
| 抽奖相关 | 创建抽奖 | `POST /api/lottery/create` | 创建抽奖，旧项目 LotteryModal 有 |
| 抽奖相关 | 查看中奖列表 | `GET /api/lottery/win` | 中奖列表，同上 |
| 抽奖相关 | 取消抽奖 | `PUT /api/lottery/cancel` | 取消抽奖，同上 |
| 抽奖相关 | 手动开奖 | `PUT /api/lottery/stop` | 手动开奖，同上 |

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
| 搜索获取目录树 | `GET /api/video/tree` | 取目录树，后台用不上（列表页走 /api/video/list） |
| 转账给用户 | `POST /api/pay/transfer` | 支付服务内的转账；胡萝卜转赠已用 /api/carrot/transfer |
| 创建订单 | `POST /api/pay/create` | 支付单由用户侧发起，后台只处理已有订单 |
| 测试回调 | `POST /api/pay/testNotify` | 回调自测，联调用 |
| 给用户发送邮件通知 | `POST /api/pay/sendNotifyEmail` | 手工发通知邮件，运营一次性动作 |
| 在 telegram 发 html 格式红包 | `POST /api/redPacket/createTelegramHtml` | 发到 Telegram 频道，bot 侧入口，后台没有场景 |
| 用spotify歌手去todb同步数据 | `PATCH /api/music/syncSpotifyArtist` | 从 Spotify 同步歌手，一次性数据修补 |
| 更新关联的视频ID | `PUT /api/music/song/{var}/updateVideoId` | 手工关联歌曲与影片，数据修补 |
| 通过hash批量判断资源是否存在 | `POST /api/music/song/batchHashExist` | 按 hash 批量判重，上传前的客户端逻辑 |
| 更新关联的视频ID | `PUT /api/music/album/{var}/updateVideoId` | 同上（专辑） |

## 代码有、文档没有

这几个代码里在用，但 `api.postman_collection.json` 没收录，说明集合比实现对旧。

| 封装 | 方法 路径 | 调用方 |
|---|---|---|
| `userApi.agreeDown` | `PUT /api/user/agreeDownAgreement` | 1 |
| `userApi.originalImage` | `PUT /api/user/originalImage` | 1 |
| `userApi.unbindTelegram` | `DELETE /api/user/telegram` | 1 |
