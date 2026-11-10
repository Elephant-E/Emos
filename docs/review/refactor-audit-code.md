# 代码质量审查 · 垃圾代码 / 补丁式写法 / 重复逻辑 / 死代码

- **仓库**：`emos.club`（React 18 + TS + TanStack Router/Query）
- **范围**：今晚 94 个提交，`git diff e2e5899^..HEAD -- src/`，42 个文件，+3002 / −561
- **方式**：只读审查。脚本扫描（导出引用、CSS 类/CSS 变量引用、endpoint 调用点）+ 逐文件读 diff。未改 `src/`。
- **类型基线**：`npx tsc --noEmit` 通过（`noUnusedLocals` / `noUnusedParameters` 已开），所以**没有**未使用的 import、局部变量、未用参数——这一层是干净的，下面的死代码都是 tsc 抓不到的（导出、props、CSS、endpoint、分支）。
- **标注**：【今晚】= 本批改动引入；【既有】= 之前就在，本次顺带发现。

---

## 0. 一句话结论

今晚这批改动的功能正确性整体是好的（类型全绿、缓存失效补得比之前全），主要问题集中在三类：

1. **"让症状消失"的补丁**：静默 catch 后继续用半份数据、`data-fallback` 属性写了但没有 CSS 消费、`.tag-input` 类名早就不存在、`{true ? (` 残留、假防抖。
2. **同一件事写 2–10 遍**：350ms 防抖 10 处、"是不是我的资源" 4 种判定、删除要理由 3 份复制、`as Error & { status?: number }` 30 处。
3. **改了一半的清理**：`mediaApi.list` 改成数组了但 `useMediaList` 还在嗅探 `items/data/medias`；`PageHeader` 加了 `mark` 却在同一晚把调用点删了，留下 prop + 无 CSS 的 class；两个"清空片单"mutation 建好了没人调。

---

## 1. 必须重构

### M1. `{true ? (` 残留的调试条件【今晚】

**位置**：`src/views/ShopView.tsx:208`（对应收尾 `:391`）

**问题**：整块商品区被包在 `{true ? (<>…</>) : null}` 里。这是调试/临时关掉某块 UI 的残留，`:else null` 永远不会走，读代码的人会以为存在开关。

**改法**：删掉这层三元，直接保留 `<>…</>` 里的内容（或直接写成 `<div className="toolbar">` 起头）。

**影响面**：只影响 `ShopView` 一处渲染，无外部引用。改完跑一遍 `pnpm dev` 看商城页/我的店铺两个视角即可。

---

### M2. 移动弹窗的"防抖"其实没防抖，且不清理定时器【今晚】

**位置**：`src/views/VideoDetailView.tsx:575-589`

```tsx
onChange={(e) => {
  setMoveTerm(e.target.value)
  const next = e.target.value.trim()
  setTimeout(() => setMoveKeyword(next), 300)   // ← 没有 clearTimeout
  if (!next) setMoveVideo(null)
}}
```

**问题**：每敲一个字符都排一个 300ms 后的定时器，而不是"最后一次输入后 300ms"。输入 6 个字符 → 6 个定时器依次触发 → 最多 6 个 `/api/video/list` 请求（每个不同的 `title` 都是新 queryKey，React Query 不会合并）。组件卸载后定时器仍会 `setState`。

**改法**：跟项目里其余 9 处一样用 `useEffect + debounce`（见 M12），或直接复用抽出来的 `useDebouncedValue(moveTerm, 300)`。

**影响面**：只影响移动资源弹窗的影片搜索。注意 `moveKeyword` 还被 `!moveKeyword && …` 用来切换"搜索列表 / 季集列表"两种布局，改完要保持这个切换语义。

---

### M3. 弹窗关了/视图不用，请求照样发：`enabled` 参数加了却没人用【今晚】

**位置**：
- `src/views/VideoDetailView.tsx:94` — `const moveSearch = useVideoPage({ page: 1, page_size: 6, title: moveKeyword || undefined })`
- `src/views/ShopView.tsx:78` — `const browse = useShopProductsInfinite({ sellerId: 0, name: q, sortBy: sort, onlyUp: true })`
- `src/api/queries.ts:175-191`（`useVideoPage` 有 `enabled` 参数）、`src/api/queries.ts:503-529`（`useShopProductsInfinite` 没有 `enabled`）

**问题**：两个 hook 都在**视图挂载时**就发请求，而它们服务的是"打开发送/浏览时才需要"的数据：
- 每打开一个影片详情页，都会额外拉一次 `/api/video/list?page_size=6`（`moveKeyword` 为空时也拉），只为了给一个还没打开的弹窗填候选；
- 商城页在 `scope === 'mine'`（我的店铺）时，仍然会把全站商品第一页拉回来（`browseItems` 根本不渲染）。

对比 `src/views/OrdersView.tsx:46-58` 的注释——那里刚刚按"两个视角只挂自己那条"修过同类问题，说明这不是设计取向，而是漏改。`useVideoPage` 的 `enabled` 参数就是为这种情况加的，但**全项目没有一个调用点传它**（见 D7）。

**改法**：
```ts
const moveSearch = useVideoPage({ ..., enabled: moving !== null && moveKeyword.length > 0 })
// useShopProductsInfinite 增加 enabled，ShopView 传 enabled: !mine
```
`moving` / `mine` 都是现成的 state。

**影响面**：
- `useShopProductsInfinite` 加参数 → 影响 `ShopView`、`SellerView` 两处调用（`SellerView` 传 `true` 或省略）。
- `useVideoPage` 加 `enabled` 传参 → 只影响 `VideoDetailView`。
- 改完不需要动缓存键（`enabled:false` 的 query 仍在 cache 里，切回来直接命中）。

---

### M4. 取回一份用不上的详情 + 静默 catch，配合默认值有数据风险【今晚 + 既有】

**位置**：
- `src/views/ShopView.tsx:344-353`（今晚新增的取详情）
- `src/views/ShopView.tsx:110-132`（`saveProduct` 的默认值，既有）
- `src/views/ShopView.tsx:253`（新建商品的默认值 `{ stock: 100, price_origin: 100, price: 1, sort: 80 }`）

**问题**：
1. 编辑商品时先 `setEditing(product)`，再 `shopApi.product(id)` 补全后 `setEditing(prev => ({...prev, ...full}))`。但编辑表单只渲染 `name / cover_url / price / price_origin / stock / sort / category_id / is_up`（`:539-587`），这些字段**列表行（`ShopProduct`）里全都有**；`full` 里多出来的 `description / exchange_way / seller` 表单不渲染、`saveProduct` 也不提交。→ 这次请求 + merge 完全是空转。
2. `catch {}` 静默吞掉失败，注释写"至少能改名称价格"——但 `saveProduct` 会把缺失字段补成 `price: 1 / stock: 0 / is_up: false`。一旦详情取不到，用户只改个名字点保存，就会把商品**下架、库存清零、价格改成 1**。

**改法**：
- 删掉 `:344-353` 的取详情（表单用到的字段列表行都有）；若将来要编辑描述，就把 `description / exchange_way` 真正加进表单和 payload。
- `saveProduct` 不要用 `?? 1 / ?? 0 / ?? false` 兜底：编辑态直接用 `editing` 上的真实值（它来自行数据，类型上就不该是 undefined），新建态才给默认值，且默认值不要替用户决定"上架/价格"。

