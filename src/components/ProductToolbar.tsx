import { Segmented } from '@/components/Segmented'
import { SearchField } from '@/components/SearchField'
import type { CSSProperties, ReactNode } from 'react'
import { Tabs } from './Tabs'

type ProductSort = '' | 'sales' | 'price'

const SORTS: ReadonlyArray<{ key: ProductSort; label: string }> = [
  { key: '', label: '默认' },
  { key: 'sales', label: '销量' },
  { key: 'price', label: '价格' },
]

/**
 * 商品列表的工具栏：分类 → 搜索 → 排序（→ 可选的操作按钮）。
 * 商城的「我的店铺」与别人的店铺页共用，差异由 props 决定。
 */
export function ProductToolbar({
  categories,
  categoryId,
  onCategory,
  allLabel = '全部',
  showCategories = true,
  value,
  onCommit,
  sort,
  onSort,
  placeholder,
  extra,
  style,
}: {
  categories: ReadonlyArray<{ id: number; name: string }>
  categoryId: number
  onCategory: (categoryId: number) => void
  allLabel?: string
  showCategories?: boolean
  /** 当前生效的搜索词（来自 URL） */
  value: string
  onCommit: (next: string) => void
  sort: ProductSort
  onSort: (sort: ProductSort) => void
  placeholder: string
  extra?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className="toolbar" style={style}>
      {showCategories ? (
        <Tabs
          items={[{ key: 0, label: allLabel }, ...categories.map((c) => ({ key: c.id, label: c.name }))]}
          value={categoryId}
          onChange={onCategory}
          label="商品分类"
        />
      ) : null}
      <span className="spacer" />
      <SearchField label="搜索商品名" placeholder={placeholder} value={value} onCommit={onCommit} />
      <Segmented
        label="排序"
        value={sort}
        onChange={onSort}
        items={SORTS.map((item) => ({ value: item.key, label: item.label }))}
      />
      {extra}
    </div>
  )
}
