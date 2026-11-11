# 重构收尾记录

这一轮按 `refactor-audit-{code,ui,api}.md` 三份审查报告做完了「必须」「价值高」「价值中」全部条目。
本文只记两件事：**做了什么**、**哪些刻意不做以及为什么** —— 后者是为了不再被重新讨论一遍。

期间新增 40 个提交，`src/` 净变化 +100 行（1678 增 / 1578 删，主要是新组件的注释）。

---

## 一、新建的复用单元

| 单元 | 位置 | 收掉了什么 |
|---|---|---|
| `<Tabs>` | `components/Tabs.tsx` | 13 处页内切换，其中两处漏 aria |
| `<ListCard>` | `components/ListCard.tsx` | 11 处手算的列表动画 key |
| `<CardHead>` | `components/CardHead.tsx` | 18 处「左标题 + 右操作」，右侧原有五种写法 |
| `<StatCard>` | `components/StatCard.tsx` | 十几个大数字卡片样板；同时消掉 42/44 两档字号 |
| `<PickList>` | `components/PickList.tsx` | 5 份「搜索 → 选一条」候选列表 |
| `<ProductToolbar>` | `components/ProductToolbar.tsx` | 商城 / 店铺两处工具栏 |
| `<CardTable>` | `components/CardTable.tsx` | 卡片内表格的加载 / 空 / 有数据三态 |
| `<Price>` / `formatPrice()` | `components/Price.tsx` | 4 处「现价 + 划线原价」判断 |
| `<InlineSortInput>` | `components/InlineSortInput.tsx` | 2 处行内排序输入 |
| `DecisionShell` / `useDecisionKeys` | `ui/decision.tsx` | 确认框与输入框两份宿主外壳 |
| 浮层栈 | `ui/layers.ts` | 「谁在最上层」的判断从两套收成一处 |
| `useDebounced` | `lib/useDebounced.ts` | 9 处 350ms 输入防抖 |
| `rowLink()` | `lib/rowLink.ts` | 8 处可点表格行；顺带修了片单列表键盘不可达 |
| `confirmDelete()` | `ui/confirm-delete.ts` | 3 处「自己的只确认、别人的填理由」 |
| `ClearSearchButton` | `components/StateBlock.tsx` | 4 处「清空搜索」 |

## 二、修掉的真 bug（不是风格问题）

按发现顺序：

1. **编辑商品会把它下架、库存清零、价格改成 1** —— 编辑时先拉详情再 merge，拉取失败被静默吞掉，保存时 `price ?? 1 / stock ?? 0 / is_up ?? false` 把缺失字段当成新值。
2. **`.badge,` 悬空逗号** —— 选择器被解析成 `.badge, .btn[aria-busy]`，全站每个 badge 常驻 `opacity: .6`。
3. **`.card-head .btn` 压所有按钮** —— 卡片头里写 `btn--ghost` 会静默降级成 `btn--quiet`。
4. **`.btn--danger-text` 自带尺寸** —— 混进 `.action-group` 后基线和兄弟按钮差 12px（六处操作列）。
5. **演职员 8 张卡片 key 全是 `null`** —— `person.id` 实测 39/39 为 null。
6. **密码为 null 时复制出字符串 "null"**。
7. **「· 题材」永远不会显示** —— `with_genre` 是另一个接口的参数。
8. **改备注会把旧排序写回去** —— 弹窗打开时把整行拷进 state。
9. **关掉二级弹层会连一级一起关** —— 「谁在最上层」有两套判断。
10. **`data-fallback` 设了但 CSS 从没有这条规则** —— 商品封面兜底从未生效。
11. **下拉/数字输入的显式宽度被 `.input` 的 `min-width: 200px` 盖掉** —— 两处宽度一直是死的。
12. **`.table--inset` 用在了 `.table-card` 里** —— 列表内容贴到卡片边框。
13. **移动资源弹窗的搜索防抖没有 `clearTimeout`** —— 连打六个字发六次请求。
14. **片单列表行键盘不可达**。
15. **音乐片单缺五个动作按钮** —— 影视/音乐两份复制，音乐那份少了一半。
16. **900–1240 宽度之间表格被裁掉且没有滚动条** —— 横向滚动规则只写在
    `max-width: 900px` 那组，而内容区在 ≤1240 就已经装不下表格。1024 宽的
    窗口里「操作」列直接看不到。已把规则挪到 1240 断点。