**影响面**：只影响 `ShopView` 的商品编辑 + 新增弹窗。`ProductDetailModal`（`src/components/ProductModals.tsx:11-121`）**仍然需要** `useShopProduct`，别一起删。

---

### M5. `data-fallback` 写了三遍，但没有任何 CSS 消费它；`Poster` 早就实现了同一件事【今晚】

**位置**：
- `src/components/ProductTile.tsx:36-40`
- `src/components/ProductModals.tsx:38-42`（详情弹窗）
- `src/components/ProductModals.tsx:164-168`（购买弹窗）

```tsx
onError={(e) => {
  e.currentTarget.style.display = 'none'
  e.currentTarget.parentElement?.setAttribute('data-fallback', product.name.slice(0, 1))
}}
```

**问题**：`data-fallback` 在 `src/styles/*.css` 里**没有任何规则**（`grep -rn data-fallback src/styles` 为空）。所以图片挂了以后：图片被隐藏、属性写上去、什么也不显示——就是一块空白。想做的"退化成首字方块"从未生效过。
而 `src/components/Poster.tsx:7-22` 已经用 `useState(failed)` 正确实现了这个能力（海报/封面在用）。

**改法**：三处都换成 `<Poster src={...} name={...} className="..." />`；如果方形封面槽需要不同尺寸，给 `Poster` 传 `className`（它已经支持）而不是复制一套 onError。

**影响面**：只涉及三个商品图位置。`Poster` 的失败态是 `<span className="thumb">`，`product-tile__cover` 是 flex 居中、字号 30px 的容器，视觉上能接住；商品详情里 160px 宽的槽需要把 `thumb` 撑满，建议给 `Poster` 加一个可选的 `fallbackClassName`，避免再改 `.thumb` 全局样式。

---

### M6. `as Error & { status?: number }` 复制 30 份，本质是 `ErrorBlock` 的 prop 类型写窄了【既有，今晚新增 12 处】

**位置**：全项目 30 处，例：
`src/views/OverviewView.tsx:139,230,284`、`src/views/ShopView.tsx:166,262,271`、`src/views/SellerView.tsx:52,94`、`src/views/WatchlistDetailView.tsx:118,188,624`、`src/views/UserDetailView.tsx:74`、`src/views/LibraryView.tsx:106`、`src/views/OrdersView.tsx:109`、`src/views/LinesView.tsx:67`、`src/views/PayView.tsx:80`、`src/views/RecycleView.tsx:125`、`src/views/WatchlistsView.tsx:117`、`src/views/FundView.tsx:208`、`src/views/UploadView.tsx:284`

**问题**：`src/components/StateBlock.tsx:40` 把 prop 定成 `error: Error & { status?: number }`，而 React Query 给的 `error` 是 `Error | null`，于是每个调用点都要硬转一次。30 份同样的断言 = 30 个可以写错的地方，也说明类型边界没划对。

**改法**：把 `ErrorBlockProps.error` 放宽为 `{ message?: string; status?: number } | null`（内部只用到 `error.status` 和 `error.message`），或者干脆 `error: unknown` 在组件里窄化。改完删掉全部 30 个 cast。

**影响面**：改 `StateBlock.tsx` 一个 interface → 30 个调用点可以删 cast，但**不删也能编译**（放宽类型是兼容的）。可以分两步：先放宽类型，后用 codemod/正则清 `as Error & { status?: number }`。

---

### M7. `useMediaList` 的"形状嗅探"是上一版补丁，现在已经全是死分支，还把整条链路拖成 `Record<string, unknown>`【今晚】

**位置**：`src/api/queries.ts:327-340`；上游 `src/api/endpoints.ts:121-123`（今晚已改成 `request<VideoMedia[]>`）

```ts
const res = (await mediaApi.list(params)) as unknown
if (Array.isArray(res)) return res as Array<Record<string, unknown>>
const obj = res as { data?: unknown; items?: unknown; medias?: unknown }
if (Array.isArray(obj.items)) return obj.items as Array<Record<string, unknown>>
if (Array.isArray(obj.data))  return obj.data  as Array<Record<string, unknown>>
if (Array.isArray(obj.medias)) return obj.medias as Array<Record<string, unknown>>
return []
```

**问题**：endpoint 的类型声明今晚已经改成"真机返回数组"，`as unknown` 把刚拿到的 `VideoMedia[]` 又丢掉，然后保留 3 个针对旧返回形状的分支——**永远不会命中**。下游因此把每行当 `Record<string, unknown>` 用：`VideoDetailView.tsx:346-370` 里 `String(row.media_name ?? '—')`、`Number(row.media_file_size)`、`Boolean(row.is_self_upload)` 全靠手写兜底（同类 `String(row.x)` 在 views 里共 64 处）。

**改法**：
```ts
export function useMediaList(params: {...}) {
  return useQuery({
    queryKey: ['media', params] as const,
    queryFn: () => mediaApi.list(params),        // 直接是 VideoMedia[]
  })
}
```
再把 `VideoDetailView` 里资源表 / 字幕表的 `String(...)` 换成字段直读（`VideoMedia` 缺的字段就去 `src/api/types.ts` 补，缺字段比运行时兜底更该暴露）。

**影响面**：`useMediaList` 只有 `VideoDetailView` 一个消费方（`media.data`、`media.refetch()`）。改类型会让 `VideoDetailView:344-372` 的 8 处 `String()/Number()/Boolean()` 报错——这是好事，正好把类型补齐。`subtitleApi.list` 目前仍是 `Array<Record<string, unknown>>`，字幕表可以先不动。

---

### M8. "删别人的要写理由、删自己的只确认"复制了三份【今晚】

**位置**：
- `src/views/VideoDetailView.tsx:540-566`（删资源）
- `src/views/VideoDetailView.tsx:744-770`（删字幕）
- `src/views/SongDetailView.tsx:229-262`（删音频）

三段几乎逐字相同：`let reason = ''` → `if (isSelf) { confirmDialog({...}) } else { promptDialog({ title:'删除…？', label:'理由', placeholder:'请说明删除原因', required:true, ... }) }` → `mutate({ ..., reason })`。文案只有名词不同（"资源""字幕""音频"），`由 X 上传。` 前缀写了三遍。

**改法**：抽一个 `src/ui/deleteReason.ts`：
```ts
export async function askDeleteReason(opts: {
  what: string; isSelf: boolean; owner?: string | null; message: string
}): Promise<string | null>   // null = 用户取消；'' = 自己的资源，无需理由
```
调用点变成 `const reason = await askDeleteReason(...); if (reason === null) return`。

**影响面**：只影响这三处。注意三处的 `isSelf` 判定来源不同（`row.is_self_upload` × 2、`row.user.user_id === session.user_id`），抽函数时把 `isSelf` 作为入参传进去，别把判定也塞进去（见 T2）。

---

### M9. `ui/prompt.tsx` 是 `ui/confirm.tsx` 的整份复制，其中 `isPromptOpen` 是死代码【今晚】

