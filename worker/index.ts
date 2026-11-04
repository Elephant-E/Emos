interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  API_ORIGIN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      const target = new URL(url.pathname + url.search, env.API_ORIGIN)
      const headers = new Headers(request.headers)
      headers.set('Host', target.host)
      const init: RequestInit = { method: request.method, headers, redirect: 'manual' }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.arrayBuffer()
      }
      return fetch(new Request(target, init))
    }
    return env.ASSETS.fetch(request)
  },
}