## 三、刻意不做的，以及理由

**不要因为「看起来可以合并」去动这些。**

| 项 | 理由 |
|---|---|
| `.cards + .table-card / .toolbar / section { margin-top: 24px }` | 这是相邻兄弟补间距的正确用法，不是补丁。只删了其中的死选择器 `.media-grid` |
| `Pager` 内部的 5 处内联尺寸 | 全部封装在组件内部不外溢；改成类只是把数字挪到 CSS，78 行的组件不值得为此加 4 个类 |
| 把 13.5 / 12.5 / 11.5 三档字号 token 化 | 只是换个地方记数字。三档已各有 `.text-sm` / `--text-sm` / `.meta-sm` 可复用 |
| 间距 token（`--s-1`…`--s-9`） | 已删除。**不要**反过来为了「用上 token」把 200+ 处内联一次性替换——那是最大的回归风险源 |
| `Modal` 的 `width` 五档 | 收成常量即可，不必做成 size 枚举 props |
| `.tab` 与 `.seg` 选中态视觉接近 | 两者用途不同（页面级切换 / 页内筛选）。不要再造第三套视觉 |
| 登录页 `.login__card` 的圆角 14 | 单页氛围，更小的卡片更「硬」，与 `--r-card` 的差别在那一屏里是有意的 |
| `content-in` 的 160ms 淡入 | 克制，只在不换页时淡入一次，符合项目取向。不要加更多动画 |
| 暂存区（`/api/upload/store/*`） | 已从代码里删除（界面 / API 封装 / mock / 文档）。要单独申请权限，管理员 token 也返回 `422 请先申请权限后使用`，等于对谁都不可用。形状留档在 `docs/api-shapes.md`，说明在 `docs/UPLOAD-PROTOCOL.md` |
| `uploadTemporary()` | 零引用，但 `docs/UPLOAD-PROTOCOL.md` 与 `docs/WIKI-NOTES.md` 都写了「能力先备着」。JSDoc 已标明「刻意保留，**不要**因为零引用删掉」 |
| `videoApi.list` 的 `todb_id` / `video_id` / `only_delete` | 接口层的可选参数，镜像 API。UI 层的 `useVideoPage` 已删掉用不到的三个 |
| 表格列宽的内联 `style={{ width: '12%' }}` | 每张表的列宽是那一张表的事实，抽成类反而要造出一堆单点类 |
| 剩余 4 处 `.input` 宽度覆盖 | 各有目的（Pager 内部、页头下拉），抽类的收益不抵风险 |

## 四、怎么验

```bash
cd /Users/xiangchengjie/Code/emos/emos.club
npx tsc --noEmit          # 应为 0 行输出
npm run build             # 应无 error

VITE_MOCK=1 npx vite --port 5276   # 共 24 个页面
```

回归时应确认：

- 每个页面有且仅有正确的 `.toolbar` 数量（商城是 1 个）
- 带 tabs 的页面恰好 1 个 `[role="tablist"]`、恰好 1 个选中项、`aria-label` 非空
- 三个详情页（影片 / 片单 / 歌曲）的头部封面都是 72×96
- 统计卡数值字号只有 44px 一档（概览页的紧凑待办卡 30px 是另一类）
- 可点行 `tabindex=0`、`cursor: pointer`，Enter / Space 能进
- 二级弹层（确认框 / 输入框 / 移动资源）按 Esc 只关它自己
- 1280 / 1024 / 820 三个宽度下都不出现页面横向溢出，窄屏表格能横向滚动

## 五、已知的、无法在前端解决的事

- 后端把 `/api/watch/{id}/video` 的 `page_size` 写死为 15（已用响应值算页数兜住）
- `/api/shop/product/list` 第 2 页偶发 504
- 全站「分类」接口必须带 `seller_id`，做不了跨店铺分类
- 音乐片单接口的 `page_size` 行为未验证（全站没有 music 类片单样本）
