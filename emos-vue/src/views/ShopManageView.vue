<template>
  <!-- 未开通、审核中或已禁用状态 -->
  <div v-if="!sellerInfo || sellerInfo.status === 'default' || sellerInfo.status === 'examine' || sellerInfo.status === 'disable'" class="empty-seller-container">
    <div class="bento-card empty-state-card">
      <!-- 介绍视图 -->
      <transition name="fade-slide" mode="out-in">
        <!-- 加载中 - 先显示骨架屏或loading -->
        <div v-if="isLoading" key="loading" class="loading-view">
          <div class="loading-state">
            <i class="fas fa-circle-notch"></i>
            <p>加载中...</p>
          </div>
        </div>
        
        <!-- 介绍视图 -->
        <div v-else-if="!showApplyForm && sellerInfo?.status !== 'examine' && sellerInfo?.status !== 'disable'" key="intro" class="intro-view">
          <div class="empty-icon-wrapper">
            <div class="empty-icon">
              <i class="fas fa-store"></i>
            </div>
          </div>
          
          <h2 class="empty-title">开启您的店铺之旅</h2>
          <p class="empty-subtitle">成为认证商家，享受专属权益</p>
          
          <div class="features-grid">
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-palette"></i>
              </div>
              <div class="feature-content">
                <h4>个性化店铺</h4>
                <p>自定义名称、描述和封面</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-box-open"></i>
              </div>
              <div class="feature-content">
                <h4>商品管理</h4>
                <p>灵活上架和管理商品</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-receipt"></i>
              </div>
              <div class="feature-content">
                <h4>订单处理</h4>
                <p>实时接收和处理订单</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="feature-content">
                <h4>数据分析</h4>
                <p>查看销售数据和趋势</p>
              </div>
            </div>
          </div>
          
          <button class="btn-primary btn-apply" @click="applySeller">
            <i class="fas fa-rocket"></i>
            <span>立即开通店铺</span>
          </button>
        </div>
        
        <!-- 申请表单视图 -->
        <div v-else-if="sellerInfo?.status !== 'examine' && sellerInfo?.status !== 'disable'" key="form" class="apply-form-view">
          <div class="form-header">
            <button class="back-btn" @click="closeApplyForm">
              <i class="fas fa-arrow-left"></i>
            </button>
            <h2 class="form-title">申请开通店铺</h2>
            <div class="form-spacer"></div>
          </div>
          
          <div class="form-content">
            <div class="form-group">
              <label class="form-label">
                店铺名称
                <span class="form-hint">(最多30字)</span>
              </label>
              <input 
                v-model="applyForm.name"
                type="text"
                class="form-input"
                placeholder="请输入店铺名称"
                maxlength="30"
                :class="{ error: formErrors.name }"
              >
              <p v-if="formErrors.name" class="error-message">{{ formErrors.name }}</p>
            </div>
            
            <div class="form-group">
              <label class="form-label">
                店铺简介
                <span class="form-hint">(最多200字)</span>
              </label>
              <textarea 
                v-model="applyForm.description"
                class="form-textarea"
                placeholder="请简单介绍您的店铺"
                maxlength="200"
                rows="5"
                :class="{ error: formErrors.description }"
              ></textarea>
              <div class="textarea-footer">
                <p v-if="formErrors.description" class="error-message">{{ formErrors.description }}</p>
                <p class="char-count">{{ applyForm.description.length }}/200</p>
              </div>
            </div>
            
            <button class="btn-primary btn-submit" @click="submitApply">
              <i class="fas fa-paper-plane"></i>
              <span>提交申请</span>
            </button>
          </div>
        </div>
        
        <!-- 审核中视图 -->
        <div v-else-if="sellerInfo?.status === 'examine'" key="examine" class="examine-view">
          <div class="status-icon-wrapper">
            <div class="status-icon examine">
              <i class="fas fa-clock"></i>
            </div>
          </div>
          
          <h2 class="empty-title">审核中</h2>
          <p class="empty-subtitle">您的店铺申请正在审核中，请耐心等待</p>
          
          <div class="status-tips">
            <h4>温馨提示</h4>
            <ul>
              <li>审核结果将通过系统通知告知</li>
              <li>审核期间请勿重复提交申请</li>
              <li>如有疑问请联系客服</li>
            </ul>
          </div>
        </div>
        
        <!-- 已禁用视图 -->
        <div v-else-if="sellerInfo?.status === 'disable'" key="disable" class="disable-view">
          <div class="status-icon-wrapper">
            <div class="status-icon disable">
              <i class="fas fa-ban"></i>
            </div>
          </div>
          
          <h2 class="empty-title">店铺已禁用</h2>
          <p class="empty-subtitle">您的店铺已被禁用，无法进行管理操作</p>
          
          <div class="status-actions">
            <button class="btn-secondary btn-contact" @click="contactAdmin">
              <i class="fas fa-user-shield"></i>
              <span>联系管理</span>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>

  <!-- 已开通店铺状态 -->
  <template v-else>
    <!-- 页面标题 -->
    <header class="page-header">
      <h1 class="page-title">商户管理</h1>
      <p class="page-subtitle">管理您的店铺、商品和订单</p>
    </header>
    <div v-if="sellerInfo" class="seller-info-card bento-card">
      <div class="seller-avatar-large">
        <div v-if="!sellerInfo.cover_url" class="avatar-placeholder-large">
          <i class="fas fa-store"></i>
        </div>
        <img v-else :src="sellerInfo.cover_url" :alt="sellerInfo.name" loading="lazy">
      </div>
      <div class="seller-info-section">
        <h2 class="seller-name-large">{{ sellerInfo.name }}</h2>
        <p v-if="sellerInfo.description" class="seller-description">{{ sellerInfo.description }}</p>
      </div>
      <button class="action-icon btn-edit-seller" @click="openEditModal">
        <i class="fas fa-pen"></i>
      </button>
    </div>

    <!-- 统计概览 -->
    <div class="stats-grid bento-card">
      <div class="stat-item">
        <div class="stat-value">{{ animatedStats.productCount }}</div>
        <div class="stat-label">商品</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-value">{{ animatedStats.categoryCount }}</div>
        <div class="stat-label">分类</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-value">{{ animatedStats.orderCount }}</div>
        <div class="stat-label">订单</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-value">{{ animatedStats.totalSales }}</div>
        <div class="stat-label">总销量</div>
      </div>
    </div>

    <!-- 管理功能Tab切换 -->
    <div class="tab-container">
      <button 
        :class="['tab-btn', { active: activeTab === 'products' }]" 
        @click="activeTab = 'products'"
      >
        <i class="fas fa-box-open"></i> 商品管理
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'categories' }]" 
        @click="activeTab = 'categories'"
      >
        <i class="fas fa-layer-group"></i> 分类管理
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'orders' }]" 
        @click="activeTab = 'orders'"
      >
        <i class="fas fa-clipboard-list"></i> 订单管理
      </button>
    </div>

    <!-- 商品管理 -->
    <div v-show="activeTab === 'products'" class="tab-content active">
      <!-- 分类筛选 + 搜索 + 视图切换 + 添加商品（一行布局） -->
      <div class="filter-bar">
        <div class="filter-group">
          <button 
            :class="['filter-chip', { active: !productCategoryId }]"
            @click="selectProductCategory(null)"
          >
            全部
          </button>
          <button 
            v-for="category in categories"
            :key="category.category_id"
            :class="['filter-chip', { active: productCategoryId === category.category_id }]"
            @click="selectProductCategory(category.category_id)"
          >
            {{ category.name }}
          </button>
        </div>
        
        <div class="search-container">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="search-input" 
            v-model="productSearchQuery"
            placeholder="搜索商品名称..."
          >
        </div>
        
        <!-- 视图切换 -->
        <button 
          class="action-btn-manage"
          @click="productViewMode = productViewMode === 'grid' ? 'list' : 'grid'"
          :title="productViewMode === 'grid' ? '列表视图' : '网格视图'"
          style="width: 38px; height: 38px; border-radius: 50%;"
        >
          <i :class="productViewMode === 'grid' ? 'fas fa-list' : 'fas fa-th-large'"></i>
        </button>
        
        <button class="action-btn-primary" @click="openProductModal()" title="添加商品">
          <i class="fas fa-plus"></i>
        </button>
      </div>

      <!-- 商品列表 -->
      <div class="product-grid" :style="productViewMode === 'list' ? 'display: flex; flex-direction: column; gap: 0;' : ''">
        <!-- 加载中骨架屏 -->
        <template v-if="isProductsLoading">
          <!-- 网格视图骨架屏 -->
          <template v-if="productViewMode === 'grid'">
            <div 
              v-for="i in 4" 
              :key="`skeleton-${i}`"
              class="product-card skeleton-card"
            >
              <div class="product-cover">
                <div class="image-placeholder"></div>
              </div>
              <div class="product-info">
                <div class="skeleton-text" style="width: 80%; height: 16px; margin-bottom: 8px;"></div>
                <div class="skeleton-text-sm" style="width: 60%; margin-bottom: 12px;"></div>
                <div class="skeleton-text-sm" style="width: 40%; height: 20px;"></div>
              </div>
            </div>
          </template>
          
          <!-- 列表视图骨架屏 -->
          <template v-else>
            <div class="settings-list">
              <div 
                v-for="i in 5" 
                :key="`list-skeleton-${i}`"
                class="setting-item skeleton-list-item"
                :style="i < 5 ? '' : 'border-bottom: none;'"
              >
                <!-- 拖拽图标占位 -->
                <div style="width: 1rem; margin-right: 0.8rem; flex-shrink: 0;">
                  <div class="skeleton-text-sm" style="width: 16px; height: 16px;"></div>
                </div>
                
                <!-- 图片占位 -->
                <div style="width: 60px; height: 60px; border-radius: 12px; flex-shrink: 0; margin-right: 1rem;">
                  <div class="skeleton-text" style="width: 100%; height: 100%; border-radius: 12px;"></div>
                </div>
                
                <!-- 信息占位 -->
                <div class="setting-info" style="flex: 1;">
                  <div class="skeleton-text" style="width: 40%; height: 16px; margin-bottom: 8px;"></div>
                  <div class="skeleton-text-sm" style="width: 60%; margin-bottom: 8px;"></div>
                  <div class="skeleton-text-sm" style="width: 80%;"></div>
                </div>
                
                <!-- 按钮占位 -->
                <div class="setting-value">
                  <div class="skeleton-text-sm" style="width: 32px; height: 32px; border-radius: 8px;"></div>
                  <div class="skeleton-text-sm" style="width: 32px; height: 32px; border-radius: 8px;"></div>
                  <div class="skeleton-text-sm" style="width: 32px; height: 32px; border-radius: 8px;"></div>
                </div>
              </div>
            </div>
          </template>
        </template>
      
        <!-- 空状态 -->
        <template v-else-if="filteredProducts.length === 0">
          <!-- 网格视图空状态 -->
          <div v-if="productViewMode === 'grid'" class="empty-state" style="grid-column: 1 / -1;">
            <i class="fas fa-box-open"></i>
            <h4>暂无商品</h4>
          </div>
          
          <!-- 列表视图空状态 -->
          <div v-else class="empty-state" style="padding: 3rem 0;">
            <i class="fas fa-box-open"></i>
            <h4>暂无商品</h4>
          </div>
        </template>
      
        <!-- 商品列表 -->
        <template v-else>
          <!-- 网格视图 -->
          <template v-if="productViewMode === 'grid'">
            <div 
              v-for="product in filteredProducts" 
              :key="product.product_id"
              class="product-card product-manage-card"
            >
              <div class="product-cover">
                <!-- 上下架状态标签 -->
                <span :class="['product-badge', product.is_up ? 'badge-up' : 'badge-down']">
                  {{ product.is_up ? '已上架' : '已下架' }}
                </span>
                <div v-if="!product.cover_url" class="image-placeholder">
                  <i class="fas fa-image"></i>
                </div>
                <img v-else :src="product.cover_url" :alt="product.name" loading="lazy">
              </div>
              <div class="product-info">
                <div class="product-name">{{ product.name }}</div>
                <div v-if="product.description" class="product-desc">{{ product.description }}</div>
                <div v-if="product.category_name" class="product-desc">{{ product.category_name }}</div>
                
                <!-- 价格行：萝卜价格 + 原价 + 库存 + 已售 -->
                <div class="price-row product-price-row">
                  <span class="price-current">
                    <i class="fas fa-carrot"></i>{{ product.price || product.price_origin }}
                  </span>
                  <span v-if="product.price_origin && product.price" class="price-origin">
                    <i class="fas fa-carrot"></i>{{ product.price_origin }}
                  </span>
                  <div class="product-meta-inline">
                    <span class="stock-badge">库存 {{ product.stock }}</span>
                    <span class="stock-badge sales-badge">已售 {{ product.sales }}</span>
                  </div>
                </div>
                
                <!-- 管理操作按钮 -->
                <div class="product-actions">
                  <button 
                    class="action-btn-manage"
                    :title="product.is_up ? '下架' : '上架'"
                    @click="toggleProductStatus(product)"
                  >
                    <i :class="product.is_up ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                  </button>
                  
                  <button 
                    class="action-btn-manage"
                    title="编辑"
                    @click="openProductModal(product)"
                  >
                    <i class="fas fa-pen"></i>
                  </button>
                  
                  <button 
                    class="action-btn-manage danger"
                    title="删除"
                    @click="deleteProduct(product)"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </template>
          
          <!-- 列表视图 -->
          <template v-else>
            <div class="settings-list" ref="productListRef">
              <div 
                v-for="(product, index) in filteredProducts" 
                :key="product.product_id"
                class="setting-item"
                :style="index < filteredProducts.length - 1 ? '' : 'border-bottom: none;'"
              >
                <!-- 拖拽图标 -->
                <i class="fas fa-grip-vertical drag-handle" style="color: var(--text-tertiary); font-size: 1rem; margin-right: 0.8rem; flex-shrink: 0; cursor: grab;"></i>
                
                <!-- 商品图片 -->
                <div style="width: 60px; height: 60px; border-radius: 12px; overflow: hidden; flex-shrink: 0; margin-right: 1rem;">
                  <div v-if="!product.cover_url" style="width: 100%; height: 100%; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">
                    <i class="fas fa-image"></i>
                  </div>
                  <img v-else :src="product.cover_url" :alt="product.name" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                </div>
                
                <div class="setting-info">
                  <div class="setting-label">
                    {{ product.name }}
                    <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-tertiary);">
                      {{ product.is_up ? '已上架' : '已下架' }}
                    </span>
                  </div>
                  <div class="setting-desc">
                    <span v-if="product.description">{{ product.description }}</span>
                    <span v-if="product.category_name" style="margin-left: 0.5rem;">{{ product.category_name }}</span>
                  </div>
                  <div class="setting-desc" style="margin-top: 0.3rem; display: flex; align-items: center; gap: 1rem;">
                    <span class="meta-item">
                      售价 {{ product.price || product.price_origin }}
                    </span>
                    <span v-if="product.price_origin && product.price" class="meta-item">
                      原价 {{ product.price_origin }}
                    </span>
                    <span class="meta-item">
                      库存 {{ product.stock }}
                    </span>
                    <span class="meta-item">
                      已售 {{ product.sales }}
                    </span>
                  </div>
                </div>
                <div class="setting-value">
                  <button 
                    class="action-btn-manage"
                    :title="product.is_up ? '下架' : '上架'"
                    @click="toggleProductStatus(product)"
                  >
                    <i :class="product.is_up ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                  </button>
                  
                  <button 
                    class="action-btn-manage"
                    title="编辑"
                    @click="openProductModal(product)"
                  >
                    <i class="fas fa-pen"></i>
                  </button>
                  
                  <button 
                    class="action-btn-manage danger"
                    title="删除"
                    @click="deleteProduct(product)"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- 分类管理 -->
    <div v-show="activeTab === 'categories'" class="tab-content active">
      <!-- 分类列表卡片 -->
      <div class="bento-card product-manage-card">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
          <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em;">商品分类</h3>
          <button class="action-btn-primary" @click="openCategoryModal()" title="新增分类">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <!-- 加载中骨架屏 -->
        <template v-if="isCategoriesLoading">
          <div class="settings-list">
            <div 
              v-for="i in 4" 
              :key="`category-skeleton-${i}`"
              class="setting-item skeleton-list-item"
              :style="i < 4 ? '' : 'border-bottom: none;'"
            >
              <!-- 拖拽图标占位 -->
              <div style="width: 1rem; margin-right: 0.8rem; flex-shrink: 0;">
                <div class="skeleton-text-sm" style="width: 16px; height: 16px;"></div>
              </div>
              
              <!-- 信息占位 -->
              <div class="setting-info" style="flex: 1;">
                <div class="skeleton-text" style="width: 30%; height: 16px; margin-bottom: 8px;"></div>
                <div class="skeleton-text-sm" style="width: 20%;"></div>
              </div>
              
              <!-- 按钮占位 -->
              <div class="setting-value">
                <div class="skeleton-text-sm" style="width: 32px; height: 32px; border-radius: 8px;"></div>
              </div>
            </div>
          </div>
        </template>

        <div v-else-if="categories.length === 0" class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-layer-group"></i>
          <h4>暂无分类</h4>
        </div>

        <div v-else class="category-list" ref="categoryListRef">
          <div 
            v-for="(category, index) in categories" 
            :key="category.category_id"
            class="setting-item"
          >
            <div class="setting-info" style="display: flex; align-items: center; gap: 0.8rem;">
              <i class="fas fa-grip-vertical drag-handle" style="color: var(--text-tertiary); font-size: 1rem; cursor: grab;"></i>
              <div>
                <div class="setting-label">{{ category.name }}</div>
                <div class="setting-desc">
                  <span class="meta-item">
                    <i class="fas fa-sort-amount-down"></i>
                    排序: {{ category.sort }}
                  </span>
                </div>
              </div>
            </div>
            <div class="setting-value category-actions">
              <button 
                class="action-btn-manage danger" 
                @click="deleteCategory(category)"
                title="删除"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 订单管理 -->
    <div v-show="activeTab === 'orders'" class="tab-content active">
      <!-- 筛选和搜索控制栏 -->
      <div class="filter-bar">
        <div class="filter-group">
          <button 
            v-for="chip in orderFilterChips" 
            :key="chip.value"
            class="filter-chip"
            :class="{ active: currentOrderFilter === chip.value }"
            @click="setOrderFilter(chip.value)"
          >
            {{ chip.label }}
          </button>
        </div>
        <div class="search-container">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="search-input"
            v-model="orderSearchQuery"
            placeholder="搜索订单号/商品..."
          >
        </div>
      </div>

      <!-- 订单列表 -->
      <div class="settings-list">
        <!-- 加载中骨架屏 -->
        <template v-if="isOrdersLoading">
          <div 
            v-for="i in 5" 
            :key="`order-skeleton-${i}`"
            class="setting-item skeleton-list-item"
            :style="i < 5 ? '' : 'border-bottom: none;'"
          >
            <!-- 图片占位 -->
            <div style="width: 60px; height: 60px; border-radius: 12px; flex-shrink: 0; margin-right: 1rem;">
              <div class="skeleton-text" style="width: 100%; height: 100%; border-radius: 12px;"></div>
            </div>
            
            <!-- 信息占位 -->
            <div class="setting-info" style="flex: 1;">
              <div class="skeleton-text" style="width: 40%; height: 16px; margin-bottom: 8px;"></div>
              <div class="skeleton-text-sm" style="width: 60%; margin-bottom: 8px;"></div>
              <div class="skeleton-text-sm" style="width: 30%;"></div>
            </div>
            
            <!-- 按钮占位 -->
            <div class="setting-value">
              <div class="skeleton-text-sm" style="width: 32px; height: 32px; border-radius: 8px;"></div>
              <div class="skeleton-text-sm" style="width: 32px; height: 32px; border-radius: 8px;"></div>
              <div class="skeleton-text-sm" style="width: 32px; height: 32px; border-radius: 8px;"></div>
            </div>
          </div>
        </template>

        <!-- 空状态 -->
        <div v-else-if="filteredOrders.length === 0" class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <h4>暂无订单</h4>
        </div>

        <!-- 订单列表 -->
        <template v-else>
          <div 
            v-for="(order, index) in filteredOrders" 
            :key="order.order_no"
            class="setting-item"
            :style="index < filteredOrders.length - 1 ? '' : 'border-bottom: none;'"
            @click="openOrderDetail(order)"
            style="cursor: pointer;"
          >
            <!-- 商品图片 -->
            <div style="width: 60px; height: 60px; border-radius: 12px; overflow: hidden; flex-shrink: 0; margin-right: 1rem;">
              <div v-if="!order.order_cover_url" style="width: 100%; height: 100%; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">
                <i class="fas fa-image"></i>
              </div>
              <img v-else :src="order.order_cover_url" :alt="order.order_title" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
            </div>
            
            <!-- 订单信息 -->
            <div class="setting-info">
              <div class="setting-label">
                {{ order.order_title }}
                <span 
                  :class="['order-status', getOrderStatusClass(order)]"
                  style="margin-left: 0.5rem;"
                >
                  <i class="fas fa-circle" style="font-size: 0.5em;"></i>
                  {{ getOrderStatusText(order) }}
                </span>
              </div>
              <div class="setting-desc" style="display: flex; flex-direction: column; gap: 0.3rem;">
                <!-- 订单号、购买时间 -->
                <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                  <span class="meta-item">
                    <span style="color: var(--text-tertiary);">订单号：</span>
                    {{ order.order_no }}
                  </span>
                  <span class="meta-item">
                    <span style="color: var(--text-tertiary);">购买时间：</span>
                    {{ formatDate(order.created_at) }}
                  </span>
                </div>
                <!-- 买家头像、用户名、购买数量 -->
                <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                  <div style="width: 18px; height: 18px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: var(--bg-surface); border: 1.5px solid var(--border);">
                    <img v-if="order.user?.avatar" 
                      :src="order.user.avatar" 
                      :alt="order.user.username"
                      style="width: 100%; height: 100%; object-fit: cover;"
                      loading="lazy"
                    />
                    <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 0.55rem;">
                      <i class="fas fa-user"></i>
                    </div>
                  </div>
                  <span class="meta-item" style="font-weight: 500;">
                    {{ order.user?.username || '未知用户' }}
                  </span>
                  <!-- 购买数量 -->
                  <span class="meta-item" style="color: var(--accent); font-weight: 600; background: color-mix(in srgb, var(--accent) 10%, transparent); padding: 0.1rem 0.4rem; border-radius: 4px;">
                    <span style="color: var(--text-tertiary); font-weight: 400;">数量：</span>
                    {{ order.buy_number }}件
                  </span>
                  <!-- 催发货标识 -->
                  <span 
                    v-if="order.urge_number && order.urge_number > 0"
                    style="
                      display: inline-flex;
                      align-items: center;
                      gap: 3px;
                      color: #FF453A;
                      font-size: 0.7rem;
                      font-weight: 600;
                    "
                    title="用户催发货次数"
                  >
                    催发货：<i class="fas fa-bell" style="font-size: 0.6rem;"></i> {{ order.urge_number }}次
                  </span>
                </div>
              </div>
              <div v-if="order.remark_user" class="setting-desc" style="margin-top: 0.4rem;">
                <span class="meta-item" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <i class="fas fa-comment-dots"></i>
                  {{ order.remark_user }}
                </span>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="setting-value" @click.stop>
              <button 
                v-if="!order.time_delivery && order.status_pay === 'paid'"
                class="action-btn-manage"
                title="发货"
                @click="handleOrderAction('delivery', order)"
                :disabled="processingKey === `${order.order_no}_delivery`"
              >
                <i v-if="processingKey === `${order.order_no}_delivery`" class="fas fa-circle-notch fa-spin"></i>
                <i v-else class="fas fa-truck"></i>
              </button>
              
              <button 
                v-if="order.status_pay !== 'paid' || order.time_delivery"
                class="action-btn-manage danger"
                title="删除"
                @click="handleOrderAction('delete', order)"
                :disabled="processingKey === `${order.order_no}_delete`"
              >
                <i v-if="processingKey === `${order.order_no}_delete`" class="fas fa-circle-notch fa-spin"></i>
                <i v-else class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </template>

  <!-- 编辑店铺信息模态框 -->
  <div
    v-show="showEditModal"
    class="modal-overlay"
    :class="{ show: showEditModal }"
    @click.self="closeEditModal"
  >
    <div class="modal-content md">
      <div class="modal-header">
        <h3 class="modal-title">编辑店铺信息</h3>
        <button class="modal-close" @click="closeEditModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">店铺头像</label>
          <ImageUploader 
            :model-value="editCoverUrl"
            @change="(data) => {
              editForm.cover = data.fileId
              editCoverUrl = data.url || ''
            }"
            :max-size="5 * 1024 * 1024"
            placeholder-text="点击选择图片"
            hint-text="从已上传图片中选择或上传新图片"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">店铺名称</label>
          <input 
            v-model="editForm.name"
            type="text"
            class="modal-input"
            placeholder="请输入店铺名称"
            maxlength="30"
          >
        </div>
        
        <div class="form-group">
          <label class="form-label">店铺简介</label>
          <textarea 
            v-model="editForm.description"
            class="form-textarea"
            placeholder="请简单介绍您的店铺"
            maxlength="200"
            rows="4"
          ></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn" @click="closeEditModal">
          <span>取消</span>
        </button>
        <button class="modal-btn primary" @click="saveEdit" :disabled="isSaving">
          <span v-if="!isSaving">保存</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 商品新增/编辑模态框 -->
  <div
    v-show="showProductModal"
    class="modal-overlay"
    :class="{ show: showProductModal }"
    @click.self="closeProductModal"
  >
    <div class="modal-content xl">
      <div class="modal-header">
        <h3 class="modal-title">{{ productForm.product_id ? '编辑商品' : '新增商品' }}</h3>
        <button class="modal-close" @click="closeProductModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <!-- 基本信息 -->
        <div class="form-group">
          <label class="form-label">商品名称</label>
          <input 
            v-model="productForm.name"
            type="text"
            class="modal-input"
            placeholder="请输入商品名称（50字内）"
            maxlength="50"
          >
        </div>

        <div class="form-group">
          <label class="form-label">商品分类</label>
          <select v-model="productForm.category_id" class="modal-input modal-select">
            <option :value="null">请选择分类</option>
            <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">商品封面</label>
          <ImageUploader 
            :model-value="productForm.cover"
            @change="(data) => { productForm.cover = data.fileId }"
            :max-size="5 * 1024 * 1024"
            placeholder-text="点击选择图片"
            hint-text="从已上传图片中选择或上传新图片"
          />
        </div>

        <div class="form-group">
          <label class="form-label">商品简介</label>
          <textarea 
            v-model="productForm.description"
            class="modal-textarea"
            placeholder="请简单介绍您的商品（200字内）"
            maxlength="200"
            rows="3"
          ></textarea>
          <div class="form-hint">{{ productForm.description?.length || 0 }}/200</div>
        </div>

        <div class="form-group">
          <label class="form-label">兑换方式</label>
          <textarea 
            v-model="productForm.exchange_way"
            class="modal-textarea"
            placeholder="例如：购买后自提、快递发货等（1000字内）"
            maxlength="1000"
            rows="3"
          ></textarea>
          <div class="form-hint">{{ productForm.exchange_way?.length || 0 }}/1000</div>
        </div>

        <!-- 价格信息 -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">价格</label>
            <input 
              v-model.number="productForm.price"
              type="number"
              class="modal-input"
              placeholder="1 - 50000"
              min="1"
              max="50000"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">原价</label>
            <input 
              v-model.number="productForm.price_origin"
              type="number"
              class="modal-input"
              placeholder="1 - 50000"
              min="1"
              max="50000"
            >
          </div>
        </div>

        <!-- 库存排序 -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">库存</label>
            <input 
              v-model.number="productForm.stock"
              type="number"
              class="modal-input"
              placeholder="1 - 5000"
              min="1"
              max="5000"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">排序</label>
            <input 
              v-model.number="productForm.sort"
              type="number"
              class="modal-input"
              placeholder="1 - 5000"
              min="1"
              max="5000"
            >
          </div>
        </div>

        <!-- 时间设置 -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">开售时间</label>
            <input 
              v-model="productForm.time_start"
              type="datetime-local"
              class="modal-input"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">停售时间</label>
            <input 
              v-model="productForm.time_end"
              type="datetime-local"
              class="modal-input"
            >
          </div>
        </div>

        <!-- 上架状态 -->
        <div class="form-group">
          <label class="form-label form-label-switch">
            <span>是否上架</span>
            <label class="switch">
              <input type="checkbox" v-model="productForm.is_up">
              <span class="slider"></span>
            </label>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeProductModal">
          <span>取消</span>
        </button>
        <button class="modal-btn primary" @click="saveProduct" :disabled="isProductSaving">
          <span v-if="!isProductSaving">保存</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 分类新增/编辑模态框 -->
  <div
    v-show="showCategoryModal"
    class="modal-overlay"
    :class="{ show: showCategoryModal }"
    @click.self="closeCategoryModal"
  >
    <div class="modal-content sm">
      <div class="modal-header">
        <h3 class="modal-title">{{ categoryForm.category_id ? '编辑分类' : '新增分类' }}</h3>
        <button class="modal-close" @click="closeCategoryModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">分类名称</label>
          <input 
            v-model="categoryForm.name"
            type="text"
            class="modal-input"
            placeholder="请输入分类名称（20字内）"
            maxlength="20"
          >
        </div>

        <div class="form-group">
          <label class="form-label">排序</label>
          <input 
            v-model.number="categoryForm.sort"
            type="number"
            class="modal-input"
            placeholder="1 - 100，越小越靠前"
            min="1"
            max="100"
          >
          <div class="form-hint">数字越小，分类越靠前</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeCategoryModal">
          <span>取消</span>
        </button>
        <button class="modal-btn primary" @click="saveCategory" :disabled="isCategorySaving">
          <span v-if="!isCategorySaving">保存</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 订单详情模态框 -->
  <Teleport to="body">
    <div 
      :class="['modal-overlay', { show: showOrderDetailModal }]"
      @click.self="closeOrderDetailModal"
    >
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">订单详情</span>
          <button class="modal-close" @click="closeOrderDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" v-if="selectedOrder">
          <!-- 商品封面和标题 -->
          <div style="display: flex; gap: 1rem; margin-bottom: 1.2rem;">
            <div style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden; background: var(--bg-input); flex-shrink: 0;">
              <img v-if="selectedOrder.order_cover_url" 
                :src="selectedOrder.order_cover_url" 
                :alt="selectedOrder.order_title"
                style="width: 100%; height: 100%; object-fit: cover;"
                loading="lazy"
              />
              <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">
                <i class="fas fa-image" style="font-size: 1.5rem;"></i>
              </div>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.4rem; line-height: 1.4;">
                {{ selectedOrder.order_title }}
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                {{ selectedOrder.product?.description || '暂无描述' }}
              </div>
            </div>
          </div>

          <!-- 订单信息卡片 -->
          <div style="background: var(--bg-input); border-radius: 16px; padding: 1.2rem; margin-bottom: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.8rem;">
              订单信息
            </div>
            <div style="display: grid; gap: 0.8rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">订单号</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500; font-family: monospace;">{{ selectedOrder.order_no }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">买家</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ selectedOrder.user?.username || '未知用户' }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">购买数量</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ selectedOrder.buy_number }} 件</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">下单时间</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ formatDate(selectedOrder.created_at) }}</span>
              </div>
              <div v-if="selectedOrder.time_pay" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">支付时间</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ formatDate(selectedOrder.time_pay) }}</span>
              </div>
              <div v-if="selectedOrder.time_delivery" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">发货时间</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ formatDate(selectedOrder.time_delivery) }}</span>
              </div>
              <div v-if="selectedOrder.urge_number && selectedOrder.urge_number > 0" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">催发货次数</span>
                <span style="
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  color: #FF453A;
                  font-size: 0.85rem;
                  font-weight: 600;
                ">
                  <i class="fas fa-bell" style="font-size: 0.7rem;"></i>
                  {{ selectedOrder.urge_number }} 次
                </span>
              </div>
              <div v-if="selectedOrder.remark_user" style="padding-top: 0.8rem; border-top: 1px solid var(--border); margin-top: 0.8rem;">
                <span style="color: var(--text-secondary); font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">买家备注</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">{{ selectedOrder.remark_user }}</span>
              </div>
            </div>
          </div>

          <!-- 卖家备注 -->
          <div style="background: var(--bg-input); border-radius: 16px; padding: 1.2rem; margin-bottom: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">
              卖家备注
            </div>
            <div v-if="selectedOrder.remark_shop" style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 0.8rem;">
              {{ selectedOrder.remark_shop }}
            </div>
            <button class="order-action-btn" @click="openRemarkModal(selectedOrder)" style="width: 100%; justify-content: center;">
              <i class="fas fa-edit"></i> {{ selectedOrder.remark_shop ? '编辑备注' : '添加备注' }}
            </button>
          </div>

          <!-- 价格和状态信息 -->
          <div :style="{
            background: getOrderStatusBgColor(selectedOrder),
            border: `1px solid ${getOrderStatusBorderColor(selectedOrder)}`,
            borderRadius: '16px',
            padding: '1.2rem'
          }">
            <!-- 状态行 -->
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
              <i :class="getOrderStatusIcon(selectedOrder)" :style="{
                fontSize: '1.2rem',
                color: getOrderStatusColor(selectedOrder)
              }"></i>
              <div>
                <div :style="{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: getOrderStatusColor(selectedOrder),
                  marginBottom: '0.15rem'
                }">
                  {{ getOrderStatusText(selectedOrder) }}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                  {{ getOrderStatusDesc(selectedOrder) }}
                </div>
              </div>
            </div>
            
            <!-- 分隔线 -->
            <div style="height: 1px; background: var(--border); margin: 0.8rem 0;"></div>
            
            <!-- 价格行 -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">{{ selectedOrder.status_pay === 'paid' ? '已付金额' : '应付金额' }}</span>
              <span :style="{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: getOrderStatusColor(selectedOrder)
              }">
                <i class="fas fa-carrot" style="font-size: 1rem; margin-right: 4px;"></i>
                {{ selectedOrder.price_order }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="closeOrderDetailModal">关闭</button>
          <button 
            v-if="!selectedOrder?.time_delivery && selectedOrder?.status_pay === 'paid'"
            class="modal-btn primary" 
            @click="handleOrderAction('delivery', selectedOrder)"
            :disabled="processingKey === `${selectedOrder.order_no}_delivery`"
          >
            <span v-if="processingKey !== `${selectedOrder.order_no}_delivery`">
              <i class="fas fa-truck" style="margin-right: 6px;"></i>
              确认发货
            </span>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 备注模态框 -->
  <Teleport to="body">
    <div 
      :class="['modal-overlay', { show: showRemarkModal }]"
      @click.self="closeRemarkModal"
    >
      <div class="modal-content md">
        <div class="modal-header">
          <span class="modal-title">{{ remarkForm.order_no ? '编辑备注' : '添加备注' }}</span>
          <button class="modal-close" @click="closeRemarkModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">订单备注（200字内）</label>
            <textarea 
              v-model="remarkForm.remark"
              class="form-textarea"
              placeholder="请输入订单备注..."
              maxlength="200"
              rows="4"
            ></textarea>
            <div class="form-hint">{{ remarkForm.remark?.length || 0 }}/200</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="closeRemarkModal">取消</button>
          <button class="modal-btn primary" @click="saveRemark" :disabled="isSavingRemark">
            <span v-if="!isSavingRemark">保存</span>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { formatDate, animateValue } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import shopApi from '@/api/shopApi.js'
import orderApi from '@/api/orderApi.js'
import ImageUploader from '@/components/ImageUploader.vue'
import { 
  ORDER_FILTER_CHIPS,
  getOrderStatus,
  getOrderStatusClass,
  getOrderStatusText,
  getOrderStatusDesc,
  getOrderStatusColor,
  getOrderStatusBgColor,
  getOrderStatusBorderColor,
  getOrderStatusIcon,
  filterOrders
} from '@/utils/order.js'

const appStore = useAppStore()

// 商户信息
const sellerInfo = ref(null)

// 是否正在加载
const isLoading = ref(true)

// 是否显示编辑模态框
const showEditModal = ref(false)

// 原始头像状态（用于判断是否必填）
const originalCover = ref('')

// 是否正在保存
const isSaving = ref(false)

// 编辑表单数据
const editForm = ref({
  name: '',
  description: '',
  cover: ''  // file_id，用于提交
})

// 用于ImageUploader显示的URL
const editCoverUrl = ref('')

// 表单验证错误
const formErrors = ref({
  name: '',
  description: '',
  cover: ''
})

// 是否显示申请表单
const showApplyForm = ref(false)

// 申请表单数据
const applyForm = ref({
  name: '',
  description: ''
})

// 统计数据
const stats = ref({
  productCount: 0,
  categoryCount: 0,
  orderCount: 0,
  totalSales: 0
})

// 动画统计数据（用于数字滚动）
const animatedStats = ref({
  productCount: 0,
  categoryCount: 0,
  orderCount: 0,
  totalSales: 0
})

// 执行统计数据动画
const animateStats = () => {
  // 商品数量动画（800ms）
  animateValue(0, stats.value.productCount, 800, (value) => {
    animatedStats.value.productCount = value
  })
  
  // 分类数量动画（600ms）
  animateValue(0, stats.value.categoryCount, 600, (value) => {
    animatedStats.value.categoryCount = value
  })
  
  // 订单数量动画（800ms）
  animateValue(0, stats.value.orderCount, 800, (value) => {
    animatedStats.value.orderCount = value
  })
  
  // 总销量动画（1200ms）
  animateValue(0, stats.value.totalSales, 1200, (value) => {
    animatedStats.value.totalSales = value
  })
}

// 当前激活的Tab
const activeTab = ref('products')

// ================= 商品管理相关状态 =================
const products = ref([])
const categories = ref([])
const isProductsLoading = ref(false)
const isCategoriesLoading = ref(false)

// 搜索和筛选
const productSearchQuery = ref('')
const productCategoryId = ref(null)
const productViewMode = ref('list') // 'grid' | 'list'

// 过滤后的商品列表（本地过滤）
const filteredProducts = computed(() => {
  return products.value.filter(product => {
    if (!product) return false
    const searchMatch = !productSearchQuery.value || 
      product.name.toLowerCase().includes(productSearchQuery.value.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(productSearchQuery.value.toLowerCase()))
    const categoryMatch = !productCategoryId.value || product.category_id === productCategoryId.value
    return searchMatch && categoryMatch
  })
})

// ================= 订单管理相关状态 =================
const orders = ref([])
const isOrdersLoading = ref(false)
const currentOrderFilter = ref('all')
const orderSearchQuery = ref('')
const showOrderDetailModal = ref(false)
const showRemarkModal = ref(false)
const selectedOrder = ref(null)
const processingKey = ref(null)
const remarkForm = ref({
  order_no: '',
  remark: ''
})
const isSavingRemark = ref(false)

// 订单筛选项配置（使用公共常量）
const orderFilterChips = ORDER_FILTER_CHIPS

// 过滤后的订单列表（本地过滤）
const filteredOrders = computed(() => {
  return filterOrders(orders.value, currentOrderFilter.value, orderSearchQuery.value)
})

// 商品表单模态框
const showProductModal = ref(false)
const isProductSaving = ref(false)
const productForm = ref({
  product_id: null,
  category_id: null,
  cover: '',
  name: '',
  description: '',
  exchange_way: '',
  price: null,
  price_origin: null,
  stock: null,
  is_up: true,
  time_start: '',
  time_end: '',
  sort: 80
})

// 获取商户基本信息
const loadSellerInfo = async () => {
  try {
    isLoading.value = true
    const res = await shopApi.getSellerBase()
    if (res) {
      sellerInfo.value = res
    }
  } catch (error) {
    console.error('获取商户信息失败:', error)
    showToast('获取商户信息失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 加载统计数据（初始化默认值）
const loadStats = async () => {
  stats.value = {
    productCount: 0,
    categoryCount: 0,
    orderCount: 0,
    totalSales: 0
  }
}

// ================= 商品管理方法 =================
// 加载分类列表
const loadCategories = async () => {
  try {
    isCategoriesLoading.value = true
    const res = await shopApi.getCategoryList({ seller_id: sellerInfo.value?.seller_id })
    if (res && Array.isArray(res)) {
      categories.value = res
      stats.value.categoryCount = res.length
      // 执行动画
      animateStats()
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  } finally {
    isCategoriesLoading.value = false
  }
}

// 加载商品列表
const loadProducts = async () => {
  try {
    isProductsLoading.value = true
    const params = {
      seller_id: sellerInfo.value?.seller_id,
      page: 1,
      page_size: 100,
      sort_by: 'sort',
      sort_order: 'asc'
    }

    // 获取第一页
    const res = await shopApi.getProductList(params)
    if (res && res.items) {
      const allProducts = [...res.items]
      let currentPage = 1
      const totalPages = Math.ceil(res.total / params.page_size)

      // 循环获取剩余页面
      while (currentPage < totalPages) {
        currentPage++
        const nextPageRes = await shopApi.getProductList({ ...params, page: currentPage })
        if (nextPageRes && nextPageRes.items) {
          allProducts.push(...nextPageRes.items)
        } else {
          break
        }
      }

      products.value = allProducts

      // 统计商品数和总销量
      stats.value.productCount = allProducts.length
      stats.value.totalSales = allProducts.reduce((sum, item) => sum + (item.sales || 0), 0)
      
      // 执行动画
      animateStats()
    } else {
      products.value = []
      stats.value.productCount = 0
      stats.value.totalSales = 0
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    showToast('加载商品失败', 'error')
  } finally {
    isProductsLoading.value = false
  }
}

// 选择商品分类（本地过滤）
const selectProductCategory = (categoryId) => {
  productCategoryId.value = categoryId
  // 无需API请求，computed会自动重新计算
}

// 打开商品模态框
const openProductModal = (product = null) => {
  if (product) {
    // 编辑模式
    productForm.value = {
      product_id: product.product_id,
      category_id: product.category_id,
      cover: product.cover_url || product.cover || '',
      name: product.name,
      description: product.description || '',
      exchange_way: product.exchange_way || '',
      price: product.price,
      price_origin: product.price_origin,
      stock: product.stock,
      is_up: product.is_up,
      time_start: product.time_start || '',
      time_end: product.time_end || '',
      sort: product.sort
    }
  } else {
    // 新增模式
    productForm.value = {
      product_id: null,
      category_id: categories.value.length > 0 ? categories.value[0].category_id : null,
      cover: '',
      name: '',
      description: '',
      exchange_way: '',
      price: null,
      price_origin: null,
      stock: null,
      is_up: true,
      time_start: '',
      time_end: '',
      sort: 80
    }
  }
  showProductModal.value = true
}

// 关闭商品模态框
const closeProductModal = () => {
  showProductModal.value = false
}

// 保存商品
const saveProduct = async () => {
  // 验证必填项
  if (!productForm.value.name.trim()) {
    showToast('请输入商品名称', 'error')
    return
  }
  if (!productForm.value.category_id) {
    showToast('请选择商品分类', 'error')
    return
  }
  if (!productForm.value.price) {
    showToast('请输入商品价格', 'error')
    return
  }
  if (!productForm.value.stock) {
    showToast('请输入商品库存', 'error')
    return
  }
  if (!productForm.value.sort) {
    showToast('请输入排序值', 'error')
    return
  }

  try {
    isProductSaving.value = true

    const res = await shopApi.createOrUpdateProduct({
      product_id: productForm.value.product_id,
      category_id: productForm.value.category_id,
      cover: productForm.value.cover,
      name: productForm.value.name.trim(),
      description: productForm.value.description.trim(),
      exchange_way: productForm.value.exchange_way.trim(),
      price: productForm.value.price,
      price_origin: productForm.value.price_origin,
      stock: productForm.value.stock,
      is_up: productForm.value.is_up,
      time_start: productForm.value.time_start || null,
      time_end: productForm.value.time_end || null,
      sort: productForm.value.sort
    })

    showToast(productForm.value.product_id ? '编辑成功' : '添加成功', 'success')
    closeProductModal()
    await loadProducts()
    await loadCategories()
  } catch (error) {
    console.error('保存商品失败:', error)
    showToast(error.message || '保存失败，请重试', 'error')
  } finally {
    isProductSaving.value = false
  }
}

// 删除商品
const deleteProduct = async (product) => {
  if (!confirm(`确定要删除商品「${product.name}」吗？`)) {
    return
  }

  try {
    await shopApi.deleteProduct({ params: { product_id: product.product_id } })
    showToast('删除成功', 'success')
    await loadProducts()
  } catch (error) {
    console.error('删除商品失败:', error)
    showToast(error.message || '删除失败，请重试', 'error')
  }
}

// 切换商品上下架状态
const toggleProductStatus = async (product) => {
  try {
    await shopApi.updateProductStatus(null, { params: { product_id: product.product_id } })
    showToast(product.is_up ? '已下架' : '已上架', 'success')
    await loadProducts()
  } catch (error) {
    console.error('切换状态失败:', error)
    showToast(error.message || '操作失败，请重试', 'error')
  }
}

// ================= 分类管理相关状态 =================
const showCategoryModal = ref(false)
const isCategorySaving = ref(false)
const categoryForm = ref({
  category_id: null,
  name: '',
  sort: 1
})
const categoryListRef = ref(null)
const productListRef = ref(null)
let categorySortable = null
let productSortable = null

// ================= 分类管理方法 =================
// 打开分类模态框
const openCategoryModal = (category = null) => {
  if (category) {
    // 编辑模式
    categoryForm.value = {
      category_id: category.category_id,
      name: category.name,
      sort: category.sort
    }
  } else {
    // 新增模式
    categoryForm.value = {
      category_id: null,
      name: '',
      sort: categories.value.length > 0 ? Math.max(...categories.value.map(c => c.sort)) + 1 : 1
    }
  }
  showCategoryModal.value = true
}

// 关闭分类模态框
const closeCategoryModal = () => {
  showCategoryModal.value = false
  categoryForm.value = {
    category_id: null,
    name: '',
    sort: 1
  }
}

// 保存分类
const saveCategory = async () => {
  // 验证必填项
  if (!categoryForm.value.name.trim()) {
    showToast('请输入分类名称', 'error')
    return
  }
  if (!categoryForm.value.sort) {
    showToast('请输入排序值', 'error')
    return
  }

  try {
    isCategorySaving.value = true

    const res = await shopApi.createCategory({
      name: categoryForm.value.name.trim(),
      sort: categoryForm.value.sort
    })

    showToast('添加成功', 'success')
    closeCategoryModal()
    await loadCategories()
  } catch (error) {
    console.error('保存分类失败:', error)
    showToast(error.message || '保存失败，请重试', 'error')
  } finally {
    isCategorySaving.value = false
  }
}

// 删除分类
const deleteCategory = async (category) => {
  if (!confirm(`确定要删除分类「${category.name}」吗？`)) {
    return
  }

  try {
    await shopApi.deleteCategory({ params: { category_id: category.category_id } })
    showToast('删除成功', 'success')
    await loadCategories()
  } catch (error) {
    console.error('删除分类失败:', error)
    showToast(error.message || '删除失败，请重试', 'error')
  }
}

// 上移分类
const moveCategoryUp = async (index) => {
  if (index === 0) return

  const currentCategory = categories.value[index]
  const prevCategory = categories.value[index - 1]

  try {
    // 交换排序值
    const tempSort = currentCategory.sort
    await shopApi.sortCategories({
      category_id: currentCategory.category_id,
      sort: prevCategory.sort
    })
    await shopApi.sortCategories({
      category_id: prevCategory.category_id,
      sort: tempSort
    })

    await loadCategories()
    showToast('排序已更新', 'success')
  } catch (error) {
    console.error('移动分类失败:', error)
    showToast(error.message || '操作失败，请重试', 'error')
  }
}

// 下移分类
const moveCategoryDown = async (index) => {
  if (index === categories.value.length - 1) return

  const currentCategory = categories.value[index]
  const nextCategory = categories.value[index + 1]

  try {
    // 交换排序值
    const tempSort = currentCategory.sort
    await shopApi.sortCategories({
      category_id: currentCategory.category_id,
      sort: nextCategory.sort
    })
    await shopApi.sortCategories({
      category_id: nextCategory.category_id,
      sort: tempSort
    })

    await loadCategories()
    showToast('排序已更新', 'success')
  } catch (error) {
    console.error('移动分类失败:', error)
    showToast(error.message || '操作失败，请重试', 'error')
  }
}


// 申请店铺 - 显示表单
const applySeller = () => {
  showApplyForm.value = true
  // 清空表单
  applyForm.value = {
    name: '',
    description: ''
  }
  formErrors.value = {
    name: '',
    description: ''
  }
}

// 关闭申请表单
const closeApplyForm = () => {
  showApplyForm.value = false
}

// 验证表单
const validateForm = () => {
  let isValid = true
  formErrors.value = { name: '', description: '' }
  
  if (!applyForm.value.name.trim()) {
    formErrors.value.name = '请输入店铺名称'
    isValid = false
  } else if (applyForm.value.name.length > 30) {
    formErrors.value.name = '店铺名称不能超过30字'
    isValid = false
  }
  
  if (!applyForm.value.description.trim()) {
    formErrors.value.description = '请输入店铺简介'
    isValid = false
  } else if (applyForm.value.description.length > 200) {
    formErrors.value.description = '店铺简介不能超过200字'
    isValid = false
  }
  
  return isValid
}

// 提交申请
const submitApply = async () => {
  if (!validateForm()) return
  
  try {
    showToast('正在提交申请...', 'info')
    
    const res = await shopApi.applySeller({
      name: applyForm.value.name.trim(),
      description: applyForm.value.description.trim()
    })
    
    showToast('申请成功，请等待审核', 'success')
    
    // 重新加载商户信息
    await loadSellerInfo()
  } catch (error) {
    console.error('申请店铺失败:', error)
    showToast(error.message || '申请失败，请重试', 'error')
  }
}

// 联系管理
const contactAdmin = () => {
  showToast('请联系系统管理员', 'info')
}

// 打开编辑模态框
const openEditModal = () => {
  editForm.value = {
    name: sellerInfo.value.name || '',
    description: sellerInfo.value.description || '',
    cover: sellerInfo.value.cover || ''
  }
  // 设置ImageUploader显示的URL
  editCoverUrl.value = sellerInfo.value.cover_url || ''
  // 记录原始头像状态，用于判断是否必填
  originalCover.value = sellerInfo.value.cover || ''
  formErrors.value = { name: '', description: '', cover: '' }
  showEditModal.value = true
}

// 关闭编辑模态框
const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = { name: '', description: '', cover: '' }
  editCoverUrl.value = ''
  originalCover.value = ''
  formErrors.value = { name: '', description: '', cover: '' }
}

// 验证表单
const validateEditForm = () => {
  let isValid = true
  formErrors.value = { name: '', description: '', cover: '' }
  
  // 如果原来没有头像，现在也必须上传
  if (!originalCover.value && !editForm.value.cover) {
    showToast('请上传店铺头像', 'error')
    isValid = false
  }
  
  if (!editForm.value.name.trim()) {
    showToast('请输入店铺名称', 'error')
    isValid = false
  } else if (editForm.value.name.length > 30) {
    showToast('店铺名称不能超过30字', 'error')
    isValid = false
  }
  
  if (editForm.value.description.length > 200) {
    showToast('店铺简介不能超过200字', 'error')
    isValid = false
  }
  
  return isValid
}

// 保存编辑
const saveEdit = async () => {
  if (!validateEditForm()) return
  
  try {
    isSaving.value = true
    
    const res = await shopApi.updateSeller({
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim(),
      cover: editForm.value.cover
    })
    
    showToast('保存成功', 'success')
    
    // 重新加载商户信息
    await loadSellerInfo()
    
    // 关闭模态框
    closeEditModal()
  } catch (error) {
    console.error('保存失败:', error)
    showToast(error.message || '保存失败，请重试', 'error')
  } finally {
    isSaving.value = false
  }
}


// ================= Watch 监听 =================
// 监听用户信息变化，账号切换时重新加载店铺数据
watch(() => appStore.userInfo, async (newUserInfo) => {
  if (newUserInfo) {
    // 重置状态
    sellerInfo.value = null
    categories.value = []
    products.value = []
    orders.value = []
    
    // 重新加载数据
    await loadSellerInfo()
    await loadStats()
    
    // 如果已开通店铺，加载商品、分类和订单
    if (sellerInfo.value && sellerInfo.value.status === 'pass') {
      await Promise.all([
        loadCategories(),
        loadProducts(),
        loadOrders()
      ])
      
      // 重新初始化拖拽
      await nextTick()
      initDraggable()
    }
  }
}, { immediate: false })

onMounted(async () => {
  await loadSellerInfo()
  await loadStats()
  
  // 如果已开通店铺，加载商品、分类和订单
  if (sellerInfo.value && sellerInfo.value.status === 'pass') {
    await Promise.all([
      loadCategories(),
      loadProducts(),
      loadOrders()
    ])
    
    // 初始化拖拽
    await nextTick()
    initDraggable()
  }
})

// ================= 拖拽排序 =================
const isSorting = ref(false)

// 初始化拖拽
const initDraggable = () => {
  // 分类列表拖拽
  if (categoryListRef.value && window.Sortable) {
    categorySortable = new window.Sortable(categoryListRef.value, {
      animation: 200,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async (evt) => {
        await handleCategorySort(evt)
      }
    })
  }
  
  // 商品列表拖拽（只在列表视图）
  if (productListRef.value && window.Sortable) {
    productSortable = new window.Sortable(productListRef.value, {
      animation: 200,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async (evt) => {
        await handleProductSort(evt)
      }
    })
  }
}

// 处理分类排序
const handleCategorySort = async (evt) => {
  if (isSorting.value) return
  
  const oldIndex = evt.oldIndex
  const newIndex = evt.newIndex
  
  if (oldIndex === newIndex) return
  
  try {
    isSorting.value = true
    
    // 更新本地数组顺序
    const item = categories.value.splice(oldIndex, 1)[0]
    categories.value.splice(newIndex, 0, item)
    
    // 只更新排序值发生变化的项目
    const updates = []
    categories.value.forEach((category, index) => {
      const newSort = (index + 1) * 10
      if (category.sort !== newSort) {
        updates.push(
          shopApi.sortCategories({
            category_id: category.category_id,
            sort: newSort
          })
        )
      }
    })
    
    if (updates.length > 0) {
      await Promise.all(updates)
    }
    
    // 重新加载列表确保数据同步
    await loadCategories()
    showToast('排序已更新', 'success')
  } catch (error) {
    console.error('排序失败:', error)
    showToast('排序失败，请重试', 'error')
    // 恢复原顺序
    await loadCategories()
  } finally {
    isSorting.value = false
  }
}

// 处理商品排序
const handleProductSort = async (evt) => {
  if (isSorting.value) return
  
  const oldIndex = evt.oldIndex
  const newIndex = evt.newIndex
  
  if (oldIndex === newIndex) return
  
  try {
    isSorting.value = true
    
    // 更新本地数组顺序
    const item = products.value.splice(oldIndex, 1)[0]
    products.value.splice(newIndex, 0, item)
    
    // 只更新排序值发生变化的项目
    const updates = []
    products.value.forEach((product, index) => {
      const newSort = (index + 1) * 10
      if (product.sort !== newSort) {
        updates.push(
          shopApi.sortProducts(null, {
            params: {
              product_id: product.product_id,
              sort: newSort
            }
          })
        )
      }
    })
    
    if (updates.length > 0) {
      await Promise.all(updates)
    }
    
    // 重新加载列表确保数据同步
    await loadProducts()
    showToast('排序已更新', 'success')
  } catch (error) {
    console.error('排序失败:', error)
    showToast('排序失败，请重试', 'error')
    // 恢复原顺序
    await loadProducts()
  } finally {
    isSorting.value = false
  }
}

// ================= 订单管理相关方法 =================

// 设置订单筛选
const setOrderFilter = (filter) => {
  currentOrderFilter.value = filter
}

// 加载订单列表
const loadOrders = async () => {
  try {
    isOrdersLoading.value = true
    const res = await orderApi.getShopOrderList()
    
    if (res && res.items && Array.isArray(res.items)) {
      orders.value = res.items
      // 更新统计信息
      stats.value.orderCount = res.total || res.items.length
      
      // 执行动画
      animateStats()
    }
  } catch (error) {
    console.error('加载订单失败:', error)
    showToast('加载订单失败', 'error')
  } finally {
    isOrdersLoading.value = false
  }
}

// 打开订单详情
const openOrderDetail = (order) => {
  selectedOrder.value = order
  showOrderDetailModal.value = true
}

// 关闭订单详情
const closeOrderDetailModal = () => {
  showOrderDetailModal.value = false
  selectedOrder.value = null
}

// 打开备注模态框
const openRemarkModal = (order) => {
  remarkForm.value = {
    order_no: order.order_no,
    remark: order.remark_shop || ''
  }
  showRemarkModal.value = true
}

// 关闭备注模态框
const closeRemarkModal = () => {
  showRemarkModal.value = false
  remarkForm.value = {
    order_no: '',
    remark: ''
  }
}

// 保存备注
const saveRemark = async () => {
  if (!remarkForm.value.order_no) return
  
  try {
    isSavingRemark.value = true
    await orderApi.addRemark({
      order_no: remarkForm.value.order_no,
      remark: remarkForm.value.remark
    })
    showToast('备注保存成功', 'success')
    closeRemarkModal()
    await loadOrders()
    // 如果订单详情模态框打开，更新选中的订单
    if (selectedOrder.value && selectedOrder.value.order_no === remarkForm.value.order_no) {
      selectedOrder.value.remark_shop = remarkForm.value.remark
    }
  } catch (error) {
    console.error('保存备注失败:', error)
    showToast(error.response?.data?.message || '保存备注失败', 'error')
  } finally {
    isSavingRemark.value = false
  }
}

// 处理订单操作
const handleOrderAction = async (action, order) => {
  processingKey.value = `${order.order_no}_${action}`
  
  try {
    if (action === 'delivery') {
      // 更新发货状态
      await orderApi.confirmDelivery({
        order_no: order.order_no,
        is_delivery: true
      })
      showToast('发货成功', 'success')
      await loadOrders()
      closeOrderDetailModal()
    } else if (action === 'delete') {
      if (confirm('确定删除此订单吗？')) {
        // 删除订单
        await orderApi.deleteShopOrder({
          params: { order_no: order.order_no }
        })
        showToast('订单已删除', 'success')
        await loadOrders()
      }
    }
  } catch (error) {
    console.error('操作失败:', error)
    const errorMessage = error.response?.data?.message || error.message || '操作失败'
    showToast(errorMessage, 'error')
  } finally {
    processingKey.value = null
  }
}

// ================= 生命周期 =================
// 监听账号切换，重新加载数据
watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    loadSellerInfo()
  }
}, { immediate: false })

</script>

<style scoped>
/* 未开通店铺状态 */
.empty-seller-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 140px);
  padding: 2rem 1.5rem;
}

