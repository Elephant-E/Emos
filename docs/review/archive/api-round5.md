# 逐端点 API 使用核对（第五轮）

> 只读审计，未改任何源码。基线 HEAD `a79b2a2`。
> 取证：`curl` 直连 `https://emos.best`，token 为 lead 提供（账号 `e7E6K6OE4s`，admin + 商城商户 `seller_id 1002`，非支付服务商）。共发出 **约 130 次真实请求**（93 次清单探针 + 14 次补测 + 11 次补充 mutation 探针 + 若干次复核与样本扫描）。
> 破坏性端点**不用真实 id 执行**，改用「不存在的 id / 空 body」探针：返回的 422/404 足以确认 **method、路径、参数名、必填项**，且不产生副作用（`ban.change`、`media.delete` 等都是先过校验再落库）。
> 唯一产生的真实副作用：`music/favorite` 一次（已立即回滚），`user/showEmpty` 若干次（已复原为 `false`）。
> ⚠️ 审查期间工作区有并发改动（`AccountView` 重构、`endpoints.ts` 新增 3 个用户接口、`router.tsx` 调整）。**本文行号以 HEAD `a79b2a2` 为准**；若与当前工作区不一致，按代码关键字定位。已复核：并发改动不影响本次 9 个问题的结论（`AccountView` 的封禁 Tab 被移除后，F1 只剩 `UserDetailView` 一个入口）。
> 列说明：「请求」= method/path/参数名/编码/必填是否与后端一致；「响应字段」= 代码读取的字段是否存在、类型/单位/可空性是否对。`PASS?` = 请求已验证但响应无样本（0 条数据/权限拦截），只能做契约核对。`N/A` = 会产生花费或不可回滚，未执行。

---

## 结论先行

1. **110 个被 UI 触达的端点里：85 个完全 PASS、13 个响应无样本（PASS?）、3 个无法执行（N/A）、5 个前端 FAIL（含 1 个口径问题）、3 个后端 502、1 个类型 WARN。**
2. **两个"按钮点了也不会成功"的新发现**：
   - **解除封禁必然 422**：`PUT /api/ban/change?type=unblock&user_id=…` 缺 `reason`，后端直接报「reason 不能为空」。用户详情页的「解除封禁」就是唯一入口，点了必失败。
   - **暂存区"归档"必然 422**：缺 `item_type`/`item_id`，后端报「item type 不能为空」。
3. **上一轮的"演职员头像"修复方向是错的**：`GET /api/video/persons` 只返回 `image_profile`（文件 id，如 `Xp6nBKg8lMrWxqM5`），根本没有 `image_profile_url`；现在代码只读 `image_profile_url`，于是从"裂图"变成了"永远灰块"。注意音乐侧确实是 `image_profile_url`（完整 URL），两个域字段名不同——这就是这个错的来源。
4. **「获取临时登录密码」会显示 `null`**：该账号 `must_otp=false` 时后端返回 `{"password":null,"second":45}`，而前端直接把 `password` 渲染进去。
5. **商城三个写接口在后端就坏了**：`删除商品`、`删除分类`、`订单备注` 一律 `502 {"success":false,"message":"API 请求失败: 200"}`（网关把上游 200 当成失败）。这不是前端能修的，但需要在 UI 上给出可读提示。
6. **一个口径不一致**：商品列表没传 `seller_id` → 返回**全站 120 件**；而分类列表按 `seller_id` → 本店 **0 个**。于是「商品」Tab 能看到别人的商品（但操作按钮被 `is_self` 藏掉），「分类」Tab 却是空。
7. **已知修复 10 项复核：9 项 PASS、1 项 FAIL**（演职员头像，见第 3 条）。`agreeDownAgreement` 的"幽灵端点"疑虑也解除了——路由存在，只是 Postman 没收录（`GET` 返回 405 并明确「Supported methods: PUT」）。

---

## A. 总表（98 个主调用端点）