**位置**：`src/ui/confirm.tsx:16-52`、`src/ui/prompt.tsx:14-34,41-57`、`src/ui/prompt.tsx:24`

**问题**：
1. 两个文件 60 行完全同构：模块级 `let open` + `let openCount` → `Host` 里 `useEffect` 注册 → `settle()` 同时管 `openCount`/`resolve`/`setState` → keydown 里 `stopImmediatePropagation()` 拦 Esc。差别只有 `resolve` 的类型（`boolean` vs `string|null`）和渲染内容。`confirm.tsx:69` 的 `useEffect` 没写依赖数组（每次渲染重装监听），`prompt.tsx:76` 写了 `[pending, value]`——两份拷贝已经开始各自漂移。
2. `isPromptOpen()`（`prompt.tsx:24`）**没有任何调用点**（`export` 扫描为 0 引用）。`Modal.tsx:5` 只 import 了 `isConfirmOpen`。所以"prompt 开着时 Esc 只关它"这件事实际是靠 `stopImmediatePropagation` 兜住的，`isPromptOpen` 是个看起来有、用起来没有的 API。

**改法**：抽 `src/ui/decision.tsx`：`createDecisionHost<T>(render)` 管 open/openCount/settle/Esc，`confirm` 与 `prompt` 各自只提供渲染；删 `isPromptOpen`（或真的在 `Modal.tsx` 里用起来，二选一，不要留着不用）。

**影响面**：`confirmDialog` / `promptDialog` 的调用点（约 25 处）签名不变，纯内部重构。注意 `confirm.tsx:63` 用 `data-confirm-action="cancel"` 判断回车是否该按取消，抽的时候要保留。

---

### M10. `.tag-input` 这个类名早就不存在了：一处守卫永远不命中，而真正的守卫在 `Modal` 里【今晚】

**位置**：`src/components/WatchlistForm.tsx:61`

```tsx
onSubmit={() => {
  // 焦点在标签输入框里时，回车属于「确认标签」，不该提交整个表单
  if (document.activeElement?.closest('.tag-input')) return
```

**问题**：`TagInput` 渲染的是 `className="tag-field"`（`src/components/TagInput.tsx:43`），全项目 `.tag-input` 只出现在这一行（`grep -rn 'tag-input' src/` 仅此命中）。所以这行**永远返回 false**。真正拦住"回车里确认标签"的是 `src/components/Modal.tsx:66` 的 `!target?.closest('textarea, .tag-field')`。两处守卫表达同一件事，一处失效、一处生效。

**改法**：删掉 `WatchlistForm.tsx:61`（Modal 已经覆盖）。若想让组件自己负责，就在 `TagInput` 的 `onKeyDown` 里 `e.stopPropagation()`，然后把 Modal 里对 `.tag-field` 的特判一起去掉——但不要在组件层靠 `closest(className)` 互相识别。

**影响面**：删掉后行为不变（Modal 的守卫在前）。但 `Modal.tsx:66` 的 `closest('textarea, .tag-field')` 本身就是"通用组件特判某个业务类名"，见 S20，建议一并换个做法。

---

### M11. 建好却没人调的 mutation / 死分支【今晚】

**位置与问题**：
1. `src/api/queries.ts:915-916` + `:945` — `emptyVideos` / `emptyMusic` 两个 mutation 被创建并导出，**没有任何视图解构或调用**（`grep -rn 'emptyVideos\|emptyMusic' src/` 只命中 hook 自身和 endpoint）。对应 `watchApi.emptyVideos/emptyMusic`（`endpoints.ts:163-164`）也没有 UI 入口。
2. `src/api/queries.ts:883-888` — `addVideo` 的 mutationFn 写成 `(p: number | { videoId: number; sort?: number })` 且带 `typeof p === 'number'` 分支。今晚唯一的调用点（`WatchlistDetailView.tsx:346`）传的是对象，`number` 分支**无调用者**——这是"改调用方式时留的兼容层"，兼容层本身没人用就是死代码。

**改法**：删 1、2；如果"清空片单内容"是计划中的功能，那就把按钮一起做掉，否则不要留半截 API。

**影响面**：无。删 `addVideo` 的 union 后签名变为 `(p: { videoId: number; sort?: number })`，唯一调用点已符合。

---

### M12. 350ms 输入防抖复制了 10 份，而且已经出现两种变体【今晚新增 4 处】

**位置**：
| 文件 | 行 | 备注 |
|---|---|---|
| `src/views/OrdersView.tsx` | 38-43 | |
| `src/views/WatchlistsView.tsx` | 37-44 | |
| `src/views/ShopView.tsx` | 88-93 | |
| `src/views/RecycleView.tsx` | 30-37 | 回调多带 `by` |
| `src/views/LibraryView.tsx` | 31-38 | state 名是 `query` 不是 `term` |
| `src/views/MusicView.tsx` | 43-50 | |
| `src/views/SeekView.tsx` | 40-47 | |
| `src/views/SellerView.tsx` | 18-24 | **少了 `if (next === 关键字) return` 守卫** |
| `src/views/WatchlistDetailView.tsx` | 50-57 | |
| `src/views/WatchlistDetailView.tsx` | 534-539 | 音乐子组件里又一份 |

**问题**：10 份逐字相同的 `useEffect(() => { const timer = setTimeout(() => onSearch({ q: next, page: 1 }), 350); return () => clearTimeout(timer) }, [term, search.q])`。已经开始漂移：`SellerView` 少了"值没变就不推 URL"的守卫（每次挂载后都会推一次同样的 URL），`VideoDetailView:585` 干脆忘了 cleanup（M2）。

**改法**：`src/lib/useDebouncedValue.ts`：
```ts
export function useDebouncedValue<T>(value: T, delay = 350): T
```
各页只保留 `const q = useDebouncedValue(term); useEffect(() => { if (q !== search.q) onSearch({ q, page: 1 }) }, [q])`。RecycleView 的 `by` 一起进依赖。

**影响面**：10 个页面，逐个改、行为等价，风险低但改动面广。建议单独一个提交，并按页面回归"输入即搜 + 后退不重复推 URL"。

---

### M13. `syncMetadata` 靠中文提示串认错【今晚】

**位置**：`src/api/endpoints.ts:132-141`

```ts
} catch (error) {
  if (error instanceof Error && error.message.includes('已存在 metadata')) return { carrot: 0 } as CarrotDelta
```

**问题**：这是"为某个具体症状加的临时逻辑"的典型：把 422 的语义翻译成成功，但判据是后端的中文文案子串。后端改一个字（"已存在 metadata 信息" → "元数据已存在"）、或返回多语言/加上前后缀，就会退化成"弹红字报错"，而且是静默退化（没有测试会红）。另外 `{ carrot: 0 } as CarrotDelta` 是编造的数据——UI 拿它算"删除扣了多少胡萝卜"会显示 +0。

**改法**（二选一，优先 A）：
- **A**：按状态码 + 结构化字段判断：`if ((error as ApiError).status === 422 && /metadata/i.test(JSON.stringify((error as ApiError).payload ?? '')))`，并把这条规则收进一个常量/注释指向接口文档；更好是让后端在 422 body 里给 `code: 'metadata_exists'`。
- **B**：不要在 api 层伪造成功，改成返回联合类型 `{ alreadySynced: true } | CarrotDelta`，由 `useVideoMutations.syncMetadata` 的 `onSuccess` 决定 toast 文案（"已是最新，无需同步"）。

