# EMOS API 清单


## 登录相关

- `GET /link` ?uuid,name,url
- `GET /api/sign/check`

## 用户相关 / 我的服

- `GET /api/user/server/videoHistory`
- `POST /api/user/server/videoLogout`

## 用户相关 / 统计 / 视频类

- `GET /api/user/stats/video/history` ?dates[]

## 用户相关

- `GET /api/user/base`
- `GET /api/user`
- `PUT /api/user/showEmpty`
- `GET /`
- `PUT /api/user/pseudonym` ?name
- `PUT /api/user/agreeUploadAgreement`
- `PUT /api/user/sign` ?content
- `GET /api/user/passwordTemporary`
- `PUT /api/user/passwordReset` ?password

## 邀请相关

- `POST /api/invite`
- `GET /api/invite/info`
- `GET /api/invite/history` ?username,page_size,user_id,page,telegram_user_id
- `POST /api/invite/revoke`
    - body keys: user_id
- `POST /api/invite/exit`
- `POST /api/invite/emps`
- `PUT /api/invite/remark`
    - body keys: user_id, remark
- `GET /api/invite/tree`

## 上传相关 / 视频

- `GET /api/upload/video/recognize` ?file_name,provider
- `GET /api/upload/video/base` ?item_type,item_id
- `POST /api/upload/video/save`
    - body keys: item_type, item_id, file_id
- `POST /api/upload/video/saveInternal`

## 上传相关 / 字幕

- `POST /api/upload/subtitle/save`
    - body keys: item_type, item_id, file_id

## 上传相关 / 图片

- `GET /api/upload/image/list` ?name,date
- `DELETE /api/upload/image/delete` ?file_id

## 上传相关 / 音乐

- `POST /api/upload/music/save`
- `POST /api/upload/music/saveHeadless`

## 上传相关 / 分片上传

- `POST /api/upload/multipart/{{file_id}}/presign`
- `PUT /xxxx`
- `POST /api/upload/multipart/{{file_id}}/complete`
    - body keys: parts
- `DELETE /api/upload/multipart/{{file_id}}/abort`

## 上传相关 / 储存

- `GET /api/upload/store/disk`
- `GET /api/upload/store/file` ?path_type
- `POST /api/upload/store/archive`

## 上传相关

- `POST /api/upload/getUploadToken`

## 视频相关 / 资源相关

- `GET /api/video/media/list` ?video_list_id,video_season_id,video_episode_id,video_part_id,include_metadata,include_delete
- `GET /api/video/media/listAll` ?media_id,user_id,status,only_delete,include_metadata
- `DELETE /api/video/media/delete`
- `PUT /api/video/media/restore`
    - body keys: media_id
- `PUT /api/video/media/move` ?media_id,item_type,item_id
- `PUT /api/video/media/rename` ?media_id,name
- `GET /api/video/media/playUrl` ?media_id
- `PUT /api/video/media/syncMetadata` ?media_id

## 视频相关 / 字幕相关

- `GET /api/video/subtitle/list` ?video_list_id,video_episode_id,video_part_id,media_id
- `DELETE /api/video/subtitle/delete`
- `PUT /api/video/subtitle/rename` ?subtitle_id,title

## 视频相关 / 观影记录

- `GET /api/video/record/request` ?user_id
- `GET /api/video/record/list`
- `PUT /api/video/record/change` ?mode,type,id

## 视频相关

- `PATCH /api/video/sync` ?tmdb_id,todb_id
- `GET /api/video/tree` ?type,title,tmdb_id,todb_id,video_id
- `GET /api/video/getVideoId` ?video_id_type,video_id_value,season_number,episode_number,tmdb_type
- `GET /api/video/list` ?tmdb_id,todb_id,video_id,type,title,only_delete,with_media,page,page_size
- `GET /api/video/search` ?last_id,tmdb_id,todb_id,video_id,type,title,with_genre,sort_by,page,page_size
- `PUT /api/video/{{video_id}}/delete`
- `GET /api/video/{{video_id}}/season`
- `GET /api/video/{{video_id}}/episode` ?season_number,with_seek,with_seek_is_request
- `GET /api/video/persons` ?video_list_id,video_season_id,video_episode_id

