# emos.club

EMOS 媒体服务管理台。React 18 + TypeScript + Vite + TanStack Router/Query，部署在 Cloudflare Workers。

## 开发

```bash
npm install
npm run dev          # http://localhost:5273
```

`.env.development` 里 `VITE_MOCK=1` 使用内置假数据；接真实后端改成 `0`，`/api` 由 vite proxy 转发到 `VITE_API_ORIGIN`。

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
src/views/      各业务页面
src/styles/     tokens → base → components
worker/         API 反代
```

页面：概览、媒体库、影片详情、片单（含详情）、求片、上传、账号（资料/邀请/胡萝卜/封禁）、
商城（商品/分类/店铺）、订单、直播（频道+源）、线路、回收站、音乐（歌曲/专辑/歌手 + 歌曲详情）、
支付、资金、红包、榜单、抽奖、投票、悄悄话、用户详情。

不做界面：影院（reel）的 6 个接口属于客户端播放器的随机放映链路（开一次放映 → 挑版本 →
上报进度），后台没有对应动作，见 `docs/api-coverage.md`；Telegram 频道内的红包投放由 bot 侧
入口完成。

API 覆盖：`src/api/endpoints.ts` 按域组织类型化封装；文档 190 个接口 / 代码 163 个封装的
逐条对照见 `docs/api-coverage.md`，字段形状见 `docs/api-inventory.md` 与 `docs/api-shapes.md`。
