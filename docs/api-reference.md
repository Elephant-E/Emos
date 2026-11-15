# API 参考

由 `api.postman_collection.json` 生成（21 个分组）。
只做格式转换：分组、名称、说明、请求体、示例响应都按原样搬过来。

路径里的 `{{url}}` 已收敛，其余路径参数（如 `{{video_id}}`）保留。
「这个接口接了没有」看 `docs/api-coverage.md`。


## 登录相关

### link登录跳转

`GET /link?uuid={{$randomUUID}}&name=测试登录&url=https://emos-link.local`

参数：`uuid`、`name`、`url`

### 判断是否登录

`GET /api/sign/check`

返回（判断是否登录）：

```json
{
    "is_sign": true,
    "user_id": "eWD3N7EX8s"
}
```

## 用户相关

### 简单的信息

`GET /api/user/base`

返回（简单的信息）：

```json
{
    "user_id": "eXD3VD3Y1s",
    "username": "soa",
    "avatar": null
}
```

### 基本信息

`GET /api/user`

- `server_` 开头的为对应服的登录地址
    
- `password` 服的登录密码 根据 `must_otp` 联合判断是否为一次性密码
    
- `telegram_bind_url` tg绑定地址 `null` 标示已绑定
    
- `pseudonym` 笔名 上传与邀请时候 显示的昵称
    
- `roles` 角色列表
    
- `is_viewing` 是否有观影权限
    
- `is_show_empty` 是否显示空媒体库
    
- `is_can_upload` 是否可以上传

- `is_show_watch_default` 是否显示片单默认
    
- `size_upload` 上传总量 字节
    
- `invite_remaining` 可以邀请人数
    
- `slot_remaining` 剩余片单卡槽数
    
- `sign` 签到信息 当天未签到时返回为 `null`

返回（基本信息）：

```json
{
    "server_video": "https://video.emos.best",
    "server_live": null,
    "server_music": null,
    "server_abs": null,
    "telegram_group_url": "https://t.me/emospg",
    "telegram_bind_url": "https://t.me/emos_test_bot?start=bind_4L95jopXJv",
    "telegram_user_id": null,
    "user_id": "eXD3VD3Y1s",
    "username": "sorakand",
    "avatar": null,
    "pseudonym": null,
    "password": null,
    "is_show_empty": true,
    "is_can_upload": false,
    "is_can_down": false,
    "is_original_image": false,
    "roles": [],
    "must_otp": true,
    "is_viewing": false,
    "invite_remaining": 0,
    "is_have_emps": false,
    "slot_remaining": 2,
    "size_upload": 0,
    "carrot": 0,
    "sign": null
}
```

### 更改是否显示空媒体库

`PUT /api/user/showEmpty`

返回（更改是否显示空媒体库）：

```json
{
    "is_show_empty": false
}
```

### 更改是否显示成人内容

`PUT /api/user/showAdult`

### 更改是否显示片单默认

`GET /`

返回（更改是否显示片单默认）：

```json
{
    "is_show_watch_default": true
}
```

### 更新笔名

`PUT /api/user/pseudonym?name=张三`

就像是 `up主` `化名` 等一样的东西
只对之后上传的生效

参数：`name`

返回（成功）：

```json
{
    "pseudonym": "张三"
}
```

返回（失败）：

```json
{
    "message": "此名称已被占用 不妨换个其他的"
}
```

### 同意上传协议

`PUT /api/user/agreeUploadAgreement`

建议让用户在官网手动同意

### 签到

`PUT /api/user/sign?content`

禁止接口轮训 发现做封禁处理
如果是搞自动签到 禁止选0点

参数：`content`

返回（签到正常）：

```json
{
    "sign_index": 1,
    "earn_point": 2,
    "continuous_days": 1
}
```

返回（签到异常）：

```json
{
    "message": "重复签到"
}
```

### 获取一次登录密码

`GET /api/user/passwordTemporary`

只有当 `must_otp` 为 `true` 时才是临时密码

返回（获取一次登录密码）：

```json
{
    "password": 559,
    "second": 45
}
```

### 重置永久登录密码

`PUT /api/user/passwordReset?password=1212`

相关服软件中的登录密码

参数：`password`

### 我的服

#### 视频服登录列表

`GET /api/user/server/videoHistory`

返回（登录的设备列表）：

```json
[
    {
        "device_client": "Yamby",
        "device_name": "Xiaomi-AAA",
        "device_id": "f347ffda-94d1-4afa-8823-9aa102a9b1e0",
        "device_version": "2.0.2.2",
        "last_used_at": "2026-04-04 05:08:17"
    }
]
```

#### 视频服登录退出

`POST /api/user/server/videoLogout`

```json5
{
    // 传null则退出所有设备
    "device_id": null
}
```

返回（退出登录的设备）：

```json
{
    "logout_count": 1
}
```

### 统计

#### 视频类

#### 观影记录

`GET /api/user/stats/video/history?dates[]=2026-08-02`

只可查今天之前的数据

参数：`dates[]`

返回（观影记录）：

```json
[
    {
        "date": "2026-08-02",
        "time_start": "11:20:50",
        "time_end": "11:47:50",
        "video_watch_second_real": 1622,
        "video_watch_second_content": 2257,
        "video_id": 106399,
        "todbv_id": 94316,
        "video_type": "tv",
        "video_title": "九门",
        "season_number": 1,
        "episode_number": 7,
        "media_name": "4K - h265 - 60fps - HDR - 掉色人🔥 上传",
        "media_file_size": 1179524097,
        "media_file_second": 2668
    },
    {
        "date": "2026-08-02",
        "time_start": "11:48:08",
        "time_end": "12:17:04",
        "video_watch_second_real": 1554,
        "video_watch_second_content": 3150,
        "video_id": 106399,
        "todbv_id": 94316,
        "video_type": "tv",
        "video_title": "九门",
        "season_number": 1,
        "episode_number": 8,
        "media_name": "4K - h265 - HDR - 掉色人🔥 上传",
        "media_file_size": 960290316,
        "media_file_second": 2639
    },
    {
        "date": "2026-08-02",
        "time_start": "15:58:45",
        "time_end": "16:30:47",
        "video_watch_second_real": 1923,
        "video_watch_second_content": 2554,
        "video_id": 106399,
        "todbv_id": 94316,
        "video_type": "tv",
        "video_title": "九门",
        "season_number": 1,
        "episode_number": 9,
        "media_name": "4K - h265 - 60fps - DV - 掉色人🔥 上传",
        "media_file_size": 6282744070,
        "media_file_second": 2673
    }
]
```

## 邀请相关

### 邀请用户

`POST /api/invite`

```json5
{
    // id是10位的字符串 以e开头s结尾 必填
    "invite_user_id": "eP31288ERs",
    // 邀请备注 200字符内 仅自己可见
    "invite_remark": null
}
```

返回（邀请成功）：

```json
{
    // 剩余邀请次数
    "invite_remaining": 1
}
```

### 我的邀请信息

`GET /api/invite/info`

返回（我的邀请信息）：

```json
{
    "invite_at": "2026-01-16 09:06:31",
    "invite_remaining": 0,
    "invite_count": 1,
    "parent": {
        "pseudonym": null
    }
}
```

### 邀请历史

`GET /api/invite/history?username&page_size&user_id&page&telegram_user_id`

参数：`username`、`page_size`、`user_id`、`page`、`telegram_user_id`

返回（邀请历史）：

```json
{
    "page": 1,
    "page_size": 1,
    "total": 1,
    "items": [
        {
            "user_id": "eP31288ERs",
            "username": "aad1",
            "telegram_user_id": null,
            "invite_at": "2026-01-16 13:44:26",
            "invite_remark": null,
            "join_at": "2026-01-17 00:10:00",
            "last_video_player": null,
            "last_telegram_message": null,
            "last_user_sign": null
        }
    ]
}
```

### 撤销邀请

`POST /api/invite/revoke`

```json5
{
    "user_id": "ewd3n7ex8s"
}
```

返回（撤销邀请）：

```json
{
    "invite_remaining": 1
}
```

### 退出邀请

`POST /api/invite/exit`

退出后需要重新找人邀请

### 邀请用户进入emps

`POST /api/invite/emps`

```json5
{
    // 用户ID
    "invite_user_id": "eP31288ERs"
}
```

返回（邀请用户进入emps）：

```json
{
    // 花掉的萝卜
    "carrot": -120
}
```

### 修改邀请备注

`PUT /api/invite/remark`

```json5
{
    "user_id": "eR3YJLQ3Ls",
    "remark": "是个好人"
}
```

### tree

`GET /api/invite/tree`

服务端缓存1h 可以考虑本地缓存1day
根节点名称为 `emos`

返回（tree）：

```json
[
    {
        "user_id": "eXD3VD3Y1s",
        "username": "sorakand",
        "invite_at": "2026-01-17 10:10:10",
        "invite_user_id": "emos",
        "is_disabled": false,
        "join_at": "2026-01-17 00:06:35",
        "last_video_player": "2026-07-06 12:42:04",
        "last_telegram_message": "2026-07-14 15:16:27",
        "last_user_sign": "2026-07-14 15:34:57"
    },
    {
        "user_id": "eJ3ZJNP9Ks",
        "username": "afosne",
        "invite_at": "2026-01-17 10:10:10",
        "invite_user_id": "emos",
        "is_disabled": false,
        "join_at": "2026-01-17 00:08:41",
        "last_video_player": null,
        "last_telegram_message": null,
        "last_user_sign": null
    },
    {
        "user_id": "e0EWQORERs",
        "username": "guoqu",
        "invite_at": "2026-01-17 10:10:10",
        "invite_user_id": "emos",
        "is_disabled": false,
        "join_at": "2026-01-17 00:08:43",
        "last_video_player": null,
        "last_telegram_message": null,
        "last_user_sign": null
    }
]
```

## 上传相关

### 获取上传token

`POST /api/upload/getUploadToken`

```json5
{
	// 资源类型 video 视频 subtitle 字幕 image 图片 audio 音频 music 音乐
	"type": "image",
	// 文件格式
	"file_type": "image/png",
	// 文件名称
	"file_name": "dem1o2.mp4",
	// 文件大小 字节
	"file_size": 250817,
	// 储存位置 和资源类型挂钩 如果当前资源没有对应储存 将储存于默认位置
	// default 默认
	// zn_r2_upload Zn存档服R2
    // google_drive 谷歌盘
	"file_storage": "google_drive"
}
```

返回（获取错误提示）：

```json
{
    "message": "此资源您一周内上传过"
}
```

返回（图片）：

```json
{
    "type": "tusd",
    "file_id": "qwPOM8Apy8kE",
    "data": {
        "upload_url": "https://file.emos.best/files"
    }
}
```

返回（音乐）：

```json
{
    "type": "tusd",
    "file_id": "YXBVljwKNE7a",
    "data": {
        "upload_url": "https://music.emosstore.sbs/files/"
    }
}
```

返回（分片上传）：

```json
{
    "type": "multipart",
    "file_id": "D2orpWkwpEQO",
    "data": {
		// 分片大小
        "multipart_size": {
            "min": 5242880,
            "max": 5368709120
        }
    }
}
```

### 视频

#### 通过文件名识别视频

`GET /api/upload/video/recognize?file_name=长风渡.2023.S01E02.第2集.2160p.WEB-DL.EDR.H.265.mp4&provider=binary`

参数：`file_name`、`provider`

返回（识别错误）：

```json
{
    "message": "未找到对应的视频, 请先同步后使用."
}
```

返回（识别正确 tv）：

```json
{
    "file_type": "video",
    "video_id": 1002,
    "video_title": "21世纪大君夫人",
    "video_type": "tv",
    "date_air": "2026-04-10",
    "video_season_id": 1001,
    "video_season_title": "第 1 季",
    "video_season_number": 1,
    "video_episode_id": 1034,
    "video_episode_title": "你要为了一个虚名而嫁给我？",
    "video_episode_number": 2,
    "item_type": "ve",
    "item_id": 1034
}
```

返回（识别正确 movie）：

```json
{
    "file_type": "video",
    "video_id": 1001,
    "video_title": "穿普拉达的女王",
    "video_type": "movie",
    "date_air": "2006-06-29",
    "item_type": "vl",
    "item_id": 1001
}
```

#### 获取基本信息

`GET /api/upload/video/base?item_type=vl&item_id=3`

参数：`item_type`、`item_id`

返回（获取基本信息）：

```json
{
    "title": "教父",
    "video_medias": [
        {
            "media_id": "rmVl4XA9wAKO",
            "media_name": "张三 上传",
            "media_file_size": 250817,
            "user_pseudonym": "张三",
            "is_self_upload": true
        }
    ]
}
```

#### 保存上传结果

`POST /api/upload/video/save`

```json5
{
    "item_type": "ve",
    "item_id": 1000,
    "file_id": "en57MBjBMRmP"
}
```

返回（保存上传结果）：

```json
{
    "count": 1,
    "media_id": "Y1qy9kW9v86K",
    "carrot": 3
}
```

#### 内部入库

`POST /api/upload/video/saveInternal`

需申请使用 接口于 261018 因麻佬服务到期废弃

```json5
{
    "item_type": "ve",
    "item_id": 1000,
    // 储存位置 先设定为 local_emos_1 后面会变动
    "path_type": "local_emos_1",
    // 上传者用户名 基于路径截取
    "upload_username": "sx66",
    // 文件最终保存路径 上传者用户名后的地址 地址必须 urldecode 后传递
    "file_path": "sync/一人之下[todbid=2510]/S06E01.2026.2160p.WEB-DL.H265.SDR.24fps.10bit.HIFI 2.0.4Audios.mkv",
    // 文件大小 字节
    "file_size": 1111
}
```

返回（内部入库）：

```json
{
    "media_id": "deqped9rnmx8",
    "carrot": 2
}
```

### 字幕

#### 保存上传结果

`POST /api/upload/subtitle/save`

```json5
{
    "item_type": "ve",
    "item_id": 4,
    "file_id": "EzqvM34pPRge"
}
```

返回（保存上传结果）：

```json
{
    "carrot": 1,
    "subtitle_id": "Bpvx8YxPoVdQ"
}
```

### 图片

#### 上传列表

`GET /api/upload/image/list?name=&date=`

参数：`name`、`date`

返回（上传列表）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 1,
    "items": [
        {
            "file_id": "EzqvM34pPRge",
            "url": "https://file.emosstore.sbs/files/test/82ee24d0-4b03-432e-91a1-0fee8adcf770.png",
            "file_type": "image/png",
            "file_name": "demo.png",
            "file_size": 250817,
            "created_at": "2026-04-08T17:08:58.000000Z"
        }
    ]
}
```

#### 删除图片

`DELETE /api/upload/image/delete?file_id=EzqvM34pPRge`

参数：`file_id`

返回（删除图片）：

```json
{
    "is_delete": true
}
```

### 音乐

#### 保存上传结果

`POST /api/upload/music/save`

```json5
{
    "music_song_id": {{music_song_id}},
    "file_id": "VJdRlL9K0xgO"
}
```

返回（保存上传结果）：

```json
{
    "carrot": 2,
    "media_id": "ymqnzjo29z80"
}
```

#### 保存为群星版本

`POST /api/upload/music/saveHeadless`

有时候 `todb` 添加过于麻烦  
则可以再这里将他保存为 `群星` 的版本  
虽然不建议这么做

```json5
{
    // 歌曲名称 50字内 必填
    "name_song": "小星星",
    // 歌手 50字内
    "name_person": "张三",
    // 简介 1000字内
    "description": "张三",
    // 发行日期 Y-m-d 格式
    "release_date": null,
    // 是否少儿不宜 必填
    "is_adult": false,
    // 封面图
    "image_poster_url": null,
    // 文件ID 必填
    "file_id": "YXBVljwKNE7a"
}
```

返回（保存为群星版本）：

```json
{
    "carrot": 1,
    "media_id": "ymqnzjo29z80"
}
```

### 分片上传

#### 获取分片上传凭证

`POST /api/upload/multipart/{{file_id}}/presign`

只支持获取一小时内的文件上传凭证
获取到的上传凭证有效期是1天
不可重复获取

```json5
{
    // 切片数量 1 - 1000 之间
    "number": 10
}
```

返回（获取成功）：

```json
[
    {
        "number": 1,
        "upload_url": "https://emos.local/xxxx",
        "upload_data": {}
    }
]
```

#### 客户端上传分片

`PUT https://emos.local/xxxx`

#### 分片合并

`POST /api/upload/multipart/{{file_id}}/complete`

```json5
{
    "parts": [
        {
            "number": 1,
            "etag": "101f07ef94503a4200bc11d2d194c380"
        },
        {
            "number": 2,
            "etag": "xxxxxxxxxx"
        },
        {
            "number": 3,
            "etag": "xxxxxxxxxx"
        }
    ]
}
```

返回（分片合并）：

```json
{
    "file_id": "qwPOM8APpy8k"
}
```

#### 取消上传

`DELETE /api/upload/multipart/{{file_id}}/abort`

### 储存

#### 可用储存列表

`GET /api/upload/store/disk`

返回（可用储存列表）：

```json
[
    "local_emos_1",
    "local_emos_2",
    "local_laizer_1"
]
```

#### 暂存区文件

`GET /api/upload/store/file?path_type=local_emos_1`

参数：`path_type`

返回（暂存区文件）：

```json
[
    {
        "file_name": "长风渡.2023.S01E02.第2集.2160p.WEB-DL.EDR.H.265.mp4",
        "file_size": 0,
        "mime_type": "video/mp4"
    },
    {
        "file_name": "长风渡.2023.S01E03.第2集.2160p.WEB-DL.EDR.H.265.mp4",
        "file_size": 0,
        "mime_type": "video/mp4"
    },
    {
        "file_name": "长风渡.2023.S01E01.第2集.2160p.WEB-DL.EDR.H.265.mp4.aria2",
        "file_size": 0,
        "mime_type": "text/plain; charset=utf-8"
    },
    {
        "file_name": "长风渡.2023.S01E02.第1集.2160p.WEB-DL.EDR.H.265.mp4",
        "file_size": 123120,
        "mime_type": "video/mp4"
    },
    {
        "file_name": "长风渡.2023.S01E02.第3集.2160p.WEB-DL.EDR.H.265.错误文件.mkv",
        "file_size": 0,
        "mime_type": "text/plain; charset=utf-8"
    }
]
```

#### 暂存区文件入库

`POST /api/upload/store/archive`

```json5
{
    "item_type": "ve",
    "item_id": 1349,
    "path_type": "local_emos_1",
    // "file_name": "长风渡.2023.S01E02.第2集.2160p.WEB-DL.EDR.H.265.mp4",
    "file_name": "Smoking.Behind.the.Supermarket.With.You.2026.S01E03.1080p.NF.WEB-DL.x264.AAC-ADWeb.mkv"
}
```

返回（暂存区文件入库）：

```json
{
    "media_id": "34o70vj78pq7",
    "carrot": 2
}
```

## 视频相关

### 同步视频信息

`PATCH /api/video/sync?tmdb_id=&todb_id=1000`

从 `todb` 平台同步视频信息
异步执行 约一分钟同步完成

返回的数组是查询到待同步的内容 如果为空 提示他在todb平台先添加数据

参数：`tmdb_id`、`todb_id`

返回（重新同步视频信息）：

```json
[
    {
        "todb_id": 1000,
        "video_type": "tv",
        "video_title": "西部世界",
        "date_air": "2016-10-02",
        "is_adult": false
    }
]
```

### 搜索获取目录树

`GET /api/video/tree?type&title&tmdb_id=63247&todb_id&video_id`

# 视频类型 `type`

- `tv` 电视
- `movie` 电影

参数：`type`、`title`、`tmdb_id`、`todb_id`、`video_id`

返回（搜索获取目录树）：

```json
[
    {
        "video_type": "tv",
        "item_type": "vl",
        "item_id": 1,
        "tmdb_id": 63247,
        "todb_id": 1000,
        "title": "西部世界",
        "date_air": "2016-10-02",
        "seasons": [
            {
                "item_type": "vs",
                "item_id": 4,
                "season_title": "新世界",
                "season_number": 3,
                "date_air": "2020-03-15",
                "episodes": [
                    {
                        "item_type": "ve",
                        "item_id": 3,
                        "episode_title": "求主顾惜",
                        "episode_number": 1,
                        "date_air": "2020-03-15"
                    }
                ]
            },
            {
                "item_type": "vs",
                "item_id": 5,
                "season_title": "选择",
                "season_number": 4,
                "date_air": "2022-06-26",
                "episodes": [
                    {
                        "item_type": "ve",
                        "item_id": 39,
                        "episode_title": "将会",
                        "episode_number": 8,
                        "date_air": "2022-08-14"
                    }
                ]
            }
        ]
    }
]
```

### 获取视频标识id

`GET /api/video/getVideoId?video_id_type=tmdb&video_id_value=1600&season_number=&episode_number=&tmdb_type=`

参数：`video_id_type`、`video_id_value`、`season_number`、`episode_number`、`tmdb_type`

返回（有具体的季和集）：

```json
{
    "item_type": "vl",
    "item_id": 2,
    "video_type": "tv",
    "video_title": "权力的游戏",
    "date_air": "2011-04-17",
    "todb_id": 1001,
    "tmdb_id": 1399,
    "season_info": {
        "item_type": "vs",
        "item_id": 7,
        "season_title": "第一季 权力的游戏",
        "season_number": 1,
        "date_air": "2011-04-17"
    },
    "episode_info": {
        "item_type": "ve",
        "item_id": 393,
        "episode_title": "凛冬将至",
        "episode_number": 1,
        "date_air": "2011-04-17"
    }
}
```

返回（只有季）：

```json
{
    "item_type": "vl",
    "item_id": 2,
    "video_type": "tv",
    "video_title": "权力的游戏",
    "date_air": "2011-04-17",
    "todb_id": 1001,
    "tmdb_id": 1399,
    "season_info": {
        "item_type": "vs",
        "item_id": 7,
        "season_title": "第一季 权力的游戏",
        "season_number": 1,
        "date_air": "2011-04-17"
    },
    "episode_info": []
}
```

返回（只有剧）：

```json
{
    "item_type": "vl",
    "item_id": 2,
    "video_type": "tv",
    "video_title": "权力的游戏",
    "date_air": "2011-04-17",
    "todb_id": 1001,
    "tmdb_id": 1399,
    "season_info": [],
    "episode_info": []
}
```

返回（tmdb 重叠时）：

```json
{
    "item_type": "vl",
    "item_id": 7865,
    "video_type": "movie",
    "video_title": "两生花",
    "date_air": "1991-05-15",
    "has_media": false,
    "todb_id": 39205,
    "tmdb_id": 1600,
    "season_info": [],
    "episode_info": []
}
```

### 视频列表

`GET /api/video/list?tmdb_id=&todb_id&video_id=&type&title&only_delete&with_media&page&page_size`

参数：`tmdb_id`、`todb_id`、`video_id`、`type`、`title`、`only_delete`、`with_media`、`page`、`page_size`

返回（电视）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 1,
    "items": [
        {
            "item_id": null,
            "todb_id": 1000,
            "tmdb_id": 63247,
            "tmdb_url": "https://www.themoviedb.org/tv/63247",
            "video_id": 1,
            "video_type": "tv",
            "video_title": "西部世界",
            "video_origin_title": "Westworld",
            "video_description": "在遥远的未来，一座集“西部”“罗马”“中世纪”三大元素主题版块于一身的巨型高科技成人乐园建成，园中无数逼真的机器人角色，夜以继日地为游客提供杀戮与性欲的满足。在一次次的更新升级中，这座巨大机械乐园的后台系统渐渐失去了对机器人的控制，游客接连被机器人杀死，所有想逃离者都被锁定……本剧改编自 1973 年的同名科幻电影，故事探索了“人工智能获得自主意识”以及“未来世界的罪孽”的主题。",
            "video_tagline": "",
            "video_image_logo": null,
            "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbYDzp2Jeg",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/dOmDowzLALRBkQAL",
            "video_date_air": "2016-10-02",
            "video_is_adult": false,
            "seek_is_request": false,
            "seek_id": null,
            "request_count": 0,
            "parts_count": 0,
            "medias_count": 1,
            "subtitles_count": 0,
            "titles": [],
            "genres": [
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 2,
                    "name": "西部"
                }
            ],
            "is_delete": false
        }
    ]
}
```

### 视频搜索 接口轮询用

`GET /api/video/search?last_id&tmdb_id=&todb_id&video_id=&type&title&with_genre=&sort_by&page&page_size`

参数：`last_id`、`tmdb_id`、`todb_id`、`video_id`、`type`、`title`、`with_genre`、`sort_by`、`page`、`page_size`

返回（视频搜索 接口轮询用）：

```json
{
    "page": 1,
    "page_size": 3,
    "total": 6863,
    "items": [
        {
            "video_id": 1007,
            "video_type": "tv",
            "video_title": "斗破苍穹",
            "todb_id": 1007,
            "tmdb_id": 79481
        },
        {
            "video_id": 1008,
            "video_type": "tv",
            "video_title": "斗破苍穹",
            "todb_id": 1008,
            "tmdb_id": 81500
        },
        {
            "video_id": 1009,
            "video_type": "tv",
            "video_title": "斗破苍穹-动态漫画",
            "todb_id": 1009,
            "tmdb_id": 206080
        }
    ]
}
```

返回（包含类型字段）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 6863,
    "items": [
        {
            "video_id": 7862,
            "video_type": "movie",
            "video_title": "智取威虎山",
            "todb_id": 7862,
            "tmdb_id": 294992,
            "genres": [
                {
                    "id": 16,
                    "name": "惊悚"
                },
                {
                    "id": 17,
                    "name": "战争"
                },
                {
                    "id": 12,
                    "name": "冒险"
                }
            ]
        },
        {
            "video_id": 7863,
            "video_type": "movie",
            "video_title": "魔法老师",
            "todb_id": 7863,
            "tmdb_id": 86828,
            "genres": [
                {
                    "id": 8,
                    "name": "喜剧"
                },
                {
                    "id": 14,
                    "name": "科幻"
                }
            ]
        },
        {
            "video_id": 7860,
            "video_type": "movie",
            "video_title": "星球大战5：帝国反击战",
            "todb_id": 7860,
            "tmdb_id": 1891,
            "genres": [
                {
                    "id": 12,
                    "name": "冒险"
                },
                {
                    "id": 11,
                    "name": "动作"
                },
                {
                    "id": 14,
                    "name": "科幻"
                }
            ]
        },
        {
            "video_id": 7861,
            "video_type": "movie",
            "video_title": "人皮交易",
            "todb_id": 7861,
            "tmdb_id": 327833,
            "genres": [
                {
                    "id": 16,
                    "name": "惊悚"
                },
                {
                    "id": 11,
                    "name": "动作"
                },
                {
                    "id": 3,
                    "name": "动作冒险"
                },
                {
                    "id": 5,
                    "name": "冒险"
                }
            ]
        },
        {
            "video_id": 7857,
            "video_type": "movie",
            "video_title": "太平间闹鬼事件",
            "todb_id": 7857,
            "tmdb_id": 18781,
            "genres": [
                {
                    "id": 16,
                    "name": "惊悚"
                },
                {
                    "id": 15,
                    "name": "恐怖"
                }
            ]
        },
        {
            "video_id": 7858,
            "video_type": "movie",
            "video_title": "不亲密朋友",
            "todb_id": 7858,
            "tmdb_id": 1093215,
            "genres": [
                {
                    "id": 3,
                    "name": "动作冒险"
                },
                {
                    "id": 8,
                    "name": "喜剧"
                }
            ]
        },
        {
            "video_id": 7859,
            "video_type": "movie",
            "video_title": "一声叹息",
            "todb_id": 7859,
            "tmdb_id": 65417,
            "genres": [
                {
                    "id": 3,
                    "name": "动作冒险"
                }
            ]
        },
        {
            "video_id": 7854,
            "video_type": "movie",
            "video_title": "太平间闹鬼事件2：佐治亚鬼屋事件",
            "todb_id": 7854,
            "tmdb_id": 150202,
            "genres": [
                {
                    "id": 15,
                    "name": "恐怖"
                },
                {
                    "id": 3,
                    "name": "动作冒险"
                },
                {
                    "id": 16,
                    "name": "惊悚"
                }
            ]
        },
        {
            "video_id": 7855,
            "video_type": "movie",
            "video_title": "首尔夏天",
            "todb_id": 7855,
            "tmdb_id": 1556728,
            "genres": [
                {
                    "id": 23,
                    "name": "纪录"
                }
            ]
        },
        {
            "video_id": 7856,
            "video_type": "movie",
            "video_title": "生死谍变",
            "todb_id": 7856,
            "tmdb_id": 10355,
            "genres": [
                {
                    "id": 11,
                    "name": "动作"
                },
                {
                    "id": 12,
                    "name": "冒险"
                },
                {
                    "id": 3,
                    "name": "动作冒险"
                },
                {
                    "id": 16,
                    "name": "惊悚"
                }
            ]
        },
        {
            "video_id": 7852,
            "video_type": "movie",
            "video_title": "醉乡民谣",
            "todb_id": 7852,
            "tmdb_id": 86829,
            "genres": [
                {
                    "id": 3,
                    "name": "动作冒险"
                },
                {
                    "id": 19,
                    "name": "音乐"
                }
            ]
        },
        {
            "video_id": 7853,
            "video_type": "movie",
            "video_title": "人狼游戏：地狱",
            "todb_id": 7853,
            "tmdb_id": 614919,
            "genres": [
                {
                    "id": 15,
                    "name": "恐怖"
                },
                {
                    "id": 3,
                    "name": "动作冒险"
                },
                {
                    "id": 6,
                    "name": "悬疑"
                }
            ]
        },
        {
            "video_id": 7849,
            "video_type": "movie",
            "video_title": "人狼游戏",
            "todb_id": 7849,
            "tmdb_id": 348760,
            "genres": [
                {
                    "id": 16,
                    "name": "惊悚"
                },
                {
                    "id": 15,
                    "name": "恐怖"
                }
            ]
        },
        {
            "video_id": 7850,
            "video_type": "movie",
            "video_title": "星球大战6：绝地归来",
            "todb_id": 7850,
            "tmdb_id": 1892,
            "genres": [
                {
                    "id": 12,
                    "name": "冒险"
                },
                {
                    "id": 11,
                    "name": "动作"
                },
                {
                    "id": 14,
                    "name": "科幻"
                }
            ]
        },
        {
            "video_id": 7851,
            "video_type": "movie",
            "video_title": "人狼游戏：野兽阵营",
            "todb_id": 7851,
            "tmdb_id": 359636,
            "genres": [
                {
                    "id": 16,
                    "name": "惊悚"
                },
                {
                    "id": 15,
                    "name": "恐怖"
                }
            ]
        }
    ]
}
```

### 删除/恢复视频

`PUT /api/video/{{video_id}}/delete`

返回（删除/恢复视频）：

```json
{
    "carrot": 1,
    "is_delete": true
}
```

### 获取季列表

`GET /api/video/{{video_id}}/season`

返回（获取季列表）：

```json
[
    {
        "item_id": "vl-1",
        "season_id": 1,
        "season_title": "特别篇",
        "season_number": 0,
        "season_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxp4RZMVmG",
        "date_air": "2017-11-07",
        "has_media": false,
        "episodes_count": 61
    },
    {
        "item_id": "vl-2",
        "season_id": 2,
        "season_title": "迷宫",
        "season_number": 1,
        "season_description": "《西部世界》的故事发生在未来，人们已经不再热衷于玩网络游戏，而是创造了高科技成人乐园，体验更加真实刺激的游戏。里面有不少机器人接待员，他们过着设定好的剧情生活。而游客呢，现实中不敢的胡作非为，在公园里都能无限制放纵，嫖妓、追凶甚至滥杀无辜。提供服务的机器人，也不是一般的机器人。他们不仅具有超高仿真外形，还有自身情感，而且能带给游客最真实的体验。比如，中弹以后会流血，受伤以后会痛苦地嗷叫。夜幕降临，所有机器人的记忆被清除，一切归零，第二天太阳升起，新一批游客入园。不过，在程序的失误以及程序员要求机器人更接近于人类思维和情感的情况下，机器人的自主意识和思维使他们开始怀疑这个世界的本质，进而觉醒并反抗人类.",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxQ4KZMVmG",
        "date_air": "2016-10-02",
        "has_media": false,
        "episodes_count": 10
    },
    {
        "item_id": "vl-3",
        "season_id": 3,
        "season_title": "门",
        "season_number": 2,
        "season_description": "欢迎回到西部世界，在那里木偶表演已经结束，新解放的\"东道主\"将来到人类。在第二季，多洛雷斯（埃文·雷切尔·伍德）负责，梅夫（安迪·牛顿）正在执行任务，黑衣人（埃德·哈里斯）回来了。混沌在关于人工意识的黎明、新生命形式的诞生和辛的进化的黑暗奥德赛中控制了局面。",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9Mqzdm6R3OoVg",
        "date_air": "2018-04-22",
        "has_media": false,
        "episodes_count": 10
    },
    {
        "item_id": "vl-4",
        "season_id": 4,
        "season_title": "新世界",
        "season_number": 3,
        "season_description": "紧接第二季的战争起义，德洛莉丝（Dolores）与新洛杉矶的凯勒（Caleb）建立了联系，并理解了接待员如何生存在这个真正的世界。 与此同时，梅芙（Maeve）在另一个以第二次世界大战为主题的提洛斯公园（Delos park）中找回了自我意识，该公园位于法西斯意大利...",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWpnORQgPLE",
        "date_air": "2020-03-15",
        "has_media": false,
        "episodes_count": 8
    },
    {
        "item_id": "vl-5",
        "season_id": 5,
        "season_title": "选择",
        "season_number": 4,
        "season_description": "这一季讲述的是在漫长的战争结束七年后——人类终于获得了自由，至少看起来是这样。梅芙和凯莱布开始怀疑黑尔和一个接待员版的黑衣人试图重新控制人类。与此同时，伯纳德从升华之境中归来。还有一个年轻的作家，克里斯蒂娜，开始质疑她的现实的本质。",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKvrMK3lx9Y",
        "date_air": "2022-06-26",
        "has_media": false,
        "episodes_count": 8
    }
]
```

