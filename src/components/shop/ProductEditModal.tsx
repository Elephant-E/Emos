import { numberFromInput } from '@/lib/format'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { ImagePicker } from '@/components/ImagePicker'
import type { ShopProduct } from '@/api/types'

/** 草稿就是商品字段的部分集合：新增时只有几个默认值，编辑时由详情回填 */
type ProductDraft = Partial<ShopProduct>

/** 新增 / 编辑商品：草稿由页面持有，这里只呈现，改动经 onChange 回传。 */
export function ProductEditModal({
  draft,
  categories,
  pending,
  detailLoading = false,
  onChange,
  onClose,
  onSave,
}: {
  draft: ProductDraft
  categories: Array<{ category_id: number; name: string }>
  pending: boolean
  /** 编辑时商品详情还在回填：此时保存会把简介/兑换方式/时间窗写成 null */
  detailLoading?: boolean
  onChange: (patch: Partial<ProductDraft>) => void
  onClose: () => void
  onSave: () => void
}) {
  const fallbackCategory = draft.category_id ?? categories[0]?.category_id
  return (
    <Modal
      title={draft.product_id ? '编辑商品' : '新增商品'}
      width={460}
      onClose={onClose}
      onSubmit={onSave}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onSave}
          confirmText="保存"
          pending={pending}
          /* 详情回填未完成时不许保存：编辑是整体覆盖，会清空简介/兑换方式/时间窗 */
          disabled={!draft.name?.trim() || !fallbackCategory || detailLoading}
        />
      }
    >
      <label className="field">
        <span>名称</span>
        <input className="input" value={draft.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} autoFocus />
      </label>
      <ImagePicker label="封面" value={draft.cover_url ?? null} onChange={(url) => onChange({ cover_url: url })} />
      <label className="field">
        <span>简介</span>
        <textarea
          className="input"
          maxLength={200}
          placeholder="200 字内"
          value={draft.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </label>
      <label className="field">
        <span>兑换方式</span>
        <textarea
          className="input"
          maxLength={1000}
          placeholder="1000 字内"
          value={draft.exchange_way ?? ''}
          onChange={(e) => onChange({ exchange_way: e.target.value })}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>售价</span>
          <input
            className="input"
            type="number"
            min={1}
            value={draft.price ?? 1}
            onChange={(e) => onChange({ price: numberFromInput(e.target.value) ?? 0 })}
          />
        </label>
        <label className="field">
          <span>原价</span>
          <input
            className="input"
            type="number"
            min={1}
            value={draft.price_origin ?? 1}
            onChange={(e) => onChange({ price_origin: numberFromInput(e.target.value) ?? 0 })}
          />
        </label>
        <label className="field">
          <span>库存</span>
          <input className="input" type="number" value={draft.stock ?? 0} onChange={(e) => onChange({ stock: numberFromInput(e.target.value) ?? 0 })} />
        </label>
        <label className="field">
          <span>排序</span>
          <input className="input" type="number" value={draft.sort ?? 80} onChange={(e) => onChange({ sort: numberFromInput(e.target.value) ?? 0 })} />
        </label>
      </div>
      <label className="field">
        <span>分类</span>
        <select
          className="input"
          value={fallbackCategory ?? ''}
          onChange={(e) => onChange({ category_id: Number(e.target.value) })}
        >
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="switch">
        <input type="checkbox" checked={draft.is_up ?? false} onChange={(e) => onChange({ is_up: e.target.checked })} />
        立即上架
      </label>
    </Modal>
  )
}
