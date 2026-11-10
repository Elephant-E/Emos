# 用户与账号域 API 逐条核对

> 只读审计，未改 `src/`。基线 `rewrite/v2`，行号以 **HEAD `65b89d8`**（2026-11-07 20:40 提交，视频域改动）为准。
> 取证方式：`curl` 直连 `https://emos.best`，Header `Authorization: Bearer 1090_zijIu560MmusQM8j`（账号 `e7E6K6OE4s` / `elephant`，`roles=["admin"]`，非支付服务商）。
> 本轮共发出 **约 40 次真实请求**。破坏性端点一律用「空 body / 不存在的 id / 错误的 method」探针，靠 422/404/405 判定 method、路径、参数名与必填项，不落库。
>
> **副作用声明（唯一一次）**：`PUT /api/user/showEmpty` 传非布尔值 `"abc"` 时后端按 `false` 处理，把 `is_show_empty` 从 `true` 改成了 `false`；已立刻用 `{"is_show_empty": true}` 复原，并回读 `/api/user` 确认为 `true`。
> 期间仓库有并发提交（`40c5a40` → `65b89d8`，只动了视频域），本文行号已按新 HEAD 复核。

**标注口径**

| 标记 | 含义 |
|---|---|
| 实测 | 我今天真的发了请求并看到了响应 |
| 契约 | 只对照 `api.postman_collection.json` 的字段/注释，没发请求 |
| 读码 | 只读了前端源码 |
| 历史抓包 | 出自 `docs/api-shapes.md`（此前抓过的真实响应），本轮无法复验 |

---

## 一、总表（25 个端点 / 方法）

