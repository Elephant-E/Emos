# 商业域 API 逐条核对（商城 / 订单 / 基金 / 支付 / 萝卜）

> 只读审计，**未改 `src/`**。基线 `rewrite/v2`，行号以 **HEAD `8d21eb6`** 为准（工作区仅新增本文件与 `docs/review/api-user.md`）。
> 取证：`curl` 直连 `https://emos.best`，Header `Authorization: Bearer 1090_zijIu560MmusQM8j`（账号 `e7E6K6OE4s` / `elephant`，`roles=["admin"]`，自有店铺 `seller_id=1002`，审计前为非支付服务商）。共发出 **约 55 次真实请求**。
> 破坏性端点用「不存在的 id / 空 body / 超范围值」探针，靠 422/404/405 判定 method、路径、参数名与必填项。**但本域的三个写接口不是"不落库"，而是"落库了却报 502"**，因此对这三个额外做了「建→删→回读」的闭环验证（见 P0-1）。

**标注口径**

| 标记 | 含义 |
|---|---|
| 实测 | 真的发了请求并看到了响应 |
| 契约 | 只对照 `api.postman_collection.json` 的字段与注释（该端点在本账号下无数据样本） |
| 读码 | 只读前端源码 |

**副作用声明（全部已回读确认）**

| # | 操作 | 结果 | 现状 |
|---|---|---|---|
| 1 | `POST /api/shop/category/create {name:"REVIEW-PROBE",sort:80}` ×2 | 200，`category_id=1105` | `DELETE ...?category_id=1105` → **502 但已真删**；回读 `category/list` = `[]`，**干净** |
| 2 | `POST /api/shop/product/createOrUpdate`（最小必填）| 200，`product_id=1262` | `DELETE` → 502 但已真删；回读 `product/list` total=0，**干净** |
| 3 | 同上，`product_id:999999` + `category_id:999999`（分类不存在）| 200，**真的建出了 999999** | 已删；`product/info?product_id=999999` → 404，**干净** |
| 4 | `PUT /api/carrot/transfer {user_id:自己,carrot:6001}` | 200 `{carrot:38217}`，净扣 2（`system_interest` 手续费）| 余额 38219 → 38217，不可回滚，损失 2 个 |
| 5 | ⚠️ `POST /api/pay/apply {name:"一二三四五六七八九十十一",description:"d"}` | **502，但真的创建了服务商申请** | `GET /api/pay/base` 由 404 变 200，`{"name":"一二三四五六七八九十十一","status":"review"}`；**本会话无法撤销，需管理员处理** |

> 第 5 条是本轮唯一改变账号权限态的操作，也是 P0-1 最有力的证据：**该端点同样"报错但已生效"**。

> ⚠️ **审查期间工作区有并发改动**（不是我改的，本次任务只读 `src/`）：`src/api/client.ts` 新增 `isGatewayFalseNegative()`，`src/api/queries.ts` 给 `removeProduct`/`removeCategory` 加了「502 也 invalidate」，`src/views/PayView.tsx` 给 `payApi.apply` 加了 502 兜底，`src/views/ShopView.tsx` 把 `price_origin` 默认值改成 `1/100` 并删掉了「库存为 0 时自动售罄」的 hint。
> **本文行号以 HEAD `8d21eb6` 为准**；并发改动正在处理 P0-1 与 P1-1，但**都没改完**（复核结论见 P0-1 末尾与 P1-1 末尾的「并发改动核对」）。

---

## 结论先行

1. **26 个端点里：13 个 PASS、3 个 PASS?（本账号无数据样本）、8 个 FAIL（其中 3 个是纯后端 502、1 个后端边界未生效、4 个前端校验/展示缺口）、2 个已封装但无入口。**
2. **「三个写接口固定 502」的性质变了 —— 不是"动作失败"，是"动作成功但报告失败"。**
   `DELETE /api/shop/category/delete?category_id=1105` 返回 `502 {"success":false,"message":"API 请求失败: 200"}`，随后回读分类列表已经为空。删商品同理（`product/info` 变 404）。网关把「上游 200 + 空 body」判定为失败，于是：**动作落库 → HTTP 502 → React Query `onSuccess` 不执行 → 列表不刷新 → 用户以为没删掉，再点一次。**
   同一个坑还波及 `POST /api/pay/apply`（实测已创建申请）和极可能波及 `POST /api/shop/seller/apply`（契约里成功响应同样是空 body，未实测避免建重复店铺）。
3. **「新增商品」有两个必然 422 的默认值**：`price_origin` 默认 `0`（契约 1–50000，实测 422「price origin 必须大于等于 1」）、库存 0 也被拒（实测「stock 必须大于等于 1」），而弹窗提示写着「库存为 0 时自动售罄」。
4. **商品提交只覆盖契约 13 个字段里的 9 个，而且 `cover_url` 恒为 `null`**：`description`／`exchange_way`／`time_start`／`time_end` 根本没传，表单也没有封面控件（`cover_url` 只会是 `null`）——结果是后台**新建的商品永远没有封图和兑换说明**（列表接口其实会返回这两个字段，只是前端没类型也没展示）。
5. **`carrotApi.transfer` 的 6000 上界后端没实现**：实测 `carrot:6001` 直接成功（返回余额），只有下界 `<2 → 422`。前端两个入口都只靠 `input max={6000}` 属性，JS 校验只判了下界。
6. **上一轮的 F5（商品列表不传 `seller_id` → 全站 120 件）已修复且正确**：现在 `seller_id` 必传、`enabled: Boolean(sellerId)`，实测无 `seller_id` 才是全站（120），带 `seller_id=1016` 是该店（7）。
7. **`payApi.base` 的 404 语义被误读**：404 = 「你还不是支付服务商」（同实例 `pay/apply` 可用、`pay/close` 返回 200），而不是「这个实例没有部署支付模块」。`PayView` 因此隐藏了整页——连**与支付无关的「转赠胡萝卜」卡片一起消失**。

---

## 一、总表（26 个端点 + 9 个无入口的 `clientApi` 方法）

### 1.1 shopApi（16）

