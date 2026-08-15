# Dashboard 仪表盘组件审计文档

> 审计日期: 2026-06-13
> 目标风格: Apple Settings（macOS System Settings）
> 核心原则: 容器无边框、无 hover 效果、极简分组列表
> 最后更新: 2026-06-13 (Phase 1-5 已完成)

---

## 一、Apple Settings 风格规范

### 容器
- 无边框、无阴影、无毛玻璃
- 背景色: `var(--system-quaternary)` (半透明分组背景)
- 圆角: `var(--global-border-radius-large, 10px)`
- 内边距: 0（内容自行提供间距）

### 分组列表 (Settings Row)
- 每行高度: 44px (桌面) / 48px (移动端)
- 行内布局: `[图标] [标题] [描述/值] [箭头]`
- 图标: 28x28 圆角方形背景 + 白色 SF Symbol
- 分隔线: `0.5px solid var(--label-divider)`，首行无、末行无
- 选中态: 无 hover，点击时短暂高亮

### 统计/信息展示
- 标题: `var(--header-emphasized)` 字体
- 值: 大号加粗，`var(--system-primary)` 色
- 描述: `var(--system-tertiary)` 色

### 模态框
- 背景: `var(--glass-material-background)` + backdrop-filter
- 圆角: `var(--global-border-radius-large, 10px)`
- 无边框

---

## 二、当前组件清单

### 页面组件
| # | 组件 | 文件路径 | 复用 | 问题 |
|---|------|---------|------|------|
| 1 | DashboardView | `views/DashboardView.vue` | 否(路由页) | 无scoped style，大量内联style，bento-card有hover/边框/阴影 |

### 子组件 (Modal)
| # | 组件 | 文件路径 | 复用 | 问题 |
|---|------|---------|------|------|
| 2 | UploadRankModal | `components/dashboard/UploadRankModal.vue` | 否 | 大量内联style |
| 3 | SignRankModal | `components/dashboard/SignRankModal.vue` | 否 | 大量内联style |
| 4 | VoteModal | `components/dashboard/VoteModal.vue` | 否 | 大量内联style |
| 5 | ViewingModal | `components/dashboard/ViewingModal.vue` | 否 | 大量内联style |
| 6 | CarrotModal | `components/dashboard/CarrotModal.vue` | 否 | 大量内联style |
| 7 | InviteModal | `components/dashboard/InviteModal.vue` | 否 | 大量内联style |
| 8 | RedpacketModal | `components/dashboard/RedpacketModal.vue` | 否 | 大量内联style |
| 9 | LotteryModal | `components/dashboard/LotteryModal.vue` | 否 | 大量内联style |

### 共享组件 (可提取)
| # | 组件 | 当前位置 | 被谁使用 | 提取建议 |
|---|------|---------|---------|---------|
| - | Modal 基础结构 | 分散在各Modal中 | 所有Modal | 提取为 `BaseModal.vue` |
| - | 排行榜列表 | UploadRankModal/SignRankModal | 2处 | 提取为 `RankList.vue` |
| - | Tab 切换 | CarrotModal/InviteModal/RedpacketModal/LotteryModal | 4处 | 提取为 `SegmentedControl.vue` |

---

## 三、CSS 来源分析

### 使用的全局 CSS 文件
| 文件 | 行数 | Dashboard相关行数 | 问题 |
|------|------|------------------|------|
| base.css | 186 | ~30 (变量) | 旧变量别名可清理 |
| components.css | 4018 | ~300 | 90%与Dashboard无关，需拆分 |
| component-library.css | 481 | ~50 | 与components.css类名冲突 |
| utilities.css | 383 | ~0 | Dashboard未使用任何工具类 |
| upload.css | 260 | 0 | 完全无关 |

### 类名冲突
| 类名 | components.css | component-library.css | 当前生效 |
|------|---------------|----------------------|---------|
| `.btn-primary` | 行164(Dashboard版) + 行801(登录版) | 行38(Apple版) | 后加载覆盖 |
| `.action-btn` | 行175 | 行405 | 后加载覆盖 |
| `.stat-value` | 行90 | 行448 | 后加载覆盖 |
| `.stat-label` | 行92 | 行449 | 后加载覆盖 |
| `.card-header` | 行127 | 行201 | 后加载覆盖 |
| `.modal-btn` | 行2671 | 行531 | 后加载覆盖 |

### components.css 中的重复定义
| 选择器 | 定义次数 | 行号 |
|--------|---------|------|
| `.invite-modal-body` | 3次 | 1163, 1198, 1234 |
| `.invite-tab-container` | 3次 | 1165, 1200, 1236 |
| `.invite-tab-group` | 3次 | 1169, 1204, 1240 |
| `.invite-main-tab` | 3次 | 1173, 1208, 1244 |

---

## 四、逐组件优化计划

### 4.1 DashboardView — 主页面

**当前问题:**
- `.bento-card` 有边框、阴影、hover 效果 → 违反 Apple Settings 规范
- `.stat-box` 有边框和 hover → 应改为 Settings 分组列表
- `.action-btn` 有 hover 效果 → 应改为 Settings 行
- `.copy-link-btn` 有 hover → 应改为 Settings 行
- 3处内联 style → 应提取为 class
- `.signed` 类无 CSS 定义 → 废代码

