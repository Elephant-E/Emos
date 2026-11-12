# 旧项目后端的复用

旧项目（`main` 分支 `a01e9a0`）是前后端一体化部署：`worker.js` 既发静态资源，
也做三件服务端的事。新后台之前只搬了前端（见 `LEARNINGS.md`），这一轮把后端补上。

## 旧 Worker 干了什么

| 能力 | 旧实现 | 现在 |
|---|---|---|
| `/api/*` 反向代理到 `emos.best` | `handleEmosApiProxy` | **已复用**：`server/worker.js` 的 `handleProxy`，方法/查询串/请求体原样转发，只换目标源 |
| `/api/identify` 文件名识别 | `share/identify-core.js`：guessit → TMDB → 上游 `getVideoId` | **已复用**：`server/identify-core.js` 原样搬入 |
| `/api/spotify/search` 歌手搜索 | `share/spotify-core.js`：Supabase 边缘函数换 token → Spotify | **已复用**：`server/spotify-core.js` 原样搬入，并接进了「从 Spotify 同步」弹窗 |
| dev/prod 同一套代码路径 | vite 中间件 + Worker 共用 `share/` | **已复用**：`vite.config.ts` 的 `devApiPlugin` |
| 静态资源内嵌（`build-worker.cjs`） | 把 dist 打进 worker | **不复用**：改用 Workers Assets（`ASSETS` binding），少一层构建脚本 |
| 独立 `login.html` | 单页登录 | **不复用**：新后台登录是 SPA 内的路由 |
| 密钥硬编码风险 | 已经从 env 注入 | **沿用**：`TMDB_API_KEY` / `SPOTIFY_ANON_KEY` 只走 `wrangler secret` 与本地 `.dev.vars` |

## 为什么值得搬这两块

- **识别**：上传页现在用上游 `POST /api/upload/video/recognize`，实测对
  「权力的游戏.S02.mkv」会解析成 S00E02（季 0 第 2 集）；旧后端的
  guessit + TMDB 链路按文件名拆季集，明显更准。这是下一步要接的
- **Spotify 搜索**：密钥不能进前端。搬了之后「从 Spotify 同步」可以按名字搜，
  不用先在外面查到 ID 再粘进来

## 配置

```bash
cp .dev.vars.example .dev.vars   # 填 TMDB_API_KEY / SPOTIFY_ANON_KEY
wrangler secret put TMDB_API_KEY
wrangler secret put SPOTIFY_ANON_KEY
```

缺任一密钥时对应路由返回 **501**，界面退回「手动填链接/ID」，不会静默失败。
上游配额用尽（Spotify 429）时前端把错误翻成一句中文，同样退回手动填。

## 还没接的

1. **上传页改用 `/api/identify`**：需要把识别结果映射到现有的目标选择器
   （`item_type` + `item_id` + 季集），并把上游 recognize 作为兜底
2. **失败重试**：旧项目的识别失败会让用户手动选目标，新后台已有这条路径，
   接上识别后要保证两条路不打架