| 端点 | 调用点 | 请求是否正确 | 响应字段是否正确 | 结论 |
|---|---|---|---|---|
| `sessionApi.profile` | api/queries.ts:33 | PASS GET 200 | PASS 29 字段；sign 对象/roles/size_upload 字节 | **PASS** |
| `userApi.showEmpty` | api/queries.ts:408 | PASS PUT body is_show_empty bool（false→false/true→true 实测） | PASS 回显 is_show_empty | **PASS** |
| `userApi.pseudonym` | api/queries.ts:407 | PASS PUT ?name（实测 200） | PASS {pseudonym} | **PASS** |
| `userApi.agreeUpload` | views/UploadView.tsx:110 | PASS PUT 路由存在（GET→405 提示仅 PUT） | N/A 返回 unknown | **PASS** |
| `userApi.agreeDown` | api/queries.ts:410 | PASS PUT 路由存在（GET→405 仅 PUT）—— 第三轮的"幽灵端点"疑虑解除 | N/A | **PASS** |
| `userApi.sign` | views/OverviewView.tsx:58 | PASS PUT ?content 可选（重复签到→"重复签到"） | PASS sign_index/continuous_days/earn_point | **PASS** |
| `userApi.passwordTemporary` | api/queries.ts:412 | PASS GET 200 | FAIL 未处理 password:null（must_otp=false 时返回 null） | **FAIL** |
| `userApi.passwordReset` | api/queries.ts:413 | PASS PUT 路由存在（GET→405 仅 PUT） | N/A | **PASS** |
| `userApi.statsVideoHistory` | api/queries.ts:130 | PASS dates[] 数组编码 200 | PASS date + video_watch_second_real（秒） | **PASS** |
| `inviteApi.info` | api/queries.ts:370 | PASS GET 200 | PASS invite_at/invite_remaining/invite_count/parent.pseudonym | **PASS** |
| `inviteApi.history` | api/queries.ts:376 | PASS page+page_size 200 | PASS 13 字段（join_at≠invite_at） | **PASS** |
| `inviteApi.create` | api/queries.ts:415 | PASS body invite_user_id/invite_remark（422 校验"必须 10 字符"） | N/A | **PASS** |
| `inviteApi.revoke` | api/queries.ts:416 | PASS body user_id（422 用户ID输入错误） | N/A | **PASS** |
| `inviteApi.tree` | api/queries.ts:382 | PASS GET 200（3235 条） | PASS user_id/username/join_at/is_disabled | **PASS** |
| `uploadApi.recognize` | views/UploadView.tsx:64 | PASS file_name+provider（422 未找到，符合预期） | PASS 失败走 message；成功读 video_title | **PASS** |
| `uploadApi.saveVideo` | lib/uploader.ts:82 | PASS item_type/item_id/file_id（404 = file 不存在） | N/A | **PASS** |
| `uploadApi.saveSubtitle` | lib/uploader.ts:97 | PASS item_type/item_id/file_id（404） | N/A | **PASS** |
| `uploadApi.disks` | views/UploadView.tsx:33 | PASS GET 200 string[] | PASS | **PASS** |
| `uploadApi.storeFiles` | views/UploadView.tsx:36 | PASS path_type（422 为权限不足，非参数错） | N/A 无权限 | **PASS?** |
| `uploadApi.archive` | views/UploadView.tsx:267 | FAIL 缺 item_type/item_id → 422 | N/A | **FAIL** |
| `uploadApi.uploadToken` | lib/uploader.ts:35 | PASS type/file_type/file_name/file_size（422 是"暂无储存空间"，非参数错） | N/A 未取到 token | **PASS?** |
| `videoApi.list` | api/queries.ts:234 | PASS page/page_size/type/title（200，page_size 生效） | PASS 28 字段 | **PASS** |
| `videoApi.search` | views/UploadView.tsx:41 | PASS title/page/page_size（200） | PASS video_id/video_title/video_type | **PASS** |
| `videoApi.sync` | api/queries.ts:358 | PASS PATCH ?todb_id（200 []） | PASS 空数组即"todb 无数据" | **PASS** |
| `videoApi.remove` | api/queries.ts:359 | PASS PUT /{id}/delete（404） | N/A | **PASS** |
| `videoApi.seasons` | api/queries.ts:308 | PASS GET 200 | PASS season_id/title/number/has_media | **PASS** |
| `videoApi.episodes` | api/queries.ts:314 | PASS ?season_number（200） | PASS runtime 为分钟/medias_count/subtitles_count | **PASS** |
| `videoApi.persons` | api/queries.ts:344 | PASS ?video_list_id（200） | FAIL 读 image_profile_url，实际只有 image_profile（文件 id） | **FAIL** |
| `mediaApi.list` | api/queries.ts:323 | PASS 参数（200） | 类型声明 {medias} 与实际裸数组不符（运行时已兼容） | **WARN** |
| `mediaApi.listAll` | api/queries.ts:585 | PASS only_delete=1/page/page_size/media_id（均 200） | PASS 31 字段（is_can_restore 真布尔） | **PASS** |
| `mediaApi.remove` | api/queries.ts:362 | PASS DELETE body media_id/reason（404） | N/A | **PASS?** |
| `mediaApi.restore` | api/queries.ts:612 | PASS PUT body media_id（404） | N/A | **PASS** |
| `mediaApi.rename` | api/queries.ts:361 | PASS PUT ?media_id&name（422 name≥2） | N/A | **PASS** |
| `mediaApi.playUrl` | api/queries.ts:360 | PASS ?media_id（404） | N/A | **PASS** |
| `mediaApi.syncMetadata` | api/queries.ts:363 | PASS PUT ?media_id（404） | N/A | **PASS** |
| `subtitleApi.list` | api/queries.ts:336 | PASS video_list_id(+episode)（200 []） | N/A 无字幕样本（契约核对：subtitle_id/title/codec/user_pseudonym） | **PASS?** |
| `subtitleApi.remove` | api/queries.ts:365 | PASS DELETE body（404） | N/A | **PASS?** |
| `subtitleApi.rename` | api/queries.ts:364 | PASS PUT ?subtitle_id&title（422 title≥2） | N/A | **PASS** |
| `recordApi.list` | api/queries.ts:164 | PASS page/page_size（200） | PASS media_seconds/play_seconds（秒）/is_complete | **PASS** |
| `watchApi.list` | api/queries.ts:86 | PASS page/page_size/is_self=1/is_subscribe=1（200） | PASS 24 字段（author 嵌套） | **PASS** |
| `watchApi.createOrUpdate` | views/WatchlistsView.tsx:45 | PASS body（422 仅报 type 必填；is_show_empty 已带） | N/A | **PASS** |
| `watchApi.remove` | views/WatchlistsView.tsx:182 | PASS DELETE（204） | N/A | **PASS** |
| `watchApi.slot` | api/queries.ts:411 | 未执行（会扣胡萝卜）；路由存在（GET→405 仅 POST） | N/A | **N/A** |
| `watchApi.videos` | api/queries.ts:261 | PASS ?page&page_size（200；服务端固定 15/页） | PASS 21 字段；分页用 data.page_size | **PASS** |
| `watchApi.searchVideos` | api/queries.ts:291 | PASS ?title&type（200） | PASS 8 字段 | **PASS** |
| `watchApi.music` | api/queries.ts:269 | PASS ?page&page_size&song_title（200） | PASS ListResult | **PASS** |
| `watchApi.removeMusic` | api/queries.ts:282 | PASS DELETE（403 同上） | N/A | **PASS** |
| `lineApi.list` | api/queries.ts:493 | PASS GET（200；only_self 未传） | PASS id/name/url/tagline/is_self/created_at | **PASS** |
| `lineApi.create` | api/queries.ts:512 | PASS body name/url/tagline（422 name 必填） | N/A | **PASS** |
| `lineApi.remove` | api/queries.ts:513 | PASS DELETE ?id（204） | N/A | **PASS** |
| `seekApi.list` | api/queries.ts:216 | PASS body sort_by/sort_order/status[]/page/page_size（200） | PASS 28 字段 | **PASS** |
| `seekApi.query` | views/SeekView.tsx:143 | PASS ?seek_id（200） | PASS status/upload_username/upload_expired_at/seek_carrot | **PASS** |
| `seekApi.history` | views/SeekView.tsx:144 | PASS ?seek_id（200） | PASS username/carrot/created_at | **PASS** |
| `seekApi.claim` | views/SeekView.tsx:41 | PASS body seek_id/type（404 不存在） | N/A | **PASS** |
| `seekApi.urge` | views/SeekView.tsx:51 | PASS body seek_id/carrot（404） | N/A | **PASS** |
| `shopApi.sellerBase` | api/queries.ts:60 | PASS GET（200） | PASS seller_id/name/status/is_self/cover_url | **PASS** |
| `shopApi.sellerApply` | api/queries.ts:465 | 未执行（申请扣 3000）；路由存在（GET→405 仅 POST） | N/A | **N/A** |
| `shopApi.sellerUpdate` | api/queries.ts:464 | PASS body name/description（422 name 必填） | N/A | **PASS** |
| `shopApi.categories` | api/queries.ts:429 | PASS ?seller_id（200 []） | N/A 本店无分类 | **PASS?** |
| `shopApi.createCategory` | api/queries.ts:462 | PASS body name/sort（422 name 必填） | N/A | **PASS** |
| `shopApi.deleteCategory` | api/queries.ts:463 | PASS ?category_id（502 后端异常） | N/A | **FAIL(后端)** |
| `shopApi.products` | api/queries.ts:437 | WARN 未传 seller_id → 返回全站 120 件 | PASS 21 字段（price/stock 为 int） | **FAIL** |
| `shopApi.saveProduct` | api/queries.ts:461 | PASS 12 字段（422 报 category id 必填） | N/A | **PASS** |
| `shopApi.deleteProduct` | api/queries.ts:460 | PASS ?product_id（502 后端异常） | N/A | **FAIL(后端)** |
| `shopApi.productCategory` | api/queries.ts:459 | PASS ?product_id&category_id（200） | N/A | **PASS** |
| `shopApi.ordersShop` | api/queries.ts:217 | PASS page/page_size/is_pay=1（200） | N/A 0 单（契约核对：status_pay=paid/unpaid） | **PASS?** |
| `shopApi.delivery` | api/queries.ts:466 | PASS body order_no/is_delivery bool（200） | WARN 后端对不存在的单也返回 time_delivery | **PASS?** |
| `shopApi.remarkOrder` | api/queries.ts:467 | PASS body order_no/remark（502 后端异常） | N/A | **FAIL(后端)** |
| `shopApi.deleteOrder` | api/queries.ts:468 | PASS ?order_no（200 {is_delete:false}） | PASS | **PASS** |
| `liveApi.list` | api/queries.ts:475 | PASS page/page_size/library_id（200，服务端固定 15/页） | PASS 15 字段 | **PASS** |
| `liveApi.save` | api/queries.ts:500 | PASS body（422 报 live_library_id 必填；code 未被接受也未被拒） | N/A | **PASS?** |
| `liveApi.remove` | api/queries.ts:501 | PASS DELETE /{id}（204） | N/A | **PASS** |
| `liveApi.media` | api/queries.ts:487 | PASS ?live_list_id(+page)（200） | PASS 12 字段（status=normal/error 已按此渲染） | **PASS** |
| `liveApi.addMedia` | api/queries.ts:502 | PASS body（422 报 live_list_id 必填） | N/A | **PASS** |
| `liveApi.library` | api/queries.ts:481 | PASS GET（200） | PASS id/title/image_poster_url | **PASS** |
| `carrotApi.current` | api/queries.ts:172 | PASS GET（200） | PASS {carrot} | **PASS** |
| `carrotApi.history` | api/queries.ts:388 | PASS page/page_size（200） | PASS trigger_type_string/point/created_at | **PASS** |
| `carrotApi.transfer` | views/PayView.tsx:163 | 未执行（资金）；路由存在（GET→405 仅 PUT） | N/A | **N/A** |
| `payApi.base` | api/queries.ts:652 | PASS GET（404 = 本实例未开通，符合分支判断） | PASS | **PASS** |
| `payApi.apply` | views/PayView.tsx:64 | PASS body name/description（422 name 必填，未扣费） | N/A | **PASS** |
| `payApi.query` | api/queries.ts:658 | PASS ?no（404 订单不存在） | PASS | **PASS** |
| `payApi.userInfo` | api/queries.ts:624 | PASS ?user_id（403 = 非服务商，UI 有 limited 态） | N/A | **PASS?** |
| `banApi.list` | api/queries.ts:218 | PASS GET（200） | PASS 9 字段（注意只含最近 7 天） | **PASS** |
| `banApi.change` | api/queries.ts:418 | FAIL unblock 未传 reason → 422 "reason 不能为空" | N/A | **FAIL** |
| `musicApi.persons` | api/queries.ts:536 | PASS page/page_size（200） | PASS image_profile_url（已修对） | **PASS** |
| `musicApi.songs` | api/queries.ts:520 | PASS page/page_size/name/has_media（200） | PASS duration 秒/ has_media bool / count_lryics | **PASS** |
| `musicApi.albums` | api/queries.ts:528 | PASS page/page_size（200） | PASS count_song/image_poster_url | **PASS** |
| `musicApi.rating` | api/queries.ts:573 | PASS ?type&value&rating（200） | PASS {rating} | **PASS** |
| `musicApi.sync` | api/queries.ts:574 | PASS PATCH ?type&value（200 回显） | PASS | **PASS** |
| `musicApi.lyrics` | api/queries.ts:555 | PASS GET（200） | PASS lyric_id/type/language/content/name/created_at/user | **PASS** |
| `musicApi.media` | api/queries.ts:563 | PASS GET（200） | PASS file_size 字节/meta_rate_bit bps/user.username | **PASS** |
| `musicApi.deleteSong` | api/queries.ts:575 | PASS DELETE /{id}/delete（404） | N/A | **PASS** |
| `fundApi.orders` | views/FundView.tsx:79 | PASS page/page_size（200 空） | N/A 0 单（契约核对） | **PASS?** |
| `fundApi.create` | views/FundView.tsx:91 | PASS body fund_activity_code/carrot（422 必填校验在前） | N/A | **PASS** |
| `fundApi.evidence` | views/FundView.tsx:101 | PASS body order_no/images/remark（422 order no 必填） | N/A | **PASS** |
| `whisperApi.sender` | views/WhisperView.tsx:15 | PASS GET（200 []） | N/A 无数据（契约核对：sender_content/receiver_content/sender_user/sender_at） | **PASS?** |
| `whisperApi.receiver` | views/WhisperView.tsx:15 | PASS GET（200 []） | N/A | **PASS?** |
| `whisperApi.reply` | views/WhisperView.tsx:27 | PASS body whisper_id/content（404） | N/A | **PASS** |

