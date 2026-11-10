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

## 已修的

- API 四份报告的 P1/P2 全部处理，状态见 `API-FIX-STATUS.md`
- full-review-data 的 5 条 + 5 条 P1/P2：下单失效打空、我的店铺被全站数据填充、
  订单页双拉、上传/删除/转账/片单的缓存失效
- full-review-pages 的 5 条 P2：悄悄话发给列、用户详情胡萝卜、订单备注删除接口、
  片单每页条数、歌曲评分显示
- full-review-ux 的 9 条必须改：卡中卡、表格主操作被压成灰字、两页表头错位、
  表格内输入被撑宽、术语混用、卡内表格缩进、图片兜底、⌘K 快捷键

## 还没修的

**需要设计决策的**
- 搜索框与筛选组在全站有 7 种排法（`.tabs` 与 `.seg` 也随页面摇摆）——统一要动 10 个页面

**P3 里值得做但没做的**
- 越界页码：`/library?page=2` 伪装成「片库为空」、`/lines?page=2` 整页空白
- 空态文案不区分「库是空的」与「筛选没命中」（4 个页面）
- 概览的「继续观看」「我的近况」错误态没有重试
- 破坏性动作缺确认：单设备下线、撤回认领

**mock 缺口（影响以后的可验证性）**
- 概览两块数据源、`DELETE /api/watch/{id}`、`whisper` 三件套、`media/restore` 等
- 若干列表接口忽略了筛选参数：`/api/watch` 忽略 type/name、`/api/seek` 忽略
  video_title/video_type/upload_self、`/api/music/song/list` 忽略 has_media/is_favorite
