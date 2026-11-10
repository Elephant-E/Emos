# EMOS 管理台 · 视觉审查（第二轮）

审查对象：`src/styles/{tokens,base,components}.css`、`src/views/*.tsx`、`src/components/*.tsx`、`docs/SPEC-UI.md`
基线：上轮 `9474275` → 本轮 `68cd790`（含上游域名切换），**外加工作区未提交改动**。
方法：静态审查 + 算术推演布局 + WCAG 对比度计算；未启动浏览器，未改动 `src/`。

> **快照与状态说明（重要）**
> - 工作区有未提交改动，且**恰好就是本轮最关键的两处**：「详情页空态收敛」与「`btn--danger-text`」。
> - 下面凡涉及这两处，我都标了 *(未提交)*——它们还没进 HEAD，别误判为已发布。
> - `docs/WALKTHROUGH.md`（未提交）是真实点检清单，我按它的验收口径核对过新页面。
> - 审查期间 `src/` 仍在被并行改动（toast 退场动画、`--t-enter`、Seek 的 `aria-busy` 等），**行号以本快照为准**；`components.css` 若再增删，按选择器名定位即可。

---

## 0. 摘要（30 秒版）

- **上轮 6 条 P0：4 已解决 / 2 部分解决 / 0 未动。上轮 24 条 P1：6 已解决 / 5 部分解决 / 13 未解决。**
- **本轮 3 条 P0 全是新的**，且都出在"新写的东西"上：表格动作被一条全局 CSS 拉平（N1）、错误态与"无权限"同屏（N2）、`!important` 打穿移动断点（N3）。
- **令牌层的真实进展只有一个 `--stack`**：六个字号令牌引用数 1/1/1/0/0/0，死令牌 5 个，内联样式 268 → 338（+26%），新原语落地率 7–20%。详见 §5。

> 逐条复核见 §1（P0）、§2（P1）；新问题见 §3；四个新页面层级见 §4；令牌实证见 §5；五处改动见 §6。

## 1. 上轮 P0 复核（6 条）

| # | 上轮 P0 | 现状（file:line） | 结论 |
|---|---|---|---|
| 1 | `--field` 1.02:1，输入框在卡片里不可见 | `.input` 改为 `border: rgba(255,255,255,.16)` + `background: #201f1c`（`components.css:626-627`），静止 1.62:1 / hover **2.35:1** / focus **3.82:1**，形成可读的明度阶梯 | **部分解决**——`.rail__search` 仍用 `var(--field)`=`#151413`（`:45`，token 未更新），侧栏搜索框对 panel 只有 **1.06:1**，仍是隐形的。两处输入框两种底色，token 与实现脱节 |
| 2 | `outline:none` 吃掉全局焦点环 | `.input` 与 `.rail__search input` 的 `outline:none` 均已删除（对比 `:622-635`、`:55-61`），`base.css:39-42` 的 `:focus-visible` 恢复生效；`.input:focus` 边框 3.82:1 叠加 | **已解决** |
| 3 | `.table-card` 裁切右列 + 粘性表头失效 | `overflow: hidden` → **`overflow: auto`**（`:464`）。裁切解决（右列可横向滚到）；**粘性表头仍失效**：`overflow:auto` 同样建立了 scrollport，而卡片没有 `max-height`，这个 scrollport 永不滚动 → `thead{position:sticky}` 依旧不生效 | **部分解决**（裁切已解决 / 粘性未解决，且 `SPEC-UI.md:35` 已把"粘性表头有底色"写成既定行为） |
| 4 | 媒体库「新增入库」无 onClick | `onClick={() => navigate({ to: '/upload' })}`（`LibraryView.tsx:79`） | **已解决**（按钮名与去向略有名实不符，可接受） |
| 5 | 侧栏「收起侧栏」+ 搜索框无 handler | 收起按钮已整体删除；搜索框接 `onChange` + Enter 跳 `/library`（`Sidebar.tsx:88-100`） | **已解决**，但见新发现 N7（`⌘K` 徽标仍在，全仓无快捷键实现） |
| 6 | 三个 `.th-sort` 有 `aria-sort` 无 onClick | 全仓 `th-sort` 引用 = 0，表头排序控件已删除 | **已解决**（按"删掉未实现能力"处理，符合 `SPEC-UI.md:90` 的"不要承诺不存在的功能"） |

---

## 2. 上轮 P1 复核（24 条）

> 上轮 P1 共 46 条，按主题合并为 24 行；合并后仍逐条实判，不做平均。

