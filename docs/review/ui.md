# EMOS 管理台 · 视觉审查报告

审查对象：`src/styles/{tokens,base,components}.css`、`src/views/*.tsx`、`src/components/*.tsx`
方法：纯静态审查（读代码 + 算术推演布局 + 计算 WCAG 对比度），未启浏览器。视口基准 1440×900，rail 300px。
审查快照：工作区含并行改动（`base.css:68-77` reduced-motion 已修、`components.css:920-928` progress-line 改为 transform、`AdminLayout.tsx` 加滚动复位）。**行号以本快照为准**；`components.css` 从 `:920` 起因并行改动整体下移 2 行，个别圆角行号有 ±2 漂移，按选择器名定位即可。

---

## 0. 结论先行

1. **令牌写了，但界面基本没在用。** 字号 6 档里 4 档零引用（`--text-body` 0 次、`--text-h1/h2` 0 次、`--text-sm` 仅 1 次），实际排版靠一套隐形的 `13.5 / 12.5 / 11.5` 三档；间距令牌 9 档（4/8/12/16/20/24/32/40/56）之外还有 `18 / 22 / 26 / 14 / 13 / 11 / 10 / 9 / 7 / 6 / 5 / 3` 十二个游离值；圆角 4 档之外另有 `5 / 6 / 7 / 9 / 12`。**结果是"看着有系统、量起来没系统"**——这是本报告里投入产出比最高的修复面。
2. **一屏只有一个焦点的宪法，在概览和详情页被彻底违反。** 概览页有 4 个 44px 数字互相同权（3 张卡 + 分区占比）；账号页把「已开通 / 需 OTP / 常规」这种两字词放进 44px 的 `.stat__value`。**数字尺寸被当成了"重要"的同义词，于是没有任何东西重要。**
3. **列表页的 44px 大标题是纯浪费。** 它复读左侧导航当前项，占掉 62px 垂直空间，把数据推到 y≈218px，一屏只剩 **9 行**。行高 64px（46px 海报 + 18px 内边距）是密度的真正杀手，改到 48px 即可一屏 12–13 行。
4. **界面在撒谎。** 12 个页面各有一颗绿点 `.stamp`，其中 5 个（商城/订单/线路/直播/片单）纯是标签，绿点="一切正常"是装饰；求片页写死「每 30 秒刷新」但 `useSeekPage` 没有 `refetchInterval`；片单页「片单槽位剩余 2」是 `Math.max(0, 2)` 硬编码；订单弹窗「上次更新」是 `formatRelative(new Date())`，永远是「刚刚」。后台的第一资产是可信度，这类"装饰性状态"比丑更贵。
5. **三簇 P0（6 条）：** ① 表单域在卡里不可见（1.02:1）**且输入焦点没有任何可见指示**（`outline:none` 吃掉了全局焦点环）；② 表格右列被静默裁切且粘性表头失效；③ 主 CTA 是死的（「新增入库」「收起侧栏」、rail 搜索框、三个排序表头、每页条数下拉全部无 handler）。

已做对的（不返工）：导航/tab/ghost 按钮的 hover 确实只改颜色；状态块确实是 bare（`.table thead th` 默认透明，仅 `.table-card` 的粘性表头有底色，规则③落实到位）；`.num` 的 tabular-nums 到位；`--fg/--fg-2/--fg-3` 三档对比度（16.0 / 8.7 / 5.4 于卡片）全部达标。

---

## 1. 全局：令牌漂移清单（含建议值）

### 1.1 间距：4px 网格事实上失守

| 严重度 | file:line | 现象 | 为什么是问题 | 建议 |
|---|---|---|---|---|
| P1 | `src/styles/components.css:279` | `.cards { gap: 18px }`、`:280 margin-top: 26px` | 18/26 不在 `--s-1..--s-9` 内，卡片栅格与 16 栅格错位，导致卡片左右边距（24/26px）与页面 40px 永远对不齐 | `gap: var(--s-4)`（16），`margin-top: var(--s-6)`（24） |
| P1 | `src/styles/components.css:429-430` | `.toolbar { gap:14px; margin: 22px 0 16px }` | 22/14 游离；页头到工具的呼吸全靠它，而 `.cards` 用 26、`.detail-head`（:809）用 22，三种"页头后第一段间距"并存 | `margin: var(--s-5) 0 var(--s-4)`（20/16），`gap: var(--s-3)`（12） |
| P1 | `src/styles/components.css:470` `:502` | 表格单元 `padding: 13px 16px` / `9px 16px` | 13/9 不在网格；同一张表头 13、行 9，垂直节奏断裂 | 表头 12/16，行 8/16 |
| P2 | `src/styles/components.css:10` `:131` | `.rail` padding 18/14/16、`.rail__foot` 14/10 | 侧栏内部三套边距 | 16 / 12 / 16；foot 12 / 8 |
| P2 | `src/styles/components.css:43` `:382` `:387` | `.rail__search` padding 9/10/11、`.chart-head` gap 28、`.legend` gap 13 | 9/11/28/13 全游离 | 8/12；24；12 |
| P2 | `src/views/VideoDetailView.tsx:159` `:222` `:317` | 详情的三处 `gap: 18`、`marginTop: 18` 内联 | 用内联数字表达"卡片间距"，绕开令牌 | 建 `.stack` 工具类 `gap: var(--s-4)` 或 `--s-5`，删内联 |
| P2 | 全局 | 内联 style 共 **268 处**，其中间距数值：12×46、10×35、18×21、14×14、11×12、13×9、22×8、26×2、9×1 | 40% 的内联是间距，全部绕过令牌；`VideoDetailView`（43 处）、`AccountView`（33 处）、`UploadView`（26 处）最重 | 只允许内联 `--s-*` 变量或工具类；建 `.stack` / `.cards--half` / `.toolbar__split` 三个工具类即可消掉一半 |

### 1.2 圆角：4 档令牌 + 5 个私有值

| 严重度 | file:line | 现象 | 建议 |
|---|---|---|---|
| P1 | `components.css:248`(8) `:513`(5) `:657`(8) `:555`(7) `:578`(7) `:264`(7) `:798`(5) `:959`(9) `:977`(12) `:992`(8) `:1008`(6) `:1038`(4) | 4/5/6/7/8/9/12 七个私有圆角并存，令牌只有 `4/8/10/12/18`。典型：三个 28px 级控件 `.btn--icon`=8、`.row-menu`=7、`.pager button`=7 各不同；两张 34×46 缩略图 `.thumb`=5、`.poster-img`=5 虽一致，却与 `.chip`(8)、`.rail__badge`(4) 不构成语义 | 收敛成 3 档用法：`--r-xs: 4px`（复选框/徽标）、`--r-sm: 8px`（缩略图/chip/kbd/图标按钮/分页/菜单项）、`--r-field: 12px`、`--r-card: 18px`、`--r-pill: 999px`。把 5/6/7/9 全部映射到 `--r-sm` |
| P2 | `components.css:248` | `.btn--icon { border-radius: 8px }` 但同尺寸 `.row-menu` 是 7px、`.pager button` 7px | 三个 28px 级控件的圆角不同 → 统一 8px |

### 1.3 字号：声明 6 档，实际用 10 档

