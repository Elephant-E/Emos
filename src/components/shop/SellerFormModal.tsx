import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { ImagePicker } from '@/components/ImagePicker'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useShopMutations } from '@/api/queries'

interface SellerDraft {
  name: string
  description: string
  cover_url: string | null
}

/**
 * 店铺设置：已开店是「编辑店铺」，未开店是「申请开店（扣 3000 胡萝卜）」。
 * 两个分支的提交载荷不同——申请接口没有封面上传能力，只有更新才带 cover_url。
 */
export function SellerFormModal({
  current,
  isSeller,
  onClose,
}: {
  current: SellerDraft
  isSeller: boolean
  onClose: () => void
}) {
  const actions = useShopMutations()
  const [form, setForm] = useState<SellerDraft>(current)

  const submit = async () => {
    // 开店申请（pay/apply）没有封面字段，只有已开店的更新才带
    const payload = isSeller
      ? { name: form.name.trim(), description: form.description.trim(), cover_url: form.cover_url }
      : { name: form.name.trim(), description: form.description.trim() }
    const onSuccess = () => {
      toast(isSeller ? '已保存' : '已提交申请', 'success')
      onClose()
    }
    if (isSeller) {
      actions.saveSeller.mutate(payload, { onSuccess })
      return
    }
    const ok = await confirmDialog({
      title: '申请开店？',
      message: '扣除 3000 胡萝卜，不退还。',
      hint: '提交后由管理员审核，通过后才能上架商品。',
      confirmText: '确认申请',
      danger: true,
    })
    if (!ok) return
    actions.applySeller.mutate(payload, { onSuccess })
  }

  return (
    <Modal
      title={isSeller ? '编辑店铺' : '申请开店'}
      hint={isSeller ? '修改后会重新进入审核。' : '提交后由管理员审核，通过后才能上架商品。'}
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmText={isSeller ? '保存' : '提交申请'}
          pending={actions.saveSeller.isPending || actions.applySeller.isPending}
          disabled={!form.name.trim()}
        />
      }
    >
      {isSeller ? (
        <ImagePicker
          label="店铺封面"
          value={form.cover_url}
          onChange={(url) => setForm((prev) => ({ ...prev, cover_url: url }))}
        />
      ) : null}
      <label className="field">
        <span>店铺名称</span>
        <input
          className="input"
          value={form.name}
          maxLength={30}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
      </label>
      <label className="field">
        <span>简介</span>
        <textarea
          className="input"
          value={form.description}
          maxLength={200}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
    </Modal>
  )
}