**影响面**：只有 `VideoDetailView.tsx:521`（同步元数据按钮）一个调用点。改 B 要同步改那个 onSuccess 的 toast 文案。

---

## 2. 建议重构

### S1. `useShopProducts` 有 8 个位置参数，已经因此写错一次【今晚】

**位置**：`src/api/queries.ts:471-497`；调用点 `src/views/ShopView.tsx:66-76`

```ts
useShopProducts(page, sellerId, categoryId, pageSize = 12, name = '', sortBy = '', onlyUp = false, enabled = true)
// ShopView：
useShopProducts(page, mine ? sellerId : 0, categoryId, 12, q, sort, !mine, mine && Boolean(seller.data?.seller_id))
```
**问题**：8 个位置参数里 3 个布尔/枚举连着放，`12, q, sort, !mine, mine && …` 这一行要对照签名才能读懂；加参数只能往尾巴上加。今晚已经出现过调用点传 `!mine` 给 `onlyUp` 的写法。
**改法**：改成 options 对象 `useShopProducts({ page, sellerId, categoryId, pageSize, name, sortBy, onlyUp, enabled })`。
**影响面**：`ShopView` 一个调用点 + `useShopCounts`（`queries.ts:530-560`）内部 4 处调用。20 行内改完。

---

### S2. 片单详情头部 40 行两份【今晚】

**位置**：`src/views/WatchlistDetailView.tsx:121-171`（影视）与 `:562-609`（音乐子组件 `WatchMusicList`）
**问题**：封面 72×96 + 公开/私密 badge + tags chips + 订阅价 chip + 描述 + 4–5 个 `detail-stat`，两份只差第一项统计（`item.video_count` vs `songs.data.total`）以及影视多一个"维护者"。今晚 commit `7803390`（"两种片单详情结构对齐"）的实现方式是**复制一遍并对齐**，下次加字段又要对两次。
**改法**：`<WatchlistHead item={item} count={n} countLabel="影片|首" extra={<维护者 />} />`。
**影响面**：同一文件内，无外部引用。

---

### S3. OrdersView：筛选对象写两遍 + mutation 三元 + `;(` 前置分号【今晚】

**位置**：`src/views/OrdersView.tsx:47-58`（同一段 `{...pay.filter, ...delivery.filter, ...(search.q ? regex : {})}` 抄两遍）、`:257`、`:294`
**问题**：
- 筛选对象两份，其中单号/商品名的正则启发式（`/^[0-9A-Za-z]{12,}$/`）也写了两遍，改一处忘一处就会出现"店铺订单能搜到、我的订单搜不到"。
- `const mutation = mineScope ? actions.removeOrder : actions.deleteOrder`（`:257`）和 `;(mineScope ? … : …).mutate(...)`（`:294`）——行首分号是为了接上一行的语句，这种写法说明"两个视角共用一个组件"这件事没抽象干净。
**改法**：
```ts
const filter = { ...pay.filter, ...delivery.filter, ...(search.q ? orderQuery(search.q) : {}) }
const shopOrders = useShopOrders(search.page, filter, 10, !mineScope)
const mineOrders = useShopMineOrders(search.page, filter, 10, mineScope)
// 统一成一个：const remove = mineScope ? actions.removeOrder : actions.deleteOrder
```
**影响面**：单文件。

---

### S4. 空态与「清空搜索」五种写法，其中两页干脆没有清空入口【今晚】

**位置**：
- `src/views/LibraryView.tsx:120-129`（有清空 + 有"页码越界"分支 + 自带 Pager）
- `src/views/LinesView.tsx:69-79`（**没有清空按钮**，另有独立的越界分支）
- `src/views/RecycleView.tsx:128-138`、`src/views/SeekView.tsx:121-139`、`src/views/WatchlistsView.tsx:120-140`、`src/views/SellerView.tsx:97-107`（有清空）
- `src/views/ShopView.tsx:265-268,274-277`（两处空态，**都没有清空**，标题条件式也是另一种写法）
**问题**：同一类"没搜到"的空态，标题文案、是否给"清空搜索"、是否单独处理页码越界，各页不同；`WatchlistsView`/`SeekView` 还写成三层嵌套三元（`search.q ? … : scope === 'self' ? … : …`）。
**改法**：`<EmptyBlock>` 增加 `onClear` 简写，或提供一个 `<NoResult q={q} onClear={...} fallbackTitle="..." />`；页码越界统一走一个 `OutOfRange` 片段（现在只有 Library / Lines 有，其余 5 个分页页面越界就是白屏）。
**影响面**：7 个页面的空态，纯展示层。建议先统一"有搜索词就给清空按钮"，再决定是否补越界态（那种情况下 `total > 0` 但 `items` 为空）。

---

### S5. `page_size` 有四种解析写法，今晚新补的那条是第五种【今晚新增 1 种】

**位置**：`src/router.tsx:67`（内联 `[20,50,100].includes`）、`:372` 与 `:398`（写死 `20`）、`:418`（`Number(s.page_size) > 0 ? … : 20`）、`:220/:238/:311`（`asPageSize`）
**问题**：`lib/search.ts:9-13` 的 `asPageSize` 就是干这个的，`PAGE_SIZES` 也在那儿。今晚修"片单详情每页条数被覆盖回 20"时（`:417-418`），新写了一个 `Number(x) > 0 ? x : 20`——它允许 7、13 这类非法页宽，跟 `asPageSize` 的白名单不一致；`router.tsx:67` 还各自维护了一份 `[20,50,100]`。
**改法**：全部换成 `asPageSize(s.page_size)`；固定 20 的页面直接写 `20` 但加注释说明"该页不支持改页宽"，或者也接 `asPageSize`。
**影响面**：路由层，影响 6 个页面的 URL 解析。低风险，但 `:67` 换成 `asPageSize` 会改变"接受 10"的行为（`PAGE_SIZES` 含 10），需要确认 Library 的 Pager 选项里有 10。

---

### S6. 「这条记录是不是我的」四种判定【既有 + 今晚扩展】

**位置**：
- `src/views/VideoDetailView.tsx:357,426` — `row.is_self_upload`
- `src/views/SongDetailView.tsx:230-231` — `row.user.user_id === session.data?.user_id`
- `src/views/SeekView.tsx:37,159-162` — `myNames.includes(String(item.upload_username))`（把 pseudonym/username 拼成数组做字符串匹配）
- `src/views/WatchlistDetailView.tsx`（编辑入口）— `item.is_edit_video`
**问题**：同一条业务判断（能不能免理由删除 / 能不能改）有四种数据来源，语义还不一样：SeekView 用"显示名"匹配，改个 pseudonym 就判错；SongDetail 用 user_id；VideoDetail 用后端算好的布尔。今晚把"免理由"逻辑接上去时，三处各按各自的字段判断，行为不一致（同一个人的同名资源在求片页能撤回、在歌曲页可能不行）。
**改法**：约定唯一判据 `ownerId`（`user_id`）+ 一个 `useIsMine(ownerId)`；后端已给 `is_self_upload` 的地方优先用它，缺的地方在 `src/api/types.ts` 补字段而不是在视图里拼名字。
**影响面**：四处视图 + 相关类型；SeekView 那处需要后端在 `/api/seek` 返回里带 `upload_user_id`（否则只能退化为名字匹配，但至少要收进一个 helper 并注释清楚）。