### A2 补充：以解构方式调用、同样在 UI 中被触发的端点（12 个，合计 110）

| 端点 | 调用点 | 请求是否正确 | 响应字段是否正确 | 结论 |
|---|---|---|---|---|
| `watchApi.show` | views/WatchlistDetailView.tsx:60 | PASS PUT /{id}/show（404 = 片单不存在） | N/A | **PASS** |
| `watchApi.subscribe` | views/WatchlistDetailView.tsx:52 | PASS PUT ?sort（404） | N/A | **PASS** |
| `watchApi.dynamic` | views/WatchlistDetailView.tsx:60 | PASS PUT body {url}（404） | N/A | **PASS** |
| `watchApi.sort` | api/queries.ts:682 | PASS PUT ?sort（204） | N/A | **PASS** |
| `watchApi.addVideo` | api/queries.ts:672 | PASS body {sort,remark}（403 = 非维护者，符合预期） | N/A | **PASS** |
| `watchApi.removeVideo` | api/queries.ts:676 | PASS DELETE（403 同上） | N/A | **PASS** |
| `mediaApi.move` | views/VideoDetailView.tsx:526 | PASS PUT ?media_id&item_type&item_id（404） | N/A | **PASS** |
| `shopApi.productSort` | api/queries.ts:458 | PASS PUT ?product_id&sort（200） | N/A | **PASS** |
| `shopApi.productUp` | api/queries.ts:457 | PASS PUT ?product_id（404） | N/A | **PASS** |
| `liveApi.removeMedia` | api/queries.ts:503 | PASS DELETE /{id}（404） | N/A | **PASS** |
| `musicApi.favorite` | api/queries.ts:572 | PASS PUT ?type&value（200，实测可回滚） | PASS {is_favorite} | **PASS** |
| `whisperApi.reply` | views/WhisperView.tsx:27 | PASS POST body whisper_id/content（404） | N/A | **PASS** |

