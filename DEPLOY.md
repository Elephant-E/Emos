# EMOS Worker 部署指南

## 项目结构

```
emos/
├── emos-vue/              # 前端项目
│   ├── worker.js          # Worker 模板（包含 API 代理逻辑）
│   ├── build-worker.cjs   # 构建脚本（生成 worker-with-assets.js）
│   ├── wrangler.toml      # Wrangler 配置
│   └── ...
└── .gitignore
```

## 工作原理

1. **前端构建**：`npm run build` 生成 `dist/` 目录
2. **Worker 生成**：`node build-worker.cjs` 将静态资源嵌入到 Worker 中
3. **API 代理**：Worker 将所有外部请求转发到对应的服务
4. **SPA 路由**：非静态资源路径自动回退到 `index.html`，避免 1101 错误

### 代理路由

| 路径 | 目标服务 | 用途 |
|------|---------|------|
| `/guessit/*` | `https://elephant.pythonanywhere.com` | 文件名解析 |
| `/tmdb-image/*` | `https://image.tmdb.org/t/p/*` | TMDB 图片（海报/背景） |
| `/youtube/*` | `https://www.youtube.com` | YouTube 视频播放 |
| `/api/video/trailer` | `https://api.themoviedb.org/3/*/videos` | TMDB 预告片 |
| `/api/*` | `https://emos.best` | EMOS 业务 API |
| `/tmdb/*` | `https://api.themoviedb.org` | TMDB API（备用） |

## 部署步骤

### 1. 登录 Cloudflare

```bash
cd emos-vue
npx wrangler login
```

### 2. 构建并部署

```bash
npm run deploy
```

这会执行：
- `npm run build` - 构建前端
- `node build-worker.cjs` - 生成 Worker
- `wrangler deploy` - 部署到 Cloudflare

### 3. 验证部署

访问你的 Worker URL（例如：`https://emos.your-subdomain.workers.dev`）

## 本地开发

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173`

### 本地测试 Worker

```bash
npm run build:worker
npx wrangler dev
```

## 关键特性

### ✅ API 代理

所有 `/api/*` 请求自动转发到 `https://emos.best`，无需在前端配置 CORS。

### ✅ SPA 路由支持

- `/` → `index.html`
- `/login` → `login.html`
- `/media`, `/shop` 等 → `index.html`（Vue Router 处理）

### ✅ 避免 1101 错误

通过 SPA 路由回退机制，确保所有未知路径都返回 `index.html`，而不是 404。

### ✅ 静态资源缓存

所有静态资源设置 `Cache-Control: public, max-age=86400, immutable`

## 注意事项

1. **不要直接访问界面路径**：Worker 会自动处理 SPA 路由，不需要手动配置每个路径
2. **API 请求必须使用相对路径**：前端代码中使用 `/api/xxx`，不要使用完整 URL
3. **构建产物已忽略**：`worker-with-assets.js` 和 `dist/` 已在 `.gitignore` 中

## 故障排查

### 问题：部署后访问页面显示 404

**原因**：SPA 路由未正确配置

**解决**：检查 `worker.js` 中的路由回退逻辑，确保包含所有需要的路径

### 问题：API 请求失败

**原因**：API 代理配置错误

**解决**：
1. 检查 `worker.js` 中的 `handleApiProxy` 函数
2. 确认目标 URL 是 `https://emos.best`
3. 查看 Worker 日志：`npx wrangler tail`

### 问题：构建失败

**原因**：依赖缺失或版本冲突

**解决**：
```bash
rm -rf node_modules package-lock.json
npm install
npm run build:worker
```