| # | 上轮 P1 | 现状 | 结论 |
|---|---|---|---|
| 1 | 间距游离值 18/22/26/14/13/9/7 | 18 被 `SPEC-UI.md:12` 合法化；但 22（`.toolbar:432`、`.detail-head:810`）、26→24 已改、14（`.stat__label:296`、`.stat__delta:319`、`.toolbar:432`）、13（`thead:472`）、9/7（`.field:745`、`pager:580`、`row-menu:557`）全部仍在 | **未解决**（新增 `--stack:12` 与已有的 `--s-3:12` **同值双令牌**，`tokens.css:26/30`） |
| 2 | 7 个私有圆角（5/6/7/9/12） | `.seg button:266`、`.row-menu:557`、`.pager button:580`、`.rail__account:962`、`.rail__menu:980`、`.rail__menu-item:995`、`.rail__menu-remove:1011`、`.rail__badge:1041`、`.thumb:515`、`.poster-img:797` 原样 | **未解决** |
| 3 | `--text-*` 引用 0 次，实靠 13.5/12.5/11.5 | 引用数：`--text-body` 1、`--text-sm` 1、`--text-xs` 1、`--text-h1/h2/display` **0**。实值仍 13.5（12 处）、12.5（13 处）、11.5，并新增 10.5/10px（`OverviewView.tsx:218`、`WatchHeatmap.tsx:66`） | **未解决** |
| 4 | `.stat__value` 44px 硬编码、与 `--text-display` 二义 | base 仍 `font-size: 44px`（`:306`）；新增 `.card--stat > .stat__value { font-size: 42px }`（`:1111-1116`）→ 现在**两套统计卡两套字号**（44 / 42），而 SPEC 只承认 42 | **部分解决**（引入了第二套而不是统一） |
| 5 | `.stat__value small` 17px、450/550 字重 | 17px 与 450/550 全部原样（`:313`、`:26`、`:35`、`:725`、`:900`） | **未解决** |
| 6 | `.page-title span` 用 `--fg-ink` = 3.62:1 | 改 `--fg-3`（`:184`）= **5.44:1**，字距 0 | **已解决** |
| 7 | `--fg-5` 与 `--fg-ink` 同值、`--fg-4` 与 `--c-gray` 同值 | 两个重复令牌都在（`tokens.css:16-17`、`:15/25`），且引用数均为 **0**（纯负债） | **未解决**（更糟：现在是死令牌） |
| 8 | `.pager button:disabled` 用 `--fg-5`（3.29:1） | 原样（`:594`） | **未解决** |
| 9 | 语义色被当品牌强调（caret/selection/switch/dropzone/MOCK） | `base.css:3`、`:35-38`、`components.css:779-780`、`:944-946`、`:1038-1047` 全在 | **未解决** |
| 10 | `VIDEO_TYPE_COLOR` 绿/黄撞状态色 | `format.ts:49` 未动 | **未解决** |
| 11 | 圆点光晕（`box-shadow: 0 0 0 3px`） | `.rail__dot:126`、`.confirm__dot--danger:898` 仍在；`.legend i:400` 随死代码一起无引用 | **部分解决**（因迁怒式死代码，不是主动修） |
| 12 | `.card` 的 `inset` 假高光 + 不可见外阴影 | `box-shadow: var(--shadow-card)` 未动（`:293`、`tokens.css:41`） | **未解决** |
| 13 | hover 铺底 3 处（`.btn--icon`/`.rail__menu-remove`/`.btn--danger`） | `:253`、`:1016`、`:871-875` 原样 | **未解决** |
| 14 | 状态块 bare 语义混乱 | `StateBlock.tsx` 未动，仍按 `bare` 二选一 | **未解决** |
| 15 | 卡内表格 thead 透明但 `sticky` | 未动；且新增 `.card-body { overflow-x: auto }`（`:1161`）又给每张卡内表格套了一层横向 scrollport | **未解决**（新增一层潜在裁切） |
| 16 | 假行动点组 | 新增入库/收起/搜索/排序皆已处理（见 P0）；**每页条数下拉也已修**（`LinesView.tsx:117-124` 现在真正 setPageSize） | **已解决** |
| 17 | 求片假「每 30 秒刷新」 | `useSeekPage` 已加 `refetchInterval: 30_000`（`queries.ts:245`） | **已解决** |
| 18 | 片单「槽位剩余 2」硬编码 | 改 `session.data.slot_remaining`（`WatchlistsView.tsx:70`） | **已解决** |
| 19 | 订单假「上次更新 刚刚」 | 整段删除（`OrdersView` 变更） | **已解决** |
| 20 | 上传 MOCK 配绿点 | `.stamp i` 默认改 `--fg-5`（`:1069`），绿点只剩 `.stamp--live`——但**全仓 0 处使用 `.stamp--live`**，MOCK 现在是一个中性灰点 | **部分解决**（"假装正常"消失，但警示语义也一起丢了） |
| 21 | 12 处 `.stamp` 系统性滥用 | 绿点全变灰点；12 处文案仍是「已同步 / 商户视角 / 反代线路 / 删除后可在这里恢复」这类纯标签或伪状态 | **部分解决**（颜色骗人已止，语义仍空） |
| 22 | reduced-motion 失效 | 已补 `*, *::before, *::after`（`base.css:68-77`） | **已解决**（上轮已记录） |
| 23 | `.posters` / `.chart` 死代码（~70 行） | 两段原样（`:329-379`、`:408-427`）；**又新增** `.legend`（`:386-407`）成死代码（概览的分区卡被删了）；`StatCard.tsx` + `PosterArt` 也已全仓 0 引用 | **未解决 → 扩大**（死 CSS 约 100 行 + 41 行死组件） |
| 24 | 概览 4 个 44px 同权数字 / H1=月份 / 一卡三重表达 | H1 仍是「11 月」+ hint「2026」+ crumb「2026 年」（`OverviewView.tsx:73`）；4 卡仍同权（现 42px；未加载时 3 张是「—」，签到卡在已加载未签到时也是「—」）；三重表达随卡片重做消失 | **部分解决**（表达冗余消失，焦点问题仍在） |

