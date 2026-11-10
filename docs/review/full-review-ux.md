# 全站交互一致性 / 视觉一致性审查

分支 `rewrite/v2`（工作区 `emos.club`，只读审查，未改 `src/`）。
环境：`VITE_MOCK=1 npx vite --port 5288`（独立 dev server，避免和别的会话抢端口）。1600×1000 视口，Playwright 逐页截图 + 程序化测量 + 交互实测。
截图目录：`/Users/xiangchengjie/DSH/ux-*.png`（20 张，见文末清单）。
控制台：0 个 JS 错误；只有图片域 `ERR_CONNECTION_REFUSED`（外部图床不可达，这部分正好用来验图片兜底）。

> mock 覆盖缺口：`/api/video/media/listAll`（回收站-资源）、`/api/whisper/*` 未模拟，这两处的表格只能读代码判断，已在对应条目注明「代码核对」。

## 结论

一致性整体比预期好：**危险动作的二次确认、表格左对齐、卡片原语、四态组件、颜色 token 都已经是同一套**（见 §4）。问题集中在三个地方：

1. **两套 CSS 语义撞车**（`.detail-head`、`.table .btn`、`.input` 的 `min-width`）——一个类被当两种东西用，视觉和交互都串了（M1/M2/M5）。
2. **同一件事在不同页面用不同做法**（搜索框位置、tabs/seg、编辑入口、空态内容、术语），共 14 处。
3. **旧账复现**：`⌘K` 假键帽、表格主操作被压灰、图片兜底漏点、卡内表格缩进，四轮下来仍未修（§5）。

---

## 1. 必须改

### M1 · 卡片里长出了第二张卡片（`.detail-head` 一名两用）

`components.css:715` 把 `.detail-head` 定义成「页面级卡片」（`padding:24px` + `border` + `border-radius:18px` + 卡片渐变 + 卡片阴影），`components.css:1672` 又把它当「卡片内的标题行」用（`display:flex` + `space-between`）。后一处只覆盖了 `display`，**padding/border/渐变/阴影全部保留**，于是卡片内嵌了一张同样的卡。

实测（`/account`，`ux-account.png`）：
```
card.x = 340   .detail-head.x = 365（card padding 24 + 1px 边框）
detail-head 计算样式：padding 24px / border 1px rgba(255,255,255,.075) / radius 18px / 卡片渐变 / 卡片阴影
```
同样出现在 `/fund?tab=merchant`（`ux-fund-merchant.png`，「回调地址」整块）、`/media/:id`（`ux-video-detail.png`，「资源」整块）。

为什么必须改：同一张卡片里，「客户端登录」是平铺 kv 行、「已登录设备」却多一层边框盒子，用户会以为那是可点的子区域；而影片详情里「资源」有框、「字幕」没框，**同一页两组同类内容长得不一样**。

改法：用现成的 `.card-head`（卡片内左右分栏）替换这三处（`PayView.tsx:97`、`AccountView.tsx:228`、`VideoDetailView.tsx:283`），`.detail-head` 只保留页面级那一个定义。

### M2 · 表格里的主操作被 `.table .btn` 抹平（复现，ia-round3 已记）

`components.css:1222` 的 `.table .btn { padding:0; border:0; background:transparent; color:var(--fg-3) }` 优先级（0,2,0）高于 `.btn--primary`（0,1,0），所以表格内的主按钮全部退化成灰字。

实测（`/orders?scope=mine` 的「付款」，`ux-orders-mine.png`）：
```
background: rgba(0,0,0,0)   border: 0 none   color: rgb(143,141,134)
```
同一行的 `付款 / 催发货 / 关闭 / 删除` 四个动作**视觉权重完全相同**，而「付款」是这行唯一的主操作。`/seek` 的「认领」（`btn--ghost`）同样是灰字（`ux-seek.png`）。

改法：把这条规则收窄成 `.table .btn--quiet`（表格里默认就是文字动作），或给表格内主操作单独一档（`--fg` + 500 字重），不要用 `primary` 背景块——符合「克制」。

### M3 · 两个页面的首列表头和内容错位 43px

