let _resolve = null
let _visible = false
let _title = ''
let _message = ''
let _container = null
let _isDanger = false

function createContainer() {
  if (_container) return
  _container = document.createElement('div')
  _container.id = 'global-confirm-container'
  document.body.appendChild(_container)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function render() {
  if (!_container) createContainer()
  const safeTitle = escapeHtml(_title)
  const safeMessage = escapeHtml(_message)
  _container.innerHTML = `
    <div class="modal-overlay show" onclick="if(event.target===this)window.__confirmCancel()">
      <div class="modal-content" style="max-width:400px;">
        <div class="modal-body" style="padding:16px 12px 4px;">
          <div style="font-size:0.95rem;font-weight:600;color:var(--system-primary);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeTitle}</div>
          <div style="font-size:0.88rem;color:var(--system-secondary);line-height:1.5;word-break:break-word;overflow-wrap:anywhere;">${safeMessage}</div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" onclick="window.__confirmCancel()">取消</button>
          <button class="modal-btn ${_isDanger ? 'danger' : 'primary'}" onclick="window.__confirmOk()">确定</button>
        </div>
      </div>
    </div>
  `
}

function remove() {
  if (_container) _container.innerHTML = ''
  _visible = false
}

window.__confirmOk = () => {
  remove()
  if (_resolve) { _resolve(true); _resolve = null }
}

window.__confirmCancel = () => {
  remove()
  if (_resolve) { _resolve(false); _resolve = null }
}

export async function confirmDialog(message, title = '确认', isDanger = false) {
  _title = title
  _message = message
  _isDanger = isDanger
  _visible = true
  render()
  return new Promise((resolve) => { _resolve = resolve })
}