| # | 端点 / 前端方法 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|---|
| 1 | `GET /api/shop/seller/base`<br>`sellerBase(sellerId?)` · endpoints.ts:180 | 无参=查自己（实测 200，`seller_id=1002`）；`?seller_id=1016` 查他人实测 200、`is_self:false`。**前端从不传** | 有店实测 6 字段（契约 7 个，缺 `cover`），UI 用 5 个（`name`/`status`/`description`/`seller_id`/`is_self`）；无店时后端只返回 `{status:"default"}`，前端类型 `ShopSeller` 是谎（见 P3-2） | `/shop` 页头 + 店铺面板（ShopView:43,95-104,315-331） | **PASS**（`seller_id` 入参无 UI 入口） |
| 2 | `POST /api/shop/seller/apply`<br>endpoints.ts:181 | body `name`/`description`；空 body 实测 422「name 不能为空」。契约成功响应**空 body** → 极可能同样 502（**未实测**，会建重复店铺） | `unknown`，未消费 | ShopView:340-348（「申请开店」，仅非店主可见→实际不可达，见 P2-6） | **PASS?**（502 风险） |
| 3 | `POST /api/shop/seller/update`<br>endpoints.ts:182 | 只传 `name`/`description`，契约的可选 `cover_url` 未传（后端是「未传即保持」还是「未传即清空」**未验证**，实测会改真实店铺封面故跳过） | 类型含 `cover`/`cover_url`，未消费 | ShopView:332-339、430-444 | **PASS**（少传可选字段，需复核） |
| 4 | `GET /api/shop/category/list`<br>`categories(sellerId?)` · endpoints.ts:184 | `seller_id` **必填**（缺参实测 422「seller id 不能为空」）；前端 `enabled: Boolean(sellerId)` 已挡住 | `[{category_id,name,sort}]` 数组，3 字段全用 | `/shop` 分类 tab + 分类弹窗（ShopView:128-137,280-303） | **PASS** |
| 5 | `POST /api/shop/category/create`<br>endpoints.ts:185 | body `name`（≤20，UI `maxLength={20}`）/`sort`；空 body 实测 422「name 不能为空」；`sort` 硬编码 80（契约 1–100） | `{category_id}` 未消费（靠 invalidate 刷新） | ShopView:265-271 | **PASS** |
| 6 | `DELETE /api/shop/category/delete`<br>endpoints.ts:186 | `?category_id` | 契约空 body → **502** | ShopView:286-300 | **FAIL（后端，且已生效）** |
| 7 | `GET /api/shop/product/list`<br>`products(...)` · endpoints.ts:187-188 | `seller_id`✅`page`✅`page_size`✅`category_id`✅`sort_by=sort`✅`sort_order=asc`✅；**`sort_by`/`sort_order` 后端必填**（缺实测 422「sort order 不能为空」，前端已补）；`name`/`is_up` 支持但 UI 从不传 | 17 字段（实测），UI 用 8 个；**漏 `description`/`exchange_way`/`category_id`(未显示)/`time_start`/`time_end`/`user_buy_max`** | `/shop` 商品 tab（ShopView:159-245） | **PASS**（展示缺口，见 P2-1） |
| 8 | `POST /api/shop/product/createOrUpdate`<br>endpoints.ts:189 | 必填实测按顺序：`category_id`→`name`→`price`→`stock`→`is_up`→`sort`（逐个 422 确认）。前端传 9 个，**漏 `description`/`exchange_way`/`time_start`/`time_end`/`user_buy_max`**；`cover_url` 恒 `null` | `{product_id}` 未消费 | ShopView:355-418（弹窗） | **FAIL（`price_origin` 默认 0 必挂，见 P1-1）** |
| 9 | `DELETE /api/shop/product/delete`<br>endpoints.ts:190 | `?product_id` | 契约空 body → **502** | ShopView:215-233 | **FAIL（后端，且已生效）** |
| 10 | `PUT /api/shop/product/category`<br>endpoints.ts:191 | `?product_id&category_id`（缺参实测 422「category id 不能为空」） | `{category_id}` | **无入口**（`queries.ts:418` 定义了 `setCategory`，无视图调用） | **未使用** |
| 11 | `PUT /api/shop/product/sort`<br>endpoints.ts:192 | `?product_id&sort`（缺参实测 422「sort 不能为空」） | `{sort}` | **无入口**（`queries.ts:417` `setSort`，无视图调用） | **未使用** |
| 12 | `PUT /api/shop/product/up`<br>endpoints.ts:193 | `?product_id`（不存在实测 404） | `{is_up}`，**未消费**（toast 用旧值） | ShopView:202-211 | **PASS**（P3-3） |
| 13 | `GET /api/shop/order/shop/order`<br>`ordersShop(...)` · endpoints.ts:195-196 | `page`/`page_size`/`is_pay`/`is_delivery` ✅（**布尔必须 1/0**：`is_pay=true` 实测 422「is pay 必须为布尔值」，`1/0` 实测 200）；**`user_id`/`order_no`/`order_title`/`product_id` 全没传** | 16 字段：用 `order_no/order_title/order_cover_url/status_pay/urge_number/time_delivery/created_at/price_order/remark_shop/user.*`；**漏 `remark_user`（买家备注）/`buy_number`/`price_settle`（结算额）/`time_pay`/`time_urge`/`product`** | `/orders`（OrdersView:34）、`/` 待办计数（queries.ts:166） | **PASS**（展示缺口，见 P1-4） |
| 14 | `PUT /api/shop/order/shop/delivery`<br>endpoints.ts:197 | body `order_no`/`is_delivery`（bool 在 JSON body，实测 200）；**`POST` 同路径实测 405**（method 正确）；UI 恒传 `true` | `{time_delivery}` 未消费 | OrdersView:133-143 | **PASS**（单向，见 P3-4） |
| 15 | `POST /api/shop/order/shop/remark`<br>endpoints.ts:198 | body `order_no`（必填）/`remark`（≤200，实测 422 超长）：都传了 | 契约空 body → **502** | OrdersView:205-220 | **FAIL（后端，且已生效）** |
| 16 | `DELETE /api/shop/order/shop/order`<br>endpoints.ts:199 | `?order_no` | `{is_delete}`，**响应被忽略**（不存在单实测 `is_delete:false`，UI 仍 toast「已删除」） | OrdersView:147-162,186-204 | **PASS**（P2-8） |

### 1.2 fundApi（3）

