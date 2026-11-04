# 动效设计审查

审查对象：`src/styles/{tokens,base,components}.css` + `src/components/*` + `src/views/*`
审查方式：只读源码与构建产物（`dist/assets/index-*.css`），未启动浏览器。
定位：每天开 8 小时的后台。动效只回答"发生了什么变化"，不负责好看。

---

## 结论：加 6 条、不加 5 条

| # | 加 | 收益来源 | 实现 |
|---|---|---|---|
| 1 | 加载 → 内容的切换 | 每天几十次；消除骨架与表格之间的硬切 | 纯 CSS |
| 2 | Modal / Confirm 出现 | 每天十几次；决策点，确认"这是新的一层，我只对这一件事负责" | 纯 CSS |
| 3 | 行内写操作反馈 | 每天若干次；现在只能靠右下角 toast 猜"改的是哪一行" | CSS + 少量 JS |
| 4 | toast 出场 | 84 处调用共用这一个出口，现在只进不出 | CSS + 少量 JS |
| 5 | 路由切换 | 每天上百次点击侧栏；同时解决"新页沿用旧滚动位置"这个更严重的问题 | CSS + 1 行 JS |
| 6 | 侧栏账号菜单 | 低频；浮层从按钮上沿突然出现会被误读成渲染错误 | 纯 CSS |

| # | 不加 | 理由一句话 |
|---|---|---|
| 1 | 列表逐行错峰淡入 | 20 行 × 24ms 的延迟，每次分页都要多等半秒，且抹掉了"哪些行是新的" |
| 2 | 卡片 hover 位移 / 缩放 / 阴影加深 | 违反"hover 只改颜色"的既有约束；密集网格里位移会读成错位 |
| 3 | 数字滚动（count-up） | 滚动中的数字不可读、不可抄；用户来核对，不是来看表演 |
| 4 | 图表补间 / 描线 | 概览是 div 百分比条 + 30 秒轮询，补间会让数据每 30 秒抖一次 |
| 5 | 页面级大位移 / 侧栏滑入 / 共享元素转场 | 成本最高、收益最"炫"；且和外层滚动容器 `.page` 天然打架 |

排序依据：**出现频率 × 缺失时造成的困惑**。不是"哪里空就往哪里加"。

---

## 零、先修三处前提（否则下面都是空谈）

这三处是现状事实，不改的话，加动效等于在坏地基上装修。

### 0.1 `prefers-reduced-motion` 现在是死代码（严重）

[base.css](../src/styles/base.css) 第 68–74 行：

```css
@media (prefers-reduced-motion: reduce) {
    animation-duration: 0.001ms !important;
    ...
  }
}
```

`@media` 里面**没有选择器**——声明不能直接挂在 `@media` 下。浏览器把整块判为无效丢弃，末尾还多一个 `}`。
构建产物 `dist/assets/index-*.css` 里原样保留了这个块，说明它是发到线上的无效 CSS。

结论：**当前没有任何一条动效尊重降级偏好**。"已在 base.css 全局处理"这个前提不成立，必须先修（修正版见第五节 ①）。修好之后，`.toast` 的入场和 `.skeleton` 的 shimmer 才会真正对这类用户停下。

### 0.2 路由切换没有复位滚动位置

`.page` 是滚动容器（`overflow-y: auto`），而它挂在 `AdminLayout` 上、跨路由存活；全仓库没有任何 `scrollTo` / `scrollTop` 调用。结果：从滚到一半的列表点进详情，新页从旧的滚动偏移开始——看起来像「页面没换」。这比"缺一个淡入"严重得多，是第 5 条的前置条件。

### 0.3 `.progress-line > i` 在过渡 `width`

[components.css](../src/styles/components.css) 第 920–926 行用 `transition: width`。上传进度每 8MB 分片更新一次，每次改 `width` 都要重排该行，在 20 行的表格里是可见的掉帧。改 `transform: scaleX()`（第五节 ⑦）。

---

## 一、该加的 6 条

### 1. 加载 → 内容的切换

- **触发**：`isLoading` 由 `true` 变 `false`，`LoadingBlock` 卸载、`table-card` 挂载。覆盖首屏、Tab 切换、筛选、分页——同一个代码路径，所以第 1 条把"分页切换"也一起吃掉了，不单列。
- **动效**：内容层 `opacity: 0 → 1`。骨架层**不做**出场动画，直接移除。不做位移：表格行高 44px，位移期间粘性表头会和表体错开一帧。
- **时长与缓动**：`var(--t-fast)` 140ms，`var(--ease)`。
- **落点**：`components.css` 新增一个工具类（`.enter-fade`），挂到各视图的内容容器上（`LibraryView` / `SeekView` / `MusicView` / `LiveView` / `OrdersView` 等）。不需要动 `StateBlock`。
- **为什么值得做**：现状是同一帧内硬切——骨架消失、表格出现，中间没有任何"数据到了"的信号。这条动效不解释新信息，它解释的是**节奏**：这一屏换了内容，但结构没变。这是全站唯一值得"每屏都挂"的动效，也是其余几条的语法基础。