**小计（24 条）：已解决 6 / 部分解决 5 / 未解决 13。**

---

## 3. 本轮新发现

### P0

**N1｜`.table .btn` 把全站表格里的动作拉平成同一种灰字**
`components.css:1174-1180`
```css
.table .btn { padding: 0; border: 0; background: transparent; color: var(--fg-3); }
```
- **现象**：一行里「发货 / 备注 / 删除」（`OrdersView.tsx:136-166`）、「下架 / 编辑 / 删除」（`ShopView.tsx:148-180`）、「认领 / 催片 / 去上传」（`SeekView.tsx:124-140`）、「删除」（`WatchlistsView.tsx:167-193`）**全部渲染成 13.5px 的 `--fg-3` 无边框文字**，彼此只隔 `gap: 4px`（内联 `display:inline-flex;gap:4`）。
- **为什么是问题**：这是本轮影响面最大的一处。`gap:4px` + 同色同形 = 危险动作与良性动作在视觉上不可分，误点全靠确认框兜底；同时「主操作」这个概念在表格里被彻底取消（订单的「发货」是这个后台最核心的写操作之一）。它直接违反了宪法「一屏一个视觉焦点」——现在焦点是零。
- **建议**：保留「墨迹对齐」的正确部分（`padding:0`、无边框、`hover` 只变色），但**按语义分档**：
  ```css
  .table .btn { padding: 0; border: 0; background: transparent; color: var(--fg-2); }  /* 默认行内动作 */
  .table .btn--danger-text { color: var(--fg-3); }
  .table .btn--danger-text:hover { color: var(--c-red); }
  .table .btn--primary-ink { color: var(--fg); font-weight: 500; }   /* 行内主操作：发货、认领 */
  ```
  并把动作间距从 `gap:4` 提到 `gap:12`，危险动作前加一条 `1px` 竖分隔（`--line-soft`）。

**N2｜错误态不短路，同屏给出两个互相矛盾的结论**
`UserDetailView.tsx:73-101`；`RecycleView.tsx:91-99`
- **现象 A（用户详情）**：`pay` 请求失败时，同时渲染 ①`ErrorBlock`（"这一屏没取到数据"）②`limited` 说明（"当前账号没有服务商权限…"）③4 张统计卡，其中「胡萝卜 / 上传量 / 邀请关系」三张全是「—」。**同一屏在说"没取到数"和"你没权限"，用户无法判断是网络问题还是权限问题。**
- **现象 B（回收站）**：`{active.error ? <ErrorBlock/> : null}` 与 `{!active.isLoading && rows.length === 0 ? <EmptyBlock title="回收站是空的"/> : null}` 都没有互斥守卫——**出错时"没取到数据"和"回收站是空的"同时出现**。这正是上轮 §2.3「状态块必须单一出口」的复发（其他老页面原来有 `!error &&` 守卫，新页面漏了）。
- **建议**：三态短路，一个出口：
  ```tsx
  {q.isLoading ? <LoadingBlock/> : q.error ? <ErrorBlock/> : rows.length === 0 ? <EmptyBlock/> : <Table/>}
  ```
  用户详情里 `limited` 只在 `!error && !isLoading && !info` 时渲染。

**N3｜`!important` 补丁把 900px 断点打穿了**
`components.css:660` vs `:683`
- **现象**：为压住内联栅格，`@media (max-width:1240px)` 里写了 `.cards { grid-template-columns: repeat(2,…) !important }`；而 `@media (max-width:900px)` 的 `.cards { grid-template-columns: minmax(0,1fr) }` **没有 `!important`**。两者在 <900px 同时命中，`!important` 胜出 → **手机宽度下统计卡仍是 2 列**（可用宽 624px → 每列 302px，卡片内容宽 254px，42px 数字 + 中文单位会挤压）。
- **为什么是问题**：这是用 `!important` 治内联的典型反噬：补丁生效了，但覆盖了真正的移动断点，而且下一个人看不出这里是坏的。
- **建议**：删掉 `!important`，把内联栅格换成类（`.cards--4` / `.cards--2` / `.cards--1`），断点只写在这些类上：
  ```css
  .cards--4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
  @media (max-width:1240px){ .cards--4 { grid-template-columns: repeat(2,minmax(0,1fr)); } }
  @media (max-width:900px){ .cards--4, .cards--2 { grid-template-columns: minmax(0,1fr); } }
  ```

