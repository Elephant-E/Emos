# emos.club

EMOS 媒体服务管理台。React 18 + TypeScript + Vite + TanStack Router/Query，部署在 Cloudflare Workers。

## 开发

```bash
npm install
npm run dev          # http://localhost:5273
```

`.env.development` 里 `VITE_MOCK=1` 用内置假数据；接真后端改成 `0`，`/api` 由 vite proxy 转发到 `VITE_API_ORIGIN`。

## 部署

```bash
npm run deploy
```

- 静态资源：Workers Assets（`dist/`，SPA 回退）
- `/api/*`：`worker/index.ts` 反代到 `wrangler.jsonc` 的 `API_ORIGIN`
- 令牌：登录页写入 `localStorage.emos_admin_token`，401 自动跳登录

## 结构

```
src/api/        client（token/错误归一）、endpoints、queries、mock
src/components/ 侧栏、页头、图表、状态块、图标
src/views/      概览、媒体库、求片
src/styles/     tokens → base → components
worker/         API 反代
```

已迁移：概览、媒体库、影片详情、片单（含详情）、求片、上传、账号（资料/邀请/胡萝卜/封禁）、
商城（商品/分类/店铺）、订单、直播（频道+源）、线路、音乐（歌曲/专辑/歌手 + 歌曲详情）、支付。

刻意不做的：红包 / 抽奖 / Telegram 投票 / 基金 / 悄悄话 / 影院。
这些是机器人在群里完成的动作，原项目同样没有为它们做界面；需要时再做。

API 覆盖：`src/api/endpoints.ts` 24 个域 / 190 个端点全部类型化；`docs/api-inventory.md`
与 `docs/api-shapes.md` 由 Postman 集合自动生成，改接口后重跑即可。