---

### S7. SeekView 催片按钮 JSX 复制两份，嵌套三元到三层【今晚】

**位置**：`src/views/SeekView.tsx:249-260` 与 `:272-285`（内容逐字相同：`onClick={e => {e.stopPropagation(); setUrgeTarget(item); setCarrot(10)}}`）；`:128-138` 是三层嵌套三元算标题。
**问题**：`status === 'upload'` 与 `status === 'default'` 两个分支里各拷了一份"催片"按钮；`setCarrot(10)` 的初始值写了两次，改默认值要改两处。
**改法**：把催片按钮提成组件内的小函数 `<UrgeButton item={item} />`，或用一个 `const urge = (e) => {...}`；标题用映射表代替嵌套三元。
**影响面**：单文件。

---

### S8. ShopView / SellerView 的工具栏（分类 tabs + 搜索 + 排序 seg）两份【今晚】

**位置**：`src/views/ShopView.tsx:210-256` 与 `src/views/SellerView.tsx:56-92`
**问题**：分类 tabs 循环、`<span className="spacer" />`、"默认/销量/价格"的 `seg` 结构和 `aria-pressed` 判定完全一样，只有 state 载体不同（URL search vs 本地 state）。以后改排序选项要改两处。
**改法**：`<ProductToolbar categories value={{categoryId, term, sort}} onChange={...} />`，两个页面各自把 onChange 接到 URL 或 state。
**影响面**：两个文件，纯展示层。

---

### S9. 行内排序输入框两份，且都不回写失控值【今晚】

**位置**：`src/views/ShopView.tsx:428-447`（分类排序）、`src/views/WatchlistDetailView.tsx:244-263`（片单内影片排序）
**问题**：同一套"`<input type="number" defaultValue>` + `onBlur` 里 `Number.isFinite` 判断 + `mutate` + toast"写两遍，样式内联 `height: 26, padding: '0 6px', fontSize: 12.5` 也复制。都用 `defaultValue`（非受控）：排序保存成功后服务端可能夹挤/取整，输入框显示的仍是用户敲的值，界面与数据不一致。
**改法**：`<InlineSortInput value={n} onCommit={(next) => mutate(next)} />`，内部用受控 + `key={value}` 重置。
**影响面**：两处视图。

---

### S10. 两处 JSDoc 被插进了别的函数头上【今晚】

**位置**：
- `src/api/queries.ts:200-203` —— "求片增量探测：每 30 秒只拉比 lastId 新的条目…" 这段注释现在挂在 `useUserRecords`（:204）头上，它描述的是 `useSeekPoll`（:220）。
- `src/api/queries.ts:498` —— `/** 只取 total 的轻量查询：page_size 传 1，不拉列表 */` 后面紧跟的是 `useShopProductsInfinite` 的另一段注释（:499-502），真正的主人 `useShopCounts` 在 :530。
**问题**：新代码插在旧代码中间时把注释和函数拆散了。这类错位注释比没有注释更坏——它会把下一个人引到错误的性能假设上。
**改法**：把两段注释移回对应函数上方；`useShopProductsInfinite` 的注释保留。
**影响面**：无（纯注释）。

---

### S11. 删除片单后既 invalidate 又 refetch，打两次同样的请求【今晚】

**位置**：`src/views/WatchlistsView.tsx:216-233`
```tsx
await watchApi.remove(watch.id)
void qc.invalidateQueries({ queryKey: ['watches'] })
void qc.invalidateQueries({ queryKey: ['session'] })
toast('片单已删除', 'success')
void refetch()            // ← 和第一行 invalidate 打的是同一个 query
```
**问题**：`invalidateQueries(['watches'])` 已经会让当前页重查，`refetch()` 又来一次 → 删除一次发两个列表请求。而且这里是**直接调 endpoint + try/catch + toast**，全项目其他删除都走 mutation hook（见 S13）。
**改法**：删掉 `refetch()`，只留 invalidate；进一步把删除收进 `useWatchMutations`（例如 `removeWatch`）里，`onSuccess` 统一失效。
**影响面**：单文件；注意 `removing` 这个 loading state 在去掉 try/catch 后要改成 `mutation.isPending`。

---

### S12. 卡片内表格的三态（加载/空/表格）两份【今晚】

**位置**：`src/views/AccountView.tsx:226-290`（已登录设备）、`src/views/UserDetailView.tsx:196-243`（最近播放）
**问题**：`card-head + LoadingBlock bare + EmptyBlock bare + <table className="table table--inset">` 的结构完全一致，连 `th` 宽度写法都一样。今晚这两块是分别加的。
**改法**：量不大，可以只抽 `<CardTable title extra loading empty={<EmptyBlock/>}>{rows}</CardTable>`；不急的话至少保持结构一致（现在两处列宽/空态文案风格已经不同）。
**影响面**：两个视图，纯展示层。

---

### S13. 视图直接调 endpoint 与 mutation 层并存【既有，今晚新增 3 处】

**位置**：直接 import `@/api/endpoints` 的视图共 12 个（`grep -rn "from '@/api/endpoints'" src/views`），今晚新增：`VideoDetailView.tsx:649,691`（`mediaApi.move`）、`ShopView.tsx:348`（`shopApi.product`）、`PayView.tsx:214`（`payApi.update`）+ `PayView.tsx:180-181`（手工 invalidate `['carrot']`/`['session']`）、`WhisperView.tsx:40`（`whisperApi.create`）。
**问题**：同一类写操作有两种生命周期管理方式：走 hook 的自动失效缓存，直接调 endpoint 的靠调用点手写 `refetch()`/`invalidateQueries`。今晚 `PayView` 的转赠就手写了两次 invalidate，而 `useShopMutations` 里已经有统一的 `invalidate()`。漏一处就是"操作成功但界面没变"。
**改法**：把 `moveMedia`、`updatePayBase`、`createWhisper`、`fetchProduct` 收进对应的 `use*Mutations` / `useShopProduct`；视图不直接碰 endpoint。`LoginView`（`sessionApi.check`）可以保留，它是认证流程。
**影响面**：5 个视图 + `queries.ts`；`mediaApi.move` 成功后目前靠 `media.refetch()`，收进 hook 后改为失效 `['media']`（`useVideoMutations.invalidate` 已经包含）。

---

### S14. 把整行数据拷进 state：字段会过期【今晚扩展】