### P1

**N4｜`.card--stat` 与 `.card` 两套统计卡并存，`StatCard.tsx` 成死组件**
`components.css:296-328`（旧：`margin` 14 + 44px）vs `:1092-1123`（新：`row-gap:var(--stack)` + 42px）
- 新原语只被 2 个视图用（`OverviewView` 4 次、`UserDetailView` 4 次）；`AccountView`（4 张）、`PayView`（2 张）、`UploadView`（1 张）、`LiveView`（1 张）**仍是旧 `.card` + 44px + `margin:14px`**。
- 直接后果：同一个后台里统计数字**有时 44px 有时 42px**，行距有时 14 有时 12。上轮 §3.7 的「44px 中文词」在 `AccountView.tsx:113-116`、`:124-126` 原样存在。
- **建议**：把 `.card--stat` 推广到 4 个老页面（纯机械替换：`className="card"` → `"card card--stat"`，删掉 3 处内联 `marginTop:10`），然后**删掉 `StatCard.tsx` 整个文件**（已 0 引用）。

**N5｜概览页现在是"个人主页"，运营信号全部消失**
`OverviewView.tsx` 全篇
- 上轮的「片库总量 / 待处理求片 / 正在播放」三张卡**全部被删**，换成「签到 / 我的胡萝卜 / 片单槽位 / 我的上传 + 继续观看 + 我的近况 + 我的片单 + 快捷入口」。
- **为什么是问题**：这是媒体服务后台。运营登录后第一屏应该是「这台实例健康吗、有没有待处理的事」，现在是「我今天看了几分钟」。「待处理求片」这种**唯一需要主动处理**的信号，从概览消失后只能靠侧栏点进求片页才发现。
- 顺带：未加载完成时 4 张卡里有 **3 张是「—」**（`:94`、`:116`、`:127`）；更糟的是**签到卡在已加载、今天未签到时也显示「—」**（`:94` 的 `signedToday ? days : '—'`），配一行小字「还没签到」——大号破折号当正文用。
- **建议**：保留个人化内容，但在第一行补一张「运营」卡（片库总量 / 待处理求片，两者都是 `useSeekOpen`+`useZoneCounts` 的廉价查询），或把「待处理求片」并入 `快捷入口` 并显示计数徽标。空值不要用「—」占满 4 格，把未开通的卡片整张隐藏。

**N6｜概览新原语被内联样式打败（同一文件里两种写法）**
`OverviewView.tsx:97/108/119/130` 各写 `style={{ marginTop: 10 }}`，直接覆盖 `.card--stat { row-gap: var(--stack) }`；`:81/136/251` 三处内联 `gridTemplateColumns`；`:262/268` 用 `state__hint` + 内联 padding 冒充 `card-note`（而同文件 `:148/151` 又用了 `card-note`）。
- **建议**：删 4 处 `marginTop:10`、2 处 `state__hint`→`card-note`、3 处栅格→`.cards--4/.cards--2`。这几刀下去 Overview 的内联从 43 处降到约 28 处。

**N7｜`⌘K` 键盘提示仍未实现**
`Sidebar.tsx:101-104`（`.rail__keys`）——全仓 `metaKey` / `KeyK` 命中 0 处。
- 上轮把搜索框接了 Enter 算解决了一半；但**输入框右侧仍画着 `⌘ K` 两个键帽**，按下去没有任何反应。这是 `SPEC-UI.md:90`「不要承诺不存在的功能」的直接违反。
- **建议**：加 8 行全局 keydown（`metaKey && key==='k'` → `inputRef.focus()`），或删掉 `.rail__keys`。

**N8｜用户详情把中文词塞进 42px 统计位（上轮账号页同款）**
`UserDetailView.tsx:86-88`（「已封禁 / 正常」）、`:111`（「由我邀请」）
- 42px × `letter-spacing:-0.035em` = 每字收 **1.47px**，3 个中文字丢 4.4px 侧距 → 笔画粘连（`SPEC-UI.md:73` 自己写了"中文标题字距 -0.01em，不要 -0.03em"，统计位却仍是 -0.035em）。
- 同时「账号状态」是三字状态词，丢进 42px 后和「胡萝卜 1,234」等权——**封禁与否是这个页面存在的唯一理由**，现在它是 4 张等权卡里的第 1 张。
- **建议**：状态改成 `.head-tools` 里的带点 stamp（`已封禁` → `--c-red` 点），或一张横跨整行的 `banner`；42px 位只留真正的数字。另 `formatSize(...).replace(/\s/g,'')`（`:105`）把 `"1.2 GB"` 变成 `"1.2GB"`，与全站 formatSize 输出不一致。

