# UI 重复实现 · 补丁样式 · 组件边界 审查

- **仓库**：`emos.club`（React 18 + TS + TanStack，暗色管理台）
- **角度**：只审「界面结构 / 样式层」。代码质量（死代码、缓存、endpoint、类型）另有一份 `refactor-audit-code.md`，本文件不重复其结论，只在必要处互相引用。
- **基线**：`68de9df`（今晚收工点）→ 写报告时 HEAD 为 `fe7ed8c`。期间有并行改动落了两个 refactor 提交（`8f332d1` 清死代码与重复写法、`fe7ed8c` 抽「清空搜索」），**行号以 `fe7ed8c` + 工作区为准**；已被它们处理掉的项在下文标注【已处理】。
- **方式**：只读。`git log --since="2026-11-10 18:00"` 94 个提交逐条对照；`VITE_MOCK=1 npx vite --port 5288` 起服务，逐路由取 `getComputedStyle` 与 `getBoundingClientRect` 实测（数据见第 5 节附录）。**未改 `src/`**。
- **判断标准**：这个项目要的是克制、留白、不要多余 hover。下面所有建议都刻意避开「加动效 / 加 hover / 加组件库 / 加花活」，能用 3 行 CSS 解决的不建议抽组件。

---

## 0. 结论

1. **UI 层缺的不是组件库，是「同一件事只写一遍」。** 最典型的有 5 处结构性重复：卡片头 **18 处 / 10 文件**、页内 tabs **13 处**、「列表 + 分页」**13 处**、弹窗 footer **5 种写法（其中 4 处是手搓）**、「搜索并选一条」的候选列表 **5 份**。
2. **内联 style 是主要的一致性负债**：`src/` 共 **335 个** `style={{…}}`，其中 **266 个**含尺寸/间距/字号。同一需求的实际取值：`marginTop` **11 种**、`gap` **8 种**、`fontSize` **9 种**、`border-radius` **9 种**（3/4/5/7/8/9/12/14/999）。而 `tokens.css` 里的 `--s-1`…`--s-9` 九个间距 token **一次都没被用过**——令牌和代码是两套系统。
3. **有三个补丁类已经在产生副作用，不只是不优雅**：
   - `.card-head .btn` 把卡片头里所有 `.btn` 压成「无边框 20px 文字」，于是 `AccountView` 写的 `btn--ghost`（「全部下线」，批量危险操作）**渲染结果和 `btn--quiet` 完全一样**，意图丢失（实测 `height:20px / border:0 / color:fg-3`）。
   - `.btn--danger-text` 自带 `height:20px + font-size:12.5px`，混进 `.action-group` 后**基线和兄弟按钮差 12px**（实测 `bottom 244 vs 256`），订单/商城/直播/片单四处的操作列都毛边。
   - `components.css:1127` 的 `.badge,` 后跟一个空行再跟 `.btn[aria-busy]`，逗号没删干净 → 选择器列表变成 `.badge, .btn[aria-busy='true']`，**全站每个 `.badge` 都是 `opacity: 0.6`**（实测）。「已支付 / 待发货 / 3 人求 / 已上架」全部偏淡，这是今晚最容易被误认为「配色改了」的回归。
4. **今晚改动确实带出新的不一致**，集中在三处：表格内动作按钮基线、工具栏的对齐与高度（32px vs 36px 随页抖动）、以及「影视片单详情 vs 音乐片单详情」因为整段复制而生的功能分叉（音乐片单**没有订阅/编辑/维护者/隐藏/动态抓取五个按钮**）。

---

## 1. 重复实现清单

> 「同一件事出现在哪几处」→「建议合并成什么」。行号 = 该文件里该结构的起始行。

### 1.1 卡片头（标题 + 右侧操作）——18 处（15 `.card-head` + 3 `.chart-head`），两种类名

| 文件:行 | 写法 | 右侧 |
|---|---|---|
| `views/OverviewView.tsx:219` | `card-head` + `stat__label` | `<Link className="btn btn--quiet">去媒体库` |
| `views/OverviewView.tsx:277` | 同上 | 无（只有标题） |
| `views/OverviewView.tsx:353` | 同上 | `<Link btn--quiet>全部` |
| `views/UserDetailView.tsx:131` | 同上 | 无 |
| `views/UserDetailView.tsx:167` | 同上 | `<Link btn--quiet>邀请记录` |
| `views/UserDetailView.tsx:198` | 同上 | `<span className="muted tnum-sm">近一周` |
| `views/AccountView.tsx:174` | 同上 | `<span className="muted tnum-sm">` |
| `views/AccountView.tsx:228` | 同上 | `<button className="btn btn--ghost">全部下线` ← 被压平 |
| `views/AccountView.tsx:502` | 同上 | `<span className="muted tnum-sm">` |
| `views/FundView.tsx:27` | 同上 | `<button btn--quiet>转赠` |
| `views/PayView.tsx:99` | 同上 | `<button btn--quiet>编辑` |
| `views/SongDetailView.tsx:159` | 同上 | `<button btn--quiet>上传音频`（+ 隐藏 `<input type=file>`） |
| `views/VideoDetailView.tsx:247` | 同上 | `<span className="muted tnum-sm">共 N 季` |
| `views/VideoDetailView.tsx:319` | 同上 | `<span className="muted">当前集名` |
| `views/VideoDetailView.tsx:372` | 同上 | `<button btn--quiet>上传字幕`（+ 隐藏 input） |
| `views/ShopView.tsx:404` | **`chart-head`** | `.row-input`（输入 + 新增分类） |
| `views/LiveView.tsx:76` | **`chart-head`** | `<button btn--ghost>新增源` |
| `views/UploadView.tsx:271` | **`chart-head`** | `<span className="muted">` ；左侧是两行（label + value） |

另有一种「统计卡标签里塞按钮」的变体：`views/OverviewView.tsx:144-153`（`.stat__label` 里嵌「立即签到」），这就是 CSS 里 `.card--stat .stat__label .btn` 那条规则存在的原因。

**建议**：抽 `components/CardHead.tsx`，约 20 行，三种插槽覆盖全部 18 处：

```tsx
export function CardHead({ title, note, action }: { title: ReactNode; note?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-head">
      <p className="stat__label">{title}</p>
      {action ?? (note ? <span className="muted tnum-sm">{note}</span> : null)}
    </div>
  )
}
```

配套 CSS：
- `.chart-head` 合并进 `.card-head`，三处调用点改类名，删掉 `components.css:1312` 与 `:627` 两处定义（两者除 `align-items: baseline` 外完全相同）。
- `.card-head .btn` 收窄为 `.card-head .btn--quiet`（原因与改法见 2.2）。
- `.card-head { height: 24px }` 改成 `min-height` 或删掉（固定高度会在标题换行时被切）。
- 顺手删 `components.css:1207` 与 `:1340-1341` 的重复：同一句 `.card-head .stat__label { margin: 0 }` 现在写了两遍（`8f332d1` 新加的那条与原有分组重复）。

**为什么值得**：右侧那格只有三种意图——「去别处」「说明文字」「没有」——却有五种写法：`btn btn--quiet` ×7、`btn btn--ghost` ×1（且被压平成 quiet）、`muted tnum-sm` ×4、`muted` ×1、留空 ×3。抽成组件后「右侧是什么」成为显式参数，而不是每处各自拼类名。