### 2. Modal / Confirm 出现

- **触发**：`Modal` 与 `ConfirmHost` 挂载（`src/components/Modal.tsx`、`src/ui/confirm.tsx`）。
- **动效**：遮罩 `opacity: 0 → 1`（140ms）；面板 `opacity: 0 → 1` + `translateY(6px) → 0`（220ms）。**关闭不做退场**，立即消失。
- **时长与缓动**：遮罩 `var(--t-fast)`，面板 `var(--t-base)`，都用 `var(--ease)`。进慢出快——"出现要交代，消失要利落"。
- **落点**：`components.css` 的 `.modal-overlay`、`.modal`、`.confirm`。
- **为什么值得做**：遮罩带 `backdrop-filter: blur(6px)`，瞬现等于整屏糊一下，视觉冲击大于它该有的分量。面板的 6px 上浮说明"这层是从上面落到你面前的"，配合遮罩的暗化，用户不用读标题就知道自己进了一个需要决策的状态——这是防误触，不是装饰。
- **两个细节**：① 不要动画 `backdrop-filter` 的模糊半径，只淡 opacity；如果低端机实测掉帧，就把遮罩改成瞬现、只留面板。② `.confirm` 的确认按钮是 `autoFocus`，焦点环在动画期间出现是正常的，不要为它加额外过渡。

### 3. 行内写操作反馈

- **触发**：行级写操作（求片的认领/催片、线路的启用、片单的移除等），`mutation` 开始与落地。
- **动效**：① 进行中——按钮 `opacity: 0.55` + 锁指针，**延迟 120ms 生效**（接口常在 200ms 内返回，不延迟会闪一下）；② 落地——该行状态徽标做一次 `opacity` 回落（1 → 0.45 → 1，240ms），不铺底色、不位移。
- **时长与缓动**：按钮 `var(--t-fast)`；徽标一次性 240ms，`var(--ease)`。
- **落点**：`components.css` 的 `.btn[aria-busy]` 与 `.badge[data-settling]`；视图里加一个 `pendingId` / `settledId` state（每个视图约 6 行）。
- **为什么值得做**：现在写操作只有两个信号：右下角 2.6 秒后消失的 toast，和 `invalidate` 之后表格自己刷新。在 1680px 宽、20 行的表里，**"我改的是哪一行"这个问题没有答案**。徽标沉一下的 240ms 就是在回答它，而且信息只落在那一行上，不制造新表面。

### 4. toast 出场

- **触发**：`DURATION` 到期（`src/ui/toast.tsx`）。
- **动效**：入场保持现状（`translateY(6px)` + 淡入，220ms）；新增出场 `opacity: 1 → 0` + `translateY(4px)`，140ms，然后才从 `items` 里移除。
- **时长与缓动**：出场 `var(--t-fast)`，`var(--ease)`。
- **落点**：`components.css` 的 `.toast.is-leaving`；`toast.tsx` 加 `leaving` 标记 + `onAnimationEnd` 移除。
- **为什么值得做**：已有入场没有出场，等于"消息凭空蒸发"。5 条同时存在时（`MAX = 5`），逐条消失会让堆叠每次跳一次；有 140ms 的淡出，用户至少能看清是哪一条到期了。这是 84 处调用共用的唯一出口，值得把它补完整。
- **已知取舍**：第 N 条移除后，其余 toast 的网格重排仍会跳一次（`display: grid; gap: 8px`）。为这个跳变保留占位不值得，接受它。

### 5. 路由切换

