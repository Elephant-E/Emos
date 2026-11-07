# 交互和谐度审查（第五轮）

范围：同一类动作在不同页面是否表现一致、反馈是否协调。只读源码，未启动浏览器。
样本：22 个 view、25 个 `<Modal>`、23 处 `confirmDialog`、76 处 `toast`、23 张表格（其中 7 张是页面级列表，见 §2.6）。
（任务书写的是 18 个页面，实际 `src/views/*.tsx` 有 22 个；新增的是 `FundView`、`WhisperView`、`UserSearchView`、`RecycleView` 等。）
规范基线：`docs/SPEC-UI.md` §4（交互状态）、§6（动效）、§7（文案）。

> 行号基准：HEAD `a79b2a2`。审查期间 `src/views/AccountView.tsx` 工作区另有他人未提交的 +97 行（"客户端登录"卡片），
> 提交后该文件里的行号会整体下移约 97 行；其余文件不受影响。

---

## 一、结论：五条最硬的不一致

1. **同一个"删除"，四种按钮样式。** `.btn--danger-text`（6 处）、`.btn--quiet`（线路 :108、频道 :129、直播源 :194）、`.btn--danger` 描边（资源弹窗 :429）、`.btn--ghost`（歌曲 :43、影片 :97）。表格里 `.table .btn--danger-text` 默认是灰的、hover 才变红——所以肉眼几乎看不出差别，但"危险色到底有没有语义"没人答得上来。
2. **忙碌态有四种表达，`aria-busy` 全站只用 1 次。** CSS 已经定义好了 `.btn[aria-busy='true']`（`components.css:980`），但只有 `SeekView:161` 用了。其余是：只换文案（7 处）、文案 + disabled、只 disabled、完全没有（所有删除/发货/上下架）。
3. **弹层有三种结构。** footer 槽（25 个里 14 个）、body 里自己写 flex 按钮组（`FundView:213/240`、`WhisperView:119`）、纯内容无按钮（`SeekView:183`）。只有 footer 槽才会吃到 `.modal__foot` 的边框、内边距和右对齐。
4. **回车有三套语义，且其中一套是危险的。** 登录页是 `<form onSubmit>`（`LoginView:108`）；25 个弹层没有 form，回车什么都不做；**没有 `autoFocus` 的弹层，初始焦点落在左上角 ✕ 上，回车 = 关闭弹层**（`Modal.tsx:32-34` 取 `focusables()[0]`）。而确认框相反：回车 = 执行，危险动作的焦点就在"删除"上（`confirm.tsx:82`）。
5. **筛选一半进 URL，一半进组件 state。** 列表页大多在 URL；但**线路页的搜索、页码、每页条数全在 state**（`LinesView:16-18`）、**商城页的页码与类目在 state**（`ShopView:29-35`）、账号页胡萝卜流水分页在 state（`AccountView:50`）——刷新即丢、无法分享。

另外发现一处会直接产生**双份 toast** 的写法（4 处，见 §3.6）。

---

## 二、横向对比矩阵

### 2.1 删除 / 移除类动作（动作 × 页面）

| 页面 | 位置 | 按钮类 | 确认 | pending | 成功文案 |
|---|---|---|---|---|---|
| 媒体库 | 无删除（只有 `row-menu` 进详情） | `.row-menu` | — | — | — |
| 片单 | `WatchlistsView:171` | `danger-text` | ✅ | ❌ | `片单已删除` |
| 订单 | `OrdersView:151` | `danger-text` | ✅ | ❌ | `已删除` |
| 商品 | `ShopView:166` | `danger-text` | ✅ | ❌ | `已删除` |
| 商品分类 | `ShopView:253` | `quiet` | ✅ | ❌ | `已删除` |
| 求片 | 无删除（撤回认领在详情弹层内） | — | ✅ | ✅ `撤回中…` | `已撤回认领` |
| 回收站 恢复 | `RecycleView:176/230` | `quiet` + disabled | ✅ | ✅ 本地 `busy` | `已恢复` |
| 直播频道 | `LiveView:114` | **`quiet`** | ✅ | ❌ | `已删除` |
| 直播源 | `LiveView:180` | **`quiet`** | ✅ | ❌ | `已删除` |
| 线路 | `LinesView:94` | **`quiet`** | ✅ | ❌ | `已删除` |
| 影片（详情页头） | `VideoDetailView:97` | `danger-text` | ✅ | ❌ | `已删除` |
| 资源（弹窗内） | `VideoDetailView:429` | **`danger` 描边** | ✅ | ❌ | `已删除，±N 胡萝卜` |
| 字幕（在重命名弹窗内） | `VideoDetailView:573` | **`ghost`** | ✅ | ❌ | `已删除` |
| 歌曲 | `SongDetailView:43` | **`ghost`** | ✅ | ❌ | `已删除` |
| 片单内影片 | `WatchlistDetailView:191` | **`quiet`** | ✅ | ❌ | `已移出` |
| 片单内歌曲 | `WatchlistDetailView:393` | `danger-text` | ✅ | ❌ | `已移除` |

