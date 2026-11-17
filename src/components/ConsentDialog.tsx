import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { toast } from '@/ui/toast'
import { useAccountMutations } from '@/api/queries'

/** 权限开通：先给用户看须知，本人确认后才调用接口（权限类操作不静默生效）。 */
export function ConsentDialog({ kind, onClose }: { kind: 'upload' | 'download'; onClose: () => void }) {
  const actions = useAccountMutations()
  const mutation = kind === 'upload' ? actions.agreeUpload : actions.agreeDown

  return (
    <Modal
      title={kind === 'upload' ? '在上传之前，请审视您的文件：' : '下载须知'}
      width={460}
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelText="我再想想"
          onConfirm={() =>
            mutation.mutate(undefined, {
              onSuccess: () => {
                toast(kind === 'upload' ? '已开通上传权限' : '已开通下载权限', 'success')
                onClose()
              },
            })
          }
          confirmText="认可并同意"
          pending={mutation.isPending}
        />
      }
    >
      {kind === 'upload' ? (
        <>
          <p className="card-note" style={{ marginTop: 0 }}>
            若它承载着光明与欢笑，无惧在阳光下共赏，请归档于{' '}
            <a href="https://wiki.emos.best" target="_blank" rel="noreferrer">
              emos
            </a>
            ；
          </p>
          <p className="card-note">
            若它涌动着本能与躁动，只属于深夜的独白，请封印于{' '}
            <a href="https://empn.mom" target="_blank" rel="noreferrer">
              empn
            </a>
            。
          </p>
          <p className="card-note">秩序与混乱，仅在一念之间。</p>
          <p className="card-note" style={{ color: 'var(--c-red)' }}>
            因储存问题，目前视频资源上传后存在丢失风险。
          </p>
        </>
      ) : (
        <>
          <p className="card-note" style={{ marginTop: 0 }}>
            下载会把文件保存到本机，请遵守站点规则与当地法律。
          </p>
          <p className="card-note">同意后即可在播放端与本后台使用下载功能。</p>
        </>
      )}
    </Modal>
  )
}