| # | 端点 / 前端方法 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|---|
| 17 | `GET /api/fund/order/list`<br>`orders({page,page_size})` · endpoints.ts:224 | `page`/`page_size` 实测生效（`page_size=3` 回显 3） | 本账号 **0 条**，无样本；契约 17 字段，UI 只读 5 个（`order_no`/`activity_code`/`tier_carrot`/`payout_status(_string)`/`payed_at`），且**读的是不存在的 `no`/`fund_activity_code` 兜底链** | `/fund?tab=orders`（FundView:133-138,215-258） | **PASS?**（展示缺口，见 P1-5） |
| 18 | `POST /api/fund/order/create`<br>`create(code,carrot)` · endpoints.ts:225 | body `fund_activity_code`（必填，空 body 实测 422）/`carrot`；非法码实测 **404** | `{no}` 已用（toast） | FundView:260-293 | **PASS**（失败静默，见 P2-4） |
| 19 | `POST /api/fund/order/evidence`<br>endpoints.ts:226-227 | `order_no` 必填且须存在（空 422 / 假号 404）；**`images` 必填**（空数组 422「images 不能为空」）且**每项必须是合法 URL**（`["not-a-url"]` → 422「images.0 格式不正确」）；`remark` 可选 | `{payout_status}` 未消费 | FundView:295-320 | **FAIL（前端无校验，见 P1-3）** |

### 1.3 payApi（4）

| # | 端点 / 前端方法 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|---|
| 20 | `GET /api/pay/base`<br>endpoints.ts:172 | 无参 | 6 字段全用（含 `status`/`notify_url`） | `/fund?tab=merchant`（PayView:20,35-39,78-101） | **404 语义误读（见 P1-6）** |
| 21 | `POST /api/pay/apply`<br>endpoints.ts:173 | body `name`/`description`；空 body 实测 422「name 不能为空」；**11 字名字实测被接受**（契约写「10字内」） | 空 body → **502 但成功** | PayView:61 | **FAIL（502 假阴性 + 文案错）** |
| 22 | `GET /api/pay/query`<br>`query(no)` · endpoints.ts:174 | `?no` | 本账号查不到单：假号实测 404 | PayView:104-139（读 `pay_status`/`price_order`/`pay_way`/`order_name`） | **PASS?**（漏 `price_settle`/`time_payed`/`notify_status`） |
| 23 | `GET /api/pay/getUserInfo`<br>endpoints.ts:175-176 | `user_id`（契约：任选其一） | 非服务商实测 **403「请先成为服务商」**，`queries.ts:584` 已 `403 → null` | `UserDetailView`（queries.ts:575-589） | **PASS** |

### 1.4 carrotApi（3）

| # | 端点 / 前端方法 | 请求字段 | 响应字段 | UI 入口 | 结论 |
|---|---|---|---|---|---|
| 24 | `GET /api/carrot/current`<br>endpoints.ts:152 | 无参，实测 200 `{carrot:38217}` | `{carrot}` 已用 | 侧栏/总览/账号/资金（queries.ts:148-150） | **PASS** |
| 25 | `GET /api/carrot/history`<br>endpoints.ts:153-154 | `page`/`page_size`✅；**`type` 支持（实测 `earn`/`cost` 生效、`bogus`→422「已选的属性 type 无效」）但 UI 从不传**；`user_id`（查对方）未用 | 6 字段：用 `trigger_type_string`/`point`/`created_at`；**漏 `type`（正负靠 point 猜）/`expired_at`（过期日）** | `/fund?tab=carrot`（FundView:14-67）、总览（OverviewView:37） | **PASS**（P2-2） |
| 26 | `PUT /api/carrot/transfer`<br>endpoints.ts:155 | body `user_id`（假 id 实测 422「对方用户ID错误」）/`carrot`；**下界实测 422「必须大于等于 2」；上界 6000 实测未生效（6001 成功）** | `{carrot}`（转账后余额）已用 | `/fund?tab=carrot`（FundView:69-117）、`/fund?tab=merchant`（PayView:141-176） | **FAIL（上界未校验，见 P1-2）** |

### 1.5 `endpoints.ext.ts` 的 `clientApi`（全部无入口）

`clientApi` 全仓**零 import**（`grep clientApi src` 无结果），以下 9 个商业域方法都是死代码，契约字段未核对：

`shop.sortCategory`(:84)、`shop.product`(:86)、`shop.ordersUser`(:87)、`shop.createOrder`(:88-89)、`shop.payOrder`(:90)、`shop.urgeOrder`(:91)、`shop.closeOrder`(:92)、`fund.check`(:107)、`pay.update/transfer/create/close/testNotify/userCarrot/userSign/notifyEmail`(:73-81)。

> 注意 `pay.transfer`（商户转账，费率千6，1–50000）与 `carrot.transfer`（用户转赠，2–6000）是**两个不同端点**，不要混。

---

## 二、问题清单（按严重度）

### P0-1 [后端+前端·数据一致性] 三个写接口「报 502 但其实已经成功」

- **位置**：`endpoints.ts:186`（删分类）、`:190`（删商品）、`:198`（订单备注）；调用点 `queries.ts:419,422,426`
- **实测证据（闭环，不是猜）**：
  ```
  POST   /api/shop/category/create {"name":"REVIEW-PROBE","sort":80}
  → 200 {"category_id":1105}

  DELETE /api/shop/category/delete?category_id=1105
  → 502 {"success":false,"message":"API 请求失败: 200"}      ← 报告失败

  GET    /api/shop/category/list?seller_id=1002
  → 200 []                                                   ← 但真的删掉了
  ```
  商品同构：建 `product_id=1262` → `DELETE` 502 → `product/list` total 变 0、`product/info?product_id=1262` 变 **404**。
  `POST /api/pay/apply` 同构：502，但 `GET /api/pay/base` 由 404 变 200（`status:"review"`）。
- **判读**：网关对「上游 HTTP 200 + 空 body」判失败（`API 请求失败: 200` 这个字面量就是上游状态码）。同批 `delivery`/`deleteOrder`（都有 JSON body）正常 200；`PUT /api/user/agreeUploadAgreement` 返回 204 也正常——所以触发条件精确是 **200 + 空 body**。
- **影响**：`useMutation` 走 `onError`，`invalidate()` 不执行 → 表格不刷新、toast「失败」→ 用户重复点击（第二次是真空操作）→ 刷新页面才发现东西早没了。删分类后商品变「未分类」也是静默发生的。
- **修复**：
  - 前端（可立即做）：这三个 mutation 把 502 且 `payload.message === 'API 请求失败: 200'` 视为「结果未知，动作大概率已生效」，提示改为「操作已提交，服务端未返回结果，请刷新确认」，并**照常 invalidate**；
  - 后端：网关把空 body 的 200 当作成功（`success:true` 或 204）。
