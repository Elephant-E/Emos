# 第四轮 · 展示层字段语义审查

审查对象：`src/lib/format.ts`（6 个函数）、`src/views/*.tsx`（21 个视图的数据展示位）、`src/components/Pager.tsx`
证据源：`docs/api-shapes.md`（真实响应样例）、`api.postman_collection.json`（**字段说明的唯一契约**）、`docs/WIKI-NOTES.md`
HEAD：`1361bcc`。只读，未改 `src/`。

> **并行改动提醒**：审查期间工作区已有未提交修改，且**正好命中本报告的 ④ 号问题**——`format.ts:13-16` 的 `formatSize(0)` 已改为返回 `0 B`（注释也写明了理由），`OverviewView.tsx:175` 的兜底随之简化。下面凡是涉及此处的已标注 *(已修·未提交)*。报告其余结论仍按当前 HEAD 判定。

> 边界说明：字段**是否存在/类型是否匹配**是 reviewer-func 的 fields-round4 的范畴。本文凡涉及"字段不存在导致展示错误"的（如基金订单的 `carrot`），我按**用户看到的后果**记录，并标注 `⌁ 与 fields-round4 交叉`，不重复做存在性核查。

---

## 0. 结论先行

1. **有一句界面文案是恒假的**：概览问候语「今天还没看片，要不要挑一部～」（`OverviewView.tsx:76`）。它依赖 `stats.data?.byDate[今天]`，而 `/api/user/stats/video/history` 在 Postman 里明确写着「**只可查今天之前的数据**」。今天的数据永远取不到 → 无论你今天看了多久，这句话都成立。
2. **「钱」相关的三个数字，单位全是猜的**：支付服务商的「累计收入/支出」标的是**胡萝卜**（字段文档只写"总收入/总支出"，而同一服务族的 `price_order` / `tier_price` 都按**元**计）；订单「金额 100」、商品「价格 100」、支付订单「订单金额」全都没有货币符号。用户无法判断 100 是 ¥ 还是 🥕。
3. **`format.ts` 的六个函数里，有四个在边界上是错的或会误导**：`formatSize(0) → '—'`（"0 字节"与"未知"不可分）、`formatRelative(未来时间) → '刚刚'`、`formatDateTime` 丢年份、`formatCount` 是一次都没被调用过的死函数。

---

## 1. `src/lib/format.ts` 逐函数审查（Q1）

| 函数 | 签名与假设 | 实际输出语义 | 边界行为 | 判定 |
|---|---|---|---|---|
| `formatCount` `:1` | `(n) → {value, unit}`，假设调用方要"万/亿"压缩 | 返回 `{value:'12', unit:'万'}`，**把单位拆成两段** | 负值走 `Math.abs` 判断但输出保留负号 ✓ | **死代码**：全仓 0 引用（`grep formatCount` 只有定义处）。有"亿/万"压缩能力却没人用 |
| `formatThousand` `:8` | `(n) → string`，假设 n 是可数数字 | `12,345`；null/undefined/NaN → `—` | 负数 → `-1,234` ✓；0 → `0` ✓（与 `—` 可区分）；超大 → `1,000,000,000` 不压缩 | **基本正确**。唯一问题：它不认识单位，所以调用方各写各的量词（见 §3.1） |
| `formatSize` `:13` | `(bytes) → '1.5 GB'`，假设 0 表示"没有" | 现为：`null/undefined/NaN → '—'`，`≤0 → '0 B'` | 0 与未知**已可分** *(已修·未提交)*；仍缺：负数被当成 `0 B`（应该是 `—`）、1024 TB 以上不升 PB（`2048 TB`）、`<10` 且非 B 保留 1 位小数（`1.5 GB`） | **已基本修好**。剩两个小口子：负数、PB |
| `formatDateTime` `:27` | `(iso) → 'MM-DD HH:mm'`，假设输入是 datetime | **无年份**；对 `2026-02-28T13:51:54.000000Z` 正确转本地（+08 → 21:51）✓；对 `'2026-02-28 21:51:58'`（无 Z）按本地解析 ✓ | ① 跨年同日不可分（2025-11-05 与 2026-11-05 都是 `11-05`）；② **date-only** 输入（`'2026-08-02'`）被当 UTC 零点 → 显示 `08-02 08:00`（凭空多出 08:00）；③ 非法值原样返回字符串（会把 ISO 串直接甩到界面上） | **两个缺陷**：无年份、不区分 date-only |
| `formatRelative` `:35` | `(iso) → '9 小时前'`，假设"过去" | 刚刚 / N 分钟前 / N 小时前 / N 天前，>30 天退回 `formatDateTime` | ① **未来时间 → `刚刚`**（`Math.max(0, Date.now()-then)` 把负差钳成 0）；② >30 天丢失年份；③ <1 分钟 → `刚刚`（合理） | **有隐患**：今天的调用点全是过去时间所以没炸，但 `upload_expired_at` / `time_expired` / `expired_at` 这三个**未来字段**一旦被它格式化就永远是「刚刚」 |
| `realmOf` `:92` | `(carrot: number)`，假设 ≥0 | `{name:'元婴初期', next:20000}` | 负数：`findIndex` 返 -1 → `REALMS[-1]` undefined → 回退到"凡人期" ✓、`next: null` ✓；`null/undefined` **会崩**（`carrot >= floor` 对 undefined 恒 false → 走到最后一项，实际不会崩但是"凡人期"） | 可接受；`next` 语义 = 下一个境界门槛（不是差值），概览自己算差值 ✓ |