| # | 端点（前端方法） | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|---|
| 1 | `GET /api/user`（`sessionApi.profile`，endpoints.ts:9） | 无参数，PASS（实测 200） | 25 字段，代码消费 20 个；漏 `telegram_group_url`/`is_show_watch_default`/`is_have_emps`/`sign.sign_at`/`sign.sign_index` | `/account` 资料页、`Sidebar`、`AdminLayout`、`Overview`、`Watchlists`、`VideoDetail`（`useCapabilities`） | **展示缺失** |
| 2 | `GET /api/sign/check`（`clientApi.session.check`，endpoints.ext.ts:12） | 无参数，PASS（实测 200 `{is_sign:true,user_id}`） | 未消费（同 `SignCheck` 类型一致） | **无入口**（搬到了 `endpoints.ext.ts` 的 `clientApi`，且 `clientApi` 全仓无 import） | **未使用** |
| 3 | `GET /api/user/base`（`clientApi.session.base`，endpoints.ext.ts:13） | 无参数，PASS（实测 200） | 3 字段 `user_id/username/avatar`，未消费 | **无入口**（同上） | **未使用**（与 #1 重复的轻量版） |
| 4 | `PUT /api/user/showEmpty`（endpoints.ts:13） | body `is_show_empty`，PASS（实测回显 true/false） | `{is_show_empty}`，已用 | `/account` 资料页开关（AccountView:196-205） | **PASS** |
| 5 | `PUT /api/user/pseudonym`（endpoints.ts:14） | query `name`，PASS（空值实测 422「name 不能为空」） | `{pseudonym}`，已用 | AccountView:178-194 | **PASS** |
| 6 | `PUT /api/user/agreeUploadAgreement`（endpoints.ts:15） | 无参数，路由存在（`GET`→405 且提示仅 `PUT`） | `unknown`，未消费 | AccountView:269-278、UploadView:111 | **PASS**（未执行写操作） |
| 7 | `PUT /api/user/agreeDownAgreement`（endpoints.ts:16） | 无参数，路由存在（`GET`→405 仅 `PUT`）；**Postman 未收录** | `unknown`，未消费 | AccountView:279-286 | **PASS**（未执行写操作；旧「幽灵端点」疑虑解除） |
| 8 | `PUT /api/user/sign`（endpoints.ts:17） | query `content` 可选，PASS（Postman 同）；空 content 会被 `buildUrl` 丢弃，即「纯签到」 | `sign_index/earn_point/continuous_days`，已用（OverviewView:61-64 全用；AccountView:64 只用 earn_point） | `/account` 顶栏按钮（AccountView:60-69）、`/` 签到卡（OverviewView:143-148） | **PASS**（未执行签到，今天已签） |
| 9 | `GET /api/user/passwordTemporary`（endpoints.ts:18） | 无参数，路由存在（读码，未执行：会生成一次性密码） | `{password, second}`；类型写成 `number`，实际 `must_otp=false` 时为 `null`（历史抓包 + AccountView:325 已做兜底） | AccountView:308-333 | **PASS**（类型 WARN） |
| 10 | `PUT /api/user/passwordReset`（endpoints.ts:19） | query `password`，PASS（空值实测 422「password 不能为空」） | `unknown` | AccountView:462-496 | **PASS**（未执行） |
| 11 | `PUT /api/user/originalImage`（endpoints.ts:22） | body `{}`，路由存在（`GET`→405 仅 `PUT`）；**Postman 未收录**，后端忽略入参、返回翻转值 | `{is_original_image}`，已用（AccountView:214） | AccountView:207-219 | **PASS**（未执行，toggle 会改真实偏好） |
| 12 | `DELETE /api/user/telegram`（endpoints.ts:23） | 无参数，路由存在（`GET`→405 仅 `DELETE`）；**Postman 未收录** | `unknown` | AccountView:225-241 | **PASS**（未执行，会真解绑） |
| 13 | `PUT /api/user/resetToken`（endpoints.ts:24） | 无参数，路由存在（`GET`→405 仅 `PUT`）；**Postman 未收录** | `unknown` | **无入口**：`queries.ts:360` 包了 mutation，但任何 view 都没调用 | **未使用**（死代码） |
| 14 | `GET /api/user/stats/video/history`（endpoints.ts:25） | query `dates[]`，PASS（`client.buildUrl` 把数组编码成 `dates[]`，与 Postman 一致；实测 200） | 每行 14 字段（历史抓包），前端只用 `date` + `video_watch_second_real` | `Overview` 近况柱状图（`useWatchStats`，queries.ts:88-131） | **PASS**（其余字段属「按需聚合」，非缺陷） |
| 15 | `GET /api/invite/info`（endpoints.ts:29） | 无参数，PASS（实测 200） | 4 字段 `invite_at/invite_remaining/invite_count/parent{user_id,pseudonym}`；用了 2 个，**`invite_remaining`、`parent` 完全没用** | `/account?tab=invite`（AccountView:344-354） | **展示缺失** |
| 16 | `GET /api/invite/history`（endpoints.ts:30-31） | query `username/page/page_size/user_id/telegram_user_id`，PASS（实测 `username` 过滤生效；`page=99` 返回空 items 不报错） | 9 字段：`user_id/username/telegram_user_id/invite_at/invite_remark/join_at/last_video_player/last_telegram_message/last_user_sign`；列表页只用 4 个 | AccountView:386-401（4 字段）、UserDetailView:117/170-183（另用 3 个） | **展示缺失**（`invite_remark` 从未展示）+ **分页缺失** |
| 17 | `POST /api/invite`（endpoints.ts:32-33） | body `invite_user_id` 必填（空 body 实测 422「invite user id 不能为空」；非法 id 实测 422「必须是 10 个字符」）、`invite_remark` 可 null（实测接受） | `unknown` | AccountView:498-539 弹窗 | **PASS** |
| 18 | `POST /api/invite/revoke`（endpoints.ts:34） | body `user_id` 必填（空 body 实测 422「user id 不能为空」） | 类型声明 `{invite_remaining}`（未实测：会产生真实撤销） | AccountView:402-417 | **PASS**（响应只读码） |
| 19 | `GET /api/invite/tree`（endpoints.ts:35） | 无参数，PASS（实测 200，**3238 个节点**，根节点 `emos`） | 9 字段，扁平数组；用了 `user_id/username/join_at/is_disabled`，**`invite_user_id`（层级）没用** | AccountView:431-456 | **展示缺失 / 语义错位** |
| 20 | `GET /api/ban/list`（endpoints.ts:207） | 无参数；`page/page_size/days` 实测全被忽略，固定返回 3 条 | 9 字段：`user_id/username/avatar/invite_user_id/invite_pseudonym/invite_at/telegram_user_id/disable_reason/created_at`；UI 用 3 个，**`created_at` 是注册时间却被当封禁时间** | `/users`（UserSearchView）、`/users/$id`（UserDetailView:17,86-95）、`Overview` 待办计数（queries.ts:167） | **展示缺失 + 口径错误** |
| 21 | `PUT /api/ban/change`（endpoints.ts:209-210） | query `type/user_id/reason`；空 query 实测 422「type 不能为空」、`type=foo` 实测 422「已选的属性 type 无效」（枚举 disable/unblock 确认）、不存在 user 实测 422「用户ID错误」；`reason` 有默认值「后台操作」，两条调用点都不传 | 类型声明 `CarrotDelta`（只读码，未实测） | UserSearchView:31、UserDetailView:43/60-63 | **PASS** |
| 22 | `GET /api/whisper/sender`（endpoints.ts:234） | 无参数，PASS（实测 200 `[]`，本账号 0 条） | 无样本；历史抓包：`whisper_id/sender_content/sender_is_anonymous/sender_at/receiver_user{id,username,avatar}/receiver_content/receiver_at` | `/whisper`（WhisperView） | **展示缺失 + FAIL（内容列反转，见 P1-1）** |
| 23 | `GET /api/whisper/receiver`（endpoints.ts:235） | 无参数，PASS（实测 200 `[]`） | 无样本；历史抓包：`whisper_id/sender_content/sender_at/sender_user{...}/receiver_content/receiver_at` | `/whisper` | **PASS**（映射方向对） |
| 24 | `POST /api/whisper/reply`（endpoints.ts:236） | body `whisper_id/content`；缺 id 实测 422「whisper id 不能为空」、空 content 实测 422「content 不能为空」、不存在的 id 实测 404 | `{whisper_id}`（只读码） | WhisperView:109-143 | **PASS** |
| 25 | `POST /api/whisper/create`（`clientApi.whisper.create`，endpoints.ext.ts:109-110） | body 松散 `Record<string, unknown>`；空 body 实测 422「receiver user id 不能为空」 | `{whisper_id}`（只读码） | **无入口**（ext；`WhisperView` 只有「回复」，没有「发送」） | **未使用** |

