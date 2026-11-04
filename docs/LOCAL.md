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

改完重启 dev（vite 只在启动时读 env）。`/api` 由 vite proxy 转发，浏览器侧同域，不会有 CORS。

## 3. 登录

打开 <http://localhost:5273>，会跳到 `/login`，粘贴 token：

```
11_test-token
```

token 存在 `localStorage.emos_admin_token`。侧栏底部头像可添加/切换多个账号。

## 4. 假数据模式

- `VITE_MOCK=1`：手写样例数据（`src/api/mock.ts`），用来做界面与交互。
- `VITE_MOCK=fixtures`：**Postman 里记录的真实响应**（`dev/fixtures.json`，158 条），
  用来验证字段解析。这个文件只在 dev 中间件里提供，不会进生产产物。

两种模式侧栏 logo 旁都会显示黄色 **MOCK** 标记。

## 5. 联调时重点核对这几处

| 位置 | 接口 | 需要确认 |
|---|---|---|
| 登录后首屏 | `GET /api/user` | `pseudonym / carrot / slot_remaining` 字段名 |
| 媒体库 | `GET /api/video/list` | 分页信封是否 `{page,page_size,total,items}` |
| 影片详情 | `GET /api/video/media/list` | 返回是数组还是 `{data}`（已做三种兼容） |
| 上传 | `POST /api/upload/getUploadToken` | 成功响应里的 file_id 字段名（`file_id / id / file_key` 都试过） |
| 上传 | `POST /api/upload/multipart/{id}/presign` | `upload_url` 与 `upload_data` 的用法 |
| 求片 | `POST /api/seek` | `status` 数组取值（default/upload/complete） |
| 商城 | `GET /api/shop/order/shop/order` | `status_pay` 的取值（代码里按 `pay/paid` 判断） |

## 6. 部署（等你确认后再做）

新的 Worker 名是 `emos-club`，与线上现有的 `emos` **不同名**，`wrangler deploy` 只会新建，不会覆盖旧的。

真要替换时再改 `wrangler.jsonc` 的 `name`，或给 `emos-club` 绑定路由。
