# 动效审查 · 第二轮

对象：`c7d1303`（四向审查后的第一批修复）之后的代码状态，含未提交工作区改动。
方式：只读源码与 git 历史，未启动浏览器；所有结论标注了文件名与行号，可在编辑器里逐条核对。

一句话结论：**上轮 6 条完成 1 条整、1 条半（Modal 少了遮罩），前置修复 3/3 完成；实际剩余 4 条，不是 3 条**——漏掉的是 toast 出场，`docs/review/README.md` 把它记成了"已加"。

---

## 一、完成度核对表

### 1.1 上轮 6 条

| # | 条目 | 状态 | 证据 | 判定 |
|---|---|---|---|---|
| 1 | 加载 → 内容切换 | ⬜ 未做 | 11 处 `<div className="table-card">` 均无入场类；`LoadingBlock` 卸载与表格挂载仍在同一帧 | — |
| 2 | Modal / Confirm 出现 | 🟡 半条 | `components.css:1059-1067` `.modal, .confirm` 有 `modal-in`；`.modal-overlay`（`:695-704`）**没有任何动画** | 面板缓入、遮罩瞬现，两层不同步 |
| 3 | 行内写操作反馈 | ⬜ 未做 | `.badge`（`:538-544`）无 `transition`；`.btn[aria-busy]` 不存在；`SeekView.tsx:130` 仍是全局 `claim.isPending` | — |
| 4 | toast 出场 | ⬜ 未做 | `components.css:846` 只有 `toast-in`，无 `.is-leaving` / `toast-out`；`ui/toast.tsx` 到期直接 `filter` 移除 | **README 误记为已加** |
| 5 | 路由切换 | ✅ 完成 | `AdminLayout.tsx:10-22` `page-in` 180ms + `scrollTo(0)`；`key` 只跟 `pathname`，Tab/分页不重放 | 附带一个新代价，见 §2.1 |
| 6 | 侧栏账号菜单 | ⬜ 未做 | `.rail__menu`（`:973-984`）无动画 | — |

**完成度：1.5 / 6。**

### 1.2 上轮 3 条前置修复

| 前置项 | 状态 | 证据 |
|---|---|---|
| `prefers-reduced-motion` 死代码 | ✅ | `base.css:68-77` 已补 `*, *::before, *::after`，括号配平 |
| 路由不复位滚动 | ✅ | `AdminLayout.tsx:15-17` |
| `.progress-line` 过渡 `width` | ✅ | `components.css:921-929` 改 `transform`；`UploadView.tsx:177`、`OverviewView.tsx:173` 两处调用都改用 `scaleX()`，没有漏网 |

这 3 条是上轮的重点修复，全部落地且没留尾巴。

### 1.3 一处记录错误

`docs/review/README.md` 第 11 条：

> 已加：路由淡入、Modal/Confirm 出现、**toast 出场**。待加：加载→内容切换、行内写操作反馈、侧栏账号菜单。

"toast 出场"在代码里不存在（`grep -n "is-leaving\|toast-out" src/styles/components.css src/ui/toast.tsx` 无结果）。这条记录会让下一轮继续漏掉它。按 README 自己的说法应该改成：

> 已加：路由淡入、Modal/Confirm 出现（遮罩待补）。待加：加载→内容切换、行内写操作反馈、侧栏账号菜单、toast 出场。

---

## 二、已落地部分的问题审查

### 2.1 `page-body` 的 key：Toast / Confirm 不会重建

**不会。** 结构是这样（`AdminLayout.tsx:19-26`）：

```
.shell
├ .rail                    (Sidebar)
├ .page                    ← 滚动容器，ref 在这里，跨路由存活
│ └ .page-body  key=pathname   ← 只有这层被销毁重建
├ ToastHost   → .toast-stack
└ ConfirmHost → .modal-overlay
```

两个 Host 是 `<main>` 的兄弟节点，不在 keyed 子树里，所以：

- `toast.tsx` 的模块级 `push` 句柄不会被清空（它的 `useEffect` 清理函数不会跑）；
- `confirm.tsx` 的模块级 `open` 同理，不会出现 `ConfirmHost` 重挂载后 `open === null` 的窗口期；
- `ConfirmHost` 里正在等待的 Promise 不会被丢弃。