### 获取集列表

`GET /api/video/{{video_id}}/episode?season_number&with_seek=1&with_seek_is_request=1`

参数：`season_number`、`with_seek`、`with_seek_is_request`

返回（获取集列表）：

```json
[
    {
        "item_id": "ve-1",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 1,
        "episode_title": "起源",
        "episode_number": 1,
        "episode_description": "园区工作人员开始注意到接待员的异常行为；一个穿着黑色衣服的神秘男子（William）正在公园里残忍屠杀...",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRo16WwZLEb",
        "date_air": "2016-10-02",
        "runtime": 65,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-2",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 2,
        "episode_title": "入夜之旅",
        "episode_number": 1,
        "episode_description": "接待员们在寻找自我意识时反抗了客人。 梅芙（Maeve）在一些意想不到的帮助下寻找女儿...",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKMmeKVMyb4",
        "date_air": "2018-04-22",
        "runtime": 70,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-3",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 3,
        "episode_title": "求主顾惜",
        "episode_number": 1,
        "episode_description": "德洛莉丝（Dolores）开始寻找罗波安的设计者； 伯纳德试图阻止； 前士兵凯勒（Caleb）尝试在新洛杉矶找回自己真正的人生...",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRam8RADo5L",
        "date_air": "2020-03-15",
        "runtime": 68,
        "parts_count": 0,
        "medias_count": 1,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-4",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 4,
        "episode_title": "预兆",
        "episode_number": 1,
        "episode_description": "又见面了。什么都不用担心。一切都在你的脑子里。",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjBpW964Qy",
        "date_air": "2022-06-26",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 1
    },
    {
        "item_id": "ve-5",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 5,
        "episode_title": "第 1 集",
        "episode_number": 1,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-11-07",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-6",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 6,
        "episode_title": "火中取栗",
        "episode_number": 2,
        "episode_description": "两位客人以不同的心态前往公园；梅芙（Maeve）的心绪有所改变；黑衣人（William）尝试从死刑者身上寻找线索...",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzeJERDwvY8",
        "date_air": "2016-10-09",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-7",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 7,
        "episode_title": "团圆",
        "episode_number": 2,
        "episode_description": "德洛莉丝（Dolores）记得她去曾过外面的世界。 威廉（William）冒着巨大风险，大胆创业...",
        "video_image_poster": "https://image.theotherdb.org/w185/7Ld4J6WEXqK0pY5B",
        "date_air": "2018-04-29",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-8",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 8,
        "episode_title": "冬季防线",
        "episode_number": 2,
        "episode_description": "梅芙（Maeve）发现自己在一个新公园里，仿佛回到了过去。 伯纳德（Bernard）正在重返西部世界园区...",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1Kq26Wqyj6Q",
        "date_air": "2020-03-22",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-9",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 9,
        "episode_title": "自在",
        "episode_number": 2,
        "episode_description": "我死的时候听到了苍蝇的嗡嗡声。",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQmdW2Ppn4",
        "date_air": "2022-07-03",
        "runtime": 50,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-10",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 10,
        "episode_title": "第 2 集",
        "episode_number": 2,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRop6KwZLEb",
        "date_air": "2016-12-26",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-11",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 11,
        "episode_title": "歧途",
        "episode_number": 3,
        "episode_description": "艾尔西（Elsie）和斯塔布斯（Stubbs）正在寻找遗失的接待员；泰迪（Teddy）被安排了新的背景故事； 伯纳德（Bernard）正在调查接待员暴动和幻觉的起源...",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKB3aWPpyQL",
        "date_air": "2016-10-16",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-12",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 12,
        "episode_title": "品德与命运",
        "episode_number": 3,
        "episode_description": "德洛莉丝（Dolores）采取了进一步行动。 夏洛特（Charlotte）为保护德洛斯公司（Delos）最珍贵的资产而争先恐后。 伯纳德（Bernard）正在逼近真相...",
        "video_image_poster": "https://image.theotherdb.org/w185/b2Pvq1WXmqzABmNe",
        "date_air": "2018-05-06",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-13",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 13,
        "episode_title": "田野之缺",
        "episode_number": 3,
        "episode_description": "夏洛特（Charlotte）正在努力应对混乱的现实； 德洛莉丝（Dolores）和凯勒（Caleb）正式结成伙伴，共同对抗塞拉克（Serac）...",
        "video_image_poster": "https://image.theotherdb.org/w185/eNVp2yzVmLW6rXJv",
        "date_air": "2020-03-29",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-14",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 14,
        "episode_title": "疯狂年代",
        "episode_number": 3,
        "episode_description": "你再也回不去了。但是如果你这样做了，带一把铲子。",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7KwNNRMjB8N",
        "date_air": "2022-07-10",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-15",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 15,
        "episode_title": "第 3 集",
        "episode_number": 3,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzemEzDwvY8",
        "date_air": "2017-11-07",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-16",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 16,
        "episode_title": "失衡理论",
        "episode_number": 4,
        "episode_description": "德洛莉丝（Dolores）与威廉（William）和罗根（Logan）进入游戏，扮演着赏金猎人； 黑衣人在此取得了重大发现；福特（Ford）正和特蕾莎讨论公园的未来发展...",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkvBWE846Z",
        "date_air": "2016-10-23",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-17",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 17,
        "episode_title": "斯芬克斯之谜",
        "episode_number": 4,
        "episode_description": "一位神秘的人物成为德洛斯公司（Delos）秘密项目的关键。 黑衣人和劳伦斯沿着通往拉斯穆达斯的道路前进，但遇到了些麻烦...",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKr70WEj18e",
        "date_air": "2018-05-13",
        "runtime": 71,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-18",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 18,
        "episode_title": "流亡者之母",
        "episode_number": 4,
        "episode_description": "伯纳德（Bernard）和斯塔布斯（Stubbs）为了调查利亚姆（Liam），混入了一个私人娱乐场所，而德洛莉丝（Dolores）和凯勒（Caleb）也制定了类似的计划； 黑衣人（William）准备重新回到社会。 梅芙（Maeve）与一位老朋友会面...",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKgxNWxqM5J",
        "date_air": "2020-04-05",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-19",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 19,
        "episode_title": "换代",
        "episode_number": 4,
        "episode_description": "是否应该忘记旧相识和友谊地久天长的日子？",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOwPWd2QOl",
        "date_air": "2022-07-17",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-20",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 20,
        "episode_title": "第 4 集",
        "episode_number": 4,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKB8azPpyQL",
        "date_air": "2016-12-26",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-21",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 21,
        "episode_title": "报复",
        "episode_number": 5,
        "episode_description": "德洛莉丝（Dolores）与威廉（William）和罗根（Logan）到达Pariah，并被招募执行一项危险任务；黑衣人遇到了一个意想不到的盟友。",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZ06K1gPNe",
        "date_air": "2016-10-30",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-22",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 22,
        "episode_title": "茜之舞",
        "episode_number": 5,
        "episode_description": "梅芙（Maeve）和她的盟友在新世界发起革命！ 德洛莉丝（Dolores）替泰迪（Teddy）做出了决定； 卡尔（Karl）发现接待员有一丝危险的迹象...",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WNY9KX9Nvg",
        "date_air": "2018-05-20",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-23",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 23,
        "episode_title": "浮世绘",
        "episode_number": 5,
        "episode_description": "塞拉克（Serac）的过往被揭开。 德洛莉丝（Dolores）向利亚姆（Liam）施加压力，要求授权其进入罗波安权限；凯勒（Caleb）意外使用了一种不寻常的派对药物...",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmlqzOl4Ed",
        "date_air": "2020-04-12",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-24",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 24,
        "episode_title": "庄子",
        "episode_number": 5,
        "episode_description": "上帝很无聊。",
        "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDEBKV15GA",
        "date_air": "2022-07-24",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-25",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 25,
        "episode_title": "第 5 集",
        "episode_number": 5,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkpBRE846Z",
        "date_air": "2017-03-06",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-26",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 26,
        "episode_title": "对手",
        "episode_number": 6,
        "episode_description": "梅芙（Maeve）的魅力吸引了菲利克斯（Felix）的注意；艾尔西（Elsie）发现了公园内部可能遭到蓄意破坏的证据；泰迪（Teddy）和黑衣人与驻军发生火力冲突...",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWl1Nzx051V",
        "date_air": "2016-11-06",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-27",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 27,
        "episode_title": "相空间",
        "episode_number": 6,
        "episode_description": "梅芙（Maeve）继续寻找女儿。 德洛莉丝（Dolores）策划出了她的下一步行动。艾尔西（Elsie）更加了解了德洛斯公司（Delos）的幕后真相...",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWA2gzyZwaM",
        "date_air": "2018-05-27",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-28",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 28,
        "episode_title": "退相干",
        "episode_number": 6,
        "episode_description": "当世界陷入混乱时，塞拉克（Serac）趁机控制了德洛斯公司（Delos），并最终发现了夏洛特（Charlotte）的计划和身份。 梅芙（Maeve）获得阻止德洛莉丝（Dolores）的最后机会。 威廉（William）开始接受精神治疗...",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKY58KMZ24e",
        "date_air": "2020-04-19",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-29",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 29,
        "episode_title": "忠诚",
        "episode_number": 6,
        "episode_description": "忠于你自己",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW9erWrbA37",
        "date_air": "2022-07-31",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-30",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 30,
        "episode_title": "第 6 集",
        "episode_number": 6,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZ16W1gPNe",
        "date_air": "2017-03-06",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-31",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 31,
        "episode_title": "错觉",
        "episode_number": 7,
        "episode_description": "德洛莉丝（Dolores），威廉（William）和劳伦斯（Lawrence）进入了一个险要的地带； 梅芙（Maeve）提出了她的一个小要求；伯纳德（Bernard）正计划他的下一步行动...",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8nVKDr6Xd",
        "date_air": "2016-11-13",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-32",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 32,
        "episode_title": "解剖模型",
        "episode_number": 7,
        "episode_description": "伯纳德（Bernard）偶遇了一个意想不到的老朋友； 熔炉的安全受到威胁； 梅芙（Maeve）遇到了她过去人生的一幕，这次她选择斩断过往...",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGNvRrEv1Q",
        "date_air": "2018-06-03",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-33",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 33,
        "episode_title": "通路兵",
        "episode_number": 7,
        "episode_description": "当世界离析，唯挚友同行。（A real friend is one who walks in when the rest of the world walks out.）",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW11VWXa0OL",
        "date_air": "2020-04-26",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-34",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 34,
        "episode_title": "悔改",
        "episode_number": 7,
        "episode_description": "你想在这种时候喝上一杯吗？",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz5b7RMQyqx",
        "date_air": "2022-08-07",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-35",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 35,
        "episode_title": "第 7 集",
        "episode_number": 7,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlpNWx051V",
        "date_air": "2017-03-06",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-36",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 36,
        "episode_title": "隐没",
        "episode_number": 8,
        "episode_description": "伯纳德（Bernard）正挣扎于自己的混乱中；泰迪（Bernard）却为曾经黑暗的记忆所困扰，德洛莉丝（Dolores）为此付出代价。 梅芙（Maeve）尝试修改自己的底层代码...",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R4ZvWPLYVr",
        "date_air": "2016-11-20",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-37",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 37,
        "episode_title": "记忆",
        "episode_number": 8,
        "episode_description": "Akecheta部落的故事以及追求真实的旅程； 梅芙（Maeve）感到生活从未如此真实美好...",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW31rR1qn9o",
        "date_air": "2018-06-10",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-38",
        "season_id": 4,
        "season_number": 3,
        "episode_id": 38,
        "episode_title": "危机理论",
        "episode_number": 8,
        "episode_description": "变为现实。（Time to face the music.）",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR6LYWdeEO1",
        "date_air": "2020-05-03",
        "runtime": 76,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-39",
        "season_id": 5,
        "season_number": 4,
        "episode_id": 39,
        "episode_title": "将会",
        "episode_number": 8,
        "episode_description": "就像我对这地方做的那样?",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJ3qWjJDwa",
        "date_air": "2022-08-14",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-40",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 40,
        "episode_title": "第 8 集",
        "episode_number": 8,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz83VWDr6Xd",
        "date_air": "2017-03-06",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-41",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 41,
        "episode_title": "平均律钢琴曲",
        "episode_number": 9,
        "episode_description": "德洛莉丝（Dolores）和伯纳德（Bernard）重逢，并做出下一步计划；梅芙（Maeve）对赫克托（Hector）提出了大胆的计划；德洛莉丝（Dolores）为了达成目的，引发泰迪（Teddy）的觉醒...",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPznQBW3qVXO",
        "date_air": "2016-11-27",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-42",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 42,
        "episode_title": "消失点",
        "episode_number": 9,
        "episode_description": "黑衣人（William）陷入了他的人生困境。 夏洛特（Charlotte）制定了清除所有接待员的计划...",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR01LKnw5do",
        "date_air": "2018-06-17",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-43",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 43,
        "episode_title": "第 9 集",
        "episode_number": 9,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R4rvWPLYVr",
        "date_air": "2017-03-06",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-44",
        "season_id": 2,
        "season_number": 1,
        "episode_id": 44,
        "episode_title": "二分心智",
        "episode_number": 10,
        "episode_description": "福特（Ford）正在向大家展示他大胆的新故事线； 德洛莉丝（Dolores）找到了她的身份和意义；梅芙（Maeve）正在进行他的解放计划...",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR29mzxylZG",
        "date_air": "2016-12-04",
        "runtime": 86,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-45",
        "season_id": 3,
        "season_number": 2,
        "episode_id": 45,
        "episode_title": "乘客",
        "episode_number": 10,
        "episode_description": "所有人都来到了这座虚拟山谷，接待员正陆续跨入其中...",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPm6W7Dl91",
        "date_air": "2018-06-24",
        "runtime": 91,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-46",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 46,
        "episode_title": "第 10 集",
        "episode_number": 10,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPznwBR3qVXO",
        "date_air": "2017-03-06",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-47",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 47,
        "episode_title": "第 11 集",
        "episode_number": 11,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR2BmRxylZG",
        "date_air": "2017-03-06",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-48",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 48,
        "episode_title": "第 12 集",
        "episode_number": 12,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9Mqzd16R3OoVg",
        "date_air": "2017-03-06",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-49",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 49,
        "episode_title": "第 13 集",
        "episode_number": 13,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKM8eRVMyb4",
        "date_air": "2017-03-06",
        "runtime": 29,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-50",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 50,
        "episode_title": "第 14 集",
        "episode_number": 14,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2018-06-25",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-51",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 51,
        "episode_title": "第 15 集",
        "episode_number": 15,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2018-06-25",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-52",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 52,
        "episode_title": "第 16 集",
        "episode_number": 16,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/7Ld4J6WELqK0pY5B",
        "date_air": "2018-06-25",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-53",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 53,
        "episode_title": "第 17 集",
        "episode_number": 17,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b2Pvq1WXGqKABmNe",
        "date_air": "2018-07-23",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-54",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 54,
        "episode_title": "第 18 集",
        "episode_number": 18,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrQ0REj18e",
        "date_air": "2018-07-23",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-55",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 55,
        "episode_title": "第 19 集",
        "episode_number": 19,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WN49RX9Nvg",
        "date_air": "2018-07-23",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-56",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 56,
        "episode_title": "第 20 集",
        "episode_number": 20,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWAGgRyZwaM",
        "date_air": "2018-07-23",
        "runtime": 13,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-57",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 57,
        "episode_title": "第 21 集",
        "episode_number": 21,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGovKrEv1Q",
        "date_air": "2018-07-23",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-58",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 58,
        "episode_title": "第 22 集",
        "episode_number": 22,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3krW1qn9o",
        "date_air": "2018-07-23",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-59",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 59,
        "episode_title": "第 23 集",
        "episode_number": 23,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0oLznw5do",
        "date_air": "2018-07-23",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-60",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 60,
        "episode_title": "第 24 集",
        "episode_number": 24,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKP26z7Dl91",
        "date_air": "2018-07-23",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-61",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 61,
        "episode_title": "第 25 集",
        "episode_number": 25,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWp1OzQgPLE",
        "date_air": "2018-07-23",
        "runtime": 15,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-62",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 62,
        "episode_title": "第 26 集",
        "episode_number": 26,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRa18RADo5L",
        "date_air": "2018-07-23",
        "runtime": 15,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-63",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 63,
        "episode_title": "第 27 集",
        "episode_number": 27,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1Kq16Kqyj6Q",
        "date_air": "2018-07-23",
        "runtime": 15,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-64",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 64,
        "episode_title": "第 28 集",
        "episode_number": 28,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/eNVp2yzVNLz6rXJv",
        "date_air": "2018-07-23",
        "runtime": 12,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-65",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 65,
        "episode_title": "第 29 集",
        "episode_number": 29,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKg1NzxqM5J",
        "date_air": "2017-03-06",
        "runtime": 11,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-66",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 66,
        "episode_title": "第 30 集",
        "episode_number": 30,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmOqWOl4Ed",
        "date_air": "2017-03-06",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-67",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 67,
        "episode_title": "第 31 集",
        "episode_number": 31,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKY38zMZ24e",
        "date_air": "2017-03-06",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-68",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 68,
        "episode_title": "第 32 集",
        "episode_number": 32,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW1eVWXa0OL",
        "date_air": "2018-06-25",
        "runtime": 13,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-69",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 69,
        "episode_title": "第 33 集",
        "episode_number": 33,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR68YWdeEO1",
        "date_air": "2018-06-25",
        "runtime": 11,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-70",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 70,
        "episode_title": "第 34 集",
        "episode_number": 34,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKvQMR3lx9Y",
        "date_air": "2018-07-02",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-71",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 71,
        "episode_title": "第 35 集",
        "episode_number": 35,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjvpW964Qy",
        "date_air": "2018-07-09",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-72",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 72,
        "episode_title": "第 36 集",
        "episode_number": 36,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQddK2Ppn4",
        "date_air": "2018-07-16",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-73",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 73,
        "episode_title": "第 37 集",
        "episode_number": 37,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7KwQNzMjB8N",
        "date_air": "2018-07-23",
        "runtime": 7,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-74",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 74,
        "episode_title": "第 38 集",
        "episode_number": 38,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOnPKd2QOl",
        "date_air": "2018-07-30",
        "runtime": 11,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-75",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 75,
        "episode_title": "第 39 集",
        "episode_number": 39,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDbBWV15GA",
        "date_air": "2018-08-06",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-76",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 76,
        "episode_title": "第 40 集",
        "episode_number": 40,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW92rzrbA37",
        "date_air": "2018-08-13",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-77",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 77,
        "episode_title": "第 41 集",
        "episode_number": 41,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz5l7WMQyqx",
        "date_air": "2018-08-20",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-78",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 78,
        "episode_title": "第 42 集",
        "episode_number": 42,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJkqWjJDwa",
        "date_air": "2020-03-14",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-79",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 79,
        "episode_title": "第 43 集",
        "episode_number": 43,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyw2zLwlgx",
        "date_air": "2018-08-27",
        "runtime": 7,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-80",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 80,
        "episode_title": "第 44 集",
        "episode_number": 44,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR74JKjOJqQ",
        "date_air": "2018-09-03",
        "runtime": 7,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-81",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 81,
        "episode_title": "第 45 集",
        "episode_number": 45,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERb1Dzp2Jeg",
        "date_air": "2018-09-10",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-82",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 82,
        "episode_title": "第 46 集",
        "episode_number": 46,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2018-09-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-83",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 83,
        "episode_title": "第 47 集",
        "episode_number": 47,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2018-09-24",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-84",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 84,
        "episode_title": "第 48 集",
        "episode_number": 48,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2018-10-01",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-85",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 85,
        "episode_title": "第 49 集",
        "episode_number": 49,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2018-10-08",
        "runtime": 9,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-86",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 86,
        "episode_title": "第 50 集",
        "episode_number": 50,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLlLzBkQAL",
        "date_air": "2020-03-10",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-87",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 87,
        "episode_title": "第 51 集",
        "episode_number": 51,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-03-23",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-88",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 88,
        "episode_title": "第 52 集",
        "episode_number": 52,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-03-30",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-89",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 89,
        "episode_title": "第 53 集",
        "episode_number": 53,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-04-06",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-90",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 90,
        "episode_title": "第 54 集",
        "episode_number": 54,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-04-13",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-91",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 91,
        "episode_title": "第 55 集",
        "episode_number": 55,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-04-20",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-92",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 92,
        "episode_title": "第 56 集",
        "episode_number": 56,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-04-27",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-93",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 93,
        "episode_title": "第 57 集",
        "episode_number": 57,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-05-04",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-94",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 94,
        "episode_title": "第 58 集",
        "episode_number": 58,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-05-11",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-95",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 95,
        "episode_title": "第 59 集",
        "episode_number": 59,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-05-18",
        "runtime": 16,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-96",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 96,
        "episode_title": "第 60 集",
        "episode_number": 60,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-05-25",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-97",
        "season_id": 1,
        "season_number": 0,
        "episode_id": 97,
        "episode_title": "第 61 集",
        "episode_number": 61,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-06-01",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-98",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 98,
        "episode_title": "第 1 集",
        "episode_number": 1,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzL7LWBkQAL",
        "date_air": "2010-12-05",
        "runtime": 11,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-99",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 99,
        "episode_title": "第 2 集",
        "episode_number": 2,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxA4KZMVmG",
        "date_air": "2011-04-03",
        "runtime": 15,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-100",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 100,
        "episode_title": "第 3 集",
        "episode_number": 3,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRo46KwZLEb",
        "date_air": "2011-04-07",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-101",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 101,
        "episode_title": "第 4 集",
        "episode_number": 4,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2011-04-10",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-102",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 102,
        "episode_title": "2011年动漫展",
        "episode_number": 5,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzebERDwvY8",
        "date_air": "2011-07-21",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-103",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 103,
        "episode_title": "非赢即死",
        "episode_number": 6,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBdazPpyQL",
        "date_air": "2012-03-24",
        "runtime": 22,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-104",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 104,
        "episode_title": "冰与火：一个伏笔",
        "episode_number": 9,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkkBzE846Z",
        "date_air": "2014-02-09",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-105",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 105,
        "episode_title": "权力的游戏：第3季回顾",
        "episode_number": 10,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZy6W1gPNe",
        "date_air": "2014-03-12",
        "runtime": 25,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-106",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 106,
        "episode_title": "生命中的一天",
        "episode_number": 11,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlZNRx051V",
        "date_air": "2015-02-08",
        "runtime": 26,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-107",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 107,
        "episode_title": "到目前为止的故事(2015)",
        "episode_number": 12,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8oVWDr6Xd",
        "date_air": "2015-03-16",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-108",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 108,
        "episode_title": "全球首映",
        "episode_number": 13,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R41vKPLYVr",
        "date_air": "2015-03-19",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-109",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 109,
        "episode_title": "红鼻子日《权力的游戏》音乐剧",
        "episode_number": 14,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPzn8BK3qVXO",
        "date_air": "2015-05-22",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-110",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 110,
        "episode_title": "到目前为止的故事(2016)",
        "episode_number": 15,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbrvRp2Jeg",
        "date_air": "2016-04-20",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-111",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 111,
        "episode_title": "游戏揭秘：第六季第1 & 2集",
        "episode_number": 16,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLGpWBkQAL",
        "date_air": "2016-08-01",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-112",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 112,
        "episode_title": "游戏揭秘：第六季第3 & 4集",
        "episode_number": 17,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRx1ZKZMVmG",
        "date_air": "2016-08-01",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-113",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 113,
        "episode_title": "游戏揭秘：第六季第5 & 6集",
        "episode_number": 18,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRomXWwZLEb",
        "date_air": "2016-08-01",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-114",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 114,
        "episode_title": "游戏揭秘：第六季第7 & 8集",
        "episode_number": 19,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzeGkKDwvY8",
        "date_air": "2016-08-01",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-115",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 115,
        "episode_title": "游戏揭秘：第六季第9 & 10集",
        "episode_number": 20,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKB4DzPpyQL",
        "date_air": "2016-08-01",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-116",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 116,
        "episode_title": "场景剖析：临冬城之战",
        "episode_number": 21,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkJwWE846Z",
        "date_air": "2016-06-19",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-117",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 117,
        "episode_title": "2016年动漫展",
        "episode_number": 22,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZ8JK1gPNe",
        "date_air": "2016-07-22",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-118",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 118,
        "episode_title": "第 23 集",
        "episode_number": 23,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlOVKx051V",
        "date_air": "2016-07-03",
        "runtime": 28,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-119",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 119,
        "episode_title": "到目前为止的故事(2017)",
        "episode_number": 24,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-07-13",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-120",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 120,
        "episode_title": "2017年动漫展",
        "episode_number": 25,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-07-21",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-121",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 121,
        "episode_title": "内幕：第七季第1集",
        "episode_number": 26,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8baKDr6Xd",
        "date_air": "2017-08-01",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-122",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 122,
        "episode_title": "内幕：第七季第2集",
        "episode_number": 27,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-08-01",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-123",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 123,
        "episode_title": "内幕：第七季第3集",
        "episode_number": 28,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R43BzPLYVr",
        "date_air": "2017-08-01",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-124",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 124,
        "episode_title": "内幕：第七季第4集",
        "episode_number": 29,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPznmrW3qVXO",
        "date_air": "2017-08-06",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-125",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 125,
        "episode_title": "内幕：第七季第5集",
        "episode_number": 30,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR2AXzxylZG",
        "date_air": "2017-08-13",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-126",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 126,
        "episode_title": "内幕：第七季第6集",
        "episode_number": 31,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-08-20",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-127",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 127,
        "episode_title": "内幕：第七季第7集",
        "episode_number": 32,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-08-28",
        "runtime": 9,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-128",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 128,
        "episode_title": "游戏揭秘：第七季第1集",
        "episode_number": 33,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9MqzdA2R3OoVg",
        "date_air": "2017-08-28",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-129",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 129,
        "episode_title": "游戏揭秘：第七季第2集",
        "episode_number": 34,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-09-07",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-130",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 130,
        "episode_title": "游戏揭秘：第七季第3集",
        "episode_number": 35,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-09-11",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-131",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 131,
        "episode_title": "权力的游戏：征服与反抗",
        "episode_number": 36,
        "episode_description": "《权力的游戏》的前传电视电影，故事由攸伦·葛雷乔伊、詹姆·兰尼斯特、培提尔·贝里席、珊莎·史塔克、韦赛利昂·坦格利安以及瓦里斯讲述，描绘了坦格利安家族从逃离瓦雷利亚到伊耿征服维斯特洛七大王国直到最终“疯王”伊里斯被劳勃·拜拉席恩击败的曲折历史。",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKM3YzVMyb4",
        "date_air": "2017-12-12",
        "runtime": 45,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-132",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 132,
        "episode_title": "游戏揭秘：第七季第4集",
        "episode_number": 37,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-09-18",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-133",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 133,
        "episode_title": "游戏揭秘：第七季第5集",
        "episode_number": 38,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-09-25",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-134",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 134,
        "episode_title": "游戏揭秘：第七季第6集",
        "episode_number": 39,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-10-02",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-135",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 135,
        "episode_title": "游戏揭秘：第七季第7集",
        "episode_number": 40,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2017-10-09",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-136",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 136,
        "episode_title": "60分钟专题报道",
        "episode_number": 42,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2019-04-14",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-137",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 137,
        "episode_title": "到目前为止的故事(2018)",
        "episode_number": 43,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2019-04-13",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-138",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 138,
        "episode_title": "第 44 集",
        "episode_number": 44,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/7Ld4J6WEdMK0pY5B",
        "date_air": "2019-04-08",
        "runtime": 10,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-139",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 139,
        "episode_title": "游戏揭秘：第八季第1集",
        "episode_number": 45,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b2Pvq1WXZkRABmNe",
        "date_air": "2019-04-15",
        "runtime": 18,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-140",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 140,
        "episode_title": "内幕：第八季第1集",
        "episode_number": 46,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrmVREj18e",
        "date_air": "2019-04-14",
        "runtime": 7,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-141",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 141,
        "episode_title": "游戏揭秘：第八季第2集",
        "episode_number": 47,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WN0aRX9Nvg",
        "date_air": "2019-04-22",
        "runtime": 20,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-142",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 142,
        "episode_title": "内幕：第八季第2集",
        "episode_number": 48,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWA8kKyZwaM",
        "date_air": "2019-04-21",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-143",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 143,
        "episode_title": "游戏揭秘：第八季第3集",
        "episode_number": 49,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGExzrEv1Q",
        "date_air": "2019-04-29",
        "runtime": 41,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-144",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 144,
        "episode_title": "内幕：第八季第3集",
        "episode_number": 50,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3GOW1qn9o",
        "date_air": "2019-04-28",
        "runtime": 11,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-145",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 145,
        "episode_title": "游戏揭秘：第八季第4集",
        "episode_number": 51,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0rdWnw5do",
        "date_air": "2019-05-05",
        "runtime": 19,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-146",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 146,
        "episode_title": "内幕：第八季第4集",
        "episode_number": 52,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPp2K7Dl91",
        "date_air": "2019-05-05",
        "runtime": 9,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-147",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 147,
        "episode_title": "游戏揭秘：第八季第5集",
        "episode_number": 53,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWpmnzQgPLE",
        "date_air": "2019-05-13",
        "runtime": 35,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-148",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 148,
        "episode_title": "内幕：第八季第5集",
        "episode_number": 54,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRaXXzADo5L",
        "date_air": "2019-05-13",
        "runtime": 10,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-149",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 149,
        "episode_title": "权力的游戏：最后的守夜人",
        "episode_number": 55,
        "episode_description": "《权力的游戏：最后的守夜人》是由Jeanie Finlay执导，大卫·贝尼奥夫、D·B·魏斯主演的一部电视剧。影片跟随剧组与演员，见证《权力的游戏》最终季的拍摄过程。",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1KqmgKqyj6Q",
        "date_air": "2019-05-26",
        "runtime": 113,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-150",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 150,
        "episode_title": "历史与传说：森林之子、先民和安达尔人（讲述人：布兰·史塔克）",
        "episode_number": 56,
        "episode_description": "布兰·史塔克介绍维斯特洛的原住民以及他们与先民和后来入侵的安达尔人的冲突。",
        "video_image_poster": "https://image.theotherdb.org/w185/eNVp2yzVBAz6rXJv",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-151",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 151,
        "episode_title": "历史与传说：英雄纪元（讲述人：布兰·史塔克）",
        "episode_number": 57,
        "episode_description": "布兰·史塔克简要讲述了在征服战争前七大独立王国一些传奇人物的故事。",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKg0MWxqM5J",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-152",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 152,
        "episode_title": "历史与传说：新旧诸神（讲述人：布兰·史塔克&凯特琳·徒利·史塔克）",
        "episode_number": 58,
        "episode_description": "布兰·史塔克和凯特琳·史塔克阐述了维斯特洛两大最主要信仰的本源：森林之子和先民的旧神与七神信仰。",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmm7ROl4Ed",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-153",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 153,
        "episode_title": "历史与传说：守夜人历史（讲述人：杰奥·莫尔蒙）",
        "episode_number": 59,
        "episode_description": "杰奥·莫尔蒙总司令讲述了守夜人的起源和目的，从自己角度介绍了守夜人的现状。",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKYlQRMZ24e",
        "date_air": "2012-03-05",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-154",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 154,
        "episode_title": "历史与传说：守夜人历史（讲述人：鲁温）",
        "episode_number": 60,
        "episode_description": "鲁温学士讲述了守夜人的起源和目的，并从自己角度介绍了守夜人的现状",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW1NJzXa0OL",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-155",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 155,
        "episode_title": "历史与传说：守夜人历史（讲述人：泰温·兰尼斯特）",
        "episode_number": 61,
        "episode_description": "泰温·兰尼斯特讲述了守夜人的起源和目的，从自己角度介绍了守夜人的现状。",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR6P9WdeEO1",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-156",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 156,
        "episode_title": "历史与传说：学士制度（讲述人：鲁温）",
        "episode_number": 62,
        "episode_description": "鲁温学士解释了学士制度在七大王国中扮演的角色和功能以及立志成为学士需要经历哪些考验。",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKvm4R3lx9Y",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-157",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 157,
        "episode_title": "历史与传说：瓦雷利亚与龙（讲述人：韦赛里斯·坦格利安）",
        "episode_number": 63,
        "episode_description": "韦赛里斯·坦格利安讲述瓦雷利亚自由堡垒的起源、龙在瓦雷利亚政权中的地位以及浩劫的余波。",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjmYK964Qy",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-158",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 158,
        "episode_title": "历史与传说：怒火燎原（讲述人：韦赛里斯·坦格利安）",
        "episode_number": 64,
        "episode_description": "韦赛里斯·坦格利安和罗柏·史塔克分别讲述了伊耿征服的过程以及怒火燎原造成的一系列影响。",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQbxz2Ppn4",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-159",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 159,
        "episode_title": "历史与传说：怒火燎原（讲述人：罗柏·史塔克）",
        "episode_number": 65,
        "episode_description": "和罗柏·史塔克讲述了伊耿征服的过程以及怒火燎原造成的一系列影响。",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7Kw5vzMjB8N",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-160",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 160,
        "episode_title": "历史与传说：疯王伊里斯（讲述人：劳勃·拜拉席恩）",
        "episode_number": 66,
        "episode_description": "劳勃·拜拉席恩自己的角度讲述了伊里斯·坦格利安二世国王的一些行为，正是这些所作所为导致劳勃的反叛。",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOPLzd2QOl",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-161",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 161,
        "episode_title": "历史与传说：疯王伊里斯（讲述人：鲁温）",
        "episode_number": 67,
        "episode_description": "鲁温学士自己的角度讲述了伊里斯·坦格利安二世国王的一些行为，正是这些所作所为导致劳勃的反叛。",
        "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRD2eWV15GA",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-162",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 162,
        "episode_title": "历史与传说：疯王伊里斯（讲述人：泰温·兰尼斯特）",
        "episode_number": 68,
        "episode_description": "泰温·兰尼斯特从自己的角度讲述了伊里斯·坦格利安二世国王的一些行为，正是这些所作所为导致劳勃的反叛。",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW9LyKrbA37",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-163",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 163,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：劳勃·拜拉席恩）",
        "episode_number": 69,
        "episode_description": "劳勃·拜拉席恩针对劳勃的反叛中一系列大事件给出了自己的观点——从战争爆发直到三叉戟河之役。",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz50oWMQyqx",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-164",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 164,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：韦赛里斯·坦格利安）",
        "episode_number": 70,
        "episode_description": "韦赛里斯·坦格利安针对劳勃的反叛中一系列大事件给出了自己的观点——从战争爆发直到三叉戟河之役。",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJNeKjJDwa",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-165",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 165,
        "episode_title": "历史与传说：君临陷落（讲述人：韦赛里斯·坦格利安）",
        "episode_number": 71,
        "episode_description": "韦赛里斯·坦格利安描述了君临沦陷的情景，显然他们对于此事的观点彼此相左。",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKymNKLwlgx",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-166",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 166,
        "episode_title": "历史与传说：君临陷落（讲述人：劳勃·拜拉席恩）",
        "episode_number": 72,
        "episode_description": "劳勃·拜拉席恩描述了君临沦陷的情景，显然他们对于此事的观点彼此相左。",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR77pRjOJqQ",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-167",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 167,
        "episode_title": "历史与传说：君临陷落（讲述人：鲁温）",
        "episode_number": 73,
        "episode_description": "鲁温描述了君临沦陷的情景，显然他们对于此事的观点彼此相左。",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbJvRp2Jeg",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-168",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 168,
        "episode_title": "历史与传说：君临陷落（讲述人：泰温·兰尼斯特）",
        "episode_number": 74,
        "episode_description": "泰温·兰尼斯特安描述了君临沦陷的情景，显然他们对于此事的观点彼此相左。",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLdpzBkQAL",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-169",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 169,
        "episode_title": "历史与传说：史塔克家族（讲述人：布兰·史塔克&罗柏·史塔克）",
        "episode_number": 75,
        "episode_description": "布兰和罗柏·史塔克讲述了史塔克家族古老的起源、悠久的历史和家族特性。",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxOZzZMVmG",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-170",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 170,
        "episode_title": "历史与传说：兰尼斯特家族（讲述人：泰温·兰尼斯特）",
        "episode_number": 76,
        "episode_description": "泰温·兰尼斯特公爵介绍了兰尼斯特家族的起源、现状和实力以及他本人在雷耶斯叛乱中扮演的角色。",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRogXRwZLEb",
        "date_air": "2012-03-05",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-171",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 171,
        "episode_title": "历史与传说：塔格利安家族（讲述人：韦赛里斯·塔格利安）",
        "episode_number": 77,
        "episode_description": "韦赛里斯·坦格利安叙述了坦格利安王朝的兴起、征服七大王国以及他自己和丹妮莉丝·坦格利安公主的流亡经历。",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzegkKDwvY8",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-172",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 172,
        "episode_title": "历史与传说：拜拉席恩家族（讲述人：劳勃·拜拉席恩）",
        "episode_number": 78,
        "episode_description": "劳勃一世国王讲述了征服战争中拜拉席恩家族的兴起以及它在劳勃的反叛后是如何掌控七国统治权的。",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKB7DWPpyQL",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-173",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 173,
        "episode_title": "历史与传说：艾林家族（讲述人：凯特琳·史塔克）",
        "episode_number": 79,
        "episode_description": "凯特琳·史塔克介绍了艾林家族的兴起、安达尔人入侵期间其征服谷地的经过以及劳勃的反叛中起到的作用。",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkYwKE846Z",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-174",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 174,
        "episode_title": "历史与传说：葛雷乔伊叛乱（讲述人：罗柏·史塔克）",
        "episode_number": 80,
        "episode_description": "罗柏·史塔克讲述了当年他的父亲率军向派克岛发动总攻平息巴隆·葛雷乔伊叛乱的情景。席恩·葛雷乔伊则从铁民的角度陈述，回忆了他父亲揭竿而起反抗君临的缘由以及他为失败所付出的代价。史坦尼斯·拜拉席恩详述了他击败葛雷乔伊铁舰队的过程，正是他的胜利为劳勃·拜拉席恩的大军开辟了登陆点。",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZgJR1gPNe",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-175",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 175,
        "episode_title": "历史与传说：葛雷乔伊叛乱（讲述人：席恩·葛雷乔伊）",
        "episode_number": 81,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlgVKx051V",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-176",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 176,
        "episode_title": "历史与传说：葛雷乔伊叛乱（讲述人：史坦尼斯·拜拉席恩）",
        "episode_number": 82,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8AaRDr6Xd",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-177",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 177,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：史坦尼斯·拜拉席恩）",
        "episode_number": 83,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R4EBKPLYVr",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-178",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 178,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：戴佛斯·席渥斯）",
        "episode_number": 84,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPzngrR3qVXO",
        "date_air": "2013-02-19",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-179",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 179,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：玛格丽·提利尔）",
        "episode_number": 85,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR2dXWxylZG",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-180",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 180,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：凯特琳·史塔克）",
        "episode_number": 86,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9Mqzd72W3OoVg",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-181",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 181,
        "episode_title": "历史与传说：泰瑞尔家族（讲述人：玛格丽·提利尔）",
        "episode_number": 87,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKMMYKVMyb4",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-182",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 182,
        "episode_title": "历史与传说：泰瑞尔家族（讲述人：席恩·葛雷乔伊&亚拉·葛雷乔伊）",
        "episode_number": 88,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/7Ld4J6WEkMR0pY5B",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-183",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 183,
        "episode_title": "历史与传说：克里冈家族（讲述人：桑铎·克里冈）",
        "episode_number": 89,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b2Pvq1WXakzABmNe",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-184",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 184,
        "episode_title": "历史与传说：自由民（讲述人:耶哥蕊特）",
        "episode_number": 90,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrOVWEj18e",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-185",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 185,
        "episode_title": "历史与传说：守夜人（讲述人：耶哥蕊特）",
        "episode_number": 91,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WNEaKX9Nvg",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-186",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 186,
        "episode_title": "历史与传说：龙石岛（讲述人：史坦尼斯·拜拉席恩）",
        "episode_number": 92,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWAxkKyZwaM",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-187",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 187,
        "episode_title": "历史与传说：赫伦堡（讲述人：凯特琳·史塔克）",
        "episode_number": 93,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGlxWrEv1Q",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-188",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 188,
        "episode_title": "历史与传说：自由贸易城邦（讲述人：乔拉·莫尔蒙）",
        "episode_number": 94,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3MOR1qn9o",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-189",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 189,
        "episode_title": "历史与传说：魁尔斯（讲述人：札罗·赞旺·达梭斯）",
        "episode_number": 95,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0ndWnw5do",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-190",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 190,
        "episode_title": "历史与传说：淹神（讲述人：亚拉·葛雷乔伊）",
        "episode_number": 96,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPr2z7Dl91",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-191",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 191,
        "episode_title": "历史与传说：炼金术士工会（讲述人：智者哈林）",
        "episode_number": 97,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWpgnKQgPLE",
        "date_air": "2013-02-19",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-192",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 192,
        "episode_title": "历史与传说：男巫（讲述人：札罗·赞旺·达梭斯）",
        "episode_number": 98,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRagXWADo5L",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-193",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 193,
        "episode_title": "历史与传说：古吉斯和奴隶湾（讲述人：乔拉·莫尔蒙）",
        "episode_number": 99,
        "episode_description": "乔拉·莫尔蒙解说了吉斯帝国的兴起和衰落、它与瓦雷利亚自由堡垒的数次交锋以及在它毁灭后奴隶城邦的兴起。",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1Kqggzqyj6Q",
        "date_air": "2014-02-18",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-194",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 194,
        "episode_title": "历史与传说：无垢者（讲述人：乔拉·莫尔蒙）",
        "episode_number": 100,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/eNVp2yzVPAK6rXJv",
        "date_air": "2014-02-18",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-195",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 195,
        "episode_title": "历史与传说：黎德家族（讲述人：梅拉·黎德）",
        "episode_number": 101,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKgJMRxqM5J",
        "date_air": "2014-02-18",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-196",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 196,
        "episode_title": "历史与传说：波顿家族（讲述人：卢斯·波顿）",
        "episode_number": 102,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmg7WOl4Ed",
        "date_air": "2014-02-18",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-197",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 197,
        "episode_title": "历史与传说：佛雷家族（讲述人：凯特琳·史塔克）",
        "episode_number": 103,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKYyQKMZ24e",
        "date_air": "2014-02-18",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-198",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 198,
        "episode_title": "历史与传说：徒利家族（讲述人：布林登·徒利）",
        "episode_number": 104,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW17JRXa0OL",
        "date_air": "2014-02-18",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-199",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 199,
        "episode_title": "历史与传说：光之王（讲述人：密尔的索罗斯）",
        "episode_number": 105,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR6r9RdeEO1",
        "date_air": "2014-02-18",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-200",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 200,
        "episode_title": "历史与传说：异形者与绿之视野 （讲述人：布兰·史塔克）",
        "episode_number": 106,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKvO4W3lx9Y",
        "date_air": "2014-02-18",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-201",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 201,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：培提尔·贝里席）",
        "episode_number": 107,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjOYz964Qy",
        "date_air": "2014-02-18",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-202",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 202,
        "episode_title": "历史与传说：红堡（讲述人：乔佛里·拜拉席恩）",
        "episode_number": 108,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQNxz2Ppn4",
        "date_air": "2014-02-18",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-203",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 203,
        "episode_title": "历史与传说：北境（讲述人：琼恩·雪诺）",
        "episode_number": 109,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7KwOvKMjB8N",
        "date_air": "2014-02-18",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-204",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 204,
        "episode_title": "历史与传说：河湾地（讲述人：玛格丽·提利尔）",
        "episode_number": 110,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOXLzd2QOl",
        "date_air": "2014-02-18",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-205",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 205,
        "episode_title": "历史与传说：河间地（讲述人：布林登·徒利）",
        "episode_number": 111,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDBeWV15GA",
        "date_air": "2014-02-18",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-206",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 206,
        "episode_title": "历史与传说：风暴地（讲述人：塔斯的布蕾妮）",
        "episode_number": 112,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW9GyRrbA37",
        "date_air": "2014-02-18",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-207",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 207,
        "episode_title": "历史与传说：西境（讲述人：泰温·兰尼斯特）",
        "episode_number": 113,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz5XoWMQyqx",
        "date_air": "2014-02-18",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-208",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 208,
        "episode_title": "历史与传说：谷地（讲述人：培提尔·贝里席）",
        "episode_number": 114,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJneKjJDwa",
        "date_air": "2014-02-18",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-209",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 209,
        "episode_title": "历史与传说：马泰尔家族（讲述人：奥柏伦·马泰尔）",
        "episode_number": 115,
        "episode_description": "奥柏伦·马泰尔介绍了马泰尔家族的历史与光辉。多恩的统治家族勇猛奔放，有数百年时间里都拒绝加入七大王国。",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyONzLwlgx",
        "date_air": "2015-02-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-210",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 210,
        "episode_title": "历史与传说：贝里席家族（讲述人：培提尔·贝里席）",
        "episode_number": 116,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR7NpzjOJqQ",
        "date_air": "2015-02-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-211",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 211,
        "episode_title": "历史与传说：龙（讲述人：派席尔大学士）",
        "episode_number": 117,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbevzp2Jeg",
        "date_air": "2015-02-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-212",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 212,
        "episode_title": "历史与传说：毒药",
        "episode_number": 118,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzL8pzBkQAL",
        "date_air": "2015-02-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-213",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 213,
        "episode_title": "历史与传说：维斯特洛的私生子们",
        "episode_number": 119,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxqZKZMVmG",
        "date_air": "2015-02-17",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-214",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 214,
        "episode_title": "历史与传说：布拉佛斯的铁金库（讲述人：泰楚·奈斯托斯）",
        "episode_number": 120,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRorXzwZLEb",
        "date_air": "2015-02-17",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-215",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 215,
        "episode_title": "历史与传说：雇佣兵与雇佣骑士（讲述人：波隆）",
        "episode_number": 121,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzeZkRDwvY8",
        "date_air": "2015-02-17",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-216",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 216,
        "episode_title": "历史与传说：劳勃叛乱 （讲述人：奥柏伦·马）",
        "episode_number": 122,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBqDRPpyQL",
        "date_air": "2015-02-17",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-217",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 217,
        "episode_title": "历史与传说： 绝境长城（讲述人：山姆威尔·塔利）",
        "episode_number": 123,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkdwRE846Z",
        "date_air": "2015-02-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-218",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 218,
        "episode_title": "历史与传说：塞外诸国（讲述人：巨人克星托蒙德）",
        "episode_number": 124,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZPJK1gPNe",
        "date_air": "2015-02-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-219",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 219,
        "episode_title": "历史与传说：御林铁卫（讲述人：詹姆·兰尼斯特）",
        "episode_number": 125,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlMVzx051V",
        "date_air": "2015-02-17",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-220",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 220,
        "episode_title": "历史与传说：御林铁卫（讲述人：波隆）",
        "episode_number": 126,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8XazDr6Xd",
        "date_air": "2015-02-17",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-221",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 221,
        "episode_title": "历史与传说：大师的锁链",
        "episode_number": 127,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R42BWPLYVr",
        "date_air": "2015-02-17",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-222",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 222,
        "episode_title": "历史与传说：列王之死（讲述人：瓦里斯）",
        "episode_number": 128,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPznXrK3qVXO",
        "date_air": "2015-02-17",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-223",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 223,
        "episode_title": "历史与传说：瓦雷利亚钢（讲述人：乔拉·莫尔蒙）",
        "episode_number": 129,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbeXzp2Jeg",
        "date_air": "2015-02-17",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-224",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 224,
        "episode_title": "历史与传说：七国律法（讲述人：波隆）",
        "episode_number": 130,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzL80zBkQAL",
        "date_air": "2015-02-17",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-225",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 225,
        "episode_title": "历史与传说：七星圣经（讲述人：大麻雀）",
        "episode_number": 131,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxq6KZMVmG",
        "date_air": "2016-03-15",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-226",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 226,
        "episode_title": "历史与传说：教团武装（讲述人：大麻雀）",
        "episode_number": 132,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRornzwZLEb",
        "date_air": "2016-03-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-227",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 227,
        "episode_title": "历史与传说：瓦兰提斯（讲述人：瓦里斯）",
        "episode_number": 133,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzeZ3RDwvY8",
        "date_air": "2016-03-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-228",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 228,
        "episode_title": "历史与传说：布拉佛斯（讲述人：泰楚·奈斯托斯）",
        "episode_number": 134,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBq9RPpyQL",
        "date_air": "2016-03-15",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-229",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 229,
        "episode_title": "历史与传说：无面者（讲述人：泰楚·奈斯托斯）",
        "episode_number": 135,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkd8RE846Z",
        "date_air": "2016-03-15",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-230",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 230,
        "episode_title": "历史与传说：临冬城（讲述人：卢斯·波顿）",
        "episode_number": 136,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZPOK1gPNe",
        "date_air": "2016-03-15",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-231",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 231,
        "episode_title": "历史与传说：守夜人总司令（讲述人：艾里沙·索恩）",
        "episode_number": 137,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlMqzx051V",
        "date_air": "2016-03-15",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-232",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 232,
        "episode_title": "历史与传说：劳勃叛乱（讲述人：巴利斯坦·赛尔弥）",
        "episode_number": 138,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8X9zDr6Xd",
        "date_air": "2016-03-15",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-233",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 233,
        "episode_title": "历史与传说：多恩（讲述人：艾拉莉亚·沙德）",
        "episode_number": 139,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R42rWPLYVr",
        "date_air": "2016-03-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-234",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 234,
        "episode_title": "历史与传说：弥林竞技场（讲述人：达里奥·纳哈里斯）",
        "episode_number": 140,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPznXQK3qVXO",
        "date_air": "2016-03-15",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-235",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 235,
        "episode_title": "历史与传说：洛恩河（讲述人：瓦里斯）",
        "episode_number": 141,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR249WxylZG",
        "date_air": "2016-03-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-236",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 236,
        "episode_title": "历史与传说：千面之神（讲述人：贾坤·赫加尔）",
        "episode_number": 142,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9MqzdkAW3OoVg",
        "date_air": "2016-03-15",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-237",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 237,
        "episode_title": "历史与传说：灰鳞病和石民（讲述人：科本）",
        "episode_number": 143,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKM4MRVMyb4",
        "date_air": "2016-03-15",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-238",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 238,
        "episode_title": "历史与传说：弥林的伟主（讲述人：弥桑黛）",
        "episode_number": 144,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/7Ld4J6WExxK0pY5B",
        "date_air": "2016-03-15",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-239",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 239,
        "episode_title": "血龙狂舞（讲述人：希琳·拜拉席恩）",
        "episode_number": 145,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b2Pvq1WX3yKABmNe",
        "date_air": "2016-03-15",
        "runtime": 21,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-240",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 240,
        "episode_title": "历史与传说：古道（讲述人：攸伦·葛雷乔伊）",
        "episode_number": 146,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrGlWEj18e",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-241",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 241,
        "episode_title": "历史与传说：选王会（讲述人：攸伦·葛雷乔伊）",
        "episode_number": 147,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WNnmWX9Nvg",
        "date_air": "2016-11-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-242",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 242,
        "episode_title": "历史与传说：日落之海（讲述人：攸伦·葛雷乔伊）",
        "episode_number": 148,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWAaBWyZwaM",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-243",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 243,
        "episode_title": "历史与传说：九铜板王之战（讲述人：雷伊修士）",
        "episode_number": 149,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGeQzrEv1Q",
        "date_air": "2016-11-15",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-244",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 244,
        "episode_title": "历史与传说：赫伦堡比武大会（讲述人：梅拉·黎德）",
        "episode_number": 150,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3njK1qn9o",
        "date_air": "2016-11-15",
        "runtime": 7,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-245",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 245,
        "episode_title": "历史与传说： 劳勃叛乱（讲述人：詹姆·兰尼斯特）",
        "episode_number": 151,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0lkRnw5do",
        "date_air": "2016-11-15",
        "runtime": 7,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-246",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 246,
        "episode_title": "历史与传说： 维斯·多斯拉克（讲述人：乔拉·莫尔蒙）",
        "episode_number": 152,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPdLK7Dl91",
        "date_air": "2016-11-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-247",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 247,
        "episode_title": "历史与传说：多斯拉克人（讲述人：乔拉·莫尔蒙）",
        "episode_number": 153,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWpNqRQgPLE",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-248",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 248,
        "episode_title": "历史与传说：史塔克家族的北境封臣（讲述人：珊莎·史塔克）",
        "episode_number": 154,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRaoAWADo5L",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-249",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 249,
        "episode_title": "历史与传说：森林之子与先民的战争（讲述人：三眼乌鸦）",
        "episode_number": 155,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1KqA7Kqyj6Q",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-250",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 250,
        "episode_title": "历史与传说：无旗兄弟会（讲述人：密尔的索罗斯）",
        "episode_number": 156,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/eNVp2yzVAgW6rXJv",
        "date_air": "2016-11-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-251",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 251,
        "episode_title": "历史与传说：旧镇（讲述人：派席尔_科本）",
        "episode_number": 157,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKg8dWxqM5J",
        "date_air": "2016-11-15",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-252",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 252,
        "episode_title": "历史与传说：戴恩家族（讲述人：小奈德·史塔克）",
        "episode_number": 158,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmE9ROl4Ed",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-253",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 253,
        "episode_title": "历史与传说：小小鸟（讲述人：瓦里斯）",
        "episode_number": 159,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKY0gRMZ24e",
        "date_air": "2016-11-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-254",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 254,
        "episode_title": "历史与传说：峡谷骑士（讲述人：培提尔·贝里席）",
        "episode_number": 160,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW182KXa0OL",
        "date_air": "2016-11-15",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-255",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 255,
        "episode_title": "历史与传说：塔利家族（讲述人：蓝道·塔利）",
        "episode_number": 161,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR63lKdeEO1",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-256",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 256,
        "episode_title": "历史与传说：奔流城（讲述人：布林登·徒利）",
        "episode_number": 162,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKvLBz3lx9Y",
        "date_air": "2016-11-15",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-257",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 257,
        "episode_title": "历史与传说：贝勒大圣堂（讲述人：大麻雀）",
        "episode_number": 163,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjrLW964Qy",
        "date_air": "2016-11-15",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-258",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 258,
        "episode_title": "历史与传说：龙穴（讲述人：瓦里斯_科本）",
        "episode_number": 164,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQy8W2Ppn4",
        "date_air": "2017-12-12",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-259",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 259,
        "episode_title": "历史与传说：旧镇学城 （讲述人：山姆威尔·塔利）",
        "episode_number": 165,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7KwxLWMjB8N",
        "date_air": "2017-12-12",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-260",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 260,
        "episode_title": "历史与传说：凯岩城（讲述人：詹姆·兰尼斯特）",
        "episode_number": 166,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOy0Rd2QOl",
        "date_air": "2017-12-12",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-261",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 261,
        "episode_title": "历史与传说：高庭（讲述人：蓝道·塔利）",
        "episode_number": 167,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDygKV15GA",
        "date_air": "2017-12-12",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-262",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 262,
        "episode_title": "历史与传说：黄金团（讲述人：乔拉·莫尔蒙）",
        "episode_number": 168,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW9pnKrbA37",
        "date_air": "2017-12-12",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-263",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 263,
        "episode_title": "历史与传说：已知世界的预言（讲述人：山姆威尔·塔利）",
        "episode_number": 169,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz57MKMQyqx",
        "date_air": "2017-12-12",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-264",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 264,
        "episode_title": "历史与传说：国王之手（讲述人：培提尔·贝里席）",
        "episode_number": 170,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJygRjJDwa",
        "date_air": "2017-12-12",
        "runtime": 4,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-265",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 265,
        "episode_title": "历史与传说：卡斯特梅的雨季（讲述人：詹姆·兰尼斯特）",
        "episode_number": 171,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyegKLwlgx",
        "date_air": "2017-12-12",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-266",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 266,
        "episode_title": "历史与传说：君临",
        "episode_number": 172,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR70LKjOJqQ",
        "date_air": "2019-12-03",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-267",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 267,
        "episode_title": "历史与传说：葛雷乔伊叛乱（詹姆·兰尼斯特与攸伦·葛雷乔伊）",
        "episode_number": 173,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERb8XWp2Jeg",
        "date_air": "2019-12-03",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-268",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 268,
        "episode_title": "历史与传说：黑火家族",
        "episode_number": 174,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLy0RBkQAL",
        "date_air": "2019-12-03",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-269",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 269,
        "episode_title": "历史与传说：南部地区",
        "episode_number": 175,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxo6zZMVmG",
        "date_air": "2019-12-03",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-270",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 270,
        "episode_title": "历史与传说：暮谷镇之乱",
        "episode_number": 176,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRo0nKwZLEb",
        "date_air": "2019-12-03",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-271",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 271,
        "episode_title": "历史与传说：“残酷的”梅葛",
        "episode_number": 177,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6Mze23RDwvY8",
        "date_air": "2019-12-03",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-272",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 272,
        "episode_title": "第 178 集",
        "episode_number": 178,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBy9RPpyQL",
        "date_air": "2016-03-14",
        "runtime": 18,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-273",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 273,
        "episode_title": "第 179 集",
        "episode_number": 179,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkN8WE846Z",
        "date_air": "2016-03-14",
        "runtime": 22,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-274",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 274,
        "episode_title": "第 180 集",
        "episode_number": 180,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZLOK1gPNe",
        "date_air": "2012-03-05",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-275",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 275,
        "episode_title": "第 181 集",
        "episode_number": 181,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlAqzx051V",
        "date_air": "2012-03-05",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-276",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 276,
        "episode_title": "第 182 集",
        "episode_number": 182,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8P9zDr6Xd",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-277",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 277,
        "episode_title": "第 183 集",
        "episode_number": 183,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R4ArKPLYVr",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-278",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 278,
        "episode_title": "第 184 集",
        "episode_number": 184,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPzn3QR3qVXO",
        "date_air": "2012-03-05",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-279",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 279,
        "episode_title": "第 185 集",
        "episode_number": 185,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR2r9RxylZG",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-280",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 280,
        "episode_title": "第一季角色简介：丹妮莉丝·坦格利安",
        "episode_number": 186,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9MqzdnAK3OoVg",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-281",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 281,
        "episode_title": "第 187 集",
        "episode_number": 187,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKMyMKVMyb4",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-282",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 282,
        "episode_title": "第一季角色简介：琼恩·雪诺",
        "episode_number": 188,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/7Ld4J6WEyxW0pY5B",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-283",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 283,
        "episode_title": "第 189 集",
        "episode_number": 189,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b2Pvq1WXyyzABmNe",
        "date_air": "2012-03-05",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-284",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 284,
        "episode_title": "第 190 集",
        "episode_number": 190,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKralREj18e",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-285",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 285,
        "episode_title": "第 191 集",
        "episode_number": 191,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WNymKX9Nvg",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-286",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 286,
        "episode_title": "第一季角色简介：罗柏·史塔克",
        "episode_number": 192,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWAyBWyZwaM",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-287",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 287,
        "episode_title": "第 193 集",
        "episode_number": 193,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGyQzrEv1Q",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-288",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 288,
        "episode_title": "第 194 集",
        "episode_number": 194,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3NjK1qn9o",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-289",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 289,
        "episode_title": "第 195 集",
        "episode_number": 195,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0EkKnw5do",
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-290",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 290,
        "episode_title": "第 196 集",
        "episode_number": 196,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPyLW7Dl91",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-291",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 291,
        "episode_title": "第 197 集",
        "episode_number": 197,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWpPqWQgPLE",
        "date_air": "2012-03-05",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-292",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 292,
        "episode_title": "第 198 集",
        "episode_number": 198,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRalAzADo5L",
        "date_air": "2012-03-05",
        "runtime": 5,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-293",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 293,
        "episode_title": "第 199 集",
        "episode_number": 199,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1Kqp7Rqyj6Q",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-294",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 294,
        "episode_title": "第 200 集",
        "episode_number": 200,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/eNVp2yzVygW6rXJv",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-295",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 295,
        "episode_title": "第 201 集",
        "episode_number": 201,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKgMdzxqM5J",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-296",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 296,
        "episode_title": "第二季角色简介：乔佛里·拜拉席恩",
        "episode_number": 202,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmG9WOl4Ed",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-297",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 297,
        "episode_title": "第二季角色简介：蓝礼·拜拉席恩",
        "episode_number": 203,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKYbgWMZ24e",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-298",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 298,
        "episode_title": "第二季角色简介：史坦尼斯·拜拉席恩",
        "episode_number": 204,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW1X2KXa0OL",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-299",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 299,
        "episode_title": "第二季角色简介：席恩·葛雷乔伊",
        "episode_number": 205,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR6klKdeEO1",
        "date_air": "2013-02-19",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-300",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 300,
        "episode_title": "创造黑水湾之战",
        "episode_number": 206,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKv2BK3lx9Y",
        "date_air": "2013-02-19",
        "runtime": 31,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-301",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 301,
        "episode_title": "第 207 集",
        "episode_number": 207,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjbLW964Qy",
        "date_air": "2013-02-19",
        "runtime": 24,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-302",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 302,
        "episode_title": "第 208 集",
        "episode_number": 208,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQe8W2Ppn4",
        "date_air": "2013-02-19",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-303",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 303,
        "episode_title": "新角色",
        "episode_number": 209,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7KwdLWMjB8N",
        "date_air": "2014-02-18",
        "runtime": 10,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-304",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 304,
        "episode_title": "暴风前夕",
        "episode_number": 210,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOx0zd2QOl",
        "date_air": "2014-02-18",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-305",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 305,
        "episode_title": "政治婚姻",
        "episode_number": 211,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDGgzV15GA",
        "date_air": "2014-02-18",
        "runtime": 9,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-306",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 306,
        "episode_title": "野人内部",
        "episode_number": 212,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW98nKrbA37",
        "date_air": "2014-02-18",
        "runtime": 6,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-307",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 307,
        "episode_title": "第 213 集",
        "episode_number": 213,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 14,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-308",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 308,
        "episode_title": "第 214 集",
        "episode_number": 214,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz5BMRMQyqx",
        "date_air": "2015-02-17",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-309",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 309,
        "episode_title": "第 215 集",
        "episode_number": 215,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJqgRjJDwa",
        "date_air": "2015-02-17",
        "runtime": 37,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-310",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 310,
        "episode_title": "第 217 集",
        "episode_number": 217,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyEgKLwlgx",
        "date_air": "2015-02-17",
        "runtime": 7,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-311",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 311,
        "episode_title": "第 218 集",
        "episode_number": 218,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR7ZLzjOJqQ",
        "date_air": "2015-02-17",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-312",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 312,
        "episode_title": "第 219 集",
        "episode_number": 219,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2015-02-17",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-313",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 313,
        "episode_title": "第 220 集",
        "episode_number": 220,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERb3XKp2Jeg",
        "date_air": "2015-02-17",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-314",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 314,
        "episode_title": "第 221 集",
        "episode_number": 221,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLg0WBkQAL",
        "date_air": "2016-03-15",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-315",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 315,
        "episode_title": "第 223 集",
        "episode_number": 223,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxM6KZMVmG",
        "date_air": "2016-03-15",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-316",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 316,
        "episode_title": "第 226 集",
        "episode_number": 226,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2016-03-15",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-317",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 317,
        "episode_title": "第 227 集",
        "episode_number": 227,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRoBnzwZLEb",
        "date_air": "2016-11-15",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-318",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 318,
        "episode_title": "第 228 集",
        "episode_number": 228,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6Mzep3WDwvY8",
        "date_air": "2016-11-15",
        "runtime": 21,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-319",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 319,
        "episode_title": "第 230 集",
        "episode_number": 230,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2016-11-15",
        "runtime": 12,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-320",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 320,
        "episode_title": "第 231 集",
        "episode_number": 231,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBN9KPpyQL",
        "date_air": "2012-03-05",
        "runtime": 61,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-321",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 321,
        "episode_title": "第 232 集",
        "episode_number": 232,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2012-03-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-322",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 322,
        "episode_title": "第 233 集",
        "episode_number": 233,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkL8RE846Z",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-323",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 323,
        "episode_title": "第 234 集",
        "episode_number": 234,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2012-03-05",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-324",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 324,
        "episode_title": "第 235 集",
        "episode_number": 235,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2012-03-05",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-325",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 325,
        "episode_title": "第 236 集",
        "episode_number": 236,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2012-03-05",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-326",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 326,
        "episode_title": "第 237 集",
        "episode_number": 237,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZdOK1gPNe",
        "date_air": "2012-03-05",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-327",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 327,
        "episode_title": "第 238 集",
        "episode_number": 238,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlxqWx051V",
        "date_air": "2013-02-19",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-328",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 328,
        "episode_title": "第 239 集",
        "episode_number": 239,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8l9zDr6Xd",
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-329",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 329,
        "episode_title": "第 240 集",
        "episode_number": 240,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-330",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 330,
        "episode_title": "第 241 集",
        "episode_number": 241,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2013-02-19",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-331",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 331,
        "episode_title": "第 243 集",
        "episode_number": 243,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2015-02-17",
        "runtime": 23,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-332",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 332,
        "episode_title": "第 244 集",
        "episode_number": 244,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 47,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-333",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 333,
        "episode_title": "第 248 集",
        "episode_number": 248,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2013-02-19",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-334",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 334,
        "episode_title": "第 249 集",
        "episode_number": 249,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2019-05-26",
        "runtime": 9,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-335",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 335,
        "episode_title": "艾莉亚的转变",
        "episode_number": 250,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-336",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 336,
        "episode_title": "艾莉亚和猎犬",
        "episode_number": 251,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-337",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 337,
        "episode_title": "丹尼三角恋",
        "episode_number": 252,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-338",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 338,
        "episode_title": "婚床仪式",
        "episode_number": 253,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-339",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 339,
        "episode_title": "维斯特洛的婚姻",
        "episode_number": 254,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-340",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 340,
        "episode_title": "埃索斯\u200c自由公司",
        "episode_number": 255,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-341",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 341,
        "episode_title": "礼物的历史",
        "episode_number": 256,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-342",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 342,
        "episode_title": "终极惊喜",
        "episode_number": 257,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-343",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 343,
        "episode_title": "琼恩·雪诺的诱惑",
        "episode_number": 258,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-344",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 344,
        "episode_title": "一个人必须为艺术而受苦",
        "episode_number": 259,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-345",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 345,
        "episode_title": "客人权利",
        "episode_number": 260,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-346",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 346,
        "episode_title": "夜堡的历史",
        "episode_number": 261,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-347",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 347,
        "episode_title": "奴隶湾的历史",
        "episode_number": 262,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-348",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 348,
        "episode_title": "《卡斯塔梅的雨》的新声音",
        "episode_number": 263,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-349",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 349,
        "episode_title": "卢斯·波顿的动机",
        "episode_number": 264,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-350",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 350,
        "episode_title": "巫师山姆",
        "episode_number": 265,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-351",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 351,
        "episode_title": "丹妮的动机：解放奴隶",
        "episode_number": 266,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-352",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 352,
        "episode_title": "狂野突袭者",
        "episode_number": 267,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-353",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 353,
        "episode_title": "斯塔克精神状态",
        "episode_number": 268,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-354",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 354,
        "episode_title": "第 269 集",
        "episode_number": 269,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R4erKPLYVr",
        "date_air": "2017-12-12",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-355",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 355,
        "episode_title": "第 270 集",
        "episode_number": 270,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPzneQW3qVXO",
        "date_air": "2017-12-12",
        "runtime": 25,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-356",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 356,
        "episode_title": "第 271 集",
        "episode_number": 271,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERb3mKp2Jeg",
        "date_air": "2017-12-12",
        "runtime": 22,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-357",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 357,
        "episode_title": "乔恩的内心挣扎",
        "episode_number": 272,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-358",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 358,
        "episode_title": "乔恩的悲剧缺陷",
        "episode_number": 273,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-359",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 359,
        "episode_title": "视觉特效：创造双胞胎",
        "episode_number": 274,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-360",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 360,
        "episode_title": "视觉特效：创造墙",
        "episode_number": 275,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-361",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 361,
        "episode_title": "第 276 集",
        "episode_number": 276,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 11,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-362",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 362,
        "episode_title": "第 277 集",
        "episode_number": 277,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 12,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-363",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 363,
        "episode_title": "第 278 集",
        "episode_number": 278,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2014-02-18",
        "runtime": 8,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-364",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 364,
        "episode_title": "第 279 集",
        "episode_number": 279,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLgGWBkQAL",
        "date_air": "2019-12-03",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-365",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 365,
        "episode_title": "第 280 集",
        "episode_number": 280,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxMOKZMVmG",
        "date_air": "2019-12-09",
        "runtime": 32,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-366",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 366,
        "episode_title": "第 281 集",
        "episode_number": 281,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-03",
        "runtime": 28,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-367",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 367,
        "episode_title": "第 282 集",
        "episode_number": 282,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-03",
        "runtime": 24,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-368",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 368,
        "episode_title": "第 283 集",
        "episode_number": 283,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-03",
        "runtime": 27,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-369",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 369,
        "episode_title": "第 284 集",
        "episode_number": 284,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-03",
        "runtime": 15,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-370",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 370,
        "episode_title": "第 285 集",
        "episode_number": 285,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-09",
        "runtime": 19,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-371",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 371,
        "episode_title": "第 286 集",
        "episode_number": 286,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-09",
        "runtime": 19,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-372",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 372,
        "episode_title": "第 287 集",
        "episode_number": 287,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-09",
        "runtime": 26,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-373",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 373,
        "episode_title": "第 288 集",
        "episode_number": 288,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-10",
        "runtime": 18,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-374",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 374,
        "episode_title": "第 289 集",
        "episode_number": 289,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-16",
        "runtime": 21,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-375",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 375,
        "episode_title": "第 290 集",
        "episode_number": 290,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-17",
        "runtime": 25,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-376",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 376,
        "episode_title": "第 291 集",
        "episode_number": 291,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-17",
        "runtime": 25,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-377",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 377,
        "episode_title": "第 292 集",
        "episode_number": 292,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-23",
        "runtime": 26,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-378",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 378,
        "episode_title": "第 293 集",
        "episode_number": 293,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-24",
        "runtime": 22,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-379",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 379,
        "episode_title": "第 294 集",
        "episode_number": 294,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-30",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-380",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 380,
        "episode_title": "权力的游戏：最后的守夜人",
        "episode_number": 295,
        "episode_description": "《权力的游戏：最后的守夜人》是由Jeanie Finlay执导，大卫·贝尼奥夫、D·B·魏斯主演的一部电视剧。影片跟随剧组与演员，见证《权力的游戏》最终季的拍摄过程。",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRoBrzwZLEb",
        "date_air": "2019-05-26",
        "runtime": 120,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-381",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 381,
        "episode_title": "第 296 集",
        "episode_number": 296,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-382",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 382,
        "episode_title": "第 297 集",
        "episode_number": 297,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-05",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-383",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 383,
        "episode_title": "第 298 集",
        "episode_number": 298,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-05",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-384",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 384,
        "episode_title": "第 299 集",
        "episode_number": 299,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-10",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-385",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 385,
        "episode_title": "第 300 集",
        "episode_number": 300,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-10",
        "runtime": 1,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-386",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 386,
        "episode_title": "第 301 集",
        "episode_number": 301,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-10",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-387",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 387,
        "episode_title": "第 302 集",
        "episode_number": 302,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-10",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-388",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 388,
        "episode_title": "第 303 集",
        "episode_number": 303,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-10",
        "runtime": 3,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-389",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 389,
        "episode_title": "第 304 集",
        "episode_number": 304,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-10",
        "runtime": 2,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-390",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 390,
        "episode_title": "第 305 集",
        "episode_number": 305,
        "episode_description": "",
        "video_image_poster": null,
        "date_air": "2020-11-16",
        "runtime": null,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-391",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 391,
        "episode_title": "第 306 集",
        "episode_number": 306,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6Mzep2WDwvY8",
        "date_air": "2019-07-24",
        "runtime": 30,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-392",
        "season_id": 6,
        "season_number": 0,
        "episode_id": 392,
        "episode_title": "第 307 集",
        "episode_number": 307,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBNNKPpyQL",
        "date_air": "2019-07-30",
        "runtime": 26,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-393",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 393,
        "episode_title": "凛冬将至",
        "episode_number": 1,
        "episode_description": "一名守夜人军团的逃兵在临冬城外被抓获，领主艾德（奈德）·史塔克下令将其处斩。艾德对绝境长城之外的形势忧心忡忡。行刑结束后，艾德回到城中，他的夫人凯特琳带来一个令人震惊的消息：奈德的良师益友、现任首相琼恩·艾林在都城离奇死亡，国王劳勃正启程赶往北方，希望艾德接替琼恩·艾林出任国王之手。",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrlozEj18e",
        "date_air": "2011-04-17",
        "runtime": 62,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-394",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 394,
        "episode_title": "国王大道",
        "episode_number": 2,
        "episode_description": "布兰的性命依然堪忧。而艾德·史塔克已经同意成为首相，与女儿珊莎和艾莉亚离开临冬城；凯特琳则留下来照顾布兰。艾德的私生子琼恩·雪诺前往北部边境加入守夜人军团。王后瑟曦的弟弟提利昂·兰尼斯特决定不随大队回南方，而跟琼恩一起前往北境长城。韦赛里斯急于要回王座，而妹妹丹妮莉丝却把精力投入到取悦丈夫卓戈上来。",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WNLrRX9Nvg",
        "date_air": "2011-04-24",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-395",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 395,
        "episode_title": "雪诺大人",
        "episode_number": 3,
        "episode_description": "艾德和两个女儿经过长途跋涉来到君临城，从手下人那里得知国王近些年不仅挥霍无度，而且行为不检。黑城堡内，琼恩·雪诺向提力昂展示新人的力量，令提力昂印象深刻。凯特琳怀疑兰尼斯特姐弟与布兰的坠楼事件有关联，瞒着丈夫偷偷南下君临城。小指头培提尔·贝里席在途中拦住凯特琳，称他另有安排。瑟曦和詹姆担心布兰康复后会指认他们二人的罪行。艾莉娅开始学习剑术。狭海的另一端，丹妮莉斯与韦赛里斯因意见不合而发生争吵。",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWArLzyZwaM",
        "date_air": "2011-05-01",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-396",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 396,
        "episode_title": "残缺之躯",
        "episode_number": 4,
        "episode_description": "艾德希望从书中找出前任首相琼恩·艾林死亡的真正原因。他怀疑艾林可能被人下毒，于是求教于派席尔大学士，但狡猾的派席尔一问三不知。同样不值得信任的小指头警告艾德，君临城里到处是间谍，他必须处处小心。与此同时，一则有趣的信息引他找到当地的铁匠。他发现劳勃国王竟然有一个秘密的私生子。为欢迎艾德到来，劳勃和幕僚决定举办比武大会。",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKG0gWrEv1Q",
        "date_air": "2011-05-08",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-397",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 397,
        "episode_title": "狮狼之争",
        "episode_number": 5,
        "episode_description": "得知坦格利安兄妹密谋与多斯拉克人一道入侵维斯特洛大陆，劳勃国王大发雷霆，下令对坦格利安兄妹斩草除根。艾德反对劳勃的决定，两人之间产生裂痕。被俘的提力昂答应帮助凯特琳，但是在鹰巢城里，凯特琳的妹妹、前任首相琼恩·艾林的遗孀莱莎却给了提力昂一个下马威。",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3xBz1qn9o",
        "date_air": "2011-05-15",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-398",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 398,
        "episode_title": "黄金王冠",
        "episode_number": 6,
        "episode_description": "劳勃不顾瑟曦的强烈反对，让艾德官复原职。劳勃外出狩猎，艾德以国王之手的身份代理朝政。艾德从平民百姓口中得知兰尼斯特家族的爪牙正在七大王国的土地上制造混乱。艾德颁布了一道可能对七大王国产生深远影响的命令。",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR09PKnw5do",
        "date_air": "2011-05-22",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-399",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 399,
        "episode_title": "成王败寇",
        "episode_number": 7,
        "episode_description": "泰温担心兰尼斯特家族面临危险，命令詹姆做一个有勇气的男人，准备迎接战斗。艾德质问瑟曦是否参与了谋害琼恩·艾林的阴谋。班杨·史塔克依然下落不明，琼恩决定正式加入守夜人军团，到绝境长城之外去寻找叔叔。然而琼恩得到的任务却远非他所预料的。",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPQ8W7Dl91",
        "date_air": "2011-05-29",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-400",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 400,
        "episode_title": "针锋相对",
        "episode_number": 8,
        "episode_description": "艾德被囚禁后，艾莉娅和西利欧不得不面对兰尼斯特家族的卫兵。瑟曦控制思想单纯的珊莎为她服务。罗柏·史塔克听说父亲的不幸遭遇后，立刻召集父亲的封臣起兵南下，与泰温·兰尼斯特的大军对峙。提力昂说服山丘野人部落和他一起参战，帮助父亲赢得这场战争。",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWpoaKQgPLE",
        "date_air": "2011-06-05",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-401",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 401,
        "episode_title": "贝勒神像",
        "episode_number": 9,
        "episode_description": "得知珊莎有危险，艾德做出一个重大决定。凯特琳被迫与河渡口领主、孪河城侯爵瓦德·佛雷达成一项令她很不舒服的协议－－让儿子罗柏迎娶佛雷的女儿，以换取北境大军顺利通过石桥的许可。",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRaQ6RADo5L",
        "date_air": "2011-06-12",
        "runtime": 57,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-402",
        "season_id": 7,
        "season_number": 1,
        "episode_id": 402,
        "episode_title": "血火同源",
        "episode_number": 10,
        "episode_description": "艾德·史塔克被斩首，尤伦（曾向艾德·史塔克要求，囚犯可作为黑衣军团守护长城）为了保护艾莉亚，割去了艾莉亚的长发。并将她混在黑衣人的部队中送往临冬城。乔佛里将艾德·史塔克的头颅挂于城墙之上，并逼迫珊莎·史塔克凝视父亲的人头。在部下的拥簇下，罗柏·史塔克称“北境之王”。",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1KqeaKqyj6Q",
        "date_air": "2011-06-19",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-403",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 403,
        "episode_title": "北境不忘",
        "episode_number": 1,
        "episode_description": "当罗柏·史塔克率领北方联军征讨兰尼斯特家族时，提利昂奉泰温公爵之命返回君临，以国王之手的身份辅佐小国王乔佛里。包括史坦尼斯·拜拉席恩在内的更多人都觊觎着铁王座。与此同时，琼恩·雪诺和守夜人军团在北境长城之外继续跋涉。狭海的另一边，丹妮莉斯和她的卡拉萨残余部队穿越红色荒原。",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKgQEzxqM5J",
        "date_air": "2012-04-01",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-404",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 404,
        "episode_title": "夜之国度",
        "episode_number": 2,
        "episode_description": "新任国王之手提利昂试图控制君临的局面，并惩罚谋害国王重臣的瑟曦及其拥趸。席恩·葛雷乔伊终于与他父亲巴隆在铁群岛重逢。艾莉亚与守夜人部队的残存新兵们继续向长城进发。戴佛斯邀请海盗加盟史坦尼斯征伐君临的大军。",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmbdKOl4Ed",
        "date_air": "2012-04-08",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-405",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 405,
        "episode_title": "逝者永恒",
        "episode_number": 3,
        "episode_description": "提利昂在红堡密谋通过联姻的方式确立三场联盟。凯特琳来到风暴地，为北方势力寻找新的盟友。然而蓝礼国王和他的新婚妻子玛格丽·提利尔，以及玛格丽之兄洛拉斯却似乎另有所图。在遥远的临冬城，鲁温学士则试图向布兰·史塔克解析梦境。",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKYQJKMZ24e",
        "date_air": "2012-04-15",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-406",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 406,
        "episode_title": "骸骨花园",
        "episode_number": 4,
        "episode_description": "当罗柏·史塔克胜利的消息传来，乔佛里报复性地对珊莎施以“惩罚”，提利昂和波隆则竭力阻止国王的种种残酷行为。凯特琳恳求史坦尼斯和蓝礼暂时放下对王位的争夺，联合起来共同对付兰尼斯特家族。东方大陆的城市魁尔斯，繁荣兴盛，规模宏大，有着坚固的城墙，当丹妮莉丝和她疲惫的卡拉萨抵达之时，看到这座城市的统治者正在城外等候他们。在君临，提利昂强迫瑟曦的一个手下做自己的眼线。艾莉亚和詹德利落入“魔山”之手，被带到了赫伦堡。戴佛斯则不得不重操旧业，使出当年走私的本事将梅丽珊卓偷运至一个隐秘的港湾。",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW1bkzXa0OL",
        "date_air": "2012-04-22",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-407",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 407,
        "episode_title": "古堡幽灵",
        "episode_number": 5,
        "episode_description": "拜拉席恩兄弟的对峙落幕，凯特琳未能达成目标，只好匆匆逃离，也促使小指头开始采取行动。在君临，提利昂的情报提醒了他乔佛里防备计划中的漏洞，同时情报也向他提及了一种神秘武器。席恩驾船驶向磐石海岸，试图证明自己称得上是一名真正的铁种。在赫伦堡，曾被艾莉亚从金袍子手中救下的三名犯人之一，贾昆·赫加尔向她许下承诺。守夜人则抵达先民拳峰的古老城堡，希望以此为据点对抗野人。",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR6BXRdeEO1",
        "date_air": "2012-04-29",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-408",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 408,
        "episode_title": "新旧诸神",
        "episode_number": 6,
        "episode_description": "席恩的计划大获成功；在君临城，兰尼斯特家族选择一个「最恰当的时机」送走了弥赛菈公主。艾莉亚见到一个不速之客；丹妮莉斯发誓要夺回本该属于她的一切；罗柏和凯特琳收到了至关重要的信息；乔佛里接见他的臣民；琼恩·雪诺必须向断掌科林证明自己的勇气。",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKv8Dz3lx9Y",
        "date_air": "2012-05-06",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-409",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 409,
        "episode_title": "毁誉之人",
        "episode_number": 7,
        "episode_description": "詹姆见到了一个远房亲戚；丹妮莉斯获得进入不朽之殿的邀请；席恩率领一支搜寻队出发；琼恩在荒野之中迷路了；瑟曦对珊莎提出忠告。",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjQ6K964Qy",
        "date_air": "2012-05-13",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-410",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 410,
        "episode_title": "北国僭主",
        "episode_number": 8,
        "episode_description": "一个不速之客出现在临冬城，席恩使用强力手段控制城池；艾莉亚让贾昆完成最后一个承诺，但贾昆对艾莉亚这次的要求有些不悦。罗柏遭到背叛。提力昂和瓦里斯发现他们存在共同利益。丹妮莉斯忽视了乔拉的建议。史坦尼斯和戴佛斯继续向既定目标前进，戴佛斯获得一份奖赏。",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQQJW2Ppn4",
        "date_air": "2012-05-20",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-411",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 411,
        "episode_title": "黑水大战",
        "episode_number": 9,
        "episode_description": "史坦尼斯的舰队开始对君临城发动猛烈攻击，提力昂和兰尼斯特家族不得不为生存而战。",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7Kw47WMjB8N",
        "date_air": "2012-05-27",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-412",
        "season_id": 8,
        "season_number": 2,
        "episode_id": 412,
        "episode_title": "凡人皆有一死",
        "episode_number": 10,
        "episode_description": "席恩鼓动他的人采取行动；鲁温大师向席恩提供了最后的建议；与此同时，布蕾妮用自己的实力来让詹姆「闭嘴」；艾莉亚收到了贾昆的礼物；丹妮莉斯来到一个陌生而奇怪的地方；琼恩·雪诺终于向断掌科林证明了自己的「价值」。",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOQvRd2QOl",
        "date_air": "2012-06-03",
        "runtime": 64,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-413",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 413,
        "episode_title": "凡人皆需侍奉",
        "episode_number": 1,
        "episode_description": "琼恩·雪诺被带到塞外之王、野人之王曼斯·雷德面前；守夜人军团的幸存者向南方撤退；在君临城，提力昂向国王、姐姐和父亲索要自己的奖赏；小指头给珊莎指明了一条逃离君临城的「生路」；瑟曦为王室家族成员举办盛大的晚宴；艾莉亚在逃亡途中遇到无旗兄弟会（Brotherhood Without Banners）；丹妮莉斯乘船来到奴隶湾（Slaver’s Bay）。",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW9lVKrbA37",
        "date_air": "2013-03-31",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-414",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 414,
        "episode_title": "黑色翅膀，黑色消息",
        "episode_number": 2,
        "episode_description": "珊莎说得太多，给自己惹来麻烦。与此同时，她竭力让自己在重压之下保持镇静。雪伊向提力昂提出一个请求。詹姆找到一个打发时间的好方法。艾莉亚偶然遇到无旗兄弟会（Brotherhood Without Banners）的人。",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz5eYzMQyqx",
        "date_air": "2013-04-07",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-415",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 415,
        "episode_title": "惩罚之旅",
        "episode_number": 3,
        "episode_description": "提力昂承担起新的责任；琼恩·雪诺被带到第一个「先民」面前；丹妮莉斯与奴隶们见面；詹姆与俘虏他的人达成一个协议；艾莉亚被困在无旗兄弟会；史坦尼斯乞求梅丽珊卓给他另一个「儿子」；席恩可能逃脱了监禁；卢斯·波顿的手下威胁布蕾妮。",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJa2RjJDwa",
        "date_air": "2013-04-14",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-416",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 416,
        "episode_title": "至死方休",
        "episode_number": 4,
        "episode_description": "丹妮莉斯考虑用自己的一条龙来交换8000名这个世界上最强壮的战士——无垢者，同时思考自己从阿斯塔波脱身的计策。君临城中，瑟曦计划除掉提利尔家族的人（她警告父亲泰温，提利尔家族对他们是个巨大的威胁），但玛格丽已经逐渐赢得乔佛里的信任。荆棘女王奥莲娜第一次与瑟曦正面交锋。",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKy29WLwlgx",
        "date_air": "2013-04-21",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-417",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 417,
        "episode_title": "火吻而生",
        "episode_number": 5,
        "episode_description": "猎狗受到神的审判，詹姆受到人的审判。琼恩在一个残酷的考验中证明了自己。罗柏·史塔克遭到背叛。提力昂知道了婚姻的代价。罗柏在军事上取得了成功，但是在政治上还是比较「稚嫩」，他的手下人时常质疑他的决定（如瑞卡德·卡史塔克）。",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR7k4RjOJqQ",
        "date_air": "2013-04-28",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-418",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 418,
        "episode_title": "绝壁攀爬",
        "episode_number": 6,
        "episode_description": "泰温开始为兰尼斯特家族策划战略联盟。梅丽珊卓造访奔流城。罗柏考虑向佛雷家族妥协以修补他们的联盟关系，但佛雷家族并不想要任何东西，他们想要一个人。卢斯·波顿仍在考虑如何处理詹姆·兰尼斯特。",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbQmzp2Jeg",
        "date_air": "2013-05-05",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-419",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 419,
        "episode_title": "狗熊和少女",
        "episode_number": 7,
        "episode_description": "丹妮莉斯与一个奴隶主交换礼物；珊莎对自己的命运深感苦恼；雪伊对提力昂和珊莎即将到来的婚礼十分不满；泰温对乔佛里国王提出忠告；梅丽珊卓向詹德利说出了一个秘密；布蕾妮在赫伦堡面对一个可怕的敌人。",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLVGKBkQAL",
        "date_air": "2013-05-12",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-420",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 420,
        "episode_title": "次子团",
        "episode_number": 8,
        "episode_description": "君临城即将举行一场婚礼，一对原本不可能走到一起的男女开始了新生活。提力昂和珊莎在一起相处了一个晚上。丹妮莉斯与绰号「泰坦私生子」（Titan’s Bastard）的梅罗会面。戴佛斯要求梅丽珊卓提供证据。山姆威尔和吉莉遇到一位年长的绅士。",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxnOWZMVmG",
        "date_air": "2013-05-19",
        "runtime": 57,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-421",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 421,
        "episode_title": "卡斯特梅的雨季",
        "episode_number": 9,
        "episode_description": "罗柏亲自面见瓦德·佛雷，而艾德慕也与自己的新娘见了面。琼恩面临一生中最大的考验。布兰发现自己有一种新天赋。达里奥和乔拉对于如何夺取渊凯城意见不一。佛雷家族加入徒利家族。",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRoxrKwZLEb",
        "date_air": "2013-06-02",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-422",
        "season_id": 9,
        "season_number": 3,
        "episode_id": 422,
        "episode_title": "“弥莎”",
        "episode_number": 10,
        "episode_description": "在季终集里，乔佛里挑战泰温的权威；布兰说了一个鬼故事；龙石岛一个奇怪的地方诞生了奇怪的「仁慈」；丹妮莉斯权衡自己的身份——征服者，还是解放者？",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzeQ2zDwvY8",
        "date_air": "2013-06-09",
        "runtime": 63,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-423",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 423,
        "episode_title": "化为双剑",
        "episode_number": 1,
        "episode_description": "奥柏伦进入君临城，浩瀚的历史画卷仍然在继续展开，马泰尔家族登上了历史的舞台。提利昂接见了这一行匆匆赶来的使者，并且表明了自己的身份。提利昂询问多恩亲王为何没有到来，对方表示奥柏伦亲王代替身体不方便的道朗亲王赶来了。",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkQQKE846Z",
        "date_air": "2014-04-06",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-424",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 424,
        "episode_title": "皇家婚礼",
        "episode_number": 2,
        "episode_description": "乔佛里在婚礼上被毒死，拉姆斯带着猎狗和米兰达追杀艾菊，艾菊被米兰达的箭射中腿部，还被猎狗撕碎。詹姆与提利昂一起吃饭，因为被拉姆斯砍掉了手，詹姆很是难过。提利昂劝他打起精神锻炼左手，并让他与波隆一起练剑。卢斯带着妻子回到恐怖堡，拉姆斯急于想跟卢斯证明自己的实力。",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZQYW1gPNe",
        "date_air": "2014-04-13",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-425",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 425,
        "episode_title": "碎镣之人",
        "episode_number": 3,
        "episode_description": "瑟曦认为是提里昂和珊莎合谋杀了乔佛里，逮捕了提里昂，珊莎却被酒鬼爵士带到了隐居海上的小指头那里，最后爵士被杀。泰温在乔佛里的灵前教育小乔的弟弟、下一任国王；瑟曦在灵前对詹姆痛斥提里昂的罪过，最终二人在灵前行苟且之事。猎狗带着艾莉亚行走在去鹰巢城的路上，遇暴雨，逢农夫，受邀作客。",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlQvzx051V",
        "date_air": "2014-04-20",
        "runtime": 57,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-426",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 426,
        "episode_title": "守誓之剑",
        "episode_number": 4,
        "episode_description": "卡丽熙的侍女弥桑黛教灰虫子英语，双方暗生情愫。卡丽熙派灰虫子潜入弥林城，发给奴隶武器，鼓动奴隶起义。起义成功，卡丽熙入城，将未被奴隶杀死的奴隶主钉死在十字架上。",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8ZjKDr6Xd",
        "date_air": "2014-04-27",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-427",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 427,
        "episode_title": "继他之名",
        "episode_number": 5,
        "episode_description": "托曼成功加冕称帝，托曼的加冕典礼在正殿举行，大主教读了祷文后托曼正式加冕成国王。大臣们鼓掌以示祝贺，玛格丽在一旁注意着托曼的一举一动，托曼回头时看到了她并跟她相视一笑。看到托曼与玛格丽的互动，瑟曦挡在了托曼的面前。",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R4o4zPLYVr",
        "date_air": "2014-05-04",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-428",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 428,
        "episode_title": "先民律法",
        "episode_number": 6,
        "episode_description": "提利昂要求比武审判，史坦尼斯和戴佛斯正在前来君临城的路上，而此时宫殿里也有人在焦急的等待着。泰楚代表宫殿金库的人欢迎了他们，并且介绍了现在宫殿中的情况，询问史坦尼斯他哥哥的家世问题，但是史坦尼斯却表示自己不承认那个是自己的哥哥的孩子，只是个乱伦生出的孩子。",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPznL1K3qVXO",
        "date_air": "2014-05-11",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-429",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 429,
        "episode_title": "知更展翅",
        "episode_number": 7,
        "episode_description": "狱中的提利昂和詹姆发生了争执，詹姆认为提利昂不应该因为一个妓女这么冲动。提利昂也明白这个道理，但是却忍不住自己心中的愤怒，父亲明知道自己清白无辜却还是要坚持牺牲自己。",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR2L5WxylZG",
        "date_air": "2014-05-18",
        "runtime": 52,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-430",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 430,
        "episode_title": "魔山与毒蛇",
        "episode_number": 8,
        "episode_description": "鼹鼠村内的小酒馆里面，一群人正在醉醺醺的喝酒唱着歌。吉莉正在忙碌着，结果听到外面传来了奇怪的声音。托蒙德和斯迪举起了手中的刀剑开始厮杀，鼹鼠村顿时陷入了一片血腥之中，村子被血洗。山姆威尔和葛兰十分担心村子的安危，琼恩也忧心忡忡。",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9MqzdQ0R3OoVg",
        "date_air": "2014-06-01",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-431",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 431,
        "episode_title": "长城守卫",
        "episode_number": 9,
        "episode_description": "琼恩和山姆威尔正坐在山头上，此时天色已黑，两个人讨论起来琼恩的爱人，山姆威尔十分渴望爱情，但是和吉莉并没有发生什么关系。在守夜人的誓言中，他们不能够拥有孩子，但是山姆威尔却十分渴望爱情的存在。托蒙德等野人此时也在讨论姑娘们，耶哥蕊特有些听不下去，表示自己现在唯一想做的事情就是杀死乌鸦。",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKMgdzVMyb4",
        "date_air": "2014-06-08",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-432",
        "season_id": 10,
        "season_number": 4,
        "episode_id": 432,
        "episode_title": "万生之子",
        "episode_number": 10,
        "episode_description": "琼恩独自在黑夜中前行。黎明时分，琼恩终于和曼斯会面。琼恩表示自己忠诚于科林和自己的承诺，并且表示耶哥蕊特已经死去。琼恩表示自己是来谈条件的，对于背叛曼斯他十分无奈。曼斯表示没有条件可谈，除非对方返回去打开城门，否则自己会杀死黑城堡里面的所有人。就在两个人谈判的时候，忽然有军队杀到，琼恩和曼斯都十分惊讶。",
        "video_image_poster": "https://image.theotherdb.org/w185/7Ld4J6WEGnR0pY5B",
        "date_air": "2014-06-15",
        "runtime": 66,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-433",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 433,
        "episode_title": "将来的战争",
        "episode_number": 1,
        "episode_description": "战争来临泰温死在亲生儿子提利昂手中，举国上下一片悲哀，瑟曦来到父亲泰温的遗体旁默哀，詹姆站在一边默默无语，瑟曦怒气难平在詹姆面前提起提利昂，提利昂已在瓦里斯的帮助下逃走，瑟曦做梦都想抓到提利昂食其肉剜其骨。",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrBoKEj18e",
        "date_air": "2015-04-12",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-434",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 434,
        "episode_title": "黑白之院",
        "episode_number": 2,
        "episode_description": "黑白之院艾莉亚来到一幢教堂外面，一个老者打开教堂冷若冰霜注视艾莉亚，艾莉亚掏出贾昆赠送的硬币向老者表明来意，老者无视艾莉亚手中的硬币关上教堂大门。",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WNmrKX9Nvg",
        "date_air": "2015-04-19",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-435",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 435,
        "episode_title": "大麻雀",
        "episode_number": 3,
        "episode_description": "在布拉佛斯，艾莉亚目睹了千面之神；在君临，玛格丽王后对她的新婚丈夫深感喜爱；提利昂和瓦里斯一同漫步于瓦兰提斯。",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWAXLKyZwaM",
        "date_air": "2015-04-26",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-436",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 436,
        "episode_title": "女妖之子",
        "episode_number": 4,
        "episode_description": "夜色如墨，乔拉打晕一名渔民夺到一艘木船，提利昂被乔拉带到木船上面，二人在夜色的掩盖下乘船驶入茫茫大海。",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGngRrEv1Q",
        "date_air": "2015-05-03",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-437",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 437,
        "episode_title": "泯灭童稚",
        "episode_number": 5,
        "episode_description": "弥林城发生暴动，无垢者首领灰虫子遇袭，巴利斯坦只身一人支援遇袭的无垢者小分队，灰虫子大难不死逃过一劫。丹妮莉丝对弥林城的奴隶主们产生仇恨，巴利斯坦在混战中死在面具人手中，唯一幸存的只有灰虫子一人，为了替死去的手下报仇，丹妮莉丝押着几名奴隶主来到软禁飞龙的地下室。",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3JBK1qn9o",
        "date_air": "2015-05-10",
        "runtime": 57,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-438",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 438,
        "episode_title": "不屈不挠",
        "episode_number": 6,
        "episode_description": "珊莎嫁给拉姆斯，艾莉亚一心想当“无面者”，贾昆数日以来一直安排艾莉亚为死者擦洗身子，艾莉亚厌倦重复不停为许多死者擦洗身子，一名同龄人已经适应贾昆安排的工作，艾莉亚想了解同龄人的身世经历，同龄人编了一段经历欺骗艾莉亚。",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0JPWnw5do",
        "date_air": "2015-05-17",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-439",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 439,
        "episode_title": "礼物",
        "episode_number": 7,
        "episode_description": "珊莎欲叛逃遭席恩举报  鹅毛大雪冰封万里，守夜人司令雪诺随数名野人离开绝境长城，一行人前往遥远的野人领地，茹毛饮血的野人族能否与雪诺达成协议还看老天是否开眼。",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPG8R7Dl91",
        "date_air": "2015-05-24",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-440",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 440,
        "episode_title": "艰难堡",
        "episode_number": 8,
        "episode_description": "异鬼大军摧毁野人领地。弥林城女王大殿，提利昂愿为丹妮莉丝献安邦定国之策，丹妮莉丝在提利昂的建议下驱逐染上灰鳞病的乔拉。艾莉亚在贾昆的调教下放下过往之事改头换面。",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWp3aKQgPLE",
        "date_air": "2015-05-31",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-441",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 441,
        "episode_title": "魔龙狂舞",
        "episode_number": 9,
        "episode_description": "史坦尼斯献祭女儿。丹妮莉丝竞技场遇暴动。漫长的雪夜似乎永无止境，拉姆斯带领二十余名敢死精英火袭敌营，驻扎在风雪夜中的营账相继起火，史坦尼斯匆忙披挂上阵巡视全营，拉姆斯偷袭得手早已逃之夭夭。",
        "video_image_poster": "https://image.theotherdb.org/w185/jlJYPqRak6WADo5L",
        "date_air": "2015-06-07",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-442",
        "season_id": 11,
        "season_number": 5,
        "episode_id": 442,
        "episode_title": "母之怜悯",
        "episode_number": 10,
        "episode_description": "史坦尼斯带领大军前往临冬城与拉姆斯决一死战，在杀敌受伤后倒地，此时布蕾妮出现，以为蓝礼复仇之名想要杀死史坦尼斯；詹姆女儿弥赛菈与道朗亲王之子崔斯丹乘船返回君临城，詹姆想要告诉弥赛菈她的身世真相，弥赛菈却说她早已知晓，并为詹姆是自己的父亲感到高兴，但就在她与詹姆拥抱时鼻子却流出鲜血，中毒身亡。",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1Kq0aRqyj6Q",
        "date_air": "2015-06-14",
        "runtime": 61,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-443",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 443,
        "episode_title": "红袍女",
        "episode_number": 1,
        "episode_description": "黑城堡的狼窝里，自幼与琼恩·雪诺一起长大的冰原狼感应到主人发生了危险，用力的抓挠着大门。戴佛斯·席渥斯和他的手下听到声响出门查看，在黑暗的角落里发现了倒在血泊中的守夜人司令官琼恩，不远处钉着一块木板，上面写着“叛徒”。",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKg2ERxqM5J",
        "date_air": "2016-04-24",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-444",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 444,
        "episode_title": "归乡",
        "episode_number": 2,
        "episode_description": "山洞鱼梁木下，绿先知引导布兰的意识回到从前，在那里布兰看到了童年时光的父亲艾德·史塔克，叔叔班扬，还有从未见过面的姑姑莱安娜。在这个幻境里，史塔克家族仍是那么兴旺，连阿多都能思维清晰的说话。",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmNdKOl4Ed",
        "date_air": "2016-05-01",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-445",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 445,
        "episode_title": "破誓者",
        "episode_number": 3,
        "episode_description": "戴佛斯站在门口，目瞪口呆的看着屋内。琼恩坐了起来，摸着身上的伤口，也不敢相信自己还活着。他挣扎着想站起来，戴佛斯赶紧上前搀扶。女祭司梅丽珊卓听到动静也快步来到门口，也是不可思议的看着琼恩。",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKYmJKMZ24e",
        "date_air": "2016-05-08",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-446",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 446,
        "episode_title": "陌客之书",
        "episode_number": 4,
        "episode_description": "琼恩收拾着行李，准备离开黑城堡。在发生这种事后，一半的兄弟离心离德，他已经没有继续执掌守夜人的信心。艾迪还想力争琼恩留下时，一声号角响起。城堡大门打开，布蕾妮终于护送珊莎到达了长城。",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW1JkzXa0OL",
        "date_air": "2016-05-15",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-447",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 447,
        "episode_title": "守门人",
        "episode_number": 5,
        "episode_description": "珊莎在缝制衣服。她凭着记忆按照父亲曾经的衣着为琼恩缝制了宽大的披风，家族冰原狼的标志清晰的印在皮甲上。有人送来一封信，蜡封上印着培提尔的仿声鸟的徽章。鼹鼠村在被野人洗劫后，已经荒废。",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR6JXRdeEO1",
        "date_air": "2016-05-22",
        "runtime": 57,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-448",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 448,
        "episode_title": "吾血之血",
        "episode_number": 6,
        "episode_description": "梅拉拖着布兰艰难的在风雪中行进，身后尸鬼大军如潮水般涌了过来。最后一点力气都用尽，梅拉绝望的抱着布兰，恳求他早点从视野中回来。可即使布兰醒来又如何，尸鬼的吼声越来越近，梅拉只能抱紧布兰，希望自己的身体成为最后的屏障，哪怕让布兰多活一秒也是好的。",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKvVDK3lx9Y",
        "date_air": "2016-05-29",
        "runtime": 52,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-449",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 449,
        "episode_title": "残人",
        "episode_number": 7,
        "episode_description": "琼恩正在北境寻找志同道合的盟军，野人部落是他最先考虑的地方。虽有托蒙德的支持，可其他部落仍未效忠。除非是与异鬼作战，否则他们都不愿参与到南方的家族战争之中。琼恩不得不指出他们的短视，北境三个最强家族波顿、卡史塔克、安柏都视野人为死敌。",
        "video_image_poster": "https://image.theotherdb.org/w185/ZNxmMPWjE6K964Qy",
        "date_air": "2016-06-05",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-450",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 450,
        "episode_title": "无名之辈",
        "episode_number": 8,
        "episode_description": "蓝赛尔带着几名教团势力的战士之子进入了红堡，指名道姓要见太后瑟曦。当科本告诉她，国王托曼知道此事时，瑟曦站起了身。看来已经无法指望国王会出手干预，只有依靠自己。",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQ3JR2Ppn4",
        "date_air": "2016-06-12",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-451",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 451,
        "episode_title": "私生子之战",
        "episode_number": 9,
        "episode_description": "弥林城仍在奴隶主舰船的狂轰滥炸之下，对这种情况主政的提利昂难辞其咎。不过丹妮莉丝也必须承认提利昂的管理能力，在战争爆发之前，贸易量大增，人民拥戴丹妮莉丝的统治。非奴隶制城邦的弥林在壮大，奴隶主不希望看到这个结果，这才是他们发动战争的原因。",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7Kwg7KMjB8N",
        "date_air": "2016-06-19",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-452",
        "season_id": 12,
        "season_number": 6,
        "episode_id": 452,
        "episode_title": "凛冬的寒风",
        "episode_number": 10,
        "episode_description": "圣贝勒大教堂的钟声响起，召告着主教大麻雀的重要决定。瑟曦在红堡之上俯视着远处的大教堂，那个耻辱之始的地方将成为血耻之地。今天，大麻雀要审判洛拉斯爵士。",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOAvRd2QOl",
        "date_air": "2016-06-26",
        "runtime": 68,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-453",
        "season_id": 13,
        "season_number": 7,
        "episode_id": 453,
        "episode_title": "重返龙石岛",
        "episode_number": 1,
        "episode_description": "琼恩·雪诺布置北境防守，布兰和梅拉重返塞内，瑟曦女王为挽回局势作出努力，攸伦要向瑟曦表忠心，山姆在学城有新发现，艾莉亚南下君临刺杀瑟曦，无旗兄弟会和猎狗北上抵抗异鬼，而丹妮莉丝回到了龙石岛准备反攻维斯特洛大陆。",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW9JVzrbA37",
        "date_air": "2017-07-16",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-454",
        "season_id": 13,
        "season_number": 7,
        "episode_id": 454,
        "episode_title": "风暴降生",
        "episode_number": 2,
        "episode_description": "琼恩·雪诺接到北境小恶魔传信，力排众议赴会龙妈。\u2028珊莎受命暂为临冬城代理城主。瑟曦拉拢塔利老爷，科本献技降服巨龙。\u2028小恶魔议取凯岩城堡，老玫瑰传播人生经验。\u2028灰虫子战前施口技，山姆哥刮癣救大熊。",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz5JYRMQyqx",
        "date_air": "2017-07-23",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-455",
        "season_id": 13,
        "season_number": 7,
        "episode_id": 455,
        "episode_title": "暗度陈仓",
        "episode_number": 3,
        "episode_description": "琼恩·雪诺去龙石岛见了龙母，布兰几经周折，终于与珊莎团聚。在无垢者成功夺下凯岩城之时，他们发现城里的粮食也已经被詹姆转移走了。与此同时，詹姆率领着兰尼斯特真正的主力军攻占了高庭。",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJM2RjJDwa",
        "date_air": "2017-07-30",
        "runtime": 63,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-456",
        "season_id": 13,
        "season_number": 7,
        "episode_id": 456,
        "episode_title": "龙母亲征",
        "episode_number": 4,
        "episode_description": "詹姆和波隆带着军队和高庭的战利品回君临，高庭的金子则被用来还兰尼斯特家族在铁金库的债。龙母亲驾小飞龙直抵詹姆阵地。兰尼斯特大军几乎全部被烧死，龙母大获全胜。",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyY9KLwlgx",
        "date_air": "2017-08-06",
        "runtime": 50,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-457",
        "season_id": 13,
        "season_number": 7,
        "episode_id": 457,
        "episode_title": "东海望危机",
        "episode_number": 5,
        "episode_description": "小恶魔偷渡回君临城密会詹姆，恳请詹姆向瑟曦提起龙妈的停战请求。雪诺、乔拉、洋葱、大熊去到东海望。乔拉让洋葱留守要塞，带其余三人去见俘虏，即兄弟会的贝里、索罗斯和猎狗。这七个人发现彼此间还有错综复杂的旧账，但雪诺出面机智化解，于是七人出关抓异鬼。",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR7J4zjOJqQ",
        "date_air": "2017-08-13",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-458",
        "season_id": 13,
        "season_number": 7,
        "episode_id": 458,
        "episode_title": "长城之外",
        "episode_number": 6,
        "episode_description": "七武士出塞，互怼兼联络感情。琼恩·雪诺还剑，大熊拒绝。艾莉亚以劝降信怼珊莎，珊莎本已觉得难以驾驭北境诸侯，于是姐妹生嫌。贝里谈复活，变相对琼恩·雪诺传教兼灌鸡汤。小恶魔劝龙母施行仁政，结果偏题，提起子嗣问题被龙母怒斥。",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbZmRp2Jeg",
        "date_air": "2017-08-20",
        "runtime": 70,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-459",
        "season_id": 13,
        "season_number": 7,
        "episode_id": 459,
        "episode_title": "龙与狼",
        "episode_number": 7,
        "episode_description": "在冬天里，我们必须保卫彼此，互相照顾，当大雪降下，冷风吹起，独行狼死，群聚狼生。 珊莎、艾莉亚、布兰，他们是仅剩的史塔克；琼恩和席恩，他们也是临冬城的奔狼；所有在北境集结的勇士，他们都是狼群的一份子。",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLXGzBkQAL",
        "date_air": "2017-08-27",
        "runtime": 80,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-460",
        "season_id": 14,
        "season_number": 8,
        "episode_id": 460,
        "episode_title": "临冬城",
        "episode_number": 1,
        "episode_description": "琼恩和丹妮莉丝抵达了临冬城，然而却受到了怀疑的质疑。山姆得知了自己家族的命运。瑟曦给予尤伦他所期望的奖赏。席恩顺从了内心的声音。",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRoGrRwZLEb",
        "date_air": "2019-04-14",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-461",
        "season_id": 14,
        "season_number": 8,
        "episode_id": 461,
        "episode_title": "七王国的骑士",
        "episode_number": 2,
        "episode_description": "在临冬城的大厅，詹姆将直面针对自己的过去的审判；决战将至，人们将如何面对生离死别，纠结于未尽的心愿，甚至未曾袒露的秘密？",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6Mze42WDwvY8",
        "date_air": "2019-04-21",
        "runtime": 59,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-462",
        "season_id": 14,
        "season_number": 8,
        "episode_id": 462,
        "episode_title": "长夜",
        "episode_number": 3,
        "episode_description": "夜王和他的军队已经抵达临冬城，大战开始了。",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBkNWPpyQL",
        "date_air": "2019-04-28",
        "runtime": 82,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-463",
        "season_id": 14,
        "season_number": 8,
        "episode_id": 463,
        "episode_title": "最后的史塔克",
        "episode_number": 4,
        "episode_description": "人类在付出惨重代价后迎来胜利，接下来就是权力的角逐了。琼恩和丹妮莉斯凝视着南方，而小恶魔在暗自盘算如何能两全其美。",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkXQRE846Z",
        "date_air": "2019-05-05",
        "runtime": 79,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-464",
        "season_id": 14,
        "season_number": 8,
        "episode_id": 464,
        "episode_title": "钟声",
        "episode_number": 5,
        "episode_description": "军队已经抵达君临，准备进行最后的战斗。",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZYYW1gPNe",
        "date_air": "2019-05-12",
        "runtime": 80,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-465",
        "season_id": 14,
        "season_number": 8,
        "episode_id": 465,
        "episode_title": "铁王座",
        "episode_number": 6,
        "episode_description": "在君临城遭受毁灭性袭击之后，丹妮莉丝必须面对幸存者。",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlrvRx051V",
        "date_air": "2019-05-19",
        "runtime": 80,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-466",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 466,
        "episode_title": "威尔·拜尔斯失踪",
        "episode_number": 1,
        "episode_description": "小男孩威尔在从朋友家回家的路上，看到了可怕的事情。附近的一座政府实验室隐藏着阴暗的秘密。",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZYlW1gPNe",
        "date_air": "2016-07-15",
        "runtime": 48,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-467",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 467,
        "episode_title": "梅普尔街上的怪人",
        "episode_number": 2,
        "episode_description": "卢卡斯、迈克和达斯汀试着和他们在森林里发现的女孩交流。乔伊斯忧心忡忡，霍珀问她那个让人不安的电话是怎么回事。",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlv8Rx051V",
        "date_air": "2016-07-15",
        "runtime": 55,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-468",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 468,
        "episode_title": "开心的霍莉",
        "episode_number": 3,
        "episode_description": "南茜越来越担心，开始寻找芭珀，她发现了乔纳森一直在做什么。乔伊斯相信威尔在和她说话。",
        "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8QpRDr6Xd",
        "date_air": "2016-07-15",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-469",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 469,
        "episode_title": "尸体",
        "episode_number": 4,
        "episode_description": "乔伊斯不愿相信威尔已死，还想和儿子取得联系。小伙子们让十一变了个模样。南茜和乔纳森出人意料地结成同盟。",
        "video_image_poster": "https://image.theotherdb.org/w185/6x14G9R4QLKPLYVr",
        "date_air": "2016-07-15",
        "runtime": 50,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-470",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 470,
        "episode_title": "跳蚤和杂技演员",
        "episode_number": 5,
        "episode_description": "霍珀闯入实验室，南茜和乔纳森直面带走威尔的“幕后黑手”。小伙子们问克拉克先生如何前往另一个维度。",
        "video_image_poster": "https://image.theotherdb.org/w185/9jeadPznvaz3qVXO",
        "date_air": "2016-07-15",
        "runtime": 52,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-471",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 471,
        "episode_title": "怪兽",
        "episode_number": 6,
        "episode_description": "发狂的乔纳森在黑暗中寻找南茜，但史蒂夫也在找她。霍珀和乔伊斯揭开了实验室实验的真相。",
        "video_image_poster": "https://image.theotherdb.org/w185/4w9X5eR2QvzxylZG",
        "date_air": "2016-07-15",
        "runtime": 46,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-472",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 472,
        "episode_title": "浴缸",
        "episode_number": 7,
        "episode_description": "十一试着联系到威尔，但并不容易，卢卡斯警告说“坏人来了”。南茜和乔纳森给警察看了乔纳森的相机拍到的画面。",
        "video_image_poster": "https://image.theotherdb.org/w185/j2Y9MqzdjLK3OoVg",
        "date_air": "2016-07-15",
        "runtime": 42,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-473",
        "season_id": 15,
        "season_number": 1,
        "episode_id": 473,
        "episode_title": "颠倒世界",
        "episode_number": 8,
        "episode_description": "布伦纳博士扣住了霍珀和乔伊斯，准备审问他们，小伙子们在体育馆和十一一起等待。南茜和乔纳森在威尔家为战斗作准备。",
        "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKMjPWVMyb4",
        "date_air": "2016-07-15",
        "runtime": 54,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-474",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 474,
        "episode_title": "疯狂麦克斯",
        "episode_number": 1,
        "episode_description": "小镇开始为万圣节做准备，一个强有力的竞争对手在电子游戏厅里引起了骚动，多疑的霍珀检查开始腐烂的南瓜地。",
        "video_image_poster": "https://image.theotherdb.org/w185/b2Pvq1WXj7RABmNe",
        "date_air": "2017-10-27",
        "runtime": 48,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-475",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 475,
        "episode_title": "不给糖就捣蛋，怪胎",
        "episode_number": 2,
        "episode_description": "当威尔在万圣节当晚看到可怕的东西后，迈克想知道十一还在不在外面。关于芭珀的事实让南茜很难接受。",
        "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrvDKEj18e",
        "date_air": "2017-10-27",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-476",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 476,
        "episode_title": "蝌蚪",
        "episode_number": 3,
        "episode_description": "达斯汀收养了一个奇怪的新宠物，十一越发失去耐心。好心的鲍伯催促威尔直面他的恐惧。",
        "video_image_poster": "https://image.theotherdb.org/w185/0JQo56WNQpKX9Nvg",
        "date_air": "2017-10-27",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-477",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 477,
        "episode_title": "智者威尔",
        "episode_number": 4,
        "episode_description": "生病的威尔向乔伊斯敞开心扉与之谈话，结果却让人不安。当霍珀挖掘真相时，十一得到一个惊人的发现。",
        "video_image_poster": "https://image.theotherdb.org/w185/2d3vnoWAQbWyZwaM",
        "date_air": "2017-10-27",
        "runtime": 46,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-478",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 478,
        "episode_title": "挖掘",
        "episode_number": 5,
        "episode_description": "当十一在过去搜寻某人的时候，南茜和乔纳森同一个新的盟友交换了各自的阴谋论。聪明的鲍伯在解决一个难题。",
        "video_image_poster": "https://image.theotherdb.org/w185/25De6mKGQrzrEv1Q",
        "date_air": "2017-10-27",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-479",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 479,
        "episode_title": "间谍",
        "episode_number": 6,
        "episode_description": "威尔与暗影恶魔之间的联系越来越强，可是谁都不能确定怎样才能阻止它。另一边，达斯汀和史蒂夫意外地建立了关系。",
        "video_image_poster": "https://image.theotherdb.org/w185/vadPQEW3QDR1qn9o",
        "date_air": "2017-10-27",
        "runtime": 52,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-480",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 480,
        "episode_title": "失踪的姐妹",
        "episode_number": 7,
        "episode_description": "异能幻象让十一接触到一群边缘暴徒，以及一个有着黑暗过去的愤怒女孩。",
        "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0Q7Knw5do",
        "date_air": "2017-10-27",
        "runtime": 46,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-481",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 481,
        "episode_title": "夺心魔",
        "episode_number": 8,
        "episode_description": "一次致命的进展使霍金斯实验室遭到封锁，把威尔和其他人都困住了，一个意外的英雄挺身而出。",
        "video_image_poster": "https://image.theotherdb.org/w185/qrwGxEKPjJz7Dl91",
        "date_air": "2017-10-27",
        "runtime": 48,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-482",
        "season_id": 16,
        "season_number": 2,
        "episode_id": 482,
        "episode_title": "关门",
        "episode_number": 9,
        "episode_description": "当幸存者们把这个绑架了威尔的怪兽的表温度调高时，十一制定了计划来终结由她所引起的这一切。",
        "video_image_poster": "https://image.theotherdb.org/w185/2rbk5yWpQVzQgPLE",
        "date_air": "2017-10-27",
        "runtime": 62,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-483",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 483,
        "episode_title": "苏西，能听到吗？",
        "episode_number": 1,
        "episode_description": "夏季带来了新的工作和萌发的恋情。但当达斯汀的收音机收到一条俄语广播后，氛围却发生了变化。威尔察觉到有点不对劲。",
        "video_image_poster": "https://image.theotherdb.org/w185/kxGPd1KqvEWqyj6Q",
        "date_air": "2019-07-04",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-484",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 484,
        "episode_title": "商场老鼠",
        "episode_number": 2,
        "episode_description": "南茜和乔纳森追查一条线索，史蒂夫和罗宾执行一项秘密任务，麦克斯和十一外出购物。比利心慌意乱，看见了令人不安的幻象。",
        "video_image_poster": "https://image.theotherdb.org/w185/eNVp2yzVjOz6rXJv",
        "date_air": "2019-07-04",
        "runtime": 51,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-485",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 485,
        "episode_title": "救生员失踪案",
        "episode_number": 3,
        "episode_description": "艾尔和麦克斯寻找比利，威尔则宣示要过一天没有女孩的日子。史蒂夫和达斯汀进行监视，乔伊斯和霍珀则返回了霍金斯实验室。",
        "video_image_poster": "https://image.theotherdb.org/w185/wXp6nBKg7mKxqM5J",
        "date_air": "2019-07-04",
        "runtime": 50,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-486",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 486,
        "episode_title": "桑拿测试",
        "episode_number": 4,
        "episode_description": "红色警报促使大家重聚，直面可怕而熟悉的邪恶力量。凯伦督促南茜继续挖掘真相，罗宾则找到一张有用的地图。",
        "video_image_poster": "https://image.theotherdb.org/w185/BkDZ1VRmjBKOl4Ed",
        "date_air": "2019-07-04",
        "runtime": 53,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-487",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 487,
        "episode_title": "被夺者",
        "episode_number": 5,
        "episode_description": "旧农场内和星庭商场下方藏着奇怪的意外情况。另一方面，夺心魔正在积蓄力量。",
        "video_image_poster": "https://image.theotherdb.org/w185/1EbdvYKYjYWMZ24e",
        "date_air": "2019-07-04",
        "runtime": 52,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-488",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 488,
        "episode_title": "合众为一",
        "episode_number": 6,
        "episode_description": "阿列克谢博士揭示了俄国人在造什么。十一看到了比利到过的地方。达斯汀和艾瑞卡策划了一场大胆的营救行动。",
        "video_image_poster": "https://image.theotherdb.org/w185/qx4YQvW1weRXa0OL",
        "date_air": "2019-07-04",
        "runtime": 60,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-489",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 489,
        "episode_title": "咬伤",
        "episode_number": 7,
        "episode_description": "时间所剩无几，而刺客紧跟不放。霍珀等人赶回霍金斯，艾尔和孩子们正在那里为开战做准备。",
        "video_image_poster": "https://image.theotherdb.org/w185/Zn4JjmR69LzdeEO1",
        "date_air": "2019-07-04",
        "runtime": 56,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-490",
        "season_id": 17,
        "season_number": 3,
        "episode_id": 490,
        "episode_title": "星庭之战",
        "episode_number": 8,
        "episode_description": "夺心魔前来行凶，恐惧笼罩美食街。在黑暗的地下，世界的未来岌岌可危。",
        "video_image_poster": "https://image.theotherdb.org/w185/m1XaJpKvvmK3lx9Y",
        "date_air": "2019-07-04",
        "runtime": 78,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-491",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 491,
        "episode_title": "地狱火俱乐部",
        "episode_number": 1,
        "episode_description": "艾尔在新学校被欺负，却无法反击。乔伊斯打开一个神秘包裹。在霍金斯，一个好斗的玩家撼动了龙与地下城之夜。",
        "video_image_poster": "https://image.theotherdb.org/w185/lgZy7LWQjMz2Ppn4",
        "date_air": "2022-05-27",
        "runtime": 79,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-492",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 492,
        "episode_title": "维克那的诅咒",
        "episode_number": 2,
        "episode_description": "迈克乘坐飞机抵达加州，而一具尸体扰乱了霍金斯的日常。南茜去寻找线索。惊魂未定的埃迪告诉大家他看到的一切。",
        "video_image_poster": "https://image.theotherdb.org/w185/EXQdp7KwwxKMjB8N",
        "date_air": "2022-05-27",
        "runtime": 78,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-493",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 493,
        "episode_title": "怪物或超级英雄",
        "episode_number": 3,
        "episode_description": "穆雷和乔伊斯飞往阿拉斯加，而艾尔面临严重后果。罗宾和南茜挖掘霍金斯恶魔的种种恶行。欧文斯医生带来惊人的消息。",
        "video_image_poster": "https://image.theotherdb.org/w185/j7p1gaWOjxKd2QOl",
        "date_air": "2022-05-27",
        "runtime": 64,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-494",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 494,
        "episode_title": "亲爱的比利",
        "episode_number": 4,
        "episode_description": "麦克斯处境甚危，且时日无多。在宾赫斯特精神病院，有人探视一名患者。在俄罗斯，霍珀奋力拼搏。",
        "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDQAKV15GA",
        "date_air": "2022-05-27",
        "runtime": 79,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-495",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 495,
        "episode_title": "妮娜计划",
        "episode_number": 5,
        "episode_description": "欧文斯将艾尔带到内华达州。在那里，艾尔被迫面对自己的过去，而霍金斯的孩子们在一座破败的房子里寻找线索。又有一人沦为维克那的受害者。",
        "video_image_poster": "https://image.theotherdb.org/w185/nGNd9pW9QJWrbA37",
        "date_air": "2022-05-27",
        "runtime": 75,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-496",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 496,
        "episode_title": "深入",
        "episode_number": 6,
        "episode_description": "铁幕之后，一项危险的救援任务展开。加利福尼亚小队向一名黑客求助。史蒂夫为了团队身先士卒。",
        "video_image_poster": "https://image.theotherdb.org/w185/O8pkdJz5QQzMQyqx",
        "date_air": "2022-05-27",
        "runtime": 74,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-497",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 497,
        "episode_title": "霍金斯实验室的屠杀",
        "episode_number": 7,
        "episode_description": "霍珀准备与怪物战斗，而达斯汀分析维克那的动机，并破译了来自远方的讯息。艾尔在遥远的记忆中找到了力量。",
        "video_image_poster": "https://image.theotherdb.org/w185/GoBl1NKJQjRjJDwa",
        "date_air": "2022-05-27",
        "runtime": 100,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-498",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 498,
        "episode_title": "爸爸",
        "episode_number": 8,
        "episode_description": "南茜看到了惊人幻象，而艾尔通过了一项重要测试。回到霍金斯后，大家收集物资，准备战斗。",
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyvnWLwlgx",
        "date_air": "2022-07-01",
        "runtime": 86,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-499",
        "season_id": 18,
        "season_number": 4,
        "episode_id": 499,
        "episode_title": "潜入",
        "episode_number": 9,
        "episode_description": "为了拯救霍金斯乃至全世界，英雄们凭借无私胸怀和金属之声在战场的各个角落奋力抗争。",
        "video_image_poster": "https://image.theotherdb.org/w185/rgVAvkR7QnWjOJqQ",
        "date_air": "2022-07-01",
        "runtime": 143,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-500",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 500,
        "episode_title": "潜行",
        "episode_number": 1,
        "episode_description": "1987年11月，大家躲过军队去颠倒世界寻找维克那 — 却未能发现一个威胁正潜伏在小镇。",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzLjQKBkQAL",
        "date_air": "2025-11-26",
        "runtime": 72,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-501",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 501,
        "episode_title": "霍莉·惠勒的消失",
        "episode_number": 2,
        "episode_description": "惠勒家遭遇残酷的袭击后，迈克和南茜面对保守秘密的代价。艾尔和霍珀执行营救任务。",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxvNWZMVmG",
        "date_air": "2025-11-26",
        "runtime": 58,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-502",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 502,
        "episode_title": "特恩鲍陷阱",
        "episode_number": 3,
        "episode_description": "威尔对维克那的下一步举动获得了独特的了解，让大家有机会设下陷阱。霍莉探索周围的新环境。",
        "video_image_poster": "https://image.theotherdb.org/w185/56q74rRoOMRwZLEb",
        "date_air": "2025-11-26",
        "runtime": 70,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-503",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 503,
        "episode_title": "魔法师",
        "episode_number": 4,
        "episode_description": "军队对小镇的掌控加剧。迈克、卢卡斯和罗宾策划大胆的逃跑计划。艾尔直面敌人。",
        "video_image_poster": "https://image.theotherdb.org/w185/0lkE6MzejnRDwvY8",
        "date_air": "2025-11-26",
        "runtime": 87,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-504",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 504,
        "episode_title": "电击唤魔",
        "episode_number": 5,
        "episode_description": "大家想出一个电力十足的计划，想让威尔重新接上集体意识。寻找颠倒世界的霍金斯实验室时，几人之间的关系愈发紧张。",
        "video_image_poster": "https://image.theotherdb.org/w185/Y4m3XGKBQORPpyQL",
        "date_air": "2025-12-25",
        "runtime": 69,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-505",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 505,
        "episode_title": "逃离坎马卓兹",
        "episode_number": 6,
        "episode_description": "霍莉和麦克斯努力逃离维克那的大脑，艾尔必须想办法进入威尔的意识。乔伊斯被负疚感困扰。乔纳森和南茜面对转折点。",
        "video_image_poster": "https://image.theotherdb.org/w185/meLB0xzkjeWE846Z",
        "date_air": "2025-12-25",
        "runtime": 76,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-506",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 506,
        "episode_title": "桥梁",
        "episode_number": 7,
        "episode_description": "在威尔失踪周年之际，大家重聚，为一场可能改变世界的大战做准备。",
        "video_image_poster": "https://image.theotherdb.org/w185/Bxkd23zZjlz1gPNe",
        "date_air": "2025-12-25",
        "runtime": 67,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    },
    {
        "item_id": "ve-507",
        "season_id": 19,
        "season_number": 5,
        "episode_id": 507,
        "episode_title": "正常世界",
        "episode_number": 8,
        "episode_description": "维克那准备摧毁我们所熟知的世界，冒险小队必须赌上一切，彻底击败他。",
        "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlb8Rx051V",
        "date_air": "2025-12-31",
        "runtime": 129,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0
    }
]
```