**N9｜概览「我的近况」：手搓图表 + 两件事挤一张卡 + 新组件没用上**
`OverviewView.tsx:186-248`；`components/WatchHeatmap.tsx`（112 行）
- ① 手搓的 7 根微条：`width:18 / height:12+min/3` 、`background:'rgba(52,211,153,0.85)'`（硬编码绿，不走 `--c-green`）、日期标签 **10px**（低于全站最小 11px）、容器 `height:60` 固定、7 根共 162px 宽**贴左**，右侧 ~340px 留白。
- ② 同一张卡里，下方又接了「胡萝卜变化记录」3 条（`:232-246`）——**观看统计与胡萝卜流水是两件事**。
- ③ 而 `WatchHeatmap.tsx` 是一个语义完整（周标题、等级 5 档、hover 提示、图例、可展开）的组件，**全仓 0 引用**。
- **建议**：用 `WatchHeatmap` 替换手搓微条（`onExpand` 接 `useWatchStats(4)`），把胡萝卜流水移出到「我的片单」那行，或删掉；`LEVELS` 里的 `rgba(52,211,153,*)` 改 `color-mix(in srgb, var(--c-green) X%, transparent)`。

**N10｜页面级垂直节奏三套并存**
`.cards { margin-top: 24px }`（`:282`）、`.detail-head { margin-top: 22px }`（`:810`）、`.toolbar { margin: 22px 0 16px }`（`:432`）、`.greeting { margin: 4px 0 0 }`（`:1081`）；外加各视图内联 `marginTop: 16 / 18 / 22`。
- 概览页现在是：`page-title`(39.6) → `greeting`(4+) → 4 卡(24) → 2 卡(24) → 2 卡(24)，但详情页是 `22`，账号页各 section 又写死 `18`（`AccountView.tsx:276/339/381`）。
- **建议**：给 `.page-body > * + *` 定一个统一节奏（`margin-top: var(--s-6)`=24），把 22/18/16 全部收进去；`--stack` 只管卡内。

**N11｜`.card-head` 固定 `height:24px` 且无收缩保护**
`components.css:1136-1143`（`min-height:24px; height:24px`），子项 `.stat__label` 是 13.5px/1.55≈21px，`card-head .btn` 是 20px —— 现在刚好塞得下。
- 风险：页面上有 `card-head` 装「长片单名 + 长动作」的场景后，flex 不换行又无 `min-width:0`，会直接把右侧动作挤出去（`overflow` 未裁剪，直接压在卡片边缘）。
- **建议**：`height` 改 `min-height`，加 `.card-head > :first-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }`。

**N12｜`.card-body { overflow-x: auto }` 给每张卡加了一层横向 scrollport**
`components.css:1161` + `:1162 .card table { min-width: 420px }`
- 卡内表格在 24px 内边距里再套一层滚动，会出现「卡片滚动条 + 页面滚动条」双层；更麻烦的是任何绝对定位的浮层（行菜单、tooltip）会被这层裁掉。目前卡内没有浮层，但 `VideoDetailView` 的资源/字幕表已经有 `row-menu` 按钮（`:276`、`:319`），一旦做成下拉就会被切。
- **建议**：`overflow-x` 只在真正需要横滚的卡内表格上开（`.card-body--scroll`），或改用 `.table-card` 那套（表格自己滚）。

**N13｜卡内表格首列缩进 44px，与卡标题（24px）错位**
`.card { padding: 24px }`（`:294`）+ `.table tbody td { padding: 7px 20px }`（`:504`）
- 卡片里表格的首列文字距卡边 24+20 = **44px**，卡标题在 24px → 每张卡里表格都比标题右缩 20px。`VideoDetailView.tsx:255/298`、`AccountView` 的邀请/胡萝卜/封禁表、`SongDetailView.tsx:109` 全部如此。
- 顺带：`:1183-1184` 的 `.table td:last-child, .table th:last-child { padding-right: 20px }` 与 `td` 已有的 20px 完全重复，是 no-op 死规则。
- **建议**：`.card > .table, .card-body > .table { margin-inline: -20px }` 配合 `td:first-child { padding-left: 20px }`；或干脆让卡内表格用 `padding-left: 0`。

**N14｜用户详情页头：ID 出现两次，且页头动作对"不存在的用户"仍然可点**
`UserDetailView.tsx:24-26`（crumb 第二段 `userId`、hint `#userId`）、`:27-70`（封禁/解除封禁）
- ID 重复是老问题（上轮 §3.3 同款）；新问题是**对象缺失时页头动作不失效**：`VideoDetailView.tsx:78-105` 收敛了正文空态 *(未提交)*，但页头的「同步 / 删除」按钮仍在，点下去是对 `videoId` 发写请求。
- **建议**：`title` 取不到时页头只留「返回列表」；`hint` 与 crumb 二选一（建议删 hint，把 `#id` 留给 crumb）。

**N15｜回收站「资源 / 影片」两 Tab 共用一套分页与 `rows`，且列宽全是内联百分比**
`RecycleView.tsx:20-27`、`:107-112`、`:156-160`
- 切 Tab 时 page 不变（`onTab` 里重置了 page=1 ✓），但两张表的列数不同（6 列 / 5 列）而 `pageSize` 相同 → 切 Tab 后行数跳变，用户会以为数据丢了。
- `width:'34%' / '22%' / 96px` 混排，百分比之和 94% + 96px → 中窄屏必然溢出（靠 `overflow:auto` 兜）。
- **建议**：两个 Tab 各自持页（`tab` 里带 `page`），列宽改固定像素（资源名 auto、大小 96、存储 120、时间 120、操作 88）。