- **触发**：`pathname` 变化（`AdminLayout` 里取 `useRouterState`）。**只在路径变化时触发**，不放 Tab / 分页 / 筛选（那些只改 search，不换页，不该淡入）。
- **动效**：`.page` 内容 `opacity: 0 → 1`，140ms。**不做位移**：`.page` 内部有 `position: sticky` 的表头，给滚动容器加 `transform` 会让粘性表头在动画期间错位。
- **实现**：`<main className="page" key={pathname}>`。`key` 变化重挂载滚动容器，顺带把 0.2 的滚动位置问题一次解决（滚动回顶部 + 动画重播），一行 JS。
- **落点**：`src/layouts/AdminLayout.tsx`（1 行）、`components.css`（复用 `.enter-fade` 的 keyframes）。
- **为什么值得做**：侧栏固定在左，只有右侧内容区域在换。硬切时，最外层的页面标题（44px 的 `page-title`）和下面的表结构都换了位置，眼睛需要一次重新对焦；140ms 的淡入给出"这是一次替换"的边界。**但顺序是：先修滚动复位，再考虑加淡入**——如果只能做一件，做滚动复位。

### 6. 侧栏账号菜单

- **触发**：`.rail__account` 点击，`rail__menu` 挂载（`src/components/Sidebar.tsx`）。
- **动效**：`opacity: 0 → 1` + `translateY(4px) → 0`，`transform-origin: bottom left`。
- **时长与缓动**：`var(--t-fast)`，`var(--ease)`。
- **落点**：`components.css` 的 `.rail__menu`。
- **为什么值得做**：菜单挂在上方（`bottom: calc(100% + 6px)`），从按钮上沿往外"长"才符合它的空间来源。瞬现的浮层在暗色界面里尤其像一次渲染错误——它没有边界阴影铺垫，直接盖在侧栏上。这条成本最低，收益也最小，排在最后。

---

## 二、不该加的 5 条

### 1. 列表逐行错峰淡入（stagger）

`delay: index * 24ms` 是模板化的"高级感"配方，代价在这里很明确：20 行 × 24ms = 最后一行的入场被推迟近 500ms，而**分页、筛选、Tab 每次都会重播**——一天几十次，每次多等半秒，收益为零。更糟的是它抹掉了信息：所有行一起淡入，用户无法判断"哪些行是新的"。需要表达"新数据"时，用第 3 条的行级反馈，只标受影响的那些行。

### 2. 每张卡片 hover 位移 / 缩放 / 阴影加深

`docs/LEARNINGS.md` 已经写明"hover 不改变表面亮度，只改变前景对比度"。卡片位移是在此之上再加一层噪音：`cards` 是 `repeat(3, 1fr)` 的密集网格，`translateY(-2px)` 会让相邻卡片的间隙在视觉上忽宽忽窄，读成"错位"而不是"抬起"。而这张卡片在 8 小时里会被划过几千次，每一次都是一次无意义的位移。现状 `.card` 压根没有 hover 过渡——**保持现状就是正确答案**，不要因为开始加动效就顺手补上。

### 3. 数字滚动（count-up）

`stat__value` 是 44px 的核对型数字（片库总量、胡萝卜、求片数）。数字在滚动过程中不可读，用户没法在动画中途抄下来；快速切页时还会出现"数字在跳，不知道停在哪"。要做到位还得处理"刷新前后同值不滚""首屏是否滚"这些分支——为一个纯装饰效果引入状态机，性价比是负的。

### 4. 图表补间 / 描线动画

目前的"图表"是两条 div 百分比条（`OverviewView` 第 95–120 行），不是 SVG 路径，没有可描的线。加补间意味着每次数据变化都要把宽度动画一遍，而概览的 `playing` 每 30 秒轮询一次——用户会看到数据条每 30 秒自己抖一下。数据可视化在这里的价值是**可比较**，不是"活起来"。真要做图表，先换 SVG，再谈动效。

### 5. 页面级大位移 / 侧栏滑入滑出 / 共享元素转场

侧栏宽度在三个断点间切换（`--rail-w` / `--rail-w-compact` / `--rail-w-icon`），动画 `grid-template-columns` 是全站最贵的一次布局；共享元素转场需要 FLIP 或 View Transition API，得在 `.page` 这个滚动容器里做测量，和 0.2 的滚动复位直接冲突。这三样的共同点是：**演示效果极好，日常使用极烦**。收起侧栏这类操作应该瞬时完成——它是工具操作，不是叙事。

---

## 三、实现方式建议

**默认纯 CSS。** 只有"元素何时卸载"这件事 CSS 管不了，才写 JS。

| 条目 | 纯 CSS | 需要的 JS（最小） |
|---|---|---|
| 1 加载→内容 | ✅ 一个类名 | 无（视图里加 `className`） |
| 2 Modal/Confirm | ✅ 挂载即播放，无需退场 | 无 |
| 3 行内反馈 | 样式部分 ✅ | 每个视图 2 个 state（`pendingId` / `settledId`），≈6 行 |
| 4 toast 出场 | 样式部分 ✅ | `leaving` 标记 + `onAnimationEnd`，≈10 行 |
| 5 路由切换 | ✅ 复用 keyframes | `useRouterState` 取 `pathname` 当 `key`，1 行 |
| 6 账号菜单 | ✅ | 无 |