| 严重度 | file:line | 现象 | 为什么是问题 | 建议 |
|---|---|---|---|---|
| P1 | `tokens.css:47-52` + 全仓 | `--text-body/--text-h1/--text-h2` **引用次数为 0**；实际高频值是 `13.5`（CSS 12 处 + TSX 4 处）、`12.5`（13 + 5）、`11.5`（4 + 10）、`10.5`（2）、`15.5`（3）、`17`、`19`、`36` | 设计令牌形同虚设，改一次字阶要动 100+ 处；且 13.5 与 13 在同一屏里并存（`.btn` 13.5 vs `.state__hint` 13），字重感不一致 | 令牌改成真实值：`--text-2xs: 11px`、`--text-xs: 12px`、`--text-sm: 13px`、`--text-body: 14px`、`--text-h2: 18px`、`--text-h1: 32px`、`--text-display: 44px`。把 `13.5→13`、`12.5→12`、`11.5→11`、`10.5→11`、`15.5→16`、`17→18` |
| P1 | `components.css:304` | `.stat__value { font-size: 44px }` 硬编码，而 `.page-title` 用的是 `var(--text-display)` | 同一个 44px 两种写法，改 display 档时统计数字不跟 | `font-size: var(--text-display)` |
| P2 | `components.css:311` | `.stat__value small { font-size: 17px }` | 17 不在任何档位 | 18px（`--text-h2`） |
| P2 | `components.css:26`(550) `:724`(550) `:899`(550) `:35`(450) `:313`(450) `:454`(450) `PlaceholderView.tsx:28`(550) | 使用 450/550 字重 | PingFang SC / 微软雅黑 只有 400/500/600，450/550 由浏览器最近匹配，中文标题在 Safari 与 Chrome 上粗细不一致 | 只用 400 / 500 / 600 |

### 1.4 色值（含合规性）

| 严重度 | file:line | 现象 | 计算值 | 建议 |
|---|---|---|---|---|
| **P0** | `tokens.css:7` `--field:#151413` + `components.css:620-633` `.input` | 输入框填充 vs 卡片顶 `#171614` = **1.02:1**、vs 卡片底 `#121110` = **1.03:1**；边框 `--line`(rgba .075) = **1.21:1**；hover/focus 边框 `--line-hot`(rgba .16) = **1.62:1** | WCAG 1.4.11 要求控件边界 ≥3:1。现在的输入框在卡片里**肉眼几乎不可见**——所有 Modal 表单、登录页、分页跳转框、每页条数下拉全部受影响。注意：单靠调亮填充色救不回来（`#1e1d1b` 仍只有 **1.07:1**，暗色区间相对亮度差太小），**必须落在边框与内部高光上** | `.input { border: 1px solid rgba(255,255,255,0.16) }`（1.62:1）+ `background: #1e1d1b` + `box-shadow: inset 0 1px 0 rgba(255,255,255,0.05)`；若要真正达 3:1 需 `#66645f` 级边框，与暖近黑体系冲突，**建议以"可察觉的 1.6:1 边界 + 明确的 focus ring"作为体系内的折中**，并在 token 里写明这是有意为之 |
| **P0** | `components.css:628` `.input { outline: none }` + `:61` `.rail__search input { outline: none }` | `components.css` 在 `base.css` 之后加载，同特异度下后写的 `outline: none` **吃掉了 `base.css:39-42` 的全局 `:focus-visible` 焦点环**；`.input:focus`（:634）只把边框从 1.21 抬到 1.62:1 | 全站每一个输入框（含侧栏搜索）**键盘焦点完全不可见**，失败 WCAG 2.4.7 / 2.4.11。这是键盘与屏幕阅读器用户唯一的定位手段 | 删掉两处 `outline: none`，改 `.input:focus-visible, .rail__search input:focus-visible { outline: 2px solid rgba(255,255,255,0.6); outline-offset: 1px }`；`base.css:43` 的 `:focus:not(:focus-visible){outline:none}` 已经处理了鼠标点击不需要环的情况 |
| P1 | `components.css:181-186` `.page-title span` 用 `--fg-ink` | `#6b6962` 在 `--bg` 上 = **3.62:1** | 宪法写"全部 ≥4.5:1"。hint 常是真实数据（"12,345 部"、"营业中"、"2026"），不是装饰；44px 大字虽满足 3:1 的大字门槛，但已低于自家标准，且它在**最显眼的位置用最弱的颜色**，天然把重要数字压下去 | 改 `--fg-3`（#8f8d86，5.44:1）。若想弱于主标题，用 `--fg-3` 而不是 `--fg-5` 级的 `--fg-ink` |
| P1 | `tokens.css:16-17` | `--fg-5: #6b6962` 与 `--fg-ink: #6b6962` 同值不同名 | 两个语义（图标色 / 标题副色）共用一个值，后续任何一方调整都会误伤 | 删 `--fg-ink`，统一 `--fg-5`，并规定"fg-5 仅用于图标" |
| P1 | `tokens.css:15` `:25` | `--fg-4: #83817a` 与 `--c-gray: #83817a` 同值 | 中性色被同时当成"第 4 级文字"和"语义灰" | 删 `--c-gray` |
| P1 | `components.css:592` `.pager button:disabled { color: var(--fg-5) }` | 禁用态文字 3.29:1（卡片上） | 唯一用 fg-5 承载文字的地方，寒酸到"按钮消失了" | 用 `--fg-4`（4.64:1）+ `opacity` 不再叠加 |
| P2 | `components.css:526-533` `.cell-title__code` | 11.5px + `--fg-4` + 卡片顶 `#171614` = **4.64:1**，贴着 4.5 线；列表滚动到卡片底部渐变端就跌破 | 一行里包含 id / todb / 原名，是最需要读清的第二行 | 提到 `--fg-3`（5.44:1）或把字号提到 12 |
| P2 | `base.css:3` `caret-color: var(--c-yellow)`；`base.css:35-38` 选中态黄；`components.css:778-779` 开关黄；`components.css:943` dropzone 黄；`components.css:1037-1047` MOCK 黄 | 黄同时是"电影类型"、"待支付/求片中状态"、"光标/选区/开关开启" | 语义色被拿去做品牌强调，`--c-yellow` 的"数据含义"被稀释 | 品牌强调另起 `--brand: #f2f1ee`（或直接沿用 fg），前端控件态用 `--fg`/`--line-hot`；`--c-*` 只留给数据与状态 |
| P2 | `format.ts:49` `VIDEO_TYPE_COLOR = { movie: yellow, tv: green }` | 类型色与状态色撞车：黄=电影/待支付/求片中，绿=剧集/已完成/公开/正常 | 同一屏里"绿点"可能是剧集，也可能是"一切正常" | 类型标记改中性：只用 `--fg-3` 的 6px 圆点 + 文字；或给类型独立两色（`--c-blue` 电影 / `--c-purple` 剧集） |
| P2 | `components.css:127` `:393-399` | `.rail__dot`/`.legend i` 用 `box-shadow: 0 0 0 3px color-mix(...)` 做光晕环 | 宪法禁止装饰性光晕（数据可视化除外），这是纯装饰 | 删掉 `box-shadow` 环，改用 `border: 1px solid rgba(...,0.3)` 或什么都不加 |

### 1.5 边框 / 阴影

| 严重度 | file:line | 现象 | 建议 |
|---|---|---|---|
| P1 | `components.css:286-293` `.card` 用 `--shadow-card` = `inset 0 1px 0 rgba(255,255,255,.05), 0 24px 48px -32px rgba(0,0,0,.9)` | 在近黑背景上，24px 外阴影不可见，只剩"内高光"这一条装饰性假光——花了性能买了个看不见的效果 | 卡片=边框 + 背景差，删 `inset` 高光；只保留 `--line` 1px。若必须表达层次，用 `--card-top` vs `--bg` 的明度差（已有 1.4:1） |
| P2 | `components.css:712` `:884` `.modal`/`.confirm` `box-shadow: 0 32px 80px -32px #000` | 80px 模糊半径在 24px 遮罩 + 6px backdrop-blur 下完全无效 | 统一 `--shadow-pop`，或直接去掉（遮罩已经把层划分清楚了） |
| P2 | `components.css:701-702` `.modal-overlay { backdrop-filter: blur(6px) }` | 与 `.toast` 的 `blur(10px)` 两个模糊档 | 保留 modal 的 6px，toast 用不透明底色（`rgba(24,23,21,0.96)` 已经够了），去掉 blur |
| P2 | `components.css:897` `.confirm__dot--danger { box-shadow: 0 0 0 3px rgba(242,112,74,.14) }` | 危险点的光晕 | 删，靠红色本身 + 标题 |

### 1.6 三条硬规则的执行情况