### P2（择要）

| 严重度 | file:line | 现象 | 建议 |
|---|---|---|---|
| P2 | `components.css:953` + `:128` | `.rail__foot` 仍定义两次（后者 `display:block` 覆盖前者 flex，`:674/678` 的媒体查询规则全失效） | 合并为一条 |
| P2 | `components.css:1069-1070` | `.stamp--live` 定义但 **0 引用**（真实在播状态已随概览重做消失） | 接回概览「正在播放」或删除 |
| P2 | `components.css:386-407`、`:408-427`、`:329-379` | `.legend`（22 行）+ `.chart`（20 行）+ `.posters`（50 行）全部 0 引用；`StatCard.tsx`（41 行）0 引用 | 删除，约 130 行 |
| P2 | `components.css:380-385` | `.chart-head` 被 `UploadView:228`、`ShopView:211`、`LiveView:145` 当通用卡头用，与新 `.card-head` 重复 | 改名 `.card-head--split` 并统一 |
| P2 | `tokens.css:17,25` | `--fg-ink`、`--c-gray` 引用 0 | 删 |
| P2 | `tokens.css:26` vs `:30` | `--stack:12px` 与 `--s-3:12px` 同值双令牌 | 二选一，或把 `--stack` 定义成 `var(--s-3)` |
| P2 | `components.css:663` | `@media 1240 { .page-title { font-size:36px } }` 与 base 36px 完全相同 | 删 |
| P2 | `components.css:640` | `.state` padding 仍 64px（上轮建议 40px） | `40px 24px` |
| P2 | `UploadView.tsx:202`、`SeekView.tsx:126` | `<a className="btn" href>` 全页刷新（绕过 router） | 改 `<Link>` |
| P2 | `OrdersView.tsx:100-112` | 表格内用户名链接用内联 `textDecoration:'underline'`，全站没有 `.link` 原语 | 建 `.link`（`--fg-3` + 下划线 + hover `--fg`） |
| P2 | `ShopView.tsx:62-97` | 仍是**两排外观相同的 tab**（商品/分类/店铺 + 分类 chips） | 第二排改 `.seg` |
| P2 | `SeekView.tsx:124-140` | 「认领」`.btn--ghost` 与「催片」`.btn--quiet` 经 `.table .btn` 后完全同形（见 N1） | 随 N1 一起修 |
| P2 | `AccountView.tsx:169-231` | 新增「同意上传协议 / 同意下载协议 / 兑换槽位 / 临时密码 / 重置密码」**5 个同级 ghost 按钮**排成一片 | 按危险度分档：开通类 `.btn--primary`×1、兑换 `.btn--ghost`、密码类 `.btn--quiet` |
| P2 | `PageHeader.tsx:23-26` | `hint` 仍是 `<h1>` 内的 `<span>`（可访问名被污染；换行时悬挂） | hint 拆成独立 `<p class="page-hint">` |
| P2 | `MusicView.tsx:72-82`、`SongDetailView.tsx:19-21` | 音乐页「搜索」按钮与媒体库不一致；歌曲详情标题仍是「歌曲详情」、歌名全页不出现（上轮 §3.14 未动） | 统一回车搜索；标题取歌名 |
| P2 | `PayView.tsx:53-77/117-152` | 「累计收入/支出(42px 数字) + 回调地址(URL)」同栅格混装；「转赠」与账号页重复；出错时用内联 `display:none` 藏整段 | 回调地址独立成行；删转赠；改条件渲染 |
| P2 | `LiveView.tsx:88-97` | 行选中态仍只在标题后加 11.5px「· 展开中」 | `tr[aria-selected] td { background: rgba(255,255,255,.035) }` + 2px 左边条 |
| P2 | 全仓 | 内联样式 **338 处**（VideoDetail 49 / Overview 43 / Account 36 / Upload 26 / Shop 20 / WatchHeatmap 16 / Recycle 14） | 见 §5 第 4 条 |

---

## 4. 新页面视觉层级（4 页）

### 4.1 `/users/:id` 用户详情 — ⚠️ 结构对，权重错
- **第一眼应该看到**：「这个用户是谁 + 是否被封禁 + 封禁/解封」。
- **现在第一眼**：36px 用户名（**对**，比老页面强）→ 4 张等权 42px 卡（账号状态 / 胡萝卜「—」 / 上传量 / 邀请关系「由我邀请」）。
- 三个问题叠在一起：① 最重要的「是否封禁」与三个次要指标等权；② 其中两张卡对非服务商是「—」+「需要服务商权限」，等于 25% 的屏幕在说"我没有权限"；③ `card--stat` 的 42px 用来装中文短语（N8）。
- **建议**：封禁态做成页头下方的整行 banner（`--c-red` 点 + 一句话 + 解封按钮），4 卡位只留真正的数字（上传量、邀请数、注册天数）；非服务商时整段隐藏而非显示「—」。

