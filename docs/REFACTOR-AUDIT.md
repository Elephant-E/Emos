# EMOS 整体审查报告

> 审查日期: 2026-08-16
> 审查范围: `~/Code/emos/emos.club/emos-vue`（Vue 3 + Vite + Cloudflare Worker）
> 前提: 重构前快照已推送至私有仓库 `Elephant-E/Emos`（a12f01d）

---

## 一、项目概况

| 项 | 值 |
|----|-----|
| 技术栈 | Vue 3.5 + Pinia + Vue Router 4 + Vite 5.4 |
| 部署 | Cloudflare Worker（`worker-with-assets.js` 单文件打包） |
| 上游服务 | emos.best / temporary.emos.best / TMDB / Spotify / elephant.pythonanywhere.com |
| 前端源码 | 89 文件 / 48 个 Vue 组件 / 35 个 JS 模块，约 2.1 万行 |
| 页面数 | 16 个 views + 商城/仪表盘/媒体组件群 |

## 二、问题分级清单

### 🔴 P0 安全问题（最高优先）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | **TMDB API Key 硬编码在 5 处**：代码内联 + 构建产物 | vite.config.ts:89、worker.js:191、worker-with-assets.js、wrangler.toml、.dev.vars | 密钥已随仓库分发（虽然仓库当前 private），泄露即被人盗用配额 |
| 2 | **Supabase anon key JWT 硬编码** | worker.js:388、vite.config.ts（Spotify 段） | 伪装客户端直接调用 Supabase 函数 |
| 3 | **identify 业务逻辑三处重复**（dev 中间件 / worker / 构建产物），密钥随之三处散落 | vite.config.ts `identify-api` 插件、worker.js `handleIdentify`、worker-with-assets.js | 改一处漏三处，密钥遗漏风险倍增 |
| 4 | **`.dev.vars` 和 `.wrangler` 被 git 追踪**（`.dev.vars` 含 TMDB key） | git ls-files | 环境变量文件不该入库 |

### 🟠 P1 架构问题（重构主体）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 5 | **vite.config.ts 塞入完整业务逻辑**（identify 全流程 100+ 行、Spotify 代理） | vite.config.ts `identify-api` 插件 | 构建配置承担运行时代码职责，无法复用、无法测试 |
| 6 | **dev 与 prod 行为不一致**：开发走 vite 中间件，生产走 worker.js，两套实现容易漂移 | vite.config.ts vs worker.js | 本地 200 上生产 500 的经典来源 |
| 7 | **巨型文件**：VideoDetailView 1835 行、WatchlistDetailView 1092 行、Sidebar 946 行、UploadView 899 行 | src/views/*.vue | 单文件四五个职责，难维护难测试 |
| 8 | **git 结构错位**：`emos-vue/` 目录已移动到 `emos.club/emos-vue/`，git 曾登记 110 个文件为"删除"（本次快照已修复收录） | 仓库根 | 已随快照提交修复，但需建立规范：多项目目录 + 嵌套 git 如何共存 |
| 9 | 根仓库 `git add -A` 易把多项目（NeteaseCloudMusicApi、medb、music、todb）误收进单一仓库 | 根 .gitignore | 缺目录级 ignore 规则 |

### 🟡 P2 代码质量问题

| # | 问题 | 位置 |
|---|------|------|
| 10 | api/index.js 已封装统一请求层，但部分页面可能绕过它直接 fetch（需逐一核查） | src/views/* |
| 11 | esbuild `drop: ['console']`，但代码大量 `console.error` 调试日志会被生产构建吞掉 | vite.config.ts build 段 |
| 12 | 6 个 assets css 共 3791 行，类名全局裸奔，无 BEM/作用域约束 | src/assets/css/*.css |
| 13 | 历史审计文档（DASHBOARD_AUDIT/MUSIC-CODE-REVIEW/REDESIGN）与代码已漂移，仍需人工核对 | 仓库根 *.md |
| 14 | vite.config.ts.timestamp-*.mjs 构建临时文件残留在仓库根 | 项目根 |

## 三、重构路线图（渐进式，每步可独立验证）

### Phase 1 — 地基（无行为变化）
1. `.gitignore` 补规则：`*.timestamp-*.mjs`、`/public/*.timestamp-*`，`.dev.vars` 保留追踪但内容转向 env 注入
2. 清理根目录构建残留文件
3. 建立 `docs/` 收纳历史审计文档，从仓库根迁走

### Phase 2 — 密钥与配置收敛（消除 P0）
1. 新建 `src/config/env.js` 统一读环境变量，TMDB key 只留在 `.dev.vars` + wrangler `[vars]`
2. vite.config.ts 的 TMDB/Spotify 常量改为 `loadEnv` 读取
3. worker.js 里内联 key 全部改为 `env.TMDB_API_KEY` / `env.SPOTIFY_ANON_KEY`
4. identify 业务逻辑抽成独立模块 `src/identify/`（纯函数，dev/prod 共用）
5. vite.config.ts 中间件改为 import 该模块；worker.js 同步 import
6. 部署后验证：无 code 内联 key，构建产物 grep 不到密钥

### Phase 3 — 组件拆分（消除 P1 巨型文件）
1. VideoDetailView 1835 行 → 按区块拆（信息区/播放器/相关推荐/评论）
2. Sidebar 946 行 → 按分组拆
3. UploadView / ShopManageView 同理渐进拆分
4. 每拆一块跑一次 build + 手动回归

### Phase 4 — 行为对齐与清理
1. dev/prod identify 行为 diff 测试：同一文件名，两套实现输出一致
2. console 日志策略：改 `drop` 为仅 prod 过滤，保留错误日志
3. 全域 API 调用核查：所有请求收敛到 api/index.js

## 四、验证基线（重构期间实时回归）

```bash
npm run dev      # 本地 5173，login 重写 + /api 代理
npm run build    # 构建必须零错误
curl localhost:5173/login → 200
curl localhost:5173/api/identify (POST) → 业务验证
```