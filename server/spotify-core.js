/**
 * Spotify 搜索代理核心 — dev (Vite middleware) / prod (Cloudflare Worker) 共用。
 *
 * 用 Supabase 边缘函数换取 Spotify access token，再做搜索。
 * anonKey 通过 opts 注入，不硬编码。
 */

const SPOTIFY_TOKEN_URL = 'https://flxgjwpkztgpdywkgckk.supabase.co/functions/v1/spotify-token';

// 进程级 token 缓存（worker 常驻 / dev 长连都受益）
let tokenCache = { token: null, expires: 0 };

/**
 * 获取 Spotify access token（带缓存）。
 * @param {string} anonKey Supabase anon key
 */
async function getSpotifyToken(anonKey) {
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token;
  }
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': 'Bearer ' + anonKey,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!res.ok) throw new Error('Spotify token request failed: ' + res.status);
  const data = await res.json();
  tokenCache.token = data.access_token;
  tokenCache.expires = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  return data.access_token;
}

/**
 * Spotify 搜索。
 * @param {object} params { q, type, limit }
 * @param {object} opts { anonKey }
 * @returns {Promise<{status:number, body:string, cacheControl?:string}>}
 */
export async function spotifySearch(params, opts) {
  const { q, type = 'artist', limit = '15' } = params || {};
  const { anonKey } = opts || {};

  if (!q) {
    return {
      status: 400,
      body: JSON.stringify({ success: false, message: '缺少搜索参数 q' }),
    };
  }

  try {
    const token = await getSpotifyToken(anonKey);
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`;
    const res = await fetch(searchUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    const searchData = await res.text();
    if (!res.ok) throw new Error('Spotify search failed: ' + res.status + ' ' + searchData);

    return {
      status: 200,
      body: searchData,
      cacheControl: 'public, max-age=300',
    };
  } catch (e) {
    return {
      status: 502,
      body: JSON.stringify({ success: false, message: 'Spotify 搜索失败: ' + e.message }),
    };
  }
}