### 4.2 `/recycle` 回收站 — ✅ 本轮最"正"的页面
- **第一眼**：tab（资源/影片）+ 表格 + 每行「恢复」，层级正确，`EmptyBlock` 文案（"删除的资源会先落在这里"）也符合 SPEC §7。
- 扣分项：N2 的错误态双出口、`.stamp` 那行「删除后可在这里恢复」是把说明文放进了状态位（灰点 + 一句话仍是装饰）；`恢复` 是行内唯一动作，被 `.table .btn` 拉成灰字（N1）——这里没有主次冲突，所以勉强可接受，但「恢复」是这一页唯一的写操作，值得给 `--fg` 而不是 `--fg-3`。

### 4.3 `/music` + `/music/song/:id` 音乐 — ⚠️ 一表三义未改
- 列表页结构沿用老样：tab + 搜索框 + 搜索按钮（与媒体库不一致）；表格按 tab 换列名，`状态` 列对专辑显示「N 首」、对歌手显示「—」，一列三义。
- 详情页 **歌名至今不出现**：H1「歌曲详情」+ hint `#123` + crumb `#123`，id 出现两次而名字 0 次。这是本轮"新页面"里最直接的层级失败——页面不告诉你它在讲谁。

### 4.4 `/pay` 支付 — ⚠️ 三卡混装（上轮未动）
- 一段 `cards` 里：两张 42px 金额卡 + 一张「回调地址」URL 卡。URL 卡被前两张的节奏带成"第三个指标"，实际它是配置项。
- 下方两张卡：查单（输入 + 按钮 + 4 个 detail-stat）与转赠（3 个控件挤一行 + 说明），后者与账号页重复。

### 4.5 空态收敛（针对"三个并排空状态卡片"）
**结论：应该收敛成一句，现在的做法方向对，但要再收两步。**

- 现状：`VideoDetailView.tsx:111-121` *(未提交)* 已加 `!isLoading && !error && !video` 的单一空态，`{video ? …}` 把下方双栏整块短路 *(未提交)*。这解决了"三个并排空卡"。
- 仍需再收：
  1. **页头仍是"活"的**：`同步 / 删除` 对不存在的 `videoId` 依然可点（N14）。对象不存在时页头应只留「返回列表」。
  2. **空态用了 `.table-card` 外壳**（`EmptyBlock` 默认非 bare）——一句话的结论占了一整张卡。**建议**：详情页用 bare + 顶部 24px 留白，把文案压成一行「找不到这部影片 · 它可能已被删除 → 去回收站 / 回媒体库」，不要图标 + 标题 + 说明 + 按钮四段式。
  3. **同一收敛应覆盖其余两个详情页**：`WatchlistDetailView` 的片单不存在时仍是"空 detail-head + 空表格"，`SongDetailView` 无此判断。建议抽一个 `<DetailMissing entity="影片|片单|歌曲" backTo=… restoreTo=… />`。

---

## 5. 「令牌写了没用」实证（Q4）

### 5.1 令牌引用次数（`var(--x)` 全仓）

| 令牌 | 引用 | 判定 |
|---|---|---|
| `--text-display` / `--text-h1` / `--text-h2` | **0 / 0 / 0** | 死令牌（页标题 36px、统计 44px、单位 17px 全是硬编码） |
| `--text-body` / `--text-sm` / `--text-xs` | 1 / 1 / 1 | 近乎死令牌；真实排版是 13.5/12.5/11.5/10.5 |
| `--fg-ink` / `--c-gray` | **0 / 0** | 死令牌（上轮建议删，未删） |
| `--stack` | 6 | ✅ 唯一本轮真正落地的令牌 |
| `--s-1..--s-9` | 稀疏；18/22/26/14/13/9/7 仍在用 | 4px 网格仍失守 |
| `--r-card/--r-field/--r-item/--r-chip` | 部分；另有 5/6/7/9/12 私有值 | 圆角仍 7 档 |

### 5.2 新原语落地率

| 原语 | CSS | 使用视图数 | 落地率 |
|---|---|---|---|
| `.card-head` | `:1136` | 2 / 15（Overview、UserDetail） | 13% |
| `.card-body` | `:1161` | 2 / 15 | 13% |
| `.card-note` | `:1164` | 3 / 15（+WatchlistDetail 1 处） | 20% |
| `.card--stat` | `:1092` | 2 / 15（8 处） | 13% |
| `.kv` | `:1186` | 1 / 15 | 7% |
| `.quick` | `:1125` | 1 / 15 | 7% |
| `.btn--danger-text` *(未提交)* | `:1199` | 1 / 15 | 7% |

### 5.3 反向指标：内联样式在涨