---

## 二、问题清单（按严重度）

### P1-1 悄悄话「发出的」页把回复当正文、把自己的话当回复（内容完全颠倒）

- 位置：`src/views/WhisperView.tsx:76-77`
  ```ts
  const body = tab === 'receiver' ? row.sender_content : row.receiver_content
  const reply = tab === 'receiver' ? row.receiver_content : row.sender_content
  ```
- 事实：字段是按**角色**命名的，不是按「当前用户视角」命名的 —— 两个列表里 `sender_content` 都永远是**发送者写的话**（`docs/api-shapes.md:469-473` 历史抓包：sender 列表里 `sender_content:"内容"`、`receiver_content:null`）。
- 后果：`tab='sender'` 时表格「内容」列显示 `receiver_content`（对方的回复，没回复时显示 `—`），「回复：」列显示的却是**我自己发的那句话**。整个「发出的」页是反的。
- 修复：
  ```ts
  const body  = row.sender_content
  const reply = row.receiver_content
  ```
  两个 tab 都不用分支。顺手按 `row.receiver_at` 显示回复时间。
- 置信度：字段语义来自历史抓包 + 命名对称性（`sender_user` 只出现在 receiver 列表、`receiver_user` 只出现在 sender 列表）；**本账号 0 条悄悄话，无法用真实数据复验**，建议修复前先用一个有数据的账号抓一次。

### P1-2 封禁列表把「注册时间」当「封禁时间」显示

- 位置：`src/views/UserSearchView.tsx:68`（表头「封禁时间」）、`:87`（`formatRelative(row.created_at)`）；`src/views/UserDetailView.tsx:91`（`于 ${formatRelative(banned.created_at)} 封禁`）
- 实测证据（3 条记录逐条比对 `/api/invite/tree`）：

  | 用户 | `ban.created_at` | `tree.join_at` | 判定 |
  |---|---|---|---|
  | heian | 2025-10-19T16:31:45Z | 2025-10-20 00:31:45 | 同一时刻（差 8h 时区） |
  | ccwm123ccwm | 2025-09-26T07:43:50Z | 2025-09-26 15:43:50 | 同一时刻 |
  | roxyluvyo | 2026-01-04T06:57:28Z | 2026-01-04 14:57:28 | 同一时刻 |

  3/3 与「加入时间」逐秒吻合 → `created_at` 是**账号注册时间**，不是封禁时间。`/api/ban/list` 里**根本没有任何封禁时间字段**（只有 `disable_reason`，而它的内容形如 `260307 播放请求异常`、`260321 请求数异常`、`260415 请求数异常`）。
- 后果：`/users` 页每一行的「封禁时间」都说的是「这个号是什么时候注册的」；用户详情页会写出「于 1 年前封禁」这种与事实不符的句子。
- 修复：表头改成「注册时间」、详情页文案改成「注册于 …」；封禁时间目前拿不到，不要伪造。若一定要展示，只能从 `disable_reason` 的 `YYMMDD` 前缀解析，并明确标注是「原因代码」而非接口字段（不推荐）。