---

### 1.2 页内 tabs ——13 处，7 种用数组 map、6 种手写按钮

| 文件:行 | 形态 | 备注 |
|---|---|---|
| `views/OrdersView.tsx:85` | map `PAY_TABS` | 有 `role=tablist` |
| `views/WatchlistsView.tsx:89` | map `TABS` | |
| `views/LibraryView.tsx:75` | map `TABS` | |
| `views/MusicView.tsx:68` | map `TABS` | |
| `views/SeekView.tsx:87` | map `TABS` | |
| `views/AccountView.tsx:128` | map `TABS` | |
| `views/FundView.tsx:190` | 手写 3 个按钮 | |
| `views/RecycleView.tsx:115` | 手写 2 个 | |
| `views/SongDetailView.tsx:93` | 手写 2 个 | |
| `views/WhisperView.tsx:66` | 手写 2 个 | 缺 `aria-label` |
| `views/LiveView.tsx:160` | 手写「全部」+ map 动态库 | |
| `views/SellerView.tsx:56` | 手写「全部」+ map 分类 | |
| `views/ShopView.tsx:212` | 手写「全部分类」+ map | **没有 `role="tablist"` / `role="tab"`**，只有 `aria-selected` |

**建议**：`components/Tabs.tsx`（约 22 行），`items: Array<{key,label}>`、`value`、`onChange`、`label`（aria-label）。动态 tab（分类/媒体库）由调用方先 map 成 items。

**顺带**：`components.css:426-427` 的 `.tab b` / `.tab[aria-selected] b` 是给「tab 上的计数」准备的，**全项目没有一处 tab 用 `<b>`**——死样式，删。若真想要计数（求片 4 个 tab 很适合），那该在 `<Tabs>` 上加 `count` 而不是让调用方拼。

---

### 1.3 「列表 + 分页」——13 处 `<Pager>`，11 处要手算一个 `key`

| 文件:行 | key 公式 |
|---|---|
| `views/LibraryView.tsx:132` | `${items.length}-${items[0]?.video_id}-${total}` |
| `views/WatchlistsView.tsx:144` | `${items.length}-${items[0]?.id}-${total}` |
| `views/SeekView.tsx:139` | `${items.length}-${items[0]?.id}-${data.total ?? items.length}` |
| `views/OrdersView.tsx:114` | `${items.length}-${items[0]?.order_no}-${total}` |
| `views/ShopView.tsx:291` | `${items.length}-${items[0]?.product_id}-${total}` |
| `views/LiveView.tsx:189` | `${items.length}-${items[0]?.id}-${total}` |
| `views/MusicView.tsx:109` | `${tab}-${items.length}-${song_id ?? album_id ?? person_id}` |
| `views/RecycleView.tsx:139` | `${tab}-${rows.length}-${media_id ?? video_id}` |
| `views/UserSearchView.tsx:62` | `rows.length` ← **不完整**：翻页时条数相同则不重新淡入 |
| `views/FundView.tsx:44` | `${rows.length}-${page}` |
| `views/ShopView.tsx:291` / `WatchlistDetailView.tsx:196,632` | 有 `<Pager>`，无 key |

九个公式里有一个是错的（`UserSearchView`）。这个 `key` 的存在目的只有一个：让 `.content-in` 的 160ms 淡入重新触发。

**建议**：`components/ListCard.tsx`，`<ListCard rows={items} pager={<Pager …/>}>{table}</ListCard>`，内部渲染 `<div className="table-card content-in" key={keyOf(rows)}>`，`keyOf` 取 `rows.length + rows[0] 的首个 id + total`。13 处各少 1 行、少 9 个公式、顺带修 UserSearchView。

**不建议**把三态（loading/empty/error）也塞进去：那三行 `{error ? …}{isLoading ? …}{length === 0 ? …}` 是显式的、读起来最顺的写法，合并成 `<QueryList>` 会让每个页面都要记 props，收益不抵。

---

### 1.4 空态 + 清空筛选

**【已处理】** `fe7ed8c` 已把四处「清空搜索」抽成 `ClearSearchButton`（`components/StateBlock.tsx:71`）。

剩下的问题：

| 位置 | 问题 |
|---|---|
| `views/MusicView.tsx:106` | 空态**没有清空出口**（`search.q` 有值时只显示「没有找到「x」」），五个列表页里唯一缺的 |
| `views/LinesView.tsx:70` | 「没有匹配「q」的线路」也没有清空按钮（它的搜索没有防抖，是即时客户端过滤） |
| 13 处 | 标题模板 `没有找到「${q}」` 手写了 13 遍，三种承载：`<EmptyBlock title>`、`<p className="muted">`（`ImagePicker:157`、`UploadView:364,404`、`WatchlistDetailView:358,726`）、`<p className="card-note">`（`VideoDetailView:637`） |
| `views/LibraryView.tsx:109-129` / `views/LinesView.tsx:72-78` | 「页码越界」空态（`这一页没有内容` / `共 N 条，当前在第 X 页` / `回到第一页`）逐字重复两遍 |

**建议**：
- `StateBlock.tsx` 里加 `noMatchTitle(q)` 与 `<OutOfRangePage>`（后者只有 8 行，两个调用点）。搜索框内候选列表的空态保持 `<p className="muted">` —— 弹窗里用 64px padding 的 `EmptyBlock` 本来就不合适。
- MusicView / LinesView 补 `ClearSearchButton`（两行）。

---

### 1.5 弹窗 footer ——5 种写法，其中 4 处根本没走 footer 插槽

| 写法 | 位置 | 后果 |
|---|---|---|
| A. `footer={<>取消 + primary</>}` | 25 处（`Modal.tsx:127` 渲染为 `.modal__foot`） | 正确：吸底、有上边框 |
| B. `footer={仅 取消}` | `UploadView.tsx:320,371`（选择型） | 正确 |
| C. `footer={取消 + danger + primary}` | `OrdersView.tsx:274`（取消 / 删除订单 / 保存） | 三个按钮挤在 footer，删除混在编辑弹窗里 |
| D. **不用 footer，在 body 里手搓 `<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>`** | `FundView.tsx:284`、`FundView.tsx:315`、`OverviewView.tsx:410`、`ProductModals.tsx:94` | footer **跟着 body 滚动**、**没有上分隔线**、外层多一层 `.stack`（`.modal__body` 本身已是 `grid; gap:14px`） |
| E. `footer` 里放非确认动作 | `ImagePicker.tsx:124`（上传图片 / 使用这张） | 语义上是工具条不是 footer，但与 D 的视觉位置相同，可以先不动 |

**建议**：`components/Modal.tsx` 增一个可选 `confirmText / onConfirm / pending` 快捷方式（或独立 `ModalFooter`），把 D 的 4 处迁回 footer 插槽。这一步不改视觉（同一位置、同一按钮顺序），只把它从「滚动区里的一段 div」变回「吸底 + 分隔线」。
C 的 3 处建议搬回列表行里的删除按钮（OrdersView 的删除在列表行已经有入口），弹窗只留 取消 + 保存。

---

### 1.6 「搜索 → 选一条」候选列表 ——5 份，其中 4 份手写

