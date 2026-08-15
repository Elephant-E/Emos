/**
 * EMOS Worker - 前后端一体化部署
 * 
 * 功能：
 * 1. 提供前端静态资源
 * 2. 代理 API 请求到 emos.best
 * 3. 支持 SPA 路由回退
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1.0 Cloudflare 内部路径直接跳过
    if (pathname === '/favicon.ico' || pathname.startsWith('/cdn-cgi/')) {
      return new Response(null, { status: 204 });
    }

    // ========================================
    // 1. API 请求代理
    // ========================================
    
    // 1.1 EMOS API 代理（转发到 emos.best）
    if (pathname.startsWith('/api/')) {
      // 1.2 视频识别 API（后端识别）
      if (pathname === '/api/identify') {
        return await handleIdentify(request, env);
      }

      // 1.3 Spotify API 代理
      if (pathname === '/api/spotify/search') {
        return await handleSpotifySearch(request, url, env);
      }


      return await handleEmosApiProxy(request, url, env);
    }

    // ========================================
    // 2. 静态文件服务
    // ========================================
    try {
      let assetPath = pathname;
      const isAssetRequest = pathname.includes('.');
      
      // 1. 优先处理独立登录页
      if (pathname === '/login' || pathname === '/login.html') {
        assetPath = '/public/login.html';
      }
      // 1.5 排除 /link 路径（不处理，返回 404）
      else if (pathname === '/link') {
        return new Response('Not Found', { status: 404 });
      }

      // 2. SPA 路由回退：其他非静态资源路径返回 index.html
      else if (pathname === '/' || (!pathname.includes('.') && !pathname.startsWith('/assets/'))) {
        assetPath = '/index.html';
      }
      
      // 获取资源内容
      const content = getAssetContent(assetPath);
      
      if (content !== null) {
        const contentType = getContentType(assetPath);
        const isHtml = assetPath.endsWith('.html');
        
        return new Response(content, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': isHtml 
              ? 'no-cache, no-store, must-revalidate' 
              : 'public, max-age=31536000, immutable',
          },
        });
      }
      
      if (isAssetRequest) {
        return new Response('Not Found: ' + pathname, { status: 404 });
      }

      // fallback 到 index.html
      const indexContent = getAssetContent('/index.html');
      if (indexContent !== null) {
        return new Response(indexContent, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
      
      return new Response('Not Found: ' + pathname, { status: 404 });
    } catch (error) {
      console.error('Asset fetch error:', error);
      return new Response('Internal Server Error: ' + error.message, { status: 500 });
    }
  }
};

/**

 * 视频识别 API
 * 流程：guessit -> TMDB -> EMOS getVideoId
 */