这三点是关键——如果当初把 `key` 加在 `.page` 上、或者把 Host 放进 `.page-body`，`toast()` / `confirmDialog()` 就会在路由切换时静默失效。目前的位置是对的，**不要动**。

三个附带观察：

1. **写在视图里的 17 个 `<Modal>` 会随路由切换直接消失**，没有退场。这符合上轮"关闭不做退场"的结论，不用改。
2. **`ConfirmHost` 在路由切换时不会关掉**。用户在 confirm 打开状态点侧栏，页面换掉、对话框还在，此时点"确定"操作的是已经离开的那一页的行。这是既有问题（Host 一直是全局的），不是这轮引入，但 `key` 让页面切换变"轻"之后更容易被触发。可选修法：`useEffect(() => settle(false), [pathname])`，但要在 `ConfirmHost` 里读路由，属于额外耦合，建议先不做，记进已知问题。
3. **`scrollTo` 在 `useEffect` 里（paint 之后）执行**，理论上有一帧停留在旧滚动位置。实际被 `page-in` 的起始 `opacity: 0` 盖住了——这是两条改动之间意外的正协同，不用调整。

### 2.2 代价：现在"永远回顶"，A→B→A 丢失位置

上轮我写的是"先修滚动复位，再考虑淡入"，现在落地成了**无条件**：每次路径变化都 `scrollTo(0)`，加上 `key` 重建，从列表点进详情再返回，一定回到列表顶部。

在只滚一屏的页面无所谓；但媒体库 20 万条、音乐 52 万条这类长列表，8 小时里"点进去 → 返回 → 重新找到刚才那一行"会反复发生。这已经不算动效问题，是本轮改动带来的**新摩擦**。

修法很小（`.page` 保留 ref，`key` 只作用于内容，两者不冲突）：

```tsx
// AdminLayout.tsx
const location = useRouterState({ select: (s) => s.location })
const scrollMemo = useRef(new Map<string, number>())

useEffect(() => {
  const el = pageRef.current
  if (!el) return
  const key = location.pathname + location.searchStr
  el.scrollTop = scrollMemo.current.get(key) ?? 0
  return () => {
    scrollMemo.current.set(key, el.scrollTop)
  }
}, [location.pathname, location.searchStr])
```

只在同一路径重入时恢复，首次进入仍回顶。建议列为 P1，不阻塞本轮其余条目。

### 2.3 `modal-in` 的 transform 与 `position: sticky`：今天不冲突

分三层看，结论是**没有冲突面**：

1. **交集为空**：全仓库只有 1 处 `position: sticky`（`components.css:469`，`.table thead th`）。我逐个展开了 17 个 `<Modal>` 的函数体，**没有任何一个包含 `<table>`**。transform 与 sticky 连见面的机会都没有。
2. **即使将来有**：`modal-in` 的 `transform` 加在 `.modal` 自己身上，而 `.modal` 就是它内部内容的滚动容器（`max-height: calc(100vh - 64px)` + `overflow: auto`）。transform 加在滚动容器**自身**不会破坏它内部 `sticky` 子元素；真正会坏的是"sticky 元素与它的滚动容器之间"多出一个带 transform 的祖先。
3. **真正要注意的是另一件事**：`.modal` 在动画的 160ms 内是 `position: fixed` 后代的包含块。今天 modal 里没有 fixed 元素，所以无影响；将来若在弹窗里塞浮层（下拉、二次确认气泡），要么用绝对定位，要么把动画改成纯 `opacity`。

顺带一个与本轮无关、但影响 sticky 判断的静态发现：`.table-card` 是 `overflow: auto`（`components.css:464`）且**没有高度约束**，那么它才是 `thead` 的滚动容器，而它自身纵向永不滚动 → 表头在页面滚动时不会吸顶。`README` 第 2 条说"`overflow:auto`，粘性恢复"，按规范推断这句话可能不成立。这属于 ui 范畴，我不改结论，建议真机把长列表滚一下确认（表头若跟着滚走，就是没生效）。

