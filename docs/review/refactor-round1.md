# 全量重构验收（第 1 轮）

基线 `a79b2a2` → 当前 `a5da466`，共 23 个提交。

## 一、垃圾清理

| 类别 | 处理 |
|---|---|
| 未使用的图标导出 | 删 9 个（IconChart/Panel/Sort/ArrowDown/Export/Calendar/Carrot/Layers/Clock） |
| 未使用的工具函数 | 删 `formatCount`，合并 `asOneOf` 重复定义 |
| 未被引用的 CSS 类 | 删 14 个（.cards--1/.quick/.com-zone/.dim/.note-block/.text-quiet/.th-sort 等） |
| 死逻辑 | 删 AccountView 里打不开的转赠模态（3 个 state + mutation + Modal） |
| 死选择器 | 删 `.th-sort[aria-sort] svg` 孤儿选择器（已与 `.table tbody td` 拼成选择器列表） |
| 重复 CSS 规则 | 合并 `.rail__foot`、`.login__panel`、`.confirm` 三处被覆盖的定义 |
| 过程性注释 | 1 处改为陈述事实 |

## 二、API 对齐（本轮修复）

| 端点 | 问题 | 状态 |
|---|---|---|
| `/api/ban/change` | `type` 应为 `unblock` 而非 `enable`，解除封禁必然失败 | 已修 |
| `/api/ban/change` | `unblock` 缺 `reason` → 422 | 已修（reason 有默认值） |
| `/api/upload/store/archive` | 缺 `item_type`/`item_id` → 422 | 已修（先选影片再归档） |
| `/api/user/sign` | 缺可选 `content`，白丢随机奖励 | 已修 |
| `/api/user/sign` | 429「重复签到」被当作故障 | 已修 |
| `/api/shop/product/list` | 未传 `seller_id`，与分类/店铺口径不一致 | 已修 |
| `persons` 头像 | 影片域读 `image_profile_url`（不存在），应用 `image_profile` 拼 CDN | 已修 |
| `/api/user/passwordTemporary` | `password` 可为 null，页面渲染出「null」 | 已修 |
| `ban/list` | 文档称「只显示最近一周」，据此推出「正常」不成立 | 改为「未在封禁记录」 |

### 字段充分使用（本轮补上）

| 字段 | 用途 |
|---|---|
| `season.episodes_count` | 季下拉显示「第 3 季（16 集）」 |
| `episode.date_air` | 当前集显示上映日期 |
| `episode.episode_description` | 当前集显示简介（3 行截断） |
| `video.genres` | 媒体库列表的片名副标题 |
| `user.server_video/live/music` | 账号页「客户端登录」三个可复制地址 |
| `user.password` | 同上，登录密码 |
| `user.is_original_image` | 高清海报开关 |
| `user.telegram_*` | 绑定状态与解绑入口 |
| `episode.medias_count` | 集数字格子的绿点（有资源） |

## 三、UI / 交互

| 项 | 处理 |
|---|---|
| 危险动作 4 种样式 | 统一 `.btn--danger-text`；表格内静止灰、hover 红（成列红是噪音） |
| 忙碌态 | 表格行删补 `disabled`，避免连点 |
| 弹层宽度 6 档 | 收敛为 400 / 460 / 560 三档 |
| Esc 嵌套 | 确认框 `stopImmediatePropagation`，Modal 在确认框打开时不响应 |
| 危险确认框焦点 | 默认落在「取消」 |
| 错误提示双发 | 删掉两处局部 `onError`，透传后端 message |
| 切换筛选静默 | `.is-stale` 旧数据变暗（0.72）+ 新数据淡入 |
| 季与集撑高页面 | 季改下拉、集改固定高度数字网格（12→500 集高度不变） |
| 面包屑不可点 | 首段按分区名映射到列表路由 |
| 侧栏账号栏滚动 | 中段滚动、品牌/搜索/账号固定 |
| 菜单只能点按钮关 | 补 document mousedown + Esc |
| 头像只渲染首字 | `<Avatar>` 真图 + 失败回退 |
| 裂图 | `<Poster>` 全站 11 处，失败退首字方块 |
| 表格溢裁操作列 | 4 张表改 `table-layout: fixed` |
| 表头与单元格错位 | 片单删掉错位的「作者」列 |
| 42px 中文截断 | 状态词用 `.stat__word` 24px |
| 状态点滥用 | 12 处里 10 处是静态事实，改 `.head-note` 无点 |
| 权限说明悬空 | 从工具栏下方改到「操作」列表头下 |
| 转赠无入口 | 移到资金页胡萝卜 tab，手写分页换 `<Pager>` |

## 四、浏览器实测

15 个路由逐页跑：**裂图 0、表格溢出 ≤0、42px 超标 0**。

写操作实测（片单增删闭环）：
```
新建「QA临时片单待删」→ 列表出现 → 删除 → 确认框（0 部影片 / 槽位会释放）→ 列表消失
```
测试数据已清理。

控制台错误仅 17 条，全部是 `files.emosstore.sbs` 图片域不可达（本机 DNS 把该域解析到 198.18.0.181 保留段），`<Poster>` 已兜底为首字方块，无 JS 异常。

## 四之二、第二轮补充（本轮）

| 项 | 处理 |
|---|---|
| 线路筛选在 state | page/size/q 进 URL，实测刷新后搜索保留 |
| 商城分页/类目在 state | page/category 进 URL；手写分页换 `<Pager>` |
| 弹层回车不能提交 | Modal 加 `onSubmit`，已接 5 个创建/编辑弹层 |
| 线路 tagline 后端必填但 UI 可选 | 实测缺省/空串均 422，改为三项必填 |
| 无分类时新增商品必然 422 | 无分类时禁用新增并给 title 提示 |
| 片单名后端要求 ≥2 字符 | 前端同步校验 |
| 订单/求片空态无出口 | 各补一句可执行下一步 |