async function handleIdentify(request, env) {
  try {
    const body = await request.json()
    const filename = body.filename
    const fileType = body.type || 'video'
    
    if (!filename) {
      return new Response(JSON.stringify({
        success: false,
        message: '文件名不能为空'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Step 1: Guessit 解析文件名
    let guessitResult
    try {
      const guessitUrl = `https://elephant.pythonanywhere.com/?filename=${encodeURIComponent(filename)}`
      const guessitResponse = await fetch(guessitUrl)
      if (!guessitResponse.ok) {
        return new Response(JSON.stringify({
          success: false,
          message: `Guessit 解析服务异常 (HTTP ${guessitResponse.status})`
        }), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
      guessitResult = await guessitResponse.json()
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        message: `Guessit 解析服务不可用: ${e.message}`
      }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
    
    if (!guessitResult.title) {
      return new Response(JSON.stringify({
        success: false,
        message: `Guessit 无法解析文件名: ${guessitResult.message || '未识别出标题'}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 音乐文件：仅走 guessit，解析出 title 和 artist
    if (fileType === 'music') {
      const rawTitle = guessitResult.title
      let artist = null
      let title = rawTitle
      
      // 常见格式: "Artist - Title" 或 "Artist—Title"
      const separatorMatch = rawTitle.match(/^(.+?)\s*[-—–]\s*(.+)$/)
      if (separatorMatch) {
        artist = separatorMatch[1].trim()
        title = separatorMatch[2].trim()
      }
      
      // guessit 有时会把艺术家放到 alternative_title 或其他字段
      if (!artist && guessitResult.alternative_title) {
        artist = guessitResult.alternative_title
      }
      
      return new Response(JSON.stringify({
        success: true,
        type: 'music',
        title: title,
        artist: artist,
        season: null,
        episode: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 视频文件：走完整 guessit → TMDB → EMOS 流程
    const guessitTitle = guessitResult.title
    const isMovie = guessitResult.type === 'movie'
    const season = guessitResult.season || null
    const episode = guessitResult.episode || null
    
    // Step 2: TMDB 搜索
    let tmdbData
    try {
      const tmdbApiKey = env.TMDB_API_KEY || 'REDACTED_TMDB'
      const tmdbType = isMovie ? 'movie' : 'tv'
      const tmdbUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(guessitTitle)}&api_key=${tmdbApiKey}&language=zh-CN`
      
      const tmdbResponse = await fetch(tmdbUrl)
      if (!tmdbResponse.ok) {
        const errData = await tmdbResponse.json().catch(() => ({}))
        return new Response(JSON.stringify({
          success: false,
          message: `TMDB 搜索失败 (HTTP ${tmdbResponse.status}): ${errData.status_message || '未知错误'}`
        }), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
      tmdbData = await tmdbResponse.json()
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        message: `TMDB 搜索服务不可用: ${e.message}`
      }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
    
    if (!tmdbData.results || tmdbData.results.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `TMDB 未找到 "${guessitTitle}" (${isMovie ? '电影' : '剧集'})，请手动编辑关联`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const tmdbId = tmdbData.results[0].id
    
    // Step 3: EMOS getVideoId
    let videoIdResult
    try {
      const getVideoIdParams = new URLSearchParams({
        video_id_type: 'tmdb',
        video_id_value: tmdbId,
        tmdb_type: isMovie ? 'movie' : 'tv'
      })
      
      if (!isMovie && season) {
        getVideoIdParams.set('season_number', season)
      }
      if (!isMovie && episode) {
        getVideoIdParams.set('episode_number', episode)
      }
      
      const getVideoIdUrl = `https://emos.best/api/video/getVideoId?${getVideoIdParams.toString()}`
      const emosHeaders = new Headers()
      emosHeaders.set('Authorization', request.headers.get('Authorization') || '')
      emosHeaders.set('EMOS-PROXY-NAME', env.EMOS_PROXY_NAME || '@Elephant')
      emosHeaders.set('EMOS-PROXY-ID', env.EMOS_PROXY_ID || 'e7E6K6OE4s')
      
      const videoIdResponse = await fetch(getVideoIdUrl, { headers: emosHeaders })
      if (!videoIdResponse.ok) {
        const errText = await videoIdResponse.text().catch(() => '')
        return new Response(JSON.stringify({
          success: false,
          message: `EMOS 查询失败 (HTTP ${videoIdResponse.status}): ${errText.substring(0, 200)}`
        }), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
      videoIdResult = await videoIdResponse.json()
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        message: `EMOS 查询服务不可用: ${e.message}`
      }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
    
    if (videoIdResult.success === false) {
      return new Response(JSON.stringify({
        success: false,
        message: `EMOS 数据库中未找到该视频，请先同步视频到 EMOS`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 处理返回结果
    let itemType, itemId, displayTitle
    
    if (isMovie) {
      itemType = videoIdResult.item_type
      itemId = videoIdResult.item_id
      displayTitle = videoIdResult.video_title || guessitTitle
    } else {
      if (episode && videoIdResult.episode_info) {
        itemType = videoIdResult.episode_info.item_type
        itemId = videoIdResult.episode_info.item_id
        displayTitle = `${videoIdResult.video_title} • S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
      } else if (season && videoIdResult.season_info) {
        itemType = videoIdResult.season_info.item_type
        itemId = videoIdResult.season_info.item_id
        displayTitle = `${videoIdResult.video_title} • S${String(season).padStart(2, '0')}`
      } else {
        itemType = videoIdResult.item_type
        itemId = videoIdResult.item_id
        displayTitle = videoIdResult.video_title || guessitTitle
      }
    }
    
    if (!itemType || !itemId) {
      return new Response(JSON.stringify({
        success: false,
        message: `未找到对应的 EMOS 视频 (TMDB ID: ${tmdbId})，请手动编辑关联`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      success: true,
      item_type: itemType,
      item_id: itemId,
      title: displayTitle,
      season: season,
      episode: episode
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Identify error:', error)
    return new Response(JSON.stringify({
      success: false,
      message: `识别服务内部错误: ${error.message || '未知错误'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**

 * 代理 EMOS API 请求到 emos.best
 */
async function handleEmosApiProxy(request, url, env) {
  try {
    // 构建目标 URL
    const targetUrl = `https://emos.best${url.pathname}${url.search}`;
    
    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', 'emos.best');
    headers.set('EMOS-PROXY-NAME', env.EMOS_PROXY_NAME || '@Elephant');
    headers.set('EMOS-PROXY-ID', env.EMOS_PROXY_ID || 'e7E6K6OE4s');
    
    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });
    
    const contentType = response.headers.get('Content-Type') || '';
    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return new Response(JSON.stringify({
        success: false,
        message: text || `API 请求失败: ${response.status}`
      }), {
        status: response.status >= 400 ? response.status : 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('EMOS API proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'API 代理失败: ' + error.message
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

const SPOTIFY_ANON_KEY = 'REDACTED_SPOTIFY';
const SPOTIFY_TOKEN_URL = 'https://flxgjwpkztgpdywkgckk.supabase.co/functions/v1/spotify-token';
const spotifyTokenCache = { token: null, expires: 0 };

async function getSpotifyToken() {
  if (spotifyTokenCache.token && Date.now() < spotifyTokenCache.expires) {
    return spotifyTokenCache.token;
  }
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'apikey': SPOTIFY_ANON_KEY,
      'Authorization': 'Bearer ' + SPOTIFY_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!res.ok) throw new Error('Spotify token request failed: ' + res.status);
  const data = await res.json();
  spotifyTokenCache.token = data.access_token;
  spotifyTokenCache.expires = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  return data.access_token;
}

async function handleSpotifySearch(request, url, env) {
  try {
    const q = url.searchParams.get('q');
    const type = url.searchParams.get('type') || 'artist';
    const limit = url.searchParams.get('limit') || '15';
    if (!q) {
      return new Response(JSON.stringify({ success: false, message: '缺少搜索参数 q' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const token = await getSpotifyToken();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`;
    const res = await fetch(searchUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Spotify search failed: ' + res.status + ' ' + errText);
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: 'Spotify 搜索失败: ' + error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

