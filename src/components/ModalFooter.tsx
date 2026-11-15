/**
 * 弹窗底部：左「取消」右「确认」。
 *
 * 站内 36 个弹窗各手写一遍同一段 JSX（含文案、disabled、提交中状态），
 * 写法不统一的地方全在这里收敛：取消一律 `btn--ghost`、确认一律 `btn--primary`，
 * 提交中时确认键同时禁用并把文案换成进行时。
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
