const BASE = 'https://emos.club'
const TOKEN = '1090_zijIu560MmusQM8j'
const log = (k, v) => console.log(k.padEnd(26), typeof v === 'string' ? v : JSON.stringify(v)?.slice(0, 220))

async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(BASE + path)
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  return { status: res.status, json }
}

const cleanup = []
try {
  // ---- 1. 音乐片单：建 → 加歌 → 列 → 移歌 → 删
  const song = await api('/api/music/song/list', { query: { page: 1, page_size: 1 } })
  const songId = song.json?.items?.[0]?.song_id
  log('取样歌曲', songId ?? song.status)

  const created = await api('/api/watch', { method: 'POST', body: { type: "music", name: "QA 测试片单（自动删除）", is_public: false, is_show_empty: true, point: 0 } })
  log('建音乐片单', created.json)
  const watchId = created.json?.watch_id
  if (!watchId) throw new Error('未返回 watch_id')
  cleanup.push({ kind: 'watch', id: watchId })

  log('加歌', (await api(`/api/watch/${watchId}/music/${songId}`, { method: 'POST', body: { sort: 80, remark: null } })).json)
  const listed = await api(`/api/watch/${watchId}/music`, { query: { page: 1, page_size: 5 } })
  log('列歌', { status: listed.status, total: listed.json?.total, first: listed.json?.items?.[0]?.name?.slice(0, 16) })
  log('移歌', (await api(`/api/watch/${watchId}/music/${songId}`, { method: 'DELETE' })).json)

  // ---- 2. 商品：建 → 查 → 删
  const seller = await api('/api/shop/seller/info')
  const sellerId = seller.json?.seller_id ?? seller.json?.id
  const product = await api('/api/shop/product/createOrUpdate', {
    method: 'POST',
    body: { seller_id: sellerId, name: 'QA 测试商品（自动删除）', price: 1, stock: 1, sort: 1, is_up: false, description: '自动化验证用，稍后删除' },
  })
  log('建商品', { status: product.status, body: product.json })
  const productId = product.json?.product_id
  if (productId) cleanup.push({ kind: 'product', id: productId })
  if (productId) log('删商品', (await api('/api/shop/product/delete', { method: 'DELETE', query: { product_id: productId } })).status)

  // ---- 3. 资源移动：移到自己当前所在的集（no-op，验证调用链）
  const seasons = await api('/api/video/4070/season')
  log('季列表', { status: seasons.status, n: Array.isArray(seasons.json) ? seasons.json.length : 'n/a' })

  // ---- 4. 求片：认领 → 撤回
  const seeks = await api('/api/seek', { method: 'POST', body: { sort_by: 'updated_at', sort_order: 'desc', status: ['default'], page: 1, page_size: 20 } })
  const claimable = (seeks.json?.items ?? []).find((s) => s.is_can_claim && s.status === 'default')
  log('可认领', claimable ? claimable.id : '无')
  if (claimable) {
    log('认领', (await api('/api/seek/claim', { method: 'PUT', body: { seek_id: claimable.id, type: 'confirm' } })).json)
    log('撤回认领', (await api('/api/seek/claim', { method: 'PUT', body: { seek_id: claimable.id, type: 'cancel' } })).json)
  }
} catch (error) {
  console.log('FAILED', error.message)
} finally {
  for (const c of cleanup.reverse()) {
    if (c.kind === 'watch') log('清理片单', (await api(`/api/watch/${c.id}`, { method: 'DELETE' })).status)
    if (c.kind === 'product') log('清理商品', (await api('/api/shop/product/delete', { method: 'DELETE', query: { product_id: c.id } })).status)
  }
}