### 第二轮补充之二

| 项 | 处理 |
|---|---|
| 弹层回车 | 再接入 直播频道 / 直播源 / 商品保存 / 签到 / 回复悄悄话，共 10 个 |
| 单一路径 | 内联 mutate 抽成 submitXxx，onSubmit 与按钮共用，避免行为分叉 |

### 本轮误操作（需告知用户）

用 `DELETE /api/user/telegram` 做「方法是否存在」探针时**真的解绑了账号的 Telegram**。
当前状态：`telegram_user_id: null`，`telegram_bind_url: https://t.me/emospg_bot?start=bind_2o0bMmyb6B`。
账号页已正确显示「未绑定 / 去绑定」。重新绑定需在 Telegram 里打开该链接。
教训：写接口（尤其 DELETE）不能当探针用。

## 四之三、第三轮：方法学级核对

对 `endpoints.ts` 里全部 **132 个端点**（106 个写 + 26 个读）做了 method 一致性验证：
对每个端点用 GET 探针打过去，读 405 响应里的 `Supported methods:` 与服务端声明的
真实方法比对。

结果：**0 处不一致**。所有声明的方法都与后端一致。

### 本轮删除

| 项 | 数量 |
|---|---|
| 无人引用的 query hook | 7 个（useIsAdmin/useMyWatchlists/usePlayingNow/useRankUpload/useSeekOpen/useZoneCounts/useMyWatchlistRecent） |
| 因此失效的 query key | 3 个 |
| 无人引用的图标 | 9 个（上一版正则只匹配 `export function`，漏了 const 箭头函数） |
| 无人引用的响应类型 | 5 个 |
| 残留常量 | ZONES（侧栏内容分区删除后遗留） |
| 残留 CSS 类 | .cell-sub / .com-zone |

### 关于 endpoints.ts 里未触达的 78 个封装

保留了。它们属于类型化 API 客户端覆盖面（lottery / redPacket / reel / pay 等客户端功能），
不是「写坏了的死代码」；删掉会丢失后续接入所需的类型定义。已在文档中记录为已知取舍。

## 四之四、第四轮

| 项 | 处理 |
|---|---|
| `/users` 整页只有一个输入框 | 改成「用户」列表页：工具栏按 ID 查详情 + 完整封禁表（用户/原因/时间/解除），四态齐全 |
| 页头「封禁列表」「全部」都链回 /users 自己 | 随改版一并去掉自链 |
| 「添加影片」搜索框承诺「回车搜索」但没接回车 | 该搜索是输入即查，去掉承诺 |
| 过程性注释 | 1 处改为描述行为 |

### 全局验收（本轮复测）

15 个路由 + 登录页 + 6 个详情页：
**裂图 0 · 表格溢出 ≤0 · 42px 超标 0 · 错态 0 · H1 全部存在**。

## 四之五、第五轮：mock 模式验证权限分支

收到「权限分支需要有普通用户 token 才能验证」的结论后，改用仓库自带的 mock 模式
（`VITE_MOCK=1`，非管理员账号 `roles: []`，且数据里同时含本人与他人的记录）验证。

| 页面 | 验证结果 |
|---|---|
| /watchlists | 他人片单行显示「只读」✓ |
| /live | 他人频道行显示「只读」，表头有「他人创建」说明 ✓ |
| /media/:id（资源行） | 他人上传显示「只读」✓ —— 此前**无权限判断，任何人可重命名他人资源** |
| /media/:id（字幕行） | 同上，此前同样无判断 ✓ |
| /account | 非管理员正常显示权限四项与客户端地址 ✓ |

顺带修正 mock 数据：直播源状态枚举写的是 `ok`，真实接口是 `normal`/`error`。

## 四之六、最终验证清单

| 检查项 | 结果 |
|---|---|
| `tsc --noEmit` | 0 错误（`noUnusedLocals` 开启，等于没有未使用的局部变量） |
| `npm run build` | 通过 |
| TODO / FIXME / console.log | 0 / 0 / 0 |
| 端点 method 一致性 | 132 / 132 通过 |
| 15 个路由渲染 | H1 全部存在、裂图 0、表格溢出 ≤0、错态 0 |
| 登录页 | 海报墙、胶片格、令牌登录全通 |
| 6 个详情页 | 影片/片单/歌曲/用户/资金 tab/查用户 全部渲染 |
| 权限分支（mock 非管理员） | 片单/直播/资源/字幕四处「只读」正确 |
| 写操作闭环 | 片单新建→删除、线路新建→删除、直播频道新建→删除，测试数据均已清理 |

### 累计

```
42 个提交 · src 9676 行
```

## 五、仍未解决

| 项 | 原因 |
|---|---|
| 筛选未进 URL（线路、商城） | 刷新/分享丢状态，属结构性改动，未动 |
| 概览四张卡仍同权 42px | 已加 `.card--secondary` 30px 档，但概览未全部套用 |
| 弹层回车不能提交 | 需给 Modal 加 `onSubmit`，26 处逐步接入 |
| `?tab=carrot\|ban` 旧书签 | 静默降级到「资料」，全仓无此链接 |
| 非管理员权限分支 | 无普通用户 token，只读/只读说明无法真机验证 |
| 支付模块 | 该实例未部署，`/api/pay/base` 404 |