返回（包含点播信息）：

```json
[
    {
        "item_id": "ve-1097",
        "season_id": 1005,
        "season_number": 0,
        "episode_id": 1097,
        "episode_title": "第 1 集",
        "episode_number": 1,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/dOmDowzL7LWBkQAL",
        "date_air": "2010-12-05",
        "runtime": 11,
        "parts_count": 0,
        "medias_count": 1,
        "subtitles_count": 0,
        "seek": {
            "seek_id": 6,
            "status": "default",
            "upload_username": null,
            "upload_expired_at": null,
            "is_can_claim": true,
            "request_count": 1,
            "seek_carrot": 0,
            "updated_at": "2026-01-25T12:29:03.000000Z"
        },
        "with_seek_is_request": true
    },
    {
        "item_id": "ve-1098",
        "season_id": 1005,
        "season_number": 0,
        "episode_id": 1098,
        "episode_title": "第 2 集",
        "episode_number": 2,
        "episode_description": "",
        "video_image_poster": "https://image.theotherdb.org/w185/rdw47oRxA4KZMVmG",
        "date_air": "2011-04-03",
        "runtime": 15,
        "parts_count": 0,
        "medias_count": 0,
        "subtitles_count": 0,
        "seek": null,
        "with_seek_is_request": false
    }
]
```