| 规则 | 结论 | 具体违约 |
|---|---|---|
| ① hover 只改颜色，不铺底色 | **3 处违约** | `components.css:251` `.btn--icon:hover { background: rgba(255,255,255,.06) }`；`components.css:1013` `.rail__menu-remove:hover { background: ... }`；`components.css:870-875` `.btn--danger:hover { background: rgba(242,112,74,.1) }`。另外 `:50-53` `.rail__search:focus-within` 改背景 `#181715`（非 hover，但同类"看不见的来源"）。建议：图标按钮 hover 用 `color: var(--fg-2)`；danger 用 `border-color` 加强 + `color: #ffb094` |
| ② 状态块不是容器（bare） | **基本合规**，但语义混乱 | 页面级列表都用 `.table-card` 包状态块（`LibraryView.tsx:84-93`、`SeekView.tsx:67-72`），卡片内则是 bare（`VideoDetailView.tsx:233-235`）。同一"空/错"视觉在两种容器里出现，读起来像两种严重度。建议统一：`ErrorBlock` 永远带容器（它就是"这一屏坏了"），`EmptyBlock` 永远 bare（它只是"这里没有"） |
| ③ thead 默认透明，只有 .table-card 有底色 | **合规** | `components.css:466-481` 正确。但**卡片内表格的粘性表头是透明的**（`VideoDetailView.tsx:238/281`、`AccountView.tsx:230/328/375`、`SongDetailView.tsx:109`）：一旦将来让容器可滚动，表头会与滚过的行文字重叠。建议 `.card .table thead th { background: transparent; position: static }`（卡片内不需要粘性） |

---

## 2. 全局：结构性缺陷

### 2.1 P0 表格体系（裁切 + 粘性失效 + 密度）

```
[P0] components.css:457-464（.table-card overflow:hidden）
     + :151-156（.page overflow-x:hidden）
     + :500-507（.table tbody td white-space:nowrap）
```

- **现象**：`.table-card` 的 `overflow: hidden` 建立了新的滚动容器，于是 `thead th` 的 `position: sticky`（:466-469）**永远不会触发**——它只会在一个不滚动的盒子里"粘"，滚动的是 `.page`。全站 9 张表的"粘性表头"是死代码。
- 同时，`td` 全部 `nowrap` + 表格 `width: 100%` → 在 900–1240px 宽度区间，7 列（媒体库）/6 列（订单、商城）的最小内容宽度超过容器，多出来的部分被 `overflow: hidden` 裁掉，而 `.page` 又是 `overflow-x: hidden`，**用户拿不到横向滚动条，右列（恰好是"操作"）直接消失**。只有 `@media (max-width:900px)` 才补了 `overflow-x:auto`（:684）。
- **建议**（三行改动）：
  1. `.table-card { overflow: clip; }` —— `clip` 不建立滚动容器，圆角裁切保留，`sticky` 立刻恢复相对于 `.page` 工作（Chrome 90+ / Safari 16+ 均支持；需回退时用 `@supports not (overflow: clip)` 分支给 `overflow: hidden`）。
  2. 新增 `.table-wrap { overflow-x: auto }` 包住 `<table>`，把横向滚动收到卡片内部，替换掉 `:684` 的媒体查询补丁；`.table { min-width: 860px }` 常驻。
  3. `td` 的 `white-space: nowrap` 收到 `th.num, td.num, td:last-child` 上；片名/备注列允许两行 `overflow-wrap: anywhere`。

### 2.2 P0 表单域不可见

见 §1.4 第一行。补充：`.input { min-width: 200px }`（:630）在 `Modal` 里被 `style={{width: 520}}` 与 `.field .input { width:100%; min-width:0 }`（:746）双重要覆盖；`Pager.tsx:34/61` 又内联 `minWidth: 0`。三处补丁说明"输入框默认宽度"这件事没有单一真相。

**建议**：`.input` 默认 `width: 100%`，`min-width: 0`；只在 toolbar 里给 `.toolbar > .input { width: 260px }`。

### 2.3 P0 假行动点 + 假状态

| 严重度 | file:line | 现象 | 为什么是问题 | 建议 |
|---|---|---|---|---|
| **P0** | `LibraryView.tsx:78-81` | 「新增入库」是 `.btn--primary`，页面唯一实心按钮，**没有 `onClick`** | 主 CTA 是页面的视觉终点，点了没反应，用户会认为系统坏了 | 接 `videoApi` 的入库流程或删掉；若未实现，降级为 `disabled` 并在 `tooltip` 说明"TMDB 入库未开放" |
| **P0** | `Sidebar.tsx:81-83` | 「收起侧栏」图标按钮无 handler；`:86-93` 搜索框无 `onChange`/`onKeyDown`，却挂着 `⌘K` 键盘提示 | 侧栏是全局常驻区域，两个死控件长期可见 = 全站性不可靠 | 二选一：实现（collapsed rail 变量 `--rail-w-icon` 已备好）或删除 |
| **P0** | `LibraryView.tsx:106` `:112` `:118` | 三个 `.th-sort` 按钮带 `aria-sort`，**全无 onClick** | 表头排序是可点击暗示最强的控件之一 | 接 `sort_by/sort_order`（`useSeekPage` 已支持该参数），或把箭头图标改成静态 `aria-hidden` 文本 |
| P1 | `LinesView.tsx:117-124` | `<Pager sizes={[20,50]} onPageSize={() => setPage(1)} />`，但 `pageSize` 是常量 `20`（:25） | 下拉框可选"50/页"但列表永远 20 行 → 用户会反复试 | `const [pageSize, setPageSize] = useState(20)`，`onPageSize={(n)=>{setPageSize(n);setPage(1)}}`；或删掉 `onPageSize` 不传 |
| P1 | `SeekView.tsx:50-54` | stamp「每 30 秒刷新」，但 `useSeekPage`（`queries.ts:88-94`）无 `refetchInterval`（全仓只有 `queries.ts:81` 的 playing 有 30s） | 明确写在界面上的承诺是假的 | 删字，或给 hangs 加 `refetchInterval: 30_000`。二者必须一致 |
| P1 | `WatchlistsView.tsx:70` | 「片单槽位剩余 {data ? Math.max(0, 2) : '—'}」 | 硬编码 2，接口里有 `slot_remaining`（AccountView 在用） | 用 `session.data?.slot_remaining`，取不到显示 `—` |
| P1 | `OrdersView.tsx:202` | 「上次更新 {formatRelative(new Date().toISOString())}」→ 永远「刚刚」 | 假时间戳比没有更糟 | 删掉这行，或显示 `order.time_pay` / 备注的真实更新时间 |
| P1 | `UploadView.tsx:106-109` |「假数据模式」用**绿点** `.stamp` | 绿点=正常，但 MOCK 是需要警惕的运行态 | MOCK 用 `--c-yellow` 或 `--c-red`；建议 `stamp` 增加 `tone` 参数（`ok/warn/idle`），默认 idle 不带点 |

### 2.4 P1 状态印章（.stamp）的系统性滥用

`.stamp i`（`components.css:203-208`）永远是 `--c-green`。12 个页面各 1 个：

| 页面 | 文案 | 真实语义 | 判定 |
|---|---|---|---|
| 概览 `OverviewView.tsx:31-34` | 正在播放 N 路 | 实时状态 | ✅ 唯一合法 |
| 账号 `AccountView.tsx:66-69` | 可上传 / 无上传权限 | 权限态 | ⚠️ "无权限"配绿点 |
| 支付 `PayView.tsx:35-38` | 已开通 / 审核态 | 商家态 | ⚠️ 审核中配绿点 |
| 媒体库/直播/音乐 | 已同步 / 拉取中 | 无"同步"概念，只有 `isFetching` | ❌ 假概念 |
| 求片 | 每 30 秒刷新 | 假 | ❌ |
| 商城 | 我的店铺 / 他人店铺 | 纯标签 | ❌ 装饰 |
| 订单 | 商户视角 | 纯标签 | ❌ 装饰 |
| 线路 | 反代线路 | 纯标签 | ❌ 装饰 |
| 片单 | 槽位剩余 2 | 硬编码 | ❌ |

