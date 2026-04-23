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

    // ========================================
    // 1. API 请求代理
    // ========================================
    
    // 1.1 Guessit 文件名解析代理
    if (pathname.startsWith('/guessit/')) {
      return await handleGuessitProxy(request, url);
    }
    
    // 1.2 TMDB 图片代理
    if (pathname.startsWith('/tmdb-image/')) {
      return await handleTmdbImageProxy(request, url);
    }
    
    // 1.3 YouTube 视频代理
    if (pathname.startsWith('/youtube/')) {
      return await handleYouTubeProxy(request, url);
    }

    // 1.3.1 YouTube embed 依赖资源代理
    if (isYouTubeSupportPath(pathname)) {
      return await handleYouTubeSupportProxy(request, url);
    }
    
    // 1.4 TMDB 预告片接口（特殊处理，直接代理到 TMDB）
    if (pathname === '/api/video/trailer') {
      return await handleTrailerProxy(request, url, env);
    }
    
    // 1.5 EMOS API 代理（转发到 emos.best）
    if (pathname.startsWith('/api/')) {
      return await handleEmosApiProxy(request, url, env);
    }
    
    // 1.6 TMDB API 代理（备用方案）
    if (pathname.startsWith('/tmdb/')) {
      return await handleTmdbApiProxy(request, url, env);
    }

    // 1.7 临时文件上传代理
    if (pathname === '/temporary/upload') {
      return await handleTemporaryUploadProxy(request, url);
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
        
        return new Response(content, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, immutable',
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
 * 代理 Guessit 文件名解析请求
 */
async function handleGuessitProxy(request, url) {
  try {
    // 从 /guessit/?filename=xxx 转换为 https://elephant.pythonanywhere.com/?filename=xxx
    const targetUrl = `https://elephant.pythonanywhere.com/${url.search}`;
    
    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', 'elephant.pythonanywhere.com');
    
    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
    });
    
    // 复制响应头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Guessit proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Guessit 代理失败: ' + error.message
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 代理 TMDB 图片请求
 */
async function handleTmdbImageProxy(request, url) {
  try {
    // 从 /tmdb-image/w500/xxx.jpg 转换为 https://image.tmdb.org/t/p/w500/xxx.jpg
    const imagePath = url.pathname.replace(/^\/tmdb-image/, '/t/p');
    const targetUrl = `https://image.tmdb.org${imagePath}${url.search}`;
    
    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', 'image.tmdb.org');
    
    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
    });
    
    // 复制响应头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');
    
    // 设置缓存（图片可以缓存更久）
    responseHeaders.set('Cache-Control', 'public, max-age=604800, immutable'); // 7天
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('TMDB image proxy error:', error);
    return new Response('Image not found', { status: 404 });
  }
}

/**
 * 代理 YouTube 视频请求
 */
async function handleYouTubeProxy(request, url) {
  try {
    const requestOrigin = url.origin;
    // 从 /youtube/embed/xxx 转换为 https://www.youtube.com/embed/xxx
    const youtubePath = url.pathname.replace(/^\/youtube/, '');
    const targetUrl = `https://www.youtube.com${youtubePath}${url.search}`;
    
    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', 'www.youtube.com');
    headers.set('Referer', request.url);
    
    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });
    
    // 复制响应头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('x-frame-options');
    
    // 允许 iframe 嵌入
    responseHeaders.set('Content-Security-Policy', `frame-ancestors 'self' ${requestOrigin}`);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('YouTube proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'YouTube 代理失败: ' + error.message
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function isYouTubeSupportPath(pathname) {
  return [
    '/s/',
    '/youtubei/',
    '/yts/',
    '/api/stats/',
    '/ptracking',
    '/player_204',
    '/generate_204',
    '/watch_fragments'
  ].some((prefix) => pathname.startsWith(prefix));
}

async function handleYouTubeSupportProxy(request, url) {
  try {
    const targetUrl = `https://www.youtube.com${url.pathname}${url.search}`;
    const headers = new Headers(request.headers);
    headers.set('Host', 'www.youtube.com');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('YouTube support proxy error:', error);
    return new Response('YouTube support resource proxy failed', { status: 502 });
  }
}

/**
 * 代理 TMDB 预告片请求
 */
async function handleTrailerProxy(request, url, env) {
  try {
    const tmdbId = url.searchParams.get('tmdb_id');
    const mediaType = url.searchParams.get('media_type') || 'movie';
    
    if (!tmdbId || !mediaType) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要参数'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['movie', 'tv'].includes(mediaType)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'media_type 无效'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const apiKey = env.TMDB_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        message: 'TMDB API Key 未配置'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/videos?language=zh-CN&include_video_language=en,zh&api_key=${apiKey}`;
    const response = await fetch(tmdbUrl);
    
    if (!response.ok) {
      throw new Error(`TMDB API 返回 ${response.status}`);
    }
    
    const data = await response.json();
    const results = data.results || [];

    const bestTrailer =
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && (v.iso_639_1 === 'zh' || v.iso_639_1 === 'zh-CN') && v.official === true) ||
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && (v.iso_639_1 === 'zh' || v.iso_639_1 === 'zh-CN')) ||
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official === true) ||
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
      results.find(v => v.site === 'YouTube' && v.type === 'Teaser') ||
      results.find(v => v.site === 'YouTube');

    if (!bestTrailer?.key) {
      return new Response(JSON.stringify({
        success: true,
        embed_url: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const origin = url.origin;
    const embedUrl = `https://www.youtube.com/embed/${bestTrailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${bestTrailer.key}&playsinline=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1&origin=${encodeURIComponent(origin)}`;
    
    return new Response(JSON.stringify({
      success: true,
      embed_url: embedUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Trailer proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取预告片失败: ' + error.message
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
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
    
    // 复制响应头（移除一些 Cloudflare 特定的头）
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

/**
 * 代理 TMDB API 请求（备用方案）
 */
async function handleTmdbApiProxy(request, url, env) {
  try {
    // 从 /tmdb/3/movie/xxx/videos 转换为 https://api.themoviedb.org/3/movie/xxx/videos
    const tmdbPath = url.pathname.replace(/^\/tmdb/, '');
    const targetUrl = new URL(`https://api.themoviedb.org${tmdbPath}${url.search}`);

    if (!targetUrl.searchParams.has('api_key')) {
      const apiKey = env.TMDB_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({
          success: false,
          message: 'TMDB API Key 未配置'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      targetUrl.searchParams.set('api_key', apiKey);
    }
    
    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', 'api.themoviedb.org');
    
    // 转发请求
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });
    
    // 复制响应头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('TMDB API proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'TMDB API 代理失败: ' + error.message
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * 代理临时文件上传请求
 */
async function handleTemporaryUploadProxy(request, url) {
  try {
    const targetUrl = `https://temporary.emos.best${url.pathname.replace(/^\/temporary/, '')}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set('Host', 'temporary.emos.best');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Temporary upload proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '临时文件上传代理失败: ' + error.message
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