`components.css:1773-1787` 已经有 `.pick-list / .pick-row / .pick-row__num / .pick-row__title / .pick-tabs`，但只有**一处**在用（`VideoDetailView.tsx:621-707` 移动资源弹窗）。手写的四份：

| 文件:行 | 容器 | 行结构 |
|---|---|---|
| `WatchlistDetailView.tsx:318-362` | `style={{display:'grid',gap:6,maxHeight:320,overflowY:'auto'}}` | `display:flex,gap:10,padding:'6px 0'` + `Poster` + 两行字 + 「加入」 |
| `WatchlistDetailView.tsx:701-730` | 同上 | 同上（`Poster` + 歌名 + 艺人） |
| `UploadView.tsx:320-369` | `gap:4`（**只有这里 gap 是 4**） | 同上，无 Poster |
| `UploadView.tsx:371-412` | `gap:4` | 同上，无 Poster |

四份连空态文案都一样（`没有找到「{term}」`）。

**建议**：`components/PickList.tsx`

```tsx
<PickList
  search={<input className="input" autoFocus … />}
  items={rows}
  loading={isFetching}
  empty={term ? `没有找到「${term}」` : undefined}
  renderRow={(row) => <>…</>}
  actionLabel="加入"
  onPick={(row) => …}
/>
```
容器用 `.pick-list`，行用 `.pick-row`。约 45 行组件替换约 96 行手写。`.pick-row` 的 `padding: 6px 2px` 也会顺手把四处的 `6px 0` / `gap:4` / `gap:6` 归一。

---

### 1.7 片单详情：整页两份（今晚「结构对齐」只对齐了外观）

`views/WatchlistDetailView.tsx` 733 行里，影视分支（79-516）与音乐分支（`WatchMusicList` 519-733）是两份页面：

| 段落 | 影视 | 音乐 | 差异 |
|---|---|---|---|
| PageHeader 工具条 | 88-115：订阅/编辑/维护者/隐藏/动态抓取 | 555-559：**只有「返回列表」** | **功能分叉**：音乐片单的拥有者无法编辑、无法订阅 |
| `detail-head` | 121-168（40 行） | 562-603（40 行） | 除「维护者」一项外逐字相同 |
| toolbar | 171-186 | 605-622 | 结构相同，按钮文案「添加影片 / 添加歌曲」 |
| 表格 | 196-315（排序输入、备注、移出） | 631-699（时长、艺人、移除） | 合理不同 |
| Pager | 313：`onPage` only | 691-697：`onPage` + `onPageSize` | **同一个页面，分页器一个有「20/页」一个没有** |
| 空态 | 192 | 628 | 一行文案不同 |

另外还有两处由复制带来的数据缺陷（实测截图，`/watchlists/1003`）：
- **艺人格空白**：`WatchlistDetailView.tsx:666` 用 `(song.person_artists ?? []).map(…).join('/')`，缺失时得到 `''` 而不是 `—`（同一页影视分支的 `video_date_air ?? '—'` 是对的）。
- **列宽靠三元算**：音乐分支 `WatchlistDetailView.tsx:636` 用 `canEdit ? '52%' : '72%'`，影视分支 `:203` 用 `is_edit_video ? '18%' : '32%'` —— 两处都在「有没有操作列」上做列宽算术，合并时统一成「末列固定 96px，其余按比例」。这本身也是 `.table--fixed` 更适合的场景（两张表都没加）。

**建议**：拆成
- `<WatchlistDetailHead item>`：40 行 × 2 → 1 份，含订阅/编辑/维护者/隐藏/动态抓取（音乐分支直接获得这些动作）。
- `<WatchlistDetailShell>`：负责 PageHeader + head + toolbar 搜索 + 分页器接线；内容由 `type` 决定渲染 `<VideoEntries>` 或 `<MusicEntries>`（只保留真正不同的列）。
预计净减 90–110 行，并同时消掉三个功能/数据分叉。

---

### 1.8 卡片内表格：`.table--inset` 已有，只有 3 处在用

| 位置 | 写法 | 结果 |
|---|---|---|
| `components.css:1352-1357` | `.table--inset`（margin-top 10 + 首末列去 24px 内边距 + th-thumb 43px） | 正确解 |
| `AccountView.tsx:254, 508`、`UserDetailView.tsx:207` | `className="table table--inset"` | ✅ |
| `VideoDetailView.tsx:333, 404` | `className="table" style={{marginTop: 10}}` | ❌ 只抄了 margin，没抄 padding |
| `UploadView.tsx:289` | `style={{marginTop: 12}}` | ❌ |
| `VideoDetailView.tsx:444` | `<article className="card card--tight" style={{marginTop: 18}}>` | ❌ 应走 `.cards + section` 或容器间距 |
| `SongDetailView.tsx:190` | `className="table"`（无 margin） | ❌ |

**实测**：`/media/1` 的资源表，表头文字左边缘 `x=767`，卡片标题「资源」`x=745` —— **差 22px**（卡片 padding 20 + 单元格 padding 24 − 1px 边框）。同一页「季与集」卡没有表格，所以只有下半页毛边。`AccountView` 的设备表因为用了 `.table--inset` 就没有这个问题。

**建议**：5 处换成 `table table--inset`，去掉内联 marginTop。零新增代码，修一处看得见的错位。

---

### 1.9 手搓「行列表」——2 处（分类管理 / 直播源）

| 文件:行 | 结构 |
|---|---|
| `ShopView.tsx:423-467` | `<ul style={{display:'grid',gap:2,marginTop:12}}>` + `<li style={{display:'flex',alignItems:'center',gap:12,padding:'9px 2px',borderBottom:'1px solid var(--line-soft)'}}>` |
| `LiveView.tsx:92-128` | 同上，`padding:'10px 2px'` |

两处的 `padding` 一个 9px 一个 10px，其余逐字相同；都没有表头，列靠 `spacer` + 固定宽度对齐。

**建议**：`.list-rows` + `.list-rows > li`（`display:flex; gap:12px; padding:9px 2px; border-bottom`），两处共用。**不要**改成 `<table>`：这里没有表头、行高固定、且有行内输入，`li` 更轻。

---

### 1.10 表单两列栅格——4 处内联

| 位置 | 写法 |
|---|---|
| `LiveView.tsx:298` | `gridTemplateColumns: '1fr 1fr', gap: 12` |
| `ShopView.tsx:548` | `gridTemplateColumns: '1fr 1fr', gap: 12` |
| `LiveView.tsx:343` | `gridTemplateColumns: '120px 1fr', gap: 12` |
| `ProductModals.tsx:76` | `gridTemplateColumns: '120px 1fr', gap: 12, marginTop: 14` |

**建议**：`.field-row`（`display:grid; grid-template-columns: 1fr 1fr; gap:12px`）与 `.field-row--wide`（`120px 1fr`）。4 处内联归零。
顺带：`LiveView.tsx:299-300` 有一个**空的 `<label className="field">`**（占着左格，什么也不渲染），删掉后网格少一个空洞。

### 1.11 `.cards--2` / `.cards--4` 已有，3 处内联重写

| 位置 | 写法 |
|---|---|
| `UserDetailView.tsx:84` | `className="cards" style={{gridTemplateColumns: 'repeat(4, minmax(0,1fr))'}}` |
| `UserDetailView.tsx:129` | `repeat(2, …)` |
| `PayView.tsx:123` | `repeat(2, …)` |