### P1-3 `inviteApi.tree` 是**全站**邀请树，UI 当成「我的邀请关系」在展示

- 位置：`src/views/AccountView.tsx:431-456`
- 实测：`GET /api/invite/tree` 返回 **3238 个节点**，根节点是 `emos`；层级分布 `depth=0:1 / 1:56 / 2:2323 / 3:705 / 4:153`，`sorakand` 一人下面挂了 949 人。本账号 `e7E6K6OE4s` 只是其中一个叶子。
- 后果：账号页「邀请关系 · 共 3238 人」+「只显示最近 40 人」，读者会理解成「我邀请了 3238 人」。取前 40 条（`slice(0,40)`）拿到的还是别人分支上的人，跟「我」无关。
- 修复（二选一）：
  1. 只展示以当前用户为根的子树：按 `invite_user_id` 建邻接表，从 `session.data.user_id` DFS 展开，并真正渲染层级；
  2. 保留全站树就改名「全站邀请关系（前 40 位）」，并放到概览/统计类页面，别放在「账号 → 邀请」。
- 顺带：`invite_api` 文档写着「服务端缓存 1h，可本地缓存 1day」，`useInviteTree` 没有设 `staleTime`（queries.ts:332），每次进页面都重拉 3238 条。

### P1-4 管理员邀请名额显示成「不限 / ∞」，但后端明确返回 1

- 位置：`src/api/queries.ts:69`（`inviteRemaining: isAdmin ? null : (data?.invite_remaining ?? 0)`）、`src/views/AccountView.tsx:347-352`、`:97`
- 实测：本账号 `/api/user` 的 `invite_remaining = 1`，`/api/invite/info` 的 `invite_remaining = 1`（两份数据一致），UI 却因为 `isAdmin` 直接渲染 `∞` / `不限` / `管理员不限名额`。
- 后果：管理员以为可以无限邀请，实际点第二次会撞后端限额；而 `info.invite_remaining` 已经拉回来了却完全没用。
- 修复：删掉 `isAdmin ? null` 这个假设，直接用 `info.data?.invite_remaining ?? data?.invite_remaining`；若确实要保留「管理员不限」的产品口径，得先向后端确认。

### P2-1 邀请记录只拉第 1 页（10 条），总数 11，第 11 个人永远看不到

- 位置：`src/views/AccountView.tsx:42`（`useInviteHistory(1)`，默认 `pageSize = 10`，queries.ts:324）、`:424`（写了「共 11 人」）
- 实测：`GET /api/invite/history?page=1&page_size=10` → `total: 11, items: 10`。页面没有翻页控件，也没有搜索框（`username` / `telegram_user_id` 两个后端支持的过滤参数都没接）。
- 修复：接上分页（复用站内 `Pager`），或把 `pageSize` 提到 `total` 上限（后端 `page_size` 未限制，实测 100 可用）；再加一个按用户名/tgid 的搜索框，成本很低。

### P2-2 邀请备注（`invite_remark`）从来没被展示过

- 位置：`src/views/AccountView.tsx:386-401`（表格只有 用户 / 邀请时间 / 最近播放 / 操作）
- 事实：邀请弹窗让用户填「备注（仅自己可见）」（AccountView:534-537），后端原样存（实测 `elephant1` 这条 `invite_remark: "小号"`），但列表里一个字都不显示。备注是**填了却看不到**的功能。
- 修复：表格加一列「备注」，`row.invite_remark`。

### P2-3 `inviteApi.info` 的 `parent` 没用，「谁邀请了我」无处可见

- 位置：`src/api/endpoints.ts:29` 声明了 `parent: { pseudonym: string | null }`，全仓只在 `mock.ts:440` 出现过，**没有任何 view 读取**
- 实测：`GET /api/invite/info` → `{"invite_at":"2026-01-17 10:10:10","invite_remaining":1,"invite_count":11,"parent":{"user_id":"emos","pseudonym":"emos"}}`
- 类型不完整：真实 `parent` 有 `user_id` + `pseudonym` 两个键，类型只写了 `pseudonym`（mock 里也只有 `pseudonym`，说明类型是照 mock 写的）。
- 修复：`parent: { user_id: string; pseudonym: string | null } | null`，邀请 Tab 加一行「邀请人：emos · e…」并链到 `/users/$userId`。

### P2-4 「匿名悄悄话」的匿名标记被丢掉