**同一动作，确认框标题也分两派**：

- 带对象名：`删除线路「X」？`、`删除频道「X」？`、`删除商品「X」？`、`删除分类「X」？`、`删除片单「X」？`、`从片单移除《X》？`
- 泛指：`删除这个订单？`、`删除这个源？`、`删除这个资源？`、`删除这部影片？`、`删除这首歌曲？`、`删除这条字幕？`、`移出这个影片？`

而且 **`移出` 与 `移除` 是同一个动作的两个动词**（`WatchlistDetailView:193` vs `:393`），违反 SPEC §7「动作名即结果名」。

### 2.2 忙碌态（按钮 pending）

| 表达方式 | 出现处 | 说明 |
|---|---|---|
| 只换文案 | `FundView:222/249`、`OverviewView:404`、`AccountView:224`、`SeekView:239`、`WhisperView:129` | 文案变了，但按钮还能点（除非另有 disabled） |
| 文案 + disabled | `RecycleView:178/233`、`SeekView:163` | 目前最完整的一组 |
| 只 disabled | `AccountView:144`（改笔名）、`:586`（转赠） | 与"表单没填完"共用同一个视觉 |
| **完全没有** | 所有删除、`OrdersView:136` 发货、`ShopView:152` 上下架、`WatchlistsView:170` 删除、`VideoDetailView` 各删除 | 连点风险 |
| `aria-busy` | **仅** `SeekView:161` | CSS 已有 `.btn[aria-busy='true']`（`components.css:980`） |

两个视觉值也很接近，用户分不出语义：`.btn:disabled` = `opacity: .45`（"还不能点"），`.btn[aria-busy]` = `.6`（"正在点"）。

### 2.3 弹层（25 个）

| 维度 | 现状 | 问题 |
|---|---|---|
| 宽度 | 400×1、420×2、460(默认)×7、460(显式)×2、480×1、520×5、600×2 | 6 个值；460 与 480 差 20px 无意义 |
| footer 槽 | 25 个里只有 14 个用 | `FundView:203/230`、`WhisperView:110` 在 body 里自写 flex；`SeekView:183` 无按钮 |
| 标题式样 | 动词式（`新增/编辑/提交/重命名/移动/回复`）＋名词式（`订单备注/分类管理/店铺设置/今日签到/求片详情/动态抓取`）＋`动作 · 对象`（`新增源 · X`、`催片 · X`） | 三套写法 |
| Esc / 点遮罩 / ✕ | 三个都有（`Modal.tsx:37-41`、`:64`、`:68`） | ✅ 统一 |
| 焦点 | 有 `autoFocus` 的 15 个落在输入框；其余落在 ✕ | 见 §2.4 |
| 未保存关闭 | 一律直接关，无提示 | 统一（但不能算好） |
| 嵌套 | Modal 内再开 Confirm（订单备注 → 删除订单） | **按 Esc 时 `Modal.tsx:38` 先 `stopPropagation`，`confirm.tsx` 挂在 window 上收不到 → 底层弹层关掉、确认框留下** |

### 2.4 回车

| 场景 | 行为 | 出处 |
|---|---|---|
| 搜索框（媒体库/音乐/回收站/片单详情/侧栏/查用户/分页跳转） | 回车提交 | `LibraryView:75`、`MusicView:78`、`RecycleView:111`、`WatchlistDetailView:132/347`、`Sidebar:97`、`UserSearchView:42`、`Pager:64` |
| 线路搜索 | 无需回车（实时过滤） | `LinesView:48` |
| 弹层内 | 回车无事发生（无 form） | 25 个弹层全部 |
| 确认框 | 回车 = 执行 | `confirm.tsx:45-57`，焦点在取消上时忽略（`:51`） |
| 列表行 | 回车 = 进详情 | `LibraryView:121` |