`components.css:1321-1322` 定义了 `.cards--4` / `.cards--2`。内联版还绕过了 `components.css:593-600` 的窄屏降级（那条用了 `!important` 才救回来），纯亏。

**建议**：改 `className="cards cards--4"` / `"cards cards--2"`，删内联。3 处 3 行。

### 1.12 时长格式化——4 份

`MusicView.tsx:24-29` 有 `duration()` helper；`WatchlistDetailView.tsx:664`、`SongDetailView.tsx:33,211` 三处内联同一个 `Math.floor(x/60)+':'+padStart(2,'0')`。放进 `lib/format.ts`（已有 `formatSize/formatDateTime/formatRelative`），四处调用。约 −8 行。

### 1.13 统计卡两种实现（44px vs 42px）

| 写法 | 位置 | 实测数值字号 |
|---|---|---|
| `card--stat`（有 `row-gap:12`、标签 `min-height:28`） | `OverviewView`、`UserDetailView:85,101,112,118` | **42px**（`.card--stat > .stat__value`） |
| 裸 `.card` + `stat__label/stat__value/stat__delta` | `AccountView:142-169`、`ShopView:170-204`、`FundView:26-38`、`PayView:84-97` | **44px**（`.stat__value` 基准） |

同一个「大数字卡片」在这台站点上有 42 和 44 两个值、标签下间距 12 与 14 两个值。用户今晚刚为胡萝卜卡调过宽度（`FundView.tsx:26` 的 `maxWidth: 380`），说明这类卡片确实在被逐个微调。

**建议**：`<StatCard label value unit note action?>`（约 25 行），内部固定用 `card--stat` 那套数值。7 处调用点收敛后 42/44 之争自然消失。**不必**把 380/`maxWidth` 也做成 prop——宽度是页面事实，用 `<div className="cards cards--wide">` 包一层就够。

---

## 2. 补丁样式清单

每条：**位置 → 它掩盖了什么 → 正解**。

### 2.1 `.seg--bare`（`components.css:330-336`，唯一调用点 `WatchlistForm.tsx:83`）

**掩盖**：`.seg` 用一个「浅灰底 + 边框 + 3px 内边距」的容器表达「这是一组」，这个语言在工具栏里成立（周围是页面底色），但放进 `.field` 后，它旁边就是 `.input`（深底 `--field` + 边框），于是 seg 的灰底像一块多余的补丁浮在表单里。今晚 `8f60ba8` 的解法是加变体类。

**为什么不该加变体类**：变体类意味着「组件在某个上下文里长得不对」，而这里正确的表达是「**在表单里，seg 不该有容器底**」——这是上下文规则，不是组件变体。变体类会继续乘：下一个在 `.field` 里用 seg 的人还得记得加 `--bare`。

**正解**：

```css
.field .seg { padding: 0; gap: 6px; background: transparent; border: 0; }
.field .seg button { padding: 0 12px; }
```

删掉 `.seg--bare` 与那一个调用点的类名。3 行 CSS 换一个不会扩散的规则。

### 2.2 `.card-head .btn`（`components.css:1218-1232`）

**掩盖**：卡片头只有 24px 高，而 `.btn` 是 32px，所以用一条「凡是在卡片头里的按钮，统统压成 20px 无边框文字」的规则硬压。

**副作用（实测）**：`AccountView.tsx:232` 写的是 `btn btn--ghost`（「全部下线」，会踢掉所有设备），渲染成 `h=20px, border=0px, color=#8f8d86` —— 和 `btn--quiet` **一模一样**。也就是说「这个按钮我想让它有点存在感」的意图被样式层悄悄吃掉了；同时 `.card--stat .stat__label .btn`（Overview 的「立即签到」）也吃同一条规则。

**正解**：把规则收窄成只针对「文字型」：

```css
.card-head .btn--quiet,
.card--stat .stat__label .btn--quiet { height: 20px; padding: 0; border: 0; font-size: 12.5px; }
```

然后把 `AccountView.tsx:232` 改成 `btn--quiet`（若确实想要可点感，则给它 `btn--ghost` 并让卡片头 `min-height: 32px`——但那会改动 15 个卡片的行高，不建议一次性做）。这样「卡片头动作 = 文字型」成为唯一写法，`.btn--ghost` 不再在此处静默降级。

### 2.3 `.btn--danger-text` 的 `height: 20px` + `font-size: 12.5px`（`components.css:1286-1290`）

**掩盖**：`refactor-round1` 为了统一「表格里的危险文字按钮」，给它定了 20px 高 / 12.5px 字。但表格里同时存在 `.btn--quiet`（继承 `.btn` 的 32px / 13.5px）。

**副作用（实测 `/orders`）**：同一个 `.action-group` 里「发货 / 备注」`h=32, 13.5px, bottom=256`，「删除」`h=20, 12.5px, bottom=244` —— **基线差 12px**，整行动作区毛边。商城、直播、片单、求片、回收站六处的操作列同样。

**正解**：尺寸由容器决定，颜色由变体决定。

```css
.table .btn { height: 22px; font-size: 13px; }      /* 表格内的按钮统一尺寸 */
.btn--danger-text { /* 只保留 color / hover color */ }
```

### 2.4 `state__hint` + 内联 `textAlign:'left'` ——4 处，两种补法

| 位置 | 写法 |
|---|---|
| `PayView.tsx:135, 196` | `<p className="state__hint" style={{ textAlign:'left', marginTop:12 }}>` |
| `WatchlistDetailView.tsx:391` | `<p className="state__hint" style={{ textAlign:'left' }}>` |
| `SeekView.tsx:326` | 同上 |
| `AccountView.tsx:456` | `<p className="state__hint note-left">` ← 另一种补法 |
| `components.css:1358` | `.note-left { text-align: left }` ← 为此而生的补丁类 |

**掩盖**：`.state__hint` 是**空态块**里的说明文字（`place-items:center`、`max-width:42ch`、`fg-5`）；这四处要的其实是**弹窗里的说明**，而 `.modal__hint`（`components.css:674`）正好是为它准备的。

**正解**：这五处换成 `.modal__hint`（同一页里的措辞本来就是「弹窗内的补充说明」），然后删掉 `.state__hint` 上的两处内联、`.note-left` 类、以及它在 `AccountView` 的用法。若 `.state__hint` 在弹窗外还有别的用途（`EmptyBlock` 内部已有一处 legit 用法），保持不变。

### 2.5 `.badge,` 悬空逗号（`components.css:1127`）

```css
.badge,

.btn[aria-busy='true'] { opacity: 0.6; transition: opacity 140ms var(--ease) 140ms; }
```

**这不是样式问题，是 bug**：两条规则被合成一条选择器列表，**全站 `.badge` 常驻 0.6 透明 + 140ms 延迟过渡**。实测 `/library` 的「3 人求」、`/orders` 的「已支付 / 待发货」、`/shop` 的「已上架」全部偏淡；`.badge--ok` 的绿也被压灰。今晚若有人觉得「状态色怎么变淡了」，就是这个。

**正解**：删掉 `.badge,` 这一行（当初应该是删掉了某个 `.badge--busy` 规则留下的逗号）。一行。

### 2.6 `--surface-2` 未定义（`components.css:1309`）