### 获取演员列表

`GET /api/video/persons?video_list_id={{video_id}}&video_season_id=&video_episode_id`

# gender 性别

- `unknow` 未知
    
- `male` 男
    
- `female` 女
    
- `other` 其他

参数：`video_list_id`、`video_season_id`、`video_episode_id`

返回（获取演员列表）：

```json
{
    "page": 1,
    "page_size": 1,
    "total": 6,
    "items": [
        {
            "id": null,
            "person_id": null,
            "person_id_tmdb": 1000,
            "name": "李知恩",
            "image_profile": "jlJYPqRa3GWADo5L",
            "original_name": null,
            "tagline": null,
            "biography": null,
            "birthday": null,
            "gender": null,
            "birthplace": null,
            "is_virtual": null,
            "is_adult": null,
            "title": "Seong Huiju",
            "job": null
        }
    ]
}
```

### 资源相关

#### 获取资源列表

`GET /api/video/media/list?video_list_id=1000&video_season_id=&video_episode_id=&video_part_id&include_metadata=&include_delete`

参数中 查什么穿什么

参数：`video_list_id`、`video_season_id`、`video_episode_id`、`video_part_id`、`include_metadata`、`include_delete`

返回（获取资源列表）：

```json
[
    {
        "season_id": 1000,
        "episode_id": 1001,
        "part_id": null,
        "user_id": "eXD3VD3Y1s",
        "media_id": "YLgw45W2Jk1V",
        "media_name": " 上传",
        "media_status": "complete",
        "media_file_size": 250817,
        "media_file_second": null,
        "media_file_metadata": null,
        "user_pseudonym": "张三",
        "subtitle_count": 0,
        "is_self_upload": true,
        "created_at": "2026-01-18T15:42:34.000000Z"
        "deleted_at": null,
        "is_can_restore": false
    }
]
```

