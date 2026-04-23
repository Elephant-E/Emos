// ==================== 全局常量 ====================
const CONSTANTS = {
  TMDB_LANG: 'zh-CN'
};

// ==================== 公共工具函数 (服务端) ====================
const jsonResponse = (data, status = 200, env = null) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    },
  });
};

const htmlResponse = (html, status = 200) =>
  new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-store'
    },
  });

const getTokenFromRequest = req => {
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
};

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error(`Request timeout: ${url}`);
    throw error;
  }
}

function getServerHeaders(token, env) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (env?.EMOS_PROXY_NAME && env?.EMOS_PROXY_ID) {
    headers['EMOS-PROXY-NAME'] = env.EMOS_PROXY_NAME;
    headers['EMOS-PROXY-ID'] = env.EMOS_PROXY_ID;
  }
  return headers;
}

// ==================== 路由入口 ====================
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    return handleRequest(request, env);
  }
};

// ==================== 主请求处理 ====================
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 静态文件路由
  if (path.startsWith('/static/')) {
    return handleStatic(request);
  }

  // 特殊 API 路由
  if (path === '/api/identify') return handleIdentify(request, env);
  if (path === '/api/user') return handleUserInfo(request, env);
  if (path === '/api/tmdb/backdrop') return handleTmdbBackdrop(request, env);
  if (path === '/api/tmdb/trailer') return handleTmdbTrailer(request, env);

  // 通用 API 代理
  if (path.startsWith('/api/')) {
    return handleApiProxy(request, env, path, url.search);
  }

  // 前端路由 (SPA 框架)
  const frontendRoutes = ['/', '/account', '/line', '/media', '/upload', '/watchlist', '/seek', '/login', '/shop', '/order'];
  const isFrontend = frontendRoutes.includes(path) || /^\/media\/\d+$/.test(path) || /^\/shop\/[^/]+$/.test(path);
  if (isFrontend) {
    if (path === '/login' || path === '/login/callback') return htmlResponse(renderLandingPage());
    return htmlResponse(renderFramework(resourceHashes));
  }

  return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
}

// ==================== 静态文件处理 ====================
async function handleStatic(request) {
  const url = new URL(request.url);
  const filePath = url.pathname;
  const content = STATIC_FILES[filePath];
  if (!content) return new Response('Not Found', { status: 404 });

  const hash = resourceHashes ? resourceHashes[filePath] : null;
  const etag = hash ? `"${hash}"` : null;
  const ifNoneMatch = request.headers.get('If-None-Match');

  if (etag && ifNoneMatch === etag) {
    return new Response(null, { status: 304 });
  }

  const ext = filePath.split('.').pop();
  const mimeType = {
    'css': 'text/css', 'js': 'application/javascript', 'html': 'text/html',
    'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
    'svg': 'image/svg+xml', 'ico': 'image/x-icon', 'woff': 'font/woff', 'woff2': 'font/woff2',
    'ttf': 'font/ttf', 'eot': 'application/vnd.ms-fontobject', 'json': 'application/json',
    'webp': 'image/webp', 'mp4': 'video/mp4', 'webm': 'video/webm', 'mp3': 'audio/mpeg', 'wav': 'audio/wav'
  }[ext] || 'application/octet-stream';

  return new Response(content, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400',
      ...(etag && { 'ETag': etag }),
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    },
  });
}

// ==================== 通用 API 代理 ====================
async function handleApiProxy(request, env, path, search) {
  if (!/^\/api\/(video|watch|user|shop|order|seek|proxy|live|identify|emya|upload|carrot|invite|telegram|redPacket|lottery|rank)/.test(path)) {
    return jsonResponse({ error: 'Forbidden' }, 403, env);
  }

  const token = getTokenFromRequest(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, env);

  const backendBase = env?.EMOS_BACKEND;
  const targetUrl = `${backendBase}${path}${search}`;

  try {
    const headers = getServerHeaders(token, env);
    const init = {
      method: request.method,
      headers: headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('Content-Type') || '';
      if (contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded')) {
        init.body = await request.text();
      } else {
        init.body = request.body; // 流式转发
        headers.delete('content-length'); 
      }
    }

    const response = await fetchWithTimeout(targetUrl, init, 10000);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.delete('set-cookie');
    responseHeaders.set('Cache-Control', 'private, no-store, max-age=0');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('API Proxy Error:', path, error.message);
    return jsonResponse({ error: 'Proxy Failed', message: 'Internal Server Error' }, 500, env);
  }
}

// ==================== TMDB 背景图代理 ====================
async function handleTmdbBackdrop(request, env) {
  const TMDB_API_KEY = env?.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return jsonResponse({ error: 'Server configuration error' }, 500, env);
  }
  const url = new URL(request.url);
  const tmdbId = url.searchParams.get('tmdb_id');
  const mediaType = url.searchParams.get('media_type');
  if (!tmdbId || !mediaType) {
    return jsonResponse({ error: 'Missing parameters' }, 400, env);
  }
  try {
    let apiUrl = '';
    if (mediaType === 'movie') {
      apiUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/images?include_image_language=null&api_key=${TMDB_API_KEY}`;
    } else if (mediaType === 'tv') {
      apiUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/images?include_image_language=null&api_key=${TMDB_API_KEY}`;
    } else {
      return jsonResponse({ error: 'Invalid media_type' }, 400, env);
    }
    const res = await fetchWithTimeout(apiUrl, {}, 5000);
    if (!res.ok) return jsonResponse({ error: 'TMDB request failed' }, res.status, env);
    const data = await res.json();

    const posters = data.posters || [];
    if (posters.length > 0 && posters[0].file_path) {
      const backdropUrl = `https://image.tmdb.org/t/p/original${posters[0].file_path}`;
      return jsonResponse({ backdrop_url: backdropUrl }, 200, env);
    }
    return jsonResponse({ backdrop_url: null }, 200, env);
  } catch (err) {
    console.error('TMDB backdrop error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500, env);
  }
}

// ==================== TMDB 预告片代理 ====================
async function handleTmdbTrailer(request, env) {
  const TMDB_API_KEY = env?.TMDB_API_KEY;
  if (!TMDB_API_KEY) return jsonResponse({ error: 'Server configuration error' }, 500, env);
  
  const url = new URL(request.url);
  const tmdbId = url.searchParams.get('tmdb_id');
  const mediaType = url.searchParams.get('media_type');
  
  if (!tmdbId || !mediaType) return jsonResponse({ error: 'Missing parameters' }, 400, env);
  if (!['movie', 'tv'].includes(mediaType)) return jsonResponse({ error: 'Invalid media_type' }, 400, env);

  try {
    const apiUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/videos?language=zh-CN&include_video_language=en,zh&api_key=${TMDB_API_KEY}`;
    const res = await fetchWithTimeout(apiUrl, {}, 5000);
    if (!res.ok) return jsonResponse({ error: 'TMDB request failed' }, res.status, env);
    
    const data = await res.json();
    const results = data.results || [];
    
    let trailer = results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && (v.iso_639_1 === 'zh' || v.iso_639_1 === 'zh-CN') && v.official === true) ||
                  results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && (v.iso_639_1 === 'zh' || v.iso_639_1 === 'zh-CN')) ||
                  results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official === true) ||
                  results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                  results.find(v => v.site === 'YouTube' && v.type === 'Teaser') ||
                  results.find(v => v.site === 'YouTube');
    
    if (trailer && trailer.key) {
      const embedUrl = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&loop=1&playlist=${trailer.key}&playsinline=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1&origin=${encodeURIComponent(new URL(request.url).origin)}`;
      return jsonResponse({ embed_url: embedUrl }, 200, env);
    }
    return jsonResponse({ embed_url: null }, 200, env);
  } catch (err) {
    console.error('TMDB trailer error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500, env);
  }
}

// ==================== API: 获取用户信息 ====================
async function handleUserInfo(request, env) {
  const token = getTokenFromRequest(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, env);
  try {
    const headers = getServerHeaders(token, env);
    const backendBase = env?.EMOS_BACKEND;
    const response = await fetchWithTimeout(`${backendBase}/api/user`, { headers }, 5000);
    if (response.status === 401) return jsonResponse({ error: 'Unauthorized' }, 401, env);
    if (!response.ok) return jsonResponse({ error: 'Failed to fetch user info' }, response.status, env);
    const apiData = await response.json();
    return jsonResponse({
      username: apiData.username || '',
      user_id: apiData.user_id || '',
      token,
      emya_url: apiData.emya_url,
      emya_live_url: apiData.emya_live_url,
      telegram_group_url: 'https://t.me/emospg',
      telegram_bind_url: apiData.telegram_bind_url,
      avatar: apiData.avatar || '',
      pseudonym: apiData.pseudonym,
      emya_password: apiData.emya_password,
      is_show_empty: apiData.is_show_empty,
      is_can_upload: apiData.is_can_upload,
      is_can_down: apiData.is_can_down,
      size_upload: apiData.size_upload,
      roles: apiData.roles || [],
      must_otp: apiData.must_otp,
      is_viewing: apiData.is_viewing,
      invite_remaining: apiData.invite_remaining,
      watch_slot_remaining: apiData.watch_slot_remaining,
      carrot: apiData.carrot,
      is_original_image: apiData.is_original_image,
      telegram_user_id: apiData.telegram_user_id,
      sign: apiData.sign || []
    }, 200, env);
  } catch (error) {
    console.error('API 请求异常', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500, env);
  }
}

// ==================== 识别 API ====================
async function handleIdentify(request, env) {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  const url = new URL(request.url);
  const filename = url.searchParams.get('filename');
  if (!filename) return jsonResponse({ error: 'Missing filename' }, 400, env);
  const token = getTokenFromRequest(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, env);
  const TMDB_API_KEY = env?.TMDB_API_KEY;
  if (!TMDB_API_KEY) return jsonResponse({ error: 'Server configuration error' }, 500, env);
  try {
    const parsed = await parseWithGuessitRest(filename);
    const tmdbResult = await searchTMDB(
      parsed.title,
      parsed.type,
      parsed.year,
      TMDB_API_KEY,
      CONSTANTS.TMDB_LANG
    );
    const emos = await findInEmos(
      token,
      tmdbResult.tmdb_id,
      tmdbResult.type,
      parsed.season,
      parsed.episode,
      env
    );
    if (!emos) throw new Error('EMOS 中未找到对应资源');
    return jsonResponse({
      item_type: emos.item_type,
      item_id: emos.item_id,
      title: tmdbResult.title,
      original_title: tmdbResult.original_title,
      year: tmdbResult.year,
      type: tmdbResult.type,
      season: parsed.season,
      episode: parsed.episode,
      poster: tmdbResult.poster,
      backdrop: tmdbResult.backdrop,
      overview: tmdbResult.overview,
    }, 200, env);
  } catch (err) {
    console.error('Identify error:', err);
    // ✅ 修复：不泄露详细错误信息
    return jsonResponse({ error: 'Identification failed' }, 500, env);
  }
}

async function parseWithGuessitRest(filename) {
  const url = `https://elephant.pythonanywhere.com/?filename=${encodeURIComponent(filename)}`;
  const res = await fetchWithTimeout(url, {}, 5000);
  if (!res.ok) throw new Error(`guessit-rest 请求失败：${res.status}`);
  const data = await res.json();
  const title = data.title;
  if (!title) throw new Error('guessit-rest 未返回标题');
  return {
    title,
    year: data.year !== undefined ? data.year : null,
    season: data.season !== undefined ? data.season : null,
    episode: data.episode !== undefined ? data.episode : null,
    type: data.type === 'movie' ? 'movie' : 'tv'
  };
}

async function searchTMDB(title, type, year, apiKey, lang) {
  const urlBase = type === 'movie'
    ? `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=${lang}&include_adult=false`
    : `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&language=${lang}&include_adult=false`;
  let url = `${urlBase}&query=${encodeURIComponent(title)}`;
  if (year) {
    if (type === 'movie') url += `&year=${year}`;
    else url += `&first_air_date_year=${year}`;
  }
  const res = await fetchWithTimeout(url, {}, 5000);
  if (!res.ok) throw new Error(`TMDB 搜索失败：${res.status}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('TMDB 未找到匹配项');
  }
  const item = data.results[0];
  return formatTmdbResult(item, type);
}

function formatTmdbResult(r, type) {
  const date = type === 'movie' ? r.release_date : r.first_air_date;
  return {
    tmdb_id: r.id,
    title: type === 'movie' ? r.title : r.name,
    original_title: r.original_title || r.original_name,
    year: date?.substring(0, 4) || null,
    type,
    poster: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : null,
    backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w500${r.backdrop_path}` : null,
    overview: r.overview,
    vote_average: r.vote_average
  };
}

async function findInEmos(token, tmdbId, type, season, episode, env) {
  const headers = getServerHeaders(token, env);
  const backendBase = env?.EMOS_BACKEND;
  try {
    const url = new URL(`${backendBase}/api/video/getVideoId`);
    url.searchParams.set('video_id_type', 'tmdb');
    url.searchParams.set('video_id_value', tmdbId);
    url.searchParams.set('tmdb_type', type);
    if (type === 'tv') {
      if (season != null) url.searchParams.set('season_number', season);
      if (episode != null) url.searchParams.set('episode_number', episode);
    }
    const res = await fetchWithTimeout(url.toString(), { headers }, 5000);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.episode_info && data.episode_info.item_type && data.episode_info.item_id != null) {
      return { item_type: data.episode_info.item_type, item_id: String(data.episode_info.item_id) };
    }
    if (data.item_type && data.item_id != null) {
      return { item_type: data.item_type, item_id: String(data.item_id) };
    }
    return null;
  } catch (err) {
    console.error('EMOS query error:', err);
    return null;
  }
}

// ==================== 公共 CSS ====================
const COMMON_CSS = `
/* ===== Apple Design System 主题变量 ===== */
:root {
  --bg-body: #000000;
  --bg-card: #1c1c1e;
  --bg-input: #2c2c2e;
  --bg-hover: #3a3a3c;
  --bg-modal: rgba(28, 28, 30, 0.95);
  --bg-topbar: rgba(28, 28, 30, 0.72);
  --border-light: rgba(255, 255, 255, 0.1);
  --border-color: #38383a;
  --text-primary: #ffffff;
  --text-secondary: #8e8e93;
  --text-tertiary: #636366;
  --accent-color: #007aff;
  --accent-hover: #005ecb;
  --danger-color: #ff453a;
  --success-color: #30d158;
  --warning-color: #ff9f0a;
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.4);
  --blur-effect: blur(20px);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;
  --search-bg: rgba(255, 255, 255, 0.08);
  --search-bg-hover: rgba(255, 255, 255, 0.12);
  --search-border: rgba(255, 255, 255, 0.15);
  --search-border-focus: rgba(0, 122, 255, 0.5);
  --search-text: #ffffff;
  --search-placeholder: rgba(255, 255, 255, 0.4);
  --search-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  --detail-bg-overlay: rgba(0, 0, 0, 0.85);
  --detail-gradient-top: rgba(0, 0, 0, 0);
  --detail-gradient-bottom: rgba(0, 0, 0, 0.9);
}
[data-theme="light"] {
  --bg-body: #f2f2f7;
  --bg-card: #ffffff;
  --bg-input: #f5f5f7;
  --bg-hover: #e5e5ea;
  --bg-modal: #ffffff;
  --bg-topbar: rgba(255, 255, 255, 0.72);
  --border-light: rgba(0, 0, 0, 0.1);
  --border-color: #d1d1d6;
  --text-primary: #000000;
  --text-secondary: #8e8e93;
  --text-tertiary: #c7c7cc;
  --accent-color: #007aff;
  --accent-hover: #005ecb;
  --danger-color: #ff3b30;
  --success-color: #34c759;
  --warning-color: #ff9500;
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.12);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.16);
  --search-bg: rgba(240, 240, 245, 0.9);
  --search-bg-hover: rgba(235, 235, 240, 0.95);
  --search-border: rgba(0, 0, 0, 0.12);
  --search-border-focus: rgba(0, 122, 255, 0.4);
  --search-text: #000000;
  --search-placeholder: rgba(0, 0, 0, 0.35);
  --search-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  --detail-bg-overlay: rgba(0, 0, 0, 0.3);
  --detail-gradient-top: rgba(242, 242, 247, 0);
  --detail-gradient-bottom: rgba(242, 242, 247, 0.95);
  --detail-text-primary: #000000;
  --detail-text-secondary: #6e6e73;
  --detail-text-tertiary: #aeaeb2;
  --detail-card-bg: rgba(255, 255, 255, 0.85);
  --detail-card-border: rgba(0, 0, 0, 0.08);
  --detail-btn-bg: rgba(0, 0, 0, 0.05);
  --detail-btn-border: rgba(0, 0, 0, 0.1);
  --detail-btn-hover: rgba(0, 0, 0, 0.1);
  --detail-badge-bg: rgba(0, 0, 0, 0.08);
  --detail-badge-border: rgba(0, 0, 0, 0.12);
  --detail-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
/* ===== 全局重置与基础样式 ===== */
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body {
  background-color: var(--bg-body);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-primary);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 100vh;
  padding-top: 80px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  transition: background-color 0.3s ease, color 0.3s ease;
  line-height: 1.5;
  overscroll-behavior-y: contain; /* ✅ 修复 iOS 橡皮筋回弹穿透 */
}
/* ===== 主内容容器 ===== */
#app-content {
  max-width: 100%;
  margin: 0;
  padding: 2rem 1.5rem;
  min-height: calc(100vh - 80px);
  overscroll-behavior: contain; /* ✅ 修复局部滚动穿透 */
  scroll-behavior: smooth;
}
/* ===== 固定顶部栏 (Apple Style) ===== */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 1.5rem;
  padding: 0.6rem 1.5rem;
  background: var(--bg-topbar);
  backdrop-filter: var(--blur-effect);
  -webkit-backdrop-filter: var(--blur-effect);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  transition: background 0.3s ease, border-color 0.3s ease;
}
.top-bar .left-controls { display: flex; align-items: center; gap: 1rem; }
.top-bar .brand-text {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.2s;
}
.top-bar .brand-text:hover { opacity: 0.7; }
.collapse-btn {
  background: var(--bg-input);
  border: none;
  color: var(--text-primary);
  font-size: 1.2rem;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.collapse-btn:hover { background: var(--bg-hover); }
.theme-toggle-btn {
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  color: var(--text-primary);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  margin-right: 0.5rem;
}
.theme-toggle-btn:hover {
  background: var(--bg-hover);
  transform: scale(1.05);
  color: var(--accent-color);
}
.top-bar a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.top-bar a:hover { color: var(--accent-color); }
/* ===== 固定侧边栏 ===== */
.sidebar {
  position: fixed;
  top: 90px;
  left: 1.5rem;
  bottom: 1rem;
  width: 160px;
  background: var(--bg-topbar);
  backdrop-filter: var(--blur-effect);
  -webkit-backdrop-filter: var(--blur-effect);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 1.5rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  scrollbar-width: none;
  z-index: 1999;
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: var(--shadow-sm);
}
.sidebar::-webkit-scrollbar { display: none; }
@media (min-width: 701px) {
  .sidebar { transform: translateX(0); }
  body.sidebar-hidden .sidebar { transform: translateX(-200%); }
  body { margin-left: calc(160px + 1.5rem); }
  body.sidebar-hidden { margin-left: 0; }
}
@media (max-width: 700px) {
  .sidebar {
    left: 1rem;
    top: 70px;
    bottom: 1rem;
    width: 160px;
    border-radius: var(--radius-lg);
    transform: translateX(-200%);
  }
  body.sidebar-open .sidebar { transform: translateX(0); }
  body { margin-left: 0 !important; }
}
.sidebar .nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0.6rem 0.8rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  transition: transform 0.2s, color 0.2s, background-color 0.1s;
  cursor: pointer;
  width: 100%;
}
.sidebar .nav-item:hover { background-color: var(--bg-hover); color: var(--text-primary); }
.sidebar .nav-item i { width: 1.2rem; font-size: 0.95rem; text-align: center; }
.sidebar .nav-item.active {
  background-color: var(--accent-color);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 1040;
  display: none;
}
@media (max-width: 700px) {
  body.sidebar-open .sidebar-overlay { display: block; }
}
/* ===== 用户菜单 ===== */
.user-menu { position: relative; cursor: pointer; }
.user-info {
  background: var(--bg-card);
  padding: 0.4rem 1rem;
  border-radius: var(--radius-full);
  border: 0.5px solid var(--border-light);
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
  color: var(--text-primary);
  transition: background 0.2s;
}
.user-info:hover { background: var(--bg-hover); }
.user-info i { color: var(--text-secondary); font-size: 1.2rem; }
.user-info img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-light);
}
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-modal);
  backdrop-filter: var(--blur-effect);
  -webkit-backdrop-filter: var(--blur-effect);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 0.5rem 0;
  min-width: 180px;
  box-shadow: var(--shadow-lg);
  display: none;
  z-index: 1000;
  font-size: 0.9rem;
  overflow: hidden;
  pointer-events: auto;
}
.dropdown-menu.show { display: block; animation: fadeIn 0.2s ease; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.dropdown-item {
  padding: 0.7rem 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  text-decoration: none;
  transition: 0.2s;
  cursor: pointer;
}
.dropdown-item:hover { background: var(--bg-hover); }
#themeMenuBtn { cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
.dropdown-item i { width: 1.2rem; color: var(--text-secondary); text-align: center; }
.divider { height: 0.5px; background: var(--border-color); margin: 0.5rem 0; }
.dropdown-item.mobile-only { display: none; }
/* ===== Toast 提示 ===== */
#toast {
  position: fixed;
  top: 90px;
  right: 20px;
  padding: 12px 20px;
  border-radius: var(--radius-lg);
  background: var(--bg-modal);
  backdrop-filter: var(--blur-effect);
  border: 0.5px solid var(--border-light);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: var(--shadow-md);
  z-index: 9999;
  display: none;
  align-items: center;
  gap: 8px;
  width: auto;
  max-width: 280px;
  white-space: nowrap;
  text-align: center;
  animation: slideInRight 0.3s ease forwards;
}
#toast.hide { animation: fadeOut 0.2s ease forwards; }
#toast i { color: var(--accent-color); }
@keyframes slideInRight {
  0% { opacity: 0; transform: translateX(100%); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes fadeOut {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
/* ===== 基础模态框样式 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.modal-overlay.show { display: flex; opacity: 1; }
.modal-content {
  background: var(--bg-modal);
  backdrop-filter: var(--blur-effect);
  -webkit-backdrop-filter: var(--blur-effect);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 1.8rem;
  max-width: 500px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  transform: scale(0.95);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
  opacity: 0;
  box-shadow: var(--shadow-lg);
}
.modal-overlay.show .modal-content { transform: scale(1); opacity: 1; }
.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.btn-icon {
  background: var(--bg-input);
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s;
}
.btn-icon:hover { background: var(--bg-hover); color: var(--text-primary); }
.modal-input {
  width: 100%;
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 0.8rem 1rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  margin-bottom: 0.7rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.modal-input:focus { border-color: var(--accent-color); background: var(--bg-card); }
.modal-input::placeholder { color: var(--text-tertiary); }
.modal-error { color: var(--danger-color); font-size: 0.85rem; margin-bottom: 0; transition: all 0.2s; }
.modal-error:not(:empty) { margin-bottom: 1rem; }
.modal-error:empty { display: none; }
.modal-btn {
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  color: var(--text-primary);
  padding: 0.6rem 1.5rem;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}
.modal-btn:hover { background: var(--bg-hover); transform: scale(1.02); }
.modal-btn.primary { background: var(--accent-color); border-color: var(--accent-color); color: #ffffff; }
.modal-btn.primary:hover { background: var(--accent-hover); }
.modal-buttons { display: flex; gap: 0.8rem; justify-content: flex-end; margin-top: 1rem; }
.modal-content.wide { max-width: 700px; }
/* ===== 切换账号模态框专用 ===== */
.account-list {
  margin: 1rem 0;
  max-height: 320px;
  overflow-y: auto;
  padding: 0.2rem;
  scrollbar-width: thin;
  scrollbar-color: var(--text-tertiary) var(--bg-input);
}
.account-list::-webkit-scrollbar { width: 5px; }
.account-list::-webkit-scrollbar-track { background: var(--bg-input); border-radius: 10px; }
.account-list::-webkit-scrollbar-thumb { background: var(--text-tertiary); border-radius: 10px; }
.account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  background: var(--bg-input);
  border-radius: var(--radius-md);
  margin-bottom: 0.6rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  border: 0.5px solid var(--border-light);
}
.account-item:hover { background: var(--bg-hover); transform: translateX(2px); border-color: var(--accent-color); }
.account-info { display: flex; align-items: center; gap: 0.8rem; flex: 1; }
.account-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--bg-card);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid var(--border-light);
}
.account-avatar img { width: 100%; height: 100%; object-fit: cover; }
.account-avatar i { font-size: 1.2rem; color: var(--text-secondary); }
.account-details { display: flex; flex-direction: column; gap: 0.2rem; }
.account-username { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; }
.account-userid { font-size: 0.7rem; color: var(--text-secondary); }
.account-delete {
  color: var(--danger-color);
  background: rgba(255, 69, 58, 0.1);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s;
  font-size: 0.9rem;
}
.account-delete:hover { background: rgba(255, 69, 58, 0.25); transform: scale(1.05); }
.account-item.current { background: var(--bg-card); cursor: default; opacity: 0.8; border-color: var(--border-color); }
.account-item.current:hover { background: var(--bg-card); transform: none; border-color: var(--border-color); }
.account-item.current .account-delete { display: none; }
/* ===== 加载状态 ===== */
#app-content.loading-active {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
}
.load-more { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.9rem; }
.no-resources {
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
  background: var(--bg-input);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-color);
}
/* ===== 苹果风格列表 ===== */
.info-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--bg-list, var(--bg-card));
  backdrop-filter: var(--blur-effect);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-top: 0.5rem;
  border: 0.5px solid var(--border-list, var(--border-light));
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.info-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem;
  border-bottom: 0.5px solid var(--border-list, var(--border-light));
  transition: background 0.2s ease;
  background: var(--bg-list-item, transparent);
}
.info-list-item:hover { background-color: var(--bg-list-item-hover, var(--bg-hover)); }
.info-list-item:last-child { border-bottom: none; }
[data-theme="dark"] .info-list { background: var(--bg-card); border-color: var(--border-light); }
[data-theme="dark"] .info-list-item { background: transparent; border-color: var(--border-light); }
[data-theme="dark"] .info-list-item:hover { background: var(--bg-hover); }
.info-list-left { flex: 1; min-width: 0; }
.info-list-title { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.3; }
.info-list-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.3; display: flex; flex-wrap: wrap; gap: 0.6rem; }
.info-list-right {
  flex-shrink: 0;
  margin-left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
}
.info-list-right .btn-outline {
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  color: var(--text-primary);
  padding: 0.3rem 1rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: 0.2s;
}
.info-list-right .btn-outline:hover { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
.info-list-right .balance-value { color: var(--warning-color); cursor: pointer; }
.info-list-index {
  width: 36px;
  height: 36px;
  background: var(--bg-input);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  margin-right: 0.8rem;
  border: 0.5px solid var(--border-light);
}
/* ===== 卡片网格 ===== */
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.info-card {
  background: var(--bg-card);
  backdrop-filter: var(--blur-effect);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  border: 0.5px solid var(--border-light);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s;
}
.info-card:hover { transform: translateY(-2px); }
.info-card .card-title { flex-shrink: 0; margin-bottom: 1rem; }
.info-card .sign-status { flex: 1; margin-bottom: 1rem; display: flex; flex-direction: column; justify-content: center; }
.info-card .sign-btn { flex-shrink: 0; }
.card-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 1.2rem; display: flex; align-items: center; justify-content: space-between; color: var(--text-primary); }
/* ===== 统一无结果样式 ===== */
.no-results {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
  font-weight: 500;
  background: var(--bg-input);
  border-radius: var(--radius-xl);
  border: 1px dashed var(--border-color);
  margin-top: 1.5rem;
  animation: fadeIn 0.3s ease;
  width: 100%;
}
/* ===== 统一加载动画样式 ===== */
.apple-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  width: 100%;
}
.apple-loading .spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border-light);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: apple-spin 0.8s linear infinite;
  margin-bottom: 0.8rem;
}
@keyframes apple-spin { to { transform: rotate(360deg); } }
/* ===== 苹果风格开关 ===== */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 51px;
  height: 31px;
  background: var(--bg-input);
  border-radius: 30px;
  border: 0.5px solid var(--border-color);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}
.toggle-switch::after {
  content: '';
  position: absolute;
  width: 27px;
  height: 27px;
  background: #ffffff;
  border-radius: 50%;
  top: 1.5px;
  left: 1.5px;
  transition: 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.toggle-switch.active { background: var(--success-color); border-color: var(--success-color); }
.toggle-switch.active::after { left: 21.5px; }
/* ===== 通用图片上传区域 ===== */
.image-upload-area {
  width: 100%;
  margin-bottom: 1.5rem;
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: var(--bg-input);
  aspect-ratio: 16/9;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-color);
}
.image-preview { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-card); position: relative; }
.image-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.image-preview .placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 0.9rem; }
.image-preview .placeholder i { font-size: 3rem; margin-bottom: 0.5rem; color: var(--text-tertiary); }
.image-upload-buttons {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(5px);
  opacity: 0;
  transition: opacity 0.2s;
}
.image-upload-area:hover .image-upload-buttons { opacity: 1; }
.image-upload-btn, .image-delete-btn {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 0.5rem 1.2rem;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: 0.2s;
}
.image-upload-btn:hover { background: rgba(255,255,255,0.3); }
.image-delete-btn { color: #ff6b6b; border-color: #ff6b6b; }
.image-delete-btn:hover { background: rgba(255,107,107,0.2); }
.image-upload-area.no-image .image-upload-buttons { opacity: 1; background: rgba(0,0,0,0.3); }
.image-upload-area.no-image .image-upload-buttons .image-delete-btn { display: none; }
/* ===== 表单组 ===== */
.form-group { margin-bottom: 0.7rem; }
.form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.85rem; font-weight: 500; }
.form-group input, .form-group textarea, .form-group select {
  width: 100%;
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 0.8rem 1rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}
.form-group textarea { resize: vertical; min-height: 80px; border-radius: var(--radius-md); }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--accent-color); }
/* ===== 搜索容器（主题适配优化） ===== */
.search-container {
  flex: 1;
  overflow: hidden;
  margin: 2rem 0 2rem 0;
  display: flex;
  align-items: center;
  background: var(--search-bg);
  backdrop-filter: var(--blur-effect);
  -webkit-backdrop-filter: var(--blur-effect);
  border: 0.5px solid var(--search-border);
  border-radius: 60px;
  padding: 0.2rem 0.2rem 0.2rem 1.2rem;
  box-shadow: var(--search-shadow);
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.search-container:focus-within {
  background: var(--search-bg-hover);
  border-color: var(--search-border-focus);
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.15);
}
.search-type {
  background: transparent;
  border: none;
  color: var(--search-text);
  font-size: 0.95rem;
  padding: 0.6rem 0.5rem 0.6rem 0;
  margin-right: 0.3rem;
  cursor: pointer;
  outline: none;
  font-weight: 400;
  opacity: 0.85;
  transition: opacity 0.2s;
}
.search-type:hover { opacity: 1; }
.search-type option { background: var(--bg-card); color: var(--text-primary); }
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0.8rem 0.2rem;
  color: var(--search-text);
  font-size: 1rem;
  min-width: 200px;
}
.search-input::placeholder { color: var(--search-placeholder); font-weight: 300; }
.search-input:focus { outline: none; }
.search-btn {
  background: var(--accent-color);
  border: none;
  color: #ffffff;
  padding: 0.7rem 1.8rem;
  border-radius: 40px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}
.search-btn:hover { background: var(--accent-hover); transform: scale(1.02); box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4); }
@media (max-width: 700px) {
  .search-container { flex-wrap: nowrap; padding: 0.2rem 0.2rem 0.2rem 1rem; }
  .search-type { padding: 0.6rem 0.3rem; min-width: 80px; }
  .search-input { min-width: 120px; padding: 0.6rem 0.2rem; }
  .search-btn { padding: 0.6rem 1rem; white-space: nowrap; }
}
/* ===== 移动端适配 ===== */
@media (max-width: 700px) {
  body { padding-top: 70px; }
  .top-bar { margin: 0.5rem 0.8rem; padding: 0.4rem 1rem; }
  .top-bar .brand-text { font-size: 1.3rem; }
  .top-bar .left-controls { gap: 0.5rem; }
  .top-bar > div:last-child a:not(.user-menu) { display: none; }
  .mobile-only { display: flex !important; }
  .desktop-only { display: none !important; }
  .user-info { padding: 0.2rem 0.2rem; min-width: auto; gap: 0; }
  .user-info span { display: none; }
  .user-info i { font-size: 1.2rem; }
  .user-info img { width: 24px; height: 24px; }
  .dropdown-menu { min-width: 200px; right: -10px; }
  #app-content { padding: 1rem 0.8rem; }
  .card-grid { grid-template-columns: 1fr; gap: 1rem; }
  .info-card { padding: 1rem; }
}
`;

// ==================== SPA 核心 JS ====================
const SPA_CORE_JS = `
// ---------- 常量 ----------
const STORAGE_KEYS = {
  ACTIVE_TOKEN: 'activeToken',
  ACTIVE_USER: 'activeUser',
  SAVED_ACCOUNTS: 'savedAccounts',
  THEME_MODE: 'emos_theme_mode'
};

// ---------- 防抖函数 ----------
function debounce(func, wait) {
  let timeout;
  const debounced = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  debounced.cancel = function() { clearTimeout(timeout); };
  return debounced;
}

// ---------- 全局事件管理器 ----------
window.EventManager = {
  listeners: [],
  add: function(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.listeners.push({ target, type, handler, options });
    return handler;
  },
  removeAll: function() {
    this.listeners.forEach(item => {
      item.target.removeEventListener(item.type, item.handler, item.options);
    });
    this.listeners = [];
  },
  removeByType: function(type) {
    const remaining = [];
    this.listeners.forEach(item => {
      if (item.type === type) {
        item.target.removeEventListener(item.type, item.handler, item.options);
      } else {
        remaining.push(item);
      }
    });
    this.listeners = remaining;
  }
};

// ---------- API 内存缓存 ----------
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 秒缓存

function generateCacheKey(url, options) {
  const sortedOpts = options ? JSON.stringify(options, Object.keys(options).sort()) : '';
  return url + sortedOpts;
}

async function cachedFetch(url, options = {}) {
  const key = generateCacheKey(url, options);
  const cached = apiCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const response = await fetch(url, options);
  if (response.ok && (!options.method || options.method === 'GET')) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      apiCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
    } catch (e) {}
  }
  return response;
}

// ---------- 统一认证请求函数 ----------
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN);
  if (!token) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return null;
  }
  const headers = window.getHeaders(token);
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  try {
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return null;
    }
    if (!response.ok) {
      let errorMsg = '请求失败，状态码 ' + response.status;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// ---------- 公共工具函数 ----------
function showToast(message) {
  var toast = document.getElementById('toast');
  var toastMessage = document.getElementById('toastMessage');
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.classList.remove('hide');
  toast.style.display = 'flex';
  setTimeout(function() {
    toast.classList.add('hide');
    setTimeout(function() { toast.style.display = 'none'; }, 200);
  }, 3000);
}

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return h + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
  } else {
    return m + ':' + s.toString().padStart(2, '0');
  }
}

function copyText(text, targetElement) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('复制成功');
    if (targetElement) {
      targetElement.style.transition = 'background 0.2s';
      targetElement.style.backgroundColor = 'rgba(0,122,255,0.3)';
      setTimeout(() => { targetElement.style.backgroundColor = ''; }, 300);
    }
  }).catch(() => showToast('复制失败'));
}

// ---------- 统一 Header 生成器 ----------
window.getHeaders = (token) => {
  return {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
};

// ==================== 全局上传模块 (共用) ====================
window.EmosUpload = {
  CHUNK_SIZE: 200 * 1024 * 1024, // 200MB
  async getToken(type, fileType, fileName, fileSize) {
    const validTypes = ['video', 'subtitle', 'image'];
    if (!validTypes.includes(type)) throw new Error(\`不支持的上传类型: \${type}\`);
    const token = localStorage.getItem('activeToken');
    const body = {
      type: type,
      file_type: fileType || (type === 'video' ? 'video/mp4' : (type === 'subtitle' ? 'application/x-subrip' : 'application/octet-stream')),
      file_name: fileName,
      file_size: fileSize,
      file_storage: 'global'
    };
    const res = await fetch('/api/upload/getUploadToken', {
      method: 'POST',
      headers: window.getHeaders(token),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let errorMsg = \`获取上传凭证失败 (\${res.status})\`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    return await res.json();
  },
  async uploadSimple(file, url, contentType) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/octet-stream');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('上传失败，状态码 ' + xhr.status));
      };
      xhr.onerror = () => reject(new Error('网络错误，请检查连接'));
      xhr.send(file);
    });
  },
  async uploadChunked(file, url, onProgress, signal) {
    const fileSize = file.size;
    const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);
    let uploadedBytes = 0;
    for (let i = 0; i < totalChunks; i++) {
      if (signal && signal.aborted) throw new Error('上传已取消');
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, fileSize) - 1;
      const chunk = file.slice(start, end + 1);
      let retryCount = 0;
      const MAX_RETRIES = 3;
      let success = false;
      while (!success && retryCount < MAX_RETRIES) {
        try {
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + fileSize);
            if (signal) {
              signal.addEventListener('abort', () => { xhr.abort(); reject(new Error('上传已取消')); });
            }
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const totalLoaded = uploadedBytes + e.loaded;
                if (onProgress) onProgress(totalLoaded, fileSize);
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else if (xhr.status === 416) resolve();
              else reject(new Error('分片上传失败，状态码 ' + xhr.status));
            };
            xhr.onerror = () => reject(new Error('网络错误'));
            xhr.send(chunk);
          });
          success = true;
          uploadedBytes = end + 1;
        } catch (err) {
          if (err.message && (err.message.includes('取消') || err.message.includes('abort'))) throw err;
          retryCount++;
          if (retryCount >= MAX_RETRIES) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    }
  },
  async upload(file, options) {
    const { type, itemType, itemId, onProgress, signal } = options;
    if (!type || !itemType || !itemId) throw new Error('缺少必要参数 (type, itemType, itemId)');
    const tokenData = await this.getToken(type, file.type, file.name, file.size);
    const fileId = tokenData.file_id;
    const uploadUrl = tokenData.data.upload_url;
    const uploadType = tokenData.type;
    if (uploadType === 'onedrive') {
      await this.uploadChunked(file, uploadUrl, onProgress, signal);
    } else {
      await this.uploadSimple(file, uploadUrl, file.type);
      if (onProgress) onProgress(file.size, file.size);
    }
    const saveApi = type === 'video' ? '/api/upload/video/save' : '/api/upload/subtitle/save';
    const saveRes = await fetch(saveApi, {
      method: 'POST',
      headers: window.getHeaders(localStorage.getItem('activeToken')),
      body: JSON.stringify({ item_type: itemType, item_id: itemId, file_id: fileId })
    });
    if (!saveRes.ok) throw new Error('保存失败');
    return { fileId, success: true };
  },
  async uploadImage(file) {
    try {
      const tokenData = await this.getToken('image', file.type, file.name, file.size);
      await this.uploadSimple(file, tokenData.data.upload_url, file.type);
      return tokenData.file_id;
    } catch (err) {
      console.error('图片上传失败:', err);
      throw err;
    }
  }
};

// ---------- 主题管理器 (Apple Style) ----------
window.ThemeManager = {
  mode: 'auto',
  init: function() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    this.mode = saved || 'auto';
    this.applyTheme();
    this.updateIcons();
    this.bindEvents();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', () => {
        if (this.mode === 'auto') this.applyTheme();
      });
    }
  },
  applyTheme: function() {
    let theme = this.mode;
    if (this.mode === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = isDark ? 'dark' : 'light';
    }
    if (document.documentElement.getAttribute('data-theme') === theme) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('emos_theme_mode', this.mode);
  },
  toggle: function() {
    if (this.mode === 'dark') this.mode = 'light';
    else if (this.mode === 'light') this.mode = 'auto';
    else this.mode = 'dark';
    this.applyTheme();
    this.updateIcons();
    if (window.showToast) {
      window.showToast('主题已切换：' + (this.mode === 'auto' ? '自动' : (this.mode === 'dark' ? '深色' : '浅色')));
    }
  },
  updateIcons: function() {
    const desktopBtn = document.getElementById('themeToggleBtn');
    const menuBtn = document.getElementById('themeMenuBtn');
    let iconClass = 'fa-moon', text = '深色模式';
    if (this.mode === 'light') { iconClass = 'fa-sun'; text = '浅色模式'; }
    else if (this.mode === 'auto') { iconClass = 'fa-circle-half-stroke'; text = '自动模式'; }
    if (desktopBtn) {
      const icon = desktopBtn.querySelector('i');
      if (icon) icon.className = 'fas ' + iconClass;
      desktopBtn.title = '当前：' + text + ' (点击切换)';
    }
    if (menuBtn) {
      const icon = menuBtn.querySelector('i');
      if (icon) icon.className = 'fas ' + iconClass;
      menuBtn.innerHTML = '<i class="fas ' + iconClass + '"></i> ' + text;
    }
  },
  bindEvents: function() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#themeToggleBtn')) {
        e.preventDefault(); e.stopPropagation(); this.toggle(); return;
      }
      if (e.target.closest('#themeMenuBtn')) {
        e.preventDefault(); e.stopPropagation(); this.toggle();
        const dropdown = document.getElementById('dropdownMenu');
        if (dropdown) dropdown.classList.remove('show');
        return;
      }
    }, true);
  }
};

// ---------- 侧边栏交互 ----------
var bodyEl = document.body;
var sidebar = document.getElementById('sidebar');
var collapseBtn = document.getElementById('collapseBtn');
var sidebarOverlay = document.getElementById('sidebarOverlay');
function toggleSidebar() {
  if (window.innerWidth > 700) bodyEl.classList.toggle('sidebar-hidden');
  else bodyEl.classList.toggle('sidebar-open');
}
function closeSidebar() {
  if (window.innerWidth > 700) bodyEl.classList.remove('sidebar-hidden');
  else bodyEl.classList.remove('sidebar-open');
}
function handleResize() {
  if (window.innerWidth > 700) {
    bodyEl.classList.remove('sidebar-open');
  } else {
    bodyEl.classList.remove('sidebar-hidden');
    bodyEl.classList.remove('sidebar-open');
  }
}
window.addEventListener('resize', handleResize);
handleResize();
if(collapseBtn) collapseBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleSidebar(); });
if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// ---------- 用户菜单 ----------
var userMenu = document.getElementById('userMenu');
var dropdown = document.getElementById('dropdownMenu');
if(userMenu) userMenu.addEventListener('click', function(e) { e.stopPropagation(); if(dropdown) dropdown.classList.toggle('show'); });
document.addEventListener('click', function() { if(dropdown) dropdown.classList.remove('show'); });
if(dropdown) dropdown.addEventListener('click', function(e) { e.stopPropagation(); });

// ---------- 更新头部 UI ----------
function updateHeaderUI(data) {
  var avatarIcon = document.getElementById('avatarIcon');
  var avatarImg = document.getElementById('avatarImg');
  var headerUsername = document.getElementById('headerUsername');
  var newName = data.pseudonym || data.username || '';
  if(headerUsername && headerUsername.textContent !== newName) headerUsername.textContent = newName;
  var newAvatar = (data.avatar && data.avatar !== 'null' && data.avatar.trim() !== '') ? data.avatar : '';
  var currentAvatar = avatarImg ? avatarImg.src : '';
  if (avatarImg && newAvatar && currentAvatar === newAvatar && avatarImg.style.display !== 'none') {
    if(avatarIcon) avatarIcon.style.display = 'none'; return;
  }
  if (newAvatar) {
    if(avatarImg) {
      if(avatarIcon) avatarIcon.style.display = 'none';
      avatarImg.style.display = 'inline-block';
      if (avatarImg.src !== newAvatar) avatarImg.src = newAvatar;
      avatarImg.onload = function() { if(avatarIcon) avatarIcon.style.display = 'none'; avatarImg.style.display = 'inline-block'; };
      avatarImg.onerror = function() { if(avatarIcon) avatarIcon.style.display = 'inline-block'; avatarImg.style.display = 'none'; };
    }
  } else {
    if(avatarIcon) avatarIcon.style.display = 'inline-block';
    if(avatarImg) avatarImg.style.display = 'none';
  }
}

// ---------- 登出 ----------
var logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) logoutBtn.addEventListener('click', function() {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
  window.location.href = '/login';
});

// ---------- 切换账号功能 ----------
var switchModal = document.getElementById('switchAccountModal');
var closeSwitchModal = document.getElementById('closeSwitchModal');
var accountList = document.getElementById('accountList');
var newTokenInput = document.getElementById('newToken');
var addAccountBtn = document.getElementById('addAccountBtn');
var switchError = document.getElementById('switchError');

function saveAccounts(accounts) { localStorage.setItem(STORAGE_KEYS.SAVED_ACCOUNTS, JSON.stringify(accounts)); }
function loadAccounts() {
  var saved = localStorage.getItem(STORAGE_KEYS.SAVED_ACCOUNTS);
  if (saved) { try { return JSON.parse(saved); } catch (e) { return []; } }
  return [];
}
function renderAccounts() {
  if(!accountList) return;
  var accounts = loadAccounts();
  if (accounts.length === 0) {
    accountList.innerHTML = '<div class="no-resources">暂无保存的账号</div>'; return;
  }
  var currentToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN);
  var html = '';
  accounts.forEach((acc, index) => {
    var avatar = acc.avatar && acc.avatar !== 'null' ? acc.avatar : '';
    var avatarHtml = avatar ? '<img src="' + escapeHtml(avatar) + '">' : '<i class="fas fa-user"></i>';
    var isCurrent = (acc.token === currentToken);
    var deleteBtnHtml = isCurrent ? '' : '<div class="account-delete" data-index="' + index + '"><i class="fas fa-trash"></i></div>';
    var currentClass = isCurrent ? 'current' : '';
    html += '<div class="account-item ' + currentClass + '" data-index="' + index + '">' +
      '<div class="account-info"><div class="account-avatar">' + avatarHtml + '</div><div class="account-details">' +
      '<div class="account-username">' + escapeHtml(acc.username) + '</div>' +
      '<div class="account-userid">ID: ' + (acc.user_id || '未知') + '</div></div></div>' + deleteBtnHtml + '</div>';
  });
  accountList.innerHTML = html;
  document.querySelectorAll('.account-item').forEach(item => {
    if (item.classList.contains('current')) return;
    item.addEventListener('click', function(e) {
      if (e.target.closest('.account-delete')) return;
      var index = this.dataset.index;
      var accounts = loadAccounts();
      var acc = accounts[index];
      if (acc) validateTokenAndSwitch(acc);
    });
  });
  document.querySelectorAll('.account-delete').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var index = this.dataset.index;
      var accounts = loadAccounts();
      accounts.splice(index, 1);
      saveAccounts(accounts);
      renderAccounts();
    });
  });
}
function addAccount(newToken) {
  if(!switchError) return;
  fetch('/api/user', { headers: { 'Authorization': 'Bearer ' + newToken }, credentials: 'omit' })
    .then(res => {
      if (!res.ok) { if (res.status === 401) throw new Error('Token 无效'); throw new Error('请求失败'); }
      return res.json();
    })
    .then(data => {
      var accounts = loadAccounts();
      if (accounts.some(acc => acc.token === newToken)) { switchError.textContent = '该账号已存在'; return; }
      accounts.push({ token: newToken, username: data.pseudonym || data.username, avatar: data.avatar || '', user_id: data.user_id || '' });
      saveAccounts(accounts);
      if(newTokenInput) newTokenInput.value = '';
      switchError.textContent = '';
      renderAccounts();
      showToast('添加成功');
    })
    .catch(err => { switchError.textContent = err.message; });
}
async function validateTokenAndSwitch(acc) {
  try {
    const res = await fetch('/api/user', { headers: { 'Authorization': 'Bearer ' + acc.token }, credentials: 'omit' });
    if (!res.ok) { if (res.status === 401) throw new Error('Token 无效'); throw new Error('请求失败'); }
    const data = await res.json();
    let accounts = loadAccounts();
    const index = accounts.findIndex(a => a.token === acc.token);
    if (index === -1) throw new Error('账号不存在');
    accounts[index].username = data.pseudonym || data.username || '';
    accounts[index].avatar = data.avatar || '';
    accounts[index].user_id = data.user_id || '';
    saveAccounts(accounts);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, accounts[index].token);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(accounts[index]));
    showToast('切换成功，页面即将刷新');
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    showToast(err.message);
    let accounts = loadAccounts();
    accounts = accounts.filter(a => a.token !== acc.token);
    saveAccounts(accounts);
    if (switchModal && switchModal.classList.contains('show')) renderAccounts();
  }
}
var switchAccountBtn = document.getElementById('switchAccountBtn');
if(switchAccountBtn) switchAccountBtn.addEventListener('click', function() {
  var accounts = loadAccounts();
  var currentToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN);
  var currentUser = window.currentUser;
  if (accounts.length === 0 && currentUser && currentToken) {
    accounts.push({ token: currentToken, username: currentUser.pseudonym || currentUser.username, avatar: currentUser.avatar || '', user_id: currentUser.user_id || '' });
    saveAccounts(accounts);
  }
  renderAccounts();
  if(switchModal) switchModal.classList.add('show');
});
if(closeSwitchModal) closeSwitchModal.addEventListener('click', function() { if(switchModal) switchModal.classList.remove('show'); });
if(switchModal) switchModal.addEventListener('click', function(e) { if (e.target === switchModal) switchModal.classList.remove('show'); });
if(addAccountBtn) addAccountBtn.addEventListener('click', function() {
  if(!newTokenInput) return;
  var newToken = newTokenInput.value.trim();
  if (!newToken) { if(switchError) switchError.textContent = '请输入 Token'; return; }
  addAccount(newToken);
});
if(newTokenInput) newTokenInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') if(addAccountBtn) addAccountBtn.click();
});

// ---------- 用户信息获取 ----------
async function updateUserInfo() {
  const token = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN);
  if (!token) {
    if (window.location.pathname !== '/login') window.location.href = '/login';
    return Promise.reject('No token');
  }
  const res = await fetchWithAuth('/api/user');
  if (!res) return Promise.reject('Unauthorized');
  try {
    const data = await res.json();
    window.currentUser = data;
    updateHeaderUI(data);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(data));
    let accounts = loadAccounts();
    const index = accounts.findIndex(a => a.token === token);
    const newAccount = { token: token, username: data.pseudonym || data.username, avatar: data.avatar || '', user_id: data.user_id || '' };
    if (index !== -1) accounts[index] = newAccount;
    else accounts.push(newAccount);
    saveAccounts(accounts);
    return data;
  } catch (err) {
    console.error('获取用户信息失败', err);
    throw err;
  }
}

// ==================== SPA 路由核心 ====================
const PageCache = new Map();
const PageState = new Map();
const routes = {};

function registerRoute(path, loader) { routes[path] = loader; }
function matchRoute(path) {
  const pathname = path.split('?')[0];
  if (/^\\/media\\/\\d+$/.test(pathname)) return routes['/media/detail'];
  if (/^\\/shop\\/[^/]+$/.test(pathname)) return routes['/shop'];
  return routes[pathname];
}
function restoreScroll(path) {
  const pathname = path.split('?')[0];
  const state = PageState.get(pathname);
  if (state?.scrollTop != null) window.scrollTo(0, state.scrollTop);
}
function recordScroll(path) {
  const pathname = path.split('?')[0];
  PageState.set(pathname, { ...PageState.get(pathname), scrollTop: window.scrollY });
}

async function navigate(path, push = true) {
  if (window.EventManager) window.EventManager.removeAll();
  
  if (window.innerWidth <= 700) closeSidebar();
  if (push) history.pushState({}, '', path);
  const app = document.getElementById('app-content');
  if (!app) return;
  const pathname = path.split('?')[0];
  updateSidebarActive(pathname);
  
  if (PageCache.has(pathname)) {
    const cached = PageCache.get(pathname);
    if (cached.dom instanceof Node) {
      app.innerHTML = '';
      app.appendChild(cached.dom);
      if (cached.page && cached.page.onShow) cached.page.onShow(pathname);
      restoreScroll(pathname);
      return;
    } else {
      PageCache.delete(pathname);
    }
  }
  
  if (window.__currentPage && window.__currentPage.onHide) window.__currentPage.onHide();
  app.innerHTML = '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
  app.classList.add('loading-active');
  
  const loader = matchRoute(pathname);
  if (!loader) {
    app.innerHTML = '<div class="no-results">页面不存在</div>';
    app.classList.remove('loading-active');
    return;
  }
  try {
    const module = await loader(path);
    const page = await module.default(path);
    app.innerHTML = '';
    app.appendChild(page.el);
    app.classList.remove('loading-active');
    PageCache.set(pathname, { dom: page.el, page: page });
    window.__currentPage = page;
    if (page.onShow) page.onShow(pathname);
    restoreScroll(pathname);
  } catch (err) {
    console.error('页面加载失败:', err);
    app.innerHTML = '<div class="no-results">加载失败，请重试</div>';
    app.classList.remove('loading-active');
  }
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('#')) return;
  if (href === '/login') return;
  e.preventDefault();
  navigate(href);
});

window.addEventListener('popstate', () => { navigate(location.pathname, false); });
window.addEventListener('scroll', () => { recordScroll(location.pathname); });

function updateSidebarActive(path) {
  const navItems = document.querySelectorAll('.sidebar .nav-item');
  let activeLink = null;
  const targetLink = Array.from(navItems).find(link => {
    const href = link.getAttribute('href');
    if (path === '/' && href === '/') return true;
    return href !== '/' && path.startsWith(href);
  });
  if (targetLink && targetLink.classList.contains('active')) return;
  if (targetLink) { targetLink.classList.add('active'); activeLink = targetLink; }
  navItems.forEach(item => { if (item !== activeLink) item.classList.remove('active'); });
}

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEYS.ACTIVE_TOKEN) window.location.reload();
});

window.PageCache = PageCache;
window.PageState = PageState;
window.navigate = navigate;
window.registerRoute = registerRoute;
window.escapeHtml = escapeHtml;
window.showToast = showToast;
window.formatBytes = formatBytes;
window.formatDuration = formatDuration;
window.copyText = copyText;
window.debounce = debounce;
window.fetchWithAuth = fetchWithAuth;
window.updateUserInfo = updateUserInfo;
window.updateSidebarActive = updateSidebarActive;

// 启动应用
(async function bootstrap() {
  setTimeout(() => { if (window.ThemeManager) window.ThemeManager.init(); }, 0);
  const token = localStorage.getItem('activeToken');
  if (!token && window.location.pathname !== '/login') { window.location.href = '/login'; return; }
  if (token) {
    try { await updateUserInfo(); } catch (err) {
      const cachedUser = localStorage.getItem('activeUser');
      if (cachedUser) {
        try { window.currentUser = JSON.parse(cachedUser); updateHeaderUI(window.currentUser); } catch (e) {}
      } else { window.location.href = '/login'; return; }
    }
    registerRoute('/', () => import('/static/pages/dashboard.js'));
    registerRoute('/account', () => import('/static/pages/account.js'));
    registerRoute('/line', () => import('/static/pages/line.js'));
    registerRoute('/media', () => import('/static/pages/media.js'));
    registerRoute('/media/detail', () => import('/static/pages/detail.js'));
    registerRoute('/upload', () => import('/static/pages/upload.js'));
    registerRoute('/watchlist', () => import('/static/pages/watchlist.js'));
    registerRoute('/seek', () => import('/static/pages/seek.js'));
    registerRoute('/shop', () => import('/static/pages/shop.js'));
    registerRoute('/order', () => import('/static/pages/order.js'));
    navigate(location.pathname, false);
  }
})();
`;

// ==================== 仪表盘页面模块 ====================
const PAGE_DASHBOARD_JS = `
export default async function DashboardPage() {
const escapeHtml = window.escapeHtml;
const showToast = window.showToast;
const copyText = window.copyText;
const formatBytes = window.formatBytes;
const el = document.createElement('div');

// 全局状态
let carrotHistoryPage = 1;
let carrotHistoryHasMore = true;
let inviteHistoryPage = 1;
let inviteHistoryHasMore = true;
let redPacketId = null;

// ==================== 新增：临时文件上传函数 ====================
async function uploadToTemporaryEmos(file, emosId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('emos_id', emosId);
    
    const response = await fetch('https://temporary.emos.best/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(\`上传失败 (\${response.status}): \${errText}\`);
    }
    
    const data = await response.json();
    if (!data.url) throw new Error('上传响应缺少 url 字段');
    
    // 自动识别文件类型
    const fileName = file.name.toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
    let fileType = 'image';
    if (audioExts.some(ext => fileName.endsWith(ext))) fileType = 'audio';
    
    return { url: data.url, type: fileType };
}

function renderContent(userData) {
if (!userData) return '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
const safeUserId = escapeHtml(userData.user_id || '');
const safeUsername = escapeHtml(userData.username || '');
const safePseudonym = escapeHtml(userData.pseudonym || '');
const safeDisplayName = userData.pseudonym ? safePseudonym : safeUsername;
const safeCarrot = userData.carrot !== undefined ? userData.carrot : 0;
const safeSizeUpload = userData.size_upload || 0;
const safeInviteRemaining = userData.invite_remaining !== undefined ? userData.invite_remaining : 0;
const safeWatchSlotRemaining = userData.watch_slot_remaining !== undefined ? userData.watch_slot_remaining : 0;
const safeMustOtp = userData.must_otp === true;
const safeIsViewing = userData.is_viewing !== false;
const safeEmyaPassword = userData.emya_password || '';
const safeEmyaUrl = escapeHtml(userData.emya_url || '');
const safeEmyaLiveUrl = escapeHtml(userData.emya_live_url || '');
const safeRoles = Array.isArray(userData.roles) ? userData.roles : [];
const roleMap = { admin: '管理员', dev: '开发者', special: '特邀用户', sponsor: '赞助者', peer: '同行' };
const roleString = safeRoles.map(r => roleMap[r] || r).join(', ');
const token = userData.token;
const hasAvatar = userData.avatar && userData.avatar !== 'null' && userData.avatar.trim() !== '';
const avatarSrc = hasAvatar ? escapeHtml(userData.avatar) : '';
return \`
<div class="dashboard-v2">
<header class="dash-header">
<h1 class="page-title">仪表盘</h1>
<p class="dash-subtitle">欢迎回来：<span id="rolePrefix">\${roleString || '普通用户'}</span> - <span id="dashWelcomeName">\${safeDisplayName}</span></p>
</header>
<div class="bento-grid">
<!-- 核心档案卡片 -->
<div class="bento-card card-profile">
<div class="profile-header">
<div class="profile-avatar" id="dashAvatarContainer">
\${hasAvatar ? '<img src="' + avatarSrc + '" alt="Avatar">' : '<i class="fas fa-user"></i>'}
</div>
<div class="profile-info">
<div class="profile-name" id="dashName">\${safeDisplayName}</div>
<div class="profile-role" id="dashRole">\${roleString || '普通用户'}</div>
</div>
<div class="profile-sensitive-row">
<div class="sensitive-item" id="copyUserIdBtn" title="点击复制用户 ID">
<i class="fas fa-user-tag"></i>
</div>
<div class="sensitive-item" id="copyTokenBtn" title="点击复制 Token">
<i class="fas fa-key"></i>
</div>
<div class="sensitive-item" id="copyPasswordBtn" title="\${safeMustOtp ? '获取动态密码' : '点击复制密码'}">
<i class="fas fa-lock"></i>
</div>
</div>
</div>
<div class="profile-stats">
<div class="stat-box" id="carrotStatBox">
<div class="stat-value" id="carrotValue" data-original="\${safeCarrot}">\${safeCarrot}</div>
<div class="stat-label"><i class="fas fa-carrot"></i> 萝卜余额</div>
</div>
<div class="stat-box" id="uploadStatBox">
<div class="stat-value" id="uploadSizeValue" data-original="\${safeSizeUpload}">\${safeSizeUpload > 0 ? formatBytes(safeSizeUpload) : '0 B'}</div>
<div class="stat-label"><i class="fas fa-cloud-upload-alt"></i> 上传总量</div>
</div>
<div class="stat-box" id="inviteStatBox">
<div class="stat-value" id="dashInviteCount">\${safeRoles.includes('admin') ? '∞' : safeInviteRemaining}</div>
<div class="stat-label"><i class="fas fa-users"></i> 邀请名额</div>
</div>
<div class="stat-box">
<div class="stat-value" id="dashWatchCount">\${safeWatchSlotRemaining}</div>
<div class="stat-label"><i class="fas fa-film"></i> 片单额度</div>
</div>
</div>
</div>
<!-- 服务器连接卡片 -->
<div class="bento-card card-server">
<div class="card-header"><i class="fas fa-server"></i> 服务器连接</div>
<div class="server-links">
<button class="copy-link-btn" id="copyEmbyBtn" data-url="\${safeEmyaUrl}">
<span>Emby 地址</span> <i class="far fa-copy"></i>
</button>
<button class="copy-link-btn" id="copyTvBtn" data-url="\${safeEmyaLiveUrl}" style="display: \${safeEmyaLiveUrl ? 'flex' : 'none'};">
<span>TV 地址</span> <i class="far fa-copy"></i>
</button>
<button class="copy-link-btn" id="copyUsernameServerBtn" data-username="\${safeUsername}">
<span>用户名</span> <i class="far fa-copy"></i>
</button>
</div>
</div>
<!-- 每日签到卡片 -->
<div class="bento-card card-signin">
<div class="card-header">
<span><i class="fas fa-calendar-check"></i> 每日签到</span>
<button class="rank-btn" id="openSignRankBtn" title="签到排行榜"><i class="fas fa-trophy"></i></button>
</div>
<div id="dashSignVisual" class="signin-visual">
<div class="signin-ring"><i class="fas fa-gift"></i></div>
</div>
<div id="dashSignStatus" class="signin-status">
<div id="signMessage">今天还没有签到哦！</div>
<div id="signReward" class="sign-reward-hint">点击签到，写下今日寄语</div>
</div>
<button id="dashSignBtn" class="action-btn primary">\${userData.sign && userData.sign[0]?.sign_at ? '已签到' : '立即签到'}</button>
</div>
<!-- 快捷操作卡片 -->
<div class="bento-card card-actions">
<div class="card-header"><i class="fas fa-bolt"></i> 快捷操作</div>
<div class="quick-actions-grid">
<button class="action-btn secondary" id="dashTransferTrigger"><i class="fas fa-exchange-alt"></i> 转赠萝卜</button>
<button class="action-btn secondary" id="openInviteUserModalBtn"><i class="fas fa-user-plus"></i> 邀请用户</button>
<button class="action-btn secondary" id="openRedPacketModalBtn"><i class="fas fa-gift"></i> 红包工具</button>
<button class="action-btn secondary" id="openLotteryModalBtn"><i class="fas fa-ticket-alt"></i> 抽奖工具</button>
<button class="action-btn secondary" id="openVoteModalBtn"><i class="fas fa-poll"></i> 投票工具</button>
</div>
\${!safeIsViewing ? \`
<div class="info-notice" id="infoCardContainer">
<strong><i class="fas fa-exclamation-triangle"></i> 观影权限说明</strong>
<p>本服完全免费，欢迎体验！开号方式：用户邀请、萝卜兑换、友情赞助。观影规则：禁止拖拉测速以及使用会触发多次请求的软件。</p>
</div>
\` : ''}
</div>
</div>
</div>
<!-- ===== 模态框区域 ===== -->
<!-- 签到排行榜模态框 -->
<div class="modal-overlay" id="signRankModal">
<div class="modal-content modal-wide">
<div class="modal-title">
<span>签到排行榜</span>
<button class="btn-icon" id="closeSignRankModal"><i class="fas fa-times"></i></button>
</div>
<div id="signRankList" class="apple-rank-list"></div>
<div id="signRankEmpty" class="no-results" style="display:none;">暂无签到记录</div>
</div>
</div>
<!-- 萝卜相关模态框 -->
<div class="modal-overlay" id="carrotModal">
<div class="modal-content modal-wide">
<div class="modal-title">
<span>萝卜相关</span>
<button class="btn-icon" id="closeCarrotModal"><i class="fas fa-times"></i></button>
</div>
<div class="modal-tabs">
<button class="modal-tab active" data-tab="history">变化记录</button>
<button class="modal-tab" data-tab="rank">排行榜</button>
</div>
<div id="carrotHistoryTab">
<div id="carrotHistoryList" class="record-list"></div>
<div id="carrotHistoryEmpty" class="no-results" style="display:none;">暂无萝卜记录</div>
</div>
<div id="carrotRankTab" style="display:none;">
<div id="carrotRankList" class="apple-rank-list"></div>
<div id="carrotRankEmpty" class="no-results" style="display:none;">暂无排行榜数据</div>
</div>
</div>
</div>
<!-- 上传排行榜模态框 -->
<div class="modal-overlay" id="uploadRankModal">
<div class="modal-content modal-wide">
<div class="modal-title">
<span>上传排行榜</span>
<button class="btn-icon" id="closeUploadRankModal"><i class="fas fa-times"></i></button>
</div>
<div id="uploadRankList" class="apple-rank-list"></div>
<div id="uploadRankEmpty" class="no-results" style="display:none;">暂无上传记录</div>
</div>
</div>
<!-- 邀请相关模态框 -->
<div class="modal-overlay" id="inviteModal">
<div class="modal-content modal-wide">
<div class="modal-title">
<span>邀请相关</span>
<button class="btn-icon" id="closeInviteModal"><i class="fas fa-times"></i></button>
</div>
<div class="modal-tabs">
<button class="modal-tab active" data-tab="info">我的邀请</button>
<button class="modal-tab" data-tab="history">邀请历史</button>
</div>
<div id="inviteInfoTab">
<div class="invite-info-card">
<div class="invite-stat-row">
<div class="invite-stat">
<div class="invite-stat-value" id="inviteCountValue">-</div>
<div class="invite-stat-label">累计邀请</div>
</div>
<div class="invite-stat">
<div class="invite-stat-value" id="inviteRemainingValue">-</div>
<div class="invite-stat-label">剩余名额</div>
</div>
<div class="invite-stat">
<div class="invite-stat-value" id="inviteAtValue">-</div>
<div class="invite-stat-label">邀请时间</div>
</div>
</div>
<div class="invite-parent-row" id="inviteParentRow" style="display:none;">
<span>我的上级：</span><span id="inviteParentName" class="invite-parent-name"></span>
</div>
</div>
</div>
<div id="inviteHistoryTab" style="display:none;">
<div id="inviteHistoryList" class="record-list"></div>
<div id="inviteHistoryEmpty" class="no-results" style="display:none;">暂无邀请记录</div>
<div class="load-more" id="inviteHistoryLoadMore" style="display:none;">加载更多...</div>
</div>
</div>
</div>
<!-- 红包工具模态框 -->
<div class="modal-overlay" id="redPacketToolModal">
<div class="modal-content modal-wide">
<div class="modal-title">
<span>红包工具</span>
<button class="btn-icon" id="closeRedPacketToolModal"><i class="fas fa-times"></i></button>
</div>
<div class="modal-tabs">
<button class="modal-tab active" data-tab="send">发红包</button>
<button class="modal-tab" data-tab="receive">领取记录</button>
</div>
<div id="redPacketSendTab">
<div style="margin-bottom: 1rem;">
<div class="type-selector" style="display: flex; gap: 0.5rem; margin-bottom: 0.8rem; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 0.3rem;">
<button type="button" class="type-btn active" data-type="fixed" style="white-space: nowrap; flex-shrink: 0;">普通红包</button>
<button type="button" class="type-btn" data-type="random" style="white-space: nowrap; flex-shrink: 0;">随机红包</button>
<button type="button" class="type-btn" data-type="password" style="white-space: nowrap; flex-shrink: 0;">口令红包</button>
</div>
</div>
<div class="form-group">
<label>总金额（萝卜）</label>
<input type="number" id="rpCarrot" class="modal-input" placeholder="1 - 60000" min="1" max="60000" step="1">
</div>
<div class="form-group">
<label>红包个数</label>
<input type="number" id="rpNumber" class="modal-input" placeholder="1 - 10000" min="1" max="10000" step="1">
</div>
<div class="form-group">
<label>祝福语</label>
<input type="text" id="rpBlessing" class="modal-input" placeholder="最多 50 字" maxlength="50">
</div>
<div id="rpPasswordGroup" style="display: none;">
<div class="form-group">
<label>口令文本</label>
<input type="text" id="rpPassword" class="modal-input" placeholder="1-50 字符，区分大小写" maxlength="50">
</div>
</div>
<div style="margin-top: 1rem;">
<div style="font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.5rem;">红包封面（可选）</div>
<div class="cover-tabs" style="display: flex; gap: 0.5rem; border-bottom: 0.5px solid var(--border-light); margin-bottom: 1rem;">
<button class="cover-tab active" data-cover-type="upload"><i class="fas fa-folder-open"></i> 上传文件</button>
<button class="cover-tab" data-cover-type="url"><i class="fas fa-link"></i> 使用外链</button>
</div>
<div id="coverUploadArea" class="cover-panel">
    <div class="rp-upload-wrapper" id="rpUploadWrapper">
        <!-- 默认状态：显示上传按钮 -->
        <button class="rp-upload-btn-trigger" id="rpUploadBtn">
            <i class="fas fa-cloud-upload-alt"></i>
            <span>点击上传</span>
        </button>
        
        <!-- 预览状态：显示预览和删除按钮 -->
        <div class="rp-preview-box" id="rpPreviewBox" style="display: none;">
            <div id="rpPreviewContent" class="rp-preview-content">
                <!-- 动态插入 img 或 audio -->
            </div>
            <button class="rp-delete-icon-btn" id="rpDeleteBtn" title="删除">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <input type="file" id="rpFileInput" accept="image/*,audio/*,.mp3,.wav,.ogg,.m4a,.flac" style="display: none;">
    </div>
    <input type="hidden" id="rpFileId">
    <input type="hidden" id="rpFileType">
    <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.4rem;">支持图片/音频，≤80MB，上传后自动填充外链</div>
</div>
<div id="coverUrlArea" class="cover-panel" style="display: none;">
    <input type="url" id="rpFileUrl" class="modal-input" placeholder="https:// 或 http:// 开头的图片/音频链接" style="margin-bottom: 0;">
    <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.2rem;">直接输入图片或音频的 URL 地址</div>
</div>
</div>
<div class="modal-error" id="rpError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="rpCancel">取消</button>
<button class="modal-btn primary" id="rpConfirm">发红包</button>
</div>
</div>
<div id="redPacketReceiveTab" style="display:none;">
<div class="form-group">
<label>红包 ID</label>
<input type="text" class="modal-input" id="redPacketIdInput" placeholder="请输入红包 ID">
</div>
<button class="action-btn primary" id="loadReceiveRecordBtn" style="margin-bottom:1rem;">查询记录</button>
<div id="receiveRecordList" class="record-list"></div>
<div id="receiveRecordEmpty" class="no-results" style="display:none;">暂无领取记录</div>
</div>
</div>
</div>
<!-- 抽奖工具模态框 -->
<div class="modal-overlay" id="lotteryModal">
<div class="modal-content modal-wide">
<div class="modal-title">
<span>抽奖工具</span>
<button class="btn-icon" id="closeLotteryModal"><i class="fas fa-times"></i></button>
</div>
<div class="modal-tabs">
<button class="modal-tab active" data-tab="create">创建抽奖</button>
<button class="modal-tab" data-tab="win">中奖列表</button>
</div>
<div id="lotteryCreateTab">
<div class="form-group">
<label>抽奖名称</label>
<input type="text" class="modal-input" id="lotteryName" maxlength="50" placeholder="50 字以内">
</div>
<div class="form-group">
<label>抽奖简介</label>
<textarea class="modal-input" id="lotteryDesc" maxlength="200" rows="2" placeholder="200 字以内"></textarea>
</div>
<div class="form-group">
<label>开始时间</label>
<input type="datetime-local" class="modal-input full-width" id="lotteryTimeStart">
</div>
<div class="form-group">
<label>结束时间</label>
<input type="datetime-local" class="modal-input full-width" id="lotteryTimeEnd">
</div>
<div class="form-row">
<div class="form-group">
<label>参与消耗萝卜 (1-50000)</label>
<input type="number" class="modal-input" id="lotteryAmount" min="1" max="50000" value="1">
</div>
<div class="form-group">
<label>人数开奖上限 (0=时间开奖)</label>
<input type="number" class="modal-input" id="lotteryNumber" min="0" max="5000" value="0">
</div>
</div>
<div class="form-row">
<div class="form-group">
<label>参与需萝卜数 (0=无限制)</label>
<input type="number" class="modal-input" id="lotteryRuleCarrot" min="0" max="50000" value="0">
</div>
<div class="form-group">
<label>参与需签到天数 (0=无限制)</label>
<input type="number" class="modal-input" id="lotteryRuleSign" min="0" max="5000" value="0">
</div>
</div>
<div class="form-section">
<div class="section-title">奖品列表 <span id="prizeCount" style="font-size:0.8rem;color:var(--text-secondary)">(0/20)</span></div>
<div id="prizesContainer"></div>
<button class="action-btn secondary" id="addPrizeBtn" style="width:100%;margin-top:0.5rem;"><i class="fas fa-plus"></i> 添加奖品</button>
</div>
<div class="modal-error" id="lotteryError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="lotteryCancel">取消</button>
<button class="modal-btn primary" id="lotterySubmit">创建抽奖</button>
</div>
</div>
<div id="lotteryWinTab" style="display:none;">
<div class="form-group">
<label>抽奖 ID</label>
<input type="text" class="modal-input" id="lotteryIdInput" placeholder="请输入抽奖 ID">
</div>
<div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
<button class="action-btn primary" id="loadWinListBtn">查询中奖</button>
<button class="action-btn" id="cancelLotteryBtn" style="display:none;">取消抽奖</button>
</div>
<div id="lotteryInfo" style="margin-bottom:1rem;display:none;">
<div class="lottery-info-card">
<div class="lottery-name" id="winLotteryName"></div>
<div class="lottery-desc" id="winLotteryDesc"></div>
<div class="lottery-meta">
<span><i class="fas fa-clock"></i> <span id="winTimeRange"></span></span>
<span><i class="fas fa-carrot"></i> 消耗：<span id="winAmount"></span></span>
</div>
</div>
</div>
<div id="winList" class="record-list"></div>
<div id="winListEmpty" class="no-results" style="display:none;">暂无中奖记录</div>
</div>
</div>
</div>
<!-- 投票工具模态框 -->
<div class="modal-overlay" id="voteModal">
<div class="modal-content">
<div class="modal-title">
<span>投票工具</span>
<button class="btn-icon" id="closeVoteModal"><i class="fas fa-times"></i></button>
</div>
<div class="form-group">
<label>问题</label>
<input type="text" class="modal-input" id="voteQuestion" maxlength="100" placeholder="100 字以内">
</div>
<div class="form-section">
<div class="section-title">选项 (2-12 个)</div>
<div id="optionsContainer">
<div class="option-row"><input type="text" class="modal-input option-input" placeholder="选项 1" maxlength="50"><button class="btn-icon remove-option-btn" style="display:none;"><i class="fas fa-times"></i></button></div>
<div class="option-row"><input type="text" class="modal-input option-input" placeholder="选项 2" maxlength="50"><button class="btn-icon remove-option-btn"><i class="fas fa-times"></i></button></div>
</div>
<button class="action-btn secondary" id="addOptionBtn" style="width:100%;margin-top:0.5rem;"><i class="fas fa-plus"></i> 添加选项</button>
</div>
<div class="form-group">
<label>过期时间 (秒)</label>
<input type="number" class="modal-input" id="voteSeconds" min="60" value="3600">
</div>
<div class="modal-error" id="voteError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="voteCancel">取消</button>
<button class="modal-btn primary" id="voteSubmit">创建投票</button>
</div>
</div>
</div>
<!-- 邀请用户模态框（独立） -->
<div class="modal-overlay" id="inviteUserModal">
<div class="modal-content">
<div class="modal-title">
<span>邀请用户</span>
<button class="btn-icon" id="closeInviteUserModal"><i class="fas fa-times"></i></button>
</div>
<div class="form-group">
<label>对方用户 ID (10 位)</label>
<input type="text" class="modal-input" id="inviteUserUserId" placeholder="请输入对方用户 ID" maxlength="10">
</div>
<div class="modal-error" id="inviteUserError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="inviteUserCancel">取消</button>
<button class="modal-btn primary" id="inviteUserSubmit">邀请</button>
</div>
</div>
</div>
<!-- 转赠萝卜模态框 -->
<div class="modal-overlay" id="transferModal">
<div class="modal-content">
<div class="modal-title">
<span>萝卜转赠</span>
<button class="btn-icon" id="closeTransferModal"><i class="fas fa-times"></i></button>
</div>
<div class="modal-body" style="padding: 0 0 1rem 0;">
<div class="form-group">
<label>对方用户 ID </label>
<input type="text" class="modal-input" id="transferUserId" placeholder="请输入 10 位用户 ID" maxlength="10">
</div>
<div class="form-group" style="margin-bottom: 0;">
<label>转赠数量 </label>
<input type="number" class="modal-input" id="transferCarrot" placeholder="2 - 6000" min="2" max="6000">
<div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.3rem;">
单次转赠最少 2 萝卜，最多 6000 萝卜
</div>
</div>
</div>
<div class="modal-error" id="transferError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="transferCancel">取消</button>
<button class="modal-btn primary" id="transferSubmit">转赠</button>
</div>
</div>
</div>
<!-- 签到模态框 -->
<div class="modal-overlay" id="signModal">
<div class="modal-content">
<div class="modal-title">
<span>今日签到</span>
<button class="btn-icon" id="signModalClose"><i class="fas fa-times"></i></button></div>
<input type="text" class="modal-input" id="signContent" placeholder="对自己说点什么...（最多 10 字）" maxlength="10">
<div class="modal-error" id="signError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="signCancel">取消</button>
<button class="modal-btn primary" id="signSubmit">签到</button>
</div>
</div>
</div>
<style>
/* ===== 仪表盘专属样式 (Apple Style Optimized) ===== */
.dashboard-v2 { width: 100%; max-width: 1100px; margin: 0 auto; padding: 0 0.5rem; }
.dash-header { margin-bottom: 1.5rem; padding-left: 0.5rem; }
.page-title {
font-size: clamp(1.8rem, 4vw, 2.6rem);
font-weight: 700;
letter-spacing: -0.5px;
margin: 0 0 0.2rem 0;
line-height: 1.2;
color: var(--text-primary);
animation: slideUpFade 0.8s ease-out forwards;
}
@keyframes slideUpFade {
0% { opacity: 0; transform: translateY(30px); }
100% { opacity: 1; transform: translateY(0); }
}
.dash-subtitle { color: var(--text-secondary); font-size: 1.05rem; margin-top: 0.3rem; font-weight: 400; animation: slideUpFade 0.8s ease-out forwards; opacity: 0; }
.bento-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; margin-bottom: 2rem; }
.bento-card {
background: var(--bg-card);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 0.5px solid var(--border-light);
border-radius: 24px;
padding: 1.5rem;
position: relative;
overflow: hidden;
transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease;
box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}
.bento-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
.card-profile {
grid-column: span 12;
display: flex;
flex-direction: column;
gap: 0;
}
.card-server { grid-column: span 12; }
.card-signin { grid-column: span 12; }
.card-actions { grid-column: span 12; }
@media (min-width: 768px) {
.card-profile { grid-column: span 8; }
.card-server { grid-column: span 4; }
.card-signin { grid-column: span 6; }
.card-actions { grid-column: span 6; }
}
@media (min-width: 1024px) {
.card-profile { grid-column: span 7; }
.card-server { grid-column: span 5; }
.card-signin { grid-column: span 5; }
.card-actions { grid-column: span 7; }
}
.profile-header {
display: flex;
align-items: center;
gap: 1.2rem;
margin-bottom: 0;
position: relative;
padding-right: 130px;
}
.profile-sensitive-row {
position: absolute;
right: 0;
top: 50%;
transform: translateY(-50%);
display: flex;
gap: 0.6rem;
}
.profile-avatar {
width: 72px;
height: 72px;
border-radius: 50%;
background: var(--bg-input);
display: flex;
align-items: center;
justify-content: center;
font-size: 1.8rem;
color: var(--text-secondary);
border: 2px solid var(--border-light);
overflow: hidden;
flex-shrink: 0;
}
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-name { font-size: 1.6rem; font-weight: 600; letter-spacing: -0.3px; }
.profile-role {
font-size: 0.85rem;
color: var(--accent-color);
background: rgba(0,122,255,0.1);
border: 1px solid rgba(0,122,255,0.2);
padding: 0.2rem 0.7rem;
border-radius: 14px;
display: inline-block;
margin-top: 0.4rem;
font-weight: 500;
}
.sensitive-item {
display: flex;
align-items: center;
justify-content: center;
width: 40px;
height: 40px;
background: var(--bg-input);
border-radius: 12px;
cursor: pointer;
transition: all 0.2s;
color: var(--text-secondary);
}
.sensitive-item:hover {
background: var(--accent-color);
color: #fff;
}
.sensitive-item i { font-size: 1rem; }
.profile-stats {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
gap: 0.8rem;
margin-top: 1.5rem;
}
.stat-box {
background: var(--bg-input);
padding: 0.8rem 0.5rem;
border-radius: 18px;
text-align: center;
cursor: pointer;
transition: all 0.2s;
border: 1px solid transparent;
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
height: 100px;
}
.stat-box:hover { background: var(--bg-hover); border-color: var(--border-light); transform: scale(1.02); }
.stat-value {
font-size: 1.5rem;
font-weight: 700;
color: var(--text-primary);
margin-bottom: 0.2rem;
line-height: 1.2;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}
.stat-label {
font-size: 0.78rem;
color: var(--text-secondary);
font-weight: 500;
display: flex;
align-items: center;
justify-content: center;
gap: 4px;
white-space: nowrap;
}
.stat-label i { font-size: 0.7rem; opacity: 0.8; }
.card-header {
font-size: 1.15rem;
font-weight: 600;
margin-bottom: 1rem;
display: flex;
align-items: center;
justify-content: flex-start;
gap: 0.6rem;
color: var(--text-primary);
text-align: left;
}
.card-header i { color: var(--accent-color); font-size: 1rem; }
.card-header .rank-btn {
margin-left: auto;
background: transparent;
border: none;
color: var(--text-secondary);
font-size: 1rem;
width: 32px;
height: 32px;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
transition: 0.2s;
flex-shrink: 0;
}
.rank-btn:hover { background: var(--bg-hover); color: var(--warning-color); }
.server-links { display: flex; flex-direction: column; gap: 0.6rem; }
.copy-link-btn {
background: var(--bg-input);
border: 1px solid transparent;
color: var(--text-primary);
padding: 0.9rem 1rem;
border-radius: 16px;
cursor: pointer;
text-align: left;
transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
display: flex;
justify-content: space-between;
align-items: center;
font-size: 0.95rem;
}
.copy-link-btn:hover { background: var(--bg-hover); border-color: var(--accent-color); }
.signin-visual { display: flex; justify-content: center; margin: 1rem 0; }
.signin-ring { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,159,10,0.15), rgba(255,149,0,0.05)); display: flex; align-items: center; justify-content: center; color: var(--warning-color); font-size: 1.6rem; border: 1px solid rgba(255,159,10,0.3); animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.signin-status { text-align: center; min-height: 48px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 0.3rem; margin-bottom: 1rem; }
#signMessage { font-size: 1rem; font-weight: 500; color: var(--text-primary); }
.sign-reward-hint { font-size: 0.85rem; color: var(--text-secondary); }
.action-btn { width: 100%; padding: 0.85rem; border-radius: 16px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.6rem; font-size: 0.95rem; letter-spacing: 0.2px; }
.action-btn.primary { background: var(--accent-color); color: #fff; box-shadow: 0 4px 12px rgba(0,122,255,0.25); }
.action-btn.primary:hover { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,122,255,0.35); }
.action-btn.primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
.action-btn.secondary { background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-light); }
.action-btn.secondary:hover { background: var(--bg-hover); border-color: var(--accent-color); }
.quick-actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; }
.info-notice { margin-top: 1.2rem; padding: 1rem; background: rgba(255,159,10,0.08); border: 1px solid rgba(255,159,10,0.2); border-radius: 16px; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; }
.info-notice strong { color: var(--warning-color); display: block; margin-bottom: 0.4rem; font-size: 0.9rem; }
.info-notice p { margin: 0; }
.modal-content.modal-wide { max-width: 600px; }
.modal-title {
font-size: 1.3rem;
font-weight: 600;
margin-bottom: 1.2rem;
display: flex;
align-items: center;
justify-content: space-between;
color: var(--text-primary);
letter-spacing: -0.3px;
}
.modal-title span { display: flex; align-items: center; gap: 0; }
.modal-tabs {
display: flex;
gap: 0.5rem;
margin-bottom: 1rem;
padding-bottom: 0.5rem;
border-bottom: 1px solid var(--border-light);
}
.modal-tab {
background: transparent;
border: none;
padding: 0.5rem 1rem;
font-size: 0.9rem;
color: var(--text-secondary);
cursor: pointer;
border-radius: 12px;
transition: 0.2s;
}
.modal-tab.active {
background: var(--accent-color);
color: #fff;
}
.modal-tab:hover:not(.active) { background: var(--bg-hover); }
.apple-rank-list {
display: flex;
flex-direction: column;
gap: 0.6rem;
max-height: 450px;
overflow-y: auto;
padding: 0.2rem;
}
.apple-rank-item {
display: flex;
align-items: center;
gap: 1rem;
padding: 0.8rem 1rem;
background: var(--bg-input);
border-radius: 16px;
transition: 0.2s;
border: 0.5px solid transparent;
}
.apple-rank-item:hover {
background: var(--bg-hover);
border-color: var(--border-light);
transform: translateX(2px);
}
.rank-index-badge {
width: 28px;
height: 28px;
border-radius: 50%;
background: var(--bg-card);
color: var(--text-secondary);
font-size: 0.85rem;
font-weight: 600;
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
border: 1px solid var(--border-light);
}
.rank-index-badge.gold {
background: linear-gradient(135deg, #FFD700, #FFA500);
color: #fff;
border: none;
box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}
.rank-index-badge.silver {
background: linear-gradient(135deg, #E0E0E0, #BDBDBD);
color: #fff;
border: none;
box-shadow: 0 2px 8px rgba(192, 192, 192, 0.3);
}
.rank-index-badge.bronze {
background: linear-gradient(135deg, #CD7F32, #A0522D);
color: #fff;
border: none;
box-shadow: 0 2px 8px rgba(205, 127, 50, 0.3);
}
.rank-avatar {
width: 40px;
height: 40px;
border-radius: 50%;
background: var(--bg-card);
display: flex;
align-items: center;
justify-content: center;
overflow: hidden;
flex-shrink: 0;
border: 1px solid var(--border-light);
}
.rank-avatar img { width: 100%; height: 100%; object-fit: cover; }
.rank-avatar i { font-size: 1rem; color: var(--text-tertiary); }
.rank-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.rank-name { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.rank-value {
font-weight: 700;
color: var(--accent-color);
font-size: 0.95rem;
flex-shrink: 0;
background: rgba(0,122,255,0.1);
padding: 0.2rem 0.6rem;
border-radius: 12px;
}
.record-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 350px; overflow-y: auto; }
.record-item {
display: flex;
align-items: center;
justify-content: space-between;
padding: 0.8rem 1rem;
background: var(--bg-input);
border-radius: 16px;
font-size: 0.85rem;
}
.record-left { display: flex; align-items: center; gap: 0.8rem; flex: 1; min-width: 0; }
.record-icon {
width: 36px;
height: 36px;
border-radius: 12px;
background: var(--bg-card);
display: flex;
align-items: center;
justify-content: center;
color: var(--text-secondary);
flex-shrink: 0;
}
.record-icon.earn { color: var(--success-color); background: rgba(48, 209, 88, 0.1); }
.record-icon.cost { color: var(--danger-color); background: rgba(255, 59, 48, 0.1); }
.record-info { flex: 1; min-width: 0; }
.record-title { font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.record-time { font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem; }
.record-right { text-align: right; flex-shrink: 0; margin-left: 0.8rem; }
.record-amount { font-weight: 600; font-size: 0.9rem; }
.record-amount.earn { color: var(--success-color); }
.record-amount.cost { color: var(--danger-color); }
.record-expire { font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.2rem; }
.invite-info-card {
background: var(--bg-input);
border-radius: 20px;
padding: 1.2rem;
margin-bottom: 1rem;
}
.invite-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; text-align: center; }
.invite-stat-value { font-size: 1.5rem; font-weight: 700; color: var(--accent-color); }
.invite-stat-label { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem; }
.invite-parent-row {
display: flex;
align-items: center;
gap: 0.5rem;
padding-top: 0.8rem;
border-top: 1px solid var(--border-light);
font-size: 0.85rem;
color: var(--text-secondary);
}
.invite-parent-name { font-weight: 500; color: var(--text-primary); }
.invite-input-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.invite-input-row .modal-input { flex: 1; margin-bottom: 0; }
.revoke-btn {
background: transparent;
border: 1px solid var(--border-light);
color: var(--text-secondary);
padding: 0.3rem 0.8rem;
border-radius: 20px;
font-size: 0.75rem;
cursor: pointer;
transition: 0.2s;
}
.revoke-btn:hover { background: var(--danger-color); border-color: var(--danger-color); color: #fff; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.form-group { width: 100%; }
.form-group label { display: block; margin-bottom: 0.4rem; color: var(--text-secondary); font-size: 0.85rem; font-weight: 500; }
.form-group input, .form-group textarea, .form-group select {
width: 100%;
background: var(--bg-input);
border: 0.5px solid var(--border-light);
border-radius: var(--radius-md);
padding: 0.8rem 1rem;
color: var(--text-primary);
font-size: 0.95rem;
outline: none;
transition: border-color 0.2s;
box-sizing: border-box;
-webkit-appearance: none;
appearance: none;
}
.form-group textarea { resize: vertical; min-height: 80px; border-radius: var(--radius-md); }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--accent-color); }
.form-group input[type="datetime-local"] {
width: 100%;
background: var(--bg-input);
border: 0.5px solid var(--border-light);
border-radius: var(--radius-md);
padding: 0.8rem 1rem;
color: var(--text-primary);
font-size: 0.95rem;
outline: none;
transition: border-color 0.2s;
box-sizing: border-box;
-webkit-appearance: none;
appearance: none;
min-height: 44px;
line-height: 1.4;
}
.form-group input[type="datetime-local"]:focus {
border-color: var(--accent-color);
background: var(--bg-card);
}
.form-group input.full-width { width: 100%; }
.form-section {
background: var(--bg-input);
border-radius: 16px;
padding: 1rem;
margin: 1rem 0;
}
.section-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.8rem; }
.prize-row {
display: flex;
flex-direction: column;
gap: 0.8rem;
margin-bottom: 1.2rem;
padding: 1.2rem;
background: var(--bg-card);
border: 1px solid var(--border-light);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-sm);
transition: all 0.2s ease;
}
.prize-row:hover {
border-color: var(--accent-color);
box-shadow: var(--shadow-md);
transform: translateY(-2px);
}
.prize-header {
display: flex;
align-items: center;
gap: 0.8rem;
flex-wrap: wrap;
}
.prize-header .modal-input {
flex: 1;
min-width: 150px;
margin-bottom: 0;
}
.prize-header .prize-number {
width: 100px !important;
flex-shrink: 0;
}
.prize-row .remove-prize-btn {
background: var(--bg-input);
border: 1px solid var(--border-light);
color: var(--text-secondary);
width: 36px;
height: 36px;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
transition: all 0.2s;
flex-shrink: 0;
margin-left: auto;
}
.prize-row .remove-prize-btn:hover {
background: var(--danger-color);
border-color: var(--danger-color);
color: #fff;
transform: scale(1.05);
}
.prize-bodys-label {
font-size: 0.8rem;
color: var(--text-secondary);
display: flex;
align-items: center;
gap: 6px;
margin-bottom: 0.4rem;
font-weight: 500;
}
.prize-bodys-label i {
color: var(--accent-color);
font-size: 0.9rem;
}
.prize-bodys {
font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
font-size: 0.85rem !important;
resize: vertical;
min-height: 80px;
background: var(--bg-input);
border: 1px solid var(--border-light);
border-radius: var(--radius-md);
padding: 0.8rem;
color: var(--text-primary);
line-height: 1.5;
transition: all 0.2s;
}
.prize-bodys::placeholder {
color: var(--text-tertiary);
font-style: italic;
font-size: 0.8rem;
}
.prize-bodys:focus {
border-color: var(--accent-color);
outline: none;
box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}
.prize-index-badge {
background: var(--accent-color);
color: #fff;
font-size: 0.75rem;
font-weight: 600;
padding: 0.3rem 0.8rem;
border-radius: 20px;
display: inline-flex;
align-items: center;
gap: 0.3rem;
}
.option-row {
display: flex;
align-items: center;
gap: 0.5rem;
margin-bottom: 0.5rem;
}
.option-row .modal-input { flex: 1; margin-bottom: 0; }
.remove-option-btn {
background: var(--bg-card);
border: 1px solid var(--border-light);
color: var(--text-secondary);
width: 32px;
height: 32px;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
transition: 0.2s;
flex-shrink: 0;
}
.remove-option-btn:hover { background: var(--danger-color); border-color: var(--danger-color); color: #fff; }
.lottery-info-card {
background: var(--bg-input);
border-radius: 16px;
padding: 1rem;
margin-bottom: 1rem;
}
.lottery-name { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.3rem; }
.lottery-desc { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
.lottery-meta { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-tertiary); }
.type-selector .type-btn {
background: var(--bg-input);
border: 1px solid var(--border-light);
border-radius: 40px;
padding: 0.4rem 1rem;
font-size: 0.8rem;
color: var(--text-secondary);
cursor: pointer;
transition: 0.2s;
white-space: nowrap;
flex-shrink: 0;
}
.type-selector .type-btn.active {
background: var(--accent-color);
border-color: var(--accent-color);
color: #fff;
}
.cover-tabs { display: flex; gap: 0.5rem; border-bottom: 0.5px solid var(--border-light); margin-bottom: 1rem; }
.cover-tab {
background: transparent;
border: none;
padding: 0.4rem 1rem;
font-size: 0.85rem;
color: var(--text-secondary);
cursor: pointer;
transition: 0.2s;
border-bottom: 2px solid transparent;
margin-bottom: -0.5px;
}
.cover-tab.active { color: var(--accent-color); border-bottom-color: var(--accent-color); }
.cover-panel { padding: 0.5rem 0; }
/* ✅ 中奖列表发奖内容高亮样式 */
.prize-body-display {
color: var(--accent-color);
font-size: 0.75rem;
margin-top: 0.25rem;
padding: 0.2rem 0.5rem;
background: rgba(0,122,255,0.1);
border-radius: var(--radius-sm);
border-left: 2px solid var(--accent-color);
font-family: monospace;
word-break: break-all;
}
.prize-body-display i { margin-right: 4px; opacity: 0.8; }

/* ===== 红包上传控件样式 (Fix: Hover Overlay Removed) ===== */
.rp-upload-wrapper {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: var(--bg-input);
    border-radius: var(--radius-md);
    border: 2px dashed var(--border-light);
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.rp-upload-wrapper:hover {
    border-color: var(--accent-color);
}
.rp-upload-btn-trigger {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 1rem;
    transition: color 0.2s;
}
.rp-upload-btn-trigger:hover {
    color: var(--accent-color);
}
.rp-upload-btn-trigger i {
    font-size: 2.5rem;
    opacity: 0.8;
}
.rp-preview-box {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--bg-card);
}
.rp-preview-content {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
.rp-preview-content img, .rp-preview-content audio {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.rp-preview-content audio {
    width: 90%;
    max-height: 80%;
    object-fit: none; /* 音频保持比例 */
}
.rp-delete-icon-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0; /* 默认隐藏 */
    transition: opacity 0.2s, transform 0.2s;
    z-index: 10;
    font-size: 0.8rem;
}
.rp-preview-box:hover .rp-delete-icon-btn {
    opacity: 1; /* hover 时显示 */
}
.rp-delete-icon-btn:hover {
    background: var(--danger-color);
    border-color: var(--danger-color);
    transform: scale(1.1);
}

@media (max-width: 700px) {
.dashboard-v2 { padding: 0; }
.dash-header { padding: 0 1rem; margin-bottom: 1rem; }
.bento-grid { gap: 0.8rem; padding: 0 0.8rem; }
.bento-card { padding: 1.2rem; border-radius: 20px; }
.profile-header {
flex-direction: column;
text-align: center;
padding-right: 0;
gap: 0.8rem;
}
.profile-sensitive-row {
position: static;
transform: none;
justify-content: center;
margin-top: 0.5rem;
}
.profile-avatar { width: 80px; height: 80px; }
.profile-stats { grid-template-columns: repeat(2, 1fr); }
.stat-box { padding: 0.8rem; }
.stat-value { font-size: 1.3rem; }
.server-links { gap: 0.5rem; }
.quick-actions-grid { grid-template-columns: 1fr; }
.card-header { font-size: 1.05rem; }
.form-row { grid-template-columns: 1fr; }
.invite-stat-row { grid-template-columns: 1fr; }
.modal-content.modal-wide { max-width: 95%; margin: 0.8rem; }
#inviteInfoTab .invite-info-card { padding: 1rem; }
#inviteInfoTab .invite-stat-row { grid-template-columns: 1fr; gap: 0.8rem; }
#inviteInfoTab .invite-stat-value { font-size: 1.3rem; }
.form-group input[type="datetime-local"] { width: 100%; box-sizing: border-box; padding: 0.75rem 1rem; }
.prize-row {
padding: 1rem;
margin-bottom: 1rem;
gap: 0.6rem;
}
.prize-header {
flex-direction: column;
align-items: stretch;
gap: 0.6rem;
}
.prize-header .modal-input {
width: 100%;
min-width: auto;
}
.prize-header .prize-number {
width: 100% !important;
}
.prize-row .remove-prize-btn {
position: absolute;
top: 1rem;
right: 1rem;
margin-left: 0;
}
.prize-bodys {
min-height: 60px;
font-size: 0.8rem !important;
}
}
</style>
\`;
}

function bindEvents(userData) {
const token = userData.token;

// ===== 敏感信息复制（图标按钮）=====
const copyUserIdBtn = el.querySelector('#copyUserIdBtn');
if (copyUserIdBtn) {
copyUserIdBtn.addEventListener('click', () => {
const text = userData.user_id || '';
navigator.clipboard.writeText(text).then(() => {
showToast('复制用户 ID 成功');
copyUserIdBtn.style.transition = 'background 0.2s';
copyUserIdBtn.style.backgroundColor = 'rgba(0,122,255,0.3)';
setTimeout(() => { copyUserIdBtn.style.backgroundColor = ''; }, 300);
}).catch(() => showToast('复制失败'));
});
}

const copyTokenBtn = el.querySelector('#copyTokenBtn');
if (copyTokenBtn) {
copyTokenBtn.addEventListener('click', () => {
navigator.clipboard.writeText(token).then(() => {
showToast('复制 Token 成功');
copyTokenBtn.style.transition = 'background 0.2s';
copyTokenBtn.style.backgroundColor = 'rgba(0,122,255,0.3)';
setTimeout(() => { copyTokenBtn.style.backgroundColor = ''; }, 300);
}).catch(() => showToast('复制失败'));
});
}

const copyPasswordBtn = el.querySelector('#copyPasswordBtn');
if (copyPasswordBtn) {
copyPasswordBtn.addEventListener('click', async () => {
if (userData.must_otp) {
copyPasswordBtn.disabled = true;
copyPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
const res = await window.fetchWithAuth('/api/emya/getLoginPassword');
if (!res) return;
const data = await res.json();
if (data.password !== undefined && data.password !== null) {
const passwordStr = String(data.password);
if (data.second) {
showToast(\`动态密码：\${passwordStr} (\${data.second}秒有效)\`);
} else {
showToast(\`动态密码：\${passwordStr}\`);
}
} else {
showToast('请使用当前账号密码登录');
}
} catch (err) {
showToast('获取动态密码失败：' + err.message);
} finally {
copyPasswordBtn.disabled = false;
copyPasswordBtn.innerHTML = '<i class="fas fa-lock"></i>';
}
} else {
const pwd = userData.emya_password || '';
if (pwd) {
try {
if (navigator.clipboard && window.isSecureContext) {
await navigator.clipboard.writeText(pwd);
} else {
const textarea = document.createElement('textarea');
textarea.value = pwd;
textarea.style.position = 'fixed';
textarea.style.top = '-9999px';
textarea.style.left = '-9999px';
document.body.appendChild(textarea);
textarea.select();
textarea.setSelectionRange(0, pwd.length);
document.execCommand('copy');
document.body.removeChild(textarea);
}
showToast('复制密码成功');
copyPasswordBtn.style.transition = 'background 0.2s';
copyPasswordBtn.style.backgroundColor = 'rgba(0,122,255,0.3)';
setTimeout(() => { copyPasswordBtn.style.backgroundColor = ''; }, 300);
} catch (clipErr) {
console.error('复制失败:', clipErr);
showToast('复制失败，请手动复制');
}
} else {
showToast('无密码可复制');
}
}
});
}

// ===== 服务器连接 - 用户名复制 =====
const copyUsernameServerBtn = el.querySelector('#copyUsernameServerBtn');
if (copyUsernameServerBtn) {
copyUsernameServerBtn.addEventListener('click', () => {
const username = copyUsernameServerBtn.dataset.username || '';
copyText(username, copyUsernameServerBtn);
});
}

// ===== 基础信息绑定 =====
const displayNameSpan = el.querySelector('#dashName');
if (displayNameSpan) displayNameSpan.textContent = userData.pseudonym || userData.username || '';
const welcomeName = el.querySelector('#dashWelcomeName');
if (welcomeName) welcomeName.textContent = userData.pseudonym || userData.username || '';
const roleEl = el.querySelector('#dashRole');
if (roleEl) {
const roles = userData.roles || [];
const roleMap = { admin: '管理员', dev: '开发者', special: '特邀用户', sponsor: '赞助者', peer: '同行' };
roleEl.textContent = roles.map(r => roleMap[r] || r).join(', ') || '普通用户';
}

const copyEmbyBtn = el.querySelector('#copyEmbyBtn');
const copyTvBtn = el.querySelector('#copyTvBtn');
if (copyEmbyBtn && copyEmbyBtn.dataset.url) copyEmbyBtn.addEventListener('click', () => copyText(copyEmbyBtn.dataset.url, copyEmbyBtn));
if (copyTvBtn && copyTvBtn.dataset.url) copyTvBtn.addEventListener('click', () => copyText(copyTvBtn.dataset.url, copyTvBtn));

// ===== 统计卡片点击 =====
const carrotStat = el.querySelector('#carrotStatBox');
const carrotSpan = el.querySelector('#carrotValue');
const carrot = userData.carrot || 0;
if (carrotSpan) {
carrotSpan.dataset.original = carrot;
carrotSpan.textContent = carrot;
}
if (carrotStat) {
carrotStat.addEventListener('click', () => {
openCarrotModal('history');
});
}

const uploadStat = el.querySelector('#uploadStatBox');
const uploadSpan = el.querySelector('#uploadSizeValue');
if (userData.size_upload && userData.size_upload > 0) {
uploadSpan.dataset.original = userData.size_upload;
uploadSpan.textContent = formatBytes(userData.size_upload);
}
if (uploadStat) {
uploadStat.addEventListener('click', () => {
openUploadRankModal();
});
}

const inviteStat = el.querySelector('#inviteStatBox');
const inviteCountEl = el.querySelector('#dashInviteCount');
if (inviteCountEl) inviteCountEl.textContent = (userData.roles || []).includes('admin') ? '∞' : (userData.invite_remaining || 0);
if (inviteStat) {
inviteStat.addEventListener('click', () => {
openInviteModal('info');
});
}

const watchCountEl = el.querySelector('#dashWatchCount');
if (watchCountEl) watchCountEl.textContent = userData.watch_slot_remaining || 0;

// ===== 签到相关 =====
const signMessage = el.querySelector('#signMessage');
const signReward = el.querySelector('#signReward');
const signBtn = el.querySelector('#dashSignBtn');
let signInfo = null;
if (userData.sign && Array.isArray(userData.sign) && userData.sign.length > 0) signInfo = userData.sign[0];
else if (userData.sign && typeof userData.sign === 'object') signInfo = userData.sign;
if (signInfo && signInfo.sign_at) {
const signDate = new Date(signInfo.sign_at);
const today = new Date();
const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const signDateOnly = new Date(signDate.getFullYear(), signDate.getMonth(), signDate.getDate());
if (signDateOnly.getTime() === todayDate.getTime()) {
signMessage.textContent = '今日已签到';
signReward.innerHTML = '获得 <span style="color:var(--warning-color); font-weight:600;">' + (signInfo.earn_point || 0) + '</span> 萝卜 · 连续 ' + (signInfo.continuous_days || 0) + ' 天';
signBtn.textContent = '已签到';
signBtn.disabled = true;
} else {
signMessage.textContent = '今天还没有签到哦！';
signReward.textContent = '点击签到，写下今日寄语';
signBtn.textContent = '立即签到';
signBtn.disabled = false;
}
} else {
signMessage.textContent = '今天还没有签到哦！';
signReward.textContent = '点击签到，写下今日寄语';
signBtn.textContent = '立即签到';
signBtn.disabled = false;
}

// ===== 签到排行榜 =====
const openSignRankBtn = el.querySelector('#openSignRankBtn');
if (openSignRankBtn) {
openSignRankBtn.addEventListener('click', () => {
loadSignRank();
el.querySelector('#signRankModal').classList.add('show');
});
}
const closeSignRankModal = el.querySelector('#closeSignRankModal');
if (closeSignRankModal) {
closeSignRankModal.addEventListener('click', () => el.querySelector('#signRankModal').classList.remove('show'));
}

// ===== 萝卜相关模态框 =====
const carrotModal = el.querySelector('#carrotModal');
const closeCarrotModal = el.querySelector('#closeCarrotModal');
const carrotTabs = carrotModal?.querySelectorAll('.modal-tab');
function openCarrotModal(tab = 'history') {
carrotModal?.classList.add('show');
switchCarrotTab(tab);
if (tab === 'history') loadCarrotHistory(true);
else loadCarrotRank();
}
function switchCarrotTab(tab) {
carrotTabs?.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
el.querySelector('#carrotHistoryTab').style.display = tab === 'history' ? 'block' : 'none';
el.querySelector('#carrotRankTab').style.display = tab === 'rank' ? 'block' : 'none';
if (tab === 'rank') {
const rankList = el.querySelector('#carrotRankList');
if (rankList && rankList.children.length === 0) {
loadCarrotRank();
}
}
}
if (carrotTabs) {
carrotTabs.forEach(tab => {
tab.addEventListener('click', () => switchCarrotTab(tab.dataset.tab));
});
}
if (closeCarrotModal) {
closeCarrotModal.addEventListener('click', () => carrotModal?.classList.remove('show'));
}

// ===== 上传排行榜模态框 =====
const openUploadRankModal = () => {
loadUploadRank();
el.querySelector('#uploadRankModal').classList.add('show');
};
const closeUploadRankModal = el.querySelector('#closeUploadRankModal');
if (closeUploadRankModal) {
closeUploadRankModal.addEventListener('click', () => el.querySelector('#uploadRankModal').classList.remove('show'));
}

// ===== 邀请相关模态框 =====
const inviteModal = el.querySelector('#inviteModal');
const closeInviteModal = el.querySelector('#closeInviteModal');
const inviteTabs = inviteModal?.querySelectorAll('.modal-tab');
function openInviteModal(tab = 'info') {
inviteModal?.classList.add('show');
switchInviteTab(tab);
if (tab === 'info') loadInviteInfo();
else loadInviteHistory(true);
}
function switchInviteTab(tab) {
inviteTabs?.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
el.querySelector('#inviteInfoTab').style.display = tab === 'info' ? 'block' : 'none';
el.querySelector('#inviteHistoryTab').style.display = tab === 'history' ? 'block' : 'none';
if (tab === 'history') {
const historyList = el.querySelector('#inviteHistoryList');
if (historyList && historyList.children.length === 0) {
loadInviteHistory(true);
}
}
}
if (inviteTabs) {
inviteTabs.forEach(tab => {
tab.addEventListener('click', () => switchInviteTab(tab.dataset.tab));
});
}
if (closeInviteModal) {
closeInviteModal.addEventListener('click', () => inviteModal?.classList.remove('show'));
}

// ===== 红包工具模态框 =====
const redPacketToolModal = el.querySelector('#redPacketToolModal');
const closeRedPacketToolModal = el.querySelector('#closeRedPacketToolModal');
const redPacketTabs = redPacketToolModal?.querySelectorAll('.modal-tab');
function openRedPacketToolModal(tab = 'send') {
redPacketToolModal?.classList.add('show');
redPacketTabs?.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
el.querySelector('#redPacketSendTab').style.display = tab === 'send' ? 'block' : 'none';
el.querySelector('#redPacketReceiveTab').style.display = tab === 'receive' ? 'block' : 'none';
}
if (redPacketTabs) {
redPacketTabs.forEach(tab => {
tab.addEventListener('click', () => {
redPacketTabs.forEach(t => t.classList.remove('active'));
tab.classList.add('active');
el.querySelector('#redPacketSendTab').style.display = tab.dataset.tab === 'send' ? 'block' : 'none';
el.querySelector('#redPacketReceiveTab').style.display = tab.dataset.tab === 'receive' ? 'block' : 'none';
});
});
}
if (closeRedPacketToolModal) {
closeRedPacketToolModal.addEventListener('click', () => redPacketToolModal?.classList.remove('show'));
}

// ✅ 修复红包工具类型按钮切换
const typeBtns = redPacketToolModal?.querySelectorAll('.type-btn');
const passwordGroup = el.querySelector('#rpPasswordGroup');
function toggleRedPacketFields(type) {
if (type === 'password') {
if (passwordGroup) passwordGroup.style.display = 'block';
} else {
if (passwordGroup) passwordGroup.style.display = 'none';
}
}
if (typeBtns) {
typeBtns.forEach(btn => {
btn.addEventListener('click', () => {
typeBtns.forEach(b => b.classList.remove('active'));
btn.classList.add('active');
toggleRedPacketFields(btn.dataset.type);
});
});
}

// 🔧 修复：补充红包工具模态框的按钮事件绑定
const rpCancelBtn = el.querySelector('#rpCancel');
const rpConfirmBtn = el.querySelector('#rpConfirm');
if (rpCancelBtn) {
rpCancelBtn.addEventListener('click', () => redPacketToolModal?.classList.remove('show'));
}

// ==================== 红包上传逻辑（重构版：音频互动优化）====================
const rpUploadBtn = el.querySelector('#rpUploadBtn');
const rpFileInput = el.querySelector('#rpFileInput');
const rpDeleteBtn = el.querySelector('#rpDeleteBtn');
const rpUploadWrapper = el.querySelector('#rpUploadWrapper');
const rpPreviewBox = el.querySelector('#rpPreviewBox');
const rpPreviewContent = el.querySelector('#rpPreviewContent');
const rpFileId = el.querySelector('#rpFileId');
const rpFileType = el.querySelector('#rpFileType');
const rpFileUrl = el.querySelector('#rpFileUrl');
const coverUploadArea = el.querySelector('#coverUploadArea');
const coverUrlArea = el.querySelector('#coverUrlArea');
const coverTabs = el.querySelectorAll('.cover-tab');

if (rpUploadBtn && rpFileInput) {
    rpUploadBtn.addEventListener('click', () => rpFileInput.click());
    rpFileInput.addEventListener('change', async () => {
        if (rpFileInput.files.length === 0) return;
        const file = rpFileInput.files[0];

        // 1. 禁用发红包按钮并显示加载动画
        if (rpConfirmBtn) {
            rpConfirmBtn.disabled = true;
            rpConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';
        }

        try {
            // 2. 读取预览
            const reader = new FileReader();
            reader.onload = (e) => {
                rpPreviewContent.innerHTML = ''; // 清空旧内容
                if (file.type.startsWith('image/')) {
                    // 图片
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    rpPreviewContent.appendChild(img);
                } else if (file.type.startsWith('audio/')) {
                    // 音频
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = e.target.result;
                    rpPreviewContent.appendChild(audio);
                }
                // 切换显示
                rpUploadBtn.style.display = 'none';
                rpPreviewBox.style.display = 'block';
            };
            reader.readAsDataURL(file);

            // 3. 获取用户 ID 并上传
            const emosId = window.currentUser?.user_id || '';
            if (!emosId) {
                throw new Error('无法获取用户 ID，请重新登录');
            }

            const { url, type } = await uploadToTemporaryEmos(file, emosId);

            // 4. 上传成功：自动填充外链并切换到外链模式
            if (rpFileUrl) rpFileUrl.value = url;
            if (rpFileType) rpFileType.value = type;
            if (coverUploadArea && coverUrlArea) {
                coverUploadArea.style.display = 'none';
                coverUrlArea.style.display = 'block';
                coverTabs.forEach(t => t.classList.remove('active'));
                const urlTab = el.querySelector('[data-cover-type="url"]');
                if (urlTab) urlTab.classList.add('active');
            }

            showToast(\`\${type === 'audio' ? '音频' : '图片'}上传成功\`);
        } catch (err) {
            showToast('上传失败：' + err.message);
            // 失败回滚 UI
            rpPreviewContent.innerHTML = '';
            rpPreviewBox.style.display = 'none';
            rpUploadBtn.style.display = 'flex';
        } finally {
            // 5. 恢复按钮状态
            if (rpConfirmBtn) {
                rpConfirmBtn.disabled = false;
                rpConfirmBtn.textContent = '发红包';
            }
        }
    });
}

if (rpDeleteBtn) {
    rpDeleteBtn.addEventListener('click', () => {
        // 清理
        rpPreviewContent.innerHTML = '';
        rpPreviewBox.style.display = 'none';
        rpUploadBtn.style.display = 'flex';
        rpFileInput.value = '';
        if (rpFileId) rpFileId.value = '';
        if (rpFileType) rpFileType.value = '';
        if (rpFileUrl) rpFileUrl.value = '';
    });
}

// 红包封面标签页切换
if (coverTabs) {
    coverTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            coverTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.coverType === 'upload') {
                if (coverUploadArea) coverUploadArea.style.display = 'block';
                if (coverUrlArea) coverUrlArea.style.display = 'none';
            } else {
                if (coverUploadArea) coverUploadArea.style.display = 'none';
                if (coverUrlArea) coverUrlArea.style.display = 'block';
            }
        });
    });
}

// ==================== 红包提交逻辑 ====================
if (rpConfirmBtn) {
rpConfirmBtn.addEventListener('click', async () => {
const typeBtn = redPacketToolModal.querySelector('.type-btn.active');
const type = typeBtn ? typeBtn.dataset.type : 'fixed';
const carrot = parseInt(el.querySelector('#rpCarrot').value);
const number = parseInt(el.querySelector('#rpNumber').value);
const blessing = el.querySelector('#rpBlessing').value.trim();
const rpError = el.querySelector('#rpError');
if (rpError) rpError.textContent = '';

if (isNaN(carrot) || carrot < 1 || carrot > 60000) {
if (rpError) rpError.textContent = '总金额必须为 1-60000';
return;
}
if (isNaN(number) || number < 1 || number > 10000) {
if (rpError) rpError.textContent = '红包个数必须为 1-10000';
return;
}
if (!blessing) {
if (rpError) rpError.textContent = '祝福语不能为空';
return;
}

let text = null;
if (type === 'password') {
text = el.querySelector('#rpPassword').value.trim();
if (!text) {
if (rpError) rpError.textContent = '口令文本不能为空';
return;
}
}

// 获取封面信息（优先使用外链模式）
const activeTab = redPacketToolModal.querySelector('.cover-tab.active');
const coverType = activeTab ? activeTab.dataset.coverType : 'upload';
let file_id = null, file_type = null, file_url = null;

function getFileTypeFromUrl(url) {
const ext = url.split('.').pop().toLowerCase();
if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) return 'audio';
return null;
}

if (coverType === 'url') {
file_url = el.querySelector('#rpFileUrl')?.value.trim() || null;
if (file_url) {
if (!file_url.startsWith('http://') && !file_url.startsWith('https://')) {
if (rpError) rpError.textContent = '外链必须以 http:// 或 https:// 开头';
return;
}
file_type = getFileTypeFromUrl(file_url);
if (!file_type) {
if (rpError) rpError.textContent = '无法识别外链文件类型，请使用图片或音频链接';
return;
}
}
} else {
file_id = el.querySelector('#rpFileId')?.value.trim() || null;
file_type = el.querySelector('#rpFileType')?.value.trim() || null;
if (file_id && !file_type) {
if (rpError) rpError.textContent = '上传文件类型缺失，请重新上传';
return;
}
}

rpConfirmBtn.disabled = true;
rpConfirmBtn.textContent = '发送中...';

try {
const res = await window.fetchWithAuth('/api/redPacket/create', {
method: 'POST',
body: JSON.stringify({
type,
carrot,
number,
blessing,
text,
file_id,
file_type,
file_url
})
});
if (!res) return;
if (!res.ok) {
const errData = await res.json().catch(() => ({}));
throw new Error(errData.message || '发红包失败');
}
showToast('红包已发出！');
redPacketToolModal.classList.remove('show');
if (window.updateUserInfo) await window.updateUserInfo();
} catch (err) {
if (rpError) rpError.textContent = err.message;
showToast(err.message);
} finally {
rpConfirmBtn.disabled = false;
rpConfirmBtn.textContent = '发红包';
}
});
}

// ===== 抽奖工具模态框 =====
const lotteryModal = el.querySelector('#lotteryModal');
const closeLotteryModal = el.querySelector('#closeLotteryModal');
const lotteryTabs = lotteryModal?.querySelectorAll('.modal-tab');
function openLotteryModal(tab = 'create') {
lotteryModal?.classList.add('show');
lotteryTabs?.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
el.querySelector('#lotteryCreateTab').style.display = tab === 'create' ? 'block' : 'none';
el.querySelector('#lotteryWinTab').style.display = tab === 'win' ? 'block' : 'none';
}
if (lotteryTabs) {
lotteryTabs.forEach(tab => {
tab.addEventListener('click', () => {
lotteryTabs.forEach(t => t.classList.remove('active'));
tab.classList.add('active');
el.querySelector('#lotteryCreateTab').style.display = tab.dataset.tab === 'create' ? 'block' : 'none';
el.querySelector('#lotteryWinTab').style.display = tab.dataset.tab === 'win' ? 'block' : 'none';
});
});
}
if (closeLotteryModal) {
closeLotteryModal.addEventListener('click', () => lotteryModal?.classList.remove('show'));
}
const lotteryCancel = el.querySelector('#lotteryCancel');
if (lotteryCancel) {
lotteryCancel.addEventListener('click', () => {
if (lotteryModal) lotteryModal.classList.remove('show');
});
}

// ===== 投票工具模态框 =====
const voteModal = el.querySelector('#voteModal');
const closeVoteModal = el.querySelector('#closeVoteModal');
const voteCancel = el.querySelector('#voteCancel');
if (closeVoteModal) {
closeVoteModal.addEventListener('click', () => voteModal?.classList.remove('show'));
}
if (voteCancel) {
voteCancel.addEventListener('click', () => {
if (voteModal) voteModal.classList.remove('show');
});
}
if (voteModal) {
voteModal.addEventListener('click', (e) => {
if (e.target === voteModal) voteModal.classList.remove('show');
});
}

// ===== 快捷操作按钮 =====
const dashTransferTrigger = el.querySelector('#dashTransferTrigger');
if (dashTransferTrigger) {
dashTransferTrigger.addEventListener('click', () => {
if (carrot > 200) el.querySelector('#transferModal')?.classList.add('show');
else showToast('胡萝卜不足 200，无法转赠');
});
}
const openInviteUserModalBtn = el.querySelector('#openInviteUserModalBtn');
if (openInviteUserModalBtn) {
openInviteUserModalBtn.addEventListener('click', () => {
const inviteUserModal = el.querySelector('#inviteUserModal');
if (inviteUserModal) inviteUserModal.classList.add('show');
});
}
const openRedPacketModalBtn = el.querySelector('#openRedPacketModalBtn');
if (openRedPacketModalBtn) {
openRedPacketModalBtn.addEventListener('click', () => openRedPacketToolModal('send'));
}
const openLotteryModalBtn = el.querySelector('#openLotteryModalBtn');
if (openLotteryModalBtn) {
openLotteryModalBtn.addEventListener('click', () => openLotteryModal('create'));
}
const openVoteModalBtn = el.querySelector('#openVoteModalBtn');
if (openVoteModalBtn) {
openVoteModalBtn.addEventListener('click', () => voteModal?.classList.add('show'));
}

// ===== 邀请用户模态框事件 =====
const inviteUserModal = el.querySelector('#inviteUserModal');
const closeInviteUserModal = el.querySelector('#closeInviteUserModal');
const inviteUserCancel = el.querySelector('#inviteUserCancel');
const inviteUserSubmit = el.querySelector('#inviteUserSubmit');
const inviteUserUserId = el.querySelector('#inviteUserUserId');
const inviteUserError = el.querySelector('#inviteUserError');
if (closeInviteUserModal) {
closeInviteUserModal.addEventListener('click', () => inviteUserModal?.classList.remove('show'));
}
if (inviteUserCancel) {
inviteUserCancel.addEventListener('click', () => inviteUserModal?.classList.remove('show'));
}
if (inviteUserModal) {
inviteUserModal.addEventListener('click', (e) => {
if (e.target === inviteUserModal) inviteUserModal.classList.remove('show');
});
}
if (inviteUserSubmit) {
inviteUserSubmit.addEventListener('click', async () => {
const userId = inviteUserUserId?.value.trim();
if (!userId || userId.length !== 10) { if (inviteUserError) inviteUserError.textContent = '请输入正确的 10 位用户 ID'; return; }
inviteUserSubmit.disabled = true;
inviteUserSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
const res = await window.fetchWithAuth('/api/invite', {
method: 'POST',
body: JSON.stringify({ invite_user_id: userId })
});
if (!res) return;
const data = await res.json();
if (!res.ok) throw new Error(data.message || data.error || '邀请失败');
showToast('邀请成功！剩余名额：' + data.invite_remaining);
if (inviteUserUserId) inviteUserUserId.value = '';
inviteUserModal?.classList.remove('show');
loadInviteInfo();
loadInviteHistory(true);
} catch (err) {
if (inviteUserError) inviteUserError.textContent = err.message;
showToast(err.message);
} finally {
inviteUserSubmit.disabled = false;
inviteUserSubmit.innerHTML = '邀请';
}
});
}

// ===== 模态框关闭通用逻辑 =====
el.querySelectorAll('.modal-overlay').forEach(modal => {
modal.addEventListener('click', (e) => {
if (e.target === modal) modal.classList.remove('show');
});
});

// ===== 签到模态框 =====
const signModal = el.querySelector('#signModal');
const signModalClose = el.querySelector('#signModalClose');
const signCancel = el.querySelector('#signCancel');
const signSubmit = el.querySelector('#signSubmit');
const signContent = el.querySelector('#signContent');
const signError = el.querySelector('#signError');
function openSignModal() { signContent.value = ''; signError.textContent = ''; signModal?.classList.add('show'); }
function closeSignModal() { signModal?.classList.remove('show'); }
signBtn?.addEventListener('click', () => { if (!signBtn.disabled) openSignModal(); });
signModalClose?.addEventListener('click', closeSignModal);
signCancel?.addEventListener('click', closeSignModal);
signModal?.addEventListener('click', (e) => { if (e.target === signModal) closeSignModal(); });
signSubmit?.addEventListener('click', async () => {
const content = signContent?.value.trim();
let url = '/api/user/sign';
if (content) url += '?content=' + encodeURIComponent(content);
signSubmit.disabled = true;
signSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
const res = await window.fetchWithAuth(url, { method: 'PUT' });
if (!res) return;
const data = await res.json();
if (!res.ok) throw new Error(data.message || data.error || '签到失败');
if (window.updateUserInfo) await window.updateUserInfo();
const oldCarrot = parseInt(carrotSpan?.dataset.original) || 0;
const newCarrot = oldCarrot + (data.earn_point || 0);
if (carrotSpan) {
carrotSpan.dataset.original = newCarrot;
carrotSpan.textContent = newCarrot;
}
signMessage.textContent = '签到成功！';
signReward.innerHTML = '获得 <span style="color:var(--warning-color); font-weight:600;">' + (data.earn_point || 0) + '</span> 萝卜 · 连续 ' + data.continuous_days + ' 天';
signBtn.textContent = '已签到';
signBtn.disabled = true;
closeSignModal();
showToast('签到成功！获得 ' + (data.earn_point || 0) + ' 萝卜，连续 ' + data.continuous_days + ' 天');
} catch (err) {
if (signError) signError.textContent = err.message;
showToast(err.message);
} finally {
signSubmit.disabled = false;
signSubmit.innerHTML = '签到';
}
});

// ===== 转赠萝卜 =====
const transferModal = el.querySelector('#transferModal');
const transferCancel = el.querySelector('#transferCancel');
const transferSubmit = el.querySelector('#transferSubmit');
const transferUserId = el.querySelector('#transferUserId');
const transferCarrot = el.querySelector('#transferCarrot');
const transferError = el.querySelector('#transferError');
const closeTransferModal = el.querySelector('#closeTransferModal');
function closeTransferModalFunc() {
if (transferModal) transferModal.classList.remove('show');
if (transferError) transferError.textContent = '';
if (transferUserId) transferUserId.value = '';
if (transferCarrot) transferCarrot.value = '';
}
if (closeTransferModal) {
closeTransferModal.addEventListener('click', closeTransferModalFunc);
}
if (transferCancel) {
transferCancel.addEventListener('click', closeTransferModalFunc);
}
if (transferModal) {
transferModal.addEventListener('click', (e) => {
if (e.target === transferModal) closeTransferModalFunc();
});
}
if (transferSubmit) {
transferSubmit.addEventListener('click', async () => {
const userId = transferUserId?.value.trim();
const amount = parseInt(transferCarrot?.value);
if (!userId || userId.length !== 10) {
if (transferError) transferError.textContent = '请输入正确的 10 位用户 ID';
return;
}
if (!amount || amount < 2 || amount > 6000) {
if (transferError) transferError.textContent = '转赠数量必须为 2-6000';
return;
}
transferSubmit.disabled = true;
transferSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
const res = await window.fetchWithAuth('/api/carrot/transfer', {
method: 'PUT',
body: JSON.stringify({ user_id: userId, carrot: amount })
});
if (!res) return;
const data = await res.json();
const carrotSpan = el.querySelector('#carrotValue');
if (carrotSpan) {
carrotSpan.dataset.original = data.carrot;
carrotSpan.textContent = data.carrot;
}
showToast('转赠成功');
closeTransferModalFunc();
} catch (err) {
if (transferError) transferError.textContent = err.message;
showToast(err.message);
} finally {
transferSubmit.disabled = false;
transferSubmit.innerHTML = '确认转赠';
}
});
}

// ===== 红包领取记录 =====
const loadReceiveRecordBtn = el.querySelector('#loadReceiveRecordBtn');
const redPacketIdInput = el.querySelector('#redPacketIdInput');
loadReceiveRecordBtn?.addEventListener('click', async () => {
const rpId = redPacketIdInput?.value.trim();
if (!rpId) { showToast('请输入红包 ID'); return; }
try {
const res = await window.fetchWithAuth('/api/redPacket/receive?red_packet_id=' + encodeURIComponent(rpId));
if (!res) return;
const data = await res.json();
renderReceiveRecords(data.items || []);
} catch (err) {
showToast(err.message);
}
});
function renderReceiveRecords(items) {
const list = el.querySelector('#receiveRecordList');
const empty = el.querySelector('#receiveRecordEmpty');
if (!list) return;
if (!items || items.length === 0) {
if (empty) empty.style.display = 'block';
list.innerHTML = '';
return;
}
if (empty) empty.style.display = 'none';
let html = '';
items.forEach(item => {
const avatar = item.avatar ? '<img src="' + escapeHtml(item.avatar) + '">' : '<i class="fas fa-user"></i>';
const time = new Date(item.receive_at).toLocaleString('zh-CN');
html += \`
<div class="record-item">
<div class="record-left">
<div class="rank-avatar">\${avatar}</div>
<div class="record-info">
<div class="record-title">\${escapeHtml(item.username)}</div>
<div class="record-time">\${time}</div>
</div>
</div>
<div class="record-right">
<div class="record-amount earn">+\${item.carrot}<i class="fas fa-carrot" style="font-size:0.7rem;margin-left:2px;"></i></div>
</div>
</div>\`;
});
list.innerHTML = html;
}

// ===== 抽奖工具 - 添加奖品 =====
let prizeCount = 0;
const addPrizeBtn = el.querySelector('#addPrizeBtn');
const prizesContainer = el.querySelector('#prizesContainer');
const prizeCountEl = el.querySelector('#prizeCount');
function addPrizeRow() {
if (prizeCount >= 20) {
showToast('最多添加 20 个奖品');
return;
}
prizeCount++;
if (prizeCountEl) prizeCountEl.textContent = \`(\${prizeCount}/20)\`;
const row = document.createElement('div');
row.className = 'prize-row';
row.innerHTML = \`
<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem;">
<span class="prize-index-badge">
<i class="fas fa-gift"></i> 奖品 \${prizeCount}
</span>
<button class="remove-prize-btn" title="删除奖品">
<i class="fas fa-times"></i>
</button>
</div>
<div class="prize-header">
<input type="text" class="modal-input prize-name" placeholder="奖品名称（50 字以内）" maxlength="50">
<input type="number" class="modal-input prize-number" placeholder="数量" min="1" max="100" style="width: 100px;">
</div>
<input type="text" class="modal-input prize-desc" placeholder="奖品简介（200 字以内，可选）" maxlength="200">
<div class="form-group" style="margin: 0;">
<label class="prize-bodys-label">
<i class="fas fa-key"></i> 自动发奖内容（每行一个，数量需与奖品数量一致）
</label>
<textarea class="modal-input prize-bodys" placeholder="例如：&#10;key-abc123&#10;key-xyz789&#10;&#10;提示：每行一个发奖内容，行数必须与奖品数量相同" rows="3"></textarea>
</div>
\`;
row.querySelector('.remove-prize-btn').addEventListener('click', () => {
row.remove();
prizeCount--;
if (prizeCountEl) prizeCountEl.textContent = \`(\${prizeCount}/20)\`;
document.querySelectorAll('.prize-row').forEach((r, idx) => {
const badge = r.querySelector('.prize-index-badge');
if (badge) badge.innerHTML = \`<i class="fas fa-gift"></i> 奖品 \${idx + 1}\`;
});
});
prizesContainer?.appendChild(row);
}
addPrizeBtn?.addEventListener('click', addPrizeRow);

// ===== 抽奖工具 - 创建抽奖 =====
const lotterySubmit = el.querySelector('#lotterySubmit');
const lotteryError = el.querySelector('#lotteryError');
lotterySubmit?.addEventListener('click', async () => {
const name = el.querySelector('#lotteryName')?.value.trim();
const description = el.querySelector('#lotteryDesc')?.value.trim() || null;
const timeStart = el.querySelector('#lotteryTimeStart')?.value;
const timeEnd = el.querySelector('#lotteryTimeEnd')?.value;
const amount = parseInt(el.querySelector('#lotteryAmount')?.value) || 1;
const number = parseInt(el.querySelector('#lotteryNumber')?.value) || 0;
const ruleCarrot = parseInt(el.querySelector('#lotteryRuleCarrot')?.value) || 0;
const ruleSign = parseInt(el.querySelector('#lotteryRuleSign')?.value) || 0;
if (!name) { if (lotteryError) lotteryError.textContent = '请输入抽奖名称'; return; }
if (!timeEnd) { if (lotteryError) lotteryError.textContent = '请选择结束时间'; return; }
const prizes = [];
el.querySelectorAll('.prize-row').forEach(row => {
const pName = row.querySelector('.prize-name')?.value.trim();
const pDesc = row.querySelector('.prize-desc')?.value.trim() || null;
const pNumber = parseInt(row.querySelector('.prize-number')?.value) || 1;
const pBodysRaw = row.querySelector('.prize-bodys')?.value.trim() || '';
const pBodys = pBodysRaw.split('\\n')
.map(s => s.trim())
.filter(s => s.length > 0);
if (pName) {
if (pBodys.length > 0 && pBodys.length !== pNumber) {
showToast(\`"\${pName}" 的发奖内容数量 (\${pBodys.length}) 与奖品数量 (\${pNumber}) 不匹配\`);
throw new Error('bodys 数量不匹配');
}
prizes.push({
name: pName,
description: pDesc,
number: pNumber,
bodys: pBodys.length > 0 ? pBodys : []
});
}
});
if (prizes.length === 0) { if (lotteryError) lotteryError.textContent = '请至少添加一个奖品'; return; }
lotterySubmit.disabled = true;
lotterySubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
const res = await window.fetchWithAuth('/api/lottery/create', {
method: 'POST',
body: JSON.stringify({
name, description, time_start: timeStart, time_end: timeEnd,
amount, number, rule_carrot: ruleCarrot, rule_sign: ruleSign, prizes
})
});
if (!res) return;
const data = await res.json();
if (!res.ok) throw new Error(data.message || data.error || '创建失败');
showToast('抽奖创建成功！ID: ' + data.lottery_id);
el.querySelector('#lotteryModal')?.classList.remove('show');
const lotteryIdInput = el.querySelector('#lotteryIdInput');
if (lotteryIdInput) lotteryIdInput.value = data.lottery_id;
} catch (err) {
if (lotteryError) lotteryError.textContent = err.message;
showToast(err.message);
} finally {
lotterySubmit.disabled = false;
lotterySubmit.innerHTML = '创建抽奖';
}
});

// ===== 抽奖工具 - 查询中奖/取消 =====
const loadWinListBtn = el.querySelector('#loadWinListBtn');
const cancelLotteryBtn = el.querySelector('#cancelLotteryBtn');
const lotteryIdInput = el.querySelector('#lotteryIdInput');
loadWinListBtn?.addEventListener('click', async () => {
const lotteryId = lotteryIdInput?.value.trim();
if (!lotteryId) { showToast('请输入抽奖 ID'); return; }
try {
const res = await window.fetchWithAuth('/api/lottery/win?lottery_id=' + encodeURIComponent(lotteryId));
if (!res) return;
const data = await res.json();
renderWinList(data);
} catch (err) {
showToast(err.message);
}
});
cancelLotteryBtn?.addEventListener('click', async () => {
const lotteryId = lotteryIdInput?.value.trim();
if (!lotteryId) return;
if (!confirm('确定要取消该抽奖吗？已参与的萝卜将退还。')) return;
try {
const res = await window.fetchWithAuth('/api/lottery/cancel?lottery_id=' + encodeURIComponent(lotteryId), { method: 'PUT' });
if (!res) return;
const data = await res.json();
if (data.is_success) {
showToast('抽奖已取消');
cancelLotteryBtn.style.display = 'none';
} else {
showToast('取消失败');
}
} catch (err) {
showToast(err.message);
}
});
function renderWinList(data) {
const info = el.querySelector('#lotteryInfo');
const nameEl = el.querySelector('#winLotteryName');
const descEl = el.querySelector('#winLotteryDesc');
const timeEl = el.querySelector('#winTimeRange');
const amountEl = el.querySelector('#winAmount');
const list = el.querySelector('#winList');
const empty = el.querySelector('#winListEmpty');
const cancelBtn = el.querySelector('#cancelLotteryBtn');
if (info && nameEl && descEl && timeEl && amountEl) {
info.style.display = 'block';
nameEl.textContent = data.lottery_name || '';
descEl.textContent = data.lottery_description || '暂无简介';
timeEl.textContent = \`\${data.time_start?.slice(0,16) || '-'} ~ \${data.time_end?.slice(0,16) || '-'}\`;
amountEl.textContent = data.amount || 0;
}
if (cancelBtn) cancelBtn.style.display = 'block';
if (!list) return;
const users = data.users || [];
if (users.length === 0) {
if (empty) empty.style.display = 'block';
list.innerHTML = '';
return;
}
if (empty) empty.style.display = 'none';
let html = '';
users.forEach((u, idx) => {
const avatar = u.user_avatar ? '<img src="' + escapeHtml(u.user_avatar) + '">' : '<i class="fas fa-user"></i>';
const joinTime = new Date(u.join_at).toLocaleString('zh-CN');
const prizeBodyHtml = u.prize_body
? '<div class="prize-body-display"><i class="fas fa-key"></i>' + escapeHtml(u.prize_body) + '</div>'
: '';
html += \`
<div class="record-item">
<div class="record-left">
<div class="rank-avatar">\${avatar}</div>
<div class="record-info">
<div class="record-title">\${escapeHtml(u.user_username)} · \${escapeHtml(u.prize_name)}</div>
<div class="record-time">第\${u.join_index}位参与 · \${joinTime}</div>
\${u.prize_description ? '<div class="record-desc">' + escapeHtml(u.prize_description) + '</div>' : ''}
\${prizeBodyHtml}
</div>
</div>
</div>\`;
});
list.innerHTML = html;
}

// ===== 投票工具 - 添加选项 =====
let optionCount = 2;
const addOptionBtn = el.querySelector('#addOptionBtn');
const optionsContainer = el.querySelector('#optionsContainer');
function addOptionRow() {
if (optionCount >= 12) { showToast('最多 12 个选项'); return; }
optionCount++;
const row = document.createElement('div');
row.className = 'option-row';
row.innerHTML = \`
<input type="text" class="modal-input option-input" placeholder="选项 \${optionCount}" maxlength="50">
<button class="btn-icon remove-option-btn"><i class="fas fa-times"></i></button>
\`;
row.querySelector('.remove-option-btn').addEventListener('click', () => {
if (optionCount <= 2) { showToast('至少保留 2 个选项'); return; }
row.remove();
optionCount--;
});
optionsContainer?.appendChild(row);
}
addOptionBtn?.addEventListener('click', addOptionRow);

// ===== 投票工具 - 创建投票 =====
const voteSubmit = el.querySelector('#voteSubmit');
const voteError = el.querySelector('#voteError');
voteSubmit?.addEventListener('click', async () => {
const question = el.querySelector('#voteQuestion')?.value.trim();
const seconds = parseInt(el.querySelector('#voteSeconds')?.value) || 3600;
if (!question) { if (voteError) voteError.textContent = '请输入问题'; return; }
if (seconds < 60) { if (voteError) voteError.textContent = '过期时间至少 60 秒'; return; }
const options = [];
el.querySelectorAll('.option-input').forEach(input => {
const val = input.value.trim();
if (val) options.push(val);
});
if (options.length < 2) { if (voteError) voteError.textContent = '至少 2 个选项'; return; }
if (options.length > 12) { if (voteError) voteError.textContent = '最多 12 个选项'; return; }
voteSubmit.disabled = true;
voteSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
const res = await window.fetchWithAuth('/api/telegram/vote/create', {
method: 'POST',
body: JSON.stringify({ question, options, seconds })
});
if (!res) return;
const data = await res.json();
if (!res.ok) throw new Error(data.message || data.error || '创建失败');
showToast('投票创建成功！投票 ID: ' + data.vote_id);
voteModal?.classList.remove('show');
} catch (err) {
if (voteError) voteError.textContent = err.message;
showToast(err.message);
} finally {
voteSubmit.disabled = false;
voteSubmit.innerHTML = '创建投票';
}
});
}

// ===== 数据加载函数 =====
async function loadSignRank() {
const list = el.querySelector('#signRankList');
const empty = el.querySelector('#signRankEmpty');
if (!list) return;
list.innerHTML = '<div class="apple-loading"><div class="spinner"></div></div>';
if (empty) empty.style.display = 'none';
try {
const res = await window.fetchWithAuth('/api/rank/sign');
if (!res) return;
const data = await res.json();
renderRankList(list, data, 'sign');
} catch (err) {
if (empty) { empty.textContent = '加载失败'; empty.style.display = 'block'; }
list.innerHTML = '';
}
}

async function loadCarrotHistory(reset = false) {
if (reset) {
carrotHistoryPage = 1;
carrotHistoryHasMore = true;
const list = el.querySelector('#carrotHistoryList');
const empty = el.querySelector('#carrotHistoryEmpty');
if (list) list.innerHTML = '<div class="apple-loading"><div class="spinner"></div></div>';
if (empty) empty.style.display = 'none';
}
if (!carrotHistoryHasMore) return;
const list = el.querySelector('#carrotHistoryList');
try {
const res = await window.fetchWithAuth(\`/api/carrot/history?page=\${carrotHistoryPage}&page_size=15\`);
if (!res) return;
const data = await res.json();
const items = data.items || [];
if (reset && list) list.innerHTML = '';
if (items.length === 0) {
const empty = el.querySelector('#carrotHistoryEmpty');
if (empty) empty.style.display = 'block';
return;
}
renderCarrotHistory(items);
carrotHistoryPage++;
carrotHistoryHasMore = items.length === 15;
} catch (err) {
showToast(err.message);
if (reset && list) list.innerHTML = '';
}
}

function renderCarrotHistory(items) {
const list = el.querySelector('#carrotHistoryList');
if (!list) return;
items.forEach(item => {
const iconClass = item.type === 'earn' ? 'earn' : 'cost';
const amountClass = item.type === 'earn' ? 'earn' : 'cost';
const sign = item.type === 'earn' ? '+' : '-';
const time = new Date(item.created_at).toLocaleString('zh-CN');
const expire = item.expired_at ? '· 到期:' + item.expired_at.slice(0,10) : '';
const elItem = document.createElement('div');
elItem.className = 'record-item';
elItem.innerHTML = \`
<div class="record-left">
<div class="record-icon \${iconClass}"><i class="fas \${item.type === 'earn' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div>
<div class="record-info">
<div class="record-title">\${escapeHtml(item.trigger_type_string)}</div>
<div class="record-time">\${time}\${expire}</div>
</div>
</div>
<div class="record-right">
<div class="record-amount \${amountClass}">\${sign}\${item.point}<i class="fas fa-carrot" style="font-size:0.7rem;margin-left:2px;"></i></div>
</div>
\`;
list.appendChild(elItem);
});
}

async function loadCarrotRank() {
const list = el.querySelector('#carrotRankList');
const empty = el.querySelector('#carrotRankEmpty');
if (!list) return;
list.innerHTML = '<div class="apple-loading"><div class="spinner"></div></div>';
if (empty) empty.style.display = 'none';
try {
const res = await window.fetchWithAuth('/api/rank/carrot');
if (!res) return;
const data = await res.json();
const items = Array.isArray(data) ? data : [];
renderRankList(list, items, 'carrot');
} catch (err) {
if (empty) { empty.textContent = '加载失败'; empty.style.display = 'block'; }
list.innerHTML = '';
}
}

async function loadUploadRank() {
const list = el.querySelector('#uploadRankList');
const empty = el.querySelector('#uploadRankEmpty');
if (!list) return;
list.innerHTML = '<div class="apple-loading"><div class="spinner"></div></div>';
if (empty) empty.style.display = 'none';
try {
const res = await window.fetchWithAuth('/api/rank/upload');
if (!res) return;
const data = await res.json();
renderRankList(list, data, 'upload');
} catch (err) {
if (empty) { empty.textContent = '加载失败'; empty.style.display = 'block'; }
list.innerHTML = '';
}
}

function renderRankList(container, items, type) {
if (!container) return;
if (!items || items.length === 0) {
container.innerHTML = '';
const empty = container.closest('.modal-content')?.querySelector('.no-results');
if (empty) empty.style.display = 'block';
return;
}
let html = '';
items.forEach((item, idx) => {
const rank = item.sign_index || item.index || item.rank || (idx + 1);
let rankClass = '';
if (rank === 1) rankClass = 'gold';
else if (rank === 2) rankClass = 'silver';
else if (rank === 3) rankClass = 'bronze';
const avatar = item.avatar ? '<img src="' + escapeHtml(item.avatar) + '">' : '<i class="fas fa-user"></i>';
const name = escapeHtml(item.username || item.user_username || '未知用户');
let value = '';
let desc = '';
if (type === 'sign') {
value = \`+\${item.earn_point}<i class="fas fa-carrot" style="font-size:0.7rem;margin-left:2px;"></i>\`;
desc = \`连续 \${item.continuous_days} 天\`;
if (item.sign_content) {
desc += ' · "' + escapeHtml(item.sign_content) + '"';
}
} else if (type === 'carrot') {
value = \`\${item.carrot}<i class="fas fa-carrot" style="font-size:0.7rem;margin-left:2px;"></i>\`;
} else if (type === 'upload') {
value = formatBytes(item.size || 0);
}
html += \`
<div class="apple-rank-item">
<div class="rank-index-badge \${rankClass}">\${rank}</div>
<div class="rank-avatar">\${avatar}</div>
<div class="rank-info">
<div class="rank-name">\${name}</div>
\${desc ? '<div class="rank-desc">' + desc + '</div>' : ''}
</div>
<div class="rank-value">\${value}</div>
</div>\`;
});
container.innerHTML = html;
const empty = container.closest('.modal-content')?.querySelector('.no-results');
if (empty) empty.style.display = 'none';
}

async function loadInviteInfo() {
const countEl = el.querySelector('#inviteCountValue');
const remainingEl = el.querySelector('#inviteRemainingValue');
const atEl = el.querySelector('#inviteAtValue');
const parentRow = el.querySelector('#inviteParentRow');
const parentName = el.querySelector('#inviteParentName');
try {
const res = await window.fetchWithAuth('/api/invite/info');
if (!res) return;
const data = await res.json();
if (countEl) countEl.textContent = data.invite_count || 0;
if (remainingEl) remainingEl.textContent = data.invite_remaining || 0;
if (atEl) atEl.textContent = data.invite_at ? data.invite_at.slice(0,10) : '-';
if (parentRow && parentName && data.parent?.pseudonym) {
parentRow.style.display = 'flex';
parentName.textContent = escapeHtml(data.parent.pseudonym);
} else if (parentRow) {
parentRow.style.display = 'none';
}
} catch (err) {
showToast(err.message);
}
}

async function loadInviteHistory(reset = false) {
if (reset) {
inviteHistoryPage = 1;
inviteHistoryHasMore = true;
const list = el.querySelector('#inviteHistoryList');
if (list) list.innerHTML = '';
const empty = el.querySelector('#inviteHistoryEmpty');
if (empty) empty.style.display = 'none';
const loadMore = el.querySelector('#inviteHistoryLoadMore');
if (loadMore) loadMore.style.display = 'none';
}
if (!inviteHistoryHasMore) return;
const list = el.querySelector('#inviteHistoryList');
const loadMore = el.querySelector('#inviteHistoryLoadMore');
if (!list) return;
try {
const res = await window.fetchWithAuth(\`/api/invite/history?page=\${inviteHistoryPage}&page_size=15\`);
if (!res) return;
const data = await res.json();
const items = data.items || [];
if (reset && items.length === 0) {
const empty = el.querySelector('#inviteHistoryEmpty');
if (empty) empty.style.display = 'block';
if (loadMore) loadMore.style.display = 'none';
return;
}
renderInviteHistory(items);
inviteHistoryPage++;
inviteHistoryHasMore = items.length === 15;
if (loadMore) loadMore.style.display = inviteHistoryHasMore ? 'block' : 'none';
} catch (err) {
showToast(err.message);
}
}

function renderInviteHistory(items) {
const list = el.querySelector('#inviteHistoryList');
if (!list) return;
items.forEach(item => {
const time = item.invite_at ? new Date(item.invite_at).toLocaleString('zh-CN') : '';
const elItem = document.createElement('div');
elItem.className = 'record-item';
elItem.innerHTML = \`
<div class="record-left">
<div class="record-info">
<div class="record-title">\${escapeHtml(item.username)}</div>
<div class="record-time">ID: \${escapeHtml(item.user_id)} · \${time}</div>
</div>
</div>
<button class="revoke-btn" data-user-id="\${escapeHtml(item.user_id)}">撤销</button>
\`;
elItem.querySelector('.revoke-btn').addEventListener('click', async (e) => {
e.stopPropagation();
if (!confirm('确定要撤销对该用户的邀请吗？')) return;
const userId = e.currentTarget.dataset.userId;
try {
const res = await window.fetchWithAuth('/api/invite/revoke', {
method: 'POST',
body: JSON.stringify({ user_id: userId })
});
if (!res) return;
const data = await res.json();
if (!res.ok) throw new Error(data.message || data.error || '撤销失败');
showToast('撤销成功！剩余名额：' + data.invite_remaining);
elItem.remove();
loadInviteInfo();
} catch (err) {
showToast(err.message);
}
});
list.appendChild(elItem);
});
}

// ===== 页面初始化 =====
const userData = window.currentUser;
if (!userData) {
el.innerHTML = '<div class="no-results">请刷新页面或重新登录</div>';
return { el, onShow: () => {}, onHide: () => {} };
}
const html = renderContent(userData);
el.innerHTML = html;
bindEvents(userData);

// 萝卜历史记录滚动加载
const carrotHistoryList = el.querySelector('#carrotHistoryList');
if (carrotHistoryList) {
carrotHistoryList.addEventListener('scroll', (e) => {
const target = e.target;
if (target.scrollTop + target.clientHeight >= target.scrollHeight - 30 && carrotHistoryHasMore) {
loadCarrotHistory();
}
});
}

// 邀请历史记录滚动加载
const inviteHistoryList = el.querySelector('#inviteHistoryList');
if (inviteHistoryList) {
inviteHistoryList.addEventListener('scroll', (e) => {
const target = e.target;
if (target.scrollTop + target.clientHeight >= target.scrollHeight - 30 && inviteHistoryHasMore) {
loadInviteHistory();
}
});
}

return { el, onShow: () => {}, onHide: () => {} };
}
`;

// ==================== 账户管理页面模块 ====================
const PAGE_ACCOUNT_JS = `
export default async function AccountPage() {
const el = document.createElement('div');
const escapeHtml = window.escapeHtml;
const showToast = window.showToast;
function renderContent(userData) {
if (!userData) return '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
const safeTelegramBindUrl = escapeHtml(userData.telegram_bind_url || '');
const safeIsShowEmpty = userData.is_show_empty === true;
const safeIsCanUpload = userData.is_can_upload === true;
const safeIsViewing = userData.is_viewing !== false;
const safeCarrot = userData.carrot || 0;
const safeIsCanDown = userData.is_can_down === true;
const safeTelegramUserId = escapeHtml(userData.telegram_user_id || '');
const safeIsOriginalImage = userData.is_original_image === true;
const showOriginal = safeCarrot >= 1000;
const showUploadAgreement = !safeIsCanUpload;
const showDownAgreement = !safeIsCanDown;
return \`
<div class="account-content">
<div class="content-wrapper">
<div class="info-list" style="margin-bottom: 1rem;">
<div class="info-list-item">
<div class="info-list-left">账号状态</div>
<div class="info-list-right">
<span class="status-badge \${safeIsViewing ? 'status-green' : 'status-red'}">\${safeIsViewing ? '正常' : '无权限'}</span>
</div>
</div>
\${safeIsViewing ? \`
<div class="info-list-item">
<div class="info-list-left">更改笔名</div>
<div class="info-list-right">
<button class="btn-outline" id="editPseudonymBtn">编辑</button>
</div>
</div>
\` : ''}
</div>
<div class="info-list" style="margin-bottom: 1rem;">
<div class="info-list-item">
<div class="info-list-left">显示空媒体</div>
<div class="info-list-right">
<div class="toggle-switch \${safeIsShowEmpty ? 'active' : ''}" id="showEmptyToggle"></div>
</div>
</div>
\${showOriginal ? \`
<div class="info-list-item">
<div class="info-list-left">超清原画</div>
<div class="info-list-right">
<div class="toggle-switch \${safeIsOriginalImage ? 'active' : ''}" id="originalImageToggle"></div>
</div>
</div>
\` : ''}
</div>
\${(showUploadAgreement || showDownAgreement) ? \`
<div class="info-list" style="margin-bottom: 1rem;">
\${showUploadAgreement ? \`
<div class="info-list-item">
<div class="info-list-left">上传权限</div>
<div class="info-list-right">
<button class="btn-outline" id="uploadAgreeBtn">点击阅读协议</button>
</div>
</div>
\` : ''}
\${showDownAgreement ? \`
<div class="info-list-item">
<div class="info-list-left">媒体下载权限</div>
<div class="info-list-right">
<button class="btn-outline" id="downAgreeBtn">获取权限</button>
</div>
</div>
\` : ''}
</div>
\` : ''}
<div class="info-list" style="margin-bottom: 1rem;">
<div class="info-list-item">
<div class="info-list-left">兑换片单</div>
<div class="info-list-right">
<button class="btn-outline" id="exchangeBtn">兑换</button>
</div>
</div>
</div>
<div class="info-list" style="margin-bottom: 1rem;">
<div class="info-list-item">
<div class="info-list-left">修改密码</div>
<div class="info-list-right">
<button class="btn-outline" id="changePasswordBtn">修改</button>
</div>
</div>
<div class="info-list-item">
<div class="info-list-left">重置 Token</div>
<div class="info-list-right">
<button class="btn-outline" id="resetTokenBtn">重置</button>
</div>
</div>
</div>
<div class="info-list" style="margin-bottom: 1rem;">
<div class="info-list-item">
<div class="info-list-left">Telegram</div>
<div class="info-list-right">
\${safeTelegramBindUrl ?
\`<a href="\${safeTelegramBindUrl}" target="_blank" class="telegram-link"><i class="fab fa-telegram-plane"></i> 链接账号</a>\` :
\`<span class="telegram-link disabled" id="telegramBound"><i class="fab fa-telegram-plane"></i> 已绑定 \${safeTelegramUserId ? '(' + safeTelegramUserId + ')' : ''}</span>\`
}
</div>
</div>
</div>
</div>
</div>
<!-- 笔名修改模态框 -->
<div class="modal-overlay" id="pseudonymModal">
<div class="modal-content">
<div class="modal-title">修改笔名</div>
<input type="text" class="modal-input" id="pseudonymInput" placeholder="请输入新笔名">
<div class="modal-error" id="pseudonymError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="pseudonymCancel">取消</button>
<button class="modal-btn primary" id="pseudonymSubmit">提交</button>
</div>
</div>
</div>
<!-- 设置密码模态框 -->
<div class="modal-overlay" id="setPasswordModal">
<div class="modal-content">
<div class="modal-title">设置新密码</div>
<input type="text" class="modal-input" id="newPassword" placeholder="请输入新密码（6 位数字）" maxlength="6">
<div class="modal-error" id="passwordError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="passwordCancel">取消</button>
<button class="modal-btn primary" id="passwordSubmit">提交</button>
</div>
</div>
</div>
<!-- 上传协议模态框 -->
<div class="modal-overlay" id="uploadAgreementModal">
<div class="modal-content">
<div class="modal-title">上传协议</div>
<div style="margin: 1rem 0 1.5rem 0; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;">
<p style="margin-bottom: 1rem;">• 若它承载着光明与欢笑，无惧在阳光下共赏，请归档于 emos；</p>
<p style="margin-bottom: 1rem;">• 若它涌动着本能与躁动，只属于深夜的独白，请封印于 empn。</p>
<p style="margin-bottom: 1rem;">• 秩序与混乱，仅在一念之间。</p>
<p style="margin-top: 1.5rem; padding: 0.8rem; background: var(--bg-input); border-radius: var(--radius-md); border: 0.5px solid var(--border-color); color: var(--text-tertiary);">⚠️ 因储存问题，目前视频资源上传后存在丢失风险。</p>
</div>
<div class="modal-buttons">
<button class="modal-btn" id="uploadAgreementCancel">我再想想</button>
<button class="modal-btn" id="uploadAgreementAgree">认可并同意</button>
</div>
</div>
</div>
<!-- 下载协议模态框 -->
<div class="modal-overlay" id="downAgreementModal">
<div class="modal-content">
<div class="modal-title">下载协议</div>
<div style="margin: 1rem 0 1.5rem 0; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;">
<p>• 请合理使用下载功能，勿滥用。</p>
</div>
<div class="modal-buttons">
<button class="modal-btn" id="downAgreementCancel">取消</button>
<button class="modal-btn" id="downAgreementAgree">同意并开启</button>
</div>
</div>
</div>
<style>
.account-content { width: 100%; }
.content-wrapper { width: 100%; max-width: 900px; margin: 0 auto; }
.status-badge { display: inline-block; padding: 0.2rem 0.8rem; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 500; }
.status-green { background: rgba(52, 199, 89, 0.2); color: var(--success-color); }
.status-red { background: rgba(255, 59, 48, 0.2); color: var(--danger-color); }
.telegram-link { display: inline-flex; align-items: center; gap: 8px; background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-full); padding: 0.4rem 1rem; color: var(--text-primary); text-decoration: none; transition: 0.2s; font-size: 0.85rem; }
.telegram-link:hover { background: var(--bg-hover); }
.telegram-link.disabled { opacity: 0.6; cursor: default; }
@media (max-width: 700px) {
.account-content { padding-top: 0; }
.btn-outline { padding: 0.2rem 0.8rem; font-size: 0.75rem; }
}
</style>
\`;
}
function bindEvents(userData) {
const token = localStorage.getItem('activeToken');
if (!token) return;
// 笔名修改
const editBtn = el.querySelector('#editPseudonymBtn');
const pseudonymModal = el.querySelector('#pseudonymModal');
const pseudonymCancel = el.querySelector('#pseudonymCancel');
const pseudonymSubmit = el.querySelector('#pseudonymSubmit');
const pseudonymInput = el.querySelector('#pseudonymInput');
const pseudonymError = el.querySelector('#pseudonymError');
// 开关
const showEmptyToggle = el.querySelector('#showEmptyToggle');
const originalImageToggle = el.querySelector('#originalImageToggle');
// 重置 Token
const resetTokenBtn = el.querySelector('#resetTokenBtn');
// 修改密码
const changePasswordBtn = el.querySelector('#changePasswordBtn');
const passwordModal = el.querySelector('#setPasswordModal');
const passwordCancel = el.querySelector('#passwordCancel');
const passwordSubmit = el.querySelector('#passwordSubmit');
const passwordInput = el.querySelector('#newPassword');
const passwordError = el.querySelector('#passwordError');
// 兑换片单
const exchangeBtn = el.querySelector('#exchangeBtn');
if (exchangeBtn) {
exchangeBtn.addEventListener('click', () => {
if (confirm('确定要兑换一个片单额度吗？该操作不可撤销。')) {
window.fetchWithAuth('/api/watch/slot', { method: 'POST' })
.then(res => { if (!res) return; if (!res.ok) throw new Error('兑换失败'); showToast('兑换成功'); location.reload(); })
.catch(err => showToast(err.message));
}
});
}
// 账号状态显示
const accountStatusSpan = el.querySelector('.status-badge');
const isViewing = userData.is_viewing !== false;
if (accountStatusSpan) {
accountStatusSpan.textContent = isViewing ? '正常' : '无权限';
accountStatusSpan.className = 'status-badge ' + (isViewing ? 'status-green' : 'status-red');
}
// 显示空媒体开关
if (showEmptyToggle) {
if (userData.is_show_empty) showEmptyToggle.classList.add('active');
else showEmptyToggle.classList.remove('active');
showEmptyToggle.addEventListener('click', function() {
const isActive = this.classList.contains('active');
const newState = !isActive;
if (newState) this.classList.add('active'); else this.classList.remove('active');
window.fetchWithAuth('/api/user/showEmpty', {
method: 'PUT',
body: JSON.stringify({ show_empty: newState })
}).catch(() => {
if (isActive) this.classList.add('active'); else this.classList.remove('active');
showToast('更新失败');
});
});
}
// 超清原画开关
if (originalImageToggle) {
if (userData.is_original_image) originalImageToggle.classList.add('active');
else originalImageToggle.classList.remove('active');
originalImageToggle.addEventListener('click', function() {
const isActive = this.classList.contains('active');
const newState = !isActive;
if (newState) this.classList.add('active'); else this.classList.remove('active');
window.fetchWithAuth('/api/user/originalImage', {
method: 'PUT',
body: JSON.stringify({ is_original_image: newState })
}).catch(() => {
if (isActive) this.classList.add('active'); else this.classList.remove('active');
showToast('更新失败');
});
});
}
// 上传协议
const uploadAgreeBtn = el.querySelector('#uploadAgreeBtn');
if (uploadAgreeBtn) {
const uploadModal = el.querySelector('#uploadAgreementModal');
uploadAgreeBtn.addEventListener('click', () => uploadModal.classList.add('show'));
const uploadAgreeCancel = el.querySelector('#uploadAgreementCancel');
if (uploadAgreeCancel) uploadAgreeCancel.addEventListener('click', () => uploadModal.classList.remove('show'));
uploadModal.addEventListener('click', (e) => { if (e.target === uploadModal) uploadModal.classList.remove('show'); });
const uploadAgreeAgree = el.querySelector('#uploadAgreementAgree');
if (uploadAgreeAgree) {
uploadAgreeAgree.addEventListener('click', () => {
window.fetchWithAuth('/api/user/agreeUploadAgreement', { method: 'PUT' })
.then(() => { showToast('上传权限已开启'); location.reload(); })
.catch(err => showToast(err.message));
});
}
}
// 下载协议
const downAgreeBtn = el.querySelector('#downAgreeBtn');
if (downAgreeBtn) {
const downModal = el.querySelector('#downAgreementModal');
downAgreeBtn.addEventListener('click', () => downModal.classList.add('show'));
const downAgreeCancel = el.querySelector('#downAgreementCancel');
if (downAgreeCancel) downAgreeCancel.addEventListener('click', () => downModal.classList.remove('show'));
downModal.addEventListener('click', (e) => { if (e.target === downModal) downModal.classList.remove('show'); });
const downAgreeAgree = el.querySelector('#downAgreementAgree');
if (downAgreeAgree) {
downAgreeAgree.addEventListener('click', function() {
const btn = this;
btn.disabled = true;
btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div>';
window.fetchWithAuth('/api/user/agreeDownAgreement', { method: 'PUT' })
.then(() => { showToast('下载权限已开启'); location.reload(); })
.catch(err => { showToast(err.message); btn.disabled = false; btn.innerHTML = '同意并开启'; });
});
}
}
// Telegram 解绑
const telegramBound = el.querySelector('#telegramBound');
if (telegramBound && !telegramBound.querySelector('a')) {
telegramBound.addEventListener('click', () => {
if (confirm('确定要解绑 Telegram 吗？')) {
window.fetchWithAuth('/api/user/telegram', { method: 'DELETE' })
.then(() => { showToast('解绑成功'); location.reload(); })
.catch(err => showToast(err.message));
}
});
}
// 笔名修改
if (editBtn) {
editBtn.addEventListener('click', () => {
if (pseudonymError) pseudonymError.textContent = '';
if (pseudonymInput) pseudonymInput.value = '';
if (pseudonymModal) pseudonymModal.classList.add('show');
});
}
if (pseudonymCancel) pseudonymCancel.addEventListener('click', () => pseudonymModal && pseudonymModal.classList.remove('show'));
if (pseudonymModal) pseudonymModal.addEventListener('click', (e) => { if (e.target === pseudonymModal) pseudonymModal.classList.remove('show'); });
if (pseudonymSubmit) {
pseudonymSubmit.addEventListener('click', () => {
const newName = pseudonymInput ? pseudonymInput.value.trim() : '';
if (!newName) { if (pseudonymError) pseudonymError.textContent = '笔名不能为空'; return; }
pseudonymSubmit.disabled = true;
pseudonymSubmit.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div>';
window.fetchWithAuth('/api/user/pseudonym?name=' + encodeURIComponent(newName), { method: 'PUT' })
.then(async res => {
if (!res) return;
if (!res.ok) throw new Error('请求失败');
const data = await res.json();
showToast('修改成功！新笔名：' + data.pseudonym);
if (window.updateUserInfo) { await window.updateUserInfo(); }
if (pseudonymModal) pseudonymModal.classList.remove('show');
window.currentUser.pseudonym = data.pseudonym;
const headerUsername = document.getElementById('headerUsername');
if (headerUsername) headerUsername.textContent = data.pseudonym || userData.username;
})
.catch(err => { if (pseudonymError) pseudonymError.textContent = err.message; })
.finally(() => { pseudonymSubmit.disabled = false; pseudonymSubmit.innerHTML = '提交'; });
});
}
// 重置 Token
if (resetTokenBtn) {
resetTokenBtn.addEventListener('click', () => {
if (confirm('确定要重置 Token 吗？重置后需要重新登录。')) {
window.fetchWithAuth('/api/user/resetToken', { method: 'PUT' })
.then(() => { showToast('Token 已重置，请重新登录'); localStorage.removeItem('activeToken'); localStorage.removeItem('activeUser'); window.location.href = '/login'; })
.catch(err => showToast(err.message));
}
});
}
// 修改密码
const mustOtp = userData.must_otp === true;
const isViewingFlag = userData.is_viewing !== false;
if (changePasswordBtn) {
if (!isViewingFlag) {
changePasswordBtn.addEventListener('click', () => showToast('目前无权限，请先获得观影权限'));
} else if (mustOtp) {
changePasswordBtn.addEventListener('click', () => showToast('暂时不支持修改密码，您可以使用动态密码登录'));
} else {
changePasswordBtn.addEventListener('click', () => { if (passwordModal) passwordModal.classList.add('show'); });
}
}
if (passwordSubmit) {
passwordSubmit.addEventListener('click', () => {
const newPwd = passwordInput ? passwordInput.value.trim() : '';
if (!newPwd || newPwd.length !== 6 || isNaN(newPwd)) { if (passwordError) passwordError.textContent = '请输入 6 位数字密码'; return; }
passwordSubmit.disabled = true;
passwordSubmit.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div>';
window.fetchWithAuth('/api/emya/resetPassword', {
method: 'PUT',
body: JSON.stringify({ password: newPwd })
})
.then(async res => {
if (!res) return;
if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.message || '设置失败，请稍后重试'); }
showToast('密码设置成功！');
if (passwordModal) passwordModal.classList.remove('show');
location.reload();
})
.catch(err => { if (passwordError) passwordError.textContent = err.message; })
.finally(() => { passwordSubmit.disabled = false; passwordSubmit.innerHTML = '提交'; });
});
}
if (passwordCancel) passwordCancel.addEventListener('click', () => passwordModal && passwordModal.classList.remove('show'));
if (passwordModal) passwordModal.addEventListener('click', (e) => { if (e.target === passwordModal) passwordModal.classList.remove('show'); });
}
let userData = window.currentUser;
if (!userData) {
return new Promise((resolve) => {
const checkUser = setInterval(() => {
if (window.currentUser) {
clearInterval(checkUser);
userData = window.currentUser;
const html = renderContent(userData);
el.innerHTML = html;
bindEvents(userData);
resolve({ el, onShow: () => {}, onHide: () => {} });
}
}, 100);
});
}
const html = renderContent(userData);
el.innerHTML = html;
bindEvents(userData);
const onShow = (pathname) => {};
const onHide = () => {};
return { el, onShow, onHide };
}
`;

// ==================== 线路管理页面模块 ====================
const PAGE_LINE_JS = `
export default async function LinePage() {
  const el = document.createElement('div');
  const escapeHtml = window.escapeHtml;
  const showToast = window.showToast;
  const copyText = window.copyText;
  const userData = window.currentUser;
  const isAdmin = userData?.roles?.includes('admin') || false;

  function renderContent() {
    return \`
<div class="line-content">
  <div class="content-wrapper">
    <div class="page-header">
      <h1 class="page-title">线路管理</h1>
      <p class="page-subtitle">浏览与管理代理线路</p>
    </div>
    <div class="filter-bar">
      <button class="filter-chip active" id="filterAll">全部线路</button>
      <button class="filter-chip" id="filterMine">我的线路</button>
      <button class="add-line-btn" id="addLineBtn" title="添加线路"><i class="fas fa-plus"></i></button>
    </div>
    <div id="loadingIndicator" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>
    <div id="lineGrid" class="card-grid" style="display: none;"></div>
    <div id="emptyState" class="no-results" style="display: none;">暂无线路数据</div>
  </div>
</div>
<!-- 添加线路模态框 -->
<div class="modal-overlay" id="addLineModal">
  <div class="modal-content">
    <div class="modal-title">
      <span>添加线路</span>
      <button class="btn-icon" id="closeAddLineModal"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-group">
      <label>线路名称</label>
      <input type="text" class="modal-input" id="lineName" placeholder="建议使用自己的 ID 或备注名" value="">
    </div>
    <div class="form-group">
      <label>线路地址</label>
      <input type="text" class="modal-input" id="lineUrl" placeholder="https:// 开头，无需尾部斜杠" value="">
    </div>
    <div class="form-group">
      <label>一句话简介</label>
      <input type="text" class="modal-input" id="lineTagline" placeholder="例如：电信优选、低延迟节点等" value="">
    </div>
    <div class="modal-error" id="addLineError"></div>
    <div class="modal-buttons">
      <button class="modal-btn" id="addLineCancel">取消</button>
      <button class="modal-btn primary" id="addLineSubmit">提交</button>
    </div>
  </div>
</div>
<style>
/* ===== 线路管理对齐样式 (严格复刻订单中心布局) ===== */
.line-content { width: 100%; min-height: 100vh; background-color: var(--bg-body); color: var(--text-primary); }

.page-header { margin: 1rem 0; padding: 0; animation: slideUpFade .6s ease-out; }
@keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
.page-title { font-size: 2.2rem; font-weight: 700; margin: 0; letter-spacing: -0.5px; line-height: 1.2; }
.page-subtitle { font-size: 1rem; color: var(--text-secondary); margin: 0; font-weight: 400; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin: 0 0 1.5rem; padding: 0; }
.filter-chip { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 40px; padding: 0.4rem 1.2rem; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.filter-chip:hover { background: var(--bg-hover); color: var(--text-primary); }
.filter-chip.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; box-shadow: 0 4px 12px rgba(0,122,255,0.3); }

.add-line-btn { background: var(--accent-color); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); margin-left: auto; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
.add-line-btn:hover { background: var(--accent-hover); transform: scale(1.05) rotate(90deg); box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4); }

/* 无结果样式 (对齐订单中心) */
.no-results { text-align: center; padding: 3rem 0; color: var(--text-secondary); font-size: 1.1rem; font-weight: 500; background: var(--bg-input); border-radius: var(--radius-xl); border: 1px dashed var(--border-color); margin: 1rem 0; animation: fadeIn .3s ease; width: auto; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* 卡片网格 */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 1.5rem; margin-top: 0; }
.line-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 0.5px solid var(--border-light);
  border-radius: 24px;
  padding: 1.5rem;
  transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  overflow: hidden;
}
.line-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; gap: 1rem; }
.line-name { font-size: 1.2rem; font-weight: 600; color: var(--text-primary); line-height: 1.3; word-break: break-word; }
.self-badge { background: rgba(48, 209, 88, 0.15); color: var(--success-color); font-size: 0.7rem; font-weight: 500; padding: 0.25rem 0.6rem; border-radius: 20px; border: 0.5px solid rgba(48, 209, 88, 0.2); white-space: nowrap; flex-shrink: 0; }
.delete-icon { color: var(--text-tertiary); font-size: 0.95rem; cursor: pointer; margin-left: 0.5rem; transition: all 0.2s ease; padding: 6px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
.delete-icon:hover { color: var(--danger-color); background: rgba(255, 69, 58, 0.1); transform: scale(1.1); }

.line-url { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem; word-break: break-all; line-height: 1.4; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: var(--bg-input); padding: 0.5rem 0.8rem; border-radius: 12px; border: 0.5px solid var(--border-light); }
.line-tagline { color: var(--warning-color); font-size: 0.9rem; margin-bottom: 0.8rem; line-height: 1.4; display: flex; align-items: center; gap: 6px; }

.line-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-tertiary); margin-top: auto; padding-top: 1rem; border-top: 0.5px solid var(--border-light); flex-wrap: wrap; gap: 0.5rem; }
.meta-item { display: flex; align-items: center; gap: 0.4rem; }
.meta-item i { font-size: 0.75rem; opacity: 0.7; }

@media (max-width: 700px) {
  .content-wrapper { padding: 0 1rem; }
  .page-header { margin: 0.8rem 0; }
  .page-title { font-size: 1.8rem; }
  .page-subtitle { font-size: 0.9rem; margin-top: 0.2rem; }
  .filter-bar { gap: 0.5rem; margin-bottom: 1rem; }
  .filter-chip { padding: 0.35rem 1rem; font-size: 0.8rem; }
  .add-line-btn { width: 40px; height: 40px; font-size: 1rem; }
  .card-grid { grid-template-columns: 1fr; gap: 1rem; }
  .line-card { padding: 1.2rem; border-radius: 20px; }
  .line-name { font-size: 1.1rem; }
  .line-url { font-size: 0.85rem; padding: 0.4rem 0.7rem; border-radius: 10px; }
  .no-results { padding: 2.5rem 0; font-size: 1rem; margin: 0.8rem 0; }
}
</style>
\`;
  }

  function bindEvents() {
    const token = localStorage.getItem('activeToken');
    if (!token) return;
    let currentUserData = window.currentUser;
    const isAdminFlag = currentUserData?.roles?.includes('admin') || false;
    const filterAll = el.querySelector('#filterAll');
    const filterMine = el.querySelector('#filterMine');
    const addLineBtn = el.querySelector('#addLineBtn');
    const addLineModal = el.querySelector('#addLineModal');
    const closeAddLineModal = el.querySelector('#closeAddLineModal');
    const addLineCancel = el.querySelector('#addLineCancel');
    const addLineSubmit = el.querySelector('#addLineSubmit');
    const lineName = el.querySelector('#lineName');
    const lineUrl = el.querySelector('#lineUrl');
    const lineTagline = el.querySelector('#lineTagline');
    const addLineError = el.querySelector('#addLineError');
    const loadingIndicator = el.querySelector('#loadingIndicator');
    const lineGrid = el.querySelector('#lineGrid');
    const emptyState = el.querySelector('#emptyState');
    let allLines = null;
    let currentFilter = 'all';

    async function loadLines(filter) {
      loadingIndicator.style.display = 'flex';
      lineGrid.style.display = 'none';
      emptyState.style.display = 'none';
      if (allLines === null) {
        try {
          const response = await window.fetchWithAuth('/api/proxy/line');
          if (!response) return;
          if (!response.ok) throw new Error('请求失败，状态码 ' + response.status);
          allLines = await response.json();
        } catch (err) {
          loadingIndicator.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-right:8px;color:var(--danger-color)"></i> 加载失败：' + escapeHtml(err.message);
          return;
        }
      }
      let filteredLines = allLines;
      if (filter === 'mine') {
        filteredLines = allLines.filter(line => line.is_self === true);
      }
      loadingIndicator.style.display = 'none';
      if (filteredLines.length === 0) {
        emptyState.style.display = 'block';
        lineGrid.style.display = 'none';
      } else {
        emptyState.style.display = 'none';
        lineGrid.style.display = 'grid';
        renderCards(filteredLines);
      }
    }

    function renderCards(lines) {
      let html = '';
      lines.forEach(function(line) {
        const showDelete = isAdminFlag || line.is_self === true;
        const selfBadge = line.is_self ? '<span class="self-badge">我的</span>' : '';
        const deleteBtnHtml = showDelete ? '<i class="fas fa-trash delete-icon" data-id="' + escapeHtml(String(line.id)) + '" title="删除"></i>' : '';
        const date = new Date(line.created_at).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
        const safeName = escapeHtml(line.name);
        const safeUrl = escapeHtml(line.url);
        const safeTagline = escapeHtml(line.tagline || '');
        
        html += '<div class="line-card" data-url="' + safeUrl + '">' +
          '<div class="card-header">' +
            '<span class="line-name">' + safeName + '</span>' +
            '<div style="display: flex; align-items: center;">' + selfBadge + deleteBtnHtml + '</div>' +
          '</div>' +
          '<div class="line-url"><i class="fas fa-link" style="margin-right:6px;opacity:0.6;"></i>' + safeUrl + '</div>' +
          (safeTagline ? '<div class="line-tagline"><i class="fas fa-quote-right"></i> ' + safeTagline + '</div>' : '') +
          '<div class="line-meta">' +
            '<div class="meta-item"><i class="fas fa-hashtag"></i> ID: ' + escapeHtml(String(line.id)) + '</div>' +
            '<div class="meta-item"><i class="far fa-clock"></i> ' + date + '</div>' +
          '</div>' +
        '</div>';
      });
      lineGrid.innerHTML = html;

      const cards = lineGrid.querySelectorAll('.line-card');
      cards.forEach(function(card) {
        card.addEventListener('click', function(e) {
          if (e.target.classList.contains('delete-icon') || e.target.closest('.delete-icon')) return;
          const url = this.dataset.url;
          if (url) copyText(url, this);
        });
      });

      const deleteIcons = lineGrid.querySelectorAll('.delete-icon');
      deleteIcons.forEach(function(icon) {
        icon.addEventListener('click', function(e) {
          e.stopPropagation();
          const id = this.dataset.id;
          if (!id) return;
          if (confirm('确定要删除该线路吗？')) {
            window.fetchWithAuth('/api/proxy/line?id=' + encodeURIComponent(id), { method: 'DELETE' })
            .then(function(response) {
              if (!response) return;
              if (!response.ok) throw new Error('删除失败，状态码 ' + response.status);
              showToast('删除成功');
              allLines = null;
              loadLines(currentFilter);
            })
            .catch(function(err) {
              showToast('删除失败：' + err.message);
            });
          }
        });
      });
    }

    if (filterAll) {
      filterAll.addEventListener('click', function() {
        filterAll.classList.add('active');
        filterMine.classList.remove('active');
        currentFilter = 'all';
        loadLines('all');
      });
    }
    if (filterMine) {
      filterMine.addEventListener('click', function() {
        filterMine.classList.add('active');
        filterAll.classList.remove('active');
        currentFilter = 'mine';
        loadLines('mine');
      });
    }
    if (addLineBtn) {
      addLineBtn.addEventListener('click', function() {
        lineName.value = '';
        lineUrl.value = '';
        lineTagline.value = '';
        addLineError.textContent = '';
        addLineModal.classList.add('show');
      });
    }
    if (closeAddLineModal) closeAddLineModal.addEventListener('click', function() { addLineModal.classList.remove('show'); });
    if (addLineCancel) addLineCancel.addEventListener('click', function() { addLineModal.classList.remove('show'); });
    if (addLineModal) addLineModal.addEventListener('click', function(e) { if (e.target === addLineModal) addLineModal.classList.remove('show'); });
    
    if (addLineSubmit) {
      addLineSubmit.addEventListener('click', function() {
        const name = lineName.value.trim();
        const url = lineUrl.value.trim();
        const tagline = lineTagline.value.trim();
        if (!name) { addLineError.textContent = '线路名称不能为空'; return; }
        if (!url) { addLineError.textContent = '线路地址不能为空'; return; }
        addLineSubmit.disabled = true;
        addLineSubmit.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div> 提交中...';
        window.fetchWithAuth('/api/proxy/line', {
          method: 'POST',
          body: JSON.stringify({ name: name, url: url, tagline: tagline })
        })
        .then(function(response) {
          if (!response) return;
          if (!response.ok) throw new Error('添加失败，状态码 ' + response.status);
          return response.json();
        })
        .then(function() {
          showToast('添加成功');
          addLineModal.classList.remove('show');
          allLines = null;
          loadLines(currentFilter);
        })
        .catch(function(err) {
          addLineError.textContent = err.message;
        })
        .finally(function() {
          addLineSubmit.disabled = false;
          addLineSubmit.innerHTML = '提交';
        });
      });
    }

    loadLines('all');
  }

  if (!userData) {
    return new Promise((resolve) => {
      const checkUser = setInterval(() => {
        if (window.currentUser) {
          clearInterval(checkUser);
          const html = renderContent();
          el.innerHTML = html;
          bindEvents();
          resolve({ el, onShow: () => {}, onHide: () => {} });
        }
      }, 100);
    });
  }
  const html = renderContent();
  el.innerHTML = html;
  bindEvents();
  const onShow = () => {};
  const onHide = () => {};
  return { el, onShow, onHide };
}
`;

// ==================== 媒体管理页面模块 ====================
const PAGE_MEDIA_JS = `
export default async function MediaPage() {
const el = document.createElement('div');
const userData = window.currentUser;
// 全局状态
let currentView = 'video'; // 'video' 或 'live'
// 影视列表状态
let videoState = {
currentPage: 1,
pageSize: 20,
totalPages: 1,
isLoading: false,
hasMore: true,
currentQuery: '',
currentType: 'title',
isSearchMode: false,
searchController: null
};
// 直播状态
let liveState = {
currentPage: 1,
pageSize: 20,
totalPages: 1,
isLoading: false,
hasMore: true,
searchQuery: '',
currentChannel: null,
mediaList: []
};
// 渲染 HTML 结构
function renderStructure() {
return \`
<div class="video-content">
<div class="content-wrapper" id="contentWrapper">
<div id="titleSwitchContainer" class="title-switch-container">
<button class="page-title" id="videoTabBtn">影视</button>
<button class="tab-btn" id="liveTabBtn">直播</button>
</div>
<div id="listView">
<div class="search-container" id="searchContainer">
<select class="search-type" id="searchType">
<option value="title">标题</option>
<option value="tmdb_id">TMDB ID</option>
</select>
<input type="text" class="search-input" id="searchInput" placeholder="搜索影视...">
<button class="search-btn" id="searchBtn"><i class="fas fa-search"></i> 搜索</button>
</div>
<div id="loadingIndicator" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>
<div id="videoGridContainer" style="display: none;">
<div class="video-grid" id="videoGrid"></div>
<div class="load-more" id="loadMoreIndicator" style="display: none;">
<div class="spinner"></div> 加载更多...
</div>
<div class="no-results" id="noResults" style="display: none;">没有找到影视</div>
</div>
</div>
<div id="liveView" style="display: none;">
<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;">
<div class="search-container" style="flex:1; margin:0;">
<input type="text" class="search-input" id="liveSearchInput" placeholder="输入标题...">
<button class="search-btn" id="liveSearchBtn"><i class="fas fa-search"></i></button>
</div>
<button class="add-line-btn" id="addLiveChannelBtn" title="新增直播频道"><i class="fas fa-plus"></i></button>
</div>
<div id="liveLoadingIndicator" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>
<div class="video-grid" id="liveGrid"></div>
<div class="load-more" id="liveLoadMore" style="display: none;"><div class="spinner"></div> 加载更多...</div>
<div class="no-results" id="liveNoResults" style="display: none;">暂无直播频道</div>
</div>
<div class="live-detail-view" id="liveDetailView" style="display: none;">
<div class="live-detail-container">
<div class="back-row">
<div class="back-btn" id="liveDetailBackBtn"><i class="fas fa-arrow-left"></i></div>
</div>
<div class="live-detail-header">
<div class="live-detail-title-group">
<span class="live-detail-title" id="liveDetailTitle">直播频道</span>
<div class="action-icons" id="liveDetailActions">
<span class="action-icon" id="editLiveChannelBtn" title="编辑频道"><i class="fas fa-edit"></i></span>
<span class="action-icon" id="addLiveMediaBtn" title="添加资源"><i class="fas fa-plus"></i></span>
<span class="action-icon delete-icon" id="deleteLiveChannelBtn" title="删除频道"><i class="fas fa-trash"></i></span>
</div>
</div>
<span class="live-media-count" id="liveDetailMediaCount">0 个源</span>
</div>
<div class="divider"></div>
<div id="liveMediaContainer">
<div id="liveMediaLoading" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>
<div id="liveMediaList" class="media-list" style="display: none;"></div>
<div id="liveMediaEmpty" class="no-results" style="display: none;">暂无资源</div>
</div>
</div>
</div>
</div>
</div>
<!-- 收藏模态框 -->
<div class="modal-overlay" id="favoriteModal">
<div class="modal-content">
<div class="modal-title">
<span>收藏到片单</span>
<button class="btn-icon" id="closeFavoriteModal"><i class="fas fa-times"></i></button>
</div>
<div class="search-container" style="margin-bottom: 1rem;">
<input type="text" class="search-input" id="favoriteSearchInput" placeholder="搜索我的片单...">
<button class="search-btn" id="favoriteSearchBtn"><i class="fas fa-search"></i></button>
</div>
<div id="favoriteList" class="watchlist-grid" style="overflow-y: auto; margin-bottom: 1rem;"></div>
<div class="modal-error" id="favoriteError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="favoriteCancel">取消</button>
<button class="modal-btn primary" id="favoriteConfirm">确认收藏</button>
</div>
</div>
</div>
<!-- 简介模态框 -->
<div class="modal-overlay" id="descriptionModal">
<div class="modal-content">
<div class="modal-title">
<span>简介</span>
<button class="btn-icon" id="closeDescriptionModal"><i class="fas fa-times"></i></button>
</div>
<div class="full-description" id="fullDescription"></div>
<div class="modal-buttons" style="margin-top:1rem;">
<button class="modal-btn" id="closeDescriptionBtn">关闭</button>
</div>
</div>
</div>
<!-- 直播频道模态框 -->
<div class="modal-overlay" id="addLiveChannelModal">
<div class="modal-content">
<div class="modal-title">
<span id="liveChannelModalTitle">新增直播频道</span>
<button class="btn-icon" id="closeAddLiveChannelModal"><i class="fas fa-times"></i></button>
</div>
<div class="image-upload-area" id="liveImageUploadArea">
<div class="image-preview" id="liveImagePreview">
<img id="livePreviewImg" src="" style="display: none;">
<div class="placeholder" id="livePlaceholder">
<i class="fas fa-cloud-upload-alt"></i>
<span>点击上传频道封面</span>
</div>
</div>
<div class="image-upload-buttons" id="liveImageUploadButtons">
<button class="image-upload-btn" id="liveUploadImageBtn">上传</button>
<button class="image-delete-btn" id="liveDeleteImageBtn" style="display: none;">删除</button>
</div>
<input type="file" id="liveImageFileInput" accept="image/*" style="display: none;">
</div>
<input type="hidden" id="liveImagePoster">
<input type="hidden" id="liveChannelId">
<div class="form-group">
<label>媒体库</label>
<select class="modal-input" id="liveLibraryId">
<option value="100">央视</option>
<option value="200">卫视</option>
<option value="300">地方</option>
<option value="900">未分类</option>
</select>
</div>
<div class="form-group">
<label>标题</label>
<input type="text" class="modal-input" id="liveTitle" maxlength="100" placeholder="请输入频道标题">
</div>
<div class="form-group">
<label>简介</label>
<textarea class="modal-input" id="liveDescription" maxlength="500" rows="2" placeholder="简介（可选）"></textarea>
</div>
<div class="form-group">
<label>宣传词</label>
<input type="text" class="modal-input" id="liveTagline" maxlength="100" placeholder="宣传词（可选）">
</div>
<div class="modal-error" id="liveChannelError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="liveChannelCancel">取消</button>
<button class="modal-btn primary" id="liveChannelSubmit">提交</button>
</div>
</div>
</div>
<!-- 直播资源模态框 -->
<div class="modal-overlay" id="addLiveMediaModal">
<div class="modal-content">
<div class="modal-title">
<span>添加资源</span>
<button class="btn-icon" id="closeAddLiveMediaModal"><i class="fas fa-times"></i></button>
</div>
<div id="mediaInputContainer"></div>
<button class="add-more-btn" id="addMoreMediaBtn"><i class="fas fa-plus"></i> 添加更多</button>
<div class="modal-error" id="liveMediaError"></div>
<div class="modal-buttons">
<button class="modal-btn" id="liveMediaCancel">取消</button>
<button class="modal-btn primary" id="liveMediaSubmit">提交</button>
</div>
</div>
</div>
<div class="floating-search-btn" id="floatingSearchBtn">
<i class="fas fa-search"></i>
</div>
<style>
/* ===== 媒体管理特有样式 ===== */
.title-switch-container { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.5rem; }
.title-switch-container button { background: none !important; border: none !important; cursor: pointer; padding: 0; line-height: 1.2; font-family: inherit; outline: none; transition: font-size 0.3s ease, color 0.2s ease; }
.tab-btn { color: var(--text-secondary); font-size: 2rem; font-weight: 400; }
.tab-btn:hover { color: var(--text-primary); }
.page-title { font-size: 2.8rem; font-weight: 700; margin: 0 0 0.2rem 0; color: var(--text-primary); animation: slideUpFade 0.8s ease-out forwards; padding: 0; }
@keyframes slideUpFade { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
.video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1.8rem 1.2rem; margin: 2rem 0; }
.video-card { background: transparent; border: none; cursor: pointer; transition: transform 0.2s; }
.video-card:hover { transform: translateY(-5px); }
.video-poster { width: 100%; aspect-ratio: 2/3; background-color: var(--bg-input); border-radius: var(--radius-lg); overflow: hidden; border: 0.5px solid var(--border-light); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 3rem; position: relative; }
.media-type-badge { position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px); border-radius: var(--radius-full); padding: 2px 10px; font-size: 0.7rem; font-weight: 300; color: #fff; border: 0.5px solid rgba(255, 255, 255, 0.15); z-index: 2; }
.video-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-info { margin-top: 0.6rem; text-align: center !important; }
.card-title { font-size: 0.95rem; font-weight: 500; color: var(--text-primary); margin: 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.card-year { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem; }
#liveView .video-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
#liveView .video-card .video-poster { aspect-ratio: 2 / 1; width: 100%; background-color: var(--bg-input); overflow: hidden; }
#liveView .video-card .video-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.add-line-btn { background: var(--accent-color); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); margin-left: auto; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
.add-line-btn:hover { background: var(--accent-hover); transform: scale(1.05) rotate(90deg); box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4); }
.live-detail-view { width: 100%; min-height: 100%; }
.live-detail-container { width: 100%; padding: 1rem 0; margin: 0; box-sizing: border-box; }
.back-row { display: flex; align-items: center; margin-bottom: 1.5rem; }
.live-detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.live-detail-title-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.live-detail-title { font-size: 1.8rem; font-weight: 600; color: var(--text-primary); }
.live-media-count { font-size: 0.9rem; color: var(--text-secondary); white-space: nowrap; }
.action-icons { display: flex; gap: 0.5rem; }
.action-icon { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-full); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
.action-icon:hover { background: var(--bg-hover); color: var(--text-primary); }
.delete-icon:hover { color: var(--danger-color); background: rgba(255,107,107,0.1); }
.divider { height: 1px; background: var(--border-light); margin: 1rem 0; }
.media-list { display: flex; flex-direction: column; gap: 0.8rem; }
.add-more-btn { background: transparent; border: 1px dashed var(--border-color); color: var(--text-secondary); padding: 0.5rem; border-radius: var(--radius-full); width: 100%; cursor: pointer; transition: 0.2s; margin-bottom: 1rem; }
.add-more-btn:hover { border-color: var(--accent-color); color: var(--accent-color); }
.remove-media-btn { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; color: var(--danger-color); cursor: pointer; transition: all 0.2s ease; backdrop-filter: blur(4px); }
.remove-media-btn:hover { background: rgba(255, 107, 107, 0.2); border-color: var(--danger-color); color: var(--danger-color); transform: scale(1.05); }
.floating-search-btn { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-color); display: none; justify-content: center; align-items: center; color: white; font-size: 1.5rem; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4); cursor: pointer; z-index: 1500; transition: transform 0.2s; }
.floating-search-btn:hover { transform: scale(1.1); }
.poster-action-btn { background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.9rem; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
.poster-bottom-actions { position: absolute; bottom: 8px; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 8px; z-index: 2; opacity: 0; pointer-events: none; transition: opacity 0.2s ease; }
.video-card.selected .poster-bottom-actions { opacity: 1; pointer-events: auto; }
.poster-action-btn:hover { background: var(--accent-color); border-color: var(--accent-color); }
.poster-action-btn.seek-btn.active { background: var(--danger-color); border-color: var(--danger-color); }
@media (hover: hover) and (pointer: fine) { .video-poster:hover .poster-bottom-actions { opacity: 1; pointer-events: auto; } }
.watchlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.8rem; max-height: 350px; overflow-y: auto; }
.watchlist-item { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-lg); padding: 0.8rem 1rem; display: flex; align-items: center; gap: 0.8rem; transition: background 0.2s; }
.watchlist-item:hover { background: var(--bg-hover); }
.watchlist-info { flex: 1; min-width: 0; }
.watchlist-name { font-size: 0.95rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.2rem; }
.watchlist-meta { font-size: 0.7rem; color: var(--text-secondary); display: flex; gap: 0.5rem; }
.watchlist-checkbox { appearance: none; -webkit-appearance: none; width: 22px; height: 22px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; outline: none; transition: background 0.2s, border-color 0.2s; position: relative; flex-shrink: 0; }
.watchlist-checkbox:checked { background: var(--accent-color); border-color: var(--accent-color); }
.watchlist-checkbox:checked::after { content: "✓"; font-size: 14px; color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; }
@media (max-width: 700px) {
.title-switch-container .page-title { font-size: 2rem; }
.title-switch-container .tab-btn { font-size: 1.5rem; }
.video-grid { margin: 1.5rem 0; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem; }
#liveView > div:first-child { flex-wrap: nowrap !important; }
.live-detail-container { padding: 0.5rem 1rem; }
.live-detail-title { font-size: 1.5rem; }
}
.back-btn { background: var(--bg-input); border: 0.5px solid var(--border-light); color: var(--text-primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: 0.2s; }
.back-btn:hover { background: var(--bg-hover); transform: scale(1.05); }
</style>
\`;
}
// ==================== 辅助函数 ====================
function enhanceImageUrl(url) {
if (!url) return url;
const originalPattern = /\\/(?:w\\d+|original)(\\/|$)/;
if (originalPattern.test(url)) {
return url.replace(originalPattern, '/original/');
}
return url;
}
// ==================== 影视列表逻辑 ====================
async function loadVideos(reset = false) {
if (videoState.isLoading) return;
if (reset) {
videoState.currentPage = 1;
videoState.hasMore = true;
const videoGrid = el.querySelector('#videoGrid');
if (videoGrid) videoGrid.innerHTML = '';
const noResults = el.querySelector('#noResults');
if (noResults) noResults.style.display = 'none';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'flex';
const videoGridContainer = el.querySelector('#videoGridContainer');
if (videoGridContainer) videoGridContainer.style.display = 'none';
}
if (!videoState.hasMore) return;
videoState.isLoading = true;
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'block';
if (videoState.searchController) {
videoState.searchController.abort();
}
const controller = new AbortController();
videoState.searchController = controller;
let url = '/api/video/list?page=' + videoState.currentPage + '&page_size=' + videoState.pageSize;
if (videoState.isSearchMode) {
if (videoState.currentType === 'title') {
url += '&title=' + encodeURIComponent(videoState.currentQuery);
} else {
url += '&tmdb_id=' + encodeURIComponent(videoState.currentQuery);
}
}
try {
const response = await window.fetchWithAuth(url, { signal: controller.signal });
if (!response) {
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const videoGridContainer = el.querySelector('#videoGridContainer');
if (videoGridContainer) videoGridContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
videoState.isLoading = false;
return;
}
const data = await response.json();
if (controller !== videoState.searchController) return;
const items = data.items || [];
const total = data.total || 0;
videoState.pageSize = data.page_size || 20;
videoState.totalPages = Math.ceil(total / videoState.pageSize);
const current = data.page || videoState.currentPage;
if (reset && items.length === 0) {
const noResults = el.querySelector('#noResults');
if (noResults) {
noResults.style.display = 'block';
}
const videoGridContainer = el.querySelector('#videoGridContainer');
if (videoGridContainer) videoGridContainer.style.display = 'block';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
videoState.isLoading = false;
return;
}
if (items.length > 0) {
renderVideoItems(items);
videoState.currentPage = current + 1;
videoState.hasMore = videoState.currentPage <= videoState.totalPages;
} else {
videoState.hasMore = false;
}
if (reset) {
const videoGridContainer = el.querySelector('#videoGridContainer');
if (videoGridContainer) videoGridContainer.style.display = 'block';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
}
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = videoState.hasMore ? 'block' : 'none';
} catch (err) {
if (err.name === 'AbortError') {
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const videoGridContainer = el.querySelector('#videoGridContainer');
if (videoGridContainer) videoGridContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
videoState.isLoading = false;
return;
}
console.error(err);
window.showToast('获取影视数据失败：' + err.message);
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const videoGridContainer = el.querySelector('#videoGridContainer');
if (videoGridContainer) videoGridContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
} finally {
if (controller === videoState.searchController) {
videoState.isLoading = false;
videoState.searchController = null;
}
}
}
function renderVideoItems(items) {
const videoGrid = el.querySelector('#videoGrid');
if (!videoGrid) return;
items.forEach(item => {
const card = document.createElement('div');
card.className = 'video-card';
card.dataset.videoId = item.video_id;
const posterUrl = item.video_image_poster ? enhanceImageUrl(item.video_image_poster) : '';
const year = item.video_date_air ? item.video_date_air.substring(0,4) : '';
const title = window.escapeHtml(item.video_title || '无标题');
const mediaType = item.video_type === 'movie' ? '电影' : '剧集';
card.innerHTML = '<div class="video-poster">' +
(posterUrl ? '<img src="' + posterUrl + '" loading="lazy" alt="海报">' : '<i class="fas fa-film"></i>') +
'<span class="media-type-badge">' + mediaType + '</span>' +
'<div class="poster-bottom-actions">' +
'<button class="poster-action-btn seek-btn" title="求片" data-video-id="' + item.video_id + '"><i class="fas fa-heart"></i></button>' +
'<button class="poster-action-btn favorite-btn" title="收藏" data-video-id="' + item.video_id + '"><i class="fas fa-bookmark"></i></button>' +
'</div></div>' +
'<div class="card-info">' +
'<div class="card-title">' + title + '</div>' +
'<div class="card-year">' + window.escapeHtml(year) + '</div>' +
'</div>';
card.addEventListener('click', (e) => {
if (e.target.closest('.poster-action-btn')) return;
const isMobile = window.innerWidth <= 700;
if (isMobile) {
if (card.classList.contains('selected')) {
window.navigate('/media/' + item.video_id);
} else {
document.querySelectorAll('.video-card.selected').forEach(c => c.classList.remove('selected'));
card.classList.add('selected');
setTimeout(() => {
if (card.classList.contains('selected')) card.classList.remove('selected');
}, 3000);
}
} else {
window.navigate('/media/' + item.video_id);
}
});
const seekBtn = card.querySelector('.seek-btn');
if (seekBtn && item.seek_is_request) {
seekBtn.classList.add('active');
}
if (seekBtn) {
seekBtn.addEventListener('click', async (e) => {
e.stopPropagation();
const videoId = seekBtn.dataset.videoId;
if (!videoId) return;
try {
seekBtn.disabled = true;
seekBtn.innerHTML = '<div class="spinner"></div>';
const url = '/api/seek/apply?item_type=vl&item_id=' + encodeURIComponent(videoId);
// ✅ 修复：使用 fetchWithAuth
const response = await window.fetchWithAuth(url, { method: 'PUT' });
if (!response) return;
if (!response.ok) {
const errorData = await response.json().catch(() => ({}));
throw new Error(errorData.message || '求片失败');
}
const data = await response.json();
const newState = data.seek_is_request;
if (newState) {
seekBtn.classList.add('active');
} else {
seekBtn.classList.remove('active');
}
window.showToast(newState ? '求片成功' : '已取消求片');
} catch (err) {
window.showToast(err.message);
} finally {
seekBtn.disabled = false;
seekBtn.innerHTML = '<i class="fas fa-heart"></i>';
}
});
}
const favBtn = card.querySelector('.favorite-btn');
if (favBtn) {
favBtn.addEventListener('click', (e) => {
e.stopPropagation();
currentVideoIdForFavorite = favBtn.dataset.videoId;
openFavoriteModal();
});
}
videoGrid.appendChild(card);
});
}
// ==================== 直播频道逻辑 ====================
async function loadLiveChannels(reset = false) {
if (liveState.isLoading) return;
if (reset) {
liveState.currentPage = 1;
liveState.hasMore = true;
const liveGrid = el.querySelector('#liveGrid');
if (liveGrid) liveGrid.innerHTML = '';
const liveNoResults = el.querySelector('#liveNoResults');
if (liveNoResults) liveNoResults.style.display = 'none';
const liveLoadingIndicator = el.querySelector('#liveLoadingIndicator');
if (liveLoadingIndicator) liveLoadingIndicator.style.display = 'flex';
}
if (!liveState.hasMore) return;
liveState.isLoading = true;
const liveLoadMore = el.querySelector('#liveLoadMore');
if (liveLoadMore) liveLoadMore.style.display = 'block';
let url = '/api/live/list?page=' + liveState.currentPage + '&page_size=' + liveState.pageSize;
if (liveState.searchQuery.trim() !== '') {
url += '&title=' + encodeURIComponent(liveState.searchQuery.trim());
}
try {
const response = await window.fetchWithAuth(url);
if (!response) {
const liveLoadingIndicator = el.querySelector('#liveLoadingIndicator');
if (liveLoadingIndicator) liveLoadingIndicator.style.display = 'none';
const liveLoadMore = el.querySelector('#liveLoadMore');
if (liveLoadMore) liveLoadMore.style.display = 'none';
liveState.isLoading = false;
return;
}
const data = await response.json();
const items = data.items || [];
const total = data.total || 0;
const current = data.page || liveState.currentPage;
const pageSize = data.page_size || 20;
const totalPages = Math.ceil(total / pageSize);
if (reset && items.length === 0) {
const liveNoResults = el.querySelector('#liveNoResults');
if (liveNoResults) liveNoResults.style.display = 'block';
const liveLoadingIndicator = el.querySelector('#liveLoadingIndicator');
if (liveLoadingIndicator) liveLoadingIndicator.style.display = 'none';
const liveLoadMore = el.querySelector('#liveLoadMore');
if (liveLoadMore) liveLoadMore.style.display = 'none';
liveState.isLoading = false;
return;
}
if (items.length > 0) {
renderLiveChannels(items);
liveState.currentPage = current + 1;
liveState.hasMore = liveState.currentPage <= totalPages;
} else {
liveState.hasMore = false;
}
if (reset) {
const liveLoadingIndicator = el.querySelector('#liveLoadingIndicator');
if (liveLoadingIndicator) liveLoadingIndicator.style.display = 'none';
}
const liveLoadMore = el.querySelector('#liveLoadMore');
if (liveLoadMore) liveLoadMore.style.display = liveState.hasMore ? 'block' : 'none';
} catch (err) {
window.showToast('加载直播频道失败：' + err.message);
const liveLoadingIndicator = el.querySelector('#liveLoadingIndicator');
if (liveLoadingIndicator) liveLoadingIndicator.style.display = 'none';
const liveLoadMore = el.querySelector('#liveLoadMore');
if (liveLoadMore) liveLoadMore.style.display = 'none';
} finally {
liveState.isLoading = false;
}
}
function renderLiveChannels(channels) {
const liveGrid = el.querySelector('#liveGrid');
if (!liveGrid) return;
channels.forEach(ch => {
const card = document.createElement('div');
card.className = 'video-card';
const poster = ch.image_poster_url || '';
card.innerHTML = '<div class="video-poster">' +
(poster ? '<img src="' + poster + '" loading="lazy">' : '<i class="fas fa-tv"></i>') +
'</div>' +
'<div class="card-info">' +
'<div class="card-title">' + window.escapeHtml(ch.title || ch.code) + '</div>' +
'<div class="card-year">' + (ch.media_count || 0) + ' 个源</div>' +
'</div>';
card.addEventListener('click', () => showLiveDetail(ch));
liveGrid.appendChild(card);
});
}
async function showLiveDetail(channel) {
liveState.currentChannel = channel;
const listView = el.querySelector('#listView');
const liveView = el.querySelector('#liveView');
const liveDetailView = el.querySelector('#liveDetailView');
const titleSwitchContainer = el.querySelector('#titleSwitchContainer');
if (listView) listView.style.display = 'none';
if (liveView) liveView.style.display = 'none';
if (titleSwitchContainer) titleSwitchContainer.style.display = 'none';
if (liveDetailView) liveDetailView.style.display = 'block';
const liveDetailTitle = el.querySelector('#liveDetailTitle');
const liveDetailMediaCount = el.querySelector('#liveDetailMediaCount');
if (liveDetailTitle) liveDetailTitle.textContent = channel.title || channel.code || '直播频道';
if (liveDetailMediaCount) liveDetailMediaCount.textContent = (channel.media_count || 0) + ' 个源';
const liveMediaLoading = el.querySelector('#liveMediaLoading');
const liveMediaList = el.querySelector('#liveMediaList');
const liveMediaEmpty = el.querySelector('#liveMediaEmpty');
if (liveMediaLoading) liveMediaLoading.style.display = 'flex';
if (liveMediaList) liveMediaList.style.display = 'none';
if (liveMediaEmpty) liveMediaEmpty.style.display = 'none';
try {
const response = await window.fetchWithAuth('/api/live/media?live_list_id=' + channel.id);
if (!response) return;
const data = await response.json();
const items = data.items || [];
if (liveMediaLoading) liveMediaLoading.style.display = 'none';
if (items.length === 0) {
if (liveMediaEmpty) liveMediaEmpty.style.display = 'block';
} else {
if (liveMediaList) liveMediaList.style.display = 'block';
renderLiveMedia(items, channel.is_can_edit);
}
} catch (err) {
if (liveMediaLoading) liveMediaLoading.style.display = 'none';
if (liveMediaEmpty) liveMediaEmpty.style.display = 'block';
if (liveMediaEmpty) liveMediaEmpty.textContent = '加载失败，请重试';
window.showToast('加载资源失败：' + err.message);
}
}
function renderLiveMedia(items, canEdit) {
const liveMediaList = el.querySelector('#liveMediaList');
if (!liveMediaList) return;
let html = '<div class="info-list">';
items.forEach(media => {
const created = media.created_at ? new Date(media.created_at).toLocaleString('zh-CN') : '';
let actionsHtml = '';
if (canEdit) {
actionsHtml = '<div class="info-list-right">' +
'<button class="action-icon delete-icon" data-media-id="' + media.media_id + '" title="删除资源"><i class="fas fa-trash"></i></button>' +
'</div>';
}
html += '<div class="info-list-item" data-media-id="' + media.media_id + '">' +
'<div class="info-list-left">' +
'<div class="info-list-title">' + window.escapeHtml(media.name || '未命名') + '</div>' +
'<div class="info-list-desc">' +
'<span><i class="fas fa-link"></i> ' + window.escapeHtml(media.path_type || '未知') + '</span>' +
'<span><i class="fas fa-user"></i> ' + window.escapeHtml(media.pseudonym || '未知') + '</span>' +
'<span><i class="far fa-calendar"></i> ' + created + '</span>' +
'<span class="status-badge-small ' + (media.status === 'normal' ? 'normal' : '') + '">' + window.escapeHtml(media.status || 'normal') + '</span>' +
'</div></div>' + actionsHtml + '</div>';
});
html += '</div>';
liveMediaList.innerHTML = html;
if (canEdit) {
const deleteIcons = liveMediaList.querySelectorAll('.delete-icon');
deleteIcons.forEach(btn => {
btn.addEventListener('click', () => {
const mediaId = btn.dataset.mediaId;
if (confirm('确定要删除该资源吗？此操作不可撤销。')) {
deleteLiveMedia(mediaId);
}
});
});
}
}
async function deleteLiveMedia(mediaId) {
try {
const response = await window.fetchWithAuth('/api/live/media/' + mediaId, {
method: 'DELETE'
});
if (!response) return;
if (!response.ok) throw new Error('删除失败');
window.showToast('删除成功');
if (liveState.currentChannel) {
showLiveDetail(liveState.currentChannel);
}
} catch (err) {
window.showToast(err.message);
}
}
// ==================== 收藏功能 ====================
let currentVideoIdForFavorite = null;
let allWatchlists = [];
let filteredWatchlists = [];
async function openFavoriteModal() {
const favoriteModal = el.querySelector('#favoriteModal');
const favoriteSearchInput = el.querySelector('#favoriteSearchInput');
const favoriteError = el.querySelector('#favoriteError');
const favoriteList = el.querySelector('#favoriteList');
if (favoriteSearchInput) favoriteSearchInput.value = '';
if (favoriteError) favoriteError.textContent = '';
if (favoriteList) favoriteList.innerHTML = '<div class="apple-loading"><div class="spinner"></div></div>';
if (favoriteModal) favoriteModal.classList.add('show');
await loadMyWatchlists();
}
async function loadMyWatchlists() {
try {
const response = await window.fetchWithAuth('/api/watch?is_self=1');
if (!response) return;
const data = await response.json();
allWatchlists = data.items || [];
filteredWatchlists = allWatchlists.slice();
renderWatchlistItems(filteredWatchlists);
} catch (err) {
const favoriteError = el.querySelector('#favoriteError');
if (favoriteError) favoriteError.textContent = err.message;
}
}
function renderWatchlistItems(watchlists) {
const favoriteList = el.querySelector('#favoriteList');
if (!favoriteList) return;
if (watchlists.length === 0) {
favoriteList.innerHTML = '<div class="no-results" style="grid-column:1/-1;">暂无片单</div>';
return;
}
let html = '';
watchlists.forEach(wl => {
const publicBadge = wl.is_public
? '<span class="public-badge"><i class="fas fa-globe"></i> 公开</span>'
: '<span class="private-badge"><i class="fas fa-lock"></i> 私有</span>';
html += '<div class="watchlist-item" data-id="' + wl.id + '">' +
'<div class="watchlist-info">' +
'<div class="watchlist-name" title="' + window.escapeHtml(wl.name) + '">' + window.escapeHtml(wl.name) + '</div>' +
'<div class="watchlist-meta">' + publicBadge + '<span>' + (wl.video_count || 0) + ' 个视频</span></div>' +
'</div>' +
'<input type="checkbox" class="watchlist-checkbox" data-id="' + wl.id + '">' +
'</div>';
});
favoriteList.innerHTML = html;
}
function filterWatchlists(keyword) {
if (!keyword) {
filteredWatchlists = allWatchlists.slice();
} else {
filteredWatchlists = allWatchlists.filter(wl => wl.name.toLowerCase().includes(keyword.toLowerCase()));
}
renderWatchlistItems(filteredWatchlists);
}
function closeFavoriteModal() {
const favoriteModal = el.querySelector('#favoriteModal');
if (favoriteModal) favoriteModal.classList.remove('show');
currentVideoIdForFavorite = null;
}
async function confirmFavorite() {
const checkboxes = el.querySelectorAll('#favoriteList .watchlist-checkbox:checked');
if (checkboxes.length === 0) {
const favoriteError = el.querySelector('#favoriteError');
if (favoriteError) favoriteError.textContent = '请至少选择一个片单';
return;
}
const confirmBtn = el.querySelector('#favoriteConfirm');
if (confirmBtn) {
confirmBtn.disabled = true;
confirmBtn.innerHTML = '<div class="spinner"></div>';
}
try {
const promises = [];
for (let i = 0; i < checkboxes.length; i++) {
const cb = checkboxes[i];
const watchId = cb.dataset.id;
const url = '/api/watch/' + watchId + '/video/' + currentVideoIdForFavorite;
const body = { sort: 80, remark: null };
promises.push(
window.fetchWithAuth(url, {
method: 'POST',
body: JSON.stringify(body)
}).then(res => {
if (!res) return;
if (!res.ok) throw new Error('添加到片单 ' + watchId + ' 失败');
return res.json();
})
);
}
await Promise.all(promises);
window.showToast('收藏成功');
closeFavoriteModal();
} catch (err) {
const favoriteError = el.querySelector('#favoriteError');
if (favoriteError) favoriteError.textContent = err.message;
} finally {
if (confirmBtn) {
confirmBtn.disabled = false;
confirmBtn.innerHTML = '确认收藏';
}
}
}
// ==================== 直播频道编辑 ====================
async function uploadLiveImage(file, imagePosterInput) {
// 使用全局上传模块
try {
const fileId = await window.EmosUpload.uploadImage(file);
imagePosterInput.value = fileId;
} catch (err) {
window.showToast('图片上传失败：' + err.message);
}
}
async function saveLiveChannel() {
const libraryId = parseInt(el.querySelector('#liveLibraryId').value);
const title = el.querySelector('#liveTitle').value.trim();
const channelId = el.querySelector('#liveChannelId').value;
const imagePoster = el.querySelector('#liveImagePoster').value;
if (!libraryId || libraryId < 1) {
const error = el.querySelector('#liveChannelError');
if (error) error.textContent = '请填写有效的媒体库 ID';
return;
}
if (!title) {
const error = el.querySelector('#liveChannelError');
if (error) error.textContent = '标题不能为空';
return;
}
const body = {
id: channelId ? parseInt(channelId) : null,
live_library_id: libraryId,
title: title,
description: el.querySelector('#liveDescription').value.trim() || null,
tagline: el.querySelector('#liveTagline').value.trim() || null,
image_poster: imagePoster || null
};
const submitBtn = el.querySelector('#liveChannelSubmit');
if (submitBtn) {
submitBtn.disabled = true;
submitBtn.innerHTML = '<div class="spinner"></div> 提交中...';
}
try {
const response = await window.fetchWithAuth('/api/live/list', {
method: 'POST',
body: JSON.stringify(body)
});
if (!response) return;
if (!response.ok) {
let errorMsg = '请求失败，状态码 ' + response.status;
try {
const errorData = await response.json();
if (errorData.message) errorMsg = errorData.message;
else if (errorData.error) errorMsg = errorData.error;
} catch (e) {}
throw new Error(errorMsg);
}
window.showToast('保存成功');
const modal = el.querySelector('#addLiveChannelModal');
if (modal) modal.classList.remove('show');
loadLiveChannels(true);
if (channelId && liveState.currentChannel) {
const backBtn = el.querySelector('#liveDetailBackBtn');
if (backBtn) backBtn.click();
}
} catch (err) {
const error = el.querySelector('#liveChannelError');
if (error) error.textContent = err.message;
} finally {
if (submitBtn) {
submitBtn.disabled = false;
submitBtn.innerHTML = '提交';
}
}
}
// ==================== 视图切换 ====================
function switchToVideo() {
const listView = el.querySelector('#listView');
const liveView = el.querySelector('#liveView');
const liveDetailView = el.querySelector('#liveDetailView');
const titleSwitchContainer = el.querySelector('#titleSwitchContainer');
if (listView) listView.style.display = 'block';
if (liveView) liveView.style.display = 'none';
if (liveDetailView) liveDetailView.style.display = 'none';
if (titleSwitchContainer) titleSwitchContainer.style.display = 'flex';
currentView = 'video';
if (el.querySelector('#videoGrid').children.length === 0) {
loadVideos(true);
}
}
function switchToLive() {
const listView = el.querySelector('#listView');
const liveView = el.querySelector('#liveView');
const liveDetailView = el.querySelector('#liveDetailView');
const titleSwitchContainer = el.querySelector('#titleSwitchContainer');
if (listView) listView.style.display = 'none';
if (liveView) liveView.style.display = 'block';
if (liveDetailView) liveDetailView.style.display = 'none';
if (titleSwitchContainer) titleSwitchContainer.style.display = 'flex';
currentView = 'live';
if (el.querySelector('#liveGrid').children.length === 0) {
loadLiveChannels(true);
}
}
// ==================== 事件绑定 ====================
function bindEvents() {
// 影视搜索
const searchInput = el.querySelector('#searchInput');
const searchType = el.querySelector('#searchType');
const searchBtn = el.querySelector('#searchBtn');
const performSearch = () => {
const query = searchInput.value.trim();
const type = searchType.value;
if (!query) {
if (videoState.isSearchMode) {
videoState.currentQuery = '';
videoState.isSearchMode = false;
loadVideos(true);
}
return;
}
videoState.currentQuery = query;
videoState.currentType = type;
videoState.isSearchMode = true;
loadVideos(true);
};
if (searchBtn) searchBtn.addEventListener('click', performSearch);
if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
if (searchInput) searchInput.addEventListener('input', () => {
if (searchInput.value.trim() === '' && videoState.isSearchMode) {
videoState.currentQuery = '';
videoState.isSearchMode = false;
loadVideos(true);
}
});
// 无限滚动
window.addEventListener('scroll', () => {
if (currentView === 'video') {
if (videoState.isLoading || !videoState.hasMore) return;
const scrollY = window.scrollY;
const windowHeight = window.innerHeight;
const documentHeight = document.documentElement.scrollHeight;
if (scrollY + windowHeight >= documentHeight - 200) {
loadVideos();
}
} else if (currentView === 'live') {
if (liveState.isLoading || !liveState.hasMore) return;
const scrollY = window.scrollY;
const windowHeight = window.innerHeight;
const documentHeight = document.documentElement.scrollHeight;
if (scrollY + windowHeight >= documentHeight - 200) {
loadLiveChannels();
}
}
});
// 直播搜索
const liveSearchInput = el.querySelector('#liveSearchInput');
const liveSearchBtn = el.querySelector('#liveSearchBtn');
let isComposing = false;
if (liveSearchInput) {
liveSearchInput.addEventListener('compositionstart', () => { isComposing = true; });
liveSearchInput.addEventListener('compositionend', () => {
isComposing = false;
if (liveSearchInput.value.trim() === '') {
liveState.searchQuery = '';
loadLiveChannels(true);
}
});
liveSearchInput.addEventListener('input', () => {
if (isComposing) return;
if (liveSearchInput.value.trim() === '') {
liveState.searchQuery = '';
loadLiveChannels(true);
}
});
liveSearchInput.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
e.preventDefault();
liveState.searchQuery = liveSearchInput.value.trim();
loadLiveChannels(true);
}
});
}
if (liveSearchBtn) {
liveSearchBtn.addEventListener('click', () => {
liveState.searchQuery = liveSearchInput.value.trim();
loadLiveChannels(true);
});
}
// 直播频道添加
const addLiveChannelBtn = el.querySelector('#addLiveChannelBtn');
if (addLiveChannelBtn) {
addLiveChannelBtn.addEventListener('click', () => {
const modal = el.querySelector('#addLiveChannelModal');
if (modal) modal.classList.add('show');
const titleSpan = el.querySelector('#liveChannelModalTitle');
if (titleSpan) titleSpan.textContent = '新增直播频道';
const channelIdInput = el.querySelector('#liveChannelId');
if (channelIdInput) channelIdInput.value = '';
const librarySelect = el.querySelector('#liveLibraryId');
if (librarySelect) librarySelect.value = '100';
const titleInput = el.querySelector('#liveTitle');
if (titleInput) titleInput.value = '';
const descInput = el.querySelector('#liveDescription');
if (descInput) descInput.value = '';
const taglineInput = el.querySelector('#liveTagline');
if (taglineInput) taglineInput.value = '';
const imagePoster = el.querySelector('#liveImagePoster');
if (imagePoster) imagePoster.value = '';
const previewImg = el.querySelector('#livePreviewImg');
if (previewImg) previewImg.style.display = 'none';
const placeholder = el.querySelector('#livePlaceholder');
if (placeholder) placeholder.style.display = 'flex';
const deleteBtn = el.querySelector('#liveDeleteImageBtn');
if (deleteBtn) deleteBtn.style.display = 'none';
const uploadArea = el.querySelector('#liveImageUploadArea');
if (uploadArea) uploadArea.classList.add('no-image');
const errorSpan = el.querySelector('#liveChannelError');
if (errorSpan) errorSpan.textContent = '';
});
}
// 直播频道关闭模态框
const closeLiveChannelModal = el.querySelector('#closeAddLiveChannelModal');
if (closeLiveChannelModal) {
closeLiveChannelModal.addEventListener('click', () => {
const modal = el.querySelector('#addLiveChannelModal');
if (modal) modal.classList.remove('show');
});
}
const liveChannelCancel = el.querySelector('#liveChannelCancel');
if (liveChannelCancel) {
liveChannelCancel.addEventListener('click', () => {
const modal = el.querySelector('#addLiveChannelModal');
if (modal) modal.classList.remove('show');
});
}
const liveChannelSubmit = el.querySelector('#liveChannelSubmit');
if (liveChannelSubmit) {
liveChannelSubmit.addEventListener('click', saveLiveChannel);
}
// 图片上传
const liveUploadImageBtn = el.querySelector('#liveUploadImageBtn');
const liveImageFileInput = el.querySelector('#liveImageFileInput');
const liveDeleteImageBtn = el.querySelector('#liveDeleteImageBtn');
const livePreviewImg = el.querySelector('#livePreviewImg');
const livePlaceholder = el.querySelector('#livePlaceholder');
const liveImagePoster = el.querySelector('#liveImagePoster');
if (liveUploadImageBtn) {
liveUploadImageBtn.addEventListener('click', () => {
if (liveImageFileInput) liveImageFileInput.click();
});
}
if (liveImageFileInput) {
liveImageFileInput.addEventListener('change', () => {
if (liveImageFileInput.files.length > 0) {
const file = liveImageFileInput.files[0];
const reader = new FileReader();
reader.onload = (e) => {
if (livePreviewImg) {
livePreviewImg.src = e.target.result;
livePreviewImg.style.display = 'block';
}
if (livePlaceholder) livePlaceholder.style.display = 'none';
if (liveDeleteImageBtn) liveDeleteImageBtn.style.display = 'inline-block';
const uploadArea = el.querySelector('#liveImageUploadArea');
if (uploadArea) uploadArea.classList.remove('no-image');
};
reader.readAsDataURL(file);
uploadLiveImage(file, liveImagePoster);
}
});
}
if (liveDeleteImageBtn) {
liveDeleteImageBtn.addEventListener('click', () => {
if (liveImagePoster) liveImagePoster.value = '';
if (livePreviewImg) livePreviewImg.style.display = 'none';
if (livePlaceholder) livePlaceholder.style.display = 'flex';
if (liveDeleteImageBtn) liveDeleteImageBtn.style.display = 'none';
const uploadArea = el.querySelector('#liveImageUploadArea');
if (uploadArea) uploadArea.classList.add('no-image');
});
}
// 直播详情返回
const liveDetailBackBtn = el.querySelector('#liveDetailBackBtn');
if (liveDetailBackBtn) {
liveDetailBackBtn.addEventListener('click', () => {
const liveDetailView = el.querySelector('#liveDetailView');
const liveView = el.querySelector('#liveView');
const titleSwitchContainer = el.querySelector('#titleSwitchContainer');
if (liveDetailView) liveDetailView.style.display = 'none';
if (liveView) liveView.style.display = 'block';
if (titleSwitchContainer) titleSwitchContainer.style.display = 'flex';
});
}
// 直播编辑、添加媒体、删除
const editLiveChannelBtn = el.querySelector('#editLiveChannelBtn');
if (editLiveChannelBtn) {
editLiveChannelBtn.addEventListener('click', () => {
if (!liveState.currentChannel) return;
const modal = el.querySelector('#addLiveChannelModal');
if (modal) modal.classList.add('show');
const titleSpan = el.querySelector('#liveChannelModalTitle');
if (titleSpan) titleSpan.textContent = '编辑直播频道';
const channelIdInput = el.querySelector('#liveChannelId');
if (channelIdInput) channelIdInput.value = liveState.currentChannel.id;
const librarySelect = el.querySelector('#liveLibraryId');
if (librarySelect) librarySelect.value = liveState.currentChannel.live_library_id || 1;
const titleInput = el.querySelector('#liveTitle');
if (titleInput) titleInput.value = liveState.currentChannel.title || '';
const descInput = el.querySelector('#liveDescription');
if (descInput) descInput.value = liveState.currentChannel.description || '';
const taglineInput = el.querySelector('#liveTagline');
if (taglineInput) taglineInput.value = liveState.currentChannel.tagline || '';
const imagePoster = el.querySelector('#liveImagePoster');
if (imagePoster) imagePoster.value = liveState.currentChannel.image_poster || '';
const previewImg = el.querySelector('#livePreviewImg');
const placeholder = el.querySelector('#livePlaceholder');
const deleteBtn = el.querySelector('#liveDeleteImageBtn');
if (liveState.currentChannel.image_poster_url) {
if (previewImg) {
previewImg.src = liveState.currentChannel.image_poster_url;
previewImg.style.display = 'block';
}
if (placeholder) placeholder.style.display = 'none';
if (deleteBtn) deleteBtn.style.display = 'inline-block';
const uploadArea = el.querySelector('#liveImageUploadArea');
if (uploadArea) uploadArea.classList.remove('no-image');
} else {
if (previewImg) previewImg.style.display = 'none';
if (placeholder) placeholder.style.display = 'flex';
if (deleteBtn) deleteBtn.style.display = 'none';
const uploadArea = el.querySelector('#liveImageUploadArea');
if (uploadArea) uploadArea.classList.add('no-image');
}
const errorSpan = el.querySelector('#liveChannelError');
if (errorSpan) errorSpan.textContent = '';
});
}
const addLiveMediaBtn = el.querySelector('#addLiveMediaBtn');
if (addLiveMediaBtn) {
addLiveMediaBtn.addEventListener('click', () => {
if (!liveState.currentChannel) return;
const mediaInputContainer = el.querySelector('#mediaInputContainer');
if (mediaInputContainer) mediaInputContainer.innerHTML = '';
addMediaInputGroup();
const modal = el.querySelector('#addLiveMediaModal');
if (modal) modal.classList.add('show');
const errorSpan = el.querySelector('#liveMediaError');
if (errorSpan) errorSpan.textContent = '';
});
}
function addMediaInputGroup() {
const container = el.querySelector('#mediaInputContainer');
if (!container) return;
const group = document.createElement('div');
group.className = 'media-input-group';
group.innerHTML = '<div style="display: flex; gap: 0.8rem; align-items: center;">' +
'<div class="form-group" style="flex: 1;">' +
'<label>名称</label>' +
'<input type="text" class="modal-input media-name" placeholder="例如：1080p" maxlength="100">' +
'</div>' +
'<div class="form-group" style="flex: 1;">' +
'<label>地址</label>' +
'<input type="url" class="modal-input media-url" placeholder="http://.../play.m3u8">' +
'</div>' +
'<button class="remove-media-btn"><i class="fas fa-times"></i></button>' +
'</div>';
group.querySelector('.remove-media-btn').addEventListener('click', () => group.remove());
container.appendChild(group);
}
const addMoreMediaBtn = el.querySelector('#addMoreMediaBtn');
if (addMoreMediaBtn) addMoreMediaBtn.addEventListener('click', addMediaInputGroup);
const liveMediaSubmit = el.querySelector('#liveMediaSubmit');
if (liveMediaSubmit) {
liveMediaSubmit.addEventListener('click', async () => {
const groups = el.querySelectorAll('.media-input-group');
if (groups.length === 0) {
const error = el.querySelector('#liveMediaError');
if (error) error.textContent = '请至少添加一个资源';
return;
}
const medias = [];
for (let i = 0; i < groups.length; i++) {
const group = groups[i];
const name = group.querySelector('.media-name').value.trim();
const url = group.querySelector('.media-url').value.trim();
if (!name || !url) {
const error = el.querySelector('#liveMediaError');
if (error) error.textContent = '所有字段都必须填写';
return;
}
medias.push({ name: name, path_type: 'm3u8', path_url: url });
}
liveMediaSubmit.disabled = true;
liveMediaSubmit.textContent = '提交中...';
try {
let apiUrl = '/api/live/media';
let body;
if (medias.length === 1) {
body = {
live_list_id: liveState.currentChannel.id,
name: medias[0].name,
path_type: medias[0].path_type,
path_url: medias[0].path_url
};
} else {
apiUrl += '/update';
body = {
live_list_id: liveState.currentChannel.id,
medias: medias
};
}
const response = await window.fetchWithAuth(apiUrl, {
method: 'POST',
body: JSON.stringify(body)
});
if (!response) return;
if (!response.ok) throw new Error('添加失败');
window.showToast('添加成功');
const modal = el.querySelector('#addLiveMediaModal');
if (modal) modal.classList.remove('show');
if (liveState.currentChannel) {
showLiveDetail(liveState.currentChannel);
}
} catch (err) {
const error = el.querySelector('#liveMediaError');
if (error) error.textContent = err.message;
} finally {
liveMediaSubmit.disabled = false;
liveMediaSubmit.textContent = '提交';
}
});
}
const closeAddLiveMediaModal = el.querySelector('#closeAddLiveMediaModal');
if (closeAddLiveMediaModal) {
closeAddLiveMediaModal.addEventListener('click', () => {
const modal = el.querySelector('#addLiveMediaModal');
if (modal) modal.classList.remove('show');
});
}
const liveMediaCancel = el.querySelector('#liveMediaCancel');
if (liveMediaCancel) {
liveMediaCancel.addEventListener('click', () => {
const modal = el.querySelector('#addLiveMediaModal');
if (modal) modal.classList.remove('show');
});
}
const deleteLiveChannelBtn = el.querySelector('#deleteLiveChannelBtn');
if (deleteLiveChannelBtn) {
deleteLiveChannelBtn.addEventListener('click', async () => {
if (!liveState.currentChannel) return;
if (confirm('确定要删除该直播频道吗？此操作不可撤销。')) {
try {
const response = await window.fetchWithAuth('/api/live/list/' + liveState.currentChannel.id, {
method: 'DELETE'
});
if (!response) return;
if (!response.ok) throw new Error('删除失败');
window.showToast('删除成功');
if (liveDetailBackBtn) liveDetailBackBtn.click();
loadLiveChannels(true);
} catch (err) {
window.showToast(err.message);
}
}
});
}
// 视图切换按钮
const videoTabBtn = el.querySelector('#videoTabBtn');
const liveTabBtn = el.querySelector('#liveTabBtn');
if (videoTabBtn && liveTabBtn) {
videoTabBtn.addEventListener('click', () => {
videoTabBtn.classList.remove('tab-btn');
videoTabBtn.classList.add('page-title');
liveTabBtn.classList.remove('page-title');
liveTabBtn.classList.add('tab-btn');
switchToVideo();
});
liveTabBtn.addEventListener('click', () => {
liveTabBtn.classList.remove('tab-btn');
liveTabBtn.classList.add('page-title');
videoTabBtn.classList.remove('page-title');
videoTabBtn.classList.add('tab-btn');
switchToLive();
});
}
// 收藏模态框事件
const closeFavoriteModalBtn = el.querySelector('#closeFavoriteModal');
if (closeFavoriteModalBtn) closeFavoriteModalBtn.addEventListener('click', closeFavoriteModal);
const favoriteCancel = el.querySelector('#favoriteCancel');
if (favoriteCancel) favoriteCancel.addEventListener('click', closeFavoriteModal);
const favoriteModal = el.querySelector('#favoriteModal');
if (favoriteModal) favoriteModal.addEventListener('click', (e) => { if (e.target === favoriteModal) closeFavoriteModal(); });
const favoriteSearchInput = el.querySelector('#favoriteSearchInput');
if (favoriteSearchInput) {
let debounceTimer;
favoriteSearchInput.addEventListener('input', () => {
clearTimeout(debounceTimer);
debounceTimer = setTimeout(() => {
filterWatchlists(favoriteSearchInput.value);
}, 300);
});
}
const favoriteSearchBtn = el.querySelector('#favoriteSearchBtn');
if (favoriteSearchBtn) favoriteSearchBtn.addEventListener('click', () => filterWatchlists(favoriteSearchInput.value));
const favoriteConfirmBtn = el.querySelector('#favoriteConfirm');
if (favoriteConfirmBtn) favoriteConfirmBtn.addEventListener('click', confirmFavorite);
// 浮动搜索按钮（移动端）
const floatingSearchBtn = el.querySelector('#floatingSearchBtn');
if (floatingSearchBtn) {
floatingSearchBtn.addEventListener('click', () => {
const searchContainer = el.querySelector('#searchContainer');
if (searchContainer) searchContainer.scrollIntoView({ behavior: 'smooth' });
});
}
}
// ==================== 页面生命周期 ====================
let initialized = false;
function init() {
if (initialized) return;
el.innerHTML = renderStructure();
bindEvents();
if (currentView === 'video') {
loadVideos(true);
} else {
loadLiveChannels(true);
}
initialized = true;
}
const onShow = (path) => {
if (!initialized) init();
};
const onHide = () => {
const currentTab = (el.querySelector('#liveView').style.display === 'block') ? 'live' : 'video';
window.PageState.set('/media', { ...window.PageState.get('/media'), tab: currentTab });
};
init();
return { el, onShow, onHide };
}
`;

// ==================== 视频详情页面模块 ====================
const PAGE_DETAIL_JS = `
export default async function DetailPage(path) {
const pathname = path.split('?')[0];
const videoId = pathname.split('/')[2];
const el = document.createElement('div');

// 全局状态
let isUploading = false;
let currentVideo = null;
let currentVideoType = null;
let currentVideoListId = null;
let currentEpisodeId = null;
let currentSubtitleMediaId = null;
let currentItemType = null;
let currentUploadController = null;
let pendingDeleteMediaId = null;

let trailerTimer = null;
let isTrailerLoaded = false;

const urlParams = new URLSearchParams(window.location.search);
const from = urlParams.get('from');
const watchId = urlParams.get('watch_id');

// ==================== 辅助函数 ====================
function enhanceImageUrl(url) {
if (!url) return url;
const originalPattern = /\\/(?:w\\d+|original)(\\/|$)/;
if (originalPattern.test(url)) { return url.replace(originalPattern, '/original/'); }
return url;
}

// ==================== 预告片控制函数 ====================
function playTrailer(embedUrl) {
const container = el.querySelector('#detailTrailerContainer');
const iframe = el.querySelector('#detailTrailerIframe');
if (!container || !iframe) return;

iframe.src = embedUrl;
container.style.display = 'block';
requestAnimationFrame(() => container.classList.add('visible'));
isTrailerLoaded = true;
}

function clearTrailerTimeout() {
if (trailerTimer) { clearTimeout(trailerTimer); trailerTimer = null; }
}

// ==================== 上传相关 ====================
async function handleVideoFile(file) {
if (!currentItemType || !currentEpisodeId) { window.showToast('未选择上传目标'); return; }
isUploading = true;
const progressDiv = el.querySelector('#uploadProgress');
if (progressDiv) progressDiv.style.display = 'block';
const progressFill = el.querySelector('#progressFill');
const progressText = el.querySelector('#progressText');
if (progressFill) progressFill.style.width = '0%';
if (progressText) progressText.textContent = '0%';
try {
await window.EmosUpload.upload(file, { type: 'video', itemType: currentItemType, itemId: currentEpisodeId,
onProgress: (loaded, total) => { const percent = Math.round((loaded / total) * 100); if (progressFill) progressFill.style.width = percent + '%'; if (progressText) progressText.textContent = percent + '%'; },
signal: currentUploadController ? currentUploadController.signal : null });
currentUploadController = null;
const modal = el.querySelector('#uploadModal');
if (modal) modal.classList.remove('show');
if (currentItemType === 've') {
if (el.querySelector('#episodeMediaModal')?.classList.contains('show') && currentEpisodeId) openEpisodeMediaModal(currentVideoListId, currentEpisodeId);
if (currentVideo) loadEpisodes(currentVideo.video_id);
} else if (currentItemType === 'vl') { loadMediaList(currentVideoListId); }
window.showToast('上传成功');
} catch (err) {
if (err.message === '上传已取消') window.showToast('上传已取消');
else { console.error(err); window.showToast('上传失败：' + err.message); }
currentUploadController = null;
const progressDiv = el.querySelector('#uploadProgress');
if (progressDiv) progressDiv.style.display = 'none';
} finally { isUploading = false; currentUploadController = null; const progressDiv = el.querySelector('#uploadProgress'); if (progressDiv) progressDiv.style.display = 'none'; }
}

async function handleSubtitleFile(file) {
const context = window._currentSubtitleContext;
if (!context || !context.itemType || !context.itemId) { window.showToast('未选择资源或缺少必要参数'); return; }
const progressDiv = el.querySelector('#subtitleUploadProgress');
if (progressDiv) progressDiv.style.display = 'block';
const progressFill = el.querySelector('#subtitleProgressFill');
const progressText = el.querySelector('#subtitleProgressText');
if (progressFill) progressFill.style.width = '0%';
if (progressText) progressText.textContent = '0%';
try {
await window.EmosUpload.upload(file, { type: 'subtitle', itemType: context.itemType, itemId: context.itemId,
onProgress: (loaded, total) => { const percent = Math.round((loaded / total) * 100); if (progressFill) progressFill.style.width = percent + '%'; if (progressText) progressText.textContent = percent + '%'; } });
if (context.videoListId && context.mediaId) loadSubtitleList(context.videoListId, context.episodeId, context.mediaId);
if (progressDiv) progressDiv.style.display = 'none';
const fileInput = el.querySelector('#subtitleFileInput');
if (fileInput) fileInput.value = '';
} catch (err) { console.error(err); window.showToast('上传失败：' + err.message); if (progressDiv) progressDiv.style.display = 'none'; }
}

// ==================== 加载详情数据 ====================
async function loadVideoDetail() {
try {
const response = await window.fetchWithAuth('/api/video/list?video_id=' + videoId);
if (!response) return;
const data = await response.json();
const videoDetail = data.items && data.items[0] ? data.items[0] : data;
if (!videoDetail) throw new Error('未找到视频');
await fillVideoDetail(videoDetail);
if (videoDetail.video_type === 'tv') await loadEpisodes(videoDetail.video_id);
else await loadMediaList(videoDetail.video_id);
} catch (err) { console.error(err); window.showToast('加载视频详情失败'); el.innerHTML = '<div class="no-results">加载失败，<a href="javascript:history.back()">返回</a></div>'; }
}

async function fillVideoDetail(video) {
currentVideo = video;
currentVideoType = video.video_type;
currentVideoListId = video.video_id;

let bgUrl = video.video_image_backdrop || video.video_image_poster;
if (bgUrl) { const bgDiv = el.querySelector('#detailBg'); if (bgDiv) bgDiv.style.backgroundImage = 'url("' + enhanceImageUrl(bgUrl) + '")'; }

clearTrailerTimeout();
const isDesktop = window.innerWidth > 768;
if (isDesktop) {
  trailerTimer = setTimeout(async () => {
    if (!video.tmdb_id || isTrailerLoaded) return;
    const mediaType = video.video_type === 'movie' ? 'movie' : 'tv';
    try {
      const res = await fetch('/api/tmdb/trailer?tmdb_id=' + video.tmdb_id + '&media_type=' + mediaType);
      if (!res.ok) return;
      const data = await res.json();
      if (data.embed_url) playTrailer(data.embed_url);
    } catch (e) { console.warn('Trailer load failed:', e); }
  }, 3000);
}

// 移动端 TMDB 背景图兜底
const isMobile = window.innerWidth <= 768;
if (isMobile && video.tmdb_id) {
const mediaType = video.video_type === 'movie' ? 'movie' : 'tv';
const tmdbBackdrop = await fetchTmdbBackdrop(video.tmdb_id, mediaType);
if (tmdbBackdrop) { const bgDiv = el.querySelector('#detailBg'); if (bgDiv) bgDiv.style.backgroundImage = 'url("' + tmdbBackdrop + '")'; }
}

// 标题 Logo
const titleLogo = el.querySelector('#detailTitleLogo');
const detailTitle = el.querySelector('#detailTitle');
if (video.video_image_logo) {
if (titleLogo) { titleLogo.src = enhanceImageUrl(video.video_image_logo); titleLogo.style.display = 'block'; }
if (detailTitle) detailTitle.style.display = 'none';
} else {
if (titleLogo) titleLogo.style.display = 'none';
if (detailTitle) { detailTitle.style.display = 'block'; detailTitle.textContent = video.video_title || '无标题'; }
}

// 发布日期
const releaseDate = el.querySelector('#detailReleaseDate');
if (video.video_date_air) {
const date = new Date(video.video_date_air);
const year = date.getFullYear();
const month = (date.getMonth() + 1).toString().padStart(2, '0');
const day = date.getDate().toString().padStart(2, '0');
if (releaseDate) releaseDate.innerHTML = '<i class="fas fa-calendar-alt"></i> ' + year + '-' + month + '-' + day;
} else { if (releaseDate) releaseDate.innerHTML = ''; }

// 类型标签
const genresContainer = el.querySelector('#detailGenres');
if (genresContainer) {
genresContainer.innerHTML = '';
if (video.genres && video.genres.length > 0) { video.genres.forEach(g => { const badge = document.createElement('span'); badge.className = 'genre-badge'; badge.textContent = g.name; genresContainer.appendChild(badge); }); }
else { genresContainer.innerHTML = '<span class="genre-badge">未知</span>'; }
}

// 评分
const ratingSpan = el.querySelector('#detailRating');
if (video.vote_average) { const rating = (video.vote_average / 2).toFixed(1); if (ratingSpan) ratingSpan.innerHTML = '<i class="fas fa-star" style="color:var(--warning-color);"></i> ' + rating + ' (' + video.vote_count + ')'; }
else { if (ratingSpan) ratingSpan.innerHTML = ''; }

// 时长
const durationSpan = el.querySelector('#detailDuration');
if (video.video_type === 'movie' && video.runtime) { if (durationSpan) durationSpan.innerHTML = '<i class="fas fa-clock"></i> ' + window.formatDuration(video.runtime * 60); }
else { if (durationSpan) durationSpan.innerHTML = ''; }

// 简介
const descSpan = el.querySelector('#detailDescription');
const desc = video.video_description || '暂无简介';
if (descSpan) {
const newDescSpan = descSpan.cloneNode(true); descSpan.parentNode.replaceChild(newDescSpan, descSpan);
const descElement = el.querySelector('#detailDescription');
descElement.textContent = desc; descElement.dataset.full = desc;
if (desc.length > 200) {
descElement.style.cursor = 'pointer'; descElement.title = '点击展开/收起'; descElement.textContent = desc.substring(0, 200) + '...';
descElement.addEventListener('click', function() { if (this.classList.contains('expanded')) { this.classList.remove('expanded'); this.textContent = desc.substring(0, 200) + '...'; } else { this.classList.add('expanded'); this.textContent = desc; } });
} else { descElement.style.cursor = 'default'; descElement.textContent = desc; }
}

// 资源/求片数量
const mediaCountSpan = el.querySelector('#detailMediaCount'); if (mediaCountSpan) mediaCountSpan.textContent = video.medias_count || 0;
const requestCountSpan = el.querySelector('#detailRequestCount'); if (requestCountSpan) requestCountSpan.textContent = video.request_count || 0;
const todbSpan = el.querySelector('#detailTodbId'); if (todbSpan) { const topId = video.video_type === 'movie' ? (video.item_id || 'vl-' + video.video_id) : video.todb_id; todbSpan.textContent = window.escapeHtml(topId); }

// 资源标题 & 按钮状态
const resourceTitle = el.querySelector('.detail-resource-section .section-title');
if (resourceTitle) resourceTitle.textContent = video.video_type === 'tv' ? '季列表' : '资源列表';
const movieUploadBtn = el.querySelector('#movieUploadBtn');
if (movieUploadBtn) { movieUploadBtn.style.display = video.video_type === 'movie' ? 'inline-flex' : 'none'; }
const syncTvBtn = el.querySelector('#syncTvBtn');
if (syncTvBtn) { syncTvBtn.style.display = video.video_type === 'tv' ? 'inline-flex' : 'none'; }

// 求片按钮
const seekLargeBtn = el.querySelector('#seekLargeBtn');
if (seekLargeBtn) {
const isRequested = video.seek_is_request === true;
seekLargeBtn.classList.toggle('active', isRequested);
seekLargeBtn.innerHTML = isRequested ? '<i class="fas fa-heart-broken"></i> 取消求片' : '<i class="fas fa-heart"></i> 求片';
seekLargeBtn.replaceWith(seekLargeBtn.cloneNode(true));
el.querySelector('#seekLargeBtn').addEventListener('click', handleSeek);
}

// 同步剧集
if (syncTvBtn) {
syncTvBtn.addEventListener('click', async () => {
const tmdbId = video.tmdb_id;
if (!tmdbId) { window.showToast('无法获取 TMDB ID，无法同步'); return; }
try {
const response = await window.fetchWithAuth('/api/video/sync?tmdb_id=' + tmdbId, { method: 'PATCH' });
if (!response) return; if (!response.ok) throw new Error('同步请求失败');
window.showToast('同步任务已提交，预计一分钟内完成');
} catch (err) { window.showToast('同步失败：' + err.message); }
});
}
}

async function handleSeek(event) {
const btn = event.currentTarget;
const originalHtml = btn.innerHTML;
btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
const response = await window.fetchWithAuth('/api/seek/apply?item_type=vl&item_id=' + currentVideo.video_id, { method: 'PUT' });
if (!response) return;
const data = await response.json();
const newState = data.seek_is_request;
btn.classList.toggle('active', newState);
btn.innerHTML = newState ? '<i class="fas fa-heart-broken"></i> 取消求片' : '<i class="fas fa-heart"></i> 求片';
const countSpan = el.querySelector('#detailRequestCount');
if (countSpan) { let c = parseInt(countSpan.innerText, 10) || 0; countSpan.innerText = newState ? c + 1 : c - 1; }
if (currentVideoType === 'tv') loadEpisodes(currentVideo.video_id);
window.showToast(newState ? '求片成功' : '已取消求片');
} catch (err) { window.showToast(err.message); btn.innerHTML = originalHtml; } finally { btn.disabled = false; }
}

async function loadEpisodes(vid) {
const detailContentContainer = el.querySelector('#detailContentContainer');
if (detailContentContainer) detailContentContainer.innerHTML = '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
try {
const response = await window.fetchWithAuth('/api/video/' + vid + '/episode?with_seek=1&with_seek_is_request=1');
if (!response) return; renderEpisodes(await response.json(), vid);
} catch (err) { console.error(err); if (detailContentContainer) detailContentContainer.innerHTML = '<div class="no-resources">剧集加载失败</div>'; }
}

function renderEpisodes(episodes, vid) {
if (!episodes || episodes.length === 0) { const container = el.querySelector('#detailContentContainer'); if (container) container.innerHTML = '<div class="no-resources">暂无剧集</div>'; return; }
let totalMedias = 0, totalRequests = 0;
episodes.forEach(ep => { totalMedias += ep.medias_count || 0; if (ep.seek && ep.seek.request_count) totalRequests += ep.seek.request_count; });
const mediaCountSpan = el.querySelector('#detailMediaCount'); if (mediaCountSpan) mediaCountSpan.textContent = totalMedias;
const requestCountSpan = el.querySelector('#detailRequestCount'); if (requestCountSpan) requestCountSpan.textContent = totalRequests;
const seasonsMap = new Map();
episodes.forEach(ep => {
const sid = ep.season_id; if (!seasonsMap.has(sid)) seasonsMap.set(sid, { season_id: sid, season_number: ep.season_number, season_title: ep.season_number === 0 ? '特别篇' : '第 ' + ep.season_number + ' 季', episodes: [] });
seasonsMap.get(sid).episodes.push(ep);
});
const seasons = Array.from(seasonsMap.values()).sort((a,b) => a.season_number - b.season_number);
let html = '';
seasons.forEach(season => {
const epCount = season.episodes.length;
const isComplete = season.episodes.every(ep => (ep.medias_count || 0) > 0);
html += '<div class="season-item"><div class="season-header"><div class="season-header-left"><i class="fas fa-chevron-right"></i><span>' + window.escapeHtml(season.season_title) + '</span><span class="episode-count">' + epCount + '集</span></div><span class="status-dot" style="background-color: ' + (isComplete ? 'var(--success-color)' : 'var(--danger-color)') + ';"></span></div><div class="episode-list"><div class="info-list">';
season.episodes.forEach(ep => {
const epDate = ep.date_air ? ep.date_air.substring(0,10) : '';
const episodeIndex = String(ep.episode_number || '?');
const isSeek = ep.with_seek_is_request || false;
const seekBtnClass = isSeek ? 'action-btn seek-active' : 'action-btn';

const titleText = (ep.episode_title ? window.escapeHtml(ep.episode_title) : '第 ' + ep.episode_number + ' 集');
const displayTitle = episodeIndex + '、' + titleText;

html += '<div class="info-list-item episode-item" data-episode-id="' + ep.episode_id + '" data-video-list-id="' + vid + '">' +
        // Removed: <div class="info-list-index">' + episodeIndex + '</div>
        '<div class="info-list-left"><div class="info-list-title">' + displayTitle + '</div><div class="info-list-desc">' + (epDate ? '<span>' + window.escapeHtml(epDate) + '</span>' : '') + '<span class="copy-tag" data-copy="' + window.escapeHtml(ep.item_id) + '">' + window.escapeHtml(ep.item_id) + '</span></div></div>' +
        '<div class="info-list-right"><button class="action-btn upload-btn" data-episode-id="' + ep.episode_id + '"><i class="fas fa-upload"></i></button><button class="' + seekBtnClass + ' seek-btn" data-episode-id="' + ep.episode_id + '"><i class="fas fa-heart"></i></button><span class="resource-count">' + (ep.medias_count || 0) + '</span></div></div>';
});
html += '</div></div></div>';
});
const container = el.querySelector('#detailContentContainer');
if (container) container.innerHTML = html;
el.querySelectorAll('.season-header').forEach(h => h.addEventListener('click', () => { h.nextElementSibling.classList.toggle('show'); h.classList.toggle('open'); }));
el.querySelectorAll('.copy-tag').forEach(t => t.addEventListener('click', e => { e.stopPropagation(); window.copyText(t.dataset.copy); }));
el.querySelectorAll('.episode-item').forEach(i => i.addEventListener('click', e => { if (!e.target.closest('.action-btn') && !e.target.closest('.copy-tag')) { openEpisodeMediaModal(i.dataset.videoListId, i.dataset.episodeId); } }));
el.querySelectorAll('.upload-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openVideoUploadModal('ve', b.dataset.episodeId, vid); }));
el.querySelectorAll('.seek-btn').forEach(b => b.addEventListener('click', async e => { e.stopPropagation(); await toggleSeek(b.dataset.episodeId, b); }));
}

async function loadMediaList(vid) {
const container = el.querySelector('#detailContentContainer');
if (container) container.innerHTML = '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
try {
const response = await window.fetchWithAuth('/api/video/media/list?video_list_id=' + encodeURIComponent(vid));
if (!response) return; renderMediaList(await response.json(), vid);
} catch (err) { console.error(err); if (container) container.innerHTML = '<div class="no-resources">资源加载失败</div>'; }
}

function renderMediaList(items, vid) {
let html = '<div class="info-list">';
if (items && items.length > 0) {
items.forEach(m => {
const size = window.formatBytes(m.media_file_size);
const dur = m.media_file_second ? window.formatDuration(m.media_file_second) : '--:--';
const date = new Date(m.created_at).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
html += '<div class="info-list-item" data-media-id="' + m.media_id + '" data-media-name="' + window.escapeHtml(m.media_name) + '" data-is-self-upload="' + (m.is_self_upload !== false) + '"><div class="info-list-left"><div class="info-list-title">' + window.escapeHtml(m.media_name || '未命名') + '</div><div class="info-list-desc"><span><i class="fas fa-hdd"></i> ' + size + '</span><span><i class="far fa-clock"></i> ' + dur + '</span><span><i class="far fa-calendar"></i> ' + date + '</span></div></div><div class="info-list-right"><button class="action-btn subtitle-btn" data-media-id="' + m.media_id + '"><i class="fas fa-closed-captioning"></i></button><button class="action-btn rename-btn" data-media-id="' + m.media_id + '" data-media-name="' + window.escapeHtml(m.media_name) + '"><i class="fas fa-edit"></i></button><button class="action-btn move-btn" data-media-id="' + m.media_id + '"><i class="fas fa-exchange-alt"></i></button><button class="action-btn delete-btn" data-media-id="' + m.media_id + '"><i class="fas fa-trash-alt"></i></button></div></div>';
});
} else { html += '<div class="no-resources">暂无资源</div>'; }
html += '</div>';
const container = el.querySelector('#detailContentContainer');
if (container) container.innerHTML = html;
el.querySelectorAll('.subtitle-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openSubtitleModal(b.dataset.mediaId, vid, null, 'vl', vid); }));
el.querySelectorAll('.rename-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openRenameModal(b.dataset.mediaId, b.dataset.mediaName); }));
el.querySelectorAll('.move-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openMoveModal(b.dataset.mediaId); }));
el.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openDeleteConfirmModal(b.dataset.mediaId, b.closest('.info-list-item').dataset.mediaName, b.closest('.info-list-item').dataset.isSelfUpload === 'true'); }));
}

// ==================== 模态框控制逻辑 ====================
async function openEpisodeMediaModal(vid, epId) {
currentEpisodeId = epId; currentVideoListId = vid;
const modal = el.querySelector('#episodeMediaModal');
const content = el.querySelector('#episodeMediaContent');
if (content) content.innerHTML = '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
if (modal) modal.classList.add('show');
try {
const res = await window.fetchWithAuth('/api/video/media/list?video_list_id=' + encodeURIComponent(vid) + '&video_episode_id=' + encodeURIComponent(epId));
if (!res) return;
renderEpisodeMediaList(await res.json());
} catch (err) { console.error(err); if (content) content.innerHTML = '<div class="no-resources">资源加载失败</div>'; }
}

function renderEpisodeMediaList(items) {
const content = el.querySelector('#episodeMediaContent');
if (!content) return;
if (!items || items.length === 0) { content.innerHTML = '<div class="no-resources">暂无资源</div>'; return; }
let html = '';
items.forEach(m => {
html += '<div class="info-list-item" data-media-id="' + m.media_id + '" data-media-name="' + window.escapeHtml(m.media_name) + '" data-is-self-upload="' + (m.is_self_upload !== false) + '"><div class="info-list-left"><div class="info-list-title">' + window.escapeHtml(m.media_name || '未命名') + '</div><div class="info-list-desc"><span><i class="fas fa-hdd"></i> ' + window.formatBytes(m.media_file_size) + '</span><span><i class="far fa-clock"></i> ' + (m.media_file_second ? window.formatDuration(m.media_file_second) : '--:--') + '</span></div></div><div class="info-list-right"><button class="action-btn subtitle-btn" data-media-id="' + m.media_id + '"><i class="fas fa-closed-captioning"></i></button><button class="action-btn rename-btn" data-media-id="' + m.media_id + '" data-media-name="' + window.escapeHtml(m.media_name) + '"><i class="fas fa-edit"></i></button><button class="action-btn move-btn" data-media-id="' + m.media_id + '"><i class="fas fa-exchange-alt"></i></button><button class="action-btn delete-btn" data-media-id="' + m.media_id + '"><i class="fas fa-trash-alt"></i></button></div></div>';
});
content.innerHTML = html;
content.querySelectorAll('.subtitle-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openSubtitleModal(b.dataset.mediaId, currentVideoListId, currentEpisodeId, 've', currentEpisodeId); }));
content.querySelectorAll('.rename-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openRenameModal(b.dataset.mediaId, b.dataset.mediaName); }));
content.querySelectorAll('.move-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openMoveModal(b.dataset.mediaId); }));
content.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openDeleteConfirmModal(b.dataset.mediaId, b.closest('.info-list-item').dataset.mediaName, b.closest('.info-list-item').dataset.isSelfUpload === 'true'); }));
}

function openVideoUploadModal(type, id, vid) { currentItemType = type; currentEpisodeId = id; currentVideoListId = vid; currentUploadController = new AbortController(); const modal = el.querySelector('#uploadModal'); if (modal) modal.classList.add('show'); const p = el.querySelector('#uploadProgress'); if (p) p.style.display = 'none'; const f = el.querySelector('#progressFill'); if (f) f.style.width = '0%'; const t = el.querySelector('#progressText'); if (t) t.textContent = '0%'; const inp = el.querySelector('#fileInput'); if (inp) inp.value = ''; }

async function openSubtitleModal(mid, vlId, epId, type, id) { currentSubtitleMediaId = mid; const modal = el.querySelector('#subtitleModal'); if (modal) modal.classList.add('show'); const p = el.querySelector('#subtitleUploadProgress'); if (p) p.style.display = 'none'; const inp = el.querySelector('#subtitleFileInput'); if (inp) inp.value = ''; await loadSubtitleList(vlId, epId, mid); window._currentSubtitleContext = { videoListId: vlId, episodeId: epId, mediaId: mid, itemType: type, itemId: id }; }

async function loadSubtitleList(vlId, epId, mid) {
const container = el.querySelector('#subtitleListContainer'); if (!container) return; container.innerHTML = '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
try { let url = '/api/video/subtitle/list?video_list_id=' + encodeURIComponent(vlId); if (epId) url += '&video_episode_id=' + encodeURIComponent(epId); if (mid) url += '&video_media_id=' + encodeURIComponent(mid); const res = await window.fetchWithAuth(url); if (!res) return; renderSubtitleList(await res.json()); } catch (err) { console.error(err); container.innerHTML = '<div class="no-resources">加载失败</div>'; }
}

function renderSubtitleList(items) {
const container = el.querySelector('#subtitleListContainer'); if (!container) return;
if (!items || items.length === 0) { container.innerHTML = '<div class="no-resources">暂无字幕</div>'; return; }
let html = '<div class="info-list">';
items.forEach(s => { html += '<div class="info-list-item" data-subtitle-id="' + s.subtitle_id + '" data-subtitle-title="' + window.escapeHtml(s.subtitle_title || '未命名') + '"><div class="info-list-left"><div class="info-list-title">' + window.escapeHtml(s.subtitle_title || '未命名') + '</div><div class="info-list-desc"><span><i class="fas fa-code"></i> ' + window.escapeHtml(s.subtitle_codec || '未知') + '</span><span><i class="far fa-calendar"></i> ' + new Date(s.created_at).toLocaleDateString('zh-CN') + '</span></div></div><div class="info-list-right"><button class="action-btn rename-subtitle-btn" data-subtitle-id="' + s.subtitle_id + '" data-subtitle-title="' + window.escapeHtml(s.subtitle_title || '未命名') + '"><i class="fas fa-edit"></i></button><button class="action-btn delete-subtitle-btn" data-subtitle-id="' + s.subtitle_id + '"><i class="fas fa-trash-alt"></i></button></div></div>'; });
html += '</div>'; container.innerHTML = html;
container.querySelectorAll('.rename-subtitle-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openSubtitleRenameModal(b.dataset.subtitleId, b.dataset.subtitleTitle); }));
container.querySelectorAll('.delete-subtitle-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (confirm('确定删除？')) deleteSubtitle(b.dataset.subtitleId); }));
}

function openSubtitleRenameModal(id, title) {
const modal = el.querySelector('#renameModal'); const inp = el.querySelector('#renameInput'); const err = el.querySelector('#renameError');
if (inp) inp.value = title || ''; if (err) err.textContent = ''; if (modal) modal.classList.add('show');
const btn = el.querySelector('#renameSubmit'); const old = btn.onclick;
btn.onclick = async () => { const n = inp.value.trim(); if (n.length < 1 || n.length > 200) { if (err) err.textContent = '名称长度需在 1-200 字符之间'; return; } btn.disabled = true; btn.textContent = '处理中...'; try { const res = await window.fetchWithAuth('/api/video/subtitle/rename?subtitle_id=' + encodeURIComponent(id) + '&title=' + encodeURIComponent(n), { method: 'PUT' }); if (!res) return; if (!res.ok) throw new Error('重命名失败'); window.showToast('成功'); modal.classList.remove('show'); const ctx = window._currentSubtitleContext; if (ctx) loadSubtitleList(ctx.videoListId, ctx.episodeId, ctx.mediaId); } catch (e) { if (err) err.textContent = e.message; } finally { btn.disabled = false; btn.textContent = '确认'; btn.onclick = old; } };
}

async function deleteSubtitle(id) { try { const res = await window.fetchWithAuth('/api/video/subtitle/delete?subtitle_id=' + encodeURIComponent(id), { method: 'DELETE' }); if (!res) return; if (!res.ok) throw new Error('失败'); window.showToast('成功'); const ctx = window._currentSubtitleContext; if (ctx) loadSubtitleList(ctx.videoListId, ctx.episodeId, ctx.mediaId); } catch (e) { window.showToast(e.message); } }

function openRenameModal(id, name) { const modal = el.querySelector('#renameModal'); const inp = el.querySelector('#renameInput'); const err = el.querySelector('#renameError'); if (inp) inp.value = name || ''; if (err) err.textContent = ''; if (modal) modal.classList.add('show'); const btn = el.querySelector('#renameSubmit'); const old = btn.onclick; btn.onclick = async () => { const n = inp.value.trim(); if (n.length < 3 || n.length > 200) { if (err) err.textContent = '名称长度需在 3-200 字符之间'; return; } btn.disabled = true; btn.textContent = '处理中...'; try { const res = await window.fetchWithAuth('/api/video/media/rename?media_id=' + encodeURIComponent(id) + '&name=' + encodeURIComponent(n), { method: 'PUT' }); if (!res) return; if (!res.ok) throw new Error('失败'); window.showToast('成功'); modal.classList.remove('show'); if (currentVideoType === 'tv' && currentEpisodeId) openEpisodeMediaModal(currentVideoListId, currentEpisodeId); else if (currentVideoListId) loadMediaList(currentVideoListId); } catch (e) { if (err) err.textContent = e.message; } finally { btn.disabled = false; btn.textContent = '确认'; btn.onclick = old; } }; }

function openMoveModal(id) { const modal = el.querySelector('#moveModal'); const inp = el.querySelector('#moveInput'); const err = el.querySelector('#moveError'); if (inp) inp.value = ''; if (err) err.textContent = ''; if (modal) modal.classList.add('show'); const btn = el.querySelector('#moveSubmit'); const old = btn.onclick; btn.onclick = async () => { const t = inp.value.trim(); if (!t) { if (err) err.textContent = '请输入目标 ID'; return; } if (!t.match(/^(ve|vl)-\\d+$/)) { if (err) err.textContent = 'ID 格式应为 ve-xxx 或 vl-xxx'; return; } btn.disabled = true; btn.textContent = '处理中...'; try { const res = await window.fetchWithAuth('/api/video/media/move?media_id=' + encodeURIComponent(id) + '&item_type=' + t.split('-')[0] + '&item_id=' + t.split('-')[1], { method: 'PUT' }); if (!res) return; if (!res.ok) throw new Error('失败'); window.showToast('成功'); modal.classList.remove('show'); if (currentVideoType === 'tv' && currentEpisodeId) openEpisodeMediaModal(currentVideoListId, currentEpisodeId); else if (currentVideoListId) loadMediaList(currentVideoListId); } catch (e) { if (err) err.textContent = e.message; } finally { btn.disabled = false; btn.textContent = '确认'; btn.onclick = old; } }; }

async function deleteMedia(id, reason = null) { const res = await window.fetchWithAuth('/api/video/media/delete', { method: 'DELETE', body: JSON.stringify({ media_id: id, reason }) }); if (!res) throw new Error('Unauthorized'); if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || '删除失败'); } return await res.json(); }

async function toggleSeek(id, btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; try { const res = await window.fetchWithAuth('/api/seek/apply?item_type=ve&item_id=' + id, { method: 'PUT' }); if (!res) return; if (!res.ok) throw new Error('失败'); const d = await res.json(); btn.dataset.seekActive = d.seek_is_request; btn.className = 'action-btn seek-btn ' + (d.seek_is_request ? 'seek-active' : ''); window.showToast(d.seek_is_request ? '点播成功' : '已取消点播'); } catch (e) { window.showToast(e.message); } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-heart"></i>'; } }

function backToList() { if (from === 'watch' && watchId) window.navigate('/watchlist?watch_id=' + watchId); else window.history.back(); }
async function fetchTmdbBackdrop(id, type) { if (!id) return null; try { const res = await fetch('/api/tmdb/backdrop?tmdb_id=' + encodeURIComponent(id) + '&media_type=' + encodeURIComponent(type)); if (!res.ok) return null; const d = await res.json(); return d.backdrop_url || null; } catch { return null; } }

// ==================== 删除确认 ====================
function openDeleteConfirmModal(id, name, self) {
pendingDeleteMediaId = id;
const modal = el.querySelector('#deleteConfirmModal'); const txt = el.querySelector('#deleteConfirmText'); const group = el.querySelector('#deleteReasonGroup'); const inp = el.querySelector('#deleteReason'); const err = el.querySelector('#deleteError');
if (txt) txt.textContent = '确定删除"' + window.escapeHtml(name) + '"吗？此操作不可撤销。';
if (group && inp) { if (!self) { group.style.display = 'block'; inp.value = ''; inp.required = true; } else { group.style.display = 'none'; inp.value = ''; inp.required = false; } }
if (err) err.textContent = '';
if (modal) modal.classList.add('show');
}
function closeDeleteModal() { const modal = el.querySelector('#deleteConfirmModal'); if (modal) modal.classList.remove('show'); pendingDeleteMediaId = null; }
async function confirmDelete() {
if (!pendingDeleteMediaId) return;
const group = el.querySelector('#deleteReasonGroup'); const inp = el.querySelector('#deleteReason'); const err = el.querySelector('#deleteError'); const btn = el.querySelector('#deleteConfirm');
let reason = null;
if (group && group.style.display !== 'none') { reason = inp ? inp.value.trim() : null; if (!reason) { if (err) err.textContent = '删除他人资源必须填写原因'; return; } if (reason.length > 50) { if (err) err.textContent = '原因不能超过 50 字'; return; } }
if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div>'; }
try { await deleteMedia(pendingDeleteMediaId, reason); window.showToast('成功'); closeDeleteModal(); if (currentVideoType === 'tv' && currentEpisodeId) openEpisodeMediaModal(currentVideoListId, currentEpisodeId); else if (currentVideoListId) loadMediaList(currentVideoListId); } catch (e) { if (err) err.textContent = e.message; window.showToast(e.message); } finally { if (btn) { btn.disabled = false; btn.innerHTML = '确认删除'; } }
}

// ==================== 渲染页面结构 ====================
function renderStructure() {
return \`
<div class="video-detail-page">
<div id="detailSkeleton" class="detail-skeleton-container">
<div class="detail-hero"><div class="detail-bg skeleton-bg"></div><div class="detail-gradient"></div><div class="back-btn skeleton-btn"><i class="fas fa-arrow-left"></i></div><div class="detail-hero-content"><div class="detail-title-container"><div class="skeleton-line skeleton-title-line"></div></div><div class="detail-meta-row"><div class="skeleton-pill skeleton-meta-pill"></div><div class="skeleton-pill skeleton-meta-pill"></div><div class="skeleton-pill skeleton-meta-pill"></div></div><div class="detail-description-section"><div class="skeleton-block skeleton-desc-block"></div><div class="skeleton-block skeleton-desc-block short"></div></div><div class="detail-actions"><div class="skeleton-btn skeleton-action-btn"></div><div class="skeleton-pill skeleton-stat-pill"></div><div class="skeleton-pill skeleton-stat-pill"></div><div class="skeleton-pill skeleton-stat-pill"></div></div></div></div>
<div class="detail-resource-section"><div class="resource-header"><div class="skeleton-line skeleton-section-title"></div></div><div class="info-list">\${Array.from({ length: 5 }, () => '<div class="info-list-item"><div class="info-list-left"><div class="skeleton-line skeleton-item-title"></div><div class="info-list-desc"><div class="skeleton-pill skeleton-desc-pill"></div><div class="skeleton-pill skeleton-desc-pill"></div></div></div><div class="info-list-right"><div class="skeleton-icon-btn"></div><div class="skeleton-icon-btn"></div><div class="skeleton-icon-btn"></div><div class="skeleton-icon-btn"></div></div></div>').join('')}</div></div>
</div>
<div id="detailRealContent" style="display: none;">
<div class="detail-view active">
<div class="detail-hero">
<div class="detail-bg" id="detailBg"></div>
<div class="detail-trailer-container" id="detailTrailerContainer" style="display: none;">
<iframe id="detailTrailerIframe" class="detail-trailer-iframe" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
<div class="detail-gradient"></div>
<div class="back-btn" id="backToListBtn"><i class="fas fa-arrow-left"></i></div>
<div class="detail-hero-content">
<div class="detail-title-container">
<img id="detailTitleLogo" src="" alt="标题 logo">
<div class="detail-title" id="detailTitle"></div>
</div>
<div class="detail-meta-row">
<span class="detail-release-date" id="detailReleaseDate"></span>
<div class="detail-genres" id="detailGenres"></div>
<span class="detail-rating" id="detailRating"></span>
<span class="detail-duration" id="detailDuration"></span>
</div>
<div class="detail-description-section">
<p class="detail-description-text" id="detailDescription"></p>
</div>
<div class="detail-actions">
<button class="seek-btn-large" id="seekLargeBtn"><i class="fas fa-heart"></i> 求片</button>
<div class="detail-stats">
<span><i class="fas fa-qrcode"></i> <span id="detailMediaCount">0</span></span>
<span><i class="fas fa-heart"></i> <span id="detailRequestCount">0</span></span>
<button class="todb-btn" id="copyTodbBtn" title="点击复制"><span id="detailTodbId"></span></button>
</div>
</div>
</div>
</div>
<div class="detail-resource-section">
<div class="resource-header">
<h2 class="section-title">资源列表</h2>
<button class="btn-icon" id="movieUploadBtn" style="display: none;" title="上传资源"><i class="fas fa-upload"></i></button>
<button class="btn-icon" id="syncTvBtn" style="display: none;" title="同步剧集"><i class="fas fa-sync-alt"></i></button>
</div>
<div id="detailContentContainer"></div>
</div>
</div>
</div>
</div>
<div class="modal-overlay" id="uploadModal"><div class="modal-content"><div class="modal-title"><span>上传资源</span><button class="btn-icon" id="closeUploadModal"><i class="fas fa-times"></i></button></div><div class="upload-area" id="uploadArea"><i class="fas fa-cloud-upload-alt"></i><p>点击或拖拽文件到此处</p><input type="file" id="fileInput" accept="video/*,.mp4,.mkv,.avi,.mov,.wmv,.flv" style="display:none;"></div><div class="upload-progress" id="uploadProgress" style="display:none;"><div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div><div class="progress-text" id="progressText">0%</div></div></div></div>
<div class="modal-overlay" id="episodeMediaModal"><div class="modal-content"><div class="modal-title"><span>资源列表</span><button class="btn-icon" id="closeEpisodeMediaModal"><i class="fas fa-times"></i></button></div><div id="episodeMediaContent" class="info-list" style="margin-top: 0; max-height: 400px; overflow-y: auto;"></div></div></div>
<div class="modal-overlay" id="subtitleModal"><div class="modal-content"><div class="modal-title"><span>字幕管理</span><button class="btn-icon" id="closeSubtitleModal"><i class="fas fa-times"></i></button></div><div class="upload-area" id="subtitleUploadArea"><i class="fas fa-cloud-upload-alt"></i><p>点击或拖拽字幕文件</p><input type="file" id="subtitleFileInput" accept=".srt,.ass,.ssa,.vtt,.sub" style="display:none;"></div><div class="upload-progress" id="subtitleUploadProgress" style="display:none;"><div class="progress-bar"><div class="progress-fill" id="subtitleProgressFill"></div></div><div class="progress-text" id="subtitleProgressText">0%</div></div><div style="margin-top:1rem;"><div id="subtitleListContainer" style="max-height:300px;overflow-y:auto;"></div></div></div></div>
<div class="modal-overlay" id="renameModal"><div class="modal-content"><div class="modal-title">重命名</div><input type="text" class="modal-input" id="renameInput" maxlength="200"><div class="modal-error" id="renameError"></div><div class="modal-buttons"><button class="modal-btn" id="renameCancel">取消</button><button class="modal-btn primary" id="renameSubmit">确认</button></div></div></div>
<div class="modal-overlay" id="moveModal"><div class="modal-content"><div class="modal-title">移动资源</div><input type="text" class="modal-input" id="moveInput" maxlength="50"><div class="modal-error" id="moveError"></div><div class="modal-buttons"><button class="modal-btn" id="moveCancel">取消</button><button class="modal-btn primary" id="moveSubmit">确认</button></div></div></div>
<div class="modal-overlay" id="deleteConfirmModal"><div class="modal-content"><div class="modal-title"><span>确认删除</span><button class="btn-icon" id="closeDeleteModal"><i class="fas fa-times"></i></button></div><p id="deleteConfirmText" style="margin:0 0 1rem;color:var(--text-secondary);"></p><div id="deleteReasonGroup" style="display:none;"><textarea class="modal-input" id="deleteReason" maxlength="50" rows="2" placeholder="原因（50字以内）"></textarea></div><div class="modal-error" id="deleteError"></div><div class="modal-buttons"><button class="modal-btn" id="deleteCancel">取消</button><button class="modal-btn primary" id="deleteConfirm">确认删除</button></div></div></div>

<style>
.video-detail-page { position: relative; background: var(--bg-body); min-height: 100vh; color: var(--text-primary); }
.detail-view { position: relative; min-height: 100vh; }
.detail-hero { margin: -3rem -1.5rem 0; width: calc(100% + 3rem); position: relative; height: 70vh; min-height: 500px; overflow: hidden; }
.detail-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center 30%; z-index: 0; transition: opacity 0.6s; -webkit-mask-image: radial-gradient(circle at center, black 0%, var(--detail-bg-overlay) 60%, transparent 100%); mask-image: radial-gradient(circle at center, black 0%, var(--detail-bg-overlay) 60%, transparent 100%); }
.detail-gradient { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at center, var(--detail-gradient-top) 0%, var(--detail-gradient-bottom) 80%, var(--bg-body) 100%), linear-gradient(to bottom, transparent 0%, var(--detail-gradient-bottom) 100%); pointer-events: none; z-index: 2; }
.back-btn { position: absolute; top: 2.5rem; left: 1.5rem; z-index: 10; background: var(--detail-btn-bg); backdrop-filter: blur(10px); border: 0.5px solid var(--detail-btn-border); color: var(--text-primary); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
.back-btn:hover { background: var(--detail-btn-hover); transform: scale(1.05); }
.detail-hero-content { position: absolute; bottom: 2rem; left: 1.5rem; right: 2rem; z-index: 4; max-width: 800px; text-shadow: 0 2px 12px rgba(0,0,0,0.3); animation: fadeInUp 0.6s ease-out; }
@keyframes fadeInUp { 0% { opacity:0; transform:translateY(30px); } 100% { opacity:1; transform:translateY(0); } }
#detailTitleLogo { max-height: 70px; max-width: 100%; object-fit: contain; display: none; margin-bottom: 0.3rem; }
.detail-title { font-size: 3rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; color: var(--text-primary); text-shadow: 0 4px 12px rgba(0,0,0,0.4); }
@media (max-width: 700px) { .detail-title { font-size: 2rem; } }
.detail-meta-row { display: flex; flex-wrap: wrap; gap: 0.8rem 1.5rem; font-size: 0.9rem; color: var(--detail-text-secondary); margin-bottom: 0.8rem; }
.detail-genres { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.genre-badge { background: var(--detail-badge-bg); backdrop-filter: blur(8px); border-radius: 20px; padding: 0.2rem 1rem; font-size: 0.8rem; color: var(--text-primary); border: 0.5px solid var(--detail-badge-border); }
.detail-description-text { color: var(--detail-text-secondary, var(--text-secondary)); line-height: 1.6; font-size: 0.95rem; cursor: pointer; max-width: 700px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.detail-description-text.expanded { -webkit-line-clamp: unset; display: block; overflow: visible; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin-top: 0.5rem; }
.seek-btn-large { background: var(--accent-color); border: none; color: #fff; padding: 0.6rem 1.8rem; border-radius: 40px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(0,122,255,0.3); }
.seek-btn-large:hover { background: var(--accent-hover); transform: scale(1.02); }
.detail-stats { display: flex; gap: 1rem; font-size: 0.9rem; color: var(--detail-text-secondary); background: var(--detail-card-bg); backdrop-filter: blur(8px); padding: 0.4rem 1rem; border-radius: 40px; border: 0.5px solid var(--detail-card-border); align-items: center; }
.todb-btn { background: var(--detail-btn-bg); border: 0.5px solid var(--detail-btn-border); color: var(--text-primary); padding: 0.2rem 0.8rem; border-radius: 30px; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
.detail-resource-section { background: var(--bg-body); position: relative; z-index: 3; }
.resource-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.5rem; }
.section-title { font-size: 1.8rem; font-weight: 600; color: var(--text-primary); }
.info-list { display: flex; flex-direction: column; width: 100%; background: var(--bg-list, var(--bg-card)); backdrop-filter: var(--blur-effect); border-radius: var(--radius-lg); overflow: hidden; margin-top: 0.5rem; border: 0.5px solid var(--border-list, var(--border-light)); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.info-list-item { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.2rem; border-bottom: 0.5px solid var(--border-list, var(--border-light)); transition: background 0.2s ease; background: var(--bg-list-item, transparent); }
.info-list-item:hover { background-color: var(--bg-list-item-hover, var(--bg-hover)); }
.info-list-item:last-child { border-bottom: none; }
.info-list-left { flex: 1; min-width: 0; }
.info-list-title { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.3; }
.info-list-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem; display: flex; flex-wrap: wrap; gap: 0.6rem; }
.info-list-right { flex-shrink: 0; margin-left: 1rem; display: flex; align-items: center; gap: 0.6rem; }
.action-btn { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 8px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; transition: 0.2s; font-size: 0.8rem; }
.action-btn:hover { background: var(--accent-color); color: #fff; }
.resource-count { background: rgba(0,122,255,0.15); color: var(--accent-color); width: 32px; height: 32px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.season-item { margin-bottom: 1rem; background: var(--bg-card); backdrop-filter: blur(10px); border: 0.5px solid var(--border-light); border-radius: 16px; overflow: hidden; }
.season-header { padding: 0.8rem 1.2rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; font-weight: 500; color: var(--text-primary); background: var(--bg-input); border-bottom: 0.5px solid var(--border-light); }
.season-header-left { display: flex; align-items: center; gap: 0.8rem; flex: 1; }
.season-header-left i { transition: transform 0.2s; color: var(--accent-color); font-size: 0.85rem; }
.season-header.open .season-header-left i { transform: rotate(90deg); }
.episode-list { display: none; background: var(--bg-body); }
.episode-list.show { display: block; }
.upload-area { border: 2px dashed var(--border-color); border-radius: 24px; padding: 2rem 1rem; text-align: center; cursor: pointer; transition: 0.2s; background: var(--bg-input); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; }
.upload-area:hover { border-color: var(--accent-color); background: rgba(0,122,255,0.05); }
.upload-area i { font-size: 2.5rem; color: var(--accent-color); margin-bottom: 0.8rem; opacity: 0.8; }
.upload-progress { margin-top: 1rem; }
.progress-bar { width: 100%; height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent-color); width: 0%; border-radius: 2px; transition: width 0.3s; }
.progress-text { font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-top: 0.2rem; }
@keyframes skeleton-pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.detail-skeleton-container { position: relative; z-index: 5; }
.skeleton-bg { background: var(--bg-card) !important; }
.skeleton-line, .skeleton-block, .skeleton-pill, .skeleton-icon-btn, .skeleton-btn { background: linear-gradient(90deg, var(--bg-input) 25%, var(--bg-hover) 50%, var(--bg-input) 75%); background-size: 200% 100%; animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: var(--radius-md); }
.skeleton-title-line { width: 65%; height: 48px; margin-bottom: 0.8rem; border-radius: 8px; }
.skeleton-meta-pill { width: 90px; height: 28px; margin-right: 0.8rem; border-radius: 20px; }
.skeleton-desc-block { width: 100%; height: 16px; margin-bottom: 8px; }
.skeleton-desc-block.short { width: 75%; }
.skeleton-action-btn { width: 140px; height: 44px; margin-right: 1rem; }
.skeleton-stat-pill { width: 100px; height: 36px; margin-right: 0.5rem; border-radius: 20px; }
.skeleton-section-title { width: 140px; height: 32px; margin-bottom: 1.5rem; }
.skeleton-item-title { width: 60%; height: 18px; margin-bottom: 10px; }
.skeleton-desc-pill { width: 80px; height: 14px; margin-right: 0.5rem; border-radius: 12px; }
.skeleton-icon-btn { width: 32px; height: 32px; border-radius: 8px; margin-right: 8px; }
.info-list-item { min-height: 84px; padding: 1rem 1.2rem; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--success-color); box-shadow: 0 0 0 1px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.1); }
/* ===== 纯预告片播放样式（无遮罩/无控件） ===== */
.detail-trailer-container {
position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; overflow: hidden;
opacity: 0; transition: opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); pointer-events: none;
}
.detail-trailer-container.visible { opacity: 1; }
.detail-trailer-iframe {
position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
width: 177.777vh; min-width: 100%; height: 56.25vw; min-height: 100%;
pointer-events: none; border: none;
}
@media (max-width: 700px) {
.detail-hero { margin: -3rem -1rem 0; width: calc(100% + 2rem); height: 85vh; }
.back-btn { top: 2rem; left: 1rem; }
.detail-hero-content { left: 1rem; right: 1rem; bottom: 1rem; text-align: center; }
.detail-meta-row { flex-direction: column; align-items: center; gap: 0.4rem; }
.detail-genres { justify-content: center; }
.detail-actions { justify-content: center; }
}
</style>
\`;
}

// ==================== 初始化 ====================
function init() {
el.innerHTML = renderStructure();
const backBtn = el.querySelector('#backToListBtn');
if (backBtn) backBtn.addEventListener('click', backToList);
const copyTodbBtn = el.querySelector('#copyTodbBtn');
if (copyTodbBtn) copyTodbBtn.addEventListener('click', () => { const s = el.querySelector('#detailTodbId'); if (s && s.textContent) window.copyText(s.textContent); });
const closeUploadModal = el.querySelector('#closeUploadModal');
if (closeUploadModal) closeUploadModal.addEventListener('click', () => { if (isUploading && currentUploadController) { currentUploadController.abort(); window.showToast('已取消上传'); } const m = el.querySelector('#uploadModal'); if (m) m.classList.remove('show'); });
el.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target !== m) return; if (m.id === 'uploadModal' && isUploading) return; m.classList.remove('show'); }));
const uploadArea = el.querySelector('#uploadArea'); const fileInput = el.querySelector('#fileInput');
if (uploadArea) { uploadArea.addEventListener('click', () => fileInput.click()); uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--accent-color)'; }); uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = 'var(--border-light)'; }); uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--border-light)'; if (e.dataTransfer.files.length > 0) handleVideoFile(e.dataTransfer.files[0]); }); }
if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleVideoFile(fileInput.files[0]); });
const closeSubtitleModal = el.querySelector('#closeSubtitleModal');
if (closeSubtitleModal) closeSubtitleModal.addEventListener('click', () => { const m = el.querySelector('#subtitleModal'); if (m) m.classList.remove('show'); });
const subArea = el.querySelector('#subtitleUploadArea'); const subInput = el.querySelector('#subtitleFileInput');
if (subArea) { subArea.addEventListener('click', () => subInput.click()); subArea.addEventListener('dragover', e => { e.preventDefault(); subArea.style.borderColor = 'var(--accent-color)'; }); subArea.addEventListener('dragleave', () => { subArea.style.borderColor = 'var(--border-light)'; }); subArea.addEventListener('drop', e => { e.preventDefault(); subArea.style.borderColor = 'var(--border-light)'; if (e.dataTransfer.files.length > 0) handleSubtitleFile(e.dataTransfer.files[0]); }); }
if (subInput) subInput.addEventListener('change', () => { if (subInput.files.length > 0) handleSubtitleFile(subInput.files[0]); });
el.querySelectorAll('#closeEpisodeMediaModal, #closeDeleteModal, #deleteCancel, #renameCancel, #moveCancel').forEach(b => b.addEventListener('click', () => { b.closest('.modal-overlay')?.classList.remove('show'); }));
el.querySelector('#deleteConfirm')?.addEventListener('click', confirmDelete);
el.querySelector('#movieUploadBtn')?.addEventListener('click', () => { if (currentVideoListId) openVideoUploadModal('vl', currentVideoListId, currentVideoListId); });
window.scrollTo(0, 0);
loadVideoDetail().then(() => { const s = el.querySelector('#detailSkeleton'); const r = el.querySelector('#detailRealContent'); if (s) s.style.display = 'none'; if (r) r.style.display = 'block'; });
}

init();
const onShow = (pathname) => { if (!pathname) return; window.PageState.set(pathname, { scrollTop: 0 }); const newId = pathname.split('/')[2]; if (newId && newId !== currentVideoListId) loadVideoDetail(); };
const onHide = () => { clearTrailerTimeout(); const iframe = el.querySelector('#detailTrailerIframe'); if (iframe) { iframe.src = ''; } const c = el.querySelector('#detailTrailerContainer'); if (c) { c.classList.remove('visible'); c.style.display = 'none'; } isTrailerLoaded = false; };
return { el, onShow, onHide };
}
`;

// ==================== 上传管理页面模块 ====================
const PAGE_UPLOAD_JS = `
export default async function UploadPage() {
const el = document.createElement('div');
// 全局状态
let queueFiles = [];
let identifiedFiles = [];
let activeXHRs = new Map();
let currentFilter = 'all';
let concurrency = 3;
let uploadingCount = 0;
const userData = window.currentUser;
const FILE_CATEGORY_VIDEO = 'video';
const FILE_CATEGORY_SUBTITLE = 'subtitle';
// ==================== 辅助函数 ====================
function getToken() {
return localStorage.getItem('activeToken');
}
function getFileCategory(file) {
const name = file.name.toLowerCase();
const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts'];
const subtitleExts = ['.srt', '.ass', '.ssa', '.vtt', '.sub', '.idx', '.smi'];
if (videoExts.some(ext => name.endsWith(ext))) return FILE_CATEGORY_VIDEO;
if (subtitleExts.some(ext => name.endsWith(ext))) return FILE_CATEGORY_SUBTITLE;
return null;
}
function formatFileMeta(file) {
const sizeStr = window.formatBytes(file.size);
const typeId = file.itemType + '-' + file.itemId;
const title = file.displayTitle || '';
let ep = '';
if (file.season != null && file.episode != null) {
ep = ' · S' + String(file.season).padStart(2, '0') + 'E' + String(file.episode).padStart(2, '0');
}
return sizeStr + ' · ' + typeId + ' · ' + title + ep;
}
// 存储到 localStorage
function saveQueueToStorage() {
const queueData = queueFiles.map(f => ({
id: f.id,
name: f.name,
size: f.size,
category: f.category,
itemType: f.itemType,
itemId: f.itemId,
displayTitle: f.displayTitle,
season: f.season,
episode: f.episode,
status: f.status,
uploadType: f.uploadType,
fileId: f.fileId,
uploadUrl: f.uploadUrl,
uploadedBytes: f.uploadedBytes || 0,
retryCount: f.retryCount || 0
}));
localStorage.setItem('queueFiles', JSON.stringify(queueData));
}
function saveIdentifiedToStorage() {
const identifiedData = identifiedFiles.map(f => ({
id: f.id,
name: f.name,
size: f.size,
category: f.category,
status: f.status,
itemType: f.itemType,
itemId: f.itemId,
displayTitle: f.displayTitle,
season: f.season,
episode: f.episode,
errorMessage: f.errorMessage
}));
localStorage.setItem('identifiedFiles', JSON.stringify(identifiedData));
}
async function loadQueueFromStorage() {
const saved = localStorage.getItem('queueFiles');
if (saved) {
try {
const queueData = JSON.parse(saved);
queueFiles = queueData.map(f => ({
...f,
fileObj: null,
progress: f.status === 'completed' ? 100 : (f.uploadedBytes ? Math.round((f.uploadedBytes / f.size) * 100) : 0),
status: f.status === 'retrying' ? 'paused' : f.status,
errorMessage: null,
_saving: false,
retryCount: f.retryCount || 0
}));
} catch (e) { console.warn('恢复队列失败', e); }
}
}
async function loadIdentifiedFromStorage() {
const saved = localStorage.getItem('identifiedFiles');
if (saved) {
try {
const identifiedData = JSON.parse(saved);
identifiedFiles = identifiedData.map(f => ({
...f,
fileObj: null
}));
} catch (e) {}
}
}
// ==================== 上传核心 (使用全局 window.EmosUpload) ====================
async function uploadFileToEmos(fileEntry, resume = false) {
const file = fileEntry.fileObj;
const itemType = fileEntry.itemType;
const itemId = fileEntry.itemId;
const category = fileEntry.category;
try {
fileEntry.status = 'uploading';
fileEntry._saving = false;
updateTaskProgress(fileEntry.id, fileEntry.progress, 'uploading', 0);
const controller = new AbortController();
activeXHRs.set(fileEntry.id, controller);
await window.EmosUpload.upload(file, {
type: category,
itemType: itemType,
itemId: itemId,
onProgress: (loaded, total) => {
const percent = Math.round((loaded / total) * 100);
fileEntry.uploadedBytes = loaded;
fileEntry.progress = percent;
updateTaskProgress(fileEntry.id, percent, 'uploading', 0);
saveQueueToStorage();
},
signal: controller.signal
});
// 上传成功
fileEntry.status = 'completed';
fileEntry.progress = 100;
fileEntry.retryCount = 0;
updateTaskProgress(fileEntry.id, 100, 'completed', 0);
window.showToast('上传完成');
return { success: true };
} catch (err) {
if (err.message && (err.message.includes('取消') || err.message.includes('abort'))) {
fileEntry.status = 'paused';
fileEntry.errorMessage = '用户暂停';
fileEntry._saving = false;
updateTaskProgress(fileEntry.id, fileEntry.progress, 'paused', 0);
return { paused: true };
}
// 其他错误（网络错误、服务器错误等）
fileEntry.status = 'failed';
fileEntry.errorMessage = err.message;
fileEntry._saving = false;
updateTaskProgress(fileEntry.id, fileEntry.progress, 'failed', 0);
window.showToast(\`上传失败：\${err.message}\`);
return { failed: true, errorMessage: err.message };
} finally {
// ✅ 清理 AbortController
activeXHRs.delete(fileEntry.id);
}
}
function updateTaskProgress(taskId, percent, status, retryCount = 0, retryDelay = 0) {
const item = el.querySelector(\`.upload-item[data-id="\${taskId}"]\`);
if (!item) return;
const progressFill = item.querySelector('.progress-fill');
if (progressFill) progressFill.style.width = percent + '%';
const progressRight = item.querySelector('.progress-right');
if (progressRight) {
let rightText = percent + '%';
if (status === 'saving') rightText = '保存中';
else if (status === 'completed') rightText = '完成';
else if (status === 'failed') rightText = '失败';
else if (status === 'paused') rightText = '已暂停';
else if (status === 'retrying') rightText = \`重试\${retryCount}/5 (\${Math.ceil(retryDelay/1000)}s)\`;
progressRight.textContent = rightText;
}
const retryBadge = item.querySelector('.retry-badge');
if (retryBadge) {
if (retryCount > 0) {
retryBadge.textContent = \`重试\${retryCount}\`;
retryBadge.style.display = 'inline-flex';
} else {
retryBadge.style.display = 'none';
}
}
}
function startNext() {
while (uploadingCount < concurrency) {
const next = queueFiles.find(f => f.status === 'pending' && f.fileObj);
if (!next) break;
uploadingCount++;
startUpload(next, true);
}
}
async function startUpload(fileEntry, resume = false) {
if (!fileEntry.fileObj) {
fileEntry.status = 'failed';
fileEntry.errorMessage = '文件对象丢失，请重新添加';
saveQueueToStorage();
renderQueueUI();
uploadingCount--;
startNext();
return;
}
fileEntry.status = 'uploading';
fileEntry.progress = fileEntry.uploadedBytes ? Math.round((fileEntry.uploadedBytes / fileEntry.size) * 100) : 0;
renderQueueUI();
try {
const result = await uploadFileToEmos(fileEntry, resume);
if (result && result.failed) {
fileEntry.status = 'failed';
fileEntry.errorMessage = result.errorMessage;
fileEntry._saving = false;
window.showToast(fileEntry.errorMessage);
} else if (result && result.paused) {
// 已暂停，不做额外处理
} else {
fileEntry.status = 'completed';
fileEntry.progress = 100;
fileEntry._saving = false;
}
} catch (err) {
// 未捕获的异常
if (err.message && (err.message.includes('取消') || err.message.includes('abort'))) {
fileEntry.status = 'paused';
fileEntry.errorMessage = '用户暂停';
} else {
fileEntry.status = 'failed';
fileEntry.errorMessage = err.message;
}
fileEntry._saving = false;
window.showToast(err.message);
} finally {
uploadingCount--;
saveQueueToStorage();
renderQueueUI();
startNext();
}
}
function pauseUpload(fileEntry) {
const controller = activeXHRs.get(fileEntry.id);
if (controller) {
controller.abort();
activeXHRs.delete(fileEntry.id);
}
fileEntry.status = 'paused';
fileEntry._saving = false;
fileEntry.retryCount = 0;
saveQueueToStorage();
renderQueueUI();
startNext();
}
async function resumeFile(fileEntry) {
return new Promise(async (resolve) => {
try {
if (window.showOpenFilePicker) {
try {
const [handle] = await window.showOpenFilePicker({
types: [{
description: '文件',
accept: fileEntry.category === FILE_CATEGORY_VIDEO ? {
'video/*': ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv']
} : {
'application/x-subrip': ['.srt', '.ass', '.ssa', '.vtt', '.sub']
}
}],
multiple: false
});
const selectedFile = await handle.getFile();
if (selectedFile.name !== fileEntry.name || selectedFile.size !== fileEntry.size) {
window.showToast('选择的文件与任务不匹配，请选择正确的文件');
resolve(false);
return;
}
fileEntry.fileObj = selectedFile;
fileEntry.errorMessage = null;
fileEntry.retryCount = 0;
saveQueueToStorage();
resolve(true);
} catch (err) {
if (err.name !== 'AbortError') window.showToast('选择文件失败：' + err.message);
resolve(false);
}
} else {
const input = document.createElement('input');
input.type = 'file';
input.accept = fileEntry.category === FILE_CATEGORY_VIDEO ? 'video/*,.mp4,.mkv,.avi,.mov,.wmv,.flv' : '.srt,.ass,.ssa,.vtt,.sub';
input.onchange = () => {
const selectedFile = input.files[0];
if (!selectedFile) { window.showToast('未选择文件'); resolve(false); return; }
if (selectedFile.name !== fileEntry.name || selectedFile.size !== fileEntry.size) {
window.showToast('选择的文件与任务不匹配，请选择正确的文件');
resolve(false);
return;
}
fileEntry.fileObj = selectedFile;
fileEntry.errorMessage = null;
fileEntry.retryCount = 0;
saveQueueToStorage();
resolve(true);
};
input.oncancel = () => resolve(false);
input.click();
}
} catch (err) {
console.error('恢复文件失败', err);
window.showToast('恢复文件失败，请重试');
resolve(false);
}
});
}
async function deleteTask(fileEntry) {
if (fileEntry.status === 'uploading' || fileEntry.status === 'saving' || fileEntry.status === 'retrying') {
const controller = activeXHRs.get(fileEntry.id);
if (controller) { controller.abort(); activeXHRs.delete(fileEntry.id); }
}
const index = queueFiles.findIndex(f => f.id === fileEntry.id);
if (index !== -1) queueFiles.splice(index, 1);
saveQueueToStorage();
renderQueueUI();
}
// ==================== 识别功能 ====================
async function identifyFile(file) {
try {
const response = await window.fetchWithAuth('/api/identify?filename=' + encodeURIComponent(file.name));
if (!response) throw new Error('请求失败');
const result = await response.json();
if (!response.ok || result.error) {
throw new Error(result.error || \`HTTP \${response.status}\`);
}
let itemType, itemId, displayTitle, season, episode;
if (result.episode_info) {
itemType = result.episode_info.item_type;
itemId = result.episode_info.item_id;
displayTitle = result.episode_info.episode_title || result.video_title;
season = result.season_info ? result.season_info.season_number : (result.episode_info.season_number || null);
episode = result.episode_info.episode_number;
} else {
itemType = result.item_type;
itemId = result.item_id;
displayTitle = result.title || result.original_title || '未知';
season = result.season;
episode = result.episode;
}
return {
success: true,
itemType,
itemId,
displayTitle,
season,
episode,
llmUsed: result.llm_used || false,
};
} catch (err) {
console.error('识别失败:', err);
return { success: false, errorMessage: err.message };
}
}
async function handleFiles(files) {
if (!files || files.length === 0) return;
for (let i = 0; i < files.length; i++) {
const file = files[i];
const category = getFileCategory(file);
if (!category) {
window.showToast('不支持的文件类型：' + file.name);
continue;
}
const match = queueFiles.find(f =>
f.name === file.name && f.size === file.size && !f.fileObj && f.status !== 'completed'
);
if (match) {
match.fileObj = file;
match.errorMessage = null;
match.retryCount = 0;
if (match.status === 'failed' || match.status === 'retrying') match.status = 'paused';
saveQueueToStorage();
window.showToast('已匹配到文件，可继续上传');
renderQueueUI();
continue;
}
const duplicate = identifiedFiles.some(f => f.name === file.name && f.size === file.size) ||
queueFiles.some(f => f.name === file.name && f.size === file.size);
if (duplicate) {
window.showToast('文件已存在：' + file.name);
continue;
}
const id = 'file_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 9);
const entry = {
id,
fileObj: file,
name: file.name,
size: file.size,
category: category,
status: 'pending',
itemType: null,
itemId: null,
displayTitle: null,
season: null,
episode: null,
errorMessage: null,
retryCount: 0
};
identifiedFiles.push(entry);
}
renderIdentifiedUI();
saveIdentifiedToStorage();
for (const entry of identifiedFiles) {
if (entry.status === 'pending') {
const result = await identifyFile(entry.fileObj);
const index = identifiedFiles.findIndex(f => f.id === entry.id);
if (index !== -1) {
if (result.success) {
identifiedFiles[index] = {
...identifiedFiles[index],
status: 'success',
itemType: result.itemType,
itemId: result.itemId,
displayTitle: result.displayTitle,
season: result.season,
episode: result.episode,
};
} else {
identifiedFiles[index] = {
...identifiedFiles[index],
status: 'failed',
errorMessage: result.errorMessage,
};
}
renderIdentifiedUI();
saveIdentifiedToStorage();
}
}
}
}
// ==================== UI 渲染 ====================
function renderIdentifiedUI() {
const noFilePlaceholder = el.querySelector('#noFilePlaceholder');
const identifyContent = el.querySelector('#identifyContent');
const identifiedList = el.querySelector('#identifiedList');
const successCountSpan = el.querySelector('#successCount');
const failCountSpan = el.querySelector('#failCount');
if (!identifiedList) return;
if (identifiedFiles.length === 0) {
if (noFilePlaceholder) noFilePlaceholder.style.display = 'flex';
if (identifyContent) identifyContent.style.display = 'none';
} else {
if (noFilePlaceholder) noFilePlaceholder.style.display = 'none';
if (identifyContent) identifyContent.style.display = 'block';
let successCount = 0;
let failCount = 0;
let html = '';
identifiedFiles.forEach(file => {
let metaHtml = '';
if (file.status === 'pending') {
metaHtml = '<span><i class="fas fa-spinner fa-spin"></i> 识别中...</span>';
} else if (file.status === 'failed') {
failCount++;
metaHtml = '<span style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> 识别失败：' + window.escapeHtml(file.errorMessage || '') + '</span>';
} else if (file.status === 'success') {
successCount++;
metaHtml = '<span>' + formatFileMeta(file) + '</span>';
}
const iconClass = file.category === FILE_CATEGORY_VIDEO ? 'fas fa-video' : 'fas fa-closed-captioning';
html += '<div class="file-item" data-id="' + window.escapeHtml(file.id) + '">' +
'<div class="file-icon"><i class="' + iconClass + '"></i></div>' +
'<div class="file-info">' +
'<div class="file-name">' + window.escapeHtml(file.name) + '</div>' +
'<div class="file-meta">' + metaHtml + '</div>' +
'</div>' +
'<div class="file-actions">' +
'<button class="icon-btn delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>' +
'</div>' +
'</div>';
});
identifiedList.innerHTML = html;
if (successCountSpan) successCountSpan.textContent = successCount;
if (failCountSpan) failCountSpan.textContent = failCount;
}
const identifyCol = el.querySelector('#identifyCol');
if (identifyCol) {
identifyCol.classList.toggle('empty', identifiedFiles.length === 0);
}
}
function renderQueueUI() {
const queueCard = el.querySelector('#queueCard');
const queueList = el.querySelector('#queueList');
const queueEmpty = el.querySelector('#queueEmpty');
if (!queueCard) return;
if (queueFiles.length === 0) {
queueCard.style.display = 'none';
return;
}
queueCard.style.display = 'block';
let filteredFiles = queueFiles;
if (currentFilter !== 'all') {
if (currentFilter === 'resumable') {
filteredFiles = queueFiles.filter(f => f.status !== 'completed' && f.status !== 'failed' && !f.fileObj);
} else {
filteredFiles = queueFiles.filter(f => f.status === currentFilter);
}
}
if (filteredFiles.length === 0) {
if (queueEmpty) {
queueEmpty.style.display = 'flex';
queueEmpty.innerHTML = '<i class="fas fa-inbox"></i><p>无匹配任务</p>';
}
if (queueList) queueList.innerHTML = '';
} else {
if (queueEmpty) queueEmpty.style.display = 'none';
let html = '';
filteredFiles.forEach(file => {
const fileMissing = !file.fileObj && file.status !== 'completed' && file.status !== 'uploading' && file.status !== 'saving' && file.status !== 'retrying';
const itemClass = 'upload-item' + (file.status === 'pending' && !fileMissing ? ' pending' : '');
const progressPercent = file.progress || 0;
const iconClass = file.category === FILE_CATEGORY_VIDEO ? 'fas fa-video' : 'fas fa-closed-captioning';
const retryBadge = file.retryCount > 0 ? '<span class="retry-badge">重试' + file.retryCount + '</span>' : '';
html += '<div class="' + itemClass + '" data-id="' + window.escapeHtml(file.id) + '" data-status="' + window.escapeHtml(file.status) + '">' +
'<div class="upload-row">' +
'<div class="file-icon"><i class="' + iconClass + '"></i></div>' +
'<div class="upload-info">' +
'<div class="upload-name">' + window.escapeHtml(file.name) + ' ' + retryBadge + '</div>' +
'<div class="upload-meta">' +
'<span>' + formatFileMeta(file) + '</span>' +
'</div>';
if (fileMissing) {
html += '<div class="error-message"><i class="fas fa-exclamation-circle"></i> 文件已丢失，点击继续选择</div>';
} else if (file.status === 'failed' && file.errorMessage) {
html += '<div class="error-message"><i class="fas fa-exclamation-circle"></i> ' + window.escapeHtml(file.errorMessage) + '</div>';
} else if (file.status === 'retrying') {
html += '<div class="error-message" style="color:var(--warning-color);"><i class="fas fa-exclamation-triangle"></i> 上传出错，自动重试中...</div>';
}
html += '</div>' +
'<div class="file-actions">';
if (fileMissing) {
html += '<button class="icon-btn resume-btn" title="继续"><i class="fas fa-play"></i></button>' +
'<button class="icon-btn delete-task-btn" title="删除任务"><i class="fas fa-times"></i></button>';
} else if (file.status === 'uploading' || file.status === 'retrying') {
html += '<button class="icon-btn pause-btn" title="暂停"><i class="fas fa-pause"></i></button>' +
'<button class="icon-btn delete-task-btn" title="删除任务"><i class="fas fa-times"></i></button>';
} else if (file.status === 'saving') {
html += '<button class="icon-btn delete-task-btn" title="删除任务"><i class="fas fa-times"></i></button>';
} else if (file.status === 'paused') {
html += '<button class="icon-btn resume-btn" title="继续"><i class="fas fa-play"></i></button>' +
'<button class="icon-btn delete-task-btn" title="删除任务"><i class="fas fa-times"></i></button>';
} else if (file.status === 'pending') {
html += '<button class="icon-btn delete-task-btn" title="删除任务"><i class="fas fa-times"></i></button>';
} else if (file.status === 'failed' || file.status === 'completed') {
html += '<button class="icon-btn delete-task-btn" title="删除任务"><i class="fas fa-times"></i></button>';
}
html += '</div>' +
'</div>';
if (!fileMissing && (file.status === 'uploading' || file.status === 'saving' || file.status === 'retrying')) {
let progressClass = '';
let rightText = progressPercent + '%';
if (file.status === 'saving') {
progressClass = 'saving';
rightText = '保存中';
} else if (file.status === 'retrying') {
progressClass = 'retrying';
rightText = '重试' + (file.retryCount || 0) + '/5';
}
html += '<div class="progress-row">' +
'<div class="progress-bar"><div class="progress-fill ' + progressClass + '" style="width:' + progressPercent + '%;"></div></div>' +
'<div class="progress-right">' + rightText + '</div>' +
'</div>';
}
html += '</div>';
});
queueList.innerHTML = html;
}
updateFilterCounts();
updateClearButton();
}
function updateFilterCounts() {
const all = queueFiles.length;
const paused = queueFiles.filter(f => f.status === 'paused' && f.fileObj).length;
const pending = queueFiles.filter(f => f.status === 'pending' && f.fileObj).length;
const uploading = queueFiles.filter(f => f.status === 'uploading' && f.fileObj).length;
const saving = queueFiles.filter(f => f.status === 'saving' && f.fileObj).length;
const retrying = queueFiles.filter(f => f.status === 'retrying' && f.fileObj).length;
const completed = queueFiles.filter(f => f.status === 'completed').length;
const failed = queueFiles.filter(f => f.status === 'failed').length;
const resumable = queueFiles.filter(f => f.status !== 'completed' && f.status !== 'failed' && !f.fileObj).length;
const countAll = el.querySelector('#count-all');
const countPaused = el.querySelector('#count-paused');
const countPending = el.querySelector('#count-pending');
const countUploading = el.querySelector('#count-uploading');
const countSaving = el.querySelector('#count-saving');
const countRetrying = el.querySelector('#count-retrying');
const countCompleted = el.querySelector('#count-completed');
const countFailed = el.querySelector('#count-failed');
const countResumable = el.querySelector('#count-resumable');
if (countAll) countAll.textContent = all;
if (countPaused) countPaused.textContent = paused;
if (countPending) countPending.textContent = pending;
if (countUploading) countUploading.textContent = uploading;
if (countSaving) countSaving.textContent = saving;
if (countRetrying) countRetrying.textContent = retrying;
if (countCompleted) countCompleted.textContent = completed;
if (countFailed) countFailed.textContent = failed;
if (countResumable) countResumable.textContent = resumable;
}
function updateClearButton() {
const clearBtnText = el.querySelector('#clearBtnText');
if (clearBtnText) {
const hasCompleted = queueFiles.some(f => f.status === 'completed');
clearBtnText.textContent = hasCompleted ? '清空已完成' : '清空所有';
}
}
// ==================== 事件绑定 ====================
function bindEvents() {
const dropZone = el.querySelector('#dropZone');
const fileInput = el.querySelector('#fileInput');
const clearIdentifiedBtn = el.querySelector('#clearIdentifiedBtn');
const addToQueueBtn = el.querySelector('#addToQueueBtn');
const startAllBtn = el.querySelector('#startAllBtn');
const clearQueueBtn = el.querySelector('#clearQueueBtn');
const decrementConcurrency = el.querySelector('#decrementConcurrency');
const incrementConcurrency = el.querySelector('#incrementConcurrency');
const filterBar = el.querySelector('#queueFilterBar');
const queueList = el.querySelector('#queueList');
if (dropZone) {
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-color)'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border-color)'; });
dropZone.addEventListener('drop', async (e) => {
e.preventDefault();
dropZone.style.borderColor = 'var(--border-color)';
const items = e.dataTransfer.items;
const files = [];
for (let i = 0; i < items.length; i++) {
const item = items[i];
if (item.kind === 'file') {
const file = item.getAsFile();
files.push(file);
}
}
if (files.length > 0) handleFiles(files);
});
dropZone.addEventListener('click', async () => {
if (window.showOpenFilePicker) {
try {
const handles = await window.showOpenFilePicker({ multiple: true });
const files = [];
for (const handle of handles) {
const file = await handle.getFile();
files.push(file);
}
handleFiles(files);
} catch (e) { if (e.name !== 'AbortError') window.showToast('文件选择失败'); }
} else { fileInput.click(); }
});
}
if (fileInput) {
fileInput.addEventListener('change', () => {
if (fileInput.files.length > 0) {
handleFiles(Array.from(fileInput.files));
fileInput.value = '';
}
});
}
if (clearIdentifiedBtn) {
clearIdentifiedBtn.addEventListener('click', () => {
identifiedFiles = [];
saveIdentifiedToStorage();
renderIdentifiedUI();
});
}
if (addToQueueBtn) {
addToQueueBtn.addEventListener('click', () => {
const toAdd = identifiedFiles.filter(f => f.status === 'success');
toAdd.forEach(file => {
if (!queueFiles.some(f => f.id === file.id)) {
queueFiles.push({
id: file.id,
fileObj: file.fileObj,
name: file.name,
size: file.size,
category: file.category,
itemType: file.itemType,
itemId: file.itemId,
displayTitle: file.displayTitle,
season: file.season,
episode: file.episode,
status: 'paused',
progress: 0,
uploadedBytes: 0,
fileId: null,
uploadUrl: null,
errorMessage: null,
retryCount: 0
});
}
});
identifiedFiles = identifiedFiles.filter(f => f.status !== 'success');
saveIdentifiedToStorage();
renderIdentifiedUI();
renderQueueUI();
});
}
if (startAllBtn) {
startAllBtn.addEventListener('click', () => {
queueFiles.forEach(file => {
if ((file.status === 'paused' || file.status === 'failed' || file.status === 'retrying') && file.fileObj) {
file.status = 'pending';
file.retryCount = 0;
}
});
saveQueueToStorage();
renderQueueUI();
startNext();
});
}
if (clearQueueBtn) {
clearQueueBtn.addEventListener('click', () => {
const btnText = el.querySelector('#clearBtnText').textContent;
if (btnText === '清空已完成') {
queueFiles = queueFiles.filter(f => f.status !== 'completed');
saveQueueToStorage();
renderQueueUI();
window.showToast('已清空已完成任务');
} else {
if (confirm('确定要清空所有上传任务吗？')) {
activeXHRs.forEach((controller, id) => { controller.abort(); });
activeXHRs.clear();
queueFiles = [];
uploadingCount = 0;
saveQueueToStorage();
renderQueueUI();
window.showToast('已清空所有任务');
}
}
});
}
if (decrementConcurrency) {
decrementConcurrency.addEventListener('click', () => {
let val = parseInt(el.querySelector('#concurrency').value) || 3;
if (val > 1) {
el.querySelector('#concurrency').value = val - 1;
concurrency = val - 1;
renderQueueUI();
startNext();
}
});
}
if (incrementConcurrency) {
incrementConcurrency.addEventListener('click', () => {
let val = parseInt(el.querySelector('#concurrency').value) || 3;
if (val < 5) {
el.querySelector('#concurrency').value = val + 1;
concurrency = val + 1;
renderQueueUI();
startNext();
}
});
}
if (filterBar) {
filterBar.addEventListener('click', (e) => {
const btn = e.target.closest('.filter-chip');
if (!btn) return;
const status = btn.dataset.status;
if (status === currentFilter) return;
filterBar.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
btn.classList.add('active');
currentFilter = status;
renderQueueUI();
});
}
if (queueList) {
queueList.addEventListener('click', async (e) => {
const pauseBtn = e.target.closest('.pause-btn');
const resumeBtn = e.target.closest('.resume-btn');
const deleteBtn = e.target.closest('.delete-task-btn');
const fileItem = e.target.closest('.upload-item');
if (!fileItem) return;
const id = fileItem.dataset.id;
const file = queueFiles.find(f => f.id == id);
if (!file) return;
if (pauseBtn) {
e.preventDefault();
pauseUpload(file);
} else if (resumeBtn) {
e.preventDefault();
if (!file.fileObj) {
const success = await resumeFile(file);
if (!success) return;
}
if (file.status === 'paused' || file.status === 'failed' || file.status === 'retrying') {
file.status = 'pending';
file.retryCount = 0;
}
file._saving = false;
saveQueueToStorage();
renderQueueUI();
startNext();
} else if (deleteBtn) {
e.preventDefault();
await deleteTask(file);
}
});
}
const identifiedList = el.querySelector('#identifiedList');
if (identifiedList) {
identifiedList.addEventListener('click', (e) => {
const deleteBtn = e.target.closest('.delete-btn');
if (!deleteBtn) return;
const fileItem = deleteBtn.closest('.file-item');
if (!fileItem) return;
const id = fileItem.dataset.id;
if (id) {
identifiedFiles = identifiedFiles.filter(f => f.id != id);
saveIdentifiedToStorage();
renderIdentifiedUI();
}
});
}
}
// ==================== 渲染页面结构 ====================
function renderStructure() {
return \`
<div class="upload-content">
<div class="content-wrapper">
<div class="row" id="mainRow">
<div class="col" id="uploadCol">
<div class="apple-card">
<div class="card-header">
<i class="fas fa-cloud-upload-alt"></i>
<h3>上传文件</h3>
</div>
<div class="drop-zone" id="dropZone">
<div class="drop-zone-icon"><i class="fas fa-cloud-upload-alt"></i></div>
<p class="drop-zone-title">拖拽文件或文件夹到此处</p>
<p class="drop-zone-hint">支持视频和字幕文件，上传失败自动重试</p>
<div class="format-tags">
<span class="format-tag">MP4</span>
<span class="format-tag">MKV</span>
<span class="format-tag">AVI</span>
<span class="format-tag">MOV</span>
<span class="format-tag">WMV</span>
<span class="format-tag">FLV</span>
<span class="format-tag">SRT</span>
<span class="format-tag">ASS</span>
<span class="format-tag">VTT</span>
</div>
<input type="file" id="fileInput" multiple style="display:none;" accept="video/*,.mp4,.mkv,.avi,.mov,.wmv,.flv,text/*,.srt,.ass,.ssa,.sub,*/*">
</div>
</div>
</div>
<div class="col" id="identifyCol">
<div class="apple-card" id="identifyCard">
<div class="card-header">
<i class="fas fa-tag"></i>
<h3>识别结果</h3>
</div>
<div id="noFilePlaceholder" class="empty-state">
<i class="fas fa-inbox"></i>
<p>暂无选择文件</p>
</div>
<div id="identifyContent" style="display: none;">
<div class="result-header">
<div class="result-stats">成功 <span id="successCount">0</span> 失败 <span id="failCount">0</span></div>
<div class="result-actions">
<button class="btn-outline" id="clearIdentifiedBtn"><i class="fas fa-trash-alt"></i> 清空列表</button>
<button class="btn-outline primary" id="addToQueueBtn"><i class="fas fa-plus"></i> 添加队列</button>
</div>
</div>
<div class="file-list" id="identifiedList"></div>
</div>
</div>
</div>
</div>
<div class="apple-card" id="queueCard" style="display: none;">
<div class="card-header">
<i class="fas fa-list"></i>
<h3>上传队列</h3>
</div>
<div class="queue-header">
<div class="filter-bar" id="queueFilterBar">
<button class="filter-chip active" data-status="all">全部 <span class="count" id="count-all">0</span></button>
<button class="filter-chip" data-status="paused">待处理 <span class="count" id="count-paused">0</span></button>
<button class="filter-chip" data-status="pending">等待 <span class="count" id="count-pending">0</span></button>
<button class="filter-chip" data-status="uploading">上传中 <span class="count" id="count-uploading">0</span></button>
<button class="filter-chip" data-status="retrying">重试中 <span class="count" id="count-retrying">0</span></button>
<button class="filter-chip" data-status="saving">保存中 <span class="count" id="count-saving">0</span></button>
<button class="filter-chip" data-status="completed">完成 <span class="count" id="count-completed">0</span></button>
<button class="filter-chip" data-status="failed">失败 <span class="count" id="count-failed">0</span></button>
<button class="filter-chip" data-status="resumable">可续传 <span class="count" id="count-resumable">0</span></button>
</div>
<div class="queue-controls">
<div class="concurrency-control">
<button class="concurrency-btn" id="decrementConcurrency"><i class="fas fa-minus"></i></button>
<input type="number" class="concurrency-input" id="concurrency" value="3" min="1" max="5" readonly>
<button class="concurrency-btn" id="incrementConcurrency"><i class="fas fa-plus"></i></button>
</div>
<button class="btn-outline" id="clearQueueBtn"><i class="fas fa-trash-alt"></i> <span id="clearBtnText">清空所有</span></button>
<button class="btn-outline primary" id="startAllBtn"><i class="fas fa-play"></i> 全部开始</button>
</div>
</div>
<div class="file-list" id="queueList"></div>
<div id="queueEmpty" class="empty-state" style="display: none;">
<i class="fas fa-arrow-circle-up"></i>
<p>暂无上传任务</p>
</div>
</div>
</div>
</div>
<style>
/* ===== 上传管理苹果设计样式 ===== */
.upload-content { width: 100%; min-height: 100vh; background-color: var(--bg-body); color: var(--text-primary); transition: background-color 0.3s ease; }
.row { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch; }
.col { flex: 1; display: flex; min-width: 0; }
.apple-card {
flex: 1; display: flex; flex-direction: column;
background: var(--bg-card);
border: 1px solid var(--border-light);
border-radius: 24px;
padding: 1.5rem;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.03);
transition: all 0.25s ease;
}
[data-theme="light"] .apple-card {
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
border-color: rgba(0, 0, 0, 0.08);
}
.apple-card:hover {
transform: translateY(-2px);
box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
}
.card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-shrink: 0; }
.card-header i { font-size: 1.5rem; color: var(--accent-color); background: rgba(0, 122, 255, 0.12); padding: 0.6rem; border-radius: 16px; }
.card-header h3 { font-size: 1.3rem; font-weight: 600; color: var(--text-primary); margin: 0; letter-spacing: -0.3px; }
.drop-zone {
border: 2px dashed var(--border-light);
border-radius: 20px;
padding: 2rem 1rem;
text-align: center;
cursor: pointer;
transition: all 0.25s ease;
background: rgba(0, 0, 0, 0.02);
flex: 1;
display: flex;
flex-direction: column;
justify-content: center;
}
[data-theme="light"] .drop-zone {
background: rgba(0, 0, 0, 0.01);
}
.drop-zone:hover {
border-color: var(--accent-color);
background: rgba(0, 122, 255, 0.03);
transform: scale(0.99);
}
.drop-zone-icon i { font-size: 3rem; color: var(--accent-color); opacity: 0.8; margin-bottom: 1rem; }
.drop-zone-title { font-size: 1rem; font-weight: 500; color: var(--text-primary); margin-bottom: 0.25rem; }
.drop-zone-hint { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
.format-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 0.5rem; }
.format-tag { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 40px; padding: 0.2rem 0.8rem; font-size: 0.7rem; color: var(--text-primary); font-weight: 500; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 3rem 1rem; color: var(--text-tertiary); background: var(--bg-input); border-radius: 20px; border: 1px dashed var(--border-light); flex: 1; }
.empty-state i { font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--text-tertiary); opacity: 0.6; }
.empty-state p { font-size: 0.9rem; color: var(--text-secondary); }
.result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; flex-shrink: 0; }
.result-stats { display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-input); padding: 0.3rem 1rem; border-radius: 40px; }
.result-stats span { color: var(--accent-color); font-weight: 500; }
.result-actions { display: flex; gap: 0.5rem; }
.btn-outline { background: transparent; border: 1px solid var(--border-light); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 40px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 0.4rem; backdrop-filter: blur(4px); }
.btn-outline i { font-size: 0.75rem; }
.btn-outline:hover { background: var(--bg-hover); border-color: var(--accent-color); transform: translateY(-1px); }
.btn-outline.primary { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
.btn-outline.primary:hover { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
.file-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 360px; overflow-y: auto; padding-right: 0.25rem; flex: 1; }
.file-list::-webkit-scrollbar { width: 5px; }
.file-list::-webkit-scrollbar-track { background: var(--bg-input); border-radius: 10px; }
.file-list::-webkit-scrollbar-thumb { background: var(--text-tertiary); border-radius: 10px; }
.file-item { display: flex; align-items: center; gap: 0.8rem; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 20px; padding: 0.8rem 1rem; transition: all 0.2s ease; }
.file-item:hover { background: var(--bg-hover); border-color: var(--accent-color); transform: translateX(2px); }
.file-icon { width: 44px; height: 44px; border-radius: 16px; background: rgba(0, 122, 255, 0.1); display: flex; align-items: center; justify-content: center; color: var(--accent-color); font-size: 1.2rem; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; }
.file-name { font-weight: 500; color: var(--text-primary); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem; }
.file-meta { display: flex; gap: 0.8rem; font-size: 0.7rem; color: var(--text-secondary); flex-wrap: wrap; }
.file-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
.icon-btn { background: var(--bg-card); border: 1px solid var(--border-light); color: var(--text-secondary); width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; font-size: 0.85rem; }
.icon-btn:hover { background: var(--accent-color); color: #fff; border-color: var(--accent-color); transform: scale(1.05); }
.queue-header { margin-bottom: 1.5rem; flex-shrink: 0; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.filter-chip { background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 40px; padding: 0.4rem 1.2rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; position: relative; white-space: nowrap; }
.filter-chip .count { margin-left: 0.3rem; font-size: 0.7rem; opacity: 0.7; }
.filter-chip.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25); }
.filter-chip.active .count { opacity: 1; }
.filter-chip:hover:not(.active) { background: var(--bg-hover); transform: translateY(-1px); }
.queue-controls { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
.concurrency-control { display: flex; align-items: center; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 40px; overflow: hidden; }
.concurrency-btn { background: transparent; border: none; color: var(--text-primary); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
.concurrency-btn:hover { background: var(--accent-color); color: #fff; }
.concurrency-input { background: transparent; border: none; color: var(--text-primary); font-size: 0.85rem; width: 48px; text-align: center; padding: 0.3rem 0; outline: none; }
.upload-item { background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 20px; padding: 0.8rem 1rem; margin-bottom: 0.75rem; transition: all 0.2s ease; }
.upload-item:hover { background: var(--bg-hover); border-color: var(--accent-color); }
.upload-row { display: flex; align-items: center; gap: 0.8rem; width: 100%; }
.upload-info { flex: 1; min-width: 0; }
.upload-name { font-weight: 500; color: var(--text-primary); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.upload-meta { display: flex; gap: 0.8rem; font-size: 0.7rem; color: var(--text-secondary); flex-wrap: wrap; }
.error-message { color: var(--danger-color); font-size: 0.7rem; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.3rem; }
.progress-row { display: flex; align-items: center; gap: 0.8rem; margin-top: 0.6rem; width: 100%; }
.progress-bar { flex: 1; height: 4px; background: rgba(0, 0, 0, 0.1); border-radius: 4px; overflow: hidden; }
[data-theme="light"] .progress-bar { background: rgba(0, 0, 0, 0.08); }
.progress-fill { height: 100%; background: var(--accent-color); width: 0%; border-radius: 4px; transition: width 0.3s ease; }
.progress-fill.saving { background: var(--success-color); }
.progress-fill.completed { background: var(--success-color); }
.progress-fill.failed { background: var(--danger-color); }
.progress-fill.retrying { background: var(--warning-color); animation: pulse 1s infinite; }
@keyframes pulse {
0%, 100% { opacity: 1; }
50% { opacity: 0.6; }
}
.progress-right { min-width: 55px; font-size: 0.75rem; color: var(--text-secondary); text-align: right; font-weight: 500; }
.retry-badge {
background: var(--warning-color);
color: #000;
font-size: 0.65rem;
font-weight: 600;
padding: 0.15rem 0.5rem;
border-radius: 40px;
display: inline-flex;
align-items: center;
}
@media (max-width: 700px) {
.row { flex-direction: column; gap: 1rem; }
.apple-card { padding: 1.2rem; }
.card-header h3 { font-size: 1.1rem; }
.filter-chip { padding: 0.3rem 0.8rem; font-size: 0.7rem; }
.queue-controls { gap: 0.5rem; }
.btn-outline { padding: 0.4rem 0.8rem; font-size: 0.75rem; }
.file-list { max-height: 280px; }
.result-header { flex-wrap: nowrap; justify-content: space-between; gap: 0.5rem; }
.result-stats { font-size: 0.75rem; gap: 0.5rem; flex-shrink: 0; }
.result-actions { gap: 0.3rem; flex-shrink: 0; }
.result-actions .btn-outline { padding: 0.3rem 0.6rem; font-size: 0.7rem; }
.file-icon { width: 38px; height: 38px; font-size: 1rem; }
.icon-btn { width: 30px; height: 30px; font-size: 0.75rem; }
}
</style>
\`;
}
// ==================== 初始化 ====================
async function init() {
el.innerHTML = renderStructure();
await loadQueueFromStorage();
await loadIdentifiedFromStorage();
bindEvents();
renderIdentifiedUI();
renderQueueUI();
startNext();
}
const onShow = () => {
renderIdentifiedUI();
renderQueueUI();
};
const onHide = () => {};
init();
return { el, onShow, onHide };
}
`;

// ==================== 片单管理页面模块 ====================
const PAGE_WATCHLIST_JS = `
export default async function WatchlistPage() {
const el = document.createElement('div');
let currentView = 'list';
let currentDetailWatchId = null;
let savedScrollTop = 0;
let listState = {
currentPage: 1, pageSize: 20, totalPages: 1, isLoading: false,
hasMore: true, currentOption: 'all', currentSearch: '', searchController: null
};
let detailState = {
watchId: null, watchDetail: null, currentPage: 1, pageSize: 15,
totalPages: 1, isLoading: false, hasMore: true, currentSearch: '', searchController: null
};
let loadWatchlistsFn = null;
// ==================== 片单列表渲染 ====================
function renderListStructure() {
return \`
<div class="watch-content">
  <div class="content-wrapper">
    <div id="listView">
      <div class="page-header">
        <h1 class="page-title">片单管理</h1>
        <p class="page-subtitle">浏览与订阅精选影视片单</p>
      </div>
      <div class="filter-bar">
        <div class="search-container" style="flex:1; margin:0;">
          <select class="search-type" id="searchType">
            <option value="all">全部</option><option value="mine">我的</option>
            <option value="subscribed">已订阅</option><option value="author">作者ID</option><option value="author_username">作者名称</option>
          </select>
          <input type="text" class="search-input" id="searchInput" placeholder="输入片单名称">
          <button class="search-btn" id="searchBtn"><i class="fas fa-search"></i></button>
        </div>
        <button class="add-line-btn" id="addWatchlistBtn" title="新增片单"><i class="fas fa-plus"></i></button>
      </div>
      <div id="loadingIndicator" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>
      <div id="cardGridContainer" style="display: none;">
        <div class="card-grid" id="cardGrid"></div>
        <div class="load-more" id="loadMoreIndicator" style="display: none;"><div class="spinner"></div> 加载更多...</div>
        <div id="noResults" class="no-results" style="display: none;">没有找到片单</div>
      </div>
    </div>
    <div id="detailView" style="display: none;"></div>
  </div>
</div>
<!-- 添加/编辑片单模态框 -->
<div class="modal-overlay" id="editWatchlistModal">
  <div class="modal-content">
    <div class="modal-title">
      <span id="editWatchlistModalTitle">新增片单</span>
      <button class="btn-icon" id="closeEditWatchlistModal"><i class="fas fa-times"></i></button>
    </div>
    <div class="image-upload-area" id="imageUploadArea">
      <div class="image-preview" id="imagePreview">
        <img id="previewImg" src="" style="display: none;">
        <div class="placeholder" id="placeholder"><i class="fas fa-cloud-upload-alt"></i><span>点击上传封面</span></div>
      </div>
      <div class="image-upload-buttons" id="imageUploadButtons">
        <button class="image-upload-btn" id="uploadImageBtn">上传</button>
        <button class="image-delete-btn" id="deleteImageBtn" style="display: none;">删除</button>
      </div>
      <input type="file" id="imageFileInput" accept="image/*" style="display: none;">
    </div>
    <input type="hidden" id="editWatchImagePoster">
    <div class="form-group"><label>片单名称</label><input type="text" id="editWatchName" maxlength="100" placeholder="片单名称"></div>
    <div class="form-group"><label>简介</label><textarea id="editWatchDescription" maxlength="10000" rows="3" placeholder="简介"></textarea></div>
    <div class="form-group"><label>所需萝卜 (0-50000)</label><input type="number" id="editWatchPoint" min="0" max="50000" value="0"></div>
    <div class="form-group"><label>标签</label><div class="tags-input" id="tagsInputContainer"><input type="text" id="tagInput" placeholder="输入标签后按回车"></div><div id="tagsList" style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem;"></div></div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;"><span class="toggle-switch-label">是否公开</span><div class="toggle-switch" id="editWatchIsPublicToggle"></div><input type="hidden" id="editWatchIsPublic" value=""></div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;"><span class="toggle-switch-label">是否显示空媒体</span><div class="toggle-switch" id="editWatchShowEmptyToggle"></div><input type="hidden" id="editWatchShowEmpty" value=""></div>
    <div class="modal-buttons"><button class="modal-btn" id="editWatchCancel">取消</button><button class="modal-btn primary" id="editWatchConfirm">保存</button></div>
  </div>
</div>
<!-- 排序设置模态框 -->
<div class="modal-overlay" id="sortWatchModal">
  <div class="modal-content">
    <div class="modal-title"><span>排序设置</span><button class="btn-icon" id="closeSortWatchModal"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label>排序序号 (1-100，越小越靠前)</label><input type="number" id="sortWatchSort" min="1" max="100" value="80"></div>
    <div class="modal-buttons"><button class="modal-btn" id="sortWatchCancel">取消</button><button class="modal-btn primary" id="sortWatchConfirm">保存</button></div>
  </div>
</div>
<!-- 动态片单模态框 -->
<div class="modal-overlay" id="dynamicWatchModal">
  <div class="modal-content">
    <div class="modal-title">动态片单设置</div>
    <div class="dynamic-input-container"><input type="url" id="dynamicUrlInput" placeholder="输入抓取地址（空则关闭）"></div>
    <div class="modal-error" id="dynamicError"></div>
    <div class="modal-buttons"><button class="modal-btn" id="dynamicCancel">取消</button><button class="modal-btn primary" id="dynamicConfirm">保存</button></div>
  </div>
</div>
<!-- 编辑视频模态框 -->
<div class="modal-overlay" id="editVideoModal">
  <div class="modal-content">
    <div class="modal-title"><span>编辑视频</span><button class="btn-icon" id="closeEditVideoModal"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label>排序 (1-100)</label><input type="number" id="editSort" min="1" max="100" value="80"></div>
    <div class="form-group"><label>备注 (可选)</label><input type="text" id="editRemark" maxlength="100" placeholder="最多 100 字"></div>
    <div class="modal-buttons"><button class="modal-btn" id="editVideoCancel">取消</button><button class="modal-btn primary" id="editVideoConfirm">确认</button></div>
  </div>
</div>
<!-- 添加视频模态框 -->
<div class="modal-overlay" id="addVideoModal">
  <div class="modal-content">
    <div class="modal-title"><span>添加视频</span><button class="btn-icon" id="closeAddVideoModal"><i class="fas fa-times"></i></button></div>
    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem;">
      <div class="search-container" style="flex:1; margin:0;"><input type="text" class="search-input" id="videoSearchInput" placeholder="搜索视频..."><button class="search-btn" id="videoSearchBtn"><i class="fas fa-search"></i></button></div>
      <div class="selected-badge" id="selectedBadge" style="display: none;">0</div>
    </div>
    <div id="videoSearchResults" class="video-list" style="max-height: 400px; overflow-y: auto;"></div>
    <div class="load-more" id="videoSearchLoadMore" style="display: none;"><div class="spinner"></div> 加载更多...</div>
    <div class="modal-buttons"><button class="modal-btn secondary" id="addVideoCancel">取消</button><button class="modal-btn primary" id="addVideoConfirm">确认</button></div>
  </div>
</div>
<!-- 维护者管理模态框 -->
<div class="modal-overlay" id="maintainerModal">
  <div class="modal-content">
    <div class="modal-title"><span>维护者管理</span><button class="btn-icon" id="closeMaintainerModal"><i class="fas fa-times"></i></button></div>
    <div class="maintainer-input-container"><input type="text" id="maintainerInput" placeholder="输入用户 ID"><button id="addMaintainerBtn"><i class="fas fa-plus"></i></button></div>
    <div id="maintainerList" class="maintainer-list"></div>
  </div>
</div>
<style>
/* ===== 片单管理对齐样式 (严格复刻订单中心布局) ===== */
.watch-content { width: 100%; min-height: 100vh; background-color: var(--bg-body); color: var(--text-primary); }
.page-header { margin: 1rem 0; padding: 0; animation: slideUpFade .6s ease-out; }
@keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
.page-title { font-size: 2.2rem; font-weight: 700; margin: 0; letter-spacing: -0.5px; line-height: 1.2; }
.page-subtitle { font-size: 1rem; color: var(--text-secondary); margin: 0; font-weight: 400; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin: 0 0 1.5rem; padding: 0; }
.add-line-btn { background: var(--accent-color); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); margin-left: auto; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
.add-line-btn:hover { background: var(--accent-hover); transform: scale(1.05) rotate(90deg); box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4); }

.no-results { text-align: center; padding: 3rem 0; color: var(--text-secondary); font-size: 1.1rem; font-weight: 500; background: var(--bg-input); border-radius: var(--radius-xl); border: 1px dashed var(--border-color); margin: 1rem 0; animation: fadeIn .3s ease; width: auto; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 1.5rem; margin-top: 0; }
.watch-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 0.5px solid var(--border-light);
  border-radius: 24px;
  padding: 1.5rem;
  transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  overflow: hidden;
}
.watch-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

.card-cover { position: relative; width: 100%; aspect-ratio: 16/9; background-color: var(--bg-input); overflow: hidden; border-radius: 16px; margin-bottom: 1rem; }
.card-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.watch-card:hover .card-cover img { transform: scale(1.05); }
.corner-top-left, .corner-top-right, .corner-bottom-right { position: absolute; z-index: 2; display: flex; gap: 6px; }
.corner-top-left { top: 10px; left: 10px; }
.corner-top-right { top: 10px; right: 10px; }
.corner-bottom-right { bottom: 10px; right: 10px; }
.count-badge, .public-badge, .private-badge {
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  padding: 4px 10px;
  border-radius: 40px;
  font-size: 0.7rem;
  font-weight: 500;
  border: 0.5px solid rgba(255,255,255,0.2);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.3px;
}
.maintainer-avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.maintainer-avatar img { width: 100%; height: 100%; object-fit: cover; }
.maintainer-avatar i { font-size: 0.7rem; color: #ccc; }

.card-info { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.info-row1 { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
.card-title { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; letter-spacing: -0.2px; line-height: 1.2; margin: 0; padding: 0; }
.carrot-badge { background: var(--bg-input); border: 1px solid var(--border-light); color: var(--warning-color); padding: 0.25rem 0.8rem; border-radius: 40px; font-size: 0.7rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; line-height: 1; white-space: nowrap; flex-shrink: 0; }
.tags-container { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.6rem; line-height: 1.4; }
.tag { background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 40px; padding: 0.2rem 0.7rem; font-size: 0.65rem; color: var(--text-secondary); white-space: nowrap; }
.info-row3 { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.5rem; }
.author-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; color: var(--text-secondary); }
.author-avatar { width: 22px; height: 22px; border-radius: 50%; background: var(--bg-input); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.author-avatar img { width: 100%; height: 100%; object-fit: cover; }
.subscribe-btn { background: transparent; border: 1px solid var(--border-light); color: var(--text-primary); padding: 0.3rem 1rem; border-radius: 40px; font-size: 0.7rem; font-weight: 500; cursor: pointer; transition: 0.2s; backdrop-filter: blur(4px); }
.subscribe-btn:hover { background: var(--bg-hover); border-color: var(--border-color); }
.subscribe-btn.subscribed { background: var(--bg-input); border-color: var(--border-color); color: var(--text-primary); }

/* 详情页样式对齐 */
.detail-content { width: 100%; max-width: 100%; margin: 0 auto; padding-top: 0.5rem; }
.back-row { display: flex; align-items: center; margin-bottom: 1rem; gap: 0.8rem; }
.back-btn { background: var(--bg-input); border: 0.5px solid var(--border-light); color: var(--text-primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: 0.2s; }
.back-btn:hover { background: var(--bg-hover); transform: scale(1.05); }
.watch-name { font-size: 1.8rem; font-weight: 600; color: var(--text-primary); }
.info-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding: 0.5rem 0; border-bottom: 0.5px solid var(--border-light); }
.video-count-badge { background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 40px; padding: 0.3rem 1rem; font-size: 0.9rem; color: var(--text-secondary); white-space: nowrap; }
.operation-bar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
.operation-bar .search-container { margin: 0; flex: 1; }
.video-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.video-item { display: flex; gap: 1rem; background: var(--bg-card); backdrop-filter: blur(20px); border: 0.5px solid var(--border-light); border-radius: 20px; padding: 0.8rem; transition: 0.2s; cursor: pointer; align-items: center; }
.video-item:hover { background: var(--bg-hover); border-color: var(--border-color); transform: translateX(2px); }
.video-poster { width: 80px; height: 120px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background-color: var(--bg-input); }
.video-poster img { width: 100%; height: 100%; object-fit: cover; }
.video-info { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
.video-title { font-size: 1rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.video-origin-title { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.video-remark { font-size: 0.75rem; color: var(--warning-color); margin-top: 0.1rem; word-break: break-word; line-height: 1.4; }
.video-type-badge { font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 0.2rem; }
.video-checkbox { appearance: none; -webkit-appearance: none; width: 22px; height: 22px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-light); cursor: pointer; outline: none; transition: background 0.2s, border-color 0.2s; position: relative; flex-shrink: 0; margin-left: 0.5rem; }
.video-checkbox:checked { background: var(--accent-color); border-color: var(--accent-color); }
.video-checkbox:checked::after { content: "✓"; font-size: 14px; color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; }
.video-actions { display: flex; gap: 0.5rem; margin-left: 0.5rem; }
.selected-badge { background: var(--bg-hover); backdrop-filter: blur(20px); color: var(--text-primary); font-size: 0.7rem; font-weight: 500; min-width: 24px; height: 24px; border-radius: 40px; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px; border: 1px solid var(--border-light); }
.maintainer-input-container { display: flex; gap: 0.5rem; margin-bottom: 1rem; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 40px; padding: 0.2rem; }
.maintainer-input-container input { flex: 1; background: transparent; border: none; padding: 0.6rem 1rem; color: var(--text-primary); font-size: 0.9rem; outline: none; }
.maintainer-input-container input::placeholder { color: var(--text-tertiary); }
.maintainer-input-container button { background: var(--accent-color); border: none; color: white; width: 40px; height: 40px; border-radius: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
.maintainer-input-container button:hover { background: var(--accent-hover); transform: scale(1.02); }
.maintainer-list { margin-top: 1rem; }
.maintainer-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-light); }
.maintainer-avatar-sm { width: 24px; height: 24px; border-radius: 50%; background-color: var(--bg-input); overflow: hidden; }
.maintainer-avatar-sm img { width: 100%; height: 100%; object-fit: cover; }
.maintainer-name { flex: 1; color: var(--text-primary); }
.maintainer-id { color: var(--text-secondary); font-size: 0.7rem; }
.dynamic-input-container { width: 100%; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 40px; padding: 0.2rem; margin-bottom: 1rem; }
.dynamic-input-container input { width: 100%; background: transparent; border: none; padding: 0.6rem 1rem; color: var(--text-primary); font-size: 0.9rem; outline: none; }
.dynamic-input-container input::placeholder { color: var(--text-tertiary); }
.tags-input { display: flex; flex-wrap: wrap; gap: 0.3rem; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 40px; padding: 0.3rem 0.5rem; }
.tags-input input { border: none; background: transparent; padding: 0.3rem 0.5rem; flex: 1; min-width: 100px; color: var(--text-primary); outline: none; }
.tags-input input::placeholder { color: var(--text-tertiary); }
.tag-item { background: var(--bg-hover); border-radius: 40px; padding: 0.2rem 0.8rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem; color: var(--text-primary); }
.tag-item i { cursor: pointer; color: var(--text-secondary); transition: color 0.2s; }
.tag-item i:hover { color: var(--danger-color); }
.toggle-switch-label { font-size: 0.9rem; color: var(--text-secondary); }
.image-upload-area { width: 100%; margin-bottom: 1.5rem; position: relative; border-radius: 16px; overflow: hidden; background-color: var(--bg-input); aspect-ratio: 16/9; cursor: pointer; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--border-light); }
.image-preview { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-card); position: relative; }
.image-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.image-preview .placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 0.9rem; }
.image-preview .placeholder i { font-size: 3rem; margin-bottom: 0.5rem; color: var(--text-tertiary); }
.image-upload-buttons { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; gap: 1rem; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.2s; }
.image-upload-area:hover .image-upload-buttons { opacity: 1; }
.image-upload-btn, .image-delete-btn { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.5rem 1.2rem; border-radius: 40px; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
.image-upload-btn:hover { background: rgba(255,255,255,0.3); }
.image-delete-btn { color: #ff6b6b; border-color: #ff6b6b; }
.image-delete-btn:hover { background: rgba(255,107,107,0.2); }
.image-upload-area.no-image .image-upload-buttons { opacity: 1; background: rgba(0,0,0,0.3); }
.image-upload-area.no-image .image-upload-buttons .image-delete-btn { display: none; }

@media (max-width: 700px) {
  .content-wrapper { padding: 0 1rem; }
  .page-header { margin: 0.8rem 0; }
  .page-title { font-size: 1.8rem; }
  .page-subtitle { font-size: 0.9rem; margin-top: 0.2rem; }
  .filter-bar { gap: 0.5rem; margin-bottom: 1rem; }
  .add-line-btn { width: 40px; height: 40px; font-size: 1rem; }
  .card-grid { grid-template-columns: 1fr; gap: 1rem; }
  .watch-card { padding: 1.2rem; border-radius: 20px; }
  .card-title { font-size: 1rem; }
  .no-results { padding: 2.5rem 0; font-size: 1rem; margin: 0.8rem 0; }
  .detail-content { padding: 0; }
  .watch-name { font-size: 1.5rem; }
  .video-poster { width: 60px; height: 90px; }
  .video-title { font-size: 0.9rem; }
  .operation-bar { flex-wrap: wrap; }
  .operation-bar .search-container { flex: 1; min-width: 0; }
}
</style>
\`;
}
// ==================== 片单详情渲染（动态填充） ====================
function renderDetailStructure(watchDetail) {
const watchId = watchDetail.id;
const watchName = watchDetail.name || '未命名';
const watchVideoCount = watchDetail.video_count || 0;
const isSelf = watchDetail.is_self || false;
const isSubscribed = watchDetail.is_subscribe || false;
const canEditVideo = watchDetail.is_edit_video || false;
const isShow = watchDetail.is_show !== false;
const showFullControls = isSelf;
const showLimitedControls = canEditVideo && !isSelf;
const hasControls = showFullControls || showLimitedControls;

return \`
<div class="detail-content">
  \${!hasControls ? \`
  <!-- 无权限：单行紧凑布局 (标题 + 计数同行) -->
  <div class="back-row" style="justify-content: space-between; align-items: center;">
    <div style="display: flex; align-items: center; gap: 0.8rem; flex: 1; min-width: 0;">
        <div class="back-btn" id="backBtn"><i class="fas fa-arrow-left"></i></div>
        <span class="watch-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${window.escapeHtml(watchName)}</span>
    </div>
    <span class="video-count-badge" id="videoCountBadge" style="margin-left: 0.5rem; flex-shrink: 0;"><i class="fas fa-film"></i> \${watchVideoCount}</span>
  </div>
  \` : \`
  <!-- 有权限：原始双行布局 -->
  <div class="back-row">
    <div class="back-btn" id="backBtn"><i class="fas fa-arrow-left"></i></div>
    <span class="watch-name">\${window.escapeHtml(watchName)}</span>
  </div>
  <div class="info-row">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      \${isSelf ? '<span class="btn-icon" id="editWatchlistBtn" title="编辑"><i class="fas fa-edit"></i></span>' : ''}
      \${isSelf ? '<span class="btn-icon delete-icon" id="deleteWatchlistBtn" title="删除"><i class="fas fa-trash"></i></span>' : ''}
      \${isSelf ? '<span class="btn-icon" id="toggleShowBtn" title="是否可见"><i class="fas fa-eye' + (isShow ? '' : '-slash') + '"></i></span>' : ''}
      \${isSubscribed ? '<span class="btn-icon" id="sortWatchBtn" title="排序"><i class="fas fa-sort-amount-down"></i></span>' : ''}
      \${isSelf ? '<span class="btn-icon" id="dynamicWatchlistBtn" title="动态片单"><i class="fas fa-sync-alt"></i></span>' : ''}
    </div>
    <span class="video-count-badge" id="videoCountBadge"><i class="fas fa-film"></i> \${watchVideoCount}</span>
  </div>
  \`}
  \${hasControls ? \`
  <div class="operation-bar">
    <div class="search-container" style="margin:0;">
      <input type="text" class="search-input" id="videoSearchInput" placeholder="搜索片单内的影片...">
      <button class="search-btn" id="searchVideosBtn"><i class="fas fa-search"></i></button>
    </div>
    \${hasControls ? '<span class="btn-icon" id="addVideoBtn" title="添加视频"><i class="fas fa-plus"></i></span>' : ''}
    \${showFullControls ? '<span class="btn-icon" id="clearVideosBtn" title="清空视频"><i class="fas fa-trash-alt"></i></span>' : ''}
    \${showFullControls ? '<span class="btn-icon" id="maintainerBtn" title="维护者"><i class="fas fa-users"></i></span>' : ''}
  </div>
  \` : ''}
  <div id="videoListContainer" style="display: none;">
    <div class="apple-loading" id="videoLoadingIndicator"><div class="spinner"></div><span>加载中...</span></div>
    <div class="video-list" id="videoList"></div>
    <div class="load-more" id="detailLoadMoreIndicator" style="display: none;"><div class="spinner"></div> 加载更多...</div>
    <div id="noResults" class="no-results" style="display: none;">没有找到影片</div>
  </div>
  <div id="scroll-trigger" style="height: 1px; width: 100%;"></div>
</div>
\`;
}
// ==================== 片单列表逻辑 ====================
function initListView() {
const searchInput = el.querySelector('#searchInput');
const searchType = el.querySelector('#searchType');
const searchBtn = el.querySelector('#searchBtn');
const addWatchlistBtn = el.querySelector('#addWatchlistBtn');
function updateInputPlaceholder() {
const v = searchType.value;
searchInput.placeholder = v === 'author' ? '输入作者 ID' : (v === 'author_username' ? '输入作者名称' : '输入片单名称');
}
function shouldSearch() {
const option = searchType.value;
const inputValue = searchInput.value.trim();
return !((option === 'author' || option === 'author_username') && inputValue === '');
}
async function loadWatchlists(reset = false) {
if (listState.isLoading) return;
if (reset) {
listState.currentPage = 1;
listState.hasMore = true;
const cardGrid = el.querySelector('#cardGrid');
if (cardGrid) cardGrid.innerHTML = '';
const noResults = el.querySelector('#noResults');
if (noResults) noResults.style.display = 'none';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'flex';
const cardGridContainer = el.querySelector('#cardGridContainer');
if (cardGridContainer) cardGridContainer.style.display = 'none';
}
if (!shouldSearch()) {
const cardGrid = el.querySelector('#cardGrid');
if (cardGrid) cardGrid.innerHTML = '';
const noResults = el.querySelector('#noResults');
if (noResults) {
noResults.style.display = 'block';
noResults.textContent = searchType.value === 'author' ? '请输入作者 ID' : '没有找到片单';
}
const cardGridContainer = el.querySelector('#cardGridContainer');
if (cardGridContainer) cardGridContainer.style.display = 'block';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
return;
}
if (!listState.hasMore) return;
listState.isLoading = true;
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'block';
if (listState.searchController) listState.searchController.abort();
const controller = new AbortController();
listState.searchController = controller;
let params = new URLSearchParams();
params.append('page', listState.currentPage);
params.append('page_size', listState.pageSize);
const option = listState.currentOption;
const inputValue = listState.currentSearch.trim();
if (option === 'mine') params.append('is_self', '1');
else if (option === 'subscribed') params.append('is_subscribe', '1');
else if (option === 'author') { if (inputValue !== '') params.append('author_id', inputValue); }
else if (option === 'author_username') { if (inputValue !== '') params.append('author_username', inputValue); }
if (option !== 'author' && option !== 'author_username' && inputValue !== '') params.append('name', inputValue);
let url = '/api/watch?' + params.toString();
try {
const response = await window.fetchWithAuth(url, { signal: controller.signal });
if (!response) {
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const cardGridContainer = el.querySelector('#cardGridContainer');
if (cardGridContainer) cardGridContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
listState.isLoading = false;
return;
}
if (controller !== listState.searchController) return;
const data = await response.json();
const items = data.items || [];
const total = data.total || 0;
listState.pageSize = data.page_size || 20;
listState.totalPages = Math.ceil(total / listState.pageSize);
const current = data.page || listState.currentPage;
if (reset && items.length === 0) {
const noResults = el.querySelector('#noResults');
if (noResults) {
noResults.style.display = 'block';
noResults.textContent = '没有找到片单';
}
const cardGridContainer = el.querySelector('#cardGridContainer');
if (cardGridContainer) cardGridContainer.style.display = 'block';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
listState.isLoading = false;
return;
}
if (items.length > 0) {
renderWatchlistCards(items);
listState.currentPage = current + 1;
listState.hasMore = listState.currentPage <= listState.totalPages;
} else {
listState.hasMore = false;
}
if (reset) {
const cardGridContainer = el.querySelector('#cardGridContainer');
if (cardGridContainer) cardGridContainer.style.display = 'block';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
}
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = listState.hasMore ? 'block' : 'none';
} catch (err) {
if (err.name === 'AbortError') {
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const cardGridContainer = el.querySelector('#cardGridContainer');
if (cardGridContainer) cardGridContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
listState.isLoading = false;
return;
}
console.error(err);
window.showToast('获取片单失败：' + err.message);
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const cardGridContainer = el.querySelector('#cardGridContainer');
if (cardGridContainer) cardGridContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
} finally {
if (controller === listState.searchController) {
listState.isLoading = false;
listState.searchController = null;
}
}
}
function renderWatchlistCards(items) {
const cardGrid = el.querySelector('#cardGrid');
if (!cardGrid) return;
items.forEach(item => {
const card = document.createElement('div');
card.className = 'watch-card';
const coverUrl = item.image_poster_url || '';
const videoCount = item.video_count || 0;
const subscribeCount = item.subscribe_count || 0;
const carrot = item.carrot || 0;
const isSelf = item.is_self || false;
const publicBadge = item.is_public ? '<span class="public-badge"><i class="fas fa-globe"></i> 公开</span>' : '<span class="private-badge"><i class="fas fa-lock"></i> 私有</span>';
const tags = item.tags || [];
let tagsHtml = '';
if (tags.length > 0) tagsHtml = tags.map(t => '<span class="tag">' + window.escapeHtml(t) + '</span>').join('');
let authorHtml = '';
if (item.author) {
const authorAvatar = item.author.avatar ? '<img src="' + window.escapeHtml(item.author.avatar) + '">' : '<i class="fas fa-user"></i>';
authorHtml = '<div class="author-info"><div class="author-avatar">' + authorAvatar + '</div><span>' + window.escapeHtml(item.author.username || '未知') + '</span></div>';
} else {
authorHtml = '<div class="author-info"><span>无作者</span></div>';
}
let maintainersHtml = '';
if (item.maintainers && item.maintainers.length > 0) {
const maxShow = 3;
const showMaintainers = item.maintainers.slice(0, maxShow);
maintainersHtml = '<div class="corner-bottom-right">' + showMaintainers.map(m => {
const avatar = m.avatar ? '<img src="' + window.escapeHtml(m.avatar) + '">' : '<i class="fas fa-user"></i>';
return '<div class="maintainer-avatar" title="' + window.escapeHtml(m.username || '') + '">' + avatar + '</div>';
}).join('') + (item.maintainers.length > maxShow ? '<div class="maintainer-avatar">+' + (item.maintainers.length - maxShow) + '</div>' : '') + '</div>';
}
const subscribeBtnClass = item.is_subscribe ? 'subscribe-btn subscribed' : 'subscribe-btn';
const subscribeBtnText = item.is_subscribe ? '已订阅' : '订阅';
card.innerHTML = '<div class="card-cover">' + (coverUrl ? '<img src="' + coverUrl + '" loading="lazy">' : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg-input);"><i class="fas fa-list" style="font-size:3rem; color:var(--text-tertiary);"></i></div>') + '<div class="corner-top-left"><span class="count-badge"><i class="fas fa-film"></i> ' + videoCount + '</span><span class="count-badge"><i class="fas fa-users"></i> ' + subscribeCount + '</span></div><div class="corner-top-right">' + publicBadge + '</div>' + maintainersHtml + '</div><div class="card-info"><div class="info-row1"><div class="card-title" title="' + window.escapeHtml(item.name) + '">' + window.escapeHtml(item.name) + '</div><span class="carrot-badge"><i class="fas fa-carrot"></i> ' + carrot + '</span></div><div class="tags-container">' + tagsHtml + '</div><div class="info-row3">' + authorHtml + '<div style="display: flex; align-items: center; gap: 0.3rem;"><button class="' + subscribeBtnClass + '" data-id="' + item.id + '" data-subscribed="' + item.is_subscribe + '">' + subscribeBtnText + '</button></div></div></div>';
const tagsContainer = card.querySelector('.tags-container');
if (tagsContainer && tags.length > 0) {
tagsContainer.dataset.allTags = JSON.stringify(tags);
}
card.addEventListener('click', (e) => {
if (e.target.closest('.subscribe-btn')) return;
const id = item.id;
if (!id) return;
savedScrollTop = window.scrollY;
showDetailView(id);
});
const subBtn = card.querySelector('.subscribe-btn');
if (subBtn) {
subBtn.addEventListener('click', async (e) => {
e.stopPropagation();
const id = subBtn.dataset.id;
const isSubscribed = subBtn.dataset.subscribed === 'true';
try {
const response = await window.fetchWithAuth('/api/watch/' + id + '/subscribe', { method: 'PUT' });
if (!response) return;
const data = await response.json();
const newState = data.is_subscribe;
subBtn.dataset.subscribed = newState;
subBtn.textContent = newState ? '已订阅' : '订阅';
subBtn.classList.toggle('subscribed', newState);
window.showToast(newState ? '订阅成功' : '已取消订阅');
} catch (err) {
window.showToast(err.message);
}
});
}
cardGrid.appendChild(card);
});
}
function performSearch(reset = true) {
listState.currentOption = searchType.value;
listState.currentSearch = searchInput.value;
loadWatchlists(reset);
}
const debouncedSearch = window.debounce(() => performSearch(true), 500);
searchType.onchange = function() {
updateInputPlaceholder();
searchInput.value = '';
listState.currentSearch = '';
const val = searchType.value;
if ((val === 'author' || val === 'author_username') && searchInput.value.trim() === '') {
// 不做搜索
} else {
performSearch(true);
}
};
searchInput.oninput = function() {
const val = searchType.value;
if (val === 'author' || val === 'author_username') {
listState.currentSearch = this.value;
performSearch(true);
} else {
debouncedSearch();
}
};
searchBtn.onclick = function() {
debouncedSearch.cancel();
performSearch(true);
};
searchInput.onkeypress = (e) => { if (e.key === 'Enter') { debouncedSearch.cancel(); performSearch(true); } };
if (addWatchlistBtn) {
addWatchlistBtn.addEventListener('click', () => openEditWatchlistModal(null));
}
const scrollHandler = () => {
if (listState.isLoading || !listState.hasMore) return;
const scrollY = window.scrollY;
const windowHeight = window.innerHeight;
const documentHeight = document.documentElement.scrollHeight;
if (scrollY + windowHeight >= documentHeight - 200) {
loadWatchlists();
}
};
window.addEventListener('scroll', scrollHandler);
el._listScrollHandler = scrollHandler;
el._scrollHandlerAttached = true;
loadWatchlistsFn = loadWatchlists;
updateInputPlaceholder();
loadWatchlists(true);
}
// ==================== 片单详情逻辑 ====================
async function showDetailView(watchId) {
currentDetailWatchId = watchId;
currentView = 'detail';
const listView = el.querySelector('#listView');
const detailView = el.querySelector('#detailView');
if (listView) listView.style.display = 'none';
if (detailView) {
detailView.style.display = 'block';
detailView.innerHTML = '<div class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>';
}
if (el._listScrollHandler && el._scrollHandlerAttached) {
window.removeEventListener('scroll', el._listScrollHandler);
el._scrollHandlerAttached = false;
}
await loadWatchDetail(watchId);
}
async function loadWatchDetail(watchId) {
try {
const response = await window.fetchWithAuth('/api/watch?watch_id=' + watchId);
if (!response) return;
const data = await response.json();
const watchDetail = data.items?.[0] || data;
if (!watchDetail) throw new Error('未找到片单');
detailState.watchDetail = watchDetail;
detailState.watchId = watchId;
renderWatchDetail(watchDetail);
} catch (err) {
console.error(err);
window.showToast('加载片单详情失败');
backToList();
}
}
function renderWatchDetail(watchDetail) {
const detailView = el.querySelector('#detailView');
if (!detailView) return;
detailView.innerHTML = renderDetailStructure(watchDetail);
bindDetailEvents(watchDetail);
loadVideosInDetail(true);
}
function bindDetailEvents(watchDetail) {
const backBtn = el.querySelector('#backBtn');
if (backBtn) backBtn.addEventListener('click', backToList);
const editWatchlistBtn = el.querySelector('#editWatchlistBtn');
if (editWatchlistBtn) editWatchlistBtn.addEventListener('click', () => openEditWatchlistModal(watchDetail));
const deleteWatchlistBtn = el.querySelector('#deleteWatchlistBtn');
if (deleteWatchlistBtn) deleteWatchlistBtn.addEventListener('click', async () => {
if (confirm('确定要删除该片单吗？此操作不可撤销。')) {
try {
const response = await window.fetchWithAuth('/api/watch/' + watchDetail.id, { method: 'DELETE' });
if (!response) return;
window.showToast('删除成功');
backToList();
} catch (err) {
window.showToast(err.message);
}
}
});
const toggleShowBtn = el.querySelector('#toggleShowBtn');
if (toggleShowBtn) {
let isShow = watchDetail.is_show !== false;
toggleShowBtn.addEventListener('click', async () => {
const newShow = !isShow;
try {
const response = await window.fetchWithAuth('/api/watch/' + watchDetail.id + '/show', {
method: 'PUT',
body: JSON.stringify({ is_show: newShow })
});
if (!response) return;
const data = await response.json();
isShow = data.is_show;
toggleShowBtn.innerHTML = isShow ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
window.showToast('可见性已更新');
} catch (err) {
window.showToast(err.message);
}
});
}
const sortWatchBtn = el.querySelector('#sortWatchBtn');
if (sortWatchBtn) sortWatchBtn.addEventListener('click', () => openSortWatchModal(watchDetail.id, watchDetail.user_sort));
const dynamicWatchlistBtn = el.querySelector('#dynamicWatchlistBtn');
if (dynamicWatchlistBtn) dynamicWatchlistBtn.addEventListener('click', () => openDynamicModal(watchDetail.id, watchDetail.dynamic_url));
const videoSearchInput = el.querySelector('#videoSearchInput');
const searchVideosBtn = el.querySelector('#searchVideosBtn');
const addVideoBtn = el.querySelector('#addVideoBtn');
const clearVideosBtn = el.querySelector('#clearVideosBtn');
const maintainerBtn = el.querySelector('#maintainerBtn');
if (videoSearchInput) {
let debounceTimer;
videoSearchInput.addEventListener('input', () => {
clearTimeout(debounceTimer);
debounceTimer = setTimeout(() => {
detailState.currentSearch = videoSearchInput.value;
loadVideosInDetail(true);
}, 300);
});
}
if (searchVideosBtn) searchVideosBtn.addEventListener('click', () => {
detailState.currentSearch = videoSearchInput.value;
loadVideosInDetail(true);
});
if (addVideoBtn) addVideoBtn.addEventListener('click', () => openAddVideoModal(watchDetail.id));
if (clearVideosBtn) clearVideosBtn.addEventListener('click', async () => {
if (confirm('确定要清空该片单的所有视频吗？此操作不可撤销。')) {
try {
const response = await window.fetchWithAuth('/api/watch/' + watchDetail.id + '/video/empty', { method: 'DELETE' });
if (!response) return;
window.showToast('清空成功');
watchDetail.video_count = 0;
const badge = el.querySelector('#videoCountBadge');
if (badge) badge.innerHTML = '<i class="fas fa-film"></i> 0';
loadVideosInDetail(true);
} catch (err) {
window.showToast(err.message);
}
}
});
if (maintainerBtn) maintainerBtn.addEventListener('click', () => openMaintainerModal(watchDetail.id, watchDetail.maintainers));
const scrollTrigger = el.querySelector('#scroll-trigger');
if (scrollTrigger) {
const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting && !detailState.isLoading && detailState.hasMore) {
loadVideosInDetail();
}
});
}, { threshold: 0.1 });
observer.observe(scrollTrigger);
el._detailObserver = observer;
}
}
async function loadVideosInDetail(reset = false) {
if (detailState.isLoading) return;
if (reset) {
detailState.currentPage = 1;
detailState.hasMore = true;
const videoList = el.querySelector('#videoList');
if (videoList) videoList.innerHTML = '';
const noResults = el.querySelector('#noResults');
if (noResults) noResults.style.display = 'none';
const videoLoadingIndicator = el.querySelector('#videoLoadingIndicator');
if (videoLoadingIndicator) videoLoadingIndicator.style.display = 'flex';
const videoListContainer = el.querySelector('#videoListContainer');
if (videoListContainer) videoListContainer.style.display = 'none';
}
if (!detailState.hasMore) return;
detailState.isLoading = true;
const loadMoreIndicator = el.querySelector('#detailLoadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'block';
if (detailState.searchController) detailState.searchController.abort();
const controller = new AbortController();
detailState.searchController = controller;
let url = '/api/watch/' + detailState.watchId + '/video?page=' + detailState.currentPage + '&page_size=' + detailState.pageSize;
if (detailState.currentSearch.trim() !== '') {
url += '&video_title=' + encodeURIComponent(detailState.currentSearch.trim());
}
try {
const response = await window.fetchWithAuth(url, { signal: controller.signal });
if (!response) {
const videoLoadingIndicator = el.querySelector('#videoLoadingIndicator');
if (videoLoadingIndicator) videoLoadingIndicator.style.display = 'none';
const videoListContainer = el.querySelector('#videoListContainer');
if (videoListContainer) videoListContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#detailLoadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
detailState.isLoading = false;
return;
}
if (controller !== detailState.searchController) return;
const data = await response.json();
const items = data.items || [];
const total = data.total || 0;
detailState.pageSize = data.page_size || 15;
detailState.totalPages = Math.ceil(total / detailState.pageSize);
const current = data.page || detailState.currentPage;
if (reset && items.length === 0) {
const noResults = el.querySelector('#noResults');
if (noResults) noResults.style.display = 'block';
const videoListContainer = el.querySelector('#videoListContainer');
if (videoListContainer) videoListContainer.style.display = 'block';
const videoLoadingIndicator = el.querySelector('#videoLoadingIndicator');
if (videoLoadingIndicator) videoLoadingIndicator.style.display = 'none';
const loadMoreIndicator = el.querySelector('#detailLoadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
detailState.isLoading = false;
return;
}
if (items.length > 0) {
renderVideosInDetail(items, detailState.watchDetail.is_self, detailState.watchDetail.is_edit_video, detailState.watchId, !reset);
detailState.currentPage = current + 1;
detailState.hasMore = detailState.currentPage <= detailState.totalPages;
} else {
detailState.hasMore = false;
}
if (reset) {
const videoLoadingIndicator = el.querySelector('#videoLoadingIndicator');
if (videoLoadingIndicator) videoLoadingIndicator.style.display = 'none';
const videoListContainer = el.querySelector('#videoListContainer');
if (videoListContainer) videoListContainer.style.display = 'block';
}
const loadMoreIndicator = el.querySelector('#detailLoadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = detailState.hasMore ? 'block' : 'none';
} catch (err) {
if (err.name === 'AbortError') {
const videoLoadingIndicator = el.querySelector('#videoLoadingIndicator');
if (videoLoadingIndicator) videoLoadingIndicator.style.display = 'none';
const videoListContainer = el.querySelector('#videoListContainer');
if (videoListContainer) videoListContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#detailLoadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
detailState.isLoading = false;
return;
}
console.error(err);
window.showToast('获取影片失败：' + err.message);
const videoLoadingIndicator = el.querySelector('#videoLoadingIndicator');
if (videoLoadingIndicator) videoLoadingIndicator.style.display = 'none';
const videoListContainer = el.querySelector('#videoListContainer');
if (videoListContainer) videoListContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#detailLoadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
} finally {
if (controller === detailState.searchController) {
detailState.isLoading = false;
detailState.searchController = null;
}
}
}
function renderVideosInDetail(items, isSelf, canEditVideo, watchId, append = false) {
const videoList = el.querySelector('#videoList');
if (!videoList) return;
if (!append) videoList.innerHTML = '';
items.forEach(item => {
const elItem = document.createElement('div');
elItem.className = 'video-item';
elItem.dataset.videoId = item.video_id;
const posterUrl = item.video_image_poster || '';
const title = item.video_title || '未知';
const originTitle = item.video_origin_title || '';
const type = item.video_type === 'movie' ? '电影' : '剧集';
const sort = item.sort || 80;
const remark = item.remark || '';
let actionsHtml = '';
if (isSelf || canEditVideo) {
actionsHtml = '<div class="video-actions"><span class="btn-icon edit-video" data-sort="' + sort + '" data-remark="' + window.escapeHtml(remark) + '" title="编辑"><i class="fas fa-edit"></i></span><span class="btn-icon delete-video" title="删除"><i class="fas fa-trash"></i></span></div>';
}
const remarkHtml = remark ? '<div class="video-remark"><i class="fas fa-pencil-alt"></i> ' + window.escapeHtml(remark) + '</div>' : '';
elItem.innerHTML = '<div class="video-poster">' + (posterUrl ? '<img src="' + posterUrl + '" loading="lazy">' : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg-input);"><i class="fas fa-film"></i></div>') + '</div><div class="video-info"><div class="video-type-badge">' + type + '</div><div class="video-title">' + window.escapeHtml(title) + '</div>' + (originTitle ? '<div class="video-origin-title">' + window.escapeHtml(originTitle) + '</div>' : '') + remarkHtml + '</div>' + actionsHtml;
if (isSelf || canEditVideo) {
const editBtn = elItem.querySelector('.edit-video');
if (editBtn) editBtn.addEventListener('click', (e) => {
e.stopPropagation();
const sort = editBtn.dataset.sort;
const remark = editBtn.dataset.remark;
openEditVideoModal(watchId, item.video_id, sort, remark);
});
const deleteBtn = elItem.querySelector('.delete-video');
if (deleteBtn) deleteBtn.addEventListener('click', async (e) => {
e.stopPropagation();
if (confirm('确定要删除该视频吗？')) {
try {
const response = await window.fetchWithAuth('/api/watch/' + watchId + '/video/' + item.video_id, { method: 'DELETE' });
if (!response) return;
window.showToast('删除成功');
const badge = el.querySelector('#videoCountBadge');
if (badge) {
let count = parseInt(badge.innerHTML.match(/\\d+/)[0]) || 0;
count--;
badge.innerHTML = '<i class="fas fa-film"></i> ' + count;
}
loadVideosInDetail(true);
} catch (err) {
window.showToast(err.message);
}
}
});
}
elItem.addEventListener('click', () => {
window.navigate('/media/' + item.video_id + '?from=watch&watch_id=' + watchId);
});
videoList.appendChild(elItem);
});
}
// ==================== 编辑片单模态框 ====================
function openEditWatchlistModal(watch) {
let modal = el.querySelector('#editWatchlistModal');
if (!modal) {
modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'editWatchlistModal';
modal.innerHTML = \`
<div class="modal-content">
  <div class="modal-title">
    <span id="editWatchlistModalTitle">\${watch ? '编辑片单' : '新增片单'}</span>
    <button class="btn-icon" id="closeEditWatchlistModal"><i class="fas fa-times"></i></button>
  </div>
  <div class="image-upload-area" id="imageUploadArea">
    <div class="image-preview" id="imagePreview">
      <img id="previewImg" src="" style="display: none;">
      <div class="placeholder" id="placeholder"><i class="fas fa-cloud-upload-alt"></i><span>点击上传封面</span></div>
    </div>
    <div class="image-upload-buttons" id="imageUploadButtons">
      <button class="image-upload-btn" id="uploadImageBtn">上传</button>
      <button class="image-delete-btn" id="deleteImageBtn" style="display: none;">删除</button>
    </div>
    <input type="file" id="imageFileInput" accept="image/*" style="display: none;">
  </div>
  <input type="hidden" id="editWatchImagePoster">
  <div class="form-group"><label>片单名称</label><input type="text" id="editWatchName" maxlength="100" placeholder="片单名称"></div>
  <div class="form-group"><label>简介</label><textarea id="editWatchDescription" maxlength="10000" rows="3" placeholder="简介"></textarea></div>
  <div class="form-group"><label>所需萝卜 (0-50000)</label><input type="number" id="editWatchPoint" min="0" max="50000" value="0"></div>
  <div class="form-group"><label>标签</label><div class="tags-input" id="tagsInputContainer"><input type="text" id="tagInput" placeholder="输入标签后按回车"></div><div id="tagsList" style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem;"></div></div>
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;"><span class="toggle-switch-label">是否公开</span><div class="toggle-switch" id="editWatchIsPublicToggle"></div><input type="hidden" id="editWatchIsPublic" value=""></div>
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;"><span class="toggle-switch-label">是否显示空媒体</span><div class="toggle-switch" id="editWatchShowEmptyToggle"></div><input type="hidden" id="editWatchShowEmpty" value=""></div>
  <div class="modal-buttons"><button class="modal-btn" id="editWatchCancel">取消</button><button class="modal-btn primary" id="editWatchConfirm">保存</button></div>
</div>
\`;
el.appendChild(modal);
}
const titleSpan = modal.querySelector('#editWatchlistModalTitle');
const nameInput = modal.querySelector('#editWatchName');
const descInput = modal.querySelector('#editWatchDescription');
const pointInput = modal.querySelector('#editWatchPoint');
const imagePosterInput = modal.querySelector('#editWatchImagePoster');
const previewImg = modal.querySelector('#previewImg');
const placeholder = modal.querySelector('#placeholder');
const deleteImageBtn = modal.querySelector('#deleteImageBtn');
const imageUploadArea = modal.querySelector('#imageUploadArea');
const tagsList = modal.querySelector('#tagsList');
const tagInput = modal.querySelector('#tagInput');
const publicToggle = modal.querySelector('#editWatchIsPublicToggle');
const showEmptyToggle = modal.querySelector('#editWatchShowEmptyToggle');
const publicHidden = modal.querySelector('#editWatchIsPublic');
const showEmptyHidden = modal.querySelector('#editWatchShowEmpty');
let currentTags = [];
let currentPosterUrl = '';
let isImageDeleted = false;
let currentEditWatchId = null;
if (watch) {
titleSpan.textContent = '编辑片单';
currentEditWatchId = watch.id;
nameInput.value = watch.name || '';
descInput.value = watch.description || '';
pointInput.value = watch.carrot || 0;
imagePosterInput.value = watch.image_poster || '';
currentPosterUrl = watch.image_poster_url || '';
if (currentPosterUrl) {
previewImg.src = currentPosterUrl;
previewImg.style.display = 'block';
placeholder.style.display = 'none';
deleteImageBtn.style.display = 'inline-block';
imageUploadArea.classList.remove('no-image');
} else {
previewImg.style.display = 'none';
placeholder.style.display = 'flex';
deleteImageBtn.style.display = 'none';
imageUploadArea.classList.add('no-image');
}
currentTags = watch.tags || [];
isImageDeleted = false;
const isPublic = watch.is_public || false;
const isShowEmpty = watch.is_show_empty || false;
if (publicToggle) {
if (isPublic) publicToggle.classList.add('active'); else publicToggle.classList.remove('active');
publicHidden.value = isPublic ? '1' : '0';
}
if (showEmptyToggle) {
if (isShowEmpty) showEmptyToggle.classList.add('active'); else showEmptyToggle.classList.remove('active');
showEmptyHidden.value = isShowEmpty ? '1' : '0';
}
} else {
titleSpan.textContent = '新增片单';
currentEditWatchId = null;
nameInput.value = '';
descInput.value = '';
pointInput.value = 0;
imagePosterInput.value = '';
currentPosterUrl = '';
previewImg.style.display = 'none';
placeholder.style.display = 'flex';
deleteImageBtn.style.display = 'none';
imageUploadArea.classList.add('no-image');
currentTags = [];
isImageDeleted = false;
if (publicToggle) { publicToggle.classList.remove('active'); publicHidden.value = '0'; }
if (showEmptyToggle) { showEmptyToggle.classList.add('active'); showEmptyHidden.value = '1'; }
}
function renderTags() {
tagsList.innerHTML = currentTags.map(tag => '<span class="tag-item">' + window.escapeHtml(tag) + '<i class="fas fa-times" data-tag="' + window.escapeHtml(tag) + '"></i></span>').join('');
tagsList.querySelectorAll('.tag-item i').forEach(icon => {
icon.addEventListener('click', () => {
const tag = icon.dataset.tag;
currentTags = currentTags.filter(t => t !== tag);
renderTags();
});
});
}
renderTags();
tagInput.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
e.preventDefault();
const tag = tagInput.value.trim();
if (tag && !currentTags.includes(tag)) { currentTags.push(tag); renderTags(); }
tagInput.value = '';
}
});
const uploadImageBtn = modal.querySelector('#uploadImageBtn');
const imageFileInput = modal.querySelector('#imageFileInput');
uploadImageBtn.addEventListener('click', () => imageFileInput.click());
imageFileInput.addEventListener('change', () => {
if (imageFileInput.files.length > 0) {
const file = imageFileInput.files[0];
const reader = new FileReader();
reader.onload = (e) => {
if (previewImg) { previewImg.src = e.target.result; previewImg.style.display = 'block'; }
if (placeholder) placeholder.style.display = 'none';
if (deleteImageBtn) deleteImageBtn.style.display = 'inline-block';
if (imageUploadArea) imageUploadArea.classList.remove('no-image');
};
reader.readAsDataURL(file);
uploadImage(file, imagePosterInput);
}
});
deleteImageBtn.addEventListener('click', () => {
if (imagePosterInput) imagePosterInput.value = '';
currentPosterUrl = '';
if (previewImg) previewImg.style.display = 'none';
if (placeholder) placeholder.style.display = 'flex';
if (deleteImageBtn) deleteImageBtn.style.display = 'none';
if (imageUploadArea) imageUploadArea.classList.add('no-image');
isImageDeleted = true;
});
async function uploadImage(file, imagePosterInput) {
try {
const fileId = await window.EmosUpload.uploadImage(file);
if (imagePosterInput) imagePosterInput.value = fileId;
isImageDeleted = false;
window.showToast('图片上传成功');
} catch (err) { window.showToast('图片上传失败：' + err.message); }
}
const saveBtn = modal.querySelector('#editWatchConfirm');
const cancelBtn = modal.querySelector('#editWatchCancel');
const closeBtn = modal.querySelector('#closeEditWatchlistModal');
function closeModal() { modal.classList.remove('show'); }
cancelBtn.addEventListener('click', closeModal);
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
saveBtn.addEventListener('click', async () => {
const name = nameInput.value.trim();
if (!name) { window.showToast('片单名称不能为空'); return; }
const body = {
id: currentEditWatchId, name: name, description: descInput.value.trim() || null,
is_public: publicHidden.value === '1', point: parseInt(pointInput.value) || 0,
tags: currentTags, is_show_empty: showEmptyHidden.value === '1'
};
if (isImageDeleted) body.image_poster = null;
else if (imagePosterInput.value.trim()) body.image_poster = imagePosterInput.value.trim();
saveBtn.disabled = true;
saveBtn.textContent = '保存中...';
try {
const response = await window.fetchWithAuth('/api/watch', { method: 'POST', body: JSON.stringify(body) });
if (!response) return;
window.showToast('保存成功');
closeModal();
if (currentView === 'list') {
listState.currentPage = 1; listState.hasMore = true; listState.currentOption = 'all'; listState.currentSearch = '';
const searchInput = el.querySelector('#searchInput'); if (searchInput) searchInput.value = '';
const searchType = el.querySelector('#searchType'); if (searchType) searchType.value = 'all';
const cardGrid = el.querySelector('#cardGrid'); if (cardGrid) cardGrid.innerHTML = '';
if (loadWatchlistsFn) loadWatchlistsFn(true);
} else { loadWatchDetail(detailState.watchId); }
} catch (err) { window.showToast(err.message); }
finally { saveBtn.disabled = false; saveBtn.textContent = '保存'; }
});
modal.classList.add('show');
}
// ==================== 排序设置模态框 ====================
function openSortWatchModal(watchId, userSort) {
let modal = el.querySelector('#sortWatchModal');
if (!modal) {
modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'sortWatchModal';
modal.innerHTML = \`
<div class="modal-content">
  <div class="modal-title"><span>排序设置</span><button class="btn-icon" id="closeSortWatchModal"><i class="fas fa-times"></i></button></div>
  <div class="form-group"><label>排序序号 (1-100，越小越靠前)</label><input type="number" id="sortWatchSort" min="1" max="100" value="80"></div>
  <div class="modal-buttons"><button class="modal-btn" id="sortWatchCancel">取消</button><button class="modal-btn primary" id="sortWatchConfirm">保存</button></div>
</div>
\`;
el.appendChild(modal);
}
const sortInput = modal.querySelector('#sortWatchSort');
sortInput.value = userSort || 80;
const closeBtn = modal.querySelector('#closeSortWatchModal');
const cancelBtn = modal.querySelector('#sortWatchCancel');
const confirmBtn = modal.querySelector('#sortWatchConfirm');
function closeModal() { modal.classList.remove('show'); }
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
confirmBtn.addEventListener('click', async () => {
const sort = parseInt(sortInput.value);
if (isNaN(sort) || sort < 1 || sort > 100) { window.showToast('排序必须是 1-100 的数字'); return; }
try {
const response = await window.fetchWithAuth('/api/watch/' + watchId + '/sort?sort=' + sort, { method: 'PUT' });
if (!response) return;
window.showToast('排序更新成功');
closeModal();
if (currentView === 'detail') loadWatchDetail(watchId);
} catch (err) { window.showToast(err.message); }
});
modal.classList.add('show');
}
// ==================== 动态片单模态框 ====================
function openDynamicModal(watchId, currentUrl) {
let modal = el.querySelector('#dynamicWatchModal');
if (!modal) {
modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'dynamicWatchModal';
modal.innerHTML = \`
<div class="modal-content">
  <div class="modal-title">动态片单设置</div>
  <div class="dynamic-input-container"><input type="url" id="dynamicUrlInput" placeholder="输入抓取地址（空则关闭）"></div>
  <div class="modal-error" id="dynamicError"></div>
  <div class="modal-buttons"><button class="modal-btn" id="dynamicCancel">取消</button><button class="modal-btn primary" id="dynamicConfirm">保存</button></div>
</div>
\`;
el.appendChild(modal);
}
const urlInput = modal.querySelector('#dynamicUrlInput');
const errorSpan = modal.querySelector('#dynamicError');
urlInput.value = currentUrl || '';
errorSpan.textContent = '';
const closeBtn = modal.querySelector('#dynamicCancel');
const confirmBtn = modal.querySelector('#dynamicConfirm');
function closeModal() { modal.classList.remove('show'); }
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
confirmBtn.addEventListener('click', async () => {
const url = urlInput.value.trim();
const body = { url: url === '' ? null : url };
try {
const response = await window.fetchWithAuth('/api/watch/' + watchId + '/dynamic', { method: 'PUT', body: JSON.stringify(body) });
if (!response) return;
const data = await response.json();
window.showToast('动态片单设置成功');
closeModal();
if (currentView === 'detail') loadWatchDetail(watchId);
if (data.spider) window.showToast('同步：' + data.spider.count_sync + ', 无数据：' + data.spider.count_no_data);
} catch (err) { errorSpan.textContent = err.message; }
});
modal.classList.add('show');
}
// ==================== 编辑视频模态框 ====================
function openEditVideoModal(watchId, videoId, sort, remark) {
let modal = el.querySelector('#editVideoModal');
if (!modal) {
modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'editVideoModal';
modal.innerHTML = \`
<div class="modal-content">
  <div class="modal-title"><span>编辑视频</span><button class="btn-icon" id="closeEditVideoModal"><i class="fas fa-times"></i></button></div>
  <div class="form-group"><label>排序 (1-100)</label><input type="number" id="editSort" min="1" max="100" value="80"></div>
  <div class="form-group"><label>备注 (可选)</label><input type="text" id="editRemark" maxlength="100" placeholder="最多 100 字"></div>
  <div class="modal-buttons"><button class="modal-btn" id="editVideoCancel">取消</button><button class="modal-btn primary" id="editVideoConfirm">确认</button></div>
</div>
\`;
el.appendChild(modal);
}
const sortInput = modal.querySelector('#editSort');
const remarkInput = modal.querySelector('#editRemark');
sortInput.value = sort;
remarkInput.value = remark;
const closeBtn = modal.querySelector('#closeEditVideoModal');
const cancelBtn = modal.querySelector('#editVideoCancel');
const confirmBtn = modal.querySelector('#editVideoConfirm');
function closeModal() { modal.classList.remove('show'); }
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
confirmBtn.addEventListener('click', async () => {
const newSort = parseInt(sortInput.value);
if (isNaN(newSort) || newSort < 1 || newSort > 100) { window.showToast('排序必须是 1-100 的数字'); return; }
const remark = remarkInput.value.trim();
const body = { sort: newSort, remark: remark || null };
try {
const response = await window.fetchWithAuth('/api/watch/' + watchId + '/video/' + videoId, { method: 'POST', body: JSON.stringify(body) });
if (!response) return;
window.showToast('更新成功');
closeModal();
if (currentView === 'detail') loadVideosInDetail(true);
} catch (err) { window.showToast(err.message); }
});
modal.classList.add('show');
}
// ==================== 添加视频模态框 ====================
function openAddVideoModal(watchId) {
let modal = el.querySelector('#addVideoModal');
if (!modal) {
modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'addVideoModal';
modal.innerHTML = \`
<div class="modal-content">
  <div class="modal-title"><span>添加视频</span><button class="btn-icon" id="closeAddVideoModal"><i class="fas fa-times"></i></button></div>
  <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem;">
    <div class="search-container" style="flex:1; margin:0;"><input type="text" class="search-input" id="videoSearchInput" placeholder="搜索视频..."><button class="search-btn" id="videoSearchBtn"><i class="fas fa-search"></i></button></div>
    <div class="selected-badge" id="selectedBadge" style="display: none;">0</div>
  </div>
  <div id="videoSearchResults" class="video-list" style="max-height: 400px; overflow-y: auto;"></div>
  <div class="load-more" id="videoSearchLoadMore" style="display: none;"><div class="spinner"></div> 加载更多...</div>
  <div class="modal-buttons"><button class="modal-btn" id="addVideoCancel">取消</button><button class="modal-btn primary" id="addVideoConfirm">确认</button></div>
</div>
\`;
el.appendChild(modal);
}
const searchInput = modal.querySelector('#videoSearchInput');
const searchBtn = modal.querySelector('#videoSearchBtn');
const resultsDiv = modal.querySelector('#videoSearchResults');
const loadMoreDiv = modal.querySelector('#videoSearchLoadMore');
const selectedBadge = modal.querySelector('#selectedBadge');
const confirmBtn = modal.querySelector('#addVideoConfirm');
const cancelBtn = modal.querySelector('#addVideoCancel');
const closeBtn = modal.querySelector('#closeAddVideoModal');
let searchPage = 1;
let searchHasMore = true;
let searchIsLoading = false;
let searchQuery = '';
let selectedVideos = new Set();
let allSearchItems = [];

function updateSelectedBadge() {
const count = selectedVideos.size;
if (count > 0) {
selectedBadge.textContent = count;
selectedBadge.style.display = 'inline-flex';
} else {
selectedBadge.style.display = 'none';
}
}

// 初始更新一次 badge 状态
updateSelectedBadge();

function renderSearchItems() {
resultsDiv.innerHTML = '';
if (allSearchItems.length === 0) { resultsDiv.innerHTML = '<div class="no-results">没有找到视频</div>'; return; }
allSearchItems.forEach(item => {
const itemDiv = document.createElement('div');
itemDiv.className = 'video-item';
itemDiv.dataset.videoId = item.video_id;
const posterUrl = item.video_image_poster || '';
const type = item.video_type === 'movie' ? '电影' : '剧集';
const title = item.video_title || '未知';
const originTitle = item.video_origin_title || '';
itemDiv.innerHTML = \`
<div class="video-poster">\${posterUrl ? '<img src="' + posterUrl + '" loading="lazy">' : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg-input);"><i class="fas fa-film"></i></div>'}</div>
<div class="video-info">
<div class="video-type-badge">\${type}</div>
<div class="video-title">\${window.escapeHtml(title)}</div>
\${originTitle ? '<div class="video-origin-title">' + window.escapeHtml(originTitle) + '</div>' : ''}
</div>
<input type="checkbox" class="video-checkbox" data-video-id="\${item.video_id}">
\`;
const checkbox = itemDiv.querySelector('.video-checkbox');
const videoIdStr = String(item.video_id);
if (selectedVideos.has(videoIdStr)) checkbox.checked = true;
checkbox.addEventListener('change', () => {
if (checkbox.checked) selectedVideos.add(videoIdStr);
else selectedVideos.delete(videoIdStr);
updateSelectedBadge();
});
resultsDiv.appendChild(itemDiv);
});
}
async function loadSearchResults(reset = true) {
if (searchIsLoading) return;
if (reset) { searchPage = 1; searchHasMore = true; allSearchItems = []; renderSearchItems(); loadMoreDiv.style.display = 'none'; }
if (!searchHasMore) return;
searchIsLoading = true;
loadMoreDiv.style.display = 'block';
let url = '/api/watch/' + watchId + '/video/search?page=' + searchPage + '&page_size=20';
if (searchQuery) url += '&title=' + encodeURIComponent(searchQuery);
try {
const response = await window.fetchWithAuth(url);
if (!response) return;
const data = await response.json();
const items = Array.isArray(data) ? data : (data.items || []);
const pageSize = 20;
if (items.length > 0) {
allSearchItems = allSearchItems.concat(items);
renderSearchItems();
searchPage++;
searchHasMore = items.length === pageSize;
} else {
searchHasMore = false;
if (searchPage === 1) { allSearchItems = []; renderSearchItems(); }
}
} catch (err) { console.error(err); window.showToast('搜索失败：' + err.message); }
finally { searchIsLoading = false; loadMoreDiv.style.display = searchHasMore ? 'block' : 'none'; }
}
function performSearch() { searchQuery = searchInput.value.trim(); loadSearchResults(true); }
const debouncedSearch = window.debounce(performSearch, 500);
searchInput.addEventListener('input', debouncedSearch);
searchBtn.addEventListener('click', () => { debouncedSearch.cancel(); performSearch(); });
function closeModal() {
modal.classList.remove('show');
// ✅ 修复：关闭模态框时清零并隐藏 badge
if (selectedBadge) {
selectedBadge.textContent = '0';
selectedBadge.style.display = 'none';
}
}
cancelBtn.addEventListener('click', closeModal);
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
confirmBtn.addEventListener('click', async () => {
if (selectedVideos.size === 0) { window.showToast('请至少选择一个视频'); return; }
const videoIds = Array.from(selectedVideos);
const body = videoIds.map(videoId => ({ type: 'video_id', value: videoId }));
try {
const response = await window.fetchWithAuth('/api/watch/' + watchId + '/video/update', { method: 'POST', body: JSON.stringify(body) });
if (!response) return;
window.showToast('添加成功');
closeModal();
if (currentView === 'detail') {
loadVideosInDetail(true);
const badge = el.querySelector('#videoCountBadge');
if (badge) { let count = parseInt(badge.innerHTML.match(/\\d+/)[0]) || 0; count += videoIds.length; badge.innerHTML = '<i class="fas fa-film"></i> ' + count; }
}
} catch (err) { window.showToast(err.message); }
});
modal.classList.add('show');
loadSearchResults(true);
}
// ==================== 维护者管理模态框 ====================
function openMaintainerModal(watchId, maintainers) {
let modal = el.querySelector('#maintainerModal');
if (!modal) {
modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.id = 'maintainerModal';
modal.innerHTML = \`
<div class="modal-content">
  <div class="modal-title"><span>维护者管理</span><button class="btn-icon" id="closeMaintainerModal"><i class="fas fa-times"></i></button></div>
  <div class="maintainer-input-container"><input type="text" id="maintainerInput" placeholder="输入用户 ID"><button id="addMaintainerBtn"><i class="fas fa-plus"></i></button></div>
  <div id="maintainerList" class="maintainer-list"></div>
</div>
\`;
el.appendChild(modal);
}
const listDiv = modal.querySelector('#maintainerList');
const input = modal.querySelector('#maintainerInput');
const addBtn = modal.querySelector('#addMaintainerBtn');
const closeBtn = modal.querySelector('#closeMaintainerModal');
function closeModal() { modal.classList.remove('show'); }
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
function renderMaintainerList(maintainers) {
if (!maintainers || maintainers.length === 0) { listDiv.innerHTML = '<div class="no-results">暂无维护者</div>'; return; }
let html = '';
maintainers.forEach(m => {
const avatarHtml = m.avatar ? '<img src="' + window.escapeHtml(m.avatar) + '">' : '<i class="fas fa-user"></i>';
html += '<div class="maintainer-item"><div class="maintainer-avatar-sm">' + avatarHtml + '</div><div class="maintainer-name">' + window.escapeHtml(m.username || '未知') + '</div><div class="maintainer-id">' + window.escapeHtml(m.user_id) + '</div></div>';
});
listDiv.innerHTML = html;
}
renderMaintainerList(maintainers);
addBtn.addEventListener('click', async () => {
const userId = input.value.trim();
if (!userId) { window.showToast('请输入用户 ID'); return; }
try {
const response = await window.fetchWithAuth('/api/watch/' + watchId + '/maintainer', { method: 'PUT', body: JSON.stringify({ user_id: userId }) });
if (!response) return;
window.showToast('添加成功');
input.value = '';
loadWatchDetail(watchId);
closeModal();
} catch (err) { window.showToast(err.message); }
});
modal.classList.add('show');
}
function backToList() {
currentView = 'list';
const listView = el.querySelector('#listView');
const detailView = el.querySelector('#detailView');
if (listView) listView.style.display = 'block';
if (detailView) { detailView.style.display = 'none'; detailView.innerHTML = ''; }
if (el._listScrollHandler && !el._scrollHandlerAttached) {
window.addEventListener('scroll', el._listScrollHandler);
el._scrollHandlerAttached = true;
}
if (el._detailObserver) { el._detailObserver.disconnect(); el._detailObserver = null; }
window.scrollTo(0, savedScrollTop);
}
// ==================== 路由和初始化 ====================
function handleRoute() {
const urlParams = new URLSearchParams(window.location.search);
const watchId = urlParams.get('watch_id');
const videoId = urlParams.get('video_id');
if (videoId) {
window.navigate('/media/' + videoId + '?from=watch&watch_id=' + (watchId || ''));
return;
}
if (watchId) {
if (currentDetailWatchId === watchId) { if (currentView === 'detail') return; }
showDetailView(watchId);
} else { backToList(); }
}
function init() {
el.innerHTML = renderListStructure();
initListView();
handleRoute();
window.addEventListener('popstate', handleRoute);
}
init();
const onShow = (pathname) => {
if (el._listScrollHandler && !el._scrollHandlerAttached) {
window.addEventListener('scroll', el._listScrollHandler);
el._scrollHandlerAttached = true;
}
};
const onHide = () => {
savedScrollTop = window.scrollY;
if (el._listScrollHandler && el._scrollHandlerAttached) {
window.removeEventListener('scroll', el._listScrollHandler);
el._scrollHandlerAttached = false;
}
if (el._detailObserver) { el._detailObserver.disconnect(); el._detailObserver = null; }
};
return { el, onShow, onHide };
}
`;

// ==================== 求片管理页面模块 ====================
const PAGE_SEEK_JS = `
export default async function SeekPage() {
const el = document.createElement('div');
const userData = window.currentUser;
// 状态
let selectedStatus = 'default';
let currentSort = 'updated_at';
let currentOrder = 'desc';
let isUploadSelf = false;
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let isLoading = false;
let hasMore = true;
let searchQuery = '';
let searchController = null;
let currentSeekId = null;
// ==================== 辅助函数 ====================
function getEmptyMessage() {
const statusTextMap = { default: '求片', upload: '认领', complete: '完成', cancel: '取消', forget: '遗忘' };
const statusText = statusTextMap[selectedStatus] || '求片';
return '暂无' + statusText;
}
function getStatusText(status) {
const map = { default: '待认领', upload: '已认领', complete: '已完成', cancel: '已取消', forget: '遗忘' };
return map[status] || status;
}
function getRemainingTime(expiredAt) {
if (!expiredAt) return '';
const now = new Date();
const expire = new Date(expiredAt);
const diffMs = expire - now;
if (diffMs <= 0) return '已过期';
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
if (diffDays > 0) return diffDays + '天' + diffHours + '小时';
return diffHours + '小时';
}
function buildRequestBody(page) {
return {
video_type: null,
sort_by: currentSort,
sort_order: currentOrder,
status: [selectedStatus],
upload_self: isUploadSelf,
video_title: searchQuery || null,
with_user: true
};
}
// ==================== 渲染页面结构 ====================
function renderStructure() {
return \`
<div class="seek-content">
  <div class="content-wrapper">
    <div class="page-header">
      <h1 class="page-title">求片管理</h1>
      <p class="page-subtitle">浏览与认领影视求片</p>
    </div>
    <div class="glass-card" id="filterCard">
      <div class="status-row" id="statusContainer">
        <span class="status-chip selected" data-status="default">待认领</span>
        <span class="status-chip" data-status="upload">已认领</span>
        <span class="status-chip" data-status="complete">已完成</span>
        <span class="status-chip" data-status="cancel">已取消</span>
        <span class="status-chip" data-status="forget">遗忘</span>
      </div>
      <div class="search-row">
        <input type="text" class="search-input" id="videoTitle" placeholder="输入片名..." autocomplete="off">
      </div>
      <div class="filter-row">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="toggle-switch" id="uploadSelfToggle"></div>
          <span>我认领的</span>
        </div>
        <div class="sort-buttons" id="sortButtons">
          <button class="sort-btn active" data-sort="updated_at" data-order="desc"><i class="fas fa-arrow-down"></i> 更新时间</button>
          <button class="sort-btn" data-sort="count_request" data-order="desc"><i class="fas fa-arrow-down"></i> 求片人数</button>
          <button class="sort-btn" data-sort="seek_carrot" data-order="desc"><i class="fas fa-arrow-down"></i> 萝卜数</button>
        </div>
      </div>
    </div>
    <div id="loadingIndicator" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>
    <div class="no-results" id="noResults" style="display: none;"></div>
    <div id="resultContainer" style="display: none;">
      <div class="seek-grid" id="seekGrid"></div>
      <div class="load-more" id="loadMoreIndicator" style="display: none;"><div class="spinner"></div> 加载更多...</div>
    </div>
  </div>
</div>
<div class="modal-overlay" id="urgeModal">
  <div class="modal-content">
    <div class="modal-title">催上片</div>
    <input type="number" class="modal-input" id="urgeCarrot" placeholder="输入萝卜数量 (1-5000)" min="1" max="5000">
    <div class="modal-error" id="urgeError"></div>
    <div class="modal-buttons">
      <button class="modal-btn" id="urgeCancel">取消</button>
      <button class="modal-btn primary" id="urgeConfirm">确认</button>
    </div>
  </div>
</div>
<style>
/* ===== 求片管理对齐样式 (严格复刻订单中心布局) ===== */
.seek-content { width: 100%; min-height: 100vh; background-color: var(--bg-body); color: var(--text-primary); }

.page-header { margin: 1rem 0 0.5rem 0; animation: slideUpFade 0.6s ease-out forwards; }
@keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
.page-title { font-size: clamp(1.8rem, 4vw, 2.2rem); font-weight: 700; margin: 0; letter-spacing: -0.5px; line-height: 1.2; }
.page-subtitle { font-size: 1rem; color: var(--text-secondary); margin: 0.3rem 0 0 0; font-weight: 400; }

.glass-card {
  background: var(--bg-card);
  backdrop-filter: var(--blur-effect);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 1.2rem 1.5rem;
  box-shadow: var(--shadow-md);
  width: 100%;
  transition: background 0.3s ease, border-color 0.3s ease;
}
.status-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.8rem; }
.status-chip {
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-full);
  padding: 0.3rem 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.status-chip:hover { background: var(--bg-hover); }
.status-chip.selected { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
.search-row { margin-bottom: 0.8rem; }
.search-input {
  width: 100%;
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-full);
  padding: 0.7rem 1.2rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.search-input:focus { border-color: var(--accent-color); background: var(--bg-hover); }
.search-input::placeholder { color: var(--text-tertiary); }
.filter-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0; flex-wrap: wrap; }
.sort-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.sort-btn {
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-full);
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.sort-btn:hover { background: var(--bg-hover); }
.sort-btn.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
.sort-btn i { font-size: 0.7rem; }
.seek-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 1.5rem; }
@media (max-width: 900px) { .seek-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) { .seek-grid { grid-template-columns: 1fr; gap: 1rem; } }
.seek-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 0.5px solid var(--border-light);
  border-radius: 24px;
  padding: 1.2rem;
  transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  overflow: hidden;
}
.seek-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
.card-main-row { display: flex; gap: 1rem; margin-bottom: 0.8rem; }
.card-poster {
  position: relative;
  width: 80px;
  height: 120px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--bg-input);
}
.card-poster img { width: 100%; height: 100%; object-fit: cover; }
.poster-status {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  padding: 0.2rem 0.4rem;
  font-size: 0.6rem;
  text-align: center;
  color: #fff;
  border-top: 0.5px solid rgba(255,255,255,0.1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.poster-status.default { background: rgba(42,42,42,0.9); color: #aaa; }
.poster-status.upload { background: rgba(255,170,51,0.9); color: #000; }
.poster-status.complete { background: rgba(40,167,69,0.9); color: #fff; }
.poster-status.cancel { background: rgba(108,117,125,0.9); color: #fff; }
.poster-status.forget { background: rgba(220,53,69,0.9); color: #fff; }
.card-info { flex: 1; min-width: 0; height: 120px; display: flex; flex-direction: column; }
.info-top { display: flex; flex-direction: column; gap: 0.3rem; }
.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.id-btn, .tmdb-btn {
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-full);
  padding: 0.2rem 0.8rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.id-btn:hover, .tmdb-btn:hover { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
.card-stats { display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-secondary); margin-top: auto; }
.card-stats i { margin-right: 0.3rem; color: var(--accent-color); }
.claim-info-row {
  background: rgba(255,170,51,0.1);
  border: 0.5px solid rgba(255,170,51,0.3);
  border-radius: var(--radius-full);
  padding: 0.3rem 0.6rem;
  margin-bottom: 0.8rem;
  font-size: 0.7rem;
  color: var(--warning-color);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.user-record-section { margin: 0.8rem 0; border-top: 0.5px solid var(--border-light); padding-top: 0.8rem; }
.record-title { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); margin-bottom: 0.4rem; }
.user-record-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 90px;
  overflow-y: auto;
  padding-right: 2px;
}
.user-record-list::-webkit-scrollbar { width: 4px; }
.user-record-list::-webkit-scrollbar-track { background: var(--bg-input); border-radius: 2px; }
.user-record-list::-webkit-scrollbar-thumb { background: var(--text-tertiary); border-radius: 2px; }
.user-record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-input);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-full);
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  transition: background 0.2s;
}
.user-record-item:hover { background: var(--bg-hover); }
.user-left { display: flex; align-items: center; gap: 0.3rem; }
.user-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--bg-hover);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-avatar i { font-size: 0.6rem; color: var(--text-secondary); }
.user-name { font-size: 0.7rem; color: var(--text-primary); }
.user-right { display: flex; gap: 0.5rem; align-items: center; }
.record-carrot { color: var(--warning-color); font-size: 0.65rem; }
.record-carrot i { margin-right: 0.1rem; }
.record-time { font-size: 0.65rem; color: var(--text-secondary); }
.card-actions { display: flex; gap: 0.5rem; margin-top: auto; flex-wrap: wrap; }
.card-actions .action-btn {
  flex: 1;
  text-align: center;
  background: transparent;
  border: 0.5px solid var(--border-light);
  color: var(--text-secondary);
  padding: 0.4rem 0.2rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}
.card-actions .action-btn i { font-size: 0.8rem; }
.card-actions .action-btn:hover { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
.card-actions .action-btn.primary { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
.card-actions .action-btn.primary:hover { background: var(--accent-hover); }
.card-actions .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 700px) {
  .content-wrapper { padding: 0 1rem; }
  .page-header { margin: 0.8rem 0; }
  .page-title { font-size: 1.8rem; }
  .page-subtitle { font-size: 0.9rem; }
  .filter-row { flex-direction: column; align-items: stretch; }
  .sort-buttons { justify-content: flex-start; }
  .card-main-row { flex-direction: row; }
  .card-poster { width: 70px; height: 105px; }
  .card-info { height: 105px; }
  .user-record-list { max-height: 70px; }
}
</style>
\`;
}
// ==================== 加载求片列表 ====================
async function loadSeeks(reset = false) {
if (isLoading) return;
if (reset) {
currentPage = 1;
hasMore = true;
const seekGrid = el.querySelector('#seekGrid');
if (seekGrid) seekGrid.innerHTML = '';
const noResults = el.querySelector('#noResults');
if (noResults) noResults.style.display = 'none';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'flex';
const resultContainer = el.querySelector('#resultContainer');
if (resultContainer) resultContainer.style.display = 'none';
}
if (!hasMore) return;
isLoading = true;
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'block';
if (searchController) searchController.abort();
const controller = new AbortController();
searchController = controller;
const body = buildRequestBody(currentPage);
try {
const response = await window.fetchWithAuth('/api/seek?page=' + currentPage + '&page_size=' + pageSize, {
method: 'POST',
body: JSON.stringify(body),
signal: controller.signal
});
if (!response) {
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const resultContainer = el.querySelector('#resultContainer');
if (resultContainer) resultContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
isLoading = false;
searchController = null;
return;
}
if (controller !== searchController) return;
const data = await response.json();
const items = data.items || [];
const total = data.total || 0;
pageSize = data.page_size || 20;
totalPages = Math.ceil(total / pageSize);
const current = data.page || currentPage;
if (reset && items.length === 0) {
const noResults = el.querySelector('#noResults');
if (noResults) {
noResults.textContent = getEmptyMessage();
noResults.style.display = 'block';
}
const resultContainer = el.querySelector('#resultContainer');
if (resultContainer) resultContainer.style.display = 'block';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
isLoading = false;
searchController = null;
return;
}
if (items.length > 0) {
renderSeeks(items);
currentPage = current + 1;
hasMore = currentPage <= totalPages;
} else {
hasMore = false;
}
if (reset) {
const resultContainer = el.querySelector('#resultContainer');
if (resultContainer) resultContainer.style.display = 'block';
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
}
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = hasMore ? 'block' : 'none';
} catch (err) {
if (err.name === 'AbortError') {
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const resultContainer = el.querySelector('#resultContainer');
if (resultContainer) resultContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
isLoading = false;
searchController = null;
return;
}
window.showToast('获取求片失败：' + err.message);
const loadingIndicator = el.querySelector('#loadingIndicator');
if (loadingIndicator) loadingIndicator.style.display = 'none';
const resultContainer = el.querySelector('#resultContainer');
if (resultContainer) resultContainer.style.display = 'block';
const loadMoreIndicator = el.querySelector('#loadMoreIndicator');
if (loadMoreIndicator) loadMoreIndicator.style.display = 'none';
} finally {
if (controller === searchController) {
isLoading = false;
searchController = null;
}
}
}
function renderSeeks(items) {
const seekGrid = el.querySelector('#seekGrid');
if (!seekGrid) return;
items.forEach(item => {
const card = document.createElement('div');
card.className = 'seek-card';
card.dataset.seekId = item.id;
card.dataset.videoListId = item.video_list_id || '';
card.dataset.todbId = item.todb_id || '';
card.dataset.videoType = item.video_type;
const posterUrl = item.video_image_poster || '';
const titleDisplay = item.video_title_display || item.video_title || '未知';
let itemId = '';
if (item.video_type === 'movie') {
itemId = 'vl-' + item.video_list_id;
} else {
itemId = 've-' + (item.video_episode_id || '');
}
const tmdbUrl = item.tmdb_url || (item.video_type === 'movie'
? 'https://www.themoviedb.org/movie/' + item.tmdb_id
: 'https://www.themoviedb.org/tv/' + item.tmdb_id);
const countRequest = item.count_request || 0;
const updatedAt = item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
const users = item.users || [];
const status = item.status;
const uploadUsername = item.upload_username || null;
const uploadExpiredAt = item.upload_expired_at || null;
let usersHtml = '';
users.forEach(u => {
const avatarHtml = u.avatar ? '<img src="' + window.escapeHtml(u.avatar) + '">' : '<i class="fas fa-user"></i>';
const carrotHtml = u.carrot ? '<span class="record-carrot"><i class="fas fa-carrot"></i> ' + u.carrot + '</span>' : '';
const timeHtml = u.created_at ? new Date(u.created_at).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
usersHtml += '<div class="user-record-item"><div class="user-left"><div class="user-avatar">' + avatarHtml + '</div><span class="user-name">' + window.escapeHtml(u.username) + '</span></div><div class="user-right">' + carrotHtml + '<span class="record-time">' + timeHtml + '</span></div></div>';
});
let claimInfoHtml = '';
if (status === 'upload' && uploadUsername) {
const remaining = getRemainingTime(uploadExpiredAt);
claimInfoHtml = '<div class="claim-info-row"><i class="fas fa-user"></i> 认领人：' + window.escapeHtml(uploadUsername) + ' · 剩余 ' + remaining + '</div>';
}
const actionsHtml = getActionButtons(item);
card.innerHTML = \`
<div class="card-main-row">
<div class="card-poster">
\${posterUrl ? '<img src="' + posterUrl + '" loading="lazy">' : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-film" style="color:var(--text-tertiary); font-size:2rem;"></i></div>'}
<div class="poster-status \${status}">\${getStatusText(status)}</div>
</div>
<div class="card-info">
<div class="info-top">
<div class="card-title">\${window.escapeHtml(titleDisplay)}</div>
<div class="card-buttons">
<span class="id-btn" data-copy="\${window.escapeHtml(itemId)}">\${window.escapeHtml(itemId)}</span>
<a href="\${window.escapeHtml(tmdbUrl)}" target="_blank" class="tmdb-btn"><i class="fas fa-film"></i> TMDB</a>
</div>
</div>
<div class="card-stats">
<span><i class="fas fa-users"></i> \${countRequest}</span>
<span><i class="fas fa-clock"></i> \${updatedAt}</span>
</div>
</div>
</div>
\${claimInfoHtml}
\${usersHtml ? '<div class="user-record-section"><div class="record-title">点播记录</div><div class="user-record-list">' + usersHtml + '</div></div>' : ''}
<div class="card-actions">
\${actionsHtml}
</div>
\`;
bindCardEvents(card, item);
seekGrid.appendChild(card);
});
}
function getActionButtons(item) {
let buttons = '';
const status = item.status;
const isCanClaim = item.is_can_claim !== false;
const id = item.id;
const videoId = item.video_list_id || item.todb_id;
buttons += '<button class="action-btn detail-btn" data-video-id="' + videoId + '" data-type="' + item.video_type + '"><i class="fas fa-info-circle"></i> 详情</button>';
if (status === 'default') {
const disabledAttr = isCanClaim ? '' : ' disabled';
buttons += '<button class="action-btn primary claim-btn" data-id="' + id + '"' + disabledAttr + '><i class="fas fa-hand-holding-heart"></i> 认领</button>';
}
if (status === 'default' || status === 'forget') {
buttons += '<button class="action-btn urge-btn" data-id="' + id + '"><i class="fas fa-bell"></i> 催上片</button>';
}
return buttons;
}
function bindCardEvents(card, item) {
const copyBtn = card.querySelector('.id-btn');
if (copyBtn) copyBtn.addEventListener('click', () => window.copyText(copyBtn.dataset.copy));
const detailBtn = card.querySelector('.detail-btn');
if (detailBtn) {
detailBtn.addEventListener('click', () => {
const videoId = detailBtn.dataset.videoId;
const type = detailBtn.dataset.type;
if (!videoId) {
window.showToast('无法获取视频 ID');
return;
}
window.PageState.set('/seek', {
selectedStatus: selectedStatus,
currentSort: currentSort,
currentOrder: currentOrder,
searchQuery: searchQuery,
isUploadSelf: isUploadSelf,
scrollTop: window.scrollY
});
window.navigate('/media/' + videoId + '?from=seek');
});
}
const claimBtn = card.querySelector('.claim-btn');
if (claimBtn) claimBtn.addEventListener('click', async () => {
const seekId = claimBtn.dataset.id;
try {
const response = await window.fetchWithAuth('/api/seek/claim', {
method: 'PUT',
body: JSON.stringify({ seek_id: seekId, type: 'confirm' })
});
if (!response) return;
const result = await response.json();
window.showToast('认领成功');
updateCardAfterClaim(card, 'upload', false, result.upload_username, result.upload_expired_at);
} catch (err) {
window.showToast(err.message);
}
});
const urgeBtn = card.querySelector('.urge-btn');
if (urgeBtn) urgeBtn.addEventListener('click', () => {
const seekId = urgeBtn.dataset.id;
openUrgeModal(seekId);
});
}
function updateCardAfterClaim(card, newStatus, newIsCanClaim, newUploadUsername, newUploadExpiredAt) {
const posterStatus = card.querySelector('.poster-status');
posterStatus.className = 'poster-status ' + newStatus;
posterStatus.textContent = getStatusText(newStatus);
const existingClaimRow = card.querySelector('.claim-info-row');
if (newStatus === 'upload' && newUploadUsername) {
const remaining = getRemainingTime(newUploadExpiredAt);
const claimHtml = '<div class="claim-info-row"><i class="fas fa-user"></i> 认领人：' + window.escapeHtml(newUploadUsername) + ' · 剩余 ' + remaining + '</div>';
if (existingClaimRow) {
existingClaimRow.outerHTML = claimHtml;
} else {
const userRecordSection = card.querySelector('.user-record-section');
if (userRecordSection) {
userRecordSection.insertAdjacentHTML('beforebegin', claimHtml);
} else {
const mainRow = card.querySelector('.card-main-row');
mainRow.insertAdjacentHTML('afterend', claimHtml);
}
}
} else {
if (existingClaimRow) existingClaimRow.remove();
}
const actionsDiv = card.querySelector('.card-actions');
const itemId = card.dataset.seekId;
const mockItem = {
id: itemId,
status: newStatus,
is_can_claim: newIsCanClaim,
video_list_id: card.dataset.videoListId,
todb_id: card.dataset.todbId,
video_type: card.dataset.videoType
};
actionsDiv.innerHTML = getActionButtons(mockItem);
bindCardEvents(card, mockItem);
}
function openUrgeModal(seekId) {
currentSeekId = seekId;
const modal = el.querySelector('#urgeModal');
const carrotInput = modal.querySelector('#urgeCarrot');
const errorSpan = modal.querySelector('#urgeError');
carrotInput.value = '';
errorSpan.textContent = '';
modal.classList.add('show');
const cancelBtn = modal.querySelector('#urgeCancel');
const confirmBtn = modal.querySelector('#urgeConfirm');
function closeModal() { modal.classList.remove('show'); }
cancelBtn.onclick = closeModal;
modal.onclick = (e) => { if (e.target === modal) closeModal(); };
confirmBtn.onclick = async () => {
const carrot = parseInt(carrotInput.value);
if (isNaN(carrot) || carrot < 1 || carrot > 5000) {
errorSpan.textContent = '请输入 1-5000 之间的数字';
return;
}
confirmBtn.disabled = true;
confirmBtn.textContent = '处理中...';
try {
const response = await window.fetchWithAuth('/api/seek/urge', {
method: 'PUT',
body: JSON.stringify({ seek_id: currentSeekId, carrot: carrot })
});
if (!response) return;
window.showToast('催片成功');
closeModal();
} catch (err) {
errorSpan.textContent = err.message;
} finally {
confirmBtn.disabled = false;
confirmBtn.textContent = '确认';
}
};
}
// ==================== 搜索和筛选事件 ====================
function bindEvents() {
const debouncedSearch = window.debounce(() => {
searchQuery = el.querySelector('#videoTitle')?.value.trim() || '';
loadSeeks(true);
}, 300);
const statusChips = el.querySelectorAll('.status-chip');
statusChips.forEach(chip => {
chip.addEventListener('click', () => {
const status = chip.dataset.status;
if (selectedStatus === status) return;
statusChips.forEach(c => c.classList.remove('selected'));
chip.classList.add('selected');
selectedStatus = status;
debouncedSearch.cancel();
loadSeeks(true);
});
});
const sortButtons = el.querySelectorAll('.sort-btn');
sortButtons.forEach(btn => {
btn.addEventListener('click', () => {
let sort = btn.dataset.sort;
let order = btn.dataset.order;
if (currentSort === sort) {
order = (currentOrder === 'desc' ? 'asc' : 'desc');
btn.dataset.order = order;
}
const icon = order === 'desc' ? '<i class="fas fa-arrow-down"></i>' : '<i class="fas fa-arrow-up"></i>';
btn.innerHTML = icon + ' ' + btn.innerText.replace(/[↑↓]/g, '').trim();
sortButtons.forEach(b => b.classList.remove('active'));
btn.classList.add('active');
currentSort = sort;
currentOrder = order;
debouncedSearch.cancel();
loadSeeks(true);
});
});
const videoTitleInput = el.querySelector('#videoTitle');
if (videoTitleInput) {
videoTitleInput.addEventListener('input', debouncedSearch);
}
const uploadSelfToggle = el.querySelector('#uploadSelfToggle');
if (uploadSelfToggle) {
uploadSelfToggle.addEventListener('click', () => {
uploadSelfToggle.classList.toggle('active');
isUploadSelf = uploadSelfToggle.classList.contains('active');
loadSeeks(true);
});
}
const scrollHandler = () => {
if (isLoading || !hasMore) return;
const scrollY = window.scrollY;
const windowHeight = window.innerHeight;
const documentHeight = document.documentElement.scrollHeight;
if (scrollY + windowHeight >= documentHeight - 200) {
loadSeeks();
}
};
window.addEventListener('scroll', scrollHandler);
el._seekScrollHandler = scrollHandler;
}
// ==================== 页面生命周期 ====================
const onShow = (pathname) => {
const state = window.PageState.get('/seek');
if (state && state.selectedStatus) {
selectedStatus = state.selectedStatus;
const statusChips = el.querySelectorAll('.status-chip');
statusChips.forEach(chip => {
chip.classList.toggle('selected', chip.dataset.status === selectedStatus);
});
if (state.currentSort) {
currentSort = state.currentSort;
currentOrder = state.currentOrder || 'desc';
const sortButtons = el.querySelectorAll('.sort-btn');
sortButtons.forEach(btn => {
const sort = btn.dataset.sort;
if (sort === currentSort) {
btn.classList.add('active');
const icon = currentOrder === 'desc' ? '<i class="fas fa-arrow-down"></i>' : '<i class="fas fa-arrow-up"></i>';
btn.innerHTML = icon + ' ' + btn.innerText.replace(/[↑↓]/g, '').trim();
btn.dataset.order = currentOrder;
} else {
btn.classList.remove('active');
}
});
}
if (state.searchQuery !== undefined) {
searchQuery = state.searchQuery;
const videoTitleInput = el.querySelector('#videoTitle');
if (videoTitleInput) videoTitleInput.value = searchQuery;
}
if (state.isUploadSelf !== undefined) {
isUploadSelf = state.isUploadSelf;
const uploadSelfToggle = el.querySelector('#uploadSelfToggle');
if (uploadSelfToggle) {
uploadSelfToggle.classList.toggle('active', isUploadSelf);
}
}
loadSeeks(false);
} else {
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('from') === 'seek') {
loadSeeks(false);
window.history.replaceState({}, '', window.location.pathname);
} else {
loadSeeks(true);
}
}
};
const onHide = () => {
window.PageState.set('/seek', {
selectedStatus: selectedStatus,
currentSort: currentSort,
currentOrder: currentOrder,
searchQuery: searchQuery,
isUploadSelf: isUploadSelf
});
};
// ==================== 初始化 ====================
function init() {
el.innerHTML = renderStructure();
bindEvents();
if (el.querySelector('#seekGrid').children.length === 0) {
loadSeeks(true);
}
}
init();
return { el, onShow, onHide };
}
`;

// ==================== 商城中心页面模块 ====================
const PAGE_SHOP_JS = `
export default async function ShopPage() {
  const el = document.createElement('div');
  // 使用全局工具函数
  const escapeHtml = window.escapeHtml;
  const showToast = window.showToast;
  const copyText = window.copyText;
  
  const API = {
    SELLER_BASE: '/api/shop/seller/base', SELLER_APPLY: '/api/shop/seller/apply', SELLER_UPDATE: '/api/shop/seller/update',
    CATEGORY_LIST: '/api/shop/category/list', CATEGORY_CREATE: '/api/shop/category/create', CATEGORY_DELETE: '/api/shop/category/delete', CATEGORY_SORT: '/api/shop/category/sort',
    PRODUCT_LIST: '/api/shop/product/list', PRODUCT_INFO: '/api/shop/product/info', PRODUCT_CREATE: '/api/shop/product/createOrUpdate', PRODUCT_DELETE: '/api/shop/product/delete', PRODUCT_UP: '/api/shop/product/up',
    ORDER_CREATE: '/api/shop/order/user/create'
  };

  let shopState = {
    currentView: 'client',
    client: { currentPage: 1, pageSize: 20, totalPages: 1, isLoading: false, hasMore: true, searchQuery: '', sortBy: 'sort', sortOrder: 'asc', searchController: null },
    seller: { currentPage: 1, pageSize: 20, totalPages: 1, isLoading: false, hasMore: true, currentTab: 'product', searchQuery: '', sellerInfo: null, categories: [], selectedCategory: 'all' },
    sellerStore: { sellerId: null, sellerInfo: null, categories: [], currentCategory: 'all', currentPage: 1, pageSize: 20, totalPages: 1, isLoading: false, hasMore: true, searchQuery: '', sortBy: 'sort', sortOrder: 'asc', searchController: null },
    cart: []
  };

  function formatPrice(price) { return price == null ? '-' : price; }
  function formatStock(stock) { if (stock == null) return '?'; return stock === 0 ? '已售罄' : (stock <= 10 ? '库存紧张' : '库存充足'); }
  function getStockClass(stock) { if (stock == null) return ''; return stock === 0 ? 'empty' : (stock <= 10 ? 'low' : ''); }

  function loadCartFromStorage() {
    try { const saved = localStorage.getItem('shop_cart'); if (saved) shopState.cart = JSON.parse(saved); } catch (e) { shopState.cart = []; }
    updateCartUI(); updateAllCartQtyBadges();
  }
  function saveCartToStorage() {
    try { localStorage.setItem('shop_cart', JSON.stringify(shopState.cart)); } catch (e) { showToast('保存购物车失败'); }
    updateCartUI(); updateAllCartQtyBadges();
  }
  function addToCart(product) {
    const existing = shopState.cart.find(item => item.product_id === product.product_id);
    if (existing) { existing.quantity = (existing.quantity || 1) + 1; showToast('数量 +1'); }
    else { shopState.cart.push({ product_id: product.product_id, name: product.name, price: product.price, cover_url: product.cover_url, quantity: 1 }); showToast('已加入购物车'); }
    saveCartToStorage(); updateCartQtyBadge(product.product_id);
  }
  function removeFromCart(productId) { shopState.cart = shopState.cart.filter(item => item.product_id !== productId); saveCartToStorage(); updateCartQtyBadge(productId); }
  function decreaseCartItem(productId, quantity) {
    const idx = shopState.cart.findIndex(item => item.product_id == productId);
    if (idx === -1) return;
    if (shopState.cart[idx].quantity > quantity) shopState.cart[idx].quantity -= quantity;
    else shopState.cart.splice(idx, 1);
    saveCartToStorage();
  }
  function clearCart() { shopState.cart = []; saveCartToStorage(); }
  function updateCartUI() {
    const countEl = el.querySelector('#cartCount');
    const floatBtn = el.querySelector('#cartFloatBtn');
    if (countEl) { const t = shopState.cart.reduce((s, i) => s + (i.quantity || 1), 0); countEl.textContent = t > 0 ? t : ''; }
    if (floatBtn) floatBtn.style.display = shopState.cart.length > 0 ? 'flex' : 'none';
  }
  function updateCartQtyBadge(productId) {
    const cards = el.querySelectorAll(\`.product-card[data-product-id="\${productId}"]\`);
    if (!cards) return;
    const item = shopState.cart.find(i => String(i.product_id) === String(productId));
    cards.forEach(card => {
      const badge = card.querySelector('.cart-qty-badge');
      if (!badge) return;
      if (item && item.quantity > 0) { badge.textContent = item.quantity; badge.style.display = 'flex'; }
      else badge.style.display = 'none';
    });
  }
  function updateAllCartQtyBadges() {
    el.querySelectorAll('.cart-qty-badge').forEach(b => b.style.display = 'none');
    shopState.cart.forEach(i => { if (i.quantity > 0) updateCartQtyBadge(i.product_id); });
  }
  function renderCartList() {
    const list = el.querySelector('#cartList');
    const empty = el.querySelector('#cartEmpty');
    const actions = el.querySelector('#cartActions');
    if (!list) return;
    if (shopState.cart.length === 0) {
      if (empty) empty.style.display = 'block';
      if (actions) actions.style.display = 'none';
      list.innerHTML = '';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (actions) actions.style.display = 'flex';
    let html = '';
    shopState.cart.forEach(item => {
      html += \`<div class="cart-item" data-product-id="\${item.product_id}"><div class="cart-item-info"><div class="cart-item-name">\${escapeHtml(item.name)}</div><div class="cart-item-price"><i class="fas fa-carrot"></i> \${formatPrice(item.price)}</div></div><div class="cart-item-quantity"><button class="qty-btn qty-dec" data-product-id="\${item.product_id}">−</button><span class="qty-value">\${item.quantity || 1}</span><button class="qty-btn qty-inc" data-product-id="\${item.product_id}">+</button></div><div class="cart-item-remove" data-product-id="\${item.product_id}"><i class="fas fa-times"></i></div></div>\`;
    });
    list.innerHTML = html;
    list.querySelectorAll('.qty-dec').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); const p = btn.dataset.productId; const i = shopState.cart.find(x => x.product_id == p); if (i) { if (i.quantity > 1) i.quantity--; else removeFromCart(p); saveCartToStorage(); renderCartList(); } }));
    list.querySelectorAll('.qty-inc').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); const p = btn.dataset.productId; const i = shopState.cart.find(x => x.product_id == p); if (i) { i.quantity++; saveCartToStorage(); renderCartList(); } }));
    list.querySelectorAll('.cart-item-remove').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); removeFromCart(btn.dataset.productId); renderCartList(); }));
  }
  async function createOrder(productId, qty = 1, remark = null) {
    const r = await window.fetchWithAuth(API.ORDER_CREATE, { method: 'POST', body: JSON.stringify({ product_id: parseInt(productId), buy_number: qty, remark }) });
    if (!r) return; if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || '创建订单失败'); }
    showToast(\`订单创建成功 (x\${qty})\`); decreaseCartItem(productId, qty); loadProducts(true); return await r.json();
  }

  function renderStructure() {
    return \`
    <div class="shop-content">
      <div class="content-wrapper">
        <div class="page-header">
          <div class="title-row">
            <h1 class="page-title">商城中心</h1>
            <button class="view-toggle-btn" id="viewToggleBtn" title="切换商户视图"><i class="fas fa-store"></i> 管理</button>
          </div>
          <p class="page-subtitle" id="pageSubtitle">浏览精选商品</p>
        </div>
        <div id="clientView">
          <div class="search-bar">
            <div class="search-container">
              <input type="text" class="search-input" id="clientSearch" placeholder="搜索商品...">
              <button class="search-btn" id="clientSearchBtn"><i class="fas fa-search"></i></button>
            </div>
          </div>
          <div class="sort-bar">
            <span class="sort-label">排序：</span>
            <button class="sort-chip active" data-sort="sort" data-order="asc">默认</button>
            <button class="sort-chip" data-sort="price" data-order="asc">价格</button>
            <button class="sort-chip" data-sort="sales" data-order="desc">销量</button>
          </div>
          <div id="loadingIndicator" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div>
          <div id="emptyState" class="no-results" style="display: none;">暂无商品</div>
          <div id="productGrid" class="product-grid" style="display: none;"></div>
          <div class="load-more" id="loadMoreIndicator" style="display: none;"><div class="spinner"></div> 加载更多...</div>
        </div>
        <div id="sellerStoreView" style="display: none;">
          <div class="store-back-row"><button class="back-btn" id="sellerStoreBackBtn"><i class="fas fa-arrow-left"></i></button><span class="store-back-title">店铺主页</span></div>
          <div class="seller-store-header apple-card" style="margin-bottom: 1rem;">
            <div class="store-header-content">
              <div class="store-cover" id="storeCover"><img id="storeCoverImg" style="display: none;"><i class="fas fa-store" id="storeCoverIcon"></i></div>
              <div class="store-info"><h2 class="store-name" id="storeName">店铺名称</h2><p class="store-desc" id="storeDesc">店铺简介</p></div>
              <div class="store-share-btn"><button class="btn-icon" id="shareStoreBtn" title="分享店铺"><i class="fas fa-share-alt"></i></button></div>
            </div>
            <div class="store-stats"><div class="stat-item"><span class="stat-value" id="storeProductCount">0</span><span class="stat-label">商品</span></div><div class="stat-item"><span class="stat-value" id="storeCategoryCount">0</span><span class="stat-label">分类</span></div></div>
          </div>
          <div class="store-category-bar"><button class="category-chip active" data-category="all">全部</button><div id="storeCategoryList" class="category-chips"></div></div>
          <div class="search-bar"><div class="search-container"><input type="text" class="search-input" id="storeSearch" placeholder="搜索店内商品..."><button class="search-btn" id="storeSearchBtn"><i class="fas fa-search"></i></button></div></div>
          <div class="sort-bar">
            <span class="sort-label">排序：</span>
            <button class="sort-chip active" data-sort="sort" data-order="asc">默认</button>
            <button class="sort-chip" data-sort="price" data-order="asc">价格</button>
            <button class="sort-chip" data-sort="sales" data-order="desc">销量</button>
          </div>
          <div id="storeLoadingIndicator" class="apple-loading" style="display: none;"><div class="spinner"></div><span>加载中...</span></div>
          <div id="storeEmptyState" class="no-results" style="display: none;">该分类下暂无商品</div>
          <div id="storeProductGrid" class="product-grid" style="display: none;"></div>
          <div class="load-more" id="storeLoadMoreIndicator" style="display: none;"><div class="spinner"></div> 加载更多...</div>
        </div>
        <div id="sellerView" style="display: none;">
          <div id="applyPrompt" class="apply-prompt" style="display: none;">
            <div class="apple-card" style="text-align: center; max-width: 420px; margin: 2rem auto;">
              <div style="font-size: 3rem; color: var(--accent-color); margin-bottom: 1rem;"><i class="fas fa-store"></i></div>
              <h3 style="margin: 0 0 0.5rem 0; font-weight: 600;">申请成为商户</h3>
              <p style="color: var(--text-secondary); margin: 0 0 0.5rem 0;">创建您的专属店铺，管理商品和订单</p>
              <p style="color: var(--warning-color); font-size: 0.85rem; margin: 0 0 1.5rem 0; font-weight: 500;"><i class="fas fa-exclamation-circle" style="margin-right: 4px;"></i>申请时将扣除 3000 萝卜</p>
              <button class="btn-primary" id="applySellerBtn">立即申请</button>
            </div>
          </div>
          <div id="sellerPanel" style="display: none;">
            <div class="apple-card" style="margin-bottom: 1rem;">
              <div class="info-list">
                <div class="info-list-item"><div class="info-list-left"><div class="info-list-title">店铺状态</div></div><div class="info-list-right"><span class="status-badge status-green" id="sellerStatus">已认证</span></div></div>
                <div class="info-list-item" id="sellerInfoRow">
                  <div class="info-list-left"><div style="display: flex; align-items: center; gap: 0.8rem;"><div class="seller-avatar-lg" id="sellerCoverPreview"><img id="sellerCoverImg" src="" style="display: none;"><i class="fas fa-store" id="sellerCoverIcon"></i></div><div><div class="info-list-title" id="sellerNameDisplay">店铺名称</div><div class="info-list-desc" id="sellerDescDisplay">店铺简介</div></div></div></div>
                  <div class="info-list-right"><button class="btn-outline" id="editSellerBtn"><i class="fas fa-edit"></i> 编辑</button><button class="btn-outline" id="shareSellerBtn" style="margin-left: 0.5rem;"><i class="fas fa-share-alt"></i> 分享</button></div>
                </div>
              </div>
            </div>
            <div class="seller-tabs">
              <button class="seller-tab active" data-tab="product"><i class="fas fa-box"></i> 商品管理</button>
              <button class="seller-tab" data-tab="category"><i class="fas fa-folder"></i> 分类管理</button>
            </div>
            <div id="sellerProductTab">
              <div class="seller-toolbar-row">
                <div class="category-filter-container"><button class="category-chip active" data-category="all" id="sellerProductAllCat">全部</button><div id="sellerProductCategoryList" class="category-chips"></div></div>
                <div class="action-bar"><div class="search-container" style="flex: 1; min-width: 180px;"><input type="text" class="search-input" id="sellerProductSearch" placeholder="搜索商品..."><button class="search-btn" id="sellerProductSearchBtn"><i class="fas fa-search"></i></button></div><button class="btn-primary" id="addProductBtn"><i class="fas fa-plus"></i> 新增商品</button></div>
              </div>
              <div id="sellerProductList" class="info-list"></div>
              <div id="sellerProductEmpty" class="no-results" style="display: none;">暂无商品，点击"新增商品"开始</div>
            </div>
            <div id="sellerCategoryTab" style="display: none;">
              <div class="seller-toolbar"><button class="btn-primary" id="addCategoryBtn"><i class="fas fa-plus"></i> 新增分类</button></div>
              <div id="sellerCategoryList" class="info-list"></div>
              <div id="sellerCategoryEmpty" class="no-results" style="display: none;">暂无分类</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 模态框区域 -->
    <div class="modal-overlay" id="sellerEditModal"><div class="modal-content modal-wide"><div class="modal-title"><span>编辑店铺信息</span><button class="btn-icon" id="closeSellerEditModal"><i class="fas fa-times"></i></button></div><div class="modal-body"><div class="form-section"><div class="section-title">店铺基本信息</div><div class="form-group"><label>店铺名称 <span style="color: var(--danger-color);">*</span></label><input type="text" class="modal-input" id="editSellerName" maxlength="30"></div><div class="form-group"><label>店铺简介 <span style="color: var(--danger-color);">*</span></label><textarea class="modal-input" id="editSellerDescription" maxlength="200" rows="3"></textarea></div><div class="form-group"><label>店铺封面</label><div class="image-upload-area" id="sellerCoverUploadArea" style="width: 200px; aspect-ratio: 16/9; margin: 0 auto;"><div class="image-preview" id="sellerCoverPreview"><img id="sellerEditCoverImage" style="display: none;"><div class="placeholder" id="sellerEditCoverPlaceholder"><i class="fas fa-cloud-upload-alt"></i><span>点击上传</span></div></div><div class="image-upload-buttons"><button class="image-upload-btn" id="uploadSellerCoverBtn">上传</button><button class="image-delete-btn" id="deleteSellerCoverBtn" style="display: none;">删除</button></div><input type="file" id="sellerCoverFileInput" accept="image/*" style="display: none;"></div><input type="hidden" id="sellerEditCoverFileId"></div></div></div><div class="modal-error" id="sellerEditError"></div><div class="modal-buttons"><button class="modal-btn" id="sellerEditCancel">取消</button><button class="modal-btn primary" id="sellerEditSubmit">保存</button></div></div></div>

    <div class="modal-overlay" id="applyModal"><div class="modal-content modal-wide"><div class="modal-title"><span>申请成为商户</span><button class="btn-icon" id="closeApplyModal"><i class="fas fa-times"></i></button></div><div class="modal-body"><div class="form-group"><label>店铺名称 <span style="color: var(--danger-color);">*</span></label><input type="text" class="modal-input" id="applyName" maxlength="30"></div><div class="form-group"><label>店铺简介 <span style="color: var(--danger-color);">*</span></label><textarea class="modal-input" id="applyDescription" maxlength="200" rows="3"></textarea></div><div class="form-group"><label>店铺封面 <span style="color: var(--danger-color);">*</span></label><div class="image-upload-area" style="width: 200px; aspect-ratio: 16/9; margin: 0 auto;"><div class="image-preview" id="applyCoverPreview"><img id="applyCoverImage" style="display: none;"><div class="placeholder" id="applyCoverPlaceholder"><i class="fas fa-cloud-upload-alt"></i><span>点击上传</span></div></div><div class="image-upload-buttons"><button class="image-upload-btn" id="uploadApplyCoverBtn">上传</button><button class="image-delete-btn" id="deleteApplyCoverBtn" style="display: none;">删除</button></div><input type="file" id="applyCoverFileInput" accept="image/*" style="display: none;"></div><input type="hidden" id="applyCoverFileId"></div></div><div class="modal-error" id="applyError"></div><div class="modal-buttons"><button class="modal-btn" id="applyCancel">取消</button><button class="modal-btn primary" id="applySubmit">提交申请</button></div></div></div>

    <div class="modal-overlay" id="productDetailModal"><div class="modal-content modal-wide"><div class="modal-title"><span>商品详情</span><button class="btn-icon" id="closeDetailModal"><i class="fas fa-times"></i></button></div><div class="modal-body"><div class="detail-content"><div class="detail-cover"><img id="detailCoverImage" alt="商品封面"></div><div class="detail-info"><div class="detail-header-row"><h2 id="detailName" class="detail-title" style="margin: 0 0 0.5rem 0; width: 100%;"></h2><div class="detail-meta-flex"><div class="detail-price-row"><span id="detailPrice" class="detail-price"></span><span id="detailPriceOrigin" class="detail-price-origin" style="display: none;"></span></div><div class="detail-seller-info" id="detailSellerInfo" style="flex-shrink: 0; display: none; align-items: center; gap: 0.5rem; background: var(--bg-input); padding: 0.4rem 0.6rem; border-radius: var(--radius-md); border: 0.5px solid var(--border-light); cursor: pointer;"><div class="seller-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 0.5px solid var(--border-light);"><img id="detailSellerAvatar" style="width: 100%; height: 100%; object-fit: cover; display: none;"><i class="fas fa-store" style="color: var(--text-tertiary); font-size: 0.7rem;" id="detailSellerIcon"></i></div><div id="detailSellerName" style="font-weight: 500; font-size: 0.8rem; color: var(--text-primary); white-space: nowrap; max-width: 100px; overflow: hidden; text-overflow: ellipsis;"></div><i class="fas fa-chevron-right" style="font-size: 0.7rem; color: var(--text-tertiary);"></i></div></div></div><div class="detail-meta-row" style="margin-bottom: 0.6rem;"><span id="detailStock" class="detail-stock"></span><span id="detailSales" class="detail-sales"></span></div><div class="detail-desc-box" style="background: var(--bg-input); padding: 0.6rem 0.8rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; border: 0.5px solid var(--border-light);"><div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.3rem;">商品简介</div><div id="detailDesc" style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; max-height: 60px; overflow: hidden;"></div></div><div class="detail-exchange-box" style="background: rgba(0,122,255,0.1); padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 0.5px solid rgba(0,122,255,0.2);"><div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.3rem;">兑换方式</div><div id="detailExchange" style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; max-height: 60px; overflow: hidden;"></div></div></div></div></div><div class="modal-buttons"><button class="modal-btn" id="detailCartBtn">加入购物车</button><button class="modal-btn primary" id="detailBuyBtn">立即购买</button></div></div></div>

    <div class="modal-overlay" id="productEditModal"><div class="modal-content modal-wide"><div class="modal-title"><span id="productEditTitle">新增商品</span><button class="btn-icon" id="closeProductEditModal"><i class="fas fa-times"></i></button></div><div class="modal-body"><input type="hidden" id="editProductId"><div class="form-section"><div class="section-title">基础信息</div><div class="form-group"><label>商品分类 <span style="color: var(--danger-color);">*</span></label><select class="modal-input" id="editCategory"><option value="">请选择分类</option></select></div><div class="form-group"><label>商品名称 <span style="color: var(--danger-color);">*</span></label><input type="text" class="modal-input" id="editProductName" maxlength="50"></div><div class="form-group"><label>商品简介</label><textarea class="modal-input" id="editProductDesc" maxlength="200" rows="2"></textarea></div><div class="form-group"><label>兑换方式</label><textarea class="modal-input" id="editExchangeWay" maxlength="1000" rows="2"></textarea></div></div><div class="form-section"><div class="section-title">封面图片 <span style="color: var(--danger-color);">*</span></div><div class="image-upload-area" id="productCoverArea"><div class="image-preview" id="productCoverPreview"><img id="productCoverImage" style="display: none;"><div class="placeholder" id="productCoverPlaceholder"><i class="fas fa-cloud-upload-alt"></i><span>点击上传封面</span></div></div><div class="image-upload-buttons"><button class="image-upload-btn" id="uploadProductCoverBtn">上传</button><button class="image-delete-btn" id="deleteProductCoverBtn" style="display: none;">删除</button></div><input type="file" id="productCoverFileInput" accept="image/*" style="display: none;"></div><input type="hidden" id="productCoverFileId"></div><div class="form-section"><div class="section-title">价格与库存</div><div class="form-row"><div class="form-group"><label>价格 (1-50000) <span style="color: var(--danger-color);">*</span></label><input type="number" class="modal-input" id="editPrice" min="1" max="50000"></div><div class="form-group"><label>原价 (1-50000)</label><input type="number" class="modal-input" id="editPriceOrigin" min="1" max="50000"></div></div><div class="form-row"><div class="form-group"><label>库存 (1-5000) <span style="color: var(--danger-color);">*</span></label><input type="number" class="modal-input" id="editStock" min="1" max="5000"></div><div class="form-group"><label>排序 (1-100) <span style="color: var(--danger-color);">*</span></label><input type="number" class="modal-input" id="editSort" min="1" max="100" value="80"></div></div></div><div class="form-section"><div class="section-title">销售时间</div><div class="form-row"><div class="form-group"><label>开售时间</label><input type="datetime-local" class="modal-input" id="editTimeStart"></div><div class="form-group"><label>停售时间</label><input type="datetime-local" class="modal-input" id="editTimeEnd"></div></div><div class="form-group" style="display: flex; align-items: center; gap: 0.8rem; margin-top: 0.5rem;"><div class="toggle-switch" id="editIsUpToggle"></div><label style="margin: 0; cursor: pointer; color: var(--text-secondary);">立即上架</label><input type="hidden" id="editIsUp"></div></div></div><div class="modal-error" id="productEditError"></div><div class="modal-buttons"><button class="modal-btn" id="productEditCancel">取消</button><button class="modal-btn primary" id="productEditSubmit">保存</button></div></div></div>

    <div class="modal-overlay" id="categoryEditModal"><div class="modal-content"><div class="modal-title"><span id="categoryEditTitle">新增分类</span><button class="btn-icon" id="closeCategoryEditModal"><i class="fas fa-times"></i></button></div><input type="hidden" id="editCategoryId"><div class="form-group"><label>分类名称</label><input type="text" class="modal-input" id="editCategoryName" maxlength="20"></div><div class="form-group"><label>排序 (1-100)</label><input type="number" class="modal-input" id="editCategorySort" min="1" max="100" value="80"></div><div class="modal-error" id="categoryEditError"></div><div class="modal-buttons"><button class="modal-btn" id="categoryEditCancel">取消</button><button class="modal-btn primary" id="categoryEditSubmit">保存</button></div></div></div>

    <div class="modal-overlay" id="cartModal"><div class="modal-content modal-wide"><div class="modal-title"><span>购物车</span><button class="btn-icon" id="closeCartModal"><i class="fas fa-times"></i></button></div><div class="modal-body"><div id="cartList" class="cart-list"></div><div id="cartEmpty" class="no-results" style="display: none;">购物车为空</div></div><div class="modal-buttons" id="cartActions" style="display: none;"><button class="modal-btn" id="clearCartBtn">清空</button><button class="modal-btn primary" id="checkoutBtn">结算</button></div></div></div>

    <div class="modal-overlay" id="shareModal"><div class="modal-content"><div class="modal-title"><span>分享店铺</span><button class="btn-icon" id="closeShareModal"><i class="fas fa-times"></i></button></div><div class="modal-body share-modal-body"><div class="share-link-section"><div class="share-link-label">店铺链接</div><div class="share-link-input-group"><input type="text" id="shareLinkInput" class="share-link-input" readonly value=""><button class="copy-link-btn" id="copyLinkBtn"><i class="fas fa-copy"></i> 复制</button></div><p class="share-link-hint">点击复制链接，分享给好友</p></div><div class="share-qrcode-section"><div class="share-qrcode-label">扫码访问店铺</div><div class="qrcode-container"><canvas id="qrcodeCanvas" width="180" height="180"></canvas></div><p class="share-qrcode-hint">使用微信/浏览器扫码即可打开</p></div></div></div></div>

    <div class="cart-float-btn" id="cartFloatBtn"><i class="fas fa-shopping-cart"></i><span class="cart-count" id="cartCount">0</span></div>

    <style>
    /* === 补充缺失的 CSS 变量定义，确保样式生效 === */
    :root {
      --bg-body: #000000; --bg-card: #1c1c1e; --bg-input: #2c2c2e; --bg-hover: #3a3a3c; --bg-modal: rgba(28,28,30,0.95);
      --bg-topbar: rgba(28,28,30,0.72); --border-light: rgba(255,255,255,0.1); --border-color: #38383a;
      --text-primary: #ffffff; --text-secondary: #8e8e93; --text-tertiary: #636366;
      --accent-color: #007aff; --accent-hover: #005ecb; --danger-color: #ff453a; --success-color: #30d158; --warning-color: #ff9f0a;
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.2); --shadow-md: 0 4px 16px rgba(0,0,0,0.3); --shadow-lg: 0 8px 32px rgba(0,0,0,0.4);
      --blur-effect: blur(20px);
      --radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px; --radius-xl: 28px; --radius-full: 9999px;
      --search-bg: rgba(255,255,255,0.08); --search-bg-hover: rgba(255,255,255,0.12);
      --search-border: rgba(255,255,255,0.15); --search-border-focus: rgba(0,122,255,0.5);
      --search-text: #ffffff; --search-placeholder: rgba(255,255,255,0.4); --search-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    [data-theme="light"] {
      --bg-body: #f2f2f7; --bg-card: #ffffff; --bg-input: #e5e5ea; --bg-hover: #e5e5ea; --bg-modal: rgba(255,255,255,0.95);
      --bg-topbar: rgba(255,255,255,0.72); --border-light: rgba(0,0,0,0.1); --border-color: #d1d1d6;
      --text-primary: #000000; --text-secondary: #8e8e93; --text-tertiary: #c7c7cc;
      --accent-color: #007aff; --accent-hover: #005ecb; --danger-color: #ff3b30; --success-color: #34c759; --warning-color: #ff9500;
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.08); --shadow-md: 0 4px 16px rgba(0,0,0,0.12); --shadow-lg: 0 8px 32px rgba(0,0,0,0.16);
      --search-bg: rgba(240,240,245,0.9); --search-bg-hover: rgba(235,235,240,0.95);
      --search-border: rgba(0,0,0,0.12); --search-border-focus: rgba(0,122,255,0.4);
      --search-text: #000000; --search-placeholder: rgba(0,0,0,0.35); --search-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    /* === 页面特有样式 === */
    .shop-content { width: 100%; min-height: 100vh; background-color: var(--bg-body); color: var(--text-primary); }
    .page-header { margin: 1rem 0 1rem 0; animation: slideUpFade 0.6s ease-out forwards; }
    @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
    .title-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; margin-bottom: 0.3rem; }
    .page-title { font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 700; margin: 0; letter-spacing: -0.5px; display: flex; align-items: center; flex-wrap: wrap; }
    .view-toggle-btn { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 40px; padding: 0.3rem 1rem; font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; flex-shrink: 0; display: flex; align-items: center; gap: 0.4rem; }
    .view-toggle-btn:hover, .view-toggle-btn.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
    .page-subtitle { font-size: 1rem; color: var(--text-secondary); margin: 0; font-weight: 400; }
    .search-bar { margin: 0 0 1rem 0; }
    .sort-bar { display: flex; gap: 0.4rem; align-items: center; margin: 0 0 1rem 0; flex-wrap: wrap; }
    .sort-label { font-size: 0.85rem; color: var(--text-secondary); }
    .sort-chip { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 40px; padding: 0.3rem 0.8rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; }
    .sort-chip:hover, .sort-chip.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr)); gap: 1rem; }
    .product-card { background: var(--bg-card); backdrop-filter: blur(20px); border: 0.5px solid var(--border-light); border-radius: 20px; overflow: hidden; transition: all 0.2s ease; cursor: pointer; display: flex; flex-direction: column; position: relative; }
    .product-card:hover { transform: translateY(-4px); border-color: var(--border-color); box-shadow: var(--shadow-md); }
    .product-cover { width: 100%; aspect-ratio: 1/1; background: var(--bg-input); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
    .product-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
    .product-card:hover .product-cover img { transform: scale(1.05); }
    .product-cover i { font-size: 3rem; color: var(--text-tertiary); }
    .product-info { padding: 0.8rem; flex: 1; display: flex; flex-direction: column; }
    .product-name { font-size: 0.95rem; font-weight: 500; color: var(--text-primary); margin: 0 0 0.4rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
    .product-desc { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.5rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
    .product-price { display: flex; align-items: baseline; gap: 0.5rem; margin-top: auto; }
    .price-current { font-size: 1.1rem; font-weight: 700; color: var(--accent-color); }
    .price-current i { font-size: 0.8rem; margin-right: 2px; }
    .price-origin { font-size: 0.8rem; color: var(--text-tertiary); text-decoration: line-through; }
    .product-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 0.5px solid var(--border-light); font-size: 0.7rem; color: var(--text-tertiary); }
    .stock-badge { background: rgba(48, 209, 88, 0.15); color: var(--success-color); padding: 0.2rem 0.6rem; border-radius: 40px; }
    .stock-badge.low { background: rgba(255, 159, 10, 0.15); color: var(--warning-color); }
    .stock-badge.empty { background: var(--bg-input); color: var(--text-secondary); }
    .cart-add-btn-inline { background: var(--accent-color); border: none; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.7rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0; margin-left: 0.3rem; position: relative; }
    .cart-add-btn-inline:hover { background: var(--accent-hover); transform: scale(1.1); }
    .cart-qty-badge { position: absolute; top: -6px; right: -6px; background: var(--danger-color); color: #fff; font-size: 0.6rem; font-weight: 600; min-width: 16px; height: 16px; border-radius: 8px; display: none; align-items: center; justify-content: center; padding: 0 3px; z-index: 3; box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4); animation: badgePop 0.2s ease-out; }
    @keyframes badgePop { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
    .cart-float-btn { position: fixed; bottom: 2rem; right: 2rem; width: 56px; height: 56px; background: var(--accent-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 16px rgba(0,122,255,0.4); transition: all 0.2s; z-index: 1000; }
    .cart-float-btn:hover { transform: scale(1.1); background: var(--accent-hover); }
    .cart-count { position: absolute; top: -4px; right: -4px; background: var(--danger-color); color: #fff; font-size: 0.7rem; font-weight: 600; min-width: 20px; height: 20px; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
    .cart-count:empty { display: none; }
    .cart-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .cart-item { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-md); padding: 0.6rem 0.8rem; }
    .cart-item-info { flex: 1; min-width: 0; }
    .cart-item-name { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.2rem; }
    .cart-item-price { font-size: 0.75rem; color: var(--accent-color); font-weight: 600; }
    .cart-item-quantity { display: flex; align-items: center; gap: 0; margin: 0 0.4rem; background: var(--bg-card); border: 0.5px solid var(--border-light); border-radius: 20px; overflow: hidden; }
    .qty-btn { background: transparent; border: none; border-right: 0.5px solid var(--border-light); color: var(--text-primary); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; font-size: 0.9rem; line-height: 1; font-weight: 300; padding: 0; }
    .qty-btn:first-child { border-radius: 20px 0 0 20px; }
    .qty-btn:last-child { border-right: none; border-radius: 0 20px 20px 0; }
    .qty-btn:hover { background: var(--accent-color); color: #fff; }
    .qty-btn:active { transform: scale(0.95); }
    .qty-value { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); min-width: 24px; text-align: center; }
    .cart-item-remove { width: 28px; height: 28px; background: var(--bg-card); border: 0.5px solid var(--border-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; transition: 0.2s; flex-shrink: 0; font-size: 0.8rem; }
    .cart-item-remove:hover { background: var(--danger-color); color: #fff; border-color: var(--danger-color); }
    .apply-prompt { padding: 2rem; display: flex; justify-content: center; }
    .apply-card { background: var(--bg-card); border: 0.5px solid var(--border-light); border-radius: 24px; padding: 2rem; text-align: center; max-width: 400px; width: 100%; }
    .apply-card i { font-size: 3rem; color: var(--accent-color); margin-bottom: 1rem; }
    .apply-card h3 { font-size: 1.3rem; margin: 0 0 0.5rem 0; }
    .apply-card p { color: var(--text-secondary); margin: 0 0 1.5rem 0; }
    .btn-primary { background: var(--accent-color); border: none; color: white; padding: 0.6rem 1.5rem; border-radius: 40px; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: 0.2s; }
    .btn-primary:hover { background: var(--accent-hover); transform: scale(1.02); }
    .seller-tabs { display: flex; gap: 0.4rem; margin: 0 0 1rem 0; padding: 0 1rem; border-bottom: 0.5px solid var(--border-light); flex-wrap: wrap; }
    .seller-tab { background: none; border: none; padding: 0.6rem 1rem; font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: 0.2s; display: flex; align-items: center; gap: 0.4rem; }
    .seller-tab.active { color: var(--accent-color); border-bottom-color: var(--accent-color); }
    .seller-toolbar { display: flex; gap: 0.8rem; align-items: center; margin: 0 0 1rem 0; padding: 0 1rem; flex-wrap: wrap; }
    .seller-toolbar-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.8rem; margin: 0 0 1rem 0; padding: 0 1rem; }
    .category-filter-container { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; flex: 1; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 0.2rem; }
    .category-filter-container .category-chip { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 40px; padding: 0.3rem 0.8rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
    .category-filter-container .category-chip:hover, .category-filter-container .category-chip.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
    .action-bar { display: flex; align-items: center; gap: 0.8rem; flex-shrink: 1; min-width: 0; }
    .action-bar .search-container { flex: 1 1 auto; margin: 0; }
    .modal-body { max-height: 60vh; overflow-y: auto; padding-right: 5px; }
    .form-section { background: var(--bg-card); border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1rem; border: 0.5px solid var(--border-light); }
    .section-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.8rem; padding-bottom: 0.5rem; border-bottom: 0.5px solid var(--border-light); }
    .form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.85rem; font-weight: 500; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-md); padding: 0.8rem 1rem; color: var(--text-primary); font-size: 0.95rem; outline: none; transition: border-color 0.2s; box-sizing: border-box; -webkit-appearance: none; appearance: none; }
    .form-group textarea { resize: vertical; min-height: 80px; border-radius: var(--radius-md); }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--accent-color); }
    .form-group input[type="datetime-local"] { width: 100%; background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-md); padding: 0.8rem 1rem; color: var(--text-primary); font-size: 0.95rem; outline: none; transition: border-color 0.2s; box-sizing: border-box; -webkit-appearance: none; appearance: none; min-height: 44px; line-height: 1.4; }
    .form-group input[type="datetime-local"]:focus { border-color: var(--accent-color); background: var(--bg-card); }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .form-row .form-group { flex: 1; min-width: 200px; }
    .detail-content { display: flex; flex-direction: column; gap: 0.8rem; }
    .detail-cover { width: 100%; aspect-ratio: 16/9; background: var(--bg-input); border-radius: var(--radius-lg); overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .detail-cover img { width: 100%; height: 100%; object-fit: cover; }
    .detail-title { font-size: 1.2rem; font-weight: 600; color: var(--text-primary); }
    .detail-price-row { display: flex; align-items: baseline; gap: 0.5rem; }
    .detail-price { font-size: 1.4rem; font-weight: 700; color: var(--accent-color); }
    .detail-price-origin { font-size: 0.95rem; color: var(--text-tertiary); text-decoration: line-through; }
    .detail-meta-row { display: flex; gap: 0.8rem; font-size: 0.8rem; color: var(--text-secondary); }
    .detail-header-row { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
    .detail-meta-flex { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 0.3rem; gap: 0.8rem; }
    .detail-seller-info { flex-shrink: 0; white-space: nowrap; }
    .seller-avatar-lg { width: 56px; height: 56px; border-radius: 12px; background: var(--bg-input); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 0.5px solid var(--border-light); }
    .seller-avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
    .seller-avatar-lg i { font-size: 1.5rem; color: var(--text-tertiary); }
    .store-back-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding: 0 1rem; }
    .back-btn { background: var(--bg-input); border: 0.5px solid var(--border-light); color: var(--text-primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
    .back-btn:hover { background: var(--bg-hover); transform: scale(1.05); }
    .store-back-title { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; }
    .seller-store-header { background: var(--bg-card); border-radius: var(--radius-xl); padding: 1.5rem; border: 0.5px solid var(--border-light); }
    .store-header-content { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .store-cover { width: 80px; height: 80px; border-radius: 16px; background: var(--bg-input); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 0.5px solid var(--border-light); }
    .store-cover img { width: 100%; height: 100%; object-fit: cover; }
    .store-cover i { font-size: 2rem; color: var(--text-tertiary); }
    .store-info { flex: 1; min-width: 0; }
    .store-name { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.3rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .store-desc { font-size: 0.9rem; color: var(--text-secondary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .store-share-btn { flex-shrink: 0; margin-left: auto; }
    .store-stats { display: flex; gap: 2rem; padding-top: 1rem; border-top: 0.5px solid var(--border-light); }
    .stat-item { display: flex; flex-direction: column; align-items: center; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--accent-color); }
    .stat-label { font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem; }
    .store-category-bar { display: flex; gap: 0.4rem; align-items: center; margin: 0 0 1rem 0; padding: 0 1rem; overflow-x: auto; flex-wrap: nowrap; }
    .category-chip { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 40px; padding: 0.3rem 0.8rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
    .category-chip:hover, .category-chip.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
    .category-chips { display: flex; gap: 0.4rem; flex-wrap: nowrap; }
    .share-modal-body { padding: 0 1.5rem 1.2rem; max-height: none; }
    .share-link-section, .share-qrcode-section { margin-bottom: 1.5rem; }
    .share-link-label, .share-qrcode-label { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.5rem; }
    .share-link-input-group { display: flex; gap: 0.6rem; align-items: center; }
    .share-link-input { flex: 1; background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: 12px; padding: 0.7rem 0.8rem; font-size: 0.8rem; color: var(--text-primary); font-family: monospace; }
    .share-link-input:focus { outline: none; border-color: var(--accent-color); box-shadow: 0 0 0 2px rgba(0,122,255,0.2); }
    .copy-link-btn { background: var(--accent-color); border: none; border-radius: 12px; padding: 0.7rem 1.2rem; color: #fff; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; }
    .copy-link-btn:hover { background: var(--accent-hover); transform: scale(1.02); }
    .copy-link-btn:active { transform: scale(0.98); }
    .share-link-hint, .share-qrcode-hint { font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.5rem; text-align: center; }
    .qrcode-container { display: flex; justify-content: center; align-items: center; background: #fff; padding: 12px; border-radius: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-top: 0.2rem; }
    #qrcodeCanvas { display: block; width: 180px; height: 180px; border-radius: 12px; }
    @media (max-width: 700px) {
      .page-header { margin: 0.8rem 0; }
      .title-row { flex-direction: row; justify-content: space-between; align-items: center; }
      .page-title { font-size: 1.8rem; margin: 0; }
      .view-toggle-btn { padding: 0.25rem 0.8rem; font-size: 0.8rem; flex-shrink: 0; }
      .page-subtitle { font-size: 0.9rem; margin-top: 0.3rem; }
      .product-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.8rem;}
      .product-meta { gap: 0.4rem; }
      .product-meta span:not(.stock-badge):not(.cart-add-btn-inline) { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.7rem; }
      .cart-add-btn-inline { flex-shrink: 0; width: 26px; height: 26px; font-size: 0.7rem; margin-left: 0; }
      .detail-header-row { display: block !important; }
      .detail-title { font-size: 1.1rem; margin-bottom: 0.3rem !important; width: 100%; }
      .detail-meta-flex { display: flex !important; justify-content: space-between; align-items: center; width: 100%; margin-top: 0.2rem; }
      .detail-price-row { display: inline-flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0; }
      .detail-seller-info { display: inline-flex !important; float: right; margin-top: 0 !important; width: auto; align-self: auto; padding: 0.3rem 0.6rem; }
      .detail-header-row::after { content: ""; display: table; clear: both; }
      .detail-price { font-size: 1.2rem; }
      .form-row { flex-direction: column; gap: 0.5rem; }
      .form-row .form-group { min-width: 100%; width: 100%; }
      input[type="datetime-local"], .modal-input, .form-group input, .form-group textarea, .form-group select { width: 100%; max-width: 100%; box-sizing: border-box; font-size: 0.95rem; padding: 0.75rem 1rem; background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-md); color: var(--text-primary); -webkit-appearance: none; appearance: none; }
      input[type="datetime-local"] { min-height: 44px; line-height: 1.4; }
      .modal-content input[type="datetime-local"] { width: 100%; padding: 0.75rem 1rem; }
      .search-container { display: flex; align-items: center; width: 100%; max-width: none; }
      .search-input { flex: 1; min-width: 0; font-size: 0.95rem; }
      .search-btn { flex-shrink: 0; padding: 0.4rem 0.8rem; min-width: 44px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; }
      .search-btn i { font-size: 1rem; line-height: 1; }
      .info-list-item#sellerInfoRow { flex-wrap: wrap; gap: 0.8rem; }
      .info-list-item#sellerInfoRow .info-list-left { flex: 1; min-width: 0; gap: 0.5rem; }
      .info-list-item#sellerInfoRow .seller-avatar-lg { width: 48px; height: 48px; flex-shrink: 0; }
      .info-list-item#sellerInfoRow .info-list-right { width: 100%; justify-content: flex-end; gap: 0.6rem; }
      .info-list-item#sellerInfoRow .btn-outline { padding: 0.3rem 0.8rem; font-size: 0.8rem; }
      .modal-content.modal-wide { max-width: 95%; width: 95%; padding: 1rem; }
      .product-card { border-radius: 16px; }
      .product-info { padding: 0.6rem; }
      .product-name { font-size: 0.85rem; line-height: 1.3; }
      .product-desc { font-size: 0.7rem; margin-bottom: 0.3rem; }
      .price-current { font-size: 1rem; }
      .price-origin { font-size: 0.7rem; }
      .store-category-bar, .category-filter-container { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 0.2rem; }
      .category-chips, .category-filter-container .category-chips { flex-wrap: nowrap; }
      .seller-toolbar { padding: 0 0.8rem; }
      .seller-tabs { padding: 0 0.8rem; }
      .modal-buttons { justify-content: center; }
      .detail-content { flex-direction: column; }
      .detail-cover { aspect-ratio: 4/3; }
      .cart-float-btn { bottom: 1.5rem; right: 1.5rem; width: 50px; height: 50px; font-size: 1.3rem; }
      .cart-item-quantity { gap: 0; margin: 0 0.3rem; }
      .qty-btn { width: 26px; height: 26px; font-size: 0.85rem; }
      .qty-value { font-size: 0.75rem; min-width: 22px; }
      .cart-qty-badge { top: -5px; right: -5px; min-width: 14px; height: 14px; font-size: 0.55rem; }
      .store-back-row { padding: 0 0.8rem; }
      .seller-store-header { padding: 1rem; }
      .store-header-content { flex-wrap: wrap; }
      .store-cover { width: 60px; height: 60px; }
      .store-cover i { font-size: 1.5rem; }
      .store-name { font-size: 1.2rem; }
      .store-desc { font-size: 0.8rem; }
      .store-stats { gap: 1rem; }
      .stat-value { font-size: 1.2rem; }
      .store-category-bar { padding: 0 0.8rem; }
      .share-modal-body { padding: 0 1rem 1rem; }
      .share-link-input-group { flex-direction: column; gap: 0.5rem; }
      .share-link-input { width: 100%; font-size: 0.75rem; }
      .copy-link-btn { width: 100%; justify-content: center; padding: 0.6rem; }
      .qrcode-container { padding: 8px; }
      #qrcodeCanvas { width: 140px; height: 140px; }
    }
    @media (max-width: 400px) {
      .product-grid { grid-template-columns: 1fr; }
      .sort-chip { padding: 0.25rem 0.6rem; font-size: 0.75rem; }
    }
    </style>
    \`;
  }

  function resetLoadingState() {
    const loading = el.querySelector('#loadingIndicator');
    const grid = el.querySelector('#productGrid');
    if (loading) loading.style.display = 'none';
    if (grid) grid.style.display = 'grid';
  }
  function showEmptyState() {
    const empty = el.querySelector('#emptyState');
    const grid = el.querySelector('#productGrid');
    if (empty) empty.style.display = 'block';
    if (grid) grid.style.display = 'none';
  }

  async function loadProducts(reset = false) {
    const state = shopState.client;
    if (state.isLoading) return;
    if (reset) {
      state.currentPage = 1; state.hasMore = true;
      const grid = el.querySelector('#productGrid'); if (grid) grid.innerHTML = '';
      const empty = el.querySelector('#emptyState'); if (empty) empty.style.display = 'none';
      const loading = el.querySelector('#loadingIndicator'); if (loading) loading.style.display = 'flex';
      const gridContainer = el.querySelector('#productGrid'); if (gridContainer) gridContainer.style.display = 'none';
    }
    if (!state.hasMore) return;
    state.isLoading = true;
    const loadMore = el.querySelector('#loadMoreIndicator'); if (loadMore && !reset) loadMore.style.display = 'block';
    if (state.searchController) state.searchController.abort();
    const controller = new AbortController(); state.searchController = controller;
    const params = new URLSearchParams();
    params.append('sort_by', state.sortBy); params.append('sort_order', state.sortOrder); params.append('is_up', '1');
    if (state.searchQuery) params.append('name', state.searchQuery);
    params.append('page', state.currentPage); params.append('page_size', state.pageSize);
    try {
      const response = await window.fetchWithAuth(API.PRODUCT_LIST + '?' + params.toString(), { signal: controller.signal });
      if (!response) { resetLoadingState(); return; }
      if (controller !== state.searchController) return;
      const data = await response.json();
      const items = data.items || []; const total = data.total || 0;
      state.pageSize = data.page_size || 20; state.totalPages = Math.ceil(total / state.pageSize);
      const current = data.page || state.currentPage;
      if (reset && items.length === 0) { showEmptyState(); resetLoadingState(); return; }
      if (items.length > 0) { renderProductCards(el.querySelector('#productGrid'), items); state.currentPage = current + 1; state.hasMore = state.currentPage <= state.totalPages; } else { state.hasMore = false; }
      if (reset) { const grid = el.querySelector('#productGrid'); if (grid) grid.style.display = 'grid'; const loading = el.querySelector('#loadingIndicator'); if (loading) loading.style.display = 'none'; }
      if (loadMore) loadMore.style.display = (!reset && state.hasMore) ? 'block' : 'none';
    } catch (err) { if (err.name !== 'AbortError') showToast('加载商品失败：' + err.message); resetLoadingState(); }
    finally { if (controller === state.searchController) { state.isLoading = false; state.searchController = null; } }
  }
  function renderProductCards(container, items) {
    if (!container) return;
    items.forEach(item => {
      const card = document.createElement('div'); card.className = 'product-card'; card.dataset.productId = item.product_id;
      const coverUrl = item.cover_url || ''; const name = escapeHtml(item.name || '未命名'); const desc = escapeHtml(item.description || '');
      const price = formatPrice(item.price); const priceOrigin = formatPrice(item.price_origin); const stock = item.stock || 0;
      const stockText = formatStock(stock); const stockClass = getStockClass(stock);
      const cartItem = shopState.cart.find(c => c.product_id == item.product_id);
      const qtyBadgeStyle = (cartItem && cartItem.quantity > 0) ? '' : 'display:none;';
      const qtyBadgeText = cartItem ? cartItem.quantity : 0;
      card.innerHTML = \`<div class="product-cover">\${coverUrl ? '<img src="' + coverUrl + '" loading="lazy">' : '<i class="fas fa-image"></i>'}</div><div class="product-info"><div class="product-name" title="\${name}">\${name}</div>\${desc ? '<div class="product-desc" title="\${desc}">\${desc}</div>' : ''}<div class="product-price"><span class="price-current"><i class="fas fa-carrot"></i>\${price}</span>\${priceOrigin && priceOrigin != price ? '<span class="price-origin"><i class="fas fa-carrot"></i>' + priceOrigin + '</span>' : ''}</div><div class="product-meta"><span class="stock-badge \${stockClass}">\${stockText}</span><span><i class="fas fa-shopping-bag"></i> \${item.sales || 0} 已售</span><button class="cart-add-btn-inline" data-product-id="\${item.product_id}" data-name="\${name}" data-price="\${price}" data-cover="\${coverUrl || ''}" title="加入购物车"><i class="fas fa-plus"></i><span class="cart-qty-badge" style="\${qtyBadgeStyle}">\${qtyBadgeText}</span></button></div></div>\`;
      card.addEventListener('click', e => { if (!e.target.closest('.cart-add-btn-inline')) openProductDetail(item.product_id); });
      const cartBtn = card.querySelector('.cart-add-btn-inline');
      if (cartBtn) cartBtn.addEventListener('click', e => { e.stopPropagation(); addToCart({ product_id: cartBtn.dataset.productId, name: cartBtn.dataset.name, price: parseFloat(cartBtn.dataset.price), cover_url: cartBtn.dataset.cover }); });
      container.appendChild(card);
    });
    updateAllCartQtyBadges();
  }
  async function openProductDetail(productId) {
    const modal = el.querySelector('#productDetailModal'); if (!modal || !productId) return;
    const coverImg = el.querySelector('#detailCoverImage'); const nameEl = el.querySelector('#detailName');
    const priceEl = el.querySelector('#detailPrice'); const priceOriginEl = el.querySelector('#detailPriceOrigin');
    const stockEl = el.querySelector('#detailStock'); const salesEl = el.querySelector('#detailSales');
    const descEl = el.querySelector('#detailDesc'); const exchangeEl = el.querySelector('#detailExchange');
    const sellerInfoDiv = el.querySelector('#detailSellerInfo'); const sellerAvatar = el.querySelector('#detailSellerAvatar');
    const sellerIcon = el.querySelector('#detailSellerIcon'); const sellerName = el.querySelector('#detailSellerName');
    const buyBtn = el.querySelector('#detailBuyBtn');
    if (coverImg) { coverImg.src = ''; coverImg.style.display = 'none'; } if (nameEl) nameEl.textContent = '';
    if (priceEl) priceEl.innerHTML = ''; if (priceOriginEl) priceOriginEl.style.display = 'none';
    if (stockEl) stockEl.textContent = ''; if (salesEl) salesEl.textContent = '';
    if (descEl) { descEl.textContent = ''; descEl.style.display = 'none'; } if (exchangeEl) { exchangeEl.textContent = ''; exchangeEl.style.display = 'none'; }
    if (sellerInfoDiv) sellerInfoDiv.style.display = 'none'; if (sellerAvatar) sellerAvatar.style.display = 'none';
    if (sellerIcon) sellerIcon.style.display = 'inline-block'; if (sellerName) sellerName.textContent = '';
    modal.classList.add('show'); modal.dataset.productId = productId;
    try {
      const response = await window.fetchWithAuth(API.PRODUCT_INFO + '?product_id=' + productId);
      if (!response) throw new Error('获取商品详情失败');
      const item = await response.json();
      if (coverImg) { coverImg.src = item.cover_url || ''; coverImg.style.display = item.cover_url ? 'block' : 'none'; }
      if (nameEl) nameEl.textContent = item.name || '未命名';
      if (priceEl) priceEl.innerHTML = '<i class="fas fa-carrot"></i> ' + formatPrice(item.price);
      if (priceOriginEl) { if (item.price_origin && item.price_origin != item.price) { priceOriginEl.textContent = formatPrice(item.price_origin); priceOriginEl.style.display = 'inline'; } else { priceOriginEl.style.display = 'none'; } }
      if (stockEl) stockEl.textContent = '库存：' + formatStock(item.stock); if (salesEl) salesEl.textContent = '已售：' + (item.sales || 0);
      if (descEl) { descEl.textContent = item.description || '暂无简介'; descEl.style.display = item.description ? 'block' : 'none'; }
      if (exchangeEl) { exchangeEl.textContent = item.exchange_way || '暂无兑换说明'; exchangeEl.style.display = item.exchange_way ? 'block' : 'none'; }
      if (sellerInfoDiv && item.seller) {
        sellerInfoDiv.style.display = 'flex'; sellerInfoDiv.dataset.sellerId = item.seller.seller_id; sellerInfoDiv.dataset.sellerName = item.seller.name || '未知店铺';
        if (sellerAvatar) { if (item.seller.cover_url) { sellerAvatar.src = item.seller.cover_url; sellerAvatar.style.display = 'block'; if (sellerIcon) sellerIcon.style.display = 'none'; } else { sellerAvatar.style.display = 'none'; if (sellerIcon) sellerIcon.style.display = 'inline-block'; } }
        if (sellerName) sellerName.textContent = item.seller.name || '未知店铺';
      } else if (sellerInfoDiv) sellerInfoDiv.style.display = 'none';
      if (buyBtn) { const newBtn = buyBtn.cloneNode(true); buyBtn.parentNode.replaceChild(newBtn, buyBtn); newBtn.addEventListener('click', async () => { if (item.stock <= 0) { showToast('商品已售罄'); return; } try { await createOrder(item.product_id, 1, null); modal.classList.remove('show'); } catch(e){} }); }
    } catch (err) { showToast(err.message); }
  }

  async function loadSellerInfo() { try { const response = await window.fetchWithAuth(API.SELLER_BASE); if (!response) return null; return await response.json(); } catch (err) { return null; } }
  function renderSellerHeader(sellerInfo) {
    if (!sellerInfo) return;
    const statusEl = el.querySelector('#sellerStatus'); const nameEl = el.querySelector('#sellerNameDisplay'); const descEl = el.querySelector('#sellerDescDisplay');
    const coverImg = el.querySelector('#sellerCoverImg'); const coverIcon = el.querySelector('#sellerCoverIcon');
    let statusText = ''; let statusClass = '';
    if (!sellerInfo.status || sellerInfo.status === 'default') { statusText = '未申请'; statusClass = 'status-gray'; }
    else if (sellerInfo.status === 'examine') { statusText = '申请审核中'; statusClass = 'status-yellow'; }
    else if (sellerInfo.status === 'pass') { statusText = '已认证'; statusClass = 'status-green'; }
    else if (sellerInfo.status === 'disable') { statusText = '已拒绝'; statusClass = 'status-red'; }
    else { statusText = '未知'; statusClass = 'status-gray'; }
    if (statusEl) { statusEl.textContent = statusText; statusEl.className = \`status-badge \${statusClass}\`; }
    if (nameEl) nameEl.textContent = sellerInfo.name || '未命名店铺'; if (descEl) descEl.textContent = sellerInfo.description || '暂无简介';
    if (coverImg && coverIcon) { if (sellerInfo.cover_url) { coverImg.src = sellerInfo.cover_url; coverImg.style.display = 'block'; coverIcon.style.display = 'none'; } else { coverImg.style.display = 'none'; coverIcon.style.display = 'block'; } }
  }
  async function loadSellerCategories() {
    try { const params = new URLSearchParams(); if (shopState.seller.sellerInfo?.seller_id) params.append('seller_id', shopState.seller.sellerInfo.seller_id);
      const response = await window.fetchWithAuth(API.CATEGORY_LIST + '?' + params.toString()); if (!response) return []; const data = await response.json(); return Array.isArray(data) ? data : []; } catch (err) { return []; }
  }
  async function loadSellerProducts(reset = false) {
    const state = shopState.seller; if (state.isLoading) return;
    if (reset) { state.currentPage = 1; state.hasMore = true; const list = el.querySelector('#sellerProductList'); if (list) list.innerHTML = ''; }
    if (!state.hasMore) return; state.isLoading = true;
    const params = new URLSearchParams();
    if (shopState.seller.sellerInfo?.seller_id) params.append('seller_id', shopState.seller.sellerInfo.seller_id);
    if (state.searchQuery) params.append('name', state.searchQuery);
    if (state.selectedCategory !== 'all') params.append('category_id', state.selectedCategory);
    params.append('sort_by', 'sort'); params.append('sort_order', 'asc');
    params.append('page', state.currentPage); params.append('page_size', state.pageSize);
    try {
      const response = await window.fetchWithAuth(API.PRODUCT_LIST + '?' + params.toString());
      if (!response) return;
      const data = await response.json(); const items = data.items || [];
      if (reset && items.length === 0) { el.querySelector('#sellerProductEmpty').style.display = 'block'; el.querySelector('#sellerProductList').style.display = 'none'; return; }
      if (items.length > 0) { renderSellerProducts(items); state.currentPage++; state.hasMore = items.length === state.pageSize; el.querySelector('#sellerProductEmpty').style.display = 'none'; el.querySelector('#sellerProductList').style.display = 'flex'; } else { state.hasMore = false; }
    } catch (err) { showToast('加载商品失败：' + err.message); } finally { state.isLoading = false; }
  }
  function renderSellerProducts(items) {
    const list = el.querySelector('#sellerProductList'); if (!list) return;
    items.forEach(item => {
      const row = document.createElement('div'); row.className = 'info-list-item'; row.dataset.productId = item.product_id;
      const coverUrl = item.cover_url || ''; const name = escapeHtml(item.name || '未命名'); const price = formatPrice(item.price);
      const stock = item.stock ?? 0; const sales = item.sales || 0; const isUp = item.is_up;
      row.innerHTML = \`<div class="info-list-left" style="display:flex; align-items:center; gap:0.8rem;">\${coverUrl ? '<img src="'+coverUrl+'" style="width:48px;height:48px;object-fit:cover;border-radius:12px;">' : '<div style="width:48px;height:48px;background:var(--bg-input);border-radius:12px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="color:var(--text-tertiary);font-size:1.2rem;"></i></div>'}</div><div style="min-width:0; flex:1;"><div class="info-list-title" style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">\${name}\${!isUp ? '<span style="font-size:0.65rem; color:var(--text-tertiary); background:var(--bg-input); border:0.5px solid var(--border-light); padding:0.15rem 0.5rem; border-radius:20px;">已下架</span>' : ''}</div><div class="info-list-desc"><span><i class="fas fa-carrot" style="color:var(--warning-color);"></i> \${price}</span><span><i class="fas fa-cubes" style="color:var(--accent-color);"></i> 库存 \${stock}</span><span><i class="fas fa-shopping-bag" style="color:var(--success-color);"></i> 已售 \${sales}</span></div></div></div><div class="info-list-right"><button class="btn-icon updown-product-btn" title="\${isUp ? '下架' : '上架'}" data-product-id="\${item.product_id}" data-is-up="\${isUp}"><i class="fas \${isUp ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></button><button class="btn-icon edit-product-btn" title="编辑"><i class="fas fa-edit"></i></button><button class="btn-icon delete-product-btn" style="color:var(--danger-color);" title="删除"><i class="fas fa-trash"></i></button></div>\`;
      row.querySelector('.info-list-left').addEventListener('click', () => openProductEdit(item.product_id));
      row.querySelector('.edit-product-btn').addEventListener('click', e => { e.stopPropagation(); openProductEdit(item.product_id); });
      row.querySelector('.delete-product-btn').addEventListener('click', async e => { e.stopPropagation(); if (confirm('确定要删除该商品吗？')) { try { const response = await window.fetchWithAuth(API.PRODUCT_DELETE + '?product_id=' + item.product_id, { method: 'DELETE' }); if (!response) return; if (!response.ok) throw new Error('删除失败'); showToast('删除成功'); loadSellerProducts(true); loadProducts(true); } catch (err) { showToast(err.message); } } });
      const updownBtn = row.querySelector('.updown-product-btn');
      if (updownBtn) updownBtn.addEventListener('click', async e => { e.stopPropagation(); const productId = updownBtn.dataset.productId; const currentIsUp = updownBtn.dataset.isUp === 'true'; try { const newIsUp = !currentIsUp; const response = await window.fetchWithAuth(API.PRODUCT_UP, { method: 'PUT', body: JSON.stringify({ product_id: parseInt(productId), is_up: newIsUp }) }); if (!response) return; if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || '操作失败'); } showToast(newIsUp ? '已上架' : '已下架'); loadSellerProducts(true); loadProducts(true); } catch (err) { showToast(err.message); } });
      list.appendChild(row);
    });
  }
  function renderSellerCategories(categories) {
    const list = el.querySelector('#sellerCategoryList'); if (!list) return;
    if (categories.length === 0) { list.style.display = 'none'; el.querySelector('#sellerCategoryEmpty').style.display = 'block'; return; }
    list.style.display = 'flex'; el.querySelector('#sellerCategoryEmpty').style.display = 'none';
    list.innerHTML = categories.map(c => \`<div class="info-list-item" data-category-id="\${c.category_id}"><div class="info-list-left" style="flex:1;"><div class="info-list-title">\${escapeHtml(c.name)}</div><div class="info-list-desc">排序：\${c.sort}</div></div><div class="info-list-right"><button class="btn-icon edit-category-btn" title="编辑"><i class="fas fa-edit"></i></button><button class="btn-icon delete-category-btn" style="color:var(--danger-color);" title="删除"><i class="fas fa-trash"></i></button></div></div>\`).join('');
    list.querySelectorAll('.edit-category-btn').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); const id = btn.closest('.info-list-item').dataset.categoryId; const cat = shopState.seller.categories.find(c => c.category_id == id); if (cat) openCategoryEdit(cat); }));
    list.querySelectorAll('.delete-category-btn').forEach(btn => btn.addEventListener('click', async e => { e.stopPropagation(); const id = btn.closest('.info-list-item').dataset.categoryId; if (confirm('确定要删除该分类吗？')) { try { const response = await window.fetchWithAuth(API.CATEGORY_DELETE + '?category_id=' + id, { method: 'DELETE' }); if (!response) return; if (!response.ok) throw new Error('删除失败'); showToast('删除成功'); const cats = await loadSellerCategories(); if (cats) { shopState.seller.categories = cats; renderSellerCategories(cats); renderSellerCategoryChips(); } } catch (err) { showToast(err.message); } } }));
  }
  function renderSellerCategoryChips() {
    const container = el.querySelector('#sellerProductCategoryList'); if (!container) return;
    const categories = shopState.seller.categories || [];
    container.innerHTML = categories.map(c => \`<button class="category-chip \${shopState.seller.selectedCategory == c.category_id ? 'active' : ''}" data-category="\${c.category_id}">\${escapeHtml(c.name)}</button>\`).join('');
    container.querySelectorAll('.category-chip').forEach(btn => btn.addEventListener('click', () => { container.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active')); btn.classList.add('active'); const allChip = el.querySelector('#sellerProductAllCat'); if (allChip) allChip.classList.remove('active'); shopState.seller.selectedCategory = btn.dataset.category; loadSellerProducts(true); }));
  }

  async function openSellerStore(sellerId, sellerName = null) {
    const state = shopState.sellerStore;
    state.sellerId = sellerId; state.currentCategory = 'all'; state.currentPage = 1; state.hasMore = true; state.searchQuery = ''; state.sortBy = 'sort'; state.sortOrder = 'asc';
    el.querySelector('#clientView').style.display = 'none'; el.querySelector('#sellerView').style.display = 'none'; el.querySelector('#sellerStoreView').style.display = 'block';
    const subtitle = el.querySelector('#pageSubtitle'); if (subtitle) subtitle.textContent = sellerName ? sellerName + '的店铺' : '店铺主页';
    await loadSellerStoreInfo(sellerId); await loadSellerStoreCategories(sellerId); await loadSellerStoreProducts(true);
  }
  async function loadSellerStoreInfo(sellerId) { try { const response = await window.fetchWithAuth(API.SELLER_BASE + '?seller_id=' + sellerId); if (!response) return; const data = await response.json(); shopState.sellerStore.sellerInfo = data; const coverImg = el.querySelector('#storeCoverImg'); const coverIcon = el.querySelector('#storeCoverIcon'); const nameEl = el.querySelector('#storeName'); const descEl = el.querySelector('#storeDesc'); if (coverImg && coverIcon) { if (data.cover_url) { coverImg.src = data.cover_url; coverImg.style.display = 'block'; coverIcon.style.display = 'none'; } else { coverImg.style.display = 'none'; coverIcon.style.display = 'block'; } } if (nameEl) nameEl.textContent = data.name || '未知店铺'; if (descEl) descEl.textContent = data.description || '暂无简介'; } catch (err) {} }
  async function loadSellerStoreCategories(sellerId) { try { const response = await window.fetchWithAuth(API.CATEGORY_LIST + '?seller_id=' + sellerId); if (!response) return; const data = await response.json(); const categories = Array.isArray(data) ? data : []; shopState.sellerStore.categories = categories; const categoryList = el.querySelector('#storeCategoryList'); const categoryCount = el.querySelector('#storeCategoryCount'); if (categoryCount) categoryCount.textContent = categories.length; if (categoryList) { let html = ''; categories.forEach(c => html += \`<button class="category-chip" data-category="\${c.category_id}">\${escapeHtml(c.name)}</button>\`); categoryList.innerHTML = html; categoryList.querySelectorAll('.category-chip').forEach(btn => btn.addEventListener('click', () => { categoryList.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active')); btn.classList.add('active'); el.querySelector('.category-chip[data-category="all"]').classList.remove('active'); shopState.sellerStore.currentCategory = btn.dataset.category; loadSellerStoreProducts(true); })); const allChip = el.querySelector('.category-chip[data-category="all"]'); if (allChip) allChip.addEventListener('click', () => { categoryList.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active')); allChip.classList.add('active'); shopState.sellerStore.currentCategory = 'all'; loadSellerStoreProducts(true); }); } } catch (err) {} }
  async function loadSellerStoreProducts(reset = false) {
    const state = shopState.sellerStore; if (state.isLoading) return;
    if (reset) { state.currentPage = 1; state.hasMore = true; const grid = el.querySelector('#storeProductGrid'); if (grid) grid.innerHTML = ''; const empty = el.querySelector('#storeEmptyState'); if (empty) empty.style.display = 'none'; const loading = el.querySelector('#storeLoadingIndicator'); if (loading) loading.style.display = 'flex'; const gridContainer = el.querySelector('#storeProductGrid'); if (gridContainer) gridContainer.style.display = 'none'; const loadMore = el.querySelector('#storeLoadMoreIndicator'); if (loadMore) loadMore.style.display = 'none'; }
    if (!state.hasMore) return; state.isLoading = true; const loadMore = el.querySelector('#storeLoadMoreIndicator'); if (loadMore && !reset) loadMore.style.display = 'block';
    if (state.searchController) state.searchController.abort(); const controller = new AbortController(); state.searchController = controller;
    const params = new URLSearchParams(); params.append('seller_id', state.sellerId); params.append('is_up', '1');
    if (state.currentCategory !== 'all') params.append('category_id', state.currentCategory);
    if (state.searchQuery) params.append('name', state.searchQuery);
    params.append('sort_by', state.sortBy); params.append('sort_order', state.sortOrder);
    params.append('page', state.currentPage); params.append('page_size', state.pageSize);
    try {
      const response = await window.fetchWithAuth(API.PRODUCT_LIST + '?' + params.toString(), { signal: controller.signal });
      if (!response) { resetStoreLoadingState(); return; }
      if (controller !== state.searchController) return;
      const data = await response.json(); const items = data.items || []; const total = data.total || 0;
      state.pageSize = data.page_size || 20; state.totalPages = Math.ceil(total / state.pageSize);
      const current = data.page || state.currentPage;
      const productCount = el.querySelector('#storeProductCount'); if (productCount) productCount.textContent = total;
      if (reset && items.length === 0) { showStoreEmptyState(); resetStoreLoadingState(); return; }
      if (items.length > 0) { renderProductCards(el.querySelector('#storeProductGrid'), items); state.currentPage = current + 1; state.hasMore = state.currentPage <= state.totalPages; } else { state.hasMore = false; }
      if (reset) { const grid = el.querySelector('#storeProductGrid'); if (grid) grid.style.display = 'grid'; const loading = el.querySelector('#storeLoadingIndicator'); if (loading) loading.style.display = 'none'; }
      if (loadMore) loadMore.style.display = (!reset && state.hasMore) ? 'block' : 'none';
    } catch (err) { if (err.name !== 'AbortError') showToast('加载商品失败：' + err.message); resetStoreLoadingState(); }
    finally { if (controller === state.searchController) { state.isLoading = false; state.searchController = null; } }
  }
  function showStoreEmptyState() { const empty = el.querySelector('#storeEmptyState'); const grid = el.querySelector('#storeProductGrid'); if (empty) empty.style.display = 'block'; if (grid) grid.style.display = 'none'; }
  function resetStoreLoadingState() { const loading = el.querySelector('#storeLoadingIndicator'); const grid = el.querySelector('#storeProductGrid'); if (loading) loading.style.display = 'none'; if (grid) grid.style.display = 'grid'; }
  function backToClient() { el.querySelector('#sellerStoreView').style.display = 'none'; el.querySelector('#clientView').style.display = 'block'; el.querySelector('#pageSubtitle').textContent = '浏览精选商品'; shopState.sellerStore.sellerId = null; shopState.sellerStore.sellerInfo = null; loadProducts(true); }

  async function openProductEdit(productId = null) {
    const modal = el.querySelector('#productEditModal'); const title = el.querySelector('#productEditTitle'); const error = el.querySelector('#productEditError');
    if (error) error.textContent = '';
    let productIdInput = el.querySelector('#editProductId'); if (!productIdInput) { productIdInput = document.createElement('input'); productIdInput.type = 'hidden'; productIdInput.id = 'editProductId'; productIdInput.name = 'product_id'; modal.querySelector('.modal-body').prepend(productIdInput); }
    const categorySelect = el.querySelector('#editCategory'); if (categorySelect) { categorySelect.innerHTML = '<option value="">请选择分类</option>'; shopState.seller.categories.forEach(c => { const opt = document.createElement('option'); opt.value = c.category_id; opt.textContent = escapeHtml(c.name); categorySelect.appendChild(opt); }); }
    if (productId) {
      if (title) title.textContent = '编辑商品';
      try {
        const response = await window.fetchWithAuth(API.PRODUCT_INFO + '?product_id=' + productId); if (!response) throw new Error('获取商品信息失败');
        const product = await response.json();
        productIdInput.value = product.product_id; if (el.querySelector('#editCategory')) el.querySelector('#editCategory').value = product.category_id;
        if (el.querySelector('#editProductName')) el.querySelector('#editProductName').value = product.name || ''; if (el.querySelector('#editProductDesc')) el.querySelector('#editProductDesc').value = product.description || '';
        if (el.querySelector('#editExchangeWay')) el.querySelector('#editExchangeWay').value = product.exchange_way || ''; if (el.querySelector('#editPrice')) el.querySelector('#editPrice').value = product.price || '';
        if (el.querySelector('#editPriceOrigin')) el.querySelector('#editPriceOrigin').value = product.price_origin || ''; if (el.querySelector('#editStock')) el.querySelector('#editStock').value = product.stock || '';
        if (el.querySelector('#editSort')) el.querySelector('#editSort').value = product.sort || 80; if (el.querySelector('#editTimeStart')) el.querySelector('#editTimeStart').value = product.time_start ? product.time_start.slice(0, 16) : ''; if (el.querySelector('#editTimeEnd')) el.querySelector('#editTimeEnd').value = product.time_end ? product.time_end.slice(0, 16) : '';
        const toggle = el.querySelector('#editIsUpToggle'); const hidden = el.querySelector('#editIsUp'); if (toggle && hidden) { if (product.is_up) { toggle.classList.add('active'); hidden.value = '1'; } else { toggle.classList.remove('active'); hidden.value = '0'; } }
        const coverUrl = product.cover_url || ''; const coverImage = el.querySelector('#productCoverImage'); const coverPlaceholder = el.querySelector('#productCoverPlaceholder'); const deleteCoverBtn = el.querySelector('#deleteProductCoverBtn'); const coverFileId = el.querySelector('#productCoverFileId');
        if (coverUrl) { if (coverImage) { coverImage.src = coverUrl; coverImage.style.display = 'block'; } if (coverPlaceholder) coverPlaceholder.style.display = 'none'; if (deleteCoverBtn) deleteCoverBtn.style.display = 'inline-block'; if (coverFileId) coverFileId.value = product.cover || ''; }
        else { if (coverImage) coverImage.style.display = 'none'; if (coverPlaceholder) coverPlaceholder.style.display = 'flex'; if (deleteCoverBtn) deleteCoverBtn.style.display = 'none'; if (coverFileId) coverFileId.value = ''; }
        modal.classList.add('show');
      } catch (err) { showToast(err.message); }
    } else {
      if (title) title.textContent = '新增商品'; productIdInput.value = '';
      if (el.querySelector('#editCategory')) el.querySelector('#editCategory').value = ''; if (el.querySelector('#editProductName')) el.querySelector('#editProductName').value = '';
      if (el.querySelector('#editProductDesc')) el.querySelector('#editProductDesc').value = ''; if (el.querySelector('#editExchangeWay')) el.querySelector('#editExchangeWay').value = '';
      if (el.querySelector('#editPrice')) el.querySelector('#editPrice').value = ''; if (el.querySelector('#editPriceOrigin')) el.querySelector('#editPriceOrigin').value = '';
      if (el.querySelector('#editStock')) el.querySelector('#editStock').value = ''; if (el.querySelector('#editSort')) el.querySelector('#editSort').value = '80';
      if (el.querySelector('#editTimeStart')) el.querySelector('#editTimeStart').value = ''; if (el.querySelector('#editTimeEnd')) el.querySelector('#editTimeEnd').value = '';
      const toggle = el.querySelector('#editIsUpToggle'); const hidden = el.querySelector('#editIsUp'); if (toggle && hidden) { toggle.classList.remove('active'); hidden.value = '0'; }
      if (el.querySelector('#productCoverImage')) el.querySelector('#productCoverImage').style.display = 'none'; if (el.querySelector('#productCoverPlaceholder')) el.querySelector('#productCoverPlaceholder').style.display = 'flex';
      if (el.querySelector('#deleteProductCoverBtn')) el.querySelector('#deleteProductCoverBtn').style.display = 'none'; if (el.querySelector('#productCoverFileId')) el.querySelector('#productCoverFileId').value = '';
      modal.classList.add('show');
    }
  }
  function bindToggleEvents() { const toggle = el.querySelector('#editIsUpToggle'); const hidden = el.querySelector('#editIsUp'); if (toggle && hidden) { toggle.addEventListener('click', () => { toggle.classList.toggle('active'); hidden.value = toggle.classList.contains('active') ? '1' : '0'; }); } }
  function openCategoryEdit(category = null) {
    const modal = el.querySelector('#categoryEditModal'); const title = el.querySelector('#categoryEditTitle'); const error = el.querySelector('#categoryEditError'); if (error) error.textContent = '';
    if (category) { if (title) title.textContent = '编辑分类'; if (el.querySelector('#editCategoryId')) el.querySelector('#editCategoryId').value = category.category_id; if (el.querySelector('#editCategoryName')) el.querySelector('#editCategoryName').value = category.name || ''; if (el.querySelector('#editCategorySort')) el.querySelector('#editCategorySort').value = category.sort || 80; }
    else { if (title) title.textContent = '新增分类'; if (el.querySelector('#editCategoryId')) el.querySelector('#editCategoryId').value = ''; if (el.querySelector('#editCategoryName')) el.querySelector('#editCategoryName').value = ''; if (el.querySelector('#editCategorySort')) el.querySelector('#editCategorySort').value = '80'; }
    modal.classList.add('show');
  }
  async function submitProductEdit() {
    const productIdInput = el.querySelector('#editProductId'); const productId = productIdInput?.value ? parseInt(productIdInput.value) : null;
    const categoryId = el.querySelector('#editCategory')?.value; const name = el.querySelector('#editProductName')?.value.trim();
    const description = el.querySelector('#editProductDesc')?.value.trim() || null; const exchangeWay = el.querySelector('#editExchangeWay')?.value.trim() || null;
    const price = parseInt(el.querySelector('#editPrice')?.value); const priceOrigin = el.querySelector('#editPriceOrigin')?.value ? parseInt(el.querySelector('#editPriceOrigin').value) : null;
    const stock = parseInt(el.querySelector('#editStock')?.value); const sort = parseInt(el.querySelector('#editSort')?.value) || 80;
    const timeStart = el.querySelector('#editTimeStart')?.value || null; const timeEnd = el.querySelector('#editTimeEnd')?.value || null;
    const isUp = el.querySelector('#editIsUp')?.value === '1'; const cover = el.querySelector('#productCoverFileId')?.value || null;
    const error = el.querySelector('#productEditError'); const submitBtn = el.querySelector('#productEditSubmit');
    if (!categoryId) { if (error) error.textContent = '请选择分类'; return; } if (!name) { if (error) error.textContent = '请输入商品名称'; return; }
    if (isNaN(price) || price < 1 || price > 50000) { if (error) error.textContent = '价格必须为 1-50000'; return; }
    if (isNaN(stock) || stock < 1 || stock > 5000) { if (error) error.textContent = '库存必须为 1-5000'; return; }
    if (isNaN(sort) || sort < 1 || sort > 100) { if (error) error.textContent = '排序必须为 1-100'; return; }
    if (!productId && !cover) { if (error) error.textContent = '请上传商品封面图片'; return; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...'; }
    try {
      const body = { product_id: productId, category_id: parseInt(categoryId), cover: cover, name: name, description: description, exchange_way: exchangeWay, price: price, price_origin: priceOrigin, stock: stock, is_up: isUp, time_start: timeStart, time_end: timeEnd, sort: sort };
      const response = await window.fetchWithAuth(API.PRODUCT_CREATE, { method: 'POST', body: JSON.stringify(body) }); if (!response) throw new Error('请求失败'); if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || '保存失败'); }
      showToast('保存成功'); el.querySelector('#productEditModal')?.classList.remove('show'); loadSellerProducts(true); loadProducts(true);
    } catch (err) { if (error) error.textContent = err.message; showToast(err.message); } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '保存'; } }
  }
  async function submitCategoryEdit() {
    const categoryId = el.querySelector('#editCategoryId')?.value || null; const name = el.querySelector('#editCategoryName')?.value.trim(); const sort = parseInt(el.querySelector('#editCategorySort')?.value) || 80;
    const error = el.querySelector('#categoryEditError'); const submitBtn = el.querySelector('#categoryEditSubmit');
    if (!name) { if (error) error.textContent = '请输入分类名称'; return; } if (isNaN(sort) || sort < 1 || sort > 100) { if (error) error.textContent = '排序必须为 1-100'; return; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...'; }
    try { let url, method, body; if (categoryId) { url = API.CATEGORY_SORT + '?category_id=' + categoryId + '&sort=' + sort; method = 'PUT'; body = { category_id: parseInt(categoryId), sort: sort }; } else { url = API.CATEGORY_CREATE; method = 'POST'; body = { name: name, sort: sort }; }
      const response = await window.fetchWithAuth(url, { method: method, body: JSON.stringify(body) }); if (!response) throw new Error('请求失败'); if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || '保存失败'); }
      showToast('保存成功'); el.querySelector('#categoryEditModal')?.classList.remove('show'); const cats = await loadSellerCategories(); if (cats) { shopState.seller.categories = cats; renderSellerCategories(cats); renderSellerCategoryChips(); } } catch (err) { if (error) error.textContent = err.message; showToast(err.message); } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '保存'; } }
  }
  async function submitSellerApply() { const name = el.querySelector('#applyName')?.value.trim(); const description = el.querySelector('#applyDescription')?.value.trim(); const cover = el.querySelector('#applyCoverFileId')?.value || null; const error = el.querySelector('#applyError'); const submitBtn = el.querySelector('#applySubmit'); if (!name) { if (error) error.textContent = '请输入店铺名称'; return; } if (!description) { if (error) error.textContent = '请输入店铺简介'; return; } if (!cover) { if (error) error.textContent = '请上传店铺封面图片'; return; } if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...'; } try { const response = await window.fetchWithAuth(API.SELLER_APPLY, { method: 'POST', body: JSON.stringify({ name: name, description: description, cover: cover }) }); if (!response) throw new Error('请求失败'); if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || '申请失败'); } showToast('申请已提交，请等待审核'); el.querySelector('#applyModal')?.classList.remove('show'); checkSellerStatus(); } catch (err) { if (error) error.textContent = err.message; showToast(err.message); } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '提交申请'; } } }
  async function submitSellerEdit() { const name = el.querySelector('#editSellerName')?.value.trim(); const description = el.querySelector('#editSellerDescription')?.value.trim(); const cover = el.querySelector('#sellerEditCoverFileId')?.value || null; const error = el.querySelector('#sellerEditError'); const submitBtn = el.querySelector('#sellerEditSubmit'); if (!name) { if (error) error.textContent = '请输入店铺名称'; return; } if (!description) { if (error) error.textContent = '请输入店铺简介'; return; } if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...'; } try { const response = await window.fetchWithAuth(API.SELLER_UPDATE, { method: 'POST', body: JSON.stringify({ name: name, description: description, cover: cover }) }); if (!response) throw new Error('请求失败'); if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || '更新失败'); } showToast('保存成功'); el.querySelector('#sellerEditModal')?.classList.remove('show'); loadSellerInfo().then(info => { shopState.seller.sellerInfo = info; renderSellerHeader(info); }); loadProducts(true); } catch (err) { if (error) error.textContent = err.message; showToast(err.message); } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '保存'; } } }
  async function openSellerEditModal() { const modal = el.querySelector('#sellerEditModal'); const sellerInfo = shopState.seller.sellerInfo; if (!modal || !sellerInfo) return; if (el.querySelector('#editSellerName')) el.querySelector('#editSellerName').value = sellerInfo.name || ''; if (el.querySelector('#editSellerDescription')) el.querySelector('#editSellerDescription').value = sellerInfo.description || ''; const coverUrl = sellerInfo.cover_url || ''; const coverImage = el.querySelector('#sellerEditCoverImage'); const coverPlaceholder = el.querySelector('#sellerEditCoverPlaceholder'); const deleteCoverBtn = el.querySelector('#deleteSellerCoverBtn'); const coverFileId = el.querySelector('#sellerEditCoverFileId'); if (coverUrl) { if (coverImage) { coverImage.src = coverUrl; coverImage.style.display = 'block'; } if (coverPlaceholder) coverPlaceholder.style.display = 'none'; if (deleteCoverBtn) deleteCoverBtn.style.display = 'inline-block'; if (coverFileId) coverFileId.value = sellerInfo.cover || ''; } else { if (coverImage) coverImage.style.display = 'none'; if (coverPlaceholder) coverPlaceholder.style.display = 'flex'; if (deleteCoverBtn) deleteCoverBtn.style.display = 'none'; if (coverFileId) coverFileId.value = ''; } const error = el.querySelector('#sellerEditError'); if (error) error.textContent = ''; modal.classList.add('show'); }

  function switchToClient() { shopState.currentView = 'client'; el.querySelector('#clientView').style.display = 'block'; el.querySelector('#sellerView').style.display = 'none'; el.querySelector('#sellerStoreView').style.display = 'none'; el.querySelector('#pageSubtitle').textContent = '浏览精选商品'; const toggleBtn = el.querySelector('#viewToggleBtn'); if (toggleBtn) toggleBtn.classList.remove('active'); const defaultSortChip = el.querySelector('.sort-chip[data-sort="sort"]'); if (defaultSortChip) { defaultSortChip.classList.add('active'); const priceChip = el.querySelector('.sort-chip[data-sort="price"]'); const salesChip = el.querySelector('.sort-chip[data-sort="sales"]'); if (priceChip) priceChip.classList.remove('active'); if (salesChip) salesChip.classList.remove('active'); } loadProducts(true); }
  function switchToSeller() { shopState.currentView = 'seller'; el.querySelector('#clientView').style.display = 'none'; el.querySelector('#sellerView').style.display = 'block'; el.querySelector('#sellerStoreView').style.display = 'none'; el.querySelector('#pageSubtitle').textContent = '管理您的店铺'; const toggleBtn = el.querySelector('#viewToggleBtn'); if (toggleBtn) toggleBtn.classList.add('active'); checkSellerStatus(); }
  async function checkSellerStatus() { const sellerInfo = await loadSellerInfo(); shopState.seller.sellerInfo = sellerInfo; const applyPrompt = el.querySelector('#applyPrompt'); const sellerPanel = el.querySelector('#sellerPanel'); const currentCarrot = window.currentUser?.carrot || 0; if (!sellerInfo || sellerInfo.status === 'default') { if (applyPrompt) { applyPrompt.style.display = 'flex'; const promptP = applyPrompt.querySelector('p'); const applyBtn = applyPrompt.querySelector('#applySellerBtn'); const warningP = applyPrompt.querySelectorAll('p')[1]; if (currentCarrot < 3000) { if (promptP) promptP.textContent = '当前萝卜不足 3000，无法申请'; if (applyBtn) applyBtn.style.display = 'none'; } else { if (promptP) promptP.textContent = '申请成为商户，创建您的专属店铺'; if (applyBtn) applyBtn.style.display = 'inline-block'; if (warningP) { warningP.innerHTML = '<i class="fas fa-exclamation-circle" style="margin-right: 4px;"></i>申请时将扣除 3000 萝卜'; warningP.style.color = 'var(--warning-color)'; } } } if (sellerPanel) sellerPanel.style.display = 'none'; } else if (sellerInfo.status === 'examine') { if (applyPrompt) { applyPrompt.style.display = 'flex'; const promptP = applyPrompt.querySelector('p'); if (promptP) promptP.textContent = '申请审核中，请耐心等待...'; const applyBtn = applyPrompt.querySelector('#applySellerBtn'); if (applyBtn) applyBtn.style.display = 'none'; } if (sellerPanel) sellerPanel.style.display = 'none'; } else if (sellerInfo.status === 'disable') { if (applyPrompt) { applyPrompt.style.display = 'flex'; const promptP = applyPrompt.querySelector('p'); if (promptP) promptP.textContent = '申请被拒绝，请联系管理员'; const applyBtn = applyPrompt.querySelector('#applySellerBtn'); if (applyBtn) applyBtn.style.display = 'inline-block'; } if (sellerPanel) sellerPanel.style.display = 'none'; } else if (sellerInfo.status === 'pass') { if (applyPrompt) applyPrompt.style.display = 'none'; if (sellerPanel) sellerPanel.style.display = 'block'; renderSellerHeader(sellerInfo); loadSellerCategories().then(cats => { shopState.seller.categories = cats; renderSellerCategories(cats); renderSellerCategoryChips(); }); loadSellerProducts(true); } }

  let qrCodeLoaded = false;
  function loadQRCodeLibrary() { return new Promise((resolve, reject) => { if (window.QRCode) { resolve(); return; } const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'; script.onload = () => resolve(); script.onerror = () => reject(new Error('QRCode 库加载失败')); document.head.appendChild(script); }); }
  function getShareUrl() { const sellerStore = shopState.sellerStore; if (!sellerStore.sellerId) return ''; return \`\${window.location.origin}/shop/\${sellerStore.sellerId}\`; }
  async function showShareModal() { let shareUrl = ''; if (shopState.sellerStore.sellerId) { shareUrl = \`\${window.location.origin}/shop/\${shopState.sellerStore.sellerId}\`; } else if (shopState.seller.sellerInfo && shopState.seller.sellerInfo.seller_id) { shareUrl = \`\${window.location.origin}/shop/\${shopState.seller.sellerInfo.seller_id}\`; } if (!shareUrl) { showToast('无法获取店铺信息'); return; } const linkInput = el.querySelector('#shareLinkInput'); if (linkInput) linkInput.value = shareUrl; try { await loadQRCodeLibrary(); const canvas = el.querySelector('#qrcodeCanvas'); if (canvas && window.QRCode) { canvas.width = 200; canvas.height = 200; await window.QRCode.toCanvas(canvas, shareUrl, { width: 200, margin: 1 }); } } catch (err) { showToast('二维码生成失败'); } const modal = el.querySelector('#shareModal'); if (modal) modal.classList.add('show'); }

  function bindEvents() {
    el.addEventListener('click', e => {
      const closeBtn = e.target.closest('.btn-icon'); if (closeBtn && closeBtn.closest('.modal-overlay')) { closeBtn.closest('.modal-overlay').classList.remove('show'); return; }
      const cancelBtn = e.target.closest('[id$="Cancel"]'); if (cancelBtn && cancelBtn.closest('.modal-overlay')) { cancelBtn.closest('.modal-overlay').classList.remove('show'); return; }
      if (e.target.closest('#detailCartBtn')) { const modal = el.querySelector('#productDetailModal'); if (modal) { const productId = modal.dataset.productId; const nameEl = modal.querySelector('#detailName'); const priceEl = modal.querySelector('#detailPrice'); const coverImg = modal.querySelector('#detailCoverImage'); if (productId && nameEl && priceEl) addToCart({ product_id: productId, name: nameEl.textContent, price: parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')), cover_url: coverImg?.src || '' }); modal.classList.remove('show'); } return; }
      if (e.target.closest('#clearCartBtn')) { if (confirm('确定要清空购物车吗？')) { clearCart(); renderCartList(); } return; }
      if (e.target.closest('#checkoutBtn')) { if (shopState.cart.length === 0) { showToast('购物车为空'); return; } (async () => { let hasError = false; let errorMsg = ''; for (const item of shopState.cart) { try { await createOrder(item.product_id, item.quantity, null); } catch (err) { hasError = true; errorMsg = err.message || '订单创建失败'; break; } } if (!hasError) { showToast('全部订单已创建'); renderCartList(); } else { showToast(errorMsg); } })(); return; }
    });
    el.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); }));
    const viewToggleBtn = el.querySelector('#viewToggleBtn'); if (viewToggleBtn) viewToggleBtn.addEventListener('click', () => { shopState.currentView === 'client' ? switchToSeller() : switchToClient(); });
    el.addEventListener('click', e => {
      const sortChip = e.target.closest('#clientView .sort-chip'); if (!sortChip) return;
      const sort = sortChip.dataset.sort; if (sortChip.classList.contains('active')) { const newOrder = shopState.client.sortOrder === 'asc' ? 'desc' : 'asc'; shopState.client.sortOrder = newOrder; if (sort === 'price') sortChip.textContent = '价格' + (newOrder === 'asc' ? '↑' : '↓'); else if (sort === 'sales') sortChip.textContent = '销量' + (newOrder === 'asc' ? '↑' : '↓'); else sortChip.textContent = '默认'; sortChip.dataset.order = newOrder; } else { el.querySelectorAll('#clientView .sort-chip').forEach(c => c.classList.remove('active')); sortChip.classList.add('active'); shopState.client.sortBy = sort; shopState.client.sortOrder = 'asc'; if (sort === 'price') { sortChip.textContent = '价格↑'; sortChip.dataset.order = 'asc'; } else if (sort === 'sales') { shopState.client.sortOrder = 'desc'; sortChip.textContent = '销量↓'; sortChip.dataset.order = 'desc'; } else { sortChip.textContent = '默认'; sortChip.dataset.order = 'asc'; } } loadProducts(true);
    });
    const clientSearch = el.querySelector('#clientSearch'); const clientSearchBtn = el.querySelector('#clientSearchBtn'); const debouncedSearch = window.debounce(() => { shopState.client.searchQuery = clientSearch?.value.trim() || ''; loadProducts(true); }, 500);
    if (clientSearch) { clientSearch.addEventListener('input', debouncedSearch); clientSearch.addEventListener('keypress', e => { if (e.key === 'Enter') { debouncedSearch.cancel(); shopState.client.searchQuery = clientSearch.value.trim(); loadProducts(true); } }); }
    if (clientSearchBtn) clientSearchBtn.addEventListener('click', () => { debouncedSearch.cancel(); shopState.client.searchQuery = clientSearch?.value.trim() || ''; loadProducts(true); });
    window.addEventListener('scroll', () => { if (shopState.currentView !== 'client') return; const state = shopState.client; if (state.isLoading || !state.hasMore) return; if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200) loadProducts(); });
    el.addEventListener('click', e => {
      if (e.target.closest('.seller-tab')) { const tab = e.target.closest('.seller-tab'); el.querySelectorAll('.seller-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); const tabName = tab.dataset.tab; const tabMap = { 'product': 'sellerProductTab', 'category': 'sellerCategoryTab' }; Object.values(tabMap).forEach(panelId => { const panel = el.querySelector('#' + panelId); if (panel) panel.style.display = 'none'; }); const targetPanel = el.querySelector('#' + tabMap[tabName]); if (targetPanel) targetPanel.style.display = 'block'; if (tabName === 'product') renderSellerCategoryChips(); }
    });
    const addProductBtn = el.querySelector('#addProductBtn'); if (addProductBtn) addProductBtn.addEventListener('click', () => openProductEdit());
    const addCategoryBtn = el.querySelector('#addCategoryBtn'); if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => openCategoryEdit());
    const applySellerBtn = el.querySelector('#applySellerBtn'); if (applySellerBtn) applySellerBtn.addEventListener('click', () => { el.querySelector('#applyModal').classList.add('show'); });
    const editSellerBtn = el.querySelector('#editSellerBtn'); if (editSellerBtn) editSellerBtn.addEventListener('click', () => openSellerEditModal());
    const setupImageUpload = (uploadBtn, fileInput, previewImg, placeholder, deleteBtn, fileIdInput, submitBtn = null) => { if (uploadBtn && fileInput) { uploadBtn.addEventListener('click', () => fileInput.click()); fileInput.addEventListener('change', async () => { if (fileInput.files.length === 0) return; let originalBtnText = ''; if (submitBtn) { originalBtnText = submitBtn.innerHTML; submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...'; } try { const fileId = await uploadImage(fileInput.files[0]); if (fileId && fileIdInput) { fileIdInput.value = fileId; previewImg.src = URL.createObjectURL(fileInput.files[0]); previewImg.style.display = 'block'; placeholder.style.display = 'none'; deleteBtn.style.display = 'inline-block'; } } catch (err) { console.error('上传异常:', err); } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; } fileInput.value = ''; } }); } if (deleteBtn) deleteBtn.addEventListener('click', () => { if (fileIdInput) fileIdInput.value = ''; previewImg.style.display = 'none'; placeholder.style.display = 'flex'; deleteBtn.style.display = 'none'; }); };
    setupImageUpload(el.querySelector('#uploadProductCoverBtn'), el.querySelector('#productCoverFileInput'), el.querySelector('#productCoverImage'), el.querySelector('#productCoverPlaceholder'), el.querySelector('#deleteProductCoverBtn'), el.querySelector('#productCoverFileId'), el.querySelector('#productEditSubmit'));
    setupImageUpload(el.querySelector('#uploadApplyCoverBtn'), el.querySelector('#applyCoverFileInput'), el.querySelector('#applyCoverImage'), el.querySelector('#applyCoverPlaceholder'), el.querySelector('#deleteApplyCoverBtn'), el.querySelector('#applyCoverFileId'), el.querySelector('#applySubmit'));
    setupImageUpload(el.querySelector('#uploadSellerCoverBtn'), el.querySelector('#sellerCoverFileInput'), el.querySelector('#sellerEditCoverImage'), el.querySelector('#sellerEditCoverPlaceholder'), el.querySelector('#deleteSellerCoverBtn'), el.querySelector('#sellerEditCoverFileId'), el.querySelector('#sellerEditSubmit'));
    el.querySelector('#productEditSubmit')?.addEventListener('click', submitProductEdit);
    el.querySelector('#categoryEditSubmit')?.addEventListener('click', submitCategoryEdit);
    el.querySelector('#applySubmit')?.addEventListener('click', submitSellerApply);
    el.querySelector('#sellerEditSubmit')?.addEventListener('click', submitSellerEdit);
    const sellerProductSearch = el.querySelector('#sellerProductSearch'); const sellerProductSearchBtn = el.querySelector('#sellerProductSearchBtn');
    if (sellerProductSearch && sellerProductSearchBtn) { sellerProductSearchBtn.addEventListener('click', () => { shopState.seller.searchQuery = sellerProductSearch.value.trim(); loadSellerProducts(true); }); sellerProductSearch.addEventListener('keypress', e => { if (e.key === 'Enter') { shopState.seller.searchQuery = sellerProductSearch.value.trim(); loadSellerProducts(true); } }); }
    bindToggleEvents();
    const cartFloatBtn = el.querySelector('#cartFloatBtn'); if (cartFloatBtn) cartFloatBtn.addEventListener('click', () => { renderCartList(); el.querySelector('#cartModal')?.classList.add('show'); });
    const closeCartModal = el.querySelector('#closeCartModal'); if (closeCartModal) closeCartModal.addEventListener('click', () => { el.querySelector('#cartModal')?.classList.remove('show'); });
    const sellerStoreBackBtn = el.querySelector('#sellerStoreBackBtn'); if (sellerStoreBackBtn) sellerStoreBackBtn.addEventListener('click', () => { backToClient(); });
    const storeSearch = el.querySelector('#storeSearch'); const storeSearchBtn = el.querySelector('#storeSearchBtn'); const storeDebouncedSearch = window.debounce(() => { shopState.sellerStore.searchQuery = storeSearch?.value.trim() || ''; loadSellerStoreProducts(true); }, 500);
    if (storeSearch) { storeSearch.addEventListener('input', storeDebouncedSearch); storeSearch.addEventListener('keypress', e => { if (e.key === 'Enter') { storeDebouncedSearch.cancel(); shopState.sellerStore.searchQuery = storeSearch.value.trim(); loadSellerStoreProducts(true); } }); }
    if (storeSearchBtn) storeSearchBtn.addEventListener('click', () => { storeDebouncedSearch.cancel(); shopState.sellerStore.searchQuery = storeSearch?.value.trim() || ''; loadSellerStoreProducts(true); });
    el.addEventListener('click', e => {
      const storeSortChip = e.target.closest('#sellerStoreView .sort-chip'); if (!storeSortChip) return;
      const sort = storeSortChip.dataset.sort; if (storeSortChip.classList.contains('active')) { const newOrder = shopState.sellerStore.sortOrder === 'asc' ? 'desc' : 'asc'; shopState.sellerStore.sortOrder = newOrder; if (sort === 'price') storeSortChip.textContent = '价格' + (newOrder === 'asc' ? '↑' : '↓'); else if (sort === 'sales') storeSortChip.textContent = '销量' + (newOrder === 'asc' ? '↑' : '↓'); else storeSortChip.textContent = '默认'; storeSortChip.dataset.order = newOrder; } else { el.querySelectorAll('#sellerStoreView .sort-chip').forEach(c => c.classList.remove('active')); storeSortChip.classList.add('active'); shopState.sellerStore.sortBy = sort; shopState.sellerStore.sortOrder = 'asc'; if (sort === 'price') { storeSortChip.textContent = '价格↑'; storeSortChip.dataset.order = 'asc'; } else if (sort === 'sales') { shopState.sellerStore.sortOrder = 'desc'; storeSortChip.textContent = '销量↓'; storeSortChip.dataset.order = 'desc'; } else { storeSortChip.textContent = '默认'; storeSortChip.dataset.order = 'asc'; } } loadSellerStoreProducts(true);
    });
    window.addEventListener('scroll', () => { if (el.querySelector('#sellerStoreView').style.display !== 'block') return; const state = shopState.sellerStore; if (state.isLoading || !state.hasMore) return; if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200) loadSellerStoreProducts(); });
    el.addEventListener('click', e => { const sellerInfoDiv = e.target.closest('#detailSellerInfo'); if (sellerInfoDiv) { const sellerId = sellerInfoDiv.dataset.sellerId; const sellerName = sellerInfoDiv.dataset.sellerName; if (sellerId) { el.querySelector('#productDetailModal').classList.remove('show'); openSellerStore(sellerId, sellerName); } } });
    const shareBtn = el.querySelector('#shareStoreBtn'); if (shareBtn) shareBtn.addEventListener('click', () => { if (shopState.sellerStore.sellerId) showShareModal(); else showToast('店铺信息未加载'); });
    const shareSellerBtn = el.querySelector('#shareSellerBtn'); if (shareSellerBtn) shareSellerBtn.addEventListener('click', () => { if (shopState.seller.sellerInfo && shopState.seller.sellerInfo.seller_id) showShareModal(); else showToast('请先申请成为商户'); });
    const copyLinkBtn = el.querySelector('#copyLinkBtn'); if (copyLinkBtn) copyLinkBtn.addEventListener('click', () => { const linkInput = el.querySelector('#shareLinkInput'); if (linkInput && linkInput.value) { navigator.clipboard.writeText(linkInput.value).then(() => showToast('链接已复制')).catch(() => showToast('复制失败')); } });
    const closeShareModal = el.querySelector('#closeShareModal'); const closeShareModalBtn = el.querySelector('#closeShareModalBtn');
    if (closeShareModal) closeShareModal.addEventListener('click', () => { el.querySelector('#shareModal').classList.remove('show'); });
    if (closeShareModalBtn) closeShareModalBtn.addEventListener('click', () => { el.querySelector('#shareModal').classList.remove('show'); });
    const sellerProductAllCat = el.querySelector('#sellerProductAllCat'); if (sellerProductAllCat) sellerProductAllCat.addEventListener('click', () => { el.querySelectorAll('#sellerProductCategoryList .category-chip').forEach(c => c.classList.remove('active')); sellerProductAllCat.classList.add('active'); shopState.seller.selectedCategory = 'all'; loadSellerProducts(true); });
  }

  async function uploadImage(file) { try { const fileId = await window.EmosUpload.uploadImage(file); showToast('图片上传成功'); return fileId; } catch (err) { showToast('图片上传失败：' + err.message); return null; } }

  function init() { el.innerHTML = renderStructure(); bindEvents(); loadCartFromStorage(); switchToClient(); }
  init();
  const onShow = (pathname) => { const pathParts = pathname.split('/').filter(Boolean); let sellerId = null; if (pathParts.length >= 2 && pathParts[0] === 'shop') sellerId = pathParts[1]; if (sellerId) openSellerStore(sellerId, null); else if (shopState.currentView === 'seller') checkSellerStatus(); else if (shopState.currentView === 'client') loadProducts(true); };
  const onHide = () => {};
  return { el, onShow, onHide };
}
`;

// ==================== 订单中心页面模块 ====================
const PAGE_ORDER_JS = `
export default async function OrderPage() {
  const el = document.createElement('div');
  const escapeHtml = window.escapeHtml;
  const showToast = window.showToast;
  const copyText = window.copyText;

  let _scrollHandler = null;
  let _keydownHandler = null;
  function resetLoadingState() { const l=el.querySelector('#loadingIndicator'); if(l)l.style.display='none'; }
  function showEmptyState() { const e=el.querySelector('#emptyState'),l=el.querySelector('#orderList'); if(e)e.style.display='block'; if(l)l.style.display='none'; }
  function updateLoadMore(show) { const m=el.querySelector('#loadMoreIndicator'); if(m)m.style.display=show?'block':'none'; }

  const API = { ORDER_LIST:'/api/shop/order/user/list', ORDER_CREATE:'/api/shop/order/user/create', ORDER_PAY:'/api/shop/order/user/pay', ORDER_CLOSE:'/api/shop/order/user/close', ORDER_URGE:'/api/shop/order/user/urge', ORDER_DELETE:'/api/shop/order/user/order', SHOP_ORDER_LIST:'/api/shop/order/shop/order', SHOP_ORDER_DELIVERY:'/api/shop/order/shop/delivery', SHOP_ORDER_REMARK:'/api/shop/order/shop/remark' };
  let orderState = { currentView:'user', user:{allOrders:[],filteredOrders:[],currentPage:1,pageSize:15,totalPages:1,isLoading:false,hasMore:true,currentFilter:'all',searchQuery:'',searchController:null}, shop:{allOrders:[],filteredOrders:[],currentPage:1,pageSize:10,totalPages:1,isLoading:false,hasMore:true,currentFilter:'all',searchQuery:'',searchController:null,userId:'',isPay:'',isDelivery:'',productId:''} };
  function getOrderStatus(o) { if(o.status_pay==='close'||o.status_pay==='closed')return'closed'; if(o.status_pay==='paid')return o.time_delivery?'delivered':'paid'; return o.status_pay||'unknown'; }
  function getFilterText(f) { return {all:'全部',unpaid:'待支付',paid:'待发货',delivered:'已发货',closed:'已关闭'}[f]||f; }
  function filterOrders(orders,view) { const st=orderState[view]; let f=[...orders]; if(st.currentFilter!=='all')f=f.filter(o=>getOrderStatus(o)===st.currentFilter); if(st.searchQuery){const q=st.searchQuery.toLowerCase();f=f.filter(o=>o.order_no.toLowerCase().includes(q)||(o.order_title&&o.order_title.toLowerCase().includes(q)));} if(view==='shop'){if(st.userId)f=f.filter(o=>o.user_id==parseInt(st.userId));if(st.productId)f=f.filter(o=>o.product_id==parseInt(st.productId));if(st.isPay!=='')f=f.filter(o=>(o.status_pay==='paid')==(st.isPay==='1'));if(st.isDelivery!=='')f=f.filter(o=>(o.status_pay==='delivered')==(st.isDelivery==='1'));} return f; }
  async function fetchAllOrders(view,signal) { const ep=view==='user'?API.ORDER_LIST:API.SHOP_ORDER_LIST; let all=[],p=1,ps=view==='user'?100:50,has=true; while(has){const pr=new URLSearchParams();pr.append('page',p);pr.append('page_size',ps);const st=orderState[view];if(st.searchQuery){/^\\d{14}shop[A-Za-z0-9]{5}$/.test(st.searchQuery)?pr.append('order_no',st.searchQuery):pr.append('order_title',st.searchQuery);}try{const r=await window.fetchWithAuth(ep+'?'+pr.toString(),{signal});if(!r)break;const d=await r.json();const it=d.items||[];all.push(...it);has=p<Math.ceil((d.total||0)/ps);p++;}catch(e){if(e.name!=='AbortError')console.error(e);break;}} return all; }

  function renderStructure(canManage=false) {
    return \`<div class="order-content"><div class="content-wrapper">
      <div class="page-header"><h1 class="page-title">订单中心 \${canManage?'<button class="view-toggle-btn" id="viewToggleBtn"><i class="fas fa-store"></i> 管理</button>':''}</h1><p class="page-subtitle" id="pageSubtitle">管理您的所有订单</p></div>
      <div class="filter-bar"><div id="userFilterBar" class="filter-chips"><button class="filter-chip active" data-filter="all">全部</button><button class="filter-chip" data-filter="unpaid">待支付</button><button class="filter-chip" data-filter="paid">待发货</button><button class="filter-chip" data-filter="delivered">已发货</button><button class="filter-chip" data-filter="closed">已关闭</button></div>
        <div id="shopFilterBar" class="filter-chips" style="display:none;"><button class="filter-chip active" data-filter="all">全部</button><button class="filter-chip" data-filter="unpaid">待支付</button><button class="filter-chip" data-filter="paid">待发货</button><button class="filter-chip" data-filter="delivered">已发货</button><button class="filter-chip" data-filter="closed">已关闭</button></div>
        <div class="search-box" id="searchBox"><input type="text" class="search-input" id="orderSearch" placeholder="搜索订单号/商品名称..."><button class="search-btn" id="searchBtn"><i class="fas fa-search"></i><span class="btn-text">搜索</span></button></div></div>
      <div id="loadingIndicator" class="apple-loading"><div class="spinner"></div><span>加载中...</span></div><div id="emptyState" class="no-results" style="display:none;">暂无订单</div><div id="orderList" class="order-list" style="display:none;"></div><div class="load-more" id="loadMoreIndicator" style="display:none;"><div class="spinner"></div> 加载更多...</div></div></div>
      <div class="modal-overlay" id="orderDetailModal"><div class="modal-content modal-wide"><div class="modal-header"><h3 class="modal-title">订单详情</h3><button class="btn-icon" id="closeDetailModal"><i class="fas fa-times"></i></button></div><div id="orderDetailContent"></div></div></div>
      <div class="modal-overlay" id="shopOrderModal"><div class="modal-content"><div class="modal-title"><span>订单备注</span><button class="btn-icon" id="closeShopOrderModal"><i class="fas fa-times"></i></button></div><div class="form-group"><label>备注（200 字内）</label><textarea class="modal-input" id="shopRemark" maxlength="200" rows="3"></textarea></div><div class="modal-error" id="shopOrderError"></div><div class="modal-buttons"><button class="modal-btn" id="shopOrderCancel">取消</button><button class="modal-btn primary" id="shopOrderSubmit">保存</button></div></div></div>
      <style>.order-content{width:100%;min-height:100vh;background:var(--bg-body);color:var(--text-primary)}.page-header{margin:1rem 0;padding:0;animation:slideUpFade .6s ease-out}@keyframes slideUpFade{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}.page-title{font-size:2.2rem;font-weight:700;margin:0;letter-spacing:-.5px}.view-toggle-btn{background:var(--bg-input);border:.5px solid var(--border-light);border-radius:40px;padding:.3rem 1rem;font-size:.9rem;color:var(--text-secondary);cursor:pointer;transition:.2s;margin-left:.8rem}.view-toggle-btn:hover,.view-toggle-btn.active{background:var(--accent-color);border-color:var(--accent-color);color:#fff}.page-subtitle{font-size:1rem;color:var(--text-secondary);margin:0;font-weight:400}.filter-bar{display:flex;flex-wrap:wrap;gap:.8rem;align-items:center;margin:0 0 1rem;padding:0 }.filter-chips{display:flex;gap:.4rem;flex-wrap:wrap;flex:1}.filter-chip{background:var(--bg-input);border:.5px solid var(--border-light);border-radius:40px;padding:.35rem 1rem;font-size:.85rem;color:var(--text-secondary);cursor:pointer;transition:.2s;white-space:nowrap}.filter-chip:hover{background:var(--bg-hover);color:var(--text-primary)}.filter-chip.active{background:var(--accent-color);border-color:var(--accent-color);color:#fff;box-shadow:0 4px 12px rgba(0,122,255,.3)}.search-box{display:flex;gap:.4rem;background:var(--bg-input);border:.5px solid var(--border-light);border-radius:40px;padding:.25rem .4rem;flex-shrink:0;min-width:240px;flex:1;max-width:360px}.search-input{background:transparent;border:none;color:var(--text-primary);font-size:.9rem;min-width:0;flex:1;outline:none;padding:.35rem .4rem}.search-input::placeholder{color:var(--text-tertiary)}.search-btn{background:var(--accent-color);border:none;color:#fff;padding:.4rem 1rem;border-radius:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;font-size:.85rem;gap:.3rem;white-space:nowrap;min-width:70px}.search-btn:hover{background:var(--accent-hover);transform:scale(1.02)}.order-list{display:flex;flex-direction:column;gap:.6rem;padding:0 }.order-card{background:var(--bg-card);backdrop-filter:blur(20px);border:.5px solid var(--border-light);border-radius:20px;padding:.8rem 1rem;transition:.2s;cursor:pointer;position:relative;overflow:hidden}.order-card:hover{transform:translateY(-2px);border-color:var(--border-color);box-shadow:var(--shadow-md)}.order-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent-color);opacity:0;transition:.2s}.order-card:hover::before{opacity:1}.order-card.status-unpaid::before{background:var(--warning-color)}.order-card.status-paid::before{background:var(--accent-color)}.order-card.status-delivered::before{background:var(--success-color)}.order-card.status-closed::before{background:var(--text-tertiary)}.order-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.6rem;gap:.6rem}.order-info{flex:1;min-width:0}.order-title{font-size:.95rem;font-weight:600;color:var(--text-primary);margin:0 0 .25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.order-meta{display:flex;flex-wrap:wrap;gap:.6rem 1rem;font-size:.7rem;color:var(--text-secondary)}.order-meta span{display:flex;align-items:center;gap:.25rem}.order-meta i{font-size:.65rem;opacity:.7}.order-price{text-align:right;flex-shrink:0}.price-label{font-size:.65rem;color:var(--text-tertiary);margin-bottom:.15rem}.price-value{font-size:1.2rem;font-weight:700;color:var(--text-primary)}.price-value i{font-size:.75rem;margin-right:2px}.order-footer{display:flex;justify-content:space-between;align-items:center;padding-top:.6rem;border-top:.5px solid var(--border-light)}.order-status{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .7rem;border-radius:40px;font-size:.7rem;font-weight:500}.order-status.unpaid{background:rgba(255,159,10,.15);color:var(--warning-color);border:.5px solid rgba(255,159,10,.3)}.order-status.paid{background:rgba(0,122,255,.15);color:var(--accent-color);border:.5px solid rgba(0,122,255,.3)}.order-status.delivered{background:rgba(48,209,88,.15);color:var(--success-color);border:.5px solid rgba(48,209,88,.3)}.order-status.closed{background:var(--bg-input);color:var(--text-secondary);border:.5px solid var(--border-light)}.order-actions{display:flex;gap:.4rem}.action-btn{background:var(--bg-input);border:.5px solid var(--border-light);border-radius:30px;padding:.35rem .9rem;font-size:.7rem;color:var(--text-primary);cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:.25rem}.action-btn:hover{background:var(--accent-color);border-color:var(--accent-color);color:#fff}.action-btn.primary{background:var(--accent-color);border-color:var(--accent-color);color:#fff}.action-btn.primary:hover{background:var(--accent-hover)}.action-btn:disabled{opacity:.5;cursor:not-allowed}.action-btn:disabled:hover{background:var(--bg-input);border-color:var(--border-light);color:var(--text-primary)}.action-btn.loading,.modal-btn.loading,.search-btn.loading{position:relative;color:transparent!important;pointer-events:none}.action-btn.loading::after,.modal-btn.loading::after,.search-btn.loading::after{content:'';position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}.action-btn.loading:not(.primary)::after{border-color:rgba(0,0,0,.2);border-top-color:var(--text-primary)}@keyframes spin{to{transform:rotate(360deg)}}.order-user-info{display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--text-secondary);margin-top:.3rem}.order-user-avatar{width:20px;height:20px;border-radius:50%;background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:.6rem}.order-user-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}.settle-price{font-size:.8rem;color:var(--text-tertiary);margin-top:.2rem}.settle-price i{font-size:.65rem;margin-right:2px}.detail-section{margin-bottom:1.2rem}.detail-section-title{font-size:.85rem;font-weight:600;color:var(--text-secondary);margin:0 0 .6rem;text-transform:uppercase;letter-spacing:.5px}.detail-row{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:.5px solid var(--border-light);font-size:.85rem}.detail-row:last-child{border-bottom:none}.detail-label{color:var(--text-secondary)}.detail-value{color:var(--text-primary);font-weight:500;text-align:right;max-width:55%;word-break:break-word}.detail-value.copyable{cursor:pointer;position:relative}.detail-value.copyable:hover::after{content:'📋';position:absolute;right:-18px;font-size:.75rem;opacity:.7}.seller-info{display:flex;align-items:center;gap:.6rem;padding:.6rem;background:var(--bg-input);border-radius:14px;margin-bottom:.8rem}.seller-avatar{width:40px;height:40px;border-radius:10px;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-size:1rem;color:var(--text-secondary);overflow:hidden}.seller-avatar img{width:100%;height:100%;object-fit:cover}.seller-name{font-size:.95rem;font-weight:600;color:var(--text-primary)}.seller-id{font-size:.7rem;color:var(--text-secondary)}.no-results{text-align:center;padding:3rem 0;color:var(--text-secondary);font-size:1.1rem;font-weight:500;background:var(--bg-input);border-radius:var(--radius-xl);border:1px dashed var(--border-color);margin:1rem 0;animation:fadeIn .3s ease;width:auto}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.order-card{animation:fadeIn .3s ease forwards}.modal-content.modal-wide{max-width:560px}.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;padding-bottom:.8rem;border-bottom:.5px solid var(--border-light)}.modal-title{font-size:1.2rem;font-weight:600;margin:0}@media(max-width:700px){.page-header{margin:.8rem 0;padding:0}.page-title{font-size:1.8rem}.view-toggle-btn{padding:.25rem .8rem;font-size:.8rem;margin-left:.4rem}.page-subtitle{font-size:.9rem;margin-top:.3rem}.filter-bar{gap:.6rem;flex-direction:column;align-items:stretch}.filter-chips{justify-content:start;flex-wrap:wrap}.filter-chip{padding:.3rem .8rem;font-size:.8rem}.search-box{width:100%;max-width:none;min-width:auto;margin-top:.2rem}.search-input{font-size:.95rem;padding:.4rem .4rem}.search-btn{padding:.4rem .8rem;min-width:65px}.search-btn .btn-text{display:none}.order-list{padding:0;gap:.5rem}.order-card{padding:.7rem .9rem;border-radius:18px}.order-title{font-size:.9rem}.order-meta{gap:.4rem .8rem;font-size:.65rem}.order-meta i{font-size:.6rem}.price-label{font-size:.6rem}.price-value{font-size:1.1rem}.order-status{justify-content:center;padding:.3rem .8rem}.order-actions{justify-content:flex-end;gap:.3rem}.action-btn{padding:.3rem .8rem;font-size:.65rem}.action-btn i{font-size:.6rem}.modal-content.modal-wide{max-width:95%;margin:.8rem;padding:1.2rem}.modal-title{font-size:1.1rem}.detail-section{margin-bottom:1rem}.detail-section-title{font-size:.8rem}.detail-row{font-size:.8rem;padding:.4rem 0}.detail-value{max-width:50%;text-align:right}.seller-info{padding:.5rem;gap:.4rem}.seller-avatar{width:32px;height:32px;font-size:.8rem}.seller-name{font-size:.9rem}.seller-id{font-size:.65rem}.no-results{padding:2.5rem 0;font-size:1rem;margin:.8rem 0}.load-more{padding:1.5rem;font-size:.85rem}.apple-loading .spinner{width:24px;height:24px}.apple-loading span{font-size:.85rem}}@media(max-width:400px){.filter-chip{padding:.25rem .7rem;font-size:.75rem}.search-btn{padding:.35rem .7rem}.order-title{font-size:.85rem}.order-meta{gap:.4rem .6rem;font-size:.6rem}.action-btn{padding:.25rem .7rem;font-size:.6rem}.price-value{font-size:1rem}.detail-value{max-width:45%}}</style>\`;
  }

  async function loadOrders(reset=false,forceRefresh=false,showLoading=true) {
    const view=orderState.currentView, st=orderState[view];
    if(st.isLoading)return;
    if(reset){st.currentPage=1;st.hasMore=true;if(forceRefresh)st.allOrders=[];const l=el.querySelector('#orderList');if(l){l.innerHTML='';l.dataset.rendered='';}const e=el.querySelector('#emptyState');if(e)e.style.display='none';const lo=el.querySelector('#loadingIndicator');if(lo&&showLoading)lo.style.display='flex';else if(lo)lo.style.display='none';const ol=el.querySelector('#orderList');if(ol)ol.style.display='none';const lm=el.querySelector('#loadMoreIndicator');if(lm)lm.style.display='none';}
    st.isLoading=true;
    if(st.searchController)st.searchController.abort();
    const ctrl=new AbortController();st.searchController=ctrl;
    try{
      let all=[];
      if(reset&&st.allOrders.length===0){all=await fetchAllOrders(view,ctrl.signal);if(ctrl.signal.aborted)return;st.allOrders=all;}else all=st.allOrders;
      const filtered=filterOrders(all,view);st.filteredOrders=filtered;
      const tp=Math.ceil(filtered.length/st.pageSize);st.totalPages=tp;st.hasMore=st.currentPage<tp;
      if(reset&&filtered.length===0){showEmptyState();resetLoadingState();return;}
      const s=(st.currentPage-1)*st.pageSize, en=s+st.pageSize, items=filtered.slice(s,en);
      if(items.length>0)renderOrderItems(items,view);else if(reset&&filtered.length===0){showEmptyState();resetLoadingState();return;}
      if(reset)showOrderList();
      updateLoadMore(!reset&&st.hasMore);
    }catch(err){if(err.name!=='AbortError'){window.showToast('加载失败：'+err.message);console.error(err);}resetLoadingState();}
    finally{if(ctrl===st.searchController){st.isLoading=false;st.searchController=null;}}
  }
  function showOrderList(){const l=el.querySelector('#orderList'),lo=el.querySelector('#loadingIndicator');if(l)l.style.display='flex';if(lo)lo.style.display='none';}
  function renderOrderItems(items,view){
    const list=el.querySelector('#orderList');if(!list)return;
    if(items.length>0&&list.dataset.rendered==='true')return;
    items.forEach(it=>{
      const st=getOrderStatus(it),card=document.createElement('div');card.className='order-card status-'+st;card.dataset.orderNo=it.order_no;
      const txt={unpaid:'待支付',paid:'待发货',delivered:'已发货',closed:'已关闭'}[st]||st;
      const price=it.price_order||0,settle=it.price_settle;
      const tCre=it.created_at?new Date(it.created_at).toLocaleDateString('zh-CN'):'',tPay=it.time_pay?new Date(it.time_pay).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
      let uHtml='';if(view==='shop'&&it.user){const av=it.user.avatar?'<img src="'+escapeHtml(it.user.avatar)+'">':'<i class="fas fa-user"></i>';uHtml='<div class="order-user-info"><div class="order-user-avatar">'+av+'</div><span>'+escapeHtml(it.user.username||'未知')+'</span></div>';}
      card.innerHTML=\`<div class="order-header"><div class="order-info"><div class="order-title">\${escapeHtml(it.order_title||'')}</div><div class="order-meta"><span><i class="fas fa-hashtag"></i> \${escapeHtml(it.order_no)}</span><span><i class="far fa-calendar"></i> \${escapeHtml(tCre)}</span>\${view==='shop'?'<span><i class="fas fa-clock"></i> 支付：'+escapeHtml(tPay)+'</span>':''}</div>\${uHtml}</div><div class="order-price"><div class="price-label">订单金额</div><div class="price-value"><i class="fas fa-carrot"></i> \${price}</div>\${view==='shop'&&settle?'<div class="settle-price"><i class="fas fa-coins"></i> 结算：'+settle+'</div>':''}</div></div><div class="order-footer"><span class="order-status \${st}"><i class="fas fa-circle" style="font-size:.45rem;"></i> \${txt}</span><div class="order-actions">\${getActionButtons(it,view)}</div></div>\`;
      card.addEventListener('click',e=>{if(!e.target.closest('.action-btn')){view==='user'?openOrderDetail(it):openShopOrderModal(it);}});
      list.appendChild(card);
    });
    list.dataset.rendered='true';
  }
  function getActionButtons(it,view){let b='',st=getOrderStatus(it),no=it.order_no;if(view==='user'){if(st==='unpaid')b+='<button class="action-btn primary" data-action="pay" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-credit-card"></i> 支付</button><button class="action-btn" data-action="close" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-times"></i> 关闭</button>';else if(st==='paid')b+='<button class="action-btn" data-action="urge" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-bell"></i> 催发货'+(it.urge_number>0?'('+it.urge_number+')':'')+'</button>';else if(st==='delivered')b+='<button class="action-btn" disabled><i class="fas fa-check"></i> 已完成</button>';else if(st==='closed')b+='<button class="action-btn delete-btn" data-action="delete" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-trash-alt"></i> 删除</button>';}else{if(st==='paid')b+='<button class="action-btn primary" data-action="deliver" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-truck"></i> 发货</button>';else if(st==='delivered')b+='<button class="action-btn" disabled><i class="fas fa-check"></i> 已发货</button>';else if(st==='unpaid')b+='<button class="action-btn" disabled><i class="fas fa-clock"></i> 待支付</button>';b+='<button class="action-btn" data-action="edit" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-edit"></i> 备注</button>';}return b;}
  function openOrderDetail(o){const m=el.querySelector('#orderDetailModal'),c=el.querySelector('#orderDetailContent');if(!c)return;const st=getOrderStatus(o),txt={unpaid:'待支付',paid:'待发货',delivered:'已发货',closed:'已关闭'}[st]||st,s=o.seller||{},p=o.product||null; c.innerHTML=\`<div class="detail-section"><div class="seller-info"><div class="seller-avatar">\${s.cover_url?'<img src="'+escapeHtml(s.cover_url)+'">':'<i class="fas fa-store"></i>'}</div><div><div class="seller-name">\${escapeHtml(s.name||'')}</div><div class="seller-id">店铺 ID: \${escapeHtml(s.seller_id||'-')}</div></div></div></div><div class="detail-section"><div class="detail-section-title">订单信息</div><div class="detail-row"><span class="detail-label">订单号</span><span class="detail-value copyable" data-copy="\${escapeHtml(o.order_no)}">\${escapeHtml(o.order_no)}</span></div><div class="detail-row"><span class="detail-label">商品</span><span class="detail-value">\${escapeHtml(o.order_title||'-')}</span></div><div class="detail-row"><span class="detail-label">商品 ID</span><span class="detail-value">\${escapeHtml(o.product_id||'-')}</span></div>\${p?'<div class="detail-row"><span class="detail-label">描述</span><span class="detail-value">'+escapeHtml(p.description||'-')+'</span></div><div class="detail-row"><span class="detail-label">发货方式</span><span class="detail-value">'+escapeHtml(p.exchange_way||'-')+'</span></div>':''}<div class="detail-row"><span class="detail-label">金额</span><span class="detail-value" style="color:var(--accent-color);font-weight:600;"><i class="fas fa-carrot"></i> \${o.price_order||0}</span></div><div class="detail-row"><span class="detail-label">状态</span><span class="detail-value"><span class="order-status \${st}">\${txt}</span></span></div></div><div class="detail-section"><div class="detail-section-title">时间记录</div>\${o.created_at?'<div class="detail-row"><span class="detail-label">创建</span><span class="detail-value">'+new Date(o.created_at).toLocaleString('zh-CN')+'</span></div>':''}\${o.time_pay?'<div class="detail-row"><span class="detail-label">支付</span><span class="detail-value">'+new Date(o.time_pay).toLocaleString('zh-CN')+'</span></div>':''}\${o.time_delivery?'<div class="detail-row"><span class="detail-label">发货</span><span class="detail-value">'+new Date(o.time_delivery).toLocaleString('zh-CN')+'</span></div>':''}\${o.time_urge?'<div class="detail-row"><span class="detail-label">催货</span><span class="detail-value">'+new Date(o.time_urge).toLocaleString('zh-CN')+'</span></div>':''}</div>\${o.remark_user?'<div class="detail-section"><div class="detail-section-title">备注</div><div class="detail-row"><span class="detail-label">用户</span><span class="detail-value">'+escapeHtml(o.remark_user)+'</span></div></div>':''}\${o.remark_shop?'<div class="detail-section"><div class="detail-section-title">商家</div><div class="detail-row"><span class="detail-label">商家</span><span class="detail-value">'+escapeHtml(o.remark_shop)+'</span></div></div>':''}<div style="margin-top:1.2rem;display:flex;gap:.4rem;justify-content:flex-end;">\${getDetailActions(o)}</div>\`;
    c.querySelectorAll('.copyable').forEach(e=>e.addEventListener('click',()=>copyText(e.dataset.copy,e)));
    c.querySelectorAll('.action-btn').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();handleOrderAction(b.dataset.action,b.dataset.orderNo);}));
    m.classList.add('show');
  }
  function getDetailActions(o){let b='',st=getOrderStatus(o),no=o.order_no;if(st==='unpaid')b+='<button class="action-btn primary" data-action="pay" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-credit-card"></i> 支付</button><button class="action-btn" data-action="close" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-times"></i> 关闭</button>';else if(st==='paid')b+='<button class="action-btn" data-action="urge" data-order-no="'+escapeHtml(no)+'"><i class="fas fa-bell"></i> 催发货</button>';return b;}
  function openShopOrderModal(o){const m=el.querySelector('#shopOrderModal'),r=el.querySelector('#shopRemark'),er=el.querySelector('#shopOrderError');if(!m)return;r.value=o.remark_shop||'';if(er)er.textContent='';m.classList.add('show');m.dataset.orderNo=o.order_no;}
  async function submitShopRemark(){const m=el.querySelector('#shopOrderModal'),no=m?.dataset.orderNo,r=el.querySelector('#shopRemark')?.value.trim()||null,er=el.querySelector('#shopOrderError'),sb=el.querySelector('#shopOrderSubmit');if(!no){if(er)er.textContent='无效';return;}if(sb){sb.disabled=true;sb.classList.add('loading');}try{const res=await window.fetchWithAuth(API.SHOP_ORDER_REMARK,{method:'POST',body:JSON.stringify({order_no:no,remark:r})});if(!res)throw new Error('失败');if(!res.ok){const t=await res.text();let msg='备注失败';try{const d=JSON.parse(t);msg=d.message||d.error||msg;}catch(e){if(t)msg=t;}throw new Error(msg);}showToast('成功');m.classList.remove('show');loadOrders(true,true,false);}catch(e){if(er)er.textContent=e.message;showToast(e.message);}finally{if(sb){sb.classList.remove('loading');sb.disabled=false;}}}
  async function handleOrderAction(action,no){let btn=null;if(event&&event.currentTarget){btn=event.currentTarget;btn.disabled=true;btn.classList.add('loading');}try{switch(action){case'pay':await payOrder(no);break;case'close':if(confirm('确定关闭？'))await closeOrder(no);else return;break;case'urge':await urgeOrder(no);break;case'deliver':await updateShopOrderDelivery(no,true);break;case'edit':const o=await fetchOrderDetail(no);if(o)openShopOrderModal(o);return;case'delete':if(confirm('确定删除？'))await deleteOrder(no);else return;break;}loadOrders(true,true,false);const m=el.querySelector('#orderDetailModal');if(m?.classList.contains('show')){const o=await fetchOrderDetail(no);if(o)openOrderDetail(o);}showToast('成功');}catch(e){showToast(e.message);}finally{if(btn){btn.classList.remove('loading');btn.disabled=false;}}}
  async function updateShopOrderDelivery(no,isDel){const r=await window.fetchWithAuth(API.SHOP_ORDER_DELIVERY,{method:'PUT',body:JSON.stringify({order_no:no,is_delivery:isDel})});if(!r)throw new Error('失败');if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||'失败');}return await r.json();}
  async function fetchOrderDetail(no){const view=orderState.currentView,orders=orderState[view].allOrders,o=orders.find(x=>x.order_no===no);if(o)return o;const pr=new URLSearchParams();pr.append('order_no',no);pr.append('page','1');pr.append('page_size','1');const ep=view==='user'?API.ORDER_LIST:API.SHOP_ORDER_LIST;const r=await window.fetchWithAuth(ep+'?'+pr.toString());if(!r)return null;const d=await r.json();return d.items?.[0]||null;}
  async function payOrder(no){const r=await window.fetchWithAuth(API.ORDER_PAY,{method:'POST',body:JSON.stringify({order_no:no})});if(!r)throw new Error('失败');if(!r.ok){const t=await r.text();let m='支付失败';try{const d=JSON.parse(t);m=d.message||d.error||m;}catch(e){if(t)m=t;}throw new Error(m);}return await r.json();}
  async function closeOrder(no){const r=await window.fetchWithAuth(API.ORDER_CLOSE,{method:'POST',body:JSON.stringify({order_no:no})});if(!r)throw new Error('失败');if(!r.ok){const t=await r.text();let m='关闭失败';try{const d=JSON.parse(t);m=d.message||d.error||m;}catch(e){if(t)m=t;}throw new Error(m);}const ct=r.headers.get('content-type');if(ct&&ct.includes('application/json'))return await r.json();else{const t=await r.text();console.error(t);throw new Error('格式错误');}}
  async function deleteOrder(no){const r=await window.fetchWithAuth(API.ORDER_DELETE+'?order_no='+encodeURIComponent(no),{method:'DELETE'});if(!r)throw new Error('失败');if(!r.ok){const t=await r.text();let m='删除失败';try{const d=JSON.parse(t);m=d.message||d.error||m;}catch(e){if(t)m=t;}throw new Error(m);}return await r.json();}
  async function urgeOrder(no){const r=await window.fetchWithAuth(API.ORDER_URGE,{method:'PUT',body:JSON.stringify({order_no:no})});if(!r)throw new Error('失败');if(!r.ok){const t=await r.text();let m='催货失败';try{const d=JSON.parse(t);m=d.message||d.error||m;}catch(e){if(t)m=t;}throw new Error(m);}return await r.json();}

  function bindEvents(){
    const vtb=el.querySelector('#viewToggleBtn');if(vtb)vtb.addEventListener('click',()=>{orderState.currentView=orderState.currentView==='user'?'shop':'user';vtb.classList.toggle('active');const s=el.querySelector('#pageSubtitle');if(s)s.textContent=orderState.currentView==='user'?'管理您的所有订单':'管理商户订单';const u=el.querySelector('#userFilterBar'),sh=el.querySelector('#shopFilterBar');if(u)u.style.display=orderState.currentView==='user'?'flex':'none';if(sh)sh.style.display=orderState.currentView==='shop'?'flex':'none';const si=el.querySelector('#orderSearch');if(si)si.value='';const st=orderState[orderState.currentView];st.currentFilter='all';st.searchQuery='';st.currentPage=1;el.querySelectorAll('#'+orderState.currentView+'FilterBar .filter-chip').forEach(c=>{c.classList.remove('active');if(c.dataset.filter==='all')c.classList.add('active');});loadOrders(true,true,true);});
    ['user','shop'].forEach(v=>{el.querySelectorAll('#'+v+'FilterBar .filter-chip').forEach(c=>c.addEventListener('click',()=>{if(orderState.currentView!==v)return;el.querySelectorAll('#'+v+'FilterBar .filter-chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');orderState[v].currentFilter=c.dataset.filter;orderState[v].currentPage=1;orderState[v].searchQuery='';const si=el.querySelector('#orderSearch');if(si)si.value='';loadOrders(true,false,true);}));});
    const si=el.querySelector('#orderSearch'),sb=el.querySelector('#searchBtn');let st;const hs=()=>{if(st)clearTimeout(st);st=setTimeout(()=>{const s=orderState[orderState.currentView];s.searchQuery=si?.value.trim()||'';s.currentPage=1;loadOrders(true,false,true);},500);};if(si){si.addEventListener('input',hs);si.addEventListener('keypress',e=>{if(e.key==='Enter'){if(st)clearTimeout(st);const s=orderState[orderState.currentView];s.searchQuery=si.value.trim();s.currentPage=1;loadOrders(true,false,true);}});}if(sb)sb.addEventListener('click',()=>{if(st)clearTimeout(st);const s=orderState[orderState.currentView];s.searchQuery=si?.value.trim()||'';s.currentPage=1;loadOrders(true,false,true);});
    const ol=el.querySelector('#orderList');if(ol)ol.addEventListener('click',async e=>{const b=e.target.closest('.action-btn');if(b&&b.dataset.action&&b.dataset.orderNo)await handleOrderAction(b.dataset.action,b.dataset.orderNo);});
    if(_scrollHandler)window.removeEventListener('scroll',_scrollHandler);if(_keydownHandler)document.removeEventListener('keydown',_keydownHandler);
    _scrollHandler=()=>{const s=orderState[orderState.currentView];if(s.isLoading||!s.hasMore)return;if(window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-200){s.currentPage++;loadOrders(false,false,false);}};
    _keydownHandler=e=>{if(e.key==='Escape'){el.querySelector('#orderDetailModal')?.classList.remove('show');el.querySelector('#shopOrderModal')?.classList.remove('show');}};
    window.addEventListener('scroll',_scrollHandler);document.addEventListener('keydown',_keydownHandler);
    el.querySelector('#closeDetailModal')?.addEventListener('click',()=>el.querySelector('#orderDetailModal')?.classList.remove('show'));el.querySelector('#orderDetailModal')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('show');});
    el.querySelector('#closeShopOrderModal')?.addEventListener('click',()=>el.querySelector('#shopOrderModal')?.classList.remove('show'));el.querySelector('#shopOrderCancel')?.addEventListener('click',()=>el.querySelector('#shopOrderModal')?.classList.remove('show'));el.querySelector('#shopOrderSubmit')?.addEventListener('click',submitShopRemark);el.querySelector('#shopOrderModal')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('show');});
  }
  const onShow=()=>loadOrders(true,true,true);
  const onHide=()=>{if(_scrollHandler){window.removeEventListener('scroll',_scrollHandler);_scrollHandler=null;}if(_keydownHandler){document.removeEventListener('keydown',_keydownHandler);_keydownHandler=null;}};
  async function init(){let can=false;try{const r=await window.fetchWithAuth('/api/shop/seller/base');if(r&&r.ok)can=(await r.json())?.status==='pass';}catch(e){}el.innerHTML=renderStructure(can);bindEvents();loadOrders(true,true,true);}init();
  return { el, onShow, onHide };
}
`;

// ==================== 静态资源映射 ====================
const STATIC_FILES = {
  '/static/styles.css': COMMON_CSS,
  '/static/spa.js': SPA_CORE_JS,
  '/static/pages/dashboard.js': PAGE_DASHBOARD_JS,
  '/static/pages/account.js': PAGE_ACCOUNT_JS,
  '/static/pages/line.js': PAGE_LINE_JS,
  '/static/pages/media.js': PAGE_MEDIA_JS,
  '/static/pages/detail.js': PAGE_DETAIL_JS,
  '/static/pages/upload.js': PAGE_UPLOAD_JS,
  '/static/pages/watchlist.js': PAGE_WATCHLIST_JS,
  '/static/pages/seek.js': PAGE_SEEK_JS,
  '/static/pages/shop.js': PAGE_SHOP_JS,
  '/static/pages/order.js': PAGE_ORDER_JS
};

// 计算内容哈希的辅助函数
async function computeHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 12); // 取前 12 位足够
}

// 全局存储哈希映射 (Worker 实例内全局复用)
let resourceHashes = null;

(async function initResourceHashes() {
  if (resourceHashes) return;
  const hashPromises = Object.entries(STATIC_FILES).map(async ([path, content]) => {
    const hash = await computeHash(content);
    return [path, hash];
  });
  const entries = await Promise.all(hashPromises);
  resourceHashes = Object.fromEntries(entries);
})();

// ==================== 框架页渲染 ====================
function renderFramework(hashes) {
  const getVersionedUrl = (url) => {
    const hash = hashes ? hashes[url] : null;
    return hash ? `${url}?v=${hash}` : url;
  };

  // 构建版本化的 importmap
  const versionedImports = {};
  for (const path of Object.keys(STATIC_FILES)) {
    versionedImports[path] = getVersionedUrl(path);
  }
  const importMap = { imports: versionedImports };

  // 动态生成 modulepreload 列表 (仅针对 /static/pages/*.js)
  const preloadLinks = `
    <link rel="preload" href="${getVersionedUrl('/static/styles.css')}" as="style">
    <link rel="modulepreload" href="${getVersionedUrl('/static/spa.js')}" crossorigin>
  `;

  // 主题初始化脚本 (防止闪烁)
  const themeInitScript = `
<script>
(function() {
  const key = 'emos_theme_mode';
  const mode = localStorage.getItem(key);
  const root = document.documentElement;
  if (mode === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (mode === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      root.setAttribute('data-theme', 'light');
    } else {
      root.setAttribute('data-theme', 'dark');
    }
  }
})();
<\/script>`;

  // 全局配置注入
  const configScript = `
<script>
  window.EMOS_CONFIG = ${JSON.stringify({
    PROXY_NAME: '@Elephant',
    PROXY_ID: 'e7E6K6OE4s'
  })};
<\/script>`;

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>EMOS</title>
  <link rel="icon" type="image/x-icon" href="https://github.com/somebyteorg/emos_home/raw/refs/heads/main/public/favicon.ico">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  ${themeInitScript}
  <link rel="stylesheet" href="${getVersionedUrl('/static/styles.css')}">
  ${configScript}
  <!-- 预加载页面模块 -->
  ${preloadLinks}
</head>
<body>
  <!-- Toast 提示 -->
  <div id="toast"><i class="fas fa-info-circle"></i><span id="toastMessage"></span></div>
  
  <!-- 固定顶部栏 -->
  <div class="top-bar">
    <div class="left-controls">
      <button class="collapse-btn" id="collapseBtn"><i class="fas fa-bars"></i></button>
      <a href="/" class="brand-text" id="brandLink">EMOS</a>
    </div>
    <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: nowrap;">
      <!-- 主题切换按钮 (桌面端) -->
      <button class="theme-toggle-btn desktop-only" id="themeToggleBtn" title="切换主题">
        <i class="fas fa-moon"></i>
      </button>
      <!-- 外部链接 -->
      <a href="https://t.me/emospg" target="_blank" rel="noopener" style="color: var(--text-secondary); text-decoration: none; font-size: 0.9rem;">
        <i class="fab fa-telegram-plane"></i> Telegram
      </a>
      <a href="https://wiki.emos.best" target="_blank" rel="noopener" style="color: var(--text-secondary); text-decoration: none; font-size: 0.9rem;">
        <i class="fas fa-book"></i> WIKI
      </a>
      <!-- 用户菜单 -->
      <div class="user-menu" id="userMenu">
        <div class="user-info">
          <i class="fas fa-user-circle" id="avatarIcon"></i>
          <img id="avatarImg" style="display:none; width:24px; height:24px; border-radius:50%; object-fit:cover;">
          <span id="headerUsername"></span>
        </div>
        <div class="dropdown-menu" id="dropdownMenu">
          <a href="https://t.me/emospg" target="_blank" rel="noopener" class="dropdown-item mobile-only">
            <i class="fab fa-telegram-plane"></i> Telegram 群组
          </a>
          <a href="https://wiki.emos.best" target="_blank" rel="noopener" class="dropdown-item mobile-only">
            <i class="fas fa-book"></i> WIKI
          </a>
          <div class="dropdown-item mobile-only" id="themeMenuBtn" style="cursor: pointer;">
            <i class="fas fa-adjust"></i> 主题模式
          </div>
          <div class="dropdown-item" onclick="location.href='/account'">
            <i class="fas fa-user-circle"></i> 账户管理
          </div>
          <div class="dropdown-item" id="switchAccountBtn">
            <i class="fas fa-exchange-alt"></i> 切换账号
          </div>
          <div class="dropdown-item" id="logoutBtn">
            <i class="fas fa-sign-out-alt"></i> 登出
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 固定侧边栏 -->
  <div class="sidebar" id="sidebar">
    <a class="nav-item" href="/"><i class="fas fa-tachometer-alt"></i><span>仪表盘</span></a>
    <a class="nav-item" href="/line"><i class="fas fa-network-wired"></i><span>线路管理</span></a>
    <a class="nav-item" href="/media"><i class="fas fa-film"></i><span>媒体管理</span></a>
    <a class="nav-item" href="/upload"><i class="fas fa-cloud-upload-alt"></i><span>上传管理</span></a>
    <a class="nav-item" href="/watchlist"><i class="fas fa-list"></i><span>片单管理</span></a>
    <a class="nav-item" href="/seek"><i class="fas fa-heart"></i><span>求片管理</span></a>
    <a class="nav-item" href="/shop"><i class="fas fa-shopping-bag"></i><span>商城中心</span></a>
    <a class="nav-item" href="/order"><i class="fas fa-shopping-cart"></i><span>订单中心</span></a>
    <a class="nav-item" href="#"><i class="fas fa-file-invoice"></i><span>账单记录</span></a>
    <a class="nav-item" href="#"><i class="fas fa-history"></i><span>操作记录</span></a>
  </div>
  <!-- 侧边栏遮罩（移动端） -->
  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <!-- 主内容容器 -->
  <div id="app-content"></div>

  <!-- 切换账号模态框 -->
  <div class="modal-overlay" id="switchAccountModal">
    <div class="modal-content">
      <div class="modal-title">
        <span>切换账号</span>
        <button class="btn-icon" id="closeSwitchModal"><i class="fas fa-times"></i></button>
      </div>
      <div class="account-list" id="accountList"></div>
      <div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
        <input type="text" class="modal-input" id="newToken" placeholder="输入新 Token" style="margin-bottom:0;">
        <button class="modal-btn primary" id="addAccountBtn" style="white-space: nowrap;">添加</button>
      </div>
      <div class="modal-error" id="switchError"></div>
    </div>
  </div>

  <script type="importmap">
    ${JSON.stringify(importMap, null, 2)}
  </script>
  <script type="module" src="${getVersionedUrl('/static/spa.js')}"></script>
  <style>
    .type-selector .type-btn { background: var(--bg-input); border: 0.5px solid var(--border-light); border-radius: var(--radius-full); padding: 0.4rem 1.2rem; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
    .type-selector .type-btn.active { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
    .cover-tabs { display: flex; gap: 0.5rem; border-bottom: 0.5px solid var(--border-light); }
    .cover-tab { background: transparent; border: none; padding: 0.4rem 1rem; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; transition: 0.2s; border-bottom: 2px solid transparent; margin-bottom: -0.5px; }
    .cover-tab.active { color: var(--accent-color); border-bottom-color: var(--accent-color); }
    .cover-panel { padding: 0.5rem 0; }
  </style>
</body>
</html>`;
}

// ==================== 登录页渲染 ====================
function renderLandingPage() {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>EMOS · 登录</title>
  <link rel="icon" type="image/x-icon" href="https://github.com/somebyteorg/emos_home/raw/refs/heads/main/public/favicon.ico">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff; line-height: 1.5; position: relative; overflow-x: hidden; }
    .bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop'); background-size: cover; background-position: center 30%; filter: brightness(0.45) contrast(1.1); z-index: 0; }
    .container { position: relative; z-index: 2; max-width: 100%; margin: 0 auto; padding: 1rem 2rem; min-height: 100vh; display: flex; flex-direction: column; text-shadow: 0 2px 5px rgba(0,0,0,0.6); }
    .nav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 0.6rem 1.5rem; background: rgba(20,20,20,0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 40px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .site-title { font-size: 1.5rem; font-weight: 600; color: #ffffff; letter-spacing: 0.5px; }
    .nav-links { display: flex; align-items: center; gap: 1.5rem; }
    .nav-links a { color: #ffffff; text-decoration: none; font-size: 1rem; font-weight: 450; transition: opacity 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
    .nav-links a:hover { opacity: 0.7; }
    .mobile-menu-btn { display: none; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; }
    .mobile-menu { display: none; position: absolute; top: 5rem; right: 1rem; background: rgba(20,20,20,0.95); backdrop-filter: blur(10px); border: 1px solid #333; border-radius: 20px; padding: 1rem; flex-direction: column; gap: 1rem; z-index: 200; }
    .mobile-menu.show { display: flex; }
    .mobile-menu a { color: #fff; text-decoration: none; padding: 0.5rem 1rem; border-radius: 30px; transition: background 0.2s; }
    .mobile-menu a:hover { background: #2a2a2a; }
    .main-content { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 700px; margin-left: 8%; animation: slideUpFade 0.8s ease-out forwards; }
    @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
    .main-content h1 { font-size: 2.8rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.2rem; color: #ffffff; }
    .main-content .subhead { font-size: 1.5rem; font-weight: 400; color: #dddddd; margin-bottom: 1rem; }
    .main-content .description { font-size: 1rem; line-height: 1.6; color: #e0e0e0; margin-bottom: 2rem; max-width: 600px; background: rgba(20,20,20,0.5); backdrop-filter: blur(3px); padding: 0.8rem 1.5rem; border-radius: 20px; border-left: 4px solid #888; }
    .cta-btn { display: inline-block; background: #2c2c2c; color: white; font-size: 1.2rem; font-weight: 600; padding: 0.8rem 2.8rem; border-radius: 50px; text-decoration: none; border: 1px solid #666; transition: background 0.2s, transform 0.1s; width: fit-content; letter-spacing: 0.5px; cursor: pointer; }
    .cta-btn:hover { background: #3a3a3a; transform: translateY(-2px); }
    @media (max-width: 700px) { .container { padding: 0.5rem 1rem; } .nav-header { padding: 0.4rem 1rem; } .nav-links { display: none; } .mobile-menu-btn { display: block; } .main-content { margin-left: 0; max-width: 100%; } .main-content h1 { font-size: 2.2rem; } .main-content .subhead { font-size: 1.3rem; } .main-content .description { font-size: 0.95rem; padding: 0.7rem 1.2rem; } .cta-btn { font-size: 1.1rem; padding: 0.7rem 2rem; } }
    @media (min-width: 701px) { .mobile-menu-btn, .mobile-menu { display: none !important; } }
  </style>
</head>
<body style="display: none;">
  <div class="bg"></div>
  <div class="container">
    <div class="nav-header">
      <div class="site-title">EMOS</div>
      <div class="nav-links">
        <a href="https://t.me/emospg" target="_blank" rel="noopener"><i class="fab fa-telegram-plane"></i> Telegram 群组</a>
        <a href="https://wiki.emos.best" target="_blank" rel="noopener"><i class="fas fa-book"></i> WIKI</a>
      </div>
      <button class="mobile-menu-btn" id="menuToggle"><i class="fas fa-bars"></i></button>
    </div>
    <div class="mobile-menu" id="mobileMenu">
      <a href="https://t.me/emospg" target="_blank" rel="noopener"><i class="fab fa-telegram-plane"></i> Telegram 群组</a>
      <a href="https://wiki.emos.best" target="_blank" rel="noopener"><i class="fas fa-book"></i> WIKI</a>
    </div>
    <div class="main-content">
      <h1>欢迎来到 EMOS</h1>
      <div class="subhead">专业的影视管理平台</div>
      <div class="description">由 Emya 提供技术支持，愿您可以找到带您一起玩的伙伴，我们一起愉快观影。</div>
      <a href="#" class="cta-btn" id="ctaBtn">立即体验</a>
    </div>
  </div>
  <script>
    (function() {
      const STORAGE_KEYS = { ACTIVE_TOKEN: 'activeToken', ACTIVE_USER: 'activeUser' };
      var urlParams = new URLSearchParams(window.location.search);
      var tokenFromUrl = urlParams.get('token');
      var usernameFromUrl = urlParams.get('username');
      var avatarFromUrl = urlParams.get('avatar');
      var userIdFromUrl = urlParams.get('user_id');
      
      if (tokenFromUrl && usernameFromUrl) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, tokenFromUrl);
        var user = { username: usernameFromUrl, avatar: avatarFromUrl || '', user_id: userIdFromUrl || '' };
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.href = '/';
        return;
      }
      var existingToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN);
      var existingUser = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      if (existingToken && existingUser) { window.location.href = '/'; return; }
      document.body.style.display = 'block';
      var menuToggle = document.getElementById('menuToggle');
      var mobileMenu = document.getElementById('mobileMenu');
      if (menuToggle) {
        menuToggle.addEventListener('click', function(e) { e.stopPropagation(); mobileMenu.classList.toggle('show'); });
        document.addEventListener('click', function() { mobileMenu.classList.remove('show'); });
        mobileMenu.addEventListener('click', function(e) { e.stopPropagation(); });
      }
      var ctaBtn = document.getElementById('ctaBtn');
      if (!ctaBtn) return;
      var CHECK_URL = '/api/user';
      function generateFallbackUUID() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random() * 16 | 0; var v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
      function handleLoginClick(e) {
        e.preventDefault();
        var uuid = crypto.randomUUID ? crypto.randomUUID() : generateFallbackUUID();
        var currentUrl = encodeURIComponent(window.location.href);
        var loginUrl = 'https://emos.best' + '/link?uuid=' + uuid + '&name=emos.club&url=' + currentUrl;
        window.location.href = loginUrl;
      }
      fetch(CHECK_URL, { method: 'GET', headers: { 'Authorization': 'Bearer ' + (localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN) || '') } })
        .then(function(response) { if (!response.ok) { if (response.status === 401) return null; throw new Error('网络响应异常'); } return response.json(); })
        .then(function(data) { if (data && data.username) { ctaBtn.innerHTML = '已登录'; ctaBtn.style.cursor = 'default'; ctaBtn.style.opacity = '0.8'; ctaBtn.addEventListener('click', function(e) { e.preventDefault(); alert('您已登录，无需重复操作'); }); } else { ctaBtn.addEventListener('click', handleLoginClick); } })
        .catch(function(error) { ctaBtn.addEventListener('click', handleLoginClick); });
    })();
  <\/script>
</body>
</html>`;
}