`.poster-img { background: var(--surface-2) }`，而 `tokens.css` 里没有这个变量（有 `--raised`）。实测计算值 `rgba(0,0,0,0)` —— 海报图加载中 / 缺图时**没有底色**，列表里的缩略图位是一块透明洞（`.thumb` 有渐变底，`.poster-img` 没有）。

**正解**：改成 `var(--raised)`。一行。

### 2.7 工具栏间距的两个补丁互相抵消（`ShopView.tsx:169, 210`）

```tsx
<section className="cards cards--4" style={{ marginBottom: 18 }}>   // 169
<div className="toolbar" style={{ marginTop: 0 }}>                  // 210
```

`components.css:349-354` 刚加了 `.cards + .toolbar { margin-top: 24px }`。inline 的 `marginTop: 0`（优先级更高）把它关掉，再靠 `marginBottom: 18` 补回来一半。**净结果 18px**，而其他页面是 24px。

**正解**：两个内联都删，让 `.cards + .toolbar` 生效 → 全站「卡片组 → 工具条」统一 24px。顺带删死选择器 `.cards + .media-grid`（`.media-grid` 这个类在 TSX 里不存在）。

### 2.8 `.seg` 让工具栏高度在 32 / 36 之间抖动

实测同一种「列表页工具栏」的高度：

| 页面 | 工具栏高 | 是否含 `.seg` |
|---|---|---|
| /library | **32** | 否 |
| /live | **32** | 否 |
| /recycle | **32** | 否 |
| /lines | **32** | 否 |
| /watchlists | **36** | 是 |
| /seek | **36** | 是 |
| /music | **36** | 是 |
| /orders | **36** | 是 |
| /shop | **36** | 是 |

`.seg` 是 `3+28+3+2px 边框 = 36`，`.input`/`.btn` 是 32。于是带筛选的页面整行下移 2px、下方表格也跟着下移 4px。单看一页察觉不到，跨页切换能看到标题下方那块留白在跳。

**正解**：`.seg { padding: 2px; }`（→34）或把内层 button 降到 26px（→32），让三种控件同高。**不要**给 `.toolbar` 定死高度（会把 seg 裁掉）。

### 2.9 `.input` 宽度：8 种覆盖

| 位置 | 覆盖值 |
|---|---|
| `components.css:566` | 基准 `min-width: 200px` |
| `RecycleView.tsx:94` | `width: 130`（select） |
| `RecycleView.tsx:111` | `width: 280` |
| `UploadView.tsx:144,158` | `minWidth: 150`（×2） |
| `SongDetailView.tsx:54` | `width: 108, minWidth: 0, height: 30` |
| `ShopView.tsx:235`、`SellerView.tsx:79` | `minWidth: 170`（同一种搜索框，两处都写） |
| `UserSearchView.tsx:41` | `maxWidth: 280` |
| `PayView.tsx:167` | `maxWidth: 100`（数字） |
| `ShopView.tsx:407` | `maxWidth: 320`（row-input 容器） |

**掩盖**：`.input` 的 200px 基准是给「工具栏里的搜索框」定的，一旦放进 select / 数字框 / 弹窗表单就得逐个改。

**正解**：只在 `.field .input`（已有 `width:100%`）与 `.toolbar .input`（`min-width: 200px`）两个上下文定宽度，然后：
- 搜索框删掉 170/280/150 的覆盖（默认 200 就够，`/recycle` 的 280 可以留）；
- select 用 `.input--sm`（`width:132px`）统一 —— `RecycleView:94` 与 `SongDetailView:54` 两处；
- 数字框用 `.input--num`（`width:100px`）。

宁可少两个类，也不要在 9 个文件里各写一个 `minWidth`。

### 2.10 内联魔法数字（按「该不该进 token」分类）

| 值 | 位置 | 它想表达什么 | 正解 |
|---|---|---|---|
| `height: 116` | `WatchlistForm.tsx:98`（ImagePicker 封面槽） | 「片单封面槽」的比例 | 改 `aspectRatio: '2.4'`（或给 ImagePicker 加 `ratio` prop），高度由宽度推 |
| `width:76, height:108` | `VideoDetailView.tsx:200`（`<Poster style>`） | 详情页头封面 | 用 `.poster-img.detail-head__poster`（72×96，另外两处详情页已用）——**同一元素现在 72×96 与 76×108 并存** |
| `height:30` | `SongDetailView.tsx:54`（评分 select） | 比 32 矮一点 | 删，用默认 32 |
| `width:72, height:26, padding:'0 6px', fontSize:12.5` | `WatchlistDetailView.tsx:248`、`ShopView.tsx:434` | 表格内的行内数字输入 | `.table .input` 里已有 `min-width:0`，把尺寸也写进去（`.table .input { width:72px; height:22px; font-size:13px }`），两处内联删掉 |
| `fontSize: 20` | `UserDetailView.tsx:88,121`、`PlaceholderView.tsx:28`、`router.tsx:33` | 文字型统计值 / 标题 | 已由 `8f332d1` 抽 `.stat__word--sm`【已处理】；`PlaceholderView`/`router` 两处随该文件删除（见 3.3） |
| `paddingLeft: 24 + (depth-1)*20` | `AccountView.tsx:521` | 邀请树的层级缩进 | **表格单元格的 24px 内边距漏进了 JS**。正解：`<td>` 里放 `<span style={{marginLeft: (depth-1)*20}}>` 或给行加 `data-depth` + CSS `padding-left: calc(24px + var(--indent))`。至少把 24 变成 `var(--cell-pad)` |
| 柱状图 `width:18, height:h, borderRadius:3, background:'rgba(52,211,153,.85)'` + `h = 8..44` + `height:60` + `fontSize:10` | `OverviewView.tsx:302-318` | 7 根周柱 | 抽 `.bars / .bars > span / .bar / .bar__label`，颜色用 `var(--c-green)`（`rgba(52,211,153,.85)` 就是 `--c-green` 加了透明度，硬编码会导致改主题时这一处不变） |
| Pager 内 6 处 `style={{height:28,fontSize:12.5,…}}` | `Pager.tsx:30,34,58,62,70` | 分页控件的紧凑尺寸 | 组件内部问题，不影响其他页面，**可不动**（见 5.3） |
| `<pre>` 上 8 个内联属性 | `SongDetailView.tsx:134-145` | 歌词块 | 抽 `.lyrics`（`white-space:pre-wrap; line-height:1.9; max-height:320px; overflow:auto; font:inherit`）。这是全项目唯一一段 8 行的内联样式块 |
| `margin: '10px 0 0', fontSize:13, color:'var(--fg-2)', wordBreak:'break-all'` | `PayView.tsx:114` | 回调地址展示 | `.text-body`（已有）+ `.break-all`（新，1 行） |

**不建议**做的：把 13.5 / 12.5 / 11.5 都做成 token。那是把「9 种字号」变成「9 个变量」，只是换个地方记。真正该定的只有三档：**13.5 正文 / 12.5 说明 / 11.5 灰小字**，后两档已经有 `.meta-sm`（`8f332d1`）与 `.text-sm` 可复用。

### 2.11 圆角 9 种

`18(--r-card) / 14 / 12(--r-field) / 10(--r-item) / 9 / 8 / 7 / 6 / 5 / 4 / 3 / 999`。真正需要统一的只有「面板级圆角」：`.modal` 用 18，`.login__card` 用 **14**（`components.css:1510`），`.rail__menu` 用 12。缩略图上的 3/4/5 是刻意的（30×40 的小图用 18 会糊），保留。

