# 旧项目后端：看过，没有可复用的

旧项目（`main` 分支 `a01e9a0`）是前后端一体化部署，`worker.js` 除了发静态资源，
还做三件事。逐项验证后的结论是：**三件都不做**，代码已删除。

| 能力 | 结论 | 依据 |
|---|---|---|
| `/api/*` 反向代理到上游 | **不需要** | 上游 `emos.best` 本身允许浏览器直连（本项目一直如此），代理只解决 CORS 与隐藏源站；token 在前端本地、不需要服务端注入。部署形态还没定，没有理由为此维护一层代理 |
| `/api/identify` 文件名识别（guessit → TMDB） | **不可用** | 依赖的 guessit 服务 `elephant.pythonanywhere.com` 已下线：任何请求都返回 404 的 PythonAnywhere「Coming Soon」页 |
| `/api/spotify/search` 歌手搜索 | **当前不可用** | 链路本身通（Supabase 的 token 函数返回 200），但 Spotify 侧对该 token 返回 `429 QUOTA_EXCEEDED`；且「从 Spotify 同步」本来就能直接粘链接，缺的只是便利 |
| dev/prod 同一套代码路径 | **不需要** | 上面两个自定义端点都不用了，dev 只剩「上游 API 代理」，那一条 Vite 自带的 `proxy` 已经覆盖 |

## 现在这条链路长什么样

```
浏览器 ──直连──> https://emos.best/api/*            （生产与 dev 都是这条路）
「从 Spotify 同步」→ PATCH /api/music/syncSpotifyArtist（上游接口，手动填链接或 ID）
```

## 如果以后要恢复

- **识别**：guessit 得先有替代服务（本地跑 `guessit` 或换在线解析），否则拿不到
  「季 集」，识别就只剩正则；当前上游的 `recognize` 对 `S02` 会误判成 `S00E02`，
  这一条仍然是个已知缺陷
- **Spotify 搜索**：需要换一个未超配额的 token 源，再按 `server/` 那套搬回来
  （`git show 4656d59` 里有完整实现，含 dev 中间件与 Worker）
