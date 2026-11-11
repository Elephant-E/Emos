# 审查记录索引

| 文件 | 范围 | 结论 |
|---|---|---|
| `api-video.md` | 视频域 17 个端点 | 逐条核对请求/响应字段 |
| `api-user.md` | 用户与账号域 25 个端点 | 4 个 P1 |
| `api-shop.md` | 商业域 26 个端点 | 502 假失败的定性 |
| `api-content.md` | 内容域 24 个端点 | 5 个 P1 |
| `API-FIX-STATUS.md` | 上面四份的逐条追踪 | 70 项的处理状态 |
| `full-review-pages.md` | 21 个页面逐页功能与状态 | P1 0 / P2 5 / P3 51 |
| `full-review-data.md` | 数据流与缓存一致性 | 5 个失效缺失 |
| `full-review-ux.md` | 交互与视觉一致性 | 9 条必须改 |
| `refactor-audit-code.md` | 代码：垃圾代码 / 补丁 / 重复逻辑 / 死代码 | 必须 13 / 建议 20 / 可不管 11 |
| `refactor-audit-ui.md` | UI：重复实现与补丁式样式 | 价值高 8 / 价值中 12 |
| `refactor-audit-api.md` | 字段：类型 ↔ 真实返回逐条核对 | 3 个幽灵字段 + 4 个复合类型 |
| **`refactor-closeout.md`** | **上面三份的处理结果与「刻意不做」清单** | **先看这一份** |

## 当前有效的报告（`docs/review/`）

按「现在还需不需要看」分两类。上面表格里的是仍在使用的；
其余按轮次的审查记录移到 `docs/review/archive/`，只作历史留档 ——
其中的结论大半已经落地或失效（例如暂存区后来整体删除，相关条目自然作废），
**不要照着 archive 里的清单改代码**。

`docs/review/archive/` 里是 20 份按轮次的记录：`function` / `interaction` /
`motion` / `ia` / `fields` / `api-round3·5` / `ui-round2·5·6` / `refactor-round1`
及其后续轮。

## 已修的

- API 四份报告的 P1/P2 全部处理，状态见 `API-FIX-STATUS.md`
- full-review-data 的 5 条 + 5 条 P1/P2：下单失效打空、我的店铺被全站数据填充、
  订单页双拉、上传/删除/转账/片单的缓存失效
- full-review-pages 的 5 条 P2：悄悄话发给列、用户详情胡萝卜、订单备注删除接口、
  片单每页条数、歌曲评分显示
- full-review-ux 的 9 条必须改：卡中卡、表格主操作被压成灰字、两页表头错位、
  表格内输入被撑宽、术语混用、卡内表格缩进、图片兜底、⌘K 快捷键

## 第二轮补完的

- 越界页码：`/library?page=2` 与 `/lines?page=2` 现在显示「这一页没有内容 +
  共 N 条」，并保留分页器
- 空态文案按筛选状态分：片单（搜索/我创建的/我订阅的）、求片（搜索/我认领的/
  类型）、回收站（搜索）、商城（搜索/分类）
- 概览「继续观看」「我的近况」错误态换成 bare ErrorBlock，带重试
- 工具栏顺序统一：视图 tab → spacer → 搜索 → 筛选 → 操作
- 单设备下线、撤回认领补二次确认
- 直播切频道重置源页码；片单「添加影片」弹窗不再与页面筛选共用搜索词
- 演职员岗位加了中文映射（Director → 导演 等）
- mock 补齐 12 个缺失接口（概览两块数据源、whisper 三件套、回收站资源列表与
  恢复、片单删除、求片详情与催片、用户原图与 Telegram、音乐片单移除）

## 还没修的

**列表接口的筛选参数在 mock 下不生效**，让「筛选是否真的生效」无法验证：
- `/api/watch` 忽略 type / name
- `/api/seek` 忽略 video_title / video_type / upload_self
- `/api/music/song/list` 忽略 has_media / is_favorite
- `/api/video/list` 忽略 only_delete

这些在真机上是好的（契约有、后端也认），只是 mock 没实现，属于测试基础设施。

**纯体验层面、优先级低的**
- 空态内容丰俭不一（只有媒体库有 hint + 清空按钮）
- 加载态有三套写法（LoadingBlock / skeleton / 「加载中…」文字）
- 「⋯」的 opacity 0.55 偏淡
- 状态视觉三套（badge / 纯文本 / chip）
- 站内跳转两处用了裸 `<a>`（会整页刷新）

## 重构阶段（三份 refactor-audit）

- 「必须」「价值高」「价值中」全部处理完，新增 14 个复用单元，
  修掉 15 个真 bug（含 3 个数据错误、2 个键盘不可达、2 个「写了但一直没生效」的样式）
- **处理结果与「刻意不做」的理由见 `refactor-closeout.md`** ——
  里面列的那些不要再当成待办重新讨论