首列有缩略图时，表头要加 `.th-thumb`（`padding-left:67px`）才能和标题文字对齐（`components.css:457`，注释也写明了原因）。**线路、用户**两页漏了这个类：

| 页面 | 表头 | 表头文字 x | 内容 x | 偏差 |
|---|---|---|---|---|
| `/lines` | `名称`（`LinesView.tsx:77`） | 365 | 408 | **+43** |
| `/users` | `用户`（`UserSearchView.tsx:66`） | 365 | 408 | **+43** |
| 其余 8 张表首列（媒体库/求片/音乐/片单/商城/订单/资金/片单详情） | — | — | — | 0 |

证据：`ux-lines.png`（「名称」贴在卡片左缘，「@proxy」右移一格）、`ux-users.png`（同）。

反向漏点（代码核对，mock 未覆盖该接口）：`RecycleView.tsx:141` 的「资源」表头带 `th-thumb`，但该 tab 的单元格只有两行文字、没有缩略图 → 会反向错位 43px。

### M4 · 搜索框和筛选组的位置有 7 种排法

程序化量了每个页面 `.toolbar` 的子元素顺序：

| 页面 | 工具栏顺序 |
|---|---|
| 媒体库 | tabs → spacer → 搜索 → 主按钮 |
| 求片 | tabs → 搜索 → seg → switch |
| 音乐 | tabs → spacer → 搜索 → seg |
| 片单 | tabs → 搜索 → seg → 主按钮 |
| 商城（我的店铺） | tabs → spacer → seg → 搜索 → 主按钮 |
| 订单 | **搜索** → tabs → spacer → seg |
| 线路 | 搜索 → spacer → 主按钮 |
| 用户 | 搜索 → 按钮 → spacer → 说明 |
| 回收站 | select → 搜索 → **tabs（在最后）** |
| 片单详情 | 搜索 → spacer → 主按钮 |
| 资金 | 只有 tabs |

后果很具体：在媒体库，`搜索片名`在右边、主按钮贴着它；切到求片，搜索跑到 tabs 后面、离左边只剩 12px（`ux-library.png` vs `ux-seek.png`）；订单页更是「搜索 → 支付 tabs → 发货 seg」三件套分成三段（`ux-orders.png`）。用户在页面之间移动时，手要重新找输入框。

改法（二选一，任选其一并写进 SPEC）：①「筛选在最左，搜索与主按钮靠右」；②「搜索固定在右、主按钮最右」。回收站和订单页按规则挪一次即可。

### M5 · 表格里的数字输入框被撑到 200px

`.input { min-width: 200px }`（`components.css:553`）压过了内联的 `width: 72px`，片单详情的「排序」列因此变成一个 200px 宽的表单控件：

实测（`/watchlists/1000`）：`width:72px` 内联 → 实际 `getBoundingClientRect().width = 200`，六行全是 200px（`ux-watchlist-detail.png`，排序列比旁边任何一列都重）。
同因：`ShopView` 分类管理的排序输入（`ShopView.tsx` 内联 `width:72`）、`SongDetailView` 页头的评分下拉（内联 `width:100` → 实际 200，`ux-song-detail.png`）。

改法：这类紧凑输入补 `minWidth: 0`（`Pager.tsx` 的每页条数下拉已经这么做了，照抄即可）。

### M6 · 同一个东西两个名字：「胡萝卜 / 萝卜」

同一个字段（片单的 `carrot`）在两个页面两种写法，而且就在相邻两级：

- 片单列表：`{watch.carrot} 萝卜`（`WatchlistsView.tsx:159`，`ux-watchlists.png`「10 萝卜」）
- 片单详情：`订阅需 {carrot} 胡萝卜`（`WatchlistDetailView.tsx:124`）
- 商城价格：`68 萝卜`（`ShopView.tsx:321`、`ProductTile.tsx`、`ProductModals.tsx`）
- 影片详情：`求片中 X 萝卜`（`VideoDetailView.tsx:270`）
- 其他所有地方（账号、资金、求片、上传奖励、求片悬赏说明）：`胡萝卜`

同一页里也有：影片详情的选集信息写「求片中 10 萝卜」（`:270`），同一个页面的删除确认写「会扣除 1 个胡萝卜」（`:619`）。