## 片单相关 / 视频类

- `GET /api/watch/{{watch_id}}/video` ?video_title
- `GET /api/watch/{{watch_id}}/video/search` ?title,type
- `POST /api/watch/{{watch_id}}/video/{{video_id}}`
- `DELETE /api/watch/{{watch_id}}/video/{{video_id}}`
- `DELETE /api/watch/{{watch_id}}/video/empty`
- `POST /api/watch/{{watch_id}}/video/update`

## 片单相关 / 音乐类

- `GET /api/watch/{{watch_id}}/music` ?song_title
- `GET /api/watch/{{watch_id}}/music/search` ?song_title
- `POST /api/watch/{{watch_id}}/music/{{music_song_id}}`
- `DELETE /api/watch/{{watch_id}}/music/{{music_song_id}}`
- `DELETE /api/watch/{{watch_id}}/music/empty`

## 片单相关

- `POST /api/watch/slot`
- `GET /api/watch` ?watch_id,type,name,author_id,author_username,is_public,is_self,is_subscribe
- `POST /api/watch`
- `PUT /api/watch/{{watch_id}}/maintainer`
- `DELETE /api/watch/{{watch_id}}`
- `PUT /api/watch/{{watch_id}}/sort` ?sort
- `PUT /api/watch/{{watch_id}}/show`
- `GET /api/watch/{{watch_id}}/user`
- `PUT /api/watch/{{watch_id}}/subscribe` ?sort
- `PUT /api/watch/{{watch_id}}/dynamic`

## 反代相关 / 线路相关

- `GET /api/proxy/line` ?only_self
- `POST /api/proxy/line`
- `DELETE /api/proxy/line` ?id

## 求片相关

- `POST /api/seek`
- `GET /api/seek/poll` ?last_id,page_size
- `PUT /api/seek/apply` ?item_type,item_id
- `GET /api/seek/query` ?seek_id
- `GET /api/seek/history` ?seek_id,video_list_id,video_season_id,video_episode_id
- `PUT /api/seek/claim`
- `PUT /api/seek/urge`

## 榜单相关

- `GET /api/rank/carrot`
- `GET /api/rank/upload`
- `GET /api/rank/userVideoRecordPlaying`
- `GET /api/rank/userLiveRecordPlaying`
- `GET /api/rank/sign`

## 萝卜相关

- `GET /api/carrot/current`
- `GET /api/carrot/history` ?type,user_id
- `PUT /api/carrot/transfer`

## 直播相关 / 列表相关

- `GET /api/live/list` ?library_id,code,title
- `POST /api/live/list`
- `DELETE /api/live/list/{{live_list_id}}`

## 直播相关 / 资源相关

- `GET /api/live/media` ?live_list_id
- `POST /api/live/media`
- `DELETE /api/live/media/{{live_media_id}}`
- `POST /api/live/media/update`

## 直播相关

- `GET /api/live/library`

## 支付相关

- `POST /api/pay/apply`
- `GET /api/pay/base`
- `POST /api/pay/update`
- `POST /api/pay/transfer`
- `POST /api/pay/create`
- `GET /api/pay/query` ?no
- `PUT /api/pay/close` ?no
- `POST /api/pay/testNotify`
- `GET /api/pay/getUserCarrot` ?user_id
- `GET /api/pay/getUserInfo` ?user_id,username,telegram_user_id
- `POST /api/pay/sendNotifyEmail`
- `GET /api/pay/getUserSign` ?user_id

## 商城相关 / 商户

- `GET /api/shop/seller/base` ?seller_id
- `POST /api/shop/seller/update`
- `POST /api/shop/seller/apply`

## 商城相关 / 分类

- `GET /api/shop/category/list` ?seller_id
- `POST /api/shop/category/create`
- `DELETE /api/shop/category/delete` ?category_id
- `PUT /api/shop/category/sort`
    - body keys: category_id, sort

## 商城相关 / 商品

- `GET /api/shop/product/list` ?seller_id,category_id,name,sort_by,sort_order,is_up
- `GET /api/shop/product/info` ?product_id
- `POST /api/shop/product/createOrUpdate`
- `DELETE /api/shop/product/delete` ?product_id
- `PUT /api/shop/product/category` ?product_id,category_id
- `PUT /api/shop/product/sort` ?product_id,sort
- `PUT /api/shop/product/up` ?product_id

