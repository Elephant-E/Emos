# wiki.emos.best 要点（14 页）

## 与实现相关的硬约束

| 来源 | 约束 | 代码状态 |
|---|---|---|
| /api/upload | getUploadToken 的 `type` 决定上传协议（tusd/r2/onedrive/google_drive/multipart） | ✅ 已按类型分流，tusd 真机验证 |
| /api/changelog 2026-04-09 | 字幕/图片暂停 r2，新增 tusd | ✅ |
| /api/changelog 2026-03-29 | 删除他人内容必须传 `reason` | ✅ 已传 |
| /api/changelog 2026-05-23 | 片单 `type` 新建必填 | ✅ |
| /api/changelog 2026-06-21 | 错误字段统一为 `message` | ✅ 客户端按 message 解析 |
| /api/changelog 2026-03-31 | 商户信息非商户返回 `status: default` 而非 404 | 已按 status 判断 |
| /proxy | 必须带 `X-FORWARDED-FOR` | ✅ 已补 CF-Connecting-IP |
| /api/use | 备用地址 `https://api.emos.best`（CF 403 时切换） | 未接 |
| /api/use | 名词：pn/vb/vl/vs/ve/vp/vm/vt | 已在类型里用 vl/ve |
| /introduction/carrot | 申请支付服务商扣 **5000** 胡萝卜、申请商户扣 **3000** | ✅ 支付页已加确认与明示 |
| /introduction/carrot | 萝卜境界：凡人期→练气→筑基→结丹→元婴→化神→炼虚→合体→大乘→真仙 | ✅ 概览显示当前境界与距下一境 |
| /more/temporary | 临时图床 `POST temporary.emos.best/upload`（file + emos_id，80MB 内） | 未接（红包用） |
| /api/watch | 动态片单由服务端每日 08/17 抓取外部 GET 接口 | 无需前端接入 |
| /api/link | token 仅用户手动重置时失效；`authorization: Bearer` 访问公开接口 | 登录页可说明 |

## 未实现的接口能力（wiki 有文档、后台无入口）

- `temporary.emos.best/upload` 临时图床（发红包要图片）
- 动态片单外部推送（服务端行为，前端无需做）
- Telegram 授权绑定（`/api/link` 的 bot 链接）

## 备注

wiki 写明「具体以 postman 为准」，字段级契约以 Postman 集合为第一来源；
wiki 用于补充 Postman 未写清楚的**行为语义**（如 score 扣除、等级表、上传协议分支）。