改法：全站统一为**胡萝卜**（多数页面和 wiki 用词），共 7 处字符串（`ProductModals` 3、`ProductTile` 1、`ShopView` 1、`WatchlistsView` 1、`VideoDetailView` 1）。

### M7 · 卡片内的表格比卡片标题多缩进 24px（旧账复现）

卡片 `padding:24px` + 单元格 `padding:24px` = 内容距卡片边缘 **49px**，而卡片自己的标题距边缘 25px：

实测（`/account`）：`card.x=340`，卡片标题 x=365，表头文字 x=389 → **49px**。
同样的结构：`/upload` 暂存区（`ux-upload.png`，表格明显比「暂存区」深一格）、`/media/:id` 资源/字幕（`ui.md:189` 记过 36px 版本，现在仍是）、`/users/:id` 最近播放。

改法：`.card > .table { margin-inline: -24px }`，或卡内表格单元格 `padding-inline: 24px` 改 16px；二选一，五个调用点统一。

### M8 · 图片失败兜底仍漏 4 个调用点（旧账复现，ui-round6 R1 同类）

`Poster`（`onError` → 首字方块）和 `Sidebar` 的 `Avatar`（同样有回退）覆盖得对，但下面几处是裸 `<img>`，图床不可达时直接画裂图：

| 位置 | 文件 | 实测 |
|---|---|---|
| 商品卡封面 | `ProductTile.tsx:33` | mock 图（picsum）能解析，所以没裂；代码里**没有 onError**，图床一挂就是裂图方块 |
| 商品详情弹层封面 | `ProductModals.tsx:36` | 同上 |
| 快捷购买弹层封面 | `ProductModals.tsx:155` | 同上 |
| 演职员头像 | `VideoDetailView.tsx:391` | **已实测裂图：`ux-video-detail.png` 底部三张 `naturalWidth=0`**（硬编码 `image.theotherdb.org`，同一页的 `Poster` 全部正常兜底） |

改法：商品封面直接换 `<Poster>`（比例不同，可传 `style`）；演职员补 `onError` 回退成空块（已有 `.person-card__poster--empty` 样式，只差状态）。

### M9 · 侧栏 `⌘K` 键帽没有对应快捷键（第三轮复现）

`Sidebar.tsx:126` 画了 `⌘` `K` 两个键帽，全仓 `grep metaKey|ctrlKey` = 0（`function-round2.md`、`ia-round3.md`、`ia-round5.md` 都记过）。所有截图左上角都能看到它（`ux-library.png`）。

这是最典型的「和实际行为不符」的文案：管理员会按，然后什么也不发生。要么 20 行加一个全局 keydown 聚焦搜索框，要么把键帽去掉。

---

## 2. 建议改

### S1 · 动作词：删除 / 移出 / 移除 / 关闭 / 下线 / 解绑 / 撤销

大部分区分是有语义的（删除=真删、移出=解除关联、下线=结束会话），但**片单详情同一页两个 tab 用了两个词**：

- 视频 tab：`移出`（`WatchlistDetailView.tsx:289`，确认文案「移出这个影片？」）
- 音乐 tab：`移除`（同文件 `:622`，确认文案「从片单移除《…》？」）

建议：列表内解除关联统一「移出」，破坏性删除统一「删除」，会话类统一「下线 / 撤销」。

### S2 · 空态的内容不齐

同一个 `EmptyBlock` 组件，但内容丰俭不一：

| 页面 | 标题 | hint | 动作 |
|---|---|---|---|
| 媒体库 | 没有匹配的影片 | 有（回显关键词） | 有（清空筛选） |
| 影片详情 | 找不到这部影片 | 有 | 有（回到媒体库） |
| 求片 / 音乐 / 直播 / 片单 / 回收站 / 订单 / 资金 | 有 | **无** | **无** |

「清空筛选」只有媒体库有；其余页面筛选到 0 条时，用户得自己回去改控件（`ux-empty-library.png` vs `SeekView.tsx:105`）。

建议：凡是「筛选后为空」的空态，一律给 hint（回显条件）+「清空筛选」动作；「库里本来就没有」的空态给「去哪儿创建」。