### 1.1 建议的具体实现

```ts
// 1) formatSize：0/未知已分开（工作区已修）；补完负数与 PB
export function formatSize(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes < 0) return '—'        // ← 负数目前被显示成 '0 B'
  if (bytes === 0) return '0 B'    // ← 已修
  const units = ['B','KB','MB','GB','TB','PB']   // ← 补 PB
}

// 2) formatRelative：补未来分支，且 >30 天带上年份
if (diff < 0) {
  const abs = -diff, d = Math.floor(abs / 86400000)
  if (d >= 1) return `${d} 天后`
  return `${Math.max(1, Math.floor(abs / 3600000))} 小时后`   // 或直接走 formatDateTime
}

// 3) formatDateTime：可配置是否带年份；date-only 不补时间
export function formatDateTime(iso, opts?: { withYear?: boolean }) {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  if (isDateOnly) return iso            // ← 别把 2026-08-02 变成 08-02 08:00
  ...
  return `${opts?.withYear ? `${d.getFullYear()}-` : ''}${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
```

---

## 2. 按页面：问题清单（现象 → 用户误读 → 建议）

### 2.1 概览 `/`

**① 问候语恒为「今天还没看片」** `OverviewView.tsx:71-76`（数据来源 `queries.ts:111-140`）
- 现象：右上角 13.5px 灰字永远是「今天还没看片，要不要挑一部～」。
- 误读：**"我今天确实没看"**。实际是后端不给今天的数据（Postman：`/api/user/stats/video/history`「只可查今天之前的数据」），前端却照常请求了含今天的 7 天。两种后端行为都会导致同一结果：要么今天那条静默返回空（→ `byDate[今天]` 恒 0），要么整个 7 天请求被 422 打回（`WALKTHROUGH.md:42` 已把 422 列为该接口的已知失败）——**两种情况下这句问候语都恒真**。
- 改法：`dates` 从今天改为**昨天往前 7 天**；文案改成「昨天看了 42 分钟」而不是「今天」。若坚持要"今天"，必须换用 `recordApi.list`（实时记录里有 `play_seconds`）来算。

**② 「本周」不是本周** `OverviewView.tsx:285`
- 现象：「本周 3 天有观看，共 42 分钟」。
- 误读：用户以为是**周一到今天**（周一早上看到"3 天"会觉得离谱）。实际是**滚动的 7 天窗口**（`queries.ts:116-123`），周日会横跨两个自然周。
- 改法：文案改「近 7 天」；若要真「本周」，按 `d.getDay()` 截断到今天。

**③ 42 分钟是"实看"还是"内容时长"** `OverviewView.tsx:285` 用 `totalSeconds`（= 求和 `video_watch_second_real`）
- 现象：2 倍速看 30 分钟剧，界面显示 30 分钟；但 API 同时给了 `video_watch_second_content`（样例：real 1622 / content 2257，差 1.4 倍）。
- 误读：用户拿它当"我看了多少内容"，与客户端统计对不上。
- 改法：文案写「实看 42 分钟」，或一并显示「内容 58 分钟」。

**④ 继续观看的「18%」是一个没有名词的百分比** `OverviewView.tsx:231`
- 现象：行尾一个孤零零的 `18%`，前面是进度条。
- 误读：不确定是"看完 18%"还是"剩余 18%"。
- 改法：`已看 18%`，或 `18% · 剩 12 分钟`（`media_seconds - play_seconds` 已有）。

**⑤ 0% 的条目会出现在「继续观看」里** `queries.ts:160-169` + `OverviewView.tsx:203-206`
- 现象：接口样例里就有 `play_seconds: 0, media_seconds: 1385, is_complete: false`（Postman 观影记录/我的片单样例），前端只按 `!is_complete` 过滤 → 渲染成一条 0% 的空进度条。
- 误读：「我明明没开始看，为什么它说我在继续观看」。
- 改法：`filter(row => Number(row.play_seconds) > 0 && !row.is_complete)`。

**⑥ 「我的上传 29 TB 累计」** `OverviewView.tsx:173-177`
- **字段语义（回答 Q2）**：Postman `/api/user` 描述原文是「`size_upload` **上传总量** 字节」。所以**「累计」是对的**，用户理解为"我一共上传了 29TB"是符合字段的。
- 真正的问题在**另一处**：账号页把同一个数写成「**已占用** 30,417,152 MB」（`AccountView.tsx:118`）。「已占用」暗示**有配额上限**（→ 用户以为快满了），而字段没有 quota 语义；且单位固定 MB，29TB 会渲染成 8 位数，与概览的「29 TB」完全对不上。
- 改法：账号页改成 `上传总量 29 TB`（复用 `formatSize`），删掉"已占用"三个字。

**⑦ 历史记录的日期是字符串切片** `OverviewView.tsx:295`（`:344` 同）
- 现象：`String(row.created_at).slice(5,10)` → `01-25`。
- 误读：无年份（跨年不可分）；且 ISO 串的日期是 UTC，在 +08 时区的凌晨会显示**前一天**。
- 改法：`formatDateTime(row.created_at, { withYear:true })` 或专门的 `formatDate`。

**⑧ 「我的近况」里混着胡萝卜流水** `OverviewView.tsx:290-300`
- 现象：观看统计卡底部接 3 条胡萝卜变动（"系统手续费 −2"）。
- 误读：以为是"观看消耗的胡萝卜"（位置就在观看统计下面）。
- 改法：移到资金页，或加分隔标题「胡萝卜变动」。

**⑨ 待办卡把「缺失」和「0」分开处理了，但链接目标是空的** `OverviewView.tsx:44-48`
- 现象：「封禁中用户」卡链到 `/account?tab=ban`，但账号页的 tab 栏现在只有「资料 / 邀请」（`AccountView.tsx:24-27`）→ 落在一个**没有任何 tab 处于选中态**的页面。
- 误读：「我点进来的是一个不存在的页面」。
- 改法：`ban` 区块要么补回 tab，要么把链接改到 `/users?filter=banned`。

### 2.2 媒体库 `/library`

**⑩ 「209,486 部」里的「部」混装了两种东西** `LibraryView.tsx:45`（回答 Q2）
- 现象：页头 hint「209,486 部」。而 `videoApi.list` 的 `total` 是**视频条目数**：一个 movie = 1 条，一部剧（tv）= **1 条**（季/集是子对象，见 Postman 视频列表示例：`video_type:"tv"`, `parts_count:0`, `medias_count:1`）。
- 误读：用户会理解成"能看的片子有 20 万部"，于是推算"一部剧几十集 → 内容量上千万"；但页面上另一处「资源 N 个」又是片源数，两个量纲在同一个屏幕里并存。
- 改法：① 准确写法是分列：`电影 12,345 · 剧集 5,678`（`useZoneCounts` 已在 `queries.ts:180` 现成，只算 total 不用）；② 若保持单一数字，文案改「20 万 条影片记录」或加 tooltip「剧集按套计」。
- 同类：`WatchlistDetailView.tsx:55/217`「部」、`WatchlistsView.tsx` 用「个」——**同一个实体三种量词**。

**⑪ 资源列「3 个 · 字幕 2」** `LibraryView.tsx:155`
- 现象：一格里两个数字，只有一个带单位。
- 误读：「3 个」是什么的个？（片源/文件/版本？）「字幕 2」是 2 条字幕还是 2 种语言？
- 改法：`3 资源 · 2 字幕`，或拆成两列。

**⑫ 求片列「5 人求」** `LibraryView.tsx:161` — ✓ 这个写得好（有量词、有对象），可作全站模板。

### 2.3 影片详情 `/media/:id`

**⑬ 五个"统计"里三个是内部 ID** `VideoDetailView.tsx:157-184`
- 现象：`#1234`（系统 ID）/ `toDB` / `TMDB` / 资源 / 字幕，五个 19px 等权。
- 误读：用户以为「toDB 1000」和「资源 3 个」是同一层级的信息。实际上前者是内部主键，后者才是内容量。
- 改法：资源/字幕保留 19px；三个 ID 降为一行 12px mono 脚注。

**⑭ 空值兜底不一致** `VideoDetailView.tsx:157-184`
- 现象：`{video.tmdb_id ?? '—'}` 有兜底，而 `{video.todb_id}`、`{video.medias_count}`、`{video.subtitles_count}` **没有** → 字段为 null 时那一格是**纯空白**。
- 误读：空白 = 页面上没有这一格，或以为是渲染 bug。
- 改法：统一 `fmt(v)`。

### 2.4 片单 `/watchlists`、片单详情 `/watchlists/:id`

**⑮ 更新列用相对时间** `WatchlistsView.tsx:158`、`WatchlistDetailView.tsx:107`
- 现象：`3 天前`。
- 误读：做片单运营时要判断"最近维护过没有"，相对时间够用；但详情页把它放在 `.detail-stat b`（19px 加粗）当 KPI，读感像"更新时间是一个指标"。
- 改法：详情页改绝对时间；列表页保留相对时间 + `title` 属性给绝对时间。

**⑯ 排序值 80 直接展示** `WatchlistDetailView.tsx:186`
- 现象：`排序` 列显示 `80`。
- 误读：80 满分？80 是位置？
- 改法：只显示相对次序（1/2/3），或隐藏该列。

### 2.5 求片 `/seek`

**⑰ 悬赏 0 被显示成「—」，且没有单位** `SeekView.tsx:133`
- 现象：`{item.seek_carrot || '—'}`。Postman 样例里 `seek_carrot: 0` 是常态（默认没悬赏）→ 整列基本全是「—」。非 0 时显示 `120`，**没有「胡萝卜」三个字**。
- 误读：①「—」会被读成"没有这个字段/取不到"，而实际是"悬赏 0"；② `120` 会被读成"120 人"或"120 积分"。
- 改法：`seek_carrot === 0 ? '无悬赏' : `${seek_carrot} 🥕``（或用 `carrot` 文案）；`?? ` 而不是 `||`。

**⑱ 「更新」列是相对时间，「上传期限」是绝对时间** `SeekView.tsx:134` vs `:212`
- ✓ 这个区分是对的（未来的期限用绝对时间）。可作为反例正面案例：**相对时间只用于过去、不用于期限**。

### 2.6 上传 `/upload`

**⑲ 进度只有百分比，没有已传/总量** `UploadView.tsx:177`、`:206`
- 现象：进度条 + `47%`；旁边只有整个文件大小（`formatSize(item.file.size)`）。
- 误读：大文件上传卡住时，用户无法判断"是没动还是慢"。
- 改法：`1.2 GB / 4.5 GB · 47%`。

**⑳ 暂存区大小列** `UploadView.tsx:259` — `formatSize(file.file_size)`，0 字节 → `—`（见 §1）。可接受但受 `formatSize(0)` 缺陷影响。

### 2.7 账号 `/account`

**㉑ 「已占用 X MB」= 上传总量，不是配额** `AccountView.tsx:118`（见 2.1⑥）
- 这是本轮**最容易被误读的一句文案**：它同时错在单位（固定 MB）和措辞（暗示配额）。

**㉒ 胡萝卜/封禁 两个区块在 URL 上可达但 tab 栏没有** `AccountView.tsx:24-27` vs `:364`/`:432`
- 现象：`/account?tab=carrot` 会渲染「当前余额 / 转赠 / 变化记录」，但顶部的 tab 条只有「资料 / 邀请」，两个都不高亮。
- 误读：页面看起来"没选中任何 tab"，用户不知道怎么回去。
- 附带：`?tab=carrot` 的余额+流水与资金页「胡萝卜」tab **完全重复**（`FundView.tsx:13-64`）。

**㉓ 「片单槽位 2 · 邀请名额 不限」** `AccountView.tsx:106-108`
- ✓ 单位与 `不限` 的处理都对。

### 2.8 商城 `/shop`

**㉔ 价格没有货币符号** `ShopView.tsx:140`
- 现象：`{product.price ?? '—'}` → `100`。
- 误读：100 元？100 胡萝卜？（对照 Postman：商品 `price:100`，而基金 `tier_price:1` 对应文案「兑换最高 **1¥** 补贴」→ 这一族字段是**元**）。
- 改法：`¥100`（`price` 为 0 时显示「免费」，不要 `?? '—'`，因为 0 是有效价格）。

**㉕ 原价 `price_origin` 在列表里根本不显示** `ShopView.tsx:140-142`
- 现象：表头只有「价格 / 库存 / 销量」。
- 误读：看不到划线价，无法判断是否在促销。
- 改法：`¥100 ~~¥150~~`。

**㉖ 排序 80 直接进副标题** `ShopView.tsx:134`、`:247` — 同 ⑯。

### 2.9 订单 `/orders`

**㉗ 金额无单位/千分位** `OrdersView.tsx:119`
- 现象：`{order.price_order}` → `100`。
- 误读：见 ㉔；且 10000 元会显示 `10000`（无逗号）。
- 改法：`¥100.00` + `formatThousand`。

**㉘ 有「已发货」badge，却没有发货时间** `OrdersView.tsx:127-132`
- 现象：只显示 `created_at`（下单时间）。
- 误读：客服处理催发货时，无法回答"什么时候发的"。API 有 `time_pay` / `time_delivery`（样例齐全）。
- 改法：下单时间列改双行（下单 / 发货），或加 tooltip。

**㉙ 两套状态量词** `OrdersView.tsx:127-129`：`已发货 / 催发货 7 / 待发货` ✓ 可读性好，保留。

### 2.10 直播 `/live`

**㉚ 源状态直接把后端枚举甩出来** `LiveView.tsx:175-177`
- 现象：`row.status === 'ok' ? '正常' : row.status` → 非 ok 时显示 `error` / `timeout` / `fail` 之类。
- 误读：英文枚举对运营不可读。
- 改法：建 `LIVE_MEDIA_STATUS` 映射（同 `SEEK_STATUS` 的做法），未知值兜「异常」。

**㉛ 排序列 `item.sort`** `LiveView.tsx:110` — 同 ⑯。

### 2.11 线路 `/lines` — 未发现语义问题 ✓
`created_at` 用绝对时间 ✓、`tagline ?? '—'` ✓、URL 原样 ✓。

### 2.12 音乐 `/music`、歌曲详情 `/music/song/:id`

**㉜ 时长 `3:09` 没有单位标注** `MusicView.tsx:133`
- 现象：`duration(189)` → `3:09`；专辑行同一列显示 `release_date`（`2026-09-30`）。
- 误读：**一列两种语义**——歌是"时长"，专辑是"发行日期"，列头只有「时长 / 发行」二选一的动态文案，用户扫表时会串。同时 `3:09` 没有"分:秒"提示。
- 改法：列头按 tab 切换（已有），但值格式统一标注：`3 分 09 秒` 或加 `min` 后缀；专辑列改「发行日」。

**㉝ 歌曲详情「码率」假设了 `meta_rate_bit` 是 bps** `SongDetailView.tsx:134`
- 现象：`Math.round(Number(row.meta_rate_bit)/1000) + ' kbps'`。
- 误读：若该字段实际是 kbps（或 bps 的千倍单位），显示会差 1000 倍。无样例可证 → **需要在真机核对一次**（截图级：`320 kbps` 还是 `0.32 kbps`）。

**㉞ 「收藏」按钮成功后说「已切换收藏」** `SongDetailView.tsx:33`
- 误读：用户不知道现在是"已收藏"还是"已取消"。
- 改法：用返回的 `is_favorite` 出具体文案（`已收藏` / `已取消收藏`）。违反 SPEC §7「动作名即结果名」。

### 2.13 资金 `/fund`（基金订单 / 支付服务 / 胡萝卜）

**㉟ 基金订单表：胡萝卜列恒 0、时间列恒「—」** `FundView.tsx:178`、`:180` ⌁ 与 fields-round4 交叉
- 现象：真实响应（Postman `/api/fund/order/list` 样例）字段是 `tier_carrot: 100`、`payed_at: "2026-08-14 22:16:53"`，**没有 `carrot`、没有 `created_at`**。而代码读的是 `row.carrot`（`Number(...?? 0)` → **永远 0**）和 `row.created_at`（`formatDateTime('')` → **永远 —**）。
- 误读：用户看到「胡萝卜 0 / 时间 —」，会以为"这单没发胡萝卜、也不是今天建的"。
- 改法：`row.tier_carrot`、`row.payed_at ?? row.time_expired`。

**㊱ 状态列显示英文 `default`，而接口已给了中文** `FundView.tsx:179`
- 现象：`{row.payout_status ?? row.status ?? '—'}` → `default`。
- 误读：`default` 在中文语境里像"默认"，实际是"待提交"。**接口同时返回了 `payout_status_string: "待提交"`**。
- 改法：`row.payout_status_string ?? 映射表`。

**㊲ 「本页记录 N 条」被做成 42px 统计卡** `FundView.tsx:25-29`
- 现象：与「胡萝卜余额」并排的第二张 `.card--stat`，42px 大字显示「20 条」。
- 误读：用户以为"20 条"是某种业务指标（比如本月新增）。
- 改法：这是分页元数据，属于表脚（`共 234 条 · 第 2 页`），不该占 KPI 位。删卡，信息并进表脚。

**㊳ 手写分页只能往后翻** `FundView.tsx:56-58`
- 现象：表脚只有一个「下一页」，`disabled` 用 `total <= page*20` 算。
- 误读：翻到第 3 页想回去看第 2 页 → 没有办法。
- 改法：用现成 `<Pager>`（组件接受 `total/page/pageSize/onPage`）。

**㊴ 胡萝卜流的 `point` 为 null 时会显示 `null`** `FundView.tsx:46-48`
- 现象：`{Number(row.point) > 0 ? '+' : ''}{String(row.point)}`。`point: null` → `String(null)` = `"null"`。
- 误读：界面上出现字面量 `null`。
- 改法：`point == null ? '—' : `${point>0?'+':''}${point}``。

**㊵ 支付服务：累计收入/支出被标成「胡萝卜」，单位高度可疑** `PayView.tsx:82-94`
- 现象：`累计收入 12,000 胡萝卜`。
- 证据：`/api/pay/base` 的字段说明只写「`total_revenue` 总收入 / `total_expenditure` 总支出」，**没有单位**；而同一服务族里 `price_order`、`price_settle`、`tier_price`（"1¥ 补贴"）都是**元**。若收入是元，此卡单位就全错（12000 元 vs 12000 胡萝卜差 3~4 个数量级）。
- 误读：商户看到"累计收入 12,000 胡萝卜"会直接按胡萝卜理解自己的营收。
- 改法：**先向后端确认单位**；确认前最安全的写法是不带单位（`12,000`）或用 `—`，并在卡脚注明「单位以后端为准」。确认是元后改 `¥12,000.00`，是胡萝卜后保留 🥕 并加"枚"量词。

**㊶ 支付查单：金额无货币、支付方式显示英文** `PayView.tsx:125-139`
- 现象：`订单金额 68`、`支付方式 web`。
- 误读：68 元还是 68 胡萝卜；`web` 是什么支付方式（网页支付？）。
- 改法：`¥68.00`；`pay_way` 建映射（`web/wechat/alipay…`）。

**㊷ 「商品」格放的是商品名** `PayView.tsx:136-139`
- 现象：`.detail-stat b`（19px、tabular-nums）里放「充值啦啦啦」这种中文长名。
- 误读：数字位放文本，长名字会把四格布局撑歪。
- 改法：商品名单独一行 `kv`，不占数字位。

### 2.14 用户 `/users`、用户详情 `/users/:id`

**㊸ 「邀请人」一格有时是 ID、有时是笔名** `UserDetailView.tsx:139`
- 现象：`{info?.invite_user_id ?? banned?.invite_pseudonym ?? '—'}` → 可能是 `eWD3N7EX8s`，也可能是 `sorakand`。
- 误读：同一格两种东西，无法判断该不该拿去搜。
- 改法：优先笔名 + 括号 ID（`sorakand（eWD3…）`），或分两行。

**㊹ 「于 3 天前 封禁」** `UserDetailView.tsx:90` — ✓ 可读。但跨年/长期封禁（>30 天）会退回无年份日期，见 §1。

**㊺ 上传量 `29TB` 没有空格** `UserDetailView.tsx:105`
- 现象：`.replace(/\s/g,'')` 为了塞进 42px 而删掉单位前的空格，与全站 `29 TB` 不一致。
- 改法：保留空格；塞不下就降字号（`font-size: 28px` 或 `.stat__value--long`）。

### 2.15 回收站 `/recycle`

**㊻ 删除时间用相对时间** `RecycleView.tsx:170`
- 现象：`formatRelative(row.created_at)` → `3 天前`。
- 误读：**恢复操作需要精确时间**（"是今天误删的还是上周的"、"保留期还剩多久"），相对时间在这里有害。
- 改法：绝对时间（含年份）；相对时间放 `title` 或副行。

**㊼ 资源大小 `formatSize(Number(row.media_file_size ?? 0))`** `RecycleView.tsx:168` — 原受 `formatSize(0)='—'` 影响；**已随 `formatSize` 修复而正确** *(已修·未提交)*。但注意这里的 `?? 0` 会把"字段缺失"变成"0 B"——修复后反而把"缺失"伪装成"空文件"，建议改成 `formatSize(row.media_file_size)`（不兜 0）。

### 2.16 悄悄话 `/whisper` — 语义基本正确 ✓
`created_at` 绝对时间 ✓；`content` 原样 ✓；缺「未读/已回」状态（`reply_content` 有值即已回，但列表没有状态列）→ P2：用户无法一眼看出哪条还没回。

---

## 3. 四个横向专题

### 3.1 量词：同一个数在不同位置叫不同单位

| 位置 | 文案 | 引用 |
|---|---|---|
| 媒体库页头 | `209,486 **部**` | `LibraryView.tsx:45` |
| 媒体库表脚 | `共 209,486 **条**` | `Pager.tsx:28`（固定"条"，10 处 Pager 全如此） |
| 片单页头 | `260 **个**` | `WatchlistsView` |
| 片单表脚 | `共 260 **条**` | `Pager.tsx` |
| 片单详情 | `5,678 **部**` / `共 5,678 **条**` | `WatchlistDetailView.tsx:55/217` |
| 订单页头 | `77 **单**` → 表脚 `共 77 **条**` | `OrdersView.tsx` + `Pager` |
| 资金页头 | `6 **笔**` → 表脚 `共 6 **条**` | `FundView.tsx:123` |
| 音乐 | `572,000 **条**` / `N **首**`（片单里的音乐） | `MusicView.tsx:48`, `WatchlistDetailView.tsx:333` |

- 误读：同一屏上下两个数字，一个「部」一个「条」，用户会以为是两个不同的量（"20 万部影片，但只有 6 千条记录？"）。
- **改法**：`<Pager unit="部" />`（默认 '条'），10 个调用点各传一个量词；`formatThousand` 保持中立。

### 3.2 时间：三种表达混用，各缺一半信息

| 场景 | 现在 | 问题 | 应该 |
|---|---|---|---|
| 列表「更新」列 | `formatRelative`（3 天前） | >30 天丢年份 | 相对 + `title` 绝对 |
| 详情「更新」 | `formatRelative` 放在 19px KPI 位 | 语义错位 | 绝对 |
| 回收站「删除时间」 | `formatRelative` | 恢复场景需要精确 | 绝对（带年） |
| 订单「下单时间」 | `formatDateTime`（`11-05 22:31`） | 无年份 | 加年份或 `title` |
| 悄悄话/字幕/邀请记录 | `formatDateTime` | 无年份 | 同上 |
| 求片「上传期限」 | `formatDateTime` | ✓ 未来用绝对是对的 | 保留 |
| 概览胡萝卜流水 | `String(...).slice(5,10)` | 无年份 + UTC 错位 | `formatDate` |

- **跨年风险面**：`formatDateTime` 被 30 处调用，全部丢年份。订单/回收站/封禁/注册时间都可能跨年。
- **建议**：`formatDateTime` 增加 `withYear` 选项，规则写成「**30 天内的过去时间用相对，其余一律绝对且带年**」（现在 `formatRelative` 的 >30 天回退正好缺年份）。

### 3.3 比例与矛盾：18% vs 0 分钟（Q4 的答案）

```
继续观看「18%」   ← recordApi.list  → 实时记录（含今天）
我的近况「0 分钟」 ← statsVideoHistory → 只到昨天（Postman 明写）
```
两条数据源不同、时间窗不同，**必然出现同屏矛盾**：
1. 今天看过 5 分钟 → 继续观看有 18% 的条目，近况说「本周还没有观看记录」；
2. 今天看完一集 → 近况「今天没看」+「继续观看」缺这一条（记录已 complete 被过滤）；
3. `activeDays` 最多只能到 6（第 7 天=今天永远空）。

**改法**：让两个数字同源——近况也读 `recordApi.list`（或用 `stats` 的数据但**把窗口截到昨天**并在文案里写明「截至昨天」）。**不要**让同一张屏上的"今天/本周"来自两个时间窗不同的接口。

### 3.4 空值三态：`—` / `0` / 空白（Q5 的答案）

| 字段 | 现在显示 | 问题 | 建议 |
|---|---|---|---|
| `seek_carrot=0` | `—`（`SeekView.tsx:133` 用 `||`） | **0 被隐藏** | `无悬赏` |
| `carrot`（基金） | `0`（`FundView.tsx:178` 用 `?? 0`） | **缺失被当成 0** | 用正确字段 + `—` |
| `todb_id`/`medias_count` | 空白（无兜底 `VideoDetailView.tsx:161-177`） | 缺失=空白 | `—` |
| `media_file_size` 缺失 | `formatSize(?? 0)` → `0 B` *(已修·未提交)* | 修复后**反向问题**：`?? 0` 把缺失变成"0 字节" | 去掉 `?? 0`，让 `formatSize` 自己收 `null → —` |
| `media_count`（直播） | `0`（`media.data?.total ?? 0`，加载中也 0） | **加载中显示 0** | 加载中 `—`/骨架 |
| 支付收入/支出 | `0`（`?? 0`） | 未开通时 0 伪装成"收入为 0" | 被 `display:none` 遮住，但一旦去掉就错 |
| `point=null`（胡萝卜流） | `null`（`String(null)`） | 字面量 null | `—` |
| 邀请名额 | `不限 / ∞`（`AccountView.tsx:258`） | ✓ 处理正确 | 保留 |
| 待办计数 | `item.value === null ? '—' : …`（`OverviewView.tsx:108`） | ✓ 三态区分正确 | 全站照抄这个写法 |

**统一规则建议**（写进 SPEC-UI）：
- `0` 是数据 → 显示 `0`
- `null/undefined` → `—`
- 加载中 → 骨架（不是 `0`，也不是 `—`）
- "不适用"（如人没有悬赏）→ 人话（`无悬赏`），不用 `—`

### 3.5 单位缺失清单（Q6）

| 数字 | 位置 | 缺什么 | 建议 |
|---|---|---|---|
| 悬赏 120 | `SeekView.tsx:133` | 没有「胡萝卜」 | `120 🥕` |
| 求片数 5 | `SeekView.tsx:132` | 列头「求片数」可推断 ✓ | — |
| 金额 100 | `OrdersView.tsx:119` | 货币符号 | `¥100.00` |
| 价格 100 | `ShopView.tsx:140` | 货币符号 | `¥100` |
| 订单金额 68 | `PayView.tsx:129` | 货币符号 | `¥68.00` |
| 累计收入/支出 | `PayView.tsx:84/91` | 单位还是错的（见 ㊵） | 确认后 `¥` 或 `🥕` |
| 库存/销量 | `ShopView.tsx:141-142` | 列头可推断 ✓ | — |
| 排序 80 | `LiveView.tsx:110` 等 | 无刻度说明 | 藏或改相对次序 |
| 码率 320 | `SongDetailView.tsx:134` | 有 kbps ✓ 但字段单位未验证 | 真机核对 |
| 时长 3:09 | `MusicView.tsx:133` | 分:秒 未标注 | `3 分 09 秒` |
| 上传量 29TB | `UserDetailView.tsx:105` | 缺空格 | `29 TB` |
| 大小/共 35,601 MB | `AccountView.tsx:118` | 固定 MB + 措辞"已占用" | `29 TB` + "上传总量" |
| 分钟 42 | `OverviewView.tsx:285` | 是"实看"还是"内容" | `实看 42 分钟` |

---

## 4. Top 8 优先级

| # | 问题 | 位置 | 为什么排这个位次 | 改法成本 |
|---|---|---|---|---|
| **1** | 问候语「今天还没看片」**恒假**（后端不给今天数据） | `OverviewView.tsx:76` + `queries.ts:117-123` | 首屏第一行就是假话，且用户会拿它跟自己的行为对照 → 直接损伤信任。属于"界面在撒谎"的最高级 | 低（dates 少一天 + 改文案） |
| **2** | 资金-基金订单：**胡萝卜列恒 0 / 时间列恒 —** | `FundView.tsx:178/180` | 整张表两列无信息，且看起来像"这单没发钱" | 低（换字段名 2 处）⌁ 交叉 fields-round4 |
| **3** | 金额族**全部没有货币单位**，且「累计收入」很可能标错单位（🥕 vs ¥） | `PayView.tsx:84/91/129`、`OrdersView.tsx:119`、`ShopView.tsx:140` | 钱错了是最贵的错。至少 ¥ 符号必须补；收入单位必须向后端确认 | 低（符号）+ 中（确认单位） |
| **4** | `formatRelative(未来) → 刚刚`（`formatSize(0)` 已被并行修掉） | `format.ts:35-38` | 函数级地雷：任何新调用点（`time_expired`/`upload_expired_at`）都会静默显示「刚刚」 | 低（3 行） |
| **5** | 「累计收入 12,000 胡萝卜」与「我的上传 29 TB / 已占用 35,601 MB」两组**同字段两种量纲** | `PayView.tsx:82` vs `AccountView.tsx:118` | 同一个后台里同一个值有 3 种写法，用户无法建立信任基准 | 低（统一走 formatSize/formatCarrot） |
| **6** | 状态枚举未本地化：基金 `default`（接口已给 `payout_status_string:"待提交"`）、直播源 `error`、支付方式 `web` | `FundView.tsx:179`、`LiveView.tsx:177`、`PayView.tsx:133` | 运营看不懂英文枚举，且接口明明给了中文 | 低（三个映射表） |
| **7** | 量词混乱：`部 / 条 / 个 / 单 / 笔 / 首` 同屏混用（`Pager` 固定"条" 10 处） | `Pager.tsx:28` + 各页 hint | 同一数字两种量词，用户会以为是两个量 | 低（Pager 加 unit prop） |
| **8** | 「18%」与「本周 0 分钟」**同源不同窗**导致的自相矛盾；「本周」实为滚动 7 天 | `OverviewView.tsx:231/285` | 同屏自相矛盾是最伤可信度的形态 | 中（统一数据源） |

**未进前 8 但仍需记录**：`AccountView` 的 `?tab=carrot/ban` 无 tab 选中态（第 ㉒）、回收站删除时间用相对时间（㊻）、「本页记录 N 条」占 KPI 位（㊲）、手写分页无法后退（㊳）、`null` 字面量（㊴）、悬赏 0 显示 `—`（⑰）、排序值直出（⑯㉛㉖）、码率单位待核（㉝）。

---

## 附录：本轮引用的字段契约依据

| 结论 | 依据 |
|---|---|
| `size_upload` = 上传总量（字节） | Postman `/api/user` description 原文「`size_upload` 上传总量 字节」 |
| 观影记录**只到昨天** | Postman `/api/user/stats/video/history` description「只可查今天之前的数据」 |
| 两个观看时长字段并存 | 样例：`video_watch_second_real: 1622` / `video_watch_second_content: 2257` |
| 0% 未完成条目是常态 | 样例：`media_seconds: 1385, play_seconds: 0, is_complete: false` |
| 基金订单字段是 `tier_carrot` / `payed_at` / `payout_status_string` | 样例 `/api/fund/order/list`：`{tier_carrot:100, payed_at:"2026-08-14 22:16:53", payout_status:"default", payout_status_string:"待提交"}` |
| 价格族按元计 | 基金 `tier_price: 1` 对应文案「兑换最高 **1¥** 补贴」；`price_order:100 / price_settle:95` 同族 |
| `seek_carrot` = 萝卜数，默认 0 | Postman `/api/seek` 排序字段注释「`seek_carrot` 萝卜数」；样例 `seek_carrot: 0` |
| 订单有 `time_pay` / `time_delivery` | 样例 `/api/shop/order/shop/order` |
| `duration` 存在于歌曲列表 | 样例 `/api/music/song/list`：`duration: 189` |