**两个风险点：**

1. **危险确认框的初始焦点在"删除"上**（`confirm.tsx:82` 的 `autoFocus`）。用户刚在弹层里敲完字、顺手回车，可能直接把订单删掉。取消按钮虽然有针对回车的豁免（`data-confirm-action="cancel"`），但那要求焦点**已经在**取消上。
2. **没有 `autoFocus` 的弹层，回车 = 关闭。** 至少 `SeekView:183`、`:246`（催片，输入框在 `:270` 无 autoFocus）、`FundView:203/230`、`ShopView:212/275`、`VideoDetailView:456/493`、`WhisperView:110` 属于这一类。催片弹层尤其别扭：它是要花胡萝卜的。

### 2.5 筛选与 URL

| 页面 | 在 URL | 在组件 state（刷新即丢） |
|---|---|---|
| 媒体库 | page / page_size / q / type（`router.tsx:64`） | — |
| 音乐 | page / tab / q（`:202`） | — |
| 订单 | page / pay / delivery（`:135`） | — |
| 求片 | page / page_size / tab（`:292`） | — |
| 片单 | page / page_size / scope / type（`:309`） | — |
| 片单详情 | page / page_size / q（`:327`） | `term`（输入中草稿，可接受） |
| 回收站 | tab / page / size / q / by（`:171`） | — |
| 直播 | page / library / channel（`:152`） | — |
| 基金 | page / size / tab（`:238`） | — |
| 账号 | tab（`:105`） | **`carrotPage`（`AccountView:50`）** |
| 商城 | tab（`:120`） | **`page`、`categoryId`、`panel`（`ShopView:29-35`）** |
| 线路 | — | **`term`、`page`、`pageSize`（`LinesView:16-18`）** |
| 影片详情 | season / episode（`:82`） | 与 URL 双向同步，OK |

参数名也不统一：同一语义写了 `page_size`（媒体库/求片/片单/片单详情）与 `size`（回收站/基金）两种。

### 2.6 七张表的操作列

| 表 | 表头 | 列宽 | 单元格形态 | 按钮顺序 |
|---|---|---|---|---|
| 媒体库 `LibraryView:168` | **空表头** | 44px | 1 个 `row-menu` 图标 | — |
| 片单 `WatchlistsView:123` | 操作 | 88px | 单按钮 | 删除 |
| 订单 `OrdersView:133` | 操作 | 18% | `.action-group` 3 个 | 发货 / 备注 / **删除** |
| 商城 `ShopView:149` | 操作 | 16% | `.action-group` 3 个 | 上下架 / 编辑 / **删除** |
| 求片 `SeekView:135` | 操作 | 12% | 1–2 个（条件渲染） | 详情 / 认领 / 催片 |
| 回收站 `RecycleView:171/227` | 操作 | 96px | 单按钮 | 恢复 |
| 直播 `LiveView:112` | 操作 | 16% | 单按钮 | 删除 |

共同点：危险动作都放在最后（✅）。不一致点：单元格形态三种（图标/单按钮/action-group）、列宽四种量纲（px 与 % 混用）、媒体库干脆没有表头（`aria` 上也读不出"操作"）。

---

## 三、不一致清单（按主题，可直接勾兑）

### 3.1 危险色语义失效

- `LinesView:94-109`、`LiveView:114-129`、`LiveView:180-195`、`WatchlistDetailView:191`：删除/移出用 `.btn--quiet`，和"备注/发货/编辑"同一个颜色。
- `VideoDetailView:429`：删除用 `.btn--danger`（描边红），全站唯一。
- `SongDetailView:43`、`VideoDetailView:97`：删除用 `.btn--ghost`。
- 对照：`WatchlistsView:171`、`OrdersView:151`、`ShopView:166` 用的是 `.btn--danger-text`。**建议这是唯一合法值。**

### 3.2 忙碌态

- 4 种表达见 §2.2；`.table` 内的写操作几乎全无 pending。
- `SeekView:163` 是唯一用了 `aria-busy` 的地方，也是唯一按 `mutation.variables` 精确到行的实现——**这应该成为模板**。
- `.btn:disabled` 同时承担"未填完"和"进行中"两种语义（如 `LinesView:141` vs `RecycleView:175`）。

### 3.3 弹层