**位置**：
- `src/views/VideoDetailView.tsx:82-83`（`renaming`/`renamingSub` 带了 `isSelf`、`owner`）
- `src/views/WatchlistDetailView.tsx:38`（`remarkFor` 带 `sort`，保存备注时会把它一起提交）
- `src/views/AccountView.tsx:43`（`remarkFor` 带 `username`）
- `src/views/PayView.tsx:31`（`editing` 带 `name/description/notify_url`，从 `base.data` 拷）
**问题**：`remarkFor` 里存了 `sort` 是因为 `updateVideoEntry` 的 payload 要求 `sort` 与 `remark` 同时传（`queries.ts:893-898`）。于是"只改备注"会顺带把打开弹窗那一刻的 `sort` 写回去——如果用户先用行内输入框改了排序、再打开备注弹窗（此时 state 里的 sort 还是旧的），保存备注会把排序打回去。VideoDetail 的 `isSelf/owner` 同理，资源列表刷新后弹窗里还是旧归属。
**改法**：state 只存标识（`mediaId` / `videoId`），渲染时从当前 query data 里按 id 取行；或者在 `updateVideoEntry` 里把 `sort` 改成可选，让"只改备注"真的只改备注。
**影响面**：4 个视图 + `updateVideoEntry` 的 payload 类型（如果走"可选 sort"方案，要确认后端 POST 不传 sort 时不覆盖）。

---

### S15. `ProductModals` 两个弹窗互相复制【今晚】

**位置**：`src/components/ProductModals.tsx:11-121`（详情+下单）与 `:123-195`（快捷购买）
**问题**：`buyNumber`/`remark` 两个 state、数量 clamp 表达式（`:85` 与 `:186`）、封面图 + 失败兜底（M5 三处之一处在这）、`createOrder.mutate` 的 `onSuccess` toast 文案（`:96` 与 `:150`，"订单 X 已创建，去订单页付款"）全部重复；详情弹窗的按钮是三态文案（下单中/已售罄/已下架），快捷购买没有。
**改法**：抽 `<BuyForm product onSubmit={...} />` 提供数量+备注+提交按钮，两个弹窗只保留外壳与"是否有详情数据"的差别。
**影响面**：`ShopView`、`SellerView` 两个使用方（props 不变）。

---

### S16. `deleteOrder` / `removeOrder` 命名歧义【今晚】

**位置**：`src/api/queries.ts:634`（`deleteOrder` → `shopApi.deleteOrder` 商户侧）、`:636`（`removeOrder` → `shopApi.removeOrder` 买家侧）；`endpoints.ts:296`（`deleteOrder` → `/shop/order/shop/order`）与 `:290`（`removeOrder` → `/shop/order/user/order`）两个方法名只差一个动词。
**问题**：两个名字读起来是同一个意思，只能靠注释区分；`OrdersView` 里因此写出了 `const mutation = mineScope ? actions.removeOrder : actions.deleteOrder`。
**改法**：`deleteShopOrder` / `deleteMyOrder`（或 `removeAsMerchant` / `removeAsBuyer`）。
**影响面**：`OrdersView.tsx:257,294` 两处调用 + `queries.ts`。

---

### S17. `TagInput` 被套在 `<label>` 里，跟刚修掉的 ImagePicker 是同一个坑【今晚】

**位置**：`src/components/WatchlistForm.tsx:119-122`

```tsx
<label className="field">
  <span>标签</span>
  <TagInput value={form.tags} onChange={...} />
</label>
```
**问题**：`ImagePicker` 今晚的改动理由是"用 div 不用 label：里面是按钮，套在 label 里点击会被 label 捕获两次"（`src/components/ImagePicker.tsx:35`）。`TagInput` 里同样有按钮（每个 chip 的 ✕），却被套进了 label：点 ✕ 会先触发 label 的默认行为（把焦点转给它关联的表单控件），点 chip 文字也会把焦点抢到输入框。同文件 `:81`（类型 seg）和 `WatchlistDetailView.tsx:483`（维护者）用的都是 `<div className="field">`——三种写法并存。
**改法**：改成 `<div className="field">`，与 ImagePicker / seg / 维护者保持一致。
**影响面**：单文件；`.field` 的样式不依赖标签名。

---

### S18. SellerView 的空回调与内联类型 import【今晚】

**位置**：`src/views/SellerView.tsx:115`（`onBought={() => undefined}`）、`:26`（`useState<import('@/api/types').ShopProduct | null>`）
**问题**：`ProductDetailModal` 的 `onBought` 是必填 prop，但 SellerView 不需要"下单后刷新自己店铺"（它没有店铺统计），于是塞了个空函数——说明这个 prop 该是可选；`import('@/api/types').ShopProduct` 是文件里唯一的内联类型导入，其余都用顶部 `import type`。
**改法**：`onBought?: () => void`；把类型提到顶部 import。
**影响面**：`ProductModals.tsx` 的 prop 类型 + `ShopView`/`SellerView` 两处调用。

---

### S19. `PageHeader.mark` 是一个刚加上就没人用的 prop（且没有 CSS）【今晚】

**位置**：`src/components/PageHeader.tsx:11,57`；样式缺失见 D4
**问题**：commit `c7b0ca9`（"店铺封面挪到标题旁"）加了 `mark`，commit `380a379`（"店铺页去掉封面大图"）把唯一调用点删了，prop 与 `className="page-title__mark"` 留在原地，而**这个 class 在 CSS 里根本不存在**——将来有人传 `mark` 会得到一个没有尺寸约束的原图。
**改法**：删 prop + 那行 JSX（与 D4 一并处理）。
**影响面**：无调用点。

---

### S20. 弹层叠放的 Esc 协调有三套机制【今晚】

**位置**：`src/components/Modal.tsx:6-22,68-70`（模块级 `modalStack`）、`src/components/Modal.tsx:5,73`（`isConfirmOpen`）、`src/ui/confirm.tsx:56-60` 与 `src/ui/prompt.tsx:64-68`（`stopImmediatePropagation`）、`src/ui/prompt.tsx:24`（`isPromptOpen`，未用）
**问题**：同一个目标（"Esc 只关最上面那层"）有三种实现：模态栈数组、一个布尔探针 `isConfirmOpen`、以及两个 Host 各自 `stopImmediatePropagation`。`isPromptOpen` 写了没用（M9），说明这套机制连作者自己都没用一致。另外 `Modal.tsx:66` 用 `.closest('textarea, .tag-field')` 特判业务类名（M10）。
**改法**：一个 `overlayStack`（元素级），每个 overlay 注册/注销；`Esc` 统一在 `window` 上取栈顶。输入类控件用 `data-modal-enter="ignore"` 之类的显式标记，而不是 class 名匹配。
**影响面**：`Modal`、`confirm`、`prompt` 三个组件；所有弹窗共用，改动需要回归"编辑资源 → 移动资源"、"删除确认叠在弹窗上"两条链路（今晚正是在修这两条）。

---

## 3. 可以不管

