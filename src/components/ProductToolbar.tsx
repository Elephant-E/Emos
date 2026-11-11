import type { CSSProperties, ReactNode } from 'react'
import { Tabs } from './Tabs'

export type ProductSort = '' | 'sales' | 'price'

const SORTS: ReadonlyArray<{ key: ProductSort; label: string }> = [
  { key: '', label: '默认' },
  { key: 'sales', label: '销量' },
  { key: 'price', label: '价格' },
]

/**
 * 商品列表的工具栏：分类 → 搜索 → 排序（→ 可选的操作按钮）。
 *
 * 商城的「我的店铺」和别人的店铺页是同一套排列，只有分类文案、搜索框提示
 * 和右侧是否多一个「新增商品」不同。原来两处各写一遍，连输入框的
 * `minWidth: 170` 都一样。
 */
export function ProductToolbar({
  categories,
  categoryId,
  onCategory,
  allLabel = '全部',
  showCategories = true,
  term,
  onTerm,
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
  term: string
  onTerm: (value: string) => void
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
      <input
        className="input"
        type="search"
        placeholder={placeholder}
        value={term}
        onChange={(e) => onTerm(e.target.value)}
      />
      <div className="seg" role="group" aria-label="排序">
        {SORTS.map((item) => (
          <button key={item.key} aria-pressed={sort === item.key} onClick={() => onSort(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      {extra}
    </div>
  )
}
