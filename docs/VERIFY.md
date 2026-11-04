# 契约验证（用 Postman 里记录的真实响应）

我这边连不上 `test.emos.best`：该域名没有公网 A 记录，只在你本机的代理里解析；
TCP 能建连但 TLS ClientHello 立刻被 reset。所以我换了验证方式——

把集合里 **158 条真实响应**导出成 fixtures，让前端直接跑这些数据：

```bash
VITE_MOCK=fixtures npm run dev
```

这条路验证的是「我的字段解析能不能吃下真实响应」，比手点更严格。

## 已验证通过（12 个路由全部渲染，无报错、无 undefined）

`/`、`/library`、`/media/1`、`/watchlists`、`/watchlists/1000`、`/seek`、`/upload`、
`/account`、`/shop`、`/orders`、`/live`、`/lines`

关键契约确认：

| 项 | 结果 |
|---|---|
| 列表信封 | `{page, page_size, total, items}` ✔ |
| 影视字段 | `video_title / video_type / medias_count / subtitles_count / video_date_air` ✔ |
| 影片详情来源 | `/api/video/list?video_id=` 取 `items[0]` ✔（确实没有单条接口） |
| 季 | `season_number / season_title / season_id` ✔ |
| 集 | **`?season_number=` 不会过滤**，接口返回全部季的集，必须按 `season_id` 前端过滤 ✔（已修） |
| 片单 | `id / name / video_count / subscribe_count / tags / carrot / is_edit_video` ✔ |
| 求片 | `status ∈ default/upload/complete`、`seek_carrot`、`is_can_claim` ✔ |
| 账号 | `is_can_upload / slot_remaining / carrot` ✔ |
| 店铺 | `status: examine` → 审核中 ✔ |
| 直播 | `live/list`、`live/media`、`live/library` ✔ |
| 线路 | `proxy/line` 数组，`is_self` 决定能否删除 ✔ |

## 这轮验证改掉的真问题

1. **季/集串季**：`/episode?season_number=N` 在真实环境里返回全部集（记录的那次响应就是全季的），
   列表里出现 01、01、01、01 反复。改为按 `season_id` 过滤后才正确（西部世界 S1 十集正常）。
2. **集行被截断**：标题、时长、资源、字幕挤一行，右半截被切。改为两行（标题 / 元信息）。
3. **季切换器溢出**：五个长季名把段落撑爆，改成可横向滚动的 tab。
4. **fixtures 模式被登录守卫拦回 /login**：守卫判断的是 `VITE_MOCK === '1'`，没覆盖 `fixtures`。

## 仍无法离线验证的两处

| 接口 | 原因 | 影响 |
|---|---|---|
| `GET /api/video/media/list` | 集合里只记录了 `listAll`，没有这个 | 详情页资源列表用的是手写兜底，字段按 `media_id/media_name/media_file_size/user_pseudonym` 猜的 |
| `POST /api/upload/getUploadToken` | 只记录了失败响应（"此资源您一周内上传过"） | 成功响应里 file_id 的字段名未知，代码按 `file_id/fileId/id/file_key/key/upload_id` 依次尝试 |

这两处等你连上后端跑一次就能定，改动点都在一个函数里。

---

# 第二版：连上生产 API

token 换成生产用户（admin）后直连 `https://emos.best` 成功，拿到了真实数据。

## 代理怎么做的（照抄原项目）

旧项目的两处配置才是对的，我之前自己写的 fetch 反代会被上游 RST：

**开发（旧 vite.config.ts）**
```ts
proxy: { '/api': { target: 'https://emos.best', changeOrigin: true, secure: false } }
```

**生产（旧 worker.js）**
```ts
headers.set('Host', 'emos.best')
headers.set('EMOS-PROXY-NAME', env.EMOS_PROXY_NAME)
headers.set('EMOS-PROXY-ID', env.EMOS_PROXY_ID)
```
非 JSON 响应包成 `{message}` 返回。

新版已照此实现：`worker/index.ts` 补齐 `EMOS-PROXY-*` 头，`wrangler.jsonc` 写入两个变量。

## 真实数据量 → 改掉的 UI

| 数据 | 真实值 | 原实现的问题 | 现在 |
|---|---|---|---|
| 片库 | 209,486 部 | 只有上一页/下一页 | 每页 20/50/100 + 页码直达 |
| 线路 | 1,279 条 | 无搜索、无分页（全量渲染） | 搜索 + 分页 |
| 胡萝卜记录 | 25,064 条 | 只有上一页/下一页 | 统一 Pager（带跳页） |
| 片单 | 260 个 | `type` 参数没传给接口，音乐片单混进来 | 传入 `type` |
| 上传榜 | 161 TB / 103 TB | 显示原始字节数 | 按 TB/GB 格式化 |
| 店铺 | `status: "pass"` | 未映射，界面显示 pass | 映射为「营业中」 |
| 商城分类 | 必须带 `seller_id` | 不传 → 422 | 用 seller_id 拉取 |

## 修正上一次的误判

我说「`?season_number=` 不过滤」是**错的**——那是 fixtures 的假象（同一条记录被所有季复用）。
真实接口是对的：某剧 `season_number` 缺省 14 集、`=1` 13 集、`=0` 1 集。
前端按 `season_id` 过滤只是防御，不影响正确性。

## 另外

- 这条链路不稳（客户端 fetch 6 次里 1 次超时），已给所有 GET 加 3 次重试（300ms/600ms 退避）。
- `media/list` 与 `getUploadToken` 的成功响应仍未见：前者在该剧该集返回 `[]`（确认是数组），后者集合里只有失败样例。