| # | 位置 | 说明 |
|---|---|---|
| A1 | `src/api/mock.ts:344-345, 623-624, 639-640` | `truthy`/`falsy` 在三个分支里各定义一次（今晚新增 2 份）。只在 mock 里，抽成模块级两行即可，但不影响产品代码。 |
| A2 | `src/api/mock.ts:328-680` | 大段内联 fixture（今晚 +100 行）。mock 本来就是一次性数据，不必抽工厂。 |
| A3 | `src/styles/components.css:349-355` | `.cards + .table-card/.toolbar/.media-grid/.product-grid/section { margin-top: 24px }` 是"哪里贴住了就补哪里"的间距补丁；可接受，但 `.media-grid` 这个类在 TSX 里根本不存在（见 D4）。 |
| A4 | `src/styles/components.css:1249-1250` | `.table .input { min-width: 0 }` 全局覆盖，为两处行内输入服务。若按 S9 抽成 `.input--inline` 可以收窄，但不改也不会出错。 |
| A5 | `src/views/OverviewView.tsx:303-305` | `const peak = Math.max(...arr.map(...), 1)` 写在 `.map` 回调里，7 根柱子算 7 次。数据量是 7，忽略。 |
| A6 | `src/components/TagInput.tsx:34,39` | `requestAnimationFrame` 恢复焦点。注释解释了原因（同步 focus 会被重渲染覆盖），是可接受的写法；如想更"React"，可改成 `useEffect` 监听 `value.length`。 |
| A7 | `src/components/ProductGrid.tsx:31-42` | `IntersectionObserver` 的 `useEffect` 依赖里含内联 `onLoadMore`，每次渲染都重建 observer。数据量小、无泄漏（有 disconnect），忽略。 |
| A8 | `src/views/LiveView.tsx:23-24` | `useEffect(() => setMediaPage(1), [search.channel])` 用 effect 归零分页。也可以放到改 channel 的 handler 里，但 effect 写法本身没错。 |
| A9 | `src/components/Modal.tsx:41` | `Math.random().toString(36)` 生成弹层 id。改成自增计数器更干净，纯口味问题。 |
| A10 | `src/router.tsx:376` | `mine: s.mine === true \|\| s.mine === '1' \|\| s.mine === 'true'`：`router.tsx:484-491` 的自定义 `parseSearch` 保证所有值都是字符串，`=== true` 永远不成立。无害死分支，看到顺手删。 |
| A11 | `src/styles/tokens.css:24-32` | `--s-1`…`--s-9` 间距 token 全部无人使用（见 D4）。属于"设计令牌没落地"，删了更好，但和今晚改动无关。 |

---

## 4. 死代码清单

### 4.1 导出但全项目零引用

| 位置 | 符号 | 备注 |
|---|---|---|
| `src/api/types.ts:254` | `RankUpload` | 接口定义，无引用【既有】 |
| `src/api/types.ts:261` | `RankCarrot` | 同上 |
| `src/api/types.ts:268` | `PlayingNow` | 同上 |
| `src/api/types.ts:401` | `MusicArtistRef` | 同上 |
| `src/components/icons.tsx:68` | `IconFilter` | 图标定义，无引用【既有】 |
| `src/lib/uploader.ts:251` | `uploadTemporary` | 临时上传函数，无调用者【既有】 |
| `src/ui/prompt.tsx:24` | `isPromptOpen` | **【今晚】** 与 `isConfirmOpen` 配套写的，但 `Modal` 只 import 了 confirm 那个 |
| `src/lib/search.ts:1,20` | `Search` | `type Search = Record<string, unknown>` + `export type { Search }`，无人 import |

> 检测方式见附录脚本 A：声明处之外全项目 0 次引用。

### 4.2 组件 / props / 分支 / CSS

| 位置 | 内容 | 说明 |
|---|---|---|
| `src/components/PageHeader.tsx:11,57` | `mark` prop + `<img className="page-title__mark">` | 【今晚】加的，调用点当晚被删（见 S19）；`.page-title__mark` 无 CSS 规则 |
| `src/components/ImagePicker.tsx:20,27,61` | `hint` prop | 【今晚】三处调用点（WatchlistForm、ShopView）都把 `hint` 删了，prop 变成永不传；`hint ? …` 分支与 `.image-picker__hint` 样式成为死路径 |
| `src/api/queries.ts:915-916,945` | `emptyVideos` / `emptyMusic` mutation | 【今晚】建好无人调用（M11） |
| `src/api/queries.ts:883-888` | `addVideo` 的 `number` 分支 | 【今晚】唯一调用点传对象（M11） |
| `src/api/queries.ts:181-184` | `useVideoPage` 的 `todb_id` / `video_id` / `only_delete` / `enabled`（以及 `:189`） | 【今晚】四个参数无任何调用点传入；`enabled` 正是 M3 需要却没用的那个 |
| `src/api/queries.ts:333-337` | `items` / `data` / `medias` 三个嗅探分支 | 【今晚】endpoint 改成数组后永不命中（M7） |
| `src/components/WatchlistForm.tsx:61` | `closest('.tag-input')` | 【今晚】类名不存在，永不命中（M10） |
| `src/router.tsx:376` | `s.mine === true` | 见 A10 |

### 4.3 CSS 类（定义但 TSX 里没有任何元素使用）

| 位置 | 类名 |
|---|---|
| `src/styles/components.css:1262` | `.table td.action-cell` — 没有任何 `<td className="action-cell">` |
| `src/styles/components.css:628` | `.legend`（在 `@media (max-width: 900px)` 内，全项目无此 class） |
| `src/styles/components.css:599` | `.posters`（在 `@media (max-width: 1240px)` 内；`LoginView` 的类名是 `login__wall`/`login__strip`，没有 `posters`） |
| `src/styles/components.css:1515` | `.login__sub`（`LoginView` 用的是 `.login__submit`） |
| `src/styles/components.css:352` | `.cards + .media-grid` — **【今晚】** 新加的复合选择器里的 `.media-grid`，全项目无此 class |
| `src/styles/components.css:1650` 附近 | `.image-picker__hint` — 唯一渲染点在 `ImagePicker` 的 `hint` 分支，而 `hint` 已无人传（见上） |

### 4.4 CSS 变量（定义但零引用）

`src/styles/tokens.css:24-32`：`--s-1`、`--s-2`、`--s-3`、`--s-4`、`--s-5`、`--s-6`、`--s-7`、`--s-8`、`--s-9`（9 个间距 token，全项目无 `var(--s-*)`）。

> 今晚已清理掉 5 个（`--c-pink`、`--c-purple`、`--r-chip`、`--font-mono`、`--z-nav`，见 `tokens.css` diff），这 9 个是同一批遗留。

### 4.5 `endpoints.ts` 里没有 UI 入口的封装（只列清单，不必删）

| 位置 | 方法 | 状态 |
|---|---|---|
| `src/api/endpoints.ts:102` | `videoApi.getVideoId` | 无调用 |
| `src/api/endpoints.ts:155` | `recordApi.change` | 无调用 |
| `src/api/endpoints.ts:222` | `seekApi.query` | 【今晚变死】"求片详情"弹窗被删（commit `5b626d7`） |
| `src/api/endpoints.ts:223` | `seekApi.history` | 【今晚变死】同上 |
| `src/api/endpoints.ts:250` | `payApi.close` | 无调用 |
| `src/api/endpoints.ts:251` | `payApi.userCarrot` | 无调用 |
| `src/api/endpoints.ts:310` | `musicApi.playUrl` | 【今晚变死】音乐行去掉"播放地址"（commit `6008b1c`） |
| `src/api/endpoints.ts:312` | `musicApi.moveMedia` | 无调用 |
| `src/api/endpoints.ts:163-164` | `watchApi.emptyVideos` / `emptyMusic` | 【今晚】有 endpoint + 有 hook，但 hook 无人调用 |

**注释掉的代码块：无。**（`grep -rn '^\s*//\s*(const|let|function|return|if|<)' src/` 无命中）

---

## 5. 重复逻辑对照表