**建议**：`.stamp` 拆两极 —— `.stamp--live`（带绿点，只给真实轮询/在线态）与 `.stamp`（无点，纯元信息，`--fg-3`）。11 处里 9 处应落到无点版。

### 2.5 [已在并行改动中修复] base.css 的 reduced-motion 块

```
[P1 → 已修] base.css:68-77
```
- **审查时的现象**：`@media (prefers-reduced-motion: reduce) {` 之后直接写属性（没有选择器），末尾多一个 `}`。三条声明全部无效被丢弃 → `prefers-reduced-motion` 从未生效，`.skeleton` 的无限 `shimmer`、`.toast-in`、所有 `transition` 对"减少动效"用户照常播放。
- **当前状态**：已补上 `*, *::before, *::after` 选择器，生效。**本条保留在此仅作记录**，实施时不需要再处理；后续请勿把"没有选择器的 @media"重写回来（CSS 不会报错，只会静默失效）。

### 2.6 P2 CSS 内部重复与死代码

| 严重度 | file:line | 现象 | 建议 |
|---|---|---|---|
| P2 | `components.css:129-138` 与 `:952` | `.rail__foot` 定义两次；后一条把 `display` 从 flex 改成 block（`justify-content:center`、`:677` 的媒体查询、`:673` 的 `> span:last-child` 隐藏全部失效） | 合并为一条；`:673`/`:677` 的规则删掉（DOM 已改成 button） |
| P2 | `components.css:327-377`（`.posters` + 3 个 `i` + 伪元素，约 50 行）与 `StatCard.tsx:33-41`（`PosterArt`） | **零引用的装饰性海报堆叠美术**，还带 `opacity/rotate/假海报线` | 整块删除 |
| P2 | `components.css:406-425`（`.chart`/`.chart::before`/`.chart__axis*`，约 20 行） | 零引用；其中 `:408-419` 是一圈 `radial-gradient` 黄光晕 + `blur(18px)`，正是宪法禁止的装饰光晕 | 整块删除（若将来做图表，重写） |
| P2 | `components.css:378-383` `.chart-head` | 被 5 处复用为"卡片头部左右分栏"，与图表无关 | 改名 `.card-head`（`.card-head__side` 右侧槽位），命名与语义对齐 |
| P2 | `components.css:400-405` `.legend span.is-off` | 零引用 | 删 |
| P2 | `Sidebar.tsx:25` `:113` `NavItem.tail` + `components.css:115-121` `.rail__tail` | 类型与样式都在，但没有任何 item 传 `tail` | 删字段与样式，或把真实计数接上（片单数/求片数——导航里的数字比页面里的 44px 数字有用得多） |

---

## 3. 逐页视觉层级

判定口径：`第一眼应该看到` = 该页存在的唯一理由；`现在看到` = 面积×对比度×尺寸算出来的实际第一眼。

### 3.1 概览 `/` — ❌ 最严重
- **应该第一眼**：一条"现在我该关注什么"的信号（正在播放 / 待处理求片），其次是片库规模。
- **现在第一眼**：4 个 44px 数字同权（片库总量、待处理求片、我的胡萝卜、分区占比 %），随后又是 4 个：两张卡的 160px 骨架后接 5 行榜单 + 3 行播放列表。
- `[P1] OverviewView.tsx:26-28` H1 是「11 月」，hint「2026」，面包屑第二段「2026 年」——**"概览"这个词在页面上只出现在 13.5px 的面包屑里**，年份出现 3 次。建议：`title="概览"`，`crumb=['概览']`，月份/年份移到 `.head-tools` 的无点 stamp。
- `[P1] OverviewView.tsx:72-123` 「分区构成」卡内同一组数字出现 3 次：顶部 `moviePct% 电影占比`、右侧 legend「电影 1,234 / 剧集 567」、下方两条进度条「电影 1,234 部 · 34.0%」。三处读同一个 `zones.data`。保留进度条 + 一次数字即可，删 legend 与顶部百分比（或保留顶部百分比、删进度条）。
- `[P1] OverviewView.tsx:47-70` 三张 StatCard 同权重，且 `片库总量` 卡下方 `delta="电影 1,234"` 用的是**绿色**（`.stat__delta` 默认 `--c-green`，`StatCard.tsx:14`）——"电影 1234 部"不是好消息也不是坏消息，绿色让它伪装成涨幅。建议 `tone="quiet"` 或改用中性新档。
- `[P1] OverviewView.tsx:107-116` 进度条 `boxShadow: 0 0 18px -6px ${color}` 是光晕，且进度条本身不是数据可视化必需的。删 `boxShadow`。
- `[P2] OverviewView.tsx:125` `style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}` 内联覆盖栅格 → 建 `.cards--half`。
- `[P2] OverviewView.tsx:173` 播放列表为空时用 `<EmptyBlock>`（带 `.table-card`），在卡片里套了一张卡——双层容器。

### 3.2 媒体库 `/library` — ❌ 层级被页头吃掉
- **应该第一眼**：表头 + 第一批行（这是"找片"的工具页）。
- **现在第一眼**：44px "媒体库"（复读左侧导航）→ 视线第二落点是 toolbar（工具栏 4 个控件权重接近）→ 数据从 y≈218 才开始。
- `[P1] LibraryView.tsx:51-82` 工具栏同时有：tabs（全部/电影/剧集）、搜索框（无按钮、仅回车）、「重置」（却配 `IconFilter` 漏斗图标，`IconFilter` 语义是"筛选"不是"重置"）、「新增入库」（primary，死）。
  - 建议：搜索框旁加 `IconSearch` 前缀（与 rail 搜索一致）；「重置」改文字按钮 `.btn--quiet` 且不给图标；「新增入库」若未实现则移除，让 toolbar 只剩"筛选 + 搜索"两个真实控件。
- `[P1] LibraryView.tsx:100` 首列勾选框 + `:178-182` 行尾「⋯」按钮，但**没有任何批量操作条**（勾选后没有出现操作栏）。多选是无出口的死状态。
- 见 §2.1（表头粘性/裁切）、§4.1（行高密度）。

### 3.3 影片详情 `/media/$videoId` — ⚠️ 焦点被平分
- **应该第一眼**：片名 + 海报 + 一个主操作（同步）。
- **现在第一眼**：44px 片名（对，最大）→ 但紧接着 `.head-tools` 里三个同权重 ghost 按钮 **返回列表 / 同步 / 删除**（`VideoDetailView.tsx:76-99`）。删除是破坏性操作，视觉上与"同步"完全平等，只隔 12px。
  - 建议：`.head-tools` 顺序改成 `[返回列表(quiet)] [同步(primary)] [⋯ 更多(ghost/icon)]`，删除收进更多菜单；或至少给删除 `.btn--danger`（`components.css:865` 已有类但**本页没用**）。
- `[P1] VideoDetailView.tsx:70-73` 面包屑第二段 = `video_title` = H1 完全重复；且面包屑不可点击（`PageHeader.tsx:15-20` 是 `<span>` 不是 `<Link>`）。建议 crumb 只留 `['媒体库']` 并让它可点，H1 承载片名。
- `[P2] VideoDetailView.tsx:132-153` `.detail-stats` 五个 19px 数字：`#id / toDB / TMDB / 资源 / 字幕`。**三个内部主键与两个业务计数同尺寸**，前者对运营无意义却占了 3/5 的视觉位。建议：`资源/字幕/季集` 保留 19px；`#id/toDB/TMDB` 降为 12px `--font-mono` 一行脚注。
- `[P2] VideoDetailView.tsx:159` 双栏 0.85/1.15 + `gap:18`；左栏「季与集」用 `<ul>` 手写行（:184-218，内联 8 处样式），右栏两张卡用 `.table`。**同一页两种列表语言**（手写 div 行 vs 表格行），行高、hover、对齐都不同。建议季集也用 `.table`，或抽出 `.list-row` 统一。
- `[P2] VideoDetailView.tsx:238/281` 卡内表格：卡片 `padding: 18px 20px` + `td padding-left: 16px` → 首列文字距卡片边缘 36px，比卡标题（20px）缩进 16px，**整套卡片内表格都没和标题对齐**。修复：`.card > .table { margin: 0 -20px; }` 并保留 `td:first-child { padding-left: 20px }`（或反向把首列 padding 归零）。
- `[P2] VideoDetailView.tsx:283-310` 字幕表「格式」列显示 `subtitle_codec`（ass/srt），列宽 70px 刚好卡住 3 个字母 + 内边距，易换行裁字；建议 80px。

