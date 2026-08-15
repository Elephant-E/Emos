# EMOS 网站重构设计文档 — Apple Music 风格

## 目标

将 EMOS 网站重构为 Apple Music 网页播放器的布局风格，选中效果使用 Apple TV 蓝色。

---

## 一、布局结构变更

### 当前布局
```
TopBar (fixed, 居中浮于顶部, 圆角28px)
Sidebar (fixed, 左侧, 180px, 圆角24px)
main.main-wrapper (margin-left: 220px)
```

### 目标布局（Apple Music 风格）
```
┌──────────────────────────────────────────────────┐
│ Sidebar (fixed左侧, 毛玻璃, 圆角20px, 260px)     │
│ ┌──────────────────────────────────────────────┐ │
│ │ Logo                                         │ │
│ ├──────────────────────────────────────────────┤ │
│ │ 导航项 (搜索/主页/新发现/广播...)            │ │
│ │  - 圆角8px, 选中态蓝色背景                    │ │
│ │  - 图标24x24 + 文字                           │ │
│ ├──────────────────────────────────────────────┤ │
│ │ 用户头像/账户                                 │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│  主内容区 (margin-left: 260px, 独立滚动)         │
│  ┌──────────────────────────────────────────┐    │
│  │ content-container (max-width: 1680px)     │    │
│  │  - 内容卡片/网格                           │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### 关键变更
1. **删除 TopBar** — 所有功能合并到 Sidebar（Logo、用户菜单、主题切换）
2. **Sidebar 重构** — Apple Music 侧边栏风格，顶部Logo+导航项+底部用户区
3. **主内容区** — 去掉 padding-top，改为 margin-left 对应侧边栏宽度
4. **删除底部播放器** — Sidebar 中也移除播放器区域

---

## 二、颜色系统变更

### 选中效果：红色 → Apple TV 蓝色
| 用途 | 当前值 | 目标值 |
|------|--------|--------|
| 品牌色/选中色 | `#fa233b` | `#0a84ff` (暗) / `#007aff` (亮) |
| 选中态背景 | 红色系 | `rgba(0,122,255,.1)` (亮) / `rgba(10,132,255,.15)` (暗) |

### 页面背景
| 变量 | 亮色 | 暗色 |
|------|------|------|
| `--pageBG` | `#fff` | `#1f1f1f` |
| `--navSidebarBG` | `rgba(60,60,67,.03)` | `rgba(235,235,245,.03)` |
| `--navSidebarSelectedState` | `rgba(60,60,67,.1)` | `rgba(235,235,245,.1)` |

### 毛玻璃材质
| 变量 | 亮色 | 暗色 |
|------|------|------|
| `--glassMaterialBackground` | `rgba(245,245,247,.55)` | `rgba(38,38,40,.6)` |
| `--glassMaterialShadowColor` | `rgba(0,0,0,.1)` | `rgba(0,0,0,.2)` |
| `--glassMaterialBorder` | `rgba(0,0,0,.05)` | `hsla(0,0%,100%,.2)` |

### 文字层级
| 层级 | 亮色 | 暗色 |
|------|------|------|
| Primary | `rgba(0,0,0,.85)` | `hsla(0,0%,100%,.85)` |
| Secondary | `rgba(0,0,0,.5)` | `hsla(0,0%,100%,.55)` |
| Tertiary | `rgba(0,0,0,.25)` | `hsla(0,0%,100%,.25)` |

---

## 三、Sidebar 重构

### 结构
```html
<aside class="sidebar">
  <!-- 顶部：Logo -->
  <div class="sidebar__header">
    <a class="sidebar__logo" href="/">EMOS</a>
  </div>

  <!-- 中部：导航项（可滚动） -->
  <div class="sidebar__content">
    <div class="sidebar__scrollable">
      <ul class="sidebar__nav-list">
        <li class="sidebar__nav-item" :class="{ 'sidebar__nav-item--active': isActive }">
          <a class="sidebar__nav-link">
            <span class="sidebar__nav-icon"><svg>...</svg></span>
            <span class="sidebar__nav-label">仪表盘</span>
          </a>
        </li>
        <!-- 更多导航项... -->
      </ul>
    </div>
  </div>

  <!-- 底部：用户区域 -->
  <div class="sidebar__footer">
    <div class="sidebar__user" @click="toggleUserMenu">
      <div class="sidebar__avatar">...</div>
      <span class="sidebar__username">用户名</span>
    </div>
  </div>
</aside>
```

### 样式规格
- 宽度：`260px`（桌面端），移动端隐藏/抽屉
- 圆角：`20px`
- 背景：毛玻璃 `backdrop-filter: saturate(220%) blur(16px)`
- 阴影：`0 10px 40px var(--glassMaterialShadowColor)`
- 边框：`0.5px solid var(--glassMaterialBorder)`
- 间距：`margin: 8px`（四边留8px间距）
- 高度：`calc(100% - 16px)`

### 导航项样式
- 高度：`44px`
- 圆角：`8px`
- 间距：`margin-bottom: 4px`, `padding: 4px`
- 图标：24x24 SVG，`fill: currentColor`
- 选中态：`background: var(--navSidebarSelectedState)`, 文字/图标变蓝
- Hover：轻微背景变化
- 过渡：`background-color 0.15s ease`

---

## 四、主内容区重构

### 结构
```html
<div class="main-content" id="scrollable-page">
  <main>
    <div class="content-container">
      <router-view />
    </div>
  </main>
</div>
```

### 样式规格
- `margin-left: 260px`（桌面端，与侧边栏宽度一致）
- `padding: 0`
- `overflow-y: auto`（独立滚动）
- `height: 100vh`
- `content-container`: `max-width: 1680px`, `margin: 0 auto`, `padding: 0 32px`

---

## 五、TopBar 功能迁移

| TopBar 功能 | 迁移到 |
|------------|--------|
| EMOS Logo | Sidebar 顶部 |
| 汉堡菜单 | 移除（侧边栏常驻） |
| 用户头像+下拉 | Sidebar 底部 |
| 主题切换 | Sidebar 底部用户菜单内 |
| 切换账号 | Sidebar 底部用户菜单内 |
| 退出登录 | Sidebar 底部用户菜单内 |
| 移动端播放器 | 移除（暂不需要播放器） |

---

## 六、响应式断点

| 断点 | 行为 |
|------|------|
| `< 484px` | 侧边栏隐藏，通过汉堡菜单呼出 |
| `484px - 768px` | 侧边栏可折叠，主内容区自适应 |
| `≥ 768px` | 侧边栏固定 260px，主内容区 margin-left: 260px |

---

## 七、实施步骤

### 第1步：创建重构文档（本文件）
### 第2步：修改 base.css — 更新颜色变量、背景、字体
### 第3步：重构 Sidebar.vue — Apple Music 风格侧边栏
### 第4步：删除 TopBar.vue — 从 MainLayout 移除引用
### 第5步：重构 MainLayout.vue — 新布局结构
### 第6步：更新 components.css — 侧边栏样式、主内容区样式
### 第7步：迁移 TopBar 功能到 Sidebar（用户菜单、主题切换等）
### 第8步：调整各页面组件适配新布局
### 第9步：移动端适配
### 第10步：构建部署验证