合计新增 JS ≈ 20 行，分布在 3 个文件，**不引入任何动画库**。理由：这 6 条全是"出现/消失"，没有一条需要编排（sequence）、打断（interrupt）或路径插值——那些才是 GSAP / Motion 的领域。用库来做一个 140ms 的 opacity 是纯负债。

**三个实现约定：**

1. **不新增令牌。** 全部用现成的 `--t-fast` / `--t-base` / `--ease`。加第三档时长只会让人纠结用哪档。
2. **退场不换缓动。** 出场也用 `--ease`（强 ease-out），不要换成 ease-in——ease-in 的起步几乎不动，读起来像卡住而不是"利落"。
3. **先修 0.1 再加动效。** 修正后的全局降级会把所有时长压到 0.001ms，`onAnimationEnd` 依然会触发（时长非 0），所以第 4 条的 JS 不需要为降级写分支。**不要**在 JS 里再检测一次 `matchMedia('(prefers-reduced-motion)')`，那是同一件事做两遍。

---

## 四、性能

### 可安全动画

| 属性 | 说明 |
|---|---|
| `opacity` | 合成层，不触发布局/绘制。本方案的主力 |
| `transform`（translate/scale/rotate） | 合成层，不触发布局。`scaleX` 是 `width` 的替代 |
| `color` / `background-color` / `border-color` | 重绘该元素，面积小，安全；也是 hover 唯一该用的属性 |
| `filter` | 可用但贵。大面积 blur 只在遮罩上静态使用，**不要动画半径** |

### 禁止动画

`width` / `height` / `padding` / `margin` / `top` / `left` / `font-size` / `box-shadow` / `grid-template-columns`。全部触发布局或大面积重绘。`max-height` 折叠展开同理——没有 `auto`，只能靠猜一个魔数。

### 三条本仓库特有的坑

1. **粘性表头**：`.table thead th { position: sticky; top: 0 }` 依赖最近的滚动祖先 `.page`。给 `.table-card` 或任何内容包裹层加 `transform` / `filter` / `backdrop-filter` / `will-change: transform`，会让 sticky 失效或错位。**所有列表区域一律只用 `opacity`**，这也是第 1、5 条坚持"只淡不移"的原因。
2. **`.skeleton` 在动画 `background-position`**：`shimmer` 每帧重绘每个骨架块。默认 `LoadingBlock rows=8 columns=5` 是 49 个元素同时跑。目前能接受，但要知道这是加载态唯一的重绘热点。真要优化：在容器上盖一层渐变遮罩做 `translateX`，把 49 个动画压成 1 个合成层——代价是视觉参数要重调，暂时不必。
3. **`.progress-line`**：见 0.3，`width` → `scaleX`。上传是长任务，用户会盯着看，这里的掉帧最容易被感知。

### 虚拟滚动

现在没有虚拟滚动（`is_virtual` 是 API 字段，与渲染无关）。将来加的时候：

- **不要给行加入场动画**。虚拟列表的行 DOM 是复用回收的，滚动过程中会反复触发 `animation`，等于每滚一屏整屏闪一次。入场动画只能是**容器级、一次性**的（第 1、5 条正好是这个形态）。
- **行内反馈用 `class` + `transition`，不要用 `animation`**。`transition` 只在该行的 class 变化时生效，不随复用重播；`animation` 会在节点被复用挂载时重播。第 3 条因此选了 `animation` 但加了 `data-settling` 由 JS 主动开关——如果上了虚拟滚动，这一条要改成 `transition`。
- **不要用 `will-change`**。通行数千个复用节点，`will-change: transform` 会把它们全部提升为合成层，内存直接吃满。要省渲染用 `content-visibility: auto`。
- **占位高度不要过渡**。滚动中改行高会打断滚动锚定（scroll anchoring），表现是列表在你手指下跳。

---

## 五、CSS 草案

落点：① 进 `base.css`；②–⑦ 进 `components.css`，就近各自组件。**不新增令牌，不新增文件。**