| # | 同一件事 | 在哪些文件里各写了一遍 | 建议收敛到 |
|---|---|---|---|
| T1 | 350ms 输入防抖推 URL | `OrdersView:38`、`WatchlistsView:37`、`ShopView:88`、`RecycleView:30`、`LibraryView:31`、`MusicView:43`、`SeekView:40`、`SellerView:18`、`WatchlistDetailView:50`、`WatchlistDetailView:534`（10 处；`VideoDetailView:582-586` 是第 11 处，且无 cleanup） | `useDebouncedValue` |
| T2 | 「是不是我的资源」 | `VideoDetailView:357,426`（`is_self_upload`）、`SongDetailView:231`（`user.user_id`）、`SeekView:37,161`（`pseudonym/username` 字符串匹配）、`WatchlistDetailView`（`is_edit_video`） | `useIsMine(ownerId)` + 后端字段 |
| T3 | 删除要理由（自己的只确认 / 别人的填理由） | `VideoDetailView:540`、`VideoDetailView:744`、`SongDetailView:229` | `askDeleteReason()` |
| T4 | 空态 + 「清空搜索」 | `LibraryView:120`、`LinesView:69`（无按钮）、`RecycleView:128`、`SeekView:121`、`WatchlistsView:120`、`SellerView:97`、`ShopView:265,274`（无按钮） | `<NoResult>` / `EmptyBlock.onClear` |
| T5 | 页码越界空态 | `LibraryView:110-131`、`LinesView:72-79`（其余 5 个分页页没有） | `<OutOfRange>` |
| T6 | `page_size` 解析 | `router.tsx:67`（内联白名单）、`:372`/`:398`（写死 20）、`:418`（`Number>0`）、`:220`/`:238`/`:311`（`asPageSize`） | `asPageSize` |
| T7 | 封面加载失败退化 | `ProductTile:36`、`ProductModals:38`、`ProductModals:164`（`data-fallback`，无 CSS）+ 已有 `Poster` | `Poster` |
| T8 | Promise 式弹窗宿主 | `ui/confirm.tsx` 与 `ui/prompt.tsx`（open/openCount/settle/Esc 全同） | `createDecisionHost` |
| T9 | 行内排序 input + onBlur mutate | `ShopView:429`、`WatchlistDetailView:244` | `<InlineSortInput>` |
| T10 | 商品工具栏（分类 tabs + 搜索 + 排序 seg） | `ShopView:210`、`SellerView:56` | `<ProductToolbar>` |
| T11 | 卡片内表格三态 | `AccountView:226`、`UserDetailView:196` | `<CardTable>` |
| T12 | 价格展示（`formatThousand` + 划线原价条件） | `ProductTile:46-49`、`ProductModals:48-51`、`ProductModals:174`、`ShopView:321` | `formatPrice()` / `<Price>` |
| T13 | 数量步进 clamp | `ProductModals:85`、`ProductModals:186` | 随 S15 合并 |
| T14 | `error as Error & { status?: number }` | 30 处（见 M6 清单） | 放宽 `ErrorBlockProps` |
| T15 | 片单详情头部 | `WatchlistDetailView:121`、`WatchlistDetailView:562` | `<WatchlistHead>` |
| T16 | 订单筛选对象 + 单号/品名启发式 | `OrdersView:47`、`OrdersView:54` | 一个 `filter` 常量 |
| T17 | 排序 mutate 三元 + 前置分号 | `OrdersView:257`、`OrdersView:294` | 一个 `removeOrder` |
| T18 | 直接调 endpoint 的写操作 | `VideoDetailView:649,691`、`ShopView:348`、`PayView:214`、`WhisperView:40`、`WatchlistsView:222` | 收进 `use*Mutations` |
| T19 | mock 的 `truthy`/`falsy` | `mock.ts:344`、`:623`、`:639` | 模块级两个函数（mock 内，可不管） |
| T20 | 片单「催片」按钮 JSX | `SeekView:249`、`SeekView:275` | 组件内小组件 |

---

## 6. 已核对、确认没有问题的部分（写「无」）

- **注释掉的代码块**：无。
- **`console.log` / `debugger` / `@ts-ignore` / `@ts-expect-error`**：无（唯一的 `eslint-disable` 是 `LoginView.tsx:35` 的 `react-hooks/exhaustive-deps`，属既有且合理）。
- **未使用的 import / 局部变量 / state**：无——`tsconfig` 开了 `noUnusedLocals`/`noUnusedParameters`，`npx tsc --noEmit` 通过。今晚删掉的 `subUploading`、`detail`/`detailTarget` 等 state 都删干净了。
- **硬编码字符串匹配**：只有 M13 一处（`includes('已存在 metadata')`）；其余 `.includes(` 命中都是数组/搜索词判断，正常。
- **`setTimeout` 绕过渲染时序**：除 M2 与 T1 的防抖外，没有用定时器绕过渲染的写法。`TagInput`/`Modal` 的 `requestAnimationFrame` 有明确理由（A6）。
- **`@ts-` 逃逸与 `any`**：无 `any`；`as unknown as` 共 7 处，其中 2 处（`queries.ts:753,761`）是**完全多余**的（endpoint 已声明同类型，见下条），其余 5 处集中在 M7 与 `useDeletedMedia`（`queries.ts:796`）这类"上游返回形状不确定"的地方。
  - 顺手可删：`src/api/queries.ts:753`、`:761` —— `musicApi.lyrics/media` 的返回类型就是 `Array<Record<string, unknown>>`，`as unknown as` 只是噪声。
  - `src/api/queries.ts:796-801`：`Record<string, unknown>` + 双断言 + 再补默认值，而 `mediaApi.listAll` 已经返回 `ListResult`，`res.items ?? []` 这类兜底是死的。建议 `by` 用分支而不是动态 key 拼 `Record<string, unknown>`。
- **今晚的缓存失效**：`useVideoMutations`（`:360-366`）、`useShopMutations`（`:609-614`）、`useAccountMutations`（`:417-422`）的失效范围与 queryKey 前缀对得上，没有明显漏项（除了 S11 的重复请求、S13 的手工 invalidate）。
- **无障碍补齐**（LiveView/MusicView 可点行加 `role`/`tabIndex`/`onKeyDown`）：写法正确，`preventDefault` + 空格/回车都覆盖了。

---

## 附：复现命令

```bash
BASE=$(git log --format=%H --since="2026-11-10 18:00" | tail -1)^
git diff $BASE..HEAD -- src/ > /tmp/review_diff.txt   # 5631 行
npx tsc --noEmit                                       # 通过

# A. 导出但零引用（排除声明行本身）
#    → 见 4.1 表
# B. CSS 类 / CSS 变量是否被 TSX 引用
#    → 见 4.3 / 4.4
# C. endpoint 方法是否被 UI / queries 引用
#    → 见 4.5（注意跨行调用 `mediaApi\n.move(` 会被正则漏掉，需人工确认）
```

> 脚本在临时目录（`/tmp/audit/*.mjs`），未写入仓库。如需固化成 CI 检查，可把 B / C 两个扫描改成 `scripts/audit-dead-code.mjs` 并接入 `npm run build`（这一项建议单独做，避免与本次改动混在一起）。