### 3.4 片单 `/watchlists` — ⚠️ 同媒体库
- `[P2] WatchlistsView.tsx:63-73` 页面有三重"片单"提示：H1「片单」、hint「N 个」、crumb「片单 / 全部」、tab「全部 / 我创建的 / 我订阅的」、seg「影视 / 音乐」。**两层筛选器（tabs 管归属、seg 管内容类型）视觉权重相同**，dom 相邻，只有 12px 间距——用户分不清哪个是主筛选。
  - 建议：seg 降到 `.btn--quiet` 分组或移到表格右上角作为列级过滤；给 `.toolbar` 内两组控件加视觉分隔（`.toolbar__split` 竖线 `--line-soft`）。
- `[P2] WatchlistsView.tsx:105` 空状态里的「新建片单」用 `.btn--primary`，与工具栏 primary 重复（同屏两个实心按钮）。空状态场景下工具栏那个应该隐藏。
- 行内 `view.video_count` 用 `formatThousand`（:151），而 `LiveView.tsx:107` 的 `media_count`、`LibraryView.tsx:165` 的 `medias_count`、`OrdersView.tsx:104` 的 `price_order` 都直接裸输出 → 千分位不一致（见 §5.3）。

### 3.5 求片 `/seek` — ✅ 相对最好
- **应该第一眼**：待认领的求片 + 「认领」这个动作。
- **现在第一眼**：正确——tab（求片中优先）+ 列表；「求片数 / 悬赏」两个数字右对齐，`.badge--wait` 黄点标状态，层级成立。
- `[P1] SeekView.tsx:125-133` 操作列：`认领`（`.btn--ghost`，有边框）与 `催片`（`.btn--quiet`，无边框灰字）在同一列。**主操作（认领）只有在 `is_can_claim` 时才出现**，否则整列只剩一个几乎看不见的「催片」。建议：认领 → `.btn--primary`（本页唯一实心），催片 → `.btn--ghost`。
- `[P2] SeekView.tsx:85` 表头 `textAlign:'right'` 用的是内联而不是 `className="num"`，导致「操作」列与第 4/5/6 列同为右对齐，视觉上右侧四个头挤成一片；建议操作列头留白（空 `<th>`），与大表一致。

### 3.6 上传 `/upload` — ❌ 三个入口抢一件事
- **应该第一眼**：dropzone（虚线大块，本页唯一功能核心）。
- **现在第一眼**：`.head-tools` 的「同意上传协议」+ `.toolbar` 的「选择文件」primary + dropzone。**三个可点击入口做同一件事（选文件），其中两个在 dropzone 之上**。
  - 建议：删掉 toolbar 的「选择文件」（dropzone 本身就是按钮，`:148` 已绑 click）；「同意上传协议」移入 dropzone 下方的说明行（一次性操作不应常驻页头）。
- `[P1] UploadView.tsx:222-280` 下方「暂存区」用 `.stat__value` 44px 显示「0 个文件」——**一个空面板的计数占用了页面视觉第二强的位置**，与概览页的问题同源。建议该计数降到 20px（`--text-h2`）+ `--fg-2`。
- `[P2] UploadView.tsx:157-220` 队列表只在 `active.length > 0` 时渲染，但 `:170` 遍历的是 `queue`（含已完成）→ 表脚写「N 个已入库 · M 个待处理」和表格实际行数不符；已完成项还在表里占位。「清理已完成」把状态提示变成了手工家务。

### 3.7 账号 `/account` — ❌ 44px 中文词
- `[P1] AccountView.tsx:111-130` **「已开通 / 未开通 / 需 OTP / 常规」被放进 `.stat__value`（44px, letter-spacing -0.035em）**。两个中文字在 44px 下笔画粘连（PingFang 44px 中文本身需要正字距，-0.035em = 每个字收 1.5px）。同时「安全」「上传」这种标题下放一个词，信息量 ≈ 0，却占掉 1/3 屏宽。
  - 建议：这两张卡改成权益/状态行（`.kv`：`上传权限  已开通`，13.5px，`--fg-2`），只有「胡萝卜」保留 44px。**一屏一个 44px 数值**。
- `[P1] AccountView.tsx:60-63` H1 = 用户笔名，hint = `#user_id`；切到「邀请 / 胡萝卜 / 封禁」tab 后 H1 仍是笔名 → **标题不随 tab 变化**，用户无法从标题确认自己在哪一屏。建议 `title="账号"`，笔名放到 profile tab 的头部卡片里。
- `[P2] AccountView.tsx:209-220` 「邀请用户」卡里塞了输入框 + primary 按钮，与左侧「邀请名额」纯数字卡并存于同一个 `.cards` 栅格 → 统计卡与表单卡混排。建议表单独立成 `.card` 并整行（`cards--wide`）。
- `[P2] AccountView.tsx:270-272` `:349-360` 两处手写 `.table-foot` + `.pager`，与 `Pager.tsx` 重复实现；`:356` 的「下一页」**没有禁用边界**（可无限点）。删手写版，改用 `<Pager total={...} page={page} pageSize={...}>`。
- `[P2] AccountView.tsx:198` `:302` `:223` `:279` `:321` 五处 `style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}` / `marginTop:18` → 建 `.cards--half`、`.stack`。

### 3.8 商城 `/shop` — ❌ 两排 tab
- `[P1] ShopView.tsx:62-97` 页面上有**两排外观相同、间距 0 的 tabs**（`.toolbar` 第一排 商品/分类/店铺，第二排 `style={{marginTop:0}}` 覆盖后紧贴 分类 tabs）。视觉上像 6 个同级 tab，实际是两级。
  - 建议：第二排改成 `seg`（`components.css:252`，胶囊分组，与 tab 有明显形差）或改成 `.toolbar` 右侧的 `<select>`；最低成本：`.toolbar + .toolbar { margin-top: -8px; }` + 第二排 tabs 用 `--text-xs`。
- `[P1] ShopView.tsx:46-49` H1 = 店铺名，hint = 状态「营业中/被驳回」。**一个审核状态被放在 44px 的副标题位**（且是 3.62:1 的 `--fg-ink`）。审核状态是最需要被看见的信息之一，却渲染成最弱的一行字。建议：状态做成 `.head-tools` 里的带点 stamp（`pass→绿 / examine→黄 / reject→红`），H1 保留店名。
- `[P2] ShopView.tsx:171-184` 又一个手写 pager（与 AccountView 同）。全仓手写 pager 3 处（`ShopView.tsx:171`、`WatchlistDetailView.tsx:203`、`AccountView.tsx:270/349`），`Pager` 组件存在但只被 5 页使用。

### 3.9 订单 `/orders` — ❌ 主操作最弱
- `[P1] OrdersView.tsx:118-137` 「发货」是本页唯一的业务动作，样式 `.btn--quiet`（`--fg-3`，无边框，hover 才变亮）；旁边的「备注」也是 `.btn--quiet`。在 `.table tbody td` 的 `--fg-2` 正文里，两个操作按钮比正文还暗。
  - 建议：发货 → `.btn--ghost` 或 `.btn--primary`（未发货的行）；备注 → `.btn--quiet`。同时未发货行可给整行 `background: rgba(255,197,61,0.03)` 的极弱提示（这是状态，不是装饰）。
- `[P2] OrdersView.tsx:112-115` 发货徽标三态配色不统一：已发货 `badge--ok`(绿)、催发货 `badge--warn`(红)、待发货 `badge--off`(灰)。而支付列「待支付」用的是 `badge--wait`(黄)。**同为"待办"，一个黄一个灰**。建议统一：待处理一律 `--wait`(黄)，异常 `--warn`(红)，完成 `--ok`(绿)，`--off` 只给"无/不适用"。
- `[P2] OrdersView.tsx:147-204` 备注弹窗的 footer 顺序是 `[取消] [删除订单] [保存]`——删除夹在中间，且与取消同为 ghost。这是全仓最容易误点的布局。建议：删除移到弹窗 body 底部独立一行（`--c-red` 文案按钮），footer 只留取消/保存。

