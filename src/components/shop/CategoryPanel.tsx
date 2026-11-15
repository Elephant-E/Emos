import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { CardHead } from '@/components/CardHead'
import { InlineSortInput } from '@/components/InlineSortInput'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useShopCategories, useShopMutations } from '@/api/queries'

/**
 * 分类管理：新增、行内排序、删除（删前说明「商品会变为未分类」）。
 * 列表、新建框与排序都只服务这个面板，状态收在这里；页面只传「是不是店主」和关闭回调。
 */
export function CategoryPanel({
  sellerId,
  isSeller,
  onClose,
}: {
  sellerId?: number
  isSeller: boolean
  onClose: () => void
}) {
  const categories = useShopCategories(sellerId)
  const actions = useShopMutations()
  const [newCategory, setNewCategory] = useState('')

  const createCategory = () => {
    if (!newCategory.trim() || actions.createCategory.isPending) return
    actions.createCategory.mutate(
      { name: newCategory.trim(), sort: 80 },
      {
        onSuccess: () => {
          toast('分类已创建', 'success')
          setNewCategory('')
        },
      },
    )
  }

  return (
    <Modal
      title="分类管理"
      width={560}
      onClose={onClose}
      onSubmit={() => {
        // 分类输入框有内容时回车才创建，否则不拦截
        if (newCategory.trim()) createCategory()
      }}
    >
      <>
        <CardHead title="分类">
          {isSeller ? (
            <div className="row-input" style={{ maxWidth: 320 }}>
              <input
                className="input"
                placeholder="新分类名称"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                maxLength={20}
              />
              <button type="button" className="btn btn--ghost" disabled={!newCategory.trim()} onClick={createCategory}>
                新增
              </button>
            </div>
          ) : null}
        </CardHead>

        {categories.error ? <ErrorBlock bare error={categories.error} onRetry={() => categories.refetch()} /> : null}
        {!categories.error && categories.isLoading ? <LoadingBlock bare rows={3} columns={2} /> : null}
        {!categories.error && (categories.data?.length ?? 0) === 0 ? <EmptyBlock bare title="还没有分类" /> : null}

        {(categories.data?.length ?? 0) > 0 ? (
          <ul style={{ display: 'grid', gap: 2, marginTop: 12 }}>
            {(categories.data ?? []).map((category) => (
              <li
                key={category.category_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-3)',
                  padding: 'var(--sp-2) var(--sp-hair)',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <span style={{ color: 'var(--fg-2)' }}>{category.name}</span>
                <span className="spacer" />
                {isSeller ? (
                  <InlineSortInput
                    value={category.sort}
                    label={`${category.name} 的排序`}
                    onCommit={(sort) =>
                      actions.sortCategory.mutate(
                        { categoryId: category.category_id, sort },
                        { onSuccess: () => toast('已调整排序', 'success') },
                      )
                    }
                  />
                ) : (
                  <span className="meta-sm">排序 {category.sort}</span>
                )}
                {isSeller ? (
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: `删除分类「${category.name}」？`,
                        message: '分类下的商品会变为未分类。',
                        confirmText: '删除',
                        danger: true,
                      })
                      if (!ok) return
                      actions.removeCategory.mutate(category.category_id, { onSuccess: () => toast('已删除', 'success') })
                    }}
                  >
                    删除
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </>
    </Modal>
  )
}