**正解**：`.login__card` 改 `var(--r-card)`。一处一行。其余不动——**这项价值低，不值得为它做一轮改动**。

### 2.12 其余补丁类（小，一次清掉）

| 位置 | 问题 |
|---|---|
| `components.css:214-239` | `.page-title__hint`、`.crumb__link`、`.crumb__link:hover` **各写了两遍且内容完全相同**（纯复制粘贴） |
| `components.css:1448-1449` | `.login__aside, .login__aside { … }` 自己和自己成组 |
| `components.css:1207` vs `:1340` | `.card-head .stat__label { margin: 0 }` 现在两处（`8f332d1` 新加的与原有分组重复） |
| `components.css:426-427` | `.tab b` / `.tab[aria-selected] b` 无任何调用点 |
| `components.css:352` | `.cards + .media-grid` 死选择器 |
| `RecycleView.tsx:103-113` | 工具栏里唯一一处「用 `.field` + `visually-hidden` 包住搜索框」的写法，其他 8 个页面都是裸 `<input className="input">` |
| `RecycleView.tsx:115` | tabs 排在工具栏**最右**，与其他 8 个页面「tabs 在左」相反（今晚 `b4c6f41` 刚统一过顺序） |
| `MusicView.tsx:9` | `import { } from '@/lib/format'` 空导入（`tsc` 不报） |
| `SongDetailView.tsx:120` | 「添加歌词」用 `<div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>` 手搓，而同页「上传音频」用的是 `card-head`（见 4.2） |

---

## 3. 组件边界

### 3.1 该用现成组件却手写的

| 手写 | 现成的 | 位置 |
|---|---|---|
| 候选列表（5 份） | `.pick-list/.pick-row`（只用 1 处） | 见 1.6 |
| 弹窗 footer（4 处） | `.modal__foot` 插槽 | 见 1.5 |
| 两列栅格（4 处） | `.field-row`（待建，2 行 CSS） | 见 1.10 |
| `repeat(2/4, minmax(0,1fr))`（3 处） | `.cards--2 / .cards--4` | 见 1.11 |
| 卡片内表格内边距（5 处） | `.table--inset` | 见 1.8 |
| 行列表（2 处） | `.list-rows`（待建） | 见 1.9 |
| 商品封面兜底（`ProductTile.tsx:36-41`、`ProductModals.tsx:36-43,162-169`） | `<Poster>`（全站 11 处在用） | 见下 |
| 层级缩进（`AccountView.tsx:521`） | — | 见 2.10 |

**商品封面**值得单说：三处都写了 `onError → e.currentTarget.style.display='none' + parentElement.setAttribute('data-fallback', 首字)`，而 `[data-fallback]` **没有任何 CSS 消费**（全项目 grep 只有这三处写入）。结果是：图片挂掉后**既没有图也没有首字**，只剩一块空底色——`<Poster>` 早就是为这件事写的（`useState(failed)` + 退 `.thumb`）。三处换 `<Poster>` 即可，其中 `ProductTile` 需要方形槽，传 `style={{borderRadius:0}}` 或给 `Poster` 加 `variant`。
（`refactor-audit-code.md` 的 M5 已从「代码」角度记过同一件事，这里是从「视觉结果」补一刀：它现在是看得见的空洞。）

### 3.2 参数膨胀 / 该拆

| 组件 | 现状 | 判断 |
|---|---|---|
| `Modal` | `title/hint/children/footer/onClose/onSubmit/width` | **可接受**。但 `width` 现在是 400/420/460/560/720 五档（`refactor-round1` 曾收到 400/460/560 三档），弹窗宽度又开始发散。建议只留三档常量：`sm=400 / md=460 / lg=560`，720（图库）单独命名 `xl`；调用方改传常量而不是数字 |
| `Pager` | 6 props + 5 处内联尺寸 + 页码跳转 | **可接受**，是这 13 个列表页里唯一已经抽干净的组件。不必再动 |
| `ProductGrid` | 7 props（`products/hasMore/loadingMore/loadError/onLoadMore/onOpen/onBuy`） | 可接受，但 `onOpen/onBuy` 是同一份数据流；若 1.13 的 `StatCard` 落了，可顺手把这两个合成 `onAction` |
| `ProductDetailModal` / `BuyModal` | 两个弹窗各自维护 `buyNumber/remark/createOrder/disabled`，重复约 50 行（`refactor-audit-code.md` S15 已记） | 从 UI 角度：两者的差别只有「要不要展示封面/库存/店铺」。建议 `BuyModal` 保留为轻量卡片入口，`ProductDetailModal` 内联一个 `<OrderForm>`（数量 + 备注 + 提交）给两者共用 |
| `ShopView`（639 行） | 2 个视图（卡片网格 / 管理表格）+ 3 个弹窗（分类/店铺/商品） | **该拆**：`ShopProductsPanel`、`ShopCategoryModal`、`ShopSellerModal`。`{true ? (…) : null}` 还在（`ShopView.tsx:208`，`refactor-audit-code.md` M1） |
| `WatchlistDetailView`（733 行） | 2 个页面 + 4 个弹窗 | **该拆**，见 1.7 |
| `FundView`（336 行） | 3 个 tab 塞在一个文件，其中「支付服务」是 `PayView embedded` | 可接受（组合而非复制），但两个弹窗手搓 footer（1.5） |
| `ImagePicker` | `width/height` 数字 prop，调用点传 `height={116}` | 把 `height` 换成 `ratio`（默认方图），片单封面传 `ratio={2.4}` |

### 3.3 死文件（顺带，属于「重复实现」的极端情况）

`views/PlaceholderView.tsx` 里**导出第二个 `LoginView`**（13-42 行），与 `views/LoginView.tsx`（170 行，真正的登录页）是两个实现。它从未被 import；且 `router.tsx:439-449` 的 `placeholders` 数组已经是空数组，`PlaceholderView` 本身也不可达。

**正解**：删 `PlaceholderView.tsx` 与 `router.tsx:439-449` 的 placeholder 管道。−42 行，零风险。

---

## 4. 视觉回归（今晚改动带出来的新不一致）

> 只列**同一元素在两页不同**的项，都是实测/截图确认的。序号即第 5 节的分档引用。

### 4.1 表格操作列：按钮基线差 12px【高】

`/orders` 同一行「发货 / 备注 / 删除」：前两个 `h=32, fs=13.5, bottom=256`，「删除」`h=20, fs=12.5, bottom=244`。`/shop`「下架 / 编辑 / 删除」同样。根因 2.3。
「删除」在 `refactor-round1` 里被刻意做成「静止灰、hover 红」，方向对，但尺寸不该跟着变。

### 4.2 「卡片头动作」两种外观并存【中】

| 卡片 | 动作 | 外观 |
|---|---|---|
| 视频详情「字幕」卡 | 上传字幕 | 无边框文字 20px（`.card-head .btn`） |
| 音乐详情「资源」卡 | 上传音频 | 无边框文字 20px |
| 音乐详情「歌词」区 | 添加歌词 | **带边框 pill 32px**（`SongDetailView.tsx:120-124`，因为它没在 `card-head` 里） |
| 账号「已登录设备」 | 全部下线 | 无边框文字（写了 ghost） |