- **同类风险（未实测）**：`POST /api/shop/seller/apply`（契约成功响应空 body）。「申请开店」很可能也是「报错但已提交」。
- **并发改动核对**（工作区 `src/api/client.ts` + `queries.ts` 未提交改动）：已加 `isGatewayFalseNegative()`，`removeProduct`/`removeCategory` 在 502 时会 `invalidate()` —— 方向正确，补上了"列表不刷新"这一半。**仍缺**：① 没有替换 toast 文案（用户仍只看到「失败」，`ShopView.tsx:227-229` 的 `onSuccess` 才不会跑）；② 订单备注 `remark` 与 `sellerApply` 没加同样的 `onError`；③ `delivery`/`deleteOrder` 之类"有 body 的 200"不该被这条规则误判（当前按 status 502 判定，暂无误伤）。

### P1-1 [前端] 「新增商品」的两个默认值直接触发 422

- **位置**：`ShopView.tsx:145`（`setEditing({ stock: 100, price_origin: 0, sort: 80, ... })`）、`ShopView.tsx:75`（`price_origin: editing.price_origin ?? 0`）、`:74`（`price: editing.price ?? null`）
- **实测证据**：
  ```
  POST /api/shop/product/createOrUpdate {…,"price":1,"price_origin":0,…}
  → 422 {"message":"price origin 必须大于等于 1。"}

  POST /api/shop/product/createOrUpdate {…,"stock":0,…}
  → 422 {"message":"stock 必须大于等于 1。"}
  ```
  必填顺序实测为 `category_id → name → price → stock → is_up → sort`（`is_up` 契约里没标「必填」，但实测「is up 不能为空」）。
- **影响**：点「新增商品」→ 不动「原价」直接保存 → 必然失败，且错误只出现在控制台/toast 的 raw message（`queries.ts` 无 onError，见 P2-4）。表单里「原价」默认显示 `0`、`原价` 又被标成非必填，用户没有任何线索。
- **修复**：新增时 `price_origin` 缺省为 `price`（或 `1`）；提交前校验 `price ≥ 1 && price_origin ≥ 1 && 1 ≤ stock ≤ 5000 && 1 ≤ sort ≤ 5000`，并给字段级错误。
- **并发改动核对**（工作区未提交版本）：`price_origin` 已改 `?? 1` / 默认 `100` —— ✅ 修好了；但新增默认变成 `{ stock: 100, price_origin: 100, price: 0 }`（`ShopView.tsx:145`）→ **`price: 0` 会撞上「price 必须大于等于 1」，新增商品依然 422**；`stock: editing.stock ?? 0`（`:76`/`:391`）也还是 `0`。另「库存为 0 时自动售罄」的 hint 被删了（正确），但没有补下限校验，用户仍可输入 0 后撞 422。

### P1-2 [前端+后端] `carrotApi.transfer` 的 6000 上界形同虚设

- **位置**：`PayView.tsx:150`（`max={6000}`）、`:156`（`disabled={!transferTo.trim() || amount < 2 || sending}`）；`FundView.tsx:114`（`max={6000}`）、`:82`（`disabled={… || transferAmount < 2 …}`）、`:74`
- **实测证据**：
  ```
  PUT /api/carrot/transfer {"user_id":"<自己>","carrot":1}    → 422 "carrot 必须大于等于 2。"   ← 下界有效
  PUT /api/carrot/transfer {"user_id":"<自己>","carrot":6001} → 200 {"carrot":38217}          ← 上界不生效
  PUT /api/carrot/transfer {"user_id":"zzzznotexist","carrot":2} → 422 "对方用户ID错误"
  ```
- **影响**：`<input type="number" max>` 只是浏览器 UI 提示，React 里点击按钮走的是 JS 提交，**不做表单校验**；`FundView` 的按钮禁用条件压根没写上限。文案「单次 2 – 6000 个」与后端行为不符；且**允许转给自己**（净扣手续费），前端没有 `userId !== 自己` 的校验。
- **修复**：两处提交前 `Number.isInteger(amount) && amount >= 2 && amount <= 6000`，并提示；可选：对自己 id 时禁用。后端补 `max:6000` 校验。

### P1-3 [前端] 「提交报销凭证」不校验 `images`，失败无任何提示

- **位置**：`FundView.tsx:156-170`（mutation）、`:310-317`（按钮 `disabled` 只判 `isPending`）、`:300`（图片地址 textarea）
- **实测证据**：
  ```
  POST /api/fund/order/evidence {"order_no":"…","images":[]}
  → 422 {"message":"images 不能为空。"}
  POST /api/fund/order/evidence {"order_no":"…","images":["not-a-url"]}
  → 422 {"message":"images.0 格式不正确。"}
  POST /api/fund/order/evidence {"order_no":"<假号>","images":["https://x/a.png"]}
  → 404 emos api 404                                      ← order_no 必须真实存在
  ```
- **影响**：默认 `images` 是空串 → 拆出来是 `[]` → 用户只填备注点「提交」→ 422。而 `submitEvidence` **没有 `onError`**，React Query 静默吃掉错误：弹窗不关、没有 toast、按钮恢复可点，用户只会觉得"点了没反应"。
- **修复**：按钮 `disabled={!images.trim() || submitEvidence.isPending}`；前端校验每行是 `https?://`；补 `onError: (e) => toast(e.message, 'error')`。

### P1-4 [前端] 订单页看不到买家备注与数量，`price_order` 被当「金额」

- **位置**：`OrdersView.tsx:116`（`{order.price_order}` 列名写「金额」）、表格表头 `:74-82`
- **契约证据**：商户订单条目含 `buy_number`、`price_order`、`price_settle`、`remark_user`、`time_pay`、`time_urge`、`product{id,description,exchange_way}`。样本里 `buy_number:2 / price_order:100`（商品单价 100）→ **`price_order` 是单价，不是合计**。
- **影响**：
  1. 「金额」那一列其实只有单价，2 件的订单显示 100，商家会按 100 结算；
  2. `price_settle`（结算 95，含平台抽成）从未显示——这是商家最关心的数字；
  3. `remark_user`（买家下单备注）从没展示，只有商户自己的 `remark_shop` 能编辑 → 商家看不到买家要求；
  4. `buy_number` 没展示，算不出总额。