**优化方案:**
- [ ] `.bento-card`: 移除 border/box-shadow/hover 效果，改为纯背景分组
- [ ] `.stat-box`: 改为 Settings 分组列表行样式
- [ ] `.action-btn`: 改为 Settings 行样式，移除 hover
- [ ] `.copy-link-btn`: 改为 Settings 行样式
- [ ] `.signin-ring` 动画: 保留但简化
- [ ] 内联 style → 提取为 class
- [ ] 删除 `.signed` 无效类

### 4.2 Modal 组件 (8个)

**共性问题:**
- 大量内联 style → 应提取为 class
- Tab 切换样式各写各的 → 应统一为 SegmentedControl
- 排行榜列表重复 → 应提取为 RankList

**逐个优化:**
- [ ] UploadRankModal: 内联style → class，排行榜提取
- [ ] SignRankModal: 内联style → class，排行榜提取
- [ ] VoteModal: 内联style → class
- [ ] ViewingModal: 内联style → class，setting-item已有Apple风格基础
- [ ] CarrotModal: 内联style → class，Tab提取为SegmentedControl
- [ ] InviteModal: 内联style → class，Tab提取为SegmentedControl，删除重复CSS
- [ ] RedpacketModal: 内联style → class，Tab提取为SegmentedControl
- [ ] LotteryModal: 内联style → class，Tab提取为SegmentedControl

---

## 五、CSS 整理计划

### 删除
- [ ] `components.css.bak` 备份文件
- [ ] components.css 中 `.invite-*` 重复定义 (保留1份)
- [ ] components.css 中与 Dashboard 无关的页面样式（后续迁移到对应页面 scoped style）
- [ ] component-library.css 与 components.css 冲突的重复定义

### 合并
- [ ] `.btn-primary` 统一为1个定义
- [ ] `.action-btn` 统一为1个定义
- [ ] `.stat-value` / `.stat-label` 统一为1个定义
- [ ] `.card-header` 统一为1个定义
- [ ] `.modal-btn` 统一为1个定义

### 重构
- [ ] components.css 拆分：Dashboard 专属样式 → `dashboard.css`
- [ ] Modal 通用样式保留在 components.css
- [ ] 所有组件内联 style → scoped style 或全局 class

---

## 六、执行顺序

1. **Phase 1**: 修复 components.css 重复定义 + 删除 .bak ✅
2. **Phase 2**: DashboardView 主页面 Apple Settings 风格改造 ✅
3. **Phase 3**: 提取共享组件 (BaseModal, SegmentedControl, RankList) ✅
4. **Phase 4**: 逐个优化 Modal 子组件 ✅
5. **Phase 5**: CSS 拆分整理 ✅

---

## 七、已完成变更汇总

### Phase 1: CSS 清理
- 删除 `components.css.bak`
- 删除 `.invite-*` 重复定义（3份→0份，已移至 scoped）
- 删除多余的 `.modal-btn.primary:hover` 定义

### Phase 2: DashboardView Apple Settings 改造
- `.bento-card`: 移除 border/box-shadow/backdrop-filter/hover/::before 伪元素 → 纯 `var(--system-quaternary)` 背景
- `.profile-avatar`: 移除 border/box-shadow → `var(--system-quinary)` 背景
- `.action-icon`: 移除 border/hover/scale → 无边框，:active opacity
- `.stat-box`: 移除 border/hover/transform → `var(--system-quinary)` 背景，:active opacity
- `.copy-link-btn`: 移除 border/hover → `var(--system-quinary)` 背景
- `.btn-primary`: 移除 box-shadow/hover/transform → :active opacity
- `.action-btn`: 移除 border/hover/transform → `var(--system-quinary)` 背景
- 新增 `.card-header-action` 和 `.highlight-value` class
- 移除 `.signed` 无效类
- 内联 style → class

### Phase 3: 共享组件
- 新增 `components/common/BaseModal.vue` — 模态框基础结构
- 新增 `components/common/SegmentedControl.vue` — Tab 切换（scoped style）
- 新增 `components/common/RankList.vue` — 排行榜列表（scoped style）

### Phase 4: Modal 子组件重写
- `UploadRankModal.vue` → BaseModal + RankList，88行→48行
- `SignRankModal.vue` → BaseModal + scoped style，102行→120行（含完整 scoped style）
- `VoteModal.vue` → BaseModal + scoped style，108行→130行
- `ViewingModal.vue` → BaseModal + scoped style，140行→120行
- `CarrotModal.vue` → BaseModal + SegmentedControl + RankList + scoped style，148行→130行
- `InviteModal.vue` → BaseModal + SegmentedControl + scoped style，153行→140行
- `RedpacketModal.vue` → BaseModal + SegmentedControl + scoped style，433行→260行
- `LotteryModal.vue` → BaseModal + SegmentedControl + scoped style，381行→260行

### Phase 5: CSS 整理
- 删除 components.css 中 `.invite-*` 全局样式（已迁移到 scoped）
- component-library.css 同步 Apple Settings 风格：`.card`/`.btn-primary`/`.action-btn`/`.modal-btn` 移除 hover/border/shadow
- base.css 旧变量别名统一指向新变量

### 共享组件复用追踪
| 组件 | 被谁使用 |
|------|---------|
| BaseModal | UploadRankModal, SignRankModal, VoteModal, ViewingModal, CarrotModal, InviteModal, RedpacketModal, LotteryModal |
| SegmentedControl | CarrotModal, InviteModal, RedpacketModal, LotteryModal |
| RankList | UploadRankModal, CarrotModal |