### GET /api/sign/check
{is_sign:bool:True, user_id:str:eWD3N7EX8s}

### GET /api/user/server/videoHistory
[{device_client:str:Yamby, device_name:str:Xiaomi-AAA, device_id:str(f347ffda-94d1-4afa-8…), device_version:str:2.0.2.2, last_used_at:str:2026-04-04 05:08:17}]

### POST /api/user/server/videoLogout
{logout_count:int:1}

### GET /api/user/stats/video/history
[{date:str:2026-08-02, time_start:str:11:20:50, time_end:str:11:47:50, video_watch_second_real:int:1622, video_watch_second_content:int:2257, video_id:int:106399, todbv_id:int:94316, video_type:str:tv, video_title:str:九门, season_number:int:1, episode_number:int:7, media_name:str(4K - h265 - 60fps - …), media_file_size:int:1179524097, media_file_second:int:2668}]

### GET /api/user/base
{user_id:str:eXD3VD3Y1s, username:str:soa, avatar:NoneType:None}

### GET /api/user
{server_video:str:https://video.emos.best, server_live:NoneType:None, server_music:NoneType:None, telegram_group_url:str:https://t.me/emospg, telegram_bind_url:str(https://t.me/emos_te…), telegram_user_id:NoneType:None, user_id:str:eXD3VD3Y1s, username:str:sorakand, avatar:NoneType:None, pseudonym:NoneType:None, password:NoneType:None, is_show_empty:bool:True, is_can_upload:bool:False, is_can_down:bool:False, is_original_image:bool:False, roles:[], must_otp:bool:True, is_viewing:bool:False, invite_remaining:int:0, is_have_emps:bool:False, slot_remaining:int:2, size_upload:int:0, carrot:int:0, sign:NoneType:None}

### PUT /api/user/showEmpty
{is_show_empty:bool:False}

### GET /
{is_show_watch_default:bool:True}

### PUT /api/user/pseudonym
{pseudonym:str:张三}

### PUT /api/user/sign
{sign_index:int:1, earn_point:int:2, continuous_days:int:1}

### GET /api/user/passwordTemporary
{password:int:559, second:int:45}

### GET /api/invite/info
{invite_at:str:2026-01-16 09:06:31, invite_remaining:int:0, invite_count:int:1, parent:{pseudonym:NoneType:None}}

### GET /api/invite/history
{page:int:1, page_size:int:1, total:int:1, items:[{user_id,username,telegram_user_id,invite_at,invite_remark,join_at,last_video_player,last_telegram_message,last_user_sign}]}

### POST /api/invite/revoke
{invite_remaining:int:1}

### GET /api/invite/tree
[{user_id:str:eXD3VD3Y1s, username:str:sorakand, invite_at:str:2026-01-17 10:10:10, invite_user_id:str:emos, is_disabled:bool:False, join_at:str:2026-01-17 00:06:35, last_video_player:str:2026-07-06 12:42:04, last_telegram_message:str:2026-07-14 15:16:27, last_user_sign:str:2026-07-14 15:34:57}]

### GET /api/upload/video/recognize
{message:str:未找到对应的视频, 请先同步后使用.}

### GET /api/upload/video/base
{title:str:教父, video_medias:[{media_id,media_name,media_file_size,user_pseudonym,is_self_upload}]}

### POST /api/upload/video/save
{count:int:1, media_id:str:Y1qy9kW9v86K, carrot:int:3}

### POST /api/upload/video/saveInternal
{media_id:str:deqped9rnmx8, carrot:int:2}

### POST /api/upload/subtitle/save
{carrot:int:1, subtitle_id:str:Bpvx8YxPoVdQ}

### GET /api/upload/image/list
{page:int:1, page_size:int:15, total:int:1, items:[{file_id,url,file_type,file_name,file_size,created_at}]}

### DELETE /api/upload/image/delete
{is_delete:bool:True}

### POST /api/upload/music/save
{carrot:int:2, media_id:str:ymqnzjo29z80}

### POST /api/upload/music/saveHeadless
{carrot:int:1, media_id:str:ymqnzjo29z80}

### POST /api/upload/multipart/{{file_id}}/presign
[{number:int:1, upload_url:str:https://emos.local/xxxx, upload_data:{}}]

### POST /api/upload/multipart/{{file_id}}/complete
{file_id:str:qwPOM8APpy8k}

### GET /api/upload/store/disk
> 暂存区三个接口未接（需单独申请权限，管理员 token 也返回 422）。形状留档。
[str:local_emos_1]

### GET /api/upload/store/file
[{file_name:str(长风渡.2023.S01E02.第2集.…), file_size:int:0, mime_type:str:video/mp4}]

### POST /api/upload/store/archive
{media_id:str:34o70vj78pq7, carrot:int:2}

### POST /api/upload/getUploadToken
{message:str:此资源您一周内上传过}

### GET /api/video/media/listAll
{page:int:1, page_size:int:2, total:int:2, items:[{video_id,video_type,video_title,todb_id,tmdb_id,season_id,season_number,season_title,episode_id,episode_number,episode_title,part_id,part_number,part_title,media_id,media_name,media_status,media_file_size,media_file_second,media_file_metadata,user_pseudonym,user_id,is_self_upload,storage_title,created_at}]}

### DELETE /api/video/media/delete
{carrot:int:3}

### PUT /api/video/media/restore
{carrot:int:-10}

### PUT /api/video/media/move
{carrot:int:1}

### PUT /api/video/media/rename
{carrot:int:1}

### GET /api/video/media/playUrl
{url:str:http://emos.local/play}

### GET /api/video/subtitle/list
[{subtitle_id:str:Bpvx8YxPoVdQ, subtitle_title:str:demo - 张三 上传, subtitle_codec:str:mp4, user_pseudonym:str:张三, is_self_upload:bool:True, created_at:str:2026-01-18T16:20:30.000000Z}]

### DELETE /api/video/subtitle/delete
{carrot:int:1}

### PUT /api/video/subtitle/rename
{carrot:int:1}

### GET /api/video/record/request
{page:int:1, page_size:int:10, total:int:1, items:[{video_media_id,range,is_proxy,video_id,video_type,video_title,ip,ua,time}]}

### GET /api/video/record/list
{page:int:1, page_size:int:10, total:int:2, items:[{video_id,video_title,video_type,todb_id,tmdb_id,video_image_logo,video_image_poster,video_image_backdrop,video_season_id,season_number,video_episode_id,episode_number,episode_image_poster,media_id,media_name,media_seconds,play_seconds,play_ua,is_complete,time}]}

### PUT /api/video/record/change
{count:int:1}

### PATCH /api/video/sync
[{todb_id:int:1000, video_type:str:tv, video_title:str:西部世界, date_air:str:2016-10-02, is_adult:bool:False}]

### GET /api/video/tree
[{video_type:str:tv, item_type:str:vl, item_id:int:1, tmdb_id:int:63247, todb_id:int:1000, title:str:西部世界, date_air:str:2016-10-02, seasons:[{item_type,item_id,season_title,season_number,date_air,episodes}]}]

### GET /api/video/getVideoId
{item_type:str:vl, item_id:int:2, video_type:str:tv, video_title:str:权力的游戏, date_air:str:2011-04-17, todb_id:int:1001, tmdb_id:int:1399, season_info:{item_type:str:vs, item_id:int:7, season_title:str:第一季 权力的游戏, season_number:int:1, date_air:str:2011-04-17}, episode_info:{item_type:str:ve, item_id:int:393, episode_title:str:凛冬将至, episode_number:int:1, date_air:str:2011-04-17}}

### GET /api/video/list
{page:int:1, page_size:int:15, total:int:1, items:[{item_id,todb_id,tmdb_id,tmdb_url,video_id,video_type,video_title,video_origin_title,video_description,video_tagline,video_image_logo,video_image_poster,video_image_backdrop,video_date_air,video_is_adult,seek_is_request,seek_id,request_count,parts_count,medias_count,subtitles_count,titles,genres,is_delete}]}

### GET /api/video/search
{page:int:1, page_size:int:3, total:int:6863, items:[{video_id,video_type,video_title,todb_id,tmdb_id}]}

### PUT /api/video/{{video_id}}/delete
{carrot:int:1, is_delete:bool:True}

### GET /api/video/{{video_id}}/season
[{item_id:str:vl-1, season_id:int:1, season_title:str:特别篇, season_number:int:0, season_description:str:, video_image_poster:str(https://image.theoth…), date_air:str:2017-11-07, has_media:bool:False, episodes_count:int:61}]

### GET /api/video/{{video_id}}/episode
[{item_id:str:ve-1, season_id:int:2, season_number:int:1, episode_id:int:1, episode_title:str:起源, episode_number:int:1, episode_description:str(园区工作人员开始注意到接待员的异常行为；…), video_image_poster:str(https://image.theoth…), date_air:str:2016-10-02, runtime:int:65, parts_count:int:0, medias_count:int:0, subtitles_count:int:0}]

### GET /api/video/persons
{page:int:1, page_size:int:1, total:int:6, items:[{id,person_id,person_id_tmdb,name,image_profile,original_name,tagline,biography,birthday,gender,birthplace,is_virtual,is_adult,title,job}]}

### GET /api/watch/{{watch_id}}/video
{page:int:1, page_size:int:15, total:int:6863, items:[{video_id,todb_id,tmdb_id,video_type,video_title,video_origin_title,video_image_poster,video_date_air,video_is_adult,genres,video_is_delete,sort,remark,user_id,user_username,user_avatar,updated_at}]}

### GET /api/watch/{{watch_id}}/video/search
[{video_id:int:1001, todbv_id:int:1038, video_type:str:tv, video_title:str:权力的游戏, video_origin_title:str:Game of Thrones, video_date_air:str:2026-06-26, video_is_adult:bool:False, video_image_poster:str(https://image.theoth…)}]

### POST /api/watch/{{watch_id}}/video/{{video_id}}
{count:int:1}

### DELETE /api/watch/{{watch_id}}/video/{{video_id}}
{count:int:0}

### DELETE /api/watch/{{watch_id}}/video/empty
{count:int:0}

### POST /api/watch/{{watch_id}}/video/update
[{id:int:1002, todb_id:int:1002, tmdb_id:int:238, video_type:str:movie, title:str:教父}]

### GET /api/watch/{{watch_id}}/music
{page:int:1, page_size:int:5, total:int:1, items:[{song_id,todb_music_music_id,name,image_poster_url,description,tagline,duration,video_list_id,rating,is_adult,person_artists,albums,remark,sort}]}

### GET /api/watch/{{watch_id}}/music/search
{page:int:1, page_size:int:5, total:int:573, items:[{song_id,todb_music_song_id,name,image_poster_url,tagline,duration,is_adult,person_artists,albums}]}

### POST /api/watch/{{watch_id}}/music/{{music_song_id}}
{count:int:1}

### DELETE /api/watch/{{watch_id}}/music/{{music_song_id}}
{count:int:0}

### DELETE /api/watch/{{watch_id}}/music/empty
{count:int:0}

### POST /api/watch/slot
{slot_remaining:int:5}

### GET /api/watch
{page:int:1, page_size:int:20, total:int:2, items:[{subscribe_id,id,name,description,is_public,carrot,tags,image_poster,image_poster_url,is_show_empty,is_self,is_edit_video,is_subscribe,user_is_show,user_sort,subscribe_count,video_count,maintainers,author,updated_at}]}

### POST /api/watch
{watch_id:int:1000, count:int:1}

### PUT /api/watch/{{watch_id}}/maintainer
{maintainers_count:int:0}

### PUT /api/watch/{{watch_id}}/show
{is_show:bool:True}

### GET /api/watch/{{watch_id}}/user
{page:int:1, page_size:int:15, total:int:1, items:[{username,avatar,carrot,expiration_date,created_at}]}

### PUT /api/watch/{{watch_id}}/subscribe
{is_subscribe:bool:True}

### PUT /api/watch/{{watch_id}}/dynamic
{url:NoneType:None}

### GET /api/proxy/line
[{id:int:1000, name:str:@proxy, url:str:http://proxy.local, tagline:str:三网绕路, is_self:bool:True, created_at:str:2026-01-20T18:00:24.000000Z}]

### POST /api/proxy/line
{id:int:1000}

### POST /api/seek
{page:int:1, page_size:int:20, total:int:3, items:[{id,video_type,todb_id,tmdb_id,video_title_display,video_list_id,video_season_id,video_season_number,video_episode_id,video_episode_number,count_request,status,upload_expired_at,updated_at,video_title,video_date_air,video_image_logo,video_image_poster,video_image_backdrop,tmdb_url,upload_username,is_can_claim,item_id,seek_carrot}]}

### GET /api/seek/poll
[{id:int:1, todb_id:int:7819, tmdb_id:int:508935, video_type:str:movie, video_title_display:str:八佰, video_season_id:NoneType:None, video_season_number:NoneType:None, video_episode_id:NoneType:None, video_episode_number:NoneType:None, updated_at:str:2026-01-22T07:05:06.000000Z}]

### PUT /api/seek/apply
{seek_is_request:bool:True}

### GET /api/seek/history
[{username:str:soa, carrot:int:0, created_at:str:2026-01-22T07:13:29.000000Z}]

### PUT /api/seek/claim
{status:str:upload}

### GET /api/rank/carrot
[{index:int:1, carrot:int:100, username:str:user_1, avatar:NoneType:None}]

### GET /api/rank/upload
[{index:int:1, size:int:100, username:str:use_1, avatar:NoneType:None}]

### GET /api/rank/userVideoRecordPlaying
[{video_title:str:权力的游戏, video_type:str:tv, todb_id:int:1001, tmdb_id:int:1399, season_number:int:1, episode_number:int:2, play_speed:int:20, upload_pseudonym:str:emos, ua:str:SenPlayer/5.7.4, video_image_logo:str(https://image.theoth…), video_image_poster:str(https://image.theoth…), video_image_backdrop:str(https://image.theoth…)}]

### GET /api/rank/userLiveRecordPlaying
[{provider_pseudonym:str:upload_a, username:str:user_a, live_title:str:CCTV3, play_durations:int:600, ua:str:Hills/1.4.7 (android; 12)}]

### GET /api/rank/sign
[{sign_index:int:1, sign_content:NoneType:None, sign_at:str:2026-02-16T06:05:44.000000Z, earn_point:int:2, continuous_days:int:1, username:str:soa, avatar:NoneType:None}]

### GET /api/carrot/current
{carrot:int:600}

### GET /api/carrot/history
{page:int:1, page_size:int:15, total:int:3, items:[{trigger_type,trigger_type_string,type,point,expired_at,created_at}]}

### PUT /api/carrot/transfer
{carrot:int:1936}

### GET /api/live/list
{page:int:1, page_size:int:2, total:int:18, items:[{id,live_library_id,code,title,description,tagline,image_poster_url,sort,is_can_edit,media_count,updated_at}]}

### POST /api/live/list
{count:int:1}

### GET /api/live/media
{page:int:1, page_size:int:15, total:int:1, items:[{media_id,name,path_type,path_url,status,pseudonym,is_can_edit,created_at}]}

### POST /api/live/media
{live_media_id:str:lgqjrvnnwzxd, carrot:int:2}

### DELETE /api/live/media/{{live_media_id}}
{carrot:int:1}

### POST /api/live/media/update
{delete_count:int:1}

### GET /api/live/library
[{id:int:100, title:str:央视, image_poster_url:NoneType:None}]

### GET /api/pay/base
{name:str:名称, description:str:简介, total_revenue:int:0, total_expenditure:int:0, notify_url:NoneType:None, status:str:review}

### POST /api/pay/update
{name:str:名称, description:str:简介, notify_url:NoneType:None}

### POST /api/pay/transfer
{deduct:int:166, carrot:int:781}

### POST /api/pay/create
{no:str:20260215153511-pay-5FTmJ, pay_way:str:web, pay_url:str(https://emos.best/pa…), expired:str:2026-02-15T15:40:11}

### GET /api/pay/query
{no:str:20260215153614-pay-eA2rq, pay_way:str:web, pay_status:str:default, price_order:int:1, price_settle:int:2, order_name:str:充值啦啦啦, time_payed:NoneType:None, notify_status:str:default}

### PUT /api/pay/close
{is_close:bool:False}

### GET /api/pay/getUserCarrot
{carrot:int:50468}

### GET /api/pay/getUserInfo
{user_id:str:eWD3N7EX8s, username:str:soa, avatar:NoneType:None, is_viewing:bool:True, invite_user_id:NoneType:None, size_upload:int:0, telegram_user_id:NoneType:None, is_disable:bool:False, created_at:str:2026-01-16T16:06:35.000000Z}

### POST /api/pay/sendNotifyEmail
{carrot:int:-10}

### GET /api/pay/getUserSign
{sign_index:int:2, sign_at:str:2026-09-19 14:11:37, earn_point:int:4, continuous_days:int:1, content:NoneType:None}

### GET /api/shop/seller/base
{seller_id:int:1000, cover:NoneType:None, cover_url:NoneType:None, name:str:我的小店, description:str:专卖啦啦啦, status:str:examine, is_self:bool:True}

### POST /api/shop/seller/update
{name:str:我的小店, description:str:专卖啦啦啦, cover:str:bqOaKbRKeQNn, cover_url:str(https://emos.local/f…)}

### GET /api/shop/category/list
[{category_id:int:1000, name:str:分类1, sort:int:80}]

### POST /api/shop/category/create
{category_id:int:1000}

### PUT /api/shop/category/sort
{sort:int:80}

### GET /api/shop/product/list
{page:int:1, page_size:int:10, total:int:2, items:[{product_id,category_id,cover_url,name,price,price_origin,stock,sales,is_up,up_time,time_start,time_end,user_buy_max,sort,updated_at}]}

### GET /api/shop/product/info
{seller:{seller_id:int:1000, name:str:我的小店, description:str:专卖啦啦啦, cover_url:NoneType:None}, product_id:int:1000, category_id:int:1000, category_name:str:分类1, cover:NoneType:None, cover_url:NoneType:None, name:str:苹果1, description:str:好吃又大的大苹果, exchange_way:str:购买后自提, price:NoneType:None, price_origin:int:1000, stock:int:100, is_up:bool:False, up_time:str:2026-02-28 19:45:13, time_start:str:2026-02-28 12:12:12, time_end:str:2026-02-28 14:14:14, sort:int:80, updated_at:str:2026-02-28T11:45:13.000000Z, sales:int:0}

### POST /api/shop/product/createOrUpdate
{product_id:int:1000}

### PUT /api/shop/product/category
{category_id:int:1000}

### PUT /api/shop/product/sort
{sort:int:80}

### PUT /api/shop/product/up
{is_up:bool:False}

### POST /api/shop/order/user/create
{no:str:20260331015014shopF0G3D, buy_number:int:2, price:int:200, expired:str:2026-03-31 02:00:14}

### POST /api/shop/order/user/pay
{message:str:支付成功}

### GET /api/shop/order/user/list
{page:int:1, page_size:int:10, total:int:2, items:[{seller,product,order_no,product_id,price_order,order_title,order_cover_url,status_pay,urge_number,buy_number,time_pay,time_delivery,time_urge,remark_shop,remark_user,created_at}]}

### PUT /api/shop/order/user/urge
{urge_number:int:3}

### DELETE /api/shop/order/user/order
{is_delete:bool:True}

### GET /api/shop/order/shop/order
{page:int:1, page_size:int:10, total:int:2, items:[{user,order_no,product_id,price_order,price_settle,order_title,order_cover_url,status_pay,urge_number,buy_number,time_pay,time_delivery,time_urge,remark_shop,remark_user,created_at}]}

### PUT /api/shop/order/shop/delivery
{time_delivery:str:2026-03-31 00:24:36}

### DELETE /api/shop/order/shop/order
{is_delete:bool:False}

### POST /api/redPacket/create
{red_packet_id:str:BLJg3EDpYAno}

### GET /api/redPacket/receive
{page:int:1, page_size:int:15, total:int:1, items:[{user_id,username,avatar,carrot,receive_at}]}

### POST /api/redPacket/createTelegramHtml
{red_packet_id:str:vkQN8d6jYJqD}

### POST /api/telegram/vote/create
{vote_id:int:1, time_end:str:2026-02-24T08:28:52.971000Z}

### GET /api/telegram/vote/result
{vote_id:str:4, question:str:Test, options:[str:Test], time_start:str:2026-04-05 03:58:43, time_end:str:2026-04-05 03:59:43, users:[{index,option_index,user_id,username,avatar,telegram_id}]}

### POST /api/lottery/create
{lottery_id:str:4zwLEpq8P2r1}

### GET /api/lottery/win
{lottery_name:str:大奖啊, lottery_description:str:感谢xxx提供至此, time_start:str:2026-03-03 15:50:20, time_end:str:2026-03-04 14:20:32, amount:int:2, number:int:2, users:[{user_id,user_username,user_avatar,prize_name,prize_description,join_index,join_at,prize_body}]}

### PUT /api/lottery/cancel
{is_success:bool:False}

### GET /api/ban/list
[{user_id:str:e0E4MKO96s, username:str:dajun7095, avatar:NoneType:None, invite_user_id:str:eK98JXQ9Ms, invite_pseudonym:str:咸鱼翻身计划, invite_at:str:2026-01-22 17:39:27, telegram_user_id:str:6181680957, disable_reason:str:250306 请求数异常, created_at:str:2026-01-21T15:27:08.000000Z}]

### PUT /api/ban/change
{carrot:int:-1}

### PUT /api/music/favorite
{is_favorite:bool:True}

### PUT /api/music/rating
{rating:NoneType:None}

### PATCH /api/music/sync
{type:str:ma, value:str:1000}

### GET /api/music/person/list
{page:int:1, page_size:int:5, total:int:1, items:[{person_id,name,original_name,tagline,biography,birthday,gender,birthplace,is_virtual,is_adult,image_profile,image_backdrop}]}

### GET /api/music/song/{{music_song_id}}/lyric/list
[{lyric_id:int:1, type:str:text, language:str:zh, content:str(抬頭的一片天 是男兒的一片天 曾經在滿天…), name:str:sorakand 提供, created_at:str:2026-05-22T15:46:26.000000Z, user:{user_id,username,avatar}}]

### POST /api/music/song/{{music_song_id}}/lyric/create
{lyric_id:int:1, carrot:int:1}

### DELETE /api/music/song/{{music_song_id}}/lyric/delete
{carrot:int:-1}

### GET /api/music/song/{{music_song_id}}/media/list
[{media_id:str:2g598yxqwqzr, file_suffix:str:mp3, file_type:str:audio/mpeg, file_size:int:13767777, file_hash:str(9d052c2f54b48c48651c…), file_duration:int:330, file_metadata:{album,title,artist,year}, file_quality:str:high, meta_rate_bit:int:320000, meta_rate_sampling:int:44100, meta_bit_depth:int:0, meta_channel:int:2, path_type:str:local_music_storage, is_primary:bool:False, name:str:sorakand 上传, created_at:str:2026-06-09T10:18:20.000000Z, user:{user_id,username,avatar}}]

### DELETE /api/music/song/{{music_song_id}}/media/delete
{carrot:int:-1}

### GET /api/music/song/{{music_song_id}}/media/playUrl
{url:str(https://music.emosst…)}

### PUT /api/music/song/{{music_song_id}}/media/move
{carrot:int:1}

### GET /api/music/song/search
{page:int:1, page_size:int:5, total:int:4671, items:[{song_id,todb_music_song_id,name,image_poster_url,tagline,has_media,is_adult,person_artists}]}

### GET /api/music/song/list
{page:int:1, page_size:int:5, total:int:572, items:[{song_id,todb_music_music_id,name,image_poster_url,description,tagline,release_date,duration,video_list_id,rating,rating_user,has_media,is_adult,person_artists,albums,is_favorite,count_medias,count_lryics}]}

### PUT /api/music/song/{{music_song_id}}/updateVideoId
{carrot:int:1000}

### DELETE /api/music/song/{{music_song_id}}/delete
{carrot:int:1}

### POST /api/music/song/batchHashExist
[{media_id:str:1pgnyxel9qyd, music_song_id:int:1908, file_hash:str(12f1193d8773fe556d34…), name:str:sorakand 上传, created_at:str:2026-06-08T17:19:26.000000Z}]

### GET /api/music/album/list
{page:int:1, page_size:int:5, total:int:127, items:[{album_id,name,description,image_poster_url,image_background_url,tagline,release_date,release_company,video_list_id,type,rating,rating_user,has_media,person_artists,is_favorite,count_song}]}

### PUT /api/music/album/{{music_alumb_id}}/updateVideoId
{carrot:int:1}

### GET /api/reel/info/{{forge_reel_uuid}}
{todbv_id:int:1028, video_list_id:int:1000, video_type:str:tv, video_title:str:千香, video_runtime:NoneType:None, video_record:{video_season_id:int:1000, season_number:int:1, season_title:str:第 1 季, video_episode_id:int:1007, episode_number:int:8, episode_title:str:修远灵根尽毁众人前往青丘, video_part_id:NoneType:None, part_number:NoneType:None, part_title:NoneType:None, media_id:str:30yp1642nj82, media_name:str:1080p - 清单1 - sorakand 提1, media_second:int:8, play_seconds:int:0, is_complete:bool:False}}

### POST /api/reel/create
{forge_reel_uuid:str(0a6e3e35-4e13-4d4d-8…)}

### POST /api/fund/order/check
{message:str:活动仅可以参与 1 次}

### GET /api/fund/order/list
{page:int:1, page_size:int:6, total:int:1, items:[{activity_code,activity_name,activity_description,order_no,order_title,footprint_post_id,order_bodys,tier_name,tier_description,tier_carrot,tier_price,time_expired,payed_at,payout_status,payout_status_string,payout_price,payout_at}]}

### POST /api/fund/order/create
{no:str:20260814215236fundAJuVP}

### POST /api/fund/order/evidence
{payout_status:str:reviewing}

### POST /api/whisper/create
{whisper_id:int:1001}

### GET /api/whisper/sender
[{whisper_id:int:1001, sender_content:str:内容, sender_is_anonymous:bool:False, sender_at:str:2026-09-23 11:34:44, receiver_user:{id,username,avatar}, receiver_content:NoneType:None, receiver_at:NoneType:None}]

### GET /api/whisper/receiver
[{whisper_id:int:1002, sender_content:str:内容, sender_at:str:2026-09-23 11:55:51, sender_user:{id,username,avatar}, receiver_content:NoneType:None, receiver_at:NoneType:None}]

### POST /api/whisper/reply
{whisper_id:int:1000}