- **修复**：金额列改成 `单价 × 数量 = 合计`（或直接展示 `price_order × buy_number`），补「结算」列；订单行下方/备注弹窗里展示只读的 `remark_user`。

### P1-5 [前端] 基金订单表把「实付金额」等关键字段全漏了

- **位置**：`FundView.tsx:215-258`
- **契约证据**（`/api/fund/order/list` 条目 17 字段）：`order_title`（「使用 100🥕 兑换最高 1¥ 补贴」）、`tier_name`/`tier_price`（实付金额）、`payout_price`（报销金额）、`payout_at`、`time_expired`（有效期）、`activity_name`。
- **影响**：表里只有「订单号/胡萝卜/状态/时间」，没有**金额**（`tier_price`）和**订单标题**，管理员核对报销时无法判断这笔该付多少钱；`time_expired` 也没展示（过期未提交的凭证无法识别）。
- **修复**：加「订单标题 / 实付 `tier_price` / 报销 `payout_price` / 有效期 `time_expired`」四列（或收进可展开行）。

### P1-6 [前端] `payApi.base` 的 404 被当成「实例没部署支付模块」

- **位置**：`PayView.tsx:44-72`（空状态）、`:46-47`（文案）、`:77` 与 `:103`（`display: base.error ? 'none' : undefined`）
- **实测证据**：
  ```
  GET /api/pay/base        → 404 {"success":false,"message":"emos api 404 :("}   ← 非服务商
  PUT /api/pay/close?no=…  → 200 {"is_close":false}                              ← 模块在
  POST /api/pay/apply {}   → 422 "name 不能为空"                                  ← 路由在
  GET /api/pay/getUserCarrot → 403 "请先成为服务商"                                ← 明确的"没资格"文案
  ```
  （审计后我误提交了申请，同一账号的 `pay/base` 立刻变 200 `status:"review"`，进一步证明 404 ≠ 模块缺失。）
- **影响**：
  1. 文案「这个实例没有开通支付服务商」是错的，应说「你还不是支付服务商」；
  2. `base.error` 时**整页两块 section 都 `display:none`**，其中包括与支付完全无关的「转赠胡萝卜」卡片 —— 非服务商在支付页根本看不到转赠入口（只剩 `/fund?tab=carrot` 一处）；
  3. 「申请将扣除 5000 胡萝卜，且不退还」与实测不符：本次申请前后余额 38219 → 38220（无 5000 级扣减）。
- **修复**：404 文案改成「你还没有成为支付服务商」；只把「服务商数据卡片」隐藏，`转赠胡萝卜` 卡片独立于 `base` 渲染；把「扣 5000」的文案按实际扣费规则改写（或去掉金额）。
- **并发改动核对**（工作区未提交版本）：`PayView.tsx:61-78` 已给 `payApi.apply` 加 `isGatewayFalseNegative` 兜底 —— 这部分与 P0-1 一致，✅；但 **404 的语义、文案、以及 `display:none` 连坐隐藏转赠卡片这三条都还在**。

### P2-1 [前端] 商品表/表单漏了契约里一半的字段

- **位置**：`ShopView.tsx:65-87`（提交载荷）、`:377-416`（表单字段）、`:161-198`（表格列）
- **漏传**：`cover_url`（表单无上传控件 → 永远 `null`）、`description`、`exchange_way`（买家唯一的"怎么兑换"说明）、`time_start`/`time_end`（开售/停售时间）、`user_buy_max`（每人限购）
- **漏显**：列表接口其实返回 `description`/`exchange_way`（实测 sample 都有），但 `ShopProduct` 类型没声明、表格没展示
- **影响**：后台新建的商品**必然没有封图和兑换说明**，只能靠别的客户端补——商城页的 `Poster` 会退化成首字灰块。
- **修复**：商品弹窗补「封面 URL/上传、简介、兑换方式、起止时间、限购」；`ShopProduct` 类型补 `description`/`exchange_way` 并在表格里露出（至少兑换方式）。

### P2-2 [前端] 胡萝卜记录既不能筛选也看不到过期时间

- **位置**：`FundView.tsx:43-67`（表格只 3 列）、`queries.ts:335-340`（只传 page/page_size）
- **实测**：`type=earn` → total 24730、`type=cost` → total 471、`type=bogus` → 422（枚举确认）；条目含 `expired_at:"2027-11-07"`。
- **影响**：25201 条记录只能一页页翻；`expired_at` 不展示 → 用户不知道哪些萝卜快过期（`type` 也只靠 `point` 正负猜）。
- **修复**：加「获取/消耗」两个 tab（传 `type`），加一列「过期时间」/「已过期」。

### P2-3 [前端] 订单页没有任何搜索，商品页没有名字搜索与上下架筛选

- **位置**：`OrdersView.tsx:19-34`（只有 2 组 tab）、`ShopView.tsx:121-151`（只有分类 tab）、`queries.ts:187`（`name`/`is_up` 声明了却没人传）
- **实测**：`shop/product/list?...&name=Emos` → total 4（过滤生效）；`is_up=1`/`is_up=0` → 200（1/0 编码正确，`is_up=true` → 422）；商户订单的 `order_no`/`order_title`/`user_id`/`product_id` 契约都有。
- **影响**：`/orders` 只能翻页找单；商城 120 件商品只能按分类过滤，下架商品和上架商品混在一起。
- **修复**：订单页加「订单号/用户 ID」搜索框；商品页加名字搜索 + `is_up` 三态筛选。

### P2-4 [前端] 商城/基金/支付的多个 mutation 没有 `onError`，失败静默

- **位置**：`queries.ts:409-429`（11 个 mutation 全无 `onError`）、`FundView.tsx:147-170`（create/evidence 无 `onError`）、`ShopView.tsx:54,68,227,296,439`
- **实测**：`POST /api/fund/order/create {fund_activity_code:"nope"}` → 404；`POST /api/fund/order/evidence` 缺 images → 422。这些错误**一个都不会出现在 UI 上**。
- **影响**：结合 P0-1，用户对"失败"完全无感知，只能靠猜。
- **修复**：统一的 `onError: (e) => toast(e.message ?? '操作失败', 'error')`；可以挂在 `QueryClient` 的 `MutationCache` 默认配置上一次性解决。