### 2.4 时长开始散

现在全站有 5 个时长值：

| 值 | 出处 | 评价 |
|---|---|---|
| 140ms `--t-fast` | hover、按钮、开关 | ✅ 令牌 |
| 220ms `--t-base` | toast 入场、进度条 | ✅ 令牌 |
| **180ms** | `page-in`（`:1051`） | ⚠️ 裸值 |
| **160ms** | `modal-in`（`:1061`） | ⚠️ 裸值 |
| 1400ms / 2600ms | shimmer / toast 存活期 | 环境噪声与业务时长，不参与 |

180 与 160 人类分辨不出差别，却要让人每次纠结用哪个。建议收成一条 `--t-enter: 160ms`，`page-in` 与 `modal-in` 都用它（`page-in` 从 180 变 160，观感无变化）。这是本轮唯一建议新增的令牌。

### 2.5 与 `SPEC-UI.md` §6 的一处不一致

规范写"toast 140ms 淡入上移"，实现是 `toast-in var(--t-base)`＝220ms（`components.css:846`）。二者必须对齐一个。建议实现改成 140ms（`--t-fast`）：toast 只活 2.6 秒，入场占掉 1/5 的可见时间是浪费；而且出场马上要按 140ms 写，进出同速才顺。

---

## 三、剩余条目的实现

> 以下每条都给了文件、类名、参数，可以直接照做。**不新增任何动画库**。

### 3.1 加载 → 内容切换（上轮 #1）

**做法**：纯 CSS。给"骨架换成内容"那一刻新挂载的容器加一个入场类。

**为什么不需要 JS**：现在的渲染是三个互斥分支（`isLoading` → `LoadingBlock`；空 → `EmptyBlock`；有数据 → `table-card`）。分支切换时元素是**新挂载**的，`animation` 自然播放一次；而 Tab / 分页走 `placeholderData`，表格节点不会被替换，也就不会重放——正好是想要的：**数据换了要淡入，翻页不淡入**。

**改哪里**：11 个渲染点，都是 `<div className="table-card">`：

| 文件 | 行 | 文件 | 行 |
|---|---|---|---|
| `LibraryView.tsx` | 99 | `OrdersView.tsx` | 75 |
| `SeekView.tsx` | 75 | `ShopView.tsx` | 106 |
| `WatchlistsView.tsx` | 112 | `LiveView.tsx` | 74 |
| `WatchlistDetailView.tsx` | 144 | `LinesView.tsx` | 63 |
| `MusicView.tsx` | 90 | `RecycleView.tsx` | 102 |
| `UploadView.tsx` | 158 | | |

改成 `className="table-card content-in"`。空态 `EmptyBlock` 与页内小表（`bare` 的那几处）可一并加，观感统一。

**参数**：`var(--t-enter)` 160ms，`var(--ease)`，只 `opacity`。

**一个要避开的坑**：首次进入某路由时，`.page-body` 的 `page-in` 与 `.content-in` 会同时挂载，两层 opacity 相乘——动画中段的实际不透明度是 0.25 而不是 0.5，看起来比单层更闷、更慢。因为数据通常要 1–2 秒才到，实际很少重叠；如果介意，把 `content-in` 的时长压到 `var(--t-fast)` 140ms，重叠时也只是一段更短更浅的淡入。

### 3.2 行内写操作反馈（上轮 #3）

这条拆成"一行 CSS 拿大头 + 一行属性拿定位"两部分，**不需要新增任何 state**。

#### (a) 状态徽标的颜色过渡 —— 一行 CSS，零 JS

`.badge` 现在没有 `transition`（`components.css:538-544`）。加一行：

```css
.badge { transition: color var(--t-fast) var(--ease); }
```

收益立刻出现在所有**原地翻转状态**的列表里，因为这些地方的 `<span className={badge ...}>` 节点不会被替换，只是 class 变了：