### S3 · 加载态三套写法、`拉取中` 两种形态

- 骨架：`LoadingBlock`（多数页面）、手写 `.skeleton`（概览 3 处、影片详情 2 处）
- 纯文本：`加载中…`（`ProductGrid` 触底）、`读取中…`（`AccountView` 邀请名额、`SeekView` 详情弹层）、`搜索中…`（三处候选搜索）
- 页头进行中标记：`stamp`（带圆点，媒体库/音乐/直播）vs `head-note`（纯文字，求片/订单）

建议：统一 `LoadingBlock` / 一句 `.card-note` 二选一；页头统一用 `stamp` 或统一用 `head-note`。

### S4 · 错误态直接把原始 message 当正文

`ErrorBlock`（`StateBlock.tsx`）会把 `error.message` 原样渲染。mock 下悄悄话页显示「未模拟的接口：/api/whisper/receiver」（`ux-whisper.png`）——真实环境同样会把后端/网关的原文、甚至路径暴露给用户。

同时概览的局部错误又换了语气：「暂时取不到观看记录，稍后刷新～」「本周记录取不到，稍后再看～」（`ux-overview.png`）。

建议：`ErrorBlock` 主文案固定面向用户（已有「这一屏没取到数据」），原始 message 降为 `.card-note` 小字或折叠；概览两处改用 `ErrorBlock bare`。

### S5 · 页头承载信息的容器有三种，同一指标三种说法

容器：`stamp`（带点）/ `head-note`（纯文字）/ `page-title` 旁的 `hint`。
同一个「片单槽位」：

- 片单页：`片单槽位剩余 2`（head-note）
- 账号页：`片单槽位 2 个可用`（卡内）
- 概览：`2 个可用`（卡内）

建议：页头只用一种容器（推荐 `head-note`，`stamp` 只留给真正在进行中的状态）；同一指标统一一种句式。

### S6 · 编辑入口三种形态，没有规则

- 页头：片单（编辑/维护者/隐藏/动态抓取/订阅，5 个按钮）、影片详情、歌曲详情
- 行内：商品（下架/编辑/删除）、账号笔名（输入框 + 保存）、开关类自动保存
- 行尾 `⋯`：影片详情的资源 / 字幕

另外**直播频道没有编辑入口**：`is_can_edit` 只用来决定「删除」和「新增源」显示，标题/简介/排序无处可改。

建议：定一条线——「对象级设置进页头，集合成员级操作进行尾，布尔状态用开关即时保存」；直播频道补「编辑」到页头或行尾。

### S7 · `⋯` 的语义是对的，但标签和可见度不一致

`⋯`（`.row-menu`）全站只出现在影片详情的资源行和字幕行，都是「打开多动作弹层」——**这一点是合格的**。

但：资源行 `aria-label="操作"`、字幕行 `aria-label="重命名"`（都打开同一个「重命名 + 复制播放地址 + 同步元数据 + 移到其他集 + 删除」弹层），读屏用户会得到两种预期。另外 `opacity:0.55` + `--fg-5`，实际几乎看不见（`ux-video-detail.png` 右侧的三个点需要放大才看得到）。

建议：统一 `aria-label="更多操作"`；`opacity` 提到 0.75 左右（仍是「静止不抢眼」）。

### S8 · 搜索：三种触发方式、14 种 placeholder 写法、两种清空方式

触发：

| 方式 | 页面 |
|---|---|
| 350ms 输入即搜 | 媒体库、求片、音乐、片单、片单详情、订单、商城、卖家页、回收站 |
| 输入即搜（无防抖） | 线路（本地过滤）、图库弹层、三处候选搜索（每敲一个字发一次请求） |
| 必须点按钮 / 回车 | 用户页（「查详情」）、侧栏搜索（回车） |

placeholder 写法：`搜索片名`、`搜索名称、地址或简介`、`搜索名称`、`搜索片单名`、`在该片单里搜片名`、`订单号或商品名`、`搜资源 ID`、`搜片名`、`搜索商品名`、`搜这家店的商品`、`按用户 ID 查详情`、`搜索文件名`、`输入片名`、`输入歌名`——「搜索X / 搜X / 按X查 / 输入X」四种前缀混用。