- 结构三套（§2.3）：`FundView:213-224`、`FundView:240-251`、`WhisperView:119-134` 在 body 里自写按钮组。
- 宽度 6 个值，其中 460/480 相邻无理由。
- 标题三套写法。
- **Esc 嵌套**：`Modal.tsx:38` 的 `stopPropagation` 让 `confirm.tsx` 的 window 监听收不到 → 关底层、留确认框。

### 3.4 回车

- 登录有 form（`LoginView:108-110`），其余弹层没有。
- `confirm.tsx:80` 危险动作 autoFocus。
- 无 autoFocus 的弹层回车 = 关闭（§2.4 列表）。

### 3.5 筛选

- `LinesView:16-18`（全部 state）、`ShopView:29-35`（page + categoryId）、`AccountView:50`（carrotPage）。
- `page_size` / `size` 两种参数名。

### 3.6 错误提示双发（4 处）

全局 `MutationCache.onError` 已经会把失败弹成 toast 并带状态码（`main.tsx:12-19`），这几处又加了一层：

- `SongDetailView:37`：`onError: () => toast('操作失败','error')`
- `WatchlistDetailView:59`：同上
- `WatchlistsView:61`：`onError: (err) => toast(... '创建失败')`
- `RecycleView:44-46`、`:62-66`：`mutateAsync` + `try/catch` 里再 toast

结果是一次失败弹两条，文案还不一样（全局带状态码，局部是"操作失败"）。而 `OverviewView:65-75` 是**正确范式**：只在 429/"重复"这类需要换措辞的情况下接管，否则 `return` 交给全局。

### 3.7 分页三套实现

- `<Pager>` 组件：10 个页面在用（含每页条数、跳页）。
- 自绘：`AccountView:422-430`、`ShopView:196-204`、`WatchlistDetailView:219-227` —— 都没有每页条数选择，也没有跳页输入，样式靠 `.pager` 类碰巧对齐。

### 3.8 成功/失败文案

- 成功：`已删除`(8) / `片单已删除` / `线路已创建` / `已移出` / `已移除`——实体名有选择地出现。
- 失败：`操作失败`(2) / `删除失败` / `恢复失败` / `移动失败` / `提交失败，可能已申请过或胡萝卜不足`——SPEC §4 要求"说清原因"，`操作失败` 不满足。

---

## 四、建议统一成什么

按"改动小、收益大"排序，全部落到组件或类名。

### 4.1 危险动作只有一个类：`.btn--danger-text`

- 表格内、页头、弹层 footer 内的删除/移除，**只用 `btn btn--danger-text`**；`.btn--danger`（描边红）保留给"整个弹层都危险"的场景，目前没有，可先删。
- 改：`LinesView:94`、`LiveView:114`、`LiveView:180`、`VideoDetailView:573`、`SongDetailView:43`、`VideoDetailView:97`、`WatchlistDetailView:191`。
- 顺带统一动词：片单内一律 `移除`（`WatchlistDetailView:193` 的 `移出` 改掉），`confirmText` 与按钮文字同词。

### 4.2 忙碌态统一走 `aria-busy`，新增一个小组件

```tsx
// src/components/ActionButton.tsx
<ActionButton busy={mutation.isPending} busyText="删除中…" onClick={...}>删除</ActionButton>
// 渲染：<button className="btn btn--danger-text" aria-busy={busy || undefined} disabled={busy}>
//          {busy ? busyText : children}
```
- 视觉已有：`components.css:980` 的 `.btn[aria-busy='true']`；建议把"未填完"的 disabled 也走同一套（`.btn:disabled`），并把两个值拉开（`.45` vs `.6` 太近，建议 busy 用 `.6` + 保留文字颜色、disabled 用 `.45` + `--fg-5`）。
- 至少先改 6 个连点风险最高的：删除（6 处）、发货（`OrdersView:136`）、上下架（`ShopView:152`）。

### 4.3 `Modal` 收口：footer 槽 + 宽度 token + 表单语义

- **禁止在 body 里自写按钮组**：`FundView:213/240`、`WhisperView:119` 改成 `footer` 槽。
- **宽度收成 3 档**：`tokens.css` 加 `--w-modal-sm: 420px`、`--w-modal: 520px`、`--w-modal-lg: 600px`；`400/460/480` 全部归并（`Modal.tsx:10` 默认值改 520 或 420）。
- **给 `Modal` 加 `onSubmit`**：内部用 `<form onSubmit>` 包住 body+footer，回车 = 提交；`SeekView:246`（催片）这类花钱动作立刻受益。这是解决 §2.4 风险 2 的唯一干净办法。
- 标题统一为 `动作 + 对象`：`订单备注` → `备注订单`、`分类管理` → `管理分类`、`今日签到` → `签到`，或反向统一成名词短语——**只选一种**，写进 SPEC §7。