| 场景 | 文件 | 变化 |
|---|---|---|
| 认领求片 | `SeekView.tsx:116` | `badge--wait`（黄）→ 刷新后 `badge--run`（蓝） |
| 标记发货 | `OrdersView.tsx:127` | `badge--off` → `badge--ok` |
| 商品上下架 | `ShopView.tsx:141` | `badge--ok` ⇄ `badge--off` |
| 源状态 | `LiveView.tsx:172` | `badge--ok` ⇄ `badge--warn` |

一行代码，四个高频场景，且完全符合"hover 只改颜色"的既有规则——这里改的也是颜色，不是表面。

#### (b) 按钮的进行中态 —— 一行 CSS + 一行属性

`.btn:disabled` 是 `opacity: .45`（`:241-243`），和"这条不可用"同色，读不出"正在做"。加：

```css
.btn[aria-busy='true'] {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity var(--t-fast) var(--ease) 120ms;
}
```

三处细节：

- **延迟 120ms 生效**：这台实例快接口 200ms 内就返回，不延迟会闪一下；延迟写在 busy 态上，恢复时走 `.btn` 的基础 transition（0 延迟）。需要把 `opacity` 追加进 `.btn` 的基础 transition 列表（`:222-223`），否则恢复是硬切。
- **必须放在 `.btn:disabled` 之后**：两者选择器权重相同（0,2,0），靠源码顺序决胜。
- `pointer-events: none` 顺手堵掉连点。

挂载点（属性即可，不动逻辑）：

| 文件 | 行 | 改法 |
|---|---|---|
| `SeekView.tsx` | 130 | `disabled={claim.isPending}` → `aria-busy={claim.isPending && claim.variables === item.id}`，`disabled` 同步收窄到本行 |
| `RecycleView.tsx` | 138 / 193 | `aria-busy={busy === mediaId \|\| undefined}` |
| `ShopView.tsx` | 152 / 173 | `aria-busy={actions.toggleUp.isPending && actions.toggleUp.variables === product.product_id \|\| undefined}` |
| `OrdersView.tsx` | 139 | 同上，比对 `order.order_no` |

**关键收益**：`SeekView.tsx:130` 现在是 `disabled={claim.isPending}`（全局），点一行"认领"会把**整页所有行的认领按钮**一起变灰。改成按 `mutation.variables` 比对后，只有被点的那一行变灰——这不是动效，是纠错，但正是"行内反馈"要解决的问题：让反馈落在被操作的那一行上。

TanStack Query 的 `useMutation` 在 pending 期间暴露 `variables`，所以四个文件都**不用加 state**，只改属性表达式。

#### (c) 落地后的"沉一下" —— 可选，不建议做

上轮设想的 `.badge[data-settling]` 240ms 透明度回落，需要每视图一个 `settledId` + `setTimeout`。有了 (a) 的颜色过渡 + toast + 行内容本身变化（状态文字、按钮消失）之后，再加一层脉冲是重复表达。**建议跳过**，把省下的复杂度留给 (b)。

### 3.3 侧栏账号菜单（上轮 #6）

**做法**：纯 CSS，两个规则。

```css
.rail__menu {
  transform-origin: bottom left;
  animation: menu-in var(--t-fast) var(--ease);
}
@keyframes menu-in {
  from { opacity: 0; transform: translateY(4px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}
```

方向要对：菜单挂在按钮上方（`bottom: calc(100% + 6px)`，`:977`），从下沿往上长。`transform-origin: bottom left` 让缩放锚在靠近按钮的那个角。

附带一条几乎零成本的补充——展开指示：

```css
.rail__account-caret { transition: transform var(--t-fast) var(--ease); }
.rail__account[aria-expanded='true'] .rail__account-caret { transform: rotate(180deg); }
```

`aria-expanded` 在 `Sidebar.tsx:153` 已经绑好了，不用改 TSX。这解决的是"我不确定这菜单是不是这个按钮开出来的"。

### 3.4 toast 出场（上轮 #4，被漏掉的那条）

**做法**：CSS 负责样子，JS 只负责"什么时候移除"，约 10 行。

`ui/toast.tsx`：