```css
/* ────────────────────────────────────────────────────────────────
   ① base.css —— 修掉当前无效的降级块
   现状：@media 内没有选择器，整块被浏览器丢弃（dist 里也原样保留了）
   ──────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

/* ────────────────────────────────────────────────────────────────
   ② 内容淡入 —— 第 1 条（骨架→内容、筛选/分页/Tab）与第 5 条（路由）共用
   只淡不移：位移会让粘性表头在动画期间与表体错开
   用法：<div className="table-card enter-fade">
        <main className="page enter-fade" key={pathname}>
   ──────────────────────────────────────────────────────────────── */
.enter-fade {
  animation: enter-fade var(--t-fast) var(--ease) both;
}

@keyframes enter-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ────────────────────────────────────────────────────────────────
   ③ Modal / Confirm —— 第 2 条
   关闭不做退场：Esc / 点遮罩应当立刻结束，等待会让人以为没点上
   遮罩带 backdrop-filter，只淡 opacity，不动模糊半径
   ──────────────────────────────────────────────────────────────── */
.modal-overlay {
  animation: overlay-in var(--t-fast) var(--ease) both;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal,
.confirm {
  animation: panel-in var(--t-base) var(--ease) both;
}

@keyframes panel-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}

/* ────────────────────────────────────────────────────────────────
   ④ 行内写操作 —— 第 3 条
   进行中：延迟 120ms 再生效，接口 200ms 内返回时根本不显示，避免闪
           延迟只写在 busy 态上，恢复时走基础 transition（0 延迟）
   落地后：徽标只回落一次透明度，不铺底色、不位移
   ──────────────────────────────────────────────────────────────── */
.btn[aria-busy='true'] {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity var(--t-fast) var(--ease) 120ms;
}

.badge[data-settling] {
  animation: badge-settle var(--t-base) var(--ease) 1;
}

@keyframes badge-settle {
  0%, 100% { opacity: 1; }
  38%      { opacity: 0.45; }
}

/* ────────────────────────────────────────────────────────────────
   ⑤ toast 出场 —— 第 4 条（入场 toast-in 保持原样，translateY(6px) 淡入不动）
   移出 items 的时机由 JS 在 animationend 里做，见下方最小实现
   ──────────────────────────────────────────────────────────────── */
.toast.is-leaving {
  animation: toast-out var(--t-fast) var(--ease) forwards;
}

@keyframes toast-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(4px); }
}

/* ────────────────────────────────────────────────────────────────
   ⑥ 侧栏账号菜单 —— 第 6 条
   菜单在按钮上方（bottom: calc(100% + 6px)），从下沿往上长
   ──────────────────────────────────────────────────────────────── */
.rail__menu {
  transform-origin: bottom left;
  animation: menu-in var(--t-fast) var(--ease) both;
}

@keyframes menu-in {
  from { opacity: 0; transform: translateY(4px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}

/* ────────────────────────────────────────────────────────────────
   ⑦ 上传进度 —— 替换 0.3 的 transition: width
   JSX 侧同步改成 style={{ transform: `scaleX(${progress})` }}
   ──────────────────────────────────────────────────────────────── */
.progress-line > i {
  transform-origin: left center;
  transition: transform var(--t-base) linear;
}
```

### 配套的最小 JS（两处）

```tsx
// src/ui/toast.tsx —— 第 4 条：到期先标记，动画结束后再移除
// ToastItem 增加 leaving?: boolean
const dismiss = (id: number) =>
  setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))

<div
  className={`toast toast--${item.type}${item.leaving ? ' is-leaving' : ''}`}
  onAnimationEnd={() => {
    if (item.leaving) setItems((prev) => prev.filter((t) => t.id !== item.id))
  }}
>
```

```tsx
// src/layouts/AdminLayout.tsx —— 第 5 条：key 换 = 滚动回顶 + 动画重播
const pathname = useRouterState({ select: (s) => s.pathname })
<main className="page enter-fade" key={pathname}>
```

---

## 六、验收清单

不需要跑浏览器，改完读代码即可确认：

- [ ] `base.css` 的 `@media (prefers-reduced-motion)` 里出现了 `*, *::before, *::after`
- [ ] 修正后重新构建，`dist/assets/index-*.css` 中该块带选择器
- [ ] 新增的 `animation` / `transition` 只涉及 `opacity` / `transform` / `color`
- [ ] 没有任何规则给 `.table-card`、`.page` 的子孙加 `transform` / `filter` / `will-change`
- [ ] `.page` 的 `key={pathname}` 只随 path 变化，Tab / 分页（search 变化）不触发淡入
- [ ] 全部时长取自 `var(--t-fast)` / `var(--t-base)`，没有新增裸数值（`.skeleton` 的 1.4s 除外，它是环境噪声，不套交互令牌）
- [ ] 全站无 `transition: width|height|top|left|box-shadow`