上轮 268 处 → 本轮 **338 处（+26%）**。前五名：`VideoDetailView` 49、`OverviewView` 43、`AccountView` 36、`UploadView` 26、`ShopView` 20。
三个新/重写页面：`OverviewView` **43**、`RecycleView` **14**、`UserDetailView` **8**（合计 65 处），其中 **Overview 是全仓第二多**；而且它的内联大多正好落在新原语的位置上（`marginTop:10` 压 `row-gap`、内联栅格压 `.cards`）——说明新原语只是换了个类名，内联并没有被替换掉。

### 5.4 规范与实现的三处硬冲突

| SPEC 条款 | 实现 | 冲突 |
|---|---|---|
| `SPEC-UI.md:71` 统计值 **42px** | `.stat__value` = **44px**（`:306`），仅 `.card--stat` 是 42 | 一半页面违反自家规范 |
| `SPEC-UI.md:35` "只有页面级 `.table-card` 的粘性表头有底色" | 粘性在 `.table-card` 里**不生效**（见 §1 P0-3） | 规范描述了一个不存在的行为 |
| `SPEC-UI.md:73` 中文标题字距 **-0.01em** | `.page-title` 已改 ✓，但 `.stat__value` 仍 **-0.035em**，且被用来装中文 | 同一条规定只管了标题 |
| `SPEC-UI.md:26` `.card--stat` 三行 auto + `row-gap: var(--stack)` | Overview 4 张卡里 3 张用内联 `marginTop:10` 覆盖 | 原语被绕过 |

---

## 6. 如果只改 5 处

### ① 给表格里的动作分档（约 15 行 CSS + 4 个视图加类）
`components.css:1174-1184`
- 保留 `padding:0 / 无边框 / hover 只变色`，但恢复三级：默认 `--fg-2`、行内主操作 `--fg` + 500、危险 `--fg-3 → hover --c-red`；动作间距 `gap:4 → 12`，危险动作前加竖分隔。
- **收益**：一次修掉本轮影响面最大的 P0（N1），同时让订单「发货」、求片「认领」这两个真正的写操作重新可见——这两页的 WALKTHROUGH 步骤（14、10）也才验证得下去。

### ② 三态短路 + 空态单出口（UserDetail / Recycle / VideoDetail / WatchlistDetail）
- `isLoading → error → empty → data` 四选一，任何 `error` 时不渲染其余 section；`limited` 与 `error` 互斥；对象不存在时页头动作降级为「返回列表」；空态文案压成一行（bare）。
- **收益**：消掉"没取到数据 + 你没权限"同屏（N2）、"回收站是空的 + 加载失败"同屏，以及详情页一句话占一张卡。

### ③ 拆掉 `!important`，把内联栅格收成类（`.cards--4 / --2 / --1`）
`components.css:660/683` + 5 个视图的 13 处内联 `gridTemplateColumns`
- **收益**：修好 <900px 断点（N3），并顺手把 Overview/UserDetail/Account/Pay 的内联降一档——这是"内联 338 处"里最机械、最安全的一批。

### ④ 卡片原语收口（42px + `--stack` + 删 `StatCard`）
- `AccountView`（4 张）、`PayView`（2 张）、`UploadView`（1 张）、`LiveView`（1 张）改 `card card--stat`，删 4 处内联 `marginTop`；`.stat__value` base 44 → **42**；`StatCard.tsx` 整文件删除；`--stack` 改为 `var(--s-3)`。
- **收益**：统计卡从 2 套变 1 套，数字尺寸全站一致；同时消掉 "44px 中文词"（AccountView）在视觉上的落差。

### ⑤ 清理死代码与死令牌（约 180 行，纯删除）
- `.posters`(50) + `.chart`/`chart__axis`(20) + `.legend`(22) + `.stamp--live`(1) + `.rail__tail`(7) + `.rail__foot` 重复(~9) + `.table td:last-child` no-op(2)；
- `StatCard.tsx`(41) + `PosterArt`；
- `--fg-ink`、`--c-gray`；
- 并把 `WatchHeatmap.tsx` **接进**概览（替掉手搓微条）——它现在是唯一"写了又不用"的完整组件。
- **收益**：`docs/SPEC-UI.md` 里"不要重新发明间距/不要承诺不存在的东西"才站得住；否则下一个人读到 `.chart::before` 那圈黄色光晕，会以为这是设计意图。

---

## 附：本轮数字小结

| 指标 | 上轮 | 本轮 | 变化 |
|---|---|---|---|
| 一屏可见表格行数（1440×900） | 9.2 | **11.1** | +21%（行高 64→54；页头 44→36） |
| 内联样式 | 268 | **338** | +26% ❌ |
| 死 CSS 行数 | ~70 | **~100** | +43% ❌ |
| 令牌引用为 0 的 | 5 | **5**（+2 死令牌） | 持平 ❌ |
| 新原语落地率 | — | **7–20%** | 新增但未推广 |
| P0 | 6 | **3** | −3 ✅ |
| P1 | 24 | 24（复核）+ 12（新） | 基本未动 |