```tsx
interface ToastItem { id: number; message: string; type: ToastType; leaving?: boolean }

// 原来的 setTimeout 里：setItems(prev => prev.filter(...))
// 改为先标记：
const dismiss = (id: number) =>
  setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))

// 渲染：
<div
  className={`toast toast--${item.type}${item.leaving ? ' is-leaving' : ''}`}
  onAnimationEnd={() => {
    if (item.leaving) setItems((prev) => prev.filter((t) => t.id !== item.id))
  }}
>
```

两个提醒：

- `onAnimationEnd` 也会在**入场**动画结束时触发，必须用 `item.leaving` 守卫，否则 toast 会立刻消失。
- `prefers-reduced-motion` 把时长压到 0.001ms，`animationend` 依然会触发（时长非 0），所以**不需要**为降级写 JS 分支。

CSS 见 §5.4。同时把入场从 220ms 改到 140ms，与出场一致（并顺手对齐 `SPEC-UI` §6 的"140ms"）。

---

## 四、新页面要不要各自的反馈动效

**结论：不新增类别，不新增页面级动效。** 三个新页面全部落在已有的三条规则里；真正缺的不是动效，是一处**状态语义**。

| 页面 | 现有反馈 | 判断 | 要做的 |
|---|---|---|---|
| `/recycle` 恢复中 | `busy` state → `disabled` + 文案"恢复中…"（`:138-141`、`:193-196`） | 反馈已经存在，只是视觉弱 | 加 `aria-busy`（§3.2b）；`restoreMedia.variables` 可直接替换 `busy` state，顺手删掉 `useState` |
| `/music` 收藏 | 只有 toast（`SongDetailView.tsx:28-38`），按钮本身没有任何状态 | **这才是真问题**：收藏是 on/off 状态，不是一次性事件 | 加 `aria-pressed={...}` + 文案「已收藏/收藏」；样式 `color: var(--c-yellow)`，`.btn` 已有 `color` transition，自动 140ms。**不需要新的动效规则** |
| `/users` | 封禁/解封走 `confirmDialog` + toast（`UserDetailView.tsx:43 / :60`），页头按钮文案随之改变 | 已足够 | 无。按钮文案切换本来就有 `.btn` 的颜色过渡，不需要额外处理 |

三条理由，说明为什么不该给它们加"专属动效"：

1. **动效按"变化类型"定义，不按"页面"定义。** 一旦为某页开特例，下个页面就会问"我这页要不要也来一段"。现在 §5 的规则集是"进入 / 退出 / 状态变化"三类，覆盖全部场景。
2. **/users 与 /recycle 的操作都不可逆或需要二次确认**，用户的注意力在"这一步对吗"，不在"动画顺不顺"。多加一层反而是噪音。
3. **/music 收藏**缺的是状态显示，套一个动效只会让"我现在到底收没收藏"更难判断——这是用动画掩盖信息缺失，正是本次审查要避免的。

---

## 五、CSS 草案

落点：§5.0 进 `tokens.css`（1 行）；其余进 `components.css`，放在文件末尾新增的「动效」区，或就近各自组件。全部复用现有的 `--ease`，不新增第四个缓动。

### 5.0 tokens.css：收拢两档裸值

```css
/* 新增：进入类动效统一一档，替代 page-in 的 180 / modal-in 的 160 */
--t-enter: 160ms;
```

### 5.1 补完 Modal（上轮 #2 的另一半）

```css
/* 遮罩此前完全无动画，66% 黑 + blur(6px) 一帧糊上来，比面板的缓入更抢眼。
   遮罩用最短一档：它面积最大，淡得越久越像掉帧。 */
.modal-overlay {
  animation: overlay-in var(--t-fast) var(--ease);
}

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* 面板时长并入统一令牌（180→160，观感无变化） */
.page-body {
  animation: page-in var(--t-enter) var(--ease);
}

.modal,
.confirm {
  animation: modal-in var(--t-enter) var(--ease);
}
```

### 5.2 加载 → 内容切换（上轮 #1）

```css
/* 骨架换成内容那一刻，新挂载的容器淡入。
   复用 page-in 的关键帧——两者都是纯 opacity。
   注意：将来若 page-in 改成含位移，要给这里单独一支 keyframes。 */
.content-in {
  animation: page-in var(--t-enter) var(--ease);
}
```