- 位置：`src/views/WhisperView.tsx:74-84`
- 事实：sender 列表返回 `sender_is_anonymous`（历史抓包，bool），UI 不读；它只显示 `receiver_user.username ?? '—'`。
- 风险：匿名悄悄话（`is_anonymous: true`）很可能不在 `receiver_user` 里暴露真实身份，但**也无法排除**后端照常返回 username —— 若是后者，UI 就等于把匿名消息的真实发送者显示出来了。这条要么补「匿名」徽标，要么在确认后明确隐藏对端。
- 无法实测（本账号 0 条），建议先抓一条匿名样本再定。

### P2-5 `/api/ban/list` 的「最近一周」说明与实测对不上，且该数字被用成了「封禁中用户」总数

- 位置：`src/views/UserSearchView.tsx:54`（「封禁列表来自最近一周的记录」）、`src/api/queries.ts:167`（`todos.bans = banApi.list().length`）、`OverviewView.tsx:45`（「封禁中用户 N 人」）
- 实测：
  - `/api/ban/list` 返回 3 条；`?page=2` / `?page_size=100` / `?days=30` 全部被忽略，仍是同样 3 条（无分页、无时间窗参数）。
  - 同一次抓取的 `/api/invite/tree` 里 `is_disabled: true` 有 **69 个人**。也就是说：被封禁 69 人，列表只给 3 人 → 这个接口确实是**过滤过的子集**。
  - 三条的 `disable_reason` 前缀是 `260307` / `260321` / `260415`（若为日期即 2026-03-07 ~ 2026-04-15，跨度 6 周，且在 2026-11-07 的 7 个月前）。
- 结论：**「只显示最近一周」无法从响应里得到证实**；若 `disable_reason` 前缀是封禁日期，则直接被推翻；若不是日期，那接口没有任何时间字段，UI 文案同样是不可验证的断言。
- 关于「实测数据跨度一年多」：这个观感来自 `created_at`（= 注册时间，2025-09-26 ~ 2026-01-04），不是封禁时间 —— 见 P1-2。
- 修复：删掉「最近一周」这句话；`Overview` 的「封禁中用户」改成「近期封禁记录」或直接调 `/api/invite/tree` 数 `is_disabled`（3238 条有点重，可缓存）。

### P3-1 `/api/user` 有 3 个顶层字段 + 2 个子字段完全没被使用

见第三节「已知疑点 1」，逐字段判定 + 是否值得展示。

### P3-2 账号页的「签到」按钮不反映已签状态，失败也没有提示

- 位置：`src/views/AccountView.tsx:60-69`
- 事实：`OverviewView.tsx:145` 用 `caps.signedToday` 禁用了按钮，账号页没禁；`actions.sign` 这条 mutation（queries.ts:366）没有 `onError`，重复签到后端返回的错误不会弹任何 toast（点了没反应）。
- 修复：`disabled={caps.signedToday}`，并给 `sign` 补 `onError`（OverviewView:66-77 已有 429/「重复」分支，可抽公共函数）。

### P3-3 `resetToken` 是死入口

- 位置：`src/api/endpoints.ts:24`、`src/api/queries.ts:360`
- 事实：`PUT /api/user/resetToken` 路由存在（`GET`→405「Supported methods: PUT」），但 `useAccountMutations().resetToken` 在全仓没有任何 view 调用。Postman 也没收录这个端点，语义未知（大概率是重置 API token）。
- 修复：删掉；或补一个「重置 API 令牌」的二次确认按钮 —— 但在没搞清语义前建议直接删，避免误触把正在用的 token 弄失效。

### P3-4 类型与实际响应不一致（3 处）

| 位置 | 现状 | 实际 |
|---|---|---|
| `src/api/types.ts:32-55` `UserInfo` | 24 个字段 | `/api/user` 返回 **25 个**，多一个 `is_show_watch_default: boolean`（实测） |
| `src/api/endpoints.ts:29` `inviteApi.info` | `parent: { pseudonym }`，且非空 | `parent: { user_id, pseudonym }`，且实测非空 |
| `src/api/endpoints.ts:18` `passwordTemporary` | `{ password: number }` | `must_otp=false` 时是 `null`（历史抓包；AccountView:325 已在运行时兜底，类型没跟上） |

### P3-5 `useUserInvite` 里的 `try/catch` 是假保护

- 位置：`src/api/queries.ts:591-605`
  ```ts
  try { return inviteApi.history({...}) } catch { return Promise.resolve(null) }
  ```
  `inviteApi.history` 返回 Promise，同步 `try/catch` 捕不到 rejection（真正的兜底是后面那个 `.catch()`）。逻辑能跑，但会误导读代码的人。