.empty-state-card {
  max-width: 680px;
  width: 100%;
  padding: 3rem 2.5rem;
  text-align: center;
  user-select: none;
}

/* 覆盖 bento-card 的默认悬停效果 */
.empty-state-card:hover {
  transform: none;
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}

.empty-icon-wrapper {
  margin-bottom: 2rem;
}

.empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 28px;
  background: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
  color: #fff;
  box-shadow: 0 12px 32px rgba(0, 122, 255, 0.3);
}

.empty-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.empty-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 2.5rem;
  line-height: 1.5;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  padding: 1rem;
  background: var(--bg-input);
  border-radius: 16px;
  text-align: left;
  user-select: none;
  pointer-events: none;
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.feature-content h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.2rem;
}

.feature-content p {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 2.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 16px;
  transition: all 0.2s var(--spring);
  cursor: pointer;
}

.btn-apply:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.35);
}

.btn-apply:active {
  transform: scale(0.98);
}

.btn-apply i {
  font-size: 1.1rem;
}

/* 视图切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s var(--spring);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.intro-view,
.apply-form-view,
.examine-view,
.disable-view,
.loading-view {
  width: 100%;
}

/* 加载状态 */
.loading-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1.5rem;
}

/* 申请表单样式扩展 */
.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-input);
  border: 0.5px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--spring);
}