#### 获取资源列表 分页

`GET /api/video/media/listAll?media_id=&user_id=&only_delete=&include_metadata=`

参数：`media_id`、`user_id`、`status`、`only_delete`、`include_metadata`

返回（含元数据）：

```json
{
    "page": 1,
    "page_size": 2,
    "total": 2,
    "items": [
        {
            "video_id": 4111,
            "video_type": "tv",
            "video_title": "小城大事",
            "todb_id": 4111,
            "tmdb_id": 279593,
            "season_id": 7575,
            "season_number": 1,
            "season_title": "第 1 季",
            "episode_id": 161263,
            "episode_number": 11,
            "episode_title": "滨海路之争！群众干部打起来了？",
            "part_id": null,
            "part_number": null,
            "part_title": null,
            "media_id": "ewyo9rw0oqdz",
            "media_name": "4K 高码率 f1ne 上传",
            "media_status": "complete",
            "media_file_size": 5209954120,
            "media_file_second": 2799,
            "media_file_metadata": {
                "streams": [
                    {
                        "index": 0,
                        "codec_name": "hevc",
                        "codec_long_name": "H.265 / HEVC (High Efficiency Video Coding)",
                        "profile": "Main 10",
                        "codec_type": "video",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "width": 3840,
                        "height": 2160,
                        "coded_width": 3840,
                        "coded_height": 2160,
                        "closed_captions": 0,
                        "film_grain": 0,
                        "has_b_frames": 3,
                        "sample_aspect_ratio": "1:1",
                        "display_aspect_ratio": "16:9",
                        "pix_fmt": "yuv420p10le",
                        "level": 153,
                        "color_range": "tv",
                        "color_space": "bt2020nc",
                        "color_transfer": "smpte2084",
                        "color_primaries": "bt2020",
                        "chroma_location": "left",
                        "refs": 1,
                        "view_ids_available": "",
                        "view_pos_available": "",
                        "r_frame_rate": "60/1",
                        "avg_frame_rate": "60/1",
                        "time_base": "1/1000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "extradata_size": 205,
                        "disposition": {
                            "default": 1,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "DURATION": "00:46:39.083000000"
                        }
                    },
                    {
                        "index": 1,
                        "codec_name": "eac3",
                        "codec_long_name": "ATSC A/52B (AC-3, E-AC-3)",
                        "codec_type": "audio",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "sample_fmt": "fltp",
                        "sample_rate": "48000",
                        "channels": 2,
                        "channel_layout": "stereo",
                        "bits_per_sample": 0,
                        "initial_padding": 0,
                        "r_frame_rate": "0/0",
                        "avg_frame_rate": "0/0",
                        "time_base": "1/1000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "bit_rate": "64000",
                        "disposition": {
                            "default": 1,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "title": "DDP 2.0",
                            "DURATION": "00:46:39.264000000"
                        }
                    },
                    {
                        "index": 2,
                        "codec_name": "aac",
                        "codec_long_name": "AAC (Advanced Audio Coding)",
                        "profile": "LC",
                        "codec_type": "audio",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "sample_fmt": "fltp",
                        "sample_rate": "48000",
                        "channels": 6,
                        "channel_layout": "5.1",
                        "bits_per_sample": 0,
                        "initial_padding": 0,
                        "r_frame_rate": "0/0",
                        "avg_frame_rate": "0/0",
                        "time_base": "1/1000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "extradata_size": 2,
                        "disposition": {
                            "default": 0,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "title": "AAC 5.1",
                            "DURATION": "00:46:39.168000000"
                        }
                    },
                    {
                        "index": 3,
                        "codec_name": "aac",
                        "codec_long_name": "AAC (Advanced Audio Coding)",
                        "profile": "LC",
                        "codec_type": "audio",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "sample_fmt": "fltp",
                        "sample_rate": "48000",
                        "channels": 2,
                        "channel_layout": "stereo",
                        "bits_per_sample": 0,
                        "initial_padding": 0,
                        "r_frame_rate": "0/0",
                        "avg_frame_rate": "0/0",
                        "time_base": "1/1000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "extradata_size": 2,
                        "disposition": {
                            "default": 1,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "title": "AAC 2.0",
                            "DURATION": "00:46:39.146000000"
                        }
                    }
                ],
                "format": {
                    "nb_streams": 4,
                    "nb_programs": 0,
                    "nb_stream_groups": 0,
                    "format_name": "matroska,webm",
                    "format_long_name": "Matroska / WebM",
                    "start_time": "0.000000",
                    "duration": "2799.264000",
                    "size": "5209954120",
                    "bit_rate": "14889497",
                    "probe_score": 100,
                    "tags": {
                        "ENCODER": "Lavf60.21.101"
                    }
                }
            },
            "user_pseudonym": "f1bb",
            "user_id": "e0E446ZE6s",
            "is_self_upload": false,
            "storage_title": "Zn存档服",
            "created_at": "2026-01-19T11:42:21.000000Z"
        },
        {
            "video_id": 1038,
            "video_type": "movie",
            "video_title": "我们仍未知道那天所看见的花的名字。剧场版",
            "todb_id": 1038,
            "tmdb_id": 255413,
            "season_id": null,
            "season_number": null,
            "season_title": null,
            "episode_id": null,
            "episode_number": null,
            "episode_title": null,
            "part_id": null,
            "part_number": null,
            "part_title": null,
            "media_id": "59mnkq6jn2rl",
            "media_name": "存档服 - 1080P",
            "media_status": "complete",
            "media_file_size": 1519505690,
            "media_file_second": 5949,
            "media_file_metadata": {
                "streams": [
                    {
                        "index": 0,
                        "codec_name": "hevc",
                        "codec_long_name": "H.265 / HEVC (High Efficiency Video Coding)",
                        "profile": "Main",
                        "codec_type": "video",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "width": 1920,
                        "height": 1080,
                        "coded_width": 1920,
                        "coded_height": 1080,
                        "closed_captions": 0,
                        "film_grain": 0,
                        "has_b_frames": 2,
                        "sample_aspect_ratio": "1:1",
                        "display_aspect_ratio": "16:9",
                        "pix_fmt": "yuv420p",
                        "level": 120,
                        "color_range": "tv",
                        "chroma_location": "left",
                        "refs": 1,
                        "view_ids_available": "",
                        "view_pos_available": "",
                        "r_frame_rate": "24000/1001",
                        "avg_frame_rate": "24000/1001",
                        "time_base": "1/1000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "extradata_size": 1989,
                        "disposition": {
                            "default": 1,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "BPS-eng": "1815047",
                            "DURATION-eng": "01:39:08.943000000",
                            "NUMBER_OF_FRAMES-eng": "142632",
                            "NUMBER_OF_BYTES-eng": "1349702085",
                            "_STATISTICS_WRITING_APP-eng": "mkvmerge v42.0.0 ('Overtime') 64-bit",
                            "_STATISTICS_WRITING_DATE_UTC-eng": "2020-01-09 16:01:16",
                            "_STATISTICS_TAGS-eng": "BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES"
                        }
                    },
                    {
                        "index": 1,
                        "codec_name": "aac",
                        "codec_long_name": "AAC (Advanced Audio Coding)",
                        "profile": "LC",
                        "codec_type": "audio",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "sample_fmt": "fltp",
                        "sample_rate": "48000",
                        "channels": 2,
                        "channel_layout": "stereo",
                        "bits_per_sample": 0,
                        "initial_padding": 0,
                        "r_frame_rate": "0/0",
                        "avg_frame_rate": "0/0",
                        "time_base": "1/1000",
                        "start_pts": 21,
                        "start_time": "0.021000",
                        "extradata_size": 2,
                        "disposition": {
                            "default": 1,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "language": "jpn",
                            "title": "Japanese",
                            "BPS-eng": "212275",
                            "DURATION-eng": "01:39:08.928000000",
                            "NUMBER_OF_FRAMES-eng": "278856",
                            "NUMBER_OF_BYTES-eng": "157851221",
                            "_STATISTICS_WRITING_APP-eng": "mkvmerge v42.0.0 ('Overtime') 64-bit",
                            "_STATISTICS_WRITING_DATE_UTC-eng": "2020-01-09 16:01:16",
                            "_STATISTICS_TAGS-eng": "BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES"
                        }
                    },
                    {
                        "index": 2,
                        "codec_name": "ass",
                        "codec_long_name": "ASS (Advanced SSA) subtitle",
                        "codec_type": "subtitle",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "r_frame_rate": "0/0",
                        "avg_frame_rate": "0/0",
                        "time_base": "1/1000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "duration_ts": 5948949,
                        "duration": "5948.949000",
                        "extradata_size": 2754,
                        "disposition": {
                            "default": 1,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "title": "SC",
                            "BPS-eng": "122",
                            "DURATION-eng": "01:38:26.860000000",
                            "NUMBER_OF_FRAMES-eng": "1764",
                            "NUMBER_OF_BYTES-eng": "90714",
                            "_STATISTICS_WRITING_APP-eng": "mkvmerge v42.0.0 ('Overtime') 64-bit",
                            "_STATISTICS_WRITING_DATE_UTC-eng": "2020-01-09 16:01:16",
                            "_STATISTICS_TAGS-eng": "BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES"
                        }
                    },
                    {
                        "index": 3,
                        "codec_name": "ass",
                        "codec_long_name": "ASS (Advanced SSA) subtitle",
                        "codec_type": "subtitle",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "r_frame_rate": "0/0",
                        "avg_frame_rate": "0/0",
                        "time_base": "1/1000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "duration_ts": 5948949,
                        "duration": "5948.949000",
                        "extradata_size": 2754,
                        "disposition": {
                            "default": 0,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "title": "TC",
                            "BPS-eng": "122",
                            "DURATION-eng": "01:38:26.860000000",
                            "NUMBER_OF_FRAMES-eng": "1764",
                            "NUMBER_OF_BYTES-eng": "90714",
                            "_STATISTICS_WRITING_APP-eng": "mkvmerge v42.0.0 ('Overtime') 64-bit",
                            "_STATISTICS_WRITING_DATE_UTC-eng": "2020-01-09 16:01:16",
                            "_STATISTICS_TAGS-eng": "BPS DURATION NUMBER_OF_FRAMES NUMBER_OF_BYTES"
                        }
                    },
                    {
                        "index": 4,
                        "codec_name": "ttf",
                        "codec_long_name": "TrueType font",
                        "codec_type": "attachment",
                        "codec_tag_string": "[0][0][0][0]",
                        "codec_tag": "0x0000",
                        "r_frame_rate": "0/0",
                        "avg_frame_rate": "0/0",
                        "time_base": "1/90000",
                        "start_pts": 0,
                        "start_time": "0.000000",
                        "duration_ts": 535405410,
                        "duration": "5948.949000",
                        "extradata_size": 9910468,
                        "disposition": {
                            "default": 0,
                            "dub": 0,
                            "original": 0,
                            "comment": 0,
                            "lyrics": 0,
                            "karaoke": 0,
                            "forced": 0,
                            "hearing_impaired": 0,
                            "visual_impaired": 0,
                            "clean_effects": 0,
                            "attached_pic": 0,
                            "timed_thumbnails": 0,
                            "non_diegetic": 0,
                            "captions": 0,
                            "descriptions": 0,
                            "metadata": 0,
                            "dependent": 0,
                            "still_image": 0,
                            "multilayer": 0
                        },
                        "tags": {
                            "filename": "方正准圆_GBK.ttf",
                            "mimetype": "application/x-truetype-font"
                        }
                    }
                ],
                "format": {
                    "nb_streams": 5,
                    "nb_programs": 0,
                    "nb_stream_groups": 0,
                    "format_name": "matroska,webm",
                    "format_long_name": "Matroska / WebM",
                    "start_time": "0.000000",
                    "duration": "5948.949000",
                    "size": "1519505690",
                    "bit_rate": "2043393",
                    "probe_score": 100,
                    "tags": {
                        "encoder": "libebml v1.3.10 + libmatroska v1.5.2",
                        "creation_time": "2020-01-09T16:01:16.000000Z",
                        "Writing frontend": "StaxRip v1.7.0.0"
                    }
                }
            },
            "user_pseudonym": null,
            "user_id": null,
            "is_self_upload": false,
            "storage_title": "Zn存档服",
            "created_at": "2025-10-30T10:18:20.000000Z"
        }
    ]
}
```