清空：侧栏搜索 `::-webkit-search-cancel-button { display:none }`（`.rail__search`），页面内 `input[type=search]` 保留浏览器原生 ×（`ux-search-filled.png` 里那个白色圆点，和整体克制风格不搭）；只有媒体库空态给「清空筛选」。

建议：全站统一「输入即搜 350ms」；placeholder 统一「搜索 + 对象名」；要么统一隐藏原生 ×、要么统一保留；筛选为空时统一给清空动作。

### S9 · 弹层底部结构两种，提交按钮五种文案

- 正常：`Modal` 的 `footer`（分隔线 + 右对齐 + 18px 下边距）
- 例外：资金页「新建基金订单」「提交凭证」把按钮放进正文（`ux-modal-fund.png`：按钮贴着最后一个字段，没有分隔线）

提交按钮：`创建`（线路/频道/片单/基金订单）、`保存`（商品/备注/设置）、`添加`（直播源）、`加入`（影片/歌曲）、`下单`（购买）。

建议：资金两处改用 `footer`；按钮文案按「新建 → 创建，编辑 → 保存，加入集合 → 加入」收敛成三条。

### S10 · 「状态」有三套视觉语言

| 表达 | 用在哪 |
|---|---|
| `badge` + 圆点 | 订单支付/发货、求片状态、商品上下架、直播源状态、片单可见性、上传队列 |
| 纯文本（muted） | 基金订单状态（审核中/已打款/待提交）、PayView 的 `PAY_STATUS` |
| `chip` | 影片详情「已删除」「N 人求片」 |

建议：状态类统一 `badge`（它已经有 5 档 token），`chip` 只留给标签（题材/标签）。

### S11 · 站内跳转用了裸 `<a>`，会整页刷新

`SeekView.tsx:222` 的「去上传」、`UploadView.tsx` 的「查看」都是 `<a href>`，其它所有站内跳转都是 `<Link>`。整页刷新会丢掉查询缓存，也会重新跑路由淡入。

建议：换成 `<Link>`（顺带 S13 的「去上传」语义问题一起处理）。

### S12 · 列表行的键盘可达性只做了 3 个页面

| 页面 | 行可点 | `tabIndex` / `role` / Enter-Space |
|---|---|---|
| 媒体库 | 跳详情 | ✅ 有 |
| 片单详情（视频） | 跳详情 | ✅ 有 |
| 片单详情（音乐） | 跳歌曲 | ✅ 有 |
| 音乐（歌曲 tab） | 跳歌曲 | ❌ 无（实测 3 行全部 `tabindex:null`，但 `cursor:pointer`） |
| 直播 | 展开源 | ❌ 无 |
| 片单列表 | 跳详情 | ❌ 无 |
| 求片 | 跳详情（仅部分行） | 仅 `video_list_id` 存在时才有，且无视觉差异 |
| 用户 | 只有姓名是链接 | 行本身不可点 |

建议：抽一个 `ClickableRow`（或把媒体库那段的 `tabIndex/role/onKeyDown` 提取成 prop），四类「进详情/展开」的行统一；求片的行补一个「可点/不可点」的视觉提示（例如有详情时标题带下划线）。

### S13 · 文案：标点、空话、名不副实

1. **概览问候缺标点**（`ux-overview.png`）：「晚上好，陈曦今天还没看片，先把想看的那部补上～」——姓名和句子直接连在一起。`OverviewView.tsx:118-120` 里 `\`，${displayName}\`` 与 `todayText` 之间没有分隔符。改：`{greeting}，{name}。` 或让 `todayText` 自带标点。
2. **用户详情的空话/矛盾话**（`UserDetailView.tsx:88,95`）：「未在封禁记录」不像状态；「以封禁列表为准，未被列出即可解封试探」读三遍也不确定要用户做什么。这两句是「用户自己能看出来」和「自相矛盾」的典型。改：「正常」/「按封禁列表判断，不在列表里即未封禁」。
3. **求片悬赏没有单位**（`ux-seek.png`）：`求片数` 列是裸数字，`悬赏` 列是 120 / 80 / 60，没有「胡萝卜」，而同类数字在商城/片单都带单位。
4. **「去上传」不带上下文**（`SeekView.tsx:222`）：从某条求片点进上传页，上传页不知道是哪条求片，用户要自己再找一遍。改：带 `?seek_id=`，或在按钮上写「去上传（本片）」。
5. **重复信息**：账号页「片单槽位」在顶部卡片的 delta 和第三张卡各出现一次；概览「我的上传 0 B 累计」的 `累计` 与其它卡的 `个/单` 不是同类单位。
6. **边界文案**：`seek_is_request` 为真但 `request_count=0` 时显示「0 人求」（`ux-search-filled.png` 第一行），建议 0 时隐藏。