### 3.10 直播 `/live` — ⚠️ 选中态不可见
- `[P1] LiveView.tsx:88-97` 点击行展开下方「直播源」卡，但选中态只在标题后追加 11.5px 的「· 展开中」文字，**行背景/左侧标记完全没变**。用户点完不知道发生了什么（尤其是下方卡片在当前视图外时）。
  - 建议：`tr[aria-selected="true"] td { background: rgba(255,255,255,0.035) }`（行选中是状态，不违反规则①），加左侧 2px `--c-green` 边条。
- `[P1] LiveView.tsx:142-200` 「直播源」卡用 `.stat__value` 44px 显示源数量（同 3.6 的问题）；源列表用 `<ul>` + 内联 `borderBottom` 手写行（:164-196），与全站 `.table` 不一致。
- `[P2] LiveView.tsx:27` `source.path_type` 选项含 `mp4`，但提示文案只说「m3u8 或 flv」（:161）——文案与选项不一致。

### 3.11 线路 `/lines` — ✅ 结构最干净，两处小伤
- 5 列、无勾选、无行菜单，是全站最"正"的列表页。
- `[P1] LinesView.tsx:117-124` 每页条数下拉无效（见 §2.3）。
- `[P2] LinesView.tsx:20-26` 前端过滤 + 前端分页（`slice`），与其它页的"服务端分页 + URL 同步"不同；`Pager` 收到的是过滤后的 `rows.length`，`total` 语义变了（显示「共 N 条」= 过滤后），用户会以为筛选影响了总量。建议文案改成「匹配 N 条」。
- `[P2] LinesView.tsx:86` 地址列 `maxWidth: 320` 内联 + `textOverflow: ellipsis`，但 `td` 是 `nowrap` 且没有 `display: block`，`max-width` 在 `table-layout: auto` 下可能被内容撑破 → 长 m3u8 地址会把表格推出容器被裁掉。改为 `<span class="ellipsis" style={{maxWidth:320, display:'inline-block', overflow:'hidden', textOverflow:'ellipsis', verticalAlign:'middle'}}>`。

### 3.12 音乐 `/music` — ⚠️ 一个表格吞三种实体
- `[P2] MusicView.tsx:89-172` 同一张表根据 tab 切列名与内容（歌曲/专辑/歌手），行结构 `Record<string, unknown>` + `row.song_id ?? row.album_id ?? row.person_id`。视觉上是可以的（列头会变），但「状态」列对 albums 显示「N 首」、对 persons 显示「—」，一列三义。建议：状态列按 tab 显隐（persons 下不要这一列）。
- `[P1] MusicView.tsx:72-82` 搜索框 + 「搜索」按钮，但按钮与回车双入口、按钮永远是 `.btn--ghost` 无 disabled 态；而 `LibraryView` 只有回车没有按钮。**两页同一交互两种形态**。统一为：input 内嵌 `IconSearch` + 回车，无独立按钮（或两处都有按钮）。

### 3.13 支付 `/pay` — ⚠️ 混装
- `[P1] PayView.tsx:53-77` 三张卡：前两张是 44px 金额，第三张「回调地址」是一段 URL + 描述（`wordBreak:'break-all'`）。**同一栅格里"大数字卡"与"配置项卡"混排**，第三张卡被前两张的节奏带成"第三个指标"，实际它是设置项。
  - 建议：前两张留 `.cards`，「回调地址」独立成 `.card` 整行、`--font-mono` 12px、加复制按钮。
- `[P1] PayView.tsx:117-152` 「转赠胡萝卜」与 `AccountView.tsx:502-541` 的「转赠」是**同一功能的两个入口**，文案/校验/交互都不同（这里 3 个控件挤一行，那里是 Modal + 说明）。建议：只保留账号页一处；支付页删除（支付页的职责是"服务商配置 + 查单"）。
- `[P2] PayView.tsx:53` `:79` 用内联 `style={{ display: 'none' }}` 隐藏出错时的整段（而非条件渲染）→ 错误态下页面留空，且 DOM 里仍挂着两个大 section。改条件渲染。
- `[P2] PayView.tsx:70-75` 回调地址与描述都用 `.stat__label` / `.stat__delta` 类承载非统计内容，语义复用过头。

### 3.14 歌曲详情 `/music/song/$songId` — ❌ 不知道是哪首歌
- `[P1] SongDetailView.tsx:18-21` H1 =「歌曲详情」（**一个不携带任何信息的标题**），hint = `#123`，crumb 第二段 = `#123`。歌名在整个页面**一次都没出现**。运营进来只能靠 id 认歌。
  - 建议：`useSongDetail(songId)` 取歌名作 H1（复用 `MusicView` 的 `active` 数据或新增 query），hint 放歌手；`#id` 降为 crumb 的可点父级。
- `[P2] SongDetailView.tsx:82-95` `<pre style={{ fontFamily: 'inherit', maxHeight: 320, lineHeight: 1.9 }}>`：`pre` + `inherit` 等于手动撤销语义；歌词是内容区，`maxHeight: 320` 内滚 + 页面外滚 = 双滚动。建议改成 `<div class="lyrics">`（`white-space: pre-wrap` + `--text-body` + `line-height: 1.8`），不设 maxHeight。
- `[P2] SongDetailView.tsx:22-54` 同样三个 ghost：「返回列表 / 收藏 / 删除」——与影片详情同一问题，同一改法。

---

## 4. 过度设计 / 反而太空

### 4.1 过度设计（装饰、重复信息、多焦点）

| 严重度 | 位置 | 现象 | 建议 |
|---|---|---|---|
| P1 | 全站 | **44px 页标题成为每页最重的元素**，但它只是复读左侧导航（媒体库/片单/求片/上传/直播/商城/订单/线路/音乐/支付）。10 个页面把最强的视觉资源用在了"你已经知道的事"上 | 列表页 H1 降到 32px（`--text-h1`）或改成 24px 小标题 + 数据当主角；只有**携带身份**的详情页（片名、片单名）才用 44px |
| P1 | `OverviewView.tsx:72-123` | 一组数字卡内三重表达（legend + 大百分比 + 进度条） | 保留进度条 + 一处数字 |
| P1 | `components.css:286-293` | 卡片内高光（`inset 0 1px 0`）+ 不可见外阴影 | 删 |
| P2 | `components.css:327-377`、`:406-425` | 死掉的装饰美术（海报堆叠、黄色径向光晕） | 删（约 70 行） |
| P2 | 12×`.stamp` | 平均每页 1 个带绿点的"状态"，9 个不是状态 | 见 §2.4 |
| P2 | `PageHeader.tsx:14` | 每页面包屑都以同一个 `IconGrid` 开头（无论什么板块） | 按板块取图标，或去掉图标只留文字 |
| P2 | `OverviewView.tsx:26` `VideoDetailView.tsx:71` `AccountView.tsx:61` `SongDetailView.tsx:19` | 面包屑第二段与 H1/hint 重复（年份、片名、tab 名、#id） | crumb 只保留"可点的上级"，当前页不在 crumb 里重复 |
| P2 | `UploadView.tsx:129-132` + dropzone | 同一动作两个入口 | 见 3.6 |
| P2 | `components.css:694-703` `:712` | 遮罩 blur + 80px 阴影 + 大圆角 18px，三层强调一个弹窗 | 遮罩 0.66 已足够；阴影降到 `--shadow-pop` |

### 4.2 反而太空、缺层次