返回（不含元数据）：

```json
{
    "page": 1,
    "page_size": 2,
    "total": 2,
    "items": [
        {
            "video_id": 4111,
            "video_type": "tv",
            "video_title": "小城大事",
            "todb_id": 4111,
            "tmdb_id": 279593,
            "season_id": 7575,
            "season_number": 1,
            "season_title": "第 1 季",
            "episode_id": 161263,
            "episode_number": 11,
            "episode_title": "滨海路之争！群众干部打起来了？",
            "part_id": null,
            "part_number": null,
            "part_title": null,
            "media_id": "ewyo9rw0oqdz",
            "media_name": "4K 高码率 f1ne 上传",
            "media_status": "complete",
            "media_file_size": 5209954120,
            "media_file_second": 2799,
            "media_file_metadata": null,
            "user_pseudonym": "f1bb",
            "user_id": "e0E446ZE6s",
            "is_self_upload": false,
            "storage_title": "Zn存档服",
            "created_at": "2026-01-19T11:42:21.000000Z"
        },
        {
            "video_id": 1038,
            "video_type": "movie",
            "video_title": "我们仍未知道那天所看见的花的名字。剧场版",
            "todb_id": 1038,
            "tmdb_id": 255413,
            "season_id": null,
            "season_number": null,
            "season_title": null,
            "episode_id": null,
            "episode_number": null,
            "episode_title": null,
            "part_id": null,
            "part_number": null,
            "part_title": null,
            "media_id": "59mnkq6jn2rl",
            "media_name": "存档服 - 1080P",
            "media_status": "complete",
            "media_file_size": 1519505690,
            "media_file_second": 5949,
            "media_file_metadata": null,
            "user_pseudonym": null,
            "user_id": null,
            "is_self_upload": false,
            "storage_title": "Zn存档服",
            "created_at": "2025-10-30T10:18:20.000000Z"
        }
    ]
}
```

#### 删除资源

`DELETE /api/video/media/delete`

```json5
{
    "media_id":"2xeowrq1nv49",
    // 删除别人视频时 需要传入原因 50字内
    "reason": null
}
```

返回（删除资源）：

```json
{
    "carrot": 3
}
```

#### 恢复资源

`PUT /api/video/media/restore`

只可恢复 `is_can_restore` 为 `true` 的

```json5
{
    "media_id": "2xeowrq1nv49"
}
```

返回（恢复资源）：

```json
{
    "carrot": -10
}
```

#### 移动资源

`PUT /api/video/media/move?media_id=YLgw45W2Jk1V&item_type=ve&item_id=3`

参数：`media_id`、`item_type`、`item_id`

返回（移动资源）：

```json
{
    "carrot": 1
}
```

#### 重命名资源

`PUT /api/video/media/rename?media_id=YLgw45W2Jk1V&name=4k HDR`

参数：`media_id`、`name`

返回（重命名资源）：

```json
{
    "carrot": 1
}
```

#### 获取播放地址

`GET /api/video/media/playUrl?media_id=YLgw45W2Jk1V`

第三方播放使用 每次`-1`萝卜
获取后 可以缓存10分钟

参数：`media_id`

返回（获取播放地址）：

```json
{
    "url": "http://emos.local/play"
}
```

#### 重新同步metadata

`PUT /api/video/media/syncMetadata?media_id=YLgw45W2Jk1V`

针对无 metadata 的视频信息重新触发同步
点击后预计3分钟同步完成

参数：`media_id`

### 字幕相关

#### 获取字幕列表

`GET /api/video/subtitle/list?video_list_id=1&video_episode_id=1&video_part_id&media_id`

参数中 查什么穿什么

参数：`video_list_id`、`video_episode_id`、`video_part_id`、`media_id`

返回（获取字幕列表）：

```json
[
    {
        "subtitle_id": "Bpvx8YxPoVdQ",
        "subtitle_title": "demo - 张三 上传",
        "subtitle_codec": "mp4",
        "user_pseudonym": "张三",
        "is_self_upload": true,
        "created_at": "2026-01-18T16:20:30.000000Z"
    }
]
```

#### 删除字幕

`DELETE /api/video/subtitle/delete`

```json5
{
    "subtitle_id": "2xeowrq1nv49",
    // 删除别人字幕时 需要传入原因 50字内
    "reason": null
}
```

返回（删除字幕）：

```json
{
    "carrot": 1
}
```

#### 重命名字幕

`PUT /api/video/subtitle/rename?subtitle_id=Bpvx8YxPoVdQ&title=简中`

参数：`subtitle_id`、`title`

返回（重命名字幕）：

```json
{
    "carrot": 1
}
```

### 观影记录

#### 请求数

`GET /api/video/record/request?user_id`

只可查询近一周的
带有 `admin` 角色的可以查全局

参数：`user_id`

返回（请求数）：

```json
{
    "page": 1,
    "page_size": 10,
    "total": 1,
    "items": [
        {
            "video_media_id": "deqped9rnmx8",
            "range": "0-",
            "is_proxy": false,
            "video_id": 1000,
            "video_type": "tv",
            "video_title": "沧元图",
            "ip": "192.168.1.4",
            "ua": "Yamby/2.0.2.2(Android",
            "time": "2026-04-17 05:07:03"
        }
    ]
}
```

#### 观影历史

`GET /api/video/record/list`

只会显示回传超过10s的视频

返回（观影历史）：

```json
{
    "page": 1,
    "page_size": 10,
    "total": 2,
    "items": [
        {
            "video_id": 1007,
            "video_title": "教父",
            "video_type": "movie",
            "todb_id": 1002,
            "tmdb_id": 238,
            "video_image_logo": "https://image.theotherdb.org/w154/4m3XGKBbmXjKPpyQ",
            "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8JjKDr6Xd",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/xkd23zZ5qaPW1gPN",
            "video_season_id": null,
            "season_number": null,
            "video_episode_id": null,
            "episode_number": null,
            "episode_image_poster": null,
            "media_id": "deqped9rnmx8",
            "media_name": "4K - hevc - sx66 上传",
            "media_seconds": 1385,
            "play_seconds": 0,
            "play_ua": "Yamby/2.0.2.2(Android",
            "is_complete": false,
            "time": "2026-04-19 06:04:11"
        },
        {
            "video_id": 1000,
            "video_title": "沧元图",
            "video_type": "tv",
            "todb_id": 2632,
            "tmdb_id": 229192,
            "video_image_logo": "https://image.theotherdb.org/w154/Ld4J6WEwyjMR0pY5",
            "video_image_poster": "https://image.theotherdb.org/w185/rDGwpKMvXPWVMyb4",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/JQo56WNjrpWX9Nvg",
            "video_season_id": 1,
            "season_number": 1,
            "video_episode_id": 1,
            "episode_number": 1,
            "episode_image_poster": "https://image.theotherdb.org/w185/dw47oRxjdlWZMVmG",
            "media_id": "deqped9rnmx8",
            "media_name": "4K - hevc - sx66 上传",
            "media_seconds": 1385,
            "play_seconds": 81,
            "play_ua": "Yamby/2.0.2.2(Android",
            "is_complete": false,
            "time": "2026-04-19 06:03:55"
        }
    ]
}
```

#### 更新记录

`PUT /api/video/record/change?mode=delete&type=vl&id=1000`

这个视频的 就是 vl 用 video_id 
如果是某季 就是 vs 用 video_season_id
如果是某集 就是 ve 用 video_episode_id

参数：`mode`、`type`、`id`

返回（更新记录）：

```json
{
    "count": 1
}
```

## 片单相关

### 兑换新卡槽

`POST /api/watch/slot`

返回（兑换新卡槽）：

```json
{
    "slot_remaining": 5
}
```

### 列表

`GET /api/watch?watch_id&type&name=&author_id=&author_username=&is_public=&is_self=&is_subscribe=`

- `maintainers` 维护者
- `author` 作者信息 官方片单会为 `null`
- `is_self` 是否自己创建的
- `is_edit_video` 是否有权限编辑视频列表
- `is_subscribe` 是否订阅

参数：`watch_id`、`type`、`name`、`author_id`、`author_username`、`is_public`、`is_self`、`is_subscribe`

返回（列表）：

```json
{
    "page": 1,
    "page_size": 20,
    "total": 2,
    "items": [
        {
            "subscribe_id": 1000,
            "id": 1000,
            "name": "张三的片单1",
            "description": "这是个简介",
            "is_public": true,
            "carrot": 10,
            "tags": [
                "国漫",
                "追新"
            ],
            "image_poster": "XNrvMY2pkxbE",
            "image_poster_url": "http://emos.local/files/test/77b04728-3048-46f7-bdc2-ef9f798bc043.png",
            "is_show_empty": true,
            "is_self": true,
            "is_edit_video": true,
            "is_subscribe": true,
            "user_is_show": false,
            "user_sort": 80,
            "subscribe_count": 1,
            "video_count": 6863,
            "maintainers": [
                {
                    "user_id": "eQP312ER4s",
                    "username": "user_i",
                    "avatar": null
                },
                {
                    "user_id": "eZO9M29JRs",
                    "username": "user_2",
                    "avatar": "http://emos.local/avatar1.png"
                }
            ],
            "author": {
                "user_id": "eWD3N7EX8s",
                "username": "soa",
                "avatar": null
            },
            "updated_at": "2026-01-25T06:18:13.000000Z"
        },
        {
            "subscribe_id": 1003,
            "id": 1003,
            "name": "张三的片单1",
            "description": "这是个简介",
            "is_public": true,
            "carrot": 0,
            "tags": [
                "国漫",
                "追新"
            ],
            "image_poster": "XNrvMY2pkxbE",
            "image_poster_url": "http://emos.local/files/test/77b04728-3048-46f7-bdc2-ef9f798bc043.png",
            "is_show_empty": true,
            "is_self": false,
            "is_edit_video": false,
            "is_subscribe": false,
            "user_is_show": null,
            "user_sort": null,
            "subscribe_count": 0,
            "video_count": 0,
            "maintainers": [],
            "author": null,
            "updated_at": "2026-01-24T10:41:43.000000Z"
        }
    ]
}
```

### 新增或修改

`POST /api/watch`

```json5
{
    // 存在则更新
    "id": null,
    // 片单类型 必填
    "type": "music",
    // 片单名称 100字内
    "name": "张三的片单1",
    // 简介 1万字内
    "description": "这是个简介",
    // 是否公开
    "is_public": true,
    // 所需萝卜 达到后才可以进行订阅 最高 50000
    "point": 0,
    // 标签
    "tags": [
        "国漫",
        "追新"
    ],
    // 是否显示空媒体
    "is_show_empty": true,
    // 封面图地址
    "image_poster_url": "http://emos.local/image.png"
}
```

返回（新增或修改）：

```json
{
    "watch_id": 1000,
    "count": 1
}
```

### 更新维护者

`PUT /api/watch/{{watch_id}}/maintainer`

所有维护者 只对片单中的视频有操作权限

```json5
{
    "maintainers": [
        // 用户ID
        "eAAAs"
    ]
}
```

返回（更新维护者）：

```json
{
    "maintainers_count": 0
}
```

### 删除

`DELETE /api/watch/{{watch_id}}`

### 对已订阅片单排序

`PUT /api/watch/{{watch_id}}/sort?sort=80`

类似于 媒体库排序

参数：`sort`

### 切换已订阅片单是否可见

`PUT /api/watch/{{watch_id}}/show`

类似于 媒体库隐藏

返回（切换已订阅片单是否可见）：

```json
{
    "is_show": true
}
```

### 查看已订阅用户

`GET /api/watch/{{watch_id}}/user`

返回（查看已订阅用户）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 1,
    "items": [
        {
            "username": "soa",
            "avatar": null,
            "carrot": 10,
            "expiration_date": "2026-02-01",
            "created_at": "2026-01-25T03:18:52.000000Z"
        }
    ]
}
```

### 订阅/取消订阅

`PUT /api/watch/{{watch_id}}/subscribe?sort`

参数：`sort`

返回（订阅/取消订阅）：

```json
{
    "is_subscribe": true
}
```

### 设置为动态抓取片单

`PUT /api/watch/{{watch_id}}/dynamic`

接口为同步调用 将会去目标地址执行抓取

```json5
{
    // 抓取地址 空则关闭此功能
    "url": null
}
```

返回（无地址）：

```json
{
    "url": null
}
```

返回（设置成功）：

```json
{
    "url": "https://emos.local/watch/tv",
    "spider": {
        "count_sync": 576,
        "count_no_data": 1797
    }
}
```

返回（抓取错误）：

```json
{
    "error": "updated_at same"
}
```

### 视频类

#### 片单视频列表

`GET /api/watch/{{watch_id}}/video?video_title=`

参数：`video_title`

返回（片单视频列表）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 6863,
    "items": [
        {
            "video_id": 1001,
            "todb_id": 1001,
            "tmdb_id": 1399,
            "video_type": "tv",
            "video_title": "权力的游戏",
            "video_origin_title": "Game of Thrones",
            "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyG2zLwlgx",
            "video_date_air": "2011-04-17",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 3,
                    "name": "剧情"
                },
                {
                    "id": 4,
                    "name": "动作冒险"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1002,
            "todb_id": 1002,
            "tmdb_id": 238,
            "video_type": "movie",
            "video_title": "教父",
            "video_origin_title": "The Godfather",
            "video_image_poster": "https://image.theotherdb.org/w185/VqemkNz8JjKDr6Xd",
            "video_date_air": "1972-03-14",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 3,
                    "name": "剧情"
                },
                {
                    "id": 5,
                    "name": "犯罪"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:13:52.000000Z"
        },
        {
            "video_id": 1003,
            "todb_id": 1003,
            "tmdb_id": 66732,
            "video_type": "tv",
            "video_title": "怪奇物语",
            "video_origin_title": "Stranger Things",
            "video_image_poster": "https://image.theotherdb.org/w185/0lkE6Mze4nWDwvY8",
            "video_date_air": "2016-07-15",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 6,
                    "name": "悬疑"
                },
                {
                    "id": 4,
                    "name": "动作冒险"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1004,
            "todb_id": 1004,
            "tmdb_id": 209867,
            "video_type": "tv",
            "video_title": "葬送的芙莉莲",
            "video_origin_title": "葬送のフリーレン",
            "video_image_poster": "https://image.theotherdb.org/w185/b056AmKrkDWEj18e",
            "video_date_air": "2023-09-29",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 4,
                    "name": "动作冒险"
                },
                {
                    "id": 3,
                    "name": "剧情"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1005,
            "todb_id": 1005,
            "tmdb_id": 223911,
            "video_type": "tv",
            "video_title": "仙逆",
            "video_origin_title": "仙逆",
            "video_image_poster": "https://image.theotherdb.org/w185/60yjDBR0knznw5do",
            "video_date_air": "2023-09-25",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 4,
                    "name": "动作冒险"
                },
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 3,
                    "name": "剧情"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:13:52.000000Z"
        },
        {
            "video_id": 1006,
            "todb_id": 1006,
            "tmdb_id": 76121,
            "video_type": "tv",
            "video_title": "DARLING in the FRANXX",
            "video_origin_title": "ダーリン・イン・ザ・フランキス",
            "video_image_poster": "https://image.theotherdb.org/w185/0rDGwpKMwgzVMyb4",
            "video_date_air": "2018-01-13",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 3,
                    "name": "剧情"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 8,
                    "name": "喜剧"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1007,
            "todb_id": 1007,
            "tmdb_id": 349498,
            "video_type": "movie",
            "video_title": "垫底辣妹",
            "video_origin_title": "ビリギャル",
            "video_image_poster": "https://image.theotherdb.org/w185/56q74rRo89KwZLEb",
            "video_date_air": "2015-05-01",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 8,
                    "name": "喜剧"
                },
                {
                    "id": 3,
                    "name": "剧情"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1008,
            "todb_id": 1008,
            "tmdb_id": 106449,
            "video_type": "tv",
            "video_title": "凡人修仙传",
            "video_origin_title": "凡人修仙传",
            "video_image_poster": "https://image.theotherdb.org/w185/OYDeMgWlkZKx051V",
            "video_date_air": "2020-07-25",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 4,
                    "name": "动作冒险"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1009,
            "todb_id": 1009,
            "tmdb_id": 124003,
            "video_type": "tv",
            "video_title": "完美世界",
            "video_origin_title": "完美世界",
            "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDNnWV15GA",
            "video_date_air": "2021-04-23",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 4,
                    "name": "动作冒险"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 7,
                    "name": "动画"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:13:52.000000Z"
        },
        {
            "video_id": 1010,
            "todb_id": 1010,
            "tmdb_id": 206534,
            "video_type": "tv",
            "video_title": "苍兰诀",
            "video_origin_title": "苍兰诀",
            "video_image_poster": "https://image.theotherdb.org/w185/Z94MERbo5DKp2Jeg",
            "video_date_air": "2022-07-15",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1011,
            "todb_id": 1011,
            "tmdb_id": 227980,
            "video_type": "tv",
            "video_title": "华卫士基萨利斯",
            "video_origin_title": "Sentika F8ABA6 Jisariz",
            "video_image_poster": "https://image.theotherdb.org/w185/dw47oRxylZKZMVmG",
            "video_date_air": "2023-05-07",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 4,
                    "name": "动作冒险"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 3,
                    "name": "剧情"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:13:52.000000Z"
        },
        {
            "video_id": 1012,
            "todb_id": 1012,
            "tmdb_id": 107255,
            "video_type": "tv",
            "video_title": "龙族",
            "video_origin_title": "龙族",
            "video_image_poster": "https://image.theotherdb.org/w185/xGPd1KqJagWqyj6Q",
            "video_date_air": "2022-08-19",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 4,
                    "name": "动作冒险"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1013,
            "todb_id": 1013,
            "tmdb_id": 228429,
            "video_type": "tv",
            "video_title": "斗罗大陆Ⅱ绝世唐门",
            "video_origin_title": "斗罗大陆Ⅱ绝世唐门",
            "video_image_poster": "https://image.theotherdb.org/w185/1XaJpKvB94K3lx9Y",
            "video_date_air": "2023-06-24",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 4,
                    "name": "动作冒险"
                },
                {
                    "id": 3,
                    "name": "剧情"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1014,
            "todb_id": 1014,
            "tmdb_id": 218642,
            "video_type": "tv",
            "video_title": "师兄啊师兄",
            "video_origin_title": "师兄啊师兄",
            "video_image_poster": "https://image.theotherdb.org/w185/adPQEW3BlBK1qn9o",
            "video_date_air": "2023-01-19",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 8,
                    "name": "喜剧"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                },
                {
                    "id": 4,
                    "name": "动作冒险"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        },
        {
            "video_id": 1015,
            "todb_id": 1015,
            "tmdb_id": 206343,
            "video_type": "tv",
            "video_title": "神墓",
            "video_origin_title": "神墓",
            "video_image_poster": "https://image.theotherdb.org/w185/xkd23zZXxlK1gPNe",
            "video_date_air": "2022-07-21",
            "video_is_adult": false,
            "genres": [
                {
                    "id": 7,
                    "name": "动画"
                },
                {
                    "id": 1,
                    "name": "Sci-Fi & Fantasy"
                }
            ],
            "video_is_delete": false,
            "sort": 90,
            "remark": null,
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "updated_at": "2026-01-25T07:12:59.000000Z"
        }
    ]
}
```

#### 搜索未加入片单的视频

`GET /api/watch/{{watch_id}}/video/search?title=权力的游戏&type`

参数：`title`、`type`

返回（搜索未加入片单的视频）：

```json
[
    {
        "video_id": 1001,
        "todbv_id": 1038,
        "video_type": "tv",
        "video_title": "权力的游戏",
        "video_origin_title": "Game of Thrones",
        "video_date_air": "2026-06-26",
        "video_is_adult": false,
        "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyG2zLwlgx"
    }
]
```

#### 更新片单内视频

`POST /api/watch/{{watch_id}}/video/{{video_id}}`

```json5
{
    // 排序 1-5000之间 越小约靠前 默认80 必填
    "sort": 80,
    // 备注 100字内
    "remark": null
}
```

返回（更新片单内视频）：

```json
{
    "count": 1
}
```

#### 删除片单内视频

`DELETE /api/watch/{{watch_id}}/video/{{video_id}}`

返回（删除片单内视频）：

```json
{
    "count": 0
}
```

#### 清空片单内视频

`DELETE /api/watch/{{watch_id}}/video/empty`

返回内容为 已删除视频总数

返回（清空片单内视频）：

```json
{
    "count": 0
}
```

#### 批量设置片单内视频

`POST /api/watch/{{watch_id}}/video/update`

最大支持 `1000` 个视频
每次提交时会重置当前片单的视频

外部接口使用 一次性更新片单内视频
请先联系官方确定您添加的内容是否与现有的动态片单产生冲突 

返回值为设置成功的数据

```json5
[
    // 排序为此数组是顺序 单个片单最大视频为5000
    {
        // tmdb tv 的 id
        "type": "tmdb_tv",
        "value": "223911"
    },
    {
        // tmdb movie 的 id
        "type": "tmdb_movie",
        "value": "238"
    },
    {
        // todb 的 id
        "type": "todb",
        "value": "1009"
    },
    {
        // 系统中 video 的 id
        "type": "video_id",
        "value": "1011"
    }
]
```

返回（批量设置片单内视频）：

```json
[
    {
        "id": 1002,
        "todb_id": 1002,
        "tmdb_id": 238,
        "video_type": "movie",
        "title": "教父"
    },
    {
        "id": 1005,
        "todb_id": 1005,
        "tmdb_id": 223911,
        "video_type": "tv",
        "title": "仙逆"
    },
    {
        "id": 1009,
        "todb_id": 1009,
        "tmdb_id": 124003,
        "video_type": "tv",
        "title": "完美世界"
    },
    {
        "id": 1011,
        "todb_id": 1011,
        "tmdb_id": 227980,
        "video_type": "tv",
        "title": "华卫士基萨利斯"
    }
]
```

### 音乐类

#### 歌单歌曲列表

`GET /api/watch/{{watch_id}}/music?song_title=`

参数：`song_title`

返回（歌单歌曲列表）：

```json
{
    "page": 1,
    "page_size": 5,
    "total": 1,
    "items": [
        {
            "song_id": 1512,
            "todb_music_music_id": 1786,
            "name": "曼陀山庄（天龙八部端游怀旧服主题曲）",
            "image_poster_url": null,
            "description": null,
            "tagline": null,
            "duration": 256,
            "video_list_id": null,
            "rating": null,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1135,
                    "name": "曼陀山庄（天龙八部端游怀旧服主题曲）"
                }
            ],
            "remark": null,
            "sort": 5000
        }
    ]
}
```

#### 搜索未加入歌单的歌曲

`GET /api/watch/{{watch_id}}/music/search?song_title=`

参数：`song_title`

返回（搜索未加入歌单的歌曲）：

```json
{
    "page": 1,
    "page_size": 5,
    "total": 573,
    "items": [
        {
            "song_id": 1407,
            "todb_music_song_id": 1846,
            "name": "七号公园",
            "image_poster_url": null,
            "tagline": null,
            "duration": 214,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1000,
                    "name": "a2",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1195,
                    "name": "七号公园"
                }
            ]
        },
        {
            "song_id": 1570,
            "todb_music_song_id": 1844,
            "name": "散场电影",
            "image_poster_url": null,
            "tagline": null,
            "duration": 215,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1193,
                    "name": "散场电影"
                }
            ]
        },
        {
            "song_id": 1569,
            "todb_music_song_id": 1843,
            "name": "浅唱",
            "image_poster_url": null,
            "tagline": null,
            "duration": 246,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1192,
                    "name": "浅唱"
                }
            ]
        },
        {
            "song_id": 1406,
            "todb_music_song_id": 1845,
            "name": "摇头玩",
            "image_poster_url": null,
            "tagline": null,
            "duration": 205,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1000,
                    "name": "a2",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1194,
                    "name": "摇头玩"
                }
            ]
        },
        {
            "song_id": 1568,
            "todb_music_song_id": 1842,
            "name": "秋千坠",
            "image_poster_url": null,
            "tagline": null,
            "duration": 257,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1191,
                    "name": "秋千坠"
                }
            ]
        }
    ]
}
```

#### 更新歌单内歌曲

`POST /api/watch/{{watch_id}}/music/{{music_song_id}}`

```json5
{
    // 排序 1-5000之间 越小约靠前 默认80 必填
    "sort": 5000,
    // 备注 100字内
    "remark": null
}
```

返回（更新歌单内歌曲）：

```json
{
    "count": 1
}
```

#### 删除歌单内歌曲

`DELETE /api/watch/{{watch_id}}/music/{{music_song_id}}`

返回（删除歌单内歌曲）：

```json
{
    "count": 0
}
```

#### 清空歌单内歌曲

`DELETE /api/watch/{{watch_id}}/music/empty`

返回（清空歌单内歌曲）：

```json
{
    "count": 0
}
```

## 反代相关

### 线路相关

#### 线路列表

`GET /api/proxy/line?only_self`

参数：`only_self`

返回（线路列表）：

```json
[
    {
        "id": 1000,
        "name": "@proxy",
        "url": "http://proxy.local",
        "tagline": "三网绕路",
        "is_self": true,
        "created_at": "2026-01-20T18:00:24.000000Z"
    }
]
```

#### 添加线路

`POST /api/proxy/line`

```json5
{
    // 线路名称 建议为自己的id
    "name": "@proxy",
    // 线路地址 无须尾部斜杠
    "url": "http://proxy.local",
    // 线路一句话简介
    "tagline": "三网绕路"
}
```

返回（添加线路）：

```json
{
    "id": 1000
}
```

#### 删除线路

`DELETE /api/proxy/line?id=1`

参数：`id`

## 求片相关

### 求片列表

`POST /api/seek`

```json5
{
    // 视频类型
    "video_type": null,
    // 排序字段 count_request 求片总数 seek_carrot 萝卜数 upload_expired_at 上传过期时间 updated_at 更新时间
    "sort_by": "updated_at",
    // 排序方式 asc desc
    "sort_order": "desc",
    // 状态 default 默认 upload 已认领 complete 完成 cancel 取消 forget 遗忘
    "status": [
        "default",
        "upload"
    ],
    // 是否自己上传
    "upload_self": false,
    // 搜索标题 前缀匹配模式
    "video_title": null,
    // 是否包含用户求片历史
    "with_user": false
}
```

返回（求片列表）：