### S14 · 两处破坏性动作没有二次确认

删除类动作**全部**接了 `confirmDialog`（见 §4），但：

- 账号页「已登录设备」的行内「下线」直接执行（同页「全部下线」有确认）
- 求片详情弹层里的「撤回认领」直接执行

建议：这两处补确认，或至少补 `isPending` + toast 失败提示（现在失败是静默的）。

---

## 3. 无所谓

1. **首字缩略图用于非海报对象**：用户、线路、歌手都用 `.thumb`（30×40 竖版海报比例）装一个字，看起来像竖着的卡片。属于既有列表缩略图规范，不算错。
2. **表格卡片渐变让首行略亮**：`.table-card` 是垂直渐变，行背景透明，首行比末行亮约 3/255（实测像素 22,21,20 → 18,17,16）。凑近看像「首行被选中」，实际几乎不可察觉。
3. **「分类 / 店铺」用弹层**，而资金、账号、音乐的分区用 tabs。商城这两个是「管理设置」而不是「看不同内容」，可以接受。
4. **演职员没有角色时留空行**：`{person.job ?? (person.title ? \`饰 ${person.title}\` : '')}` → 空字符串仍占一行高度。
5. **线路页 2 条数据也显示「20 / 页」下拉**：`Pager` 的 `onPageSize` 一给就渲染，可以接受。
6. **两处内联手写颜色**（`OverviewView.tsx:309` 的 `rgba(52,211,153,.85)`、`VideoDetailView.tsx:178` 的 `rgba(255,197,61,.4)`）：值与 `--c-green` / `--c-yellow` 一致，视觉无差，只是没走 token。

---

## 4. 确认一致的部分（不是凑数，是查过之后确实一致）

1. **删除类二次确认**：14 个视图里共 28 处 `confirmDialog`，覆盖了全部「删除 / 移出 / 移除 / 关闭 / 撤销邀请 / 解绑 / 恢复」（两处例外见 S14）。模板统一——`标题？` + 一句后果 +（可选）一句补救说明 + 「取消」在左、「删除/移出/关闭」在右；`danger` 时圆点转红、默认焦点落在「取消」、Esc 关确认框不穿透底层弹层、Enter 在焦点位于取消时不响应。视觉也统一（`ux-confirm.png`）。
2. **表格全站左对齐**：`.table .num { text-align: left }`，实测 10 张表的数字列、金额列、日期列全部左对齐，没有残留的右对齐（`ui.md` 时代记过的 `textAlign:'right'` 已清掉）。唯一的右对齐是 `.kv dd`，那是键值列表，不是表格。
3. **卡片原语统一**：圆角 18px、1px `--line` 边框、卡片渐变、`--shadow-card`、`padding:24px` 在 6 个页面的所有 `.card` 上一致（例外只有 M7 的表格缩进，和影片详情里 `card--tight` 的 18/20）。
4. **颜色语义统一**：绿=成功/在线、黄=等待/求片、蓝=进行中、红=危险/异常、灰=关闭/无。`badge--ok/run/wait/off/warn` 与 `--c-green/blue/yellow/fg-4/red` 一一对应，没有发现「同语义不同色」或「同色不同语义」。
5. **四态组件同源**：`LoadingBlock` / `EmptyBlock` / `ErrorBlock` 都是同一套 `.state` 版式（居中、64px 内边距、图标 + 标题 + hint + 动作），在表格卡片里的位置和外边距一致。
6. **`⋯` 的使用范围**：全站只有 2 处，都是多动作弹层入口，没有拿它当「单动作」或「菜单占位」用。
7. **弹层基础交互统一**：焦点陷阱、Esc 关闭、Enter 提交（textarea 内不提交）、关闭后焦点回到触发元素、`aria-modal`/`aria-label`，`Modal.tsx` 一处实现，所有页面共享。