.back-btn:hover {
  background: var(--bg-elevated);
  transform: scale(1.05);
}

.form-spacer {
  width: 36px; /* 与返回按钮同宽，保持标题居中 */
}

.form-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  flex: 1;
}

.form-content {
  text-align: left;
}

.form-input {
  width: 100%;
  padding: 0.9rem 1rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.form-input.error {
  border-color: var(--danger);
}

.form-input.error:focus {
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.error-message {
  font-size: 0.8rem;
  color: var(--danger);
  margin-top: 0.3rem;
}

.char-count {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  text-align: right;
}

.btn-submit {
  margin-top: 1rem;
}

/* 状态页面样式 */

.status-icon-wrapper {
  margin-bottom: 2rem;
}

.status-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
  color: #fff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.status-icon.examine {
  background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
  box-shadow: 0 12px 32px rgba(255, 149, 0, 0.3);
}

.status-icon.disable {
  background: linear-gradient(135deg, #FF3B30 0%, #D70015 100%);
  box-shadow: 0 12px 32px rgba(255, 59, 48, 0.3);
}

.status-info {
  background: var(--bg-input);
  border-radius: 16px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: left;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 0;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.info-item:not(:last-child) {
  border-bottom: 1px solid var(--border);
}

.info-item i {
  width: 20px;
  color: var(--accent);
  font-size: 1rem;
}

.status-tips {
  background: var(--bg-input);
  border-radius: 16px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  text-align: left;
}

.status-tips h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.status-tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.status-tips li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.8rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
}

.status-tips li:last-child {
  margin-bottom: 0;
}

.status-tips li::before {
  content: '•';
  position: absolute;
  left: 0.5rem;
  color: var(--accent);
  font-weight: bold;
}

.status-actions {
  margin-top: 2rem;
}

.btn-contact {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 2rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--spring);
}

.btn-contact:hover {
  background: var(--bg-surface-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.btn-contact:active {
  transform: scale(0.98);
}

.btn-edit-seller {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

/* 商户状态样式 */
.seller-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-default .status-dot { background: var(--text-tertiary); }
.status-default { background: rgba(142, 142, 147, 0.15); color: var(--text-tertiary); }

.status-examine .status-dot { background: var(--warning); }
.status-examine { background: rgba(255, 159, 10, 0.15); color: var(--warning); }

.status-pass .status-dot { background: var(--success); }
.status-pass { background: rgba(52, 199, 89, 0.15); color: var(--success); }

.status-disable .status-dot { background: var(--danger); }
.status-disable { background: rgba(255, 59, 48, 0.15); color: var(--danger); }

/* ================= 商品管理卡片样式 ================= */
/* 管理卡片 - 禁用公共样式的悬停效果 */
.product-manage-card {
  cursor: default;
  user-select: none;
}

.product-manage-card:hover {
  transform: none;
  box-shadow: var(--shadow-sm);
  border-color: var(--card-border);
}

/* 上下架状态标签 */
.product-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  z-index: 2;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.product-badge.badge-up {
  background: color-mix(in srgb, var(--success) 85%, transparent);
  color: #fff;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--success) 30%, transparent);
}

.product-badge.badge-down {
  background: color-mix(in srgb, var(--text-tertiary) 60%, transparent);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 元数据行内布局 */
.product-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* 价格行：管理页面使用 */
.product-price-row {
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-top: 0.6rem;
  margin-bottom: 0;
}

.product-price-row .price-current {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.product-price-row .price-origin {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.product-price-row .product-meta-inline {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* 管理操作按钮区域 */
.product-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
}

.action-btn-manage {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--bg-input);
  border: 0.5px solid var(--border);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--spring);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.action-btn-manage:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
  transform: scale(1.08);
  box-shadow: var(--shadow-sm);
}

.action-btn-manage:active {
  transform: scale(0.95);
}

.action-btn-manage.danger:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--danger) 30%, transparent);
}
/* 响应式 */
@media (max-width: 768px) {
  .empty-seller-container {
    padding: 1.5rem 1rem;
    min-height: calc(100vh - 120px);
  }
  
  .empty-state-card {
    padding: 2rem 1.5rem;
  }
  
  .empty-icon {
    width: 80px;
    height: 80px;
    font-size: 2.2rem;
  }
  
  .empty-title {
    font-size: 1.5rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }
  
  .btn-apply {
    width: 100%;
    justify-content: center;
  }
  
  .seller-info-card {
    flex-direction: column;
    text-align: center;
    padding: 1.2rem;
  }
  
  .manage-item {
    padding: 1rem;
  }
}

/* ================= 拖拽排序样式 ================= */
.sortable-ghost {
  opacity: 0.4;
  background: var(--bg-surface-hover);
}

.sortable-drag {
  opacity: 0.9;
  box-shadow: var(--shadow-lg);
  cursor: grabbing !important;
}

/* ================= 订单列表移动端适配 ================= */
@media (max-width: 768px) {
  /* 订单列表项整体布局优化 */
  .setting-item {
    padding: 0.8rem;
    gap: 0.6rem;
    align-items: center;
  }
  
  /* 商品图片缩小 */
  .setting-item > div:first-child {
    width: 50px !important;
    height: 50px !important;
    margin-right: 0 !important;
    flex-shrink: 0;
  }
  
  /* 订单信息区域调整 */
  .setting-info {
    min-width: 0;
    flex: 1;
  }
  
  /* 标题和状态标签同行显示 */
  .setting-label {
    font-size: 0.85rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  
  .setting-label .order-status {
    margin-left: 0 !important;
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
  }
  
  /* 订单号和购买时间在第一行 */
  .setting-desc > div:first-child {
    flex-wrap: wrap !important;
    gap: 0.4rem !important;
    margin-bottom: 0.2rem;
  }
  
  /* 简化元数据显示 */
  .meta-item {
    font-size: 0.75rem;
    line-height: 1.4;
  }
  
  /* 买家信息行：用户名、数量、催发货 */
  .setting-desc > div:nth-child(2) {
    margin-top: 0.3rem;
    flex-wrap: wrap;
    gap: 0.3rem !important;
  }
  
  .setting-desc > div:nth-child(2) .meta-item {
    font-size: 0.75rem;
  }
  
  /* 催发货标识缩小 */
  .setting-desc > div:nth-child(2) span[title="用户催发货次数"] {
    font-size: 0.65rem !important;
  }
  
  /* 用户备注截断 */
  .setting-desc .meta-item[style*="max-width"] {
    max-width: 200px !important;
    font-size: 0.7rem;
  }
  
  /* 操作按钮上下居中 */
  .setting-value {
    flex-shrink: 0;
    align-self: center;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  
  .action-btn-manage {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
}
</style>