```json
{
    "page": 1,
    "page_size": 20,
    "total": 3,
    "items": [
        {
            "id": 1,
            "video_type": "movie",
            "todb_id": 7819,
            "tmdb_id": 508935,
            "video_title_display": "八佰",
            "video_list_id": 7819,
            "video_season_id": null,
            "video_season_number": null,
            "video_episode_id": null,
            "video_episode_number": null,
            "count_request": 1,
            "status": "default",
            "upload_expired_at": null,
            "updated_at": "2026-01-22T07:05:06.000000Z",
            "video_title": "八佰",
            "video_date_air": "2026-07-14",
            "video_image_logo": "https://image.theotherdb.org/w154/x4YQvW1DwLVKXa0O",
            "video_image_poster": "https://image.theotherdb.org/w185/N5ZAPKyMeeDKLwlg",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/gVAvkR7800VKjOJq",
            "tmdb_url": "https://www.themoviedb.org/movie/508935",
            "upload_username": null,
            "is_can_claim": true,
            "item_id": "vl-7819",
            "seek_carrot": 0
        },
        {
            "id": 4,
            "video_type": "tv",
            "todb_id": 1009,
            "tmdb_id": 124003,
            "video_title_display": "完美世界 # S00E02",
            "video_list_id": 1009,
            "video_season_id": 1026,
            "video_season_number": 0,
            "video_episode_id": 1986,
            "video_episode_number": 2,
            "count_request": 1,
            "status": "default",
            "upload_expired_at": null,
            "updated_at": "2026-01-22T06:19:16.000000Z",
            "video_title": "完美世界",
            "video_date_air": "2026-07-14",
            "video_image_logo": "https://image.theotherdb.org/w154/oBl1NKJoGqWjJDwa",
            "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDNnWV15GA",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/O8pkdJz5obKMQyqx",
            "tmdb_url": "https://www.themoviedb.org/tv/124003",
            "upload_username": null,
            "is_can_claim": true,
            "item_id": "ve-1986",
            "seek_carrot": 0
        },
        {
            "id": 3,
            "video_type": "movie",
            "todb_id": 7858,
            "tmdb_id": 1093215,
            "video_title_display": "不亲密朋友",
            "video_list_id": 7858,
            "video_season_id": null,
            "video_season_number": null,
            "video_episode_id": null,
            "video_episode_number": null,
            "count_request": 1,
            "status": "upload",
            "upload_expired_at": "2026-01-23 14:18:38",
            "updated_at": "2026-01-22T06:09:57.000000Z",
            "video_title": "不亲密朋友",
            "video_date_air": "2026-07-14",
            "video_image_logo": null,
            "video_image_poster": "https://image.theotherdb.org/w185/1XaJpKvBL8MK3lx9",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/NxmMPWjDrQpR964Q",
            "tmdb_url": "https://www.themoviedb.org/movie/1093215",
            "upload_username": "soa",
            "is_can_claim": true,
            "item_id": "vl-7858",
            "seek_carrot": 0
        }
    ]
}
```

返回（包含用户求片历史）：

```json
{
    "page": 1,
    "page_size": 20,
    "total": 4,
    "items": [
        {
            "id": 1,
            "video_type": "movie",
            "todb_id": 7819,
            "tmdb_id": 508935,
            "video_title_display": "八佰",
            "video_list_id": 7819,
            "video_season_id": null,
            "video_season_number": null,
            "video_episode_id": null,
            "video_episode_number": null,
            "count_request": 1,
            "status": "default",
            "upload_expired_at": null,
            "updated_at": "2026-01-25T12:44:52.000000Z",
            "video_title": "八佰",
            "video_image_logo": "https://image.theotherdb.org/w154/x4YQvW1DwLVKXa0O",
            "video_image_poster": "https://image.theotherdb.org/w185/N5ZAPKyMeeDKLwlg",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/gVAvkR7800VKjOJq",
            "tmdb_url": "https://www.themoviedb.org/movie/508935",
            "upload_username": null,
            "is_can_claim": true,
            "item_id": "vl-7819",
            "seek_carrot": 50,
            "users": [
                {
                    "username": "soa",
                    "avatar": null,
                    "carrot": 10,
                    "created_at": "2026-01-25T12:44:52.000000Z"
                },
                {
                    "username": "soa",
                    "avatar": null,
                    "carrot": 10,
                    "created_at": "2026-01-25T12:44:51.000000Z"
                }
            ]
        },
        {
            "id": 6,
            "video_type": "tv",
            "todb_id": 1001,
            "tmdb_id": 1399,
            "video_title_display": "权力的游戏 # S00E01",
            "video_list_id": 1001,
            "video_season_id": 1005,
            "video_season_number": 0,
            "video_episode_id": 1097,
            "video_episode_number": 1,
            "count_request": 1,
            "status": "default",
            "upload_expired_at": null,
            "updated_at": "2026-01-25T12:29:03.000000Z",
            "video_title": "权力的游戏",
            "video_image_logo": "https://image.theotherdb.org/w154/meLB0xzkLQRE846Z",
            "video_image_poster": "https://image.theotherdb.org/w185/6N5ZAPKyG2zLwlgx",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/rgVAvkR7xJKjOJqQ",
            "tmdb_url": "https://www.themoviedb.org/tv/1399",
            "upload_username": null,
            "is_can_claim": true,
            "item_id": "ve-1097",
            "seek_carrot": 0,
            "users": [
                {
                    "username": "user_i",
                    "avatar": null,
                    "carrot": 0,
                    "created_at": "2026-01-25T12:29:03.000000Z"
                }
            ]
        },
        {
            "id": 4,
            "video_type": "tv",
            "todb_id": 1009,
            "tmdb_id": 124003,
            "video_title_display": "完美世界 # S00E02",
            "video_list_id": 1009,
            "video_season_id": 1026,
            "video_season_number": 0,
            "video_episode_id": 1986,
            "video_episode_number": 2,
            "count_request": 1,
            "status": "default",
            "upload_expired_at": null,
            "updated_at": "2026-01-22T06:19:16.000000Z",
            "video_title": "完美世界",
            "video_image_logo": "https://image.theotherdb.org/w154/oBl1NKJoGqWjJDwa",
            "video_image_poster": "https://image.theotherdb.org/w185/Oo3gmkRDNnWV15GA",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/O8pkdJz5obKMQyqx",
            "tmdb_url": "https://www.themoviedb.org/tv/124003",
            "upload_username": null,
            "is_can_claim": true,
            "item_id": "ve-1986",
            "seek_carrot": 0,
            "users": [
                {
                    "username": "user_i",
                    "avatar": null,
                    "carrot": 0,
                    "created_at": "2026-01-22T06:19:16.000000Z"
                }
            ]
        },
        {
            "id": 3,
            "video_type": "movie",
            "todb_id": 7858,
            "tmdb_id": 1093215,
            "video_title_display": "不亲密朋友",
            "video_list_id": 7858,
            "video_season_id": null,
            "video_season_number": null,
            "video_episode_id": null,
            "video_episode_number": null,
            "count_request": 1,
            "status": "upload",
            "upload_expired_at": "2026-01-23 14:18:38",
            "updated_at": "2026-01-22T06:09:57.000000Z",
            "video_title": "不亲密朋友",
            "video_image_logo": null,
            "video_image_poster": "https://image.theotherdb.org/w185/1XaJpKvBL8MK3lx9",
            "video_image_backdrop": "https://image.theotherdb.org/w1280/NxmMPWjDrQpR964Q",
            "tmdb_url": "https://www.themoviedb.org/movie/1093215",
            "upload_username": "user_i",
            "is_can_claim": false,
            "item_id": "vl-7858",
            "seek_carrot": 0,
            "users": [
                {
                    "username": "user_i",
                    "avatar": null,
                    "carrot": 0,
                    "created_at": "2026-01-22T06:09:57.000000Z"
                }
            ]
        }
    ]
}
```

### 最新求片 接口轮询用

`GET /api/seek/poll?last_id=&page_size=10`

只会显示未认领的片

参数：`last_id`、`page_size`

```json5
{
    // 视频类型
    "video_type": null,
    // 排序字段 count_request 求片总数 seek_carrot 萝卜数 upload_expired_at 上传过期时间 updated_at 更新时间
    "sort_by": "updated_at",
    // 排序方式 asc desc
    "sort_order": "desc",
    // 状态 default 默认 upload 已认领 complete 完成 cancel 取消 forget 遗忘
    "status": [
        "default",
        "upload"
    ],
    // 是否自己上传
    "upload_self": false,
    // 搜索标题 前缀匹配模式
    "video_title": null
}
```

返回（最新求片 接口轮询用）：

```json
[
    {
        "id": 1,
        "todb_id": 7819,
        "tmdb_id": 508935,
        "video_type": "movie",
        "video_title_display": "八佰",
        "video_season_id": null,
        "video_season_number": null,
        "video_episode_id": null,
        "video_episode_number": null,
        "updated_at": "2026-01-22T07:05:06.000000Z"
    },
    {
        "id": 4,
        "todb_id": 1009,
        "tmdb_id": 124003,
        "video_type": "tv",
        "video_title_display": "完美世界 # S00E02",
        "video_season_id": 1026,
        "video_season_number": 0,
        "video_episode_id": 1986,
        "video_episode_number": 2,
        "updated_at": "2026-01-22T06:19:16.000000Z"
    }
]
```

### 求片/取消求片

`PUT /api/seek/apply?item_type=vl&item_id=1003`

参数：`item_type`、`item_id`

```json5
{
    // 视频类型
    "video_type": null,
    // 排序字段 count_request 求片总数 seek_carrot 萝卜数 upload_expired_at 上传过期时间 updated_at 更新时间
    "sort_by": "updated_at",
    // 排序方式 asc desc
    "sort_order": "desc",
    // 状态 default 默认 upload 已认领 complete 完成 cancel 取消 forget 遗忘
    "status": [
        "default",
        "upload"
    ],
    // 是否自己上传
    "upload_self": false,
    // 搜索标题 前缀匹配模式
    "video_title": null
}
```

返回（点播/取消点播）：

```json
{
    "seek_is_request": true
}
```

### 查询认领信息

`GET /api/seek/query?seek_id=1`

参数：`seek_id`

```json5
{
    // 视频类型
    "video_type": null,
    // 排序字段 count_request 求片总数 seek_carrot 萝卜数 upload_expired_at 上传过期时间 updated_at 更新时间
    "sort_by": "updated_at",
    // 排序方式 asc desc
    "sort_order": "desc",
    // 状态 default 默认 upload 已认领 complete 完成 cancel 取消 forget 遗忘
    "status": [
        "default",
        "upload"
    ],
    // 是否自己上传
    "upload_self": false,
    // 搜索标题 前缀匹配模式
    "video_title": null
}
```

返回（可认领时）：

```json
{
    "seek_id": 1,
    // 状态
    "status": "default",
    // 认领用户名
    "upload_username": null,
    // 认领过期时间
    "upload_expired_at": null,
    // 是否可以认领
    "is_can_claim": true,
    // 点播总数
    "request_count": 1,
    // 悬赏萝卜
    "seek_carrot": 70,
    // 更新时间
    "updated_at": "2025-12-08T17:02:58.000000Z"
}
```

返回（已被认领时）：

```json
// 已被认领时 如果 status 为 upload 并且 is_can_claim 为 true 则是自己认领的
{
    "seek_id": 1,
    "status": "upload",
    "upload_username": "test1",
    "upload_expired_at": "2025-12-08T23:01:57.000000Z",
    "is_can_claim": false,
    "request_count": 1,
    "seek_carrot": 100,
    "updated_at": "2025-12-08T17:02:58.000000Z"
}
```

返回（已完成时）：

```json
{
    "seek_id": 1,
    "status": "complete",
    "upload_username": "test1",
    "upload_expired_at": null,
    "is_can_claim": false,
    "request_count": 1,
    "seek_carrot": 0,
    "updated_at": "2025-12-08T17:02:58.000000Z"
}
```

### 查询求片历史

`GET /api/seek/history?seek_id=1&video_list_id=&video_season_id&video_episode_id`

为合并查询关系 使用时必须传一个

参数：`seek_id`、`video_list_id`、`video_season_id`、`video_episode_id`

```json5
{
    // 求片ID
    "seek_id": 1,
    // 本次悬赏的萝卜 1到5千之间
    "carrot": 10
}
```

返回（查询求片历史）：

```json
[
    {
        "username": "soa",
        "carrot": 0,
        "created_at": "2026-01-22T07:13:29.000000Z"
    },
    {
        "username": "soa",
        "carrot": 0,
        "created_at": "2026-01-22T06:09:52.000000Z"
    }
]
```

### 认领/取消认领

`PUT /api/seek/claim`

```json5
{
    // 求片ID
    "seek_id": 1,
    // 类型 confirm 认领 cancel 取消认领
    "type": "confirm"
}
```

返回（认领成功）：

```json
{
    "status": "upload"
}
```

### 催上片

`PUT /api/seek/urge`

```json5
{
    // 求片ID
    "seek_id": 1,
    // 本次悬赏的萝卜 1到5千之间
    "carrot": 10
}
```

返回（催上片）：

```json
{
    // 此资源总共悬赏的萝卜
    "seek_carrot": 0   
}
```

## 榜单相关

### 萝卜排行榜

`GET /api/rank/carrot`

前30条数据 10分钟缓存时间

返回（萝卜排行榜）：

```json
[
    {
        "index": 1,
        "carrot": 100,
        "username": "user_1",
        "avatar": null
    },
    {
        "index": 2,
        "carrot": 10,
        "username": "user_2",
        "avatar": "http://emos.local/image.png"
    }
]
```

### 上传量排行榜

`GET /api/rank/upload`

前30条数据 10分钟缓存时间 单位 字节

返回（上传量排行榜）：

```json
[
    {
        "index": 1,
        "size": 100,
        "username": "use_1",
        "avatar": null
    },
    {
        "index": 1,
        "size": 10,
        "username": "user_2",
        "avatar": "http://emos.local/image.png"
    }
]
```

### 正在播放

`GET /api/rank/userVideoRecordPlaying`

数据为最近3分钟正在看的人

- `play_speed` 播放速度 10 就是1倍数 20就是2倍数

返回（正在播放）：

```json
[
    {
        "video_title": "权力的游戏",
        "video_type": "tv",
        "todb_id": 1001,
        "tmdb_id": 1399,
        "season_number": 1,
        "episode_number": 2,
        "play_speed": 20,
        "upload_pseudonym": "emos",
        "ua": "SenPlayer/5.7.4",
        "video_image_logo": "https://image.theotherdb.org/w154/gZy7LWQBNDJz2Ppn",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbYDzp2Jeg",
        "video_image_backdrop": "https://image.theotherdb.org/w1280/dOmDowzLALRBkQAL"
    },
    {
        "video_title": "智取威虎山",
        "video_type": "movie",
        "todb_id": 7862,
        "tmdb_id": 294992,
        "season_number": null,
        "episode_number": null,
        "play_speed": 10,
        "upload_pseudonym": "emos",
        "ua": "VidHub/1.4.2",
        "video_image_logo": "https://image.theotherdb.org/w154/gZy7LWQBNDJz2Ppn",
        "video_image_poster": "https://image.theotherdb.org/w185/QZ94MERbYDzp2Jeg",
        "video_image_backdrop": "https://image.theotherdb.org/w1280/dOmDowzLALRBkQAL"
    }
]
```

### 正在播放-live

`GET /api/rank/userLiveRecordPlaying`

数据为最近3分钟正在看的人

- `provider_pseudonym` 资源提供者
- `play_durations` 持续播放时长 秒

返回（正在播放-live）：

```json
[
    {
        "provider_pseudonym": "upload_a",
        "username": "user_a",
        "live_title": "CCTV3",
        "play_durations": 600,
        "ua": "Hills/1.4.7 (android; 12)"
    },
    {
        "provider_pseudonym": "upload_b",
        "username": "user_b",
        "live_title": "CCTV6",
        "play_durations": 17,
        "ua": "SenPlayer/5.9.0"
    }
]
```

### 签到排行榜

`GET /api/rank/sign`

返回（签到排行榜）：

```json
[
    {
        "sign_index": 1,
        "sign_content": null,
        "sign_at": "2026-02-16T06:05:44.000000Z",
        "earn_point": 2,
        "continuous_days": 1,
        "username": "soa",
        "avatar": null
    }
]
```

## 萝卜相关

### 可用萝卜

`GET /api/carrot/current`

返回（可用萝卜）：

```json
{
    "carrot": 600
}
```

### 变化记录

`GET /api/carrot/history?type=&user_id=`

# `type` 类型
- `earn` 获取
- `cost` 使用

# `expired_at` 过期时间

参数：`type`、`user_id`

返回（变化记录）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 3,
    "items": [
        {
            "trigger_type": "system_interest",
            "trigger_type_string": "系统手续费",
            "type": "cost",
            "point": 2,
            "expired_at": null,
            "created_at": "2026-01-25T14:16:27.000000Z"
        },
        {
            "trigger_type": "transfer",
            "trigger_type_string": "转增",
            "type": "earn",
            "point": 1,
            "expired_at": "2027-01-25",
            "created_at": "2026-01-25T14:00:37.000000Z"
        },
        {
            "trigger_type": "request_speed_video",
            "trigger_type_string": "加速求片",
            "type": "cost",
            "point": 10,
            "expired_at": null,
            "created_at": "2026-01-25T12:44:52.000000Z"
        }
    ]
}
```

### 转赠

`PUT /api/carrot/transfer`

```json5
{
    // 对方用户ID
    "user_id": "ewd3n7ex8s",
    // 萝卜数量 2到6000之间
    "carrot": 2
}
```

返回（转赠）：

```json
{
    "carrot": 1936
}
```

## 直播相关

### 媒体库

`GET /api/live/library`

返回（媒体库）：

```json
[
    {
        "id": 100,
        "title": "央视",
        "image_poster_url": null
    },
    {
        "id": 200,
        "title": "卫视",
        "image_poster_url": null
    },
    {
        "id": 300,
        "title": "地方",
        "image_poster_url": null
    },
    {
        "id": 900,
        "title": "未分类",
        "image_poster_url": null
    }
]
```

### 列表相关

#### 列表

`GET /api/live/list?library_id=100&code&title`

参数：`library_id`、`code`、`title`

返回（列表）：

```json
{
    "page": 1,
    "page_size": 2,
    "total": 18,
    "items": [
        {
            "id": 1101,
            "live_library_id": null,
            "code": "CCTV1",
            "title": "CCTV1",
            "description": null,
            "tagline": null,
            "image_poster_url": "https://files.emosstore.sbs/files/base/live/CCTV1.png",
            "sort": 1101,
            "is_can_edit": true,
            "media_count": 1,
            "updated_at": "2026-02-11T08:52:24.000000Z"
        },
        {
            "id": 1102,
            "live_library_id": null,
            "code": "CCTV2",
            "title": "CCTV2",
            "description": null,
            "tagline": null,
            "image_poster_url": "https://files.emosstore.sbs/files/base/live/CCTV2.png",
            "sort": 1102,
            "is_can_edit": true,
            "media_count": 0,
            "updated_at": "2026-02-11T08:52:24.000000Z"
        }
    ]
}
```

#### 新增或编辑

`POST /api/live/list`

如果存在 `code` 则为官方源 除图片外均可修改
返回值为 已添加的总数

```json5
{
    // 存在则更新
    "id": null,
    // 直播媒体库id 必填
    "live_library_id": 1,
    // 标题 必填
    "title": "啦啦",
    // 简介
    "description": null,
    // 宣传词
    "tagline": null,
    // 图片文件id
    "image_poster": "XNrvMYe2Mkxb"
}
```

返回（新增或编辑）：

```json
{
    "count": 1
}
```

#### 删除

`DELETE /api/live/list/{{live_list_id}}`

不可删除官方的直播

### 资源相关

#### 媒体列表

`GET /api/live/media?live_list_id={{live_list_id}}`

# `status` 值 系统内部用到 用户无法更改
- `normal` 正常
- `error` 错误

# `path_type` 目前固定为 `m3u8`

参数：`live_list_id`

返回（媒体列表）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 1,
    "items": [
        {
            "media_id": "ez6wnp4zjy1q",
            "name": "1080p",
            "path_type": "m3u8",
            "path_url": "http://43.251.226.89:8080/play/1.m3u8",
            "status": "normal",
            "pseudonym": "best-fan",
            "is_can_edit": true,
            "created_at": null
        }
    ]
}
```

#### 新增直播源

`POST /api/live/media`

```json5
{
    // 直播列表ID
    "live_list_id": {{live_list_id}},
    // 源名称
    "name": "三网直达1080p",
    "path_type": "m3u8",
    // m3u8地址
    "path_url": "http://emos.local/1080p.m3u8"
}
```

返回（新增直播源）：

```json
{
    "live_media_id": "lgqjrvnnwzxd",
    "carrot": 2
}
```

#### 删除直播源

`DELETE /api/live/media/{{live_media_id}}`

返回（删除直播源）：

```json
{
    "carrot": 1
}
```

#### 批量更新直播源

`POST /api/live/media/update`

外部接口用

```json5
{
    "live_list_id": {{live_list_id}},
    // 如果 medias 传空 则删除自己添加的所有源
    "medias": [
        {
            "name": "1080p",
            "path_type": "m3u8",
            "path_url": "http://emos.local/live.m3u8"
        },
        {
            "name": "720p",
            "path_type": "m3u8",
            "path_url": "http://emos.local/live3.m3u8"
        }
    ]
}
```

返回（批量更新直播源）：

```json
{
    "delete_count": 1
}
```

## 支付相关

### 申请成为服务商

`POST /api/pay/apply`

```json5
{
    // 必填 10字内
    "name": "名称",
    // 必填 200字内
    "description": "简介"
}
```

### 服务商信息

`GET /api/pay/base`

- `total_revenue` 总收入
- `total_expenditure` 总支出
- `status` 审核状态 
	- `review` 审核中
	- `pass` 通过

返回（服务商信息）：

```json
{
    "name": "名称",
    "description": "简介",
    "total_revenue": 0,
    "total_expenditure": 0,
    "notify_url": null,
    "status": "review"
}
```

### 更新服务商信息

`POST /api/pay/update`

只有审核通过的可以更改

```json5
{
    // 必填 10字内
    "name": "名称",
    // 必填 200字内
    "description": "简介",
    // 回调地址 可以公网访问的地址 可为空
    "notify_url": null
}
```

返回（更新服务商信息）：

```json
{
    "name": "名称",
    "description": "简介",
    "notify_url": null
}
```

### 转账给用户

`POST /api/pay/transfer`

类似于提现 退款等
费率为千6

- `deduct` 消耗萝卜
- `carrot` 剩余萝卜

```json5
{
    // 对方用户ID
    "user_id": "ewd3n7ex8s",
    // 萝卜数量 1到50000之间
    "carrot": 166
}
```

返回（转账给用户）：

```json
{
    "deduct": 166,
    "carrot": 781
}
```

### 创建订单

`POST /api/pay/create`

在网页支付时候可以手动将 `return_url` 拼接到地址后面
如 `https://emos.best/pay/20260215153614-pay-eA2rq?return_url=http://emos.local/to`
支付成功将会带订单号跳到此地址 `http://emos.local/to?no=20260215153614-pay-eA2rq`

```json5
{
    // 支付方式 telegram_bot tg机器人支付 或 web 网页版支付
    "pay_way": "telegram_bot",
    // 价格 1 到 50000 之间
    "price": 1,
    // 商品名称 简介等 100字符内
    "name": "充值啦啦啦",
    // 其他参数 回调时会返回的 40字符内 建议格式为 字母数字
    "param": null,
    // 支付结果通知bot 只对支付方式为tg机器人生效 存在时将会带参返回到对应bot
    "callback_telegram_bot_name": null
}
```

返回（网页支付）：

```json
{
    "no": "20260215153511-pay-5FTmJ",
    "pay_way": "web",
    "pay_url": "https://emos.best/pay/20260215153511-pay-5FTmJ",
    "expired": "2026-02-15T15:40:11"
}
```

返回（tg bot支付）：

```json
{
    "no": "20260221163718-pay-r9NUf",
    "pay_way": "telegram_bot",
    "pay_url": "https://t.me/emos_test_bot?start=pay_20260221163718-pay-r9NUf_emospg_bot",
    "expired": "2026-02-21 16:42:18"
}
```

### 查询订单

`GET /api/pay/query?no=20260215153614-pay-eA2rq`

订单从生成到最终状态时间为10分钟

参数：`no`

返回（查询订单）：

```json
{
    "no": "20260215153614-pay-eA2rq",
    "pay_way": "web",
    "pay_status": "default",
    "price_order": 1,
    "price_settle": 2,
    "order_name": "充值啦啦啦",
    "time_payed": null,
    "notify_status": "default"
}
```

### 关闭订单

`PUT /api/pay/close?no=20260215153614-pay-eA2rq`

只有首次会关闭成功

参数：`no`

返回（关闭订单）：

```json
{
    "is_close": false
}
```

### 测试回调

`POST /api/pay/testNotify`

返回（回调内容）：

```json
{
    "no": "20260215164037-pay-Ouu09",
    "time_payed": "2026-02-15 18:05:00",
    "price_settle": 2,
    // 回调次数
    "notify_number": 11
}
```

返回（测试回调）：

```json
{
    "notify_url": "https://emos.best"
}
```

### 查询用户可用萝卜

`GET /api/pay/getUserCarrot?user_id=ewd3n7ex8s`

参数：`user_id`

返回（查询用户可用萝卜）：

```json
{
    "carrot": 50468
}
```

### 查询用户信息

`GET /api/pay/getUserInfo?user_id=ewd3n7ex8s&username=&telegram_user_id=`

参数中 任意存在一个即可

参数：`user_id`、`username`、`telegram_user_id`

返回（查询用户信息）：

```json
{
    "user_id": "eWD3N7EX8s",
    "username": "soa",
    "avatar": null,
    "is_viewing": true,
    "invite_user_id": null,
    "size_upload": 0,
    "telegram_user_id": null,
    "is_disable": false,
    "created_at": "2026-01-16T16:06:35.000000Z"
}
```

### 给用户发送邮件通知

`POST /api/pay/sendNotifyEmail`

```json5
{
    "user_id": "ewd3n7ex8s",
    // 邮件主题 100字内
    "subject": "这是",
    // 邮件内容 6w字符内 格式为 text 或 html
    "body": "哈哈哈哈"
}
```

返回（给用户发送邮件通知）：

```json
{
    "carrot": -10
}
```

### 查询用户签到信息

`GET /api/pay/getUserSign?user_id=eXD3VD3Y1s`

参数：`user_id`

返回（有过签到）：

```json
{
    "sign_index": 2,
    "sign_at": "2026-09-19 14:11:37",
    "earn_point": 4,
    "continuous_days": 1,
    "content": null
}
```

## 商城相关

### 商户

#### 基本信息

`GET /api/shop/seller/base?seller_id`

商户状态

- `default` 默认
- `examine` 审核中
- `pass` 通过
- `disable` 禁用

参数：`seller_id`

返回（有数据时）：

```json
{
    "seller_id": 1000,
    "cover": null,
    "cover_url": null,
    "name": "我的小店",
    "description": "专卖啦啦啦",
    "status": "examine",
    "is_self": true
}
```

返回（无数据时）：

```json
{
    "status": "default"
}
```

#### 更新信息

`POST /api/shop/seller/update`

```json5
{
    // 店铺名称 30字内
    "name": "我的小店",
    // 店铺简介 200字内
    "description": "专卖啦啦啦",
    // 店铺封面 图片地址
    "cover_url": null
}
```

返回（更新信息）：

```json
{
    "name": "我的小店",
    "description": "专卖啦啦啦",
    "cover": "bqOaKbRKeQNn",
    "cover_url": "https://emos.local/files/test/33437808-6fed-4478-aace-8ca95a5ca162.png"
}
```

#### 申请成为商户

`POST /api/shop/seller/apply`

```json5
{
    // 店铺名称 30字内
    "name": "我的小店",
    // 店铺简介 200字内
    "description": "专卖啦啦啦"
}
```

### 分类

#### 列表

`GET /api/shop/category/list?seller_id=1000`

参数：`seller_id`

返回（列表）：

```json
[
    {
        "category_id": 1000,
        "name": "分类1",
        "sort": 80
    }
]
```

#### 新增

`POST /api/shop/category/create`

```json5
{
    // 分类名称 20字内
    "name": "分类1",
    // 排序 越小余额靠前 1 到 100
    "sort": 80
}
```

返回（新增）：

```json
{
    "category_id": 1000
}
```

#### 删除

`DELETE /api/shop/category/delete?category_id=1000`

参数：`category_id`

#### 修改排序

`PUT /api/shop/category/sort`

```json5
{
    "category_id": 1000,
    "sort": 80
}
```

返回（移动排序）：

```json
{
    "sort": 80
}
```

### 商品

#### 商品列表

`GET /api/shop/product/list?seller_id=1000&category_id=1000&name&sort_by=sort&sort_order=asc&is_up=1`

参数：`seller_id`、`category_id`、`name`、`sort_by`、`sort_order`、`is_up`

返回（商品列表）：

```json
{
    "page": 1,
    "page_size": 10,
    "total": 2,
    "items": [
        {
            "product_id": 1000,
            "category_id": 1000,
            "cover_url": null,
            "name": "苹果",
            "price": 100,
            "price_origin": 1000,
            "stock": 99,
            "sales": 2,
            "is_up": true,
            "up_time": "2026-03-31 00:20:33",
            "time_start": "2026-02-28 12:12:12",
            "time_end": "2026-06-28 14:14:14",
            "user_buy_max": null,
            "sort": 80,
            "updated_at": "2026-03-30T16:22:43.000000Z"
        },
        {
            "product_id": 1001,
            "category_id": 1000,
            "cover_url": null,
            "name": "苹果1",
            "price": 100,
            "price_origin": 1000,
            "stock": 100,
            "sales": 0,
            "is_up": true,
            "up_time": "2026-03-31 00:31:45",
            "time_start": "2026-02-28 12:12:12",
            "time_end": "2026-02-28 14:14:14",
            "user_buy_max": null,
            "sort": 80,
            "updated_at": "2026-03-30T16:31:52.000000Z"
        }
    ]
}
```

#### 商品详情

`GET /api/shop/product/info?product_id=1000`

参数：`product_id`

返回（商品详情）：

```json
{
    "seller": {
        "seller_id": 1000,
        "name": "我的小店",
        "description": "专卖啦啦啦",
        "cover_url": null
    },
    "product_id": 1000,
    "category_id": 1000,
    "category_name": "分类1",
    "cover": null,
    "cover_url": null,
    "name": "苹果1",
    "description": "好吃又大的大苹果",
    "exchange_way": "购买后自提",
    "price": null,
    "price_origin": 1000,
    "stock": 100,
    "is_up": false,
    "up_time": "2026-02-28 19:45:13",
    "time_start": "2026-02-28 12:12:12",
    "time_end": "2026-02-28 14:14:14",
    "sort": 80,
    "updated_at": "2026-02-28T11:45:13.000000Z",
    "sales": 0
}
```

#### 新增或编辑商品

`POST /api/shop/product/createOrUpdate`

```json5
{
    // 商品ID 存在则编辑
    "product_id": null,
    // 商品分类 必填
    "category_id": 1000,
    // 封面图 文件url
    "cover_url": null,
    // 商品名 50字内 必填
    "name": "苹果",
    // 商品简介 200字内
    "description": "好吃又大的大苹果",
    // 兑换方式 1000字内
    "exchange_way": "购买后自提",
    // 价格 1 - 5w 必填
    "price": 100,
    // 原价 1 - 5w
    "price_origin": 1000,
    // 库存 1 - 5k 必填
    "stock": 100,
    // 是否上架
    "is_up": true,
    // 开售时间
    "time_start": "2026-02-28 12:12:12",
    // 停售时间
    "time_end": "2026-02-28 14:14:14",
    // 排序 1 - 5k 必填
    "sort": 80


}
```

返回（新增或编辑商品）：

```json
{
    "product_id": 1000
}
```

#### 删除商品

`DELETE /api/shop/product/delete?product_id=1000`

参数：`product_id`

#### 修改分类

`PUT /api/shop/product/category?product_id=1000&category_id=1000`

参数：`product_id`、`category_id`

返回（修改分类）：

```json
{
    "category_id": 1000
}
```

#### 修改排序

`PUT /api/shop/product/sort?product_id=1000&sort=80`

参数：`product_id`、`sort`

返回（修改排序）：

```json
{
    "sort": 80
}
```

#### 上下架

`PUT /api/shop/product/up?product_id=1000`

参数：`product_id`

返回（上下架）：

```json
{
    "is_up": false
}
```

### 订单

#### 用户层面

#### 下单

`POST /api/shop/order/user/create`

```json5
{
    "product_id": 1000,
    // 购买数量 1 - 230 之间
    "buy_number": 2,
    // 备注 100字内
    "remark": null
}
```

返回（下单）：

```json
{
    "no": "20260331015014shopF0G3D",
    "buy_number": 2,
    "price": 200,
    "expired": "2026-03-31 02:00:14"
}
```

#### 支付

`POST /api/shop/order/user/pay`

```json5
{
    "order_no": "20260331015014shopF0G3D"
}
```

返回（支付）：

```json
{
    "message": "支付成功"
}
```

#### 订单列表

`GET /api/shop/order/user/list?seller_id&product_id&order_title&order_no&is_pay&is_delivery`

参数：`seller_id`、`product_id`、`order_title`、`order_no`、`is_pay`、`is_delivery`

返回（订单列表）：