- 修复：`queryFn: () => inviteApi.history({...}).then(r => r.items?.[0] ?? null).catch(() => null)`。

### P3-6 用户详情「邀请人」一格混用 id 与笔名

- 位置：`src/views/UserDetailView.tsx:143`：`{info?.invite_user_id ?? banned?.invite_pseudonym ?? '—'}`
- 事实：`/api/ban/list` 同时给了 `invite_user_id` 和 `invite_pseudonym`（实测），这里一个格子有时显示 `eR3YJLQ3Ls` 有时显示 `sorakand`。
- 修复：统一显示 `invite_pseudonym ?? invite_user_id`，并可链到 `/users/$userId`。

---

## 三、已知疑点：逐条回答

### 疑点 1：`useSession` 读 `/api/user` 的 20 多个字段，哪些完全没用过？

实测 `/api/user` 返回 **25 个顶层键**：

```
server_video, server_live, server_music, telegram_group_url, telegram_bind_url,
telegram_user_id, user_id, username, avatar, pseudonym, password, is_show_empty,
is_can_upload, is_can_down, is_original_image, is_show_watch_default, roles,
must_otp, is_viewing, invite_remaining, is_have_emps, slot_remaining,
size_upload, carrot, sign{sign_index, sign_at, earn_point, continuous_days}
```

**完全没用过的：**

| 字段 | 实测值 | 前端 | 值得展示吗 |
|---|---|---|---|
| `telegram_group_url` | `https://t.me/emospg` | 零引用 | **值得**：账号页「Telegram 已绑定 / 未绑定」旁边正好缺一个「加入群组」入口，一个 `<a>` 就够 |
| `is_show_watch_default` | `false` | 零引用，**连 `UserInfo` 类型都没有** | 一般：它和 `is_show_empty` 是同一类展示偏好，但后端没有对应的写接口（Postman 无），只能只读展示 → 优先级低。至少该补进类型，避免「接口多返回但类型不知道」 |
| `is_have_emps` | `true` | 零引用 | 中等：配合 `POST /api/invite/emps`（在 `endpoints.ext.ts:20`），为 `false` 时可以提示「重新邀请进入 emps」。当前无入口，可先不做 |
| `sign.sign_at` | `"2026-11-07 02:22:05"` | 零引用 | 低：签到卡可显示「02:22 已签」 |
| `sign.sign_index` | `464` | 只在签到**成功 toast** 里用 mutation 返回值（OverviewView:63），profile 里的这份没用 | 低 |

**用上了的 20 个**（供核对）：`server_video/server_live/server_music`（AccountView:127-129）、`telegram_bind_url`（:242）、`telegram_user_id`（:223）、`user_id`（AccountView:56 / Sidebar:96）、`username`（:55 / Sidebar:164）、`avatar`（Sidebar:164）、`pseudonym`（:46/55）、`password`（:155）、`is_show_empty`（:199）、`is_can_upload`（:59/106 + caps）、`is_can_down`（caps → :259）、`is_original_image`（:210）、`roles`（caps.isAdmin，queries.ts:62）、`must_otp`（:169）、`is_viewing`（caps）、`invite_remaining`（:97）、`slot_remaining`（:96/112 + caps）、`size_upload`（:103 + caps）、`carrot`（:92 兜底 + OverviewView:170）、`sign`（caps.signedToday + OverviewView:150-168 用 `continuous_days`/`earn_point`）。

> 顺带一个安全观察（非缺陷）：`/api/user` 明文返回服登录密码（`password: "534387"`），账号页「显示/复制」就是靠它。这意味着**任何拿到 token 的人都能直接拿到服登录密码**，token 泄露的后果比一般后台更重。是否要弱化到「只能取一次性密码」属于产品决策。

### 疑点 2：`inviteApi.info` 返回的 `parent`，前端用了吗？

**没用。** 类型里声明了（endpoints.ts:29）、mock 里造了（mock.ts:440），业务代码零引用。实测值是 `{user_id:"emos", pseudonym:"emos"}`，「谁邀请了我」这个信息拿得到却没展示。见 P2-3。

### 疑点 3：`/api/user/base` 与 `/api/user` 的区别，两处都在调，是否重复？