同一个「往这张卡里加东西」的动作，在三个页面是三种外观。修 2.2 + 把「添加歌词」挪进 `card-head` 后归一。

### 4.3 列表页工具栏：对齐与顺序不统一【高】

实测各页 `.toolbar` 子元素 x 坐标（视口 1280）：

| 页面 | 顺序（x） | 主按钮是否贴右 |
|---|---|---|
| /library | tabs@340 · spacer · input@924 · btn@1138 | ✅ |
| /music | tabs@340 · spacer · input@836 · seg@1050 | ✅ |
| /live | tabs@340 · spacer · btn@1138 | ✅ |
| /orders | tabs@340 · spacer · input@848 · seg@1062 | ✅ |
| /watchlists | tabs@340 · input@565 · seg@779 · btn@897 | ❌ 悬在中间，右侧空 250px |
| /seek | tabs@340 · input@605 · seg@819 · switch@990 | ❌ 右侧空 250px |
| /shop | spacer@340 · input@901 · seg@1087 | （无 tabs） |
| /recycle | input@340 · field@554 · **tabs@848** | ❌ tabs 跑到右边 |
| /users | input@340 · btn@554 · spacer · head-note@1103 | ❌ 输入与按钮挤在左 |

`/watchlists` 与 `/seek` 缺一个 `<span className="spacer" />`（其他页都有），`/recycle` 的 tabs 位置与其他 8 页相反。今晚 `b4c6f41` 正是在统一这件事，这两三处漏了。

### 4.4 三个详情页三种头部【中】

| 页面 | 头部 |
|---|---|
| 影视详情 | `.detail-head` + 海报 **76×108**（内联）+ 4 个 detail-stat |
| 片单详情（影视/音乐） | `.detail-head` + 海报 **72×96**（类）+ 4–5 个 detail-stat |
| 歌曲详情 | **没有 `.detail-head`**，H1 下面直接是 tabs |

歌名详情页有 `image_poster_url` 可用（列表页在用），但详情页不显示封面、不显示任何计数。不是必须补，但既然「两种片单详情结构对齐」今晚做过了，三个详情页的头部结构也该说明是「歌曲详情刻意从简」还是「漏了」。

### 4.5 音乐片单详情少了 5 个动作 + 空艺人格 + 分页器不一致【高】

见 1.7。实测截图 `/watchlists/1003`：右上角只有「返回列表」；「雾中列车 / 晨间信号」的艺人格是**空的**（不是 `—`）；底部分页器多了「20 / 页」（影视分支没有）。

### 4.6 卡片内表格比卡片标题多缩进 22px【中】

见 1.8。`/media/1` 的「资源」「字幕」两张卡。账号页/用户页因为用了 `.table--inset` 没有这个问题。

### 4.7 `.badge` 全站 0.6 透明【高】

见 2.5。这是「颜色变淡了」的实际原因，最容易误判成配色改动。

### 4.8 统计数字四档字号【中】

44（`/account`、`/shop`、`/fund` 裸 `.card`）· 42（`/users/:id` `card--stat`）· 30（`card--secondary` / `cards--todos`）· 20（`.stat__word--sm`）。前两档是同一件事的两个值。

### 4.9 工具栏高度 32 / 36 抖动【中】

见 2.8。带筛选的页面整行高 4px、内容下移。

### 4.10 直播展开区：三层表面【中】

`/live` 展开行（`tr.table__expand` 有 `rgba(255,255,255,.018)` 底）里又放了一张完整 `.card`（渐变底 + 边框 + inset 高光），再外面是 `.table-card`。视觉上是「表格里嵌了一张卡」，卡左边距 58px（`.table__expand .sources` 的 padding）也不与表格首列（24px）对齐。同样一张「源列表」在影视详情里是独立卡片（正常），在直播里是表格内的卡片（三层）。

**正解**：展开区不放 `.card`，直接用 `.table__expand` 的底色承载内容（去掉内层 card 的 border/background/shadow），或把 `padding-left` 与表格首列对齐。这也正是 `8f60ba8`「去掉两处多余底色」想做的事，还剩这一处。

---

## 5. 分档

### 5.1 价值高（明显少代码 或 明显更一致）

| # | 事项 | 处数 | 预计净变化 | 一致性收益 |
|---|---|---|---|---|
| H1 | 修 `.badge,` 悬空逗号（2.5） | 1 行 CSS | −1 | 全站状态色恢复原亮度 |
| H2 | 卡片头抽 `<CardHead>` + 合并 `.chart-head`（1.1） | 18 | −35 行 | 15 个卡片的头彻底一致 |
| H3 | 表格内按钮尺寸统一，`.btn--danger-text` 只留颜色（2.3） | 6 页 | ±0 | 操作列基线不再毛边 |
| H4 | 片单详情两份合并（1.7） | 2 | −90~110 行 | 音乐片单拿回 5 个动作、修掉空艺人格、分页器一致 |
| H5 | `.table--inset` 迁 5 处（1.8） | 5 | −5 行 | 卡片内表格左边缘对齐标题 |
| H6 | 「搜索→选一条」抽 `<PickList>`（1.6） | 5 | −50 行 | 4 份手写候选列表归一，gap/padding 一致 |
| H7 | 工具栏：补 2 个 spacer + RecycleView tabs 回左 + `.seg` 高度对齐（4.3 / 2.8） | 3 行 | +2 | 9 个列表页同一套对齐 |
| H8 | 弹窗 footer 4 处迁回插槽（1.5） | 4 | −20 行 | footer 吸底 + 分隔线一致 |

### 5.2 价值中

| # | 事项 | 判断 |
|---|---|---|
| M1 | tabs 抽 `<Tabs>`（1.2） | 13 处，10 行/处；抽完 aria 一致、加计数只改一处。收益真实但一次性改动面大（13 个文件），建议单独一批做 |
| M2 | `<ListCard>` 收掉 9 种 key 公式（1.3） | 顺手修 UserSearchView 的错误 key |
| M3 | `.cards--2/4` 替换 3 处内联（1.11）、`.field-row` 4 处（1.10） | 纯删除内联，零风险 |
| M4 | `<StatCard>`（1.13） | 消掉 42/44 两档、7 处样板 |
| M5 | `.card-head .btn` 收窄（2.2） | 修掉「写了 ghost 得到 quiet」的静默降级；会让账号页「全部下线」变回有边框（可接受） |
| M6 | `.seg--bare` → `.field .seg`（2.1） | 防止变体类扩散 |
| M7 | 详情页头封面 72×96 统一（2.10） | 一处内联改类名 |
| M8 | MusicView / LinesView 补清空出口（1.4） | 2 行 |
| M9 | 直播展开区去三层表面（4.10） | 3–5 行 CSS |
| M10 | 删 `PlaceholderView.tsx` + placeholder 管道（3.3） | −42 行，含一份重复的 LoginView |
| M11 | 商品封面 3 处换 `<Poster>`（3.1） | 修「图挂了只剩空洞」 |
| M12 | `.input` 宽度收敛（2.9） | 8 处覆盖 → 2 个上下文 + 2 个尺寸类 |

### 5.3 不值得动（明确说明理由，避免下一轮被当成 TODO）

