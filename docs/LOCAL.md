# 本地验证

## 1. 起服务

```bash
npm install
npm run dev            # http://localhost:5273
```

## 2. 切到真实后端

`.env.development` 改成：

```
VITE_MOCK=0
VITE_API_ORIGIN=https://test.emos.best
```

改完需重启 dev（vite 只在启动时读 env）。`/api` 由 vite proxy 转发，浏览器侧同域，不会有 CORS。

## 3. 登录

打开 <http://localhost:5273>，会跳到 `/login`，粘贴 token：

```
11_test-token
```

token 存在 `localStorage.emos_admin_token`。侧栏底部头像可添加/切换多个账号。

## 4. 假数据模式

- `VITE_MOCK=1`：手写样例数据（`src/api/mock.ts`），用于界面与交互验证。
- `VITE_MOCK=fixtures`：Postman 集合里记录的真实响应（`dev/fixtures.json`，158 条），
  用于验证字段解析。该文件只由 dev 中间件提供，不进生产产物。

两种模式侧栏 logo 旁都会显示黄色 **MOCK** 标记。

## 5. 联调核对项

| 位置 | 接口 | 需要确认 |
|---|---|---|
| 登录后首屏 | `GET /api/user` | `pseudonym / carrot / slot_remaining` 字段名 |
| 媒体库 | `GET /api/video/list` | 分页信封是否 `{page,page_size,total,items}` |
| 影片详情 | `GET /api/video/media/list` | 返回是数组还是 `{data}`（已做三种兼容） |
| 上传 | `POST /api/upload/getUploadToken` | 成功响应里的 file_id 字段名（`file_id / id / file_key` 都试过） |
| 上传 | `POST /api/upload/multipart/{id}/presign` | `upload_url` 与 `upload_data` 的用法 |
| 求片 | `POST /api/seek` | `status` 数组取值（default/upload/complete） |
| 商城 | `GET /api/shop/order/shop/order` | `status_pay` 的取值（代码里按 `pay/paid` 判断） |

## 6. 部署

部署形态是 **Workers + Assets**：`worker/index.ts` 负责 `/api/*` 反代到上游并补齐
`EMOS-PROXY-*` 与 `X-Forwarded-For`，其余路径交给 `dist`，前端是 history 路由所以
`not_found_handling` 设为 `single-page-application`。

```bash
npx wrangler login
npm run deploy        # = build + wrangler deploy
```

本地可用 `npx wrangler dev` 提前验证线上形态（assets + 代理 + SPA 回退）：

```bash
npm run build && npx wrangler dev --port 8787
curl -s -o /dev/null -w '%{http_code}' localhost:8787/library          # 200（回退 index.html）
curl -s -H "Authorization: Bearer <token>" 'localhost:8787/api/video/list?page=1&page_size=2'
```

注意两点：

- `VITE_API_BASE` 必须留空。填了就会写死上游地址，前端直连、绕过 Worker 的代理头
- 前端所有请求都是同源 `/api/*`，所以 **Worker 请求数**（免费 10 万/天）是额度上限；
  静态资源不计入



新的 Worker 名是 `emos-club`，与线上现有的 `emos` 不同名，`wrangler deploy` 只会新建，不会覆盖旧的。

替换旧 Worker 时改 `wrangler.jsonc` 的 `name`，或给 `emos-club` 绑定路由。

## 7. Spotify 搜索（可选）

「音乐 · 从 Spotify 同步」里的按名字搜索走同源 `/api/spotify/search`，
Worker 与 `vite dev` 共用 `worker/spotify.ts`：

```
/api/spotify/search?q=邓紫棋    → MusicBrainz 搜歌手，返回 [{ mbid, name, hint }]
/api/spotify/lookup?mbid=...     → 取该歌手的 Spotify 链接，返回 artist id
```

**为什么不用 Spotify 官方搜索**：Spotify 现在要求「App 所有者有 Premium 订阅」，
否则 `/v1/search` 一律 403（`Active premium subscription required for the owner of the app`），
换 client_credentials token 也一样。所以只保留能用的 MusicBrainz 路径。

**不需要任何密钥**。注意 MusicBrainz 限 1 请求/秒（连发会 503），`worker/spotify.ts`
里做了模块级限速；搜索本身是低频手动操作，够用。