```json
{
    "page": 1,
    "page_size": 10,
    "total": 2,
    "items": [
        {
            "seller": {
                "seller_id": 1000,
                "name": "我的小店",
                "cover_url": null
            },
            "product": {
                "id": 1000,
                "description": "好吃又大的大苹果",
                "exchange_way": "购买后自提"
            },
            "order_no": "20260228215154shopyLwcZ",
            "product_id": 1000,
            "price_order": 100,
            "order_title": "苹果1",
            "order_cover_url": null,
            "status_pay": "paid",
            "urge_number": 7,
            "buy_number": 2,
            "time_pay": "2026-02-28 21:51:58",
            "time_delivery": null,
            "time_urge": "2026-02-28 22:03:17",
            "remark_shop": null,
            "remark_user": null,
            "created_at": "2026-02-28T13:51:54.000000Z"
        },
        {
            "seller": {
                "seller_id": 1000,
                "name": "我的小店",
                "cover_url": null
            },
            "product": {
                "id": 1000,
                "description": "好吃又大的大苹果",
                "exchange_way": "购买后自提"
            },
            "order_no": "20260228212058shop0uOFb",
            "product_id": 1000,
            "price_order": 100,
            "order_title": "苹果1",
            "order_cover_url": null,
            "status_pay": "unpaid",
            "urge_number": null,
            "buy_number": 1,
            "time_pay": null,
            "time_delivery": null,
            "time_urge": null,
            "remark_shop": null,
            "remark_user": null,
            "created_at": "2026-02-28T13:20:58.000000Z"
        }
    ]
}
```

#### 催发货

`PUT /api/shop/order/user/urge`

```json5
{
    "order_no": "20260228215154shopyLwcZ"
}
```

返回（催发货）：

```json
{
    "urge_number": 3
}
```

#### 关闭订单

`POST /api/shop/order/user/close`

```json5
{
    "order_no": "20260228212001shopU8muh"
}
```

#### 删除订单

`DELETE /api/shop/order/user/order?order_no=20260331012556shopgtRev`

参数：`order_no`

返回（删除订单）：

```json
{
    "is_delete": true
}
```

#### 商户层面

#### 订单列表

`GET /api/shop/order/shop/order?user_id&order_no&order_title&is_pay&is_delivery&product_id`

参数：`user_id`、`order_no`、`order_title`、`is_pay`、`is_delivery`、`product_id`

返回（订单列表）：

```json
{
    "page": 1,
    "page_size": 10,
    "total": 2,
    "items": [
        {
            "user": {
                "user_id": "eWD3N7EX8s",
                "username": "soa",
                "avatar": null
            },
            "order_no": "20260228215154shopyLwcZ",
            "product_id": 1000,
            "price_order": 100,
            "price_settle": 95,
            "order_title": "苹果1",
            "order_cover_url": null,
            "status_pay": "paid",
            "urge_number": 7,
            "buy_number": 2,
            "time_pay": "2026-02-28 21:51:58",
            "time_delivery": null,
            "time_urge": "2026-02-28 22:03:17",
            "remark_shop": null,
            "remark_user": null,
            "created_at": "2026-02-28T13:51:54.000000Z"
        },
        {
            "user": {
                "user_id": "eWD3N7EX8s",
                "username": "soa",
                "avatar": null
            },
            "order_no": "20260228212058shop0uOFb",
            "product_id": 1000,
            "price_order": 100,
            "price_settle": 95,
            "order_title": "苹果1",
            "order_cover_url": null,
            "status_pay": "unpaid",
            "urge_number": null,
            "buy_number": 1,
            "time_pay": null,
            "time_delivery": null,
            "time_urge": null,
            "remark_shop": null,
            "remark_user": null,
            "created_at": "2026-02-28T13:20:58.000000Z"
        }
    ]
}
```

#### 更新发货状态

`PUT /api/shop/order/shop/delivery`

```json5
{
    "order_no": "20260331002243shopwHRpa",
    // 是否发货
    "is_delivery": true
}
```

返回（更新发货状态）：

```json
{
    "time_delivery": "2026-03-31 00:24:36"
}
```

#### 更新备注

`POST /api/shop/order/shop/remark`

```json5
{
    "order_no": "20260331002243shopwHRpa",
    // 订单备注 200字内
    "remark": "啦啦啦"
}
```

#### 删除订单

`DELETE /api/shop/order/shop/order?order_no=20260331012556shopgtRev`

参数：`order_no`

返回（删除订单）：

```json
{
    "is_delete": false
}
```

## 红包相关

### 发红包

`POST /api/redPacket/create`

封面图相同的话 建议把 `file_id` 保存起来

```json5
{
	// 红包类型 必填
	// default 普通
	// password 口令
	"type": "default",
	// 领取类型 必填
	// average 均分模式 红包总金额 / 可领人数
	// random 随机模式 每人至少可以领取1
	"receive": "average",
	// 红包总金额 1 - 60000 萝卜 必填
	"carrot": 2,
	// 可领人数 1 - 10000 人 必填
	"number": 2,
	// 寄语 50子内 必填
	"blessing": "新年快乐",
	// 字符串 区分大小写 1-50字符内 口令或专属时必填
	"text": null,
	// 文件访问url 图片类型建议小于1m
	// "file_url": "https://image.tmdb.org/t/p/w500/hew9LSQW4wk63aN1Z7cEBTISL9B.jpg",
	// 文件类型 如果存在 file_id 或 file_url 则必填 决定了红包的类型 支持 image audio
	// "file_type": "image",
	// 独占模式 存在file_url并且为true时bot只会显示文件内容 默认为 false
	"is_exclusive": true,
	// 过期时间 60秒 - 48小时 默认为24小时 单位秒
	"seconds": 120
}
```

返回（发红包）：

```json
{
    "red_packet_id": "BLJg3EDpYAno"
}
```

### 红包领取记录

`GET /api/redPacket/receive?red_packet_id=BLJg3EDpYAno`

参数：`red_packet_id`

返回（红包领取记录）：

```json
{
    "page": 1,
    "page_size": 15,
    "total": 1,
    "items": [
        {
            "user_id": "eQP312ER4s",
            "username": "user_i",
            "avatar": null,
            "carrot": 12,
            "receive_at": "2026-02-16T21:01:31.000000Z"
        }
    ]
}
```

### 在 telegram 发 html 格式红包

`POST /api/redPacket/createTelegramHtml`

telegram 可用 html 标签列表

https://core.telegram.org/bots/api#rich-html-style

图片视频等 均采用外链 https 类型地址 端口不支持自定义

如果发送失败 会吞红包 等待有效期结束会自动退款

其余参数和 发红包相同

```json5
{
    // 红包类型 必填
    "type": "default",
    // 领取类型 必填
    "receive": "average",
    // 红包总金额 1 - 60000 萝卜 必填
    "carrot": 2,
    // 可领人数 1 - 10000 人 必填
    "number": 2,
    // 字符串 区分大小写 1-50字符内 口令或专属时必填
    "password": null,
    // 过期时间 60秒 - 48小时 默认为24小时 单位秒
    "seconds": 120,
    // html 内容 6000字符内
    "html": "啦啦啦啦<br><h1>asdf</h1><img src=\"https://telegram.org/example/photo.jpg\"></img><hr /><audio src=\"https://telegram.org/example/audio.ogg\"></audio><video src=\"https://telegram.org/example/video.mp4\" tg-spoiler></video>"
}
```

返回（在 telegram 发 html 格式红包）：

```json
{
    "red_packet_id": "vkQN8d6jYJqD"
}
```

## Telegram相关

### 投票

#### 创建投票

`POST /api/telegram/vote/create`

```json5
{
    // 问题名称 100字内
    "question": "问题啦啦",
    // 问题简介 200字内
    "description": "嘿嘿嘿",
    // 选项 2-12内
    "options": [
        "帅",
        "不帅",
        "帅啊帅"
    ],
    // 过期时间 最低60
    "seconds": 120,
    // 是否允许撤回
    "allows_revoting": false,
    // 是否投票结束后才公布答案
    "hide_results_until_closes": true
}
```

返回（创建投票）：

```json
{
    "vote_id": 1,
    "time_end": "2026-02-24T08:28:52.971000Z"
}
```

#### 查看投票结果

`GET /api/telegram/vote/result?vote_id=4`

只可以查看已结束的投票

参数：`vote_id`

返回（查看投票结果）：

```json
{
    "vote_id": "4",
    "question": "Test",
    "options": [
        "Test",
        "不Test"
    ],
    "time_start": "2026-04-05 03:58:43",
    "time_end": "2026-04-05 03:59:43",
    "users": [
        {
            "index": 1,
            "option_index": "0",
            "user_id": "e7E6K6OE4s",
            "username": "elephant",
            "avatar": "https://account.somebyte.org/files/account/2026/02/14/19/b54bc760-5b6f-4279-83e1-baec39a556bf.jpeg",
            "telegram_id": null
        },
        {
            "index": 2,
            "option_index": "1",
            "user_id": "eG90JRDERs",
            "username": "qiuyue",
            "avatar": "https://account.somebyte.org/files/account/2026/01/18/18/18c1234b-2244-4676-9194-19e890e6bbc9.jpg",
            "telegram_id": null
        },
        {
            "index": 3,
            "option_index": "0",
            "user_id": "eX356PPE0s",
            "username": "kong",
            "avatar": null,
            "telegram_id": null
        },
        {
            "index": 4,
            "option_index": "0",
            "user_id": "eK982YN9Ms",
            "username": "eveod",
            "avatar": null,
            "telegram_id": null
        }
    ]
}
```

## 抽奖相关

### 创建抽奖

`POST /api/lottery/create`

```json5
{
    // 抽奖名称 50字符内
    "name": "大奖啊",
    // 抽奖简介 200字符内
    "description": "感谢xxx提供至此",
    // 开始抽奖时间
    "time_start": "2026-03-03 15:50:20",
    // 结束抽奖时间 一周内 不管人数有没有达到 在这个时间都会开奖
    "time_end": "2026-03-08 14:20:32",
    // 参加时需要付的萝卜总数 1 - 5w
    "amount": 2,
    // 总人数  0 - 5k 存在则是人数开奖模式 不然为时间开奖
    "number": 0,
    // 参加时需达到的萝卜数 1 - 5w
    "rule_carrot": 0,
    // 参加时需达到的签到天数 1 - 5k
    "rule_sign": 0,
    // 奖品列表 1 - 20 之间
    "prizes": [
        {
            // 奖品名称 50字符内
            "name": "奖品1",
            // 奖品简介 200字符内
            "description": "兑奖请联系xxx",
            // 奖品数量 1 - 100
            "number": 2,
            // 自动发奖的内容 存在时需和奖品数量对应
            "bodys": [
                "奖品1xxx",
                "奖品2xxx"
            ]
        },
        {
            "name": "奖品2",
            "description": null,
            "number": 1
        }
    ]
}
```

返回（创建抽奖）：

```json
{
    "lottery_id": "4zwLEpq8P2r1"
}
```

### 查看中奖列表

`GET /api/lottery/win?lottery_id=4zwLEpq8P2r1`

参数：`lottery_id`

返回（查看中奖列表）：

```json
{
    "lottery_name": "大奖啊",
    "lottery_description": "感谢xxx提供至此",
    "time_start": "2026-03-03 15:50:20",
    "time_end": "2026-03-04 14:20:32",
    "amount": 2,
    "number": 2,
    "users": [
        {
            "user_id": "eOEOD2N94s",
            "user_username": "jason",
            "user_avatar": null,
            "prize_name": "奖品1",
            "prize_description": "兑奖请联系xxx",
            "join_index": 1,
            "join_at": "2026-03-03 22:40:07",
            "prize_body": null
        },
        {
            "user_id": "eWD3N7EX8s",
            "user_username": "soa",
            "user_avatar": null,
            "prize_name": "奖品1",
            "prize_description": "兑奖请联系xxx",
            "join_index": 2,
            "join_at": "2026-03-03 22:40:22",
            "prize_body": null
        }
    ]
}
```

### 取消抽奖

`PUT /api/lottery/cancel?lottery_id=4zwLEpq8P2r1`

参数：`lottery_id`

返回（取消抽奖）：

```json
{
    "is_success": false
}
```

### 手动开奖

`PUT /api/lottery/stop?lottery_id=4zwLEpq8P2r1`

参数：`lottery_id`

## 封禁相关

### 封禁列表

`GET /api/ban/list`

只显示最近一周的数据
如果不在此列表 可直接调用解封接口解封

返回（封禁列表）：

```json
[
    {
        "user_id": "e0E4MKO96s",
        "username": "dajun7095",
        "avatar": null,
        "invite_user_id": "eK98JXQ9Ms",
        "invite_pseudonym": "咸鱼翻身计划",
        "invite_at": "2026-01-22 17:39:27",
        "telegram_user_id": "6181680957",
        "disable_reason": "250306 请求数异常",
        "created_at": "2026-01-21T15:27:08.000000Z"
    },
    {
        "user_id": "e6EJQR69Rs",
        "username": "lonicera",
        "avatar": null,
        "invite_user_id": "eK98JXQ9Ms",
        "invite_pseudonym": "咸鱼翻身计划",
        "invite_at": "2026-03-25 00:23:57",
        "telegram_user_id": "6301670071",
        "disable_reason": "2600404 请求数异常",
        "created_at": "2026-03-22T17:17:17.000000Z"
    },
    {
        "user_id": "eP311523Rs",
        "username": "pako",
        "avatar": null,
        "invite_user_id": "e0EWN4YERs",
        "invite_pseudonym": null,
        "invite_at": "2026-01-17 00:48:33",
        "telegram_user_id": "6172713750",
        "disable_reason": "2600405 疑似测速",
        "created_at": "2026-01-16T16:39:11.000000Z"
    },
    {
        "user_id": "eG3X6X29Ys",
        "username": "quanwuhui",
        "avatar": null,
        "invite_user_id": "eK3QNN03Ms",
        "invite_pseudonym": "刺猬兽",
        "invite_at": "2026-02-01 14:35:15",
        "telegram_user_id": "7878810837",
        "disable_reason": "2600405 请求数异常",
        "created_at": "2026-01-20T22:50:42.000000Z"
    }
]
```

### 更新状态

`PUT /api/ban/change?type=disable&user_id=e0E4MKO96s&reason=原因啊`

参数：`type`、`user_id`、`reason`

返回（更新状态）：

```json
{
    "carrot": -1
}
```

## 音乐相关(于261114停用)

### 其他

#### 收藏/取消收藏

`PUT /api/music/favorite?type=mp&value=1000`

支持 `歌手` `音乐` `专辑`

参数：`type`、`value`

返回（收藏/取消收藏）：

```json
{
    "is_favorite": true
}
```

#### 评分

`PUT /api/music/rating?type=mp&value=1000&rating=1`

参数：`type`、`value`、`rating`

返回（评分）：

```json
{
    "rating": null
}
```

#### 从todb同步数据

`PATCH /api/music/sync?type=mp&value=1001`

同步专辑时会自动同步专辑下所属音乐

建议以专辑的维度去同步

参数：`type`、`value`

返回（从todb同步数据）：

```json
{
    "type": "ma",
    "value": "1000"
}
```

#### 用spotify歌手去todb同步数据

`PATCH /api/music/syncSpotifyArtist`

```json5
{
    // https://open.spotify.com/artist/64NFGuC9PjqtNyJqnnTXh5
    "artist_id": "64NFGuC9PjqtNyJqnnTXh5"
}
```

### 歌手

#### 歌手列表

`GET /api/music/person/list?person_id&name`

参数：`person_id`、`name`

返回（歌手列表）：

```json
{
    "page": 1,
    "page_size": 5,
    "total": 1,
    "items": [
        {
            "person_id": 1000,
            "name": "a2",
            "original_name": null,
            "tagline": null,
            "biography": null,
            "birthday": null,
            "gender": null,
            "birthplace": null,
            "is_virtual": 1,
            "is_adult": false,
            "image_profile": null,
            "image_backdrop": null
        }
    ]
}
```

#### 歌手详情

`GET /`

### 音乐

#### 音乐搜索

`GET /api/music/song/search?name&has_media&person_id_artist&person_name_artist&is_headless`

参数：`name`、`has_media`、`person_id_artist`、`person_name_artist`、`is_headless`

返回（音乐搜索）：

```json
{
    "page": 1,
    "page_size": 5,
    "total": 4671,
    "items": [
        {
            "song_id": 1035,
            "todb_music_song_id": 1642,
            "name": "国色天香",
            "image_poster_url": null,
            "tagline": null,
            "has_media": true,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": null,
                    "name": "李玉刚",
                    "original_name": "李玉刚",
                    "image_profile_url": "https://image.theotherdb.org/original/adPQEW3nmXqK1qn9",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ]
        },
        {
            "song_id": 5896,
            "todb_music_song_id": 7648,
            "name": "Explosion",
            "image_poster_url": null,
            "tagline": null,
            "has_media": false,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": null,
                    "name": "久石让",
                    "original_name": "久石讓",
                    "image_profile_url": "https://image.theotherdb.org/original/w9X5eR24E9bWxylZ",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ]
        },
        {
            "song_id": 5895,
            "todb_music_song_id": 7649,
            "name": "EVE－Piano Version",
            "image_poster_url": null,
            "tagline": null,
            "has_media": false,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": null,
                    "name": "久石让",
                    "original_name": "久石讓",
                    "image_profile_url": "https://image.theotherdb.org/original/w9X5eR24E9bWxylZ",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ]
        },
        {
            "song_id": 5894,
            "todb_music_song_id": 7646,
            "name": "Cell",
            "image_poster_url": null,
            "tagline": null,
            "has_media": false,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": null,
                    "name": "久石让",
                    "original_name": "久石讓",
                    "image_profile_url": "https://image.theotherdb.org/original/w9X5eR24E9bWxylZ",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ]
        },
        {
            "song_id": 5893,
            "todb_music_song_id": 7650,
            "name": "Innocent - 映画「天空の城ラピュタ」より",
            "image_poster_url": null,
            "tagline": null,
            "has_media": false,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": null,
                    "name": "久石让",
                    "original_name": "久石讓",
                    "image_profile_url": "https://image.theotherdb.org/original/w9X5eR24E9bWxylZ",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ]
        }
    ]
}
```

#### 音乐列表

`GET /api/music/song/list?song_id&name&has_media&is_favorite=&is_rating&album_id=&person_id_artist=&person_name_artist&is_headless`

参数：`song_id`、`name`、`has_media`、`is_favorite`、`is_rating`、`album_id`、`person_id_artist`、`person_name_artist`、`is_headless`

返回（音乐列表）：

```json
{
    "page": 1,
    "page_size": 5,
    "total": 572,
    "items": [
        {
            "song_id": 1573,
            "todb_music_music_id": null,
            "name": "张三 - 小星星",
            "image_poster_url": null,
            "description": "张三",
            "tagline": null,
            "release_date": null,
            "duration": 189,
            "video_list_id": null,
            "rating": null,
            "rating_user": null,
            "has_media": true,
            "is_adult": false,
            "person_artists": [],
            "albums": [],
            "is_favorite": false,
            "count_medias": 0,
            "count_lryics": 0
        },
        {
            "song_id": 1005,
            "todb_music_music_id": 1005,
            "name": "七月的极光",
            "image_poster_url": null,
            "description": null,
            "tagline": null,
            "release_date": null,
            "duration": 193,
            "video_list_id": 1000,
            "rating": null,
            "rating_user": null,
            "has_media": true,
            "is_adult": null,
            "person_artists": [],
            "albums": [
                {
                    "todb_music_album_id": 1000,
                    "name": "太阳之子"
                }
            ],
            "is_favorite": false,
            "count_medias": 0,
            "count_lryics": 2
        },
        {
            "song_id": 1407,
            "todb_music_music_id": 1846,
            "name": "七号公园",
            "image_poster_url": null,
            "description": null,
            "tagline": null,
            "release_date": null,
            "duration": 214,
            "video_list_id": null,
            "rating": null,
            "rating_user": null,
            "has_media": false,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1000,
                    "name": "a2",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1195,
                    "name": "七号公园"
                }
            ],
            "is_favorite": false,
            "count_medias": 0,
            "count_lryics": 0
        },
        {
            "song_id": 1570,
            "todb_music_music_id": 1844,
            "name": "散场电影",
            "image_poster_url": null,
            "description": null,
            "tagline": null,
            "release_date": null,
            "duration": 215,
            "video_list_id": null,
            "rating": null,
            "rating_user": null,
            "has_media": false,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1193,
                    "name": "散场电影"
                }
            ],
            "is_favorite": false,
            "count_medias": 0,
            "count_lryics": 0
        },
        {
            "song_id": 1569,
            "todb_music_music_id": 1843,
            "name": "浅唱",
            "image_poster_url": null,
            "description": null,
            "tagline": null,
            "release_date": null,
            "duration": 246,
            "video_list_id": null,
            "rating": null,
            "rating_user": null,
            "has_media": false,
            "is_adult": null,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "albums": [
                {
                    "todb_music_album_id": 1192,
                    "name": "浅唱"
                }
            ],
            "is_favorite": false,
            "count_medias": 0,
            "count_lryics": 0
        }
    ]
}
```

#### 更新关联的视频ID

`PUT /api/music/song/{{music_song_id}}/updateVideoId?video_id={{video_id}}`

类似于 `MV`

参数：`video_id`

返回（更新关联的视频ID）：

```json
{
    "carrot": 1000
}
```

#### 删除音乐

`DELETE /api/music/song/{{music_song_id}}/delete`

只有管理可以删除群星的版本 如果是用户的话 删除自己的资源时会顺带删除歌曲

返回（删除音乐）：

```json
{
    "carrot": 1
}
```

#### 通过hash批量判断资源是否存在

`POST /api/music/song/batchHashExist`

采用 `sha256` 验证 需要转为小写

```json5
{
    "hashs": [
        "12f1193d8773fe556d34cd3f8b676d7489a76c5d59257155bfeb7d7a1244806f",
        "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    ]
}
```

返回（通过hash批量判断资源是否存在）：

```json
[
    {
        "media_id": "1pgnyxel9qyd",
        "music_song_id": 1908,
        "file_hash": "12f1193d8773fe556d34cd3f8b676d7489a76c5d59257155bfeb7d7a1244806f",
        "name": "sorakand 上传",
        "created_at": "2026-06-08T17:19:26.000000Z"
    }
]
```

#### 歌词

#### 歌词列表

`GET /api/music/song/{{music_song_id}}/lyric/list`

返回（歌词列表）：

```json
[
    {
        "lyric_id": 1,
        "type": "text",
        "language": "zh",
        "content": "抬頭的一片天 是男兒的一片天 曾經在滿天的星光下 做夢的少年 不知道天多高 不知道海多遠 卻發誓要帶著你 遠走到海角天邊",
        "name": "sorakand 提供",
        "created_at": "2026-05-22T15:46:26.000000Z",
        "user": {
            "user_id": "eXD3VD3Y1s",
            "username": "sorakand",
            "avatar": null
        }
    }
]
```

#### 创建歌词

`POST /api/music/song/{{music_song_id}}/lyric/create`

```json5
{
    // 均为必填
    // 歌词类型 text 纯文本 lrc 逐行 qrc 逐字
    "type": "text",
    // 语言 iso_639_1 格式
    "language": "zh-CN",
    // 内容
    "content": "抬頭的一片天 是男兒的一片天 曾經在滿天的星光下 做夢的少年 不知道天多高 不知道海多遠 卻發誓要帶著你 遠走到海角天邊"
}
```

返回（创建歌词）：

```json
{
    "lyric_id": 1,
    "carrot": 1
}
```

#### 删除歌词

`DELETE /api/music/song/{{music_song_id}}/lyric/delete?lyric_id=1`

参数：`lyric_id`

返回（删除歌词）：

```json
{
    "carrot": -1
}
```

#### 资源

#### 资源列表

`GET /api/music/song/{{music_song_id}}/media/list`

返回（资源列表）：

```json
[
    {
        "media_id": "2g598yxqwqzr",
        "file_suffix": "mp3",
        "file_type": "audio/mpeg",
        "file_size": 13767777,
        "file_hash": "9d052c2f54b48c48651ce5dd637dabf0a49844ef00a79fc631ca5af7e5869a55",
        "file_duration": 330,
        "file_metadata": {
            "album": "千と千寻の神隠し~ジブリ・コレクション α波オルゴール",
            "title": "いのちの名前",
            "artist": "久石譲",
            "year": null
        },
        "file_quality": "high",
        "meta_rate_bit": 320000,
        "meta_rate_sampling": 44100,
        "meta_bit_depth": 0,
        "meta_channel": 2,
        "path_type": "local_music_storage",
        "is_primary": false,
        "name": "sorakand 上传",
        "created_at": "2026-06-09T10:18:20.000000Z",
        "user": {
            "user_id": "eR3YJLQ3Ls",
            "username": "sorakand",
            "avatar": null
        }
    }
]
```

#### 删除资源

`DELETE /api/music/song/{{music_song_id}}/media/delete?media_id=x7zw5keew8r6&reason`

参数：`media_id`、`reason`

返回（删除资源）：

```json
{
    "carrot": -1
}
```

#### 获取播放地址

`GET /api/music/song/{{music_song_id}}/media/playUrl?media_id=ymqnzjo29z80`

参数：`media_id`

返回（获取播放地址）：

```json
{
    "url": "https://music.emosstore.sbs/files/test/8a7560a3-ac1d-4abb-97f3-1fad2c0d37ce.mp3"
}
```

#### 移动资源

`PUT /api/music/song/{{music_song_id}}/media/move?media_id=ymqnzjo29z80`

将资源移动到当前歌曲下

这里的 `music_song_id` 是目标歌曲ID

参数：`media_id`

返回（移动资源）：

```json
{
    "carrot": 1
}
```

### 专辑

#### 专辑列表

`GET /api/music/album/list?album_id&name&has_media&is_favorite&is_rating&person_id_artist&person_name_artist`

参数：`album_id`、`name`、`has_media`、`is_favorite`、`is_rating`、`person_id_artist`、`person_name_artist`

返回（专辑列表）：

```json
{
    "page": 1,
    "page_size": 5,
    "total": 127,
    "items": [
        {
            "album_id": 1000,
            "name": "太阳之子",
            "description": null,
            "image_poster_url": null,
            "image_background_url": null,
            "tagline": null,
            "release_date": "2026-03-24",
            "release_company": null,
            "video_list_id": null,
            "type": "album",
            "rating": null,
            "rating_user": null,
            "has_media": true,
            "person_artists": [
                {
                    "person_id": 1000,
                    "name": "周杰伦",
                    "original_name": "周杰倫",
                    "image_profile_url": "https://image.theotherdb.org/original/4w9X5eR2x5WxylZG",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "is_favorite": false,
            "count_song": 13
        },
        {
            "album_id": 1193,
            "name": "散场电影",
            "description": null,
            "image_poster_url": "https://image.theotherdb.org/w300/b056AmKroNWEj18e",
            "image_background_url": null,
            "tagline": null,
            "release_date": "2007-03-21",
            "release_company": null,
            "video_list_id": null,
            "type": "album",
            "rating": null,
            "rating_user": null,
            "has_media": false,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "is_favorite": false,
            "count_song": 1
        },
        {
            "album_id": 1192,
            "name": "浅唱",
            "description": null,
            "image_poster_url": "https://image.theotherdb.org/w300/0rDGwpKMZpWVMyb4",
            "image_background_url": null,
            "tagline": null,
            "release_date": "2007-03-21",
            "release_company": null,
            "video_list_id": null,
            "type": "album",
            "rating": null,
            "rating_user": null,
            "has_media": false,
            "person_artists": [
                {
                    "person_id": 1001,
                    "name": "许嵩",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "is_favorite": false,
            "count_song": 1
        },
        {
            "album_id": 1195,
            "name": "七号公园",
            "description": null,
            "image_poster_url": "https://image.theotherdb.org/w300/qrwGxEKP4OK7Dl91",
            "image_background_url": null,
            "tagline": null,
            "release_date": "2007-03-21",
            "release_company": null,
            "video_list_id": null,
            "type": "album",
            "rating": null,
            "rating_user": null,
            "has_media": false,
            "person_artists": [
                {
                    "person_id": 1000,
                    "name": "a2",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "is_favorite": false,
            "count_song": 1
        },
        {
            "album_id": 1194,
            "name": "摇头玩",
            "description": null,
            "image_poster_url": "https://image.theotherdb.org/w300/25De6mKGLBWrEv1Q",
            "image_background_url": null,
            "tagline": null,
            "release_date": "2007-03-21",
            "release_company": null,
            "video_list_id": null,
            "type": "album",
            "rating": null,
            "rating_user": null,
            "has_media": false,
            "person_artists": [
                {
                    "person_id": 1000,
                    "name": "a2",
                    "original_name": "許嵩",
                    "image_profile_url": "https://image.theotherdb.org/original/EXQdp7KwBmRMjB8N",
                    "gender": null,
                    "is_virtual": null,
                    "is_adult": null
                }
            ],
            "is_favorite": false,
            "count_song": 1
        }
    ]
}
```

#### 更新关联的视频ID

`PUT /api/music/album/{{music_alumb_id}}/updateVideoId?video_id={{video_id}}`

参数：`video_id`

返回（更新关联的视频ID）：

```json
{
    "carrot": 1
}
```

## 影院相关

### 随机影片

`GET /api/reel/rand`

### 影片信息

`GET /api/reel/info/{{forge_reel_uuid}}`

返回（影片信息）：

```json
{
    "todbv_id": 1028,
    "video_list_id": 1000,
    "video_type": "tv",
    "video_title": "千香",
    "video_runtime": null,
    "video_record": {
        "video_season_id": 1000,
        "season_number": 1,
        "season_title": "第 1 季",
        "video_episode_id": 1007,
        "episode_number": 8,
        "episode_title": "修远灵根尽毁众人前往青丘",
        "video_part_id": null,
        "part_number": null,
        "part_title": null,
        "media_id": "30yp1642nj82",
        "media_name": "1080p - 清单1 - sorakand 提1",
        "media_second": 8,
        "play_seconds": 0,
        "is_complete": false
    }
}
```

### 添加影片

`POST /api/reel/create`

```json5
{
    "video_list_id": {{video_id}}
}
```

返回（添加影片）：

```json
{
    "forge_reel_uuid": "0a6e3e35-4e13-4d4d-86d3-5e1ab828ecd3"
}
```

### 媒体列表

`GET /api/reel/media?video_list_id={{video_id}}&season_number=1&episode_number&part_number`

参数：`video_list_id`、`season_number`、`episode_number`、`part_number`

### 获取播放清单

`POST /api/reel/manifest`

```json5
{
    "media_id": "45rpvqdjok9j",
    // "media_id": "wq9oj2l2n7j3",
    "codecs": [
        "h265",
        "h264",
        "eac3",
        "aac"
    ]
}
```

### 更新播放进度

`POST /api/reel/progress`

```json5
{
    "media_id": "30yp1642nj82",
    // 只能为int 1为0.1倍 10 为 1倍数 20 = 2倍数
    "play_speed": 10,
    // 当前播放时长 秒
    "play_seconds": 0
}
```

## 基金相关

### 订单

#### 判断是否可以参与活动

`POST /api/fund/order/check`

```json5
{
    "fund_activity_code": "{{fund_activity_code}}"
}
```

返回（判断是否可以参与活动）：

```json
{
    "message": "活动仅可以参与 1 次"
}
```

#### 订单列表

`GET /api/fund/order/list`

返回（订单列表）：

```json
{
    "page": 1,
    "page_size": 6,
    "total": 1,
    "items": [
        {
            "activity_code": "anniv-1",
            "activity_name": "EMOS 一周年",
            "activity_description": null,
            "order_no": "20260814221653fundLKoR0",
            "order_title": "使用 100🥕 兑换最高 1¥ 补贴",
            "footprint_post_id": null,
            "order_bodys": null,
            "tier_name": "🍿 入场礼",
            "tier_description": "给每一个人留一张电影票",
            "tier_carrot": 100,
            "tier_price": 1,
            "time_expired": "2026-09-30 23:59:59",
            "payed_at": "2026-08-14 22:16:53",
            "payout_status": "default",
            "payout_status_string": "待提交",
            "payout_price": null,
            "payout_at": null
        }
    ]
}
```

#### 下单并支付

`POST /api/fund/order/create`

```json5
{
    "fund_activity_code": "{{fund_activity_code}}",
    "carrot": 100
}
```

返回（创建订单）：

```json
{
    "no": "20260814215236fundAJuVP"
}
```

#### 提交报销凭证

`POST /api/fund/order/evidence`

```json5
{
	"order_no": "20260815145709funduWCLH",
	"images": [],
	"remark": ""
}
```

返回（提交报销凭证）：

```json
{
    "payout_status": "reviewing"
}
```

## 悄悄话

### 发送

`POST /api/whisper/create`

```json5
{
    "receiver_user_id": "eXD3VPZ3Ys",
    // 最多5k
    "content": "内容",
    "is_anonymous": false
}
```

返回（发送）：

```json
{
    "whisper_id": 1001
}
```

### 发出的

`GET /api/whisper/sender`

返回（发出的）：

```json
[
    {
        "whisper_id": 1001,
        "sender_content": "内容",
        "sender_is_anonymous": false,
        "sender_at": "2026-09-23 11:34:44",
        "receiver_user": {
            "id": "eXD3VPZ3Ys",
            "username": "emos",
            "avatar": null
        },
        "receiver_content": null,
        "receiver_at": null
    },
    {
        "whisper_id": 1000,
        "sender_content": "内容",
        "sender_is_anonymous": true,
        "sender_at": "2026-09-23 11:33:34",
        "receiver_user": {
            "id": "eXD3VD3Y1s",
            "username": "soa",
            "avatar": null
        },
        "receiver_content": "内容",
        "receiver_at": "2026-09-23 11:53:43"
    }
]
```

### 收到的

`GET /api/whisper/receiver`

返回（收到的）：

```json
[
    {
        "whisper_id": 1002,
        "sender_content": "内容",
        "sender_at": "2026-09-23 11:55:51",
        "sender_user": {
            "id": "eXD3VD3Y1s",
            "username": "soa",
            "avatar": null
        },
        "receiver_content": null,
        "receiver_at": null
    },
    {
        "whisper_id": 1000,
        "sender_content": "内容",
        "sender_at": "2026-09-23 11:33:34",
        "sender_user": null,
        "receiver_content": "内容",
        "receiver_at": "2026-09-23 11:53:43"
    }
]
```

### 回复

`POST /api/whisper/reply`

```json5
{
	"whisper_id": 1000,
	"content": "内容"
}
```

返回（回复）：

```json
{
    "whisper_id": 1000
}
```