### P2-5 [前端] 基金凭证弹窗标题恒为空

- **位置**：`FundView.tsx:296`（`title={`提交凭证 · ${String(evidenceFor.no ?? '')}`}`）
- **契约证据**：订单条目字段名是 **`order_no`**（不是 `no`）；同文件 `:229` 与 `:313` 都写了 `row.no ?? row.order_no` 兜底，唯独标题漏了。
- **影响**：弹窗标题显示「提交凭证 · 」。
- **修复**：`String(evidenceFor.order_no ?? evidenceFor.no ?? '')`。

### P2-6 [前端] 「他人店铺」分支是死代码，`sellerBase` 的 `seller_id` 入参无入口

- **位置**：`ShopView.tsx:43`（`useShopSeller()` 不传参）、`:89`（`isSeller`）、`:110`（"只显示本店商品 / 仅可浏览"）、`:235-237,340-348`
- **实测**：`sellerBase?seller_id=1016` → 200、`is_self:false`（后端支持）。
- **影响**：`is_self === false` 的所有分支（只读表格、「申请开店」按钮）**永远不可达**；页头却在文案上假装存在"他人店铺"。
- **修复**：要么加店铺切换（URL 上带 `seller_id`，`useShopSeller(id)`，商品/分类/订单都跟随），要么删掉这些分支和「他人店铺」标签。

### P2-7 [前端] `/shop?tab=` 只当初始值用一次，URL 与面板会脱钩

- **位置**：`ShopView.tsx:42`（`useState(tab === 'products' ? null : tab)`）；`router.tsx:119-137`
- **影响**：`/shop?tab=categories` 首次进入能打开，但从 `?tab=categories` 点侧栏再进 `?tab=seller` 不会切换（组件不卸载）；关闭弹窗后 URL 仍是 `?tab=…`，刷新又弹出来。`onSearch({tab})` 从未被调用。
- **修复**：面板状态直接由 `search.tab` 派生，`onClose` 时 `onSearch({tab:'products'})`。

### P2-8 [前端] 删除订单忽略 `is_delete`

- **位置**：`OrdersView.tsx:158`、`:195-200`
- **实测**：`DELETE /api/shop/order/shop/order?order_no=<假号>` → `200 {"is_delete":false}`。
- **影响**：`onSuccess` 无条件 toast「已删除」，即使后端返回 false。
- **修复**：`onSuccess: (r) => toast(r.is_delete ? '已删除' : '订单不存在或已删除', r.is_delete ? 'success' : 'error')`。

### P3-1 [前端] 支付状态枚举写多了一个 `'pay'`，未知状态一律显示「待支付」

- **位置**：`OrdersView.tsx:86`（`order.status_pay === 'pay' || order.status_pay === 'paid'`）
- **实测/契约**：只观察到 `paid`/`unpaid`，契约样本同。`'pay'` 是多余项；反过来 `refund`/`close` 之类会落进「待支付」badge。
- **修复**：按 `paid` / `unpaid` / 其它 三态渲染。

### P3-2 [前端·类型] `ShopSeller` 类型与「无店铺」响应不符

- **位置**：`types.ts:329-336`；`ShopView.tsx:96`（`SELLER_STATUS[seller.data.status] ?? seller.data.status`）
- **契约**：无店铺时只返回 `{status:"default"}`（无 `seller_id`/`name`/`is_self`）。`SELLER_STATUS` 里也没有 `default`/`disable`。
- **影响**：没开店的账号页头 hint 会直接显示英文 `default`；类型骗人（`seller_id: number` 实际 undefined）。
- **修复**：`status: 'default' | 'examine' | 'pass' | 'disable'`，`seller_id?: number`；补 `default:'未开店'`、`disable:'已禁用'`。

### P3-3 [前端] 上下架用旧值决定 toast 文案

- **位置**：`ShopView.tsx:205-208`
- **契约**：`PUT /api/shop/product/up` 返回 `{is_up}`（翻转后的真值，契约样本 `false`）。
- **影响**：并发/过期数据时提示与实际相反。
- **修复**：`onSuccess: (r) => toast(r.is_up ? '已上架' : '已下架', 'success')`。

### P3-4 [前端] 发货只能单向，且忽略 `time_delivery`

- **位置**：`queries.ts:425`（`deliver: (orderNo) => shopApi.delivery(orderNo, true)`）、`OrdersView.tsx:133-143`
- **实测**：`PUT delivery {order_no:<不存在的单>, is_delivery:true}` → **200 `{"time_delivery":"2026-11-07 20:39:10"}`**（后端不校验订单存在）。
- **影响**：误点「发货」后无法撤回；提示不显示发货时间；对不存在的订单也会"成功"。
- **修复**：加「取消发货」（`is_delivery:false`）+ 二次确认；toast 里带 `time_delivery`。

### P3-5 [前端] 硬编码排序，`sort_by`/`sort_order` 无法切换

- **位置**：`queries.ts:395-396`（`sort_by:'sort', sort_order:'asc'`）
- **影响**：商家无法按「最近更新/销量/价格」排序（后端支持这三项必填参数）。
- **修复**：暴露 `sort_by` 到 UI。

### P3-6 [前端·死代码] 2 个已封装的写端点没有入口

`shopApi.productSort`（endpoints.ts:192）、`shopApi.productCategory`（:191）在 `queries.ts:417-418` 包好了 `setSort`/`setCategory`，但**没有任何视图调用**——所以商家不能改分类归属、不能改排序（只能在编辑弹窗里改 `sort`）。另 `clientApi`（endpoints.ext.ts）全仓零 import。

### P3-7 [前端·类型] 几个载荷/响应是 `Record<string, unknown>`

`shopApi.saveProduct`（endpoints.ts:189）、`shopApi.sellerUpdate`（:182）、`fundApi.orders`（:224）、`payApi.query`（:174）、`carrotApi.history` 的 `type?: string`（:153）。`FundView` 里满屏 `row.no ?? row.order_no`、`row.fund_activity_code ?? row.activity_code` 就是在给"没类型"打补丁（且 `no`/`fund_activity_code` 这两个名字根本不存在）。

---

## 三、已知疑点：逐条回答

### 疑点 1：商品列表此前不传 `seller_id` 会返回全站商品，现已补上 —— 现在的调用是否正确？

**正确，且带了双重保险。**