### 4.4 确认框：危险动作的焦点必须在"取消"上

- `confirm.tsx:82` 的 `autoFocus` 改为：`danger` 时聚焦取消，非 danger 时聚焦确认。
- `confirm.tsx:45-57` 的全局回车改为：`danger` 时回车不执行（必须点），非 danger 保持现状。
- **Esc 嵌套**（`Modal.tsx:38` + `confirm.tsx:45-57`）：两者分别挂在 `document` 与 `window` 的冒泡阶段，事件先到 `document`，`Modal` 的 `stopPropagation()` 把 `confirm` 的监听挡在门外 → 关掉底层弹层、留下确认框。两种改法任选其一：
  - `Modal` 的 Esc 分支开头加一句「有确认框就让我让位」：`if (document.querySelector('.modal-overlay--decision')) return`；
  - 或 `confirm.tsx` 改为在 `document` 上用**捕获阶段**注册（`addEventListener('keydown', onKey, true)`），先于 Modal 处理。

### 4.5 搜索框与筛选统一进 URL

- 抽一个 `<ToolbarSearch value onCommit />`（Enter 提交，与 `LibraryView:75` 一致），供线路页替换 `LinesView:43-49`。
- `LinesView` 的 `page/pageSize`、`ShopView` 的 `page/categoryId`、`AccountView` 的 `carrotPage` 迁进 `validateSearch`（`router.tsx` 已有 `asPage` 助手）。
- 参数名统一 `page_size`，回收站/基金的 `size` 改名（保留兼容读入）。

### 4.6 操作列统一成两段式

```tsx
<td className="action-cell">
  <span className="action-group">
    {主操作 /* .btn--quiet */}
    {次操作 /* .btn--quiet */}
    {危险操作 /* .btn--danger-text，永远最后 */}
  </span>
</td>
```
- 媒体库补上 `操作` 表头（现在 `LibraryView:111` 是空 th），或明确"整行可点，无操作列"并把那列删掉——**二选一，别留空表头**。
- 列宽统一：文字动作 `96px`、图标动作 `44px`，不再混用百分比。
- 顺带：`.table td.action-cell`（`components.css:1113`）已经定义好了 `white-space: nowrap`，但 **0 个 view 在用**——和 `.btn[aria-busy]` 是一类问题：约定写进了 CSS，没人写进组件。

### 4.7 错误提示只留一处

- 删掉 `SongDetailView:37`、`WatchlistDetailView:59`、`WatchlistsView:61` 的局部 `onError`；`RecycleView` 的 `try/catch` 只保留成功分支。
- 需要换措辞时按 `OverviewView:65-75` 的写法：命中特定状态码才接管，其余 `return` 交全局。
- 把"失败文案必须带原因"写进 SPEC §4 并给反例（`操作失败`）。

---

## 五、落地顺序

| 优先级 | 事项 | 涉及 |
|---|---|---|
| **P0** | 危险确认框焦点改到取消；弹层加 form 让回车=提交 | `confirm.tsx:80`、`Modal.tsx` |
| **P0** | Esc 嵌套：关底层弹层却留确认框 | `Modal.tsx:38` + `confirm.tsx` |
| **P1** | 危险动作统一 `.btn--danger-text`（6 处） | §4.1 |
| **P1** | 忙碌态统一 `aria-busy`，先补 6 处连点风险 | §4.2 |
| **P1** | 弹层 footer 槽 + 3 档宽度 token | §4.3 |
| **P2** | 错误提示去重（4 处） | §4.7 |
| **P2** | 筛选迁 URL（线路/商城/账号） | §4.5 |
| **P2** | 操作列两段式 + 列宽统一 | §4.6 |
| **P3** | 弹层标题式样、分页收敛到 `<Pager>`、参数名统一 | §4.3/4.6 |

一句话总览：**这个项目的"单点"质量都不低——确认框有 danger、toast 带状态码、Modal 有焦点陷阱和 Esc——缺的是把这些单点固定下来的约定。** 上述改动没有一处需要新功能，全部是把已有做法选一个写成规则。