| 严重度 | 位置 | 现象 | 建议 |
|---|---|---|---|
| P1 | `components.css:157-163` `.page__head` + `.page-title`（44px） | 页头是"标题 + 右侧按钮"一条横线，下方全空；`.stamp` 与 `.btn` 都在 32px 高，**页头上半部 62px 是纯空白** | 把页头压成 2 行信息带：第 1 行 crumb（13.5px），第 2 行 `标题(32px) + 关键数字 + 工具`，总高 ≤ 76px |
| P1 | `AccountView.tsx:97-131`；`PayView.tsx:53-77`；`UploadView.tsx:222-235`；`LiveView.tsx:144-158` | `.cards` 三栏里经常只有 1–2 张卡，右侧 2/3 空着（`cards--wide` 更是整行一张卡 + 40% 空白） | 三栏只用于"≥3 张同质卡"；1–2 张时用 `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` 并 `max-width: 880px` |
| P1 | `components.css:635-646` `.state` padding 64px | 空状态/错误状态占满整行，高度 64+ → 一个"暂无数据"看起来像页面坏了。且 `.EmptyBlock` 在卡片内又套 `.table-card`（`StateBlock.tsx:32`）双层边框 | `padding: 40px 24px`；卡片内一律 `bare`（已在多数调用点做对） |
| P2 | `--page-max: 1680px` | 2K/4K 屏上内容区（视口-300 rail-80 padding）远超 1680，右侧大片死区，且左边缘固定在 x=340 从不居中 | 列表页 `--page-max: 1920px`；或 `.page > *` 居中（会与 rail 错位，不推荐） |
| P2 | `components.css:564-572` `.table-foot` | 只有一行 12.5px 灰字 + 分页，`padding: 12px 16px` → 表格底部"啪"地结束 | 加 `padding-top: 14px` 与 `--line` 上边线区分（现在用的是更弱的 `--line-soft`） |

---

## 5. 列表页信息密度

### 5.1 一屏几行：当前 9 行，目标 12–14 行

按 1440×900 实测推演（`.page` padding-top 20 + crumb 21 + title 14+47.5 + toolbar 22+32+16 + thead 47）：

```
数据起点 y ≈ 218px          剩余 900-218-44(table-foot)-48(bottom padding) = 590px
当前行高 = 46(poster) + 9×2(td padding) = 64px   → 590/64 = 9.2 行
```

- **结论：9 行/屏，对 20 行/页的分页来说，"下一页"占了半屏的操作成本。** 目标 12–14 行。
- **行高的元凶是 46px 海报**（`.thumb`/`.poster-img` 34×46，`components.css:511-513`/`793-799`）。海报在管理台里的作用是"认片"，34×46 已经够认，但 46 + 18 = 64。
- **建议**：海报 28×38，`td { height: 44px; padding: 3px 16px }` → 行高 44–48px，一屏 **12.5 行**（590/47）。配合页头 32px 还能再省 ~22px（+0.4 行）。
- 组合拳（行高 48 + 页头 32 + toolbar 20/12）→ 数据起点 y≈184，一屏 **13 行**，信息量 +41%。

### 5.2 列是否合理

| 页面 | 列数与宽度 | 问题 | 建议 |
|---|---|---|---|
| 媒体库 | 勾选40 + 片名34% + 类型12% + 资源14% + 求片14% + 上映14% + 菜单44 | ①「类型」12%≈127px 放"● 电影"两个字，浪费；②「资源」列内容是 `3 个 · 字幕 2`——**两个指标塞一列**，右对齐后短横线对不齐；③ 三列百分比 14/14/14 加起来 42%，把片名列挤到 34%（360px），而片名有主标题+副标题两行，最需要宽度 | 片名 44%（460px）、类型收成 72px 纯 color dot + 文字、资源/字幕拆成两列各 80px 固定宽、上映 96px 固定、删勾选列（无批量操作，见 3.2） |
| 求片 | 7 列 | 「求片数 / 悬赏」两个 10% 列，数字只有 1–3 位，右对齐后挤在一起 | 合并为「N 人 · 悬赏 X」一列，或各 72px |
| 订单 | 6 列 | 「下单时间」用 `formatDateTime` → `11-04 22:31`，占 12%；「金额」10% 未格式化（`price_order` 裸输出） | 时间列 96px；金额 `formatThousand` + `¥` 前缀 |
| 直播 | 6 列，「源 10% / 排序 12%」 | 排序号对运营价值极低却占 12% | 排序并进「频道」副标题行，省一列 |
| 商城 | 6 列 | 「价格 12% / 库存 12% / 销量 12%」三个数字列均衡，可接受 | 价格加 `¥`，库存 0 时用 `--c-yellow` 提示"售罄" |
| 线路 | 5 列，名称24 + 地址auto + 简介18 + 创建18 + 操作10 | 最合理的一页 | 保持 |
| 音乐 | 5 列，「状态」一列三义（3.12） | | 按 tab 显隐 |

### 5.3 数字格式不统一（密度之外的一致性问题）

| 严重度 | 位置 | 现象 |
|---|---|---|
| P2 | `LibraryView.tsx:165` `{video.medias_count} 个`；`WatchlistsView.tsx:151` `formatThousand(watch.video_count)`；`LiveView.tsx:107` `{item.media_count}`；`OrdersView.tsx:104` `{order.price_order}`；`ShopView.tsx:137-139`；`AccountView.tsx:118` | 同类计数有些走 `formatThousand`，有些裸输出。四位以上数字在一张表里会有的带逗号有的不带 |
| P2 | 单位 | 影片数在媒体库=「部」、商城=「件」、片单列表=「个」（`WatchlistsView.tsx:66`）、片单详情=「部」（`WatchlistDetailView.tsx:48`）。**同一实体两页两种量词** |
| P2 | `Pager.tsx:28` | 「共 N 条」对所有实体都用「条」，而各页 hint 用「部/个/单/件」 |

**建议**：`format.ts` 增加 `formatCount(n, unit)` 统一产出 `1,234 部`；表格列一律走它。单位常量 `UNIT = { video:'部', watch:'个', order:'单', product:'件', channel:'个' }`。

---

## 6. 页头（`.page__head`）与中英数混排

### 6.1 长标题 + 长 hint 的表现

```
[P1] components.css:157-163（.page__head 无 min-width:0）+ :174-186（.page-title/span）
     + PageHeader.tsx:23-26（hint 是 h1 内的 span）
```

1. **hint 是 `<h1>` 的子元素**。可访问名称变成「媒体库 12,345 部」，屏幕阅读器把统计数字读成标题的一部分；`h1` 的文本节点数也会影响 SEO/大纲。
2. **`.page-title span` 是行内 span + `margin-left: 12px`**：标题换行时，hint 会落到第二行行首，孤零零一个 44px 的「2026」，前面还挂着 12px 缩进；长英文片名结尾是单词边界时同样如此。
3. **`.page__head` 的左栏没有 `min-width: 0` 也没有 `flex: 1`**：flex item 的 `min-width: auto` = min-content。遇到长英文标题（《The Lord of the Rings: The Fellowship of the Ring》）或长店名时，左栏拒绝收缩，右栏 `.head-tools` 被压到极窄，而 `.head-tools` 内部 `flex-wrap: wrap` + `.btn { height: 32px }` 固定高 → **按钮文字换行后被 32px 高度裁切**。
4. 具体触发页：`VideoDetailView.tsx:70-102`（片名 + 3 按钮）、`ShopView.tsx:46-58`（店名 + 状态 hint）、`PayView.tsx:29-41`（服务商名）、`AccountView.tsx:60-83`（笔名 + 签到）。

**建议（一套改完）**：
```css
.page__head > :first-child { min-width: 0; flex: 1 1 auto; }   /* 允许收缩 */
.page-title { overflow-wrap: anywhere; }                        /* 长单词断行 */
.head-tools { flex: none; }                                     /* 工具区不被挤压 */
.head-tools .btn { white-space: nowrap; }                        /* 按钮永不换行 */
```
并把结构改成：
```tsx
<div className="page__head-text">
  <nav className="crumb">…</nav>
  <h1 className="page-title">{title}</h1>
  {hint ? <p className="page-hint">{hint}</p> : null}   {/* 独立 13px 行，--fg-3 */}
</div>
```
`hint` 独立成行后：① 不再污染 h1；② 换行不会出现悬挂缩进；③ 可以安全地把对比度提到 `--fg-3`（5.44:1）。