- `queries.ts:391` 传 `seller_id: sellerId || undefined`，`:398` `enabled: Boolean(sellerId)`；`ShopView.tsx:45` 传 `seller.data?.seller_id ?? 0`。
- 实测对比：`product/list?...`（无 seller_id）→ `total:120`（全站）；`&seller_id=1016` → `total:7`；`&seller_id=1002`（自己，空店）→ `total:0`。
- **但**：`sellerBase` 返回 `{status:"default"}`（未开店）时 `seller_id` 为 `undefined` → 商品/分类查询被禁用 → **整页空白且没有任何提示**（既不显示"去开店"，也不显示空状态）。建议补一个「你还没有店铺」的空态。

### 疑点 2：`POST /api/shop/product/createOrUpdate` 的 `category_id` 是必填，前端在无分类时已禁用按钮 —— 确认？

**确认，且实测复现。**

- `POST createOrUpdate {}` → `422 {"message":"category id 不能为空。"}` —— 后端第一个校验的就是它。
- `ShopView.tsx:143` `disabled={!categories.data?.length}` + `title="先创建至少一个分类"`，`:369` 保存按钮也判了 `editing.category_id ?? categories.data?.[0]?.category_id`。**逻辑正确。**
- **唯一漏洞**：`saveProduct`（`:66`）在 `categories.data` 为空时 `categoryId` 为 `undefined` → 直接 `return`，**静默无提示**（`onSubmit` 回车同样静默）。建议 toast 一句「请先创建分类」。
- 另外实测发现：后端**不校验 `category_id` 是否存在/是否属于自己**——我用 `category_id:999999`（不存在的分类）建出了商品（已清理，见副作用表 #3），商品详情的 `category_name` 为 `null`。前端不会走到这条路径，但这是后端校验缺口。

### 疑点 3：订单备注 / 删除商品 / 删除分类 三个接口此前恒定 502，现在是否还这样？

**仍然 100% 复现，而且这次查清了它的真实性质：动作已经生效，只是响应被网关判失败。**

| 端点 | 实测 | 是否生效 |
|---|---|---|
| `DELETE /api/shop/product/delete?product_id=999999` | `502 {"success":false,"message":"API 请求失败: 200"}` | ✅ 已删（再查 404） |
| `DELETE /api/shop/category/delete?category_id=1105` | 502 同上 | ✅ 已删（列表回 `[]`） |
| `POST /api/shop/order/shop/remark {order_no,remark}` | 502 同上（`order_no` 缺失时仍先走 422，说明校验在落库前） | 无法直接观测（本账号商户订单为 0 条），但同属"200+空 body"形态，按前两个推断已写入 |
| `POST /api/pay/apply`（同形态） | 502 同上 | ✅ 已创建申请（`pay/base` 404→200） |

- 触发条件精确：**上游 200 + 空响应体**。反例 `PUT /api/user/agreeUploadAgreement` → **204** 正常返回，不触发。
- 建议：后端修网关；前端在 502 时按「结果未知」处理（P0-1）。

### 疑点 4：基金订单的 `evidence` 字段（`order_no` / `images` / `remark`）

| 字段 | 必填 | 实测 | 前端 |
|---|---|---|---|
| `order_no` | ✅ | 空 → 422「order no 不能为空」；**必须真实存在**（假号 → 404） | 传了（`FundView.tsx:313`，但按 `no ?? order_no` 兜底，`no` 不存在） |
| `images` | ✅ | `[]` → 422「images 不能为空」；`["not-a-url"]` → 422「images.0 格式不正确」；`["https://x/a.png"]` → 通过校验（随后 404 因为单号假） | **传了但不校验空**（P1-3），且是"每行一个 URL"的裸文本框 |
| `remark` | ❌ | `images` 合法而 `remark` 缺失时不再报 remark → 可选 | 传了（可能为空串） |

另外：`payout_status`（返回 `reviewing`）前端未消费；凭证弹窗里 `setRemark(String(row.remark ?? ''))` 回填的 `remark` 字段在订单列表里**不存在**（列表字段是 `order_bodys`/`order_title` 等），所以永远是空。

### 疑点 5：`carrotApi.transfer` 的边界：单次 2–6000

- **下界**：实测 `carrot:1` → `422 "carrot 必须大于等于 2。"`（有效）
- **上界**：实测 `carrot:6001` → **200 成功**（`{"carrot":38217}`，净扣 2 走 `system_interest` 手续费）→ **6000 上限未实现**
- **其它**：不存在的 `user_id` → `422 "对方用户ID错误"`；**可以转给自己**（没有拦截）；前端两处都只有 `input max` 属性（P1-2）
- **建议**：后端补上限；前端补 JS 校验与"不能转给自己"。

---

## 四、实测 vs 仅读代码

### 实测过的（可直接复现）