### 5.3 行内写操作反馈（上轮 #3）

```css
/* (a) 状态徽标原地换色：节点不重建，只换 class，transition 自动接上。
       覆盖认领求片 / 发货 / 上下架 / 封禁四处。 */
.badge {
  transition: color var(--t-fast) var(--ease);
}

/* (b) 进行中。必须写在 .btn:disabled 之后（同权重，靠源码顺序决胜）。
       延迟 120ms：接口 200ms 内返回时根本不显示，避免闪一下。 */
.btn[aria-busy='true'] {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity var(--t-fast) var(--ease) 120ms;
}
```

配套（改的是已有声明，不是新增）：把 `opacity` 追加进 `.btn` 的基础 transition 列表，让 busy 结束时有 140ms 的恢复而不是硬切：

```css
.btn {
  transition: background var(--t-fast) var(--ease),
    border-color var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease),
    opacity var(--t-fast) var(--ease);   /* ← 新增这一项 */
}
```

### 5.4 toast 出场（上轮 #4）

```css
/* 入场从 220ms 收到 140ms：toast 只活 2.6s，进出同速才利落，
   同时对齐 SPEC-UI §6 的「140ms」。 */
.toast {
  animation: toast-in var(--t-fast) var(--ease);
}

.toast.is-leaving {
  animation: toast-out var(--t-fast) var(--ease) forwards;
}

@keyframes toast-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(4px); }
}
```

### 5.5 侧栏账号菜单（上轮 #6）

```css
.rail__menu {
  transform-origin: bottom left;
  animation: menu-in var(--t-fast) var(--ease);
}

@keyframes menu-in {
  from { opacity: 0; transform: translateY(4px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}

/* 展开指示：aria-expanded 已在 Sidebar.tsx:153 绑好，不用改 TSX */
.rail__account-caret {
  transition: transform var(--t-fast) var(--ease);
}
.rail__account[aria-expanded='true'] .rail__account-caret {
  transform: rotate(180deg);
}
```

### 5.6 可选：返回时恢复滚动位置

```tsx
// AdminLayout.tsx —— 替换现有的 scrollTo(0)
const location = useRouterState({ select: (s) => s.location })
const scrollMemo = useRef(new Map<string, number>())

useEffect(() => {
  const el = pageRef.current
  if (!el) return
  const key = location.pathname + location.searchStr
  el.scrollTop = scrollMemo.current.get(key) ?? 0
  return () => {
    scrollMemo.current.set(key, el.scrollTop)
  }
}, [location.pathname, location.searchStr])
```

---

## 六、验收清单

改完读代码即可确认，不需要开浏览器：

- [ ] `.modal-overlay` 有 `animation`，且时长是 `var(--t-fast)`（遮罩比面板快）
- [ ] `grep -rn "180ms" src/` 为 0；`160ms` 只出现在 `tokens.css` 的 `--t-enter` 处，`components.css` 里全部是 `var(--t-enter)`
- [ ] 11 处 `table-card` 都带 `content-in`；Tab 切换时表格节点不重建（不重放动画）
- [ ] `.badge` 有 `transition: color`；四个状态翻转场景肉眼可见黄→蓝的过渡
- [ ] `.btn[aria-busy]` 规则出现在 `.btn:disabled` **之后**
- [ ] `SeekView` 的 `disabled` 不再依赖全局 `claim.isPending`，只锁被点的那一行
- [ ] `toast.tsx` 的 `onAnimationEnd` 有 `item.leaving` 守卫（否则入场结束就消失）
- [ ] `grep -n "is-leaving" src/` 有命中——这是上轮漏掉那条的唯一凭证
- [ ] 新增的 `animation` / `transition` 只涉及 `opacity` / `transform` / `color`
- [ ] `.page-body` 仍然只有 `opacity` 动画，没有 `transform`（sticky 与 fixed 后代的安全前提）
- [ ] `prefers-reduced-motion` 块仍在，且第一条选择器是 `*, *::before, *::after`