---

## 5. 旧账复现清单（本轮仍在）

| 编号 | 问题 | 首次记录 | 现状 |
|---|---|---|---|
| M2 | `.table .btn` 把表格内主操作压成灰字 | `ia-round3.md` P1 | 仍在（「付款」「认领」） |
| M7 | 卡片内表格比卡标题多缩进 | `ui.md:189` P2 | 仍在（36px → 现在 49px） |
| M8 | 裸 `<img>` 无失败回退 | `ui-round6.md` R1 P1 | 换了一批调用点，仍在（商品、演职员） |
| M9 | `⌘K` 键帽没有实现 | `function.md` P0 / `ia-round3`/`ia-round5` | 仍在 |
| S10 前身 | 音乐页行尾动作列无表头 | `ui-round5.md` P2-4 | 仍在（`MusicView` 最后一个 `<th>` 空） |
| M4 前身 | 回收站 select+input+tabs 同排 | `ui-round6.md` | 仍在 |
| — | `.tabs` 与 `.seg` 选中态几乎同款 | `ui-round5.md` §3 | 仍在；本轮补充：**同一种筛选在不同页换了控件**（电影/剧集在媒体库是 `.tabs`、在求片是 `.seg`；「全部/我创建的/我订阅的」是 `.tabs`、「店铺订单/我的订单」是同构选择却是 `.seg`） |

---

## 6. 截图清单

| 文件 | 内容 |
|---|---|
| `ux-overview.png` | 概览（问候缺标点、待办卡、局部错误文案） |
| `ux-library.png` | 媒体库（左对齐基准、工具栏 = tabs+spacer+搜索+主按钮） |
| `ux-search-filled.png` | 媒体库输入中（原生 × 可见、「0 人求」边界） |
| `ux-empty-library.png` | 媒体库空态（唯一带 hint + 清空动作的空态） |
| `ux-seek.png` | 求片（工具栏另一种排列、悬赏无单位、认领灰字） |
| `ux-music.png` | 音乐（行尾动作列无表头、行可点但不可聚焦） |
| `ux-watchlists.png` | 片单（「10 萝卜」） |
| `ux-watchlist-detail.png` | 片单详情（200px 排序输入、「移出」） |
| `ux-video-detail.png` | 影片详情（卡中卡「资源」、演职员三张裂图、⋯） |
| `ux-upload.png` | 上传（卡内表格缩进 49px） |
| `ux-live.png` / `ux-live-expanded.png` | 直播（行点击展开、展开区是第二张卡） |
| `ux-shop-all.png` / `ux-shop-mine.png` | 商城（两种作用域、统计卡、「68 萝卜」） |
| `ux-seller.png` | 卖家页（页头 hint 塞了整段简介） |
| `ux-orders.png` / `ux-orders-mine.png` | 订单（搜索在左、双筛选组、付款被压灰） |
| `ux-lines.png` | 线路（表头错位 43px） |
| `ux-users.png` | 用户（表头错位 43px） |
| `ux-fund-orders.png` / `ux-fund-merchant.png` / `ux-fund-carrot.png` | 资金三 tab（卡中卡「回调地址」、状态纯文本） |
| `ux-account.png` / `ux-account-bottom.png` / `ux-account-invite.png` | 账号（卡中卡「已登录设备」、卡内表格缩进、开关） |
| `ux-song-detail.png` | 歌曲详情（页头评分下拉 200px） |
| `ux-whisper.png` | 悄悄话（错误态原样露出接口路径） |
| `ux-confirm.png` | 删除确认弹层（一致的范本） |
| `ux-modal-fund.png` | 资金新建订单弹层（按钮在正文、无分隔线） |
| `ux-recycle-video.png` | 回收站-影片（工具栏 tabs 在最后） |
| `ux-recycle-media.png` | 回收站-资源（mock 未覆盖，错误态） |
