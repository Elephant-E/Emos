/**
 * 弹窗底部：左「取消」右「确认」。
 * 取消一律 `btn--ghost`、确认一律 `btn--primary`，提交中时确认键禁用并把文案换成进行时。
 */
export function ModalFooter({
  onCancel,
  cancelText = '取消',
  onConfirm,
  confirmText = '保存',
  pending = false,
  pendingText,
  disabled = false,
  /** 传 <form> 的 submit：确认键改成 type=submit，让回车走表单校验 */
  submit = false,
}: {
  onCancel: () => void
  cancelText?: string
  onConfirm?: () => void
  confirmText?: string
  pending?: boolean
  pendingText?: string
  disabled?: boolean
  submit?: boolean
}) {
  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={onCancel}>
        {cancelText}
      </button>
      {onConfirm || submit ? (
        <button
          type={submit ? 'submit' : 'button'}
          className="btn btn--primary"
          disabled={disabled || pending}
          onClick={submit ? undefined : onConfirm}
        >
          {pending ? (pendingText ?? `${confirmText}中…`) : confirmText}
        </button>
      ) : null}
    </>
  )
}