- `GET /api/user/base` → 3 字段：`user_id` / `username` / `avatar`（实测）。
- `GET /api/user` → 25 字段（实测）。
- **实际上并没有「两处都在调」**：`/api/user/base` 只出现在 `endpoints.ext.ts:13` 的 `clientApi.session.base`，而**整个仓库没有任何文件 import `clientApi`**（`grep -rn "clientApi" src/` 只有定义处一行）。真正跑的只有 `sessionApi.profile`（`useSession`，queries.ts:17-37）和登录校验 `request('/api/user')`（LoginView.tsx:44）。
- 所以结论是：**`base` 是纯死代码**，不是重复请求。要留还是删由你定 —— 我倾向删（`ext` 的定位是「后台没接的客户端能力」，而 `base` 是 `profile` 的子集，留着的唯一价值是「以后登录校验可以改轻量端点」）。
- 另外 `GET /api/sign/check`（`clientApi.session.check`，实测 200 `{is_sign,user_id}`）同样没人用；它的响应体只有 2 字段，比 LoginView 现在用的 `/api/user` 轻得多，**登录校验用它更合适**（见附录 A 的耗时数据：两者都在 0.35-0.45s，但响应体差 20 倍）。这是「未使用但值得用」的一个。

### 疑点 4：`banApi.list` 文档说「只显示最近一周」，但实测数据跨度一年多？

拆成两个事实，见 P1-2 与 P2-5：

1. **「跨度一年多」是误读**：`created_at` 在 3 条记录上与 `/api/invite/tree` 的 `join_at` 逐秒吻合（表在 P1-2），它是**注册时间**。2025-09-26 ~ 2026-01-04 这个跨度是「这三个号注册得早」，不是「封禁记录横跨一年」。列表里**没有任何封禁时间字段**。
2. **「最近一周」无法证实**：接口只回 3 条，而全站 `is_disabled` 有 69 人 → 列表确实被过滤过（这点和「只显示最近的」一致）；但 `disable_reason` 的前缀 `260307/260321/260415` 若按 YYMMDD 解读是 2026-03/04，比「一周」老得多。两边的证据指向不同结论，**没有字段能判定封禁时间**，所以「最近一周」这句 UI 文案（UserSearchView.tsx:54）和后端注释都只能算未证实。

给后端提一个明确的诉求：`/api/ban/list` 请补 `disable_at`（封禁时间）与 `is_disabled` 之外的记录时间，否则前端只能猜。

---

## 四、实测 vs 只读代码

### 实测过的（可直接复现）

| 请求 | 结果 |
|---|---|
| `GET /api/user` | 200，25 字段全文见第三节 |
| `GET /api/user/base` | 200，`{user_id,username,avatar}` |
| `GET /api/sign/check` | 200，`{is_sign:true,user_id:"e7E6K6OE4s"}` |
| `GET /api/invite/info` | 200，`{invite_at:"2026-01-17 10:10:10",invite_remaining:1,invite_count:11,parent:{user_id:"emos",pseudonym:"emos"}}` |
| `GET /api/invite/history?page=1&page_size=3` | 200，`total:11`，9 个 item 字段 |
| `GET /api/invite/history?page=1&page_size=10` | 200，`total:11, items:10`（第 11 条拿不到） |
| `GET /api/invite/history?username=elephant1` | 200，`total:1`，`invite_remark:"小号"`（过滤参数确实生效） |
| `GET /api/invite/history?page=99&page_size=3` | 200，`items:[]`（越界不报错） |
| `GET /api/invite/tree` | 200，3238 节点，根 `emos`，`is_disabled` 69 人 |
| `GET /api/ban/list`（及 `?page=2` / `?page_size=100` / `?days=30`） | 均 200、均 3 条（参数被忽略） |
| `GET /api/user/stats/video/history?dates[]=…` | 200，本账号无观影数据 `[]`（参数编码方式与 Postman 一致） |
| `GET /api/whisper/sender` / `receiver` | 均 200 `[]`（本账号 0 条） |
| `PUT /api/user/showEmpty` body `{"is_show_empty":"abc"}` | 200 `{"is_show_empty":false}`（非布尔按 false 处理，已复原为 true） |
| `PUT /api/user/pseudonym`（无 name） | 422「name 不能为空」 |
| `PUT /api/user/passwordReset`（无 password） | 422「password 不能为空」 |
| `POST /api/invite` body `{}` | 422「invite user id 不能为空」 |
| `POST /api/invite` 非法 id | 422「invite user id 必须是 10 个字符」 |
| `POST /api/invite` 邀请自己 | 422「螃蟹不是这么吃的」 |
| `POST /api/invite/revoke` body `{}` | 422「user id 不能为空」 |
| `PUT /api/ban/change`（空 query） | 422「type 不能为空」 |
| `PUT /api/ban/change?type=foo` | 422「已选的属性 type 无效」→ 枚举确认 `disable/unblock` |
| `PUT /api/ban/change?type=unblock&user_id=e000000000s` | 422「用户ID错误」 |
| `POST /api/whisper/reply`（空 body / 空 content / id=0） | 422「whisper id 不能为空」/ 422「content 不能为空」 / 404 |
| `POST /api/whisper/create`（空 body / 非法 receiver） | 422「receiver user id 不能为空」/ 422「接收用户ID输入错误」 |
| `GET /api/user/agreeDownAgreement` · `originalImage` · `telegram` · `resetToken` | 均 405 且回显「Supported methods: PUT / DELETE / PUT」→ **路由存在**（Postman 未收录，非幽灵端点） |
| `GET /api/user/nonexistent` | 404 `{"success":false,"message":"emos api 404 :("}` |
| `GET /api/user` ×5 / `base` ×3 / `sign/check` ×3 计时 | 0.36–0.84s（LoginView 的 12s 超时足够；审查前期偶发 28-45s 超时是网络/CF 抖动，非接口本身慢） |