### 6.2 中文与数字混排的间距

| 严重度 | file:line | 现象 | 建议 |
|---|---|---|---|
| P1 | `components.css:179` `.page-title { letter-spacing: -0.03em }` | 44px 下每字收紧 **1.32px**。这对拉丁字母是"现代感"，对中文是**笔画粘连**（「概览」「订单」这类两字标题在 44px 下几乎连笔）。中文需要 0 或 +0.01em | 拆两条：`letter-spacing: -0.02em`（拉丁为主）用 `:lang(en)`，中文走 `letter-spacing: 0`。最低成本：全局 `.page-title { letter-spacing: -0.01em }` |
| P1 | `components.css:307` `.stat__value { letter-spacing: -0.035em }` | 数字用负字距是对的（tabular-nums 数字本身有空隙），但 `AccountView`/`PayView` 往里塞了中文词 | 前者按 §3.7 移除中文；`.stat__value` 保留负字距并加注"仅限数字" |
| P2 | `components.css:184` `.page-title span { margin-left: 12px }` | 中文标题 + 数字 hint 是「媒体库」+「12,345 部」，12px 是硬编码的混排缝隙，在不同字号下比例不一致 | 12px 可保留，但改成 `.page-hint { margin-top: 6px }` 的独立行后此值可删 |
| P2 | 全仓 | 中英混排靠手打空格（`部` / `个` / ` 秒内` 前都有空格，=`{value} 部`），但 `#{video_id}` `S{season}E{episode}` `todb {id}` 没有空格规则 | 定一条 CSS 之外的写作规则：**CJK 与拉丁/数字之间一律 U+0020**；或引入 `text-autospace: normal`（Chrome 118+，仅对中日韩生效，可作为渐进增强） |
| P2 | `components.css:86` `.rail__label` 0.1em、`:33` `.rail__brand-name em` 0.26em、`:474` `thead th` 0.04em | 三档中文加宽字距：0.26em 让「EMOS」后的 `MOCK` 徽标字距宽到不像同一套字 | `em` 标签保留 0.2em；`.rail__label` 0.08em；表头中文 0.02em（12px 下 0.04em 让「片名」看起来像两个独立的字） |
| P2 | `components.css:520` `:798` 缩略图内 `font-size: 11px; letter-spacing: .02em` | 缩略图上放中文首字当占位（`video_title.slice(0,1)`），11px 单字极易糊 | 12px + `font-weight: 500`，或改成中性色块无文字 |

---

## 7. 如果只改 5 处

按"改动量 ÷ 观感提升"排序，5 处能吃掉本报告约 80% 的可见问题。

### ① 表格体系（1 个 PR，3 个文件）
`components.css:457-464 / 466-481 / 500-507` + 全站 `<table>` 外包 `.table-wrap`
- `overflow: clip` 救回粘性表头；`.table-wrap { overflow-x: auto }` 救回被裁的「操作」列；`td { height: 44px; padding: 3px 16px }` + 海报 28×38 → **一屏 9 行 → 12.5 行**。
- 收益：媒体库/片单/求片/订单/直播/商城/音乐/线路/账号 9 张表同时受益；这是全站使用时长最高的区域。

### ② 页头重做（1 个组件 + 1 段 CSS）
`PageHeader.tsx:23-26` + `components.css:157-186`
- `hint` 移出 `<h1>`，独立 13px `--fg-3`（5.44:1，修掉 3.62:1 的宪法违约）；列表页标题 44→32px；左栏 `min-width:0` + `.head-tools{flex:none}` + `.btn{nowrap}`。
- 收益：修掉"长标题挤爆按钮"的硬 bug、修掉对比度违约、把数据上移 30px、让每页的视觉终点回到数据而不是复读的导航词。

### ③ 排版令牌落地（`tokens.css` + 全仓替换）
- 字阶收敛到 11/12/13/14/18/32/44，删 `13.5/12.5/11.5/10.5/17`；间距只留 4/8/12/16/20/24/32/40/56，把 `18→16`、`22→20`、`26→24`、`14→12/16`、`13→12`、`11→12`、`9/7/6/5/3→4/8`；圆角收敛到 4/8/10/12/18/999。
- 收益：一次性把"看着有系统、量起来没系统"翻转；后续任何视觉调整从"改 100 处"变成"改 1 处"。

### ④ 表单可见性 + 焦点环（3 个 token 值 + 1 行 selector）
`tokens.css:7` `--field` → `#1e1d1b` + `inset 0 1px 0 rgba(255,255,255,.05)`；`components.css:624` 边框 `--line` → `rgba(255,255,255,0.16)`；删 `components.css:628` 与 `:61` 的 `outline: none`，换 `.input:focus-visible { outline: 2px solid rgba(255,255,255,.6); outline-offset: 1px }`；`.input` 默认 `width:100%; min-width:0`。
- 收益：修掉两个 P0（1.02:1 的输入框在 9 个页面、7 个 Modal、登录页里都不可见；键盘焦点全站不可见），删掉 3 处内联宽度的补丁。

### ⑤ 删掉撒谎的状态与假动作（纯删除 + 少量接线）
- 12 个 `.stamp` 里 9 个去掉绿点（`components.css:195-208` 拆 `.stamp--live`）；
- `SeekView.tsx:52` 删「每 30 秒刷新」或加 `refetchInterval: 30_000`；
- `WatchlistsView.tsx:70` 硬编码 2 → 真实 `slot_remaining`；`OrdersView.tsx:202` 删假「上次更新」；
- `LibraryView.tsx:78` 死掉的「新增入库」、`Sidebar.tsx:81/86` 死掉的收起与搜索、`LibraryView.tsx:106-121` 三个死排序表头、`LinesView.tsx:117` 无效的每页条数——**要么接线，要么删**；
- 顺手删 `components.css:327-377` `.posters`、`:406-425` `.chart`（约 70 行死装饰）。

---

## 附：逐页一句话结论

| 页面 | 第一眼应该看到 | 现在第一眼看到 | 结论 |
|---|---|---|---|
| 概览 | 一条"现在该关注什么" | 4 个同权 44px 数字 | ❌ 焦点四散，标题是月份 |
| 媒体库 | 表头 + 第一批行 | 44px「媒体库」+ 4 个工具栏控件 | ❌ 标题复读导航，主 CTA 是死的，一屏 9 行 |
| 影片详情 | 片名 + 同步 | 片名 + 三个同权按钮（含删除） | ⚠️ 焦点对，工具区错；内部 ID 与业务计数同权 |
| 片单 | 片单列表 + 一个筛选 | 标题 + 两层同权筛选器 | ⚠️ 结构同媒体库，筛选器打架，槽位数字造假 |
| 求片 | 待认领 + 认领 | tab + 列表（正确） | ✅ 全站层级最好；主操作按钮太弱 |
| 上传 | dropzone | 协议按钮 + 选择文件 + dropzone | ❌ 三个入口同一动作 |
| 账号 | （应随 tab 变化） | 44px 笔名 + 44px「已开通」 | ❌ 44px 中文词，标题不随 tab |
| 商城 | 商品列表 | 44px 店名 + 两排 tab | ❌ 双排 tab，审核状态藏在最弱的一行字里 |
| 订单 | 待发货 + 发货 | 三行筛选 + 列表（发货是灰字） | ❌ 主操作比正文还暗 |
| 直播 | 频道列表 + 选中态 | 列表（选中只靠一句「展开中」） | ⚠️ 选中反馈缺失，源列表手写行 |
| 线路 | 列表 | 列表（正确） | ✅ 最干净；每页条数下拉无效 |
| 音乐 | 歌曲列表 | tab + 搜索框 + 搜索按钮 | ⚠️ 一表三实体；搜索交互与媒体库不一致 |
| 支付 | 收入/支出 + 查单 | 两个 44px + 一个 URL 卡混排 | ⚠️ 统计与配置混装；转赠与账号页重复 |