| 项 | 理由 |
|---|---|
| `.cards + .table-card/.toolbar/section { margin-top: 24px }`（`components.css:349-354`） | 这是**相邻兄弟补间距**的正确用法，不是补丁。只删死选择器 `.media-grid` |
| `Pager.tsx` 里 5 处内联尺寸 | 全部封装在组件内部，不外溢；改成类只是把数字挪到 CSS。78 行的组件不值得为它加 4 个类 |
| `Token` 化 13.5 / 12.5 / 11.5 三档字号 | 只是换个地方记数字。三档已经分别有 `.text-sm` / `--text-sm` / `.meta-sm` 可复用，够了 |
| `--s-1`…`--s-9` 九个间距 token | 现状是「定义了没人用」。**不要**为了「用上 token」把 266 处内联一次性替换——那是最大的回归风险源。要么删掉这 9 个 token（承认不搞间距体系），要么只在新增代码里用。二者选一，不要半途 |
| `Modal` 的 `width` 五档 | 收成常量即可，不必做成 size 枚举 props |
| `TagInput` / `ImagePicker` / `Poster` / `StateBlock` / `Pager` | 已经是「一个组件一件事」的正面样板，别再动 |
| `.tab` 与 `.seg` 选中态视觉接近 | 主观项，`refactor-round1` 已记录；两者用途不同（页面级切换 vs 页内二元筛选），不建议再造第三套视觉 |
| 圆角 14 的 `.login__card` | 登录页是单页氛围，14 与 18 的差别在那一屏里是有意的（更小的卡片更「硬」）。只改 `--r-card` 也行，但价值近乎零 |
| `content-in` 的 160ms 淡入 | 克制、只在不换页的情况下淡入一次，符合项目取向。不要加更多动画 |

---

## 6. 建议的落地顺序（三批，每批可独立验收）

**第 1 批：修 bug 级样式（约 10 行，半小时）**
1. 删 `.badge,` 这一行（2.5）
2. `--surface-2` → `--raised`（2.6）
3. `.btn--danger-text` 去掉 `height/font-size`，`.table .btn` 给统一尺寸（2.3）
4. 补 `/watchlists`、`/seek` 的 `spacer`；`/recycle` tabs 回左（4.3）
5. 删 `components.css:214-239`、`:1448-1449`、`:1207`、`:426-427`、`:352` 的重复/死样式

验收：`/orders`、`/shop`、`/library`、`/recycle` 四页截图对比；`/library` 的「3 人求」亮度恢复。

**第 2 批：抽 3 个组件 + 迁 5 处表格（约 −120 行）**
6. `<CardHead>`，迁 18 处，删 `.chart-head`（1.1）
7. `<PickList>`，迁 4 处（1.6）
8. 弹窗 footer 4 处迁回插槽（1.5）
9. `.table--inset` 迁 5 处（1.8）
10. `.cards--2/4`、`.field-row`、`.table .input` 收内联（1.10 / 1.11 / 2.10）

验收：`tsc --noEmit` + 15 个路由逐页看一遍间距与对齐。

**第 3 批：结构合并（−200 行以上，改动最大）**
11. 片单详情两份合并（1.7）——单独一批、单独验收，因为它同时改功能（音乐片单获得编辑/订阅）
12. `<Tabs>`（1.2）
13. `<ListCard>`（1.3）、`<StatCard>`（1.13）
14. 删 `PlaceholderView` + placeholder 管道（3.3）

不建议把第 3 批和第 1 批混在一起：第 1 批要能「看一眼就知道对没对」，第 3 批要能「点一遍才知道有没有坏」。

---

## 7. 附录：实测数据

### 7.1 内联 style 分布（`grep -o "style={{"`）

```
30 WatchlistDetailView   30 UploadView   23 VideoDetailView   21 OverviewView
19 ShopView   18 AccountView   14 SongDetailView/RecycleView/LiveView
13 FundView/ProductModals   10 UserDetailView/SeekView/PayView  …
合计 335（含尺寸/间距 266）
```

### 7.2 取值分布

| 属性 | 出现的不同取值 |
|---|---|
| `marginTop` | 0, 4, 8, 10, 12, 14, 16, 18, 22, `'var(--stack)'` （10 种数值 + 1 个 token；`12` 出现 14 次、`16` 9 次、`18` 6 次） |
| `gap` | 2, 4, 6, 8, 10, 12, 16, 24（8 种） |
| `fontSize` | 10, 11.5, 12, 12.5, 13, 13.5, 15, 20（8 种） |
| `border-radius`（CSS） | 3, 4, 5, 6, 7, 8, 9, 12, 14, 999, `--r-card`, `--r-field`, `--r-item`, `50%` |
| CSS 变量 | `--surface-2` 被引用但未定义；`--s-1`…`--s-9` 定义但**零引用** |

### 7.3 关键 computed style（`VITE_MOCK=1`，1280×720）

```
/library    .badge              opacity 0.6   ← 应为 1
/library    .poster-img         background rgba(0,0,0,0)  ← --surface-2 未定义
/orders     .action-group 子项   h:32/13.5px(bottom 256) vs h:20/12.5px(bottom 244)
/account    .card-head .btn     h:20px border:0px（类名是 btn--ghost）
/watchlists .toolbar            h:36  input@565 seg@779 btn@897（右侧空 250px）
/recycle    .toolbar            h:32  input@340 field@554 tabs@848
/media/1    card--tight padding 18px 20px；表格 td padding-left 24px；表头 x=767 vs 标题 x=745
/media/1    .detail-head img    76×108（内联）
/watchlists/1000 .detail-head img 72×96（类 .detail-head__poster）
/users/x    .stat__value        42px        /account、/shop  .stat__value 44px
```

### 7.4 复现命令

```bash
cd /Users/xiangchengjie/Code/emos/emos.club
VITE_MOCK=1 npx vite --port 5288
# .badge 透明度 / 详情页封面尺寸 / 工具栏子元素坐标，均可在 DevTools console 直接取：
# [...document.querySelectorAll('.toolbar')].map(t=>[...t.children].map(k=>[k.className, k.getBoundingClientRect().x]))
```

截图存于 `docs/review/ui-shots/`（本次审查现场拍，未提交）：

| 文件 | 用于说明 |
|---|---|
| `audit-library.png` | 4.7 `.badge` 0.6 透明（「3 人求」） |
| `audit-orders.png` | 4.1 操作列基线错位、4.7 状态 badge 偏淡 |
| `audit-shop-mine.png` | 4.1、4.8 统计卡 44px、2.7 卡片组→工具条 18px |
| `audit-watchlists-toolbar.png` | 4.3 「新建片单」悬在中间、`.seg` 36px |
| `audit-video-detail.png` | 4.6 卡片内表格缩进 22px、4.4 封面 76×108 |
| `audit-watchlist-detail.png` | 4.4 封面 72×96、detail-head 布局 |
| `audit-music-watchlist.png` | 4.5 只有「返回列表」、空艺人格、分页器多一个选择器 |
| `audit-song-detail.png` | 4.4 无 detail-head、4.2「添加歌词」是带边框 pill |
| `audit-live-expand.png` | 4.10 三层表面 |
| `audit-fund-carrot.png` | 1.13 胡萝卜卡 `maxWidth: 380`、`card-head` 文字型动作 |