## 商城相关 / 订单 / 用户层面

- `POST /api/shop/order/user/create`
- `POST /api/shop/order/user/pay`
    - body keys: order_no
- `GET /api/shop/order/user/list` ?seller_id,product_id,order_title,order_no,is_pay,is_delivery
- `PUT /api/shop/order/user/urge`
    - body keys: order_no
- `POST /api/shop/order/user/close`
    - body keys: order_no
- `DELETE /api/shop/order/user/order` ?order_no

## 商城相关 / 订单 / 商户层面

- `GET /api/shop/order/shop/order` ?user_id,order_no,order_title,is_pay,is_delivery,product_id
- `PUT /api/shop/order/shop/delivery`
- `POST /api/shop/order/shop/remark`
- `DELETE /api/shop/order/shop/order` ?order_no

## 红包相关

- `POST /api/redPacket/create`
- `GET /api/redPacket/receive` ?red_packet_id
- `POST /api/redPacket/createTelegramHtml`

## Telegram相关 / 投票

- `POST /api/telegram/vote/create`
- `GET /api/telegram/vote/result` ?vote_id

## 抽奖相关

- `POST /api/lottery/create`
- `GET /api/lottery/win` ?lottery_id
- `PUT /api/lottery/cancel` ?lottery_id
- `PUT /api/lottery/stop` ?lottery_id

## 封禁相关

- `GET /api/ban/list`
- `PUT /api/ban/change` ?type,user_id,reason

## 音乐相关 / 其他

- `PUT /api/music/favorite` ?type,value
- `PUT /api/music/rating` ?type,value,rating
- `PATCH /api/music/sync` ?type,value
- `PATCH /api/music/syncSpotifyArtist`

## 音乐相关 / 歌手

- `GET /api/music/person/list` ?person_id,name
- `GET /`

## 音乐相关 / 音乐 / 歌词

- `GET /api/music/song/{{music_song_id}}/lyric/list`
- `POST /api/music/song/{{music_song_id}}/lyric/create`
- `DELETE /api/music/song/{{music_song_id}}/lyric/delete` ?lyric_id

## 音乐相关 / 音乐 / 资源

- `GET /api/music/song/{{music_song_id}}/media/list`
- `DELETE /api/music/song/{{music_song_id}}/media/delete` ?media_id,reason
- `GET /api/music/song/{{music_song_id}}/media/playUrl` ?media_id
- `PUT /api/music/song/{{music_song_id}}/media/move` ?media_id

## 音乐相关 / 音乐

- `GET /api/music/song/search` ?name,has_media,person_id_artist,person_name_artist,is_headless
- `GET /api/music/song/list` ?song_id,name,has_media,is_favorite,is_rating,album_id,person_id_artist,person_name_artist,is_headless
- `PUT /api/music/song/{{music_song_id}}/updateVideoId` ?video_id
- `DELETE /api/music/song/{{music_song_id}}/delete`
- `POST /api/music/song/batchHashExist`
    - body keys: hashs

## 音乐相关 / 专辑

- `GET /api/music/album/list` ?album_id,name,has_media,is_favorite,is_rating,person_id_artist,person_name_artist
- `PUT /api/music/album/{{music_alumb_id}}/updateVideoId` ?video_id

## 影院相关

- `GET /api/reel/rand`
- `GET /api/reel/info/{{forge_reel_uuid}}`
- `POST /api/reel/create`
- `GET /api/reel/media` ?video_list_id,season_number,episode_number,part_number
- `POST /api/reel/manifest`
- `POST /api/reel/progress`

## 基金相关 / 订单

- `POST /api/fund/order/check`
    - body keys: fund_activity_code
- `GET /api/fund/order/list`
- `POST /api/fund/order/create`
    - body keys: fund_activity_code, carrot
- `POST /api/fund/order/evidence`
    - body keys: order_no, images, remark

## 悄悄话

- `POST /api/whisper/create`
- `GET /api/whisper/sender`
- `GET /api/whisper/receiver`
- `POST /api/whisper/reply`
    - body keys: whisper_id, content