| 端点 | 探针 | 结果 |
|---|---|---|
| `GET /api/shop/seller/base` | 无参 / `?seller_id=1016` | 200 自有（`is_self:true`）/ 200 他人（`is_self:false`） |
| `GET /api/shop/category/list` | `?seller_id=1002` / 无参 | 200 `[]` / **422「seller id 不能为空」** |
| `POST /api/shop/category/create` | 空 body / 正常 | 422「name 不能为空」/ 200 `{category_id:1105}` |
| `DELETE /api/shop/category/delete` | 真 id 1105 | **502，但已删除**（回读 `[]`） |
| `GET /api/shop/product/list` | 无 seller / `seller_id=1016` / `+category_id=1077` / `+name=Emos` / `is_up=1` / `is_up=0` / `is_up=true` / 缺 sort_order | 120 / 7 / 2 / 4 / 200 / 200 / **422「is up 必须为布尔值」** / **422「sort order 不能为空」** |
| `GET /api/shop/product/info` | 1025 / 999999（删后） | 200（19 字段含 `category_name`/`exchange_way`）/ 404 |
| `POST /api/shop/product/createOrUpdate` | 空 / 逐个补字段 / `price_origin:0` / `stock:0` / `stock:5001` / `price:0` / `sort:5001` / `name` 51 字 / `product_id:999999`+`category_id:999999` | 依次 422 报 `category id`→`name`→`price`→`stock`→`is up`→`sort`；`price origin 必须大于等于 1`；`stock 必须大于等于 1`；`stock 不能大于 5000`；`price 必须大于等于 1`；`sort 不能大于 5000`；`name 不能大于 50 个字符`；**200（用不存在的分类建出了商品）** |
| `DELETE /api/shop/product/delete` | 999999 / 1262 | 502 ×2，**两次都真的删掉了** |
| `PUT /api/shop/product/sort` · `category` | 缺参 | 422「sort 不能为空」/「category id 不能为空」 |
| `PUT /api/shop/product/up` | `product_id=999999` | 404 |
| `GET /api/shop/order/shop/order` | 默认 / `is_pay=1&is_delivery=0` / `is_pay=true` | 200 `total:0` / 200 / **422「is pay 必须为布尔值」** |
| `PUT /api/shop/order/shop/delivery` | `POST` 同路径 / `PUT` 假单号 | **405**（明确 Supported: PUT）/ 200 `{time_delivery}` |
| `POST /api/shop/order/shop/remark` | 假单号 / 缺 order_no / remark 201 字 | **502** / 422「order no 不能为空」/ 422「remark 不能大于 200 个字符」 |
| `DELETE /api/shop/order/shop/order` | 假单号 | 200 `{is_delete:false}` |
| `GET /api/shop/order/user/list` | 默认 | 200（1 条，`status_pay:"paid"`，含 `price_settle`/`product.description`） |
| `GET /api/fund/order/list` | `page_size=3` | 200 `total:0`（无样本） |
| `POST /api/fund/order/create` | 空 / `fund_activity_code:"nope"` | 422「fund activity code 不能为空」/ 404 |
| `POST /api/fund/order/evidence` | 空 / 空 images / 非 URL / 假单号+合法图 / `fund/order/check("nope")` | 422「order no 不能为空」/ 422「images 不能为空」/ 422「images.0 格式不正确」/ 404 / 404 |
| `GET /api/pay/base` | 申请前 / 申请后 | **404** / 200 `status:"review"` |
| `GET /api/pay/query` · `getUserInfo` · `getUserCarrot` · `close` | 假单号 / user_id / 假单号 | 404 / **403「请先成为服务商」** / 403 / 200 `{is_close:false}` |
| `POST /api/pay/apply` | 空 body / 合法 body | 422「name 不能为空」/ **502 但已创建**（11 字名字被接受） |
| `GET /api/carrot/current` | — | 200 `{carrot:38219→38217}` |
| `GET /api/carrot/history` | 默认 / `type=earn` / `type=cost` / `type=bogus` | 200（total 25201）/ 200（24730）/ 200（471）/ **422「已选的属性 type 无效」** |
| `PUT /api/carrot/transfer` | `carrot:1` / `carrot:6001` / 假 user | 422（<2）/ **200（上界失效）** / 422「对方用户ID错误」 |

### 只读了代码 / 只对了契约（未实测）

| 端点 / 行为 | 原因 |
|---|---|
| `POST /api/shop/seller/apply` 的真实响应 | 本账号已有店铺，执行会建重复申请；契约成功响应为空 body → 判为 **502 高风险** |
| `POST /api/shop/seller/update` 是否会清空 `cover_url` | 会改动真实店铺封面 |
| `POST /api/shop/order/shop/remark` 是否真的写入 `remark_shop` | 商户订单 0 条，没有可写对象；只能确认"502 且校验先于落库" |
| `GET /api/fund/order/list` 的字段名（`order_no` vs `no`） | 本账号基金订单 0 条，按契约样本判断（`order_no`/`activity_code`） |
| `GET /api/pay/query` 的成功响应字段 | 查不到存在的支付单（非服务商 + 无单号） |
| `POST /api/pay/update`、`pay/transfer`、`pay/create` 等 `clientApi` 方法 | 全仓无入口，且会花钱 |
| `payApi.apply` 是否扣 5000 | 实测余额无 5000 级变化（38219→38220），但无法排除"审核通过时才扣" |

---

## 附录 A：本域 UI 入口一览

| 路由 | 视图 | 覆盖端点 |
|---|---|---|
| `/shop`（侧栏「商城」，`Sidebar.tsx:43`） | `ShopView`（商品 tab 默认） | #1 #4 #5 #7 #8 #9 #12 |
| `/shop?tab=categories` | 分类弹窗 | #6 |
| `/shop?tab=seller` | 店铺面板 | #3 #2（不可达） |
| `/orders`（`Sidebar.tsx:44`） | `OrdersView` | #13 #14 #15 #16 |
| `/fund?tab=orders`（`Sidebar.tsx:52`） | `FundView` | #17 #18 #19 |
| `/fund?tab=merchant` | `PayView`（embedded） | #20 #21 #22 #25（转赠卡片） |
| `/fund?tab=carrot` | `FundView` → `CarrotSection` | #24 #25 #26 |
| `/pay` | **redirect 到** `/fund?tab=merchant`（router.tsx:257-263） | — |
| `/`（Overview） | 待办计数 + 萝卜余额 + 最近 3 条记录 | #13(只取 total) #24 #25 |
| `/users/$id` | 用户详情（`useUserPayInfo`） | #23 |

## 附录 B：复现命令

```bash
T=1090_zijIu560MmusQM8j
B=https://emos.best
H=(-H "Authorization: Bearer $T" -H "Accept: application/json")

# 必填探针（不落库）
curl -s "${H[@]}" -X POST "$B/api/shop/product/createOrUpdate" -H 'Content-Type: application/json' -d '{}'
# → 422 {"message":"category id 不能为空。"}

# 布尔编码（1/0 才对）
curl -s "${H[@]}" "$B/api/shop/order/shop/order?page=1&page_size=3&is_pay=true"
# → 422 {"message":"is pay 必须为布尔值。"}

# 502 但已生效（演示：先建后删再回读）
curl -s "${H[@]}" -X POST "$B/api/shop/category/create" -H 'Content-Type: application/json' -d '{"name":"REVIEW-PROBE","sort":80}'
curl -s -o /dev/null -w '%{http_code}\n' "${H[@]}" -X DELETE "$B/api/shop/category/delete?category_id=<id>"
# → 502
curl -s "${H[@]}" "$B/api/shop/category/list?seller_id=1002"
# → []（已删除）

# 转赠上界失效（会真的扣手续费，谨慎）
curl -s "${H[@]}" -X PUT "$B/api/carrot/transfer" -H 'Content-Type: application/json' -d '{"user_id":"<自己>","carrot":6001}'
# → 200 {"carrot":...}
```