---

## B. FAIL 清单（按严重度）

### F1 [P0] 解除封禁缺 `reason` → 必然 422

- **位置**：[`UserDetailView.tsx:43`](src/views/UserDetailView.tsx#L43)（审查期间 `AccountView` 的封禁 Tab 被移除，原先第二处调用点已不存在，问题范围收窄为 1 处）
- **现状**：`actions.banChange.mutate({ type: 'unblock', userId })` —— 没带 `reason`；`banApi.change` 第三个参数可空，`buildUrl` 会直接跳过 undefined。
- **证据**：
  ```
  PUT /api/ban/change?type=unblock&user_id=__probe__
  → 422 {"message":"reason 不能为空。"}

  PUT /api/ban/change?type=unblock&user_id=__probe__&reason=x
  → 200/4xx {"message":"用户ID错误"}   ← 过了校验层，才进入业务校验
  ```
  （`type=disable` 同样要求 `reason`，但封禁入口已经带了「后台手动封禁」，所以只有解除会踩雷。）
- **影响**：封禁列表、用户详情里的「解除」全部失败，且 toast 文案是后端原文「reason 不能为空」，管理员会以为是系统故障。这是封禁/申诉流程的唯一出口。
- **修复**：`unblock` 时补 `reason`（固定文案 `'后台手动解除'`，或弹窗让管理员填）；后端若确实要求，前端别用 optional。

### F2 [P1] 暂存区「归档」缺 `item_type`/`item_id` → 必然 422

- **位置**：[`UploadView.tsx:267`](src/views/UploadView.tsx#L267)
- **现状**：`uploadApi.archive({ path_type: storage, file_name: file.file_name })`
- **证据**：
  ```
  POST /api/upload/store/archive  {"path_type":"local_emos_1","file_name":"__probe__.mkv"}
  → 422 {"message":"item type 不能为空。"}
  ```
  契约（Postman）四字段：`item_type`、`item_id`、`path_type`、`file_name`。
- **影响**：暂存区每一行的「归档」按钮点了必失败（且这是个 3 秒等待后才报错的失败）。
- **修复**：归档前先选目标（可复用 `GET /api/upload/video/base?item_type&item_id` 校验标题），把 `item_type`（`vl`/`ve`）与 `item_id` 一起提交。

### F3 [P1] 演职员头像读错字段（本轮"修复"引入的回归）

- **位置**：[`VideoDetailView.tsx:354-355`](src/views/VideoDetailView.tsx#L354)
- **现状**：`String(person.image_profile_url ?? '').startsWith('http') ? <img src=…> : <灰块>`
- **证据**：
  ```
  GET /api/video/persons?video_list_id=209007
  → {"name":"黎明","image_profile":"Xp6nBKg8lMrWxqM5","job":null,"title":"Wei Tian",…}
  （响应里没有 image_profile_url）

  GET /api/music/person/list?page=1&page_size=2
  → {"name":"泰勒·斯威夫特","image_profile_url":"https://image.theotherdb.org/original/1XaJpKvpxE4z3lx9"}
  ```
  即：影片域的 `image_profile` 是**文件 id**，音乐域的 `image_profile_url` 是**完整 URL**。
- **影响**：演职员整排变成灰色占位块，比修复前的"裂图"信息量更少；因为 `startsWith('http')` 恒为 false，`<img>` 分支永远不执行。
- **修复**：`const src = p.image_profile?.startsWith('http') ? p.image_profile : p.image_profile ? \`https://image.theotherdb.org/original/${p.image_profile}\` : null`；顺手把 `key={person.id}`（`id` 为 `null`）改用 `person_id_tmdb ?? name`。

### F4 [P1] `passwordTemporary` 返回 `password: null` 时界面显示 "null"

- **位置**：[`AccountView.tsx:329-331`](src/views/AccountView.tsx#L329)、类型 [`queries.ts:415`](src/api/queries.ts#L415)
- **现状**：`<b>{password.password}</b>，{password.second} 秒内有效`；类型声明 `{ password: number; second: number }`。
- **证据**：
  ```
  GET /api/user/passwordTemporary
  → 200 {"password":null,"second":45}
  ```
  （Postman 注明「只有当 must_otp 为 true 时才是临时密码」；本账号 `must_otp: false`。）
- **影响**：点击后显示「临时密码 null，45 秒内有效」，管理员会把它当成 bug 或误以为密码就是字符串 "null"。
- **修复**：`password == null` 时显示「该账号未启用 OTP，直接使用永久密码登录」；类型改 `password: number | null`。

### F5 [P2] 商品列表未按 `seller_id` 过滤 → 与分类页口径不一致

- **位置**：[`queries.ts:440`](src/api/queries.ts#L440)（`shopApi.products({...})` 未传 `seller_id`）、[`ShopView`](src/views/ShopView.tsx)
- **证据**：
  ```
  GET /api/shop/product/list?page=1&page_size=5&sort_by=sort&sort_order=asc
  → {"total":120,…}            ← 全站商品
  GET /api/shop/product/list?…&seller_id=1002 → {"total":0,…}
  GET /api/shop/category/list?seller_id=1002  → []
  ```
- **影响**：商城页标题写「我的店铺/他人店铺」，商品 Tab 却列出全站 120 件，而按钮按 `is_self` 全部隐藏；分类 Tab 因为只查本店而空空如也。管理员会误判"我的商品有 120 件"。
- **修复**：口径二选一并写进标题——(a)「全站商品」视角：列表与分类都不过滤 seller，标题去掉"我的店铺"；(b)「我的店铺」视角：列表传 `seller_id`。

### F6 [P1·后端] 三个写接口固定 502（前端无法修复，但需要可读提示）

- **位置**：[`queries.ts:463`](src/api/queries.ts#L463)（删除商品）、[`:466`](src/api/queries.ts#L466)（删除分类）、[`:470`](src/api/queries.ts#L470)（订单备注）
- **证据**（三个接口一致）：
  ```
  DELETE /api/shop/product/delete?product_id=999999999   → 502 {"success":false,"message":"API 请求失败: 200"}
  DELETE /api/shop/category/delete?category_id=999999999 → 502 同上
  POST   /api/shop/order/shop/remark {"order_no":"__probe__","remark":"x"} → 502 同上
  ```
  注意 502 是**网关**产生（上游返回 200 被判定为失败），不是参数问题：同批的 `delivery`/`deleteOrder` 都正常 200。
- **影响**：删商品、删分类、改订单备注三个动作必然失败，前端只弹出「API 请求失败: 200」。
- **修复**：后端排查网关对这三个 POST/DELETE 的响应判定；前端在 502 时给出「服务端暂时不可用，请稍后再试」。

### W1 [WARN] `mediaApi.list` 类型与响应不符（裸数组 vs `{medias:[]}`）

- **位置**：[`endpoints.ts:96`](src/api/endpoints.ts#L96)；[`queries.ts:323`](src/api/queries.ts#L323) 已做 array/items/data 三路兼容
- **证据**：`GET /api/video/media/list?video_list_id=6737` → `[{"media_id":"2xeow77lpv49",…}]`（顶层数组）
- **影响**：运行时被兼容兜住，但类型骗人；任何直接 `await mediaApi.list()` 的新代码都会拿到数组却按对象取 `.medias`。
- **修复**：`request<VideoMedia[]>(...)`，删掉兼容分支。

### W2 [P3] 片单非维护者操作返回 403 但 `message` 为空 → toast 只剩「（403）」

- **证据**：`POST /api/watch/1161/video/999999999` → `403 {"message":""}`；`DELETE /api/watch/1161/music/9999999` → `403 {"message":""}`
- **影响**：全局 mutation 错误提示拼成 `${message}（${status}）` → 用户看到空白 +「（403）」。
- **修复**：客户端在 `message` 为空时回退到文案表（403 → 「没有权限」）。

---

## C. 已知修复复核（lead 给的 10 项）

| # | 修复项 | 代码位置 | 实测 | 结论 |
|---|---|---|---|---|
| 1 | 布尔字符串 → 1/0 | [`client.ts`](src/api/client.ts) `typeof value === 'boolean'` | `is_pay=1`、`is_self=1`、`only_delete=1`、`is_up=1` 全部 200（`is_pay=true` 才是 422） | ✅ PASS |
| 2 | seek 补 `sort_by` 必填 | [`endpoints.ts:184`](src/api/endpoints.ts#L184) 默认 `updated_at/desc` | `POST /api/seek` 200，返回 16 条 | ✅ PASS |
| 3 | watch 新建补 `is_show_empty` | [`WatchlistsView.tsx:53`](src/views/WatchlistsView.tsx#L53) | 空 body 探针只报「type 不能为空」，说明 `is_show_empty` 不是必填或已满足 | ✅ PASS |
| 4 | upload 补 `file_size` | [`endpoints.ts:73`](src/api/endpoints.ts#L73) | `getUploadToken` 的 422 是「暂无储存空间可用」，不是缺字段 | ✅ PASS |
| 5 | fund evidence 只需三字段 | [`FundView.tsx:99-107`](src/views/FundView.tsx#L99) | 空 body → 422「order no 不能为空」，字段名对 | ✅ PASS |
| 6 | ban type 用 `disable`/`unblock` | [`UserDetailView.tsx:43,61`](src/views/UserDetailView.tsx#L43)、[`endpoints.ts:298`](src/api/endpoints.ts#L298) | 枚举被接受（过了校验到「用户ID错误」）**但 unblock 缺 reason** | ⚠️ 部分（见 F1） |
| 7 | sign 补 `content` | [`OverviewView.tsx:58`](src/views/OverviewView.tsx#L58) | `PUT /api/user/sign` 重复签到返回「重复签到」，前端已捕获 | ✅ PASS |
| 8 | 悄悄话字段 | [`WhisperView.tsx:74-85`](src/views/WhisperView.tsx#L74) | 已按 `sender_content`/`receiver_content`/`sender_user`/`sender_at` 读取（本账号 0 条，契约核对） | ✅ PASS |
| 9 | 直播源枚举 `normal`/`error` | [`LiveView.tsx:175-177`](src/views/LiveView.tsx#L175) | 实测 `"status":"normal"`，代码按 normal→「正常」渲染 | ✅ PASS |
| 10 | 歌手 `image_profile_url` / 演职员 `image_profile` 文件 id | [`MusicView.tsx:118`](src/views/MusicView.tsx#L118) / [`VideoDetailView.tsx:354`](src/views/VideoDetailView.tsx#L354) | 音乐侧字段名对；**影片侧仍读不存在的 `image_profile_url`** | ⚠️ 音乐 PASS / 演职员 FAIL（F3） |

---

## D. 未验证清单（需要授权/花费/样本）

| 端点 | 原因 | 已确认的部分 |
|---|---|---|
| `watchApi.slot`（兑换槽位） | 会扣胡萝卜 | 路由存在（GET→405 仅 POST） |
| `carrotApi.transfer`（胡萝卜转赠） | 资金 | 路由存在（GET→405 仅 PUT） |
| `shopApi.sellerApply`（开店） | 申请扣 3000 萝卜 | 路由存在（GET→405 仅 POST） |
| `userApi.agreeUpload` / `agreeDown` | 会改权限位 | 路由存在（GET→405 仅 PUT），`agreeDownAgreement` 非幽灵端点 |
| `mediaApi.remove` / `subtitleApi.remove` 的 `reason` 规则 | 需要真删他人内容 | 参数名/路由正确；后端 changelog 要求他人内容必传 reason，前端仍传 `null`（第三轮 F2 未修） |
| `uploadApi.uploadToken` 的 `file_storage` | 该实例「暂无储存空间可用」 | 四个必填字段名正确；`file_storage`（wiki 要求）仍未传 |
| `shopApi.ordersShop` 响应字段 | 该账号 0 单 | 请求 200；字段按 Postman 契约核对（status_pay=paid/unpaid、buy_number、time_delivery） |
| `fundApi.orders` / `whisperApi.*` / `subtitleApi.list` / `shopApi.categories` | 0 条数据 | 请求 200；字段按 Postman 契约核对 |
| `uploadApi.storeFiles` | 422「请先申请权限后使用」 | 参数名正确 |

---

*本轮只核对「调用是否与真实后端一致」；返回字段的语义/单位专项见 `docs/review/fields-round4.md`，请求参数契约见 `docs/review/api-round3.md`。*