### 只读了代码 / 只对了契约（未实测）

| 项 | 原因 |
|---|---|
| `PUT /api/user/sign` | 今天已签（`sign.sign_index=464`），签到会产生真实收益记录；只做了路由/参数推断 |
| `GET /api/user/passwordTemporary` | 会生成新的一次性密码 |
| `PUT /api/user/originalImage` | toggle，会改真实偏好 |
| `DELETE /api/user/telegram` | 会真解绑 |
| `PUT /api/user/resetToken` | 语义未知，可能让当前 token 失效 |
| `PUT /api/user/agreeDownAgreement` | 会让本账号获得下载权限（真实授权变更） |
| `PUT /api/user/agreeUploadAgreement` | 本账号已是 `is_can_upload=true`，无必要 |
| `POST /api/invite/revoke` 的成功路径 | 会真的撤销一个真实用户，无法回滚 |
| `POST /api/invite` 的成功路径 | 会真的占用一个邀请名额（本账号只剩 1） |
| `PUT /api/ban/change` 的成功路径 | 会把真人封禁/解封 |
| `whisperApi.sender/receiver` 的响应字段 | 本账号 0 条，字段语义取自 `docs/api-shapes.md`（历史抓包），**P1-1 的结论依赖它** |
| `whisperApi.reply` 的响应体 | 未产生真实回复 |

---

## 附录 A：登录校验为什么建议换成 `/api/sign/check`

`src/views/LoginView.tsx:44`：

```ts
await request('/api/user', { token: trimmed, silent401: true, signal: AbortSignal.timeout(12_000) })
```

只为「这个 token 有没有效」，却拿了 25 个字段（其中含明文服密码）。实测两者耗时同量级（0.36-0.45s），`/api/sign/check` 响应体只有 `{is_sign, user_id}`。换掉之后：语义更准（「是否登录」而不是「是否有后台权限」）、传输小 20 倍；代价是 403 判定要另找依据（后台权限目前靠 `roles.includes('admin')`，登录后 `useSession` 仍会拉 `/api/user`，其实不影响）。

## 附录 B：本域 UI 入口一览

| 路由 | 文件 | 覆盖的端点 |
|---|---|---|
| `/` 概览 | `views/OverviewView.tsx` | user.profile（经 useSession/useCapabilities）、user.sign、ban.list（待办计数）、user.statsVideoHistory |
| `/account?tab=profile` | `views/AccountView.tsx` | user.profile、user.showEmpty、user.pseudonym、user.originalImage、user.unbindTelegram、user.agreeUpload、user.agreeDown、user.sign、user.passwordTemporary、user.passwordReset |
| `/account?tab=invite` | `views/AccountView.tsx` | invite.info、invite.history、invite.tree、invite.create、invite.revoke |
| `/users` | `views/UserSearchView.tsx` | ban.list、ban.change(unblock) |
| `/users/$userId` | `views/UserDetailView.tsx` | ban.list、ban.change(disable/unblock)、invite.history(user_id 过滤) |
| `/whisper` | `views/WhisperView.tsx` | whisper.sender、whisper.receiver、whisper.reply |
| 无 | — | sign.check、user.base、user.resetToken、whisper.create、invite.emp/remark（后两者在 `endpoints.ext.ts` 且 `clientApi` 无人 import） |
